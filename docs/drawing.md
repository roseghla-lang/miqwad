# Drawing signs, markings and concept figures

Every picture in مقود is an SVG string built from scratch in JavaScript and registered by id in
`window.Signs` (from `src/signs/kit.js`). The app shows a picture wherever that id appears: the signs
library, learn cards, quiz items, and the `fig` / `opt_figs` / `explain_fig` fields of questions and cards.

## 1. Files and owners

| file | ids | catalogue |
|---|---|---|
| `src/signs/kit.js` | bases + a few defaults (`p-stop`, `r-no-entry`, `r-no-parking`, `r-no-stopping`) | shared, do not edit |
| `src/signs/glyphs.js` | shared pictograms and arrows (`docs/glyphs.md`) | shared, do not edit |
| `src/signs/warning.js` | `w-` | `content/signs.json` |
| `src/signs/regulatory.js` | `p-`, `r-` | `content/signs.json` |
| `src/signs/mandatory.js` | `m-`, `s-`, `x-` | `content/signs.json` |
| `src/signs/info.js` | `i-`, `g-`, `t-` | `content/signs.json` |
| `src/signs/markings.js` | `mk-` | `content/markings.json` |
| `src/signs/lights.js` | `tl-`, `ls-`, `pl-`, `po-`, `ev-` | `content/markings.json` |
| `src/signs/figs.js` | `fig-shape-*`, `fig-mean-*`, `fig-shapes-family` | `content/figs.json` (groups shape, meaning) |
| `src/signs/diagrams_road.js` | concept figures of group `road` | `content/figs.json` |
| `src/signs/diagrams_car.js` | concept figures of group `car` | `content/figs.json` |

`tools/build.py` loads `kit.js`, `glyphs.js`, then every other `src/signs/*.js` in alphabetical order, each
in its own `<script>` (a syntax error drops only that file). Drawing functions run lazily when a picture is
first needed, so a file may call helpers defined in another file at render time, but it must not assume
they exist at load time.

## 2. File skeleton

```js
/* مقود: <what this file draws> (<prefixes>). Drawn from scratch, see docs/drawing.md */
(function () {
  'use strict';
  if (!window.Signs || !window.SignKit) return;
  var K = window.SignKit, C = K.C;
  function reg(id, label, fn) { Signs.register(id, function (o) { return fn(o || {}, label); }); }

  reg('w-camels', 'حيوانات على الطريق (جمال)', function (o, label) {
    return K.warn(K.glyph('camel', K.fit('warn', 'camel')), { label: label });
  });
})();
```

- One IIFE, `'use strict'`, no globals except what you deliberately export. Local helpers are fine
  (and expected): put them at the top of your file.
- `label` is the Arabic name from the catalogue; every picture carries it as `aria-label` (all bases take
  `{label}`; for a custom outline use `K.svg(inner, viewBox, label)`).
- Never throw: a drawing function that fails shows a placeholder, but test so that it never does.

## 3. SVG rules (checked by the gallery tool)

- One `<svg>` with a `viewBox`, built with the SignKit bases or `K.svg()`.
- No `id` attributes, no `<defs>`, no gradients, no `url(#...)`, no `<image>`, no `href`, no filters,
  no masks, no clip paths (many copies of the same picture share one page).
- Explicit `fill` on every `rect`, `circle`, `ellipse`, `polygon`, `polyline`, `path` (`fill="none"` plus a
  stroke for outlines) and a `stroke` on every `<line>`. `opacity` / `fill-opacity` are allowed.
- Text only through `K.text(str, x, y, size, {fill, weight, family: 'head' | 'latin', anchor})`, which sets
  the embedded fonts (Alexandria for Arabic, Space Grotesk for Latin letters and digits). Arabic text reads
  right to left automatically; use Western digits.
- Keep all ink inside the viewBox.
- Keep path data short (round coordinates to 1 or 2 decimals). A picture is typically 1 to 6 KB.

## 4. Accuracy

- UAE drives on the RIGHT, overtakes on the LEFT, roundabouts run ANTICLOCKWISE (seen from above), a U-turn
  goes to the LEFT from the leftmost lane, you signal RIGHT to leave a roundabout. Mirror images of UK or
  Indian drawings are wrong here.
- The catalogue's `draw`, `colors`, `text` and `shape` fields are the brief. Follow them. When a brief looks
  wrong for the UAE, draw the correct version and say so in your report.
- Signs: people, animals and vehicles face left (Vienna habit) unless the brief says otherwise.
- Arabic text inside a drawing follows BRIEF section 4 (no tanwin, no shadda, Western digits).

## 5. Style

### 5.1 Official signs (`w- p- r- m- i- s- g- t- x-`)
Use the SignKit bases and colours (`K.C.red #C8202A`, `blue #1F5AA6`, `green #1E7B47`, `brown`, `orange`,
`yellow`, `black #151515`, `white`). Signs have their white rim and no background, like the real thing.
Glyphs: `K.glyph(name, K.fit(base, name))`, arrows: `K.arrow(kind, ...)` (docs/glyphs.md). Text on signs:
at least 9 units high in a 100 unit sign so it survives at 96 px.

