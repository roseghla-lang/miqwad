/* Shared pictogram library for مقود (glyph agent). Extends window.SignKit, never replaces it.
 *
 *  SignKit.glyph(name, opts) -> SVG string (a <g> to put inside a sign base)
 *  SignKit.arrow(kind, opts) -> SVG string (a <g>)
 *    opts: x, y, w, h   target box in the sign's own viewBox. The glyph viewBox is fitted into it
 *                       keeping the aspect ratio (contain), centred (ax / ay 0..1 change the alignment).
 *          s            explicit scale (glyph units -> sign units) instead of fitting; with cx, cy (or the
 *                       box centre) as the centre. Use it to give several arrows the same line weight.
 *          fill         main colour (default SignKit.C.black, some glyphs have their own default, e.g. crescent red)
 *          color2       second colour where a glyph has one (traffic-light lamps, two-way down arrow...)
 *          flip         true mirrors horizontally around the box centre
 *          flipV        true mirrors vertically around the box centre
 *          rot          degrees, clockwise, around the box centre (applied after flip)
 *          bg           background colour of the thin separation halo on the rider's leg (horse-rider, cyclist).
 *                       Default: blue when fill is white, white otherwise. Pass it on any other background.
 *          p            arrows only: geometry overrides, e.g. {len: 60, sw: 12, hw: 30, hl: 20}
 *  SignKit.fit(base, name, extra) -> recommended opts box for that glyph / arrow in 'warn', 'giveWay', 'prohib',
 *                       'mand' or 'square' (warn uses per-glyph tuned boxes that keep the ink inside the triangle):
 *                       SignKit.warn(SignKit.glyph('camel', SignKit.fit('warn', 'camel')))
 *  SignKit.glyphs[name] = {vb:[w,h], draw(fill, color2, opts) -> shapes in 0..w x 0..h, tags, desc, anchors, boxes}
 *  SignKit.arrows[kind] = same shape (default geometry)
 *  SignKit.glyphBox(name, opts)      -> {x, y, w, h, s} where the glyph actually lands (no rot / flip)
 *  SignKit.glyphPoint(name, pt, opts) -> [x, y] of a glyph-space point or named anchor ('label') in sign space
 *  SignKit.glyphIcon(name, {fill, color2, pad, size, label, flip, bg}) -> standalone <svg> for UI use (on the dark
 *                       app theme pass bg: the panel colour, for the halo glyphs horse-rider and cyclist)
 *  SignKit.FRAMES / SignKit.frame(kind, extra)  generic boxes per base: warn (= SignKit.WARN), warnWide, warnTall,
 *                       giveWay, prohib, mand (white fill), square (SignKit.rect, white fill); frame() returns a copy
 *                       merged with extra. Prefer fit() for the glyphs of this library.
 *  Full catalogue, aspect ratios and examples: docs/glyphs.md. Visual check: tools/glyph_gallery.html
 *
 * Rules kept: only plain shapes, no id, no <defs>, every shape has an explicit fill (fill="none" on strokes).
 * Directions: people, animals and vehicles face LEFT unless the name says otherwise (wheelchair faces right
 * like the ISO symbol). UAE drives on the right: roundabout arrows run anticlockwise, U-turn turns left,
 * the two-way arrow on the right points up.
 */
