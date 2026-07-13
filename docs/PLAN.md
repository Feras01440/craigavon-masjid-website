# Craigavon Masjid — Community Website: The Master Plan

*Prepared 12 July 2026 · For the Muslim Association of Craigavon*

---

## 1. Mission

Build the definitive online home for the Muslim community of Craigavon, Portadown and Lurgan — the **only mosque serving County Armagh** — and a welcoming front door for neighbours who want to understand Islam. The site must:

1. Replace the "check Facebook / ask someone" habit with a single, always-accurate source of truth.
2. Bring MAWAQIT-class prayer functionality **into the website itself** (live times, countdown, monthly timetable, in-mosque TV display) without depending on any third party.
3. Look and feel like a serious, established institution — calmer and better crafted than any comparable mosque site in Ireland, including Belfast Islamic Centre.
4. Be effectively unhackable, free to run, and maintainable by non-technical committee members.

## 2. What research told us

Five parallel research tracks (Belfast Islamic Centre teardown, MAWAQIT integration audit, survey of nine world-class mosque websites, prayer-time science for 54.4°N, and Craigavon's existing online footprint) produced these directives:

**Copy what works elsewhere**
- Prayer times above the fold with **two columns: Begins + Jamāʿah** — the universal pattern on every serious UK mosque site.
- Jumuʿah times called out separately and prominently.
- Life-event services (nikāḥ, janāzah, shahādah) productised as individual sections with steps and clear contact CTAs — Belfast's Marriage page is the single best page on their site because it is *actionable*.
- Distinct pathways for two audiences: congregants and curious non-Muslims (Northern Ireland context makes the second audience unusually important).
- Stated calculation method on the timetable page — worshippers compare against apps and will ask why times differ.

**Avoid the failures we found**
- Belfast's site is undermined by staleness (COVID pages in 2026, undated news), WordPress + page-builder bloat, broken links and scattered navigation. Our counter: a site where the *only* thing needing updates is three small data files, and where prayer times compute themselves forever.
- Cheap mosque sites clash saturated green/gold gradients, tile geometric patterns wall-to-wall, and use crescent clip-art. Premium ones (Cambridge Central Mosque is the benchmark) use restraint: one deep accent colour, generous whitespace, geometry used sparingly and deliberately.

**Craigavon facts established**
- Official identity: **Craigavon Masjid (مسجد كريقافن)**, operated by the **Muslim Association of Craigavon**, 16 Legahory Centre, Craigavon BT65 5BE.
- Coordinates 54.4478 N, −6.3712 W. Qibla ≈ 113° from true north.
- Already on MAWAQIT (ID 12009): jumuʿah ~13:00, iqāmah enabled, **Maghrib and ʿIshāʾ prayed jointly** — the site must represent this honestly.
- Women's space, janāzah facilities, Eid prayers, children/adult classes, Ramadan meals, disabled access, wudū facilities, parking.
- No existing website; two Facebook pages with inconsistent naming. The site establishes the canonical identity.

## 3. Architecture — "zero-dependency static"

**Decision: a pure static site.** No WordPress, no database, no server-side code, no build step, no npm. Plain HTML + one CSS design system + a few small vanilla-JS files.

Why this is the *premium* choice, not the cheap one:

| Concern | How the architecture answers it |
|---|---|
| **Security** | There is nothing to hack: no login, no database, no PHP, no plugins to patch. Attack surface ≈ zero. Hardened further with strict security headers (CSP, HSTS, no-sniff, frame-deny). No cookies, no trackers — GDPR-clean by construction. |
| **Speed** | No render-blocking frameworks. Self-hosted fonts (~300 KB total site weight). Loads in well under a second on a phone — Belfast's WordPress stack cannot come close. |
| **Freshness** | Prayer times are *computed*, not typed — they can never go stale. Announcements/events live in three small, heavily-commented data files the committee edits like a form. |
| **Cost** | £0/year hosting (Cloudflare Pages / Netlify free tier), only the domain (~£10/yr). |
| **Longevity** | Plain HTML from 2026 will still render in 2046. No framework rot, no plugin abandonment. |

**Prayer engine.** Vendored `adhan.js` v4.4.4 (MIT — the de-facto standard astronomical library) computing client-side:
- Method: **Moonsighting Committee** (adhan's own recommendation for the UK; latitude-aware seasonal model).
- High-latitude rule: **Seventh of the Night** — essential at 54.4°N where from mid-May to late July the sun never reaches 18° below the horizon and naive formulas break. This is also what the Moonsighting Committee itself applies at 55–60°N.
- All formatting through `Europe/London`, so GMT/BST transitions are automatic.
- Hijri date via the browser's built-in `islamic-umalqura` calendar with a committee-set ±day adjustment (local moonsighting can differ from Umm al-Qura).
- Iqāmah times are a human decision, so they come from config: per-prayer `fixed` time, `offset` from adhan (with rounding and a "never later than" cap for summer ʿIshāʾ), plus the joint Maghrib+ʿIshāʾ arrangement, plus jumuʿah.
- Everything above is editable in one config file, and an alternate MWL 18°/17° preset is one line away if the committee prefers to match existing printed timetables.

**MAWAQIT relationship.** The site is self-sufficient, but MAWAQIT stays supported: the official embeddable widget is linked from the prayer page ("compare with MAWAQIT"), and the committee keeps using the MAWAQIT admin/app as before. Long-term, the site's own TV display can replace the MAWAQIT screen; both can run in parallel indefinitely.

## 4. Site map

| Page | Purpose |
|---|---|
| **Home** | Welcome-first hero with live next-prayer card · today's six times (Begins + Jamāʿah) · jumuʿah callout · latest announcements · upcoming events · services overview · new-to-Islam invitation · visit info |
| **Prayer Times** | Today in detail with live countdown · full monthly timetable (any month, printable) · jumuʿah & Eid · qibla direction · method explainer · MAWAQIT link |
| **About** | The masjid and the Association · story & role in County Armagh · facilities · values · the wider NI Muslim community |
| **Services** | Productised: nikāḥ (with NI civil-law steps), janāzah, shahādah, imam consultation, Ramadan & Eid, welfare signposting |
| **New to Islam** | For non-Muslim neighbours and new Muslims: what Islam teaches, visit-the-mosque pathway, respectful FAQ, shahādah support |
| **Education** | Children's Qurʾān & Islamic-studies classes, adult learning, women's circle — with clear "how to register" CTAs |
| **Community** | All announcements (dated!) · events calendar · recurring activities · Facebook bridge |
| **Contact & Visit** | Map, directions from Portadown/Lurgan/Belfast, parking, accessibility, opening pattern, phone/WhatsApp/email, visit-request guidance |
| **TV Display** (`display.html`) | Full-screen MAWAQIT-style screen for the mosque television — see §6 |
| 404 | Branded, helpful |

## 5. Design system — "heritage, not template"

- **Palette:** warm paper (#FAF7F0) base · deep pine-green ink (#0F2E24 → #1B4D3B) · restrained brass gold (#B98A44) reserved for accents, rules and numerals. No gradients-everywhere, no saturated green+gold clash.
- **Typography:** Marcellus (inscriptional Roman serif) for display headings and prayer numerals · Inter variable for UI/body · **Amiri** for Arabic and Qurʾānic text · all self-hosted (no Google tracking). Correct transliteration diacritics throughout (Jamāʿah, ʿIshāʾ, Janāzah) — the quiet editorial-care signal premium sites share.
- **Signature geometry:** one motif — the eight-pointed khatam star — used sparingly: as the logo mark, as subtle 4–5%-opacity background pattern in hero/footer, as section-divider glyphs. Never wall-to-wall tiling.
- **Components:** sticky translucent header · letterspaced gold "eyebrow" labels · prayer strip with highlighted **Next** cell · date-chip event rows · arch-topped cards used judiciously · deep-green footer with a centred Qurʾānic verse.
- **Dark, calm TV theme** for the display screen (deep green-black + gold), designed for legibility across a prayer hall.
- **Accessibility:** WCAG AA contrast, keyboard navigation, skip links, `prefers-reduced-motion` support, semantic HTML, ARIA where needed.
- **Responsive:** mobile-first (most prayer-time checks happen on phones), print styles for the monthly timetable.

## 6. The TV display (`display.html`) — MAWAQIT-class, self-owned

A full-screen page for the television inside the masjid (any browser/TV stick pointed at the URL):
- Giant live clock + Gregorian and Hijri dates.
- All six times in Begins/Iqāmah columns, next prayer highlighted with countdown.
- Joint Maghrib–ʿIshāʾ arrangement displayed clearly.
- Jumuʿah panel (always visible; emphasised on Fridays).
- Rotating announcements from the same data file as the website.
- After iqāmah: a serene "Prayer in progress — please silence your phones" interlude (configurable duration), then back to the board.
- Works offline once loaded (everything is local computation); auto-recovers date changes at midnight.

## 7. Content management — built for a volunteer committee

Three heavily-commented data files are the *only* thing anyone ever edits:
- `content/config.js` — identity, contacts, coordinates, calculation method, iqāmah rules, jumuʿah, hijri adjustment, feature toggles.
- `content/announcements.js` — list of announcements (title, date, body, pinned flag, optional expiry — expired items hide themselves; nothing can go stale like Belfast's COVID pages).
- `content/events.js` — events (title, date, time, location, description); past events disappear automatically.

Editing is "open file, change text between quotes, save, publish" — documented step-by-step in `ADMIN-GUIDE.md` with screenshots-level detail. Publishing is a drag-and-drop to Cloudflare Pages/Netlify, or auto-deploy from GitHub if the committee adopts it later.

## 8. Security & privacy hardening

- `_headers` ships CSP (`default-src 'self'`), HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict `Referrer-Policy`, minimal `Permissions-Policy`.
- Zero third-party requests at runtime: fonts, JS, CSS all first-party. No analytics by default (privacy-friendly Cloudflare/Plausible can be added later without cookies).
- No forms that collect data (contact = tel/WhatsApp/mailto links) → no GDPR data-processing surface. A managed-form provider can be added deliberately later if wanted.
- Published contact details limited to what the Association already publishes on MAWAQIT — to be confirmed by the committee before launch.

## 9. Performance, SEO & discoverability

- Target: < 1 s first load on 4G; Lighthouse ≥ 95 across the board.
- Semantic HTML + per-page meta descriptions + Open Graph tags + canonical URLs.
- `Mosque` / `Organization` JSON-LD structured data (address, geo, opening pattern) → Google Maps/Search knowledge panel.
- `sitemap.xml`, `robots.txt`, branded favicon + social share image.
- The site becomes the canonical answer to "mosque near Portadown / Lurgan / Craigavon prayer times".

## 10. Delivery phases

1. ✅ **Research** — five parallel investigations (done).
2. **Foundation** — design system CSS, fonts, vendored adhan.js, geometric assets. *(in progress)*
3. **Engine** — prayer-times module, hijri, countdown, content loader, UI behaviours.
4. **Pages** — home, prayer times, display, then the six content pages.
5. **Quality gate** — multi-agent adversarial review (design consistency, accessibility, prayer-time correctness incl. June/December edge cases, broken links, JS errors) + fixes.
6. **Browser verification** — every page screenshotted desktop + mobile; console clean.
7. **Handover** — README (deploy in 10 minutes), ADMIN-GUIDE (committee editing manual), this plan.

## 11. Future roadmap (post-launch options)

- Photography of the masjid and community events (the single biggest upgrade available — premium sites are carried by real photography; the design leaves clean slots for it).
- Custom domain + email (craigavonmasjid.org.uk); the `craigavonmasjid.io` domain listed on MAWAQIT can redirect.
- Formal MAWAQIT API access (email support@mawaqit.net as the mosque) for two-way sync.
- Newsletter (Buttondown/Mailerlite), khutbah audio archive, Ramadan mode (automatic ifṭār/suḥūr panel — the engine already computes it), Irish/Arabic language toggle, madrasah registration form via a managed provider.
- Donations infrastructure — deliberately out of scope now, but the design reserves a natural place for it when the committee is ready.
