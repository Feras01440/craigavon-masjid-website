/* ============================================================================
   Craigavon Masjid — prayer-times engine
   Wraps the vendored adhan.js (MIT, batoulapps/adhan-js) with the masjid's
   configuration: Moonsighting Committee method, seventh-of-the-night
   high-latitude rule (essential at 54.4°N), iqāmah rules, hijri date,
   Europe/London formatting, monthly timetable generation.
   Requires: assets/vendor/adhan.umd.min.js and content/config.js
   ============================================================================ */
(function () {
  'use strict';

  window.CIC = window.CIC || {};
  var cfg = window.CIC.config;
  if (!cfg || typeof adhan === 'undefined') {
    console.error('prayer-times.js: missing config.js or adhan library');
    return;
  }

  var TZ = cfg.location.timezone || 'Europe/London';
  var COORDS = new adhan.Coordinates(cfg.location.latitude, cfg.location.longitude);

  var PRAYER_META = [
    { key: 'fajr',    name: 'Fajr',    arabic: 'الفجر' },
    { key: 'sunrise', name: 'Sunrise', arabic: 'الشروق' },
    { key: 'dhuhr',   name: 'Dhuhr',   arabic: 'الظهر' },
    { key: 'asr',     name: 'ʿAsr',    arabic: 'العصر' },
    { key: 'maghrib', name: 'Maghrib', arabic: 'المغرب' },
    { key: 'isha',    name: 'ʿIshāʾ',  arabic: 'العشاء' },
  ];
  var FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  /* ---------- formatting helpers ---------- */

  var timeFmt = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  });
  var dateFmt = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
  });
  var ymdFmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ,
  });
  var wallFmt = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  });

  function fmt(date) { return date ? timeFmt.format(date) : '—'; }
  function fmtLongDate(date) { return dateFmt.format(date || new Date()); }
  function londonYMD(date) { return ymdFmt.format(date); } // "YYYY-MM-DD"

  function wallParts(date) {
    var parts = {};
    wallFmt.formatToParts(date).forEach(function (p) {
      if (p.type !== 'literal') parts[p.type] = p.value;
    });
    return {
      y: +parts.year, m: +parts.month, d: +parts.day,
      hh: +parts.hour === 24 ? 0 : +parts.hour, mm: +parts.minute,
    };
  }

  /* Return the absolute instant at which London wall-clock shows hh:mm on
     the same London calendar day as baseDate (DST-safe). */
  function londonWallDate(baseDate, hhmm) {
    var ymd = londonYMD(baseDate).split('-').map(Number);
    var t = hhmm.split(':').map(Number);
    var target = Date.UTC(ymd[0], ymd[1] - 1, ymd[2], t[0], t[1]);
    var guess = new Date(target);
    for (var i = 0; i < 2; i++) {
      var w = wallParts(guess);
      var shown = Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm);
      guess = new Date(guess.getTime() + (target - shown));
    }
    return guess;
  }

  /* ---------- calculation parameters ---------- */

  function buildParams() {
    var p;
    switch ((cfg.prayer.method || '').toLowerCase()) {
      case 'muslimworldleague': p = adhan.CalculationMethod.MuslimWorldLeague(); break;
      case 'northamerica':      p = adhan.CalculationMethod.NorthAmerica(); break;
      default:                  p = adhan.CalculationMethod.MoonsightingCommittee();
    }
    p.madhab = (cfg.prayer.madhab || '').toLowerCase() === 'hanafi'
      ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
    switch ((cfg.prayer.highLatitudeRule || '').toLowerCase()) {
      case 'middleofthenight': p.highLatitudeRule = adhan.HighLatitudeRule.MiddleOfTheNight; break;
      case 'twilightangle':    p.highLatitudeRule = adhan.HighLatitudeRule.TwilightAngle; break;
      default:                 p.highLatitudeRule = adhan.HighLatitudeRule.SeventhOfTheNight;
    }
    var adj = cfg.prayer.adjustments || {};
    p.adjustments = {
      fajr: adj.fajr || 0, sunrise: adj.sunrise || 0, dhuhr: adj.dhuhr || 0,
      asr: adj.asr || 0, maghrib: adj.maghrib || 0, isha: adj.isha || 0,
    };
    return p;
  }

  function rawTimes(date) {
    return new adhan.PrayerTimes(COORDS, date || new Date(), buildParams());
  }

  /* ---------- iqāmah resolution ---------- */

  function roundUp(date, toMinutes) {
    if (!toMinutes) return date;
    var ms = toMinutes * 60000;
    return new Date(Math.ceil(date.getTime() / ms) * ms);
  }

  function iqamahFor(key, adhanTime, date, sched) {
    var rule = (cfg.prayer.iqamah || {})[key];
    if (!rule || !adhanTime) return null;
    if (rule.type === 'joined') {
      return null; // rendered as "with Maghrib" etc. by the UI
    }
    var t = null;
    if (rule.type === 'fixed' && rule.time) {
      t = londonWallDate(date, rule.time);
    } else if (rule.type === 'offset') {
      t = roundUp(new Date(adhanTime.getTime() + (rule.minutes || 0) * 60000), rule.roundTo);
    } else if (rule.type === 'beforeSunrise' && sched && sched.sunrise) {
      t = new Date(sched.sunrise.getTime() - (rule.minutes || 0) * 60000);
      t = roundUp(t, rule.roundTo);
    }
    if (t && rule.latest) {
      var cap = londonWallDate(date, rule.latest);
      if (t > cap) t = cap;
    }
    return t;
  }

  /* ---------- public schedule ---------- */

  /* Full schedule for a date:
     { date, adhan: {fajr..isha: Date}, iqamah: {fajr..isha: Date|null},
       joined: {isha: 'maghrib'}?, jumuah: [{time, label}], isFriday } */
  function schedule(date) {
    date = date || new Date();
    var pt = rawTimes(date);
    var a = {
      fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr,
      asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha,
    };
    var iq = {};
    FIVE.forEach(function (k) { iq[k] = iqamahFor(k, a[k], date, a); });

    var weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: TZ }).format(date);
    return {
      date: date,
      adhan: a,
      iqamah: iq,
      joinMaghribIsha: !!cfg.prayer.joinMaghribIsha,
      jumuah: cfg.prayer.jumuah || [],
      isFriday: weekday === 'Friday',
    };
  }

  /* Next of the five daily prayers (adhan/beginning time) after `now`,
     looking into tomorrow if today is done.
     → { key, name, arabic, time: Date, iqamah: Date|null, isTomorrow } */
  function nextPrayer(now) {
    now = now || new Date();
    for (var dayOffset = 0; dayOffset <= 1; dayOffset++) {
      var d = new Date(now.getTime() + dayOffset * 86400000);
      var s = schedule(d);
      for (var i = 0; i < FIVE.length; i++) {
        var k = FIVE[i];
        if (s.adhan[k] && s.adhan[k] > now) {
          var meta = PRAYER_META.filter(function (m) { return m.key === k; })[0];
          return {
            key: k, name: meta.name, arabic: meta.arabic,
            time: s.adhan[k], iqamah: s.iqamah[k],
            isTomorrow: dayOffset === 1,
          };
        }
      }
    }
    return null;
  }

  /* Countdown pieces to a target Date */
  function until(target, now) {
    now = now || new Date();
    var ms = Math.max(0, target.getTime() - now.getTime());
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var text = h > 0 ? (h + 'h ' + m + 'm') : (m + 'm ' + s + 's');
    return { h: h, m: m, s: s, ms: ms, text: text };
  }

  /* ---------- hijri ---------- */

  function hijriDate(date) {
    var adj = (cfg.prayer.hijriAdjustment || 0) * 86400000;
    return new Date((date || new Date()).getTime() + adj);
  }
  function hijriString(date) {
    // en-GB islamic-umalqura output already ends in the era ("… 1448 AH")
    return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
    }).format(hijriDate(date));
  }
  function hijriMonth(date) {
    var parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      month: 'long', timeZone: TZ,
    }).formatToParts(hijriDate(date));
    var m = parts.filter(function (p) { return p.type === 'month'; })[0];
    return m ? m.value : '';
  }
  function isRamadan(date) {
    return /ramadan/i.test(hijriMonth(date));
  }

  /* ---------- monthly timetable ---------- */

  /* rows for a Gregorian month (monthIndex 0-11), formatted strings */
  function monthRows(year, monthIndex) {
    var rows = [];
    var todayYMD = londonYMD(new Date());
    var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    for (var d = 1; d <= daysInMonth; d++) {
      var date = new Date(year, monthIndex, d, 12, 0, 0); // midday avoids DST edges
      var s = schedule(date);
      var weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: TZ }).format(date);
      rows.push({
        day: d,
        weekday: weekday,
        isToday: londonYMD(date) === todayYMD,
        isFriday: weekday === 'Fri',
        hijri: new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
          day: 'numeric', month: 'short', timeZone: TZ,
        }).format(hijriDate(date)),
        fajr: fmt(s.adhan.fajr),
        sunrise: fmt(s.adhan.sunrise),
        dhuhr: fmt(s.adhan.dhuhr),
        asr: fmt(s.adhan.asr),
        maghrib: fmt(s.adhan.maghrib),
        isha: fmt(s.adhan.isha),
      });
    }
    return rows;
  }

  /* ---------- qibla ---------- */

  function qibla() { return adhan.Qibla(COORDS); }

  /* ---------- export ---------- */

  window.CIC.prayer = {
    META: PRAYER_META,
    FIVE: FIVE,
    schedule: schedule,
    nextPrayer: nextPrayer,
    until: until,
    fmt: fmt,
    fmtLongDate: fmtLongDate,
    londonYMD: londonYMD,
    londonWallDate: londonWallDate,
    hijriString: hijriString,
    hijriMonth: hijriMonth,
    isRamadan: isRamadan,
    monthRows: monthRows,
    qibla: qibla,
  };
})();
