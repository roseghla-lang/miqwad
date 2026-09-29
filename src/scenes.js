/* scenes.js : top-down scenario engine for مقود (attaches window.Scenes)
 *
 * Classic script, no dependencies, never throws at load time. Full authoring reference:
 * docs/scenes.md. Quick API:
 *
 *   var ctl = Scenes.mount(el, sceneOrScenario, {onTap, onPhase, autoplay, hotspots, labels, debug,
 *                                                blink, reducedMotion, speed});
 *   ctl.play('intro' | 'solution'); ctl.pause(); ctl.reset(); ctl.seek(t, phase); ctl.destroy();
 *   ctl.mark(hotspotId, 'ok' | 'bad' | null); ctl.clearMarks(); ctl.revealHotspots(bool);
 *   ctl.showArrows(bool | null); ctl.showLabels(bool | null); ctl.duration(phase);
 *   ctl.phase, ctl.time, ctl.hasIntro, ctl.svg, ctl.errors, ctl.warnings
 *   onPhase(name): 'intro' | 'question' | 'solution' | 'done';  onTap(hotspotId | null, {phase, t, x, y})
 *   Scenes.validate(sceneOrScenario) -> [strings]   (strings starting with "warn:" are advisory)
 *   Scenes.templates                                 (parameters, slots and routes of every template)
 *   Scenes.inspect(scene)                            (concrete lane ids / routes / crossings of one scene)
 *   Scenes.snapshot(scene, {phase, t, width})        (static SVG markup of one frame)
 *
 * File map: math + Path | drawing kit | templates (road, uturn, crossroads, tjunction, roundabout,
 * highway-merge/exit, parking) | actors | compile (slots, timeline -> segments + state tracks) |
 * runtime (Scene, frame loop, overlays, labels, hotspots) | validation + public API.
 *
 * Conventions (they matter, read them):
 *  - World units are METRES. Authors write x = east, y = NORTH (up). Internally the SVG uses
 *    y = south, so every author y is negated once in toSvg().
 *  - Headings are compass bearings: 0 = north (up the screen), 90 = east, 180 = south, 270 = west.
 *    Vehicles are drawn nose-up and rotated by their bearing.
 *  - RIGHT-HAND TRAFFIC. Lane 1 is ALWAYS the rightmost lane in the driver's direction of travel
 *    (the kerb-side lane); numbers grow towards the median / centre line. "right" = lane 1,
 *    "left" = the highest number.
 *  - Roundabouts circulate anticlockwise: a circulating car's bearing from the centre DECREASES.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var NS = 'http://www.w3.org/2000/svg';
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var LW = 3.5;        // lane width
  var RLW = 4.2;       // circulating (ring) lane width
  var GAP = 0.4;       // distance kept in front of a stop / give-way line
  var EPS = 1e-4;      // solution events happen just after the question frame
  var FONT = "Alexandria,'Readex Pro','Space Grotesk',sans-serif";
  var BODY_FONT = "'Readex Pro',Alexandria,'Space Grotesk',sans-serif";
  var LATIN = "'Space Grotesk',Alexandria,sans-serif";

  var COL = {
    bg: '#0A0E15', panel: '#101724', ink: '#EAE6DB', muted: '#97A1B4', gold: '#D9B978',
    ok: '#8CC8A0', warn: '#E2A65C', bad: '#DE9090',
    ground: '#1D1C19', groundCity: '#1A1C1F', sand: '#C9B48A', sandDim: '#75684D', sandDark: '#4A4233',
    grass: '#3E5B3A', asphalt: '#2A2F37', asphaltDark: '#22262D', asphaltLight: '#343A44',
    pave: '#3B414A', paveLine: '#4A515B', kerb: '#9AA3AE', white: '#F2F2EE', yellow: '#F2C230',
    red: '#C8202A', blue: '#1F5AA6', green: '#1E7B47', orange: '#F07F1A', signYellow: '#F5C400',
    glass: '#18202B', shadow: '#000000', palm: '#2F6B3A', palmLight: '#4E9A55', trunk: '#6B4F2E',
    building: '#262A31', roof: '#30353E'
  };
  var PAINT = {
    red: '#C8202A', blue: '#2B63B8', white: '#E6E8EB', black: '#1A1C20', silver: '#A9B1BA',
    green: '#23874F', yellow: '#F2C230', orange: '#F07F1A', gold: '#D9B978', grey: '#6B737E',
    cream: '#E9DFC4', brown: '#7B4A26', teal: '#2E8C8C', purple: '#6E4C9E'
  };
  var CAR_COLOURS = ['red', 'blue', 'white', 'black', 'silver', 'green', 'yellow', 'orange'];

  // ------------------------------------------------------------------ math
  function P(x, y) { return { x: x, y: y }; }
  function add(a, b) { return P(a.x + b.x, a.y + b.y); }
  function sub(a, b) { return P(a.x - b.x, a.y - b.y); }
  function mul(a, k) { return P(a.x * k, a.y * k); }
  function vlen(a) { return Math.sqrt(a.x * a.x + a.y * a.y); }
  function dist(a, b) { return vlen(sub(a, b)); }
  function norm(a) { var l = vlen(a) || 1; return P(a.x / l, a.y / l); }
  function rightOf(v) { return P(-v.y, v.x); }                  // right-hand normal in SVG space
  function dirB(b) { return P(Math.sin(b * D2R), -Math.cos(b * D2R)); } // bearing -> unit vector
  function bOf(v) { var b = Math.atan2(v.x, -v.y) * R2D; return (b + 360) % 360; }
  function angDiff(a, b) { return ((a - b) % 360 + 540) % 360 - 180; } // signed a-b in [-180,180)
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpP(a, b, t) { return P(lerp(a.x, b.x, t), lerp(a.y, b.y, t)); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function f2(n) { return Math.round(n * 100) / 100; }
  function hash(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  var EASE = {
    linear: function (t) { return t; },
    'in': function (t) { return t * t; },
    out: function (t) { return 1 - (1 - t) * (1 - t); },
    inout: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  };

  // ------------------------------------------------------------------ point samplers
  function segPts(a, b, step) {
    var n = Math.max(1, Math.ceil(dist(a, b) / (step || 2))), out = [];
    for (var i = 0; i <= n; i++) out.push(lerpP(a, b, i / n));
    return out;
  }
  function bez(p0, p1, p2, p3, step) {
    var est = dist(p0, p1) + dist(p1, p2) + dist(p2, p3);
    var n = Math.max(6, Math.ceil(est / (step || 0.35))), out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out.push(P(a * p0.x + b * p1.x + c * p2.x + d * p3.x, a * p0.y + b * p1.y + c * p2.y + d * p3.y));
    }
    return out;
  }
  // arc around centre c, radius r, from bearing b0 to bearing b1 (b1 may be < b0 or > b0 or wrap)
  function arcPts(c, r, b0, b1, step) {
    var sweep = b1 - b0, n = Math.max(2, Math.ceil(Math.abs(sweep) * D2R * r / (step || 0.5))), out = [];
    for (var i = 0; i <= n; i++) out.push(add(c, mul(dirB(b0 + sweep * i / n), r)));
    return out;
  }
  function joinPts() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) {
      var l = arguments[i] || [];
      for (var j = 0; j < l.length; j++) if (!out.length || dist(out[out.length - 1], l[j]) > 1e-3) out.push(l[j]);
    }
    return out;
  }
  // offset a polyline sideways (positive = to the right of the travel direction)
  function offsetPts(pts, off) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      out.push(add(pts[i], mul(rightOf(norm(sub(b, a))), off)));
    }
    return out;
  }
  // corner-based cubic: from p0 heading v0 to p3 heading v3, near-circular for perpendicular turns
  function turnPts(p0, v0, p3, v3, k) {
    k = k || 0.55;
    var cross = v0.x * v3.y - v0.y * v3.x, h0, h3;
    if (Math.abs(cross) > 0.05) {
      var w = sub(p3, p0), t0 = (w.x * v3.y - w.y * v3.x) / cross, t3 = (w.x * v0.y - w.y * v0.x) / cross;
      h0 = Math.abs(t0) * k; h3 = Math.abs(t3) * k;
      if (t0 < 0 || t3 < 0 || h0 < 0.5 || h3 < 0.5) { h0 = h3 = dist(p0, p3) * 0.4; }
    } else { h0 = h3 = dist(p0, p3) * 0.4; }
    return bez(p0, add(p0, mul(v0, h0)), sub(p3, mul(v3, h3)), p3);
  }

  // ------------------------------------------------------------------ Path (arc-length polyline)
  function Path(pts) {
    var p = [];
    for (var i = 0; i < pts.length; i++) if (!p.length || dist(p[p.length - 1], pts[i]) > 1e-6) p.push(pts[i]);
    if (!p.length) p.push(P(0, 0));
    if (p.length === 1) p.push(P(p[0].x, p[0].y - 0.01));
    this.p = p; this.c = [0];
    for (var j = 1; j < p.length; j++) this.c.push(this.c[j - 1] + dist(p[j - 1], p[j]));
    this.length = this.c[this.c.length - 1];
  }
  Path.prototype._i = function (s) {
    var lo = 0, hi = this.c.length - 2;
    while (lo < hi) { var m = (lo + hi + 1) >> 1; if (this.c[m] <= s) lo = m; else hi = m - 1; }
    return lo;
  };
  Path.prototype.pos = function (s) {
    var p = this.p, n = p.length;
    if (s <= 0) return add(p[0], mul(norm(sub(p[1], p[0])), s));
    if (s >= this.length) return add(p[n - 1], mul(norm(sub(p[n - 1], p[n - 2])), s - this.length));
    var i = this._i(s), L = this.c[i + 1] - this.c[i];
    return lerpP(p[i], p[i + 1], L ? (s - this.c[i]) / L : 0);
  };
  Path.prototype.dir = function (s) { return norm(sub(this.pos(s + 0.3), this.pos(s - 0.3))); };
  Path.prototype.pose = function (s) { var q = this.pos(s); q.h = bOf(this.dir(s)); return q; };
  Path.prototype.project = function (q, s0, s1) {
    var best = { s: 0, d: Infinity };
    for (var i = 0; i < this.p.length - 1; i++) {
      if (s1 != null && this.c[i] > s1) break;
      if (s0 != null && this.c[i + 1] < s0) continue;
      var a = this.p[i], b = this.p[i + 1], ab = sub(b, a), L2 = ab.x * ab.x + ab.y * ab.y;
      var t = L2 ? clamp(((q.x - a.x) * ab.x + (q.y - a.y) * ab.y) / L2, 0, 1) : 0;
      var d = dist(lerpP(a, b, t), q);
      if (d < best.d - 1e-6) best = { s: this.c[i] + t * Math.sqrt(L2), d: d };
    }
    return best;
  };
  Path.prototype.slice = function (s0, s1) {
    var pts = [this.pos(s0)];
    for (var i = 0; i < this.p.length; i++) if (this.c[i] > s0 && this.c[i] < s1) pts.push(this.p[i]);
    pts.push(this.pos(s1));
    return pts;
  };
  // first s where the path crosses svg-y == Y (for lanes that are monotonic in y)
  Path.prototype.sAtY = function (Y) {
    var p = this.p;
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i].y, b = p[i + 1].y;
      if ((a - Y) * (b - Y) <= 0 && a !== b) return this.c[i] + (this.c[i + 1] - this.c[i]) * (Y - a) / (b - a);
    }
    // outside: extrapolate from the closest end
    var d0 = Math.abs(p[0].y - Y), d1 = Math.abs(p[p.length - 1].y - Y);
    if (d0 < d1) { var v0 = this.dir(0); return v0.y ? (Y - p[0].y) / v0.y : 0; }
    var v1 = this.dir(this.length); return this.length + (v1.y ? (Y - p[p.length - 1].y) / v1.y : 0);
  };

  // ------------------------------------------------------------------ SVG helpers
  function E(tag, attrs, parent) {
    var el = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function dOf(pts, close) {
    var s = '';
    for (var i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + f2(pts[i].x) + ' ' + f2(pts[i].y);
    return s + (close ? 'Z' : '');
  }
  function G(parent, attrs) { return E('g', attrs, parent); }
  function tr(x, y, rot, sc) {
    return 'translate(' + f2(x) + ' ' + f2(y) + ')' + (rot ? ' rotate(' + f2(rot) + ')' : '') + (sc && sc !== 1 ? ' scale(' + f2(sc) + ')' : '');
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function setA(el, k, v) { if (el && el.__c !== undefined && el.__c[k] === v) return; if (!el) return; if (!el.__c) el.__c = {}; el.__c[k] = v; el.setAttribute(k, v); }
  function show(el, on) { setA(el, 'display', on ? 'inline' : 'none'); }

  // Strip Arabic diacritics that BRIEF section 4 forbids (defensive, for labels we draw)
  function cleanAr(s) { return String(s == null ? '' : s).replace(/[ًٌٍّ]/g, ''); }

  // ================================================================== drawing kit (static scenery)
  // Every function draws into an SVG group `g` using SVG coordinates (y down, metres).

  var LINE_W = 0.2;            // longitudinal line width
  var DASH = '3 5';            // broken lane line pattern (m)

  // closed road outline: pavement band, kerb, then asphalt fill on top
  function paintOutline(g, pts, o) {
    o = o || {};
    var d = dOf(pts, true);
    if (o.pave !== false) E('path', { d: d, fill: 'none', stroke: o.paveColor || COL.pave, 'stroke-width': (o.paveW || 2.6) * 2, 'stroke-linejoin': 'round' }, g);
    E('path', { d: d, fill: 'none', stroke: COL.kerb, 'stroke-width': 0.55, 'stroke-linejoin': 'round' }, g);
    E('path', { d: d, fill: o.fill || COL.asphalt, stroke: 'none' }, g);
  }

  // longitudinal line along a polyline. type: solid | broken | double | mixed (solid on `solidSide`)
  function markLine(g, pts, type, color, o) {
    o = o || {};
    color = color || COL.white;
    var w = o.w || LINE_W, d;
    if (type === 'none' || !type) return;
    if (type === 'double' || type === 'mixed' || type === 'solid-broken' || type === 'broken-solid') {
      var off = w * 0.9 + 0.08;
      var left = offsetPts(pts, -off), right = offsetPts(pts, off);
      var leftType = 'solid', rightType = 'solid';
      if (type === 'solid-broken') { leftType = 'solid'; rightType = 'broken'; }
      if (type === 'broken-solid') { leftType = 'broken'; rightType = 'solid'; }
      if (type === 'mixed') { leftType = o.solidSide === 'right' ? 'broken' : 'solid'; rightType = o.solidSide === 'right' ? 'solid' : 'broken'; }
      markLine(g, left, leftType, color, { w: w, dash: o.dash });
      markLine(g, right, rightType, color, { w: w, dash: o.dash });
      return;
    }
    d = dOf(pts);
    E('path', {
      d: d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'butt',
      'stroke-dasharray': type === 'broken' ? (o.dash || DASH) : null, 'stroke-dashoffset': o.dashOffset || null
    }, g);
  }

  // painted lane arrow, local drawing points up; `kind`: straight,left,right,uturn and '+' combos
  function laneArrow(g, pos, bearing, kind, o) {
    o = o || {};
    var a = G(g, { transform: tr(pos.x, pos.y, bearing, o.scale || 1), opacity: 0.92 });
    var parts = String(kind || 'straight').split('+'), sw = 0.34, col = COL.white;
    function head(x, y, dirDeg) { E('path', { d: 'M0 -0.75 L0.62 0.25 L-0.62 0.25 Z', fill: col, transform: tr(x, y, dirDeg) }, a); }
    E('path', { d: 'M0 2.6 L0 0.6', stroke: col, 'stroke-width': sw, fill: 'none' }, a);
    parts.forEach(function (k) {
      if (k === 'straight') { E('path', { d: 'M0 0.7 L0 -1.6', stroke: col, 'stroke-width': sw, fill: 'none' }, a); head(0, -1.9, 0); }
      else if (k === 'right') { E('path', { d: 'M0 0.7 Q0 -0.55 1.05 -0.55', stroke: col, 'stroke-width': sw, fill: 'none' }, a); head(1.25, -0.55, 90); }
      else if (k === 'left') { E('path', { d: 'M0 0.7 Q0 -0.55 -1.05 -0.55', stroke: col, 'stroke-width': sw, fill: 'none' }, a); head(-1.25, -0.55, 270); }
      else if (k === 'uturn') { E('path', { d: 'M0 0.7 L0 -0.8 A0.75 0.75 0 0 0 -1.5 -0.8 L-1.5 0.2', stroke: col, 'stroke-width': sw, fill: 'none' }, a); head(-1.5, 0.45, 180); }
    });
    return a;
  }

  // zebra crossing: a -> b is the walking line across the road, depth = stripe length along the road
  function zebraMark(g, a, b, depth) {
    var v = norm(sub(b, a)), n = rightOf(v), L = dist(a, b), step = 1.0, sw = 0.55;
    var grp = G(g, { opacity: 0.95 });
    for (var t = 0.35; t < L - 0.2; t += step) {
      var c = add(a, mul(v, t));
      var p1 = add(c, mul(n, -depth / 2)), p2 = add(c, mul(n, depth / 2));
      E('line', { x1: f2(p1.x), y1: f2(p1.y), x2: f2(p2.x), y2: f2(p2.y), stroke: COL.white, 'stroke-width': sw }, grp);
    }
    return grp;
  }

  function stopLine(g, a, b, w) {
    E('line', { x1: f2(a.x), y1: f2(a.y), x2: f2(b.x), y2: f2(b.y), stroke: COL.white, 'stroke-width': w || 0.5 }, g);
  }
  function giveLine(g, pts) {
    E('path', { d: dOf(pts), fill: 'none', stroke: COL.white, 'stroke-width': 0.4, 'stroke-dasharray': '0.9 0.55' }, g);
  }
  // painted give-way triangle, apex towards the approaching driver
  function gwTriangle(g, pos, bearing) {
    E('path', { d: 'M0 2.3 L0.85 -2.1 L-0.85 -2.1 Z', fill: 'none', stroke: COL.white, 'stroke-width': 0.26, opacity: 0.9, transform: tr(pos.x, pos.y, bearing) }, g);
  }

  // top-down palm tree
  function palm(g, x, y, r, seed) {
    var rnd = rng(seed || hash(x + ':' + y)), grp = G(g, { transform: tr(x, y, rnd() * 360) });
    E('circle', { cx: 0.5, cy: 0.7, r: r * 0.95, fill: COL.shadow, opacity: 0.28 }, grp);
    var n = 8, i;
    for (i = 0; i < n; i++) {
      var ang = i * 360 / n + rnd() * 16, L = r * (0.85 + rnd() * 0.25);
      var leaf = 'M0 0 Q' + f2(L * 0.28) + ' ' + f2(-L * 0.5) + ' 0 ' + f2(-L) + ' Q' + f2(-L * 0.28) + ' ' + f2(-L * 0.5) + ' 0 0Z';
      E('path', { d: leaf, fill: i % 2 ? COL.palm : '#357A42', transform: 'rotate(' + f2(ang) + ')' }, grp);
      E('path', { d: 'M0 0 L0 ' + f2(-L * 0.92), stroke: COL.palmLight, 'stroke-width': 0.08, transform: 'rotate(' + f2(ang) + ')' }, grp);
    }
    E('circle', { cx: 0, cy: 0, r: r * 0.16, fill: COL.trunk }, grp);
    return grp;
  }
  function shrub(g, x, y, r) {
    E('circle', { cx: f2(x + 0.25), cy: f2(y + 0.3), r: f2(r), fill: COL.shadow, opacity: 0.25 }, g);
    E('circle', { cx: f2(x), cy: f2(y), r: f2(r), fill: '#3D5F34' }, g);
    E('circle', { cx: f2(x - r * 0.25), cy: f2(y - r * 0.25), r: f2(r * 0.45), fill: '#4F7843' }, g);
  }
  function lamp(g, x, y) {
    E('circle', { cx: f2(x), cy: f2(y), r: 0.22, fill: '#6B7380' }, g);
  }

  // ---- traffic signs (upright icons standing on the verge)
  function fallbackSign(kind) {
    switch (kind) {
      case 'stop':
        return '<svg xmlns="' + NS + '" viewBox="0 0 100 100"><polygon points="30,3 70,3 97,30 97,70 70,97 30,97 3,70 3,30" fill="#FFFFFF"/><polygon points="32,8 68,8 92,32 92,68 68,92 32,92 8,68 8,32" fill="' + COL.red + '"/><text x="50" y="56" font-size="27" font-weight="700" font-family="' + LATIN + '" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">STOP</text></svg>';
      case 'giveway':
        return '<svg xmlns="' + NS + '" viewBox="0 0 100 92"><polygon points="4,6 96,6 50,88" fill="' + COL.red + '"/><polygon points="22,17 78,17 50,66" fill="#FFFFFF"/></svg>';
      case 'uturn':
        return '<svg xmlns="' + NS + '" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="' + COL.blue + '"/><path d="M62 78 L62 42 A13 13 0 0 0 36 42 L36 58" fill="none" stroke="#FFFFFF" stroke-width="9"/><polygon points="24,56 48,56 36,74" fill="#FFFFFF"/></svg>';
      case 'roundabout':
        return '<svg xmlns="' + NS + '" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="' + COL.blue + '"/><circle cx="50" cy="50" r="20" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-dasharray="26 5"/></svg>';
      case 'works':
        return '<svg xmlns="' + NS + '" viewBox="0 0 100 92"><polygon points="50,4 97,88 3,88" fill="' + COL.red + '"/><polygon points="50,20 83,79 17,79" fill="' + COL.orange + '"/><path d="M40 70 L52 48 M56 70 L50 56" stroke="#151515" stroke-width="6"/><circle cx="56" cy="44" r="5" fill="#151515"/></svg>';
      case 'school':
        return '<svg xmlns="' + NS + '" viewBox="0 0 100 92"><polygon points="50,4 97,88 3,88" fill="' + COL.red + '"/><polygon points="50,20 83,79 17,79" fill="#FFFFFF"/><circle cx="43" cy="44" r="5" fill="#151515"/><circle cx="58" cy="50" r="4" fill="#151515"/><path d="M40 72 L44 52 M56 72 L58 56" stroke="#151515" stroke-width="5"/></svg>';
      case 'hump':
        return '<svg xmlns="' + NS + '" viewBox="0 0 100 92"><polygon points="50,4 97,88 3,88" fill="' + COL.red + '"/><polygon points="50,20 83,79 17,79" fill="#FFFFFF"/><path d="M28 70 Q50 44 72 70 Z" fill="#151515"/></svg>';
      case 'pedestrian':
        return '<svg xmlns="' + NS + '" viewBox="0 0 100 100"><rect x="4" y="4" width="92" height="92" rx="8" fill="' + COL.blue + '"/><polygon points="50,12 88,84 12,84" fill="#FFFFFF"/><circle cx="52" cy="42" r="5" fill="#151515"/><path d="M50 50 L46 64 L40 76 M46 64 L56 76" stroke="#151515" stroke-width="5" fill="none"/></svg>';
      default:
        return '<svg xmlns="' + NS + '" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#FFFFFF" stroke="' + COL.red + '" stroke-width="8"/><text x="50" y="54" font-size="30" font-family="' + LATIN + '" fill="#151515" text-anchor="middle" dominant-baseline="middle">?</text></svg>';
    }
  }
  var SIGN_ALIAS = { stop: ['p-stop'], giveway: ['p-give-way', 'p-giveway', 'p-yield'], uturn: ['m-u-turn', 'm-uturn', 'i-u-turn'], roundabout: ['m-roundabout'], works: ['t-road-works', 't-works', 'w-road-works'], school: ['w-school', 'w-children'], hump: ['w-hump', 'w-speed-hump', 'w-bump'], pedestrian: ['i-pedestrian-crossing', 'i-crossing'] };
  function signMarkup(id) {
    var S = window.Signs, cands = SIGN_ALIAS[id] || [id];
    try {
      if (S && typeof S.has === 'function' && typeof S.render === 'function') {
        for (var i = 0; i < cands.length; i++) if (S.has(cands[i])) return S.render(cands[i]);
        if (!SIGN_ALIAS[id] && S.has(id)) return S.render(id);
        if (!SIGN_ALIAS[id]) return S.render(id); // placeholder from the registry
      }
    } catch (e) { /* fall through */ }
    return fallbackSign(id);
  }
  function parseSvg(str) {
    try {
      var doc = new DOMParser().parseFromString(str, 'image/svg+xml');
      var root = doc.documentElement;
      if (!root || root.nodeName.toLowerCase() !== 'svg') return null;
      return document.importNode(root, true);
    } catch (e) { return null; }
  }
  // sign icon standing at `pos` (the pole foot); size in metres (drawn upright, screen-aligned)
  function signIcon(g, id, pos, size) {
    size = size || 2.6;
    var grp = G(g, { 'class': 'mq-sign' });
    E('ellipse', { cx: f2(pos.x + 0.3), cy: f2(pos.y + 0.2), rx: 0.35, ry: 0.2, fill: COL.shadow, opacity: 0.4 }, grp);
    E('line', { x1: f2(pos.x), y1: f2(pos.y), x2: f2(pos.x), y2: f2(pos.y - size * 0.55), stroke: '#8B939E', 'stroke-width': 0.16 }, grp);
    var node = parseSvg(signMarkup(id));
    if (node) {
      node.removeAttribute('class');
      node.setAttribute('x', f2(pos.x - size / 2));
      node.setAttribute('y', f2(pos.y - size * 0.55 - size));
      node.setAttribute('width', f2(size));
      node.setAttribute('height', f2(size));
      node.setAttribute('overflow', 'visible');
      grp.appendChild(node);
    }
    return grp;
  }

  function cone(g, x, y) {
    E('rect', { x: f2(x - 0.42), y: f2(y - 0.42), width: 0.84, height: 0.84, rx: 0.12, fill: '#1B1B1B' }, g);
    E('circle', { cx: f2(x), cy: f2(y), r: 0.36, fill: COL.orange }, g);
    E('circle', { cx: f2(x), cy: f2(y), r: 0.22, fill: '#F4F4F0' }, g);
    E('circle', { cx: f2(x), cy: f2(y), r: 0.11, fill: COL.orange }, g);
  }

  // traffic signal head: drawn lying flat, facing drivers travelling on `bearing` (red lamp farthest)
  function signalHead(g, pos, bearing, o) {
    o = o || {};
    var grp = G(g, { transform: tr(pos.x, pos.y, bearing) });
    E('rect', { x: -0.95, y: -2.15, width: 1.9, height: 4.3, rx: 0.45, fill: '#0B0D10', stroke: '#454C57', 'stroke-width': 0.14 }, grp);
    var lamps = {}, spec = [['red', -1.35, '#FF4A3D'], ['amber', 0, '#FFB52E'], ['green', 1.35, '#3CE08A']];
    spec.forEach(function (s) {
      var halo = E('circle', { cx: 0, cy: s[1], r: 1.5, fill: s[2], opacity: 0.28, display: 'none' }, grp);
      var ring = E('circle', { cx: 0, cy: s[1], r: 0.95, fill: 'none', stroke: s[2], 'stroke-width': 0.14, 'stroke-dasharray': '0.35 0.3', display: 'none' }, grp);
      var off = E('circle', { cx: 0, cy: s[1], r: 0.55, fill: '#262A30' }, grp);
      var on = E('circle', { cx: 0, cy: s[1], r: 0.58, fill: s[2], display: 'none' }, grp);
      lamps[s[0]] = { on: on, off: off, halo: halo, ring: ring };
    });
    // filter arrows (green arrow lamps) on each side of the green lamp
    [['left', -1.95], ['right', 1.95]].forEach(function (a) {
      var ag = G(grp, { transform: tr(a[1], 1.35, 0) });
      E('rect', { x: -0.72, y: -0.72, width: 1.44, height: 1.44, rx: 0.3, fill: '#0B0D10', stroke: '#454C57', 'stroke-width': 0.12 }, ag);
      var halo = E('circle', { cx: 0, cy: 0, r: 1.3, fill: '#3CE08A', opacity: 0.28, display: 'none' }, ag);
      var rot = a[0] === 'left' ? 270 : 90;
      var off = E('path', { d: 'M-0.35 0.1 L0.25 0.1 M0.02 -0.25 L0.38 0.1 L0.02 0.45', stroke: '#2E3238', 'stroke-width': 0.2, fill: 'none', transform: 'rotate(' + (rot - 90) + ')' }, ag);
      var on = E('path', { d: 'M-0.4 0.1 L0.3 0.1 M0.0 -0.32 L0.45 0.1 L0.0 0.52', stroke: '#3CE08A', 'stroke-width': 0.26, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: 'rotate(' + (rot - 90) + ')', display: 'none' }, ag);
      show(ag, false);
      lamps[a[0]] = { on: on, off: off, halo: halo, box: ag };
    });
    return { g: grp, lamps: lamps };
  }

  function busShelter(g, pos, bearing) {
    var grp = G(g, { transform: tr(pos.x, pos.y, bearing) });
    E('rect', { x: -0.9, y: -3, width: 1.8, height: 6, fill: COL.shadow, opacity: 0.3, transform: 'translate(0.3 0.3)' }, grp);
    E('rect', { x: -0.9, y: -3, width: 1.8, height: 6, rx: 0.2, fill: '#3F6E8F', stroke: '#9CC3DA', 'stroke-width': 0.12 }, grp);
    E('rect', { x: -0.55, y: -2.5, width: 1.1, height: 5, rx: 0.1, fill: '#5A89A8' }, grp);
    return grp;
  }

  // speed hump across a -> b (depth along the road)
  function humpMark(g, a, b, depth) {
    var v = norm(sub(b, a)), n = rightOf(v), L = dist(a, b);
    var c0 = add(a, mul(n, -depth / 2));
    var grp = G(g);
    var poly = [c0, add(c0, mul(v, L)), add(add(c0, mul(v, L)), mul(n, depth)), add(c0, mul(n, depth))];
    E('path', { d: dOf(poly, true), fill: '#3A3F48' }, grp);
    for (var t = 0.3; t < L - 0.6; t += 1.2) {
      var p1 = add(c0, mul(v, t)), p2 = add(add(c0, mul(v, t + 0.6)), mul(n, depth));
      var p3 = add(add(c0, mul(v, t + 1.2)), mul(n, depth)), p4 = add(c0, mul(v, t + 0.6));
      E('path', { d: dOf([p1, p4, p3, p2], true), fill: COL.yellow, opacity: 0.9 }, grp);
    }
    return grp;
  }

  // yellow box junction
  function boxJunction(g, x0, y0, x1, y1, K) {
    var grp = G(g, { opacity: 0.9 });
    var cid = K.id('box');
    var cp = E('clipPath', { id: cid }, K.defs);
    E('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, cp);
    var inner = G(grp, { 'clip-path': 'url(#' + cid + ')' });
    var span = (x1 - x0) + (y1 - y0), step = 2.2;
    for (var t = -span; t < span; t += step) {
      E('line', { x1: x0 + t, y1: y0, x2: x0 + t + (y1 - y0), y2: y1, stroke: COL.yellow, 'stroke-width': 0.2 }, inner);
      E('line', { x1: x1 - t, y1: y0, x2: x1 - t - (y1 - y0), y2: y1, stroke: COL.yellow, 'stroke-width': 0.2 }, inner);
    }
    E('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: 'none', stroke: COL.yellow, 'stroke-width': 0.28 }, grp);
    return grp;
  }

  // diagonal hatching (gore areas, closed lanes) inside a polygon
  function hatch(g, pts, color, K, spacing) {
    var cid = K.id('hatch');
    var cp = E('clipPath', { id: cid }, K.defs);
    E('path', { d: dOf(pts, true) }, cp);
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var grp = G(g, { 'clip-path': 'url(#' + cid + ')' });
    var span = (x1 - x0) + (y1 - y0);
    for (var t = 0; t < span; t += (spacing || 2)) E('line', { x1: f2(x0 + t), y1: f2(y0), x2: f2(x0 + t - (y1 - y0)), y2: f2(y1), stroke: color || COL.white, 'stroke-width': 0.3 }, grp);
    E('path', { d: dOf(pts, true), fill: 'none', stroke: color || COL.white, 'stroke-width': 0.22 }, g);
    return grp;
  }

  // low building / wall blocks for city scenery
  function block(g, x0, y0, x1, y1, seed) {
    if (x1 - x0 < 3 || y1 - y0 < 3) return;
    var rnd = rng(seed);
    E('rect', { x: f2(x0 + 0.6), y: f2(y0 + 0.8), width: f2(x1 - x0), height: f2(y1 - y0), fill: COL.shadow, opacity: 0.35 }, g);
    E('rect', { x: f2(x0), y: f2(y0), width: f2(x1 - x0), height: f2(y1 - y0), rx: 0.4, fill: COL.building, stroke: '#3A404A', 'stroke-width': 0.2 }, g);
    var ix = Math.min(1.6, (x1 - x0) / 4), iy = Math.min(1.6, (y1 - y0) / 4);
    E('rect', { x: f2(x0 + ix), y: f2(y0 + iy), width: f2(x1 - x0 - 2 * ix), height: f2(y1 - y0 - 2 * iy), rx: 0.3, fill: COL.roof }, g);
    if (x1 - x0 > 8 && y1 - y0 > 8) {
      var ux = x0 + ix + 1 + rnd() * (x1 - x0 - 2 * ix - 4), uy = y0 + iy + 1 + rnd() * (y1 - y0 - 2 * iy - 4);
      E('rect', { x: f2(ux), y: f2(uy), width: 2.2, height: 1.6, rx: 0.2, fill: '#3B414B' }, g);
    }
  }

  // ================================================================== geometry model
  var BEAR = { N: 0, E: 90, S: 180, W: 270 };
  var ARMS = ['N', 'E', 'S', 'W'];
  var SIDES = { north: 0, east: 90, south: 180, west: 270 };
  function compass(v) { var b = bOf(v); return b < 45 || b >= 315 ? 'north' : b < 135 ? 'east' : b < 225 ? 'south' : 'west'; }
  function toSvg(x, y) { return P(x, -y); }

  function Geo(tpl, p) {
    this.tpl = tpl; this.p = p;
    this.lanes = {}; this.laneList = []; this.groups = {};
    this.crossings = {}; this.signals = {}; this.arms = {}; this.bays = {};
    this.routeCache = {}; this.draw = []; this.parked = [];
    this.view = { x: -30, y: -30, w: 60, h: 60 };
    this.origin = 'centre';
  }
  Geo.prototype.addLane = function (id, pts, o) {
    o = o || {};
    var L = { id: id, path: new Path(pts), kind: o.kind || 'lane', group: o.group || null, k: o.k, n: o.n,
      arm: o.arm || null, dir: o.dir || null, line: o.line, w: o.w || LW, name: o.name || null };
    this.lanes[id] = L; this.laneList.push(L);
    if (L.group != null) { var gr = this.groups[L.group] || (this.groups[L.group] = { lanes: {}, n: 0 }); gr.lanes[L.k] = L; if (L.k > gr.n) gr.n = L.k; }
    return L;
  };
  Geo.prototype.neighbour = function (L, side) {
    var gr = L && this.groups[L.group];
    if (!gr) return null;
    return gr.lanes[L.k + (side === 'left' ? 1 : -1)] || null;
  };

  // ---- parameter helpers (push readable errors, always return something usable)
  function pNum(p, key, def, lo, hi, errs) {
    var v = p[key];
    if (v == null) return def;
    if (!isNum(v)) { errs.push('params.' + key + ' must be a number (got ' + JSON.stringify(v) + ')'); return def; }
    if (v < lo || v > hi) { errs.push('params.' + key + ' must be between ' + lo + ' and ' + hi + ' (got ' + v + ')'); return clamp(v, lo, hi); }
    return v;
  }
  function pInt(v, def, lo, hi, errs, where) {
    if (v == null) return def;
    if (!isNum(v) || Math.round(v) !== v) { errs.push(where + ' must be a whole number (got ' + JSON.stringify(v) + ')'); return def; }
    if (v < lo || v > hi) { errs.push(where + ' must be between ' + lo + ' and ' + hi + ' (got ' + v + ')'); return clamp(v, lo, hi); }
    return v;
  }
  function pEnum(v, def, list, errs, where) {
    if (v == null) return def;
    if (list.indexOf(v) < 0) { errs.push(where + ' must be one of ' + list.join(', ') + ' (got ' + JSON.stringify(v) + ')'); return def; }
    return v;
  }
  function pBool(v, def, errs, where) {
    if (v == null) return def;
    if (typeof v !== 'boolean') { errs.push(where + ' must be true or false'); return def; }
    return v;
  }
  // value given for all arms, or an object keyed by arm letter
  function perArm(v, arms, def, fn, errs, where) {
    var out = {};
    arms.forEach(function (a) { out[a] = def; });
    if (v == null) return out;
    if (isObj(v) && !('in' in v) && !('out' in v) && !('main' in v) && !('type' in v)) {
      Object.keys(v).forEach(function (k) {
        if (arms.indexOf(k) < 0) { errs.push(where + ': arm "' + k + '" does not exist (arms: ' + arms.join(', ') + ')'); return; }
        out[k] = fn(v[k], where + '.' + k);
      });
    } else arms.forEach(function (a) { out[a] = fn(v, where); });
    return out;
  }
  function knownKeys(obj, keys, errs, where) {
    if (!isObj(obj)) return;
    Object.keys(obj).forEach(function (k) { if (keys.indexOf(k) < 0 && k.charAt(0) !== '_') errs.push(where + ': unknown key "' + k + '" (allowed: ' + keys.join(', ') + ')'); });
  }

  // ---- shared scenery helpers
  function groundRect(g, v, color) {
    E('rect', { x: v.x - 20, y: v.y - 20, width: v.w + 40, height: v.h + 40, fill: color || COL.ground }, g);
  }
  function speckle(g, v, seed, color, n) {
    var rnd = rng(seed), d = '';
    for (var i = 0; i < (n || 160); i++) {
      var x = v.x + rnd() * v.w, y = v.y + rnd() * v.h, r = 0.12 + rnd() * 0.25;
      d += 'M' + f2(x - r) + ' ' + f2(y) + 'a' + f2(r) + ' ' + f2(r) + ' 0 1 0 ' + f2(2 * r) + ' 0a' + f2(r) + ' ' + f2(r) + ' 0 1 0 ' + f2(-2 * r) + ' 0';
    }
    E('path', { d: d, fill: color || '#2A2822', opacity: 0.6 }, g);
  }

  // ================================================================== template: road (and uturn base)
  var ROAD_KEYS = ['lanes', 'divided', 'median', 'line', 'center', 'center_color', 'edges', 'shoulder', 'zebra', 'bus_stop',
    'parked', 'works', 'hump', 'signs', 'len', 'width', 'scenery', 'opening', 'markings'];

  function readLanesUD(v, errs, allowZeroDown) {
    if (v == null) return { up: 2, down: 2 };
    if (isNum(v)) { var n = pInt(v, 2, 1, 4, errs, 'params.lanes'); return { up: n, down: n }; }
    if (isObj(v)) {
      knownKeys(v, ['up', 'down'], errs, 'params.lanes');
      return { up: pInt(v.up, 2, 1, 4, errs, 'params.lanes.up'), down: pInt(v.down, 2, allowZeroDown ? 0 : 1, 4, errs, 'params.lanes.down') };
    }
    errs.push('params.lanes must be a number (1-4) or {"up":n,"down":m}');
    return { up: 2, down: 2 };
  }
  function perDir(v, def, fn, errs, where) {
    var out = { up: def, down: def };
    if (v == null) return out;
    if (isObj(v) && ('up' in v || 'down' in v)) {
      knownKeys(v, ['up', 'down'], errs, where);
      if ('up' in v) out.up = fn(v.up, where + '.up');
      if ('down' in v) out.down = fn(v.down, where + '.down');
      return out;
    }
    out.up = out.down = fn(v, where);
    return out;
  }
  var LINE_TYPES = ['broken', 'solid', 'double', 'none', 'mixed-right', 'mixed-left'];

  function buildRoad(p, errs, tpl) {
    var geo = new Geo(tpl || 'road', p);
    geo.origin = 'bottom';
    knownKeys(p, ROAD_KEYS, errs, 'params');
    var isU = tpl === 'uturn';
    var lanes = readLanesUD(p.lanes, errs, !isU);
    var len = 60; // provisional, recomputed below once the cross-section is known
    var divided = isU ? true : pBool(p.divided, false, errs, 'params.divided');
    if (lanes.down === 0) divided = false;
    var med = isObj(p.median) ? p.median : {};
    if (p.median != null && !isObj(p.median)) errs.push('params.median must be an object like {"width":4,"barrier":false,"palms":true}');
    knownKeys(med, ['width', 'barrier', 'palms'], errs, 'params.median');
    var medW = divided ? pNum(med, 'width', isU ? 7 : 4, 1, 16, errs) : 0;
    var mh = medW / 2;
    var barrier = pBool(med.barrier, false, errs, 'params.median.barrier');
    var palms = pBool(med.palms, medW >= 3, errs, 'params.median.palms');
    // line between lanes of one direction: a type for every gap, or a list (gap 1|2 first, from the kerb side)
    var lineT = perDir(p.line, 'broken', function (x, w) {
      if (Array.isArray(x)) return x.map(function (t, i) { return pEnum(t, 'broken', LINE_TYPES, errs, w + '[' + i + ']'); });
      return pEnum(x, 'broken', LINE_TYPES, errs, w);
    }, errs, 'params.line');
    var center = p.center == null ? 'broken' : p.center;
    var centerSolidSide = null;
    if (isObj(center)) {
      knownKeys(center, ['type', 'broken_for'], errs, 'params.center');
      if (center.type !== 'mixed') errs.push('params.center object form is {"type":"mixed","broken_for":"up"|"down"}');
      var bf = pEnum(center.broken_for, 'up', ['up', 'down'], errs, 'params.center.broken_for');
      // the side of the line nearer to the "up" carriageway is the east side (right of the line going north)
      centerSolidSide = bf === 'up' ? 'left' : 'right';
      center = 'mixed';
    } else center = pEnum(center, 'broken', ['broken', 'solid', 'double', 'none'], errs, 'params.center');
    var centerColor = pEnum(p.center_color, 'white', ['white', 'yellow'], errs, 'params.center_color') === 'yellow' ? COL.yellow : COL.white;
    var edges = isObj(p.edges) ? p.edges : {};
    knownKeys(edges, ['left', 'right'], errs, 'params.edges');
    var edgeL = pEnum(edges.left, 'yellow', ['yellow', 'white', 'none'], errs, 'params.edges.left');
    var edgeR = pEnum(edges.right, 'white', ['yellow', 'white', 'none'], errs, 'params.edges.right');
    var shoulder = perDir(p.shoulder, false, function (x, w) { return pBool(x, false, errs, w); }, errs, 'params.shoulder');
    var markings = pEnum(p.markings, 'all', ['all', 'none'], errs, 'params.markings');
    var scenery = pEnum(p.scenery, 'city', ['city', 'desert', 'none'], errs, 'params.scenery');

    // parked cars (scenery) along the right kerb of a direction
    var parked = { up: [], down: [] };
    if (p.parked != null) {
      if (!isObj(p.parked)) errs.push('params.parked must be {"up":[y,...],"down":[y,...]}');
      else {
        knownKeys(p.parked, ['up', 'down', 'colors'], errs, 'params.parked');
        ['up', 'down'].forEach(function (dname) {
          var v = p.parked[dname];
          if (v == null) return;
          if (!Array.isArray(v)) { errs.push('params.parked.' + dname + ' must be a list of y positions (metres from the bottom edge)'); return; }
          v.forEach(function (y, i) { if (!isNum(y)) errs.push('params.parked.' + dname + '[' + i + '] must be a number'); else parked[dname].push(y); });
        });
      }
    }
    var hasPark = { up: parked.up.length > 0, down: parked.down.length > 0 };
    ['up', 'down'].forEach(function (dname) {
      if (hasPark[dname] && shoulder[dname]) errs.push('params: a carriageway cannot have both a hard shoulder and parked cars (' + dname + ')');
    });
    var n = { up: lanes.up, down: lanes.down };
    var SHW = 2.8, PKW = 2.6;
    var sideSign = { up: 1, down: -1 };
    var extra = {}, kerb = {};
    ['up', 'down'].forEach(function (dn) {
      extra[dn] = n[dn] === 0 ? 0 : (shoulder[dn] ? SHW : (hasPark[dn] ? PKW : 0));
    });
    // one-way road: keep it centred
    var shiftX = 0;
    if (n.down === 0) shiftX = -(n.up * LW + extra.up) / 2;
    function laneX(dn, k) { return sideSign[dn] * (mh + (n[dn] - k + 0.5) * LW) + shiftX; }
    function edgeX(dn) { return sideSign[dn] * (mh + n[dn] * LW) + shiftX; }
    ['up', 'down'].forEach(function (dn) { kerb[dn] = n[dn] ? edgeX(dn) + sideSign[dn] * extra[dn] : (dn === 'down' ? shiftX : 0); });
    if (n.down === 0) kerb.down = shiftX - 0.0;
    var PAVE = 3;
    var span = kerb.up - kerb.down + 2 * PAVE;
    len = pNum(p, 'len', isU ? 70 : clamp(Math.round((span + 14) / 0.72), 40, 90), 20, 200, errs);
    var width = pNum(p, 'width', Math.max(span + 10, len * 0.72), 20, 240, errs);
    var cx = (kerb.up + kerb.down) / 2;
    width = Math.max(width, kerb.up - kerb.down + 2 * PAVE + 4);
    geo.view = { x: cx - width / 2, y: -len, w: width, h: len };
    var M = 12, y0 = M, y1 = -len - M; // svg y of lane path ends (beyond the view)

    // lanes
    ['up', 'down'].forEach(function (dn) {
      for (var k = 1; k <= n[dn]; k++) {
        var x = laneX(dn, k), a = P(x, y0), b = P(x, y1);
        geo.addLane(dn + '.' + k, dn === 'up' ? [a, b] : [b, a], { group: dn, k: k, n: n[dn], dir: dn, kind: 'road' });
      }
      if (n[dn] && extra[dn]) {
        var xs = edgeX(dn) + sideSign[dn] * extra[dn] / 2, a2 = P(xs, y0), b2 = P(xs, y1);
        geo.addLane(dn + '.0', dn === 'up' ? [a2, b2] : [b2, a2], { group: dn, k: 0, n: n[dn], dir: dn, kind: shoulder[dn] ? 'shoulder' : 'parking', w: extra[dn] });
      }
    });
    geo.dirs = n; geo.kerb = kerb; geo.laneX = laneX; geo.edgeX = edgeX; geo.mh = mh; geo.len = len; geo.shiftX = shiftX;

    // zebra
    var zebra = null;
    if (p.zebra != null) {
      var zy = isNum(p.zebra) ? p.zebra : (isObj(p.zebra) ? p.zebra.y : null);
      if (isObj(p.zebra)) knownKeys(p.zebra, ['y'], errs, 'params.zebra');
      if (!isNum(zy)) errs.push('params.zebra must be {"y": metres from the bottom edge}');
      else {
        zebra = { y: zy, depth: 4 };
        var za = P(kerb.down - 1.2, -zy), zb = P(kerb.up + 1.2, -zy);
        geo.crossings.zebra = { a: za, b: zb, depth: 4, sides: { west: za, east: zb } };
      }
    }
    // bus stop bay
    var bus = null;
    if (p.bus_stop != null) {
      if (!isObj(p.bus_stop) || !isNum(p.bus_stop.y)) errs.push('params.bus_stop must be {"y": n, "dir": "up"|"down"}');
      else {
        knownKeys(p.bus_stop, ['y', 'dir'], errs, 'params.bus_stop');
        bus = { y: p.bus_stop.y, dir: pEnum(p.bus_stop.dir, 'up', ['up', 'down'], errs, 'params.bus_stop.dir') };
        if (!n[bus.dir]) { errs.push('params.bus_stop: no "' + bus.dir + '" carriageway'); bus = null; }
      }
    }
    if (bus) {
      var sgn = sideSign[bus.dir], bx = kerb[bus.dir] + sgn * 1.6;
      var yb0 = bus.y - 9, yb1 = bus.y + 9;
      var la = [P(bx, -(yb0 - 6)), P(bx, -(yb1 + 6))];
      var bl = geo.addLane(bus.dir + '.bus', bus.dir === 'up' ? la : la.reverse(), { kind: 'bus', dir: bus.dir, w: 3.2 });
      bl.group = null;
      geo.busBay = { dir: bus.dir, x: bx, y0: yb0, y1: yb1 };
    }
    // works
    var works = null;
    if (p.works != null) {
      if (!isObj(p.works)) errs.push('params.works must be {"dir":"up","lane":1,"from":y0,"to":y1}');
      else {
        knownKeys(p.works, ['dir', 'lane', 'from', 'to'], errs, 'params.works');
        var wd = pEnum(p.works.dir, 'up', ['up', 'down'], errs, 'params.works.dir');
        var wk = pInt(p.works.lane, 1, 1, Math.max(1, n[wd]), errs, 'params.works.lane');
        if (!isNum(p.works.from) || !isNum(p.works.to) || p.works.to <= p.works.from) errs.push('params.works needs "from" < "to" (y in metres)');
        else works = { dir: wd, k: wk, from: p.works.from, to: p.works.to };
      }
    }
    var humps = [];
    if (p.hump != null) {
      var hv = isNum(p.hump) ? [p.hump] : (Array.isArray(p.hump) ? p.hump : (isObj(p.hump) ? [p.hump.y] : []));
      hv.forEach(function (y) { if (isNum(y)) humps.push(y); else errs.push('params.hump must be a y value or a list of y values'); });
    }
    var signs = [];
    if (p.signs != null) {
      if (!Array.isArray(p.signs)) errs.push('params.signs must be a list like [{"id":"r-speed-60","dir":"up","y":20}]');
      else p.signs.forEach(function (s, i) {
        if (!isObj(s) || typeof s.id !== 'string' || !isNum(s.y)) { errs.push('params.signs[' + i + '] needs "id" and "y"'); return; }
        knownKeys(s, ['id', 'dir', 'y', 'side'], errs, 'params.signs[' + i + ']');
        signs.push({ id: s.id, dir: pEnum(s.dir, 'up', ['up', 'down'], errs, 'params.signs[' + i + '].dir'), y: s.y, side: s.side });
      });
    }

    // U-turn opening
    var opening = null;
    if (isU) {
      var oy = pNum(p, 'opening', len * 0.45, 5, len - 10, errs);
      var r = (laneX('up', n.up) - laneX('down', n.down)) / 2;
      opening = { y0: oy, y1: oy + 1.5 + r + 3.2, ya: oy + 1.5, r: r, cx: (laneX('up', n.up) + laneX('down', n.down)) / 2 };
      geo.opening = opening;
    }

    // --------------------------------------------------------------- draw
    geo.draw.push(function (L, K) {
      var v = geo.view, gG = L.ground, gR = L.road, gM = L.marks, gF = L.furniture;
      groundRect(gG, v, COL.ground);
      speckle(gG, v, 7, '#26241F', 220);
      var yT = v.y - 20, yB = 20;
      // pavements
      ['up', 'down'].forEach(function (dn) {
        var s = dn === 'up' ? 1 : -1, x0 = kerb[dn], x1 = kerb[dn] + s * PAVE;
        if (n[dn] === 0 && dn === 'down') { x0 = kerb.down; x1 = kerb.down - PAVE; }
        E('rect', { x: f2(Math.min(x0, x1)), y: yT, width: PAVE, height: -yT + yB, fill: COL.pave }, gG);
        for (var yy = 0; yy < len + 20; yy += 2.5) E('line', { x1: f2(x0), y1: f2(-yy), x2: f2(x1), y2: f2(-yy), stroke: COL.paveLine, 'stroke-width': 0.08 }, gG);
      });
      // scenery beyond the pavements
      if (scenery === 'city') {
        [1, -1].forEach(function (s) {
          var xa = (s > 0 ? kerb.up : kerb.down) + s * (PAVE + 2.5), xb = s > 0 ? v.x + v.w + 20 : v.x - 20;
          var yy = -len - 10, i = 0;
          while (yy < 12) {
            var h = 14 + (hash(s + ':' + i) % 12);
            block(gG, Math.min(xa, xb), yy, Math.max(xa, xb), yy + h - 3, hash('b' + s + i));
            yy += h; i++;
          }
          for (var ly = 4; ly < len; ly += 16) lamp(gG, (s > 0 ? kerb.up : kerb.down) + s * 0.9, -ly);
        });
      } else if (scenery === 'desert') {
        for (var sI = 0; sI < 10; sI++) {
          var rr = rng(99 + sI);
          var sx = rr() < 0.5 ? kerb.down - PAVE - 3 - rr() * 14 : kerb.up + PAVE + 3 + rr() * 14;
          shrub(gG, sx, -rr() * len, 0.8 + rr() * 0.9);
        }
      }
      // asphalt
      E('rect', { x: f2(kerb.down), y: yT, width: f2(kerb.up - kerb.down), height: -yT + yB, fill: COL.asphalt }, gR);
      if (geo.busBay) {
        var bb = geo.busBay, s2 = bb.dir === 'up' ? 1 : -1, k0 = kerb[bb.dir], k1 = k0 + s2 * 3.2;
        var poly = [P(k0, -(bb.y0 - 6)), P(k1, -bb.y0), P(k1, -bb.y1), P(k0, -(bb.y1 + 6))];
        if (bb.dir === 'down') poly = [P(k0, -(bb.y0 - 6)), P(k1, -bb.y0), P(k1, -bb.y1), P(k0, -(bb.y1 + 6))];
        E('path', { d: dOf(poly, true), fill: COL.asphalt }, gR);
        E('path', { d: dOf(poly.slice(0)), fill: 'none', stroke: COL.kerb, 'stroke-width': 0.35 }, gR);
        E('text', { x: f2((k0 + k1) / 2), y: f2(-bb.y1 + 2), 'font-size': 1.6, 'font-family': LATIN, 'font-weight': 700, fill: COL.yellow, 'text-anchor': 'middle', transform: 'rotate(' + (s2 > 0 ? -90 : 90) + ' ' + f2((k0 + k1) / 2) + ' ' + f2(-bb.y1 + 2) + ')' }, gM).textContent = 'BUS';
        busShelter(gF, P(k1 + s2 * 1.6, -bus.y), 0);
      }
      // kerb lines
      ['up', 'down'].forEach(function (dn) {
        var x = kerb[dn];
        if (geo.busBay && geo.busBay.dir === dn) {
          var bb2 = geo.busBay;
          E('line', { x1: f2(x), y1: yB, x2: f2(x), y2: f2(-(bb2.y0 - 6)), stroke: COL.kerb, 'stroke-width': 0.45 }, gR);
          E('line', { x1: f2(x), y1: f2(-(bb2.y1 + 6)), x2: f2(x), y2: yT, stroke: COL.kerb, 'stroke-width': 0.45 }, gR);
        } else E('line', { x1: f2(x), y1: yB, x2: f2(x), y2: yT, stroke: COL.kerb, 'stroke-width': 0.45 }, gR);
      });
      // median
      if (divided) {
        var segs = opening ? [[yB, -(opening.y0)], [-(opening.y1), yT]] : [[yB, yT]];
        segs.forEach(function (sg) {
          var ya = sg[0], yb = sg[1];
          var pts = [P(-mh, ya), P(-mh, yb), P(mh, yb), P(mh, ya)];
          E('path', { d: dOf(pts, true), fill: COL.sandDim, stroke: COL.kerb, 'stroke-width': 0.45 }, gR);
          if (barrier) {
            E('rect', { x: -0.35, y: f2(Math.min(ya, yb)), width: 0.7, height: f2(Math.abs(yb - ya)), fill: '#8D949E' }, gR);
            E('line', { x1: 0, y1: f2(ya), x2: 0, y2: f2(yb), stroke: '#B8BEC6', 'stroke-width': 0.18 }, gR);
          }
          if (palms && medW >= 2.6) {
            for (var py = Math.max(yb, v.y - 6) + 4; py < Math.min(ya, 8) - 3; py += 13) palm(gF, 0, py, Math.min(3.2, medW * 0.75), hash('mp' + py));
          }
        });
      }
      if (markings === 'none') return;
      // lane lines
      ['up', 'down'].forEach(function (dn) {
        var s = sideSign[dn];
        var lt = lineT[dn];
        if (Array.isArray(lt) && lt.length !== n[dn] - 1) errs.push('params.line.' + dn + ' needs ' + (n[dn] - 1) + ' entries (one per gap between lanes, gap 1|2 first)');
        for (var g = 1; g < n[dn]; g++) {
          var x = s * (mh + (n[dn] - g) * LW) + shiftX, type = Array.isArray(lt) ? (lt[g - 1] || 'broken') : lt, side = null;
          // the line is drawn northwards: its right side is east. "mixed-right" = broken on the side of the lower (right) lane
          if (type === 'mixed-right' || type === 'mixed-left') {
            var rightLaneIsEast = dn === 'up';
            var solidOnRightLane = type === 'mixed-left';
            side = (solidOnRightLane === rightLaneIsEast) ? 'right' : 'left';
            type = 'mixed';
          }
          markLine(gM, [P(x, yB), P(x, yT)], type, COL.white, { dashOffset: dn === 'up' ? 0 : 4, solidSide: side });
        }
        if (!n[dn]) return;
        // right edge
        var ex = edgeX(dn) - s * 0.3;
        if (hasPark[dn]) {
          markLine(gM, [P(edgeX(dn), yB), P(edgeX(dn), yT)], 'solid', COL.white, { w: 0.15 });
          for (var ty = -4; ty < len + 8; ty += 6.5) E('line', { x1: f2(edgeX(dn)), y1: f2(-ty), x2: f2(edgeX(dn) + s * PKW), y2: f2(-ty), stroke: COL.white, 'stroke-width': 0.14, opacity: 0.8 }, gM);
        } else if (edgeR !== 'none') {
          var exr = shoulder[dn] ? edgeX(dn) + s * 0.15 : ex;
          if (geo.busBay && geo.busBay.dir === dn) {
            var bb3 = geo.busBay;
            markLine(gM, [P(exr, yB), P(exr, -(bb3.y0 - 6))], 'solid', edgeR === 'yellow' ? COL.yellow : COL.white);
            markLine(gM, [P(exr, -(bb3.y0 - 6)), P(exr, -(bb3.y1 + 6))], 'broken', COL.white, { dash: '1 1' });
            markLine(gM, [P(exr, -(bb3.y1 + 6)), P(exr, yT)], 'solid', edgeR === 'yellow' ? COL.yellow : COL.white);
          } else markLine(gM, [P(exr, yB), P(exr, yT)], 'solid', edgeR === 'yellow' ? COL.yellow : COL.white);
        }
        // left edge (divided / one-way)
        if ((divided || n.down === 0) && edgeL !== 'none') {
          var lx = (divided ? s * (mh + 0.3) : shiftX + 0.3);
          if (dn === 'down' && !divided) return;
          var col = edgeL === 'yellow' ? COL.yellow : COL.white;
          if (opening) {
            markLine(gM, [P(lx, yB), P(lx, -opening.y0)], 'solid', col);
            markLine(gM, [P(lx, -opening.y1), P(lx, yT)], 'solid', col);
            if (dn === 'down') giveLine(gM, [P(lx, -opening.y0), P(lx, -opening.y1)]);
          } else markLine(gM, [P(lx, yB), P(lx, yT)], 'solid', col);
        }
      });
      if (!divided && n.down > 0 && center !== 'none') {
        markLine(gM, [P(0, yB), P(0, yT)], center, centerColor, { solidSide: centerSolidSide });
      }
      // parked cars
      ['up', 'down'].forEach(function (dn) {
        parked[dn].forEach(function (y, i) {
          var cols = ['silver', 'white', 'black', 'blue', 'red', 'grey', 'white', 'silver', 'green'];
          var c = cols[hash(dn + i + ':' + y) % cols.length];
          var px = edgeX(dn) + sideSign[dn] * PKW / 2;
          var pg = G(gF, { transform: tr(px, -y, dn === 'up' ? 0 : 180) });
          drawCarBody(pg, { color: c, parked: true });
          geo.parked.push({ x: px, y: -y, h: dn === 'up' ? 0 : 180, len: 4.6, wid: 1.95 });
        });
      });
      // zebra
      if (zebra) {
        zebraMark(gM, P(kerb.down, -zebra.y), P(kerb.up, -zebra.y), zebra.depth);
        signIcon(gF, 'pedestrian', P(kerb.up + 2.2, -(zebra.y - 6.8)), 2.2);
        if (n.down) signIcon(gF, 'pedestrian', P(kerb.down - 2.2, -(zebra.y + 3.4)), 2.2);
        if (divided) E('rect', { x: -mh + 0.2, y: f2(-zebra.y - 2), width: f2(medW - 0.4), height: 4, fill: COL.asphaltLight }, gR);
      }
      humps.forEach(function (hy) {
        humpMark(gM, P(kerb.down, -hy), P(kerb.up, -hy), 2.2);
        signIcon(gF, 'hump', P(kerb.up + 1.6, -(hy - 12)), 2.4);
      });
      if (works) {
        var ws = sideSign[works.dir], xL = ws * (mh + (n[works.dir] - works.k) * LW) + shiftX, xR = xL + ws * LW;
        var inner = works.k < n[works.dir] ? xL : xR;  // boundary with the open lane
        var outer = works.k < n[works.dir] ? xR : xL;
        var ya2 = works.dir === 'up' ? works.from : works.to, yb2 = works.dir === 'up' ? works.to : works.from;
        var taper = 14 * (works.dir === 'up' ? 1 : -1);
        var poly2 = [P(outer, -(ya2)), P(inner, -(ya2 + taper)), P(inner, -yb2), P(outer, -yb2)];
        hatch(gM, poly2, COL.orange, K, 1.8);
        for (var t = 0; t <= 1.0001; t += 0.2) { var cp = lerpP(P(outer, -ya2), P(inner - ws * 0.4, -(ya2 + taper)), t); cone(gF, cp.x, cp.y); }
        var yy2 = ya2 + taper;
        while ((works.dir === 'up' && yy2 < yb2) || (works.dir === 'down' && yy2 > yb2)) { cone(gF, inner - ws * 0.4, -yy2); yy2 += (works.dir === 'up' ? 4 : -4); }
        signIcon(gF, 'works', P(kerb[works.dir] + ws * 1.7, -(ya2 - (works.dir === 'up' ? 12 : -12))), 2.6);
      }
      signs.forEach(function (s) {
        var sg = sideSign[s.dir];
        var x = s.side === 'median' && divided ? sg * 0.0 : kerb[s.dir] + sg * 1.7;
        signIcon(gF, s.id, P(x, -s.y), 2.6);
      });
      if (opening) signIcon(gF, 'uturn', P(mh * 0.35, -(opening.y0 - 3)), 2.4);
    });

    // --------------------------------------------------------------- slots
    geo.slot = function (s, size, errs2, pre) { return roadSlot(geo, s, size, errs2, pre); };
    geo.route = function (name, o, errs2, pre) {
      if (isU && name === 'uturn') return uturnRoute(geo, o, errs2, pre);
      errs2.push(pre + 'route "' + name + '" does not exist in template ' + geo.tpl + (isU ? ' (use "uturn")' : ' (roads have no routes: use drive, lane_change, pull_over, stop_at)'));
      return null;
    };
    geo.routeNames = isU ? ['uturn'] : [];
    return geo;
  }

  // slot resolution for road-like templates: {dir, lane, y} | {side, y} | {crossing, side} | {x, y}
  var ROAD_SLOT_KEYS = ['dir', 'lane', 'y', 'side', 'crossing', 'x', 'shift', 'heading'];
  function laneByName(geo, dir, lane, errs, pre) {
    var gr = geo.groups[dir];
    if (!gr) { errs.push(pre + 'dir "' + dir + '" does not exist here (use ' + Object.keys(geo.groups).filter(function (k) { return k.indexOf('.') < 0; }).join(' or ') + ')'); return null; }
    if (lane == null || lane === 'right') return gr.lanes[1] || null;
    if (lane === 'left') return gr.lanes[gr.n] || null;
    if (lane === 'middle') { if (gr.n !== 3) errs.push(pre + '"middle" only exists on 3-lane carriageways'); return gr.lanes[2] || gr.lanes[1]; }
    if (typeof lane === 'string') {
      var id = dir + '.' + lane;
      if (geo.lanes[id]) return geo.lanes[id];
      var z = gr.lanes[0];
      if (z && (z.kind === lane || (lane === 'kerb' && z.kind !== 'lane'))) return z;
      errs.push(pre + 'lane "' + lane + '" does not exist on "' + dir + '" (lanes 1-' + gr.n + (z ? ', "' + z.kind + '"' : '') + ')');
      return null;
    }
    if (!isNum(lane) || Math.round(lane) !== lane || !gr.lanes[lane] || lane < 1) {
      errs.push(pre + 'lane ' + JSON.stringify(lane) + ' does not exist on "' + dir + '" (lane 1 = rightmost in the direction of travel, up to ' + gr.n + ')');
      return gr.lanes[1] || null;
    }
    return gr.lanes[lane];
  }
  function roadSlot(geo, s, size, errs, pre) {
    knownKeys(s, ROAD_SLOT_KEYS.concat(geo.extraSlotKeys || []), errs, pre.replace(/: $/, ''));
    if (geo.slotExtra) { var ex = geo.slotExtra(s, size, errs, pre); if (ex) return ex; }
    if (isNum(s.x) && isNum(s.y) && s.lane == null && s.side == null) return { x: s.x, y: -s.y, h: isNum(s.heading) ? s.heading : 0, free: true };
    if (s.crossing != null) {
      var c = geo.crossings[s.crossing];
      if (!c) { errs.push(pre + 'crossing "' + s.crossing + '" does not exist (crossings: ' + (Object.keys(geo.crossings).join(', ') || 'none') + ')'); return null; }
      var pt = c.sides[s.side];
      if (!pt) { errs.push(pre + 'crossing side must be one of ' + Object.keys(c.sides).join(', ')); pt = c.a; }
      var other = pt === c.a ? c.b : c.a;
      return { x: pt.x, y: pt.y, h: bOf(sub(other, pt)), free: true, crossing: s.crossing };
    }
    if (s.side != null) {
      if (!isNum(s.y)) { errs.push(pre + 'a pavement slot needs "y"'); return null; }
      var k = geo.kerb;
      if (s.side === 'east') return { x: k.up + 1.5 + (s.shift || 0), y: -s.y, h: isNum(s.heading) ? s.heading : 270, free: true };
      if (s.side === 'west') return { x: k.down - 1.5 - (s.shift || 0), y: -s.y, h: isNum(s.heading) ? s.heading : 90, free: true };
      errs.push(pre + 'side must be "east" or "west" (the pavement beside the road)');
      return null;
    }
    var dir = s.dir || 'up';
    if (!geo.groups[dir]) { errs.push(pre + 'dir "' + dir + '" does not exist here'); return null; }
    var L = laneByName(geo, dir, s.lane, errs, pre);
    if (!L) return null;
    if (!isNum(s.y)) { errs.push(pre + 'lane slot needs "y" (metres from the bottom edge of the scene)'); return null; }
    var sp = L.path.sAtY(-s.y);
    var q = L.path.pose(sp);
    if (s.shift) q = add(q, mul(rightOf(dirB(q.h)), s.shift)), q.h = L.path.pose(sp).h;
    return { x: q.x, y: q.y, h: isNum(s.heading) ? s.heading : L.path.pose(sp).h, lane: L, s: sp };
  }

  function uturnRoute(geo, o, errs, pre) {
    var n = geo.dirs, op = geo.opening, from = o.fromLane;
    var kIn = from && from.group === 'up' && from.k >= 1 ? from.k : n.up;
    var kOut = o.to_lane != null ? pInt(o.to_lane, n.down, 1, n.down, errs, pre + 'to_lane') : n.down;
    var xs = geo.laneX('up', kIn), xe = geo.laneX('down', kOut), c = P((xs + xe) / 2, -op.ya), r = (xs - xe) / 2;
    var inPts = [P(xs, 12), P(xs, -op.ya)];
    var arc = arcPts(c, r, 90, -90, 0.3);
    var outPts = [P(xe, -op.ya), P(xe, 12)];
    var path = new Path(joinPts(inPts, arc, outPts));
    var sA = dist(inPts[0], inPts[1]);
    return { path: path, marks: { opening: sA, line: sA, exit: sA + Math.PI * r }, endLane: geo.lanes['down.' + kOut], turn: 'uturn', inLane: geo.lanes['up.' + kIn] };
  }

  // ================================================================== templates: crossroads / tjunction
  var JUNC_KEYS = ['lanes', 'divided', 'median', 'control', 'lights', 'crossings', 'box', 'arrows', 'corner', 'scenery',
    'markings', 'center', 'size', 'side'];
  var CONTROLS = ['none', 'stop', 'giveway', 'lights'];

  function readArmLanes(v, arm, errs, where) {
    if (isNum(v)) { var n = pInt(v, 1, 1, 3, errs, where); return { 'in': n, out: n }; }
    if (isObj(v)) { knownKeys(v, ['in', 'out'], errs, where); return { 'in': pInt(v['in'], 1, 1, 3, errs, where + '.in'), out: pInt(v.out, 1, 1, 3, errs, where + '.out') }; }
    errs.push(where + ' must be a number (1-3) or {"in":n,"out":m}');
    return { 'in': 1, out: 1 };
  }

  function buildJunction(p, errs, tpl) {
    knownKeys(p, JUNC_KEYS, errs, 'params');
    var geo = new Geo(tpl, p);
    var arms, side = null, main = null;
    if (tpl === 'tjunction') {
      side = pEnum(p.side, 'S', ARMS, errs, 'params.side');
      arms = ARMS.filter(function (a) { return a !== { N: 'S', S: 'N', E: 'W', W: 'E' }[side]; });
      main = arms.filter(function (a) { return a !== side; });
    } else {
      arms = ARMS.slice();
      if (p.side != null) errs.push('params.side only exists for tjunction');
    }
    geo.armNames = arms;
    // lanes: number | per-arm | {main, side}
    var lanesV = p.lanes;
    var laneCfg = {};
    if (tpl === 'tjunction' && isObj(lanesV) && ('main' in lanesV || 'side' in lanesV)) {
      knownKeys(lanesV, ['main', 'side'], errs, 'params.lanes');
      arms.forEach(function (a) { laneCfg[a] = readArmLanes(a === side ? (lanesV.side == null ? 1 : lanesV.side) : (lanesV.main == null ? 1 : lanesV.main), a, errs, 'params.lanes.' + (a === side ? 'side' : 'main')); });
    } else {
      laneCfg = perArm(lanesV == null ? 1 : lanesV, arms, { 'in': 1, out: 1 }, function (x, w) { return readArmLanes(x, null, errs, w); }, errs, 'params.lanes');
    }
    var medW = pNum(p, 'median', 2, 1, 10, errs);
    var divided = perArm(p.divided, arms, false, function (x, w) { return pBool(x, false, errs, w); }, errs, 'params.divided');
    var control;
    if (tpl === 'tjunction' && typeof p.control === 'string') {
      control = {};
      arms.forEach(function (a) { control[a] = p.control === 'lights' ? 'lights' : (a === side ? pEnum(p.control, 'giveway', CONTROLS, errs, 'params.control') : 'none'); });
    } else control = perArm(p.control, arms, tpl === 'tjunction' ? 'none' : 'none', function (x, w) { return pEnum(x, 'none', CONTROLS, errs, w); }, errs, 'params.control');
    if (tpl === 'tjunction' && p.control == null) control[side] = 'giveway';
    var crossings = [];
    if (p.crossings != null) {
      if (!Array.isArray(p.crossings)) errs.push('params.crossings must be a list of arm letters, e.g. ["S","N"]');
      else p.crossings.forEach(function (c) { if (arms.indexOf(c) < 0) errs.push('params.crossings: arm "' + c + '" does not exist'); else crossings.push(c); });
    }
    var box = pBool(p.box, false, errs, 'params.box');
    var R = pNum(p, 'corner', 6, 2, 14, errs);
    var scenery = pEnum(p.scenery, 'city', ['city', 'desert', 'none'], errs, 'params.scenery');
    var markings = pEnum(p.markings, 'all', ['all', 'none'], errs, 'params.markings');
    var centerT = pEnum(p.center, 'auto', ['auto', 'solid', 'broken', 'none'], errs, 'params.center');

    var A = {};
    arms.forEach(function (n) {
      var b = BEAR[n], d = dirB(b), ro = rightOf(d), lc = laneCfg[n], mh = divided[n] ? medW / 2 : 0;
      A[n] = { name: n, b: b, d: d, ro: ro, nIn: lc['in'], nOut: lc.out, mh: mh, wL: mh + lc['in'] * LW, wR: mh + lc.out * LW,
        ctrl: control[n], crossing: crossings.indexOf(n) >= 0 };
    });
    function g0(a, k) { return a ? a[k] : 0; }
    var ext = {
      N: Math.max(g0(A.E, 'wL'), g0(A.W, 'wR')), S: Math.max(g0(A.E, 'wR'), g0(A.W, 'wL')),
      E: Math.max(g0(A.N, 'wR'), g0(A.S, 'wL')), W: Math.max(g0(A.N, 'wL'), g0(A.S, 'wR'))
    };
    var anyX = crossings.length > 0;
    var maxMouth = 0;
    arms.forEach(function (n) {
      var a = A[n];
      a.mouth = ext[n];
      a.tz0 = a.mouth + R * 0.5 + 0.6; a.tz1 = a.tz0 + 4;          // zebra band
      a.tLine = a.crossing ? a.tz1 + 1.6 : a.mouth + R * 0.5 + 0.8;
      if (a.ctrl === 'none' && !a.crossing) a.tLine = a.mouth + R * 0.5 + 0.4;
      maxMouth = Math.max(maxMouth, a.tLine);
    });
    var half = pNum(p, 'size', maxMouth + 24, 15, 120, errs);
    geo.view = { x: -half, y: -half, w: 2 * half, h: 2 * half };
    if (side) { var sh0 = mul(dirB(BEAR[side]), half * 0.34); geo.view.x += sh0.x; geo.view.y += sh0.y; }
    geo.lightArms = arms.filter(function (n) { return A[n].ctrl === 'lights'; });
    var far = half * 1.4 + 14;
    geo.A = A; geo.R = R;

    function inOff(a, k) { return a.mh + (a.nIn - k + 0.5) * LW; }
    function outOff(a, k) { return a.mh + (a.nOut - k + 0.5) * LW; }
    function at(a, t, u) { return add(mul(a.d, t), mul(a.ro, u)); } // arm-local (t outward, u to the cw side)
    geo.at = at;

    // lanes
    arms.forEach(function (n) {
      var a = A[n];
      for (var k = 1; k <= a.nIn; k++) {
        var o = inOff(a, k);
        var L = geo.addLane(n + '.in.' + k, [at(a, far, -o), at(a, a.tLine, -o)], { group: n + '.in', k: k, n: a.nIn, arm: n, dir: 'in', kind: 'in' });
        L.line = L.path.length;
      }
      for (var m = 1; m <= a.nOut; m++) {
        var o2 = outOff(a, m);
        geo.addLane(n + '.out.' + m, [at(a, a.mouth, o2), at(a, far, o2)], { group: n + '.out', k: m, n: a.nOut, arm: n, dir: 'out', kind: 'out' });
      }
      if (a.crossing) {
        var tz = (a.tz0 + a.tz1) / 2, ca = at(a, tz, -(a.wL + 1.3)), cb = at(a, tz, a.wR + 1.3), sides = {};
        sides[compass(mul(a.ro, -1))] = ca; sides[compass(a.ro)] = cb;
        geo.crossings[n] = { a: ca, b: cb, depth: 4, sides: sides, arm: n };
      }
    });

    // outline (clockwise), fillets between adjacent arms
    var outline = [];
    for (var i = 0; i < 4; i++) {
      var n = ARMS[i], a = A[n];
      if (!a) continue;
      var nx = A[ARMS[(i + 1) % 4]];
      outline.push(at(a, far, -a.wL), at(a, far, a.wR));
      if (nx) {
        var K = add(mul(a.d, nx.wL), mul(a.ro, a.wR));
        var C = add(add(K, mul(a.d, R)), mul(nx.d, R));
        var b0 = bOf(mul(nx.d, -1)), b1 = bOf(mul(a.d, -1));
        outline = outline.concat(arcPts(C, R, b0, b0 + angDiff(b1, b0), 0.4));
      }
    }

    geo.draw.push(function (L, K2) {
      var v = geo.view, gG = L.ground, gR = L.road, gM = L.marks, gF = L.furniture;
      groundRect(gG, v, COL.ground);
      speckle(gG, v, 11, '#26241F', 260);
      if (scenery === 'city') {
        // corner blocks
        for (var i2 = 0; i2 < 4; i2++) {
          var n1 = ARMS[i2], n2 = ARMS[(i2 + 1) % 4], a1 = A[n1], a2 = A[n2];
          var gapB = 2.6 + 3.2;
          // quadrant corner in world: along n1 dir by (a2? a2.wL : ext) and along n2 by a1.wR
          var qx = sub(add(mul(dirB(BEAR[n1]), (a2 ? a2.wL : ext[ARMS[(i2 + 2) % 4]]) + gapB), mul(dirB(BEAR[n2]), (a1 ? a1.wR : 0) + gapB)), P(0, 0));
          var farC = add(mul(dirB(BEAR[n1]), half * 1.4 + 20), mul(dirB(BEAR[n2]), half * 1.4 + 20));
          var x0 = Math.min(qx.x, farC.x), x1 = Math.max(qx.x, farC.x), y0 = Math.min(qx.y, farC.y), y1 = Math.max(qx.y, farC.y);
          if (!a1 || !a2) continue;
          block(gG, x0 + (qx.x < farC.x ? R * 0.6 : 0), y0 + (qx.y < farC.y ? R * 0.6 : 0), x1 - (qx.x > farC.x ? R * 0.6 : 0), y1 - (qx.y > farC.y ? R * 0.6 : 0), hash(tpl + i2));
        }
        if (tpl === 'tjunction') {
          var missing = ARMS.filter(function (x) { return arms.indexOf(x) < 0; })[0];
          var dm = dirB(BEAR[missing]), rm = rightOf(dm), wside = ext[missing] + 5.8;
          var pa = add(mul(dm, wside), mul(rm, -half * 1.4 - 20)), pb = add(mul(dm, half * 1.4 + 20), mul(rm, half * 1.4 + 20));
          block(gG, Math.min(pa.x, pb.x), Math.min(pa.y, pb.y), Math.max(pa.x, pb.x), Math.max(pa.y, pb.y), hash('tm'));
        }
      }
      paintOutline(gR, outline, {});
      // medians
      arms.forEach(function (n3) {
        var a3 = A[n3];
        if (!a3.mh) return;
        var tn = a3.tLine - 0.5 + a3.mh;
        var p0 = at(a3, tn, 0), p1 = at(a3, far, 0);
        E('line', { x1: f2(p0.x), y1: f2(p0.y), x2: f2(p1.x), y2: f2(p1.y), stroke: COL.kerb, 'stroke-width': f2(a3.mh * 2 + 0.3), 'stroke-linecap': 'round' }, gR);
        E('line', { x1: f2(p0.x), y1: f2(p0.y), x2: f2(p1.x), y2: f2(p1.y), stroke: COL.sandDim, 'stroke-width': f2(a3.mh * 2 - 0.2), 'stroke-linecap': 'round' }, gR);
        if (a3.mh >= 1.4) for (var tt = tn + 6; tt < half; tt += 13) { var pp = at(a3, tt, 0); palm(gF, pp.x, pp.y, Math.min(3, a3.mh * 1.6)); }
      });
      if (box && markings !== 'none') boxJunction(gM, -ext.W + 0.6, -ext.N + 0.6, ext.E - 0.6, ext.S - 0.6, K2);
      arms.forEach(function (n4) {
        var a4 = A[n4];
        var mk = markings !== 'none';
        // in-lane separators: solid near the line
        if (mk) for (var j = 1; j < a4.nIn; j++) {
          var u = -(a4.mh + j * LW);
          markLine(gM, [at(a4, a4.tLine, u), at(a4, a4.tLine + 12, u)], 'solid');
          markLine(gM, [at(a4, a4.tLine + 12, u), at(a4, far, u)], 'broken');
        }
        if (mk) for (var j2 = 1; j2 < a4.nOut; j2++) {
          var u2 = a4.mh + j2 * LW;
          markLine(gM, [at(a4, a4.mouth + R * 0.7, u2), at(a4, far, u2)], 'broken');
        }
        if (mk && a4.mh) {
          var tn2 = a4.tLine - 0.5;
          markLine(gM, [at(a4, tn2 + a4.mh, -(a4.mh + 0.3)), at(a4, far, -(a4.mh + 0.3))], 'solid', COL.yellow);
          markLine(gM, [at(a4, tn2 + a4.mh, a4.mh + 0.3), at(a4, far, a4.mh + 0.3)], 'solid', COL.yellow);
        } else if (mk && centerT !== 'none') {
          var ct = centerT === 'auto' ? null : centerT;
          markLine(gM, [at(a4, a4.tLine, 0), at(a4, a4.tLine + 14, 0)], ct || (a4.ctrl === 'none' ? 'broken' : 'solid'));
          markLine(gM, [at(a4, a4.tLine + 14, 0), at(a4, far, 0)], ct || 'broken');
        }
        // transverse line
        var l0 = at(a4, a4.tLine, -a4.mh), l1 = at(a4, a4.tLine, -a4.wL);
        if (mk && (a4.ctrl === 'stop' || a4.ctrl === 'lights')) stopLine(gM, l0, l1, 0.5);
        if (mk && a4.ctrl === 'giveway') {
          giveLine(gM, [l0, l1]);
          for (var k3 = 1; k3 <= a4.nIn; k3++) gwTriangle(gM, at(a4, a4.tLine + 5, -inOff(a4, k3)), a4.b + 180);
        }
        if (mk && a4.ctrl === 'stop') {
          for (var k4 = 1; k4 <= a4.nIn; k4++) {
            var tp = at(a4, a4.tLine + 3.2, -inOff(a4, k4));
            var tx = E('text', { x: 0, y: 0, 'font-size': 1.15, 'font-family': LATIN, 'font-weight': 700, fill: COL.white, 'text-anchor': 'middle', 'dominant-baseline': 'central', opacity: 0.9, transform: tr(tp.x, tp.y, a4.b + 180) + ' scale(1 1.8)' }, gM);
            tx.textContent = 'STOP';
          }
        }
        if (a4.crossing) zebraMark(gM, at(a4, (a4.tz0 + a4.tz1) / 2, -a4.wL), at(a4, (a4.tz0 + a4.tz1) / 2, a4.wR), 4);
        // lane arrows
        var arrows = autoArrows(geo, a4, p.arrows, errs);
        if (mk) arrows.forEach(function (kind, idx) {
          if (!kind) return;
          var k5 = idx + 1;
          [a4.tLine + 6.5, a4.tLine + 20].forEach(function (t) { if (t < half - 2) laneArrow(gM, at(a4, t, -inOff(a4, k5)), a4.b + 180, kind); });
        });
        // signs / signals on the right-hand verge of the approach
        var verge = at(a4, a4.tLine + 1.4, -(a4.wL + 1.5));
        if (a4.ctrl === 'stop') signIcon(gF, 'stop', verge, 2.8);
        if (a4.ctrl === 'giveway') signIcon(gF, 'giveway', verge, 2.8);
        if (a4.ctrl === 'lights') {
          var sh = signalHead(gF, at(a4, a4.tLine - 0.6, -(a4.wL + 1.7)), a4.b + 180);
          geo.signals[n4] = sh;
        }
      });
    });

    geo.slot = function (s, size, errs2, pre) { return juncSlot(geo, s, size, errs2, pre); };
    geo.route = function (name, o, errs2, pre) { return juncRoute(geo, name, o, errs2, pre); };
    geo.routeNames = [];
    arms.forEach(function (a) { arms.forEach(function (b) { for (var k = 1; k <= A[a].nIn; k++) geo.routeNames.push(a + k + '->' + b); }); });
    geo.inOff = inOff; geo.outOff = outOff;
    return geo;
  }

  function exitsOf(geo, a) {
    var r = null, s = null, l = null, A = geo.A;
    Object.keys(A).forEach(function (n) {
      var b = A[n];
      if (b === a) return;
      var dd = angDiff(b.b, a.b + 180);
      if (Math.abs(dd) < 1) s = n; else if (Math.abs(dd - 90) < 1) r = n; else if (Math.abs(dd + 90) < 1) l = n;
    });
    return { right: r, straight: s, left: l };
  }
  function autoArrows(geo, a, spec, errs) {
    if (spec === false || spec === 'none') return [];
    if (isObj(spec) && spec[a.name]) {
      var list = spec[a.name];
      if (!Array.isArray(list)) { errs.push('params.arrows.' + a.name + ' must be a list, lane 1 first'); return []; }
      return list;
    }
    var ex = exitsOf(geo, a), n = a.nIn, out = [];
    if (n === 1) return a.ctrl === 'none' ? [] : [];
    if (n === 2) {
      out[0] = ex.right ? (ex.straight ? 'straight+right' : 'right') : 'straight';
      out[1] = ex.left ? (ex.straight ? 'straight+left' : 'left') : 'straight';
    } else {
      out[0] = ex.right ? 'right' : 'straight';
      out[1] = ex.straight ? 'straight' : (ex.right ? 'right' : 'left');
      out[2] = ex.left ? 'left' : 'straight';
    }
    return out;
  }

  var JUNC_SLOT_KEYS = ['arm', 'lane', 'dir', 'at', 'crossing', 'side', 'x', 'y', 'shift', 'heading', 'ring', 'angle', 'before', 'after', 'deg'];
  function juncSlot(geo, s, size, errs, pre) {
    knownKeys(s, JUNC_SLOT_KEYS, errs, pre.replace(/: $/, ''));
    if (s.ring != null) {
      if (geo.tpl !== 'roundabout') { errs.push(pre + '"ring" slots only exist in roundabouts'); return null; }
      return ringSlot(geo, s, size, errs, pre);
    }
    if (isNum(s.x) && isNum(s.y) && s.arm == null) return { x: s.x, y: -s.y, h: isNum(s.heading) ? s.heading : 0, free: true };
    if (s.crossing != null) {
      var c = geo.crossings[s.crossing];
      if (!c) { errs.push(pre + 'crossing "' + s.crossing + '" does not exist (crossings: ' + (Object.keys(geo.crossings).join(', ') || 'none; add params.crossings') + ')'); return null; }
      var pt = c.sides[s.side];
      if (!pt) { errs.push(pre + 'crossing "' + s.crossing + '" side must be ' + Object.keys(c.sides).join(' or ')); pt = c.a; }
      var other = pt === c.a ? c.b : c.a;
      return { x: pt.x, y: pt.y, h: bOf(sub(other, pt)), free: true, crossing: s.crossing };
    }
    var a = geo.A[s.arm];
    if (!a) { errs.push(pre + 'arm "' + s.arm + '" does not exist (arms: ' + Object.keys(geo.A).join(', ') + ')'); return null; }
    if (s.side != null && s.lane == null) {
      // pavement beside the arm
      var sideV = SIDES[s.side];
      if (sideV == null) { errs.push(pre + 'side must be north/east/south/west'); return null; }
      var dv = dirB(sideV), u = (dv.x * a.ro.x + dv.y * a.ro.y) > 0 ? a.wR + 1.5 : -(a.wL + 1.5);
      if (Math.abs(dv.x * a.ro.x + dv.y * a.ro.y) < 0.5) { errs.push(pre + 'side "' + s.side + '" is along arm ' + s.arm + ', use a side across it'); return null; }
      var t = a.mouth + geo.R + (isNum(s.at) ? s.at : 4);
      var q = geo.at(a, t, u);
      return { x: q.x, y: q.y, h: isNum(s.heading) ? s.heading : a.b + 180, free: true };
    }
    var dir = s.dir || 'in';
    if (dir !== 'in' && dir !== 'out') { errs.push(pre + 'dir must be "in" (approaching the junction) or "out" (leaving it)'); return null; }
    var n = dir === 'in' ? a.nIn : a.nOut;
    var k = s.lane == null ? 1 : s.lane;
    if (k === 'right') k = 1; else if (k === 'left') k = n; else if (k === 'middle') { if (n !== 3) errs.push(pre + '"middle" needs 3 lanes'); k = 2; }
    if (!isNum(k) || k < 1 || k > n || Math.round(k) !== k) { errs.push(pre + 'arm ' + s.arm + ' has ' + n + ' "' + dir + '" lane(s); lane 1 = rightmost for a driver ' + (dir === 'in' ? 'approaching' : 'leaving') + ' (got ' + JSON.stringify(s.lane) + ')'); k = 1; }
    var L = geo.lanes[s.arm + '.' + dir + '.' + k];
    var gap = s.at == null || s.at === 'stopline' || s.at === 'line' ? 0 : s.at;
    if (!isNum(gap)) { errs.push(pre + '"at" must be "stopline" or a distance in metres'); gap = 0; }
    var half = (size ? size.len : 4.6) / 2, sp;
    if (dir === 'in') sp = L.line - GAP - gap - half;
    else sp = gap + half + 0.3;
    var q2 = L.path.pose(sp);
    if (s.shift) { var h2 = q2.h; q2 = add(q2, mul(rightOf(dirB(h2)), s.shift)); q2.h = h2; }
    return { x: q2.x, y: q2.y, h: isNum(s.heading) ? s.heading : q2.h, lane: L, s: sp };
  }

  function parseRoute(name) {
    var m = /^\s*([NESW])(\d)?\s*->\s*([NESW])(\d)?\s*$/.exec(name || '');
    if (m) return { from: m[1], k: m[2] ? +m[2] : null, to: m[3], m: m[4] ? +m[4] : null };
    var r = /^\s*ring(\d)?\s*->\s*([NESW])(\d)?\s*$/.exec(name || '');
    if (r) return { ring: r[1] ? +r[1] : 0, to: r[2], m: r[3] ? +r[3] : null };
    return null;
  }

  function juncRoute(geo, name, o, errs, pre) {
    var pr = parseRoute(name);
    if (!pr || pr.ring != null) { errs.push(pre + 'route "' + name + '" is not valid here; write it like "S1->E" (arm S, lane 1, leave by arm E)'); return null; }
    var A = geo.A, a = A[pr.from], b = A[pr.to];
    if (!a) { errs.push(pre + 'route "' + name + '": arm ' + pr.from + ' does not exist'); return null; }
    if (!b) { errs.push(pre + 'route "' + name + '": arm ' + pr.to + ' does not exist'); return null; }
    var k = pr.k || (o.fromLane && o.fromLane.arm === pr.from && o.fromLane.dir === 'in' ? o.fromLane.k : 1);
    if (k < 1 || k > a.nIn) { errs.push(pre + 'route "' + name + '": arm ' + pr.from + ' has ' + a.nIn + ' approach lane(s)'); return null; }
    var ex = exitsOf(geo, a), turn = pr.to === pr.from ? 'uturn' : (pr.to === ex.right ? 'right' : pr.to === ex.left ? 'left' : 'straight');
    var m = pr.m || o.to_lane || (turn === 'right' ? 1 : turn === 'left' || turn === 'uturn' ? b.nOut : Math.min(k, b.nOut));
    if (m < 1 || m > b.nOut) { errs.push(pre + 'route "' + name + '": arm ' + pr.to + ' has ' + b.nOut + ' exit lane(s)'); return null; }
    var Lin = geo.lanes[pr.from + '.in.' + k], Lout = geo.lanes[pr.to + '.out.' + m];
    var p0 = Lin.path.pos(Lin.path.length), v0 = mul(a.d, -1), p3 = Lout.path.pos(0), v3 = b.d, conn;
    if (turn === 'straight') conn = bez(p0, add(p0, mul(v0, dist(p0, p3) / 3)), sub(p3, mul(v3, dist(p0, p3) / 3)), p3);
    else if (turn === 'uturn') {
      var sep = geo.inOff(a, k) + geo.outOff(b, m), deep = a.tLine - a.mouth;
      var q3 = geo.at(a, a.mouth, geo.outOff(b, m));
      conn = bez(p0, add(p0, mul(v0, deep + sep * 1.1)), add(q3, mul(v0, sep * 1.1)), q3);
      p3 = q3;
    } else conn = turnPts(p0, v0, p3, v3, 0.56);
    var pts = joinPts(Lin.path.p, conn, Lout.path.p);
    var path = new Path(pts);
    return { path: path, marks: { line: Lin.path.length, exit: Lin.path.length + new Path(conn).length }, endLane: Lout, inLane: Lin, turn: turn };
  }

  // ================================================================== template: roundabout
  var RB_KEYS = ['arms', 'lanes', 'exit_lanes', 'ring', 'island', 'radius', 'splitter', 'arrows', 'crossings', 'control',
    'lights', 'scenery', 'size', 'markings'];

  function buildRoundabout(p, errs) {
    knownKeys(p, RB_KEYS, errs, 'params');
    var geo = new Geo('roundabout', p);
    var arms = ARMS.slice();
    if (p.arms === 3) arms = ['E', 'S', 'W'];
    else if (Array.isArray(p.arms)) {
      var ok = p.arms.filter(function (a) { return ARMS.indexOf(a) >= 0; });
      if (ok.length !== p.arms.length || ok.length < 3) errs.push('params.arms must be 3, 4 or a list of 3-4 arm letters like ["S","E","W"]');
      arms = ARMS.filter(function (a) { return ok.indexOf(a) >= 0; });
      if (arms.length < 3) arms = ARMS.slice();
    } else if (p.arms != null && p.arms !== 4) errs.push('params.arms must be 3, 4 or a list like ["S","E","W"]');
    geo.armNames = arms;
    var nIn = perArm(p.lanes == null ? 1 : p.lanes, arms, 1, function (x, w) { return pInt(x, 1, 1, 3, errs, w); }, errs, 'params.lanes');
    var nOut = perArm(p.exit_lanes, arms, null, function (x, w) { return pInt(x, 1, 1, 3, errs, w); }, errs, 'params.exit_lanes');
    var maxIn = 1;
    arms.forEach(function (a) { if (nOut[a] == null) nOut[a] = nIn[a]; maxIn = Math.max(maxIn, nIn[a], nOut[a]); });
    var nR = pInt(p.ring, Math.min(3, maxIn), 1, 3, errs, 'params.ring');
    var island = pEnum(p.island, 'palms', ['palms', 'sand', 'grass', 'plain'], errs, 'params.island');
    var Ri = pNum(p, 'radius', 5 + 1.6 * nR, 3, 40, errs);
    var splitter = pBool(p.splitter, true, errs, 'params.splitter');
    var control = perArm(p.control, arms, 'giveway', function (x, w) { return pEnum(x, 'giveway', ['giveway', 'lights', 'none'], errs, w); }, errs, 'params.control');
    var crossings = [];
    if (p.crossings != null) {
      if (!Array.isArray(p.crossings)) errs.push('params.crossings must be a list of arm letters');
      else p.crossings.forEach(function (c) { if (arms.indexOf(c) < 0) errs.push('params.crossings: arm "' + c + '" does not exist'); else crossings.push(c); });
    }
    var scenery = pEnum(p.scenery, 'city', ['city', 'desert', 'none'], errs, 'params.scenery');
    var markings = pEnum(p.markings, 'all', ['all', 'none'], errs, 'params.markings');
    var Ro = Ri + nR * RLW, Rg = Ro + 0.5;
    var C0 = P(0, 0);
    geo.nR = nR; geo.Ri = Ri; geo.Ro = Ro;
    var A = {};
    arms.forEach(function (n) {
      var b = BEAR[n], d = dirB(b), mh = splitter ? 1.1 : 0;
      A[n] = { name: n, b: b, d: d, ro: rightOf(d), nIn: nIn[n], nOut: nOut[n], mh: mh, wL: mh + nIn[n] * LW, wR: mh + nOut[n] * LW,
        ctrl: control[n], crossing: crossings.indexOf(n) >= 0 };
    });
    geo.A = A;
    geo.lightArms = arms.filter(function (n) { return A[n].ctrl === 'lights'; });
    var half = pNum(p, 'size', Ro + (crossings.length ? 27 : 22), 15, 140, errs);
    geo.view = { x: -half, y: -half, w: 2 * half, h: 2 * half };
    var far = half + 14;
    function at(a, t, u) { return add(mul(a.d, t), mul(a.ro, u)); }
    function uIn(a, k) { return a.mh + (a.nIn - k + 0.5) * LW; }
    function uOut(a, m) { return a.mh + (a.nOut - m + 0.5) * LW; }
    function rj(j) { return Ro - (j - 0.5) * RLW; }
    function tLine(a, k) { var u = uIn(a, k); return Math.sqrt(Math.max(1, Rg * Rg - u * u)); }
    geo.at = at; geo.uIn = uIn; geo.uOut = uOut; geo.rj = rj;
    var tOut0 = Ro + 2.5;
    arms.forEach(function (n) {
      var a = A[n];
      a.tz = Ro + 9.5;  // zebra centre
      for (var k = 1; k <= a.nIn; k++) {
        var L = geo.addLane(n + '.in.' + k, [at(a, far, -uIn(a, k)), at(a, tLine(a, k), -uIn(a, k))], { group: n + '.in', k: k, n: a.nIn, arm: n, dir: 'in', kind: 'in' });
        L.line = L.path.length;
      }
      for (var m = 1; m <= a.nOut; m++) geo.addLane(n + '.out.' + m, [at(a, tOut0, uOut(a, m)), at(a, far, uOut(a, m))], { group: n + '.out', k: m, n: a.nOut, arm: n, dir: 'out', kind: 'out' });
      if (a.crossing) {
        var ca = at(a, a.tz, -(a.wL + 1.3)), cb = at(a, a.tz, a.wR + 1.3), sides = {};
        sides[compass(mul(a.ro, -1))] = ca; sides[compass(a.ro)] = cb;
        geo.crossings[n] = { a: ca, b: cb, depth: 4, sides: sides, arm: n };
      }
    });
    for (var j = 1; j <= nR; j++) geo.addLane('ring.' + j, arcPts(C0, rj(j), 0, -720, 0.4), { group: 'ring', k: j, n: nR, kind: 'ring' });

    // outline
    var FL = 6, FD = 11, outline = [];
    arms.forEach(function (n, i) {
      var a = A[n], nx = A[arms[(i + 1) % arms.length]];
      var tcL = Math.sqrt(Math.max(1, Ro * Ro - a.wL * a.wL)), tcR = Math.sqrt(Math.max(1, Ro * Ro - a.wR * a.wR));
      var q0 = add(C0, mul(dirB(a.b - Math.asin(a.wL / Ro) * R2D - FD), Ro)), k0 = at(a, tcL, -a.wL), q2 = at(a, tcL + FL, -a.wL);
      var fl1 = [], fl2 = [];
      for (var t = 0; t <= 1.0001; t += 0.1) { var u = 1 - t; fl1.push(add(add(mul(q0, u * u), mul(k0, 2 * u * t)), mul(q2, t * t))); }
      var r2 = at(a, tcR + FL, a.wR), k1 = at(a, tcR, a.wR), r0 = add(C0, mul(dirB(a.b + Math.asin(a.wR / Ro) * R2D + FD), Ro));
      for (var t2 = 0; t2 <= 1.0001; t2 += 0.1) { var u2 = 1 - t2; fl2.push(add(add(mul(r2, u2 * u2), mul(k1, 2 * u2 * t2)), mul(r0, t2 * t2))); }
      outline = outline.concat(fl1, [at(a, far, -a.wL), at(a, far, a.wR)], fl2);
      var bS = a.b + Math.asin(a.wR / Ro) * R2D + FD, bE = nx.b - Math.asin(nx.wL / Ro) * R2D - FD;
      while (bE <= bS) bE += 360;
      outline = outline.concat(arcPts(C0, Ro, bS, bE, 0.5));
    });

    geo.draw.push(function (L, K) {
      var v = geo.view, gG = L.ground, gR = L.road, gM = L.marks, gF = L.furniture;
      groundRect(gG, v, COL.ground);
      speckle(gG, v, 5, '#26241F', 260);
      if (scenery === 'city') {
        ARMS.forEach(function (n1, i) {
          var n2 = ARMS[(i + 1) % 4], a1 = A[n1], a2 = A[n2];
          var w1 = a1 ? a1.wR : 0, w2 = a2 ? a2.wL : 0;
          var d1 = dirB(BEAR[n1]), d2 = dirB(BEAR[n2]);
          var c = (Ro + 9) * 0.72;
          var inner = add(mul(d1, Math.max(w2 + 6, c)), mul(d2, Math.max(w1 + 6, c)));
          if (!a1 || !a2) inner = add(mul(d1, a2 ? Math.max(w2 + 6, Ro + 8) : Ro + 8), mul(d2, a1 ? Math.max(w1 + 6, Ro + 8) : Ro + 8));
          var outer = add(mul(d1, half + 20), mul(d2, half + 20));
          block(gG, Math.min(inner.x, outer.x), Math.min(inner.y, outer.y), Math.max(inner.x, outer.x), Math.max(inner.y, outer.y), hash('rb' + i));
        });
      }
      paintOutline(gR, outline, {});
      // island
      var isl = G(gR);
      E('circle', { cx: 0, cy: 0, r: f2(Ri + 0.25), fill: COL.kerb }, isl);
      E('circle', { cx: 0, cy: 0, r: f2(Ri), fill: '#4A4F57' }, isl);
      E('circle', { cx: 0, cy: 0, r: f2(Ri - 0.7), fill: 'none', stroke: '#5A606A', 'stroke-width': 0.9, 'stroke-dasharray': '0.35 0.35' }, isl);
      E('circle', { cx: 0, cy: 0, r: f2(Ri - 1.3), fill: COL.kerb }, isl);
      E('circle', { cx: 0, cy: 0, r: f2(Ri - 1.5), fill: island === 'grass' ? COL.grass : (island === 'plain' ? '#3A3F47' : COL.sandDim) }, isl);
      if (island === 'palms' || island === 'grass') {
        var np = Ri > 9 ? 5 : 3, rr = (Ri - 1.5) * 0.52;
        for (var ip = 0; ip < np; ip++) { var pp = mul(dirB(ip * 360 / np + 20), rr); palm(gF, pp.x, pp.y, Math.min(3.2, Ri * 0.38), 40 + ip); }
        if (Ri > 7) palm(gF, 0, 0, Math.min(3.6, Ri * 0.4), 77);
        for (var is = 0; is < 6; is++) { var sp = mul(dirB(is * 60 + 50), (Ri - 1.5) * 0.82); shrub(gF, sp.x, sp.y, 0.55); }
      }
      // splitters
      arms.forEach(function (n) {
        var a = A[n];
        if (!a.mh) return;
        var parts = a.crossing ? [[Ro + 1.3 + a.mh, a.tz - 2.6 - a.mh], [a.tz + 2.6 + a.mh, Ro + 15]] : [[Ro + 1.3 + a.mh, Ro + 15]];
        parts.forEach(function (pt) {
          if (pt[1] <= pt[0]) return;
          var p0 = at(a, pt[0], 0), p1 = at(a, pt[1], 0);
          E('line', { x1: f2(p0.x), y1: f2(p0.y), x2: f2(p1.x), y2: f2(p1.y), stroke: COL.kerb, 'stroke-width': f2(a.mh * 2 + 0.3), 'stroke-linecap': 'round' }, gR);
          E('line', { x1: f2(p0.x), y1: f2(p0.y), x2: f2(p1.x), y2: f2(p1.y), stroke: COL.sandDim, 'stroke-width': f2(a.mh * 2 - 0.2), 'stroke-linecap': 'round' }, gR);
        });
      });
      if (markings === 'none') return;
      // ring markings
      for (var jj = 1; jj < nR; jj++) E('circle', { cx: 0, cy: 0, r: f2(Ro - jj * RLW), fill: 'none', stroke: COL.white, 'stroke-width': 0.2, 'stroke-dasharray': '2.5 3' }, gM);
      E('circle', { cx: 0, cy: 0, r: f2(Ri + 0.35), fill: 'none', stroke: COL.yellow, 'stroke-width': 0.2 }, gM);
      arms.forEach(function (n) {
        var a = A[n];
        // give-way arc across the entry lanes
        var bA = a.b - Math.asin(a.mh / Rg) * R2D, bB = a.b - Math.asin(Math.min(0.98, (a.wL - 0.1) / Rg)) * R2D;
        if (a.ctrl === 'giveway') giveLine(gM, arcPts(C0, Rg, bA, bB, 0.2));
        else if (a.ctrl === 'lights') E('path', { d: dOf(arcPts(C0, Rg, bA, bB, 0.2)), fill: 'none', stroke: COL.white, 'stroke-width': 0.5 }, gM);
        for (var k = 1; k <= a.nIn; k++) {
          if (a.ctrl === 'giveway') gwTriangle(gM, at(a, tLine(a, k) + 4.5, -uIn(a, k)), a.b + 180);
        }
        for (var j2 = 1; j2 < a.nIn; j2++) {
          var u = -(a.mh + j2 * LW), t0 = Math.sqrt(Rg * Rg - u * u) + 0.4;
          markLine(gM, [at(a, t0, u), at(a, t0 + 9, u)], 'solid');
          markLine(gM, [at(a, t0 + 9, u), at(a, far, u)], 'broken');
        }
        for (var m2 = 1; m2 < a.nOut; m2++) { var uo = a.mh + m2 * LW; markLine(gM, [at(a, Ro + 3, uo), at(a, far, uo)], 'broken'); }
        if (a.mh) {
          markLine(gM, [at(a, Ro + 15 + a.mh, 0), at(a, Ro + 22, 0)], 'solid');
          markLine(gM, [at(a, Ro + 22, 0), at(a, far, 0)], 'broken');
        } else {
          markLine(gM, [at(a, Ro + 1, 0), at(a, Ro + 14, 0)], 'solid');
          markLine(gM, [at(a, Ro + 14, 0), at(a, far, 0)], 'broken');
        }
        var arr = rbArrows(a, p.arrows, errs);
        arr.forEach(function (kind, idx) {
          if (!kind) return;
          var kk = idx + 1;
          [tLine(a, kk) + 9, tLine(a, kk) + 20].forEach(function (t) { if (t < half - 2) laneArrow(gM, at(a, t, -uIn(a, kk)), a.b + 180, kind); });
        });
        if (a.crossing) zebraMark(gM, at(a, a.tz, -a.wL), at(a, a.tz, a.wR), 4);
        var vg = at(a, Ro + 3.5, -(a.wL + 1.6));
        if (a.ctrl === 'giveway') signIcon(gF, 'giveway', vg, 2.6);
        if (a.ctrl === 'lights') geo.signals[n] = signalHead(gF, at(a, tLine(a, 1) + 0.8, -(a.wL + 1.8)), a.b + 180);
        signIcon(gF, 'roundabout', at(a, Ro + 16, -(a.wL + 1.6)), 2.4);
      });
    });

    geo.slot = function (s, size, errs2, pre) { return juncSlot(geo, s, size, errs2, pre); };
    geo.route = function (name, o, errs2, pre) { return rbRoute(geo, name, o, errs2, pre); };
    geo.tLine = tLine;
    geo.routeNames = [];
    arms.forEach(function (a) { arms.forEach(function (b) { for (var k = 1; k <= A[a].nIn; k++) geo.routeNames.push(a + k + '->' + b); }); });
    arms.forEach(function (b) { geo.routeNames.push('ring->' + b); });
    return geo;
  }

  function rbArrows(a, spec, errs) {
    if (spec === false || spec === 'none') return [];
    if (isObj(spec) && spec[a.name]) {
      if (!Array.isArray(spec[a.name])) { errs.push('params.arrows.' + a.name + ' must be a list, lane 1 first'); return []; }
      return spec[a.name];
    }
    if (a.nIn === 2) return ['straight+right', 'straight+left'];
    if (a.nIn === 3) return ['right', 'straight', 'left'];
    return [];
  }

  function ringIndex(geo, v, errs, pre) {
    var nR = geo.nR;
    if (v === 'outer' || v == null) return 1;
    if (v === 'inner') return nR;
    if (v === 'middle') { if (nR !== 3) errs.push(pre + '"middle" ring lane needs params.ring = 3'); return Math.min(2, nR); }
    if (isNum(v) && v >= 1 && v <= nR && Math.round(v) === v) return v;
    errs.push(pre + 'ring lane must be "outer", "inner", "middle" or 1-' + nR + ' (1 = outer)');
    return 1;
  }
  function ringSlot(geo, s, size, errs, pre) {
    var j = ringIndex(geo, s.ring, errs, pre), b;
    var deg = isNum(s.deg) ? s.deg : 40;
    if (isNum(s.angle)) b = s.angle;
    else if (s.before != null) { if (!geo.A[s.before]) { errs.push(pre + 'arm "' + s.before + '" does not exist'); return null; } b = BEAR[s.before] + deg; }
    else if (s.after != null) { if (!geo.A[s.after]) { errs.push(pre + 'arm "' + s.after + '" does not exist'); return null; } b = BEAR[s.after] - deg; }
    else { errs.push(pre + 'a ring slot needs "angle" (compass bearing from the centre) or "before": "<arm>"'); return null; }
    var L = geo.lanes['ring.' + j], r = geo.rj(j);
    var sp = ((((360 - b) % 360) + 360) % 360) * D2R * r;
    var q = L.path.pose(sp);
    return { x: q.x, y: q.y, h: isNum(s.heading) ? s.heading : q.h, lane: L, s: sp };
  }

  function rbRoute(geo, name, o, errs, pre) {
    var pr = parseRoute(name);
    if (!pr) { errs.push(pre + 'route "' + name + '" is not valid; write "S1->E" (enter from arm S lane 1, leave by arm E) or "ring->E"'); return null; }
    var A = geo.A, b = A[pr.to], C0 = P(0, 0);
    if (!b) { errs.push(pre + 'route "' + name + '": arm ' + pr.to + ' does not exist'); return null; }
    var pts = [], marks = {}, j, a = null, k = null, inLane = null;
    var PHI = 22;
    if (pr.ring != null) {
      var fp = o.fromPos || P(0, -geo.Ro);
      j = pr.ring || (o.fromLane && o.fromLane.kind === 'ring' ? o.fromLane.k : 0);
      if (!j) { var rr = dist(fp, C0), best = 1; for (var q = 1; q <= geo.nR; q++) if (Math.abs(geo.rj(q) - rr) < Math.abs(geo.rj(best) - rr)) best = q; j = best; }
      if (o.ring != null) j = ringIndex(geo, o.ring, errs, pre);
      var bStart = bOf(sub(fp, C0));
      pts = [];
      var mR = o.to_lane || pr.m || Math.min(j, b.nOut);
      var bx = b.b + Math.asin(geo.uOut(b, mR) / geo.rj(j)) * R2D + PHI;
      var sw = ((bStart - bx) % 360 + 360) % 360;
      if (sw > 355) sw = 0;
      pts = arcPts(C0, geo.rj(j), bStart, bStart - sw, 0.35);
      marks.line = 0; marks.entry = 0;
      return finishExit(geo, pts, b, j, mR, bStart - sw, marks, null, null, 'ring');
    }
    a = A[pr.from];
    if (!a) { errs.push(pre + 'route "' + name + '": arm ' + pr.from + ' does not exist'); return null; }
    k = pr.k || (o.fromLane && o.fromLane.arm === pr.from && o.fromLane.dir === 'in' ? o.fromLane.k : 1);
    if (k < 1 || k > a.nIn) { errs.push(pre + 'route "' + name + '": arm ' + pr.from + ' has ' + a.nIn + ' entry lane(s)'); return null; }
    var nR = geo.nR;
    if (o.ring != null) j = ringIndex(geo, o.ring, errs, pre);
    else j = a.nIn <= nR ? k : Math.max(1, Math.min(nR, k - (a.nIn - nR)));
    var m = pr.m || o.to_lane || Math.min(j, b.nOut);
    if (m < 1 || m > b.nOut) { errs.push(pre + 'route "' + name + '": arm ' + pr.to + ' has ' + b.nOut + ' exit lane(s)'); return null; }
    inLane = geo.lanes[pr.from + '.in.' + k];
    var r = geo.rj(j);
    var bj = a.b - Math.asin(Math.min(0.95, geo.uIn(a, k) / r)) * R2D - PHI;
    var p0 = inLane.path.pos(inLane.path.length), v0 = mul(a.d, -1);
    var p3 = add(C0, mul(dirB(bj), r)), v3 = dirB(bj - 90);
    var entry = turnPts(p0, v0, p3, v3, 0.5);
    pts = joinPts(inLane.path.p, entry);
    marks.line = inLane.path.length;
    marks.entry = marks.line + new Path(entry).length;
    var bx2 = b.b + Math.asin(Math.min(0.95, geo.uOut(b, m) / r)) * R2D + PHI;
    var sweep = ((bj - bx2) % 360 + 360) % 360;
    if (pr.to !== pr.from && sweep > 330) sweep = 0;
    if (pr.to === pr.from && sweep < 180) sweep += 360;
    pts = joinPts(pts, arcPts(C0, r, bj, bj - sweep, 0.35));
    var res = finishExit(geo, pts, b, j, m, bj - sweep, marks, inLane, k, pr.to === pr.from ? 'uturn' : null);
    // exit number (1st, 2nd, ...) counted anticlockwise from the entry
    var order = geo.armNames.slice().sort(function (x, y) { return ((BEAR[a.name] - BEAR[x] + 360) % 360 || 360) - ((BEAR[a.name] - BEAR[y] + 360) % 360 || 360); });
    res.exitNo = order.indexOf(pr.to) + 1;
    res.turn = res.exitNo === order.length ? 'uturn' : (res.exitNo === 1 ? 'right' : (BEAR[a.name] - BEAR[pr.to] + 360) % 360 === 180 ? 'straight' : ((BEAR[a.name] - BEAR[pr.to] + 360) % 360 < 180 ? 'right' : 'left'));
    res.ringLane = j; res.entryLane = k; res.nIn = a.nIn;
    return res;
  }
  function finishExit(geo, pts, b, j, m, bLeave, marks, inLane, k, turn) {
    var C0 = P(0, 0), r = geo.rj(j);
    var q0 = add(C0, mul(dirB(bLeave), r)), v0 = dirB(bLeave - 90);
    var Lout = geo.lanes[b.name + '.out.' + m];
    var q3 = Lout.path.pos(0), v3 = b.d;
    var ex = turnPts(q0, v0, q3, v3, 0.5);
    marks.ringEnd = new Path(pts).length;
    pts = joinPts(pts, ex);
    marks.exit = new Path(pts).length;
    pts = joinPts(pts, Lout.path.p);
    return { path: new Path(pts), marks: marks, endLane: Lout, inLane: inLane, ringLane: j, turn: turn };
  }

  // ================================================================== templates: highway-merge / highway-exit
  var HW_KEYS = ['lanes', 'len', 'width', 'accel', 'decel', 'ramp_at', 'opposite', 'scenery', 'markings', 'signs'];
  function buildHighway(p, errs, mode) {
    knownKeys(p, HW_KEYS, errs, 'params');
    var geo = new Geo('highway-' + mode, p);
    geo.origin = 'bottom';
    var n = pInt(p.lanes, 3, 2, 4, errs, 'params.lanes');
    var len = pNum(p, 'len', 90, 50, 240, errs);
    var par = pNum(p, mode === 'merge' ? 'accel' : 'decel', mode === 'merge' ? 46 : 32, 15, 150, errs);
    if (mode === 'merge' && p.decel != null) errs.push('params.decel only exists for highway-exit');
    if (mode === 'exit' && p.accel != null) errs.push('params.accel only exists for highway-merge');
    var TAP = 20;
    var y0 = pNum(p, 'ramp_at', mode === 'merge' ? 24 : Math.max(8, len - 24 - par - TAP), 5, len, errs);
    var nOpp = pInt(p.opposite, 0, 0, 4, errs, 'params.opposite');
    var scenery = pEnum(p.scenery, 'desert', ['city', 'desert', 'none'], errs, 'params.scenery');
    var xe = n * LW, xa = xe + LW / 2;
    function laneX(k) { return (n - k + 0.5) * LW; }
    var RAMP_DX = 20;
    var xmin = nOpp ? -(2.4 + nOpp * LW + 4) : -6, xmax = xa + RAMP_DX + 4;
    var w = pNum(p, 'width', Math.max(xmax - xmin + 4, len * 0.6), 30, 260, errs);
    var cx = (xmin + xmax) / 2;
    geo.view = { x: cx - w / 2, y: -len, w: w, h: len };
    var M = 14;
    for (var k = 1; k <= n; k++) geo.addLane('up.' + k, [P(laneX(k), M), P(laneX(k), -len - M)], { group: 'up', k: k, n: n, dir: 'up', kind: 'road' });
    for (var ko = 1; ko <= nOpp; ko++) { var xo = -(2.4 + (nOpp - ko + 0.5) * LW); geo.addLane('down.' + ko, [P(xo, -len - M), P(xo, M)], { group: 'down', k: ko, n: nOpp, dir: 'down', kind: 'road' }); }
    var ramp, y1, y2, ya, yb;
    if (mode === 'merge') {
      y1 = y0 + par; y2 = y1 + TAP;
      var r0 = P(xa + RAMP_DX, M), r3 = P(xa, -y0), hh = (y0 + M) * 0.5;
      ramp = bez(r0, add(r0, P(0, -hh)), add(r3, P(0, hh)), r3);
      geo.addLane('up.0', [P(xa, -y0), P(xa, -y1)], { group: 'up', k: 0, n: n, dir: 'up', kind: 'accel' });
      geo.addLane('up.ramp', joinPts(ramp, [P(xa, -y1)]), { dir: 'up', kind: 'ramp' });
      geo.merge = { y0: y0, y1: y1, y2: y2 };
    } else {
      ya = y0; yb = y0 + TAP; y1 = yb + par;
      var e0 = P(xa, -y1), e3 = P(xa + RAMP_DX, -len - M), h2 = (len + M - y1) * 0.5;
      ramp = bez(e0, add(e0, P(0, -h2)), add(e3, P(0, h2)), e3);
      geo.addLane('up.0', [P(xa, -yb), P(xa, -y1)], { group: 'up', k: 0, n: n, dir: 'up', kind: 'decel' });
      geo.addLane('up.ramp', joinPts([P(xa, -yb)], ramp), { dir: 'up', kind: 'ramp' });
      geo.exitG = { ya: ya, yb: yb, y1: y1 };
    }
    geo.dirs = { up: n, down: nOpp }; geo.kerb = { up: xe + (mode ? LW : 0) + 1, down: xmin + 4 };
    geo.laneX = function (dn, k) { return dn === 'up' ? laneX(k) : -(2.4 + (nOpp - k + 0.5) * LW); };
    geo.len = len;

    geo.draw.push(function (L, K) {
      var v = geo.view, gG = L.ground, gR = L.road, gM = L.marks, gF = L.furniture, yT = v.y - 20, yB = 20;
      groundRect(gG, v, COL.ground);
      speckle(gG, v, 3, '#26241F', 300);
      if (scenery !== 'none') for (var sI = 0; sI < 14; sI++) {
        var rr = rng(500 + sI), sx = v.x + rr() * v.w, sy = v.y + rr() * v.h;
        if (sx > -3 && sx < xa + RAMP_DX + 6) continue;
        shrub(gG, sx, sy, 0.7 + rr() * 0.8);
      }
      // opposite carriageway + median
      if (nOpp) E('rect', { x: f2(-(2.4 + nOpp * LW) - 0.8), y: yT, width: f2(nOpp * LW + 0.8), height: -yT + yB, fill: COL.asphalt }, gR);
      E('rect', { x: -2.4, y: yT, width: 2.4, height: -yT + yB, fill: '#3A3F47' }, gR);
      E('rect', { x: -1.55, y: yT, width: 0.7, height: -yT + yB, fill: '#8D949E' }, gR);
      E('line', { x1: -1.2, y1: yB, x2: -1.2, y2: yT, stroke: '#BAC0C8', 'stroke-width': 0.16 }, gR);
      // main carriageway (with small left shoulder)
      E('rect', { x: -0.5, y: yT, width: f2(xe + 0.5 + 1.0), height: -yT + yB, fill: COL.asphalt }, gR);
      // ramp band
      var rampW = LW + 1.2;
      E('path', { d: dOf(ramp), fill: 'none', stroke: COL.asphalt, 'stroke-width': rampW, 'stroke-linejoin': 'round' }, gR);
      var yA, yZ;
      if (mode === 'merge') {
        E('path', { d: dOf([P(xe, -y0), P(xe + LW + 0.6, -y0), P(xe + LW + 0.6, -y1), P(xe + 1.0, -y2), P(xe, -y2)], true), fill: COL.asphalt }, gR);
        yA = y0; yZ = y1;
      } else {
        E('path', { d: dOf([P(xe, -ya), P(xe + 1.0, -ya), P(xe + LW + 0.6, -yb), P(xe + LW + 0.6, -y1), P(xe, -y1)], true), fill: COL.asphalt }, gR);
        yA = yb; yZ = y1;
      }
      // gore nose (painted) between the ramp's left edge and lane 1
      var left = offsetPts(ramp, -(LW / 2));
      var gore = [];
      if (mode === 'merge') {
        for (var i = left.length - 1; i >= 0; i--) { if (left[i].x - xe > 5.5) break; gore.push(left[i]); }
        if (gore.length > 2) { gore.push(P(xe, gore[gore.length - 1].y)); hatch(gM, gore, COL.white, K, 1.6); }
      } else {
        for (var i2 = 0; i2 < left.length; i2++) { if (left[i2].x - xe > 5.5) break; gore.push(left[i2]); }
        if (gore.length > 2) { gore.push(P(xe, gore[gore.length - 1].y)); hatch(gM, gore, COL.white, K, 1.6); }
      }
      if (p.markings === 'none') return;
      // lane lines
      for (var j = 1; j < n; j++) markLine(gM, [P(j * LW, yB), P(j * LW, yT)], 'broken', COL.white, { dash: '4 8' });
      markLine(gM, [P(0.3 - 0.5 + 0.3, yB), P(0.3 - 0.5 + 0.3, yT)], 'solid', COL.yellow);
      for (var jo = 1; jo < nOpp; jo++) markLine(gM, [P(-(2.4 + jo * LW), yB), P(-(2.4 + jo * LW), yT)], 'broken', COL.white, { dash: '4 8' });
      if (nOpp) markLine(gM, [P(-2.7, yB), P(-2.7, yT)], 'solid', COL.yellow);
      // right edge of lane 1 outside the parallel section, dashed merge line inside it
      markLine(gM, [P(xe + 0.15, yB), P(xe + 0.15, -(mode === 'merge' ? y0 : ya))], 'solid', COL.white);
      markLine(gM, [P(xe, -yA), P(xe, -yZ)], 'broken', COL.white, { w: 0.3, dash: '1.5 1.5' });
      markLine(gM, [P(xe + 0.15, -(mode === 'merge' ? y2 : y1)), P(xe + 0.15, yT)], 'solid', COL.white);
      // outer edge of the ramp / parallel lane
      var rightEdge = offsetPts(ramp, LW / 2 + 0.3), leftEdge = offsetPts(ramp, -(LW / 2 + 0.3));
      markLine(gM, rightEdge, 'solid', COL.white);
      markLine(gM, leftEdge, 'solid', COL.yellow);
      if (mode === 'merge') markLine(gM, [P(xe + LW + 0.3, -y0), P(xe + LW + 0.3, -y1), P(xe + 0.2, -y2)], 'solid', COL.white);
      else markLine(gM, [P(xe + 0.2, -ya), P(xe + LW + 0.3, -yb), P(xe + LW + 0.3, -y1)], 'solid', COL.white);
      // arrows
      if (mode === 'merge') laneArrow(gM, P(xa, -(y0 + par * 0.55)), 0, 'straight+left');
      else laneArrow(gM, P(xa, -(yb + par * 0.4)), 0, 'straight+right');
      if (Array.isArray(p.signs)) p.signs.forEach(function (s) { if (isObj(s) && s.id && isNum(s.y)) signIcon(gF, s.id, P(xe + (mode ? LW : 0) + 3.5, -s.y), 2.6); });
    });

    geo.slot = function (s, size, errs2, pre) { return roadSlot(geo, s, size, errs2, pre); };
    geo.route = function (name, o, errs2, pre) {
      if (name !== (mode === 'merge' ? 'merge' : 'exit')) { errs2.push(pre + 'route "' + name + '" does not exist here (use "' + (mode === 'merge' ? 'merge' : 'exit') + '")'); return null; }
      var L1 = geo.lanes['up.1'], pts, marks = {};
      if (mode === 'merge') {
        var fy = o.fromPos ? -o.fromPos.y : 0;
        var ym = o.merge_at != null ? o.merge_at : Math.min(y2, Math.max(y0 + par * 0.55, fy + 14));
        if (!isNum(ym) || ym < y0 + 8 || ym > y2) { errs2.push(pre + 'merge_at must be between ' + f2(y0 + 8) + ' and ' + f2(y2) + ' (the acceleration lane)'); ym = y0 + par * 0.55; }
        var bl = [];
        for (var i = 0; i <= 24; i++) { var t = i / 24, yy = ym - 16 + 18 * t; bl.push(P(lerp(xa, laneX(1), smooth(t)), -yy)); }
        pts = joinPts(ramp, [P(xa, -(ym - 16))], bl, [P(laneX(1), -len - M)]);
        var path = new Path(pts);
        marks.accel = path.sAtY(-y0); marks.line = marks.accel; marks.merge = path.sAtY(-(ym + 2)); marks.exit = marks.merge;
        return { path: path, marks: marks, endLane: L1, turn: 'merge' };
      }
      var fy2 = o.fromPos ? -o.fromPos.y : 0;
      var ys = o.exit_at != null ? o.exit_at : Math.min(y1 - 18, Math.max(ya + 4, fy2 + 1));
      var bl2 = [];
      for (var i2 = 0; i2 <= 24; i2++) { var t2 = i2 / 24, yy2 = ys + 18 * t2; bl2.push(P(lerp(laneX(1), xa, smooth(t2)), -yy2)); }
      pts = joinPts([P(laneX(1), M)], bl2, [P(xa, -y1)], ramp);
      var path2 = new Path(pts);
      marks.decel = path2.sAtY(-(ys + 18)); marks.line = marks.decel; marks.exit = path2.sAtY(-y1); marks.ramp = marks.exit;
      return { path: path2, marks: marks, endLane: geo.lanes['up.ramp'], turn: 'exit' };
    };
    geo.routeNames = [mode === 'merge' ? 'merge' : 'exit'];
    return geo;
  }

  // ================================================================== template: parking
  var PK_KEYS = ['layout', 'bays', 'angle', 'occupied', 'spaces', 'sides', 'len', 'width', 'scenery', 'markings'];
  function buildParking(p, errs) {
    knownKeys(p, PK_KEYS, errs, 'params');
    var geo = new Geo('parking', p);
    geo.origin = 'bottom';
    var layout = pEnum(p.layout, 'bays', ['bays', 'street'], errs, 'params.layout');
    var occupied = [];
    if (p.occupied != null) { if (!Array.isArray(p.occupied)) errs.push('params.occupied must be a list of bay / space ids'); else occupied = p.occupied.slice(); }
    var M = 12, len, w, bays = {};
    if (layout === 'bays') {
      var nb = pInt(p.bays, 6, 2, 14, errs, 'params.bays');
      var ang = pEnum(p.angle, 90, [90, 60, 45], errs, 'params.angle');
      var BW = 2.6, BD = 5.0, AX = 3.2;
      var sp = BW / Math.sin(ang * D2R), yStart = 8;
      len = pNum(p, 'len', yStart + nb * sp + 12, 20, 200, errs);
      var depthX = BD * Math.sin(ang * D2R);
      w = pNum(p, 'width', Math.max(len * 0.72, 2 * (AX + depthX + 6)), 20, 200, errs);
      geo.view = { x: -w / 2, y: -len, w: w, h: len };
      geo.addLane('up.1', [P(1.6, M), P(1.6, -len - M)], { group: 'up', k: 1, n: 1, dir: 'up', kind: 'aisle' });
      geo.addLane('down.1', [P(-1.6, -len - M), P(-1.6, M)], { group: 'down', k: 1, n: 1, dir: 'down', kind: 'aisle' });
      for (var i = 1; i <= nb; i++) {
        var yc = yStart + (i - 0.5) * sp;
        var hr = ang, hl = 180 + ang;
        // R: entry on x = +AX; axis heading hr
        var er = P(AX, -yc), cr = add(er, mul(dirB(hr), BD / 2));
        var el = P(-AX, -yc), cl = add(el, mul(dirB(hl), BD / 2));
        bays['R' + i] = { id: 'R' + i, c: cr, h: hr, entry: er, side: 'R', y: yc, kind: 'bay' };
        bays['L' + i] = { id: 'L' + i, c: cl, h: hl, entry: el, side: 'L', y: yc, kind: 'bay' };
      }
      geo.bayCfg = { AX: AX, BD: BD, sp: sp, ang: ang, nb: nb, yStart: yStart };
    } else {
      var ns = pInt(p.spaces, 4, 1, 10, errs, 'params.spaces');
      var sides = ['east'];
      if (p.sides != null) { if (!Array.isArray(p.sides)) errs.push('params.sides must be ["east"] or ["east","west"]'); else sides = p.sides.filter(function (x) { return x === 'east' || x === 'west'; }); }
      var SL = 6.5, y0s = 10;
      len = pNum(p, 'len', Math.max(40, y0s + ns * SL + 16), 20, 200, errs);
      w = pNum(p, 'width', Math.max(30, len * 0.72), 20, 200, errs);
      geo.view = { x: -w / 2, y: -len, w: w, h: len };
      geo.addLane('up.1', [P(1.75, M), P(1.75, -len - M)], { group: 'up', k: 1, n: 1, dir: 'up', kind: 'road' });
      geo.addLane('down.1', [P(-1.75, -len - M), P(-1.75, M)], { group: 'down', k: 1, n: 1, dir: 'down', kind: 'road' });
      for (var s = 1; s <= ns; s++) {
        var ya = y0s + (s - 1) * SL, yb = ya + SL;
        if (sides.indexOf('east') >= 0) bays['P' + s] = { id: 'P' + s, c: P(3.5 + 1.25, -(ya + yb) / 2), h: 0, y0: ya, y1: yb, side: 'east', kind: 'space' };
        if (sides.indexOf('west') >= 0) bays['Q' + s] = { id: 'Q' + s, c: P(-3.5 - 1.25, -(ya + yb) / 2), h: 180, y0: ya, y1: yb, side: 'west', kind: 'space' };
      }
      geo.streetCfg = { SL: SL, y0: y0s, ns: ns, sides: sides };
    }
    geo.bays = bays;
    occupied.forEach(function (id) { if (!bays[id]) errs.push('params.occupied: "' + id + '" does not exist (ids: ' + Object.keys(bays).slice(0, 8).join(', ') + '...)'); });
    geo.occupied = occupied;
    geo.len = len; geo.dirs = { up: 1, down: 1 };
    geo.kerb = layout === 'bays' ? { up: 3.2 + 6, down: -3.2 - 6 } : { up: 6.0, down: (geo.streetCfg.sides.indexOf('west') >= 0 ? -6.0 : -3.5) };
    geo.laneX = function (dn) { return (dn === 'up' ? 1 : -1) * (layout === 'bays' ? 1.6 : 1.75); };

    geo.draw.push(function (L, K) {
      var v = geo.view, gG = L.ground, gR = L.road, gM = L.marks, gF = L.furniture, yT = v.y - 20, yB = 20;
      groundRect(gG, v, COL.ground);
      speckle(gG, v, 17, '#26241F', 200);
      if (layout === 'bays') {
        var c = geo.bayCfg, depth = c.BD * Math.sin(c.ang * D2R) + 1.2;
        var x0 = -(c.AX + depth + 1), x1 = c.AX + depth + 1;
        E('rect', { x: f2(x0 - 2.6), y: yT, width: f2(x1 - x0 + 5.2), height: -yT + yB, fill: COL.pave }, gG);
        E('rect', { x: f2(x0), y: yT, width: f2(x1 - x0), height: -yT + yB, fill: COL.asphalt, stroke: COL.kerb, 'stroke-width': 0.4 }, gR);
        block(gG, v.x - 20, yT, x0 - 4, yB, 31);
        block(gG, x1 + 4, yT, v.x + v.w + 20, yB, 32);
        if (p.markings !== 'none') {
          ['R', 'L'].forEach(function (side) {
            var sg = side === 'R' ? 1 : -1, hd = side === 'R' ? c.ang : 180 + c.ang, ax = dirB(hd);
            for (var i2 = 0; i2 <= c.nb; i2++) {
              var yy = c.yStart + i2 * c.sp, e0 = P(sg * c.AX, -yy), e1 = add(e0, mul(ax, c.BD));
              E('line', { x1: f2(e0.x), y1: f2(e0.y), x2: f2(e1.x), y2: f2(e1.y), stroke: COL.white, 'stroke-width': 0.15 }, gM);
            }
            var b0 = add(P(sg * c.AX, -c.yStart), mul(ax, c.BD)), b1 = add(P(sg * c.AX, -(c.yStart + c.nb * c.sp)), mul(ax, c.BD));
            E('line', { x1: f2(b0.x), y1: f2(b0.y), x2: f2(b1.x), y2: f2(b1.y), stroke: COL.white, 'stroke-width': 0.15 }, gM);
          });
          for (var ay = 6; ay < len; ay += 14) {
            laneArrow(gM, P(1.6, -ay), 0, 'straight', { scale: 0.7 });
            laneArrow(gM, P(-1.6, -(ay + 7)), 180, 'straight', { scale: 0.7 });
          }
        }
      } else {
        var cfg = geo.streetCfg, west = cfg.sides.indexOf('west') >= 0;
        var kE = 6.0, kW = west ? -6.0 : -3.5;
        E('rect', { x: f2(kE), y: yT, width: 3, height: -yT + yB, fill: COL.pave }, gG);
        E('rect', { x: f2(kW - 3), y: yT, width: 3, height: -yT + yB, fill: COL.pave }, gG);
        block(gG, kE + 5, yT, v.x + v.w + 20, yB, 41);
        block(gG, v.x - 20, yT, kW - 5, yB, 42);
        E('rect', { x: f2(kW), y: yT, width: f2(kE - kW), height: -yT + yB, fill: COL.asphalt }, gR);
        E('line', { x1: kE, y1: yB, x2: kE, y2: yT, stroke: COL.kerb, 'stroke-width': 0.45 }, gR);
        E('line', { x1: kW, y1: yB, x2: kW, y2: yT, stroke: COL.kerb, 'stroke-width': 0.45 }, gR);
        if (p.markings !== 'none') {
          markLine(gM, [P(0, yB), P(0, yT)], 'broken', COL.white);
          [['east', 3.5, 1], ['west', -3.5, -1]].forEach(function (sd) {
            if (cfg.sides.indexOf(sd[0]) < 0) return;
            markLine(gM, [P(sd[1], yB), P(sd[1], yT)], 'solid', COL.white, { w: 0.14 });
            for (var s2 = 0; s2 <= cfg.ns; s2++) { var yy2 = cfg.y0 + s2 * cfg.SL; E('line', { x1: sd[1], y1: f2(-yy2), x2: f2(sd[1] + sd[2] * 2.5), y2: f2(-yy2), stroke: COL.white, 'stroke-width': 0.14 }, gM); }
          });
        }
      }
      // parked cars in occupied bays
      occupied.forEach(function (id, i3) {
        var b = bays[id];
        if (!b) return;
        var cols = ['silver', 'white', 'black', 'blue', 'red', 'grey', 'white', 'silver', 'green'];
        var pg = G(gF, { transform: tr(b.c.x, b.c.y, b.h + (b.kind === 'bay' && i3 % 3 === 2 ? 180 : 0)) });
        drawCarBody(pg, { color: cols[hash(id) % cols.length], parked: true });
        geo.parked.push({ x: b.c.x, y: b.c.y, h: b.h, len: 4.6, wid: 1.95 });
      });
    });
    geo.extraSlotKeys = ['bay', 'space', 'nose'];
    geo.slotExtra = function (s, size, errs2, pre) {
      var id = s.bay != null ? s.bay : s.space;
      if (id == null) return null;
      var b = bays[id];
      if (!b) { errs2.push(pre + (s.bay != null ? 'bay' : 'space') + ' "' + id + '" does not exist (ids: ' + Object.keys(bays).join(', ') + ')'); return null; }
      var h = b.h + (s.nose === 'out' ? 180 : 0);
      if (s.nose != null && s.nose !== 'in' && s.nose !== 'out') errs2.push(pre + 'nose must be "in" or "out"');
      return { x: b.c.x, y: b.c.y, h: isNum(s.heading) ? s.heading : h, bay: b, free: true };
    };
    geo.slot = function (s, size, errs2, pre) { return roadSlot(geo, s, size, errs2, pre); };
    geo.route = function (name, o, errs2, pre) { errs2.push(pre + 'parking scenes have no named routes: use "park": "<bay id>" or "leave": "up"|"down"'); return null; };
    geo.routeNames = [];
    return geo;
  }

  // parking manoeuvres: returns [{pts, reverse}] legs, or null
  function parkLegs(geo, bayId, o, errs, pre) {
    var b = geo.bays[bayId];
    if (!b) { errs.push(pre + 'park: "' + bayId + '" does not exist (ids: ' + Object.keys(geo.bays).join(', ') + ')'); return null; }
    var fp = o.fromPos, fh = o.fromH;
    var up = dirB(fh || 0).y < 0;          // moving north?
    var lx = geo.laneX(up ? 'up' : 'down'), vy = up ? -1 : 1;
    var legs = [];
    if (b.kind === 'space') {
      if (!up && b.side === 'east' || up && b.side === 'west') errs.push(pre + 'park: space ' + bayId + ' is on the other side of the street; drive in the direction of that kerb');
      var s = up ? 1 : -1;
      var stopY = up ? -(b.y1 + 2.9) : -(b.y0 - 2.9);
      var sA = P(lx, stopY);
      legs.push({ pts: joinPts([fp], segPts(P(lx, fp.y), sA, 1)), reverse: false });
      var endP = P(b.c.x, b.c.y + (up ? 0.3 : -0.3)), hh = Math.abs(sA.y - endP.y) * 0.5;
      legs.push({ pts: bez(sA, add(sA, P(0, -vy * hh)), sub(endP, P(0, -vy * hh)), endP), reverse: true });
      return legs;
    }
    var cfg = geo.bayCfg, bayDir = dirB(b.h);
    if (o.reverse) {
      var past = P(lx - (b.side === 'R' ? 0.9 : -0.9) * (up ? 1 : -1), -(b.y + (up ? 5.6 : -5.6)));
      legs.push({ pts: joinPts([fp], turnPts(fp, dirB(fh), past, P(0, vy), 0.5)), reverse: false });
      legs.push({ pts: turnPts(past, P(0, -vy), b.c, bayDir, 0.55), reverse: true });
      return legs;
    }
    var d0 = cfg.ang === 90 ? 5.2 : (cfg.ang === 60 ? 3.6 : 2.6);
    var start = P(lx, -(b.y - (up ? d0 : -d0)));
    if (up && -start.y < -fp.y - 0.1 || !up && -start.y > -fp.y + 0.1) errs.push(pre + 'park: the car is already past bay ' + bayId + ' (it can only drive forward to reach it)');
    legs.push({ pts: joinPts([fp], [start], turnPts(start, P(0, vy), b.c, bayDir, 0.55)), reverse: false });
    return legs;
  }
  function leaveLegs(geo, bay, heading, dir, errs, pre) {
    var up = dir !== 'down', lx = geo.laneX(up ? 'up' : 'down'), vy = up ? -1 : 1, len = geo.len;
    var endY = up ? -len - 14 : 14;
    if (bay.kind === 'space') {
      var s0 = P(bay.c.x, bay.c.y), e = P(lx, bay.c.y + vy * 9);
      return [{ pts: joinPts(bez(s0, add(s0, P(0, vy * 4)), sub(e, P(0, vy * 4)), e), [P(lx, endY)]), reverse: false }];
    }
    var face = dirB(heading), intoAisle = (face.x * (bay.side === 'R' ? -1 : 1)) > 0; // nose towards the aisle?
    if (intoAisle) {
      var e2 = P(lx, bay.c.y + vy * 5);
      return [{ pts: joinPts(turnPts(P(bay.c.x, bay.c.y), face, e2, P(0, vy), 0.55), [P(lx, endY)]), reverse: false }];
    }
    var back = mul(face, -1), e3 = P(lx, bay.c.y - vy * 4.5);
    return [{ pts: turnPts(P(bay.c.x, bay.c.y), back, e3, P(0, -vy), 0.55), reverse: true },
            { pts: [e3, P(lx, endY)], reverse: false }];
  }

  // ================================================================== actors (drawn nose-up, centred)
  var ACTOR_TYPES = ['car', 'me', 'truck', 'bus', 'school-bus', 'ambulance', 'police', 'fire', 'taxi', 'motorcycle',
    'bicycle', 'pedestrian', 'ball', 'camel', 'cone', 'barrier'];
  var SIZES = {
    car: [4.6, 1.95], me: [4.6, 1.95], taxi: [4.7, 1.9], police: [4.9, 1.95], ambulance: [6.0, 2.25], fire: [8.6, 2.5],
    truck: [9.6, 2.5], bus: [12, 2.55], 'school-bus': [10.6, 2.5], motorcycle: [2.2, 0.85], bicycle: [1.85, 0.62],
    pedestrian: [0.8, 1.22], ball: [0.95, 0.95], camel: [3.1, 1.0], cone: [0.84, 0.84], barrier: [0.7, 2.0]
  };
  var VEHICLES = { car: 1, me: 1, taxi: 1, police: 1, ambulance: 1, fire: 1, truck: 1, bus: 1, 'school-bus': 1, motorcycle: 1, bicycle: 1 };
  var EMERGENCY = { ambulance: 1, police: 1, fire: 1 };

  function shade(hex, amt) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(c) { return clamp(Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt), 0, 255); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  function paintOf(c, def) { return PAINT[c] || (/^#[0-9a-fA-F]{6}$/.test(c || '') ? c : PAINT[def] || def); }

  function shadowRect(g, L, W, r) {
    E('rect', { x: f2(-W / 2 + 0.22), y: f2(-L / 2 + 0.32), width: f2(W), height: f2(L), rx: r, fill: COL.shadow, opacity: 0.38 }, g);
  }

  // passenger car body (also used for parked scenery cars)
  function drawCarBody(g, o) {
    o = o || {};
    var L = o.len || 4.6, W = o.wid || 1.95, hl = L / 2, hw = W / 2;
    var c = paintOf(o.color, 'white'), dark = o.color === 'black';
    shadowRect(g, L, W, 0.6);
    if (o.me) E('rect', { x: f2(-hw - 0.45), y: f2(-hl - 0.45), width: f2(W + 0.9), height: f2(L + 0.9), rx: 0.9, fill: 'none', stroke: COL.gold, 'stroke-width': 0.5, opacity: 0.35 }, g);
    E('rect', { x: f2(-hw), y: f2(-hl), width: f2(W), height: f2(L), rx: 0.55, fill: c, stroke: o.me ? COL.gold : (dark ? '#5A626E' : shade(c, -0.35)), 'stroke-width': o.me ? 0.24 : 0.09 }, g);
    E('path', { d: 'M' + f2(-hw + 0.2) + ' ' + f2(-hl + 0.9) + ' Q0 ' + f2(-hl + 0.55) + ' ' + f2(hw - 0.2) + ' ' + f2(-hl + 0.9), fill: 'none', stroke: shade(c, dark ? 0.15 : -0.15), 'stroke-width': 0.06 }, g);
    E('path', { d: 'M-0.8 -0.95 L0.8 -0.95 L0.68 -0.22 L-0.68 -0.22 Z', fill: COL.glass }, g);
    E('rect', { x: -0.7, y: -0.22, width: 1.4, height: 1.45, rx: 0.18, fill: shade(c, dark ? 0.1 : 0.07) }, g);
    E('path', { d: 'M-0.7 1.28 L0.7 1.28 L0.78 1.72 L-0.78 1.72 Z', fill: COL.glass }, g);
    E('rect', { x: f2(-hw + 0.08), y: -0.9, width: 0.13, height: 2.4, rx: 0.05, fill: COL.glass, opacity: 0.8 }, g);
    E('rect', { x: f2(hw - 0.21), y: -0.9, width: 0.13, height: 2.4, rx: 0.05, fill: COL.glass, opacity: 0.8 }, g);
    E('rect', { x: f2(-hw - 0.17), y: -0.78, width: 0.22, height: 0.15, rx: 0.05, fill: shade(c, -0.2) }, g);
    E('rect', { x: f2(hw - 0.05), y: -0.78, width: 0.22, height: 0.15, rx: 0.05, fill: shade(c, -0.2) }, g);
    E('rect', { x: f2(-hw + 0.16), y: f2(-hl + 0.03), width: 0.5, height: 0.15, rx: 0.05, fill: '#F4F1DE' }, g);
    E('rect', { x: f2(hw - 0.66), y: f2(-hl + 0.03), width: 0.5, height: 0.15, rx: 0.05, fill: '#F4F1DE' }, g);
    var tl = [E('rect', { x: f2(-hw + 0.14), y: f2(hl - 0.17), width: 0.5, height: 0.13, rx: 0.04, fill: '#8E1C1C' }, g),
      E('rect', { x: f2(hw - 0.64), y: f2(hl - 0.17), width: 0.5, height: 0.13, rx: 0.04, fill: '#8E1C1C' }, g)];
    return { tail: tl };
  }

  function drawVan(g, o, L, W) {
    var hl = L / 2, hw = W / 2, c = o.color;
    shadowRect(g, L, W, 0.4);
    E('rect', { x: f2(-hw), y: f2(-hl), width: f2(W), height: f2(L), rx: 0.4, fill: c, stroke: shade(c, -0.3), 'stroke-width': 0.09 }, g);
    E('path', { d: 'M' + f2(-hw + 0.2) + ' ' + f2(-hl + 0.35) + ' L' + f2(hw - 0.2) + ' ' + f2(-hl + 0.35) + ' L' + f2(hw - 0.3) + ' ' + f2(-hl + 1.0) + ' L' + f2(-hw + 0.3) + ' ' + f2(-hl + 1.0) + 'Z', fill: COL.glass }, g);
    E('rect', { x: f2(-hw + 0.25), y: f2(-hl + 1.2), width: f2(W - 0.5), height: f2(L - 1.6), rx: 0.2, fill: shade(c, 0.06) }, g);
  }

  function lightsOf(emit, L, W, parts, o) {
    var hl = L / 2, hw = W / 2;
    o = o || {};
    // indicators
    var mk = function (x, y) {
      var gg = G(emit, { display: 'none' });
      E('circle', { cx: f2(x), cy: f2(y), r: 0.8, fill: '#FFB21E', opacity: 0.35 }, gg);
      E('circle', { cx: f2(x), cy: f2(y), r: 0.26, fill: '#FFC24A' }, gg);
      return gg;
    };
    parts.indL = [mk(-hw + 0.12, -hl + 0.15), mk(-hw + 0.12, hl - 0.15)];
    parts.indR = [mk(hw - 0.12, -hl + 0.15), mk(hw - 0.12, hl - 0.15)];
    // brake lights
    var bg = G(emit, { display: 'none' });
    E('rect', { x: f2(-hw - 0.2), y: f2(hl - 0.25), width: f2(W + 0.4), height: 0.9, rx: 0.4, fill: '#FF2A2A', opacity: 0.28 }, bg);
    E('rect', { x: f2(-hw + 0.12), y: f2(hl - 0.2), width: 0.56, height: 0.18, rx: 0.05, fill: '#FF4A3D' }, bg);
    E('rect', { x: f2(hw - 0.68), y: f2(hl - 0.2), width: 0.56, height: 0.18, rx: 0.05, fill: '#FF4A3D' }, bg);
    parts.brake = bg;
    // night lights (headlight beams + tail glow), toggled by the night overlay
    var ng = G(emit, { display: 'none' });
    if (o.beam !== false) E('path', { d: 'M' + f2(-hw + 0.3) + ' ' + f2(-hl) + ' L' + f2(-hw - 3.2) + ' ' + f2(-hl - 17) + ' L' + f2(hw + 3.2) + ' ' + f2(-hl - 17) + ' L' + f2(hw - 0.3) + ' ' + f2(-hl) + 'Z', fill: 'url(#' + o.beamId + ')' }, ng);
    E('circle', { cx: f2(-hw + 0.4), cy: f2(hl - 0.1), r: 0.35, fill: '#FF3B30', opacity: 0.8 }, ng);
    E('circle', { cx: f2(hw - 0.4), cy: f2(hl - 0.1), r: 0.35, fill: '#FF3B30', opacity: 0.8 }, ng);
    parts.night = ng;
  }

  function emergencyBar(g, emit, parts, y, W, big) {
    var hw = W * 0.36;
    E('rect', { x: f2(-hw - 0.05), y: f2(y - 0.22), width: f2(2 * hw + 0.1), height: 0.44, rx: 0.12, fill: '#1B1E23' }, g);
    var a = E('rect', { x: f2(-hw), y: f2(y - 0.17), width: f2(hw), height: 0.34, rx: 0.08, fill: '#7A1A1A' }, g);
    var b = E('rect', { x: 0, y: f2(y - 0.17), width: f2(hw), height: 0.34, rx: 0.08, fill: '#1A2A6A' }, g);
    var ga = G(emit, { display: 'none' }), gb = G(emit, { display: 'none' });
    E('circle', { cx: f2(-W * 0.45), cy: f2(y), r: big ? 2.1 : 1.7, fill: '#FF2A2A', opacity: 0.34 }, ga);
    E('rect', { x: f2(-hw), y: f2(y - 0.17), width: f2(hw), height: 0.34, rx: 0.08, fill: '#FF4A3D' }, ga);
    E('circle', { cx: f2(W * 0.45), cy: f2(y), r: big ? 2.1 : 1.7, fill: '#3D7BFF', opacity: 0.36 }, gb);
    E('rect', { x: 0, y: f2(y - 0.17), width: f2(hw), height: 0.34, rx: 0.08, fill: '#5A8BFF' }, gb);
    parts.flashA = ga; parts.flashB = gb; parts.barOff = [a, b];
  }
  function sirenWaves(emit, parts, L) {
    var sg = G(emit, { display: 'none' });
    parts.waves = [];
    for (var i = 0; i < 3; i++) parts.waves.push(E('path', { d: 'M-2 0 Q0 -1.1 2 0', fill: 'none', stroke: '#E8EEF8', 'stroke-width': 0.22, 'stroke-linecap': 'round', opacity: 0.8 }, sg));
    parts.siren = sg; parts.sirenBase = -L / 2 - 0.8;
  }

  function drawActor(a, L2, K) {
    var type = a.type, parts = {}, len = a.len, wid = a.wid;
    var body = G(L2.actors, { 'class': 'mq-actor' }), emit = G(L2.emit), hl = len / 2, hw = wid / 2;
    var o = { beamId: K.beamId };
    switch (type) {
      case 'car': case 'me': case 'taxi': case 'police': {
        var col = type === 'taxi' ? 'cream' : (type === 'police' ? 'white' : (a.color || (type === 'me' ? 'white' : 'silver')));
        var r = drawCarBody(body, { color: col, me: type === 'me', len: len, wid: wid });
        parts.tail = r.tail;
        if (type === 'taxi') {
          E('rect', { x: -0.72, y: -0.22, width: 1.44, height: 1.45, rx: 0.18, fill: PAINT.red }, body);
          E('rect', { x: -0.42, y: 0.25, width: 0.84, height: 0.34, rx: 0.08, fill: '#F2C230' }, body);
        }
        if (type === 'police') {
          E('rect', { x: f2(-hw), y: -0.1, width: 0.22, height: 2.1, fill: '#1E6B45' }, body);
          E('rect', { x: f2(hw - 0.22), y: -0.1, width: 0.22, height: 2.1, fill: '#1E6B45' }, body);
          E('rect', { x: -0.7, y: 0.5, width: 1.4, height: 0.5, fill: '#1E6B45' }, body);
          emergencyBar(body, emit, parts, 0.1, wid, false);
          sirenWaves(emit, parts, len);
        }
        lightsOf(emit, len, wid, parts, o);
        break;
      }
      case 'ambulance': {
        drawVan(body, { color: '#F2F3F5' }, len, wid);
        E('rect', { x: f2(-hw), y: f2(-hl + 1.5), width: 0.25, height: f2(len - 2.2), fill: PAINT.red }, body);
        E('rect', { x: f2(hw - 0.25), y: f2(-hl + 1.5), width: 0.25, height: f2(len - 2.2), fill: PAINT.red }, body);
        E('circle', { cx: 0, cy: 0.9, r: 0.62, fill: PAINT.red }, body);
        E('circle', { cx: 0.24, cy: 0.82, r: 0.52, fill: shade('#F2F3F5', 0.06) }, body);
        emergencyBar(body, emit, parts, -hl + 1.35, wid, true);
        sirenWaves(emit, parts, len);
        lightsOf(emit, len, wid, parts, o);
        break;
      }
      case 'fire': {
        drawVan(body, { color: '#C21F26' }, len, wid);
        E('rect', { x: -0.55, y: f2(-hl + 2.0), width: 0.12, height: f2(len - 2.6), fill: '#B9BEC6' }, body);
        E('rect', { x: 0.43, y: f2(-hl + 2.0), width: 0.12, height: f2(len - 2.6), fill: '#B9BEC6' }, body);
        for (var ry = -hl + 2.3; ry < hl - 0.7; ry += 0.7) E('rect', { x: -0.45, y: f2(ry), width: 0.9, height: 0.08, fill: '#B9BEC6' }, body);
        E('rect', { x: f2(-hw), y: f2(-hl + 1.4), width: f2(wid), height: 0.18, fill: '#F2F2EE' }, body);
        emergencyBar(body, emit, parts, -hl + 1.15, wid, true);
        sirenWaves(emit, parts, len);
        lightsOf(emit, len, wid, parts, o);
        break;
      }
      case 'truck': {
        var cab = paintOf(a.color, 'white');
        shadowRect(body, len, wid, 0.3);
        E('rect', { x: f2(-hw + 0.05), y: f2(-hl + 2.5), width: f2(wid - 0.1), height: f2(len - 2.5), rx: 0.2, fill: '#D5D8DC', stroke: '#8D939B', 'stroke-width': 0.1 }, body);
        for (var tyy = -hl + 3.2; tyy < hl - 0.4; tyy += 1.2) E('line', { x1: f2(-hw + 0.2), y1: f2(tyy), x2: f2(hw - 0.2), y2: f2(tyy), stroke: '#B5BAC1', 'stroke-width': 0.08 }, body);
        E('rect', { x: f2(-hw), y: f2(-hl), width: f2(wid), height: 2.35, rx: 0.35, fill: cab, stroke: shade(cab, -0.35), 'stroke-width': 0.09 }, body);
        E('rect', { x: f2(-hw + 0.25), y: f2(-hl + 0.3), width: f2(wid - 0.5), height: 0.55, rx: 0.1, fill: COL.glass }, body);
        lightsOf(emit, len, wid, parts, o);
        break;
      }
      case 'bus': case 'school-bus': {
        var sb = type === 'school-bus', bc = sb ? '#F2C230' : paintOf(a.color, 'white');
        shadowRect(body, len, wid, 0.5);
        E('rect', { x: f2(-hw), y: f2(-hl), width: f2(wid), height: f2(len), rx: 0.5, fill: bc, stroke: shade(bc, -0.35), 'stroke-width': 0.1 }, body);
        E('rect', { x: f2(-hw + 0.25), y: f2(-hl + 0.2), width: f2(wid - 0.5), height: 0.7, rx: 0.15, fill: COL.glass }, body);
        E('rect', { x: f2(-hw + 0.3), y: f2(-hl + 1.3), width: f2(wid - 0.6), height: f2(len - 1.9), rx: 0.25, fill: shade(bc, 0.1) }, body);
        E('rect', { x: -0.55, y: f2(-hl + 3), width: 1.1, height: 2.2, rx: 0.2, fill: shade(bc, -0.12) }, body);
        if (sb) {
          E('rect', { x: f2(-hw), y: f2(-hl + 1.2), width: 0.14, height: f2(len - 1.8), fill: '#1A1A1A' }, body);
          E('rect', { x: f2(hw - 0.14), y: f2(-hl + 1.2), width: 0.14, height: f2(len - 1.8), fill: '#1A1A1A' }, body);
          // stop arm on the LEFT (driver) side, near the front
          var arm = G(body, { transform: tr(-hw, -hl + 1.9, -90) });
          E('rect', { x: -1.5, y: -0.09, width: 1.5, height: 0.18, fill: '#2A2A2A' }, arm);
          var oct = function (cx, r) { var pts = []; for (var k = 0; k < 8; k++) { var an = (22.5 + k * 45) * D2R; pts.push(f2(cx + r * Math.cos(an)) + ',' + f2(r * Math.sin(an))); } return pts.join(' '); };
          E('polygon', { points: oct(-2.3, 0.85), fill: '#FFFFFF' }, arm);
          E('polygon', { points: oct(-2.3, 0.74), fill: PAINT.red }, arm);
          E('text', { x: -2.3, y: 0.02, 'font-size': 0.36, 'font-weight': 700, 'font-family': LATIN, fill: '#FFFFFF', 'text-anchor': 'middle', 'dominant-baseline': 'central', direction: 'ltr' }, arm).textContent = 'STOP';
          parts.arm = arm;
          var fl = function (x, y) { var gg = G(emit, { display: 'none' }); E('circle', { cx: f2(x), cy: f2(y), r: 1.1, fill: '#FF2A2A', opacity: 0.35 }, gg); E('circle', { cx: f2(x), cy: f2(y), r: 0.24, fill: '#FF5A4D' }, gg); return gg; };
          parts.flashA = G(emit); parts.flashB = G(emit);
          parts.flashA.appendChild(fl(-hw + 0.3, -hl + 0.2)); parts.flashA.appendChild(fl(-hw + 0.3, hl - 0.2));
          parts.flashB.appendChild(fl(hw - 0.3, -hl + 0.2)); parts.flashB.appendChild(fl(hw - 0.3, hl - 0.2));
          show(parts.flashA, false); show(parts.flashB, false);
          [].slice.call(parts.flashA.childNodes).concat([].slice.call(parts.flashB.childNodes)).forEach(function (n) { show(n, true); });
        }
        lightsOf(emit, len, wid, parts, o);
        break;
      }
      case 'motorcycle': case 'bicycle': {
        var bike = type === 'bicycle';
        shadowRect(body, len, wid * 0.8, 0.3);
        if (bike) {
          E('rect', { x: -0.06, y: f2(-hl), width: 0.12, height: 0.62, rx: 0.06, fill: '#1B1B1B' }, body);
          E('rect', { x: -0.06, y: f2(hl - 0.62), width: 0.12, height: 0.62, rx: 0.06, fill: '#1B1B1B' }, body);
          E('line', { x1: 0, y1: f2(-hl + 0.5), x2: 0, y2: f2(hl - 0.5), stroke: paintOf(a.color, 'blue'), 'stroke-width': 0.1 }, body);
          E('line', { x1: -0.3, y1: f2(-hl + 0.45), x2: 0.3, y2: f2(-hl + 0.45), stroke: '#555', 'stroke-width': 0.07 }, body);
        } else {
          E('rect', { x: -0.13, y: f2(-hl), width: 0.26, height: 0.6, rx: 0.1, fill: '#151515' }, body);
          E('rect', { x: -0.14, y: f2(hl - 0.6), width: 0.28, height: 0.6, rx: 0.1, fill: '#151515' }, body);
          E('rect', { x: -0.27, y: f2(-hl + 0.4), width: 0.54, height: f2(len - 0.9), rx: 0.2, fill: paintOf(a.color, 'black') === PAINT.black ? '#3A3F47' : paintOf(a.color, 'black') }, body);
          E('line', { x1: -0.42, y1: f2(-hl + 0.55), x2: 0.42, y2: f2(-hl + 0.55), stroke: '#9AA3AE', 'stroke-width': 0.08 }, body);
          if (a.variant === 'delivery') {
            E('rect', { x: -0.34, y: f2(hl - 0.95), width: 0.68, height: 0.62, rx: 0.08, fill: '#E0452B', stroke: '#8E2515', 'stroke-width': 0.05 }, body);
          }
        }
        E('ellipse', { cx: 0, cy: bike ? 0.05 : -0.05, rx: 0.36, ry: 0.2, fill: bike ? '#2E7D6B' : '#2B2F36' }, body);
        E('circle', { cx: 0, cy: bike ? -0.05 : -0.15, r: 0.16, fill: bike ? '#F2F2EE' : paintOf(a.helmet || 'white', 'white') }, body);
        if (!bike) lightsOf(emit, len, wid, parts, { beamId: K.beamId });
        break;
      }
      case 'pedestrian': {
        var child = a.variant === 'child', sc = child ? 1.12 : 1.44;
        var pg = G(body, { transform: 'scale(' + sc + ')' });
        E('ellipse', { cx: 0.12, cy: 0.18, rx: 0.48, ry: 0.3, fill: COL.shadow, opacity: 0.4 }, pg);
        parts.feet = [E('ellipse', { cx: -0.13, cy: 0, rx: 0.08, ry: 0.14, fill: '#1A1A1A' }, pg), E('ellipse', { cx: 0.13, cy: 0, rx: 0.08, ry: 0.14, fill: '#1A1A1A' }, pg)];
        var cloth = paintOf(a.color, child ? 'orange' : 'white');
        E('ellipse', { cx: 0, cy: 0, rx: 0.42, ry: 0.21, fill: cloth, stroke: '#14171C', 'stroke-width': 0.07 }, pg);
        E('circle', { cx: -0.4, cy: 0.02, r: 0.08, fill: '#C89A74', stroke: '#14171C', 'stroke-width': 0.03 }, pg);
        E('circle', { cx: 0.4, cy: 0.02, r: 0.08, fill: '#C89A74', stroke: '#14171C', 'stroke-width': 0.03 }, pg);
        var adultMan = !child && a.variant !== 'woman';
        E('circle', { cx: 0, cy: -0.02, r: 0.17, fill: child ? '#2B1D14' : (adultMan ? '#F4F4F0' : '#161616'), stroke: '#14171C', 'stroke-width': 0.04 }, pg);
        if (adultMan) E('circle', { cx: 0, cy: -0.02, r: 0.09, fill: 'none', stroke: '#14171C', 'stroke-width': 0.045 }, pg);
        break;
      }
      case 'ball': {
        E('circle', { cx: 0.14, cy: 0.18, r: 0.5, fill: COL.shadow, opacity: 0.35 }, body);
        var spin = G(body, {});
        var spinIn = G(spin, { transform: 'scale(1.55)' });
        E('circle', { cx: 0, cy: 0, r: 0.31, fill: paintOf(a.color, 'white') === PAINT.white ? '#F7F7F2' : paintOf(a.color, 'white'), stroke: '#1B1B1B', 'stroke-width': 0.04 }, spinIn);
        E('circle', { cx: 0, cy: 0, r: 0.09, fill: '#1B1B1B' }, spinIn);
        E('circle', { cx: 0.2, cy: -0.13, r: 0.06, fill: '#1B1B1B' }, spinIn);
        E('circle', { cx: -0.19, cy: 0.14, r: 0.06, fill: '#1B1B1B' }, spinIn);
        parts.spin = spin;
        break;
      }
      case 'camel': {
        E('ellipse', { cx: 0.25, cy: 0.35, rx: 0.55, ry: 1.2, fill: COL.shadow, opacity: 0.32 }, body);
        E('path', { d: 'M-0.12 -0.5 L-0.14 -1.25 Q0 -1.4 0.14 -1.25 L0.12 -0.5 Z', fill: '#A87A48' }, body);
        E('ellipse', { cx: 0, cy: -1.35, rx: 0.17, ry: 0.28, fill: '#9C6F3F' }, body);
        E('ellipse', { cx: 0, cy: 0.35, rx: 0.48, ry: 1.0, fill: '#B98B55', stroke: '#8A6337', 'stroke-width': 0.05 }, body);
        E('ellipse', { cx: 0, cy: 0.25, rx: 0.3, ry: 0.42, fill: '#CFA46E' }, body);
        E('path', { d: 'M0 1.3 L0 1.55', stroke: '#6B4A28', 'stroke-width': 0.08 }, body);
        break;
      }
      case 'cone': {
        E('rect', { x: -0.42, y: -0.42, width: 0.84, height: 0.84, rx: 0.12, fill: '#1B1B1B' }, body);
        E('circle', { cx: 0, cy: 0, r: 0.36, fill: COL.orange }, body);
        E('circle', { cx: 0, cy: 0, r: 0.22, fill: '#F4F4F0' }, body);
        E('circle', { cx: 0, cy: 0, r: 0.11, fill: COL.orange }, body);
        break;
      }
      case 'barrier': {
        shadowRect(body, len, wid, 0.15);
        for (var bi = 0; bi < 4; bi++) E('rect', { x: f2(-hw + bi * wid / 4), y: f2(-hl), width: f2(wid / 4), height: f2(len), fill: bi % 2 ? '#F2F2EE' : '#D0312D' }, body);
        E('rect', { x: f2(-hw), y: f2(-hl), width: f2(wid), height: f2(len), rx: 0.12, fill: 'none', stroke: '#6B1A18', 'stroke-width': 0.06 }, body);
        break;
      }
    }
    // highlight frame (rotates with the actor, drawn above overlays)
    var pad = VEHICLES[type] ? 0.75 : 0.9;
    parts.hl = E('rect', { x: f2(-hw - pad), y: f2(-hl - pad), width: f2(wid + 2 * pad), height: f2(len + 2 * pad), rx: 1.1, fill: 'none', stroke: COL.gold, 'stroke-width': 0.34, 'stroke-dasharray': '1 0.6', display: 'none' }, emit);
    return { body: body, emit: emit, parts: parts };
  }

  // ================================================================== compile (spec -> actors, segments, tracks)
  var MOVE_KEYS = ['route', 'drive', 'lane_change', 'pull_over', 'stop_at', 'cross', 'to', 'path', 'park', 'leave'];
  var STATE_KEYS = ['signal', 'brake', 'flash', 'siren', 'stop_arm', 'highlight', 'visible', 'say'];
  var MOD_KEYS = ['t', 'actor', 'dur', 'kmh', 'ease', 'until', 'dist', 'ring', 'to_lane', 'reverse', 'merge_at', 'exit_at', 'signals', 'note'];
  var SCENE_EVT_KEYS = ['lights', 'arrows', 'labels'];
  var ACTOR_KEYS = ['id', 'type', 'color', 'pos', 'label', 'signal', 'brake', 'flash', 'siren', 'stop_arm', 'highlight', 'visible',
    'variant', 'wrong_way', 'collide', 'tag', 'helmet', 'say', 'note'];
  var SIGNALS = ['left', 'right', 'hazard', 'off'];
  var HIGHLIGHTS = [true, false, 'ok', 'bad', 'warn', 'gold'];
  var LIGHT_STATES = ['red', 'amber', 'green', 'flash-green', 'flash-amber', 'off'];
  var ARROW_STATES = ['green', 'flash-green', 'off'];
  var DEF_KMH = { pedestrian: 5, ball: 12, camel: 6, bicycle: 15, motorcycle: 30, cone: 5, barrier: 5 };

  function valAt(track, T) {
    var v;
    if (!track) return v;
    for (var i = 0; i < track.length; i++) { if (track[i].T <= T + 1e-9) v = track[i]; else break; }
    return v;
  }
  function pushTrack(obj, key, T, v, auto) {
    var t = obj[key] || (obj[key] = []);
    var item = { T: T, v: v, auto: !!auto }, i = t.length;
    // keep sorted by time; at equal times manual entries win (they come last)
    while (i > 0 && t[i - 1].T > T + 1e-9) i--;
    if (auto) { while (i > 0 && Math.abs(t[i - 1].T - T) < 1e-9 && !t[i - 1].auto) i--; }
    t.splice(i, 0, item);
  }

  function segPose(seg, T) {
    var u = seg.T1 > seg.T0 ? clamp((T - seg.T0) / (seg.T1 - seg.T0), 0, 1) : 1;
    var s = seg.s0 + (seg.s1 - seg.s0) * seg.ease(u);
    var q = seg.path.pose(s);
    if (seg.reverse) q.h = (q.h + 180) % 360;
    if (seg.fixedH != null) q.h = seg.fixedH;
    q.s = s; q.u = u;
    return q;
  }
  function segAt(act, T) {
    var seg = null;
    for (var i = 0; i < act.segs.length; i++) { if (act.segs[i].T0 <= T + 1e-9) seg = act.segs[i]; else break; }
    return seg;
  }
  function poseAt(act, T) {
    var seg = segAt(act, T);
    if (!seg) return { x: act.init.x, y: act.init.y, h: act.init.h, s: act.track ? act.track.s : 0, moving: false };
    var q = segPose(seg, T);
    q.moving = q.u > 0 && q.u < 1 && Math.abs(seg.s1 - seg.s0) > 0.01;
    q.seg = seg;
    return q;
  }
  // where the actor is and what it is following at time T
  function trackAt(act, T) {
    var seg = segAt(act, T);
    if (!seg) return { pos: P(act.init.x, act.init.y), h: act.init.h, path: act.track ? act.track.path : null, s: act.track ? act.track.s : 0,
      lane: act.track ? act.track.lane : null, marks: act.track && act.track.lane && act.track.lane.line != null ? { line: act.track.lane.line } : null, seg: null };
    var q = segPose(seg, T);
    var lane = seg.endLane || seg.lane || null;
    if (seg.lane && seg.endLane && seg.lane !== seg.endLane && q.u < 1) {
      var pe = seg.endLane.path.project(q);
      lane = pe.d < 0.6 ? seg.endLane : seg.lane;
    }
    return { pos: P(q.x, q.y), h: q.h, path: seg.path, s: q.s, lane: lane, marks: seg.marks || null, seg: seg, reverse: seg.reverse };
  }
  function durOf(act, e, distM, errs, pre) {
    if (e.dur != null) {
      if (!isNum(e.dur) || e.dur <= 0) { errs.push(pre + '"dur" must be a positive number of seconds'); return 1; }
      return e.dur;
    }
    var kmh = e.kmh != null ? e.kmh : (act.type === 'pedestrian' && act.variant === 'child' ? 8 : (DEF_KMH[act.type] || 25));
    if (!isNum(kmh) || kmh <= 0) { errs.push(pre + '"kmh" must be a positive number'); kmh = 25; }
    return Math.max(0.2, Math.abs(distM) / (kmh / 3.6));
  }
  // time (absolute) at which a segment reaches path position s (bisection on the easing)
  function timeAtS(seg, s) {
    var span = seg.s1 - seg.s0;
    if (Math.abs(span) < 1e-6) return seg.T0;
    var target = clamp((s - seg.s0) / span, 0, 1), lo = 0, hi = 1;
    for (var i = 0; i < 30; i++) { var m = (lo + hi) / 2; if (seg.ease(m) < target) lo = m; else hi = m; }
    return seg.T0 + (seg.T1 - seg.T0) * (lo + hi) / 2;
  }
  function crossingAhead(geo, path, s, maxAhead) {
    var best = null;
    Object.keys(geo.crossings).forEach(function (name) {
      var c = geo.crossings[name];
      for (var i = 0; i < path.p.length - 1; i++) {
        if (path.c[i + 1] < s || path.c[i] > s + (maxAhead || 200)) continue;
        var hit = segIntersect(path.p[i], path.p[i + 1], c.a, c.b);
        if (hit != null) {
          var sh = path.c[i] + hit * (path.c[i + 1] - path.c[i]);
          if (sh > s - 0.5 && (!best || sh < best.s)) best = { s: sh, c: c, name: name };
        }
      }
    });
    return best;
  }
  function segIntersect(p, p2, q, q2) {
    var r = sub(p2, p), s = sub(q2, q), den = r.x * s.y - r.y * s.x;
    if (Math.abs(den) < 1e-9) return null;
    var w = sub(q, p), t = (w.x * s.y - w.y * s.x) / den, u = (w.x * r.y - w.y * r.x) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
  }
  function chaikin(pts, n) {
    for (var k = 0; k < (n || 2); k++) {
      var out = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) { out.push(lerpP(pts[i], pts[i + 1], 0.25)); out.push(lerpP(pts[i], pts[i + 1], 0.75)); }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    return pts;
  }
  function blendTo(curPos, curPath, s0, D, targetFn) {
    var pts = [], N = Math.max(12, Math.ceil(D / 0.5));
    var off0 = sub(curPos, curPath.pos(s0));
    for (var i = 0; i <= N; i++) {
      var u = i / N, pA = add(curPath.pos(s0 + u * D), mul(off0, 1 - smooth(u))), pB = targetFn(pA);
      pts.push(lerpP(pA, pB, smooth(u)));
    }
    return pts;
  }

  function compile(spec, geo, errs, warns) {
    var C = { actors: [], byId: {}, lights: {}, scene: {}, arrows: [], callouts: [], hotspots: [], Li: 0, Ls: 0, me: null };
    var actors = Array.isArray(spec.actors) ? spec.actors : [];
    if (spec.actors != null && !Array.isArray(spec.actors)) errs.push('"actors" must be a list');
    actors.forEach(function (a, i) {
      var pre = 'actors[' + i + ']' + (a && a.id ? ' ("' + a.id + '")' : '') + ': ';
      if (!isObj(a)) { errs.push(pre + 'must be an object'); return; }
      knownKeys(a, ACTOR_KEYS, errs, pre.replace(/: $/, ''));
      var id = a.id;
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) { errs.push(pre + 'needs an "id" made of letters, digits, "-" or "_"'); id = 'actor' + i; }
      if (C.byId[id]) { errs.push(pre + 'duplicate id "' + id + '"'); id = id + '_' + i; }
      var type = a.type;
      if (ACTOR_TYPES.indexOf(type) < 0) { errs.push(pre + 'unknown type ' + JSON.stringify(type) + ' (types: ' + ACTOR_TYPES.join(', ') + ')'); type = 'car'; }
      if (a.color != null && !PAINT[a.color] && !/^#[0-9a-fA-F]{6}$/.test(String(a.color))) errs.push(pre + 'unknown color ' + JSON.stringify(a.color) + ' (use ' + CAR_COLOURS.join(', ') + ')');
      if (a.variant != null && ['child', 'adult', 'woman', 'delivery'].indexOf(a.variant) < 0) errs.push(pre + 'unknown variant ' + JSON.stringify(a.variant) + ' (pedestrian: adult, child, woman; motorcycle: delivery)');
      var size = SIZES[type], len = size[0], wid = size[1];
      if (type === 'pedestrian' && a.variant === 'child') { len *= 0.78; wid *= 0.78; }
      var act = { id: id, def: a, type: type, len: len, wid: wid, idx: i, segs: [], tracks: {}, color: a.color, variant: a.variant, helmet: a.helmet,
        label: a.label != null ? String(a.label) : null };
      if (type === 'me') { if (C.me) errs.push(pre + 'only one actor can have type "me"'); else C.me = act; }
      if (!isObj(a.pos)) { errs.push(pre + 'needs "pos" (a slot such as {"arm":"S","lane":1,"at":"stopline"} or {"dir":"up","lane":1,"y":20})'); act.init = { x: 0, y: 0, h: 0 }; }
      else {
        var sl = null;
        try { sl = geo.slot(a.pos, { len: len, wid: wid }, errs, pre + 'pos: '); } catch (ex) { errs.push(pre + 'pos could not be resolved (' + ex.message + ')'); }
        act.init = sl || { x: 0, y: 0, h: 0 };
        act.track = sl && sl.lane ? { path: sl.lane.path, s: sl.s, lane: sl.lane } : null;
        act.bay = sl && sl.bay ? sl.bay : null;
        act.slot = sl;
      }
      var emergency = !!EMERGENCY[type];
      var init = {
        signal: a.signal == null ? 'off' : a.signal, brake: !!a.brake, flash: a.flash == null ? (emergency || (type === 'school-bus' && !!a.stop_arm)) : !!a.flash,
        siren: a.siren == null ? emergency && (a.flash == null || !!a.flash) : !!a.siren, stop_arm: !!a.stop_arm,
        highlight: a.highlight == null ? false : a.highlight, visible: a.visible == null ? true : !!a.visible, say: a.say == null ? null : String(a.say)
      };
      if (SIGNALS.indexOf(init.signal) < 0) { errs.push(pre + 'signal must be one of ' + SIGNALS.join(', ')); init.signal = 'off'; }
      if (HIGHLIGHTS.indexOf(init.highlight) < 0) { errs.push(pre + 'highlight must be true, false, "ok", "bad", "warn" or "gold"'); init.highlight = true; }
      if (a.stop_arm != null && type !== 'school-bus') errs.push(pre + 'stop_arm only exists on type "school-bus"');
      Object.keys(init).forEach(function (k) { pushTrack(act.tracks, k, -1, init[k]); });
      C.actors.push(act); C.byId[id] = act;
    });

    // traffic lights: initial states
    var armsWithLights = geo.lightArms || [];
    function lightState(v, where) {
      if (typeof v === 'string') { if (LIGHT_STATES.indexOf(v) < 0) errs.push(where + ' must be one of ' + LIGHT_STATES.join(', ')); return { main: v }; }
      if (isObj(v)) {
        knownKeys(v, ['main', 'left', 'right'], errs, where);
        var o = {};
        if (v.main != null) { if (LIGHT_STATES.indexOf(v.main) < 0) errs.push(where + '.main must be one of ' + LIGHT_STATES.join(', ')); o.main = v.main; }
        ['left', 'right'].forEach(function (k) { if (v[k] != null) { if (ARROW_STATES.indexOf(v[k]) < 0) errs.push(where + '.' + k + ' (filter arrow) must be one of ' + ARROW_STATES.join(', ')); o[k] = v[k]; } });
        return o;
      }
      errs.push(where + ' must be a light state ("red", "green", ...) or {"main":"red","right":"green"}');
      return {};
    }
    function applyLights(v, T, where) {
      if (!isObj(v)) { errs.push(where + ' must be an object like {"S":"red","N":{"main":"red","right":"green"}}'); return; }
      Object.keys(v).forEach(function (arm) {
        if (armsWithLights.indexOf(arm) < 0) { errs.push(where + ': arm "' + arm + '" has no traffic lights (set params.control.' + arm + ' = "lights")'); return; }
        var st = lightState(v[arm], where + '.' + arm);
        var tr0 = C.lights[arm] || (C.lights[arm] = []);
        var prev = tr0.length ? tr0[tr0.length - 1].v : { main: 'red', left: 'off', right: 'off' };
        var nv = { main: st.main || prev.main, left: st.left || prev.left, right: st.right || prev.right };
        pushTrack(C.lights, arm, T, nv);
      });
    }
    armsWithLights.forEach(function (arm) { pushTrack(C.lights, arm, -1, { main: 'red', left: 'off', right: 'off' }); });
    if (geo.p && geo.p.lights != null) applyLights(geo.p.lights, -1, 'params.lights');
    pushTrack(C.scene, 'arrows', -1, null);
    pushTrack(C.scene, 'labels', -1, null);

    // phases
    function normPhase(v, name) {
      if (v == null) return { events: [], len: null };
      if (Array.isArray(v)) return { events: v, len: null };
      if (isObj(v)) {
        knownKeys(v, ['len', 'events'], errs, name);
        if (v.len != null && (!isNum(v.len) || v.len < 0)) errs.push(name + '.len must be a positive number of seconds');
        if (v.events != null && !Array.isArray(v.events)) errs.push(name + '.events must be a list');
        return { events: Array.isArray(v.events) ? v.events : [], len: isNum(v.len) ? v.len : null };
      }
      errs.push('"' + name + '" must be a list of events or {"len":s,"events":[...]}');
      return { events: [], len: null };
    }
    var intro = normPhase(spec.intro, 'intro'), sol = normPhase(spec.solution, 'solution');
    var endI = compilePhase(C, geo, intro.events, 0, 'intro', errs, warns);
    C.Li = intro.len != null ? intro.len : (intro.events.length ? endI + 0.6 : 0);
    if (intro.len != null && endI > intro.len + 0.01) warns.push('warn: intro.len (' + intro.len + ' s) is shorter than its events (' + f2(endI) + ' s); the question freezes mid-movement');
    C.hasIntro = C.Li > 0;
    var T0s = C.Li + EPS;
    var endS = compilePhase(C, geo, sol.events, T0s, 'solution', errs, warns);
    C.Ls = sol.len != null ? sol.len : (sol.events.length ? endS + 0.8 : 0);
    C.T0s = T0s;
    return C;
  }

  function compilePhase(C, geo, events, T0, phaseName, errs, warns) {
    var list = [], end = 0;
    events.forEach(function (e, i) { list.push({ e: e, i: i }); });
    list.sort(function (a, b) { return ((isObj(a.e) && isNum(a.e.t) ? a.e.t : 0) - (isObj(b.e) && isNum(b.e.t) ? b.e.t : 0)) || a.i - b.i; });
    list.forEach(function (it) {
      var e = it.e, pre = phaseName + '[' + it.i + ']: ';
      if (!isObj(e)) { errs.push(pre + 'each event must be an object'); return; }
      knownKeys(e, MOVE_KEYS.concat(STATE_KEYS, MOD_KEYS, SCENE_EVT_KEYS), errs, pre.replace(/: $/, ''));
      var t = e.t == null ? 0 : e.t;
      if (!isNum(t) || t < 0) { errs.push(pre + '"t" must be a number of seconds from the start of the phase'); t = 0; }
      var T = T0 + t;
      end = Math.max(end, t);
      if (e.lights != null) {
        if (e.actor != null) errs.push(pre + '"lights" is a scene event: do not give it an "actor"');
        var armsWithLights = geo.lightArms || [];
        if (!isObj(e.lights)) errs.push(pre + '"lights" must be an object like {"S":"green"}');
        else Object.keys(e.lights).forEach(function (arm) {
          if (armsWithLights.indexOf(arm) < 0) { errs.push(pre + 'arm "' + arm + '" has no traffic lights'); return; }
          var v = e.lights[arm], prev = (valAt(C.lights[arm], T) || {}).v || { main: 'red', left: 'off', right: 'off' };
          var st = typeof v === 'string' ? { main: v } : (isObj(v) ? v : {});
          if (typeof v === 'string' && LIGHT_STATES.indexOf(v) < 0) errs.push(pre + 'lights.' + arm + ' must be one of ' + LIGHT_STATES.join(', '));
          if (isObj(v)) {
            knownKeys(v, ['main', 'left', 'right'], errs, pre + 'lights.' + arm);
            if (v.main != null && LIGHT_STATES.indexOf(v.main) < 0) errs.push(pre + 'lights.' + arm + '.main must be one of ' + LIGHT_STATES.join(', '));
            ['left', 'right'].forEach(function (k) { if (v[k] != null && ARROW_STATES.indexOf(v[k]) < 0) errs.push(pre + 'lights.' + arm + '.' + k + ' must be one of ' + ARROW_STATES.join(', ')); });
          }
          pushTrack(C.lights, arm, T, { main: st.main || prev.main, left: st.left || prev.left, right: st.right || prev.right });
        });
      }
      if (e.arrows != null) { if (typeof e.arrows !== 'boolean') errs.push(pre + '"arrows" must be true or false'); pushTrack(C.scene, 'arrows', T, !!e.arrows); }
      if (e.labels != null) { if (typeof e.labels !== 'boolean') errs.push(pre + '"labels" must be true or false'); pushTrack(C.scene, 'labels', T, !!e.labels); }
      var moves = MOVE_KEYS.filter(function (k) { return e[k] != null; });
      var states = STATE_KEYS.filter(function (k) { return k in e; });
      if (e.actor == null) {
        if (moves.length || states.length) errs.push(pre + 'this event needs "actor"');
        else if (e.lights == null && e.arrows == null && e.labels == null) errs.push(pre + 'event does nothing (give it an actor action or lights/arrows/labels)');
        return;
      }
      var act = C.byId[e.actor];
      if (!act) { errs.push(pre + 'unknown actor "' + e.actor + '" (actors: ' + Object.keys(C.byId).join(', ') + ')'); return; }
      states.forEach(function (k) {
        var v = e[k];
        if (k === 'signal') { if (v === null) v = 'off'; if (SIGNALS.indexOf(v) < 0) { errs.push(pre + 'signal must be one of ' + SIGNALS.join(', ')); return; } }
        else if (k === 'highlight') { if (HIGHLIGHTS.indexOf(v) < 0) { errs.push(pre + 'highlight must be true, false, "ok", "bad", "warn" or "gold"'); return; } }
        else if (k === 'say') { if (v != null && typeof v !== 'string') { errs.push(pre + '"say" must be a string or null'); return; } }
        else if (typeof v !== 'boolean') { errs.push(pre + '"' + k + '" must be true or false'); return; }
        if (k === 'stop_arm' && act.type !== 'school-bus') errs.push(pre + 'stop_arm only exists on a school-bus');
        pushTrack(act.tracks, k, T, v);
        if (k === 'stop_arm' && e.flash == null) pushTrack(act.tracks, 'flash', T, v, true);
      });
      if (moves.length > 1) { errs.push(pre + 'only one movement per event (found ' + moves.join(' + ') + ')'); return; }
      if (!moves.length) {
        ['dur', 'kmh', 'ease', 'until', 'dist'].forEach(function (k) { if (e[k] != null) warns.push('warn: ' + pre + '"' + k + '" has no effect without a movement'); });
        return;
      }
      var segs = null;
      try { segs = compileMove(C, geo, act, moves[0], e, T, errs, warns, pre); }
      catch (ex) { errs.push(pre + moves[0] + ' failed: ' + (ex && ex.message)); }
      if (segs && segs.length) {
        segs.forEach(function (sg) { act.segs.push(sg); end = Math.max(end, sg.T1 - T0); });
        act.segs.sort(function (a, b) { return a.T0 - b.T0; });
      }
    });
    return end;
  }

  function compileMove(C, geo, act, kind, e, T, errs, warns, pre) {
    var cur = trackAt(act, T), segs = [], path, s0, s1, lane = cur.lane, endLane = cur.lane, marks = null, reverse = !!e.reverse;
    var isVeh = !!VEHICLES[act.type];
    if (e.ease != null && !EASE[e.ease]) errs.push(pre + 'ease must be linear, in, out or inout');
    var autoSig = isVeh && e.signals !== 'none';
    if (e.signals != null && e.signals !== 'auto' && e.signals !== 'none') errs.push(pre + '"signals" must be "auto" (default) or "none"');
    function mkSeg(p, a, b, defEase, extra) {
      var d = durOf(act, e, b - a, errs, pre);
      var sg = { T0: T, T1: T + d, path: p, s0: a, s1: b, ease: EASE[e.ease] || EASE[defEase] || EASE.linear, reverse: reverse, lane: lane, endLane: endLane, marks: marks, kind: kind };
      if (extra) for (var k in extra) sg[k] = extra[k];
      return sg;
    }
    switch (kind) {
      case 'route': {
        if (typeof e.route !== 'string') { errs.push(pre + '"route" must be a string such as "S1->E"'); return null; }
        var r = geo.route(e.route, { fromPos: cur.pos, fromH: cur.h, fromLane: cur.lane, to_lane: e.to_lane, ring: e.ring, merge_at: e.merge_at, exit_at: e.exit_at }, errs, pre);
        if (!r) return null;
        var pr = r.path.project(cur.pos);
        if (pr.d > 2.6) {
          errs.push(pre + 'actor "' + act.id + '" is ' + f2(pr.d) + ' m away from route "' + e.route + '" when it starts' +
            (r.inLane ? ' (place it on lane ' + r.inLane.id.replace(/\./g, ' ') + ' first)' : ''));
        }
        path = r.path; s0 = pr.s; marks = r.marks; endLane = r.endLane;
        s1 = untilS(r, e.until, act, s0, errs, pre, geo.view);
        if (s1 < s0 - 0.3) { errs.push(pre + 'actor "' + act.id + '" is already past "' + e.until + '" on route ' + e.route); s1 = s0; }
        s1 = Math.max(s1, s0);
        var sg = mkSeg(path, s0, s1, 'linear', { route: r });
        segs.push(sg);
        if (autoSig) routeSignals(C, geo, act, sg, r, e);
        routeLaneWarnings(geo, act, r, e, warns, pre);
        break;
      }
      case 'drive': {
        if (!cur.path) { errs.push(pre + 'actor "' + act.id + '" is not on a lane; place it with a lane slot or use "to" / "path"'); return null; }
        var dd = e.drive === 'end' ? Math.max(0, sOffView(cur.path, cur.s, geo.view, Math.max(act.len, act.wid) / 2 + 0.6) - cur.s) : e.drive;
        if (!isNum(dd) || dd < 0) { errs.push(pre + '"drive" must be a positive distance in metres or "end" (use "reverse": true to go backwards)'); return null; }
        path = cur.path; s0 = cur.s; s1 = reverse ? s0 - dd : s0 + dd;
        if (cur.reverse && !e.reverse) { /* after a reversing leg, drive forward along the same path direction */ }
        marks = cur.marks;
        segs.push(mkSeg(path, s0, s1, 'linear'));
        break;
      }
      case 'lane_change': {
        var side = e.lane_change;
        if (side !== 'left' && side !== 'right') { errs.push(pre + 'lane_change must be "left" or "right"'); return null; }
        if (!cur.lane) { errs.push(pre + 'actor "' + act.id + '" is not on a lane'); return null; }
        var target = geo.neighbour(cur.lane, side);
        if (!target || (target.kind !== 'road' && target.kind !== 'in' && target.kind !== 'out' && target.kind !== 'ring' && target.kind !== 'accel' && target.kind !== 'aisle' && target.kind !== 'decel')) {
          errs.push(pre + 'there is no lane to the ' + side + ' of ' + cur.lane.id + ' (lane 1 is the rightmost; "left" means a higher lane number)');
          return null;
        }
        var D = isNum(e.dist) ? e.dist : 24;
        var blend = blendTo(cur.pos, cur.path, cur.s, D, function (pA) { return target.path.pos(target.path.project(pA).s); });
        var last = blend[blend.length - 1], sT = target.path.project(last).s;
        path = new Path(joinPts(blend, target.path.slice(sT, Math.max(sT + 1, target.path.length))));
        lane = cur.lane; endLane = target;
        s0 = 0; s1 = new Path(blend).length;
        if (target.line != null) marks = { line: s1 + (target.line - sT) };
        var sg2 = mkSeg(path, s0, s1, 'linear');
        segs.push(sg2);
        if (autoSig) { pushTrack(act.tracks, 'signal', T, side, true); pushTrack(act.tracks, 'signal', sg2.T1, 'off', true); }
        break;
      }
      case 'pull_over': {
        var ps = e.pull_over === true ? 'right' : e.pull_over;
        if (ps !== 'right' && ps !== 'left') { errs.push(pre + 'pull_over must be "right" (normal) or "left"'); return null; }
        if (!cur.lane || cur.lane.kind === 'ring') { errs.push(pre + 'actor "' + act.id + '" must be on a road lane to pull over'); return null; }
        var gr = geo.groups[cur.lane.group];
        var tl = null, shift = 0;
        if (gr) {
          if (ps === 'right') { tl = gr.lanes[0] && (gr.lanes[0].kind === 'shoulder' || gr.lanes[0].kind === 'parking') ? gr.lanes[0] : gr.lanes[1]; if (tl === gr.lanes[1] || !tl) { tl = gr.lanes[1] || cur.lane; shift = tl.w / 2 - act.wid / 2 - 0.3; } }
          else { tl = gr.lanes[gr.n] || cur.lane; shift = -(tl.w / 2 - act.wid / 2 - 0.3); }
        } else { tl = cur.lane; shift = (ps === 'right' ? 1 : -1) * (tl.w / 2 - act.wid / 2 - 0.3); }
        var D2 = isNum(e.dist) ? e.dist : 26;
        var tgtFn = function (pA) { var sp = tl.path.project(pA).s, q = tl.path.pos(sp); return shift ? add(q, mul(rightOf(tl.path.dir(sp)), shift)) : q; };
        var bl2 = blendTo(cur.pos, cur.path, cur.s, D2, tgtFn);
        var tail = [], lp = bl2[bl2.length - 1], ts = tl.path.project(lp).s;
        for (var q2 = 1; q2 <= 12; q2++) tail.push(tgtFn(tl.path.pos(ts + q2 * 4)));
        path = new Path(joinPts(bl2, tail));
        lane = cur.lane; endLane = tl;
        s0 = 0; s1 = new Path(bl2).length;
        var sg3 = mkSeg(path, s0, s1, 'out');
        segs.push(sg3);
        if (autoSig) { pushTrack(act.tracks, 'signal', T, ps, true); pushTrack(act.tracks, 'signal', sg3.T1, 'off', true); }
        break;
      }
      case 'stop_at': {
        if (!cur.path) { errs.push(pre + 'actor "' + act.id + '" is not on a lane or route'); return null; }
        var st = e.stop_at, sT2 = null;
        if (st === 'stopline' || st === 'line') {
          var lineS = cur.marks && cur.marks.line != null ? cur.marks.line : null;
          if (lineS == null) { errs.push(pre + 'no stop / give-way line ahead of "' + act.id + '" on its current lane'); return null; }
          sT2 = lineS - GAP - act.len / 2;
        } else if (st === 'crossing' || st === 'zebra') {
          var ca = crossingAhead(geo, cur.path, cur.s + act.len / 2 - 0.5, 250);
          if (!ca) { errs.push(pre + 'no pedestrian crossing ahead of "' + act.id + '"'); return null; }
          sT2 = ca.s - ca.c.depth / 2 - 1.4 - act.len / 2;
        } else if (isObj(st) && st.behind != null) {
          knownKeys(st, ['behind', 'gap'], errs, pre + 'stop_at');
          var other = C.byId[st.behind];
          if (!other) { errs.push(pre + 'stop_at.behind: unknown actor "' + st.behind + '"'); return null; }
          var op = poseAt(other, T), pj = cur.path.project(op, cur.s - 5, cur.s + 300);
          if (pj.d > 2.8) { errs.push(pre + 'stop_at.behind: "' + st.behind + '" is not ahead of "' + act.id + '" in the same lane (' + f2(pj.d) + ' m to the side)'); return null; }
          var gapM = st.gap == null ? 2 : st.gap;
          if (!isNum(gapM) || gapM < 0) { errs.push(pre + 'stop_at.gap must be metres (>= 0)'); gapM = 2; }
          sT2 = pj.s - other.len / 2 - gapM - act.len / 2;
        } else if (isObj(st) && isNum(st.y)) {
          knownKeys(st, ['y'], errs, pre + 'stop_at');
          sT2 = cur.path.sAtY(-st.y);
        } else { errs.push(pre + 'stop_at must be "stopline", "crossing", {"behind":"id","gap":m} or {"y":n}'); return null; }
        if (sT2 < cur.s - 0.3) { errs.push(pre + '"' + act.id + '" is already ' + f2(cur.s - sT2) + ' m past its stop_at point'); sT2 = cur.s; }
        path = cur.path; s0 = cur.s; s1 = Math.max(cur.s, sT2); marks = cur.marks;
        segs.push(mkSeg(path, s0, s1, 'out'));
        break;
      }
      case 'cross': {
        var c = geo.crossings[e.cross];
        if (!c) { errs.push(pre + 'crossing "' + e.cross + '" does not exist (crossings: ' + (Object.keys(geo.crossings).join(', ') || 'none') + ')'); return null; }
        var near = dist(cur.pos, c.a) <= dist(cur.pos, c.b) ? c.a : c.b, farP = near === c.a ? c.b : c.a;
        var pts = dist(cur.pos, near) > 0.3 ? [cur.pos, near, farP] : [cur.pos, farP];
        path = new Path(pts); s0 = 0; s1 = path.length; lane = endLane = null;
        segs.push(mkSeg(path, s0, s1, 'linear'));
        break;
      }
      case 'to': {
        if (!isObj(e.to)) { errs.push(pre + '"to" must be a slot'); return null; }
        var tg = geo.slot(e.to, { len: act.len, wid: act.wid }, errs, pre + 'to: ');
        if (!tg) return null;
        var tp = P(tg.x, tg.y);
        if (isVeh && dist(cur.pos, tp) > 3) {
          var hv = dirB(reverse ? (cur.h + 180) % 360 : cur.h), hv2 = dirB(reverse ? (tg.h + 180) % 360 : tg.h), dd2 = dist(cur.pos, tp) * 0.4;
          path = new Path(bez(cur.pos, add(cur.pos, mul(hv, dd2)), sub(tp, mul(hv2, dd2)), tp));
        } else path = new Path([cur.pos, tp]);
        s0 = 0; s1 = path.length; lane = null; endLane = tg.lane || null;
        if (tg.lane) {
          // continue along the target lane afterwards
          var sl2 = tg.lane.path.project(tp).s;
          path = new Path(joinPts(path.p, tg.lane.path.slice(sl2, tg.lane.path.length)));
          if (tg.lane.line != null) marks = { line: s1 + (tg.lane.line - sl2) };
        }
        var extra = {};
        if (!isVeh && dist(cur.pos, tp) < 0.05) extra.fixedH = cur.h;
        segs.push(mkSeg(path, s0, s1, 'linear', extra));
        if (tg.bay) act.bay = tg.bay;
        break;
      }
      case 'path': {
        if (!Array.isArray(e.path) || e.path.length < 1) { errs.push(pre + '"path" must be a list of [x, y] points (x east, y north, metres)'); return null; }
        var pp = [cur.pos], bad = false;
        e.path.forEach(function (q, i) { if (!Array.isArray(q) || !isNum(q[0]) || !isNum(q[1])) bad = true; else pp.push(toSvg(q[0], q[1])); });
        if (bad) { errs.push(pre + 'every path point must be [x, y] numbers'); return null; }
        if (isVeh && pp.length > 2) pp = chaikin(pp, 3);
        path = new Path(pp); s0 = 0; s1 = path.length; lane = endLane = null;
        segs.push(mkSeg(path, s0, s1, 'linear'));
        break;
      }
      case 'park': case 'leave': {
        if (geo.tpl !== 'parking') { errs.push(pre + '"' + kind + '" only works in the parking template'); return null; }
        var legs;
        if (kind === 'park') legs = parkLegs(geo, e.park, { fromPos: cur.pos, fromH: cur.h, reverse: !!e.reverse }, errs, pre);
        else {
          if (e.leave !== 'up' && e.leave !== 'down') { errs.push(pre + 'leave must be "up" or "down" (the direction to drive off in)'); return null; }
          var bay = act.bay;
          if (!bay) { errs.push(pre + '"' + act.id + '" is not in a bay or space (place it with {"bay":"R2"} or {"space":"P1"})'); return null; }
          legs = leaveLegs(geo, bay, cur.h, e.leave, errs, pre);
        }
        if (!legs) return null;
        var total = 0;
        legs.forEach(function (l) { l.path = new Path(l.pts); total += l.path.length; });
        var dAll = durOf(act, e, total, errs, pre), tt = T;
        legs.forEach(function (l, i) {
          var dl = dAll * (l.path.length / (total || 1));
          segs.push({ T0: tt, T1: tt + dl, path: l.path, s0: 0, s1: l.path.length, ease: EASE[e.ease] || EASE.inout, reverse: l.reverse, lane: null, endLane: i === legs.length - 1 && kind === 'leave' ? geo.lanes[(e.leave === 'down' ? 'down' : 'up') + '.1'] : null, kind: kind });
          tt += dl + 0.25;
        });
        if (autoSig && kind === 'leave') { pushTrack(act.tracks, 'signal', T, e.leave === 'up' ? (act.bay && act.bay.side === 'west' ? 'right' : 'left') : 'right', true); pushTrack(act.tracks, 'signal', tt, 'off', true); }
        if (kind === 'park') act.bay = geo.bays[e.park] || act.bay;
        else act.bay = null;
        break;
      }
    }
    return segs;
  }

  // first path position (after sFrom) where an actor of radius rad is completely outside the view
  function sOffView(path, sFrom, view, rad) {
    if (!view) return path.length + rad;
    for (var s = Math.max(0, sFrom); s <= path.length + 80; s += 0.8) {
      var q = path.pos(s);
      if (q.x < view.x - rad || q.x > view.x + view.w + rad || q.y < view.y - rad || q.y > view.y + view.h + rad) return s;
    }
    return path.length + rad;
  }
  function untilS(r, u, act, s0, errs, pre, view) {
    var m = r.marks || {}, half = act.len / 2;
    if (u == null || u === 'end') return sOffView(r.path, Math.max(s0, m.exit != null ? m.exit : 0), view, Math.max(act.len, act.wid) / 2 + 0.6);
    if (isNum(u)) { if (u < 0) errs.push(pre + '"until" distance must be positive'); return s0 + u; }
    switch (u) {
      case 'stopline': case 'line': return (m.line != null ? m.line : s0) - GAP - half;
      case 'entry': return (m.entry != null ? m.entry : (m.line != null ? m.line + half + 1 : s0));
      case 'exit': return (m.exit != null ? m.exit : r.path.length) + half + 0.5;
      case 'opening': return (m.opening != null ? m.opening : s0) - 0.5 - half;
      case 'merge': return m.merge != null ? m.merge : r.path.length;
      case 'accel': return m.accel != null ? m.accel : s0;
      case 'decel': return m.decel != null ? m.decel : s0;
    }
    errs.push(pre + 'until must be "stopline", "entry", "exit", "end", a distance in metres' + (m.merge != null ? ', "accel" or "merge"' : '') + (m.opening != null ? ' or "opening"' : ''));
    return r.path.length;
  }

  // automatic indicators for a route segment (UAE practice)
  function routeSignals(C, geo, act, sg, r, e) {
    var turn = r.turn, m = r.marks || {}, half = act.len / 2;
    var sExit = (m.exit != null ? m.exit : r.path.length) + half;
    var offT = sg.s1 >= sExit ? timeAtS(sg, sExit) : null;
    var on = function (side, T) { pushTrack(act.tracks, 'signal', T, side, true); };
    if (geo.tpl === 'roundabout' && r.exitNo) {
      var n = geo.armNames.length, first = r.exitNo === 1;
      // switch to "right" once the car passes the exit before its own
      var sw = null;
      if (!first && m.entry != null && m.ringEnd != null) {
        var arms = geo.armNames, exitArm = r.endLane.arm, idx = -1;
        // previous arm upstream of the exit (bearing larger by the smallest positive amount)
        var best = 999, prev = null;
        arms.forEach(function (a) { var d = (BEAR[a] - BEAR[exitArm] + 360) % 360; if (d > 0 && d < best) { best = d; prev = a; } });
        if (prev) {
          var target = BEAR[prev] - 12;
          for (var s = m.entry; s <= m.ringEnd; s += 0.5) {
            var p = r.path.pos(s), b = bOf(p);
            if (Math.abs(angDiff(b, target)) < 3) { sw = s; break; }
          }
        }
        if (sw == null) sw = m.ringEnd - 6;
      }
      if (first) { if (sg.s0 < sExit) on('right', sg.T0); }
      else if (r.exitNo >= 3 || r.turn === 'uturn' || r.turn === 'left') {
        if (sg.s0 < sw) on('left', sg.T0);
        if (sw >= sg.s0 && sw <= sg.s1) on('right', timeAtS(sg, sw)); else if (sg.s0 >= sw && sg.s0 < sExit) on('right', sg.T0);
      } else {
        if (sw >= sg.s0 && sw <= sg.s1) on('right', timeAtS(sg, sw)); else if (sg.s0 >= sw && sg.s0 < sExit) on('right', sg.T0);
      }
      if (offT != null) on('off', offT);
      return;
    }
    var side = turn === 'right' ? 'right' : (turn === 'left' || turn === 'uturn' ? 'left' : (turn === 'merge' ? 'left' : (turn === 'exit' ? 'right' : (turn === 'ring' ? 'right' : null))));
    if (!side) return;
    if (turn === 'merge') { var sM = m.merge != null ? m.merge : r.path.length; if (sg.s0 < sM) on('left', sg.T0); if (sg.s1 >= sM) on('off', timeAtS(sg, sM)); return; }
    if (turn === 'exit') { var sD = m.decel != null ? m.decel : 0; if (sg.s0 < sD) on('right', sg.T0); if (sg.s1 >= sD + 4) on('off', timeAtS(sg, sD + 4)); return; }
    if (sg.s0 < sExit) on(side, sg.T0);
    if (offT != null) on('off', offT);
  }

  function routeLaneWarnings(geo, act, r, e, warns, pre) {
    if (!r.inLane || act.type !== 'me') return;
    var n = r.inLane.n, k = r.inLane.k;
    if (n < 2) return;
    if (r.turn === 'right' && k !== 1) warns.push('warn: ' + pre + '"me" turns right (route ' + e.route + ') from lane ' + k + '; in the UAE a right turn is made from lane 1 (the rightmost)');
    if ((r.turn === 'left' || r.turn === 'uturn') && k !== n) warns.push('warn: ' + pre + '"me" turns left / U-turns (route ' + e.route + ') from lane ' + k + '; that is made from lane ' + n + ' (the leftmost)');
  }

  // ================================================================== runtime
  var UID = 0;
  var TEMPLATES = {
    roundabout: function (p, e) { return buildRoundabout(p, e); },
    crossroads: function (p, e) { return buildJunction(p, e, 'crossroads'); },
    tjunction: function (p, e) { return buildJunction(p, e, 'tjunction'); },
    road: function (p, e) { return buildRoad(p, e, 'road'); },
    'highway-merge': function (p, e) { return buildHighway(p, e, 'merge'); },
    'highway-exit': function (p, e) { return buildHighway(p, e, 'exit'); },
    parking: function (p, e) { return buildParking(p, e); },
    uturn: function (p, e) { return buildRoad(p, e, 'uturn'); }
  };
  var SCENE_KEYS = ['template', 'params', 'actors', 'intro', 'solution', 'arrows', 'callouts', 'overlay', 'visibility', 'view',
    'labels', 'hotspots', 'alt', 'debug', 'note'];
  var OVERLAYS = ['night', 'fog', 'rain', 'dust'];
  var STYLE_COL = { me: COL.gold, gold: COL.gold, ok: COL.ok, bad: COL.bad, warn: COL.warn, other: '#DCE3EE', info: '#9CC3DA' };
  var TPL_TITLE = { roundabout: 'دوار', crossroads: 'تقاطع', tjunction: 'تقاطع على شكل T', road: 'طريق', 'highway-merge': 'دخول إلى طريق سريع',
    'highway-exit': 'خروج من طريق سريع', parking: 'موقف سيارات', uturn: 'فتحة دوران للخلف' };

  function prepare(input, errs, warns, extraHotspots) {
    var spec = isObj(input) && isObj(input.scene) ? input.scene : input;
    if (!isObj(spec)) { errs.push('the scene must be an object with "template", "params", "actors"'); return null; }
    var mk = TEMPLATES[spec.template];
    if (!mk) {
      if (spec.template == null && (spec.type || spec.pos)) errs.push('this looks like an actor, not a scene: a scene needs "template", "params" and "actors"');
      else errs.push((spec.template == null ? 'missing "template"' : 'unknown template ' + JSON.stringify(spec.template)) + ' (templates: ' + Object.keys(TEMPLATES).join(', ') + ')');
      return null;
    }
    knownKeys(spec, SCENE_KEYS, errs, 'scene');
    var p = spec.params == null ? {} : spec.params;
    if (!isObj(p)) { errs.push('"params" must be an object'); p = {}; }
    var geo = mk(p, errs);
    // view crop
    var v = geo.view;
    if (spec.view != null) {
      if (!isObj(spec.view)) errs.push('"view" must be {"zoom":1.4,"center":{"x":0,"y":10}}');
      else {
        knownKeys(spec.view, ['zoom', 'center'], errs, 'view');
        var z = spec.view.zoom == null ? 1 : spec.view.zoom;
        if (!isNum(z) || z < 0.75 || z > 4) { errs.push('view.zoom must be between 0.75 and 4'); z = 1; }
        var cx = v.x + v.w / 2, cy = v.y + v.h / 2;
        if (spec.view.center != null) {
          if (!isObj(spec.view.center) || !isNum(spec.view.center.x) || !isNum(spec.view.center.y)) errs.push('view.center must be {"x":n,"y":n} (metres, y north)');
          else { cx = spec.view.center.x; cy = -spec.view.center.y; }
        }
        geo.view = { x: cx - v.w / z / 2, y: cy - v.h / z / 2, w: v.w / z, h: v.h / z };
      }
    }
    var comp = compile(spec, geo, errs, warns);
    var out = { spec: spec, geo: geo, comp: comp, overlays: [], arrows: [], callouts: [], hotspots: [] };
    // overlays
    var ov = spec.overlay == null ? [] : (Array.isArray(spec.overlay) ? spec.overlay : [spec.overlay]);
    ov.forEach(function (o) { if (OVERLAYS.indexOf(o) < 0) errs.push('overlay ' + JSON.stringify(o) + ' is unknown (use ' + OVERLAYS.join(', ') + ')'); else out.overlays.push(o); });
    if (spec.visibility != null && (!isNum(spec.visibility) || spec.visibility < 5 || spec.visibility > 300)) errs.push('"visibility" must be metres between 5 and 300');
    out.visibility = isNum(spec.visibility) ? spec.visibility : null;
    if (spec.labels != null && ['hover', 'solution', 'always', 'never'].indexOf(spec.labels) < 0) errs.push('"labels" must be "hover", "solution", "always" or "never"');
    if (spec.alt != null && typeof spec.alt !== 'string') errs.push('"alt" must be a string (Arabic description for screen readers)');
    // arrows (planned paths)
    var arrows = spec.arrows == null ? [] : spec.arrows;
    if (!Array.isArray(arrows)) { errs.push('"arrows" must be a list'); arrows = []; }
    arrows.forEach(function (a, i) {
      var pre = 'arrows[' + i + ']: ';
      if (!isObj(a)) { errs.push(pre + 'must be an object'); return; }
      knownKeys(a, ['actor', 'from', 'route', 'until', 'to', 'path', 'track', 'from_t', 'to_t', 'style', 'when', 'ring', 'to_lane', 'merge_at', 'exit_at'], errs, 'arrows[' + i + ']');
      var start = null, lane = null, pts = null;
      if (a.actor != null) {
        var act = comp.byId[a.actor];
        if (!act) { errs.push(pre + 'unknown actor "' + a.actor + '"'); return; }
        var q = poseAt(act, comp.Li), tk = trackAt(act, comp.Li);
        start = P(q.x, q.y); lane = tk.lane;
      } else if (a.from != null) {
        var sl = geo.slot(a.from, { len: 4.6, wid: 1.95 }, errs, pre + 'from: ');
        if (sl) { start = P(sl.x, sl.y); lane = sl.lane; }
      }
      if (a.track != null) {
        if (a.actor == null) { errs.push(pre + 'a "track" arrow needs "actor"'); return; }
        if (a.track !== 'solution' && a.track !== 'intro') { errs.push(pre + 'track must be "solution" or "intro"'); return; }
        var ta = comp.byId[a.actor], tA = a.track === 'intro' ? 0 : comp.T0s, tLen = a.track === 'intro' ? comp.Li : comp.Ls;
        var f0 = isNum(a.from_t) ? clamp(a.from_t, 0, tLen) : 0, f1 = isNum(a.to_t) ? clamp(a.to_t, 0, tLen) : tLen;
        var vv = geo.view, rr0 = Math.max(ta.len, ta.wid) / 2, q0 = poseAt(ta, tA + f0), was = false;
        pts = [];
        for (var tt = f0; tt <= f1 + 1e-6; tt += 0.04) {
          var qq = poseAt(ta, tA + tt), inside = qq.x > vv.x - 1 && qq.x < vv.x + vv.w + 1 && qq.y > vv.y - 1 && qq.y < vv.y + vv.h + 1;
          if (was && !inside) break;
          if (inside) was = true;
          if (dist(qq, q0) < rr0 + 0.4) continue;
          if (!pts.length || dist(pts[pts.length - 1], qq) > 0.25) pts.push(P(qq.x, qq.y));
        }
        if (pts.length < 2) { warns.push('warn: ' + pre + 'actor "' + a.actor + '" does not move enough during the ' + a.track + ' to draw a track arrow'); return; }
      } else if (a.route != null) {
        if (!start) { errs.push(pre + 'a route arrow needs "actor" or "from"'); return; }
        var r = geo.route(a.route, { fromPos: start, fromLane: lane, ring: a.ring, to_lane: a.to_lane, merge_at: a.merge_at, exit_at: a.exit_at }, errs, pre);
        if (!r) return;
        var s0 = r.path.project(start).s;
        var sEnd = a.until != null ? untilS(r, a.until, { len: 4.6, wid: 1.95 }, s0, errs, pre, geo.view) : Math.min(r.path.length, (r.marks && r.marks.exit != null ? r.marks.exit : r.path.length) + 12);
        pts = r.path.slice(s0 + 2.4, Math.max(s0 + 3, sEnd));
      } else if (a.path != null) {
        if (!Array.isArray(a.path)) { errs.push(pre + '"path" must be a list of [x, y]'); return; }
        pts = (start ? [start] : []).concat(a.path.filter(function (q2) { return Array.isArray(q2) && isNum(q2[0]) && isNum(q2[1]); }).map(function (q2) { return toSvg(q2[0], q2[1]); }));
        if (pts.length > 2) pts = chaikin(pts, 3);
      } else if (a.to != null) {
        var tg = geo.slot(a.to, { len: 4.6, wid: 1.95 }, errs, pre + 'to: ');
        if (!start || !tg) { errs.push(pre + 'a "to" arrow needs "actor" or "from"'); return; }
        pts = [start, P(tg.x, tg.y)];
      } else { errs.push(pre + 'needs "track", "route", "path" or "to"'); return; }
      if (!pts || pts.length < 2) return;
      var style = a.style || (a.actor && comp.byId[a.actor] && comp.byId[a.actor].type === 'me' ? 'me' : 'other');
      if (!STYLE_COL[style]) { errs.push(pre + 'style must be me, ok, bad, warn or other'); style = 'other'; }
      var when = a.when || 'solution';
      if (['question', 'solution', 'always'].indexOf(when) < 0) { errs.push(pre + 'when must be "question", "solution" or "always"'); when = 'solution'; }
      out.arrows.push({ pts: pts, style: style, when: when });
    });
    // callouts
    var callouts = spec.callouts == null ? [] : spec.callouts;
    if (!Array.isArray(callouts)) { errs.push('"callouts" must be a list'); callouts = []; }
    callouts.forEach(function (c, i) {
      var pre = 'callouts[' + i + ']: ';
      if (!isObj(c)) { errs.push(pre + 'must be an object'); return; }
      knownKeys(c, ['text', 'at', 'actor', 'when', 'style'], errs, 'callouts[' + i + ']');
      if (typeof c.text !== 'string' || !c.text) { errs.push(pre + 'needs "text"'); return; }
      var item = { str: c.text, style: c.style || 'info', when: c.when || 'solution' };
      if (!STYLE_COL[item.style]) { errs.push(pre + 'style must be info, ok, bad, warn or gold'); item.style = 'info'; }
      if (['question', 'solution', 'always'].indexOf(item.when) < 0) { errs.push(pre + 'when must be "question", "solution" or "always"'); item.when = 'solution'; }
      if (c.actor != null) { if (!comp.byId[c.actor]) { errs.push(pre + 'unknown actor "' + c.actor + '"'); return; } item.actor = comp.byId[c.actor]; }
      else if (c.at != null) { var sl = geo.slot(c.at, { len: 0.5, wid: 0.5 }, errs, pre + 'at: '); if (!sl) return; item.pos = P(sl.x, sl.y); }
      else { errs.push(pre + 'needs "at" (a slot) or "actor"'); return; }
      out.callouts.push(item);
    });
    // hotspots
    var hs = extraHotspots || (isObj(input) && Array.isArray(input.hotspots) ? input.hotspots : null) || spec.hotspots || [];
    if (!Array.isArray(hs)) { errs.push('"hotspots" must be a list'); hs = []; }
    var seen = {};
    hs.forEach(function (h, i) {
      var pre = 'hotspots[' + i + ']: ';
      if (!isObj(h)) { errs.push(pre + 'must be an object'); return; }
      knownKeys(h, ['id', 'actor', 'at', 'r', 'rect', 'label'], errs, 'hotspots[' + i + ']');
      if (typeof h.id !== 'string' || !h.id) { errs.push(pre + 'needs an "id"'); return; }
      if (seen[h.id]) errs.push(pre + 'duplicate hotspot id "' + h.id + '"');
      seen[h.id] = 1;
      var item = { id: h.id, label: h.label || null, r: isNum(h.r) ? h.r : null };
      if (h.actor != null) { if (!comp.byId[h.actor]) { errs.push(pre + 'unknown actor "' + h.actor + '"'); return; } item.actor = comp.byId[h.actor]; }
      else if (h.at != null) { var sl2 = geo.slot(h.at, { len: 0.5, wid: 0.5 }, errs, pre + 'at: '); if (!sl2) return; item.pos = P(sl2.x, sl2.y); item.r = item.r || 4; }
      else if (Array.isArray(h.rect) && h.rect.length === 4 && h.rect.every(isNum)) { item.rect = { x: Math.min(h.rect[0], h.rect[2]), y: -Math.max(h.rect[1], h.rect[3]), w: Math.abs(h.rect[2] - h.rect[0]), h: Math.abs(h.rect[3] - h.rect[1]) }; }
      else { errs.push(pre + 'needs "actor", "at" (+ "r") or "rect": [x0, y0, x1, y1]'); return; }
      out.hotspots.push(item);
    });
    return out;
  }

  function prefersReduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  function Scene(el, input, opts) {
    var self = this;
    this.opts = opts = opts || {};
    this.el = el;
    this.uid = 'mqs' + (++UID) + '-';
    this.errs = []; this.warns = [];
    this.reduced = opts.reducedMotion != null ? !!opts.reducedMotion : prefersReduced();
    this.blinkOn = opts.blink !== false && !this.reduced;
    var prep = prepare(input, this.errs, this.warns, opts.hotspots);
    if (!prep) throw new Error(this.errs.slice(0, 3).join('; '));
    this.prep = prep; this.geo = prep.geo; this.comp = prep.comp; this.spec = prep.spec;
    this.labelsMode = opts.labels || prep.spec.labels || 'hover';
    this.debug = !!(opts.debug || prep.spec.debug);
    this.tapMode = !!(opts.onTap && (prep.hotspots.length || opts.tap));
    this.phase = 'question'; this.t = 0; this.playing = false; this.raf = 0; this.last = 0;
    this.marks = {}; this.hover = null; this.showArrowsF = null; this.showLabelsF = null; this.reveal = false; this.idn = 0;
    this.build();
    // resize / visibility
    this.upp = 0.15;
    this.measure();
    if (window.ResizeObserver) { this.ro = new ResizeObserver(function () { self.measure(); self.kick(); }); this.ro.observe(this.svg); }
    else { this.onResize = function () { self.measure(); self.kick(); }; window.addEventListener('resize', this.onResize); }
    this.render(this.T());
    // labels are measured with the web fonts: lay them out again once the fonts are ready
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!self.dead) { self.render(self.T()); } }); } catch (e) { /* ignore */ }
    var auto = opts.autoplay !== false;
    if (auto && this.comp.hasIntro) this.play('intro');
    else if (this.comp.hasIntro && !auto) { this.phase = 'intro'; this.t = 0; this.render(this.T()); }
    else { this.fire('question'); this.kick(); }
  }

  Scene.prototype.K = function () {
    var self = this;
    return { defs: this.defs, id: function (n) { return self.uid + n + (++self.idn); }, beamId: this.uid + 'beam' };
  };

  Scene.prototype.build = function () {
    var self = this, v = this.geo.view, spec = this.spec;
    var svg = E('svg', { xmlns: NS, viewBox: f2(v.x) + ' ' + f2(v.y) + ' ' + f2(v.w) + ' ' + f2(v.h), width: f2(v.w * 8), height: f2(v.h * 8),
      role: 'img', 'class': 'mq-scene', preserveAspectRatio: 'xMidYMid meet', 'aria-label': spec.alt || ('مشهد من الأعلى: ' + (TPL_TITLE[spec.template] || '')) });
    svg.style.cssText = 'display:block;width:100%;height:auto;max-width:100%;background:' + COL.ground + ';touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;overflow:hidden';
    this.svg = svg;
    this.defs = E('defs', null, svg);
    var K = this.K();
    var bg = E('linearGradient', { id: K.beamId, x1: 0, y1: 1, x2: 0, y2: 0 }, this.defs);
    E('stop', { offset: 0, 'stop-color': '#FFF4D6', 'stop-opacity': 0.55 }, bg);
    E('stop', { offset: 1, 'stop-color': '#FFF4D6', 'stop-opacity': 0 }, bg);
    var clip = E('clipPath', { id: this.uid + 'view' }, this.defs);
    E('rect', { x: f2(v.x), y: f2(v.y), width: f2(v.w), height: f2(v.h) }, clip);
    var root = G(svg, { 'clip-path': 'url(#' + this.uid + 'view)' });
    var L = this.L = {};
    var order = this.prep.overlays.length ? ['ground', 'road', 'marks', 'furniture', 'actors', 'overlay', 'emit', 'arrows', 'ui', 'hot', 'debug']
      : ['ground', 'road', 'marks', 'furniture', 'arrows', 'actors', 'overlay', 'emit', 'ui', 'hot', 'debug'];
    order.forEach(function (n) { L[n] = G(root, { 'class': 'mq-' + n }); });
    L.hot.setAttribute('fill', 'transparent');
    this.geo.draw.forEach(function (fn) { try { fn(L, K); } catch (e) { self.errs.push('drawing failed: ' + e.message); } });
    // actors
    this.comp.actors.forEach(function (a) {
      a.vis = drawActor(a, L, K);
      a.ui = G(L.ui, { display: 'none', 'pointer-events': 'none' });
      a.uiRect = E('rect', { rx: 0, fill: 'rgba(10,14,21,0.88)', stroke: COL.gold, 'stroke-width': 0.1 }, a.ui);
      a.uiText = E('text', { 'font-family': BODY_FONT, 'font-weight': 600, fill: COL.ink, 'text-anchor': 'middle', 'dominant-baseline': 'central', direction: 'rtl' }, a.ui);
      if (a.label || a.type === 'me') {
        a.vis.body.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') { self.hover = a.id; self.kick(); } });
        a.vis.body.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse' && self.hover === a.id) { self.hover = null; self.kick(); } });
      }
    });
    // overlays
    this.buildOverlays();
    // arrows
    this.prep.arrows.forEach(function (a) {
      var col = STYLE_COL[a.style], g = G(L.arrows, { display: 'none' });
      E('path', { d: dOf(a.pts), fill: 'none', stroke: '#0A0E15', 'stroke-width': 1.25, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.55 }, g);
      E('path', { d: dOf(a.pts), fill: 'none', stroke: col, 'stroke-width': 0.62, 'stroke-dasharray': '1.5 1.1', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      var n = a.pts.length, end = a.pts[n - 1], dir = norm(sub(end, a.pts[Math.max(0, n - 4)]));
      E('path', { d: 'M0 -1.3 L1.05 0.6 L-1.05 0.6 Z', fill: col, stroke: '#0A0E15', 'stroke-width': 0.15, transform: tr(end.x, end.y, bOf(dir)) }, g);
      a.g = g;
    });
    // callouts
    this.prep.callouts.forEach(function (c) {
      c.g = G(L.ui, { display: 'none', 'pointer-events': 'none' });
      c.rect = E('rect', { fill: 'rgba(10,14,21,0.9)', stroke: STYLE_COL[c.style], 'stroke-width': 0.12 }, c.g);
      c.textEl = E('text', { 'font-family': BODY_FONT, 'font-weight': 600, fill: c.style === 'info' ? COL.ink : STYLE_COL[c.style], 'text-anchor': 'middle', 'dominant-baseline': 'central', direction: 'rtl' }, c.g);
      c.textEl.textContent = cleanAr(c.str);
    });
    // traffic lights
    this.lights = this.geo.signals || {};
    // hotspots
    this.prep.hotspots.forEach(function (h) {
      var el;
      if (h.rect) el = E('rect', { x: f2(h.rect.x), y: f2(h.rect.y), width: f2(h.rect.w), height: f2(h.rect.h) }, L.hot);
      else el = E('circle', { cx: h.pos ? f2(h.pos.x) : 0, cy: h.pos ? f2(h.pos.y) : 0, r: f2(h.r || 3) }, L.hot);
      el.setAttribute('data-hs', h.id);
      el.setAttribute('fill', 'transparent');
      if (self.tapMode) {
        el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
        if (h.label) el.setAttribute('aria-label', h.label);
        el.style.cursor = 'pointer'; el.style.outline = 'none';
        el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); self.tap(h.id, null); } });
      } else el.setAttribute('pointer-events', 'none');
      h.el = el;
      h.ring = E('circle', { r: 1, fill: 'none', 'stroke-width': 0.4, display: 'none', 'pointer-events': 'none' }, L.ui);
    });
    if (!this.tapMode) L.hot.setAttribute('pointer-events', 'none');
    this.onClick = function (ev) { self.handleClick(ev); };
    svg.addEventListener('click', this.onClick);
    if (this.debug) this.buildDebug();
    this.el.appendChild(svg);
  };

  Scene.prototype.buildOverlays = function () {
    var L = this.L, v = this.geo.view, ov = this.prep.overlays, self = this;
    this.night = ov.indexOf('night') >= 0;
    this.ovs = [];
    var big = { x: f2(v.x - 5), y: f2(v.y - 5), width: f2(v.w + 10), height: f2(v.h + 10) };
    function radial(name, color, inner, outer, vis) {
      var id = self.uid + name;
      var rg = E('radialGradient', { id: id, gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: vis }, self.defs);
      E('stop', { offset: 0, 'stop-color': color, 'stop-opacity': inner }, rg);
      E('stop', { offset: 0.45, 'stop-color': color, 'stop-opacity': (inner + outer) / 2.4 }, rg);
      E('stop', { offset: 1, 'stop-color': color, 'stop-opacity': outer }, rg);
      var r = E('rect', big, L.overlay);
      r.setAttribute('fill', 'url(#' + id + ')');
      self.ovs.push({ grad: rg });
      return r;
    }
    function streaks(name, color, w, h, lines, op) {
      var id = self.uid + name;
      var pat = E('pattern', { id: id, patternUnits: 'userSpaceOnUse', width: w, height: h }, self.defs);
      lines.forEach(function (l) { E('line', { x1: l[0], y1: l[1], x2: l[2], y2: l[3], stroke: color, 'stroke-width': l[4] || 0.08, 'stroke-linecap': 'round', opacity: op }, pat); });
      var r = E('rect', big, L.overlay);
      r.setAttribute('fill', 'url(#' + id + ')');
      self.ovs.push({ pat: pat, anim: name });
      return r;
    }
    var vis = this.prep.visibility;
    if (this.night) {
      E('rect', Object.assign({ fill: '#030710', opacity: 0.62 }, big), L.overlay);
      radial('nightv', '#030710', 0, 0.55, vis || 55);
    }
    if (ov.indexOf('fog') >= 0) {
      E('rect', Object.assign({ fill: '#C4CAD2', opacity: 0.12 }, big), L.overlay);
      radial('fog', '#C4CAD2', 0.05, 0.9, vis || 30);
    }
    if (ov.indexOf('rain') >= 0) {
      E('rect', Object.assign({ fill: '#0A1322', opacity: 0.3 }, big), L.overlay);
      radial('rainv', '#6F7C8F', 0, 0.55, vis || 60);
      streaks('rain', '#C9D6E8', 3.2, 4.4, [[0.4, 0.2, 0.0, 1.6], [2.2, 2.0, 1.8, 3.4], [1.3, 3.2, 0.9, 4.6]], 0.55);
    }
    if (ov.indexOf('dust') >= 0) {
      E('rect', Object.assign({ fill: '#B98E55', opacity: 0.18 }, big), L.overlay);
      radial('dust', '#A97F48', 0.05, 0.92, vis || 25);
      streaks('dustw', '#E2C79A', 9, 5, [[0.5, 1.0, 4.0, 1.2, 0.18], [5.0, 3.2, 8.4, 3.5, 0.14]], 0.35);
    }
  };

  Scene.prototype.buildDebug = function () {
    var g = this.L.debug, geo = this.geo, v = geo.view;
    var fs = Math.max(1.1, v.w / 55);
    // grid every 10 m in author coordinates
    for (var x = Math.ceil(v.x / 10) * 10; x <= v.x + v.w; x += 10) {
      E('line', { x1: x, y1: f2(v.y), x2: x, y2: f2(v.y + v.h), stroke: '#6CF', 'stroke-width': 0.06, opacity: 0.35 }, g);
      E('text', { x: x + 0.3, y: f2(v.y + v.h - 0.6), 'font-size': f2(fs * 0.7), fill: '#6CF', 'font-family': LATIN, direction: 'ltr' }, g).textContent = 'x' + x;
    }
    for (var y = Math.ceil(v.y / 10) * 10; y <= v.y + v.h; y += 10) {
      E('line', { x1: f2(v.x), y1: y, x2: f2(v.x + v.w), y2: y, stroke: '#6CF', 'stroke-width': 0.06, opacity: 0.35 }, g);
      E('text', { x: f2(v.x + 0.4), y: y - 0.3, 'font-size': f2(fs * 0.7), fill: '#6CF', 'font-family': LATIN, direction: 'ltr' }, g).textContent = 'y' + (-y);
    }
    geo.laneList.forEach(function (L) {
      var path = L.path, s = null;
      // label point: inside the view, 35% along the visible part
      var vis = [];
      for (var ss = 0; ss <= path.length; ss += 1.5) { var q = path.pos(ss); if (q.x > v.x + 3 && q.x < v.x + v.w - 3 && q.y > v.y + 3 && q.y < v.y + v.h - 3) vis.push(ss); }
      if (!vis.length) return;
      s = L.kind === 'ring' ? path.length * (0.02 + 0.06 * L.k) : vis[0] + (vis[vis.length - 1] - vis[0]) * (L.kind === 'in' ? 0.25 : 0.7);
      var pq = path.pose(s), col = L.kind === 'in' ? '#FF7AD9' : (L.kind === 'out' ? '#7AE0FF' : (L.kind === 'ring' ? '#FFD36B' : '#9CFF8A'));
      E('path', { d: dOf(path.slice(Math.max(0, s - 6), s + 6)), fill: 'none', stroke: col, 'stroke-width': 0.18, opacity: 0.8 }, g);
      E('path', { d: 'M0 -1.1 L0.7 0.3 L-0.7 0.3Z', fill: col, transform: tr(pq.x, pq.y, pq.h) }, g);
      var lbl = L.kind === 'ring' ? 'ring' + L.k : (L.k === 0 ? L.kind : String(L.k));
      if (L.kind === 'ramp') lbl = 'ramp';
      var tx = add(pq, mul(rightOf(dirB(pq.h)), 1.2));
      E('text', { x: f2(tx.x), y: f2(tx.y), 'font-size': f2(fs), 'font-weight': 700, fill: col, 'font-family': LATIN, 'text-anchor': 'middle', 'dominant-baseline': 'central', stroke: '#000', 'stroke-width': 0.25, 'paint-order': 'stroke', direction: 'ltr' }, g).textContent = lbl;
    });
    if (geo.A) Object.keys(geo.A).forEach(function (n) {
      var a = geo.A[n], p = mul(a.d, Math.min(v.w, v.h) / 2 - 3);
      E('text', { x: f2(p.x), y: f2(p.y), 'font-size': f2(fs * 1.6), 'font-weight': 700, fill: '#FFF', 'font-family': LATIN, 'text-anchor': 'middle', 'dominant-baseline': 'central', stroke: '#000', 'stroke-width': 0.35, 'paint-order': 'stroke', direction: 'ltr' }, g).textContent = n;
    });
    Object.keys(geo.bays || {}).forEach(function (id) {
      var b = geo.bays[id];
      E('text', { x: f2(b.c.x), y: f2(b.c.y), 'font-size': f2(fs * 0.9), 'font-weight': 700, fill: '#FFD36B', 'font-family': LATIN, 'text-anchor': 'middle', 'dominant-baseline': 'central', stroke: '#000', 'stroke-width': 0.25, 'paint-order': 'stroke', direction: 'ltr' }, g).textContent = id;
    });
  };

  // units per CSS pixel (for constant-size labels)
  Scene.prototype.measure = function () {
    var w = 0;
    try { w = this.svg.getBoundingClientRect().width; } catch (e) { w = 0; }
    if (!w) w = 360;
    this.upp = this.geo.view.w / w;
  };

  // ---- time model: intro [0, Li], question = Li, solution [T0s, T0s + Ls]
  Scene.prototype.T = function () {
    var c = this.comp;
    if (this.phase === 'intro') return Math.min(this.t, c.Li);
    if (this.phase === 'question') return c.Li;
    if (this.phase === 'solution') return c.T0s + Math.min(this.t, c.Ls);
    return c.T0s + c.Ls;
  };
  Scene.prototype.fire = function (name) {
    var cb = this.opts.onPhase, self = this;
    if (typeof cb !== 'function') return;
    setTimeout(function () { if (!self.dead) { try { cb(name, self.ctl); } catch (e) { if (window.console) console.error(e); } } }, 0);
  };
  Scene.prototype.play = function (ph) {
    var c = this.comp;
    if (this.dead) return;
    if (ph == null) { if (this.phase === 'intro' || this.phase === 'solution') { this.playing = true; this.kick(); } return; }
    if (ph === 'intro') {
      if (!c.hasIntro) { this.phase = 'question'; this.playing = false; this.render(this.T()); this.fire('question'); return; }
      this.phase = 'intro'; this.t = 0;
      this.fire('intro');
      if (this.reduced) { this.phase = 'question'; this.playing = false; this.render(this.T()); this.fire('question'); return; }
      this.playing = true; this.kick();
    } else if (ph === 'solution') {
      this.phase = 'solution'; this.t = 0;
      this.fire('solution');
      if (this.reduced || c.Ls <= 0) { this.phase = 'done'; this.playing = false; this.render(this.T()); this.fire('done'); return; }
      this.playing = true; this.kick();
    } else if (ph === 'question') { this.reset(); }
  };
  Scene.prototype.pause = function () { this.playing = false; };
  Scene.prototype.reset = function () { this.playing = false; this.phase = 'question'; this.t = 0; this.render(this.T()); this.kick(); };
  Scene.prototype.seek = function (t, ph) {
    var c = this.comp;
    ph = ph || (this.phase === 'intro' ? 'intro' : (this.phase === 'question' ? 'question' : 'solution'));
    this.playing = false;
    if (ph === 'question') { this.phase = 'question'; this.t = 0; }
    else if (ph === 'intro') { this.phase = 'intro'; this.t = clamp(isNum(t) ? t : 0, 0, c.Li); }
    else if (ph === 'solution') { this.phase = 'solution'; this.t = clamp(isNum(t) ? t : 0, 0, c.Ls); }
    else if (ph === 'end' || ph === 'done') { this.phase = 'done'; }
    this.render(this.T());
    this.kick();
  };
  Scene.prototype.kick = function () {
    var self = this;
    if (this.dead || this.raf) return;
    this.last = 0;
    this.raf = requestAnimationFrame(function (now) { self.tick(now); });
  };
  Scene.prototype.tick = function (now) {
    var self = this, c = this.comp;
    this.raf = 0;
    if (this.dead) return;
    // detached without destroy(): stop looping (a resize or play() restarts it)
    if (this.svg && this.svg.isConnected === false && !this.playing) return;
    if (this.playing) {
      var dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
      this.t += dt * (this.opts.speed || 1);
      if (this.phase === 'intro' && this.t >= c.Li) { this.t = 0; this.phase = 'question'; this.playing = false; this.fire('question'); }
      else if (this.phase === 'solution' && this.t >= c.Ls) { this.phase = 'done'; this.playing = false; this.fire('done'); }
    }
    this.last = now;
    this.render(this.T(), now);
    if (this.playing || this.animating) this.raf = requestAnimationFrame(function (n) { self.tick(n); });
  };

  function hlColor(v) { return v === 'ok' ? COL.ok : v === 'bad' ? COL.bad : v === 'warn' ? COL.warn : COL.gold; }

  Scene.prototype.render = function (T, now) {
    if (this.dead) return;
    now = now == null ? (window.performance ? performance.now() : Date.now()) : now;
    var self = this, c = this.comp, anim = false, stat = !this.blinkOn;
    var sigOn = stat || (now % 700) < 400, emA = stat || Math.floor(now / 260) % 2 === 0, slow = stat || (now % 1000) < 560;
    var inSol = this.phase === 'solution' || this.phase === 'done';
    var labelsAll = this.showLabelsF != null ? this.showLabelsF : (valAt(c.scene.labels, T).v != null ? valAt(c.scene.labels, T).v : (this.labelsMode === 'always' || (this.labelsMode === 'solution' && inSol)));
    var fs = 12 * this.upp;
    var mePos = null;
    c.actors.forEach(function (a) {
      var q = poseAt(a, T), P2 = a.vis.parts;
      var trf = tr(q.x, q.y, q.h);
      setA(a.vis.body, 'transform', trf); setA(a.vis.emit, 'transform', trf);
      var visible = valAt(a.tracks.visible, T).v !== false;
      show(a.vis.body, visible); show(a.vis.emit, visible);
      if (a.type === 'me') mePos = q;
      var sig = valAt(a.tracks.signal, T).v;
      if (P2.indL) {
        var l = visible && (sig === 'left' || sig === 'hazard') && sigOn, r = visible && (sig === 'right' || sig === 'hazard') && sigOn;
        P2.indL.forEach(function (n) { show(n, l); }); P2.indR.forEach(function (n) { show(n, r); });
        if (sig !== 'off') anim = true;
      }
      if (P2.brake) show(P2.brake, !!valAt(a.tracks.brake, T).v);
      if (P2.night) show(P2.night, self.night);
      var fl = !!valAt(a.tracks.flash, T).v;
      if (P2.flashA) { show(P2.flashA, fl && emA); show(P2.flashB, fl && (stat || !emA)); if (fl) anim = true; }
      if (P2.siren) {
        var sir = !!valAt(a.tracks.siren, T).v;
        show(P2.siren, sir);
        if (sir) {
          anim = true;
          P2.waves.forEach(function (w, i) {
            var ph = stat ? (i + 0.5) / 3 : ((now / 900) + i / 3) % 1;
            setA(w, 'transform', 'translate(0 ' + f2(P2.sirenBase - 0.6 - ph * 3.4) + ') scale(' + f2(0.6 + ph * 1.1) + ')');
            setA(w, 'opacity', f2(0.9 * (1 - ph)));
          });
        }
      }
      if (P2.arm) {
        var tk = a.tracks.stop_arm, cur = valAt(tk, T), f = cur && cur.v ? 1 : 0;
        if (cur && cur.T >= 0) { var k = clamp((T - cur.T) / 0.6, 0, 1); f = cur.v ? k : 1 - k; }
        setA(P2.arm, 'transform', tr(-a.wid / 2, -a.len / 2 + 1.9, -90 * (1 - f)));
        show(P2.arm, f > 0.04);
      }
      var hl = valAt(a.tracks.highlight, T).v;
      if (P2.hl) {
        show(P2.hl, !!hl && visible);
        if (hl) { setA(P2.hl, 'stroke', hlColor(hl)); setA(P2.hl, 'opacity', f2(stat ? 1 : 0.55 + 0.45 * Math.sin(now / 260))); anim = true; }
      }
      if (P2.feet) {
        var ph2 = q.moving ? Math.sin(q.s * 5.5) * 0.16 : 0;
        setA(P2.feet[0], 'cy', f2(ph2)); setA(P2.feet[1], 'cy', f2(-ph2));
      }
      if (P2.spin) setA(P2.spin, 'transform', 'rotate(' + f2((q.s || 0) * 120) + ')');
      // tag
      var say = valAt(a.tracks.say, T).v, text = null, style = 'info';
      if (say) { text = say; style = 'warn'; }
      else if ((labelsAll || (self.hover === a.id && self.labelsMode !== 'never')) && a.label) text = a.label;
      else if (a.type === 'me' && a.def.tag !== false) { text = 'أنت'; style = 'me'; }
      var vw = self.geo.view, rr = Math.max(a.len, a.wid) / 2;
      var inView = q.x > vw.x - rr && q.x < vw.x + vw.w + rr && q.y > vw.y - rr && q.y < vw.y + vw.h + rr;
      if (text && visible && inView) {
        show(a.ui, true);
        var rad = Math.max(a.len, a.wid) / 2;
        self.layoutTag(a, text, style, q, rad, fs);
      } else show(a.ui, false);
    });
    // lights
    Object.keys(this.lights).forEach(function (arm) {
      var sh = self.lights[arm], st = (valAt(c.lights[arm], T) || {}).v || { main: 'red', left: 'off', right: 'off' }, lm = sh.lamps;
      ['red', 'amber', 'green'].forEach(function (col) {
        var m = st.main, on = false, flashing = false;
        if (m === col) on = true;
        if (m === 'flash-green' && col === 'green') { on = slow; flashing = true; }
        if (m === 'flash-amber' && col === 'amber') { on = slow; flashing = true; }
        show(lm[col].on, on); show(lm[col].halo, on); show(lm[col].ring, flashing);
        if (flashing) anim = true;
      });
      ['left', 'right'].forEach(function (d) {
        var v2 = st[d], used = v2 && v2 !== 'off';
        var everUsed = (c.lights[arm] || []).some(function (x) { return x.v && x.v[d] && x.v[d] !== 'off'; });
        show(lm[d].box, everUsed);
        var on2 = v2 === 'green' || (v2 === 'flash-green' && slow);
        show(lm[d].on, on2); show(lm[d].halo, on2);
        if (v2 === 'flash-green') anim = true;
      });
    });
    // overlays follow "me"
    var cen = mePos ? P(mePos.x, mePos.y) : P(this.geo.view.x + this.geo.view.w / 2, this.geo.view.y + this.geo.view.h * 0.75);
    this.ovs.forEach(function (o) {
      if (o.grad) { setA(o.grad, 'cx', f2(cen.x)); setA(o.grad, 'cy', f2(cen.y)); }
      if (o.pat && !stat) {
        anim = true;
        var k2 = now / 1000;
        setA(o.pat, 'patternTransform', o.anim === 'rain' ? 'translate(' + f2(-k2 * 3 % 3.2) + ' ' + f2(k2 * 26 % 4.4) + ')' : 'translate(' + f2(k2 * 7 % 9) + ' ' + f2(k2 * 0.6 % 5) + ')');
      }
    });
    // arrows & callouts
    var showArrows = this.showArrowsF != null ? this.showArrowsF : valAt(c.scene.arrows, T).v;
    this.prep.arrows.forEach(function (a) {
      var vis = showArrows != null ? showArrows && (a.when !== 'question' || !inSol) : (a.when === 'always' || (a.when === 'solution' && inSol) || (a.when === 'question' && !inSol));
      show(a.g, vis);
    });
    this.prep.callouts.forEach(function (co) {
      var vis = co.when === 'always' || (co.when === 'solution' && inSol) || (co.when === 'question' && !inSol);
      show(co.g, vis);
      if (!vis) return;
      var pos = co.pos;
      if (co.actor) { var qa = poseAt(co.actor, T); pos = P(qa.x, qa.y + Math.max(co.actor.len, co.actor.wid) / 2 + 2.2 * fs); }
      self.layoutBox(co.g, co.rect, co.textEl, pos, fs, STYLE_COL[co.style]);
    });
    // hotspots follow actors; marks
    this.prep.hotspots.forEach(function (h) {
      var cx, cy, r;
      if (h.actor) {
        var qh = poseAt(h.actor, T);
        cx = qh.x; cy = qh.y; r = Math.max(h.r || 0, Math.max(h.actor.len, h.actor.wid) / 2 + 1.0, 22 * self.upp);
        setA(h.el, 'cx', f2(cx)); setA(h.el, 'cy', f2(cy)); setA(h.el, 'r', f2(r));
      } else if (h.pos) { cx = h.pos.x; cy = h.pos.y; r = Math.max(h.r || 4, 22 * self.upp); setA(h.el, 'r', f2(r)); }
      else { cx = h.rect.x + h.rect.w / 2; cy = h.rect.y + h.rect.h / 2; r = Math.max(h.rect.w, h.rect.h) / 2 + 0.5; }
      var mk = self.marks[h.id] || (self.reveal ? 'reveal' : null);
      show(h.ring, !!mk);
      if (mk) {
        setA(h.ring, 'cx', f2(cx)); setA(h.ring, 'cy', f2(cy)); setA(h.ring, 'r', f2(r));
        setA(h.ring, 'stroke', mk === 'ok' ? COL.ok : mk === 'bad' ? COL.bad : COL.gold);
        setA(h.ring, 'stroke-dasharray', mk === 'reveal' ? '1 0.7' : 'none');
        setA(h.ring, 'stroke-width', f2(Math.max(0.35, 2.5 * self.upp)));
      }
    });
    this.animating = anim && !this.dead;
  };

  Scene.prototype.layoutBox = function (g, rect, text, pos, fs, stroke) {
    var v = this.geo.view;
    setA(text, 'font-size', f2(fs));
    var w = 0;
    try { w = text.getComputedTextLength(); } catch (e) { w = 0; }
    if (!w) w = (text.textContent || '').length * fs * 0.56;
    var bw = w + fs * 1.3, bh = fs * 1.75;
    var x = clamp(pos.x, v.x + bw / 2 + 0.3, v.x + v.w - bw / 2 - 0.3), y = clamp(pos.y, v.y + bh / 2 + 0.3, v.y + v.h - bh / 2 - 0.3);
    setA(rect, 'x', f2(x - bw / 2)); setA(rect, 'y', f2(y - bh / 2)); setA(rect, 'width', f2(bw)); setA(rect, 'height', f2(bh)); setA(rect, 'rx', f2(bh / 2));
    setA(rect, 'stroke-width', f2(Math.max(0.08, this.upp * 1.2)));
    if (stroke) setA(rect, 'stroke', stroke);
    setA(text, 'x', f2(x)); setA(text, 'y', f2(y + fs * 0.05));
  };
  // tag box goes BEHIND the actor (the road ahead stays visible), else beside it, else in front
  Scene.prototype.layoutTag = function (a, text, style, q, rad, fs) {
    if (a.uiText.textContent !== text) a.uiText.textContent = text;
    var v = this.geo.view, bh = fs * 1.75, gap = 0.45 * fs;
    setA(a.uiText, 'font-size', f2(fs));
    var w = 0;
    try { w = a.uiText.getComputedTextLength(); } catch (e) { w = 0; }
    if (!w) w = text.length * fs * 0.56;
    var bw = w + fs * 1.3, fwd = dirB(q.h), rt = rightOf(fwd), cands = [mul(fwd, -1), rt, mul(rt, -1), fwd], pos = null;
    for (var i = 0; i < cands.length; i++) {
      var u = cands[i];
      var ext = Math.abs(u.x * fwd.x + u.y * fwd.y) * a.len / 2 + Math.abs(u.x * rt.x + u.y * rt.y) * a.wid / 2;
      var c = add(q, mul(u, ext + gap + Math.abs(u.x) * bw / 2 + Math.abs(u.y) * bh / 2));
      if (c.x - bw / 2 > v.x + 0.2 && c.x + bw / 2 < v.x + v.w - 0.2 && c.y - bh / 2 > v.y + 0.2 && c.y + bh / 2 < v.y + v.h - 0.2) { pos = c; break; }
    }
    if (!pos) pos = add(q, mul(cands[0], a.len / 2 + gap + bh / 2));
    var col = style === 'me' ? COL.gold : (style === 'warn' ? COL.warn : '#AEB8C8');
    setA(a.uiText, 'fill', style === 'me' ? COL.gold : (style === 'warn' ? COL.warn : COL.ink));
    this.layoutBox(a.ui, a.uiRect, a.uiText, pos, fs, col);
  };

  Scene.prototype.handleClick = function (ev) {
    var t = ev.target, id = null;
    while (t && t !== this.svg) { if (t.getAttribute && t.getAttribute('data-hs')) { id = t.getAttribute('data-hs'); break; } t = t.parentNode; }
    if (this.tapMode) { this.tap(id, ev); return; }
    // touch: toggle labels of tapped actors
    var hit = null, self = this;
    t = ev.target;
    this.comp.actors.forEach(function (a) { if (a.vis && a.vis.body.contains(t) && (a.label || a.type === 'me')) hit = a.id; });
    this.hover = this.hover === hit ? null : hit;
    this.kick();
  };
  Scene.prototype.tap = function (id, ev) {
    var info = { phase: this.phase, t: this.t };
    if (ev && this.svg.getScreenCTM) {
      try { var pt = this.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; var w = pt.matrixTransform(this.svg.getScreenCTM().inverse()); info.x = f2(w.x); info.y = f2(-w.y); } catch (e) { /* ignore */ }
    }
    if (typeof this.opts.onTap === 'function') { try { this.opts.onTap(id, info); } catch (e) { if (window.console) console.error(e); } }
  };
  Scene.prototype.destroy = function () {
    if (this.dead) return;
    this.dead = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.svg) { this.svg.removeEventListener('click', this.onClick); if (this.svg.parentNode) this.svg.parentNode.removeChild(this.svg); }
    this.svg = null;
  };

  function errorBox(el, msgs) {
    var box = document.createElement('div');
    box.setAttribute('dir', 'rtl');
    box.style.cssText = 'padding:14px;border:1px dashed ' + COL.warn + ';border-radius:10px;color:' + COL.muted + ';font:13px/1.6 ' + BODY_FONT + ';background:' + COL.panel;
    box.textContent = 'تعذر عرض المشهد';
    var small = document.createElement('div');
    small.setAttribute('dir', 'ltr');
    small.style.cssText = 'margin-top:6px;font:11px/1.5 ' + LATIN + ';color:' + COL.bad + ';white-space:pre-wrap';
    small.textContent = (msgs || []).slice(0, 6).join('\n');
    box.appendChild(small);
    el.appendChild(box);
    return box;
  }

  function mount(el, spec, opts) {
    opts = opts || {};
    var scene = null, box = null, err = null;
    try {
      if (!el || !el.appendChild) throw new Error('Scenes.mount needs a container element');
      scene = new Scene(el, spec, opts);
    } catch (e) {
      err = e;
      if (window.console) console.error('Scenes.mount:', e);
      try { if (el && el.appendChild) box = errorBox(el, [e && e.message]); } catch (e2) { /* ignore */ }
    }
    var noop = function () {};
    var ctl = scene ? {
      play: function (ph) { scene.play(ph); },
      pause: function () { scene.pause(); },
      reset: function () { scene.reset(); },
      seek: function (t, ph) { scene.seek(t, ph); },
      destroy: function () { scene.destroy(); },
      mark: function (id, st) { if (st) scene.marks[id] = st; else delete scene.marks[id]; scene.render(scene.T()); scene.kick(); },
      clearMarks: function () { scene.marks = {}; scene.render(scene.T()); },
      revealHotspots: function (on) { scene.reveal = on !== false; scene.render(scene.T()); },
      showArrows: function (on) { scene.showArrowsF = on == null ? null : !!on; scene.render(scene.T()); },
      showLabels: function (on) { scene.showLabelsF = on == null ? null : !!on; scene.render(scene.T()); scene.kick(); },
      duration: function (ph) { return ph === 'intro' ? scene.comp.Li : (ph === 'solution' ? scene.comp.Ls : 0); },
      hasIntro: scene.comp.hasIntro,
      errors: scene.errs.slice(),
      warnings: scene.warns.slice(),
      svg: scene.svg
    } : { play: noop, pause: noop, reset: noop, seek: noop, mark: noop, clearMarks: noop, revealHotspots: noop, showArrows: noop, showLabels: noop,
      duration: function () { return 0; }, hasIntro: false, errors: [err ? String(err.message || err) : 'mount failed'], warnings: [], svg: null,
      destroy: function () { if (box && box.parentNode) box.parentNode.removeChild(box); } };
    if (scene) {
      Object.defineProperty(ctl, 'phase', { get: function () { return scene.phase; } });
      Object.defineProperty(ctl, 'time', { get: function () { return scene.t; } });
      scene.ctl = ctl;
    } else ctl.phase = 'error';
    return ctl;
  }

  // ================================================================== validation
  var TOPICS = ['signs-basics', 'lights', 'markings', 'police', 'speed', 'distance', 'lanes', 'overtaking', 'priority', 'roundabouts',
    'turning', 'highway', 'pedestrians', 'school-bus', 'emergency-vehicles', 'vulnerable', 'parking', 'lights-horn', 'weather', 'night',
    'hazard', 'emergency', 'accidents', 'vehicle', 'law', 'penalties', 'driver', 'roadtest', 'yard', 'dubai-specific', 'sharjah-specific'];
  var SCENARIO_KEYS = ['id', 'topic', 'level', 'exam', 'type', 'scene', 'q', 'options', 'answer', 'explain', 'tip', 'hotspots', 'src',
    'confidence', 'notes', '_file'];

  function arabicIssues(s, where, isQuestion) {
    var out = [];
    if (typeof s !== 'string') return out;
    if (/[ًٌٍّ]/.test(s)) out.push(where + ': remove tanwin / shadda (ً ٌ ٍ ّ are not allowed)');
    if (/[\u2014\u2013]/.test(s)) out.push(where + ': em dash / en dash is not allowed (use "،" or ":" or parentheses)');
    if (/[.۔]\s*$/.test(s)) out.push(where + ': must not end with a full stop');
    if (isQuestion && !/[؟?]\s*$/.test(s)) out.push('warn: ' + where + ': a question normally ends with "؟"');
    return out;
  }

  function validateScenario(sc, errs, warns) {
    knownKeys(sc, SCENARIO_KEYS, errs, 'scenario');
    var pre = 'scenario' + (sc.id ? ' ' + sc.id : '') + ': ';
    if (typeof sc.id !== 'string' || !sc.id) errs.push(pre + 'needs a string "id"');
    if (TOPICS.indexOf(sc.topic) < 0) errs.push(pre + 'topic ' + JSON.stringify(sc.topic) + ' is not one of the BRIEF topics');
    if (!isNum(sc.level) || sc.level < 1 || sc.level > 5 || Math.round(sc.level) !== sc.level) errs.push(pre + 'level must be 1-5');
    if (!Array.isArray(sc.exam) || !sc.exam.length || sc.exam.some(function (x) { return x !== 'dubai' && x !== 'sharjah'; })) errs.push(pre + 'exam must be a list with "dubai" and/or "sharjah"');
    if (sc.type !== 'choice' && sc.type !== 'tap') errs.push(pre + 'type must be "choice" or "tap"');
    if (typeof sc.q !== 'string' || !sc.q) errs.push(pre + 'needs "q"');
    if (typeof sc.explain !== 'string' || !sc.explain) errs.push(pre + 'needs "explain"');
    arabicIssues(sc.q, pre + 'q', sc.type === 'choice').forEach(function (m) { (m.indexOf('warn:') === 0 ? warns : errs).push(m); });
    arabicIssues(sc.explain, pre + 'explain').forEach(function (m) { errs.push(m); });
    arabicIssues(sc.tip, pre + 'tip').forEach(function (m) { errs.push(m); });
    if (sc.confidence != null && sc.confidence !== 'high' && sc.confidence !== 'medium') errs.push(pre + 'confidence must be "high" or "medium"');
    if (sc.type === 'choice') {
      if (!Array.isArray(sc.options) || sc.options.length < 2 || sc.options.length > 5) errs.push(pre + 'a choice question needs 2-5 options');
      else {
        sc.options.forEach(function (o, i) {
          if (typeof o !== 'string' || !o.trim()) errs.push(pre + 'options[' + i + '] must be a non-empty string');
          arabicIssues(o, pre + 'options[' + i + ']').forEach(function (m) { errs.push(m); });
          if (/كل ما سبق|لا شيء مما سبق/.test(o)) errs.push(pre + 'options[' + i + ']: "كل ما سبق" / "لا شيء مما سبق" are not allowed');
        });
        if (!isNum(sc.answer) || sc.answer < 0 || sc.answer >= sc.options.length || Math.round(sc.answer) !== sc.answer) errs.push(pre + 'answer must be the index (0-based) of the correct option');
      }
    }
    if (sc.type === 'tap') {
      var hs = Array.isArray(sc.hotspots) ? sc.hotspots : (isObj(sc.scene) && Array.isArray(sc.scene.hotspots) ? sc.scene.hotspots : []);
      if (!hs.length) errs.push(pre + 'a tap question needs "hotspots"');
      var ids = hs.map(function (h) { return h && h.id; });
      var ans = Array.isArray(sc.answer) ? sc.answer : [sc.answer];
      if (!ans.length || ans.some(function (a) { return ids.indexOf(a) < 0; })) errs.push(pre + 'answer must be a hotspot id (or a list of ids) from "hotspots"');
      var okAns = ans.filter(function (a) { return ids.indexOf(a) >= 0; });
      if (okAns.length === ans.length && okAns.length === ids.length && ids.length > 0) warns.push('warn: ' + pre + 'every hotspot is a correct answer; add at least one wrong hotspot or rely on taps outside');
      hs.forEach(function (h, i) { if (h && h.label) arabicIssues(h.label, pre + 'hotspots[' + i + '].label').forEach(function (m) { errs.push(m); }); });
    }
  }

  function obb(q, len, wid) { var d = dirB(q.h); return { c: P(q.x, q.y), d: d, r: rightOf(d), hl: Math.max(0.1, len / 2 - 0.12), hw: Math.max(0.1, wid / 2 - 0.06) }; }
  function obbHit(A, B) {
    var axes = [A.d, A.r, B.d, B.r], D = sub(B.c, A.c);
    for (var i = 0; i < 4; i++) {
      var ax = axes[i];
      var pa = A.hl * Math.abs(A.d.x * ax.x + A.d.y * ax.y) + A.hw * Math.abs(A.r.x * ax.x + A.r.y * ax.y);
      var pb = B.hl * Math.abs(B.d.x * ax.x + B.d.y * ax.y) + B.hw * Math.abs(B.r.x * ax.x + B.r.y * ax.y);
      if (Math.abs(D.x * ax.x + D.y * ax.y) > pa + pb) return false;
    }
    return true;
  }
  function phaseLabel(C, T) {
    if (T <= C.Li + 1e-6) return (C.hasIntro ? 'intro t=' + f2(T) + ' s' : 'question frame');
    return 'solution t=' + f2(T - C.T0s) + ' s';
  }

  function sanity(prep, errs, warns) {
    var C = prep.comp, geo = prep.geo, v = geo.view;
    var times = [];
    for (var t = 0; t <= C.Li + 1e-9; t += 0.1) times.push(t);
    times.push(C.Li);
    for (var t2 = 0; t2 <= C.Ls + 1e-9; t2 += 0.1) times.push(C.T0s + t2);
    var solid = C.actors.filter(function (a) { return a.type !== 'ball' && !a.def.collide; });
    var reported = {};
    times.forEach(function (T) {
      var boxes = solid.map(function (a) {
        var vis = valAt(a.tracks.visible, T).v !== false, q = poseAt(a, T), r = Math.max(a.len, a.wid) / 2;
        if (q.x < v.x - r || q.x > v.x + v.w + r || q.y < v.y - r || q.y > v.y + v.h + r) vis = false;
        return vis ? obb(q, a.len, a.wid) : null;
      });
      for (var i = 0; i < solid.length; i++) {
        if (!boxes[i]) continue;
        for (var j = i + 1; j < solid.length; j++) {
          if (!boxes[j]) continue;
          var a = solid[i], b = solid[j];
          if (a.type === 'pedestrian' && b.type === 'pedestrian') continue;
          var key = a.id + '|' + b.id;
          if (reported[key]) continue;
          if (obbHit(boxes[i], boxes[j])) { reported[key] = 1; warns.push('warn: "' + a.id + '" and "' + b.id + '" overlap at ' + phaseLabel(C, T) + ' (collision or wrong timing)'); }
        }
        (geo.parked || []).forEach(function (pk, k) {
          var key2 = solid[i].id + '|parked' + k;
          if (reported[key2]) return;
          if (obbHit(boxes[i], obb(pk, pk.len, pk.wid))) { reported[key2] = 1; warns.push('warn: "' + solid[i].id + '" overlaps a parked car at ' + phaseLabel(C, T)); }
        });
      }
      // driving against the traffic
      C.actors.forEach(function (a) {
        if (!VEHICLES[a.type] || a.def.wrong_way || reported['ww' + a.id]) return;
        if (valAt(a.tracks.visible, T).v === false) return;
        var q = poseAt(a, T), inAny = false, okDir = false, laneId = null;
        geo.laneList.forEach(function (L) {
          if (L.kind === 'aisle') return;
          var pr = L.path.project(q);
          if (pr.d > L.w / 2 - 0.2 || pr.s <= 0.5 || pr.s >= L.path.length - 0.5) return;
          inAny = true; laneId = laneId || L.id;
          if (Math.abs(angDiff(q.h, L.path.pose(pr.s).h)) < 100) okDir = true;
        });
        if (inAny && !okDir) { reported['ww' + a.id] = 1; warns.push('warn: "' + a.id + '" faces against the traffic in lane ' + laneId + ' at ' + phaseLabel(C, T) + ' (set "wrong_way": true if that is intended)'); }
      });
    });
    // visibility at the question frame
    C.actors.forEach(function (a) {
      var q = poseAt(a, C.Li), r = Math.max(a.len, a.wid) / 2;
      if (valAt(a.tracks.visible, C.Li).v === false) return;
      if (q.x < v.x - r || q.x > v.x + v.w + r || q.y < v.y - r || q.y > v.y + v.h + r) warns.push('warn: "' + a.id + '" is outside the visible area at the question frame');
      if (a.label) arabicIssues(a.label, 'actor "' + a.id + '" label').forEach(function (m) { errs.push(m); });
      (a.tracks.say || []).forEach(function (s) { if (s.v) arabicIssues(s.v, 'actor "' + a.id + '" say').forEach(function (m) { errs.push(m); }); });
      a.segs.forEach(function (sg) { if (Math.abs(sg.s1 - sg.s0) < 0.05 && sg.kind !== 'to') warns.push('warn: a "' + sg.kind + '" of "' + a.id + '" at ' + phaseLabel(C, sg.T0) + ' does not move (already there?)'); });
    });
    (prep.spec.callouts || []).forEach(function (c, i) { if (c && c.text) arabicIssues(c.text, 'callouts[' + i + ']').forEach(function (m) { errs.push(m); }); });
    if (!C.me) warns.push('warn: no actor of type "me" (the learner\'s car)');
    if (!C.Ls) warns.push('warn: no "solution" events: nothing will play after the answer');
  }

  function validate(input, opts) {
    var errs = [], warns = [];
    try {
      var isScenario = isObj(input) && isObj(input.scene);
      if (isScenario) validateScenario(input, errs, warns);
      else if (isObj(input) && (input.q != null || input.options != null || 'scene' in input)) { errs.push('scenario is missing "scene" (an object with "template", "params", "actors")'); return errs.concat(warns); }
      var prep = prepare(input, errs, warns, isScenario ? input.hotspots : undefined);
      if (prep && prep.comp) sanity(prep, errs, warns);
      if (isScenario && input.type === 'tap' && prep && !prep.hotspots.length) errs.push('tap scenario has no usable hotspots');
    } catch (e) { errs.push('validator crashed: ' + (e && e.message)); }
    var seen = {}, out = [];
    errs.concat(opts && opts.warnings === false ? [] : warns).forEach(function (m) { if (!seen[m]) { seen[m] = 1; out.push(m); } });
    return out;
  }

  function inspect(input) {
    var errs = [], warns = [];
    try {
      var prep = prepare(input, errs, warns);
      if (!prep) return { errors: errs };
      var g = prep.geo;
      return {
        template: prep.spec.template, view: g.view, arms: g.armNames || null,
        lanes: g.laneList.map(function (L) { return L.id; }), crossings: Object.keys(g.crossings), routes: g.routeNames || [],
        bays: Object.keys(g.bays || {}), lights: Object.keys(g.signals || {}), intro: prep.comp.Li, solution: prep.comp.Ls, errors: errs.concat(warns)
      };
    } catch (e) { return { errors: errs.concat(['inspect crashed: ' + e.message]) }; }
  }

  // static SVG markup of one frame (thumbnails, printing)
  function snapshot(input, o) {
    o = o || {};
    var div = document.createElement('div'), out = '';
    div.style.cssText = 'position:absolute;left:-10000px;top:0;width:' + (o.width || 480) + 'px';
    document.body.appendChild(div);
    var ctl = mount(div, input, { autoplay: false, blink: false, hotspots: o.hotspots });
    try { ctl.seek(o.t || 0, o.phase || 'question'); if (ctl.svg) out = ctl.svg.outerHTML; } catch (e) { out = ''; }
    ctl.destroy();
    document.body.removeChild(div);
    return out;
  }

  // ================================================================== template reference (Scenes.templates)
  var TEMPLATE_DOCS = {
    roundabout: {
      title: 'دوار', origin: 'centre of the roundabout (x east, y north)',
      params: {
        arms: '4 (default), 3 (= E,S,W) or a list like ["S","E","W"]', lanes: 'entry lanes per arm, 1-3, or {"S":2,"E":1}',
        exit_lanes: 'exit lanes per arm (default = lanes)', ring: 'circulating lanes 1-3 (default = most lanes on any arm)',
        island: 'palms | sand | grass | plain', radius: 'island radius m', splitter: 'true: splitter islands between entry and exit',
        control: 'giveway (default) | lights | none, or per arm', lights: 'initial light states when control = lights',
        crossings: 'list of arms with a zebra', arrows: '"auto" | false | {"S":["straight+right","straight+left"]} (lane 1 first)',
        scenery: 'city | desert | none', size: 'half-width of the view in m', markings: 'all | none'
      },
      slots: ['{"arm":"S","lane":1,"at":"stopline"}  approach lane, front bumper at the give-way line', '{"arm":"S","lane":2,"at":12}  12 m before the line',
        '{"arm":"E","lane":1,"dir":"out","at":5}  leaving by arm E', '{"ring":"outer","angle":200}  on the ring, compass bearing from the centre',
        '{"ring":"inner","before":"S"}  on the ring, 40 deg before passing arm S (it has priority over S)', '{"crossing":"S","side":"east"}  pedestrian waiting at a zebra', '{"x":10,"y":-20}'],
      routes: ['"S1->E" enter from S lane 1, take the exit to E (exit lane auto)', '"S2->W2" exit lane given', '"S2->S" U-turn', '"ring->N" from the current ring position to exit N'],
      marks: ['stopline', 'entry', 'exit', 'end']
    },
    crossroads: {
      title: 'تقاطع', origin: 'centre of the junction',
      params: { lanes: '1-3 or per arm {"S":{"in":2,"out":2}}', divided: 'true | per arm (median on the arm)', median: 'median width m (default 2)',
        control: 'none | stop | giveway | lights, or per arm', lights: '{"S":"red","N":{"main":"red","right":"green"}}', crossings: '["S","N"]', box: 'yellow box junction',
        arrows: '"auto" | false | per arm list, lane 1 first', corner: 'kerb radius m', center: 'auto | solid | broken | none', markings: 'all | none (unmarked junction)', scenery: 'city | desert | none', size: 'half-width of the view' },
      slots: ['{"arm":"S","lane":1,"at":"stopline"}', '{"arm":"W","lane":1,"dir":"out","at":8}', '{"crossing":"N","side":"west"}', '{"arm":"S","side":"east","at":4}  pavement', '{"x":0,"y":0}'],
      routes: ['"S1->E" right turn', '"S1->N" straight', '"S2->W" left turn', '"S2->S" U-turn'], marks: ['stopline', 'exit', 'end']
    },
    tjunction: {
      title: 'تقاطع T', origin: 'centre of the junction',
      params: { side: 'the side road arm: S (default), N, E or W; the main road is the other axis', lanes: 'number | {"main":2,"side":1} | per arm',
        control: 'string = control of the side road (default giveway; "lights" = all arms) or per arm', divided: 'per arm', crossings: 'list of arms', box: 'bool', markings: 'all | none' },
      slots: ['same as crossroads'], routes: ['"S1->W" (side road turning left)', '"E1->W" (straight on the main road)'], marks: ['stopline', 'exit', 'end']
    },
    road: {
      title: 'طريق', origin: 'x = 0 on the centre line (or median centre), y = 0 at the BOTTOM edge, y grows up the screen',
      params: { lanes: '1-4 per direction or {"up":3,"down":2} (down: 0 = one-way)', divided: 'bool', median: '{"width":4,"barrier":false,"palms":true}',
        line: 'broken | solid | double | none | mixed-right | mixed-left (between lanes of one direction); per direction {"up":..,"down":..}; per gap {"up":["mixed-right","solid"]}', center: 'broken | solid | double | none | {"type":"mixed","broken_for":"up"} (undivided)',
        center_color: 'white | yellow', edges: '{"left":"yellow","right":"white"}', shoulder: 'bool or {"up":true}', zebra: '{"y":40}',
        bus_stop: '{"y":30,"dir":"up"}', parked: '{"up":[y,...],"down":[y,...]} parked cars in a parking lane on the right kerb', works: '{"dir":"up","lane":1,"from":30,"to":50}',
        hump: 'y or [y, ...]', signs: '[{"id":"r-speed-60","dir":"up","y":10}]', len: 'visible length m (default 60)', width: 'view width m', scenery: 'city | desert | none', markings: 'all | none' },
      slots: ['{"dir":"up","lane":1,"y":20}  lane 1 = rightmost for that direction', '{"dir":"up","lane":"left","y":20}', '{"dir":"up","lane":"shoulder","y":20}',
        '{"dir":"up","lane":"parking","y":22}  in the parking lane (between parked cars)', '{"side":"east","y":30}  pavement', '{"crossing":"zebra","side":"west"}', '{"x":3,"y":10}'],
      routes: ['none: use drive / lane_change / pull_over / stop_at'], marks: []
    },
    'highway-merge': {
      title: 'دخول إلى طريق سريع', origin: 'x = 0 at the left (median) edge of the carriageway, y = 0 at the bottom edge',
      params: { lanes: '2-4 (northbound, up the screen)', accel: 'length of the parallel acceleration lane m', ramp_at: 'y where the ramp joins', opposite: 'lanes of the opposite carriageway (0-4)', len: 'visible length', scenery: 'desert | city | none' },
      slots: ['{"lane":"ramp","y":8}', '{"lane":"accel","y":35}', '{"lane":1,"y":30}'], routes: ['"merge" (option "merge_at": y)'], marks: ['accel', 'merge', 'end']
    },
    'highway-exit': {
      title: 'خروج من طريق سريع', origin: 'as highway-merge',
      params: { lanes: '2-4', decel: 'length of the deceleration lane', ramp_at: 'y where the taper starts', opposite: '0-4', len: 'visible length' },
      slots: ['{"lane":1,"y":10}', '{"lane":"decel","y":50}', '{"lane":"ramp","y":80}'], routes: ['"exit" (option "exit_at": y where the lane change starts)'], marks: ['decel', 'exit', 'end']
    },
    parking: {
      title: 'موقف سيارات', origin: 'x = 0 on the aisle / street centre, y = 0 at the bottom edge',
      params: { layout: 'bays (car park aisle) | street (parallel spaces)', bays: 'bays per side (bays layout)', angle: '90 | 60 | 45', spaces: 'spaces per side (street layout)',
        sides: '["east"] or ["east","west"] (street layout)', occupied: 'list of bay / space ids with parked cars', len: 'visible length' },
      slots: ['{"bay":"R3"}  east bays R1.., west bays L1.. (nose in; "nose":"out" for reversed in)', '{"space":"P2"}  east spaces P1.., west spaces Q1..', '{"dir":"up","lane":1,"y":10}'],
      routes: ['"park": "R3" (option "reverse": true)', '"leave": "up" | "down"'], marks: []
    },
    uturn: {
      title: 'فتحة دوران للخلف', origin: 'as road',
      params: { lanes: '1-4 per direction', median: '{"width":7}', opening: 'y of the start of the median opening', len: 'visible length (default 70)' },
      slots: ['{"dir":"up","lane":"left","y":20}  the leftmost lane is the U-turn lane'], routes: ['"uturn" (from the leftmost "up" lane into the "down" carriageway; option "to_lane")'], marks: ['opening', 'end']
    }
  };

  window.Scenes = {
    version: '1.0.0',
    mount: mount,
    validate: validate,
    inspect: inspect,
    snapshot: snapshot,
    templates: TEMPLATE_DOCS,
    actorTypes: ACTOR_TYPES.slice(),
    colors: CAR_COLOURS.slice(),
    topics: TOPICS.slice()
  };
})();
