# ADR-002: Prayer publication integrity and safe withdrawal

- **Status:** Accepted
- **Decision date:** 2026-07-13
- **Scope:** Prayer calculation, publication validation, public reads, replacement, withdrawal and
  database privileges

## Decision

Prayer settings remain private drafts until an authorised prayer publisher with an `aal2` session
records approval and explicitly publishes them. Publication has a bounded effective horizon:

- `effective_to` is mandatory for a published configuration;
- the inclusive period from `effective_from` through `effective_to` may contain at most 366 days;
- every effective date is recalculated before publication, including UK clock changes, every dated
  override and every Friday/Jumu'ah session; and
- any error blocks publication. The admin table may show only the next 30 applicable days for
  readability, but its finding counts and the publish action cover the complete effective horizon.

Congregation joins must point directly to a fixed or offset congregation rule. Self-joins, cycles,
multi-hop joins and joins to an unavailable target are invalid. A configured prayer with no resolved
congregation time is a publication error, not a warning.

Public repository reads are all-or-nothing. A request for multiple dates returns an approved bundle
only when every requested date is covered exactly once and the generated dates are contiguous. A
gap, invalid configuration or unsafe result returns the calm unavailable state; partial timetables
are never returned.

## Database mutation boundary

Prayer mutation functions are narrowly authorised `SECURITY DEFINER` RPCs with an empty
`search_path`. Draft/override functions use the authenticated administrator and check prayer
permission plus MFA assurance directly. Publish and withdrawal RPCs are granted only to
`service_role`: the Server Action first authenticates and authorises the administrator, then the RPC
establishes that trusted actor and repeats the permission/AAL2 check for audit attribution.
Authenticated users retain read grants but have no direct insert, update or delete grant on prayer
tables. This lets the RPC replace draft Jumu'ah children and delete overrides as one transaction
without granting broad table deletion rights.

Published rows and their children remain immutable. The sole exception is
`withdraw_prayer_settings`, which can change `published` to `archived` after checking
`prayer:publish`, `aal2`, optimistic version and a mandatory 10–1,000 character reason. The parent
version trigger snapshots the full settings row plus Jumu'ah sessions, overrides and seasonal
arrangements before the status change. Failure to create that snapshot aborts the transaction.

The same RPC can atomically publish a replacement draft. The replacement must have its own approval
record, match the reviewed version, cover the next date that the withdrawn timetable would serve,
have a bounded horizon and pass the application's complete-horizon validation. Archiving the old
row, publishing the replacement, creating revisions and writing audit records occur in one database
transaction; any constraint or child-snapshot failure rolls back every change.

The immutable audit log records actor, withdrawal/replace action, affected versions, reason and
replacement identity. Revision history also carries the withdrawal or atomic replacement reason.

## Operational consequence

Withdrawing without a replacement deliberately makes public prayer surfaces unavailable. This is the
safe response when the committee has confirmed that published data is wrong but has not yet approved
a correction. Operators must verify `/api/prayer`, `/api/display`, `/prayer-times`, `/tv` and any
printed/downloaded timetable immediately after withdrawal or replacement.
