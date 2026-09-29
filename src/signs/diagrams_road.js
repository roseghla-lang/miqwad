/* مقود: rule diagrams, concept figures of group "road" (content/figs.json): roundabouts, junction priority,
 * turns, U-turn, overtaking, lanes, following distance, cyclists, blind spots, parking distance, highway
 * joining and leaving, pedestrians when turning.
 * Seen from above, north up, UAE right-hand traffic: roundabouts run anticlockwise, overtaking is on the left,
 * lane 1 is the rightmost lane. Our car: white body, gold outline and halo.
 * One local top-down kit at the top (docs/drawing.md 5.2 and 5.4), then one function per figure.
 * Drawn from scratch, see docs/drawing.md */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }

  // ================================================================== kit
  var W = 160, H = 120, D2R = Math.PI / 180;
  var P = {
    pave: '#353C47', sand: '#C9B48A', asph: '#2A2F37', asphD: '#22262D', white: '#F2F2EE', yellow: '#F2C230',
    kerb: '#9AA3AE', island: '#2F4337', islandIn: '#3A5444', barrier: '#B3BAC4', gold: '#D9B978', ok: '#8CC8A0',
    bad: '#DE9090', x: '#E0564F', grey: '#97A1B4', amber: '#FFB21E', glass: '#1B2230', head: '#F4F1DE',
    tail: '#8E1C1C', ink: '#EAE6DB', pill: '#0D131E', me: '#F4F2EA', blue: '#3F6FB5', red: '#C0453A',
    silver: '#B8BEC8', dark: '#4A505A', green: '#3C8A5E', trailer: '#D5D8DC', signRed: '#C8202A', signBlue: '#1F5AA6'
  };

  function f(v) { return Math.round(v * 100) / 100; }
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }
  function pt(p) { return f(p[0]) + ' ' + f(p[1]); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function attrs(o) {
    var s = '';
    for (var k in o) {
      if (!has(o, k)) continue;
      var v = o[k];
      if (v === null || v === undefined || v === false) continue;
      s += ' ' + k + '="' + (typeof v === 'number' ? f(v) : v) + '"';
    }
    return s;
  }
  function ext(base, more) { if (more) for (var k in more) if (has(more, k)) base[k] = more[k]; return base; }
  function E(tag, o) { return '<' + tag + attrs(o) + '/>'; }
  function G(inner, o) { return '<g' + (o ? attrs(o) : '') + '>' + inner + '</g>'; }
  function rect(x, y, w, h, fill, more) { return E('rect', ext({ x: x, y: y, width: w, height: h, fill: fill }, more)); }
  function circ(x, y, r, fill, more) { return E('circle', ext({ cx: x, cy: y, r: r, fill: fill }, more)); }
  function ell(x, y, rx, ry, fill, more) { return E('ellipse', ext({ cx: x, cy: y, rx: rx, ry: ry, fill: fill }, more)); }
  function line(x1, y1, x2, y2, col, w, more) { return E('line', ext({ x1: x1, y1: y1, x2: x2, y2: y2, stroke: col, 'stroke-width': w }, more)); }
  function path(d, fill, more) { return E('path', ext({ d: d, fill: fill }, more)); }
  function poly(pts, fill, more) { return E('polygon', ext({ points: pts.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' '), fill: fill }, more)); }
  function pl(pts) { return 'M' + pts.map(pt).join('L'); }
  function tr(x, y, h) { return 'translate(' + f(x) + ' ' + f(y) + ')' + (h ? ' rotate(' + f(h) + ')' : ''); }
  var ROUND = { 'stroke-linecap': 'round' };

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { v = Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt); return v < 0 ? 0 : (v > 255 ? 255 : v); }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }

  // whole picture: rounded ground (city pavement, or desert sand for highways) + content
  function fig(label, inner, sand) {
    return K.svg(rect(0, 0, W, H, sand ? P.sand : P.pave, { rx: 10 }) + inner, '0 0 ' + W + ' ' + H, label);
  }

  // ---------- curves
  function bz(p, t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
  }
  function bzD(p, t) {
    var u = 1 - t;
    return [3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]),
      3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1])];
  }
  // points along a cubic, shifted sideways by d (d > 0 = to the right of the direction of travel)
  function bzSide(p, n, d) {
    var o = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, q = bz(p, t), v = bzD(p, t), l = hyp(v[0], v[1]) || 1;
      o.push([q[0] - v[1] / l * d, q[1] + v[0] / l * d]);
    }
    return o;
  }
  function bzCut(p, t) { // first part of a cubic, up to t
    function lp(a, b) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    var a = lp(p[0], p[1]), b = lp(p[1], p[2]), c = lp(p[2], p[3]), d = lp(a, b), e = lp(b, c);
    return [p[0], a, d, lp(d, e)];
  }
  function clampPts(pts) { return pts.map(function (q) { return [Math.max(0, Math.min(W, q[0])), Math.max(0, Math.min(H, q[1]))]; }); }
  // x of a polyline at height y
  function xAt(pts, y) {
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]);
    }
    return null;
  }

  // ---------- path builder (tracks the end point, the end direction and the length)
  // h: start heading in degrees clockwise from north (0 = up the screen)
  function Pen(x, y, h) {
    h = (h || 0) * D2R;
    this.d = 'M' + f(x) + ' ' + f(y); this.x = x; this.y = y; this.dx = Math.sin(h); this.dy = -Math.cos(h); this.len = 0;
  }
  Pen.prototype._go = function (x, y, dx, dy, len) {
    var l = hyp(dx, dy);
    if (l > 1e-9) { this.dx = dx / l; this.dy = dy / l; }
    this.len += len; this.x = x; this.y = y;
    return this;
  };
  Pen.prototype.L = function (x, y) {
    this.d += 'L' + f(x) + ' ' + f(y);
    return this._go(x, y, x - this.x, y - this.y, hyp(x - this.x, y - this.y));
  };
  Pen.prototype.C = function (ax, ay, bx, by, x, y) {
    var x0 = this.x, y0 = this.y, len = 0, px = x0, py = y0;
    for (var i = 1; i <= 16; i++) {
      var q = bz([[x0, y0], [ax, ay], [bx, by], [x, y]], i / 16);
      len += hyp(q[0] - px, q[1] - py); px = q[0]; py = q[1];
    }
    this.d += 'C' + [ax, ay, bx, by, x, y].map(f).join(' ');
    var dx = x - bx, dy = y - by;
    if (hyp(dx, dy) < 1e-6) { dx = x - ax; dy = y - ay; }
    return this._go(x, y, dx, dy, len);
  };
  Pen.prototype.bz = function (p) { return this.C(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]); };
  // smooth curve to (x, y): leaves along the current direction, arrives with heading h (degrees)
  Pen.prototype.to = function (x, y, h, k0, k1) {
    var ex = Math.sin(h * D2R), ey = -Math.cos(h * D2R), ch = hyp(x - this.x, y - this.y);
    k0 = k0 == null ? ch * 0.4 : k0; k1 = k1 == null ? k0 : k1;
    return this.C(this.x + this.dx * k0, this.y + this.dy * k0, x - ex * k1, y - ey * k1, x, y);
  };
  // arc around (cx, cy) from the current point to screen angle a (0 east, 90 south); ccw = anticlockwise on screen
  Pen.prototype.arc = function (cx, cy, a, ccw) {
    var r = hyp(this.x - cx, this.y - cy), a0 = Math.atan2(this.y - cy, this.x - cx), a1 = a * D2R;
    var x = cx + r * Math.cos(a1), y = cy + r * Math.sin(a1);
    var dl = ccw ? a0 - a1 : a1 - a0;
    dl = ((dl % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    this.d += 'A' + f(r) + ' ' + f(r) + ' 0 ' + (dl > Math.PI ? 1 : 0) + ' ' + (ccw ? 0 : 1) + ' ' + f(x) + ' ' + f(y);
    var rx = x - cx, ry = y - cy;
    return this._go(x, y, ccw ? ry : -ry, ccw ? -rx : rx, r * dl);
  };

  // path arrow with a solid triangular head beyond the end point (tip = end + head length)
  // o: {w, dash (true = '4 3'), op, casing:false, head:false}
  function arrow(pen, col, o) {
    o = o || {};
    var w = o.w || 1.9, hl = w * 2.2 + 1.1, hw = w * 1.35 + 0.9, out = '';
    var dash = o.dash === true ? '4 3' : (o.dash || null), off = null;
    if (dash) {
      var dp = dash.split(' ').map(Number), per = dp[0] + dp[1];
      off = ((dp[0] - pen.len) % per + per) % per;
    }
    var nx = -pen.dy, ny = pen.dx;
    var head = [[pen.x + pen.dx * hl, pen.y + pen.dy * hl], [pen.x + nx * hw, pen.y + ny * hw], [pen.x - nx * hw, pen.y - ny * hw]];
    if (o.casing !== false) {
      out += G(path(pen.d, 'none', { stroke: P.pill, 'stroke-width': w + 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) +
        (o.head === false ? '' : poly(head, P.pill, { stroke: P.pill, 'stroke-width': 1.7, 'stroke-linejoin': 'round' })), { opacity: 0.5 });
    }
    out += path(pen.d, 'none', { stroke: col, 'stroke-width': w, 'stroke-dasharray': dash, 'stroke-dashoffset': dash ? off : null,
      'stroke-linecap': dash ? 'butt' : 'round', 'stroke-linejoin': 'round' });
    if (o.head !== false) out += poly(head, col, { stroke: col, 'stroke-width': 0.5, 'stroke-linejoin': 'round' });
    return o.op != null ? G(out, { opacity: o.op }) : out;
  }

  // ---------- road users (drawn nose up, centred, then moved and turned; h = heading, degrees clockwise from north)
  var S0 = 3.3; // default scale: units per metre

  // amber indicator: dots at the front and rear corners of one side, with short flash strokes
  // side 'L', 'R' or 'both' (hazard lights); col: lamp colour (amber by default)
  function blink(side, hl, hw, s, col, few) {
    if (side === 'both') return blink('L', hl, hw, s, col, true) + blink('R', hl, hw, s, col, true);
    var sx = side === 'L' ? -1 : 1, q = '', sc = Math.min(s, 4.2), c1 = col || P.amber, c2 = col ? shade(col, 0.2) : '#FFC24A';
    [[-1, -hl + 0.32 * sc], [1, hl - 0.32 * sc]].forEach(function (c) {
      var fy = c[0], x = sx * (hw - 0.16 * sc), y = c[1];
      q += circ(x, y, 1.0 * sc, c1, { opacity: 0.38 }) + circ(x, y, 0.42 * sc, c2);
      (few ? [[1, 0], [0.6, 0.8]] : [[1, 0], [0.74, 0.67], [0.3, 0.95]]).forEach(function (d) {
        var dx = sx * d[0], dy = fy * d[1], r0 = 1.2 * sc, r1 = 1.95 * sc;
        q += line(x + dx * r0, y + dy * r0, x + dx * r1, y + dy * r1, c1, 0.3 * sc, ROUND);
      });
    });
    return q;
  }

  // passenger car 4.6 x 1.95 m. o: {s, color, me, ind:'L'|'R', brake, op, driver}
  function car(x, y, h, o) {
    o = o || {};
    var s = o.s || S0, me = !!o.me, L = 4.6 * s, Wd = 1.95 * s, hl = L / 2, hw = Wd / 2, q = '';
    var c = me ? P.me : (o.color || P.silver);
    function m(v) { return v * s; }
    if (me) q += rect(-hw - m(0.6), -hl - m(0.6), Wd + m(1.2), L + m(1.2), P.gold, { rx: m(1.0), opacity: 0.22 });
    if (o.brake) q += rect(-hw - m(0.25), hl - m(0.35), Wd + m(0.5), m(1.1), '#FF2A2A', { rx: m(0.5), opacity: 0.3 });
    q += rect(-hw, -hl, Wd, L, c, { rx: m(0.55), stroke: me ? P.gold : shade(c, -0.4), 'stroke-width': me ? m(0.3) : Math.max(0.4, m(0.1)) });
    q += poly([[m(-0.8), m(-1.2)], [m(0.8), m(-1.2)], [m(0.66), m(-0.45)], [m(-0.66), m(-0.45)]], P.glass);
    q += rect(m(-0.68), m(-0.45), m(1.36), m(1.5), shade(c, me ? -0.04 : 0.1), { rx: m(0.2) });
    q += poly([[m(-0.68), m(1.05)], [m(0.68), m(1.05)], [m(0.78), m(1.6)], [m(-0.78), m(1.6)]], P.glass);
    q += rect(-hw - m(0.18), m(-0.86), m(0.22), m(0.17), shade(c, -0.3)) + rect(hw - m(0.04), m(-0.86), m(0.22), m(0.17), shade(c, -0.3));
    q += rect(-hw + m(0.14), -hl + m(0.05), m(0.5), m(0.17), P.head, { rx: m(0.07) }) +
      rect(hw - m(0.64), -hl + m(0.05), m(0.5), m(0.17), P.head, { rx: m(0.07) });
    q += rect(-hw + m(0.14), hl - m(0.21), m(0.5), m(0.16), o.brake ? '#FF4A3D' : P.tail, { rx: m(0.06) }) +
      rect(hw - m(0.64), hl - m(0.21), m(0.5), m(0.16), o.brake ? '#FF4A3D' : P.tail, { rx: m(0.06) });
    if (o.driver) q += circ(m(-0.38), m(-0.12), m(0.27), '#3B2F2A', { stroke: P.pill, 'stroke-width': m(0.05) });
    if (o.ind) q += blink(o.ind, hl, hw, s);
    return G(q, { transform: tr(x, y, h), opacity: o.op });
  }

  // articulated truck: cab + box trailer. o: {s, len (m), color}
  function truck(x, y, h, o) {
    o = o || {};
    var s = o.s || S0, L = (o.len || 12) * s, Wd = 2.5 * s, hl = L / 2, hw = Wd / 2, cab = 2.4 * s, gap = 0.35 * s, q = '';
    var cc = o.color || '#C8C3B4';
    function m(v) { return v * s; }
    var ty = -hl + cab + gap, th = L - cab - gap;
    q += rect(-hw + m(0.04), ty, Wd - m(0.08), th, P.trailer, { rx: m(0.25), stroke: '#8D939B', 'stroke-width': Math.max(0.4, m(0.1)) });
    for (var yy = ty + m(1.6); yy < hl - m(0.8); yy += m(1.6)) q += line(-hw + m(0.3), yy, hw - m(0.3), yy, '#B8BDC4', Math.max(0.3, m(0.07)));
    q += rect(-hw + m(0.14), hl - m(0.2), m(0.5), m(0.16), P.tail) + rect(hw - m(0.64), hl - m(0.2), m(0.5), m(0.16), P.tail);
    q += rect(-hw - m(0.4), -hl + m(0.5), m(0.42), m(0.22), '#3A3F47') + rect(hw - m(0.02), -hl + m(0.5), m(0.42), m(0.22), '#3A3F47');
    q += rect(-hw, -hl, Wd, cab, cc, { rx: m(0.45), stroke: shade(cc, -0.4), 'stroke-width': Math.max(0.4, m(0.1)) });
    q += rect(-hw + m(0.22), -hl + m(0.28), Wd - m(0.44), m(0.6), P.glass, { rx: m(0.12) });
    q += rect(-hw + m(0.32), -hl + m(1.05), Wd - m(0.64), m(1.1), shade(cc, 0.12), { rx: m(0.15) });
    q += rect(-hw + m(0.16), -hl + m(0.03), m(0.5), m(0.16), P.head) + rect(hw - m(0.66), -hl + m(0.03), m(0.5), m(0.16), P.head);
    return G(q, { transform: tr(x, y, h) });
  }

  // cyclist seen from above (bicycle 1.8 m). o: {s, k (size boost), jersey}
  function cyclist(x, y, h, o) {
    o = o || {};
    var s = (o.s || S0) * (o.k || 1), q = '', jer = o.jersey || '#E2A65C';
    function m(v) { return v * s; }
    q += rect(m(-0.08), m(-0.97), m(0.16), m(0.66), '#D5D9DF', { rx: m(0.08), stroke: P.pill, 'stroke-width': m(0.03) });
    q += rect(m(-0.08), m(0.3), m(0.16), m(0.66), '#D5D9DF', { rx: m(0.08), stroke: P.pill, 'stroke-width': m(0.03) });
    q += line(0, m(-0.6), 0, m(0.5), '#8A929E', m(0.09));
    q += line(m(-0.31), m(-0.63), m(0.31), m(-0.63), '#D5D9DF', m(0.08), ROUND);
    q += line(m(-0.22), m(-0.2), m(-0.29), m(-0.6), shade(jer, -0.15), m(0.12), ROUND) +
      line(m(0.22), m(-0.2), m(0.29), m(-0.6), shade(jer, -0.15), m(0.12), ROUND);
    q += ell(0, m(0.08), m(0.2), m(0.32), jer, { stroke: shade(jer, -0.45), 'stroke-width': m(0.04) });
    q += ell(0, m(-0.14), m(0.26), m(0.13), jer, { stroke: shade(jer, -0.45), 'stroke-width': m(0.04) });
    q += ell(0, m(-0.32), m(0.14), m(0.16), '#F2F2EE', { stroke: '#5A6270', 'stroke-width': m(0.04) });
    return G(q, { transform: tr(x, y, h) });
  }

  // pedestrian seen from above: oval shoulders + head, one foot forward. o: {s, k, color}
  function ped(x, y, h, o) {
    o = o || {};
    var s = (o.s || S0) * (o.k || 1), q = '', col = o.color || '#4A8FD8';
    function m(v) { return v * s; }
    q += ell(m(-0.11), m(-0.26), m(0.075), m(0.12), '#1B2230') + ell(m(0.11), m(0.2), m(0.075), m(0.12), '#1B2230');
    q += ell(0, 0, m(0.3), m(0.16), col, { stroke: P.pill, 'stroke-width': m(0.05) });
    q += circ(0, m(-0.02), m(0.13), '#E8C9A8', { stroke: P.pill, 'stroke-width': m(0.04) });
    q += ell(0, m(0.02), m(0.12), m(0.1), '#3B2F2A');
    return G(q, { transform: tr(x, y, h) });
  }

  // ---------- marks
  function redX(x, y, r) {
    r = r || 3.8;
    return G(line(x - r, y - r, x + r, y + r, P.pill, 4.6, ROUND) + line(x + r, y - r, x - r, y + r, P.pill, 4.6, ROUND), { opacity: 0.6 }) +
      line(x - r, y - r, x + r, y + r, P.x, 2.5, ROUND) + line(x + r, y - r, x - r, y + r, P.x, 2.5, ROUND);
  }

  // short gold bar across a path where you must wait; (dx, dy) = travel direction
  function waitBar(x, y, dx, dy, len) {
    var l = hyp(dx, dy), nx = -dy / l * len / 2, ny = dx / l * len / 2;
    return G(line(x - nx, y - ny, x + nx, y + ny, P.pill, 4.8, ROUND), { opacity: 0.55 }) +
      line(x - nx, y - ny, x + nx, y + ny, P.gold, 2.6, ROUND);
  }

  // translucent zone
  function zone(pts, col, op, sop) {
    return poly(pts, col, { 'fill-opacity': op, stroke: col, 'stroke-opacity': sop != null ? sop : Math.min(1, op + 0.45), 'stroke-width': 0.8, 'stroke-linejoin': 'round' });
  }

  // label on a dark pill (widths measured in Alexandria 700 at size 10)
  var TW = { 'انتظر': 27.23, 'أولا': 17.09, 'إشارة يمين': 55.7, 'يمين': 23.55, 'ثانيتان': 31.72, '1 م': 17.8, '15 م': 24.75, 'التفت': 29.06,
    '30 سم': 35.09, '60°': 18.92 };
  function txt(str, x, y, size, col) {
    var ar = /[؀-ۿ]/.test(str);
    var t = K.text(str, x, y, size, { fill: col, weight: 700, family: ar ? 'head' : 'latin' });
    return ar ? G(t, { direction: 'rtl' }) : t;
  }
  function tag(str, x, y, o) {
    o = o || {};
    var size = o.size || 9, tw = (TW[str] != null ? TW[str] : str.length * 5.8) * size / 10;
    var w = tw + size * (o.pad || 1.1), h = size + 5;
    return rect(x - w / 2, y - h / 2, w, h, P.pill, { rx: h / 2, opacity: 0.85 }) + txt(str, x, y + 0.3, size, o.col || P.ink);
  }

  // round badge with a short text (step numbers)
  function badge(str, x, y, col, r) {
    r = r || 5;
    return circ(x, y, r + 0.9, P.pill, { opacity: 0.85 }) + circ(x, y, r, col) + txt(str, x, y + 0.3, r * 1.5, P.pill);
  }

  // gold dimension line with end ticks, small heads and an optional label on it
  function dim(x1, y1, x2, y2, label, o) {
    o = o || {};
    var dx = x2 - x1, dy = y2 - y1, l = hyp(dx, dy), ux = dx / l, uy = dy / l, tk = o.tick || 2.8, nx = -uy * tk, ny = ux * tk, q = '';
    var ha = 2.6, hb = 1.35;
    function hd(x, y, sx) { return poly([[x, y], [x - sx * ux * ha - uy * hb, y - sx * uy * ha + ux * hb], [x - sx * ux * ha + uy * hb, y - sx * uy * ha - ux * hb]], P.gold); }
    q += G(line(x1, y1, x2, y2, P.pill, 3, ROUND) + line(x1 - nx, y1 - ny, x1 + nx, y1 + ny, P.pill, 3, ROUND) +
      line(x2 - nx, y2 - ny, x2 + nx, y2 + ny, P.pill, 3, ROUND), { opacity: 0.5 });
    q += line(x1, y1, x2, y2, P.gold, 1.1) + line(x1 - nx, y1 - ny, x1 + nx, y1 + ny, P.gold, 1.2, ROUND) +
      line(x2 - nx, y2 - ny, x2 + nx, y2 + ny, P.gold, 1.2, ROUND) + hd(x1, y1, -1) + hd(x2, y2, 1);
    if (label) q += tag(label, o.lx != null ? o.lx : (x1 + x2) / 2, o.ly != null ? o.ly : (y1 + y2) / 2, { col: P.gold, size: o.size || 9.5 });
    return q;
  }

  // ---------- road geometry
  // closed outline with rounded corners: pts = [[x, y, r], ...]; edges along the picture border get no kerb
  function outline(pts) {
    var n = pts.length, segs = [], fill = '', kerb = '';
    function border(a, b) {
      return (a[0] <= 0.01 && b[0] <= 0.01) || (a[0] >= W - 0.01 && b[0] >= W - 0.01) ||
        (a[1] <= 0.01 && b[1] <= 0.01) || (a[1] >= H - 0.01 && b[1] >= H - 0.01);
    }
    for (var i = 0; i < n; i++) {
      var p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], r = p[2] || 0;
      if (!r) { segs.push({ p1: p, arc: '' }); continue; }
      var ux = p[0] - a[0], uy = p[1] - a[1], ul = hyp(ux, uy), vx = b[0] - p[0], vy = b[1] - p[1], vl = hyp(vx, vy);
      ux /= ul; uy /= ul; vx /= vl; vy /= vl;
      var ang = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy))), t = r * Math.tan(ang / 2);
      var p2 = [p[0] + vx * t, p[1] + vy * t];
      segs.push({ p1: [p[0] - ux * t, p[1] - uy * t], arc: 'A' + f(r) + ' ' + f(r) + ' 0 0 ' + (ux * vy - uy * vx > 0 ? 1 : 0) + ' ' + pt(p2),
        quiet: border(a, p) && border(p, b) });
    }
    for (i = 0; i < n; i++) {
      var sg = segs[i];
      fill += (i ? 'L' : 'M') + pt(sg.p1) + sg.arc;
      kerb += (i && !border(pts[i - 1], pts[i]) ? 'L' : 'M') + pt(sg.p1) + (sg.quiet ? '' : sg.arc);
    }
    if (!border(pts[n - 1], pts[0])) kerb += 'L' + pt(segs[0].p1);
    return { fill: fill + 'Z', kerb: kerb };
  }
  function surface(o, col) {
    return path(o.fill, col || P.asph) + path(o.kerb, 'none', { stroke: P.kerb, 'stroke-width': 1.4, 'stroke-linejoin': 'round' });
  }

  // straight line marking; dash: [dash, gap] in units or null for solid
  function mark(x1, y1, x2, y2, col, w, dash, off) {
    return line(x1, y1, x2, y2, col, w || 1, dash ? { 'stroke-dasharray': f(dash[0]) + ' ' + f(dash[1]), 'stroke-dashoffset': off || 0 } : null);
  }
  function dbl(x1, y1, x2, y2, col) { // double solid line along a vertical or horizontal axis
    var v = x1 === x2;
    return mark(v ? x1 - 0.9 : x1, v ? y1 : y1 - 0.9, v ? x2 - 0.9 : x2, v ? y2 : y2 - 0.9, col, 0.8) +
      mark(v ? x1 + 0.9 : x1, v ? y1 : y1 + 0.9, v ? x2 + 0.9 : x2, v ? y2 : y2 + 0.9, col, 0.8);
  }
  function stroke(pts, col, w, dash) {
    return path(pl(pts), 'none', { stroke: col, 'stroke-width': w || 0.9, 'stroke-dasharray': dash ? f(dash[0]) + ' ' + f(dash[1]) : null, 'stroke-linejoin': 'round' });
  }

  // fillet between a roundabout arm edge and the outer ring (arm at screen angle a, side sg = -1 anticlockwise / +1 clockwise)
  function armSide(cx, cy, R, hw, fr, a, sg) {
    var u = [Math.cos(a * D2R), Math.sin(a * D2R)], v = [-u[1], u[0]], tb = Infinity;
    if (u[0] > 1e-6) tb = Math.min(tb, (W - cx) / u[0]);
    if (u[0] < -1e-6) tb = Math.min(tb, -cx / u[0]);
    if (u[1] > 1e-6) tb = Math.min(tb, (H - cy) / u[1]);
    if (u[1] < -1e-6) tb = Math.min(tb, -cy / u[1]);
    var tf = Math.sqrt((R + fr) * (R + fr) - (hw + fr) * (hw + fr));
    var fc = [cx + sg * (hw + fr) * v[0] + tf * u[0], cy + sg * (hw + fr) * v[1] + tf * u[1]];
    return {
      fc: fc, tf: tf, tb: tb,
      te: [cx + sg * hw * v[0] + tf * u[0], cy + sg * hw * v[1] + tf * u[1]],
      tr: [cx + (fc[0] - cx) * R / (R + fr), cy + (fc[1] - cy) * R / (R + fr)],
      end: [cx + sg * hw * v[0] + tb * u[0], cy + sg * hw * v[1] + tb * u[1]]
    };
  }
  function sweep(c, p, q) { return ((p[0] - c[0]) * (q[1] - c[1]) - (p[1] - c[1]) * (q[0] - c[0])) > 0 ? 1 : 0; }
  function fil(fr, c, p, q) { return 'A' + f(fr) + ' ' + f(fr) + ' 0 0 ' + sweep(c, p, q) + ' ' + pt(q); }

  // roundabout surface with 4 arms (N, E, S, W): asphalt + kerbs
  function arr4(v) { return typeof v === 'number' ? [v, v, v, v] : v; }
  function ringSurface(cx, cy, R, hw, fr) {
    var hws = arr4(hw);
    var arms = [270, 0, 90, 180].map(function (a, i) { return { m: armSide(cx, cy, R, hws[i], fr, a, -1), p: armSide(cx, cy, R, hws[i], fr, a, 1) }; });
    var d = 'M' + pt(arms[0].m.tr), kerb = '';
    arms.forEach(function (A, i) {
      var B = arms[(i + 1) % 4];
      var ring = 'A' + f(R) + ' ' + f(R) + ' 0 0 1 ' + pt(B.m.tr);
      var out = fil(fr, A.p.fc, A.p.te, A.p.tr);
      d += fil(fr, A.m.fc, A.m.tr, A.m.te) + 'L' + pt(A.m.end) + 'L' + pt(A.p.end) + 'L' + pt(A.p.te) + out + ring;
      kerb += 'M' + pt(A.p.end) + 'L' + pt(A.p.te) + out + ring + fil(fr, B.m.fc, B.m.tr, B.m.te) + 'L' + pt(B.m.end);
    });
    return surface({ fill: d + 'Z', kerb: kerb });
  }

  // raised median along a roundabout arm (screen angle a), from distance t0 (round nose) to the border
  function armMedian(cx, cy, a, t0, wm) {
    var tb = armSide(cx, cy, 1, 0, 0, a, 1).tb, r = wm / 2;
    var d = 'M' + f(t0 + r) + ' ' + f(-r) + 'L' + f(tb) + ' ' + f(-r) + 'L' + f(tb) + ' ' + f(r) + 'L' + f(t0 + r) + ' ' + f(r) +
      'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(t0 + r) + ' ' + f(-r) + 'Z';
    return G(path(d, P.island, { stroke: P.kerb, 'stroke-width': 0.9 }), { transform: 'translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + f(a) + ')' });
  }
  // point in arm coordinates: t along the arm from the centre, l toward the arm's clockwise side
  function armPt(cx, cy, a, t, l) {
    var u = [Math.cos(a * D2R), Math.sin(a * D2R)];
    return [cx + t * u[0] - l * u[1], cy + t * u[1] + l * u[0]];
  }
  function armLine(cx, cy, a, t1, l1, t2, l2, col, w, dash) {
    var p = armPt(cx, cy, a, t1, l1), q = armPt(cx, cy, a, t2, l2);
    return mark(p[0], p[1], q[0], q[1], col, w, dash);
  }

  // car circulating anticlockwise on a ring (heading = screen angle)
  function ringCar(cx, cy, r, a, col, s) {
    return car(cx + r * Math.cos(a * D2R), cy + r * Math.sin(a * D2R), a, { color: col, s: s });
  }
  function ringPen(cx, cy, r, a) { return new Pen(cx + r * Math.cos(a * D2R), cy + r * Math.sin(a * D2R), a); }

  // central island with kerb and a planted inner ring
  function island(cx, cy, r) {
    return circ(cx, cy, r, P.island, { stroke: P.kerb, 'stroke-width': 1.4 }) + circ(cx, cy, r - 3.4, 'none', { stroke: P.islandIn, 'stroke-width': 1.3 });
  }

  // ================================================================== roundabouts
  // 4-arm roundabout. o: {cx, cy, R (outer), Ri (island), hw (arm half-width: lanes + half median; number or [N, E, S, W]),
  // wm (median width), n (lanes per direction; number or [N, E, S, W]), lw (lane width), s (scale), rl (ring lanes)}
  function roundabout(o) {
    var cx = o.cx, cy = o.cy, R = o.R, Ri = o.Ri, wm = o.wm, lw = o.lw, s = o.s, hws = arr4(o.hw), ns = arr4(o.n);
    var rl = o.rl || (Math.max.apply(null, ns) > 1 ? 2 : 1), q = ringSurface(cx, cy, R, hws, 7), dash = [3 * s, 6 * s];
    [270, 0, 90, 180].forEach(function (a, i) {
      var hw = hws[i], sd = armSide(cx, cy, R, hw, 7, a, 1);
      q += armMedian(cx, cy, a, R + 2.2, wm);
      // give-way line across the entry lanes (anticlockwise side = entry for right-hand traffic)
      q += armLine(cx, cy, a, R + 1.2, -(wm / 2 + 0.6), R + 1.2, -(hw - 0.7), P.white, 1, [1.6, 1.3]);
      for (var k = 1; k < ns[i]; k++) {
        q += armLine(cx, cy, a, sd.tf + 2, -(wm / 2 + k * lw), sd.tb, -(wm / 2 + k * lw), P.white, 0.9, dash);
        q += armLine(cx, cy, a, sd.tf + 2, wm / 2 + k * lw, sd.tb, wm / 2 + k * lw, P.white, 0.9, dash);
      }
    });
    for (var j = 1; j < rl; j++) q += circ(cx, cy, Ri + (R - Ri) * j / rl, 'none', { stroke: P.white, 'stroke-width': 0.9, 'stroke-dasharray': f(2.4 * s) + ' ' + f(4.2 * s) });
    return q + island(cx, cy, Ri);
  }

  reg('fig-roundabout-flow', 'الدوران عكس عقارب الساعة', function (o, label) {
    var s = 3.4, cx = 80, cy = 54, R = 36, Ri = 19.5, rr = 27.75;
    var q = roundabout({ cx: cx, cy: cy, R: R, Ri: Ri, hw: 14.5, wm: 3, n: 1, lw: 13, s: s });
    q += arrow(ringPen(cx, cy, rr, 231).arc(cx, cy, 177, true), P.ink, { w: 1.6, op: 0.85 });
    q += arrow(ringPen(cx, cy, rr, 126).arc(cx, cy, 46, true), P.ink, { w: 1.6, op: 0.85 });
    q += arrow(ringPen(cx, cy, rr, -7).arc(cx, cy, -84, true), P.ink, { w: 1.6, op: 0.85 });
    q += ringCar(cx, cy, rr, 150, P.blue, s) + ringCar(cx, cy, rr, 256, P.red, s) + ringCar(cx, cy, rr, 17, P.silver, s);
    q += car(88, 100.8, 0, { me: true, s: s });
    return fig(label, q);
  });

  reg('fig-roundabout-priority', 'الأولوية لمن داخل الدوار', function (o, label) {
    var s = 4.5, cx = 80, cy = -10, R = 64, Ri = 43, hw = 18, fr = 8, wm = 3, rr = 53.5;
    // visible bottom of a big ring + the south arm
    var yT = Math.sqrt(R * R - cy * cy), m = armSide(cx, cy, R, hw, fr, 90, -1), p = armSide(cx, cy, R, hw, fr, 90, 1);
    var ringR = 'A' + R + ' ' + R + ' 0 0 1 ';
    var d = 'M' + f(cx + yT) + ' 0' + ringR + pt(m.tr) + fil(fr, m.fc, m.tr, m.te) + 'L' + pt(m.end) + 'L' + pt(p.end) +
      'L' + pt(p.te) + fil(fr, p.fc, p.te, p.tr) + ringR + f(cx - yT) + ' 0Z';
    var kerb = 'M' + f(cx + yT) + ' 0' + ringR + pt(m.tr) + fil(fr, m.fc, m.tr, m.te) + 'L' + pt(m.end) +
      'M' + pt(p.end) + 'L' + pt(p.te) + fil(fr, p.fc, p.te, p.tr) + ringR + f(cx - yT) + ' 0';
    var q = surface({ fill: d, kerb: kerb });
    q += armMedian(cx, cy, 90, R + 2.2, wm);
    q += armLine(cx, cy, 90, R + 1.4, -(wm / 2 + 0.6), R + 1.4, -(hw - 0.7), P.white, 1.1, [1.9, 1.5]);
    var xi = Math.sqrt(Ri * Ri - cy * cy), xi2 = Math.sqrt((Ri - 4) * (Ri - 4) - cy * cy);
    q += path('M' + f(cx - xi) + ' 0A' + Ri + ' ' + Ri + ' 0 0 0 ' + f(cx + xi) + ' 0Z', P.island) +
      path('M' + f(cx - xi) + ' 0A' + Ri + ' ' + Ri + ' 0 0 0 ' + f(cx + xi) + ' 0', 'none', { stroke: P.kerb, 'stroke-width': 1.4 }) +
      path('M' + f(cx - xi2) + ' 0A' + (Ri - 4) + ' ' + (Ri - 4) + ' 0 0 0 ' + f(cx + xi2) + ' 0', 'none', { stroke: P.islandIn, 'stroke-width': 1.4 });
    // the ring car comes from our left and passes in front of us
    q += arrow(ringPen(cx, cy, rr, 105).arc(cx, cy, 63, true), P.ok, { w: 2.2 });
    q += ringCar(cx, cy, rr, 117, P.blue, s);
    q += car(89.25, 69, 0, { me: true, s: s, brake: true });
    q += tag('انتظر', 127, 72, { col: P.gold, size: 10 });
    return fig(label, q);
  });

  // 2-lane roundabout used by the lane-choice figures
  var RB2 = { s: 2.8, cx: 80, cy: 54, R: 40, Ri: 18, hw: 21.5, wm: 3, lw: 10 };
  function roundabout2() { return roundabout({ cx: RB2.cx, cy: RB2.cy, R: RB2.R, Ri: RB2.Ri, hw: RB2.hw, wm: RB2.wm, n: 2, lw: RB2.lw, s: RB2.s }); }

  reg('fig-roundabout-right', 'المخرج الأول: المسار الأيمن وإشارة اليمين', function (o, label) {
    var q = roundabout2(), s = RB2.s;
    var x1 = 80 + 1.5 + 15; // lane 1 of the south arm
    var pen = new Pen(x1, 95.5, 0).L(x1, 90).arc(x1 + 19, 90, 270, false).L(146, 71);
    q += arrow(pen, P.gold, { dash: true, w: 2 });
    q += car(x1, 102.5, 0, { me: true, s: s, ind: 'R' });
    return fig(label, q);
  });

  // amber "signal right" mark on a ring route at screen angle a (the car's right = outward), with a leader to a label
  function signalMark(x, y, a) {
    var ox = Math.cos(a * D2R), oy = Math.sin(a * D2R), q = '';
    q += circ(x, y, 3.4, P.pill, { opacity: 0.8 }) + circ(x, y, 2.2, P.amber, { stroke: '#FFC24A', 'stroke-width': 0.6 });
    [-42, 0, 42].forEach(function (d) {
      var b = Math.atan2(oy, ox) + d * D2R, c = Math.cos(b), sn = Math.sin(b);
      q += line(x + c * 4.2, y + sn * 4.2, x + c * 6.6, y + sn * 6.6, P.amber, 1.1, ROUND);
    });
    return q;
  }

  reg('fig-roundabout-left', 'لليسار أو الالتفاف: المسار الأيسر', function (o, label) {
    var q = roundabout2(), s = RB2.s, cx = RB2.cx, cy = RB2.cy, ri = 23.5;
    var x2 = 80 + 1.5 + 5; // lane 2 (left lane) of the south arm
    var a0 = 42, a1 = 213, p1 = [cx + ri * Math.cos(a0 * D2R), cy + ri * Math.sin(a0 * D2R)];
    var pen = new Pen(x2, 95.5, 0).L(x2, 88).to(p1[0], p1[1], a0, 6, 6).arc(cx, cy, a1 - 360, true).to(40, 47, 270, 6, 8).L(12, 47);
    q += arrow(pen, P.gold, { dash: true, w: 2 });
    // signal right just after passing the north exit
    var am = 250, mk = [cx + ri * Math.cos(am * D2R), cy + ri * Math.sin(am * D2R)];
    q += line(mk[0] - 3, mk[1] - 4, 52, 16, P.amber, 0.8, { 'stroke-dasharray': '1.6 1.4', opacity: 0.9 });
    q += signalMark(mk[0], mk[1], am);
    q += tag('إشارة يمين', 30, 14, { col: P.amber, size: 8, pad: 0.9 });
    q += car(x2, 102.5, 0, { me: true, s: s });
    return fig(label, q);
  });

  // ================================================================== junctions
  // crossroads: vertical road x0..x1, horizontal road y0..y1, kerb radius r; arms {n, e, s, w}
  function crossroads(x0, x1, y0, y1, r, arms) {
    arms = arms || { n: 1, e: 1, s: 1, w: 1 };
    var p = [];
    if (arms.n) p.push([x0, 0]);
    if (arms.w) p.push([x0, y0, arms.n ? r : 0], [0, y0], [0, y1], [x0, y1, arms.s ? r : 0]);
    if (arms.s) p.push([x0, H], [x1, H]);
    if (arms.e) p.push([x1, y1, arms.s ? r : 0], [W, y1], [W, y0], [x1, y0, arms.n ? r : 0]);
    if (arms.n) p.push([x1, 0]);
    return surface(outline(p));
  }

  reg('fig-unmarked-left', 'تقاطع بلا تنظيم: الأولوية للقادم من اليسار', function (o, label) {
    var s = 4.3, q = crossroads(64, 96, 31, 63, 10);
    q += arrow(new Pen(88, 67, 0).L(88, 14), P.grey, { dash: true, w: 1.9 });
    q += arrow(new Pen(59.5, 55, 90).L(121, 55), P.ok, { w: 2.2 });
    q += car(49.6, 55, 90, { color: P.blue, s: s });
    q += car(88, 78.3, 0, { me: true, s: s, brake: true });
    q += tag('أولا', 40, 76, { col: P.ok, size: 9.5 });
    q += tag('انتظر', 123, 81, { col: P.gold, size: 9.5 });
    return fig(label, q);
  });

  // two lanes each way, double yellow centre lines, broken white lane lines
  function bigCross(cx, cy, lw, r) {
    var hwr = 2 * lw, x0 = cx - hwr, x1 = cx + hwr, y0 = cy - hwr, y1 = cy + hwr, dash = [lw * 0.85, lw * 1.7], q = crossroads(x0, x1, y0, y1, r || 8);
    q += dbl(cx, 0, cx, y0 - 2, P.yellow) + dbl(cx, y1 + 2, cx, H, P.yellow) + dbl(0, cy, x0 - 2, cy, P.yellow) + dbl(x1 + 2, cy, W, cy, P.yellow);
    q += mark(cx - lw, 0, cx - lw, y0 - 2, P.white, 0.9, dash, 3) + mark(cx + lw, 0, cx + lw, y0 - 2, P.white, 0.9, dash, 3);
    q += mark(cx - lw, H, cx - lw, y1 + 2, P.white, 0.9, dash, 3) + mark(cx + lw, H, cx + lw, y1 + 2, P.white, 0.9, dash, 3);
    q += mark(0, cy - lw, x0 - 2, cy - lw, P.white, 0.9, dash, 3) + mark(0, cy + lw, x0 - 2, cy + lw, P.white, 0.9, dash, 3);
    q += mark(W, cy - lw, x1 + 2, cy - lw, P.white, 0.9, dash, 3) + mark(W, cy + lw, x1 + 2, cy + lw, P.white, 0.9, dash, 3);
    return q;
  }

  reg('fig-turn-left', 'الانعطاف يسارا من أقصى اليسار', function (o, label) {
    var s = 3.1, cx = 80, cy = 54, lw = 12, q = bigCross(cx, cy, lw), R = 28;
    var xs = cx + lw / 2, ye = cy - lw / 2;
    // oncoming car goes straight first
    q += arrow(new Pen(cx - lw / 2, 22.5, 180).L(cx - lw / 2, 76), P.ok, { w: 2.2 });
    q += car(cx - lw / 2, 13, 180, { color: P.red, s: s });
    // our left turn passes just left of the junction centre and ends in the left lane of the west arm
    q += arrow(new Pen(xs, 82, 0).L(xs, ye + R).arc(xs - R, ye + R, 270, true).L(15, ye), P.gold, { dash: true, w: 2 });
    q += car(xs, 90, 0, { me: true, s: s, ind: 'L' });
    q += tag('أولا', 50, 13, { col: P.ok, size: 9.5 });
    return fig(label, q);
  });

  reg('fig-turn-right', 'الانعطاف يمينا من أقصى اليمين', function (o, label) {
    // zoom on the south-east corner of the crossroads
    var s = 4, cx = 48, cy = 40, lw = 14, r = 10, q = bigCross(cx, cy, lw, r);
    var xs = cx + 1.5 * lw, ye = cy + 1.5 * lw, x1 = cx + 2 * lw, y1 = cy + 2 * lw, rt = r + lw / 2;
    q += arrow(new Pen(xs, y1 + r + 2.5, 0).L(xs, y1 + r).arc(x1 + r, y1 + r, 270, false).L(146, ye), P.gold, { dash: true, w: 2.1 });
    q += car(xs, y1 + r + 1 + 9.7, 0, { me: true, s: s, ind: 'R' });
    return fig(label, q);
  });

  reg('fig-uturn', 'الالتفاف للخلف من المسار الأيسر', function (o, label) {
    var s = 4.1, lw = 15, mw = 9, cx = 80, x0 = cx - mw / 2 - 2 * lw, x1 = cx + mw / 2 + 2 * lw, oy0 = 38, oy1 = 71, r = mw / 2;
    var q = surface(outline([[x0, 0], [x0, H], [x1, H], [x1, 0]]));
    var dash = [3 * s, 5 * s];
    q += mark(x0 + lw, 0, x0 + lw, H, P.white, 0.9, dash) + mark(x1 - lw, 0, x1 - lw, H, P.white, 0.9, dash);
    // yellow edge lines along the median, broken at the opening
    [cx - r - 1.3, cx + r + 1.3].forEach(function (x) { q += mark(x, 0, x, oy0 - 1, P.yellow, 0.9) + mark(x, oy1 + 1, x, H, P.yellow, 0.9); });
    // raised median with an opening
    var top = 'M' + f(cx - r) + ' 0L' + f(cx - r) + ' ' + f(oy0 - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + f(cx + r) + ' ' + f(oy0 - r) + 'L' + f(cx + r) + ' 0';
    var bot = 'M' + f(cx - r) + ' ' + H + 'L' + f(cx - r) + ' ' + f(oy1 + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f(cx + r) + ' ' + f(oy1 + r) + 'L' + f(cx + r) + ' ' + H;
    q += path(top + 'Z', P.island) + path(top, 'none', { stroke: P.kerb, 'stroke-width': 1.3 }) +
      path(bot + 'Z', P.island) + path(bot, 'none', { stroke: P.kerb, 'stroke-width': 1.3 });
    var xu = cx + r + lw / 2, xd = cx - r - lw / 2, cyU = 58, ru = (xu - xd) / 2;
    // the car coming down has priority
    q += arrow(new Pen(xd, 24, 180).L(xd, 31), P.ok, { w: 2.2 });
    q += car(xd, 13.2, 180, { color: P.blue, s: s });
    // our U-turn: left lane, through the opening, give way, then into the left lane of the other side
    q += arrow(new Pen(xu, 72, 0).L(xu, cyU).arc(cx, cyU, 180, true).L(xd, 106), P.gold, { dash: true, w: 2.1 });
    q += waitBar(cx, cyU - ru, -1, 0, 9);
    q += car(xu, 82, 0, { me: true, s: s, ind: 'L' });
    q += tag('أولا', xd - 26, 14, { col: P.ok, size: 9.5 });
    return fig(label, q);
  });

  // ================================================================== straight roads and highways (sand)
  // one-way carriageway moving up: median barrier left of x0, n lanes of lw, paved shoulder sh on the right
  function carriageway(x0, lw, n, sh, s, noRightEdge) {
    var x1 = x0 + n * lw, q = '', dash = [3 * s, 6 * s];
    q += rect(x0 - 4.5, 0, x1 - x0 + 4.5, H, P.asph);
    if (sh) q += rect(x1, 0, sh, H, P.asphD);
    q += rect(x0 - 4.5, 0, 3.2, H, P.barrier) + mark(x0 - 2.9, 0, x0 - 2.9, H, '#8A929E', 0.6);
    q += mark(x0 + 0.9, 0, x0 + 0.9, H, P.yellow, 0.9);
    for (var i = 1; i < n; i++) q += mark(x0 + i * lw, 0, x0 + i * lw, H, P.white, 0.9, dash, 2);
    if (!noRightEdge) q += mark(x1 - 0.3, 0, x1 - 0.3, H, P.white, 0.9);
    return q;
  }

  reg('fig-overtake-left', 'التجاوز من اليسار فقط', function (o, label) {
    var s = 3.6, lw = 16, x0 = 56, q = carriageway(x0, lw, 2, 13, s), xl = x0 + lw / 2, xr = x0 + 1.5 * lw, xs = x0 + 2 * lw + 6.5;
    q += truck(xr, 64, 0, { s: s, len: 8, color: '#C0453A' });
    // wrong: passing on the right (hard shoulder)
    q += arrow(new Pen(xr + 3, 94, 0).to(xs, 80, 0, 6, 6).L(xs, 46), P.bad, { dash: true, w: 1.9, op: 0.8 });
    q += redX(xs, 63);
    // right: out to the left lane, past the truck, back well ahead of it
    q += arrow(new Pen(xr, 94, 0).to(xl, 80, 0, 7, 7).L(xl, 42).to(xr, 20, 0, 9, 9), P.gold, { dash: true, w: 2.1 });
    q += car(xr, 103.5, 0, { me: true, s: s, ind: 'L' });
    return fig(label, q, true);
  });

  reg('fig-keep-right', 'الزم اليمين واترك اليسار للتجاوز', function (o, label) {
    var s = 3.5, lw = 15, x0 = 55, q = carriageway(x0, lw, 3, 11, s), xl = x0 + lw / 2, xm = x0 + 1.5 * lw, xr = x0 + 2.5 * lw;
    q += arrow(new Pen(xr, 26.5, 0).L(xr, 16), P.grey, { w: 1.7 });
    q += arrow(new Pen(xm, 60, 0).L(xm, 49.5), P.grey, { w: 1.7 });
    q += arrow(new Pen(xl, 43, 0).to(xm, 19, 0, 7, 7), P.ok, { w: 2.1 });
    q += arrow(new Pen(xr, 92, 0).L(xr, 81.5), P.gold, { w: 1.9 });
    q += car(xr, 35, 0, { color: P.silver, s: s }) + car(xm, 68.5, 0, { color: P.blue, s: s }) + car(xl, 51.5, 0, { color: P.red, s: s });
    q += car(xr, 100.5, 0, { me: true, s: s });
    return fig(label, q, true);
  });

  reg('fig-two-second', 'قاعدة الثانيتين', function (o, label) {
    var s = 4, lw = 18, x0 = 44, cxl = x0 + lw, x1 = cxl + lw, xc = cxl + lw / 2, q = '';
    q += surface(outline([[x0, 0], [x0, H], [x1, H], [x1, 0]]));
    q += mark(cxl, 0, cxl, H, P.yellow, 0.9, [3 * s, 6 * s], 4);
    var yA = 25, yB = 95, ym = (yA + yB) / 2; // rear of the car ahead (level with the post), front of our car
    // street lamp on the right pavement, level with the rear of the car ahead, and its reference line
    var px = x1 + 6;
    q += mark(cxl + 1, yA, px, yA, P.ink, 0.8, [1.5, 1.5]);
    q += line(px, yA, x1 + 1.2, yA, '#9AA3AE', 1.4, ROUND) + rect(x1 - 0.8, yA - 1.3, 3.4, 2.6, P.head, { rx: 1.1, stroke: P.pill, 'stroke-width': 0.4 }) +
      circ(px, yA, 2.5, '#B8BEC8', { stroke: P.pill, 'stroke-width': 0.7 });
    q += car(xc, yA - 9.2, 0, { color: P.blue, s: s });
    q += car(xc, yB + 9.2, 0, { me: true, s: s });
    // two-second bracket in the gap, ticks 1 and 2
    q += dim(xc, yB - 1, xc, yA + 1, null, { tick: 3.4 });
    q += line(xc - 3.4, ym, xc + 3.4, ym, P.gold, 1.2, ROUND);
    q += txt('1', xc - 6.8, ym, 9, P.gold) + txt('2', xc - 6.8, yA + 5.5, 9, P.gold);
    q += tag('ثانيتان', x1 + 29, ym, { col: P.gold, size: 10.5 });
    return fig(label, q);
  });

  reg('fig-bike-gap', 'متر على الأقل عند تجاوز الدراجة', function (o, label) {
    var s = 8, lw = 28, x0 = 44, cxl = x0 + lw, x1 = cxl + lw, k = 1.45, q = '';
    q += surface(outline([[x0, 0], [x0, H], [x1, H], [x1, 0]]));
    q += mark(cxl, 0, cxl, H, P.yellow, 1.1, [3 * s, 4 * s], 14);
    // cyclist near the right kerb; our car passes it across the broken centre line, leaving at least 1 m
    var hb = 0.31 * k * s, xb = x1 - 0.5 * s - hb, gap = 9, hwc = 0.975 * s, xcar = xb - hb - gap - hwc, yb = 66, ycar = 52 + 2.3 * s;
    q += cyclist(xb, yb, 0, { s: s, k: k });
    q += car(xcar, ycar, 0, { me: true, s: s });
    var yd = yb - 0.16 * k * s, xa = xcar + hwc, xz = xb - hb, lx = (xa + xz) / 2;
    q += dim(xa + 0.2, yd, xz - 0.2, yd, null, { tick: 2.6 });
    q += line(lx, 47.6, lx, yd - 3.4, P.gold, 0.8, { 'stroke-dasharray': '1.5 1.3' });
    q += tag('1 م', lx, 40, { col: P.gold, size: 10.5, pad: 0.8 });
    return fig(label, q);
  });

  reg('fig-blind-spots', 'النقطة العمياء', function (o, label) {
    var s = 5, lw = 19, x0 = 40, q = carriageway(x0, lw, 2, 16, s), xr = x0 + 1.5 * lw, xl = x0 + lw / 2, cy = 32;
    var hw = 0.975 * s, hl = 2.3 * s, mY = cy - 0.8 * s, mxL = xr - hw - 0.4, mxR = xr + hw + 0.4, a1 = 4, a2 = 20, len = 52;
    function ray(x, y, deg, l, sx) { return [x + sx * Math.sin(deg * D2R) * l, y + Math.cos(deg * D2R) * l]; }
    // what the mirrors show (green): both side mirrors and the interior mirror
    q += zone([[mxL, mY], ray(mxL, mY, a1, len, -1), ray(mxL, mY, a2, len, -1)], P.ok, 0.15, 0.4);
    q += zone([[mxR, mY], ray(mxR, mY, a1, len, 1), ray(mxR, mY, a2, len, 1)], P.ok, 0.15, 0.4);
    q += zone([[xr, cy - 0.9 * s], ray(xr, cy - 0.9 * s, 7, len + 6, -1), ray(xr, cy - 0.9 * s, 7, len + 6, 1)], P.ok, 0.15, 0.4);
    // blind spots (red): beside and just behind the rear quarters, outside the mirror views
    var yP = cy - 0.1 * s, kk = Math.tan(a2 * D2R), wl = lw - 1.5, yE = cy + hl + 4.4 * s;
    [-1, 1].forEach(function (sx) {
      var mx = sx < 0 ? mxL : mxR, far = xr + sx * (hw + wl);
      q += zone([[mx + sx * (yP - mY) * kk, yP], [far, yP], [far, yE], [mx + sx * (yE - mY) * kk, yE]], P.x, 0.4, 0.95);
    });
    q += car(xl, cy + 25, 0, { color: P.blue, s: s });
    q += car(xr, cy, 0, { me: true, s: s, driver: true });
    // head check: the driver (left seat) looks back over the left shoulder
    var hx = xr - 0.38 * s, hy = cy - 0.12 * s, rh = 7;
    q += arrow(new Pen(hx + rh * Math.cos(292 * D2R), hy + rh * Math.sin(292 * D2R), 270).arc(hx, hy, 203, true), P.gold, { w: 1.7 });
    q += tag('التفت', xl - 3, 12, { col: P.gold, size: 9.5 });
    return fig(label, q, true);
  });

  reg('fig-truck-blind', 'مناطق الشاحنة العمياء', function (o, label) {
    var s = 3.5, lw = 14, x0 = 57, q = carriageway(x0, lw, 3, 12, s), xm = x0 + 1.5 * lw, xr = x0 + 2.5 * lw;
    var L = 15 * s, hw = 1.25 * s, yc = 60, top = yc - L / 2, bot = yc + L / 2, sh = x0 + 3 * lw + 12;
    function rz(pts) { return path(outline(pts).fill, P.x, { 'fill-opacity': 0.32, stroke: P.x, 'stroke-opacity': 0.9, 'stroke-width': 0.8 }); }
    // directly in front of the cab, the whole right side (largest), the left side near the cab, behind the trailer
    q += rz([[xm - hw - 1, top - 1.3, 2], [xm + hw + 2, top - 1.3, 2], [xm + hw + 3, top - 13, 2.5], [xm - hw - 1.5, top - 13, 2.5]]);
    q += rz([[xm + hw + 1, top + 1, 2], [xm + hw + 12, top + 1, 3], [sh - 1.5, bot, 3], [xm + hw + 1, bot, 2]]);
    q += rz([[xm - hw - 1, top + 5, 1.5], [xm - hw - 9, top + 7.5, 2.5], [xm - hw - 10.5, top + 23, 2.5], [xm - hw - 1, top + 23, 1.5]]);
    q += rz([[xm - hw - 0.5, bot + 1.3, 1.5], [xm + hw + 0.5, bot + 1.3, 1.5], [xm + hw + 3.5, H - 1.5, 2.5], [xm - hw - 3.5, H - 1.5, 2.5]]);
    q += truck(xm, yc, 0, { s: s, len: 15, color: '#3F6FB5' });
    q += car(xr, yc + 3, 0, { me: true, s: s });
    return fig(label, q, true);
  });

  reg('fig-parking-15m', 'لا وقوف على بعد أقل من 15 مترا من التقاطع', function (o, label) {
    var s = 3.4, yj = 26, x0 = 34, lw = 15, pk = 9, xpk = x0 + 2 * lw, x1 = xpk + pk, m15 = 15 * s, yz = yj + m15, q = '';
    q += surface(outline([[0, 0, 10], [W, 0, 10], [W, yj], [x1, yj, 8], [x1, H], [x0, H], [x0, yj, 8], [0, yj]]));
    q += mark(0, yj / 2, W, yj / 2, P.yellow, 0.9, [3 * s, 6 * s], 4);
    q += mark(x0 + lw, yj + 3, x0 + lw, H, P.yellow, 0.9, [3 * s, 6 * s]);
    q += mark(xpk, yz, xpk, H, P.white, 0.8, [1.5 * s, 1.5 * s]);
    // no-parking zone: 15 m from the junction along the right kerb
    q += rect(xpk + 0.4, yj + 0.6, pk - 1.1, m15 - 0.6, P.signRed, { opacity: 0.32 }) + mark(xpk, yj + 1, xpk, yz, P.signRed, 0.9);
    q += mark(xpk + 0.4, yz, x1 - 0.6, yz, P.signRed, 1.2);
    q += path('M' + f(x1) + ' ' + f(yj + 8) + 'L' + f(x1) + ' ' + f(yz), 'none', { stroke: P.signRed, 'stroke-width': 2.8 });
    // parked cars stop before the zone
    var xp = xpk + pk / 2;
    q += car(xp, yz + 2.5 + 7.82, 0, { me: true, s: s }) + car(xp, yz + 2.5 + 7.82 + 18.4, 0, { color: P.dark, s: s });
    // measure and sign on the pavement
    var xd = x1 + 7;
    q += dim(xd, yj, xd, yz, null);
    q += tag('15 م', xd + 21, yj + m15 / 2, { col: P.gold, size: 10.5 });
    var sx = x1 + 58, sy = yj + 18;
    q += line(sx, sy + 7.5, sx, sy + 13, '#8A929E', 1.5, ROUND) + circ(sx, sy + 13.5, 1.4, '#6B737F') +
      circ(sx, sy, 7.2, P.white) + circ(sx, sy, 6.5, P.signRed) + circ(sx, sy, 4.6, P.signBlue) +
      line(sx - 3.25, sy - 3.25, sx + 3.25, sy + 3.25, P.signRed, 1.7);
    return fig(label, q);
  });

  // highway, 3 lanes moving up; lane 3 from x0, lane 1 ends at xe = x0 + 3 lw; right side drawn by each figure
  var HW = { s: 3.3, lw: 13, x0: 36 };
  function highway() {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, xe = x0 + 3 * lw, dash = [3 * s, 6 * s], q = '';
    q += rect(x0 - 4.5, 0, xe - x0 + 4.5, H, P.asph);
    q += rect(x0 - 4.5, 0, 3.2, H, P.barrier) + mark(x0 - 2.9, 0, x0 - 2.9, H, '#8A929E', 0.6);
    q += mark(x0 + 0.9, 0, x0 + 0.9, H, P.yellow, 0.9);
    q += mark(x0 + lw, 0, x0 + lw, H, P.white, 0.9, dash, 2) + mark(x0 + 2 * lw, 0, x0 + 2 * lw, H, P.white, 0.9, dash, 2);
    return q;
  }
  // gore chevrons pointing in the direction of travel (apex up), between x = xl and the curve edge (x as a function of y)
  function chevrons(xl, edge, yBot, yTop, step) {
    var q = '', k = Math.SQRT1_2;
    for (var ya = yBot - step * 0.7; ya > yTop; ya -= step) {
      var xr = xAt(edge, ya);
      if (xr == null) continue;
      var x0 = xl + 1, x1 = xr - 1;
      if (x1 - x0 < 3.5) continue;
      var ax = (x0 + x1) / 2, Lp = [x0, ya + (ax - x0)], Rp = null;
      for (var t = 0; t < 90; t += 0.2) {
        var px = ax + t * k, py = ya + t * k, ex = xAt(edge, py);
        if (ex == null || py > yBot || px >= ex - 1) { Rp = [px, py]; break; }
      }
      if (!Rp) continue;
      if (Lp[1] > yBot) Lp = [ax - (yBot - ya), yBot];
      q += path('M' + pt(Lp) + 'L' + f(ax) + ' ' + f(ya) + 'L' + pt(Rp), 'none', { stroke: P.white, 'stroke-width': 1.3, 'stroke-linejoin': 'miter' });
    }
    return q;
  }

  reg('fig-highway-merge', 'الدخول إلى الطريق السريع', function (o, label) {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, xe = x0 + 3 * lw, xa = xe + lw, yN = 84, yT0 = 44, yT1 = 12;
    // on-ramp from the bottom right, joining a parallel acceleration lane that tapers away
    var ramp = [[xa + 44, 128], [xa + 22, 108], [xe + lw / 2, 100], [xe + lw / 2, yN]];
    var eL = bzSide(ramp, 16, -lw / 2), eR = bzSide(ramp, 16, lw / 2);
    var q = highway();
    q += path(pl(clampPts(eL.concat(eR.slice().reverse()))) + 'Z', P.asph);
    q += path('M' + f(xe) + ' ' + f(yN + 0.6) + 'L' + f(xe) + ' ' + f(yT1) + 'L' + f(xa) + ' ' + f(yT0) + 'L' + f(xa) + ' ' + f(yN + 0.6) + 'Z', P.asph);
    // lines: lane 1 edge below the nose, merge line, taper edge, ramp edges
    q += mark(xe, yN, xe, H, P.white, 0.9) + mark(xe, 0, xe, yT1, P.white, 0.9);
    q += mark(xe, yT1 + 4, xe, yN, P.white, 1.4, [2 * s, 1.6 * s]);
    q += stroke([[xe, yT1], [xa - 0.3, yT0]].concat(clampPts(bzSide(ramp, 16, lw / 2 - 0.3)).reverse()), P.white, 0.9);
    q += stroke(clampPts(bzSide(ramp, 16, -lw / 2 + 0.3)), P.white, 0.9);
    // cars on lane 1 with a gap, other lanes
    var x1c = xe - lw / 2, xac = xa - lw / 2;
    q += car(x1c, 9, 0, { color: P.silver, s: s }) + car(x1c, 104, 0, { color: P.red, s: s }) +
      car(x0 + 1.5 * lw, 56, 0, { color: P.dark, s: s }) + car(x0 + lw / 2, 92, 0, { color: P.green, s: s });
    q += arrow(new Pen(xac, 51, 0).to(x1c, 31, 0, 7, 7), P.gold, { dash: true, w: 2.1 });
    q += car(xac, 60, 0, { me: true, s: s, ind: 'L' });
    return fig(label, q, true);
  });

  reg('fig-highway-exit', 'الخروج من الطريق السريع', function (o, label) {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, xe = x0 + 3 * lw, xa = xe + lw, yO0 = 112, yO1 = 92, yG = 62;
    // deceleration lane (taper from the bottom), then the exit ramp veering right to the top edge
    var ramp = [[xe + lw / 2, yG], [xe + lw / 2, 38], [xa + 12, 16], [xa + 40, -6]];
    var eL = bzSide(ramp, 16, -lw / 2), eR = bzSide(ramp, 16, lw / 2);
    var q = highway();
    q += path('M' + f(xe) + ' ' + f(yO0) + 'L' + f(xa) + ' ' + f(yO1) + 'L' + f(xa) + ' ' + f(yG - 0.6) + 'L' + f(xe) + ' ' + f(yG - 0.6) + 'Z', P.asph);
    q += path(pl(clampPts(eL.concat(eR.slice().reverse()))) + 'Z', P.asph);
    // painted gore between lane 1 and the ramp, chevrons pointing in the direction of travel
    q += path(pl([[xe, yG]].concat(clampPts(eL).slice(1), [[xe, 0]])) + 'Z', P.asph);
    q += chevrons(xe, eL, yG, 2, 8);
    q += mark(xe, yO0, xe, H, P.white, 0.9) + mark(xe, 0, xe, yG, P.white, 0.9);
    q += mark(xe, yG, xe, yO0 - 2, P.white, 1.4, [2 * s, 1.6 * s]);
    q += stroke([[xe, yO0], [xa - 0.3, yO1]].concat(clampPts(bzSide(ramp, 16, lw / 2 - 0.3))), P.white, 0.9);
    q += stroke(clampPts(bzSide(ramp, 16, -lw / 2 + 0.3)), P.white, 0.9);
    var x1c = xe - lw / 2, xac = xa - lw / 2;
    q += car(x0 + 1.5 * lw, 42, 0, { color: P.blue, s: s }) + car(x0 + lw / 2, 80, 0, { color: P.silver, s: s });
    q += arrow(new Pen(x1c, 94, 0).to(xac, 76, 0, 7, 7).L(xac, yG).bz(bzCut(ramp, 0.72)), P.gold, { dash: true, w: 2.1 });
    q += car(x1c, 103, 0, { me: true, s: s, ind: 'R' });
    return fig(label, q, true);
  });

  reg('fig-missed-exit', 'فاتك المخرج؟ كمل للمخرج التالي', function (o, label) {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, xe = x0 + 3 * lw, yCut = 72;
    // the exit ramp left at the bottom: gore nose at the bottom edge, ramp going up to the right
    var ramp = [[xe + lw / 2, H], [xe + lw / 2, 96], [xe + 21, 66], [xe + 59, -8]];
    var eL = bzSide(ramp, 20, -lw / 2), eR = bzSide(ramp, 20, lw / 2);
    var q = highway();
    q += path(pl(clampPts(eL.concat(eR.slice().reverse()))) + 'Z', P.asph);
    // painted gore near the nose (chevrons), then a rounded sand nose
    var xg = xAt(eL, yCut), gr = (xg - xe) / 2;
    q += path('M' + f(xe) + ' ' + H + 'L' + f(xe) + ' ' + f(yCut) + 'A' + f(gr) + ' ' + f(gr) + ' 0 0 0 ' + f(xg) + ' ' + f(yCut) +
      pl(eL.filter(function (p2) { return p2[1] > yCut; }).reverse()).replace('M', 'L') + 'Z', P.asph);
    q += chevrons(xe, eL, H, yCut + gr + 1, 7);
    q += mark(xe, 0, xe, H, P.white, 0.9);
    q += stroke(clampPts(bzSide(ramp, 20, -lw / 2 + 0.3)), P.white, 0.9) + stroke(clampPts(bzSide(ramp, 20, lw / 2 - 0.3)), P.white, 0.9);
    var x1c = xe - lw / 2, yc = 60, tgt = bz(ramp, 0.74);
    // wrong: cutting across the gore, or reversing back to the ramp
    q += arrow(new Pen(x1c + 2.5, yc - 8.5, 25).to(tgt[0], tgt[1], 28, 9, 9), P.bad, { dash: true, w: 1.9 });
    q += redX(xe + 12, 47.5);
    q += arrow(new Pen(x1c, yc + 9, 180).L(x1c, 98).to(xe + 7, 107, 140, 5, 4), P.bad, { dash: true, w: 1.9 });
    q += redX(x1c, 88);
    // right: carry on to the next exit
    q += arrow(new Pen(x1c, yc - 9, 0).L(x1c, 12), P.ok, { w: 2.3 });
    q += car(x0 + 1.5 * lw, 26, 0, { color: P.silver, s: s }) + car(x0 + lw / 2, 88, 0, { color: P.blue, s: s });
    q += car(x1c, yc, 0, { me: true, s: s });
    return fig(label, q, true);
  });

  // ================================================================== pedestrians when turning
  reg('fig-turn-pedestrians', 'عند الانعطاف: المشاة أولا', function (o, label) {
    var s = 5.2, lw = 19, cxv = 44, cyh = 36, r = 11, q = crossroads(cxv - lw, cxv + lw, cyh - lw, cyh + lw, r);
    var dash = [3 * s, 6 * s];
    q += mark(cxv, cyh + lw + 2, cxv, H, P.yellow, 0.9, dash) + mark(cxv, 0, cxv, cyh - lw - 2, P.yellow, 0.9, dash);
    q += mark(0, cyh, cxv - lw - 2, cyh, P.yellow, 0.9, dash) + mark(W, cyh, cxv + lw + r + 22, cyh, P.yellow, 0.9, dash);
    // zebra across the east arm, just past the corner, with two pedestrians crossing
    var zx = cxv + lw + r + 3, zw = 16;
    for (var y = cyh - lw + 1.6; y < cyh + lw - 1.5; y += 5.2) q += rect(zx, y, zw, 2.6, P.white);
    var pa = zx + zw / 2 - 3.4, pb = zx + zw / 2 + 3.6;
    q += arrow(new Pen(pa, cyh - 6.5, 180).L(pa, cyh - 2.5), P.grey, { w: 1.2 }) + arrow(new Pen(pb, cyh + 7.5, 0).L(pb, cyh + 3.5), P.grey, { w: 1.2 });
    q += ped(pa, cyh - 12.5, 180, { s: s, k: 2.5, color: '#E2A65C' }) + ped(pb, cyh + 13.5, 0, { s: s, k: 2.5, color: '#4A8FD8' });
    // our right turn stops at the wait bar before the crossing
    var xs = cxv + lw / 2, ye = cyh + lw / 2, xw = zx - 3, y1 = cyh + lw, rt = 12;
    q += arrow(new Pen(xs, y1 + 5, 0).L(xs, ye + rt).arc(xs + rt, ye + rt, 270, false).L(xw - 6.5, ye), P.gold, { dash: true, w: 2.1 });
    q += waitBar(xw, ye, 1, 0, 13);
    q += car(xs, y1 + 5.8 + 12, 0, { me: true, s: s, ind: 'R' });
    return fig(label, q);
  });

  // ================================================================== more road users and marks (second batch)
  // our car as an outline ghost (one position of a sequence); o.final = the goal position (firmer)
  function ghostCar(x, y, h, o) {
    o = o || {};
    var s = o.s || S0, L = 4.6 * s, Wd = 1.95 * s, hl = L / 2, hw = Wd / 2, q = '';
    function m(v) { return v * s; }
    q += rect(-hw, -hl, Wd, L, P.me, { rx: m(0.55), 'fill-opacity': o.final ? 0.42 : 0.2, stroke: P.gold, 'stroke-width': Math.max(0.8, m(0.2)),
      'stroke-dasharray': o.final ? null : f(m(0.5)) + ' ' + f(m(0.32)) });
    q += poly([[m(-0.8), m(-1.2)], [m(0.8), m(-1.2)], [m(0.66), m(-0.45)], [m(-0.66), m(-0.45)]], P.glass, { opacity: 0.55 });
    q += poly([[m(-0.68), m(1.05)], [m(0.68), m(1.05)], [m(0.78), m(1.6)], [m(-0.78), m(1.6)]], P.glass, { opacity: 0.55 });
    return G(q, { transform: tr(x, y, h) });
  }

  // green check in a round badge
  function okMark(x, y, r) {
    r = r || 5;
    return circ(x, y, r + 0.9, P.pill, { opacity: 0.8 }) + circ(x, y, r, P.ok) +
      path('M' + f(x - r * 0.5) + ' ' + f(y + r * 0.02) + 'L' + f(x - r * 0.13) + ' ' + f(y + r * 0.4) + 'L' + f(x + r * 0.5) + ' ' + f(y - r * 0.36), 'none',
        { stroke: P.pill, 'stroke-width': r * 0.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  }

  // yard kerb: black and white blocks along a vertical line (band centred on x)
  function kerbBW(x, y0, y1, w, step) {
    step = step || 5;
    var q = rect(x - w / 2, y0, w, y1 - y0, '#E6E6E1');
    for (var y = y0; y < y1 - 0.01; y += 2 * step) q += rect(x - w / 2, y, w, Math.min(step, y1 - y), '#1E2228');
    return q;
  }
  // yard pole seen from above
  function pole(x, y, r) {
    r = r || 1.8;
    return circ(x, y, r + 0.7, P.pill, { opacity: 0.55 }) + circ(x, y, r, '#F2C230') + circ(x, y, r * 0.45, '#1B2230');
  }
  // small red contact mark (hit, damage)
  function hitMark(x, y, r) {
    r = r || 3;
    var pts = [];
    for (var k = 0; k < 16; k++) { var a = k * Math.PI / 8, rr = k % 2 ? r * 0.45 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
    return poly(pts, '#FFB21E', { stroke: P.x, 'stroke-width': 0.7, 'stroke-linejoin': 'round' });
  }
  function octagon(x, y, r) {
    var pts = [];
    for (var k = 0; k < 8; k++) { var a = (22.5 + 45 * k) * D2R; pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
    return pts;
  }

  // school bus 10.6 x 2.5 m, yellow, black side stripes. o: {s, stopArm, flash}
  function schoolBus(x, y, h, o) {
    o = o || {};
    var s = o.s || S0, L = 10.6 * s, Wd = 2.5 * s, hl = L / 2, hw = Wd / 2, yel = '#F2C230', q = '';
    function m(v) { return v * s; }
    q += rect(-hw, -hl, Wd, L, yel, { rx: m(0.4), stroke: shade(yel, -0.5), 'stroke-width': Math.max(0.4, m(0.1)) });
    q += rect(-hw + m(0.25), -hl + m(0.22), Wd - m(0.5), m(0.7), P.glass, { rx: m(0.15) });
    q += rect(-hw + m(0.32), -hl + m(1.25), Wd - m(0.64), L - m(1.8), shade(yel, 0.14), { rx: m(0.25) });
    q += rect(-hw, -hl + m(1.2), m(0.16), L - m(1.8), '#1A1A1A') + rect(hw - m(0.16), -hl + m(1.2), m(0.16), L - m(1.8), '#1A1A1A');
    q += rect(-m(0.55), -hl + m(3.2), m(1.1), m(1.4), shade(yel, -0.12), { rx: m(0.15) }) + rect(-m(0.55), m(1.4), m(1.1), m(1.4), shade(yel, -0.12), { rx: m(0.15) });
    if (o.flash) q += blink('both', hl, hw, s, '#E5352B');
    if (o.stopArm) {
      var ay = -hl + m(1.9), oc = octagon(-hw - 5.6, ay, 3.5);
      q += line(-hw, ay, -hw - 2.4, ay, '#4A505A', 1.1) + poly(octagon(-hw - 5.6, ay, 4.2), P.white) + poly(oc, P.signRed);
      q += poly(octagon(-hw - 5.6, ay, 2.6), 'none', { stroke: P.white, 'stroke-width': 0.45 });
    }
    return G(q, { transform: tr(x, y, h) });
  }

  // ambulance 6 x 2.25 m: white box, red side stripes, red and blue light bar with flashes
  function ambulance(x, y, h, o) {
    o = o || {};
    var s = o.s || S0, L = 6 * s, Wd = 2.25 * s, hl = L / 2, hw = Wd / 2, wh = '#F2F3F5', q = '';
    function m(v) { return v * s; }
    q += rect(-hw, -hl, Wd, L, wh, { rx: m(0.4), stroke: '#8D939B', 'stroke-width': Math.max(0.4, m(0.1)) });
    q += poly([[-hw + m(0.22), -hl + m(0.35)], [hw - m(0.22), -hl + m(0.35)], [hw - m(0.32), -hl + m(1.0)], [-hw + m(0.32), -hl + m(1.0)]], P.glass);
    q += rect(-hw + m(0.25), -hl + m(1.25), Wd - m(0.5), L - m(1.6), '#E7E9EC', { rx: m(0.2) });
    q += rect(-hw, -hl + m(1.5), m(0.26), L - m(2.1), P.signRed) + rect(hw - m(0.26), -hl + m(1.5), m(0.26), L - m(2.1), P.signRed);
    q += rect(-m(0.2), m(0.2), m(0.4), m(1.4), P.signRed) + rect(-m(0.7), m(0.7), m(1.4), m(0.4), P.signRed);
    var by = -hl + m(1.35), bw = Wd * 0.36;
    q += circ(-hw * 0.6, by, m(1.25), '#FF2A2A', { opacity: 0.35 }) + circ(hw * 0.6, by, m(1.25), '#3D7BFF', { opacity: 0.38 });
    q += rect(-bw - m(0.05), by - m(0.22), 2 * bw + m(0.1), m(0.44), '#1B1E23', { rx: m(0.12) });
    q += rect(-bw, by - m(0.17), bw, m(0.34), '#FF4A3D', { rx: m(0.08) }) + rect(0, by - m(0.17), bw, m(0.34), '#5A8BFF', { rx: m(0.08) });
    [[-1, '#FF4A3D'], [1, '#5A8BFF']].forEach(function (c) {
      [-35, 0, 35].forEach(function (d) {
        var a = (c[0] < 0 ? 180 : 0) + c[0] * d, ca = Math.cos(a * D2R), sa = Math.sin(a * D2R), x0 = c[0] * (hw + m(0.25)), r0 = m(0.2), r1 = m(0.85);
        q += line(x0 + ca * r0, by + sa * r0, x0 + ca * r1, by + sa * r1, c[1], m(0.16), ROUND);
      });
    });
    return G(q, { transform: tr(x, y, h) });
  }

  // phone with signal arcs (report)
  function phoneIcon(x, y) {
    return rect(x - 2.3, y - 3.8, 4.6, 7.6, '#1B2230', { rx: 1, stroke: P.ink, 'stroke-width': 0.6 }) + rect(x - 1.5, y - 2.8, 3, 4.9, '#4A8FD8', { rx: 0.4 }) +
      path('M' + f(x + 3.4) + ' ' + f(y - 4.4) + 'A3 3 0 0 1 ' + f(x + 5.2) + ' ' + f(y - 1.6), 'none', { stroke: P.ink, 'stroke-width': 0.8, 'stroke-linecap': 'round' }) +
      path('M' + f(x + 4.4) + ' ' + f(y - 6.6) + 'A5.4 5.4 0 0 1 ' + f(x + 7.6) + ' ' + f(y - 1.4), 'none', { stroke: P.ink, 'stroke-width': 0.8, 'stroke-linecap': 'round' });
  }

  // traffic signal head drawn face on (icon), lit = 'red' | 'amber' | 'green'
  function signalHead(x, y, lit) {
    var q = line(x, y + 9, x, y + 15, '#6B737F', 1.6, ROUND) + rect(x - 3.8, y - 10.4, 7.6, 20.8, '#15181D', { rx: 2, stroke: '#5A6475', 'stroke-width': 0.7 });
    [['red', -6.3, '#E5352B'], ['amber', 0, '#F5A623'], ['green', 6.3, '#2FC36B']].forEach(function (l) {
      var on = l[0] === lit;
      if (on) q += circ(x, y + l[1], 5, l[2], { opacity: 0.28 });
      q += circ(x, y + l[1], 2.4, on ? l[2] : '#2A2F37', { stroke: on ? shade(l[2], 0.3) : shade(l[2], -0.55), 'stroke-width': 0.5 });
    });
    return q;
  }

  // painted white lane arrow, pointing up, base at (x, y), kind: 'straight' | 'right' | 'left-u'
  function laneArrow(x, y, kind, len) {
    len = len || 13;
    var o = { w: 1.5, casing: false }, q = '';
    if (kind === 'straight') q += arrow(new Pen(x, y, 0).L(x, y - len + 4.4), P.white, o);
    if (kind === 'right') q += arrow(new Pen(x, y, 0).L(x, y - len + 7).arc(x + 4, y - len + 7, 270, false).L(x + 4.4, y - len + 3), P.white, o);
    if (kind === 'left-u') {
      q += arrow(new Pen(x, y, 0).L(x, y - len + 7).arc(x - 4, y - len + 7, 270, true).L(x - 4.4, y - len + 3), P.white, o);
      q += arrow(new Pen(x, y - len + 8, 0).L(x, y - len + 5).arc(x - 3.2, y - len + 5, 180, true).L(x - 6.4, y - len + 7.2), P.white, o);
    }
    return q;
  }

  // ================================================================== yard (parking test) diagrams
  reg('fig-yard-parallel', 'الركن الموازي خطوة بخطوة', function (o, label) {
    var s = 8, kx = 112, kw = 2.6, ki = kx - kw / 2, bw = 2.5 * s, bx = ki - bw, yf = 50, yr = yf + 7 * s, hw = 0.975 * s, hl = 2.3 * s, q = '';
    q += rect(0, 0, ki, H, P.asph, { rx: 10 }) + rect(10, 0, ki - 10, H, P.asph) + kerbBW(kx, 0, H, kw, 5);
    q += mark(bx, yf, bx, yr, P.white, 1) + mark(bx, yf, ki, yf, P.white, 1) + mark(bx, yr, ki, yr, P.white, 1);
    // parked car in front of the space
    var xp = ki - 0.3 * s - hw, yp = yf - 0.8 * s - hl;
    q += car(xp, yp, 0, { color: P.silver, s: s });
    // 1: alongside it, about 0.8 m away, rear bumpers level; 2: reversing at a clear angle toward the kerb;
    // 3: parallel to the kerb, about 30 cm from it (drawn a little wider to stay visible)
    var x1 = xp - 2 * hw - 0.8 * s, y1 = yp, h2 = 325, rd = [-Math.sin(h2 * D2R), Math.cos(h2 * D2R)], x2 = 86, y2 = 57;
    var rear2 = [x2 + hl * rd[0], y2 + hl * rd[1]], x3 = ki - 3.4 - hw, y3 = (yf + yr) / 2;
    q += ghostCar(x1, y1, 0, { s: s }) + ghostCar(x2, y2, h2, { s: s }) + ghostCar(x3, y3, 0, { s: s, final: true });
    q += arrow(new Pen(x1, y1 + hl, 180).to(rear2[0], rear2[1], 145, 9, 9).to(x3, y3 + hl - 1, 180, 11, 11), P.gold, { dash: true, w: 2.1 });
    q += pole(bx, yf) + pole(bx, yr) + pole(ki - 2, yf, 1.4) + pole(ki - 2, yr, 1.4);
    // about 30 cm to the kerb
    var yd = y3 - hl + 9;
    q += G(line(x3 + hw + 0.4, yd, 118, yd, P.pill, 3, ROUND), { opacity: 0.5 }) + line(x3 + hw + 0.4, yd, 118, yd, P.gold, 1.2) +
      line(x3 + hw + 0.4, yd - 2.4, x3 + hw + 0.4, yd + 2.4, P.gold, 1.2, ROUND) + line(ki, yd - 2.4, ki, yd + 2.4, P.gold, 1.2, ROUND);
    q += tag('30 سم', 138, yd, { col: P.gold, size: 9.5, pad: 0.9 });
    q += badge('1', x1, y1, P.gold, 5.4) + badge('2', x2, y2, P.gold, 5.4) + badge('3', x3, y3, P.gold, 5.4);
    return fig(label, q);
  });

  reg('fig-yard-garage', 'الكراج بالرجوع خطوة بخطوة', function (o, label) {
    var s = 7, bw = 3.2 * s, bd = 5.5 * s, xo = 76, xb = xo + bd, kx = xb + 1.5 + 1.3, hw = 0.975 * s, hl = 2.3 * s, q = '';
    q += rect(0, 0, kx - 1.3, H, P.asph, { rx: 10 }) + rect(10, 0, kx - 11.3, H, P.asph) + kerbBW(kx, 0, H, 2.6, 5);
    var yt = 64, lines = [yt - 2 * bw, yt - bw, yt, yt + bw, yt + 2 * bw];
    lines.forEach(function (yy) { if (yy > 0.5 && yy < H - 0.5) q += mark(xo, yy, xb, yy, P.white, 1); });
    q += mark(xb, 0, xb, H, P.white, 1);
    q += car(xb - 2.5 - hl, yt - bw / 2, 270, { color: P.blue, s: s }) + car(xb - 2.5 - hl, yt + 1.5 * bw, 270, { color: P.dark, s: s });
    // 1: passing about 1 m from the bay ends, rear level with the far line of the bay
    var x1 = xo - 1 * s - hw, y1 = yt - hl;
    // 2: reversing on full lock, angled into the bay
    var h2 = 305, rd = [-Math.sin(h2 * D2R), Math.cos(h2 * D2R)], rear2 = [xo + 8, yt + bw / 2 - 2], x2 = rear2[0] - hl * rd[0], y2 = rear2[1] - hl * rd[1];
    // 3: straight in the bay, stopped before the back line, equal space on both sides
    var x3 = xb - 2.5 - hl, y3 = yt + bw / 2;
    q += ghostCar(x1, y1, 0, { s: s }) + ghostCar(x2, y2, h2, { s: s }) + ghostCar(x3, y3, 270, { s: s, final: true });
    q += arrow(new Pen(x1, y1 + hl, 180).to(rear2[0], rear2[1], 125, 7, 7).to(x3 + hl - 5, y3, 90, 7, 7), P.gold, { dash: true, w: 2.1 });
    var tx = x3 + 5, g = (bw - 2 * hw) / 2;
    [[yt, yt + g], [yt + bw - g, yt + bw]].forEach(function (t) {
      q += line(tx, t[0] + 0.7, tx, t[1] - 0.7, P.gold, 1.4) + line(tx - 1.8, t[0] + 0.7, tx + 1.8, t[0] + 0.7, P.gold, 1.1, ROUND) +
        line(tx - 1.8, t[1] - 0.7, tx + 1.8, t[1] - 0.7, P.gold, 1.1, ROUND);
    });
    q += badge('1', x1, y1 - 2, P.gold, 5.4) + badge('2', x2, y2, P.gold, 5.4) + badge('3', x3 - 4, y3, P.gold, 5.4);
    return fig(label, q);
  });

  reg('fig-yard-angle', 'الموقف المائل 60 درجة', function (o, label) {
    var s = 5.5, xo = 72, dx = 29, xb = xo + dx, kx = xb + 2.8, a = 60, ua = [Math.sin(a * D2R), -Math.cos(a * D2R)];
    var op = 3 * s / Math.sin(a * D2R), dy = dx / Math.tan(a * D2R), hw = 0.975 * s, hl = 2.3 * s, q = '';
    q += rect(0, 0, kx - 1.3, H, P.asph, { rx: 10 }) + rect(10, 0, kx - 11.3, H, P.asph) + kerbBW(kx, 0, H, 2.6, 5);
    var ys = [];
    for (var i = -1; i < 7; i++) ys.push(60.5 + (i - 3) * op);
    ys.forEach(function (yk) {
      var p0 = [xo, yk], p1 = [xb, yk - dy];
      if (p1[1] > H - 0.5 || p0[1] < 0.5) return;
      if (p0[1] > H) p0 = [xo + (p0[1] - H) * Math.tan(a * D2R), H];
      if (p1[1] < 0) p1 = [xo + yk * Math.tan(a * D2R), 0];
      q += mark(p0[0], p0[1], p1[0], p1[1], P.white, 1);
    });
    q += mark(xb, 0, xb, H, P.white, 1);
    // target bay between ys[4] and ys[5]; a parked car two bays further up
    var ya = (ys[4] + ys[5]) / 2, df = 29, c3 = [xo + (df - hl) * ua[0], ya + (df - hl) * ua[1]];
    q += car(c3[0], c3[1] - 2 * op, a, { color: P.silver, s: s });
    q += ghostCar(c3[0], c3[1], a, { s: s, final: true });
    // our car starts slightly wide and drives forward on a smooth curve into the bay
    var xs = 46, ys0 = 101, ea = [xo - 3 * ua[0], ya - 3 * ua[1]];
    q += arrow(new Pen(xs, ys0 - hl - 1, 0).to(ea[0], ea[1], a, 12, 8), P.gold, { dash: true, w: 2.1 });
    q += car(xs, ys0, 0, { me: true, s: s, ind: 'R' });
    // the 60 degree angle between a bay line and the aisle
    var ay = ys[4], ar = 11;
    q += mark(xo, ay, xo, ay - ar - 4, P.gold, 1, [1.6, 1.2]);
    q += path('M' + f(xo) + ' ' + f(ay - ar) + 'A' + ar + ' ' + ar + ' 0 0 1 ' + f(xo + ar * ua[0]) + ' ' + f(ay + ar * ua[1]), 'none', { stroke: P.gold, 'stroke-width': 1.5 });
    q += tag('60°', xo - 13, ay - 8, { col: P.gold, size: 9.5, pad: 0.9 });
    return fig(label, q);
  });

  // part of a convex polygon to the right of x = xl
  function clipRight(pts, xl) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length], ina = a[0] >= xl, inb = b[0] >= xl;
      if (ina) out.push(a);
      if (ina !== inb) { var t = (xl - a[0]) / (b[0] - a[0]); out.push([xl, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  function carCorners(x, y, h, L, Wd) {
    var c = Math.cos(h * D2R), sn = Math.sin(h * D2R);
    return [[-Wd / 2, -L / 2], [Wd / 2, -L / 2], [Wd / 2, L / 2], [-Wd / 2, L / 2]].map(function (p) { return [x + p[0] * c - p[1] * sn, y + p[0] * sn + p[1] * c]; });
  }

  reg('fig-yard-lines', 'السيارة كلها داخل الخطوط', function (o, label) {
    var s = 10.5, bw = 3.0 * s, bd = 5.4 * s, xm = 80, xl = xm - bw, xr = xm + bw, yb = 30, yo = yb + bd, L = 4.6 * s, Wd = 1.95 * s, q = '';
    q += rect(0, 0, W, H, P.asph, { rx: 10 });
    q += mark(xl, yb, xl, yo, P.white, 1.2) + mark(xm, yb, xm, yo, P.white, 1.2) + mark(xr, yb, xr, yo, P.white, 1.2) + mark(xl - 0.6, yb, xr + 0.6, yb, P.white, 1.2);
    // left bay: a corner and the mirror cross the line
    var h1 = 8, c1 = [xm - 7.2, yb + bd / 2 + 1];
    q += car(c1[0], c1[1], h1, { color: P.silver, s: s });
    var part = clipRight(carCorners(c1[0], c1[1], h1, L, Wd), xm), sn = Math.sin(h1 * D2R), cs = Math.cos(h1 * D2R);
    var mc = [c1[0] + (Wd / 2 + 0.07 * s) * cs + 0.775 * s * sn, c1[1] + (Wd / 2 + 0.07 * s) * sn - 0.775 * s * cs];
    if (part.length > 2) q += poly(part, P.x, { 'fill-opacity': 0.45, stroke: P.x, 'stroke-width': 1.2, 'stroke-linejoin': 'round' });
    q += poly(carCorners(mc[0], mc[1], h1, 0.17 * s, 0.22 * s), P.x, { 'fill-opacity': 0.6, stroke: P.x, 'stroke-width': 1.1, 'stroke-linejoin': 'round' });
    q += redX(c1[0] - 1, c1[1] + 6, 5.5);
    // right bay: fully inside the lines
    q += car(xm + bw / 2, yb + bd / 2 + 1, 0, { color: P.silver, s: s });
    q += okMark(xm + bw / 2, yb + bd / 2 + 7, 6);
    return fig(label, q);
  });

  reg('fig-yard-kerb', 'لا رصيف ولا عمود', function (o, label) {
    var s = 6.5, kx = 104, kw = 2.6, ki = kx - kw / 2, bw = 2.5 * s, bx = ki - bw, blen = 7 * s, hw = 0.975 * s, hl = 2.3 * s, q = '';
    q += rect(0, 0, ki, H, P.asph, { rx: 10 }) + rect(10, 0, ki - 10, H, P.asph) + kerbBW(kx, 0, H, kw, 5);
    var boxes = [7, 7 + blen + 11];
    boxes.forEach(function (y) { q += mark(bx, y, bx, y + blen, P.white, 1) + mark(bx, y, ki, y, P.white, 1) + mark(bx, y + blen, ki, y + blen, P.white, 1); });
    // wrong: the rear wheel climbs the kerb and the rear bumper hits the pole
    var ya = boxes[0], h1 = 351, rd = [-Math.sin(h1 * D2R), Math.cos(h1 * D2R)], rv = [Math.cos(h1 * D2R), Math.sin(h1 * D2R)];
    var rear = [ki - 4.2, ya + blen - 0.2], c1 = [rear[0] - hl * rd[0], rear[1] - hl * rd[1]];
    q += car(c1[0], c1[1], h1, { color: P.me, s: s, op: 0.55 });
    var wheel = [c1[0] + (hl - 0.95 * s) * rd[0] + (hw - 0.1 * s) * rv[0], c1[1] + (hl - 0.95 * s) * rd[1] + (hw - 0.1 * s) * rv[1]];
    q += pole(bx, ya) + pole(bx, ya + blen) + pole(ki - 2, ya, 1.4) + pole(ki - 2, ya + blen, 1.4);
    q += circ(wheel[0], wheel[1], 4, 'none', { stroke: P.x, 'stroke-width': 1.5 }) + hitMark(ki - 2.6, ya + blen - 1.4, 3.4);
    q += redX(bx - 17, c1[1], 5.2);
    // right: parallel, small gaps to the kerb and to both poles
    var yb = boxes[1], x2 = ki - 2.8 - hw, y2 = yb + blen / 2;
    q += car(x2, y2, 0, { me: true, s: s });
    q += pole(bx, yb) + pole(bx, yb + blen) + pole(ki - 2, yb, 1.4) + pole(ki - 2, yb + blen, 1.4);
    q += okMark(bx - 17, y2, 5.8);
    return fig(label, q);
  });

  // ================================================================== more junction and road rules
  reg('fig-roundabout-lanes3', 'اتبع أسهم المسارات عند الدوار', function (o, label) {
    var s = 2.6, cx = 80, cy = 52, R = 44, Ri = 14, lw = 10, wm = 3;
    var q = roundabout({ cx: cx, cy: cy, R: R, Ri: Ri, hw: [21.5, 21.5, 31.5, 21.5], wm: wm, n: [2, 2, 3, 2], lw: lw, s: s, rl: 3 });
    var l1 = cx + wm / 2 + 2.5 * lw, l2 = cx + wm / 2 + 1.5 * lw, l3 = cx + wm / 2 + 0.5 * lw, yA = 116, c1 = P.ok, c2 = P.gold, c3 = '#7FB2EE';
    q += laneArrow(l1, yA, 'right') + laneArrow(l2, yA, 'straight') + laneArrow(l3, yA, 'left-u');
    var o2 = { w: 1.7 };
    // lane 1 -> first exit (east), outer ring lane
    q += arrow(new Pen(l1, 99, 0).L(l1, 89).arc(l1 + 20.5, 89, 270, false).L(150, cy + wm / 2 + 1.5 * lw), c1, o2);
    // lane 2 -> second exit (north), middle ring lane
    var r2 = 29, p2 = [cx + r2 * Math.cos(40 * D2R), cy + r2 * Math.sin(40 * D2R)];
    q += arrow(new Pen(l2, 99, 0).L(l2, 90).to(p2[0], p2[1], 40, 7, 6).arc(cx, cy, -40, true).to(cx + wm / 2 + 1.5 * lw, 13, 0, 5, 5), c2, o2);
    // lane 3 -> third exit (west), inner ring lane
    var r3 = 19, p3 = [cx + r3 * Math.cos(50 * D2R), cy + r3 * Math.sin(50 * D2R)];
    q += arrow(new Pen(l3, 99, 0).L(l3, 88).to(p3[0], p3[1], 50, 7, 6).arc(cx, cy, 215 - 360, true).to(40, cy - wm / 2 - lw / 2, 270, 6, 7).L(12, cy - wm / 2 - lw / 2), c3, o2);
    return fig(label, q);
  });

  reg('fig-main-road-first', 'الطريق الرئيسي قبل الفرعي', function (o, label) {
    var s = 3.4, lw = 13, y0 = 16, y1 = y0 + 4 * lw, cy = y0 + 2 * lw, sx0 = 67, sx1 = 93, q = '';
    q += surface(outline([[0, y0], [W, y0], [W, y1], [sx1, y1, 8], [sx1, H], [sx0, H], [sx0, y1, 8], [0, y1]]));
    q += dbl(0, cy, W, cy, P.yellow);
    q += mark(0, y0 + lw, W, y0 + lw, P.white, 0.9, [3 * s, 6 * s], 4) + mark(0, y1 - lw, W, y1 - lw, P.white, 0.9, [3 * s, 6 * s], 4);
    // main road traffic from both sides goes first
    q += arrow(new Pen(49, y1 - lw / 2, 90).L(126, y1 - lw / 2), P.ok, { w: 2.1 });
    q += car(40.8, y1 - lw / 2, 90, { color: P.blue, s: s });
    q += arrow(new Pen(111, y0 + lw / 2, 270).L(34, y0 + lw / 2), P.ok, { w: 2.1 });
    q += car(119.2, y0 + lw / 2, 270, { color: P.red, s: s });
    // our car waits at the mouth of the side road
    q += car((80 + sx1) / 2, y1 + 3.5 + 7.82, 0, { me: true, s: s, brake: true });
    return fig(label, q);
  });

  reg('fig-truck-turn-right', 'الشاحنة الطويلة تنعطف بزاوية واسعة', function (o, label) {
    var s = 3.8, lv = 15, lh = 10, cx = 48, cy = 28, x0 = cx - 2 * lv, x1 = cx + 2 * lv, y0 = cy - 2 * lh, y1 = cy + 2 * lh;
    var q = crossroads(x0, x1, y0, y1, 8), dash = [3 * s, 6 * s];
    q += dbl(cx, y1 + 2, cx, H, P.yellow) + dbl(x1 + 2, cy, W, cy, P.yellow) + dbl(0, cy, x0 - 2, cy, P.yellow);
    q += mark(cx + lv, y1 + 2, cx + lv, H, P.white, 0.9, dash) + mark(cx - lv, y1 + 2, cx - lv, H, P.white, 0.9, dash);
    q += mark(x1 + 2, cy + lh, W, cy + lh, P.white, 0.9, dash) + mark(x1 + 2, cy - lh, W, cy - lh, P.white, 0.9, dash);
    var xl = cx + 1.5 * lv, ht = 355, xt = xl - 5, yt = y1 + 2.5 + 6 * s;
    // the truck's wide swept path: a little left first, then wide into the east arm
    q += arrow(new Pen(xt - 2, y1 + 2, ht).to(cx + 13, cy + 8, 352, 5, 5).to(96, cy + 5, 98, 13, 12).to(146, cy + 1.5 * lh, 90, 18, 14), P.grey, { w: 2.8, op: 0.9 });
    // a car squeezing into the gap on the truck's right: never
    q += car(x1 - 3.8, yt + 3, 358, { color: P.green, s: s, op: 0.5 });
    q += truck(xt, yt, ht, { s: s, len: 12, color: '#C0453A' });
    q += G(blink('R', 6 * s, 1.25 * s, s), { transform: tr(xt, yt, ht) });
    q += redX(x1 - 3.8, yt + 3, 4.4);
    // our car waits behind the truck
    var yc = yt + 6 * s + 4 + 2.3 * s + 1;
    q += waitBar(xl, yc - 2.3 * s - 2.6, 0, -1, 12);
    q += car(xl, yc, 0, { me: true, s: s });
    return fig(label, q);
  });

  reg('fig-school-bus-stop', 'حافلة مدرسية متوقفة وذراع قف مفتوح', function (o, label) {
    var s = 4.6, lw = 18, x0 = 52, cxl = x0 + lw, x1 = cxl + lw, q = '';
    q += surface(outline([[x0, 0], [x0, H], [x1, H], [x1, 0]]));
    q += mark(cxl, 0, cxl, H, P.yellow, 0.9, [3 * s, 6 * s], 6);
    var xb = x1 - 0.3 * s - 1.25 * s, yb = 36;
    q += schoolBus(xb, yb, 0, { s: s, stopArm: true, flash: true });
    // children at the kerb near the door
    q += ped(x1 + 8, yb - 18, 270, { s: s, k: 2.9, color: '#E2A65C' }) + ped(x1 + 19, yb - 11, 250, { s: s, k: 2.9, color: '#8CC8A0' }) +
      ped(x1 + 9, yb - 3.5, 285, { s: s, k: 2.9, color: '#DE9090' });
    q += car(cxl + lw / 2 + 0.5, 98, 0, { me: true, s: s });
    return fig(label, q);
  });

  reg('fig-ev-two-way', 'طريق باتجاهين: الجميع يتحرك يمينا', function (o, label) {
    var s = 4.2, lw = 20, x0 = 50, cxl = x0 + lw, x1 = cxl + lw, q = '';
    q += surface(outline([[x0, 0], [x0, H], [x1, H], [x1, 0]]));
    q += mark(cxl, 0, cxl, H, P.yellow, 1, [3 * s, 6 * s], 8);
    // the ambulance passes through the middle that everybody leaves free
    q += arrow(new Pen(cxl + 8, 90, 0).to(cxl + 0.5, 62, 0, 10, 10).L(cxl + 0.5, 32), P.grey, { dash: true, w: 1.8, op: 0.9 });
    q += ambulance(cxl + lw / 2, 105, 0, { s: s });
    // our car and the oncoming car both move to their own right edge and slow down
    q += arrow(new Pen(cxl + lw / 2, 47, 0).to(x1 - 5.5, 22, 0, 9, 9), P.ok, { w: 2.2 });
    q += car(cxl + lw / 2, 57, 0, { me: true, s: s });
    q += arrow(new Pen(cxl - lw / 2, 29, 180).to(x0 + 5.5, 54, 180, 9, 9), P.ok, { w: 2.2 });
    q += car(cxl - lw / 2, 19, 180, { color: P.red, s: s });
    return fig(label, q);
  });

  reg('fig-pull-away', 'الانطلاق من جانب الطريق', function (o, label) {
    var s = 5, lw = 18, x0 = 44, pk = 13, x1 = x0 + 2 * lw, xk = x1 + pk, q = '';
    q += surface(outline([[x0, 0], [x0, H], [xk, H], [xk, 0]]));
    q += mark(x0 + 0.9, 0, x0 + 0.9, H, P.yellow, 0.9) + mark(x0 + lw, 0, x0 + lw, H, P.white, 0.9, [3 * s, 6 * s], 3) + mark(x1, 0, x1, H, P.white, 0.8, [1.5 * s, 1.5 * s]);
    var xr = x0 + 1.5 * lw, xc = x1 + pk / 2 - 0.4, yc = 88, hl = 2.3 * s;
    // the car that was behind has passed (now further up the lane)
    q += car(xr, 15, 0, { color: P.blue, s: s });
    // our car: mirrors, left signal, look over the left shoulder, then merge smoothly
    q += arrow(new Pen(xc, yc - hl - 0.5, 0).to(xr, 50, 0, 13, 13).L(xr, 36), P.gold, { dash: true, w: 2.1 });
    q += car(xc, yc, 0, { me: true, s: s, ind: 'L', driver: true });
    var hx = xc - 0.38 * s, hy = yc - 0.12 * s, rh = 7;
    q += arrow(new Pen(hx + rh * Math.cos(292 * D2R), hy + rh * Math.sin(292 * D2R), 270).arc(hx, hy, 203, true), P.gold, { w: 1.7 });
    return fig(label, q);
  });

  reg('fig-minor-accident', 'حادث بسيط: انقل السيارتين إلى مكان آمن', function (o, label) {
    var s = 3.6, lw = 15, x0 = 28, n = 3, xe = x0 + n * lw, sh = 19, q = carriageway(x0, lw, n, sh, s, true);
    q += mark(xe, 0, xe, H, P.white, 0.9);
    var xm = x0 + 1.5 * lw, L = 4.6 * s, ya = 54, yb = ya + L + 0.4, xs = xe + sh / 2;
    // before: the two cars touching in the middle lane (faded)
    q += car(xm, ya, 0, { color: P.blue, s: s, op: 0.45 }) + car(xm, yb, 0, { me: true, s: s, op: 0.45 });
    q += hitMark(xm + 1, ya + L / 2 + 0.2, 3.6);
    // after: both moved onto the shoulder, hazard lights on
    var y2a = 20, y2b = y2a + L + 8;
    q += arrow(new Pen(xm + 4.5, ya - 7, 40).to(xs - 5, y2a + 3, 20, 7, 6), P.gold, { dash: true, w: 1.9 });
    q += arrow(new Pen(xm + 4.5, yb - 3, 40).to(xs - 5, y2b + 5, 15, 8, 6), P.gold, { dash: true, w: 1.9 });
    q += car(xs, y2a, 0, { color: P.blue, s: s, ind: 'both' }) + car(xs, y2b, 0, { me: true, s: s, ind: 'both' });
    // people wait safely beyond the road edge, one reports by phone
    var px = xe + sh + 14;
    q += ped(px, 38, 270, { s: s, k: 3.6, color: '#4A8FD8' }) + ped(px + 13, 52, 250, { s: s, k: 3.6, color: '#8CC8A0' });
    q += phoneIcon(px + 24, 44);
    return fig(label, q, true);
  });

  reg('fig-amber-no-return', 'الأصفر: توقف إذا قدرت بأمان', function (o, label) {
    var s = 3.8, lw = 17, x0 = 62, x1 = x0 + 2 * lw, ys = 30, yz = 52, q = '';
    q += surface(outline([[0, 0, 10], [W, 0, 10], [W, 24], [x1, 24, 7], [x1, H], [x0, H], [x0, 24, 7], [0, 24]]));
    q += mark(x0 + 0.9, 30, x0 + 0.9, H, P.yellow, 0.9) + mark(x0 + lw, 36, x0 + lw, H, P.white, 0.9, [3 * s, 6 * s], 2);
    // zones: far back (green: you can still stop), just before the line (gold: too close, continue carefully)
    q += rect(x0 + 1.6, yz, 2 * lw - 2.2, H - yz, P.ok, { opacity: 0.16 }) + rect(x0 + 1.6, ys + 1.6, 2 * lw - 2.2, yz - ys - 1.6, P.gold, { opacity: 0.24 });
    q += mark(x0 + 1.6, yz, x1 - 0.6, yz, P.ink, 0.9, [2, 1.8]);
    q += mark(x0 + 1.2, ys, x1 - 0.4, ys, P.white, 2.2);
    q += signalHead(x1 + 11, 20, 'amber');
    var xl = x0 + lw / 2, xr = x0 + 1.5 * lw, L = 4.6 * s;
    // left lane: far back when the amber comes on, it stops before the line
    q += arrow(new Pen(xl, 76, 0).L(xl, 41), P.ok, { w: 2, dash: true });
    q += waitBar(xl, ys + 3.4, 0, -1, 11);
    q += car(xl, 76 + L / 2 + 1, 0, { me: true, s: s, op: 0.55 });
    q += okMark(xl - 14.5, 90, 5);
    // right lane: already very close to the line, it continues carefully
    q += arrow(new Pen(xr, yz - L - 1.5, 0).L(xr, 8), P.gold, { w: 2 });
    q += car(xr, yz - L / 2 - 0.5, 0, { me: true, s: s, op: 0.55 });
    return fig(label, q);
  });
})();
