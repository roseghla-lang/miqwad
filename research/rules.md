# Rules of the road: research notes and fact sheet (module `rules`)

Owner: rules agent. Date: 2026-09-29. Output: `content/q_rules.json` (topics: speed, distance, lanes,
overtaking, priority, roundabouts, turning, highway, pedestrians, school-bus, emergency-vehicles,
vulnerable, parking, lights-horn).

## 0. Legal status and method

- Federal Decree-Law No. 14 of 2024 on Traffic Regulation: issued 30 Sep 2024, in force 29 Mar 2025
  (Official Gazette 784) [S1, S2]. Article 5 = driver obligations, Article 6 = traffic priority,
  Article 7 = road use (pedestrians).
- The detailed "rules of the road" (overtaking, lanes, distance, parking places, horn, lights) are in the
  Executive Regulation of the old federal traffic law, Ministerial Resolution No. 130 of 1997 [S3, S4].
  The UAE legislation portal still lists it as in force (last update 2 May 2023, 13 amendments).
  I found no executive regulation for Decree-Law 14/2024; an Al Khaleej headline of 16 Sep 2026
  ("المطالبة بإصدار لائحة قانون تنظيم السير والمرور", S30) suggests it is still pending. I used
  MR 130/1997 only where it agrees with the new law and with RTA / police material.
- RTA handbook: the English 8th edition (2021/2024 uploads) could not be read past the table of contents
  by the fetch tool (long PDF). I read the English 7th edition (Jan 2016, S5), the Arabic 3rd edition
  (Jan 2012, flipbook with page ranges, S6) and bits of the Arabic 8th edition (S7).
- Tool caveat: WebFetch returns a model summary with short quotes, not raw text. One summary of the English
  8th edition returned a UK-style roundabout text (look right, first exit = left turn, signal left to
  leave). It was not visible in the source text on re-query and contradicts S1, S3, S6 and S25, so I
  treated it as a hallucination and discarded it. Every fact below was confirmed by at least one
  official or institute source; figures come from the source text quoted in short form.
- Shell internet was blocked (403 for licensing.rta.ae and drivedubai.ae); the web search budget ran
  out near the end, so a few items stayed "Unverified".

## 1. Sources

