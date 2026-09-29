# Traffic sign catalog: research notes (signs agent)

Owner: signs agent. Date: 2026-09-29.
Outputs:
- `content/signs.json`: 166 signs (priority 6, warning 54, prohibitory 31, mandatory 20, information 24,
  services 2, guide 10, temporary 10, supplementary 9), 9 categories. Confidence: 146 high, 20 medium.
  Levels: L1 24, L2 48, L3 52, L4 37, L5 5.
- `content/q_signbasics.json`: module `signbasics`, topic `signs-basics`, 15 cards, 32 questions
  (answer positions balanced 8/8/8/8).
- Checker used: scratchpad `check.py` (JSON load, unique ids, every `confuse` id exists, prefix matches `cat`,
  allowed shapes/levels/confidence, `src` ids exist, no tanwin/shadda/diacritics, no en/em dash or tatweel,
  no trailing full stop, Western digits, no clause opening with يمنع/يسمح/يحظر/يعاقب/يطبق/يعتبر/يلزم/يجوز).

## 0. Method and tool limits

- Shell internet is blocked (403 on drivedubai.ae). All reading went through WebFetch, which returns a model
  summary with short quotes, not raw text. Long PDFs are cut: the RTA LMV handbooks (2021 and 2024 English,
  2021 Arabic) stop before the Road Signs part. Wikipedia raw pages, Wikimedia Commons and upload.wikimedia.org
  are cache-only, so no SVG or image of a UAE sign could be inspected. The shared web-search budget
  (200 calls for all agents) ran out mid-task; after that only already-known URLs were fetched.
- Consequence: sign EXISTENCE and NAMES come from official/institute text (RTA handbooks, RTA booklet,
  EDI and Drive Dubai charts). Several VISUAL details (colours of chevrons, exact pictograms) could not be
  confirmed from an image. Those are listed in section 4 so the drawing agents and the lead know.
- The EDI 2026 chart (S5) only exposes the text of its new sections; the rest of it is image-only.
- The official Arabic 2012 handbook (S20, flipbook) exposes text for the regulatory intro (p.99), the
  mandatory and control-sign captions (p.101) and the speed table; the prohibitory/warning pages are
  image-only, so Arabic names for those groups come from the Drive Dubai Arabic chart (S3).

## 1. Sources

