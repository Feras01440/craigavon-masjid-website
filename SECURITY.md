# Security Policy

## Purpose and current status

This policy covers the Muslim Association of Craigavon public website, administration dashboard, prayer-time publishing, enquiries, media, and supporting deployment infrastructure.

The intended production platform is Next.js with Supabase Postgres, Auth, and Storage. At the time this policy was added, that production platform had not yet been verified in this repository. A control described here is not evidence that the control is live.

The following labels are used throughout the security documentation:

- **Verified** — present in code or configuration, exercised by an automated test where practical, and evidenced in the deployment checklist.
- **Required** — a mandatory design or implementation control that is not yet verified.
- **Environment-dependent** — configured outside the repository, such as MFA, Supabase Auth settings, backup retention, DNS, hosting secrets, log retention, and administrator ownership. It must be checked separately in each environment.
- **Operational** — depends on trained people following a recorded procedure and completing drills.

No control may be marked Verified solely because it appears in documentation. The release owner must link code, test output, or a redacted configuration screenshot in the production readiness record.

## Reporting a vulnerability

Do not disclose a suspected vulnerability, leaked credential, personal-data exposure, or incorrect prayer timetable in a public issue, discussion, or social-media post.

Use GitHub private vulnerability reporting when it has been enabled for the repository. Until the Association approves and publishes a dedicated security address, report privately to the repository owner through the committee's pre-agreed private channel. The lack of a confirmed monitored security contact is a launch blocker.

Include, where safe:

- the affected URL, feature, environment, and approximate UTC time;
- a concise description and the impact you believe is possible;
- reproduction steps using test data only;
- relevant request IDs or redacted screenshots;
- whether prayer information, administrator access, enquiries, or media were affected.

Do not:

- access more records than needed to demonstrate the issue;
- download enquiry contents or identity data;
- alter prayer times, Jumu'ah sessions, emergency notices, audit records, or backups;
- upload malware or active content;
- attempt denial of service, social engineering, or credential stuffing;
- retain or share personal data discovered during testing.

We will acknowledge a credible private report as soon as an authorised responder is available, preserve evidence, assess severity, and provide updates where it is safe to do so. These are response goals, not a promise of a bounty or a fixed resolution time.

## Security and integrity invariants

The following rules are mandatory for the production rebuild:

1. Public registration is disabled. Administrators are invited through a trusted server-side process or directly by an authorised Supabase project owner.
2. Every protected page, Route Handler, and Server Action authenticates and authorises on the server. Hiding a control in the interface is not authorisation.
3. Every exposed table, view, function, and Storage bucket has least-privilege grants and Row Level Security policies. The anonymous key is treated as public; safety must not depend on concealing it.
4. Supabase secret or legacy service-role keys, database credentials, SMTP credentials, and hosting tokens are server-only. They must never use a `NEXT_PUBLIC_` name or appear in browser bundles, logs, test snapshots, or repository history.
5. Prayer configuration is versioned, effective-dated, reviewed, and published transactionally. A draft edit must never partially change public or TV times.
6. The system rejects invalid congregation and Jumu'ah arrangements before publication, including nonexistent DST wall times and a Jumu'ah session before Dhuhr or at/after Asr.
7. The public site and TV display use only a published timetable snapshot, show its revision and update time, and retain a visible last-known-good fallback.
8. Enquiries are private by default, available only to authorised enquiry staff, retained for an approved period, and excluded from analytics and routine application logs.
9. Uploaded files are untrusted. Public media is served only after validation, safe naming, and transformation or quarantine as appropriate.
10. Security-relevant and prayer-relevant changes create an append-only audit event. Application administrators cannot silently rewrite audit history.
11. Production changes use reviewed migrations, locked dependencies, automated tests, and a reversible deployment process.
12. Database backups are not assumed to include Storage objects, deployment secrets, or external configuration. Those assets have separate protected recovery copies.

## Control register

