# Incident Response Runbook

## Purpose and authority

This runbook covers security, privacy, prayer-integrity, media, availability, and supply-chain
incidents affecting the intended Next.js/Supabase platform.

It does not grant every administrator permission to rotate credentials, restore production, contact
regulators, or publish religious corrections. The Association must assign named people to the roles
below in a private operational contact sheet before launch. Do not commit personal phone numbers,
recovery codes, or provider credentials to this repository.

## Required private contact sheet

| Role                | Responsibility                                                     |    Must have an alternate |
| ------------------- | ------------------------------------------------------------------ | ------------------------: |
| Incident Lead       | Owns severity, timeline, decisions, and handover                   |                       Yes |
| Technical Lead      | Next.js, Supabase, hosting, logs, containment, recovery            |                       Yes |
| Prayer Authority    | Confirms correct prayer/Jumu'ah information and correction wording |                       Yes |
| Privacy Lead        | Assesses personal-data impact and obtains current UK advice        |                       Yes |
| Communications Lead | Public notice, administrator notice, enquiry responses             |                       Yes |
| Platform Owners     | GitHub, Supabase, hosting, DNS, email, backup access               | At least two named owners |

Record provider support routes, project identifiers, domains, emergency committee contacts,
insurer/legal contacts if applicable, and where recovery credentials are held. Test the sheet
quarterly without exposing secrets.

## When to activate

Activate this runbook for any suspected:

- incorrect, unauthorised, missing, or stale prayer/Jumu'ah/congregation information;
- administrator takeover, unexpected user/invite/role, or unexplained session activity;
- disclosure of a Supabase secret key, database password, hosting, DNS, SMTP, CI, or backup
  credential;
- RLS or Storage policy bypass;
- unauthorised access to enquiry, identity, audit, or backup data;
- malicious or privacy-sensitive media publication;
- compromised dependency, build, migration, deployment, or source account;
- destructive deletion, corruption, ransomware, provider suspension, or sustained outage;
- loss or theft of an administrator or TV device where sessions or credentials may remain.

Do not wait for proof before opening an incident record. It is easier to close a false alarm than
reconstruct an unrecorded response.

## Severity

| Severity       | Criteria                                                                                                                                                                         | Initial action target                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| SEV-1 Critical | Wrong live prayer/Jumu'ah time with near-term worship impact; privileged secret exposed; confirmed admin takeover; public enquiry/backup data; destructive production compromise | Page Incident Lead and relevant specialist immediately; contain and establish trusted prayer/public fallback |
| SEV-2 High     | Exploitable authorisation defect; limited sensitive disclosure; malicious public content/media; production integrity uncertain; restore required                                 | Assemble response team urgently; restrict affected feature and preserve evidence                             |
| SEV-3 Medium   | Attempted attack blocked; non-sensitive content tampering; contained account/device issue; significant dependency advisory without exploitation                                  | Assign owner, mitigate, and monitor on an agreed short timeline                                              |
| SEV-4 Low      | Hardening defect or suspicious event with no demonstrated impact                                                                                                                 | Track privately and resolve through normal change control                                                    |

Severity may rise as evidence changes. Religious timing can make a small technical change SEV-1
shortly before a congregation.

## First 30 minutes

1. **Open an incident record.** Assign a unique ID; record reporter, UTC detection time, affected
   environment, symptoms, and current severity.
2. **Establish a trusted channel.** Use the private committee incident channel, not a possibly
   compromised email account or public issue.
3. **Protect prayer integrity first.** Ask the Prayer Authority for the approved current
   information. If the website/TV cannot be trusted, show a clear temporary warning or
   last-known-good timetable and use the approved offline announcement route.
4. **Limit further harm.** Disable the affected account, endpoint, upload, mediated media delivery,
   or deployment as narrowly as possible. Restrict a private object and its published metadata when
   media is affected. Do not disable RLS or erase logs as a shortcut.
5. **Preserve evidence.** Record exact UTC times, release ID, published prayer revision, database
   migration state, request IDs, relevant audit/auth/provider events, and cryptographic hashes of
   exported evidence where practical.
6. **Protect recovery.** Confirm backups exist before destructive containment. Restrict backup
   credentials and prevent automatic deployment from an untrusted branch.
7. **Assign owners and next update.** State who owns containment, prayer verification, privacy
   assessment, and communications.

## Evidence handling

Preserve only what is necessary and restrict access. Potential sources include:

