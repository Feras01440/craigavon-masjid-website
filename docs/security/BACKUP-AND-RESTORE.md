# Backup and Restore Plan

## Purpose and status

This plan covers recovery of the intended Next.js/Supabase production service. It is not proof that
backups exist. Provider plan, retention, Point-in-Time Recovery (PITR), export jobs, encryption,
Storage-object copies, and restore credentials are environment-dependent controls and must be
evidenced before launch.

The Association must never rely on a single provider account, a single committee member, or a
database-only backup.

## Automated release-candidate rehearsal

The repository's `scripts/database/verify-backup-restore.sh` implements a credential-free logical
recovery rehearsal inside the disposable local Supabase stack in CI. It creates realistic synthetic
administrator/invitation, content/revision, prayer/revision, enquiry, setting, and audit data;
creates and validates a custom-format `pg_dump`; replays the production migration into a separate
`template0` database; restores the selected application tables; verifies exact relationships,
privacy-safe audit snapshots, indexes, and constraints; and then destroys the temporary copy.

The authoritative test command is owned by the `Local Supabase migration lint` GitHub Actions job.
Its release-commit result is still pending; the workstation's clean PostgreSQL replay is not a
substitute for this full-stack run. Detailed assertions and evidence boundaries are recorded in
[`DATABASE-P1-VALIDATION.md`](../quality/DATABASE-P1-VALIDATION.md).

When that job is green, it proves migration-backed logical recovery of representative application
data within the disposable stack. It is not a provider backup, PITR test, Storage-object restore,
Auth/configuration restore, or production RPO/RTO measurement. Those remain part of the credentialed
quarterly drill below.

## Recovery objectives

These are service targets to approve and fund, not claims about the current environment:

| Service/data                                        |            Target RPO | Target RTO | Required recovery path                                                                                                  |
| --------------------------------------------------- | --------------------: | ---------: | ----------------------------------------------------------------------------------------------------------------------- |
| Published prayer timetable and emergency notices    |            15 minutes |    2 hours | Immutable published revisions, last-known-good public snapshot, database PITR or equivalent, offline approved timetable |
| Prayer drafts, approvals, roles, and audit events   |                1 hour |    4 hours | Database PITR or frequent tested logical export                                                                         |
| Enquiries and workflow metadata                     |      24 hours maximum |    8 hours | Managed database backup plus protected logical export appropriate to approved risk                                      |
| Public structured content and events                |              24 hours |    8 hours | Database backup plus source-controlled seed/export where appropriate                                                    |
| Storage media objects                               |              24 hours |   24 hours | Independent versioned object backup; database backup is insufficient                                                    |
| Source, migrations, lockfile, and deployment config | Every accepted commit |    2 hours | Protected Git remote plus independent repository mirror/export                                                          |
| Provider configuration and secret inventory         |    After every change |    4 hours | Encrypted configuration record and recovery runbook; secret values restored from secret manager, not Git                |

If the selected Supabase plan and backup design cannot meet an approved RPO/RTO, either upgrade the
design or explicitly revise the target through a documented risk decision before launch.

## What must be backed up

### 1. Postgres

Include application schemas and data, migrations, RLS policies, grants, functions, triggers,
extensions, Auth-linked profile/role records, prayer revisions, audit events, content, enquiries,
and Storage metadata.

Use both:

- provider-managed daily backup or PITR suitable for the approved RPO; and
- periodic logical exports for independent recovery and portability.

Keep migration source as the preferred schema history. A database dump is not a substitute for
reviewed migrations, and migrations alone are not a backup of production data.

### 2. Supabase Storage object bytes

Supabase database backups include Storage metadata, not the actual object bytes. Independently copy
the current private `media` bucket, and any later approved bucket, to encrypted, versioned object
storage in a separate failure domain or through an approved provider export process.

The object backup manifest must record bucket, object key, size, content hash, content type, object
generation/version where available, and backup UTC time. Protect media objects at least as strongly
as the production private bucket; enquiry bodies are database records, not Storage objects in the
current implementation.

### 3. Auth and platform configuration

Record, without placing secret values in Git:

- project region, plan, backup/PITR retention, project owners, and support route;
- Auth Site URL, exact redirect allowlist, public-signup state, password/OTP/invite settings, MFA
  policy, email templates, SMTP configuration reference, and identity providers;
- API key identifiers and rotation dates, database/pool settings, network restrictions, and custom
  domains;
- Storage buckets, privacy state, size/type limits, policies, transformations, and lifecycle rules;
- extensions, scheduled jobs, webhooks, Realtime settings, Edge Functions if used, and log
  retention;
- hosting environment-variable names and references, domains, DNS records, cache/security settings,
  monitoring, and rate-limit configuration.

Secret values belong in the approved secret/recovery store. The inventory records owner, purpose,
environment, last rotation, and recovery location, never the plaintext secret.

