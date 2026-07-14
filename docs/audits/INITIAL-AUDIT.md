# Initial platform, content and operational audit

**Audit date:** 13 July 2026  
**Audited branch:** `origin/main` at `3b161718b6080f9162c561c09b886e47b0811bdf`  
**Working branch:** `codex/production-platform-rebuild`

## Scope and method

This audit records the inherited state before the production rebuild. It covers every tracked page,
script, stylesheet, data file, document and asset; all four commits in the repository history; a
local browser run of the homepage; and targeted searches for factual, editorial, accessibility,
security and prayer-time risks.

The original working tree was clean. The local repository initially contained no checkout or remote;
it was connected to the repository named in the brief, fetched, and the working branch was created
directly from `origin/main`.

Evidence captured before replacement:

- `docs/audits/evidence/baseline-home-1440.png`
- `docs/audits/evidence/baseline-home-375.png`

The supplied `serve.ps1` did not start successfully in the audit environment because
`System.Net.HttpListener` could not be constructed. The static site did render when served through a
standard local HTTP server. The inherited homepage produced no console warnings or errors during
that browser run.

Static baseline checks passed for JavaScript syntax, JSON/XML parsing, local link and fragment
targets, duplicate IDs, `git fsck --full --strict` and `git diff --check`. There was no inherited
package manifest, test runner, linter, type checker, accessibility suite, HTML validator, CI
workflow or reproducible performance measurement to run.

## Evidence labels

Findings use the following labels throughout this report:

- **Verified fact** — established directly from repository or runtime evidence. This does not mean a
  public organisational claim has been committee-approved.
- **Committee confirmation required** — a claim or setting that must not be published until an
  authorised Association representative confirms it.
- **Technical finding** — an implementation or architecture observation.
- **Editorial recommendation** — a content-quality or information-architecture change.
- **Accessibility issue** — a barrier or material WCAG risk.
- **Security issue** — a threat, privacy risk or missing control.
- **Product opportunity** — a valuable user or operational journey absent from the inherited site.

## Repository and history baseline

### Verified facts

- The inherited application is a static HTML, CSS and JavaScript site with no package manifest,
  application server, database, authentication system, automated migrations or test suite.
- The history contains four commits, all dated 13 July 2026: an initial 5,388-line build, removal of
  a failed vendor-download artefact, one accessibility CSS change, and a 21-finding quality pass.
- Public routes are implemented as ten standalone HTML files: home, prayer times, TV display, about,
  services, education, community, new to Islam, contact and 404.
- Site-wide data is hardcoded in `content/config.js`, `content/announcements.js` and
  `content/events.js`. Committee editors are told to modify JavaScript punctuation in Notepad and
  manually upload the whole folder.
- Prayer calculations are performed entirely in the visitor's browser using a vendored minified
  build of `adhan.js`.
- Six local font files and a generated social image are included. `favicon.svg` uses the fictional
  geometric identity the brief explicitly rejects.
- The site includes static Cloudflare/Netlify-style headers, a sitemap, robots file and web
  manifest.

### Technical findings

| Severity | Finding                                                                              | Evidence and consequence                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | There is no administration platform.                                                 | `ADMIN-GUIDE.md` instructs volunteers to edit executable JavaScript. There is no authentication, authorisation, validation, preview, audit log, revision history or safe publication workflow.                                                                                     |
| Critical | The repository cannot provide the requested source of truth for operational content. | Content lives in deployable source files and is cached publicly. Concurrent edits, scheduled publication, soft deletion, rollback and traceable approval are impossible.                                                                                                           |
| High     | The architecture cannot responsibly support enquiries or media.                      | There is no server, trusted validation boundary, private data store, notification route or object storage.                                                                                                                                                                         |
| High     | There is no automated quality gate.                                                  | No `package.json`, tests, type checking, linting, build validation, accessibility runner, browser suite, CI workflow, dependency scanner or secret scanner exists.                                                                                                                 |
| High     | The same header, footer and metadata are duplicated across HTML files.               | Routine changes require repeated manual edits and have already produced repeated location-heavy copy.                                                                                                                                                                              |
| High     | The documented three-file content contract is false.                                 | Although `assets/js/app.js` implements a `data-config` helper, the HTML contains no `data-config` hooks. Contact details, structured data, Jumu'ah, social links and operational prose are duplicated directly, so changing `content/config.js` leaves public output inconsistent. |
| High     | The deployed CSP conflicts with the markup.                                          | `_headers` disallows inline styles while the inherited HTML contains 77 `style` attributes and `assets/js/app.js` generates another. A supporting host will reject those declarations.                                                                                             |
| Medium   | The local preview path is fragile.                                                   | The bespoke `serve.ps1` failed before binding in the audit environment and incorrectly printed a success line after the failure.                                                                                                                                                   |
| Medium   | The site relies on JavaScript for its primary operational content.                   | With JavaScript unavailable, users receive only a link to an external listing rather than a server-rendered approved timetable.                                                                                                                                                    |
| Medium   | Cache guidance is unsafe for mutable operational data.                               | `_headers` gives all `/assets/*` a one-year immutable cache even though JavaScript filenames are not content-hashed. Replacing a file at the same URL can leave stale prayer or display code in clients.                                                                           |

