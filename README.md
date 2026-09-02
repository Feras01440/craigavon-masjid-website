# Craigavon Masjid — public website and administration platform

The production platform of the **Muslim Association of Craigavon**: the public masjid website
(prayer and Iqamah times, Jumuʿah, services, education, news, contact), a full-screen prayer display
for the masjid TV, and an invite-only committee administration dashboard.

**Live site:** <https://craigavon-masjid.vercel.app> · The deployed commit is visible in the Vercel
dashboard under Deployments.

## Stack

- **Next.js 16** (App Router, React 19, strict TypeScript). The `typecheck` script calls `tsc6`, the
  TypeScript 6 binary alias installed with the toolchain.
- **Supabase** — Postgres (with RLS and pgTAP-tested policies), Auth (magic-link + TOTP two-step
  verification), private Storage.
- **Vercel** — hosting, CDN caching of the public pages (see
  [ADR-003](docs/architecture/ADR-003-public-caching.md)), functions pinned to `lhr1`.
- Self-hosted fonts (Fraunces, Inter, Amiri; Marcellus for the TV only); no third-party scripts;
  strict CSP. The one external embed is the Google map on `/contact`.

## Quickstart

```bash
corepack enable
pnpm install
pnpm dev                 # runs env-less: every data surface shows its fail-closed state
pnpm setup:local         # full local product: Supabase (Docker) + seeded demo data
```

| Command                          | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `pnpm check`                     | format + lint + typecheck + unit tests + build |
| `pnpm test` / `pnpm test:e2e`    | unit / Playwright suites                       |
| `pnpm db:reset` · `pnpm db:lint` | local database lifecycle                       |
| `pnpm deploy:prod`               | production deploy (after CI is green)          |

Environment variables are documented in [`.env.example`](.env.example) and, for the live values'
set/unset matrix, in [DEPLOYED-ENVIRONMENT](docs/operations/DEPLOYED-ENVIRONMENT.md).

## How this deploys

Every push runs the 10-job CI (format/lint/types, unit+integration coverage, env-less build +
Chromium smoke + axe accessibility, internal links, dependency audit, secret scan, migration lint,
and a full seeded product acceptance walkthrough). Production deploys happen from a green commit via
`pnpm deploy:prod`; connecting the Vercel Git integration (one-time dashboard step) upgrades this to
automatic previews per PR and production on merge.

## Design and product principles

- **Fail closed, never invent**: prayer times and content render only from published,
  committee-approved records; anything unpublished shows an honest unavailable state.
- **Iqamah-first daily use**: one shared client clock drives every live next-prayer surface; public
  pages are CDN-cached so the daily check is fast on any phone.
- **Accessibility is a gate, not a goal**: WCAG AA (axe), keyboard, reduced-motion and
  forced-colours checks run in CI on every push.

## Documentation

| Area                      | Start here                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Editing anything          | [docs/EDITING-GUIDE.md](docs/EDITING-GUIDE.md) — dashboard vs code, file map         |
| Launching and running it  | [docs/LAUNCH-PLAN.md](docs/LAUNCH-PLAN.md)                                           |
| Prayer timetable imports  | [docs/operations/prayer-timetable.md](docs/operations/prayer-timetable.md)           |
| What is running right now | [docs/operations/DEPLOYED-ENVIRONMENT.md](docs/operations/DEPLOYED-ENVIRONMENT.md)   |
| Architecture decisions    | [docs/architecture/](docs/architecture/) (ADR-001…003)                               |
| Operations runbook        | [docs/operations/OPERATIONS-RUNBOOK.md](docs/operations/OPERATIONS-RUNBOOK.md)       |
| Committee administration  | [ADMIN-GUIDE.md](ADMIN-GUIDE.md)                                                     |
| Security model            | [SECURITY.md](SECURITY.md) + [docs/security/](docs/security/)                        |
| Deployment detail         | [docs/deployment/PRODUCTION-DEPLOYMENT.md](docs/deployment/PRODUCTION-DEPLOYMENT.md) |

> Historical note: reports under `docs/quality/` and `docs/audits/` were captured against the
> pre-redesign build (July 2026) and describe an earlier user interface; treat them as archives, not
> current evidence.

## Ownership

© Muslim Association of Craigavon — see [LICENSE](LICENSE). The repository currently lives under a
personal account; transferring it to an Association-controlled GitHub organisation is an open
launch-checklist item.
