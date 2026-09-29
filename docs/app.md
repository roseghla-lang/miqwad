# مقود app shell (`src/app.js`, `src/styles.css`, `src/body.html`)

The shell is one classic script (an IIFE, no modules, no framework, no network). It reads
`window.DATA` (built by `tools/build.py` from `content/*.json`) and talks to the optional modules
`window.Signs`, `window.Scenes` and `window.Yard`. Every call to those modules is guarded: a missing
or throwing module turns into a calm "قيد التجهيز" state, never a broken page.

## 1. Files and build

| file | role |
|---|---|
| `src/body.html` | `<div id="app" class="app" dir="rtl" lang="ar">` plus a boot splash the app replaces |
| `src/styles.css` | all styles; tokens from BRIEF section 7 on `:root` (single dark look, `color-scheme: dark`) |
| `src/app.js` | state, content index, quiz engine, spaced repetition, screens, exams, gamification |
| `content/sample_*.json` | demo content so the app works before real files exist (`--samples` only) |
| `tools/app_smoke.py` | Playwright end-to-end smoke test (section 9) |

`python3 tools/build.py` (real content only) or `python3 tools/build.py --samples` (real files win,
samples fill the gaps: `sample_curriculum.json`, `sample_q_demo.json`, `sample_signs.json`,
`sample_markings.json`, `sample_exams.json`, `sample_scenarios_demo.json`).

The same code runs as `dist/index.html` and as the artifact fragment `dist/artifact.html`: the script
sets `lang="ar"` and `dir="rtl"` on `<html>`, and the CSS sets explicit dark `html, body` backgrounds,
`[hidden]{display:none!important}`, safe-area padding on `:root`, a sticky header at
`top: env(safe-area-inset-top)` and a fixed bottom tab bar with `env(safe-area-inset-bottom)`.
No `alert/confirm/prompt/print/window.open/<a download>`: confirmations are in-page sheets.

## 2. Architecture inside `app.js`

```
utils -> storage (S) -> content index (IX) -> filters -> item keys -> curriculum (CUR)
      -> Leitner SRS -> distance / streak / titles / badges -> sounds -> icons
      -> components (lane bar, speedometer gauge, UAE exit sign, sign tile, confidence badge)
      -> shell (header + bottom tabs on phones, side rail >= 960px) -> router -> sheet / toast / celebration
      -> screens: home, path, lesson, play, signs, flash, arena, yardRun, yardGuide, yard,
                  journey, exam, examRun, examResult, review, settings, badges, sources
      -> keyboard -> boot
```

* **Router**: in-memory stack (`go(name, params)`, `tab(name)`, `back()`); no hash or history API
  (artifact-safe). Each screen is `{render(params) -> html, mount(root), key(event), focus, tab}`.
  `focus` screens (lesson, quiz, exam, flashcards, yard) hide the phone header and tab bar.
* **Events**: one delegated `click` listener on `#app`; elements carry `data-act` / `data-arg`
  (`ACT[name](arg, el, event)`), inputs use `data-in` (input) and `data-ch` (change).
* **Rendering**: screens return HTML strings; the quiz updates answered states in place (no re-render),
  sign SVGs are cached per id and lazily rendered with `IntersectionObserver` in the library grid.
* **Keyboard** (laptop): `1..4` choose (Arabic-Indic digits work too), `Enter`/`Space` next,
  `Esc` closes a sheet or goes back, arrows move between learn cards and exam questions
  (RTL: left = next), `F` flags an exam question, `Space` flips a flashcard.
* **Sounds**: WebAudio tones created only after the first pointer/key gesture; toggle in settings.
* **Motion**: `prefers-reduced-motion` or the in-app switch (تلقائي / خففها / كاملة) adds `.rm`.
* **Test hook**: `window.Miqwad = {version, go, tab, back, flush, state(), screen(), content(), peek(), drill(keys), yardCtl()}`
  (`peek()` exposes the current question's right option and `yardCtl()` the mounted simulator controller;
  both are for tests only).

## 3. State (localStorage `miqwad.v1`)

Every access is in try/catch; when storage is blocked the state lives in memory and settings shows a
banner asking to export the code. Saves are debounced (450 ms) and flushed on `pagehide` and when
the page is hidden. `MIGRATIONS[n]` upgrades schema `n` to `n + 1`; `migrate()` also fills missing keys.

