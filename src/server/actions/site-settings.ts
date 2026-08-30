"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/auth/errors";
import { AdminAccessError, safeActionError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/session";
import {
  enquiryConfigurationSchema,
  enquiryRouteWasTestedRecently,
} from "@/lib/enquiries/public-enquiry";
import { wallTimeToInstant } from "@/lib/prayer/timezone";
import {
  managedSettingKeys,
  managedSettingValueAsJson,
  type ManagedSettingKey,
  type ManagedSettingStatus,
  validateManagedSettingValue,
} from "@/lib/settings/site-settings";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { AdminContext } from "@/lib/auth/session";

const settingIdentitySchema = z.object({
  key: z.enum(managedSettingKeys),
  expectedVersion: z.coerce.number().int().positive().optional(),
  status: z.enum(["draft", "published", "archived"]),
});

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function formStrings(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((value): value is string => typeof value === "string");
}

function formNumberOrNull(formData: FormData, name: string): number | null {
  const value = formString(formData, name).trim();
  return value ? Number(value) : null;
}

function londonWallTimeToIsoOrEmpty(value: string): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  if (!match?.[1] || !match[2]) {
    throw new AdminAccessError("validation", "Use a valid date and time for the route test.");
  }
  const result = wallTimeToInstant(match[1], match[2], "Europe/London", "reject");
  if (!result.ok) {
    throw new AdminAccessError(
      "validation",
      "That route-test time is affected by a clock change. Choose an unambiguous time.",
    );
  }
  return result.instant.toISOString();
}

function readSettingValue(key: ManagedSettingKey, formData: FormData): unknown {
  switch (key) {
    case "site_identity":
      return {
        official_name: formString(formData, "official_name"),
        public_masjid_name: formString(formData, "public_masjid_name"),
        short_name: formString(formData, "short_name"),
        default_meta_description: formString(formData, "default_meta_description"),
      };
    case "homepage_content":
      return {
        eyebrow: formString(formData, "eyebrow"),
        heading: formString(formData, "heading"),
        introduction: formString(formData, "introduction"),
        primary_cta_label: formString(formData, "primary_cta_label"),
        primary_cta_route: formString(formData, "primary_cta_route"),
        secondary_cta_label: formString(formData, "secondary_cta_label"),
        secondary_cta_route: formString(formData, "secondary_cta_route"),
        information_heading: formString(formData, "information_heading"),
        information_points: formStrings(formData, "information_points"),
      };
    case "contact_information":
      return {
        address_line_1: formString(formData, "address_line_1"),
        address_line_2: formString(formData, "address_line_2"),
        locality: formString(formData, "locality"),
        county: formString(formData, "county"),
        postcode: formString(formData, "postcode"),
        public_email: formString(formData, "public_email"),
        public_phone: formString(formData, "public_phone"),
        public_whatsapp: formString(formData, "public_whatsapp"),
        map_url: formString(formData, "map_url"),
        directions: formString(formData, "directions"),
        access_information: formString(formData, "access_information"),
        parking_information: formString(formData, "parking_information"),
        public_transport_information: formString(formData, "public_transport_information"),
      };
    case "navigation_footer":
      return {
        primary_navigation: formStrings(formData, "primary_navigation"),
        footer_navigation: formStrings(formData, "footer_navigation"),
        footer_note: formString(formData, "footer_note"),
        footer_legal_note: formString(formData, "footer_legal_note"),
      };
    case "tv_display":
      return {
        refresh_seconds: Number(formString(formData, "refresh_seconds")),
        notice_rotation_seconds: Number(formString(formData, "notice_rotation_seconds")),
        prayer_hold_minutes: Number(formString(formData, "prayer_hold_minutes")),
        show_hijri_date: formData.get("show_hijri_date") === "on",
        show_notices: formData.get("show_notices") === "on",
        footer_message: formString(formData, "footer_message"),
      };
    case "feature_flags":
      return {
        public_enquiries: formData.get("public_enquiries") === "on",
        donations: formData.get("donations") === "on",
        education_registration: formData.get("education_registration") === "on",
        event_registration: formData.get("event_registration") === "on",
        analytics: formData.get("analytics") === "on",
      };
    case "enquiry_configuration":
      return {
        privacy_notice_version: formString(formData, "privacy_notice_version"),
        retention_days: formNumberOrNull(formData, "retention_days"),
        queue_owner_role: formString(formData, "queue_owner_role"),
        monitoring_schedule: formString(formData, "monitoring_schedule"),
        fallback_procedure: formString(formData, "fallback_procedure"),
        route_tested_at: londonWallTimeToIsoOrEmpty(formString(formData, "route_tested_at")),
        notification_mode: "admin_queue",
      };
  }
}

