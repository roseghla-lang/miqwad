/* مقود: concept figures for sign families (content/figs.json groups shape and meaning).
 * Plain sign shapes (fig-shape-*) show what a family looks like; meaning badges (fig-mean-*) put the
 * family's one-word meaning inside its own shape, so the rule and the shape are learnt together.
 * Drawn from scratch with the SignKit bases, see docs/drawing.md */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit, C = K.C;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }

  function octagon(R) {
    var pts = [];
    for (var k = 0; k < 8; k++) {
      var a = (22.5 + 45 * k) * Math.PI / 180;
      pts.push([50 + R * Math.cos(a), 50 + R * Math.sin(a)]);
    }
    return K.poly(pts);
  }
  function octagonSign(inner, label) {
    return K.svg(
      K.rpoly(octagon(48), C.white, 3) +
      K.rpoly(octagon(45), C.red, 3) +
      '<polygon points="' + octagon(41.5) + '" fill="none" stroke="' + C.white + '" stroke-width="1.6"/>' +
      (inner || ''), '0 0 100 100', label);
  }
  function infoRect(inner, label) { return K.rect(inner || '', { w: 140, h: 100, label: label }); }
  function noParkingDisc(inner, label) { return K.circle(inner || '', { ring: C.red, ringWidth: 9, bg: C.blue, label: label }); }
  function plate(label) {
    return K.svg('<rect x="2" y="2" width="96" height="46" rx="5" fill="' + C.white + '" stroke="' + C.black + '" stroke-width="3"/>',
      '0 0 100 50', label);
  }
  function word(str, x, y, size, fill) { return K.text(str, x, y, size, { fill: fill || C.black, weight: 800 }); }

  // ---------- plain shapes
  reg('fig-shape-warning', 'مثلث بإطار أحمر', function (o, l) { return K.warn('', { label: l }); });
  reg('fig-shape-giveway', 'مثلث رأسه للأسفل', function (o, l) { return K.giveWay('', { label: l }); });
  reg('fig-shape-prohib', 'دائرة بإطار أحمر', function (o, l) { return K.prohib('', { label: l }); });
  reg('fig-shape-mand', 'دائرة زرقاء', function (o, l) { return K.mand('', { label: l }); });
  reg('fig-shape-octagon', 'مثمن أحمر', function (o, l) { return octagonSign('', l); });
  reg('fig-shape-info', 'مستطيل أزرق', function (o, l) { return infoRect('', l); });
  reg('fig-shape-noparking', 'دائرة زرقاء بإطار أحمر', function (o, l) { return noParkingDisc('', l); });
  reg('fig-shape-plate', 'لوحة إضافية بيضاء', function (o, l) { return plate(l); });
  reg('fig-shape-temp', 'مثلث أصفر للأعمال المؤقتة', function (o, l) { return K.warn('', { bg: C.yellow, label: l }); });

  // ---------- meaning badges: the meaning written inside its own shape
  reg('fig-mean-warning', 'المثلث: انتبه', function (o, l) { return K.warn(word('انتبه', 50, 64, 13.5), { label: l }); });
  reg('fig-mean-prohib', 'الدائرة الحمراء: ممنوع', function (o, l) { return K.prohib(word('ممنوع', 50, 51, 19), { label: l }); });
  reg('fig-mean-mand', 'الدائرة الزرقاء: لازم', function (o, l) { return K.mand(word('لازم', 50, 51, 23, C.white), { label: l }); });
  reg('fig-mean-info', 'المستطيل الأزرق: معلومة', function (o, l) { return infoRect(word('معلومة', 70, 51, 23, C.white), l); });
  reg('fig-mean-giveway', 'المثلث المقلوب: أفسح الطريق', function (o, l) { return K.giveWay(word('أفسح', 50, 33, 12), { label: l }); });
  reg('fig-mean-temp', 'الأصفر: أعمال مؤقتة', function (o, l) { return K.warn(word('مؤقت', 50, 65, 12), { bg: C.yellow, label: l }); });

  // ---------- family overview board (3 x 2 shapes, meaning under each)
  // embed a complete sign SVG as a group scaled into a box (nested <svg> would pick up the app's CSS)
  function nest(svgStr, x, y, w, h) {
    var m = /viewBox="([^"]+)"/.exec(svgStr), vb = m ? m[1].split(/[\s,]+/).map(Number) : [0, 0, 100, 100];
    var inner = svgStr.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    var s = Math.min(w / vb[2], h / vb[3]), dx = x + (w - vb[2] * s) / 2 - vb[0] * s, dy = y + (h - vb[3] * s) / 2 - vb[1] * s;
    return '<g transform="translate(' + dx.toFixed(2) + ' ' + dy.toFixed(2) + ') scale(' + s.toFixed(4) + ')">' + inner + '</g>';
  }
  reg('fig-shapes-family', 'عائلات الإشارات حسب الشكل', function (o, l) {
    var cells = [
      [K.warn(''), 'انتبه'], [K.prohib(''), 'ممنوع'], [K.mand(''), 'لازم'],
      [infoRect(''), 'معلومة'], [octagonSign('', ''), 'قف'], [K.giveWay(''), 'أفسح']
    ];
    var out = '<rect x="0" y="0" width="300" height="220" rx="14" fill="#141C2A"/>';
    cells.forEach(function (c, i) {
      // Arabic reading order: first cell on the right
      var col = 2 - (i % 3), row = Math.floor(i / 3), cx = 52 + col * 98, top = 8 + row * 107;
      out += nest(c[0], cx - 40, top, 80, 74);
      out += K.text(c[1], cx, top + 90, 17, { fill: '#EAE6DB', weight: 700 });
    });
    return K.svg(out, '0 0 300 220', l);
  });
})();