### 4. Source and releases

Protect the Git repository, all migration files, generated database types, dependency lockfile,
build configuration, deployment manifest, media-processing rules, prayer fixtures, and release
identifiers. Maintain an independent mirror or encrypted export so compromise or deletion of one
GitHub organisation is recoverable.

### 5. Operational records

Protect the private incident contact sheet, backup ownership, restoration credentials/recovery
codes, approved prayer source and committee confirmation records, supplier contacts, and recent
restore-drill reports. Keep personal data to the minimum required.

## Backup schedule and retention

The final schedule depends on the approved provider plan. At minimum:

- continuously or frequently enough to meet the prayer/audit RPO: provider PITR or an approved
  equivalent;
- daily: verify provider backup/PITR freshness and run/verify Storage-object replication;
- weekly: encrypted logical database export and configuration snapshot to an independent
  account/failure domain;
- on every production release: source/release provenance, migration state, environment-variable
  inventory, and pre-migration restore point;
- monthly: repository mirror verification and a sampled object/hash reconciliation;
- quarterly: full isolated database-and-Storage restore drill;
- before destructive migration, bulk edit, key rotation, provider-plan change, or project transfer:
  fresh recovery point and verified owner access.

Retention must cover accidental deletion discovered late while respecting approved enquiry/media
deletion periods. Deletion from production must eventually propagate to backups according to the
retention policy; document legal holds separately. Do not keep indefinite enquiry dumps “just in
case.”

## Backup security

- Use a separate provider account/project or independent storage failure domain; production
  compromise must not automatically delete recovery copies.
- Require MFA and at least two named Association-controlled recovery owners. Do not share a
  committee login.
- Encrypt exports in transit and at rest. Hold decryption keys separately from the backup data and
  test recovery access.
- Grant backup systems read-only access where possible; production application runtime must not have
  delete access to independent backups.
- Block public links and indexing. Log backup creation, download, restore, retention change, and
  deletion where supported.
- Never place dumps, object copies, personal data, secrets, or recovery codes in Git, CI artefacts
  with broad access, developer Downloads folders, or ordinary shared drives.
- Scan backup automation and logs so connection strings and tokens are not printed.
- Verify completion, size, age, and integrity automatically. A green scheduled job without a
  restorable artefact is not a backup.

## Pre-restore decision checklist

The Incident Lead and Technical Lead must record:

1. incident/change ID and reason for restore;
2. affected data, tables, buckets, release, and environments;
3. earliest known bad UTC time and latest known good UTC time;
4. selected database recovery point and expected data loss against RPO;
5. corresponding Storage-object recovery point and manifest;
6. whether compromised identities, secrets, migrations, or application code would be restored;
7. legal/privacy or evidence-preservation constraints;
8. who approves the restore and who independently verifies prayer integrity;
9. public/TV fallback and expected downtime;
10. rollback plan if the restore validation fails.

Prefer restoring to a new isolated Supabase project. An in-place production restore is acceptable
only when provider limitations and urgency justify it and the decision is recorded. Supabase may
make the project unavailable during a restore; plan communications and the last-known-good prayer
view first.

## Full restore procedure

### Phase A: Establish a clean recovery environment

1. Freeze production writes and automatic deployments as narrowly as possible.
2. Create or select an Association-owned isolated recovery/staging Supabase project in the approved
   region and plan.
3. Restrict access to the recovery team. Do not connect public DNS, production email, webhooks, or
   scheduled outbound jobs.
4. Prepare a reviewed application release from a known-good commit and lockfile in a clean build
   environment.
5. Create a recovery log with UTC timestamps. Do not paste credentials or enquiry bodies into it.

### Phase B: Restore Postgres

1. Restore the selected provider backup/PITR point or verified logical export according to current
   Supabase guidance.
2. Confirm the database is accepting connections and record the restored transaction/migration
   state.
3. Reset custom-role passwords or credentials that the backup mechanism does not preserve.
4. Compare restored schema and migration table with the known-good source. Apply only reviewed,
   necessary forward migrations; never improvise SQL in the Dashboard.
5. Verify extensions, functions, fixed `search_path` on security-definer functions, grants, RLS
   enablement, policies, triggers, indexes, and scheduled jobs. Keep outbound jobs disabled until
   validation ends.
6. Record row counts and integrity checks by table. For enquiries, use counts/IDs/checksums rather
   than reading message bodies unnecessarily.

### Phase C: Restore Storage

1. Recreate bucket settings and policies from reviewed configuration.
2. Restore object bytes from the independent object backup, preserving intended keys and content
   types.
3. Compare the manifest with object storage and database metadata. Identify metadata-without-object
   and object-without-metadata cases.
4. Re-run safe validation/transformation for media intended for mediated public delivery where
   provenance is uncertain. Do not publish metadata for unverified or quarantined originals.
