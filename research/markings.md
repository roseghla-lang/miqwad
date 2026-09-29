# Research notes: road markings, traffic lights, lane signals, police hand signals, emergency and school-bus signals

Agent: markings. Outputs: `content/markings.json` (62 items, 12 categories) and `content/q_markings.json`
(module `markings`: 26 cards, 80 questions on topics `markings`, `lights`, `police`).
Date of research: 2026-09-29.

## Method and limits

- WebFetch was used on official PDFs and pages. Large PDFs (RTA LMV handbook 8th edition, English 2019/2021 and
  Arabic 2024 copies; Abu Dhabi MUTCD TR-511) are truncated by the fetch tool after roughly the first 100 pages,
  so their road-marking chapters could not be read. The complete text of the older RTA handbook (3rd edition,
  2012) was readable and is the main Dubai source for markings and lights. Its content was cross-checked against
  the current Dubai institute charts (EDI 2019 and January 2026, GMDC), which list the same marking families the
  RTA theory course still teaches.
- The federal Executive Regulations (Ministerial Resolution 130/1997, as amended) were readable in full. Federal
  Decree-Law 14/2024, Art. 49(2), keeps earlier implementing decisions in force until replaced, so the 1997
  regulations remain a valid legal source for light meanings, pedestrian rules, stopping bans, police priority and
  the school-bus stop arm.
- Scribd copies of the Dubai Traffic Control Devices Manual, AARoads, TAMM (Abu Dhabi parking) and the Sharjah
  Municipality parking page could not be read (JS wall, 403 or robots.txt).
- The session-wide WebSearch budget (200 searches, shared by all agents) ran out part-way through this task.
  After that, only documents already found or linked from them were fetched. This mostly hurt kerb colours and
  lane-control signals.
- The fetch tool paraphrases long documents. Every fact used in the JSON was re-asked with a targeted prompt, and
  key sentences (amber rule, flashing amber on fixed posts, school-bus Art. 71, police priority Art. 28, RTA green
  light and emergency vehicles) were confirmed by at least two separate fetches.

## Sources

