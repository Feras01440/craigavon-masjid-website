# Operations runbook

Use this runbook after a credentialed environment exists. It distinguishes service availability from
content/prayer correctness: a page returning `200` can still contain unsafe or unapproved
information.

`/api/health` is implemented as a non-sensitive configuration and database-reachability probe, but
it is not an alerting integration and does not prove content or prayer correctness. Until a
privacy-reviewed monitor is connected, the named duty owner must perform and record the manual
checks below.

## Keep this private contact sheet outside Git

The platform is sized for a small volunteer team. Two people carry every technical duty between
them; the rest is ordinary committee work done through the dashboard. One person may hold several
duties.

| Duty                       | Held by                                 | Covers                                                                   |
| -------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| Technical owner — primary  | To be assigned                          | Vercel, Supabase, Auth, DNS/email, releases, backups, incident decisions |
| Technical owner — backup   | To be assigned                          | The same duties whenever the primary is unavailable                      |
| Prayer editor(s)           | To be assigned                          | Timetable drafts, overrides, Jumuʿah changes, prayer publication         |
| Content editor(s)          | To be assigned                          | Announcements, events, pages, media                                      |
| Enquiries access           | To be assigned                          | The private enquiry queue (authenticator-confirmed accounts only)        |
| Emergency-message approval | Any committee officer + technical owner | Urgent public and TV notices                                             |
| TV/device caretaker        | To be assigned                          | The screen inside the masjid (power, browser, network)                   |

Launch requires the two technical-owner slots and at least one prayer editor to be filled and
reachable; the remaining duties may be shared or assigned later. Do not commit names, phone numbers,
recovery codes, or provider credentials to this file.

## Severity and first response

| Level    | Examples                                                                                                                              | Initial response target                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Critical | Incorrect prayer/Jumu'ah times presented as approved; admin takeover; secret leak; personal-data exposure; malicious emergency notice | Page the incident, technical, and relevant prayer/security/privacy owners immediately; contain first |
| High     | Public/admin outage; Auth unavailable; corrupted content; TV showing a materially stale emergency message                             | Engage owners promptly, publish an approved alternate-channel notice where safe, begin recovery      |
| Medium   | Broken non-critical page, a planned manual publication was missed, one admin cannot sign in, TV intermittent                          | Record, diagnose, and assign within the operational period                                           |
| Low      | Cosmetic defect or documentation drift without misleading information                                                                 | Add to normal maintenance backlog                                                                    |

For every event:

1. Record UTC and Europe/London detection times, reporter, environment, URL/device, and observed
   facts.
2. Preserve the deployment ID, Supabase project/migration state, generated/update timestamps,
   redacted screenshots, and relevant provider request IDs.
3. Do not paste tokens, cookies, magic links, TOTP secrets, enquiry bodies, or full Auth records
   into the incident log.
4. Choose a single incident owner and a single public-message approver.
5. Contain, verify, recover, monitor, and then write follow-up actions.

Security or personal-data incidents additionally follow
[INCIDENT-RESPONSE.md](../security/INCIDENT-RESPONSE.md).

## Routine service and integrity checks

Run from a clean browser session and, where possible, a second network/device:

| Surface     | Check                                          | Healthy interpretation                                                                               |
| ----------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Public      | `/`, `/prayer-times`, one policy/content route | `200`, approved copy, navigation works, no private/draft data                                        |
| Prayer API  | `/api/prayer?days=1`                           | `200`, `status: available`, correct date/timezone/source/update time; `503` means not launch-healthy |
| Display API | `/api/display`                                 | `200`, recent `generatedAt`, nested prayer available, expected notices only                          |
| Health      | `/api/health`                                  | `200`, `status: ok`, `database: reachable`; `503` requires technical investigation                   |
| TV          | `/tv`                                          | Correct Europe/London clock/date, today present, update timestamp, expected online/cache state       |
| Admin       | `/admin/sign-in`                               | `200`, private/no-store and noindex headers, no error disclosure                                     |
| Auth        | Test account magic link                        | Approved SMTP delivery and exact `/admin/auth/callback` return                                       |
| Data        | Supabase dashboard/logs                        | No unexpected errors, capacity warnings, failed backups, or anomalous auth/admin activity            |
| Hosting     | Vercel logs/analytics used for operations      | No sustained 5xx/build/function errors; no intrusive visitor tracking required                       |

