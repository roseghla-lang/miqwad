/* SignKit + Signs registry for مقود (UAE traffic signs, drawn from scratch as SVG).
 *
 * Conventions (every drawing agent must follow them):
 *  - A sign drawing is a function (opts) => complete SVG string. Register it with
 *      Signs.register('w-bend-right', () => SignKit.warn(inner, {label: 'منعطف خطر إلى اليمين'}))
 *  - No `id` attributes, no <defs>, no gradients, no external images. Explicit fill on every shape.
 *  - Coordinates below are in each base's own viewBox. Draw the pictogram (`inner`) in that space.
 *
 * Bases (all return a full <svg>):
 *  SignKit.warn(inner, {bg, border})        triangle, point up. viewBox 0 0 100 92.
 *        Inner white triangle: apex (50,24), base corners (18.8,78) and (81.2,78).
 *        Put the pictogram in roughly x 30..70, y 42..74 (the triangle is narrow at the top).
 *        SignKit.WARN = {cx:50, cy:58, top:42, bottom:74} is the recommended symbol frame.
 *        For temporary works signs use {bg: SignKit.C.orange} (or the colour the catalog specifies).
 *  SignKit.giveWay(inner, {bg, border})      triangle, point down. viewBox 0 0 100 92.
 *        Inner white triangle: top edge y=14 from x 18.8 to 81.2, apex (50,68).
 *  SignKit.circle(inner, {bg, ring, ringWidth, rim})   generic round sign. viewBox 0 0 100 100.
 *  SignKit.prohib(inner, {slash})            white disc, red ring (outer r 47, inner r 38).
 *        Pictogram area: inside r ~31 around (50,50). slash:true adds the red diagonal bar
 *        (top-left to bottom-right) ABOVE the pictogram.
 *  SignKit.noEntry()                         red disc with a white horizontal bar.
 *  SignKit.noParking({x})                    blue disc, red ring, one red slash (x:true => red X = no stopping).
 *  SignKit.mand(inner)                       blue disc (r 47) with white rim. Pictogram in white, area r ~33.
 *  SignKit.endRestriction(inner)             white disc, thin black rim, black diagonal band of thin lines
 *                                            drawn ABOVE inner (draw the old value in grey #8A8F98 first).
 *  SignKit.stop()                            red octagon, white "قف" and "STOP".
 *  SignKit.diamond(inner, {center})          priority-road diamond (white with yellow centre). viewBox 0 0 100 100.
 *  SignKit.rect(inner, {w, h, bg, rim, r})   rounded rectangle sign with white rim. viewBox 0 0 w h
 *                                            (default 100x100, bg blue). Use for info/service/guide signs.
 *  SignKit.plate(text, {w, h})               white supplementary plate with black border and black text.
 *  SignKit.svg(inner, viewBox, label)        raw wrapper when you need a custom outline.
 *
 * Helpers:
 *  SignKit.text(str, x, y, size, {fill, weight, family:'head'|'latin', anchor, ls})
 *  SignKit.C  colour palette. SignKit.FONT / SignKit.LATIN font stacks.
 *  SignKit.tri(cx, cy, r, down)   points string of a triangle with centroid (cx,cy) and inradius r.
 *  SignKit.poly(points)           "x,y x,y" string from [[x,y], ...].
 */
