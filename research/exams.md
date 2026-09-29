# Exams agent: research notes (licensing journey, three tests, practical guides)

Researched 2026-09-29. Scope: beginner, light vehicle, automatic, Dubai (RTA) and Sharjah (Sharjah Police / SDI).
Output files: `content/exams.json`, `content/q_roadtest.json`.

Tooling notes: the shell has no internet (proxy 403). WebFetch could not open `licensing.rta.ae`
(TLS on robots.txt) nor `moi.gov.ae` (timeout), so the RTA handbook was read from institute-hosted
copies (S3). The session's web-search budget ran out near the end of research; nothing below depends
on a search that could not be run, but a few gaps stayed open (see "Unverified").

## Sources

Official and institute sources (usable in JSON):

| id | title | url | publisher | date |
|---|---|---|---|---|
| S1 | Apply for Booking and Changing a Driving Test Appointment (knowledge test: 40 questions, 30 to pass; 8 h lectures) | https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=510 | RTA Dubai | page updated 2026-09-11 |
| S2 | Apply for or Manage a Driving Licence (steps, eye test, institute contact, ages, fees) | https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=617 | RTA Dubai | accessed 2026-09 |
| S3 | Light Motor Vehicle Handbook: A Guide to Safe Driving, 8th ed. (copy hosted by Dubai Driving Center; older copy on edi-uae.com) | https://www.drivedubai.ae/public/uploads/downloads/20240612110831RTA-Handbook-Light-Motor-Vechicle-English.pdf | RTA Licensing Agency | 2024-06 (upload) |
| S4 | RTA announces full automation of drivers testing at the Smart Yard | https://www.rta.ae/wps/portal/rta/ae/home/news-and-media/all-news/NewsDetails/rta+-announces-full-automatio-of-drivers-testing-at-the-smart+yard | RTA Dubai | 2019-06-23 |
| S5 | Drivers fail Dubai road test due to fear, says RTA | https://gulfnews.com/uae/transport/drivers-fail-dubai-road-test-due-to-fear-says-rta-1.1542225 | Gulf News | 2018-11-08 |
| S6 | Risks recognition test part of Dubai driving course | https://gulfnews.com/uae/transport/risks-recognition-test-part-of-dubai-driving-course-1.1545622 | Gulf News | 2018-09-15 |
| S7 | New theory test for driving licence in Dubai | https://gulfnews.com/uae/transport/new-theory-test-for-driving-licence-in-dubai-1.744736 | Gulf News | page dated 2018-09-16 (story older, about 2011) |
| S8 | «الطرق» ترفع علامة النجاح في فحص القيادة | https://www.emaratalyoum.com/local-section/other/2014-07-26-1.696666 | Emarat Al Youm | 2014-07-26 |
| S9 | اجتياز «اختبار المعرفة» شرط لرخصة القيادة | https://www.albayan.ae/amp/across-the-uae/2010-10-11-1.292115 | Al Bayan | 2010-10-11 |
| S10 | How to Pass the RTA Car Theory Test in Dubai (EN + AR) | https://www.excellencedriving.com/en/blogs/how-to-pass-the-rta-car-theory-test-in-dubai | Excellence Driving (licensed Dubai institute) | updated 2026-09-08 |
| S11 | Car Driving license for Light Motor Vehicle | https://edi-uae.com/en/car-driving | Emirates Driving Institute | accessed 2026-09 |
| S12 | FAQ | https://edi-uae.com/en/faq/ | Emirates Driving Institute | accessed 2026-09 |
| S13 | كيف تجتاز أختبار المواقف بنجاح (7 immediate-fail items) | https://edi-uae.com/ar/driving-tips/Below-mistakes-can-cause-an-immediate-failure-during-your-Parking-Test/ | Emirates Driving Institute | 2019-07-23 |
| S14 | Step-by-step guidelines, Car (LMV) training (two PDFs) | https://edi-uae.com/public/uploads/editor-images/files/2053433534.pdf (also .../20190717161003Step-by-Step_-_Car_(LMV)_training_of_10_Hours.pdf) | Emirates Driving Institute | 2017-09 and 2019-07 |
| S15 | RTA Smart Yard Test: All You Need to Know | https://www.excellencedriving.com/en/blogs/rta-smart-yard-test | Excellence Driving | updated 2025-10-17 |
| S16 | RTA Parking Test: All You Need to Know | https://www.excellencedriving.com/en/blogs/rta-parking-test | Excellence Driving | 2025-02-19 |
| S17 | Automated parking test for trainees launched in Dubai | https://gulfnews.com/uae/transport/automated-parking-test-for-trainees-launched-in-dubai-1.1933838 | Gulf News | 2018-09-16 |
| S18 | Pass or fail? Smart driver testing yard in Dubai to use sensors, high-tech cameras | https://gulfnews.com/amp/story/uae%2Ftransport%2Fpass-or-fail-smart-driver-testing-yard-in-dubai-to-use-sensors-high-tech-cameras-1.2193597 | Gulf News | 2018-11-05 |
| S19 | How Dubai issues 119,000 driving licences in six months (AI smart yards, simulators) | https://gulfnews.com/uae/transport/how-dubai-issues-119000-driving-licences-in-six-months-1.500672928 | Gulf News | 2026-09-13 |
| S20 | What are the most common reasons for failing the RTA road test in Dubai? | https://gulfnews.com/living-in-uae/transport/what-are-the-most-common-reasons-for-failing-the-rta-road-test-in-dubai-1.500455876 | Gulf News (quotes First Driving Centre CEO) | 2026-02-26 |
| S21 | Why UAE residents fail driving tests | https://gulfnews.com/amp/story/uae%2Ftransport%2Fwhy-uae-residents-fail-driving-tests-1.62553524 | Gulf News (quotes Dubai Driving Centre, EDI) | 2019-03-24 |
| S22 | Taking your UAE driving test soon? 5 most common mistakes and how to avoid them | https://gulfnews.com/lifestyle/taking-your-uae-driving-test-soon-5-most-common-mistakes-and-how-to-avoid-them-1.500339753 | Gulf News | 2025-11-10 |
| S23 | UAE lowers driving age: Teens eager to apply for licences as new rules take effect on March 29 | https://www.khaleejtimes.com/uae/uae-driving-licence-age-lowered-17-year-olds-line-up-to-get-permits | Khaleej Times | 2025-03 |
| S24 | UAE: Can 17-year-olds start driving lessons yet? Parents rue lack of clarity | https://www.gmdc.ae/can-17-year-olds-start-driving-lessons-in-uae/ | Khaleej Times (repost by Galadari) | 2025-06-30 |
| S25 | Car Driving Courses (EN and AR pages) | https://www.sdi.ae/en/car-driving/ and https://www.sdi.ae/ar/car-driving | Sharjah Driving Institute (Sharjah Police) | accessed 2026-09 |
| S26 | Parking Test: Check items | https://www.sdi.ae/en/parking-test-check-items | Sharjah Driving Institute | accessed 2026-09 |
| S27 | كيف تجتاز أختبار المواقف بنجاح | https://www.sdi.ae/ar/below-mistakes-can-cause-an-immediate-failure-during-your-parking-test | Sharjah Driving Institute | 2020-04-13 |
| S28 | Prices & details of training (PDF) | https://www.sdi.ae/public/uploads/downloads/20250930151559Prices-amp-details-of-training.pdf | Sharjah Driving Institute | 2025-09-30 |
| S29 | Basics of Driving, 4th edition (handbook PDF) | https://www.sdi.ae/public/uploads/downloads/20211205122542Driving-Handbook-English.pdf | Sharjah Driving Institute | 2021 |
| S30 | Tips For New Drivers (PDF) | https://www.sdi.ae/public/uploads/downloads/20260414084444Tips-For-New-Drivers.pdf | Sharjah Driving Institute | 2026-04-14 |
| S31 | Sharjah Police streamlines driving licence procedure | https://gulfnews.com/uae/sharjah-police-streamlines-driving-licence-procedure-1.102772183 | Gulf News | 2024-05-27 |
| S32 | Sharjah: Now clear your theory test online for driving license | https://gulfnews.com/uae/sharjah-now-clear-your-theory-test-online-for-driving-license-1.87249809 | Gulf News | 2022-04-24 |
| S33 | Sharjah Police allows final driving test from applicant's whereabouts for Dh100 | https://gulfnews.com/uae/sharjah-police-allows-final-driving-test-from-applicants-whereabouts-for-dh100-1.78142883 | Gulf News | 2021-03-27 |
| S34 | إجراء فحص رخصة القيادة في الشارقة بمكان وجود المتعامل قريبا | https://www.emaratalyoum.com/local-section/other/2021-02-01-1.1449600 | Emarat Al Youm (quotes Sharjah Police) | 2021-02-01 |
| S35 | UAE driving licence: One-day test initiative launched by Sharjah Police | https://gulfnews.com/uae/transport/uae-driving-licence-one-day-test-initiative-launched-by-sharjah-police-1.1688832769142 | Gulf News | 2023-07-11 |
| S36 | Garage Parking Guide: Tips To Master Reverse Car Parking | https://www.binyaber.com/en/blogs-news/garage-parking-guide-tips-to-master-reverse-car-parking/ | Bin Yaber Driving Institute | 2025-09-24 |
| S37 | How To Pass Your RTA Parking Test In First Attempt | https://www.binyaber.com/en/blogs-news/how-to-pass-your-rta-parking-test-in-first-attempt/ | Bin Yaber Driving Institute | 2026-07-29 |
| S38 | الركن الموازي بسهولة: دليلك خطوة بخطوة (EN version too) | https://www.excellencedriving.com/ar/blogs/parallel-parking-step-by-step-guide | Excellence Driving | 2025-07-02 |
| S39 | Driving tests on defined Dubai routes | https://gulfnews.com/uae/transport/driving-tests-on-defined-dubai-routes-1.719888 | Gulf News | 2018-09-15 |
| S40 | It takes an average of three attempts for drivers in the UAE to get a licence | https://gulfnews.com/uae/transport/it-takes-an-average-of-three-attempts-for-drivers-in-the-uae-to-get-a-licence-1.62304961 | Gulf News (quotes EDI) | 2019-03-03 |
| S41 | Major and Minor Mistakes in Dubai Driving Test | https://www.excellencedriving.com/en/blogs/major-and-minor-mistakes-list-in-dubai-driving-test | Excellence Driving | 2025-06-02 |
| S42 | RTA goes live with smart yard test | https://gulfnews.com/uae/transport/rta-goes-live-with-smart-yard-test-1.1989287 | Gulf News | 2017-03-06 |
| S43 | Youth Driving Course (Dubai) | https://edi-uae.com/en/Youth-Driving-Course | Emirates Driving Institute | accessed 2026-09 |

