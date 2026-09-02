"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/auth/errors";
import { AdminAccessError, safeActionError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { getSiteUrl } from "@/lib/supabase/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/types/database";

const roles = [
  "super_admin",
  "website_editor",
  "prayer_editor",
  "enquiries_manager",
  "reviewer",
] as const;

const inviteSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().min(1).max(100),
  role: z.enum(roles),
});

function value(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

export async function inviteAdminAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const input = inviteSchema.safeParse({
      email: value(formData, "email"),
      displayName: value(formData, "displayName"),
      role: value(formData, "role"),
    });
    if (!input.success) {
      return { status: "error", message: "Enter a valid name, email address, and committee role." };
    }

    const actor = await requirePermission("users:manage", { requireAal2: true });
    const service = createSupabaseServiceClient();
    const redirectTo = `${getSiteUrl()}/admin/auth/callback`;
    const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(
      input.data.email,
      {
        redirectTo,
        data: {
          display_name: input.data.displayName,
          invited_role: input.data.role,
        },
      },
    );
    if (inviteError || !invited.user) {
      throw new AdminAccessError(
        "service",
        "We could not send that invitation. The address may already have an account.",
      );
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: profileError } = await actor.supabase.from("admin_profiles").insert({
      id: invited.user.id,
      display_name: input.data.displayName,
      role: input.data.role,
      status: "invited",
      mfa_required: true,
      invited_by: actor.userId,
    });
    if (profileError) {
      await service.auth.admin.deleteUser(invited.user.id);
      throw new AdminAccessError(
        "service",
        "The invitation could not be recorded, so it was cancelled.",
      );
    }

    const { error: recordError } = await actor.supabase.from("admin_invites").insert({
      email: input.data.email,
      role: input.data.role,
      invited_by: actor.userId,
      expires_at: expiresAt,
    });
    if (recordError) {
      await service.auth.admin.deleteUser(invited.user.id);
      throw new AdminAccessError(
        "service",
        "The invitation could not be recorded, so it was cancelled.",
      );
    }

    revalidatePath("/admin/users");
    return {
      status: "success",
      message: `Invitation sent for the ${ROLE_LABELS[input.data.role].toLowerCase()} role.`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}

const userIdSchema = z.object({ userId: z.uuid() });

export async function disableAdminAction(formData: FormData): Promise<void> {
  const input = userIdSchema.safeParse({ userId: value(formData, "userId") });
  if (!input.success) throw new AdminAccessError("validation", "That account is invalid.");
  const actor = await requirePermission("users:manage", { requireAal2: true });
  if (input.data.userId === actor.userId) {
    throw new AdminAccessError("validation", "You cannot disable your own account.");
  }

  const disabledAt = new Date().toISOString();
  const { data: profile, error } = await actor.supabase
    .from("admin_profiles")
    .update({ status: "disabled", disabled_at: disabledAt })
    .eq("id", input.data.userId)
    .neq("status", "disabled")
    .select("id")
    .maybeSingle();
  if (error || !profile)
    throw new AdminAccessError("service", "That account could not be disabled.");

  const service = createSupabaseServiceClient();
  const { error: banError } = await service.auth.admin.updateUserById(input.data.userId, {
    ban_duration: "876000h",
  });
  if (banError) {
    console.error("Profile disabled but Auth ban failed", banError);
    throw new AdminAccessError(
      "service",
      "The account is blocked in the dashboard, but its Auth session could not be revoked. Contact technical support.",
    );
  }
  revalidatePath("/admin/users");
}

const inviteIdSchema = z.object({ inviteId: z.uuid() });

export async function revokeAdminInviteAction(formData: FormData): Promise<void> {
  const input = inviteIdSchema.safeParse({ inviteId: value(formData, "inviteId") });
  if (!input.success) throw new AdminAccessError("validation", "That invitation is invalid.");
  const actor = await requirePermission("users:manage", { requireAal2: true });
  const { data: invite, error: loadError } = await actor.supabase
    .from("admin_invites")
    .select("id, email")
    .eq("id", input.data.inviteId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();
  if (loadError || !invite)
    throw new AdminAccessError("service", "That invitation is no longer pending.");

  const { data: revoked, error: revokeError } = await actor.supabase
    .from("admin_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (revokeError || !revoked)
    throw new AdminAccessError("service", "That invitation is no longer pending.");

  const service = createSupabaseServiceClient();
  const { data: users, error: usersError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (usersError) {
    throw new AdminAccessError(
      "service",
      "The invitation is marked revoked, but its unused Auth account needs technical review.",
    );
  }
  const user = users.users.find((candidate) => candidate.email?.toLowerCase() === invite.email);
  if (user) {
    const { data: profile } = await service
      .from("admin_profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.status === "invited") {
      const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
      if (deleteError) {
        throw new AdminAccessError(
          "service",
          "The invitation is revoked, but its unused Auth account needs technical review.",
        );
      }
    }
  }
  revalidatePath("/admin/users");
}

export type AdminDirectoryUser = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  status: "invited" | "active" | "disabled";
  mfaRequired: boolean;
  createdAt: string;
};
