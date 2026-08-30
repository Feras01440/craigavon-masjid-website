# Operational workflow validation

## Purpose

This note records repository-controlled evidence for content publication boundaries, public privacy
and the administrator lifecycle. Database RLS, migration replay and recovery details are recorded in
the database and backup reports.

## Automated workflow evidence

| ID            | Workflow                                 | Evidence                                                                                                                                 | Status                      |
| ------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| WF-CONTENT-01 | Schedule approved content                | Server action requires `content:write`, `content:publish` and AAL2, then converts Europe/London wall time to an unambiguous UTC instant  | Pass in definitive unit run |
| WF-CONTENT-02 | Reject invalid publication/expiry window | Expiry at or before publication is refused before a database write                                                                       | Pass in definitive unit run |
| WF-CONTENT-03 | Restore an earlier revision              | Snapshot is restored as a draft with publication identity/time cleared and soft deletion cleared; the public mapper refuses it           | Pass in definitive unit run |
| WF-CONTENT-04 | Archive content                          | Optimistic version match is required and the record becomes soft-deleted/archived                                                        | Pass in definitive unit run |
| WF-PUBLIC-01  | Public content projection                | Explicit projection excludes creator/editor/version, administrator, enquiry and audit fields                                             | Pass in definitive unit run |
| WF-PUBLIC-02  | Draft/scheduled/expired/deleted boundary | Mapper accepts only approved in-window rows and rejects drafts, premature schedules, expiry boundary, deleted rows and unsupported kinds | Pass in definitive unit run |
| WF-PUBLIC-03  | TV/public notice projection              | Notice repository exposes presentation fields only and enforces approval, publication and expiry filters                                 | Pass in definitive unit run |
| WF-ADMIN-01   | Invite administrator                     | `users:manage` plus AAL2 is required; a seven-day application invite and MFA-required least-privilege profile accompany the Auth invite  | Pass in definitive unit run |
| WF-ADMIN-02   | Compensate failed invitation             | If the application invite cannot be recorded, the newly created Auth identity is deleted                                                 | Pass in definitive unit run |
| WF-ADMIN-03   | Disable administrator                    | Self-disable is rejected; disabling another profile writes the authoritative disabled state and invokes the long Auth ban                | Pass in definitive unit run |
| WF-ADMIN-04   | Deny disabled/unapproved sessions        | Valid-looking Auth claims cannot bypass a disabled, missing or unaccepted application profile                                            | Pass in definitive unit run |
| WF-ADMIN-05   | Revoke pending invitation                | Invite is marked revoked and an unused invited Auth identity is removed                                                                  | Pass in definitive unit run |
| WF-ADMIN-06   | Account recovery/sign-in link            | OTP request does not create an account and returns a non-enumerating response                                                            | Pass in definitive unit run |
| WF-ADMIN-07   | Local sign-out                           | Auth sign-out is invoked for the local session before redirecting to signed-out state                                                    | Pass in definitive unit run |

## Execution record

- Date: 15 July 2026
- Application commit: `fd97cc64e1fe5d92247bf2035bad30748498581d`
- Authoritative run:
  [CI 29441499018](https://github.com/Feras01440/craigavon-masjid-website/actions/runs/29441499018)
- Unit result: **Pass - 17 files, 132 tests, 0 failures; 91.22% statements, 83.54% branches, 94.64%
  functions and 92.79% lines**
- Clean database result: **Pass - both migrations and the deterministic seed replayed from zero
  twice; 91/91 pgTAP assertions passed after each reset; schema lint passed**
- Full local Supabase/Auth/recovery result: **Pass - invitation, disable, recovery, global session
  revocation and revoked-invite lifecycle plus realistic logical backup/restore all passed**
- Clean local product acceptance: **Pass - two serial end-to-end journeys covered the complete
  public product and authenticated administrator/reviewer workflows**

The 91 committed database assertions form the release suite for populated-row allow and deny cases
across anonymous, authenticated non-admin, website editor, prayer editor, enquiries manager and
super administrator identities, plus the read-only reviewer. They also cover invited/disabled
profiles, AAL1 denials, publication/revision boundaries, append-only audit data and the absence of
anonymous grants on all application tables. See `DATABASE-P1-VALIDATION.md` for the exact policy and
table inventory.

## Auth lifecycle integration result

The disposable-Supabase workflow now exercises more than mocked server actions. Its checked-in Auth
script verifies:

1. invitation acceptance and one-time use;
2. ban/disable followed by refresh-token denial;
3. recovery-token exchange, actual password update and password sign-in;
4. two independent active sessions;
5. global logout/session revocation and denial of both former refresh tokens; and
6. successful password sign-in after revocation, proving session revocation does not silently
   destroy the account.

Unexpected success statuses and non-JSON error bodies fail the script. The complete lifecycle passed
against the disposable Supabase Auth service in the authoritative CI run. This is local-service
evidence, not proof of production SMTP delivery, provider configuration or named committee accounts.

## Public privacy evidence

Repository, database and clean product-acceptance tests prove that public content and notice
repositories expose only their explicit presentation fields and approved, in-window rows. Drafts,
future schedules, expired or archived records, revision internals, private enquiries, administrator
profiles/invitations, permissions and audit details are excluded. Anonymous SQL roles have no direct
application-table grants. Production repetition uses the approved Supabase credentials and content.

## Authenticated local product acceptance

The clean local product job passed. It creates local-only Auth identities for every role, enrolls
TOTP, signs in through a hashed magic link, creates/previews/publishes/edits/archives content,
restores a revision, uploads validated media, clones and edits prayer configuration, creates a dated
override, proves reviewer mutation denial at both RLS and UI boundaries, checks attributed audit
entries and signs out. Its demonstration rows are visibly labelled and cannot be selected publicly
outside explicit loopback demo mode.

## Final production repetition

The following production repetitions must not be inferred from the disposable-stack result:

1. invitation email delivery, exact redirect allowlist and successful first activation in the
   selected Supabase Auth project;
2. authenticator enrolment and AAL2 upgrade on the committee administrator's real device;
3. browser-visible denial of previously issued access/refresh tokens after disable/ban, including a
   second real browser session;
4. account-recovery email delivery and one-time-link behavior through the approved email provider;
5. authenticated keyboard/screen-reader review of preview, scheduling, expiry, revision restoration,
   audit, user administration and security workflows;
6. notification/audit visibility in the selected monitoring service; and
7. committee approval of the named people assigned to every privileged role.

These repetitions use the final production email credentials, real committee administrator accounts
and committee sign-off. They do not require further application development.
