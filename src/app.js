/* مقود: app shell (screens, state, quiz engine, spaced repetition, mock exams, gamification)
 * Plain browser JS, one classic script, no modules, no network.
 * Soft dependencies (all optional, every call guarded): window.DATA, window.Signs, window.Scenes, window.Yard.
 * Architecture, state schema, item keys, readiness formula and curriculum filters: docs/app.md
 */
(function () {
  'use strict';
  var W = window, D = document;
  if (W.__miqwadApp) return;
  W.__miqwadApp = true;

  var VERSION = '1.0';
  var SCHEMA = 1;
  var STORE_KEY = 'miqwad.v1';
  var DAY_MS = 86400000;
  var INTERVALS = [0, 1, 3, 7, 16];               // Leitner box 1..5 -> days until due
  var STRENGTH = [0, 0.25, 0.55, 0.8, 0.92, 1];   // memory estimate by box (index 0 = never seen)
  var LEVEL_NAMES = ['', 'أساسي', 'سهل', 'متوسط', 'صعب', 'متقدم'];

  // ------------------------------------------------------------------ utils
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;';
    });
  }
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function arr(v) { return Array.isArray(v) ? v : (v == null || v === '') ? [] : [v]; }
  function uniq(a) {
    var seen = Object.create(null), out = [];
    for (var i = 0; i < a.length; i++) { if (!seen[a[i]]) { seen[a[i]] = 1; out.push(a[i]); } }
    return out;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function mean(a) { return a.length ? sum(a) / a.length : 0; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dayNo(d) { d = d || new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY_MS); }
  function keyToDate(k) { var p = String(k).split('-'); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  var TODAY = dayNo();
  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var WEEKDAYS_S = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  function fmtDate(d) {
    if (typeof d === 'string') d = keyToDate(d); else if (typeof d === 'number') d = new Date(d);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtKm(v) { v = Math.round((+v || 0) * 10) / 10; return v % 1 === 0 ? String(v) : v.toFixed(1); }
  function fmtClock(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + pad2(sec % 60); }
  function pct(v) { return Math.round((v || 0) * 100); }
  // numbers with % or a sign must be isolated left-to-right inside Arabic text
  function pctTxt(v) { return '<bdi dir="ltr" class="num">' + pct(v) + '%</bdi>'; }
  function ltrTxt(t) { return '<bdi dir="ltr" class="num">' + t + '</bdi>'; }
  function plusKm(v) { return ltrTxt('+' + fmtKm(v)); }
  // Arabic counted noun: 1 يوم, يومين, 3 أيام, 11 يوم
  function nf(n, one, two, few) {
    if (n === 2 && two) return two;
    var m = n % 100;
    return n + ' ' + (m >= 3 && m <= 10 ? few : one);
  }
  function normAr(s) {
    return String(s || '').toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
      .replace(/\u0629/g, '\u0647').replace(/\u0649/g, '\u064A')
      .replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064A').replace(/\u0621/g, '')
      .replace(/[^\u0600-\u06FFa-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }
  function warn() { try { if (W.console) console.warn.apply(console, ['[miqwad]'].concat([].slice.call(arguments))); } catch (e) { /* ignore */ } }
  function nowMs() { return Date.now(); }

  // ------------------------------------------------------------------ storage
  var storageOK = true, memCopy = null;
  function lsGet() {
    try { var v = W.localStorage.getItem(STORE_KEY); return v == null ? memCopy : v; } catch (e) { storageOK = false; return memCopy; }
  }
  function lsSet(v) {
    memCopy = v;
    try { W.localStorage.setItem(STORE_KEY, v); storageOK = true; return true; } catch (e) { storageOK = false; return false; }
  }
  function lsDel() { memCopy = null; try { W.localStorage.removeItem(STORE_KEY); } catch (e) { storageOK = false; } }

  function freshState() {
    return {
      v: SCHEMA, created: nowMs(), onboarded: false,
      profile: { emirate: 'both', examDate: '', goal: 20, sound: true, motion: 'auto', text: 1 },
      items: {},       // item key -> {b: box 1..5, d: due day no, n: answers, k: correct, x: wrong, l: last day no}
      lessons: {},     // lesson id -> {s: stars 0..3, best: 0..1, n: plays, d: day no, p: passed}
      units: {},       // unit id -> day key when completed
      learned: {},     // lesson id -> 1 once the learn phase was seen
      days: {},        // 'YYYY-MM-DD' -> {n: answers, k: correct, km, a: 1 if a lesson/exam/yard run finished}
      km: 0,
      tc: {},          // topic -> correct answers (badge counters)
      exams: [],       // mock exam records, newest first
      activeExam: null,
      yard: {},        // exercise id -> {best, pass, tries, learn, d, last}
      road: [],        // examiner rounds, newest first
      badges: {},      // badge id -> day key
      bestCombo: 0,
      last: null       // {lesson: id, at: ms} lesson in progress
    };
  }
  // Migration hook: MIGRATIONS[n] upgrades a state of schema n to n + 1.
  var MIGRATIONS = {};
  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function migrate(s) {
    if (!isObj(s)) return freshState();
    var v = Math.floor(+s.v) || 1;
    while (v < SCHEMA) { if (MIGRATIONS[v]) { try { s = MIGRATIONS[v](s) || s; } catch (e) { warn('migration failed', v, e); } } v++; }
    s.v = SCHEMA;
    var d = freshState();
    Object.keys(d).forEach(function (k) {
      if (!(k in s) || s[k] === undefined) { s[k] = d[k]; return; }
      if (Array.isArray(d[k]) && !Array.isArray(s[k])) s[k] = d[k];
      else if (isObj(d[k]) && !isObj(s[k])) s[k] = d[k];
    });
    Object.keys(d.profile).forEach(function (k) { if (!(k in s.profile)) s.profile[k] = d.profile[k]; });
    s.km = num(s.km, 0);
    return s;
  }
  function loadState() {
    var raw = lsGet();
    if (!raw) return freshState();
    try { return migrate(JSON.parse(raw)); } catch (e) { warn('bad saved state, starting fresh', e); return freshState(); }
  }
  var S = loadState();
  var saveTimer = 0;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 450); }
  function flush() {
    clearTimeout(saveTimer); saveTimer = 0;
    try { lsSet(JSON.stringify(S)); } catch (e) { warn('save failed', e); }
  }

  // ------------------------------------------------------------------ content index
  var DATA = W.DATA || {};
  var TOPICS = {
    'signs-basics': 'أساسيات الإشارات', lights: 'إشارات المرور الضوئية', markings: 'خطوط الطريق', police: 'إشارات الشرطي',
    speed: 'السرعة', distance: 'مسافة الأمان', lanes: 'المسارات', overtaking: 'التجاوز', priority: 'الأولوية',
    roundabouts: 'الدوارات', turning: 'الانعطاف', highway: 'الطرق السريعة', pedestrians: 'المشاة',
    'school-bus': 'باص المدرسة', 'emergency-vehicles': 'سيارات الطوارئ', vulnerable: 'الدراجات والفئات الضعيفة',
    parking: 'الوقوف والركن', 'lights-horn': 'أضواء السيارة والزامور', weather: 'الطقس', night: 'القيادة بالليل',
    hazard: 'إدراك المخاطر', emergency: 'حالات الطوارئ', accidents: 'الحوادث', vehicle: 'السيارة وفحصها',
    law: 'القانون', penalties: 'المخالفات والنقاط', driver: 'السائق وحالته', roadtest: 'اختبار الطريق',
    yard: 'اختبار الساحة', 'dubai-specific': 'خاص بدبي', 'sharjah-specific': 'خاص بالشارقة',
    signs: 'الإشارات المرورية', mk: 'العلامات والأضواء'
  };
  function topicName(t) { return TOPICS[t] || t || 'عام'; }

  var IX = {
    q: {}, cards: {}, signs: {}, marks: {}, sc: {}, figs: {},
    qList: [], cardList: [], signList: [], markList: [], scList: [],
    signCats: [], markCats: [], catName: {}, mkCatName: {}
  };
  function catsFrom(decl, items) {
    var out = [], seen = {};
    arr(decl).forEach(function (c) {
      if (c && c.key && !seen[c.key]) { seen[c.key] = 1; out.push({ key: c.key, name: c.name || c.key, desc: c.desc || '' }); }
    });
    items.forEach(function (it) { if (it.cat && !seen[it.cat]) { seen[it.cat] = 1; out.push({ key: it.cat, name: it.cat, desc: '' }); } });
    return out.filter(function (c) { return items.some(function (it) { return it.cat === c.key; }); });
  }
  function buildIndex() {
    var banks = isObj(DATA.banks) ? DATA.banks : {};
    Object.keys(banks).forEach(function (bn) {
      var b = banks[bn] || {};
      arr(b.cards).forEach(function (c) {
        if (!c || !c.id || IX.cards[c.id]) return;
        c._bank = bn; IX.cards[c.id] = c; IX.cardList.push(c);
      });
      arr(b.questions).forEach(function (q) {
        if (!q || !q.id || IX.q[q.id]) return;
        if (!Array.isArray(q.options) || q.options.length < 2) return;
        var a = Math.floor(+q.answer);
        if (!(a >= 0 && a < q.options.length)) { warn('question has no valid answer', q.id); return; }
        q.answer = a; q._bank = bn; IX.q[q.id] = q; IX.qList.push(q);
      });
    });
    var sg = isObj(DATA.signs) ? DATA.signs : {};
    arr(sg.signs).forEach(function (s) {
      if (!s || !s.id || !s.name || IX.signs[s.id]) return;
      IX.signs[s.id] = s; IX.signList.push(s);
    });
    IX.signCats = catsFrom(sg.categories, IX.signList);
    IX.signCats.forEach(function (c) { IX.catName[c.key] = c.name; });
    var mk = isObj(DATA.markings) ? DATA.markings : {};
    arr(mk.items).forEach(function (m) {
      if (!m || !m.id || !m.name || IX.marks[m.id]) return;
      IX.marks[m.id] = m; IX.markList.push(m);
    });
    IX.markCats = catsFrom(mk.categories, IX.markList);
    IX.markCats.forEach(function (c) { IX.mkCatName[c.key] = c.name; });
    // concept figures (content/figs.json): pictures for questions and cards that are not catalogue signs
    var fg = isObj(DATA.figs) ? DATA.figs : {};
    arr(fg.figs).forEach(function (f) { if (f && f.id && !IX.figs[f.id]) IX.figs[f.id] = f; });
    arr(DATA.scenarios).forEach(function (s) {
      if (!s || !s.id || IX.sc[s.id]) return;
      var type = s.type === 'tap' ? 'tap' : 'choice';
      if (type === 'choice' && (!Array.isArray(s.options) || s.options.length < 2)) return;
      s.type = type; IX.sc[s.id] = s; IX.scList.push(s);
    });
  }

  // ------------------------------------------------------------------ module guards
  function drawn(id) {
    try { return !!(W.Signs && typeof W.Signs.has === 'function' && W.Signs.has(id)); } catch (e) { return false; }
  }
  var svgCache = Object.create(null);
  function fallbackSign() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="sign-svg" role="img" aria-label="إشارة قيد الرسم">' +
      '<rect x="4" y="4" width="92" height="92" rx="14" fill="#1A2332" stroke="#3A4A63" stroke-width="2" stroke-dasharray="5 4"/>' +
      '<text x="50" y="54" font-size="30" text-anchor="middle" dominant-baseline="central" fill="#97A1B4" font-family="Alexandria,sans-serif">؟</text></svg>';
  }
  function pendingSignSVG(o) {
    var sh = String((o && o.shape) || '').toLowerCase(), cat = String((o && o.cat) || '');
    var st = ' fill="#161E2B" stroke="#3A4A63" stroke-width="3" stroke-dasharray="7 6" stroke-linejoin="round"';
    var body;
    if (/tri/.test(sh) && /(down|invert)/.test(sh)) body = '<polygon points="8,12 92,12 50,88"' + st + '/>';
    else if (/tri/.test(sh) || (!sh && /warning|temporary/.test(cat))) body = '<polygon points="50,10 93,86 7,86"' + st + '/>';
    else if (/oct/.test(sh)) body = '<polygon points="31,6 69,6 94,31 94,69 69,94 31,94 6,69 6,31"' + st + '/>';
    else if (/diamond/.test(sh)) body = '<polygon points="50,5 95,50 50,95 5,50"' + st + '/>';
    else if (/circ|round|disc/.test(sh) || (!sh && /prohib|mandat/.test(cat))) body = '<circle cx="50" cy="50" r="44"' + st + '/>';
    else body = '<rect x="7" y="14" width="86" height="72" rx="10"' + st + '/>';
    var ty = /tri/.test(sh) && !/(down|invert)/.test(sh) ? 62 : /(down|invert)/.test(sh) ? 40 : 52;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="sign-svg sign-pending" role="img" aria-label="' + esc((o && o.name) || 'إشارة') + '، الرسمة قيد التجهيز">' +
      body + '<text x="50" y="' + ty + '" font-size="26" text-anchor="middle" dominant-baseline="central" fill="#6E7A90" font-family="Alexandria,sans-serif">؟</text></svg>';
  }
  function signSVG(id) {
    if (svgCache[id]) return svgCache[id];
    if (!drawn(id)) { var po = IX.signs[id] || IX.marks[id]; if (po) return (svgCache[id] = pendingSignSVG(po)); }
    var s = '';
    try { if (W.Signs && typeof W.Signs.render === 'function') s = W.Signs.render(id) || ''; } catch (e) { warn('sign render failed', id, e); s = ''; }
    if (typeof s !== 'string' || s.indexOf('<svg') < 0) s = fallbackSign();
    svgCache[id] = s;
    return s;
  }
  // ------------------------------------------------------------------ pictures on questions and cards
  // fig (under the question), opt_figs (inside the options), explain_fig (with the explanation), card fig.
  // Ids are signs, markings or concept figures; only drawn pictures show (never a placeholder in a question).
  function figName(id) { var o = IX.signs[id] || IX.marks[id] || IX.figs[id]; return o ? String(o.name || '') : ''; }
  function figOK(id) { return typeof id === 'string' && !!(IX.signs[id] || IX.marks[id] || IX.figs[id]) && drawn(id); }
  function figList(v, max) {
    var out = [];
    arr(v).forEach(function (id) { if (figOK(id) && out.indexOf(id) < 0) out.push(id); });
    return out.slice(0, max || 3);
  }
  function figWide(id) {
    var m = /viewBox="([^"]+)"/.exec(signSVG(id)), vb = m ? m[1].split(/[\s,]+/).map(Number) : null;
    return !!(vb && vb[2] > 0 && vb[3] > 0 && vb[2] / vb[3] > 1.2);
  }
  // one big picture (square frame for signs, 4:3 frame for diagrams), optional caption
  function figHero(id, cls, caption) {
    var box = '<div class="' + cls + (figWide(id) ? ' is-wide' : '') + '">' + signSVG(id) + '</div>';
    return caption ? '<figure class="fig-hero">' + box + '<figcaption>' + esc(figName(id)) + '</figcaption></figure>' : box;
  }
  // a row of 2 to 4 pictures, captions under each when asked
  function figRow(ids, cls, captions) {
    return '<div class="' + cls + ' n' + ids.length + '">' + ids.map(function (id) {
      return '<figure class="figc' + (figWide(id) ? ' is-wide' : '') + '"><span class="figc-img">' + signSVG(id) + '</span>' +
        (captions ? '<figcaption>' + esc(figName(id)) + '</figcaption>' : '') + '</figure>';
    }).join('') + '</div>';
  }
  function scenesOK() { try { return !!(W.Scenes && typeof W.Scenes.mount === 'function'); } catch (e) { return false; } }
  function yardOK() { try { return !!(W.Yard && typeof W.Yard.mount === 'function'); } catch (e) { return false; } }

  // ------------------------------------------------------------------ emirate + filters
  function emSet() {
    var e = S.profile.emirate;
    return e === 'dubai' ? ['dubai'] : e === 'sharjah' ? ['sharjah'] : ['dubai', 'sharjah'];
  }
  function forEm(item, ems) {
    var ex = arr(item && item.exam);
    if (!ex.length) return true;
    ems = ems || emSet();
    return ex.some(function (e) { return e === 'both' || e === 'all' || ems.indexOf(e) >= 0; });
  }
  function lvlOK(it, f) {
    var L = num(it.level, 1);
    if (f.level != null && f.level !== '') { if (arr(f.level).map(Number).indexOf(L) < 0) return false; }
    if (num(f.levelMax, 0) > 0 && L > +f.levelMax) return false;
    if (num(f.levelMin, 0) > 0 && L < +f.levelMin) return false;
    return true;
  }
  var FC = Object.create(null);
  function cached(tag, f, fn) {
    var k = tag + '|' + S.profile.emirate + '|' + JSON.stringify(f || {});
    if (!FC[k]) FC[k] = fn(f || {});
    return FC[k];
  }
  // Each selector returns ids. A filter with no ids and no banks/topics/cats selects nothing.
  function selCards(f) {
    return cached('c', f, function (f) {
      var ids = arr(f.ids).filter(function (id) { return IX.cards[id]; });
      var banks = arr(f.banks), topics = arr(f.topics);
      if (banks.length || topics.length) {
        IX.cardList.forEach(function (c) {
          if ((!banks.length || banks.indexOf(c._bank) >= 0) && (!topics.length || topics.indexOf(c.topic) >= 0) && lvlOK(c, f)) ids.push(c.id);
        });
      }
      return uniq(ids);
    });
  }
  function selQ(f) {
    return cached('q', f, function (f) {
      var ids = arr(f.ids).filter(function (id) { return IX.q[id]; });
      var banks = arr(f.banks), topics = arr(f.topics);
      if (banks.length || topics.length) {
        IX.qList.forEach(function (q) {
          if ((!banks.length || banks.indexOf(q._bank) >= 0) && (!topics.length || topics.indexOf(q.topic) >= 0) && lvlOK(q, f) && forEm(q)) ids.push(q.id);
        });
      }
      return uniq(ids);
    });
  }
  function selSigns(f) {
    return cached('s', f, function (f) {
      var ids = arr(f.ids).filter(function (id) { return IX.signs[id]; });
      var cats = arr(f.cats);
      if (cats.length) IX.signList.forEach(function (s) { if (cats.indexOf(s.cat) >= 0 && lvlOK(s, f)) ids.push(s.id); });
      return uniq(ids);
    });
  }
  function selMarks(f) {
    return cached('m', f, function (f) {
      var ids = arr(f.ids).filter(function (id) { return IX.marks[id]; });
      var cats = arr(f.cats);
      if (cats.length) IX.markList.forEach(function (m) { if (cats.indexOf(m.cat) >= 0 && lvlOK(m, f)) ids.push(m.id); });
      return uniq(ids);
    });
  }
  function selSc(f) {
    return cached('x', f, function (f) {
      var ids = arr(f.ids).filter(function (id) { return IX.sc[id]; });
      var topics = arr(f.topics), types = arr(f.types);
      if (topics.length) {
        IX.scList.forEach(function (s) {
          if (topics.indexOf(s.topic) >= 0 && lvlOK(s, f) && forEm(s) && (!types.length || types.indexOf(s.type) >= 0)) ids.push(s.id);
        });
      }
      return uniq(ids);
    });
  }

  // ------------------------------------------------------------------ item keys
  function parseKey(k) { var i = String(k).indexOf(':'); return { kind: k.slice(0, i), id: k.slice(i + 1) }; }
  function objOf(k) {
    var p = parseKey(k);
    return p.kind === 'q' ? IX.q[p.id] : p.kind === 'sign' ? IX.signs[p.id] : p.kind === 'mk' ? IX.marks[p.id] : p.kind === 'sc' ? IX.sc[p.id] : null;
  }
  function topicOf(k) {
    var p = parseKey(k), o = objOf(k);
    if (!o) return '';
    if (p.kind === 'sign') return 'signs';
    if (p.kind === 'mk') return 'mk';
    return o.topic || '';
  }
  function levelOf(k) { var o = objOf(k); return clamp(Math.round(num(o && o.level, 1)), 1, 5); }
  function quizzable(k) {
    var p = parseKey(k), o = objOf(k);
    if (!o) return false;
    if (p.kind === 'sign' || p.kind === 'mk') return drawn(p.id);
    if (p.kind === 'sc') return o.type === 'choice' || scenesOK();
    return true;
  }
  function kindName(k) {
    var p = parseKey(k);
    return p.kind === 'sign' ? 'إشارة' : p.kind === 'mk' ? 'علامة' : p.kind === 'sc' ? 'موقف' : 'سؤال';
  }
  function keyLabel(k) {
    var p = parseKey(k), o = objOf(k);
    if (!o) return k;
    if (p.kind === 'sign' || p.kind === 'mk') return o.name;
    return o.q || o.title || p.id;
  }

  // ------------------------------------------------------------------ curriculum
  var CUR = { units: [], lessons: [], byId: {}, unitOf: {} };
  var TOPIC_ORDER = ['signs-basics', 'lights', 'markings', 'police', 'priority', 'roundabouts', 'turning', 'lanes', 'overtaking', 'speed',
    'distance', 'highway', 'pedestrians', 'school-bus', 'emergency-vehicles', 'vulnerable', 'parking', 'lights-horn', 'weather', 'night',
    'hazard', 'emergency', 'accidents', 'vehicle', 'driver', 'law', 'penalties', 'yard', 'roadtest', 'dubai-specific', 'sharjah-specific'];
  // Used only when content/curriculum.json is missing: a sensible path built from whatever content exists.
  function autoCurriculum() {
    var units = [], n = 0;
    function withChallenge(u) {
      var ids = u.lessons.map(function (l) { return l.id; });
      if (ids.length > 1) u.lessons.push({ id: u.id + '-boss', title: 'تحدي ' + u.title, kind: 'challenge', from: ids, count: 12, pass: 0.8 });
      return u;
    }
    var topics = uniq(IX.qList.map(function (q) { return q.topic; }).concat(IX.cardList.map(function (c) { return c.topic; }))).filter(Boolean);
    topics.sort(function (a, b) {
      var ia = TOPIC_ORDER.indexOf(a), ib = TOPIC_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    function topicLesson(t) {
      return { id: 'auto-q-' + t, title: topicName(t), kind: 'lesson', learn: { cards: { topics: [t] } },
        practice: { questions: { topics: [t] }, scenarios: { topics: [t] }, count: 10 } };
    }
    var basics = topics.filter(function (t) { return ['signs-basics', 'lights', 'markings', 'police'].indexOf(t) >= 0; });
    if (basics.length) units.push(withChallenge({ id: 'auto-basics', exit: ++n, title: 'لغة الطريق', subtitle: basics.map(topicName).join('، '), color: 'blue', lessons: basics.map(topicLesson) }));
    if (IX.signCats.length) {
      var ls = [];
      IX.signCats.forEach(function (c) {
        var ids = IX.signList.filter(function (x) { return x.cat === c.key; }).sort(function (a, b) { return num(a.level, 1) - num(b.level, 1); }).map(function (x) { return x.id; });
        var parts = Math.ceil(ids.length / 12) || 1;
        for (var i = 0; i < parts; i++) {
          var chunk = ids.slice(i * 12, (i + 1) * 12);
          if (!chunk.length) continue;
          ls.push({ id: 'auto-s-' + c.key + (parts > 1 ? '-' + (i + 1) : ''), title: c.name + (parts > 1 ? ' ' + (i + 1) : ''), kind: 'lesson',
            learn: { signs: { ids: chunk } }, practice: { signs: { ids: chunk }, count: 10 } });
        }
      });
      units.push(withChallenge({ id: 'auto-signs', exit: ++n, title: 'الإشارات', subtitle: 'كل فئات الإشارات من الأسهل للأصعب', color: 'green', lessons: ls }));
    }
    if (IX.markCats.length) {
      units.push(withChallenge({ id: 'auto-marks', exit: ++n, title: 'العلامات والأضواء', subtitle: 'خطوط الطريق والإشارات الضوئية وإشارات الشرطي', color: 'blue',
        lessons: IX.markCats.map(function (c) {
          return { id: 'auto-m-' + c.key, title: c.name, kind: 'lesson', learn: { markings: { cats: [c.key] } }, practice: { markings: { cats: [c.key] }, count: 8 } };
        }) }));
    }
    var rest = topics.filter(function (t) { return basics.indexOf(t) < 0; });
    for (var i = 0; i < rest.length; i += 4) {
      var chunk = rest.slice(i, i + 4);
      units.push(withChallenge({ id: 'auto-t' + i, exit: ++n, title: topicName(chunk[0]), subtitle: chunk.slice(1).map(topicName).join('، '),
        color: n % 3 === 0 ? 'brown' : 'blue', lessons: chunk.map(topicLesson) }));
    }
    return { units: units, auto: true };
  }
  function buildCurriculum() {
    var c = isObj(DATA.curriculum) && Array.isArray(DATA.curriculum.units) && DATA.curriculum.units.length ? DATA.curriculum : autoCurriculum();
    CUR.auto = !!c.auto;
    c.units.forEach(function (u, ui) {
      if (!u || !u.id) return;
      var unit = { id: u.id, exit: u.exit != null ? u.exit : ui + 1, title: u.title || ('الوحدة ' + (ui + 1)), subtitle: u.subtitle || '',
        color: u.color || 'blue', lessons: [], raw: u };
      arr(u.lessons).forEach(function (l) {
        if (!l || !l.id || CUR.byId[l.id]) return;
        var kind = l.kind === 'yard' || l.kind === 'challenge' ? l.kind : 'lesson';
        var les = { id: l.id, title: l.title || 'درس', kind: kind, raw: l, unit: unit.id, idx: CUR.lessons.length };
        unit.lessons.push(les); CUR.lessons.push(les); CUR.byId[l.id] = les; CUR.unitOf[l.id] = unit;
      });
      if (unit.lessons.length) CUR.units.push(unit);
    });
  }
  var LP = Object.create(null); // lesson pools cache
  function lessonPool(les) {
    var ck = les.id + '|' + S.profile.emirate;
    if (LP[ck]) return LP[ck];
    var out = { cards: [], signs: [], marks: [], keys: [], count: 10 };
    if (les.kind === 'challenge') {
      var keys = [];
      arr(les.raw.from).forEach(function (id) { var l = CUR.byId[id]; if (l && l.kind !== 'challenge') keys = keys.concat(lessonPool(l).keys); });
      if (!keys.length) CUR.units.forEach(function (u) { if (u.id === les.unit) u.lessons.forEach(function (l) { if (l.kind === 'lesson') keys = keys.concat(lessonPool(l).keys); }); });
      out.keys = uniq(keys);
      out.count = Math.max(1, num(les.raw.count, 12));
    } else if (les.kind === 'lesson') {
      var L = les.raw.learn || {}, P = les.raw.practice || {};
      out.cards = selCards(L.cards);
      out.signs = selSigns(L.signs);
      out.marks = selMarks(L.markings);
      out.keys = uniq([].concat(
        selQ(P.questions).map(function (id) { return 'q:' + id; }),
        selSigns(P.signs).map(function (id) { return 'sign:' + id; }),
        selMarks(P.markings).map(function (id) { return 'mk:' + id; }),
        selSc(P.scenarios).map(function (id) { return 'sc:' + id; })
      ));
      out.count = Math.max(1, num(P.count, 10));
    }
    LP[ck] = out;
    return out;
  }
  function clearPools() { FC = Object.create(null); LP = Object.create(null); }

  // ------------------------------------------------------------------ spaced repetition (Leitner)
  function isDue(r) { return !!r && r.b >= 1 && r.d <= TODAY; }
  function boxOf(k) { var r = S.items[k]; return r ? r.b : 0; }
  function dueKeys() {
    return Object.keys(S.items).filter(function (k) { return isDue(S.items[k]) && objOf(k) && quizzable(k); })
      .sort(function (a, b) { var A = S.items[a], B = S.items[b]; return A.b - B.b || A.d - B.d; });
  }
  function mistakeKeys() {
    return Object.keys(S.items).filter(function (k) { return S.items[k].b === 1 && objOf(k); });
  }
  function grade(k, ok) {
    var r = S.items[k];
    if (!r) r = S.items[k] = { b: 0, d: TODAY, n: 0, k: 0, x: 0, l: TODAY };
    r.n++; r.l = TODAY;
    if (ok) {
      r.k++;
      if (r.b === 0 || r.d <= TODAY) { r.b = Math.min(5, Math.max(1, r.b) + 1); r.d = TODAY + INTERVALS[r.b - 1]; }
    } else { r.x++; r.b = 1; r.d = TODAY; }
    return r;
  }
  function markForReview(k) {
    var r = S.items[k] || (S.items[k] = { b: 1, d: TODAY, n: 0, k: 0, x: 0, l: TODAY });
    r.b = 1; r.d = TODAY; save();
  }

  // ------------------------------------------------------------------ distance, streak, titles, badges
  function dayRec(k) { k = k || dayKey(); return S.days[k] || (S.days[k] = { n: 0, k: 0, km: 0, a: 0 }); }
  function kmFor(level) { return 0.5 + 0.25 * (clamp(level, 1, 5) - 1); }
  function addKm(v) {
    if (!v) return;
    S.km = Math.round((S.km + v) * 100) / 100;
    var d = dayRec(); d.km = Math.round((d.km + v) * 100) / 100;
    hudKm(v);
  }
  function markActive() { dayRec().a = 1; }
  function logAnswer(k, ok) {
    var d = dayRec(); d.n++; if (ok) d.k++;
    var t = topicOf(k);
    if (ok && t) S.tc[t] = (S.tc[t] || 0) + 1;
    grade(k, ok);
    var km = ok ? kmFor(levelOf(k)) : 0;
    addKm(km);
    save();
    return km;
  }
  // "أيام متتالية" with Arabic number agreement
  function streakText(n) {
    if (!n) return 'ابدأ سلسلتك اليوم';
    if (n === 1) return 'يوم واحد لهلق';
    if (n === 2) return 'يومين متتاليين';
    var m = n % 100;
    return n + (m >= 3 && m <= 10 ? ' أيام متتالية' : ' يوم متتالي');
  }
  function activeDay(k) { var d = S.days[k]; return !!(d && (d.n >= 5 || d.a)); }
  function streakNow() {
    var n = 0, d = new Date();
    if (!activeDay(dayKey(d))) d.setDate(d.getDate() - 1);
    while (activeDay(dayKey(d)) && n < 3660) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function streakBest() {
    var keys = Object.keys(S.days).filter(activeDay).sort(), best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var dn = dayNo(keyToDate(k));
      run = prev != null && dn === prev + 1 ? run + 1 : 1;
      prev = dn; if (run > best) best = run;
    });
    return Math.max(best, streakNow());
  }
  var TITLES = [
    { km: 0, name: 'متدرب' }, { km: 25, name: 'ماسك الدركسيون' }, { km: 150, name: 'جاهز للساحة' },
    { km: 400, name: 'جاهز للطريق' }, { km: 800, name: 'سائق واثق' }
  ];
  function titleInfo() {
    var i = 0;
    for (var j = 0; j < TITLES.length; j++) if (S.km >= TITLES[j].km) i = j;
    var cur = TITLES[i], next = TITLES[i + 1] || null;
    var frac = next ? (S.km - cur.km) / (next.km - cur.km) : 1;
    return { i: i, cur: cur, next: next, frac: clamp(frac, 0, 1), left: next ? next.km - S.km : 0 };
  }
  function mastered(kind) {
    var n = 0, pre = kind + ':';
    Object.keys(S.items).forEach(function (k) { if (k.indexOf(pre) === 0 && S.items[k].b >= 3) n++; });
    return n;
  }
  function lessonsDone() { return Object.keys(S.lessons).filter(function (id) { return S.lessons[id].s >= 1; }).length; }
  var BADGES = [
    { id: 'first-lesson', name: 'أول درس', desc: 'خلصت أول درس', icon: 'flag', test: function () { return lessonsDone() >= 1; } },
    { id: 'first-exit', name: 'أول مخرج', desc: 'خلصت وحدة كاملة من المسار', icon: 'route', test: function () { return Object.keys(S.units).length >= 1; } },
    { id: 'roundabout-king', name: 'ملك الدوارات', desc: '30 جواب صح عن الدوارات', icon: 'roundabout', test: function () { return (S.tc.roundabouts || 0) >= 30; } },
    { id: 'priority-pro', name: 'فاهم الأولوية', desc: '30 جواب صح عن الأولوية', icon: 'diamond', test: function () { return (S.tc.priority || 0) >= 30; } },
    { id: 'ped-friend', name: 'صديق المشاة', desc: '20 جواب صح عن المشاة', icon: 'walk', test: function () { return (S.tc.pedestrians || 0) >= 20; } },
    { id: 'bus-guard', name: 'حارس الباص', desc: '10 أجوبة صح عن باص المدرسة', icon: 'bus', test: function () { return (S.tc['school-bus'] || 0) >= 10; } },
    { id: 'make-way', name: 'أفسح الطريق', desc: '15 جواب صح عن سيارات الطوارئ', icon: 'siren', test: function () { return (S.tc['emergency-vehicles'] || 0) >= 15; } },
    { id: 'sign-reader', name: 'قارئ الإشارات', desc: '50 إشارة محفوظة (صندوق 3 أو أعلى)', icon: 'sign', test: function () { return mastered('sign') >= 50; } },
    { id: 'sign-master', name: 'خبير الإشارات', desc: 'كل الإشارات المرسومة محفوظة', icon: 'trophy', test: function () {
      var ds = IX.signList.filter(function (s) { return drawn(s.id); });
      return ds.length >= 20 && ds.every(function (s) { return boxOf('sign:' + s.id) >= 3; });
    } },
    { id: 'streak-3', name: '3 أيام ورا بعض', desc: 'تدربت 3 أيام متتالية', icon: 'flame', test: function () { return streakNow() >= 3; } },
    { id: 'streak-7', name: 'أسبوع كامل', desc: 'تدربت 7 أيام متتالية', icon: 'flame', test: function () { return streakNow() >= 7; } },
    { id: 'streak-30', name: 'شهر بلا توقف', desc: 'تدربت 30 يوم متتالي', icon: 'flame', test: function () { return streakNow() >= 30; } },
    { id: 'combo-10', name: '10 ورا بعض', desc: '10 أجوبة صح متتالية', icon: 'bolt', test: function () { return S.bestCombo >= 10; } },
    { id: 'km-100', name: 'أول 100 كم', desc: 'قطعت 100 كم بالتدريب', icon: 'gauge', test: function () { return S.km >= 100; } },
    { id: 'mock-pass', name: 'نجحت بالتجريبي', desc: 'نجحت بامتحان تجريبي من 20 سؤال أو أكثر', icon: 'exam', test: function () { return S.exams.some(function (e) { return e.passed && e.n >= 20; }); } },
    { id: 'mock-perfect', name: 'علامة كاملة', desc: 'جبت 100% بامتحان تجريبي', icon: 'star', test: function () { return S.exams.some(function (e) { return e.correct === e.n && e.n >= 15; }); } },
    { id: 'yard-pass', name: 'بطل الساحة', desc: 'نجحت بتمرين ساحة بوضع الامتحان', icon: 'cone', test: function () { return Object.keys(S.yard).some(function (k) { return S.yard[k].pass; }); } },
    { id: 'road-pass', name: 'الفاحص مبسوط', desc: 'نجحت بجولة الفاحص', icon: 'wheel', test: function () { return S.road.some(function (r) { return r.passed; }); } }
  ];
  function checkBadges() {
    var got = [];
    BADGES.forEach(function (b) {
      if (S.badges[b.id]) return;
      var ok = false;
      try { ok = b.test(); } catch (e) { ok = false; }
      if (ok) { S.badges[b.id] = dayKey(); got.push(b); }
    });
    if (got.length) {
      save();
      got.forEach(function (b, i) {
        setTimeout(function () { Snd.play('badge'); toast(ic(b.icon) + '<span>وسام جديد: <b>' + esc(b.name) + '</b></span>', 'gold', 3200); }, 350 + i * 900);
      });
    }
  }

  // ------------------------------------------------------------------ sounds (WebAudio, only after a user gesture)
  var Snd = {
    ctx: null,
    on: function () { return !!S.profile.sound; },
    unlock: function () {
      if (!Snd.on()) return;
      try {
        if (!Snd.ctx) { var AC = W.AudioContext || W.webkitAudioContext; if (AC) Snd.ctx = new AC(); }
        if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume();
      } catch (e) { Snd.ctx = null; }
    },
    tone: function (f, t, dur, type, vol) {
      var c = Snd.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.03);
    },
    play: function (name) {
      if (!Snd.on() || !Snd.ctx || Snd.ctx.state !== 'running') return;
      try {
        var t = Snd.ctx.currentTime + 0.01, T = Snd.tone;
        if (name === 'ok') { T(660, t, 0.1, 'sine', 0.09); T(990, t + 0.075, 0.18, 'sine', 0.08); }
        else if (name === 'bad') { T(220, t, 0.16, 'triangle', 0.1); T(175, t + 0.11, 0.24, 'triangle', 0.09); }
        else if (name === 'tap') { T(1320, t, 0.035, 'sine', 0.025); }
        else if (name === 'flip') { T(520, t, 0.06, 'sine', 0.04); T(780, t + 0.04, 0.07, 'sine', 0.035); }
        else if (name === 'done') { [523, 659, 784, 1047].forEach(function (f, i) { T(f, t + i * 0.1, 0.26, 'sine', 0.08); }); }
        else if (name === 'badge') { [784, 988, 1175, 1568].forEach(function (f, i) { T(f, t + i * 0.07, 0.2, 'triangle', 0.05); }); }
        else if (name === 'fail') { [392, 330, 262].forEach(function (f, i) { T(f, t + i * 0.13, 0.26, 'triangle', 0.07); }); }
        else if (name === 'tick') { T(1760, t, 0.03, 'square', 0.012); }
      } catch (e) { /* audio is optional */ }
    }
  };

  // ------------------------------------------------------------------ icons (stroke line icons, 24x24)
  var ICONS = {
    today: '<path d="M3 18h18"/><path d="M6.5 18a5.5 5.5 0 0 1 11 0"/><path d="M12 5.5v2.2M5.3 9.1l1.6 1.4M18.7 9.1l-1.6 1.4"/><path d="M9 21.5h6"/>',
    route: '<circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="5.5" r="2"/><path d="M8 18.5h7.5a3.25 3.25 0 0 0 0-6.5h-7a3.25 3.25 0 0 1 0-6.5H16"/>',
    sign: '<path d="M12 3 3.8 16.6h16.4z"/><path d="M12 16.6V21.5"/><path d="M12 8.6v3.6"/>',
    junction: '<path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"/>',
    cone: '<path d="M9.6 3.8h4.8l3.9 15H5.7z"/><path d="M3.5 20.2h17"/><path d="M8.2 9.6h7.6M7 14.4h10"/>',
    exam: '<rect x="5" y="4.2" width="14" height="17" rx="2.2"/><path d="M9 4.2V3h6v1.2"/><path d="m8.8 13.2 2.2 2.2 4.2-4.4"/>',
    review: '<path d="M19.6 10.6A7.8 7.8 0 1 0 17.4 17"/><path d="M20.2 4.6v6h-6"/>',
    gear: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    back: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    next: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    flame: '<path d="M12 21.2c4.1 0 7-2.8 7-6.8 0-3.4-2.3-5.4-3.7-7.6-.5 2.1-1.6 3.1-3 3.5.4-3.4-1-6.2-3.6-7.6.2 3.7-4.1 5.8-4.1 11.7 0 4 3.1 6.8 7.4 6.8z"/>',
    gauge: '<path d="M4 17.5a8 8 0 1 1 16 0"/><path d="m12 17.5 4.2-5.2"/><path d="M6.6 13.4l1 .6M12 9.5v1.2M17.4 13.4l-1 .6"/>',
    star: '<path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.2 5.9-.8z"/>',
    check: '<path d="M5 12.6l4.4 4.4L19 7.4"/>',
    flag: '<path d="M5.5 21V3.8"/><path d="M5.5 4.2h11.8l-2.2 4.4 2.2 4.4H5.5"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/>',
    sound: '<path d="M4 9.4h3.4L12 5.8v12.4l-4.6-3.6H4z"/><path d="M15.4 9a4.2 4.2 0 0 1 0 6M17.9 6.4a7.8 7.8 0 0 1 0 11.2"/>',
    copy: '<rect x="8.2" y="8.2" width="11.8" height="11.8" rx="2"/><path d="M15.8 8.2V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9.8a1 1 0 0 0 1 1h3.2"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.4"/><path d="m15.6 15.6 4.8 4.8"/>',
    car: '<rect x="6.8" y="2.8" width="10.4" height="18.4" rx="3.6"/><path d="M8.4 8.2h7.2M8.4 16.4h7.2"/><path d="M9 5.8l.5-1.4h5l.5 1.4"/>',
    wheel: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12.6" r="2.3"/><path d="M3.6 11.2h6.2M14.2 11.2h6.2M12 14.9v5.7"/>',
    bolt: '<path d="M13.2 2.8 5 13.6h6.2L10.4 21.2l8.4-10.8h-6.2z"/>',
    trophy: '<path d="M7.5 4h9v4.5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6H4.5a3 3 0 0 0 3 3.6M16.5 6h3a3 3 0 0 1-3 3.6"/><path d="M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.6M12 7.6v.2"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.4"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4"/>',
    cards: '<rect x="3.5" y="6.4" width="12.6" height="14.2" rx="2"/><path d="M7.8 3.4h10.7a2 2 0 0 1 2 2v12"/>',
    play: '<path d="M8 5.4v13.2l10.2-6.6z"/>',
    upload: '<path d="M12 19.5V8.5M7.6 12.9 12 8.5l4.4 4.4M5 4.5h14"/>',
    trash: '<path d="M5 7h14M10 7V4.4h4V7M7 7l1 13.2h8L17 7"/>',
    roundabout: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v5M12 16.2v5M2.8 12h5M16.2 12h5"/>',
    walk: '<circle cx="13.4" cy="4.4" r="1.9"/><path d="M11 21.2l2.1-6-3.1-3 1.6-4.6 3.4 2.8 3 1M10.1 12.6 8 16.2l-3.1 1"/>',
    bus: '<rect x="4" y="3.6" width="16" height="13.8" rx="2.6"/><path d="M4 11.2h16M7.6 20.6v-3.2M16.4 20.6v-3.2"/><path d="M7.4 14.3h.2M16.4 14.3h.2"/>',
    siren: '<path d="M6.4 18v-4.8a5.6 5.6 0 0 1 11.2 0V18"/><path d="M4.2 18h15.6v3H4.2z"/><path d="M12 2.8v2.2M4.4 5.8l1.5 1.5M19.6 5.8l-1.5 1.5"/>',
    highway: '<path d="M9.2 3 5.8 21M14.8 3l3.4 18"/><path d="M12 4.6v2.6M12 10.6v2.6M12 16.6v2.6"/>',
    eye: '<path d="M2.6 12S6.2 5.6 12 5.6 21.4 12 21.4 12 17.8 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3"/>',
    rain: '<path d="M7.2 14.8a4.4 4.4 0 0 1-.4-8.8A6 6 0 0 1 18 7.4a3.7 3.7 0 0 1-.5 7.4z"/><path d="M8.4 18.2l-1 2.2M12.4 18.2l-1 2.2M16.4 18.2l-1 2.2"/>',
    parking: '<rect x="4.2" y="3.4" width="15.6" height="17.2" rx="3"/><path d="M10 16.8V7.4h3.1a3.1 3.1 0 0 1 0 6.2H10"/>',
    light: '<rect x="8" y="2.8" width="8" height="18.4" rx="3"/><circle cx="12" cy="7.4" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="16.6" r="1.4"/>',
    diamond: '<path d="M12 3.2 20.8 12 12 20.8 3.2 12z"/><path d="M12 7.6 16.4 12 12 16.4 7.6 12z"/>',
    turn: '<path d="M8 21v-7.6a5 5 0 0 1 5-5h6.4"/><path d="m15.8 4.8 3.6 3.6-3.6 3.6"/>',
    lanes: '<path d="M5 3v18M19 3v18"/><path d="M12 3.2v3M12 10.5v3M12 17.8v3"/>',
    moon: '<path d="M19.2 14.6A7.6 7.6 0 0 1 9.4 4.8a7.6 7.6 0 1 0 9.8 9.8z"/>',
    medal: '<circle cx="12" cy="14.6" r="5.4"/><path d="M8.6 10.4 6 3.2h4l2 4.8 2-4.8h4l-2.6 7.2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.4 6h.2M4.4 12h.2M4.4 18h.2"/>',
    shield: '<path d="M12 3.2 19 6v5.6c0 4.4-3 7.6-7 9.2-4-1.6-7-4.8-7-9.2V6z"/><path d="m9 12 2.2 2.2L15.4 10"/>'
  };
  function ic(name, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }

  // ------------------------------------------------------------------ small components
  function nl2br(s) { return String(s).replace(/\n/g, '<br>'); }
  var EXREF = [];
  function exRef(o) { var i = EXREF.indexOf(o); if (i < 0) { EXREF.push(o); i = EXREF.length - 1; } return 'ex:' + i; }
  function srcMapFor(k) {
    var p = parseKey(k);
    if (p.kind === 'ex') return { o: EXREF[+p.id] || null, map: (DATA.exams || {}).sources || {} };
    if (p.kind === 'card') { var c = IX.cards[p.id]; return { o: c, map: c ? (((DATA.banks || {})[c._bank] || {}).sources || {}) : {} }; }
    var o = objOf(k);
    if (!o) return { o: null, map: {} };
    if (p.kind === 'q') return { o: o, map: ((DATA.banks || {})[o._bank] || {}).sources || {} };
    if (p.kind === 'sign') return { o: o, map: (DATA.signs || {}).sources || {} };
    if (p.kind === 'mk') return { o: o, map: (DATA.markings || {}).sources || {} };
    return { o: o, map: ((DATA.scenarioSources || {})[o._file]) || {} };
  }
  function srcFor(k) {
    var r = srcMapFor(k);
    if (!r.o) return [];
    return arr(r.o.src).map(function (id) {
      var s = r.map[id];
      return s ? { id: id, title: s.title || id, url: s.url || '', publisher: s.publisher || '', date: s.date || '' } : { id: id, title: id, url: '', publisher: '', date: '' };
    });
  }
  function confBadge(conf, key) {
    var hi = conf === 'high';
    return '<button class="conf ' + (hi ? 'conf-hi' : 'conf-md') + '" data-act="srcInfo" data-arg="' + esc(key) + '">' +
      ic(hi ? 'shield' : 'info') + '<span>' + (hi ? 'مصادر موثوقة' : 'مصدر واحد') + '</span></button>';
  }
  function srcRow(s) {
    var meta = [s.publisher, s.date].filter(Boolean).map(esc).join('، ');
    return '<li class="src"><b>' + esc(s.title) + '</b>' + (meta ? '<span>' + meta + '</span>' : '') +
      (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" dir="ltr">' + esc(s.url.replace(/^https?:\/\//, '').slice(0, 64)) + '</a>' : '') + '</li>';
  }
  function laneBar(frac, cls, label) {
    var p = clamp(frac || 0, 0, 1) * 100;
    return '<div class="lane' + (cls ? ' ' + cls : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      Math.round(p) + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '><i style="width:' + p.toFixed(1) + '%"></i></div>';
  }
  function starsHTML(n, cls) {
    var s = '';
    for (var i = 0; i < 3; i++) s += '<span class="st' + (i < n ? ' on' : '') + '">' + ic('star', 'fill') + '</span>';
    return '<span class="stars' + (cls ? ' ' + cls : '') + '" role="img" aria-label="' + n + ' من 3 نجوم">' + s + '</span>';
  }
  function chip(txt, cls) { return '<span class="chip' + (cls ? ' ' + cls : '') + '">' + txt + '</span>'; }
  function emName(em) { return em === 'dubai' ? 'دبي' : em === 'sharjah' ? 'الشارقة' : 'دبي والشارقة'; }
  function normEm(v) {
    var a = arr(v).map(function (x) { return String(x).toLowerCase(); });
    var d = a.some(function (x) { return x.indexOf('dubai') >= 0 || x === 'both' || x === 'all'; });
    var s = a.some(function (x) { return x.indexOf('sharjah') >= 0 || x === 'both' || x === 'all'; });
    return d && !s ? 'dubai' : s && !d ? 'sharjah' : 'both';
  }

  // speedometer gauge: 240 degree arc, clockwise, value 0..100
  function gaugeSVG(val) {
    val = clamp(Math.round(val || 0), 0, 100);
    var a0 = 150, sw = 240, R = 44;
    function P(a, r) { var t = a * Math.PI / 180; return (60 + r * Math.cos(t)).toFixed(2) + ' ' + (60 + r * Math.sin(t)).toFixed(2); }
    function arcD(f, t, r) { return 'M' + P(f, r) + ' A' + r + ' ' + r + ' 0 ' + (t - f > 180 ? 1 : 0) + ' 1 ' + P(t, r); }
    var s = '<svg class="gauge-svg" viewBox="0 0 120 106" aria-hidden="true" focusable="false">';
    s += '<path d="' + arcD(a0, a0 + sw, R) + '" class="g-track"/>';
    [[0, 50, 'var(--bad)'], [50, 80, 'var(--warn)'], [80, 100, 'var(--ok)']].forEach(function (z) {
      s += '<path d="' + arcD(a0 + sw * z[0] / 100 + (z[0] ? 1.2 : 0), a0 + sw * z[1] / 100, R + 8) + '" class="g-zone" style="stroke:' + z[2] + '"/>';
    });
    for (var i = 0; i <= 20; i++) {
      var a = (a0 + sw * i / 20) * Math.PI / 180, big = i % 5 === 0, r1 = R - (big ? 9 : 6), r2 = R - 3;
      s += '<line x1="' + (60 + r1 * Math.cos(a)).toFixed(2) + '" y1="' + (60 + r1 * Math.sin(a)).toFixed(2) + '" x2="' +
        (60 + r2 * Math.cos(a)).toFixed(2) + '" y2="' + (60 + r2 * Math.sin(a)).toFixed(2) + '" class="g-tick' + (big ? ' big' : '') + '"/>';
    }
    var col = val >= 80 ? 'var(--ok)' : val >= 50 ? 'var(--warn)' : 'var(--bad)';
    if (val > 0) s += '<path d="' + arcD(a0, a0 + sw * Math.max(val, 1.5) / 100, R) + '" class="g-val" style="stroke:' + col + '"/>';
    var ang = a0 + sw * val / 100;
    s += '<g class="g-needle" style="transform:rotate(' + ang.toFixed(1) + 'deg)"><path d="M60 57.2 L99 60 L60 62.8 Z" class="g-nd"/></g>';
    s += '<circle cx="60" cy="60" r="6" class="g-hub"/><circle cx="60" cy="60" r="2.2" class="g-hub2"/>';
    s += '<text x="60" y="92" class="g-num" text-anchor="middle">' + val + '</text>';
    return s + '</svg>';
  }

  // UAE highway exit sign used as unit card header
  var EXIT_COLORS = { blue: 1, green: 1, brown: 1, orange: 1 };
  function exitSign(u, done, total, big) {
    var col = EXIT_COLORS[u.color] ? u.color : 'blue';
    return '<div class="exit exit-' + col + (big ? ' exit-big' : '') + '">' +
      '<div class="exit-tab"><span>مخرج</span><b class="num">' + esc(u.exit) + '</b><span class="exit-en" dir="ltr">EXIT ' + esc(u.exit) + '</span></div>' +
      '<div class="exit-board">' +
        '<svg class="exit-arrow" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M11 29 L27 13"/><path d="M15.5 12.4 H27.6 V24.5"/></svg>' +
        '<div class="exit-text"><h2 class="exit-title">' + esc(u.title) + '</h2>' + (u.subtitle ? '<p class="exit-sub">' + esc(u.subtitle) + '</p>' : '') + '</div>' +
        (total ? '<div class="exit-foot">' + laneBar(total ? done / total : 0, 'lane-w') + '<span class="num">' + done + '/' + total + '</span></div>' : '') +
      '</div></div>';
  }

  function signTile(o, kind) {
    var key = (kind === 'mk' ? 'mk:' : 'sign:') + o.id, b = boxOf(key);
    return '<button class="sg" data-act="' + (kind === 'mk' ? 'mkInfo' : 'signInfo') + '" data-arg="' + esc(o.id) + '">' +
      '<span class="sg-img" data-lazy="' + esc(o.id) + '"></span>' +
      '<span class="sg-name">' + esc(o.name) + '</span>' +
      '<span class="sg-dot b' + b + '" title="' + (b ? 'الصندوق ' + b : 'لسا ما تدربت عليها') + '"></span></button>';
  }

  // ------------------------------------------------------------------ shell
  var appEl, mainEl, toastEl, sheetWrap, sheetBody, celEl;
  var NAV = [
    { id: 'home', name: 'اليوم', icon: 'today' },
    { id: 'path', name: 'المسار', icon: 'route' },
    { id: 'signs', name: 'الإشارات', icon: 'sign' },
    { id: 'arena', name: 'مواقف', icon: 'junction' },
    { id: 'yard', name: 'الساحة', icon: 'cone' },
    { id: 'exam', name: 'امتحان', rail: 'امتحان تجريبي', icon: 'exam' },
    { id: 'review', name: 'المراجعة', icon: 'review', railOnly: true },
    { id: 'settings', name: 'الإعدادات', icon: 'gear', railOnly: true }
  ];
  function brandHTML() {
    return '<button class="brand" data-act="tab" data-arg="home" aria-label="مقود، الصفحة الرئيسية">' +
      '<span class="brand-mark">' + ic('wheel') + '</span><span class="brand-name">مقود</span></button>';
  }
  function shellHTML() {
    var tabs = NAV.filter(function (n) { return !n.railOnly; }).map(function (n) {
      return '<button class="tab" data-act="tab" data-arg="' + n.id + '" data-nav="' + n.id + '">' + ic(n.icon) + '<span>' + n.name + '</span></button>';
    }).join('');
    var rail = NAV.map(function (n) {
      return '<button class="rail-i" data-act="tab" data-arg="' + n.id + '" data-nav="' + n.id + '">' + ic(n.icon) + '<span>' + (n.rail || n.name) + '</span>' +
        (n.id === 'review' ? '<b class="cnt num" data-hud="due" hidden></b>' : '') + '</button>';
    }).join('');
    return '<header class="hdr">' + brandHTML() +
        '<div class="hud">' +
          '<button class="hud-p" data-act="tab" data-arg="badges" aria-label="أيام متتالية" title="أيام متتالية">' + ic('flame') + '<b class="num" data-hud="streak">0</b></button>' +
          '<button class="hud-p hud-km" data-act="tab" data-arg="badges" aria-label="المسافة المقطوعة">' + ic('gauge') + '<b class="num" data-hud="km">0</b><small>كم</small></button>' +
          '<button class="hud-b" data-act="tab" data-arg="review" aria-label="المراجعة">' + ic('review') + '<i class="num" data-hud="due" hidden></i></button>' +
          '<button class="hud-b" data-act="tab" data-arg="settings" aria-label="الإعدادات">' + ic('gear') + '</button>' +
        '</div></header>' +
      '<aside class="rail">' + brandHTML() + '<nav class="rail-nav" aria-label="الأقسام">' + rail + '</nav>' +
        '<div class="rail-foot"><button class="rail-stat" data-act="tab" data-arg="badges">' +
          '<span class="rail-title" data-hud="title">متدرب</span>' +
          '<span class="rail-nums"><span class="hud-km">' + ic('gauge') + '<b class="num" data-hud="km">0</b> كم</span><span>' + ic('flame') + '<b class="num" data-hud="streak">0</b> يوم</span></span>' +
        '</button></div></aside>' +
      '<main class="main" id="main" tabindex="-1"></main>' +
      '<nav class="tabs" aria-label="الأقسام">' + tabs + '</nav>' +
      '<div class="toasts" aria-live="polite"></div>' +
      '<div class="sheet-wrap" hidden><div class="sheet-scrim" data-act="closeSheet"></div>' +
        '<div class="sheet" role="dialog" aria-modal="true" tabindex="-1"><button class="sheet-x icon-btn" data-act="closeSheet" aria-label="سكر">' + ic('close') + '</button>' +
        '<div class="sheet-body"></div></div></div>' +
      '<div class="cel" hidden></div>';
  }
  function updateHud() {
    if (!appEl) return;
    var st = streakNow(), due = dueKeys().length, t = titleInfo();
    $$('[data-hud="streak"]', appEl).forEach(function (e) { e.textContent = st; });
    $$('[data-hud="km"]', appEl).forEach(function (e) { e.textContent = fmtKm(S.km); });
    $$('[data-hud="title"]', appEl).forEach(function (e) { e.textContent = t.cur.name; });
    $$('[data-hud="due"]', appEl).forEach(function (e) { e.textContent = due > 99 ? '99+' : due; e.hidden = !due; });
  }
  function hudKm(v) {
    if (!appEl || !v) return;
    $$('.hud-km', appEl).forEach(function (el) {
      if (!el.offsetParent) return;
      var f = D.createElement('span');
      f.className = 'km-float num'; f.setAttribute('dir', 'ltr'); f.textContent = '+' + fmtKm(v);
      el.appendChild(f);
      setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1300);
    });
    $$('[data-hud="km"]', appEl).forEach(function (e) { e.textContent = fmtKm(S.km); });
  }
  function setNav(id) {
    $$('[data-nav]', appEl).forEach(function (b) {
      var on = b.getAttribute('data-nav') === id;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  // ------------------------------------------------------------------ router
  var SCREENS = {}, ACT = {};
  var cur = { name: 'home', params: {} }, stack = [];
  var ctls = [], timers = [];
  function scrollY() { return W.pageYOffset || D.documentElement.scrollTop || 0; }
  function go(name, params, o) {
    o = o || {};
    if (!o.replace) { stack.push({ name: cur.name, params: cur.params, y: scrollY() }); if (stack.length > 40) stack.shift(); }
    cur = { name: name, params: params || {} };
    render(0);
  }
  function tab(name) { closeSheet(); stack = []; cur = { name: name, params: {} }; render(0); }
  function back() {
    if (sheetOpen()) { closeSheet(); return; }
    var p = stack.pop();
    if (!p) { if (cur.name !== 'home') tab('home'); return; }
    cur = { name: p.name, params: p.params };
    render(p.y);
  }
  function track(c) { if (c) ctls.push(c); return c; }
  function every(fn, ms) { var id = setInterval(fn, ms); timers.push(id); return id; }
  function safeCall(o, m) {
    if (!o || typeof o[m] !== 'function') return undefined;
    try { return o[m].apply(o, [].slice.call(arguments, 2)); } catch (e) { warn('controller call failed', m, e); return undefined; }
  }
  function cleanup() {
    var scr = SCREENS[cur.name];
    timers.forEach(clearInterval); timers = [];
    ctls.forEach(function (c) { safeCall(c, 'destroy'); }); ctls = [];
    if (io) { io.disconnect(); io = null; }
    if (scr && scr.unmount) { try { scr.unmount(); } catch (e) { warn('unmount failed', e); } }
  }
  var rendered = null;
  function render(y) {
    if (rendered) cleanup();
    var scr = SCREENS[cur.name] || SCREENS.home;
    rendered = cur.name;
    appEl.classList.toggle('focus', !!scr.focus);
    setNav(typeof scr.tab === 'function' ? scr.tab() : (scr.tab || cur.name));
    var html;
    try { html = scr.render(cur.params || {}); } catch (e) {
      if (W.console) console.error('[miqwad] render failed', cur.name, e);
      html = '<div class="scr"><div class="empty">' + ic('info') + '<h2>صار خطأ بهالشاشة</h2><p>ارجع وجرب كمان مرة</p><button class="btn" data-act="tab" data-arg="home">ارجع لليوم</button></div></div>';
    }
    mainEl.innerHTML = html;
    try { if (scr.mount) scr.mount(mainEl, cur.params || {}); } catch (e) { if (W.console) console.error('[miqwad] mount failed', cur.name, e); }
    lazySigns(mainEl);
    if (y != null) W.scrollTo(0, y);
    updateHud();
  }
  function rerender() { render(null); }

  // lazy sign SVG rendering
  var io = null;
  function fillLazy(el) { var id = el.getAttribute('data-lazy'); el.removeAttribute('data-lazy'); el.innerHTML = signSVG(id); }
  function lazySigns(root) {
    var els = $$('[data-lazy]', root || mainEl);
    if (!els.length) return;
    if (!('IntersectionObserver' in W)) { els.forEach(fillLazy); return; }
    if (!io) io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); fillLazy(en.target); } });
    }, { rootMargin: '400px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // ------------------------------------------------------------------ sheet, confirm, toast
  var sheetOnClose = null, lastFocus = null, confirmCb = null;
  function sheetOpen() { return !!sheetWrap && !sheetWrap.hidden; }
  function openSheet(html, o) {
    o = o || {};
    if (sheetOpen()) { var prev = sheetOnClose; sheetOnClose = null; if (prev) prev(); }
    else lastFocus = D.activeElement;
    sheetBody.innerHTML = html;
    sheetWrap.className = 'sheet-wrap' + (o.cls ? ' ' + o.cls : '');
    sheetWrap.hidden = false;
    sheetOnClose = o.onClose || null;
    var sh = $('.sheet', sheetWrap);
    sh.scrollTop = 0;
    requestAnimationFrame(function () { sheetWrap.classList.add('open'); });
    try { sh.focus({ preventScroll: true }); } catch (e) { /* focus is best effort */ }
    // sheet content is small: render its signs now
    $$('[data-lazy]', sheetBody).forEach(fillLazy);
  }
  function closeSheet() {
    if (!sheetOpen()) return;
    sheetWrap.classList.remove('open');
    sheetWrap.hidden = true;
    sheetBody.innerHTML = '';
    var cb = sheetOnClose; sheetOnClose = null; confirmCb = null;
    if (cb) cb();
    if (lastFocus && lastFocus.focus && D.body.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function confirmSheet(o) {
    openSheet('<div class="cfm">' + (o.icon ? '<div class="cfm-ic' + (o.danger ? ' bad' : '') + '">' + ic(o.icon) + '</div>' : '') +
      '<h2>' + esc(o.title) + '</h2>' + (o.body ? '<p>' + o.body + '</p>' : '') +
      '<div class="cfm-row"><button class="btn ' + (o.danger ? 'btn-bad' : 'btn-gold') + '" data-act="cfmOk">' + esc(o.ok || 'تمام') + '</button>' +
      '<button class="btn btn-ghost" data-act="closeSheet">' + esc(o.cancel || 'لا، ارجع') + '</button></div></div>', { cls: 'sheet-sm' });
    confirmCb = o.onOk || null;
  }
  ACT.cfmOk = function () { var cb = confirmCb; confirmCb = null; closeSheet(); if (cb) cb(); };
  ACT.closeSheet = function () { closeSheet(); };
  function toast(html, kind, ms) {
    if (!toastEl) return;
    ms = ms || 2400;
    var t = D.createElement('div');
    t.className = 'toast' + (kind ? ' toast-' + kind : '');
    t.innerHTML = html;
    toastEl.appendChild(t);
    while (toastEl.children.length > 3) toastEl.removeChild(toastEl.firstChild);
    setTimeout(function () { t.classList.add('out'); }, ms);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms + 450);
  }

  // ------------------------------------------------------------------ celebration (unit completed)
  function celebrate(u) {
    if (!celEl || !u) return;
    var n = u.lessons.length;
    Snd.play('done');
    celEl.innerHTML = '<div class="cel-road" aria-hidden="true"><div class="cel-plane"><i class="cel-edge l"></i><i class="cel-dash"></i><i class="cel-edge r"></i></div></div>' +
      '<div class="cel-card" role="dialog" aria-modal="true" aria-label="خلصت الوحدة">' + exitSign(u, n, n, true) +
      '<h2>خلصت المخرج ' + esc(u.exit) + '</h2><p>عديت ' + esc(u.title) + ' كلها، و<b>' + ltrTxt('+5') + '</b> كم مكافأة على الطريق</p>' +
      '<button class="btn btn-gold btn-lg" data-act="celClose">كمل الطريق ' + ic('next') + '</button></div>';
    celEl.hidden = false;
    requestAnimationFrame(function () { celEl.classList.add('on'); });
    var b = $('[data-act="celClose"]', celEl);
    if (b) try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function closeCel() { if (!celEl || celEl.hidden) return; celEl.classList.remove('on'); celEl.hidden = true; celEl.innerHTML = ''; }
  ACT.celClose = closeCel;

  // ------------------------------------------------------------------ generic actions
  ACT.tab = function (a) { tab(a || 'home'); };
  ACT.go = function (a) {
    var i = String(a || '').indexOf(':');
    if (i < 0) go(a); else go(a.slice(0, i), { id: a.slice(i + 1) });
  };
  ACT.back = function () { back(); };
  ACT.srcInfo = function (k) {
    var list = srcFor(k), r = srcMapFor(k), o = r.o || {};
    var hi = o.confidence === 'high';
    openSheet('<div class="sh-pad"><h2 class="sh-title">' + ic(hi ? 'shield' : 'info') + (hi ? 'مصادر موثوقة' : 'مصدر واحد') + '</h2>' +
      '<p class="muted">' + (hi ? 'المعلومة من جهة رسمية أو معهد معتمد، أو مصدرين قويين متفقين' : 'المعلومة من مصدر واحد جيد، تأكد منها مع معهدك') + '</p>' +
      (o.notes ? '<p class="note">' + esc(o.notes) + '</p>' : '') +
      (list.length ? '<ul class="srcs">' + list.map(srcRow).join('') + '</ul>' : '<p class="muted">ما في مصادر مسجلة لهالعنصر</p>') + '</div>', { cls: 'sheet-sm' });
  };
  ACT.flagKey = function (k, btn) {
    markForReview(k);
    if (btn) { btn.disabled = true; btn.textContent = 'ضفناها للمراجعة'; }
    updateHud();
  };

  // ------------------------------------------------------------------ plan, next lesson, readiness
  function examDaysLeft() {
    var d = S.profile.examDate;
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    return dayNo(keyToDate(d)) - TODAY;
  }
  var AK = null;
  function allKeys() {
    if (AK && AK.em === S.profile.emirate) return AK.keys;
    var keys = [];
    CUR.lessons.forEach(function (l) { if (l.kind === 'lesson') keys = keys.concat(lessonPool(l).keys); });
    keys = uniq(keys).filter(quizzable);
    AK = { em: S.profile.emirate, keys: keys };
    return keys;
  }
  function todayPlan() {
    var due = dueKeys().length, keys = allKeys(), unseen = 0;
    keys.forEach(function (k) { if (!S.items[k]) unseen++; });
    var left = examDaysLeft();
    var started = Math.max(0, Math.floor((nowMs() - (S.created || nowMs())) / DAY_MS));
    var horizon = left != null && left > 0 ? Math.max(1, left - 4) : Math.max(10, 60 - started);
    var goal = clamp(Math.round(num(S.profile.goal, 20)), 5, 200);
    var needNew = unseen ? Math.ceil(unseen / horizon) : 0;
    var rev = Math.min(due, Math.max(goal, 15));
    var fresh = Math.min(unseen, Math.max(needNew, goal - rev));
    var total = rev + fresh;
    var done = (S.days[dayKey()] || {}).n || 0;
    return { due: due, rev: rev, fresh: fresh, total: total, done: done, unseen: unseen, left: left,
      tight: left != null && left > 0 && needNew > goal, mins: Math.max(1, Math.round(total * 20 / 60)), goal: goal };
  }
  function lessonDone(l) { var r = S.lessons[l.id]; return !!(r && r.s >= 1); }
  function lessonPlayable(l) {
    if (l.kind === 'yard') return (yardOK() && yardList().some(function (e) { return e.id === l.raw.exercise; })) || !!yardGuideFor(l.raw.exercise);
    var p = lessonPool(l);
    if (p.keys.some(quizzable)) return true;
    return l.kind === 'lesson' && (p.cards.length + p.signs.length + p.marks.length) > 0;
  }
  function nextLesson() {
    for (var i = 0; i < CUR.lessons.length; i++) {
      var l = CUR.lessons[i];
      if (!lessonDone(l) && lessonPlayable(l)) return l;
    }
    return null;
  }
  function lessonKindName(l) { return l.kind === 'yard' ? 'تمرين الساحة' : l.kind === 'challenge' ? 'التحدي' : 'الدرس الجاي'; }

  var TH_EXCL = { yard: 1, roadtest: 1 };
  var ROAD_TOPICS = ['roadtest', 'hazard', 'priority', 'roundabouts', 'pedestrians', 'emergency-vehicles', 'school-bus',
    'lanes', 'turning', 'overtaking', 'highway', 'vulnerable', 'lights', 'speed', 'distance'];
  function theoryKeys(em) {
    var ems = [em], keys = [];
    IX.qList.forEach(function (q) { if (!TH_EXCL[q.topic] && forEm(q, ems)) keys.push('q:' + q.id); });
    IX.signList.forEach(function (s) { if (drawn(s.id)) keys.push('sign:' + s.id); });
    IX.markList.forEach(function (m) { if (drawn(m.id)) keys.push('mk:' + m.id); });
    return keys;
  }
  function knowledge(keys) {
    var w = 0, k = 0;
    keys.forEach(function (key) { var ww = 1 + 0.25 * (levelOf(key) - 1); w += ww; k += ww * (STRENGTH[boxOf(key)] || 0); });
    return w ? k / w : 0;
  }
  function coverage(keys) {
    if (!keys.length) return 0;
    var n = 0; keys.forEach(function (k) { if (S.items[k]) n++; });
    return n / keys.length;
  }
  function readiness() {
    var out = {};
    ['dubai', 'sharjah'].forEach(function (em) {
      var keys = theoryKeys(em), K = knowledge(keys);
      var ex = S.exams.filter(function (e) { return e.em === em || e.em === 'both'; }).slice(0, 3);
      var M = ex.length ? mean(ex.map(function (e) { return e.pct; })) : null;
      out[em] = { v: 100 * (M == null ? 0.85 * K : 0.65 * K + 0.35 * M), K: K, cov: coverage(keys), M: M, nEx: ex.length, n: keys.length, pending: !keys.length };
    });
    var yl = yardList().filter(function (e) { return !isFreeYard(e); });
    var yk = IX.qList.filter(function (q) { return q.topic === 'yard' && forEm(q); }).map(function (q) { return 'q:' + q.id; });
    var Ky = knowledge(yk), Y = null;
    if (yl.length) {
      Y = mean(yl.map(function (e) {
        var r = S.yard[e.id];
        if (!r) return 0;
        if (r.pass) return 1;
        return Math.max(r.learn ? 0.35 : 0.15, r.best ? clamp(r.best / 100, 0, 1) * 0.6 : 0);
      }));
    }
    out.yard = { v: 100 * (Y != null ? 0.8 * Y + 0.2 * Ky : 0.5 * Ky), Y: Y, K: Ky, nEx: yl.length, pending: !yl.length && !yk.length };
    var sk = IX.scList.filter(function (s) { return forEm(s) && (s.type === 'choice' || scenesOK()); }).map(function (s) { return 'sc:' + s.id; });
    var rk = IX.qList.filter(function (q) { return ROAD_TOPICS.indexOf(q.topic) >= 0 && forEm(q); }).map(function (q) { return 'q:' + q.id; });
    var Ks = knowledge(sk), Kr = knowledge(rk);
    var base = sk.length ? 0.6 * Ks + 0.4 * Kr : Kr;
    var rr = S.road.slice(0, 3);
    var E = rr.length ? mean(rr.map(function (r) { return r.passed ? r.score / 100 : Math.min(0.5, r.score / 100); })) : null;
    out.road = { v: 100 * (E != null ? 0.7 * base + 0.3 * E : 0.85 * base), Ks: Ks, Kr: Kr, E: E, nSc: sk.length, pending: !sk.length && !rk.length };
    return out;
  }

  // ------------------------------------------------------------------ home
  function roadDeco() {
    return '<svg class="hero-road" viewBox="0 0 240 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      '<path d="M114 0 H126 L218 160 H22 Z" class="hr-asph"/>' +
      '<path d="M115.5 0 L34 160" class="hr-edge-y"/><path d="M124.5 0 L206 160" class="hr-edge-w"/>' +
      '<path d="M120 0 V160" class="hr-dash"/></svg>';
  }
  function greeting() { var h = new Date().getHours(); return h >= 4 && h < 12 ? 'صباح الخير' : h < 17 && h >= 12 ? 'أهلين' : 'مسا الخير'; }
  function tripStat(n, label) { return '<div class="trip-s"><b class="num">' + n + '</b><span>' + label + '</span></div>'; }
  function heroHTML() {
    var p = todayPlan(), nl = nextLesson(), now = new Date();
    var frac = p.total ? Math.min(1, p.done / p.total) : 1;
    var cd;
    if (p.left == null) cd = '<button class="chip chip-btn" data-act="tab" data-arg="settings">' + ic('clock') + 'حدد موعد امتحانك لنظبط الخطة</button>';
    else if (p.left > 0) cd = '<span class="chip chip-gold">' + ic('clock') + 'باقي ' + nf(p.left, 'يوم', 'يومين', 'أيام') + ' على امتحانك</span>';
    else if (p.left === 0) cd = '<span class="chip chip-gold">' + ic('clock') + 'امتحانك اليوم، الله يوفقك</span>';
    else cd = '<button class="chip chip-btn" data-act="tab" data-arg="settings">' + ic('clock') + 'موعد امتحانك مر، حدث التاريخ</button>';
    var X = S.activeExam;
    var contT = X ? 'كمل الامتحان المفتوح' : 'كمل من وين وقفت';
    var resume = S.last && CUR.byId[S.last.lesson] && !lessonDone(CUR.byId[S.last.lesson]) ? CUR.byId[S.last.lesson] : null;
    var target = resume || nl;
    var contS = X ? X.title : target ? (resume ? 'رجعة على ' : lessonKindName(target) + ': ') + target.title : (p.due ? nf(p.due, 'مراجعة', 'مراجعتين', 'مراجعات') + ' مستحقة' : 'امتحان تجريبي');
    return '<section class="hero">' + roadDeco() +
      '<div class="hero-in">' +
        '<p class="eyebrow">' + greeting() + '، ' + WEEKDAYS[now.getDay()] + ' ' + fmtDate(now) + '</p>' +
        '<h1 class="hero-t">رحلة اليوم</h1>' +
        '<div class="trip">' + tripStat(p.rev, 'مراجعة') + tripStat(p.fresh, 'جديد') + tripStat(p.mins, 'دقيقة تقريبا') + '</div>' +
        '<div class="trip-prog">' + laneBar(frac, 'lane-lg', 'تقدم اليوم') +
          '<span class="trip-pl">' + (p.total && p.done < p.total ? '<b class="num">' + p.done + '/' + p.total + '</b>' : ic('check') + 'خلصت خطة اليوم') + '</span></div>' +
        (p.tight ? '<p class="warnline">' + ic('info') + '<span>الوقت ضيق على الامتحان، زيد هدفك اليومي من الإعدادات</span></p>' : '') +
        '<div class="hero-row">' + cd + '</div>' +
        '<button class="cta" data-act="cont"><span class="cta-tx"><span class="cta-t">' + contT + '</span><span class="cta-s">' + esc(contS) + '</span></span><span class="cta-ic">' + ic('next') + '</span></button>' +
      '</div></section>';
  }
  function emBtn(v, t) {
    var on = S.profile.emirate === v;
    return '<button class="seg-b' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="setEm" data-arg="' + v + '">' + t + '</button>';
  }
  function welcomeHTML() {
    var first = nextLesson() || CUR.lessons[0];
    return '<section class="hero hero-w">' + roadDeco() +
      '<div class="hero-in">' +
        '<p class="eyebrow">مدربك الخاص لرخصة السواقة بالإمارات</p>' +
        '<h1 class="hero-t">أهلا فيك بمقود</h1>' +
        '<p class="hero-p">من أول إشارة لآخر يوم قبل الامتحان: الإشارات والقوانين والمواقف والساحة والطريق، خطوة بخطوة ومن الأسهل للأصعب</p>' +
        '<p class="hero-q">وين رح تقدم على الرخصة؟</p>' +
        '<div class="seg seg-em" role="radiogroup" aria-label="الإمارة">' + emBtn('dubai', 'دبي') + emBtn('sharjah', 'الشارقة') + emBtn('both', 'لسا ما قررت') + '</div>' +
        '<button class="cta" data-act="start"><span class="cta-tx"><span class="cta-t">ابدأ</span><span class="cta-s">' +
          (first ? 'أول محطة: ' + esc(first.title) : 'يلا نبلش') + '</span></span><span class="cta-ic">' + ic('next') + '</span></button>' +
        '<ul class="hero-feats"><li>' + ic('sign') + 'كل الإشارات مع معانيها</li><li>' + ic('junction') + 'مواقف مرسومة من فوق</li><li>' + ic('exam') + 'امتحانات تجريبية بوقت</li></ul>' +
      '</div></section>';
  }
  function activeExamBanner() {
    var X = S.activeExam, left = Math.round((X.end - nowMs()) / 1000);
    return '<section class="banner">' + ic('clock') + '<div class="banner-t"><b>عندك امتحان مفتوح: ' + esc(X.title) + '</b><span>' +
      (left > 0 ? 'باقي ' + fmtClock(left) + ' من الوقت' : 'خلص وقته، شوف نتيجتك') + '</span></div>' +
      '<button class="btn btn-gold btn-sm" data-act="go" data-arg="examRun">' + (left > 0 ? 'كمل' : 'النتيجة') + '</button></section>';
  }
  function gaugesHTML() {
    var R = readiness(), em = S.profile.emirate;
    function g(key, label) {
      var r = R[key], dim = (key === 'dubai' && em === 'sharjah') || (key === 'sharjah' && em === 'dubai');
      return '<button class="gauge' + (dim ? ' dim' : '') + '" data-act="readyInfo" data-arg="' + key + '" aria-label="' + label + ' ' + Math.round(r.v) + ' من 100">' +
        gaugeSVG(r.v) + '<span class="gauge-l">' + label + '</span>' + (r.pending ? '<span class="gauge-s">قيد التجهيز</span>' : '') + '</button>';
    }
    return '<section class="sec"><div class="sec-h"><h2>جاهزيتك</h2><button class="linkbtn" data-act="readyInfo" data-arg="all">كيف منحسبها؟</button></div>' +
      '<div class="gauges">' + g('dubai', 'امتحان دبي') + g('sharjah', 'امتحان الشارقة') + g('yard', 'الساحة') + g('road', 'الطريق') + '</div></section>';
  }
  function reviewRowHTML() {
    var m = mistakeKeys().filter(quizzable).length, d = dueKeys().length;
    return '<section class="duo">' +
      '<button class="tile tile-bad" data-act="drill" data-arg="mistakes"' + (m ? '' : ' disabled') + '>' + ic('review') +
        '<span class="tile-t">راجع أغلاطك</span><b class="tile-n num">' + m + '</b><span class="tile-s">' + (m ? 'كل غلطة بتضل ترجع لحد ما تثبت' : 'ما عندك أغلاط هلق') + '</span></button>' +
      '<button class="tile" data-act="drill" data-arg="due"' + (d ? '' : ' disabled') + '>' + ic('cards') +
        '<span class="tile-t">مراجعات اليوم</span><b class="tile-n num">' + d + '</b><span class="tile-s">' + (d ? 'حسب صناديق التكرار' : 'ولا شي مستحق اليوم') + '</span></button>' +
      '</section>';
  }
  function quickHTML() {
    var ns = IX.signList.length, nsc = IX.scList.length, yl = yardList().filter(function (e) { return !isFreeYard(e); }).length;
    var q = [
      ['signs', 'sign', 'الإشارات', ns ? nf(ns, 'إشارة', 'إشارتين', 'إشارات') : 'قيد التجهيز'],
      ['flash', 'cards', 'بطاقات سريعة', 'اقلب واحفظ'],
      ['arena', 'junction', 'مواقف', nsc ? nf(nsc, 'موقف', 'موقفين', 'مواقف') : 'أسئلة المواقف'],
      ['examiner', 'wheel', 'جولة الفاحص', '12 موقف كأنك بالامتحان'],
      ['yard', 'cone', 'الساحة', yardOK() && yl ? nf(yl, 'تمرين', 'تمرينين', 'تمارين') : 'قيد التجهيز'],
      ['exam', 'exam', 'امتحان تجريبي', 'بوقت وعلامة نجاح']
    ];
    return '<section class="sec"><div class="sec-h"><h2>روح مباشرة</h2></div><div class="quick">' + q.map(function (x) {
      return '<button class="qk" data-act="quick" data-arg="' + x[0] + '">' + ic(x[1]) + '<span class="qk-t">' + x[2] + '</span><span class="qk-s">' + x[3] + '</span></button>';
    }).join('') + '</div>' + (emData('dubai') || emData('sharjah') ? '<button class="set-link" data-act="go" data-arg="journey">' + ic('route') +
      '<span>مشوار الرخصة خطوة بخطوة: من فتح الملف للرخصة</span>' + ic('next') + '</button>' : '') + '</section>';
  }
  function rankHTML() {
    var t = titleInfo(), got = BADGES.filter(function (b) { return S.badges[b.id]; }).length;
    return '<section class="sec"><button class="rank" data-act="tab" data-arg="badges">' +
      '<span class="rank-ic">' + ic('medal') + '</span>' +
      '<span class="rank-main"><span class="rank-l">لقبك</span><b class="rank-t">' + t.cur.name + '</b>' + laneBar(t.frac) +
        '<span class="rank-s">' + (t.next ? 'باقي <b class="num">' + fmtKm(t.left) + '</b> كم لتصير ' + t.next.name : 'وصلت لأعلى لقب') + '</span></span>' +
      '<span class="rank-b"><b class="num">' + got + '</b><span>أوسمة</span></span></button></section>';
  }
  function weekHTML() {
    var d = new Date(); d.setDate(d.getDate() - 6);
    var cells = '';
    for (var i = 0; i < 7; i++) {
      var k = dayKey(d), rec = S.days[k], on = activeDay(k);
      cells += '<div class="wk' + (on ? ' on' : '') + (i === 6 ? ' today' : '') + '"><span class="wk-stud"></span><span class="wk-d">' +
        WEEKDAYS_S[d.getDay()] + '</span><span class="wk-n num">' + (rec && rec.n ? rec.n : '') + '</span></div>';
      d.setDate(d.getDate() + 1);
    }
    var st = streakNow();
    return '<section class="sec"><div class="sec-h"><h2>آخر 7 أيام</h2><span class="sec-note">' +
      (st ? ic('flame') : '') + streakText(st) + '</span></div>' +
      '<div class="week">' + cells + '</div>' +
      '<p class="muted small">منحسب اليوم إلك لما تجاوب 5 أسئلة أو تخلص درس، وأفضل سلسلة إلك ' + nf(streakBest(), 'يوم', 'يومين', 'أيام') + '</p></section>';
  }
  SCREENS.home = {
    tab: 'home',
    render: function () {
      return '<div class="scr scr-home">' + (S.onboarded ? heroHTML() : welcomeHTML()) +
        (S.activeExam ? activeExamBanner() : '') + gaugesHTML() + reviewRowHTML() + quickHTML() + rankHTML() + weekHTML() + '</div>';
    }
  };
  ACT.setEm = function (v) {
    if (['dubai', 'sharjah', 'both'].indexOf(v) < 0) return;
    S.profile.emirate = v; clearPools(); AK = null; save(); rerender();
  };
  ACT.start = function () {
    S.onboarded = true; save();
    var l = nextLesson();
    if (l) openLesson(l.id); else rerender();
  };
  ACT.cont = function () {
    if (S.activeExam) { go('examRun'); return; }
    S.onboarded = true;
    var resume = S.last && CUR.byId[S.last.lesson] && !lessonDone(CUR.byId[S.last.lesson]) ? CUR.byId[S.last.lesson] : null;
    var l = resume && lessonPlayable(resume) ? resume : nextLesson();
    if (l) openLesson(l.id);
    else if (dueKeys().length) startDrill('due');
    else go('exam');
  };
  ACT.quick = function (a) {
    if (a === 'flash') startFlash(null);
    else if (a === 'examiner') startExaminer();
    else tab(a);
  };
  ACT.readyInfo = function (key) {
    var R = readiness();
    function row(label, v, note) {
      return '<div class="ri-row"><span class="ri-l">' + label + '</span>' + laneBar(v == null ? 0 : v) + '<b class="num">' + (v == null ? 'لسا' : pct(v) + '%') + '</b></div>' +
        (note ? '<p class="ri-note">' + note + '</p>' : '');
    }
    function block(k) {
      var r = R[k];
      if (k === 'dubai' || k === 'sharjah') {
        return '<div class="ri"><h3>' + (k === 'dubai' ? 'امتحان دبي النظري' : 'اختبار الإشارات في الشارقة') + '<b class="num">' + Math.round(r.v) + '</b></h3>' +
          row('معرفتك بأسئلة وإشارات الامتحان', r.K) + row('شفت منها لهلق', r.cov) +
          row('آخر امتحاناتك التجريبية', r.M, r.M == null ? 'ما عملت امتحان تجريبي لسا، فالمؤشر ما بيطلع فوق 85 لحتى تعمل واحد' : 'معدل آخر ' + nf(r.nEx, 'امتحان', 'امتحانين', 'امتحانات')) +
          '<p class="ri-f">الجاهزية = ' + ltrTxt('65%') + ' معرفة + ' + ltrTxt('35%') + ' امتحانات تجريبية، والمعرفة بتوزن الأسئلة الصعبة أكتر</p></div>';
      }
      if (k === 'yard') {
        return '<div class="ri"><h3>الساحة<b class="num">' + Math.round(r.v) + '</b></h3>' +
          row('تمارين المحاكي', r.Y, r.Y == null ? 'محاكي الساحة قيد التجهيز' : 'النجاح بوضع الامتحان بيعطي العلامة الكاملة للتمرين') +
          row('أسئلة الساحة', r.K) + '<p class="ri-f">الجاهزية = ' + ltrTxt('80%') + ' تمارين + ' + ltrTxt('20%') + ' أسئلة</p></div>';
      }
      return '<div class="ri"><h3>اختبار الطريق<b class="num">' + Math.round(r.v) + '</b></h3>' +
        row('المواقف المرسومة', r.nSc ? r.Ks : null, r.nSc ? '' : 'المواقف المرسومة قيد التجهيز') + row('أسئلة الطريق والأولوية', r.Kr) +
        row('جولات الفاحص', r.E, r.E == null ? 'جرب جولة الفاحص ليرتفع المؤشر فوق 85' : 'الرسوب بخطأ قاتل بيحسب نص العلامة بالأكتر') +
        '<p class="ri-f">الجاهزية = ' + ltrTxt('70%') + ' مواقف وأسئلة + ' + ltrTxt('30%') + ' جولات الفاحص</p></div>';
    }
    var order = key && R[key] ? [key].concat(['dubai', 'sharjah', 'yard', 'road'].filter(function (x) { return x !== key; })) : ['dubai', 'sharjah', 'yard', 'road'];
    openSheet('<div class="sh-pad"><h2 class="sh-title">' + ic('gauge') + 'كيف منحسب جاهزيتك</h2>' +
      '<p class="muted">كل عنصر بتتعلمه بيطلع بصناديق التكرار، وكل ما طلع صندوق زادت معرفتك فيه، وما منحسب العنصر الجديد لحتى تجاوبه</p>' +
      order.map(block).join('') + '</div>');
  };

  // ------------------------------------------------------------------ path
  var pathScrolled = false;
  function stopHTML(l, isNext) {
    var r = S.lessons[l.id], done = lessonDone(l), play = lessonPlayable(l);
    var kindTxt = l.kind === 'yard' ? 'ساحة' : l.kind === 'challenge' ? 'تحدي' : 'درس';
    var meta = '';
    if (l.kind === 'lesson') {
      var p = lessonPool(l), nq = Math.min(p.count, p.keys.filter(quizzable).length), nc = p.cards.length + p.signs.length + p.marks.length;
      meta = (nc ? nf(nc, 'بطاقة', 'بطاقتين', 'بطاقات') + '، ' : '') + (nq ? nf(nq, 'سؤال', 'سؤالين', 'أسئلة') : 'بدون أسئلة لسا');
    } else if (l.kind === 'challenge') meta = nf(Math.round(num(l.raw.count, 12)), 'سؤال', 'سؤالين', 'أسئلة') + '، النجاح من ' + pctTxt(num(l.raw.pass, 0.8));
    else meta = yardOK() ? 'تمرين بالمحاكي' : yardGuideFor(l.raw.exercise) ? 'خطوات التمرين، والمحاكي قيد التجهيز' : 'المحاكي قيد التجهيز';
    return '<li class="stop k-' + l.kind + (done ? ' done' : '') + (isNext ? ' next' : '') + (play ? '' : ' soon') + '">' +
      '<button class="stop-b" data-act="lesson" data-arg="' + esc(l.id) + '">' +
        '<span class="stud" aria-hidden="true">' + (l.kind === 'challenge' ? ic('trophy') : l.kind === 'yard' ? ic('cone') : done ? ic('check') : '') + '</span>' +
        '<span class="stop-main"><span class="stop-k">' + kindTxt + '</span><span class="stop-t">' + esc(l.title) + '</span><span class="stop-m">' + meta + '</span></span>' +
        '<span class="stop-end">' + (done ? starsHTML(r.s) : isNext ? '<span class="here">' + ic('car') + 'أنت هون</span>' : '') + '</span>' +
      '</button></li>';
  }
  SCREENS.path = {
    tab: 'path',
    render: function () {
      var total = CUR.lessons.length, done = CUR.lessons.filter(lessonDone).length, nl = nextLesson();
      if (!total) return '<div class="scr"><div class="empty">' + ic('route') + '<h2>المسار قيد التجهيز</h2><p>لسا ما في دروس، بس فيك تتدرب على الإشارات والامتحانات</p></div></div>';
      var h = '<div class="scr scr-path"><header class="scr-h"><h1>المسار</h1><p>' +
        (CUR.auto ? 'مسار مرتب تلقائيا من المحتوى المتوفر' : 'من الأسهل للأصعب، والمحطة المقترحة عليها سيارتك، بس فيك تفتح أي محطة') + '</p>' +
        '<div class="path-prog">' + laneBar(total ? done / total : 0, 'lane-lg', 'تقدم المسار') + '<span class="num">' + done + '/' + total + '</span></div></header><div class="road">';
      CUR.units.forEach(function (u) {
        var ud = u.lessons.filter(lessonDone).length;
        h += '<section class="unit' + (S.units[u.id] ? ' unit-done' : '') + '">' + exitSign(u, ud, u.lessons.length) + '<ol class="stops">';
        u.lessons.forEach(function (l) { h += stopHTML(l, !!nl && nl.id === l.id); });
        h += '</ol></section>';
      });
      return h + '<div class="road-end">' + ic('flag') + '<span>خط النهاية: يوم الامتحان</span></div></div></div>';
    },
    mount: function (root) {
      if (pathScrolled) return;
      pathScrolled = true;
      var n = $('.stop.next', root);
      if (n && n.getBoundingClientRect().top > W.innerHeight * 0.8) {
        try { n.scrollIntoView({ block: 'center' }); } catch (e) { /* ignore */ }
      }
    }
  };
  ACT.lesson = function (id) {
    var l = CUR.byId[id];
    if (!l) return;
    if (!lessonPlayable(l)) { toast(l.kind === 'yard' ? 'محاكي الساحة قيد التجهيز' : 'هالمحطة لسا ما فيها محتوى', 'warn'); return; }
    openLesson(id);
  };

  // ------------------------------------------------------------------ quiz items
  var OK_WORDS = ['صح عليك', 'برافو', 'تمام هيك', 'عاش', 'ممتاز', 'مظبوط'];
  var BAD_WORDS = ['مش هيك', 'لا، ركز معي', 'قريبة بس لا', 'انتبه هون'];
  var CRIT_TOPICS = ['priority', 'roundabouts', 'pedestrians', 'school-bus', 'emergency-vehicles', 'lights', 'police', 'hazard'];
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function validPerm(p, n) {
    if (!Array.isArray(p) || p.length !== n) return false;
    var s = p.slice().sort(function (a, b) { return a - b; });
    for (var i = 0; i < n; i++) if (s[i] !== i) return false;
    return true;
  }
  function sevOf(o) {
    if (!o) return 'minor';
    if (o.critical === true || o.severity === 'critical') return 'critical';
    if (o.critical === false || o.severity === 'minor') return 'minor';
    return CRIT_TOPICS.indexOf(o.topic) >= 0 ? 'critical' : 'minor';
  }
  function mcqItem(q, spec) {
    var perm = spec && validPerm(spec.o, q.options.length) ? spec.o : shuffle(range(q.options.length));
    var key = 'q:' + q.id;
    return { key: key, type: 'mcq', id: q.id, q: q.q, tag: topicName(q.topic), level: q.level, topic: q.topic,
      opts: perm.map(function (i) { return { t: q.options[i] }; }), correct: perm.indexOf(q.answer),
      explain: q.explain || '', tip: q.tip || '', note: '', conf: q.confidence,
      figs: figList(arr(q.fig).concat(arr(q.signs), arr(q.sign)), 3), ofigs: optFigs(q, perm), xfigs: figList(q.explain_fig, 3),
      scene: q.scene || null, sev: sevOf(q), spec: { k: key, t: 'mcq', o: perm } };
  }
  // opt_figs follow the shuffled option order; dropped when fewer than 2 of them are drawn
  function optFigs(q, perm) {
    var of = q.opt_figs;
    if (!Array.isArray(of) || of.length !== q.options.length) return null;
    var out = perm.map(function (i) { return figOK(of[i]) ? of[i] : null; });
    return out.filter(Boolean).length >= 2 ? out : null;
  }
  function distract(target, list, map, n, needDrawn) {
    var picks = [], names = Object.create(null);
    names[normAr(target.name)] = 1;
    function add(o) {
      if (picks.length >= n || !o || o.id === target.id) return;
      if (needDrawn && !drawn(o.id)) return;
      var nm = normAr(o.name);
      if (names[nm]) return;
      names[nm] = 1; picks.push(o.id);
    }
    shuffle(arr(target.confuse)).forEach(function (id) { add(map[id]); });
    if (picks.length < n) shuffle(list.filter(function (o) { return o.cat === target.cat; })).forEach(add);
    if (picks.length < n && target.shape) shuffle(list.filter(function (o) { return o.shape === target.shape; })).forEach(add);
    if (picks.length < n) shuffle(list).forEach(add);
    return picks;
  }
  function mkQuestion(m) {
    var c = String(m.cat || '') + ' ' + String(m.id || '');
    if (/^(tl|ls|pl)-|light|signal/.test(m.id) || /light|signal/.test(c)) return 'ماذا تعني هذه الإشارة الضوئية؟';
    if (/police|^po-/.test(c) || /^po-/.test(m.id)) return 'ماذا تعني إشارة الشرطي هذه؟';
    if (/kerb|^kb-/.test(c) || /^kb-/.test(m.id)) return 'ماذا يعني هذا اللون على حافة الرصيف؟';
    if (/^ev-/.test(m.id) || /emergency/.test(c)) return 'ماذا تعني هذه الإشارة؟';
    return 'ماذا تعني هذه العلامة على الطريق؟';
  }
  function signExplain(s) { return (s.meaning || '') + (s.action ? '\nشو تعمل: ' + s.action : ''); }
  function sign2mItem(s, spec, isMk) {
    var map = isMk ? IX.marks : IX.signs, list = isMk ? IX.markList : IX.signList;
    var ids = spec && Array.isArray(spec.o) ? spec.o.filter(function (id) { return map[id]; }) : null;
    if (!ids || ids.indexOf(s.id) < 0 || ids.length < 2) ids = shuffle([s.id].concat(distract(s, list, map, 3, false)));
    if (ids.length < 2) return null;
    var key = (isMk ? 'mk:' : 'sign:') + s.id, t = isMk ? 'mk2m' : 'sign2m';
    return { key: key, type: t, id: s.id, q: isMk ? mkQuestion(s) : 'ماذا تعني هذه الإشارة؟',
      tag: isMk ? (IX.mkCatName[s.cat] || 'علامة') : (IX.catName[s.cat] || 'إشارة'), level: s.level, topic: isMk ? 'mk' : 'signs',
      opts: ids.map(function (id) { return { t: map[id].name, id: id }; }), correct: ids.indexOf(s.id),
      explain: signExplain(s), tip: '', note: s.uae_note || '', conf: s.confidence, sev: 'critical', spec: { k: key, t: t, o: ids } };
  }
  function m2signItem(s, spec) {
    var ids = spec && Array.isArray(spec.o) ? spec.o.filter(function (id) { return IX.signs[id] && drawn(id); }) : null;
    if (!ids || ids.indexOf(s.id) < 0 || ids.length < 2) {
      var d = distract(s, IX.signList, IX.signs, 3, true);
      if (d.length < 3) return null;
      ids = shuffle([s.id].concat(d));
    }
    var key = 'sign:' + s.id;
    return { key: key, type: 'm2sign', id: s.id, q: 'أي إشارة من هذه تعني: ' + s.name + '؟', tag: IX.catName[s.cat] || 'إشارة',
      level: s.level, topic: 'signs', opts: ids.map(function (id) { return { t: IX.signs[id].name, id: id }; }), correct: ids.indexOf(s.id),
      explain: signExplain(s), tip: '', note: s.uae_note || '', conf: s.confidence, sev: 'critical', spec: { k: key, t: 'm2sign', o: ids } };
  }
  function scItem(s, spec) {
    var key = 'sc:' + s.id;
    if (s.type === 'tap') {
      if (!scenesOK()) return null;
      return { key: key, type: 'sctap', id: s.id, q: s.q || 'وين الخطر؟', tag: topicName(s.topic), level: s.level, topic: s.topic,
        opts: [], correct: -1, answer: arr(s.answer).map(String), hotspots: s.hotspots || [], scene: s.scene || {},
        explain: s.explain || '', tip: s.tip || '', note: '', conf: s.confidence, sev: sevOf(s), raw: s, xfigs: figList(s.explain_fig, 3),
        spec: { k: key, t: 'sctap' } };
    }
    var n = s.options.length, a = Math.floor(+s.answer);
    if (!(a >= 0 && a < n)) return null;
    var perm = spec && validPerm(spec.o, n) ? spec.o : shuffle(range(n));
    return { key: key, type: 'scq', id: s.id, q: s.q || 'شو لازم تعمل؟', tag: topicName(s.topic), level: s.level, topic: s.topic,
      opts: perm.map(function (i) { return { t: s.options[i] }; }), correct: perm.indexOf(a), scene: s.scene || null, hotspots: s.hotspots || [],
      explain: s.explain || '', tip: s.tip || '', note: '', conf: s.confidence, sev: sevOf(s), raw: s, xfigs: figList(s.explain_fig, 3),
      spec: { k: key, t: 'scq', o: perm } };
  }
  function buildItem(key, pref) {
    var p = parseKey(key), o = objOf(key);
    if (!o) return null;
    try {
      if (p.kind === 'q') return mcqItem(o);
      if (p.kind === 'sign') {
        if (!drawn(o.id)) return null;
        var mode = pref || (Math.random() < 0.6 ? 'sign2m' : 'm2sign');
        return (mode === 'm2sign' && m2signItem(o)) || sign2mItem(o);
      }
      if (p.kind === 'mk') return drawn(o.id) ? sign2mItem(o, null, true) : null;
      if (p.kind === 'sc') return scItem(o);
    } catch (e) { warn('item build failed', key, e); }
    return null;
  }
  function itemFromSpec(spec) {
    if (!spec || !spec.k) return null;
    var o = objOf(spec.k);
    if (!o) return null;
    try {
      if (spec.t === 'mcq') return mcqItem(o, spec);
      if (spec.t === 'sign2m') return sign2mItem(o, spec);
      if (spec.t === 'mk2m') return sign2mItem(o, spec, true);
      if (spec.t === 'm2sign') return m2signItem(o, spec) || sign2mItem(o);
      if (spec.t === 'scq' || spec.t === 'sctap') return scItem(o, spec);
    } catch (e) { warn('item rebuild failed', spec.k, e); }
    return null;
  }
  // need order: due (lowest box first), then never seen, then the rest (lowest box first)
  function orderByNeed(keys) {
    var due = [], fresh = [], rest = [];
    shuffle(keys).forEach(function (k) { var r = S.items[k]; if (!r) fresh.push(k); else if (isDue(r)) due.push(k); else rest.push(k); });
    due.sort(function (a, b) { return S.items[a].b - S.items[b].b; });
    rest.sort(function (a, b) { return S.items[a].b - S.items[b].b; });
    return due.concat(fresh, rest);
  }
  // keep a mix of item kinds proportional to the pool
  function balanced(ordered, n) {
    if (ordered.length <= n) return ordered.slice();
    var groups = {}, kinds = [];
    ordered.forEach(function (k) { var kd = parseKey(k).kind; if (!groups[kd]) { groups[kd] = []; kinds.push(kd); } groups[kd].push(k); });
    if (kinds.length === 1) return ordered.slice(0, n);
    var quota = {}, given = 0;
    kinds.forEach(function (kd) { quota[kd] = Math.max(1, Math.round(n * groups[kd].length / ordered.length)); given += quota[kd]; });
    while (given > n) {
      var big = kinds.slice().sort(function (a, b) { return quota[b] - quota[a]; })[0];
      quota[big]--; given--;
    }
    var out = [], used = {};
    kinds.forEach(function (kd) { groups[kd].slice(0, quota[kd]).forEach(function (k) { out.push(k); used[k] = 1; }); });
    for (var i = 0; i < ordered.length && out.length < n; i++) if (!used[ordered[i]]) { out.push(ordered[i]); used[ordered[i]] = 1; }
    return out;
  }
  function buildSession(keys, n, o) {
    o = o || {};
    keys = uniq(keys).filter(quizzable);
    var picked = o.random ? shuffle(keys).slice(0, n) : balanced(orderByNeed(keys), n);
    var items = [];
    picked.forEach(function (k) { var it = buildItem(k); if (it) items.push(it); });
    if (items.length < n && o.twoWay) {
      items.slice().forEach(function (it) {
        if (items.length >= n) return;
        if (it.type === 'sign2m') { var alt = m2signItem(IX.signs[it.id]); if (alt) items.push(alt); }
        else if (it.type === 'm2sign') { var alt2 = sign2mItem(IX.signs[it.id]); if (alt2) items.push(alt2); }
      });
    }
    return o.keepOrder ? items : shuffle(items);
  }

  // ------------------------------------------------------------------ item rendering
  function lvlChip(L) { L = clamp(Math.round(num(L, 1)), 1, 5); return '<span class="chip chip-lv lv' + L + '">' + LEVEL_NAMES[L] + '</span>'; }
  function optionsHTML(it, o) {
    var img = it.type === 'm2sign', of = !img && it.ofigs;
    return '<div class="opts' + (img ? ' opts-img' : of ? ' opts-fig' : '') + '" role="group" aria-label="الخيارات">' + it.opts.map(function (op, i) {
      var sel = o.sel === i;
      return '<button class="opt' + (sel ? ' is-sel' : '') + '" data-act="' + (o.exam ? 'xa' : 'qa') + '" data-arg="' + i + '"' +
        (o.exam ? ' aria-pressed="' + sel + '"' : '') + '><span class="opt-k num" aria-hidden="true">' + (i + 1) + '</span>' +
        (img ? '<span class="opt-img">' + signSVG(op.id) + '</span><span class="sr">' + esc(op.t) + '</span>'
          : of ? '<span class="opt-img' + (of[i] ? '' : ' is-empty') + '">' + (of[i] ? signSVG(of[i]) : '') + '</span><span class="opt-t">' + esc(op.t) + '</span>'
          : '<span class="opt-t">' + esc(op.t) + '</span>') +
        '<span class="opt-mark" aria-hidden="true"></span></button>';
    }).join('') + '</div>';
  }
  function itemHTML(it, o) {
    o = o || {};
    var h = '<div class="qi qi-' + it.type + '">';
    h += '<div class="qi-tags">' + chip(esc(it.tag)) + lvlChip(it.level) + (o.flag ? '<span class="chip chip-flag">' + ic('flag') + 'معلم</span>' : '') + '</div>';
    // question first, then the picture it talks about (as in the real exam screens)
    h += '<h2 class="qi-q">' + esc(it.q) + '</h2>';
    if (it.type === 'sctap') h += '<p class="qi-hint">' + ic('eye') + '<span>دق على المكان الصح بالمشهد</span></p>';
    if (it.type === 'sign2m' || it.type === 'mk2m') h += '<div class="qi-fig">' + signSVG(it.id) + '</div>';
    if (it.figs && it.figs.length) h += it.figs.length === 1 ? figHero(it.figs[0], 'qi-fig', false) : figRow(it.figs, 'qi-figs', false);
    if (it.scene) h += '<div class="qi-scene" data-scene="1"></div>';
    if (it.type !== 'sctap') h += optionsHTML(it, o);
    return h + '</div>';
  }
  function pendingScene() {
    return '<div class="pending">' + ic('junction') + '<b>المشهد المرسوم قيد التجهيز</b><span>اقرأ السؤال وجاوب متل العادة</span></div>';
  }
  function mountScene(el, it, o) {
    o = o || {};
    if (!el) return null;
    if (!scenesOK()) { el.innerHTML = pendingScene(); el.classList.add('is-pending'); return null; }
    var ctl = null, input = it.raw && it.raw.scene ? it.raw : { scene: it.scene, hotspots: it.hotspots || [] };
    try {
      ctl = W.Scenes.mount(el, input, { onTap: o.interactive ? o.onTap : null, hotspots: it.hotspots && it.hotspots.length ? it.hotspots : undefined,
        reducedMotion: reducedMotion(), autoplay: true });
    } catch (e) { warn('scene mount failed', it.key, e); el.innerHTML = pendingScene(); el.classList.add('is-pending'); return null; }
    if (ctl) track(ctl);
    if (ctl && ctl.phase === 'error') el.classList.add('is-error');
    return ctl;
  }

  // ------------------------------------------------------------------ sessions (lesson practice, drills, arena, examiner)
  var SESS = null, LRN = null;
  function newSess(kind, o) {
    var s = { kind: kind, title: '', items: [], i: 0, combo: 0, best: 0, ok: 0, km: 0, done: false, start: nowMs() };
    Object.keys(o || {}).forEach(function (k) { s[k] = o[k]; });
    return s;
  }
  function learnList(les) {
    var p = lessonPool(les), out = [];
    p.cards.forEach(function (id) { out.push({ t: 'card', id: id }); });
    p.signs.forEach(function (id) { out.push({ t: 'sign', id: id }); });
    p.marks.forEach(function (id) { out.push({ t: 'mk', id: id }); });
    return out;
  }
  function openLesson(id) {
    var les = CUR.byId[id];
    if (!les) return;
    S.onboarded = true;
    S.last = { lesson: id, at: nowMs() };
    save();
    if (les.kind === 'yard') {
      if (yardOK() && yardList().some(function (e) { return e.id === les.raw.exercise; })) go('yardRun', { id: les.raw.exercise, lesson: les.id, mode: 'learn' }, { replace: cur.name === 'play' });
      else go('yardGuide', { id: les.raw.exercise, lesson: les.id }, { replace: cur.name === 'play' });
      return;
    }
    LRN = { id: id, list: les.kind === 'lesson' ? learnList(les) : [], i: 0 };
    if (les.kind === 'challenge' || LRN.list.length) go('lesson', { id: id }, { replace: cur.name === 'play' });
    else startPractice(id);
  }
  function finishLearnOnly(les, msg) {
    var r = S.lessons[les.id] || { s: 0, best: 0, n: 0 };
    var first = !(r.s >= 1);
    r.s = Math.max(r.s || 0, 1); r.best = Math.max(r.best || 0, 1); r.n = (r.n || 0) + 1; r.d = TODAY;
    S.lessons[les.id] = r;
    markActive();
    if (first) addKm(1);
    if (S.last && S.last.lesson === les.id) S.last = null;
    var u = CUR.unitOf[les.id];
    var unitNow = u && !S.units[u.id] && unitDone(u);
    if (unitNow) { S.units[u.id] = dayKey(); addKm(5); }
    save(); checkBadges();
    toast(ic('check') + '<span>' + (msg || 'خلصت بطاقات الدرس، وأسئلته رح تبين لما تجهز') + '</span>', 'ok');
    back();
    if (unitNow) setTimeout(function () { celebrate(u); }, 300);
  }
  function startPractice(id) {
    var les = CUR.byId[id];
    if (!les) return;
    var p = lessonPool(les);
    var items = buildSession(p.keys, p.count, { twoWay: les.kind === 'lesson' });
    if (!items.length) {
      if (les.kind === 'lesson' && learnList(les).length) { finishLearnOnly(les); return; }
      toast('هالمحطة لسا ما فيها أسئلة جاهزة', 'warn');
      return;
    }
    SESS = newSess('lesson', { title: les.title, lessonId: les.id, items: items,
      challenge: les.kind === 'challenge', pass: les.kind === 'challenge' ? clamp(num(les.raw.pass, 0.8), 0.1, 1) : 0 });
    go('play', {}, { replace: cur.name === 'lesson' });
  }
  function unitDone(u) {
    return u.lessons.every(function (l) { return lessonDone(l) || !lessonPlayable(l); }) && u.lessons.some(lessonDone);
  }
  function unitById(id) { for (var i = 0; i < CUR.units.length; i++) if (CUR.units[i].id === id) return CUR.units[i]; return null; }
  function startDrill(mode, keys, title) {
    var items = [], t = '';
    if (mode === 'due') { items = buildSession(dueKeys(), 20, {}); t = 'مراجعات اليوم'; }
    else if (mode === 'mistakes') { items = buildSession(mistakeKeys(), 20, {}); t = 'راجع أغلاطك'; }
    else if (mode === 'yard') {
      items = buildSession(IX.qList.filter(function (q) { return q.topic === 'yard' && forEm(q); }).map(function (q) { return 'q:' + q.id; }), 10, {});
      t = 'أسئلة الساحة';
    } else if (mode === 'keys') { items = buildSession(keys || [], Math.min(12, Math.max(4, (keys || []).length * 2)), { twoWay: true }); t = title || 'تدريب سريع'; }
    if (!items.length) { toast('ما في شي تتدرب عليه هون هلق', 'warn'); return; }
    SESS = newSess('drill', { title: t, items: items, mode: mode, sub: 'مراجعة' });
    go('play');
  }
  ACT.drill = function (m) { startDrill(m); };

  // ------------------------------------------------------------------ lesson screen (learn phase)
  function sbar(title, frac, right, sub) {
    return '<div class="sbar"><button class="icon-btn" data-act="back" aria-label="اطلع">' + ic('close') + '</button>' +
      '<div class="sbar-mid"><div class="sbar-t"><b>' + esc(title) + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>' + laneBar(frac, 'lane-sm') + '</div>' +
      (right || '<span class="sbar-sp"></span>') + '</div>';
  }
  function learnCardHTML(e) {
    if (e.t === 'card') {
      var c = IX.cards[e.id];
      if (!c) return '';
      // a concept figure leads big with the examples in a row under it; plain signs share one row
      var cf = figList(c.fig, 4), lead = cf.length > 1 && !!IX.figs[cf[0]];
      return '<article class="lc lc-note' + (cf.length ? ' has-fig' : '') + (lead ? ' has-lead' : '') + '">' +
        (cf.length === 1 || lead ? figHero(cf[0], 'lc-fig', true) + (lead ? figRow(cf.slice(1), 'lc-figs', true) : '')
          : cf.length ? figRow(cf, 'lc-figs', true) : '') +
        chip(esc(topicName(c.topic))) + '<h2 class="lc-title">' + esc(c.title || '') + '</h2>' +
        '<p class="lc-body">' + nl2br(esc(c.body || '')) + '</p>' +
        (c.key ? '<div class="lc-key"><span>احفظها</span><b>' + esc(c.key) + '</b></div>' : '') +
        '<div class="lc-meta">' + confBadge(c.confidence, 'card:' + c.id) + '</div></article>';
    }
    var isS = e.t === 'sign', map = isS ? IX.signs : IX.marks, o = map[e.id];
    if (!o) return '';
    var conf = arr(o.confuse).filter(function (id) { return map[id]; }).slice(0, 4);
    var cat = isS ? IX.catName[o.cat] : IX.mkCatName[o.cat];
    return '<article class="lc lc-sign"><div class="lc-fig' + (drawn(o.id) ? '' : ' undrawn') + '">' + signSVG(o.id) + '</div>' +
      '<div class="lc-info">' + (cat ? chip(esc(cat)) : '') + lvlChip(o.level) + '<h2 class="lc-title">' + esc(o.name) + '</h2>' +
      '<p class="lc-body">' + esc(o.meaning || '') + '</p>' +
      (o.action ? '<div class="lc-do">' + ic('wheel') + '<div><b>شو لازم تعمل</b><p>' + esc(o.action) + '</p></div></div>' : '') +
      (o.uae_note ? '<div class="lc-uae">' + ic('info') + '<div><b>بالإمارات</b><p>' + esc(o.uae_note) + '</p></div></div>' : '') +
      (conf.length ? '<div class="lc-conf"><b>بتنخلط مع</b><div class="minis">' + conf.map(function (id) {
        return '<button class="mini" data-act="' + (isS ? 'signInfo' : 'mkInfo') + '" data-arg="' + esc(id) + '"><span class="mini-img">' + signSVG(id) + '</span><span class="mini-t">' + esc(map[id].name) + '</span></button>';
      }).join('') + '</div></div>' : '') +
      '<div class="lc-meta">' + confBadge(o.confidence, (isS ? 'sign:' : 'mk:') + o.id) + '</div></div></article>';
  }
  function challengeIntroHTML(les) {
    var p = lessonPool(les), n = Math.min(p.count, p.keys.filter(quizzable).length), pass = num(les.raw.pass, 0.8), r = S.lessons[les.id];
    var u = CUR.unitOf[les.id];
    return '<div class="lesson">' + sbar(les.title, 0, '', 'تحدي') +
      '<div class="chal"><div class="chal-ic">' + ic('trophy') + '</div><h1>' + esc(les.title) + '</h1>' +
      '<p>' + (u ? 'تحدي «' + esc(u.title) + '»: ' : '') + nf(n, 'سؤال', 'سؤالين', 'أسئلة') + ' مخلوطة من دروس الوحدة، ولازم تجيب ' + pctTxt(pass) + ' أو أكتر لتعدي</p>' +
      (r ? '<p class="muted">أفضل نتيجة إلك: <b>' + pctTxt(r.best) + '</b></p>' : '') +
      '<button class="btn btn-gold btn-lg" data-act="lpractice"' + (n ? '' : ' disabled') + '>ابدأ التحدي ' + ic('next') + '</button></div></div>';
  }
  SCREENS.lesson = {
    focus: true, tab: 'path',
    render: function (p) {
      var les = CUR.byId[p.id];
      if (!les) return noSession();
      if (!LRN || LRN.id !== les.id) LRN = { id: les.id, list: les.kind === 'lesson' ? learnList(les) : [], i: 0 };
      if (les.kind === 'challenge') return challengeIntroHTML(les);
      var n = LRN.list.length, i = clamp(LRN.i, 0, Math.max(0, n - 1)), last = i >= n - 1;
      return '<div class="lesson">' + sbar(les.title, n ? (i + 1) / n : 1,
          '<button class="linkbtn sbar-skip" data-act="lpractice">روح للتمرين</button>', 'تعلم <span class="num">' + (i + 1) + '/' + n + '</span>') +
        '<div class="stage learn-stage">' + (LRN.list[i] ? learnCardHTML(LRN.list[i]) : '') + '</div>' +
        '<div class="actbar"><div class="actbar-in">' +
          '<button class="btn btn-ghost" data-act="lprev"' + (i === 0 ? ' disabled' : '') + '>' + ic('back') + 'السابق</button>' +
          (last ? '<button class="btn btn-gold" data-act="lpractice" data-primary="1">يلا نتدرب' + ic('next') + '</button>'
                : '<button class="btn btn-gold" data-act="lnext" data-primary="1">التالي' + ic('next') + '</button>') +
        '</div></div></div>';
    },
    key: function (e) {
      if (!LRN) return false;
      var les = CUR.byId[LRN.id];
      if (les && les.kind === 'challenge') { if (e.key === 'Enter') { ACT.lpractice(); return true; } return false; }
      if (e.key === 'ArrowLeft' || e.key === 'Enter' || e.key === ' ') { if (LRN.i >= LRN.list.length - 1) ACT.lpractice(); else ACT.lnext(); return true; }
      if (e.key === 'ArrowRight') { ACT.lprev(); return true; }
      return false;
    }
  };
  ACT.lnext = function () { if (!LRN) return; LRN.i = Math.min(LRN.list.length - 1, LRN.i + 1); Snd.play('flip'); render(0); };
  ACT.lprev = function () { if (!LRN) return; LRN.i = Math.max(0, LRN.i - 1); render(0); };
  ACT.lpractice = function () { if (!LRN) return; S.learned[LRN.id] = 1; save(); startPractice(LRN.id); };

  // ------------------------------------------------------------------ play screen
  function noSession() {
    return '<div class="scr"><div class="empty">' + ic('route') + '<h2>ما في جولة شغالة</h2><p>ارجع واختار درس أو مراجعة</p>' +
      '<button class="btn btn-gold" data-act="tab" data-arg="home">ارجع لليوم</button></div></div>';
  }
  function comboHTML(s) {
    return '<div class="combo' + (s.combo >= 2 ? ' on' : '') + '" title="أجوبة صح ورا بعض">' + ic('bolt') + '<b class="num">' + s.combo + '</b></div>';
  }
  function playHTML(s) {
    var it = s.items[s.i], n = s.items.length;
    var sub = s.kind === 'examiner' ? 'الفاحص جنبك' : s.kind === 'lesson' ? (s.challenge ? 'تحدي' : 'تمرين') : s.kind === 'arena' ? 'مواقف' : (s.sub || 'مراجعة');
    return '<div class="play">' + sbar(s.title, s.i / n, comboHTML(s), sub + ' <span class="num">' + (s.i + 1) + '/' + n + '</span>') +
      '<div class="stage">' + itemHTML(it, {}) + '<div class="fb-slot" aria-live="polite"></div></div>' +
      '<div class="actbar"><div class="actbar-in">' +
        '<span class="kbd-hint">' + (it.type === 'sctap' ? 'دق على المشهد' : 'اختار جواب<span class="kbd-only">، أو اكبس <kbd>1</kbd> لـ <kbd>' + it.opts.length + '</kbd></span>') + '</span>' +
        '<button class="btn btn-gold btn-next" data-act="qn" hidden>' + (s.i + 1 < n ? 'التالي' : 'النتيجة') + ic('next') + '</button>' +
      '</div></div></div>';
  }
  function feedbackHTML(it, ok, km, s) {
    var head = ok
      ? '<b>' + pick(OK_WORDS) + '</b>' + (km ? '<span class="fb-km">' + plusKm(km) + ' كم</span>' : '')
      : '<b>' + pick(BAD_WORDS) + '</b><span class="fb-add">' + ic('review') + 'ضفناها للمراجعة</span>';
    var exr = '';
    if (s && s.kind === 'examiner') {
      exr = ok ? '<p class="fb-exr ok">' + ic('check') + 'الفاحص كتب: تمام</p>'
        : it.sev === 'critical' ? '<p class="fb-exr crit">' + ic('flag') + 'الفاحص كتب: خطأ قاتل، بالامتحان الحقيقي هاد بيرسبك</p>'
        : '<p class="fb-exr minor">' + ic('info') + 'الفاحص كتب: خطأ بسيط، بينقص من علامتك</p>';
    }
    var right = !ok && it.type !== 'sctap' && it.type !== 'm2sign' && it.opts[it.correct]
      ? '<p class="fb-right"><span>الجواب الصح</span><b>' + esc(it.opts[it.correct].t) + '</b></p>' : '';
    return '<div class="fb ' + (ok ? 'fb-ok' : 'fb-bad') + '" role="status"><div class="fb-h">' + ic(ok ? 'check' : 'close') + head + '</div>' + exr + right +
      (it.explain ? '<p class="fb-x">' + nl2br(esc(it.explain)) + '</p>' : '') +
      (it.xfigs && it.xfigs.length ? figRow(it.xfigs, 'fb-figs', true) : '') +
      (it.note ? '<p class="fb-note">' + ic('info') + '<span><b>بالإمارات:</b> ' + esc(it.note) + '</span></p>' : '') +
      (it.tip ? '<p class="fb-tip">' + ic('bolt') + '<span>' + esc(it.tip) + '</span></p>' : '') +
      (it._ctl ? '<button class="btn btn-sm fb-replay" data-act="replay">' + ic('play') + 'شوف الحل بالمشهد</button>' : '') +
      '<div class="fb-meta">' + confBadge(it.conf, it.key) +
        (ok ? '<button class="linkbtn" data-act="flagKey" data-arg="' + esc(it.key) + '">خمنت؟ ضيفها للمراجعة</button>' : '') + '</div></div>';
  }
  function mountItem(root) {
    var s = SESS, it = s.items[s.i];
    var el = $('[data-scene]', root);
    if (el) it._ctl = mountScene(el, it, { interactive: it.type === 'sctap', onTap: onSceneTap });
    if (it.type === 'sctap' && !it._ctl) {
      // cannot tap without a scene: skip this item gracefully
      var slot = $('.fb-slot', root);
      if (slot) slot.innerHTML = '<div class="fb fb-bad"><div class="fb-h">' + ic('info') + '<b>المشهد مش جاهز</b></div><p class="fb-x">رح نتخطى هالموقف هلق</p></div>';
      it.answered = true; it.skipped = true;
      var nb = $('.btn-next', root); if (nb) nb.hidden = false;
    }
  }
  function onSceneTap(hit, info) {
    var s = SESS;
    if (!s || s.done) return;
    var it = s.items[s.i];
    if (!it || it.type !== 'sctap' || it.answered) return;
    var id = typeof hit === 'string' || typeof hit === 'number' ? String(hit) : hit && (hit.id || hit.hotspot) ? String(hit.id || hit.hotspot) : '';
    if (!id && info && info.phase === 'intro') return;
    var ok = !!id && it.answer.indexOf(id) >= 0;
    answerCurrent(-1, { ok: ok, id: id });
  }
  function answerCurrent(idx, tap) {
    var s = SESS;
    if (!s || s.done) return;
    var it = s.items[s.i];
    if (!it || it.answered) return;
    if (it.type !== 'sctap' && !(idx >= 0 && idx < it.opts.length)) return;
    var ok = it.type === 'sctap' ? !!(tap && tap.ok) : idx === it.correct;
    it.answered = true; it.pick = idx; it.ok = ok; it.tap = tap ? tap.id : null;
    var km = logAnswer(it.key, ok);
    if (ok) {
      s.ok++; s.km += km; s.combo++;
      if (s.combo > s.best) s.best = s.combo;
      if (s.combo > S.bestCombo) S.bestCombo = s.combo;
      Snd.play('ok');
    } else { s.combo = 0; Snd.play('bad'); }
    var root = mainEl;
    $$('.opt', root).forEach(function (b, i) {
      b.disabled = true;
      if (i === it.correct) b.classList.add('is-ok');
      if (i === idx) b.classList.add('is-sel');
      if (i === idx && !ok) b.classList.add('is-bad');
    });
    var slot = $('.fb-slot', root);
    if (slot) slot.innerHTML = feedbackHTML(it, ok, km, s);
    var cb = $('.combo', root);
    if (cb) { cb.outerHTML = comboHTML(s); cb = $('.combo', root); if (cb && ok && s.combo >= 2) cb.classList.add('bump'); }
    var hint = $('.kbd-hint', root); if (hint) hint.hidden = true;
    var nb = $('.btn-next', root);
    if (nb) { nb.hidden = false; nb.setAttribute('data-primary', '1'); try { nb.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    if (it._ctl) {
      if (it.type === 'sctap') {
        it.answer.forEach(function (h) { safeCall(it._ctl, 'mark', h, 'ok'); });
        if (!ok && tap && tap.id) safeCall(it._ctl, 'mark', tap.id, 'bad');
        safeCall(it._ctl, 'revealHotspots', true);
      }
      safeCall(it._ctl, 'play', 'solution');
    }
    revealFeedback(slot);
    updateHud();
    checkBadges();
  }
  function revealFeedback(slot) {
    if (!slot || !slot.getBoundingClientRect) return;
    var r = slot.getBoundingClientRect(), bar = $('.actbar', mainEl), sb = $('.sbar', mainEl);
    var bottomLimit = W.innerHeight - (bar ? bar.offsetHeight : 0) - 8, topLimit = (sb ? sb.getBoundingClientRect().bottom : 0) + 8;
    var need = r.bottom - bottomLimit;
    if (need <= 0) return;
    var dy = Math.min(need, Math.max(0, r.top - topLimit));
    if (dy > 4) { try { W.scrollBy({ top: dy, behavior: reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { W.scrollBy(0, dy); } }
  }
  ACT.qa = function (a) { answerCurrent(+a); };
  ACT.replay = function () {
    var s = SESS, it = s && s.items[s.i], el = $('.qi-scene', mainEl);
    if (!it || !it._ctl || !el) return;
    var sb = $('.sbar', mainEl), top = el.getBoundingClientRect().top + scrollY() - (sb ? sb.offsetHeight : 0) - 10;
    try { W.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { W.scrollTo(0, Math.max(0, top)); }
    safeCall(it._ctl, 'play', 'solution');
  };
  ACT.qn = function () { nextItem(); };
  function nextItem() {
    var s = SESS;
    if (!s || s.done) return;
    if (!s.items[s.i].answered) return;
    if (s.i + 1 < s.items.length) { s.i++; render(0); }
    else finishSess();
  }
  function finishSess() {
    var s = SESS;
    s.done = true; s.ended = nowMs();
    var answered = s.items.filter(function (it) { return !it.skipped; });
    s.n = answered.length;
    s.acc = s.n ? s.ok / s.n : 0;
    if (s.kind === 'lesson') finishLesson(s);
    else if (s.kind === 'examiner') finishExaminer(s);
    else markActive();
    save(); checkBadges();
    Snd.play(s.failed ? 'fail' : 'done');
    render(0);
  }
  function finishLesson(s) {
    var les = CUR.byId[s.lessonId];
    if (!les) return;
    var acc = s.acc, st = acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : acc >= 0.5 ? 1 : 0, passed = true;
    if (s.challenge) { passed = acc >= s.pass - 1e-9; st = passed ? Math.max(1, st) : 0; }
    s.stars = st; s.passed = passed; s.failed = !passed || st === 0;
    var r = S.lessons[les.id] || { s: 0, best: 0, n: 0 };
    var first = !(r.s >= 1) && st >= 1;
    r.s = Math.max(r.s || 0, st); r.best = Math.max(r.best || 0, acc); r.n = (r.n || 0) + 1; r.d = TODAY;
    if (s.challenge && passed) r.p = 1;
    S.lessons[les.id] = r;
    if (first) { var bonus = s.challenge ? 3 : 2; addKm(bonus); s.km += bonus; s.bonus = bonus; }
    markActive();
    if (S.last && S.last.lesson === les.id && st >= 1) S.last = null;
    var u = CUR.unitOf[les.id];
    if (u && !S.units[u.id] && unitDone(u)) { S.units[u.id] = dayKey(); addKm(5); s.km += 5; s.unitDone = u.id; }
  }
  function statHTML(v, l) { return '<div class="rs"><b class="num">' + v + '</b><span>' + l + '</span></div>'; }
  function missRow(it) {
    var isSign = it.type === 'sign2m' || it.type === 'm2sign' || it.type === 'mk2m';
    var f0 = (it.figs && it.figs[0]) || (it.xfigs && it.xfigs[0]) || '';
    var fig = isSign ? '<span class="miss-fig">' + signSVG(it.id) + '</span>'
      : f0 ? '<span class="miss-fig">' + signSVG(f0) + '</span>'
      : '<span class="miss-fig miss-ic">' + ic(it.type === 'scq' || it.type === 'sctap' ? 'junction' : 'info') + '</span>';
    var right = it.type === 'sctap' ? '<span class="miss-a">' + esc(it.explain || '') + '</span>'
      : it.opts[it.correct] ? '<span class="miss-a">' + ic('check') + '<span>' + esc(it.opts[it.correct].t) + '</span></span>' : '';
    return '<li class="miss-i">' + fig + '<span class="miss-t">' + (isSign ? '' : '<span class="miss-q">' + esc(it.q) + '</span>') + right + '</span></li>';
  }
  function resultHTML(s) {
    if (s.kind === 'examiner') return examinerResultHTML(s);
    var n = s.n, acc = s.acc || 0;
    var miss = s.items.filter(function (it) { return it.answered && !it.ok && !it.skipped; });
    var head, sub, top = '', acts = '';
    if (s.kind === 'lesson') {
      var les = CUR.byId[s.lessonId], nl = nextLesson();
      if (s.challenge) { head = s.passed ? 'عديت التحدي' : 'قربت، جرب كمان مرة'; sub = s.passed ? 'الوحدة صارت بجيبتك' : 'بدك ' + pctTxt(s.pass) + ' لتعدي، وجبت ' + pctTxt(acc); }
      else if (s.stars >= 3) { head = 'درس نظيف'; sub = 'ولا غلطة تقريبا، كمل عالجاي'; }
      else if (s.stars >= 1) { head = 'خلصت الدرس'; sub = miss.length ? 'الأغلاط رح ترجعلك بالمراجعة لحد ما تثبت' : 'كمل عالمحطة الجاية'; }
      else { head = 'الدرس بدو إعادة'; sub = 'جيب 50% أو أكتر لتعدي المحطة'; }
      top = '<div class="res-stars">' + starsHTML(s.stars || 0, 'stars-xl') + '</div>';
      if ((s.stars || 0) >= 1 && nl && (!les || nl.id !== les.id)) acts += '<button class="btn btn-gold btn-lg" data-act="lesson" data-arg="' + esc(nl.id) + '" data-primary="1">' + lessonKindName(nl) + ': ' + esc(nl.title) + ic('next') + '</button>';
      if (les) acts += '<button class="btn' + (acts ? ' btn-ghost' : ' btn-gold btn-lg') + '" data-act="lesson" data-arg="' + esc(les.id) + '"' + (acts ? '' : ' data-primary="1"') + '>' + ic('review') + 'عيد ' + (s.challenge ? 'التحدي' : 'الدرس') + '</button>';
      acts += '<button class="btn btn-ghost" data-act="tab" data-arg="path">' + ic('route') + 'ارجع للمسار</button>';
    } else {
      head = acc >= 0.8 ? 'شغل نظيف' : 'خلصت الجولة';
      sub = miss.length ? 'ضفنا الأغلاط لصناديق المراجعة' : 'كل الأجوبة صح';
      top = '<div class="res-ic">' + ic(s.kind === 'arena' ? 'junction' : 'review') + '</div>';
      var more = s.kind === 'arena' ? '<button class="btn btn-gold btn-lg" data-act="arena" data-arg="' + esc(s.arena) + '" data-primary="1">' + ic('review') + 'جولة كمان</button>'
        : dueKeys().length ? '<button class="btn btn-gold btn-lg" data-act="drill" data-arg="due" data-primary="1">' + ic('cards') + 'كمل المراجعة (' + dueKeys().length + ')</button>' : '';
      acts = more + '<button class="btn' + (more ? ' btn-ghost' : ' btn-gold btn-lg') + '" data-act="back"' + (more ? '' : ' data-primary="1"') + '>' + ic('back') + 'ارجع</button>';
    }
    return '<div class="res">' + top + '<h1 class="res-h">' + head + '</h1><p class="res-p">' + sub + '</p>' +
      '<div class="res-stats">' + statHTML(pct(acc) + '%', 'دقة') + statHTML(s.ok + '/' + n, 'صح') + statHTML(plusKm(s.km), 'كم') + statHTML(s.best, 'أطول سلسلة') + '</div>' +
      (miss.length ? '<section class="sec"><div class="sec-h"><h2>أغلاطك بهالجولة</h2><span class="sec-note">' + nf(miss.length, 'غلطة', 'غلطتين', 'أغلاط') + '</span></div><ul class="miss">' + miss.map(missRow).join('') + '</ul></section>' : '') +
      '<div class="res-acts">' + acts + '</div></div>';
  }
  function digitOf(e) {
    var m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
    if (m) return +m[1];
    var map = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '\u0661': 1, '\u0662': 2, '\u0663': 3, '\u0664': 4, '\u0665': 5, '\u0666': 6 };
    return map[e.key] || 0;
  }
  function clickPrimary() { var b = $('[data-primary]:not([hidden])', mainEl); if (b && !b.disabled) { b.click(); return true; } return false; }
  function playKey(e) {
    var s = SESS;
    if (!s) return false;
    if (s.done) { if (e.key === 'Enter') return clickPrimary(); return false; }
    var it = s.items[s.i], d = digitOf(e);
    if (d && !it.answered && it.opts && d <= it.opts.length) { answerCurrent(d - 1); return true; }
    if ((e.key === 'Enter' || e.key === ' ') && it.answered) { nextItem(); return true; }
    return false;
  }
  SCREENS.play = {
    focus: true,
    tab: function () { return !SESS ? 'home' : SESS.kind === 'lesson' ? 'path' : (SESS.kind === 'arena' || SESS.kind === 'examiner') ? 'arena' : SESS.kind === 'signs' ? 'signs' : 'review'; },
    render: function () { if (!SESS) return noSession(); return SESS.done ? resultHTML(SESS) : playHTML(SESS); },
    mount: function (root) {
      if (!SESS) return;
      if (SESS.done) {
        if (SESS.unitDone && !SESS.celebrated) { SESS.celebrated = true; var u = unitById(SESS.unitDone); setTimeout(function () { celebrate(u); }, 420); }
        return;
      }
      mountItem(root);
    },
    key: playKey
  };

  function goPlay() { go('play', {}, { replace: cur.name === 'play' || cur.name === 'lesson' }); }

  // ------------------------------------------------------------------ signs library
  var LIB = { mode: 'signs', cat: 'all', q: '' };
  function libSource() { return LIB.mode === 'marks' ? IX.markList : IX.signList; }
  function searchText(o) {
    if (o._norm == null) o._norm = ' ' + normAr([o.name, o.meaning, o.text, o.action, String(o.id || '').replace(/-/g, ' ')].join(' ')) + ' ';
    return o._norm;
  }
  function libItems() {
    var q = normAr(LIB.q);
    return libSource().filter(function (o) {
      if (LIB.cat !== 'all' && o.cat !== LIB.cat) return false;
      return !q || searchText(o).indexOf(q) >= 0;
    });
  }
  function libCats() { return LIB.mode === 'marks' ? IX.markCats : IX.signCats; }
  function libGridHTML() {
    var items = libItems(), kind = LIB.mode === 'marks' ? 'mk' : 'sign';
    if (!items.length) return '<div class="empty small">' + ic('search') + '<p>ما لقينا شي بهالكلمة، جرب كلمة تانية</p></div>';
    if (LIB.cat === 'all' && !normAr(LIB.q)) {
      return libCats().map(function (c) {
        var its = items.filter(function (o) { return o.cat === c.key; });
        if (!its.length) return '';
        return '<section class="lib-sec"><h2 class="lib-h">' + esc(c.name) + '<span class="num">' + its.length + '</span></h2>' +
          (c.desc ? '<p class="lib-d">' + esc(c.desc) + '</p>' : '') +
          '<div class="lib-grid">' + its.map(function (o) { return signTile(o, kind); }).join('') + '</div></section>';
      }).join('');
    }
    return '<div class="lib-grid">' + items.map(function (o) { return signTile(o, kind); }).join('') + '</div>';
  }
  function libCountText() {
    var n = libItems().length, kind = LIB.mode === 'marks';
    return kind ? nf(n, 'عنصر', 'عنصرين', 'عناصر') : nf(n, 'إشارة', 'إشارتين', 'إشارات');
  }
  function segTab(mode, label, n) {
    var on = LIB.mode === mode;
    return '<button class="seg-b' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-act="libMode" data-arg="' + mode + '">' + label + ' <span class="num">' + n + '</span></button>';
  }
  function catChip(key, name, n) {
    var on = LIB.cat === key;
    return '<button class="fchip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="libCat" data-arg="' + esc(key) + '">' + esc(name) + '<span class="num">' + n + '</span></button>';
  }
  SCREENS.signs = {
    tab: 'signs',
    render: function () {
      if (!IX.signList.length && !IX.markList.length) {
        return '<div class="scr"><header class="scr-h"><h1>الإشارات</h1></header><div class="empty">' + ic('sign') + '<h2>كتالوج الإشارات قيد التجهيز</h2><p>أول ما يجهز رح تلاقي كل الإشارات هون مع معانيها</p></div></div>';
      }
      if (LIB.mode === 'marks' && !IX.markList.length) LIB.mode = 'signs';
      if (LIB.mode === 'signs' && !IX.signList.length) LIB.mode = 'marks';
      var src = libSource(), kind = LIB.mode === 'marks' ? 'mk' : 'sign';
      var mast = src.filter(function (o) { return boxOf(kind + ':' + o.id) >= 3; }).length;
      var drawnN = src.filter(function (o) { return drawn(o.id); }).length;
      var cats = libCats();
      if (LIB.cat !== 'all' && !cats.some(function (c) { return c.key === LIB.cat; })) LIB.cat = 'all';
      return '<div class="scr scr-signs"><header class="scr-h"><h1>الإشارات</h1><p>' +
          (LIB.mode === 'marks' ? nf(src.length, 'عنصر', 'عنصرين', 'عناصر') : nf(src.length, 'إشارة', 'إشارتين', 'إشارات')) +
          '، حافظ منها <b class="num">' + mast + '</b>' + (drawnN < src.length ? '، والمرسوم لهلق <b class="num">' + drawnN + '</b>' : '') + '</p></header>' +
        (IX.markList.length && IX.signList.length ? '<div class="seg seg-lib" role="tablist">' + segTab('signs', 'الإشارات', IX.signList.length) + segTab('marks', 'العلامات والأضواء', IX.markList.length) + '</div>' : '') +
        '<div class="lib-bar"><label class="search">' + ic('search') + '<input id="lib-q" type="search" data-in="libq" placeholder="دور، مثلا: دوار أو ممنوع" value="' + esc(LIB.q) + '" autocomplete="off" enterkeyhint="search" aria-label="بحث بالإشارات"></label>' +
          '<button class="btn btn-sm" data-act="flashLib">' + ic('cards') + 'بطاقات سريعة</button></div>' +
        '<div class="chips-row">' + catChip('all', 'الكل', src.length) + cats.map(function (c) {
          return catChip(c.key, c.name, src.filter(function (o) { return o.cat === c.key; }).length);
        }).join('') + '</div>' +
        '<p class="lib-count muted small" data-lib-count>' + libCountText() + '</p>' +
        '<div data-lib-grid>' + libGridHTML() + '</div></div>';
    }
  };
  ACT.libMode = function (m) { LIB.mode = m === 'marks' ? 'marks' : 'signs'; LIB.cat = 'all'; rerender(); };
  ACT.libCat = function (c) { LIB.cat = c || 'all'; rerender(); };
  var libSearch = debounce(function () {
    var g = $('[data-lib-grid]', mainEl), c = $('[data-lib-count]', mainEl);
    if (!g) return;
    if (io) { io.disconnect(); io = null; }
    g.innerHTML = libGridHTML();
    if (c) c.textContent = libCountText();
    lazySigns(g);
  }, 140);
  ACT.libq = function (v) { LIB.q = v || ''; libSearch(); };
  ACT.flashLib = function () { startFlash('lib'); };

  function dueText(r) {
    var d = r.d - TODAY;
    return d <= 0 ? 'اليوم' : d === 1 ? 'بكرا' : 'بعد ' + nf(d, 'يوم', 'يومين', 'أيام');
  }
  function statusText(key) {
    var r = S.items[key];
    if (!r) return 'لسا ما تدربت عليها';
    if (r.b >= 3) return 'محفوظة (الصندوق ' + r.b + ')، بترجعلك ' + dueText(r);
    return 'بالصندوق ' + r.b + '، بترجعلك ' + dueText(r);
  }
  function infoSheet(kind, id) {
    var isS = kind === 'sign', map = isS ? IX.signs : IX.marks, o = map[id];
    if (!o) return;
    var key = (isS ? 'sign:' : 'mk:') + id, cat = isS ? IX.catName[o.cat] : IX.mkCatName[o.cat];
    var conf = arr(o.confuse).filter(function (x) { return map[x] && x !== id; }).slice(0, 6);
    var canDrill = drawn(id);
    openSheet('<div class="info"><div class="info-fig' + (drawn(id) ? '' : ' undrawn') + '">' + signSVG(id) + '</div><div class="info-body">' +
      '<div class="info-chips">' + (cat ? chip(esc(cat)) : '') + lvlChip(o.level) + '</div>' +
      '<h2 class="info-t">' + esc(o.name) + '</h2>' +
      (o.text ? '<p class="info-tx">المكتوب عليها: <b>' + esc(o.text) + '</b></p>' : '') +
      '<p class="info-m">' + esc(o.meaning || '') + '</p>' +
      (o.action ? '<div class="lc-do">' + ic('wheel') + '<div><b>شو لازم تعمل</b><p>' + esc(o.action) + '</p></div></div>' : '') +
      (o.uae_note ? '<div class="lc-uae">' + ic('info') + '<div><b>بالإمارات</b><p>' + esc(o.uae_note) + '</p></div></div>' : '') +
      (o.notes ? '<p class="note">' + esc(o.notes) + '</p>' : '') +
      (conf.length ? '<div class="lc-conf"><b>بتنخلط مع</b><div class="minis">' + conf.map(function (x) {
        return '<button class="mini" data-act="' + (isS ? 'signInfo' : 'mkInfo') + '" data-arg="' + esc(x) + '"><span class="mini-img">' + signSVG(x) + '</span><span class="mini-t">' + esc(map[x].name) + '</span></button>';
      }).join('') + '</div></div>' : '') +
      '<p class="info-st">' + ic('review') + '<span>' + statusText(key) + '</span></p>' +
      '<div class="info-meta">' + confBadge(o.confidence, key) + '</div>' +
      '<div class="info-acts">' + (canDrill ? '<button class="btn btn-gold" data-act="drillSign" data-arg="' + esc(key) + '">' + ic('play') + 'تدرب عليها</button>' : '<span class="muted small">رسمة هالإشارة قيد التجهيز</span>') +
        '<button class="btn btn-ghost" data-act="flagKey" data-arg="' + esc(key) + '">' + ic('review') + 'ضيفها للمراجعة</button></div>' +
      '</div></div>');
  }
  ACT.signInfo = function (id) { infoSheet('sign', id); };
  ACT.mkInfo = function (id) { infoSheet('mk', id); };
  ACT.drillSign = function (key) {
    var p = parseKey(key), isS = p.kind === 'sign', map = isS ? IX.signs : IX.marks, o = map[p.id];
    if (!o) return;
    closeSheet();
    var keys = [key].concat(arr(o.confuse).filter(function (x) { return map[x]; }).map(function (x) { return p.kind + ':' + x; }));
    startDrill('keys', keys, o.name);
  };

  // ------------------------------------------------------------------ flashcards
  var FL = null;
  function startFlash(src) {
    var kind = src === 'lib' && LIB.mode === 'marks' ? 'mk' : 'sign';
    var list = src === 'lib' ? libItems() : IX.signList;
    var keys = list.filter(function (o) { return drawn(o.id); }).map(function (o) { return kind + ':' + o.id; });
    if (!keys.length) { toast('الرسومات لهالقسم قيد التجهيز', 'warn'); return; }
    FL = { kind: kind, deck: orderByNeed(keys).slice(0, 20), i: 0, flip: false, yes: 0, no: 0, missed: [], done: false };
    go('flash', {}, { replace: cur.name === 'flash' });
  }
  function flashCardHTML() {
    var k = FL.deck[FL.i], o = objOf(k);
    if (!o) return '';
    return '<button class="fc' + (FL.flip ? ' flipped' : '') + '" data-act="flip" aria-label="اقلب البطاقة"><span class="fc-in">' +
      '<span class="fc-face fc-front"><span class="fc-fig">' + signSVG(o.id) + '</span><span class="fc-q">شو معناها؟</span><span class="fc-hint">دق لتقلبها</span></span>' +
      '<span class="fc-face fc-back"><span class="fc-fig sm">' + signSVG(o.id) + '</span><b class="fc-name">' + esc(o.name) + '</b>' +
        '<span class="fc-mean">' + esc(o.meaning || '') + '</span>' + (o.action ? '<span class="fc-do">' + ic('wheel') + esc(o.action) + '</span>' : '') + '</span>' +
      '</span></button>';
  }
  function flashActs() {
    return FL.flip
      ? '<button class="btn btn-bad-soft" data-act="fcNo">' + ic('close') + 'ما عرفتها</button><button class="btn btn-ok" data-act="fcYes" data-primary="1">' + ic('check') + 'عرفتها</button>'
      : '<span class="kbd-hint">فكر بالمعنى وبعدين اقلب<span class="kbd-only">، <kbd>Space</kbd> للقلب</span></span><button class="btn btn-gold" data-act="flip" data-primary="1">اقلب</button>';
  }
  function flashDoneHTML() {
    var n = FL.deck.length;
    return '<div class="res"><div class="res-ic">' + ic('cards') + '</div><h1 class="res-h">خلصت الدفعة</h1><p class="res-p">اللي ما عرفتها رجعت للصندوق 1 وبتطلعلك بالمراجعة</p>' +
      '<div class="res-stats">' + statHTML(FL.yes, 'عرفتها') + statHTML(FL.no, 'ما عرفتها') + statHTML(n ? pct(FL.yes / n) + '%' : '0%', 'نسبة') + '</div>' +
      (FL.missed.length ? '<section class="sec"><div class="sec-h"><h2>راجع هدول</h2></div><div class="minis minis-wrap">' + FL.missed.map(function (k) {
        var o = objOf(k), p = parseKey(k);
        return o ? '<button class="mini" data-act="' + (p.kind === 'mk' ? 'mkInfo' : 'signInfo') + '" data-arg="' + esc(o.id) + '"><span class="mini-img">' + signSVG(o.id) + '</span><span class="mini-t">' + esc(o.name) + '</span></button>' : '';
      }).join('') + '</div></section>' : '') +
      '<div class="res-acts"><button class="btn btn-gold btn-lg" data-act="flashAgain" data-primary="1">' + ic('cards') + 'دفعة جديدة</button>' +
      '<button class="btn btn-ghost" data-act="back">' + ic('back') + 'ارجع</button></div></div>';
  }
  SCREENS.flash = {
    focus: true, tab: 'signs',
    render: function () {
      if (!FL) return noSession();
      if (FL.done) return flashDoneHTML();
      return '<div class="flash">' + sbar('بطاقات سريعة', FL.i / FL.deck.length, '<span class="sbar-n num">' + (FL.i + 1) + '/' + FL.deck.length + '</span>', 'اقلب واحفظ') +
        '<div class="stage fc-stage">' + flashCardHTML() + '</div>' +
        '<div class="actbar"><div class="actbar-in" data-fc-acts>' + flashActs() + '</div></div></div>';
    },
    key: function (e) {
      if (!FL) return false;
      if (FL.done) { if (e.key === 'Enter') return clickPrimary(); return false; }
      if (e.key === ' ' || e.key === 'Enter') { if (FL.flip && e.key === 'Enter') ACT.fcYes(); else ACT.flip(); return true; }
      var d = digitOf(e);
      if (FL.flip && d === 1) { ACT.fcYes(); return true; }
      if (FL.flip && d === 2) { ACT.fcNo(); return true; }
      return false;
    }
  };
  ACT.flip = function () {
    if (!FL || FL.done) return;
    FL.flip = !FL.flip;
    Snd.play('flip');
    var c = $('.fc', mainEl), a = $('[data-fc-acts]', mainEl);
    if (c) c.classList.toggle('flipped', FL.flip);
    if (a) a.innerHTML = flashActs();
  };
  function flashAnswer(ok) {
    if (!FL || FL.done || !FL.flip) return;
    var k = FL.deck[FL.i];
    logAnswer(k, ok);
    if (ok) { FL.yes++; Snd.play('ok'); } else { FL.no++; FL.missed.push(k); Snd.play('bad'); }
    FL.i++; FL.flip = false;
    if (FL.i >= FL.deck.length) { FL.done = true; markActive(); save(); checkBadges(); Snd.play('done'); }
    render(0);
  }
  ACT.fcYes = function () { flashAnswer(true); };
  ACT.fcNo = function () { flashAnswer(false); };
  ACT.flashAgain = function () {
    var kind = FL ? FL.kind : 'sign';
    var list = kind === 'mk' ? IX.markList : IX.signList;
    var keys = list.filter(function (o) { return drawn(o.id); }).map(function (o) { return kind + ':' + o.id; });
    FL = { kind: kind, deck: orderByNeed(keys).slice(0, 20), i: 0, flip: false, yes: 0, no: 0, missed: [], done: false };
    render(0);
  };

  // ------------------------------------------------------------------ scenarios arena
  var ARENA = [
    { key: 'roundabouts', name: 'الدوارات', icon: 'roundabout', topics: ['roundabouts'] },
    { key: 'junctions', name: 'التقاطعات والأولوية', icon: 'junction', topics: ['priority', 'turning', 'lights', 'police'] },
    { key: 'emergency-vehicles', name: 'سيارات الطوارئ', icon: 'siren', topics: ['emergency-vehicles'] },
    { key: 'school-bus', name: 'باص المدرسة', icon: 'bus', topics: ['school-bus'] },
    { key: 'pedestrians', name: 'المشاة', icon: 'walk', topics: ['pedestrians', 'vulnerable'] },
    { key: 'highway', name: 'الطرق السريعة', icon: 'highway', topics: ['highway', 'lanes', 'overtaking', 'speed', 'distance'] },
    { key: 'hazard', name: 'إدراك المخاطر', icon: 'eye', topics: ['hazard'] },
    { key: 'weather', name: 'الليل والطقس', icon: 'rain', topics: ['weather', 'night', 'lights-horn'] },
    { key: 'parking', name: 'الوقوف والركن', icon: 'parking', topics: ['parking'] },
    { key: 'emergency', name: 'الأعطال والحوادث', icon: 'info', topics: ['emergency', 'accidents'] },
    { key: 'roadtest', name: 'اختبار الطريق', icon: 'wheel', topics: ['roadtest', 'driver'] }
  ];
  function arenaList() {
    var covered = {};
    ARENA.forEach(function (a) { a.topics.forEach(function (t) { covered[t] = 1; }); });
    var extra = uniq(IX.scList.map(function (s) { return s.topic; })).filter(function (t) { return t && !covered[t]; });
    return ARENA.concat(extra.map(function (t) { return { key: 't-' + t, name: topicName(t), icon: 'junction', topics: [t] }; }));
  }
  function arenaByKey(k) { var l = arenaList(); for (var i = 0; i < l.length; i++) if (l[i].key === k) return l[i]; return null; }
  function arenaKeys(a) {
    return {
      sc: IX.scList.filter(function (s) { return a.topics.indexOf(s.topic) >= 0 && forEm(s) && (s.type === 'choice' || scenesOK()); }).map(function (s) { return 'sc:' + s.id; }),
      q: IX.qList.filter(function (q) { return a.topics.indexOf(q.topic) >= 0 && forEm(q); }).map(function (q) { return 'q:' + q.id; })
    };
  }
  function startArena(key) {
    var a = arenaByKey(key);
    if (!a) return;
    // drawn scenes first (that is what this arena is for), then written questions of the same topics
    var k = arenaKeys(a), items = buildSession(k.sc, 10, {});
    if (items.length < 10) items = items.concat(buildSession(k.q, 10 - items.length, {}));
    if (!items.length) { toast('هالنوع من المواقف قيد التجهيز', 'warn'); return; }
    SESS = newSess('arena', { title: a.name, items: items, arena: key });
    goPlay();
  }
  function startExaminer() {
    var sc = IX.scList.filter(function (s) { return forEm(s) && (s.type === 'choice' || scenesOK()); }).map(function (s) { return 'sc:' + s.id; });
    var items = buildSession(sc, 12, { random: true });
    if (items.length < 12) {
      var q = IX.qList.filter(function (x) { return ROAD_TOPICS.indexOf(x.topic) >= 0 && forEm(x); }).map(function (x) { return 'q:' + x.id; });
      items = items.concat(buildSession(q, 12 - items.length, { random: true }));
    }
    if (!items.length) { toast('المواقف قيد التجهيز', 'warn'); return; }
    SESS = newSess('examiner', { title: 'جولة الفاحص', items: shuffle(items) });
    goPlay();
  }
  ACT.arena = function (k) { startArena(k); };
  ACT.examiner = function () { startExaminer(); };
  ACT.examinerAgain = function () { startExaminer(); };
  function finishExaminer(s) {
    var crit = 0, minor = 0;
    s.items.forEach(function (it) { if (it.skipped || !it.answered || it.ok) return; if (it.sev === 'critical') crit++; else minor++; });
    s.crit = crit; s.minor = minor; s.score = Math.max(0, 100 - 10 * minor);
    s.passed = !crit && s.score >= 70; s.failed = !s.passed;
    S.road.unshift({ at: nowMs(), score: s.score, passed: s.passed, crit: crit, minor: minor, n: s.n });
    if (S.road.length > 20) S.road.length = 20;
    if (s.passed) { addKm(5); s.km += 5; }
    markActive();
  }
  function examinerResultHTML(s) {
    var rows = s.items.filter(function (it) { return !it.skipped; }).map(function (it, i) {
      var st = it.ok ? 'ok' : it.sev === 'critical' ? 'crit' : 'minor';
      return '<li class="xr ' + st + '"><span class="xr-n num">' + (i + 1) + '</span><span class="xr-t"><b>' + esc(it.tag) + '</b><small>' + esc(it.q) + '</small></span>' +
        '<span class="xr-s">' + (st === 'ok' ? ic('check') + 'تمام' : st === 'crit' ? ic('flag') + 'خطأ قاتل' : ic('info') + 'خطأ بسيط') + '</span></li>';
    }).join('');
    var miss = s.items.filter(function (it) { return it.answered && !it.ok && !it.skipped; });
    return '<div class="res res-exr"><div class="paper"><div class="paper-h"><div class="paper-id"><b>ورقة الفاحص</b><span>' + fmtDate(new Date()) + '</span></div>' +
        '<div class="stamp ' + (s.passed ? 'ok' : 'bad') + '">' + (s.passed ? 'ناجح' : 'راسب') + '</div></div>' +
        '<div class="paper-score"><b class="num">' + s.score + '</b><span>من 100</span></div>' +
        '<div class="paper-sum"><span class="crit">' + ic('flag') + 'أخطاء قاتلة <b class="num">' + s.crit + '</b></span><span class="minor">' + ic('info') + 'أخطاء بسيطة <b class="num">' + s.minor + '</b></span></div>' +
        '<ol class="xrs">' + rows + '</ol>' +
        '<p class="paper-rule">أي خطأ قاتل (قطع إشارة، عدم إعطاء أولوية، خطر على المشاة) يعني رسوب، وكل خطأ بسيط بينقص 10 نقاط، والنجاح من 70</p></div>' +
      (miss.length ? '<section class="sec"><div class="sec-h"><h2>شو كان الصح</h2></div><ul class="miss">' + miss.map(missRow).join('') + '</ul></section>' : '') +
      '<div class="res-acts"><button class="btn btn-gold btn-lg" data-act="examinerAgain" data-primary="1">' + ic('wheel') + 'جولة جديدة</button>' +
      '<button class="btn btn-ghost" data-act="back">' + ic('back') + 'ارجع</button></div></div>';
  }
  function guideFor(kind) {
    var ex = DATA.exams || {}, g = null;
    arr(ex.guides).forEach(function (x) { if (!g && x && (x.kind === kind || String(x.id || '').indexOf(kind) >= 0)) g = x; });
    if (!g && isObj(ex.guides) && isObj(ex.guides[kind])) g = ex.guides[kind];
    if (!g && isObj(ex[kind])) g = ex[kind];
    return g;
  }
  function guideLi(x) {
    if (typeof x === 'string') return '<li>' + esc(x) + '</li>';
    if (!isObj(x)) return '';
    var t = x.title || x.name || x.step || '', b = x.body || x.text || x.desc || x.detail || '';
    return '<li>' + (t ? '<b>' + esc(t) + '</b>' : '') + (b ? '<span>' + esc(b) + '</span>' : '') + '</li>';
  }
  function guideHTML(g, open) {
    if (!g) return '';
    var steps = arr(g.steps || g.items), tips = arr(g.tips), fails = arr(g.mistakes || g.fails || g.fail || g.criticals);
    return '<details class="guide"' + (open ? ' open' : '') + '><summary>' + ic('list') + '<span>' + esc(g.title || 'شو بيصير بالاختبار') + '</span></summary><div class="guide-b">' +
      (g.intro || g.body || g.desc ? '<p>' + esc(g.intro || g.body || g.desc) + '</p>' : '') +
      (steps.length ? '<ol>' + steps.map(guideLi).join('') + '</ol>' : '') +
      (fails.length ? '<h4>أخطاء بترسب</h4><ul>' + fails.map(guideLi).join('') + '</ul>' : '') +
      (tips.length ? '<h4>نصائح</h4><ul>' + tips.map(guideLi).join('') + '</ul>' : '') +
      (g.notes ? '<p class="note">' + esc(g.notes) + '</p>' : '') + '</div></details>';
  }
  SCREENS.arena = {
    tab: 'arena',
    render: function () {
      var last = S.road[0];
      var h = '<div class="scr scr-arena"><header class="scr-h"><h1>مواقف</h1><p>مواقف حقيقية من الطريق، اختار نوع والعب 10 مواقف</p></header>';
      if (!scenesOK()) h += '<p class="banner soft">' + ic('info') + '<span>المشاهد المرسومة قيد التجهيز، ولهلق منتدرب بأسئلة المواقف المكتوبة</span></p>';
      h += '<section class="exr-card"><div class="exr-ic">' + ic('wheel') + '</div><div class="exr-tx"><h2>جولة الفاحص</h2>' +
        '<p>12 موقف مخلوط كأنك باختبار الطريق: الخطأ القاتل برسبك، والبسيط بينقص علامتك</p>' +
        (last ? '<p class="exr-last">آخر جولة: <b class="' + (last.passed ? 'ok' : 'bad') + '">' + (last.passed ? 'ناجح' : 'راسب') + '</b> <span class="num">' + last.score + '/100</span></p>' : '') +
        '</div><button class="btn btn-gold" data-act="examiner">' + ic('play') + 'ابدأ الجولة</button></section>';
      h += '<div class="arena-grid">' + arenaList().map(function (a) {
        var k = arenaKeys(a), all = k.sc.concat(k.q), n = all.length;
        var m = all.filter(function (x) { return boxOf(x) >= 3; }).length;
        var sub = k.sc.length ? nf(k.sc.length, 'موقف', 'موقفين', 'مواقف') + (k.q.length ? ' و' + nf(k.q.length, 'سؤال', 'سؤالين', 'أسئلة') : '') :
          k.q.length ? nf(k.q.length, 'سؤال', 'سؤالين', 'أسئلة') : 'قيد التجهيز';
        return '<button class="at' + (n ? '' : ' soon') + '" data-act="arena" data-arg="' + esc(a.key) + '">' + '<span class="at-ic">' + ic(a.icon) + '</span>' +
          '<span class="at-t">' + esc(a.name) + '</span><span class="at-s">' + sub + '</span>' + (n ? laneBar(m / n, 'lane-sm') : '') + '</button>';
      }).join('') + '</div>';
      h += guideHTML(guideFor('road')) + roadGuideHTML();
      return h + '</div>';
    }
  };

  // ------------------------------------------------------------------ yard
  function yardList() {
    var ex = null;
    try { ex = W.Yard && W.Yard.exercises; } catch (e) { ex = null; }
    if (!ex) return [];
    if (!Array.isArray(ex)) {
      ex = Object.keys(ex).map(function (k) { var v = ex[k]; return isObj(v) ? Object.assign({ id: k }, v) : { id: k, title: String(v) }; });
    }
    return ex.filter(function (e) { return e && e.id; }).map(function (e) {
      return { id: String(e.id), title: e.title || e.name || String(e.id), desc: e.desc || e.description || e.summary || '',
        em: normEm(e.emirates || e.emirate || e.exam || 'both'), level: e.level, raw: e };
    });
  }
  // free practice areas have no pass criterion: keep them out of readiness and test mode
  function isFreeYard(e) { var r = (e && e.raw) || {}; return e.id === 'free' || r.free === true || r.practice === true || r.scored === false; }
  function yardChip(id) {
    var r = S.yard[id];
    if (!r) return chip('جديد');
    if (r.pass) return chip(ic('check') + 'نجحت بالامتحان', 'chip-ok');
    if (r.last && r.last.mode === 'test') return chip('آخر محاولة: ' + (r.best || 0), 'chip-bad');
    return chip('تدربت عليه', 'chip-gold');
  }
  SCREENS.yard = {
    tab: 'yard',
    render: function () {
      var ok = yardOK(), list = ok ? yardList() : [];
      var h = '<div class="scr scr-yard"><header class="scr-h"><h1>الساحة</h1><p>التحكم بالسيارة والباركنج بسرعة بطيئة، متل اختبار الساحة بالمعهد</p></header>';
      h += guideHTML(guideFor('yard'));
      var guides = yardGuides();
      if (!list.length) {
        h += '<div class="pending-card">' + ic('cone') + '<h2>محاكي الساحة قيد التجهيز</h2><p>لحد ما يجهز، اقرأ خطوات كل تمرين وتدرب على أسئلة الساحة</p>' +
          '<button class="btn btn-gold" data-act="drill" data-arg="yard">' + ic('play') + 'أسئلة الساحة</button></div>';
        if (guides.length) h += '<section class="sec"><div class="sec-h"><h2>خطوات التمارين</h2><span class="sec-note">' + nf(guides.length, 'تمرين', 'تمرينين', 'تمارين') + '</span></div><div class="guides">' +
          guides.map(function (g) { return yardGuideCard(g, false); }).join('') + '</div></section>';
        return h + '<button class="set-link" data-act="go" data-arg="journey">' + ic('route') + '<span>مشوار الرخصة خطوة بخطوة</span>' + ic('next') + '</button></div>';
      }
      // official test exercises first (grouped by emirate), then practice-only extras that are not in the real test
      var official = list.filter(function (e) { return !isFreeYard(e); }), extras = list.filter(isFreeYard);
      var groups = [['both', 'بامتحان دبي والشارقة'], ['dubai', 'بامتحان دبي بس'], ['sharjah', 'بامتحان الشارقة بس']];
      function yxSec(title, note, its) {
        return '<section class="sec"><div class="sec-h"><h2>' + title + '</h2><span class="sec-note">' + nf(its.length, 'تمرين', 'تمرينين', 'تمارين') + '</span></div>' +
          (note ? '<p class="sec-sub">' + note + '</p>' : '') + '<div class="yx-list">' + its.map(yxCard).join('') + '</div></section>';
      }
      groups.forEach(function (g) {
        var its = official.filter(function (e) { return e.em === g[0]; });
        if (its.length) h += yxSec(g[1], '', its);
      });
      if (extras.length) h += yxSec('تمارين إضافية', 'مش من الامتحان الرسمي، بس بتقوي تحكمك بالسيارة', extras);
      function yxCard(e) {
        var g = yardGuideFor(e.id);
        return '<article class="yx"><div class="yx-h"><h3>' + esc(e.title) + '</h3>' + (isFreeYard(e) ? '' : yardChip(e.id)) + '</div>' + (e.desc ? '<p>' + esc(e.desc) + '</p>' : '') +
          (g ? '<details class="guide guide-in"><summary>' + ic('list') + '<span>الخطوات</span></summary>' + yardGuideBody(g) + '</details>' : '') +
          (isFreeYard(e) ? '<div class="yx-acts"><button class="btn btn-gold btn-sm" data-act="yardGo" data-arg="' + esc(e.id) + '|learn">' + ic('play') + (e.id === 'free' ? 'تدرب بحرية' : 'تدرب') + '</button></div></article>'
          : '<div class="yx-acts"><button class="btn btn-ghost btn-sm" data-act="yardGo" data-arg="' + esc(e.id) + '|learn">' + ic('play') + 'تعلم</button>' +
          '<button class="btn btn-gold btn-sm" data-act="yardGo" data-arg="' + esc(e.id) + '|test">' + ic('exam') + 'امتحني</button></div></article>');
      }
      return h + '<button class="set-link" data-act="drill" data-arg="yard">' + ic('list') + '<span>أسئلة عن اختبار الساحة</span>' + ic('next') + '</button></div>';
    }
  };
  ACT.yardGo = function (a) { var p = String(a).split('|'); go('yardRun', { id: p[0], mode: p[1] === 'test' ? 'test' : 'learn' }); };
  function yardModeBtn(m, label, curm) {
    var on = m === curm;
    return '<button class="seg-b' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="yardMode" data-arg="' + m + '">' + label + '</button>';
  }
  function pendingYard(msg) {
    return '<div class="pending">' + ic('cone') + '<b>' + (msg || 'محاكي الساحة قيد التجهيز') + '</b><span>ارجع للساحة وتدرب على الأسئلة لهلق</span></div>';
  }
  var YCTL = null;
  SCREENS.yardRun = {
    focus: true, tab: 'yard',
    render: function (p) {
      var ex = yardList().filter(function (e) { return e.id === p.id; })[0], mode = p.mode === 'test' ? 'test' : 'learn';
      var free = ex && isFreeYard(ex);
      return '<div class="yardrun">' + sbar(ex ? ex.title : 'تمرين الساحة', 0,
          free ? '' : '<div class="seg seg-sm" role="radiogroup" aria-label="الوضع">' + yardModeBtn('learn', 'تعلم', mode) + yardModeBtn('test', 'امتحان', mode) + '</div>',
          free ? 'تدريب حر' : mode === 'test' ? 'وضع الامتحان' : 'وضع التعلم') +
        '<div class="yard-stage" data-yard></div><div class="yard-res" aria-live="polite"></div>' +
        (yardGuideFor(p.id) ? '<div class="yard-guide">' + yardGuideCard(yardGuideFor(p.id), false) + '</div>' : '') + '</div>';
    },
    mount: function (root, p) {
      var el = $('[data-yard]', root);
      if (!el) return;
      if (!yardOK()) { el.innerHTML = pendingYard(); return; }
      var ex = yardList().filter(function (e) { return e.id === p.id; })[0];
      if (!ex) { el.innerHTML = pendingYard('هالتمرين لسا مش موجود بالمحاكي'); return; }
      try {
        var em = S.profile.emirate;
        var ctl = W.Yard.mount(el, { exercise: p.id, mode: p.mode === 'test' ? 'test' : 'learn', reducedMotion: reducedMotion(),
          sound: !!S.profile.sound, emirate: em === 'dubai' || em === 'sharjah' ? em : undefined,
          onFinish: function (res) { yardFinished(p, res); } });
        track(ctl); YCTL = ctl;
      } catch (e) { warn('yard mount failed', e); el.innerHTML = pendingYard(); }
    }
  };
  ACT.yardMode = function (m) { cur.params.mode = m === 'test' ? 'test' : 'learn'; rerender(); };
  ACT.yardAgain = function () { rerender(); };
  function yardFinished(p, res) {
    if (cur.name !== 'yardRun') return;
    res = isObj(res) ? res : {};
    var mode = res.mode === 'test' || res.mode === 'learn' ? res.mode : (p.mode === 'test' ? 'test' : 'learn');
    if (res.exercise && yardList().some(function (e) { return e.id === String(res.exercise); })) p = { id: String(res.exercise), mode: mode, lesson: p.lesson };
    var passed = !!(res.passed || res.pass || res.success || res.ok === true);
    var score = Math.round(clamp(num(res.score != null ? res.score : res.points, passed ? 100 : 0), 0, 100));
    var r = S.yard[p.id] || { best: 0, pass: false, tries: 0, learn: false };
    r.tries = (r.tries || 0) + 1; r.d = TODAY; r.last = { mode: mode, passed: passed, score: score, at: nowMs() };
    if (mode === 'test') { if (passed) r.pass = true; r.best = Math.max(r.best || 0, score); } else r.learn = true;
    S.yard[p.id] = r;
    markActive();
    addKm(mode === 'test' && passed ? 3 : 1);
    var unitNow = null;
    if (p.lesson && CUR.byId[p.lesson]) {
      var lr = S.lessons[p.lesson] || { s: 0, best: 0, n: 0 };
      lr.s = Math.max(lr.s || 0, mode === 'test' && passed ? 3 : 1); lr.n = (lr.n || 0) + 1; lr.d = TODAY; lr.best = Math.max(lr.best || 0, score / 100);
      S.lessons[p.lesson] = lr;
      if (S.last && S.last.lesson === p.lesson) S.last = null;
      var u = CUR.unitOf[p.lesson];
      if (u && !S.units[u.id] && unitDone(u)) { S.units[u.id] = dayKey(); addKm(5); unitNow = u; }
    }
    save(); checkBadges();
    Snd.play(mode === 'test' && !passed ? 'fail' : 'done');
    // the simulator shows its own detailed result; this line only confirms what we saved
    var slot = $('.yard-res', mainEl);
    if (slot) {
      slot.innerHTML = '<div class="yres ' + (mode === 'test' && !passed ? 'bad' : 'ok') + '"><div class="yres-h">' + ic(mode === 'test' && !passed ? 'flag' : 'check') +
        '<b>' + (mode === 'test' ? (passed ? 'حفظنا نجاحك بالتمرين' : 'حفظنا محاولتك، جرب كمان مرة') : 'حفظنا إنك خلصت التمرين') + '</b>' +
        (mode === 'test' ? '<span class="num">' + score + '/100</span>' : '') + '</div>' +
        '<div class="yres-acts"><button class="btn btn-ghost btn-sm" data-act="back">' + ic('back') + 'ارجع للساحة</button></div></div>';
    }
    if (unitNow) setTimeout(function () { celebrate(unitNow); }, 500);
  }

  SCREENS.yardGuide = {
    focus: true, tab: 'yard',
    render: function (p) {
      var g = yardGuideFor(p.id), les = CUR.byId[p.lesson];
      if (!g) return noSession();
      return '<div class="lesson">' + sbar(les ? les.title : (g.name || 'تمرين الساحة'), 1, '', 'خطوات التمرين') +
        '<div class="stage"><article class="lc lc-note"><span class="chip chip-gold">' + ic('cone') + 'الساحة</span><h2 class="lc-title">' + esc(g.name || g.title || '') + '</h2>' +
          yardGuideBody(g) + '</article>' +
          '<p class="banner soft">' + ic('info') + '<span>محاكي الساحة قيد التجهيز، اقرأ الخطوات وتخيلها، وجرب أسئلة الساحة</span></p></div>' +
        '<div class="actbar"><div class="actbar-in"><button class="btn btn-ghost" data-act="drill" data-arg="yard">' + ic('list') + 'أسئلة الساحة</button>' +
          '<button class="btn btn-gold" data-act="yardGuideDone" data-arg="' + esc(p.lesson || '') + '" data-primary="1">' + ic('check') + 'قريتها وفهمتها</button></div></div></div>';
    },
    key: function (e) { if (e.key === 'Enter') return clickPrimary(); return false; }
  };
  ACT.yardGuideDone = function (lid) {
    var les = CUR.byId[lid];
    if (!les) { back(); return; }
    finishLearnOnly(les, 'خلصت خطوات التمرين، وبس يجهز المحاكي جربه بإيدك');
  };

  // ------------------------------------------------------------------ licence journey (from exams.json emirates)
  var JR = { em: '' };
  function emData(em) { var e = (DATA.exams || {}).emirates; return isObj(e) && isObj(e[em]) ? e[em] : null; }
  function jrEm() {
    if (JR.em && emData(JR.em)) return JR.em;
    var p = S.profile.emirate;
    return p !== 'both' && emData(p) ? p : emData('dubai') ? 'dubai' : emData('sharjah') ? 'sharjah' : '';
  }
  function exConf(o) { return o && (o.src || o.confidence) ? confBadge(o.confidence, exRef(o)) : ''; }
  function failList(a) { a = arr(a); return a.length ? '<ul class="jfail">' + a.map(function (x) { return '<li>' + ic('flag') + '<span>' + esc(typeof x === 'string' ? x : (x.text || x.title || '')) + '</span></li>'; }).join('') + '</ul>' : ''; }
  SCREENS.journey = {
    tab: 'exam',
    render: function () {
      var em = jrEm(), d = emData(em);
      var h = '<div class="scr scr-jr"><header class="scr-h"><h1>مشوار الرخصة</h1><p>من فتح الملف لاستلام الرخصة، خطوة بخطوة حسب إمارتك</p></header>';
      if (!d) return h + '<div class="empty">' + ic('route') + '<h2>تفاصيل المشوار قيد التجهيز</h2></div></div>';
      if (emData('dubai') && emData('sharjah')) {
        h += '<div class="seg" role="radiogroup" aria-label="الإمارة">' + ['dubai', 'sharjah'].map(function (x) {
          return '<button class="seg-b' + (x === em ? ' on' : '') + '" role="radio" aria-checked="' + (x === em) + '" data-act="jrEm" data-arg="' + x + '">' + emName(x) + '</button>';
        }).join('') + '</div>';
      }
      if (d.authority) h += '<p class="jr-auth">' + ic('shield') + '<span>الجهة المسؤولة: <b>' + esc(d.authority) + '</b></span></p>';
      var steps = arr(d.process);
      if (steps.length) {
        h += '<section class="sec"><div class="sec-h"><h2>الخطوات</h2><span class="sec-note">' + nf(steps.length, 'خطوة', 'خطوتين', 'خطوات') + '</span></div><ol class="jr">' +
          steps.map(function (st, i) {
            return '<li class="jr-i"><span class="jr-n num">' + esc(st.step || i + 1) + '</span><div class="jr-b"><b>' + esc(st.title || '') + '</b><p>' + nl2br(esc(st.desc || '')) + '</p>' + exConf(st) + '</div></li>';
          }).join('') + '</ol></section>';
      }
      var th = d.theory;
      if (isObj(th)) {
        h += '<section class="jcard"><h2>' + ic('exam') + esc(th.name || 'الامتحان النظري') + '</h2>' +
          '<div class="preset-stats">' + (th.questions ? '<span><b class="num">' + th.questions + '</b>سؤال</span>' : '') + (th.minutes ? '<span><b class="num">' + th.minutes + '</b>دقيقة</span>' : '') +
          (th.pass ? '<span><b class="num">' + th.pass + '</b>صح للنجاح</span>' : '') + '</div>' +
          arr(th.sections).map(function (x) { return '<div class="jrow"><b>' + esc(x.name || '') + (x.count ? ' <span class="num">(' + x.count + ')</span>' : '') + '</b><p>' + esc(x.desc || '') + '</p></div>'; }).join('') +
          (th.notes || th.note ? '<p class="note">' + esc(th.notes || th.note) + '</p>' : '') + exConf(th) +
          '<button class="btn btn-gold" data-act="tab" data-arg="exam">' + ic('play') + 'جرب امتحان تجريبي</button></section>';
      }
      var yd = d.yard;
      if (isObj(yd)) {
        h += '<section class="jcard"><h2>' + ic('cone') + esc(yd.name || 'اختبار الساحة') + '</h2>' + (yd.desc ? '<p class="muted">' + esc(yd.desc) + '</p>' : '') +
          arr(yd.components).map(function (c) { return '<div class="jrow"><b>' + esc(c.name || '') + '</b><p>' + esc(c.desc || '') + '</p>' + failList(c.fail) + '</div>'; }).join('') + exConf(yd) +
          '<button class="btn" data-act="tab" data-arg="yard">' + ic('cone') + 'روح للساحة</button></section>';
      }
      var rd = d.road;
      if (isObj(rd)) {
        h += '<section class="jcard"><h2>' + ic('wheel') + esc(rd.name || 'اختبار الطريق') + '</h2>' + (rd.duration ? '<p class="muted">' + ic('clock') + ' ' + esc(rd.duration) + '</p>' : '') +
          arr(rd.checks).map(function (c) { return '<div class="jrow"><b>' + esc(c.title || '') + '</b><p>' + esc(c.desc || '') + '</p></div>'; }).join('') + failList(rd.fail || rd.critical) + exConf(rd) +
          '<button class="btn" data-act="examiner">' + ic('wheel') + 'جرب جولة الفاحص</button></section>';
      }
      var sp = arr(d.specific);
      if (sp.length) {
        h += '<section class="sec"><div class="sec-h"><h2>خاص ب' + esc(d.name || emName(em)) + '</h2></div><ul class="jnotes">' + sp.map(function (x) {
          return '<li><b>' + esc(x.title || '') + '</b><p>' + nl2br(esc(x.desc || '')) + '</p>' + exConf(x) + '</li>';
        }).join('') + '</ul></section>';
      }
      return h + '<p class="muted small">المعلومات من المصادر الرسمية والمعاهد وقت تجهيز مقود، والإجراءات ممكن تتغير، فتأكد دايما من معهدك</p></div>';
    }
  };
  ACT.jrEm = function (em) { JR.em = em; rerender(); };
  function yardGuides() { return arr((DATA.exams || {}).yard_guides).filter(function (g) { return isObj(g) && g.id; }); }
  function yardGuideFor(id) { var g = yardGuides().filter(function (x) { return x.id === id; })[0]; return g || null; }
  function yardGuideBody(g) {
    return '<div class="guide-b">' + (g.goal ? '<p>' + nl2br(esc(g.goal)) + '</p>' : '') +
      (arr(g.steps).length ? '<ol>' + arr(g.steps).map(function (st) {
        if (typeof st === 'string') return '<li>' + esc(st) + '</li>';
        return '<li><b>' + esc(st.text || st.title || '') + '</b>' + (st.ref ? '<span>' + esc(st.ref) + '</span>' : '') + '</li>';
      }).join('') + '</ol>' : '') +
      (arr(g.mistakes).length ? '<h4>أخطاء شائعة</h4><ul>' + arr(g.mistakes).map(guideLi).join('') + '</ul>' : '') +
      (arr(g.fail).length ? '<h4>بترسبك مباشرة</h4>' + failList(g.fail) : '') + exConf(g) + '</div>';
  }
  function yardGuideCard(g, open) {
    return '<details class="guide"' + (open ? ' open' : '') + '><summary>' + ic('cone') + '<span>' + esc(g.name || g.title || g.id) + '</span></summary>' + yardGuideBody(g) + '</details>';
  }
  function roadGuideHTML() {
    var rg = arr((DATA.exams || {}).road_guide).filter(isObj);
    if (!rg.length) return '';
    return '<section class="sec"><div class="sec-h"><h2>دليل اختبار الطريق</h2><span class="sec-note">' + nf(rg.length, 'قسم', 'قسمين', 'أقسام') + '</span></div><div class="guides">' +
      rg.map(function (r) {
        return '<details class="guide"><summary>' + ic('wheel') + '<span>' + esc(r.title || r.id) + '</span></summary><div class="guide-b">' +
          (arr(r.points).length ? '<ol>' + arr(r.points).map(guideLi).join('') + '</ol>' : '') +
          (arr(r.critical).length ? '<h4>خطأ قاتل</h4>' + failList(r.critical) : '') + exConf(r) + '</div></details>';
      }).join('') + '</div></section>';
  }

  // ------------------------------------------------------------------ mock exams
  var DEFAULT_PRESETS = [
    { id: 'dubai-default', emirate: 'dubai', title: 'امتحان النظري: دبي', subtitle: 'أرقام تقريبية، تأكد منها مع معهدك', count: 35, minutes: 30, pass: 0.86,
      mix: { signs: 0.35, markings: 0.1, questions: 0.45, scenarios: 0.1 } },
    { id: 'sharjah-default', emirate: 'sharjah', title: 'اختبار الإشارات: الشارقة', subtitle: 'أرقام تقريبية، تأكد منها مع معهدك', count: 30, minutes: 30, pass: 0.8,
      mix: { signs: 0.5, markings: 0.1, questions: 0.4 } }
  ];
  function pickNum() { for (var i = 0; i < arguments.length; i++) { var v = arguments[i]; if (v != null && v !== '' && isFinite(+v)) return +v; } return null; }
  function normPass(p, count) {
    var ratio = pickNum(p.pass_ratio, p.passRatio);
    if (ratio != null && ratio > 0 && ratio <= 1) return ratio;
    if (p.passCount != null && isFinite(+p.passCount)) return clamp(+p.passCount / count, 0.05, 1);
    if (p.passPct != null && isFinite(+p.passPct)) return clamp(+p.passPct > 1 ? +p.passPct / 100 : +p.passPct, 0.05, 1);
    var v = pickNum(p.pass, p.passMark, p.pass_mark);
    if (v == null) return 0.8;
    if (v > 0 && v <= 1) return v;
    if (v > 1 && v <= count) return v / count;
    if (v > 1 && v <= 100) return v / 100;
    return 0.8;
  }
  function normPreset(p, i) {
    var count = Math.round(clamp(pickNum(p.count, p.questions, p.n, p.total, p.questionCount) || 30, 1, 200));
    var minutes = clamp(pickNum(p.minutes, p.duration, p.time, p.durationMin, p.timeMin) || 30, 1, 240);
    return { id: String(p.id || 'preset-' + i), title: p.title || p.name || 'امتحان تجريبي', subtitle: p.subtitle || p.desc || '',
      count: count, minutes: minutes, pass: normPass(p, count), em: normEm(p.emirate || p.emirates || p.exam || 'both'),
      hazard: Math.round(clamp(pickNum(p.hazard, p.hazardCount) || 0, 0, count)),
      mix: p.mix, notes: p.notes || p.note || '', conf: p.confidence || '', raw: p };
  }
  function presets() {
    var ps = arr((DATA.exams || {}).presets).filter(function (p) { return isObj(p); });
    if (!ps.length) ps = DEFAULT_PRESETS;
    return ps.map(normPreset);
  }
  var MIX_TYPES = { signs: 'signs', sign: 'signs', markings: 'markings', marking: 'markings', mk: 'markings', lights: 'markings',
    questions: 'questions', question: 'questions', q: 'questions', theory: 'questions', rules: 'questions', text: 'questions',
    scenarios: 'scenarios', scenario: 'scenarios', sc: 'scenarios', situations: 'scenarios',
    hazard: 'hazard', hazards: 'hazard', 'hazard-perception': 'hazard' };
  function normMix(mix, count) {
    var parts = [];
    if (Array.isArray(mix)) {
      mix.forEach(function (m) {
        if (!isObj(m)) return;
        var t = MIX_TYPES[m.type || m.kind || m.source] || (m.topics || m.banks ? 'questions' : m.cats ? 'signs' : null);
        var w = pickNum(m.count, m.n, m.share, m.weight, m.pct);
        if (t && w > 0) parts.push({ type: t, w: w, f: m });
      });
    } else if (isObj(mix)) {
      Object.keys(mix).forEach(function (k) {
        var v = mix[k], w = isObj(v) ? pickNum(v.count, v.n, v.share, v.weight) : pickNum(v);
        if (!(w > 0)) return;
        if (MIX_TYPES[k]) parts.push({ type: MIX_TYPES[k], w: w, f: isObj(v) ? v : {} });
        else if (TOPICS[k]) parts.push({ type: 'questions', w: w, f: { topics: [k] } });
      });
    }
    if (!parts.length) parts = [{ type: 'signs', w: 0.4, f: {} }, { type: 'markings', w: 0.1, f: {} }, { type: 'questions', w: 0.5, f: {} }];
    var tot = sum(parts.map(function (p) { return p.w; }));
    var raw = parts.map(function (p) { return p.w / tot * count; }), base = raw.map(Math.floor), left = count - sum(base);
    var order = raw.map(function (r, i) { return [r - base[i], i]; }).sort(function (a, b) { return b[0] - a[0]; });
    for (var i = 0; i < left; i++) base[order[i % order.length][1]]++;
    return parts.map(function (p, i) { return { type: p.type, n: base[i], f: p.f }; });
  }
  function examPool(type, f, em) {
    var ems = em === 'both' ? ['dubai', 'sharjah'] : [em], cats = arr(f.cats), topics = arr(f.topics), banks = arr(f.banks);
    if (type === 'hazard') {
      // hazard perception: drawn hazard scenarios first, then written hazard questions
      return shuffle(IX.scList.filter(function (s) { return s.type === 'choice' && s.topic === 'hazard' && forEm(s, ems); }).map(function (s) { return 'sc:' + s.id; }))
        .concat(shuffle(IX.qList.filter(function (q) { return q.topic === 'hazard' && forEm(q, ems); }).map(function (q) { return 'q:' + q.id; })));
    }
    if (type === 'signs') return IX.signList.filter(function (s) { return drawn(s.id) && (!cats.length || cats.indexOf(s.cat) >= 0) && lvlOK(s, f); }).map(function (s) { return 'sign:' + s.id; });
    if (type === 'markings') return IX.markList.filter(function (m) { return drawn(m.id) && (!cats.length || cats.indexOf(m.cat) >= 0) && lvlOK(m, f); }).map(function (m) { return 'mk:' + m.id; });
    if (type === 'scenarios') return IX.scList.filter(function (s) { return s.type === 'choice' && forEm(s, ems) && (!topics.length || topics.indexOf(s.topic) >= 0) && lvlOK(s, f); }).map(function (s) { return 'sc:' + s.id; });
    return IX.qList.filter(function (q) {
      if (!forEm(q, ems) || !lvlOK(q, f)) return false;
      if (banks.length && banks.indexOf(q._bank) < 0) return false;
      if (topics.length) return topics.indexOf(q.topic) >= 0;
      return !TH_EXCL[q.topic];
    }).map(function (q) { return 'q:' + q.id; });
  }
  function buildExamItems(p) {
    var used = {}, keys = [], hz = Math.min(p.hazard || 0, p.count);
    var parts = normMix(p.mix, p.count - hz);
    if (hz) parts.push({ type: 'hazard', n: hz, f: {} });
    parts.forEach(function (m) {
      var got = 0, pool = examPool(m.type, m.f, p.em);
      (m.type === 'hazard' ? pool : shuffle(pool)).forEach(function (k) { if (got < m.n && !used[k]) { used[k] = 1; keys.push(k); got++; } });
    });
    ['questions', 'signs', 'markings', 'scenarios'].forEach(function (t) {
      if (keys.length >= p.count) return;
      shuffle(examPool(t, {}, p.em)).forEach(function (k) { if (keys.length < p.count && !used[k]) { used[k] = 1; keys.push(k); } });
    });
    var items = [];
    shuffle(keys).forEach(function (k) { var it = buildItem(k); if (it && it.type !== 'sctap') items.push(it); });
    return items;
  }
  var EXI = null;
  function examItems(X) {
    if (EXI && EXI.id === X.id) return EXI.items;
    var items = [], ans = [], flags = [];
    X.specs.forEach(function (sp, i) {
      var it = itemFromSpec(sp);
      if (it) { items.push(it); ans.push(X.ans[i] == null ? -1 : X.ans[i]); flags.push(X.flags[i] ? 1 : 0); }
    });
    if (items.length !== X.specs.length) {
      X.specs = items.map(function (it) { return it.spec; }); X.ans = ans; X.flags = flags; X.cur = clamp(X.cur, 0, Math.max(0, items.length - 1)); save();
    }
    EXI = { id: X.id, items: items };
    return items;
  }
  var CUSTOM = { count: 20, minutes: 20, pass: 80 };
  function presetCard(p) {
    var em = S.profile.emirate, mine = em === 'both' || p.em === 'both' || p.em === em;
    var last = S.exams.filter(function (e) { return e.pid === p.id; })[0];
    return '<article class="preset' + (mine ? '' : ' dim') + '"><div class="preset-h">' + chip(emName(p.em), 'chip-em em-' + p.em) +
        (last ? chip((last.passed ? 'آخر مرة ناجح ' : 'آخر مرة ') + pctTxt(last.pct), last.passed ? 'chip-ok' : 'chip-bad') : '') + '</div>' +
      '<h2>' + esc(p.title) + '</h2>' + (p.subtitle ? '<p class="muted">' + esc(p.subtitle) + '</p>' : '') +
      '<div class="preset-stats"><span><b class="num">' + p.count + '</b>' + (p.count > 10 ? 'سؤال' : 'أسئلة') + '</span><span><b class="num">' + p.minutes + '</b>' + (p.minutes > 10 ? 'دقيقة' : 'دقائق') + '</span>' +
        '<span><b class="num">' + Math.ceil(p.pass * p.count - 1e-9) + '</b>صح للنجاح</span></div>' +
      (p.hazard ? '<p class="preset-note">' + ic('eye') + '<span>منها ' + nf(p.hazard, 'سؤال', 'سؤالين', 'أسئلة') + ' لإدراك المخاطر</span></p>' : '') +
      (p.notes ? '<details class="preset-more"><summary>' + ic('info') + '<span>من وين جبنا الأرقام</span></summary><p>' + nl2br(esc(p.notes)) + '</p>' +
        (p.raw && p.raw.src ? '<div class="info-meta">' + confBadge(p.conf, exRef(p.raw)) + '</div>' : '') + '</details>' : '') +
      '<button class="btn btn-gold" data-act="examReady" data-arg="' + esc(p.id) + '">' + ic('play') + 'ابدأ الامتحان</button></article>';
  }
  function rangeRow(id, label, v, min, max, step, unit) {
    return '<label class="rng" for="' + id + '"><span class="rng-l">' + label + '</span><b class="num" data-rv="' + id + '">' + v + unit + '</b>' +
      '<input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-in="cx" data-unit="' + unit + '"></label>';
  }
  function customCard() {
    return '<article class="preset preset-custom"><div class="preset-h">' + chip('على كيفك', 'chip-gold') + '</div><h2>امتحان مخصص</h2>' +
      '<p class="muted">اختار عدد الأسئلة والوقت وعلامة النجاح، والأسئلة حسب إمارتك</p>' +
      rangeRow('cx-count', 'عدد الأسئلة', CUSTOM.count, 5, 60, 5, '') + rangeRow('cx-min', 'الوقت بالدقائق', CUSTOM.minutes, 5, 60, 5, '') +
      rangeRow('cx-pass', 'علامة النجاح', CUSTOM.pass, 50, 100, 5, '%') +
      '<button class="btn btn-gold" data-act="examReady" data-arg="custom">' + ic('play') + 'ابدأ</button></article>';
  }
  function historyHTML() {
    var h = '<section class="sec"><div class="sec-h"><h2>امتحاناتك السابقة</h2>' + (S.exams.length ? '<span class="sec-note">' + nf(S.exams.length, 'امتحان', 'امتحانين', 'امتحانات') + '</span>' : '') + '</div>';
    if (!S.exams.length) return h + '<p class="muted">لسا ما عملت امتحان، وأول واحد بيعطيك فكرة وين أنت</p></section>';
    return h + '<ul class="hist">' + S.exams.slice(0, 15).map(function (e) {
      return '<li><button class="hist-i" data-act="go" data-arg="examResult:' + esc(e.id) + '"' + (e.rows ? '' : ' disabled') + '><span class="hist-s ' + (e.passed ? 'ok' : 'bad') + '">' + (e.passed ? 'ناجح' : 'راسب') + '</span>' +
        '<span class="hist-t"><b>' + esc(e.title) + '</b><small>' + fmtDate(e.at) + '، ' + e.correct + ' من ' + e.n + '</small></span><b class="num hist-p">' + pct(e.pct) + '%</b></button></li>';
    }).join('') + '</ul></section>';
  }
  SCREENS.exam = {
    tab: 'exam',
    render: function () {
      return '<div class="scr scr-exam"><header class="scr-h"><h1>امتحان تجريبي</h1><p>متل المعهد: أسئلة مخلوطة، وقت محدد، وعلامة نجاح، والنتيجة بتدخل بجاهزيتك</p></header>' +
        (S.activeExam ? activeExamBanner() : '') +
        '<div class="presets">' + presets().map(presetCard).join('') + customCard() + '</div>' +
        (emData('dubai') || emData('sharjah') ? '<button class="set-link" data-act="go" data-arg="journey">' + ic('route') + '<span>شو بيصير بالامتحان الحقيقي؟ مشوار الرخصة خطوة بخطوة</span>' + ic('next') + '</button>' : '') +
        historyHTML() + '</div>';
    }
  };
  ACT.cx = function (v, el) {
    var id = el.id;
    if (id === 'cx-count') CUSTOM.count = +v; else if (id === 'cx-min') CUSTOM.minutes = +v; else if (id === 'cx-pass') CUSTOM.pass = +v;
    var o = $('[data-rv="' + id + '"]', mainEl);
    if (o) o.textContent = v + (el.getAttribute('data-unit') || '');
  };
  function presetById(id) {
    if (id === 'custom') return { id: 'custom', title: 'امتحان مخصص', subtitle: '', count: CUSTOM.count, minutes: CUSTOM.minutes, pass: CUSTOM.pass / 100, em: S.profile.emirate, mix: null, notes: '' };
    var ps = presets();
    for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
    return null;
  }
  ACT.examReady = function (id) {
    var p = presetById(id);
    if (!p) return;
    confirmSheet({ icon: 'exam', title: p.title,
      body: '<span class="num">' + p.count + '</span> سؤال، <span class="num">' + p.minutes + '</span> دقيقة، والنجاح من ' + pctTxt(p.pass) + '<br>' +
        'الوقت بيبلش لما تكبس ابدأ، وفيك تعلم على الأسئلة وترجعلها قبل ما تسلم' + (S.activeExam ? '<br><b>رح نلغي امتحانك المفتوح</b>' : ''),
      ok: 'ابدأ', cancel: 'مش هلق', onOk: function () { startExam(p); } });
  };
  function startExam(p) {
    var items = buildExamItems(p);
    if (!items.length) { toast('ما في أسئلة كفاية للامتحان هلق', 'warn'); return; }
    var start = nowMs();
    S.activeExam = { id: 'x' + start.toString(36), pid: p.id, title: p.title, em: p.em, minutes: p.minutes, pass: p.pass,
      start: start, end: start + Math.round(p.minutes * 60000), specs: items.map(function (it) { return it.spec; }),
      ans: items.map(function () { return -1; }), flags: items.map(function () { return 0; }), cur: 0 };
    EXI = { id: S.activeExam.id, items: items };
    flush();
    go('examRun');
  }
  function noExam() {
    return '<div class="scr"><div class="empty">' + ic('exam') + '<h2>ما في امتحان مفتوح</h2><p>اختار امتحان من القائمة وابدأ</p>' +
      '<button class="btn btn-gold" data-act="tab" data-arg="exam">الامتحانات</button></div></div>';
  }
  SCREENS.examRun = {
    focus: true, tab: 'exam',
    render: function () {
      var X = S.activeExam;
      if (!X) return noExam();
      var items = examItems(X), n = items.length;
      if (!n) return noExam();
      var i = clamp(X.cur, 0, n - 1), it = items[i];
      var answered = X.ans.filter(function (a) { return a >= 0; }).length, left = Math.max(0, Math.round((X.end - nowMs()) / 1000));
      return '<div class="xrun"><div class="sbar xbar"><button class="icon-btn" data-act="back" aria-label="اطلع، والامتحان بيضل مفتوح">' + ic('close') + '</button>' +
          '<div class="sbar-mid"><div class="sbar-t"><b>' + esc(X.title) + '</b><span>جاوبت <span class="num" data-x-ans>' + answered + '/' + n + '</span></span></div>' + laneBar(answered / n, 'lane-sm') + '</div>' +
          '<div class="timer' + (left < 300 ? ' warn' : '') + (left < 60 ? ' bad' : '') + '" data-timer role="timer" aria-label="الوقت الباقي">' + ic('clock') + '<b class="num">' + fmtClock(left) + '</b></div></div>' +
        '<div class="stage"><div class="xhead"><span class="xnum">سؤال <b class="num">' + (i + 1) + '</b> من <span class="num">' + n + '</span></span>' +
          '<button class="chip chip-btn' + (X.flags[i] ? ' on' : '') + '" data-act="xflag" aria-pressed="' + !!X.flags[i] + '">' + ic('flag') + (X.flags[i] ? 'معلم' : 'علم عليه') + '</button>' +
          '<button class="chip chip-btn" data-act="xgrid">' + ic('grid') + 'كل الأسئلة</button></div>' +
          itemHTML(it, { exam: true, sel: X.ans[i] }) + '</div>' +
        '<div class="actbar"><div class="actbar-in"><button class="btn btn-ghost" data-act="xprev"' + (i === 0 ? ' disabled' : '') + '>' + ic('back') + 'السابق</button>' +
          (i < n - 1 ? '<button class="btn btn-gold" data-act="xnext" data-primary="1">التالي' + ic('next') + '</button>'
                     : '<button class="btn btn-gold" data-act="xsubmit" data-primary="1">' + ic('check') + 'سلم الامتحان</button>') +
        '</div></div></div>';
    },
    mount: function (root) {
      var X = S.activeExam;
      if (!X) return;
      if (nowMs() >= X.end) { setTimeout(function () { submitExam(true); }, 0); return; }
      var items = examItems(X), it = items[clamp(X.cur, 0, items.length - 1)], el = $('[data-scene]', root);
      if (el && it) mountScene(el, it, { interactive: false, mode: 'exam' });
      var last = -1;
      every(function () {
        var X2 = S.activeExam;
        if (!X2 || cur.name !== 'examRun') return;
        var left = Math.round((X2.end - nowMs()) / 1000), t = $('[data-timer]', mainEl);
        if (t && left !== last) {
          last = left;
          var b = $('b', t); if (b) b.textContent = fmtClock(left);
          t.classList.toggle('warn', left < 300); t.classList.toggle('bad', left < 60);
          if (left === 60) toast(ic('clock') + '<span>باقي دقيقة وحدة</span>', 'warn');
        }
        if (left <= 0) submitExam(true);
      }, 1000);
    },
    key: function (e) {
      var X = S.activeExam;
      if (!X) return false;
      var d = digitOf(e), items = examItems(X), it = items[X.cur];
      if (d && it && d <= it.opts.length) { ACT.xa(String(d - 1)); return true; }
      if (e.key === 'ArrowLeft' || e.key === 'Enter') { if (X.cur < items.length - 1) ACT.xnext(); else if (e.key === 'Enter') ACT.xsubmit(); return true; }
      if (e.key === 'ArrowRight') { ACT.xprev(); return true; }
      if (e.code === 'KeyF') { ACT.xflag(); return true; }
      return false;
    }
  };
  ACT.xa = function (a) {
    var X = S.activeExam;
    if (!X) return;
    var i = X.cur, v = +a;
    X.ans[i] = v;
    save();
    $$('.opt', mainEl).forEach(function (b, j) { var on = j === v; b.classList.toggle('is-sel', on); b.setAttribute('aria-pressed', on); });
    var n = X.ans.length, answered = X.ans.filter(function (x) { return x >= 0; }).length;
    var c = $('[data-x-ans]', mainEl); if (c) c.textContent = answered + '/' + n;
    var lane = $('.xbar .lane', mainEl);
    if (lane) { lane.setAttribute('aria-valuenow', Math.round(100 * answered / n)); var li = $('i', lane); if (li) li.style.width = (100 * answered / n).toFixed(1) + '%'; }
    Snd.play('tap');
  };
  ACT.xnext = function () { var X = S.activeExam; if (X && X.cur < X.ans.length - 1) { X.cur++; save(); render(0); } };
  ACT.xprev = function () { var X = S.activeExam; if (X && X.cur > 0) { X.cur--; save(); render(0); } };
  ACT.xgo = function (a) { var X = S.activeExam; if (!X) return; closeSheet(); X.cur = clamp(+a || 0, 0, X.ans.length - 1); save(); render(0); };
  ACT.xflag = function () { var X = S.activeExam; if (!X) return; X.flags[X.cur] = X.flags[X.cur] ? 0 : 1; save(); rerender(); };
  ACT.xgrid = function () {
    var X = S.activeExam;
    if (!X) return;
    var cells = '';
    for (var i = 0; i < X.ans.length; i++) {
      cells += '<button class="xg' + (X.ans[i] >= 0 ? ' ans' : '') + (X.flags[i] ? ' flag' : '') + (i === X.cur ? ' cur' : '') + '" data-act="xgo" data-arg="' + i + '" aria-label="سؤال ' + (i + 1) + '"><span class="num">' + (i + 1) + '</span></button>';
    }
    openSheet('<div class="sh-pad"><h2 class="sh-title">' + ic('grid') + 'كل الأسئلة</h2>' +
      '<div class="xg-legend"><span class="lg ans">جاوبته</span><span class="lg flag">معلم</span><span class="lg">بدون جواب</span></div>' +
      '<div class="xgrid">' + cells + '</div><button class="btn btn-gold btn-block" data-act="xsubmit">' + ic('check') + 'سلم الامتحان</button></div>');
  };
  ACT.xsubmit = function () {
    var X = S.activeExam;
    if (!X) return;
    var un = X.ans.filter(function (a) { return a < 0; }).length, fl = X.flags.filter(Boolean).length;
    confirmSheet({ icon: 'exam', title: 'متأكد بدك تسلم؟',
      body: (un ? 'في ' + nf(un, 'سؤال', 'سؤالين', 'أسئلة') + ' بدون جواب، ومنحسبهم غلط' : 'جاوبت كل الأسئلة') + (fl ? '<br>وعندك ' + nf(fl, 'سؤال معلم', 'سؤالين معلمين', 'أسئلة معلمة') : ''),
      ok: 'سلم', cancel: 'ارجع كمل', onOk: function () { submitExam(false); } });
  };
  ACT.xcancel = function () {
    confirmSheet({ icon: 'trash', danger: true, title: 'نلغي الامتحان المفتوح؟', body: 'ما رح نحسبه ولا رح يدخل بالجاهزية', ok: 'ألغيه', cancel: 'خليه',
      onOk: function () { S.activeExam = null; EXI = null; save(); rerender(); } });
  };
  function submitExam(auto) {
    var X = S.activeExam;
    if (!X) return;
    var items = examItems(X), correct = 0, topics = {};
    var rows = items.map(function (it, i) {
      var a = X.ans[i], has = a != null && a >= 0, ok = has && a === it.correct;
      if (ok) correct++;
      var t = it.topic || topicOf(it.key) || 'عام';
      if (!topics[t]) topics[t] = [0, 0];
      topics[t][1]++; if (ok) topics[t][0]++;
      if (has) logAnswer(it.key, ok);
      return { s: it.spec, a: has ? a : -1 };
    });
    var n = items.length, p = n ? correct / n : 0, passed = p >= X.pass - 1e-9;
    var rec = { id: X.id, at: nowMs(), title: X.title, pid: X.pid, em: X.em, n: n, correct: correct, pct: p, pass: X.pass, passed: passed,
      secs: Math.round((Math.min(nowMs(), X.end) - X.start) / 1000), minutes: X.minutes, rows: rows, topics: topics, auto: !!auto };
    S.exams.unshift(rec);
    if (S.exams.length > 40) S.exams.length = 40;
    S.exams.forEach(function (e, i) { if (i >= 15) delete e.rows; });
    S.activeExam = null; EXI = null;
    if (passed) addKm(5);
    markActive(); flush(); checkBadges();
    Snd.play(passed ? 'done' : 'fail');
    if (auto) toast(ic('clock') + '<span>خلص الوقت وسلمنا الامتحان</span>', 'warn', 3200);
    closeSheet();
    go('examResult', { id: rec.id }, { replace: cur.name === 'examRun' });
  }
  var XR = { only: false };
  function xrevItem(it, a, i) {
    var ok = a === it.correct;
    var fig = it.type === 'sign2m' || it.type === 'mk2m' ? '<span class="xrev-fig">' + signSVG(it.id) + '</span>'
      : it.figs && it.figs.length ? figRow(it.figs, 'xrev-figs', false) : '';
    var opts = it.opts.map(function (op, j) {
      var c = j === it.correct ? ' ok' : j === a ? ' bad' : '';
      return '<li class="xo' + c + '">' + (it.type === 'm2sign' ? '<span class="xo-img">' + signSVG(op.id) + '</span>'
        : it.ofigs && it.ofigs[j] ? '<span class="xo-img">' + signSVG(it.ofigs[j]) + '</span>' : '') +
        '<span class="xo-t">' + esc(op.t) + '</span>' + (j === it.correct ? ic('check') : j === a ? ic('close') : '') + '</li>';
    }).join('');
    return '<li class="xrev-i ' + (ok ? 'ok' : 'bad') + '"><div class="xrev-h"><span class="num xrev-n">' + (i + 1) + '</span>' + chip(esc(it.tag)) +
      (a < 0 ? chip('بدون جواب', 'chip-bad') : '') + '</div>' + fig + '<p class="xrev-q">' + esc(it.q) + '</p><ul class="xos">' + opts + '</ul>' +
      (it.explain ? '<p class="fb-x">' + nl2br(esc(it.explain)) + '</p>' : '') +
      (it.xfigs && it.xfigs.length ? figRow(it.xfigs, 'fb-figs', true) : '') + '</li>';
  }
  SCREENS.examResult = {
    tab: 'exam',
    render: function (p) {
      var rec = S.exams.filter(function (e) { return e.id === p.id; })[0];
      if (!rec) return '<div class="scr"><div class="empty">' + ic('exam') + '<h2>ما لقينا هالامتحان</h2><button class="btn" data-act="tab" data-arg="exam">الامتحانات</button></div></div>';
      var rows = (rec.rows || []).map(function (r) { return { it: itemFromSpec(r.s), a: r.a }; }).filter(function (x) { return x.it; });
      var tk = Object.keys(rec.topics || {}).sort(function (a, b) { return rec.topics[a][0] / rec.topics[a][1] - rec.topics[b][0] / rec.topics[b][1]; });
      var list = rows.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return !XR.only || o.x.a !== o.x.it.correct; });
      return '<div class="scr scr-xres"><div class="xres-top ' + (rec.passed ? 'ok' : 'bad') + '">' +
          '<div class="stamp big ' + (rec.passed ? 'ok' : 'bad') + '">' + (rec.passed ? 'ناجح' : 'راسب') + '</div>' +
          '<h1>' + esc(rec.title) + '</h1><p class="muted">' + fmtDate(rec.at) + '، استغرقت ' + ltrTxt(fmtClock(rec.secs)) + ' من ' + rec.minutes + ' دقيقة' + (rec.auto ? '، وخلص الوقت' : '') + '</p>' +
          '<div class="xres-score"><b class="num">' + rec.correct + '/' + rec.n + '</b><span class="num">' + pct(rec.pct) + '%</span></div>' +
          '<div class="passbar">' + laneBar(rec.pct, rec.passed ? 'lane-ok' : 'lane-bad') + '<i class="pass-mark" style="inset-inline-start:' + (rec.pass * 100).toFixed(1) + '%"></i>' +
            '<span class="pass-l">علامة النجاح <b>' + pctTxt(rec.pass) + '</b></span></div></div>' +
        (tk.length ? '<section class="sec"><div class="sec-h"><h2>حسب الموضوع</h2><span class="sec-note">الأضعف أول</span></div><ul class="topics">' + tk.map(function (t) {
          var v = rec.topics[t];
          return '<li class="tp"><span class="tp-n">' + esc(topicName(t)) + '</span>' + laneBar(v[0] / v[1], v[0] / v[1] >= 0.8 ? 'lane-ok' : v[0] / v[1] >= 0.5 ? '' : 'lane-bad') + '<b class="num">' + v[0] + '/' + v[1] + '</b></li>';
        }).join('') + '</ul></section>' : '') +
        (rows.length ? '<section class="sec"><div class="sec-h"><h2>راجع الأسئلة</h2><div class="seg seg-sm" role="radiogroup">' +
            '<button class="seg-b' + (XR.only ? '' : ' on') + '" data-act="xrOnly" data-arg="0" role="radio" aria-checked="' + !XR.only + '">الكل</button>' +
            '<button class="seg-b' + (XR.only ? ' on' : '') + '" data-act="xrOnly" data-arg="1" role="radio" aria-checked="' + XR.only + '">الغلط بس</button></div></div>' +
          (list.length ? '<ol class="xrev">' + list.map(function (o) { return xrevItem(o.x.it, o.x.a, o.i); }).join('') + '</ol>' : '<p class="muted">ولا غلطة، عاش</p>') + '</section>' : '') +
        '<div class="res-acts"><button class="btn btn-gold btn-lg" data-act="tab" data-arg="exam" data-primary="1">' + ic('exam') + 'امتحان جديد</button>' +
          (mistakeKeys().length ? '<button class="btn" data-act="drill" data-arg="mistakes">' + ic('review') + 'راجع أغلاطك</button>' : '') + '</div></div>';
    },
    key: function (e) { if (e.key === 'Enter') return clickPrimary(); return false; }
  };
  ACT.xrOnly = function (a) { XR.only = a === '1'; rerender(); };

  // ------------------------------------------------------------------ review (Leitner boxes)
  var BOX_LABELS = ['', 'اليوم', 'بكرا', 'بعد 3 أيام', 'بعد أسبوع', 'بعد 16 يوم'];
  var RV = { kind: 'all' };
  function mistakeRow(k) {
    var p = parseKey(k), o = objOf(k), isSign = p.kind === 'sign' || p.kind === 'mk';
    var fig = isSign ? '<span class="miss-fig">' + signSVG(o.id) + '</span>' : '<span class="miss-fig miss-ic">' + ic(p.kind === 'sc' ? 'junction' : 'info') + '</span>';
    var r = S.items[k];
    return '<li><button class="mrow" data-act="' + (p.kind === 'sign' ? 'signInfo' : p.kind === 'mk' ? 'mkInfo' : 'qInfo') + '" data-arg="' + esc(isSign ? o.id : k) + '">' + fig +
      '<span class="mrow-t"><span class="mrow-k">' + kindName(k) + (o.topic ? '، ' + esc(topicName(o.topic)) : '') + '</span><span class="mrow-q">' + esc(keyLabel(k)) + '</span></span>' +
      '<span class="mrow-n num" title="عدد الأغلاط">' + (r.x || 0) + '</span></button></li>';
  }
  SCREENS.review = {
    tab: 'review',
    render: function () {
      var counts = [0, 0, 0, 0, 0, 0], dueC = [0, 0, 0, 0, 0, 0], seen = 0, tn = 0, tk = 0;
      Object.keys(S.items).forEach(function (k) {
        if (!objOf(k)) return;
        var r = S.items[k]; seen++; tn += r.n || 0; tk += r.k || 0;
        counts[r.b]++; if (isDue(r)) dueC[r.b]++;
      });
      var max = Math.max.apply(null, counts.slice(1).concat([1])), due = dueKeys().length;
      var mist = mistakeKeys(), mastered = counts[3] + counts[4] + counts[5];
      var kinds = [['all', 'الكل'], ['q', 'أسئلة'], ['sign', 'إشارات'], ['mk', 'علامات'], ['sc', 'مواقف']].filter(function (x) {
        return x[0] === 'all' || mist.some(function (k) { return parseKey(k).kind === x[0]; });
      });
      if (!kinds.some(function (x) { return x[0] === RV.kind; })) RV.kind = 'all';
      var shown = mist.filter(function (k) { return RV.kind === 'all' || parseKey(k).kind === RV.kind; });
      var bays = [1, 2, 3, 4, 5].map(function (b) {
        return '<div class="bay b' + b + '"><span class="bay-fill" style="height:' + Math.round(100 * counts[b] / max) + '%"></span>' +
          '<span class="bay-n num">' + counts[b] + '</span><span class="bay-l">صندوق ' + b + '</span><span class="bay-s">' + BOX_LABELS[b] + '</span>' +
          (dueC[b] ? '<span class="bay-due num">' + dueC[b] + ' مستحق</span>' : '') + '</div>';
      }).join('');
      return '<div class="scr scr-review"><header class="scr-h"><h1>المراجعة</h1><p>كل غلطة بترجع للصندوق 1، وكل جواب صح بموعده بيطلعها صندوق، ومن الصندوق 3 وطالع بتعتبر محفوظة</p></header>' +
        '<div class="bays" role="img" aria-label="توزيع العناصر على صناديق المراجعة">' + bays + '</div>' +
        '<div class="rv-stats">' + statHTML(seen, 'شفتها') + statHTML(mastered, 'محفوظة') + statHTML(tn ? pct(tk / tn) + '%' : '0%', 'دقتك') + '</div>' +
        '<div class="rv-acts"><button class="btn btn-gold btn-lg" data-act="drill" data-arg="due"' + (due ? '' : ' disabled') + '>' + ic('cards') + (due ? 'ابدأ المراجعة (' + due + ')' : 'ولا شي مستحق اليوم') + '</button>' +
          '<button class="btn" data-act="drill" data-arg="mistakes"' + (mist.some(quizzable) ? '' : ' disabled') + '>' + ic('review') + 'تدرب على الأغلاط</button></div>' +
        '<section class="sec"><div class="sec-h"><h2>الصندوق 1: أغلاطك</h2><span class="sec-note">' + nf(mist.length, 'عنصر', 'عنصرين', 'عناصر') + '</span></div>' +
          (mist.length ? (kinds.length > 2 ? '<div class="chips-row">' + kinds.map(function (x) {
            return '<button class="fchip' + (RV.kind === x[0] ? ' on' : '') + '" data-act="rvKind" data-arg="' + x[0] + '">' + x[1] + '</button>';
          }).join('') + '</div>' : '') + '<ul class="mlist">' + shown.slice(0, 80).map(mistakeRow).join('') + '</ul>'
          : '<div class="empty small">' + ic('check') + '<p>الصندوق 1 فاضي، كمل هيك</p></div>') + '</section></div>';
    }
  };
  ACT.rvKind = function (k) { RV.kind = k || 'all'; rerender(); };
  ACT.qInfo = function (k) {
    var p = parseKey(k), o = objOf(k);
    if (!o) return;
    var it = p.kind === 'sc' ? scItem(o) : mcqItem(o);
    if (!it) return;
    var opts = it.type === 'sctap' ? '' : '<ul class="xos">' + it.opts.map(function (op, j) {
      return '<li class="xo' + (j === it.correct ? ' ok' : '') + '">' + (it.ofigs && it.ofigs[j] ? '<span class="xo-img">' + signSVG(it.ofigs[j]) + '</span>' : '') +
        '<span class="xo-t">' + esc(op.t) + '</span>' + (j === it.correct ? ic('check') : '') + '</li>';
    }).join('') + '</ul>';
    openSheet('<div class="sh-pad"><div class="info-chips">' + chip(esc(it.tag)) + lvlChip(it.level) + '</div><h2 class="info-t">' + esc(it.q) + '</h2>' +
      (it.figs && it.figs.length ? figRow(it.figs, 'xrev-figs', false) : '') + opts +
      (it.explain ? '<p class="fb-x">' + nl2br(esc(it.explain)) + '</p>' : '') +
      (it.xfigs && it.xfigs.length ? figRow(it.xfigs, 'fb-figs', true) : '') +
      (it.tip ? '<p class="fb-tip">' + ic('bolt') + '<span>' + esc(it.tip) + '</span></p>' : '') +
      '<p class="info-st">' + ic('review') + '<span>' + statusText(k) + '</span></p><div class="info-meta">' + confBadge(it.conf, k) + '</div>' +
      '<div class="info-acts"><button class="btn btn-gold" data-act="drillKey" data-arg="' + esc(k) + '">' + ic('play') + 'جاوبها هلق</button></div></div>');
  };
  ACT.drillKey = function (k) { closeSheet(); startDrill('keys', [k], 'سؤال واحد'); };

  // ------------------------------------------------------------------ export / import
  function b64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(str) { var bin = atob(str), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function utf8(str) { return W.TextEncoder ? new TextEncoder().encode(str) : unb64(btoa(unescape(encodeURIComponent(str)))); }
  function fromUtf8(u) {
    if (W.TextDecoder) return new TextDecoder().decode(u);
    var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return decodeURIComponent(escape(s));
  }
  function exportJSON() { var o = JSON.parse(JSON.stringify(S)); o.activeExam = null; o._app = 'miqwad'; o._at = nowMs(); return JSON.stringify(o); }
  function makeCode(cb) {
    var json = exportJSON();
    var plain = function () { cb('MQ1.' + b64(utf8(json))); };
    if (W.CompressionStream && W.Response && W.Blob) {
      try {
        var st = new Blob([utf8(json)]).stream().pipeThrough(new CompressionStream('gzip'));
        new Response(st).arrayBuffer().then(function (buf) { cb('MQZ1.' + b64(new Uint8Array(buf))); }, plain);
        return;
      } catch (e) { /* fall back to plain base64 */ }
    }
    plain();
  }
  function readCode(code, cb) {
    code = String(code || '').replace(/\s+/g, '');
    var fail = function () { cb(null); };
    try {
      if (code.indexOf('MQZ1.') === 0) {
        if (!W.DecompressionStream) { cb(null, 'old'); return; }
        var st = new Blob([unb64(code.slice(5))]).stream().pipeThrough(new DecompressionStream('gzip'));
        new Response(st).arrayBuffer().then(function (buf) {
          try { cb(JSON.parse(fromUtf8(new Uint8Array(buf)))); } catch (e) { fail(); }
        }, fail);
        return;
      }
      cb(JSON.parse(fromUtf8(unb64(code.indexOf('MQ1.') === 0 ? code.slice(4) : code))));
    } catch (e) { fail(); }
  }

  // ------------------------------------------------------------------ settings
  function setRow(label, ctrl, note) {
    return '<div class="srow"><div class="srow-l"><b>' + label + '</b>' + (note ? '<span>' + note + '</span>' : '') + '</div><div class="srow-c">' + ctrl + '</div></div>';
  }
  function segBtn(act, v, label, on) {
    return '<button class="seg-b' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="' + act + '" data-arg="' + v + '">' + label + '</button>';
  }
  SCREENS.settings = {
    tab: 'settings',
    render: function () {
      var P = S.profile, left = examDaysLeft();
      var counts = 'المحتوى: ' + nf(IX.qList.length, 'سؤال', 'سؤالين', 'أسئلة') + '، ' + nf(IX.signList.length, 'إشارة', 'إشارتين', 'إشارات') + '، ' +
        nf(IX.markList.length, 'علامة', 'علامتين', 'علامات') + '، ' + nf(IX.scList.length, 'موقف', 'موقفين', 'مواقف');
      return '<div class="scr scr-set"><header class="scr-h"><h1>الإعدادات</h1><p>كل شي محفوظ على جهازك وبس</p></header>' +
        (storageOK ? '' : '<p class="banner warn">' + ic('info') + '<span>المتصفح مش سامح بالحفظ هون، طلع كود التقدم قبل ما تسكر الصفحة</span></p>') +
        '<section class="set"><h2>امتحانك</h2>' +
          setRow('الإمارة', '<div class="seg" role="radiogroup" aria-label="الإمارة">' + segBtn('setEm', 'dubai', 'دبي', P.emirate === 'dubai') + segBtn('setEm', 'sharjah', 'الشارقة', P.emirate === 'sharjah') + segBtn('setEm', 'both', 'الاثنين', P.emirate === 'both') + '</div>', 'بتحدد أسئلة الامتحان التجريبي والخطة') +
          setRow('موعد الامتحان', '<div class="date-row"><input type="date" id="set-date" data-ch="setDate" value="' + esc(P.examDate) + '" aria-label="موعد الامتحان">' +
            (P.examDate ? '<button class="linkbtn" data-act="clearDate">امسح</button>' : '') + '</div>',
            left == null ? 'اختياري، بيساعدنا نوزع الدروس عالأيام' : left > 0 ? 'باقي ' + nf(left, 'يوم', 'يومين', 'أيام') + '، ' + fmtDate(P.examDate) : left === 0 ? 'اليوم' : 'التاريخ مر') +
          setRow('هدفك اليومي', '<div class="seg" role="radiogroup" aria-label="الهدف اليومي">' + [10, 20, 30, 50].map(function (g) { return segBtn('setGoal', g, '<span class="num">' + g + '</span>', +P.goal === g); }).join('') + '</div>', 'عدد الأسئلة باليوم') +
        '</section>' +
        '<section class="set"><h2>الصوت والشكل</h2>' +
          setRow('الأصوات', '<button class="tgl' + (P.sound ? ' on' : '') + '" role="switch" aria-checked="' + !!P.sound + '" data-act="toggleSound" aria-label="الأصوات"><span></span></button>', 'أصوات خفيفة للصح والغلط') +
          setRow('الحركة', '<div class="seg" role="radiogroup" aria-label="الحركة">' + segBtn('setMotion', 'auto', 'تلقائي', P.motion === 'auto') + segBtn('setMotion', 'reduce', 'خففها', P.motion === 'reduce') + segBtn('setMotion', 'full', 'كاملة', P.motion === 'full') + '</div>') +
          setRow('حجم الخط', '<div class="seg" role="radiogroup" aria-label="حجم الخط">' + [[0.92, 'صغير'], [1, 'عادي'], [1.1, 'كبير'], [1.2, 'أكبر']].map(function (t) {
            return segBtn('setText', t[0], t[1], Math.abs(num(P.text, 1) - t[0]) < 0.01);
          }).join('') + '</div>') +
        '</section>' +
        '<section class="set"><h2>احفظ تقدمك</h2><p class="muted">التقدم محفوظ بهالمتصفح بس، طلع الكود واحفظه عندك لترجعه على أي جهاز</p>' +
          '<button class="btn" data-act="exportCode">' + ic('copy') + 'طلع كود التقدم</button>' +
          '<div class="code-out" data-code-out hidden><textarea id="export-code" readonly rows="4" dir="ltr" aria-label="كود التقدم"></textarea>' +
            '<button class="btn btn-gold" data-act="copyCode">' + ic('copy') + 'انسخ الكود</button></div>' +
          '<div class="code-in"><label for="import-code">رجع تقدمك من كود</label><textarea id="import-code" rows="3" dir="ltr" placeholder="الصق الكود هون"></textarea>' +
            '<p class="err" data-import-err hidden></p><button class="btn" data-act="importCode">' + ic('upload') + 'رجع التقدم</button></div>' +
        '</section>' +
        '<section class="set"><h2>عن مقود</h2>' +
          '<button class="set-link" data-act="go" data-arg="sources">' + ic('shield') + '<span>المصادر وإخلاء المسؤولية</span>' + ic('next') + '</button>' +
          '<button class="set-link" data-act="go" data-arg="badges">' + ic('medal') + '<span>لقبك وأوسمتك</span>' + ic('next') + '</button>' +
          '<p class="muted small">' + counts + '، نسخة ' + VERSION + '</p></section>' +
        '<section class="set set-danger"><h2>امسح كل شي</h2><p class="muted">بيرجع مقود متل أول مرة فتحته، وما في رجعة</p>' +
          '<button class="btn btn-bad" data-act="resetAll">' + ic('trash') + 'امسح كل التقدم</button></section></div>';
    }
  };
  ACT.setDate = function (v) { S.profile.examDate = /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : ''; save(); rerender(); };
  ACT.clearDate = function () { S.profile.examDate = ''; save(); rerender(); };
  ACT.setGoal = function (v) { S.profile.goal = clamp(Math.round(num(v, 20)), 5, 200); save(); rerender(); };
  ACT.toggleSound = function () { S.profile.sound = !S.profile.sound; save(); if (S.profile.sound) { Snd.unlock(); Snd.play('ok'); } rerender(); };
  ACT.setMotion = function (v) { S.profile.motion = ['auto', 'reduce', 'full'].indexOf(v) >= 0 ? v : 'auto'; save(); applyProfile(); rerender(); };
  ACT.setText = function (v) { S.profile.text = clamp(num(v, 1), 0.85, 1.3); save(); applyProfile(); rerender(); };
  ACT.exportCode = function () {
    flush();
    makeCode(function (code) {
      var box = $('[data-code-out]', mainEl), ta = $('#export-code', mainEl);
      if (!box || !ta) return;
      ta.value = code; box.hidden = false;
      toast(ic('check') + '<span>الكود جاهز، انسخه واحفظه عندك</span>', 'ok');
    });
  };
  ACT.copyCode = function () {
    var ta = $('#export-code', mainEl);
    if (!ta) return;
    var code = ta.value;
    var fallback = function () {
      try { ta.focus(); ta.select(); ta.setSelectionRange(0, code.length); } catch (e) { /* ignore */ }
      toast('حددنا الكود، انسخه يدويا', 'warn');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () { toast(ic('check') + '<span>نسخنا الكود</span>', 'ok'); }, fallback);
      } else fallback();
    } catch (e) { fallback(); }
  };
  ACT.importCode = function () {
    var ta = $('#import-code', mainEl), err = $('[data-import-err]', mainEl), v = ta ? ta.value.trim() : '';
    var showErr = function (m) { if (err) { err.textContent = m; err.hidden = false; } };
    if (err) err.hidden = true;
    if (!v) { showErr('الصق الكود أول'); return; }
    readCode(v, function (obj, why) {
      if (why === 'old') { showErr('هالمتصفح قديم وما بيقدر يفتح الكود المضغوط، حدث المتصفح أو افتح مقود من متصفح أحدث'); return; }
      if (!isObj(obj) || !isObj(obj.items) || !isObj(obj.profile)) { showErr('الكود مش صحيح، تأكد إنك نسخته كامل'); return; }
      var n = Object.keys(obj.items).length;
      confirmSheet({ icon: 'upload', title: 'نرجع التقدم من الكود؟',
        body: 'رح نستبدل تقدمك الحالي بتقدم فيه ' + nf(n, 'عنصر', 'عنصرين', 'عناصر') + ' و<b class="num">' + fmtKm(num(obj.km, 0)) + '</b> كم',
        ok: 'استبدل', cancel: 'لا',
        onOk: function () {
          S = migrate(obj); S.activeExam = null;
          resetRuntime(); flush(); applyProfile();
          toast(ic('check') + '<span>رجعنا تقدمك</span>', 'ok');
          tab('home');
        } });
    });
  };
  function resetRuntime() { clearPools(); AK = null; SESS = null; LRN = null; FL = null; EXI = null; pathScrolled = false; }
  ACT.resetAll = function () {
    confirmSheet({ icon: 'trash', danger: true, title: 'متأكد بدك تمسح كل شي؟',
      body: 'رح نمسح كل الدروس والمراجعات والامتحانات والكيلومترات، ونصيحة: طلع كود التقدم قبل', ok: 'اي، امسح كل شي', cancel: 'لا، خليه',
      onOk: function () { lsDel(); S = freshState(); resetRuntime(); flush(); applyProfile(); toast('رجعنا من الأول', 'ok'); tab('home'); } });
  };

  // ------------------------------------------------------------------ badges and titles
  SCREENS.badges = {
    tab: 'home',
    render: function () {
      var t = titleInfo(), tn = 0, tk = 0;
      Object.keys(S.items).forEach(function (k) { tn += S.items[k].n || 0; tk += S.items[k].k || 0; });
      var ladder = TITLES.map(function (x, i) {
        return '<li class="lad' + (S.km >= x.km ? ' on' : '') + (i === t.i ? ' cur' : '') + '"><span class="kmpost"><small>كم</small><b class="num">' + x.km + '</b></span><span class="lad-t">' + x.name + '</span>' +
          (i === t.i ? '<span class="here">' + ic('car') + 'أنت هون</span>' : '') + '</li>';
      }).join('');
      var badges = BADGES.map(function (b) {
        var got = S.badges[b.id];
        return '<li class="bdg' + (got ? ' on' : '') + '"><span class="bdg-ic">' + ic(b.icon) + '</span><b>' + esc(b.name) + '</b><span>' + esc(b.desc) + '</span>' +
          (got ? '<small>' + fmtDate(got) + '</small>' : '') + '</li>';
      }).join('');
      return '<div class="scr scr-badges"><header class="scr-h"><h1>لقبك وأوسمتك</h1><p>كل جواب صح بيقطعك مسافة، والأسئلة الأصعب بتقطعك أكتر</p></header>' +
        '<section class="title-card"><span class="rank-l">لقبك هلق</span><b class="title-big">' + t.cur.name + '</b>' +
          '<span class="title-km"><b class="num">' + fmtKm(S.km) + '</b> كم</span>' + laneBar(t.frac, 'lane-lg') +
          '<span class="muted">' + (t.next ? 'باقي <b class="num">' + fmtKm(t.left) + '</b> كم لتصير ' + t.next.name : 'وصلت لأعلى لقب، عاش') + '</span></section>' +
        '<ol class="ladder">' + ladder + '</ol>' +
        '<div class="res-stats">' + statHTML(tn, 'جواب') + statHTML(tn ? pct(tk / tn) + '%' : '0%', 'دقة') + statHTML(streakBest(), 'أطول سلسلة أيام') + statHTML(S.bestCombo || 0, 'أطول سلسلة صح') + '</div>' +
        '<section class="sec"><div class="sec-h"><h2>الأوسمة</h2><span class="sec-note"><span class="num">' + Object.keys(S.badges).length + '/' + BADGES.length + '</span></span></div><ul class="bdgs">' + badges + '</ul></section>' +
        '<p class="muted small">المسافة: الجواب الصح بمستوى أساسي 0.5 كم ولحد 1.5 كم بالمتقدم، والدرس الجديد 2 كم، والتحدي 3 كم، والمخرج 5 كم، والامتحان الناجح 5 كم</p></div>';
    }
  };

  // ------------------------------------------------------------------ sources and disclaimer
  function bankTitle(name, b) {
    if (b.title) return b.title;
    var ts = uniq(arr(b.questions).map(function (q) { return q && q.topic; }).filter(Boolean)).slice(0, 3).map(topicName);
    return ts.length ? ts.join('، ') : 'بنك أسئلة';
  }
  SCREENS.sources = {
    tab: 'settings',
    render: function () {
      var groups = [];
      if (DATA.signs && isObj(DATA.signs.sources)) groups.push(['كتالوج الإشارات', DATA.signs.sources]);
      if (DATA.markings && isObj(DATA.markings.sources)) groups.push(['العلامات والأضواء وإشارات الشرطي', DATA.markings.sources]);
      if (DATA.exams && isObj(DATA.exams.sources)) groups.push(['صيغ الامتحانات وخطوات الساحة والطريق', DATA.exams.sources]);
      Object.keys(DATA.banks || {}).forEach(function (b) { var bk = DATA.banks[b] || {}; if (isObj(bk.sources)) groups.push(['أسئلة: ' + bankTitle(b, bk), bk.sources]); });
      Object.keys(DATA.scenarioSources || {}).forEach(function (f) { if (isObj(DATA.scenarioSources[f])) groups.push(['المواقف', DATA.scenarioSources[f]]); });
      var total = 0;
      var body = groups.map(function (g) {
        var ids = Object.keys(g[1]); total += ids.length;
        return '<section class="sec"><div class="sec-h"><h2>' + esc(g[0]) + '</h2><span class="sec-note num">' + ids.length + '</span></div><ul class="srcs">' +
          ids.map(function (id) { var s = g[1][id] || {}; return srcRow({ id: id, title: s.title || id, url: s.url || '', publisher: s.publisher || '', date: s.date || '' }); }).join('') + '</ul></section>';
      }).join('');
      return '<div class="scr scr-src"><header class="scr-h"><h1>المصادر وإخلاء المسؤولية</h1></header>' +
        '<section class="disc">' + ic('shield') + '<div><h2>أداة تعلم خاصة، مش تطبيق رسمي</h2>' +
          '<p>مقود أداة شخصية للتدريب، وما إلها أي علاقة بهيئة الطرق والمواصلات في دبي، ولا بشرطة الشارقة، ولا بوزارة الداخلية، ولا بأي معهد سواقة</p>' +
          '<p>جمعنا المحتوى من مواقع رسمية ومعاهد سواقة معتمدة وصحف معروفة، وكل معلومة عليها درجة ثقتها: «مصادر موثوقة» يعني مصدر رسمي أو مصدرين متفقين، و«مصدر واحد» يعني مصدر واحد جيد</p>' +
          '<p>القوانين والرسوم وصيغة الامتحانات ممكن تتغير، وأرقام الامتحان التجريبي تقريبية، فتأكد دايما من معهدك قبل الامتحان</p></div></section>' +
        (groups.length ? '<p class="muted small">' + nf(total, 'مصدر', 'مصدرين', 'مصادر') + ' بكل الملفات</p>' + body : '<div class="empty small">' + ic('info') + '<p>رح تلاقي المصادر هون لما يجهز المحتوى</p></div>') + '</div>';
    }
  };

  // ------------------------------------------------------------------ profile (motion, text size)
  var mqRM = null;
  try { mqRM = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null; } catch (e) { mqRM = null; }
  function reducedMotion() { return S.profile.motion === 'reduce' || (S.profile.motion !== 'full' && !!(mqRM && mqRM.matches)); }
  function applyProfile() {
    if (!appEl) return;
    appEl.classList.toggle('rm', reducedMotion());
    appEl.classList.toggle('fm', S.profile.motion === 'full');
    D.documentElement.style.fontSize = (16 * clamp(num(S.profile.text, 1), 0.85, 1.3)).toFixed(2) + 'px';
  }

  // ------------------------------------------------------------------ events
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t || !appEl.contains(t) || t.disabled) return;
    // the yard simulator and the scene engine own their inner controls
    if (t.closest('[data-yard], [data-scene]')) return;
    var fn = ACT[t.getAttribute('data-act')];
    if (!fn) return;
    e.preventDefault();
    Snd.unlock();
    fn(t.getAttribute('data-arg'), t, e);
  }
  function onInput(e) {
    var t = e.target, a = t && t.getAttribute ? t.getAttribute('data-in') : null;
    if (a && ACT[a]) ACT[a](t.value, t, e);
  }
  function onChange(e) {
    var t = e.target, a = t && t.getAttribute ? t.getAttribute('data-ch') : null;
    if (a && ACT[a]) ACT[a](t.value, t, e);
  }
  function onKey(e) {
    var tg = e.target, tag = tg && tg.tagName;
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!(tg && tg.isContentEditable);
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (celEl && !celEl.hidden) { closeCel(); e.preventDefault(); return; }
      if (sheetOpen()) { closeSheet(); e.preventDefault(); return; }
      if (typing) { try { tg.blur(); } catch (x) { /* ignore */ } return; }
      back(); e.preventDefault(); return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    if (sheetOpen() || (celEl && !celEl.hidden)) return;
    var scr = SCREENS[cur.name];
    if (scr && scr.key && scr.key(e) === true) e.preventDefault();
  }
  function onVisible() {
    if (D.visibilityState === 'hidden') { flush(); return; }
    var t = dayNo();
    if (t !== TODAY) { TODAY = t; if (!SCREENS[cur.name].focus) rerender(); }
    updateHud();
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    var de = D.documentElement;
    de.setAttribute('lang', 'ar'); de.setAttribute('dir', 'rtl');
    appEl = D.getElementById('app');
    if (!appEl) { appEl = D.createElement('div'); appEl.id = 'app'; D.body.appendChild(appEl); }
    appEl.setAttribute('dir', 'rtl'); appEl.setAttribute('lang', 'ar');
    appEl.classList.add('app');
    try { buildIndex(); } catch (e) { if (W.console) console.error('[miqwad] content index failed', e); }
    try { buildCurriculum(); } catch (e) { if (W.console) console.error('[miqwad] curriculum failed', e); }
    appEl.innerHTML = shellHTML();
    mainEl = $('#main', appEl); toastEl = $('.toasts', appEl);
    sheetWrap = $('.sheet-wrap', appEl); sheetBody = $('.sheet-body', appEl); celEl = $('.cel', appEl);
    applyProfile();
    appEl.addEventListener('click', onClick);
    appEl.addEventListener('input', onInput);
    appEl.addEventListener('change', onChange);
    D.addEventListener('keydown', onKey);
    D.addEventListener('pointerdown', function () { Snd.unlock(); }, { passive: true, capture: true });
    D.addEventListener('visibilitychange', onVisible);
    W.addEventListener('pagehide', flush);
    if (mqRM) { if (mqRM.addEventListener) mqRM.addEventListener('change', applyProfile); else if (mqRM.addListener) mqRM.addListener(applyProfile); }
    render(0);
    if (!storageOK) warn('localStorage unavailable, progress stays in memory until exported');
    // small hook for tests and debugging (read-only use)
    W.Miqwad = { version: VERSION, go: go, tab: tab, back: back, flush: flush, state: function () { return S; },
      screen: function () { return cur.name; }, drill: function (keys, title) { startDrill('keys', arr(keys), title); }, yardCtl: function () { return cur.name === 'yardRun' ? YCTL : null; }, content: function () { return { q: IX.qList.length, signs: IX.signList.length, marks: IX.markList.length, sc: IX.scList.length, lessons: CUR.lessons.length }; },
      // test hook: the current question (index of the right option) in a quiz or exam screen
      peek: function () {
        if (cur.name === 'play' && SESS && !SESS.done) { var it = SESS.items[SESS.i]; return { screen: 'play', type: it.type, correct: it.correct, answered: !!it.answered, i: SESS.i, n: SESS.items.length }; }
        if (cur.name === 'examRun' && S.activeExam) { var X = S.activeExam, xi = examItems(X)[X.cur]; return { screen: 'examRun', type: xi && xi.type, correct: xi ? xi.correct : -1, i: X.cur, n: X.ans.length }; }
        return { screen: cur.name };
      } };
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
