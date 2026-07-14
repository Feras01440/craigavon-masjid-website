# Muslim Association of Craigavon website

This repository contains a Next.js 16.2 application for the Association's public website, prayer
timetable, mosque TV display, and invite-only committee administration. Supabase provides Postgres,
Auth, and Storage.

The repository is a rebuild in progress. It has **not** been deployed or credential-verified by the
presence of this documentation. Do not call it production-ready until every item in the
[launch checklist](docs/operations/LAUNCH-CHECKLIST.md) has evidence and the Association has
completed the [confirmation register](docs/COMMITTEE-CONFIRMATIONS.md).

## Current implementation boundary

Implemented routes and server-side controls include:

- public pages at `/`, `/about`, `/education`, `/new-muslims`, `/news`, `/policies`,
  `/prayer-times`, `/services`, `/visit`, and `/contact`;
- JSON prayer/display endpoints at `/api/prayer` and `/api/display`, plus a dependency-aware
  `/api/health` endpoint;
- the full-screen display at `/tv`, with controlled refresh/notice/hold settings (60-second refresh,
  15-second rotation and 10-minute hold defaults) and a browser-local last-known-good payload;
- invitation-only Supabase magic-link sign-in at `/admin/sign-in`;
- TOTP authenticator enrolment and AAL2 confirmation at `/admin/security`;
- an admin dashboard for content, website settings, prayer configurations and overrides, media,
  enquiries, audit history, people/access and security, with role-aware read/write controls;
- structured content create, edit, scheduled publication, immediate publication, archive and
  revision-restore workflows under `/admin/content`;
- a fail-closed public enquiry form that activates only with published privacy/retention/routing
  configuration, a recent queue test, a trusted proxy fingerprint and an enabled feature flag, plus
  a secret-authorised `POST /api/cron/retention` purge for expired enquiries and eligible inactive
  rate-limit fingerprints older than 48 hours;
- a private media pipeline that validates and re-encodes raster images before service-backed
  delivery; and
- migration-owned roles, RLS policies, audit tables, content/prayer revisions, media metadata,
  enquiries, feature settings, and a private `media` Storage bucket.

The website lock-up uses the profile mark from the supplied Craigavon Masjid Facebook page under the
project owner's explicit 13 July 2026 instruction. The untouched raster source and reproducible web
exports are documented in the [brand guide](docs/brand/BRAND-GUIDE.md); formal ownership, vector
master and committee brand approval remain launch evidence, not assumptions.

Important release dependencies remain:

- the migration, RLS matrix, Auth/MFA, Storage, retention job, backups and administrator workflows
  still need credentialed staging evidence;
- committee-confirmed identity, contact, prayer, policy, service and operational values must replace
  intentionally unavailable states;
- PDF upload remains disabled until production malware scanning is configured;
- search indexing and factual Organization structured data remain environment-gated until the
  production domain and identity are approved; and
- monitoring, alert routing and a restore drill remain deployment-owner responsibilities.

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

Use the complete [local development guide](docs/deployment/LOCAL-DEVELOPMENT.md). The short path,
after installing Node, pnpm, Docker, and the separately installed Supabase CLI, is:

```powershell
pnpm install --frozen-lockfile
supabase start
supabase db reset
Copy-Item .env.example .env.local
pnpm dev
```

Populate `.env.local` with the values printed by the local Supabase stack. Keep one origin
(`http://127.0.0.1:3000` is recommended) consistent across the environment and Auth configuration.
Never commit `.env.local`, a service-role key, database password, SMTP credential, or hosting token.

The app remains intentionally non-authoritative until an approved prayer configuration and confirmed
public content are published. Missing Supabase configuration causes prayer data to report
unavailable and protected administration to fail closed.

## Commands

| Command                    | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`                 | Run Next.js on `http://127.0.0.1:3000`                                  |
| `pnpm format:check`        | Check repository formatting                                             |
| `pnpm lint`                | Run ESLint with zero warnings allowed                                   |
| `pnpm typecheck`           | Run TypeScript without emitting files                                   |
| `pnpm test`                | Run the present Vitest tests                                            |
| `pnpm test:coverage`       | Run Vitest with configured coverage thresholds                          |
| `pnpm build`               | Build the production application                                        |
| `pnpm test:e2e`            | Run Playwright across configured phone, tablet, desktop and TV projects |
| `pnpm check`               | Run formatting, lint, typecheck, tests, and build                       |
| `supabase db reset`        | Destructively recreate the **local** database from migrations and seed  |
| `supabase db lint --local` | Lint the local database schema                                          |

Do not report a command as passing unless its current output was recorded. A green CI run is not
proof of browser testing unless the Playwright job log confirms that specifications were detected
and executed.

## Environment contract

Copy `.env.example` to `.env.local` for development. The application currently consumes:

| Variable                               | Exposure        | Current use                                            |
| -------------------------------------- | --------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                 | Browser-visible | Exact application origin used for Auth callbacks       |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser-visible | Supabase project API URL                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-visible | Browser/Auth client key; anonymous table reads denied  |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server secret   | Mediated reads, privileged RPCs, media, enquiries/Auth |
| `NEXT_PUBLIC_INDEXING_ENABLED`         | Browser-visible | Explicit production crawl/sitemap release gate         |
| `NEXT_PUBLIC_IDENTITY_APPROVED`        | Browser-visible | Factual Organization JSON-LD release gate              |
| `ENQUIRY_TRUSTED_IP_HEADER`            | Server config   | Proxy-overwritten network identifier header name       |
| `ENQUIRY_FINGERPRINT_PEPPER`           | Server secret   | Non-reversible enquiry rate-limit fingerprints         |
| `CRON_SECRET`                          | Server secret   | Authorises enquiry/fingerprint retention cleanup       |

`NEXT_PUBLIC_ERROR_MONITORING_DSN` remains reserved; setting it does not activate a monitoring
provider. Public enquiries deliberately use the private staffed admin queue rather than claiming an
unimplemented email notification path.

## Documentation

- [Committee administration](ADMIN-GUIDE.md)
- [Local development](docs/deployment/LOCAL-DEVELOPMENT.md)
- [Production deployment](docs/deployment/PRODUCTION-DEPLOYMENT.md)
- [Operations runbook](docs/operations/OPERATIONS-RUNBOOK.md)
- [Launch checklist](docs/operations/LAUNCH-CHECKLIST.md)
- [Recurring maintenance](docs/operations/MAINTENANCE-CHECKLIST.md)
- [Mosque TV display](docs/operations/TV-DISPLAY-GUIDE.md)
- [Platform architecture](docs/architecture/ADR-001-platform-architecture.md)
- [Security policy](SECURITY.md)
- [Backup and restore](docs/security/BACKUP-AND-RESTORE.md)
- [Incident response](docs/security/INCIDENT-RESPONSE.md)
- [Committee confirmations](docs/COMMITTEE-CONFIRMATIONS.md)
- [Contributing](CONTRIBUTING.md)

## Production handover

The initial hosting target is Vercel with separate staging and production Supabase projects. Follow
the [production deployment guide](docs/deployment/PRODUCTION-DEPLOYMENT.md); it covers migrations,
Auth URL and SMTP setup, Storage, first-super-admin bootstrap, previews, DNS, smoke checks, backups,
and rollback. No production domain is assumed in source or documentation.