| id | title | publisher | date | url |
|---|---|---|---|---|
| S1 | Light Motor Vehicle Handbook, 3rd ed. (English), Road Signs part | RTA Licensing Agency (mirror copy) | 2012-01 | https://russiadubai.com/upload/iblock/ac6/ac6fa71db851d0137a784bd80278acff.pdf |
| S2 | Driving Safely in Dubai, 1st ed. (sign groups) | RTA Licensing Agency | undated | https://licensing.rta.ae/handbook/DrivingSafelyInDubaiEN.pdf |
| S3 | Signal Charts (Arabic) | Drive Dubai (RTA-licensed institute) | 2026-07 | https://www.drivedubai.ae/public/uploads/downloads/20260727111506Signal-Charts-Arabic.pdf |
| S4 | Road Signs, Road Markings and Traffic Signals, signal chart (English) | Emirates Driving Institute | 2019-11 | https://edi-uae.com/public/uploads/downloads/20191126120000English-Signal-Chart.pdf |
| S5 | Guidance Chart: Road Signs, Road Markings and Traffic Signals (English), 2026 ed. | Emirates Driving Institute | 2026-03 | https://edi-uae.com/public/uploads/downloads/20260303120751Signal-Chart-English.pdf |
| S6 | Ministerial Decision 130/1997, Executive Regulations of the Federal Traffic Law (Art. 25 to 28, 33) | UAE Legislation portal | 1997-03 (listed in force) | https://uaelegislation.gov.ae/ar/legislations/1020/download |
| S7 | Federal Decree-Law 14/2024 on Traffic Regulation (Art. 1, 4, 7) | UAE Legislation portal | 2024-09 (in force 2025-03-29) | https://uaelegislation.gov.ae/ar/legislations/2598/download |
| S8 | LMV Handbook 7th ed. (English), tram section | RTA (copy hosted by EDI) | 2016-01 | https://edi-uae.com/public/uploads/downloads/20190724133013RTA_Handbook_-_Light_Motor_Vehicle_(LMV)_-_English.pdf |
| S9 | Abu Dhabi Work Zone Traffic Management Manual, Issue 1 | DoT Abu Dhabi (copy) | 2014-02 | https://pdfcoffee.com/--6281-pdf-free.html |
| S10 | Abu Dhabi MUTCD TR-511, 2nd ed. (supporting only, text truncated) | DoT Abu Dhabi via QCC | 2020-09 | https://jawdah.qcc.abudhabi.ae/en/Registration/QCCServices/Services/STD/ISGL/ISGL-LIST/TR-511.pdf |
| S11 | Route Numbering System Policy TR-538 (E-route emblem) | DoT Abu Dhabi via QCC | 2018-01 | https://jawdah.qcc.abudhabi.ae/en/Registration/QCCServices/Services/STD/ISGL/ISGL-LIST/TR-538.pdf |
| S12 | Road signs in the United Arab Emirates (list based on the Abu Dhabi MUTCD) | Wikipedia (cached) | accessed 2026-09 | https://en.wikipedia.org/wiki/Road_signs_in_the_United_Arab_Emirates |
| S13 | Dubai RTA installs 210,000 road signs (colour coding) | Gulf News | 2025-11 | https://gulfnews.com/uae/transport/dubai-rta-installs-210000-road-signs-to-boost-safety-and-cut-accidents-1.500359277 |
| S14 | Guide to understanding Dubai's colour-coded street signs | Khaleej Times | 2023-07-30 | https://www.khaleejtimes.com/uae/transport/guide-to-understanding-dubais-colour-coded-street-signs |
| S15 | Reading Dubai's road signs (E falcon emblem, D fort emblem) | Gulf News | 2006-09-08 | https://gulfnews.com/uae/transport/reading-dubais-road-signs-1.254255 |
| S16 | Speed limits in the United Arab Emirates | Wikipedia (cached) | accessed 2026-09 | https://en.wikipedia.org/wiki/Speed_limits_in_the_United_Arab_Emirates |
| S17 | Decoding RTA road signs | HiDubai Focus | 2023-06-12 | https://focus.hidubai.com/decoding-rta-road-signs/ |
| S18 | Roadways: E routes, Salik, Darb | u.ae | undated | https://u.ae/en/information-and-services/transportation/roadways |
| S19 | Low visibility: fog and sandstorm rules (Abu Dhabi reduced limit on electronic boards) | Gulf News | 2022-03-11 | https://gulfnews.com/uae/transport/uae-low-visibility-on-the-road-follow-these-safety-rules-for-driving-in-fog-sandstorms-1.86313361 |
| S20 | كتيب المركبات الآلية الخفيفة، الطبعة 3 (Arabic): p.99 regulatory intro, p.101 captions, speed table, p.84 to 85 bus lanes | RTA Licensing Agency (pubhtml5 flipbook of the rta.ae PDF) | 2012-01 | https://pubhtml5.com/plkd/rioj/basic/51-100 |

Hints only (not cited in JSON): Grokipedia UAE road signs page (AI-written, used only to find the EDI chart,
the Drive Dubai PDFs and other URLs), theorytest.ae Sharjah Arabic signs test (practice site), blogs
(roadreadyuae, ezhire, trinityrental, propertyfinder, pitstoparabia, hertz, binyaber).

## 2. Key findings used

1. Sign families (RTA, S1 and S20 p.99): regulatory signs "تستعمل لتنظيم أفعال مستعملي الطريق", split into
   control signs (priority / direction), mandatory signs ("تبين لمستعملي الطريق ما يجب عليهم فعله", p.101),
   prohibitory signs and parking-control signs. Warning signs: advance warning, hazard markers, diagrammatic
   warning signs. Guide signs, route-finding, advance guide, exit direction signs (S4).
2. Official RTA Arabic captions (S20 p.101): الوقوف إلزامي (STOP); يجب عليك عدم دخول هذا الشارع (no entry);
   يجب عليك إفساح الطريق (إعطاء أولوية المرور); يجب عليك إفساح الطريق للمشاة; يجب أن تسير بهذا الاتجاه;
   يسمح بالمرور من الجهتين; يجب أن تسير باتجاه اليمين فقط; استمر في السير إلى الأمام فقط; الزم اليسار;
   الزم اليمين; دوار. سر باتجاه الأسهم; الحد الأدنى للسرعة 60 كم/الساعة (طريق سريع). Names were kept close
   to these but rewritten where the brief's style rules require it (for example يسمح بالمرور من الجهتين became
   المرور مسموح من الجهتين to avoid the passive-looking verb).
3. Order of authority: Executive Regulations Art. 28 (S6): instructions and signals of police and traffic
   officers take priority over traffic rules and over traffic lights, road signs and traffic lines. RTA (S1):
   "the only exception is when a police officer is directing traffic and he must be obeyed". Decree-Law 14/2024
   Art. 4 (S7): road users must observe traffic signs and obey members of the traffic control authority.
   Art. 1 defines traffic signs to include electronic signs; Art. 7 bans placing any traffic sign without the
   licensing or traffic control authority's approval.
   NOT verified: a UAE text stating the full chain "traffic lights > signs > road markings". The JSON only
   teaches "police first" and "temporary work-zone devices first inside a work zone".
