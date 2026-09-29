# Safety research notes (module `safety`)

Owner: safety agent. Researched 2026-09-29. Output bank: `/home/claude/miqwad/content/q_safety.json`.
Topics owned: `weather, night, hazard, emergency, vehicle, driver`.
Scope: beginner, automatic car, Dubai (RTA) and Sharjah (Sharjah Police / SDI). The UAE drives on the RIGHT.

Method note: primary sources were the two RTA handbooks (S1, S2), the Sharjah Driving Institute handbook
(S56), the federal traffic law (S3) and police statements (Abu Dhabi, Dubai, Sharjah). WebFetch could only read
the first ~52 pages of S1 (later chapters such as freeways, collisions and Part 6 eco-driving were not
readable). The session web-search budget ran out part way, so a few topics (Ramadan statistics, sinking-car
escape) could not be sourced and are listed under "Unverified". Fines are owned by the law agent; they appear
here only inside explanations or cards, always with a source.

## 1. Sources

| id | title | publisher | date | url |
|---|---|---|---|---|
| S1 | Light Motor Vehicle Handbook: A Guide to Safe Driving (8th ed.) | RTA Dubai (hosted by Drive Dubai) | 2024-06 | https://www.drivedubai.ae/public/uploads/downloads/20240612110831RTA-Handbook-Light-Motor-Vechicle-English.pdf |
| S2 | Driving Safely in Dubai (First Edition) | RTA Dubai Licensing Agency | undated | https://licensing.rta.ae/handbook/DrivingSafelyInDubaiEN.pdf |
| S3 | Federal Decree-Law No. 14 of 2024 on Traffic Regulation (art. 5, 20, 27, 32, 40) | UAE Legislation portal | 2024-09 | https://uaelegislation.gov.ae/en/legislations/2598/download |
| S4 | شرطة أبوظبي تحذر من الاستخدام الخاطئ للإشارات الرباعية بالمركبات أثناء الضباب | Abu Dhabi Police | 2018-11 | https://www.adpolice.gov.ae/ar-AE/Media-Center/News/2021/07/01/News_25618 |
| S5 | UAE: Driving with hazard lights on during fog? You could get fined | Khaleej Times | 2025-11-20 | https://www.khaleejtimes.com/uae/weather/driving-fog-hazard-lights-tips |
| S6 | How to drive safely in UAE fog | The National | 2026-02-11 | https://www.thenationalnews.com/lifestyle/motoring/2026/02/11/how-to-drive-safely-in-uae-fog-tips-for-motorists-in-reduced-visibility/ |
| S7 | Abu Dhabi fog alert: speed limit reduced on major roads | Gulf News | 2026-09-27 | https://gulfnews.com/uae/abu-dhabi/abu-dhabi-fog-alert-speed-limit-reduced-on-major-roads-police-issue-safety-tips-1.500689257 |
| S8 | شرطة دبي تحدد 8 إرشادات للقيادة خلال الضباب | الإمارات اليوم | 2026-02-26 | https://www.emaratalyoum.com/local-section/other/2026-02-26-1.2019337 |
| S9 | 4 مسببات رئيسة لحوادث الضباب على الطرق (MOI, Abu Dhabi Police) | الإمارات اليوم | 2024-10-31 | https://www.emaratalyoum.com/local-section/other/2024-10-31-1.1893559 |
| S10 | UAE low visibility on the road: safety rules for fog, sandstorms | Gulf News | 2022-03-11 | https://gulfnews.com/uae/transport/uae-low-visibility-on-the-road-follow-these-safety-rules-for-driving-in-fog-sandstorms-1.86313361 |
| S11 | Tips for driving in UAE rains (9 tips) | Gulf News | 2025-12-14 (upd.) | https://gulfnews.com/living-in-uae/transport/know-when-to-use-your-hazard-lights-check-wipers-brakes-and-lights-9-tips-to-remember-when-driving-in-the-rain-1.1604839271383 |
| S12 | Weather-related traffic fines every motorist must know | Gulf News | 2026-03-23 | https://gulfnews.com/living-in-uae/transport/uae-fog-alert-5-weather-related-traffic-fines-every-motorist-must-know-1.500305005 |
| S13 | How to drive safely as UAE hit by heavy rain (Dubai Police tips) | The National | 2023-11-17 | https://www.thenationalnews.com/uae/2023/11/17/rain-thunderstom-uae-drive/ |
| S14 | شرطة الشارقة تكثف انتشار دورياتها أثناء الأمطار | الشارقة 24 | 2026-03-23 | https://sharjah24.ae/en/Articles/2026/03/23/AL053 |
| S15 | نصائح إذاعية للسائقين بالقيادة الآمنة أثناء التقلبات الجوية | Abu Dhabi Police | 2012-03 | https://www.adpolice.gov.ae/ar-AE/Media-Center/News/2021/06/29/Drivers-Are-Advised-Through-Radio-to-Drive-Safely-During-Bad-Weather- |
| S16 | 5 سنوات العمر الافتراضي لإطارات السيارات (هيئة المواصفات والمقاييس) | الإمارات اليوم | 2013-06-12 | https://www.emaratalyoum.com/local-section/other/2013-06-12-1.582854 |
| S17 | Death in minutes: RTA tips for safe summer drive | Khaleej Times | 2025-07-04 | https://www.khaleejtimes.com/uae/transport/dubai-safe-summer-drive-tips |
| S18 | Tyre safety in the UAE during the summer | Gulf News | 2023-08-14 | https://gulfnews.com/living-in-uae/transport/tyre-safety-in-the-uae-how-you-can-stay-safe-during-the-summer-1.1622990545151 |
| S19 | كم يبلغ العمر الافتراضي للإطارات؟ | Michelin Middle East | undated | https://middle-east.michelin.com/ar/auto/advice/change-tyres/how-long-do-tyres-last |
| S20 | Dubai Police tips to handle tyre burst while driving | Khaleej Times | 2024-07-28 | https://www.khaleejtimes.com/uae/transport/dubai-police-issue-safety-tips-guidelines-to-handle-tyre-burst-while-driving |
| S21 | What to do if your car's cruise control fails? Dubai Police advisory | Khaleej Times | 2024-07-14 | https://www.khaleejtimes.com/uae/uae-what-to-do-if-your-cars-cruise-control-fails-dubai-police-issue-advisory |
| S22 | Dubai Police rescue driver after cruise control failure | The National | 2025-10-20 | https://www.thenationalnews.com/news/uae/2025/10/20/dubai-police-rescue-driver-after-cruise-control-failure-on-emirates-road/ |
| S23 | الأمور الواجب اتباعها عند تعطل فرامل السيارة | dubizzle (UAE) | 2022-04-01 | https://www.dubizzle.com/blog/cars/car-brake-failure/ |
| S24 | What to do if your brakes fail (automatic, manual, EV) | RACV | 2026-09 | https://www.racv.com.au/royalauto/transport/cars/what-to-do-if-your-brakes-fail.html |
| S25 | Antilock Brakes and How They Work | AARP | 2013-09-03 | https://www.aarp.org/auto/driver-safety/antilock-brakes-know-how-they-work/ |
| S26 | Anti-Lock Brake Systems (Tailgate Talk) | Oregon DOT | undated | https://www.oregon.gov/odot/Programs/T2/TailgateTalks/AntiLockBrakes.PDF |
| S27 | 6 إجراءات يجب اتخاذها عند تعطل المركبة (شرطة أبوظبي) | الإمارات اليوم | 2024-04-03 | https://www.emaratalyoum.com/local-section/accidents/2024-04-03-1.1840797 |
| S28 | 8 safety tips when vehicle breaks down in the middle of the road | Khaleej Times | 2024-04-02 | https://www.khaleejtimes.com/life-and-living/uae-8-safety-tips-to-follow-when-vehicle-breaks-down-in-the-middle-of-the-road |
| S29 | Vehicle Break Down: What to do? | RoadSafetyUAE | undated | https://www.roadsafetyuae.com/vehicle-break-down/ |
| S30 | Vehicle Fire | RoadSafetyUAE | 2022-06-06 | https://www.roadsafetyuae.com/vehicle-fire/ |
| S31 | What you should do in the event of a vehicle fire | The National | 2016-09 (mod. 2021-06) | https://www.thenationalnews.com/uae/transport/what-you-should-do-in-the-event-of-a-vehicle-fire-1.211501 |
| S32 | 10 tips to prevent car fire caused by summer heat (Abu Dhabi Police) | Khaleej Times | 2023-07-21 | https://www.khaleejtimes.com/uae/uae-10-tips-on-how-to-prevent-car-fire-caused-by-summer-heat-police-issue-advisory |
| S33 | Safe Summer campaign on vehicle fire risks (ADP, MOI) | Gulf News | 2025-07-12 | https://gulfnews.com/uae/emergencies/safe-summer-campaign-launched-to-tackle-rising-vehicle-fire-risks-in-uae-1.500195578 |
| S34 | New warning sign must for all vehicles (RTA: triangle for registration) | Gulf News | 2009-09-01 | https://gulfnews.com/amp/story/uae%2Ftransport%2Fnew-warning-sign-must-for-all-vehicles-1.505934 |
| S35 | Pre-Drive Vehicle Check | RoadSafetyUAE | undated | http://www.roadsafetyuae.com/pre-drive-vehicle-check/ |
| S36 | Hard Shoulder for Emergencies Only | RoadSafetyUAE | undated | http://www.roadsafetyuae.com/hard-shoulder-for-emergencies-only/ |
| S37 | Complete Guide to Car Dashboard Warning Lights | Jeep UAE | undated | https://www.jeep-dubaiuae.com/en/news/understanding-car-dashboard-warning-lights-a-complete-guide/ |
| S38 | Car Warning Dashboard Lights Explained | Kelley Blue Book | 2025-04-16 | https://www.kbb.com/car-advice/car-warning-dashboard-lights-explained |
| S39 | Automatic transmission | Wikipedia | accessed 2026-09 | https://en.wikipedia.org/wiki/Automatic_transmission |
| S40 | Head restraint (citing IIHS) | Wikipedia | accessed 2026-09 | https://en.wikipedia.org/wiki/Head_restraint |
| S41 | Air Bags | NHTSA (US) | accessed 2026-09 | https://www.nhtsa.gov/vehicle-safety/air-bags |
| S42 | Blind spot (vehicle) | Wikipedia | accessed 2026-09 | https://en.wikipedia.org/wiki/Blind_spot_(vehicle) |
| S43 | Car overheating: what to do | RAC | 2026-02-03 | https://www.rac.co.uk/drive/advice/car-maintenance/car-overheating/ |
| S44 | Radiator (engine cooling) | Wikipedia | accessed 2026-09 | https://en.wikipedia.org/wiki/Radiator_(engine_cooling) |
| S45 | Turn Around Don't Drown | US National Weather Service | accessed 2026-09 | https://www.weather.gov/safety/flood-turn-around-dont-drown |
| S46 | Floods | Ready.gov (FEMA) | accessed 2026-09 | https://www.ready.gov/floods |
| S47 | Dh5,000 fine for leaving children unattended in car (ADP) | Gulf News | 2022-08-19 | https://gulfnews.com/uae/dh5000-fine-for-leaving-children-unattended-in-car-abu-dhabi-police-warn-in-safety-drive-1.89988087 |
| S48 | Parents warned against leaving children alone in vehicles (ADP) | Khaleej Times | 2025-05-25 | https://www.khaleejtimes.com/uae/summer-heat-police-warn-leaving-children-inside-car |
| S49 | Ecodriving | Wikipedia | accessed 2026-09 | https://en.wikipedia.org/wiki/Ecodriving |
| S50 | Police issue fog warning after 21-car pile-up in Sharjah | The National | 2020-09-21 | https://www.thenationalnews.com/uae/transport/police-issue-fog-warning-after-21-car-pile-up-in-sharjah-1.1081032 |
| S51 | Understeer and oversteer | Wikipedia | accessed 2026-09 | https://en.wikipedia.org/wiki/Understeer_and_oversteer |
| S52 | Dh500 fine and black points for hazard lights during fog (ADP) | Gulf News | 2018-11-01 | https://gulfnews.com/uae/transport/dh500-fine-and-black-points-for-driving-with-hazard-lights-on-during-fog-in-uae-1.2146717 |
| S53 | Abu Dhabi: Dh500 fine, 4 black points for expired tyres | Gulf News | 2022-07-16 | https://gulfnews.com/uae/abu-dhabi-dh500-fine-four-black-points-for-driving-with-tyres-past-their-expiry-date-1.89275067 |
| S54 | Essential Guide to Car Dashboard Symbols | Pitstop Arabia (UAE car service) | undated | https://www.pitstoparabia.com/en/news/car-dashboard-symbols |
| S55 | Skid (automobile) | Wikipedia | accessed 2026-09 | https://en.wikipedia.org/wiki/Skid_(automobile) |
| S56 | Basics of Driving, 4th edition (handbook) | Sharjah Driving Institute | 2021 | https://www.sdi.ae/public/uploads/downloads/20211205122542Driving-Handbook-English.pdf |
| S57 | Tips For New Drivers | Sharjah Driving Institute | 2026-04 | https://www.sdi.ae/public/uploads/downloads/20260414084444Tips-For-New-Drivers.pdf |

