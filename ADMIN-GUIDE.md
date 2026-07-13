# Committee Admin Guide — Craigavon Masjid Website

*A plain-English manual. No technical knowledge needed.*

Everything you will ever need to change lives in **three files** inside the `content` folder. You can edit them with Notepad (right-click → Open with → Notepad). After editing, re-publish the site (see "Publishing changes" at the bottom).

**The golden rule:** only change the text between quotes `"..."` and the numbers. Never delete commas, colons, brackets `{ } [ ]`, or the words to the left of the colons.

---

## 1. Add an announcement

Open `content/announcements.js`. Copy an existing block and paste it **at the top** of the list, then edit:

```js
{
  title: "Eid prayer this Friday",
  body: "Eid al-Fitr prayer will be held at 8:30 am, in shāʾ Allāh. Please arrive by 8:15.",
  date: "2026-03-20",          // the date you post it
  pinned: true,                 // true = stays at top, highlighted
  expires: "2026-03-21",        // OPTIONAL: hides itself after this date
  icon: "star",                 // star, moon, clock, book, heart, megaphone
},
```

**Tip:** always set `expires` for anything time-bound (Eid times, closures, appeals). Expired announcements disappear from the website *and* the TV screen automatically — the site can never show stale news.

## 2. Add an event

Open `content/events.js`. Events with a past date disappear automatically.

```js
{
  title: "Community Open Day",
  date: "2026-08-08",           // YYYY-MM-DD
  time: "11:00",                // optional, 24-hour
  endTime: "15:00",             // optional
  location: "Craigavon Masjid",
  description: "All welcome — tour, questions, refreshments.",
},
```

The same file has `regularActivities` — the "every week" schedule (Jumuʿah, children's classes, adult circle). Edit days/times there once and it stays current.

## 3. Change prayer settings

Open `content/config.js`.

**Change a jamāʿah (iqāmah) rule** — find `iqamah:` and edit. Three formats:

```js
fajr:  { type: "offset", minutes: 30, roundTo: 5 },   // adhan + 30 min, rounded up to :05
dhuhr: { type: "fixed",  time: "13:30" },             // same clock time every day
isha:  { type: "joined" },                            // prayed together with Maghrib
```

You can also cap a summer time: `{ type: "offset", minutes: 15, roundTo: 5, latest: "22:30" }`.

**Change the Jumuʿah time** — find `jumuah:` and edit `time: "13:00"`. You can add a second jamāʿah by copying the line.

**Maghrib & ʿIshāʾ no longer joined?** Set `joinMaghribIsha: false` and give `isha` a real rule, e.g. `{ type: "offset", minutes: 15, roundTo: 5 }`.

**Hijri date is one day out?** (different moonsighting authorities differ) — set `hijriAdjustment: 1` or `-1`.

**Calculation method** — the site uses the Moonsighting Committee method with the seventh-of-the-night rule (the right choice for Northern Ireland's latitude). If the committee ever wants to match an 18° printed timetable instead, change `method: "MoonsightingCommittee"` to `method: "MuslimWorldLeague"`. Expect Fajr/ʿIshāʾ to shift by 10–25 minutes.

**Contact details** — phone, WhatsApp, email and Facebook links are all at the top of the same file.

## 4. The TV screen inside the masjid

The page `display.html` is a full prayer board (like MAWAQIT) built into this website:

1. Connect any small PC, laptop, Android TV stick or Raspberry Pi to the television.
2. Open the site's address followed by `/display.html` in a browser.
3. Press **F11** for full screen. That's it.

It shows the live clock, all six times with iqāmah, a countdown to the next prayer, the Hijri date, your announcements rotating at the bottom, and a calm "Prayer in progress" screen for 10 minutes after each iqāmah (change `prayerHoldMinutes` in `config.js`).

Recommended: in the device's power settings, disable sleep; set the browser to open that page on startup. The MAWAQIT screen can keep running alongside — they will show the same story as long as both use the same iqāmah rules.

## 5. Publishing changes

If the site is on **Cloudflare Pages** (recommended, free):

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) and log in with the committee account.
2. Open the project → "Create new deployment" → drag the whole website folder in.
3. Live within a minute.

Before publishing, you can preview your edit locally: just double-click `index.html` — the whole site works straight from the folder.

## 6. If something breaks

- Page looks wrong after an edit → you probably removed a quote, comma or bracket. Undo your change (Ctrl+Z in Notepad), save, try again.
- A safe copy of all three content files from launch day is worth keeping in a `backup` folder — make one now.
- Prayer times look different from another app → that is almost always a difference of calculation method, not an error. See the explanation on the Prayer Times page.
