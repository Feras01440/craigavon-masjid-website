/* ============================================================================
   Craigavon Masjid — shared UI behaviours & component renderers
   Renders into elements marked with data-attributes, so each page opts in
   simply by including the markup hook. No frameworks, no inline scripts.
   Requires config.js; prayer widgets additionally require adhan + prayer-times.js;
   announcements/events widgets require their content files.
   ============================================================================ */
(function () {
  'use strict';

  var cfg = (window.CIC || {}).config || {};
  var prayer = (window.CIC || {}).prayer;

  /* ---------- tiny helpers ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var ICONS = {
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11v3l15 5V6L3 11z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/><path d="M18 8a3 3 0 0 1 0 8"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  };
  function icon(name) { return ICONS[name] || ICONS.star; }

  /* ---------- mobile navigation ---------- */

  var toggle = $('.nav-toggle');
  var nav = $('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- footer year ---------- */

  $all('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- dates ---------- */

  if (prayer) {
    $all('[data-today-date]').forEach(function (el) {
      el.textContent = prayer.fmtLongDate(new Date());
    });
    $all('[data-hijri-date]').forEach(function (el) {
      el.textContent = prayer.hijriString(new Date());
    });
  }

  /* ---------- prayer strip (today, 6 cells) ---------- */

  function iqamahLabel(sched, key) {
    if (key === 'sunrise') return '';
    // on Fridays the Dhuhr congregation is Jumuʿah, not the daily offset
    if (key === 'dhuhr' && sched.isFriday && sched.jumuah.length) {
      return '<div class="prayer-cell__iqamah">Jumuʿah <strong>' + esc(sched.jumuah[0].time) + '</strong></div>';
    }
    var rule = ((cfg.prayer || {}).iqamah || {})[key];
    if (rule && rule.type === 'joined') {
      return '<div class="prayer-cell__iqamah">with Maghrib</div>';
    }
    var t = sched.iqamah[key];
    if (!t) return '';
    return '<div class="prayer-cell__iqamah">Jamāʿah <strong>' + prayer.fmt(t) + '</strong></div>';
  }

  function renderStrip() {
    var host = $('[data-prayer-strip]');
    if (!host || !prayer) return;
    var sched = prayer.schedule(new Date());
    var next = prayer.nextPrayer(new Date());
    var html = prayer.META.map(function (m) {
      var isNext = next && !next.isTomorrow && next.key === m.key;
      return (
        '<div class="prayer-cell' + (isNext ? ' prayer-cell--next' : '') + '">' +
          '<div class="prayer-cell__name">' + m.name + '</div>' +
          '<div class="prayer-cell__arabic" lang="ar">' + m.arabic + '</div>' +
          '<div class="prayer-cell__time">' + prayer.fmt(sched.adhan[m.key]) + '</div>' +
          iqamahLabel(sched, m.key) +
        '</div>'
      );
    }).join('');
    host.innerHTML = html;
  }

  /* ---------- next-prayer hero card ---------- */

  function renderNextCard() {
    var host = $('[data-next-prayer-card]');
    if (!host || !prayer) return;

    var painted = { key: null, isTomorrow: null, day: null };

    function jamaahText(sched, key, iqamah) {
      if (key === 'dhuhr' && sched.isFriday && sched.jumuah.length) {
        return 'jumuʿah ' + esc(sched.jumuah[0].time);
      }
      return iqamah ? 'jamāʿah ' + prayer.fmt(iqamah) : '';
    }

    // full rebuild only when the next prayer or the calendar day changes;
    // the 1-second tick touches nothing but the countdown text node
    function paint() {
      var now = new Date();
      var next = prayer.nextPrayer(now);
      if (!next) return;
      var day = prayer.londonYMD(now);

      if (next.key !== painted.key || next.isTomorrow !== painted.isTomorrow || day !== painted.day) {
        painted = { key: next.key, isTomorrow: next.isTomorrow, day: day };
        var sched = prayer.schedule(now);
        var rows = '';
        prayer.FIVE.forEach(function (k) {
          var meta = prayer.META.filter(function (m) { return m.key === k; })[0];
          var rule = ((cfg.prayer || {}).iqamah || {})[k];
          var iqTxt = k === 'dhuhr' && sched.isFriday && sched.jumuah.length
            ? 'Jumuʿah ' + esc(sched.jumuah[0].time)
            : rule && rule.type === 'joined' ? 'with Maghrib'
            : (sched.iqamah[k] ? prayer.fmt(sched.iqamah[k]) : '—');
          rows += '<div class="next-prayer-card__row"><span>' + meta.name +
            '</span><strong>' + prayer.fmt(sched.adhan[k]) +
            ' <span aria-hidden="true">·</span> ' + iqTxt + '</strong></div>';
        });
        var jam = jamaahText(sched, next.key, next.iqamah);
        host.innerHTML =
          '<div class="next-prayer-card__label"><span>Next prayer' +
            (next.isTomorrow ? ' — tomorrow' : '') + '</span>' +
            '<span class="date">' + esc(prayer.hijriString(now)) + '</span></div>' +
          '<div class="next-prayer-card__name">' + next.name +
            ' <span class="arabic" lang="ar">' + next.arabic + '</span></div>' +
          '<div class="next-prayer-card__time">' + prayer.fmt(next.time) + '</div>' +
          '<div class="next-prayer-card__countdown">begins in <strong data-countdown></strong>' +
            (jam ? ' · ' + jam : '') + '</div>' +
          '<hr>' + rows;
      }

      var cd = host.querySelector('[data-countdown]');
      if (cd) cd.textContent = prayer.until(next.time, now).text;
    }
    paint();
    setInterval(paint, 1000);
  }

  /* ---------- announcements ---------- */

  function activeAnnouncements() {
    var list = (window.CIC || {}).announcements || [];
    var today = prayer ? prayer.londonYMD(new Date()) : new Date().toISOString().slice(0, 10);
    return list
      .filter(function (a) { return !a.expires || a.expires >= today; })
      .sort(function (a, b) {
        if (!!b.pinned - !!a.pinned) return (!!b.pinned - !!a.pinned);
        return (b.date || '').localeCompare(a.date || '');
      });
  }

  function fmtNiceDate(ymd) {
    if (!ymd) return '';
    var p = ymd.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2], 12);
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  function renderAnnouncements() {
    $all('[data-announcements]').forEach(function (host) {
      var limit = parseInt(host.getAttribute('data-announcements'), 10) || 99;
      var items = activeAnnouncements().slice(0, limit);
      if (!items.length) {
        host.innerHTML = '<div class="empty-state">No announcements at the moment — check back soon, in shāʾ Allāh.</div>';
        return;
      }
      host.innerHTML = items.map(function (a) {
        return (
          '<article class="announcement' + (a.pinned ? ' announcement--pinned' : '') + '">' +
            '<div class="announcement__icon">' + icon(a.icon) + '</div>' +
            '<div>' +
              '<h3>' + esc(a.title) + '</h3>' +
              '<p>' + esc(a.body) + '</p>' +
              '<time datetime="' + esc(a.date) + '">' + fmtNiceDate(a.date) + '</time>' +
            '</div>' +
          '</article>'
        );
      }).join('');
    });
  }

  /* ---------- events ---------- */

  function upcomingEvents() {
    var list = (window.CIC || {}).events || [];
    var today = prayer ? prayer.londonYMD(new Date()) : new Date().toISOString().slice(0, 10);
    return list
      .filter(function (e) { return e.date && e.date >= today; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function renderEvents() {
    $all('[data-events]').forEach(function (host) {
      var limit = parseInt(host.getAttribute('data-events'), 10) || 99;
      var items = upcomingEvents().slice(0, limit);
      if (!items.length) {
        host.innerHTML = '<div class="empty-state">No upcoming events are scheduled right now. Follow our <a href="' + esc(cfg.facebook || '#') + '">Facebook page</a> or check back soon.</div>';
        return;
      }
      host.innerHTML = items.map(function (e) {
        var p = e.date.split('-').map(Number);
        var when = e.time ? e.time + (e.endTime ? ' – ' + e.endTime : '') : 'All day';
        return (
          '<article class="event-row">' +
            '<div class="date-chip" aria-hidden="true">' +
              '<span class="date-chip__month">' + MONTHS_SHORT[p[1] - 1] + '</span>' +
              '<span class="date-chip__day">' + p[2] + '</span>' +
            '</div>' +
            '<div>' +
              '<h3>' + esc(e.title) + '</h3>' +
              '<div class="event-meta">' +
                '<span>' + icon('clock') + ' ' + esc(when) + '</span>' +
                (e.location ? '<span>' + icon('pin') + ' ' + esc(e.location) + '</span>' : '') +
              '</div>' +
              (e.description ? '<p class="event-row__desc">' + esc(e.description) + '</p>' : '') +
            '</div>' +
          '</article>'
        );
      }).join('');
    });
  }

  function renderRegularActivities() {
    $all('[data-regular-activities]').forEach(function (host) {
      var list = (window.CIC || {}).regularActivities || [];
      if (!list.length) { host.innerHTML = ''; return; }
      host.innerHTML = list.map(function (r) {
        return (
          '<article class="event-row">' +
            '<div class="date-chip" aria-hidden="true">' +
              '<span class="date-chip__month">Every</span>' +
              '<span class="date-chip__day" style="font-size:0.95rem;padding-top:0.55rem;">' + esc((r.day || '').slice(0, 3)) + '</span>' +
            '</div>' +
            '<div>' +
              '<h3>' + esc(r.title) + '</h3>' +
              '<div class="event-meta"><span>' + icon('clock') + ' ' + esc(r.day + (r.time ? ' · ' + r.time : '')) + '</span></div>' +
              (r.note ? '<p class="event-row__desc">' + esc(r.note) + '</p>' : '') +
            '</div>' +
          '</article>'
        );
      }).join('');
    });
  }

  /* ---------- jumuʿah rows ---------- */

  function renderJumuah() {
    $all('[data-jumuah]').forEach(function (host) {
      var items = ((cfg.prayer || {}).jumuah) || [];
      host.innerHTML = items.map(function (j) {
        return '<div class="def-row"><dt>' + esc(j.label || 'Jumuʿah') + '</dt><dd>' + esc(j.time) + '</dd></div>';
      }).join('');
    });
  }

  /* ---------- contact fills ---------- */

  $all('[data-config]').forEach(function (el) {
    var path = el.getAttribute('data-config').split('.');
    var v = cfg;
    for (var i = 0; i < path.length && v != null; i++) v = v[path[i]];
    if (v != null) el.textContent = String(v);
  });

  /* ---------- init ---------- */

  renderStrip();
  if (prayer && $('[data-prayer-strip]')) setInterval(renderStrip, 30000);
  renderNextCard();
  renderAnnouncements();
  renderEvents();
  renderRegularActivities();
  renderJumuah();
})();
