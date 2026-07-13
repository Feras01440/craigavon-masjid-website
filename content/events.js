/* ============================================================================
   EVENTS & REGULAR ACTIVITIES — shown on the Home page and Community page.
   ----------------------------------------------------------------------------
   HOW TO EDIT (committee):

   EVENTS (dated, one-off):
   · date "YYYY-MM-DD" — events disappear from the site automatically the
     day after they finish, so nothing ever goes stale.
   · time / endTime are optional, 24-hour "HH:MM".

   REGULAR ACTIVITIES (weekly rhythm of the masjid):
   · day — day of the week; shown as an always-current schedule.
   · Note: these are EXAMPLES seeded from the masjid's public directory
     listings — please correct days/times before launch.
   ============================================================================ */

window.CIC = window.CIC || {};

window.CIC.events = [
  {
    title: "Community Open Day — Visit My Mosque",
    date: "2026-08-08",
    time: "11:00",
    endTime: "15:00",
    location: "Craigavon Masjid, 16 Legahory Centre",
    description: "Neighbours of all faiths and none are warmly invited: tour the masjid, ask anything, and share refreshments with the community.",
  },
  {
    title: "Family Fun Day & BBQ",
    date: "2026-07-25",
    time: "13:30",
    location: "Craigavon Masjid",
    description: "Food, games and activities for children and families after Dhuhr. All welcome — bring the kids!",
  },
];

window.CIC.regularActivities = [
  {
    day: "Friday",
    title: "Jumuʿah — khuṭbah & congregational prayer",
    time: "13:00",
    note: "The weekly congregational prayer. All Muslims welcome; visitors may observe respectfully.",
  },
  {
    day: "Saturday",
    title: "Children's Qurʾān & Islamic studies classes",
    time: "Morning",
    note: "Qurʾān reading, memorisation and Islamic manners for children. Contact us to register.",
  },
  {
    day: "Sunday",
    title: "Adult learning circle",
    time: "After Maghrib",
    note: "Tafsīr, fiqh essentials and questions — open to brothers and sisters.",
  },
];
