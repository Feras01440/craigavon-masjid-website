# Launch checklist

Every item starts unchecked. Tick it only when the named owner attaches current evidence for the
exact production environment. Documentation, code presence, a successful build, or a provider
dashboard screenshot alone is not proof that an end-to-end control works.

## Current release-candidate evidence map

This section records executed technical evidence as of 15 July 2026; it does **not** check any
production launch item below.

| Gate                                   | Current evidence                                                                                                                                                                                                                                                                                                    | What remains before the item can be checked                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Local application quality              | Locked install, formatting, zero-warning lint, strict typecheck, production build and 132 Vitest tests in 17 files passed in CI; coverage is 91.22% statements/83.54% branches/94.64% functions/92.79% lines                                                                                                        | No repository-controlled P1 work; retain the green release evidence                                                               |
| Dependency security                    | Registry audit found zero vulnerabilities across 568 dependencies; Dependency Graph/review, full-history Gitleaks, CodeQL and link integrity are green                                                                                                                                                              | Approved provider owners/access and ongoing dependency response                                                                   |
| Clean database and RLS                 | Disposable Supabase replayed migrations/seeds from zero twice; schema lint and 91/91 assertions passed twice across anonymous, non-admin, every role, disabled identity, constraints, indexes, revisions, expiry, audit and prayer publication                                                                      | Repeat in production with the supplied Supabase credentials                                                                       |
| Administrator/content workflows        | Auth invitation/disable/recovery/session revocation passed; clean product acceptance passed public plus TOTP, draft/preview/publish/edit/archive/revision, media, prayer, reviewer denial, audit and sign-out journeys                                                                                              | Production email credentials, exact domain and real committee accounts                                                            |
| Backup and restore                     | Authoritative realistic logical database backup/restore passed in a separately migrated disposable database with non-empty sample data, relationships, indexes and constraints                                                                                                                                      | Provider PITR, independent Storage-object, Auth/configuration and measured production RPO/RTO drill                               |
| Browser, accessibility and performance | The completed 385-check Chromium/Firefox/WebKit/TV selection passed all 370 applicable checks with 15 intentional local-demo/viewport skips; the 10/10 TV soak and 30 external HTTPS Lighthouse runs passed their budgets; public DOM/screen-reader-oriented and 200%-equivalent/320px reflow reviews were recorded | Native assistive-technology and physical-TV checks remain device limitations; permanent hosting uses the final domain/credentials |
| Launch authority                       | No technical test supplies factual prayer, identity, privacy, brand, people or operating authority                                                                                                                                                                                                                  | Committee register, named owners, approved credentials/domain/email/provider plans and go/no-go signatures                        |

Detailed evidence and limitations are in the [QA report](../quality/QA-REPORT.md),
[database P1 validation](../quality/DATABASE-P1-VALIDATION.md),
[operational workflow validation](../quality/OPERATIONAL-WORKFLOW-VALIDATION.md),
[TV accelerated soak report](../quality/TV-ACCELERATED-SOAK-REPORT.md),
[accessibility report](../quality/ACCESSIBILITY-REPORT.md), and
[performance budgets](../quality/PERFORMANCE-BUDGETS.md).

## Final configuration still required

- [ ] Approved prayer and Jumu'ah values.
- [ ] Approved contact information.
- [ ] Production domain and DNS.
- [ ] Production Supabase credentials.
- [ ] Production Vercel credentials.
- [ ] Production email credentials.
- [ ] Real committee administrator accounts.
- [ ] Approved policies and public content.
- [ ] Committee sign-off.

