# Recurring maintenance checklist

Copy this checklist into the approved operations system for each period. Record owner, date,
environment, evidence, exceptions, and due date. Do not place provider credentials, personal data,
magic links, or recovery codes in the record.

## Every operating day

No daily engineering ritual is required: expired notices remove themselves, prayer surfaces fail
closed rather than show unapproved data, the dashboard warns when published prayer coverage runs
low, and `/api/health` reports configuration and database reachability. The one daily item is a
two-minute human glance that anyone attending the masjid can do:

- [ ] Glance at the mosque TV (or `/tv` on a phone): today's date is shown, the times match the
      approved source, and no stale emergency notice is displayed. Report anything wrong to the
      technical owner.

Everything formerly listed here daily is covered by the weekly checks below or by the platform's
fail-closed behaviour in between.

## Every week

- [ ] From a clean browser session, check `/`, `/prayer-times`, `/api/health`, and `/tv` for
      availability, matching Europe/London date and times, and a recent update timestamp.
- [ ] Review active emergency and temporary notices; remove or correct anything no longer current,
      and confirm the duty contacts for prayer, technical, and emergency decisions remain reachable.

- [ ] Review planned and expiring content for the next four weeks. Scheduled records become public
      through their validated publication window without a status-promotion job; verify the exact
      Europe/London instants and assign an owner to confirm the signed-out result.
- [ ] Review drafts and stale notices; assign review or archive without deleting evidence.
- [ ] Check Auth/email delivery failures, suspicious sign-in activity, disabled/pending accounts,
      and unresolved access requests.
- [ ] Review high-severity dependency/security alerts and failed CI runs; do not auto-merge merely
      because a bot opened an update.
- [ ] Confirm database backup jobs and separate Storage object copies completed; investigate missed
      jobs.
- [ ] Inspect Vercel/Supabase errors, usage, capacity, and cost thresholds.
- [ ] Restart/update the TV device in the approved maintenance window and confirm automatic
      recovery, without clearing its browser data unless online recovery is planned.

## Every month

- [ ] Have the prayer owner review at least the next 40 days, including Fridays, effective-range
      boundaries, congregation rules, overrides, and known seasonal changes.
- [ ] Review the next DST, Ramadan, Eid, school/holiday, and exceptional-closure dates early enough
      for approval and testing.
- [ ] Test a magic-link sign-in and AAL2 confirmation with an approved staging account; inspect
      exact callback and email delivery.
- [ ] Test one content draft/publish/unpublish/revision-restore journey in staging and remove the
      synthetic content.
- [ ] Run and record formatting, lint, typecheck, tests, migration replay/lint, build,
      browser/accessibility, dependency, secret, and code scans on the maintained branch.
- [ ] Check internal links, 404/error states, admin cache/noindex headers, public metadata, robots,
      sitemap, and structured data.
- [ ] Review media provenance/consent/alt text, private `media` bucket policy, mediated
      `/media/[id]` delivery and orphan/reference state. Confirm PDF upload still fails closed until
      approved malware scanning/quarantine exists.
- [ ] Review `/admin/settings` publication state and `/admin/audit` metadata for unexpected changes,
      using provider logs as the separate source for Auth/hosting activity.
- [ ] If public enquiries are enabled, verify the staffed `/admin/enquiries` queue, trusted proxy
      header, recent route-test record, privacy/retention configuration and successful authorised
      `POST /api/cron/retention` run. Confirm its result includes expired-enquiry and eligible
      inactive-rate-limit purge counts, and that inactive pseudonymous rows older than 48 hours are
      removed. If any dependency is absent, confirm the public form fails closed; do not substitute
      an unimplemented email notification claim.
- [ ] Exercise the limiter's opportunistic cleanup of the same eligible stale fingerprints as a
      defence-in-depth path; it does not replace the scheduled authorised retention POST.
- [ ] Check documentation against the actual routes, actions, provider UI, versions, and responsible
      people.

## Quarterly

- [ ] Review every administrator, role, MFA status, last need for access, pending invite, disabled
      account, and provider-team membership with two authorised reviewers.
- [ ] Confirm at least two named super administrators and provider owners remain available; remove
      departed people and rotate credentials they knew.
- [ ] Review service-role/database/SMTP/DNS/hosting/backup credentials, owners, age, exposure, and
      rotation schedule.
- [ ] Restore the latest database backup and separate Storage object copy into an isolated
      non-production environment; record RTO/RPO and application smoke results.
- [ ] Exercise code rollback separately from database/data/configuration recovery.
- [ ] Run a tabletop incident covering incorrect prayer data, malicious content/admin compromise,
      Supabase outage, and lost TV connectivity.
- [ ] Review RLS/grants/function exposure and role denial tests against the current schema.
- [ ] Review audit-log retention/access, Auth/log retention, privacy minimisation, and incident
      follow-ups.
- [ ] Review hosting/database/email/storage costs, quotas, budgets, plan-dependent backup
      capability, and domain renewal ownership.
- [ ] Recheck WCAG manual journeys with keyboard and assistive technology and track regressions.

## Before each UK clock change

- [ ] Identify the exact Europe/London transition date and affected prayer configuration range.
- [ ] Preview the days before, day of, and days after the change against the approved source.
- [ ] Verify no nonexistent spring wall time or duplicated autumn time is silently accepted in
      content scheduling or prayer operations.
- [ ] Test a TV left open through the simulated transition and confirm clock, date, countdown, today
      selection, and refresh recover.
- [ ] Prepare an approved physical/alternate-channel fallback and staff contact for the transition
      morning.

## Before Ramadan, Eid, or exceptional arrangements

- [ ] Obtain qualified/committee approval for dates, Hijri adjustment, congregation,
      Taraweeh/iftar/suhoor, Eid, closure, and communication wording as applicable.
- [ ] Record the source, approver, effective range, review date, and replacement/expiry plan.
- [ ] Test public, printable/download, API, TV, emergency, and unavailable states with the approved
      configuration.
- [ ] Verify temporary content automatically expires and cached TV notices will not mislead during
      an outage; provide an operator removal plan.
- [ ] Confirm safeguarding, capacity, parking/access, service, donation, and contact statements
      separately before publication.

## Annually

- [ ] Renew domain and review registrar/DNS ownership, MFA, recovery contacts, TLS, canonical host,
      and preserved mail records.
- [ ] Review hosting, Supabase, SMTP, backup, monitoring, and repository contracts/plans and
      data-processing terms.
- [ ] Review and reapprove public policies, privacy/safeguarding contacts, accessibility statement,
      content owners, emergency rota, and committee confirmations.
- [ ] Review Node/Next.js/Supabase/dependency support status and plan upgrades through staging; do
      not perform an untested major upgrade in place.
- [ ] Review disaster-recovery objectives, offline/physical fallback, device replacement, and TV
      screen burn-in/power schedule.
- [ ] Archive maintenance/incident evidence according to the approved retention policy.

## After any release or incident

- [ ] Repeat public/prayer/TV/admin/Auth smoke checks on the canonical origin.
- [ ] Confirm expected deployment, migration, environment, Auth, DNS, SMTP, and Storage state.
- [ ] Review ambiguous or retried mutations and audit records.
- [ ] Remove temporary emergency messages and test data at the approved time.
- [ ] Record actual outcome, residual risk, follow-up owner, and documentation/process changes.
