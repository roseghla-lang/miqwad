# Scene engine: authoring reference (`src/scenes.js`)

`window.Scenes` draws animated **top-down** driving situations (roundabouts, junctions, roads, highway ramps,
car parks, U-turn openings) from a small JSON description. Content authors write that JSON inside
scenario items (`content/scenarios_<name>.json`); the shell mounts it next to the question.

Everything you need to write a scene is in this file. The 10 worked examples at the end are also in
`docs/scene_examples.json` and can be opened in `tools/scene_gallery.html`.

---

## 1. The five rules that keep scenes correct (read these first)

| # | Rule | What it means in the JSON |
|---|------|---------------------------|
| 1 | **UAE drives on the RIGHT.** | You never place cars on "the correct side": you name an arm/lane/direction and the engine puts the car on the right-hand side automatically. |
| 2 | **LANE 1 IS ALWAYS THE RIGHTMOST LANE IN THE DRIVER'S DIRECTION OF TRAVEL** (the kerb-side, slow lane). Numbers grow towards the median / centre line. | On a 3-lane approach: `1` = right lane (right turns), `2` = middle, `3` = left lane (left turns, U-turns). You may also write `"right"` (= 1), `"left"` (= highest number) and `"middle"` (= 2 on a 3-lane road). Ring lanes of a roundabout: `"outer"` = 1, `"inner"` = highest. |
| 3 | **North is up.** Arms are named by compass: `N` (top), `E` (right), `S` (bottom), `W` (left). | The learner (`me`) usually comes from `S` and drives up the screen. |
| 4 | **Coordinates are metres, x = east, y = NORTH (up).** | Only needed for free positions (`{"x":..,"y":..}`), `path` points and `rect` hotspots. |
| 5 | **Roundabouts circulate ANTICLOCKWISE.** Entering traffic gives way to traffic already on the ring, which comes from the entrant's LEFT. | Ring positions use a compass bearing from the centre (`"angle": 200`). A circulating car's bearing **decreases** (200, 180, 90, 0, 270...). `{"ring":"outer","before":"S"}` places a car that is about to pass in front of the `S` entry. |

If you are unsure what number a lane has, render the scene with `--debug` (section 12): every lane is
labelled with its number and an arrow for its direction of travel.

---

## 2. Quick start

```json
{
  "id": "rb-priority-001", "topic": "roundabouts", "level": 2, "exam": ["dubai", "sharjah"], "type": "choice",
  "scene": {
    "template": "roundabout",
    "params": { "lanes": 1, "ring": 1 },
    "actors": [
      { "id": "me",  "type": "me",  "pos": { "arm": "S", "lane": 1, "at": "stopline" } },
      { "id": "red", "type": "car", "color": "red", "pos": { "ring": "outer", "before": "S" } }
    ],
    "solution": [
      { "t": 0,   "actor": "red", "route": "ring->E", "kmh": 28 },
      { "t": 2.8, "actor": "me",  "route": "S1->N",   "kmh": 30, "ease": "in" }
    ]
  },
  "q": "من يدخل الدوار أولا؟",
  "options": ["أنت", "السيارة الحمراء", "من يطلق المنبه أولا", "الأسرع منكما"],
  "answer": 1,
  "explain": "أعط الأولوية للمركبات التي تسير داخل الدوار",
  "src": ["S1"], "confidence": "high"
}
```

Check it:

```
python3 tools/scene_preview.py content/scenarios_mine.json /tmp/prev            # PNGs + messages
python3 tools/scene_preview.py content/scenarios_mine.json /tmp/prev --debug    # with lane numbers and a 10 m grid
python3 tools/scene_preview.py content/scenarios_mine.json /tmp/prev --mobile   # iPhone width (390 px)
```

Then LOOK at `<id>_question.png` and `<id>_solution.png` (Read tool) before you hand the file in.

---

## 3. API (for the shell)

```js
var ctl = Scenes.mount(el, sceneOrScenario, {
  onTap: function (hotspotId, info) {},   // tap questions: id of the tapped hotspot, or null for a miss
                                          // info = {phase, t, x, y}  (x/y in scene metres)
  onPhase: function (name, ctl) {},       // 'intro' | 'question' | 'solution' | 'done'
  autoplay: true,                         // play the intro (if any) right after mounting
  hotspots: scenario.hotspots,            // optional; also read from scenario.hotspots / scene.hotspots
  labels: 'hover',                        // overrides scene.labels
  debug: false,                           // lane numbers, arm letters, bay ids, 10 m grid
  blink: true,                            // false = indicators and flashing lamps drawn steadily (still images)
  reducedMotion: undefined,               // default: follows prefers-reduced-motion
  speed: 1                                // playback rate
});
ctl.play('intro' | 'solution');  // play a phase from its start (play() without argument resumes)
ctl.pause(); ctl.reset();        // reset = back to the frozen question frame
ctl.seek(t, 'intro' | 'question' | 'solution' | 'done');
ctl.mark(hotspotId, 'ok' | 'bad' | null); ctl.clearMarks(); ctl.revealHotspots(true);
ctl.showArrows(true | false | null); ctl.showLabels(true | false | null);   // null = back to the scene default
ctl.duration('intro' | 'solution');  ctl.hasIntro;  ctl.phase;  ctl.time;  ctl.svg;  ctl.errors;  ctl.warnings;
ctl.destroy();                   // stops the animation loop, removes the SVG and listeners

Scenes.validate(sceneOrScenario, {warnings: true}) -> [strings]  // "warn: ..." = advisory, anything else = error
Scenes.inspect(scene)   -> {template, arms, lanes, crossings, routes, bays, lights, intro, solution, errors}
Scenes.snapshot(scene, {phase: 'question', t: 0, width: 480}) -> "<svg ...>"   // static markup of one frame
Scenes.templates        // parameters, slots and routes of every template (same content as section 5)
Scenes.actorTypes, Scenes.colors, Scenes.topics, Scenes.version
```

Behaviour:

- `mount` accepts either the scene object or the whole scenario (`{scene, hotspots, ...}`). It never throws:
  a broken scene shows a small "تعذر عرض المشهد" box and returns a controller whose methods do nothing
  (`ctl.errors` says why).
- Phases: **intro** (optional clip) -> **question** (frozen frame shown with the question) -> **solution**
  (the correct behaviour, played after the answer) -> **done**. Events written at `solution` `t: 0` are
  NOT visible in the question frame, so the question never gives the answer away.
- With `autoplay` (default) a scene with an intro plays it and stops on the question frame; a scene without
  intro shows the question frame at once. `onPhase('question')` fires in both cases (asynchronously).
- The SVG is `width:100%; height:auto` with the scene's own aspect ratio (junctions square, roads
  portrait). Give the container a `max-height` if needed; labels keep a constant ~12 px size.
- Reduced motion: `play()` jumps to the end state of the phase, indicators do not blink, rain does not move.
- Many scenes can be mounted on one page (all SVG ids are prefixed per instance). The animation loop runs
  only while something moves or blinks, and stops completely after `destroy()`.
- Tap mode is on when `onTap` is given and the scene has hotspots. Hotspots are invisible, at least 22 px
  in radius, keyboard focusable (Enter / Space), and follow moving actors.

---

## 4. The scene object

| key | required | value |
|-----|----------|-------|
| `template` | yes | `roundabout`, `crossroads`, `tjunction`, `road`, `highway-merge`, `highway-exit`, `parking`, `uturn` |
| `params` | no | template parameters (section 5) |
| `actors` | yes | list of actors (section 7) |
| `intro` | no | events before the question (hazard clips); list, or `{"len": 4, "events": [...]}` |
| `solution` | no* | events played after the answer; list, or `{"len": 8, "events": [...]}` (*a warning if missing) |
| `arrows` | no | dashed path arrows for the explanation (section 9) |
| `callouts` | no | small text boxes (section 9) |
| `overlay` | no | `"night"`, `"fog"`, `"rain"`, `"dust"` or a list of them |
| `visibility` | no | metres of clear view around `me` for the overlays (defaults: night 55, fog 30, rain 60, dust 25) |
| `view` | no | `{"zoom": 1.3, "center": {"x": 0, "y": 20}}` crop (zoom 0.75 to 4) |
| `labels` | no | `"hover"` (default: actor labels show on hover / tap), `"solution"` (also shown during the solution), `"always"`, `"never"` |
| `hotspots` | no | tap targets (section 10); usually written at scenario level |
| `alt` | no | Arabic description for screen readers |
| `note` | no | free text for authors (ignored) |

