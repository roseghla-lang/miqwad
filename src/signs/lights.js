/* مقود: traffic lights, lane-control signals, pedestrian lights, police hand signals, emergency vehicles and the
 * school bus (the tl-, ls-, pl-, po- and ev- items of content/markings.json).
 * Two small local kits keep each family consistent:
 *  - front views (docs/drawing.md 5.3): dusk or night panel, one signal-head style, lamps with halos, flashing
 *    shown as short radiating strokes, overhead gantries, and one traffic-officer figure (front or rear view);
 *  - top-down scenes (docs/drawing.md 5.2): rounded ground tile, north up, our car white with a gold outline,
 *    emergency vehicles with a red + blue light bar, the school bus with its STOP arm on its LEFT side.
 * UAE right-hand traffic throughout: the U-turn arrow turns left, roundabouts run anticlockwise.
 * Drawn from scratch, see docs/drawing.md */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }
  function pic(inner, label) { return K.svg(inner, '0 0 100 100', label); }

  // ================================================================ SVG helpers
  function n(v) { v = Math.round(v * 100) / 100; return String(v === 0 ? 0 : v); }
  function P2(p) { return n(p[0]) + ',' + n(p[1]); }
  function attrs(o) {
    if (!o) return '';
    var s = '';
    if (o.stroke) s += ' stroke="' + o.stroke + '" stroke-width="' + n(o.sw == null ? 1 : o.sw) + '"';
    if (o.cap) s += ' stroke-linecap="' + o.cap + '"';
    if (o.join) s += ' stroke-linejoin="' + o.join + '"';
    if (o.dash) s += ' stroke-dasharray="' + o.dash + '"';
    if (o.op != null) s += ' opacity="' + n(o.op) + '"';
    if (o.eo) s += ' fill-rule="evenodd"';
    if (o.tf) s += ' transform="' + o.tf + '"';
    return s;
  }
  function rect(x, y, w, h, r, fill, o) {
    return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '"' +
      (r ? ' rx="' + n(r) + '"' : '') + ' fill="' + fill + '"' + attrs(o) + '/>';
  }
  function circ(cx, cy, r, fill, o) {
    return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="' + fill + '"' + attrs(o) + '/>';
  }
  function ell(cx, cy, rx, ry, fill, o) {
    return '<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' + fill + '"' +
      attrs(o) + '/>';
  }
  function path(d, fill, o) { return '<path d="' + d + '" fill="' + fill + '"' + attrs(o) + '/>'; }
  function poly(pts, fill, o) { return '<polygon points="' + pts.map(P2).join(' ') + '" fill="' + fill + '"' + attrs(o) + '/>'; }
  function line(x1, y1, x2, y2, col, w, o) {
    o = o || {};
    return '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke="' + col +
      '" stroke-width="' + n(w) + '" stroke-linecap="' + (o.cap || 'round') + '"' +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + (o.op != null ? ' opacity="' + n(o.op) + '"' : '') + '/>';
  }
  function stroke(d, col, w, o) {
    o = o || {};
    return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + n(w) + '" stroke-linecap="' +
      (o.cap || 'round') + '" stroke-linejoin="' + (o.join || 'round') + '"' +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + (o.op != null ? ' opacity="' + n(o.op) + '"' : '') + '/>';
  }
  function grp(inner, tf, op) {
    return '<g' + (tf ? ' transform="' + tf + '"' : '') + (op != null ? ' opacity="' + n(op) + '"' : '') + '>' + inner + '</g>';
  }
  function M(pts) { return 'M' + pts.map(P2).join('L'); }
  function dir(a) { var r = a * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; }
  function add(p, d, k) { return [p[0] + d[0] * k, p[1] + d[1] * k]; }
  // circular arc as a path fragment starting with M (screen degrees: 0 = east, 90 = south)
  function arcD(cx, cy, r, a0, a1) {
    var p0 = add([cx, cy], dir(a0), r), p1 = add([cx, cy], dir(a1), r), sp = a1 - a0;
    return 'M' + P2(p0) + 'A' + n(r) + ',' + n(r) + ' 0 ' + (Math.abs(sp) > 180 ? 1 : 0) + ' ' + (sp > 0 ? 1 : 0) + ' ' + P2(p1);
  }
  function rgb(h) { var v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }
  function hex(c) {
    return '#' + c.map(function (v) {
      v = Math.max(0, Math.min(255, Math.round(v)));
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('').toUpperCase();
  }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hex([0, 1, 2].map(function (i) { return A[i] + (B[i] - A[i]) * t; })); }
  function shade(h, k) { return k < 0 ? mix(h, '#000000', -k) : mix(h, '#FFFFFF', k); }
  // rounded tile helpers (the tile has rx 8): a band from y to the bottom, and the tile outline itself
  function tile(fill) { return rect(0, 0, 100, 100, 8, fill); }
  function lowBand(y, fill, o) { return path('M0,' + n(y) + 'H100V92A8,8 0 0 1 92,100H8A8,8 0 0 1 0,92Z', fill, o); }

  // straight or cubic arrow with a solid triangular head at the end (tile units)
  function arrowPath(pts, col, o) {
    o = o || {};
    var sw = o.sw || 1.9, hl = o.hl || sw * 2.5, hw = o.hw || sw * 2.7;
    var e = pts[pts.length - 1], pr = pts[pts.length - 2];
    var dx = e[0] - pr[0], dy = e[1] - pr[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= l; dy /= l;
    var b = [e[0] - dx * hl, e[1] - dy * hl], q = pts.slice();
    q[q.length - 1] = [b[0] + dx * 0.5, b[1] + dy * 0.5];
    var d;
    if (o.curve) {
      q[2] = [q[2][0] - dx * hl * 0.6, q[2][1] - dy * hl * 0.6];
      d = 'M' + P2(q[0]) + 'C' + P2(q[1]) + ' ' + P2(q[2]) + ' ' + P2(q[3]);
    } else d = M(q);
    var s = stroke(d, col, sw, { dash: o.dash, cap: o.dash ? 'butt' : 'round', op: o.op });
    return s + poly([e, [b[0] - dy * hw / 2, b[1] + dx * hw / 2], [b[0] + dy * hw / 2, b[1] - dx * hw / 2]], col,
      o.op != null ? { op: o.op } : null);
  }
  function arrowC(p0, c1, c2, p3, col, o) { o = o || {}; o.curve = true; return arrowPath([p0, c1, c2, p3], col, o); }
  function dblArrow(x0, x1, y, col, sw) {
    var hl = sw * 2.4, hw = sw * 2.7;
    return line(x0 + hl * 0.8, y, x1 - hl * 0.8, y, col, sw) +
      poly([[x0, y], [x0 + hl, y - hw / 2], [x0 + hl, y + hw / 2]], col) +
      poly([[x1, y], [x1 - hl, y - hw / 2], [x1 - hl, y + hw / 2]], col);
  }

  // ================================================================ front views (docs/drawing.md 5.3)
  var FV = {
    sky: '#2B3445', ground: '#252C38', night: '#141A26', road: '#2E343E',
    housing: '#15181D', edge: '#5A6475', visor: '#262B33', face: '#181B20',
    red: '#E5352B', amber: '#F5A623', green: '#2FC36B', blue: '#3D7BFF', off: '#2A2F37',
    pole: '#9AA3AE', poleD: '#6E7783', gold: '#D9B978', ink: '#EAE6DB', led: '#0D0F12', white: '#F2F2EE'
  };
  var SIGN = { red: '#C8202A', blue: '#1F5AA6', yellow: '#F5C400', orange: '#F07F1A' };
  function dusk(gy) { return tile(FV.sky) + (gy != null ? lowBand(gy, FV.ground) : ''); }
  function nightPanel(h) {
    return tile(FV.night) + lowBand(h - 14, '#18202E') + lowBand(h - 6, '#1E2738') + lowBand(h, '#0E131B');
  }
  function tint(col, k) { return mix(FV.off, col, k == null ? 0.2 : k); }
  function glow(cx, cy, r, col) { return circ(cx, cy, r * 1.62, col, { op: 0.15 }) + circ(cx, cy, r * 1.3, col, { op: 0.25 }); }
  function rays(cx, cy, r0, r1, col, angs, w) {
    return angs.map(function (a) {
      var d = dir(a);
      return line(cx + d[0] * r0, cy + d[1] * r0, cx + d[0] * r1, cy + d[1] * r1, col, w || 2.2);
    }).join('');
  }
  var SIDE = [-38, 0, 38, 142, 180, 218], ALL8 = [0, 45, 90, 135, 180, 225, 270, 315];
  // hood over a round lamp, seen from the front: a dark band around the top half
  function visor(cx, cy, r) {
    var a = r + 0.6, b = r + 2.6;
    return path('M' + n(cx - b) + ',' + n(cy + 1) + 'A' + n(b) + ',' + n(b) + ' 0 0 1 ' + n(cx + b) + ',' + n(cy + 1) +
      'H' + n(cx + a) + 'A' + n(a) + ',' + n(a) + ' 0 0 0 ' + n(cx - a) + ',' + n(cy + 1) + 'Z', FV.visor);
  }
  var LAMP_ARROW = {
    straight: { len: 60, sw: 17, hw: 42, hl: 27 },
    'uturn-left': { sw: 15.5, hw: 38, hl: 24, a: 26, r: 13, b: 6 }
  };
  // one lamp of a signal head: a ball, or an arrow on a black lens ({arrow: kind, rot})
  function lamp(cx, cy, r, col, lit, o) {
    o = o || {};
    var s = visor(cx, cy, r);
    if (lit) s += glow(cx, cy, r, col);
    if (!o.arrow) {
      s += circ(cx, cy, r, lit ? col : tint(col));
      s += circ(cx - r * 0.32, cy - r * 0.34, r * 0.34, '#FFFFFF', { op: lit ? 0.3 : 0.05 });
    } else {
      var a = r * 0.72;
      s += circ(cx, cy, r, FV.face) + (lit ? circ(cx, cy, r, col, { op: 0.13 }) : '');
      s += K.arrow(o.arrow, { x: cx - a, y: cy - a, w: 2 * a, h: 2 * a, rot: o.rot, fill: lit ? col : tint(col, 0.3),
        p: LAMP_ARROW[o.arrow] });
    }
    return s;
  }
  // vertical signal head, one housing style for every head in this file
  function head(cx, top, lamps, o) {
    o = o || {};
    var r = o.r || 10.5, gap = o.gap || 28, w = o.w || (2 * r + 8), pad = r + 4.2, fl = '';
    var h = 2 * pad + gap * (lamps.length - 1);
    var s = rect(cx - w / 2, top, w, h, 5, FV.housing, { stroke: FV.edge, sw: 1.3 });
    lamps.forEach(function (L, i) {
      var cy = top + pad + i * gap;
      s += lamp(cx, cy, r, L.c, L.lit, L);
      if (L.flash) fl += rays(cx, cy, r + 5, r + 10.5, L.c, SIDE, 2.4);
    });
    return s + fl;
  }
  var R3 = function (lit, flash) {           // red, amber, green balls
    return [{ c: FV.red, lit: lit === 0, flash: flash && lit === 0 }, { c: FV.amber, lit: lit === 1, flash: flash && lit === 1 },
      { c: FV.green, lit: lit === 2, flash: flash && lit === 2 }];
  };

  // pedestrian signal: red standing figure on top, green walking figure below, square lenses
  function pedHead(top, bottom, flash) {
    var s = rect(30, 5, 40, 90, 5, FV.housing, { stroke: FV.edge, sw: 1.3 }), fl = '';
    [[9.5, FV.red, top, 'person-standing'], [51.5, FV.green, bottom, 'person-walk']].forEach(function (f, i) {
      var y = f[0], col = f[1], lit = f[2], fx = 34.5, fw = 31, fh = 39;
      s += rect(fx - 1.2, y - 2.6, fw + 2.4, 3, 1.2, FV.visor);
      if (lit) s += rect(fx - 3.5, y - 3.5, fw + 7, fh + 7, 7, col, { op: 0.16 }) + rect(fx - 1.6, y - 1.6, fw + 3.2, fh + 3.2, 5, col, { op: 0.22 });
      s += rect(fx, y, fw, fh, 3.5, FV.face) + (lit ? rect(fx, y, fw, fh, 3.5, col, { op: 0.12 }) : '');
      var gh = 31, box = f[3] === 'person-walk' ? { x: 50 - 9.4, y: y + 4, w: 18.8, h: gh } : { x: 50 - 6, y: y + 4, w: 12, h: gh };
      box.fill = lit ? col : tint(col, 0.3);
      s += K.glyph(f[3], box);
      if (flash && i === 1 && lit) fl += rays(50, y + fh / 2, 21, 27, col, SIDE, 2.4);
    });
    return s + fl;
  }

  // overhead gantry: truss beam and posts
  function beam(y, x0, x1) {
    var d = '', k = 0;
    for (var x = x0 + 1.5; x <= x1 - 1.5; x += 5.5) { d += (k ? 'L' : 'M') + n(x) + ',' + n(k % 2 ? y + 1.6 : y + 8.4); k++; }
    return stroke(d, FV.poleD, 1.2) + rect(x0, y, x1 - x0, 2.4, 0.6, FV.pole) + rect(x0, y + 7.6, x1 - x0, 2.4, 0.6, FV.pole);
  }
  function post(x, y0, y1) { return rect(x, y0, 5, y1 - y0, 0.8, FV.pole) + rect(x + 3.3, y0, 1.7, y1 - y0, 0, FV.poleD); }
  function ledPanel(x, y, w, h, hang) {
    var s = '';
    if (hang) s += rect(x + w * 0.22 - 0.8, y - hang, 1.6, hang + 0.5, 0, FV.poleD) + rect(x + w * 0.78 - 0.8, y - hang, 1.6, hang + 0.5, 0, FV.poleD);
    return s + rect(x, y, w, h, 2.2, FV.led, { stroke: '#3C4552', sw: 1.2 });
  }
  function ledX(cx, cy, a, col) {
    var d = 'M' + n(cx - a) + ',' + n(cy - a) + 'L' + n(cx + a) + ',' + n(cy + a) +
      'M' + n(cx + a) + ',' + n(cy - a) + 'L' + n(cx - a) + ',' + n(cy + a);
    return circ(cx, cy, a * 1.45, col, { op: 0.1 }) + stroke(d, col, a * 0.95, { op: 0.22 }) + stroke(d, col, a * 0.5);
  }
  function ledDown(cx, cy, a, col) {
    return circ(cx, cy, a * 1.45, col, { op: 0.1 }) +
      K.arrow('straight', { x: cx - a, y: cy - a, w: 2 * a, h: 2 * a, rot: 180, fill: col, p: { len: 60, sw: 19, hw: 46, hl: 28 } });
  }
  // road seen from the driver's seat below a gantry: lines given at y0 converge to (50, vy)
  function roadAhead(y0, vy, xs, o) {
    o = o || {};
    function at(x, y) { return 50 + (x - 50) * (y - vy) / (y0 - vy); }
    function yAt(x, xe) { return vy + (y0 - vy) * (xe - 50) / (x - 50); }          // y where the line through x meets xe
    var xl = xs[0], xr = xs[xs.length - 1];
    var yl = yAt(xl, 0), yr = yAt(xr, 100);
    var d = 'M' + n(xl) + ',' + n(y0) + 'L' + n(xr) + ',' + n(y0) + 'L100,' + n(yr) + 'V92A8,8 0 0 1 92,100H8A8,8 0 0 1 0,92V' + n(yl) + 'Z';
    var s = path(d, o.fill || FV.road);
    xs.forEach(function (x, i) {
      var edge = i === 0 || i === xs.length - 1, xe = at(x, 100), x2 = xe, y2 = 100;
      if (xe < 0) { x2 = 0; y2 = yAt(x, 0); } else if (xe > 100) { x2 = 100; y2 = yAt(x, 100); }
      if (y2 > 90 && (x2 < 9 || x2 > 91)) {     // keep the stroke out of the rounded corners
        var t = (90 - y0) / (y2 - y0); x2 = x + (x2 - x) * t; y2 = 90;
      }
      var col = edge ? (i === 0 ? '#E3B92E' : FV.white) : FV.white;
      s += line(x, y0, x2, y2, col, edge ? 1.3 : 1.1, edge ? { cap: 'butt' } : { dash: '5 5', cap: 'butt' });
    });
    return s;
  }

  // ================================================================ traffic officer (front or rear view)
  // Figure space: centre x 0, cap top y 0, soles y 100. Arms are given in screen degrees for the arm on the
  // viewer's left (vl) and on the viewer's right (vr): 0 = pointing right, 90 = down, -90 = up, 180 = left.
  // Front view: the officer's RIGHT arm is on the viewer's LEFT. Rear view: his right arm is on the viewer's right.
  var OFC = {
    day: { skin: '#C68E62', skinD: '#A2704B', palm: '#E6BA94', hair: '#2B231E', cap: '#27324A', capBand: '#11161F',
      peak: '#0A0D12', badge: '#D9B978', shirt: '#D2C4A0', shirtD: '#B3A580', tie: '#2C3444', vest: '#C9DB3C',
      band: '#E8EDF0', belt: '#23262C', trousers: '#7B7257', shoe: '#121418', line: '#0E1219', eye: '#2A1D16' },
    night: { skin: '#8E6547', skinD: '#74523A', palm: '#A87F5F', hair: '#1C1714', cap: '#1C2535', capBand: '#0C1017',
      peak: '#07090D', badge: '#A8905E', shirt: '#958C74', shirtD: '#7A735F', tie: '#1E2430', vest: '#A8BA34',
      band: '#F4F7F9', belt: '#17191E', trousers: '#4F4A3A', shoe: '#0B0C0F', line: '#06080C', eye: '#1A120E' }
  };
  var SHX = 13.2, SHY = 33, UA = 17.5, FA = 16;
  function armGeo(side, a) {
    var S = [side * SHX, SHY], E = add(S, dir(a.a1), UA * (a.k1 || 1)), W = add(E, dir(a.a2), FA * (a.k2 || 1));
    return { S: S, E: E, W: W };
  }
  function handAt(W, a, c, side) {
    var kind = a.hand || 'relaxed';
    if (kind === 'lamp') return lampAt(W, a, c);
    var ang = a.ha == null ? a.a2 : a.ha, th = a.thumb || -side, s = '', w = kind === 'relaxed' ? 2.7 : 3.2;
    if (kind !== 'relaxed') {
      s += ell(th * 3.1, -3.3, 1.5, 2.8, c.skinD, { stroke: c.line, sw: 0.45,
        tf: 'rotate(' + n(th * 24) + ' ' + n(th * 3.1) + ' -3.3)' });
    }
    s += path('M' + n(-w) + ',0.8L' + n(-w) + ',-5.8Q' + n(-w) + ',-9.8 0,-9.8Q' + n(w) + ',-9.8 ' + n(w) + ',-5.8L' + n(w) + ',0.8Z',
      c.skin, { stroke: c.line, sw: 0.45 });
    if (kind === 'palm') {
      s += ell(0, -3.2, 2.15, 2.6, c.palm) + stroke('M-1.1,-9.2V-6.3M1.1,-9.2V-6.3', c.skinD, 0.5);
    } else if (kind === 'back') {
      s += stroke('M-2.3,-5.4Q0,-6.2 2.3,-5.4', c.skinD, 0.55) + stroke('M-1.1,-9.2V-6.6M1.1,-9.2V-6.6', c.skinD, 0.45);
    }
    return grp(s, 'translate(' + n(W[0]) + ' ' + n(W[1]) + ') rotate(' + n(ang + 90) + ')');
  }
  // baton torch held in the fist, lit red, pointing along a.la
  function lampAt(W, a, c) {
    var d = dir(a.la), L = 14, t0 = add(W, d, 4.6), t1 = add(W, d, L), mid = add(W, d, (4.6 + L) / 2), s = '';
    s += circ(mid[0], mid[1], 12, FV.red, { op: 0.13 }) + circ(mid[0], mid[1], 7.8, FV.red, { op: 0.25 });
    s += stroke(M([W, t0]), '#3A3F47', 4.3, { cap: 'butt' });
    s += stroke(M([t0, t1]), FV.red, 4.6) + stroke(M([add(W, d, 6.4), add(W, d, L - 1.6)]), '#FFA196', 1.6);
    s += circ(W[0], W[1], 3.6, c.skin, { stroke: c.line, sw: 0.45 });
    return s;
  }
  function drawArm(side, a, c) {
    var g = armGeo(side, a), d = M([g.S, g.E, g.W]);
    var s = stroke(d, c.line, 10) + stroke(d, c.shirt, 8.4) + handAt(g.W, a, c, side);
    return a.op != null ? grp(s, '', a.op) : s;
  }
  function officer(o) {
    var c = o.night ? OFC.night : OFC.day, rear = o.view === 'rear', s = '';
    // legs and shoes
    s += path('M-12.4,59.6L12.4,59.6L10.8,94.6L2.3,94.6L1.2,67.4L-1.2,67.4L-2.3,94.6L-10.8,94.6Z', c.trousers);
    s += rect(-11.9, 93.2, 10.1, 6.8, 2.6, c.shoe) + rect(1.8, 93.2, 10.1, 6.8, 2.6, c.shoe);
    // shirt torso with the shoulders
    s += path('M-4.6,27.3L-12.4,29.3Q-16.4,30.3 -16.4,35L-14.4,60.2L14.4,60.2L16.4,35Q16.4,30.3 12.4,29.3L4.6,27.3Z', c.shirt);
    // reflective vest: braces in front, an X on the back, two bands round the waist
    if (!rear) {
      s += path('M-4.6,28.2L-10.6,30Q-12.9,30.7 -13.1,33.4L-13.4,59.3L13.4,59.3L13.1,33.4Q12.9,30.7 10.6,30L4.6,28.2L0,39.2Z', c.vest);
      s += path('M-1.3,29L1.3,29L1.7,31.2L1.1,37.2L0,38.8L-1.1,37.2L-1.7,31.2Z', c.tie);
      s += path('M-4.6,27.3L-1.2,29.1L-2.9,31.6Z', c.shirtD) + path('M4.6,27.3L1.2,29.1L2.9,31.6Z', c.shirtD);
      s += poly([[-10.4, 30.1], [-7.3, 29.2], [-7.3, 47.2], [-10.4, 47.2]], c.band) + poly([[10.4, 30.1], [7.3, 29.2], [7.3, 47.2], [10.4, 47.2]], c.band);
    } else {
      s += path('M-5.2,27.7Q0,29.1 5.2,27.7L10.6,30Q12.9,30.7 13.1,33.4L13.4,59.3L-13.4,59.3L-13.1,33.4Q-12.9,30.7 -10.6,30Z', c.vest);
      s += stroke('M-9.6,30.8L9.6,47.2M9.6,30.8L-9.6,47.2', c.band, 3.1, { cap: 'butt' });
      s += path('M-5.3,26.2Q0,27.6 5.3,26.2L5.5,28.4Q0,29.8 -5.5,28.4Z', c.shirtD);
    }
    s += rect(-13.4, 47.2, 26.8, 3.1, 0, c.band) + rect(-13.4, 52.6, 26.8, 3.1, 0, c.band);
    s += rect(-13.7, 58.4, 27.4, 3.8, 0.8, c.belt) + (rear ? '' : rect(-2.2, 58.9, 4.4, 2.8, 0.6, c.badge));
    // neck and head
    s += rect(-3.6, 21.4, 7.2, 7.4, 2, c.skinD);
    s += ell(-7.1, 17.2, 1.7, 2.7, c.skinD) + ell(7.1, 17.2, 1.7, 2.7, c.skinD);
    s += ell(0, 16.3, 7.1, 8.6, c.skin);
    if (!rear) {
      s += circ(-2.7, 16.4, 0.95, c.eye) + circ(2.7, 16.4, 0.95, c.eye);
      s += path('M-3.3,21.2Q0,19.7 3.3,21.2Q0,22.5 -3.3,21.2Z', c.hair);
    } else {
      s += path('M-7.3,10.5L7.3,10.5C7.6,15.6 7.1,20 4.7,22Q0,23.8 -4.7,22C-7.1,20 -7.6,15.6 -7.3,10.5Z', c.hair);
    }
    // peaked cap
    s += path('M-8.3,9.7C-10.2,7.2 -12.4,3.6 -11.5,2C-10.4,0.2 -4.4,0 0,0C4.4,0 10.4,0.2 11.5,2C12.4,3.6 10.2,7.2 8.3,9.7Z', c.cap);
    s += rect(-8.7, 7.2, 17.4, 3.5, 0.9, c.capBand);
    if (!rear) {
      s += path('M-9,10.1Q0,13.9 9,10.1L8.4,12.1Q0,15.9 -8.4,12.1Z', c.peak);
      s += circ(0, 4.4, 2.3, c.badge) + circ(0, 4.4, 1.05, c.cap);
    }
    // arms: ghost positions first, then the real arms
    (o.ghosts || []).forEach(function (g) { s += drawArm(g.side, g, c); });
    if (o.vl) s += drawArm(-1, o.vl, c);
    if (o.vr) s += drawArm(1, o.vr, c);
    return grp(s, 'translate(' + n(o.x) + ' ' + n(o.y - 100 * o.s) + ') scale(' + n(o.s) + ')', o.op);
  }
  // a point of the figure (figure units) in tile units
  function ofPt(o, p) { return [o.x + p[0] * o.s, o.y - 100 * o.s + p[1] * o.s]; }
  function handTip(o, side, a) {
    var g = armGeo(side, a);
    return ofPt(o, add(g.W, dir(a.ha == null ? a.a2 : a.ha), 9));
  }
  var DOWN_L = { a1: 97, a2: 93, hand: 'relaxed' }, DOWN_R = { a1: 83, a2: 87, hand: 'relaxed' };
  function poGround(night) {
    return night ? nightPanel(80) : dusk(84);
  }

  // ================================================================ top-down scenes (docs/drawing.md 5.2)
  var TD = {
    pave: '#353C47', sand: '#C9B48A', asph: '#2A2F37', shoul: '#22262D', white: '#F2F2EE', yellow: '#F2C230',
    kerb: '#9AA3AE', glass: '#1B2230', headL: '#F4F1DE', tailL: '#8E1C1C', gold: '#D9B978', ok: '#8CC8A0',
    bad: '#DE9090', other: '#97A1B4', ind: '#FFB21E', me: '#F4F2EA'
  };
  var PAINT = { blue: '#3F6FB5', red: '#C0453A', silver: '#B8BEC8', dark: '#4A505A', green: '#3C8A5E' };
  function place(inner, x, y, rot, m) {
    return grp(inner, 'translate(' + n(x) + ' ' + n(y) + ')' + (rot ? ' rotate(' + n(rot) + ')' : '') + ' scale(' + n(m) + ')');
  }
  function vShadow(hw, hl, r) { return rect(-hw + 0.14, -hl + 0.24, 2 * hw, 2 * hl, r, '#000000', { op: 0.32 }); }
  function brakes(hw, hl) {
    return rect(-hw - 0.25, hl - 0.3, 2 * hw + 0.5, 1.15, 0.5, '#FF2A2A', { op: 0.3 }) +
      rect(-hw + 0.12, hl - 0.22, 0.56, 0.2, 0.05, '#FF4A3D') + rect(hw - 0.68, hl - 0.22, 0.56, 0.2, 0.05, '#FF4A3D');
  }
  function indicators(side, hw, hl) {
    var sg = side === 'L' ? -1 : 1, x = sg * (hw - 0.1), s = '';
    [[-hl + 0.14, -1], [hl - 0.14, 1]].forEach(function (p) {
      var base = sg > 0 ? (p[1] < 0 ? -45 : 45) : (p[1] < 0 ? -135 : 135);
      s += circ(x, p[0], 0.8, TD.ind, { op: 0.35 }) + circ(x, p[0], 0.27, '#FFC24A');
      [-32, 0, 32].forEach(function (k) {
        var d = dir(base + k);
        s += line(x + d[0] * 0.62, p[0] + d[1] * 0.62, x + d[0] * 1.2, p[0] + d[1] * 1.2, TD.ind, 0.15);
      });
    });
    return s;
  }
  // passenger car 4.6 x 1.95 m, nose up, centred on 0,0 (metres)
  function car(col, o) {
    o = o || {};
    var hl = 2.3, hw = 0.975, me = !!o.me, c = me ? TD.me : (col || PAINT.silver), dk = shade(c, -0.4), s = vShadow(hw, hl, 0.6);
    if (me) s += rect(-hw - 0.45, -hl - 0.45, 2 * hw + 0.9, 2 * hl + 0.9, 0.95, 'none', { stroke: TD.gold, sw: 0.5, op: 0.4 });
    s += rect(-hw, -hl, 2 * hw, 2 * hl, 0.58, c, { stroke: me ? TD.gold : dk, sw: me ? 0.3 : 0.12 });
    s += path('M-0.8,-1.08L0.8,-1.08L0.67,-0.36L-0.67,-0.36Z', TD.glass);
    s += rect(-0.67, -0.36, 1.34, 1.56, 0.16, shade(c, me ? -0.05 : 0.09));
    s += path('M-0.67,1.2L0.67,1.2L0.75,1.7L-0.75,1.7Z', TD.glass);
    s += rect(-hw - 0.16, -1.02, 0.22, 0.16, 0.05, dk) + rect(hw - 0.06, -1.02, 0.22, 0.16, 0.05, dk);
    s += rect(-hw + 0.13, -hl + 0.05, 0.5, 0.17, 0.06, TD.headL) + rect(hw - 0.63, -hl + 0.05, 0.5, 0.17, 0.06, TD.headL);
    s += rect(-hw + 0.13, hl - 0.2, 0.48, 0.15, 0.05, TD.tailL) + rect(hw - 0.61, hl - 0.2, 0.48, 0.15, 0.05, TD.tailL);
    if (o.brake) s += brakes(hw, hl);
    if (o.ind) s += indicators(o.ind, hw, hl);
    return s;
  }
  // flashing red + blue light bar across the roof at y (metres)
  function lightBar(y, w) {
    var h = w / 2, s = '';
    s += circ(-h, y, 2.2, '#FF2A2A', { op: 0.3 }) + circ(h, y, 2.2, '#3D7BFF', { op: 0.34 });
    s += rect(-h - 0.06, y - 0.27, w + 0.12, 0.54, 0.14, '#1B1E23');
    s += rect(-h, y - 0.21, h - 0.04, 0.42, 0.1, '#FF4A3D') + rect(0.04, y - 0.21, h - 0.04, 0.42, 0.1, '#5A8BFF');
    [150, 180, 210].forEach(function (a) { var d = dir(a); s += line(-h + d[0] * 0.75, y + d[1] * 0.75, -h + d[0] * 1.45, y + d[1] * 1.45, '#FF6A5E', 0.17); });
    [-30, 0, 30].forEach(function (a) { var d = dir(a); s += line(h + d[0] * 0.75, y + d[1] * 0.75, h + d[0] * 1.45, y + d[1] * 1.45, '#7FA6FF', 0.17); });
    return s;
  }
  // ambulance 6.0 x 2.25 m: white, red side stripes, red crescent, light bar near the front
  function ambulance(o) {
    o = o || {};
    var hl = 3, hw = 1.125, s = vShadow(hw, hl, 0.45);
    s += rect(-hw, -hl, 2 * hw, 2 * hl, 0.45, '#F2F3F5', { stroke: '#8E949C', sw: 0.12 });
    s += path('M-0.96,-2.72L0.96,-2.72L0.86,-2.08L-0.86,-2.08Z', TD.glass);
    s += rect(-0.9, -1.7, 1.8, 4.45, 0.2, '#FBFBFC', { stroke: '#D5D8DC', sw: 0.06 });
    s += rect(-hw, -1.6, 0.26, 4.35, 0, SIGN.red) + rect(hw - 0.26, -1.6, 0.26, 4.35, 0, SIGN.red);
    s += circ(0, 0.9, 0.66, SIGN.red) + circ(0.26, 0.82, 0.55, '#FBFBFC');
    s += rect(-hw + 0.13, -hl + 0.05, 0.5, 0.17, 0.06, TD.headL) + rect(hw - 0.63, -hl + 0.05, 0.5, 0.17, 0.06, TD.headL);
    s += rect(-hw + 0.13, hl - 0.2, 0.5, 0.15, 0.05, TD.tailL) + rect(hw - 0.63, hl - 0.2, 0.5, 0.15, 0.05, TD.tailL);
    s += lightBar(-1.98, 1.9);
    return s;
  }
  // yellow school bus 10.6 x 2.5 m with flashing red lamps at the four corners (the STOP arm is drawn apart)
  function schoolBus() {
    var hl = 5.3, hw = 1.25, Y = SIGN.yellow, s = vShadow(hw, hl, 0.5);
    s += rect(-hw, -hl, 2 * hw, 2 * hl, 0.5, Y, { stroke: shade(Y, -0.42), sw: 0.13 });
    s += rect(-1.06, -5.12, 2.12, 0.78, 0.22, TD.glass);
    s += rect(-0.98, -4.0, 1.96, 8.9, 0.3, shade(Y, 0.16));
    s += rect(-0.5, -3.1, 1, 1.5, 0.15, shade(Y, -0.12)) + rect(-0.5, 1.6, 1, 1.5, 0.15, shade(Y, -0.12));
    s += rect(-hw, -4.1, 0.16, 9, 0, '#1A1A1A') + rect(hw - 0.16, -4.1, 0.16, 9, 0, '#1A1A1A');
    s += rect(-0.9, 5.0, 1.8, 0.2, 0.05, TD.glass);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (k) {
      var x = k[0] * (hw - 0.3), y = k[1] * (hl - 0.3), base = k[0] > 0 ? (k[1] < 0 ? -45 : 45) : (k[1] < 0 ? -135 : 135);
      s += circ(x, y, 1.25, '#FF2A2A', { op: 0.33 }) + circ(x, y, 0.3, '#FF6257');
      [-30, 0, 30].forEach(function (a) { var d = dir(base + a); s += line(x + d[0] * 0.7, y + d[1] * 0.7, x + d[0] * 1.35, y + d[1] * 1.35, '#FF6257', 0.15); });
    });
    return s;
  }
  // road maintenance truck 8 x 2.5 m: white cab, flatbed, amber beacon on the cab, arrow board at the rear
  function workTruck() {
    var hl = 4, hw = 1.25, s = vShadow(hw, hl, 0.3);
    s += rect(-hw + 0.05, -1.7, 2 * hw - 0.1, 5.7, 0.2, '#C9CDD2', { stroke: '#7E858E', sw: 0.12 });
    for (var y = -1.1; y < 3.4; y += 0.9) s += line(-1.02, y, 1.02, y, '#A9AEB6', 0.1);
    s += rect(-hw, -hl, 2 * hw, 2.3, 0.4, '#F2F2EE', { stroke: '#7E858E', sw: 0.12 });
    s += rect(-1.02, -3.72, 2.04, 0.62, 0.15, TD.glass);
    s += rect(-hw, -2.2, 2 * hw, 0.36, 0, SIGN.orange);
    s += rect(-hw + 0.13, -hl + 0.05, 0.5, 0.17, 0.06, TD.headL) + rect(hw - 0.63, -hl + 0.05, 0.5, 0.17, 0.06, TD.headL);
    // arrow board (drawn flat so it reads from above), amber arrow pointing LEFT
    s += rect(-1.35, 3.35, 2.7, 1.6, 0.18, '#15181D', { stroke: '#5A6475', sw: 0.1 });
    s += poly([[-1.08, 4.15], [-0.5, 3.62], [-0.5, 3.95], [1.05, 3.95], [1.05, 4.35], [-0.5, 4.35], [-0.5, 4.68]], FV.amber);
    s += rect(-1.35, 3.35, 2.7, 1.6, 0.18, FV.amber, { op: 0.12 });
    // flashing amber beacon on the cab roof
    s += circ(0, -2.75, 1.6, FV.amber, { op: 0.3 }) + circ(0, -2.75, 0.34, '#FFD27A', { stroke: FV.amber, sw: 0.12 });
    ALL8.forEach(function (a) { var d = dir(a); s += line(d[0] * 0.75, -2.75 + d[1] * 0.75, d[0] * 1.4, -2.75 + d[1] * 1.4, FV.amber, 0.16); });
    return s;
  }
  function cone(x, y, k) {
    return rect(x - k, y - k, 2 * k, 2 * k, k * 0.35, '#B8570D') + circ(x, y, k * 0.8, SIGN.orange) +
      circ(x, y, k * 0.5, 'none', { stroke: '#F2F2EE', sw: k * 0.3 }) + circ(x, y, k * 0.18, SIGN.orange);
  }
  // STOP arm of the school bus, drawn flat in tile units: bar from the bus side to a red octagon with "قف"
  function stopArm(xSide, y, xc, r) {
    var pts = [], pw = [];
    for (var k = 0; k < 8; k++) {
      var d = dir(22.5 + 45 * k);
      pts.push([xc + d[0] * r, y + d[1] * r]); pw.push([xc + d[0] * (r - 0.9), y + d[1] * (r - 0.9)]);
    }
    return rect(Math.min(xc, xSide), y - 0.6, Math.abs(xSide - xc), 1.2, 0, '#2A2A2A') +
      circ(xc, y, r + 2.4, '#FF2A2A', { op: 0.22 }) + poly(pts, '#FFFFFF') + poly(pw, SIGN.red) +
      K.text('قف', xc, y + 0.2, r * 0.85, { fill: '#FFFFFF', weight: 800 });
  }
  // dimension line with end ticks (no label: catalogue pictures carry no text)
  function dimV(x, y0, y1, col) {
    return line(x, y0 + 0.6, x, y1 - 0.6, col || TD.gold, 0.9) + line(x - 2.2, y0, x + 2.2, y0, col || TD.gold, 0.9) +
      line(x - 2.2, y1, x + 2.2, y1, col || TD.gold, 0.9) +
      poly([[x, y0 + 0.6], [x - 1.2, y0 + 3], [x + 1.2, y0 + 3]], col || TD.gold) + poly([[x, y1 - 0.6], [x - 1.2, y1 - 3], [x + 1.2, y1 - 3]], col || TD.gold);
  }
  // small signal head seen in plan, drawn upright so its lit lamp reads
  function tdSignal(x, y, state) {
    var cols = [FV.red, FV.amber, FV.green], lit = state === 'red' ? 0 : state === 'amber' ? 1 : 2;
    var s = rect(x - 2.6, y - 7, 5.2, 14, 1.3, FV.housing, { stroke: FV.edge, sw: 0.6 });
    for (var i = 0; i < 3; i++) {
      var cy = y - 4.3 + i * 4.3;
      if (i === lit) s += circ(x, cy, 3.4, cols[i], { op: 0.28 }) + circ(x, cy, 1.6, cols[i]);
      else s += circ(x, cy, 1.45, tint(cols[i], 0.22));
    }
    return s;
  }
  function vLines(xs, col, w, dash) {
    return xs.map(function (x) { return line(x, 0, x, 100, col, w, dash ? { dash: dash, cap: 'butt' } : { cap: 'butt' }); }).join('');
  }

  // ================================================================ tl- traffic lights
  reg('tl-red', 'الضوء الأحمر', function (o, label) {
    return pic(dusk(80) + head(50, 7.3, R3(0)), label);
  });
  reg('tl-amber', 'الضوء الأصفر', function (o, label) {
    return pic(dusk(80) + head(50, 7.3, R3(1)), label);
  });
  reg('tl-green', 'الضوء الأخضر', function (o, label) {
    return pic(dusk(80) + head(50, 7.3, R3(2)), label);
  });
  reg('tl-flashing-green', 'الأخضر الوامض', function (o, label) {
    return pic(dusk(80) + head(50, 7.3, R3(2, true)), label);
  });
  reg('tl-flashing-amber', 'الأصفر الوامض', function (o, label) {
    return pic(dusk(80) + head(50, 7.3, R3(1, true)), label);
  });
  reg('tl-flashing-amber-fixed', 'ضوء أصفر وامض ثابت على عمود', function (o, label) {
    var s = dusk(70);
    // roundabout entry in the background: road to a kerbed island with a low planted mound
    s += path('M40,70L60,70L78,100H22Z', FV.road);
    s += ell(50, 70.5, 22, 3.6, '#8C8062') + ell(50, 70.2, 18, 2.6, '#6E7A55') + ell(50, 71.4, 22.6, 3.8, 'none', { stroke: FV.pole, sw: 0.8 });
    s += line(44, 76, 56, 76, FV.white, 1, { dash: '2.4 2', cap: 'butt' });
    // the pole and the single-lamp housing
    s += rect(64.5, 46, 4.6, 50, 1, FV.pole) + rect(67.5, 46, 1.6, 50, 0, FV.poleD) + rect(62.5, 94, 8.6, 3, 1, FV.poleD);
    s += rect(52, 38.5, 16, 3.2, 1, FV.poleD);
    s += rect(36, 17, 32, 32, 6, FV.housing, { stroke: FV.edge, sw: 1.3 });
    s += lamp(52, 33, 11.5, FV.amber, true) + rays(52, 33, 17, 23.5, FV.amber, ALL8.filter(function (a) { return a !== 45 && a !== 90; }), 2.4);
    return pic(s, label);
  });
  reg('tl-green-arrow', 'السهم الأخضر', function (o, label) {
    var lamps = R3(0).concat([{ c: FV.green, lit: true, arrow: 'straight', rot: 90 }]);
    return pic(dusk(80) + head(50, 3.6, lamps, { r: 9.2, gap: 22 }), label);
  });
  reg('tl-green-uturn', 'سهم الاستدارة الأخضر', function (o, label) {
    var lamps = [{ c: FV.red, arrow: 'uturn-left' }, { c: FV.amber, arrow: 'uturn-left' }, { c: FV.green, lit: true, arrow: 'uturn-left' }];
    return pic(dusk(80) + head(50, 7.3, lamps), label);
  });
  reg('tl-red-arrow', 'السهم الأحمر', function (o, label) {
    var s = dusk(84);
    s += rect(4, 6, 92, 4, 1.5, FV.poleD) + rect(28, 9, 3, 9, 0, FV.poleD) + rect(69, 9, 3, 9, 0, FV.poleD);
    s += head(29.5, 17, [{ c: FV.red, lit: true, arrow: 'straight', rot: -90 }, { c: FV.amber, arrow: 'straight', rot: -90 },
      { c: FV.green, arrow: 'straight', rot: -90 }], { r: 9, gap: 24 });
    s += head(70.5, 17, R3(2), { r: 9, gap: 24 });
    return pic(s, label);
  });

  // ================================================================ ls- lane-control signals on gantries
  reg('ls-red-x', 'علامة X حمراء فوق المسار', function (o, label) {
    var s = dusk(56) + roadAhead(56, 30, [26, 42, 58, 74]);
    s += post(5, 17, 76) + post(90, 17, 76) + beam(9, 2, 98);
    [22, 50, 78].forEach(function (x, i) {
      s += ledPanel(x - 11.5, 23, 23, 23, 4);
      s += i === 0 ? ledX(x, 34.5, 6.2, FV.red) : ledDown(x, 34.5, 7.4, FV.green);
    });
    return pic(s, label);
  });
  reg('ls-green-arrow', 'سهم أخضر فوق المسار', function (o, label) {
    var s = dusk(70) + roadAhead(70, 44, [4, 34, 66, 96]);
    s += beam(6, 0.8, 99.2);
    s += ledPanel(24, 20, 52, 46, 4) + ledDown(50, 43, 16, FV.green);
    return pic(s, label);
  });
  reg('ls-variable-speed', 'حد السرعة الإلكتروني فوق المسارات', function (o, label) {
    var s = dusk(56) + roadAhead(56, 30, [26, 42, 58, 74]);
    s += post(5, 17, 76) + post(90, 17, 76) + beam(9, 2, 98);
    [22, 50, 78].forEach(function (x) {
      s += ledPanel(x - 12, 23, 24, 24, 4);
      s += circ(x, 35, 9.6, FV.red, { op: 0.12 }) + circ(x, 35, 8.7, 'none', { stroke: FV.red, sw: 2.6 });
      s += K.text('80', x, 35.4, 9.6, { fill: '#F2F2EE', weight: 700, family: 'latin' });
    });
    return pic(s, label);
  });
  reg('ls-vms', 'لوحة الرسائل الإلكترونية', function (o, label) {
    var s = dusk(62) + roadAhead(62, 36, [28, 42.5, 57, 71.5]);
    s += post(4, 17, 84) + post(91, 17, 84) + beam(9, 1.5, 98.5);
    s += ledPanel(11, 23, 78, 33, 4);
    s += rect(11, 23, 78, 33, 2.2, FV.amber, { op: 0.06 });
    s += K.text('حادث أمامك', 50, 33.2, 11.5, { fill: FV.amber, weight: 700 });
    s += K.text('ACCIDENT AHEAD', 50, 47.6, 7.4, { fill: FV.amber, weight: 700, family: 'latin', ls: 0.3 });
    return pic(s, label);
  });

  // ================================================================ pl- pedestrian lights
  reg('pl-green', 'إشارة المشاة الخضراء', function (o, label) { return pic(dusk(80) + pedHead(false, true), label); });
  reg('pl-flashing-green', 'إشارة المشاة الخضراء الوامضة', function (o, label) {
    return pic(dusk(80) + pedHead(false, true, true), label);
  });
  reg('pl-red', 'إشارة المشاة الحمراء', function (o, label) { return pic(dusk(80) + pedHead(true, false), label); });

  // ================================================================ po- traffic officer hand signals
  reg('po-stop-front', 'قف: للقادمين من الأمام', function (o, label) {
    var s = poGround();
    // accepted variant, small and faint beside him: upper arm out to the side, forearm up (right angle)
    s += officer({ x: 17, y: 96, s: 0.36, op: 0.42, vl: DOWN_L, vr: { a1: -3, a2: -90, hand: 'palm', ha: -90 } });
    // main figure: his LEFT arm (viewer's right) straight up, palm to the viewer
    s += officer({ x: 58, y: 96, s: 0.8, vl: DOWN_L, vr: { a1: -80, a2: -86, hand: 'palm', ha: -90 } });
    return pic(s, label);
  });
  reg('po-stop-behind', 'قف: للقادمين من الخلف', function (o, label) {
    var s = poGround();
    // rear view: his RIGHT arm (viewer's right) horizontal at shoulder height, back of the hand to the viewer
    s += officer({ view: 'rear', x: 42, y: 96, s: 0.8, vl: DOWN_L, vr: { a1: -2, a2: -1, hand: 'back', ha: -90 } });
    return pic(s, label);
  });
  reg('po-stop-crossing', 'قف: ذراع أو ذراعان ممدودتان أفقيا', function (o, label) {
    var s = poGround();
    s += officer({ x: 15, y: 96, s: 0.36, op: 0.42, vl: DOWN_L, vr: { a1: -1, a2: 0, hand: 'palm', ha: -90 } });
    s += officer({ x: 52, y: 96, s: 0.8, vl: { a1: 181, a2: 180, hand: 'palm', ha: -90 }, vr: { a1: -1, a2: 0, hand: 'palm', ha: -90 } });
    return pic(s, label);
  });
  reg('po-proceed', 'تقدم: حركة نصف دائرية بالذراع', function (o, label) {
    var s = poGround();
    var F = { x: 63, y: 96, s: 0.8, vr: DOWN_R, vl: { a1: 142, a2: 142, hand: 'palm', ha: 142, thumb: 1 },
      ghosts: [{ side: -1, a1: -88, a2: -88, hand: 'palm', ha: -88, thumb: 1, op: 0.2 },
        { side: -1, a1: -133, a2: -133, hand: 'palm', ha: -133, thumb: 1, op: 0.26 },
        { side: -1, a1: 180, a2: 180, hand: 'palm', ha: 180, thumb: 1, op: 0.32 }] };
    s += officer(F);
    var sh = ofPt(F, [-SHX, SHY]), R = 46 * F.s;
    var p0 = add(sh, dir(-84), R), p1 = add(sh, dir(-150), R), p2 = add(sh, dir(160), R);
    s += stroke(arcD(sh[0], sh[1], R, -84, -200), FV.gold, 2.3);
    s += arrowC(add(sh, dir(160), R), add(sh, dir(145), R * 1.02), add(sh, dir(138), R * 1.03), [p2[0] - 5.5, p2[1] + 14], FV.gold, { sw: 2.3 });
    void p0; void p1;
    return pic(s, label);
  });
  reg('po-lamp-stop', 'قف ليلا: المصباح الأحمر يتحرك ذهابا وإيابا', function (o, label) {
    var s = poGround(true);
    var F = { night: true, x: 58, y: 96, s: 0.8, vr: DOWN_R, vl: { a1: 118, a2: -125, k2: 0.6, hand: 'lamp', la: -100 } };
    s += officer(F);
    var tip = ofPt(F, [-29, 19]);
    s += dblArrow(tip[0] - 12, tip[0] + 12, tip[1] - 2, FV.gold, 2.2);
    return pic(s, label);
  });
  reg('po-lamp-proceed', 'تقدم ليلا: المصباح الأحمر يرسم نصف دائرة', function (o, label) {
    var s = poGround(true);
    var F = { night: true, x: 62, y: 96, s: 0.8, vr: DOWN_R, vl: { a1: -125, a2: -128, hand: 'lamp', la: -128 } };
    s += officer(F);
    var sh = ofPt(F, [-SHX, SHY]), R = 50 * F.s;
    [-92, 175, 150].forEach(function (a, i) {
      var p = add(sh, dir(a), R * 0.86);
      s += circ(p[0], p[1], 4.2, FV.red, { op: 0.12 + i * 0.03 }) + circ(p[0], p[1], 1.9, FV.red, { op: 0.3 + i * 0.08 });
    });
    s += stroke(arcD(sh[0], sh[1], R, -86, -200), FV.gold, 2.3);
    var p2 = add(sh, dir(160), R);
    s += arrowC(p2, add(sh, dir(145), R * 1.02), add(sh, dir(138), R * 1.03), [p2[0] - 5.5, p2[1] + 14], FV.gold, { sw: 2.3 });
    return pic(s, label);
  });

  // ================================================================ ev- emergency vehicles, school bus, amber lights
  reg('ev-emergency-lights', 'مركبة طوارئ بأضواء وامضة وصفارة', function (o, label) {
    var s = dusk(58);
    s += path('M42,58L58,58L100,84V92A8,8 0 0 1 92,100H8A8,8 0 0 1 0,92V84Z', FV.road);
    s += line(50, 60, 50, 64, FV.white, 1, { cap: 'butt' });
    s += ell(50, 93.5, 34, 3.2, '#000000', { op: 0.35 });
    // patient box behind the cab
    s += rect(19, 20, 62, 48, 3.5, '#F2F2EE', { stroke: '#AEB5BF', sw: 0.9 });
    s += rect(19, 55, 62, 4, 0, SIGN.red);
    s += K.glyph('crescent', { x: 44, y: 25, w: 12, h: 15, fill: SIGN.red });
    // cab
    s += rect(22, 42, 56, 42, 5, '#F2F2EE', { stroke: '#AEB5BF', sw: 0.9 });
    s += path('M28.5,45.5L71.5,45.5L74.5,61L25.5,61Z', '#1B2230') + path('M31,47.2L44,47.2L38,59.4L27.8,59.4Z', '#FFFFFF', { op: 0.07 });
    s += rect(22, 64, 56, 3.2, 0, SIGN.red);
    s += ell(31.5, 71.5, 9, 5.5, '#F4F1DE', { op: 0.22 }) + ell(68.5, 71.5, 9, 5.5, '#F4F1DE', { op: 0.22 });
    s += rect(25.5, 69, 12, 5.2, 2, '#F4F1DE') + rect(62.5, 69, 12, 5.2, 2, '#F4F1DE');
    s += rect(41.5, 68.8, 17, 7.4, 1.6, '#3A3F48') + line(43.5, 71.2, 56.5, 71.2, '#565C66', 0.8) + line(43.5, 73.8, 56.5, 73.8, '#565C66', 0.8);
    s += rect(20.5, 79, 59, 6, 2.6, '#4A505A');
    s += rect(24.5, 83, 9, 10, 2, '#111418') + rect(66.5, 83, 9, 10, 2, '#111418');
    s += line(19, 50, 22.5, 50, '#1B1E23', 1.4) + rect(14.5, 46, 5, 9, 1.5, '#1B1E23');
    s += line(77.5, 50, 81, 50, '#1B1E23', 1.4) + rect(80.5, 46, 5, 9, 1.5, '#1B1E23');
    // light bar: red and blue both lit, with halos and flash strokes
    s += ell(37, 16.5, 18, 11, FV.red, { op: 0.2 }) + ell(63, 16.5, 18, 11, FV.blue, { op: 0.22 });
    s += rect(25, 13, 50, 7.4, 2.6, '#1B1E23');
    s += rect(26.4, 14.4, 22.8, 4.6, 1.8, '#FF4A3D') + rect(50.8, 14.4, 22.8, 4.6, 1.8, '#4D86FF');
    s += rays(37.8, 16.7, 7.5, 12, '#FF6A5E', [-150, -120, -90, -60], 2) + rays(62.2, 16.7, 7.5, 12, '#7FA6FF', [-120, -90, -60, -30], 2);
    // siren sound waves at both sides
    [5.5, 10].forEach(function (r, i) {
      s += stroke(arcD(21, 17, r, 145, 215), FV.ink, 1.7, { op: 0.9 - i * 0.3 }) + stroke(arcD(79, 17, r, -35, 35), FV.ink, 1.7, { op: 0.9 - i * 0.3 });
    });
    return pic(s, label);
  });

  reg('ev-highway-move-right', 'مركبة طوارئ خلفك على طريق رئيسي', function (o, label) {
    var m = 3.8, lw = 3.6 * m, x0 = 21.9, xa = x0 + m, x1 = xa + lw, x2 = x1 + lw, x3 = x2 + lw, xr = x3 + 3 * m;
    var s = tile(TD.sand);
    s += rect(x0, 0, xr - x0, 100, 0, TD.shoul) + rect(xa, 0, x3 - xa, 100, 0, TD.asph);
    s += vLines([xa], TD.yellow, 1.3) + vLines([x3], TD.white, 1.3) + vLines([x1, x2], TD.white, 1.2, '8 10');
    var cl = xa + lw / 2, cm = x1 + lw / 2, cr = x2 + lw / 2;
    // ambulance behind in the left lane
    s += place(ambulance(), cl, 84.5, 0, m);
    // our car leaves the left lane for the middle lane, car ahead moves from the middle to the right lane
    s += place(car(null, { me: true, ind: 'R' }), cl + 5.4, 56, 16, m);
    s += arrowC([cl + 8.6, 45], [cl + 10.6, 38.5], [cm, 38], [cm, 30], TD.gold, { sw: 2 });
    s += place(car(PAINT.blue, { ind: 'R' }), cm + 4.4, 26, 15, m);
    s += arrowC([cm + 7.4, 15.4], [cm + 9.2, 9.5], [cr, 9.4], [cr, 3], TD.other, { sw: 1.8 });
    return pic(s, label);
  });

  reg('ev-internal-road', 'مركبة طوارئ في طريق داخلي مزدحم', function (o, label) {
    var m = 5, xl = 32, xr = 68, s = tile(TD.pave);
    s += rect(xl, 0, xr - xl, 100, 0, TD.asph) + rect(xl - 1.3, 0, 1.3, 100, 0, TD.kerb) + rect(xr, 0, 1.3, 100, 0, TD.kerb);
    s += vLines([50], TD.white, 1.1, '8 9');
    var L = 39, R = 61;
    s += place(car(PAINT.red), L, 16, -6, m) + place(car(PAINT.silver), R, 18, 6, m);
    s += place(car(PAINT.green), L, 45, -6, m) + place(car(null, { me: true }), R, 47, 6, m);
    s += arrowPath([[L - 6.2, 12], [L - 10.6, 8.6]], TD.other, { sw: 1.6 }) + arrowPath([[L - 6.2, 41], [L - 10.6, 37.6]], TD.other, { sw: 1.6 });
    s += arrowPath([[R + 6.2, 14], [R + 10.6, 10.6]], TD.other, { sw: 1.6 }) + arrowPath([[R + 6.2, 43], [R + 10.6, 39.6]], TD.gold, { sw: 1.9 });
    s += place(ambulance(), 50, 81, 0, m);
    s += arrowPath([[50, 64], [50, 5]], TD.other, { sw: 1.5, dash: '4 3' });
    return pic(s, label);
  });

  reg('ev-at-junction', 'مركبة طوارئ عند التقاطع', function (o, label) {
    var m = 4.2, w = 7.2 * m, a = 50 - w / 2, b = 50 + w / 2, s = tile(TD.pave);
    s += rect(a, 0, w, 100, 0, TD.asph) + rect(0, a, 100, w, 0, TD.asph);
    // kerbs along the four corners
    [[0, a - 1.2, a - 1.2, 1.2], [b + 1.2, a - 1.2, 100 - b - 1.2, 1.2], [0, b, a - 1.2, 1.2], [b + 1.2, b, 100 - b - 1.2, 1.2]].forEach(function (r) {
      s += rect(r[0], r[1], r[2], r[3], 0, TD.kerb);
    });
    [[a - 1.2, 0, 1.2, a], [b, 0, 1.2, a], [a - 1.2, b, 1.2, 100 - b], [b, b, 1.2, 100 - b]].forEach(function (r) {
      s += rect(r[0], r[1], r[2], r[3], 0, TD.kerb);
    });
    // centre lines on the approaches and stop lines
    s += line(50, 0, 50, a - 3.5, TD.yellow, 1.2, { cap: 'butt' }) + line(50, b + 3.5, 50, 100, TD.yellow, 1.2, { cap: 'butt' });
    s += line(0, 50, a - 3.5, 50, TD.yellow, 1.2, { cap: 'butt' }) + line(b + 3.5, 50, 100, 50, TD.yellow, 1.2, { cap: 'butt' });
    s += line(50, b + 3.5, b, b + 3.5, TD.white, 1.8, { cap: 'butt' }) + line(a, a - 3.5, 50, a - 3.5, TD.white, 1.8, { cap: 'butt' });
    s += line(b + 3.5, a, b + 3.5, 50, TD.white, 1.8, { cap: 'butt' }) + line(a - 3.5, 50, a - 3.5, b, TD.white, 1.8, { cap: 'butt' });
    // signals: red for the bottom approach, green for the right approach
    s += tdSignal(b + 6.5, b + 8.5, 'red') + tdSignal(b + 6.5, a - 9.5, 'green');
    // ambulance crosses its stop line on red, its path dashed
    var xn = 50 + w / 4, yw = 50 - w / 4;
    s += arrowPath([[xn, 57], [xn, 4]], TD.other, { sw: 1.6, dash: '4 3' });
    s += place(ambulance(), xn, 70, 0, m);
    // our car waits on the right approach although its light is green
    s += place(car(null, { me: true, brake: true }), b + 3.5 + 1.5 + 2.3 * m, yw, -90, m);
    return pic(s, label);
  });

  reg('ev-roundabout', 'مركبة طوارئ عند الدوار', function (o, label) {
    var cx = 50, cy = 44, Ro = 31, Ri = 12, m = 2.64, hw = 9.5, s = tile(TD.pave);
    // arms, then the circulating carriageway on top, then the island
    s += rect(cx - hw, cy, 2 * hw, 100 - cy, 0, TD.asph) + rect(cx - hw, 0, 2 * hw, cy, 0, TD.asph);
    s += rect(0, cy - hw, 100, 2 * hw, 0, TD.asph);
    s += circ(cx, cy, Ro + 0.6, 'none', { stroke: TD.kerb, sw: 1.2 }) + circ(cx, cy, Ro, TD.asph);
    // arm kerbs
    [[cx - hw - 1.2, 0, 1.2, cy - 29.4], [cx + hw, 0, 1.2, cy - 29.4], [cx - hw - 1.2, cy + 29.4, 1.2, 100 - cy - 29.4],
      [cx + hw, cy + 29.4, 1.2, 100 - cy - 29.4]].forEach(function (r) { s += rect(r[0], r[1], r[2], r[3], 0, TD.kerb); });
    [[0, cy - hw - 1.2, cx - 29.4, 1.2], [0, cy + hw, cx - 29.4, 1.2], [cx + 29.4, cy - hw - 1.2, 100 - cx - 29.4, 1.2],
      [cx + 29.4, cy + hw, 100 - cx - 29.4, 1.2]].forEach(function (r) { s += rect(r[0], r[1], r[2], r[3], 0, TD.kerb); });
    // lane divider on the ring, give-way lines at the four entries, centre lines on the arms
    s += circ(cx, cy, 21.5, 'none', { stroke: TD.white, sw: 0.9, dash: '3.2 3.2' });
    s += line(cx, cy + Ro + 1, cx, 100, TD.white, 1, { cap: 'butt' }) + line(cx, 0, cx, cy - Ro - 1, TD.white, 1, { cap: 'butt' });
    s += line(0, cy, cx - Ro - 1, cy, TD.white, 1, { cap: 'butt' }) + line(cx + Ro + 1, cy, 100, cy, TD.white, 1, { cap: 'butt' });
    s += line(cx + 0.6, cy + Ro + 1.6, cx + hw, cy + Ro + 1.6, TD.white, 1.2, { dash: '1.8 1.4', cap: 'butt' });
    s += line(cx + Ro + 1.6, cy - hw, cx + Ro + 1.6, cy - 0.6, TD.white, 1.2, { dash: '1.8 1.4', cap: 'butt' });
    s += line(cx - hw, cy - Ro - 1.6, cx - 0.6, cy - Ro - 1.6, TD.white, 1.2, { dash: '1.8 1.4', cap: 'butt' });
    s += line(cx - Ro - 1.6, cy + 0.6, cx - Ro - 1.6, cy + hw, TD.white, 1.2, { dash: '1.8 1.4', cap: 'butt' });
    s += circ(cx, cy, Ri + 0.7, TD.kerb) + circ(cx, cy, Ri, TD.sand) + circ(cx, cy, Ri * 0.55, '#B7A276');
    // car inside moves from the inner to the outer lane (anticlockwise), signalling right
    var ph = 140, r1 = 16.75, pc = [cx + r1 * Math.cos(ph * Math.PI / 180), cy - r1 * Math.sin(ph * Math.PI / 180)];
    s += place(car(PAINT.blue, { ind: 'R' }), pc[0], pc[1], 180 - ph + 180 + 90 - 180, m);
    var e1 = [cx + 26.25 * Math.cos(185 * Math.PI / 180), cy - 26.25 * Math.sin(185 * Math.PI / 180)];
    s += arrowC([pc[0] - 4.2, pc[1] + 4.6], [pc[0] - 7.4, pc[1] + 8.6], [e1[0], e1[1] - 6], e1, TD.ok, { sw: 1.7 });
    // our car waits at the right entry, the ambulance enters from the bottom
    s += place(car(null, { me: true, brake: true }), cx + Ro + 3 + 2.3 * m, cy - hw / 2, -90, m);
    s += place(ambulance(), cx + hw / 2, cy + Ro + 7.2, 0, m);
    return pic(s, label);
  });

  function busRoad(s, x0, x1) { return s; }
  void busRoad;

  reg('ev-school-bus-single', 'الحافلة المدرسية وذراع قف: طريق غير مقسوم', function (o, label) {
    var m = 3.1, lw = 3.6 * m, xl = 50 - lw, xr = 50 + lw, s = tile(TD.pave);
    s += rect(xl, 0, xr - xl, 100, 0, TD.asph) + rect(xl - 1.3, 0, 1.3, 100, 0, TD.kerb) + rect(xr, 0, 1.3, 100, 0, TD.kerb);
    s += vLines([50], TD.yellow, 1.1, '7 7');
    var bx = xr - 0.9 - 1.25 * m, bTop = 34, bBot = bTop + 10.6 * m;
    // oncoming car stopped 5 m before the bus, our car stopped 5 m behind it
    s += place(car(PAINT.blue, { brake: true }), 50 - lw / 2, bTop - 5 * m - 2.3 * m, 180, m);
    s += place(car(null, { me: true, brake: true }), 50 + lw / 2, bBot + 5 * m + 2.3 * m, 0, m);
    s += place(schoolBus(), bx, (bTop + bBot) / 2, 0, m);
    s += stopArm(bx - 1.25 * m, bTop + 1.9 * m, bx - 1.25 * m - 7, 4.6);
    s += dimV(xl - 5, bTop - 5 * m, bTop) + dimV(xr + 5, bBot, bBot + 5 * m);
    return pic(s, label);
  });

  reg('ev-school-bus-dual', 'الحافلة المدرسية وذراع قف: طريق مقسوم', function (o, label) {
    var m = 3.1, lw = 3.6 * m, med = 2 * m, a1 = 50 - med / 2, b1 = 50 + med / 2, xl = a1 - 2 * lw, xr = b1 + 2 * lw, s = tile(TD.pave);
    s += rect(xl, 0, xr - xl, 100, 0, TD.asph) + rect(xl - 1.3, 0, 1.3, 100, 0, TD.kerb) + rect(xr, 0, 1.3, 100, 0, TD.kerb);
    s += rect(a1, 0, med, 100, 0, TD.kerb) + rect(a1 + 1.1, 0, med - 2.2, 100, 0, TD.sand);
    s += vLines([a1 - 1.2, b1 + 1.2], TD.yellow, 0.9) + vLines([a1 - lw, b1 + lw], TD.white, 1.1, '7 7');
    var bx = xr - 0.9 - 1.25 * m, bTop = 16, bBot = bTop + 10.6 * m, yStop = bBot + 5 * m + 2.3 * m;
    s += place(car(null, { me: true, brake: true }), b1 + 1.5 * lw, yStop, 0, m);
    s += place(car(PAINT.red, { brake: true }), b1 + lw / 2, yStop, 0, m);
    s += place(schoolBus(), bx, (bTop + bBot) / 2, 0, m);
    s += stopArm(bx - 1.25 * m, bTop + 1.9 * m, bx - 1.25 * m - 7, 4.6);
    s += dimV(xr + 5, bBot, bBot + 5 * m);
    // the other carriageway keeps moving down
    s += place(car(PAINT.silver), a1 - lw / 2, 22, 180, m) + arrowPath([[a1 - lw / 2, 31], [a1 - lw / 2, 45]], TD.ok, { sw: 1.7 });
    s += place(car(PAINT.green), a1 - 1.5 * lw, 62, 180, m) + arrowPath([[a1 - 1.5 * lw, 71], [a1 - 1.5 * lw, 85]], TD.ok, { sw: 1.7 });
    return pic(s, label);
  });

  reg('ev-service-amber', 'ضوء أصفر وامض على مركبة أو معدات في الطريق', function (o, label) {
    var m = 4, lw = 3.6 * m, x0 = 20.4, xa = x0 + m, x1 = xa + lw, x2 = x1 + lw, x3 = x2 + lw, xr = x3 + 3 * m, s = tile(TD.sand);
    s += rect(x0, 0, xr - x0, 100, 0, TD.shoul) + rect(xa, 0, x3 - xa, 100, 0, TD.asph);
    s += vLines([xa], TD.yellow, 1.3) + vLines([x3], TD.white, 1.3) + vLines([x1, x2], TD.white, 1.2, '8 10');
    var cr = x2 + lw / 2, cm = x1 + lw / 2;
    s += place(workTruck(), cr, 22, 0, m);
    for (var i = 0; i < 6; i++) { var t = i / 5; s += cone(x3 - 2.4 - (lw - 4.6) * t, 92 - 40 * t, 1.5); }
    s += place(car(null, { me: true, ind: 'L' }), cm + 5.2, 80, -16, m);
    s += arrowC([cm + 2.4, 68.6], [cm + 0.6, 62], [cm, 58], [cm, 49], TD.gold, { sw: 2 });
    return pic(s, label);
  });

  reg('ev-hazard-lights', 'أضواء التحذير (الفلاشر) في سيارة أمامك', function (o, label) {
    var s = dusk(48);
    // carriageway on the left, hard shoulder on the right of the solid edge line
    s += path('M22,48L36,48L52,100H8A8,8 0 0 1 0,92V60Z', FV.road);
    s += path('M36,48L42,48L100,80V92A8,8 0 0 1 92,100H52Z', '#282D36');
    s += line(36, 48, 52, 100, FV.white, 1.3, { cap: 'butt' }) + line(29, 48, 5, 90, FV.white, 1.1, { dash: '5 5', cap: 'butt' });
    // the stopped car, seen from behind
    var cx = 70;
    s += ell(cx, 90.5, 22, 2.8, '#000000', { op: 0.4 });
    s += rect(cx - 18.5, 80, 8, 10.5, 1.8, '#101317') + rect(cx + 10.5, 80, 8, 10.5, 1.8, '#101317');
    s += path('M' + (cx - 14) + ',55C' + (cx - 13) + ',52.6 ' + (cx - 11) + ',52 ' + (cx - 8) + ',52H' + (cx + 8) + 'C' + (cx + 11) + ',52 ' + (cx + 13) + ',52.6 ' + (cx + 14) + ',55L' + (cx + 18) + ',67H' + (cx - 18) + 'Z', '#A9B0BA');
    s += path('M' + (cx - 11.6) + ',55.4H' + (cx + 11.6) + 'L' + (cx + 14.6) + ',65H' + (cx - 14.6) + 'Z', '#1B2230');
    s += rect(cx - 20.5, 65.5, 41, 18, 4.5, '#B8BEC8', { stroke: '#7E858E', sw: 0.8 });
    s += rect(cx - 7.5, 73.5, 15, 5.2, 1, '#F2F2EE', { stroke: '#7E858E', sw: 0.5 });
    s += rect(cx - 20, 80, 40, 3.8, 1.8, '#8D939B');
    // tail lamps: red part dark, amber indicators lit on both sides (hazard lights)
    [-1, 1].forEach(function (k) {
      var xo = cx + k * 16.2, xa = cx + k * 18.2;
      s += rect(xo - 3.6, 67.6, 7.2, 5, 1.2, '#7A1C1C');
      s += circ(xa, 70.1, 6.4, FV.amber, { op: 0.2 }) + circ(xa, 70.1, 4.3, FV.amber, { op: 0.3 });
      s += rect(xa - 2.4, 67.6, 4.8, 5, 1.2, FV.amber) + rect(xa - 1.6, 68.3, 2, 1.4, 0.6, '#FFFFFF', { op: 0.45 });
      s += rays(xa, 70.1, 7.6, 11.2, FV.amber, k < 0 ? [205, 180, 155, 130] : [-25, 0, 25, 50], 2);
    });
    return pic(s, label);
  });
})();