Hints only (practice sites, portals, general media; never the sole basis of a JSON fact):

| id | what it claims | url | date |
|---|---|---|---|
| H1 | Dubai theory: 35 MCQ, 30 min, 24 to pass | https://www.roadreadyuae.com/en/blog/rta-theory-test-dubai-complete-guide | 2026 |
| H2 | Dubai theory: 35 MCQ, 30 min, 23 to pass; road test 15 to 20 min | https://www.uaeexperthub.com/rta-driving-test-dubai-why-people-fail/ | 2026-08 |
| H3 | Dubai theory: 40 = 35 MCQ + 5 hazard videos, 30 min, 30 to pass | https://driveeuae.com/en/rta-theory-test/ | 2026 (no date) |
| H4 | Sharjah theory: 35 questions, 65% (no sources) | https://testmocks.com/exams/rta-sharjah-theory-test/ | 2026 |
| H5 | Sharjah theory: 35 MCQ, 60% | https://www.cars24.ae/news/en/buyers-guide/apply-for-driving-licence-in-sharjah/ | 2023-07-21 |
| H6 | Sharjah theory: 35 MCQ, 60% | https://www.policybazaar.ae/rta/sharjah-driving-licence/ | 2026-09-08 |
| H7 | Sharjah theory: 25 q, 18 to pass, 20 min (cites SDI) | https://open-exam-prep.com/practice/uae-sharjah-theory | 2026 |
| H8 | Sharjah road test: examiner with 3 or 4 candidates, 10 to 15 min each; parking test after half the classes | https://www.theorytest.ae/the-sharjah-driving-test-experience/ | 2021 (mod. 2023) |
| H9 | Dubai: 7 lessons after a failed road test; age 17.5 / 18 | https://www.propertyfinder.ae/blog/driving-licence-dubai/ | 2026-02-04 |
| H10 | Dubai theory 35 or 40 (conflict acknowledged), 30 min | https://www.wathim.com/blog/rta-theory-test-dubai-questions-pass-mark | 2026-08-05 |
| H11 | Dubai theory 40 / 30; says RTA page updated 2026-06-19 | https://yallapass.ae/dubai-rta-theory-test/ | 2026-08 |
| H12 | Parking test step hints (level with car ahead, equal space in both mirrors, hill 30 cm) | https://driveeuae.com/tips-pass-dubai-rta-parking-test/ | 2026-06-24 |
| H13 | Reverse bay parking steps | https://www.pitstoparabia.com/en/news/reverse-parking | 2025-07-24 |
| H14 | Parallel parking 9 steps | https://www.dubizzle.com/blog/cars/parallel-parking-tips-uae/ | 2021 (mod. 2026-09) |
| H15 | "Right-left-right head check at junctions" | https://ecodrive.ae/en/blogs/5-mistakes-that-cause-instant-fails-in-dubai-driving-test | undated |
| H16 | "5 mistakes that fail you" (speeding by 5 mph etc.) | https://www.albayan.ae/culture-art/miscellaneous/1330148 | 2026-05-28 |