| id | title | publisher | date | url |
|---|---|---|---|---|
| S1 | مرسوم بقانون اتحادي رقم 14 لسنة 2024 بشأن تنظيم السير والمرور (Arabic text) | UAE Legislation portal | 2024-09-30, in force 2025-03-29 | https://uaelegislation.gov.ae/ar/legislations/2598/download |
| S2 | Federal Decree-Law No. 14 of 2024 On Traffic Regulation (English text) | UAE Legislation portal | 2024-09-30 | https://uaelegislation.gov.ae/en/legislations/2598/download |
| S3 | Ministerial Resolution No. 130 of 1997, Executive Regulation of the Federal Traffic Law (English) | UAE Legislation portal | 1997, listed in force, updated 2023-05-02 | https://uaelegislation.gov.ae/en/legislations/1020/download |
| S4 | القرار الوزاري رقم 130 لسنة 1997 باللائحة التنفيذية لقانون السير والمرور (Arabic) | UAE Legislation portal | same | https://uaelegislation.gov.ae/ar/legislations/1020/download |
| S5 | Light Motor Vehicle Handbook, A Guide to Safe Driving, 7th edition (English) | RTA Licensing Agency (copy hosted by Emirates Driving Institute) | 2016-01 | https://edi-uae.com/public/uploads/downloads/20190724133013RTA_Handbook_-_Light_Motor_Vehicle_(LMV)_-_English.pdf |
| S6 | كتيب المركبات الآلية الخفيفة، دليل للقيادة الآمنة، الطبعة 3 (Arabic) | RTA Licensing Agency (original PDF on rta.ae, read via flipbook) | 2012-01 | https://www.rta.ae/wpsv5/eservices/PDF_Catalog/Light_Motor_Handbook_AR.pdf (flipbook: https://pubhtml5.com/plkd/rioj/basic/101-150) |
| S7 | كتيب المركبات الآلية الخفيفة، الطبعة 8 (Arabic) | RTA Licensing Agency (copy hosted by Dubai Driving Center) | 2021-03 upload | https://www.drivedubai.ae/public/uploads/downloads/20210301161905RTA-Handbook-Light-Motor-Vechicle-Arabic.pdf |
| S8 | New UAE traffic law: When should you give way, and when do you have the right of way? | Gulf News | 2024-10-31 | https://gulfnews.com/living-in-uae/transport/new-uae-traffic-law-when-should-you-give-way-and-when-do-you-have-the-right-of-way-1.1730289189795 |
| S9 | Dubai: 5 rules to follow when driving in the fast lane (Dubai Police, RTA) | Gulf News | 2024-07-03 | https://gulfnews.com/living-in-uae/transport/dubai-5-rules-to-follow-when-driving-in-the-fast-lane-2-1.1720015446210 |
| S10 | Dubai Police warn: Slow driving in fast lanes as dangerous as speeding | Gulf News (Dubai Police statement) | 2025-09-04 | https://gulfnews.com/uae/transport/dubai-police-warn-slow-driving-in-fast-lanes-as-dangerous-as-speeding-dh400-fine-imposed-1.500256599 |
| S11 | Think you're following UAE lane rules? The driving mistakes that could get you fined (RTA; Sharjah Police on hard shoulder) | Gulf News | 2025-05-12 | https://gulfnews.com/living-in-uae/transport/think-youre-following-uae-lane-rules-the-driving-mistakes-that-could-get-you-fined-1.500124462 |
| S12 | Dubai Police: Let emergency vehicles go, every second matters | Gulf News (Dubai Police guidance) | 2019-10-02 | https://gulfnews.com/uae/dubai-police-let-emergency-vehicles-go-every-second-matters-1.66847995 |
| S13 | شرطة دبي تفسح الطريق أمام مركبات الطوارئ بـ«الأمل» | Emarat Al Youm (Dubai Police traffic director) | 2019-10-03 | https://www.emaratalyoum.com/local-section/other/2019-10-03-1.1258016 |
| S14 | «لا تتردد.. افسح الطريق فورا» حملة مشتركة لمركبات الطوارئ والإسعاف | Abu Dhabi Police (official site) | 2025-05-29 | https://abudhabipolice.gov.ae/Media-Center/News/2025/05/29052025001 |
| S15 | Dh3,000 fine, 30 days impoundment: Sharjah warns against blocking emergency vehicles | Khaleej Times (Sharjah Police officers quoted) | 2025-05-03 | https://www.khaleejtimes.com/uae/emergencies/dh3000-fine-impoundment-blocking-emergency-vehicles |
| S16 | UAE: Give way to emergency vehicles or face Dh3,000 traffic fine | Gulf News (Abu Dhabi Police, Civil Defence) | 2025-08-27 | https://gulfnews.com/living-in-uae/transport/uae-give-way-to-emergency-vehicles-or-face-dh3000-traffic-fine-1.500247516 |
| S17 | طرق دبي تؤكد تعليمات ذراع التوقف للحافلات المدرسية | Emarat Al Youm (RTA) | 2026-04-21 | https://www.emaratalyoum.com/local-section/education/2026-04-21-1.2038053 |
| S18 | Dubai School Bus Stop Arm Rules: what drivers must know | Gulf News (RTA) | 2026-04-21 | https://gulfnews.com/uae/transport/school-bus-stop-arm-rules-in-dubai-what-drivers-must-know-1.500514122 |
| S19 | Abu Dhabi Police urge motorists to follow rules around school buses | The National | 2026-08-31 | https://www.thenationalnews.com/news/uae/2026/08/31/uae-school-bus-rules-drivers-parents-students-staff/ |
| S20 | Dh1,000 fine in UAE: Police issue warning against violating school bus stop sign rules | Khaleej Times (Abu Dhabi Police) | 2023-04-06 | https://www.khaleejtimes.com/uae/transport/dh1000-fine-in-uae-police-issue-warning-against-violating-school-bus-stop-sign-rules |
| S21 | Tailgating in Dubai: rules explained (cites RTA handbook two-second rule) | Gulf News | updated 2026-09-20 | https://gulfnews.com/living-in-uae/transport/dubai-tailgating-fine-rules-1.500083210 |
| S22 | Don't use hazard lights and double safety distance during fog, Abu Dhabi Police advises | Gulf News | 2021-10-18 | https://gulfnews.com/uae/dont-use-hazard-lights-and-double-safety-distance-during-fog-abu-dhabi-police-advises-1.82879145 |
| S23 | UAE: Driving with hazard lights on during fog? You could get fined; here's why | Khaleej Times | 2025-11-20 | https://www.khaleejtimes.com/uae/weather/driving-fog-hazard-lights-tips |
| S24 | UAE: Dh1,000 parking fine for these 5 violations | Gulf News | 2023-07-25 | https://gulfnews.com/living-in-uae/transport/uae-dh1000-parking-fine-for-these-5-violations-1.1690295373406 |
| S25 | Roundabout Driving Rules in UAE, 2 and 3 lane roundabout guide (EN and AR pages) | Excellence Driving (RTA-licensed driving institute, Dubai) | 2025-12-09 | https://www.excellencedriving.com/en/blogs/roundabout-rules-uae (AR: https://www.excellencedriving.com/ar/blogs/roundabout-rules-uae) |
| S26 | UAE back to school: When must drivers stop for pedestrians? | Emirates 24/7 (cites Article 5 of the law) | 2026-08-28 | https://www.emirates247.com/uae-guide/uae-back-to-school-when-must-drivers-stop-for-pedestrians-rules-fines-explained/5011 |
| S27 | UAE: Stricter fines, potential jail time for crossing the road from non-designated areas | Gulf News | 2024-10-31 | https://gulfnews.com/living-in-uae/transport/uae-stricter-fines-potential-jail-time-for-crossing-the-road-from-non-designated-areas-1.1730381813582 |
| S28 | Ambulance behind you in the UAE? How to give way (Abu Dhabi Police campaign) | Emirates 24/7 | 2026-08-29 | https://www.emirates247.com/uae-guide/ambulance-behind-you-in-the-uae-how-to-give-way-and-avoid-a-dh3000-fine/5032 |
| S29 | Tailgating: safe distance to the vehicle in front (3-second rule) | RoadSafetyUAE (NGO) | undated | https://www.roadsafetyuae.com/tailgating/ |
| S30 | المطالبة بإصدار لائحة قانون تنظيم السير والمرور (headline only, page not fetchable) | Al Khaleej | 2026-09-16 | https://www.alkhaleej.ae/2026-09-16/ (full URL too long for the fetch tool) |
| S31 | «طرق دبي» تحدث مناهج اختبارات رخصة قيادة المركبات الخفيفة (ADAS topics added) | 25h.app (news summary of RTA release) | 2026-05-13 | https://25h.app/2026/05/13/ |

