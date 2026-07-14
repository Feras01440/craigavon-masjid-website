# Accessibility report

**Product:** Muslim Association of Craigavon website and prayer display  
**Target:** WCAG 2.2 Level AA  
**Evidence date:** 13 July 2026  
**Status:** The automated Chromium production matrix passed. Cross-engine, manual and
assistive-technology evidence remains a launch gate.

## Evidence status

This report separates executed evidence from checks that still require a real browser, device,
approved dataset or assistive technology. A test being present in the repository is not recorded as
a pass until its output has been reviewed.

### Executed

| Check                                    | Result | Evidence                                                                                                                    |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Public route and component source review | Pass   | Semantic landmarks, heading contract, skip link, labelled navigation, reduced-motion and forced-colour rules were reviewed. |
| Automated accessibility suite            | Pass   | `tests/e2e/accessibility.spec.ts`, `tests/e2e/keyboard-and-preferences.spec.ts` and the TV accessibility coverage           |
| Playwright suite discovery               | Pass   | 185 checks across five specification files and six configured projects                                                      |
| Production Chromium matrix               | Pass   | 110 passed, 3 expected project-specific skips, 0 failed in 2.0 minutes on the definitive production `next start` build      |
| Automated axe scans                      | Pass   | Public routes, the 404 response and the 1920 x 1080 TV surface completed without an untriaged WCAG A/AA violation           |
| Automated keyboard and preferences       | Pass   | Skip-link focus, responsive menu operation, desktop navigation and reduced-motion behavior passed in Chromium               |

The production matrix used the Chromium mobile, tablet, desktop and TV projects with the locally
installed Microsoft Edge channel. The three skips are intentional viewport-specific exclusions:
desktop navigation is not exercised on disclosure layouts, and disclosure navigation is not
exercised on desktop.

### Pending before launch

| Check                                                     | Required evidence                                                                      | Owner/sign-off                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| Axe WCAG A/AA scan in Firefox and WebKit                  | Saved Playwright report with zero untriaged violations                                 | Engineering                            |
| Keyboard-only journey review at desktop and mobile widths | Completed manual checklist below; defects linked and retested                          | Accessibility reviewer                 |
| Screen reader review                                      | NVDA + Firefox or Chrome on Windows; VoiceOver + Safari on iOS where available         | Accessibility reviewer                 |
| 200% and 400% zoom/reflow                                 | Screenshots and notes for all representative page types                                | Engineering                            |
| Windows High Contrast / forced colours                    | Screenshots and keyboard notes                                                         | Accessibility reviewer                 |
| Reduced motion                                            | Manual confirmation on the TV display; the automated browser check has passed          | Engineering                            |
| Real content review                                       | Approved prayer table, long event titles, policy content, Arabic text and error states | Content owner + accessibility reviewer |
| Accessibility statement                                   | Approved statement with monitored contact route and known limitations                  | Committee                              |

## Automated scope

The Playwright suite scans these public route types with axe rules tagged for WCAG A and AA:

- Home
- Prayer times
- Visit
- Services
- Learning
- News
- New Muslims
- Contact
- About
- Policy register
- Policy detail

The suite also checks:

- one visible primary heading and one labelled `main` landmark on public pages;
- English document language;
- a first-focus skip link that moves focus to the main content;
- keyboard operation of the mobile/tablet navigation disclosure;
- visible desktop navigation without disclosure interaction;
- reduced-motion CSS behavior;
- useful 404 content and `noindex` metadata;
- horizontal reflow at phone, tablet and desktop viewports;
- common text-encoding corruption markers;
- safe, explicit unavailable-data announcements when Supabase is not configured.

The TV route is tested separately at 1920 x 1080 because it is a display surface rather than a
conventional document-navigation journey. Both its safe no-data state and a confirmed automated test
fixture are covered; fixture values are not committee-approved prayer times.

## Manual keyboard checklist

Record the date, browser/OS, reviewer and defect reference for every failure.

| ID   | Journey                                               | Expected result                                                                | Status                                 |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| K-01 | Load each public route and press Tab                  | Skip link is first and clearly visible                                         | Pending                                |
| K-02 | Activate the skip link                                | Focus lands on the main content; focus indicator remains perceivable           | Pending                                |
| K-03 | Open and close Menu at phone/tablet width             | Disclosure state is announced and no focus trap occurs                         | Pending                                |
| K-04 | Traverse header, main and footer links                | Focus order follows reading order; every control is visible                    | Pending                                |
| K-05 | Use month controls and prayer table                   | Links/buttons are operable; horizontally scrollable table receives focus       | Pending approved timetable data        |
| K-06 | Navigate policy and content cards                     | Link purpose is understandable from name and context                           | Pending approved content data          |
| K-07 | Trigger validation and error states in administration | Error summary/status is announced and focus is managed                         | Pending authenticated test environment |
| K-08 | Complete MFA and destructive confirmation flows       | No keyboard trap; confirmation is explicit; timeout behavior is understandable | Pending authenticated test environment |

## Screen reader checklist

| ID    | Check                                                                                | Status                                      |
| ----- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| SR-01 | Page title, language, landmarks and primary heading are announced correctly          | Pending                                     |
| SR-02 | Navigation disclosure exposes name, role and expanded state                          | Pending                                     |
| SR-03 | Prayer starts and congregation times are distinguishable in table navigation         | Pending approved timetable data             |
| SR-04 | Arabic labels use the correct language and direction without corrupt characters      | Encoding gate passed; manual review pending |
| SR-05 | Status, offline state and unavailable-data messages are announced without repetition | Pending                                     |
| SR-06 | Admin validation, save, publish and security feedback is announced                   | Pending authenticated test environment      |

## Known limitations and launch gates

- Automated axe scans cannot prove conformance; they supplement keyboard, screen reader, zoom,
  cognition and content review.
- The no-backend state is suitable for safety testing but does not exercise large approved datasets,
  long translations, media alternatives or full prayer tables.
- Firefox and WebKit browser binaries were unavailable for the local production run. Their projects
  remain configured and must run before launch.
- The official accessibility statement and monitored assistance route require committee approval.
- No accessibility claim should be published until every pending launch check above has evidence and
  any critical or serious finding is resolved.

## Reproduction commands

```powershell
pnpm build
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = "msedge"
$env:PLAYWRIGHT_DISABLE_VIDEO = "1"
$env:PLAYWRIGHT_WEB_SERVER_COMMAND = "pnpm start --hostname 127.0.0.1 --port 3000"
pnpm exec playwright test --project=chromium-mobile --project=chromium-tablet --project=chromium-desktop --project=tv-1080p
pnpm exec playwright show-report
```

For an already running deployment, set `PLAYWRIGHT_BASE_URL`. Set `E2E_EXPECT_NO_SUPABASE=1` only
when that target is intentionally configured without Supabase.
