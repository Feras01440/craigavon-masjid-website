# ADR-001: Production platform architecture

- **Status:** Accepted
- **Decision date:** 2026-07-13
- **Scope:** Public website, prayer display, committee administration, content data, media,
  authentication, testing, and deployment

## Context

The inherited application is a browser-only static site made from duplicated HTML, global JavaScript
files, and committee-edited `content/*.js` files. It demonstrates the intended information
architecture and visual direction, but it is not an acceptable production platform for the rebuild.

The static model is rejected because:

- identity, contact, navigation, footer, and prayer-policy text are repeated across pages, so
  changing the documented configuration does not update the whole site;
- non-technical editors must change executable JavaScript and redeploy the entire folder, with no
  schema validation, preview workflow, permissions, audit trail, or rollback at the content-record
  level;
- the public site has no authenticated administration, durable relational data model, database
  authorization, or managed media workflow;
- critical content is assembled only in the browser, weakening no-JavaScript rendering, search
  visibility, deterministic testing, and failure recovery;
- production security headers conflict with inline styles, while long-lived immutable asset caching
  has no filename versioning;
- there is no dependency manifest, type checking, migration history, automated test suite, CI
  quality gate, or reproducible browser verification; and
- a static folder cannot safely grow into role-based committee workflows, scheduled publishing,
  media management, audit history, and reliable multi-user updates without recreating a backend
  piecemeal.

The replacement must remain fast and welcoming as a public information site while adding a secure,
maintainable operational platform for the committee.

## Decision

Build one full-stack web application with:

- **Next.js 16.2.10**, pinned to the current stable patch, using the **App Router**;
- **strict TypeScript** throughout application and test code;
- **Supabase Postgres, Auth, and Storage**;
- reviewed, repository-owned **SQL migrations** and generated database types;
- **Row Level Security (RLS)** on every table or view exposed through the Data API and on Storage
  objects;
- **Zod** at environment, form, request, content, and external-data boundaries;
- **Vitest** for unit and integration tests and **Playwright** for browser, accessibility, and
  critical journey tests; and
- a **Vercel-compatible deployment**, targeting Vercel initially without placing domain logic in
  Vercel-only APIs.

Node.js **20.9 or newer** is required locally and in CI/deployment. Production and CI must use the
same pinned major runtime.

### Official platform evidence

This decision uses current supported capabilities rather than assumed roadmap features:

