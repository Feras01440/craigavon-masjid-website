# Prayer timetable operations

The public timetable is **published data**: every surface (homepage, `/prayer-times`, the pinned
bar, the CSV, the calendar feed and the TV display) reads the same committee-approved configuration,
and the site shows "not available" rather than guessing when coverage runs out.

## How the times are produced (from 11 September 2026)

**Begins times are calculated astronomically for the masjid's own coordinates** (54.4478 N, 6.3712
W) with the `adhan` library, using:

| Setting              | Value                         | Why                                                                                                                                                |
| -------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fajr / ʿIshāʾ angles | 15° / 15° (the "ISNA" method) | Reproduces the Belfast Islamic Centre timetable, which the committee uses as its reference, to within 1–4 minutes for ʿIshāʾ and a few for Fajr.   |
| Short summer nights  | One-seventh of the night      | From mid-May to late July 15° twilight never ends at this latitude; the one-seventh rule keeps Fajr and ʿIshāʾ at practical times (see the table). |
| ʿAsr                 | Standard (shadow length once) | Matches both local references.                                                                                                                     |
| Maghrib              | Sunset + 2 minutes            | The margin both local references use.                                                                                                              |

This replaced the 1:1 import of the masjid's MAWAQIT calendar, whose ʿIshāʾ column mixed methods
(21:46 one day, 21:24 two days later; 20:38 by 30 September) and whose October column was an hour
late.

**Iqamah times are rules, not fixed clock times.** Each is "begins time + a margin, rounded up to
the quarter-hour", so they follow the season instead of drifting away from the adhan:

| Prayer  | Rule                          | 10 Sep | 30 Sep | 20 Oct | 21 Dec | 20 Mar | 21 Jun |
| ------- | ----------------------------- | ------ | ------ | ------ | ------ | ------ | ------ |
| Fajr    | begins + 35 min → next ¼ hour | 06:00  | 06:30  | 07:00  | 07:30  | 05:30  | 04:30  |
| Dhuhr   | begins + 30 min → next ¼ hour | 14:00  | 14:00  | 13:45  | 13:00  | 13:15  | 14:00  |
| ʿAsr    | begins + 60 min → next ¼ hour | 18:00  | 17:30  | 16:45  | 15:00  | 17:00  | 19:00  |
| Maghrib | begins + 5 min                | 20:00  | 19:09  | 18:21  | 16:07  | 18:43  | 22:10  |
| ʿIshāʾ  | begins + 20 min → next ¼ hour | 22:00  | 21:15  | 20:15  | 18:30  | 20:45  | 23:30  |

On 10 September these rules reproduce the masjid's current practice exactly (06:00 · 14:00 · 18:00 ·
+5 · 22:00). Jumuʿah is a single khutbah time (13:00); no separate Iqamah is shown.

**The committee owns these rules.** In the dashboard, Prayer times → **Open quick change** shows the
five rules and the Jumuʿah time; one submit validates every day of the period and swaps the live
timetable for the corrected copy (the previous version stays in history). The published times update
within a minute everywhere, including the calendar feed. A fixed time is also possible per prayer if
the committee prefers it for a season. Keep the masjid screen (MAWAQIT) in step with whatever is
published here.

## Coverage today

| Configuration                       | Effective               | Notes                                             |
| ----------------------------------- | ----------------------- | ------------------------------------------------- |
| Calculated timetable (rules above)  | 2026-09-11 → 2027-09-10 | Renew before 10 September 2027 (see below).       |
| MAWAQIT official timetable (import) | 2026-08-31 → 2026-09-10 | Historical; ended when the calculation took over. |

## Renewing the coverage (two minutes, once a year)

```bash
node scripts/publish-calculated-timetable.mjs --from 2027-09-11 --to 2028-09-10 --dry-run
```

```bash
SUPABASE_URL=https://qdcdkarbbfzdcctlvqjt.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=… \
PRAYER_IMPORT_ACTOR_ID=… \
node scripts/publish-calculated-timetable.mjs --from 2027-09-11 --to 2028-09-10
```

The script publishes a **new** configuration through the audited `publish_prayer_settings` RPC; the
previous one stays in history. Alternatively, the committee can duplicate and publish the
configuration from the dashboard. The publication horizon is at most 366 days.

## Changing a single day, Ramadan, Eid

- One day (a late Jumuʿah, a delayed Iqamah): dashboard → overrides. Dated and audited.
- Ramadan and Eid: dashboard → seasonal arrangements (Tarawih, Iftar, Eid prayer times). They appear
  on `/prayer-times` and on the TV display only once published.

## Verifying

Spot-check three dates on `/prayer-times/<yyyy-mm>` against the Belfast Islamic Centre timetable.
Begins times should agree to within a few minutes; Iqamah times follow the rules above.

## Calendar feed

`/prayer-times/calendar.ics` serves a rolling two-month iCalendar feed (one ten-minute event per
Iqamah, plus Jumuʿah). Subscribers' apps refresh daily; the feed shortens automatically if coverage
ends, and never invents a time.

## The MAWAQIT importer

`scripts/import-mawaqit.mjs` remains available for a 1:1 import if the committee ever prefers the
MAWAQIT calendar again, but its source calendar must be corrected first: as of September 2026 its
October column is an hour late and its winter iqama calendar keeps ʿAsr after Maghrib.