H15 and H16 were rejected: H15's "right-left-right" is left-hand-traffic (UK) advice; in the UAE the nearest
traffic comes from the LEFT. H16 is translated US content (mph). Neither is used.

## Dubai (RTA)

### Journey (what we put in `process`)
1. Choose an RTA-approved institute and apply (RTA site or app, or at the institute). The institute calls within 3 working days to arrange training. Traffic file and learning permit are opened. (S2, S3, S11)
2. Eye test at an RTA-accredited optician or the institute; result is linked electronically. (S2, S11)
3. 8 mandatory theory lectures (8 hours for light vehicles), in person or online, Arabic, English or Urdu. Topics per EDI: attitude and responsibilities, signs, managing risks, driver condition, driving environment, rules of the road, hazards and emergencies, safety demonstration. (S1, S11, S12)
4. Knowledge (theory) test, computer based at the institute: 40 questions, 30 correct to pass (S1). Must pass before practical training (S3, S12).
5. Practical training: 20 hours for a complete beginner (EDI: 40 classes); 15 h with 2 to 5 years of foreign licence, 10 h over 5 years (S11, S12). Max 4 h a day, 8 h a week (S43). Includes night driving (minimum 2 lessons = 1 hour) and freeway driving (minimum 4 lessons = 2 hours at 100 km/h or more) after the on-road assessment (S3). Training stages: 1 vehicle control in the yard, 2 two-way streets and T-junctions, 3 multi-lane roads 60 to 80 km/h (lane changing, roundabouts, U-turns), 4 special manoeuvres in the yard, 5 yard test, road assessment, freeway (S3).
6. Internal assessments at the institute (EDI: initial driving assessment and smart yard assessment; road assessment) before the RTA tests. (S11, S14, S3)
7. RTA parking (smart yard) test: 5 manoeuvres. Fail one: 1 hour of training, then retake only that manoeuvre (EDI). (S4, S14)
8. RTA road test, about 20 minutes, RTA examiner, defined routes (at least 3 per institute since 2018). (S3, S39)
9. Pay issuance fee; digital licence in the RTA app; delivery optional. Automatic test gives an automatic-only licence. (S2, S3)

