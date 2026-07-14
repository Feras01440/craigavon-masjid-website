# Quality assurance report

**Release candidate:** Production platform rebuild

**Evidence date:** 14 July 2026

**Overall status:** The automated Chromium production matrix passed. Launch approval still requires
the cross-engine, manual accessibility, approved-data, authenticated, operational and performance
evidence listed below.

## Result discipline

"Implemented" means a repeatable check exists. "Passed" is used only after that check ran against
the release candidate and its output was reviewed. Pending rows must not be presented as successful
test results.

## Executed evidence

| Area                                         | Command or review                                                  | Result                                        | Evidence                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| E2E scope definition                         | Repository source and route review                                 | Complete                                      | `tests/e2e/`                                                                                             |
| Viewport matrix and stable failure artifacts | Playwright configuration review                                    | Complete                                      | `playwright.config.ts`                                                                                   |
| Test discovery                               | `playwright test --list`                                           | Pass - 185 checks                             | Six configured projects across five specification files                                                  |
| Formatting                                   | `pnpm format:check`                                                | Pass                                          | All matched files use Prettier code style                                                                |
| Static analysis                              | `pnpm lint`; `pnpm typecheck`                                      | Pass                                          | Zero ESLint warnings/errors; strict TypeScript check completed                                           |
| Unit and deterministic integration tests     | `pnpm test`; `pnpm test:coverage`                                  | Pass - 96 tests in 12 files                   | 91.13% statements, 83.65% branches, 95.19% functions and 93.16% lines                                    |
| Focused logo regression                      | Public-route contract plus five repeats at each responsive profile | Pass - 42 contract checks and 15/15 repeats   | Official header/footer asset loaded at mobile, tablet and desktop widths                                 |
| Production Chromium execution                | Four-project Playwright production-build run                       | Pass - 110 passed, 3 expected skips, 0 failed | Chromium phone, tablet, desktop and 1080p TV; 1.4 minutes; locally installed Microsoft Edge channel      |
| Production build                             | `pnpm build`                                                       | Pass                                          | Next.js production compilation, TypeScript, page-data collection and static generation completed         |
| Representative visual evidence               | `node scripts/capture-qa-evidence.mjs`                             | Pass                                          | Desktop home and confirmed test-fixture TV screenshots refreshed in `docs/quality/evidence/`             |
| Local secret-pattern review                  | High-confidence token pattern scan of non-ignored files            | Pass - no matches                             | CI Gitleaks remains the authoritative full-history gate                                                  |
| Dependency audit                             | `pnpm audit --audit-level=high`                                    | Not verified                                  | Registry access was unavailable in the managed environment; the committed CI dependency job remains open |

The production execution used the definitive `next start` build after the final application,
security and logo-delivery changes. The three skips are intentional viewport-specific exclusions,
not failures.

## Official-logo regression evidence

The failed element was the home-page footer image at tablet and desktop widths. The header image
loaded, and the shared static WebP returned HTTP 200, but Chromium left the footer image with
`complete=false`, `naturalWidth=0` and an empty `currentSrc`. Both instances used the same already
compressed local logo through different responsive `next/image` candidate sets. Loading the footer
eagerly alone did not resolve candidate selection after programmatic scrolling.

Both fixed-size logo instances now use direct, unoptimised delivery of the 5,134-byte WebP. The
header remains prioritised, the footer remains eager, and both retain explicit intrinsic dimensions,
decorative empty alternative text and visible adjacent organisation text. This removes the redundant
responsive optimiser candidate sets without changing the authorised artwork. The complete 42-check
public-route contract passed, followed by 15/15 focused checks: five consecutive executions at each
mobile, tablet and desktop profile.

## Automated E2E coverage

| Area              | Assertions                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Public routes     | Successful document response, language, one `main`, one `h1`, expected heading, title, security headers, no horizontal overflow |
| 404               | HTTP 404, helpful heading and links, `noindex`                                                                                  |
| Content integrity | No common mojibake or replacement-character markers in rendered copy                                                            |
| Accessibility     | Axe WCAG A/AA rule sets across public route types and the TV display                                                            |
| Keyboard          | First-focus skip link, focus transfer, mobile/tablet menu, desktop navigation                                                   |
| User preferences  | Reduced-motion preference disables smooth scrolling and long animation/transition durations                                     |
| No environment    | Prayer and content fallbacks withhold unapproved or stale information                                                           |
| Public APIs       | No-environment prayer/display responses fail closed and disable caching                                                         |
| TV display        | 1920 x 1080 fit, safe no-timetable state, confirmed fixture, connection status and offline event handling                       |

## Browser and viewport matrix

| Project            | Engine   | Viewport/device    | Purpose                                 | Status                        |
| ------------------ | -------- | ------------------ | --------------------------------------- | ----------------------------- |
| `chromium-mobile`  | Chromium | Pixel 7 profile    | Phone layout and touch navigation       | Pass on definitive production |
| `chromium-tablet`  | Chromium | 820 x 1180, touch  | Tablet disclosure breakpoint and reflow | Pass on definitive production |
| `chromium-desktop` | Chromium | 1440 x 900         | Primary desktop release path            | Pass on definitive production |
| `firefox-desktop`  | Firefox  | 1440 x 900         | Cross-engine semantics and layout       | Pending browser execution     |
| `webkit-mobile`    | WebKit   | iPhone 13 profile  | Mobile Safari approximation             | Pending browser execution     |
| `tv-1080p`         | Chromium | 1920 x 1080, DPR 1 | Dedicated prayer display                | Pass on definitive production |

