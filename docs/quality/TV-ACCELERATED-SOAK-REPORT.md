# Accelerated TV display soak report

## Scope and release meaning

This report records deterministic, clock-controlled validation of the `/tv` display. The automated
soak compresses multiple operating days and UK clock changes into repeatable Playwright scenarios at
the production 1920 x 1080 viewport. It is evidence for the application release candidate; it does
not replace a final check on the Association's physical display hardware, managed network or
production data.

Test data is synthetic and is labelled as such. No real prayer timetable, emergency message,
administrator identity or committee decision is used.

## Evidence implementation

The scenarios are implemented in `tests/e2e/tv.spec.ts` and use Playwright's browser clock rather
than changing the host operating-system clock. `/api/display` is intercepted with a four-day,
known-good payload so every state transition is deterministic and does not depend on credentials or
live committee data. Every TV test also fails on an uncaught browser `pageerror`; expected network
rejections in the outage scenario are handled by the display's recovery path.

Run the evidence against a production build:

```powershell
$env:PLAYWRIGHT_DISABLE_VIDEO = "1"
$env:PLAYWRIGHT_WEB_SERVER_COMMAND = "pnpm start --hostname 127.0.0.1 --port 3000"
pnpm exec playwright test tests/e2e/tv.spec.ts --project=tv-1080p --workers=2 --retries=0
```

## Accelerated scenarios

| ID         | Controlled scenario                                            | Required observation                                                                                                         | Automated evidence status |
| ---------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TV-SOAK-01 | London midnight from Thursday 16 July to Friday 17 July 2026   | Clock changes from 23:59 to 00:00, Gregorian date advances and the next day's timetable is selected                          | Pass                      |
| TV-SOAK-02 | Friday/Jumu'ah at a controlled Friday instant                  | The dedicated Jumu'ah event is selected as the next congregation when earlier than Dhuhr congregation                        | Pass                      |
| TV-SOAK-03 | UK spring DST change on 29 March 2026                          | London clock advances from 00:59 to 02:00 without changing the calendar day or losing the timetable                          | Pass                      |
| TV-SOAK-04 | UK autumn DST change on 25 October 2026                        | London clock moves from 01:59 BST to 01:00 GMT without changing the calendar day or losing the timetable                     | Pass                      |
| TV-SOAK-05 | Network loss after a confirmed download                        | Display labels the browser offline, retains the last confirmed payload and visibly marks it as cached                        | Pass                      |
| TV-SOAK-06 | Five calendar days pass during the outage                      | When the four cached dates no longer cover today, prayer information fails closed instead of showing another day's timetable | Pass                      |
| TV-SOAK-07 | Internet is restored with a new confirmed payload              | The online event triggers a refresh, the fresh date/timetable returns and the successful-update timestamp advances           | Pass                      |
| TV-SOAK-08 | A notice expires while the page remains open                   | The notice disappears solely from the controlled clock transition, without waiting for a network refresh                     | Pass                      |
| TV-SOAK-09 | Baseline normal, unavailable, offline and accessibility states | 1080p fit, no document scroll, confirmed payload rendering, safe fallback and automated WCAG A/AA scan remain intact         | Pass                      |

## Execution record

- Date: 15 July 2026
- Commit: draft pull-request working tree; release commit pending
- Browser/runtime: pinned Playwright Chromium and Playwright test runtime
- Resolution: 1920 x 1080, device scale factor 1
- Result: **Pass**
- Playwright result summary: **10 passed, 0 failed in 8.9 seconds with two workers**
- Console/runtime errors: **0 uncaught page errors**

The ten tests include distinct baseline/unavailable/populated checks as well as the compressed
time/network scenarios above. Fake time is paused and advanced explicitly so a real clock cannot
drift across the expected transition while the assertion is running.

The client hydrates from the payload generation time for the first frame, then switches to the live
clock after mount. The clock harness waits for the mocked client payload before pausing time, which
keeps the result deterministic under full-suite load. The final two-worker TV run passed all 10
checks after 360 applicable non-TV checks had passed across Chromium, Firefox and WebKit.

## Residual operational checks

The automated result proves browser behavior under controlled time and network events. Before public
operation, the technical owner must still record one short acceptance check on the actual managed TV
device: browser version, physical resolution/scaling, full-screen recovery after power loss, managed
network reconnection, viewing-distance legibility and comparison with an approved timetable. That
check requires the selected hardware, production URL and committee-approved data; those are not
available in this repository-only test environment.
