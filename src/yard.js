/* yard.js : مقود yard simulator (اختبار الساحة / الباركنج)
 *
 * Classic script, no dependencies, attaches window.Yard. Full docs: docs/yard.md
 *
 *   Yard.exercises                         array of exercise definitions (data + small hook functions)
 *   Yard.get(id)                           one exercise
 *   Yard.mount(el, opts) -> controller     opts: {exercise, mode:'learn'|'test', onFinish(result), onEvent(e),
 *                                                 camera:'fit'|'follow', overlays, touch:'auto'|true|false,
 *                                                 sound, slow, emirate:'dubai'|'sharjah', params:{...}}
 *   ctl.restart() ctl.setMode(m) ctl.setExercise(id) ctl.pause() ctl.resume() ctl.destroy()
 *   ctl.demo()                             learn mode: watch the robot do it with the coach texts
 *   ctl._test                              test hook: {state(), set(inputs), press(action), step(sec), drive(prog), runDemo()}
 *   Yard.configure(overrides)              {car:{..}, phys:{..}, exercises:{<id>:{params,tol,limits,rules}}, emirates:{..}}
 *
 * World: metres. x = east, y = north (up on screen when the camera is not rotated).
 * Heading h: radians, counter-clockwise from east (north = PI/2). Car pose = centre of the REAR axle.
 * Steering s in -1..1 (+ = left), wheel angle = s * maxSteer. Speed v in m/s (+ forward, - reverse).
 */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  // ------------------------------------------------------------------ 0. small utils
  var PI = Math.PI, TAU = PI * 2, DEG = PI / 180;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function approach(v, t, d) { return v < t ? Math.min(t, v + d) : Math.max(t, v - d); }
  function wrap(a) { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; }
  function sgn(v) { return v > 0 ? 1 : (v < 0 ? -1 : 0); }
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }
  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function clone(o) {
    if (Array.isArray(o)) return o.map(clone);
    if (isObj(o)) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = clone(o[k]); return r; }
    return o;
  }
  function merge(dst, src) {
    if (!isObj(src)) return dst;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (isObj(src[k]) && isObj(dst[k])) merge(dst[k], src[k]);
      else dst[k] = clone(src[k]);
    }
    return dst;
  }
  function fmtTime(t) {
    t = Math.max(0, Math.floor(t));
    var m = Math.floor(t / 60), s = t % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // deterministic RNG (mulberry32) so the robot and tests can be reproducible
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------------ 1. geometry
  // pose {x, y, h}; local frame: lx forward from the rear axle, ly to the LEFT
  function toWorld(p, lx, ly) {
    var c = Math.cos(p.h), s = Math.sin(p.h);
    return [p.x + lx * c - ly * s, p.y + lx * s + ly * c];
  }
  function toLocal(p, wx, wy) {
    var c = Math.cos(p.h), s = Math.sin(p.h), dx = wx - p.x, dy = wy - p.y;
    return [dx * c + dy * s, -dx * s + dy * c];
  }
  // rectangle centred at (cx, cy), `len` along heading h, `wid` across
  function rectPoly(cx, cy, len, wid, h) {
    var c = Math.cos(h || 0), s = Math.sin(h || 0), a = len / 2, b = wid / 2;
    return [[cx + a * c - b * s, cy + a * s + b * c], [cx - a * c - b * s, cy - a * s + b * c],
      [cx - a * c + b * s, cy - a * s - b * c], [cx + a * c + b * s, cy + a * s - b * c]];
  }
  // axis aligned rectangle from corners
  function boxPoly(x0, y0, x1, y1) {
    var a = Math.min(x0, x1), b = Math.min(y0, y1), c = Math.max(x0, x1), d = Math.max(y0, y1);
    return [[a, b], [c, b], [c, d], [a, d]];
  }
  // thick segment as a rectangle
  function segPoly(ax, ay, bx, by, w) {
    var dx = bx - ax, dy = by - ay, l = hyp(dx, dy) || 1e-6;
    return rectPoly((ax + bx) / 2, (ay + by) / 2, l, w, Math.atan2(dy, dx));
  }
  function polyBox(poly) {
    var b = [1e9, 1e9, -1e9, -1e9];
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i];
      if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1];
      if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1];
    }
    return b;
  }
  function boxesOverlap(a, b) { return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]; }
  function pointInPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    return hyp(px - (ax + t * dx), py - (ay + t * dy));
  }
  // signed-ish distance: 0 when inside, else distance to the polygon border
  function polyDist(x, y, poly) {
    if (pointInPoly(x, y, poly)) return 0;
    var d = 1e9;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
    return d;
  }
  // minimum distance between two convex polygons (0 when they overlap)
  function polyPolyDist(a, b) {
    if (polysOverlap(a, b)) return 0;
    var d = 1e9, i, j;
    for (i = 0; i < a.length; i++) {
      for (j = 0; j < b.length; j++) {
        var k = (j + 1) % b.length;
        d = Math.min(d, segDist(a[i][0], a[i][1], b[j][0], b[j][1], b[k][0], b[k][1]));
      }
    }
    for (i = 0; i < b.length; i++) {
      for (j = 0; j < a.length; j++) {
        var m = (j + 1) % a.length;
        d = Math.min(d, segDist(b[i][0], b[i][1], a[j][0], a[j][1], a[m][0], a[m][1]));
      }
    }
    return d;
  }
  function project(poly, ax, ay) {
    var mn = 1e18, mx = -1e18;
    for (var i = 0; i < poly.length; i++) { var d = poly[i][0] * ax + poly[i][1] * ay; if (d < mn) mn = d; if (d > mx) mx = d; }
    return [mn, mx];
  }
  // separating axis test for convex polygons
  function polysOverlap(a, b) {
    var polys = [a, b];
    for (var q = 0; q < 2; q++) {
      var p = polys[q];
      for (var i = 0; i < p.length; i++) {
        var j = (i + 1) % p.length, ax = -(p[j][1] - p[i][1]), ay = p[j][0] - p[i][0];
        var pa = project(a, ax, ay), pb = project(b, ax, ay);
        if (pa[1] < pb[0] || pb[1] < pa[0]) return false;
      }
    }
    return true;
  }
  function circleHitsPoly(cx, cy, r, poly) { return polyDist(cx, cy, poly) < r; }
  function polyCentroid(poly) {
    var x = 0, y = 0;
    for (var i = 0; i < poly.length; i++) { x += poly[i][0]; y += poly[i][1]; }
    return [x / poly.length, y / poly.length];
  }

  // ------------------------------------------------------------------ 2. car + physics constants
  // Typical UAE driving-school sedan (automatic). All tunable through Yard.configure({car:{..}}).
  var CAR = {
    length: 4.4, width: 1.75, wheelbase: 2.6, frontOverhang: 0.9,   // rear overhang = length - wheelbase - front
    track: 1.52, tyreLen: 0.64, tyreWid: 0.21,
    maxSteerDeg: 35,          // at the (virtual) front wheel, turning circle ~10.4 m kerb to kerb
    steerTime: 1.2,           // seconds from centre to full lock
    wheelTurns: 1.5,          // steering-wheel turns from centre to full lock (for the HUD)
    mirrorX: 1.95,            // side mirrors, metres ahead of the rear axle
    driverX: 1.2, driverY: 0.38,  // driver's eyes (left-hand drive: the driver sits on the LEFT)
    color: '#E9E6DE'
  };
  var PHYS = {
    g: 9.81,
    creepKmh: 5,              // idle creep speed in D and R with the brake released
    creepAccel: 1.8,          // m/s2 creep pull at full idle torque (just beats a 15% ramp, after a short roll-back)
    creepIdle: 0.25,          // creep torque fraction while held on the brake (neutral-idle control)
    creepBuild: 1.0,          // seconds for creep torque to build up after the brake is released
    thrAccel: 2.8,            // extra m/s2 at full accelerator
    engineBrake: 0.6,         // m/s2 when lifting off above the target speed
    brakeMax: 8.0,            // m/s2 full braking with ABS on dry asphalt
    hbMax: 3.0,               // handbrake holding capacity
    rollRes: 0.12,            // rolling resistance
    revCapKmh: 8,             // reverse speed cap
    thrUp: 0.55, thrDown: 0.15, brkUp: 0.22, brkDown: 0.12,   // pedal ramp times (s) for on/off inputs
    dt: 1 / 120,
    obsWindow: 8,             // an observation counts for this many seconds
    stillSpeed: 0.03          // below this the car counts as stopped
  };
  function rearOverhang(C) { return C.length - C.wheelbase - C.frontOverhang; }
  function steerMax(C) { return C.maxSteerDeg * DEG; }
  function turnRadius(C) { return C.wheelbase / Math.tan(steerMax(C)); }   // rear axle centre, full lock

  // car body as a convex octagon in the local frame (rounded corners chamfered)
  function bodyLocal(C) {
    var ro = rearOverhang(C), f = C.wheelbase + C.frontOverhang, w = C.width / 2, cf = 0.2, cr = 0.14;
    return [[-ro, w - cr], [-ro + cr, w], [f - cf, w], [f, w - cf], [f, -w + cf], [f - cf, -w], [-ro + cr, -w], [-ro, -w + cr]];
  }
  // front wheel angles (left, right) with Ackermann geometry
  function ackermann(C, s) {
    var d = s * steerMax(C);
    if (Math.abs(d) < 1e-4) return [0, 0];
    var R = C.wheelbase / Math.tan(d), t = C.track / 2;
    return [Math.atan(C.wheelbase / (R - t)), Math.atan(C.wheelbase / (R + t))];
  }
  // world geometry of the car at pose p with steering s
  function carGeom(C, p, s) {
    var body = bodyLocal(C).map(function (q) { return toWorld(p, q[0], q[1]); });
    var ang = ackermann(C, s || 0), t = C.track / 2, L = C.wheelbase;
    var wl = [[L, t, ang[0]], [L, -t, ang[1]], [0, t, 0], [0, -t, 0]];   // fl, fr, rl, rr
    var tyres = wl.map(function (w) {
      var c = toWorld(p, w[0], w[1]);
      return rectPoly(c[0], c[1], C.tyreLen, C.tyreWid, p.h + w[2]);
    });
    var centres = wl.map(function (w) { return toWorld(p, w[0], w[1]); });
    return { body: body, tyres: tyres, wheels: centres, angles: ang };
  }

  // ------------------------------------------------------------------ 3. layout builder
  // Every exercise builds its layout from its params, so Yard.configure() can re-tune dimensions.
  function Layout() {
    var L = {
      asphalt: [], areas: [], lines: [], kerbs: [], poles: [], cones: [], walls: [], ramps: [],
      zones: {}, labels: [], hatch: [], arrows: [], n: 0, bounds: null
    };
    function nid(p) { L.n++; return p + L.n; }
    L.road = function (poly, color) { L.asphalt.push({ poly: poly, color: color || null }); return L; };
    L.area = function (poly, color, o) { L.areas.push({ poly: poly, color: color, o: o || {} }); return L; };
    L.line = function (ax, ay, bx, by, o) {
      o = o || {};
      var w = o.w || 0.12;
      L.lines.push({ id: o.id || nid('line'), a: [ax, ay], b: [bx, by], w: w, color: o.color || 'white',
        dash: o.dash || null, rule: !!o.rule, poly: segPoly(ax, ay, bx, by, w) });
      return L;
    };
    // kerb stone: centreline a-b, width w (default 0.3). Wheels hitting it stop the car.
    L.kerb = function (ax, ay, bx, by, o) {
      o = o || {};
      var w = o.w || 0.3;
      L.kerbs.push({ id: o.id || nid('kerb'), a: [ax, ay], b: [bx, by], w: w, poly: segPoly(ax, ay, bx, by, w), style: o.style || 'bw' });
      return L;
    };
    L.pole = function (x, y, o) { o = o || {}; L.poles.push({ id: o.id || nid('pole'), x: x, y: y, r: o.r || 0.1, x0: x, y0: y }); return L; };
    L.cone = function (x, y, o) { o = o || {}; L.cones.push({ id: o.id || nid('cone'), x: x, y: y, r: o.r || 0.2, x0: x, y0: y, knocked: false, rot: 0 }); return L; };
    L.wall = function (poly, o) { o = o || {}; L.walls.push({ id: o.id || nid('wall'), poly: poly, kind: o.kind || 'wall', h: o.h || 0 }); return L; };
    // ramp along +y: flat 0 before y0, rises to height hgt at y1, flat to y2, falls to 0 at y3. x0..x1 wide.
    L.ramp = function (o) { o.id = o.id || nid('ramp'); L.ramps.push(o); return L; };
    L.zone = function (name, poly, o) { L.zones[name] = { poly: poly, o: o || {} }; return L; };
    L.label = function (x, y, text, o) { L.labels.push({ x: x, y: y, text: text, o: o || {} }); return L; };
    L.hatchArea = function (poly, color) { L.hatch.push({ poly: poly, color: color || 'white' }); return L; };
    L.arrow = function (x, y, h, o) { L.arrows.push({ x: x, y: y, h: h, o: o || {} }); return L; };
    L.finish = function (margin) {
      var b = [1e9, 1e9, -1e9, -1e9];
      function add(poly) { var q = polyBox(poly); b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); }
      L.asphalt.forEach(function (a) { add(a.poly); });
      L.kerbs.forEach(function (k) { add(k.poly); });
      L.walls.forEach(function (w) { add(w.poly); });
      var m = margin == null ? 1.5 : margin;
      L.bounds = L.bounds || [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
      return L;
    };
    return L;
  }
  function rampHeight(r, x, y) {
    if (x < r.x0 || x > r.x1 || y <= r.y0 || y >= r.y3) return 0;
    if (y < r.y1) return r.hgt * (y - r.y0) / (r.y1 - r.y0);
    if (y <= r.y2) return r.hgt;
    return r.hgt * (r.y3 - y) / (r.y3 - r.y2);
  }
  function groundHeight(lay, x, y) {
    var h = 0;
    for (var i = 0; i < lay.ramps.length; i++) h = Math.max(h, rampHeight(lay.ramps[i], x, y));
    return h;
  }

  // ------------------------------------------------------------------ 4. texts
  // Mistake codes -> Arabic (short, spoken style like an examiner). No tanwin, no shadda, no final full stop.
  var TXT = {
    hit_pole: 'لمست العمود',
    hit_cone: 'لمست الكون',
    hit_kerb: 'لمست الرصيف',
    hit_wall: 'خبطت بالحاجز',
    touch_line: 'لمست الخط',
    rollback: 'رجعت لورا أكتر من المسموح',
    no_obs_reverse: 'ما عملت نظرة للمرايا قبل ما ترجع',
    no_obs_move: 'ما عملت نظرة للمرايا والنقطة العمياء قبل ما تتحرك',
    no_indicator: 'ما شغلت الغماز',
    wrong_indicator: 'شغلت الغماز عالجهة الغلط',
    moves: 'استعملت حركات أكتر من المسموح',
    moves_max: 'عدد الحركات تجاوز الحد الأقصى',
    time: 'خلص الوقت',
    speed: 'سرعتك أعلى من المسموح',
    not_in_bay: 'السيارة مش جوا المكان المحدد',
    wheels_out: 'في عجل برا الخطوط',
    angle: 'السيارة مش مستقيمة جوا المكان',
    far_kerb: 'السيارة بعيدة كتير عن الرصيف',
    handbrake: 'مشيت والهاندبريك مرفوع',
    stop_line: 'ما وقفت عند الخط بالضبط',
    no_hill_stop: 'ما وقفت على المطلع عند الخط',
    hill_time: 'تأخرت أكتر من 60 ثانية لتنطلق على المطلع',
    no_doors: 'ما تأكدت إنو الأبواب مسكرة',
    slow_reaction: 'تأخرت كتير لتدوس فرامل',
    stop_distance: 'مسافة الوقوف أطول من المسموح',
    swerve: 'السيارة انحرفت وقت الفرملة',
    low_speed: 'ما وصلت للسرعة المطلوبة',
    slalom: 'ما مشيت بين الأقماع بالترتيب',
    wrong_way: 'السيارة مش بالاتجاه المطلوب',
    no_belt: 'مشيت بدون حزام الأمان',
    no_mirrors: 'ما عدلت المرايات قبل ما تمشي',
    no_seat: 'ما عدلت المقعد قبل ما تمشي',
    order: 'ترتيب خطوات التجهيز مش صح',
    engine_no_brake: 'شغلت المحرك ورجلك مش عالفرامل',
    not_finished: 'ما كملت التمرين',
    stopped_short: 'ما وصلت لخط النهاية'
  };
  // Test-mode weight of each mistake. points = demerit points (RTA style: 4 or more in one manoeuvre = fail);
  // fatal = immediate fail (EDI / SDI published list: outside the lines, kerb or pole, time, 30 cm roll-back, braking distance...).
  var RULES = {
    hit_pole: { fatal: true }, hit_wall: { fatal: true }, hit_kerb: { fatal: true }, hit_cone: { points: 2 },
    touch_line: { points: 1 }, rollback: { fatal: true }, no_obs_reverse: { points: 1 }, no_obs_move: { points: 1 },
    no_indicator: { points: 1 }, wrong_indicator: { points: 1 }, moves: { points: 1 }, moves_max: { fatal: true }, time: { fatal: true },
    speed: { points: 1 }, not_in_bay: { fatal: true }, wheels_out: { points: 2 }, angle: { points: 1 },
    far_kerb: { points: 1 }, handbrake: { points: 1 }, stop_line: { points: 1 }, no_hill_stop: { fatal: true }, hill_time: { fatal: true },
    slow_reaction: { points: 2 }, stop_distance: { fatal: true }, swerve: { fatal: true }, low_speed: { fatal: true },
    slalom: { fatal: true }, wrong_way: { fatal: true }, no_belt: { fatal: true }, no_mirrors: { points: 1 }, no_doors: { points: 1 },
    no_seat: { points: 1 }, order: { points: 1 }, engine_no_brake: { points: 1 }, not_finished: { fatal: true },
    stopped_short: { points: 1 }
  };
  var PASS_DEMERITS = 4, DEMERIT_SCORE = 15;   // pass = no fatal mistake and fewer than 4 demerit points; score = 100 - 15 per point
  // friendly hints (learn + test), shown as toasts
  var HINT = {
    gearBrake: 'دوس فرامل أول، وبعدين غير الغيار',
    gearStop: 'وقف السيارة تماما قبل ما تغير الغيار',
    engineOff: 'شغل المحرك أول',
    engineBrake: 'دوس فرامل قبل ما تشغل المحرك',
    engineP: 'المحرك بيشتغل والغيار على P بس',
    hbOn: 'الهاندبريك مرفوع، نزله قبل ما تمشي',
    obsDone: 'تمام، شفت المرايات والنقطة العمياء',
    notThere: 'لسا ما وصلت للمكان المطلوب',
    slowDown: 'بشويش، خفف السرعة',
    lineTouch: 'انتبه، العجل لمس الخط',
    paused: 'متوقف مؤقتا'
  };

  // ------------------------------------------------------------------ 5. simulation core (pure, no DOM)
  // inst = built exercise instance (see buildInstance): {def, P, lay, start, ghost, goal, tol, limits, rules, steps, signal, obsAt}
  function Sim(inst, o) {
    this.inst = inst; this.def = inst.def; this.lay = inst.lay;
    this.mode = o.mode === 'test' ? 'test' : 'learn';
    this.C = o.car; this.K = o.phys;
    this.seed = o.seed == null ? ((Math.random() * 1e9) >>> 0) : o.seed;
    this.listeners = [];
    this.reset();
  }
  var SP = Sim.prototype;
  SP.on = function (fn) { this.listeners.push(fn); };
  SP.emit = function (e) {
    e.t = this.st ? this.st.t : 0;
    for (var i = 0; i < this.listeners.length; i++) {
      try { this.listeners[i](e); } catch (err) { if (W.console) W.console.error(err); }
    }
  };
  SP.reset = function () {
    var inst = this.inst, s0 = inst.start, lay = this.lay;
    this.rand = rng(this.seed);
    lay.cones.forEach(function (c) { c.x = c.x0; c.y = c.y0; c.knocked = false; c.rot = 0; c.hitT = -9; });
    lay.poles.forEach(function (p) { p.hitT = -9; });
    lay.kerbs.forEach(function (k) { k.hitT = -9; });
    lay.walls.forEach(function (w) { w.hitT = -9; });
    lay.lines.forEach(function (l) { l.hitT = -9; });
    this.input = { thr: 0, brk: 0, steer: 0, wheel: null };
    this.st = {
      x: s0.x, y: s0.y, h: s0.h, v: 0, a: 0, s: s0.steer || 0, sT: s0.steer || 0, thr: 0, brk: 0, pitch: 0,
      gear: s0.gear || 'P', hb: !!s0.hb, engine: s0.engine !== false, ind: null, indArm: false, prevKey: 0,
      t: 0, odo: 0, dist: 0, kmh: 0, moves: 0, segDir: 0, moving: false, stillT: 0,
      obsT: -99, obsUsed: -99, obsCount: 0, creepF: this.K.creepIdle, anchor: 0, rb: 0, maxRollBack: 0, maxKmh: 0,
      mistakes: [], codes: {}, touched: {}, lastHit: -9, finished: false, result: null,
      step: 0, stepT: 0, flags: {}, hbDist: 0, sigChecked: false, parkedT: 0
    };
    this.geom = carGeom(this.C, this.st, this.st.s);
    if (this.def.init) this.def.init(this);
    this.emit({ type: 'start', exercise: this.def.id, mode: this.mode });
    this.coach();
  };
  // named points on the car, world coordinates
  SP.pt = function (name) {
    var C = this.C, st = this.st, ro = rearOverhang(C), f = C.wheelbase + C.frontOverhang, w = C.width / 2;
    var P = {
      rearAxle: [0, 0], frontAxle: [C.wheelbase, 0], rearBumper: [-ro, 0], frontBumper: [f, 0], centre: [(f - ro) / 2, 0],
      fl: [f, w], fr: [f, -w], rl: [-ro, w], rr: [-ro, -w], mirrorL: [C.mirrorX, w + 0.18], mirrorR: [C.mirrorX, -w - 0.18],
      driver: [C.driverX, C.driverY], rearWheelR: [0, -C.track / 2], rearWheelL: [0, C.track / 2],
      frontWheelR: [C.wheelbase, -C.track / 2], frontWheelL: [C.wheelbase, C.track / 2]
    }[name] || [0, 0];
    return toWorld(st, P[0], P[1]);
  };
  SP.hdeg = function () { var d = this.st.h / DEG; d = d % 360; return d < 0 ? d + 360 : d; };
  SP.stopped = function (t) { return this.st.stillT >= (t == null ? 0.25 : t); };
  SP.obsOK = function () { var st = this.st; return st.obsT > st.obsUsed && st.t - st.obsT <= this.K.obsWindow; };
  SP.hint = function (text, kind) { this.st.hint = { text: text, t: this.st.t }; this.emit({ type: 'hint', text: text, kind: kind || 'info' }); };
  SP.say = function (text) { this.st.say = { text: text, t: this.st.t }; this.emit({ type: 'say', text: text }); };

  SP.mistake = function (code, extra) {
    var st = this.st;
    if (st.finished) return;
    var rule = this.inst.rules[code];
    if (!rule || rule.off) return;
    if (st.codes[code] && !(extra && extra.repeat)) return;
    st.codes[code] = (st.codes[code] || 0) + 1;
    var m = { code: code, text: (extra && extra.text) || TXT[code] || code, fatal: !!rule.fatal,
      points: rule.fatal ? 0 : (rule.points || 0), t: Math.round(st.t * 10) / 10 };
    st.mistakes.push(m);
    this.emit({ type: 'mistake', code: code, text: m.text, fatal: m.fatal });
    if (this.mode === 'test' && m.fatal) this.finish(false, code);
  };

  SP.action = function (name, arg) {
    var st = this.st;
    if (st.finished) return false;
    if (name === 'gear') return this.shift(arg);
    if (name === 'ind') {
      st.ind = st.ind === arg ? null : (arg === 'L' || arg === 'R' ? arg : null);
      st.indArm = false;
      this.emit({ type: 'indicator', side: st.ind });
      return true;
    }
    if (name === 'obs') { st.obsT = st.t; st.obsCount++; this.emit({ type: 'observe' }); return true; }
    if (name === 'hb') { st.hb = arg == null ? !st.hb : !!arg; st.hbDist = 0; this.emit({ type: 'handbrake', on: st.hb }); return true; }
    if (name === 'centre') { st.sT = 0; if (this.input.wheel != null) this.input.wheel = 0; return true; }
    if (this.def.action) return this.def.action(this, name, arg);
    return false;
  };
  SP.shift = function (g) {
    var st = this.st;
    if (['P', 'R', 'N', 'D'].indexOf(g) < 0) return false;
    if (st.gear === g) return true;
    if (!st.engine) { this.hint(HINT.engineOff, 'warn'); return false; }
    if (Math.abs(st.v) > 0.05) { this.hint(HINT.gearStop, 'warn'); return false; }
    if (st.brk < 0.3 && this.input.brk < 0.5) { this.hint(HINT.gearBrake, 'warn'); return false; }
    var from = st.gear;
    st.gear = g;
    this.emit({ type: 'gear', from: from, to: g });
    if (this.def.onGear) this.def.onGear(this, from, g);
    return true;
  };

  SP.step = function (dt) {
    var st = this.st, K = this.K, C = this.C, inp = this.input, inst = this.inst, lay = this.lay;
    if (st.finished) return;
    st.t += dt;
    // pedals (on/off inputs are ramped like a real foot)
    st.thr = approach(st.thr, clamp(inp.thr, 0, 1), dt / (inp.thr > st.thr ? K.thrUp : K.thrDown));
    st.brk = approach(st.brk, clamp(inp.brk, 0, 1), dt / (inp.brk > st.brk ? K.brkUp : K.brkDown));
    // steering: keys hold (turn while held, stay when released), wheel/robot give an absolute target
    var ks = inp.steer;
    if (inp.wheel != null) st.sT = clamp(inp.wheel, -1, 1);
    else if (ks) st.sT = ks > 0 ? 1 : -1;
    else if (st.prevKey) st.sT = st.s;
    st.prevKey = ks;
    st.s = approach(st.s, st.sT, dt / C.steerTime);

    // longitudinal forces along the car axis
    var gdir = !st.engine ? 0 : (st.gear === 'D' ? 1 : (st.gear === 'R' ? -1 : 0));
    var held = st.brk > 0.5 && Math.abs(st.v) < 0.05;
    st.creepF = approach(st.creepF, held ? K.creepIdle : 1, dt / K.creepBuild);
    var aDrive = 0;
    if (gdir) {
      var creepV = K.creepKmh / 3.6, lim = inst.limits;
      var capK = gdir > 0 ? (lim.capKmh || 15) : Math.min(lim.capRevKmh || K.revCapKmh, lim.capKmh || 15);
      var vT = creepV + st.thr * Math.max(0, capK / 3.6 - creepV), err = vT - st.v * gdir;
      var aE = err > 0 ? Math.min(err * 2.0, K.creepAccel * st.creepF + st.thr * K.thrAccel) : Math.max(err * 0.8, -K.engineBrake);
      aDrive = gdir * aE;
    }
    if (lay.ramps.length) {
      var fa = toWorld(st, C.wheelbase, 0);
      var sinP = clamp((groundHeight(lay, fa[0], fa[1]) - groundHeight(lay, st.x, st.y)) / C.wheelbase, -0.5, 0.5);
      st.pitch = sinP;
      aDrive -= K.g * sinP;
    }
    var fric = st.brk * K.brakeMax + (st.hb ? K.hbMax : 0) + K.rollRes;
    var v = st.v;
    if (st.gear === 'P') v = 0;
    else if (Math.abs(v) < 1e-3) {
      v = Math.abs(aDrive) <= fric ? 0 : (aDrive - sgn(aDrive) * fric) * dt;
    } else {
      var nv = v + (aDrive - sgn(v) * fric) * dt;
      v = sgn(nv) !== sgn(v) ? 0 : nv;
    }

    // kinematic bicycle model about the rear axle
    var d = v * dt;
    if (d !== 0) {
      var prev = { x: st.x, y: st.y, h: st.h };
      var dh = d / C.wheelbase * Math.tan(st.s * steerMax(C)), hm = st.h + dh / 2;
      st.x += d * Math.cos(hm); st.y += d * Math.sin(hm); st.h = wrap(st.h + dh);
      var g2 = carGeom(C, st, st.s);
      if (this.collide(g2)) { st.x = prev.x; st.y = prev.y; st.h = prev.h; v = 0; d = 0; }
      else this.geom = g2;
    } else this.geom = carGeom(C, st, st.s);
    st.a = (v - st.v) / dt;
    st.v = v;

    // bookkeeping
    var sp = Math.abs(v);
    st.kmh = sp * 3.6;
    st.dist += Math.abs(d); st.odo += d;
    if (st.kmh > st.maxKmh) st.maxKmh = st.kmh;
    if (sp < K.stillSpeed) {
      st.stillT += dt;
      if (st.moving && st.stillT > 0.15) { st.moving = false; this.emit({ type: 'stop' }); }
    } else {
      if (!st.moving && sp > 0.08) this.moveStart(sgn(v), st.stillT);
      if (st.moving) st.stillT = 0;
    }
    // roll-back: motion against the selected gear (D/N/P backwards, R forwards)
    var back = st.gear === 'R' ? v > 0.01 : v < -0.01;
    if (!back) { st.anchor = st.odo; st.rb = 0; }
    else {
      st.rb = Math.abs(st.odo - st.anchor);
      if (st.rb > st.maxRollBack) st.maxRollBack = st.rb;
      if (inst.limits.maxRollBack != null && Math.abs(st.pitch) > 0.01 && st.rb > inst.limits.maxRollBack) this.mistake('rollback');
    }
    if (inst.limits.maxKmh && st.kmh > inst.limits.maxKmh + 0.5) this.mistake('speed');
    if (st.hb && d) { st.hbDist += Math.abs(d); if (st.hbDist > 0.5) this.mistake('handbrake'); }
    // indicator self-cancel after the wheel comes back (like a real car)
    if (st.ind) {
      var sd = st.ind === 'L' ? st.s : -st.s;
      if (sd > 0.5) st.indArm = true;
      else if (st.indArm && sd < 0.1 && sp > 0.3) { st.ind = null; st.indArm = false; this.emit({ type: 'indicator', side: null, auto: true }); }
    }
    if (this.mode === 'test' && inst.limits.time && st.t > inst.limits.time) { this.mistake('time'); this.finish(false, 'time'); return; }
    if (this.def.update) this.def.update(this, dt);
    if (!st.finished) this.checkGoal();
    this.coach();
  };

  SP.moveStart = function (dir, stopDur) {
    var st = this.st, inst = this.inst;
    st.moving = true;
    var newSeg = dir !== st.segDir;
    if (newSeg) { st.moves++; st.segDir = dir; }
    var first = st.moves === 1 && newSeg, longStop = stopDur >= 2;
    this.emit({ type: 'moveStart', dir: dir, moves: st.moves, newSeg: newSeg });
    var need = dir < 0 ? (newSeg || longStop) : (first || longStop || (inst.obsAt === 'every' && newSeg));
    if (need) {
      if (!this.obsOK()) this.mistake(dir < 0 ? 'no_obs_reverse' : 'no_obs_move', { repeat: true });
      st.obsUsed = st.obsT;
    }
    var sig = inst.signal;
    if (sig && !st.sigChecked && ((sig.at === 'reverse' && dir < 0) || (sig.at === 'first' && first))) {
      st.sigChecked = true;
      if (st.ind !== sig.side) this.mistake(st.ind ? 'wrong_indicator' : 'no_indicator');
    }
    if (inst.limits.maxMoves && st.moves > inst.limits.maxMoves) this.mistake('moves');
    if (inst.limits.maxMovesFail && st.moves > inst.limits.maxMovesFail) this.mistake('moves_max');
    if (this.def.onMove) this.def.onMove(this, dir, newSeg);
  };

  // returns true when a solid obstacle blocks this pose; knocks cones and records line touches
  SP.collide = function (g) {
    var lay = this.lay, st = this.st, body = g.body, bb = polyBox(body), i, j, solid = null;
    // soft yard boundary: the car cannot leave the exercise area (open road ends), no mistake, just a hint
    var lb = lay.bounds, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
    if (lb && (cx < lb[0] || cx > lb[2] || cy < lb[1] || cy > lb[3])) {
      if (!st.flags.edgeHint) { st.flags.edgeHint = true; this.hint('هون آخر الساحة، ارجع للمكان المطلوب', 'warn'); }
      return true;
    }
    for (i = 0; i < lay.poles.length && !solid; i++) {
      var p = lay.poles[i];
      if (p.x < bb[0] - 0.4 || p.x > bb[2] + 0.4 || p.y < bb[1] - 0.4 || p.y > bb[3] + 0.4) continue;
      if (circleHitsPoly(p.x, p.y, p.r, body)) solid = ['pole', p];
    }
    for (i = 0; i < lay.walls.length && !solid; i++) {
      if (boxesOverlap(bb, polyBox(lay.walls[i].poly)) && polysOverlap(lay.walls[i].poly, body)) solid = ['wall', lay.walls[i]];
    }
    for (i = 0; i < lay.kerbs.length && !solid; i++) {
      var k = lay.kerbs[i];
      if (!boxesOverlap(bb, polyBox(k.poly))) continue;
      for (j = 0; j < 4; j++) if (polysOverlap(g.tyres[j], k.poly)) { solid = ['kerb', k]; break; }
    }
    if (solid) { this.contact(solid[0], solid[1]); return true; }
    for (i = 0; i < lay.cones.length; i++) {
      var c = lay.cones[i];
      if (c.knocked || c.x < bb[0] - 0.5 || c.x > bb[2] + 0.5 || c.y < bb[1] - 0.5 || c.y > bb[3] + 0.5) continue;
      if (circleHitsPoly(c.x, c.y, c.r, body)) {
        c.knocked = true;
        var push = sgn(st.v) || 1, cc = polyCentroid(body), dx = c.x - cc[0], dy = c.y - cc[1], dl = hyp(dx, dy) || 1;
        c.x += dx / dl * 0.5 + Math.cos(st.h) * 0.4 * push; c.y += dy / dl * 0.5 + Math.sin(st.h) * 0.4 * push; c.rot = 1;
        this.contact('cone', c);
      }
    }
    for (i = 0; i < lay.lines.length; i++) {
      var ln = lay.lines[i];
      if (!ln.rule || st.touched['line:' + ln.id] || !boxesOverlap(bb, polyBox(ln.poly))) continue;
      for (j = 0; j < 4; j++) if (polysOverlap(g.tyres[j], ln.poly)) { this.contact('line', ln); break; }
    }
    return false;
  };
  SP.contact = function (kind, obj) {
    var st = this.st, key = kind + ':' + obj.id, first = !st.touched[key];
    obj.hitT = st.t;
    st.touched[key] = true;
    if (first || st.t - st.lastHit > 1.2) this.emit({ type: 'collision', kind: kind, id: obj.id, first: first });
    st.lastHit = st.t;
    if (first) this.mistake(kind === 'line' ? 'touch_line' : 'hit_' + kind, { repeat: true });
  };

  // final pose vs the target zone
  SP.poseCheck = function () {
    var inst = this.inst, g = inst.goal, st = this.st, C = this.C;
    var z = g && g.zone ? this.lay.zones[g.zone] : null;
    if (!z) return null;
    var tyrePts = [].concat.apply([], this.geom.tyres);
    var inPoly = function (pts) { return pts.every(function (q) { return pointInPoly(q[0], q[1], z.poly); }); };
    var he = g.h == null ? 0 : Math.abs(wrap(st.h - g.h));
    if (g.dirFree) he = Math.min(he, PI - he);
    var cc = this.pt('centre'), gh = inst.ghost, lat = 0, lon = 0;
    if (gh) {
      var gc = toWorld(gh, (C.wheelbase + C.frontOverhang - rearOverhang(C)) / 2, 0), loc = toLocal({ x: gc[0], y: gc[1], h: gh.h }, cc[0], cc[1]);
      lon = loc[0]; lat = loc[1];
    }
    var withMirrors = this.geom.body.concat([this.pt('mirrorL'), this.pt('mirrorR')]);
    return { body: inPoly(withMirrors), wheels: inPoly(tyrePts), centre: pointInPoly(cc[0], cc[1], z.poly), ang: he / DEG, lat: lat, lon: lon };
  };
  SP.checkGoal = function () {
    var inst = this.inst, g = inst.goal, st = this.st;
    if (!g || g.custom || st.dist < 1) return;
    if (this.def.goalReady && !this.def.goalReady(this)) return;
    if (st.stillT < (g.stopT || 0.4)) { st.parkedT = 0; return; }
    if (g.needP && st.gear !== 'P') return;
    var pc = this.poseCheck();
    if (!pc) return;
    var tol = inst.tol || {};
    var inside = tol.inside === 'wheels' ? pc.wheels : (tol.inside === 'centre' ? pc.centre : pc.body);
    var angOK = tol.ang == null || pc.ang <= tol.ang;
    if (!g.needP) {   // zone goals finish only when the car is really there
      if (inside && (angOK || tol.angSoft)) { this.finalChecks(pc); this.finish(true, 'goal'); }
      return;
    }
    if (st.flags.pWarned === st.moves) return;
    if (!inside) {
      if (this.mode === 'learn') { st.flags.pWarned = st.moves; this.hint(HINT.notThere, 'warn'); return; }
      this.mistake('not_in_bay'); this.finish(false, 'not_in_bay'); return;
    }
    this.finalChecks(pc);
    this.finish(true, 'goal');
  };
  SP.finalChecks = function (pc) {
    var tol = this.inst.tol || {};
    if (tol.wheels && !pc.wheels) this.mistake('wheels_out');
    if (tol.ang != null && pc.ang > tol.ang) this.mistake('angle');
    if (tol.lat != null && Math.abs(pc.lat) > tol.lat) this.mistake(tol.latCode || 'far_kerb');
    if (this.def.evaluate) this.def.evaluate(this, pc);
  };
  SP.finish = function (reached, why) {
    var st = this.st;
    if (st.finished) return;
    if (!reached && why === 'abort') this.mistake('not_finished');
    st.finished = true;
    var pts = 0, fatal = false;
    st.mistakes.forEach(function (m) { pts += m.points; if (m.fatal) fatal = true; });
    var score = clamp(100 - pts * DEMERIT_SCORE, 0, 100);
    if (!reached || fatal) score = Math.min(score, 40);
    var stats = { moves: st.moves, maxRollBack: Math.round(st.maxRollBack * 100) / 100, maxKmh: Math.round(st.maxKmh * 10) / 10,
      distance: Math.round(st.dist * 10) / 10, observations: st.obsCount };
    var pc = reached ? this.poseCheck() : null;
    if (pc) { stats.angleErr = Math.round(pc.ang * 10) / 10; stats.lateral = Math.round(pc.lat * 100) / 100; }
    if (this.def.stats) merge(stats, this.def.stats(this));
    st.result = {
      exercise: this.def.id, mode: this.mode, passed: !!reached && !fatal && pts < PASS_DEMERITS, score: score, demerits: pts,
      time: Math.round(st.t * 10) / 10, reason: why || '',
      mistakes: st.mistakes.map(function (m) { return { code: m.code, text: m.text, fatal: m.fatal, points: m.points }; }), stats: stats
    };
    this.emit({ type: 'finish', result: st.result });
  };
  SP.coach = function () {
    var steps = this.inst.steps, st = this.st;
    if (!steps) return;
    var guard = 0;
    while (st.step < steps.length && guard++ < steps.length) {
      var sp = steps[st.step];
      if (sp.done && sp.done(this, st)) {
        st.step++; st.stepT = st.t;
        this.emit({ type: 'step', index: st.step, id: steps[st.step] ? steps[st.step].id : 'end' });
      } else break;
    }
  };
  SP.stepText = function () {
    var steps = this.inst.steps, st = this.st;
    if (!steps || st.step >= steps.length) return null;
    var sp = steps[st.step];
    return { index: st.step, count: steps.length, text: typeof sp.text === 'function' ? sp.text(this) : sp.text, keys: sp.keys || null, touch: sp.touch || null, id: sp.id };
  };
  SP.snapshot = function () {
    var st = this.st, f = this.pt('frontBumper'), r = this.pt('rearBumper');
    return { x: st.x, y: st.y, h: this.hdeg(), v: st.v, kmh: st.kmh, gear: st.gear, steer: st.s, thr: st.thr, brk: st.brk,
      hb: st.hb, ind: st.ind, t: st.t, moves: st.moves, rb: st.rb, maxRollBack: st.maxRollBack, pitch: st.pitch,
      front: f, rear: r, finished: st.finished, result: st.result, step: st.step, dist: st.dist,
      mistakes: st.mistakes.map(function (m) { return m.code; }), flags: st.flags, engine: st.engine };
  };

  // ------------------------------------------------------------------ 6. robot driver (learn-mode demo + automated tests)
  // A program is a list of phases, driven through the SAME inputs a learner uses:
  //   {do:{gear:'R', ind:'R'|'off', obs:true, hb:true|false, centre:true, check:'belt'}}  discrete actions
  //        (the robot holds the brake and waits for a full stop before doing them, like a real driver)
  //   {steer:-1..1, speed:m/s | thr, brake, waitSteer:true, until:fn(sim), wait:sec, timeout:sec, say:'...'}
  //   speed = wanted |v|; the robot modulates accelerator / brake. `stop:true` = brake to a full stop.
  function Robot(sim, prog) { this.sim = sim; this.prog = prog || []; this.i = 0; this.t0 = 0; this.enter = true; this.done = false; this.fail = null; }
  Robot.prototype.tick = function () {
    var sim = this.sim, st = sim.st, inp = sim.input;
    if (this.done || st.finished) { this.done = true; return; }
    var ph = this.prog[this.i];
    if (!ph) { this.done = true; inp.thr = 0; inp.brk = 1; return; }
    if (this.enter) { this.enter = false; this.t0 = st.t; this.pending = ph.do ? clone(ph.do) : null; this.rest = 0; }
    var el = st.t - this.t0;
    if (ph.timeout && el > ph.timeout) { this.fail = 'phase ' + this.i + ' (' + (ph.id || '') + ') timed out'; this.done = true; return; }
    if (ph.steer != null) inp.wheel = typeof ph.steer === 'function' ? clamp(ph.steer(sim), -1, 1) : ph.steer;
    if (this.pending) {
      inp.thr = 0; inp.brk = 1;
      if (Math.abs(st.v) > 0.02 || st.brk < 0.6) return;
      this.rest += 1;
      if (this.rest < 6) return;
      var a = this.pending;
      if (a.check) sim.action(a.check);
      if (a.gear) sim.action('gear', a.gear);
      if (a.ind !== undefined) { var want = a.ind === 'off' ? null : a.ind; if (st.ind !== want) sim.action('ind', want || st.ind); }
      if (a.hb !== undefined) sim.action('hb', a.hb);
      if (a.centre) sim.action('centre');
      if (a.obs) sim.action('obs');
      this.pending = null;
      this.t0 = st.t;
      return;
    }
    if (ph.waitSteer && Math.abs(st.s - st.sT) > 0.02) { inp.thr = 0; inp.brk = 1; return; }
    if (ph.stop) { inp.thr = 0; inp.brk = ph.brake || 1; }
    else if (ph.speed != null) {
      var dir = st.gear === 'R' ? -1 : 1, e = ph.speed - st.v * dir;
      inp.thr = clamp(e * 0.9, 0, 1);
      inp.brk = clamp(-e * 1.6, 0, 1);
    } else { inp.thr = ph.thr || 0; inp.brk = ph.brake || 0; }
    var fin = ph.until ? ph.until(sim, el) : (ph.stop ? sim.stopped(0.3) : el >= (ph.wait || 0));
    if (fin && (!ph.stop || sim.stopped(0.2))) { this.i++; this.enter = true; }
  };
  // run a program synchronously (fast-forward); returns {ok, fail, result, state}
  function runRobot(sim, prog, maxSec, onTick) {
    var r = new Robot(sim, prog), dt = sim.K.dt, n = Math.ceil((maxSec || 240) / dt);
    for (var i = 0; i < n && !sim.st.finished; i++) {
      r.tick();
      sim.step(dt);
      if (onTick) onTick(sim, r);
      if (r.done && !sim.st.finished && !r.fail) {
        // program ended but the exercise did not: keep braking a moment so goal checks can fire
        for (var j = 0; j < 120 && !sim.st.finished; j++) sim.step(dt);
        break;
      }
      if (r.fail) break;
    }
    return { ok: !!(sim.st.result && sim.st.result.passed), fail: r.fail, result: sim.st.result, state: sim.snapshot(), phase: r.i };
  }

  // ------------------------------------------------------------------ 7. exercise instances + configuration
  var OVR = { car: {}, phys: {}, exercises: {}, emirates: {} };
  function curCar() { return merge(clone(CAR), OVR.car); }
  function curPhys() { return merge(clone(PHYS), OVR.phys); }
  function buildInstance(def, o) {
    o = o || {};
    var ov = OVR.exercises[def.id] || {}, em = merge(clone((def.variants || {})[o.emirate] || {}), o.emirate && OVR.emirates[o.emirate] ? (OVR.emirates[o.emirate][def.id] || {}) : {});
    var P = merge(merge(merge(clone(def.params || {}), ov.params || {}), em.params || {}), o.params || {});
    var car = curCar(), phys = curPhys();
    var b = def.build(P, car);
    b.lay.finish(b.margin);
    return {
      def: def, P: P, car: car, phys: phys, lay: b.lay, start: b.start, ghost: b.ghost || null, goal: b.goal || null,
      tol: merge(merge(clone(def.tol || {}), ov.tol || {}), em.tol || {}),
      limits: merge(merge(clone(def.limits || {}), ov.limits || {}), em.limits || {}),
      rules: merge(merge(merge(clone(RULES), def.rules || {}), ov.rules || {}), em.rules || {}),
      steps: def.steps || null, signal: def.signal || null, obsAt: def.obsAt || 'first+reverse',
      camera: def.camera || 'fit', demo: def.demo || null, extra: b.extra || {}
    };
  }

  // ------------------------------------------------------------------ 8. exercises
  // Each exercise: id, name, desc, level 1..5, emirates, params (tunable dimensions), build(P, car) -> {lay, start, ghost, goal},
  // tol, limits, rules (overrides of RULES; null disables), signal, obsAt, steps (coach), demo (robot program), hooks.
  // All coordinates are built so that the car first drives NORTH (+y); "right" is east (+x). UAE drives on the right.
  var HP = PI / 2;
  function Y_(sim, n) { return sim.pt(n)[1]; }
  function X_(sim, n) { return sim.pt(n)[0]; }
  function centreOff(C) { return (C.wheelbase + C.frontOverhang - rearOverhang(C)) / 2; }
  function poseFromCentre(C, cx, cy, h) { var o = centreOff(C); return { x: cx - o * Math.cos(h), y: cy - o * Math.sin(h), h: h }; }
  function relDeg(sim, ref) { return Math.abs(wrap(sim.st.h - ref)) / DEG; }
  function parkedCar(L, cx, cy, h, id) { L.wall(rectPoly(cx, cy, 4.4, 1.75, h), { kind: 'car', id: id }); }
  function steerIs(sim, v) { return Math.abs(sim.st.s - v) < 0.1; }
  function stoppedIn(sim, gear) { return sim.stopped(0.3) && (!gear || sim.st.gear === gear); }
  // standard opening phases: observe, select a gear with the brake held
  function demoStart(gear) { return [{ do: { obs: true } }, { do: { gear: gear || 'D' } }]; }

  var EXERCISES = [];
  function defEx(d) { EXERCISES.push(d); return d; }

  // 1 ---------------------------------------------------------------- pre-drive check
  var PRE_ORDER = [['doors', 'engine'], ['seat', 'engine'], ['mirrors', 'engine'], ['belt', 'engine'], ['engine', 'D'], ['D', 'hbOff']];
  defEx({
    id: 'pre-drive-check', level: 1, emirates: ['dubai', 'sharjah'],
    name: 'التجهيز قبل الانطلاق',
    desc: 'قبل ما تتحرك: الأبواب، المقعد، المرايات، الحزام، رجلك عالفرامل، تشغيل المحرك، الغيار على D، تنزيل الهاندبريك، الغماز، والنظرة، وبعدين تطلع من جنب الرصيف بأمان',
    params: { laneW: 3.6, len: 30, finishY: 16, finishLen: 7 },
    build: function (P, C) {
      var L = Layout(), w2 = P.laneW * 2;
      L.road(boxPoly(-w2, -8, 0, P.len));
      L.kerb(0.15, -8, 0.15, P.len, { id: 'kerbR' });
      L.kerb(-w2 - 0.15, -8, -w2 - 0.15, P.len, { id: 'kerbL' });
      L.line(-P.laneW, -8, -P.laneW, P.len, { dash: [3, 3] });
      L.line(-P.laneW, P.finishY, 0, P.finishY, { w: 0.3 });
      L.line(-P.laneW, P.finishY + P.finishLen, 0, P.finishY + P.finishLen, { w: 0.3 });
      L.zone('target', boxPoly(-P.laneW, P.finishY, 0, P.finishY + P.finishLen));
      L.label(-P.laneW / 2, P.finishY + P.finishLen / 2, 'وقف هون', { size: 0.9 });
      L.arrow(-P.laneW / 2, P.finishY - 3, HP); L.arrow(-P.laneW * 1.5, P.finishY - 3, -HP);
      var x = -0.35 - C.width / 2;
      return { lay: L, start: { x: x, y: -2, h: HP, gear: 'P', hb: true, engine: false },
        ghost: poseFromCentre(C, -P.laneW / 2, P.finishY + P.finishLen / 2, HP), goal: { zone: 'target', h: HP, stopT: 0.8 } };
    },
    tol: { inside: 'body', ang: 20 },
    limits: { capKmh: 20, maxKmh: 20, time: 150 },
    rules: { moves: null, hit_kerb: { points: 20 } },
    signal: { side: 'L', at: 'first' }, obsAt: 'first', camera: 'fit', angleRef: HP,
    init: function (sim) { sim.st.engine = false; sim.st.flags.pre = { doors: false, seat: false, mirrors: false, belt: false, engine: false, brake: false, hbOff: false, D: false, log: [] }; },
    action: function (sim, name) {
      var f = sim.st.flags.pre, st = sim.st;
      if (['doors', 'seat', 'mirrors', 'belt', 'engine'].indexOf(name) < 0) return false;
      if (name === 'engine') {
        if (f.engine) return true;
        if (st.gear !== 'P') { sim.hint(HINT.engineP, 'warn'); return false; }
        if (st.brk < 0.3 && sim.input.brk < 0.5) { sim.hint(HINT.engineBrake, 'warn'); sim.mistake('engine_no_brake'); if (sim.mode === 'learn') return false; }
        st.engine = true;
      }
      if (!f[name]) { f[name] = true; f.log.push(name); }
      sim.emit({ type: 'check', item: name });
      return true;
    },
    onGear: function (sim, from, to) { var f = sim.st.flags.pre; if (to === 'D' && !f.D) { f.D = true; f.log.push('D'); } },
    update: function (sim) {
      var f = sim.st.flags.pre, st = sim.st;
      if (!f.brake && st.brk > 0.5) { f.brake = true; f.log.push('brake'); }
      if (!f.hbOff && !st.hb) { f.hbOff = true; f.log.push('hbOff'); }
    },
    onMove: function (sim, dir, newSeg) {
      var f = sim.st.flags.pre;
      if (sim.st.moves !== 1 || !newSeg) return;
      if (!f.belt) sim.mistake('no_belt');
      if (!f.mirrors) sim.mistake('no_mirrors');
      if (!f.seat) sim.mistake('no_seat');
      if (!f.doors) sim.mistake('no_doors');
      var bad = PRE_ORDER.some(function (p) { var a = f.log.indexOf(p[0]), b = f.log.indexOf(p[1]); return a >= 0 && b >= 0 && a > b; });
      if (bad) sim.mistake('order');
    },
    stats: function (sim) { return { checklist: sim.st.flags.pre.log.join(' > ') }; },
    exam: 'جهز حالك وطلع السيارة من جنب الرصيف، ووقف بالمربع اللي قدامك',
    steps: [
      { id: 'doors', text: 'أول شي تأكد إنو كل الأبواب مسكرة منيح', keys: ['1'], touch: 'زر الأبواب', done: function (s) { return s.st.flags.pre.doors; } },
      { id: 'seat', text: 'عدل المقعد: ضهرك مسنود، ورجلك بتوصل للفرامل للآخر وركبتك مثنية شوي', keys: ['2'], touch: 'زر المقعد', done: function (s) { return s.st.flags.pre.seat; } },
      { id: 'mirrors', text: 'عدل المرايات الثلاث: الداخلية، والشمال، واليمين (قبل ما تمشي، مش وانت ماشي)', keys: ['3'], touch: 'زر المرايات', done: function (s) { return s.st.flags.pre.mirrors; } },
      { id: 'belt', text: 'اربط حزام الأمان قبل ما تشغل السيارة', keys: ['4'], touch: 'زر الحزام', done: function (s) { return s.st.flags.pre.belt; } },
      { id: 'brake', text: 'دوس فرامل وخليك دايس', keys: ['↓'], touch: 'دواسة الفرامل', done: function (s) { return s.st.brk > 0.5 || s.st.engine; } },
      { id: 'engine', text: 'شغل المحرك ورجلك عالفرامل والغيار على P', keys: ['5'], touch: 'زر المحرك', done: function (s) { return s.st.engine; } },
      { id: 'gearD', text: 'ورجلك عالفرامل، حط الغيار على D', keys: ['D'], touch: 'زر D', done: function (s) { return s.st.gear === 'D'; } },
      { id: 'hb', text: 'نزل الهاندبريك', keys: ['H'], touch: 'زر الهاندبريك', done: function (s) { return !s.st.hb; } },
      { id: 'obs', text: 'اعمل نظرة: المراية الداخلية والمراية الشمال، والتفت عالنقطة العمياء', keys: ['M'], touch: 'زر النظرة', done: function (s) { return s.obsOK() || s.st.moves > 0; } },
      { id: 'ind', text: 'بعد النظرة شغل الغماز الشمال، لأنك طالع من جنب الرصيف لليسار، وقبل ما تمشي التفت مرة تانية', keys: ['Q'], touch: 'غماز شمال', done: function (s) { return s.st.ind === 'L' || s.st.moves > 0; } },
      { id: 'go', text: 'شيل رجلك عن الفرامل بشويش، امشي دغري، ووقف جوا المربع', done: function () { return false; } }
    ],
    demo: [{ do: { check: 'doors' } }, { do: { check: 'seat' } }, { do: { check: 'mirrors' } }, { do: { check: 'belt' } }, { brake: 1, wait: 0.4 }, { do: { check: 'engine' } },
      { do: { gear: 'D' } }, { do: { hb: false } }, { do: { obs: true } }, { do: { ind: 'L' } },
      { speed: 1.6, steer: 0.18, until: function (s) { return X_(s, 'centre') < -1.55; }, timeout: 20 },
      { speed: 2.2, steer: -0.12, until: function (s) { return relDeg(s, HP) < 1.5 || Y_(s, 'rearAxle') > 12; }, timeout: 20 },
      { speed: 2.2, steer: 0, until: function (s) { return Y_(s, 'frontBumper') > s.inst.P.finishY + s.inst.P.finishLen - 1.6; }, timeout: 30 },
      { stop: true }, { do: { gear: 'P' } }]
  });

  // 2 ---------------------------------------------------------------- parallel parking (reverse, bay on the RIGHT)
  // Bay: x 0..bayWid (x=0 outer line on the road side, kerb face at x=bayWid), y 0..bayLen. Poles at the 4 corners.
  defEx({
    id: 'parallel', level: 4, emirates: ['dubai', 'sharjah'],
    name: 'الباركنج الموازي',
    desc: 'اصف السيارة لورا بين عمودين على يمين الطريق، موازية للرصيف ومن غير ما تلمس العمود أو الرصيف أو الخطوط',
    params: { bayLen: 7.0, bayWid: 2.5, laneW: 3.5, oppW: 3.5, before: 13, after: 9, startGap: 0.8, startBack: 8, kerbGap: 0.3, kerbMax: 0.5, parked: true, parkGap: 0.8, innerPoles: true, refAngle: 39, refClear: 0.55 },
    build: function (P, C) {
      var L = Layout(), W2 = P.bayWid, BL = P.bayLen, xl = -P.laneW - P.oppW;
      L.road(boxPoly(xl, -P.before, W2, BL + P.after));
      L.kerb(W2 + 0.15, -P.before, W2 + 0.15, BL + P.after, { id: 'kerbR' });
      L.kerb(xl - 0.15, -P.before, xl - 0.15, BL + P.after, { id: 'kerbL' });
      L.line(-P.laneW, -P.before, -P.laneW, BL + P.after, { dash: [3, 3], color: 'white' });
      L.line(0, -P.before, 0, 0, { w: 0.1 }); L.line(0, BL, 0, BL + P.after, { w: 0.1 });
      L.line(0, 0, 0, BL, { w: 0.1, dash: [0.6, 0.6] });
      L.line(0, 0, W2, 0, { id: 'lineRear', rule: true }); L.line(0, BL, W2, BL, { id: 'lineFront', rule: true });
      L.pole(0, 0, { id: 'poleRearOut' }); L.pole(0, BL, { id: 'poleFrontOut' });
      if (P.innerPoles) { L.pole(W2 - 0.25, 0, { id: 'poleRearIn' }); L.pole(W2 - 0.25, BL, { id: 'poleFrontIn' }); }
      if (P.parked) { parkedCar(L, W2 / 2 + 0.2, BL + P.parkGap + 2.2, HP, 'carFront'); parkedCar(L, W2 / 2 + 0.2, -P.parkGap - 2.2, HP, 'carRear'); }
      L.zone('target', boxPoly(0, 0, W2, BL));
      L.arrow(-P.laneW / 2, BL + P.after - 3, HP); L.arrow(xl + P.oppW / 2, -P.before + 3, -HP);
      return { lay: L, start: { x: -(P.startGap + C.width / 2), y: -P.startBack, h: HP, gear: 'P' },
        ghost: poseFromCentre(C, W2 - P.kerbGap - C.width / 2, BL / 2, HP), goal: { zone: 'target', h: HP, needP: true } };
    },
    tol: { inside: 'body', ang: 6 },
    limits: { capKmh: 15, maxKmh: 15, maxMoves: 4, time: 300 },
    signal: { side: 'R', at: 'reverse' }, obsAt: 'first+reverse', angleRef: HP,
    evaluate: function (sim) {   // "about 30 cm from the kerb": more than kerbMax is a demerit
      var P = sim.inst.P, mx = -1e9;
      sim.geom.body.forEach(function (q) { mx = Math.max(mx, q[0]); });
      sim.st.flags.kerbGap = Math.round((P.bayWid - mx) * 100) / 100;
      if (P.bayWid - mx > P.kerbMax) sim.mistake('far_kerb');
    },
    stats: function (sim) { return sim.st.flags.kerbGap == null ? {} : { kerbGap: sim.st.flags.kerbGap }; },
    exam: 'اصف السيارة بين الأعمدة اللي على يمينك (باركنج موازي لورا)، ولما تخلص حط الغيار على P',
    steps: [
      { id: 'ready', text: 'رجلك عالفرامل، حط الغيار على D، واعمل نظرة للمرايا قبل ما تمشي', keys: ['↓', 'D', 'M'], done: function (s) { return s.st.gear === 'D' && (s.obsOK() || s.st.moves > 0); } },
      { id: 'drive', text: 'امشي لقدام دغري جنب الأعمدة، وخلي بين جنب السيارة والأعمدة حوالي متر', done: function (s) { return Y_(s, 'rearBumper') > s.inst.P.bayLen - 1.5; } },
      { id: 'stopRef', text: 'وقف لما يصير الصدام الخلفي قدام العمود الأمامي بشي نص متر', keys: ['↓'], ref: 'rearBumper', line: function (s) { var P = s.inst.P; return [P.bayLen + 0.5, -P.laneW, P.bayWid]; },
        done: function (s) { return stoppedIn(s) && Y_(s, 'rearBumper') > s.inst.P.bayLen; } },
      { id: 'prepR', text: 'شغل الغماز اليمين، ورجلك عالفرامل حط الغيار على R', keys: ['E', 'R'], done: function (s) { return s.st.gear === 'R'; } },
      { id: 'look', text: 'اعمل نظرة: المرايات، والنقطة العمياء، ومن الشباك الخلفي', keys: ['M'], done: function (s) { return s.obsOK() || s.st.v < -0.1; } },
      { id: 'back1', text: 'شيل رجلك عن الفرامل بشويش وارجع دغري لحتى يصير الصدام الخلفي حد العمود الأمامي', ref: 'rearBumper', line: function (s) { var P = s.inst.P; return [P.bayLen, -P.laneW, P.bayWid]; },
        done: function (s) { return Y_(s, 'rearBumper') <= s.inst.P.bayLen + 0.05; } },
      { id: 'lockR', text: 'هلأ لف الدركسيون عالآخر يمين وكمل رجوع بشويش', keys: ['→'], done: function (s) { return s.st.s < -0.85 || relDeg(s, HP) > 20; } },
      { id: 'ang40', text: 'كمل لورا لحتى تصير زاوية السيارة حوالي 40 درجة (شوف رقم الزاوية)', showAngle: true, done: function (s) { return relDeg(s, HP) >= 37; } },
      { id: 'straight', text: 'هلأ رجع الدركسيون للنص (دغري) وكمل لورا دغري', keys: ['C'], showAngle: true, done: function (s) { return Math.abs(s.st.s) < 0.12; } },
      { id: 'frontClear', text: 'كمل لورا لحتى يوصل طرف الصدام الأمامي اليمين للخط الذهبي، يعني صار قريب يعدي العمود الأمامي', ref: 'fr', line: function (s) { var P = s.inst.P; return [P.bayLen + P.refClear, -P.laneW, P.bayWid]; },
        done: function (s) { return Y_(s, 'fr') <= s.inst.P.bayLen + s.inst.P.refClear; } },
      { id: 'lockL', text: 'هلأ لف الدركسيون عالآخر شمال وكمل لورا بشويش', keys: ['←'], done: function (s) { return s.st.s > 0.85; } },
      { id: 'parallel', text: 'لما تصير السيارة موازية للرصيف وقف (بعيد عنه حوالي 30 سم)', showAngle: true, done: function (s) { return relDeg(s, HP) < 4 && stoppedIn(s); } },
      { id: 'centre', text: 'رجع الدركسيون للنص، وإذا لازم حط D واتقدم شوي لتتوسط بين العمودين', keys: ['C'], done: function (s) { return Math.abs(s.st.s) < 0.12 && stoppedIn(s); } },
      { id: 'park', text: 'ممتاز، رجلك عالفرامل وحط الغيار على P', keys: ['P'], done: function () { return false; } }
    ],
    demo: demoStart('D').concat([
      { speed: 1.3, steer: 0, until: function (s) { return Y_(s, 'rearBumper') >= s.inst.P.bayLen + 0.4; }, timeout: 40 },
      { stop: true }, { do: { ind: 'R' } }, { do: { gear: 'R' } }, { do: { obs: true } },
      { speed: 0.7, steer: 0, until: function (s) { return Y_(s, 'rearBumper') <= s.inst.P.bayLen; }, timeout: 20 },
      { speed: 0.6, steer: -1, until: function (s) { return relDeg(s, HP) >= s.inst.P.refAngle; }, timeout: 30 },
      { speed: 0.6, steer: 0, until: function (s) { return Y_(s, 'fr') <= s.inst.P.bayLen + s.inst.P.refClear; }, timeout: 30 },
      { speed: 0.6, steer: 1, until: function (s) { return relDeg(s, HP) <= 0.4 || s.st.h < HP; }, timeout: 30 },
      { stop: true, steer: 0 }, { do: { gear: 'D' } },
      { speed: 0.5, steer: 0, until: function (s) { var pc = s.poseCheck(); return pc && pc.lon > -0.12; }, timeout: 20 },
      { stop: true }, { do: { gear: 'P' } }])
  });

  // 3/4 -------------------------------------------------------------- 90 degree bays on the RIGHT (garage made of poles)
  // Target bay: x 0..bayD (entrance line at x=0 facing the aisle), y 0..bayW. Aisle x -aisleW..0. Parked cars in the next bays.
  function bayLayout(P, C, forward) {
    var L = Layout(), Wb = P.bayW, D = P.bayD, A = P.aisleW, y0 = -P.before, y1 = Wb + P.after;
    L.road(boxPoly(-A, y0, 0, y1));
    L.road(boxPoly(0, -2 * Wb, D + 0.3, 3 * Wb));
    L.kerb(-A - 0.15, y0, -A - 0.15, y1, { id: 'kerbL' });
    L.kerb(D + 0.45, -2 * Wb, D + 0.45, 3 * Wb, { id: 'kerbBack' });
    L.kerb(0.15, y0, 0.15, -2 * Wb - 0.15, { id: 'kerbR1' }); L.kerb(0.15, 3 * Wb + 0.15, 0.15, y1, { id: 'kerbR2' });
    L.kerb(0.3, -2 * Wb - 0.15, D + 0.6, -2 * Wb - 0.15, { id: 'kerbS' }); L.kerb(0.3, 3 * Wb + 0.15, D + 0.6, 3 * Wb + 0.15, { id: 'kerbN' });
    for (var k = -2; k <= 3; k++) L.line(0, k * Wb, D, k * Wb, { id: 'side' + k, rule: k === 0 || k === 1 });
    L.line(D, -2 * Wb, D, 3 * Wb, { id: 'back', rule: true });
    if (!forward) { L.pole(0, 0, { id: 'poleNearIn' }); L.pole(0, Wb, { id: 'poleFarIn' }); }
    L.pole(D - 0.2, 0, { id: 'poleNearBack' }); L.pole(D - 0.2, Wb, { id: 'poleFarBack' });
    if (P.parked) {
      parkedCar(L, D / 2 + 0.25, -Wb / 2, forward ? 0 : PI, 'carS');
      parkedCar(L, D / 2 + 0.25, 1.5 * Wb, forward ? PI : 0, 'carN');
      parkedCar(L, D / 2 + 0.25, 2.5 * Wb, 0, 'carN2');
    }
    L.zone('target', boxPoly(0, 0, D, Wb));
    L.arrow(-A / 2, y1 - 3, HP);
    return L;
  }
  defEx({
    id: 'reverse-bay', level: 3, emirates: ['dubai', 'sharjah'],
    name: 'الكراج رجوع',
    desc: 'ادخل لورا على مكان مخطط على يمينك بزاوية قائمة، والسيارة لازم تصير دغري بنص المكان من غير ما تلمس العواميد أو الخطوط',
    params: { bayW: 3.0, bayD: 5.5, aisleW: 7.0, before: 13, after: 9, startGap: 2.2, startBack: 8, parked: true, refStop: 1.35, refStraight: 5 },
    build: function (P, C) {
      return { lay: bayLayout(P, C, false), start: { x: -(P.startGap + C.width / 2), y: -P.startBack, h: HP, gear: 'P' },
        ghost: poseFromCentre(C, P.bayD / 2 - 0.2, P.bayW / 2, PI), goal: { zone: 'target', h: PI, needP: true } };
    },
    tol: { inside: 'body', ang: 7 },
    limits: { capKmh: 15, maxKmh: 15, maxMoves: 4, time: 180 },
    signal: { side: 'R', at: 'reverse' }, angleRef: PI,
    exam: 'ادخل لورا عالكراج اللي على يمينك، ولما تخلص حط الغيار على P',
    steps: [
      { id: 'ready', text: 'رجلك عالفرامل، حط D، واعمل نظرة قبل ما تمشي', keys: ['↓', 'D', 'M'], done: function (s) { return s.st.gear === 'D' && (s.obsOK() || s.st.moves > 0); } },
      { id: 'drive', text: 'امشي لقدام وخلي بينك وبين الأماكن حوالي مترين (هيك مضبوطة بالمحاكي، وبالمعهد غالبا بيعلموك حوالي متر حسب السيارة)', done: function (s) { return Y_(s, 'rearBumper') > s.inst.P.bayW - 1; } },
      { id: 'stopRef', text: 'كمل لقدام ووقف لما يعدي الصدام الخلفي آخر خط للكراج بحوالي متر ونص (الخط الذهبي، وبالسيارة الحقيقية اسأل مدربك عن النقطة)', keys: ['↓'], ref: 'rearBumper', line: function (s) { var P = s.inst.P; return [P.bayW + P.refStop, -P.aisleW, 0]; },
        done: function (s) { return stoppedIn(s) && Y_(s, 'rearBumper') > s.inst.P.bayW + 0.6; } },
      { id: 'prepR', text: 'غماز يمين، ورجلك عالفرامل حط R', keys: ['E', 'R'], done: function (s) { return s.st.gear === 'R'; } },
      { id: 'look', text: 'اعمل نظرة: المرايات والنقطة العمياء وورا', keys: ['M'], done: function (s) { return s.obsOK() || s.st.v < -0.1; } },
      { id: 'lockR', text: 'لف الدركسيون عالآخر يمين وارجع بشويش كتير', keys: ['→'], done: function (s) { return s.st.s < -0.85 || relDeg(s, HP) > 25; } },
      { id: 'watch', text: 'راقب العمودين بالمرايات، والسيارة عم تدخل بالنص', done: function (s) { return relDeg(s, PI) < 12; } },
      { id: 'straight', text: 'لما تشوف الخطين موازيين لجنبين السيارة بالمرايتين وبنفس المسافة، رجع الدركسيون للنص', keys: ['C'], showAngle: true, done: function (s) { return Math.abs(s.st.s) < 0.12; } },
      { id: 'back', text: 'كمل لورا دغري لحتى تدخل مقدمة السيارة جوا الخط، ووقف قبل الخط الخلفي', done: function (s) { return X_(s, 'fl') > 0.3 && X_(s, 'fr') > 0.3 && stoppedIn(s); } },
      { id: 'park', text: 'ممتاز، وقف وحط الغيار على P', keys: ['P'], done: function () { return false; } }
    ],
    demo: demoStart('D').concat([
      { speed: 1.3, steer: 0, until: function (s) { return Y_(s, 'rearBumper') >= s.inst.P.bayW + s.inst.P.refStop - 0.1; }, timeout: 40 },
      { stop: true }, { do: { ind: 'R' } }, { do: { gear: 'R' } }, { do: { obs: true } },
      { speed: 0.6, steer: -1, until: function (s) { return s.hdeg() >= 180 - s.inst.P.refStraight; }, timeout: 40 },
      { speed: 0.6, steer: 0, until: function (s) { return X_(s, 'frontBumper') >= 0.5; }, timeout: 30 },
      { stop: true }, { do: { gear: 'P' } }])
  });
  defEx({
    id: 'forward-bay', level: 2, emirates: ['dubai', 'sharjah'], practice: true,
    name: 'الكراج لقدام',
    desc: 'ادخل لقدام على مكان مخطط على يمينك بزاوية قائمة، ووقف دغري قبل الخط الخلفي',
    params: { bayW: 3.0, bayD: 5.5, aisleW: 7.0, before: 14, after: 8, startGap: 2.2, startBack: 10, parked: true, refTurn: -1.5, refStraight: 8, refLock: 0.9 },
    build: function (P, C) {
      return { lay: bayLayout(P, C, true), start: { x: -(P.startGap + C.width / 2), y: -P.startBack, h: HP, gear: 'P' },
        ghost: poseFromCentre(C, P.bayD / 2 + 0.2, P.bayW / 2, 0), goal: { zone: 'target', h: 0, needP: true } };
    },
    tol: { inside: 'body', ang: 7 },
    limits: { capKmh: 15, maxKmh: 15, maxMoves: 3, time: 180 },
    signal: { side: 'R', at: 'first' }, angleRef: 0,
    exam: 'ادخل لقدام عالكراج اللي على يمينك، ولما تخلص حط الغيار على P',
    steps: [
      { id: 'ready', text: 'رجلك عالفرامل، غماز يمين، حط D، واعمل نظرة', keys: ['↓', 'E', 'D', 'M'], done: function (s) { return s.st.gear === 'D' && (s.obsOK() || s.st.moves > 0); } },
      { id: 'drive', text: 'امشي بشويش وخلي بينك وبين الأماكن حوالي مترين', done: function (s) { return Y_(s, 'frontBumper') > -1.5; } },
      { id: 'lockR', text: 'لما توصل المراية اليمين للخط الذهبي (قبل أول خط للكراج بشي متر ونص) لف الدركسيون تقريبا عالآخر يمين', keys: ['→'], ref: 'mirrorR', line: function (s) { var P = s.inst.P; return [P.refTurn, -P.aisleW, 0]; },
        done: function (s) { return s.st.s < -0.75; } },
      { id: 'watch', text: 'خليك لافف وماشي بشويش، وراقب الخط والسيارة اللي على يمينك', done: function (s) { return relDeg(s, 0) < 14; } },
      { id: 'straight', text: 'قبل ما تصير دغري بشوي رجع الدركسيون للنص', keys: ['C'], showAngle: true, done: function (s) { return Math.abs(s.st.s) < 0.12; } },
      { id: 'in', text: 'كمل لقدام دغري ووقف قبل الخط الخلفي بشي نص متر', done: function (s) { return X_(s, 'rl') > 0.2 && stoppedIn(s); } },
      { id: 'park', text: 'ممتاز، حط الغيار على P', keys: ['P'], done: function () { return false; } }
    ],
    demo: [{ do: { ind: 'R' } }].concat(demoStart('D'), [
      { speed: 1.2, steer: 0, until: function (s) { return Y_(s, 'mirrorR') >= s.inst.P.refTurn; }, timeout: 40 },
      { speed: 0.9, steer: function (s) { return -s.inst.P.refLock; }, until: function (s) { return s.hdeg() <= s.inst.P.refStraight || s.hdeg() > 300; }, timeout: 40 },
      { speed: 0.8, steer: 0, until: function (s) { return X_(s, 'frontBumper') >= s.inst.P.bayD - 0.55; }, timeout: 30 },
      { stop: true }, { do: { gear: 'P' } }])
  });

  // 5 ---------------------------------------------------------------- angled parking (60 degrees, forward, on the RIGHT)
  // Parallelogram bays: entrance on x=0 along the aisle, side lines at 60 deg to the aisle (heading 30 deg), back line parallel to the aisle.
  defEx({
    id: 'angle', level: 2, emirates: ['dubai', 'sharjah'],
    name: 'الباركنج المايل',
    desc: 'ادخل لقدام على مكان مايل على يمينك، ووقف بنص المكان دغري مع الخطوط',
    params: { bayW: 3.0, depthX: 5.3, aisleW: 6.0, before: 14, after: 8, startGap: 1.5, startBack: 10, parked: true, refTurn: -0.5, refStraight: 9, refLock: 1, angle: 60 },
    build: function (P, C) {
      var L = Layout(), A = P.aisleW, a = P.angle * DEG, hb = HP - a, open = P.bayW / Math.sin(a), dy = P.depthX * Math.tan(hb);
      var y0 = -P.before, y1 = 2 * open + P.after;
      L.road(boxPoly(-A, y0, 0, y1));
      L.road([[0, -2 * open], [P.depthX + 0.3, -2 * open + dy], [P.depthX + 0.3, 3 * open + dy], [0, 3 * open]]);
      L.kerb(-A - 0.15, y0, -A - 0.15, y1, { id: 'kerbL' });
      L.kerb(P.depthX + 0.45, -2 * open + dy, P.depthX + 0.45, 3 * open + dy, { id: 'kerbBack' });
      L.kerb(0.15, y0, 0.15, -2 * open - 0.1, { id: 'kerbR1' }); L.kerb(0.15, 3 * open + 0.1, 0.15, y1, { id: 'kerbR2' });
      for (var k = -2; k <= 3; k++) L.line(0, k * open, P.depthX, k * open + dy, { id: 'side' + k, rule: k === 0 || k === 1 });
      L.line(P.depthX, -2 * open + dy, P.depthX, 3 * open + dy, { id: 'back', rule: true });
      var cx = P.depthX / 2 + 0.15, cy0 = cx * Math.tan(hb) + open / 2;
      if (P.parked) { parkedCar(L, cx, cy0 - open, hb, 'carS'); parkedCar(L, cx, cy0 + open, hb, 'carN'); parkedCar(L, cx, cy0 + 2 * open, hb, 'carN2'); }
      var zone = [[0, 0], [P.depthX, dy], [P.depthX, open + dy], [0, open]];
      L.zone('target', zone);
      L.arrow(-A / 2, y1 - 3, HP);
      return { lay: L, start: { x: -(P.startGap + C.width / 2), y: -P.startBack, h: HP, gear: 'P' },
        ghost: poseFromCentre(C, cx + 0.2 * Math.cos(hb), cy0 + 0.2 * Math.sin(hb), hb), goal: { zone: 'target', h: hb, needP: true },
        extra: { hb: hb, open: open } };
    },
    tol: { inside: 'body', ang: 7 },
    limits: { capKmh: 15, maxKmh: 15, maxMoves: 3, time: 120 },
    signal: { side: 'R', at: 'first' }, angleRef: 30 * DEG,
    exam: 'اصف لقدام بالمكان المايل اللي على يمينك، ولما تخلص حط P',
    steps: [
      { id: 'ready', text: 'رجلك عالفرامل، غماز يمين، حط D، واعمل نظرة', keys: ['↓', 'E', 'D', 'M'], done: function (s) { return s.st.gear === 'D' && (s.obsOK() || s.st.moves > 0); } },
      { id: 'drive', text: 'امشي بشويش وخلي بينك وبين الأماكن حوالي متر ونص', done: function (s) { return Y_(s, 'frontBumper') > -1.5; } },
      { id: 'lockR', text: 'لما توصل المراية اليمين للخط الذهبي (قبل أول خط بشوي) لف الدركسيون عالآخر يمين', keys: ['→'], ref: 'mirrorR', line: function (s) { var P = s.inst.P; return [P.refTurn, -P.aisleW, 0]; }, done: function (s) { return s.st.s < -0.85; } },
      { id: 'straight', text: 'لما تصير السيارة دغري مع خطوط المكان رجع الدركسيون للنص', keys: ['C'], showAngle: true, done: function (s) { return Math.abs(s.st.s) < 0.12 && relDeg(s, s.inst.extra.hb) < 15; } },
      { id: 'in', text: 'كمل لقدام ووقف قبل الخط الخلفي بشي نص متر', done: function (s) { return stoppedIn(s) && X_(s, 'rl') > 0.3; } },
      { id: 'park', text: 'ممتاز، حط الغيار على P', keys: ['P'], done: function () { return false; } }
    ],
    demo: [{ do: { ind: 'R' } }].concat(demoStart('D'), [
      { speed: 1.2, steer: 0, until: function (s) { return Y_(s, 'mirrorR') >= s.inst.P.refTurn; }, timeout: 40 },
      { speed: 0.9, steer: function (s) { return -s.inst.P.refLock; }, until: function (s) { return relDeg(s, s.inst.extra.hb) <= s.inst.P.refStraight; }, timeout: 40 },
      { speed: 0.8, steer: 0, until: function (s) { return X_(s, 'frontBumper') >= s.inst.P.depthX - 0.6; }, timeout: 30 },
      { stop: true }, { do: { gear: 'P' } }])
  });

  // 6 ---------------------------------------------------------------- hill start (ramp)
  defEx({
    id: 'hill-start', level: 3, emirates: ['dubai', 'sharjah'],
    name: 'الانطلاق على المطلع',
    desc: 'اطلع عالمطلع ووقف عند الخط، وبعدين انطلق لفوق من غير ما ترجع السيارة لورا أكتر من المسموح',
    params: { grade: 0.15, rampUp: 8, top: 4, down: 8, laneW: 3.6, lineAt: 5.5, lineTol: 0.5, hold: 2, moveOffMax: 60, approach: 12, after: 18, finishAt: 6, finishLen: 6.5 },
    build: function (P, C) {
      var L = Layout(), w = P.laneW / 2, y1 = P.rampUp, y2 = y1 + P.top, y3 = y2 + P.down, yEnd = y3 + P.after;
      L.road(boxPoly(-w, -P.approach, w, yEnd));
      L.ramp({ id: 'ramp', x0: -w - 0.5, x1: w + 0.5, y0: 0, y1: y1, y2: y2, y3: y3, hgt: P.grade * P.rampUp, grade: P.grade });
      [[-P.approach, -0.5, 'bw'], [-0.5, y3 + 0.5, 'ramp'], [y3 + 0.5, yEnd, 'bw']].forEach(function (k, i) {
        L.kerb(w + 0.15, k[0], w + 0.15, k[1], { id: 'kerbR' + i, style: k[2] });
        L.kerb(-w - 0.15, k[0], -w - 0.15, k[1], { id: 'kerbL' + i, style: k[2] });
      });
      L.line(-w, P.lineAt, w, P.lineAt, { w: 0.3, id: 'stopLine' });
      L.label(w + 1.9, P.lineAt, 'خط الوقوف', { size: 0.8, color: 'gold', edge: [w + 0.4, P.lineAt] });
      L.label(-w - 1.9, y1 / 2, 'طلعة', { size: 0.8, edge: [-w - 0.4, y1 / 2] });
      L.label(-w - 1.9, (y2 + y3) / 2, 'نزلة', { size: 0.8, edge: [-w - 0.4, (y2 + y3) / 2] });
      var f0 = y3 + P.finishAt;
      L.line(-w, f0, w, f0, { w: 0.25 }); L.line(-w, f0 + P.finishLen, w, f0 + P.finishLen, { w: 0.25 });
      L.zone('target', boxPoly(-w, f0, w, f0 + P.finishLen));
      L.label(w + 1.9, f0 + P.finishLen / 2, 'النهاية', { size: 0.8, edge: [w + 0.4, f0 + P.finishLen / 2] });
      L.bounds = [-w - 3.6, -P.approach - 1, w + 3.6, yEnd + 1];
      return { lay: L, start: { x: 0, y: -P.approach + 2.5, h: HP, gear: 'P' },
        ghost: poseFromCentre(C, 0, f0 + P.finishLen / 2, HP), goal: { zone: 'target', h: HP, stopT: 0.8 },
        extra: { y1: y1, y2: y2, y3: y3, f0: f0 } };
    },
    tol: { inside: 'body', ang: 15 },
    limits: { capKmh: 15, maxKmh: 15, maxRollBack: 0.3, time: 180 },
    rules: { moves: null },
    obsAt: 'first', angleRef: HP,
    init: function (sim) { sim.st.flags.hill = { phase: 'approach', err: null, t0: 0 }; },
    goalReady: function (sim) { return sim.st.flags.hill.phase === 'go'; },
    update: function (sim) {
      var f = sim.st.flags.hill, st = sim.st, P = sim.inst.P;
      if (f.phase === 'approach') {
        if (sim.stopped(0.5) && st.pitch > 0.04) {
          f.err = Y_(sim, 'frontBumper') - P.lineAt;
          if (Math.abs(f.err) > P.lineTol) sim.mistake('stop_line');
          f.phase = 'hold'; f.t0 = st.t;
          sim.say(sim.mode === 'test' ? 'خليك واقف' : 'خليك واقف ودايس فرامل، واستنى الإشارة');
        } else if (Y_(sim, 'rearAxle') > P.rampUp + 0.5) { sim.mistake('no_hill_stop'); f.phase = 'go'; }
      } else if (f.phase === 'hold') {
        if (st.t - f.t0 >= P.hold || (st.v > 0.2 && !sim.stopped(0.05))) {
          f.phase = 'go';
          sim.say('هلأ اطلع لفوق من غير ما ترجع لورا');
          sim.emit({ type: 'signal', kind: 'go' });
          f.rb0 = st.maxRollBack; f.goT = st.t;
        }
      }
      if (f.phase === 'go' && f.goT != null && !f.up && st.t - f.goT > P.moveOffMax) {
        f.up = true;
        if (sim.mode === 'test') { sim.mistake('hill_time'); sim.finish(false, 'hill_time'); return; }
        sim.hint(TXT.hill_time, 'warn');
      }
      if (f.phase === 'go' && Y_(sim, 'rearAxle') > P.rampUp) f.up = true;
      if (f.phase === 'go' && !f.told && st.v > 0.3 && sim.mode === 'learn') {
        f.told = true;
        var cm = Math.round((st.maxRollBack - (f.rb0 || 0)) * 100);
        if (cm >= 4) sim.hint('رجعت ' + cm + ' سم لورا، المرة الجاية انقل رجلك عالبنزين أسرع', 'warn');
        else sim.hint('ممتاز، ما رجعت لورا تقريبا', 'ok');
      }
    },
    stats: function (sim) { var f = sim.st.flags.hill; return { stopLineErr: f.err == null ? null : Math.round(f.err * 100) / 100 }; },
    exam: 'اطلع عالمطلع ووقف عند الخط الأبيض، ولما أقلك انطلق لفوق وكمل للمربع',
    steps: [
      { id: 'ready', text: 'رجلك عالفرامل، حط D، واعمل نظرة قبل ما تمشي', keys: ['↓', 'D', 'M'], done: function (s) { return s.st.gear === 'D' && (s.obsOK() || s.st.moves > 0); } },
      { id: 'climb', text: 'امشي لقدام، وعالطلعة السيارة بتبطئ، دوس بنزين شوي', keys: ['↑'], done: function (s) { return Y_(s, 'frontBumper') > s.inst.P.lineAt - 2.5; } },
      { id: 'stop', text: 'وقف لما يصير الصدام الأمامي عالخط الأبيض، ودوس فرامل منيح', keys: ['↓'], ref: 'frontBumper',
        line: function (s) { var w = s.inst.P.laneW / 2; return [s.inst.P.lineAt, -w, w]; }, done: function (s) { return s.st.flags.hill.phase !== 'approach'; } },
      { id: 'hold', text: 'خليك دايس فرامل واستنى (فيك كمان ترفع الهاندبريك)', keys: ['↓', 'H'], done: function (s) { return s.st.flags.hill.phase === 'go'; } },
      { id: 'look', text: 'قبل ما تنطلق اعمل نظرة للمرايا', keys: ['M'], done: function (s) { return s.obsOK() || s.st.v > 0.2; } },
      { id: 'go', text: 'إذا الهاندبريك مرفوع نزله ورجلك لسا عالفرامل، بعدين نقل رجلك بسرعة من الفرامل للبنزين ودوس بنزين شوي', keys: ['H', '↑'], done: function (s) { return Y_(s, 'rearAxle') > s.inst.extra.y1; } },
      { id: 'down', text: 'عالنزلة خفف بالفرامل وخلي السرعة بطيئة', keys: ['↓'], done: function (s) { return Y_(s, 'rearAxle') > s.inst.extra.y3; } },
      { id: 'finish', text: 'وقف جوا مربع النهاية', done: function () { return false; } }
    ],
    demo: demoStart('D').concat([
      { speed: 1.2, steer: 0, until: function (s) { return Y_(s, 'frontBumper') >= s.inst.P.lineAt - 1.0; }, timeout: 40 },
      { speed: 0.5, steer: 0, until: function (s) { return Y_(s, 'frontBumper') >= s.inst.P.lineAt - 0.08; }, timeout: 20 },
      { stop: true }, { brake: 1, until: function (s) { return s.st.flags.hill.phase === 'go'; }, timeout: 20 }, { do: { obs: true } },
      { thr: 0.5, brake: 0, until: function (s) { return s.st.v > 0.4; }, timeout: 10 },
      { speed: 1.4, steer: 0, until: function (s) { return Y_(s, 'rearAxle') > s.inst.extra.y2; }, timeout: 30 },
      { speed: 1.4, steer: 0, until: function (s) { return Y_(s, 'frontBumper') >= s.inst.extra.f0 + s.inst.P.finishLen / 2 + 2.0; }, timeout: 30 },
      { stop: true }])
  });

  // 7 ---------------------------------------------------------------- emergency stop
  defEx({
    id: 'emergency-stop', level: 3, emirates: ['dubai', 'sharjah'],
    name: 'الوقوف المفاجئ',
    desc: 'سوق دغري بسرعة بين 20 و 40 كم/ساعة، ولما تطلع إشارة قف دوس فرامل بقوة لآخر الدواسة، وإيديك الثنتين عالدركسيون وخليه دغري لحتى توقف',
    params: { laneW: 3.6, len: 190, armFrom: 30, armTo: 120, minKmh: 20, delayMin: 0.8, delayMax: 3.0, reactMax: 1.5, swerveMax: 0.8, distTable: [[20, 3], [30, 6], [40, 11]] },
    build: function (P, C) {
      var L = Layout(), w = P.laneW / 2;
      L.road(boxPoly(-w - 3.6, -8, w, P.len));
      L.kerb(w + 0.15, -8, w + 0.15, P.len, { id: 'kerbR' }); L.kerb(-w - 3.75, -8, -w - 3.75, P.len, { id: 'kerbL' });
      L.line(-w, -8, -w, P.len, { dash: [3, 3] });
      for (var y = 10; y < P.len; y += 10) {
        L.line(w - 0.35, y, w - 0.05, y, { w: 0.08 });
        if (y % 20 === 0) L.label(w - 0.9, y, String(y), { size: 0.6, latin: true });
      }
      L.label(-w - 1.8, P.armFrom, 'بداية منطقة الإشارة', { size: 0.55, color: 'muted' });
      L.line(-w - 3.6, P.armFrom, w, P.armFrom, { w: 0.06, dash: [0.4, 0.8], color: 'yellow' });
      L.arrow(0, 14, HP); L.arrow(-w - 1.8, 24, -HP);
      L.bounds = [-w - 5, -10, w + 2, P.len + 2];
      return { lay: L, start: { x: 0, y: 0, h: HP, gear: 'P' }, ghost: null, goal: { custom: true } };
    },
    tol: {}, limits: { capKmh: 45, maxKmh: 40, time: 150 },
    variants: { dubai: { limits: { capKmh: 35, maxKmh: 0 } } },
    rules: { moves: null }, obsAt: 'first', camera: 'follow', angleRef: HP,
    init: function (sim) { sim.st.flags.em = { armed: false, due: null, signalT: null, y0: null, v0: null, react: null, dist: null, allow: null, lat0: 0 }; },
    update: function (sim) {
      var f = sim.st.flags.em, st = sim.st, P = sim.inst.P, y = Y_(sim, 'centre');
      if (!f.armed && y > P.armFrom && st.kmh >= P.minKmh) {
        f.armed = true; f.due = st.t + P.delayMin + sim.rand() * (P.delayMax - P.delayMin);
      }
      if (f.armed && f.signalT == null && st.t >= f.due) {
        f.signalT = st.t; f.y0 = y; f.v0 = st.v; f.lat0 = X_(sim, 'centre'); f.h0 = st.h;
        sim.emit({ type: 'signal', kind: 'stop' });
        sim.say('قف!');
      }
      if (f.signalT == null) {
        if (y > P.armTo && !f.armed) { sim.mistake('low_speed'); sim.finish(false, 'low_speed'); }
        return;
      }
      if (f.react == null && st.brk > 0.5 && sim.input.brk > 0.5) { f.react = st.t - f.signalT; f.yB = y; f.vB = st.v; }
      if (Math.abs(X_(sim, 'centre') - f.lat0) > P.swerveMax || relDeg(sim, f.h0) > 8) sim.mistake('swerve');
      if (y - f.y0 > 60 && !sim.stopped(0.1)) { sim.mistake('stop_distance'); sim.finish(false, 'stop_distance'); return; }
      if (sim.stopped(0.6)) {
        f.dist = f.yB == null ? y - f.y0 : y - f.yB;   // braking distance: from the moment the brake is pressed
        f.total = y - f.y0;
        f.allow = allowedStop(P.distTable, (f.vB == null ? f.v0 : f.vB) * 3.6);
        if (f.react == null || f.react > P.reactMax) sim.mistake('slow_reaction');
        if (f.dist > f.allow) sim.mistake('stop_distance');
        sim.finish(true, 'stopped');
      }
    },
    stats: function (sim) {
      var f = sim.st.flags.em, r2 = function (v) { return v == null ? null : Math.round(v * 100) / 100; };
      return { speedAtSignal: f.v0 == null ? null : Math.round(f.v0 * 36) / 10, reaction: r2(f.react), stopDist: r2(f.dist), allowedDist: r2(f.allow), totalDist: r2(f.total) };
    },
    exam: 'سوق دغري بين 20 و 40 كم/ساعة، ولما أعطيك إشارة قف وقف بأسرع شي وبخط مستقيم',
    steps: [
      { id: 'ready', text: 'رجلك عالفرامل، حط D، واعمل نظرة قبل ما تمشي', keys: ['↓', 'D', 'M'], done: function (s) { return s.st.gear === 'D' && (s.obsOK() || s.st.moves > 0); } },
      { id: 'speed', text: 'دوس بنزين لحتى توصل السرعة بين 20 و 40 كم/ساعة (أحسن حوالي 30) وخليك دغري', keys: ['↑'], done: function (s) { return s.st.kmh >= s.inst.P.minKmh; } },
      { id: 'wait', text: 'حافظ على السرعة وجهز رجلك، الإشارة ممكن تطلع بأي لحظة', done: function (s) { return s.st.flags.em.signalT != null; } },
      { id: 'brake', text: 'فرامل لآخر الدواسة وخليك دايس، وإيديك الثنتين عالدركسيون دغري (نظام ABS بيمنع العجلات تقفل)', keys: ['↓'], done: function (s) { return s.st.finished; } }
    ],
    demo: demoStart('D').concat([
      { speed: 9.2, steer: 0, until: function (s) { var f = s.st.flags.em; return f.signalT != null && s.st.t - f.signalT >= 0.45; }, timeout: 60 },
      { stop: true, steer: 0 }])
  });

  // allowed braking distance from the brake point, interpolated from the published table (20 km/h 3 m, 30 km/h 6 m, 40 km/h 11 m)
  function allowedStop(tab, kmh) {
    if (kmh <= tab[0][0]) return tab[0][1] * Math.pow(Math.max(kmh, 1) / tab[0][0], 2);
    for (var i = 1; i < tab.length; i++) if (kmh <= tab[i][0]) return lerp(tab[i - 1][1], tab[i][1], (kmh - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]));
    var a = tab[tab.length - 2], b = tab[tab.length - 1];
    return b[1] + (kmh - b[0]) * (b[1] - a[1]) / (b[0] - a[0]);
  }

  // 8 ---------------------------------------------------------------- three-point turn
  defEx({
    id: 'three-point-turn', level: 4, emirates: ['dubai', 'sharjah'], practice: true,
    name: 'الدوران بثلاث حركات',
    desc: 'لف السيارة للاتجاه المعاكس بطريق ضيق بثلاث حركات (لقدام، لورا، لقدام) من غير ما تلمس الرصيف',
    params: { roadW: 7.5, len: 56, sideGap: 0.35, startY: -6 },
    build: function (P, C) {
      var L = Layout(), w = P.roadW / 2, h = P.len / 2;
      L.road(boxPoly(-w, -h, w, h));
      L.area(boxPoly(w + 0.3, -h, w + 2.8, h), 'pavement'); L.area(boxPoly(-w - 2.8, -h, -w - 0.3, h), 'pavement');
      L.kerb(w + 0.15, -h, w + 0.15, h, { id: 'kerbR' }); L.kerb(-w - 0.15, -h, -w - 0.15, h, { id: 'kerbL' });
      L.wall(boxPoly(w + 2.8, -h, w + 3.1, h), { id: 'fenceR', kind: 'fence' }); L.wall(boxPoly(-w - 3.1, -h, -w - 2.8, h), { id: 'fenceL', kind: 'fence' });
      L.line(0, -h, 0, h, { dash: [3, 3] });
      L.zone('target', boxPoly(-w, -h + 2, -0.3, h - 2));
      L.arrow(w / 2, -h + 5, HP); L.arrow(-w / 2, h - 5, -HP);
      var x = w - P.sideGap - C.track / 2 - C.tyreWid / 2;
      return { lay: L, start: { x: x, y: P.startY, h: HP, gear: 'P' }, ghost: poseFromCentre(C, -w / 2, P.startY + 3, -HP),
        goal: { zone: 'target', h: -HP, stopT: 0.8 } };
    },
    tol: { inside: 'centre', ang: 12 },
    limits: { capKmh: 12, maxKmh: 12, maxMoves: 3, maxMovesFail: 5, time: 180 },
    rules: { hit_kerb: { points: 2 } },
    signal: { side: 'L', at: 'first' }, obsAt: 'every', angleRef: HP,
    exam: 'لف السيارة للاتجاه المعاكس بثلاث حركات، ووقف بالمسرب التاني',
    steps: [
      { id: 'ready', text: 'غماز شمال، رجلك عالفرامل حط D، واعمل نظرة لورا وشمال', keys: ['Q', 'D', 'M'], done: function (s) { return s.st.gear === 'D' && (s.obsOK() || s.st.moves > 0); } },
      { id: 'm1', text: 'امشي بشويش كتير ولف الدركسيون عالآخر شمال بسرعة', keys: ['←'], done: function (s) { return s.st.moves >= 1 && s.st.s > 0.85; } },
      { id: 'm1stop', text: 'قبل الرصيف بشوي، لف الدركسيون يمين وانت لسا ماشي، ووقف قبل ما العجل يلمس الرصيف', keys: ['→', '↓'], done: function (s) { return s.st.moves >= 1 && stoppedIn(s) && relDeg(s, HP) > 45; } },
      { id: 'm2', text: 'حط R، اعمل نظرة، وارجع بشويش والدركسيون عالآخر يمين', keys: ['R', 'M', '→'], done: function (s) { return s.st.moves >= 2; } },
      { id: 'm2stop', text: 'قبل الرصيف اللي وراك بشوي، لف شمال وانت ماشي ووقف', keys: ['←', '↓'], done: function (s) { return s.st.moves >= 2 && stoppedIn(s); } },
      { id: 'm3', text: 'حط D، اعمل نظرة، وامشي والدركسيون عالآخر شمال', keys: ['D', 'M', '←'], done: function (s) { return s.st.moves >= 3 && relDeg(s, -HP) < 25; } },
      { id: 'finish', text: 'رجع الدركسيون للنص، كمل دغري بالمسرب، ووقف', keys: ['C'], done: function () { return false; } }
    ],
    demo: [{ do: { ind: 'L' } }].concat(demoStart('D'), [
      { speed: 0.8, steer: 1, until: function (s) { return tyreMin(s, 0) <= -s.inst.P.roadW / 2 + 1.1; }, timeout: 40 },
      { speed: 0.5, steer: -1, until: function (s) { return tyreMin(s, 0) <= -s.inst.P.roadW / 2 + 0.45; }, timeout: 20 },
      { stop: true }, { do: { gear: 'R' } }, { do: { obs: true } },
      { speed: 0.7, steer: -1, until: function (s) { return tyreMax(s, 0) >= s.inst.P.roadW / 2 - 1.1; }, timeout: 40 },
      { speed: 0.5, steer: 1, until: function (s) { return tyreMax(s, 0) >= s.inst.P.roadW / 2 - 0.45; }, timeout: 20 },
      { stop: true }, { do: { gear: 'D' } }, { do: { obs: true } },
      { speed: 0.8, steer: 1, until: function (s) { return relDeg(s, -HP) < 14; }, timeout: 40 },
      { speed: 1.0, steer: 0, until: function (s) { return relDeg(s, -HP) < 4 || Y_(s, 'rearAxle') < s.inst.P.startY - 4; }, timeout: 20 },
      { speed: 1.2, steer: function (s) { return clamp(-(X_(s, 'centre') + s.inst.P.roadW / 4) * 0.3 - wrap(s.st.h + HP) * 2.6, -0.4, 0.4); }, until: function (s) { return Y_(s, 'rearAxle') < s.inst.P.startY - 13; }, timeout: 20 },
      { stop: true }])
  });
  function tyreMin(s, axis) { var m = 1e9; s.geom.tyres.forEach(function (t) { t.forEach(function (q) { m = Math.min(m, q[axis]); }); }); return m; }
  function tyreMax(s, axis) { var m = -1e9; s.geom.tyres.forEach(function (t) { t.forEach(function (q) { m = Math.max(m, q[axis]); }); }); return m; }

  // 9 ---------------------------------------------------------------- slalom through cones
  defEx({
    id: 'slalom', level: 2, emirates: ['dubai', 'sharjah'], practice: true,
    name: 'التعرج بين الأقماع',
    desc: 'امشي لقدام بين الأقماع يمين وشمال بالتناوب من غير ما تلمس أي قمع أو الخطوط الجانبية، وهيك بتتعلم تتحكم بالدركسيون بدري',
    params: { roadW: 9, cones: 5, spacing: 9, firstY: 14, finishAfter: 9, finishLen: 7, amp: 2.0, shift: -1.5, look: 3.0 },
    build: function (P, C) {
      var L = Layout(), w = P.roadW / 2, yl = P.firstY + (P.cones - 1) * P.spacing, f0 = yl + P.finishAfter, yEnd = f0 + P.finishLen + 6;
      L.road(boxPoly(-w, -8, w, yEnd));
      L.kerb(w + 0.15, -8, w + 0.15, yEnd, { id: 'kerbR' }); L.kerb(-w - 0.15, -8, -w - 0.15, yEnd, { id: 'kerbL' });
      L.line(-w + 0.4, -8, -w + 0.4, yEnd, { id: 'edgeL', rule: true }); L.line(w - 0.4, -8, w - 0.4, yEnd, { id: 'edgeR', rule: true });
      for (var i = 0; i < P.cones; i++) L.cone(0, P.firstY + i * P.spacing, { id: 'c' + i });
      L.line(-w + 0.4, f0, w - 0.4, f0, { w: 0.25 }); L.line(-w + 0.4, f0 + P.finishLen, w - 0.4, f0 + P.finishLen, { w: 0.25 });
      L.zone('target', boxPoly(-w + 0.4, f0, w - 0.4, f0 + P.finishLen));
      L.label(0, f0 + P.finishLen / 2, 'النهاية', { size: 0.8 });
      return { lay: L, start: { x: 0, y: -4, h: HP, gear: 'P' }, ghost: poseFromCentre(C, 0, f0 + P.finishLen / 2, HP),
        goal: { zone: 'target', h: HP, stopT: 0.6 }, extra: { f0: f0 } };
    },
    tol: { inside: 'body', ang: 25 },
    limits: { capKmh: 20, maxKmh: 20, time: 150 },
    rules: { moves: null, hit_cone: { points: 2 } },
    obsAt: 'first', camera: 'fit', angleRef: HP,
    init: function (sim) { sim.st.flags.sl = { next: 0, sides: [] }; },
    goalReady: function (sim) { return sim.st.flags.sl.next >= sim.inst.P.cones; },
    update: function (sim) {
      var f = sim.st.flags.sl, P = sim.inst.P, c = sim.pt('centre');
      if (f.next >= P.cones) return;
      var cy = P.firstY + f.next * P.spacing;
      if (c[1] >= cy) {
        var side = c[0] < 0 ? 'L' : 'R', want = f.next % 2 === 0 ? 'L' : 'R';
        f.sides.push(side);
        if (side !== want) sim.mistake('slalom');
        f.next++;
      }
    },
    stats: function (sim) { return { conesPassed: sim.st.flags.sl.next, knocked: sim.lay.cones.filter(function (c) { return c.knocked; }).length }; },
    guide: function (sim) {
      var P = sim.inst.P, a = P.amp * 0.85, y0 = P.firstY - P.spacing, yl = P.firstY + (P.cones - 1) * P.spacing, pts = [], last = -a * Math.cos(PI * (P.cones - 1));
      for (var y = y0; y <= yl + P.spacing; y += 0.5) {
        var x = y < P.firstY ? -a * (0.5 - 0.5 * Math.cos(PI * (y - y0) / P.spacing)) : (y <= yl ? -a * Math.cos(PI * (y - P.firstY) / P.spacing) : last * (0.5 + 0.5 * Math.cos(PI * (y - yl) / P.spacing)));
        pts.push([x, y]);
      }
      return pts;
    },
    exam: 'امشي بين الأقماع: أول قمع خليه على يمينك، والتاني على شمالك، وهيك للآخر، ووقف بمربع النهاية',
    steps: [
      { id: 'ready', text: 'رجلك عالفرامل، حط D، واعمل نظرة', keys: ['↓', 'D', 'M'], done: function (s) { return s.st.gear === 'D' && (s.obsOK() || s.st.moves > 0); } },
      { id: 'c0', text: 'أول قمع خليه على يمينك: لف شمال شوي من بدري، ومر من جنبه', keys: ['←'], done: function (s) { return s.st.flags.sl.next >= 1; } },
      { id: 'c1', text: 'هلأ لف يمين بدري، التاني خليه على شمالك', keys: ['→'], done: function (s) { return s.st.flags.sl.next >= 2; } },
      { id: 'c2', text: 'كمل بالتناوب، وابدأ اللف قبل القمع بمسافة مش لما توصله', done: function (s) { return s.st.flags.sl.next >= s.inst.P.cones; } },
      { id: 'finish', text: 'رجع الدركسيون للنص ووقف بمربع النهاية', keys: ['C', '↓'], done: function () { return false; } }
    ],
    demo: demoStart('D').concat([
      { speed: 2.2, steer: function (s) { return slalomSteer(s); }, until: function (s) { return Y_(s, 'frontBumper') >= s.inst.extra.f0 + s.inst.P.finishLen / 2 + 1.7; }, timeout: 80 },
      { stop: true, steer: 0 }])
  });
  // pure-pursuit steering along a cosine path around the cones (robot only)
  function slalomSteer(s) {
    var P = s.inst.P, C = s.C, st = s.st, la = P.look || 4.2, ty = st.y + la + (P.shift || 0), amp = P.amp, yl = P.firstY + (P.cones - 1) * P.spacing;
    var tx;
    if (ty < P.firstY - P.spacing) tx = 0;
    else if (ty < P.firstY) tx = -amp * (0.5 - 0.5 * Math.cos(PI * (ty - P.firstY + P.spacing) / P.spacing));
    else if (ty <= yl) tx = -amp * Math.cos(PI * (ty - P.firstY) / P.spacing);
    else if (ty < yl + P.spacing) { var e = -amp * Math.cos(PI * (P.cones - 1)); tx = e * (0.5 + 0.5 * Math.cos(PI * (ty - yl) / P.spacing)); }
    else tx = 0;
    var loc = toLocal(st, tx, ty), ld = hyp(loc[0], loc[1]) || 1;
    var d = Math.atan(2 * C.wheelbase * (loc[1] / ld) / ld);
    return d / steerMax(C);
  }

  // 10 --------------------------------------------------------------- free practice yard
  defEx({
    id: 'free', level: 1, emirates: ['dubai', 'sharjah'], practice: true,
    name: 'الساحة الحرة',
    desc: 'ساحة كاملة فيها باركنج موازي، وكراجات، ومطلع، وأقماع، تدرب فيها على راحتك بدون وقت',
    params: { w: 46, h: 64 },
    build: function (P, C) {
      var L = Layout(), x0 = -P.w / 2, x1 = P.w / 2, y0 = -P.h / 2, y1 = P.h / 2;
      L.road(boxPoly(x0, y0, x1, y1));
      L.kerb(x0 - 0.15, y0, x0 - 0.15, y1, { id: 'kW' }); L.kerb(x1 + 0.15, y0, x1 + 0.15, y1, { id: 'kE' });
      L.kerb(x0, y0 - 0.15, x1, y0 - 0.15, { id: 'kS' }); L.kerb(x0, y1 + 0.15, x1, y1 + 0.15, { id: 'kN' });
      // parallel box on the east side
      var px = x1 - 2.5;
      L.line(px, -10, px, -3, { w: 0.1, dash: [0.6, 0.6] }); L.line(px, -10, x1, -10); L.line(px, -3, x1, -3);
      L.pole(px, -10); L.pole(px, -3); L.pole(x1 - 0.25, -10); L.pole(x1 - 0.25, -3);
      // garages on the west side (entrances face east)
      for (var i = 0; i < 4; i++) { var gy = 4 + i * 3; L.line(x0, gy, x0 + 5.5, gy); }
      L.line(x0, 16, x0 + 5.5, 16); L.pole(x0 + 5.5, 7); L.pole(x0 + 5.5, 10);
      parkedCar(L, x0 + 2.9, 5.5, PI, 'g1'); parkedCar(L, x0 + 2.9, 14.5, 0, 'g4');
      // ramp in the north middle
      L.ramp({ id: 'ramp', x0: -2.3, x1: 2.3, y0: 10, y1: 18, y2: 22, y3: 30, hgt: 1.2, grade: 0.15 });
      L.kerb(2.45, 8, 2.45, 32, { style: 'ramp' }); L.kerb(-2.45, 8, -2.45, 32, { style: 'ramp' });
      L.line(-2.3, 15.5, 2.3, 15.5, { w: 0.3 });
      // cones in the south
      for (var k = 0; k < 4; k++) L.cone(-8 + k * 0, -24 + k * 8);
      L.cone(8, -26); L.cone(10, -26); L.cone(12, -26);
      L.line(x0 + 9, y0 + 8, x1 - 8, y0 + 8, { dash: [2, 2], w: 0.1 }); L.line(x1 - 8, y0 + 8, x1 - 8, y1 - 5, { dash: [2, 2], w: 0.1 });
      L.line(x1 - 8, y1 - 5, x0 + 9, y1 - 5, { dash: [2, 2], w: 0.1 }); L.line(x0 + 9, y1 - 5, x0 + 9, y0 + 8, { dash: [2, 2], w: 0.1 });
      L.arrow(x1 - 10, 0, HP); L.arrow(x0 + 11, 0, -HP); L.arrow(0, y0 + 10, 0); L.arrow(-6, y1 - 7, PI);
      L.label(x1 - 1.25, -6.5, 'موازي', { size: 0.7 }); L.label(x0 + 2.8, 17.5, 'كراجات', { size: 0.7 }); L.label(0, 7.3, 'مطلع', { size: 0.7 }); L.label(-8, -29, 'أقماع', { size: 0.7 });
      return { lay: L, start: { x: 0, y: -8, h: HP, gear: 'P' }, ghost: null, goal: null };
    },
    tol: {}, limits: { capKmh: 20, maxKmh: 0 },
    rules: { moves: null, touch_line: null, time: null, hit_kerb: { points: 2 } },
    obsAt: 'first+reverse', camera: 'fit',
    exam: 'تدريب حر: جرب اللي بدك ياه، ولما تخلص اضغط إنهاء',
    steps: [
      { id: 'free', text: 'ساحة حرة: جرب الموازي عاليمين، والكراجات عالشمال، والمطلع بالنص، والأقماع تحت', done: function () { return false; } }
    ],
    demo: null
  });

  // ------------------------------------------------------------------ 9. renderer (canvas, high-DPI)
  var COL = {
    bg: '#0A0E15', ground: '#0F151E', grid: 'rgba(151,161,180,0.055)', grid5: 'rgba(151,161,180,0.10)',
    asphalt: '#2A2F37', asphaltDark: '#22262D', pavement: '#353B45', white: '#F2F2EE', yellow: '#F2C230',
    kerb: '#9AA3AE', kerbDark: '#1B1F26', gold: '#D9B978', ok: '#8CC8A0', warn: '#E2A65C', bad: '#DE9090',
    ink: '#EAE6DB', muted: '#97A1B4', red: '#C8202A', orange: '#F07F1A', blue: '#1F5AA6', line: '#1E2A3C'
  };
  var FONT_HEAD = "Alexandria,'Readex Pro',system-ui,sans-serif", FONT_NUM = "'Space Grotesk',Alexandria,system-ui,sans-serif";

  function View(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.w = 1; this.h = 1; this.dpr = 1; this.cx = 0; this.cy = 0; this.s = 20; this.rot = 0; this.shake = 0;
    this.off = [0, 0];   // screen offset of the view centre: middle of the area not covered by the HUD
    this.mode = 'fit'; this.fcx = null; this.fcy = null;
  }
  View.prototype.resize = function (w, h) {
    var dpr = Math.min(W.devicePixelRatio || 1, 3);
    this.w = Math.max(1, w); this.h = Math.max(1, h); this.dpr = dpr;
    this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr);
    this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
  };
  // choose rotation + scale so the whole exercise fits (rotation 0: north up, -90: north to the right)
  View.prototype.fit = function (b, pad) {
    pad = pad || { t: 12, r: 12, b: 12, l: 12 };
    var aw = Math.max(40, this.w - pad.l - pad.r), ah = Math.max(40, this.h - pad.t - pad.b);
    var bw = b[2] - b[0], bh = b[3] - b[1];
    var s0 = Math.min(aw / bw, ah / bh), s1 = Math.min(aw / bh, ah / bw);
    this.rot = s1 > s0 * 1.12 ? -HP : 0;
    this.s = Math.max(s0, s1 > s0 * 1.12 ? s1 : s0);
    this.fitS = this.s;
    this.cx = (b[0] + b[2]) / 2; this.cy = (b[1] + b[3]) / 2;
    this.off = [(pad.l - pad.r) / 2, (pad.t - pad.b) / 2];
  };
  View.prototype.follow = function (x, y, h, v, dt, b) {
    var span = 24, s = Math.min(this.w - Math.abs(this.off[0]) * 2, this.h - Math.abs(this.off[1]) * 2) / span;
    this.s = lerp(this.s, clamp(s, 9, 60), 1 - Math.exp(-dt * 3));
    var la = clamp(v * 1.2, -4, 7), tx = x + Math.cos(h) * (la + 1.3), ty = y + Math.sin(h) * (la + 1.3);
    if (this.fcx == null) { this.fcx = tx; this.fcy = ty; }
    var k = 1 - Math.exp(-dt * 4);
    this.fcx = lerp(this.fcx, tx, k); this.fcy = lerp(this.fcy, ty, k);
    this.cx = this.fcx; this.cy = this.fcy;
  };
  View.prototype.apply = function () {
    var ctx = this.ctx, sx = 0, sy = 0;
    if (this.shake > 0) { sx = (Math.random() - 0.5) * 6 * this.shake; sy = (Math.random() - 0.5) * 6 * this.shake; }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.translate(this.w / 2 + this.off[0] + sx, this.h / 2 + this.off[1] + sy);
    ctx.scale(this.s, -this.s);
    ctx.rotate(this.rot);
    ctx.translate(-this.cx, -this.cy);
  };
  View.prototype.screen = function (x, y) {
    var dx = x - this.cx, dy = y - this.cy, c = Math.cos(this.rot), s = Math.sin(this.rot);
    return [this.w / 2 + this.off[0] + (dx * c - dy * s) * this.s, this.h / 2 + this.off[1] - (dx * s + dy * c) * this.s];
  };
  View.prototype.px = function (n) { return n / this.s; };   // n screen pixels in metres

  function pathPoly(ctx, poly) {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawScene(v, sim, ui) {
    var ctx = v.ctx, lay = sim.lay, st = sim.st, t = st.t, now = ui.clock, tt = st.t;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.fillStyle = COL.ground; ctx.fillRect(0, 0, v.w, v.h);
    v.apply();
    // grid (1 m, 5 m) over the visible area
    var b = lay.bounds, gx0 = Math.floor(b[0] - 20), gx1 = Math.ceil(b[2] + 20), gy0 = Math.floor(b[1] - 20), gy1 = Math.ceil(b[3] + 20);
    ctx.lineWidth = v.px(1);
    if (v.s > 7) {
      ctx.strokeStyle = COL.grid; ctx.beginPath();
      for (var gx = gx0; gx <= gx1; gx++) if (gx % 5) { ctx.moveTo(gx, gy0); ctx.lineTo(gx, gy1); }
      for (var gy = gy0; gy <= gy1; gy++) if (gy % 5) { ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); }
      ctx.stroke();
    }
    ctx.strokeStyle = COL.grid5; ctx.beginPath();
    for (gx = Math.ceil(gx0 / 5) * 5; gx <= gx1; gx += 5) { ctx.moveTo(gx, gy0); ctx.lineTo(gx, gy1); }
    for (gy = Math.ceil(gy0 / 5) * 5; gy <= gy1; gy += 5) { ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); }
    ctx.stroke();
    // pavements / areas under the asphalt edge
    lay.areas.forEach(function (a) { ctx.fillStyle = a.color === 'pavement' ? COL.pavement : (a.color || COL.pavement); pathPoly(ctx, a.poly); ctx.fill(); });
    // asphalt
    lay.asphalt.forEach(function (a) { ctx.fillStyle = a.color || COL.asphalt; pathPoly(ctx, a.poly); ctx.fill(); });
    lay.ramps.forEach(function (r) { drawRamp(ctx, v, r); });
    lay.hatch.forEach(function (h) { drawHatch(ctx, v, h); });
    // target zone highlight (learn mode)
    var z = lay.zones.target;
    if (z && ui.learn && ui.overlays) {
      ctx.fillStyle = 'rgba(217,185,120,0.10)'; pathPoly(ctx, z.poly); ctx.fill();
    }
    lay.arrows.forEach(function (a) { drawArrow(ctx, a); });
    lay.lines.forEach(function (l) {
      var hit = tt - (l.hitT || -9) < 0.8 && l.hitT > 0 ? 1 : 0;
      ctx.strokeStyle = hit ? COL.bad : (l.color === 'yellow' ? COL.yellow : COL.white);
      ctx.globalAlpha = l.color === 'white' || !l.color ? 0.92 : 0.85;
      ctx.lineWidth = Math.max(l.w, v.px(1.3));
      ctx.setLineDash(l.dash ? l.dash : []);
      ctx.lineCap = l.dash ? 'butt' : 'square';
      ctx.beginPath(); ctx.moveTo(l.a[0], l.a[1]); ctx.lineTo(l.b[0], l.b[1]); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    lay.kerbs.forEach(function (k) { drawKerb(ctx, v, k, tt); });
    if (z && ui.learn && ui.overlays) {
      ctx.strokeStyle = 'rgba(217,185,120,0.55)'; ctx.lineWidth = v.px(1.5); ctx.setLineDash([v.px(6), v.px(5)]);
      pathPoly(ctx, z.poly); ctx.stroke(); ctx.setLineDash([]);
    }
    // ghost of the target position
    if (sim.inst.ghost && ui.learn && ui.overlays) drawCar(ctx, v, sim.C, sim.inst.ghost, 0, { ghost: true });
    lay.walls.forEach(function (w) { drawWall(ctx, v, w, tt); });
    // learn overlays under the car: predicted paths
    if (ui.learn && ui.overlays) drawPaths(ctx, v, sim);
    if (ui.learn && ui.overlays && sim.def.guide) {
      var gp = sim.def.guide(sim);
      ctx.strokeStyle = 'rgba(217,185,120,0.4)'; ctx.lineWidth = v.px(3); ctx.setLineDash([v.px(2), v.px(7)]); ctx.lineCap = 'round';
      ctx.beginPath(); gp.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
    }
    lay.cones.forEach(function (c) { drawCone(ctx, v, c, tt); });
    lay.poles.forEach(function (p) { drawPole(ctx, v, p, tt); });
    // reference line of the current coach step
    var step = ui.learn && ui.overlays && sim.inst.steps ? sim.inst.steps[st.step] : null;
    if (step && step.line) {
      var L = step.line(sim), pulse = 0.55 + 0.45 * Math.sin(now * 5);
      ctx.strokeStyle = COL.gold; ctx.globalAlpha = 0.5 + 0.4 * pulse; ctx.lineWidth = v.px(2.5); ctx.setLineDash([v.px(8), v.px(6)]);
      ctx.beginPath(); ctx.moveTo(L[1], L[0]); ctx.lineTo(L[2], L[0]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // observation sweep
    var oa = t - st.obsT;
    if (oa >= 0 && oa < 1.4 && !ui.rm) drawObservation(ctx, v, sim, oa);
    drawCar(ctx, v, sim.C, st, st.s, { sim: sim, now: now });
    if (step && step.ref) {
      var rp = sim.pt(step.ref), pr = v.px(7 + 3 * Math.sin(now * 6));
      ctx.fillStyle = COL.gold; ctx.strokeStyle = COL.bg; ctx.lineWidth = v.px(2);
      ctx.beginPath(); ctx.arc(rp[0], rp[1], pr, 0, TAU); ctx.fill(); ctx.stroke();
    }
    // screen-space labels
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    lay.labels.forEach(function (lb) {
      var p = v.screen(lb.x, lb.y), size = clamp((lb.o.size || 0.7) * v.s, 10, 20);
      if (p[0] < -50 || p[0] > v.w + 50 || p[1] < -30 || p[1] > v.h + 30) return;
      ctx.font = (lb.o.latin ? '600 ' : '500 ') + size + 'px ' + (lb.o.latin ? FONT_NUM : FONT_HEAD);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = lb.o.latin ? 'ltr' : 'rtl';
      if (lb.o.edge) {   // start the text just outside a road edge, on the side of the label point
        var e = v.screen(lb.o.edge[0], lb.o.edge[1]), dx = p[0] - e[0], dy = p[1] - e[1];
        if (Math.abs(dx) >= Math.abs(dy)) { ctx.textAlign = dx > 0 ? 'left' : 'right'; p = [e[0] + (dx > 0 ? 7 : -7), e[1]]; }
        else { ctx.textBaseline = dy > 0 ? 'top' : 'bottom'; p = [e[0], e[1] + (dy > 0 ? 7 : -7)]; }
      }
      ctx.fillStyle = lb.o.color === 'muted' ? 'rgba(151,161,180,0.85)' : (lb.o.color === 'gold' ? 'rgba(217,185,120,0.95)' : 'rgba(242,242,238,0.78)');
      ctx.fillText(lb.text, p[0], p[1]);
    });
    if (step && step.showAngle && ui.learn) {
      var cpt = v.screen.apply(v, sim.pt('centre')), ang = Math.round(relDeg(sim, sim.inst.def.angleRef == null ? HP : sim.inst.def.angleRef));
      var txt = ang + '°';
      ctx.font = '700 15px ' + FONT_NUM; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
      var tw = ctx.measureText(txt).width + 16;
      ctx.fillStyle = 'rgba(13,19,30,0.88)'; rrect(ctx, cpt[0] - tw / 2, cpt[1] - 42, tw, 24, 12); ctx.fill();
      ctx.strokeStyle = COL.gold; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = COL.gold; ctx.fillText(txt, cpt[0], cpt[1] - 30);
    }
  }

  function drawRamp(ctx, v, r) {
    var up = ctx.createLinearGradient(0, r.y0, 0, r.y1);
    up.addColorStop(0, COL.asphalt); up.addColorStop(1, '#3B424D');
    ctx.fillStyle = up; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    ctx.fillStyle = '#3B424D'; ctx.fillRect(r.x0, r.y1, r.x1 - r.x0, r.y2 - r.y1);
    var dn = ctx.createLinearGradient(0, r.y2, 0, r.y3);
    dn.addColorStop(0, '#3B424D'); dn.addColorStop(1, COL.asphalt);
    ctx.fillStyle = dn; ctx.fillRect(r.x0, r.y2, r.x1 - r.x0, r.y3 - r.y2);
    // chevrons pointing uphill / downhill
    ctx.strokeStyle = 'rgba(242,242,238,0.22)'; ctx.lineWidth = Math.max(0.1, v.px(1.5));
    var cx = (r.x0 + r.x1) / 2, hw = (r.x1 - r.x0) * 0.18;
    for (var y = r.y0 + 1; y < r.y1 - 0.5; y += 1.6) { ctx.beginPath(); ctx.moveTo(cx - hw, y); ctx.lineTo(cx, y + 0.6); ctx.lineTo(cx + hw, y); ctx.stroke(); }
    for (y = r.y2 + 1.2; y < r.y3 - 0.4; y += 1.6) { ctx.beginPath(); ctx.moveTo(cx - hw, y + 0.6); ctx.lineTo(cx, y); ctx.lineTo(cx + hw, y + 0.6); ctx.stroke(); }
  }
  function drawHatch(ctx, v, h) {
    ctx.save(); pathPoly(ctx, h.poly); ctx.clip();
    var bb = polyBox(h.poly);
    ctx.strokeStyle = 'rgba(242,242,238,0.5)'; ctx.lineWidth = 0.12; ctx.beginPath();
    for (var d = bb[0] - (bb[3] - bb[1]); d < bb[2]; d += 0.8) { ctx.moveTo(d, bb[1]); ctx.lineTo(d + (bb[3] - bb[1]), bb[3]); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(242,242,238,0.8)'; ctx.lineWidth = 0.1; pathPoly(ctx, h.poly); ctx.stroke();
  }
  function drawArrow(ctx, a) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.h);
    ctx.fillStyle = 'rgba(242,242,238,0.5)';
    ctx.beginPath(); ctx.moveTo(1.5, 0); ctx.lineTo(0.4, 0.55); ctx.lineTo(0.4, 0.18); ctx.lineTo(-1.5, 0.18); ctx.lineTo(-1.5, -0.18); ctx.lineTo(0.4, -0.18); ctx.lineTo(0.4, -0.55); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawKerb(ctx, v, k, now) {
    var dx = k.b[0] - k.a[0], dy = k.b[1] - k.a[1], len = hyp(dx, dy), n = Math.max(1, Math.round(len / 1.0)), hit = k.hitT > 0 && now - k.hitT < 0.8;
    var ramp = k.style === 'ramp';
    for (var i = 0; i < n; i++) {
      var t0 = i / n, t1 = (i + 1) / n;
      var poly = segPoly(k.a[0] + dx * t0, k.a[1] + dy * t0, k.a[0] + dx * t1, k.a[1] + dy * t1, k.w);
      ctx.fillStyle = hit ? (i % 2 ? COL.bad : '#7A3A3A') : (i % 2 ? (ramp ? COL.yellow : '#E4E4DE') : COL.kerbDark);
      pathPoly(ctx, poly); ctx.fill();
    }
  }
  function drawWall(ctx, v, w, now) {
    var hit = w.hitT > 0 && now - w.hitT < 0.8;
    if (w.kind === 'car') {
      var c = polyCentroid(w.poly), a = w.poly[0], b = w.poly[1];
      var h = Math.atan2(a[1] - b[1], a[0] - b[0]);
      ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; rrect(ctx, -2.1, -0.95, 4.4, 1.9, 0.35); ctx.fill();
      ctx.fillStyle = hit ? '#7A3A3A' : '#3A4556'; rrect(ctx, -2.2, -0.875, 4.4, 1.75, 0.35); ctx.fill();
      ctx.fillStyle = '#1B2330'; rrect(ctx, 0.35, -0.72, 0.9, 1.44, 0.18); ctx.fill(); rrect(ctx, -1.75, -0.68, 0.6, 1.36, 0.15); ctx.fill();
      ctx.fillStyle = '#4A566A'; rrect(ctx, -1.05, -0.7, 1.3, 1.4, 0.12); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = hit ? COL.bad : (w.kind === 'fence' ? '#46505E' : '#5A6472');
    pathPoly(ctx, w.poly); ctx.fill();
  }
  function drawPole(ctx, v, p, now) {
    var hit = p.hitT > 0 && now - p.hitT < 0.9, r = Math.max(p.r, v.px(4.5));
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(p.x + v.px(2), p.y - v.px(2), r * 1.35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#20252D'; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.45, 0, TAU); ctx.fill();
    ctx.fillStyle = hit ? COL.bad : COL.yellow; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = hit ? '#5A1E1E' : '#151515'; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, 0, TAU); ctx.fill();
    if (hit) {
      var k = (now - p.hitT) / 0.9;
      ctx.strokeStyle = 'rgba(222,144,144,' + (1 - k).toFixed(2) + ')'; ctx.lineWidth = v.px(2);
      ctx.beginPath(); ctx.arc(p.x, p.y, r + v.px(6 + 24 * k), 0, TAU); ctx.stroke();
    }
  }
  function drawCone(ctx, v, c, now) {
    var r = Math.max(c.r, v.px(7)), hit = c.hitT > 0 && now - c.hitT < 0.9;
    if (c.knocked) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot || 0.6);
      ctx.fillStyle = COL.orange; ctx.beginPath(); ctx.moveTo(-r * 1.6, -r * 0.7); ctx.lineTo(r * 1.4, 0); ctx.lineTo(-r * 1.6, r * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = COL.white; ctx.fillRect(-r * 0.6, -r * 0.35, r * 0.5, r * 0.7);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(c.x + v.px(2), c.y - v.px(2), r * 1.1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#B85A10'; ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
      ctx.fillStyle = COL.orange; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.85, 0, TAU); ctx.fill();
      ctx.fillStyle = COL.white; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.55, 0, TAU); ctx.fill();
      ctx.fillStyle = COL.orange; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.3, 0, TAU); ctx.fill();
    }
    if (hit) {
      var k = (now - c.hitT) / 0.9;
      ctx.strokeStyle = 'rgba(222,144,144,' + (1 - k).toFixed(2) + ')'; ctx.lineWidth = v.px(2);
      ctx.beginPath(); ctx.arc(c.x, c.y, r + v.px(6 + 24 * k), 0, TAU); ctx.stroke();
    }
  }
  function drawCar(ctx, v, C, p, s, o) {
    var ro = rearOverhang(C), f = C.wheelbase + C.frontOverhang, w = C.width / 2, L = C.wheelbase, t = C.track / 2;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.h);
    if (o.ghost) {
      rrect(ctx, -ro, -w, ro + f, 2 * w, 0.3);
      ctx.fillStyle = 'rgba(217,185,120,0.07)'; ctx.fill();
      ctx.strokeStyle = 'rgba(217,185,120,0.7)'; ctx.lineWidth = v.px(1.6); ctx.setLineDash([v.px(5), v.px(4)]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(217,185,120,0.5)';
      ctx.beginPath(); ctx.moveTo(f - 0.3, 0); ctx.lineTo(f - 0.95, 0.34); ctx.lineTo(f - 0.95, -0.34); ctx.closePath(); ctx.fill();
      ctx.restore(); return;
    }
    var sim = o.sim, st = sim.st, ang = ackermann(C, s), blink = Math.floor(st.t * 3) % 2 === 0;
    // headlight beams (night look)
    var beam = ctx.createLinearGradient(f, 0, f + 7, 0);
    beam.addColorStop(0, 'rgba(255,244,214,0.10)'); beam.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(f - 0.05, w - 0.15); ctx.lineTo(f + 7, w + 1.6); ctx.lineTo(f + 7, -w - 1.6); ctx.lineTo(f - 0.05, -w + 0.15); ctx.closePath(); ctx.fill();
    if (st.gear === 'R') {
      var rb = ctx.createLinearGradient(-ro, 0, -ro - 4, 0);
      rb.addColorStop(0, 'rgba(255,255,255,0.14)'); rb.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rb; ctx.beginPath(); ctx.moveTo(-ro, w - 0.2); ctx.lineTo(-ro - 4, w + 0.8); ctx.lineTo(-ro - 4, -w - 0.8); ctx.lineTo(-ro, -w + 0.2); ctx.closePath(); ctx.fill();
    }
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; rrect(ctx, -ro + 0.1, -w - 0.1, ro + f, 2 * w, 0.32); ctx.fill();
    // tyres (under the body)
    function tyre(x, y, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#0B0D10'; rrect(ctx, -C.tyreLen / 2, -C.tyreWid / 2 - 0.02, C.tyreLen, C.tyreWid + 0.04, 0.07); ctx.fill(); ctx.restore(); }
    tyre(L, t, ang[0]); tyre(L, -t, ang[1]); tyre(0, t, 0); tyre(0, -t, 0);
    // body
    ctx.globalAlpha = 0.9;
    var g = ctx.createLinearGradient(0, -w, 0, w);
    g.addColorStop(0, '#C9C5BC'); g.addColorStop(0.25, C.color); g.addColorStop(0.75, C.color); g.addColorStop(1, '#C9C5BC');
    ctx.fillStyle = g; rrect(ctx, -ro, -w, ro + f, 2 * w, 0.34); ctx.fill();
    ctx.globalAlpha = 1;
    // glass and roof
    ctx.fillStyle = '#18202C';
    ctx.beginPath(); ctx.moveTo(2.45, w - 0.14); ctx.lineTo(2.45, -w + 0.14); ctx.lineTo(1.78, -w + 0.2); ctx.lineTo(1.78, w - 0.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.5, w - 0.18); ctx.lineTo(-0.5, -w + 0.18); ctx.lineTo(0.05, -w + 0.22); ctx.lineTo(0.05, w - 0.22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#243042'; ctx.fillRect(0.05, w - 0.2, 1.73, 0.1); ctx.fillRect(0.05, -w + 0.1, 1.73, 0.1);
    ctx.fillStyle = '#DAD6CC'; rrect(ctx, 0.05, -w + 0.2, 1.73, 2 * w - 0.4, 0.1); ctx.fill();
    // learner roof sign
    ctx.fillStyle = COL.gold; rrect(ctx, 0.62, -0.32, 0.5, 0.64, 0.06); ctx.fill();
    ctx.fillStyle = '#6B5424'; ctx.fillRect(0.8, -0.2, 0.14, 0.4);
    // mirrors
    ctx.fillStyle = '#CFCBC2';
    rrect(ctx, C.mirrorX - 0.1, w - 0.02, 0.2, 0.2, 0.05); ctx.fill(); rrect(ctx, C.mirrorX - 0.1, -w - 0.18, 0.2, 0.2, 0.05); ctx.fill();
    // lights
    ctx.fillStyle = '#FFF4D6'; ctx.fillRect(f - 0.12, w - 0.42, 0.1, 0.3); ctx.fillRect(f - 0.12, -w + 0.12, 0.1, 0.3);
    var braking = st.brk > 0.15 && st.engine;
    ctx.fillStyle = braking ? '#FF3B3B' : '#8A1C1C';
    ctx.fillRect(-ro + 0.02, w - 0.42, 0.1, 0.3); ctx.fillRect(-ro + 0.02, -w + 0.12, 0.1, 0.3);
    if (braking) {
      ctx.fillStyle = 'rgba(255,59,59,0.22)';
      ctx.beginPath(); ctx.arc(-ro, w - 0.27, 0.45, 0, TAU); ctx.arc(-ro, -w + 0.27, 0.45, 0, TAU); ctx.fill();
    }
    if (st.gear === 'R') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-ro + 0.02, w - 0.6, 0.08, 0.16); ctx.fillRect(-ro + 0.02, -w + 0.44, 0.08, 0.16); }
    if (st.ind && blink) {
      var sy = st.ind === 'L' ? 1 : -1;
      ctx.fillStyle = '#FFB020';
      ctx.beginPath(); ctx.arc(f - 0.1, sy * (w - 0.1), 0.14, 0, TAU); ctx.arc(-ro + 0.1, sy * (w - 0.1), 0.14, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(C.mirrorX, sy * (w + 0.08), 0.08, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,176,32,0.25)';
      ctx.beginPath(); ctx.arc(f - 0.1, sy * (w - 0.1), 0.42, 0, TAU); ctx.arc(-ro + 0.1, sy * (w - 0.1), 0.42, 0, TAU); ctx.fill();
    }
    // wheel outlines on top so the learner sees where the front wheels point
    ctx.strokeStyle = 'rgba(217,185,120,0.95)'; ctx.lineWidth = v.px(1.3);
    [[L, t, ang[0]], [L, -t, ang[1]]].forEach(function (q) {
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(q[2]);
      rrect(ctx, -C.tyreLen / 2, -C.tyreWid / 2, C.tyreLen, C.tyreWid, 0.06); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(C.tyreLen / 2, 0); ctx.lineTo(C.tyreLen / 2 + 0.35, 0); ctx.stroke();
      ctx.restore();
    });
    ctx.strokeStyle = 'rgba(217,185,120,0.45)';
    [[0, t], [0, -t]].forEach(function (q) { rrect(ctx, q[0] - C.tyreLen / 2, q[1] - C.tyreWid / 2, C.tyreLen, C.tyreWid, 0.06); ctx.stroke(); });
    ctx.restore();
  }
  // predicted path of the rear wheels (gold) and the swinging outer front corner (blue) for the current steering
  function drawPaths(ctx, v, sim) {
    var st = sim.st, C = sim.C, dir = st.gear === 'R' ? -1 : (st.gear === 'D' ? 1 : 0);
    if (!dir || !st.engine) return;
    var delta = st.s * steerMax(C), ds = 0.2 * dir, pose = { x: st.x, y: st.y, h: st.h };
    var t = C.track / 2, f = C.wheelbase + C.frontOverhang, w = C.width / 2, outer = st.s >= 0 ? -w : w;
    var a = [], b = [], c = [];
    for (var i = 0; i <= 40; i++) {
      a.push(toWorld(pose, 0, t)); b.push(toWorld(pose, 0, -t)); c.push(toWorld(pose, f, outer));
      var dh = ds / C.wheelbase * Math.tan(delta), hm = pose.h + dh / 2;
      pose.x += ds * Math.cos(hm); pose.y += ds * Math.sin(hm); pose.h += dh;
    }
    function line(pts, col, width) {
      ctx.strokeStyle = col; ctx.lineWidth = v.px(width); ctx.setLineDash([v.px(7), v.px(5)]);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke();
    }
    line(a, 'rgba(217,185,120,0.75)', 2); line(b, 'rgba(217,185,120,0.75)', 2); line(c, 'rgba(127,178,229,0.7)', 1.6);
    ctx.setLineDash([]);
  }
  // mirror + blind-spot check sweep (M)
  function drawObservation(ctx, v, sim, age) {
    var st = sim.st, C = sim.C, eye = toWorld(st, C.driverX, C.driverY);
    var wedges = [[25, 70], [100, 160], [160, 200], [-160, -110], [-70, -25]];
    wedges.forEach(function (wd, i) {
      var k = clamp(age * 4 - i * 0.55, 0, 1), fade = clamp(1.4 - age, 0, 1) * k;
      if (fade <= 0) return;
      var a0 = st.h + wd[0] * DEG, a1 = st.h + wd[1] * DEG, r = 6.5;
      var gr = ctx.createRadialGradient(eye[0], eye[1], 0.2, eye[0], eye[1], r);
      gr.addColorStop(0, 'rgba(217,185,120,' + (0.32 * fade).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(217,185,120,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(eye[0], eye[1]); ctx.arc(eye[0], eye[1], r, Math.min(a0, a1), Math.max(a0, a1)); ctx.closePath(); ctx.fill();
    });
  }

  // ------------------------------------------------------------------ 10. HUD styles + icons (scoped under .yd)
  var CSS = [
    '.yd{--bg:#0A0E15;--panel:#101724;--panel2:#0D131E;--line:#1E2A3C;--ink:#EAE6DB;--muted:#97A1B4;--gold:#D9B978;--ok:#8CC8A0;--warn:#E2A65C;--bad:#DE9090;',
    'position:relative;display:flex;flex-direction:column;width:100%;height:100%;min-height:320px;background:var(--bg);color:var(--ink);',
    "font-family:'Readex Pro',Alexandria,system-ui,sans-serif;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;box-sizing:border-box;text-align:start}",
    '.yd *,.yd *::before,.yd *::after{box-sizing:border-box}',
    '.yd button{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none}',
    '.yd button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}',
    '.yd-top{display:flex;align-items:center;gap:8px;padding:6px 10px;padding-top:calc(6px + env(safe-area-inset-top,0px));background:var(--panel2);border-bottom:1px solid var(--line);min-height:48px;flex:0 0 auto}',
    '.yd-title{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:8px}',
    ".yd-name{font-family:Alexandria,'Readex Pro',sans-serif;font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}",
    '.yd-mode{flex:0 0 auto;font-size:11px;line-height:18px;padding:0 8px;border-radius:999px;border:1px solid #3A3222;color:var(--gold);background:rgba(217,185,120,.08);white-space:nowrap}',
    '.yd-test .yd-mode{color:var(--warn);border-color:#4A3620;background:rgba(226,166,92,.08)}',
    ".yd-meta{flex:0 0 auto;display:flex;gap:10px;font-family:'Space Grotesk',sans-serif;font-size:13px;color:var(--muted);white-space:nowrap;direction:ltr}",
    '.yd-meta b{color:var(--ink);font-weight:600}',
    '.yd-tools{flex:0 0 auto;display:flex;gap:6px}',
    '.yd-ib{width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--panel);display:grid;place-items:center;padding:0;color:var(--ink)}',
    '.yd-ib:hover{border-color:#34445E}',
    '.yd-ib svg,.yd-mb svg,.yd-tb svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.yd-ib[aria-pressed=true]{border-color:var(--gold);color:var(--gold)}',
    '.yd-coach{display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:var(--panel);border-bottom:1px solid var(--line);min-height:50px;flex:0 0 auto}',
    ".yd-stepn{flex:0 0 auto;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;color:#1A1408;background:var(--gold);border-radius:999px;padding:1px 8px;margin-top:3px;direction:ltr}",
    '.yd-test .yd-stepn{background:var(--warn)}',
    '.yd-coach-b{flex:1 1 auto;min-width:0}',
    ".yd-say{margin:0;font-size:15px;line-height:1.6;font-family:Alexandria,'Readex Pro',sans-serif;font-weight:500}",
    '.yd-say.flash{animation:ydFlash .5s ease-out}',
    '.yd-keys{display:flex;gap:5px;flex-wrap:wrap;margin-top:4px;align-items:center;font-size:12px;color:var(--muted)}',
    ".yd kbd{font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;min-width:24px;line-height:18px;padding:0 6px;border-radius:6px;border:1px solid #33425A;border-bottom-width:2px;background:var(--panel2);color:var(--ink);text-align:center;direction:ltr;display:inline-block}",
    '.yd-stage{position:relative;flex:1 1 auto;min-height:160px;overflow:hidden;background:#0F151E}',
    '.yd-stage canvas{position:absolute;left:0;top:0;display:block;touch-action:none}',
    '.yd-dash{position:absolute;left:10px;bottom:10px;display:flex;align-items:center;gap:12px;padding:7px 12px;background:rgba(13,19,30,.88);border:1px solid var(--line);border-radius:14px;direction:ltr;pointer-events:none}',
    ".yd-spd{display:flex;align-items:baseline;gap:4px;min-width:62px}.yd-spd b{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;line-height:1;min-width:30px;text-align:right}.yd-spd small{font-size:11px;color:var(--muted);white-space:nowrap}",
    ".yd-gears{display:flex;gap:2px;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px}.yd-gears span{color:#46536A;width:16px;text-align:center}.yd-gears span.on{color:var(--gold)}",
    '.yd-sw{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:64px;color:var(--gold)}.yd-sw svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.yd-swt{font-size:10.5px;color:var(--muted);white-space:nowrap;direction:rtl}',
    '.yd-ic{color:#3A4556;display:grid;place-items:center}.yd-ic svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}',
    '.yd-ic.ind.on{color:#FFB020}.yd-ic.hb.on{color:#E45656}.yd-ic.eye.on{color:var(--gold)}',
    '.yd-toasts{position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;width:min(92%,460px);z-index:3}',
    '.yd-toast{padding:7px 14px;border-radius:12px;background:rgba(16,23,36,.95);border:1px solid var(--line);font-size:14px;line-height:1.5;text-align:center;animation:ydIn .18s ease-out;box-shadow:0 6px 20px rgba(0,0,0,.35)}',
    '.yd-toast.warn{border-color:var(--warn);color:#F4D9B5}.yd-toast.bad{border-color:var(--bad);color:#F4CCCC}.yd-toast.ok{border-color:var(--ok);color:#CDEBD7}',
    '.yd-legend{position:absolute;right:10px;bottom:10px;padding:6px 10px;background:rgba(13,19,30,.88);border:1px solid var(--line);border-radius:12px;font-size:11.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;max-width:min(560px,calc(100% - 430px))}',
    '.yd-legend .it{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}.yd-legend .k{display:inline-flex;gap:2px;direction:ltr}.yd-legend kbd{font-size:11px;min-width:20px;line-height:16px;padding:0 4px}',
    '.yd-legend.min .it{display:none}',
    '.yd-legend button{background:none;border:0;color:var(--gold);font-size:11.5px;padding:0}',
    '.yd-signal{position:absolute;inset:0;display:none;align-items:center;justify-content:center;pointer-events:none;z-index:4}',
    '.yd-signal.on{display:flex;animation:ydPop .25s ease-out}',
    ".yd-oct{width:132px;height:132px;background:#C8202A;clip-path:polygon(29% 0,71% 0,100% 29%,100% 71%,71% 100%,29% 100%,0 71%,0 29%);display:grid;place-items:center;font-family:Alexandria,sans-serif;font-weight:800;font-size:44px;color:#fff}",
    ".yd-go{padding:14px 26px;border-radius:18px;background:rgba(30,123,71,.92);font-family:Alexandria,sans-serif;font-weight:700;font-size:26px;color:#fff}",
    '.yd-ov{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,14,21,.74);padding:14px;z-index:6}',
    '.yd-ov.on{display:flex}',
    '.yd-card{width:min(440px,100%);max-height:100%;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:16px 16px 14px;box-shadow:0 20px 50px rgba(0,0,0,.45)}',
    ".yd-card h3{margin:0 0 10px;font-family:Alexandria,sans-serif;font-size:19px;font-weight:700}",
    '.yd-menu{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.yd-mb{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:8px 10px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);font-size:14px;color:var(--ink);text-align:center}',
    '.yd-mb.pri{background:var(--gold);border-color:var(--gold);color:#1A1408;font-weight:600}',
    '.yd-mb.wide{grid-column:1/-1}',
    '.yd-mb[aria-pressed=true]{border-color:var(--gold);color:var(--gold)}',
    '.yd-small{margin:10px 0 0;font-size:12px;color:var(--muted);line-height:1.6}',
    '.yd-res-top{display:flex;align-items:center;gap:14px;margin-bottom:10px}',
    ".yd-ring{position:relative;width:74px;height:74px;flex:0 0 auto}.yd-ring svg{width:74px;height:74px;transform:rotate(-90deg)}.yd-ring b{position:absolute;inset:0;display:grid;place-items:center;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700}",
    '.yd-res-t{font-family:Alexandria,sans-serif;font-size:22px;font-weight:700;margin:0}.yd-res-t.ok{color:var(--ok)}.yd-res-t.bad{color:var(--bad)}',
    '.yd-res-s{margin:2px 0 0;color:var(--muted);font-size:13px}',
    '.yd-stats{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}',
    ".yd-stat{padding:4px 9px;border-radius:10px;background:var(--panel2);border:1px solid var(--line);font-size:12.5px;color:var(--muted)}.yd-stat b{color:var(--ink);font-weight:600;margin-inline-start:4px}.yd-stat .n{font-family:'Space Grotesk',sans-serif;direction:ltr;unicode-bidi:isolate}",
    '.yd-mis{list-style:none;margin:6px 0 12px;padding:0;display:flex;flex-direction:column;gap:6px}',
    '.yd-mis li{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;background:rgba(222,144,144,.07);border:1px solid rgba(222,144,144,.25);font-size:14px}',
    ".yd-mis li i{font-style:normal;margin-inline-start:auto;font-family:'Space Grotesk',sans-serif;font-size:12px;color:var(--bad);white-space:nowrap}",
    '.yd-mis li.none{background:rgba(140,200,160,.08);border-color:rgba(140,200,160,.3)}',
    '.yd-check{position:absolute;top:10px;right:10px;display:flex;flex-wrap:wrap;gap:6px;max-width:min(360px,calc(100% - 20px));z-index:2}',
    '.yd-cb{display:flex;align-items:center;gap:6px;min-height:36px;padding:4px 10px;border-radius:10px;border:1px solid var(--line);background:rgba(13,19,30,.92);font-size:13px;color:var(--ink)}',
    '.yd-cb.done{border-color:rgba(140,200,160,.5);color:var(--ok)}',
    '.yd-cb .n{font-family:\'Space Grotesk\',sans-serif;font-size:11px;color:var(--muted)}',
    '.yd-cs{display:flex;flex-wrap:wrap;gap:4px;width:100%}.yd-narrow .yd-cs{display:none}.yd-narrow .yd-cb{min-height:32px;font-size:12.5px;padding:3px 8px}.yd-narrow .yd-check{gap:5px;top:8px;right:8px}',
    '.yd-cs span{font-size:11px;padding:1px 7px;border-radius:999px;border:1px solid var(--line);background:rgba(13,19,30,.9);color:var(--muted)}.yd-cs span.done{color:var(--ok);border-color:rgba(140,200,160,.45)}',
    // touch controls
    '.yd-ctl{display:none;flex:0 0 auto;direction:ltr;touch-action:none;padding:8px 10px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));background:var(--panel2);border-top:1px solid var(--line)}',
    '.yd-touch .yd-ctl{display:grid;grid-template-columns:auto 1fr auto;grid-template-areas:"row row row" "wheel gear ped";gap:8px 8px;align-items:end}',
    '.yd-row{grid-area:row;display:flex;gap:6px}',
    '.yd-tb{flex:1 1 0;min-width:0;height:44px;border-radius:11px;border:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:11px;line-height:1.2;color:var(--ink);padding:0 2px;white-space:nowrap}.yd-tb svg{flex:0 0 auto;width:17px;height:17px}',
    '.yd-tb.on{border-color:#FFB020;color:#FFB020}.yd-tb.hbon{border-color:#E45656;color:#E45656}.yd-tb.flash{border-color:var(--gold);color:var(--gold)}',
    '.yd-wheelw{grid-area:wheel;width:var(--wh,150px);height:var(--wh,150px);position:relative;touch-action:none}',
    '.yd-wheel{width:100%;height:100%;border-radius:50%;touch-action:none;cursor:grab}',
    '.yd-wheel svg{width:100%;height:100%;display:block;pointer-events:none}',
    '.yd-gear{grid-area:gear;justify-self:center;display:flex;flex-direction:column;gap:5px;padding:5px;border-radius:14px;background:var(--panel);border:1px solid var(--line)}',
    ".yd-gb{width:44px;height:34px;border-radius:9px;border:1px solid transparent;background:var(--panel2);font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;color:#6B778C}",
    '.yd-gb.on{background:var(--gold);color:#1A1408}',
    '.yd-ped{grid-area:ped;display:flex;gap:8px;align-items:flex-end}',
    '.yd-pd{border-radius:14px;border:1px solid #2B3850;background:linear-gradient(180deg,#1A2436,#111A28);color:var(--muted);font-size:13px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:10px;touch-action:none;background-image:repeating-linear-gradient(180deg,rgba(255,255,255,.05) 0 3px,transparent 3px 11px)}',
    '.yd-pd.brk{width:78px;height:112px}.yd-pd.gas{width:58px;height:140px}',
    '.yd-pd.down{border-color:var(--gold);color:var(--gold);transform:translateY(2px) scale(.98)}.yd-pd.brk.down{border-color:var(--bad);color:var(--bad)}',
    // landscape touch: controls float over the stage
    '.yd-touch.yd-land .yd-ctl{position:absolute;left:0;right:0;bottom:0;background:none;border:0;pointer-events:none;grid-template-columns:auto 1fr auto auto;grid-template-areas:"wheel row gear ped";padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px))}',
    '.yd-touch.yd-land .yd-ctl>*{pointer-events:auto}',
    '.yd-touch.yd-land .yd-row{align-self:end;justify-self:center;max-width:420px;width:100%}',
    '.yd-touch.yd-land .yd-tb{background:rgba(16,23,36,.88)}',
    '.yd-touch.yd-land .yd-dash{top:8px;left:8px;bottom:auto;display:grid;grid-template-columns:auto 1fr auto;grid-template-areas:"il spd ir" "gr gr gr" "sw sw hb";width:150px;gap:3px 6px;padding:6px 9px;justify-items:center}',
    '.yd-land .yd-ic.ind.l{grid-area:il}.yd-land .yd-ic.ind.r{grid-area:ir}.yd-land .yd-spd{grid-area:spd;min-width:0}.yd-land .yd-gears{grid-area:gr}.yd-land .yd-sw{grid-area:sw;flex-direction:row;gap:5px;min-width:0}.yd-land .yd-ic.hb{grid-area:hb}.yd-land .yd-ic.eye{display:none}',
    '.yd-land .yd-gb{height:28px;width:42px;font-size:14px}.yd-land .yd-gear{gap:4px;padding:4px}.yd-land .yd-pd.brk{width:70px;height:96px}.yd-land .yd-pd.gas{width:52px;height:118px}.yd-land .yd-tb{height:40px}',
    '.yd-touch .yd-legend{display:none}',
    '.yd-short .yd-coach{min-height:0;padding:5px 10px}.yd-short .yd-say{font-size:13.5px;line-height:1.45}.yd-short .yd-top{min-height:40px;padding-top:4px;padding-bottom:4px}',
    '.yd-narrow .yd-meta{gap:6px;font-size:12px}.yd-narrow .yd-dash{gap:9px;padding:5px 10px;left:8px;bottom:8px}.yd-narrow .yd-spd b{font-size:22px}.yd-narrow .yd-spd{min-width:52px}',
    '@keyframes ydIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}',
    '@keyframes ydPop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}',
    '@keyframes ydFlash{from{color:var(--gold)}to{color:inherit}}',
    '@media (prefers-reduced-motion:reduce){.yd *{animation:none!important;transition:none!important}}',
    '.yd-rm *{animation:none!important;transition:none!important}'
  ].join('\n');
  function injectCSS(doc) {
    if (doc.querySelector('style[data-yard-css]')) return;
    var s = doc.createElement('style');
    s.setAttribute('data-yard-css', '1');
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }
  var ICON = {
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
    restart: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><path d="M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3"/><circle cx="12" cy="12" r="3"/></svg>',
    demo: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M10 5l-7 7 7 7M3 12h18"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M14 5l7 7-7 7M21 12H3"/></svg>',
    hb: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5"/><path d="M10 15V9h2.3a1.8 1.8 0 0 1 0 3.6H10"/><path d="M4.5 6.5a9.5 9.5 0 0 0 0 11M19.5 6.5a9.5 9.5 0 0 1 0 11"/></svg>',
    centre: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M12 3.5v6.5M4 13.5l6-1M20 13.5l-6-1"/></svg>',
    wheel: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3v6.6M3.6 13.8l6.2-1.2M20.4 13.8l-6.2-1.2"/></svg>'
  };
  var WHEEL_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43" fill="none" stroke="#24324A" stroke-width="11"/>' +
    '<circle cx="50" cy="50" r="48.5" fill="none" stroke="#33445F" stroke-width="1.5"/><circle cx="50" cy="50" r="37.5" fill="none" stroke="#33445F" stroke-width="1.5"/>' +
    '<rect x="46" y="2.5" width="8" height="13" rx="2.5" fill="#D9B978"/>' +
    '<path d="M50 52 L14 58 M50 52 L86 58 M50 52 L50 90" stroke="#24324A" stroke-width="9" stroke-linecap="round" fill="none"/>' +
    '<circle cx="50" cy="52" r="13" fill="#162033" stroke="#3A4C6A" stroke-width="2"/><circle cx="50" cy="52" r="4" fill="#D9B978"/></svg>';

  // ------------------------------------------------------------------ 11. controller: DOM, HUD, sound
  var LS_KEY = 'miqwad.yard.v1';
  function lsGet() { try { return JSON.parse(W.localStorage.getItem(LS_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function lsSet(patch) { try { var o = lsGet(); merge(o, patch); W.localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) { /* private mode */ } }
  function getDef(id) { for (var i = 0; i < EXERCISES.length; i++) if (EXERCISES[i].id === id) return EXERCISES[i]; return null; }
  var CHECKS = [['doors', 'الأبواب', '1'], ['seat', 'المقعد', '2'], ['mirrors', 'المرايات', '3'], ['belt', 'الحزام', '4'], ['engine', 'المحرك', '5']];
  var CHECK_SUB = [['brake', 'فرامل'], ['D', 'D'], ['hbOff', 'هاندبريك'], ['ind', 'غماز'], ['obs', 'نظرة']];
  var LEGEND = [[['↑'], 'بنزين'], [['↓', 'Space'], 'فرامل'], [['←', '→'], 'الدركسيون'], [['C'], 'توسيط'],
    [['P', 'R', 'N', 'D'], 'الغيار'], [['Q', 'E'], 'الغماز'], [['M'], 'نظرة'], [['H'], 'الهاندبريك'], [['Esc'], 'إيقاف']];
  var STAT_LBL = {
    moves: ['الحركات', ''], angleErr: ['ميلان السيارة', '°'], maxRollBack: ['الرجوع عالمطلع', 'سم'], stopLineErr: ['البعد عن خط الوقوف', 'سم'],
    speedAtSignal: ['السرعة وقت الإشارة', 'كم/ساعة'], reaction: ['ردة الفعل', 'ث'], stopDist: ['مسافة الوقوف', 'م'], allowedDist: ['المسموح', 'م'],
    knocked: ['أقماع وقعت', ''], maxKmh: ['أعلى سرعة', 'كم/ساعة'], observations: ['نظرات المرايا', ''], kerbGap: ['البعد عن الرصيف', 'سم'],
    totalDist: ['من الإشارة للوقوف', 'م']
  };
  var STAT_PICK = {
    'pre-drive-check': ['maxKmh'], parallel: ['moves', 'angleErr', 'kerbGap'], 'reverse-bay': ['moves', 'angleErr'], 'forward-bay': ['moves', 'angleErr'],
    angle: ['moves', 'angleErr'], 'hill-start': ['maxRollBack', 'stopLineErr'], 'emergency-stop': ['speedAtSignal', 'reaction', 'stopDist', 'allowedDist'],
    'three-point-turn': ['moves', 'angleErr'], slalom: ['knocked', 'maxKmh'], free: ['maxKmh', 'observations']
  };
  function turnsText(s, C) {
    var a = Math.abs(s);
    if (a < 0.04) return 'دغري';
    var side = s > 0 ? 'شمال' : 'يمين';
    if (a > 0.97) return 'عالآخر ' + side;
    var q = Math.max(1, Math.round(a * C.wheelTurns * 4));
    var names = { 1: 'ربع لفة', 2: 'نص لفة', 3: 'تلات أرباع', 4: 'لفة', 5: 'لفة وربع', 6: 'لفة ونص', 7: 'لفة وتلات أرباع', 8: 'لفتين' };
    return (names[q] || (q / 4 + ' لفة')) + ' ' + side;
  }
  function template() {
    var legend = LEGEND.map(function (r) {
      return '<span class="it"><span class="k">' + r[0].map(function (k) { return '<kbd>' + esc(k) + '</kbd>'; }).join('') + '</span>' + esc(r[1]) + '</span>';
    }).join('');
    return '' +
      '<div class="yd-top"><div class="yd-title"><span class="yd-name"></span><span class="yd-mode"></span></div>' +
      '<div class="yd-meta"><span class="yd-mv"></span><b class="yd-time">00:00</b></div>' +
      '<div class="yd-tools"><button type="button" class="yd-ib" data-act="demo" title="شوف الطريقة" aria-label="شوف الطريقة">' + ICON.demo + '</button>' +
      '<button type="button" class="yd-ib" data-act="camera" title="الكاميرا" aria-label="الكاميرا">' + ICON.camera + '</button>' +
      '<button type="button" class="yd-ib" data-act="pause" title="إيقاف مؤقت" aria-label="إيقاف مؤقت">' + ICON.pause + '</button></div></div>' +
      '<div class="yd-coach"><span class="yd-stepn"></span><div class="yd-coach-b"><p class="yd-say" aria-live="polite"></p><div class="yd-keys"></div></div></div>' +
      '<div class="yd-stage"><canvas role="img" aria-label="ساحة التدريب من فوق"></canvas>' +
      '<div class="yd-check" hidden></div>' +
      '<div class="yd-dash"><span class="yd-ic ind l">' + ICON.left + '</span><div class="yd-spd"><b>0</b><small>كم/س</small></div>' +
      '<div class="yd-gears"><span>P</span><span>R</span><span>N</span><span>D</span></div>' +
      '<div class="yd-sw">' + ICON.wheel + '<span class="yd-swt">دغري</span></div>' +
      '<span class="yd-ic hb" title="الهاندبريك">' + ICON.hb + '</span><span class="yd-ic eye" title="النظرة">' + ICON.eye + '</span>' +
      '<span class="yd-ic ind r">' + ICON.right + '</span></div>' +
      '<div class="yd-legend">' + legend + '<button type="button" data-act="legend">إخفاء المفاتيح</button></div>' +
      '<div class="yd-toasts"></div><div class="yd-signal"></div>' +
      '<div class="yd-ov yd-pause"><div class="yd-card"><h3>متوقف مؤقتا</h3><div class="yd-menu">' +
      '<button type="button" class="yd-mb pri wide" data-act="resume">كمل التدريب</button>' +
      '<button type="button" class="yd-mb" data-act="restart">' + ICON.restart + ' ابدأ من جديد</button>' +
      '<button type="button" class="yd-mb" data-act="mode"></button>' +
      '<button type="button" class="yd-mb" data-act="demo">' + ICON.demo + ' شوف الطريقة</button>' +
      '<button type="button" class="yd-mb" data-act="end">إنهاء المحاولة</button>' +
      '<button type="button" class="yd-mb" data-act="overlays">مساعدات على الأرض</button>' +
      '<button type="button" class="yd-mb" data-act="slow">حركة بطيئة</button>' +
      '<button type="button" class="yd-mb" data-act="sound">الصوت</button>' +
      '<button type="button" class="yd-mb" data-act="touch">أزرار اللمس</button>' +
      '</div><p class="yd-small yd-desc"></p></div></div>' +
      '<div class="yd-ov yd-result"><div class="yd-card"></div></div></div>' +
      '<div class="yd-ctl"><div class="yd-row">' +
      '<button type="button" class="yd-tb" data-t="indL" aria-label="غماز شمال">' + ICON.left + '<span>غماز</span></button>' +
      '<button type="button" class="yd-tb" data-t="obs" aria-label="نظرة المرايا">' + ICON.eye + '<span>نظرة</span></button>' +
      '<button type="button" class="yd-tb" data-t="indR" aria-label="غماز يمين">' + ICON.right + '<span>غماز</span></button>' +
      '<button type="button" class="yd-tb" data-t="hb" aria-label="الهاندبريك">' + ICON.hb + '<span>هاندبريك</span></button>' +
      '<button type="button" class="yd-tb" data-t="centre" aria-label="رجع الدركسيون للنص">' + ICON.centre + '<span>توسيط</span></button></div>' +
      '<div class="yd-wheelw"><div class="yd-wheel" role="slider" aria-label="الدركسيون" aria-valuemin="-1" aria-valuemax="1" aria-valuenow="0">' + WHEEL_SVG + '</div></div>' +
      '<div class="yd-gear">' + ['P', 'R', 'N', 'D'].map(function (g) { return '<button type="button" class="yd-gb" data-g="' + g + '" aria-label="غيار ' + g + '">' + g + '</button>'; }).join('') + '</div>' +
      '<div class="yd-ped"><div class="yd-pd brk" data-p="brk" role="button" aria-label="فرامل">فرامل</div><div class="yd-pd gas" data-p="thr" role="button" aria-label="بنزين">بنزين</div></div>' +
      '</div>';
  }

  function Sound() {
    var ctx = null, on = true, AC = W.AudioContext || W.webkitAudioContext;
    function ensure() {
      if (!on || !AC) return null;
      if (!ctx) { try { ctx = new AC(); } catch (e) { AC = null; return null; } }
      if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) { /* ignore */ } }
      return ctx;
    }
    function tone(f, d, type, vol, delay, f2) {
      var c = ctx; if (!on || !c || c.state !== 'running') return;
      try {
        var t0 = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + d + 0.02);
      } catch (e) { /* ignore audio errors */ }
    }
    return {
      unlock: ensure, set: function (v) { on = !!v; }, get: function () { return on; },
      tick: function () { tone(1900, 0.03, 'square', 0.025); },
      hit: function () { tone(140, 0.25, 'sine', 0.2, 0, 60); tone(90, 0.18, 'triangle', 0.12); },
      ok: function () { tone(784, 0.16, 'sine', 0.09); tone(1175, 0.3, 'sine', 0.09, 0.14); },
      bad: function () { tone(330, 0.22, 'sawtooth', 0.05); tone(220, 0.35, 'sawtooth', 0.05, 0.18); },
      signal: function () { tone(1400, 0.18, 'square', 0.06); tone(1400, 0.18, 'square', 0.06, 0.24); },
      click: function () { tone(600, 0.03, 'square', 0.02); },
      close: function () { try { if (ctx && ctx.close) ctx.close(); } catch (e) { /* ignore */ } ctx = null; }
    };
  }

  function mount(el, opts) {
    opts = opts || {};
    if (!el || !el.appendChild) throw new Error('Yard.mount(el, opts): el must be a DOM element');
    var doc = el.ownerDocument || W.document, win = doc.defaultView || W;
    injectCSS(doc);
    var prefs = lsGet();
    var S = {
      ex: getDef(opts.exercise) ? opts.exercise : 'parallel', mode: opts.mode === 'test' ? 'test' : 'learn',
      overlays: opts.overlays != null ? !!opts.overlays : prefs.overlays !== false, slow: !!opts.slow,
      cam: opts.camera || null, camMode: 'fit', touchPref: opts.touch != null ? opts.touch : (prefs.touch != null ? prefs.touch : 'auto'),
      paused: false, dead: false, demo: false, legendMin: !!prefs.legendMin, sayUntil: 0, sayText: '', toastLast: {}, result: null,
      signalUntil: 0, obsToastT: -99, blink: false, rm: !!opts.reducedMotion, fill: opts.fill || 'auto'
    };
    var sound = Sound();
    sound.set(opts.sound != null ? !!opts.sound : prefs.sound !== false);
    var root = doc.createElement('div');
    root.className = 'yd' + (opts.reducedMotion ? ' yd-rm' : ''); root.setAttribute('dir', 'rtl'); root.setAttribute('lang', 'ar');
    root.innerHTML = template();
    el.appendChild(root);
    function q(sel) { return root.querySelector(sel); }
    var E = {
      name: q('.yd-name'), mode: q('.yd-mode'), time: q('.yd-time'), mv: q('.yd-mv'), stepn: q('.yd-stepn'), say: q('.yd-say'), keys: q('.yd-keys'),
      stage: q('.yd-stage'), canvas: q('canvas'), check: q('.yd-check'), dash: q('.yd-dash'), spd: q('.yd-spd b'), gears: root.querySelectorAll('.yd-gears span'),
      sw: q('.yd-sw svg'), swt: q('.yd-swt'), indL: q('.yd-ic.ind.l'), indR: q('.yd-ic.ind.r'), hb: q('.yd-ic.hb'), eye: q('.yd-ic.eye'),
      legend: q('.yd-legend'), toasts: q('.yd-toasts'), signal: q('.yd-signal'), pause: q('.yd-pause'), result: q('.yd-result'),
      resCard: q('.yd-result .yd-card'), desc: q('.yd-desc'), wheel: q('.yd-wheel'), wheelSvg: q('.yd-wheel svg'), gearBtns: root.querySelectorAll('.yd-gb'),
      tb: {}, pedals: root.querySelectorAll('.yd-pd')
    };
    Array.prototype.forEach.call(root.querySelectorAll('.yd-tb'), function (b) { E.tb[b.getAttribute('data-t')] = b; });
    var view = new View(E.canvas);
    var inst = null, sim = null, robot = null, raf = 0, last = 0, acc = 0, clock = 0, L = [], timers = [], keys = {}, pedal = {};
    var wheelDeg = 0, wheelA0 = 0, H = {}, ro = null;
    function on(t, type, fn, o) { t.addEventListener(type, fn, o || false); L.push([t, type, fn, o || false]); }
    function later(fn, ms) { var id = win.setTimeout(function () { timers = timers.filter(function (x) { return x !== id; }); fn(); }, ms); timers.push(id); }
    function emit(e) { if (opts.onEvent) { try { opts.onEvent(e); } catch (err) { if (W.console) W.console.error(err); } } }
    function isTouch() { return root.classList.contains('yd-touch'); }

    function start() {
      var def = getDef(S.ex);
      var pp = opts.params ? (opts.params[S.ex] || (S.ex === opts.exercise && !getDef(Object.keys(opts.params)[0]) ? opts.params : null)) : null;
      inst = buildInstance(def, { emirate: opts.emirate, params: pp });
      sim = new Sim(inst, { mode: S.mode, car: inst.car, phys: inst.phys, seed: opts.seed });
      sim.on(onSim);
      robot = null; S.demo = false; S.result = null; S.sayUntil = 0; S.signalUntil = 0; H = {};
      keys = {}; pedal = {}; wheelDeg = 0;
      Array.prototype.forEach.call(E.pedals, function (p) { p.classList.remove('down'); });
      E.result.classList.remove('on'); E.signal.classList.remove('on'); E.toasts.innerHTML = '';
      S.camMode = S.cam || inst.camera || 'fit'; view.fcx = null;
      staticHud(); buildCheck(); layout();
      emit({ type: 'start', exercise: S.ex, mode: S.mode });
      setPaused(false);
    }
    function staticHud() {
      var def = inst.def, learn = S.mode === 'learn';
      root.classList.toggle('yd-learn', learn); root.classList.toggle('yd-test', !learn);
      E.name.textContent = def.name;
      E.mode.textContent = learn ? 'تعلم' : 'اختبار';
      q('.yd-tools [data-act=demo]').hidden = !(learn && inst.demo);
      q('.yd-menu [data-act=demo]').hidden = !(learn && inst.demo);
      q('.yd-menu [data-act=mode]').textContent = learn ? 'جرب وضع الاختبار' : 'ارجع لوضع التعلم';
      q('.yd-menu [data-act=overlays]').hidden = !learn;
      q('.yd-menu [data-act=slow]').hidden = !learn;
      [['overlays', S.overlays], ['slow', S.slow], ['sound', sound.get()], ['touch', isTouch()]].forEach(function (p) {
        q('.yd-menu [data-act=' + p[0] + ']').setAttribute('aria-pressed', p[1] ? 'true' : 'false');
      });
      q('.yd-tools [data-act=camera]').setAttribute('aria-pressed', S.camMode === 'follow' ? 'true' : 'false');
      E.desc.textContent = def.desc;
      E.legend.classList.toggle('min', S.legendMin);
      q('.yd-legend button').textContent = S.legendMin ? 'المفاتيح' : 'إخفاء المفاتيح';
    }
    function buildCheck() {
      if (S.ex !== 'pre-drive-check') { E.check.hidden = true; E.check.innerHTML = ''; return; }
      E.check.hidden = false;
      E.check.innerHTML = CHECKS.map(function (c) {
        return '<button type="button" class="yd-cb" data-chk="' + c[0] + '"><span class="n">' + c[2] + '</span>' + esc(c[1]) + '</button>';
      }).join('') + '<div class="yd-cs">' + CHECK_SUB.map(function (c) { return '<span data-sub="' + c[0] + '">' + esc(c[1]) + '</span>'; }).join('') + '</div>';
    }
    function updateCheck() {
      if (S.ex !== 'pre-drive-check' || !sim.st.flags.pre) return;
      var f = sim.st.flags.pre, st = sim.st;
      Array.prototype.forEach.call(E.check.querySelectorAll('[data-chk]'), function (b) { b.classList.toggle('done', !!f[b.getAttribute('data-chk')]); });
      var sub = { brake: f.brake, D: f.D, hbOff: f.hbOff, ind: st.ind === 'L' || (st.moves > 0 && !st.codes.no_indicator), obs: st.obsCount > 0 };
      Array.prototype.forEach.call(E.check.querySelectorAll('[data-sub]'), function (s) { s.classList.toggle('done', !!sub[s.getAttribute('data-sub')]); });
    }
    function setText(elm, key, v) { if (H[key] !== v) { H[key] = v; elm.textContent = v; } }
    function setCls(elm, key, cls, v) { v = !!v; if (H[key] !== v) { H[key] = v; elm.classList.toggle(cls, v); } }
    function hud() {
      var st = sim.st, C = sim.C, learn = S.mode === 'learn', mm = inst.limits.maxMoves;
      setText(E.time, 'time', fmtTime(st.t));
      setText(E.mv, 'mv', mm && st.moves ? ('حركات ' + st.moves + '/' + mm) : '');
      setText(E.spd, 'spd', String(Math.round(st.kmh)));
      for (var i = 0; i < 4; i++) setCls(E.gears[i], 'g' + i, 'on', 'PRND'.charAt(i) === st.gear);
      Array.prototype.forEach.call(E.gearBtns, function (b, k) { setCls(b, 'gb' + k, 'on', b.getAttribute('data-g') === st.gear); });
      var deg = Math.round(-st.s * C.wheelTurns * 360);
      if (H.deg !== deg) { H.deg = deg; E.sw.style.transform = 'rotate(' + deg + 'deg)'; E.wheelSvg.style.transform = 'rotate(' + deg + 'deg)'; E.wheel.setAttribute('aria-valuenow', (st.s).toFixed(2)); }
      setText(E.swt, 'swt', turnsText(st.s, C));
      var blink = !!st.ind && Math.floor(st.t * 3) % 2 === 0;
      if (blink !== S.blink) { S.blink = blink; if (st.ind) sound.tick(); }
      setCls(E.indL, 'il', 'on', st.ind === 'L' && blink); setCls(E.indR, 'ir', 'on', st.ind === 'R' && blink);
      setCls(E.tb.indL, 'til', 'on', st.ind === 'L'); setCls(E.tb.indR, 'tir', 'on', st.ind === 'R');
      setCls(E.hb, 'hb', 'on', st.hb); setCls(E.tb.hb, 'thb', 'hbon', st.hb);
      setCls(E.eye, 'eye', 'on', sim.obsOK());
      // coach / examiner line
      var txt = '', n = '', ks = null, hint = null;
      if (clock < S.sayUntil) { txt = S.sayText; n = learn ? 'المدرب' : 'الفاحص'; }
      else if (learn) {
        var sp = sim.stepText();
        if (sp) { txt = sp.text; n = (sp.index + 1) + '/' + sp.count; ks = sp.keys; hint = sp.touch; }
        else txt = inst.def.exam || '';
      } else { txt = inst.def.exam || ''; n = 'الفاحص'; }
      if (S.result) { txt = S.result.passed ? 'خلصت التمرين' : 'انتهت المحاولة'; n = ''; ks = null; hint = null; }
      if (H.say !== txt) { H.say = txt; E.say.textContent = txt; E.say.classList.remove('flash'); void E.say.offsetWidth; E.say.classList.add('flash'); }
      setText(E.stepn, 'stepn', n); E.stepn.hidden = !n;
      var kk = (isTouch() ? (hint ? 't:' + hint : '') : (ks ? ks.join(' ') : ''));
      if (H.keys !== kk) {
        H.keys = kk;
        E.keys.innerHTML = !kk ? '' : (isTouch() ? '<span>' + esc(hint) + '</span>' : ks.map(function (k) { return '<kbd>' + esc(k) + '</kbd>'; }).join(''));
      }
      if (S.signalUntil && clock > S.signalUntil) { S.signalUntil = 0; E.signal.classList.remove('on'); }
      if (S.ex === 'pre-drive-check') updateCheck();
    }
    function toast(text, kind) {
      if (!text) return;
      if (S.toastLast[text] && clock - S.toastLast[text] < 1.6) return;
      S.toastLast[text] = clock;
      var d = doc.createElement('div');
      d.className = 'yd-toast ' + (kind || '');
      d.textContent = text;
      E.toasts.appendChild(d);
      while (E.toasts.children.length > 3) E.toasts.removeChild(E.toasts.firstChild);
      later(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2600);
    }
    function showSignal(kind) {
      E.signal.innerHTML = kind === 'stop' ? '<div class="yd-oct">قف</div>' : '<div class="yd-go">انطلق</div>';
      E.signal.classList.add('on');
      S.signalUntil = clock + (kind === 'stop' ? 2.2 : 1.6);
    }
    function onSim(e) {
      var learn = S.mode === 'learn';
      switch (e.type) {
        case 'mistake': if (learn || e.fatal) toast(e.text, e.fatal && !learn ? 'bad' : 'warn'); break;
        case 'collision': view.shake = e.kind === 'line' || S.rm ? 0 : 1; if (e.kind !== 'line') sound.hit(); break;
        case 'hint': toast(e.text, e.kind === 'warn' || e.kind === 'ok' ? e.kind : ''); break;
        case 'say': S.sayText = e.text; S.sayUntil = clock + 3.2; break;
        case 'signal': showSignal(e.kind); sound.signal(); break;
        case 'observe':
          if (learn && sim.st.t - S.obsToastT > 6) { toast(HINT.obsDone, 'ok'); S.obsToastT = sim.st.t; }
          if (E.tb.obs) { E.tb.obs.classList.add('flash'); later(function () { E.tb.obs.classList.remove('flash'); }, 700); }
          break;
        case 'gear': case 'check': sound.click(); break;
        case 'finish': e.demo = S.demo; onFinish(e.result); break;
      }
      emit(e);
    }
    function onFinish(res) {
      var demo = S.demo;
      S.result = res; robot = null; S.demo = false;
      keys = {}; pedal = {};
      Array.prototype.forEach.call(E.pedals, function (p) { p.classList.remove('down'); });
      if (res.passed) sound.ok(); else sound.bad();
      showResult(res, demo);
      if (!demo && opts.onFinish) { try { opts.onFinish(clone(res)); } catch (err) { if (W.console) W.console.error(err); } }
    }
    // number isolated left-to-right, unit kept in the Arabic flow (so "35.8 كم/س" and "2.5°" read correctly in RTL)
    function fmtStat(k, v) {
      var u = STAT_LBL[k][1], n = (k === 'maxRollBack' || k === 'stopLineErr' || k === 'kerbGap') ? Math.round(v * 100) : Math.round(v * 10) / 10;
      return '<span class="n">' + esc(n + (u === '°' ? '°' : '')) + '</span>' + (u && u !== '°' ? ' ' + esc(u) : '');
    }
    function showResult(res, demo) {
      var learn = S.mode === 'learn', ok = res.passed, r = 31, circ = 2 * PI * r;
      var title = demo ? 'هيك الطريقة الصح' : (ok ? 'نجحت' : 'ما نجحت');
      var sub = demo ? 'شفت الخطوات؟ هلأ دورك، جرب انت' : (learn ? 'وضع التعلم: هاي نتيجتك لو كان اختبار حقيقي' : 'نتيجة الاختبار');
      var stats = '<span class="yd-stat">الوقت<b><span class="n">' + fmtTime(res.time) + '</span></b></span>';
      (STAT_PICK[res.exercise] || []).forEach(function (k) {
        var v = res.stats[k];
        if (v == null || !STAT_LBL[k]) return;
        stats += '<span class="yd-stat">' + esc(STAT_LBL[k][0]) + '<b>' + fmtStat(k, v) + '</b></span>';
      });
      var pts = function (n) { return n === 1 ? 'خصم نقطة' : (n === 2 ? 'خصم نقطتين' : (n > 2 ? 'خصم ' + n + ' نقاط' : 'ملاحظة')); };
      var mis = res.mistakes.length ? res.mistakes.map(function (m) {
        return '<li>' + esc(m.text) + '<i>' + (m.fatal ? 'رسوب فوري' : pts(m.points)) + '</i></li>';
      }).join('') : '<li class="none">بدون أخطاء، ممتاز</li>';
      stats += '<span class="yd-stat">نقاط الخصم<b><span class="n">' + res.demerits + '</span></b></span>';
      var col = ok ? 'var(--ok)' : 'var(--bad)';
      E.resCard.innerHTML =
        '<div class="yd-res-top"><div class="yd-ring"><svg viewBox="0 0 74 74"><circle cx="37" cy="37" r="' + r + '" fill="none" stroke="#1E2A3C" stroke-width="7"/>' +
        '<circle cx="37" cy="37" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * (1 - res.score / 100)).toFixed(1) + '"/></svg>' +
        '<b>' + res.score + '</b></div><div><p class="yd-res-t ' + (ok ? 'ok' : 'bad') + '">' + esc(title) + '</p><p class="yd-res-s">' + esc(inst.def.name) + '، ' + esc(sub) + '</p></div></div>' +
        '<div class="yd-stats">' + stats + '</div><ul class="yd-mis">' + mis + '</ul>' +
        (demo ? '' : '<p class="yd-small" style="margin:0 0 10px">الرسوب: أي خطأ فوري، أو 4 نقاط خصم وأكتر بنفس التمرين</p>') +
        '<div class="yd-menu"><button type="button" class="yd-mb pri" data-act="restart">' + ICON.restart + ' حاول مرة ثانية</button>' +
        '<button type="button" class="yd-mb" data-act="mode">' + (learn ? 'جرب وضع الاختبار' : 'ارجع لوضع التعلم') + '</button>' +
        (learn && inst.demo && !demo ? '<button type="button" class="yd-mb wide" data-act="demo">' + ICON.demo + ' شوف الطريقة</button>' : '') + '</div>';
      E.result.classList.add('on');
      var b = E.resCard.querySelector('button'); if (b && !isTouch()) { try { b.focus({ preventScroll: true }); } catch (err) { b.focus(); } }
    }
    function endAttempt() {
      if (!sim || sim.st.finished) return;
      robot = null; S.demo = false;
      if (S.ex === 'free') sim.finish(true, 'free'); else sim.finish(false, 'abort');
      setPaused(false);
    }
    function act(a) {
      switch (a) {
        case 'pause': setPaused(!S.paused); break;
        case 'resume': setPaused(false); break;
        case 'restart': start(); break;
        case 'mode': ctl.setMode(S.mode === 'learn' ? 'test' : 'learn'); break;
        case 'demo': ctl.demo(); break;
        case 'end': endAttempt(); break;
        case 'overlays': S.overlays = !S.overlays; lsSet({ overlays: S.overlays }); staticHud(); break;
        case 'slow': S.slow = !S.slow; staticHud(); break;
        case 'sound': sound.set(!sound.get()); lsSet({ sound: sound.get() }); staticHud(); break;
        case 'touch': S.touchPref = !isTouch(); lsSet({ touch: S.touchPref }); layout(); staticHud(); break;
        case 'camera': S.cam = S.camMode = S.camMode === 'fit' ? 'follow' : 'fit'; view.fcx = null; fitCamera(); staticHud(); break;
        case 'legend': S.legendMin = !S.legendMin; lsSet({ legendMin: S.legendMin }); staticHud(); break;
      }
    }

    // ---- input
    function press(elm, fn) {
      on(elm, 'pointerdown', function (e) { if (e.button > 0) return; e.preventDefault(); sound.unlock(); fn(); });
      on(elm, 'click', function (e) { if (e.detail === 0) fn(); });
    }
    function cancelDemo() {
      if (!robot) return;
      robot = null; S.demo = false;
      sim.input.thr = 0; sim.input.brk = 0; sim.input.wheel = null;
      toast('انت اللي عم تسوق هلأ', '');
    }
    function applyKeys() {
      if (!sim || robot) return;
      sim.input.thr = keys.thr || pedal.thr ? 1 : 0;
      sim.input.brk = keys.brk || pedal.brk ? 1 : 0;
      var s = (keys.L ? 1 : 0) - (keys.R ? 1 : 0);
      if (s) sim.input.wheel = null;
      sim.input.steer = s;
    }
    function userAct(name, arg) { cancelDemo(); if (name === 'centre') wheelDeg = 0; return sim.action(name, arg); }
    var KEYHOLD = { ArrowUp: 'thr', ArrowDown: 'brk', Space: 'brk', ArrowLeft: 'L', ArrowRight: 'R' };
    function editable(t) { return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')); }
    function visible() { return root.isConnected && root.getClientRects().length > 0; }
    function onKey(e, down) {
      if (S.dead || e.ctrlKey || e.metaKey || e.altKey || editable(e.target) || !visible()) return;
      var c = e.code || '';
      if (down) sound.unlock();
      if (c === 'Escape') { if (down && !e.repeat && !S.result) setPaused(!S.paused); e.preventDefault(); return; }
      if (S.paused) return;
      if (KEYHOLD[c]) {
        if (S.result && down && c === 'Space') return;
        e.preventDefault();
        if (keys[KEYHOLD[c]] === down) return;
        keys[KEYHOLD[c]] = down;
        if (down) cancelDemo();
        applyKeys();
        return;
      }
      if (!down) return;
      if (e.repeat) { if (/^Key[PRNDQEMHC]$/.test(c)) e.preventDefault(); return; }
      if (c === 'Enter' && S.result && e.target === doc.body) { start(); e.preventDefault(); return; }
      if (S.result) return;
      var m = /^Key([PRND])$/.exec(c), n = /^Digit([1-5])$/.exec(c);
      if (m) userAct('gear', m[1]);
      else if (n && S.ex === 'pre-drive-check') sim.action(CHECKS[+n[1] - 1][0]);
      else if (c === 'KeyQ') userAct('ind', 'L');
      else if (c === 'KeyE') userAct('ind', 'R');
      else if (c === 'KeyM') sim.action('obs');
      else if (c === 'KeyH') userAct('hb');
      else if (c === 'KeyC') { sim.input.wheel = null; userAct('centre'); }
      else if (c === 'KeyV') act('camera');
      else return;
      e.preventDefault();
    }
    function releaseAll() { keys = {}; pedal = {}; Array.prototype.forEach.call(E.pedals, function (p) { p.classList.remove('down'); }); applyKeys(); }
    on(win, 'keydown', function (e) { onKey(e, true); });
    on(win, 'keyup', function (e) { onKey(e, false); });
    on(win, 'blur', releaseAll);
    on(doc, 'visibilitychange', function () { if (doc.hidden && !S.paused && !S.dead) setPaused(true); });
    // pedals: press and hold (multi-touch friendly pointer capture)
    Array.prototype.forEach.call(E.pedals, function (p) {
      var k = p.getAttribute('data-p');
      on(p, 'pointerdown', function (e) {
        e.preventDefault(); sound.unlock(); cancelDemo();
        try { p.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        pedal[k] = true; p.classList.add('down'); applyKeys();
      });
      var up = function () { if (!pedal[k]) return; pedal[k] = false; p.classList.remove('down'); applyKeys(); };
      on(p, 'pointerup', up); on(p, 'pointercancel', up); on(p, 'lostpointercapture', up);
    });
    // steering wheel: drag around its centre, multi-turn, stays where you leave it
    function wheelAngle(e) { var r = E.wheel.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); }
    on(E.wheel, 'pointerdown', function (e) {
      e.preventDefault(); sound.unlock(); cancelDemo();
      try { E.wheel.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (sim.input.wheel == null) wheelDeg = -sim.st.s * sim.C.wheelTurns * 360;
      wheelA0 = wheelAngle(e); E.wheel.setAttribute('data-drag', '1');
    });
    on(E.wheel, 'pointermove', function (e) {
      if (!E.wheel.getAttribute('data-drag')) return;
      var a = wheelAngle(e), d = wrap(a - wheelA0), lim = sim.C.wheelTurns * 360;
      wheelA0 = a;
      wheelDeg = clamp(wheelDeg + d / DEG, -lim, lim);
      sim.input.steer = 0; keys.L = keys.R = false;
      sim.input.wheel = -wheelDeg / lim;
    });
    var wheelUp = function () { E.wheel.removeAttribute('data-drag'); };
    on(E.wheel, 'pointerup', wheelUp); on(E.wheel, 'pointercancel', wheelUp);
    Array.prototype.forEach.call(E.gearBtns, function (b) { press(b, function () { userAct('gear', b.getAttribute('data-g')); }); });
    press(E.tb.indL, function () { userAct('ind', 'L'); });
    press(E.tb.indR, function () { userAct('ind', 'R'); });
    press(E.tb.obs, function () { sim.action('obs'); });
    press(E.tb.hb, function () { userAct('hb'); });
    press(E.tb.centre, function () { userAct('centre'); });
    // pre-drive checklist chips (rebuilt per attempt): one delegated handler
    function chk(e) { var b = e.target && e.target.closest ? e.target.closest('[data-chk]') : null; return b && E.check.contains(b) ? b.getAttribute('data-chk') : null; }
    on(E.check, 'pointerdown', function (e) { var c = chk(e); if (!c || e.button > 0) return; e.preventDefault(); sound.unlock(); sim.action(c); });
    on(E.check, 'click', function (e) { var c = chk(e); if (c && e.detail === 0) sim.action(c); });
    on(root, 'click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b || !root.contains(b)) return;
      sound.unlock();
      act(b.getAttribute('data-act'));
    });
    on(E.canvas, 'pointerdown', function () { sound.unlock(); });

    // ---- layout + camera
    function occ(elm, sr) {
      if (!elm || elm.hidden || !elm.getClientRects().length) return null;
      var r = elm.getBoundingClientRect();
      if (!r.width) return null;
      return { l: r.left - sr.left, t: r.top - sr.top, r: sr.right - r.right, b: sr.bottom - r.bottom, w: r.width, h: r.height };
    }
    function pads() {
      var p = { t: 14, r: 14, b: 14, l: 14 }, sr = E.stage.getBoundingClientRect();
      var d = occ(E.dash, sr), land = root.classList.contains('yd-land');
      if (d && land) p.l = Math.max(p.l, d.l + d.w + 10);
      else if (d) { if (d.t < sr.height / 2) p.t = Math.max(p.t, d.t + d.h + 10); else p.b = Math.max(p.b, d.b + d.h + 10); }
      var c = occ(E.check, sr); if (c) p.t = Math.max(p.t, c.t + c.h + 10);
      if (root.classList.contains('yd-land')) {
        var wl = occ(q('.yd-wheelw'), sr), pd = occ(q('.yd-ped'), sr), gr = occ(q('.yd-gear'), sr), rw = occ(q('.yd-row'), sr);
        if (wl) p.l = Math.max(p.l, wl.l + wl.w + 10);
        if (gr) p.r = Math.max(p.r, gr.r + gr.w + 10); else if (pd) p.r = Math.max(p.r, pd.r + pd.w + 10);
        if (rw) p.b = Math.max(p.b, rw.b + rw.h + 8);
      }
      return p;
    }
    function fitCamera() {
      if (!inst) return;
      view.fit(inst.lay.bounds, pads());
      if (!S.cam) {
        var want = inst.camera === 'follow' || view.fitS < 11 ? 'follow' : 'fit';
        if (want !== S.camMode) { S.camMode = want; view.fcx = null; q('.yd-tools [data-act=camera]').setAttribute('aria-pressed', want === 'follow' ? 'true' : 'false'); }
      }
      if (S.camMode === 'follow') { view.fcx = null; view.s = Math.max(view.s, 14); }
    }
    function autoHeight() {
      if (S.fill === 'parent') return;
      var want = S.fill === 'viewport';
      if (!want) {
        var ps = root.style.position; root.style.position = 'absolute';
        var ch = el.clientHeight; root.style.position = ps;
        want = ch < 360;
      }
      if (!want) { root.style.height = ''; return; }
      var top = el.getBoundingClientRect().top, vh = win.innerHeight || 700;
      var hh = top >= 0 && top < vh * 0.45 ? vh - top - 12 : vh * 0.86;
      root.style.height = Math.round(clamp(hh, 420, 1400)) + 'px';
    }
    function layout() {
      if (S.dead) return;
      autoHeight();
      var r = root.getBoundingClientRect(), w = r.width, h = r.height;
      var coarse = false;
      try { coarse = !!(win.matchMedia && win.matchMedia('(pointer: coarse)').matches); } catch (err) { /* ignore */ }
      var touch = S.touchPref === 'auto' ? (coarse || w < 700) : !!S.touchPref;
      root.classList.toggle('yd-touch', touch);
      root.classList.toggle('yd-land', touch && w > h && h < 600);
      root.classList.toggle('yd-narrow', w < 480);
      root.classList.toggle('yd-short', h < 600);
      var wh = root.classList.contains('yd-land') ? clamp(h * 0.36, 104, 150) : clamp(w * 0.36, 112, 156);
      root.style.setProperty('--wh', Math.round(wh) + 'px');
      var sr = E.stage.getBoundingClientRect();
      view.resize(sr.width, sr.height);
      fitCamera();
      if (sim) { render(); hud(); }
    }
    function render() {
      if (!sim) return;
      if (S.camMode === 'follow' && view.fcx == null) view.follow(sim.st.x, sim.st.y, sim.st.h, 0, 10, inst.lay.bounds);
      drawScene(view, sim, { learn: S.mode === 'learn', overlays: S.overlays, clock: S.rm ? 0.3 : clock, rm: S.rm });
    }
    // ---- loop
    function frame(ts) {
      raf = 0;
      if (S.dead) return;
      var dt = last ? Math.min(0.1, Math.max(0, (ts - last) / 1000)) : 1 / 60;
      last = ts; clock += dt;
      if (!S.paused && sim && !sim.st.finished) {
        acc += dt * (S.slow && S.mode === 'learn' ? 0.5 : 1);
        var n = 0, K = sim.K;
        while (acc >= K.dt && n < 40) {
          if (robot) { robot.tick(); if (robot && (robot.done || robot.fail)) { if (robot.fail && W.console) W.console.warn('yard demo: ' + robot.fail); robot = null; S.demo = false; } }
          sim.step(K.dt); acc -= K.dt; n++;
          if (sim.st.finished) break;
        }
        if (n >= 40) acc = 0;
      }
      if (sim && S.camMode === 'follow') view.follow(sim.st.x, sim.st.y, sim.st.h, sim.st.v, dt, inst.lay.bounds);
      view.shake = Math.max(0, view.shake - dt * 4);
      render(); hud();
      if (!S.paused) raf = win.requestAnimationFrame(frame);
    }
    function setPaused(p) {
      p = !!p;
      var changed = p !== S.paused;
      S.paused = p;
      E.pause.classList.toggle('on', p);
      if (p) {
        releaseAll();
        if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
        if (sim) { render(); hud(); }
        var b = q('.yd-pause [data-act=resume]'); if (b && !isTouch()) { try { b.focus({ preventScroll: true }); } catch (err) { b.focus(); } }
      } else if (!raf && !S.dead) { last = 0; raf = win.requestAnimationFrame(frame); }
      if (changed) emit({ type: p ? 'pause' : 'resume' });
    }
    if (W.ResizeObserver) { ro = new W.ResizeObserver(function () { layout(); }); ro.observe(root); ro.observe(E.stage); }
    on(win, 'resize', layout);

    var ctl = {
      element: root,
      restart: function () { start(); },
      setMode: function (m) { S.mode = m === 'test' ? 'test' : 'learn'; start(); },
      setExercise: function (id, mode) {
        if (!getDef(id)) return false;
        S.ex = id; if (mode) S.mode = mode === 'test' ? 'test' : 'learn';
        S.cam = opts.camera || null; start(); return true;
      },
      pause: function () { setPaused(true); },
      resume: function () { setPaused(false); },
      demo: function () {
        if (!inst || !getDef(S.ex).demo) return false;
        S.mode = 'learn'; start();
        robot = new Robot(sim, inst.demo); S.demo = true;
        toast('شوف كيف، واضغط أي زر لتسوق انت', 'ok');
        return true;
      },
      state: function () { return sim ? sim.snapshot() : null; },
      getExercise: function () { return S.ex; },
      getMode: function () { return S.mode; },
      destroy: function () {
        if (S.dead) return;
        S.dead = true;
        if (raf) win.cancelAnimationFrame(raf); raf = 0;
        L.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); L = [];
        timers.forEach(function (id) { win.clearTimeout(id); }); timers = [];
        if (ro) { ro.disconnect(); ro = null; }
        sound.close();
        if (sim) sim.listeners = [];
        robot = null;
        if (root.parentNode) root.parentNode.removeChild(root);
        emit({ type: 'destroy' });
      },
      _test: {
        sim: function () { return sim; },
        instance: function () { return inst; },
        state: function () { return sim.snapshot(); },
        set: function (inp) { merge(sim.input, inp || {}); },
        press: function (a, arg) { return sim.action(a, arg); },
        step: function (sec) {
          var n = Math.round((sec || 0) / sim.K.dt);
          for (var i = 0; i < n && !sim.st.finished; i++) sim.step(sim.K.dt);
          render(); hud(); return sim.snapshot();
        },
        drive: function (prog, maxSec) {
          robot = null; S.demo = false;
          var r = runRobot(sim, prog, maxSec || 240);
          if (S.camMode === 'follow') { view.fcx = null; }
          render(); hud();
          return JSON.parse(JSON.stringify({ ok: r.ok, fail: r.fail, phase: r.phase, result: r.result, state: r.state }));
        },
        runDemo: function (maxSec) { return inst.demo ? ctl._test.drive(inst.demo, maxSec) : { ok: false, fail: 'no demo' }; },
        layout: function () { layout(); return { w: view.w, h: view.h, scale: view.s, rot: view.rot, touch: isTouch() }; }
      }
    };
    start();
    return ctl;
  }

  // ------------------------------------------------------------------ 12. public API
  // Expose the built layout / start / target on every definition so other modules can read them as data.
  function refreshDefs() {
    EXERCISES.forEach(function (d) {
      try {
        var i = buildInstance(d, {});
        d.layout = i.lay;
        d.start = { x: i.start.x, y: i.start.y, heading: i.start.h / DEG, gear: i.start.gear || 'P' };
        var z = i.lay.zones.target;
        d.target = z ? { zone: z.poly, pose: i.ghost ? { x: i.ghost.x, y: i.ghost.y, heading: i.ghost.h / DEG } : null,
          heading: i.goal && i.goal.h != null ? i.goal.h / DEG : null, needP: !!(i.goal && i.goal.needP) } : null;
        d.resolved = { params: i.P, tol: i.tol, limits: i.limits };
      } catch (e) { if (W.console) W.console.error('yard: exercise ' + d.id + ' failed to build', e); }
    });
  }
  // overrides: {car:{..}, phys:{..}, exercises:{<id>:{params,tol,limits,rules}}, emirates:{dubai:{<id>:{params,..}}}, reset:true}
  function configure(o) {
    if (!o || typeof o !== 'object') return false;
    if (o.reset) OVR = { car: {}, phys: {}, exercises: {}, emirates: {} };
    if (isObj(o.car)) merge(OVR.car, o.car);
    if (isObj(o.phys)) merge(OVR.phys, o.phys);
    if (isObj(o.exercises)) Object.keys(o.exercises).forEach(function (id) { OVR.exercises[id] = merge(OVR.exercises[id] || {}, o.exercises[id]); });
    if (isObj(o.emirates)) merge(OVR.emirates, o.emirates);
    if (isObj(o.texts)) Object.keys(o.texts).forEach(function (k) { if (typeof o.texts[k] === 'string') TXT[k] = o.texts[k]; });
    refreshDefs();
    return true;
  }
  var Yard = {
    version: '1.0.0',
    exercises: EXERCISES,
    get: getDef,
    mount: mount,
    configure: configure,
    overrides: function () { return clone(OVR); },
    car: curCar, phys: curPhys,
    texts: TXT, rules: RULES, passDemerits: PASS_DEMERITS,
    _internals: { Sim: Sim, Robot: Robot, runRobot: runRobot, buildInstance: buildInstance, carGeom: carGeom, Layout: Layout, turnRadius: turnRadius,
      polyDist: polyDist, polyPolyDist: polyPolyDist, pointInPoly: pointInPoly, toWorld: toWorld, toLocal: toLocal }
  };
  try {
    var ex = W.DATA && W.DATA.exams;
    if (ex && isObj(ex.yardSim)) configure(ex.yardSim); else refreshDefs();
  } catch (e) { refreshDefs(); }
  W.Yard = Yard;
})();