The file is suspended if no test is taken within 6 months of the last appointment; arrive 30 minutes early;
reschedule up to 24 hours before (S1). EDI 2019: each failed road test needs 8 more classes (4 hours) (S40, S14).

### Theory test: every version found
| version | questions | pass | time | source and date |
|---|---|---|---|---|
| A | 35 (17 general + 18 category) | 11 + 12 correct (23) | not stated | S9 Al Bayan 2010-10-11 |
| B | 35 | 65% | not stated | S7 Gulf News (RTA quote, story about 2011) |
| C | 35 (17 + 18) | pass mark "raised from 65 to 75" but article still gives 11 + 12 | 30 min | S8 Emarat Al Youm 2014-07-26 |
| D | + hazard perception: 5 video scenarios of about 25 s, taken alongside the theory test after 8 lectures | not stated | not stated | S6 Gulf News 2018-09-15; S44 hazard system live from 2015-07-01 |
| E | 40 | 30 correct | not stated | S1 RTA service page, updated 2026-09-11 |
| F | 40 including video clips; all video questions must be correct | 30 (75%) | not stated | S10 Excellence Driving 2026-09-08 |
| G | 35 MCQ | 23 or 24 | 30 min | H1, H2 (practice sites 2026) |
| H | 40 = 35 MCQ + 5 hazard | 30 | 30 min | H3 (practice site) |