Other pages read but not cited in the bank: MOI fog news (robots blocked), Abu Dhabi fog awareness initiative,
Gulf News rain fines duplicate, Arabian Business sandstorm page (HTTP 405), RTA PTT-LMV presentation (.ppsx,
binary, unreadable).

## 2. Fact sheet (confirmed procedures)

Confidence: high = official/institute source or two solid sources agree; medium = one decent source.
"Seeds" in section 3 turn these into animated hazard scenarios.

### Weather: fog
- H1. Fog is a cloud at ground level; it forms mostly in early mornings, especially when the season changes; visibility can fall to a few metres. [S1, S2] high
- H2. Slow down gradually. Drive at a speed that lets you stop within the distance you can see (in dense fog even 20 to 30 km/h). [S1, S6] high
- H3. Lights: dipped (low) beam plus fog lights if fitted. Never high beam (it reflects off the droplets). SDI: no full beam and no parking lights alone in fog. [S1, S9, S10, S56, S8] high
- H4. Hazard lights must NOT be used while moving in fog or rain. Allowed only when stopped (right shoulder or off the road), at a crash, or to warn of a real danger ahead. Reason: drivers behind cannot see your indicators and may think you are stationary. Violation reported as AED 500 + 4 black points (ADP citing art. 104 of Ministerial Resolution 178/2017; repeated in 2025 and 2026 press). [S4, S52, S5, S6, S11, S9] high
- H5. Increase following distance a lot (press quoting Dubai Police and RoadSafetyUAE: from 3 s to at least 5 s in reduced visibility). [S10, S13] medium for the number; principle high [S1]
- H6. No overtaking and no lane changes in fog. Stay in lane using lane lines and the right road edge or kerb as a guide (SDI). [S9, S7, S6, S56] high
- H7. No sudden braking. Never stop in the traffic lane: you can become the first link in a chain collision. [S1, S8] high
- H8. If fog is too dense: leave the road completely to a safe place away from traffic (for example a petrol station), then switch on hazard lights; stand behind a barrier. [S1, S4, S6, S11] high
- H9. Keep windows and mirrors clean; use demister, AC and wipers. [S1, S8, S56] high
- H10. Abu Dhabi Police cut limits to 80 km/h on many major roads in fog and show the new limit on electronic speed signs; the displayed limit applies. Roads named in Sept 2026 include Al Shuwaib Rd, Sheikh Tahnoun bin Mohammed Rd, Sheikh Mohammed bin Rashid Rd, Abu Dhabi-Al Ain Rd, Sheikh Khalifa bin Zayed International Rd. [S7, S9] high
- H11. MOI and ADP: four main causes of fog crashes are ignoring low visibility, too little distance, speeding and wrong overtaking. Abu Dhabi stops heavy vehicles and buses during fog. [S9] medium
- H12. Example: 21-vehicle pile-up in fog on the Dubai Bypass Road in Sharjah (towards Umm Al Quwain), 21 Sept 2020, about 7:30 am. Sharjah Police: keep safe speed and distance, stop in a safe place if conditions are hazardous. [S50] high
- H13. Dubai Police fog guidelines (Feb 2026): safe distance, no sudden braking, fog lights, follow weather warnings, drive below the posted limit, wipers, no phone, demister. [S8] high