Repository-controlled acceptance is recorded in
[CI run 29441499018](https://github.com/Feras01440/craigavon-masjid-website/actions/runs/29441499018)
and
[CodeQL run 29441498715](https://github.com/Feras01440/craigavon-masjid-website/actions/runs/29441498715)
at application commit `fd97cc64e1fe5d92247bf2035bad30748498581d`. The detailed production checklists
below remain unchecked until those nine inputs are supplied and the checks execute in the exact
production environment.

## Ownership and approvals

- [ ] Name primary and backup release, technical, database/Auth, DNS/email, prayer, content,
      privacy/safeguarding, security, and TV owners.
- [ ] Confirm a private monitored incident/security reporting route.
- [ ] Record go/no-go authority and rollback authority.
- [ ] Complete the committee confirmation register with sources, dates, approvers, and public
      wording.
- [ ] Approve launch scope; all deferred or disabled features are explicitly listed.

## Repository and quality gate

- [ ] Release commit, branch, pull request, and change summary are recorded.
- [ ] Required reviews and CODEOWNERS are configured with real approved identities; placeholders are
      removed.
- [ ] Formatting, lint, strict typecheck, unit/integration tests, coverage, migration replay/lint,
      dependency audit, secret scan, CodeQL, link check, and production build pass on the release
      commit.
- [ ] Browser job log proves Playwright specs ran on the required projects; it did not take the
      empty-spec skip path.
- [ ] QA report lists browsers, viewports, routes, dates, results, console errors, accessibility
      findings, and accepted exceptions.
- [ ] No unresolved critical/high security, prayer-integrity, accessibility, privacy, or data-loss
      defect remains.
- [ ] Build output/source maps and Git history contain no secrets or personal data.

## Staging

- [ ] Protected staging uses a fixed approved origin, isolated Supabase project, synthetic data, and
      non-production credentials.
- [ ] Staging migrations apply from a clean database and match migration history.
- [ ] Auth Site URL/callback, invite, magic link, expiry, one-time use, disabled user, role denial,
      TOTP enrolment, and AAL2 are tested.
- [ ] Content draft/publish/expiry/emergency/concurrency/archive/revision restore journeys are
      tested; scheduled effective/expiry instants are proven end to end.
- [ ] Prove direct anonymous base-table and raw-object access is denied; exercise every role's
      Postgres/Storage RLS matrix and the server-mediated public projections.
- [ ] Admin routes are private/no-store/noindex; drafts and staging pages cannot be indexed.
- [ ] Required screenshot checkpoints are captured with synthetic/redacted data and no QR codes,
      tokens, or secrets.

## Supabase production

- [ ] Organisation, project owners, region, plan, quotas, budget alerts, and log retention are
      approved.
- [ ] Production secrets are stored only in provider secret stores and differ from staging.
- [ ] `supabase migration list` and `db push --dry-run` are reviewed; one operator applies the
      recorded migration set.
- [ ] RLS, grants, database functions, audit triggers, constraints, and private `media` policies are
      verified in production.
- [ ] The private Storage bucket denies anonymous object access; mediated published delivery and a
      separate object backup are verified.
- [ ] Backup schedule/retention meets the recovery objective; a restore drill has succeeded in an
      isolated environment.
- [ ] Database, Storage objects, provider configuration, environment variables, DNS/email
      configuration evidence, and recovery credentials are covered separately.

## Auth, email, and administrators

- [ ] Public sign-up remains disabled.
- [ ] Exact production Site URL and `/admin/auth/callback` are allowed; no unnecessary wildcard
      production redirect remains.
- [ ] Approved custom SMTP, From/reply route, SPF, DKIM, DMARC, and link-tracking settings are
      verified.
- [ ] Delivery failure, expiry, link prefetch/safe-link behaviour, and non-enumerating responses are
      tested.
- [ ] At least two named super administrators are bootstrapped, each with an individual account and
      verified TOTP.
- [ ] Invite, disable, session revocation, lost-factor recovery, and offboarding procedures are
      tested and owned.
- [ ] Service-role/database/provider credentials never reach the browser or routine committee
      devices.

## Public content and privacy

- [ ] Official name, logo, domain, address, map, contact channels, service/facility/access claims,
      and social links are approved.
- [ ] Privacy, accessibility, safeguarding, complaints/feedback, terms, cookie, donation, and
      retention wording is approved or the related feature remains absent.
- [ ] All Islamic content/Arabic/translation/citations have documented qualified review and
      licensing.
- [ ] No fictional events, services, history, geographical claims, testimonials, statistics,
      contacts, or opening times are public.
- [ ] No public form/enquiry/email notification is exposed until purpose, minimisation, abuse
      controls, retention, recipient access, and safeguarding are approved and tested.
- [ ] If enquiries are enabled, the trusted proxy-header contract, private staffed queue, recent
      route test and secret-authorised retention `POST` are proven. The POST purges expired
      enquiries and eligible inactive rate-limit fingerprints older than 48 hours; no unimplemented
      email alert is claimed.
- [ ] Raster media is provenance/consent checked and delivered only through the mediated route; PDF
      upload remains fail-closed until an approved malware scanner/quarantine is evidenced.
- [ ] Emergency-message authority, rota, alternate channels, review interval, and removal procedure
      are rehearsed.

## Prayer integrity

- [ ] Committee approves calculation source/method, coordinates, timezone, madhab, high-latitude
      rule, adjustments, congregation rules, Jumu'ah sessions, Maghrib/Isha policy, Hijri
      adjustment, Ramadan/Eid arrangements, overrides, and source reference.
- [ ] A named qualified approver records the exact prayer configuration version and effective dates.
- [ ] At least 30 future days are previewed against the approved source before publication.
- [ ] Tests/evidence cover spring/autumn DST, high-latitude summer, winter, Fridays, multiple
      Jumu'ah, leap year, month boundaries, device timezone, midnight, missing congregation,
      overrides, Ramadan/Hijri adjustment, offline, and service outage.
- [ ] `/api/prayer`, `/api/display`, `/prayer-times`, download/print, home, and `/tv` agree on dates
      and approved values.
- [ ] Incorrect published prayer data can be withdrawn safely and audited without production
      improvisation.
- [ ] Unavailable data shows a calm warning and no fabricated congregation time.

## Accessibility, content, and performance

- [ ] Public and admin principal journeys pass documented keyboard, screen reader, zoom 200%,
      reflow, reduced-motion, forced-colours/high-contrast, touch-target, and Arabic
      direction/language checks.
- [ ] Automated accessibility scans have no untriaged critical/serious issue; manual testing is
      recorded separately.
- [ ] Mobile, tablet, desktop, 1080p TV, and 4K TV layouts are verified on real/representative
      devices.
- [ ] Performance budgets and measured production-like results are recorded; no unsupported
      Lighthouse claim is made.
- [ ] Internal links, 404/error states, metadata, canonical URLs, structured data, robots, sitemap,
      and redirects are verified.

## TV display

- [ ] Named device owner, location, network, operating hours, backup notice method, and physical
      access controls are approved.
- [ ] Device clock synchronisation, automatic updates/restart, browser full-screen/kiosk,
      wake/sleep, and screen burn-in controls are configured.
- [ ] Online refresh, connection loss/recovery, stale payload label, midnight/date change, four-day
      cache exhaustion, unavailable data, emergency mode, notice removal, and the configured prayer
      hold are tested.
- [ ] A multi-day 1080p and 4K soak test is recorded with clock/DST simulation and no
      console/runtime failure.
- [ ] Operators know not to reload/clear site data while offline and have printed/announced fallback
      times.

## Deployment, domain, and recovery

- [ ] Production Vercel variables match the production Supabase project and exact canonical HTTPS
      origin.
- [ ] A staged production build passes the smoke checks in
      [PRODUCTION-DEPLOYMENT.md](../deployment/PRODUCTION-DEPLOYMENT.md).
- [ ] Last-known-good deployment ID, migration state, backup recovery point, rollback operator, and
      decision threshold are recorded.
- [ ] Domain ownership, exact DNS records, canonical redirect, TLS certificate, HSTS, and
      preservation of email DNS records are verified.
- [ ] Post-domain Auth callback and email tests pass.
- [ ] Hosting/database/Auth/Storage usage, errors, backups, and cost alerts reach named responders.
- [ ] Code rollback and database/data/configuration recovery are rehearsed as separate operations.

## Go/no-go record

- [ ] Technical owner: approved with evidence link and timestamp.
- [ ] Prayer owner: approved exact version/effective range with evidence link and timestamp.
- [ ] Content/brand owner: approved with evidence link and timestamp.
- [ ] Privacy/safeguarding owner: approved with evidence link and timestamp.
- [ ] Security owner: approved with evidence link and timestamp.
- [ ] Launch owner: gives final go decision and records observation window.
- [ ] Post-launch smoke checks pass on the canonical domain.
- [ ] Handover names the duty owner and next scheduled review.
