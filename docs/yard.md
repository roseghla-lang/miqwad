# Yard simulator (`src/yard.js`)

`window.Yard` is a top-down 2D driving simulator for the yard / parking test (اختبار الساحة). The learner drives
an automatic sedan with the keyboard (laptop) or touch controls (iPhone), in **learn** mode (coach steps, ground
overlays, demo robot, slow motion) or **test** mode (examiner rules, no overlays, result with the mistakes in Arabic).

Classic script, no dependencies, no network. It injects its own scoped CSS (`.yd …`, BRIEF tokens and fonts) and
never throws if `window.DATA` is missing.

Files: `src/yard.js` (module), `tools/yard_test.html` (harness), `tools/yard_test.py` (headless test + robot).

---

## 1. API

```js
Yard.exercises            // array of exercise definitions (see section 3), ordered from basics to the full test
Yard.get(id)              // one definition or null
Yard.version              // '1.0.0'

const ctl = Yard.mount(el, {
  exercise: 'parallel',   // id from Yard.exercises (default 'parallel')
  mode: 'learn',          // 'learn' | 'test'
  onFinish(result) {},    // called once per attempt (not for the learn-mode demo)
  onEvent(e) {},          // every simulator / controller event (section 2)
  emirate: 'dubai',       // optional: applies def.variants[emirate] and Yard.configure emirate overrides
  camera: 'fit',          // optional: 'fit' | 'follow' (default: the exercise's camera, follow when the fit is too small)
  overlays: true,         // learn-mode ground helpers (default true, remembered per device)
  touch: 'auto',          // 'auto' (coarse pointer or width < 700) | true | false
  sound: true,            // WebAudio beeps, only started after a user gesture
  reducedMotion: false,   // no camera shake, no sweeps or pulses
  fill: 'auto',           // 'auto' | 'parent' | 'viewport' (see 1.3)
  params: { bayLen: 6.6 },// optional per-mount params for this exercise (or { parallel: {...}, 'hill-start': {...} })
  seed: 7                 // optional RNG seed (emergency-stop signal timing) for reproducible runs
});

ctl.restart();            // new attempt, same exercise and mode
ctl.setMode('test');      // switch mode (restarts)
ctl.setExercise('hill-start', 'learn');
ctl.pause(); ctl.resume();
ctl.demo();               // learn mode: the robot drives the exercise with the coach texts; any key or touch takes over
ctl.state();              // snapshot {x, y, h (deg), v, kmh, gear, steer, thr, brk, hb, ind, t, moves, rb, maxRollBack, step, finished, result, ...}
ctl.element;              // the root element
ctl.destroy();            // stops the loop, removes every listener (window, document, elements), timers, audio and the DOM

Yard.configure(overrides) // section 5
```

### 1.1 Result (`onFinish`)

```js
{ exercise: 'parallel', mode: 'test', passed: true, score: 85, demerits: 1, time: 41.2, reason: 'goal',
  mistakes: [{ code: 'no_indicator', text: 'ما شغلت الغماز', fatal: false, points: 1 }],
  stats: { moves: 3, maxRollBack: 0, maxKmh: 4.7, distance: 25.3, observations: 2, angleErr: 0.5, lateral: 0.14,
           kerbGap: 0.42 /* parallel */, stopLineErr /* hill */, speedAtSignal, reaction, stopDist, allowedDist, totalDist /* emergency */,
           conesPassed, knocked /* slalom */, checklist /* pre-drive */ } }
```

**Scoring (aligned with the RTA handbook in `content/exams.json`)**: every mistake is either *fatal* (immediate fail,
the published EDI / SDI list) or worth demerit points. `passed = goal reached && no fatal && demerits < 4`.
`score = 100 − 15 × demerits` (capped at 40 when the attempt failed). Learn mode records the same mistakes (as coach
toasts) but never stops the attempt early; its result says what would have happened in a real test.

### 1.2 Events (`onEvent`)

`start {exercise, mode}`, `step {index, id}` (coach), `mistake {code, text, fatal}`, `collision {kind: pole|wall|kerb|cone|line, id, first}`,
`hint {text, kind}`, `say {text}` (examiner / coach line), `signal {kind: 'stop'|'go'}`, `gear {from, to}`,
`indicator {side, auto}`, `observe`, `handbrake {on}`, `check {item}` (pre-drive), `moveStart {dir, moves, newSeg}`, `stop`,
`pause`, `resume`, `finish {result, demo}`, `destroy`. Every event carries `t` (simulated seconds).