(function () {
  'use strict';

  var C = {
    red: '#C8202A', blue: '#1F5AA6', green: '#1E7B47', brown: '#7B4A26', orange: '#F07F1A',
    yellow: '#F5C400', white: '#FFFFFF', black: '#151515', grey: '#8A8F98', darkGrey: '#4A4F57'
  };
  var FONT = "Alexandria,'Readex Pro','Space Grotesk',system-ui,sans-serif";
  var LATIN = "'Space Grotesk',Alexandria,system-ui,sans-serif";

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function svg(inner, vb, label) {
    vb = vb || '0 0 100 100';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" role="img"' +
      (label ? ' aria-label="' + esc(label) + '"' : ' aria-hidden="true"') +
      ' class="sign-svg">' + inner + '</svg>';
  }

  function poly(points) {
    return points.map(function (p) { return (+p[0]).toFixed(2) + ',' + (+p[1]).toFixed(2); }).join(' ');
  }

  // Triangle with centroid (cx,cy) and inradius r. down=true => point down.
  function tri(cx, cy, r, down) {
    var h = Math.sqrt(3) * r;
    if (!down) return poly([[cx, cy - 2 * r], [cx + h, cy + r], [cx - h, cy + r]]);
    return poly([[cx - h, cy - r], [cx + h, cy - r], [cx, cy + 2 * r]]);
  }

  // Rounded polygon: fill + same-colour stroke with round joins (stroke adds sw/2 outward).
  function rpoly(points, fill, sw) {
    return '<polygon points="' + points + '" fill="' + fill + '" stroke="' + fill +
      '" stroke-width="' + sw + '" stroke-linejoin="round"/>';
  }

  function text(str, x, y, size, o) {
    o = o || {};
    var fam = o.family === 'latin' ? LATIN : FONT;
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" font-family="' + fam + '"' +
      ' font-weight="' + (o.weight || 700) + '" fill="' + (o.fill || C.black) + '"' +
      ' text-anchor="' + (o.anchor || 'middle') + '" dominant-baseline="central"' +
      (o.ls ? ' letter-spacing="' + o.ls + '"' : '') +
      (o.family === 'latin' ? ' direction="ltr"' : '') + '>' + esc(str) + '</text>';
  }

  // ---------- bases ----------
  var WARN = { cx: 50, cy: 58, top: 42, bottom: 74 };

  function warn(inner, o) {
    o = o || {};
    var bg = o.bg || C.white, border = o.border || C.red;
    // effective inradii: rim 28.5, red 27, inner 18 (stroke adds half its width)
    return svg(
      rpoly(tri(50, 60, 26, false), C.white, 5) +
      rpoly(tri(50, 60, 24.5, false), border, 5) +
      rpoly(tri(50, 60, 16.5, false), bg, 3) +
      (inner || ''), '0 0 100 92', o.label);
  }

  function giveWay(inner, o) {
    o = o || {};
    var bg = o.bg || C.white, border = o.border || C.red;
    return svg(
      rpoly(tri(50, 32, 26, true), C.white, 5) +
      rpoly(tri(50, 32, 24.5, true), border, 5) +
      rpoly(tri(50, 32, 16.5, true), bg, 3) +
      (inner || ''), '0 0 100 92', o.label);
  }

  function circle(inner, o) {
    o = o || {};
    var rim = o.rim === false ? '' : '<circle cx="50" cy="50" r="49" fill="' + (o.rimColor || C.white) + '"/>';
    var ring = o.ring ? '<circle cx="50" cy="50" r="47" fill="' + o.ring + '"/>' : '';
    var inR = o.ring ? 47 - (o.ringWidth || 9) : 47;
    var bg = '<circle cx="50" cy="50" r="' + inR + '" fill="' + (o.bg || C.white) + '"/>';
    return svg(rim + ring + bg + (inner || ''), '0 0 100 100', o.label);
  }

  function slashBar(color, width) {
    var a = 38 * Math.SQRT1_2;
    return '<line x1="' + (50 - a).toFixed(2) + '" y1="' + (50 - a).toFixed(2) + '" x2="' + (50 + a).toFixed(2) +
      '" y2="' + (50 + a).toFixed(2) + '" stroke="' + (color || C.red) + '" stroke-width="' + (width || 7.5) + '"/>';
  }

  function prohib(inner, o) {
    o = o || {};
    return circle((inner || '') + (o.slash ? slashBar(C.red, o.slashWidth) : ''),
      { ring: C.red, ringWidth: 9, bg: o.bg || C.white, label: o.label });
  }

  function noEntry(o) {
    o = o || {};
    return circle('<rect x="19" y="42" width="62" height="16" rx="1.5" fill="' + C.white + '"/>',
      { bg: C.red, label: o.label });
  }

  function noParking(o) {
    o = o || {};
    var a = 38 * Math.SQRT1_2;
    var bars = slashBar(C.red, 7.5);
    if (o.x) {
      bars += '<line x1="' + (50 + a).toFixed(2) + '" y1="' + (50 - a).toFixed(2) + '" x2="' + (50 - a).toFixed(2) +
        '" y2="' + (50 + a).toFixed(2) + '" stroke="' + C.red + '" stroke-width="7.5"/>';
    }
    return circle(bars + (o.inner || ''), { ring: C.red, ringWidth: 9, bg: C.blue, label: o.label });
  }

  function mand(inner, o) {
    o = o || {};
    return circle(inner || '', { bg: o.bg || C.blue, label: o.label });
  }

  function endRestriction(inner, o) {
    o = o || {};
    var lines = '';
    var a = 44 * Math.SQRT1_2;
    // band of 5 thin parallel lines, top-right to bottom-left? Vienna end signs run top-right -> bottom-left.
    for (var i = -2; i <= 2; i++) {
      var off = i * 3.2, dx = off * Math.SQRT1_2, dy = off * Math.SQRT1_2;
      lines += '<line x1="' + (50 + a + dx).toFixed(2) + '" y1="' + (50 - a + dy).toFixed(2) + '" x2="' +
        (50 - a + dx).toFixed(2) + '" y2="' + (50 + a + dy).toFixed(2) + '" stroke="' + C.black + '" stroke-width="1.3"/>';
    }
    return svg('<circle cx="50" cy="50" r="49" fill="' + C.white + '"/>' +
      '<circle cx="50" cy="50" r="46.5" fill="' + C.white + '" stroke="' + C.black + '" stroke-width="1.6"/>' +
      (inner || '') + lines, '0 0 100 100', o.label);
  }

  function octagonPoints(R) {
    var pts = [];
    for (var k = 0; k < 8; k++) {
      var ang = (22.5 + 45 * k) * Math.PI / 180;
      pts.push([50 + R * Math.cos(ang), 50 + R * Math.sin(ang)]);
    }
    return poly(pts);
  }

  function stop(o) {
    o = o || {};
    return svg(
      rpoly(octagonPoints(48), C.white, 3) +
      rpoly(octagonPoints(45), C.red, 3) +
      '<polygon points="' + octagonPoints(41.5) + '" fill="none" stroke="' + C.white + '" stroke-width="1.6"/>' +
      text('قف', 50, 40, 30, { fill: C.white, weight: 800 }) +
      text('STOP', 50, 69, 17, { fill: C.white, weight: 700, family: 'latin', ls: 0.5 }),
      '0 0 100 100', o.label || 'قف');
  }

  function diamond(inner, o) {
    o = o || {};
    var d = function (r) { return poly([[50, 50 - r], [50 + r, 50], [50, 50 + r], [50 - r, 50]]); };
    return svg(
      '<polygon points="' + d(49) + '" fill="' + C.black + '"/>' +
      '<polygon points="' + d(47.2) + '" fill="' + C.white + '"/>' +
      '<polygon points="' + d(30) + '" fill="' + (o.center || C.yellow) + '"/>' +
      (inner || ''), '0 0 100 100', o.label);
  }

  function rect(inner, o) {
    o = o || {};
    var w = o.w || 100, h = o.h || 100, r = o.r == null ? 8 : o.r;
    var rim = o.rim === false ? '' :
      '<rect x="0.8" y="0.8" width="' + (w - 1.6) + '" height="' + (h - 1.6) + '" rx="' + r + '" fill="' + (o.rimColor || C.white) + '"/>';
    return svg(rim +
      '<rect x="3.2" y="3.2" width="' + (w - 6.4) + '" height="' + (h - 6.4) + '" rx="' + Math.max(0, r - 2.2) +
      '" fill="' + (o.bg || C.blue) + '"/>' + (inner || ''), '0 0 ' + w + ' ' + h, o.label);
  }

  function plate(str, o) {
    o = o || {};
    var w = o.w || 100, h = o.h || 44;
    return svg('<rect x="1" y="1" width="' + (w - 2) + '" height="' + (h - 2) + '" rx="4" fill="' + C.white +
      '" stroke="' + C.black + '" stroke-width="2.2"/>' +
      text(str, w / 2, h / 2 + 1, o.size || 17, { fill: C.black, family: o.family }) + (o.inner || ''),
      '0 0 ' + w + ' ' + h, o.label || str);
  }

  function placeholder(id) {
    return svg('<rect x="4" y="4" width="92" height="92" rx="14" fill="#1A2332" stroke="#3A4A63" stroke-width="2" stroke-dasharray="5 4"/>' +
      text('؟', 50, 44, 34, { fill: '#97A1B4' }) +
      text(String(id || '').slice(0, 18), 50, 76, 7.5, { fill: '#97A1B4', family: 'latin', weight: 500 }),
      '0 0 100 100', 'إشارة غير مرسومة بعد');
  }

  window.SignKit = {
    C: C, FONT: FONT, LATIN: LATIN, WARN: WARN,
    esc: esc, svg: svg, poly: poly, tri: tri, rpoly: rpoly, text: text, slashBar: slashBar,
    warn: warn, giveWay: giveWay, circle: circle, prohib: prohib, noEntry: noEntry, noParking: noParking,
    mand: mand, endRestriction: endRestriction, stop: stop, diamond: diamond, rect: rect, plate: plate,
    placeholder: placeholder
  };

  // ---------- registry ----------
  var REG = Object.create(null);
  window.Signs = {
    register: function (id, fn) { if (id && typeof fn === 'function') REG[id] = fn; },
    has: function (id) { return !!REG[id]; },
    list: function () { return Object.keys(REG); },
    render: function (id, opts) {
      var fn = REG[id];
      if (!fn) return placeholder(id);
      try { return fn(opts || {}) || placeholder(id); } catch (e) {
        if (window.console) console.warn('sign render failed', id, e);
        return placeholder(id);
      }
    }
  };

  // Examples of the fixed, shape-only signs (drawing agents may re-register richer versions).
  window.Signs.register('p-stop', function () { return stop({ label: 'قف' }); });
  window.Signs.register('r-no-entry', function () { return noEntry({ label: 'ممنوع الدخول' }); });
  window.Signs.register('r-no-parking', function () { return noParking({ label: 'ممنوع الوقوف' }); });
  window.Signs.register('r-no-stopping', function () { return noParking({ x: true, label: 'ممنوع التوقف' }); });
  window.Signs.register('p-priority-road', function () { return diamond('', { label: 'طريق ذو أولوية' }); });
})();
