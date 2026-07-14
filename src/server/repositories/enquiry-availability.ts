import "server-only";

import { z } from "zod";

import {
  enquiryConfigurationSchema,
  enquiryRouteWasTestedRecently,
} from "@/lib/enquiries/public-enquiry";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type PublicEnquiryAvailability =
  { enabled: true; privacyNoticeVersion: string } | { enabled: false };

const featureFlagsSchema = z.object({ public_enquiries: z.literal(true) });

export async function getPublicEnquiryAvailability(): Promise<PublicEnquiryAvailability> {
  if (
    !process.env.ENQUIRY_FINGERPRINT_PEPPER ||
    !["x-forwarded-for", "x-real-ip", "cf-connecting-ip"].includes(
      process.env.ENQUIRY_TRUSTED_IP_HEADER ?? "",
    )
  ) {
    return { enabled: false };
  }
  try {
    const client = createSupabaseServiceClient({
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    });
    const now = new Date().toISOString();
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
        .not("published_by", "is", null)
        .not("published_at", "is", null)
        .lte("published_at", now)
        .or(`publish_at.is.null,publish_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(1)
        .maybeSingle(),
    ]);
    if (
      flagsResult.error ||
      configurationResult.error ||
      privacyResult.error ||
      !privacyResult.data
    ) {
      return { enabled: false };
    }
    const flags = featureFlagsSchema.safeParse(flagsResult.data.value);
    const configuration = enquiryConfigurationSchema.safeParse(configurationResult.data.value);
    if (
      !flags.success ||
      !configuration.success ||
      !enquiryRouteWasTestedRecently(configuration.data.route_tested_at)
    ) {
      return { enabled: false };
    }
    return {
      enabled: true,
      privacyNoticeVersion: configuration.data.privacy_notice_version,
    };
  } catch {
    return { enabled: false };
  }
}