## Public content and information architecture

### Committee confirmation required

The inherited public site presents each item below as settled fact without a committee evidence
record:

- official public-facing masjid name and Arabic rendering;
- street address, postcode, coordinates, map target and qibla bearing;
- telephone and WhatsApp number, email address, Facebook page and MAWAQIT listing;
- the claim that it is the only mosque in County Armagh and assertions about the nearest
  alternatives;
- congregation times, the single 13:00 Jumu'ah session and the joint Maghrib/'Isha arrangement;
- prayer calculation method, madhhab, high-latitude rule, per-prayer adjustments and Hijri-date
  policy;
- prayer hall, women's area, wudu areas, step-free access, parking, children's classes, adult
  learning, Ramadan meals, janazah facilities, nikah support, imam consultations and welfare
  signposting;
- visitor access, opening pattern, language of the Friday sermon and response arrangements;
- population statistics, organisational history, geographical service area and claims about
  community reach;
- all quoted Qur'anic text, translations and translation licensing.

These items must be absent from public output or visibly unavailable until confirmed. The rebuild
must keep inherited values only as unpublished reference data where doing so helps a committee
review them.

### Editorial recommendations

| Priority | Finding                                                                  | Evidence and recommendation                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | The site repeatedly centres a marketing list of towns and County Armagh. | The same footer sentence appears on every page and multiple titles/descriptions repeat Craigavon, Portadown and Lurgan. Lead with the Association; reserve location language for directions and restrained local metadata. |
| High     | Several statements are expressly prohibited by the rebuild brief.        | `docs/PLAN.md` says "definitive", "only mosque" and "effectively unhackable". `about.html` and `contact.html` publish the unverified exclusivity claim. Remove rather than soften them.                                    |
| High     | Service copy promises capabilities that have not been approved.          | Nikah, janazah, shahadah, Ramadan, Eid, welfare, education and visitor arrangements are described in operational detail. Publish only confirmed service records with scope, limitations and next steps.                    |
| High     | The voice contains predictable promotional language.                     | Examples include "at the heart", "for every step of life", "the heartbeat of the masjid", "the whole community" and broad welcome claims. Replace with practical, specific information.                                    |
| High     | Three launch-day announcements are fictional operational content.        | `content/announcements.js` publishes a website launch, Jumu'ah time and combined-prayer notice without a recorded approver. The rebuilt production seed must contain no public announcements or events.                    |
| Medium   | The homepage tries to reproduce most of the site.                        | It contains prayers, announcements, events, services, visitor education, directions, contacts, facilities and two scripture quotations. Reduce it to immediate operational needs and clear pathways.                       |
| Medium   | Terminology is more specialist than needed for a mixed audience.         | Familiar English labels should precede transliteration where that improves comprehension, while correct Arabic language and direction are retained where Arabic is genuinely useful.                                       |
| Medium   | Empty states direct users to an unconfirmed external page.               | Empty events copy inserts a Facebook link from hardcoded configuration. Empty states should remain truthful even when no contact or social channel is approved.                                                            |

### Product opportunities

- A clear, database-backed status model for urgent notices, announcements, events, services,
  education, policies and frequently asked questions.
- A calm launch-blocker state that explains when prayer or contact information has not yet been
  approved.
- Preview, scheduling, expiry, revision restore, optimistic concurrency and accountable publication.
- Structured visit, new-Muslim and service-enquiry pathways that can remain feature-flagged until
  privacy and routing are approved.
- Search/filtering and calendar downloads for confirmed events.
- Policy templates that are explicitly marked as drafts until adopted.

## Prayer-time and TV-display audit

### Technical findings