The `Online` label on `/tv` reflects `navigator.onLine`, not proof that Supabase or the display API
is healthy. Verify the last successful update and actual timetable.

## Incorrect or unapproved prayer information

Treat this as a critical integrity incident.

1. Confirm the discrepancy with the authorised prayer owner using the approved source. Do not
   “correct” it from a personal app or assumption.
2. Record affected dates, prayers, congregation/Jumu'ah times, source configuration ID/version if
   known, and every public surface.
3. Publish one short, approved emergency notice through **Content** if Auth/content service is safe.
   State that the online timetable must not be relied on and give only a confirmed alternative
   contact/channel. Set an expiry.
4. Ask the TV owner to verify the emergency screen. If the screen still shows misleading times or a
   stale cached message, take that display out of service and use a printed/announced approved
   notice.
5. Use the Association's confirmed external channels to warn users; do not wait for caches to
   expire.
6. An authorised prayer publisher with a confirmed authenticator session opens the affected record
   under `/admin/prayer-times` and uses **Withdraw or atomically replace prayer times**. Record the
   verified incident reason; never improvise direct production SQL.
7. If a correction is already committee-approved, select that reviewed draft as the replacement and
   record its approval evidence. The application validates every day in its bounded effective
   horizon, then archives the old version and publishes the replacement atomically. Otherwise,
   withdraw without a replacement so every public surface enters the safe unavailable state.
8. Verify `/api/prayer`, `/api/display`, `/prayer-times`, `/tv`, Friday/Jumu'ah handling, DST
   boundaries, and the printed/downloaded timetable after recovery.
9. Remove the emergency message only after all public and TV surfaces are correct.

If the withdrawal form, authenticator check, full-horizon validation or database transaction fails,
leave the timetable unchanged, keep the emergency notice/display response in place and escalate to
the technical owner. The calm unavailable state is safer than an unreviewed timetable.

## Incorrect public content

1. Confirm the authoritative wording with the content owner.
2. For immediate harm, use `/admin/content` to change the item to **Draft** or **Archived**, or
   publish one approved emergency correction.
3. Verify removal/correction from a signed-out browser and `/api/display` when the item is a notice.
4. Restore the last good revision as a draft if appropriate; review before republishing.
5. Remember that the current content list excludes soft-deleted records. If the direct URL is
   unknown, a technical owner may need to locate the record safely.
6. Record the record ID/version, actor, approver, before/after evidence, and whether other channels
   need correction.

## Emergency website update

1. Receive authority and exact facts through the pre-agreed private route.
2. Have one editor compose and another authorised person read back the message, expiry, and affected
   audience.
3. Confirm AAL2 at `/admin/security`.
4. Create an **Emergency notice**, type `PUBLISH EMERGENCY`, publish, and verify as described in
   [ADMIN-GUIDE.md](../../ADMIN-GUIDE.md).
5. Check `/api/display`, `/tv`, and the relevant public page from a separate device. Do not assume
   the configured polling interval guarantees display.
6. Timestamp the next review and removal. Keep only one active emergency notice unless priority
   behaviour was explicitly tested.
7. Archive/unpublish at the authorised end, verify removal, and close the change record.

If the admin or Supabase service is unavailable, use approved external channels and a physical
mosque notice. Do not weaken Auth/RLS or expose a service key to force a website update.

## Supabase/database outage

Expected behaviour is fail-closed administration and an explicit prayer unavailable state; notices
may disappear. `/api/display` returns `503` when either the prayer bundle or notice query is
unavailable. The TV treats that non-2xx refresh like a network failure and can select the last
browser-local payload that previously had both dependencies available. Trust the values and update
timestamp, not the network label alone.

