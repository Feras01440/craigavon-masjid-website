# Editing guide — where things live

Two kinds of change: **content** (dashboard, no code, instant) and **design/behaviour** (code,
reviewed, deployed). This page says which is which and exactly where to look.

## Dashboard (no code) — `/admin`

| I want to change…                                   | Dashboard section                    |
| --------------------------------------------------- | ------------------------------------ |
| Prayer times, Iqamah, Jumuʿah, Ramadan arrangements | Prayer times                         |
| News, events, notices                               | Content → Announcements / Events     |
| Classes on the Education page                       | Content → Education                  |
| FAQs (shown on Services and the homepage)           | Content → FAQ                        |
| Privacy notice and other policies                   | Content → Policy                     |
| Homepage greeting line, heading, buttons            | Settings → Homepage content          |
| Address, phone, WhatsApp, email, parking, access    | Settings → Contact and visit details |
| Menu and footer links, footer note                  | Settings → Navigation and footer     |
| Switch the enquiry form on/off                      | Settings → Feature flags             |
| TV display (when the phase is authorised)           | Settings → TV display                |

Content and settings are versioned; publishing needs a signed-in committee account with two-factor
authentication.

## Code — the map

| Area                             | File(s)                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- |
| Public wording that is not data  | `src/content/public-copy.ts` (site name, nav, service categories)           |
| Page layouts                     | `src/app/<route>/page.tsx`                                                  |
| Shared public components         | `src/components/site/*` (header, footer, icons, reveals, intro)             |
| Prayer components (client)       | `src/components/prayer/*` (today table, hero panel, day arc)                |
| Prayer engine, validation, names | `src/lib/prayer/*`                                                          |
| Design tokens (colours, type)    | `src/styles/tokens.css`                                                     |
| Stylesheets by area              | `src/styles/*.css` (imported in order by `src/app/globals.css`)             |
| Brand marks and icons            | `public/brand/*` — regenerate with `node scripts/generate-brand-assets.mjs` |
| Backdrop photography             | `public/images/*` — credits in `docs/operations/image-credits.md`           |
| Timetable import                 | `scripts/import-mawaqit.mjs` — see `docs/operations/prayer-timetable.md`    |
| Database schema and policies     | `supabase/migrations/*` (append a new migration; never edit an applied one) |

### Changing colours

Edit only `src/styles/tokens.css`. The palette is derived from the logo: `--pine` (ground),
`--berry` (accent, from the crescent), `--gold` / `--gold-soft` (from the dome line). Contrast is
checked in CI by axe on every public route; keep text on pine at `--gold-soft` or lighter.

### Swapping a backdrop photo

1. Optimise to AVIF + WebP at 1920 and 960 wide (see `scripts/` notes in `image-credits.md`).
2. Save under a **new filename** (assets are cached for a week by name).
3. Point the rule in `src/styles/hero.css` at the new files and add the credit line.

### Adding a service category

Add an entry to `serviceCategories` in `src/content/public-copy.ts` and, if it needs an icon, a
matching entry in `src/components/site/icons.tsx`. Never mention fees.

## Quality gates (run before every commit)

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm format:check
```

CI additionally runs the production build, the Chromium accessibility and keyboard suites, a full
acceptance walkthrough against a local Supabase, dependency audit and secret scanning. Nothing
merges red.
