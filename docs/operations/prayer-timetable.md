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

| Configuration              | Effective               | Notes                                        |
| -------------------------- | ----------------------- | -------------------------------------------- |
| MAWAQIT official timetable | 2026-08-31 → 2026-12-31 | Maghrib and ʿIshāʾ separate since 9 Aug 2026 |

**Before 31 December 2026, import the next period** (MAWAQIT publishes a full year, so January–June
can be imported any time after the committee confirms next year's Iqamah pattern on MAWAQIT).

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
