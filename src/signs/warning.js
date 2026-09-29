/* مقود: warning signs (w-): red-bordered triangles, yellow chevron boards and the hazard marker.
 * Drawn from scratch, see docs/drawing.md */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit, C = K.C;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }

  // ---------------------------------------------------------------- local helpers
  // Triangle space (SignKit.warn, viewBox 0 0 100 92): white triangle apex (50,24), base y 78. Safe area for ink
  // (2 units inside the white): |x - 50| <= (y - 24) * 0.5778 - 2.31 and y <= 76. Glyphs stand on y 74.
  var INK = C.black;
  function f(v) { return String(Math.round(v * 100) / 100); }
  function pts(a) { return a.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' '); }
  function poly(a, fill) { return '<polygon points="' + pts(a) + '" fill="' + (fill || INK) + '"/>'; }
  function path(d, fill) { return '<path d="' + d + '" fill="' + (fill || INK) + '"/>'; }
  function line(d, w, color, cap) {
    return '<path d="' + d + '" fill="none" stroke="' + (color || INK) + '" stroke-width="' + f(w) +
      '" stroke-linecap="' + (cap || 'butt') + '" stroke-linejoin="round"/>';
  }
  function box(x, y, w, h, r, fill) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '"' +
      (r ? ' rx="' + f(r) + '"' : '') + ' fill="' + (fill || INK) + '"/>';
  }
  function dot(cx, cy, r, fill) {
    return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + (fill || INK) + '"/>';
  }
  function mirror(inner) { return '<g transform="matrix(-1 0 0 1 100 0)">' + inner + '</g>'; }
  function tri(inner, label) { return K.warn(inner, { label: label }); }
  function G(name, extra) { return K.glyph(name, K.fit('warn', name, extra)); }
  function A(kind, extra) { return K.arrow(kind, K.fit('warn', kind, extra)); }
  // the tuned box mirrored around x = 50 plus a flipped glyph: the exact mirror image of the tuned placement
  function mirroredFit(name, extra) {
    var b = K.fit('warn', name, extra);
    b.x = 100 - b.x - b.w; b.flip = !b.flip;
    return b;
  }
  function octagon(cx, cy, R) {
    var a = [];
    for (var k = 0; k < 8; k++) {
      var t = (22.5 + 45 * k) * Math.PI / 180;
      a.push([cx + R * Math.cos(t), cy + R * Math.sin(t)]);
    }
    return a;
  }
  // horizontal arrow from its tail x0 to its tip x1 (either direction) on the line y; shaft t, head hw x hl
  function hArrow(x0, x1, y, t, hw, hl) {
    var s = x1 > x0 ? 1 : -1, xb = x1 - s * hl;
    return poly([[x0, y - t / 2], [xb, y - t / 2], [xb, y - hw / 2], [x1, y], [xb, y + hw / 2], [xb, y + t / 2],
      [x0, y + t / 2]]);
  }
  // clip a convex polygon to the half-plane a*x + b*y <= c (Sutherland-Hodgman)
  function clipHalf(pg, a, b, c) {
    var out = [];
    for (var i = 0; i < pg.length; i++) {
      var p = pg[i], q = pg[(i + 1) % pg.length];
      var dp = a * p[0] + b * p[1] - c, dq = a * q[0] + b * q[1] - c;
      if (dp <= 0) out.push(p);
      if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
        var t = dp / (dp - dq);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- bends and junctions (shared arrows / layouts)
  reg('w-bend-right', 'منعطف إلى اليمين', function (o, label) {
    return tri(A('bend-right-arrow'), label);
  });
  reg('w-bend-left', 'منعطف إلى اليسار', function (o, label) {
    return tri(A('bend-left-arrow'), label);
  });
  reg('w-double-bend-right', 'منعطفات متتالية أولها إلى اليمين', function (o, label) {
    return tri(A('double-bend-right-arrow'), label);
  });
  reg('w-double-bend-left', 'منعطفات متتالية أولها إلى اليسار', function (o, label) {
    return tri(A('double-bend-left-arrow'), label);
  });
  reg('w-crossroads', 'تقاطع طرق أمامك', function (o, label) {
    return tri(G('crossroads'), label);
  });
  reg('w-t-junction', 'تقاطع على شكل T', function (o, label) {
    return tri(G('t-junction'), label);
  });
  reg('w-side-road-right', 'طريق جانبي من اليمين', function (o, label) {
    return tri(G('side-road-right'), label);
  });
  reg('w-side-road-left', 'طريق جانبي من اليسار', function (o, label) {
    return tri(G('side-road-left'), label);
  });
  reg('w-staggered-junction', 'تقاطعات متجاورة', function (o, label) {
    return tri(G('staggered-junction'), label);
  });
  // merging: main road bar without arrowhead (as the brief), thinner slip road joining in the upper half
  function merge(kind, x) {
    return K.arrow(kind, { x: x, y: 44, w: 18.6, h: 30, ay: 1, p: { len: 68, hw: 12.5, hl: 0.01 } });
  }
  reg('w-merge-right', 'طريقك يندمج مع حركة المرور', function (o, label) {
    return tri(merge('merge-right', 41), label);
  });
  reg('w-merge-left', 'مركبات تندمج من اليسار', function (o, label) {
    return tri(merge('merge-left', 40.4), label);
  });
  reg('w-roundabout-ahead', 'دوار أمامك', function (o, label) {
    return tri(A('roundabout'), label);
  });
  reg('w-u-turn-ahead', 'فتحة دوران للخلف أمامك', function (o, label) {
    return tri(A('uturn-left'), label);
  });
  reg('w-two-way-traffic', 'حركة مرور في الاتجاهين', function (o, label) {
    return tri(A('two-way'), label);
  });
  // crossing road with two-way traffic, right-hand traffic: far lane runs left, near lane runs right
  reg('w-two-way-crossing', 'تقاطع مع طريق ذي اتجاهين', function (o, label) {
    return tri(hArrow(63.5, 35.5, 54.5, 5, 12.5, 8.5) + hArrow(36.5, 64.5, 67.5, 5, 12.5, 8.5), label);
  });

  // ---------------------------------------------------------------- road width and lanes
  reg('w-road-narrows-both', 'الطريق يضيق من الجهتين', function (o, label) {
    return tri(G('narrow-both'), label);
  });
  reg('w-road-narrows-right', 'الطريق يضيق من اليمين', function (o, label) {
    return tri(G('narrow-right'), label);
  });
  reg('w-road-narrows-left', 'الطريق يضيق من اليسار', function (o, label) {
    return tri(G('narrow-left'), label);
  });
  // two carriageways split by a white central island at the bottom; the island ends and they join into one road
  reg('w-dual-carriageway-ends', 'نهاية الطريق المزدوج', function (o, label) {
    return tri(path('M38.5,74L38.5,61C38.5,55.5 43.5,55.5 43.5,50L43.5,44L56.5,44L56.5,50C56.5,55.5 61.5,55.5 61.5,61' +
      'L61.5,74L52.5,74L52.5,61C52.5,57 51.25,54.6 50,54C48.75,54.6 47.5,57 47.5,61L47.5,74Z'), label);
  });
  // two lanes (edge lines and a dashed lane line); the right edge swings in and the dashes stop
  function laneEnds() {
    var e = 3.7, xL = 43, xR0 = 63.4, xR1 = 53.8, yt = 44, y0 = 62.6, y1 = 51.6;
    var ym = (y0 + y1) / 2;
    return box(xL - e / 2, yt, e, 74 - yt, 0) +
      line('M' + xR0 + ',74L' + xR0 + ',' + y0 + 'C' + xR0 + ',' + ym + ' ' + xR1 + ',' + ym + ' ' + xR1 + ',' + y1 +
        'L' + xR1 + ',' + yt, e) +
      box(52, 69.5, 2.4, 4.5, 0) + box(52, 62.6, 2.4, 4.5, 0);
  }
  reg('w-right-lane-ends', 'نهاية المسار الأيمن', function (o, label) {
    return tri(laneEnds(), label);
  });
  reg('w-left-lane-ends', 'نهاية المسار الأيسر', function (o, label) {
    return tri(mirror(laneEnds()), label);
  });

  // ---------------------------------------------------------------- priority and control ahead
  reg('w-traffic-signals', 'إشارة ضوئية أمامك', function (o, label) {
    return tri(G('traffic-light'), label);
  });
  // miniature stop sign: red octagon, thin white inner border, white قف
  reg('w-stop-ahead', 'إشارة قف أمامك', function (o, label) {
    var cx = 50, cy = 59.6, R = 15.4;
    return tri(K.rpoly(pts(octagon(cx, cy, R - 0.9)), C.red, 1.8) +
      '<polygon points="' + pts(octagon(cx, cy, R - 2.4)) + '" fill="none" stroke="' + C.white + '" stroke-width="1"/>' +
      K.text('قف', cx, cy + 0.4, 11, { fill: C.white, weight: 800 }), label);
  });
  // miniature give way sign: inverted triangle, red border, white interior
  reg('w-give-way-ahead', 'إشارة أفسح الطريق أمامك', function (o, label) {
    var r = 7.68, cy = 51 + r;
    return tri(K.rpoly(K.tri(50, cy, r - 0.8, true), C.red, 1.6) + K.rpoly(K.tri(50, cy, r - 3, true), C.white, 1), label);
  });
  reg('w-dead-end-ahead', 'طريق مسدود أمامك', function (o, label) {
    return tri(box(46.9, 52.5, 6.2, 21.5, 0) + box(40, 47, 20, 6, 0.6, C.red), label);
  });
  reg('w-gate-ahead', 'بوابة قد تغلق الطريق أمامك', function (o, label) {
    var s = box(35.6, 53, 3.6, 21, 0.8) + box(60.8, 53, 3.6, 21, 0.8);
    [56.5, 62.6, 68.7].forEach(function (y) { s += box(39.2, y, 21.6, 2.8, 0); });
    return tri(s + line('M39.6,70.5L60.4,58', 2.8), label);
  });

  // ---------------------------------------------------------------- road users and animals
  reg('w-pedestrian-crossing', 'ممر مشاة أمامك', function (o, label) {
    return tri(G('pedestrian-crossing'), label);
  });
  reg('w-children', 'أطفال', function (o, label) {
    return tri(G('children'), label);
  });
  reg('w-cyclists', 'عبور دراجات هوائية', function (o, label) {
    return tri(G('bicycle'), label);
  });
  reg('w-camels', 'حيوانات على الطريق (جمال)', function (o, label) {
    return tri(G('camel'), label);
  });
  reg('w-tram-crossing', 'عبور الترام أمامك', function (o, label) {
    return tri(K.glyph('tram', { x: 33, y: 50.5, w: 34, h: 21, ay: 1 }) + box(29.5, 72, 41, 2.2, 0.6), label);
  });
  reg('w-low-flying-aircraft', 'طيران منخفض', function (o, label) {
    return tri(K.glyph('aircraft', { s: 0.3, cx: 50, cy: 60.8, rot: -45 }), label);
  });

  // ---------------------------------------------------------------- road surface
  reg('w-speed-hump', 'مطب لتخفيف السرعة', function (o, label) {
    return tri(G('hump'), label);
  });
  reg('w-uneven-road', 'طريق غير مستو', function (o, label) {
    return tri(G('uneven-road'), label);
  });
  reg('w-slippery-road', 'طريق زلق', function (o, label) {
    return tri(G('slippery-car'), label);
  });
  reg('w-loose-chippings', 'حصى متطاير', function (o, label) {
    return tri(G('loose-chippings'), label);
  });
  // car from behind, left wheels on the road, right wheels sunk into the lower soft verge (dots)
  reg('w-soft-verges', 'حافة الطريق رخوة', function (o, label) {
    var b = { x: 0, y: 0, w: 26, h: 19.4, rot: 13 };
    var p = K.glyphPoint('car-rear', [12, 68.4], b);   // bottom of the left wheel
    b.x += 37.5 - p[0]; b.y += 67.4 - p[1];
    var s = poly([[29, 67.4], [53.5, 67.4], [56, 70.4], [29, 70.4]]);
    [[57.5, 71.4], [61.5, 71.4], [65.5, 71.4], [69.5, 71.4], [55.5, 74.3], [59.5, 74.3], [63.5, 74.3], [67.5, 74.3],
      [71.5, 74.3]].forEach(function (d) { s += dot(d[0], d[1], 1.25); });
    return tri(s + K.glyph('car-rear', b), label);
  });

  // ---------------------------------------------------------------- terrain and structures
  reg('w-falling-rocks', 'احتمال تساقط صخور', function (o, label) {
    return tri(K.glyph('falling-rocks', mirroredFit('falling-rocks')), label);
  });
  function steep(down) {
    var w = down ? [[34, 57], [76, 74], [34, 74]] : [[66, 57], [66, 74], [24, 74]];
    return poly(w) + K.text('10%', 50, 51.5, 9, { family: 'latin' });
  }
  reg('w-steep-descent', 'منحدر حاد', function (o, label) {
    return tri(steep(true), label);
  });
  reg('w-steep-ascent', 'مرتفع حاد', function (o, label) {
    return tri(steep(false), label);
  });
  reg('w-tunnel', 'نفق أمامك', function (o, label) {
    return tri(G('tunnel') + line('M44.6,74L46.4,67.5M55.4,74L53.6,67.5', 1.6), label);
  });
  reg('w-opening-bridge', 'جسر متحرك', function (o, label) {
    return tri(G('swing-bridge'), label);
  });
  reg('w-quayside', 'رصيف ميناء أو ضفة نهر', function (o, label) {
    return tri(K.glyph('quayside', mirroredFit('quayside')), label);
  });
  reg('w-overhead-cable', 'أسلاك كهربائية معلقة', function (o, label) {
    return tri(box(38.6, 47.5, 3, 10, 0.8) + box(58.4, 47.5, 3, 10, 0.8) + line('M40.1,48.8Q50,55 59.9,48.8', 2.2) +
      K.glyph('lightning', { x: 44.5, y: 54, w: 11, h: 20, ay: 1 }), label);
  });
  reg('w-max-height-ahead', 'حد الارتفاع أمامك', function (o, label) {
    return tri(poly([[43.5, 45], [56.5, 45], [50, 51.5]]) + poly([[42, 74], [58, 74], [50, 67]]) +
      K.text('4.5', 54.2, 60, 11, { family: 'latin' }) + K.text('م', 39.6, 59.6, 10), label);
  });
  reg('w-other-danger', 'أخطار أخرى', function (o, label) {
    return tri(G('exclamation'), label);
  });

  // ---------------------------------------------------------------- weather and desert
  reg('w-sand-dunes', 'كثبان رملية أمامك', function (o, label) {
    // two rounded dunes (the front one set off by a thin white outline), sand grains drifting left over the road
    var front = 'M57,74C59.5,68 63.5,64 67.5,64C70.5,64 72.5,68 74,74Z';
    var s = path('M43,74C45,65 50,57.5 56,57.5C61,57.5 64,62 66,65.5L66,74Z') + line(front, 2, C.white) + path(front) +
      box(27.5, 71.2, 14, 2.8, 0);
    [[47.8, 59.2], [43.4, 61.4], [39, 63.6], [45.4, 64.6], [41, 66.8], [36.4, 67.8]].forEach(function (d) {
      s += dot(d[0], d[1], 1.35);
    });
    return tri(s, label);
  });
  reg('w-crosswind', 'رياح جانبية أمامك', function (o, label) {
    var m1 = [42.8, 47.6], m2 = [42.8, 57.8], t1 = [65.6, 57.2], t2 = [65.6, 62], s = '';
    function at(p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; }
    for (var i = 0; i < 5; i++) {
      var a = i / 5, b = (i + 1) / 5;
      s += poly([at(m1, t1, a), at(m1, t1, b), at(m2, t2, b), at(m2, t2, a)], i % 2 ? C.white : C.red);
    }
    s += '<polygon points="' + pts([m1, t1, t2, m2]) + '" fill="none" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/>';
    return tri(box(40, 46, 2.8, 28, 1.2) + s, label);
  });

  // ---------------------------------------------------------------- chevron boards and hazard marker
  function board(inner, w, h, label) {
    return K.rect(inner, { w: w, h: h, bg: C.yellow, rimColor: C.black, r: 4, label: label });
  }
  function chevron(x, y, h, left) { return K.arrow('chevron', { x: x, y: y, h: h, flip: !!left }); }
  function chevronRow(n, w, h, ch, gap, left) {
    var cw = ch * 46 / 60, total = n * cw + (n - 1) * gap, x0 = (w - total) / 2, s = '';
    for (var i = 0; i < n; i++) s += chevron(x0 + i * (cw + gap), (h - ch) / 2, ch, left);
    return s;
  }
  reg('w-chevron-right', 'علامة اتجاه تحذيرية مفردة إلى اليمين', function (o, label) {
    return board(chevron(36 - 58 * 46 / 60 / 2, 19, 58, false), 72, 96, label);
  });
  reg('w-chevron-left', 'علامة اتجاه تحذيرية مفردة إلى اليسار', function (o, label) {
    return board(chevron(36 - 58 * 46 / 60 / 2, 19, 58, true), 72, 96, label);
  });
  reg('w-chevrons-right', 'علامة اتجاه تحذيرية متعددة إلى اليمين', function (o, label) {
    return board(chevronRow(3, 100, 44, 28, 7, false), 100, 44, label);
  });
  reg('w-chevrons-left', 'علامة اتجاه تحذيرية متعددة إلى اليسار', function (o, label) {
    return board(chevronRow(3, 100, 44, 28, 7, true), 100, 44, label);
  });
  reg('w-chevron-t-junction', 'تحويل حاد إلى اليمين أو اليسار عند تقاطع T', function (o, label) {
    var ch = 26, cw = ch * 46 / 60, g = 3, gc = 5, x0 = 50 - gc / 2 - 2 * cw - g, y = (44 - ch) / 2;
    return board(chevron(x0, y, ch, true) + chevron(x0 + cw + g, y, ch, true) +
      chevron(50 + gc / 2, y, ch, false) + chevron(50 + gc / 2 + cw + g, y, ch, false), 100, 44, label);
  });
  // yellow board with black stripes sloping down to the right (traffic passes on the right of the obstacle)
  reg('w-hazard-marker', 'علامة الخطر', function (o, label) {
    var w = 44, h = 100, x0 = 3.2, y0 = 3.2, x1 = w - 3.2, y1 = h - 3.2, per = 18.7, s = '';
    var rectP = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    var uMin = x0 - y1, uMax = x1 - y0, uc = w / 2 - h / 2;
    var k0 = Math.floor((uMin - uc) / per) - 1, k1 = Math.ceil((uMax - uc) / per) + 1;
    for (var k = k0; k <= k1; k++) {
      var a = uc + k * per - per / 4, b = uc + k * per + per / 4;
      var pg = clipHalf(clipHalf(rectP, 1, -1, b), -1, 1, -a);
      if (pg.length >= 3) s += poly(pg);
    }
    return board(s, w, h, label);
  });
})();