### 5.2 Top-down road pictures (`mk-`, top-down `ev-`, group `road` figures)
Seen from above, north up, our car usually at the bottom moving up the screen.

| thing | value |
|---|---|
| tile | square `viewBox="0 0 100 100"` for catalogue items; `0 0 160 120` for concept figures |
| ground | one rounded rect over the whole viewBox, `rx` 8, fill `#353C47` (city pavement) or `#C9B48A` (desert sand) |
| asphalt | `#2A2F37` (shoulder / older asphalt `#22262D`) |
| lines | white `#F2F2EE`, yellow `#F2C230`; lane width about 3.6 m, line width about 0.15 m, broken lines 3 m dash / 6 m gap unless the brief says otherwise |
| kerb | `#9AA3AE` thin band between asphalt and pavement |
| other cars | rounded rectangle body 4.6 x 1.95 m (keep that ratio), darker outline, dark glass `#1B2230` windscreen near the FRONT and rear window, small headlights `#F4F1DE`, tail lights `#8E1C1C`; body colours `#3F6FB5` blue, `#C0453A` red, `#B8BEC8` silver, `#4A505A` dark grey, `#3C8A5E` green |
| our car | same shape, body `#F4F2EA`, outline gold `#D9B978` about 0.3 m wide, optional faint gold halo |
| bus / truck / ambulance | same method, longer bodies; ambulance white with red stripe and a red + blue light bar |
| pedestrian | small circle head + oval shoulders from above, `#EAE6DB` or a clothing colour |
| path arrows | our path gold `#D9B978`, a correct move green `#8CC8A0`, a wrong move red `#DE9090` plus a red X (two crossed strokes `#E0564F`), other road users light grey `#97A1B4`; stroke 1.5 to 2.2 units, dashed `4 3` for a planned path, a solid triangular head |
| indicators | small amber `#FFB21E` dots at the front and rear corners on the signalling side, with 2 or 3 short flash strokes |
| measures | gold dimension line with end ticks and a label (`15 م`, `1 م`) |

Keep the subject big: crop the road so the marking or the manoeuvre fills most of the tile; no scenery
clutter. Catalogue items (`mk-`, `ev-`) carry no text at all (a quiz shows the picture and asks what it
means). Concept figures may carry at most 3 short Arabic labels, at least 8 units high in the 160 x 120
viewBox, on a small dark pill (`#0D131E`, opacity 0.85) when they sit over a busy area.

### 5.3 Front views (`tl- ls- pl- po-`, front or rear `ev-`)
Square `viewBox="0 0 100 100"` with a rounded background panel (`rx` 8) so black housings stay visible on
the app's dark panel: dusk sky `#2B3445` (day) or night `#141A26` with a lighter horizon band. Signal
housings `#15181D` with a `#5A6475` outline, lamps: red `#E5352B`, amber `#F5A623`, green `#2FC36B`; unlit
lamps `#2A2F37` with a faint tint of their colour. A lit lamp gets a soft halo (a larger circle of the same
colour at opacity 0.25). Flashing = 6 to 8 short radiating strokes around the lamp.

### 5.4 Concept figures (`fig-` of groups road and car)
`viewBox="0 0 160 120"` (4:3) unless the subject clearly needs another ratio (keep between 16:10 and 1:1).
A rounded background (`rx` 10, fill `#141C2A`, or the road ground of 5.2 for top-down pictures). Ink
`#EAE6DB`, accents gold `#D9B978`, good `#8CC8A0`, bad `#DE9090` / `#E0564F`, water `#4A8FD8`, night sky
`#0B1019`. Concept figures must not look like official signs: no red-ring circles, no warning triangles
as frames (a warning triangle object on the road is fine). They must read at 120 px wide and stay clear at
300 px.

## 6. Checking your drawings

```
python3 tools/sign_gallery.py <outdir> --only w- --files warning.js
python3 tools/sign_gallery.py <outdir> --only w-bend --detail w-bend-right,w-bend-left
python3 tools/sign_gallery.py <outdir> --group road --files diagrams_road.js      (concept figures by group)
```

- It writes `sheet_01.png`, `sheet_02.png`, ... (12 pictures per sheet: big on the dark app panel, then 64
  and 36 px on dark and 64 px on light grey), plus `report.json`, and prints every problem (see section 3).
- LOOK at every sheet with the Read tool, then fix what looks wrong: misplaced symbols, text that touches a
  border, wrong direction, anything unreadable at 64 px. `--detail` saves a 560 px view of chosen ids.
- The run must end with `0 with problems`, no console messages and none of your ids missing.
- Do not run `tools/build.py` or `tools/app_smoke.py` while other agents are working (they write shared
  files); the lead builds and runs the app.
