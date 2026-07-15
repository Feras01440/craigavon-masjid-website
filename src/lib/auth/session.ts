import "server-only";

import { z } from "zod";

import { roleHasPermission, type Permission } from "@/lib/permissions";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import type { AccountStatus, AdminRole, Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminAccessError } from "./errors";

const claimsSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  aal: z.enum(["aal1", "aal2"]).catch("aal1"),
});

export type AdminContext = {
  userId: string;
  email: string;
  displayName: string;
  role: AdminRole;
  status: AccountStatus;
  mfaRequired: boolean;
  aal: "aal1" | "aal2";
  supabase: SupabaseClient<Database>;
};

async function activateAcceptedInvite(userId: string, email: string): Promise<void> {
  const service = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { data: invite, error: inviteError } = await service
    .from("admin_invites")
    .select("id")
    .eq("email", email.toLowerCase())
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inviteError || !invite) {
    throw new AdminAccessError("forbidden", "This invitation is invalid, expired, or revoked.");
  }

  const { data: accepted, error: acceptError } = await service
    .from("admin_invites")
    .update({ accepted_at: now })
    .eq("id", invite.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .select("id")
    .maybeSingle();
  if (acceptError || !accepted) {
    throw new AdminAccessError("forbidden", "This invitation is invalid, expired, or revoked.");
  }

  const { data: activated, error: profileError } = await service
    .from("admin_profiles")
    .update({ status: "active", disabled_at: null })
    .eq("id", userId)
    .eq("status", "invited")
    .select("id")
    .maybeSingle();
  if (profileError || !activated) {
    const { data: existing } = await service
      .from("admin_profiles")
      .select("status")
      .eq("id", userId)
      .maybeSingle();
    if (existing?.status !== "active") {
      const rollback = await service
        .from("admin_invites")
        .update({ accepted_at: null })
        .eq("id", accepted.id)
        .eq("accepted_at", now)
        .is("revoked_at", null);
      if (rollback.error) console.error("Invite activation rollback failed", accepted.id);
      throw new AdminAccessError("service", "We could not activate this invitation.");
    }
  }
}

export async function requireAdmin(
  authenticatedClient?: SupabaseClient<Database>,
): Promise<AdminContext> {
  const supabase = authenticatedClient ?? (await createSupabaseServerClient());
  const { data: claimData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimData?.claims) {
    throw new AdminAccessError(
      "unauthenticated",
      "Please use your committee invitation to sign in.",
    );
  }

  const claims = claimsSchema.safeParse(claimData.claims);
  if (!claims.success)
    throw new AdminAccessError("unauthenticated", "Your sign-in session is invalid.");

  let { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("display_name, role, status, mfa_required")
    .eq("id", claims.data.sub)
    .maybeSingle();
  if (profileError || !profile) {
    throw new AdminAccessError(
      "forbidden",
      "This account is not approved for committee administration.",
    );
  }

  if (profile.status === "invited") {
    await activateAcceptedInvite(claims.data.sub, claims.data.email);
    const refreshed = await supabase
      .from("admin_profiles")
      .select("display_name, role, status, mfa_required")
      .eq("id", claims.data.sub)
      .single();
    profile = refreshed.data;
    profileError = refreshed.error;
  }

  if (profileError || !profile)
    throw new AdminAccessError("forbidden", "This account is unavailable.");
  if (profile.status === "disabled") {
    throw new AdminAccessError("disabled", "This administration account has been disabled.");
  }
  if (profile.status !== "active") {
    throw new AdminAccessError("forbidden", "This administration account is not active.");
  }

  return {
    userId: claims.data.sub,
    email: claims.data.email.toLowerCase(),
    displayName: profile.display_name,
    role: profile.role,
    status: profile.status,
    mfaRequired: profile.mfa_required,
    aal: claims.data.aal,
    supabase,
  };
}

export async function requirePermission(
  permission: Permission,
  options: { requireAal2?: boolean } = {},
): Promise<AdminContext> {
  const context = await requireAdmin();
  if (!roleHasPermission(context.role, permission)) {
    throw new AdminAccessError("forbidden", "Your committee role does not allow this action.");
  }

  const { data: databaseAllowed, error: permissionError } = await context.supabase.rpc(
    "has_permission",
    { permission },
  );
  if (permissionError || databaseAllowed !== true) {
    throw new AdminAccessError("forbidden", "The database refused this action.");
  }

  if (options.requireAal2) {
    const { data: databaseAal2, error: aalError } = await context.supabase.rpc("has_aal2");
    if (context.aal !== "aal2" || aalError || databaseAal2 !== true) {
      throw new AdminAccessError(
        "mfa_required",
        "Confirm your authenticator code on the Security page, then try again.",
      );
    }
  }

  return context;
}