### 1.3 Sizing and layout

The root fills the mount element (`height:100%`). When the element has no real height (less than 360 px, like a
plain `div` with `min-height`), `fill:'auto'` sizes the simulator to the viewport below its top edge (min 420 px),
re-checked on resize. Layouts:
* **Desktop**: canvas + instrument panel (bottom-left) + keyboard legend strip (bottom-right, collapsible).
* **Phone portrait** (390×844 tested): top bar, coach line, canvas, then the control panel (wheel, P R N D column,
  brake and accelerator pedals, a row of indicator / observation / handbrake / centre buttons).
* **Phone landscape** (844×390 tested): controls float over the canvas (wheel left, gear + pedals right, buttons centre),
  the instrument panel moves above the wheel. The camera is fitted into the free middle area.
* The camera fits the whole exercise (rotated 90° when the screen is wider than the exercise is long, so north points
  right; a rotation, never a mirror: left is always left). If the fitted scale is below 11 px/m the follow camera
  is used automatically; the camera button toggles fit / follow.

### 1.4 Controls

| Action | Keyboard (`e.code`, works with an Arabic layout) | Touch |
|---|---|---|
| Accelerator | hold `ArrowUp` | hold the بنزين pedal |
| Brake | hold `ArrowDown` or `Space` | hold the فرامل pedal |
| Steer | hold `ArrowLeft` / `ArrowRight` (the wheel stays where you leave it) | drag the steering wheel around its centre (1.5 turns each side) |
| Centre the wheel | `C` | توسيط |
| Gear P R N D | `P` `R` `N` `D` (brake pressed and car stopped) | P R N D column |
| Indicators | `Q` left, `E` right (self-cancel after the wheel returns) | غماز buttons |
| Observation (mirrors + blind spot) | `M` | نظرة |
| Handbrake | `H` | هاندبريك |
| Pre-drive checklist | `1` doors, `2` seat, `3` mirrors, `4` belt, `5` engine | chips on the canvas |
| Pause / menu | `Esc` | pause button |
| Camera fit / follow | `V` | camera button |

Keys are ignored while typing in inputs, while the yard is hidden, and after `destroy()`. The window blur releases
every held key. The tab becoming hidden pauses the simulator.

---

## 2. Physics model

World in metres: x = east, y = north. Heading `h` in radians counter-clockwise from east. Pose = centre of the rear axle.
Kinematic bicycle model at 120 Hz: `h += v/L · tan(δ) · dt`. Collision is checked every step.

**Car** (`Yard.car()`, tunable via `configure({car})`): length 4.4, width 1.75, wheelbase 2.6, front overhang 0.9,
track 1.52, max wheel angle 35° (turning circle ≈ 10.4 m kerb to kerb, rear-axle radius 3.71 m), steering rate
limited: 1.2 s from centre to full lock, 1.5 steering-wheel turns to full lock (the HUD speaks in turns: نص لفة، لفة ونص،
عالآخر). Mirrors 1.95 m ahead of the rear axle (they count for "inside the lines"). Driver sits on the left (LHD).

**Powertrain** (`Yard.phys()`, tunable via `configure({phys})`):

| constant | value | meaning |
|---|---|---|
| `creepKmh` | 5 | idle creep speed in D and R with the brake released |
| `creepAccel` | 1.8 m/s² | creep pull; beats a 15 % ramp only after a short roll-back |
| `creepIdle`, `creepBuild` | 0.25, 1.0 s | creep torque is reduced while held on the brake and builds up after release |
| `thrAccel` | 2.8 m/s² | extra pull at full accelerator; the accelerator raises the target speed up to the exercise cap |
| `engineBrake` | 0.6 m/s² | lifting off above the target speed |
| `brakeMax` | 8.0 m/s² | full ABS braking on dry asphalt |
| `hbMax` | 3.0 m/s² | handbrake holding capacity (holds the ramp) |
| `rollRes` | 0.12 m/s² | rolling resistance |
| `revCapKmh` | 8 | reverse speed cap |
| pedal ramps | gas 0.55 s up / 0.15 s down, brake 0.22 s up / 0.12 s down | on/off keys behave like a foot |

* P locks the car, N rolls on slopes, D/R creep. Gear changes need the brake pressed and the car stopped (friendly
  Arabic hint otherwise). The engine is off only in the pre-drive check.
