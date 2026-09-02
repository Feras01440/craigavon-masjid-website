# Quality assurance report

**Release candidate:** Production platform rebuild

**Evidence date:** 15 July 2026

**Decision at this working tree:** **Local technical acceptance passes.** The release commit still
needs green GitHub Actions, including the clean local Supabase and authenticated product-acceptance
jobs. The nine real-world configuration and committee approvals remain launch inputs, not unfinished
software. Nothing in this report authorises a production launch.

## Result discipline

`Pass` means the named check executed and its output was reviewed. `Implemented` means repeatable
evidence exists but its authoritative environment has not executed it. `Blocked` means credentials,
equipment or an approval unavailable to this repository are required. A partial run is not promoted
to a complete matrix pass.

## Executed release-candidate evidence

| Area                                    | Result                                           | Actual evidence                                                                                                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                        | Pass                                             | Registry-backed audit covered 568 dependencies and returned 0 info, low, moderate, high or critical vulnerabilities after PostCSS was updated to 8.5.17                                                                                                                               |
| Dependency Graph prerequisite           | Pass                                             | GitHub Dependency Graph was enabled and the repository saved the setting; dependency review still has to pass at the release commit                                                                                                                                                   |
| Static application gates                | Pass on current tested worktree                  | Zero-warning lint, strict TypeScript check and the Next.js production build completed                                                                                                                                                                                                 |
| Unit/deterministic integration suite    | Pass                                             | 129 tests in 17 files, 0 failures; 89.34% statements, 81.90% branches, 90.17% functions and 91.25% lines                                                                                                                                                                              |
| Auth callback boundary                  | Pass                                             | 16 focused tests accept only one nonblank PKCE code or the exact hashed-OTP flow and reject mixed, duplicate, empty and unsupported input before client creation                                                                                                                      |
| Clean migration and seed replay         | Pass                                             | The production migration and seed replayed from zero on clean PostgreSQL 17.10 twice                                                                                                                                                                                                  |
| Database roles/RLS/constraints/indexes  | Pass on prior clean baseline; current CI pending | All 84 baseline pgTAP assertions passed on both clean PostgreSQL replays. The completed product migration expands the committed suite to 91 assertions; authoritative zero-state Supabase execution is the release-commit CI gate.                                                    |
| Public privacy boundary                 | Pass in repository tests                         | Public mappers and database grants exclude drafts, scheduled/expired/deleted content, private enquiries, administrator/profile/invitation data, audit internals and unapproved prayer data                                                                                            |
| Publication and administrator workflows | Pass in repository tests                         | Invitation compensation, disable/self-disable denial, recovery non-enumeration, session boundaries, draft/preview/schedule/expiry/archive/revision restoration and audit behavior passed deterministic unit/database checks                                                           |
| TV accelerated soak                     | Pass                                             | 10 of 10 scenarios passed with two workers in 8.9 seconds, covering fit, midnight/Friday, both UK DST changes, multi-day outage, stale-data fail-closed behavior, recovery, notice expiry and offline state                                                                           |
| Cross-engine browser execution          | Pass                                             | The completed selection contains 385 checks: 360 non-TV checks passed across Chromium, Firefox and WebKit; the final TV project passed 10/10; 15 local-demo or viewport-inapplicable checks were intentionally skipped; no product assertion remains failing                          |
| External production-preview performance | Pass with recorded TV environment limitation     | 30 Lighthouse cold runs through an external ephemeral HTTPS preview: public routes 99-100 Performance, 100 Accessibility and 100 Best Practices; TV 99-100 Performance, 100 Accessibility and 92 Best Practices because the no-Supabase preview correctly returned `/api/display` 503 |
| Automated accessibility                 | Pass for tested scope                            | Axe A/AA scans, public skip-link/navigation checks, reduced motion, forced colours and reflow checks passed in the configured browser projects; automation is not a manual screen-reader sign-off                                                                                     |

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

That provider-shaped workflow has not yet produced an authoritative result for the release commit.
The workstation did not have the full Docker/Supabase runtime, so local PostgreSQL compatibility
must not be presented as proof of GoTrue, PostgREST, Storage or provider backup behavior.

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
| D-01 | Migration, seed, constraints, indexes and RLS from zero             | Prior clean baseline passed twice, 84/84; expanded 91-assertion release suite awaits release-commit Supabase CI                                                |
| D-02 | Full local Supabase/Auth/restore workflow                           | Implemented; awaiting GitHub Actions at the release commit                                                                                                     |
| A-01 | Invite, disable, revoke, recovery and multi-session boundaries      | Unit/database evidence passes; clean local Auth lifecycle and TOTP acceptance are implemented in CI; production email and named accounts remain launch inputs  |
| C-01 | Draft, preview, schedule, expiry, revision restore and audit log    | Repository evidence passes; clean local authenticated dashboard acceptance is implemented in CI                                                                |
| B-01 | Realistic logical backup and restore                                | Rehearsal is implemented in CI; authoritative Supabase-stack execution and provider/Storage drill remain                                                       |
| X-01 | Manual public keyboard and screen-reader-oriented review            | Source/DOM and automated keyboard evidence available; native manual keyboard sign-off across every public journey and actual NVDA/VoiceOver review remain open |
| X-02 | Authenticated dashboard keyboard/screen-reader review               | Blocked on approved staging credentials and test identities                                                                                                    |
| F-01 | External HTTPS performance measurement                              | Pass for ephemeral production preview; permanent hosting-provider preview and representative-data rerun remain credential-blocked                              |

## Evidence still required at the release commit

1. Push the release commit to the existing draft pull request and require green GitHub Actions,
   including dependency review/audit, Gitleaks, CodeQL, link integrity and the complete disposable
   Supabase migration/Auth/recovery/restore job.
2. Review CI artifacts and rerun any flaky or failed job after correcting its cause; do not merge
   the draft pull request as part of this validation.

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

## Release-candidate conclusion

**Current result: PASS locally / PENDING release-commit CI.** The software-controlled application,
browser, accessibility, security, TV and performance gates are green on the completed worktree.
Technical RC status becomes final only when the pushed commit passes every GitHub Actions job. The
nine real-world values and committee sign-off remain launch configuration, and the draft pull
request must remain unmerged.