1. Check Supabase project status, quotas, pause state, Auth, Postgres, and Storage logs.
2. Check that Vercel variables reference the correct environment and have not expired/rotated
   without redeployment.
3. Do not repeatedly retry mutations; determine whether any request committed before reporting
   failure.
4. Freeze admin changes and tell editors not to resubmit until state is reconciled.
5. Use approved external/physical notices for prayer and emergencies.
6. If provider recovery is expected, monitor and smoke-test when restored.
7. If data is damaged, invoke the [backup and restore procedure](../security/BACKUP-AND-RESTORE.md).
   Confirm Storage separately.
8. Reconcile content versions, audit events, Auth profiles/invites, and any ambiguous mutations
   before reopening admin access.

## Vercel or application release failure

1. Identify whether DNS/TLS, deployment routing, build, function runtime, or application data is
   failing.
2. Record the current and last-known-good deployment IDs and whether a migration/config change
   accompanied the release.
3. If the database remains compatible, use Vercel Instant Rollback to the recorded deployment.
4. Repeat public, prayer, TV, admin-header, and Auth smoke checks.
5. Remember that rollback does not change Supabase, DNS, SMTP, or environment values and an old
   build may use stale build-time configuration.
6. If migration compatibility is uncertain, stop and use the production deployment recovery
   procedure rather than guessing.

## Admin sign-in or MFA failure

1. Verify exact origin, Auth Site URL, callback allow-list, SMTP delivery/logs, and that the newest
   one-time link is used.
2. Verify the user exists and `admin_profiles.id` matches the Auth UUID.
3. For an invited profile, verify a lowercase, unexpired, unrevoked invitation exists. For an active
   profile, verify it is not disabled/banned.
4. Do not reveal whether an address exists to an unverified requester.
5. For a lost TOTP factor, verify identity through the approved recovery process with two authorised
   people. Record any factor removal/reset and review active sessions.
6. Never enable public sign-up, share an account, or bypass AAL2 to restore access.

`/admin/users` implements AAL2-protected invitation, pending-invitation revocation and account
disable/ban for super administrators. These operations still require credentialed staging proof.
Role changes, factor recovery and any provider-level session remediation remain controlled
technical/provider procedures until a separately reviewed self-service workflow exists.

## Administrator offboarding or suspected compromise

1. Treat suspected compromise under the security incident procedure.
2. Have an authorised Supabase owner ban/revoke the Auth account and mark the profile disabled
   through a reviewed route/procedure.
3. Revoke active sessions and pending invites; verify access fails server-side.
4. Rotate any shared/provider credentials the person knew; named application accounts should never
   be shared.
5. Review audit/Auth logs and recent content, prayer, media, user, and configuration changes.
6. Transfer ownership of provider, DNS, backup, email, and authenticator recovery access.
7. Record evidence and update the quarterly access register.

## TV display failure

Follow [TV-DISPLAY-GUIDE.md](TV-DISPLAY-GUIDE.md). Keep the existing tab open during brief network
loss; do not clear browser data or reload while offline because initial offline navigation is not
implemented.

## Backup/restore and disaster recovery

Use [BACKUP-AND-RESTORE.md](../security/BACKUP-AND-RESTORE.md). Supabase database backups do not
include Storage object bytes, Vercel variables, Supabase Auth/SMTP/DNS configuration evidence, or
external credentials. A restore is not complete until those layers and the application are
smoke-tested.

## Operational log template

For each check, release, incident, emergency notice, restore, or access change, record:

- record ID, environment, UTC/Europe-London timestamps;
- reporter, operator, approver, and decision owner;
- affected routes/data versions/deployment/migration IDs;
- facts, user impact, containment, and communications;
- commands/actions and redacted evidence;
- verification results and remaining risk;
- rollback/recovery point; and
- follow-up owner and due date.