S29, S30 and S31 are context only and are not cited in the JSON.

## 2. Direction conventions (read this before drawing any scenario)

- C1. Right-hand traffic. On a two-way road your lane is to the RIGHT of the centre line. Vehicles are
  left-hand drive: the driver sits on the LEFT side of the car.
- C2. "Left" and "right" always mean the driver's own left and right, seen from the driver's seat.
- C3. Overtaking: pass on the LEFT side of the slower vehicle, then return to the right.
- C4. Roundabouts: seen from above, traffic circulates ANTICLOCKWISE; the central island is always on the
  driver's LEFT; you enter by bearing RIGHT; exits leave to the driver's RIGHT; traffic already on the
  ring reaches your entry from your LEFT.
- C5. Worked example, top-down view, north up (east = right of screen). A car enters from the SOUTH arm
  heading NORTH, driving in the east half of that arm. It gives way to ring traffic coming from its left
  (from the west side of the ring, moving south then east across the south point). It joins the ring
  heading EAST. Exits in order: exit 1 = EAST arm (right turn), exit 2 = NORTH arm (straight on),
  exit 3 = WEST arm (left turn), exit 4 = SOUTH arm (U-turn, back the way it came).
- C6. Unmarked junction of equal roads: car A heading north, car B coming from the west (heading east,
  i.e. from A's left): B goes first. Car C coming from the east (heading west, from A's right): A goes
  first, because A is on C's left.