Failure runs retain a trace, screenshot and, when available, video. Screenshot comparisons use
disabled animations, a hidden caret, CSS-pixel scaling and a 1% maximum pixel ratio. Visual
baselines should only be approved from a production build on the pinned Playwright version.

## Representative visual evidence

- [Home page - desktop 1440 x 900](evidence/final-home-desktop.png) shows the production no-backend
  safe state and the official Facebook-derived visual identity.
- [TV display - confirmed automated fixture at 1920 x 1080](evidence/final-tv-1080p-confirmed-fixture.png)
  demonstrates the populated timetable layout and fit. Its prayer values are generated test data,
  not production or committee-approved prayer times.

The evidence can be regenerated against a running production build:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3000"
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = "msedge"
node scripts/capture-qa-evidence.mjs
```

## Release test matrix

| ID   | Scenario                                              | Expected result                                                                  | Status                                                     |
| ---- | ----------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| P-01 | Visit each public route without Supabase variables    | Page succeeds and explicitly withholds unverified data                           | Automated pass on definitive production                    |
| P-02 | Visit unknown URL                                     | Useful 404 with HTTP 404 and `noindex`                                           | Automated pass on definitive production                    |
| P-03 | Navigate at phone/tablet/desktop sizes                | No document-width overflow; navigation remains operable                          | Automated pass on definitive production                    |
| P-04 | View TV display at 1920 x 1080                        | No clipping or document scroll; safe status remains legible                      | Automated pass on definitive production                    |
| P-05 | Disconnect TV browser                                 | Offline status appears; last-known-good behavior is manually verified            | Offline event passed; cache recovery remains a manual test |
| P-06 | Cross a Europe/London midnight/DST boundary           | Correct local date and timetable refresh without stale data                      | Pending clock-controlled integration test                  |
| D-01 | Load seeded approved content and prayer configuration | Only approved, in-window records render                                          | Pending local Supabase fixture                             |
| D-02 | Withdraw, archive or expire content                   | Public item disappears and safe state returns                                    | Pending local Supabase fixture                             |
| A-01 | Sign in, enrol MFA and reopen protected page          | Access requires valid invite/session and configured assurance level              | Pending authenticated test environment                     |
| A-02 | Exercise every role                                   | Viewer/editor/publisher/admin permissions match policy                           | Pending authenticated test environment                     |
| A-03 | Publish prayer settings                               | Preview, explicit confirmation, audit and immutable revision all agree           | Pending authenticated test environment                     |
| M-01 | Upload valid/invalid media                            | Type, size, sanitisation, private storage and alt-text controls behave correctly | Pending authenticated test environment                     |
| E-01 | Submit enquiry abuse cases                            | Honeypot, validation, rate limit, retention and safe admin rendering work        | Pending feature approval and isolated environment          |
| R-01 | Restore backup to isolated project                    | Schema, auth references, media and records are recoverable                       | Pending operational rehearsal                              |

## Reproduce the passed Chromium matrix

```powershell
pnpm build
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = "msedge"
$env:PLAYWRIGHT_DISABLE_VIDEO = "1"
$env:PLAYWRIGHT_WEB_SERVER_COMMAND = "pnpm start --hostname 127.0.0.1 --port 3000"
pnpm exec playwright test --project=chromium-mobile --project=chromium-tablet --project=chromium-desktop --project=tv-1080p --workers=2
pnpm exec playwright show-report
```

For a workstation with an installed Edge/Chrome channel but no downloaded Playwright Chromium, set
`PLAYWRIGHT_CHROMIUM_CHANNEL` (for example, `msedge`). CI should normally use the pinned
Playwright-managed browser build. If that workstation also lacks Playwright's FFmpeg helper, set
`PLAYWRIGHT_DISABLE_VIDEO=1`; failure screenshots and traces remain enabled.

## Completed local release commands

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm exec playwright test --project=chromium-mobile --project=chromium-tablet --project=chromium-desktop --project=tv-1080p --workers=2
```

The repository-local internal-link assertions passed in the browser matrix. The CI-only Gitleaks,
CodeQL, dependency-review, registry-backed dependency audit, offline Markdown-link action and local
Supabase migration replay/lint have not been represented as local passes.

## Remaining pre-release commands and environments

- Run the committed CI workflow, including Gitleaks, CodeQL, dependency review/audit,
  repository-link integrity and isolated Supabase migration replay/lint.
- Run `pnpm exec playwright test --project=firefox-desktop --project=webkit-mobile` after the
  managed Firefox and WebKit binaries are available.
- Run credentialed staging scenarios for Auth/MFA, every role, content publication, prayer
  publication/withdrawal, private media, enquiries, audit and backup/restore.

## Release decision

Release remains blocked until:

- the pending CI, migration, cross-engine and credentialed-staging gates pass at the release commit;
- critical public journeys pass in Firefox and WebKit as well as Chromium;
- axe has no untriaged serious, critical, A or AA violation in those engines;
- the manual accessibility checklist is signed off;
- approved-data, admin/MFA, prayer-publishing and backup-restore scenarios have evidence;
- representative performance measurements meet the documented budgets;
- committee confirmation items and policy prerequisites are closed or the relevant feature remains
  disabled.
