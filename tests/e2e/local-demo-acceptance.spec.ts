import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type LocalEnvironment = {
  apiUrl: string;
  publishableKey: string;
  serviceRoleKey: string;
};

function readLocalEnvironment(): LocalEnvironment {
  const values = new Map<string, string>();
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/u)) {
    const index = line.indexOf("=");
    if (index <= 0 || line.trimStart().startsWith("#")) continue;
    values.set(line.slice(0, index), line.slice(index + 1));
  }
  const apiUrl = values.get("NEXT_PUBLIC_SUPABASE_URL") ?? "";
  const publishableKey = values.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? "";
  const serviceRoleKey = values.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const parsed = new URL(apiUrl);
  if (
    values.get("NEXT_PUBLIC_DEMO_MODE") !== "true" ||
    parsed.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "::1"].includes(parsed.hostname) ||
    !publishableKey ||
    !serviceRoleKey
  ) {
    throw new Error("The local acceptance test refuses to run outside the loopback demo stack.");
  }
  return { apiUrl: apiUrl.replace(/\/$/u, ""), publishableKey, serviceRoleKey };
}

function decodeBase32(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.toUpperCase().replace(/[^A-Z2-7]/gu, "")) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("The authenticator secret is not valid base32.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function currentTotp(secret: string): string {
  const counter = Math.floor(Date.now() / 30_000);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBytes).digest();
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const binary =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    ((digest[offset + 1] ?? 0) << 16) |
    ((digest[offset + 2] ?? 0) << 8) |
    (digest[offset + 3] ?? 0);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function magicLink(service: SupabaseClient, email: string): Promise<string> {
  const result = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const token = result.data.properties?.hashed_token;
  if (result.error || !token)
    throw result.error ?? new Error(`No sign-in link was created for ${email}.`);
  const callback = new URL("http://127.0.0.1:3000/admin/auth/callback");
  callback.searchParams.set("token_hash", token);
  callback.searchParams.set("type", "magiclink");
  return callback.toString();
}

async function hashedMagicToken(service: SupabaseClient, email: string): Promise<string> {
  const result = await service.auth.admin.generateLink({ type: "magiclink", email });
  const token = result.data.properties?.hashed_token;
  if (result.error || !token)
    throw result.error ?? new Error(`No test token was created for ${email}.`);
  return token;
}

async function enrolAuthenticator(page: Page): Promise<void> {
  await page.goto("/admin/security");
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  const secret = (await page.locator("details code").textContent())?.trim();
  if (!secret) throw new Error("The local authenticator setup key was not rendered.");
  const seconds = Math.floor(Date.now() / 1_000) % 30;
  if (seconds >= 27) await page.waitForTimeout((31 - seconds) * 1_000);
  await page.locator("#mfa-code").fill(currentTotp(secret));
  await page.getByRole("button", { name: "Confirm authenticator code" }).click();
  await expect(page.getByText("Confirmed (AAL2)")).toBeVisible();
}

