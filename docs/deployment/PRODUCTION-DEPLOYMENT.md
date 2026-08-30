# Production deployment

This is a runbook for a future credentialed deployment. No hosting project, Supabase project, email
sender, domain, backup, smoke check, or launch is complete merely because these instructions exist.

The initial target is Vercel plus separate Supabase staging and production projects. Keep a named
release owner, database operator, Auth/email owner, DNS owner, prayer approver, and rollback
decision-maker in the change record.

## Release principles

1. Preview/staging must not use production Supabase credentials or real personal data.
2. Database changes come from reviewed files under `supabase/migrations`; do not make remote schema
   changes in Table Editor/SQL Editor and leave them outside migration history.
3. Apply database migrations before releasing code that requires them, using backward-compatible
   expand/contract changes where possible.
4. A code rollback does not roll back Postgres, Auth users, Storage objects, email configuration,
   DNS, or secrets.
5. Do not publish prayer data, contact details, policies, services, or emergency instructions
   without the recorded Association approval.
6. Keep admin and privileged API responses private/no-store and protected environments
   non-indexable.

Supabase documents the migration workflow in its
[database migrations guide](https://supabase.com/docs/guides/deployment/database-migrations). Vercel
documents separate [environment variable scopes](https://vercel.com/docs/environment-variables),
[custom-domain setup](https://vercel.com/docs/domains/set-up-custom-domain), and
[instant rollback](https://vercel.com/docs/instant-rollback).

## Release-candidate evidence boundary

As of 15 July 2026, the following repository-controlled evidence exists:

- CI passed 132 Vitest tests in 17 files with 91.22% statement, 83.54% branch, 94.64% function and
  92.79% line coverage, including administrator lifecycle, content scheduling/expiry/revision
  restoration and fail-closed public projections;
- the locked install, formatting, production build, strict typecheck and zero-warning lint passed;
- the registry-backed dependency audit passed with zero findings across 568 dependencies after the
  vulnerable transitive PostCSS version was replaced by 8.5.17; and
- a disposable local Supabase stack replayed both migrations and the seed from zero twice, passed
  schema lint and all 91 database/RLS assertions after each reset, then passed Auth lifecycle and
  realistic logical backup/restore;
- clean authenticated product acceptance passed the public product plus TOTP, content, media,
  prayer, reviewer-denial, audit and sign-out dashboard workflows;
- the accelerated TV test passed 10/10 clock/network scenarios; and
- 30 Lighthouse runs against an external ephemeral HTTPS production preview met the application
  performance budgets, with the TV Best Practices score recorded at 92 because the intentionally
  unconfigured preview returned `/api/display` 503.

The detailed boundaries are recorded in the [QA report](../quality/QA-REPORT.md),
[database P1 validation](../quality/DATABASE-P1-VALIDATION.md) and
[operational workflow validation](../quality/OPERATIONAL-WORKFLOW-VALIDATION.md). The authoritative
[CI run](https://github.com/Feras01440/craigavon-masjid-website/actions/runs/29441499018) and
[CodeQL run](https://github.com/Feras01440/craigavon-masjid-website/actions/runs/29441498715) passed
at application commit `fd97cc64e1fe5d92247bf2035bad30748498581d`, establishing technical
release-candidate status. The completed browser selection passed all 370 applicable checks out of
385 selected, with 15 intentional local-demo or viewport-inapplicable skips. None of this local
evidence substitutes for fixed-origin permanent staging, real SMTP/TOTP, manual authenticated
accessibility review, production-provider backup/Storage recovery, physical-TV acceptance or
committee approval.

## Credential-dependent work remaining

The deployment owner must supply and record only the final real-world configuration:

1. approved prayer and Jumu'ah values;
2. approved contact information;
3. production domain and DNS;
4. production Supabase credentials and provider configuration;
5. production Vercel credentials;
6. production email credentials;
7. real committee administrator accounts;
8. approved policies and public content; and
9. committee sign-off.

Do not copy a credential into this repository, a pull request, a screenshot, or a committee
document.

## Environment topology

| Environment     | Web host                       | Supabase                 | Data                    | Auth/email                         |
| --------------- | ------------------------------ | ------------------------ | ----------------------- | ---------------------------------- |
| Local           | developer computer             | local CLI stack          | synthetic               | local mail catcher                 |
| Preview/staging | protected fixed staging origin | isolated staging project | synthetic/redacted only | staging sender/test recipients     |
| Production      | approved public origin         | production project       | approved live data      | production sender and named admins |

The code uses the literal `NEXT_PUBLIC_SITE_URL` for magic-link and invitation callbacks. It does
not automatically fall back to `NEXT_PUBLIC_VERCEL_URL`. Therefore use a fixed protected staging
domain for credentialed preview testing, or implement and review dynamic-origin support before
attempting per-branch Auth. Do not point arbitrary preview URLs at production Auth.

## Required runtime variables

Set these independently in Vercel's Preview/staging and Production scopes:

| Variable                               | Secret? | Requirement                                                            |
| -------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | No      | Exact `https://` origin for that environment, without a trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL`             | No      | Matching environment's Supabase API URL                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No      | Browser/Auth key; direct anonymous base-table reads remain denied      |
| `SUPABASE_SERVICE_ROLE_KEY`            | **Yes** | Server-mediated reads and privileged operations; never expose or log   |
| `NEXT_PUBLIC_INDEXING_ENABLED`         | No      | Set `true` only for the approved canonical production origin           |
| `NEXT_PUBLIC_IDENTITY_APPROVED`        | No      | Set `true` only after exact identity approval for Organization JSON-LD |
| `NEXT_PUBLIC_DEMO_MODE`                | No      | Must be `false`; local-only rows are excluded from public repositories |
| `ENQUIRY_TRUSTED_IP_HEADER`            | No      | Header the chosen edge overwrites with the real client address         |
| `ENQUIRY_FINGERPRINT_PEPPER`           | **Yes** | Random secret for non-reversible enquiry rate-limit fingerprints       |
| `CRON_SECRET`                          | **Yes** | At least 32 characters; authorises enquiry/fingerprint retention purge |

`NEXT_PUBLIC_ERROR_MONITORING_DSN` is reserved but has no active provider consumer. Do not add it
“just in case”. Supabase Auth email uses the project's approved SMTP settings; public enquiries use
the staffed private admin queue unless a separately reviewed notification integration is added.

After adding or changing a Vercel variable, create a new deployment. Existing builds do not acquire
new values retroactively.

Never invoke `seed_local_demo_data` in staging or production. The RPC is service-role-only and also
refuses any database that is not in the exact clean local-demo shape, but production deployment must
rely only on `supabase/seed.sql`, which publishes no content, contact details or prayer values.
Before promotion, confirm `NEXT_PUBLIC_DEMO_MODE=false` and query all three marked tables to verify
that no `demo_local_only=true` record is intended for launch.

## Prepare Supabase staging

1. Create the staging project in the approved organisation and region.
2. Record project ownership, plan, region, point-in-time/daily backup capability, log retention,
   budget alerts, and data classification.
3. Install Supabase CLI 2.101.0 to match CI.
4. Authenticate with a short-lived operator credential, then link to the staging project:

   ```powershell
   supabase login
   supabase link --project-ref <STAGING-PROJECT-REF>
   supabase migration list
   supabase db push --dry-run
   ```

5. Review the dry run and expected migrations through
   `20260715120000_complete_product_workflows.sql`.
6. Apply once, with one named operator:

   ```powershell
   supabase db push
   supabase migration list
   ```

7. Do not use `--include-seed` unless the draft-only seed records are explicitly wanted. No public
   content or prayer configuration is seeded.
8. Verify RLS is enabled, the anonymous role has no public-schema table grants, authenticated
   grants/policies match the role matrix, and the private `media` bucket has the migration's 10 MiB
   raster MIME restrictions.
9. Run the checked-in database/RLS suite and the administrator, Storage and server-mediated
   projection journeys against this credentialed staging project. The committed 91-assertion suite
   and repository unit tests are useful prior evidence after release CI, but do not establish
   Supabase PostgREST/Storage, SMTP/TOTP or fixed-origin Auth behaviour in this project.

Repeat the same controlled process for production only after staging evidence and release approval.
If migration history diverges, stop; inspect `supabase migration list` and resolve deliberately. Do
not run `migration repair` simply because the CLI suggests it.

## Configure Supabase Auth and email

For each environment, in Auth URL Configuration:

1. Set **Site URL** to the exact environment origin, for example
   `https://<approved-production-domain>`.
2. Add the exact callback `https://<origin>/admin/auth/callback` to allowed redirect URLs.
3. Keep public email sign-up disabled.
4. Confirm the application callback and allow-list use `/admin/auth/callback`; do not add wildcard
   preview origins.
5. Review magic-link and invite templates. Links must preserve the requested redirect/callback.
   Disable provider link tracking that rewrites single-use Auth links.
6. Configure organisation-approved custom SMTP. Supabase's default mail service is not suitable for
   unrestricted production delivery; see the
   [official SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).
7. Configure SPF, DKIM, and DMARC according to the selected sender and DNS provider. Use a confirmed
   From identity and reply route.
8. Test invite and subsequent magic-link delivery to approved test accounts, including expiry,
   one-time use, safe-link/prefetch behaviour, and non-enumerating UI responses.

Do not enable password or public registration as a workaround for email delivery.

## Configure Storage

The migration creates a **private** bucket named `media`. Public delivery is mediated by
`/media/[id]`, which requires published, non-deleted metadata and never exposes the service key, raw
object path, or original filename. Successful media responses are inline and `private, no-store`.

Before enabling uploads:

- verify the bucket limit and allowed MIME list match the migration;
- verify raw Storage access is denied to anonymous, reviewer, editor, and disabled identities, and
  that only the server-mediated route can deliver eligible published media;
- approve media ownership, copyright, consent, alt text, and deletion procedures;
- establish a separate protected object backup/export because database backups contain Storage
  metadata, not object bytes; and
- verify `/admin/media` re-encodes raster images, strips embedded metadata, checks references before
  archive, and cannot read or mutate media under an unauthorised role;
- keep PDF upload disabled until an approved malware scanning/quarantine control is implemented.

## Configure enquiry retention

Only after the privacy notice, retention period, queue owner and public form are approved:

1. Generate a random `CRON_SECRET` of at least 32 characters and store it only in the production
   host and approved scheduler.
2. Configure a daily **POST** to `/api/cron/retention` with `Authorization: Bearer <CRON_SECRET>`.
   Do not use a GET request for deletion.
3. In staging, create synthetic expired/current enquiries and active/stale rate-limit rows. Run the
   job and prove that only enquiries at or beyond `retention_until` and eligible inactive
   pseudonymous rows older than 48 hours are hard-deleted; metadata-only enquiry audit entries
   remain.
4. Alert on non-2xx responses and missed schedules. Logs may contain the two purge counts and
   timestamp, never enquiry bodies, names, contact details, fingerprints or the secret.
5. Review backup expiry separately; deleting production rows does not instantly remove older
   encrypted backups.
6. Trigger the enquiry limiter with synthetic requests and verify that it also removes eligible
   stale pseudonymous rows as defence in depth. This opportunistic path does not replace the
   scheduled authorised retention POST.

## Create the first super administrator

The normal invitation workflow requires an existing AAL2 super administrator. The initial account
therefore requires a tightly controlled bootstrap; later invitations use `/admin/users`.

1. Confirm the named person's identity and committee authorisation through a second channel.
2. In Supabase Auth, send an invitation to the approved lowercase organisation address. Do not let
   the recipient open it yet.
3. Copy the new Auth user UUID.
4. In the production SQL editor, run one reviewed **data-only** transaction, replacing every
   placeholder. The first user's UUID is used as the bootstrap inviter solely because
   `admin_invites.invited_by` must reference an Auth user:

   ```sql
   begin;

   insert into public.admin_profiles (
     id, display_name, role, status, mfa_required, invited_by
   ) values (
     '<AUTH-USER-UUID>',
     '<CONFIRMED-DISPLAY-NAME>',
     'super_admin',
     'invited',
     true,
     '<AUTH-USER-UUID>'
   );

   insert into public.admin_invites (
     email, role, invited_by, expires_at
   ) values (
     '<lowercase-approved-email>',
     'super_admin',
     '<AUTH-USER-UUID>',
     now() + interval '7 days'
   );

   commit;
   ```

5. Verify one profile and one pending invite exist, without exporting tokens or unrelated Auth data.
6. Have the recipient open the newest invitation or request a new link at `/admin/sign-in`. First
   acceptance activates the profile and marks the invite accepted.
7. Immediately enrol TOTP at `/admin/security`, confirm AAL2, sign out, and sign back in to test the
   normal path.
8. Provision a second named super administrator through `/admin/users` after testing the first
   account's AAL2 session. Never share one account.
9. Store the change record, approvers, timestamp, and redacted evidence. Do not keep the SQL with
   real UUID/email values in the repository.

If the recipient opens the email before the profile/invite transaction, the callback fails closed.
Complete the approved records, then request a fresh magic link. Do not set profiles active or
disable checks merely to make the first link succeed.

## Create the Vercel projects

1. Import the reviewed Git repository into the organisation's Vercel team.
2. Select Next.js; use the committed pnpm lockfile and Node 22.
3. Set install to `pnpm install --frozen-lockfile` and build to `pnpm build` if automatic detection
   does not already do so.
4. Configure Preview/staging and Production environment variables separately.
5. Enable deployment protection for staging/preview and keep `NEXT_PUBLIC_INDEXING_ENABLED=false`.
   Set it to `true` only on the approved canonical production deployment.
6. Protect the production branch and require the applicable CI checks. Inspect the E2E log for the
   exact phone, tablet, desktop and TV projects rather than assuming discovery/execution.
7. Keep auto-assignment of the production domain off until the staged production build passes
   release smoke checks, or use an equivalent controlled promotion workflow.

## Preview and staging acceptance

The automated prerequisites and their limitations are mapped in the
[database P1 validation](../quality/DATABASE-P1-VALIDATION.md) and
[operational workflow validation](../quality/OPERATIONAL-WORKFLOW-VALIDATION.md). Attach staging
evidence separately; do not relabel the credential-free local runs as staging results.

Use synthetic data and capture evidence for:

- all public routes at mobile and desktop widths;
- unavailable and approved prayer states plus `/api/prayer?days=1`;
- `/tv` at 1920×1080 and 3840×2160, including network loss and midnight simulation;
- sign-in, invalid/expired link, invite activation, disabled account, TOTP enrolment, and AAL2
  confirmation;
- direct anonymous base-table denial, server-mediated public projections, and role denial at both
  server and RLS layers;
- content draft, publish, expiry, emergency confirmation, concurrent edit conflict, archive, and
  revision restore;
- scheduled content before and after its exact effective/expiry instants;
- website-settings draft/publication controls, including the identity, contact, navigation/footer,
  TV, feature-flag and enquiry-configuration schemas;
- prayer full-horizon preview/publication, per-date overrides, immutable revision cloning, safe
  withdrawal to unavailable, and an atomic validated replacement;
- private `media` object access, `/media/[id]` publication mediation, raster transformation,
  reference-aware archive and fail-closed PDF rejection;
- public-enquiry fail-closed prerequisites, trusted-header fingerprinting, the private admin queue,
  authorised `POST /api/cron/retention` deletion with expired/current synthetic rows, and scheduled
  plus opportunistic cleanup of eligible inactive rate-limit fingerprints older than 48 hours;
- `/admin/audit` permission denial, entity filtering and metadata-only output;
- admin no-store/noindex headers; and
- browser console, hosting logs, accessibility, keyboard, zoom/reflow, and broken links.

The screenshot list is in [ADMIN-GUIDE.md](../../ADMIN-GUIDE.md). Capture only after staging
credentials work, using redacted/synthetic identities.

Do not approve media, enquiries, people/access or prayer-management from route presence alone;
exercise their Auth, RLS, AAL2, audit and failure paths with synthetic staging data.

## Production database and release order

1. Confirm the [launch checklist](../operations/LAUNCH-CHECKLIST.md) has named owners and attached
   evidence.
2. Freeze routine content changes for the release window.
3. Confirm a recent, restorable database backup and separate Storage object copy; record the
   recovery target and operator.
4. Record the current Vercel production deployment ID and Supabase migration list.
5. Link the CLI to production, run `supabase db push --dry-run`, review, then apply migrations once.
6. Verify migration history, RLS, bucket configuration, and critical queries before releasing code.
7. Build a staged production deployment using production variables without assigning the public
   domain.
8. Run the non-Auth smoke checks below against the deployment URL. Because Auth callbacks use the
   canonical `NEXT_PUBLIC_SITE_URL`, complete credentialed Auth testing on fixed staging and repeat
   it on the canonical production origin immediately after promotion.
9. Obtain the technical, content, prayer, privacy, and launch-owner approvals.
10. Promote/assign the production domain.
11. Repeat smoke checks on the canonical origin and monitor errors/auth delivery.
12. End the change freeze only after the observation period and handover note.

## Smoke checks

| Check                    | Expected production result                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `GET /`                  | `200`, approved identity/content only, CSP/security headers                                |
| `GET /api/health`        | `200` and `database: reachable`; body contains no credential or private record             |
| `GET /prayer-times`      | `200`; approved timetable or explicit unavailable state                                    |
| `GET /api/prayer?days=1` | `200` with `status: available`; `503` is a prayer launch blocker, not a fabricated success |
| `GET /api/display`       | `200` only when prayer and notice dependencies are available; otherwise explicit `503`     |
| `GET /tv`                | `200`, readable clock/status, no admin/private content                                     |
| `GET /admin/sign-in`     | `200`, `Cache-Control: private, no-store`, noindex header                                  |
| Auth email/link          | delivered through approved SMTP; callback returns to `/admin` for the test admin           |
| Admin mutation           | AAL1 refused; AAL2 approved for an authorised synthetic/controlled change                  |
| `GET /robots.txt`        | allow policy only when the indexing gate and canonical origin are approved                 |
| `GET /sitemap.xml`       | canonical entries only when the same indexing gate is enabled                              |

Also inspect Vercel function/build logs and Supabase Auth/Postgres logs without copying tokens or
personal data into the release record.

## Domain and TLS

After the domain is formally approved:

1. Add the exact apex and/or `www` domain to the Vercel project.
2. Use Vercel's current domain inspector to obtain the required A/CNAME/TXT values; do not copy
   generic DNS values from an old guide.
3. Preserve unrelated MX, SPF, DKIM, DMARC, and verification records when changing DNS or
   nameservers.
4. Choose one canonical host and configure the other to redirect to it.
5. Verify DNS ownership, certificate issuance, HTTPS, redirects, HSTS, and both IPv4/IPv6 behaviour
   where configured.
6. Change `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin and redeploy.
7. Change Supabase Auth Site URL and exact callback allow-list to the same origin.
8. Send a fresh magic link and repeat Auth smoke tests after the origin change.
9. Set the indexing and identity gates only after canonical metadata, robots, sitemap, social card
   and Organization JSON-LD pass validation on the final origin.

## Monitoring and alerting

The non-sensitive `/api/health` endpoint checks application configuration and database reachability;
it is not an alerting provider. Before launch, implement and privacy-review monitoring or establish
a documented hosting/Supabase log review and alert mechanism for:

- elevated 5xx and function failures;
- `/api/prayer` unavailable/invalid configuration;
- Auth delivery and callback failures;
- denied or unusual administrator activity;
- emergency/prayer/content mutations;
- database/storage usage, backup failures, and spending thresholds; and
- TV display check-in or a manual daily display check.

Do not introduce visitor tracking merely to obtain operational alerts.

## Rollback

### Code-only failure

Use Vercel Instant Rollback to the recorded last-known-good production deployment, then repeat smoke
checks. Vercel notes that an instant rollback restores an earlier build; it does not rebuild with
newly changed environment variables, and production auto-assignment may remain paused until a later
deployment is promoted.

### Migration or data failure

Stop writes and assess compatibility before rolling back code. Prefer a reviewed forward-fix
migration. Restore a database only under the
[backup and restore procedure](../security/BACKUP-AND-RESTORE.md), with a recovery point and owner;
restoration affects all newer data and still does not restore deleted Storage object bytes.

### Secret/configuration failure

Rotate or correct the value in the provider, redeploy, revoke the old value, and search
logs/builds/history for exposure. Rolling back code does not revoke a secret or revert
Supabase/DNS/SMTP configuration.

Record every rollback, affected deployment/migration, decision owner, verification result, and
follow-up in the incident/change record.