4. Temporary signs: Abu Dhabi WZTMM (S9): yellow is reserved for work zones; all TCDs unique to work zones
   have a yellow background with black and/or red borders/symbols; misleading permanent markings should be
   removed. Dubai: HiDubai (S17) "yellow boards signify caution". A rental blog says orange (hint only).
   Used: yellow, with a note that orange also appears. Dubai's own Work Zone Traffic Management Manual is
   cited as binding by Dubai Administrative Resolution 273/2025 Art. 15 but its text was not reachable.
5. Guide colours in Dubai (S13 2025, S14 2023): blue = federal E routes between emirates (falcon emblem),
   green = Dubai D routes and areas (fort emblem), white = street and area names, brown = tourist and
   commercial destinations. E-route emblem (S11, Abu Dhabi standard): blue shield outline of the federal seal
   with gold numbering.
6. Speed limits (S20, RTA Arabic 2012 table): parking areas 25, single urban roads 40, dual urban roads 60 to
   80, rural roads 100, highways 120 light / 80 heavy, minimum 60. S6 Art. 33 also names 40 in residential
   areas. S16: Abu Dhabi has 140 km/h roads. Drive Dubai (S3): "الحد الأقصى للسرعة 120 والحد الأدنى 60 على
   الطريق السريع".
7. New Dubai signs in the 2026 EDI chart (S5): No Delivery Motorbikes; delivery motorbikes not permitted in
   the two leftmost lanes; Dead End (warning group); Crosswind ahead; A road may be closed by a gate ahead;
   Sand Dunes Ahead; Maximum length 15 m; HOV lane; lane reserved for cyclists; road reserved for
   construction vehicles; authorized vehicles only; cyclists must dismount; Bus/Taxi lane begins/ends.
8. Trams (S8): tram-only road sign, tram crossing ahead, tram or railway crossing to the right/left,
   single/multiple tram line diagrams; "All users of the road shall give priority to the movement of the Tram
   in the Tram Right of Way".
9. Salik (S1, S18): electronic toll, tag on windscreen, no barriers; Abu Dhabi Darb reads the plate.
   Tariffs are not in the JSON (they changed over time).
10. Bus lanes (S20 p.84 to 85, 2012): solid yellow lines on both sides, private cars not allowed (2012 fine
    AED 600, not used). The "red surface" of Dubai bus lanes was not confirmed by my reading, so it is not in
    the JSON.
11. Cyclists (S2): leave at least 1.5 m when passing a cyclist.

## 3. Decisions

- IDs: followed the brief (`r-speed-80` style). Reused the ids already in `sample_signs.json` and the kit
  where the sign is real: `p-stop`, `p-give-way`, `r-no-entry`, `r-no-parking`, `r-no-stopping`,
  `r-no-overtaking`, `r-no-u-turn`, `r-no-left-turn`, `w-bend-right`, `w-bend-left`, `w-roundabout-ahead`,
  `w-pedestrian-crossing`, `w-children`, `m-keep-right`, `m-roundabout`, `i-one-way`, `i-dead-end`,
  `s-hospital`, `t-road-works`. The sample's `r-speed-limit-80` became `r-speed-80`.
- `p-priority-road` / `p-end-priority-road` are NOT in the catalog: no UAE source lists the priority-road
  diamond (not in the RTA charts, not in the UAE list S12). The kit's pre-registered drawing is harmless.
- "No parking" and "No waiting" appear as two items in the institute charts; merged into `r-no-parking`
  (blue disc, red ring, one red bar) because the driver's action is the same. `r-no-stopping` = red X.
- The RTA chart's "Animals" sign is catalogued as `w-camels` (one-hump camel), the only animal in S12's UAE
  list. Name shows both: حيوانات على الطريق (جمال).
- Road works exists only as `t-road-works` (yellow interior), not as a separate white warning sign.
- Lane-closure signs from the RTA advance-warning group (right/left/two lanes closed, diversion to opposite
  carriageway) are catalogued under `t-` with yellow backgrounds because they are work-zone signs.
- Services: only hospital and airport are confirmed by UAE sources; the rest are Unverified (section 5).
- Speed sign `text` uses Western digits without units (no source shows Arabic-Indic digits on UAE limits).
  Dimension signs use illustrative values (4.5 م, 2.5 م, 15 م from S5, 10 t, 8 t).
- Question bank: no "what does this sign mean" items; questions teach shape/colour logic, plates,
  authority order, temporary-sign precedence, guide colours, route numbers, electronic signs, tram priority.
  Orange is never used as a wrong option for the temporary-colour question.

## 4. Visual details NOT confirmed from an image (drawing agents: read before drawing)