function validationFailure(error: z.ZodError): ActionState {
  return {
    status: "error",
    message: "Check the highlighted fields. Nothing was saved.",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

async function ensurePublicEnquiryDependencies(context: AdminContext): Promise<void> {
  const now = new Date().toISOString();
  const [configurationResult, privacyResult] = await Promise.all([
    context.supabase
      .from("site_settings")
      .select("value")
      .eq("key", "enquiry_configuration")
      .eq("status", "published")
      .maybeSingle(),
    context.supabase
      .from("content_items")
      .select("id")
      .eq("kind", "policy")
      .eq("slug", "privacy")
      .in("status", ["published", "scheduled"])
      .is("deleted_at", null)
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1)
      .maybeSingle(),
  ]);
  const configuration = enquiryConfigurationSchema.safeParse(configurationResult.data?.value);
  if (
    configurationResult.error ||
    privacyResult.error ||
    !privacyResult.data ||
    !configuration.success ||
    !enquiryRouteWasTestedRecently(configuration.data.route_tested_at)
  ) {
    throw new AdminAccessError(
      "validation",
      "The enquiry form cannot be enabled until its configuration and privacy notice are published and the route has passed a recent test.",
    );
  }
}

function settingDatabaseError(error: { code?: string } | null): never {
  if (error?.code === "40001") {
    throw new AdminAccessError(
      "conflict",
      "Another editor changed this setting first. Reload before applying your edit.",
    );
  }
  if (error?.code === "23505") {
    throw new AdminAccessError(
      "conflict",
      "This setting was created by another editor. Reload before making changes.",
    );
  }
  if (error?.code === "23514") {
    throw new AdminAccessError("validation", "The database rejected an invalid setting value.");
  }
  throw new AdminAccessError(
    "service",
    "The settings service refused the change. Nothing was saved.",
  );
}

function revalidateSettingSurfaces(): void {
  revalidateTag("public-site-settings", "max");
  revalidateTag("enquiry-availability", "max");
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  revalidatePath("/contact");
  revalidatePath("/accessibility");
  revalidatePath("/tv");
  revalidatePath("/api/display");
}

export async function saveSiteSettingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void _previous;
  try {
    const identity = settingIdentitySchema.safeParse({
      key: formString(formData, "key"),
      expectedVersion: formString(formData, "expectedVersion") || undefined,
      status: formString(formData, "status"),
    });
    if (!identity.success) return validationFailure(identity.error);

    const value = validateManagedSettingValue(
      identity.data.key,
      readSettingValue(identity.data.key, formData),
      identity.data.status as ManagedSettingStatus,
    );
    if (!value.success) return validationFailure(value.error);

    const context = await requirePermission("content:write", { requireAal2: true });
    if (identity.data.status === "published") {
      await requirePermission("content:publish", { requireAal2: true });
    }
    if (
      identity.data.key === "enquiry_configuration" &&
      identity.data.status === "published" &&
      "route_tested_at" in value.data &&
      !enquiryRouteWasTestedRecently(value.data.route_tested_at)
    ) {
      throw new AdminAccessError(
        "validation",
        "Test the administrative enquiry route successfully before publishing this configuration. Tests remain valid for 90 days.",
      );
    }
    if (
      identity.data.key === "feature_flags" &&
      identity.data.status === "published" &&
      "public_enquiries" in value.data &&
      value.data.public_enquiries
    ) {
      await ensurePublicEnquiryDependencies(context);
    }

    const storedValue = managedSettingValueAsJson(value.data);
    const service = createSupabaseServiceClient();
    const { data, error } = await service.rpc("save_site_setting", {
      p_actor_id: context.userId,
      p_key: identity.data.key,
      p_expected_version: identity.data.expectedVersion ?? null,
      p_status: identity.data.status,
      p_value: storedValue,
    });
    if (error || !data?.[0]) settingDatabaseError(error);

    revalidateSettingSurfaces();
    return {
      status: "success",
      message: identity.data.expectedVersion
        ? `Setting saved as version ${data[0].setting_version}.`
        : "Setting created successfully.",
    };
  } catch (error) {
    return safeActionError(error);
  }
}
