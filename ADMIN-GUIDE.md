# Committee administration guide

This guide describes the complete dashboard. The clean local product environment supplies safe
passwordless role accounts and labelled demonstration data; a hosted production environment still
requires the approved launch configuration.

Never put a magic link, TOTP secret, QR code, service-role key, real enquiry, or personal email
address in documentation or pull-request screenshots.

## What committee members can use now

| Area                      | Route                 | Current state                                                          |
| ------------------------- | --------------------- | ---------------------------------------------------------------------- |
| Secure sign-in            | `/admin/sign-in`      | Implemented; requires configured Supabase Auth and an approved profile |
| Dashboard                 | `/admin`              | Implemented                                                            |
| Content                   | `/admin/content`      | Implemented with schedule, publish, archive and revision workflows     |
| Website settings          | `/admin/settings`     | Homepage, contact, navigation, TV, enquiries and feature settings      |
| Prayer/Jumu'ah management | `/admin/prayer-times` | Rules, sessions, overrides, seasonal data, preview and publication     |
| Media                     | `/admin/media`        | Implemented for validated raster images                                |
| Enquiries                 | `/admin/enquiries`    | Implemented for the private staffed queue                              |
| Audit log                 | `/admin/audit`        | Implemented as metadata-only, permission-scoped history                |
| People and access         | `/admin/users`        | Implemented for authorised super administrators                        |
| Security/MFA              | `/admin/security`     | Implemented for TOTP enrolment and session confirmation                |

## Roles

| Role                | Effective application permissions                             |
| ------------------- | ------------------------------------------------------------- |
| Super administrator | All defined permissions, including user management            |
| Website editor      | Content and media read/write/publish, prayer read, audit read |
| Prayer-times editor | Content read, prayer read/write/publish, audit read           |
| Enquiries manager   | Content read and enquiry read/write                           |
| Reviewer            | Read-only content, media, prayer, and audit access            |

The server and database enforce permissions. A visible button is never evidence that an action is
authorised. Publishing, content mutation, media mutation, enquiry mutation, prayer mutation, and
account management require an AAL2 authenticator-confirmed session where implemented.

## Sign in

1. Open the approved staging or production origin and add `/admin/sign-in`.
2. Enter the exact email address used for the committee invitation.
3. Select **Email me a secure sign-in link**.
4. The success message is deliberately the same for recognised and unrecognised addresses. If no
   email arrives, do not repeatedly submit; ask the technical owner to inspect Auth delivery and the
   invitation/profile state.
5. Open the newest link on the same trusted device. The callback must be `/admin/auth/callback` on
   the same approved origin.
6. Confirm that the dashboard shows your own name and role. If it does not, sign out immediately and
   report it privately.

Magic links do not create public accounts (`shouldCreateUser` is false). A valid Supabase Auth user
also needs an `admin_profiles` record, and an invited profile needs a matching, unexpired, unrevoked
`admin_invites` record before first activation.

- **Screenshot checkpoint A:** staging sign-in card before entering an address.
- **Screenshot checkpoint B:** non-enumerating “If this address…” success state, using a synthetic
  staging account.
- **Screenshot checkpoint C:** dashboard with a synthetic display name and role; crop or redact the
  email.

## Set up or confirm the authenticator

1. Select **Security** in the admin navigation.
2. If no verified factor exists, select **Set up authenticator**.
3. Scan the QR code with the committee member's authenticator app. Store the account on an
   organisation-approved device; do not photograph or share the QR code or manual secret.
4. Enter the current six-digit code and select **Confirm authenticator code**.
5. Confirm the page reports **Confirmed (AAL2)**. Sensitive actions are unlocked for this session
   only.

If a verified factor already exists, enter its current six-digit code. If the factor/device has been
lost, stop and use the approved identity-recovery process; do not create an unverified replacement
account as a shortcut.

- **Screenshot checkpoint D:** Security page before enrolment, with identity details redacted.
- **Screenshot checkpoint E:** confirmed AAL2 state. Never capture the QR code or secret.

## Content states

- **Draft** is visible only to authorised administrators.
- **Scheduled** validates and stores a future Europe/London publication date/time. The
  server-mediated public repository applies that publication window at read time; its database
  status remains `scheduled`, so no fragile promotion job is needed. Anonymous clients have no
  direct base-table access.
- **Published now** becomes public subject to its publication and expiry window.
- **Archived** is not public. The separate archive action is a soft deletion and removes the item
  from the current content list.

All create and update actions currently require a freshly confirmed authenticator, even when saving
a draft. Concurrent edits use the hidden record version; if another editor saved first, reload and
reconcile rather than overwriting their work.