### Weather: rain and floods
- H14. The first rain after a long dry spell is the most slippery (oil and dust rise), especially in the first minutes. [S1, S2] high
- H15. Slow down, avoid harsh braking, keep much more distance (SDI: at least double; RTA aquaplaning advice: at least 4 s). [S1, S2, S56, S14] high
- H16. Use low-beam headlights in the day when visibility is poor. [S1, S3, S13] high
- H17. No hazard lights while driving in rain (same fine as H4); only at a standstill. [S11, S13] high
- H18. Aquaplaning: tyres ride on water, steering goes light, the rear may weave. Prevent: below 80 km/h in rain (RTA), good tread, drive in the tracks of the car ahead but at least 4 s behind. If it happens: grip the wheel, no braking or accelerating, ease off the accelerator, then brake or accelerate gently once grip returns. [S1, S2] high
- H19. Do not use cruise control on wet roads. [S13] medium
- H20. Floods: avoid. A saloon car must not enter water deeper than half the tyre height. Never drive through fast-moving water even at or below half the tyre (it can sweep the car away). About 30 cm of moving water can carry most cars; 15 cm can knock an adult over. If lane markings are under water, find another route. [S1, S13, S45, S46] high
- H21. Wadis: keep away from valleys and flood channels in rain (Sharjah Police, Mar 2026). Entering a valley while floods run: AED 2,000 + 23 black points + 60-day impound; gathering near valleys or dams: AED 1,000 + 6 points (Ministerial Resolution 227/2023 per Gulf News 2026). Decree-Law 14/2024 art. 40 aggravates penalties for driving in a valley while floods run. [S14, S12, S3] behaviour high, fines medium
- H22. Trapped in fast-moving water: stay in the car and call 999; if water rises inside, get onto the roof (FEMA). [S46] medium
- H23. Do not film the weather while driving (phone offence AED 800 + 4 points). [S12] high