- application and hosting request/error logs;
- Supabase Auth user, session, and audit information available on the plan;
- Postgres audit events, prayer revisions, role assignments, migrations, and transaction timestamps;
- Storage object metadata, version/hash records, and access logs where available;
- GitHub commits, reviews, workflow runs, environments, deployment attestations, and token events;
- DNS, email provider, rate-limit, firewall, and monitoring events;
- the TV device URL, clock, screenshot, browser version, and last refresh/revision.

Export logs before provider retention expires. Use UTC. Do not paste tokens, enquiry bodies, full
database dumps, or recovery codes into tickets or chat. Maintain a simple custody log for each
export: collector, UTC time, source, scope, hash, and storage location.

## Core response process

### 1. Triage

- What changed, when, and in which environment?
- Is the public prayer revision correct and current?
- Are confidentiality, integrity, and availability affected?
- Which identities, records, objects, secrets, releases, and dates are in scope?
- Is exploitation continuing? Could caches or TV devices preserve harmful output?
- Is the evidence trustworthy, or may the audit/log source also be compromised?

### 2. Contain

Prefer reversible, narrow actions: disable an account, revoke sessions, turn off an affected Route
Handler, unpublish a media reference, freeze administrative mutations, withdraw prayer data to the
safe unavailable state, atomically publish an approved replacement, or roll back to a known-good
code release.

Do not:

- delete the compromised user before preserving identity and audit evidence;
- rotate one credential while leaving copies in old deployments or preview environments;
- restore over production before validating a clean recovery target;
- overwrite a bad prayer revision; publish or restore a new traceable corrective revision;
- clear caches until the harmful content and required evidence have been identified.

### 3. Eradicate

Remove the root cause: correct the RLS policy, action authorisation, dependency, migration, role
assignment, compromised device, unsafe media, leaked secret, or deployment route. Search for
equivalent paths and persistence. Add a regression test before re-enabling the feature where
practical.

### 4. Recover

Use a reviewed release and, if data restoration is needed, follow
[BACKUP-AND-RESTORE.md](BACKUP-AND-RESTORE.md). Restore first to an isolated project when feasible.
Verify RLS, Auth configuration, Storage objects, prayer fixtures, enquiry restrictions, logs,
caches, TV refresh, and monitoring before reopening writes.

### 5. Communicate and review

Say what is known, what is uncertain, what users should do, and when the next update will occur. Do
not speculate about attackers, religious rulings, or affected people. Complete a blameless review
with corrective owners and dates.

## Scenario playbooks

### Incorrect or unauthorised prayer information

1. Treat imminent wrong prayer/Jumu'ah information as SEV-1.
2. Freeze routine prayer publishing and capture the current public/TV output, configuration ID and
   version, approval metadata, audit event, effective range and relevant editor/session evidence.
3. The Prayer Authority compares the published record with the approved source, including timezone,
   method, Dhuhr/Jumu'ah relationship, congregation times, overrides and any Ramadan/Eid/closure
   decisions.
4. An authorised prayer publisher with AAL2 opens the published record under `/admin/prayer-times`.
   If no approved correction is ready, record the verified reason and withdraw it so every public
   prayer surface fails closed to unavailable.
5. If an approved correction exists, clone the known-good record/revision or prepare a separate
   draft. Review its coverage and every day in its bounded effective horizon, then select it in
   **Withdraw or atomically replace prayer times**. The database archives the old record and
   publishes the fully validated replacement in one transaction; if any part fails, neither change
   commits.
6. Revalidate the public surfaces and require the TV to fetch the corrected record. Confirm
   `/api/prayer`, `/api/display`, `/prayer-times`, download/print and the physical TV on a separate
   device.
7. If worshippers may have acted on wrong information, the Prayer Authority and Communications Lead
   decide the correction route and wording. The technical team does not issue a religious ruling.
8. Determine whether the cause was account compromise, validation failure, timezone/library drift,
   stale caching, device clock, or human error; add a fixture/invariant test.

### Administrator account or session compromise

1. Disable the account without deleting it; revoke its sessions and active factors through the
   supported provider controls.
2. Protect the affected email account and recovery channel; require clean-device credential and MFA
   recovery.
3. Review invitations, role changes, prayer/content publications, enquiries accessed/exported, media
   uploads, API use, and provider-console activity from the earliest plausible compromise.
4. Revert unauthorised changes through revisions/migrations, not untracked Dashboard edits.
5. Rotate any privileged secret the person/device could access. Reissue access with least privilege
   only after cause and device safety are addressed.

### Supabase or deployment secret exposure

1. Identify the exact key type. A public Supabase publishable/anonymous key is not a secret;
   exposure is an RLS test signal, not by itself a breach. Secret/service-role, database, Management
   API, hosting, DNS, SMTP, CI, and backup keys are confidential.
