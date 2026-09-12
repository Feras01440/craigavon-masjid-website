/*
 * Imports the masjid's own MAWAQIT timetable 1:1 as a published official
 * timetable: Begins times from the annual calendar and Iqamah times from
 * the per-day iqama calendar (fixed "HH:MM" values or "+N" minute deltas).
 *
 *   node scripts/import-mawaqit.mjs --from 2027-01-01 --to 2027-06-30 [--dry-run]
 *
 * Environment (never committed):
 *   SUPABASE_URL                 project URL
 *   SUPABASE_SERVICE_ROLE_KEY    service-role key
 *   PRAYER_IMPORT_ACTOR_ID       committee account that owns the publish
 *   MAWAQIT_SLUG                 defaults to the masjid's MAWAQIT page slug
 *
 * The import creates a fresh draft configuration with dated overrides and
 * publishes it through the audited `publish_prayer_settings` RPC, so the
 * previous configuration stays intact in history. See
 * docs/operations/prayer-timetable.md.
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
    "Usage: node scripts/import-mawaqit.mjs --from YYYY-MM-DD --to YYYY-MM-DD [--dry-run]",
  );
  process.exit(1);
}

const slug = process.env.MAWAQIT_SLUG ?? "craigavon-masjid-craigavon-bt65-5be-united-kingdom";
const sourceUrl = `https://mawaqit.net/en/${slug}`;

// 1. Fetch and extract the embedded configuration.
const page = await fetch(sourceUrl).then((response) => response.text());
const at = page.indexOf("confData");
const start = page.indexOf("{", at);
let depth = 0;
let end = -1;
for (let k = start; k < page.length; k += 1) {
  if (page[k] === "{") depth += 1;
  else if (page[k] === "}") {
    depth -= 1;
    if (depth === 0) {
      end = k;
      break;
    }
  }
}
if (at < 0 || end < 0) throw new Error("MAWAQIT configuration not found on the page.");
const conf = JSON.parse(page.slice(start, end + 1));
if (!Array.isArray(conf.calendar) || !Array.isArray(conf.iqamaCalendar)) {
  throw new Error("MAWAQIT calendar data is missing.");
}

const PRAYERS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
const IQAMA_INDEX = { fajr: 0, dhuhr: 1, asr: 2, maghrib: 3, isha: 4 };

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// 2. Build one override row per prayer per day.
const overrides = [];
const firstDate = new Date(`${from}T00:00:00Z`);
const lastDate = new Date(`${to}T00:00:00Z`);
for (let d = new Date(firstDate); d <= lastDate; d.setUTCDate(d.getUTCDate() + 1)) {
  const month = d.getUTCMonth();
  const day = String(d.getUTCDate());
  const key = d.toISOString().slice(0, 10);
  const begins = conf.calendar[month]?.[day];
  const iqama = conf.iqamaCalendar[month]?.[day];
  if (!begins || begins.length < 6) throw new Error(`MAWAQIT has no calendar entry for ${key}.`);
  PRAYERS.forEach((prayer, index) => {
    const beginsAt = begins[index];
    let congregationAt = null;
    if (prayer !== "sunrise" && iqama) {
      const raw = iqama[IQAMA_INDEX[prayer]];
      if (typeof raw === "string" && raw.length > 0) {
        congregationAt = raw.startsWith("+")
          ? addMinutes(beginsAt, Number(raw.slice(1)) || 0)
          : raw;
      }
    }
    overrides.push({
      prayer_date: key,
      prayer,
      begins_at: beginsAt,
      congregation_at: congregationAt,
      unavailable: false,
      reason: `MAWAQIT official timetable import (${from} to ${to})`,
    });
  });
}
console.log(
  `${overrides.length} override rows for ${from} → ${to}; Jumuʿah ${conf.jumua ?? "13:00"}.`,
);
for (const sample of [from, to]) {
  const d = new Date(`${sample}T12:00:00Z`);
  console.log(`  ${sample}: ${conf.calendar[d.getUTCMonth()][String(d.getUTCDate())].join(" ")}`);
}
if (dryRun) {
  console.log("Dry run — nothing written.");
  process.exit(0);
}

// 3. Write the draft, then publish through the audited RPC.
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
  .insert({
    name: `MAWAQIT official timetable — ${from} to ${to}`,
    status: "draft",
    effective_from: from,
    effective_to: to,
    timezone: "Europe/London",
    latitude: conf.latitude,
    longitude: conf.longitude,
    calculation_method: "imported_official",
    madhab: "standard",
    high_latitude_rule: "seventh_of_night",
    adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    // Structural placeholders only: every day is overridden with the official times.
    congregation_rules: {
      fajr: { type: "offset", minutes: 30, roundTo: 1 },
      dhuhr: { type: "offset", minutes: 15, roundTo: 1 },
      asr: { type: "offset", minutes: 15, roundTo: 1 },
      maghrib: { type: "offset", minutes: 5, roundTo: 1 },
      isha: { type: "offset", minutes: 10, roundTo: 1 },
    },
    hijri_adjustment: conf.hijriAdjustment ?? 0,
    source_name: "Craigavon Masjid MAWAQIT timetable",
    source_reference: sourceUrl,
    calculation_library: "committee_import",
    calculation_library_version: new Date().toISOString().slice(0, 10),
    created_by: actorId,
    updated_by: actorId,
  })
  .select("id,version")
  .single();
if (settingError) throw new Error(`Draft insert failed: ${settingError.message}`);

const { error: jumuahError } = await admin.from("jumuah_sessions").insert({
  prayer_settings_id: setting.id,
  label: "Jumuʿah",
  khutbah_time: conf.jumua || "13:00",
  prayer_time: null,
  display_order: 1,
});
if (jumuahError) throw new Error(`Jumuʿah insert failed: ${jumuahError.message}`);

for (let i = 0; i < overrides.length; i += 200) {
  const batch = overrides
    .slice(i, i + 200)
    .map((row) => ({ ...row, prayer_settings_id: setting.id, created_by: actorId }));
  const { error } = await admin.from("prayer_overrides").insert(batch);
  if (error) throw new Error(`Override insert failed at row ${i}: ${error.message}`);
}

const { data: published, error: publishError } = await admin.rpc("publish_prayer_settings", {
  p_actor_id: actorId,
  p_id: setting.id,
  p_expected_version: setting.version,
  p_approval_note: `Imported 1:1 from the masjid's MAWAQIT timetable (${from} to ${to}).`,
});
if (publishError) throw new Error(`Publish failed: ${publishError.message}`);
console.log(`Published prayer settings ${setting.id} v${published?.[0]?.settings_version ?? "?"}.`);