```js
{
  v: 1, created: ms, onboarded: bool,
  profile: { emirate: 'dubai'|'sharjah'|'both', examDate: 'YYYY-MM-DD'|'', goal: 20, sound: true,
             motion: 'auto'|'reduce'|'full', text: 1 },          // text = root font scale 0.85..1.3
  items:   { '<key>': { b: box 1..5, d: due day number, n: answers, k: right, x: wrong, l: last day } },
  lessons: { '<lessonId>': { s: stars 0..3, best: 0..1, n: plays, d: day, p: 1 if challenge passed } },
  units:   { '<unitId>': 'YYYY-MM-DD' },        // completed units (celebrated once)
  learned: { '<lessonId>': 1 },                 // learn phase seen
  days:    { 'YYYY-MM-DD': { n, k, km, a } },   // answers, right answers, km, a=1 finished a lesson/exam/yard
  km: number, tc: { '<topic>': right answers }, bestCombo: number,
  exams: [ { id, at, title, pid, em, n, correct, pct, pass, passed, secs, minutes, auto,
             topics: { '<topic>': [right, total] }, rows: [ { s: itemSpec, a: answerIndex|-1 } ] } ],
  activeExam: { id, pid, title, em, minutes, pass, start, end, specs: [itemSpec], ans: [], flags: [], cur } | null,
  yard:  { '<exerciseId>': { best, pass, tries, learn, d, last: { mode, passed, score, at } } },
  road:  [ { at, score, passed, crit, minor, n } ],   // examiner rounds
  badges: { '<badgeId>': 'YYYY-MM-DD' },
  last: { lesson, at } | null                         // lesson in progress, for "كمل من وين وقفت"
}
```

A day number is `floor((local time) / 86400000)`. Exams keep full rows for the newest 15 records,
and an open exam survives a reload (the timer is `end` in wall-clock time; an expired exam is
submitted automatically when opened).

**Export / import**: `MQZ1.` + base64 of gzip JSON (`CompressionStream`), or `MQ1.` + base64 of UTF-8
JSON when compression is unavailable. Import accepts both (and bare base64 JSON), validates the
shape, confirms in a sheet, then replaces the state. Copy uses `navigator.clipboard.writeText` inside
the click and falls back to selecting the textarea.

## 4. Item keys and quiz item types

| key | source | quiz types |
|---|---|---|
| `q:<id>` | bank question (`DATA.banks[*].questions`) | text MCQ (options shuffled; optional pictures `fig` / `opt_figs` / `explain_fig`, see below; optional `scene`) |
| `sign:<id>` | `DATA.signs.signs` | sign → meaning (4 names), meaning → sign (4 drawings) |
| `mk:<id>` | `DATA.markings.items` | marking → meaning |
| `sc:<id>` | `DATA.scenarios` | scenario choice, scenario tap (hotspots) |

* A sign or marking is quizzable only when `Signs.has(id)` is true (undrawn ones still appear in the
  library and learn cards with a shape-aware "pending" outline). Distractors come from `confuse`, then
  the same category, then the same shape, then anything, never repeating a name; meaning → sign
  needs 3 drawn distractors or it falls back to sign → meaning.
* `tap` scenarios need `Scenes`; without it they are skipped. Choice scenarios work without `Scenes`
  (the scene area shows "المشهد المرسوم قيد التجهيز").
* Every item carries `spec = {k, t, o}` (key, type, option order) so an exam can be rebuilt
  identically after a reload.

**Pictures on questions and learn cards.** Ids are signs (`DATA.signs`), markings (`DATA.markings`) or
concept figures (`DATA.figs` from `content/figs.json`: sign shapes, "meaning inside the shape" badges,
top-down rule diagrams, car and safety pictures). Only drawn pictures show; an undrawn id is skipped.

| field | where it shows |
|---|---|
| `question.fig` (1 to 3 ids; legacy `signs` / `sign` count too) | under the question text: one = big frame (square for signs, 4:3 for diagrams), several = a row of tiles, no captions |
| `question.opt_figs` (one id or `null` per option, in `options` order) | inside the option buttons, which become a 2-column grid (4 on wide screens) of picture + text; follows the shuffle; dropped when fewer than 2 are drawn |
| `question.explain_fig` (1 to 3 ids; also on scenarios) | in the feedback after answering, in the exam review and the question sheet, with captions (`name`) |
| `card.fig` (1 to 4 ids) | top of the learn card with captions: one = big; a concept figure first = big with the rest in a row under it; signs only = one row |

A picture in `fig` must never give the answer away (a rule diagram that shows the right move belongs in
`explain_fig`). `python3 tools/figs.py check` validates every reference and prints coverage per bank;
`python3 tools/figs.py apply mapping.json` adds pictures from a mapping file (see its header).

