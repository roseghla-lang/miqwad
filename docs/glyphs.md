# Glyphs and arrows (`src/signs/glyphs.js`)

Shared pictogram library for every sign drawing in مقود. It extends `window.SignKit` (from `src/signs/kit.js`,
which must load first; glyphs.js still loads on its own and creates a minimal SignKit if kit.js is missing).

- 74 glyphs (people, vehicles, animals, hazards, road layouts, services, letters) and 23 arrow kinds.
- Everything is drawn from scratch as plain SVG shapes: no `id`, no `<defs>`, no gradients, every shape has an
  explicit `fill` (stroked shapes carry `fill="none"` plus a stroke).
- Details such as windows, hubs and door arches are real holes (`fill-rule="evenodd"`), so a glyph works on
  any background: black on white, white on blue, black on orange.
- Visual check page: `tools/glyph_gallery.html` (every glyph and arrow at 220, 90 and 40 px, inside real bases,
  plus the composition examples quoted below; `Gallery.bounds()`, `Gallery.fitCheck()` and `Gallery.tuneWarn()`
  are automated checks you can run with `shot.py --js`). Screenshot:
  `python3 tools/shot.py tools/glyph_gallery.html tools/out/glyphs.png --w 1400 --h 1000 --full`

## 1. API

```js
SignKit.glyph(name, opts)  -> '<g transform="...">...</g>'   // put it inside any base: warn(), prohib(), mand(), rect()...
SignKit.arrow(kind, opts)  -> '<g transform="...">...</g>'
```