Unknown keys anywhere are reported by the validator (typos like `"lanes"` in an actor are caught).

---

## 5. Templates

Every template draws kerbs, pavements, markings, signs and some city scenery by itself. You only choose
parameters. Distances are metres.

### 5.1 `roundabout`

Origin: centre of the roundabout. Arms at N/E/S/W, circulation anticlockwise.

| param | default | meaning |
|-------|---------|---------|
| `arms` | `4` | `4`, `3` (= E, S, W) or a list such as `["S","E","W"]` |
| `lanes` | `1` | entry lanes per arm (1-3) or per arm `{"S":2,"E":1}` |
| `exit_lanes` | = `lanes` | exit lanes per arm (1-3) |
| `ring` | most lanes of any arm | circulating lanes (1-3) |
| `island` | `"palms"` | `palms`, `sand`, `grass`, `plain` |
| `radius` | 5 + 1.6 x ring | central island radius |
| `splitter` | `true` | splitter islands between each arm's entry and exit lanes |
| `control` | `"giveway"` | `giveway`, `lights` or `none`, or per arm |
| `lights` | all red | initial light states when `control` is `lights` (see crossroads) |
| `crossings` | `[]` | arms with a zebra crossing, e.g. `["S"]` |
| `arrows` | `"auto"` | painted lane arrows; `false`, or per arm list starting with lane 1: `{"S":["straight+right","straight+left"]}` |
| `scenery` | `"city"` | `city`, `desert`, `none` |
| `size` | auto | half-width of the view |
| `markings` | `"all"` | `none` hides ring markings, give-way lines and arrows |

Auto lane arrows: 2 lanes = lane 1 `straight+right`, lane 2 `straight+left`; 3 lanes = `right`, `straight`, `left`.

**Slots**

| slot | meaning |
|------|---------|
| `{"arm":"S","lane":1,"at":"stopline"}` | waiting at the give-way line of arm S, entry lane 1 (front bumper 0.4 m from the line) |
| `{"arm":"S","lane":2,"at":12}` | same lane, 12 m back (gap between the line and the front bumper) |
| `{"arm":"E","lane":1,"dir":"out","at":6}` | on the exit road of arm E, 6 m after the ring |
| `{"ring":"outer","angle":200}` | on the ring (`outer`, `inner`, `middle` or 1-3), compass bearing 200 from the centre, heading anticlockwise |
| `{"ring":"inner","before":"S","deg":40}` | 40 deg (default) before passing arm S, i.e. a car that has priority over cars waiting at S |
| `{"ring":1,"after":"S"}` | just after passing arm S |
| `{"crossing":"S","side":"east"}` | pedestrian at the east end of the zebra on arm S |
| `{"arm":"S","side":"east","at":4}` | pedestrian on the pavement beside arm S |
| `{"x":8,"y":-20}` | free position |

**Routes**: `"S1->E"` enter from arm S lane 1 and leave by arm E. Exits are counted anticlockwise: from S,
`E` is the 1st exit (right turn), `N` the 2nd (straight on), `W` the 3rd (left), `S` the 4th (U-turn).
The ring lane follows the entry lane (lane 1 -> outer ring, highest lane -> inner ring) and the car leaves
into the matching exit lane (outer ring -> exit lane 1). Override with `"ring": "inner"` or `"to_lane": 2`.
`"S2->W2"` names the exit lane. `"ring->N"`: for a car already on the ring, drive on from where it is and
leave by N. `until`: `"stopline"`, `"entry"` (just inside the ring), `"exit"`, `"end"` (default: drives out of view) or metres.

### 5.2 `crossroads`

Origin: centre of the junction. Four arms N/E/S/W.

| param | default | meaning |
|-------|---------|---------|
| `lanes` | `1` | lanes per direction (1-3); per arm `{"S":2,"E":{"in":3,"out":2}}` (`in` = approaching lanes, `out` = leaving lanes) |
| `divided` | `false` | median on the arm (`true` or per arm) |
| `median` | `2` | median width |
| `control` | `"none"` | `none`, `stop`, `giveway`, `lights`, or per arm `{"N":"stop","S":"stop","E":"none","W":"none"}` |
| `lights` | all red | initial states, e.g. `{"S":{"main":"red","right":"green"},"N":"red","E":"green","W":"red"}` |
| `crossings` | `[]` | arms with a zebra, e.g. `["S","N"]` |
| `box` | `false` | yellow box junction |
| `arrows` | `"auto"` | painted lane arrows (auto from the available turns), `false`, or per arm list starting with lane 1 |
| `corner` | `6` | kerb radius |
| `center` | `"auto"` | centre line of undivided arms: `auto` (solid near the junction), `solid`, `broken`, `none` |
| `markings` | `"all"` | `none` = unmarked junction (no lines, no arrows) |
| `scenery` | `"city"` | `city`, `desert`, `none` |
| `size` | auto | half-width of the view |

Traffic lights: one signal head per controlled arm, on the right-hand side of the approach, drawn lying
flat and facing its drivers (the red lamp is the one farthest from them). Light states:
`red`, `amber`, `green`, `flash-green` (flashing green before amber, drawn with a dashed ring in stills),
`flash-amber`, `off`. Filter arrows: `"left"` / `"right"` = `green`, `flash-green`, `off`; the arrow lamp
only appears on arms that use it.

Slots: `{"arm":"S","lane":1,"at":"stopline"}` (at the stop / give-way line, or at the junction mouth when
the arm has no control), `{"arm":"S","lane":1,"at":15}`, `{"arm":"W","lane":1,"dir":"out","at":8}`,
`{"crossing":"N","side":"west"}`, `{"arm":"S","side":"east","at":4}` (pavement), `{"x":..,"y":..}`.

Routes: `"S1->E"` right turn, `"S1->N"` straight, `"S2->W"` left turn, `"S2->S"` U-turn. Exit lane: right
turn -> lane 1, left turn / U-turn -> the leftmost exit lane, straight -> same number. `until`:
`"stopline"`, `"exit"`, `"end"`, metres. The validator warns when `me` turns right from a lane other than 1,
or left from a lane other than the leftmost.

### 5.3 `tjunction`

Same as crossroads with three arms. `side` (default `"S"`) is the minor road; the main road is the
perpendicular axis (`side:"S"` -> main road E-W). `control` given as a string applies to the side road only
(default `giveway`); `"lights"` puts lights on all arms; per-arm objects work too. `lanes` may be
`{"main":2,"side":1}`. The view is shifted towards the side road.

### 5.4 `road`

Straight road drawn vertically. Origin: `x = 0` on the centre line (or median centre), **`y = 0` at the
BOTTOM edge**, `y` grows up the screen. Two carriageways: `"up"` (northbound, east half) and `"down"`
(southbound, west half).

