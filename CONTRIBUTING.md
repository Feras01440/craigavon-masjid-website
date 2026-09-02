# Contributing

Thank you for contributing to the Muslim Association of Craigavon platform. This project handles
religiously sensitive operational information and may process private enquiries, so correctness,
accessibility, privacy, and traceability take priority over speed.

## Before starting

- Use a short-lived branch from the current `main` branch.
- Check existing issues and `docs/COMMITTEE-CONFIRMATIONS.md` before changing factual, religious,
  contact, service, facility, or policy content.
- Report vulnerabilities and personal-data exposure privately through [SECURITY.md](SECURITY.md),
  not in an issue or pull request.
- Do not use production credentials, production data, real enquiry messages, administrator email
  addresses, or private media in development or tests.
- The placeholder in `.github/CODEOWNERS` must be replaced by Association-controlled GitHub owners
  before branch protection relies on it. Do not substitute an unapproved personal account.

## Toolchain

The supported local toolchain is defined by the repository, not by a globally convenient version:

- Node.js from `.node-version` (currently Node 22);
- pnpm from `package.json#packageManager` (currently pnpm 11.7.0);
- the committed `pnpm-lock.yaml`;
- a Supabase CLI version matching `.github/workflows/ci.yml` when working on local migrations.

Enable Corepack if needed, then install exactly from the lockfile:

```sh
corepack enable
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local` and fill it only with local or explicitly approved
non-production values. Values prefixed with `NEXT_PUBLIC_` are sent to the browser and are never
suitable for secrets. Never connect a preview deployment or local test to production Supabase.

## Common commands

```sh
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm test:e2e
```

`pnpm format` writes formatting changes; inspect its diff before committing. The complete Playwright
command exercises all configured browsers locally. Pull-request CI installs only Chromium and runs
the Chromium mobile, desktop, and TV projects to keep untrusted PR jobs bounded and secret-free.

## Local Supabase work

Install the pinned Supabase CLI through an approved method, then run the local stack without
production tokens:

```sh
supabase start
pnpm db:reset
pnpm db:lint
```

Database contributions must:

- add a new timestamped migration; never rewrite a migration already applied outside a disposable
  local environment;
- enable RLS before exposing a table, view, function, or Storage path;
- add positive and negative tests for anonymous users and every affected administrator role;
- use server-controlled role membership rather than user-editable metadata;
- fix `search_path`, validate the caller, and minimise grants for any security-definer function;
- document data migration, backup, forward-fix, and rollback constraints in the pull request;
- regenerate and review database types when the schema changes;
- avoid `supabase db push`, project linking, production dumps, or Dashboard SQL during ordinary
  pull-request testing.

CI starts an isolated local Supabase stack when migrations exist. It does not use
`SUPABASE_ACCESS_TOKEN`, a production database password, or a production service key.

## Prayer-time changes

Prayer starts, congregation times, Jumu'ah, Ramadan, Eid, closures, timezone handling, calculation
method, and TV output are high-risk changes.

A prayer-related pull request must include:

- the committee-approved source or a clearly unpublished placeholder;
- effective dates and the intended precedence over calculated, recurring, Ramadan/Eid, and per-date
  rules;
- golden fixtures covering the affected seasons and GMT/BST boundary cases;
- validation that congregation follows the prayer start and precedes the next start;
- validation that every Jumu'ah session is on Friday, after Dhuhr, and before Asr;
- device-timezone independence, DST ambiguity/nonexistence behavior, and public/TV parity tests;
- a 30-day preview and a safe rollback to the prior immutable published revision.

Do not update a fixture merely to make an unexplained calculation change pass. Investigate library,
timezone-data, coordinate, method, and rounding drift and obtain prayer-authority review.

## Application security and privacy

- Treat every exported Server Action and Route Handler as publicly reachable. Authenticate,
  authorise, and validate at the start of the operation.
- Do not rely on middleware redirects, hidden buttons, TypeScript types, or the confidentiality of a
  Supabase publishable/anonymous key.
- Keep secret/service-role clients in server-only modules. Check client bundles and source maps for
  accidental exposure.
- Use structured content and React's normal escaping. Do not add arbitrary editor HTML, scripts,
  iframes, or unsafe SVG uploads.
- Keep enquiry bodies out of logs, analytics, fixtures, screenshots, and notification subject lines.
- Use synthetic records in tests and ensure uploaded fixtures contain no EXIF location, faces, or
  personal documents.
- Add request-size, rate-limit, CSRF/Origin, authorisation-denial, and cache-leakage tests for
  affected paths.

Read [SECURITY.md](SECURITY.md) and [the threat model](docs/security/THREAT-MODEL.md) before
changing authentication, roles, prayer publication, enquiries, media, RLS, secrets, deployment, or
backups.

## Accessibility and interface quality

Public and admin experiences target WCAG 2.2 AA. For a visible change, test:

- keyboard-only navigation, focus order, focus visibility, and Escape behavior;
- labels, names, descriptions, errors, status announcements, and heading structure;
- 200% zoom and reflow at 320 CSS pixels without loss of content;
- contrast, forced colors, reduced motion, touch targets, and non-color cues;
- mobile, desktop, and relevant 16:9 TV layouts;
- automated axe checks plus a manual assistive-technology check for the changed journey.

Automated accessibility checks are necessary but not sufficient.

## Tests

Place deterministic logic tests under `tests/unit`, boundary/database tests under
`tests/integration`, and user journeys under `tests/e2e`.

- Tests must not depend on wall-clock “now,” network weather, live MAWAQIT data, production
  Supabase, or test order.
- Freeze time and state the IANA timezone for temporal tests.
- Every bug fix should include a regression test at the lowest appropriate level.
- Authentication and RLS tests must assert denials, not only successful administrator flows.
- Playwright smoke tests should include an `@axe-core/playwright` scan for the main public, prayer,
  sign-in, dashboard, validation-error, and TV states.

The coverage threshold is enforced by `vitest.config.ts`. Coverage percentage does not replace
risk-based boundary tests.

## Commits and pull requests

Write small, imperative commits that explain one coherent change. Keep generated, dependency,
migration, content, and formatting changes reviewable; do not hide unrelated rewrites in one commit.

Before requesting review:

1. Rebase or merge the latest `main` according to repository policy.
2. Run the applicable commands above with a clean lockfile install.
3. Complete the pull-request template honestly and attach redacted test evidence.
4. Update `CHANGELOG.md` under `[Unreleased]` for user-visible, security, data, deployment, or
   operational changes.
5. Identify environment-dependent configuration without pasting its value.
6. Request the required specialist review for prayer, security/privacy, database, accessibility, or
   content verification.

CI is a minimum gate. A green check does not prove that external MFA, Auth redirect URLs, backups,
DNS, hosting secrets, alert routing, or committee approvals are configured.

## Documentation and changelog

Documentation should distinguish verified implementation from required, environment-dependent, and
operational controls. Do not describe a dashboard option, backup, policy, contact, service, or
prayer arrangement as live until there is evidence.

`CHANGELOG.md` follows Keep a Changelog categories. Add concise entries under Added, Changed,
Deprecated, Removed, Fixed, or Security. Do not include secrets, private incident details, or
personal data.