### Weather: dust, wind, heat, glare
- H24. Sand on the road reduces grip and hides the road edge; dust from oncoming vehicles hides hazards. Slow down, keep distance. [S1, S2] high
- H25. Dust storms: slow down, normal (low) lights, more distance, hazard lights only when fully stopped; zero visibility: stop off the road with hazard lights; do not park under trees, billboards or near construction sites; postpone trips. [S15, S10] high
- H26. Close the windows and run the AC in dust. [S10] medium
- H27. Summer: look after the engine (coolant, oil), AC and brakes; park in shade. [S2, S17] high
- H28. Tyre bursts rise on hot roads, especially with worn, old, under-inflated or overloaded tyres. Pressure rises about 0.1 bar per 10 degrees C. [S17, S18, S20, S56] high (0.1 bar: medium)
- H29. Tyre age limit in the UAE: 5 years from the manufacture date (ESMA standard, RTA 2025 tips). [S16, S17, S18] high
- H30. DOT date code: last four digits = week + year (2324 = week 23 of 2024). [S19] medium
- H31. Never leave a child alone in a parked car, even briefly, even with AC on: cabin heat becomes deadly within minutes (ADP: up to 25 degrees C above outside). Child Rights Law (Wadeema) punishes it with fine and/or prison. [S17, S47, S48] high
- H32. Do not leave lighters, perfumes, hand sanitisers, power banks, pressurised cans or gas cylinders in a parked car in summer. [S32, S33] high
- H33. Sun glare at sunrise and sunset: slow down, sunglasses, sun visor, clean windscreen. [S1, S2] high
- H34. A mirage on hot roads can look like water. [S56] medium

### Night
- H35. Lights on from sunset to sunrise (front and rear) and in poor daytime visibility. [S1, S2, S3] high
- H36. Night crash risk is higher (SDI: death rate about three times). Pedestrians in dark clothes and unlit cyclists are hard to see; speed and distance are harder to judge. [S1, S2, S56] high
- H37. Drive so you can stop within the distance you can see. [S1] high
- H38. High beam only on unlit roads when needed; never when a vehicle is coming the other way; dip when following another vehicle. SDI: dip within 200 m of an approaching vehicle. [S1, S56] high
- H39. If dazzled: do not look at the lights; look at the right edge of the road, keep to the right of your lane, slow down; stop if you cannot see. [S1, S56] high
- H40. Use the night setting of the interior mirror against glare from behind. [S1] high
- H41. Law: slow down when you meet animals or at animal crossings (camels). [S3] high
- H42. Keep windscreen, mirrors and headlights clean; check high and low beams before night trips. [S1, S56, S17] high

