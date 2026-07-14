import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AdminAccessError } from "@/lib/auth/errors";
import type { Database, SiteSettingRow } from "@/types/database";

export type SiteSettingAdminRecord = {
  setting: SiteSettingRow;
  updatedByName: string | null;
};

export async function listSiteSettingsForAdmin(
  client: SupabaseClient<Database>,
): Promise<SiteSettingAdminRecord[]> {
  const { data: settings, error } = await client
    .from("site_settings")
    .select("*")
    .order("key", { ascending: true });

  if (error || !settings) {
    throw new AdminAccessError(
      "service",
      "Website settings could not be loaded safely. Nothing has been changed.",
    );
  }

  const actorIds = [
    ...new Set(settings.map((setting) => setting.updated_by).filter((id): id is string => !!id)),
  ];
  const actorNames = new Map<string, string>();
  if (actorIds.length) {
    const profiles = await client
      .from("admin_profiles")
      .select("id, display_name")
      .in("id", actorIds);
    if (!profiles.error) {
      for (const profile of profiles.data ?? []) {
        actorNames.set(profile.id, profile.display_name);
      }
    }
  }

  return settings.map((setting) => ({
    setting,
    updatedByName: setting.updated_by ? (actorNames.get(setting.updated_by) ?? null) : null,
  }));
}