## 5. Spaced repetition (Leitner)

Boxes 1..5 with intervals 0, 1, 3, 7, 16 days. A new item answered right goes to box 2; an item
answered right on or after its due day moves up one box; answering right before it is due changes
nothing; any wrong answer sends it to box 1, due today ("ضفناها للمراجعة"). A correct but guessed
answer can be pushed to box 1 by hand ("خمنت؟ ضيفها للمراجعة"). Mastered = box ≥ 3.
Mistakes = items in box 1. Due = box ≥ 1 and due day ≤ today (review sessions take 20, lowest box first).
Session picking (`orderByNeed` + `balanced`): due items first, then unseen, then the rest (lowest box
first), keeping the mix of item kinds proportional to the pool. Unanswered exam questions are not graded.

## 6. Readiness gauges (home)

Item weight `w = 1 + 0.25 × (level − 1)`; strength by box `[0, .25, .55, .8, .92, 1]` (0 = never seen);
`K(keys) = Σ w·strength / Σ w`.

* **امتحان دبي / امتحان الشارقة**: keys = questions for that emirate (`exam` includes it or is empty)
  except topics `yard` and `roadtest`, plus drawn signs and markings.
  `M` = mean score of the last 3 mock exams for that emirate (or `both`).
  readiness = `100 × (M ? 0.65 K + 0.35 M : 0.85 K)` (no mock exam caps it at 85).
* **الساحة**: `Y` = mean over `Yard.exercises` of (test passed 1, else max(learn 0.35 / tried 0.15,
  0.6 × best/100)); readiness = `100 × (0.8 Y + 0.2 K(yard questions))`, or `50 × K` without a simulator.
* **الطريق**: base = `0.6 K(scenarios) + 0.4 K(road topics)` (road topics only when there are no
  scenarios); `E` = mean of the last 3 examiner rounds (a failed round counts at most 0.5);
  readiness = `100 × (E ? 0.7 base + 0.3 E : 0.85 base)`.

Tapping a gauge opens a sheet that shows every component.

## 7. Curriculum and filters

`DATA.curriculum.units[]` → `{id, exit, title, subtitle, color: blue|green|brown|orange, lessons[]}`.
Lesson kinds:

* `lesson`: `learn: {cards, signs, markings}` filters, `practice: {questions, signs, markings, scenarios, count}`.
  Learn cards show in order cards → signs → markings; practice picks `count` items (both sign
  directions are added when the pool is small). A lesson whose practice pool is empty but has learn
  cards completes after reading.
* `yard`: `exercise: '<Yard exercise id>'` opens the simulator (learn mode); without a simulator it opens
  the written guide from `exams.json yard_guides` with the same id ("قريتها وفهمتها" completes it).
* `challenge`: `from: [lessonIds]`, `count`, `pass` (fraction). Stars only when passed.

Filter semantics (each resolved once and cached per emirate):

* `cards` / `questions`: `{banks: [], topics: [], ids: [], levelMax, levelMin, level}`: ids are always
  included; otherwise an item must match the listed banks (if any) AND topics (if any). **A filter with
  no ids, banks or topics selects nothing** (so `{"topics": []}` means "none").
* `signs` / `markings`: `{cats: [], ids: [], levelMax, levelMin, level}`.
* `scenarios`: `{topics: [], ids: [], types: ['choice','tap'], levelMax}`.
* `levelMax: 0` or missing means no cap. Questions and scenarios whose `exam` list does not include
  the learner's emirate are left out (emirate "الاثنين" keeps everything).

Stars: ≥ 95% → 3, ≥ 80% → 2, ≥ 50% → 1. A unit is complete when every playable lesson has a star;
completion plays the road-lines celebration once and adds 5 km. Without `curriculum.json` the app builds
a fallback path (basics topics → sign categories in lessons of 12 → marking categories → the other
topics in units of 4, each unit closed by a challenge).

`python3 tools/curriculum.py [--emirate dubai|sharjah]` resolves every filter the same way and prints the
learn and practice counts per lesson, any unknown ids or too-small pools, and the content no lesson reaches.

## 8. Mock exams, arena, yard, gamification