(function () {
  'use strict';

  var K = window.SignKit = window.SignKit || {};
  var C = K.C || { red: '#C8202A', blue: '#1F5AA6', green: '#1E7B47', orange: '#F07F1A', yellow: '#F5C400',
    white: '#FFFFFF', black: '#151515' };
  var AMBER = '#F2A20C';

  // ------------------------------------------------------------------ SVG helpers (glyph space)
  function f(v) { return String(Math.round(v * 100) / 100); }
  function q(p) { return f(p[0]) + ',' + f(p[1]); }
  function P(d, c, eo) { return '<path d="' + d + '" fill="' + c + '"' + (eo ? ' fill-rule="evenodd"' : '') + '/>'; }
  function S(d, c, w, cap) {
    return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + f(w) + '" stroke-linecap="' +
      (cap || 'round') + '" stroke-linejoin="round"/>';
  }
  function M(pts) { return 'M' + pts.map(q).join('L'); }
  function limb(pts, w, c) { return S(M(pts), c, w); }
  function circ(cx, cy, r, c) { return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + c + '"/>'; }
  function ring(cx, cy, r, w, c) {
    return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="none" stroke="' + c + '" stroke-width="' + f(w) + '"/>';
  }
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
  function polyD(pts) { return M(pts) + 'Z'; }
  function poly(pts, c) { return P(polyD(pts), c); }
  // arc (centre, radius, degrees; screen angles: 0 = +x, 90 = down) as a path fragment starting with M
  function arcD(cx, cy, r, a0, a1) {
    var p0 = [cx + r * Math.cos(a0 * Math.PI / 180), cy + r * Math.sin(a0 * Math.PI / 180)];
    var p1 = [cx + r * Math.cos(a1 * Math.PI / 180), cy + r * Math.sin(a1 * Math.PI / 180)];
    var span = a1 - a0;
    return 'M' + q(p0) + 'A' + f(r) + ',' + f(r) + ' 0 ' + (Math.abs(span) > 180 ? 1 : 0) + ' ' + (span > 0 ? 1 : 0) + ' ' + q(p1);
  }
  // wheel: disc with hub hole
  function wheel(cx, cy, r, hub, c) { return P(cD(cx, cy, r) + (hub ? cD(cx, cy, hub) : ''), c, true); }
  // Catmull-Rom spline through points; a point [x, y, 1] is a corner.
  function spline(pts, closed, k) {
    k = k == null ? 1 : k;
    var n = pts.length, d = 'M' + q(pts[0]), segs = closed ? n : n - 1;
    for (var i = 0; i < segs; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (!closed) { if (i === 0) p0 = p1; if (i === n - 2) p3 = p2; }
      var c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) * k / 6, p1[1] + (p2[1] - p0[1]) * k / 6];
      var c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) * k / 6, p2[1] - (p3[1] - p1[1]) * k / 6];
      d += 'C' + q(c1) + ' ' + q(c2) + ' ' + q(p2);
    }
    return d + (closed ? 'Z' : '');
  }
  // spline continuation (no M) through pts, starting from pts[0]
  function splineC(pts, k) {
    k = k == null ? 1 : k;
    var d = '', n = pts.length;
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      var c1 = [p1[0] + (p2[0] - p0[0]) * k / 6, p1[1] + (p2[1] - p0[1]) * k / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) * k / 6, p2[1] - (p3[1] - p1[1]) * k / 6];
      d += 'C' + q(c1) + ' ' + q(c2) + ' ' + q(p2);
    }
    return d;
  }
  // tapered limb: smooth filled shape along pts with a width per point and round ends
  function taperD(pts, ws) {
    var Lp = [], Rp = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], p = pts[i];
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1, h = ws[i] / 2;
      Lp.push([p[0] - dy / l * h, p[1] + dx / l * h]); Rp.push([p[0] + dy / l * h, p[1] - dx / l * h]);
    }
    var he = ws[n - 1] / 2, hs = ws[0] / 2;
    return 'M' + q(Lp[0]) + splineC(Lp) + 'A' + f(he) + ',' + f(he) + ' 0 0 0 ' + q(Rp[n - 1]) +
      splineC(Rp.slice().reverse()) + 'A' + f(hs) + ',' + f(hs) + ' 0 0 0 ' + q(Lp[0]) + 'Z';
  }
  function taper(pts, ws, c) { return P(taperD(pts, ws), c); }
  // sine-like wave from x0 to x1 at y, amplitude a, n full periods (open path)
  function waveD(x0, x1, y, a, n) {
    var L = (x1 - x0) / n, d = 'M' + f(x0) + ',' + f(y), k = a * 4 / 3;
    for (var i = 0; i < n * 2; i++) {
      var s = i % 2 ? 1 : -1, x = x0 + i * L / 2;
      d += 'C' + f(x + L / 6) + ',' + f(y + s * k) + ' ' + f(x + L / 3) + ',' + f(y + s * k) + ' ' + f(x + L / 2) + ',' + f(y);
    }
    return d;
  }
  function rot(pts, deg, cx, cy) {
    var a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
    return pts.map(function (p) {
      var x = p[0] - cx, y = p[1] - cy;
      return [cx + x * co - y * si, cy + x * si + y * co];
    });
  }
  // crescent opening to the right: outer circle (cx,cy,R) minus inner circle (cx+dx, cy, r)
  function crescentD(cx, cy, R, dx, r) {
    var a = (R * R - r * r + dx * dx) / (2 * dx), h = Math.sqrt(Math.max(0, R * R - a * a));
    var p1 = [cx + a, cy - h], p2 = [cx + a, cy + h];
    return 'M' + q(p1) + 'A' + f(R) + ',' + f(R) + ' 0 1 0 ' + q(p2) +
      'A' + f(r) + ',' + f(r) + ' 0 ' + (a > dx ? 1 : 0) + ' 1 ' + q(p1) + 'Z';
  }

  // ------------------------------------------------------------------ placement
  function place(vb, o) {
    o = o || {};
    var s = o.s, w = o.w, h = o.h, x = o.x || 0, y = o.y || 0;
    if (s != null && w == null && h == null) {
      w = vb[0] * s; h = vb[1] * s;
      x = o.cx != null ? o.cx - w / 2 : x; y = o.cy != null ? o.cy - h / 2 : y;
    }
    if (w == null && h == null) { w = vb[0]; h = vb[1]; }
    else if (w == null) w = h * vb[0] / vb[1];
    else if (h == null) h = w * vb[1] / vb[0];
    if (s == null) s = Math.min(w / vb[0], h / vb[1]);
    var ax = o.ax == null ? 0.5 : o.ax, ay = o.ay == null ? 0.5 : o.ay;
    var tx = x + (w - vb[0] * s) * ax, ty = y + (h - vb[1] * s) * ay, cx = x + w / 2, cy = y + h / 2;
    var t = '';
    if (o.rot) t += 'rotate(' + f(o.rot) + ' ' + f(cx) + ' ' + f(cy) + ') ';
    if (o.flip) t += 'matrix(-1 0 0 1 ' + f(2 * cx) + ' 0) ';
    if (o.flipV) t += 'matrix(1 0 0 -1 0 ' + f(2 * cy) + ') ';
    t += 'translate(' + f(tx) + ' ' + f(ty) + ') scale(' + (Math.round(s * 10000) / 10000) + ')';
    return { t: t, s: s, x: tx, y: ty, w: vb[0] * s, h: vb[1] * s, cx: cx, cy: cy };
  }

  function isWhite(c) { return /^(#fff(fff)?|white)$/i.test(String(c || '').trim()); }

  // ------------------------------------------------------------------ registry
  var G = {};
  // vb is [w, h] (drawing starts at 0,0) or an ink box [x0, y0, x1, y1] in the drawing's own coordinates
  function def(name, vb, tags, desc, draw, extra) {
    var fn = draw;
    if (vb.length === 4) {
      var ox = vb[0], oy = vb[1];
      vb = [Math.round((vb[2] - vb[0]) * 100) / 100, Math.round((vb[3] - vb[1]) * 100) / 100];
      if (ox || oy) {
        fn = function (c, c2, o) {
          return '<g transform="translate(' + f(-ox) + ' ' + f(-oy) + ')">' + draw(c, c2, o) + '</g>';
        };
      }
    }
    var g = { vb: vb, tags: tags, desc: desc, draw: fn };
    if (extra) for (var k in extra) g[k] = extra[k];
    G[name] = g;
  }
  function alias(name, target, desc) {
    var t = G[target];
    G[name] = { vb: t.vb, tags: t.tags, desc: desc || t.desc, draw: t.draw, alias: target, fill: t.fill, anchors: t.anchors };
  }
  // draw another glyph inside a glyph (box in the parent's glyph space)
  function use(name, o, c, c2) {
    var g = G[name], pl = place(g.vb, o);
    return '<g transform="' + pl.t + '">' + g.draw(c, c2, o) + '</g>';
  }
  // draw a raw drawing (given its original frame [w, h]) into a box of the parent glyph
  function sub(svg, frame, o) { return '<g transform="' + place(frame, o).t + '">' + svg + '</g>'; }

  // ================================================================== PEOPLE
  // walking adult, facing left, in a 56 x 100 box
  function walker(c) {
    return circ(27.4, 9.8, 9.8, c) +
      limb([[30.4, 30], [33.4, 48.4]], 17.6, c) +
      limb([[27, 29.4], [20.6, 40.6], [12.6, 45.8]], 9.2, c) +
      limb([[35.6, 29.4], [41.6, 40.8], [47.8, 49.4]], 9.2, c) +
      limb([[31.6, 55], [23.8, 72], [15.8, 88.2], [6.4, 94.4]], 11, c) +
      limb([[36, 55], [42, 71.6], [49.4, 85.6], [45.6, 94.4]], 11, c);
  }
  def('person-walk', [56, 100], ['people'], 'adult walking to the left, side view', function (c) { return walker(c); });

  def('pedestrian-crossing', [90, 100], ['people', 'crossing'],
    'person walking left on a zebra crossing (row of stripes under the feet)', function (c) {
      var s = use('person-walk', { x: 20, y: 0, w: 48.2, h: 86 }, c);
      for (var i = 0; i < 5; i++) {
        var x = i * 18.2;
        s += poly([[x + 3, 89], [x + 16.2, 89], [x + 13.2, 100], [x, 100]], c);
      }
      return s;
    });

  def('children', [1.4, 0, 85.6, 100.4], ['people', 'school'],
    'two children walking left: the older one (left) carries a school bag and holds the younger one by the hand',
    function (c) {
      return circ(27, 10.5, 10.5, c) +
        limb([[26, 30], [27.6, 49.5]], 15.5, c) +
        limb([[23.4, 30.5], [17, 40.5], [11.6, 48.4]], 8, c) +
        box(2.4, 48, 17.5, 15.5, 3, c) +
        limb([[31, 31], [38.6, 40.5], [46.5, 46.4]], 8, c) +
        limb([[25, 55.5], [19.4, 72.5], [13.4, 89.5], [6.4, 94.6]], 9.5, c) +
        limb([[29.6, 55.5], [35.4, 72], [41, 88.5], [36.8, 95.2]], 9.5, c) +
        circ(69.5, 37.5, 9.5, c) +
        limb([[68.6, 53.5], [69.8, 69.5]], 13.5, c) +
        limb([[66, 54.5], [57.8, 51.2], [50, 47.5]], 7, c) +
        limb([[72.4, 55], [77.4, 63.5], [81.8, 70.8]], 7, c) +
        limb([[67.8, 75.5], [63, 85.5], [58.2, 93.4], [52.4, 95.8]], 8.5, c) +
        limb([[71.6, 75.5], [76.4, 85], [80.6, 93], [76.4, 95.9]], 8.5, c);
    });

  def('worker', [0, 12.8, 99.8, 84], ['people', 'works'], 'road worker digging with a shovel into a mound (road works)',
    function (c) {
      // shovel: handle from the grip (76,42) down to the blade in the heap at (41,66)
      var blade = rot([[-6.4, 0], [6.4, 0], [6.4, 11], [0, 16.5], [-6.4, 11]], 55.5, 0, 0).map(function (p) {
        return [p[0] + 43.4, p[1] + 64.2];
      });
      return P(spline([[0, 84, 1], [4, 70], [13, 60.6], [25, 57], [37, 60.4], [46, 70], [50, 84, 1]], false) + 'Z', c) +
        limb([[76, 42], [44.6, 63.6]], 4.8, c) + limb([[73.6, 38.8], [78.4, 45.4]], 4.4, c) + poly(blade, c) +
        circ(52.6, 21.4, 8.6, c) +
        limb([[62.4, 30.4], [79, 46.4]], 15.4, c) +
        limb([[62.6, 31.4], [69.4, 38.8], [73.6, 42.6]], 7.8, c) +
        limb([[60.6, 32], [55.4, 42.4], [58.2, 52.8]], 7.8, c) +
        limb([[77, 50.4], [66.6, 61.6], [66.8, 77.6], [59, 78.6]], 10.2, c) +
        limb([[82.4, 50.4], [89, 63.4], [94.6, 76.2], [88.4, 78.8]], 10.2, c);
    });

  def('bicycle', [0, 3.3, 100, 61.5], ['vehicle', 'people'], 'bicycle without rider, facing left', function (c) {
    var w = 5;
    return ring(20.5, 41, 18, w, c) + ring(79.5, 41, 18, w, c) +
      limb([[79.5, 41], [48, 41], [56, 16.5], [79.5, 41]], 4.4, c) +
      limb([[56, 16.5], [27.5, 16.5], [48, 41]], 4.4, c) +
      limb([[20.5, 41], [28.5, 9.5], [22, 5.5]], 4.4, c) +
      limb([[50.5, 10], [61.5, 10]], 5, c) + limb([[56, 10], [56, 16.5]], 4, c) +
      circ(48, 41, 4.4, c);
  });

  def('cyclist', [100, 88], ['people', 'vehicle'],
    'cyclist riding to the left (near leg separated by a thin halo in opts.bg, default white / blue under white)',
    function (c, c2, o) {
      var w = 5, bg = (o && o.bg) || (isWhite(c) ? C.blue : C.white);
      var near = [[55.4, 40.4], [41.6, 48.4], [44.2, 62.2], [38.4, 63.8]];
      return ring(20.5, 67.4, 18, w, c) + ring(79.5, 67.4, 18, w, c) +
        limb([[79.5, 67.4], [49, 67.4], [56.4, 44], [79.5, 67.4]], 4.2, c) +
        limb([[56.4, 44], [30, 43], [49, 67.4]], 4.2, c) +
        limb([[20.5, 67.4], [29.4, 35.4], [24, 32]], 4.4, c) +
        circ(49, 67.4, 3.6, c) +
        limb([[57, 41], [57.4, 56.6], [54.4, 72.4], [48.4, 73.4]], 8.6, c) +
        limb(near.slice(1), 11.6, bg) + limb(near, 8.6, c) +
        circ(33.4, 9.6, 8.6, c) +
        limb([[56.4, 38.6], [40.6, 24]], 13.6, c) +
        limb([[39.6, 24.6], [31.4, 29.6], [25, 32.6]], 7.2, c);
    });

  function motoBody(c) {
    // motorcycle without rider, facing left, in a 100 x 58 box (wheels r 15 at y 42)
    return P(cD(17, 42, 15) + cD(17, 42, 8.4), c, true) + circ(17, 42, 3.8, c) +
      P(cD(82, 42, 15) + cD(82, 42, 8.4), c, true) + circ(82, 42, 3.8, c) +
      limb([[33.6, 13.4], [17, 42]], 5.4, c) +
      limb([[33.6, 13.4], [37.4, 5.4], [44, 5.4]], 4.4, c) +
      circ(27, 18.6, 5.2, c) +
      P('M35,19C37,13.6 42,11 48.6,11C54,11 58.4,12.8 61.4,15.4L84.4,15.4C88.4,15.4 92.6,16.6 95,19.8L96,22.4' +
        'L84,23.4L70,25L62,31.4L62,39.6C62,42 60.4,43.4 58,43.4L44,43.4C41.6,43.4 40,42 40,39.6L40,27.6Z', c) +
      limb([[60, 34.6], [82, 42]], 5.2, c);
  }

  def('motorcycle-side', [2, 3.2, 97, 57], ['vehicle'], 'motorcycle without rider, facing left', function (c) {
    return motoBody(c);
  });

  def('motorcyclist', [2, 0.4, 97, 83], ['people', 'vehicle'], 'motorcyclist with helmet riding to the left', function (c) {
    return '<g transform="translate(0 26)">' + motoBody(c) + '</g>' +
      P(cD(49, 11, 10.6) + rD(38, 8.6, 9.4, 5.4, 2.4), c, true) +
      limb([[69.4, 37.4], [54.2, 25.4]], 14, c) +
      limb([[52.6, 26], [45.6, 30.4], [43, 31.6]], 7.6, c) +
      limb([[68, 40.4], [54.6, 45.4], [58.4, 58.6], [52.4, 60.4]], 9, c);
  });

  def('wheelchair', [11, 0, 85.5, 99], ['people', 'service'],
    'wheelchair user (International Symbol of Access), facing RIGHT like the ISO symbol', function (c) {
      return circ(29, 9.5, 9.5, c) +
        limb([[29.5, 27.5], [31.5, 55.5]], 13, c) +
        limb([[31, 34.4], [52.5, 36.4]], 8.4, c) +
        limb([[31.5, 57.5], [60.5, 57.5], [72.5, 84.5], [80.5, 84.5]], 10, c) +
        S(arcD(40, 70, 25, -12, 250), c, 8);
    });

  def('person-standing', [2, 0, 38, 99.8], ['people'], 'person standing, front view', function (c) {
    return circ(20, 9.8, 9.8, c) +
      limb([[20, 30], [20, 53]], 16, c) +
      limb([[6.8, 27.5], [5.6, 55]], 7.2, c) + limb([[33.2, 27.5], [34.4, 55]], 7.2, c) +
      limb([[14.8, 60], [14, 95.5]], 8.4, c) + limb([[25.2, 60], [26, 95.5]], 8.4, c);
  });

  // ================================================================== VEHICLES
  function carSideBody() {
    return 'M2.6,34L2.2,26.6C2.2,22.6 4.2,20.6 8.6,20.1L27,18.1L35.6,7.6C36.9,6 38.2,5.2 40.5,5.2L63,5.2' +
      'C65.6,5.2 67,5.9 68.5,7.8L77.6,18.2L94,19.6C96.8,19.8 98,21.3 98,24.1L98,31.6C98,33.4 97,34 95.5,34L90.8,34' +
      'A11.3,11.3 0 0 0 68.2,34L31,34A11.3,11.3 0 0 0 8.4,34Z' +
      'M31.4,16.6L38.9,8.3C39.4,7.7 40,7.5 40.9,7.5L50.4,7.5L50.4,16.6Z' +
      'M53.6,16.6L53.6,7.5L62.6,7.5C63.8,7.5 64.6,7.9 65.3,8.8L72.4,16.6Z';
  }
  function carSide(c) {
    return P(carSideBody(), c, true) + wheel(19.7, 34, 8.6, 3.2, c) + wheel(79.5, 34, 8.6, 3.2, c);
  }
  def('car-side', [2.2, 5.2, 98, 42.6], ['vehicle'], 'saloon car, side view, facing left', function (c) { return carSide(c); });

  function carFrontRear(c, rear) {
    var cabin = 'M21.5,31L28.6,9.4C29.7,6.3 31.8,4.6 35.4,4.6L64.6,4.6C68.2,4.6 70.3,6.3 71.4,9.4L78.5,31Z';
    var glass = rear ? rD(31, 10.5, 38, 15.5, 3) : 'M27.6,27.6L33,11.6C33.6,9.8 34.6,9 36.6,9L63.4,9C65.4,9 66.4,9.8 67,11.6L72.4,27.6Z';
    var bodyD = 'M4,39C4,33 8,30 14,29.5L86,29.5C92,30 96,33 96,39L96,58.5C96,61.4 94.4,63 91.5,63L8.5,63' +
      'C5.6,63 4,61.4 4,58.5Z';
    var holes = rear ?
      rD(8.5, 35.5, 20, 7.5, 2.5) + rD(71.5, 35.5, 20, 7.5, 2.5) + rD(38, 46, 24, 8.5, 1.5) :
      rD(8.5, 35.5, 17, 8.5, 3) + rD(74.5, 35.5, 17, 8.5, 3) + rD(33, 37.5, 34, 6.5, 2) + rD(33, 47, 34, 3.5, 1.5);
    return P(cabin + glass, c, true) + P(bodyD + holes, c, true) +
      box(7.5, 58, 17, 15, 3, c) + box(75.5, 58, 17, 15, 3, c) +
      box(11.5, 22.5, 11, 6.5, 2.5, c) + box(77.5, 22.5, 11, 6.5, 2.5, c);
  }
  def('car-front', [4, 4.6, 96, 73], ['vehicle'], 'car seen from the front (windscreen, headlights, grille)', function (c) {
    return carFrontRear(c, false);
  });
  def('car-rear', [4, 4.6, 96, 73], ['vehicle'], 'car seen from behind (rear window, tail lights, number plate); used for no-overtaking',
    function (c) { return carFrontRear(c, true); });

  def('truck-side', [1, 2, 99, 56], ['vehicle'], 'lorry / goods vehicle, side view, facing left (cab + box, three wheels)',
    function (c) {
      return P('M1,44L1,15C1,11.5 3,9.5 6.5,9.5L21.5,9.5C24.2,9.5 25.6,10.6 26.6,13L28.5,18L28.5,44L26.7,44' +
        'A12,12 0 0 0 3.3,44Z' + 'M5,13.2L20.6,13.2C22,13.2 22.8,13.8 23.3,15.2L25,20.6C25.3,21.6 24.8,22.6 23.5,22.6L5,22.6Z', c, true) +
        P('M31.2,44L31.2,2L99,2L99,44L97.7,44A12,12 0 0 0 74.3,44L73.7,44A12,12 0 0 0 50.3,44Z', c) +
        wheel(15, 46.5, 9.5, 3.4, c) + wheel(62, 46.5, 9.5, 3.4, c) + wheel(86, 46.5, 9.5, 3.4, c);
    });

  def('truck-front', [100, 94], ['vehicle'], 'lorry seen from the front (cab with the load box behind it)', function (c) {
    // load box behind the cab, with a notch (gap) around the cab roof
    return P('M3,3C3,1.3 4.3,0 6,0L94,0C95.7,0 97,1.3 97,3L97,36L92.6,36L92.6,29.6C92.6,24.6 89,21.4 84,21.4L16,21.4' +
      'C11,21.4 7.4,24.6 7.4,29.6L7.4,36L3,36Z', c) +
      P(rD(10, 24, 80, 58, 6) + rD(16, 30, 68, 21, 3) + rD(30, 57, 40, 13, 2) + rD(16, 60, 11, 7, 2) +
        rD(73, 60, 11, 7, 2), c, true) +
      box(12, 78, 17, 16, 3, c) + box(71, 78, 17, 16, 3, c) +
      limb([[10, 42], [3.5, 43], [3.5, 52]], 3, c) + limb([[90, 42], [96.5, 43], [96.5, 52]], 3, c) +
      box(0.5, 46, 6, 13, 1.5, c) + box(93.5, 46, 6, 13, 1.5, c);
  });

  def('bus-side', [1.4, 2.5, 99, 44.7], ['vehicle'], 'bus, side view, facing left (row of windows, front door)', function (c) {
    var holes = rD(7.6, 6.4, 8.8, 23.6, 1.6);
    for (var i = 0; i < 5; i++) holes += rD(20.5 + i * 15.4, 6.4, 13.2, 12.8, 1.8);
    return P('M3.4,35.5L1.6,9C1.3,5 3.6,2.5 7.6,2.5L95,2.5C97.4,2.5 99,4 99,6.5L99,35.5L91.3,35.5' +
      'A10.4,10.4 0 0 0 70.7,35.5L36.3,35.5A10.4,10.4 0 0 0 15.7,35.5Z' + holes, c, true) +
      wheel(26, 36.5, 8.2, 3, c) + wheel(81, 36.5, 8.2, 3, c);
  });

  def('bus-front', [0, 2, 76, 92], ['vehicle', 'service'], 'bus seen from the front (big windscreen, destination board)',
    function (c) {
      return P(rD(8, 2, 60, 78, 8) + rD(18, 7, 40, 7, 1.5) + rD(13.5, 18, 49, 32, 4) + cD(19, 64, 4.4) + cD(57, 64, 4.4) +
        rD(29, 60.5, 18, 7, 1.5), c, true) +
        box(12, 77, 13, 15, 2.5, c) + box(51, 77, 13, 15, 2.5, c) +
        limb([[8.5, 9], [3, 10], [2.5, 20]], 2.8, c) + limb([[67.5, 9], [73, 10], [73.5, 20]], 2.8, c) +
        box(0, 16, 5.5, 12, 1.5, c) + box(70.5, 16, 5.5, 12, 1.5, c);
    });
  alias('bus-stop', 'bus-front', 'bus seen from the front, for bus stop / bus lane signs (same drawing as bus-front)');

  def('tractor-side', [4, 2, 99.4, 83.5], ['vehicle'], 'farm tractor, side view, facing left (big rear wheel, cab)', function (c) {
    return P(cD(71, 58, 25) + cD(71, 58, 13.5), c, true) + circ(71, 58, 6.5, c) +
      P(cD(18.5, 69, 14.5) + cD(18.5, 69, 6.5), c, true) + circ(18.5, 69, 3, c) +
      P('M5,40.5C5,38.5 6.5,37 8.5,37L50,37L50,52.5L5,52.5Z', c) +
      box(27, 19, 5, 19, 1.5, c) +
      P('M34,52L43,52L43,62L34,62Z', c) +
      box(47, 2, 44, 5.5, 2, c) +
      limb([[51.5, 5], [48.5, 38]], 4, c) + limb([[87, 5], [90.5, 30]], 4, c) +
      S(arcD(71, 58, 29.5, 196, 332), c, 4.2) +
      P('M47,30L66,30L66,41L47,41Z', c);
  });

  def('taxi-side', [2.2, 4.5, 98, 49.6], ['vehicle', 'service'], 'taxi: car side view facing left with a roof sign', function (c) {
    return '<g transform="translate(0 7)">' + carSide(c) + '</g>' +
      P('M44.5,13L46.2,6C46.5,5 47.1,4.5 48.1,4.5L58.9,4.5C59.9,4.5 60.5,5 60.8,6L62.5,13Z', c);
  });

  def('police-car', [2.2, 3.6, 98, 49.6], ['vehicle'], 'police car: car side view facing left with a light bar', function (c) {
    return '<g transform="translate(0 7)">' + carSide(c) + '</g>' +
      box(42, 8.4, 22, 4.6, 1.2, c) + P('M44,8.6C44,5.6 46,3.6 49,3.6C52,3.6 54,5.6 54,8.6Z', c) +
      P('M54.5,8.6C54.5,5.6 56.5,3.6 59.5,3.6C62.5,3.6 64.5,5.6 64.5,8.6Z', c);
  });

  def('ambulance-side', [2, 0, 99, 48.4], ['vehicle', 'service'],
    'ambulance van, side view facing left, crescent on the body (a hole, or drawn in color2) and a roof light',
    function (c, c2) {
      var cres = crescentD(58, 21.2, 9.6, 5.2, 8);
      return P('M2,38L2,27C2,24.4 3,22.8 5.6,21.8L12.4,19L20.2,5.8C21.2,4.1 22.6,3.2 24.8,3.2L96,3.2C97.8,3.2 99,4.4 99,6.2' +
        'L99,36C99,37.5 98,38 96.6,38L91.9,38A10.9,10.9 0 0 0 70.1,38L30.9,38A10.9,10.9 0 0 0 9.1,38Z' +
        'M15.2,18.6L21.9,7.8C22.4,7 23,6.6 24,6.6L31.4,6.6L31.4,18.6Z' + (c2 ? '' : cres), c, true) +
        (c2 ? P(cres, c2) : '') + box(24, 0, 10, 4, 1.2, c) +
        wheel(20, 39.8, 8.6, 3.1, c) + wheel(81, 39.8, 8.6, 3.1, c);
    });

  def('helicopter', [1, 0, 95.3, 55], ['vehicle'], 'helicopter, side view facing left', function (c) {
    return box(1, 0, 86, 4.2, 2.1, c) + box(40, 3, 4.4, 11, 1, c) +
      P('M5,33C5,21 14,12.5 30,12.5L54,12.5C60,12.5 62.5,15.5 62.5,21.5L62.5,33C62.5,39.5 58.5,43.5 52,43.5L17,43.5' +
        'C9.5,43.5 5,39.5 5,33Z' + 'M9.5,29C10.5,21.5 16,16.5 26,16.5L28,16.5L28,29Z', c, true) +
        poly([[60, 19], [92, 23.6], [92, 28.6], [60, 32.5]], c) +
        box(90.5, 12, 4.6, 26, 2.3, c) +
        box(8, 51, 50, 4, 2, c) + limb([[21, 42], [19, 52]], 3.4, c) + limb([[47, 42], [49, 52]], 3.4, c);
  });

  // ================================================================== ANIMALS
  // leg helper for hoofed animals: [top, knee/hock, fetlock, toe], upper width, lower width
  function hoofLeg(pts, wu, wl, c, knob) {
    return limb([pts[0], pts[1]], wu, c) + limb(pts.slice(1), wl, c) + (knob ? circ(pts[1][0], pts[1][1], knob, c) : '');
  }

  def('camel', [0, 1.4, 126, 100], ['animal'], 'dromedary camel (one hump, long curved neck) walking to the left',
    function (c) {
    var body = spline([
      [0.6, 29.4], [2.6, 25], [8, 22.4], [13.4, 20.2], [16.4, 18.4], [18.6, 15.8, 1], [20.8, 19.2], [22.8, 23.6],
      [25.4, 31], [29.8, 37], [35.8, 39.6], [43, 37.2], [49.6, 30.4], [56.8, 17.6], [66.4, 5.6], [76, 1.6], [85.6, 5.2],
      [94, 16.4], [102.2, 23.8], [110.6, 27.2], [116.8, 32], [120, 40.4], [118.6, 49.6], [112.8, 54.6], [102, 54],
      [88, 52.8], [72, 53.8], [60, 56], [51, 55.6], [43.8, 51.8], [35.8, 48.4], [27.6, 43.4], [21, 38.6], [16.4, 33.6],
      [11, 33.4], [5.4, 33.6], [2, 32.6]
    ], true);
    function pad(x) {
      return 'M' + f(x - 5) + ',100C' + f(x - 5.6) + ',97.4 ' + f(x - 3.6) + ',94.8 ' + f(x - 0.8) + ',94.6L' + f(x + 1.8) +
        ',94.6C' + f(x + 3.2) + ',95.4 ' + f(x + 3.6) + ',97.8 ' + f(x + 3.4) + ',100Z';
    }
    function leg(pts, ws) { var e = pts[pts.length - 1]; return taper(pts, ws, c) + P(pad(e[0]), c); }
    var FW = [12.4, 8.2, 7.6, 5.4, 5.4, 5.2], HW = [15.6, 8.8, 7, 5.4, 5.4, 5.2];
    return P(body, c) +
      leg([[47.2, 46], [45, 62], [43.4, 74], [42.6, 82], [41.8, 91], [41.4, 96]], FW) +
      leg([[56, 47], [56.8, 62], [57.8, 74], [58.6, 82], [59.8, 91], [59.8, 96]], FW) +
      leg([[104, 44], [107.6, 60], [110.4, 72], [108.4, 82], [106.6, 91], [106, 96]], HW) +
      leg([[112, 43], [116.6, 58], [119.4, 70.6], [119.4, 82], [119, 91], [118.8, 96]], HW) +
      S(spline([[118.8, 37.4], [122.4, 43.6], [123.8, 52.4]], false), c, 2.4) +
      P('M122.2,50.6C124.6,50.8 126,53.4 125.8,57.4C125.6,60.6 123.6,62.4 122.6,62.2C121.2,59.6 120.8,54.8 122.2,50.6Z', c);
  });

  def('cow', [1, 0.2, 116.4, 76.4], ['animal'], 'cow / cattle walking to the left', function (c) {
    var body = spline([
      [3.4, 46.4, 1], [1, 40.4], [2.4, 33], [5.6, 24.4], [10.6, 16], [17.6, 12], [26, 11.4], [38, 8], [60, 9.6], [84, 9.4],
      [98, 6.4], [107, 9], [111.6, 15], [112.6, 26], [110.4, 38], [104, 46], [97.6, 48], [92, 50], [88.4, 55.4],
      [83, 55.4], [80, 50.6], [64, 50], [46, 49], [38, 49.6], [30, 47.4], [24, 43.4], [18.4, 42], [13, 47.4], [7.6, 48.4, 1]
    ], true);
    return P(body, c) +
      taper([[13.8, 15], [10, 9.4], [10.2, 3]], [5.6, 4, 2.6], c) + taper([[18.8, 13.2], [19.2, 7.2], [23, 3]], [5.6, 4, 2.6], c) +
      poly([[18.6, 15.4], [31.6, 17.6], [30.4, 20.2], [21.4, 21.4]], c) +
      taper([[38.4, 44], [38.2, 60], [38, 72.2]], [10.6, 7.8, 7.8], c) +
      taper([[47.4, 44], [47.8, 60], [48, 72.2]], [10.6, 7.8, 7.8], c) +
      taper([[98, 40], [102.4, 58], [100.4, 72.2]], [15, 7.8, 7.8], c) +
      taper([[106, 36], [110, 56], [109, 72.2]], [15, 7.8, 7.8], c) +
      S(spline([[107.6, 10], [112.8, 24], [113.8, 46]], false), c, 2.6) +
      P('M111.4,44.6C112.8,44 114.8,44 116.2,44.6L115.6,54C115.4,55.6 112.4,55.6 112.2,54Z', c);
  });

  def('gazelle', [2, 0, 124.4, 78.6], ['animal'], 'gazelle leaping to the left with long curved horns (wild animals)', function (c) {
    var body = spline([
      [2, 24.4, 1], [5.4, 18.6], [11.6, 14.4], [17, 12.8], [23.6, 8.6, 1], [22.4, 16], [26.8, 22.4], [33.4, 29.4],
      [40.6, 31.8], [56, 32.6], [74, 31.6], [88, 29.8], [94.2, 27.4, 1], [98.4, 24.2, 1], [98.8, 30.8], [98.6, 40],
      [94, 47.4], [84.4, 50], [68, 51.4], [54, 51.2], [45, 49], [37.6, 43.4], [31, 36], [24.4, 28.6],
      [17.6, 26.2], [10.4, 27.2], [4.4, 26.8, 1]
    ], true);
    return P(body, c) +
      S(spline([[15.8, 13.6], [16.6, 6.6], [20.8, 2.4], [26.8, 1.6]], false), c, 3.2) +
      S(spline([[18.4, 12.8], [20.4, 6.8], [25.4, 3.8], [31, 4.2]], false), c, 3.2) +
      taper([[45, 45], [38.4, 51.6], [34, 57], [37.2, 62.6], [40.4, 67]], [10, 6.2, 5.2, 4, 4], c) +
      taper([[50.4, 47.4], [44.4, 54.6], [40.6, 60.2], [44.6, 66.2], [48.2, 70.2]], [10, 6.2, 5.2, 4, 4], c) +
      taper([[92, 42], [100, 49], [106.8, 55], [115, 58.4], [122.2, 60.6]], [13, 7.4, 5, 4, 4], c) +
      taper([[88, 44], [95, 53], [100.4, 60], [107.4, 68.6], [113.2, 76.6]], [12, 7, 5, 4, 4], c);
  });

  def('horse-rider', [2.2, 3.6, 99.8, 100], ['animal', 'people'], 'horse walking to the left with a rider', function (c, c2, o) {
    var bg = (o && o.bg) || (isWhite(c) ? C.blue : C.white);
    var body = spline([
      [3.6, 51, 1], [2.4, 45.4], [5, 39.6], [10.6, 31.6], [15.4, 24.6], [15.2, 17.4, 1], [19.6, 22.2], [24.6, 26.4],
      [31.6, 32.4], [38.6, 39.6], [44.6, 45], [50, 47.4], [60, 49.4], [72, 48.2], [80, 46.6], [86.6, 49.4], [89.6, 56.6],
      [88, 65.6], [82.6, 70.4], [72, 72.4], [58, 73], [48, 71.6], [41.6, 68.4], [35.6, 62], [31.6, 53.6], [26.6, 46.6],
      [19.6, 42.2], [14.4, 46.2], [9.4, 52.4, 1]
    ], true);
    var leg = [[62, 44], [55, 55.4], [57.6, 72], [52.6, 73.6]];
    return P(body, c) +
      taper([[39, 62], [37.4, 72], [36, 82], [34.4, 93], [34, 97]], [9.4, 6.6, 6, 4.6, 5.6], c) +
      taper([[45, 65], [46.6, 74], [47.4, 83.6], [49, 93], [49.4, 97]], [9.4, 6.6, 6, 4.6, 5.6], c) +
      taper([[79.4, 62], [83.6, 72], [85.6, 82], [83, 93], [82.4, 97]], [12.4, 7.6, 6, 4.6, 5.6], c) +
      taper([[85, 58], [89.4, 70], [91.6, 79], [90.8, 93], [90.6, 97]], [12.4, 7.6, 6, 4.6, 5.6], c) +
      S(spline([[88.4, 52], [95, 60], [96.6, 72], [95.6, 80]], false), c, 6) +
      limb(leg, 10, bg) + limb(leg, 6.6, c) +
      limb([[60.4, 22.6], [62, 42.6]], 11.6, c) +
      circ(60, 10.4, 6.8, c) +
      limb([[59, 25], [54.6, 34], [46, 38.4]], 5.8, c);
  });

  // ================================================================== HAZARDS AND SCENES
  def('slippery-car', [21, 3.4, 81.6, 99.4], ['hazard', 'vehicle'],
    'car seen from behind, skewed, with two wavy skid marks (slippery road)', function (c) {
      return sub(carFrontRear(c, true), [100, 73], { x: 18, y: 2, w: 64, h: 46.7, rot: -10 }) +
        S('M31.4,52C24.4,61 38.4,65.6 50,73C61.4,80.4 72.4,86.4 66.4,97', c, 4.6) +
        S('M67.6,46.4C75.4,56.6 61.6,63 50,71C38.6,79 27.4,85.6 34.4,97', c, 4.6);
    });

  def('falling-rocks', [0, 0, 98, 92], ['hazard'], 'rocks falling from a cliff on the left side', function (c) {
    return poly([[0, 0], [21, 0], [25, 10], [21, 20], [29, 32], [26, 44], [34, 56], [31, 68], [39, 80], [37, 92], [0, 92]], c) +
      poly([[45, 13], [54, 9.4], [59, 16.4], [55, 24.4], [46, 23.4]], c) +
      poly([[64, 31], [72, 29], [75, 36], [69, 41], [63, 38]], c) +
      poly([[49, 47], [59, 43], [65, 51], [59, 59], [49, 56]], c) +
      poly([[73, 59], [85, 55], [91, 65], [83, 73], [73, 69]], c) +
      poly([[57, 84], [67, 78], [77, 84], [73, 92], [59, 92]], c) +
      poly([[82, 86], [90, 81.6], [98, 87], [96, 92], [82, 92]], c);
  });

  def('hump', [0, 4, 100, 30], ['hazard', 'road'], 'road hump: road profile with one bump', function (c) {
    return P('M0,30L0,22L20,22C32,22 38,4 50,4C62,4 68,22 80,22L100,22L100,30Z', c);
  });

  def('uneven-road', [0, 4, 100, 28], ['hazard', 'road'], 'uneven road: road profile with two bumps', function (c) {
    return P('M0,28L0,20L6,20C14,20 17,4 26,4C35,4 38,20 46,20L54,20C62,20 65,4 74,4C83,4 86,20 94,20L100,20L100,28Z', c);
  });

  def('loose-chippings', [1.4, 16, 98, 64], ['hazard', 'vehicle'], 'car facing left throwing up loose stones behind it',
    function (c) {
      return sub(carSide(c), [100, 42.6], { x: 0, y: 30, w: 74, h: 31.5 }) +
        poly([[78, 44], [83, 41], [86, 46], [81, 49]], c) +
        poly([[86, 30], [91, 28], [93, 33], [88, 35]], c) +
        poly([[92, 42], [98, 41], [98, 47], [93, 48]], c) +
        poly([[81, 55], [87, 53], [88, 59], [82, 60]], c) +
        poly([[93, 17], [97, 16], [98, 21], [94, 22]], c) +
        poly([[77, 26], [81, 25], [81, 29], [77.5, 30]], c) +
        poly([[88, 60], [93, 58], [95, 63], [89, 64]], c);
    });

  def('steep-down', [100, 56], ['hazard', 'road'],
    'steep descent: wedge sloping down to the right; put the % label at the "label" anchor (upper right)', function (c) {
      return poly([[0, 0], [100, 56], [0, 56]], c);
    }, { anchors: { label: [72, 17] } });
  def('steep-up', [100, 56], ['hazard', 'road'],
    'steep ascent: wedge rising to the right; put the % label at the "label" anchor (upper left)', function (c) {
      return poly([[100, 0], [100, 56], [0, 56]], c);
    }, { anchors: { label: [28, 17] } });

  def('tunnel', [100, 66], ['hazard', 'road'], 'tunnel portal: arch-shaped opening in a solid portal', function (c) {
    return P('M0,66L0,32A50,32 0 0 1 100,32L100,66L76,66L76,42A26,26 0 0 0 24,42L24,66Z', c);
  });

  def('aircraft', [2, 0, 98, 100], ['hazard', 'service'], 'aeroplane seen from above, nose UP (use rot for other headings)',
    function (c) {
      return P('M50,0C54,0 56,6 56,14L56,78C56,86 54,93 50,100C46,93 44,86 44,78L44,14C44,6 46,0 50,0Z', c) +
        poly([[44.5, 33], [2, 58], [2, 66], [44.5, 53]], c) + poly([[55.5, 33], [98, 58], [98, 66], [55.5, 53]], c) +
        poly([[45, 81], [28, 93], [28, 98], [45, 92]], c) + poly([[55, 81], [72, 93], [72, 98], [55, 92]], c) +
        box(20.5, 38, 7.4, 15, 3.7, c) + box(72.1, 38, 7.4, 15, 3.7, c);
    });

  def('windsock', [2.8, 0, 97, 84], ['hazard'], 'windsock on a pole blowing to the right (crosswind)', function (c) {
    // sock centre line from (12,19) to (97,31), half height 14 -> 4.6
    function seg(a, b) {
      function at(t) { return [12 + 85 * t, 19 + 12 * t, 14 - 9.4 * t]; }
      var A = at(a), B = at(b);
      return poly([[A[0], A[1] - A[2]], [B[0], B[1] - B[2]], [B[0], B[1] + B[2]], [A[0], A[1] + A[2]]], c);
    }
    return box(3, 3, 6.4, 81, 2, c) + circ(6.2, 3.4, 3.4, c) + box(8, 4.4, 4.4, 29.2, 1.2, c) +
      seg(0, 0.27) + seg(0.33, 0.6) + seg(0.66, 1);
  });

  def('traffic-light', [38, 92], ['hazard', 'device'],
    'traffic light housing with red, amber and green lamps (lamps keep real colours; color2 = one colour or [r,a,g])',
    function (c, c2) {
      var lamps = Array.isArray(c2) ? c2 : c2 ? [c2, c2, c2] : [C.red, AMBER, C.green];
      return box(0, 0, 38, 92, 8, c) + circ(19, 16.6, 10.6, lamps[0]) + circ(19, 46, 10.6, lamps[1]) +
        circ(19, 75.4, 10.6, lamps[2]);
    });

  def('exclamation', [18, 84], ['hazard'], 'exclamation mark (other dangers)', function (c) {
    return P('M1,6.4C1,2.6 4.6,0 9,0C13.4,0 17,2.6 17,6.4L14,56C13.8,59 11.6,61 9,61C6.4,61 4.2,59 4,56Z', c) +
      circ(9, 75.4, 8.6, c);
  });

  def('quayside', [0, 23, 100, 90], ['hazard', 'vehicle'], 'car tipping off the edge of a quay into water (quayside / river bank)',
    function (c) {
      return box(0, 42, 38, 48, 0, c) +
        sub(carSide(c), [100, 42.6], { x: 24.9, y: 28.1, w: 64, h: 27.26, flip: true, rot: 38 }) +
        S(waveD(44, 97.6, 74.4, 3, 3), c, 4.6) + S(waveD(44, 97.6, 84.4, 3, 3), c, 4.6);
    });

  def('swing-bridge', [0, 11.3, 100, 70], ['hazard'], 'opening (lifting / swing) bridge: both deck halves raised over water',
    function (c) {
      function leaf(x, dir) {
        var a = 42 * Math.PI / 180, L = 31, t = 7.5, ux = dir * Math.cos(a), uy = -Math.sin(a);
        var nx = -uy * dir, ny = ux * dir; // normal pointing down-inwards
        var p0 = [x - ux * 4, 32 - uy * 4], p1 = [x + ux * L, 32 + uy * L];
        return poly([p0, p1, [p1[0] + nx * t, p1[1] + ny * t], [p0[0] + nx * t, p0[1] + ny * t]], c);
      }
      return box(0, 32, 16, 38, 0, c) + box(84, 32, 16, 38, 0, c) + leaf(12.4, 1) + leaf(87.6, -1) +
        S(waveD(22, 78, 52, 3, 3), c, 4.4) + S(waveD(22, 78, 63, 3, 3), c, 4.4);
    });

  def('sand-drift', [0, 9, 100, 72], ['hazard'], 'sand drifting across the road: dunes with wind streaks', function (c) {
    return box(0, 64, 100, 8, 0, c) +
      P('M0,64C8,48 18,38 30,38C42,38 50,50 62,56C70,60 80,62 92,63L100,64Z', c) +
      P('M40,64C48,54 56,49 66,50C75,51 82,58 92,64Z', c) +
      S('M36,26C48,22 56,30 68,26C78,22 86,28 98,24', c, 3.6) +
      S('M44,12C54,8 62,16 72,12C80,9 88,14 96,11', c, 3.6) +
      S('M58,40C66,37 72,43 80,40C86,38 92,42 98,40', c, 3.6);
  });

  def('ford', [-0.6, 5.2, 100.6, 58.9], ['hazard', 'road', 'vehicle'], 'car driving through water up to its wheels (ford / flooded road)',
    function (c) {
      var bodyOnly = carSideBody();
      return '<g transform="translate(0 0)">' + P(bodyOnly, c, true) + '</g>' +
        S(waveD(2, 98, 41, 3.4, 4), c, 5) + S(waveD(2, 98, 53, 3.4, 4), c, 5);
    });
  def('water-on-road', [100, 50], ['hazard', 'road'], 'water on the road: two wave lines over a flat road band', function (c) {
    return S(waveD(4, 96, 8, 4.4, 3), c, 6) + S(waveD(4, 96, 25, 4.4, 3), c, 6) + box(0, 40, 100, 10, 0, c);
  });

  // ================================================================== SERVICES AND OBJECTS
  def('fuel-pump', [84, 100], ['service'], 'fuel pump with hose and nozzle (filling station)', function (c) {
    return P(rD(4, 0, 48, 88, 7) + rD(12, 9, 32, 26, 2.5), c, true) + box(0, 86, 56, 14, 2, c) +
      S('M50,62L60,62C65.5,62 68,65 68,70L68,79C68,83 70,85.5 73.5,85.5C77,85.5 79,83 79,79L79,31', c, 5) +
      P('M74,33L84,33L84,23L76.5,12.5L70.5,16L75,23.5L74,23.5Z', c);
  });

  def('phone', [3.3, 16.8, 83.3, 96.8], ['service'], 'telephone handset (earpiece top-left, mouthpiece bottom-right)', function (c) {
    // local frame: handle arching up, ear and mouth cups pointing down; then turned 45 degrees
    var handle = 'M9,27C12,12 28,3 50,3C72,3 88,12 91,27L77,29C74,21 64,16 50,16C36,16 26,21 23,29Z';
    var cup = function (x) { return rD(x, 22, 30, 21, 7); };
    return '<g transform="translate(50 50) rotate(45) translate(-50 -23)">' + P(handle, c) + P(cup(0), c) + P(cup(70), c) +
      '</g>';
  });

  def('wrench', [11, 7, 93, 88.8], ['service'], 'open-ended spanner / wrench (breakdown service, mechanic)', function (c) {
    var d = 'M-50,-7L6.2,-7A21,21 0 0 1 45.6,-7.5L22,-7.5L22,7.5L45.6,7.5A21,21 0 0 1 6.2,7L-50,7A7,7 0 0 1 -50,-7Z';
    return '<g transform="translate(50 50) rotate(-45) translate(5 0)">' + P(d, c) + '</g>';
  });

  def('fork-knife', [52, 100], ['service'], 'fork and knife side by side (restaurant)', function (c) {
    return P('M0,2C0,.9 .9,0 2,0C3.1,0 4,.9 4,2L4,22L7,22L7,2C7,.9 7.9,0 9,0C10.1,0 11,.9 11,2L11,22L14,22L14,2' +
      'C14,.9 14.9,0 16,0C17.1,0 18,.9 18,2L18,22L21,22L21,2C21,.9 21.9,0 23,0C24.1,0 25,.9 25,2L25,28' +
      'C25,34 21,38 16,40L16,97C16,98.7 14.7,100 13,100L12,100C10.3,100 9,98.7 9,97L9,40C4,38 0,34 0,28Z', c) +
      P('M40.6,0C47,2.4 51.4,10.4 51.4,24.4L51.4,55L49,57L49,97C49,98.7 47.7,100 46,100L42.6,100C40.9,100 39.6,98.7 39.6,97' +
        'L39.6,57L37,55L37,4C37,1.8 38.6,-0.6 40.6,0Z', c);
  });

  def('cup', [0, 1.3, 92, 80.4], ['service'], 'cup on a saucer with steam (cafe / refreshments)', function (c) {
    return P('M12,24L72,24L72,38C72,55 60,67.4 42,67.4C24,67.4 12,55 12,38Z', c) + ring(74, 40, 9, 5.4, c) +
      P('M0,70.4L92,70.4C90,77 83,80.4 74,80.4L18,80.4C9,80.4 2,77 0,70.4Z', c) +
      S('M30,18C26,13 34,9 30,3', c, 3.4) + S('M42,18C38,13 46,9 42,3', c, 3.4) + S('M54,18C50,13 58,9 54,3', c, 3.4);
  });

  def('bed', [100, 60], ['service'], 'bed with a person lying in it (hotel / motel)', function (c) {
    return box(0, 0, 9, 60, 2, c) + box(91, 18, 9, 42, 2, c) + box(7, 31, 86, 14, 1, c) +
      box(12, 22.4, 18, 8, 3.5, c) + circ(21, 14.6, 6.8, c) +
      P('M33,31C33,24 37,20.4 44,20.4L86,20.4C89,20.4 91,22.4 91,25.4L91,31Z', c);
  });

  def('mosque', [6, 0, 95, 100], ['service'], 'mosque: dome with crescent finial and one minaret', function (c) {
    return P('M6,100L6,62L72,62L72,100L46,100L46,84C46,78.5 43,75 39,73C35,75 32,78.5 32,84L32,100Z' +
      'M14,88L14,79C14,76.5 15.8,74.6 18,73.6C20.2,74.6 22,76.5 22,79L22,88Z' +
      'M56,88L56,79C56,76.5 57.8,74.6 60,73.6C62.2,74.6 64,76.5 64,79L64,88Z', c, true) +
      box(15, 57, 48, 7, 0, c) +
      P('M16,58C16,44 26,37 34.6,32.4C37,31 38.6,29 39,26C39.4,29 41,31 43.4,32.4C52,37 62,44 62,58Z', c) +
      box(38, 17.6, 2, 9.6, 0, c) + P(crescentD(39, 12.4, 5.4, 3.2, 4.4), c) +
      box(80, 26, 12, 74, 0, c) + box(77, 39, 18, 5, 1, c) + poly([[80, 26.4], [86, 9], [92, 26.4]], c) +
      box(85.1, 3, 1.8, 7, 0, c) + circ(86, 2.6, 2.6, c);
  });

  def('crescent', [0, 0, 77.73, 100], ['service'], 'red crescent (first aid), opening to the right; default fill red', function (c) {
    return P(crescentD(50, 50, 50, 22, 42), c);
  }, { fill: C.red });

  def('speed-camera', [1.8, 16, 96, 100], ['device'], 'speed camera on a pole with flash lines (radar)', function (c) {
    return P('M36,24C36,21.8 37.6,20 40,19.4L96,16L96,24Z', c) +
      P(rD(24, 26, 16, 22, 2) + cD(32, 37, 5.2), c, true) + box(38, 22, 58, 30, 4, c) +
      box(62, 50, 9, 50, 0, c) + box(51, 94, 31, 6, 1.5, c) +
      limb([[17, 37], [4, 37]], 4.4, c) + limb([[17.4, 29], [6.4, 20.4]], 4.4, c) + limb([[17.4, 45], [6.4, 53.6]], 4.4, c);
  });

  def('horn', [0, 1.5, 96, 54.5], ['device'], 'bulb horn / trumpet (no horns)', function (c) {
    return P('M40,23.4L87.6,2.4C92,0.4 96,2.4 96,7.4L96,48.6C96,53.6 92,55.6 87.6,53.6L40,32.6Z', c) +
      box(20, 23.2, 22, 9.6, 1, c) + P('M0,28C0,20 5.4,14 12.4,14C19.4,14 24,20 24,28C24,36 19.4,42 12.4,42C5.4,42 0,36 0,28Z', c);
  });

  def('parking-p', [64, 100], ['letter', 'service'], 'bold letter P (parking)', function (c) {
    return P('M0,100L0,0L36,0C52.6,0 64,11.4 64,29C64,46.6 52.6,58 36,58L19,58L19,100Z' +
      'M19,15.6L34.4,15.6C41.8,15.6 46,21 46,29C46,37 41.8,42.4 34.4,42.4L19,42.4Z', c, true);
  });

  def('h-letter', [64, 100], ['letter', 'service'], 'bold letter H (hospital)', function (c) {
    return poly([[0, 0], [19, 0], [19, 40.5], [45, 40.5], [45, 0], [64, 0], [64, 100], [45, 100], [45, 58.5], [19, 58.5],
      [19, 100], [0, 100]], c);
  });

  def('info-i', [2, 0, 28, 100], ['letter', 'service'], 'bold lowercase i (information)', function (c) {
    return circ(15, 11, 11, c) + P('M2,30L22,30L22,88L28,88L28,100L2,100L2,88L8,88L8,42L2,42Z', c);
  });

  def('toll-gate', [100, 88], ['device', 'road'], 'toll gantry over the road with a car passing under it (Salik-type toll)',
    function (c) {
      return box(0, 0, 100, 12, 1.5, c) + box(5, 10, 7, 78, 0, c) + box(88, 10, 7, 78, 0, c) +
        box(24, 11, 10, 8, 1, c) + box(45, 11, 10, 8, 1, c) + box(66, 11, 10, 8, 1, c) +
        sub(carFrontRear(c, false), [100, 73], { x: 19, y: 35, w: 62, h: 53 });
    });

  // ================================================================== ROAD LAYOUT DIAGRAMS (thick lines, warning signs)
  // built with the arrow outline engine (see outline() below); widths: main road 12, side road 8
  function lines(strokes) {
    var parts = strokes.map(function (st) { return st.poly ? { poly: st.poly, pts: st.poly } : outline(st); });
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    parts.forEach(function (o) {
      o.pts.forEach(function (pt) {
        x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]); y0 = Math.min(y0, pt[1]); y1 = Math.max(y1, pt[1]);
      });
    });
    var d = parts.map(function (o) { return serial(o, -x0, -y0); }).join('');
    return { vb: [Math.round((x1 - x0) * 100) / 100, Math.round((y1 - y0) * 100) / 100], d: d };
  }
  function lineDef(name, desc, strokes) {
    var L = lines(strokes);
    def(name, L.vb, ['road', 'junction'], desc, function (c) { return P(L.d, c); });
  }
  var MW = 12, SW = 8;
  lineDef('crossroads', 'crossroads: main road up and a crossing road, equal width ("+")', [
    { x: 0, y: 40, h: 0, sw: MW, segs: [['L', 80]] }, { x: -30, y: 0, h: 90, sw: MW, segs: [['L', 60]] }]);
  lineDef('crossroads-minor', 'crossroads with a minor road: thick main road, thin crossing road', [
    { x: 0, y: 40, h: 0, sw: MW + 1, segs: [['L', 80]] }, { x: -28, y: 0, h: 90, sw: SW, segs: [['L', 56]] }]);
  lineDef('side-road-right', 'side road joining from the RIGHT (thick main road, thin side road)', [
    { x: 0, y: 40, h: 0, sw: MW + 1, segs: [['L', 80]] }, { x: 0, y: 0, h: 90, sw: SW, segs: [['L', 28]] }]);
  lineDef('side-road-left', 'side road joining from the LEFT', [
    { x: 0, y: 40, h: 0, sw: MW + 1, segs: [['L', 80]] }, { x: 0, y: 0, h: 270, sw: SW, segs: [['L', 28]] }]);
  lineDef('t-junction', 'T-junction: the road ends at a crossing road', [
    { x: -32, y: 0, h: 90, sw: MW, segs: [['L', 64]] }, { x: 0, y: 56, h: 0, sw: MW, segs: [['L', 56]] }]);
  lineDef('y-junction', 'Y-junction: the road splits into two', [
    { x: 0, y: 46, h: 0, sw: MW, segs: [['L', 36]] },
    { x: 0, y: 14, h: -32, sw: MW, segs: [['L', 40]] }, { x: 0, y: 14, h: 32, sw: MW, segs: [['L', 40]] }]);
  lineDef('staggered-junction', 'staggered junction: side road on the left first, then on the right (flip for the other way)', [
    { x: 0, y: 40, h: 0, sw: MW + 1, segs: [['L', 80]] }, { x: 0, y: 14, h: 270, sw: SW, segs: [['L', 26]] },
    { x: 0, y: -14, h: 90, sw: SW, segs: [['L', 26]] }]);
  function narrowSide(x, side, bend) {
    // side: -1 left edge line, +1 right edge line; bend: true if this side narrows
    var t = bend ? -side * 22 : 0;
    return { x: x, y: 40, h: 0, sw: 8, segs: bend ? [['L', 24], ['A', 22, t], ['L', 12], ['A', 22, -t], ['L', 22]] : [['L', 80]] };
  }
  (function () {
    var nb = lines([narrowSide(-18, -1, true), narrowSide(18, 1, true)]);
    def('narrow-both', nb.vb, ['road'], 'road narrows on both sides', function (c) { return P(nb.d, c); });
    var nr = lines([narrowSide(-15, -1, false), narrowSide(15, 1, true)]);
    def('narrow-right', nr.vb, ['road'], 'road narrows on the RIGHT', function (c) { return P(nr.d, c); });
    var nl = lines([narrowSide(-15, -1, true), narrowSide(15, 1, false)]);
    def('narrow-left', nl.vb, ['road'], 'road narrows on the LEFT', function (c) { return P(nl.d, c); });
  })();

  // ================================================================== RAILWAY, POWER, MISC
  def('train', [2, 0.8, 98, 59.8], ['vehicle', 'rail'], 'steam locomotive, side view facing left (level crossing without gate)',
    function (c) {
      return P('M13,17C13,15.4 14.4,14 16,14L60,14L60,37L13,37Z', c) +
        P('M17,14L18.6,6L16.4,2.4C16,1.6 16.6,0.8 17.4,0.8L27.6,0.8C28.4,0.8 29,1.6 28.6,2.4L26.4,6L28,14Z', c) +
        P('M37.4,14C37.4,10.4 39.6,8 43,8C46.4,8 48.6,10.4 48.6,14Z', c) +
        P('M58,40L58,6.6L55.4,6.6L55.4,2L97.4,2L97.4,6.6L95,6.6L95,40Z' + rD(64, 10.4, 12, 11.4, 2) + rD(80.4, 10.4, 10.6, 11.4, 2), c, true) +
        poly([[2, 44.6], [13.4, 34.6], [13.4, 44.6]], c) + box(8, 37, 90, 6, 1, c) +
        wheel(29, 50, 9.6, 3.2, c) + wheel(50, 50, 9.6, 3.2, c) + wheel(71, 50, 9.6, 3.2, c) + wheel(89, 54.6, 5.2, 1.8, c);
    });

  def('tram', [1, 1.8, 99, 58.5], ['vehicle', 'rail'], 'tram, side view facing left, with pantograph (trams crossing)', function (c) {
    var holes = rD(6, 20.4, 8, 22, 1.6);
    for (var i = 0; i < 5; i++) holes += rD(18 + i * 15.6, 20.4, 12.4, 12, 1.6);
    return limb([[40, 14], [52, 4], [64, 14]], 2.6, c) + limb([[40, 3.2], [64, 3.2]], 2.6, c) + box(44, 12, 16, 4, 1, c) +
      P('M1,48L1,26C1,19.6 5,16 12,16L96,16C97.8,16 99,17.2 99,19L99,48Z' + holes, c, true) +
      wheel(18, 52, 6.4, 2.2, c) + wheel(33, 52, 6.4, 2.2, c) + wheel(69, 52, 6.4, 2.2, c) + wheel(84, 52, 6.4, 2.2, c);
  });

  def('gate', [100, 60], ['rail', 'road'], 'gate / barrier fence across the road (level crossing with gate)', function (c) {
    var s = box(0, 0, 8, 60, 1.5, c) + box(92, 0, 8, 60, 1.5, c) + box(6, 8, 88, 6.4, 0, c) + box(6, 42, 88, 6.4, 0, c);
    for (var i = 0; i < 6; i++) s += box(16.4 + i * 13.4, 12, 4.6, 32, 0, c);
    return s;
  });

  def('lightning', [3, 0, 48, 100], ['hazard', 'power'], 'lightning bolt (electricity, overhead high-voltage cable)', function (c) {
    return poly([[22, 0], [48, 0], [33.6, 38], [47, 38], [8, 100], [18.4, 52], [3, 52]], c);
  });

  def('flagman', [0, 2.3, 56.8, 100.8], ['people', 'works'], 'person standing, facing left, holding up a flag (flagman ahead)',
    function (c) {
      return limb([[26, 58], [8, 4]], 3.6, c) + poly([[8.4, 3.4], [0, 4.6], [0.8, 19.4], [12.4, 17.6]], c) +
        circ(42, 12, 9.4, c) +
        limb([[42.4, 31.6], [43.6, 53]], 16.4, c) +
        limb([[38.6, 30], [30, 37.4], [24.6, 42.6]], 8.6, c) +
        limb([[47, 31], [51.4, 44.4], [52.4, 56]], 8.6, c) +
        limb([[39.6, 58.6], [37.4, 78], [36.4, 95.2], [30, 95.4]], 10.4, c) +
        limb([[46.8, 58.6], [49.4, 78], [50.6, 95.2], [44.2, 95.4]], 10.4, c);
    });

  def('toilets', [86, 100], ['service', 'people'], 'toilets: man and woman standing, front view', function (c) {
    function head(x) { return circ(x, 9.8, 9.8, c); }
    return head(18) + limb([[18, 30], [18, 54]], 16, c) + limb([[5.4, 28], [4.6, 55]], 6.6, c) +
      limb([[30.6, 28], [31.4, 55]], 6.6, c) + limb([[13.6, 60], [13, 95.4]], 8.4, c) + limb([[22.4, 60], [23, 95.4]], 8.4, c) +
      head(68) + P('M60.4,23L75.6,23C79,23 80.6,25 81.4,28L86,66L50,66L54.6,28C55.4,25 57,23 60.4,23Z', c) +
      limb([[62.4, 68], [62.4, 95.4]], 8, c) + limb([[73.6, 68], [73.6, 95.4]], 8, c);
  });

  // ================================================================== ARROWS
  function Dv(a) { a *= Math.PI / 180; return [Math.sin(a), -Math.cos(a)]; } // heading 0 = up, clockwise
  function Nv(a) { a *= Math.PI / 180; return [Math.cos(a), Math.sin(a)]; } // right-hand normal

  // Thick centre-line stroke with an optional triangular head -> outline description.
  // st: {x, y, h, sw, segs: [['L', len] | ['A', radius, turnDeg(+right,-left)]], head: {w, l, follow}}
  function outline(st) {
    var hw = st.sw / 2, x = st.x || 0, y = st.y || 0, h = st.h || 0;
    var L = [], R = [], pts = [], lastArc = null, n = Nv(h);
    var ls = [x - hw * n[0], y - hw * n[1]], rs = [x + hw * n[0], y + hw * n[1]];
    pts.push(ls, rs);
    (st.segs || []).forEach(function (sg) {
      var l, r;
      if (sg[0] === 'L') {
        var d = Dv(h); x += d[0] * sg[1]; y += d[1] * sg[1]; n = Nv(h);
        l = [x - hw * n[0], y - hw * n[1]]; r = [x + hw * n[0], y + hw * n[1]];
        L.push({ t: 'L', p: l }); R.push({ t: 'L', p: r }); pts.push(l, r); lastArc = null;
      } else {
        var rad = sg[1], turn = sg[2], sgn = turn > 0 ? 1 : -1;
        n = Nv(h);
        var O = [x + sgn * rad * n[0], y + sgn * rad * n[1]], h2 = h + turn, n2 = Nv(h2);
        for (var k = 1; k < 16; k++) {
          var nn = Nv(h + turn * k / 16), cx = O[0] - sgn * rad * nn[0], cy = O[1] - sgn * rad * nn[1];
          pts.push([cx - hw * nn[0], cy - hw * nn[1]], [cx + hw * nn[0], cy + hw * nn[1]]);
        }
        x = O[0] - sgn * rad * n2[0]; y = O[1] - sgn * rad * n2[1];
        l = [x - hw * n2[0], y - hw * n2[1]]; r = [x + hw * n2[0], y + hw * n2[1]];
        var swp = turn > 0 ? 1 : 0, lg = Math.abs(turn) > 180 ? 1 : 0;
        L.push({ t: 'A', p: l, r: rad + sgn * hw, lg: lg, sw: swp });
        R.push({ t: 'A', p: r, r: rad - sgn * hw, lg: lg, sw: swp });
        pts.push(l, r);
        lastArc = { O: O, rad: rad, sgn: sgn };
        h = h2;
      }
    });
    var end = [];
    if (st.head) {
      var n3 = Nv(h), d3 = Dv(h), tip;
      if (st.head.follow && lastArc) {
        var ang = lastArc.sgn * (st.head.l / lastArc.rad) * 180 / Math.PI, nt = Nv(h + ang);
        tip = [lastArc.O[0] - lastArc.sgn * lastArc.rad * nt[0], lastArc.O[1] - lastArc.sgn * lastArc.rad * nt[1]];
      } else tip = [x + st.head.l * d3[0], y + st.head.l * d3[1]];
      end = [[x - st.head.w / 2 * n3[0], y - st.head.w / 2 * n3[1]], tip, [x + st.head.w / 2 * n3[0], y + st.head.w / 2 * n3[1]]];
      pts = pts.concat(end);
    }
    return { ls: ls, rs: rs, L: L, R: R, end: end, pts: pts, role: st.role };
  }
  function serial(o, dx, dy) {
    function Q(p) { return f(p[0] + dx) + ',' + f(p[1] + dy); }
    if (o.poly) return 'M' + o.poly.map(Q).join('L') + 'Z';
    var d = 'M' + Q(o.ls);
    o.L.forEach(function (s) {
      d += s.t === 'L' ? 'L' + Q(s.p) : 'A' + f(s.r) + ',' + f(s.r) + ' 0 ' + s.lg + ' ' + s.sw + ' ' + Q(s.p);
    });
    o.end.forEach(function (p) { d += 'L' + Q(p); });
    var Rr = o.R;
    d += 'L' + Q(Rr.length ? Rr[Rr.length - 1].p : o.rs);
    for (var i = Rr.length - 1; i >= 0; i--) {
      var to = i > 0 ? Rr[i - 1].p : o.rs, s = Rr[i];
      d += s.t === 'L' ? 'L' + Q(to) : 'A' + f(s.r) + ',' + f(s.r) + ' 0 ' + s.lg + ' ' + (1 - s.sw) + ' ' + Q(to);
    }
    return d + 'Z';
  }

  var AD = { sw: 12.5, hw: 32, hl: 22 };
  function hd(p) { return { w: p.hw, l: p.hl }; }
  function mergeP(a, b, c) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    if (b) for (k in b) o[k] = b[k];
    if (c) for (k in c) o[k] = c[k];
    return o;
  }

  var A = {};
  function arrowDef(kind, dflt, tags, desc, build) { A[kind] = { d: dflt, tags: tags, desc: desc, build: build }; }

  arrowDef('straight', { len: 80 }, ['arrow'], 'straight arrow pointing up (ahead only); rot for other directions',
    function (p) { return [{ h: 0, sw: p.sw, segs: [['L', p.len - p.hl]], head: hd(p) }]; });
  arrowDef('one-way', { len: 100, sw: 13, hw: 32, hl: 25 }, ['arrow'],
    'long arrow pointing RIGHT for the rectangular one-way sign (flip for left, rot:-90 for up)',
    function (p) { return [{ h: 90, sw: p.sw, segs: [['L', p.len - p.hl]], head: hd(p) }]; });
  function turn(side) {
    return function (p) { return [{ h: 0, sw: p.sw, segs: [['L', p.a], ['A', p.r, side * 90], ['L', p.b]], head: hd(p) }]; };
  }
  arrowDef('turn-left', { a: 40, r: 15, b: 16 }, ['arrow'], 'arrow going up then turning 90 degrees to the left', turn(-1));
  arrowDef('turn-right', { a: 40, r: 15, b: 16 }, ['arrow'], 'arrow going up then turning 90 degrees to the right', turn(1));
  function bend(side, head) {
    return function (p) {
      return [{ h: 0, sw: p.sw, segs: [['L', p.a], ['A', p.r, side * p.t], ['L', p.b]], head: head ? hd(p) : null }];
    };
  }
  var BD = { sw: 13, a: 34, r: 24, t: 78, b: 8, hw: 32, hl: 22 };
  arrowDef('bend-left', BD, ['arrow', 'warning'], 'warning-sign bend to the left: thick curved road line, no arrowhead', bend(-1, false));
  arrowDef('bend-right', BD, ['arrow', 'warning'], 'warning-sign bend to the right: thick curved road line, no arrowhead', bend(1, false));
  arrowDef('bend-left-arrow', BD, ['arrow', 'warning'], 'bend to the left with an arrowhead (UK style)', bend(-1, true));
  arrowDef('bend-right-arrow', BD, ['arrow', 'warning'], 'bend to the right with an arrowhead (UK style)', bend(1, true));
  function dbend(side, head) {
    return function (p) {
      return [{ h: 0, sw: p.sw, segs: [['L', p.a], ['A', p.r, side * p.t], ['L', p.m], ['A', p.r, -side * 2 * p.t], ['L', p.b]],
        head: head ? hd(p) : null }];
    };
  }
  var DB = { sw: 13, a: 16, r: 18, t: 62, m: 6, b: 6, hw: 32, hl: 22 };
  arrowDef('double-bend-left', DB, ['arrow', 'warning'], 'double bend, first to the left, no arrowhead', dbend(-1, false));
  arrowDef('double-bend-right', DB, ['arrow', 'warning'], 'double bend, first to the right, no arrowhead', dbend(1, false));
  arrowDef('double-bend-left-arrow', DB, ['arrow', 'warning'], 'double bend, first to the left, with arrowhead', dbend(-1, true));
  arrowDef('double-bend-right-arrow', DB, ['arrow', 'warning'], 'double bend, first to the right, with arrowhead', dbend(1, true));
  function straightTurn(side) {
    return function (p) {
      return [{ h: 0, sw: p.sw, segs: [['L', p.len - p.hl]], head: hd(p) },
        { y: -p.at, h: 0, sw: p.sw, segs: [['A', p.r, side * 90], ['L', p.b]], head: hd(p) }];
    };
  }
  arrowDef('straight-left', { len: 80, at: 26, r: 16, b: 14 }, ['arrow'], 'ahead or turn left (stem up with a left branch)', straightTurn(-1));
  arrowDef('straight-right', { len: 80, at: 26, r: 16, b: 14 }, ['arrow'], 'ahead or turn right', straightTurn(1));
  arrowDef('left-right', { a: 34, r: 16, b: 12 }, ['arrow'], 'turn left or right (T-shaped, flat top)', function (p) {
    var top = p.a + p.r;
    return [{ h: 0, sw: p.sw, segs: [['L', p.a]] },
      { y: -p.a, h: 0, sw: p.sw, segs: [['A', p.r, -90], ['L', p.b]], head: hd(p) },
      { y: -p.a, h: 0, sw: p.sw, segs: [['A', p.r, 90], ['L', p.b]], head: hd(p) },
      { poly: [[-p.r, -top - p.sw / 2], [p.r, -top - p.sw / 2], [p.r, -top + p.sw / 2], [-p.r, -top + p.sw / 2]] }];
  });
  arrowDef('keep-left', { len: 76 }, ['arrow'], 'keep left: arrow pointing diagonally down-left', function (p) {
    return [{ h: 225, sw: p.sw, segs: [['L', p.len - p.hl]], head: hd(p) }];
  });
  arrowDef('keep-right', { len: 76 }, ['arrow'], 'keep right: arrow pointing diagonally down-right', function (p) {
    return [{ h: 135, sw: p.sw, segs: [['L', p.len - p.hl]], head: hd(p) }];
  });
  arrowDef('uturn-left', { a: 40, r: 16, b: 12 }, ['arrow'],
    'U-turn to the LEFT (up on the right, over the top, head pointing down on the left)', function (p) {
      return [{ h: 0, sw: p.sw, segs: [['L', p.a], ['A', p.r, -180], ['L', p.b]], head: hd(p) }];
    });
  arrowDef('roundabout', { sw: 11.5, R: 30, span: 76, hw: 28, hl: 17 }, ['arrow'],
    'three arrows chasing each other ANTICLOCKWISE around a circle (right-hand traffic)', function (p) {
      var out = [];
      for (var k = 0; k < 3; k++) {
        var th = 100 + 120 * k, a = th * Math.PI / 180;
        out.push({ x: p.R * Math.cos(a), y: p.R * Math.sin(a), h: th, sw: p.sw, segs: [['A', p.R, -p.span]],
          head: { w: p.hw, l: p.hl, follow: true } });
      }
      return out;
    });
  arrowDef('two-way', { len: 80, gap: 10 }, ['arrow'],
    'two-way traffic: right arrow points UP, left arrow points DOWN (color2 colours the down arrow)', function (p) {
      var dx = p.hw / 2 + p.gap / 2;
      return [{ x: dx, y: 0, h: 0, sw: p.sw, segs: [['L', p.len - p.hl]], head: hd(p) },
        { x: -dx, y: -p.len, h: 180, sw: p.sw, segs: [['L', p.len - p.hl]], head: hd(p), role: 'color2' }];
    });
  function merge(side) {
    return function (p) {
      return [{ h: 0, sw: p.sw, segs: [['L', p.len - p.hl]], head: hd(p) },
        { x: side * p.off, y: 0, h: 0, sw: p.sw2, segs: [['L', p.s1], ['A', p.r, -side * p.t], ['L', p.s2],
          ['A', p.r, side * p.t]] }];
    };
  }
  var MG = { len: 84, off: 30, sw2: 9, s1: 10, r: 14, t: 45, s2: 28.4 };
  arrowDef('merge-right', MG, ['arrow', 'warning'], 'traffic merging from the RIGHT into the main lane (main arrow up)', merge(1));
  arrowDef('merge-left', MG, ['arrow', 'warning'], 'traffic merging from the LEFT into the main lane', merge(-1));
  arrowDef('chevron', { ch: 60, depth: 30, t: 16 }, ['arrow'], 'single thick chevron pointing RIGHT (sharp deviation boards)',
    function (p) {
      return [{ poly: [[0, 0], [p.t, 0], [p.t + p.depth, p.ch / 2], [p.t, p.ch], [0, p.ch], [p.depth, p.ch / 2]] }];
    });

  var ACACHE = {};
  function buildArrow(kind, over) {
    var a = A[kind];
    if (!a) return null;
    var key = kind + (over ? JSON.stringify(over) : '');
    if (ACACHE[key]) return ACACHE[key];
    var p = mergeP(AD, a.d, over);
    var parts = a.build(p).map(function (st) {
      return st.poly ? { poly: st.poly, pts: st.poly, role: st.role } : outline(st);
    });
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    parts.forEach(function (o) {
      o.pts.forEach(function (pt) {
        if (pt[0] < x0) x0 = pt[0]; if (pt[0] > x1) x1 = pt[0];
        if (pt[1] < y0) y0 = pt[1]; if (pt[1] > y1) y1 = pt[1];
      });
    });
    var res = {
      vb: [Math.round((x1 - x0) * 100) / 100, Math.round((y1 - y0) * 100) / 100],
      parts: parts.map(function (o) { return { d: serial(o, -x0, -y0), role: o.role || 'fill' }; })
    };
    ACACHE[key] = res;
    return res;
  }
  // all outlines run clockwise, so parts of one colour merge into a single nonzero path: an exact union
  // without anti-aliasing seams where parts meet
  function arrowDraw(res) {
    var main = '', second = '';
    res.parts.forEach(function (pt) { if (pt.role === 'color2') second += pt.d; else main += pt.d; });
    return function (c, c2) {
      return (main ? P(main, c) : '') + (second ? P(second, c2 || c) : '');
    };
  }

  // ------------------------------------------------------------------ public API
  var warned = {};
  function missing(name, o) {
    if (!warned[name] && window.console) { warned[name] = 1; console.warn('SignKit: unknown glyph/arrow', name); }
    var pl = place([10, 10], o);
    return '<g transform="' + pl.t + '"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" fill="none" stroke="#8A8F98"' +
      ' stroke-width="0.8" stroke-dasharray="1.6 1.2"/></g>';
  }

  function glyph(name, o) {
    o = o || {};
    var g = G[name];
    if (!g) return missing(name, o);
    var pl = place(g.vb, o), c = o.fill || g.fill || C.black, inner = '';
    try { inner = g.draw(c, o.color2, o); } catch (e) {
      if (window.console) console.warn('SignKit.glyph failed', name, e);
      return missing(name, o);
    }
    return '<g transform="' + pl.t + '">' + inner + '</g>';
  }

  function arrow(kind, o) {
    o = o || {};
    var res = buildArrow(kind, o.p);
    if (!res) return missing(kind, o);
    var pl = place(res.vb, o), c = o.fill || C.black;
    return '<g transform="' + pl.t + '">' + arrowDraw(res)(c, o.color2) + '</g>';
  }

  var ARROWS = {};
  Object.keys(A).forEach(function (kind) {
    var res = buildArrow(kind);
    ARROWS[kind] = { vb: res.vb, tags: A[kind].tags, desc: A[kind].desc, draw: arrowDraw(res), params: mergeP(AD, A[kind].d) };
  });

  function glyphBox(name, o) {
    var g = G[name] || ARROWS[name];
    if (!g) return null;
    var vb = g.vb;
    if (!G[name] && o && o.p) vb = buildArrow(name, o.p).vb;
    var pl = place(vb, o || {});
    return { x: pl.x, y: pl.y, w: pl.w, h: pl.h, s: pl.s };
  }

  function glyphPoint(name, pt, o) {
    o = o || {};
    var g = G[name] || ARROWS[name];
    if (!g) return null;
    if (typeof pt === 'string') pt = (g.anchors && g.anchors[pt]) || [g.vb[0] / 2, g.vb[1] / 2];
    var pl = place(g.vb, o), x = pl.x + pt[0] * pl.s, y = pl.y + pt[1] * pl.s;
    if (o.flip) x = 2 * pl.cx - x;
    if (o.flipV) y = 2 * pl.cy - y;
    if (o.rot) {
      var a = o.rot * Math.PI / 180, dx = x - pl.cx, dy = y - pl.cy;
      x = pl.cx + dx * Math.cos(a) - dy * Math.sin(a); y = pl.cy + dx * Math.sin(a) + dy * Math.cos(a);
    }
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
  }

  function glyphIcon(name, o) {
    o = o || {};
    var isArrow = !G[name] && ARROWS[name];
    var g = G[name] || ARROWS[name];
    var pad = o.pad == null ? 4 : o.pad, vb = g ? g.vb : [10, 10];
    var w = vb[0] + 2 * pad, h = vb[1] + 2 * pad;
    var box = { x: pad, y: pad, w: vb[0], h: vb[1], fill: o.fill, color2: o.color2, flip: o.flip, bg: o.bg };
    var inner = isArrow ? arrow(name, box) : glyph(name, box);
    var esc = K.esc || function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + f(w) + ' ' + f(h) + '"' +
      (o.size ? ' width="' + o.size + '" height="' + o.size + '"' : '') +
      (o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : ' aria-hidden="true"') +
      ' class="glyph-svg">' + inner + '</svg>';
  }

  // Per-glyph boxes for SignKit.warn, tuned by Gallery.tuneWarn() in tools/glyph_gallery.html: the largest
  // placement (glyph standing on y 74, height <= 33, 39 for thin line symbols, width <= 44) whose ink stays
  // 2 units inside the white triangle. Re-run the tuner after changing a glyph. [x, y, w, h]
  var WARN_FIT = {
    'person-walk': [40.8, 41, 18.5, 33], 'pedestrian-crossing': [35.2, 41, 29.7, 33],
    'children': [36.2, 41, 27.7, 33], 'worker': [28, 42.6, 44, 31.4], 'bicycle': [29.6, 50.2, 40.8, 23.8],
    'cyclist': [31.5, 41.5, 36.9, 32.5], 'motorcycle-side': [29.5, 51.9, 39, 22.1],
    'motorcyclist': [31.2, 41.3, 37.6, 32.7], 'wheelchair': [37.9, 41.9, 24.1, 32.1],
    'person-standing': [44, 41, 11.9, 33], 'car-side': [28.7, 57.4, 42.6, 16.6], 'car-front': [31.9, 47, 36.3, 27],
    'car-rear': [31.9, 47, 36.3, 27], 'truck-side': [33.4, 55.9, 32.8, 18.1],
    'truck-front': [36.7, 49.1, 26.5, 24.9], 'bus-side': [31.9, 58.4, 36.2, 15.6], 'bus-front': [38, 45.6, 24, 28.4],
    'bus-stop': [38, 45.6, 24, 28.4], 'tractor-side': [32.9, 47.3, 31.3, 26.7],
    'taxi-side': [28.7, 53.9, 42.6, 20.1], 'police-car': [28.7, 53.5, 42.7, 20.5],
    'ambulance-side': [30, 55.5, 37.1, 18.5], 'helicopter': [34.2, 54.9, 32.7, 19.1],
    'camel': [34.1, 48.4, 32.8, 25.6], 'cow': [33.4, 52.1, 33.2, 21.9], 'gazelle': [33.3, 49.4, 38.3, 24.6],
    'horse-rider': [35, 41.9, 32.5, 32.1], 'slippery-car': [39.6, 41, 20.8, 33],
    'falling-rocks': [40.4, 44.7, 31.3, 29.3], 'hump': [28, 62.6, 44, 11.4], 'uneven-road': [28, 63.4, 44, 10.6],
    'loose-chippings': [28.4, 55.3, 37.7, 18.7], 'steep-down': [36, 52.2, 39, 21.8],
    'steep-up': [25, 52.2, 39, 21.8], 'tunnel': [31.8, 50, 36.4, 24], 'aircraft': [34.2, 41, 31.7, 33],
    'windsock': [37.3, 49.2, 27.8, 24.8], 'traffic-light': [43.2, 41, 13.6, 33], 'exclamation': [45.8, 35, 8.4, 39],
    'quayside': [33.9, 48.7, 37.7, 25.3], 'swing-bridge': [31.5, 52.3, 36.9, 21.7],
    'sand-drift': [26.9, 50.5, 37.2, 23.5], 'ford': [30.6, 53.4, 38.9, 20.6], 'water-on-road': [32, 56, 36, 18],
    'fuel-pump': [38.1, 45.1, 24.3, 28.9], 'phone': [38.4, 44.3, 29.7, 29.7], 'wrench': [29.4, 41.9, 32.2, 32.1],
    'fork-knife': [41.7, 42, 16.6, 32], 'cup': [31.7, 42.4, 36.7, 31.6], 'bed': [34.6, 54.3, 32.9, 19.7],
    'mosque': [32.4, 42.3, 28.2, 31.7], 'crescent': [36.3, 43.2, 24, 30.8], 'speed-camera': [36.9, 50.7, 26.2, 23.3],
    'horn': [31.3, 54.7, 34.9, 19.3], 'parking-p': [41.2, 43.3, 19.7, 30.7], 'h-letter': [40.5, 44.4, 18.9, 29.6],
    'info-i': [45.7, 41, 8.6, 33], 'toll-gate': [36.8, 50.7, 26.5, 23.3], 'crossroads': [35.9, 36.4, 28.2, 37.6],
    'crossroads-minor': [36.4, 35, 27.3, 39], 'side-road-right': [45.3, 36.1, 16.3, 37.9],
    'side-road-left': [38.3, 36.1, 16.3, 37.9], 't-junction': [37.5, 49.7, 25.1, 24.3],
    'y-junction': [38.8, 44.7, 22.3, 29.3], 'staggered-junction': [37.3, 37.3, 23.9, 36.7],
    'narrow-both': [39.7, 39.6, 20.6, 34.4], 'narrow-right': [43.5, 39.3, 16.5, 34.7],
    'narrow-left': [40, 39.3, 16.5, 34.7], 'train': [31.8, 53.5, 33.3, 20.5], 'tram': [32, 53.2, 36, 20.8],
    'gate': [34.2, 55.1, 31.6, 18.9], 'lightning': [42.6, 41, 14.9, 33], 'flagman': [41.3, 42.3, 18.3, 31.7],
    'toilets': [37.1, 44, 25.8, 30], 'straight': [42.2, 35, 15.6, 39], 'one-way': [28.9, 60.5, 42.2, 13.5],
    'turn-left': [37.5, 42.7, 26.1, 31.3], 'turn-right': [36.5, 42.7, 26.1, 31.3],
    'bend-left': [42.7, 38.1, 19, 35.9], 'bend-right': [38.2, 38.1, 19, 35.9],
    'bend-left-arrow': [39.8, 40.7, 24.4, 33.3], 'bend-right-arrow': [35.8, 40.8, 24.4, 33.2],
    'double-bend-left': [40.4, 35.5, 19.2, 38.5], 'double-bend-right': [40.4, 35.6, 19.2, 38.4],
    'double-bend-left-arrow': [39.6, 38.5, 17.4, 35.5], 'double-bend-right-arrow': [43.1, 38.4, 17.4, 35.6],
    'straight-left': [34.8, 41.1, 28, 32.9], 'straight-right': [37.3, 41.1, 28, 32.9],
    'left-right': [33.2, 51.8, 33.7, 22.2], 'keep-left': [31, 43.4, 30.6, 30.6],
    'keep-right': [38.4, 43.4, 30.6, 30.6], 'uturn-left': [34, 41.2, 28.6, 32.8],
    'roundabout': [34.4, 40.8, 31.7, 33.2], 'two-way': [36.6, 45.1, 26.8, 28.9],
    'merge-right': [39.6, 36.1, 22.8, 37.9], 'merge-left': [37.6, 36.1, 22.8, 37.9],
    'chevron': [41.7, 42.4, 24.2, 31.6]
  };
  Object.keys(WARN_FIT).forEach(function (n) {
    var g = G[n] || ARROWS[n], b = WARN_FIT[n];
    if (g) { g.boxes = g.boxes || {}; g.boxes.warn = { x: b[0], y: b[1], w: b[2], h: b[3], ay: 1 }; }
  });

  // Recommended pictogram boxes for each SignKit base (in that base's viewBox). Use with glyph() / arrow():
  //   SignKit.glyph('camel', SignKit.frame('warn'))   SignKit.arrow('straight', SignKit.frame('mand'))
  var W = K.WARN || { cx: 50, top: 42, bottom: 74 };
  var FRAMES = {
    // triangle: the SignKit.WARN frame, glyph standing on its bottom line (tall and square-ish glyphs)
    warn: { x: W.cx - 20, y: W.top, w: 40, h: W.bottom - W.top, ay: 1 },
    // triangle: glyphs wider than about 1.6:1 (vehicles, hump, bridge), lower where the triangle is wider
    warnWide: { x: W.cx - 24, y: W.bottom - 24, w: 48, h: 24, ay: 1 },
    // triangle: narrow line symbols with a thin top (bends, junction diagrams, exclamation), reaching higher
    warnTall: { x: W.cx - 14, y: W.top - 7, w: 28, h: W.bottom - W.top + 7, ay: 1 },
    giveWay: { x: 33, y: 18, w: 34, h: 24, ay: 0 },    // inverted triangle
    prohib: { x: 27, y: 27, w: 46, h: 46 },            // red ring disc (under the slash when slash:true)
    mand: { x: 22, y: 22, w: 56, h: 56, fill: C.white },   // blue disc, white pictogram
    square: { x: 16, y: 16, w: 68, h: 68, fill: C.white }  // SignKit.rect 100 x 100 info / service sign
  };
  function frame(kind, extra) {
    var o = {}, k, b = FRAMES[kind] || FRAMES.prohib;
    for (k in b) o[k] = b[k];
    if (extra) for (k in extra) o[k] = extra[k];
    return o;
  }
  // Best box for a given glyph or arrow in a given base ('warn', 'giveWay', 'prohib', 'mand', 'square').
  // Uses the glyph's own tuned box when it has one (g.boxes[base]), otherwise for 'warn' picks warnWide
  // (aspect > 1.6), warnTall (thin line symbols under 0.8) or warn.
  function fit(base, name, extra) {
    var g = G[name] || ARROWS[name], kind = base, k, o = {};
    if (g && g.boxes && g.boxes[base]) {
      for (k in g.boxes[base]) o[k] = g.boxes[base][k];
      if (base === 'mand' || base === 'square') o.fill = C.white;
      if (extra) for (k in extra) o[k] = extra[k];
      return o;
    }
    if (base === 'warn' && g) {
      var a = g.vb[0] / g.vb[1], line = !G[name] || name === 'exclamation' || (g.tags || []).indexOf('road') >= 0;
      kind = a > 1.6 ? 'warnWide' : line && a < 0.8 ? 'warnTall' : 'warn';
    }
    return frame(kind, extra);
  }

  K.FRAMES = FRAMES;
  K.frame = frame;
  K.fit = fit;
  K.glyphs = G;
  K.arrows = ARROWS;
  K.glyph = glyph;
  K.arrow = arrow;
  K.glyphBox = glyphBox;
  K.glyphPoint = glyphPoint;
  K.glyphIcon = glyphIcon;
  K.glyphNames = function () { return Object.keys(G); };
  K.arrowKinds = function () { return Object.keys(ARROWS); };
})();