- C7. Emergency vehicles on multi-lane roads use the LEFTMOST lane; other traffic moves RIGHT.

## 3. FACT SHEET

Confidence: H = official or institute source, or two solid sources; M = one decent source.

### Roundabouts (الدوارات)
- F1. Circulation is anticlockwise (C4). Law: at a roundabout priority goes to those coming from the
  left; RTA: when entering, check the traffic on your left. [S1, S2, S6] H
- F2. The entering driver gives way to traffic already on the roundabout (which comes from the left).
  Law text (S2): "If the Roads are equal in rank or there is a roundabout or intersection, priority
  shall be given to those coming from the left"; Arabic (S1): "تكون الأولوية للقادم من الجهة اليسرى".
  [S1, S2, S6, S8, S25] H
- F3. Slow down on approach, choose the lane BEFORE entering; lane arrows painted on the approach take
  precedence ("or as marked by arrows"). [S6, S25] H (arrow wording M)
- F4. First exit (right turn): approach in the RIGHT lane; signal RIGHT on approach and keep it on; check
  traffic on your left; stay in the right lane; exit. RTA: "اعط إشارة الانعطاف نحو اليمين عند اقترابك،
  وتحقق من حركة السير على يسارك". [S6, S25] H
- F5. Straight ahead (exit 2 of 4): approach in the lane that leads to your exit ("اقترب من الدوار في
  المسار الذي يقودك إلى المسار الذي تريد أن تكون فيه"); no signal needed on entry; signal RIGHT after
  passing exit 1 ("بعد اجتيازك للمخرج الأول"). Lane: 3-lane roundabout = MIDDLE lane (S25 also allows
  right); 2-lane roundabout = right or left depending on markings / exit (S25). [S6, S25] H for the
  signal, M for the lane on 3-lane roundabouts.
- F6. Left turn (exit 3 of 4): approach in the LEFT lane (or as arrows show), stay in it, signal RIGHT
  after passing exit 2 ("اعط إشارة الانعطاف نحو اليمين بعد اجتيازك المخرج الثاني"). [S6, S25] H
- F7. U-turn at a roundabout (exit 4 of 4): LEFT lane, signal RIGHT before your exit. The RTA handbook
  does not cover it. [S25] M
- F8. You always signal RIGHT to leave a roundabout, never left (left = UK rule). [S6, S25] H
- F9. No lane changes inside the roundabout. [S25, S6] H
- F10. No overtaking at intersections, roundabouts and squares (Art 55). [S3, S4] H
- F11. No parking/waiting at less than 15 m from intersections, squares and roundabouts, or in front of
  public transport stops (Art 49 clause 9). [S3, S4] H
- F12. Emergency vehicle approaching: do not enter the roundabout; if already inside, continue and leave
  at the earliest exit, making space to the right. [S12, S14, S28] H
- F13. Long vehicles need more room to turn and may take up more than one lane; do not drive alongside
  them. [S5] H

### Priority at junctions (أولوية المرور)
- F14. Junction of a main road and a side road without signs or signals: vehicles on the MAIN road have
  priority (Law Art 6; MR 130 Art 44). [S1, S2, S3, S4] H
- F15. Roads of equal rank, no signs or signals: priority to the vehicle coming from the LEFT (see C6).
  Also in the old regulation Art 44 ("للمركبات القادمة من اليسار إذا تساوت الطرق في المرتبة") and the RTA
  Arabic handbook p.138. The main-road rule beats the left rule. [S1, S2, S3, S4, S6, S8] H
- F16. Priority vehicles, order of Law Art 6: (1) official processions (2) civil defence vehicles on duty
  (3) vehicles carrying patients and injured while performing their duties (4) military vehicles moving
  in convoys (5) police vehicles when using warning sounds and lights (6) vehicles providing essential
  services named by the Minister. [S1, S2, S8] H
- F17. A driver who has priority must not insist on it and must stop to avoid confusion or a collision
  (MR 130 Art 45). [S3] H
- F18. STOP sign: full stop before the stop line, give way to all vehicles and pedestrians on the other
  road, then go when safe. [S6 p.131] H
- F19. Give-way sign or line: slow down, stop if needed, give way to vehicles and pedestrians. [S6 p.131,
  S11] H
- F20. T-junction: the driver on the road that ends gives way to traffic on the through road. [S6 p.141] H
- F21. Turning left: approach near the centre of the road on a two-way road, at the far left on a
  one-way road; let oncoming traffic pass first; turn just left of the centre of the junction
  (MR 130 Art 59; RTA p.138). Applies also on a green ball light. [S3, S6] H
- F22. U-turn: give way to every vehicle and pedestrian on the road; never across a solid line or where a
  no-U-turn sign stands. [S6 p.142 to 143] H
- F23. Entering the road from a parked position, parking, fuel station or private road: give way to all
  vehicles, signal, enter only when it is safe (RTA p.144; MR 130 Art 60). [S6, S3] H
- F24. Pedestrians who have started to cross at a crossing: slow down and stop until they have crossed
  (Law Art 5 clause و). [S1, S2, S26] H
- F25. Green arrow: you may go in the arrow's direction if it is safe. [S6 p.130] H

### Lanes (المسارات)
- F26. Drive on the right; keep to the utmost right side (MR 130 Art 57). [S3] H
- F27. Slow vehicles keep to the rightmost lane; drive within your lane and change lane only if the change
  creates no risk (Art 58). [S3, S10] H
- F28. Left (fast) lane only for overtaking; return right afterwards; give way to faster vehicles from
  behind even when you are within the limit; in light traffic stay in the far-right lane. [S5, S6 p.76,
  S9, S10, S11] H
- F29. Driving slowly in the fast lane is "equally dangerous as over speeding" (RTA). [S5, S10] H
- F30. Lane change: mirrors, signal in good time, head check of the blind spot, then move gradually.
  The signal gives no right of way. [S5, S6 p.150, S11, S3 Art 58] H
- F31. Solid line: no crossing, no overtaking, no turning across it except in an emergency; keep to its
  right. [S6 p.126, S11] H
- F32. Dubai bus lanes (red surface, "bus only"): buses, taxis, police, ambulance and other emergency
  vehicles only; private cars not allowed. [S6 p.85] M (2012 source)
- F33. Hard shoulder: only for stalled or damaged vehicles and emergency services; never for driving or
  overtaking (Sharjah Police). Emergency vehicles use it in congestion (Abu Dhabi Police). [S11, S14,
  S16] H
- F34. In fog keep lane discipline and avoid overtaking. [S22, S5] H

### Overtaking (التجاوز)
- F35. Overtake on the LEFT only. Single exception (Art 53 clause 9): the vehicle ahead has signalled and
  moved left to turn into a road on the left, and there is enough room to pass it on its right without
  risk. [S3, S4] H
- F36. Before overtaking (Art 53): full clear view of the path, no danger from opposite traffic, no vehicle
  behind already overtaking you, enough speed difference, warn the driver ahead, and enough distance
  before cutting back in. [S3] H
- F37. When being overtaken: slow down and keep as far right as possible (Art 54). [S3] H
- F38. No overtaking (Art 55): insufficient visibility; intersections, roundabouts, squares; congestion;
  bends, crests, slopes, slippery roads; near pedestrian crossings; where signs prohibit it; across a
  solid line. [S3, S4, S6, S11] H
- F39. Cyclists and motorcyclists: overtake only if you can move left safely leaving at least 1 m. [S5,
  S6 p.82] H
- F40. Never overtake a school bus that has stopped with its stop arm / flashing lights. [S5, S6, S19] H
- F41. Never overtake using the hard shoulder. [S11] H
- F42. Overtaking on the right on multi-lane roads is not allowed (outside F35's exception); Dubai Police
  tell drivers to avoid right-side overtaking. [S3, S10] H

### Speed (السرعة)
- F43. The number on the sign is a maximum; drive slower when road, weather, traffic or vehicle require
  it ("You must not exceed the maximum speed shown on a sign, taking into consideration the road,
  weather and vehicle conditions"). [S5, S3 Art 38] H
- F44. RTA typical limits: 40, 60 or 80 km/h on urban roads; 100 or 120 km/h on highways (depending on
  the road). The posted sign always rules. [S5] H
- F45. Reduce speed: residential areas, bends, intersections, pedestrian crossings, schools, hospitals,
  when approaching or passing animals, poor visibility (MR 130 Art 39); at entrances and exits of
  educational and health institutions, when visibility is unclear or the road is obstructed (Law Art 5
  clauses د and ه). [S3, S1] H
- F46. Minimum speed: set by sign; driving below it is prohibited (Art 40). RTA handbook shows a highway
  minimum sign of 60 km/h. [S3, S6 p.101] H
- F47. Total stopping distances in good conditions (RTA table): 60 km/h: 33 m; 100 km/h: 87 m;
  120 km/h: 130 m. [S5, S6 p.44] H

### Following distance (مسافة الأمان)
- F48. Keep a distance that lets you stop if the vehicle ahead suddenly slows down (Art 50). [S3] H
- F49. Two-second rule in good road and weather conditions ("at least two seconds behind the vehicle in
  front"). Method: pick a fixed marker, count from when the vehicle ahead passes it until you reach it.
  [S5, S21] H
- F50. More than two seconds when visibility is poor, the road is wet or slippery, or unmade. [S5] H
- F51. Rain: 4 seconds ("حافظ على بقائك بعيدا عنها بمسافة 4 ثوان", section on driving in different
  conditions). [S6 p.52, S7] H
- F52. Fog: double the safety distance and use low beam (Abu Dhabi Police). [S22] H (with S5 F50)
- F53. Stopping distance = reaction distance + braking distance. Longer with higher speed, wet surfaces,
  worn tyres (tread under 1.5 mm), fatigue. [S5, S6] H
- F54. Trucks and buses are bigger, longer and heavier and need a longer distance to stop. Blind spots:
  immediately in front, directly behind "for quite a distance", and along the sides; "if you cannot see
  the truck driver in the truck's mirror, then the truck driver cannot see you". [S5] H

### Highway (الطرق السريعة)
- F55. Joining: build up speed on the slip road early to match main-road traffic, merge into a safe gap;
  main-road traffic has priority; enter only if it exposes nobody to risk (Art 60). [S5, S1, S3] H
- F56. Leaving: signal, enter the exit slip road at its beginning, slow down inside it; do not cross the
  chevron (hatched) area. [S5] H
- F57. Missed exit: "never reverse your vehicle to enter the slip road ... Move on and take the next
  exit". [S5] H
- F58. Hard shoulder only for emergencies (F33); no random stopping that blocks traffic (Law Art 5
  clause ي). [S11, S1] H
- F59. Keep right, left lane for overtaking; obey minimum speed signs. [S5, S9, S3] H

### Pedestrians (المشاة)
- F60. At a pedestrian crossing: slow down; stop until pedestrians who started crossing have finished
  (Law Art 5 clause و; MR 130 Art 35). [S1, S2, S3, S26] H
- F61. When turning into another road: slow down and stop for pedestrians crossing it (MR 130 Art 36). [S3] H
- F62. Slow down at entrances and exits of schools and hospitals (Law Art 5 clause د). [S1, S2] H
- F63. Children: small, hard to see, do unexpected things; the Arabic handbook adds that children under
  about 9 lack the skills to stay safe alone in traffic. Older pedestrians move slowly and may not see
  well. [S5, S6 p.80] H
- F64. Law Art 7(4): "لا يجوز للمشاة عبور الطرق التي تزيد السرعة المقررة لها على (80) ثمانين كيلو متر في
  الساعة" (outside designated crossings, per S27). [S1, S27] H
- F65. No parking on pedestrian crossings or pavements (Art 49); no overtaking near crossings (Art 55).
  [S3] H
- F66. Pedestrians must use crossings / nearest crosswalk and signals (MR 130 Art 21 to 22). [S3] H

### School bus (الحافلة المدرسية)
- F67. When a school bus stops with its STOP arm extended and lights flashing: stop completely at least
  5 m from the bus. [S17, S18, S19, S20] H
- F68. Undivided road (no physical median or barrier): vehicles in BOTH directions stop. Divided road:
  only vehicles behind the bus (its direction) stop, in every lane of that direction. [S17, S18, S19] H
- F69. Stay stopped until all students have crossed and reached the safe area, the arm is withdrawn and
  the flashing lights are off. [S17, S18] H
- F70. Never overtake a school bus stopped to load or unload, even if the road looks clear; near school
  buses drive slowly and be ready to stop, students may cross suddenly. [S19, S5, S6 p.81] H

### Emergency vehicles (مركبات الطوارئ)
- F71. Recognition: siren sounding OR flashing red and blue lights. [S5] H
- F72. Give way immediately: keep to the right side, reduce speed, stop if necessary (MR 130 Art 4; RTA).
  [S3, S5, S6 p.83] H
- F73. Main roads / highways: emergency vehicles use the leftmost lane; move right. [S12, S14, S16] H
- F74. Internal roads without a shoulder: move right or left to open a path between vehicles. [S12, S14,
  S16] H
- F75. Road with one lane each way: move as far right as possible without using the hard shoulder;
  oncoming traffic also moves right so the vehicle passes in the middle. [S14, S28] H
- F76. Do not drive onto the hard shoulder: emergency vehicles use it in congestion. [S14, S16] H
- F77. At a red light: give way WITHOUT crossing the red signal (Dubai Police). Sharjah Police: you may
  move forward carefully into the pedestrian-crossing area without crossing the red light. Dubai Police
  (2019): drivers forced to cross a red light while giving way are exempted after video review.
  [S12, S15, S13] H (see Conflicts)
- F78. You have green and an emergency vehicle is approaching the junction from another road: stop and
  let it cross; emergency vehicles may cross a red light with caution. [S14, S28] H
- F79. Roundabout: see F12. [S12, S14] H
- F80. Never follow emergency vehicles; driving off behind them to use the gap is treated as a violation
  by Dubai Police. [S12, S13, S16] H

### Vulnerable road users (مستخدمو الطريق المعرضون للخطر)
- F81. Cyclists and motorcyclists are small and hard to see; head checks; at least 1 m when overtaking.
  [S5, S6] H
- F82. Heavy vehicles: blind spots (F54), need more room to turn, may use more than one lane, longer
  stopping distance. [S5] H
- F83. Animals: reduce speed when approaching or passing animals (Art 39). [S3] H

### Parking and stopping (الوقوف)
- F84. Art 49 "لا يجوز الوقوف (الانتظار) في الأماكن الآتية": pedestrian crossings and pavements; bridges,
  overpasses, tunnels; where the vehicle hides traffic lights or signs; in front of entrances and exits
  of houses, car parks, fuel stations, hospitals, first-aid centres, fire and police stations; military
  areas, schools, colleges, institutes; where it blocks another parked vehicle; residential areas for
  heavy vehicles; less than 15 m from intersections, squares, roundabouts, or in front of public
  transport stops. [S3, S4] H
- F85. Stop gradually, as near as possible to the right edge of the road and parallel to it (Art 47). [S3] H
- F86. No random stopping that blocks traffic (Law Art 5 clause ي); no parking in prohibited places
  (clause ز). [S1] H
- F87. People of Determination bays: permit holders only; no parking in front of fire hydrants. [S24] M
- F88. Leaving a parked position: mirrors, signal, head check, give way to all traffic (F23). [S6, S3, S5] H
- F89. Automatic car: select P when parking. [S5] M
- F90. Vehicle stopped at night on an unlit road: warn others with lights or a reflective triangle
  (Art 64). [S3] H

### Lights and horn (الأضواء والمنبه)
- F91. Headlights from sunset to sunrise, and in daytime when visibility is not sufficient (Art 63). [S3] H
- F92. Low beam in residential / populated areas; high beam only on unlit outer roads; not toward
  vehicles coming from the opposite direction (Art 65; RTA). [S3, S5] H
- F93. Hazard lights: only for emergencies (breakdown, stationary vehicle, crash ahead), never while
  driving in fog or rain. [S22, S23] H
- F94. Fog: low beam, not high beam. [S22, S23] H
- F95. Horn: avoid unnecessary noise (Art 10); prohibited repeatedly or in a disturbing way; near
  hospitals, schools and places of worship; in residential areas from midnight until 6 a.m.; while the
  vehicle is parked (Art 11). [S3, S4, S6 p.96] H

### Turning (الانعطاف)
- F96. Signal your intention in sufficient time before turning or changing lanes (Art 59). No official
  figure in seconds or metres. [S3, S6] H
- F97. Right turn: approach as close as possible to the right edge; keep to the right of your lane. [S3,
  S6 p.140] H
- F98. Left turn: F21. U-turn: F22; start from the leftmost lane or the marked U-turn lane (inferred from
  Art 59, M). [S3, S6]
- F99. Slow down to the utmost when changing direction; stop for pedestrians (Art 36). [S3] H
- F100. Reversing only when necessary, with a signal, without obstructing traffic or exposing others to
  risk (Art 61). [S3] H

## 4. Conflicts

1. Following distance. RTA handbook (S5, 2016; cited again by Gulf News S21 in 2026): at least 2 seconds
   in good conditions, more in poor ones; RTA Arabic handbook: 4 seconds in rain (S6, S7); Abu Dhabi
   Police: double in fog (S22). RoadSafetyUAE (NGO, S29) teaches 3 seconds / 5 in bad weather, copied from
   the California DMV. Used: RTA (2 s minimum, 4 s rain, double in fog). Arabic note in items.
2. Emergency vehicle at a red light. Dubai Police (S12, 2019): give way without crossing the red signal.
   Sharjah Police (S15, 2025): may move forward carefully into the pedestrian area, not across the red.
   Dubai Police (S13, 2019): drivers forced to cross red while giving way are exempted after video
   review. Used: "make space without crossing the red light", with a note.
3. Truck blind spots. RTA English handbook (S5) says "beside the truck's left door". UAE trucks are left-hand
   drive, so the left door is the driver's side; this line looks inherited from a left-hand-traffic
   handbook (the same page compares distances to cricket pitches). Used: generic wording (front, behind,
   both sides, mirror rule); no side named.
4. Pedestrian crossing ban. Law text (S1): roads whose set speed "تزيد على 80" (more than 80). Gulf News (S27)
   wrote "80 km/h or more". Used the law text.
5. Straight ahead on a 2-lane roundabout. RTA (S6): approach in the lane that leads to your exit. Excellence
   (S25): right lane or left lane depending on the exit. No single-lane answer is asked in the JSON.
6. Speed limits by road type. RTA 2016 (S5): urban 40/60/80, highways 100/120; RTA 2012 (S6) lists 25 for
   parking/service roads and heavy vehicles 80 on highways; current posted limits differ by road (Abu
   Dhabi has 140 km/h roads). Used: "the sign rules", RTA 2016 figures as typical values only.
7. Hazard lights while moving. No legal text found; Abu Dhabi Police advise against it in fog (S22);
   Khaleej Times (S23) says it is fineable. Used the police advice, without fine amounts.

## 5. Unverified (kept out of the JSON)

- Wheel direction when parking on a slope (towards / away from the kerb): no UAE source found; only
  foreign (US, UK) material.
- Official signalling time or distance before a turn (for example "3 seconds" or "30 m"): none found; RTA
  and Art 59 say "in sufficient time".
- Right turn on red at signal-controlled junctions (without a slip lane or filter): not verified.
- Exact distances from fire hydrants or pedestrian crossings in metres: none found (only "in front of"
  a hydrant and "on" crossings).
- Speed camera buffers ("+20"): not official; excluded.
- 3-second rule: NGO only (S29).
- Lane change ban in tunnels: not found (only no stopping in tunnels, Art 49).
- Fog lights rules (front / rear): no official text found; only advice in S23.
- U-turn priority versus right-turners from the opposite side at signalised junctions: not found.
- Delivery motorbike lane restrictions in Dubai (leftmost lanes): not verified.
- Parking under Dubai Metro tracks (RTA towing): headline seen, not read.
- Space to leave to the car ahead when stopped in a queue ("see its rear tyres"): no UAE source.
- Merging "zip" technique when two lanes become one: no UAE source; only generic safe lane change used.
- Whether the new executive regulation of Decree-Law 14/2024 has been issued: headline S30 suggests not.