* Slopes: ramps are height fields; the pitch comes from the front and rear axle heights, so a half-on car gets half the slope.
* Roll-back = motion against the selected gear, measured from where it started. On a 15 % ramp: releasing into
  creep only rolls back about 11 cm, a quick foot swap 0 to 5 cm, the handbrake method 0, N fails (> 30 cm).
* Collisions: body polygon (chamfered octagon) vs poles (circle r 0.1), walls and parked cars (polygons) → the car
  stops against them; tyre footprints vs kerbs → stop; body vs cones → the cone is knocked over; tyres vs painted
  lines marked `rule:true` → "لمست الخط" (no physical effect). Each object counts once.

---

## 3. Exercise schema

```js
{
  id: 'parallel', name: 'الباركنج الموازي', desc: '…', level: 1..5,
  emirates: ['dubai', 'sharjah'],     // where it matters
  practice: true,                     // optional: practice only, not part of the official test (no test readiness in the app)
  params: { bayLen: 7.0, … },         // every dimension and reference point, tunable (section 5)
  build(P, car) -> { lay, start:{x,y,h,gear,hb,engine}, ghost:{x,y,h}, goal, extra },
  // read-only data filled by Yard (from the default params):
  layout, start:{x, y, heading(deg), gear}, target:{zone:[[x,y]…], pose:{x,y,heading}, heading, needP}, resolved:{params, tol, limits},
  tol:    { inside: 'body'|'wheels'|'centre', ang: 6 },               // success tolerances (body includes the mirrors)
  limits: { capKmh, capRevKmh, maxKmh, maxMoves, maxMovesFail, time, maxRollBack },
  rules:  { hit_kerb: { points: 2 }, moves: null, … },              // overrides of the default rule table (null disables)
  signal: { side: 'R', at: 'reverse'|'first' },                      // indicator required at that move
  obsAt: 'first+reverse'|'first'|'every',                            // when an observation (M) is required
  camera: 'fit'|'follow', angleRef: radians,                         // HUD angle badge reference
  variants: { dubai: { limits: { capKmh: 35 } } },                   // emirate-specific overrides
  exam: 'الفاحص: …',                                                 // examiner instruction (test mode)
  steps: [ { id, text, keys:['E','R'], touch:'زر …', done(sim) -> bool,
             ref:'rearBumper'|'fr'|'mirrorR'…, line(sim) -> [y, x0, x1], showAngle:true } ],   // learn-mode coach
  demo: [ …robot phases… ],                                          // section 4
  hooks: init(sim), update(sim, dt), action(sim, name, arg), onGear(sim, from, to), onMove(sim, dir, newSeg),
         goalReady(sim), evaluate(sim, poseCheck), stats(sim) -> {}, guide(sim) -> [[x,y]…] (learn overlay line)
}
```

`goal`: `{zone:'target', h: heading, needP: true}` finishes when the car is stopped and put in **P** (parking
exercises; in learn mode P outside the zone only gives a hint), or `{zone, h, stopT}` finishes when the car stops
inside the zone (hill, slalom, pre-drive, three-point turn), or `{custom:true}` (emergency stop decides itself).

Layout builder (`Yard._internals.Layout()`): `road(poly)`, `area(poly, 'pavement')`, `line(ax,ay,bx,by,{w,color,dash,rule,id})`,
`kerb(ax,ay,bx,by,{w,style:'bw'|'ramp'})`, `pole(x,y)`, `cone(x,y)`, `wall(poly,{kind:'car'|'fence'})`,
`ramp({x0,x1,y0,y1,y2,y3,hgt,grade})`, `zone(name, poly)`, `label(x,y,text,{size,color,edge})`, `hatchArea(poly)`, `arrow(x,y,h)`, `bounds`.
All exercises are built so the car first drives **north**; right = east (UAE drives on the right).

### 3.1 The ten exercises

