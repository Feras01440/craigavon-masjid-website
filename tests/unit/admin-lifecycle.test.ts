import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createServiceClient: vi.fn(),
  redirect: vi.fn(),
  requireAdmin: vi.fn(),
  requirePermission: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({
  requireAdmin: mocks.requireAdmin,
  requirePermission: mocks.requirePermission,
}));
vi.mock("@/lib/supabase/env", () => ({
  getSiteUrl: () => "https://staging.craigavon.example",
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient,
  createSupabaseServiceClient: mocks.createServiceClient,
}));

import {
  disableAdminAction,
  inviteAdminAction,
  revokeAdminInviteAction,
} from "@/server/actions/admin-users";
import { requestMagicLinkAction, signOutAction } from "@/lib/auth/actions";

const actorId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const inviteId = "33333333-3333-4333-8333-333333333333";

function actionForm(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

function mutationChain<T>(result: T) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["eq", "neq", "is", "gt", "order", "limit", "select"]) {
    chain[method] = vi.fn(() => chain);
  }
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

describe("administrator invitation and account lifecycle", () => {
  it("creates a bounded invite and matching least-privilege profile under AAL2", async () => {
    const profileInsert = vi.fn(async () => ({ error: null }));
    const inviteInsert = vi.fn(async () => ({ error: null }));
    const actorClient = {
      from: vi.fn((table: string) => {
        if (table === "admin_profiles") return { insert: profileInsert };
        if (table === "admin_invites") return { insert: inviteInsert };
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    const inviteUserByEmail = vi.fn(async () => ({
      data: { user: { id: targetId } },
      error: null,
    }));
    mocks.requirePermission.mockResolvedValue({ userId: actorId, supabase: actorClient });
    mocks.createServiceClient.mockReturnValue({
      auth: { admin: { inviteUserByEmail, deleteUser: vi.fn() } },
    });

    const result = await inviteAdminAction(
      { status: "idle", message: "" },
      actionForm({
        email: "Editor@Example.org",
        displayName: " Content Editor ",
        role: "website_editor",
      }),
    );

    expect(result).toEqual({
      status: "success",
      message: "Invitation sent for the website editor role.",
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith("users:manage", { requireAal2: true });
    expect(inviteUserByEmail).toHaveBeenCalledWith("editor@example.org", {
      redirectTo: "https://staging.craigavon.example/admin/auth/callback",
      data: { display_name: "Content Editor", invited_role: "website_editor" },
    });
    expect(profileInsert).toHaveBeenCalledWith({
      id: targetId,
      display_name: "Content Editor",
      role: "website_editor",
      status: "invited",
      mfa_required: true,
      invited_by: actorId,
    });
    expect(inviteInsert).toHaveBeenCalledWith({
      email: "editor@example.org",
      role: "website_editor",
      invited_by: actorId,
      expires_at: "2026-07-21T09:00:00.000Z",
    });
  });

  it("cancels the Auth identity if the application invite cannot be recorded", async () => {
    const deleteUser = vi.fn(async () => ({ error: null }));
    const actorClient = {
      from: vi.fn((table: string) => ({
        insert: vi.fn(async () => ({ error: table === "admin_invites" ? { code: "fail" } : null })),
      })),
    };
    mocks.requirePermission.mockResolvedValue({ userId: actorId, supabase: actorClient });
    mocks.createServiceClient.mockReturnValue({
      auth: {
        admin: {
          inviteUserByEmail: vi.fn(async () => ({
            data: { user: { id: targetId } },
            error: null,
          })),
          deleteUser,
        },
      },
    });

    const result = await inviteAdminAction(
      { status: "idle", message: "" },
      actionForm({
        email: "editor@example.org",
        displayName: "Content Editor",
        role: "website_editor",
      }),
    );

    expect(result).toEqual({
      status: "error",
      message: "The invitation could not be recorded, so it was cancelled.",
    });
    expect(deleteUser).toHaveBeenCalledWith(targetId);
  });

  it("disables a different administrator and applies the long Auth ban", async () => {
    const profileMutation = mutationChain({ data: { id: targetId }, error: null });
    const actorClient = { from: vi.fn(() => profileMutation) };
    const updateUserById = vi.fn(async () => ({ error: null }));
    mocks.requirePermission.mockResolvedValue({ userId: actorId, supabase: actorClient });
    mocks.createServiceClient.mockReturnValue({ auth: { admin: { updateUserById } } });

    await disableAdminAction(actionForm({ userId: targetId }));

    expect(profileMutation.update).toHaveBeenCalledWith({
      status: "disabled",
      disabled_at: "2026-07-14T09:00:00.000Z",
    });
    expect(updateUserById).toHaveBeenCalledWith(targetId, { ban_duration: "876000h" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("refuses self-disable before touching profile or Auth state", async () => {
    const actorClient = { from: vi.fn() };
    mocks.requirePermission.mockResolvedValue({ userId: actorId, supabase: actorClient });

    await expect(disableAdminAction(actionForm({ userId: actorId }))).rejects.toMatchObject({
      code: "validation",
      message: "You cannot disable your own account.",
    });
    expect(actorClient.from).not.toHaveBeenCalled();
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("revokes an unused invite and removes its unactivated Auth identity", async () => {
    const loadInvite = mutationChain({
      data: { id: inviteId, email: "invited@example.org" },
      error: null,
    });
    const revokeInvite = mutationChain({ data: { id: inviteId }, error: null });
    let inviteQueryCount = 0;
    const actorClient = {
      from: vi.fn((table: string) => {
        if (table !== "admin_invites") throw new Error(`Unexpected table ${table}`);
        inviteQueryCount += 1;
        return inviteQueryCount === 1 ? loadInvite : revokeInvite;
      }),
    };
    const profileLookup = mutationChain({ data: { status: "invited" }, error: null });
    const deleteUser = vi.fn(async () => ({ error: null }));
    mocks.requirePermission.mockResolvedValue({ userId: actorId, supabase: actorClient });
    mocks.createServiceClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({
            data: { users: [{ id: targetId, email: "invited@example.org" }] },
            error: null,
          })),
          deleteUser,
        },
      },
      from: vi.fn(() => profileLookup),
    });

    await revokeAdminInviteAction(actionForm({ inviteId }));

    expect(revokeInvite.update).toHaveBeenCalledWith({
      revoked_at: "2026-07-14T09:00:00.000Z",
    });
    expect(deleteUser).toHaveBeenCalledWith(targetId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/users");
  });
});

describe("administrator recovery and session termination", () => {
  it("requests a non-enumerating recovery link without allowing account creation", async () => {
    const signInWithOtp = vi.fn(async () => ({ error: { code: "provider_failure" } }));
    mocks.createServerClient.mockResolvedValue({ auth: { signInWithOtp } });

    const result = await requestMagicLinkAction(
      { status: "idle", message: "" },
      actionForm({ email: "ADMIN@EXAMPLE.ORG" }),
    );

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "admin@example.org",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "https://staging.craigavon.example/admin/auth/callback",
      },
    });
    expect(result).toEqual({
      status: "success",
      message:
        "If this address has a valid committee invitation, a secure sign-in link is on its way.",
    });
  });

  it("terminates the local Auth session before redirecting to signed-out state", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    mocks.createServerClient.mockResolvedValue({ auth: { signOut } });

    await signOutAction();

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/sign-in?signedOut=1");
  });
});