### Hazard perception
- H43. Hazard = anything, moving or not, that can make you change direction, position or speed. [S1] high
- H44. Scan far and wide; anticipate other road users; control speed and cover the brake (shorter reaction time); know your own condition; stay calm. [S1] high
- H45. Defensive driving = concentration (100%), observation (front, sides, rear), anticipation, communication (signals, horn, lights, hazard lights, lane position). [S1] high
- H46. Anticipate other people's mistakes and be ready to react (SDI). [S57] high
- H47. Children are small, hard to see and unpredictable; older pedestrians are slower and may not see you. [S1] high
- H48. Slow down or stop if needed so school and public buses can stop for passengers; children may cross suddenly near school buses. [S1] high
- H49. Motorcycles and bicycles are hard to see, may use the full lane; overtake only with at least 1 m clearance. [S1, S2] high
- H50. Trucks: if you cannot see the driver in his mirror, he cannot see you; blind spots directly in front, a long way behind, and alongside; do not drive beside a truck for long (SDI); long vehicles may need more than one lane to turn; never pass on the inside (right) a truck or bus signalling right; leave at least 1.5 m when passing a truck. [S1, S2, S56] high (see C7)
- H51. Signs of a phone-distracted driver: drifting or straddling lanes, speeding up and slowing for no reason, poor following distance. [S1] high
- H52. Head check: over the shoulder through the rear side window, move the head not the shoulders, eyes off the road under 1 s, do not swerve; before reversing, lane change, merging, pulling out; never while vehicles ahead are braking. [S1, S56] high
- H53. Stopping distance of an average car, normal road: 60 km/h up to 33 m, 100 km/h up to 87 m, 120 km/h up to 130 m. [S1] high
- H54. Following distance: see C1.
- H55. 65 km/h in a 60 zone about doubles serious-crash risk; 70 in a 60 zone more than 4 times. [S1] high
- H56. Law art. 5: slow down near schools, health facilities, poor visibility, animal crossings, crowded areas, rain and flowing valleys; stop for pedestrians on crossings; stop only on the hard shoulder (right side), away from junctions, slopes and bends. [S3] high
- H57. Give way to pedestrians crossing the road you are turning into. [S2] high

### Emergencies
- H58. Police 999, Civil Defence (fire) 997. [S2] high
- H59. Tyre burst (Dubai Police): grip the wheel firmly; ease off the accelerator gradually; brake gently (no hard braking, avoids swerving); check the right side is clear and steer to the roadside; hazard lights. [S20] high
- H60. Stuck accelerator or failed cruise control (Dubai Police): stay calm, seat belt on, hazard lights, call 999; shift to N and brake firmly and steadily; apply the handbrake gradually while holding the wheel. (DP also mentions switching the engine off and on and shifting between N and D; see C8.) Police may clear a safe corridor. [S21, S22] high
- H61. Brake failure: pump the pedal; ease off the accelerator (automatic downshifts), lower gear or paddles if possible; handbrake gradually (release if it skids); hazard lights and horn; steer to a safe area; do not switch off the engine before stopping (steering gets heavy). [S23, S24] medium
- H62. ABS emergency stop: press hard and keep pressing, do not pump; pedal pulsation and noise are normal; steer around the obstacle. ABS can lengthen stops on loose gravel. [S25, S26, S1] high
- H63. No ABS, wheels locked: release briefly and reapply (cadence braking) to steer again. [S26, S55] medium
- H64. Rear skid: ease off the accelerator, no hard braking, steer smoothly toward where you want to go (same side the rear slides to). [S51, S25] medium
- H65. Breakdown: hazard lights; get off the road as far as possible (nearest exit; right shoulder only if necessary, ideally beyond it); P + handbrake; exit on the right (away from traffic); wait behind the barrier, never between the car and traffic, never inside the car on fast roads; warning triangle (RTA 50 m, SDI about 100 m, see C2); call 999; no repairs on the live road. [S2, S27, S28, S29, S56] high
- H66. Stopping in the middle of the road: AED 1,000 + 6 black points (law agent owns this). [S28] medium
- H67. Hard shoulder is for breakdowns and emergencies only; not for parking, reversing to a missed exit, pick-ups, photos, gatherings or bypassing traffic. [S36] high
- H68. Car fire: pull over, engine off, everyone out, move at least 30 m away, warn traffic, call 997 or 999; do not open the bonnet; extinguisher only for a small fire and if you know how; never go back for belongings; do not drive on hoping the wind blows it out; no water. [S2, S30, S31] high
- H69. EV (RTA): acceleration is instant, press smoothly. Fire prevention: original chargers, avoid long parking in strong sun, let the battery cool about 1 h before charging, minimise fast charging. EV fire: stop, evacuate, do not touch high-voltage parts, call 997 or 999, triangle 50 m, move 30 m away. [S2] high
- H70. Overheating: pull over safely, hazard lights, wait until it cools (about 30 min); never open the radiator or expansion cap hot; check coolant after cooling; heater on full can shed heat. [S43, S44, S56, S37, S38] high (engine-off timing: see C8)
- H71. Carry a warning triangle (required for Dubai registration since 2009), a small ABC powder extinguisher (1 to 2 kg, in the cabin, not the boot) and a first aid kit. [S34, S33, S35] medium

