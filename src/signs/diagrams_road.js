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
  function bzPts(p, n) { var o = []; for (var i = 0; i <= n; i++) o.push(bz(p, i / n)); return o; }
  function bzCut(p, t) { // first part of a cubic, up to t
    function lp(a, b) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    var a = lp(p[0], p[1]), b = lp(p[1], p[2]), c = lp(p[2], p[3]), d = lp(a, b), e = lp(b, c);
    return [p[0], a, d, lp(d, e)];
  }
  // offset a polyline sideways: d > 0 = to the right of its direction
  function offsetPts(pts, d) {
    return pts.map(function (q, i) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = hyp(tx, ty) || 1;
      return [q[0] - ty / l * d, q[1] + tx / l * d];
    });
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
  function blink(side, hl, hw, s) {
    var sx = side === 'L' ? -1 : 1, q = '';
    [[-1, -hl + 0.32 * s], [1, hl - 0.32 * s]].forEach(function (c) {
      var fy = c[0], x = sx * (hw - 0.16 * s), y = c[1];
      q += circ(x, y, 1.0 * s, P.amber, { opacity: 0.38 }) + circ(x, y, 0.42 * s, '#FFC24A');
      [[1, 0], [0.74, 0.67], [0.3, 0.95]].forEach(function (d) {
        var dx = sx * d[0], dy = fy * d[1], r0 = 1.2 * s, r1 = 1.95 * s;
        q += line(x + dx * r0, y + dy * r0, x + dx * r1, y + dy * r1, P.amber, 0.3 * s, ROUND);
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
  var TW = { 'انتظر': 27.23, 'أولا': 17.09, 'إشارة يمين': 55.7, 'يمين': 23.55, 'ثانيتان': 31.72, '1 م': 17.8, '15 م': 24.75, 'التفت': 29.06 };
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
  function ringSurface(cx, cy, R, hw, fr) {
    var arms = [270, 0, 90, 180].map(function (a) { return { m: armSide(cx, cy, R, hw, fr, a, -1), p: armSide(cx, cy, R, hw, fr, a, 1) }; });
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
  // 4-arm roundabout: centre, outer radius R, island radius Ri, arm half-width hw (lanes + half median),
  // median width wm, lanes per direction n, lane width lw, scale s
  function roundabout(cx, cy, R, Ri, hw, wm, n, lw, s) {
    var q = ringSurface(cx, cy, R, hw, 7), dash = [3 * s, 6 * s];
    [270, 0, 90, 180].forEach(function (a) {
      var sd = armSide(cx, cy, R, hw, 7, a, 1);
      q += armMedian(cx, cy, a, R + 2.2, wm);
      // give-way line across the entry lanes (anticlockwise side = entry for right-hand traffic)
      q += armLine(cx, cy, a, R + 1.2, -(wm / 2 + 0.6), R + 1.2, -(hw - 0.7), P.white, 1, [1.6, 1.3]);
      if (n > 1) {
        q += armLine(cx, cy, a, sd.tf + 2, -(wm / 2 + lw), sd.tb, -(wm / 2 + lw), P.white, 0.9, dash);
        q += armLine(cx, cy, a, sd.tf + 2, wm / 2 + lw, sd.tb, wm / 2 + lw, P.white, 0.9, dash);
      }
    });
    if (n > 1) q += circ(cx, cy, (R + Ri) / 2, 'none', { stroke: P.white, 'stroke-width': 0.9, 'stroke-dasharray': f(2.4 * s) + ' ' + f(4.2 * s) });
    return q + island(cx, cy, Ri);
  }

  reg('fig-roundabout-flow', 'الدوران عكس عقارب الساعة', function (o, label) {
    var s = 3.4, cx = 80, cy = 54, R = 36, Ri = 19.5, rr = 27.75;
    var q = roundabout(cx, cy, R, Ri, 14.5, 3, 1, 13, s);
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
  function roundabout2() { return roundabout(RB2.cx, RB2.cy, RB2.R, RB2.Ri, RB2.hw, RB2.wm, 2, RB2.lw, RB2.s); }

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
    q += line(mk[0] - 3, mk[1] - 4, 50, 17, P.amber, 0.8, { 'stroke-dasharray': '1.6 1.4', opacity: 0.9 });
    q += signalMark(mk[0], mk[1], am);
    q += tag('إشارة يمين', 29, 15, { col: P.amber, size: 8.5, pad: 0.9 });
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
    q += arrow(new Pen(cx - lw / 2, 22.5, 180).L(cx - lw / 2, 84), P.ok, { w: 2.2 });
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
    var s = 4, lw = 16, x0 = 48, cxl = x0 + lw, x1 = x0 + 2 * lw, xc = cxl + lw / 2, q = '';
    q += surface(outline([[x0, 0], [x0, H], [x1, H], [x1, 0]]));
    q += mark(cxl, 0, cxl, H, P.yellow, 0.9, [3 * s, 6 * s], 4);
    var yA = 25, yB = 95; // rear of the car ahead (level with the post), front of our car
    // street lamp on the right pavement, level with the rear of the car ahead
    var px = x1 + 6.5;
    q += circ(xc + 4, yA, 7, P.head, { opacity: 0.1 });
    q += mark(x0 + 1, yA, px, yA, P.ink, 0.8, [1.5, 1.5]);
    q += line(px, yA, xc + 4, yA, '#9AA3AE', 1.4, ROUND) + rect(xc + 1.6, yA - 1.2, 4.8, 2.4, P.head, { rx: 1.1 }) +
      circ(px, yA, 2.4, '#B8BEC8', { stroke: P.pill, 'stroke-width': 0.7 });
    q += car(xc, yA - 9.2, 0, { color: P.blue, s: s });
    q += car(xc, yB + 9.2, 0, { me: true, s: s });
    // two-second bracket in the gap, ticks 1 and 2
    var ym = (yA + yB) / 2;
    q += dim(xc, yB - 1, xc, yA + 1, null, { tick: 3.4 });
    q += line(xc - 3.4, ym, xc + 3.4, ym, P.gold, 1.2, ROUND);
    q += txt('1', xc - 7.5, ym, 9, P.gold) + txt('2', xc - 7.5, yA + 2.5, 9, P.gold);
    q += tag('ثانيتان', x1 + 26, ym, { col: P.gold, size: 10.5 });
    return fig(label, q);
  });

  reg('fig-bike-gap', 'متر على الأقل عند تجاوز الدراجة', function (o, label) {
    var s = 6, lw = 22, x0 = 46, cxl = x0 + lw, x1 = cxl + lw, k = 1.5, q = '';
    q += surface(outline([[x0, 0], [x0, H], [x1, H], [x1, 0]]));
    q += mark(cxl, 0, cxl, H, P.yellow, 1, [3 * s, 4 * s], 10);
    var gap = 7, xb = x1 - 6.2, hb = 0.31 * k * s, yb = 60, xcar = xb - hb - gap - 0.975 * s, ycar = 60;
    q += cyclist(xb, yb, 0, { s: s, k: k });
    q += car(xcar, ycar, 0, { me: true, s: s });
    var yd = yb - 0.63 * k * s + 0.4;
    q += dim(xcar + 0.975 * s + 0.3, yd, xb - hb - 0.2, yd, null, { tick: 2.4 });
    q += tag('1 م', xb - hb - gap / 2 - 1.5, yd - 16, { col: P.gold, size: 10, pad: 0.8 });
    return fig(label, q);
  });

  reg('fig-blind-spots', 'النقطة العمياء', function (o, label) {
    var s = 5, lw = 19, x0 = 43, q = carriageway(x0, lw, 2, 12, s), xr = x0 + 1.5 * lw, xl = x0 + lw / 2, cy = 37;
    var hw = 0.975 * s, mY = cy - 0.72 * s, mxL = xr - hw - 0.4, mxR = xr + hw + 0.4, a1 = 3, a2 = 21, len = 62;
    function ray(x, y, deg, l, sx) { return [x + sx * Math.sin(deg * D2R) * l, y + Math.cos(deg * D2R) * l]; }
    // mirror views (green): side mirrors and the interior mirror
    q += zone([[mxL, mY], ray(mxL, mY, a1, len, -1), ray(mxL, mY, a2, len, -1)], P.ok, 0.16, 0.45);
    q += zone([[mxR, mY], ray(mxR, mY, a1, len, 1), ray(mxR, mY, a2, len, 1)], P.ok, 0.16, 0.45);
    q += zone([[xr, cy - 0.9 * s], ray(xr, cy - 0.9 * s, 8, len + 4, -1), ray(xr, cy - 0.9 * s, 8, len + 4, 1)], P.ok, 0.16, 0.45);
    // blind spots (red): beside and behind the rear quarters, outside the mirror views
    var yP = cy - 0.1 * s, kk = Math.tan(a2 * D2R), wl = lw - 1.5, yE = cy + 2.3 * s + 4.6 * s * 0.9;
    [-1, 1].forEach(function (sx) {
      var mx = sx < 0 ? mxL : mxR, far = xr + sx * (hw + wl), e0 = mx + sx * (yP - mY) * kk, e1 = mx + sx * (yE - mY) * kk;
      q += zone([[e0, yP], [far, yP], [far, yE], [e1, yE]], P.x, 0.34);
    });
    q += car(xl, cy + 17, 0, { color: P.blue, s: s });
    q += car(xr, cy, 0, { me: true, s: s, driver: true });
    // head check: the driver (left seat) looks over the left shoulder
    var hx = xr - 0.38 * s, hy = cy - 0.12 * s;
    q += arrow(new Pen(hx + 5.2 * Math.cos(262 * D2R), hy + 5.2 * Math.sin(262 * D2R), 172).arc(hx, hy, 150, true), P.gold, { w: 1.5 });
    q += tag('التفت', xl - 1, cy - 13, { col: P.gold, size: 9.5 });
    return fig(label, q, true);
  });

  reg('fig-truck-blind', 'مناطق الشاحنة العمياء', function (o, label) {
    var s = 3.5, lw = 14, x0 = 57, q = carriageway(x0, lw, 3, 11, s), xm = x0 + 1.5 * lw, xr = x0 + 2.5 * lw;
    var L = 15 * s, hw = 1.25 * s, yc = 60, top = yc - L / 2, bot = yc + L / 2, sh = x0 + 3 * lw + 11;
    // front of the cab, the whole right side (largest), the left side near the cab, and behind the trailer
    q += zone([[xm - hw - 1, top - 1.2], [xm + hw + 2.5, top - 1.2], [xm + hw + 3.5, top - 13], [xm - hw - 1.5, top - 13]], P.x, 0.3);
    q += zone([[xm + hw + 1, top + 1.5], [xm + hw + 13, top + 1.5], [sh - 1, bot], [xm + hw + 1, bot]], P.x, 0.3);
    q += zone([[xm - hw - 1, top + 5], [xm - hw - 8, top + 7.5], [xm - hw - 11, top + 24], [xm - hw - 1, top + 24]], P.x, 0.3);
    q += zone([[xm - hw - 0.5, bot + 1.2], [xm + hw + 0.5, bot + 1.2], [xm + hw + 3.5, H - 2], [xm - hw - 3.5, H - 2]], P.x, 0.3);
    q += truck(xm, yc, 0, { s: s, len: 15, color: '#3F6FB5' });
    q += car(xr, yc + 3, 0, { me: true, s: s });
    return fig(label, q, true);
  });

  reg('fig-parking-15m', 'لا وقوف على بعد أقل من 15 مترا من التقاطع', function (o, label) {
    var s = 3.4, yj = 26, x0 = 38, lw = 15, pk = 9, xpk = x0 + 2 * lw, x1 = xpk + pk, m15 = 15 * s, yz = yj + m15, q = '';
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
    q += dim(x1 + 9, yj, x1 + 9, yz, '15 م', { size: 10 });
    var sx = x1 + 34, sy = yj + 16;
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
    var cL = bzPts(ramp, 14), eL = offsetPts(cL, -lw / 2), eR = offsetPts(cL, lw / 2);
    var q = highway();
    q += path(pl(clampPts(eL.concat(eR.slice().reverse()))) + 'Z', P.asph);
    q += path('M' + f(xe) + ' ' + f(yN) + 'L' + f(xe) + ' ' + f(yT1) + 'L' + f(xa) + ' ' + f(yT0) + 'L' + f(xa) + ' ' + f(yN) + 'Z', P.asph);
    // lines: lane 1 edge below the nose, merge line, taper edge, ramp edges
    q += mark(xe, yN, xe, H, P.white, 0.9) + mark(xe, 0, xe, yT1, P.white, 0.9);
    q += mark(xe, yT1 + 4, xe, yN, P.white, 1.4, [2 * s, 1.6 * s]);
    q += stroke([[xe, yT1], [xa - 0.3, yT0], [xa - 0.3, yN]].concat(offsetPts(cL, lw / 2 - 0.3).reverse().slice(1)).map(function (p2) { return [Math.min(W, p2[0]), Math.min(H, p2[1])]; }), P.white, 0.9);
    q += stroke(clampPts(offsetPts(cL, -lw / 2 + 0.3)), P.white, 0.9);
    // cars on lane 1 with a gap, other lanes
    var x1c = xe - lw / 2, xac = xa - lw / 2;
    q += car(x1c, 12, 0, { color: P.silver, s: s }) + car(x1c, 104, 0, { color: P.red, s: s }) +
      car(x0 + 1.5 * lw, 56, 0, { color: P.dark, s: s }) + car(x0 + lw / 2, 92, 0, { color: P.green, s: s });
    q += arrow(new Pen(xac, 51, 0).to(x1c, 31, 0, 7, 7), P.gold, { dash: true, w: 2.1 });
    q += car(xac, 60, 0, { me: true, s: s, ind: 'L' });
    return fig(label, q, true);
  });

  reg('fig-highway-exit', 'الخروج من الطريق السريع', function (o, label) {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, xe = x0 + 3 * lw, xa = xe + lw, yO0 = 112, yO1 = 92, yG = 62;
    // deceleration lane (taper from the bottom), then the exit ramp veering right to the top edge
    var ramp = [[xe + lw / 2, yG], [xe + lw / 2, 38], [xa + 12, 16], [xa + 40, -6]];
    var cL = bzPts(ramp, 14), eL = offsetPts(cL, -lw / 2), eR = offsetPts(cL, lw / 2);
    var q = highway();
    q += path('M' + f(xe) + ' ' + f(yO0) + 'L' + f(xa) + ' ' + f(yO1) + 'L' + f(xa) + ' ' + f(yG) + 'L' + f(xe) + ' ' + f(yG) + 'Z', P.asph);
    q += path(pl(clampPts(eL.concat(eR.slice().reverse()))) + 'Z', P.asph);
    // painted gore between lane 1 and the ramp
    var gore = [[xe, yG]].concat(clampPts(eL).slice(1)).concat([[xe, 0]]);
    q += path(pl(gore) + 'Z', P.asph);
    q += chevrons(xe, eL, yG, 2, 8);
    q += mark(xe, yO0, xe, H, P.white, 0.9) + mark(xe, 0, xe, yG, P.white, 0.9);
    q += mark(xe, yG, xe, yO0 - 2, P.white, 1.4, [2 * s, 1.6 * s]);
    q += stroke([[xe, yO0], [xa - 0.3, yO1]].concat(clampPts(offsetPts(cL, lw / 2 - 0.3))), P.white, 0.9);
    q += stroke(clampPts(offsetPts(cL, -lw / 2 + 0.3)), P.white, 0.9);
    var x1c = xe - lw / 2, xac = xa - lw / 2;
    q += car(x0 + 1.5 * lw, 42, 0, { color: P.blue, s: s }) + car(x0 + lw / 2, 80, 0, { color: P.silver, s: s });
    q += arrow(new Pen(x1c, 94, 0).to(xac, 76, 0, 7, 7).L(xac, yG).bz(bzCut(ramp, 0.72)), P.gold, { dash: true, w: 2.1 });
    q += car(x1c, 103, 0, { me: true, s: s, ind: 'R' });
    return fig(label, q, true);
  });

  reg('fig-missed-exit', 'فاتك المخرج؟ كمل للمخرج التالي', function (o, label) {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, xe = x0 + 3 * lw, xa = xe + lw, yG = 118, yN = 92;
    // the exit ramp left at the bottom: gore nose at the bottom edge, ramp going up to the right
    var ramp = [[xe + lw / 2, yG], [xe + lw / 2, 92], [xa + 22, 58], [xa + 50, -8]];
    var cL = bzPts(ramp, 16), eL = offsetPts(cL, -lw / 2), eR = offsetPts(cL, lw / 2);
    var q = highway();
    q += rect(xe, yG, lw, H - yG, P.asph);
    q += path(pl(clampPts(eL.concat(eR.slice().reverse()))) + 'Z', P.asph);
    // painted gore near the nose, then a sand nose
    var yCut = yN, gx = (xe + xAt(eL, yCut)) / 2, gr = (xAt(eL, yCut) - xe) / 2 - 1.2;
    q += path(pl([[xe, yG]].concat(eL.filter(function (p2) { return p2[1] <= yG && p2[1] >= yCut; })).concat([[xAt(eL, yCut), yCut], [xe, yCut]])) + 'Z', P.asph);
    q += chevrons(xe, eL, yG, yCut + 2, 7);
    q += circ(gx, yCut, gr, P.sand);
    q += mark(xe, 0, xe, H, P.white, 0.9);
    q += stroke(clampPts(offsetPts(cL, -lw / 2 + 0.3)), P.white, 0.9) + stroke(clampPts(offsetPts(cL, lw / 2 - 0.3)), P.white, 0.9);
    var x1c = xe - lw / 2, yc = 62;
    // wrong: cutting across the gore, reversing to the ramp
    q += arrow(new Pen(x1c + 2.5, yc - 8.5, 25).to(bz(ramp, 0.7)[0], bz(ramp, 0.7)[1], 27, 9, 9), P.bad, { dash: true, w: 1.9 });
    q += redX(xe + 13, 49);
    q += arrow(new Pen(x1c, yc + 9, 180).L(x1c, 98).to(xe + 5.5, 112, 150, 5, 4), P.bad, { dash: true, w: 1.9 });
    q += redX(x1c, 90);
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
    q += mark(0, cyh, cxv - lw - 2, cyh, P.yellow, 0.9, dash) + mark(W, cyh, cxv + lw + r + 16, cyh, P.yellow, 0.9, dash);
    // zebra across the east arm, just past the corner
    var zx = cxv + lw + r + 3, zw = 15;
    for (var y = cyh - lw + 1.6; y < cyh + lw - 1.5; y += 5.2) q += rect(zx, y, zw, 2.6, P.white);
    q += ped(zx + zw / 2 + 0.5, cyh - 8, 180, { s: s, k: 1.45, color: '#E2A65C' }) + ped(zx + zw / 2 - 1, cyh + 9, 0, { s: s, k: 1.45, color: '#4A8FD8' });
    q += arrow(new Pen(zx + zw + 3.5, cyh - 15, 180).L(zx + zw + 3.5, cyh - 6), P.grey, { w: 1.5 });
    q += arrow(new Pen(zx + zw + 3.5, cyh + 16, 0).L(zx + zw + 3.5, cyh + 7), P.grey, { w: 1.5 });
    // our right turn stops at the wait bar before the crossing
    var xs = cxv + lw / 2, ye = cyh + lw / 2, xw = zx - 3, x1 = cxv + lw, y1 = cyh + lw;
    var rt = 12;
    q += arrow(new Pen(xs, y1 + 5, 0).L(xs, ye + rt).arc(xs + rt, ye + rt, 270, false).L(xw - 6.5, ye), P.gold, { dash: true, w: 2.1 });
    q += waitBar(xw, ye, 1, 0, 13);
    q += car(xs, y1 + 5.8 + 12, 0, { me: true, s: s, ind: 'R' });
    return fig(label, q);
  });
})();