The `draw` text follows the Vienna/right-hand-traffic logic that the UAE uses, but these points were not
seen on a UAE image:
1. `p-give-way`: drawn plain (no text). Whether UAE give-way signs carry أفسح الطريق / GIVE WAY text inside:
   not verified either way.
2. `r-no-overtaking`: red car LEFT, black car RIGHT (overtaking is on the left). Same logic for
   `r-no-overtaking-trucks` (red lorry left).
3. `p-give-way-oncoming` (black down-arrow left, red up-arrow right) and `p-priority-over-oncoming`
   (white up-arrow right, red down-arrow left).
4. Vehicle/pedestrian prohibitions drawn WITH a red slash (UAE photos in memory); Vienna/UK versions have
   no slash. `r-no-overtaking` has no slash.
5. Chevrons and hazard marker: black on yellow.
6. `m-go-this-way`, `i-one-way`, `i-tunnel`, `i-freeway-start/end`, lane diagrams (`i-lane-*`), bus lane
   start/end, `i-tow-away`, `i-taxi-stand`, `g-exit`, `g-exit-countdown` (3/2/1 stripes), `g-lane-drop`,
   `t-lane-closed-*`, `t-contraflow`, `t-diversion` (text تحويلة DIVERSION): layouts are simplified.
7. `w-sand-dunes`, `w-crosswind` (red/white windsock), `w-gate-ahead`, `w-soft-verges`, `w-merge-right`,
   `w-staggered-junction` orientation, `i-lanes-5-to-4` (right lane merges), `r-no-hazardous` (tanker with
   flame), `r-no-delivery-motorbikes` (box behind rider), `r-no-quad-bikes`, `r-speed-by-vehicle`.
8. `g-e-route` colours (blue falcon shield, gold numbers from the Abu Dhabi standard S11) and `g-d-route`
   (green fort emblem, white numbers).

## 5. Unverified (kept out of the JSON)

- Priority road and end of priority road (diamond).
- End of speed limit, end of all restrictions (grey number with black band): no UAE source.
- Road closed / no vehicles (empty red ring), no motor vehicles, no trailers, no animal-drawn or agricultural
  vehicles, no light motorcycles (S12 lists some, but they are rare and designs unknown).
- Minimum distance between vehicles sign. A 2015 Emirates 24/7 article reports only a chevron-marking trial
  on one Abu Dhabi motorway.
- Stop at checkpoint (customs/police) sign.
- Mandatory "ahead or left/right", "left or right", end of minimum speed.
- Blue square pedestrian-crossing sign, U-turn permitted information sign, speed camera / radar sign,
  emergency lane sign, hospital zone sign.
- Service signs other than hospital and airport: first aid (red crescent), fuel, mosque, telephone,
  restaurant, coffee, hotel, rest area, police, mechanic. Only blogs mention mosque and fuel symbols.
- In the RTA/EDI charts but design unknown, so not catalogued: HOV lane, cyclists must dismount, road
  reserved for construction vehicles, authorized vehicles only, no turning for lorries, tram crossing from
  the right/left, single/multiple tram-line diagrams, bus or tram route diagrams, beginning/end of median,
  sharp curve lanes, parking for diplomat cars, "Do not enter junction until exit is clear" text sign, red-light
  penalty text sign (AED 30,000, tram junctions), "Driving licence impounded", "Attention", "Road clear",
  city centre / CBD symbols. "Lane ahead open / closed" are lane-control signals, left to the markings agent.
- 110 km/h and 90 km/h speed-limit signs (likely exist on some roads, no source found).
- Railway level crossing sign (the charts say "tram or railway"; no evidence of level crossings on UAE
  public roads was found).

## 6. Conflicts recorded

| topic | source A | source B | used |
|---|---|---|---|
| temporary sign colour | Abu Dhabi WZTMM 2014 (S9): yellow; HiDubai 2023 (S17): yellow = caution | Trinity Rental blog 2026: orange | yellow, note "sometimes orange" in JSON notes |
| animals sign | EDI/Drive Dubai charts: "Animals / حيوانات" | Wikipedia UAE list: "Camel crossing" | one sign, camel pictogram, both names |
| give way name | RTA Arabic 2012: يجب عليك إفساح الطريق (إعطاء أولوية المرور) | sample file: أعط الأولوية | أفسح الطريق (RTA wording, short) |
| E-route emblem | Abu Dhabi TR-538: blue shield, gold numbers | Khaleej Times: "falcon emblem" (no colours) | blue falcon shield, gold numbers |
| speed limits | RTA 2012 Arabic table (S20) | Wikipedia (S16): 25 to 40 residential, 140 Abu Dhabi | RTA values as typical; 140 marked medium, Abu Dhabi only |