### Vehicle
- H72. Only drive a vehicle in good technical condition. [S1, S3] high
- H73. Weekly checks: tyre pressure and tread, high and low beams, tail, brake and reverse lights, indicators, hazard lights, fluid levels (check cold, between MIN and MAX), glass, wipers, mirrors, horn, seat belts. [S1, S2, S56] high
- H74. Tyres: check pressure cold, per the door placard; RTA minimum safe tread 1.5 mm (SDI: replace below 6 mm, see C3); check sidewalls for cracks and bulges; SDI: use GCC-spec tyres, never used or reconditioned tyres. [S1, S2, S56, S53, S37] high
- H75. Dashboard colours: red = serious, stop safely or get help; amber = check soon; green or blue = system on. Lights come on for a few seconds at start-up and go off; normally all off. [S37, S38, S56] high
- H76. Oil pressure (red): stop and switch off. Battery (red): charging fault. Coolant temperature (red): overheating. Brake (red): handbrake on, low fluid or fault. ABS (amber): ABS off, normal brakes usually work. Airbag: get it checked. Check engine: steady = check soon, flashing = stop safely. TPMS: check and inflate per placard. [S37, S38, S54, S56] high
- H77. Automatic: P (park, only when stopped), R (only when stopped), N, D, 2 / 1 / L (low gears for engine braking on long steep descents); press the brake to leave P (most cars); right foot only for both pedals (SDI); P to D only when stationary. [S39, S56, S21] high
- H78. Parking on a slope: P plus handbrake. [S29, S39, S56] high
- H79. Passing the test in an automatic restricts the licence to automatics. [S1] high
- H80. Seat: knees slightly bent at full pedal travel, arms slightly bent on the wheel, back supported (SDI); at least 25 cm (10 in) from the airbag (NHTSA). [S56, S41] high
- H81. Head restraint: reduces neck injury in rear impacts; high (behind the head, around eye and ear level, not the neck) and close (backset under 10 cm). [S40, S56] purpose high, position medium
- H82. Seat belt: over pelvis, chest and shoulder, not the neck; firm; not twisted; one person per belt. [S1, S56] high
- H83. Side mirrors: a small part of your own car and most of the next lane; still head-check. [S42, S56] medium
- H84. Driver assistance: adaptive cruise is not a collision-avoidance system; keep hands on the wheel; ESP reduces skids; lane and blind-spot systems only assist. [S1] high

### Driver
- H85. Never drive tired. Signs: yawning, drifting, heavy eyes, nodding, varying speed, forgetting the last km, daydreaming. Once fatigue sets in the only fix is to stop and rest or nap. Long trips: sleep well before, break at least every 2 hours (SDI), share driving, plan. [S1, S2, S56] high
- H86. Ramadan: apply H85 and H90 (leave early, accept delays, never rush before iftar). [S1, S2, S56] medium (context)
- H87. Phones: collision risk x4 (RTA), fatal-crash risk x9 (SDI); hands-free is not safer; use only when parked; set navigation before leaving; fine AED 800 + 4 points. [S1, S56, S12, S2] high
- H88. Other distractions: radio, navigation, contacts, texting, eating: anything that takes eyes or hands off. [S1] high (eating medium)
- H89. Alcohol and drugs: zero tolerance; ask a doctor or pharmacist about medicines. [S1, S2] high
- H90. Anger: keep calm and your distance, acknowledge your own mistakes, drive cooperatively, treat others as you want to be treated, plan with spare time; if someone is aggressive, stay away and call police. [S1, S2] high
- H91. Tailgating is extremely dangerous; if tailgated, stay calm, no brake-checking, let them pass when safe. [S1, S2] medium
- H92. Look far ahead, keep the eyes moving, check mirrors. [S1] high
- H93. Eco-driving: smooth acceleration and braking, anticipate, steady speed, correct tyre pressure, remove extra weight and unused roof racks, avoid idling. [S49, S2, S35, S57] high

## 3. Scenario seeds for animated hazard scenes

Each seed: setting / cue / what develops / correct response / typical wrong responses / facts / related items.
All are right-hand traffic; "right" and "left" are the driver's real right and left.

