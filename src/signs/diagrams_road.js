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
    pave: '#353C47', asph: '#2A2F37', asphD: '#22262D', white: '#F2F2EE', yellow: '#F2C230', kerb: '#9AA3AE',
    island: '#2F4337', gold: '#D9B978', ok: '#8CC8A0', bad: '#DE9090', x: '#E0564F', grey: '#97A1B4',
    amber: '#FFB21E', glass: '#1B2230', head: '#F4F1DE', tail: '#8E1C1C', ink: '#EAE6DB', pill: '#0D131E',
    me: '#F4F2EA', blue: '#3F6FB5', red: '#C0453A', silver: '#B8BEC8', dark: '#4A505A', green: '#3C8A5E',
    trailer: '#D5D8DC', signRed: '#C8202A', signBlue: '#1F5AA6'
  };

  function f(v) { return Math.round(v * 100) / 100; }
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }
  function pt(p) { return f(p[0]) + ' ' + f(p[1]); }
  function attrs(o) {
    var s = '';
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      var v = o[k];
      if (v === null || v === undefined || v === false) continue;
      s += ' ' + k + '="' + (typeof v === 'number' ? f(v) : v) + '"';
    }
    return s;
  }
  function ext(base, more) { if (more) for (var k in more) if (Object.prototype.hasOwnProperty.call(more, k)) base[k] = more[k]; return base; }
  function E(tag, o) { return '<' + tag + attrs(o) + '/>'; }
  function G(inner, o) { return '<g' + (o ? attrs(o) : '') + '>' + inner + '</g>'; }
  function rect(x, y, w, h, fill, more) { return E('rect', ext({ x: x, y: y, width: w, height: h, fill: fill }, more)); }
  function circ(x, y, r, fill, more) { return E('circle', ext({ cx: x, cy: y, r: r, fill: fill }, more)); }
  function ell(x, y, rx, ry, fill, more) { return E('ellipse', ext({ cx: x, cy: y, rx: rx, ry: ry, fill: fill }, more)); }
  function line(x1, y1, x2, y2, col, w, more) { return E('line', ext({ x1: x1, y1: y1, x2: x2, y2: y2, stroke: col, 'stroke-width': w }, more)); }
  function path(d, fill, more) { return E('path', ext({ d: d, fill: fill }, more)); }
  function poly(pts, fill, more) { return E('polygon', ext({ points: pts.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' '), fill: fill }, more)); }
  function tr(x, y, h) { return 'translate(' + f(x) + ' ' + f(y) + ')' + (h ? ' rotate(' + f(h) + ')' : ''); }
  var ROUND = { 'stroke-linecap': 'round' };

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { v = Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt); return v < 0 ? 0 : (v > 255 ? 255 : v); }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }

  // whole picture: rounded ground (city pavement) + content
  function fig(label, inner) {
    return K.svg(rect(0, 0, W, H, P.pave, { rx: 10 }) + inner, '0 0 ' + W + ' ' + H, label);
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
      var t = i / 16, u = 1 - t;
      var qx = u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x;
      var qy = u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y;
      len += hyp(qx - px, qy - py); px = qx; py = qy;
    }
    this.d += 'C' + [ax, ay, bx, by, x, y].map(f).join(' ');
    var dx = x - bx, dy = y - by;
    if (hyp(dx, dy) < 1e-6) { dx = x - ax; dy = y - ay; }
    return this._go(x, y, dx, dy, len);
  };
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

  // passenger car 4.6 x 1.95 m. o: {s, color, me, ind:'L'|'R', brake, op}
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
    q += rect(m(-0.07), m(-0.95), m(0.14), m(0.64), '#C7CCD4', { rx: m(0.07) });
    q += rect(m(-0.07), m(0.3), m(0.14), m(0.64), '#C7CCD4', { rx: m(0.07) });
    q += line(0, m(-0.6), 0, m(0.5), '#8A929E', m(0.09));
    q += line(m(-0.3), m(-0.62), m(0.3), m(-0.62), '#C7CCD4', m(0.08), ROUND);
    q += line(m(-0.22), m(-0.2), m(-0.28), m(-0.6), shade(jer, -0.15), m(0.12), ROUND) +
      line(m(0.22), m(-0.2), m(0.28), m(-0.6), shade(jer, -0.15), m(0.12), ROUND);
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
    q += ell(m(-0.11), m(-0.26), m(0.07), m(0.11), '#1B2230') + ell(m(0.11), m(0.2), m(0.07), m(0.11), '#1B2230');
    q += ell(0, 0, m(0.3), m(0.15), col, { stroke: P.pill, 'stroke-width': m(0.05) });
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
  function zone(pts, col, op) {
    return poly(pts, col, { 'fill-opacity': op, stroke: col, 'stroke-opacity': Math.min(1, op + 0.4), 'stroke-width': 0.7, 'stroke-linejoin': 'round' });
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
    var w = tw + size * 1.1, h = size + 5;
    return rect(x - w / 2, y - h / 2, w, h, P.pill, { rx: h / 2, opacity: 0.85, stroke: o.ring || null, 'stroke-width': o.ring ? 0.8 : null }) +
      txt(str, x, y + 0.3, size, o.col || P.ink);
  }

  // round number badge
  function badge(str, x, y, col, r) {
    r = r || 5.2;
    return circ(x, y, r + 0.9, P.pill, { opacity: 0.85 }) + circ(x, y, r, col) + txt(str, x, y + 0.2, r * 1.45, P.pill);
  }

  // gold dimension line with end ticks, small heads and a label
  function dim(x1, y1, x2, y2, label, o) {
    o = o || {};
    var dx = x2 - x1, dy = y2 - y1, l = hyp(dx, dy), ux = dx / l, uy = dy / l, nx = -uy * 2.8, ny = ux * 2.8, q = '';
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
    return line(x1, y1, x2, y2, col, w || 1, dash ? { 'stroke-dasharray': dash[0] + ' ' + dash[1], 'stroke-dashoffset': off || 0 } : null);
  }
  function dbl(x1, y1, x2, y2, col) { // double solid line along a vertical or horizontal axis
    var v = x1 === x2;
    return mark(v ? x1 - 0.9 : x1, v ? y1 : y1 - 0.9, v ? x2 - 0.9 : x2, v ? y2 : y2 - 0.9, col, 0.8) +
      mark(v ? x1 + 0.9 : x1, v ? y1 : y1 + 0.9, v ? x2 + 0.9 : x2, v ? y2 : y2 + 0.9, col, 0.8);
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
      fc: fc, tf: tf,
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
    var s = armSide(cx, cy, 1, 0, 0, a, 1), tb = hyp(s.end[0] - cx, s.end[1] - cy), r = wm / 2;
    var d = 'M' + f(t0 + r) + ' ' + f(-r) + 'L' + f(tb) + ' ' + f(-r) + 'L' + f(tb) + ' ' + f(r) + 'L' + f(t0 + r) + ' ' + f(r) +
      'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(t0 + r) + ' ' + f(-r) + 'Z';
    return G(path(d, P.pave, { stroke: P.kerb, 'stroke-width': 0.9 }), { transform: 'translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + f(a) + ')' });
  }
  // a line across or along an arm, in arm coordinates (t along the arm from the centre, l to the arm's clockwise side)
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

  // ================================================================== roundabouts
  // 4-arm roundabout: centre, outer radius R, island radius Ri, arm half-width hw (lanes + half median),
  // median width wm, lanes per direction n, lane width lw, scale s
  function roundabout(cx, cy, R, Ri, hw, wm, n, lw, s) {
    var q = ringSurface(cx, cy, R, hw, 7), dash = [3 * s, 6 * s];
    [270, 0, 90, 180].forEach(function (a) {
      var tf = armSide(cx, cy, R, hw, 7, a, 1).tf, tb = hyp(armSide(cx, cy, 1, 0, 0, a, 1).end[0] - cx, armSide(cx, cy, 1, 0, 0, a, 1).end[1] - cy);
      q += armMedian(cx, cy, a, R + 2.2, wm);
      // give-way line across the entry lanes (anticlockwise side = entry for right-hand traffic)
      q += armLine(cx, cy, a, R + 1.2, -(wm / 2 + 0.6), R + 1.2, -(hw - 0.7), P.white, 1, [1.6, 1.3]);
      if (n > 1) {
        q += armLine(cx, cy, a, tf + 2, -(wm / 2 + lw), tb, -(wm / 2 + lw), P.white, 0.9, dash);
        q += armLine(cx, cy, a, tf + 2, wm / 2 + lw, tb, wm / 2 + lw, P.white, 0.9, dash);
      }
    });
    if (n > 1) q += circ(cx, cy, (R + Ri) / 2, 'none', { stroke: P.white, 'stroke-width': 0.9, 'stroke-dasharray': f(2.4 * s) + ' ' + f(4.2 * s) });
    q += circ(cx, cy, Ri, P.island, { stroke: P.kerb, 'stroke-width': 1.4 }) + circ(cx, cy, Ri - 3.2, 'none', { stroke: '#3B5444', 'stroke-width': 1.2 });
    return q;
  }

  reg('fig-roundabout-flow', 'الدوران عكس عقارب الساعة', function (o, label) {
    var s = 3.3, cx = 80, cy = 55, R = 35, Ri = 19, rr = 27;
    var q = roundabout(cx, cy, R, Ri, 14, 3, 1, 12.5, s);
    q += arrow(ringPen(cx, cy, rr, 232).arc(cx, cy, 176, true), P.ink, { w: 1.6, op: 0.8 });
    q += arrow(ringPen(cx, cy, rr, 128).arc(cx, cy, 44, true), P.ink, { w: 1.6, op: 0.8 });
    q += arrow(ringPen(cx, cy, rr, -8).arc(cx, cy, -86, true), P.ink, { w: 1.6, op: 0.8 });
    q += ringCar(cx, cy, rr, 150, P.blue, s) + ringCar(cx, cy, rr, 255, P.red, s) + ringCar(cx, cy, rr, 16, P.silver, s);
    q += car(88.25, 100.5, 0, { me: true, s: s });
    return fig(label, q);
  });

  reg('fig-roundabout-priority', 'الأولوية لمن داخل الدوار', function (o, label) {
    var s = 4.2, cx = 80, cy = -8, R = 62, Ri = 42, hw = 17, fr = 8, wm = 3, rr = 52;
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
    var xi = Math.sqrt(Ri * Ri - cy * cy);
    q += path('M' + f(cx - xi) + ' 0A' + Ri + ' ' + Ri + ' 0 0 0 ' + f(cx + xi) + ' 0Z', P.island) +
      path('M' + f(cx - xi) + ' 0A' + Ri + ' ' + Ri + ' 0 0 0 ' + f(cx + xi) + ' 0', 'none', { stroke: P.kerb, 'stroke-width': 1.4 });
    var xi2 = Math.sqrt((Ri - 4) * (Ri - 4) - cy * cy);
    q += path('M' + f(cx - xi2) + ' 0A' + (Ri - 4) + ' ' + (Ri - 4) + ' 0 0 0 ' + f(cx + xi2) + ' 0', 'none', { stroke: '#3B5444', 'stroke-width': 1.4 });
    // the ring car comes from our left and passes in front of us
    q += arrow(ringPen(cx, cy, rr, 106).arc(cx, cy, 64, true), P.ok, { w: 2.1 });
    q += ringCar(cx, cy, rr, 117, P.blue, s);
    q += car(89, 73, 0, { me: true, s: s, brake: true });
    q += tag('انتظر', 124, 74, { col: P.gold, size: 9.5 });
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

  reg('fig-roundabout-left', 'لليسار أو الالتفاف: المسار الأيسر', function (o, label) {
    var q = roundabout2(), s = RB2.s, cx = RB2.cx, cy = RB2.cy, ri = 23.5;
    var x2 = 80 + 1.5 + 5; // lane 2 (left lane) of the south arm
    var a0 = 42, a1 = 213, p1 = [cx + ri * Math.cos(a0 * D2R), cy + ri * Math.sin(a0 * D2R)];
    var pen = new Pen(x2, 95.5, 0).L(x2, 88).to(p1[0], p1[1], a0, 6, 6).arc(cx, cy, a1 - 360, true).to(40, 47, 270, 6, 8).L(12, 47);
    q += arrow(pen, P.gold, { dash: true, w: 2 });
    // signal right just after passing the north exit
    var am = 250, mk = [cx + ri * Math.cos(am * D2R), cy + ri * Math.sin(am * D2R)];
    q += signalMark(mk[0], mk[1], am);
    q += car(x2, 102.5, 0, { me: true, s: s });
    return fig(label, q);
  });

  // amber "signal right" mark on a ring route at screen angle a (the car's right = outward)
  function signalMark(x, y, a) {
    var ox = Math.cos(a * D2R), oy = Math.sin(a * D2R), q = '';
    q += circ(x, y, 3.6, P.pill, { opacity: 0.8 }) + circ(x, y, 2.4, P.amber, { stroke: '#FFC24A', 'stroke-width': 0.6 });
    [-40, 0, 40].forEach(function (d) {
      var b = Math.atan2(oy, ox) + d * D2R, c = Math.cos(b), sn = Math.sin(b);
      q += line(x + c * 4.4, y + sn * 4.4, x + c * 7, y + sn * 7, P.amber, 1.1, ROUND);
    });
    return q;
  }

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
    var s = 3.6, q = crossroads(66, 94, 36, 64, 9);
    q += arrow(new Pen(87, 66, 0).L(87, 22), P.grey, { dash: true, w: 1.8 });
    q += arrow(new Pen(63.5, 57, 90).L(119, 57), P.ok, { w: 2.1 });
    q += car(54.5, 57, 90, { color: P.blue, s: s });
    q += car(87, 76.5, 0, { me: true, s: s, brake: true });
    q += tag('أولا', 42, 72, { col: P.ok });
    q += tag('انتظر', 118, 78, { col: P.gold });
    return fig(label, q);
  });

  // two lanes each way, double yellow centre lines, broken white lane lines
  function bigCross(cx, cy, lw) {
    var hwr = 2 * lw, x0 = cx - hwr, x1 = cx + hwr, y0 = cy - hwr, y1 = cy + hwr, r = 8, dash = [10, 20], q = crossroads(x0, x1, y0, y1, r);
    q += dbl(cx, 0, cx, y0 - 2, P.yellow) + dbl(cx, y1 + 2, cx, H, P.yellow) + dbl(0, cy, x0 - 2, cy, P.yellow) + dbl(x1 + 2, cy, W, cy, P.yellow);
    q += mark(cx - lw, 0, cx - lw, y0 - 2, P.white, 0.9, dash, 4) + mark(cx + lw, 0, cx + lw, y0 - 2, P.white, 0.9, dash, 4);
    q += mark(cx - lw, H, cx - lw, y1 + 2, P.white, 0.9, dash, 4) + mark(cx + lw, H, cx + lw, y1 + 2, P.white, 0.9, dash, 4);
    q += mark(0, cy - lw, x0 - 2, cy - lw, P.white, 0.9, dash, 4) + mark(0, cy + lw, x0 - 2, cy + lw, P.white, 0.9, dash, 4);
    q += mark(W, cy - lw, x1 + 2, cy - lw, P.white, 0.9, dash, 4) + mark(W, cy + lw, x1 + 2, cy + lw, P.white, 0.9, dash, 4);
    // stop lines on the approaches
    q += mark(cx + 1.8, y1 + 2.2, x1, y1 + 2.2, P.white, 1.6) + mark(x0, y0 - 2.2, cx - 1.8, y0 - 2.2, P.white, 1.6);
    q += mark(x0 - 2.2, cy + 1.8, x0 - 2.2, y1, P.white, 1.6) + mark(x1 + 2.2, y0, x1 + 2.2, cy - 1.8, P.white, 1.6);
    return q;
  }

  reg('fig-turn-left', 'الانعطاف يسارا من أقصى اليسار', function (o, label) {
    var s = 3.1, cx = 80, cy = 56, lw = 12, q = bigCross(cx, cy, lw), R = 28;
    var xs = cx + lw / 2, ye = cy - lw / 2;
    // oncoming car goes straight first
    q += arrow(new Pen(cx - lw / 2, 31, 180).L(cx - lw / 2, 99), P.ok, { w: 2.1 });
    q += car(cx - lw / 2, 22, 180, { color: P.red, s: s });
    // our left turn passes just left of the junction centre and ends in the left lane of the west arm
    q += arrow(new Pen(xs, 83.5, 0).L(xs, ye + R).arc(xs - R, ye + R, 270, true).L(16, ye), P.gold, { dash: true, w: 2 });
    q += car(xs, 91.2, 0, { me: true, s: s, ind: 'L' });
    q += tag('أولا', 50, 22, { col: P.ok });
    return fig(label, q);
  });

  reg('fig-turn-right', 'الانعطاف يمينا من أقصى اليمين', function (o, label) {
    var s = 3.1, cx = 80, cy = 56, lw = 12, q = bigCross(cx, cy, lw);
    var xs = cx + 1.5 * lw, ye = cy + 1.5 * lw; // right lane of the south arm, right lane of the east arm
    q += arrow(new Pen(xs, 87.5, 0).L(xs, 88).arc(xs + 14, 88, 270, false).L(146, ye), P.gold, { dash: true, w: 2 });
    q += car(xs, 96, 0, { me: true, s: s, ind: 'R' });
    return fig(label, q);
  });

  reg('fig-uturn', 'الالتفاف للخلف من المسار الأيسر', function (o, label) {
    var s = 3.3, lw = 12, mw = 8, cx = 80, x0 = cx - mw / 2 - 2 * lw, x1 = cx + mw / 2 + 2 * lw, oy0 = 38, oy1 = 62;
    var q = surface(outline([[x0, 0], [x0, H], [x1, H], [x1, 0]]));
    var dash = [3 * s, 6 * s];
    // lane lines and yellow edge lines along the median
    q += mark(x0 + lw, 0, x0 + lw, H, P.white, 0.9, dash) + mark(x1 - lw, 0, x1 - lw, H, P.white, 0.9, dash);
    q += mark(cx - mw / 2 - 1.2, 0, cx - mw / 2 - 1.2, oy0 - 1, P.yellow, 0.9) + mark(cx - mw / 2 - 1.2, oy1 + 1, cx - mw / 2 - 1.2, H, P.yellow, 0.9);
    q += mark(cx + mw / 2 + 1.2, 0, cx + mw / 2 + 1.2, oy0 - 1, P.yellow, 0.9) + mark(cx + mw / 2 + 1.2, oy1 + 1, cx + mw / 2 + 1.2, H, P.yellow, 0.9);
    // raised median with an opening
    var r = mw / 2;
    q += path('M' + f(cx - r) + ' 0L' + f(cx - r) + ' ' + f(oy0 - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + f(cx + r) + ' ' + f(oy0 - r) + 'L' + f(cx + r) + ' 0Z', P.island) +
      path('M' + f(cx - r) + ' 0L' + f(cx - r) + ' ' + f(oy0 - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + f(cx + r) + ' ' + f(oy0 - r) + 'L' + f(cx + r) + ' 0', 'none', { stroke: P.kerb, 'stroke-width': 1.3 });
    q += path('M' + f(cx - r) + ' ' + H + 'L' + f(cx - r) + ' ' + f(oy1 + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f(cx + r) + ' ' + f(oy1 + r) + 'L' + f(cx + r) + ' ' + H + 'Z', P.island) +
      path('M' + f(cx - r) + ' ' + H + 'L' + f(cx - r) + ' ' + f(oy1 + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + f(cx + r) + ' ' + f(oy1 + r) + 'L' + f(cx + r) + ' ' + H, 'none', { stroke: P.kerb, 'stroke-width': 1.3 });
    var xu = cx + mw / 2 + lw / 2, xd = cx - mw / 2 - lw / 2, cyU = 52, ru = (xu - xd) / 2;
    // the car coming down has priority
    q += arrow(new Pen(xd, 22.5, 180).L(xd, 29), P.ok, { w: 2.1 });
    q += car(xd, 14.5, 180, { color: P.blue, s: s });
    // our U-turn: left lane, through the opening, give way, then into the left lane of the other side
    q += arrow(new Pen(xu, 65, 0).L(xu, cyU).arc(cx, cyU, 180, true).L(xd, 106), P.gold, { dash: true, w: 2 });
    q += waitBar(cx, cyU - ru, -1, 0, 9);
    q += car(xu, 73.6, 0, { me: true, s: s, ind: 'L' });
    return fig(label, q);
  });

  // ================================================================== straight roads
  // one-way carriageway moving up: x0..x1 with n lanes; yellow edge on the left, white edge on the right, shoulder
  function carriageway(x0, lw, n, sh, s) {
    var x1 = x0 + n * lw, q = '', dash = [3 * s, 6 * s];
    q += surface(outline([[x0 - 3, 0], [x0 - 3, H], [x1 + sh, H], [x1 + sh, 0]]));
    if (sh) q += rect(x1, 0, sh, H, P.asphD);
    q += mark(x0 - 1.5, 0, x0 - 1.5, H, P.kerb, 3); // median barrier
    q += mark(x0 + 0.9, 0, x0 + 0.9, H, P.yellow, 0.9);
    for (var i = 1; i < n; i++) q += mark(x0 + i * lw, 0, x0 + i * lw, H, P.white, 0.9, dash);
    q += mark(x1 - 0.2, 0, x1 - 0.2, H, P.white, 0.9);
    return q;
  }

  reg('fig-overtake-left', 'التجاوز من اليسار فقط', function (o, label) {
    var s = 4, lw = 15, x0 = 57, q = carriageway(x0, lw, 2, 13, s), xl = x0 + lw / 2, xr = x0 + 1.5 * lw;
    q += truck(xr, 58, 0, { s: s, len: 10, color: '#C0453A' });
    // wrong: passing on the right (hard shoulder)
    q += arrow(new Pen(xr + 2, 91, 0).to(x0 + 2 * lw + 6.5, 74, 0, 7, 7).L(x0 + 2 * lw + 6.5, 40), P.bad, { dash: true, w: 1.8, op: 0.75 });
    q += redX(x0 + 2 * lw + 6.5, 58);
    // right: out to the left lane, past the truck, back well ahead of it
    q += arrow(new Pen(xr, 91, 0).to(xl, 76, 0, 7, 7).L(xl, 36).to(xr, 16, 0, 8, 8), P.gold, { dash: true, w: 2 });
    q += car(xr, 101, 0, { me: true, s: s, ind: 'L' });
    return fig(label, q);
  });

  reg('fig-keep-right', 'الزم اليمين واترك اليسار للتجاوز', function (o, label) {
    var s = 3.3, lw = 13, x0 = 60.5, q = carriageway(x0, lw, 3, 10, s), xl = x0 + lw / 2, xm = x0 + 1.5 * lw, xr = x0 + 2.5 * lw;
    q += arrow(new Pen(xr, 29, 0).L(xr, 18), P.grey, { w: 1.6 });
    q += arrow(new Pen(xm, 60, 0).L(xm, 49), P.grey, { w: 1.6 });
    q += arrow(new Pen(xl, 46, 0).to(xm, 22, 0, 7, 7), P.ok, { w: 2 });
    q += arrow(new Pen(xr, 90, 0).L(xr, 79), P.gold, { w: 1.8 });
    q += car(xr, 38, 0, { color: P.silver, s: s }) + car(xm, 69, 0, { color: P.blue, s: s }) + car(xl, 55, 0, { color: P.red, s: s });
    q += car(xr, 99, 0, { me: true, s: s });
    return fig(label, q);
  });

  reg('fig-two-second', 'قاعدة الثانيتين', function (o, label) {
    var s = 3.5, lw = 14, x0 = 81, x1 = x0 + lw, xc = x0 + lw / 2, q = '';
    q += surface(outline([[x0 - 2, 0], [x0 - 2, H], [x1 + 2, H], [x1 + 2, 0]]));
    q += mark(x0 - 0.6, 0, x0 - 0.6, H, P.white, 0.9) + mark(x1 + 0.6, 0, x1 + 0.6, H, P.white, 0.9);
    var yA = 30, yB = 95; // rear of the car ahead (level with the post), front of our car
    // lamp post on the right pavement, level with the rear of the car ahead
    q += mark(x0 - 2, yA, x1 + 11, yA, P.ink, 0.7, [1.4, 1.6]);
    q += line(x1 + 11, yA, x1 + 3.5, yA, '#B8BEC8', 1.3, ROUND) + circ(x1 + 3.5, yA, 1.3, P.head) + circ(x1 + 11, yA, 2.3, '#B8BEC8', { stroke: P.pill, 'stroke-width': 0.6 });
    q += car(xc, yA - 8.05, 0, { color: P.blue, s: s });
    q += car(xc, yB + 8.05, 0, { me: true, s: s });
    // two-second bracket with ticks 1 and 2
    var xd = x0 - 9;
    q += dim(xd, yB, xd, yA, null);
    q += line(xd - 2.6, (yA + yB) / 2, xd + 2.6, (yA + yB) / 2, P.gold, 1.2, ROUND);
    q += txt('1', xd - 6.5, (yA + yB) / 2, 8.5, P.gold) + txt('2', xd - 6.5, yA + 1, 8.5, P.gold);
    q += tag('ثانيتان', xd - 28, (yA + yB) / 2 + 12, { col: P.gold, size: 10 });
    return fig(label, q);
  });

  reg('fig-bike-gap', 'متر على الأقل عند تجاوز الدراجة', function (o, label) {
    var s = 6, lw = 21, x0 = 55, cx = x0 + lw, x1 = cx + lw, q = '';
    q += surface(outline([[x0, 0], [x0, H], [x1, H], [x1, 0]]));
    q += mark(cx, 0, cx, H, P.yellow, 1, [3 * s, 4 * s], 6);
    var yb = 50, xb = x1 - 4.6, gap = 1.15 * s, xcar = xb - 0.3 * 1.25 * s - gap - 0.975 * s;
    q += cyclist(xb, yb, 0, { s: s, k: 1.25 });
    q += arrow(new Pen(xcar, 34, 0).to(cx + lw / 2, 8, 0, 6, 6), P.gold, { dash: true, w: 2 });
    q += car(xcar, yb - 3, 0, { me: true, s: s });
    q += dim(xcar + 0.975 * s, yb - 3.5, xb - 0.375 * s, yb - 3.5, null);
    q += tag('1 م', xb - 0.375 * s - gap / 2, yb + 17, { col: P.gold, size: 10 });
    return fig(label, q);
  });

  reg('fig-blind-spots', 'النقطة العمياء', function (o, label) {
    var s = 5, lw = 18, x0 = 44, q = carriageway(x0, lw, 2, 12, s), xr = x0 + 1.5 * lw, xl = x0 + lw / 2, cy = 40;
    var hw = 0.975 * s, mY = cy - 0.62 * s, mxL = xr - hw - 0.3, mxR = xr + hw + 0.3;
    function ray(x, y, deg, len, sx) { return [x + sx * Math.sin(deg * D2R) * len, y + Math.cos(deg * D2R) * len]; }
    // mirror views (green)
    q += zone([[mxL, mY], ray(mxL, mY, 3, 74, -1), ray(mxL, mY, 22, 74, -1)], P.ok, 0.2);
    q += zone([[mxR, mY], ray(mxR, mY, 3, 74, 1), ray(mxR, mY, 22, 74, 1)], P.ok, 0.2);
    q += zone([[xr, cy - 1.5], ray(xr, cy - 1.5, 9, 72, -1), ray(xr, cy - 1.5, 9, 72, 1)], P.ok, 0.2);
    // blind spots (red): beside and behind the rear quarters, outside the mirror views
    var yP = cy - 0.2 * s, k = Math.tan(22 * D2R), wl = lw - 1;
    var eL = mxL - (yP - mY) * k, eR = mxR + (yP - mY) * k, yEnd = mY + (wl - 0.5) / k;
    q += zone([[eL, yP], [xr - hw - wl, yP], [xr - hw - wl, yEnd]], P.x, 0.34);
    q += zone([[eR, yP], [xr + hw + wl, yP], [xr + hw + wl, yEnd]], P.x, 0.34);
    q += car(xl, cy + 16.5, 0, { color: P.blue, s: s });
    q += car(xr, cy, 0, { me: true, s: s });
    // head check: the driver (left seat) turns the head
    var hx = xr - 0.38 * s, hy = cy + 0.1 * s;
    q += circ(hx, hy, 1.7, P.ink, { stroke: P.pill, 'stroke-width': 0.5 });
    q += arrow(new Pen(hx + 4.8 * Math.cos(255 * D2R), hy + 4.8 * Math.sin(255 * D2R), 165).arc(hx, hy, 150, true), P.gold, { w: 1.3, casing: true });
    return fig(label, q);
  });

  reg('fig-truck-blind', 'مناطق الشاحنة العمياء', function (o, label) {
    var s = 3.4, lw = 13, x0 = 60.5, q = carriageway(x0, lw, 3, 12, s), xm = x0 + 1.5 * lw, xr = x0 + 2.5 * lw;
    var L = 15 * s, hw = 1.25 * s, yc = 60, top = yc - L / 2, bot = yc + L / 2;
    q += zone([[xm - hw - 1, top - 1], [xm + hw + 3, top - 1], [xm + hw + 5, top - 13], [xm - hw - 1, top - 13]], P.x, 0.34);
    q += zone([[xm + hw + 1, top + 2], [xm + hw + 16, top + 1], [xm + hw + 25, bot], [xm + hw + 1, bot]], P.x, 0.34);
    q += zone([[xm - hw - 1, top + 6], [xm - hw - 9, top + 9], [xm - hw - 10, top + 24], [xm - hw - 1, top + 24]], P.x, 0.34);
    q += zone([[xm - hw, bot + 1], [xm + hw, bot + 1], [xm + hw + 3, H - 3], [xm - hw - 3, H - 3]], P.x, 0.34);
    q += truck(xm, yc, 0, { s: s, len: 15, color: '#3F6FB5' });
    q += car(xr, yc + 4, 0, { me: true, s: s });
    return fig(label, q);
  });

  reg('fig-parking-15m', 'لا وقوف على بعد أقل من 15 مترا من التقاطع', function (o, label) {
    var s = 3.2, yj = 28, x0 = 50, lw = 14, pk = 8.5, x1 = x0 + 2 * lw + pk, m15 = 15 * s, q = '';
    q += surface(outline([[0, 0, 10], [W, 0, 10], [W, yj], [x1, yj, 8], [x1, H], [x0, H], [x0, yj, 8], [0, yj]]));
    q += mark(0, yj / 2, W, yj / 2, P.yellow, 0.9, [3 * s, 6 * s], 4);
    q += mark(x0 + lw, yj + 3, x0 + lw, H, P.yellow, 0.9, [3 * s, 6 * s]);
    q += mark(x0 + 2 * lw, yj + 9, x0 + 2 * lw, H, P.white, 0.8, [1.5 * s, 1.5 * s]);
    // no-parking zone: 15 m from the junction along the right kerb
    q += rect(x0 + 2 * lw + 0.6, yj + 0.5, pk - 1.1, m15 - 0.5, P.signRed, { opacity: 0.3 });
    q += path('M' + f(x1) + ' ' + f(yj + 8) + 'L' + f(x1) + ' ' + f(yj + m15), 'none', { stroke: P.signRed, 'stroke-width': 2.6 });
    // parked cars stop before the zone
    var xp = x0 + 2 * lw + pk / 2;
    q += car(xp, yj + m15 + 3 + 7.36, 0, { me: true, s: s }) + car(xp, yj + m15 + 3 + 7.36 + 17.5, 0, { color: P.dark, s: s });
    // sign and measure on the pavement
    q += dim(x1 + 7, yj, x1 + 7, yj + m15, '15 م', { lx: x1 + 7, ly: yj + m15 / 2 });
    var sx = x1 + 26, sy = yj + 14;
    q += line(sx, sy + 7, sx, sy + 12, '#8A929E', 1.4, ROUND) + circ(sx, sy, 6.4, P.white) + circ(sx, sy, 5.8, P.signRed) + circ(sx, sy, 4.1, P.signBlue) +
      line(sx - 2.9, sy - 2.9, sx + 2.9, sy + 2.9, P.signRed, 1.5);
    return fig(label, q);
  });

  // ================================================================== highways
  // 3 lanes moving up, median barrier on the left; lane 1 = x from xL1 to x0 + 3 lw
  var HW = { s: 3.2, lw: 12, x0: 44 };
  function highway(extra) {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, x1 = x0 + 3 * lw, dash = [3 * s, 6 * s], q = '';
    q += path('M' + f(x0 - 3) + ' 0L' + f(x0 - 3) + ' ' + H + 'L' + f(x1) + ' ' + H + 'L' + f(x1) + ' 0Z', P.asph);
    q += extra || '';
    q += mark(x0 - 1.6, 0, x0 - 1.6, H, P.kerb, 3.2) + mark(x0 + 0.9, 0, x0 + 0.9, H, P.yellow, 0.9);
    q += mark(x0 + lw, 0, x0 + lw, H, P.white, 0.9, dash) + mark(x0 + 2 * lw, 0, x0 + 2 * lw, H, P.white, 0.9, dash);
    return q;
  }
  // chevrons inside a gore triangle: nose (nx, ny), the two edges given as functions x(y)
  function chevrons(yNose, yTop, xl, xr, step) {
    var q = '';
    for (var y = yNose + step; y < yTop; y += step) {
      var y2 = y + step * 0.95; if (y2 > yTop + 0.5) break;
    }
    return q;
  }

  reg('fig-highway-merge', 'الدخول إلى الطريق السريع', function (o, label) {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, xe = x0 + 3 * lw, xa = xe + lw; // xe: right edge of lane 1, xa: accel lane edge
    var yT0 = 46, yT1 = 10, yJ = 96;
    // acceleration lane (tapering), on-ramp from the bottom right, sand gore
    var acc = path('M' + f(xe) + ' ' + f(yT1) + 'L' + f(xa) + ' ' + f(yT0) + 'L' + f(xa) + ' ' + f(yJ) +
      'C' + f(xa) + ' 106 ' + f(xa + 14) + ' 112 ' + f(xa + 32) + ' ' + H + 'L' + f(xa + 16) + ' ' + H + 'C' + f(xa - 4) + ' 112 ' + f(xe) + ' 108 ' + f(xe) + ' ' + f(yJ) + 'Z', P.asph);
    var q = highway(acc);
    q += path('M' + f(xe) + ' ' + f(yT1) + 'L' + f(xa) + ' ' + f(yT0) + 'L' + f(xa) + ' ' + f(yJ) + 'C' + f(xa) + ' 106 ' + f(xa + 14) + ' 112 ' + f(xa + 32) + ' ' + H, 'none', { stroke: P.white, 'stroke-width': 0.9 });
    q += mark(xe, 0, xe, yT1, P.white, 0.9);
    q += mark(xe, yT1 + 4, xe, yJ - 2, P.white, 1.3, [2.2 * s, 1.8 * s]);
    q += path('M' + f(xe) + ' ' + f(yJ - 2) + 'C' + f(xe) + ' 108 ' + f(xa - 4) + ' 112 ' + f(xa + 16) + ' ' + H, 'none', { stroke: P.white, 'stroke-width': 0.9 });
    // cars on lane 1 with a gap, other lanes
    var x1c = xe - lw / 2;
    q += car(x1c, 13, 0, { color: P.silver, s: s }) + car(x1c, 100, 0, { color: P.red, s: s }) + car(x0 + 1.5 * lw, 58, 0, { color: P.dark, s: s }) + car(x0 + lw / 2, 88, 0, { color: P.green, s: s });
    q += arrow(new Pen(xa - lw / 2, 55, 0).to(x1c, 34, 0, 8, 8), P.gold, { dash: true, w: 2 });
    q += car(xa - lw / 2, 63, 0, { me: true, s: s, ind: 'L' });
    return fig(label, q);
  });

  function goreChevrons(pts, step, apexDown) {
    // pts: gore triangle [nose, left top, right top]; V chevrons with the apex toward the nose
    var q = '', n = pts[0], a = pts[1], b = pts[2];
    for (var t = step; t < 1; t += step) {
      var la = [n[0] + (a[0] - n[0]) * t, n[1] + (a[1] - n[1]) * t], lb = [n[0] + (b[0] - n[0]) * t, n[1] + (b[1] - n[1]) * t];
      var mid = [(la[0] + lb[0]) / 2, (la[1] + lb[1]) / 2 + (apexDown === false ? -1 : 1) * hyp(lb[0] - la[0], lb[1] - la[1]) * 0.28];
      q += path('M' + pt(la) + 'L' + pt(mid) + 'L' + pt(lb), 'none', { stroke: P.white, 'stroke-width': 1.3, 'stroke-linejoin': 'miter' });
    }
    return q;
  }

  reg('fig-highway-exit', 'الخروج من الطريق السريع', function (o, label) {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, xe = x0 + 3 * lw, xa = xe + lw;
    var yO0 = 108, yO1 = 84, yG = 56; // taper start/end, gore nose
    var dec = path('M' + f(xe) + ' ' + f(yO0) + 'L' + f(xa) + ' ' + f(yO1) + 'L' + f(xa) + ' ' + f(yG + 4) +
      'C' + f(xa) + ' 40 ' + f(xa + 16) + ' 18 ' + f(xa + 44) + ' 0L' + f(xa + 28) + ' 0C' + f(xa + 4) + ' 18 ' + f(xe + 2) + ' 40 ' + f(xe) + ' ' + f(yG) + 'Z', P.asph);
    var q = highway(dec);
    // edges: lane 1 edge above the nose, ramp edges, broken line along the deceleration lane
    q += mark(xe, yO0, xe, H, P.white, 0.9) + mark(xe, 0, xe, yG, P.white, 0.9);
    q += mark(xe, yG, xe, yO0 - 2, P.white, 1.3, [2.2 * s, 1.8 * s]);
    q += path('M' + f(xe) + ' ' + f(yO0) + 'L' + f(xa) + ' ' + f(yO1) + 'L' + f(xa) + ' ' + f(yG + 4) + 'C' + f(xa) + ' 40 ' + f(xa + 16) + ' 18 ' + f(xa + 44) + ' 0', 'none', { stroke: P.white, 'stroke-width': 0.9 });
    q += path('M' + f(xe) + ' ' + f(yG) + 'C' + f(xe + 2) + ' 40 ' + f(xa + 4) + ' 18 ' + f(xa + 28) + ' 0', 'none', { stroke: P.white, 'stroke-width': 0.9 });
    q += goreChevrons([[xe + 0.8, yG - 3], [xe + 0.8, 4], [xa + 21, 4]], 0.2);
    var x1c = xe - lw / 2;
    q += car(x0 + 1.5 * lw, 40, 0, { color: P.blue, s: s }) + car(x0 + lw / 2, 76, 0, { color: P.silver, s: s });
    q += arrow(new Pen(x1c, 91, 0).to(xa - lw / 2, 72, 0, 7, 7).L(xa - lw / 2, 58).to(xa + 22, 18, 30, 12, 10), P.gold, { dash: true, w: 2 });
    q += car(x1c, 99, 0, { me: true, s: s, ind: 'R' });
    return fig(label, q);
  });

  reg('fig-missed-exit', 'فاتك المخرج؟ كمل للمخرج التالي', function (o, label) {
    var s = HW.s, lw = HW.lw, x0 = HW.x0, xe = x0 + 3 * lw, xa = xe + lw, yG = 118;
    var ramp = path('M' + f(xe) + ' ' + H + 'C' + f(xe + 3) + ' 96 ' + f(xa + 18) + ' 70 ' + f(W) + ' 58L' + f(W) + ' 76C' + f(xa + 34) + ' 86 ' + f(xa + 4) + ' 104 ' + f(xa) + ' ' + H + 'Z', P.asph);
    var q = highway(ramp);
    q += mark(xe, 0, xe, H, P.white, 0.9);
    q += path('M' + f(xa) + ' ' + H + 'C' + f(xa + 4) + ' 104 ' + f(xa + 34) + ' 86 ' + f(W) + ' 76', 'none', { stroke: P.white, 'stroke-width': 0.9 });
    q += path('M' + f(xe) + ' ' + H + 'C' + f(xe + 3) + ' 96 ' + f(xa + 18) + ' 70 ' + f(W) + ' 58', 'none', { stroke: P.white, 'stroke-width': 0.9 });
    var x1c = xe - lw / 2, yc = 70;
    // wrong: cutting across the gore, reversing to the ramp
    q += arrow(new Pen(x1c + 3, yc - 8, 20).to(xa + 10, 72, 120, 7, 6), P.bad, { dash: true, w: 1.8 });
    q += redX(xe + 7, 68);
    q += arrow(new Pen(x1c, yc + 9, 180).L(x1c, 104).to(xe + 7, 114, 110, 4, 4), P.bad, { dash: true, w: 1.8 });
    q += redX(x1c, 97);
    // right: carry on to the next exit
    q += arrow(new Pen(x1c, yc - 9, 0).L(x1c, 14), P.ok, { w: 2.2 });
    q += car(x0 + 1.5 * lw, 30, 0, { color: P.silver, s: s });
    q += car(x1c, yc, 0, { me: true, s: s });
    return fig(label, q);
  });

  // ================================================================== pedestrians when turning
  reg('fig-turn-pedestrians', 'عند الانعطاف: المشاة أولا', function (o, label) {
    var s = 4, lw = 14, cxv = 50, cyh = 36, q = crossroads(cxv - lw, cxv + lw, cyh - lw, cyh + lw, 9);
    q += mark(cxv, cyh + lw + 2, cxv, H, P.yellow, 0.9, [3 * s, 6 * s]) + mark(cxv + lw + 20, cyh, W, cyh, P.yellow, 0.9, [3 * s, 6 * s]);
    q += mark(cxv, 0, cxv, cyh - lw - 2, P.yellow, 0.9, [3 * s, 6 * s]) + mark(0, cyh, cxv - lw - 2, cyh, P.yellow, 0.9, [3 * s, 6 * s]);
    // zebra across the east arm, just past the corner
    var zx = cxv + lw + 11, zw = 12;
    for (var y = cyh - lw + 1.2; y < cyh + lw - 1; y += 4) q += rect(zx, y, zw, 2, P.white);
    q += ped(zx + zw / 2, cyh - 7, 180, { s: s, k: 1.7, color: '#E2A65C' }) + ped(zx + zw / 2 - 1, cyh + 7.5, 0, { s: s, k: 1.7, color: '#4A8FD8' });
    q += arrow(new Pen(zx + zw / 2 + 4.5, cyh - 13, 180).L(zx + zw / 2 + 4.5, cyh - 4), P.grey, { w: 1.4 });
    q += arrow(new Pen(zx + zw / 2 + 3.5, cyh + 13, 0).L(zx + zw / 2 + 3.5, cyh + 4), P.grey, { w: 1.4 });
    // our right turn stops at the wait bar before the crossing
    var xs = cxv + lw / 2, ye = cyh + lw / 2, xw = zx - 2.5;
    q += arrow(new Pen(xs, cyh + lw + 5, 0).L(xs, ye + 9).arc(xs + 9, ye + 9, 270, false).L(xw - 7.5, ye), P.gold, { dash: true, w: 2 });
    q += waitBar(xw, ye, 1, 0, 11);
    q += car(xs, cyh + lw + 14.5, 0, { me: true, s: s, ind: 'R' });
    return fig(label, q);
  });
})();