| id | title | publisher | date | url | used for |
|----|-------|-----------|------|-----|----------|
| S1 | Light Motor Vehicle Handbook: A Guide to Safe Driving, 3rd ed. | RTA Dubai, Licensing Agency (third-party copy) | 2012-01 | https://russiadubai.com/upload/iblock/ac6/ac6fa71db851d0137a784bd80278acff.pdf | markings pp. 120-126 (stop line, give-way line, zebra, box junction, rumble strips, speed-hump lines, yellow/white lines, solid lanes near junctions, lane arrows), signals pp. 128-129 (red, amber, green, point of no return), disabled bays, VMS p. 119, hazard lights |
| S2 | Ministerial Resolution 130/1997, Executive Regulations of the Federal Traffic Law (as amended) | UAE Legislation portal / MOI | 1997-03-31 | https://uaelegislation.gov.ae/ar/legislations/1020 (text via /download) | Art. 4 (emergency vehicles: keep right, slow, stop), Art. 22 (pedestrian crossings), Art. 23 (pedestrian lights), Art. 25 (vehicle lights incl. flashing amber on fixed posts), Art. 28 (police priority), Art. 36 (turning gives way to pedestrians), Art. 48 (warning signals when stopped), Art. 49 (no-stopping places), Art. 58 (continuous and broken lines), Art. 71 (school bus stop arm, 5 m, single vs dual roads) |
| S3 | Federal Decree-Law 14/2024 on Traffic Regulation | UAE Legislation portal | 2024-09, in force 2025-03-29 | https://uaelegislation.gov.ae/ar/legislations/2598 | Art. 4 (obey traffic officers), Art. 5 (slow down at pedestrian crossings and stop until pedestrians cross), Art. 6 (priority order), Art. 49(2) (old regulations stay in force) |
| S4 | إشارات أفراد المرور اليدوية.. لغة صامتة للتخاطب مع السائقين | Abu Dhabi Police | text dated 2009-09-03 (page under 2021 news path) | https://www.adpolice.gov.ae/ar-AE/Media-Center/News/2021/06/30/Traffic-police-hand-signals-is-a-voiceless-language | the six police signals, officer priority over lights and markings, flashing yellow lights for equipment on the road, statement that UAE signals follow the 1968 Vienna Convention and that the signals are part of licensing tests |
| S5 | 6 حركات مرورية صامتة للتخاطب مع السائقين | Emarat Al Youm | 2009-09-05 | https://www.emaratalyoum.com/local-section/2009-09-05-1.156794 | same six signals (same original article, press copy) |
| S6 | Guidance Chart: Road Signs, Road Markings and Traffic Signals (English) | Emirates Driving Institute | 2019-11 | https://edi-uae.com/public/uploads/downloads/20191126120000English-Signal-Chart.pdf | list of markings in the Dubai course (no passing line, stop line, give-way line as short intermittent transverse lines, zig-zag zone line, tram box junction, speed hump marking, keep entrance clear yellow line, bus stop markings, merge and deceleration arrows, "areas to separate traffic movements (avoid driving over these areas)", U-turn only signal) |
| S7 | Signal Chart (English) | Emirates Driving Institute | 2026-01 | https://edi-uae.com/public/uploads/downloads/20260303120751Signal-Chart-English.pdf | confirms the same marking list is still taught in 2026 ("Do not enter yellow box if your exit is not clear") |
| S8 | Guidance Chart (English) | Galadari Motor Driving Centre | undated | https://www.gmdc.ae/docs/students/Guidance_ChartENG.pdf | second institute list (same families) |
| S9 | Giving Way to Emergency Vehicles | Dubai Police (EDI download) | 2020-03 | https://edi-uae.com/public/uploads/downloads/20200304135234Giving-way-to-emergency-vehicles-Dubai-Police.pdf | move right on main roads, left/right on internal roads, junction and roundabout behaviour, do not follow, do not use shoulders, do not cross red, AED 3,000 + 6 points + 30 days |
| S10 | Driving Safely in Dubai, 1st ed. | RTA | undated | https://licensing.rta.ae/handbook/DrivingSafelyInDubaiEN.pdf | bus/taxi lanes exist and are marked; emergency vehicles |
| S11 | RTA Handbook Light Motor Vehicle, 8th ed. (English) | RTA (Dubai Driving Center copy) | 2021-01 | https://www.drivedubai.ae/public/uploads/downloads/20210128140116RTA-Handbook-Light-Motor-Vechicle-English.pdf | p. 59: emergency vehicles have priority "(despite any other rules), even if you have a green traffic light" (confirmed twice) |
| S12 | Flashing traffic lights being tested in Dubai | Gulf News | 2007-07-22 | https://gulfnews.com/uae/transport/flashing-traffic-lights-being-tested-in-dubai-1.190689 | RTA trial of green flashing three times before amber, plan to expand citywide |
| S13 | Flashing green signal does the job | The National | 2009-05-27 | https://www.thenationalnews.com/uae/transport/flashing-green-signal-does-the-job-1.548296 | Abu Dhabi flashing green since late 2008, then 3 s amber |
| S14 | UAE traffic light guide: Avoid fines and stay safe at intersections | Gulf News (MOI 999 magazine) | 2024-07-10 | https://gulfnews.com/living-in-uae/transport/uae-traffic-light-guide-avoid-fines-and-stay-safe-at-intersections-1.1720612632422 | flashing yellow can indicate a malfunction; red light AED 1,000 + 12 points + 30 days; Dubai release fee AED 50,000 (Decree 30/2023) |
| S15 | Dubai traffic light rule: Move closer to the white line to trigger green signal | Gulf News (RTA) | 2025-05-14, updated 2025-08-04 | https://gulfnews.com/living-in-uae/transport/traffic-light-confusion-in-dubai-this-simple-move-could-trigger-the-green-signal-1.500126810 | detectors near the stop line (card and one question) |
| S16 | Dangers of entering yellow box junction explained in Dubai campaign | The National (Dubai Police) | 2016-04-10 | https://www.thenationalnews.com/uae/transport/dangers-of-entering-yellow-box-junction-explained-in-dubai-campaign-1.141300 | do not enter on green when the exit is blocked; AED 500 |
| S17 | Abu Dhabi Police warn drivers against stopping, parking in yellow box at intersections | Khaleej Times | 2026-06-08 | https://www.khaleejtimes.com/uae/transport/abu-dhabi-police-warning-stopping-parking-yellow-box-intersections | AED 500, federal rule |
| S18 | Bus Lane | RTA | undated | https://www.rta.ae/links/promotions/en/bus-lane.html | users: buses, taxis, police, civil defence, ambulances; AED 600 |
| S19 | Dh600 fine for motorists who misuse this dedicated bus lane in Bur Dubai | Gulf News | 2021-02 | https://gulfnews.com/uae/transport/dh600-fine-for-motorists-who-misuse-this-dedicated-bus-lane-in-bur-dubai-from-sunday-1.76977966 | red-coloured lane on Khalid bin Al Waleed St, cameras, AED 600 |
| S20 | Ambulance behind you in the UAE? How to give way and avoid a Dh3,000 fine | Emirates 24/7 | 2026-08-29 | https://www.emirates247.com/uae-guide/ambulance-behind-you-in-the-uae-how-to-give-way-and-avoid-a-dh3000-fine/5032 | same giving-way rules (Abu Dhabi campaign); "hard shoulder, which is marked with a yellow line, as it is used by emergency vehicles" |
| S21 | UAE school bus STOP sign rules | Emirates 24/7 | 2026-08-31 | https://www.emirates247.com/uae-guide/uae-school-bus-stop-sign-rules-when-motorists-must-stop-and-the-fines-for-violations/4898 | Art. 71 restated, AED 1,000 + 10 points (drivers), AED 500 + 6 points (bus drivers), stay stopped until arm withdrawn and lights off |
| S22 | إفساح الطريق لمركبات الطوارئ يضمن الاستجابة السريعة للحوادث | Abu Dhabi Police | 2020-10-23 | https://www.adpolice.gov.ae/ar-AE/Media-Center/News/2021/07/01/News_26200 | AED 3,000 + 6 points + 30 days |
| S23 | Abu Dhabi Manual on Uniform Traffic Control Devices TR-511, 2nd ed. | Abu Dhabi DoT / QCC | 2020-09 | https://jawdah.qcc.abudhabi.ae/en/Registration/QCCServices/Services/STD/ISGL/ISGL-LIST/TR-511.pdf | glossary (white centre, lane and edge lines; yield line = row of white triangles; stop line; RPM; rumble strip; Active Traffic Management = variable speed limits and dynamic lane closure), table of contents (hatch marking 658, chevron marking 657, zig-zag lines before zebra crossings in school zones, green RPMs at freeway diverge, curb painting section 5.4.6) |
| S24 | How to Pass the RTA Car Theory Test in Dubai | Excellence Driving | 2026-09-08 | https://www.excellencedriving.com/en/blogs/how-to-pass-the-rta-car-theory-test-in-dubai | flashing yellow: proceed carefully and slow down |
| S25 | Road Safety Awareness During Weather Changes (poster) | RTA (EDI download) | 2025-12 | https://edi-uae.com/public/uploads/downloads/20251217102236RTA-Road-Safety-Awareness-Poster-During-Weather-Changes.pdf | do not use hazard lights while driving; only when stopping or in an emergency |
| S26 | Vienna Convention on Road Signs and Signals | Wikipedia | read 2026-09 | https://en.wikipedia.org/wiki/Vienna_Convention_on_Road_Signs_and_Signals | lane-control symbols (red cross closed, green down arrow open, diagonal arrow = lane closes); UAE listed as a party; red arrow meaning by analogy |
| S27 | Dubai Police Traffic Fines (Complete List) | Edarabia (secondary) | 2026-09-01 | https://www.edarabia.com/dubai-police-traffic-fines/ | only as a second source for numbers (red light, bus lane federal figure) |
| S28 | Flashing green signals confusing motorists | The National | 2009-05-26 | https://www.thenationalnews.com/uae/transport/flashing-green-signals-confusing-motorists-1.493607 | institute handbooks did not explain flashing green at the time |