1. Residential street, cars parked on the right. Cue: ball rolls out between two parked cars. Develops: child runs after it. Correct: ease off, cover brake, stop. Wrong: keep speed, horn and continue, swerve into oncoming lane. H44, H47. `safety-hazard-003`
2. School frontage, drop-off time. Cue: children on pavement, gaps between parked cars. Develops: child steps out. Correct: slow, watch gaps. H47, H56. `safety-hazard-004`, `-005`
3. Public bus stopped at a stop on the right, passengers alighting. Develops: passenger crosses in front of the bus. Correct: slow, be ready to stop. H48. `safety-hazard-006`
4. Bus at stop signals left to rejoin. Correct: anticipate, ease off, let it merge if safe. Wrong: race it, horn, pass on the right. H44, H45. `safety-hazard-013`
5. Taxi ahead, person waving on the pavement. Develops: taxi brakes and pulls right. Correct: extend gap, cover brake. H44. `safety-hazard-007`
6. Shopping street, man at kerb away from crossing looking across. Develops: he steps out. Correct: ease off, cover brake. H44, H56. `safety-hazard-008`
7. Mall car park, white reversing lights on a parked car. Develops: car reverses. Correct: stop and wait. H44. `safety-hazard-009`
8. Car park, small child walking with parents. Develops: child darts. Correct: walking pace. H47. `safety-hazard-011`
9. Open sandy lot beside the road, kids playing football, no fence. Develops: ball then child. Correct: slow, ready to stop. H47. `safety-hazard-012`
10. Congested road, delivery motorbike filtering; driver wants to move right. Correct: mirror then head check; wait. Wrong: rely on interior mirror, signal and go. H49, H52. `safety-hazard-014`
11. Villa area, car nose emerging from a walled driveway. Correct: slow, ready to stop. H44. `safety-hazard-015`
12. Highway, alongside a truck, driver's face not visible in its mirror. Correct: drop back or pass, do not linger. H50. `safety-hazard-016`
13. Truck ahead signals right and swings left before the junction. Correct: stay behind; never enter the gap on its right. H50. `safety-hazard-027`
14. Rural road near farms, two camels grazing at the edge. Correct: slow, ready to stop. H41. `safety-hazard-017`; night variant `safety-night-012`
15. Road works, lanes narrowing, workers. Correct: slow, follow temporary signs. H56. `safety-hazard-018`
16. Highway on-ramp merging from the right. Correct: adjust speed or move left if safe. Wrong: close the gap, horn. H45. `safety-hazard-019`
17. Highway, brake lights several cars ahead. Correct: early lift-off, cover brake, gradual slowing. H44, H53. `safety-hazard-020`, `-030`, `-037`
18. Cyclist on the right edge, parked car ahead of him. Develops: cyclist moves left. Correct: slow, give at least 1 m. H49. `safety-hazard-021`
19. Pickup with loose load on the highway. Develops: item falls. Correct: big gap or pass safely. `safety-hazard-022`
20. Car on right shoulder with hazard lights. Develops: person walks round it / car pulls out. Correct: slow, move away if possible, no rubbernecking. H65, H67. `safety-hazard-023`
21. Green light, child on small bike racing toward the crossing. Correct: slow, cover brake. H47. `safety-hazard-024`
22. Reversing out of a bay between two SUVs. Correct: very slow, mirrors plus head turns, stop if anyone appears. H52. `safety-hazard-025`
23. Right turn on green, pedestrians crossing the side road. Correct: give way. H57. `safety-hazard-026`
24. Car ahead weaving and varying speed. Correct: extend gap, do not sit beside it. H51. `safety-hazard-028`
25. Person seated in a parked car. Develops: door opens. Correct: lateral gap, slow. `safety-hazard-029`
26. Right turn into a side street, motorcycle closing on the right. Correct: wait, check, then turn. H49, H52. `safety-hazard-031`
27. Passing a truck in a strong crosswind. Correct: firm grip, 1.5 m lateral gap, do not linger. H50. `safety-hazard-032`
28. Slow car ahead signalling left then right, driver reading buildings. Correct: hang back, pass only when safe. `safety-hazard-033`
29. Driver in left lane approaching a zebra; car in right lane stops before it. Develops: hidden pedestrian steps out. Correct: slow, ready to stop. H56. `safety-hazard-035`
30. Highway, car ahead switches on hazard lights and slows. Develops: queue or crash ahead. Correct: gradual slowing, more distance, check mirrors. H4, H44. `safety-hazard-036`
31. Night, lit highway near housing; person standing on the central barrier. Correct: lift off, cover brake. H36, H44. `safety-night-016`
32. Night, unlit side road, cyclist without lights appears late on the right. Correct: slow, pass with at least 1 m. H36, H49. `safety-night-014`
33. Night, oncoming high beams. Correct: eyes to the right edge, keep right in lane, slow. H39. `safety-night-010`
34. Morning fog bank on a 100 km/h road. Correct: gradual slowing, low beam and fog lights, more distance, no hazard lights while moving; if near-zero visibility leave the road completely. H2 to H8. `safety-weather-028`, `-029`
35. Rain: steering goes light at speed (aquaplaning). Correct: hold wheel, ease off, no brake. H18. `safety-weather-016`
36. Fast water across the road after rain. Correct: do not cross, turn back. H20. `safety-weather-026`
37. Tyre blowout at speed. Correct: grip, ease off, gentle braking, check right, steer to roadside, hazard lights. H59. `safety-emergency-003`, `-008`, `-020`
38. Breakdown in the left lane of a highway. Correct: hazard lights, occupants out carefully to behind the barrier, call 999. H65. `safety-emergency-023`

## 4. Conflicts (and what the bank uses)

