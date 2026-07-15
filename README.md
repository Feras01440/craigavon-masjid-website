# Muslim Association of Craigavon website

This repository contains a Next.js 16.2 application for the Association's public website, prayer
timetable, mosque TV display, and invite-only committee administration. Supabase provides Postgres,
Auth, and Storage.

This branch is the software-complete release candidate. It includes a reproducible local product
environment, but it is not a live production deployment. Production release still requires the
approved real-world values and committee sign-off in the
[launch checklist](docs/operations/LAUNCH-CHECKLIST.md).

## Current implementation boundary

Implemented routes and server-side controls include:

- public pages at `/`, `/about`, `/accessibility`, `/education`, `/new-muslims`, `/news`,
  `/policies`, `/prayer-times`, `/services`, `/visit`, and `/contact`;
- JSON prayer/display endpoints at `/api/prayer` and `/api/display`, plus a dependency-aware
  `/api/health` endpoint;
- the full-screen display at `/tv`, with controlled refresh/notice/hold settings (60-second refresh,
  15-second rotation and 10-minute hold defaults) and a browser-local last-known-good payload;
- invitation-only Supabase magic-link sign-in at `/admin/sign-in`;
- TOTP authenticator enrolment and AAL2 confirmation at `/admin/security`;
- an admin dashboard for content, website settings, prayer configurations and overrides, media,
  enquiries, audit history, people/access and security, with role-aware read/write controls;
- structured announcement, event, recurring-programme, education, service, FAQ and policy create,
  draft-preview, SEO, schedule, publish, expiry, unpublish, soft-delete and revision-restore
  workflows under `/admin/content`;
- a fail-closed public enquiry form that activates only with published privacy/retention/routing
  configuration, a recent queue test, a trusted proxy fingerprint and an enabled feature flag, plus
  a secret-authorised `POST /api/cron/retention` purge for expired enquiries and eligible inactive
  rate-limit fingerprints older than 48 hours;
- a private media pipeline that validates and re-encodes raster images before service-backed
  delivery; and
- managed homepage/contact/navigation/TV/feature settings, editable prayer rules, multiple Jumu'ah
  sessions, dated overrides and Ramadan/Eid/seasonal arrangements; and
- migration-owned roles, RLS policies, audit tables, content/prayer revisions, media metadata,
  enquiries, feature settings, and a private `media` Storage bucket.

The website lock-up uses the profile mark from the supplied Craigavon Masjid Facebook page under the
project owner's explicit 13 July 2026 instruction. The untouched raster source and reproducible web
exports are documented in the [brand guide](docs/brand/BRAND-GUIDE.md); formal ownership, vector
master and committee brand approval remain launch evidence, not assumptions.

The local setup uses passwordless synthetic accounts for every role, local Inbucket email, private
local Storage and visibly marked demonstration content. Demo rows are database-marked and public
repositories exclude them unless both application and Supabase origins are explicit HTTP loopback
addresses. The remaining launch inputs are approved prayer/Jumu'ah values, contact information,
domain/DNS, production Supabase/Vercel/email credentials, named committee administrators, approved
policies/public content, and committee sign-off.

The [administration guide](ADMIN-GUIDE.md) describes the implemented workflows and explicitly
separates route presence from credentialed staging/production evidence.

## Stack

- Node.js 22 (`.node-version`)
- pnpm 11.7.0 (`packageManager` and lockfile)
- Next.js 16.2.10 and React 19.2.7
- strict TypeScript 6 (installed through the compatibility alias documented in `package.json`)
- Supabase Postgres 17, Auth, and Storage
- Zod validation, Vitest, committed Playwright browser journeys, ESLint, and Prettier

## Start locally

Use the complete [local development guide](docs/deployment/LOCAL-DEVELOPMENT.md). After installing
Node, pnpm and Docker, the clean-clone path is:

```powershell
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
```

`pnpm setup:local` starts and resets local Supabase, replays all migrations, creates `.env.local`,
five role accounts and labelled demo data, then prints a one-time super-administrator link. Never
commit `.env.local`, a service-role key, database password, SMTP credential or hosting token.

The app remains intentionally non-authoritative until an approved prayer configuration and confirmed
public content are published. Missing Supabase configuration causes prayer data to report
unavailable and protected administration to fail closed.

## Commands

