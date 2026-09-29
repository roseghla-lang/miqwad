/* مقود: mandatory signs, service signs and supplementary plates (m-, s-, x-). Drawn from scratch, see docs/drawing.md */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit, C = K.C;
  var WH = C.white, BK = C.black;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }

  // ------------------------------------------------------------------ small helpers
  function f(v) { return String(Math.round(v * 100) / 100); }
  function pt(p) { return f(p[0]) + ',' + f(p[1]); }
  function fillP(d, c) { return '<path d="' + d + '" fill="' + c + '"/>'; }
  function polyD(pts) { return 'M' + pts.map(pt).join('L') + 'Z'; }
  function limb(pts, w, c) {
    return '<path d="M' + pts.map(pt).join('L') + '" fill="none" stroke="' + c + '" stroke-width="' + f(w) +
      '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function circ(cx, cy, r, c) { return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + c + '"/>'; }
  function box(x, y, w, h, rx, c) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(rx) + '" fill="' + c + '"/>';
  }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; if (b) for (k in b) o[k] = b[k]; return o; }
  // draw a local picture whose ink box is vb = [x0, y0, x1, y1], centred and fitted (contain) in box b {x, y, w, h}
  function fitIn(inner, vb, b) {
    var w = vb[2] - vb[0], h = vb[3] - vb[1], s = Math.min(b.w / w, b.h / h);
    var tx = b.x + (b.w - w * s) / 2 - vb[0] * s, ty = b.y + (b.h - h * s) / 2 - vb[1] * s;
    return '<g transform="translate(' + f(tx) + ' ' + f(ty) + ') scale(' + (Math.round(s * 10000) / 10000) + ')">' + inner + '</g>';
  }
  // K.text has no direction option for Arabic: set it so "200 م" keeps its Arabic order on any page
  function rtl(t) { return t.replace('<text ', '<text direction="rtl" '); }
  // pin a Latin line to its width in the embedded Space Grotesk bold (em widths measured: REDUCE SPEED NOW 9.43,
  // 8:00 - 21:00 5.71), so it cannot overflow its plate while the webfont loads (fallbacks run about 20% wider)
  function pinW(t, width) { return t.replace('<text ', '<text textLength="' + f(width) + '" lengthAdjust="spacingAndGlyphs" '); }
  // one text line mixing Latin digits (Space Grotesk) and Arabic words (Alexandria), in logical order
  function mixText(parts, x, y, size, o) {
    var t = K.text('', x, y, size, merge({ fill: BK }, o));
    var body = parts.map(function (p) {
      return '<tspan font-family="' + (p[1] === 'latin' ? K.LATIN : K.FONT) + '">' + K.esc(p[0]) + '</tspan>';
    }).join('');
    return t.replace('></text>', ' direction="rtl">' + body + '</text>');
  }

  // ------------------------------------------------------------------ arrows (one family, one line weight)
  var AS = 0.88;                                  // every disc arrow: shaft 12.5 x 0.88 = 11 units
  var SW = 12.5 * AS, HW = 32 * AS, HL = 22 * AS;
  function arrowW(kind, p, cx, cy, extra) {
    return K.arrow(kind, merge({ s: AS, cx: cx, cy: cy, fill: WH, p: p }, extra));
  }

  // three arrows on one circle, moving ANTICLOCKWISE (right-hand traffic), head centres at the given screen
  // angles (0 = right, 90 = down); each head follows the circle, its tip on the centre line
  function ringArrows(cx, cy, R, sw, hw, hl, gap, heads) {
    var hd = hl / R * 180 / Math.PI, body = 120 - gap - hd, ro = R + sw / 2, ri = R - sw / 2, out = '';
    function P(r, a) { a *= Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    heads.forEach(function (hc) {
      var tip = hc - hd / 2, base = hc + hd / 2, start = base + body;
      out += fillP('M' + pt(P(ro, start)) + 'A' + f(ro) + ',' + f(ro) + ' 0 0 0 ' + pt(P(ro, base)) +
        'L' + pt(P(R + hw / 2, base)) + 'L' + pt(P(R, tip)) + 'L' + pt(P(R - hw / 2, base)) + 'L' + pt(P(ri, base)) +
        'A' + f(ri) + ',' + f(ri) + ' 0 0 1 ' + pt(P(ri, start)) + 'Z', WH);
    });
    return out;
  }

  // two arrows diverging downwards from one pointed apex near the top (pass either side)
  function passEither() {
    var ph = 38 * Math.PI / 180, sn = Math.sin(ph), cs = Math.cos(ph);
    var ax = 50, ay = 31, L = 54, ls = L - HL;
    function P(t, n, side) {
      return [ax + side * sn * t + side * cs * n, ay + cs * t - sn * n];
    }
    var pts = [[ax, ay - SW / 2 / sn],
      P(ls, SW / 2, 1), P(ls, HW / 2, 1), P(L, 0, 1), P(ls, -HW / 2, 1), P(ls, -SW / 2, 1),
      [ax, ay + SW / 2 / sn],
      P(ls, -SW / 2, -1), P(ls, -HW / 2, -1), P(L, 0, -1), P(ls, HW / 2, -1), P(ls, SW / 2, -1)];
    return fillP(polyD(pts), WH);
  }

  // ------------------------------------------------------------------ people: adult holding a child's hand, walking left
  var PAIR_VB = [0.9, 0, 84.4, 100.3];
  function pedPair(c) {
    return circ(27.4, 9.8, 9.8, c) +
      limb([[30.4, 30], [33.4, 48.4]], 17.6, c) +
      limb([[27, 29.4], [20.6, 40.6], [12.6, 45.8]], 9.2, c) +
      limb([[35.6, 29.4], [42, 41], [50, 50.5]], 9.2, c) +
      limb([[31.6, 55], [23.8, 72], [15.8, 88.2], [6.4, 94.4]], 11, c) +
      limb([[36, 55], [42, 71.6], [49.4, 85.6], [45.6, 94.4]], 11, c) +
      // child, about 0.62 of the adult, behind him (to the right)
      circ(68, 43.2, 7, c) +
      limb([[69.6, 57], [71, 68.6]], 11.8, c) +
      limb([[67.2, 56.4], [59.6, 55], [52, 51.6]], 6, c) +
      limb([[72.8, 57], [76.4, 63.6], [79.6, 68.6]], 6, c) +
      limb([[70, 72.6], [65.4, 83], [60.8, 92.8], [55.4, 96.8]], 7, c) +
      limb([[72.6, 72.6], [76.4, 82.6], [80.6, 92.4], [77.6, 96.8]], 7, c);
  }
  function pedPairAt(b, c) { return fitIn(pedPair(c || WH), PAIR_VB, b); }

  // ------------------------------------------------------------------ bicycle: the shared glyph's geometry with bolder
  // lines, so it stays readable when small on the blue discs (shared / segregated paths)
  var BIKE_VB = [-1, 2.4, 101, 62.5];
  function bike(c) {
    function ring(cx, cy) {
      return '<circle cx="' + cx + '" cy="' + cy + '" r="18" fill="none" stroke="' + c + '" stroke-width="7"/>';
    }
    return ring(20.5, 41) + ring(79.5, 41) +
      limb([[79.5, 41], [48, 41], [56, 16.5], [79.5, 41]], 5.8, c) +
      limb([[56, 16.5], [27.5, 16.5], [48, 41]], 5.8, c) +
      limb([[20.5, 41], [28.5, 9.5], [22, 5.5]], 5.8, c) +
      limb([[50, 9.8], [62, 9.8]], 6.4, c) + limb([[56, 10], [56, 16.5]], 5, c) +
      circ(48, 41, 5.4, c);
  }
  function bikeAt(b, c) { return fitIn(bike(c || WH), BIKE_VB, b); }

  // ------------------------------------------------------------------ modern low-floor tram (Dubai Tram type), facing left,
  // sloping nose, window band as holes, diamond pantograph, small wheels under the skirt, on a rail
  var TRAM_VB = [0, 1.2, 100, 48.4];
  function tram(c) {
    var holes = 'M6.4,27L10.6,15.8L17,15.8L17,27Z';
    for (var i = 0; i < 5; i++) holes += 'M' + f(21 + i * 15) + ',15.8h12.4v11.2h-12.4Z';
    return limb([[43, 11.4], [51, 4], [59, 11.4]], 2.6, c) + limb([[44, 2.6], [58, 2.6]], 2.8, c) +
      box(45, 9.6, 12, 3, 1, c) +
      '<path d="M3.4,39L1.8,31.4C1.2,28.6 1.8,26.4 3,23.6L7.4,13.8C8.2,12.2 9.4,11.4 11.2,11.4L95,11.4' +
      'C97.2,11.4 98.4,12.6 98.4,14.8L98.4,39Z' + holes + '" fill="' + c + '" fill-rule="evenodd"/>' +
      circ(17, 40.4, 4.2, c) + circ(27, 40.4, 4.2, c) + circ(73, 40.4, 4.2, c) + circ(83, 40.4, 4.2, c) +
      box(0, 45.4, 100, 3, 0.6, c);
  }

  // ------------------------------------------------------------------ plates (white, black border line inside a white edge)
  function plateSvg(inner, w, h, label) {
    return K.svg(
      box(0.5, 0.5, w - 1, h - 1, 5, WH) +
      '<rect x="3.1" y="3.1" width="' + f(w - 6.2) + '" height="' + f(h - 6.2) + '" rx="3" fill="none" stroke="' + BK +
      '" stroke-width="2.2"/>' + inner, '0 0 ' + w + ' ' + h, label);
  }
  // horizontal double (or single) headed arrow centred on (cx, cy), total length len
  function hArrow(cx, cy, len, sw, hw, hl, heads, c) {
    var x0 = cx - len / 2, x1 = cx + len / 2, a = sw / 2, b = hw / 2, pts = [];
    if (heads.left) pts.push([x0, cy], [x0 + hl, cy - b], [x0 + hl, cy - a]); else pts.push([x0, cy - a]);
    if (heads.right) pts.push([x1 - hl, cy - a], [x1 - hl, cy - b], [x1, cy], [x1 - hl, cy + b], [x1 - hl, cy + a]);
    else pts.push([x1, cy - a], [x1, cy + a]);
    if (heads.left) pts.push([x0 + hl, cy + a], [x0 + hl, cy + b]); else pts.push([x0, cy + a]);
    return fillP(polyD(pts), c);
  }
  function vArrow2(cx, cy, len, sw, hw, hl, c) {
    var y0 = cy - len / 2, y1 = cy + len / 2, a = sw / 2, b = hw / 2;
    return fillP(polyD([[cx, y0], [cx + b, y0 + hl], [cx + a, y0 + hl], [cx + a, y1 - hl], [cx + b, y1 - hl], [cx, y1],
      [cx - b, y1 - hl], [cx - a, y1 - hl], [cx - a, y0 + hl], [cx - b, y0 + hl]]), c);
  }

  // ================================================================== MANDATORY (blue disc, white symbol)
  reg('m-ahead-only', 'السير إلى الأمام فقط', function (o, label) {
    return K.mand(arrowW('straight', { len: 76 }, 50, 50), { label: label });
  });

  // immediate turn: short tail, a wide quarter circle, head pointing sideways
  var TURN_NOW = { a: 12, r: 30, b: 4 };
  reg('m-turn-right', 'السير باتجاه اليمين فقط', function (o, label) {
    return K.mand(arrowW('turn-right', TURN_NOW, 51, 50), { label: label });
  });
  reg('m-turn-left', 'السير باتجاه اليسار فقط', function (o, label) {
    return K.mand(arrowW('turn-left', TURN_NOW, 49, 50), { label: label });
  });

  // turn ahead: long vertical stem from the bottom, tight bend near the top
  var TURN_AHEAD = { a: 40, r: 13, b: 10 };
  reg('m-turn-right-ahead', 'اتجه يمينا عند أول تقاطع', function (o, label) {
    return K.mand(arrowW('turn-right', TURN_AHEAD, 55, 50), { label: label });
  });
  reg('m-turn-left-ahead', 'اتجه يسارا عند أول تقاطع', function (o, label) {
    return K.mand(arrowW('turn-left', TURN_AHEAD, 45, 50), { label: label });
  });

  reg('m-keep-right', 'الزم اليمين', function (o, label) {
    return K.mand(arrowW('keep-right', { len: 72 }, 50, 50), { label: label });
  });
  reg('m-keep-left', 'الزم اليسار', function (o, label) {
    return K.mand(arrowW('keep-left', { len: 72 }, 50, 50), { label: label });
  });

  reg('m-pass-either-side', 'المرور مسموح من الجهتين', function (o, label) {
    return K.mand(passEither(), { label: label });
  });

  reg('m-roundabout', 'دوار: سر باتجاه الأسهم', function (o, label) {
    // heads at 12 (pointing left), 8 (down and right) and 4 o'clock (up and right), as the catalogue describes
    return K.mand(ringArrows(50, 50, 26, SW, 25, 16, 16, [270, 150, 30]), { label: label });
  });

  reg('m-min-speed-60', 'الحد الأدنى للسرعة 60 كم/ساعة', function (o, label) {
    return K.mand(K.text('60', 50, 50.3, 46, { fill: WH, family: 'latin', weight: 700 }), { label: label });
  });

  reg('m-buses-only', 'للحافلات فقط', function (o, label) {
    return K.mand(K.glyph('bus-side', { x: 17, y: 34, w: 66, h: 32, fill: WH }), { label: label });
  });
  reg('m-taxis-only', 'لسيارات الأجرة فقط', function (o, label) {
    return K.mand(K.glyph('taxi-side', { x: 18, y: 33, w: 64, h: 34, fill: WH }), { label: label });
  });
  reg('m-trams-only', 'للترام فقط', function (o, label) {
    return K.mand(fitIn(tram(WH), TRAM_VB, { x: 17, y: 30, w: 66, h: 40 }), { label: label });
  });
  reg('m-trucks-only', 'لمركبات البضائع فقط', function (o, label) {
    return K.mand(K.glyph('truck-side', { x: 19, y: 32, w: 62, h: 36, fill: WH }), { label: label });
  });

  reg('m-pedestrians-only', 'للمشاة فقط', function (o, label) {
    return K.mand(pedPairAt({ x: 24, y: 19, w: 52, h: 62 }), { label: label });
  });
  reg('m-cyclists-only', 'للدراجات الهوائية فقط', function (o, label) {
    return K.mand(bikeAt({ x: 18, y: 30, w: 64, h: 40 }), { label: label });
  });
  reg('m-shared-path', 'ممر مشترك للمشاة والدراجات', function (o, label) {
    return K.mand(bikeAt({ x: 26.5, y: 14, w: 47, h: 28 }) + pedPairAt({ x: 32, y: 45, w: 36, h: 40 }), { label: label });
  });
  reg('m-segregated-path', 'ممر منفصل للمشاة والدراجات', function (o, label) {
    return K.mand(box(48.6, 3, 2.8, 94, 0, WH) +
      bikeAt({ x: 9, y: 38, w: 37, h: 24 }) + pedPairAt({ x: 56, y: 30, w: 33, h: 40 }), { label: label });
  });

  reg('m-headlights-on', 'أشعل المصابيح الأمامية', function (o, label) {
    var lamp = fillP('M50,33L50,67C37,67 26,61 26,50C26,39 37,33 50,33Z', WH), beams = '';
    for (var i = 0; i < 5; i++) beams += limb([[57, 35 + i * 7.5], [75, 35 + i * 7.5]], 4.2, WH);
    return K.mand('<g transform="translate(-1 0)">' + lamp + beams + '</g>', { label: label });
  });

  reg('m-go-this-way', 'يجب أن تسير بهذا الاتجاه', function (o, label) {
    var w = 100, h = 56, left = !!(o.left || o.flip || o.dir === 'left');
    return K.rect(K.arrow('one-way', { x: 12, y: 10, w: 76, h: 36, fill: WH, flip: left, p: { sw: 18, hw: 44, hl: 30 } }),
      { w: w, h: h, label: label });
  });

  // ================================================================== SERVICES (blue square, white symbol)
  reg('s-hospital', 'مستشفى', function (o, label) {
    return K.rect(K.glyph('h-letter', { x: 25, y: 20, w: 50, h: 60, fill: WH }), { label: label });
  });
  reg('s-airport', 'مطار', function (o, label) {
    var bg = o.bg === 'green' ? C.green : C.blue;
    return K.rect(K.glyph('aircraft', { x: 17, y: 17, w: 66, h: 66, fill: WH }), { bg: bg, label: label });
  });

  // ================================================================== SUPPLEMENTARY PLATES (white, black border, black text)
  reg('x-distance', 'لوحة المسافة', function (o, label) {
    return plateSvg(mixText([['200', 'latin'], [' م', 'head']], 50, 25, 24), 100, 48, label);
  });
  reg('x-length', 'لوحة طول المنطقة', function (o, label) {
    return plateSvg(vArrow2(21, 24, 32, 4.2, 13, 9, BK) + mixText([['2', 'latin'], [' كم', 'head']], 63, 25, 22), 100, 48, label);
  });
  reg('x-time', 'لوحة الأوقات', function (o, label) {
    var w = 110, h = 62;
    return plateSvg(pinW(K.text('8:00 - 21:00', w / 2, 22, 16, { fill: BK, family: 'latin' }), 5.71 * 16) +
      rtl(K.text('السبت - الخميس', w / 2, 43, 11, { fill: BK })), w, h, label);
  });
  reg('x-arrow-extent', 'لوحة سهم امتداد المنع', function (o, label) {
    var d = o.dir, heads = { left: d !== 'right', right: d !== 'left' };
    return plateSvg(hArrow(50, 20, 74, 5, 17, 13, heads, BK), 100, 40, label);
  });
  reg('x-trucks', 'لوحة الشاحنات', function (o, label) {
    return plateSvg(K.glyph('truck-side', { x: 16, y: 7, w: 68, h: 34, fill: BK }), 100, 48, label);
  });
  reg('x-buses', 'لوحة الحافلات', function (o, label) {
    return plateSvg(K.glyph('bus-side', { x: 16, y: 7, w: 68, h: 34, fill: BK }), 100, 48, label);
  });
  reg('x-cars', 'لوحة السيارات الخفيفة', function (o, label) {
    return plateSvg(K.glyph('car-side', { x: 16, y: 7, w: 68, h: 34, fill: BK }), 100, 48, label);
  });
  reg('x-motorcycles', 'لوحة الدراجات النارية', function (o, label) {
    return plateSvg(K.glyph('motorcyclist', { x: 16, y: 5.5, w: 68, h: 37, fill: BK }), 100, 48, label);
  });
  reg('x-reduce-speed-now', 'لوحة خفف السرعة الآن', function (o, label) {
    var w = 126, h = 54;
    return plateSvg(rtl(K.text('خفف السرعة الآن', w / 2, 19, 12.8, { fill: BK })) +
      pinW(K.text('REDUCE SPEED NOW', w / 2, 37.5, 11.2, { fill: BK, family: 'latin' }), 9.43 * 11.2), w, h, label);
  });
})();
