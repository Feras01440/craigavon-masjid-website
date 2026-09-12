# Mosque TV display guide

The public display is `/tv`. It contains no admin controls and should run in a dedicated browser
profile on a device that is not used for committee administration.

This guide describes current behaviour, not yet-proven production capability. 1080p, 4K, multi-day,
offline, midnight, and clock-change evidence must be captured in credentialed staging before live
use.

## Current behaviour and limits

- The server initially loads a four-day approved prayer bundle and up to 12 published
  announcements/emergency notices.
- The browser requests `/api/display` on load, at the published 30–300 second refresh interval (60
  seconds by default), when the network comes online, and when page visibility changes.
- It stores a payload in `localStorage` only after a response whose nested prayer status is
  `available`.
- If a refresh has a network error or non-2xx response, it can reuse that browser profile's last
  successful payload and labels it **Showing last confirmed download**.
- The live clock and displayed date are explicitly formatted in `Europe/London`; the device clock
  still must be accurate.
- Regular notices rotate at the published 10–120 second interval (15 seconds by default). The first
  returned emergency notice takes over the entire screen when notice display is enabled.
- After a congregation or Jumu'ah prayer time, the screen shows the prayer-in-progress message for
  the published 5–30 minute hold (10 minutes by default).
- The published TV setting also controls the Hijri-date line, notice visibility and footer message.
  Safe defaults apply if no valid TV setting is published.
- The display can move to the next cached date at midnight, but the payload contains only four days.
  It cannot remain authoritative indefinitely offline.

There is no service worker or offline application shell. A previously loaded tab can keep running
with its browser-local payload, but closing/reloading the page while offline may fail. The TV
re-filters cached notice expiry against the device clock, but it cannot receive an early withdrawal,
correction or new emergency while offline. Operators must treat the cache timestamp as a warning and
use a physical/approved alternative when freshness matters.

`/api/display` returns `503` when either its prayer or notice dependency is unavailable. The TV
treats that response like a network failure and attempts to use this browser profile's last payload
that had both dependencies available. A newly opened profile with no such payload shows the safe
unavailable state. The status label is still not a sufficient freshness or service-health control;
check the values and successful-update timestamp.

## Device setup

1. Use an organisation-controlled mini PC/TV stick or managed smart-TV browser capable of current
   Chromium/Edge features.
2. Create a dedicated non-admin operating-system/browser account and profile. Do not save committee
   email, Auth sessions, passwords, or provider credentials.
3. Connect by wired Ethernet where practical; otherwise use a managed Wi-Fi network with stable
   coverage.
4. Enable automatic network time synchronisation and verify the device's clock against a trusted
   source. The display formats London time but countdowns depend on the device's absolute clock.
5. Enable automatic security/browser updates in a maintenance window and configure automatic restart
   after power loss.
6. Disable browser translation, notification prompts, password saving, pop-ups, extensions, and
   screen overlays.
7. Set display resolution/scaling and browser zoom to 100%, then test actual viewing distance at
   1920×1080 and, if used, 3840×2160.
8. Configure power/wake/sleep for approved mosque operating hours. Avoid leaving a static OLED panel
   running unnecessarily; use the screen's pixel-shift/dimming features where available.
9. Set the start page to `https://<approved-domain>/tv` only after DNS/TLS is verified.
10. Enter browser full-screen (commonly `F11` in Chrome/Edge on Windows). For managed kiosk launch,
    have the technical owner configure the operating system/browser policy and retain an accessible
    exit/recovery method.

Do not expose a keyboard/mouse to the public if it allows leaving the display or accessing the
browser profile.

## Start-of-day check

The named TV owner should verify:

- the correct Association display is loaded over HTTPS;
- Europe/London clock, Gregorian date, and Hijri label are plausible and the device clock is
  synchronised;
- today's six starts, congregation fields, joined-prayer label, and Jumu'ah information match the
  approved source;
- the next-prayer/congregation label and countdown are plausible;
- network state is **Online** and the last successful update is recent;
- only current approved notices appear;
- no admin, draft, personal, or diagnostic information is visible; and
- full-screen layout is legible from the rear of the room without clipped text.

`Online` alone is insufficient. Check the last-update timestamp and timetable values.

## Full-screen and routine operation

- Keep the `/tv` tab open. Avoid periodic manual reloads; the page already refreshes data at its
  published interval.
- Do not open `/admin` in the display profile.
- Do not clear site data during normal operation; that deletes the only last-known-good payload.
- Recheck after browser/device updates, power loss, network changes, content/prayer publication, and
  daylight-saving transitions.
- Keep a current printed/otherwise approved timetable and emergency contact route available beside
  the device.

## Publish or remove a notice

Use the credentialed committee device, never the TV itself:

