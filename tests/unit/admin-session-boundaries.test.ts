import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient,
  createSupabaseServiceClient: mocks.createServiceClient,
}));

import { requireAdmin } from "@/lib/auth/session";

const userId = "11111111-1111-4111-8111-111111111111";

function queryChain<T>(result: T) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "is", "gt", "order", "limit"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  return chain;
}

function claims() {
  return {
    data: {
      claims: {
        sub: userId,
        email: "admin@example.org",
        aal: "aal2",
      },
    },
    error: null,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("authoritative administrator session boundaries", () => {
  it("rejects a disabled profile even when its Auth claims remain valid", async () => {
    const profileQuery = queryChain({
      data: {
        display_name: "Former administrator",
        role: "super_admin",
        status: "disabled",
        mfa_required: true,
      },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({
      auth: { getClaims: vi.fn(async () => claims()) },
      from: vi.fn(() => profileQuery),
    });

    await expect(requireAdmin()).rejects.toMatchObject({
      code: "disabled",
      message: "This administration account has been disabled.",
    });
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("rejects an Auth identity that has no approved committee profile", async () => {
    const profileQuery = queryChain({ data: null, error: null });
    mocks.createServerClient.mockResolvedValue({
      auth: { getClaims: vi.fn(async () => claims()) },
      from: vi.fn(() => profileQuery),
    });

    await expect(requireAdmin()).rejects.toMatchObject({
      code: "forbidden",
      message: "This account is not approved for committee administration.",
    });
  });

  it("does not activate an invited profile without a current unrevoked invite", async () => {
    const profileQuery = queryChain({
      data: {
        display_name: "Pending administrator",
        role: "website_editor",
        status: "invited",
        mfa_required: true,
      },
      error: null,
    });
    const inviteQuery = queryChain({ data: null, error: null });
    mocks.createServerClient.mockResolvedValue({
      auth: { getClaims: vi.fn(async () => claims()) },
      from: vi.fn(() => profileQuery),
    });
    mocks.createServiceClient.mockReturnValue({ from: vi.fn(() => inviteQuery) });

    await expect(requireAdmin()).rejects.toMatchObject({
      code: "forbidden",
      message: "This invitation is invalid, expired, or revoked.",
    });
    expect(inviteQuery.is).toHaveBeenCalledWith("revoked_at", null);
    expect(inviteQuery.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });
});