The form stores a versioned structured document. Its main narrative remains plain text; event,
service, education, policy and notice types expose additional controlled fields. Do not paste HTML,
scripts, embeds, tracking links, or confidential material.

## Create an announcement or event

1. Confirm AAL2 on **Security**.
2. Open **Content** and select **Create content**.
3. Choose the public content type that matches the information. The implemented public types are
   announcement, emergency notice, event, recurring programme, service, education, FAQ and policy.
4. Add a specific title, lowercase hyphenated slug, short summary if useful, and the complete
   plain-text body. Complete the type-specific fields: for example, a public event requires its
   Europe/London start and approved location; a public policy requires its owner and effective date.
5. Add a category only if the Association has an agreed category vocabulary.
6. Use **Feature this item prominently** sparingly.
7. Save as **Draft** when another person needs to review it.
8. The **Scheduled** state becomes publicly effective at the validated time. Add an automatic expiry
   for time-limited information and verify the production clock before relying on it.
9. For immediate publication, choose **Published now**.
10. Select **Create content**, read the result message, and verify the public route or TV behaviour
    in a private browser window.

Announcements, emergency notices and events feed the home/news surfaces; notices can also feed the
TV display. Services and FAQs feed `/services`, education records feed `/education`, and policies
feed `/policies` with policy detail routes. Verify the intended signed-out surface before
publication; the content editor does not invent a new public route for arbitrary legacy kinds.

- **Screenshot checkpoint F:** blank create form.
- **Screenshot checkpoint G:** synthetic scheduled announcement showing Europe/London timing.
- **Screenshot checkpoint H:** content list showing draft, scheduled, published, and archived status
  examples using synthetic data.

## Edit, publish, unpublish, or expire content

1. Open **Content** and choose **Edit** beside the item.
2. Read the current status, summary, timing, and revision number before changing anything.
3. Make the smallest necessary change.
4. To publish immediately, choose **Published now** and save. To release later, choose **Scheduled**
   and verify its Europe/London timestamp.
5. To unpublish without soft deletion, change the status to **Draft** or **Archived** and save.
   Verify it disappears from every public surface.
6. To remove a temporary item automatically, set **Automatic expiry** later than its publication
   time.
7. Check the success message and public result. Do not rely on the admin status badge alone.

Changing a published item to a non-public state clears its publication metadata. Republishing
creates new publication metadata and a new content version.

## Publish an emergency notice

Use this only under the Association's approved emergency-message authority and escalation rota.

1. Confirm the message and removal time with the authorised incident owner.
2. Confirm AAL2 on **Security**.
3. Create or edit a content item with type **Emergency notice**.
4. Use a short factual title and summary. Do not include sensitive personal data, speculation, or
   unverified safety instructions.
5. Set an automatic expiry whenever the end time is known.
6. Select **Published now**. Avoid scheduling an emergency unless the authority and exact release
   time have been explicitly approved and tested.
7. Type `PUBLISH EMERGENCY` exactly in the confirmation field.
8. Save, then verify `/api/display`, `/tv`, and the relevant public page from a separate device.
9. Record the approver, publication time, evidence, and planned removal time in the incident/change
   record.
10. When the notice is no longer needed, change it to **Archived** or **Draft** and verify removal.

The TV prioritises the first emergency notice returned by the public notice query. Publish only one
active emergency notice unless the resulting priority has been explicitly tested. A connected TV
polls at the published display interval (60 seconds by default), but caches and connection state
mean operators must visually verify the screen rather than promise an exact propagation time.

## Restore an earlier revision

1. Open the content item's edit page.
2. Review **Revision history**; up to 20 earlier revisions are shown.
3. Choose **Restore as draft** beside the required version.
4. The restore never republishes automatically. Review the restored title, body, slug, timing, and
   category.
5. Publish only after normal approval and public verification.

If an item was soft-deleted with the **Archive** action, open **Content**, choose **Soft-deleted
archive**, review the record, then select **Restore as draft**. Restoration never republishes it.

- **Screenshot checkpoint I:** revision list with synthetic versions.
- **Screenshot checkpoint J:** restored item visibly in Draft state.

## Recover from an incorrect content edit

1. If the error is harmful or time-sensitive, first unpublish the item or publish a short approved
   correction/emergency notice.
2. Preserve evidence of the incorrect version; do not delete audit records.
3. Restore the last correct revision as a draft.
4. Review it against the approved source.
5. Republish and check every affected surface.
6. Record what happened, who approved the correction, and whether process or validation should
   change.

For an incorrect prayer timetable, follow the prayer-integrity incident section in the
[operations runbook](docs/operations/OPERATIONS-RUNBOOK.md). An authorised prayer publisher can
withdraw the published configuration to the safe unavailable state or atomically replace it with a
separate, fully validated draft.