Background sources read but not cited in JSON: dubizzle "Road markings in the UAE" (2021, updated 2026; no
sources, but its wording matches S1), YallaMotor 2025, DubiCars 2025, RED Rental 2025 (rejected: imports
European colour conventions such as "yellow lines = no parking", "blue lines = paid parking"), Gulf News
"How Dubai's traffic signal system works" (2018, SCOOT adaptive signals).

## Decisions

1. Line colours. S1 (RTA) teaches: white broken lines between lanes of the same direction; yellow centre lines on
   undivided two-way roads (broken, single solid, double solid, solid plus broken). S23 (Abu Dhabi 2020) defines
   centre lines as white. Decision: items and questions follow RTA colours, every colour-dependent question is
   tagged `exam: ["dubai"]`, and cards/uae_note teach that the shape (broken vs solid) carries the rule.
   Question markings-038 tests exactly this.
2. Edge lines and hard shoulder. Existence and rule sourced (S6, S8, S9, S20, S23). Colour is not settled: S23
   glossary says white for right or left edges; S20 (2026, Abu Dhabi Police campaign) says the hard shoulder is
   marked by a yellow line. The drawing uses yellow on the left (median side) and white on the right; this is
   flagged in `notes` as illustrative, and no question asks about edge-line colour.
3. Give-way line. Dubai (S1, S6): broken white transverse line. Abu Dhabi (S23): row of white triangles.
   Item and the question are Dubai-scoped with a uae_note.