Decision: 40 questions, pass 30. Reason: it is the only figure on the current official RTA page (S1, updated
two weeks ago) and a licensed institute (S10) says the same. The 35 / 23 figure is the 2010 to 2014 format still
copied by practice sites. The 35 MCQ + 5 video split is inferred from S6 (5 video scenarios, official statement)
plus the 40 total (S1, S10): confidence medium. The time limit of the 40-question version is not in any official
source; the only official time is 30 minutes for the 35-question version (S8, 2014). We use 30 minutes in the
preset as a conservative practice setting and say so. "All video questions must be correct" comes from one
institute (S10): kept as a medium-confidence note, not as a rule.

Languages: Arabic, English, Urdu, plus Chinese, Persian, Hindi, Malayalam, Bengali, Russian, Tamil (since 2018),
remote interpretation for AED 420 (S6, S1). Fee AED 200 + 20 per attempt (S1).

### Smart yard (parking) test
- 5 manoeuvres: parallel parking, 60-degree angle ("side") parking, garage parking (reverse into a 90-degree bay),
  hill (slope) start, sudden (emergency) braking (S4 official 2019, S17, S42). Handbook adds pre-drive checks and
  lists three-point turn as "practice only, not tested" (S3).
- Fully automated since 2019: 5 cameras (4 outside, 1 inside for identity), 20+ sensors, control tower, voice
  instructions from an on-board tablet (S4, S42). The car stops itself above 35 km/h or when approaching an object
  at 20 km/h (S18). Test length about 10 to 12 minutes (S16).
- Scoring: 4 or more demerit points in a manoeuvre fails that manoeuvre (S3). All 5 must be passed (S14).
- Immediate fail (EDI 2019, same list as SDI): any part of the car outside the lines including mirrors; time over
  5 min (parallel), 3 min (vertical/garage), 2 min (60 degree); hitting kerb or pole or mounting the kerb; rolling
  back 30 cm or more or stalling / not moving on the 2nd attempt; more than 60 s to move off on the hill; wrong
  emergency-brake technique (clutch first, clutch with brake, steering); not stopping within 3 m at 20 km/h, 6 m at
  30 km/h, 11 m at 40 km/h, or taking a hand off the wheel (S13). Excellence 2025 repeats the time limits and fail
  items for the RTA test (S16). Seatbelt is sensor-monitored (S15).

