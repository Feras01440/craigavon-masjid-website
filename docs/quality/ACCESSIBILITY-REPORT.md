# Accessibility report

**Product:** Muslim Association of Craigavon website and prayer display

**Target:** WCAG 2.2 Level AA

**Evidence date:** 15 July 2026

**Status:** Technical accessibility acceptance passes for the tested software-controlled scope.
Automated cross-engine public evidence and clean authenticated dashboard acceptance are green.
Native human keyboard, actual screen-reader and physical-display acceptance remain documented device
limitations, so this report is not a conformance claim.

## Executed evidence

| Check                             | Result                               | Evidence and boundary                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public semantic/source review     | Pass for reviewed scope              | Skip link, language, named navigation, landmarks, heading contract, status messaging, forced-colour rules and reduced-motion rules were inspected                                                                  |
| Screen-reader-oriented DOM review | Pass for representative public shell | The home snapshot exposed the expected document language, named navigation regions, one primary heading, main landmark, content regions and footer in a sensible reading order; this is not an NVDA/VoiceOver test |
| Axe WCAG A/AA scans               | Pass                                 | Public routes and the 404 surface passed in Chromium, Firefox and WebKit; the TV safe and populated states also passed                                                                                             |
| Public keyboard automation        | Pass                                 | Every public route exercises skip-link/main transfer; responsive menu and desktop navigation coverage are selected by viewport                                                                                     |
| Production browser walkthrough    | Pass for public shell                | The production build was inspected at desktop and 390 x 844: landmarks, heading order, safe prayer state, mobile menu, accessibility route and noindex 404 were present; browser error log was empty               |
| Browser preferences               | Pass in automation                   | Reduced motion disables long animation/transition behavior and forced-colour runs retain operability and avoid document-width overflow                                                                             |
| Narrow reflow                     | Pass in configured browser coverage  | Phone, tablet and WebKit mobile profiles completed public no-overflow/reflow checks                                                                                                                                |
| Accelerated TV accessibility      | Pass                                 | 1920 x 1080 safe/populated states and the 10-scenario time/network soak completed without an unhandled page error                                                                                                  |
| Authenticated dashboard journey   | Pass in clean product acceptance     | TOTP, navigation, draft/preview/publish/edit/archive, revision restoration, media, prayer, role denial, audit and sign-out completed in Chromium against a clean local Supabase stack                              |
| Native manual keyboard review     | Incomplete                           | Automated key input is evidence, but a human has not yet signed every public and authenticated dashboard journey                                                                                                   |
| 200%-equivalent zoom and reflow   | Pass in automation                   | Every public route passed the 640 CSS-pixel/320 CSS-pixel reflow contract; native browser zoom and 400% spoken/visual review remain a documented limitation                                                        |
| Actual screen reader              | Blocked                              | NVDA/VoiceOver and native mobile Safari testing require the relevant device/software and reviewer                                                                                                                  |

## Public pages covered by automation

The route-level accessibility, keyboard and preference coverage includes:

- `/`
- `/prayer-times`
- `/visit`
- `/services`
- `/education`
- `/news`
- `/new-muslims`
- `/contact`
- `/about`
- `/accessibility`
- `/policies`
- `/policies/privacy`
- the not-found response
- `/tv` in display-specific tests

Each public document is checked for a successful or intentional 404 response, `lang`, one `main`,
one primary heading, named/usable navigation, the expected title/heading, no common encoding
corruption and no horizontal document overflow. Axe checks use the WCAG A/AA rules enabled by the
repository suite.

## Cross-engine result