- C1. Following distance. RTA LMV handbook (S1, 2024): at least 2 s in good conditions, more at night, wet, heavy load. RTA Driving Safely (S2): at least 3 s (p.6) and 4 s in normal traffic (p.22, trucks section). SDI (S56): two-second rule; at least double when wet or poor visibility. Press quoting Dubai Police (S13, 2023; S10, 2022): 3 s normally, at least 5 s in reduced visibility. Used: "increase a lot" in general items; the 5 s figure only in `safety-weather-032` (level 5, medium, with note). Distance agent owns the base rule.
- C2. Warning triangle distance. RTA Driving Safely (S2): 50 m. SDI handbook (S56): about 100 m. RoadSafetyUAE (S29): at least 100 m on highways. Used: 50 m in `safety-emergency-022` tagged exam `["dubai"]` with a note; card shows both. (The law bank has an SDI 100 m item.)
- C3. Minimum tread depth. RTA S1 and S2: 1.5 mm. SDI S56: change tyres below 6 mm. Michelin and many international rules: 1.6 mm. Used: 1.5 mm in `safety-vehicle-028`, exam `["dubai"]`, distractors avoid 1.6 and 6.
- C4. Tyre age. UAE (ESMA 2013 S16, RTA 2025 S17, Gulf News 2023 S18): max 5 years from manufacture. Michelin (S19): may last up to 10 years with checks after 5. Used: UAE 5-year rule.
- C5. Hazard lights. Police: never while moving in fog or rain (S4, S5, S6, S11). RTA LMV (S1) lists "put on your hazard lights" among aquaplaning steps. Reconciled via ADP's exception for a real danger or loss of control; no item depends on it.
- C6. Flood depth. RTA (S1): do not enter if water is above half the tyre height. Gulf News tips (S11): cross only if water reaches the bumper. Used: RTA rule (`safety-weather-027` note).
- C7. Truck blind spot side. RTA LMV (S1) says "beside the truck's left door". This matches the Australian (left-hand traffic) handbook the RTA text is based on, where the left door is the passenger side. In the UAE trucks are left-hand drive, so the large side blind spot is normally on the right (passenger) side. Used: no item states a side (`safety-hazard-016` note).
- C8. Engine off in emergencies. Dubai Police (S21) include switching the engine off and restarting for a stuck throttle; RACV (S24) says never switch the engine off before stopping during brake failure. For overheating, RAC (S43) says switch off; an SDI extract (S56, garbled text) may say do not switch off a very hot engine. Used: no correct answer or distractor depends on switching the engine off, except brake failure (S23, S24) where "switch off while speeding" is a distractor.
- C9. Phone risk figures. RTA (S1): 4 times more likely to crash. SDI (S56): 9 times higher risk of a fatal crash. Different measures; both used with exam tags (`safety-driver-023` dubai, `safety-driver-024` sharjah).
- C10. Child-in-car penalty. Gulf News 2022 (S47): "Dh5,000 fine" (min); Khaleej Times 2025 (S48): "up to Dh5,000 and/or jail" under Wadeema law. Used: no amount, only "fine or prison".
- C11. Fog speed. Abu Dhabi uses variable limits (80 km/h) on electronic signs (S7). MOI tips (S9) say reduce gradually "to 80 km/h depending on the road". Not confirmed for Dubai or Sharjah roads, so items name Abu Dhabi only.

## 5. Unverified (kept out of the JSON)

- U1. Sinking-vehicle escape sequence (seat belt, window, out, children first): no UAE or authoritative source fetched this session.
- U2. "Test your brakes after driving through water": not found in the RTA handbook text that was readable.
- U3. "Slow down before a bend at night, not in it": not found explicitly.
- U4. Ramadan crash statistics or peak times before iftar: search budget exhausted; only general fatigue guidance used.
- U5. Whether a fire extinguisher and first aid kit are legally mandatory in every emirate (only the 2009 RTA triangle requirement found).
- U6. Current penalty for leaving a child in a car under Decree-Law 14/2024 (the law summary did not show a specific article).
- U7. Ambulance number 998 (widely known; not fetched from an official page by this agent; the law bank cites an Ajman government page for 999, 998, 997, 996).
- U8. Variable fog speed limits on Dubai or Sharjah roads.
- U9. The format of the RTA theory test hazard-perception section (exams agent).
- U10. Heavy-vehicle fog bans outside Abu Dhabi.
- U11. Camel-specific night advice (for example eyes not reflecting light): not sourced; only the legal "slow down for animals".
- U12. RTA LMV Part 6 eco-driving text, freeway chapter and collision chapter (pages after 52 unreadable through WebFetch).
- U13. SDI head-restraint wording "middle in line with eye and ear" (PDF text extraction garbled); used only as "medium" via Wikipedia/IIHS.
- U14. SDI statement on overheating "do not turn off the engine when hot" (garbled extraction; see C8).

## 6. Arabic terms used in the bank (for consistency)

الإشارات الرباعية (الفلاشر) = hazard lights; الأضواء المنخفضة / العالية = low / high beam; أضواء الضباب = fog lights;
مثلث التحذير العاكس = warning triangle; كتف الطريق = hard shoulder; النقطة العمياء = blind spot;
الانزلاق المائي = aquaplaning; مثبت السرعة (كروز كنترول) = cruise control; مثبت السرعة المتكيف = adaptive cruise;
نظام ABS = anti-lock brakes; مسند الرأس = head restraint; ذراع الغيار، P R N D = gear selector;
فرامل اليد = handbrake; لوحة العدادات = dashboard; ضوء كهرماني = amber light; الرادياتير = radiator;
الدفاع المدني 997، الشرطة 999; هيئة الطرق = RTA; معهد الشارقة للسياقة = SDI; قانون وديمة = Child Rights Law.

## 7. Bank statistics (q_safety.json, 2026-09-29)

171 questions, 66 cards, 57 sources.

| topic | questions | L1 | L2 | L3 | L4 | L5 | cards |
|---|---|---|---|---|---|---|---|
| weather | 32 | 6 | 8 | 11 | 5 | 2 | 14 |
| night | 17 | 3 | 6 | 4 | 3 | 1 | 6 |
| hazard | 37 (33 situational) | 4 | 8 | 14 | 10 | 1 | 11 |
| emergency | 29 | 5 | 7 | 9 | 6 | 2 | 13 |
| vehicle | 31 | 6 | 10 | 10 | 4 | 1 | 12 |
| driver | 25 | 3 | 7 | 8 | 4 | 3 | 10 |

Correct-answer positions: balanced per topic (difference at most 1), overall 43/44/42/42; no three identical
positions in a row inside a topic; correct option is strictly the longest in under 10% of items.
Exam tags: 167 both, 3 dubai-only (triangle 50 m, tread 1.5 mm, phone x4), 1 sharjah-only (phone x9).
