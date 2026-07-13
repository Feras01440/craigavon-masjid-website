/* ============================================================================
   Craigavon Masjid — TV display (display.html)
   Full-screen prayer board for the television inside the masjid:
   live clock, Gregorian + Hijri dates, six times with jamāʿah column,
   next-prayer highlight & countdown, rotating announcements, and a calm
   "prayer in progress" interlude after each iqāmah.
   Requires: config.js, announcements.js, adhan, prayer-times.js
   ============================================================================ */
(function () {
  'use strict';

  var prayer = (window.CIC || {}).prayer;
  var cfg = (window.CIC || {}).config || {};
  if (!prayer) return;

  var els = {
    clock: document.querySelector('[data-dsp-clock]'),
    seconds: document.querySelector('[data-dsp-seconds]'),
    gdate: document.querySelector('[data-dsp-gdate]'),
    hdate: document.querySelector('[data-dsp-hdate]'),
    grid: document.querySelector('[data-dsp-grid]'),
    nextName: document.querySelector('[data-dsp-next-name]'),
    nextIn: document.querySelector('[data-dsp-next-in]'),
    jumuah: document.querySelector('[data-dsp-jumuah]'),
    announce: document.querySelector('[data-dsp-announce]'),
    hold: document.querySelector('[data-dsp-hold]'),
  };

  var TZ = (cfg.location || {}).timezone || 'Europe/London';
  var clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  var secFmt = new Intl.DateTimeFormat('en-GB', { second: '2-digit', timeZone: TZ });

  /* ---------- prayer grid ---------- */

  var gridDay = null; // londonYMD the grid was rendered for

  function renderGrid() {
    if (!els.grid) return;
    var now = new Date();
    var sched = prayer.schedule(now);
    var next = prayer.nextPrayer(now);
    gridDay = prayer.londonYMD(now);

    els.grid.innerHTML = prayer.META.map(function (m) {
      var isNext = next && !next.isTomorrow && next.key === m.key;
      var rule = ((cfg.prayer || {}).iqamah || {})[m.key];
      var iq = m.key === 'sunrise' ? ''
        : rule && rule.type === 'joined' ? '<div class="dsp-cell__iqamah">with Maghrib</div>'
        : sched.iqamah[m.key] ? '<div class="dsp-cell__iqamah">Iqāmah ' + prayer.fmt(sched.iqamah[m.key]) + '</div>'
        : '';
      return (
        '<div class="dsp-cell' + (isNext ? ' dsp-cell--next' : '') + '">' +
          '<div class="dsp-cell__name">' + m.name + '</div>' +
          '<div class="dsp-cell__arabic" lang="ar">' + m.arabic + '</div>' +
          '<div class="dsp-cell__time">' + prayer.fmt(sched.adhan[m.key]) + '</div>' +
          iq +
        '</div>'
      );
    }).join('');

    if (els.jumuah) {
      var j = (cfg.prayer || {}).jumuah || [];
      els.jumuah.innerHTML = j.map(function (x) {
        return '<span class="dsp-jumuah__item">Jumuʿah <strong>' + x.time + '</strong></span>';
      }).join('');
    }
  }

  /* ---------- clock + countdown tick ---------- */

  function tick() {
    var now = new Date();
    if (els.clock) els.clock.textContent = clockFmt.format(now);
    if (els.seconds) els.seconds.textContent = secFmt.format(now);
    if (els.gdate) els.gdate.textContent = prayer.fmtLongDate(now);
    if (els.hdate) els.hdate.textContent = prayer.hijriString(now);

    // re-render the grid when the calendar day flips or a prayer passes
    if (prayer.londonYMD(now) !== gridDay) renderGrid();

    var next = prayer.nextPrayer(now);
    if (next) {
      var c = prayer.until(next.time, now);
      if (els.nextName) {
        els.nextName.innerHTML = next.name +
          ' <span lang="ar" class="dsp-arabic">' + next.arabic + '</span>' +
          (next.isTomorrow ? ' <span class="dsp-tomorrow">tomorrow</span>' : '');
      }
      if (els.nextIn) {
        els.nextIn.textContent =
          (c.h > 0 ? c.h + ':' : '') +
          String(c.m).padStart(2, '0') + ':' +
          String(c.s).padStart(2, '0');
      }
      // when a prayer time arrives, refresh highlighting
      if (c.ms < 1500) setTimeout(renderGrid, 2000);
    }

    updateHold(now);
  }

  /* ---------- "prayer in progress" interlude ---------- */

  function holdWindow(now) {
    var holdMin = ((cfg.display || {}).prayerHoldMinutes || 10) * 60000;
    var sched = prayer.schedule(now);

    var starts = [];
    prayer.FIVE.forEach(function (k) {
      var rule = ((cfg.prayer || {}).iqamah || {})[k];
      if (rule && rule.type === 'joined') return; // covered by the prayer it joins
      var t = sched.iqamah[k] || sched.adhan[k];
      if (!t) return;
      // Friday: jumuʿah replaces dhuhr congregation
      if (k === 'dhuhr' && sched.isFriday && sched.jumuah.length) {
        sched.jumuah.forEach(function (j) {
          starts.push({ name: 'Jumuʿah', t: prayer.londonWallDate(now, j.time) });
        });
        return;
      }
      starts.push({ name: k, t: t });
    });

    for (var i = 0; i < starts.length; i++) {
      var s = starts[i];
      if (now >= s.t && now < new Date(s.t.getTime() + holdMin)) return s;
    }
    return null;
  }

  function updateHold(now) {
    if (!els.hold) return;
    var h = holdWindow(now);
    els.hold.classList.toggle('is-active', !!h);
    els.hold.setAttribute('aria-hidden', h ? 'false' : 'true');
  }

  /* ---------- announcements rotation ---------- */

  function activeAnnouncements() {
    var list = (window.CIC || {}).announcements || [];
    var today = prayer.londonYMD(new Date());
    return list.filter(function (a) { return !a.expires || a.expires >= today; });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var annIndex = 0;
  function rotateAnnouncement() {
    if (!els.announce) return;
    var items = activeAnnouncements();
    if (!items.length) {
      els.announce.innerHTML = '<span class="dsp-announce__title">' + esc(cfg.name) +
        '</span><span class="dsp-announce__body">' + esc(cfg.tagline || '') + '</span>';
      return;
    }
    var a = items[annIndex % items.length];
    annIndex++;
    els.announce.classList.remove('is-in');
    // force reflow so the fade replays
    void els.announce.offsetWidth;
    els.announce.innerHTML =
      '<span class="dsp-announce__title">' + esc(a.title) + '</span>' +
      '<span class="dsp-announce__body">' + esc(a.body) + '</span>';
    els.announce.classList.add('is-in');
  }

  /* ---------- start ---------- */

  renderGrid();
  tick();
  setInterval(tick, 1000);
  rotateAnnouncement();
  setInterval(rotateAnnouncement, ((cfg.display || {}).announcementSeconds || 12) * 1000);
})();