async function recordConsoleFailures(page: Page): Promise<string[]> {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      const source = message.location().url;
      failures.push(`console${source ? ` (${source})` : ""}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => failures.push(`page: ${error.message}`));
  return failures;
}

async function contentId(service: SupabaseClient, slug: string): Promise<string> {
  const result = await service.from("content_items").select("id").eq("slug", slug).single();
  if (result.error || !result.data)
    throw result.error ?? new Error(`Content ${slug} was not saved.`);
  return String(result.data.id);
}

async function signInReviewer(browser: Browser, service: SupabaseClient) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(await magicLink(service, "reviewer.local@example.test"));
  await page.waitForURL("**/admin");
  return { context, page };
}

test.describe("clean local demonstration acceptance", () => {
  test.skip(process.env.LOCAL_DEMO_E2E !== "1", "Runs only against pnpm setup:local.");
  test.describe.configure({ mode: "serial" });

  let local: LocalEnvironment;
  let service: SupabaseClient;

  test.beforeAll(() => {
    local = readLocalEnvironment();
    service = createClient(local.apiUrl, local.serviceRoleKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
  });

  test("public product walkthrough uses labelled demo data without browser errors", async ({
    page,
  }, testInfo) => {
    const failures = await recordConsoleFailures(page);

    await test.step("homepage, authorised logo and mobile navigation", async () => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Muslim Association of Craigavon",
      );
      await expect(
        page.getByRole("status").filter({
          hasText: /Local demonstration.*not committee approved/i,
        }),
      ).toBeVisible();
      await expect(
        page.locator('img[src="/brand/muslim-association-of-craigavon-logo-256.webp"]'),
      ).toHaveCount(2);
      await expect(page.getByRole("heading", { name: "Today's prayer times" })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("public-homepage.png"), fullPage: true });

      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator(".nav-disclosure summary").click();
      await expect(
        page.locator(".site-nav--mobile").getByRole("link", { name: "Prayer times" }),
      ).toBeVisible();
    });

    await test.step("monthly timetable, CSV and print controls", async () => {
      await page.goto("/prayer-times");
      await expect(page.getByRole("heading", { name: "Today's timetable" })).toBeVisible();
      await expect(page.getByRole("table")).toBeVisible();
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("link", { name: "Download CSV" }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/prayer.*\.csv$/iu);
      await page.evaluate(() => {
        Object.assign(window, {
          __acceptancePrintInvoked: false,
          print: () => Object.assign(window, { __acceptancePrintInvoked: true }),
        });
      });
      await page.getByRole("button", { name: /print/i }).click();
      await expect
        .poll(() => page.evaluate(() => Boolean(Reflect.get(window, "__acceptancePrintInvoked"))))
        .toBe(true);
    });

    await test.step("published demo content, principal routes, TV and 404", async () => {
      await page.goto("/news");
      await expect(page.getByText("[LOCAL DEMO] Website walkthrough notice")).toBeVisible();
      await expect(page.getByText("[LOCAL DEMO] Sample event record")).toBeVisible();

      for (const route of [
        "/",
        "/visit",
        "/services",
        "/education",
        "/new-muslims",
        "/about",
        "/contact",
        "/accessibility",
        "/policies",
        "/news",
      ]) {
        await page.goto(route);
        await expect(page.locator("h1").first()).toBeVisible();
      }
      await page.goto("/tv");
      await expect(page.getByText(/Local demonstration.*not committee approved/i)).toBeVisible();

      // The browser reports the intentionally requested 404 as a console error.
      // Keep it on a separate page so the product-console gate remains strict.
      const notFoundPage = await page.context().newPage();
      const notFoundResponse = await notFoundPage.goto("/acceptance-route-that-does-not-exist");
      expect(notFoundResponse?.status()).toBe(404);
      await expect(notFoundPage.locator("h1")).toContainText(/page.*not found/i);
      await notFoundPage.close();
    });

    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("administrator completes principal workflows and restricted role is denied", async ({
    browser,
    page,
  }, testInfo) => {
    const failures = await recordConsoleFailures(page);
    const run = Date.now().toString(36);
    const announcementSlug = `local-acceptance-announcement-${run}`;
    const eventSlug = `local-acceptance-event-${run}`;

    await test.step("passwordless sign-in, dashboard and MFA", async () => {
      await page.goto(await magicLink(service, "admin.local@example.test"));
      await page.waitForURL("**/admin");
      await expect(
        page.getByRole("heading", { name: "Welcome, Local super administrator" }),
      ).toBeVisible();
      await expect(page.getByText("Local demonstration environment.")).toBeVisible();
      await enrolAuthenticator(page);
      await page.goto("/admin");
      await page.screenshot({ path: testInfo.outputPath("admin-dashboard.png"), fullPage: true });
    });

    let announcementId = "";
    await test.step("announcement draft, preview, publish, edit and unpublish", async () => {
      await page.goto("/admin/content/new");
      await page.locator("#content-kind").selectOption("announcement");
      await page.locator("#content-title").fill(`[LOCAL ACCEPTANCE] Announcement ${run}`);
      await page.locator("#content-slug").fill(announcementSlug);
      await page.locator("#content-summary").fill("Temporary local acceptance record.");
      await page
        .locator("#content-body")
        .fill("Private draft body for the local acceptance walkthrough.");
      await page.getByRole("button", { name: "Create content" }).click();
      await expect(page.getByText("Content created successfully.")).toBeVisible();
      announcementId = await contentId(service, announcementSlug);

      await page.goto(`/admin/content/${announcementId}/preview`);
      await expect(page.getByText("Protected draft preview")).toBeVisible();
      await expect(
        page.getByText("Private draft body for the local acceptance walkthrough."),
      ).toBeVisible();

      await page.goto(`/admin/content/${announcementId}`);
      await page.locator("#content-status").selectOption("published");
      await page.locator("#content-seo-title").fill("Local acceptance announcement");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText(/Changes saved as version/)).toBeVisible();
      await page.goto("/news");
      await expect(page.getByText(`[LOCAL ACCEPTANCE] Announcement ${run}`)).toBeVisible();

      await page.goto(`/admin/content/${announcementId}`);
      await page.locator("#content-title").fill(`[LOCAL ACCEPTANCE] Edited announcement ${run}`);
      await page.locator("#content-body").fill("Edited and republished during local acceptance.");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText(/Changes saved as version/)).toBeVisible();
      await page.reload();
      await page.locator("#content-status").selectOption("archived");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText(/Changes saved as version/)).toBeVisible();
      await page.goto("/news");
      await expect(page.getByText(`[LOCAL ACCEPTANCE] Edited announcement ${run}`)).toHaveCount(0);
    });

    await test.step("event edit, revision restoration, soft delete and restore", async () => {
      const initialTitle = `[LOCAL ACCEPTANCE] Event ${run}`;
      await page.goto("/admin/content/new");
      await page.locator("#content-kind").selectOption("event");
      await page.locator("#content-title").fill(initialTitle);
      await page.locator("#content-slug").fill(eventSlug);
      await page
        .locator("#content-body")
        .fill("Local draft event used only for product acceptance.");
      await page.getByRole("button", { name: "Create content" }).click();
      await expect(page.getByText("Content created successfully.")).toBeVisible();
      const eventId = await contentId(service, eventSlug);

      await page.goto(`/admin/content/${eventId}`);
      await page.locator("#content-title").fill(`${initialTitle} edited`);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText(/Changes saved as version/)).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "Restore as draft" }).first().click();
      await page.reload();
      await expect(page.locator("#content-title")).toHaveValue(initialTitle);

      await page.getByRole("button", { name: "Archive item" }).click();
      await page.getByRole("button", { name: "Yes, archive it" }).click();
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "This item is not public or editable" }),
      ).toBeVisible();
      await page.goto("/admin/content?view=archive");
      const row = page.getByRole("row").filter({ hasText: initialTitle });
      await row.getByRole("link", { name: /Review or restore/ }).click();
      await page.getByRole("button", { name: "Restore as draft" }).click();
      await page.reload();
      await expect(page.locator("#content-status")).toHaveValue("draft");
    });

    await test.step("safe media upload", async () => {
      await page.goto("/admin/media");
      await page.locator("#media-file").setInputFiles({
        name: "local-acceptance.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2S8AAAAASUVORK5CYII=",
          "base64",
        ),
      });
      await page.locator("#media-alt").fill("Single test pixel for local upload verification");
      await page.getByRole("button", { name: "Upload media" }).click();
      await expect(page.getByText("Media uploaded successfully.")).toBeVisible();
    });

    await test.step("prayer draft change and dated override", async () => {
      const published = await service
        .from("prayer_settings")
        .select("id")
        .eq("status", "published")
        .eq("demo_local_only", true)
        .single();
      if (published.error || !published.data)
        throw published.error ?? new Error("Demo prayer data is missing.");
      await page.goto(`/admin/prayer-times/${published.data.id}`);
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Create editable draft" }).click();
      await page.waitForURL(/\/admin\/prayer-times\/[0-9a-f-]+$/u);
      const draftId = page.url().split("/").at(-1) ?? "";
      const clone = await service
        .from("prayer_settings")
        .select("demo_local_only")
        .eq("id", draftId)
        .single();
      expect(clone.data?.demo_local_only).toBe(true);

      await page.locator("#prayer-name").fill(`[LOCAL ACCEPTANCE] Prayer draft ${run}`);
      await page.getByRole("button", { name: "Save draft" }).click();
      await expect(page.getByText(/Draft saved as version/)).toBeVisible();
      await page.reload();
      const overrideDate = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
      await page.locator("#override-date").fill(overrideDate);
      await page.locator("#override-prayer").selectOption("dhuhr");
      await page.locator("#override-congregation").fill("13:45");
      await page
        .locator("#override-reason")
        .fill("[LOCAL ACCEPTANCE] Dated override verification.");
      await page.getByRole("button", { name: "Save override" }).click();
      await expect(page.getByText(/Dated override saved/)).toBeVisible();
      await page.reload();
      await expect(page.getByText("[LOCAL ACCEPTANCE] Dated override verification.")).toBeVisible();
      await page.goto("/prayer-times");
      await expect(page.getByRole("heading", { name: "Today's timetable" })).toBeVisible();
    });

    await test.step("database RLS and reviewer interface deny content alteration", async () => {
      const reviewer = createClient(local.apiUrl, local.publishableKey, {
        auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
      });
      const verified = await reviewer.auth.verifyOtp({
        token_hash: await hashedMagicToken(service, "reviewer.local@example.test"),
        type: "magiclink",
      });
      if (verified.error) throw verified.error;
      const before = await service
        .from("content_items")
        .select("title")
        .eq("id", announcementId)
        .single();
      const attempted = await reviewer
        .from("content_items")
        .update({ title: "UNAUTHORISED REVIEWER CHANGE" })
        .eq("id", announcementId)
        .select("id");
      expect(attempted.data ?? []).toHaveLength(0);
      const after = await service
        .from("content_items")
        .select("title")
        .eq("id", announcementId)
        .single();
      expect(after.data?.title).toBe(before.data?.title);

      const reviewSession = await signInReviewer(browser, service);
      await reviewSession.page.goto("/admin/content");
      await expect(reviewSession.page.getByRole("link", { name: "Create content" })).toHaveCount(0);
      await reviewSession.context.close();
    });

    await test.step("audit attribution and sign out", async () => {
      await page.goto("/admin/audit?entity=content_items");
      await expect(page.getByRole("table")).toContainText("Local super administrator");
      await expect(page.getByRole("table")).toContainText("content_items");
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.waitForURL(/\/admin\/sign-in(?:\?|$)/u);
      await expect(page.getByRole("heading", { name: "Secure sign in" })).toBeVisible();
    });

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