### Road test
- About 20 minutes "depending on your performance"; areas: vehicle control, obeying road rules, sharing the road,
  safe driving skills; may include reverse parking; anything dangerous, illegal or unsafe stops the test (S3).
  EDI 2019: 15 to 20 minutes per candidate (S40).
- RTA 2018 (S5): 5 major criteria, any one fails you: failing to stop at a red light, stop sign or stop line; not
  obeying signs such as entering a no-entry road or stopping in a yellow box; lack of vehicle control; not making
  sure the road, lane or roundabout is clear before proceeding (the fifth is not named in the article). 16 minor
  criteria, candidate must handle at least 12: pre-drive checks, mirrors and observation, signals, lane change,
  overtaking, approach, stop position, judgement, left turn, roundabout and U-turn, right turn, progress and speed,
  position on road, gear use, safety margin, parking in and out. One major error at the end still fails you.
- Common fails: S20 (2026) no entry, yellow box, not giving way at roundabouts, lane discipline, mirrors and blind
  spot, vehicle control; S21 (2019) mirrors, speed, lane discipline, U-turn positioning, junction observation, unsafe
  lane change, tailgating, late signals; S22 (2025) observation, control, procedure, nerves; S5 fear. Excellence
  (S41) claims "up to 13 minor mistakes" allowed: conflicts with the RTA 12-of-16 statement, not used.
- New: AI smart yards, simulators for rain, fog and emergencies, defensive-driving content (S19, 2026).

## Sharjah (Sharjah Police, Vehicles and Drivers Licensing; SDI)

### Journey
1. Original Emirates ID, profession not on the suspended list; open traffic file (S25).
2. Eye test (S25); 213+ approved optician branches nationwide (S31).
3. Theory lectures: SDI says 5 lectures in one day (8 am to 1 pm or 2 pm to 8 pm), Arabic, English, Urdu, audio
   for illiterate applicants (S25); e-learning online option (S31, S32). Conflict: Sharjah Police via Gulf News
   2024 says "7 lessons" (S31). We state SDI's current page and mention the conflict.
4. Theory ("signals") test: 25 questions, 18 to pass, 20 minutes, Arabic / English / Urdu, content: traffic signals,
   lanes and junctions, accident factors, traffic law, videos of correct and wrong behaviour; first attempt free,
   AED 50 per retake (S25, S28). Can be taken online with camera identity check (S32, since 2022).
5. Practical training: 50 classes of 40 min for beginners (S25, S28 Sept 2025). Conflict: Gulf News 2024 "40
   classes" (S31). We use 50 (newer, operative price list).
6. Parking test in the SDI internal yard, about 20 min (S25). Check items: parallel, vertical (garage), 60 degree,
   hill start, emergency brake; 7 immediate-fail items identical to EDI's list (S26, S27 2020).
7. Assessment test by internal examiners, about 20 min, decides readiness for the final test (S25).
8. Final road test by Sharjah traffic police examiners, main streets and highways, 20 min (S25), "does not exceed
   20 minutes" (S34). Option: examiner comes to your location for an extra fee (S33 2021: Dh100; S31 2024: Dh200 +
   Dh300 test fee).
9. Licence issued within 2 days of passing (S31). Automatic licence does not allow manual cars (S25).

### Theory test versions
| version | questions | pass | time | source |
|---|---|---|---|---|
| A | 25 | 18 | 20 min | S25 SDI car-driving pages (live 2026), repeated by H7 |
| B | 35 | 60% (21) | not stated | H5 Cars24 2023, H6 PolicyBazaar 2026 (both wrongly call it an "RTA" test) |
| C | 35 | 65% | not stated | H4 Testmocks (no sources) |
| D | 45 / 36 and about 35 / 80% | | | named in our task brief; no page with a source found |

Decision: 25 / 18 / 20 min. SDI is the Sharjah Police training institute and the page is the operative
instruction to candidates; the other versions come from portals and practice sites without sources.