2. Stop deployment or endpoint use of the compromised value and preserve evidence of where it
   appeared.
3. Rotate through the provider's current supported process, update every authorised environment,
   redeploy, verify health, and revoke the old value. Legacy JWT-signing changes can affect all
   sessions and require a provider-specific plan.
4. Search Git history, build output, source maps, logs, artefacts, preview deployments, local
   configuration, and shared messages. Remove exposed copies after evidence is preserved.
5. Assume a secret key that bypasses RLS could access all affected data; review query, Storage,
   Auth, and network evidence and conduct a privacy assessment.

### RLS, authorisation, or enquiry exposure

1. Disable the affected endpoint or remove public access through a restrictive corrective policy.
   Never solve the incident by turning RLS off.
2. Preserve the faulty policy/migration and determine affected operations, roles, tables, columns,
   objects, and time window.
3. Estimate actual access from logs without broadly opening enquiry bodies. Record uncertainty where
   provider logs are insufficient.
4. Correct policy and server authorisation, then run the complete anonymous/five-role denial matrix
   before reopening.
5. The Privacy Lead assesses current UK reporting and data-subject notification duties. Where a
   breach is reportable, the UK regime generally requires notification to the ICO without undue
   delay and within 72 hours of awareness; obtain current advice and document the decision, even
   when no report is made.

### Malicious or inappropriate media

1. Remove the public reference and block object delivery or replace it with a safe tombstone; retain
   a restricted evidence copy only if necessary.
2. Invalidate CDN/application caches and locate every content revision referencing the object.
3. Determine whether code executed, metadata exposed location/identity data, or
   safeguarding/copyright concerns exist.
4. Review uploader, validation/transform logs, original type, magic bytes, hash, and related
   uploads.
5. If active content executed from the trusted origin, treat administrator/public sessions and
   origin data as potentially exposed.

### Compromised dependency, CI, or deployment

1. Freeze deployments and protect branch/environment rules. Revoke affected registry, GitHub, CI,
   and hosting tokens.
2. Identify the first suspect commit, dependency/lockfile change, workflow run, artefact, migration,
   and deployed release.
3. Rebuild a known-good commit in a clean environment using the committed lockfile and pinned
   runtime/actions.
4. Compare artefact hashes and database/schema drift; do not assume application rollback reverses a
   migration.
5. Rotate any secret available to the compromised build and inspect generated client bundles/source
   maps.
6. Deploy the clean artefact, run smoke/RLS/prayer checks, and monitor before resuming normal
   releases.

### Provider outage, deletion, or destructive data change

1. Freeze writes where possible and establish the last trustworthy database, Storage, prayer
   revision, and deployment time.
2. Keep the public last-known-good prayer snapshot available with an honest stale/offline notice.
3. Select a recovery point before the destructive event and follow the isolated restore procedure.
4. Remember that Supabase database backups do not restore Storage object bytes, hosting variables,
   Auth redirect settings, DNS, or third-party configuration.

### Lost administrator or TV device

- Administrator device: disable or revoke the user's sessions, secure email/MFA recovery, rotate
  locally accessible secrets, and inspect recent activity.
- TV device: it must hold no administrator or server secret. Remove its kiosk/session access if any,
  verify the displayed URL and clock, and rebuild from the documented baseline if physical tampering
  is possible.

## Communications

Public incident messages should include:

- the affected service or information, in plain language;
- whether current prayer information is confirmed and where the approved fallback is available;
- the practical action visitors or administrators should take;
- the time of the update and next expected update;
- a confirmed organisational contact, once approved.

Do not include exploitable detail, personal names, enquiry contents, secret types/values,
unsupported attribution, or religious conclusions not approved by the Prayer Authority.

## Recovery exit criteria

The Incident Lead may close active response only when:

- the root cause or safe compensating control is understood;
- affected credentials/sessions are revoked and old deployments cannot use them;
- correct prayer information is independently confirmed on public and TV views;
- RLS and role denial tests pass;
- enquiries and media are accessible only to intended roles;
- database, Storage, migrations, Auth settings, caches, and monitoring are consistent;
- legal/privacy decisions and communications are recorded;
- residual risks have owners and deadlines.

## Post-incident review and drills

Within an agreed short period, document timeline, impact, detection, decisions, what helped, what
failed, and corrective work. Do not use the review to assign blame.

Exercise at least twice yearly, including one prayer-integrity scenario and one credential/data
scenario. Run a separate full restore drill at least quarterly until launch confidence is
established, then at the frequency approved in the backup plan.

Reference:
[ICO guidance for organisations responding to a data breach](https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/).