5. Sample hashes and render representative images/documents. Check that deleted or restricted media
   has not been resurrected outside approved retention.

### Phase D: Restore Auth and external configuration

1. Configure public signup as disabled, exact Site URL/redirect allowlist, invite/OTP lifetime, MFA
   policy, SMTP, and approved templates.
2. Verify administrator identities and role assignments against the private access register. Keep
   unnecessary accounts disabled.
3. Create new environment-specific publishable and server secret credentials. Never reuse a value
   suspected of compromise.
4. Configure hosting variables, domains, DNS, security headers, cache behavior, rate limits,
   monitoring, and alert routes from the protected inventory.
5. Reconfigure required webhooks, functions, email, and scheduled jobs but leave side effects
   disabled until end-to-end validation passes.

### Phase E: Validate before cutover

All checks must pass and be recorded:

- anonymous users cannot access drafts, enquiries, roles, audit details, private objects, or admin
  actions;
- each of the five roles can perform only its authorised matrix;
- disabled users and revoked sessions are denied;
- public signup fails and an approved invitation/login/MFA path succeeds;
- raw `media` objects remain private, only eligible records render through `/media/[id]` with safe
  headers, and unsafe types are rejected;
- enquiry submission abuse controls work and only Enquiries Managers can read contents;
- audit events append correctly and cannot be edited through application roles;
- the current and next 30 days of prayer output match golden fixtures and the approved committee
  source;
- every Jumu'ah is after Dhuhr and before Asr; congregation, joined prayer, DST, overrides,
  Ramadan/Eid, and closure rules pass;
- public and TV views show the same published revision, update time, timezone, and last-known-good
  behavior;
- representative content, search metadata, policy downloads, images, and links work;
- logs and alerts operate without leaking secrets or enquiry bodies;
- backup jobs target the recovered production environment and a small post-restore backup can itself
  be verified.

The Prayer Authority signs off prayer output; the Technical Lead signs off security/data checks; the
Incident Lead authorises cutover.

### Phase F: Cut over and monitor

1. Take a final recovery point of the old environment and preserve it according to the incident
   decision.
2. Switch the deployment/environment reference or DNS using the reversible documented mechanism.
3. Purge only the necessary caches and force TV clients to fetch the verified revision.
4. Enable email, webhooks, and scheduled jobs one at a time while watching errors and duplicate side
   effects.
5. Monitor authentication, RLS denials, enquiry flow, prayer revision, media, database health, and
   public/TV output closely.
6. Announce recovery in plain language. State whether any data interval was lost and where current
   prayer information is confirmed.
7. Do not delete the old environment or recovery evidence until the agreed observation period and
   incident/privacy review are complete.

## Partial restores and operator errors

For accidental content edits, prefer the application revision-restore workflow. For prayer edits,
clone a known revision as a draft and use the validated withdrawal/atomic-replacement workflow. A
whole-database restore can discard unrelated enquiries and audit events.

For a small set of deleted rows:

1. restore the backup into an isolated project;
2. extract only the identified records plus required relationships;
3. review for personal data and current policy;
4. import through a controlled transaction that creates a new audit event;
5. verify public caches and references.

For a deleted media object, recover the exact object version/hash from the independent object backup
and verify its database reference and publication status before delivery.

## Restore-drill record

Every drill records:

- date, participants, source backup ages, selected recovery point, and environment;
- measured database and Storage RPO/RTO;
- whether secrets/configuration were available without one person's memory;
- database row-count/integrity results and object manifest/hash results;
- RLS/role, Auth, enquiry, media, prayer, public, TV, and monitoring test results;
- missing settings, manual steps, provider limitations, and corrective owners/dates;
- evidence locations and confirmation that test copies were securely destroyed afterward.

A drill that restores only Postgres is incomplete. A drill that cannot display a verified prayer
timetable, enforce RLS, retrieve required Storage objects, and accept an invite-only admin login has
failed.

## Provider-specific cautions

- Supabase backup availability, retention, download format, and PITR depend on the current plan and
  platform behavior; verify them in production rather than copying assumptions from this document.
- Supabase documents that database backups do not include Storage object bytes. Storage requires an
  independent recovery process.
- Restoring or cloning a database may not recreate Auth settings, API keys, Storage
  settings/objects, Edge Functions, webhooks, Realtime configuration, or external hosting/DNS
  configuration.
- Deleting a Supabase project can permanently remove its provider-held backups. Project deletion
  requires dual approval and confirmation of an independent current recovery copy.

Current provider references:

- [Supabase database backups and PITR](https://supabase.com/docs/guides/platform/backups)
- [Supabase restore to a new project](https://supabase.com/docs/guides/platform/clone-project)
- [Supabase logical backup guidance](https://supabase.com/docs/guides/platform/backups#logical-backups)