4. Amber. S2 Art. 25: stop, unless you cannot stop safely, then continue with caution. S1: "much the same as red",
   plus the "point of no return". Used for the tricky amber questions.
5. Flashing green: `medium`. RTA trialled it in 2007 (S12) with a plan for citywide use, Abu Dhabi since 2008
   (S13). Not in the 1997 regulation list nor in the 2012 handbook; S28 notes handbooks did not explain it.
   Sequence taught: green, (flashing green where used), amber, red. No red plus amber phase is listed anywhere
   in UAE sources, so it is not taught.
6. Flashing amber. S2 Art. 25 gives two meanings, both used: (a) flashing amber in a signal head = proceed if the
   road is clear, with caution (S14 adds: may indicate a malfunction); (b) flashing amber on a fixed post at
   junctions, roundabouts and road meetings = give way, priority to traffic coming from the LEFT. Clause (b) was
   re-checked with a separate prompt that asked right vs left explicitly.
7. Arrow lights. Green arrow from S2. Green U-turn arrow from S6 ("Proceed to U turn only"). Red arrow: no UAE text
   found; meaning taken from the Vienna Convention (S26), which S4 says UAE signals follow. Marked `medium`.
8. Lane-control signals: `medium`. No UAE document showing the red X / green arrow symbols was reachable. S23
   (official, Abu Dhabi) defines Active Traffic Management as electronic displays that adjust speed limits and
   close lanes dynamically; S26 gives the Vienna symbols; S1 defines VMS. The diagonal-arrow signal was dropped
   (no UAE evidence at all).
9. Police hand signals: the six signals of S4/S5 (official Abu Dhabi Police text) are used literally.
   - Stop front: LEFT arm raised straight up or at a right angle, palm forward.
   - Stop behind: RIGHT arm horizontal at shoulder height, palm forward; stops traffic from behind "facing the back
     of the palm". The `draw` for po-stop-behind is a REAR view (exception to the front-view rule) because that is
     what the addressed driver sees.
   - Arm or arms horizontal: stop traffic whose direction crosses the line of the arms (front and back).
   - Semicircle from top to bottom: proceed in the direction indicated.
   - Red lamp swung back and forth: stop. Red lamp in a semicircle: proceed in that direction.
   - Officer may lower the arm(s) once vehicles have stopped (S4). The bank infers (question police-011, `medium`)
     that lowering the arm is not permission to go, since permission has its own signal.
   - Order of authority: S2 Art. 28 puts police instructions above traffic rules, light signals, road signs and
     markings. No UAE source ranks lights vs signs vs markings among themselves, so no question does.