| Severity | Finding                                                                                      | Evidence and consequence                                                                                                                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | Browser calculation is treated as authoritative without an approval or publication boundary. | `content/config.js` directly drives every visitor and display. A typo becomes live after upload; no one is recorded as approver and there is no rollback beyond source control.                                                                                            |
| Critical | Congregation times are fabricated from unapproved rules.                                     | Fajr, Dhuhr, Asr and Maghrib use offsets/fixed rules; 'Isha is marked joined; Jumu'ah is fixed at 13:00. Missing values do not remain explicitly unknown.                                                                                                                  |
| Critical | The fixed Jumu'ah setting can precede calculated Dhuhr.                                      | Direct runs of the inherited library and configuration produced Dhuhr at 13:30 on 17 April 2026, 13:37 on 17 July and 13:16 on 16 October, while Jumu'ah is hardcoded to 13:00. The site can therefore advertise Friday prayer before the calculated prayer window begins. |
| Critical | "Next prayer" is not the next congregational event.                                          | The inherited selector considers only calculated prayer starts. It skips pending congregation times and every Jumu'ah session, so the public and TV answer can advance while the current prayer's congregation is still ahead.                                             |
| High     | There are no per-date overrides or seasonal schedules.                                       | Exceptional changes, Ramadan, Eid, closures and one-off Jumu'ah sessions cannot be represented safely without editing global rules or publishing prose notices.                                                                                                            |
| High     | The system has no independent verification evidence.                                         | No fixtures compare output with an approved committee timetable. The claim that calculated times "can never go stale" confuses astronomical calculation with operational approval.                                                                                         |
| High     | Critical edge cases are untested.                                                            | There are no tests for either UK clock change, foreign device timezones, high-latitude dates, leap years, Hijri adjustments, Friday replacement, missing congregation values, offline recovery or multi-day displays.                                                      |
| High     | London date handling still depends on the device timezone.                                   | Several functions derive a London date string and then construct a `Date` in the visitor's local timezone. Timetable and next-day behaviour can shift for devices far from Europe/London.                                                                                  |
| High     | The advertised high-latitude control has no demonstrated effect.                             | Direct checks of all three configured high-latitude options on 21 June produced identical Fajr and 'Isha output under the selected calculation method. The control is presented as meaningful without engine evidence.                                                     |
| High     | Invalid or ambiguous DST wall times are silently normalised.                                 | A fixed 01:30 setting on the UK spring transition maps to 02:30; an autumn 01:30 silently chooses one occurrence. Publication must reject or explicitly resolve these cases.                                                                                               |
| High     | The TV display is not network-aware.                                                         | It shows neither last successful update nor online/offline state and cannot distinguish cached data from current approved data.                                                                                                                                            |
| Medium   | Display updates are only partially resilient.                                                | The grid refreshes at a London date change and around prayer boundaries, but configuration and announcement files are never refetched. A screen left open cannot receive committee updates.                                                                                |
| Medium   | Prayer-in-progress mode can fall back to an adhan time.                                      | `assets/js/display.js` uses `sched.iqamah[k]                                                                                                                                                                                                                               |     | sched.adhan[k]`, which can imply a congregation has begun when no congregation time exists. |
| Medium   | Monthly output omits congregation times.                                                     | The table contains only calculated starts even though the public page frames the site as a source for both starts and jama'ah. There is no download format.                                                                                                                |

### Required replacement constraints

- No prayer configuration reaches the public site until it is explicitly approved and published.
- Calculated starts, committee-set congregation times, Jumu'ah sessions, overrides and seasonal
  arrangements are separate structured records.
- Missing congregation data remains missing and produces a calm contact/check-latest-information
  message.
- Every prayer publication creates a revision and audit event, requires explicit confirmation and
  supports rollback.
- Server-rendered fallback output must remain useful without client JavaScript.
- TV clients must refresh data, track last success, detect offline state, recover automatically and
  roll across midnight and clock changes.

## Accessibility audit

### Positive inherited features

- A skip link and semantic `main`, navigation and footer landmarks are present.
- Arabic snippets generally use `lang="ar"`.
- Reduced-motion and print styles exist.
- The monthly prayer table uses column headers, a caption and `aria-current` for today.
- Visible page structure remained usable in the recorded 375-pixel browser run.

These positives are implementation observations, not evidence of WCAG 2.2 AA conformance.

### Accessibility issues