| id | level | what | key numbers (params) | test limits |
|---|---|---|---|---|
| `pre-drive-check` | 1 | doors, seat, mirrors, belt, brake, engine, D, handbrake off, left indicator, observation, move off to the box | road 2×3.6 m | belt missing = fatal; order / missing items 1 point each |
| `parallel` | 4 | reverse parallel parking between 4 poles on the RIGHT, parked cars beyond | bay 7.0 × 2.5 m, start 0.8 m from the poles | 5 min, 4 moves (1 pt), kerb / pole / outside the lines fatal, > 50 cm from kerb 1 pt |
| `reverse-bay` | 3 | reverse into a 90° garage of poles on the right | bay 3.0 × 5.5 m, aisle 7 m, start 2.2 m from the bays | 3 min, fatal as above |
| `forward-bay` | 2 | drive forward into a 90° bay on the right (practice) | same bay, lines + parked cars, no entrance poles | 3 moves |
| `angle` | 2 | forward into a 60° bay on the right | 3.0 m wide, 5.3 m deep | 2 min |
| `hill-start` | 3 | stop with the front bumper at the line on a 15 % ramp, move off without rolling back | ramp 8 m up, 4 m top, 8 m down, line 5.5 m up | roll-back ≥ 30 cm fatal, > 60 s to move off fatal, line ±0.5 m (1 pt) |
| `emergency-stop` | 3 | 20 to 40 km/h, random stop signal, brake hard and straight | signal 0.8 to 3 s after reaching 20 km/h | braking distance from the brake point > 3 m at 20, 6 m at 30, 11 m at 40 km/h (interpolated) fatal; steering fatal; reaction > 1.5 s 2 pts; Dubai variant caps the car at 35 km/h |
| `three-point-turn` | 4 | turn round on a 7.5 m road in 3 moves (practice, not tested in Dubai) | kerbs, observation before every move | 3 moves (1 pt), 5 = fatal, kerb 2 pts |
| `slalom` | 2 | weave through 5 cones 9 m apart (practice) | first cone on your right | wrong side fatal, cone 2 pts, 20 km/h |
| `free` | 1 | free yard: parallel box, garages, ramp, cones, anticlockwise loop (practice) | 46 × 64 m | collisions only; `إنهاء` gives a summary |

### 3.2 Mistake codes (`Yard.texts`, `Yard.rules`)

| code | Arabic | default |
|---|---|---|
| `hit_pole` / `hit_wall` / `hit_kerb` | لمست العمود / خبطت بالحاجز / لمست الرصيف | fatal |
| `touch_line` | لمست الخط | 1 |
| `not_in_bay` | السيارة مش جوا المكان المحدد (body + mirrors) | fatal |
| `wheels_out` / `angle` / `far_kerb` | في عجل برا الخطوط / السيارة مش مستقيمة جوا المكان / السيارة بعيدة كتير عن الرصيف | 2 / 1 / 1 |
| `rollback` / `no_hill_stop` / `hill_time` / `stop_line` | رجعت لورا أكتر من المسموح / ما وقفت على المطلع عند الخط / تأخرت أكتر من 60 ثانية… / ما وقفت عند الخط بالضبط | fatal / fatal / fatal / 1 |
| `no_obs_reverse` / `no_obs_move` | ما عملت نظرة للمرايا قبل ما ترجع / … قبل ما تتحرك | 1 |
| `no_indicator` / `wrong_indicator` | ما شغلت الغماز / شغلت الغماز عالجهة الغلط | 1 |
| `moves` / `moves_max` / `time` / `speed` / `handbrake` | … | 1 / fatal / fatal / 1 / 1 |
| `stop_distance` / `swerve` / `slow_reaction` / `low_speed` | … | fatal / fatal / 2 / fatal |
| `no_belt` / `no_mirrors` / `no_seat` / `no_doors` / `order` / `engine_no_brake` | … | fatal / 1 / 1 / 1 / 1 / 1 |
| `hit_cone` / `slalom` / `not_finished` / `stopped_short` | … | 2 / fatal / fatal / 1 |

All texts follow BRIEF section 4 (no tanwin, no shadda, no dashes, no final full stop). `Yard.configure({texts:{code:'…'}})` replaces one.

---

## 4. Robot driver (demo + tests)

`demo` is a list of phases executed by `Yard._internals.Robot` through the **same inputs** a learner uses (pedals,
wheel target, gear requests that need the brake, indicator, observation, handbrake):

