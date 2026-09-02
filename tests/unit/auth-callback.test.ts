import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAccessError } from "@/lib/auth/errors";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn<() => Promise<unknown>>(),
  requireAdmin: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: mocks.requireAdmin,
}));

import { GET } from "@/app/admin/(auth)/auth/callback/route";

const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();
const signOut = vi.fn();
const supabase = {
  auth: { exchangeCodeForSession, verifyOtp, signOut },
};
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

function callbackRequest(query = "") {
  return new NextRequest(`https://www.craigavonmasjid.org/admin/auth/callback${query}`);
}

function expectRedirect(response: Response, path: string) {
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(`https://www.craigavonmasjid.org${path}`);
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  verifyOtp.mockReset().mockResolvedValue({ error: null });
  signOut.mockReset().mockResolvedValue({ error: null });
  mocks.createSupabaseServerClient.mockReset().mockResolvedValue(supabase);
  mocks.requireAdmin.mockReset().mockResolvedValue({});
});

afterAll(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe("administrator authentication callback", () => {
  it("exchanges one non-empty PKCE code before requiring an administrator", async () => {
    const response = await GET(callbackRequest("?code=pkce-code"));

    expect(exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.requireAdmin).toHaveBeenCalledWith(supabase);
    expectRedirect(response, "/admin");
  });

  it.each(["email", "invite", "magiclink"] as const)(
    "verifies the fixed %s OTP flow before requiring an administrator",
    async (type) => {
      const response = await GET(callbackRequest(`?token_hash=token-value&type=${type}`));

      expect(verifyOtp).toHaveBeenCalledOnce();
      expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "token-value", type });
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
      expect(mocks.requireAdmin).toHaveBeenCalledOnce();
      expect(mocks.requireAdmin).toHaveBeenCalledWith(supabase);
      expectRedirect(response, "/admin");
    },
  );

  it.each([
    ["missing parameters", ""],
    ["an empty code", "?code="],
    ["an empty token hash", "?token_hash=&type=email"],
    ["a missing OTP type", "?token_hash=token-value"],
    ["an unsupported OTP type", "?token_hash=token-value&type=recovery"],
    ["ambiguous PKCE and OTP parameters", "?code=pkce-code&token_hash=token-value&type=email"],
    ["duplicate PKCE codes", "?code=first&code=second"],
    ["duplicate OTP hashes", "?token_hash=first&token_hash=second&type=email"],
    ["duplicate OTP types", "?token_hash=token-value&type=email&type=invite"],
  ])("rejects %s without touching authentication", async (_description, query) => {
    const response = await GET(callbackRequest(query));

    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expectRedirect(response, "/admin/sign-in?error=missing-token");
  });

  it("does not authorise a callback rejected by Supabase", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: { message: "expired" } });

    const response = await GET(callbackRequest("?code=expired-code"));

    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expectRedirect(response, "/admin/sign-in?error=invalid-link");
  });

  it("signs out a session that is not an active administrator", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(
      new AdminAccessError("disabled", "This account has been disabled."),
    );

    const response = await GET(callbackRequest("?code=valid-code"));

    expect(signOut).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expectRedirect(response, "/admin/sign-in?error=disabled");
  });

  it("uses the configured canonical origin for the authenticated redirect", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://admin.craigavon.example";

    const response = await GET(callbackRequest("?code=valid-code"));

    expect(response.headers.get("location")).toBe("https://admin.craigavon.example/admin");
  });

  it("fails closed when callback processing throws and local sign-out also fails", async () => {
    verifyOtp.mockRejectedValueOnce(new Error("Auth service unavailable"));
    signOut.mockRejectedValueOnce(new Error("Sign-out unavailable"));

    const response = await GET(callbackRequest("?token_hash=token-value&type=email"));

    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledOnce();
    expectRedirect(response, "/admin/sign-in?error=callback");
  });
});
