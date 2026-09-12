"use server";

import { createHmac } from "node:crypto";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import type { ActionState } from "@/lib/auth/errors";
import {
  enquiryConfigurationSchema,
  enquiryRouteWasTestedRecently,
  normalisePublicEnquiry,
  publicEnquirySchema,
} from "@/lib/enquiries/public-enquiry";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function unavailable(): ActionState {
  return {
    status: "error",
    message: "This enquiry form is not currently available. No information was stored.",
  };
}

export async function submitPublicEnquiryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = publicEnquirySchema.safeParse({
    kind: formString(formData, "kind"),
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    message: formString(formData, "message"),
    privacyAccepted: formData.get("privacyAccepted") === "on",
    website: formString(formData, "website"),
  });
  if (!parsed.success) {
    if (formString(formData, "website")) return unavailable();
    return {
      status: "error",
      message: "Check the highlighted fields. Nothing was submitted.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  try {
    const client = createSupabaseServiceClient();
    const [flagsResult, configurationResult, privacyResult] = await Promise.all([
      client
        .from("site_settings")
        .select("value")
        .eq("key", "feature_flags")
        .eq("status", "published")
        .single(),
      client
        .from("site_settings")
        .select("value")
        .eq("key", "enquiry_configuration")
        .eq("status", "published")
        .single(),
      client
        .from("content_items")
        .select("id")
        .eq("kind", "policy")
        .eq("slug", "privacy")
        .in("status", ["published", "scheduled"])
        .is("deleted_at", null)
        .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .limit(1)
        .maybeSingle(),
    ]);
    const flags = z
      .object({ public_enquiries: z.literal(true) })
      .safeParse(flagsResult.data?.value);
    const configuration = enquiryConfigurationSchema.safeParse(configurationResult.data?.value);
    if (
      flagsResult.error ||
      configurationResult.error ||
      privacyResult.error ||
      !privacyResult.data ||
      !flags.success ||
      !configuration.success ||
      !enquiryRouteWasTestedRecently(configuration.data.route_tested_at)
    ) {
      return unavailable();
    }

    const requestHeaders = await headers();
    const trustedHeader = process.env.ENQUIRY_TRUSTED_IP_HEADER;
    const pepper = process.env.ENQUIRY_FINGERPRINT_PEPPER;
    if (
      !trustedHeader ||
      !pepper ||
      !["x-forwarded-for", "x-real-ip", "cf-connecting-ip"].includes(trustedHeader)
    ) {
      return unavailable();
    }
    const networkIdentifier = requestHeaders
      .get(trustedHeader)
      ?.split(",")[0]
      ?.trim()
      .slice(0, 100);
    if (!networkIdentifier) return unavailable();
    const fingerprint = createHmac("sha256", pepper).update(networkIdentifier).digest("hex");
    const { data: rateLimit, error: rateError } = await client.rpc("consume_rate_limit", {
      p_key_hash: fingerprint,
      p_action: "public_enquiry",
      p_limit: 5,
      p_window_seconds: 3_600,
      p_block_seconds: 900,
    });
    if (rateError || !rateLimit?.[0]?.allowed) {
      return {
        status: "error",
        message: "Too many enquiries were submitted from this connection. Try again later.",
      };
    }

    const input = normalisePublicEnquiry(parsed.data);
    if (input.message.length < 10 || input.name.length < 1) {
      return {
        status: "error",
        message: "The message did not contain enough readable text. Nothing was submitted.",
      };
    }
    const retentionUntil = new Date();
    retentionUntil.setUTCDate(retentionUntil.getUTCDate() + configuration.data.retention_days);
    const { error } = await client.from("enquiries").insert({
      kind: input.kind,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      privacy_notice_version: configuration.data.privacy_notice_version,
      source_fingerprint: fingerprint,
      retention_until: retentionUntil.toISOString().slice(0, 10),
    });
    if (error) return unavailable();
    revalidatePath("/admin/enquiries");
    return {
      status: "success",
      message: "Your enquiry was received. Keep a copy of any information you may need later.",
    };
  } catch {
    return unavailable();
  }
}