- The official [Next.js 16.2 release notes](https://nextjs.org/blog/next-16-2) identify 16.2 as a
  stable release; the authoritative npm registry marks
  [`next@16.2.10` as the `latest` tag](https://www.npmjs.com/package/next?activeTab=versions) on the
  decision date.
- The Next.js [installation requirements](https://nextjs.org/docs/app/getting-started/installation)
  specify Node.js 20.9 as the minimum and recommend TypeScript and the App Router.
- Next.js documents full-featured
  [Node deployment and portable deployment options](https://nextjs.org/docs/app/getting-started/deploying),
  which keeps the application Vercel-compatible without making Vercel the only possible host.
- Supabase documents cookie-based
  [server-side authentication for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
  using `@supabase/ssr`, separate browser/server clients, and `proxy.ts` token refresh.
- Supabase requires
  [RLS on exposed schemas](https://supabase.com/docs/guides/database/postgres/row-level-security)
  and integrates policies with Auth claims.
- Supabase supports
  [MFA enrollment and authorization enforcement](https://supabase.com/docs/guides/auth/auth-mfa),
  including database policies based on authenticator assurance level.
- Supabase Storage uses
  [RLS policies on `storage.objects`](https://supabase.com/docs/guides/storage/security/access-control);
  uploads are denied by default until policies allow them.

## Runtime architecture and boundaries

### Server by default

App Router pages, layouts, metadata, public content reads, and authenticated administration screens
are Server Components by default. They render meaningful semantic HTML before client JavaScript
runs.

Server Actions or Route Handlers own mutations and other trust-sensitive operations. Every mutation
must:

1. verify the Supabase identity from validated claims, never from client-provided role data;
2. parse the input with Zod;
3. execute with the user's scoped Supabase session where possible, or use a narrowly scoped
   service-only operation after authenticating the actor and propagating that trusted actor into the
   database permission/AAL2 boundary;
4. return a typed, non-sensitive result; and
5. invalidate only the affected cached public data.

Server-only modules contain privileged environment access, database administration utilities,
mail/provider integrations, and any secret key. They must use `server-only` guards and may not be
imported by Client Components.

### Small client islands

`"use client"` is restricted to leaf components that require browser state or events, including:

- the mobile navigation;
- live clock and next-prayer countdown;
- timetable month controls and print interaction;
- form interaction and progressive status messages;
- the resilient full-screen prayer display; and
- narrowly justified realtime subscriptions.

Initial prayer schedules and public content are server-rendered. Prayer calculation is a pure,
timezone-explicit TypeScript domain module shared by server rendering and the client countdown; the
browser does not define policy or silently invent committee settings.

The browser may receive the Supabase URL and publishable key. It must never receive a secret/service
key. The current implementation gives `anon` no application-table access; all public data reads are
server-mediated. Any future direct browser data feature requires a separate reviewed grant/RLS
change and denial tests.

### Supabase clients and sessions

- `lib/supabase/server.ts` creates request-scoped cookie-aware clients for Server Components,
  Actions, and Route Handlers.
- `lib/supabase/client.ts` creates the publishable browser client only for approved Client
  Components.
- `proxy.ts` refreshes auth tokens following the current Supabase SSR guidance.
- Server authorization uses verified claims (`getClaims`) or a fresh user lookup when required; it
  does not trust the user object returned from an unvalidated session.
- Authenticated responses and admin routes are dynamic/private and must never enter a shared public
  cache.

## Data ownership and migrations

Postgres is the source of truth for structured operational content. The initial model should cover:

- site identity and contact settings;
- calculation and congregation settings with effective dates;
- announcements with publish/expiry windows and priority;
- events and recurring activities;
- committee profiles and role assignments;
- media metadata; and
- immutable audit entries for privileged changes.

Schema changes, constraints, indexes, database functions, grants, and RLS policies live together in
ordered files under `supabase/migrations/`. Dashboard-only schema edits are prohibited. A clean
`supabase db reset` must reproduce the local database, and generated TypeScript database types are
refreshed and checked after each schema change.

Zod schemas provide application-boundary validation and user-facing errors; Postgres constraints
remain the final integrity boundary. Neither replaces the other.

Storage currently holds transformed raster media in one private `media` bucket. Generated brand
assets remain versioned with the application. Uploads are server-mediated, bounded to 10 MiB,
restricted to JPEG, PNG, WebP and AVIF, re-encoded without embedded metadata, and delivered only
through `/media/[id]` with a neutral filename and no-store headers. PDF upload remains disabled
until an approved malware scanning/quarantine path exists.

## Security model

- RLS is enabled in the migration for every application table. CI replays and lints the migration;
  the complete grant/RLS role matrix still requires credentialed integration evidence.
- The anonymous role has no public-schema table or sequence grants. Public repositories use a
  server-only service client and project only eligible published fields within their publication
  windows; browsers do not query application tables directly.
- Committee permissions are least-privilege roles such as viewer, editor, and administrator; UI
  hiding is never treated as authorization.
- Privileged committee actions require MFA at assurance level `aal2`, enforced both at the server
  boundary and with restrictive database policies where applicable.
- User-scoped sessions are preferred for normal administration. A Supabase service credential is
  confined to server or migration infrastructure and is used for mediated public reads, Storage,
  enquiry/rate-limit/retention operations, Auth administration, and service-only prayer/settings
  RPCs. Those privileged mutations receive a trusted authenticated actor and re-check permission and
  AAL2 in the database.
- Secrets are stored in deployment environment settings, not source control. Only the Supabase URL
  and publishable key use `NEXT_PUBLIC_` names.
- Mutations use same-origin protections, validated inputs, bounded payloads, rate limits where abuse
  is plausible, and safe error messages. Security headers and CSP are generated and tested as part
  of the application configuration; inline style/script exceptions are not the default.
- Logs exclude tokens, cookies, sensitive personal data, and secret-bearing provider responses.
  Administrative changes retain actor, action, target, and timestamp in the audit trail.
- Dependency updates are automated but merged only after typecheck, unit, build, policy, and browser
  gates pass.

## Accessibility and user experience

WCAG 2.2 AA is a release requirement, not a final visual check. Server-rendered landmarks, headings,
link purpose, table semantics, form labels/errors, keyboard operation, visible focus, reduced
motion, contrast, language changes, and live-region restraint are component acceptance criteria.

Public information and the day's initial prayer schedule remain usable without hydration. Client
enhancement must not replace accessible server content with a blank loading shell. Committed
Playwright journeys cover public routes, keyboard/preferences, no-environment failure states,
automated accessibility and TV behaviour across configured projects. Credentialed admin/Auth/RLS
journeys and manual screen-reader/zoom checks remain launch evidence requirements.

## Offline, outage, and missing-credential behavior

### Public and prayer-display resilience

- No service worker is implemented. `/tv` stores only a fully available `/api/display` payload in
  browser `localStorage`, continues its clock, and marks retained data as potentially stale during a
  network or data failure.
- Notice expiry is re-evaluated against the TV device clock while using a retained payload. A notice
  corrected or withdrawn after the last successful download cannot reach an offline device, so the
  displayed dataset timestamp and operator checks remain essential.
- Authenticated/admin pages, session-bearing responses, and private Storage objects are never placed
  in a shared or service-worker cache.
- Offline administrative writes are disabled and fail clearly; the application does not queue
  privileged mutations for silent replay.

### Supabase outage

Public site chrome has conservative checked-in identity/navigation defaults, but contact, public
content and prayer data do not invent operational facts when Supabase is absent. Prayer and display
endpoints return explicit unavailable states (the display endpoint uses `503` when its full payload
is unavailable), while `/api/health` reports dependency reachability without exposing secrets. Admin
reads/writes fail closed; no mutation is reported as successful before database confirmation.

### Missing credentials

Supabase and site-origin variables are parsed with Zod when a dependent server boundary is used.

- **Production:** a release must not proceed with missing or malformed credentials. At runtime the
  implemented boundaries fail closed: operational public data is unavailable, `/api/health` returns
  `503`, admin setup is unavailable, and no mock data is substituted.
- **Local development and tests:** developers use local Supabase by default. The committed no-env
  browser journey verifies calm read-only failure states; there is no offline-fixture mutation mode.
- **Preview deployments:** previews receive isolated preview credentials or remain in those explicit
  unavailable states; they never inherit production secrets implicitly.

## Verification and delivery

Required CI gates are:

1. formatting and linting;
2. strict TypeScript typecheck;
3. Vitest unit tests for prayer/timezone logic, Zod schemas, permissions, publication windows, and
   fallback behavior;
4. local-Supabase migration replay/lint plus credentialed staging tests for constraints, direct
   anonymous denial, RLS role matrices, MFA restrictions, service-only RPCs and private Storage;
5. a production `next build` on Node 20.9 or newer;
6. committed Playwright journeys for public navigation, prayer times, no-JavaScript rendering,
   keyboard/accessibility, TV and error states, with credentialed login/MFA, role, publication and
   media journeys required in protected staging;
7. accessibility and broken-link checks against the built application.

Vercel is the initial deployment target because it directly supports the chosen Next.js runtime,
preview deployments, environment separation, and CDN behavior. The app must retain standard
`build`/`start` scripts, SQL migrations, and provider-neutral domain/data adapters so a
Node-compatible host can replace Vercel without a rewrite.

## Trade-offs and consequences

| Concern         | Benefit                                                                                                                                                                       | Cost / mitigation                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Security        | SSR identity verification, no anonymous base-table/object grants, authenticated RLS and server-mediated projections provide defense in depth; MFA protects committee actions. | Service credentials bypass RLS, so they remain server-only and privileged mutations re-establish the trusted actor/permission boundary.        |
| Accessibility   | Server-first rendering avoids empty client shells and supports progressive enhancement.                                                                                       | Interactive components need both server and hydrated states; Playwright and manual review cover both.                                          |
| Maintainability | One typed component system, one relational source of truth, validated boundaries, and reproducible migrations remove HTML/config drift.                                       | Next.js and Supabase add dependency/upgrading work; versions are pinned and upgrades pass the complete gate.                                   |
| Performance     | Server Components, selective hydration, caching, and optimized assets keep public pages fast.                                                                                 | Personalized data must bypass shared caches; cache rules are explicit and tested.                                                              |
| Resilience      | Checked-in essentials, last-known public cache, and an offline prayer display preserve core service during outages.                                                           | Cached data can be stale, so timestamps, expiry enforcement, and read-only degradation are mandatory.                                          |
| Cost            | Vercel and Supabase managed services avoid initial server administration and can start on low-cost tiers.                                                                     | Usage, bandwidth, Storage, backups, email/SMS MFA, and preview environments can increase spend; set budgets/alerts and review usage quarterly. |
| Portability     | Standard Next.js Node deployment and plain Postgres SQL keep an exit path.                                                                                                    | Auth/Storage APIs and RLS helpers still create Supabase coupling; isolate them behind small adapters and retain migration/data exports.        |

## Alternatives considered

### Keep and harden the inherited static site

Rejected. It has the lowest hosting cost and smallest runtime attack surface, but it cannot meet
secure multi-user administration, structured validation, auditability, media workflow, or
single-source content requirements without accumulating an ad hoc backend. Its present duplication,
JavaScript-only content, CSP conflict, and absence of tests already show the maintenance ceiling.

### WordPress or another plugin-based CMS

Rejected. It offers familiar editing and a broad ecosystem, but introduces a larger
patch/plugin/theme attack surface, more operational maintenance, weaker type-safe application
boundaries, and less direct control over prayer-specific workflows and authorization.

### Hosted headless CMS plus a static frontend

Rejected as the primary platform. Editorial tooling is attractive, but the project would still need
separate authentication, structured operational data, role enforcement, media authorization, and
prayer settings. This increases vendors and duplicates permission models. A specialist editorial
service can be reconsidered only if future publishing needs exceed the Supabase-backed admin.

### Astro or another content-first framework

Considered. It could deliver an excellent low-JavaScript public site, but the authenticated
committee application, SSR session lifecycle, mutations, and shared interactive prayer display
reduce its advantage. Next.js has stronger direct alignment with the selected SSR Auth guidance and
deployment target.

### Firebase

Rejected. It supplies managed auth/data/storage, but the relational content model, SQL migrations,
constraints, and Postgres RLS are a better fit for effective-dated prayer settings, publishing,
roles, and audit queries.

### Self-hosted Postgres, identity, object storage, and Next.js

Deferred. It offers maximum control and may reduce provider coupling, but requires database
upgrades, backups, monitoring, incident response, mail/auth operations, storage security, and high
availability that the volunteer organization should not own at launch. The SQL-first design
preserves a future migration path if scale, residency, or cost later justifies it.

## Follow-up decisions

ADR-002 records the prayer publication/withdrawal boundary. Future ADRs should capture material
changes to the content model, committee role/RLS matrix, deployment topology, or TV caching design.
No service worker is currently planned or implemented.