```js
{ do: { gear: 'R', ind: 'R'|'off', obs: true, hb: false, centre: true, check: 'belt' } } // holds the brake, waits for a full stop
{ speed: 0.6, steer: -1, until: s => s.hdeg() >= 90 + s.inst.P.refAngle, timeout: 30 } // speed = wanted |v| m/s
{ stop: true }            { thr: 0.5, brake: 0, until: fn }            { wait: 2 }
```
`steer` may be a function of the simulator (pure pursuit in the slalom). Reference points live in `params`
(`refAngle`, `refClear`, `refStop`, `refTurn`, `refLock`, `refStraight`) so the coach lines, the overlay markers and
the robot use the same numbers. Test hook: `ctl._test.runDemo()`, `ctl._test.drive(program)`, `ctl._test.step(sec)`,
`ctl._test.set({thr, brk, steer, wheel})`, `ctl._test.press('gear', 'D')`, `ctl._test.state()`, `ctl._test.sim()`.

---

## 5. Tuning (`Yard.configure`)

```js
Yard.configure({
  car:   { maxSteerDeg: 33, length: 4.5 },
  phys:  { creepAccel: 1.6 },
  exercises: {
    parallel:      { params: { bayLen: 6.6 }, limits: { time: 300 }, tol: { ang: 5 }, rules: { touch_line: { points: 2 } } },
    'reverse-bay': { params: { bayW: 2.8 } },
    'hill-start':  { params: { grade: 0.12 }, limits: { maxRollBack: 0.3 } }
  },
  emirates: { sharjah: { 'emergency-stop': { limits: { capKmh: 40 } } } },
  texts: { hit_kerb: 'طلعت على الرصيف' },
  reset: false            // true clears earlier overrides first
});
```
Layouts, targets and `Yard.exercises[i].layout / start / target / resolved` are rebuilt immediately. If
`window.DATA.exams.yardSim` exists (an object in the same shape, e.g. added to `content/exams.json` as `"yardSim"`), it is
applied automatically at load.

**After changing a dimension, run `python3 tools/yard_test.py`**: the robot proves the manoeuvre is still possible
with the coach's reference points. Findings from tuning with this car (all in `params`):
* `parallel`: full right lock when the rear bumper is level with the front pole, straighten at about 39°, full left
  lock when the front right corner is 0.55 m before the front pole line. Works for 7.0 m (robust: angles 36 to 42°)
  and 6.6 m (1.5 car lengths as in the SDI handbook: only 38 to 40°, 0.28 m pole clearance). Default 7.0 m.
* `reverse-bay`: 3.0 m wide is needed for a usable window with this turning circle (2.8 m works only in a 0.25 m window);
  stop with the rear bumper 1.35 m past the far line, 2.2 m from the bays; straighten 5° early.
* `forward-bay` / `angle`: a full-lock forward sweep is about 2.9 m wide at the entrance, so these bays use lines and
  parked cars (no entrance poles), like real car parks.

---

## 6. Sources used for the rules

From `content/exams.json` (`emirates.*.yard`, `yard_guides`, research/exams.md): the five tested manoeuvres
(parallel, 60° angle, reverse garage, hill start, sudden braking), time limits 5 / 3 / 2 min, immediate-fail list
(outside the lines including mirrors, kerb or pole, 30 cm roll-back, > 60 s on the hill, braking distances 3 / 6 / 11 m,
steering while braking), 4 demerit points fail a manoeuvre, parallel bay about 1.5 car lengths and about 30 cm from
the kerb, three-point turn practice only (Dubai handbook), Dubai smart-yard car stops above 35 km/h. Reference points
beyond those (exact turn-in points) come from the geometry of the simulated car and are labelled as such in the coach texts.

## 7. Tests

* `tools/yard_test.html?ex=parallel&mode=test&bare=1&seed=7&touch=1` harness (exercise / mode pickers, robot button, remount).
* `python3 tools/yard_test.py [--out DIR] [--only a,b]`: screenshots (desktop 1280×860, iPhone 390×844, landscape 844×390),
  robot passes every exercise with a demo in test mode (parallel, reverse-bay, hill-start and emergency-stop are required),
  learn-mode coach reaches its last step, gear needs the brake, keyboard driving, two-finger touch (pedal + gear) and wheel
  drag, Esc and hidden-tab pause, `destroy()` removes window/document listeners, phone layout fits, zero console errors.

## 8. Known limits

* Kinematic model: no tyre slip, no body roll; ABS is implied by the constant 8 m/s² braking.
* Kerbs stop the car at the tyre (no mounting). Parked cars and poles are rigid. Cones tip over.
* The garage and angle reference points are simulator-specific; the coach says so and tells the learner to ask the instructor for the test car's points.
* One car model; UAE institutes use different sedans. Tune `car` if needed.