| option | meaning |
|---|---|
| `x, y, w, h` | target box in the base's own viewBox. The glyph viewBox is fitted inside (contain, aspect kept). Missing `w`/`h` are derived from the glyph ratio; with no box at all the glyph is drawn at its native size at `x, y`. |
| `ax, ay` | alignment of the fitted glyph inside the box, 0..1 (default 0.5 = centred). `ay: 1` stands the glyph on the box bottom (use it in triangles). |
| `s` | explicit scale (glyph units to sign units) instead of fitting. With `cx, cy` (or the box centre) as the centre. Use it when several arrows must share one line weight. |
| `fill` | main colour. Default `SignKit.C.black`; `crescent` defaults to red. |
| `color2` | second colour: `traffic-light` lamps (one colour or `[red, amber, green]`), `two-way` down arrow, `ambulance-side` crescent (drawn in colour instead of a hole). |
| `flip` | mirror horizontally around the box centre. |
| `flipV` | mirror vertically around the box centre. |
| `rot` | degrees, clockwise, around the box centre, applied after `flip`. A rotated glyph can leave its box. |
| `bg` | background colour for the thin separation halo on `horse-rider` and `cyclist` (rider leg). Default: blue when `fill` is white, otherwise white. Pass it on any other background (for example `bg: SignKit.C.orange`). |
| `p` | arrows only: geometry overrides, e.g. `{len: 60, sw: 12, hw: 30, hl: 20}` (see the arrow table for each kind's parameters). |

Unknown names never throw: they return a small dashed grey placeholder and log one `console.warn`.

Helpers:

| helper | returns |
|---|---|
| `SignKit.glyphs[name]` | `{vb: [w, h], draw(fill, color2, opts), tags, desc, anchors?, fill?, alias?, boxes?}`. `draw` returns shapes in `0..w x 0..h`; `boxes.warn` is the tuned triangle box. |
| `SignKit.arrows[kind]` | same shape with the default geometry, plus `params`. |
| `SignKit.glyphNames()`, `SignKit.arrowKinds()` | name lists. |
| `SignKit.glyphBox(name, opts)` | `{x, y, w, h, s}`: where the glyph actually lands (ignores rot and flip). Works for arrows too. |
| `SignKit.glyphPoint(name, pt, opts)` | `[x, y]` in sign space of a glyph-space point `[gx, gy]` or of a named anchor (`'label'`), honouring flip, flipV and rot. |
| `SignKit.glyphIcon(name, {fill, color2, pad, size, label, flip, bg})` | a standalone `<svg class="glyph-svg">` (glyph or arrow) for UI chips and buttons. On the dark app theme pass `bg` (the panel colour) for `horse-rider` and `cyclist`. |
| `SignKit.fit(base, name, extra)` | the recommended box for that glyph in that base (next section). |
| `SignKit.FRAMES`, `SignKit.frame(kind, extra)` | generic boxes per base; `frame()` returns a copy merged with `extra`. |

## 2. Where to put a pictogram in each base: `SignKit.fit(base, name)`

Use `SignKit.fit(base, name, extra)` to place a glyph or arrow; it returns the box to pass as `opts`:

```js
SignKit.warn(SignKit.glyph('camel', SignKit.fit('warn', 'camel')));
SignKit.mand(SignKit.arrow('turn-left', SignKit.fit('mand', 'turn-left')));
SignKit.prohib(SignKit.glyph('horn', SignKit.fit('prohib', 'horn', {fill: SignKit.C.black})), {slash: true});
```

- `base` is `'warn'`, `'giveWay'`, `'prohib'`, `'mand'` or `'square'`; `extra` is merged over the result
  (a colour, `flip`, a custom box...). `mand` and `square` come with `fill: white`.
- For `'warn'` every glyph and arrow has its own **tuned box**: the largest placement, standing on y 74, whose
  actual ink stays at least 2 units inside the white triangle (height at most 33, or 39 for thin line symbols,
  width at most 44; centred unless a small sideways shift makes it clearly bigger). The plain `SignKit.WARN`
  frame (x 30..70 from y 42) is too wide at the top for glyphs with ink in their upper corners (the camel's
  head, the falling-rocks cliff, the steep wedge): with it they touch the red border. The tuned boxes live in
  `WARN_FIT` in glyphs.js; after changing a glyph run `Gallery.tuneWarn()` in the gallery and paste the new
  numbers. `Gallery.fitCheck()` verifies every glyph in warn, prohib and mand (currently 0 problems).
- Other bases use the frames below (glyphs are fitted inside, so any aspect works).

| frame (`SignKit.FRAMES`) | box | use |
|---|---|---|
| `warn` | `{x: 30, y: 42, w: 40, h: 32, ay: 1}` | the `SignKit.WARN` frame; generic fallback, prefer `fit('warn', name)`. |
| `warnWide` | `{x: 26, y: 50, w: 48, h: 24, ay: 1}` | fallback for a custom wide drawing in a triangle. |
| `warnTall` | `{x: 36, y: 35, w: 28, h: 39, ay: 1}` | fallback for a custom thin line drawing in a triangle. |
| `giveWay` | `{x: 33, y: 18, w: 34, h: 24, ay: 0}` | `SignKit.giveWay` (point down), hanging from the top edge. |
| `prohib` | `{x: 27, y: 27, w: 46, h: 46}` | `SignKit.prohib` and `SignKit.endRestriction`. With `{slash: true}` the red bar is drawn above the glyph. |
| `mand` | `{x: 22, y: 22, w: 56, h: 56, fill: white}` | `SignKit.mand` (blue disc, white pictogram). |
| `square` | `{x: 16, y: 16, w: 68, h: 68, fill: white}` | `SignKit.rect` 100 x 100 info and service signs. |

`SignKit.frame(kind, extra)` returns a copy of a frame merged with `extra`.

## 3. Examples (all of them render in the gallery, section "Composition examples")

```js
// camel inside the warning triangle
Signs.register('w-camels', function () {
  return SignKit.warn(SignKit.glyph('camel', SignKit.fit('warn', 'camel')), {label: 'انتبه: جمال'});
});
// a custom box also works, e.g. inside the SignKit.WARN frame {cx: 50, cy: 58, top: 42, bottom: 74}:
var W = SignKit.WARN;
SignKit.warn(SignKit.glyph('children', {x: W.cx - 20, y: W.top, w: 40, h: W.bottom - W.top, ay: 1}));

// percentage label at the glyph's 'label' anchor
var box = SignKit.fit('warn', 'steep-down');
var p = SignKit.glyphPoint('steep-down', 'label', box);
SignKit.warn(SignKit.glyph('steep-down', box) + SignKit.text('10%', p[0], p[1], 8.5, {family: 'latin'}));

// temporary works sign on orange
SignKit.warn(SignKit.glyph('worker', SignKit.fit('warn', 'worker')), {bg: SignKit.C.orange});

// bends: pick the form the catalogue describes (with or without arrowhead)
SignKit.warn(SignKit.arrow('bend-right-arrow', SignKit.fit('warn', 'bend-right-arrow')));

// prohibitory: glyph under the red slash
SignKit.prohib(SignKit.glyph('person-walk', SignKit.fit('prohib', 'person-walk')), {slash: true});
SignKit.prohib(SignKit.arrow('uturn-left', SignKit.fit('prohib', 'uturn-left')), {slash: true});
SignKit.prohib(SignKit.glyph('truck-side', SignKit.fit('prohib', 'truck-side')));   // no goods vehicles (no slash)

// no overtaking: red car on the LEFT (the overtaking side in the UAE), black car on the right
SignKit.prohib(
  SignKit.glyph('car-rear', {x: 21, y: 36, w: 28, h: 26, fill: SignKit.C.red}) +
  SignKit.glyph('car-rear', {x: 51, y: 36, w: 28, h: 26}));

// mandatory (white on blue)
SignKit.mand(SignKit.arrow('turn-left', SignKit.fit('mand', 'turn-left')));
SignKit.mand(SignKit.arrow('roundabout', SignKit.fit('mand', 'roundabout', {x: 17, y: 17, w: 66, h: 66})));
SignKit.mand(SignKit.glyph('bicycle', SignKit.fit('mand', 'bicycle')));

// same line weight for a family of arrows: fixed scale instead of box fitting
SignKit.mand(SignKit.arrow('straight', {s: 0.72, cx: 50, cy: 50, fill: SignKit.C.white}));
SignKit.mand(SignKit.arrow('straight-left', {s: 0.72, cx: 50, cy: 50, fill: SignKit.C.white}));

// priority over oncoming traffic: white up arrow on the right, red down arrow on the left
SignKit.rect(SignKit.arrow('two-way', {x: 20, y: 17, w: 60, h: 66, fill: SignKit.C.white, color2: SignKit.C.red}));

// info: pedestrian crossing (white triangle panel on the blue square)
var tri = '<polygon points="' + SignKit.tri(50, 60, 21) + '" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>';
SignKit.rect(tri + SignKit.glyph('pedestrian-crossing', {x: 31, y: 40, w: 38, h: 36, ay: 1}));

// services
SignKit.rect(SignKit.glyph('fuel-pump', SignKit.fit('square', 'fuel-pump')));
SignKit.rect(SignKit.glyph('parking-p', SignKit.fit('square', 'parking-p', {x: 22, y: 14, w: 56, h: 72})));
var panel = '<rect x="16" y="16" width="68" height="68" rx="3" fill="#fff"/>';
SignKit.rect(panel + SignKit.glyph('crescent', {x: 26, y: 23, w: 48, h: 54}));   // first aid, red crescent

// one-way (landscape rectangle)
SignKit.rect(SignKit.arrow('one-way', {x: 10, y: 11, w: 80, h: 18, fill: SignKit.C.white}), {w: 100, h: 40});

// UI icon (not a sign)
el.innerHTML = SignKit.glyphIcon('camel', {fill: 'currentColor', size: 24, label: 'جمل'});
```

## 4. Conventions

- Direction: people, animals and vehicles face or move to the **left** (Vienna / UK pictogram habit). Use
  `flip: true` for the other way. Exception: `wheelchair` faces **right** like the ISO access symbol.
- Right-hand traffic is built in: `roundabout` runs **anticlockwise**, `uturn-left` turns to the **left**,
  `two-way` has the **up** arrow on the **right**, `keep-left` / `keep-right` point diagonally down to that side.
- Line weight: people limbs are about 1/10 of the figure height; arrows use shaft 12.5, head 32 x 22 (bends 13 wide),
  which gives mandatory-sign arrows a shaft of about 10% of the disc with the `mand` frame.
- Sizes: silhouettes are designed to read at 40 px (whole sign); interior holes (windows, hubs) show from about 90 px.
- `steep-down` / `steep-up` expose an anchor `label` in the empty corner above the slope for the percentage text.
- `crescent` opens to the right by default; `flip: true` mirrors it.
- `aircraft` points nose-up; use `rot` (for example `rot: -45`) for a climbing / landing heading.
- Composite glyphs (`taxi-side`, `police-car`, `quayside`, `slippery-car`, `loose-chippings`, `toll-gate`,
  `ford`) reuse the car drawings, so vehicles look the same across signs.

## 5. Glyph catalogue

Aspect = w / h of the glyph viewBox (the box is tight around the ink).

### People

| name | description | viewBox | aspect |
|---|---|---|---|
| `person-walk` | adult walking to the left, side view | 56 x 100 | 0.56 |
| `pedestrian-crossing` | person walking left on a zebra crossing (row of stripes under the feet) | 90 x 100 | 0.90 |
| `children` | two children walking left: the older one (left) carries a school bag and holds the younger one by the hand | 84.2 x 100.4 | 0.84 |
| `worker` | road worker digging with a shovel into a mound (road works) | 99.8 x 71.2 | 1.40 |
| `cyclist` | cyclist riding to the left (near leg separated by a thin halo in `bg`) | 100 x 88 | 1.14 |
| `motorcyclist` | motorcyclist with helmet riding to the left | 95 x 82.6 | 1.15 |
| `wheelchair` | wheelchair user (International Symbol of Access), facing RIGHT like the ISO symbol | 74.5 x 99 | 0.75 |
| `person-standing` | person standing, front view | 36 x 99.8 | 0.36 |
| `flagman` | person standing, facing left, holding up a flag (flagman ahead) | 56.8 x 98.5 | 0.58 |
| `toilets` | man and woman standing, front view | 86 x 100 | 0.86 |

### Vehicles

| name | description | viewBox | aspect |
|---|---|---|---|
| `car-side` | saloon car, side view, facing left | 95.8 x 37.4 | 2.56 |
| `car-front` | car seen from the front (windscreen, headlights, grille) | 92 x 68.4 | 1.35 |
| `car-rear` | car seen from behind (rear window, tail lights, number plate); for no-overtaking | 92 x 68.4 | 1.35 |
| `truck-side` | lorry / goods vehicle, side view, facing left (cab + box, three wheels) | 98 x 54 | 1.81 |
| `truck-front` | lorry seen from the front (cab with the load box behind it) | 100 x 94 | 1.06 |
| `bus-side` | bus, side view, facing left (row of windows, front door) | 97.6 x 42.2 | 2.31 |
| `bus-front` | bus seen from the front (big windscreen, destination board) | 76 x 90 | 0.84 |
| `bus-stop` | alias of `bus-front`, for bus stop / bus lane signs | 76 x 90 | 0.84 |
| `bicycle` | bicycle without rider, facing left | 100 x 58.2 | 1.72 |
| `motorcycle-side` | motorcycle without rider, facing left | 95 x 53.8 | 1.77 |
| `tractor-side` | farm tractor, side view, facing left (big rear wheel, cab) | 95.4 x 81.5 | 1.17 |
| `taxi-side` | car side view facing left with a roof sign | 95.8 x 45.1 | 2.12 |
| `police-car` | car side view facing left with a light bar | 95.8 x 46 | 2.08 |
| `ambulance-side` | ambulance van, side view facing left, crescent (hole, or `color2`) and roof light | 97 x 48.4 | 2.00 |
| `helicopter` | helicopter, side view facing left | 94.3 x 55 | 1.71 |
| `train` | steam locomotive, side view facing left (railway crossing without gate) | 96 x 59 | 1.63 |
| `tram` | tram, side view facing left, with pantograph (trams crossing) | 98 x 56.7 | 1.73 |

### Animals

| name | description | viewBox | aspect |
|---|---|---|---|
| `camel` | dromedary camel (one hump, long curved neck) walking to the left | 126 x 100 | 1.26 |
| `cow` | cow / cattle walking to the left | 115.4 x 76.2 | 1.51 |
| `gazelle` | gazelle leaping to the left with long curved horns (wild animals) | 122.4 x 78.6 | 1.56 |
| `horse-rider` | horse walking to the left with a rider (rider leg separated by a halo in `bg`) | 97.6 x 96.4 | 1.01 |

### Hazards and scenes

| name | description | viewBox | aspect |
|---|---|---|---|
| `slippery-car` | car seen from behind, skewed, with two crossing wavy skid marks (slippery road) | 60.6 x 96 | 0.63 |
| `falling-rocks` | rocks falling from a cliff on the left side | 98 x 92 | 1.07 |
| `hump` | road hump: road profile with one bump | 100 x 26 | 3.85 |
| `uneven-road` | uneven road: road profile with two bumps | 100 x 24 | 4.17 |
| `loose-chippings` | car facing left throwing up loose stones behind it | 96.6 x 48 | 2.01 |
| `steep-down` | steep descent: wedge sloping down to the right; anchor `label` (upper right) | 100 x 56 | 1.79 |
| `steep-up` | steep ascent: wedge rising to the right; anchor `label` (upper left) | 100 x 56 | 1.79 |
| `tunnel` | tunnel portal: arch-shaped opening in a solid portal | 100 x 66 | 1.52 |
| `aircraft` | aeroplane seen from above, nose UP (use `rot` for other headings) | 96 x 100 | 0.96 |
| `windsock` | windsock on a pole blowing to the right (crosswind) | 94.2 x 84 | 1.12 |
| `traffic-light` | housing with red, amber and green lamps; lamps keep real colours (`color2` overrides) | 38 x 92 | 0.41 |
| `exclamation` | exclamation mark (other dangers) | 18 x 84 | 0.21 |
| `quayside` | car tipping off the edge of a quay into water (quayside / river bank) | 100 x 67 | 1.49 |
| `swing-bridge` | opening (lifting / swing) bridge: both deck halves raised over water | 100 x 58.7 | 1.70 |
| `sand-drift` | sand drifting across the road: dunes on the road with wind streaks | 100 x 63 | 1.59 |
| `ford` | car driving through water up to its wheels (ford / flooded road) | 101.2 x 53.7 | 1.88 |
| `water-on-road` | two wave lines over a flat road band | 100 x 50 | 2.00 |
| `lightning` | lightning bolt (electricity, overhead high-voltage cable) | 45 x 100 | 0.45 |
| `gate` | gate / barrier fence across the road (level crossing with gate) | 100 x 60 | 1.67 |

### Road layout diagrams (warning signs)

Main road 12 units wide (13 where a side road meets it), side roads 8.

| name | description | viewBox | aspect |
|---|---|---|---|
| `crossroads` | crossroads, equal widths ("+") | 60 x 80 | 0.75 |
| `crossroads-minor` | thick main road crossed by a thin minor road | 56 x 80 | 0.70 |
| `side-road-right` | side road joining from the right | 34.5 x 80 | 0.43 |
| `side-road-left` | side road joining from the left | 34.5 x 80 | 0.43 |
| `t-junction` | T-junction: the road ends at a crossing road | 64 x 62 | 1.03 |
| `y-junction` | Y-junction: the road splits into two | 52.57 x 69.1 | 0.76 |
| `staggered-junction` | side road on the left first, then on the right (`flip` for the other order) | 52 x 80 | 0.65 |
| `narrow-both` | road narrows on both sides | 44 x 73.61 | 0.60 |
| `narrow-right` | road narrows on the right | 38 x 80 | 0.47 |
| `narrow-left` | road narrows on the left | 38 x 80 | 0.47 |

### Services, objects and letters

| name | description | viewBox | aspect |
|---|---|---|---|
| `fuel-pump` | fuel pump with hose and nozzle (filling station) | 84 x 100 | 0.84 |
| `phone` | telephone handset (earpiece top-left, mouthpiece bottom-right) | 80 x 80 | 1.00 |
| `wrench` | open-ended spanner (breakdown service, mechanic) | 82 x 81.8 | 1.00 |
| `fork-knife` | fork and knife side by side (restaurant) | 52 x 100 | 0.52 |
| `cup` | cup on a saucer with steam (cafe / refreshments) | 92 x 79.1 | 1.16 |
| `bed` | bed with a person lying in it (hotel / motel) | 100 x 60 | 1.67 |
| `mosque` | dome with crescent finial and one minaret | 89 x 100 | 0.89 |
| `crescent` | red crescent (first aid), opening to the right; default fill red | 77.73 x 100 | 0.78 |
| `speed-camera` | speed camera on a pole with flash lines (radar) | 94.2 x 84 | 1.12 |
| `horn` | bulb horn / trumpet (no horns) | 96 x 53 | 1.81 |
| `toll-gate` | toll gantry over the road with a car passing under it (Salik-type toll) | 100 x 88 | 1.14 |
| `parking-p` | bold letter P (parking) | 64 x 100 | 0.64 |
| `h-letter` | bold letter H (hospital) | 64 x 100 | 0.64 |
| `info-i` | bold lowercase i (information) | 26 x 100 | 0.26 |

## 6. Arrow catalogue (`SignKit.arrow(kind, opts)`)

Arrows are built from a centre line (straights and circular arcs) turned into one filled outline with a
triangular head, so they stay crisp at every size and parts of one colour merge into one seamless path.
Geometry keys for `opts.p`: `sw` shaft width, `hw` head width, `hl` head length, plus the kind's own keys.

| kind | description | viewBox | aspect | default params |
|---|---|---|---|---|
| `straight` | straight arrow pointing up (ahead only); `rot` for other directions | 32 x 80 | 0.40 | sw 12.5, hw 32, hl 22, len 80 |
| `one-way` | long arrow pointing RIGHT for the rectangular one-way sign (`flip` for left, `rot: -90` for up) | 100 x 32 | 3.13 | sw 13, hw 32, hl 25, len 100 |
| `turn-left` | up, then a 90 degree turn to the left | 59.25 x 71 | 0.83 | sw 12.5, hw 32, hl 22, a 40, r 15, b 16 |
| `turn-right` | up, then a 90 degree turn to the right | 59.25 x 71 | 0.83 | sw 12.5, hw 32, hl 22, a 40, r 15, b 16 |
| `bend-left` | warning bend to the left: thick curved road line, no arrowhead | 34.69 x 65.5 | 0.53 | sw 13, hw 32, hl 22, a 34, r 24, t 78, b 8 |
| `bend-right` | warning bend to the right, no arrowhead | 34.69 x 65.5 | 0.53 | sw 13, hw 32, hl 22, a 34, r 24, t 78, b 8 |
| `bend-left-arrow` | bend to the left with an arrowhead | 54.85 x 74.79 | 0.73 | sw 13, hw 32, hl 22, a 34, r 24, t 78, b 8 |
| `bend-right-arrow` | bend to the right with an arrowhead | 54.85 x 74.79 | 0.73 | sw 13, hw 32, hl 22, a 34, r 24, t 78, b 8 |
| `double-bend-left` | double bend, first to the left, no arrowhead | 37.4 x 75.05 | 0.50 | sw 13, hw 32, hl 22, a 16, r 18, t 62, m 6, b 6 |
| `double-bend-right` | double bend, first to the right, no arrowhead | 37.4 x 75.05 | 0.50 | sw 13, hw 32, hl 22, a 16, r 18, t 62, m 6, b 6 |
| `double-bend-left-arrow` | double bend, first to the left, with arrowhead | 40.77 x 83.44 | 0.49 | sw 13, hw 32, hl 22, a 16, r 18, t 62, m 6, b 6 |
| `double-bend-right-arrow` | double bend, first to the right, with arrowhead | 40.77 x 83.44 | 0.49 | sw 13, hw 32, hl 22, a 16, r 18, t 62, m 6, b 6 |
| `straight-left` | ahead or turn left (stem up with a left branch) | 68 x 80 | 0.85 | sw 12.5, hw 32, hl 22, len 80, at 26, r 16, b 14 |
| `straight-right` | ahead or turn right | 68 x 80 | 0.85 | sw 12.5, hw 32, hl 22, len 80, at 26, r 16, b 14 |
| `left-right` | turn left or right (T shape, flat top) | 100 x 66 | 1.52 | sw 12.5, hw 32, hl 22, a 34, r 16, b 12 |
| `keep-left` | keep left: arrow pointing diagonally down-left | 58.16 x 58.16 | 1.00 | sw 12.5, hw 32, hl 22, len 76 |
| `keep-right` | keep right: arrow pointing diagonally down-right | 58.16 x 58.16 | 1.00 | sw 12.5, hw 32, hl 22, len 76 |
| `uturn-left` | U-turn to the LEFT: up on the right, over the top, head down on the left | 54.25 x 62.25 | 0.87 | sw 12.5, hw 32, hl 22, a 40, r 16, b 12 |
| `roundabout` | three arrows chasing each other ANTICLOCKWISE around a circle | 75.92 x 79.51 | 0.95 | sw 11.5, hw 28, hl 17, R 30, span 76 |
| `two-way` | right arrow UP, left arrow DOWN (`color2` colours the down arrow) | 74 x 80 | 0.93 | sw 12.5, hw 32, hl 22, len 80, gap 10 |
| `merge-right` | traffic merging from the RIGHT into the main lane (main arrow up) | 50.5 x 84 | 0.60 | sw 12.5, hw 32, hl 22, len 84, off 30, sw2 9, s1 10, r 14, t 45, s2 28.4 |
| `merge-left` | traffic merging from the LEFT | 50.5 x 84 | 0.60 | sw 12.5, hw 32, hl 22, len 84, off 30, sw2 9, s1 10, r 14, t 45, s2 28.4 |
| `chevron` | one thick chevron pointing RIGHT (sharp deviation boards; repeat it, `flip` for left) | 46 x 60 | 0.77 | sw 12.5, hw 32, hl 22, ch 60, depth 30, t 16 |

## 7. Accuracy notes and open questions

- Bends: the pure Vienna model (Germany, France) draws the bend as a plain thick curved line; UK-derived
  designs, which the UAE set follows, are often shown with an arrowhead. Both forms exist (`bend-right` and
  `bend-right-arrow`, same for double bends). Pick the one that `content/signs.json` describes for each sign.
  I could not verify the UAE form from an official image in this session.
- `crescent` orientation (opening right) is a design choice; flip it if the catalogue says otherwise.
- `children` follows the brief (older child on the left with a bag, holding the younger one's hand).
- `worker` faces left with the mound in front of him (lower left). Flip if the UAE drawing is mirrored.
- `sand-drift` and `ford` are plausible designs, not copies of a verified UAE pictogram.
- `wheelchair` follows the ISO access symbol (faces right). The UAE "People of Determination" sign may use a
  newer dynamic figure; this glyph is the classic one.
