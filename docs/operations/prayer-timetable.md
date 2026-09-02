# Prayer timetable operations

The public timetable is **published data, never a live calculation**. Every surface (homepage,
`/prayer-times`, the pinned bar, the CSV, the calendar feed and the TV display) reads the same
published configuration, and the site shows "not available" rather than estimating when coverage
runs out.

## Source of truth

The masjid's own MAWAQIT timetable is the operational source
(<https://mawaqit.net/en/craigavon-masjid-craigavon-bt65-5be-united-kingdom>). It is imported
**1:1** — Begins times and Iqamah times per day — so the website always matches the screen inside
the masjid.

## Coverage today

| Configuration              | Effective               | Notes                                                                               |
| -------------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| MAWAQIT official timetable | 2026-08-31 → 2026-09-30 | Maghrib and ʿIshāʾ separate since 9 Aug 2026; October–December withheld (see below) |

## Known source defects (2 Sep 2026) — fix on MAWAQIT, then re-import

The October–December 2026 import was withdrawn after verification against MAWAQIT:

1. **October is an hour late on MAWAQIT.** Every October entry in the masjid's annual calendar is
   shifted +1h (for example 18 Oct: Sunrise "08:56", Maghrib "19:21"; the true times are about 07:58
   and 18:22). September and November are correct, so this is the uploaded October column, not the
   clock change.
2. **Winter ʿAsr Iqamah is after Maghrib.** From 1 November the iqama calendar keeps ʿAsr at 17:00
   while Maghrib begins at 16:50 and earlier, which the website's safety checks refuse. The winter
   ʿAsr (and Dhuhr) Iqamah times need entering for November–December.

Once corrected on MAWAQIT, run the import for `--from 2026-10-01 --to 2026-12-31` (dry run first)
and spot-check three dates. Until then the site shows September and says the next period is not yet
published — it never shows the shifted times.

## Re-importing (about two minutes)

```bash
# 1. Preview what would be imported (no writes)
node scripts/import-mawaqit.mjs --from 2027-01-01 --to 2027-06-30 --dry-run
```

```bash
# 2. Publish it (secrets from the environment, never from the repo)
SUPABASE_URL=https://qdcdkarbbfzdcctlvqjt.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=… \
PRAYER_IMPORT_ACTOR_ID=… \
node scripts/import-mawaqit.mjs --from 2027-01-01 --to 2027-06-30
```

The script creates a **new draft** configuration with dated overrides and publishes it through the
audited `publish_prayer_settings` RPC, so the previous configuration remains in history and the
change is attributed to the committee account given as the actor.

Afterwards, check three dates on `/prayer-times/<yyyy-mm>` against MAWAQIT. Public pages revalidate
within a minute.

## Changing a single day

Use the dashboard: **Prayer times → current configuration → overrides**. Overrides are dated and
audited; the CSV and the calendar feed pick them up automatically.

## Seasonal arrangements (Ramadan, Eid)

Also dashboard-managed (seasonal arrangements on the configuration). They appear on `/prayer-times`
under "Current seasonal arrangements" and on the TV display. Nothing is shown until the committee
publishes it.

## Calendar feed

`/prayer-times/calendar.ics` serves a rolling two-month iCalendar feed (one ten-minute event per
Iqamah, plus Jumuʿah). Subscribers' apps refresh daily; the feed shortens automatically if coverage
ends, and never invents a time.
