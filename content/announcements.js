/* ============================================================================
   ANNOUNCEMENTS — shown on the Home page, Community page and the TV display.
   ----------------------------------------------------------------------------
   HOW TO EDIT (committee):
   · Copy an existing block from { to }, including the trailing comma.
   · Newest announcements first (top of the list).
   · date     — the date you post it, format "YYYY-MM-DD".
   · pinned   — true keeps it at the top with special styling; use sparingly.
   · expires  — OPTIONAL "YYYY-MM-DD"; the announcement hides itself after
                this date. Use it for anything time-bound so the site can
                never show stale news.
   · icon     — one of: "megaphone", "star", "moon", "book", "heart", "clock"
   ============================================================================ */

window.CIC = window.CIC || {};

window.CIC.announcements = [
  {
    title: "Welcome to the new Craigavon Masjid website",
    body: "Alḥamdulillāh — our community now has a permanent online home. Live prayer times, the monthly timetable, classes and community news will all be published here. Please share it with family and friends.",
    date: "2026-07-12",
    pinned: true,
    icon: "star",
  },
  {
    title: "Jumuʿah at 1:00 pm every Friday",
    body: "Khuṭbah and prayer begin at 1:00 pm at 16 Legahory Centre. Please arrive early, especially in busy weeks — and bring a prayer mat if you can.",
    date: "2026-07-12",
    pinned: false,
    icon: "clock",
  },
  {
    title: "Maghrib and ʿIshāʾ prayed together",
    body: "Please note that at the masjid, ʿIshāʾ is currently prayed in congregation together with Maghrib. Check the prayer times page for today's times.",
    date: "2026-07-12",
    pinned: false,
    icon: "moon",
  },
];
