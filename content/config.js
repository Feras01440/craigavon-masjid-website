/* ============================================================================
   CRAIGAVON MASJID — SITE CONFIGURATION
   ----------------------------------------------------------------------------
   This is the master settings file for the whole website AND the TV display.
   Committee members: you can safely edit the values between quotes "..."
   and the numbers. Keep every comma, colon and bracket exactly as it is.
   After saving, re-publish the site (see ADMIN-GUIDE.md).
   ============================================================================ */

window.CIC = window.CIC || {};

window.CIC.config = {

  /* ---------- Identity ---------- */
  name: "Craigavon Masjid",
  nameArabic: "مسجد كريقافن",
  association: "Muslim Association of Craigavon",
  tagline: "Serving the Muslim community of Craigavon, Portadown & Lurgan",

  /* ---------- Address & contact ----------
     NOTE: phone/email below are taken from the masjid's public MAWAQIT
     listing. Please confirm or replace them before launch. */
  address: {
    line1: "16 Legahory Centre",
    town: "Craigavon",
    county: "Co. Armagh",
    postcode: "BT65 5BE",
    country: "Northern Ireland",
  },
  phone: "+44 7400 088823",
  whatsapp: "+447400088823",          // digits only after +, used for wa.me link
  email: "abuzid@gmail.com",
  facebook: "https://www.facebook.com/p/Craigavon-Masjid-100079448451488/",
  facebookAssociation: "https://www.facebook.com/p/Muslim-Association-Of-Craigavon-100081051507099/",
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Craigavon%20Masjid%2C%2016%20Legahory%20Centre%2C%20Craigavon%20BT65%205BE",

  /* ---------- MAWAQIT (kept as a companion, not a dependency) ---------- */
  mawaqit: {
    pageUrl: "https://mawaqit.net/en/craigavon-masjid-craigavon-bt65-5be-united-kingdom",
    widgetUrl: "https://mawaqit.net/en/w/craigavon-masjid-craigavon-bt65-5be-united-kingdom",
    showLink: true,                    // show "also on MAWAQIT" links
  },

  /* ---------- Location (drives all prayer calculations) ---------- */
  location: {
    latitude: 54.4478326,
    longitude: -6.3711607,
    timezone: "Europe/London",
  },

  /* ---------- Prayer calculation ----------
     method:  "MoonsightingCommittee"  (recommended for the UK — seasonal,
                                        latitude-aware model)
              "MuslimWorldLeague"      (classic 18°/17° — use if the committee
                                        prefers to match older printed tables)
     madhab:  "shafi" (standard ʿAsr) or "hanafi" (later ʿAsr)
     highLatitudeRule: "seventhofthenight" | "middleofthenight" | "twilightangle"
              Seventh-of-the-night is what the Moonsighting Committee itself
              applies at 55–60°N; essential for NI summers.
     adjustments: fine-tune each time by ± minutes if needed.
     hijriAdjustment: shift the Islamic date by -2..+2 days to match the
              moonsighting authority the masjid follows. */
  prayer: {
    method: "MoonsightingCommittee",
    madhab: "shafi",
    highLatitudeRule: "seventhofthenight",
    adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    hijriAdjustment: 0,

    /* Maghrib and ʿIshāʾ are currently prayed together at the masjid
       (as stated on the masjid's MAWAQIT page). Set to false if this
       arrangement changes. */
    joinMaghribIsha: true,

    /* Iqāmah (jamāʿah) rules per prayer. Three types:
         { type: "offset", minutes: 20, roundTo: 5 }  → adhan + 20 min, rounded
         { type: "fixed",  time: "13:30" }            → same clock time daily
         { type: "joined" }                            → prayed with previous
       Optional "latest": "22:30" caps an offset time (summer ʿIshāʾ).      */
    iqamah: {
      fajr:    { type: "offset", minutes: 30, roundTo: 5 },
      dhuhr:   { type: "offset", minutes: 15, roundTo: 5 },
      asr:     { type: "offset", minutes: 15, roundTo: 5 },
      maghrib: { type: "offset", minutes: 10, roundTo: 5 },
      isha:    { type: "joined" },
    },

    /* Jumuʿah — fixed clock time(s), independent of Dhuhr */
    jumuah: [
      { time: "13:00", label: "Khuṭbah & prayer" },
    ],
  },

  /* ---------- TV display (display.html) ---------- */
  display: {
    /* Minutes after iqāmah during which the screen shows the calm
       "prayer in progress" interlude. */
    prayerHoldMinutes: 10,
    /* Seconds each announcement stays on screen before rotating. */
    announcementSeconds: 12,
  },

  /* ---------- Opening pattern shown on the Contact page ---------- */
  openingNote: "The masjid opens for the five daily prayers and Jumuʿah. For visits outside prayer times, please contact us first — we are glad to welcome you.",
};