| param | default | meaning |
|-------|---------|---------|
| `lanes` | `2` | lanes per direction (1-4), or `{"up":3,"down":2}`; `"down":0` = one-way road |
| `divided` | `false` | median between the carriageways |
| `median` | `{"width":4}` | `{"width":4,"barrier":false,"palms":true}` |
| `line` | `"broken"` | lines between lanes of the same direction: `broken`, `solid`, `double`, `none`, `mixed-right` (solid + broken, the RIGHT lane may cross), `mixed-left` (the LEFT lane may cross); per direction `{"up":"solid","down":"broken"}`; per gap `{"up":["mixed-right","solid"]}` (gap between lanes 1 and 2 first) |
| `center` | `"broken"` | centre line of an undivided road: `broken`, `solid`, `double`, `none`, or `{"type":"mixed","broken_for":"up"}` (solid + broken: only the `up` side may cross) |
| `center_color` | `"white"` | `white` or `yellow` |
| `edges` | `{"left":"yellow","right":"white"}` | edge line colours (left = median side, right = kerb side), `none` to hide |
| `shoulder` | `false` | hard shoulder on the right of each carriageway (`true` or `{"up":true}`) |
| `zebra` | none | `{"y":40}` zebra crossing across the whole road (crossing name `"zebra"`) |
| `bus_stop` | none | `{"y":30,"dir":"up"}` bus bay cut into the kerb of that carriageway (lane name `"bus"`) |
| `parked` | none | `{"up":[12,18.5,31],"down":[40]}` parked cars in a parking lane on the right kerb (y of each car) |
| `works` | none | `{"dir":"up","lane":1,"from":30,"to":50}` closed lane with cones, taper and a works sign |
| `hump` | none | `25` or `[25, 60]` speed humps (with a warning sign) |
| `signs` | `[]` | `[{"id":"r-speed-60","dir":"up","y":20}]` any sign id from the sign catalogue, on the right verge |
| `len` | from road width (40-90) | visible length |
| `width` | auto | view width |
| `scenery` | `"city"` | `city`, `desert`, `none` |
| `markings` | `"all"` | `none` hides all markings |