1. Follow the announcement or emergency procedure in [ADMIN-GUIDE.md](../../ADMIN-GUIDE.md).
2. For an emergency, keep only one active emergency notice and set an expiry where known.
3. On another device, inspect `/api/display` and confirm the expected notice and recent
   `generatedAt`.
4. Watch the physical TV until the content appears. Polling uses the published interval, but a
   network/CDN/browser condition can delay it; visual confirmation is mandatory.
5. At the end time, unpublish/archive the notice and visually confirm removal. If the TV is using
   cached data, reconnect it before trusting removal.

If a stale cached emergency remains during an outage, take the TV out of service or cover/replace it
with the approved physical notice. Do not leave contradictory information visible.

## Network loss: keep the loaded tab open

When the screen says **Offline** or **Showing last confirmed download**:

1. Note the last successful data-update timestamp and compare today's values with the printed
   approved timetable.
2. Keep the tab/browser open. Do not press reload, close the browser, clear site data, or
   power-cycle unless the page is unusable and an alternate display is ready.
3. Check cable/Wi-Fi, access point, router, DNS, and whether another device can reach both the site
   and `/api/display`.
4. If the cached payload still contains today and matches the approved source, it may be used
   temporarily with the visible stale-data warning under the Association's policy.
5. Treat emergency notices as untrusted for freshness while offline. Their stored expiry is applied
   against the device clock, but corrections, early removal and new notices cannot arrive.
6. After four cached dates, or whenever today is missing, the display shows prayer information
   unavailable. Switch to the approved physical/announcement fallback.
7. Restore connectivity, verify `/api/display` returns nested `prayer.status: available`, then wait
   for automatic refresh or change tab visibility. Confirm **Data connection checked** and a new
   update time.

`navigator.onLine` can report Online even when the API is unavailable, captive, or blocked. Test the
endpoint.

## Recover after a blank/error page or restart

1. Put the approved physical timetable/notice in place first if worship information is needed
   immediately.
2. On a separate device, verify the canonical `/tv` and `/api/display` routes, nested prayer status,
   and provider status.
3. Verify the TV device clock, network, DNS, and HTTPS certificate.
4. If online, reopen the exact `/tv` URL in the dedicated profile and return to full-screen.
5. If the endpoint is healthy but stale data remains, wait one polling interval, switch away/back to
   trigger visibility refresh, then reload once while online.
6. Clear the dedicated profile's site data only as a last resort while online. This removes the
   last-known-good cache and must be followed by a successful fresh load and value comparison.
7. Record the outage, cache timestamp, actions, and verification result.

## Incorrect prayer time or misleading content

1. Do not change the device clock or browser DOM to mask the error.
2. Follow the critical prayer/content procedure in [OPERATIONS-RUNBOOK.md](OPERATIONS-RUNBOOK.md).
3. Publish an approved emergency notice if the content service is safe and visually verify it.
4. If wrong times remain visible, take the TV out of service and use the approved physical/announced
   information.
5. Return it to service only after the authorised owner confirms every affected value and the
   last-update timestamp is current.

Only an authorised prayer publisher may withdraw or atomically replace a timetable from
`/admin/prayer-times`. The TV operator must not edit data or improvise a replacement; keep the
screen out of service until the resulting unavailable state or approved replacement is verified.

## Midnight, long-running, and clock-change checks

Before live use and before each UK DST change, staging must demonstrate:

1. leave `/tv` open with a multi-day approved test payload;
2. simulate/observe London midnight and verify date, today schedule, Hijri label, next events, and
   countdown advance;
3. simulate the spring and autumn clock changes with a controlled test clock/environment;
4. keep the display running for longer than four days, with planned connection loss and recovery;
5. verify emergency and regular notice publication/removal, prayer hold, and no console/runtime
   error; and
6. record browser/device, version, resolution, duration, test times, screenshots, and results.

Do not alter the production device clock to perform a test during operating hours.

## End-of-day and maintenance

- Exit full-screen only from the controlled operator interface.
- Follow the approved display sleep/power policy; do not abruptly cut power during an update.
- Apply OS/browser updates in the maintenance window, restart, and repeat the start-of-day check.
- Review device physical access and dedicated-profile history/site permissions quarterly.
- Replace failed hardware through a documented spare-device setup; never restore an image containing
  admin sessions or secrets.

## Screenshot evidence

Capture only after credentialed staging is available:

- 1920×1080 normal online state with synthetic approved prayer data;
- 3840×2160 layout;
- offline/last-confirmed state with timestamp;
- unavailable-prayer state;
- one synthetic emergency notice;
- prayer-in-progress state; and
- post-midnight next-day state.

Do not use a production emergency, personal data, real admin session, or unapproved prayer values in
evidence.
