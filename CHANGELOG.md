# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases will use
semantic versioning once the production platform has a verified release process. Dates use ISO 8601.

## [0.4.0] — 2026-08-31

### Added

- Brand marks traced from the Association's logo (transparent, gold and cream variants; opaque
  touch, maskable and favicon variants; a new social card) with a reproducible pipeline in
  `scripts/generate-brand-assets.mjs`.
- Licensed backdrop photography behind the hero and the "find us" band, with credits.
- Line-drawn service icons; a Qur'anic epigraph on the funerals category.
- A living-content set published from the dashboard model: the Friday Qur'an class, six FAQs and a
  launch notice; FAQs also surface on the homepage.
- "Day arc" visual of today's prayers with a live sun marker; an Iqamah-window progress bar in the
  hero panel; scroll reveals and a page-enter transition that collapse under reduced motion.
- A subscribable iCalendar feed at `/prayer-times/calendar.ics`.
- `scripts/import-mawaqit.mjs` plus `docs/operations/prayer-timetable.md`, `docs/EDITING-GUIDE.md`
  and `docs/LAUNCH-PLAN.md`.

### Changed

- The palette now derives from the logo: berry and true gold replace the copper approximations
  (tokens renamed `--berry`, `--berry-soft`).
- The official MAWAQIT timetable is published 1:1 through 31 December 2026; Maghrib and ʿIshāʾ are
  separate again from 9 August; the joined-prayer marker is a plain asterisk.
- Filler copy removed across every public page; the homepage introduction is optional; the "speak
  with the imam" category is withdrawn.
- Stylesheets split by area under `src/styles/`; dead selectors removed.
- Backdrops and brand assets are cached for a week with stale-while-revalidate; the hero artwork is
  preloaded.

### Fixed

- The Apple touch icon is opaque again (iOS composites transparent icons onto black).

## [0.3.0] — 2026-08-30

### Performance

- Public pages now render through ISR and are cached by the Vercel CDN (60s prayer surfaces, 300s
  content), purged instantly on committee publishes via cache tags; anonymous requests skip Supabase
  auth entirely; functions pinned to `lhr1`; TV-only and Arabic fonts no longer preload on phones
  (ADR-003). Previously every request was a cold-startable no-store render.

### Changed

- One shared client clock now drives every live next-prayer surface (hero panel, new pinned strip on
  inner pages, today-table highlight); joined prayers render with a dagger legend; month browsing
  moved to `/prayer-times/[month]` with a stacked seven-column grid, sticky headers, Friday
  emphasis, Jumuʿah chips and jump-to-today; CSV export gained proper prayer names and Jumuʿah
  columns; the manifest became a real installable app entry (maskable icon, shortcut).
- Visual system pass: halved section/intro spacing, weight rebalance, copper top bars reserved for
  live published data, solid compact empty states, compact footer, two-column services.

### Added

- `docs/architecture/ADR-003-public-caching.md`, `docs/operations/DEPLOYED-ENVIRONMENT.md`,
  `LICENSE`, scheduled enquiry retention via GitHub Actions, and a truthful README front door.

## [0.2.0] — 2026-07-21

### Added

- Owner-directed public redesign: Fraunces display typography, simplified seven-item navigation,
  homepage with a live next-prayer panel, Iqamah wording across all public surfaces, Services
  restructure (Shahada, Janazah, Nikah, imam, education, visits), rebuilt Contact with a working
  enquiry form, published privacy notice and large embedded map; `/visit` and `/new-muslims` became
  redirects. Production deployment to Vercel with the full environment, Supabase auth URL
  configuration and smoke evidence.

## [Unreleased]

### Added

- Pull-request CI for formatting, linting, strict typechecking, unit/integration coverage,
  production builds, Chromium smoke/accessibility coverage, local link integrity, dependency
  auditing, secret scanning, and isolated Supabase migration linting.
- Scheduled and pull-request CodeQL analysis for JavaScript and TypeScript.
- Dependabot update policies for pnpm dependencies and GitHub Actions.
- Security-aware pull-request and bug-report templates.
- Contribution guidance for prayer integrity, RLS, privacy, accessibility, testing, migrations, and
  environment-dependent controls.
- Explicit CODEOWNERS launch placeholder pending Association-approved GitHub ownership.

### Security

- CI jobs use read-only default permissions, concurrency cancellation, locked dependencies, disabled
  checkout credential persistence, and no production application or deployment secrets.

<!-- Add the first dated release below only after its artefact, migrations, deployment configuration, and rollback have been verified. -->
