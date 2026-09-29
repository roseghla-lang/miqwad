/* مقود: road markings seen from above (the mk- items of content/markings.json): longitudinal lines,
 * transverse lines, crossings, painted arrows, painted areas, devices and the disabled bay.
 * Style of docs/drawing.md 5.2: square tile 0 0 100 100 on a rounded ground, north up, traffic moving up
 * the screen, UAE right-hand traffic (oncoming traffic on the left half of an undivided road).
 * A small local kit at the top keeps the 31 pictures one family. Drawn from scratch, see docs/drawing.md */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }

  // ================================================================ palette (docs/drawing.md 5.2)
  var C = {
    ground: '#353C47', sand: '#C9B48A', asphalt: '#2A2F37', asphaltDark: '#22262D',
    white: '#F2F2EE', yellow: '#F2C230', kerb: '#9AA3AE',
    glass: '#1B2230', lamp: '#F4F1DE', tail: '#8E1C1C',
    me: '#F4F2EA', gold: '#D9B978', ok: '#8CC8A0', bad: '#DE9090', x: '#E0564F', other: '#97A1B4',
    amber: '#FFB21E',
    blue: '#3F6FB5', red: '#C0453A', silver: '#B8BEC8', dark: '#4A505A', green: '#3C8A5E',
    sRed: '#C8202A', sBlue: '#1F5AA6', busLane: '#8C2A2A',
    housing: '#15181D', housingEdge: '#5A6475'
  };
  // Line widths are exaggerated so they still show at 64 px (true 0.15 m lane line, 0.3 m stop line)
  var LW = 2.4, SLW = 5, KW = 1.8;
  var DASH = [9, 12];                 // broken line: 3 m dash / 6 m gap, shortened so a tile shows several dashes

  // ================================================================ SVG helpers
  function f(v) { v = Math.round(v * 100) / 100; return String(v === 0 ? 0 : v); }
  function el(tag, a) {
    var s = '<' + tag;
    for (var k in a) {
      var v = a[k];
      if (v == null || v === '') continue;
      if (typeof v === 'number') v = f(v);
      else if (Object.prototype.toString.call(v) === '[object Array]') v = v.map(f).join(' ');
      s += ' ' + k + '="' + v + '"';
    }
    return s + '/>';
  }
  function pstr(pts) { return pts.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' '); }
  function grp(tr, inner) { return '<g transform="' + tr + '">' + inner + '</g>'; }
  function at(x, y, rot, s) {
    return 'translate(' + f(x) + ' ' + f(y) + ')' + (rot ? ' rotate(' + f(rot) + ')' : '') +
      (s && s !== 1 ? ' scale(' + (Math.round(s * 1000) / 1000) + ')' : '');
  }
  function rect(x, y, w, h, fill, a) {
    a = a || {};
    return el('rect', { x: x, y: y, width: w, height: h, rx: a.rx, fill: fill, stroke: a.stroke,
      'stroke-width': a.sw, opacity: a.op });
  }
  function circ(cx, cy, r, fill, a) {
    a = a || {};
    return el('circle', { cx: cx, cy: cy, r: r, fill: fill, stroke: a.stroke, 'stroke-width': a.sw, opacity: a.op });
  }
  function line(x1, y1, x2, y2, col, w, a) {
    a = a || {};
    return el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: col, 'stroke-width': w,
      'stroke-dasharray': a.dash, 'stroke-dashoffset': a.off, 'stroke-linecap': a.cap, opacity: a.op });
  }
  function poly(pts, fill, a) {
    a = a || {};
    if (!pts || pts.length < 3) return '';
    return el('polygon', { points: pstr(pts), fill: fill, stroke: a.stroke, 'stroke-width': a.sw,
      'stroke-linejoin': a.stroke ? 'round' : null, opacity: a.op });
  }
  function path(d, fill, a) {
    a = a || {};
    return el('path', { d: d, fill: fill, stroke: a.stroke, 'stroke-width': a.sw, 'stroke-dasharray': a.dash,
      'stroke-linecap': a.cap, 'stroke-linejoin': a.join, opacity: a.op });
  }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) {
      return Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    });
    return '#' + ((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1).toUpperCase();
  }

  // ---------------------------------------------------------------- geometry
  function arcPts(cx, cy, r, a0, a1, step) {        // degrees, screen space (0 = east, 90 = south)
    var n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (step || 10))), out = [];
    for (var i = 0; i <= n; i++) {
      var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
  }
  function bez(p0, p1, p2, p3, n) {                 // cubic Bezier sampled into n segments
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
    }
    return out;
  }
  function rrPts(x0, y0, x1, y1, r) {               // rounded rectangle, r = number or [tl, tr, br, bl]
    var rs = typeof r === 'number' ? [r, r, r, r] : (r || [0, 0, 0, 0]), out = [];
    [[x1 - rs[1], y0 + rs[1], -90, rs[1]], [x1 - rs[2], y1 - rs[2], 0, rs[2]],
      [x0 + rs[3], y1 - rs[3], 90, rs[3]], [x0 + rs[0], y0 + rs[0], 180, rs[0]]].forEach(function (c) {
      if (!c[3]) out.push([c[0], c[1]]);
      else out = out.concat(arcPts(c[0], c[1], c[3], c[2], c[2] + 90, 15));
    });
    return out;
  }
  function boxPts(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
  // polyline shifted sideways by d (d > 0: to the left of the direction of travel), averaged normals
  function offsetPts(pts, d) {
    var n = pts.length, out = [];
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      var tx = b[0] - a[0], ty = b[1] - a[1], l = Math.sqrt(tx * tx + ty * ty) || 1;
      out.push([pts[i][0] + ty / l * d, pts[i][1] - tx / l * d]);
    }
    return out;
  }
  // band of width w along a polyline: left side forward, right side back
  function ribbon(pts, w) { return offsetPts(pts, w / 2).concat(offsetPts(pts, -w / 2).reverse()); }
  // polyline cut where it first leaves the square 0..100 (for strokes that run off the tile)
  function trim(pts) {
    function inside(p) { return p[0] >= 0 && p[0] <= 100 && p[1] >= 0 && p[1] <= 100; }
    var out = [], i = 0;
    while (i < pts.length && !inside(pts[i])) i++;
    if (i > 0 && i < pts.length) out.push(cross1(pts[i], pts[i - 1]));
    for (; i < pts.length; i++) {
      if (inside(pts[i])) { out.push(pts[i]); continue; }
      out.push(cross1(pts[i - 1], pts[i]));
      break;
    }
    return out;
  }
  function cross1(p, q) {                           // p inside, q outside: point where p->q leaves the square
    var t = 1;
    [[0, 0], [0, 100], [1, 0], [1, 100]].forEach(function (b) {
      var k = b[0], v = b[1], d = q[k] - p[k];
      if (Math.abs(d) > 1e-9) { var tt = (v - p[k]) / d; if (tt >= 0 && tt < t) t = tt; }
    });
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  }
  function pl(pts) { return 'M' + pts.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join('L'); }
  // first crossing of the ray p + t*u (t > 0) with a polyline, or null
  function hit(p, u, pts) {
    var best = null;
    for (var i = 0; i + 1 < pts.length; i++) {
      var a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ey = b[1] - a[1], den = u[0] * ey - u[1] * ex;
      if (Math.abs(den) < 1e-9) continue;
      var t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * u[1] - (a[1] - p[1]) * u[0]) / den;
      if (t > 0 && s >= 0 && s <= 1 && (!best || t < best[2])) best = [p[0] + u[0] * t, p[1] + u[1] * t, t];
    }
    return best;
  }

  // ---------------------------------------------------------------- the tile and clipping to it
  // The ground is a rounded square (rx 8). Anything that reaches the tile edge is clipped to that outline
  // (Sutherland-Hodgman against the convex rounded square), because clip paths are not allowed.
  var TILE = (function () {
    var p = [];
    [[92, 8, -90], [92, 92, 0], [8, 92, 90], [8, 8, 180]].forEach(function (c) {
      p = p.concat(arcPts(c[0], c[1], 8, c[2], c[2] + 90, 11.25));
    });
    return p;
  })();
  function crs(a, b, p) { return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); }
  function clip(pts) {
    var out = pts;
    for (var i = 0; i < TILE.length && out.length > 2; i++) {
      var a = TILE[i], b = TILE[(i + 1) % TILE.length], inp = out;
      out = [];
      for (var j = 0; j < inp.length; j++) {
        var p = inp[j], q = inp[(j + 1) % inp.length], sp = crs(a, b, p), sq = crs(a, b, q);
        if (sp >= 0) out.push(p);
        if ((sp >= 0) !== (sq >= 0)) {
          var t = sp / (sp - sq);
          out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
        }
      }
    }
    return out;
  }
  function area(pts, fill, a) { return poly(clip(pts), fill, a); }
  function tile(inner, label, sand) {
    return K.svg(rect(0, 0, 100, 100, sand ? C.sand : C.ground, { rx: 8 }) + inner, '0 0 100 100', label);
  }
  // segment clipped to a convex polygon (Cyrus-Beck); returns [] or [[x1,y1],[x2,y2]]
  function segIn(p, q, P) {
    var t0 = 0, t1 = 1, dx = q[0] - p[0], dy = q[1] - p[1], s = 0;
    for (var i = 0; i < P.length; i++) s += crs(P[i], P[(i + 1) % P.length], P[(i + 2) % P.length]);
    var sg = s >= 0 ? 1 : -1;
    for (var k = 0; k < P.length; k++) {
      var a = P[k], b = P[(k + 1) % P.length];
      var num = sg * crs(a, b, p), den = sg * ((b[0] - a[0]) * dy - (b[1] - a[1]) * dx);
      if (Math.abs(den) < 1e-9) { if (num < 0) return []; continue; }
      var t = -num / den;
      if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
      if (t0 > t1) return [];
    }
    return [[p[0] + dx * t0, p[1] + dy * t0], [p[0] + dx * t1, p[1] + dy * t1]];
  }
  // parallel stripes at angle ang (degrees from east, screen space) every gap units, clipped to convex P
  function hatch(P, ang, gap, col, w, off) {
    var a = ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, out = '';
    var lo = Infinity, hi = -Infinity, cx = 0, cy = 0;
    P.forEach(function (p) { var d = p[0] * nx + p[1] * ny; lo = Math.min(lo, d); hi = Math.max(hi, d); cx += p[0]; cy += p[1]; });
    cx /= P.length; cy /= P.length;
    for (var d = Math.ceil((lo - (off || 0)) / gap) * gap + (off || 0); d <= hi; d += gap) {
      var k = d - (cx * nx + cy * ny), px = cx + nx * k, py = cy + ny * k;
      var s = segIn([px - ux * 300, py - uy * 300], [px + ux * 300, py + uy * 300], P);
      if (s.length) out += 'M' + f(s[0][0]) + ' ' + f(s[0][1]) + 'L' + f(s[1][0]) + ' ' + f(s[1][1]);
    }
    return out ? path(out, 'none', { stroke: col, sw: w }) : '';
  }

  // ================================================================ road kit
  function asphalt(x0, y0, x1, y1, col) { return area(boxPts(x0, y0, x1, y1), col || C.asphalt); }
  // pavement island with a kerb band on its edges (extend it past the tile to hide an edge)
  function block(x0, y0, x1, y1, r, fill) {
    var r2 = typeof r === 'number' ? Math.max(0, r - KW) :
      (r || [0, 0, 0, 0]).map(function (v) { return Math.max(0, v - KW); });
    return area(rrPts(x0, y0, x1, y1, r || 0), C.kerb) + area(rrPts(x0 + KW, y0 + KW, x1 - KW, y1 - KW, r2), fill || C.ground);
  }
  function kerbAlong(pts) { return area(ribbon(pts, KW), C.kerb); }
  function solid(x1, y1, x2, y2, col, w) { return line(x1, y1, x2, y2, col || C.white, w || LW); }
  function broken(x1, y1, x2, y2, col, off, w, dash) {
    return line(x1, y1, x2, y2, col || C.white, w || LW, { dash: dash || DASH, off: off || 0 });
  }
  function stopBar(x0, x1, y, w) { return rect(x0, y - (w || SLW) / 2, x1 - x0, w || SLW, C.white); }

  // ================================================================ vehicles and people (metres, front up)
  var PATHC = { me: C.gold, ok: C.ok, bad: C.bad, other: C.other };
  function indicators(hw, hl, side) {
    var x = side === 'l' ? -1 : 1, out = '';
    [[-hl + 0.32, -1], [hl - 0.32, 1]].forEach(function (p) {
      var cx = x * (hw - 0.1), cy = p[0], dy = p[1];
      out += circ(cx, cy, 0.3, C.amber) +
        line(cx + x * 0.5, cy, cx + x * 0.95, cy, C.amber, 0.2, { cap: 'round' }) +
        line(cx + x * 0.36, cy + dy * 0.36, cx + x * 0.7, cy + dy * 0.7, C.amber, 0.2, { cap: 'round' });
    });
    return out;
  }
  // car 4.6 x 1.95 m; o: {c: body colour, me: our car, rot: heading degrees clockwise from north, ind: 'l'|'r'}
  function car(x, y, len, o) {
    o = o || {};
    var c = o.me ? C.me : (o.c || C.silver), dk = shade(c, -0.45), s = '';
    if (o.me) s += rect(-1.4, -2.75, 2.8, 5.5, 'none', { rx: 1.05, stroke: C.gold, sw: 0.28, op: 0.45 });
    s += rect(-0.975, -2.3, 1.95, 4.6, c, { rx: 0.62, stroke: o.me ? C.gold : dk, sw: o.me ? 0.3 : 0.14 });
    if (!o.lite) s += rect(-0.66, -0.42, 1.32, 1.6, shade(c, o.me ? -0.06 : 0.1), { rx: 0.15 });
    s += path('M-.8 -1.16H.8L.66 -.42H-.66ZM-.66 1.18H.66L.74 1.68H-.74ZM-.87 -.95h.11v2.2h-.11ZM.76 -.95h.11v2.2h-.11Z', C.glass);
    if (!o.lite) s += path('M-1.13 -1.02h.22v.17h-.22ZM.91 -1.02h.22v.17h-.22Z', dk);
    s += path('M-.84 -2.26h.48v.17h-.48ZM.36 -2.26h.48v.17h-.48Z', C.lamp);
    s += path('M-.84 2.1h.46v.15h-.46ZM.38 2.1h.46v.15h-.46Z', C.tail);
    if (o.ind) s += indicators(0.975, 2.3, o.ind);
    return grp(at(x, y, o.rot, len / 4.6), s);
  }
  // lorry 9 x 2.5 m: cab in front, box behind
  function truck(x, y, len, o) {
    o = o || {};
    var c = o.c || C.blue, dk = shade(c, -0.45), s = '';
    s += rect(-1.25, -2.3, 2.5, 6.8, '#D3D6DB', { rx: 0.2, stroke: '#7E858E', sw: 0.14 });
    for (var yy = -1.2; yy < 4.3; yy += 1.1) s += line(-1.05, yy, 1.05, yy, '#AEB3BA', 0.12);
    s += rect(-1.2, -4.5, 2.4, 2.25, c, { rx: 0.45, stroke: dk, sw: 0.14 });
    s += rect(-1.0, -4.22, 2.0, 0.6, C.glass, { rx: 0.14 });
    s += rect(-1.02, -4.47, 0.5, 0.17, C.lamp, { rx: 0.06 }) + rect(0.52, -4.47, 0.5, 0.17, C.lamp, { rx: 0.06 });
    s += rect(-1.1, 4.32, 0.5, 0.15, C.tail) + rect(0.6, 4.32, 0.5, 0.15, C.tail);
    return grp(at(x, y, o.rot, len / 9), s);
  }
  // city bus 12 x 2.55 m, white roof with a red side band
  function bus(x, y, len, o) {
    o = o || {};
    var s = '';
    s += rect(-1.275, -6, 2.55, 12, '#E7E5DF', { rx: 0.55, stroke: '#8E939A', sw: 0.14 });
    s += rect(-1.275, -4.6, 0.26, 10.1, C.sRed) + rect(1.015, -4.6, 0.26, 10.1, C.sRed);
    s += rect(-1.1, -5.86, 2.2, 0.78, C.glass, { rx: 0.25 });
    s += rect(-0.62, -3.6, 1.24, 2.4, '#BFC4CB', { rx: 0.2 }) + rect(-0.62, 1.2, 1.24, 2.4, '#BFC4CB', { rx: 0.2 });
    s += rect(-0.95, 5.45, 1.9, 0.35, C.glass, { rx: 0.1 });
    s += rect(-1.08, -5.97, 0.5, 0.16, C.lamp) + rect(0.58, -5.97, 0.5, 0.16, C.lamp);
    return grp(at(x, y, o.rot, len / 12), s);
  }
  // ambulance 6 x 2.3 m: white, red side stripes, red + blue light bar, red crescent
  function ambulance(x, y, len, o) {
    o = o || {};
    var s = '';
    s += circ(-0.75, -1.1, 1.25, '#FF3B30', { op: 0.3 }) + circ(0.75, -1.1, 1.25, '#3D7BFF', { op: 0.32 });
    s += rect(-1.15, -3, 2.3, 6, '#F2F3F5', { rx: 0.5, stroke: '#8E949C', sw: 0.14 });
    s += path('M-0.98 -2.12L0.98 -2.12L0.9 -1.5L-0.9 -1.5Z', C.glass);
    s += rect(-1.15, -0.7, 0.3, 3.4, C.sRed) + rect(0.85, -0.7, 0.3, 3.4, C.sRed);
    s += rect(-1.0, -1.35, 1.0, 0.5, '#E5352B', { rx: 0.12 }) + rect(0, -1.35, 1.0, 0.5, '#2F6FE0', { rx: 0.12 });
    s += circ(-0.08, 1.05, 0.62, C.sRed) + circ(0.16, 0.97, 0.52, '#F2F3F5');     // red crescent on the roof
    s += rect(-0.98, -2.97, 0.46, 0.16, C.lamp) + rect(0.52, -2.97, 0.46, 0.16, C.lamp);
    return grp(at(x, y, o.rot, len / 6), s);
  }
  // pedestrian from above, facing rot (0 = up)
  function walker(x, y, size, o) {
    o = o || {};
    var s = el('ellipse', { cx: -0.55, cy: -1.25, rx: 0.42, ry: 0.62, fill: '#2B2622' }) +
      el('ellipse', { cx: 0.55, cy: 1.0, rx: 0.42, ry: 0.62, fill: '#2B2622' }) +
      el('ellipse', { cx: 0, cy: 0, rx: 2.3, ry: 1.25, fill: o.c || '#E58A3C', stroke: shade(o.c || '#E58A3C', -0.4), 'stroke-width': 0.2 }) +
      circ(0, -0.05, 1.05, '#EAE6DB');
    return grp(at(x, y, o.rot, size / 4.6), s);
  }

  // ================================================================ signs and signals seen face-on, laid flat
  function octPts(cx, cy, R) {
    var p = [];
    for (var k = 0; k < 8; k++) { var a = (22.5 + 45 * k) * Math.PI / 180; p.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
    return p;
  }
  function stopSign(cx, cy, r) {
    return poly(octPts(cx, cy, r), C.white) + poly(octPts(cx, cy, r * 0.87), C.sRed) +
      poly(octPts(cx, cy, r * 0.74), 'none', { stroke: C.white, sw: r * 0.06 });
  }
  function triPts(cx, cy, r, down) {                // equilateral triangle, centroid (cx, cy), circumradius r
    var p = [];
    for (var k = 0; k < 3; k++) { var a = ((down ? 90 : -90) + 120 * k) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
  }
  function giveWaySign(cx, cy, r) {
    return poly(triPts(cx, cy, r, true), C.white, { stroke: C.white, sw: r * 0.16 }) +
      poly(triPts(cx, cy, r * 0.9, true), C.sRed, { stroke: C.sRed, sw: r * 0.12 }) +
      poly(triPts(cx, cy, r * 0.52, true), C.white);
  }
  function warnSign(cx, cy, r, inner) {
    return poly(triPts(cx, cy, r, false), C.white, { stroke: C.white, sw: r * 0.16 }) +
      poly(triPts(cx, cy, r * 0.9, false), C.sRed, { stroke: C.sRed, sw: r * 0.12 }) +
      poly(triPts(cx, cy, r * 0.52, false), C.white) + (inner || '');
  }
  function glyphOr(name, box, fallback) {
    try { if (K.glyph && K.glyphs && K.glyphs[name]) return K.glyph(name, box); } catch (e) { /* use the fallback */ }
    return fallback || '';
  }
  function blueSign(cx, cy, s, inner) {             // square blue info sign, side s
    return rect(cx - s / 2 - 0.6, cy - s / 2 - 0.6, s + 1.2, s + 1.2, C.white, { rx: 1.6 }) +
      rect(cx - s / 2 + 0.3, cy - s / 2 + 0.3, s - 0.6, s - 0.6, C.sBlue, { rx: 1.1 }) + (inner || '');
  }
  function pedSign(cx, cy, s) {
    var t = triPts(cx, cy + s * 0.06, s * 0.38, false);
    return blueSign(cx, cy, s, poly(t, C.white, { stroke: C.white, sw: s * 0.06 }) +
      glyphOr('person-walk', { x: cx - s * 0.13, y: cy - s * 0.12, w: s * 0.26, h: s * 0.3, fill: '#151515' },
        circ(cx, cy + s * 0.05, s * 0.09, '#151515')));
  }
  function wheelchairSign(cx, cy, s) {
    return blueSign(cx, cy, s, glyphOr('wheelchair', { x: cx - s * 0.33, y: cy - s * 0.36, w: s * 0.66, h: s * 0.72, fill: C.white },
      circ(cx, cy, s * 0.25, C.white)));
  }
  // traffic signal head (front view laid flat); lit = 'r' | 'a' | 'g'
  function signal(cx, cy, s, lit) {
    var cols = { r: '#E5352B', a: '#F5A623', g: '#2FC36B' }, out = '';
    out += rect(cx - 2.6 * s, cy - 6.4 * s, 5.2 * s, 12.8 * s, C.housing, { rx: 1.3 * s, stroke: C.housingEdge, sw: 0.6 * s });
    ['r', 'a', 'g'].forEach(function (k, i) {
      var ly = cy + (i - 1) * 3.9 * s;
      if (k === lit) out += circ(cx, ly, 2.9 * s, cols[k], { op: 0.28 }) + circ(cx, ly, 1.55 * s, cols[k]);
      else out += circ(cx, ly, 1.55 * s, '#2A2F37') + circ(cx, ly, 1.55 * s, cols[k], { op: 0.16 });
    });
    return out;
  }

  // ================================================================ path arrows and the red X
  // pts: [x0,y0, x1,y1,x2,y2,x3,y3, ...] one or more cubic segments; the head sits on the last point
  function route(pts, kind, o) {
    o = o || {};
    var col = PATHC[kind] || C.gold, sw = o.sw || 2, hl = o.hl || 6.2, hw = o.hw || 6.6;
    var n = pts.length, ex = pts[n - 2], ey = pts[n - 1], px = pts[n - 4], py = pts[n - 3];
    var dx = ex - px, dy = ey - py, d = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= d; dy /= d;
    var q = pts.slice();
    q[n - 2] -= dx * hl; q[n - 1] -= dy * hl; q[n - 4] -= dx * hl; q[n - 3] -= dy * hl;
    var s = 'M' + f(q[0]) + ' ' + f(q[1]);
    for (var i = 2; i < n; i += 6) s += 'C' + [q[i], q[i + 1], q[i + 2], q[i + 3], q[i + 4], q[i + 5]].map(f).join(' ');
    var bx = ex - dx * hl, by = ey - dy * hl;
    return path(s, 'none', { stroke: col, sw: sw, dash: '4 3' }) +
      poly([[ex, ey], [bx - dy * hw / 2, by + dx * hw / 2], [bx + dy * hw / 2, by - dx * hw / 2]], col);
  }
  function xMark(x, y, r) {                         // red X on a dark backing so it shows over white lines
    var d = 'M' + f(x - r) + ' ' + f(y - r) + 'L' + f(x + r) + ' ' + f(y + r) + 'M' + f(x + r) + ' ' + f(y - r) + 'L' + f(x - r) + ' ' + f(y + r);
    return path(d, 'none', { stroke: '#1A1E26', sw: 5.4, cap: 'round', op: 0.55 }) + path(d, 'none', { stroke: C.x, sw: 3, cap: 'round' });
  }

  // ================================================================ painted arrows (white road arrows)
  // Built from a centre line: a band of width sw plus a triangular head (hw wide, hl long) on the last point.
  function arrowOutline(cl, sw, hw, hl) {
    var n = cl.length, e = cl[n - 1], p = cl[n - 2], dx = e[0] - p[0], dy = e[1] - p[1], d = Math.sqrt(dx * dx + dy * dy);
    dx /= d; dy /= d;
    var band = ribbon(cl, sw), half = band.length / 2;
    return band.slice(0, half).concat([[e[0] + dy * hw / 2, e[1] - dx * hw / 2], [e[0] + dx * hl, e[1] + dy * hl],
      [e[0] - dy * hw / 2, e[1] + dx * hw / 2]], band.slice(half));
  }
  function mirrorX(pts) { return pts.map(function (p) { return [-p[0], p[1]]; }); }
  // kinds: straight, left, right, straight-left, straight-right, veer-left, veer-right. Local units: base at
  // (0,0), pointing up, straight arrow 60 long; placed with translate (x, y), scale s and rotation rot.
  function roadArrow(kind, x, y, s, rot, col) {
    var sw = 5.4, hw = 15, hl = 19, shapes = [], side = /right/.test(kind) ? -1 : 1;
    function turn(y0, a, r, head) {                 // stem from y0 up to a, quarter turn left, head pointing left
      var cl = [[0, y0], [0, -a]].concat(arcPts(-r, -a, r, 0, -90, 10).slice(1));
      cl.push([-r - 2, -a - r]);
      return arrowOutline(cl, sw, head[0], head[1]);
    }
    if (kind === 'straight' || /^straight-/.test(kind)) shapes.push(arrowOutline([[0, 0], [0, -41]], sw, hw, hl));
    if (kind === 'left' || kind === 'right') shapes.push(turn(0, 26, 11, [15, 16]));
    if (/^straight-/.test(kind)) shapes.push(turn(-10, 17, 10, [13.5, 14]));
    if (/^veer-/.test(kind)) {
      var r = 16, th = 38, cl = [[0, 0], [0, -24]].concat(arcPts(-r, -24, r, 0, -th, 6).slice(1)), e = cl[cl.length - 1];
      var ux = -Math.sin(th * Math.PI / 180), uy = -Math.cos(th * Math.PI / 180);
      cl.push([e[0] + ux * 6, e[1] + uy * 6]);
      shapes.push(arrowOutline(cl, sw, hw, hl));
    }
    var out = '';
    shapes.forEach(function (pts) { out += poly(side < 0 ? mirrorX(pts) : pts, col || C.white); });
    return grp(at(x, y, rot, s), out);
  }

  // ================================================================ scene helpers
  function street(x0, x1) {
    return asphalt(x0, 0, x1, 100) + area(boxPts(x0 - KW, 0, x0, 100), C.kerb) + area(boxPts(x1, 0, x1 + KW, 100), C.kerb);
  }
  // zebra crossing: n bars parallel to the traffic, spread over x0..x1, from y0 to y1
  function zebra(x0, x1, y0, y1, n) {
    var m = 1.6, bw = (x1 - x0 - 2 * m) / (n + (n - 1) / 1.35), g = bw / 1.35, out = '';
    for (var i = 0; i < n; i++) out += rect(x0 + m + i * (bw + g), y0, bw, y1 - y0, C.white);
    return out;
  }
  function zigzag(x, y0, y1, amp, seg, col) {
    var p = [], k = 0;
    for (var y = y1; y >= y0 - 0.01; y -= seg, k++) p.push([x + (k % 2 ? amp : -amp), y]);
    return path('M' + p.map(function (q) { return f(q[0]) + ' ' + f(q[1]); }).join('L'), 'none',
      { stroke: col || C.white, sw: 2.1, join: 'miter' });
  }
  // lane arrow centred on its bounding box: kind, centre x, base y, scale
  var ARROW_DX = { straight: 0, left: -13.15, right: 13.15, 'straight-left': -9.25, 'straight-right': 9.25,
    'veer-left': -8.1, 'veer-right': 8.1 };
  function laneArrow(kind, cx, by, s, col) { return roadArrow(kind, cx - ARROW_DX[kind] * s, by, s, 0, col); }

  // ================================================================ pictures
  // ---------- longitudinal lines
  reg('mk-broken-lane', 'خط أبيض متقطع بين المسارات', function (o, label) {
    var s = street(12, 88);
    s += broken(37.33, 100, 37.33, 0, C.white, 2) + broken(62.67, 100, 62.67, 0, C.white, 2);
    s += car(75.3, 22, 24, { c: C.blue });
    s += route([50, 63, 50, 54, 75.3, 57, 75.3, 42], 'ok');
    s += car(50, 77, 24, { me: true, ind: 'r' });
    return tile(s, label);
  });

  reg('mk-solid-lane', 'خط أبيض متصل بين المسارات', function (o, label) {
    var s = asphalt(0, 0, 100, 19) + asphalt(12, 0, 88, 100);
    s += block(-10, 19, 12, 110, [0, 5, 0, 0]) + block(88, 19, 110, 110, [5, 0, 0, 0]);
    s += stopBar(12, 88, 26.5);
    [37.33, 62.67].forEach(function (x) { s += solid(x, 29, x, 62) + broken(x, 100, x, 62, C.white, 1); });
    s += laneArrow('left', 24.67, 59, 0.46) + laneArrow('straight', 50, 59, 0.46) + laneArrow('right', 75.33, 59, 0.46);
    s += signal(94.5, 34, 0.78, 'r');
    return tile(s, label);
  });

  // undivided two-way road, one lane each way: x 20..80, centre 50
  function twoWay() { return street(20, 80); }

  reg('mk-broken-center', 'خط أصفر متقطع في منتصف الطريق', function (o, label) {
    var s = twoWay() + broken(50, 100, 50, 0, C.yellow, 4);
    s += car(35, 20, 25, { c: C.red, rot: 180 });
    s += car(65, 77, 25, { me: true });
    return tile(s, label);
  });

  reg('mk-solid-center', 'خط متصل في منتصف الطريق (ممنوع التجاوز)', function (o, label) {
    // road bending to the left near the top
    var c = [[62, 112], [62, 60]].concat(bez([62, 60], [62, 32], [50, 12], [22, -2], 18).slice(1));
    c.push([-14, -20]);
    var s = area(ribbon(c, 60 + 2 * KW), C.kerb) + area(ribbon(c, 60), C.asphalt);
    s += path(pl(trim(c)), 'none', { stroke: C.yellow, sw: LW });
    s += truck(78, 40, 36, { c: C.blue });
    s += route([72, 70, 66, 63, 48, 62, 47, 50, 46, 38, 44, 30, 40, 23], 'bad');
    s += xMark(47, 46, 5);
    s += car(78, 83, 24, { me: true });
    return tile(s, label);
  });

  reg('mk-double-solid', 'خطان أصفران متصلان في المنتصف', function (o, label) {
    var s = twoWay() + solid(47.4, 100, 47.4, 0, C.yellow, 2.2) + solid(52.6, 100, 52.6, 0, C.yellow, 2.2);
    s += car(35, 20, 25, { c: C.green, rot: 180 });
    s += car(65, 77, 25, { me: true });
    return tile(s, label);
  });

  reg('mk-solid-broken', 'خط متصل بجانب خط متقطع في المنتصف', function (o, label) {
    var s = twoWay() + solid(47.4, 100, 47.4, 0, C.yellow, 2.2) + broken(52.6, 100, 52.6, 0, C.yellow, 4, 2.2);
    s += car(35, 12, 19, { c: C.red, rot: 180 });
    s += route([35, 23.5, 35, 30.5, 61, 28.5, 61, 36.5, 61, 44.5, 35, 42.5, 35, 50], 'bad');
    s += xMark(50.5, 29.5, 3.4);
    s += car(65, 88, 19, { me: true });
    s += route([65, 76.5, 65, 69.5, 39, 71.5, 39, 63.5, 39, 55.5, 65, 57.5, 65, 50], 'ok');
    return tile(s, label);
  });

  // divided highway in the desert, traffic up: median barrier, yellow left edge, 3 lanes, white right edge, shoulder
  function highway(o) {
    o = o || {};
    var s = area(boxPts(1, 0, 6, 100), C.kerb) + area(boxPts(2.9, 0, 4.1, 100), '#7D8692');
    s += asphalt(6, 0, 94, 100, C.asphalt) + asphalt(75, 0, 94, 100, C.asphaltDark);
    s += solid(10.2, 100, 10.2, 0, C.yellow) + solid(75, 100, 75, 0, C.white);
    s += broken(31.8, 100, 31.8, 0, C.white, o.off || 3) + broken(53.4, 100, 53.4, 0, C.white, o.off || 3);
    return s;
  }
  reg('mk-edge-line', 'خط حافة الطريق', function (o, label) {
    return tile(highway(), label, true);
  });

  reg('mk-hard-shoulder', 'كتف الطريق', function (o, label) {
    var s = highway();
    [[21, 16, C.silver], [21, 45, C.red], [21, 74, C.dark], [42.6, 30, C.green], [42.6, 60, C.blue], [42.6, 89, C.silver],
      [64.2, 22, C.dark], [64.2, 51, C.silver]].forEach(function (q) { s += car(q[0], q[1], 19, { c: q[2], lite: true }); });
    s += car(64.2, 82, 19, { me: true });
    s += route([68.5, 72, 71, 65, 84.5, 67, 84.5, 51], 'bad');
    s += xMark(79.5, 63.5, 3.8);
    s += ambulance(84.5, 25, 24);
    return tile(s, label, true);
  });

  // ---------- transverse lines
  reg('mk-stop-line', 'خط التوقف', function (o, label) {
    var s = asphalt(0, 6, 100, 38) + asphalt(22, 30, 78, 100);
    s += block(-10, -10, 110, 6, 0) + block(-10, 38, 22, 110, [0, 6, 0, 0]) + block(78, 38, 110, 110, [6, 0, 0, 0]);
    s += broken(0, 22, 100, 22, C.yellow, 2);
    s += stopBar(22, 78, 43.5);
    s += broken(50, 100, 50, 49, C.white, 4);
    s += stopSign(88.5, 50, 6.3);
    return tile(s, label);
  });

  reg('mk-give-way-line', 'خط إفساح الطريق', function (o, label) {
    var s = asphalt(0, 6, 100, 40) + asphalt(34, 30, 66, 100);
    s += block(-10, -10, 110, 6, 0) + block(-10, 40, 34, 110, [0, 7, 0, 0]) + block(66, 40, 110, 110, [7, 0, 0, 0]);
    s += broken(0, 23, 100, 23, C.yellow, 2);
    s += broken(34, 45, 66, 45, C.white, 0, 4.2, [4.57, 4.57]);
    s += giveWaySign(77, 52.5, 6.4);
    return tile(s, label);
  });

  // ---------- crossings
  reg('mk-zebra', 'ممر المشاة المخطط (الزيبرا)', function (o, label) {
    var s = street(16, 84);
    s += broken(50, 100, 50, 68, C.white, 3) + broken(50, 30, 50, 0, C.white, 3);
    s += zebra(16, 84, 36, 62, 7);
    s += pedSign(92, 73, 11);
    s += walker(86.6, 49, 9.5, { rot: -90 });
    return tile(s, label);
  });

  reg('mk-signal-crossing', 'ممر مشاة بإشارة ضوئية', function (o, label) {
    var s = street(16, 84);
    s += broken(50, 100, 50, 75, C.white, 3) + broken(50, 24, 50, 0, C.white, 3);
    s += stopBar(16, 84, 70.5);
    s += zebra(16, 84, 30, 60, 7);
    s += signal(8, 76, 0.95, 'r') + signal(92, 76, 0.95, 'r');
    s += circ(92, 45, 1.6, '#7D8692') + rect(89.6, 39.2, 4.8, 4.2, '#F2C230', { rx: 0.8 }) + circ(92, 41.3, 1.1, '#15181D');
    return tile(s, label);
  });

  reg('mk-zigzag', 'الخطوط المتعرجة قبل ممر المشاة', function (o, label) {
    var s = street(18, 82);
    s += zebra(18, 82, 5, 27, 7);
    s += zigzag(22.5, 34, 98, 2.6, 6.4) + zigzag(50, 34, 98, 2.6, 6.4) + zigzag(77.5, 34, 98, 2.6, 6.4);
    return tile(s, label);
  });

  reg('mk-tram-box', 'الصندوق الأصفر عند معبر الترام', function (o, label) {
    var s = street(18, 82);
    s += area(boxPts(-5, 31, 18 - KW, 69), '#3D434C') + area(boxPts(82 + KW, 31, 105, 69), '#3D434C');
    s += broken(50, 100, 50, 74, C.white, 3) + broken(50, 26, 50, 0, C.white, 3);
    var box = boxPts(20.5, 32, 79.5, 68);
    s += hatch(box, 45, 8.5, C.yellow, 1.9) + hatch(box, -45, 8.5, C.yellow, 1.9);
    s += rect(20.5, 32, 59, 36, 'none', { stroke: C.yellow, sw: 2.4 });
    [38.5, 45.5, 54.5, 61.5].forEach(function (y) { s += line(0, y, 100, y, '#A7AFB9', 1.3); });
    s += signal(91.8, 80, 0.78, 'r');
    return tile(s, label);
  });

  // ---------- painted arrows
  // one lane seen close up near the stop line (lane lines are solid there)
  function arrowLane(kind, o) {
    var s = asphalt(0, 0, 100, 100), xl = o.xl, xr = o.xr;
    if (o.kerbL) s += block(-20, -20, xl, 120, 0) + solid(xl + 2.8, 100, xl + 2.8, 16, C.yellow);
    else s += solid(xl, 100, xl, 16);
    if (o.kerbR) s += block(xr, -20, 120, 120, 0) + solid(xr - 2.8, 100, xr - 2.8, 16);
    else s += solid(xr, 100, xr, 16);
    s += stopBar(o.kerbL ? xl : 0, o.kerbR ? xr : 100, 13.5);
    s += laneArrow(kind, (xl + xr) / 2 + (o.kerbL ? 1.4 : 0) - (o.kerbR ? 1.4 : 0), o.ay || 90, o.as || 1.1);
    return s;
  }
  reg('mk-arrow-straight', 'سهم إلى الأمام', function (o, label) {
    return tile(arrowLane('straight', { xl: 26, xr: 74, ay: 89, as: 1.12 }), label);
  });
  reg('mk-arrow-left', 'سهم إلى اليسار', function (o, label) {
    return tile(arrowLane('left', { xl: 12, xr: 64, kerbL: true, ay: 88, as: 1.3 }), label);
  });
  reg('mk-arrow-right', 'سهم إلى اليمين', function (o, label) {
    return tile(arrowLane('right', { xl: 36, xr: 88, kerbR: true, ay: 88, as: 1.3 }), label);
  });
  reg('mk-arrow-straight-left', 'سهم إلى الأمام واليسار', function (o, label) {
    return tile(arrowLane('straight-left', { xl: 22, xr: 78, ay: 89, as: 1.12 }), label);
  });
  reg('mk-arrow-straight-right', 'سهم إلى الأمام واليمين', function (o, label) {
    return tile(arrowLane('straight-right', { xl: 22, xr: 78, ay: 89, as: 1.12 }), label);
  });

  reg('mk-arrow-merge', 'أسهم الانتقال (المسار ينتهي)', function (o, label) {
    var s = asphalt(12, 0, 88, 100) + block(-10, -10, 12, 110, 0);
    var edge = [[88, 110], [88, 46], [62.67, 2], [62.67, -10]];
    s += area([[88, 110], [88, 46], [62.67, 2], [62.67, -10], [110, -10], [110, 110]], C.ground);
    s += kerbAlong(edge.map(function (p) { return [p[0] + KW / 2, p[1]]; }));
    s += broken(37.33, 100, 37.33, 0, C.white, 2) + broken(62.67, 100, 62.67, 6, C.white, 2);
    s += laneArrow('veer-left', 75.3, 97, 0.68) + laneArrow('veer-left', 72.6, 53, 0.56);
    return tile(s, label);
  });

  // desert highway with an exit on the right: barrier, yellow left edge, 3 lanes x 3.2..52.7 (16.5 each);
  // E is the exit lane's left edge from the bottom up, the exit lane is 16.5 wide to its right
  var X0 = 3.2, XL = 52.7, XW = 16.5;
  function exitEdge(tipY, c1, c2, end) {
    var cv = bez([XL, tipY], c1, c2, end, 16), n = cv.length, a = cv[n - 2], b = cv[n - 1];
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy);
    cv.push([b[0] + dx / l * 40, b[1] + dy / l * 40]);          // run on past the tile edge
    return [[XL, 114], [XL, tipY]].concat(cv.slice(1));
  }
  function mainRoad(dash) {
    return area(boxPts(0, 0, X0, 100), C.kerb) + asphalt(X0, 0, XL, 100) + solid(X0 + 3.2, 100, X0 + 3.2, 0, C.yellow) +
      broken(X0 + XW, 100, X0 + XW, 0, C.white, dash || 3) + broken(X0 + 2 * XW, 100, X0 + 2 * XW, 0, C.white, dash || 3);
  }
  function upper(E, tipY) { return E.filter(function (p) { return p[1] <= tipY + 0.01; }); }

  reg('mk-arrow-exit', 'أسهم مسار التباطؤ قبل المخرج', function (o, label) {
    var tip = 26, taper = 84, E = exitEdge(tip, [XL, 14], [58, 6], [66, -4]);
    var RB = [[XL, 101], [XL + XW, taper]].concat(offsetPts(E, -XW).filter(function (p) { return p[1] < taper; }));
    var s = mainRoad(5);
    s += area([[XL, 101]].concat(E.filter(function (p) { return p[1] < 101; }), RB.slice().reverse()), C.asphalt);
    s += broken(XL, 100, XL, tip, C.white, 0, 3.2, [4.5, 3.5]) + solid(XL, tip, XL, 0);
    s += path(pl(trim(upper(E, tip))), 'none', { stroke: C.white, sw: LW });
    s += path(pl(trim(offsetPts(RB, 1.2))), 'none', { stroke: C.white, sw: LW });
    s += laneArrow('veer-right', XL + XW / 2, 80, 0.48) + laneArrow('veer-right', XL + XW / 2, 53, 0.48);
    return tile(s, label, true);
  });

  // ---------- painted areas
  reg('mk-yellow-box', 'الصندوق الأصفر', function (o, label) {
    // crossroads: north-south road x 30..70, east-west road y 42..74, box over the junction
    var s = asphalt(30, 0, 70, 100) + asphalt(0, 42, 100, 74);
    s += block(-10, -10, 30, 42, [0, 0, 6, 0]) + block(70, -10, 110, 42, [0, 0, 0, 6]) +
      block(-10, 74, 30, 110, [0, 6, 0, 0]) + block(70, 74, 110, 110, [6, 0, 0, 0]);
    s += solid(50, 0, 50, 39, C.yellow) + solid(50, 77, 50, 100, C.yellow) + solid(0, 58, 27, 58, C.yellow) + solid(73, 58, 100, 58, C.yellow);
    s += rect(50, 75.5, 20, 4, C.white) + rect(30, 36.5, 20, 4, C.white) + rect(25.5, 58, 4, 16, C.white) + rect(70.5, 42, 4, 16, C.white);
    var box = boxPts(33.5, 45, 66.5, 71);
    s += hatch(box, 45, 6.1, C.yellow, 1.7, 2) + hatch(box, -45, 6.1, C.yellow, 1.7, 2);
    s += rect(33.5, 45, 33, 26, 'none', { stroke: C.yellow, sw: 2.4 });
    s += car(60, 13.5, 18, { c: C.red }) + car(60, 34.3, 18, { c: C.blue });
    s += car(60, 90, 18, { me: true });
    s += signal(80.5, 87, 0.7, 'g');
    return tile(s, label);
  });

  reg('mk-hatched', 'المنطقة المخططة بخطوط مائلة', function (o, label) {
    var s = street(14, 86);
    var dia = [[50, 97], [61, 62], [50, 27], [39, 62]];
    s += hatch(dia, -45, 4.6, C.white, 1.8);
    s += poly(dia, 'none', { stroke: C.white, sw: LW });
    s += solid(50, 100, 50, 97, C.yellow);
    s += solid(39, 29, 39, 0, C.yellow) + broken(61, 29, 61, 0, C.white, 3);
    s += laneArrow('left', 50, 25, 0.36);
    return tile(s, label);
  });

  reg('mk-chevron', 'علامة الشيفرون عند تفرع المخرج', function (o, label) {
    var tip = 86, E = exitEdge(tip, [XL, 60], [64, 30], [88, -4]), up = upper(E, tip);
    var s = mainRoad();
    s += area(E.concat(offsetPts(E, -XW).reverse()), C.asphalt);
    s += area([[XL, tip]].concat(up, [[XL, -4]]), C.asphalt);
    // chevrons pointing in the direction of travel, apex on the gore's centre line
    var k = Math.SQRT1_2, ch = '';
    for (var ya = 80; ya > -40; ya -= 8.2) {
      var xr = hit([XL, ya], [1, 0], E);
      if (!xr || xr[0] - XL < 4) continue;
      var a = [(XL + xr[0]) / 2, ya], l = [XL, ya + (a[0] - XL)], r = hit(a, [k, k], E);
      [l, r].forEach(function (e) {
        if (!e) return;
        var sg = segIn(a, e, TILE);
        if (sg.length) ch += 'M' + f(sg[0][0]) + ' ' + f(sg[0][1]) + 'L' + f(sg[1][0]) + ' ' + f(sg[1][1]);
      });
    }
    s += path(ch, 'none', { stroke: C.white, sw: 2.4 });
    s += broken(XL, 100, XL, tip, C.white, 0, 3.2, [4.5, 3.5]) + solid(XL, tip, XL, 0);
    s += path(pl(trim(up)), 'none', { stroke: C.white, sw: LW });
    s += path(pl(trim(offsetPts(E, -XW + 1.2))), 'none', { stroke: C.white, sw: LW });
    return tile(s, label, true);
  });

  reg('mk-keep-clear', 'أبق المدخل خاليا', function (o, label) {
    var s = asphalt(14, 0, 76, 100) + asphalt(70, 36, 110, 60);
    s += block(-10, -10, 14, 110, 0) + block(76, -10, 110, 36, [0, 0, 0, 5]) + block(76, 60, 110, 110, [5, 0, 0, 0]);
    s += broken(45, 100, 45, 0, C.white, 2);
    s += rect(47.6, 37.2, 27, 21.6, 'none', { stroke: C.yellow, sw: 2.6 });
    s += car(61, 17, 22, { c: C.blue });
    s += car(61, 74, 22, { me: true });
    return tile(s, label);
  });

  reg('mk-bus-lane', 'مسار الحافلات الأحمر', function (o, label) {
    var s = street(12, 88) + asphalt(62.67, 0, 88, 100, C.busLane);
    s += broken(37.33, 100, 37.33, 0, C.white, 2) + solid(62.67, 100, 62.67, 0);
    s += bus(75.3, 44, 54);
    s += car(24.67, 28, 23, { c: C.red }) + car(50, 72, 23, { me: true });
    return tile(s, label);
  });

  reg('mk-bus-stop', 'علامة موقف الحافلات', function (o, label) {
    var s = street(8, 84);
    s += broken(40, 100, 40, 0, C.white, 2);
    s += rect(68.8, 6, 14, 88, 'none', { stroke: C.white, sw: 2.2 });
    s += bus(75.8, 36, 50);
    s += rect(88.6, 22, 8.6, 30, '#6F8196', { rx: 1.2, stroke: '#A9B6C4', sw: 0.8 }) + rect(90.2, 24, 2, 26, '#4E5D6E');
    return tile(s, label);
  });

  // ---------- devices
  reg('mk-rumble-strips', 'أشرطة الاهتزاز', function (o, label) {
    // roundabout at the top (centre above the tile), two entry lanes x 22..78, give-way line at y 32
    var cx = 50, cy = -20, R = 48, a0 = Math.atan2(19 + 20, 22 - cx) * 180 / Math.PI;
    var s = area(arcPts(cx, cy, R, 0, 360, 6), C.asphalt) + asphalt(22, 12, 78, 100);
    var left = [[22, 112], [22, 19]].concat(arcPts(cx, cy, R, a0, 172, 6).slice(1));
    var right = [[78, 112], [78, 19]].concat(arcPts(cx, cy, R, 180 - a0, 8, 6).slice(1));
    s += kerbAlong(offsetPts(left, KW / 2)) + kerbAlong(offsetPts(right, -KW / 2));
    s += area(arcPts(cx, cy, 28, 0, 360, 8), C.kerb) + area(arcPts(cx, cy, 28 - KW, 0, 360, 8), '#3E5B3A');
    s += broken(22, 32, 78, 32, C.white, 0, 3, [4.3, 4.3]);
    s += broken(50, 100, 50, 37, C.white, 4);
    var st = '';
    [49.4, 66.8, 90].forEach(function (y) {
      for (var i = 0; i < 5; i++) st += 'M22 ' + f(y - 6.6 + i * 2.9) + 'h56v1.6h-56Z';
    });
    s += path(st, C.yellow);
    return tile(s, label);
  });

  reg('mk-speed-hump', 'علامة المطب', function (o, label) {
    var s = street(12, 84);
    s += asphalt(12, 38, 84, 60, '#3B414B');
    s += solid(17, 100, 17, 60) + solid(17, 38, 17, 0) + solid(79, 100, 79, 60) + solid(79, 38, 79, 0);
    s += broken(48, 100, 48, 64, C.white, 3) + broken(48, 34, 48, 0, C.white, 3);
    [42, 49, 56].forEach(function (y, i) { s += broken(12, y, 84, y, C.yellow, i === 1 ? 5 : 0, 3, [5, 5]); });
    s += warnSign(92, 75, 6, path('M88.9 77.4Q92 73.2 95.1 77.4Z', '#151515'));
    return tile(s, label);
  });

  reg('mk-road-studs', 'العواكس الأرضية (عيون القطط)', function (o, label) {
    var tip = 40, E = exitEdge(tip, [XL, 22], [62, 8], [74, -4]), up = upper(E, tip);
    var s = area(boxPts(0, 0, X0, 100), C.kerb) + asphalt(X0, 0, XL, 100, C.asphaltDark);
    s += area(E.concat(offsetPts(E, -XW).reverse()), C.asphaltDark);
    s += solid(X0 + 3.2, 100, X0 + 3.2, 0) + broken(X0 + XW, 100, X0 + XW, 0, C.white, 3) + broken(X0 + 2 * XW, 100, X0 + 2 * XW, 0, C.white, 3);
    s += broken(XL, 100, XL, tip, C.white, 0, 3.2, [4.5, 3.5]) + solid(XL, tip, XL, 0);
    s += path(pl(trim(up)), 'none', { stroke: C.white, sw: LW });
    var RE = offsetPts(E, -XW + 1.2);
    s += path(pl(trim(RE)), 'none', { stroke: C.white, sw: LW });
    s += rect(0, 0, 100, 100, '#0B1019', { rx: 8, op: 0.5 });          // night
    var glow = {}, core = {};
    function stud(x, y, col) {
      if (y < 2.6 || y > 97.4) return '';
      glow[col] = (glow[col] || '') + 'M' + f(x - 2.5) + ' ' + f(y) + 'a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0Z';
      core[col] = (core[col] || '') + 'M' + f(x - 1.05) + ' ' + f(y - 0.8) + 'h2.1v1.6h-2.1Z';
      return '';
    }
    [X0 + XW, X0 + 2 * XW].forEach(function (x) { for (var y = 88; y > 0; y -= 21) s += stud(x, y, '#FFFFFF'); });
    for (var y = 95; y > 0; y -= 10.5) s += stud(X0 + 5.8, y, '#FFFFFF');
    for (var y2 = 5; y2 < tip; y2 += 10.5) s += stud(XL - 2.6, y2, '#FFFFFF');
    RE.forEach(function (p, i) { if (i % 3 === 1) s += stud(p[0] - 2.6, p[1], '#FFFFFF'); });
    [46, 55, 64, 73].forEach(function (y) { s += stud(XL, y, '#43D67F'); });
    for (var k in glow) s += path(glow[k], k, { op: 0.32 }) + path(core[k], k);
    return tile(s, label, true);
  });

  // ---------- parking
  reg('mk-disabled-bay', 'موقف أصحاب الهمم', function (o, label) {
    var s = asphalt(0, 22, 100, 100) + block(-10, -10, 110, 22, 0);
    [8, 29, 50, 71, 92].forEach(function (x) { s += rect(x - 1.1, 22, 2.2, 50, C.white); });
    s += rect(52.6, 36, 15.8, 15.8, C.sBlue, { rx: 1 });
    s += glyphOr('wheelchair', { x: 54.4, y: 37.4, w: 12.2, h: 13, fill: C.white }, circ(60.5, 44, 5, C.white));
    s += wheelchairSign(60.5, 11, 12);
    return tile(s, label);
  });
})();
