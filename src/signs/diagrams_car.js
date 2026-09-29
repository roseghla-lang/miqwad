/* مقود: concept figures of group car (content/figs.json): stopping distance, lights, breakdown, tyres,
 * belts and child seats, water, dashboard, gears, phone, lane change routine, black points.
 * One small local kit at the top keeps the 15 pictures one family: side views face RIGHT (our car drives
 * to the right), the top-down picture follows docs/drawing.md 5.2, sequences read right to left.
 * Drawn from scratch, see docs/drawing.md (5.4 concept figures) */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }

  // ------------------------------------------------------------------ palette (docs/drawing.md 5.2 and 5.4)
  var C = {
    panel: '#141C2A', night: '#0B1019', pill: '#0D131E', tile: '#1A2335', tileLine: '#2B3950',
    ink: '#EAE6DB', muted: '#97A1B4', gold: '#D9B978', ok: '#8CC8A0', bad: '#DE9090', red: '#E0564F',
    water: '#4A8FD8', waterHi: '#8DBDF0', amber: '#FFB21E',
    asphalt: '#2A2F37', asphaltDark: '#22262D', lineW: '#F2F2EE', kerb: '#9AA3AE', sand: '#C9B48A',
    glass: '#1B2230', lamp: '#F4F1DE', lampOn: '#FFF3C4', tail: '#8E1C1C', tailOn: '#FF4A3D',
    me: '#F4F2EA', tyre: '#16191E', rim: '#A7AFBA', hub: '#4A515C', beam: '#FFF0B5',
    dRed: '#FF5A4A', dAmber: '#F5A623', dGreen: '#2FC36B', dBlue: '#4C8DFF', skin: '#D9B08C'
  };
  var VB = '0 0 160 120';

  // ------------------------------------------------------------------ tiny SVG helpers
  function f(v) { return String(Math.round(v * 100) / 100); }
  function pt(x, y) { return f(x) + ',' + f(y); }
  function M(pts) { return 'M' + pts.map(function (p) { return pt(p[0], p[1]); }).join('L'); }
  function A(o) {
    var s = '';
    if (o) for (var k in o) if (o[k] != null && o[k] !== false) s += ' ' + k + '="' + o[k] + '"';
    return s;
  }
  function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; if (b) for (k in b) o[k] = b[k]; return o; }
  function rect(x, y, w, h, r, fill, o) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '"' +
      (r ? ' rx="' + f(r) + '"' : '') + ' fill="' + fill + '"' + A(o) + '/>';
  }
  function circ(cx, cy, r, fill, o) {
    return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + fill + '"' + A(o) + '/>';
  }
  function ell(cx, cy, rx, ry, fill, o) {
    return '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="' + fill + '"' + A(o) + '/>';
  }
  function path(d, fill, o) { return '<path d="' + d + '" fill="' + fill + '"' + A(o) + '/>'; }
  function line(x1, y1, x2, y2, stroke, sw, o) {
    return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + stroke +
      '" stroke-width="' + f(sw) + '" stroke-linecap="round"' + A(o) + '/>';
  }
  function sk(d, stroke, sw, o) {
    return path(d, 'none', mix({ stroke: stroke, 'stroke-width': f(sw), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, o));
  }
  function g(inner, t, o) { return '<g' + (t ? ' transform="' + t + '"' : '') + A(o) + '>' + inner + '</g>'; }
  function tr(x, y, s, rot) {
    return 'translate(' + f(x) + ' ' + f(y) + ')' + (rot ? ' rotate(' + f(rot) + ')' : '') +
      (s != null && s !== 1 ? ' scale(' + (Math.round(s * 1000) / 1000) + ')' : '');
  }
  // rounded rectangle path with its own radius per corner [top-left, top-right, bottom-right, bottom-left]
  function rr(x, y, w, h, r) {
    var a = r[0], b = r[1], c = r[2], d = r[3];
    function arc(rad, x2, y2) { return rad ? 'A' + f(rad) + ',' + f(rad) + ' 0 0 1 ' + pt(x2, y2) : ''; }
    return 'M' + pt(x + a, y) + 'H' + f(x + w - b) + arc(b, x + w, y + b) + 'V' + f(y + h - c) + arc(c, x + w - c, y + h) +
      'H' + f(x + d) + arc(d, x, y + h - d) + 'V' + f(y + a) + arc(a, x + a, y) + 'Z';
  }
  // horizontal band across the whole picture; a band that reaches the bottom follows the panel corners
  function band(y0, y1, fill, o) {
    return path(rr(0, y0, 160, y1 - y0, [y0 <= 0 ? 10 : 0, y0 <= 0 ? 10 : 0, y1 >= 120 ? 10 : 0, y1 >= 120 ? 10 : 0]), fill, o);
  }
  function panel(fill) { return rect(0, 0, 160, 120, 10, fill || C.panel); }
  function arcPt(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }

  // ------------------------------------------------------------------ text (K.text sets the embedded fonts)
  // measured advance widths (em) of the labels used here, Alexandria 700
  var EM = {
    'مسافة التوقف': 7.35, 'رد الفعل': 4.21, 'الفرملة': 3.62, 'توقف': 2.84, 'افحص قريبا': 5.84, 'معلومة': 4.04,
    'وقوف': 2.98, 'رجوع': 2.31, 'محايد': 2.82, 'قيادة': 2.66, '145 سم': 3.71, '1.5 ملم': 3.53
  };
  function tw(str, size, latin) {
    var e = EM[str];
    if (e == null) e = String(str).length * (latin ? 0.62 : 0.6);
    return e * size;
  }
  // Arabic text gets direction rtl so "145 سم" reads the same in the app (RTL) and in LTR tools
  function txt(str, x, y, size, fill, o) {
    o = o || {};
    var s = K.text(str, f(x), f(y), size, { fill: fill, weight: o.weight || 700, family: o.latin ? 'latin' : 'head', anchor: o.anchor || 'middle' });
    return o.latin ? s : s.replace('<text ', '<text direction="rtl" ');
  }
  function label(str, x, y, size, fill, o) {
    o = o || {};
    var w = tw(str, size, o.latin) + size * 0.95, h = size * 1.5;
    return (o.pill ? rect(x - w / 2, y - h / 2, w, h, h / 2, C.pill, { opacity: 0.85 }) : '') + txt(str, x, y, size, fill, o);
  }

  // ------------------------------------------------------------------ marks
  // gold dimension line with end ticks (any direction)
  function dim(x1, y1, x2, y2, o) {
    o = o || {};
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L, ny = dx / L;
    var t = o.tick || 2.4, sw = o.sw || 1.2, col = o.color || C.gold, s = '';
    if (o.halo) s += line(x1, y1, x2, y2, C.pill, sw + 1.6, { opacity: 0.7 });
    s += line(x1, y1, x2, y2, col, sw, o.dash ? { 'stroke-dasharray': o.dash } : null);
    s += line(x1 + nx * t, y1 + ny * t, x1 - nx * t, y1 - ny * t, col, sw);
    s += line(x2 + nx * t, y2 + ny * t, x2 - nx * t, y2 - ny * t, col, sw);
    return s;
  }
  function xMark(cx, cy, r, o) {
    o = o || {};
    var d = M([[cx - r, cy - r], [cx + r, cy + r]]) + M([[cx + r, cy - r], [cx - r, cy + r]]), w = o.sw || r * 0.55;
    return (o.halo === false ? '' : sk(d, C.pill, w + 1.8, { opacity: 0.75 })) + sk(d, C.red, w);
  }
  function checkMark(cx, cy, r, o) {
    o = o || {};
    var d = M([[cx - r, cy + r * 0.05], [cx - r * 0.3, cy + r * 0.7], [cx + r, cy - r * 0.65]]), w = o.sw || r * 0.5;
    return (o.halo === false ? '' : sk(d, C.pill, w + 1.8, { opacity: 0.75 })) + sk(d, C.ok, w);
  }
  // round badge: dark disc, coloured ring, check or X
  function badge(ok, cx, cy, r) {
    return circ(cx, cy, r, C.pill, { stroke: ok ? C.ok : C.red, 'stroke-width': f(r * 0.16) }) +
      (ok ? checkMark(cx, cy + r * 0.02, r * 0.5, { halo: false, sw: r * 0.24 }) : xMark(cx, cy, r * 0.38, { halo: false, sw: r * 0.24 }));
  }
  function tile(x, y, w, h, o) {
    o = o || {};
    return rect(x, y, w, h, o.r || 6, o.fill || C.tile, { stroke: o.stroke || C.tileLine, 'stroke-width': o.sw || 0.8 });
  }
  // flash strokes around a lamp (angles in degrees, screen up = 90)
  function flash(cx, cy, r0, r1, angles, col, sw) {
    return angles.map(function (a) {
      var p = arcPt(cx, cy, r0, a), q = arcPt(cx, cy, r1, a);
      return line(p[0], p[1], q[0], q[1], col || C.amber, sw || 0.9);
    }).join('');
  }
  function arrowHead(x, y, deg, size, col) {
    // solid triangle pointing along deg (screen: 0 = right, 90 = up)
    var a = deg * Math.PI / 180, ux = Math.cos(a), uy = -Math.sin(a), nx = -uy, ny = ux, L = size, W = size * 0.62;
    return path(M([[x + ux * L * 0.5, y + uy * L * 0.5], [x - ux * L * 0.5 + nx * W, y - uy * L * 0.5 + ny * W],
      [x - ux * L * 0.5 - nx * W, y - uy * L * 0.5 - ny * W]]) + 'Z', col);
  }

  // ------------------------------------------------------------------ side-view car, facing RIGHT
  // local units: 100 long, ground at y 0 (wheel bottoms), roof at y -34.2; rear bumper x 1, nose x 99.6
  var CAR = {
    body: 'M4,-6.5C2,-6.5 1,-7.5 1,-9.5L1,-15.5C1,-18.2 2.6,-19.4 5.5,-19.8L24.5,-21.6C26,-21.8 27.2,-22.6 28.2,-23.8' +
      'L35.8,-31.8C37.4,-33.4 39.2,-34.2 41.6,-34.2L58,-34.2C60.8,-34.2 62.6,-33.4 64.4,-31.6L73,-23.2' +
      'C74.2,-22 75.6,-21.4 77.4,-21.2L93.6,-19.4C97.4,-19 99.4,-17 99.6,-13.6L99.6,-9.2C99.6,-7.4 98.6,-6.5 96.8,-6.5' +
      'L90.92,-6.5A11.2,11.2 0 1 0 69.08,-6.5L31.92,-6.5A11.2,11.2 0 1 0 10.08,-6.5Z',
    winR: 'M29.6,-23.2L36.8,-30.6C38,-31.8 39.4,-32.4 41.4,-32.4L49.2,-32.4L49.2,-23.2Z',
    winF: 'M51.6,-23.2L51.6,-32.4L57.8,-32.4C59.8,-32.4 61.2,-31.8 62.6,-30.4L70.2,-23.2Z',
    head: 'M93,-18.3L98.4,-17.8C99.2,-16.6 99.4,-15.6 99.4,-14.6L94.6,-15C93.4,-15.6 92.8,-16.8 93,-18.3Z',
    tail: 'M1.2,-17.4C1.6,-18.4 2.6,-19 4.2,-19.3L5.8,-19.4L6,-15.8L1.1,-15.2Z',
    wheels: [[21, -9], [80, -9]], wr: 9,
    lamp: [98.6, -16.2], fog: [96.6, -9.2], tailPt: [1.6, -17]
  };
  function wheelSide(cx, cy, r, rim) {
    return circ(cx, cy, r, C.tyre) + circ(cx, cy, r * 0.62, rim || C.rim) + circ(cx, cy, r * 0.42, C.hub) +
      circ(cx, cy, r * 0.14, rim || C.rim);
  }
  // x = rear end, y = ground line, len = bumper to bumper.  o: body, outline, sw, head/tail/fog ('on'),
  // hazard (amber corner lamps lit), shadow:false, rim
  function carSide(x, y, len, o) {
    o = o || {};
    var body = o.body || C.me, s = '';
    if (o.shadow !== false) s += ell(50, 0.3, 47, 2, '#000000', { opacity: 0.35 });
    s += path(CAR.body, body, { stroke: o.outline || C.gold, 'stroke-width': o.sw || 1.3, 'stroke-linejoin': 'round' });
    s += sk('M6,-19.6L93,-19.1', '#FFFFFF', 0.7, { opacity: 0.35 });
    s += path(CAR.winR, C.glass) + path(CAR.winF, C.glass);
    s += sk('M50.4,-23.2L50.4,-8.2M31,-21.6L31,-8.4M71.4,-21.4L69.6,-8.4', '#000000', 0.45, { opacity: 0.22 });
    s += rect(42.5, -19.6, 4, 1.1, 0.5, '#000000', { opacity: 0.25 }) + rect(62, -19.6, 4, 1.1, 0.5, '#000000', { opacity: 0.25 });
    s += path(CAR.head, o.head === 'on' ? C.lampOn : C.lamp);
    s += path(CAR.tail, o.tail === 'on' ? C.tailOn : C.tail);
    if (o.fog) s += rect(94.4, -10.2, 4.6, 2, 1, o.fog === 'on' ? C.lampOn : '#8C939E');
    if (o.hazard) s += circ(99, -11.6, 1.3, C.amber) + circ(1.4, -12.6, 1.3, C.amber);
    CAR.wheels.forEach(function (w) { s += wheelSide(w[0], w[1], CAR.wr, o.rim); });
    return g(s, tr(x, y, len / 100));
  }
  // point of a car-local coordinate in picture space
  function carPt(x, y, len, p) { return [x + p[0] * len / 100, y + p[1] * len / 100]; }

  // ------------------------------------------------------------------ top-down car (docs/drawing.md 5.2), facing UP
  // cx, cy centre, s units per metre. o: body, me (gold outline), hazard
  function carTop(cx, cy, s, o) {
    o = o || {};
    var body = o.body || C.me, hl = 2.3, hw = 0.975, q = '';
    q += rect(-hw + 0.2, -hl + 0.3, 1.95, 4.6, 0.55, '#000000', { opacity: 0.3 });
    if (o.me) q += rect(-hw - 0.4, -hl - 0.4, 2.75, 5.4, 0.9, 'none', { stroke: C.gold, 'stroke-width': 0.45, opacity: 0.35 });
    q += rect(-hw, -hl, 1.95, 4.6, 0.55, body, { stroke: o.me ? C.gold : '#20252D', 'stroke-width': o.me ? 0.24 : 0.1 });
    q += sk('M' + pt(-hw + 0.2, -hl + 0.9) + 'Q0,' + f(-hl + 0.55) + ' ' + pt(hw - 0.2, -hl + 0.9), '#000000', 0.06, { opacity: 0.2 });
    q += path('M-0.8,-0.95L0.8,-0.95L0.68,-0.22L-0.68,-0.22Z', C.glass);
    q += rect(-0.7, -0.22, 1.4, 1.45, 0.18, '#FFFFFF', { opacity: 0.12 });
    q += path('M-0.7,1.28L0.7,1.28L0.78,1.72L-0.78,1.72Z', C.glass);
    q += rect(-hw + 0.08, -0.9, 0.13, 2.4, 0.05, C.glass, { opacity: 0.8 }) + rect(hw - 0.21, -0.9, 0.13, 2.4, 0.05, C.glass, { opacity: 0.8 });
    q += rect(-hw - 0.17, -0.78, 0.22, 0.15, 0.05, '#9A968B') + rect(hw - 0.05, -0.78, 0.22, 0.15, 0.05, '#9A968B');
    q += rect(-hw + 0.16, -hl + 0.03, 0.5, 0.15, 0.05, C.lamp) + rect(hw - 0.66, -hl + 0.03, 0.5, 0.15, 0.05, C.lamp);
    q += rect(-hw + 0.14, hl - 0.17, 0.5, 0.13, 0.04, C.tail) + rect(hw - 0.64, hl - 0.17, 0.5, 0.13, 0.04, C.tail);
    var out = g(q, tr(cx, cy, s));
    if (o.hazard) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
        var x = cx + c[0] * (hw - 0.1) * s, y = cy + c[1] * (hl - 0.15) * s;
        var base = c[1] < 0 ? 90 : 270, side = c[0] < 0 ? 180 : 0;
        var mid = (base + (side === 180 ? (base === 90 ? 45 : -45) : (base === 90 ? -45 : 45)));
        out += circ(x, y, 2.4, C.amber, { opacity: 0.35 }) + circ(x, y, 1.1, '#FFD27A') +
          flash(x, y, 3.2, 5.4, [mid - 32, mid, mid + 32], C.amber, 0.9);
      });
    }
    return out;
  }
  // person seen from above (head + shoulders), facing up
  function personTop(cx, cy, s, cloth) {
    return ell(cx, cy + 0.6 * s, 2.1 * s, 1.15 * s, cloth) + circ(cx, cy + 0.2 * s, 0.95 * s, '#3A2A20');
  }
  // standing person, front view (feet at y)
  function personFront(cx, y, h, fill) {
    var hr = h * 0.105, top = y - h;
    return circ(cx, top + hr, hr, fill) +
      path(rr(cx - h * 0.15, top + h * 0.25, h * 0.3, h * 0.36, [h * 0.08, h * 0.08, h * 0.03, h * 0.03]), fill) +
      sk(M([[cx - h * 0.2, top + h * 0.3], [cx - h * 0.24, top + h * 0.56]]), fill, h * 0.085) +
      sk(M([[cx + h * 0.2, top + h * 0.3], [cx + h * 0.24, top + h * 0.56]]), fill, h * 0.085) +
      sk(M([[cx - h * 0.075, top + h * 0.6], [cx - h * 0.09, y - h * 0.03]]), fill, h * 0.1) +
      sk(M([[cx + h * 0.075, top + h * 0.6], [cx + h * 0.09, y - h * 0.03]]), fill, h * 0.1);
  }

  // ------------------------------------------------------------------ icons (centred at 0,0 unless noted)
  function eyeIcon(cx, cy, s, col) {
    var q = sk('M-5,0Q0,-4.4 5,0Q0,4.4 -5,0Z', col, 1.1) + circ(0, 0, 2, col) + circ(0, 0, 0.8, C.pill);
    return g(q, tr(cx, cy, s));
  }
  function pedalIcon(cx, cy, s, col) {
    var q = sk('M1.8,-5.8L0.2,-1.2', col, 1.3) + circ(1.9, -5.9, 1.1, col) +
      path(rr(-4.6, -1.8, 9.2, 5.6, [1.4, 1.4, 1.4, 1.4]), col) +
      line(-3, 0.2, 3, 0.2, C.pill, 0.7) + line(-3, 2, 3, 2, C.pill, 0.7);
    return g(q, tr(cx, cy, s));
  }
  // dashboard headlamp symbol: lamp dome on the right, rays on the left (ISO style); high = straight rays
  function beamIcon(cx, cy, s, col, high) {
    var q = path('M0,-5.2C5.4,-5.2 7.6,-2.8 7.6,0C7.6,2.8 5.4,5.2 0,5.2Z', col), i;
    for (i = 0; i < 4; i++) {
      var y = -3.9 + i * 2.6;
      q += high ? line(-2.2, y, -8.6, y, col, 1.2) : line(-2.2, y - 0.4, -8.2, y + 2.6, col, 1.2);
    }
    return g(q, tr(cx, cy, s));
  }
  function hazardIcon(cx, cy, s, col) {
    var q = path('M0,-6.6L6.9,5.4L-6.9,5.4Z', 'none', { stroke: col, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }) +
      path('M0,-2.2L3.1,3.2L-3.1,3.2Z', 'none', { stroke: col, 'stroke-width': 1.2, 'stroke-linejoin': 'round' });
    return g(q, tr(cx, cy, s));
  }
  function speedoIcon(cx, cy, r) {
    var s = '', a;
    s += circ(cx, cy, r + 2.4, C.pill, { stroke: C.tileLine, 'stroke-width': 0.8 });
    var p0 = arcPt(cx, cy, r, 210), p1 = arcPt(cx, cy, r, -30), pr = arcPt(cx, cy, r, 25);
    s += sk('M' + pt(p0[0], p0[1]) + 'A' + f(r) + ',' + f(r) + ' 0 1 1 ' + pt(pr[0], pr[1]), C.muted, 1.3);
    s += sk('M' + pt(pr[0], pr[1]) + 'A' + f(r) + ',' + f(r) + ' 0 0 1 ' + pt(p1[0], p1[1]), C.red, 2.4);
    for (a = 210; a >= -30; a -= 30) {
      var q0 = arcPt(cx, cy, r - 1.2, a), q1 = arcPt(cx, cy, r - 3.2, a);
      s += line(q0[0], q0[1], q1[0], q1[1], a <= 25 ? C.red : C.muted, 0.9);
    }
    var n = arcPt(cx, cy, r - 2.2, -12);
    s += line(cx, cy, n[0], n[1], C.ink, 1.5) + circ(cx, cy, 1.8, C.ink);
    return s;
  }
  function licenceCard(cx, cy, s) {
    var q = rect(-9, -6, 18, 12, 2, C.ink) + rect(-7, -3.8, 5.6, 7, 1, '#7F8AA0') + circ(-4.2, -1.6, 1.4, C.ink, { opacity: 0.8 }) +
      rect(0.4, -3.4, 6.8, 1.4, 0.6, '#7F8AA0') + rect(0.4, -0.6, 5, 1.2, 0.6, '#AEB5C2') + rect(0.4, 1.9, 6, 1.2, 0.6, '#AEB5C2');
    return g(q, tr(cx, cy, s));
  }
  function lockIcon(cx, cy, s, col) {
    var q = sk('M-3,-1.4L-3,-3.6C-3,-5.6 -1.6,-6.8 0,-6.8C1.6,-6.8 3,-5.6 3,-3.6L3,-1.4', col, 1.6) +
      rect(-4.6, -1.8, 9.2, 7.4, 1.5, col) + circ(0, 1.2, 1.1, C.pill) + rect(-0.45, 1.4, 0.9, 2.4, 0.3, C.pill);
    return g(q, tr(cx, cy, s));
  }

  // ------------------------------------------------------------------ shared scene parts
  // night side scene: sky, horizon, road band (y 74..98), verge
  function nightRoad() {
    var s = panel(C.night);
    [[12, 12, 0.6], [34, 7, 0.5], [57, 16, 0.7], [83, 9, 0.5], [104, 22, 0.6], [22, 34, 0.5], [70, 38, 0.4], [148, 44, 0.5], [44, 50, 0.4]]
      .forEach(function (p) { s += circ(p[0], p[1], p[2], C.ink, { opacity: 0.55 }); });
    s += rect(0, 62, 160, 12, 0, '#0F1520');
    s += rect(0, 74, 160, 24, 0, '#1C2027') + line(0, 74.4, 160, 74.4, C.kerb, 0.7, { opacity: 0.25 });
    s += band(98, 120, '#0D1118') + line(0, 97.8, 160, 97.8, C.kerb, 0.8, { opacity: 0.35 });
    return s;
  }
  function roadDashes(y, x0, x1, dash, gap, col, sw, o) {
    var s = '', x;
    for (x = x0; x < x1; x += dash + gap) s += line(x, y, Math.min(x + dash, x1), y, col, sw, o);
    return s;
  }

  // ================================================================== 1. stopping distance
  reg('fig-stopping-distance', 'مسافة التوقف: رد الفعل ثم الفرملة', function (o, lab) {
    var a = 54, b = 87, c = 139, s = panel();
    // road, side view
    s += rect(0, 66, 160, 14, 0, C.asphalt) + line(0, 66.4, 160, 66.4, C.kerb, 0.7, { opacity: 0.45 }) +
      roadDashes(71.5, 4, 160, 9, 7, C.lineW, 0.9, { opacity: 0.55 }) + line(0, 79.6, 160, 79.6, C.kerb, 0.9);
    // motion lines, car, obstacle
    s += line(1.5, 60.5, 6, 60.5, C.muted, 0.9, { opacity: 0.6 }) + line(0.5, 64.5, 5.5, 64.5, C.muted, 0.9, { opacity: 0.6 }) +
      line(2, 68.5, 6.5, 68.5, C.muted, 0.9, { opacity: 0.6 });
    s += carSide(8, 76.5, 46);
    s += personFront(149, 75.5, 27, C.ink);
    // guides and overall bracket
    s += line(a, 33, a, 84, C.muted, 0.6, { 'stroke-dasharray': '1.6 1.8', opacity: 0.6 }) +
      line(c, 33, c, 84, C.muted, 0.6, { 'stroke-dasharray': '1.6 1.8', opacity: 0.6 }) +
      line(b, 82, b, 86, C.muted, 0.6, { opacity: 0.6 });
    s += dim(a, 31, c, 31, { color: C.ink, tick: 2.6, sw: 1.1 });
    s += label('مسافة التوقف', (a + c) / 2, 21.5, 9.5, C.ink);
    // the two parts
    s += path(rr(a, 88, b - a, 8, [0, 0, 0, 0]), C.gold) + path(rr(b, 88, c - b, 8, [0, 3, 3, 0]), C.red);
    s += circ(a, 92, 7.2, C.pill, { stroke: C.gold, 'stroke-width': 1.3 }) + eyeIcon(a, 92, 0.95, C.gold);
    s += circ(b, 92, 7.2, C.pill, { stroke: C.red, 'stroke-width': 1.3 }) + pedalIcon(b, 92.3, 0.95, C.red);
    s += label('رد الفعل', (a + b) / 2 + 2, 107, 8.5, C.gold) + label('الفرملة', (b + c) / 2 + 2, 107, 8.5, C.red);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 2 and 3. low and high beam
  function beamScene(high, lab) {
    var s = nightRoad(), x0 = 8, y0 = 93, len = 48;
    var L = carPt(x0, y0, len, CAR.lamp);
    // light: air cone + lit road surface, drawn in layers (no gradients)
    var far = high ? 158 : 104;
    if (high) {
      s += path(M([[L[0], L[1] - 1.2], [158, 70], [158, 97], [70, 97.5], [L[0], L[1] + 1.2]]) + 'Z', C.beam, { opacity: 0.1 });
      s += path(M([[L[0], L[1] - 0.8], [158, 77], [158, 92], [L[0], L[1] + 0.8]]) + 'Z', C.beam, { opacity: 0.14 });
      s += path(M([[L[0], L[1] - 0.4], [158, 82], [158, 88], [L[0], L[1] + 0.4]]) + 'Z', C.beam, { opacity: 0.2 });
      s += path('M60,97.4Q110,82 158,80L158,97.4Z', C.beam, { opacity: 0.12 });
    } else {
      s += path(M([[L[0], L[1] - 1], [far, 88.5], [far - 6, 96.8], [62, 97.5], [L[0], L[1] + 1]]) + 'Z', C.beam, { opacity: 0.12 });
      s += path(M([[L[0], L[1] - 0.6], [far - 8, 90.5], [66, 96.8], [L[0], L[1] + 0.6]]) + 'Z', C.beam, { opacity: 0.18 });
      s += path('M58,97.4Q80,88.6 ' + f(far) + ',89.2Q' + f(far - 20) + ',95 58,97.4Z', C.beam, { opacity: 0.28 });
    }
    // centre line: bright where lit
    var x;
    for (x = 4; x < 160; x += 16) {
      var lit = x > 56 && x < far - 4;
      s += line(x, 82.5, x + 8, 82.5, C.lineW, 0.9, { opacity: lit ? 0.75 : 0.14 });
    }
    s += carSide(x0, y0, len, { head: 'on', tail: 'on', body: '#D9D6CC' });
    s += circ(L[0], L[1], 2.2, C.beam, { opacity: 0.5 });
    // dashboard symbol in the corner
    s += tile(122, 9, 30, 22, { fill: C.pill }) + beamIcon(138.5, 20, 1.05, high ? C.dBlue : C.dGreen, high);
    return K.svg(s, VB, lab);
  }
  reg('fig-beam-low', 'الأضواء المنخفضة', function (o, lab) { return beamScene(false, lab); });
  reg('fig-beam-high', 'الأضواء العالية', function (o, lab) { return beamScene(true, lab); });

  // ================================================================== 4. fog: dipped beam + front fog lamps
  reg('fig-fog-lights', 'في الضباب: المنخفضة وأضواء الضباب', function (o, lab) {
    var s = panel('#1A2230'), x0 = 8, y0 = 92, len = 52;
    s += rect(0, 72, 160, 20, 0, '#262C35') + band(92, 120, '#1A1F27') + line(0, 91.8, 160, 91.8, C.kerb, 0.8, { opacity: 0.35 });
    s += roadDashes(80, 4, 160, 8, 8, C.lineW, 0.8, { opacity: 0.3 });
    var L = carPt(x0, y0, len, CAR.lamp), F = carPt(x0, y0, len, CAR.fog);
    // dipped beam (short, down) and fog lamps (wide, flat, low)
    s += path(M([[L[0], L[1] - 0.8], [100, 84], [96, 91.5], [66, 91.5], [L[0], L[1] + 0.8]]) + 'Z', C.beam, { opacity: 0.16 });
    s += path(M([[F[0], F[1] - 0.8], [112, 86.5], [116, 91.6], [62, 91.6], [F[0], F[1] + 0.6]]) + 'Z', C.beam, { opacity: 0.2 });
    s += path('M60,91.6Q90,85.5 116,88.5L116,91.6Z', C.beam, { opacity: 0.2 });
    s += carSide(x0, y0, len, { head: 'on', tail: 'on', fog: 'on' });
    s += circ(L[0], L[1], 2, C.beam, { opacity: 0.55 }) + circ(F[0], F[1], 1.8, C.beam, { opacity: 0.55 });
    // fog bands over the scene
    [[30, 7, 0.1], [45, 8, 0.13], [60, 7, 0.12], [74, 7, 0.1]].forEach(function (b, i) {
      s += rect(i % 2 ? -10 : 8, b[0], 170, b[1], b[1] / 2, '#C9D0DA', { opacity: b[2] });
    });
    s += rect(40, 52, 120, 5, 2.5, '#C9D0DA', { opacity: 0.1 }) + rect(0, 66, 110, 5, 2.5, '#C9D0DA', { opacity: 0.08 });
    // not in fog: high beam, hazard lights while moving
    s += tile(124, 8, 28, 22, { fill: C.pill }) + beamIcon(140, 19, 1, C.dBlue, true) + xMark(138, 19, 6.5, { sw: 2 });
    s += tile(92, 8, 28, 22, { fill: C.pill }) + hazardIcon(106, 19.6, 1, C.dRed) + xMark(106, 19, 6.5, { sw: 2 });
    return K.svg(s, VB, lab);
  });

  // ================================================================== 5. breakdown on the hard shoulder (top-down)
  reg('fig-breakdown', 'تعطلت؟ الفلاشر والمثلث وانتظر خلف الحاجز', function (o, lab) {
    var s = rect(0, 0, 160, 120, 10, C.sand), sc = 7;
    // carriageway (lanes up), shoulder, barrier, sand verge
    s += path(rr(0, 0, 110, 120, [10, 0, 0, 10]), C.asphalt);
    s += rect(110, 0, 22, 120, 0, C.asphaltDark);
    s += rect(108.9, 0, 1.2, 120, 0, C.lineW);
    [83.4, 57.8].forEach(function (x) {
      for (var y = -20; y < 120; y += 63) s += rect(x, y, 1.1, 21, 0, C.lineW, { opacity: 0.9 });
    });
    s += rect(132, 0, 2.2, 120, 0, '#C4CAD2') + rect(131.6, 0, 0.5, 120, 0, '#6B737E');
    for (var y = 4; y < 120; y += 14) s += rect(134.2, y, 1.6, 1.6, 0.3, '#5A6270');
    // traffic still passing in the lanes
    s += carTop(70.5, 84, sc, { body: '#3F6FB5' });
    s += sk('M70.5,64L70.5,56', '#97A1B4', 1.6) + arrowHead(70.5, 53.5, 90, 5, '#97A1B4');
    // our car stopped on the shoulder with hazard lights, triangle well behind it
    var cx = 122.5, cy = 36;
    s += line(cx, cy + 2.3 * sc + 5, cx, 100, C.gold, 1.4, { 'stroke-dasharray': '3.5 3' });
    s += carTop(cx, cy, sc, { me: true, hazard: true });
    s += path('M122.5,97.6L128.2,107.4L116.8,107.4Z', '#FFFFFF', { stroke: C.red, 'stroke-width': 2.2, 'stroke-linejoin': 'round' });
    // people waiting beyond the barrier, ahead of the car
    s += personTop(145, 14, 2.3, '#2E5A9A') + personTop(153, 20, 2.3, '#8A3A34');
    return K.svg(s, VB, lab);
  });

  // ================================================================== 6. tyre tread depth
  function treadSection(x0, x1, top, grooveBottom, grooves, gw) {
    var s = '', base = grooveBottom, bottom = base + 30;
    s += path(rr(x0, base - 1, x1 - x0, bottom - base + 1, [0, 0, 5, 5]), '#23272E', { stroke: '#3A414C', 'stroke-width': 0.8 });
    s += line(x0 + 3, base + 11, x1 - 3, base + 11, '#4E5664', 1, { 'stroke-dasharray': '2.4 1.4' }) +
      line(x0 + 3, base + 16, x1 - 3, base + 16, '#4E5664', 1, { 'stroke-dasharray': '2.4 1.4' });
    // blocks between grooves
    var edges = [x0];
    grooves.forEach(function (gx) { edges.push(gx, gx + gw); });
    edges.push(x1);
    for (var i = 0; i < edges.length; i += 2) {
      var bx0 = edges[i], bx1 = edges[i + 1];
      s += path(rr(bx0, top, bx1 - bx0, base - top + 0.5, [i === 0 ? 0 : 2.5, i === edges.length - 2 ? 0 : 2.5, 0, 0]), '#2E333B',
        { stroke: '#4A515C', 'stroke-width': 0.8 });
    }
    return s;
  }
  reg('fig-tyre-tread', 'عمق نقشة الإطار 1.5 ملم على الأقل', function (o, lab) {
    var s = panel(), top = 50, gb = 68;
    // good tread (right, read first): gauge in one groove, depth in the next
    s += treadSection(56, 152, top, gb, [76, 114], 11);
    // depth gauge standing on the blocks, pin down to the groove floor
    s += rect(69.5, top - 3, 24, 3, 1, '#C9CED6', { stroke: '#6B737E', 'stroke-width': 0.6 }) +
      rect(80.7, top - 4, 1.6, gb - top + 4, 0.6, '#C9CED6') +
      rect(75.5, 16, 12, top - 19, 2.5, '#C9CED6', { stroke: '#6B737E', 'stroke-width': 0.6 }) +
      line(78, 22, 81.5, 22, '#4A515C', 0.7) + line(78, 26, 83.5, 26, '#4A515C', 0.7) + line(78, 30, 81.5, 30, '#4A515C', 0.7) +
      line(78, 34, 83.5, 34, '#4A515C', 0.7) + line(78, 38, 81.5, 38, '#4A515C', 0.7) + line(78, 42, 83.5, 42, '#4A515C', 0.7);
    s += dim(119.5, top, 119.5, gb, { tick: 3.2, sw: 1.5 });
    s += label('1.5 ملم', 119.5, 38, 9, C.gold, { pill: true });
    s += badge(true, 145, 22, 6.5);
    // worn tread (left): almost no groove
    s += treadSection(10, 44, gb - 3.5, gb, [22.5, 33], 2.2);
    s += badge(false, 27, 48, 6.5);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 7. seat belt and head restraint
  reg('fig-seat-belt', 'الحزام ومسند الرأس', function (o, lab) {
    var s = panel();
    // cabin hints: roof, windscreen, dashboard, floor
    s += sk('M18,10L96,10Q104,10 110,16L136,44', '#2E3A4E', 1.4) + path('M112,58L150,52L152,72L118,74Z', '#212B3B') +
      sk('M20,106L150,106', '#2E3A4E', 1.4);
    // seat: head restraint on posts, reclined backrest, cushion
    var seat = '#3A4A63', seatHi = '#50627F';
    s += line(40.5, 34, 42, 40, '#6B737E', 1.4) + line(45.5, 34, 47, 40, '#6B737E', 1.4);
    s += path(rr(34.5, 17.5, 13, 18, [4.5, 4.5, 4.5, 4.5]), seat, { stroke: seatHi, 'stroke-width': 1 });
    s += path('M40,40L52,39Q55,39 55.4,42L60,84L44,88Q40,88 39.6,84L36,45Q36,40 40,40Z', seat, { stroke: seatHi, 'stroke-width': 1 });
    s += path('M44,80L90,76Q95,76 95,81L94,86Q93.6,89 89,89.4L48,92Q42,92 42.6,86Z', seat, { stroke: seatHi, 'stroke-width': 1 });
    s += sk('M49,92L52,106M84,89.6L86,106', '#4A5568', 2);
    // steering wheel and column
    s += sk('M104,68L118,63', '#4A515C', 3);
    s += path('M97.2,47.5Q99.2,46.5 100.6,48.4L108.4,77.2Q109,79.6 106.7,80.4Q104.6,81 104,78.6L96.3,50Q95.8,48.2 97.2,47.5Z', '#5A6270');
    // driver: legs, torso, arms, head
    var cloth = '#7D93B8', trouser = '#46546B';
    s += sk('M60,80L90,78L97,100', trouser, 9) + path(rr(92, 97, 12, 5, [2, 3, 1.5, 1.5]), '#2A2F37');
    s += path('M50,41Q58,39 63.5,43L69,76Q69.4,82 63,83L56,83Q50,83 49.4,77L46.5,47Q46.2,42 50,41Z', cloth);
    s += sk('M58,47L74,64L97,58', cloth, 6.4) + circ(99, 57.6, 3.2, C.skin);
    s += rect(52.5, 34, 6, 8, 2, C.skin);
    s += circ(55.5, 28, 8.6, C.skin) + path('M47,26.5Q48,18.6 56,18.6Q63,18.8 64.2,25Q59,21.8 54,23.4Q50.4,24.8 49.6,30Z', '#3A2A20');
    // seat belt: over the shoulder and chest, low across the hips
    s += sk('M47.5,38.5L55.5,46L62,62L65,79', C.gold, 3.4) + sk('M48,81.5L65,79.5', C.gold, 3.4);
    s += rect(63.2, 76.6, 4.4, 5.4, 1.2, '#B8BEC8') + circ(46.8, 38.2, 1.8, '#6B737E');
    // checks
    s += badge(true, 22, 26, 6.5) + badge(true, 80, 34, 6.5);
    s += sk('M28.5,26L33.5,26.5', C.ok, 0.9, { opacity: 0.6 }) + sk('M74,37.5L66,50', C.ok, 0.9, { opacity: 0.6 });
    return K.svg(s, VB, lab);
  });

  // ================================================================== 8. child seat in the rear
  reg('fig-child-seat', 'الطفل في مقعده في الخلف', function (o, lab) {
    var s = panel(), gy = 104;
    // cut-away car body (facing right): shell outline, interior dark
    var shell = 'M26,96L25,80Q25,70 31,66L47,62L60,42Q63,38 69,38L109,38Q114,38 118,42L132,60L148,64Q155,66 155,74L155,92Q155,96 151,96Z';
    s += path(shell, '#0F1520', { stroke: C.gold, 'stroke-width': 1.6, 'stroke-linejoin': 'round' });
    s += sk('M49,63L61,44Q63.5,41 68,41L108,41Q112,41 115,44L129,61', '#1F2A3C', 1.2);
    s += sk('M92,41L92,90', '#1F2A3C', 1.2);
    s += wheelSide(45, gy - 9, 9) + wheelSide(133, gy - 9, 9);
    s += rect(29, 88, 124, 4, 1.5, '#1F2733');
    // front passenger seat, empty
    var seat = '#3A4A63', seatHi = '#50627F';
    s += path('M103,56Q105,52 108,52Q111,52 111,56L109,66L104,66Z', seat, { stroke: seatHi, 'stroke-width': 0.8 });
    s += path('M103,66L110,66L108,84L101,86Z', seat, { stroke: seatHi, 'stroke-width': 0.8 });
    s += path('M101,80L126,78Q129,78 129,81L128,85L101,87Z', seat, { stroke: seatHi, 'stroke-width': 0.8 });
    // rear bench
    s += path('M52,56Q53,52 57,52Q61,52 61,56L60,84L50,86Z', seat, { stroke: seatHi, 'stroke-width': 0.8 });
    s += path('M50,80L88,78Q91,78 91,81L90,85L50,87Z', seat, { stroke: seatHi, 'stroke-width': 0.8 });
    // child seat (forward facing) with the child, harness
    s += path('M60,52Q61,47 66,47L71,47Q75,47 75,51L74,62L79,64Q82,65 82,68L82,76Q82,80 78,80L62,80Q58,80 58.4,76Z', '#7A4E86',
      { stroke: '#A77AB3', 'stroke-width': 0.8 });
    s += circ(69.5, 55, 5.2, C.skin) + path('M64.4,54Q64.8,49.4 69.6,49.4Q74,49.6 74.6,53.6Q71,51.8 67.6,52.8Q65.6,53.6 65.2,56.2Z', '#3A2A20');
    s += path('M65,61Q69,59.5 73,61L74,73L66,74Z', '#8FB4D8') + sk('M72,74L79,74L81,82', '#46546B', 4);
    s += sk('M66.4,61L69,72M72.4,61L70.4,72', C.gold, 1.5) + circ(69.8, 71.4, 1.4, C.gold);
    // height ruler beside the child with the 145 cm mark
    s += rect(9, 20, 7, 84, 1.2, '#E8DFC6') ;
    for (var i = 0; i <= 14; i++) {
      var yy = 104 - i * 5.6;
      s += line(9, yy, i % 2 ? 11.4 : 13, yy, '#6B5A3A', 0.6);
    }
    s += line(7, 26, 20, 26, C.gold, 1.8) + label('145 سم', 34.5, 26, 8.5, C.gold, { pill: true });
    s += line(20, 47, 60, 47, C.muted, 0.6, { 'stroke-dasharray': '1.6 1.6', opacity: 0.8 });
    s += badge(true, 142, 20, 6.5);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 9. aquaplaning
  reg('fig-aquaplaning', 'الانزلاق المائي', function (o, lab) {
    var s = panel(), cx = 70, cy = 58, r = 32, road = 97;
    s += band(road, 120, C.asphalt) + line(0, road, 160, road, '#5A6270', 1);
    // spray thrown behind the tyre
    s += sk('M40,90Q24,78 10,58', C.waterHi, 1.4, { opacity: 0.5 }) + sk('M44,92Q26,86 8,78', C.waterHi, 1.4, { opacity: 0.45 }) +
      sk('M38,86Q30,70 24,52', C.waterHi, 1.2, { opacity: 0.4 });
    [[16, 64, 1.4], [22, 58, 1], [12, 72, 1.2], [28, 66, 1.1], [18, 80, 1.3], [30, 76, 0.9], [8, 66, 0.9], [24, 50, 0.9], [34, 58, 0.8]]
      .forEach(function (d) { s += circ(d[0], d[1], d[2], C.waterHi, { opacity: 0.8 }); });
    // water film on the road and the wedge building up in front of the tyre
    s += rect(0, road - 4.2, 160, 4.2, 0, C.water, { opacity: 0.85 });
    s += path('M160,' + f(road - 4.2) + 'L112,' + f(road - 4.2) + 'Q101,' + f(road - 5) + ' 94.5,' + f(cy + 22.6) +
      'L94,' + f(road) + 'L160,' + f(road) + 'Z', C.water);
    // tyre lifted onto the water
    s += circ(cx, cy, r, C.tyre);
    for (var a = 0; a < 360; a += 15) {
      var p = arcPt(cx, cy, r - 0.4, a), q = arcPt(cx, cy, r - 4.2, a);
      s += line(p[0], p[1], q[0], q[1], '#3A414C', 1.6);
    }
    s += circ(cx, cy, r * 0.62, C.rim) + circ(cx, cy, r * 0.5, '#2A3038');
    for (var k = 0; k < 5; k++) {
      var sp = arcPt(cx, cy, r * 0.5, 90 + k * 72);
      s += line(cx, cy, sp[0], sp[1], C.rim, 3.2);
    }
    s += circ(cx, cy, 4, C.rim) + circ(cx, cy, 1.6, C.hub);
    s += path('M' + f(cx - 26) + ',' + f(road - 4.2) + 'Q' + f(cx) + ',' + f(road - 6.6) + ' ' + f(cx + 26) + ',' + f(road - 4.2) +
      'L' + f(cx + 26) + ',' + f(road) + 'L' + f(cx - 26) + ',' + f(road) + 'Z', C.water, { opacity: 0.9 });
    s += sk('M100,' + f(road - 4.6) + 'Q110,' + f(road - 5.2) + ' 124,' + f(road - 4.6), C.waterHi, 1, { opacity: 0.9 });
    // direction of travel, speed
    s += sk('M112,60L128,60', C.muted, 1.4) + arrowHead(131, 60, 0, 5, C.muted);
    s += speedoIcon(138, 24, 11);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 10. flood water depth
  reg('fig-water-depth', 'لا تدخل ماء أعلى من نصف الإطار', function (o, lab) {
    var s = panel(), gy = 102, x0 = 6, len = 132, k = len / 100;
    var wr = CAR.wr * k, fx = x0 + 80 * k, waterY = gy - wr;
    s += band(gy, 120, '#1E232B');
    s += carSide(x0, gy, len, { shadow: false, sw: 1 });
    // water up to half the tyre (axle height)
    s += band(waterY, 120, C.water, { opacity: 0.5 });
    s += sk('M0,' + f(waterY) + 'Q8,' + f(waterY - 1.2) + ' 16,' + f(waterY) + 'T32,' + f(waterY) + 'T48,' + f(waterY) + 'T64,' + f(waterY) +
      'T80,' + f(waterY) + 'T96,' + f(waterY) + 'T112,' + f(waterY) + 'T128,' + f(waterY) + 'T144,' + f(waterY) + 'T160,' + f(waterY),
      C.waterHi, 1.4);
    // gold mark on the front wheel: full tyre height, half at the axle
    s += dim(fx, gy, fx, gy - 2 * wr, { tick: 3, sw: 1.1, halo: true });
    s += line(fx - 4.5, waterY, fx + 4.5, waterY, C.gold, 1.8);
    // deeper water: not allowed
    var deep = gy - 2 * wr - 8;
    s += line(4, deep, 138, deep, C.red, 1.6, { 'stroke-dasharray': '4 3' });
    s += badge(false, 148, deep, 7);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 11. dashboard warning colours
  function oilIcon(cx, cy, s, col) {
    var q = path('M-7.5,-1.5L1.5,-1.5L4,0.5L10,-3.4L10.8,-2.4L4.6,4.2L-7.5,4.2Z', col) +
      rect(-3.6, -3.6, 3.2, 2.4, 0.6, col) + sk('M-7.5,-0.6L-10,-1.6L-10.6,1.4L-7.5,2.6', col, 1.2) +
      path('M10.8,1.2Q12.2,3.2 12.2,4.1Q12.2,5.4 10.8,5.4Q9.4,5.4 9.4,4.1Q9.4,3.2 10.8,1.2Z', col);
    return g(q, tr(cx, cy, s));
  }
  function batteryIcon(cx, cy, s, col) {
    var q = rect(-8, -4.2, 16, 9.6, 1.2, col) + rect(-6, -6, 3.6, 2, 0.5, col) + rect(2.4, -6, 3.6, 2, 0.5, col) +
      line(-5.6, 0.6, -2.4, 0.6, C.pill, 1.2) + line(2.4, 0.6, 5.6, 0.6, C.pill, 1.2) + line(4, -1, 4, 2.2, C.pill, 1.2);
    return g(q, tr(cx, cy, s));
  }
  function tempIcon(cx, cy, s, col) {
    var q = rect(-1.3, -7.4, 2.6, 9, 1.3, col) + circ(0, 2.4, 2.5, col) +
      line(2.6, -6, 5.4, -6, col, 1) + line(2.6, -3.6, 5.4, -3.6, col, 1) + line(2.6, -1.2, 5.4, -1.2, col, 1) +
      sk('M-8,6Q-6,4.6 -4,6T0,6T4,6T8,6', col, 1.2) + sk('M-8,8.6Q-6,7.2 -4,8.6T0,8.6T4,8.6T8,8.6', col, 1.2);
    return g(q, tr(cx, cy, s));
  }
  function engineIcon(cx, cy, s, col) {
    var q = sk('M-6.5,-2.2L-4.5,-2.2L-4.5,-4.4L-1.5,-4.4L-1.5,-6L2.6,-6L2.6,-4.4L5.2,-4.4L7,-2.4L8.8,-2.4L8.8,3.4L7,3.4L5.2,5.6' +
      'L-3.2,5.6L-4.6,3.6L-6.5,3.6Z', col, 1.4) + line(-6.5, 0.7, -9.2, 0.7, col, 1.4) + line(-9.2, -1.8, -9.2, 3.2, col, 1.4);
    return g(q, tr(cx, cy, s));
  }
  function absIcon(cx, cy, s, col) {
    var q = circ(0, 0, 6.4, 'none', { stroke: col, 'stroke-width': 1.3 }) +
      sk('M-8.4,-4.4Q-10.6,0 -8.4,4.4M8.4,-4.4Q10.6,0 8.4,4.4', col, 1.3) +
      K.text('ABS', 0, 0.3, 4.6, { fill: col, weight: 700, family: 'latin', anchor: 'middle' });
    return g(q, tr(cx, cy, s));
  }
  function tpmsIcon(cx, cy, s, col) {
    var q = sk('M-5.6,-5.8Q-8.6,-1.5 -6.6,4.2L6.6,4.2Q8.6,-1.5 5.6,-5.8', col, 1.4) +
      line(-5.4, 6.4, -5.4, 4.4, col, 1.2) + line(-1.8, 6.4, -1.8, 4.4, col, 1.2) + line(1.8, 6.4, 1.8, 4.4, col, 1.2) +
      line(5.4, 6.4, 5.4, 4.4, col, 1.2) + line(0, -3.8, 0, -0.2, col, 1.5) + circ(0, 1.9, 0.9, col);
    return g(q, tr(cx, cy, s));
  }
  function indicatorIcon(cx, cy, s, col) {
    var q = path('M-9.5,0L-4.5,-4.2L-4.5,-1.6L-1.8,-1.6L-1.8,1.6L-4.5,1.6L-4.5,4.2Z', col) +
      path('M9.5,0L4.5,-4.2L4.5,-1.6L1.8,-1.6L1.8,1.6L4.5,1.6L4.5,4.2Z', col);
    return g(q, tr(cx, cy, s));
  }
  reg('fig-dash-lights', 'ألوان أضواء لوحة العدادات', function (o, lab) {
    var s = panel(), w = 46, gap = 5, x0 = (160 - 3 * w - 2 * gap) / 2, top = 8, h = 84;
    // right to left: red (stop), amber (check soon), green (information)
    var cols = [
      { col: C.dRed, word: 'توقف', icons: [oilIcon, batteryIcon, tempIcon] },
      { col: C.dAmber, word: 'افحص قريبا', icons: [engineIcon, absIcon, tpmsIcon] },
      { col: C.dGreen, word: 'معلومة', icons: [function (x, y, k, c) { return beamIcon(x + 0.6, y, k * 0.95, c, false); }, indicatorIcon] }
    ];
    cols.forEach(function (c, i) {
      var x = x0 + (2 - i) * (w + gap), mx = x + w / 2;
      s += rect(x, top, w, h, 9, C.pill, { stroke: c.col, 'stroke-width': 1.4 }) + rect(x, top, w, h, 9, c.col, { opacity: 0.08 });
      var n = c.icons.length, step = n === 3 ? 25 : 30, y0 = top + h / 2 - step * (n - 1) / 2;
      c.icons.forEach(function (fn, j) { s += fn(mx, y0 + j * step, 1.25, c.col); });
      s += label(c.word, mx, top + h + 13, 9, c.col);
    });
    return K.svg(s, VB, lab);
  });

  // ================================================================== 12. automatic gear selector
  reg('fig-gear-selector', 'غيارات الأوتوماتيك', function (o, lab) {
    var s = panel(), rows = [['P', 'وقوف'], ['R', 'رجوع'], ['N', 'محايد'], ['D', 'قيادة']], y0 = 22, step = 24;
    s += rect(46, 7, 104, 106, 12, '#1A2231', { stroke: '#2F3B50', 'stroke-width': 1 });
    s += rect(58, 14, 9, 92, 4.5, '#0A0E15', { stroke: '#2F3B50', 'stroke-width': 0.8 });
    // highlight D
    var dy = y0 + 3 * step;
    s += rect(72, dy - 10, 72, 20, 7, C.gold, { opacity: 0.14 }) + rect(72, dy - 10, 72, 20, 7, 'none', { stroke: C.gold, 'stroke-width': 1 });
    rows.forEach(function (r, i) {
      var y = y0 + i * step, on = r[0] === 'D';
      s += txt(r[0], 84, y, 14, on ? C.gold : C.ink, { latin: true });
      s += label(r[1], 118, y + 0.5, 9.5, on ? C.gold : C.muted);
    });
    // lever knob in D
    s += rect(54, dy - 7, 17, 14, 5, '#2A3140', { stroke: C.gold, 'stroke-width': 1.4 }) + rect(57.5, dy - 2, 10, 4, 2, '#3C4556');
    // brake pedal beside P and R
    s += sk('M40,' + f(y0) + 'L36,' + f(y0) + 'L36,' + f(y0 + step) + 'L40,' + f(y0 + step), C.red, 1.2);
    s += circ(20, y0 + step / 2, 12, C.pill, { stroke: C.red, 'stroke-width': 1.2 }) + pedalIcon(20, y0 + step / 2 + 0.6, 1.35, C.red);
    s += line(32, y0 + step / 2, 36, y0 + step / 2, C.red, 1.2);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 13. no phone in the hand
  reg('fig-no-phone', 'لا هاتف في يدك أثناء القيادة', function (o, lab) {
    var s = panel(), x0 = 26, y0 = 6, w = 108, h = 108;
    s += rect(x0, y0, w, h, 20, '#1A1E28');
    // steering wheel (top of the rim)
    s += sk('M36,110A50,50 0 0 1 124,110', '#4A515C', 10) + sk('M38.5,104.5A47,47 0 0 1 121.5,104.5', '#5E6673', 1.6, { opacity: 0.8 });
    // hand holding a phone above the wheel
    s += path('M64,62Q62,76 66,86L70,98L92,98L94,84Q99,72 97,58Z', C.skin);
    s += rect(65, 18, 30, 52, 6, '#101521', { stroke: '#394356', 'stroke-width': 1.2 }) + rect(68, 23, 24, 41, 3, '#3D6FB0') +
      rect(70.5, 27, 19, 3, 1.5, '#8DBDF0', { opacity: 0.8 }) + rect(70.5, 33, 13, 3, 1.5, '#8DBDF0', { opacity: 0.6 }) +
      rect(70.5, 39, 16, 3, 1.5, '#8DBDF0', { opacity: 0.6 }) + circ(80, 20.6, 0.9, '#394356');
    s += path(rr(60.5, 40, 7.5, 6, [3, 1, 1, 3]), C.skin) + path(rr(60, 47.5, 8, 6, [3, 1, 1, 3]), C.skin) +
      path(rr(60.5, 55, 7.5, 6, [3, 1, 1, 3]), C.skin);
    s += path('M93,70L93,50Q93,46 96,46Q99,46 99,50L99,66Q99,74 94,78Z', C.skin);
    // red rounded square frame and bar
    s += rect(x0 + 2.5, y0 + 2.5, w - 5, h - 5, 18, 'none', { stroke: C.red, 'stroke-width': 5 });
    s += line(x0 + 15, y0 + 15, x0 + w - 15, y0 + h - 15, C.red, 8);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 14. mirror, signal, head check
  function mirrorIcon(cx, cy) {
    var s = '';
    s += path('M4,6L14,4L14,10L4,11Z', '#3A414C');
    s += path('M-14,-9Q-14,-12 -11,-12L7,-12Q11,-12 11,-8L10,8Q10,11 6,11L-11,11Q-14,11 -14,8Z', '#3A414C', { stroke: '#5A6270', 'stroke-width': 0.8 });
    s += path('M-12,-8Q-12,-10 -10,-10L6,-10Q9,-10 8.8,-7.4L8.2,6.6Q8,9 5.6,9L-10,9Q-12,9 -12,7Z', '#9FB4CC');
    // car behind, reflected (front view)
    s += path('M-7,4L-6,-1Q-5.5,-3 -3.5,-3L1.5,-3Q3.5,-3 4,-1L5,4Z', '#3F6FB5') + rect(-8, 1, 14, 5, 1.5, '#3F6FB5') +
      path('M-5,-0.6L-4.4,-2Q-4.1,-2.4 -3.4,-2.4L1.4,-2.4Q2.1,-2.4 2.4,-2L3,-0.6Z', '#1B2230') +
      rect(-7, 2.2, 2.6, 1.4, 0.6, C.lampOn) + rect(3, 2.2, 2.6, 1.4, 0.6, C.lampOn) + rect(-7.4, 6, 2.2, 2, 0.5, '#222') + rect(3.6, 6, 2.2, 2, 0.5, '#222');
    return g(s, tr(cx, cy, 1));
  }
  function signalIcon(cx, cy) {
    var s = path('M-10,0L-1,-8.5L-1,-3.8L9,-3.8L9,3.8L-1,3.8L-1,8.5Z', C.amber);
    s += flash(-1, 0, 11.5, 15, [60, 90, 120, 240, 270, 300], C.amber, 1.2);
    return g(s, tr(cx, cy, 1));
  }
  function headCheckIcon(cx, cy) {
    var s = '';
    s += path('M-15,15Q-15,6 -8,4L8,4Q15,6 15,15Z', '#7D93B8');
    s += rect(-3, -1, 6, 6, 2, C.skin);
    s += circ(0, -6, 7.2, C.skin) + path('M-2,-13Q6,-13.6 7.2,-6Q7.2,-0.6 3.8,1.4Q2.4,-4 -1,-6.4Q-2.8,-8 -2,-13Z', '#3A2A20') +
      path('M-7,-6.4L-9.4,-4.2L-6.8,-3.4Z', C.skin) + circ(-4.2, -7.4, 0.9, '#1B2230');
    s += sk('M8,-15Q2,-21 -8,-18.5Q-13,-17 -15,-11.5', C.gold, 1.6) + arrowHead(-15.6, -9.6, 250, 5, C.gold);
    return g(s, tr(cx, cy, 1));
  }
  reg('fig-lane-change', 'مرآة ثم إشارة ثم التفاتة', function (o, lab) {
    var s = panel(), w = 42, gap = 11, x0 = (160 - 3 * w - 2 * gap) / 2, top = 22, h = 80;
    var draw = [mirrorIcon, signalIcon, headCheckIcon];
    for (var i = 0; i < 3; i++) {
      var x = x0 + (2 - i) * (w + gap), mx = x + w / 2;
      s += tile(x, top, w, h, { r: 8 });
      s += draw[i](mx, top + h / 2 + 4);
      s += circ(mx, top, 7.5, C.gold) + txt(String(i + 1), mx, top + 0.4, 10, C.pill, { latin: true, weight: 800 });
      if (i < 2) {
        var ax = x - gap / 2;
        s += line(ax + 3.2, top + h / 2 + 4, ax - 1.4, top + h / 2 + 4, C.gold, 1.2) + arrowHead(ax - 2.4, top + h / 2 + 4, 180, 4, C.gold);
      }
    }
    return K.svg(s, VB, lab);
  });

  // ================================================================== 15. black points gauge
  reg('fig-black-points', 'النقاط السوداء: 24 نقطة تعني حجز الرخصة', function (o, lab) {
    var s = panel(), cy = 58, r = 2.3, pitch = 5.05, gapX = 2.6, xr = 150;
    // light track, right to left
    s += rect(38, cy - 7, 116, 14, 7, '#D8D3C4');
    var x = xr - 3, n;
    for (n = 1; n <= 23; n++) {
      s += circ(x, cy, r, '#151515');
      x -= pitch;
      if (n % 4 === 0) x -= gapX;
    }
    // the 24th point: licence withheld
    var mx = 22;
    s += circ(mx, cy, 15, C.red, { opacity: 0.18 }) + circ(mx, cy, 15, 'none', { stroke: C.red, 'stroke-width': 1.6 });
    s += licenceCard(mx - 1.5, cy - 1, 1.05) + lockIcon(mx + 6.5, cy + 4.5, 0.95, C.red);
    s += sk('M' + f(x + 3.5) + ',' + f(cy) + 'L38.5,' + f(cy), C.red, 1.2, { 'stroke-dasharray': '1.5 1.5' });
    // ends
    s += txt('0', xr - 3, cy + 17, 10, C.ink, { latin: true });
    s += txt('24', mx, cy + 26, 11, C.red, { latin: true });
    s += sk('M140,' + f(cy - 16) + 'L48,' + f(cy - 16), C.gold, 1.2) + arrowHead(45, cy - 16, 180, 5, C.gold);
    return K.svg(s, VB, lab);
  });
})();