| Area | Required control | Status until evidenced |
|---|---|---|
| Authentication | Invite-only administrators; confirmed identities; MFA for privileged roles; account disable and session revocation | Required + environment-dependent |
| Authorisation | Server-side permission checks and deny-by-default Postgres RLS for every operation | Required |
| Sessions | Secure, HTTP-only, SameSite cookies; bounded lifetime; reauthentication for high-risk actions | Required + environment-dependent |
| Mutations | POST-only mutation paths, Origin validation, CSRF protection where cookies are used, schema validation, idempotency where retries are possible | Required |
| Prayer publishing | Preview, explicit confirmation, invariant validation, immutable revision, audit event, atomic publish | Required |
| Enquiries | Rate limits, abuse controls, field validation, restricted access, retention and deletion workflow | Required + operational |
| Media | Size and magic-byte validation, safe generated keys, image re-encoding, active-content rejection, private staging | Required |
| Secrets | Separate development/staging/production values, managed secret store, rotation owner, repository and build-output scanning | Required + environment-dependent |
| Database | Migrations in source control, least-privilege grants, RLS tests using anonymous and each administrator role | Required |
| Backups | Plan-appropriate database recovery, separate Storage backup, encrypted off-site configuration export, restore drills | Environment-dependent + operational |
| Deployment | Protected production branch/environment, reviewed build, immutable release identifier, health checks, rollback | Required + environment-dependent |
| Supply chain | Lockfile, pinned runtime, dependency review, automated advisories, provenance for vendored assets | Required |
| Monitoring | Auth, authorisation-denial, publish, upload, and error signals with alerts and privacy-safe retention | Required + environment-dependent |

## Identity and access rules

The application roles are Super Administrator, Website Editor, Prayer Times Editor, Enquiries Manager, and Read-only Reviewer. Permissions are additive only through an approved role assignment stored in a protected server-controlled table. Do not authorise from user-editable Auth metadata.

- Super Administrators manage invitations, roles, account disabling, and platform settings. Use at least two named accounts; do not share one committee login.
- Prayer Times Editors may prepare prayer drafts. Publishing requires explicit confirmation and, where committee policy requires it, a second authorised reviewer.
- Enquiries Managers may view and respond to enquiries but must not gain prayer, role, or deployment permissions.
- Website Editors manage structured public content but cannot publish executable HTML, JavaScript, arbitrary iframes, or unrestricted redirects.
- Read-only Reviewers cannot mutate data, upload media, invite users, or trigger publication.

Departing or suspended administrators must be disabled promptly, sessions revoked, role assignments removed, and any secrets known to them assessed for rotation. Access is reviewed at least quarterly and after every committee change.

## Secrets and keys

The browser may receive a Supabase publishable or anonymous key because RLS is the security boundary. The following remain confidential:

- Supabase secret keys and legacy `service_role` keys, which bypass RLS;
- database and connection-pool credentials;
- Supabase Management API and personal access tokens;
- SMTP, email provider, CAPTCHA, monitoring, object-backup, DNS, and hosting credentials;
- encryption and signing keys;
- backup decryption keys and recovery codes.

Store production secrets only in the approved hosting and platform secret stores. Use different projects and credentials for local, preview, staging, and production. Preview deployments must not receive production database or Storage credentials.

If a secret enters Git history, a build log, a client bundle, or an untrusted device, treat it as compromised: contain, rotate, redeploy, revoke the old value, search for use, and record the incident. Deleting the text is not remediation.

## Secure development and release gate

A production release must fail unless all applicable checks pass:

- strict TypeScript, formatting, linting, unit, integration, and end-to-end tests;
- prayer golden fixtures and invariant checks across the release horizon;
- migration validation against a clean database and an upgrade copy;
- RLS denial tests for anonymous users and every administrator role;
- secret scan of source, history, build output, and source maps;
- dependency and licence review with a committed lockfile;
- media abuse tests, request-size limits, and enquiry rate-limit tests;
- production security-header and cache-behaviour checks;
- accessibility checks for public, dashboard, validation, and incident states;
- a release identifier and documented rollback target.

Generated database types and migration files are reviewed like application code. SQL written in the Supabase Dashboard must be copied into a migration or it is an untracked production change.

## Privacy

Enquiry messages, administrator identity data, access logs, IP addresses, and audit events may contain personal data. Collect only fields approved by the Association, document purpose and retention, restrict exports, and avoid placing message bodies in logs or analytics. The privacy notice must identify relevant processors and external communication channels.

Security telemetry should answer who changed what, when, and from which authenticated account without unnecessarily copying sensitive content. Access to logs and backups is itself privileged and audited where the provider supports it.

## Related runbooks

- [Threat model](docs/security/THREAT-MODEL.md)
- [Incident response](docs/security/INCIDENT-RESPONSE.md)
- [Backup and restore](docs/security/BACKUP-AND-RESTORE.md)

Product behavior and provider capabilities change. Recheck the current [Next.js data-security guidance](https://nextjs.org/docs/app/guides/data-security), [Supabase Auth user guidance](https://supabase.com/docs/guides/auth/users), [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), and [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups) during implementation and each major upgrade.
