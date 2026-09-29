/* مقود: information, guide and temporary works signs (i-, g-, t-). Drawn from scratch, see docs/drawing.md */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit, C = K.C;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }

  // ------------------------------------------------------------------ colours
  var WH = '#FFFFFF', BK = C.black, RD = C.red, BL = C.blue, GR = C.green, BR = C.brown || '#7B4A26',
    YE = C.yellow, OR = C.orange, GOLD = C.yellow;
  var AMBER = '#F5A623', NAVY = '#173A73';

  // ------------------------------------------------------------------ primitives
  function f(v) { return String(Math.round(v * 100) / 100); }
  function R(x, y, w, h, fill, rx) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '"' +
      (rx ? ' rx="' + f(rx) + '"' : '') + ' fill="' + fill + '"/>';
  }
  function CI(cx, cy, r, fill, op) {
    return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + fill + '"' +
      (op != null ? ' opacity="' + op + '"' : '') + '/>';
  }
  function PA(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function ST(d, col, w, cap, join, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + f(w) + '" stroke-linecap="' +
      (cap || 'butt') + '" stroke-linejoin="' + (join || 'round') + '"' + (extra || '') + '/>';
  }
  function PG(pts, fill, extra) { return '<polygon points="' + K.poly(pts) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function LN(x1, y1, x2, y2, col, w, cap) {
    return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + col +
      '" stroke-width="' + f(w) + '" stroke-linecap="' + (cap || 'butt') + '"/>';
  }
  function G(inner, tr) { return '<g transform="' + tr + '">' + inner + '</g>'; }
  // Arabic text, always direction rtl (anchor 'start' = right edge, 'end' = left edge); Latin text and digits
  // get direction ltr from SignKit.text
  function AR(str, x, y, size, fill, weight, anchor) {
    return K.text(str, x, y, size, { fill: fill || WH, weight: weight || 700, anchor: anchor })
      .replace('<text ', '<text direction="rtl" ');
  }
  function LA(str, x, y, size, fill, weight, anchor) {
    return K.text(str, x, y, size, { fill: fill || WH, weight: weight || 700, family: 'latin', anchor: anchor });
  }
  // shared pictograms (glyphs.js); an empty drawing instead of an error if that file did not load
  function glyph(name, box) { return typeof K.glyph === 'function' ? K.glyph(name, box) : ''; }

  // ------------------------------------------------------------------ arrows
  // straight arrow, tail (x1,y1) to tip (x2,y2)
  function sArrow(x1, y1, x2, y2, sw, hw, hl, fill) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    var bx = x2 - ux * hl, by = y2 - uy * hl;
    return PG([[x1 + nx * sw / 2, y1 + ny * sw / 2], [bx + nx * sw / 2, by + ny * sw / 2], [bx + nx * hw / 2, by + ny * hw / 2],
      [x2, y2], [bx - nx * hw / 2, by - ny * hw / 2], [bx - nx * sw / 2, by - ny * sw / 2], [x1 - nx * sw / 2, y1 - ny * sw / 2]], fill);
  }
  // turtle centre line: start (x,y), heading h (degrees, 0 = up, clockwise), segs [['L', len] | ['A', r, turn]]
  function tPath(x, y, h, segs) {
    var d = 'M' + f(x) + ',' + f(y);
    segs.forEach(function (s) {
      var a = h * Math.PI / 180;
      if (s[0] === 'L') {
        x += Math.sin(a) * s[1]; y -= Math.cos(a) * s[1];
        d += 'L' + f(x) + ',' + f(y);
      } else {
        var r = s[1], t = s[2], sg = t > 0 ? 1 : -1;
        var cx = x + sg * r * Math.cos(a), cy = y + sg * r * Math.sin(a);
        h += t; a = h * Math.PI / 180;
        x = cx - sg * r * Math.cos(a); y = cy - sg * r * Math.sin(a);
        d += 'A' + f(r) + ',' + f(r) + ' 0 ' + (Math.abs(t) > 180 ? 1 : 0) + ' ' + (t > 0 ? 1 : 0) + ' ' + f(x) + ',' + f(y);
      }
    });
    return { d: d, x: x, y: y, h: h };
  }
  function head(x, y, h, hw, hl, fill) {
    var a = h * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), nx = Math.cos(a), ny = Math.sin(a);
    var bx = x - dx * 0.5, by = y - dy * 0.5;
    return PG([[bx + nx * hw / 2, by + ny * hw / 2], [x + dx * hl, y + dy * hl], [bx - nx * hw / 2, by - ny * hw / 2]], fill);
  }
  // shaft along a turtle path plus a triangular head at its end (a.head === false: no head)
  function tArrow(x, y, h, segs, a, fill) {
    var t = tPath(x, y, h, segs);
    return ST(t.d, fill, a.sw, 'butt', 'round') + (a.head === false ? '' : head(t.x, t.y, t.h, a.hw, a.hl, fill));
  }
  function upArrow(x, yTail, yTip, a, fill) { return sArrow(x, yTail, x, yTip, a.sw, a.hw, a.hl, fill); }

  // red "end of" band along the diagonal (x0,y0)-(x1,y1), clipped to that rectangle
  function endBar(x0, y0, x1, y1, w, fill) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy), nx = -dy / L, ny = dx / L;
    function clip(pts, sg) {
      var out = [];
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], q = pts[(i + 1) % pts.length];
        var dp = sg * ((p[0] - x0) * nx + (p[1] - y0) * ny) - w / 2, dq = sg * ((q[0] - x0) * nx + (q[1] - y0) * ny) - w / 2;
        if (dp <= 0) out.push(p);
        if ((dp < 0) !== (dq < 0) && dp !== dq) { var t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
      }
      return out;
    }
    return PG(clip(clip([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 1), -1), fill);
  }

  // ------------------------------------------------------------------ boards
  function board(inner, w, h, bg, label) { return K.rect(inner, { w: w, h: h, bg: bg || BL, label: label }); }
  // board part inside a bigger picture (white rim)
  function panel(x, y, w, h, bg, r) {
    r = r == null ? 6 : r;
    return R(x + 0.8, y + 0.8, w - 1.6, h - 1.6, WH, r) + R(x + 3.2, y + 3.2, w - 6.4, h - 6.4, bg, Math.max(0.5, r - 2.2));
  }
  // temporary works board: yellow, black border
  function ybd(inner, w, h, label) {
    return K.svg(R(0.8, 0.8, w - 1.6, h - 1.6, YE, 8) + R(2.8, 2.8, w - 5.6, h - 5.6, BK, 6.2) +
      R(5.6, 5.6, w - 11.2, h - 11.2, YE, 3.6) + inner, '0 0 ' + w + ' ' + h, label);
  }
  // front-view object tile (docs/drawing.md 5.3): rounded sky panel with a ground band
  function tile(inner, label, o) {
    o = o || {};
    var hy = o.horizon == null ? 56 : o.horizon;
    var ground = 'M1,' + hy + 'L99,' + hy + 'L99,91A8,8 0 0 1 91,99L9,99A8,8 0 0 1 1,91Z';
    return K.svg(R(1, 1, 98, 98, o.sky || '#2B3445', 8) + (o.band ? R(1, hy - 7, 98, 7, o.band) : '') +
      PA(ground, o.ground || '#3A414C') + inner, '0 0 100 100', label);
  }

  // small prohibitory roundel (white disc, red ring, pictogram, red slash)
  function roundel(cx, cy, r, inner) {
    var ri = r * 0.74, a = ri * Math.SQRT1_2;
    return CI(cx, cy, r, WH) + CI(cx, cy, r * 0.93, RD) + CI(cx, cy, ri, WH) + inner +
      LN(cx - a, cy - a, cx + a, cy + a, RD, r * 0.17);
  }

  // ------------------------------------------------------------------ pictograms (local)
  // parking meter, white, box 26 x 48 at (x, y) scaled by s; holes in colour bg
  function meter(x, y, s, fill, bg) {
    return G(R(2, 0, 22, 25, fill, 6) + R(6, 5, 14, 8.5, bg, 1.6) + R(11.2, 16.5, 3.6, 5, bg, 1) +
      R(10, 24, 6, 20, fill) + R(4.5, 43, 17, 5, fill, 1.2), 'translate(' + f(x) + ' ' + f(y) + ') scale(' + f(s) + ')');
  }
  // taxi seen from the front: car-front glyph plus a roof sign; box x, y, w (height ~ 0.9 w)
  function taxiFront(x, y, w, fill) {
    var ch = w * 68.4 / 92, sh = w * 0.13;
    return R(x + w * 0.37, y, w * 0.26, sh, fill, sh * 0.25) +
      glyph('car-front', { x: x, y: y + sh + w * 0.03, w: w, h: ch, fill: fill });
  }
  // delivery motorbike: motorcyclist with a big box behind the rider; box x, y, w (h ~ 0.87 w)
  function deliveryBike(x, y, w, fill) {
    var s = w / 95;
    return glyph('motorcyclist', { x: x, y: y, w: w, h: 82.6 * s, fill: fill }) +
      R(x + (78.5 - 2) * s, y + (17 - 0.4) * s, 18.5 * s, 21.5 * s, fill, 1.5 * s);
  }
  // falcon emblem of the federal E routes (raised wings, head in profile, fan tail), local 100 x 116
  var FALCON_L = [[50, 108], [40, 111], [38, 100], [28, 90], [20, 76], [16, 64], [9.5, 58.5], [13, 52.5], [5.5, 46.5],
    [10, 40.5], [3.5, 33.5], [8, 27.5], [3, 19.5], [4.5, 9], [9, 5], [24, 15.5], [36, 29], [42, 37.5]];
  function eShield(tx, ty, s, num) {
    var pts = FALCON_L.concat(FALCON_L.slice(1).reverse().map(function (p) { return [100 - p[0], p[1]]; }));
    var body = K.poly(pts);
    function draw(fill, sw) {
      var ex = sw ? ' stroke="' + fill + '" stroke-width="' + sw + '" stroke-linejoin="round"' : '';
      return '<polygon points="' + body + '" fill="' + fill + '"' + ex + '/>' +
        '<circle cx="50" cy="26" r="11.5" fill="' + fill + '"' + ex + '/>' +
        '<rect x="42.5" y="30" width="15" height="10" fill="' + fill + '"' + ex + '/>' +
        PA('M57.5,17.5C65,17.5 70.5,22 70.5,29.5C67.5,26.8 64.2,26.6 61,28.6Z', fill, ex);
    }
    return G(draw(WH, 6) + draw(BL, 0) + CI(55.2, 23.2, 1.9, WH) + LA(num || 'E 11', 50, 71, 28, GOLD, 700),
      'translate(' + f(tx) + ' ' + f(ty) + ') scale(' + f(s) + ')');
  }
  // fort-tower emblem of the Dubai D routes, local 100 x 116
  function dShield(tx, ty, s, num) {
    var shapes = [
      'M17,42L83,42L88,112L12,112Z', 'M9,30L91,30L91,44L9,44Z',
      'M9,15L24,15L24,31L9,31Z', 'M31.3,15L46.3,15L46.3,31L31.3,31Z', 'M53.7,15L68.7,15L68.7,31L53.7,31Z',
      'M76,15L91,15L91,31L76,31Z'
    ];
    function draw(fill, sw) {
      var ex = sw ? ' stroke="' + fill + '" stroke-width="' + sw + '" stroke-linejoin="round"' : '';
      return shapes.map(function (d) { return PA(d, fill, ex); }).join('');
    }
    return G(draw(WH, 6) + draw(GR, 0) + LA(num || 'D 94', 50, 77, 28, WH, 700),
      'translate(' + f(tx) + ' ' + f(ty) + ') scale(' + f(s) + ')');
  }
  // freeway pictogram (bridge over a dual carriageway), white on the sign colour, 100 x 100 space
  function freeway(fill) {
    return R(14, 16, 72, 11, fill, 1) +
      PG([[13, 88], [45.5, 88], [48.6, 31], [38.2, 31]], fill) + PG([[54.5, 88], [87, 88], [61.8, 31], [51.4, 31]], fill);
  }
  // Burj Khalifa silhouette, local 24 x 80
  function tower(tx, ty, s, fill) {
    var hw = [[0, 0], [10, 0.7], [18, 1.3], [18, 2.2], [30, 3.1], [30, 4.3], [44, 5.3], [44, 6.7], [58, 7.7], [58, 9.1],
      [71, 10], [80, 10.6]];
    var L = [], Rr = [];
    hw.forEach(function (p) { L.push([12 - p[1], p[0]]); Rr.unshift([12 + p[1], p[0]]); });
    return G(PG(Rr.concat(L), fill), 'translate(' + f(tx) + ' ' + f(ty) + ') scale(' + f(s) + ')');
  }
  // tow truck (facing right) lifting the front of a car (facing right), black, local 150 x 64
  function towScene(fill, bg) {
    var truck =
      // cab and bonnet
      PA('M104,50L104,20C104,18 105,17 107,17L121,17C123,17 124,17.7 125,19.2L131.5,30L140,31.6C142.5,32 144,33.6 144,36.2L144,47' +
        'C144,49 143,50 141,50Z', fill) +
      PA('M108,21L119.8,21C120.8,21 121.4,21.4 121.9,22.2L126.4,30L108,30Z', bg) +
      // deck and chassis
      R(62, 36, 44, 9, fill, 1) + R(58, 44, 50, 6, fill) +
      // crane post and boom
      PG([[86, 36], [92, 36], [80, 12], [74, 12]], fill) + LN(77, 13, 56, 22, fill, 4.2, 'round') +
      LN(56.5, 22, 56.5, 33, fill, 1.6) +
      // wheels
      PA('M68,50m-9,0a9,9 0 1,0 18,0a9,9 0 1,0 -18,0Z', fill) + CI(68, 50, 3.2, bg) +
      PA('M128,50m-9,0a9,9 0 1,0 18,0a9,9 0 1,0 -18,0Z', fill) + CI(128, 50, 3.2, bg);
    var car = glyph('car-side', { x: 4, y: 33, w: 56, h: 22, fill: fill, flip: true, rot: -14 });
    return car + truck;
  }
  // lorry with an open rear door and a parcel on the ground behind it (facing left), local 71 x 37
  function loadingLorry(fill, bg) {
    return PA('M1,30L1,12C1,9.5 2.5,8 5,8L14,8C15.8,8 16.8,8.8 17.5,10.5L19,14L19,30Z', fill) +
      PA('M4,11L13.6,11C14.4,11 15,11.4 15.3,12.2L16.4,15.6L4,15.6Z', bg) +
      R(20.5, 1, 30, 29, fill) + PG([[52, 1], [58.5, 4.5], [58.5, 26.5], [52, 29]], fill) +
      R(4, 29, 47, 3, fill) + PG([[61, 25], [64.5, 21.5], [75, 21.5], [71.5, 25]], fill) + R(61, 25.8, 10.5, 11.2, fill) +
      PG([[72.3, 25.4], [75, 22.6], [75, 33.5], [72.3, 36.4]], fill) +
      PA('M11,32m-5,0a5,5 0 1,0 10,0a5,5 0 1,0 -10,0Z', fill) + CI(11, 32, 1.8, bg) +
      PA('M40,32m-5,0a5,5 0 1,0 10,0a5,5 0 1,0 -10,0Z', fill) + CI(40, 32, 1.8, bg);
  }
  // traffic cone standing at (cx, by), height H
  function cone(cx, by, H) {
    var bh = H * 0.075, top = by - H, bot = by - bh, wb = H * 0.21, wt = H * 0.035;
    function xAt(t, side) { return cx + side * (wt + (wb - wt) * t); }   // t: 0 top .. 1 bottom
    function yAt(t) { return top + (bot - top) * t; }
    function band(t0, t1, fill) {
      return PG([[xAt(t0, -1), yAt(t0)], [xAt(t0, 1), yAt(t0)], [xAt(t1, 1), yAt(t1)], [xAt(t1, -1), yAt(t1)]], fill);
    }
    function shade(t0, t1, fill) {
      return PG([[cx + (xAt(t0, 1) - cx) * 0.25, yAt(t0)], [xAt(t0, 1), yAt(t0)], [xAt(t1, 1), yAt(t1)],
        [cx + (xAt(t1, 1) - cx) * 0.25, yAt(t1)]], fill);
    }
    return PG([[cx - H * 0.3, by], [cx + H * 0.3, by], [cx + H * 0.27, by - bh * 1.15], [cx - H * 0.27, by - bh * 1.15]], BK) +
      PA('M' + f(xAt(1, -1)) + ',' + f(bot + 0.2) + 'L' + f(xAt(0, -1)) + ',' + f(top + wt) + 'Q' + f(cx) + ',' + f(top - wt * 0.6) +
        ' ' + f(xAt(0, 1)) + ',' + f(top + wt) + 'L' + f(xAt(1, 1)) + ',' + f(bot + 0.2) + 'Z', OR) +
      shade(0.03, 1, '#D2630C') +
      band(0.17, 0.36, '#F4F4F0') + shade(0.17, 0.36, '#D3D6DB') +
      band(0.5, 0.64, '#F4F4F0') + shade(0.5, 0.64, '#D3D6DB');
  }

  // ------------------------------------------------------------------ INFORMATION
  reg('i-one-way', 'طريق باتجاه واحد', function (o, label) {
    return board(upArrow(35, 90, 11, { sw: 13, hw: 36, hl: 27 }, WH), 70, 100, BL, label);
  });

  reg('i-dead-end', 'طريق غير نافذ', function (o, label) {
    return board(R(41, 36, 18, 61, WH) + R(17, 16, 66, 24, WH, 1.5) + R(20, 19, 60, 18, RD), 100, 100, BL, label);
  });

  reg('i-parking', 'موقف سيارات', function (o, label) {
    return board(glyph('parking-p', { x: 22, y: 14, w: 56, h: 72, fill: WH }), 100, 100, BL, label);
  });

  reg('i-parking-pod', 'مواقف أصحاب الهمم', function (o, label) {
    return board(glyph('parking-p', { x: 11, y: 22, w: 36, h: 56, fill: WH }) +
      glyph('wheelchair', { x: 52, y: 26, w: 37, h: 48, fill: WH }), 100, 100, BL, label);
  });

  reg('i-paid-parking', 'مواقف خاضعة للرسوم', function (o, label) {
    return board(glyph('parking-p', { x: 12, y: 11, w: 34, h: 53, fill: WH }) + meter(58, 13, 1.06, WH, BL) +
      sArrow(16, 79, 86, 79, 7, 19, 15, WH), 100, 100, BL, label);
  });

  reg('i-goods-parking', 'مواقف مركبات البضائع', function (o, label) {
    return board(glyph('parking-p', { x: 9, y: 26, w: 31, h: 48.4, fill: WH }) +
      glyph('truck-side', { x: 45, y: 46, w: 47, h: 28.4, ay: 1, fill: WH }), 100, 100, BL, label);
  });

  reg('i-loading-zone', 'موقف التحميل والتنزيل', function (o, label) {
    return board(glyph('parking-p', { x: 9, y: 12, w: 24, h: 38, fill: WH }) +
      G(loadingLorry(WH, BL), 'translate(37 26.3) scale(0.6)') +
      R(9, 60, 70, 29, WH, 3) + LA('7 - 10', 44, 75, 19, BK, 700), 88, 100, BL, label);
  });

  reg('i-taxi-stand', 'موقف سيارات الأجرة', function (o, label) {
    return board(glyph('taxi-side', { x: 10, y: 27, w: 74, h: 36, fill: WH }) + LA('TAXI', 128, 47, 30, WH, 700), 166, 90, BL, label);
  });

  reg('i-bus-stop', 'موقف الحافلات', function (o, label) {
    return board(glyph('bus-side', { x: 10, y: 34, w: 68, h: 32, fill: WH }), 88, 100, BL, label);
  });

  reg('i-tow-away', 'منطقة سحب المركبات المخالفة', function (o, label) {
    var w = 150, h = 100;
    return K.svg(R(0.8, 0.8, w - 1.6, h - 1.6, WH, 8) + R(3.2, 3.2, w - 6.4, h - 6.4, RD, 6) + R(9.5, 9.5, w - 19, h - 19, WH, 2.5) +
      G(towScene(BK, WH), 'translate(4 22) scale(0.93)'), '0 0 ' + w + ' ' + h, label);
  });

  reg('i-bicycle-parking', 'موقف الدراجات الهوائية', function (o, label) {
    return board(glyph('parking-p', { x: 30, y: 10, w: 40, h: 42, fill: WH }) +
      glyph('bicycle', { x: 21, y: 58, w: 58, h: 33, fill: WH }), 100, 100, BL, label);
  });

  reg('i-freeway-start', 'بداية الطريق السريع', function (o, label) {
    return board(freeway(WH), 100, 100, BL, label);
  });

  reg('i-freeway-end', 'نهاية الطريق السريع', function (o, label) {
    return board(freeway(WH) + endBar(6, 6, 94, 94, 9, RD), 100, 100, BL, label);
  });

  reg('i-tunnel', 'بداية النفق', function (o, label) {
    var portal = PA('M10,70L10,50A40,34 0 0 1 90,50L90,70Z', WH) + PA('M30,70L30,56A20,20 0 0 1 70,56L70,70Z', '#12396F');
    return board(portal + LN(12, 91, 33, 70, WH, 4) + LN(88, 91, 67, 70, WH, 4), 100, 100, BL, label);
  });

  reg('i-salik', 'بوابة سالك', function (o, label) {
    return board(AR('سالك', 92, 35, 32, WH, 800) + LA('Salik', 92, 69, 26, WH, 700) +
      upArrow(25, 80, 22, { sw: 8, hw: 22, hl: 17 }, WH), 150, 100, BL, label);
  });

  function busLane(end) {
    var s = upArrow(24, 92, 11, { sw: 9, hw: 24, hl: 17 }, WH) + LN(46, 8, 46, 93, WH, 2.4) +
      upArrow(67, 36, 11, { sw: 9, hw: 24, hl: 17 }, WH) +
      glyph('bus-front', { x: 55, y: 39, w: 24, h: 26, fill: WH }) + taxiFront(55, 68, 24, WH);
    if (end) s += endBar(4, 4, 84, 96, 8, RD);
    return s;
  }
  reg('i-bus-lane-start', 'بداية مسار الحافلات وسيارات الأجرة', function (o, label) {
    return board(busLane(false), 88, 100, BL, label);
  });
  reg('i-bus-lane-end', 'نهاية مسار الحافلات وسيارات الأجرة', function (o, label) {
    return board(busLane(true), 88, 100, BL, label);
  });

  var LANE = { sw: 9, hw: 24, hl: 17 };
  reg('i-lane-trucks-restricted', 'ممنوع الشاحنات في المسار الأيسر', function (o, label) {
    var s = '';
    [32, 68, 104].forEach(function (x) { s += upArrow(x, 93, 52, LANE, WH); });
    s += roundel(32, 27, 20, glyph('truck-side', { x: 20, y: 18, w: 24, h: 18, fill: BK }));
    return board(s, 136, 100, BL, label);
  });

  reg('i-lane-delivery-motorbikes', 'ممنوع دراجات التوصيل في المسارين الأيسرين', function (o, label) {
    var s = '';
    [22, 56, 90, 124, 158].forEach(function (x) { s += upArrow(x, 93, 49, { sw: 8, hw: 21, hl: 15 }, WH); });
    [22, 56].forEach(function (x) { s += roundel(x, 24.5, 16.3, deliveryBike(x - 10.4, 16.5, 20.8, BK)); });
    return board(s, 180, 100, BL, label);
  });

  var LA7 = { sw: 7, hw: 18, hl: 14 };
  reg('i-lane-added', 'إضافة مسار', function (o, label) {
    var s = upArrow(22, 93, 11, LA7, WH) + upArrow(42, 93, 11, LA7, WH) +
      PG([[65.5, 74], [65.5, 50], [58.5, 50]], WH) + upArrow(62, 50.5, 11, LA7, WH);
    return board(s, 84, 100, BL, label);
  });

  reg('i-lane-joining', 'انضمام مسار', function (o, label) {
    var s = upArrow(22, 93, 11, LA7, WH) + upArrow(42, 93, 11, LA7, WH) +
      tArrow(74.5, 92.5, -35, [['L', 12.2], ['A', 30, 35], ['L', 36.3]], LA7, WH);
    return board(s, 84, 100, BL, label);
  });

  reg('i-lanes-5-to-4', 'اندماج خمسة مسارات إلى أربعة', function (o, label) {
    var a = { sw: 6, hw: 13, hl: 11 }, s = '';
    [16, 32, 48, 64].forEach(function (x) { s += upArrow(x, 101, 12, a, WH); });
    s += tArrow(80, 101, 0, [['L', 26], ['A', 16, -35], ['L', 17.8], ['A', 16, 35], ['L', 4]], { sw: 6, head: false }, WH);
    return board(s, 96, 108, BL, label);
  });

  reg('i-lane-directions', 'تنظيم المسارات حسب الاتجاه', function (o, label) {
    var a = { sw: 8, hw: 19, hl: 14 };
    var s = tArrow(36, 93, 0, [['L', 59], ['A', 8, -180], ['L', 2]], a, WH) +
      tArrow(36, 80, 0, [['A', 10, -90], ['L', 3]], a, WH) + LN(36, 93, 36, 79, WH, 8) +
      upArrow(65.3, 93, 11, a, WH) + upArrow(94.7, 93, 11, a, WH) +
      tArrow(124, 93, 0, [['L', 53], ['A', 10, 90], ['L', 3]], a, WH);
    return board(s, 160, 100, BL, label);
  });

  reg('i-vms', 'لوحة الرسائل المتغيرة', function (o, label) {
    var w = 170, h = 100, s = R(0.8, 0.8, w - 1.6, h - 1.6, '#4A4F57', 5) + R(5.5, 5.5, w - 11, h - 11, '#0B0C0E', 2);
    for (var i = 0; i < 28; i++) {
      var a = i / 28 * Math.PI * 2;
      s += CI(40 + 24 * Math.cos(a), 50 + 24 * Math.sin(a), 2, '#E5352B');
    }
    s += LA('80', 40, 51, 24, AMBER, 700) + AR('ضباب', 117, 34, 28, AMBER, 700) + LA('FOG', 117, 68, 26, AMBER, 700);
    var grid = '';
    for (var x = 76; x <= 160; x += 1.6) grid += 'M' + f(x) + ',14v72';
    for (var y = 14; y <= 86; y += 1.6) grid += 'M76,' + f(y) + 'h84';
    for (var x2 = 24; x2 <= 56; x2 += 1.6) grid += 'M' + f(x2) + ',38v26';
    for (var y2 = 38; y2 <= 64; y2 += 1.6) grid += 'M24,' + f(y2) + 'h32';
    s += '<path d="' + grid + '" fill="none" stroke="#0B0C0E" stroke-width="0.5"/>';
    return K.svg(s, '0 0 ' + w + ' ' + h, label);
  });

  // ------------------------------------------------------------------ GUIDE
  reg('g-e-route', 'شعار طرق الإمارات (E)', function (o, label) {
    return K.svg(eShield(0, 0, 1, 'E 11'), '0 0 100 116', label);
  });

  reg('g-d-route', 'شعار طرق دبي (D)', function (o, label) {
    return K.svg(dShield(0, 0, 1, 'D 94'), '0 0 100 116', label);
  });

  var GA = { sw: 8, hw: 21, hl: 16 };
  reg('g-blue-direction', 'لوحة اتجاهات زرقاء (طريق اتحادي)', function (o, label) {
    var s = eShield(9, 28, 0.38, 'E 11') +
      AR('أبوظبي', 89, 21.9, 15) + LA('Abu Dhabi', 89, 43.9, 14) +
      AR('جبل علي', 89, 63.7, 15) + LA('Jebel Ali', 89, 85.7, 14) +
      upArrow(142, 86, 16, GA, WH);
    return board(s, 160, 100, BL, label);
  });

  reg('g-green-direction', 'لوحة اتجاهات خضراء (طرق دبي)', function (o, label) {
    var s = dShield(9, 28, 0.38, 'D 94') +
      AR('جميرا', 89, 23.7, 15) + LA('Jumeirah', 89, 41.4, 14) +
      AR('السطوة', 89, 63.2, 15) + LA('Al Satwa', 89, 80.9, 14) +
      upArrow(141, 46, 14, { sw: 7, hw: 19, hl: 14 }, WH) + sArrow(126, 69.8, 155, 69.8, 7, 19, 14, WH);
    return board(s, 162, 100, GR, label);
  });

  reg('g-brown-tourist', 'لوحة سياحية بنية', function (o, label) {
    var s = tower(12, 12, 0.95, WH) + AR('برج خليفة', 84, 38, 17) + LA('Burj Khalifa', 84, 63.5, 14.5) +
      upArrow(142, 84, 20, { sw: 7, hw: 19, hl: 14 }, WH);
    return board(s, 160, 100, BR, label);
  });

  reg('g-white-street', 'لوحة أسماء الشوارع والمناطق', function (o, label) {
    var w = 150, h = 100;
    var s = R(0.8, 0.8, w - 1.6, h - 1.6, WH, 6) + '<rect x="4" y="4" width="' + (w - 8) + '" height="' + (h - 8) +
      '" rx="3.5" fill="' + WH + '" stroke="#1B2B45" stroke-width="2.2"/>' +
      AR('شارع الصفا', 75, 30, 21, NAVY, 700) + LA('Al Safa Street', 75, 56, 15.5, NAVY, 700) +
      LN(14, 70, 136, 70, '#1B2B45', 1) + AR('الصفا 1', 108, 83, 10, NAVY, 600) + LA('Al Safa 1', 42, 83, 9.5, NAVY, 600);
    return K.svg(s, '0 0 ' + w + ' ' + h, label);
  });

  reg('g-exit', 'لوحة المخرج', function (o, label) {
    var s = R(50.8, 0.8, 94.4, 40, WH, 6) + R(0.8, 26.8, 148.4, 84.4, WH, 8) +
      R(53.2, 3.2, 89.6, 36, GR, 3.8) + R(3.2, 29.2, 143.6, 79.6, GR, 5.8) +
      LA('EXIT', 67.6, 17.4, 11, WH, 700) + LA('41', 92.3, 17.4, 17, WH, 700) + AR('مخرج', 122.6, 15.6, 13, WH, 700) +
      AR('ديرة', 56, 59, 26, WH, 700) + LA('Deira', 56, 88, 19, WH, 700) +
      sArrow(100, 97, 135, 60, 8.5, 22, 17, WH);
    return K.svg(s, '0 0 150 112', label);
  });

  reg('g-exit-countdown', 'لوحات العد التنازلي قبل المخرج', function (o, label) {
    var s = '';
    function stripes(bx, by, n) {
      var out = '', x0 = bx + 3.2, x1 = bx + 26.8, fr = n === 3 ? [0.26, 0.5, 0.74] : n === 2 ? [0.36, 0.64] : [0.5];
      fr.forEach(function (t) {
        var yc = by + 66 * t;
        out += PG([[x0, yc + 2.5], [x1, yc - 9.5], [x1, yc - 2.5], [x0, yc + 9.5]], WH);
      });
      return out;
    }
    [[82, 3], [46, 2], [10, 1]].forEach(function (b) {
      s += R(b[0] + 13.5, 72, 3, 24, '#8A8F98') + panel(b[0], 6, 30, 66, GR, 4) + stripes(b[0], 6, b[1]);
    });
    return K.svg(s, '0 0 122 100', label);
  });

  reg('g-distance', 'لوحة المسافات', function (o, label) {
    var s = AR('جبل علي', 46, 17.8, 16) + LA('Jebel Ali', 46, 40.5, 13.5) + AR('أبوظبي', 46, 63.9, 16) + LA('Abu Dhabi', 46, 86.6, 13.5);
    [['25', 28.3], ['120', 72.9]].forEach(function (r) {
      s += LA(r[0], 125, r[1], 24, WH, 700, 'end') + AR('كم', 136.5, r[1] - 7.3, 9) + LA('km', 136.5, r[1] + 5, 8.5);
    });
    return board(s, 150, 100, BL, label);
  });

  reg('g-lane-drop', 'لوحة مخرج بمسارين', function (o, label) {
    var a = { sw: 7, hw: 18, hl: 13 }, bend = [['L', 7], ['A', 10, -45], ['L', 1]];
    var s = LN(80, 9, 80, 91, WH, 1.6) +
      AR('أبوظبي', 41, 21, 16) + LA('Abu Dhabi', 41, 43.2, 12.5) +
      sArrow(24, 53, 24, 92, a.sw, a.hw, a.hl, WH) + sArrow(58, 53, 58, 92, a.sw, a.hw, a.hl, WH) +
      AR('ديرة', 119, 21, 16) + LA('Deira', 119, 43.2, 12.5) +
      AR('مخرج', 132, 57.2, 11) + LA('EXIT', 103.5, 58.2, 10.5) +
      tArrow(103, 67, 180, bend, a, WH) + tArrow(133, 67, 180, bend, a, WH);
    return board(s, 160, 100, GR, label);
  });

  // ------------------------------------------------------------------ TEMPORARY WORKS
  reg('t-road-works', 'أعمال طرق أمامك', function (o, label) {
    var box = typeof K.fit === 'function' ? K.fit('warn', 'worker') : { x: 28, y: 42.6, w: 44, h: 31.4, ay: 1 };
    return K.warn(glyph('worker', box), { bg: YE, label: label });
  });

  var TL = { sw: 8, hw: 20, hl: 15 };
  function closedLane(x) { return R(x - TL.sw / 2, 30, TL.sw, 62.5, BK) + R(x - 9.5, 21, 19, 9.5, RD, 1); }
  reg('t-lane-closed-right', 'المسار الأيمن مغلق أمامك', function (o, label) {
    return ybd(upArrow(23, 92.5, 13, TL, BK) + upArrow(45, 92.5, 13, TL, BK) + closedLane(67), 90, 100, label);
  });
  reg('t-lane-closed-left', 'المسار الأيسر مغلق أمامك', function (o, label) {
    return ybd(closedLane(23) + upArrow(45, 92.5, 13, TL, BK) + upArrow(67, 92.5, 13, TL, BK), 90, 100, label);
  });
  reg('t-two-lanes-closed-right', 'مساران على اليمين مغلقان أمامك', function (o, label) {
    return ybd(upArrow(23, 92.5, 13, TL, BK) + closedLane(45) + closedLane(67), 90, 100, label);
  });

  reg('t-contraflow', 'تحويل إلى الجهة المعاكسة من الطريق المزدوج', function (o, label) {
    var s = sArrow(17, 12, 17, 92.5, TL.sw, TL.hw, TL.hl, BK) +
      R(56.5, 8.5, 4, 32, BK, 2) + R(56.5, 71, 4, 22, BK, 2) +
      tArrow(76, 93, 0, [['L', 18], ['A', 14, -50], ['L', 31.3], ['A', 14, 50], ['L', 3]], TL, BK) +
      R(72, 34, 8, 42, BK) + R(66.5, 24.5, 19, 9.5, RD, 1);
    return ybd(s, 96, 100, label);
  });

  reg('t-diversion', 'تحويلة', function (o, label) {
    return ybd(AR('تحويلة', 65, 27, 30, BK, 800) + LA('DIVERSION', 65, 55, 18, BK, 700) +
      sArrow(26, 79, 106, 79, 9, 24, 19, BK), 130, 100, label);
  });

  reg('t-flagman', 'عامل بعلم أمامك', function (o, label) {
    // flagman glyph a little smaller than its tuned box, so that a bigger red flag still clears the red border
    var k = 0.29, x = 44.3, y = 74 - 98.5 * k;
    var flag = [[8.4, 3.4], [-11, 6.2], [-12, 29], [14.4, 24.7]].map(function (p) { return [x + p[0] * k, y + (p[1] - 2.3) * k]; });
    return K.warn(glyph('flagman', { x: x, y: y, w: 56.8 * k, h: 98.5 * k }) +
      PG(flag, RD, ' stroke="' + RD + '" stroke-width="0.6" stroke-linejoin="round"'), { bg: YE, label: label });
  });

  reg('t-cones', 'أقماع المرور', function (o, label) {
    return tile(LN(58, 99, 76, 56, '#F2F2EE', 1.6) + cone(79, 64, 24) + cone(55, 78, 36) + cone(27, 95, 56), label,
      { horizon: 56 });
  });

  // keep a polygon between x0 and x1 (Sutherland-Hodgman on two vertical lines)
  function clipX(pts, x0, x1) {
    function half(ps, inside, cut) {
      var out = [];
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i], q = ps[(i + 1) % ps.length], ip = inside(p), iq = inside(q);
        if (ip) out.push(p);
        if (ip !== iq) out.push(cut(p, q));
      }
      return out;
    }
    function at(x) { return function (p, q) { var t = (x - p[0]) / (q[0] - p[0]); return [x, p[1] + (q[1] - p[1]) * t]; }; }
    pts = half(pts, function (p) { return p[0] >= x0; }, at(x0));
    return pts.length ? half(pts, function (p) { return p[0] <= x1; }, at(x1)) : pts;
  }

  reg('t-barriers', 'حواجز الأعمال المؤقتة', function (o, label) {
    // a line of barriers receding to the right; each segment has a trapezoid side profile (sloped ends)
    var VP = [172, 40], A = [-14, 92], H = 42, D0 = 3, sl = 0.1;
    function P(d, v) {
      var t = d / (d + D0), x = A[0] + t * (VP[0] - A[0]);
      var yb = A[1] + t * (VP[1] - A[1]), yt = A[1] - H + t * (VP[1] - A[1] + H);
      return [x, yb + (yt - yb) * v];
    }
    function PT(d, k) { var b = P(d, 0), t = P(d, 1); return [t[0], t[1] - (b[1] - t[1]) * k]; }
    function poly(pts, fill) { pts = clipX(pts, 1.2, 98.8); return pts.length > 2 ? PG(pts, fill) : ''; }
    function band(d0, d1, v0, v1, fill) {
      return poly([P(d0 + sl * v0, v0), P(d1 - sl * v0, v0), P(d1 - sl * v1, v1), P(d0 + sl * v1, v1)], fill);
    }
    var s = poly([P(0, 0), P(5, 0), [VP[0], VP[1] + 10], [A[0], A[1] + 3.5]], '#30363F');
    var cols = [[RD, '#A3161F', '#E0555B'], ['#F2F2EE', '#C3C8CF', '#FFFFFF']];
    for (var i = 4; i >= 0; i--) {
      var c = cols[i % 2], d0 = i, d1 = i + 1, m = (d0 + d1) / 2;
      s += poly([P(d1 - 0.05, 0.25), P(d1 + 0.05, 0.25), P(d1 + 0.05, 0.9), P(d1 - 0.05, 0.9)], '#22262D');
      s += poly([P(d0, 0), P(d0 + sl, 1), P(d1 - sl, 1), P(d1, 0)], c[0]) +
        poly([P(d0 + sl, 1), P(d1 - sl, 1), PT(d1 - sl - 0.03, 0.1), PT(d0 + sl + 0.03, 0.1)], c[2]) +
        band(d0, d1, 0.56, 0.66, c[1]) +
        poly([PT(m - 0.09, 0.02), PT(m + 0.09, 0.02), PT(m + 0.09, 0.13), PT(m - 0.09, 0.13)], c[1]) +
        band(d0 + 0.2, m - 0.1, 0.06, 0.2, '#2A2F37') + band(m + 0.1, d1 - 0.2, 0.06, 0.2, '#2A2F37');
    }
    return tile(s, label, { horizon: 40 });
  });

  reg('t-arrow-board', 'لوحة السهم الوامض', function (o, label) {
    var s = R(19, 57, 62, 30, '#E4E6EA', 2) + LN(50, 60, 50, 85, '#9AA3AE', 1.2) +
      R(21, 77, 7, 4, '#C8202A', 1) + R(72, 77, 7, 4, '#C8202A', 1) + R(16, 86, 68, 5, '#2A2F37', 1) +
      R(22, 90, 12, 7, BK, 2) + R(66, 90, 12, 7, BK, 2) +
      R(33, 50, 4, 8, '#5A6475') + R(63, 50, 4, 8, '#5A6475') +
      '<rect x="9" y="7" width="82" height="45" rx="3" fill="#15181D" stroke="#5A6475" stroke-width="1.2"/>';
    var dots = [[20, 29.5]];
    for (var k = 1; k <= 3; k++) { dots.push([20 + 6 * k, 29.5 - 5.8 * k]); dots.push([20 + 6 * k, 29.5 + 5.8 * k]); }
    for (var x = 27; x <= 81; x += 6) dots.push([x, 29.5]);
    dots.forEach(function (p) { s += CI(p[0], p[1], 3.9, AMBER, 0.28); });
    dots.forEach(function (p) { s += CI(p[0], p[1], 2.3, AMBER); });
    return tile(s, label, { sky: '#141A26', band: '#1C2433', ground: '#22262D', horizon: 84 });
  });
})();
