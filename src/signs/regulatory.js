/* مقود: priority, prohibitory and restrictive signs (p-, r-). Drawn from scratch, see docs/drawing.md */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit, C = K.C;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }

  // ------------------------------------------------------------------ small SVG helpers
  function f(v) { return String(Math.round(v * 100) / 100); }
  function P(d, c, eo) { return '<path d="' + d + '" fill="' + c + '"' + (eo ? ' fill-rule="evenodd"' : '') + '/>'; }
  function S(d, c, w) {
    return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + f(w) +
      '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function M(pts) { return 'M' + pts.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join('L'); }
  function limb(pts, w, c) { return S(M(pts), c, w); }
  function circ(cx, cy, r, c) { return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + c + '"/>'; }
  function cD(cx, cy, r) {
    return 'M' + f(cx - r) + ',' + f(cy) + 'a' + f(r) + ',' + f(r) + ' 0 1,0 ' + f(2 * r) + ',0a' + f(r) + ',' + f(r) +
      ' 0 1,0 ' + f(-2 * r) + ',0Z';
  }
  function rD(x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    if (!r) return 'M' + f(x) + ',' + f(y) + 'h' + f(w) + 'v' + f(h) + 'h' + f(-w) + 'Z';
    var a = 'a' + f(r) + ',' + f(r) + ' 0 0 1 ';
    return 'M' + f(x + r) + ',' + f(y) + 'h' + f(w - 2 * r) + a + f(r) + ',' + f(r) + 'v' + f(h - 2 * r) + a + f(-r) + ',' + f(r) +
      'h' + f(-(w - 2 * r)) + a + f(-r) + ',' + f(-r) + 'v' + f(-(h - 2 * r)) + a + f(r) + ',' + f(-r) + 'Z';
  }
  function box(x, y, w, h, r, c) { return P(rD(x, y, w, h, r), c); }
  function wheel(cx, cy, r, hub, c) { return P(cD(cx, cy, r) + cD(cx, cy, hub), c, true); }
  // put a drawing made in a [w, h] frame into box b {x, y, w, h} (contain, centred; ax/ay 0..1 align)
  function place(inner, vb, b) {
    var s = Math.min(b.w / vb[0], b.h / vb[1]);
    var ax = b.ax == null ? 0.5 : b.ax, ay = b.ay == null ? 0.5 : b.ay;
    var tx = b.x + (b.w - vb[0] * s) * ax, ty = b.y + (b.h - vb[1] * s) * ay;
    return '<g transform="translate(' + f(tx) + ' ' + f(ty) + ') scale(' + (Math.round(s * 10000) / 10000) + ')">' + inner + '</g>';
  }
  function poly(pts, c) { return '<polygon points="' + K.poly(pts) + '" fill="' + c + '"/>'; }

  // vertical arrow: shaft width sw, head width hw, head length hl, from the tail y0 to the tip y1 (up when y1 < y0)
  function vArrow(cx, y0, y1, sw, hw, hl, c) {
    var d = y1 < y0 ? -1 : 1, yb = y1 - d * hl;
    return poly([[cx - sw / 2, y0], [cx - sw / 2, yb], [cx - hw / 2, yb], [cx, y1], [cx + hw / 2, yb], [cx + sw / 2, yb],
      [cx + sw / 2, y0]], c);
  }
  // horizontal double-headed arrow from x0 to x1 at height y
  function hArrow2(x0, x1, y, sw, hw, hl, c) {
    return poly([[x0, y], [x0 + hl, y - hw / 2], [x0 + hl, y - sw / 2], [x1 - hl, y - sw / 2], [x1 - hl, y - hw / 2], [x1, y],
      [x1 - hl, y + hw / 2], [x1 - hl, y + sw / 2], [x0 + hl, y + sw / 2], [x0 + hl, y + hw / 2]], c);
  }
  // solid triangle with its tip at (x, y), pointing 'up' | 'down' | 'left' | 'right', base width w, depth h
  function tip(x, y, dir, w, h, c) {
    var p = dir === 'down' ? [[x - w / 2, y - h], [x + w / 2, y - h], [x, y]] :
      dir === 'up' ? [[x - w / 2, y + h], [x + w / 2, y + h], [x, y]] :
      dir === 'left' ? [[x + h, y - w / 2], [x + h, y + w / 2], [x, y]] : [[x - h, y - w / 2], [x - h, y + w / 2], [x, y]];
    return '<polygon points="' + K.poly(p) + '" fill="' + c + '" stroke="' + c + '" stroke-width="1" stroke-linejoin="round"/>';
  }

  // ------------------------------------------------------------------ numbers
  // K.text family 'latin' = Space Grotesk, weight 700. Measured in Chromium (units of font size): ink height 0.73
  // (0.697 for flat-topped digits), baseline at y + 0.343, ink centre 0.005 above y (dominant-baseline central).
  // INK: [ink width, horizontal offset of the ink centre from the text-anchor point].
  var INK = {
    '25': [1.1167, 0.005], '40': [1.21, -0.0117], '60': [1.1633, 0.0017], '80': [1.17, -0.0117],
    '100': [1.6833, -0.0183], '120': [1.63, -0.0183], '140': [1.6767, -0.0183],
    '4.5': [1.4733, -0.0033], '2.5': [1.4133, 0.0033], '15': [1.0067, -0.01], '10': [1.0367, -0.0183],
    '8': [0.5467, 0], 't': [0.3867, -0.01]
  };
  var BASE = 0.343;          // Space Grotesk baseline below the central line
  var MEEM = [0.62, 0.0034, 0.3567]; // Alexandria 700 'م': ink width, ink centre offset, baseline below the central line
  function inkW(str, size) { return (INK[str] ? INK[str][0] : 0.58 * str.length) * size; }
  function inkDX(str) { return INK[str] ? INK[str][1] : 0; }

  // a number whose INK is centred on (cx, cy); narrower than maxW => condensed horizontally (same height)
  function number(str, cx, cy, size, maxW, fill) {
    var w = inkW(str, size), sx = maxW && w > maxW ? maxW / w : 1;
    var t = K.text(str, f(cx - inkDX(str) * size), f(cy + 0.005 * size), size, { family: 'latin', weight: 700, fill: fill || C.black });
    if (sx < 1) t = '<g transform="matrix(' + (Math.round(sx * 10000) / 10000) + ' 0 0 1 ' + f(cx * (1 - sx)) + ' 0)">' + t + '</g>';
    return t;
  }
  // number + Latin unit on its right, sharing a baseline; the whole ink group centred on cx, the digits' ink on cy
  function numUnit(str, unit, cx, cy, size, usize, gap) {
    var wn = inkW(str, size), wu = inkW(unit, usize), x0 = cx - (wn + gap + wu) / 2;
    var y = cy + 0.005 * size, base = y + BASE * size;
    return K.text(str, f(x0 + wn / 2 - inkDX(str) * size), f(y), size, { family: 'latin', weight: 700 }) +
      K.text(unit, f(x0 + wn + gap + wu / 2 - inkDX(unit) * usize), f(base - BASE * usize), usize, { family: 'latin', weight: 700 });
  }
  // number + Arabic unit م. Arabic reading order: the number first (right), the unit after it (left)
  function numMeem(str, cx, cy, size, msize, gap) {
    var wn = inkW(str, size), wm = MEEM[0] * msize, x0 = cx - (wn + gap + wm) / 2;
    var y = cy + 0.005 * size, base = y + BASE * size;
    return K.text('م', f(x0 + wm / 2 - MEEM[1] * msize), f(base - MEEM[2] * msize), msize, { weight: 700 }) +
      K.text(str, f(x0 + wm + gap + wn / 2 - inkDX(str) * size), f(y), size, { family: 'latin', weight: 700 });
  }

  // ------------------------------------------------------------------ local pictograms (black, facing left)
  // lorry seen from behind: box body with rear doors and locking bars, light bar with plate, twin wheels. 100 x 108
  var TRUCK_REAR = [100, 108];
  function truckRear(c) {
    return P(rD(3, 0, 94, 76, 4) + rD(48.7, 6, 2.6, 64, 1.3) + rD(23.6, 8, 2.2, 60, 1.1) + rD(74.2, 8, 2.2, 60, 1.1), c, true) +
      box(6, 84, 28, 24, 3.5, c) + box(66, 84, 28, 24, 3.5, c) +
      P(rD(0, 78, 100, 12, 3) + rD(5, 81.5, 15, 5, 2) + rD(80, 81.5, 15, 5, 2) + rD(38, 80.5, 24, 7, 1.5), c, true);
  }

  // tanker lorry, side view facing left, white flame on the tank. 100 x 51 (drawn from y 7)
  var TANKER = [100, 51];
  function tanker(c) {
    var flame = 'M66,10C67.6,14.6 73.4,18.4 73.4,25C73.4,29.4 70.2,32.4 66,32.4C61.8,32.4 58.6,29.4 58.6,25C58.6,21.4 60.6,19.2 62.4,17' +
      'C62.8,19.6 63.8,21.2 65.4,21.8C64.4,17.8 64.8,13.6 66,10Z';
    return '<g transform="translate(0 -7)">' + P('M1,46L1,17C1,13.5 3,11.5 6.5,11.5L21.5,11.5C24.2,11.5 25.6,12.6 26.6,15L28.5,20L28.5,46L26.7,46' +
        'A12,12 0 0 0 3.3,46Z' + 'M5,15.2L20.6,15.2C22,15.2 22.8,15.8 23.3,17.2L25,22.6C25.3,23.6 24.8,24.6 23.5,24.6L5,24.6Z', c, true) +
      P('M30.5,38L99,38L99,46L97.7,46A12,12 0 0 0 74.3,46L73.7,46A12,12 0 0 0 50.3,46L30.5,46Z', c) +
      P(rD(31, 7, 69, 29, 12) + flame, c, true) +
      wheel(15, 48.5, 9.5, 3.4, c) + wheel(62, 48.5, 9.5, 3.4, c) + wheel(86, 48.5, 9.5, 3.4, c) + '</g>';
  }

  // quad bike (ATV) with rider, side view facing left. 100 x 82
  var QUAD = [100, 82];
  function quad(c) {
    var body = 'M2,50L2,44C2,41.5 3.5,40 6,40L94,40C96.5,40 98,41.5 98,44L98,50L95.46,50A19.5,19.5 0 0 0 70.54,50' +
      'L63,50L63,55L37,55L37,50L29.46,50A19.5,19.5 0 0 0 4.54,50Z';
    return wheel(17, 65, 16.5, 7.2, c) + circ(17, 65, 3.4, c) + wheel(83, 65, 16.5, 7.2, c) + circ(83, 65, 3.4, c) +
      P(body, c) + box(49, 34, 30, 7.5, 3.5, c) +
      limb([[31, 40], [35, 27]], 4.4, c) + limb([[30.5, 26.5], [40, 26.5]], 4.8, c) +
      limb([[64, 31], [59, 17]], 13, c) +
      P(cD(56, 8, 7.8) + rD(48.2, 5.8, 7, 4, 2), c, true) +
      limb([[58, 18], [48.5, 24.5], [39.5, 26.5]], 6.8, c) +
      limb([[64, 33], [49, 33.5], [47, 46]], 9, c);
  }

  // delivery motorbike: the shared motorcyclist with a delivery box on the rear rack, behind the rider
  function delivery(c) {
    var g = K.glyphs && K.glyphs.motorcyclist;
    var bike = g ? g.draw(c) : '';
    return bike + P(rD(76.6, 21, 18.4, 19.2, 1.6) + rD(79.4, 25.2, 12.8, 2.2, 1.1), c, true);
  }

  // truck axle (the Vienna axle-load pictogram): two tyres joined by a short axle bar with its differential. 64 x 30
  var AXLE = [64, 30];
  function axle(c) {
    return box(0, 0, 14, 30, 3.5, c) + box(50, 0, 14, 30, 3.5, c) + box(12, 12, 40, 6, 1, c) + circ(32, 15, 6.5, c);
  }

  function G(name, b) { return K.glyph(name, b); }

  // ================================================================== PRIORITY
  function octPts(R) {
    var pts = [];
    for (var k = 0; k < 8; k++) {
      var a = (22.5 + 45 * k) * Math.PI / 180;
      pts.push([50 + R * Math.cos(a), 50 + R * Math.sin(a)]);
    }
    return K.poly(pts);
  }
  reg('p-stop', 'قف', function (o, label) {
    return K.svg(
      K.rpoly(octPts(48), C.white, 3) + K.rpoly(octPts(45), C.red, 3) +
      '<polygon points="' + octPts(41.4) + '" fill="none" stroke="' + C.white + '" stroke-width="1.8" stroke-linejoin="round"/>' +
      K.text('قف', 50, 40, 31, { fill: C.white, weight: 800 }) +
      K.text('STOP', 50, 68, 18.5, { fill: C.white, weight: 700, family: 'latin', ls: 0.4 }),
      '0 0 100 100', label);
  });

  reg('p-give-way', 'أفسح الطريق', function (o, label) {
    return K.giveWay('', { label: label });
  });

  reg('p-give-way-pedestrians', 'أفسح الطريق للمشاة', function (o, label) {
    return K.giveWay(G('person-walk', { x: 34, y: 17, w: 32, h: 31, ay: 0 }), { label: label });
  });

  reg('p-give-way-cyclists', 'أفسح الطريق للدراجات الهوائية', function (o, label) {
    return K.giveWay(G('bicycle', { x: 32, y: 17.5, w: 36, h: 21, ay: 0 }), { label: label });
  });

  // oncoming traffic (down, on the LEFT in right-hand traffic) has priority: big black arrow; yours (up, right) small red
  reg('p-give-way-oncoming', 'الأولوية للمركبات القادمة من الاتجاه المقابل', function (o, label) {
    return K.prohib(
      vArrow(40, 22, 78, 9, 22, 16, C.black) +
      vArrow(62.5, 73, 27, 7, 17, 12.5, C.red), { label: label });
  });

  // your direction (up, on the RIGHT) has priority: big white arrow; oncoming (down, left) small red
  reg('p-priority-over-oncoming', 'لك الأولوية على المركبات القادمة من الاتجاه المقابل', function (o, label) {
    return K.rect(
      vArrow(61, 82, 18, 10.5, 25, 18, C.white) +
      vArrow(36, 26, 74, 8, 19, 14, C.red), { label: label });
  });

  // ================================================================== PROHIBITORY
  reg('r-no-entry', 'ممنوع الدخول', function (o, label) {
    return K.circle('<rect x="20" y="42" width="60" height="16" rx="1.5" fill="' + C.white + '"/>', { bg: C.red, label: label });
  });

  var TURN_S = 0.7;
  reg('r-no-left-turn', 'ممنوع الانعطاف إلى اليسار', function (o, label) {
    return K.prohib(K.arrow('turn-left', { s: TURN_S, cx: 45, cy: 52 }), { slash: true, label: label });
  });
  reg('r-no-right-turn', 'ممنوع الانعطاف إلى اليمين', function (o, label) {
    return K.prohib(K.arrow('turn-right', { s: TURN_S, cx: 55, cy: 52 }), { slash: true, label: label });
  });
  reg('r-no-u-turn', 'ممنوع الدوران للخلف', function (o, label) {
    return K.prohib(K.arrow('uturn-left', { s: TURN_S, cx: 47, cy: 51 }), { slash: true, label: label });
  });

  // UAE overtakes on the LEFT: the red vehicle (the one that would pull out) on the left, black on the right
  reg('r-no-overtaking', 'ممنوع التجاوز', function (o, label) {
    return K.prohib(
      G('car-rear', { x: 18.5, y: 36, w: 30.5, h: 28, fill: C.red }) +
      G('car-rear', { x: 51, y: 36, w: 30.5, h: 28 }), { label: label });
  });
  reg('r-no-overtaking-trucks', 'ممنوع على الشاحنات التجاوز', function (o, label) {
    var lw = 30, lh = lw * TRUCK_REAR[1] / TRUCK_REAR[0], cw = 27, ch = cw * 68.4 / 92;
    var bottom = 50 + lh / 2;
    return K.prohib(
      place(truckRear(C.red), TRUCK_REAR, { x: 20, y: bottom - lh, w: lw, h: lh }) +
      G('car-rear', { x: 53, y: bottom - ch, w: cw, h: ch }), { label: label });
  });

  reg('r-no-horn', 'ممنوع استخدام جهاز التنبيه', function (o, label) {
    return K.prohib(G('horn', { x: 24, y: 30, w: 52, h: 40 }), { slash: true, label: label });
  });
  reg('r-no-pedestrians', 'ممنوع مرور المشاة', function (o, label) {
    return K.prohib(G('person-walk', { x: 30, y: 24, w: 40, h: 52 }), { slash: true, label: label });
  });
  reg('r-no-bicycles', 'ممنوع مرور الدراجات الهوائية', function (o, label) {
    return K.prohib(G('bicycle', { x: 22, y: 30, w: 56, h: 40 }), { slash: true, label: label });
  });
  reg('r-no-motorcycles', 'ممنوع مرور الدراجات النارية', function (o, label) {
    return K.prohib(G('motorcyclist', { x: 24, y: 26, w: 52, h: 48 }), { slash: true, label: label });
  });
  reg('r-no-delivery-motorbikes', 'ممنوع مرور دراجات التوصيل', function (o, label) {
    var g = K.glyphs && K.glyphs.motorcyclist, vb = g ? g.vb : [95, 82.6];
    return K.prohib(place(delivery(C.black), vb, { x: 24, y: 26, w: 52, h: 48 }), { slash: true, label: label });
  });
  reg('r-no-trucks', 'ممنوع مرور مركبات الشحن', function (o, label) {
    return K.prohib(G('truck-side', { x: 22, y: 30, w: 56, h: 40 }), { slash: true, label: label });
  });
  reg('r-no-buses', 'ممنوع دخول الحافلات', function (o, label) {
    return K.prohib(G('bus-side', { x: 21, y: 30, w: 58, h: 40 }), { slash: true, label: label });
  });
  reg('r-no-taxis', 'ممنوع دخول سيارات الأجرة', function (o, label) {
    return K.prohib(G('taxi-side', { x: 21, y: 30, w: 58, h: 40 }), { slash: true, label: label });
  });
  reg('r-no-hazardous', 'ممنوع مرور المركبات التي تحمل مواد خطرة', function (o, label) {
    return K.prohib(place(tanker(C.black), TANKER, { x: 21, y: 30, w: 58, h: 40 }), { slash: true, label: label });
  });
  reg('r-no-quad-bikes', 'ممنوع مرور الدراجات الرباعية', function (o, label) {
    return K.prohib(place(quad(C.black), QUAD, { x: 23, y: 26, w: 54, h: 48 }), { slash: true, label: label });
  });

  // ---------------------------------------------------------------- speed limits (one digit style for all)
  var SPEED_SIZE = 50, SPEED_MAXW = 62;
  function speed(v) {
    return function (o, label) { return K.prohib(number(String(v), 50, 50, SPEED_SIZE, SPEED_MAXW), { label: label }); };
  }
  reg('r-speed-25', 'الحد الأقصى للسرعة 25 كم/ساعة', speed(25));
  reg('r-speed-40', 'الحد الأقصى للسرعة 40 كم/ساعة', speed(40));
  reg('r-speed-60', 'الحد الأقصى للسرعة 60 كم/ساعة', speed(60));
  reg('r-speed-80', 'الحد الأقصى للسرعة 80 كم/ساعة', speed(80));
  reg('r-speed-100', 'الحد الأقصى للسرعة 100 كم/ساعة', speed(100));
  reg('r-speed-120', 'الحد الأقصى للسرعة 120 كم/ساعة', speed(120));
  reg('r-speed-140', 'الحد الأقصى للسرعة 140 كم/ساعة', speed(140));

  // small speed roundel for the vehicle board: red ring, white disc, black number (same digit style)
  function roundel(v, cx, cy, r) {
    var ri = r * 38 / 47, size = ri * SPEED_SIZE / 38;
    return circ(cx, cy, r, C.red) + circ(cx, cy, ri, C.white) + number(String(v), cx, cy, size, ri * SPEED_MAXW / 38);
  }
  reg('r-speed-by-vehicle', 'حدود السرعة حسب نوع المركبة', function (o, label) {
    var W = 86, H = 100;
    return K.svg(
      '<rect x="0.8" y="0.8" width="' + (W - 1.6) + '" height="' + (H - 1.6) + '" rx="6" fill="' + C.white + '"/>' +
      '<rect x="3.6" y="3.6" width="' + (W - 7.2) + '" height="' + (H - 7.2) + '" rx="4" fill="' + C.white + '" stroke="' + C.black +
      '" stroke-width="2.6"/>' +
      '<line x1="3.6" y1="50" x2="' + (W - 3.6) + '" y2="50" stroke="' + C.black + '" stroke-width="2"/>' +
      G('car-side', { x: 7.5, y: 16, w: 34, h: 20 }) + roundel(120, 62.5, 27, 17.5) +
      G('truck-side', { x: 9, y: 61, w: 31, h: 22 }) + roundel(80, 62.5, 73, 17.5),
      '0 0 ' + W + ' ' + H, label);
  });

  // ---------------------------------------------------------------- parking
  reg('r-no-parking', 'ممنوع الوقوف', function (o, label) { return K.noParking({ label: label }); });
  reg('r-no-stopping', 'ممنوع الوقوف والتوقف', function (o, label) { return K.noParking({ x: true, label: label }); });

  // ---------------------------------------------------------------- size and weight limits
  reg('r-max-height', 'ممنوع مرور المركبات الأعلى من الرقم', function (o, label) {
    return K.prohib(
      tip(50, 36, 'down', 16, 8.5, C.black) + numMeem('4.5', 50, 50, 26, 24, 5) + tip(50, 64, 'up', 16, 8.5, C.black),
      { label: label });
  });
  reg('r-max-width', 'حد العرض المسموح به', function (o, label) {
    return K.prohib(
      tip(23.5, 50, 'right', 12.5, 7, C.black) + numMeem('2.5', 50, 50, 20, 20, 3.5) + tip(76.5, 50, 'left', 12.5, 7, C.black),
      { label: label });
  });
  reg('r-max-length', 'حد الطول المسموح به', function (o, label) {
    return K.prohib(
      G('truck-side', { x: 32, y: 22.5, w: 36, h: 20 }) +
      hArrow2(32, 68, 48.5, 2.4, 7, 6, C.black) +
      numMeem('15', 50, 62, 21, 19, 4), { label: label });
  });
  reg('r-max-weight', 'حد الوزن الإجمالي المسموح به', function (o, label) {
    return K.prohib(numUnit('10', 't', 50, 50, 42, 26, 2.5), { label: label });
  });
  reg('r-max-axle', 'حد الوزن على المحور الواحد', function (o, label) {
    return K.prohib(
      place(axle(C.black), AXLE, { x: 31, y: 24, w: 38, h: 18 }) +
      numUnit('8', 't', 50, 61.5, 34, 22, 2), { label: label });
  });
})();
