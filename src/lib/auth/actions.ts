"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSiteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "./errors";
import { AdminAccessError, safeActionError } from "./errors";
import { requireAdmin } from "./session";

const signInSchema = z.object({ email: z.email().transform((value) => value.toLowerCase()) });

export async function requestMagicLinkAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = signInSchema.safeParse({ email: formData.get("email") });
    if (!parsed.success) {
      return {
        status: "error",
        message: "Enter the email address from your committee invitation.",
      };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${getSiteUrl()}/admin/auth/callback`,
      },
    });
    if (error) {
      // Do not reveal whether an address is registered or invited.
      console.warn("Magic-link request was not completed", error.code);
    }
    return {
      status: "success",
      message:
        "If this address has a valid committee invitation, a secure sign-in link is on its way.",
    };
  } catch (error) {
    return safeActionError(error);
  }
}

export async function signOutAction(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/sign-in?signedOut=1");
}

export type MfaEnrollmentState = ActionState & {
  enrollment: { factorId: string; qrCode: string; secret: string } | null;
};

export async function beginMfaEnrollmentAction(
  _previous: MfaEnrollmentState,
  _formData: FormData,
): Promise<MfaEnrollmentState> {
  void _previous;
  void _formData;
  try {
    const context = await requireAdmin();
    const { data: factors, error: factorsError } = await context.supabase.auth.mfa.listFactors();
    if (factorsError || !factors) {
      throw new AdminAccessError("service", "Authenticator settings could not be loaded.");
    }
    for (const factor of factors.all.filter(
      (candidate) => candidate.factor_type === "totp" && candidate.status === "unverified",
    )) {
      const { error: cleanupError } = await context.supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });
      if (cleanupError) {
        throw new AdminAccessError(
          "service",
          "An unfinished authenticator setup could not be cleared.",
        );
      }
    }

    const { data, error } = await context.supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "MAC committee administration",
    });
    if (error || !data?.totp) {
      throw new AdminAccessError("service", "A new authenticator could not be enrolled.");
    }
    return {
      status: "success",
      message: "Scan the code, then enter the current six-digit number to finish setup.",
      enrollment: {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      },
    };
  } catch (error) {
    return { ...safeActionError(error), enrollment: null };
  }
}

const mfaConfirmationSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  factorId: z.preprocess((value) => (value === "" ? null : value), z.uuid().nullable()),
});

export async function confirmMfaAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = mfaConfirmationSchema.safeParse({
      code: formData.get("code"),
      factorId: formData.get("factorId") ?? "",
    });
    if (!parsed.success) {
      return { status: "error", message: "Enter the current six-digit authenticator code." };
    }

    const context = await requireAdmin();
    const { data: factors, error: factorsError } = await context.supabase.auth.mfa.listFactors();
    if (factorsError || !factors) {
      throw new AdminAccessError("service", "Authenticator settings could not be loaded.");
    }
    const requestedFactor = parsed.data.factorId
      ? factors.totp.find((factor) => factor.id === parsed.data.factorId)
      : factors.totp.find((factor) => factor.status === "verified");
    if (!requestedFactor) {
      throw new AdminAccessError("validation", "Set up an authenticator before confirming a code.");
    }

    const { error } = await context.supabase.auth.mfa.challengeAndVerify({
      factorId: requestedFactor.id,
      code: parsed.data.code,
    });
    if (error) {
      throw new AdminAccessError(
        "validation",
        "That code was not accepted. Check the current code and try again.",
      );
    }
    revalidatePath("/admin", "layout");
    return {
      status: "success",
      message: "Authenticator confirmed. Sensitive actions are unlocked for this session.",
    };
  } catch (error) {
    return safeActionError(error);
  }
}
