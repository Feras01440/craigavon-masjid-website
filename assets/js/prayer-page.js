/* ============================================================================
   Craigavon Masjid — prayer-times page: monthly timetable, month navigation,
   qibla, calculation-method note. Requires prayer-times.js.
   ============================================================================ */
(function () {
  'use strict';

  var prayer = (window.CIC || {}).prayer;
  var cfg = (window.CIC || {}).config || {};
  if (!prayer) return;

  /* ---------- monthly timetable ---------- */

  var table = document.querySelector('[data-timetable]');
  var label = document.querySelector('[data-timetable-month]');
  var prevBtn = document.querySelector('[data-timetable-prev]');
  var nextBtn = document.querySelector('[data-timetable-next]');
  var printBtn = document.querySelector('[data-timetable-print]');

  var now = new Date();
  var view = { year: now.getFullYear(), month: now.getMonth() };

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  function renderTable() {
    if (!table) return;
    var rows = prayer.monthRows(view.year, view.month);
    if (label) label.textContent = MONTHS[view.month] + ' ' + view.year;

    var caption = '<caption class="visually-hidden">Monthly prayer timetable for Craigavon Masjid — ' +
      MONTHS[view.month] + ' ' + view.year + '</caption>';

    var thead =
      '<thead><tr>' +
      '<th scope="col">Date</th><th scope="col">Hijri</th>' +
      '<th scope="col">Fajr</th><th scope="col">Sunrise</th><th scope="col">Dhuhr</th>' +
      '<th scope="col">ʿAsr</th><th scope="col">Maghrib</th><th scope="col">ʿIshāʾ</th>' +
      '</tr></thead>';

    var body = rows.map(function (r) {
      var cls = [];
      if (r.isToday) cls.push('is-today');
      if (r.isFriday) cls.push('is-friday');
      return '<tr' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') +
        (r.isToday ? ' aria-current="date"' : '') + '>' +
        '<td>' + r.weekday + ' ' + r.day +
        (r.isToday ? ' <span class="visually-hidden">(today)</span>' : '') + '</td>' +
        '<td>' + r.hijri + '</td>' +
        '<td>' + r.fajr + '</td><td>' + r.sunrise + '</td><td>' + r.dhuhr + '</td>' +
        '<td>' + r.asr + '</td><td>' + r.maghrib + '</td><td>' + r.isha + '</td>' +
        '</tr>';
    }).join('');

    table.innerHTML = caption + thead + '<tbody>' + body + '</tbody>';
  }

  function shiftMonth(delta) {
    view.month += delta;
    if (view.month < 0) { view.month = 11; view.year--; }
    if (view.month > 11) { view.month = 0; view.year++; }
    renderTable();
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { shiftMonth(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { shiftMonth(1); });
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  renderTable();

  /* ---------- qibla ---------- */

  var qiblaEl = document.querySelector('[data-qibla]');
  if (qiblaEl) qiblaEl.textContent = Math.round(prayer.qibla()) + '°';

  /* ---------- method note ---------- */

  var methodEl = document.querySelector('[data-method-name]');
  if (methodEl) {
    var names = {
      moonsightingcommittee: 'Moonsighting Committee Worldwide',
      muslimworldleague: 'Muslim World League (18° / 17°)',
      northamerica: 'Islamic Society of North America (15° / 15°)',
    };
    methodEl.textContent = names[(cfg.prayer.method || '').toLowerCase()] || cfg.prayer.method;
  }
  var madhabEl = document.querySelector('[data-madhab-name]');
  if (madhabEl) {
    madhabEl.textContent = (cfg.prayer.madhab || '').toLowerCase() === 'hanafi'
      ? 'Ḥanafī (later ʿAsr)' : 'standard (Shāfiʿī / Mālikī / Ḥanbalī)';
  }
})();
