import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/session", () => ({ requirePermission: mocks.requirePermission }));

import { mapPublishedContentRow } from "@/lib/content/public-content";
import {
  createContentAction,
  restoreContentRevisionAction,
  softDeleteContentAction,
} from "@/server/actions/content";

const actorId = "11111111-1111-4111-8111-111111111111";
const contentId = "22222222-2222-4222-8222-222222222222";

function actionForm(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

function contentForm(overrides: Record<string, string> = {}): FormData {
  return actionForm({
    kind: "announcement",
    slug: "scheduled-update",
    title: "Scheduled update",
    summary: "A committee-approved scheduled fixture.",
    bodyText: "Only approved public information is included.",
    actionLabel: "",
    actionUrl: "",
    eventStartsAt: "",
    eventEndsAt: "",
    eventLocation: "",
    eventUrl: "",
    serviceAudience: "",
    serviceAvailability: "",
    serviceAccessInstructions: "",
    serviceUrl: "",
    educationAudience: "",
    educationSchedule: "",
    educationRegistrationUrl: "",
    educationSafeguardingNote: "",
    policyOwner: "",
    policyEffectiveOn: "",
    policyReviewOn: "",
    category: "Community",
    status: "scheduled",
    publishAt: "2026-07-15T10:00",
    expiresAt: "2026-07-16T10:00",
    emergencyConfirmation: "",
    ...overrides,
  });
}

function mutationChain<T>(result: T) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["eq", "is", "select"]) chain[method] = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => result);
  return chain;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-14T09:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("content scheduling, expiry and restoration", () => {
  it("requires publication authority and stores unambiguous London schedule instants", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mocks.requirePermission.mockResolvedValue({ userId: actorId, supabase });

    const result = await createContentAction({ status: "idle", message: "" }, contentForm());

    expect(result).toEqual({ status: "success", message: "Content created successfully." });
    expect(mocks.requirePermission).toHaveBeenNthCalledWith(1, "content:write", {
      requireAal2: true,
    });
    expect(mocks.requirePermission).toHaveBeenNthCalledWith(2, "content:publish", {
      requireAal2: true,
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "scheduled",
        publish_at: "2026-07-15T09:00:00.000Z",
        expires_at: "2026-07-16T09:00:00.000Z",
        published_by: null,
        published_at: null,
        created_by: actorId,
        updated_by: actorId,
      }),
    );
  });

  it("rejects a schedule whose expiry is not later than publication", async () => {
    const insert = vi.fn();
    const supabase = { from: vi.fn(() => ({ insert })) };
    mocks.requirePermission.mockResolvedValue({ userId: actorId, supabase });

    const result = await createContentAction(
      { status: "idle", message: "" },
      contentForm({ expiresAt: "2026-07-15T09:59" }),
    );

    expect(result).toEqual({
      status: "error",
      message: "The expiry must be later than the publication time.",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("restores a historical revision only as a private draft", async () => {
    const snapshot = {
      kind: "announcement",
      slug: "restored-update",
      title: "Restored update",
      summary: "Historical approved wording.",
      body: { version: 1, format: "plain_text", text: "Restored body." },
      category: "Community",
      featured: false,
      publish_at: "2026-07-12T09:00:00.000Z",
      expires_at: "2026-07-30T09:00:00.000Z",
    };
    const revisionQuery = mutationChain({ data: { snapshot }, error: null });
    const updateQuery = mutationChain({ data: { id: contentId }, error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "content_revisions") return revisionQuery;
        if (table === "content_items") return updateQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mocks.requirePermission.mockResolvedValue({ userId: actorId, supabase });

    await restoreContentRevisionAction(
      actionForm({ id: contentId, expectedVersion: "7", revisionId: "42" }),
    );

    expect(updateQuery.update).toHaveBeenCalledWith({
      ...snapshot,
      seo_title: null,
      seo_description: null,
      status: "draft",
      published_at: null,
      published_by: null,
      deleted_at: null,
    });

    expect(
      mapPublishedContentRow(
        {
          id: contentId,
          ...snapshot,
          status: "draft",
          published_at: null,
          published_by: null,
          deleted_at: null,
          updated_at: "2026-07-14T09:00:00.000Z",
        },
        new Date("2026-07-14T09:00:00.000Z"),
      ),
    ).toBeNull();
  });

  it("soft-deletes an item into archived state using optimistic concurrency", async () => {
    const archiveQuery = mutationChain({ data: { id: contentId }, error: null });
    const supabase = { from: vi.fn(() => archiveQuery) };
    mocks.requirePermission.mockResolvedValue({ userId: actorId, supabase });

    await softDeleteContentAction(actionForm({ id: contentId, expectedVersion: "8" }));

    expect(archiveQuery.update).toHaveBeenCalledWith({
      status: "archived",
      deleted_at: "2026-07-14T09:00:00.000Z",
    });
    expect(archiveQuery.eq).toHaveBeenCalledWith("version", 8);
    expect(archiveQuery.is).toHaveBeenCalledWith("deleted_at", null);
  });
});
