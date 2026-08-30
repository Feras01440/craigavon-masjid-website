# Database, authorization, Auth, and recovery P1 validation

**Evidence date:** 15 July 2026

**Release branch:** `codex/production-platform-rebuild`

**Scope:** clean migration replay, deterministic seed, constraints, indexes, RLS and role
boundaries, publication/revision/audit workflows, local Supabase Auth lifecycle, and logical
recovery

## Decision

**PASS.** The authoritative
[`Local Supabase migration lint` job](https://github.com/Feras01440/craigavon-masjid-website/actions/runs/29441499018)
at application commit `fd97cc64e1fe5d92247bf2035bad30748498581d` started a complete disposable
Supabase stack, performed two clean resets, passed schema lint, passed all 91 pgTAP assertions after
each reset, exercised the real local Auth API, and restored a logical dump into a separate newly
migrated database. The earlier PostgreSQL 17.10 compatibility baseline remains useful historical
evidence but is not the authoritative result.

## Executed evidence

The authoritative CI record contains:

```text
Migration 20260713213000_initial_platform.sql applied.
Migration 20260715120000_complete_product_workflows.sql applied.
Seed supabase/seed.sql applied.
First clean replay: Files=1, Tests=91, Result: PASS.
Second clean replay: Files=1, Tests=91, Result: PASS.
Local Supabase Auth lifecycle passed: signup denied; invite accepted and one-time; disable revoked
refresh; recovery changed the password and enabled sign-in; global sign-out revoked all refresh
sessions; revoked invite denied.
Backup/restore rehearsal passed in isolated database mac_recovery_probe.
```

The restore verification returned:

```json
{
  "database": "mac_recovery_probe",
  "enquiries": 1,
  "audit_rows": 13,
  "prayer_rows": 1,
  "content_rows": 1,
  "seed_settings": 2,
  "admin_profiles": 2,
  "pending_invites": 1,
  "prayer_revisions": 1,
  "content_revisions": 1
}
```

### Historical portable baseline

The workstation did not have Docker, WSL, PostgreSQL, `psql`, or the Supabase CLI. A temporary,
isolated PostgreSQL 17.10 cluster was therefore initialized on loopback port 55432. A minimal
Supabase compatibility bootstrap supplied only the `auth.uid()`, `auth.jwt()`, Auth user, Storage
metadata, and database-role surfaces needed to load the production migration. The cluster started
from an empty `template0` database on every execution.

Execution result:

```text
PostgreSQL 17.10 clean migration, seed, and all 84 P1 policy assertions passed twice.
Recovery fixture cleanup retained both seed rows and left zero fixture, revision, or prayer-child rows.
```

The compatibility baseline executed the then-current production files. Release CI now executes:

- `supabase/migrations/20260713213000_initial_platform.sql`;
- `supabase/migrations/20260715120000_complete_product_workflows.sql`;
- `supabase/seed.sql`; and
- `supabase/tests/database_p1_release_gates.sql`.

The test file plans 91 assertions, including the original role/RLS/publication controls plus
read-only reviewer coverage, local-demo column/function ownership and denial boundaries. The
transaction rolls back all synthetic identities and records.

Repository hygiene checks also passed:

```text
bash -n scripts/database/verify-local-auth.sh
bash -n scripts/database/verify-backup-restore.sh
bash -n scripts/database/start-local-supabase.sh
git diff --check -- .github/workflows/ci.yml supabase/tests scripts/database
```

## Clean replay and seed determinism

The CI job performs this sequence against a newly created local Supabase stack:

```text
supabase start
supabase db reset
supabase db lint --local --level warning --fail-on warning
supabase test db
supabase db reset
supabase test db
```

Both test executions require exactly two `site_settings` rows, both `draft`; no content, prayer
configuration, or enquiry rows; and `public_enquiries=false`. The second reset and identical test
result are the seed-determinism gate. Any non-idempotent migration, unexpected seed row, public
seed, constraint warning, or policy regression fails the job.

## Role and RLS evidence

Synthetic users are created for an authenticated non-administrator, website editor, prayer editor,
enquiries manager, read-only reviewer, super administrator, and invited reviewer. Every application
table is checked for RLS enablement, and the exact 23-policy inventory is asserted. Populated rows
exercise every application read policy across settings, content and revisions, media and usage,
prayer settings and revisions, Friday sessions, overrides, seasonal arrangements, enquiries,
redirects, invitations, profiles, and audit. The complete 13-permission set is compared with the
exact expected array for each requested active role.

| Identity                      | Positive evidence                                                                                                                                                 | Negative evidence                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous                     | None; application public reads remain server-mediated                                                                                                             | No table reads for content, enquiries, profiles, or audit; no permission/editorial RPC execution                                                      |
| Authenticated without profile | Auth identity exists                                                                                                                                              | No role, permission, settings, profile, enquiry, audit, or content-write access                                                                       |
| Website editor                | Reads/writes/publishes content and redirects; reads settings, media/usage, prayer/revisions/children, and audit                                                   | Cannot read/update enquiries, invite users, alter prayer settings, hard-delete redirects, or write at AAL1                                            |
| Prayer editor                 | Reads settings, content/revisions, prayer/revisions/children, redirects, and audit; creates prayer drafts and publishes through the server-only trusted-actor RPC | Cannot write content, enquiries, or redirects; cannot read media; website editor identity is rejected by the prayer publication RPC; AAL1 is rejected |
| Enquiries manager             | Reads settings, content/revisions, redirects, and private enquiries; updates and deletes enquiries at AAL2                                                        | Cannot read audit, media, or prayer rows; cannot write content/prayer/redirects or alter an enquiry at AAL1                                           |
| Read-only reviewer            | Reads reviewable settings, content/revisions, prayer/revisions/children, redirects and audit without mutation controls                                            | Cannot create, update, publish, archive or delete content/prayer/enquiry/admin data                                                                   |
| Super administrator           | Full permission array; directory/invitation lifecycle; complete populated-domain RLS reads                                                                        | Still cannot mutate the append-only audit table or hard-delete invitations/redirects; AAL1 invitation is rejected                                     |
| Disabled website editor       | Can identify only its own disabled profile for fail-closed handling                                                                                               | `current_admin_role()` becomes null immediately; every permission, other protected read, and write is denied                                          |

The tests also prove that enquiry audit snapshots exclude names, email addresses, phone numbers,
message bodies, and source fingerprints.

## Constraints and indexes

The suite checks all 16 application tables for RLS and verifies the principal content-publication,
prayer-range, enquiry-queue/retention, and audit indexes. It executes representative failures for:

- invalid content slugs;
- enquiries with no contact route;
- disabled profiles with no disable timestamp; and
- meaningful media with no alternative text.

The migration's other constraint definitions continue to be covered by schema lint and the workflow
assertions that create bounded prayer periods, unique content, valid Friday sessions, valid
invitations, scheduled content, and accepted enquiry transitions.

## Publication, revision, expiry, and audit evidence

The database test performs a real content lifecycle through RLS:

1. AAL1 write is rejected and AAL2 draft creation succeeds with the actor recorded.
2. Scheduling produces an immutable revision.
3. The public projection excludes the item before `publish_at`, then includes it after the real wall
   clock crosses that instant.
4. Immediate publication is eligible while in window.
5. An expired item is excluded.
6. Revision 1 is restored through the same snapshot fields used by the application, producing a new
   private draft, a new version, cleared publication metadata, and complete prior revisions.
7. Audit events exist for the lifecycle and cannot be inserted, updated, or deleted by any
   authenticated application role, including super administrator.

The prayer workflow creates a bounded draft plus Friday session, proves that Auth clients cannot
call the server-only publish RPC, rejects a website editor supplied as the trusted actor, publishes
for the prayer editor with approval metadata, and rejects mutation of the published timetable.

## Local Supabase Auth lifecycle

`scripts/database/verify-local-auth.sh` talks only to the disposable local Auth API. Generated local
keys stay in process memory and shell tracing is never enabled. It proves:

- public signup is disabled;
- an administrator-generated invitation can be accepted once and cannot be reused;
- a long administrator ban prevents the existing refresh session from being renewed;
- controlled re-enable plus provider recovery succeeds once and cannot be reused;
- the fresh recovery session changes the password and that recovered password establishes a normal
  session;
- a standalone global sign-out revokes two independently established password-session refresh
  tokens, while a subsequent password sign-in proves that revocation did not disable the account;
- deleting the unused Auth identity for a revoked invite makes its invitation unusable.

Expected denials accept only Auth HTTP statuses 400, 401, 403, or 422 and must include a structured
Auth error field. A missing route, method mismatch, rate-limit response, proxy failure, empty body,
or unrelated success therefore cannot satisfy a negative lifecycle assertion.

Supabase Auth access JWTs are stateless and can remain cryptographically valid until their short
expiry after global logout or ban. Global logout is therefore proven through rejection of every
captured refresh session, while disabling is also proven through the database profile. The
application checks that current profile on every protected request, and the RLS test above proves
that a disabled identity immediately loses its role and database capabilities even if an old access
JWT has not yet expired.

Clean local product acceptance passed with TOTP enrollment and authenticated administrator and
reviewer journeys. Production email deliverability, safe-link/prefetch behavior, SMTP configuration
and named administrator identities use the final email credentials and committee accounts.

## Backup and restore rehearsal

`scripts/database/verify-backup-restore.sh` runs inside the disposable Supabase database container:

1. insert realistic synthetic administrator/invite, published setting, published content and
   revision, approved prayer timetable and revision, Friday session, private enquiry, and audit
   records;
2. create a non-empty custom-format `pg_dump` of the application tables and validate its archive
   catalogue;
3. create a separate database from `template0`;
4. bootstrap only the Auth/Storage dependencies, replay the production migration from zero, and
   restore the dump with triggers disabled during the controlled load;
5. verify exact values, relationships, revisions, private enquiry state, privacy-safe audit data,
   indexes, and a live constraint rejection; and
6. explicitly remove revision and prayer-child fixtures while triggers are suppressed, then delete
   all other temporary rows, archive files, and the recovery database through an exit trap.

The PostgreSQL 17.10 compatibility run also executed the fixture and cleanup scripts directly. The
post-cleanup evidence contained both original seed settings and zero matching Auth users, profiles,
invites, content, content revisions, prayer settings, prayer revisions, Friday sessions, overrides,
seasonal arrangements, enquiries, and audit rows.

This is a real logical application-data recovery rehearsal, not proof of a provider backup. It does
not restore Storage object bytes, Auth settings/identities/sessions beyond the synthetic FK stubs,
SMTP, secrets, Edge Functions, DNS, hosting configuration, or Supabase-managed PITR. Those require
credentials, an approved provider plan, an independent object backup, and the full procedure in
`docs/security/BACKUP-AND-RESTORE.md`.

## Retained release evidence

The linked GitHub Actions job and complete logs retain:

- both `supabase db reset` and `supabase test db` executions passing;
- database lint at warning level passing;
- the local Auth lifecycle success line; and
- the recovery verification JSON with seed, profile, invite, content/revision, prayer/revision,
  enquiry, and audit counts.

No database dump, local API key, JWT, recovery token, enquiry body, or temporary Auth response is
uploaded as an artifact.