| Command                    | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`                 | Run Next.js on `http://127.0.0.1:3000`                                  |
| `pnpm setup:local`         | Reset and prepare the complete loopback-only product environment        |
| `pnpm local:link -- EMAIL` | Create a one-time link for a local role account                         |
| `pnpm format:check`        | Check repository formatting                                             |
| `pnpm lint`                | Run ESLint with zero warnings allowed                                   |
| `pnpm typecheck`           | Run TypeScript without emitting files                                   |
| `pnpm test`                | Run the present Vitest tests                                            |
| `pnpm test:coverage`       | Run Vitest with configured coverage thresholds                          |
| `pnpm build`               | Build the production application                                        |
| `pnpm test:e2e`            | Run Playwright across configured phone, tablet, desktop and TV projects |
| `pnpm check`               | Run formatting, lint, typecheck, tests, and build                       |
| `pnpm db:reset`            | Destructively recreate the **local** database from migrations and seed  |
| `pnpm db:lint`             | Lint the local database schema                                          |

Do not report a command as passing unless its current output was recorded. A green CI run is not
proof of browser testing unless the Playwright job log confirms that specifications were detected
and executed.

## Environment contract

Copy `.env.example` to `.env.local` for development. The application currently consumes:

| Variable                               | Exposure        | Current use                                              |
| -------------------------------------- | --------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Browser-visible | Exact application origin used for Auth callbacks         |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser-visible | Supabase project API URL                                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-visible | Browser/Auth client key; anonymous table reads denied    |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server secret   | Mediated reads, privileged RPCs, media, enquiries/Auth   |
| `NEXT_PUBLIC_INDEXING_ENABLED`         | Browser-visible | Explicit production crawl/sitemap release gate           |
| `NEXT_PUBLIC_IDENTITY_APPROVED`        | Browser-visible | Factual Organization JSON-LD release gate                |
| `NEXT_PUBLIC_DEMO_MODE`                | Browser-visible | Loopback-only demo banner/data gate; false in production |
| `ENQUIRY_TRUSTED_IP_HEADER`            | Server config   | Proxy-overwritten network identifier header name         |
| `ENQUIRY_FINGERPRINT_PEPPER`           | Server secret   | Non-reversible enquiry rate-limit fingerprints           |
| `CRON_SECRET`                          | Server secret   | Authorises enquiry/fingerprint retention cleanup         |

`NEXT_PUBLIC_ERROR_MONITORING_DSN` remains reserved; setting it does not activate a monitoring
provider. Public enquiries deliberately use the private staffed admin queue rather than claiming an
unimplemented email notification path.

## Documentation

- [Committee administration](ADMIN-GUIDE.md)
- [Release-candidate QA evidence](docs/quality/QA-REPORT.md)
- [Database, RLS, Auth and recovery P1 validation](docs/quality/DATABASE-P1-VALIDATION.md)
- [Administrator and publication workflow validation](docs/quality/OPERATIONAL-WORKFLOW-VALIDATION.md)
- [Accessibility evidence](docs/quality/ACCESSIBILITY-REPORT.md)
- [Performance budgets and measurements](docs/quality/PERFORMANCE-BUDGETS.md)
- [Local development](docs/deployment/LOCAL-DEVELOPMENT.md)
- [Production deployment](docs/deployment/PRODUCTION-DEPLOYMENT.md)
- [Operations runbook](docs/operations/OPERATIONS-RUNBOOK.md)
- [Launch checklist](docs/operations/LAUNCH-CHECKLIST.md)
- [Recurring maintenance](docs/operations/MAINTENANCE-CHECKLIST.md)
- [Mosque TV display](docs/operations/TV-DISPLAY-GUIDE.md)
- [Platform architecture](docs/architecture/ADR-001-platform-architecture.md)
- [Security policy](SECURITY.md)
- [Threat model](docs/security/THREAT-MODEL.md)
- [Backup and restore](docs/security/BACKUP-AND-RESTORE.md)
- [Incident response](docs/security/INCIDENT-RESPONSE.md)
- [Committee confirmations](docs/COMMITTEE-CONFIRMATIONS.md)
- [Contributing](CONTRIBUTING.md)

## Production handover

The initial hosting target is Vercel with separate staging and production Supabase projects. Follow
the [production deployment guide](docs/deployment/PRODUCTION-DEPLOYMENT.md); it covers migrations,
Auth URL and SMTP setup, Storage, first-super-admin bootstrap, previews, DNS, smoke checks, backups,
and rollback. No production domain is assumed in source or documentation.
