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
  // panel-coloured cover over everything outside a region (even-odd hole), so a drawing can look cropped
  // by a frame without clip paths
  function cover(holeD, fill) {
    return path(rr(0, 0, 160, 120, [10, 10, 10, 10]) + holeD, fill || C.panel, { 'fill-rule': 'evenodd' });
  }
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

  // car seat, side view facing RIGHT; origin = rear bottom of the cushion. o: restraint:false, back (backrest top, local y)
  var SEAT = '#3A4A63', SEAT_HI = '#50627F';
  function seatSide(x, y, s, o) {
    o = o || {};
    var q = '', st = { stroke: SEAT_HI, 'stroke-width': 1 };
    if (o.restraint !== false) {
      q += line(-4, -56, -2.6, -50, '#6B737E', 1.4) + line(0.6, -56, 2, -50, '#6B737E', 1.4) +
        path(rr(-11, -72.5, 13, 18, [4.5, 4.5, 4.5, 4.5]), SEAT, st);
    }
    q += path('M-4,-50L8,-51Q11,-51 11.4,-48L16,-6L0,-2Q-4,-2 -4.4,-6L-8,-45Q-8,-50 -4,-50Z', SEAT, st);
    q += path('M0,-10L46,-14Q51,-14 51,-9L50,-4Q49.6,-1 45,-0.6L4,2Q-2,2 -1.4,-4Z', SEAT, st);
    return g(q, tr(x, y, s));
  }

  // ------------------------------------------------------------------ icons (centred at 0,0 unless noted)
  function eyeIcon(cx, cy, s, col, bg) {
    var q = sk('M-5,0Q0,-4.4 5,0Q0,4.4 -5,0Z', col, 1.1) + circ(0, 0, 2, col) + circ(0, 0, 0.8, bg || C.pill);
    return g(q, tr(cx, cy, s));
  }
  // brake pedal: wide ribbed pad on an arm hanging from a pivot
  function pedalIcon(cx, cy, s, col, rib) {
    var q = sk('M1.8,-5.8L0.2,-1.2', col, 1.3) + circ(1.9, -5.9, 1.1, col) +
      path(rr(-4.6, -1.8, 9.2, 5.6, [1.4, 1.4, 1.4, 1.4]), col) +
      line(-3, 0.2, 3, 0.2, rib || C.pill, 0.7) + line(-3, 2, 3, 2, rib || C.pill, 0.7);
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
  // night side scene: sky, far desert, road band (y 76..104), near verge
  function nightRoad() {
    var s = panel(C.night);
    [[12, 12, 0.6], [34, 7, 0.5], [57, 16, 0.7], [83, 9, 0.5], [104, 24, 0.6], [22, 34, 0.5], [70, 40, 0.4], [150, 46, 0.5],
      [44, 52, 0.4], [96, 50, 0.4]].forEach(function (p) { s += circ(p[0], p[1], p[2], C.ink, { opacity: 0.55 }); });
    s += path('M0,62Q22,56 44,60T88,59T132,58T160,60L160,73L0,73Z', '#0F1520');
    s += rect(0, 72, 160, 32, 0, '#1C2027') + line(0, 72.4, 160, 72.4, C.kerb, 0.7, { opacity: 0.25 });
    s += band(104, 120, '#0D1118') + line(0, 104, 160, 104, C.kerb, 0.8, { opacity: 0.35 });
    return s;
  }
  // light as stacked translucent polygons (no gradients): [[points], opacity]
  function glow(layers, col) {
    return layers.map(function (l) { return path(M(l[0]) + 'Z', col || C.beam, { opacity: l[1] }); }).join('');
  }
  // roadside reflector post on the near verge; lit posts glow
  function post(x, lit) {
    return rect(x - 0.8, 95.5, 1.6, 8.8, 0.4, lit ? '#B8BEC8' : '#343A44') +
      (lit ? circ(x, 97.2, 3.2, C.amber, { opacity: 0.3 }) : '') +
      rect(x - 1.1, 96, 2.2, 2.6, 0.5, lit ? C.amber : '#4A4234');
  }
  function roadDashes(y, x0, x1, dash, gap, col, sw, o) {
    var s = '', x;
    for (x = x0; x < x1; x += dash + gap) s += line(x, y, Math.min(x + dash, x1), y, col, sw, o);
    return s;
  }

  // ================================================================== 1. stopping distance
  reg('fig-stopping-distance', 'مسافة التوقف: رد الفعل ثم الفرملة', function (o, lab) {
    var a = 54, b = 88, c = 139, s = panel(), ry = 63;
    // road, side view
    s += rect(0, ry, 160, 14, 0, C.asphalt) + line(0, ry + 0.4, 160, ry + 0.4, C.kerb, 0.7, { opacity: 0.45 }) +
      roadDashes(ry + 5.5, 4, 160, 9, 7, C.lineW, 0.9, { opacity: 0.55 }) + line(0, ry + 13.6, 160, ry + 13.6, C.kerb, 0.9);
    // motion lines, our car at the moment the driver sees the hazard, the hazard
    s += line(1.5, ry - 5.5, 6, ry - 5.5, C.muted, 0.9, { opacity: 0.6 }) + line(0.5, ry - 1.5, 5.5, ry - 1.5, C.muted, 0.9, { opacity: 0.6 }) +
      line(2, ry + 2.5, 6.5, ry + 2.5, C.muted, 0.9, { opacity: 0.6 });
    s += carSide(8, ry + 10.5, 46);
    s += personFront(149, ry + 9.5, 27, C.ink);
    // guides and the overall bracket
    s += line(a, 31, a, 83, C.muted, 0.6, { 'stroke-dasharray': '1.6 1.8', opacity: 0.6 }) +
      line(c, 31, c, 83, C.muted, 0.6, { 'stroke-dasharray': '1.6 1.8', opacity: 0.6 }) +
      line(b, ry + 15, b, 83, C.muted, 0.6, { opacity: 0.7 });
    s += dim(a, 29, c, 29, { color: C.ink, tick: 2.6, sw: 1.1 });
    s += label('مسافة التوقف', (a + c) / 2, 19.5, 9.5, C.ink);
    // the two parts, end to end: reaction (eye) then braking (pedal)
    s += path(rr(a, 84, b - a, 11, [3, 0, 0, 3]), C.gold) + path(rr(b, 84, c - b, 11, [0, 3, 3, 0]), C.red);
    s += line(b, 84, b, 95, C.pill, 0.8, { opacity: 0.6 });
    s += eyeIcon(a + 7.2, 89.5, 0.95, C.pill, C.gold) + pedalIcon(b + 7, 90, 0.95, '#FFFFFF', C.red);
    s += label('رد الفعل', (a + b) / 2, 105.5, 8.5, C.gold) + label('الفرملة', (b + c) / 2, 105.5, 8.5, C.red);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 2 and 3. low and high beam
  function beamScene(high, lab) {
    var s = nightRoad(), x0 = 4, y0 = 100, len = 60;
    var L = carPt(x0, y0, len, CAR.lamp), lx = L[0], ly = L[1];
    // how far the light reaches along the road
    var reach = high ? 160 : 116;
    if (high) {
      // main beam: long and straight, lights the road and the air far ahead
      s += glow([
        [[[lx, ly - 1.4], [160, 60], [160, 103.8], [84, 103.8], [lx, ly + 1.4]], 0.08],
        [[[lx, ly - 1], [160, 70], [160, 100], [lx, ly + 1]], 0.09],
        [[[lx, ly - 0.7], [160, 78], [160, 95], [lx, ly + 0.7]], 0.11],
        [[[lx, ly - 0.4], [160, 83.5], [160, 90.5], [lx, ly + 0.4]], 0.14]
      ]);
      s += path('M66,103.8Q110,93 160,91.8L160,103.8Z', C.beam, { opacity: 0.16 });
    } else {
      // dipped beam: short, angled down onto the road
      s += glow([
        [[[lx, ly - 1], [117, 95.4], [111, 103.8], [68, 103.8], [lx, ly + 1]], 0.1],
        [[[lx, ly - 0.7], [104, 96.4], [72, 103.4], [lx, ly + 0.7]], 0.13],
        [[[lx, ly - 0.4], [89, 96.6], [70, 101.4], [lx, ly + 0.4]], 0.16]
      ]);
      s += path('M64,103.8Q92,95 118,95.8Q98,104.2 64,103.8Z', C.beam, { opacity: 0.26 });
    }
    // centre line: bright only where the light reaches
    for (var x = 2; x < 160; x += 16) {
      var lit = x > 62 && x < reach - 6;
      s += line(x, 88, Math.min(x + 8, 159), 88, C.lineW, 0.9, { opacity: lit ? 0.8 : 0.12 });
    }
    s += carSide(x0, y0, len, { head: 'on', tail: 'on', body: '#D9D6CC' });
    s += circ(lx, ly, 2.4, C.beam, { opacity: 0.55 });
    [82, 106, 130, 153].forEach(function (px) { s += post(px, px < reach - 4); });
    // dashboard symbol in the corner
    s += tile(122, 9, 30, 22, { fill: C.pill }) + beamIcon(138.5, 20, 1.05, high ? C.dBlue : C.dGreen, high);
    return K.svg(s, VB, lab);
  }
  reg('fig-beam-low', 'الأضواء المنخفضة', function (o, lab) { return beamScene(false, lab); });
  reg('fig-beam-high', 'الأضواء العالية', function (o, lab) { return beamScene(true, lab); });

  // ================================================================== 4. fog: dipped beam + front fog lamps
  reg('fig-fog-lights', 'في الضباب: المنخفضة وأضواء الضباب', function (o, lab) {
    var s = panel('#1A212D'), x0 = 4, y0 = 99, len = 58, i;
    // fog: the air gets paler toward the horizon, the far road fades out
    s += rect(0, 34, 160, 12, 0, '#1F2733') + rect(0, 46, 160, 12, 0, '#252E3B') + rect(0, 58, 160, 16, 0, '#2C3543');
    s += rect(0, 73, 160, 30, 0, '#262C35') + line(0, 73.4, 160, 73.4, C.kerb, 0.6, { opacity: 0.2 });
    s += band(103, 120, '#1B2029') + line(0, 103, 160, 103, C.kerb, 0.8, { opacity: 0.35 });
    for (i = 0; i < 10; i++) {
      var dx = 2 + i * 16;
      s += line(dx, 87, Math.min(dx + 8, 159), 87, C.lineW, 0.9, { opacity: Math.max(0.04, 0.6 - i * 0.075) });
    }
    var L = carPt(x0, y0, len, CAR.lamp), F = carPt(x0, y0, len, CAR.fog);
    // dipped headlamps: short, angled down
    s += glow([
      [[[L[0], L[1] - 0.8], [104, 94], [99, 102.8], [70, 102.8], [L[0], L[1] + 0.8]], 0.13],
      [[[L[0], L[1] - 0.5], [90, 95.5], [72, 101.6], [L[0], L[1] + 0.5]], 0.15]
    ]);
    // front fog lamps: wide, flat, hugging the road
    s += glow([
      [[[F[0], F[1] - 0.9], [108, 97], [116, 102.8], [64, 102.8], [F[0], F[1] + 0.6]], 0.16],
      [[[F[0], F[1] - 0.5], [96, 98.4], [100, 102.6], [66, 102.6], [F[0], F[1] + 0.4]], 0.18]
    ]);
    s += path('M62,102.8Q90,98 118,99.4L118,102.8Z', C.beam, { opacity: 0.18 });
    s += carSide(x0, y0, len, { head: 'on', tail: 'on', fog: 'on' });
    s += circ(L[0], L[1], 2.3, C.beam, { opacity: 0.6 }) + circ(F[0], F[1], 2.1, C.beam, { opacity: 0.6 });
    // fog wisps drifting over the whole scene (thin, faint, overlapping)
    [[96, 40, 58, 2.6, 0.08], [44, 47, 38, 2.2, 0.07], [118, 52, 38, 2.4, 0.09], [70, 58, 56, 2.6, 0.08], [28, 64, 26, 2.2, 0.08],
      [124, 66, 34, 2.6, 0.1], [84, 74, 44, 2.4, 0.08], [40, 80, 34, 2.2, 0.07], [128, 84, 30, 2.6, 0.1], [98, 92, 40, 2.4, 0.08],
      [58, 70, 20, 1.8, 0.07], [146, 76, 12, 2, 0.08]].forEach(function (w) {
      s += ell(w[0], w[1], w[2], w[3], '#D5DBE3', { opacity: w[4] });
    });
    // not in fog: high beam, hazard lights while moving
    s += tile(124, 8, 28, 22, { fill: C.pill }) + beamIcon(140.5, 19, 1, C.dBlue, true) + xMark(138, 19, 6, { sw: 1.8 });
    s += tile(92, 8, 28, 22, { fill: C.pill }) + hazardIcon(106, 19.8, 1, C.ink) + xMark(106, 19, 6, { sw: 1.8 });
    return K.svg(s, VB, lab);
  });

  // ================================================================== 5. breakdown on the hard shoulder (top-down)
  reg('fig-breakdown', 'تعطلت؟ الفلاشر والمثلث وانتظر خلف الحاجز', function (o, lab) {
    // 8 units per metre: lanes 3.5 m, hard shoulder 3 m. Traffic drives UP; the shoulder is on the RIGHT
    var s = rect(0, 0, 160, 120, 10, C.sand), sc = 8, y;
    s += path(rr(0, 0, 120, 120, [10, 0, 0, 10]), C.asphalt);
    s += rect(96, 0, 24, 120, 0, C.asphaltDark);
    s += rect(94.6, 0, 1.3, 120, 0, C.lineW);
    // broken lane lines (3 m dash, 6 m gap), cut at the picture edges
    [[65.4, 6], [36.6, 42], [7.8, 22]].forEach(function (l) {
      for (y = l[1] - 72; y < 120; y += 72) {
        var y0 = Math.max(0, y), y1 = Math.min(120, y + 24);
        if (y1 > y0 + 0.5) s += rect(l[0], y0, 1.2, y1 - y0, 0, C.lineW, { opacity: 0.9 });
      }
    });
    // crash barrier with its posts, sand beyond
    s += rect(120, 0, 3, 120, 0, '#C4CAD2') + rect(119.6, 0, 0.6, 120, 0, '#6B737E');
    for (y = 5; y < 118; y += 12) s += rect(123.3, y, 1.8, 1.8, 0.3, '#5A6270');
    // traffic still passing close by
    s += carTop(80.6, 92, sc, { body: '#B8BEC8' });
    s += sk('M80.6,70L80.6,62.5', C.muted, 1.6) + arrowHead(80.6, 60, 90, 5, C.muted);
    s += carTop(22.2, 30, sc, { body: '#4A505A' });
    // our car on the shoulder, hazard lights on; warning triangle well behind it
    var cx = 108.2, cy = 33;
    s += line(cx, cy + 2.3 * sc + 6, cx, 97, C.gold, 1.5, { 'stroke-dasharray': '3.5 3' });
    s += carTop(cx, cy, sc, { me: true, hazard: true });
    s += path('M108.2,98.6L114.2,109L102.2,109Z', '#FFFFFF', { stroke: C.red, 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
    // everyone out, waiting beyond the barrier, ahead of the car
    s += personTop(137, 12, 2.6, '#2E5A9A') + personTop(149, 17, 2.6, '#8A3A34');
    s += badge(true, 143, 34, 6);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 6. tyre tread depth
  // cut through a tyre tread: carcass with steel belts, blocks on top separated by grooves (gx = groove left edges)
  var RUB = '#2C3139', RUB_BLOCK = '#3B424D', RUB_EDGE = '#59616E';
  function treadSection(x0, x1, top, base, grooves, gw) {
    var s = '', i;
    s += path(rr(x0, base - 1, x1 - x0, 29, [0, 0, 5, 5]), RUB, { stroke: RUB_EDGE, 'stroke-width': 0.8 });
    s += line(x0 + 3, base + 10, x1 - 3, base + 10, '#667080', 1, { 'stroke-dasharray': '2.4 1.4' }) +
      line(x0 + 3, base + 15, x1 - 3, base + 15, '#667080', 1, { 'stroke-dasharray': '2.4 1.4' });
    var edges = [x0];
    grooves.forEach(function (gx) { edges.push(gx, gx + gw); });
    edges.push(x1);
    for (i = 0; i < edges.length; i += 2) {
      var bx0 = edges[i], bx1 = edges[i + 1], r0 = i === 0 ? 0 : 2.5, r1 = i === edges.length - 2 ? 0 : 2.5;
      s += path(rr(bx0, top, bx1 - bx0, base - top + 0.5, [r0, r1, 0, 0]), RUB_BLOCK, { stroke: RUB_EDGE, 'stroke-width': 0.8 });
      s += line(bx0 + r0 + 1, top + 1.3, bx1 - r1 - 1, top + 1.3, '#7C8594', 0.8, { opacity: 0.8 });
    }
    return s;
  }
  reg('fig-tyre-tread', 'عمق نقشة الإطار 1.5 ملم على الأقل', function (o, lab) {
    var s = panel(), top = 50, gb = 68;
    // good tread (right, read first): gauge in one groove, the depth marked in the next
    s += treadSection(56, 152, top, gb, [76, 114], 11);
    s += rect(69.5, top - 3, 24, 3, 1, '#C9CED6', { stroke: '#6B737E', 'stroke-width': 0.6 }) +
      rect(80.7, top - 4, 1.6, gb - top + 4, 0.6, '#C9CED6') +
      rect(75, 27, 13, top - 30, 3, '#C9CED6', { stroke: '#6B737E', 'stroke-width': 0.6 }) +
      rect(79.3, 12, 4.4, 15.5, 1, '#E3D3A6', { stroke: '#8C7A4E', 'stroke-width': 0.5 });
    for (var t = 0; t < 6; t++) s += line(79.3, 14 + t * 2.4, t % 2 ? 81.2 : 82.4, 14 + t * 2.4, '#6B5A3A', 0.6);
    s += dim(119.5, top, 119.5, gb, { tick: 3.2, sw: 1.5 });
    s += label('1.5 ملم', 119.5, 38, 9, C.gold, { pill: true });
    s += badge(true, 145, 22, 6.5);
    // worn tread (left): the blocks are gone, only faint traces of the grooves
    s += path(rr(10, gb - 1, 34, 29, [0, 0, 5, 5]), RUB, { stroke: RUB_EDGE, 'stroke-width': 0.8 });
    s += line(13, gb + 10, 41, gb + 10, '#667080', 1, { 'stroke-dasharray': '2.4 1.4' }) +
      line(13, gb + 15, 41, gb + 15, '#667080', 1, { 'stroke-dasharray': '2.4 1.4' });
    s += path(rr(10, gb - 3.6, 34, 4, [1.2, 1.2, 0, 0]), RUB_BLOCK, { stroke: RUB_EDGE, 'stroke-width': 0.8 });
    s += rect(21.4, gb - 3.4, 1.4, 1.1, 0.3, RUB) + rect(31.6, gb - 3.4, 1.4, 1.1, 0.3, RUB);
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
    s += seatSide(44, 90, 1) + sk('M49,92L52,106M84,89.6L86,106', '#4A5568', 2);
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
    // seat belt: over the shoulder and across the chest, low across the hips
    s += sk('M47.5,38.5L54.5,44.5L62.5,61L65.5,79', C.gold, 3.4) + sk('M48,81.5L65,79.5', C.gold, 3.4);
    s += rect(63.2, 76.6, 4.4, 5.4, 1.2, '#B8BEC8') + circ(46.8, 38.2, 1.8, '#6B737E');
    // checks: restraint high and close, belt worn right
    s += badge(true, 20, 26, 6.5) + badge(true, 80, 34, 6.5);
    s += sk('M26.5,26L31.5,26.5', C.ok, 0.9, { opacity: 0.6 }) + sk('M74,37.5L66,50', C.ok, 0.9, { opacity: 0.6 });
    return K.svg(s, VB, lab);
  });

  // ================================================================== 8. child seat in the rear
  // cut-away of the family car: side panels removed, interior visible (same profile and scale rules as carSide)
  function carCut(x, y, len) {
    var q = ell(50, 0.3, 47, 2, '#000000', { opacity: 0.35 });
    q += path(CAR.body, '#111823', { stroke: C.gold, 'stroke-width': 1.1, 'stroke-linejoin': 'round' });
    q += path(CAR.winR, '#1D2839') + path(CAR.winF, '#1D2839');
    q += sk('M50.4,-33.6L50.4,-9', C.gold, 0.6, { opacity: 0.45 }) + sk('M28.6,-23.2L73.4,-22.2', C.gold, 0.5, { opacity: 0.3 });
    q += path('M79,-20.6L90,-19.6L88.4,-13.6L82,-12.4Z', '#243044');
    q += path(CAR.head, C.lamp) + path(CAR.tail, C.tail);
    return g(q, tr(x, y, len / 100));
  }
  function carWheels(x, y, len) {
    return g(CAR.wheels.map(function (w) { return wheelSide(w[0], w[1], CAR.wr); }).join(''), tr(x, y, len / 100));
  }
  reg('fig-child-seat', 'الطفل في مقعده في الخلف', function (o, lab) {
    var s = panel(), x0 = 22, gy = 106, len = 134, i;
    s += carCut(x0, gy, len);
    // rear bench (no head restraint shown) and the empty front passenger seat
    s += seatSide(64, 95.3, 0.42, { restraint: false }) + seatSide(96, 95.3, 0.42);
    // forward-facing child seat on the rear bench, child strapped in with the harness
    var cx = 66, cy = 89.4, cs = '';
    cs += path('M0,0L-1,-17Q-1,-21 3,-21L8.4,-21Q11.4,-21 11.2,-18L10.6,-10L16,-9Q19,-8.4 19,-5.4L19,-2Q19,1 16,1L3,1Q0,1 0,0Z',
      '#7A4E86', { stroke: '#A77AB3', 'stroke-width': 0.8 });
    cs += sk('M7.2,-4L15.2,-4.6L17.6,1.6', '#46546B', 3.6);
    cs += path('M2.4,-10.4Q5.6,-12 8.8,-10.4L9.4,-2.6L3,-2.2Z', '#8FB4D8');
    cs += circ(5.4, -14.8, 4.4, C.skin) + path('M1,-15.4Q1.2,-19.4 5.4,-19.4Q9.4,-19.2 9.8,-15.8Q6.6,-17.4 3.8,-16.4Q2,-15.6 1.8,-13.2Z', '#3A2A20');
    cs += sk('M3.4,-10.2L5.8,-3.6M8.4,-10.2L6.2,-3.6', C.gold, 1.3) + circ(6, -3.4, 1.2, C.gold);
    s += g(cs, tr(cx, cy, 1));
    s += carWheels(x0, gy, len);
    // height ruler: 145 cm mark near the top, the child well below it
    s += rect(6, 18, 7, 88, 1.2, '#E8DFC6');
    for (i = 0; i <= 14; i++) {
      var yy = 106 - i * 5.52;
      s += line(6, yy, i % 2 ? 8.4 : 10, yy, '#6B5A3A', 0.6);
    }
    s += line(4.5, 26, 16, 26, C.gold, 1.8) + label('145 سم', 36, 26, 8.5, C.gold, { pill: true });
    s += line(14.5, cy - 19.4, cx + 1, cy - 19.4, C.muted, 0.6, { 'stroke-dasharray': '1.6 1.6', opacity: 0.8 });
    s += badge(true, 76, 47, 6);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 9. aquaplaning
  reg('fig-aquaplaning', 'الانزلاق المائي', function (o, lab) {
    var s = panel(), cx = 66, cy = 59.4, r = 32, road = 99, wt = 91.2;
    // road surface under a layer of water
    s += band(road, 120, C.asphalt) + line(0, road, 160, road, '#5A6270', 1);
    // spray thrown up behind the tyre
    s += sk('M40,88Q26,80 14,62', C.waterHi, 1.6, { opacity: 0.45 }) + sk('M44,90Q28,86 10,80', C.waterHi, 1.4, { opacity: 0.4 }) +
      sk('M37,85Q30,72 26,54', C.waterHi, 1.2, { opacity: 0.35 });
    [[14, 60, 1.5], [20, 56, 1.1], [10, 70, 1.3], [26, 64, 1.2], [16, 78, 1.4], [28, 74, 1], [7, 64, 1], [24, 50, 1], [33, 58, 0.9],
      [8, 80, 1.1], [30, 82, 0.9], [18, 68, 0.8]].forEach(function (d) { s += circ(d[0], d[1], d[2], C.waterHi, { opacity: 0.85 }); });
    // tyre riding on the water: its bottom sits on the water surface, not on the road
    s += circ(cx, cy, r, '#1D2127') + circ(cx, cy, r - 3.2, 'none', { stroke: '#2B3038', 'stroke-width': 1.2 });
    s += circ(cx, cy, r * 0.6, C.rim) + circ(cx, cy, r * 0.48, '#2A3038');
    for (var k = 0; k < 5; k++) {
      var sp = arcPt(cx, cy, r * 0.5, 90 + k * 72);
      s += line(cx, cy, sp[0], sp[1], C.rim, 3.4);
    }
    s += circ(cx, cy, 4.2, C.rim) + circ(cx, cy, 1.6, C.hub);
    // water film (tyre bottom hidden just under its surface) and the wedge pushed up in front of the tyre
    var fp = arcPt(cx, cy, r, -40);
    s += path('M0,' + f(wt) + 'L' + f(cx - 2) + ',' + f(wt) + 'L' + pt(cx, cy + r) + 'A' + r + ',' + r + ' 0 0 0 ' + pt(fp[0], fp[1]) +
      'C104,' + f(wt - 1) + ' 122,' + f(wt) + ' 150,' + f(wt) + 'L160,' + f(wt) + 'L160,' + f(road) + 'L0,' + f(road) + 'Z', C.water);
    s += sk('M126,' + f(wt - 0.2) + 'C112,' + f(wt - 0.6) + ' 100,' + f(wt - 3) + ' ' + pt(fp[0] + 1.6, fp[1] + 1.6), C.waterHi, 1.2);
    s += sk('M' + f(cx - 30) + ',' + f(wt + 0.2) + 'L' + f(cx + 18) + ',' + f(wt + 0.2), C.waterHi, 0.9, { opacity: 0.7 });
    // direction of travel, speed too high for the water
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
    s += line(fx, gy, fx, gy - 2 * wr, C.pill, 3, { opacity: 0.6 });
    s += line(fx, waterY, fx, gy - 2 * wr, C.gold, 1.1, { 'stroke-dasharray': '2 1.6' }) + line(fx, gy, fx, waterY, C.gold, 2);
    s += line(fx - 3, gy - 2 * wr, fx + 3, gy - 2 * wr, C.gold, 1.2) + line(fx - 3, gy, fx + 3, gy, C.gold, 1.4) +
      line(fx - 5, waterY, fx + 5, waterY, C.gold, 2);
    // deeper water: not allowed
    var deep = gy - 2 * wr - 1.5;
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
    // brake pedal beside P and R: press the brake to move the lever
    var my = y0 + step / 2;
    s += sk('M41,' + f(y0) + 'L37.5,' + f(y0) + 'L37.5,' + f(y0 + step) + 'L41,' + f(y0 + step), C.ink, 1.1, { opacity: 0.7 });
    s += line(33.5, my, 37.5, my, C.ink, 1.1, { opacity: 0.7 });
    s += tile(8, my - 13, 25.5, 26, { fill: C.pill, r: 6 }) + pedalIcon(20.8, my + 2.4, 1.45, C.ink, C.pill);
    s += sk('M20.8,' + f(my - 10.4) + 'L20.8,' + f(my - 6.6), C.red, 1.3) + arrowHead(20.8, my - 5.6, 270, 3.4, C.red);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 13. no phone in the hand
  reg('fig-no-phone', 'لا هاتف في يدك أثناء القيادة', function (o, lab) {
    var s = panel(), x0 = 26, y0 = 6, w = 108, h = 108;
    s += rect(x0, y0, w, h, 20, '#1A1E28');
    // steering wheel (top of the rim), cropped by the frame
    s += sk('M30,112A56,56 0 0 1 130,112', '#4A515C', 10) + sk('M33.6,106.4A52,52 0 0 1 126.4,106.4', '#5E6673', 1.6, { opacity: 0.8 });
    // hand holding a phone above the wheel, forearm coming up from below
    s += path('M70.4,114L68,96L92,96L89.6,114Z', '#7D93B8');
    s += path('M64,62Q62,76 66,86L70,98L92,98L94,84Q99,72 97,58Z', C.skin);
    s += rect(65, 18, 30, 52, 6, '#101521', { stroke: '#394356', 'stroke-width': 1.2 }) + rect(68, 23, 24, 41, 3, '#3D6FB0') +
      rect(70.5, 27, 19, 3, 1.5, '#8DBDF0', { opacity: 0.8 }) + rect(70.5, 33, 13, 3, 1.5, '#8DBDF0', { opacity: 0.6 }) +
      rect(70.5, 39, 16, 3, 1.5, '#8DBDF0', { opacity: 0.6 }) + circ(80, 20.6, 0.9, '#394356');
    s += path(rr(60.5, 40, 7.5, 6, [3, 1, 1, 3]), C.skin) + path(rr(60, 47.5, 8, 6, [3, 1, 1, 3]), C.skin) +
      path(rr(60.5, 55, 7.5, 6, [3, 1, 1, 3]), C.skin);
    s += path('M93,70L93,50Q93,46 96,46Q99,46 99,50L99,66Q99,74 94,78Z', C.skin);
    // everything outside the frame is covered, then the red rounded square frame and bar
    s += cover(rr(x0 + 1, y0 + 1, w - 2, h - 2, [19, 19, 19, 19]));
    s += rect(x0 + 2.5, y0 + 2.5, w - 5, h - 5, 18, 'none', { stroke: C.red, 'stroke-width': 5 });
    s += line(x0 + 15, y0 + 15, x0 + w - 15, y0 + h - 15, C.red, 8);
    return K.svg(s, VB, lab);
  });

  // ================================================================== 14. mirror, signal, head check
  // left wing mirror as the driver sees it: housing on the left, arm to the door on the right, a car behind in the glass
  function mirrorIcon(cx, cy, k) {
    var s = '';
    s += path('M9,1L15.5,-1.5L16.5,5.5L9,7Z', '#3A414C') + rect(15, -4.5, 3, 13, 1.2, '#2A3038');
    s += path('M-15,-6Q-15,-12 -9,-12L6,-11Q10.5,-10.6 10.5,-6.5L10.5,6.5Q10.5,10.6 6,11L-9,12Q-15,12 -15,6Z', '#3A414C',
      { stroke: '#5A6270', 'stroke-width': 0.8 });
    s += path('M-13,-5.6Q-13,-10 -8.6,-10L5.4,-9.1Q8.5,-8.8 8.5,-5.8L8.5,5.8Q8.5,8.8 5.4,9.1L-8.6,10Q-13,10 -13,5.6Z', '#A9BCD2');
    // car behind (front view)
    s += path('M-7.2,3.6L-6,-1.4Q-5.5,-3.2 -3.6,-3.2L1.6,-3.2Q3.5,-3.2 4,-1.4L5.2,3.6Z', '#3F6FB5') + rect(-8.2, 1, 14.4, 5.2, 1.6, '#3F6FB5') +
      path('M-5.1,-0.8L-4.5,-2.2Q-4.2,-2.6 -3.5,-2.6L1.5,-2.6Q2.2,-2.6 2.5,-2.2L3.1,-0.8Z', C.glass) +
      rect(-7.2, 2.2, 2.6, 1.4, 0.6, C.lampOn) + rect(3.2, 2.2, 2.6, 1.4, 0.6, C.lampOn) +
      rect(-7.4, 6.1, 2.2, 1.9, 0.5, '#1B2230') + rect(3.8, 6.1, 2.2, 1.9, 0.5, '#1B2230');
    s += sk('M-11,-2L-7,-8.4M-11.4,4L-4.4,-7.6', '#FFFFFF', 0.8, { opacity: 0.35 });
    return g(s, tr(cx, cy, k));
  }
  // amber indicator arrow blinking (to the left)
  function signalIcon(cx, cy, k) {
    var s = path('M-10,0L-1,-8.5L-1,-3.8L9,-3.8L9,3.8L-1,3.8L-1,8.5Z', C.amber);
    s += flash(-1, 0, 13, 16.5, [55, 90, 125, 235, 270, 305], C.amber, 1.2);
    return g(s, tr(cx, cy, k));
  }
  // head check: head turned over the left shoulder, curved arrow
  function headCheckIcon(cx, cy, k) {
    var s = '';
    s += path('M-15,15Q-15,6 -8,4L8,4Q15,6 15,15Z', '#7D93B8');
    s += rect(-3, -1, 6, 6, 2, C.skin);
    s += circ(0, -6, 7.2, C.skin) + path('M-2,-13Q6,-13.6 7.2,-6Q7.2,-0.6 3.8,1.4Q2.4,-4 -1,-6.4Q-2.8,-8 -2,-13Z', '#3A2A20') +
      path('M-7,-6.4L-9.4,-4.2L-6.8,-3.4Z', C.skin) + circ(-4.2, -7.4, 0.9, '#1B2230');
    s += sk('M8,-15Q2,-21 -8,-18.5Q-13,-17 -15,-11.5', C.gold, 1.6) + arrowHead(-15.6, -9.6, 250, 5, C.gold);
    return g(s, tr(cx, cy, k));
  }
  reg('fig-lane-change', 'مرآة ثم إشارة ثم التفاتة', function (o, lab) {
    var s = panel(), w = 44, gap = 9, x0 = (160 - 3 * w - 2 * gap) / 2, top = 24, h = 76, my = top + h / 2 + 3;
    var draw = [mirrorIcon, signalIcon, headCheckIcon], ks = [1.2, 1.15, 1.2];
    for (var i = 0; i < 3; i++) {
      var x = x0 + (2 - i) * (w + gap), mx = x + w / 2;
      s += tile(x, top, w, h, { r: 8 });
      s += draw[i](mx, my, ks[i]);
      s += circ(mx, top, 7.5, C.gold) + txt(String(i + 1), mx, top + 0.4, 10, C.pill, { latin: true, weight: 800 });
      if (i < 2) {
        var ax = x - gap / 2;
        s += line(ax + 2.6, my, ax - 0.6, my, C.gold, 1.2) + arrowHead(ax - 1.8, my, 180, 3.6, C.gold);
      }
    }
    return K.svg(s, VB, lab);
  });

  // ================================================================== 15. black points gauge
  reg('fig-black-points', 'النقاط السوداء: 24 نقطة تعني حجز الرخصة', function (o, lab) {
    var s = panel(), cy = 60, r = 2.3, pitch = 4.55, gapX = 1.7, xr = 149.5, n;
    // light track: points add up from right to left, in groups of four
    s += rect(33, cy - 8.5, 123, 17, 8.5, '#D8D3C4');
    var x = xr;
    for (n = 1; n <= 23; n++) {
      s += circ(x, cy, r, '#151515');
      if (n < 23) { x -= pitch; if (n % 4 === 0) x -= gapX; }
    }
    // the 24th point: the licence is withheld
    var mx = 20;
    s += rect(mx - 15, cy - 15, 30, 30, 7, '#3A1D22', { stroke: C.red, 'stroke-width': 1.6 });
    s += licenceCard(mx - 1.2, cy - 2, 1.12) + lockIcon(mx + 6.8, cy + 5, 1, C.red);
    // ends and direction
    s += txt('0', xr, cy + 17, 10, C.ink, { latin: true });
    s += txt('24', mx, cy + 25, 11, C.red, { latin: true });
    s += sk('M' + f(xr) + ',' + f(cy - 17) + 'L46,' + f(cy - 17), C.gold, 1.2) + arrowHead(43, cy - 17, 180, 5, C.gold);
    return K.svg(s, VB, lab);
  });
})();