The current
[release-candidate CI run](https://github.com/Feras01440/craigavon-masjid-website/actions/runs/29441499018)
selected 235 Chromium checks: 226 applicable checks passed and 9 viewport/local-demo variants were
intentionally skipped. The completed definitive cross-engine selection contains 385 checks: 370
applicable checks passed across Chromium, Firefox, WebKit and the TV project, with 15 intentional
viewport/local-demo skips and no unresolved failure.

| Engine   | Executed result                                                                                                                  | Qualification                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Chromium | The definitive matrix passed the phone, tablet, desktop and 1080p display accessibility, keyboard, preferences and reflow checks | Three viewport-inapplicable navigation variants were intentionally skipped                                             |
| Firefox  | The definitive desktop project passed every applicable public, accessibility, keyboard, preferences and reflow check             | One mobile-only disclosure test was intentionally skipped; Firefox ran outside the constrained process sandbox         |
| WebKit   | The definitive mobile project passed every applicable public, accessibility, keyboard, preferences and reflow check              | One desktop-only navigation test was intentionally skipped; Windows WebKit's link-focus preference is documented below |

WebKit on Windows normally skips anchors during Tab navigation when `tabFocusesLinks` is disabled.
The WebKit test proves that the skip link is the first anchor in DOM order, focuses it explicitly,
then activates it and verifies that focus moves to `main`. Chromium and Firefox prove the actual
first-Tab behavior. Native Safari keyboard preferences still require manual device acceptance.

## Keyboard evidence and open checklist

| ID   | Journey                                                           | Current result                                                                                                |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| K-01 | Skip link is first actionable keyboard target and becomes visible | Automated pass in Chromium/Firefox; WebKit DOM-order plus explicit-focus pass; native manual sign-off pending |
| K-02 | Activating skip link transfers focus to `main`                    | Automated pass across configured engines                                                                      |
| K-03 | Open/close phone and tablet menu without a focus trap             | Automated pass in disclosure-layout projects; manual touch/keyboard sign-off pending                          |
| K-04 | Traverse header, main and footer in reading order                 | Automated route coverage passes; full human review pending                                                    |
| K-05 | Operate prayer month controls and navigate the populated table    | Logic/fixture automation exists; repeat manually with committee-approved timetable data                       |
| K-06 | Navigate policy/content cards and understand link purpose         | Automated accessible-name coverage passes for available content; repeat with final approved copy              |
| K-07 | Trigger admin validation/save/publish feedback                    | Covered by clean local authenticated acceptance; native manual repetition uses the real committee accounts    |
| K-08 | Complete MFA and destructive confirmations without a trap         | Local TOTP/destructive workflows passed clean acceptance; production-device repetition is a launch check      |

The in-app browser's synthetic keypress did not provide reliable native Tab movement and therefore
was not counted as a manual keyboard pass. This prevents assisted inspection from being overstated
as human/device evidence.

## Screen-reader-oriented findings

The representative DOM review found:

- an English document language and descriptive page title;
- named primary and utility navigation regions;
- a single primary heading followed by hierarchical section headings;
- a main landmark that is the skip-link target;
- labelled sections/status areas for unavailable or pending information; and
- organisation/footer information after the main content in reading order.

No structural defect was recorded in that representative snapshot. The review cannot prove spoken
output, verbosity, table navigation, live-region timing, pronunciation, browser/assistive-technology
interoperability or mobile gestures.

| ID    | Required actual assistive-technology check                                         | Status                                                                                      |
| ----- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| SR-01 | Page title, language, landmarks and primary heading are announced correctly        | DOM-oriented review passes; NVDA/VoiceOver pending                                          |
| SR-02 | Responsive navigation announces name, role and expanded state                      | Source/automation passes; actual announcement pending                                       |
| SR-03 | Prayer starts and congregation times are distinguishable in table navigation       | Pending approved timetable plus screen reader                                               |
| SR-04 | Arabic labels use correct language/direction and pronunciation                     | Encoding checks pass; content owner and screen-reader review pending                        |
| SR-05 | Offline, stale and unavailable-data status is announced once and at the right time | Visual/automation behavior passes; spoken live-region review pending                        |
| SR-06 | Admin validation, save, publish and security feedback is announced                 | Semantic/live status implementation reviewed; actual spoken output remains device-dependent |

## Zoom, reflow, contrast and motion

| Check                                  | Current evidence                                                                               | Remaining evidence                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Narrow reflow                          | Pixel 7, 820 x 1180 tablet and iPhone 13/WebKit public projects pass without document overflow | Human review with final approved long/Arabic content          |
| 200%-equivalent and 320px reflow       | Every public route passes at constrained CSS widths without document overflow                  | Native 200%/400% zoom remains a device-level confirmation     |
| Forced colours / Windows High Contrast | Automated forced-colour emulation passes the public routes without overflow or lost operation  | Native Windows High Contrast visual/keyboard review           |
| Reduced motion                         | Automated preference disables smooth scrolling and long transition/animation duration          | Manual TV/device confirmation                                 |
| Focus appearance                       | Skip-link and shared focus CSS inspected and exercised by automation                           | Human contrast/visibility sign-off at zoom and forced colours |

## Launch-dependent checks and technical limitations

- Authenticated dashboard keyboard and announcement testing needs an isolated Supabase staging
  project, approved synthetic accounts for every role and real MFA.
- Actual NVDA on Windows and VoiceOver/Safari on Apple hardware need a qualified reviewer and the
  relevant devices.
- Physical TV scaling, viewing distance, full-screen recovery and reduced-motion behavior need the
  selected managed display.
- Real-content review needs committee-approved prayer tables, Arabic labels, policies, long titles,
  error copy and media alternatives.
- Publishing an accessibility statement needs committee approval and a monitored assistance route.

## Release interpretation

Automated accessibility evidence is green for the tested public surface and has no known untriaged
serious/critical A/AA axe finding. The software-controlled accessibility gate **passes**. Native
screen-reader, native zoom, final-content and physical-display checks remain launch-dependent
limitations rather than unfinished application code. No WCAG conformance claim should be published
from this report alone.

## Reproduction

```powershell
pnpm build
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = "msedge"
$env:PLAYWRIGHT_DISABLE_VIDEO = "1"
$env:PLAYWRIGHT_WEB_SERVER_COMMAND = "pnpm start --hostname 127.0.0.1 --port 3000"
pnpm exec playwright test --project=chromium-mobile --project=chromium-tablet --project=chromium-desktop --project=firefox-desktop --project=webkit-mobile --project=tv-1080p
pnpm exec playwright show-report
```

For an already running deployment, set `PLAYWRIGHT_BASE_URL`. Set `E2E_EXPECT_NO_SUPABASE=1` only
when the target intentionally omits Supabase and fail-closed behavior is the expected result.