## Manage website settings

`/admin/settings` contains fixed schemas for homepage content, website identity, contact/visit
information, navigation/footer, TV display, feature flags and public-enquiry controls. Keep
unconfirmed values blank and in Draft. Publishing a setting requires the applicable permission and
AAL2; publication does not replace the committee evidence required by the confirmation register.

Published identity, contact and navigation/footer records feed their public surfaces. The published
TV record controls refresh and notice-rotation intervals, prayer-hold length, Hijri-date/notices
visibility and the footer message; safe defaults apply when no valid TV record is published. The
public enquiry flag/configuration controls the form described below. Feature flags for donations and
registration do not create those optional features.

The public enquiry feature has two independent settings records. Its configuration must publish an
approved privacy-notice version, retention period, queue-owner role, monitoring schedule, fallback
procedure and a successful administrative route-test time from the preceding 90 days. The published
feature flag can then be enabled only while a current published privacy policy exists. Missing or
invalid dependencies leave the public form off.

## Manage prayer times safely

1. Open `/admin/prayer-times` and create a bounded draft, or clone an immutable published record or
   revision as a new draft.
2. Record the approved source, effective range, calculation/import mode, congregation rules, one or
   more Jumu'ah sessions, per-date overrides, and any Ramadan, Eid or other date-bounded seasonal
   arrangements.
3. Review the preview. Publication checks every date in the full bounded effective horizon; it is
   not limited to the few dates visible at first glance.
4. Record committee approval evidence, type `PUBLISH PRAYER TIMES`, and publish only with the
   prayer-publish permission and AAL2.

Published records are immutable. To correct one, prepare and review a replacement draft first. On
the published record, **Withdraw or atomically replace prayer times** requires a verified reason and
`WITHDRAW PRAYER TIMES`. With no replacement, all public prayer surfaces fail closed to the
unavailable state. With a replacement, the application validates that draft's entire effective
horizon and coverage, then archives the old record and publishes the replacement in one database
transaction. If validation or any part of the transaction fails, neither change commits.

## Media, enquiries and audit history

- `/admin/media` accepts raster JPEG, PNG, WebP and AVIF images up to the configured limits. It
  verifies the file signature, re-encodes the image, strips embedded metadata and stores the object
  in the private `media` bucket. Only a published, non-deleted metadata record can be delivered via
  `/media/[id]`; raw object bytes and service credentials are not public, and public pages use the
  stable asset ID rather than a Storage URL. PDF upload is fail-closed until production malware
  scanning/quarantine is implemented.
- `/admin/enquiries` is the only implemented notification/delivery destination for the public form.
  Authorised staff can filter, assign and update the private queue. Do not copy enquiry bodies into
  logs, screenshots or informal messages, and work to the displayed retention date.
- `/admin/audit` shows permission-scoped metadata for sensitive changes, with entity filtering and
  cursor pagination. It deliberately excludes enquiry bodies and is not a substitute for provider
  Auth, database or hosting logs.

## Operational limitations

- **PDF media:** upload is intentionally disabled until production malware scanning is configured.
  Raster images are auto-rotated, bounded, re-encoded and stripped of embedded metadata.
- **Enquiry alerts:** the implemented delivery path is the private staffed admin queue. Do not claim
  email/SMS notification; the public form remains off until its owner, monitoring schedule,
  fallback, privacy version, retention and recent route test are published.
- **First administrator:** the first super administrator still requires the controlled bootstrap in
  the deployment guide; later invitations and disabling are available in `/admin/users`.
- **Production proof:** the clean local Supabase acceptance job proves Auth, RLS and Storage against
  disposable containers. Provider configuration, live SMTP and the canonical domain still require
  the production credentials and approvals in the launch checklist.

## Local demonstration mode

Run `pnpm setup:local`, open the one-time super-administrator link printed by the command, then
enrol TOTP on **Security**. The dashboard banner identifies the environment, and every seeded
content or prayer record is marked as local demonstration data. Do not remove those labels.
Production must set `NEXT_PUBLIC_DEMO_MODE=false`, which excludes marked rows from all public
repositories.

Replace demonstration values through the normal settings, content, prayer and people/access pages.
No source-code edit is required. See
[Local product environment](docs/deployment/LOCAL-DEVELOPMENT.md) for the five role accounts,
Inbucket mail viewer, reset behavior and troubleshooting.

## Sign out and shared-device rules

Use **Sign out** at the end of every session. Do not leave an admin tab open on the mosque TV,
reception computer, or another shared device. Never use a shared committee identity. Report lost
devices, unexpected sign-in mail, wrong role/name, or suspected account use through the private
security route in [SECURITY.md](SECURITY.md).
