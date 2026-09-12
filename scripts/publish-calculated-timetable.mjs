/*
 * Publishes a calculated prayer timetable for Craigavon Masjid: astronomical
 * Begins times (ISNA 15°/15° with the one-seventh-night rule, which matches
 * the Belfast Islamic Centre timetable to within a few minutes) and Iqamah
 * rules that follow the season while rounding up to the quarter-hour.
 *
 *   node scripts/publish-calculated-timetable.mjs --from 2026-09-11 --to 2027-09-10 [--dry-run]
 *
 * Environment (never committed):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRAYER_IMPORT_ACTOR_ID
 *
 * The committee can change every rule below in the dashboard afterwards;
 * see docs/operations/prayer-timetable.md for the reasoning and the
 * resulting times through the year.
 */
import { createClient } from "@supabase/supabase-js";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (!key.startsWith("--")) continue;
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(key.slice(2), next);
    i += 1;
  } else {
    args.set(key.slice(2), true);
  }
}
const from = args.get("from");
const to = args.get("to");
const dryRun = args.get("dry-run") === true;
const dateKey = /^\d{4}-\d{2}-\d{2}$/u;
if (
  typeof from !== "string" ||
  typeof to !== "string" ||
  !dateKey.test(from) ||
  !dateKey.test(to)
) {
  console.error(
    "Usage: node scripts/publish-calculated-timetable.mjs --from YYYY-MM-DD --to YYYY-MM-DD [--dry-run]",
  );
  process.exit(1);
}

const configuration = {
  name: `Calculated timetable — ${from} to ${to}`,
  status: "draft",
  effective_from: from,
  effective_to: to,
  timezone: "Europe/London",
  latitude: 54.4478,
  longitude: -6.3712,
  // 15° Fajr / 15° ʿIshāʾ; nights too short for 15° use one-seventh of the night.
  calculation_method: "north_america",
  madhab: "standard",
  high_latitude_rule: "seventh_of_night",
  // Two minutes after astronomical sunset for Maghrib, as the local references do.
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 2, isha: 0 },
  congregation_rules: {
    fajr: { type: "offset", minutes: 35, roundTo: 15 },
    dhuhr: { type: "offset", minutes: 30, roundTo: 15 },
    asr: { type: "offset", minutes: 60, roundTo: 15 },
    maghrib: { type: "offset", minutes: 5, roundTo: 1 },
    isha: { type: "offset", minutes: 20, roundTo: 15 },
  },
  hijri_adjustment: 0,
  source_name:
    "Astronomical calculation (ISNA 15°/15°, one-seventh night), checked against Belfast Islamic Centre",
  source_reference: "https://belfastislamiccentre.org.uk/",
  calculation_library: "adhan",
  calculation_library_version: "4.4.4",
};

console.log(JSON.stringify(configuration, null, 2));
if (dryRun) {
  console.log("Dry run — nothing written.");
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const actorId = process.env.PRAYER_IMPORT_ACTOR_ID;
if (!url || !serviceKey || !actorId) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and PRAYER_IMPORT_ACTOR_ID.");
  process.exit(1);
}
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const { data: setting, error: settingError } = await admin
  .from("prayer_settings")
  .insert({ ...configuration, created_by: actorId, updated_by: actorId })
  .select("id,version")
  .single();
if (settingError) throw new Error(`Draft insert failed: ${settingError.message}`);

const { error: jumuahError } = await admin.from("jumuah_sessions").insert({
  prayer_settings_id: setting.id,
  label: "Jumuʿah",
  khutbah_time: "13:00",
  prayer_time: null,
  display_order: 1,
});
if (jumuahError) throw new Error(`Jumuʿah insert failed: ${jumuahError.message}`);

const { data: published, error: publishError } = await admin.rpc("publish_prayer_settings", {
  p_actor_id: actorId,
  p_id: setting.id,
  p_expected_version: setting.version,
  p_approval_note:
    "Calculated timetable (ISNA 15°/15°, one-seventh night; Maghrib +2) with seasonal Iqamah rules rounding up to the quarter-hour, published at the owner's instruction on 10 September 2026 after comparison with the Belfast Islamic Centre timetable.",
});
if (publishError) throw new Error(`Publish failed: ${publishError.message}`);
console.log(`Published prayer settings ${setting.id} v${published?.[0]?.settings_version ?? "?"}.`);