Slots: `{"dir":"up","lane":1,"y":20}` (actor centre at y = 20), `{"dir":"up","lane":"left","y":20}`,
`{"dir":"up","lane":"shoulder","y":20}`, `{"dir":"up","lane":"parking","y":22}` (in the parking lane, e.g.
between parked cars), `{"dir":"down","lane":"bus","y":30}`, `{"side":"east","y":30}` (pavement; east is
the kerb side of `up`), `{"crossing":"zebra","side":"west"}`, `{"x":3,"y":10}`. Add `"shift": 0.8` to move
sideways inside the lane (+ = to the driver's right).

Roads have no named routes: use `drive`, `lane_change`, `pull_over`, `stop_at`.

### 5.5 `highway-merge` and `highway-exit`

One northbound carriageway (`up`) with a ramp on the RIGHT. Origin: `x = 0` at the left (median) edge,
`y = 0` at the bottom edge.

| param | default | meaning |
|-------|---------|---------|
| `lanes` | `3` | main lanes (2-4) |
| `accel` / `decel` | `46` / `32` | length of the parallel acceleration / deceleration lane |
| `ramp_at` | auto | y where the ramp joins (merge) or where the deceleration taper starts (exit) |
| `opposite` | `0` | lanes of the opposite carriageway shown beyond the median barrier (lanes `down.1`...) |
| `len` | `90` | visible length |
| `signs` | `[]` | signs on the right verge |

Lanes: `1..n` main lanes, `"accel"` (merge) or `"decel"` (exit) = the extra lane on the right of lane 1,
`"ramp"`. Slots: `{"lane":"ramp","y":8}`, `{"lane":"accel","y":35}`, `{"lane":1,"y":30}`.
Routes: `"merge"` (ramp -> acceleration lane -> lane 1; option `"merge_at": y` where the car is fully in
lane 1; `until`: `"accel"`, `"merge"`, `"end"`) and `"exit"` (lane 1 -> deceleration lane -> ramp; option
`"exit_at": y` where the lane change starts; `until`: `"decel"`, `"exit"`, `"end"`).

### 5.6 `parking`

Origin: `x = 0` on the aisle / street centre, `y = 0` at the bottom edge.

| param | default | meaning |
|-------|---------|---------|
| `layout` | `"bays"` | `bays` = car-park aisle with bays on both sides; `street` = street with parallel spaces |
| `bays` | `6` | bays per side (`bays` layout): east side `R1..Rn`, west side `L1..Ln`, numbered from the bottom |
| `angle` | `90` | `90`, `60`, `45` (angled bays face the direction of travel of their side) |
| `spaces` | `4` | parallel spaces per side (`street` layout): east `P1..Pn`, west `Q1..Qn` |
| `sides` | `["east"]` | street layout: `["east"]` or `["east","west"]` |
| `occupied` | `[]` | bay / space ids with parked cars |
| `len` | auto | visible length |

Slots: `{"bay":"R3"}` (nose in; add `"nose":"out"` for a car reversed in), `{"space":"P2"}`,
`{"dir":"up","lane":1,"y":5}` (aisle / street lane). Movements: `{"park":"R3"}` (forward),
`{"park":"R3","reverse":true}` (drive past, then reverse in), `{"park":"P2"}` (reverse parallel parking into
a street space), `{"leave":"up"}` / `{"leave":"down"}` (out of the current bay or space).

### 5.7 `uturn`

A divided road (like `road`, `median` default width 7) with an opening in the median. UAE U-turns are to the
LEFT from the LEFTMOST lane.

| param | default | meaning |
|-------|---------|---------|
| `lanes` | `2` | lanes per direction |
| `median` | `{"width":7}` | median width (wider = easier U-turn) |
| `opening` | 45% of `len` | y where the median opening starts |
| `len` | `70` | visible length |

Route `"uturn"`: from the car's lane on `up` (normally `"lane":"left"`) through the opening into the
leftmost lane of `down` (`"to_lane": 1` for another lane). `until: "opening"` stops the car at the opening
(to give way to traffic coming the other way), a second `route: "uturn"` event continues the turn. A U-turn
sign stands on the median and a give-way line marks the edge of the opposite carriageway.

---

## 6. Slots: summary

A slot is always an object. Which keys apply depends on the template:

| template family | slot forms |
|-----------------|-----------|
| roundabout, crossroads, tjunction | `{arm, lane, at, dir}`, `{ring, angle / before / after, deg}` (roundabout), `{crossing, side}`, `{arm, side, at}`, `{x, y}` |
| road, uturn, highway-* | `{dir, lane, y}` (`dir` defaults to `"up"`), `{side, y}`, `{crossing, side}`, `{x, y}` |
| parking | `{bay}`, `{bay, nose:"out"}`, `{space}`, `{dir, lane, y}`, `{x, y}` |

Common extras: `"shift"` (metres sideways, + = right of the travel direction), `"heading"` (compass bearing,
only for special cases; the validator warns if a vehicle then faces against the traffic).
`at` is a gap in metres measured from the line to the nearest bumper; `y` is the actor's centre.

---

## 7. Actors

```json
{ "id": "red", "type": "car", "color": "red", "pos": { "arm": "W", "lane": 1, "at": 5 },
  "label": "قادمة من اليسار", "signal": "right", "brake": false, "highlight": "warn" }
```

| type | size (m) | notes |
|------|----------|-------|
| `me` | 4.6 x 1.95 | the learner: gold outline and an "أنت" tag (hide the tag with `"tag": false`); default colour white |
| `car` | 4.6 x 1.95 | colours: `red`, `blue`, `white`, `black`, `silver`, `green`, `yellow`, `orange` (also `grey`, `gold`, `teal`, `purple`, `brown`, `cream`, or `#RRGGBB`) |
| `taxi` | 4.7 x 1.9 | Dubai style: cream body, red roof |
| `police` | 4.9 x 1.95 | white with green stripes, light bar; flashes by default |
| `ambulance` | 6.0 x 2.25 | white van, red stripes and crescent; flashes and shows siren waves by default |
| `fire` | 8.6 x 2.5 | red truck with ladder; flashes by default |
| `truck` | 9.6 x 2.5 | `color` = cab colour |
| `bus` | 12 x 2.55 | city bus |
| `school-bus` | 10.6 x 2.5 | yellow; STOP arm on the LEFT (driver) side: `"stop_arm": true` deploys it and turns on the red flashers |
| `motorcycle` | 2.2 x 0.85 | `"variant": "delivery"` adds a delivery box; `helmet` colour |
| `bicycle` | 1.85 x 0.62 | |
| `pedestrian` | drawn 1.2 m wide | `"variant"`: `adult` (default), `woman`, `child` (smaller, runs faster); `color` = clothes |
| `ball` | 0.95 | rolls (spins) when it moves |
| `camel` | 3.1 x 1.0 | |
| `cone` | 0.84 | |
| `barrier` | 2.0 x 0.7 | red / white water barrier, placed across its heading |

Actor keys:

| key | meaning |
|-----|---------|
| `id` | unique, letters / digits / `-` / `_`; events and hotspots refer to it |
| `type`, `pos` | required; `pos` is a slot, the heading comes from the slot |
| `color`, `variant`, `helmet` | appearance |
| `label` | short Arabic text shown on hover / tap, during the solution when `labels` is `"solution"`, or always with `"always"` |
| `signal` | `left`, `right`, `hazard`, `off` (blinking indicators) |
| `brake` | brake lights |
| `flash`, `siren` | emergency lights / siren waves (defaults: on for ambulance, police, fire) |
| `stop_arm` | school bus stop arm (animated when it changes) |
| `highlight` | `true` (gold), `"ok"`, `"bad"`, `"warn"`: pulsing frame |
| `visible` | `false` hides the actor (it can appear later with an event) |
| `say` | short bubble text next to the actor (for example `"!"`) |
| `tag` | `false` hides the "أنت" tag of `me` |
| `wrong_way` | `true` = this vehicle deliberately drives against the traffic (silences the validator) |
| `collide` | `true` = this actor may overlap others (crash scenes); otherwise overlaps are reported |

Headlight beams and tail lights appear automatically with the `night` overlay.

---

## 8. Timeline

```jsonc
"intro":    { "len": 4, "events": [ ... ] },     // optional; the question freezes at the end of the intro
"solution": [ { "t": 0, "actor": "me", "route": "S1->E", "kmh": 25 }, ... ]
```

A phase is a list of events (or `{"len": seconds, "events": [...]}`; without `len` it lasts until the last
event ends, plus 0.6-0.8 s). Every event has `t` (seconds from the start of that phase) and either an
`actor` with actions, or a scene action.

### 8.1 Movements (one per event)

| action | example | notes |
|--------|---------|-------|
| `route` | `{"actor":"me","route":"S2->W","kmh":25}` | junction / roundabout / highway / U-turn routes (section 5). Starts from wherever the actor is on that route. Options: `until`, `ring`, `to_lane`, `merge_at`, `exit_at` |
| `drive` | `{"actor":"amb","drive":80,"dur":4}` | metres along the current lane or route; `"end"` = until out of view; `"reverse": true` to back up |
| `lane_change` | `{"actor":"me","lane_change":"right","dist":20,"dur":2.5}` | to the neighbouring lane (`right` = lower number); `dist` = metres travelled while changing (default 24) |
| `pull_over` | `{"actor":"me","pull_over":"right","dur":3}` | to the shoulder / parking lane, or next to the kerb; ends stopped (`dist` default 26) |
| `stop_at` | `"stopline"`, `"crossing"`, `{"behind":"bus","gap":6}`, `{"y":40}` | drive on and stop (front bumper 0.4 m before a line, 1.4 m before a zebra, `gap` m behind another actor) |
| `cross` | `{"actor":"ped","cross":"zebra","dur":5}` | pedestrian walks to the near end of the crossing and over to the other side |
| `to` | `{"actor":"kid","to":{"dir":"up","lane":1,"y":31},"dur":1.2}` | move to a slot (straight for people and objects, a smooth curve for vehicles) |
| `path` | `{"actor":"x","path":[[2,10],[4,20]],"dur":3}` | free polyline in scene coordinates (x east, y north); smoothed for vehicles |
| `park` / `leave` | see `parking` | parking manoeuvres (several legs, with reversing) |

Speed: give `dur` (seconds) or `kmh` (average speed). Without either: vehicles 25 km/h, pedestrians
5 km/h, bicycles 15, motorcycles 30, balls 12, camels 6. `ease`: `linear`, `in` (speed up), `out`
(slow down), `inout`; defaults are `linear`, except `stop_at` / `pull_over` (`out`) and parking (`inout`).

A movement always continues from where the actor is at its start time. If a movement starts while the
previous one is still running, the new one takes over from the current position.

**Automatic indicators (on by default for vehicles, `"signals": "none"` to turn them off):**
`lane_change` / `pull_over` signal to that side while moving; crossroads routes signal the turn until the car
has left the junction; roundabout routes follow the UAE practice: 1st exit = right indicator on the approach,
straight on = right indicator after passing the exit before yours, left / U-turn = left indicator on the
approach and on the ring, switched to right after passing the exit before yours, off after leaving;
`merge` = left, `exit` = right. Manual `signal` events at the same moment win over automatic ones.

### 8.2 State actions (any number per event)

`signal`, `brake`, `flash`, `siren`, `stop_arm`, `highlight`, `visible`, `say` (same values as the actor
keys). Example: `{"t": 3, "actor": "bus", "stop_arm": false}` (the red flashers switch off with the arm).

### 8.3 Scene actions (no `actor`)

| action | example |
|--------|---------|
| `lights` | `{"t": 2, "lights": {"S": "flash-green"}}`, `{"t": 3.5, "lights": {"S": "amber", "E": {"right": "off"}}}` (only the given arms / lamps change) |
| `arrows` | `{"t": 1, "arrows": true}` show / hide the arrow layer at that moment |
| `labels` | `{"t": 0, "labels": true}` show all actor labels |

### 8.4 Timing checks

The validator samples the whole timeline every 0.1 s and warns when two actors overlap (a collision or a
timing mistake), when a vehicle faces against the traffic in a lane, when an actor is outside the view at the
question frame, and when a movement does not move. Fix the timing until the preview is clean: learners copy
what they see.

---

## 9. Arrows, callouts, overlays, view

**Arrows** show the intended path as a dashed line with an arrow head, under the vehicles (above them when
an overlay is used). By default they appear only during the solution.

(The `//` comments below are explanations only: JSON files must not contain comments.)

```jsonc
"arrows": [
  { "actor": "me", "track": "solution", "style": "ok" },                 // the exact path me drives in the solution
  { "actor": "red", "route": "ring->E", "style": "other" },               // a route from the actor's question-frame position
  { "from": { "arm": "S", "lane": 2, "at": 4 }, "route": "S2->W", "style": "ok", "when": "question" },
  { "actor": "me", "to": { "dir": "up", "lane": 1, "y": 40 }, "style": "bad" },
  { "path": [[0, 5], [3, 15], [3, 30]], "style": "warn" }
]
```

`track` (`"solution"` or `"intro"`, optional `from_t` / `to_t`) is the safest choice: it cannot disagree with
the animation. `style`: `me` (gold), `ok` (green), `bad` (red), `warn` (amber), `other` (white).
`when`: `solution` (default), `question`, `always`. Route arrows accept `until`, `ring`, `to_lane`, `merge_at`.

**Callouts** are small text boxes: `{"text": "5 أمتار على الأقل", "at": {slot}, "when": "solution", "style": "warn"}`
or attached to an actor with `"actor": "id"`. Styles: `info`, `ok`, `bad`, `warn`, `gold`.

**Overlays** reduce visibility around `me` (or the bottom of the view if there is no `me`):
`night` (dark, with headlight beams and tail lights), `fog`, `rain` (animated streaks), `dust` (sandstorm).
Combine them: `"overlay": ["night", "rain"]`. `visibility` sets the clear radius in metres.

**View**: `{"zoom": 1.4}` enlarges the middle of the scene; `{"zoom": 1.4, "center": {"x": 0, "y": 30}}`
centres the crop on a point.

---

## 10. Tap questions and hotspots

For `"type": "tap"` the learner taps the scene. Hotspots live at scenario level:

```jsonc
"hotspots": [
  { "id": "kid", "actor": "kid" },                                         // follows the actor
  { "id": "ball", "actor": "ball", "r": 3 },                               // bigger hit radius (metres)
  { "id": "gap", "at": { "dir": "up", "lane": 1, "y": 30 }, "r": 4 },       // circle around a slot
  { "id": "zone", "rect": [-4, 20, 4, 30], "label": "المسار" }             // rectangle x0, y0, x1, y1 (metres)
],
"answer": ["kid", "ball"]                                                  // one id or a list of accepted ids
```

The engine only reports taps (`onTap(id, info)`, `null` for a miss); the shell decides what is correct and can
call `ctl.mark(id, 'ok' | 'bad')` or `ctl.revealHotspots()`. Add at least one wrong hotspot (a plausible
distractor) or rely on misses. Hazard clips: put the build-up in `intro` so the question freezes just as the
hazard appears, then show the correct reaction in `solution`.

---

## 11. The scenario item around the scene

```json
{ "id": "rb-priority-001", "topic": "roundabouts", "level": 2, "exam": ["dubai", "sharjah"],
  "type": "choice", "scene": { "template": "roundabout", "actors": [] },
  "q": "نص السؤال؟", "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], "answer": 1,
  "explain": "شرح قصير", "tip": "حيلة للتذكر", "src": ["S1"], "confidence": "high", "notes": "" }
```

- `type`: `choice` (options + `answer` index, 0-based) or `tap` (`hotspots` + `answer` id or ids).
- `topic` must be one of the BRIEF topic keys, `level` 1-5, `exam` a list with `dubai` and / or `sharjah`.
- Arabic rules checked by `Scenes.validate` on `q`, `options`, `explain`, `tip`, labels, `say` and callouts:
  no tanwin or shadda (ً ٌ ٍ ّ), no em / en dash, no final full stop, no "كل ما سبق" / "لا شيء مما سبق".
  It also warns when a choice question does not end with "؟".
- Left / right in the text always mean the driver's real left / right; they match the scene because the
  engine keeps right-hand traffic.
- Put sources in the file's `sources` block and cite them in `src` exactly like question banks (BRIEF 3).

---

## 12. Checking your work

**Validator.** `Scenes.validate(scenario)` returns readable messages that name the item and the fix, for example:

```
actors[1] ("red"): pos: arm "X" does not exist (arms: N, E, S, W)
solution[1]: actor "me" is 6.2 m away from route "S2->W" when it starts (place it on lane S in 2 first)
solution[0]: there is no lane to the left of S.in.2 (lane 1 is the rightmost; "left" means a higher lane number)
warn: "me" and "truck" overlap at solution t=4.2 s (collision or wrong timing)
warn: "blue" faces against the traffic in lane up.1 at question frame (set "wrong_way": true if that is intended)
scenario rb-01: options[2]: remove tanwin / shadda
```

Validation needs no browser: in Node, `global.window = {}; global.document = {}; require('./src/scenes.js');`
then `window.Scenes.validate(item)` (mounting and PNGs need the preview tool).

**Preview tool.**

```
python3 tools/scene_preview.py <scenarios.json> <outdir> [--mobile] [--debug] [--frames 0.3,0.6] [--only id] [--no-png] [--quiet]
```

It prints every message, writes `<id>_question.png`, `<id>_intro_50.png` (scenes with an intro),
`<id>_solution.png` (end of the solution) and the extra `--frames`, plus `index.html` (contact sheet).
Exit code 1 if any scenario has errors. `--debug` draws lane numbers with direction arrows (pink = approach
lanes, blue = exit lanes, yellow = ring lanes, green = road lanes), arm letters, bay ids and a 10 m grid
labelled in scene coordinates. `--gallery` refreshes the snapshot embedded in `tools/scene_gallery.html`.

**Gallery.** Open `tools/scene_gallery.html` in a browser: every example with its question, play buttons
(intro, solution, question), arrows / labels toggles and validation messages. On `file://` it shows the
embedded snapshot of `docs/scene_examples.json`; it can also show `window.DATA.scenarios` (from
`src/data.js`) or any JSON file you open with the file picker.

**Checklist before handing in a scenario**

1. `scene_preview.py` reports no errors and no warnings you cannot explain.
2. In `_question.png` every car is on the right-hand side of its road and faces its direction of travel.
3. The question frame does not show the answer (no solution arrows, no signal that gives it away unless the question is about it).
4. In `_solution.png` / extra frames the correct behaviour is visible and nobody overlaps.
5. The scene is readable at `--mobile` width (zoom in with `view.zoom` if the key objects are small).

---

## 13. Worked examples

The 10 scenarios below are exactly the content of `docs/scene_examples.json`. Their Arabic follows BRIEF
section 4; their rules are standard UAE rules but they carry no `src` yet: add sources before reusing them.

### 13.1 Roundabout priority (`ex-rb-01`)

Single-lane roundabout. The red car is placed with `{"ring":"outer","before":"S","deg":55}`: on the ring, upstream of the S entry, so it comes from the learner's LEFT. In the solution the red car continues with `"route":"ring->E"` (from wherever it is on the ring) and `me` waits with its brake lights on, then enters (`"S1->N"`, 2nd exit, no indicator on the approach, right indicator before leaving: automatic). `"labels":"solution"` shows the red car's label while the answer plays.

```json
{
  "id": "ex-rb-01",
  "topic": "roundabouts",
  "level": 2,
  "exam": ["dubai", "sharjah"],
  "type": "choice",
  "scene": {
    "template": "roundabout",
    "params": { "arms": 4, "lanes": 1, "ring": 1, "island": "palms" },
    "labels": "solution",
    "actors": [
      { "id": "me", "type": "me", "pos": { "arm": "S", "lane": 1, "at": "stopline" } },
      {
        "id": "red",
        "type": "car",
        "color": "red",
        "pos": { "ring": "outer", "before": "S", "deg": 55 },
        "label": "داخل الدوار"
      },
      { "id": "blue", "type": "car", "color": "blue", "pos": { "arm": "E", "lane": 1, "at": 9 } }
    ],
    "solution": [
      { "t": 0, "actor": "me", "brake": true },
      { "t": 0, "actor": "red", "route": "ring->E", "kmh": 28 },
      { "t": 2.9, "actor": "me", "brake": false },
      { "t": 3.0, "actor": "me", "route": "S1->N", "kmh": 34, "ease": "in" }
    ],
    "arrows": [
      { "actor": "red", "route": "ring->E", "style": "other" },
      { "actor": "me", "route": "S1->N", "style": "me" }
    ]
  },
  "q": "أنت عند مدخل الدوار وتريد المتابعة إلى المخرج الثاني، وسيارة حمراء تسير داخل الدوار قادمة من يسارك، من يمر أولا؟",
  "options": [
    "أنت، لأن المخرج الذي تريده أمامك مباشرة",
    "السيارة الحمراء، لأنها داخل الدوار",
    "السيارة الزرقاء، لأنها على يمينك",
    "من يصل أولا إلى خط الدخول"
  ],
  "answer": 1,
  "explain": "عند الدخول إلى الدوار أعط الأولوية للمركبات التي تسير داخله، وهي تأتي من جهة اليسار\nادخل فقط عندما تجد فجوة آمنة",
  "tip": "الدوار عندنا عكس عقارب الساعة، فالخطر دايما جاي من شمالك",
  "src": [],
  "confidence": "medium"
}
```

### 13.2 Roundabout lane choice for the 3rd exit (`ex-rb-02`)

Two entry lanes and two ring lanes. `me` starts in lane 1 (the RIGHT lane), changes to lane 2 (`"lane_change":"left"`, left = higher lane number) and takes `"S2->W"` (3rd exit). The engine uses the inner ring for entry lane 2 and exits into lane 2 of the W road; the automatic indicators show left on the approach and switch to right after passing the N exit. A `from` arrow shows the recommended path, a callout names the lane.

```json
{
  "id": "ex-rb-02",
  "topic": "roundabouts",
  "level": 3,
  "exam": ["dubai", "sharjah"],
  "type": "choice",
  "scene": {
    "template": "roundabout",
    "params": { "arms": 4, "lanes": 2, "ring": 2 },
    "actors": [
      { "id": "me", "type": "me", "pos": { "arm": "S", "lane": 1, "at": 13 } },
      { "id": "c1", "type": "car", "color": "silver", "pos": { "arm": "W", "lane": 1, "at": 3 } },
      { "id": "c2", "type": "car", "color": "white", "pos": { "arm": "N", "lane": 2, "at": 14 } }
    ],
    "solution": [
      { "t": 0, "actor": "me", "lane_change": "left", "dist": 9, "dur": 1.8 },
      { "t": 1.8, "actor": "me", "route": "S2->W", "kmh": 24 }
    ],
    "arrows": [{ "from": { "arm": "S", "lane": 2, "at": 4 }, "route": "S2->W", "style": "ok" }],
    "callouts": [
      {
        "text": "المسار الأيسر للمخرج الثالث",
        "at": { "arm": "S", "lane": 2, "at": 14 },
        "when": "solution",
        "style": "ok"
      }
    ]
  },
  "q": "تريد الخروج من المخرج الثالث (الانعطاف يسارا) في دوار بمسارين، ما التصرف الصحيح؟",
  "options": [
    "أبقى في المسار الأيمن وأشغل إشارة اليمين من البداية",
    "أدخل من أي مسار وأدور في الحلقة الخارجية دون إشارة",
    "أنتقل إلى المسار الأيسر وأشغل إشارة اليسار، وبعد تجاوز المخرج الذي قبل مخرجي أشغل إشارة اليمين",
    "أنتقل إلى المسار الأيسر ثم أقطع الحلقة الخارجية فجأة عند المخرج"
  ],
  "answer": 2,
  "explain": "للمخرج الثالث أو للرجوع استخدم المسار الأيسر مع إشارة اليسار، وابق في المسار الداخلي\nبعد تجاوز المخرج الذي قبل مخرجك شغل إشارة اليمين واخرج بأمان",
  "src": [],
  "confidence": "medium"
}
```

### 13.3 Crossroads with lights and a green filter arrow (`ex-tl-01`)

Divided 2-lane arms, all controlled by lights. `params.lights` sets the question-frame state: S main red with the RIGHT filter arrow green, E green (its traffic goes straight and does not conflict with the right turn). `me` waits in lane 1 with its right indicator on (actor key `"signal":"right"`) and turns with `"S1->E"` into lane 1 of the E road.

```json
{
  "id": "ex-tl-01",
  "topic": "lights",
  "level": 3,
  "exam": ["dubai", "sharjah"],
  "type": "choice",
  "scene": {
    "template": "crossroads",
    "params": {
      "lanes": 2,
      "divided": true,
      "control": "lights",
      "lights": { "S": { "main": "red", "right": "green" }, "N": "red", "E": "green", "W": "red" }
    },
    "actors": [
      { "id": "me", "type": "me", "pos": { "arm": "S", "lane": 1, "at": "stopline" }, "signal": "right" },
      { "id": "c1", "type": "car", "color": "silver", "pos": { "arm": "S", "lane": 2, "at": "stopline" } },
      { "id": "c2", "type": "car", "color": "blue", "pos": { "arm": "E", "lane": 2, "at": 16 } },
      { "id": "c3", "type": "car", "color": "white", "pos": { "arm": "N", "lane": 1, "at": "stopline" } }
    ],
    "solution": [
      { "t": 0, "actor": "c2", "route": "E2->W", "kmh": 36 },
      { "t": 0.4, "actor": "me", "route": "S1->E", "kmh": 22, "ease": "in" }
    ],
    "arrows": [{ "actor": "me", "route": "S1->E", "style": "ok" }]
  },
  "q": "الضوء الرئيسي أحمر والسهم الأخضر لليمين مضاء، وأنت في المسار الأيمن وتريد الانعطاف يمينا، ماذا تفعل؟",
  "options": [
    "أنعطف يمينا بحذر لأن السهم الأخضر يسمح بذلك، مع الانتباه للمشاة",
    "أنتظر حتى يصبح الضوء الرئيسي أخضر",
    "أتابع إلى الأمام لأن أحد الأضواء أخضر",
    "أنعطف يمينا بسرعة قبل أن ينطفئ السهم"
  ],
  "answer": 0,
  "explain": "السهم الأخضر يسمح لك بالتحرك في اتجاهه فقط حتى لو كان الضوء الرئيسي أحمر\nتحرك بحذر وأعط الأولوية لأي مشاة ما زالوا يعبرون",
  "src": [],
  "confidence": "medium"
}
```

### 13.4 Unmarked crossroads (priority to the left) (`ex-jn-01`)

`"control":"none"` and `"markings":"none"` give a junction without lines or signs. The blue car is on arm W, which is on the LEFT of a driver coming from S (heading north). UAE law (Decree-Law 14/2024, art. 6) gives priority to the vehicle coming from the LEFT at an unregulated junction of equal roads. The solution lets the blue car pass (`"W1->E"`) and then `me` goes straight.

```json
{
  "id": "ex-jn-01",
  "topic": "priority",
  "level": 3,
  "exam": ["dubai", "sharjah"],
  "type": "choice",
  "scene": {
    "template": "crossroads",
    "params": { "lanes": 1, "control": "none", "markings": "none" },
    "labels": "solution",
    "actors": [
      { "id": "me", "type": "me", "pos": { "arm": "S", "lane": 1, "at": 1 } },
      {
        "id": "blue",
        "type": "car",
        "color": "blue",
        "pos": { "arm": "W", "lane": 1, "at": 2 },
        "label": "قادمة من يسارك"
      }
    ],
    "solution": [
      { "t": 0, "actor": "me", "brake": true },
      { "t": 0, "actor": "blue", "route": "W1->E", "kmh": 24, "ease": "in" },
      { "t": 3.2, "actor": "me", "brake": false },
      { "t": 3.3, "actor": "me", "route": "S1->N", "kmh": 24, "ease": "in" }
    ],
    "arrows": [{ "actor": "blue", "route": "W1->E", "style": "other" }]
  },
  "q": "تقاطع ليس فيه إشارات ولا علامات، وسيارة زرقاء تصل من يسارك في الوقت نفسه، من يمر أولا؟",
  "options": [
    "أنت، لأنك تسير مستقيما",
    "من يطلق المنبه أولا",
    "الأسرع منكما",
    "السيارة الزرقاء، لأنها قادمة من يسارك"
  ],
  "answer": 3,
  "explain": "في التقاطع الذي لا تنظمه إشارات أو علامات أعط الأولوية للمركبة القادمة من يسارك (عكس أوروبا)\nخفف السرعة قبل التقاطع واستعد للتوقف",
  "src": [],
  "confidence": "medium"
}
```

### 13.5 T-junction with STOP (`ex-jn-02`)

`tjunction` with `"side":"S"` and `"control":"stop"` (a STOP sign, a solid stop line and STOP painted on the side road). Traffic comes from both directions of the main road; `me` (indicating left) waits until both have passed, then turns left (`"S1->W"`), ending in the correct (north) half of the main road.

```json
{
  "id": "ex-jn-02",
  "topic": "priority",
  "level": 2,
  "exam": ["dubai", "sharjah"],
  "type": "choice",
  "scene": {
    "template": "tjunction",
    "params": { "side": "S", "lanes": 1, "control": "stop" },
    "actors": [
      { "id": "me", "type": "me", "pos": { "arm": "S", "lane": 1, "at": "stopline" }, "signal": "left" },
      { "id": "white", "type": "car", "color": "white", "pos": { "arm": "W", "lane": 1, "at": 5 } },
      { "id": "truck", "type": "truck", "color": "orange", "pos": { "arm": "E", "lane": 1, "at": 9 } }
    ],
    "solution": [
      { "t": 0, "actor": "white", "route": "W1->E", "kmh": 34 },
      { "t": 0.3, "actor": "truck", "route": "E1->W", "kmh": 32 },
      { "t": 4.6, "actor": "me", "route": "S1->W", "kmh": 20, "ease": "in" }
    ],
    "arrows": [{ "actor": "me", "route": "S1->W", "style": "me" }]
  },
  "q": "وصلت إلى إشارة قف عند تقاطع على شكل T وتريد الانعطاف يسارا، ما التصرف الصحيح؟",
  "options": [
    "أخفف السرعة وأدخل إذا بدا الطريق خاليا دون أن أتوقف",
    "أتوقف تماما عند خط التوقف، وأعطي الأولوية للمركبات من الاتجاهين، ثم أنعطف عندما يخلو الطريق",
    "أتوقف فقط إذا رأيت سيارة قادمة من اليمين",
    "أطلق المنبه وأدخل قبل الشاحنة"
  ],
  "answer": 1,
  "explain": "إشارة قف تعني التوقف الكامل عند الخط حتى لو كان الطريق خاليا\nبعد التوقف أعط الأولوية لكل المركبات على الطريق الرئيسي من الاتجاهين",
  "src": [],
  "confidence": "medium"
}
```

### 13.6 Ambulance approaching from behind on a 3-lane road (`ex-em-01`)

Divided road, 3 lanes per direction. `me` is in lane 2 (middle); the ambulance (flashing and siren by default) is behind in the same lane. Solution: `me` moves RIGHT to lane 1 (`"lane_change":"right"`, automatic right indicator) and slows (`"drive":7` with `"ease":"out"`), the ambulance passes in lane 2. Both arrows use `"track":"solution"`, so they always match the animation.

```json
{
  "id": "ex-em-01",
  "topic": "emergency-vehicles",
  "level": 2,
  "exam": ["dubai", "sharjah"],
  "type": "choice",
  "scene": {
    "template": "road",
    "params": { "lanes": 3, "divided": true, "median": { "width": 4, "palms": true }, "len": 70 },
    "labels": "solution",
    "actors": [
      { "id": "me", "type": "me", "pos": { "dir": "up", "lane": 2, "y": 30 } },
      { "id": "amb", "type": "ambulance", "pos": { "dir": "up", "lane": 2, "y": 6 }, "label": "سيارة إسعاف" },
      { "id": "c1", "type": "car", "color": "red", "pos": { "dir": "up", "lane": 3, "y": 42 } },
      { "id": "c2", "type": "car", "color": "silver", "pos": { "dir": "down", "lane": 2, "y": 50 } }
    ],
    "solution": [
      { "t": 0, "actor": "me", "lane_change": "right", "dist": 16, "dur": 2.4 },
      { "t": 2.4, "actor": "me", "drive": 7, "dur": 2.2, "ease": "out" },
      { "t": 0, "actor": "c1", "drive": 12, "dur": 3, "ease": "out" },
      { "t": 0, "actor": "c2", "drive": 70, "dur": 4 },
      { "t": 1.3, "actor": "amb", "drive": 90, "dur": 3.8, "ease": "in" }
    ],
    "arrows": [
      { "actor": "me", "track": "solution", "style": "ok" },
      { "actor": "amb", "track": "solution", "style": "warn" }
    ]
  },
  "q": "تسمع صفارة سيارة إسعاف وترى أضواءها خلفك في المسار الأوسط، ماذا تفعل؟",
  "options": [
    "أبقى في مساري وأزيد السرعة لأبتعد عنها",
    "أتوقف فجأة في مكاني",
    "أشغل إشارة اليمين وأنتقل بأمان إلى المسار الأيمن وأخفف السرعة لأفسح لها الطريق",
    "أنتقل بسرعة إلى المسار الأيسر وأتبعها بعد مرورها"
  ],
  "answer": 2,
  "explain": "أفسح الطريق لمركبات الطوارئ: انظر في المرايا وشغل الإشارة وانتقل بهدوء إلى اليمين عندما يكون ذلك آمنا\nلا تتوقف فجأة ولا تتبعها بعد مرورها",
  "src": [],
  "confidence": "medium"
}
```

### 13.7 School bus stopped with the STOP arm out (undivided road) (`ex-sb-01`)

One lane each way, broken centre line. `"stop_arm": true` on the school bus deploys the arm on its LEFT (driver) side and turns on the red flashers. `me` stops 6 m behind the bus with `{"behind":"bus","gap":6}`; the car coming the other way stops too (`{"y":43}`, more than 5 m before the bus). The arm folds (`"stop_arm": false`), the bus leaves, then traffic moves.

```json
{
  "id": "ex-sb-01",
  "topic": "school-bus",
  "level": 3,
  "exam": ["dubai", "sharjah"],
  "type": "choice",
  "scene": {
    "template": "road",
    "params": { "lanes": 1, "center": "broken", "len": 50 },
    "labels": "solution",
    "actors": [
      {
        "id": "bus",
        "type": "school-bus",
        "pos": { "dir": "up", "lane": 1, "y": 30 },
        "stop_arm": true,
        "label": "حافلة مدرسية متوقفة"
      },
      { "id": "me", "type": "me", "pos": { "dir": "up", "lane": 1, "y": 5 } },
      { "id": "c1", "type": "car", "color": "blue", "pos": { "dir": "down", "lane": 1, "y": 47.5 } },
      {
        "id": "kid",
        "type": "pedestrian",
        "variant": "child",
        "color": "red",
        "pos": { "side": "east", "y": 31 }
      }
    ],
    "solution": [
      { "t": 0, "actor": "me", "stop_at": { "behind": "bus", "gap": 6 }, "dur": 2.6 },
      { "t": 0, "actor": "c1", "stop_at": { "y": 43 }, "dur": 2.4 },
      { "t": 0.3, "actor": "kid", "to": { "side": "east", "y": 23 }, "dur": 3.2 },
      { "t": 4.0, "actor": "bus", "stop_arm": false },
      { "t": 4.7, "actor": "bus", "drive": 45, "dur": 4.5, "ease": "in" },
      { "t": 5.4, "actor": "me", "drive": 60, "dur": 5.5, "ease": "in" },
      { "t": 5.0, "actor": "c1", "drive": 70, "dur": 5, "ease": "in" }
    ],
    "callouts": [
      { "text": "5 أمتار على الأقل", "at": { "x": -4.5, "y": 21.5 }, "when": "solution", "style": "warn" }
    ]
  },
  "q": "حافلة مدرسية متوقفة مدت ذراع قف وأضواؤها الحمراء تومض، والطريق غير مقسم، ما الذي يجب على السائقين فعله؟",
  "options": [
    "يتوقف السائقون في الاتجاهين على بعد 5 أمتار على الأقل حتى تنطوي الذراع",
    "يتوقف السائقون خلف الحافلة فقط، ويتابع القادمون من الاتجاه المعاكس",
    "يتجاوز السائقون الحافلة ببطء مع استخدام المنبه",
    "يكفي تخفيف السرعة لأن الأطفال على الرصيف"
  ],
  "answer": 0,
  "explain": "عندما تمد الحافلة المدرسية ذراع قف وتومض أضواؤها الحمراء توقف على بعد 5 أمتار على الأقل\nعلى الطريق غير المقسم يتوقف القادمون من الاتجاه المعاكس أيضا حتى تنطوي الذراع",
  "src": [],
  "confidence": "medium"
}
```

### 13.8 Pedestrian at a zebra crossing (`ex-pd-01`)

`"zebra":{"y":32}` draws the crossing and its signs; the pedestrian stands at `{"crossing":"zebra","side":"east"}`. `"stop_at":"crossing"` stops `me` before the stripes, `"cross":"zebra"` walks the pedestrian to the far pavement, then `me` drives on.

```json
{
  "id": "ex-pd-01",
  "topic": "pedestrians",
  "level": 1,
  "exam": ["dubai", "sharjah"],
  "type": "choice",
  "scene": {
    "template": "road",
    "params": { "lanes": 1, "zebra": { "y": 32 }, "center": "solid", "len": 48 },
    "actors": [
      { "id": "me", "type": "me", "pos": { "dir": "up", "lane": 1, "y": 8 } },
      {
        "id": "ped",
        "type": "pedestrian",
        "pos": { "crossing": "zebra", "side": "east" },
        "label": "ينتظر العبور"
      }
    ],
    "solution": [
      { "t": 0, "actor": "me", "stop_at": "crossing", "dur": 2.6 },
      { "t": 1.2, "actor": "ped", "cross": "zebra", "dur": 5 },
      { "t": 6.1, "actor": "me", "drive": 60, "dur": 4.5, "ease": "in" }
    ]
  },
  "q": "مشاة يقف عند طرف ممر المشاة ويستعد للعبور، ماذا تفعل؟",
  "options": [
    "أطلق المنبه ليبتعد وأتابع",
    "أتابع لأنه لم يبدأ العبور بعد",
    "أتجاوزه من الجهة الأخرى للطريق",
    "أخفف السرعة وأتوقف قبل الممر وأنتظر حتى يعبر"
  ],
  "answer": 3,
  "explain": "للمشاة الأولوية عند ممر المشاة\nخفف السرعة وتوقف قبل الخطوط وانتظر حتى يصل إلى الرصيف المقابل",
  "src": [],
  "confidence": "medium"
}
```

### 13.9 Highway merge (`ex-hw-01`)

`highway-merge` with 3 lanes: the ramp joins from the RIGHT into an acceleration lane. `me` starts on the ramp (`{"lane":"ramp","y":8}`), the truck is in lane 1. `"route":"merge"` with `"merge_at":62` makes `me` accelerate (`"ease":"in"`), indicate left (automatic) and join lane 1 behind the truck. The arrow stops at the merge point (`"until":"merge"`).

```json
{
  "id": "ex-hw-01",
  "topic": "highway",
  "level": 3,
  "exam": ["dubai", "sharjah"],
  "type": "choice",
  "scene": {
    "template": "highway-merge",
    "params": { "lanes": 3 },
    "actors": [
      { "id": "me", "type": "me", "pos": { "lane": "ramp", "y": 8 } },
      { "id": "truck", "type": "truck", "color": "white", "pos": { "lane": 1, "y": 14 } },
      { "id": "c1", "type": "car", "color": "blue", "pos": { "lane": 2, "y": 30 } }
    ],
    "solution": [
      { "t": 0, "actor": "truck", "drive": 100, "dur": 5.6 },
      { "t": 0, "actor": "c1", "drive": 100, "dur": 5.2 },
      { "t": 0, "actor": "me", "route": "merge", "merge_at": 62, "dur": 7, "ease": "in" }
    ],
    "arrows": [{ "actor": "me", "route": "merge", "merge_at": 62, "until": "merge", "style": "ok" }]
  },
  "q": "أنت على منحدر الدخول إلى طريق سريع، وشاحنة تقترب في المسار الأيمن، ما الطريقة الصحيحة للاندماج؟",
  "options": [
    "أتوقف في بداية مسار التسارع حتى يخلو الطريق تماما",
    "أدخل مباشرة إلى المسار الأوسط",
    "أستخدم مسار التسارع لأقترب من سرعة المرور، وأشغل إشارة اليسار، وأندمج خلف الشاحنة في فجوة آمنة",
    "أسرع لأدخل أمام الشاحنة مهما كانت المسافة"
  ],
  "answer": 2,
  "explain": "مسار التسارع موجود لترفع سرعتك إلى سرعة المرور، وعليك إعطاء الأولوية للمركبات على الطريق السريع\nشغل إشارة اليسار واندمج في فجوة آمنة",
  "src": [],
  "confidence": "medium"
}
```

### 13.10 Hazard perception: a child runs after a ball (tap question) (`ex-hz-01`)

A 4 s `intro` clip: `me` drives along a street with cars parked on the right (`"parked":{"up":[...]}`), a ball rolls out from a gap (`to` a lane slot) and a child steps into the gap. The question freezes at the end of the intro. Hotspots: the child and the ball are correct (`"answer":["kid","ball"]`), the oncoming car and a parked car are distractors. Solution: brake and stop short, the child fetches the ball (`"visible": false` hides it) and returns, then `me` continues.

```json
{
  "id": "ex-hz-01",
  "topic": "hazard",
  "level": 4,
  "exam": ["dubai", "sharjah"],
  "type": "tap",
  "scene": {
    "template": "road",
    "params": { "lanes": 1, "center": "broken", "parked": { "up": [19, 25.5, 36, 42.5] }, "len": 44 },
    "actors": [
      { "id": "me", "type": "me", "pos": { "dir": "up", "lane": 1, "y": 2 } },
      { "id": "ball", "type": "ball", "color": "orange", "pos": { "dir": "up", "lane": "parking", "y": 30.8 } },
      {
        "id": "kid",
        "type": "pedestrian",
        "variant": "child",
        "pos": { "side": "east", "y": 30.8 },
        "label": "طفل يلحق بالكرة"
      },
      { "id": "oncoming", "type": "car", "color": "silver", "pos": { "dir": "down", "lane": 1, "y": 58 } }
    ],
    "intro": {
      "len": 4,
      "events": [
        { "t": 0, "actor": "me", "drive": 20, "dur": 4 },
        { "t": 0, "actor": "oncoming", "drive": 28, "dur": 4 },
        { "t": 2.1, "actor": "ball", "to": { "dir": "up", "lane": 1, "y": 31.4 }, "dur": 1.5 },
        { "t": 2.8, "actor": "kid", "to": { "dir": "up", "lane": "parking", "y": 30.8 }, "dur": 1.2 }
      ]
    },
    "solution": [
      { "t": 0, "actor": "me", "brake": true },
      { "t": 0, "actor": "me", "drive": 3.5, "dur": 1.2, "ease": "out" },
      { "t": 0, "actor": "oncoming", "drive": 40, "dur": 4.2 },
      { "t": 0.4, "actor": "kid", "to": { "dir": "up", "lane": 1, "y": 30.9 }, "dur": 1.3 },
      { "t": 2.0, "actor": "ball", "visible": false },
      { "t": 2.3, "actor": "kid", "to": { "side": "east", "y": 31 }, "dur": 1.6 },
      { "t": 4.4, "actor": "me", "brake": false },
      { "t": 4.6, "actor": "me", "drive": 40, "dur": 4.5, "ease": "in" }
    ]
  },
  "hotspots": [
    { "id": "kid", "actor": "kid" },
    { "id": "ball", "actor": "ball" },
    { "id": "oncoming", "actor": "oncoming" },
    { "id": "parked", "at": { "dir": "up", "lane": "parking", "y": 42.5 }, "r": 3 }
  ],
  "q": "أين الخطر الذي يجب أن تستعد له الآن؟ انقر عليه",
  "answer": ["kid", "ball"],
  "explain": "كرة تدخل الطريق من بين السيارات المتوقفة، وغالبا يركض طفل خلفها\nخفف السرعة فورا واستعد للتوقف قبل أن يظهر أمامك",
  "tip": "شفت كرة؟ استنى الولد وراها",
  "src": [],
  "confidence": "medium"
}
```

---

## 14. Known limits

- Roads are always drawn north-south and junction arms meet at right angles (no skewed or curved roads,
  no slip lanes, no multi-junction networks). Use `view` to crop.
- Lane changes, turns and parking are geometric curves, not a vehicle physics model; very short `dist`
  values give sharp swerves.
- A car stays in the lane geometry of its template: there is no free "overtake" action; build it from
  `lane_change` + `drive` + `lane_change`.
- Traffic lights have one signal head per arm; pedestrian signals are not drawn.
- The collision check compares rectangles every 0.1 s; very fast actors can slip between samples.
- Road text painted on the asphalt is limited to STOP and BUS.
- Sign pictures come from `window.Signs` when that module is loaded (built page); otherwise simple
  built-in drawings are used for STOP, give way, roundabout, U-turn, works, school, hump and pedestrian crossing.
- Actor labels also show on hover or tap during the question, even with `"labels": "solution"`. When a label
  would give the answer away, use `"labels": "never"` and switch labels on with a solution event (`labels: true`).
- The pavement slot `{arm, side, at}` does not work on the `roundabout` template (NaN position); use `{x, y}`.
- A short sideways `to` (under about 3 m) or a `to` into a slot with `shift` turns the car sharply; use `path`
  points spread over 4 to 5 m. After a `path` the car is off the lane graph: `to` a lane slot before a
  `lane_change` or `pull_over`.
- There is no reversing-light or high-beam look; say it in the question text when it matters.

