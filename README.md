# Craigavon Masjid — Community Website

The official website of **Craigavon Masjid** (Muslim Association of Craigavon), 16 Legahory Centre, Craigavon BT65 5BE.

A **zero-dependency static site**: pure HTML/CSS/JS, no frameworks, no database, no build step. Prayer times are computed in the browser with the vendored [adhan.js](https://github.com/batoulapps/adhan-js) library (MIT) — they can never go stale. See [docs/PLAN.md](docs/PLAN.md) for the full project plan and design rationale.

## Pages

| File | Page |
|---|---|
| `index.html` | Home — live next-prayer card, today's times, announcements, events |
| `prayer-times.html` | Today + monthly timetable, jumuʿah, qibla, calculation method |
| `display.html` | **Full-screen TV prayer board** for the screen inside the masjid |
| `about.html` / `services.html` / `education.html` / `community.html` / `new-to-islam.html` / `contact.html` | Content pages |
| `404.html` | Not-found page |

## Preview locally

Either just double-click `index.html` (everything works from a folder), or run a proper local server:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
# then open http://localhost:8420
```

## Update content

Committee members only ever edit three files — see **[ADMIN-GUIDE.md](ADMIN-GUIDE.md)** for the plain-English manual:

- `content/config.js` — contact details, iqāmah rules, jumuʿah time, calculation method
- `content/announcements.js` — announcements (auto-expire supported)
- `content/events.js` — events (past events hide automatically) + weekly activities

## Deploy (free, ~10 minutes)

**Cloudflare Pages** (recommended — includes CDN, DDoS protection, automatic HTTPS):

1. Create a free account at [pages.cloudflare.com](https://pages.cloudflare.com).
2. "Create a project" → "Direct upload" → drag this whole folder in.
3. Done — you get `https://<name>.pages.dev`. The `_headers` file automatically applies the security headers (CSP, HSTS, etc.).
4. To update later: upload the folder again (or connect a GitHub repository for automatic deploys).

**Custom domain:** in the Pages project → "Custom domains" → add e.g. `craigavonmasjid.io` or `craigavonmasjid.org.uk` and follow the DNS instructions. Update the `canonical`/`og:url` URLs in each page's `<head>` and in `sitemap.xml`/`robots.txt` if the domain differs from `craigavonmasjid.io`.

Netlify works identically (drag-and-drop at [app.netlify.com/drop](https://app.netlify.com/drop); `_headers` is supported there too).

## The TV display

Point any device connected to the masjid television at `/display.html` and put the browser in full-screen (F11). It shows the live clock, all prayer/iqāmah times, next-prayer countdown, Hijri date, rotating announcements, and a calm "prayer in progress" screen after each iqāmah. Setup options are in [ADMIN-GUIDE.md](ADMIN-GUIDE.md).

## Security posture

- No server-side code, no database, no logins, no cookies, no third-party requests at runtime (fonts and all scripts are self-hosted).
- Strict security headers shipped via `_headers`: CSP `default-src 'self'`, HSTS, nosniff, frame-deny, referrer and permissions policies.
- No forms; contact is via phone/WhatsApp/email links — no personal data is collected, so there is no GDPR processing surface.

## Licences

- Site code: © Muslim Association of Craigavon.
- `assets/vendor/adhan.umd.min.js` — MIT (Batoul Apps), licence in `assets/vendor/ADHAN-LICENSE.txt`.
- Fonts (Marcellus, Inter, Amiri, Reem Kufi) — SIL Open Font License, self-hosted subsets from Google Fonts.
