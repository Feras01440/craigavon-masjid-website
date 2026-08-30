# Quality assurance report

**Release candidate:** Production platform rebuild

**Evidence date:** 15 July 2026

**Decision:** **Technical release candidate PASS** at application commit `fd97cc6`. The complete
[CI run](https://github.com/Feras01440/craigavon-masjid-website/actions/runs/29441499018) and
[CodeQL run](https://github.com/Feras01440/craigavon-masjid-website/actions/runs/29441498715) are
the authoritative repository-controlled evidence. The nine real-world configuration and committee
approvals remain launch inputs, not unfinished software. Nothing in this report authorises a
production launch.

## Result discipline

`Pass` means the named check executed and its output was reviewed. `Implemented` means repeatable
evidence exists but its authoritative environment has not executed it. `Blocked` means credentials,
equipment or an approval unavailable to this repository are required. A partial run is not promoted
to a complete matrix pass.

## Executed release-candidate evidence

| Area                                    | Result                                       | Actual evidence                                                                                                                                                                                                                                                                       |
| --------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                        | Pass                                         | Registry-backed audit covered 568 dependencies and returned 0 info, low, moderate, high or critical vulnerabilities after PostCSS was updated to 8.5.17                                                                                                                               |
| Dependency Graph and source security    | Pass                                         | Dependency review, full-history Gitleaks, CodeQL and repository-local link integrity completed successfully at the application commit                                                                                                                                                 |
| Static application gates                | Pass                                         | Locked install, formatting, zero-warning lint, strict TypeScript check and the Next.js production build completed in CI                                                                                                                                                               |
| Unit/deterministic integration suite    | Pass                                         | 132 tests in 17 files, 0 failures; 91.22% statements, 83.54% branches, 94.64% functions and 92.79% lines                                                                                                                                                                              |
| Auth callback boundary                  | Pass                                         | 17 focused tests accept only one nonblank PKCE code or the exact hashed-OTP flow, preserve the authenticated callback client, and reject mixed, duplicate, empty and unsupported input                                                                                                |
| Clean migration and seed replay         | Pass                                         | The production migration and seed replayed from zero on clean PostgreSQL 17.10 twice                                                                                                                                                                                                  |
| Database roles/RLS/constraints/indexes  | Pass                                         | A disposable Supabase stack replayed both migrations and the deterministic seed from zero twice; schema lint passed and all 91 pgTAP assertions passed after each reset                                                                                                               |
| Public privacy boundary                 | Pass in repository tests                     | Public mappers and database grants exclude drafts, scheduled/expired/deleted content, private enquiries, administrator/profile/invitation data, audit internals and unapproved prayer data                                                                                            |
| Publication and administrator workflows | Pass                                         | Invitation, disable, recovery, multi-session revocation, TOTP, draft/preview/publish/edit/archive/revision restore, media, prayer, reviewer-denial and audit journeys passed deterministic and clean authenticated acceptance                                                         |
| TV accelerated soak                     | Pass                                         | 10 of 10 scenarios passed with two workers in 8.9 seconds, covering fit, midnight/Friday, both UK DST changes, multi-day outage, stale-data fail-closed behavior, recovery, notice expiry and offline state                                                                           |
| Cross-engine browser execution          | Pass                                         | The completed selection contains 385 checks: 360 non-TV checks passed across Chromium, Firefox and WebKit; the final TV project passed 10/10; 15 local-demo or viewport-inapplicable checks were intentionally skipped; no product assertion remains failing                          |
| External production-preview performance | Pass with recorded TV environment limitation | 30 Lighthouse cold runs through an external ephemeral HTTPS preview: public routes 99-100 Performance, 100 Accessibility and 100 Best Practices; TV 99-100 Performance, 100 Accessibility and 92 Best Practices because the no-Supabase preview correctly returned `/api/display` 503 |
| Automated accessibility                 | Pass for tested scope                        | Axe A/AA scans, public skip-link/navigation checks, reduced motion, forced colours and reflow checks passed in the configured browser projects; automation is not a manual screen-reader sign-off                                                                                     |

Detailed evidence is in:

- [Database P1 validation](DATABASE-P1-VALIDATION.md)
- [Operational workflow validation](OPERATIONAL-WORKFLOW-VALIDATION.md)
- [TV accelerated soak report](TV-ACCELERATED-SOAK-REPORT.md)
- [Accessibility report](ACCESSIBILITY-REPORT.md)
- [Performance evidence](PERFORMANCE-BUDGETS.md)
- [Backup and restore plan](../security/BACKUP-AND-RESTORE.md)

## Database and recovery boundary

The clean PostgreSQL runs prove migration ordering, deterministic seeds, SQL constraints, indexes,
grants, RLS policy decisions, publication/revision boundaries and cleanup in a fresh database. The
GitHub workflow now provisions the complete disposable local Supabase stack, resets it twice, runs
the 91 assertions twice, lints the database with warnings treated as failures, exercises Auth
invitation/ban/recovery/global-session-revocation, and restores a realistic custom-format logical
backup into a separately migrated database.

That provider-shaped workflow passed at application commit `fd97cc6`: 91/91 pgTAP assertions passed
after each of two clean resets; the Auth script proved signup denial, one-time invitation, disable,
password recovery, global session revocation and revoked-invite denial; and the logical restore
returned the expected non-zero data and relationship counts. This proves the disposable local
Supabase boundary, not provider-managed PITR, Storage-object restore or production RPO/RTO.

## Browser and viewport evidence

| Project            | Engine/viewport             | Executed evidence                                                                                                              | RC status                                       |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `chromium-mobile`  | Chromium, Pixel 7           | Public, accessibility, keyboard/preferences, forced colours, reduced motion and 200%-equivalent/320px reflow journeys          | Pass; one desktop-only navigation check skipped |
| `chromium-tablet`  | Chromium, 820 x 1180 touch  | Public, disclosure, accessibility, preferences and reflow journeys                                                             | Pass; one desktop-only navigation check skipped |
| `chromium-desktop` | Chromium, 1440 x 900        | Public, keyboard, accessibility, preferences, production and reflow journeys                                                   | Pass; one mobile-only navigation check skipped  |
| `firefox-desktop`  | Firefox, 1440 x 900         | Complete applicable public, accessibility, keyboard, preferences and reflow project                                            | Pass; one mobile-only navigation check skipped  |
| `webkit-mobile`    | WebKit, iPhone 13           | Complete applicable public, accessibility, keyboard, preferences and reflow project; keyboard preference difference documented | Pass; one desktop-only navigation check skipped |
| `tv-1080p`         | Chromium, 1920 x 1080 DPR 1 | 10/10 accelerated soak plus accessibility/fit coverage                                                                         | Pass                                            |

WebKit on Windows does not expose the native `tabFocusesLinks` preference used by Safari. The test
therefore verifies that the skip link is the first anchor in DOM order, focuses it explicitly, and
proves Enter transfers focus to `main`; Chromium and Firefox prove the real first-Tab behavior. This
is a documented platform limitation, not evidence of a hidden skip-link pass in native Safari.

## Release scenario status

| ID   | Gate                                                                | Result                                                                                                                                                         |
| ---- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | Public routes, 404, no-backend fail-closed state and public privacy | Pass in repository/browser coverage; repeat with approved staging data                                                                                         |
| P-02 | Chromium, Firefox, WebKit and responsive navigation                 | Pass: 385 selected, 370 applicable checks passed, 15 local-demo or viewport-inapplicable checks intentionally skipped, 0 unresolved failures                   |
| P-03 | TV midnight, Friday, DST, outage, stale data and recovery           | Pass, 10/10                                                                                                                                                    |
| D-01 | Migration, seed, constraints, indexes and RLS from zero             | Pass twice, 91/91 after each clean reset                                                                                                                       |
| D-02 | Full local Supabase/Auth/restore workflow                           | Pass in the authoritative release-candidate CI run                                                                                                             |
| A-01 | Invite, disable, revoke, recovery and multi-session boundaries      | Pass in unit/database/Auth/product acceptance; production email and named accounts remain launch inputs                                                        |
| C-01 | Draft, preview, schedule, expiry, revision restore and audit log    | Pass in unit/database and clean authenticated dashboard acceptance                                                                                             |
| B-01 | Realistic logical backup and restore                                | Pass for disposable-stack application data; provider PITR, Auth/configuration and independent Storage-object drills remain production operations               |
| X-01 | Manual public keyboard and screen-reader-oriented review            | Source/DOM and automated keyboard evidence available; native manual keyboard sign-off across every public journey and actual NVDA/VoiceOver review remain open |
| X-02 | Authenticated dashboard keyboard/screen-reader review               | Blocked on approved staging credentials and test identities                                                                                                    |
| F-01 | External HTTPS performance measurement                              | Pass for ephemeral production preview; permanent hosting-provider preview and representative-data rerun remain credential-blocked                              |

## Retained release evidence

- CI run `29441499018` at `fd97cc64e1fe5d92247bf2035bad30748498581d` records dependency audit,
  formatting, lint, typecheck, 132 tests and coverage, secret scan, link integrity, production
  build, Chromium accessibility, two clean Supabase resets, 91/91 pgTAP passes twice, Auth
  lifecycle, backup/restore and clean local product acceptance.
- CodeQL run `29441498715` completed successfully at the same application commit.
- The existing pull request remains a draft and must not be merged as part of technical validation.

## Final launch configuration

The completed software accepts these values without code changes:

1. approved prayer and Jumu'ah values;
2. approved contact information;
3. production domain and DNS;
4. production Supabase credentials;
5. production Vercel credentials;
6. production email credentials;
7. real committee administrator accounts;
8. approved policies and public content; and
9. committee sign-off.

## Non-blocking technical limitations

- Automated keyboard and screen-reader-oriented DOM evidence is comprehensive, but this workstation
  did not provide native NVDA, VoiceOver or mobile Safari spoken-output evidence.
- Accelerated browser soak covers clock changes, outage and recovery; physical TV power-loss,
  full-screen scaling and viewing-distance acceptance depend on the selected display.
- Logical backup/restore is rehearsed in the disposable stack; provider-managed PITR and Storage
  restore measurements belong to production Supabase operations once its credentials exist.
- PDF upload remains fail-closed until the committee approves a malware scanning and quarantine
  design.
- The TV external-preview Best Practices score is 92 because the deliberately unconfigured preview
  returns the expected `/api/display` 503; its Performance score is 99-100 and Accessibility is 100.

## Release-candidate conclusion

**Current result: TECHNICAL RELEASE CANDIDATE PASS.** The software-controlled application, database,
Auth, browser, accessibility, security, recovery, TV and performance gates are green at the
application commit. The nine real-world values and committee sign-off remain launch configuration,
native assistive-technology/physical-TV and provider recovery checks remain documented limitations,
and the draft pull request must remain unmerged.