* **Presets** come from `DATA.exams.presets` (defaults if missing). Accepted fields: `count|questions|n`,
  `minutes|duration`, `pass_ratio` (preferred) or `pass` (fraction, percent or a count ≤ count) or
  `passCount|passPct`, `emirate`, `hazard` (count of hazard items kept apart from the mix), `mix`.
  `mix` is an object (`{signs: .4, rules: .5, hazard: .1}`; fractions or counts; keys `signs`,
  `markings`, `questions|rules|theory`, `scenarios`, `hazard`, or any topic key) or an array of
  `{type, count|share, topics, cats, banks, levelMax}`. Shortfalls are filled from other pools.
  Custom exam: count 5..60, minutes 5..60, pass 50..100%.
* **Arena** (مواقف): 11 topic groups; drawn scenarios first, then written questions of the same topics.
  **جولة الفاحص**: 12 random scenarios (questions fill in); wrong answers on priority, roundabouts,
  pedestrians, school bus, emergency vehicles, lights, police or hazard topics are critical (or set
  `critical: true|false` / `severity: 'critical'|'minor'` on a scenario). Score = 100 − 10 × minor;
  pass = no critical and score ≥ 70. The result is an examiner's paper form with a stamp.
* **Yard**: `Yard.exercises` (array or map) grouped by emirate; `Yard.mount(el, {exercise: id,
  mode: 'learn'|'test', reducedMotion, sound, emirate, onFinish(result)})` (the result's own `mode` and
  `exercise` win, since the simulator has its own switches); free practice areas (`id: 'free'`, or
  `free/practice: true`, or `scored: false`) get no test button and stay out of readiness; the result may use
  `passed|pass|success|ok`, `score|points`, `mistakes|errors|faults`. Guides from `exams.json`
  (`guides`, `yard_guides`, `road_guide`) show on the yard, arena and "مشوار الرخصة" screens;
  the journey screen renders `exams.emirates.<em>` (process, theory, yard, road, specific).
* **Distance**: right answer = 0.5 + 0.25 × (level − 1) km; first finish of a lesson +2, challenge +3,
  unit +5, passed mock exam +5, examiner pass +5, yard run +1 (test pass +3).
  Titles at 0 / 25 / 150 / 400 / 800 km: متدرب، ماسك الدركسيون، جاهز للساحة، جاهز للطريق، سائق واثق.
  Streak = consecutive days with ≥ 5 answers or a finished lesson / exam / yard run.
  18 badges (e.g. ملك الدوارات after 30 right roundabout answers).

## 9. Adding content

1. Drop JSON into `content/` using BRIEF section 5 schemas; run `python3 tools/build.py`.
2. New question bank `q_<name>.json` appears everywhere automatically (library of topics, arena,
   exams, readiness); reference it in `curriculum.json` with `banks: ["<name>"]` or by `topics`.
3. New sign drawings: register with `Signs.register(id, fn)`; the app picks them up at load
   (quizzes, flashcards, meaning → sign options). Markings use the same registry with their `mk-`,
   `tl-`, `po-`... ids, and so do concept figures (`fig-` ids listed in `content/figs.json`). Conventions,
   file owners, style and the check tool (`tools/sign_gallery.py`) are in `docs/drawing.md`.
4. Scenarios: `content/scenarios_<name>.json`; `type: 'choice'` needs `options` and `answer`,
   `type: 'tap'` needs `hotspots` and `answer` (hotspot id or ids). The app mounts
   `Scenes.mount(el, scenario, {onTap, hotspots, reducedMotion, autoplay: true})` (the engine plays the
   intro itself; a tap on empty ground during the intro is ignored), then after the answer marks hotspots
   (`mark`, `revealHotspots`) and plays `'solution'`; the feedback offers "شوف الحل بالمشهد" to scroll back
   and replay it. The question text sits above the picture, as on the exam screens.
5. Sources: every file's `sources` map is listed on the sources page; items show a confidence badge
   ("مصادر موثوقة" for `high`, "مصدر واحد" for `medium`) that opens their source titles.

## 10. Testing

```
python3 tools/build.py --samples
python3 tools/app_smoke.py --both                 # mobile 390x844 and desktop 1440x900
python3 tools/app_smoke.py --shots tools/out/smoke --allow "Unexpected end of input"
```

The smoke test clears storage, checks the welcome state and 4 gauges, plays the first lesson (a right
answer, a wrong answer, a keyboard answer), opens the signs library, a detail sheet (Esc closes it),
Arabic search, flashcards, a full mock exam (answer, flag, grid, in-page submit confirmation, result),
review boxes, exports the progress code, imports it back, reloads and checks progress persisted; it also
fails on horizontal overflow and on any console error or page error (`--allow REGEX` ignores known ones).