### Common fails (Sharjah Police, S34, 2021)
Fear and anxiety; errors that cause serious accidents; turning without control of the car; not obeying traffic
signals; not keeping to the lane / route. SDI tips (S30, 2026): seatbelt first, adjust seat and mirrors, keep a
safe distance, signal lane changes, obey limits and signals, watch pedestrians, smooth braking.

### Other Sharjah items
- One-day test (preliminary + city test the same day) was a 2023 summer initiative for school graduates and
  national service recruits (S35): mentioned as past, not current.
- SDI handbook (S29): roundabouts anticlockwise, traffic already in the roundabout has right of way, look left,
  signal right to exit; U-turn at a roundabout follows the left-turn procedure; lane change = mirrors, signal,
  blind spot; two-second rule; stop at the STOP line; amber: continue only if too close to stop safely; parallel
  parking space about 1.5 car lengths, finish within about 30 cm of the kerb.

## Age rule (both emirates)
Federal Decree-Law 14/2024 (in force 2025-03-29) lowers the minimum age to 17 (S23). But the RTA service page (S2)
and EDI (S12, S43) still say: open file at 17.5, licence at 18; in June 2025 Galadari and SDI said the rule was not
yet applied (S24). Recorded as a note, medium confidence, "check with the institute".

## Parking reference points used in the guides
- Parallel: space about 1.5 car lengths (S29, S38); stop alongside the front car / front pole about 0.5 to 1 m away
  with rear bumpers level (S38, S29); reverse slowly, full lock toward the kerb; straighten; when your front bumper
  passes the rear of the car / pole ahead, full lock the other way; finish parallel within about 30 cm (S38, S29,
  H14). The "about 45 degrees" point for straightening is common instructor talk but not in a written source: the
  guide says "clearly angled" and lists the 45-degree idea only as a variation.
- Garage (reverse bay): pass the bay about 1 m away (S36; H13 says 1.5 m); stop when your rear is level with the
  bay line; full lock toward the bay while reversing slowly; straighten when mostly inside and the two lines look
  parallel in both mirrors; stop before the back line; if crooked, pull forward and correct (S36, H12).
- 60-degree angle: only generic guidance published (enter slightly wide, turn smoothly, align with lines, stop
  before the front line) (H12, S16). No exact reference point stated: the guide says the instructor gives the
  point for the test car.
- Hill start (automatic): hold with the foot brake, handbrake as needed, release handbrake while braking, move to
  the accelerator smoothly; limits 30 cm and 60 s (S37, S13, S26).
- Emergency stop: 20 to 40 km/h, brake hard at once, both hands, no steering, mirrors not required; distances
  3 / 6 / 11 m (S13, S26).

## Unverified (kept out of the JSON or only as a hedged variation)
- Exact time limit of the 40-question Dubai test (only practice sites say 30 min).
- Whether every hazard-video question must be answered correctly (single institute, S10): mentioned as a caution.
- The exact number of video items in the Sharjah theory test (SDI mentions videos without a count).
- Dubai road test: whether several candidates share the car and exact number of minor errors allowed today (RTA
  2018 said 12 of 16 criteria; Excellence says 13 minor mistakes): only the RTA 2018 rule is used, marked 2018.
- Extra classes after failing the Dubai road test: EDI 8 classes (4 h) in 2019 (S40, S14) vs 7 lessons (H9).
- Sharjah road test in groups of 3 or 4 candidates, 10 to 15 minutes each (H8 only).
- Sharjah parking test taken "after half of the classes" (H8 only).
- Precise reference points such as "pole in the middle of the rear side window" for parallel parking and the
  mirror-on-first-line point for 60-degree parking: common in instructor videos, not found in text.
- Three-point turn step list: RTA lists it as practice only; no UAE text source for the steps, so no guide.
- Slalom and S-curve: no UAE source lists them in the light-vehicle yard test; not included.
- Order of the five manoeuvres in the Dubai smart yard.
- Current Sharjah fees: SDI pages and PDFs disagree slightly (parking test AED 300 vs 400); fees left out.