10. Emergency vehicles: S2 Art. 4 (keep right, slow down as much as possible, or stop), S11 (priority even on a
    green light), S9 (Dubai Police practical guide). School bus: S2 Art. 71 (single road: both directions stop at
    least 5 m; dual road: only the bus's direction). The question bank leaves emergency vehicles and school buses
    to the agents that own topics `emergency-vehicles` and `school-bus`; only light-related emergency questions
    (green light + siren, red light + ambulance behind) are in `lights`.
11. Fines are only stated where an official page or two independent outlets agree: yellow box AED 500 (S16, S17),
    red light AED 1,000 + 12 points + 30 days (S14, S27), emergency AED 3,000 + 6 points + 30 days (S9, S22, S20),
    school bus AED 1,000 + 10 points (S21, S27). Bus lane: see conflicts.

## Conflicts

| topic | source A | source B | used | why |
|-------|----------|----------|------|-----|
| Centre line colour | RTA 2012 (S1) and Dubai institute charts 2019/2026 (S6, S7): yellow | Abu Dhabi MUTCD 2020 (S23): white | RTA for Dubai-scoped items/questions; rule taught by line shape | learner tests in Dubai or Sharjah; RTA is the Dubai authority |
| Edge line / hard shoulder colour | S23 (2020): edge lines white | S20 (2026, Abu Dhabi Police campaign): hard shoulder marked with a yellow line | neither asserted; drawing illustrative | unresolved |
| Give-way line form | S1, S6: broken white transverse line | S23: row of white triangles | S1 (Dubai) with uae_note | Dubai curriculum |
| Bus lane fine | RTA page (S18) and Gulf News 2021 (S19): AED 600 | federal fines list via Edarabia (S27, 2026): AED 400 for "driving on lanes designated for taxis and buses" | 600, question marked `medium` with note | RTA figure is specific to Dubai dedicated lanes; the Edarabia list is secondary |
| Red-light release fee | Gulf News 2024 (S14) citing Dubai Decree 30/2023: AED 50,000 | none found | used, `medium` | decree text itself not read |

## Unverified (kept out of the JSON)

- Kerb paint colours (black/white, black/yellow, blue, red and so on). No readable UAE official source. S23 has a
  "Curb Painting" section (5.4.6, parking zones) but the fetch tool stops before it. Search results with colour
  meanings were Saudi (Roads General Authority) posts and must not be imported. The `kerb` category is therefore
  omitted from markings.json.
- Painted words on the road (STOP, SLOW, BUS ONLY, SCHOOL, KEEP CLEAR). S23 has a "text pavement markings" section
  but the words used in Dubai/Sharjah were not verified. The `text` category is omitted.
- Painted U-turn lane arrow (only the U-turn signal light is sourced).
- UK-style "warning lines" (long dashes, short gaps) as a distinct category.
- Zig-zag rules beyond "warning before a crossing" (no stopping, no overtaking inside the zig-zags is UK law; not
  found for the UAE).
- Road stud colours other than green at Abu Dhabi freeway diverges; raised pedestrian crossings; cycle crossings;
  taxi bays; generic parking-bay line rules.
- Pedestrian countdown timers and audible signals in Dubai/Sharjah.
- Red X / green arrow symbols in Dubai and Sharjah tunnels specifically; diagonal lane arrow; fog speed reduction
  signs in Sharjah or Dubai.
- Flashing green use in Sharjah; whether all Dubai junctions flash green today.
- A police "slow down" hand signal and driver arm signals (Art. 59 mentions hand signals but gives no forms).
- Traffic police uniform colours (drawings use a neutral uniform).
- Exact wording on the school-bus stop arm (regulation calls it ذراع إشارة (قف)); the item uses the text قف only.
- Ranking of light signals vs road signs vs markings below the police officer.
- Using the hard shoulder when broken down: sources say keep off it and use hazard lights only when stopped or in
  an emergency; a UAE text telling drivers to pull onto the shoulder after a breakdown was not read, so items say
  only "for emergencies".

## Notes for other agents

- Drawing agents: all `draw` strings are English and describe a top-down road (markings, emergency scenes) or a
  front view (lights, lane signals, police). Exceptions: `po-stop-behind` is a rear view, `ev-hazard-lights` is a
  rear view of a car. Colours reference the BRIEF tokens; the bus lane uses a dark red surface (#8C2A2A).
- Scene agent: `mk-yellow-box`, `mk-solid-lane`, `mk-arrow-*`, `ev-at-junction`, `ev-roundabout`,
  `ev-school-bus-*` are natural scenario seeds (green but blocked exit; wrong arrow lane behind a solid line;
  ambulance at a red light; stop arm on single vs dual roads).
- Exams agent: S4 states the police hand signals are part of UAE licensing tests; Dubai institute charts (S6-S8)
  do not include police signals, lane-control signals or kerbs.