| Severity | Finding                                                                                                        | Evidence and consequence                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | The mobile menu depends on JavaScript and hides navigation by default.                                         | A script or load failure can remove the primary navigation on narrow screens. The rebuild should provide a resilient disclosure pattern and server-rendered essentials.                                     |
| High     | Live countdowns update every second without a deliberate announcement policy.                                  | Repeatedly changing time text risks noisy screen-reader output; meaningful changes need a restrained live-region strategy.                                                                                  |
| High     | Event dates are hidden from assistive technology.                                                              | `assets/js/app.js` renders the visual date chip inside an `aria-hidden` container and emits no equivalent `<time>` element.                                                                                 |
| High     | The TV hold screen toggles `aria-hidden` while remaining in the DOM without a tested focus/announcement model. | Display mode is primarily visual but must not create confusing duplicate or hidden status content for assistive technology.                                                                                 |
| Medium   | Icon-only and generated controls lack a consistent component contract.                                         | SVGs and mobile-navigation state are assembled across static markup and script, making accessible names and states difficult to enforce.                                                                    |
| Medium   | Tables force horizontal overflow at narrow widths.                                                             | The table may remain technically scrollable but lacks a documented small-screen reading strategy or sticky row context.                                                                                     |
| Medium   | Monthly dates are data cells rather than row headers.                                                          | The generated timetable uses `<td>` for each date. `<th scope="row">` is needed to preserve row context.                                                                                                    |
| Medium   | The focus colour is too weak on the paper background.                                                          | The inherited brass outline measures approximately 2.89:1 against the light page background, below the 3:1 non-text contrast threshold.                                                                     |
| Medium   | Arabic direction is not explicit.                                                                              | Arabic snippets frequently have `lang="ar"` but no `dir="rtl"`; the CSS direction rule applies only to one of several Arabic classes. Mixed-direction punctuation and display labels are therefore fragile. |
| Medium   | Transliterated terms dominate several headings and service descriptions.                                       | Pronunciation marks and unfamiliar terminology increase reading effort for visitors, dyslexic readers and people new to mosque vocabulary.                                                                  |
| Medium   | There is no evidence of keyboard, screen-reader, zoom, forced-colours or high-contrast manual testing.         | The previous "accessibility" commit adjusted CSS only; it is not a conformance report.                                                                                                                      |
| Medium   | No automated accessibility test is repeatable.                                                                 | Axe, semantic assertions and keyboard routes are absent from CI.                                                                                                                                            |

## Security and privacy audit

### Positive inherited features

- The static site contains no account, database or public form attack surface.
- Runtime third-party requests are intentionally limited and fonts/scripts are self-hosted.
- `_headers` contains a restrictive baseline CSP, HSTS, frame denial, no-sniff, referrer and
  permissions policies.
- Dynamic announcement and event strings are HTML-escaped before insertion.

### Security issues

| Severity | Finding                                                                             | Evidence and consequence                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | Content integrity depends on repository/hosting access and manual JavaScript edits. | There is no least-privilege role model; anyone able to deploy can change prayer times and all public content.                                                     |
| High     | No audit trail or administrator offboarding exists.                                 | The project cannot attribute a sensitive change, disable a committee editor, revoke sessions or demonstrate incident history.                                     |
| High     | No supply-chain maintenance exists.                                                 | The vendored minified prayer library has no automated update, integrity or vulnerability workflow. Fonts and generated assets also lack provenance documentation. |
| High     | The security documentation overstates safety.                                       | "Effectively unhackable" and "attack surface approximately zero" ignore hosting accounts, DNS, GitHub, content integrity and dependency risks.                    |
| High     | There is no environment or secret-management model.                                 | A future database/auth implementation would have no validation boundary, rotation guide or deployment separation.                                                 |
| Medium   | Security headers are deployment-specific and untested.                              | Direct local/file use and alternative hosts do not apply `_headers`; no automated check verifies production responses.                                            |
| Medium   | There is no incident, backup or restore procedure.                                  | Source control is not a sufficient database, enquiry, auth or media recovery plan for the required platform.                                                      |
| Medium   | Public personal-data assertions lack an approval trail.                             | Contact and social details are hardcoded from an external listing and repeated across the site.                                                                   |

## Decision

The inherited static site is a useful visual and user-needs prototype, but it is not a safe
long-term publishing system for committee members and cannot meet the brief through incremental
patching. The rebuild should use a supported Next.js App Router application with strict TypeScript
and a Supabase-backed PostgreSQL, Auth and Storage boundary. Public pages should prefer server
rendering and static generation, while interactive client code is limited to countdowns, navigation,
filters, forms and the TV display.

The initial production seed will be deliberately conservative:

- the text brand lock-up will identify the Muslim Association of Craigavon;
- the unapproved geometric mark will not be used;
- inherited contact, facilities, service, event and prayer values will not be public;
- no fictional announcements or events will be seeded;
- unavailable operational information will have an explicit, calm fallback;
- every launch dependency will be tracked in `docs/COMMITTEE-CONFIRMATIONS.md`.

The complete platform decision and trade-offs are recorded separately in
`docs/architecture/ADR-001-platform-architecture.md`.
