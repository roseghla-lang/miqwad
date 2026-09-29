# -*- coding: utf-8 -*-
"""Builds /home/claude/miqwad/content/signs.json (UAE sign catalog for مقود).
Data is inline; run: python3 build_signs.py
"""
import json, pathlib

OUT = pathlib.Path('/home/claude/miqwad/content/signs.json')

SOURCES = {
    "S1": {"title": "Light Motor Vehicle Handbook, A Guide to Safe Driving, 3rd edition (English), Road Signs part",
           "url": "https://russiadubai.com/upload/iblock/ac6/ac6fa71db851d0137a784bd80278acff.pdf",
           "publisher": "RTA Dubai, Licensing Agency (mirror copy of the official handbook)", "date": "2012-01"},
    "S2": {"title": "Driving Safely in Dubai, 1st edition (control, mandatory, prohibitory, warning and parking sign groups)",
           "url": "https://licensing.rta.ae/handbook/DrivingSafelyInDubaiEN.pdf",
           "publisher": "RTA Dubai, Licensing Agency", "date": "undated"},
    "S3": {"title": "Signal Charts (Arabic): regulatory, warning and guide signs",
           "url": "https://www.drivedubai.ae/public/uploads/downloads/20260727111506Signal-Charts-Arabic.pdf",
           "publisher": "Drive Dubai (RTA-licensed driving institute)", "date": "2026-07"},
    "S4": {"title": "Road Signs, Road Markings and Traffic Signals, signal chart (English)",
           "url": "https://edi-uae.com/public/uploads/downloads/20191126120000English-Signal-Chart.pdf",
           "publisher": "Emirates Driving Institute, Dubai", "date": "2019-11"},
    "S5": {"title": "Guidance Chart: Road Signs, Road Markings and Traffic Signals (English), 2026 edition",
           "url": "https://edi-uae.com/public/uploads/downloads/20260303120751Signal-Chart-English.pdf",
           "publisher": "Emirates Driving Institute, Dubai", "date": "2026-03"},
    "S6": {"title": "Ministerial Decision No. 130 of 1997, Executive Regulations of the Federal Traffic Law (Art. 25 to 28, 33)",
           "url": "https://uaelegislation.gov.ae/ar/legislations/1020/download",
           "publisher": "UAE Legislation portal", "date": "1997-03"},
    "S7": {"title": "Federal Decree-Law No. 14 of 2024 on Traffic Regulation (Art. 1, 4, 7)",
           "url": "https://uaelegislation.gov.ae/ar/legislations/2598/download",
           "publisher": "UAE Legislation portal", "date": "2024-09"},
    "S8": {"title": "Light Motor Vehicle Handbook, 7th edition (English), tram section: tram signs and tram priority",
           "url": "https://edi-uae.com/public/uploads/downloads/20190724133013RTA_Handbook_-_Light_Motor_Vehicle_(LMV)_-_English.pdf",
           "publisher": "RTA Dubai, Licensing Agency (copy hosted by Emirates Driving Institute)", "date": "2016-01"},
    "S9": {"title": "Emirate of Abu Dhabi Work Zone Traffic Management Manual: Principles and Practice, Issue 1",
           "url": "https://pdfcoffee.com/--6281-pdf-free.html",
           "publisher": "Department of Transport, Abu Dhabi (copy)", "date": "2014-02"},
    "S10": {"title": "Abu Dhabi Manual on Uniform Traffic Control Devices TR-511, 2nd edition",
            "url": "https://jawdah.qcc.abudhabi.ae/en/Registration/QCCServices/Services/STD/ISGL/ISGL-LIST/TR-511.pdf",
            "publisher": "Department of Transport, Abu Dhabi (via QCC)", "date": "2020-09"},
    "S11": {"title": "Route Numbering System Policy and Procedures TR-538, 1st edition (E-route emblem)",
            "url": "https://jawdah.qcc.abudhabi.ae/en/Registration/QCCServices/Services/STD/ISGL/ISGL-LIST/TR-538.pdf",
            "publisher": "Department of Transport, Abu Dhabi (via QCC)", "date": "2018-01"},
    "S12": {"title": "Road signs in the United Arab Emirates (sign list based on the Abu Dhabi MUTCD)",
            "url": "https://en.wikipedia.org/wiki/Road_signs_in_the_United_Arab_Emirates",
            "publisher": "Wikipedia", "date": "2026-09 (accessed)"},
    "S13": {"title": "Dubai RTA installs 210,000 road signs to boost safety and cut accidents (colour coding of guide signs)",
            "url": "https://gulfnews.com/uae/transport/dubai-rta-installs-210000-road-signs-to-boost-safety-and-cut-accidents-1.500359277",
            "publisher": "Gulf News", "date": "2025-11"},
    "S14": {"title": "Guide to understanding Dubai's colour-coded street signs",
            "url": "https://www.khaleejtimes.com/uae/transport/guide-to-understanding-dubais-colour-coded-street-signs",
            "publisher": "Khaleej Times", "date": "2023-07"},
    "S15": {"title": "Reading Dubai's road signs (E-route falcon emblem, D-route fort emblem)",
            "url": "https://gulfnews.com/uae/transport/reading-dubais-road-signs-1.254255",
            "publisher": "Gulf News", "date": "2006-09"},
    "S16": {"title": "Speed limits in the United Arab Emirates",
            "url": "https://en.wikipedia.org/wiki/Speed_limits_in_the_United_Arab_Emirates",
            "publisher": "Wikipedia", "date": "2026-09 (accessed)"},
    "S17": {"title": "Decoding RTA road signs: your guide to navigating Dubai's roadways",
            "url": "https://focus.hidubai.com/decoding-rta-road-signs/",
            "publisher": "HiDubai Focus", "date": "2023-06"},
    "S18": {"title": "Roadways: E routes, Salik (Dubai) and Darb (Abu Dhabi) tolls",
            "url": "https://u.ae/en/information-and-services/transportation/roadways",
            "publisher": "UAE Government portal u.ae", "date": "undated"},
    "S19": {"title": "UAE low visibility on the road: follow these safety rules for driving in fog and sandstorms",
            "url": "https://gulfnews.com/uae/transport/uae-low-visibility-on-the-road-follow-these-safety-rules-for-driving-in-fog-sandstorms-1.86313361",
            "publisher": "Gulf News", "date": "2022-03"},
    "S20": {"title": "كتيب المركبات الآلية الخفيفة، دليل للقيادة الآمنة، الطبعة 3 (Arabic): sign group intros p.99 and p.101, speed limits table",
            "url": "https://pubhtml5.com/plkd/rioj/basic/51-100",
            "publisher": "RTA Dubai, Licensing Agency (flipbook of the official PDF on rta.ae)", "date": "2012-01"},
}

CATEGORIES = [
    {"key": "warning", "name": "إشارات التحذير",
     "desc": "مثلث رأسه للأعلى بإطار أحمر وخلفية بيضاء ورمز أسود، ومعناه: انتبه، أمامك خطر، خفف السرعة واستعد\nمن هذه المجموعة أيضا لوحات الأسهم الصفراء والسوداء على المنعطفات الحادة والدوارات، وعلامات الخطر عند العوائق"},
    {"key": "priority", "name": "إشارات الأولوية",
     "desc": "تحدد من يمر أولا: قف مثمن أحمر لا يتكرر شكله، وأفسح الطريق مثلث رأسه للأسفل\nفي المقاطع الضيقة: الدائرة الحمراء ذات السهمين تعني أن الأولوية للقادم من الأمام، والمربع الأزرق ذو السهمين يعني أن الأولوية لك"},
    {"key": "prohibitory", "name": "إشارات المنع والتقييد",
     "desc": "دائرة بإطار أحمر وخلفية بيضاء: ممنوع ما تراه في الرمز أو ممنوع تجاوز الرقم، والخط الأحمر المائل يؤكد المنع\nالقرص الأزرق بإطار أحمر خاص بالوقوف: خط أحمر واحد يعني ممنوع الوقوف، وعلامة X تعني ممنوع التوقف نهائيا\nالقرص الأحمر بخط أبيض أفقي يعني ممنوع الدخول"},
    {"key": "mandatory", "name": "إشارات الإلزام",
     "desc": "دائرة زرقاء برمز أبيض: عليك أن تفعل ما يشير إليه الرمز، مثل اتجاه إجباري أو ممر مخصص أو حد أدنى للسرعة\nكتيب هيئة الطرق يقول إن هذه الإشارات تبين لمستعملي الطريق ما يجب عليهم فعله"},
    {"key": "information", "name": "الإشارات الإعلامية والتنظيمية",
     "desc": "مربع أو مستطيل أزرق غالبا يعطيك معلومة أو تنظيما: موقف، طريق باتجاه واحد، بداية الطريق السريع، تنظيم المسارات، بوابة سالك\nالخط الأحمر المائل على هذه اللوحات يعني نهاية ما تدل عليه"},
    {"key": "services", "name": "إشارات الخدمات",
     "desc": "لوحات صغيرة برمز أبيض على خلفية زرقاء أو بلون لوحة الاتجاه، تدلك على خدمة قريبة مثل المستشفى أو المطار"},
    {"key": "guide", "name": "لوحات الاتجاهات",
     "desc": "في دبي لون اللوحة يخبرك بنوع الطريق: الأزرق للطرق الاتحادية بين الإمارات وأرقامها تبدأ بالحرف E، والأخضر لطرق ومناطق داخل دبي وأرقامها تبدأ بالحرف D، والبني للمعالم السياحية والتجارية، والأبيض لأسماء الشوارع والمناطق"},
    {"key": "temporary", "name": "إشارات أعمال الطرق المؤقتة",
     "desc": "إشارات منطقة العمل خلفيتها صفراء غالبا (وقد تراها برتقالية) وترافقها الأقماع والحواجز والأسهم الوامضة\nفي منطقة العمل التزم بالإشارات المؤقتة حتى لو خالفت اللوحات أو الخطوط الدائمة"},
    {"key": "supplementary", "name": "اللوحات الإضافية",
     "desc": "لوحة بيضاء صغيرة تحت الإشارة تحدد تفاصيلها: المسافة إلى الخطر، أو طول المنطقة، أو الأوقات، أو نوع المركبة المقصودة، أو جهة امتداد المنع\nاقرأ الإشارة أولا ثم اللوحة التي تحتها"},
]

CAT = {'w': 'warning', 'p': 'priority', 'r': 'prohibitory', 'm': 'mandatory', 'i': 'information',
       's': 'services', 'g': 'guide', 't': 'temporary', 'x': 'supplementary'}

WARN_COL = "white background, red border, black symbol"
PROHIB_COL = "white background, red border, black symbol"
MAND_COL = "blue background, white rim, white symbol"
TEMP_COL = "yellow background, red border, black symbol"

SIGNS = []


def S(id, name, meaning, action, level, confuse, shape, colors, text, draw, uae_note, src, conf, notes=None):
    d = {"id": id, "cat": CAT[id[0]], "name": name, "meaning": meaning, "action": action, "level": level,
         "confuse": confuse, "shape": shape, "colors": colors, "text": text, "draw": draw,
         "uae_note": uae_note, "src": src, "confidence": conf}
    if notes:
        d["notes"] = notes
    SIGNS.append(d)


# =====================================================================================
# PRIORITY
# =====================================================================================
S("p-stop", "قف",
  "عليك التوقف التام عند خط الوقوف قبل دخول التقاطع، ثم منح الأولوية لكل المركبات والمشاة على الطريق الذي تدخله",
  "توقف تماما عند خط الوقوف حتى لو كان الطريق فارغا، انظر يمينا ويسارا، ثم تحرك فقط عندما يكون الدخول آمنا",
  1, ["p-give-way", "w-stop-ahead", "r-no-entry"], "octagon", "red background, white border, white text", "قف STOP",
  "Regular octagon with a flat top edge, red fill and a thin white border line just inside the edge. White Arabic word قف in large bold letters in the upper half, white English word STOP in bold capitals in the lower half. No pictogram",
  "الإشارة الوحيدة على شكل مثمن، وتسميها هيئة الطرق في كتيبها: الوقوف إلزامي، والتهدئة دون توقف كامل عندها مخالفة",
  ["S1", "S4", "S3", "S20"], "high")

S("p-give-way", "أفسح الطريق",
  "عليك منح أولوية المرور للمركبات على الطريق الذي ستدخله أو تعبره",
  "خفف السرعة واستعد للتوقف، ولا تدخل إلا إذا كان الطريق خاليا بمسافة آمنة، والتوقف ليس إلزاميا إذا كان الطريق فارغا",
  1, ["p-stop", "w-give-way-ahead", "p-give-way-pedestrians"], "triangle-down", "white background, red border", "",
  "Equilateral triangle pointing DOWN (apex at the bottom), thick red border, plain white interior with no symbol and no text",
  "المثلث المقلوب شكل خاص بهذه الإشارة فقط، وتكثر عند المنعطفات الحرة ومداخل الطرق الرئيسية، وعند مدخل الدوار تفسح الطريق للمركبات القادمة من يسارك داخله",
  ["S1", "S4", "S3", "S20"], "high")

S("p-give-way-pedestrians", "أفسح الطريق للمشاة",
  "عليك منح الأولوية للمشاة الذين يعبرون أو ينتظرون العبور في هذا المكان",
  "خفف السرعة وتوقف قبل الممر إذا كان هناك مشاة يعبرون أو ينتظرون، ولا تتحرك حتى يصلوا إلى الرصيف",
  2, ["p-give-way", "w-pedestrian-crossing", "m-pedestrians-only", "r-no-pedestrians"], "triangle-down",
  "white background, red border, black symbol", "",
  "Downward-pointing triangle with thick red border and white interior; in the wide upper part a black walking pedestrian pictogram in side view",
  "تكثر عند ممرات المشاة في المنعطفات الحرة ومخارج المواقف، وعدم إفساح الطريق للمشاة عند الممرات مخالفة عليها غرامة ونقاط سوداء",
  ["S1", "S4", "S3", "S20"], "high")

S("p-give-way-cyclists", "أفسح الطريق للدراجات الهوائية",
  "عليك منح الأولوية لراكبي الدراجات الهوائية الذين يعبرون أو يسيرون في مسارهم",
  "خفف السرعة واترك الدراجات تعبر أولا، وعند تجاوز راكب دراجة اترك مسافة جانبية لا تقل عن 1.5 متر",
  3, ["p-give-way", "w-cyclists", "m-cyclists-only", "r-no-bicycles"], "triangle-down",
  "white background, red border, black symbol", "",
  "Downward-pointing triangle with thick red border and white interior; a black bicycle pictogram in side view centred in the wide upper part",
  "هيئة الطرق تطلب ترك مسافة 1.5 متر على الأقل عند تجاوز راكب الدراجة",
  ["S4", "S2", "S12"], "high")

S("p-give-way-oncoming", "الأولوية للمركبات القادمة من الاتجاه المقابل",
  "الطريق أمامك ضيق ولا يتسع إلا لاتجاه واحد في كل مرة، والأولوية فيه للقادمين من الجهة المقابلة",
  "توقف قبل المقطع الضيق إذا كانت هناك مركبة قادمة، ولا تدخل حتى يخرج القادمون منه",
  4, ["p-priority-over-oncoming", "w-two-way-traffic", "r-no-overtaking"], "circle",
  "white background, red border, one black arrow and one red arrow", "",
  "White disc with red ring, no slash. Two vertical arrows side by side: on the LEFT a larger BLACK arrow pointing DOWN (oncoming traffic, which has priority); on the RIGHT a smaller RED arrow pointing UP (your direction, which must wait)",
  "السهم الأحمر هو اتجاهك أنت، واللون الأحمر يعني أنك أنت من ينتظر",
  ["S4", "S3", "S1"], "high")

S("p-priority-over-oncoming", "لك الأولوية على المركبات القادمة من الاتجاه المقابل",
  "في المقطع الضيق أمامك الأولوية لك، وعلى القادمين من الجهة المقابلة انتظارك",
  "تابع بحذر وبسرعة مناسبة، وكن مستعدا للتوقف إذا لم ينتظرك سائق قادم",
  4, ["p-give-way-oncoming", "i-one-way", "m-ahead-only"], "square",
  "blue background, white rim, one white arrow and one red arrow", "",
  "Blue square with white rim. Two vertical arrows: on the RIGHT a larger WHITE arrow pointing UP (your direction, which has priority); on the LEFT a smaller RED arrow pointing DOWN (oncoming traffic, which must wait)",
  "",
  ["S1", "S4", "S12"], "high")

# =====================================================================================
# WARNING
# =====================================================================================
S("w-bend-right", "منعطف إلى اليمين",
  "أمامك منعطف خطر يتجه إلى اليمين",
  "خفف السرعة قبل المنعطف لا داخله، والتزم بمسارك ولا تتجاوز",
  2, ["w-bend-left", "w-double-bend-right", "m-turn-right-ahead"], "triangle", WARN_COL, "",
  "Inside the triangle a thick black road line that starts at the bottom centre, goes straight up, then curves smoothly to the RIGHT near the top, ending in an arrowhead pointing up and to the right",
  "", ["S1", "S4", "S3"], "high")

S("w-bend-left", "منعطف إلى اليسار",
  "أمامك منعطف خطر يتجه إلى اليسار",
  "خفف السرعة قبل المنعطف لا داخله، والتزم بمسارك ولا تتجاوز",
  2, ["w-bend-right", "w-double-bend-left", "m-turn-left-ahead"], "triangle", WARN_COL, "",
  "Mirror image of the right bend: thick black road line from the bottom centre going up, then curving smoothly to the LEFT near the top, arrowhead pointing up and to the left",
  "", ["S1", "S4", "S3"], "high")

S("w-double-bend-right", "منعطفات متتالية أولها إلى اليمين",
  "أمامك منعطفان متتاليان أو أكثر، الأول إلى اليمين ثم إلى اليسار",
  "خفف السرعة قبل الوصول، ولا تتجاوز حتى نهاية المنعطفات",
  3, ["w-double-bend-left", "w-bend-right", "w-chevrons-right"], "triangle", WARN_COL, "",
  "Thick black S-shaped road line with an arrowhead at the top: it starts at the bottom centre, bends first to the RIGHT, then back to the LEFT, and ends pointing up",
  "", ["S1", "S4", "S3", "S12"], "high")

S("w-double-bend-left", "منعطفات متتالية أولها إلى اليسار",
  "أمامك منعطفان متتاليان أو أكثر، الأول إلى اليسار ثم إلى اليمين",
  "خفف السرعة قبل الوصول، ولا تتجاوز حتى نهاية المنعطفات",
  3, ["w-double-bend-right", "w-bend-left", "w-chevrons-left"], "triangle", WARN_COL, "",
  "Mirror image of the right-first version: thick black S-shaped line from the bottom centre, bending first to the LEFT, then to the RIGHT, arrowhead at the top pointing up",
  "", ["S12", "S3"], "medium")

S("w-crossroads", "تقاطع طرق أمامك",
  "أمامك تقاطع مع طريق يعبر طريقك من الجهتين",
  "خفف السرعة واستعد للتوقف، وانتبه للمركبات القادمة من اليمين ومن اليسار",
  2, ["w-t-junction", "w-side-road-right", "w-staggered-junction", "w-two-way-crossing"], "triangle", WARN_COL, "",
  "Bold black cross (plus sign): a vertical bar from the bottom to the top of the symbol area, crossed at mid height by a horizontal bar of the same thickness",
  "", ["S1", "S4", "S3"], "high")

S("w-t-junction", "تقاطع على شكل T",
  "طريقك ينتهي أمامك عند طريق عرضي، ولا يمكنك المتابعة إلى الأمام",
  "خفف السرعة واستعد للتوقف، ثم انعطف يمينا أو يسارا بعد إفساح الطريق",
  2, ["w-crossroads", "w-side-road-left", "w-chevron-t-junction", "w-dead-end-ahead"], "triangle", WARN_COL, "",
  "Black T shape: a thick horizontal bar across the top of the symbol area and a thick vertical bar rising from the bottom centre to meet its middle",
  "", ["S1", "S4", "S3"], "high")

S("w-side-road-right", "طريق جانبي من اليمين",
  "أمامك طريق جانبي يتصل بطريقك من جهة اليمين، وقد تخرج منه مركبات",
  "خفف السرعة وانتبه للمركبات الخارجة من اليمين، واستعد للتوقف",
  2, ["w-side-road-left", "w-merge-right", "w-crossroads"], "triangle", WARN_COL, "",
  "Thick black vertical bar (the main road) from bottom to top; a thinner black bar branches horizontally to the RIGHT from its middle",
  "", ["S4", "S3", "S12"], "high")

S("w-side-road-left", "طريق جانبي من اليسار",
  "أمامك طريق جانبي يتصل بطريقك من جهة اليسار، وقد تخرج منه مركبات",
  "خفف السرعة وانتبه للمركبات الخارجة من اليسار، واستعد للتوقف",
  2, ["w-side-road-right", "w-merge-left", "w-t-junction"], "triangle", WARN_COL, "",
  "Thick black vertical bar (the main road) from bottom to top; a thinner black bar branches horizontally to the LEFT from its middle",
  "", ["S4", "S3", "S12"], "high")

S("w-staggered-junction", "تقاطعات متجاورة",
  "أمامك طريقان جانبيان قريبان من بعضهما، واحد من اليسار والآخر من اليمين وليسا متقابلين",
  "خفف السرعة وانتبه لمركبات تدخل طريقك من الجانبين في نقطتين متقاربتين",
  3, ["w-crossroads", "w-side-road-right", "w-side-road-left"], "triangle", WARN_COL, "",
  "Thick black vertical bar (main road); one thinner side bar branches to the LEFT in the lower third and another branches to the RIGHT in the upper third (a mirrored version with the right branch first also exists)",
  "", ["S4", "S3", "S12"], "high")

S("w-merge-right", "طريقك يندمج مع حركة المرور",
  "أمامك نقطة يلتقي فيها طريقك مع طريق آخر بزاوية حادة، وعليك الاندماج مع حركة المرور فيه",
  "خفف السرعة، راقب المرايا والنقطة العمياء، واندمج فقط عندما تجد فجوة آمنة",
  3, ["w-merge-left", "w-side-road-right", "i-lane-joining"], "triangle", WARN_COL, "",
  "Thick black vertical bar (main road) from bottom to top; a thinner black bar comes up from the lower RIGHT at a sharp angle and joins the main bar in the upper half, like a slip road merging",
  "", ["S1", "S4"], "medium")

S("w-merge-left", "مركبات تندمج من اليسار",
  "أمامك مكان تدخل فيه مركبات من طريق آخر إلى طريقك من جهة اليسار",
  "انتبه للمركبات الداخلة من اليسار، ولا تسرع لتسبقها، واترك لها مجالا إذا أمكن",
  3, ["w-merge-right", "w-side-road-left", "i-lane-joining"], "triangle", WARN_COL, "",
  "Thick black vertical bar (main road) from bottom to top; a thinner black bar comes up from the lower LEFT at a sharp angle and joins the main bar in the upper half",
  "في بعض طرق الإمارات تدخل المركبات من اليسار، فلا تفترض أن الاندماج دائما من اليمين",
  ["S4"], "high")

S("w-roundabout-ahead", "دوار أمامك",
  "أمامك دوار، وحركة السير فيه عكس عقارب الساعة",
  "خفف السرعة، اختر المسار المناسب قبل الدوار، وأفسح الطريق للمركبات داخل الدوار القادمة من يسارك",
  1, ["m-roundabout", "w-traffic-signals", "w-crossroads"], "triangle", WARN_COL, "",
  "Three black curved arrows arranged in a ring in the centre of the triangle, evenly spaced, all rotating ANTICLOCKWISE: the top arrow points to the left, the lower-left arrow points down and to the right, the lower-right arrow points up and to the right",
  "الأسهم عكس عقارب الساعة لأن السير في الإمارات على اليمين، فلا تخلط بينها وبين الصور البريطانية ذات الأسهم مع عقارب الساعة",
  ["S1", "S4", "S3"], "high")

S("w-traffic-signals", "إشارة ضوئية أمامك",
  "أمامك تقاطع أو ممر تنظمه إشارة ضوئية",
  "خفف السرعة واستعد للتوقف إذا تحول الضوء إلى الأصفر أو الأحمر",
  1, ["w-roundabout-ahead", "w-stop-ahead", "w-other-danger"], "triangle",
  "white background, red border, black signal housing with red, amber and green lamps", "",
  "Vertical black rounded rectangle (signal head) in the centre of the triangle with three lamps: red at the top, amber (yellow) in the middle, green at the bottom",
  "", ["S1", "S4", "S3"], "high")

S("w-stop-ahead", "إشارة قف أمامك",
  "أمامك إشارة قف، وعليك التوقف التام عندها",
  "خفف السرعة مبكرا واستعد للتوقف الكامل عند خط الوقوف",
  2, ["p-stop", "w-give-way-ahead", "w-traffic-signals"], "triangle",
  "white background, red border, small red octagon with white text", "قف",
  "Inside the triangle a small red octagon (miniature stop sign) with a thin white border and the white word قف in its centre",
  "", ["S1", "S4", "S3"], "high")

S("w-give-way-ahead", "إشارة أفسح الطريق أمامك",
  "أمامك إشارة أفسح الطريق، وعليك منح الأولوية هناك",
  "خفف السرعة واستعد لإفساح الطريق للمركبات على الطريق الذي ستدخله",
  2, ["p-give-way", "w-stop-ahead", "p-give-way-pedestrians"], "triangle", WARN_COL, "",
  "Inside the triangle a small downward-pointing triangle with a red border and white interior (miniature give way sign)",
  "", ["S1", "S4", "S3"], "high")

S("w-pedestrian-crossing", "ممر مشاة أمامك",
  "أمامك ممر لعبور المشاة",
  "خفف السرعة وراقب الرصيفين، وتوقف قبل الممر إذا كان هناك من يعبر أو ينتظر العبور",
  1, ["w-children", "p-give-way-pedestrians", "r-no-pedestrians", "m-pedestrians-only"], "triangle", WARN_COL, "",
  "A black walking pedestrian in side view, striding to the left, standing on a zebra crossing drawn as 3 or 4 short horizontal black bars under the feet",
  "عدم التوقف للمشاة على ممر العبور مخالفة عليها غرامة ونقاط سوداء في كل الإمارات",
  ["S1", "S4", "S3"], "high")

S("w-children", "أطفال",
  "أمامك منطقة يكثر فيها عبور الأطفال مثل مدرسة أو حديقة أو حي سكني",
  "خفف السرعة كثيرا، وتوقع أن يخرج طفل فجأة من بين السيارات",
  1, ["w-pedestrian-crossing", "m-pedestrians-only", "r-no-pedestrians"], "triangle", WARN_COL, "",
  "Two black children running in side view toward the left: the taller child in front on the left, the smaller child behind on the right, holding hands",
  "تكثر قرب المدارس والأحياء السكنية، وغالبا تجد معها مطبات وحد سرعة منخفضا",
  ["S4", "S3", "S12"], "high")

S("w-cyclists", "عبور دراجات هوائية",
  "أمامك مكان يعبر فيه راكبو الدراجات الهوائية أو يستخدمون الطريق",
  "خفف السرعة وانتبه للدراجات، وعند تجاوز دراجة اترك مسافة جانبية لا تقل عن 1.5 متر",
  2, ["m-cyclists-only", "r-no-bicycles", "p-give-way-cyclists"], "triangle", WARN_COL, "",
  "A black bicycle in side view (no rider) centred in the triangle",
  "", ["S1", "S4", "S3", "S2"], "high")

S("w-camels", "حيوانات على الطريق (جمال)",
  "أمامك منطقة قد تعبر فيها الجمال أو حيوانات أخرى الطريق",
  "خفف السرعة وراقب جانبي الطريق، وخصوصا في الليل وعلى الطرق الصحراوية",
  2, ["w-sand-dunes", "w-children", "w-other-danger"], "triangle", WARN_COL, "",
  "Black silhouette of a dromedary camel with ONE hump, walking, side view facing left, long curved neck and four thin legs",
  "الجمل بسنام واحد هو رمز الحيوانات على طرق الإمارات، وتكثر الإشارة على الطرق الخارجية والصحراوية",
  ["S4", "S3", "S12"], "high",
  "لوحات المعاهد تسمي الإشارة حيوانات، وقائمة إشارات الإمارات تسميها عبور الجمال، فجمعنا الاسمين")

S("w-two-way-traffic", "حركة مرور في الاتجاهين",
  "الطريق أمامك يصبح بمسارين متعاكسين، والمركبات القادمة تسير بجانبك دون فاصل",
  "التزم بيمين الطريق، ولا تتجاوز إلا عند الأمان التام، وانتبه للمركبات القادمة",
  2, ["w-dual-carriageway-ends", "w-two-way-crossing", "p-give-way-oncoming"], "triangle", WARN_COL, "",
  "Two vertical black arrows side by side: the LEFT arrow points DOWN and the RIGHT arrow points UP (right-hand traffic)",
  "", ["S1", "S4", "S12"], "high")

S("w-two-way-crossing", "تقاطع مع طريق ذي اتجاهين",
  "أنت على طريق باتجاه واحد وستعبر طريقا تسير فيه المركبات في الاتجاهين",
  "خفف السرعة وانظر إلى الجهتين قبل العبور، فالمركبات تأتي من اليمين ومن اليسار",
  4, ["w-two-way-traffic", "w-crossroads", "i-one-way"], "triangle", WARN_COL, "",
  "Two horizontal black arrows one above the other: the TOP arrow points LEFT and the BOTTOM arrow points RIGHT (two-way traffic on the crossing road, driving on the right)",
  "", ["S1", "S4", "S3"], "high")

S("w-road-narrows-both", "الطريق يضيق من الجهتين",
  "عرض الطريق أمامك يقل من الجانبين",
  "خفف السرعة وانتبه للمركبات بجانبك، واندمج بهدوء دون مزاحمة",
  2, ["w-road-narrows-right", "w-road-narrows-left", "w-dual-carriageway-ends"], "triangle", WARN_COL, "",
  "Two black vertical lines (road edges), wide apart at the bottom, both bending inward symmetrically in the middle and continuing closer together at the top",
  "", ["S1", "S4", "S3"], "high")

S("w-road-narrows-right", "الطريق يضيق من اليمين",
  "عرض الطريق أمامك يقل من جهة اليمين",
  "خفف السرعة، وإذا كنت في المسار الأيمن فانتقل إلى اليسار عندما يكون ذلك آمنا",
  2, ["w-road-narrows-left", "w-road-narrows-both", "w-right-lane-ends"], "triangle", WARN_COL, "",
  "Two black vertical lines: the LEFT line is straight from bottom to top; the RIGHT line bends inward (toward the left) in the middle, so the road is narrower at the top",
  "", ["S4", "S3"], "high")

S("w-road-narrows-left", "الطريق يضيق من اليسار",
  "عرض الطريق أمامك يقل من جهة اليسار",
  "خفف السرعة، وإذا كنت في المسار الأيسر فانتقل إلى اليمين عندما يكون ذلك آمنا",
  2, ["w-road-narrows-right", "w-road-narrows-both", "w-left-lane-ends"], "triangle", WARN_COL, "",
  "Two black vertical lines: the RIGHT line is straight from bottom to top; the LEFT line bends inward (toward the right) in the middle, so the road is narrower at the top",
  "", ["S1", "S4", "S3"], "high")

S("w-dual-carriageway-ends", "نهاية الطريق المزدوج",
  "الجزيرة الفاصلة بين الاتجاهين تنتهي أمامك، وستسير المركبات القادمة بجانبك مباشرة",
  "التزم بيمين الطريق وانتبه للمركبات القادمة من الأمام، ولا تتجاوز",
  3, ["w-two-way-traffic", "w-road-narrows-both", "w-two-way-crossing"], "triangle", WARN_COL, "",
  "At the bottom two separate thick black vertical strips (the two carriageways) with a white gap between them (the central island); higher up the gap closes and the strips join into one wide black strip that continues to the top",
  "", ["S1", "S4", "S3"], "high")

S("w-right-lane-ends", "نهاية المسار الأيمن",
  "المسار الأيمن ينتهي أمامك ويندمج في المسار المجاور",
  "إذا كنت في المسار الأيمن فانتقل إلى اليسار مبكرا بعد استخدام الغماز، وإذا كنت في المسار الآخر فاترك المجال للمندمجين",
  3, ["w-left-lane-ends", "w-road-narrows-right", "t-lane-closed-right"], "triangle", WARN_COL, "",
  "Two black vertical edge lines with a black dashed lane line between them. The LEFT edge line is straight; the RIGHT edge line slants inward toward the middle at mid height, and the dashed lane line stops where the narrowing starts, so two lanes become one at the top",
  "", ["S1", "S4", "S3"], "high")

S("w-left-lane-ends", "نهاية المسار الأيسر",
  "المسار الأيسر ينتهي أمامك ويندمج في المسار المجاور",
  "إذا كنت في المسار الأيسر فانتقل إلى اليمين مبكرا بعد استخدام الغماز، وإذا كنت في المسار الآخر فاترك المجال للمندمجين",
  3, ["w-right-lane-ends", "w-road-narrows-left", "t-lane-closed-left"], "triangle", WARN_COL, "",
  "Mirror of the right-lane-ends sign: RIGHT edge line straight; LEFT edge line slants inward at mid height; the dashed lane line between them stops where the narrowing starts",
  "", ["S12"], "medium")

S("w-u-turn-ahead", "فتحة دوران للخلف أمامك",
  "أمامك فتحة مخصصة للدوران والعودة في الاتجاه المعاكس",
  "إذا أردت الدوران فانتقل مبكرا إلى المسار الأيسر وخفف السرعة، وإذا لم ترد فانتبه للمركبات التي تبطئ أمامك",
  2, ["r-no-u-turn", "w-bend-left", "m-turn-left-ahead"], "triangle", WARN_COL, "",
  "Black U-shaped arrow: the shaft starts at the bottom right, goes up, curves over the top to the LEFT and comes back down on the left side, arrowhead pointing DOWN on the left",
  "الدوران للخلف في الإمارات يكون من المسار الأيسر لأن السير على اليمين، لذلك يتجه السهم إلى اليسار",
  ["S1", "S4", "S3"], "high")

S("w-speed-hump", "مطب لتخفيف السرعة",
  "أمامك مطب صناعي على سطح الطريق لإجبار السائقين على تخفيف السرعة",
  "خفف السرعة كثيرا قبل المطب واعبره ببطء",
  1, ["w-uneven-road", "w-steep-ascent", "w-loose-chippings"], "triangle", WARN_COL, "",
  "A horizontal black base line across the lower part of the symbol area with ONE smooth black half-ellipse hump rising from its middle",
  "كثيرة في الأحياء السكنية ومحيط المدارس، وغالبا تجد خطوطا مرسومة على المطب نفسه",
  ["S1", "S4", "S3"], "high")

S("w-uneven-road", "طريق غير مستو",
  "سطح الطريق أمامك فيه تموجات أو حفر أو مطبات",
  "خفف السرعة وأمسك المقود جيدا",
  3, ["w-speed-hump", "w-loose-chippings", "w-slippery-road"], "triangle", WARN_COL, "",
  "A horizontal black base line with TWO smaller rounded bumps side by side in its middle (bumpy road profile)",
  "", ["S1", "S4", "S3"], "high")

S("w-slippery-road", "طريق زلق",
  "سطح الطريق أمامك قد يكون زلقا، خصوصا عند المطر أو وجود رمال أو زيوت",
  "خفف السرعة وزد مسافة الأمان، وتجنب الفرملة القوية والانعطاف المفاجئ",
  2, ["w-loose-chippings", "w-uneven-road", "w-soft-verges"], "triangle", WARN_COL, "",
  "A black car seen from behind (rear view), slightly tilted, with two wavy S-shaped skid lines crossing each other below it",
  "",
  ["S1", "S4", "S3"], "high")

S("w-loose-chippings", "حصى متطاير",
  "على سطح الطريق حصى صغير قد تقذفه عجلات المركبات",
  "خفف السرعة وزد المسافة عن المركبة التي أمامك لحماية الزجاج والطلاء",
  3, ["w-slippery-road", "w-uneven-road", "w-falling-rocks"], "triangle", WARN_COL, "",
  "A black car in side view driving to the left, with several small black dots and pebbles flying up and back from its rear wheel",
  "", ["S1", "S4", "S3"], "high")

S("w-soft-verges", "حافة الطريق رخوة",
  "كتف الطريق أمامك رخو أو منخفض ولا يتحمل وزن المركبة",
  "ابق على سطح الطريق المعبد، ولا تخرج إلى الحافة إلا للضرورة وبسرعة منخفضة",
  4, ["w-slippery-road", "w-quayside", "w-uneven-road"], "triangle", WARN_COL, "",
  "A black car seen from behind, tilted, with its right wheels dropping onto a lower strip of black dots along the right edge of the road (the soft shoulder shown below road level)",
  "", ["S4", "S3", "S12"], "high")

S("w-falling-rocks", "احتمال تساقط صخور",
  "أمامك منطقة جبلية قد تسقط فيها صخور على الطريق",
  "خفف السرعة وانتبه لوجود صخور على الطريق، ولا تتوقف تحت المنحدرات",
  3, ["w-loose-chippings", "w-steep-descent", "w-other-danger"], "triangle", WARN_COL, "",
  "A black cliff face as a tall right-angled wedge on the RIGHT side of the symbol area, with 3 or 4 irregular black rocks of different sizes falling diagonally down to the left, the lowest one lying on the road",
  "تنتشر في المناطق الجبلية مثل حتا وطرق الإمارات الشمالية",
  ["S1", "S4", "S3"], "high")

S("w-steep-descent", "منحدر حاد",
  "أمامك نزول حاد، والرقم يبين نسبة الانحدار",
  "خفف السرعة قبل النزول، واستخدم ناقل حركة منخفضا بدل الضغط المستمر على الفرامل حتى لا تسخن الفرامل",
  3, ["w-steep-ascent", "w-falling-rocks", "w-speed-hump"], "triangle", WARN_COL, "10%",
  "A black right-angled wedge filling the lower part of the symbol area whose top edge slopes DOWN from upper left to lower right; the black text 10% placed above the slope",
  "", ["S1", "S4", "S3"], "high")

S("w-steep-ascent", "مرتفع حاد",
  "أمامك صعود حاد، والرقم يبين نسبة الميل",
  "حافظ على سرعة مناسبة، ولا تتجاوز قرب القمة لأن الرؤية محدودة، واترك مسافة عن المركبات الثقيلة البطيئة",
  3, ["w-steep-descent", "w-speed-hump", "w-uneven-road"], "triangle", WARN_COL, "10%",
  "A black right-angled wedge filling the lower part of the symbol area whose top edge slopes UP from lower left to upper right; the black text 10% placed above the slope",
  "", ["S1", "S4", "S3"], "high")

S("w-low-flying-aircraft", "طيران منخفض",
  "أمامك منطقة قريبة من مطار تمر فوقها الطائرات على ارتفاع منخفض مع ضجيج مفاجئ",
  "ركز على الطريق، ولا تنشغل بالنظر إلى الطائرات ولا تتوقف لمشاهدتها",
  3, ["s-airport", "w-overhead-cable", "w-crosswind"], "triangle", WARN_COL, "",
  "A black passenger jet silhouette in side view in the centre of the triangle, nose pointing to the upper left as if climbing",
  "تكثر قرب مطارات دبي والشارقة",
  ["S1", "S4", "S3"], "high")

S("w-overhead-cable", "أسلاك كهربائية معلقة",
  "أمامك أسلاك كهرباء عالية الجهد تعبر فوق الطريق",
  "إذا كانت مركبتك أو حمولتها مرتفعة فتأكد أن ارتفاعها أقل من الارتفاع المسموح، ولا تتوقف تحت الأسلاك",
  3, ["w-max-height-ahead", "r-max-height", "w-low-flying-aircraft"], "triangle", WARN_COL, "",
  "A black cable line across the upper part of the symbol area, sagging slightly between two short black poles at the sides, with a black zigzag lightning bolt below the cable pointing down",
  "", ["S1", "S4", "S3"], "high")

S("w-tunnel", "نفق أمامك",
  "الطريق أمامك يدخل في نفق",
  "أشعل المصابيح الأمامية، واخلع النظارة الشمسية إن كنت تلبسها، والتزم بمسارك ولا تتوقف داخل النفق إلا في الطوارئ",
  3, ["i-tunnel", "m-headlights-on", "w-opening-bridge"], "triangle", WARN_COL, "",
  "A black tunnel entrance: a solid black mass filling the lower part of the symbol area with a white semicircular arched opening in its centre, and two short converging road lines leading into the opening",
  "", ["S1", "S4", "S3"], "high")

S("w-opening-bridge", "جسر متحرك",
  "أمامك جسر يمكن أن يرتفع أو يفتح لمرور السفن",
  "خفف السرعة، وتوقف إذا أضاءت الإشارة الحمراء أو نزل الحاجز",
  4, ["w-quayside", "w-tunnel", "w-gate-ahead"], "triangle", WARN_COL, "",
  "Side profile of a lifting bridge: two black bridge leaves raised upward from each side forming a V-shaped opening in the middle, with two short wavy black water lines below",
  "", ["S1", "S4", "S3"], "high")

S("w-quayside", "رصيف ميناء أو ضفة نهر",
  "الطريق أمامك ينتهي عند رصيف مائي أو حافة ماء دون حاجز",
  "خفف السرعة كثيرا وانتبه، خصوصا في الليل أو عند سوء الرؤية",
  4, ["w-opening-bridge", "w-soft-verges", "w-dead-end-ahead"], "triangle", WARN_COL, "",
  "A black car in side view facing left, tipping nose first off a straight quay edge on the left, falling toward three short wavy black water lines at the bottom",
  "تظهر قرب الموانئ والخيران والقنوات المائية",
  ["S1", "S4", "S3"], "high")

S("w-max-height-ahead", "حد الارتفاع أمامك",
  "أمامك جسر أو عائق علوي، والرقم هو أقصى ارتفاع مسموح للمركبة مع حمولتها",
  "إذا كانت مركبتك أعلى من الرقم فلا تتابع، واسلك طريقا آخر",
  3, ["r-max-height", "w-overhead-cable", "w-tunnel"], "triangle", WARN_COL, "4.5 م",
  "Inside the triangle the black text 4.5 م centred, with a black arrowhead above it pointing DOWN and a black arrowhead below it pointing UP (vertical clearance symbol)",
  "", ["S1", "S4", "S3"], "high")

S("w-other-danger", "أخطار أخرى",
  "أمامك خطر لا توضحه الإشارات الأخرى، وغالبا تشرحه لوحة إضافية تحتها",
  "خفف السرعة واقرأ اللوحة الإضافية إن وجدت، واستعد لأي موقف",
  2, ["w-traffic-signals", "t-road-works", "w-uneven-road"], "triangle", WARN_COL, "",
  "A large black exclamation mark (a vertical bar with a dot below it) centred in the triangle",
  "", ["S1", "S4", "S3"], "high")

S("w-tram-crossing", "عبور الترام أمامك",
  "أمامك مكان يعبر فيه خط الترام الطريق، والترام قد يأتي من اليمين أو من اليسار",
  "خفف السرعة وانظر إلى الجهتين، ولا تدخل منطقة العبور إلا إذا كان مخرجها خاليا، والأولوية للترام",
  3, ["m-trams-only", "w-traffic-signals", "w-crossroads"], "triangle", WARN_COL, "",
  "A black modern tram in side view (long low body, several windows, a pantograph on the roof) centred in the triangle, running on a short black rail line",
  "خاصة بدبي على مسار ترام دبي، وهيئة الطرق تلزم كل مستخدمي الطريق بإعطاء الأولوية لحركة الترام",
  ["S8", "S4", "S3"], "high")

S("w-sand-dunes", "كثبان رملية أمامك",
  "أمامك منطقة قد تزحف فيها الرمال على الطريق أو تقل فيها الرؤية بسبب الرمال",
  "خفف السرعة وانتبه لتراكم الرمال على سطح الطريق، وأشعل المصابيح إذا قلت الرؤية",
  3, ["w-camels", "w-slippery-road", "w-crosswind"], "triangle", WARN_COL, "",
  "Two or three rounded black sand-dune humps rising from the lower right of the symbol area, a short road edge line at the lower left, and a few small black dots drifting from the dunes across the road",
  "إشارة خاصة بطرق الإمارات الصحراوية ولا تجدها في كتب الإشارات الأوروبية",
  ["S5", "S12"], "high")

S("w-crosswind", "رياح جانبية أمامك",
  "أمامك مقطع قد تهب فيه رياح جانبية قوية تدفع المركبة",
  "خفف السرعة وأمسك المقود بقوة بكلتا يديك، وانتبه عند تجاوز المركبات الكبيرة أو الخروج من خلفها",
  4, ["w-sand-dunes", "w-low-flying-aircraft", "w-slippery-road"], "triangle",
  "white background, red border, black pole, red and white windsock", "",
  "A black vertical pole on the left with a windsock attached at its top, blowing horizontally to the right; the windsock drawn in alternating red and white bands with a black outline",
  "", ["S5", "S12"], "high")

S("w-gate-ahead", "بوابة قد تغلق الطريق أمامك",
  "أمامك بوابة قد تكون مغلقة وتقطع الطريق",
  "خفف السرعة واستعد للتوقف إذا كانت البوابة مغلقة",
  4, ["w-opening-bridge", "w-dead-end-ahead", "r-no-entry"], "triangle", WARN_COL, "",
  "A black farm-style gate centred in the triangle: two short vertical posts with three horizontal bars between them and one diagonal brace",
  "", ["S5", "S12"], "high")

S("w-dead-end-ahead", "طريق مسدود أمامك",
  "الطريق أمامك مغلق من نهايته ولا يوصلك إلى طريق آخر",
  "لا تدخله إلا إذا كانت وجهتك فيه، واستعد للرجوع بأمان",
  3, ["i-dead-end", "w-t-junction", "w-gate-ahead"], "triangle",
  "white background, red border, black stem, red bar", "",
  "Inside the triangle a thick black vertical bar rising from the bottom, capped at its top by a short thick RED horizontal bar (T shape)",
  "", ["S5", "S4", "S12"], "high")

S("w-chevron-right", "علامة اتجاه تحذيرية مفردة إلى اليمين",
  "الطريق ينعطف إلى اليمين بحدة عند هذه اللوحة",
  "خفف السرعة واتبع اتجاه السهم، ولا تسر مباشرة نحو اللوحة",
  3, ["w-chevron-left", "w-chevrons-right", "w-bend-right", "m-go-this-way"], "rect",
  "yellow background, black chevron", "",
  "Upright rectangle (taller than wide) with a yellow background and one thick black chevron (>) pointing to the RIGHT in the centre",
  "", ["S1", "S4", "S3"], "high",
  "وجود اللوحة مؤكد في لوحات الهيئة والمعاهد، أما لونها الأصفر والأسود فمأخوذ من الطرق نفسها ولم نجد وصفا مكتوبا له")

S("w-chevron-left", "علامة اتجاه تحذيرية مفردة إلى اليسار",
  "الطريق ينعطف إلى اليسار بحدة عند هذه اللوحة",
  "خفف السرعة واتبع اتجاه السهم، ولا تسر مباشرة نحو اللوحة",
  3, ["w-chevron-right", "w-chevrons-left", "w-bend-left", "m-go-this-way"], "rect",
  "yellow background, black chevron", "",
  "Upright rectangle (taller than wide) with a yellow background and one thick black chevron (<) pointing to the LEFT in the centre",
  "", ["S1", "S4"], "high")

S("w-chevrons-right", "علامة اتجاه تحذيرية متعددة إلى اليمين",
  "منعطف حاد إلى اليمين أو جزيرة دوار، والأسهم ترسم لك اتجاه السير",
  "خفف السرعة واتبع اتجاه الأسهم حول المنعطف أو الجزيرة",
  3, ["w-chevrons-left", "w-chevron-right", "w-double-bend-right", "m-roundabout"], "rect",
  "yellow background, black chevrons", "",
  "Wide horizontal rectangle with a yellow background and a row of three or four black chevrons all pointing to the RIGHT",
  "في الدوارات تشير الأسهم إلى اليمين لأن السير حول الجزيرة عكس عقارب الساعة",
  ["S1", "S4"], "high")

S("w-chevrons-left", "علامة اتجاه تحذيرية متعددة إلى اليسار",
  "منعطف حاد إلى اليسار، والأسهم ترسم لك اتجاه السير",
  "خفف السرعة واتبع اتجاه الأسهم حول المنعطف",
  3, ["w-chevrons-right", "w-chevron-left", "w-double-bend-left"], "rect",
  "yellow background, black chevrons", "",
  "Wide horizontal rectangle with a yellow background and a row of three or four black chevrons all pointing to the LEFT",
  "", ["S1", "S4", "S3"], "high")

S("w-chevron-t-junction", "تحويل حاد إلى اليمين أو اليسار عند تقاطع T",
  "الطريق ينتهي أمامك عند تقاطع على شكل T، وعليك الانعطاف يمينا أو يسارا",
  "خفف السرعة واستعد للتوقف، ثم انعطف في الاتجاه المطلوب بعد إفساح الطريق",
  4, ["w-t-junction", "w-chevrons-right", "m-go-this-way"], "rect",
  "yellow background, black chevrons", "",
  "Wide horizontal rectangle with a yellow background: black chevrons pointing LEFT on the left half and black chevrons pointing RIGHT on the right half, back to back in the centre",
  "", ["S1", "S4", "S3"], "high")

S("w-hazard-marker", "علامة الخطر",
  "تنبهك إلى عائق ثابت قرب الطريق مثل بداية جزيرة أو دعامة جسر أو نقطة تفرع مخرج",
  "خفف السرعة ومر من الجهة التي تنحدر نحوها الخطوط المائلة",
  4, ["w-chevron-right", "w-other-danger", "t-barriers"], "rect",
  "yellow and black diagonal stripes", "",
  "Upright rectangle filled with alternating diagonal black and yellow stripes (about 5 of each) at 45 degrees; the stripes slope DOWN toward the side on which traffic must pass (the version for passing on the right slopes down to the right)",
  "", ["S1", "S4", "S3"], "high")

# =====================================================================================
# PROHIBITORY AND RESTRICTIVE
# =====================================================================================
S("r-no-entry", "ممنوع الدخول",
  "ممنوع على كل المركبات دخول هذا الطريق من هذه الجهة، وغالبا لأنه طريق باتجاه واحد عكس اتجاهك",
  "لا تدخل، واختر طريقا آخر",
  1, ["r-no-parking", "p-stop", "i-one-way", "i-dead-end"], "circle", "red background, white horizontal bar", "",
  "Solid red disc with a thin white rim; a thick white horizontal bar across the centre, about 60 percent of the diameter wide",
  "هيئة الطرق تسميها في كتيبها: يجب عليك عدم دخول هذا الشارع، والسير عكس الاتجاه من أخطر المخالفات",
  ["S1", "S4", "S3", "S20"], "high")

S("r-no-left-turn", "ممنوع الانعطاف إلى اليسار",
  "ممنوع عليك الانعطاف إلى اليسار عند التقاطع التالي",
  "تابع مستقيما أو انعطف يمينا إذا كان ذلك مسموحا، ولا تنعطف يسارا",
  1, ["r-no-right-turn", "r-no-u-turn", "m-turn-left", "m-turn-left-ahead"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black arrow rising from the bottom centre then bending 90 degrees to the LEFT, arrowhead pointing left. A red diagonal slash from top left to bottom right drawn OVER the arrow",
  "", ["S1", "S4", "S3"], "high")

S("r-no-right-turn", "ممنوع الانعطاف إلى اليمين",
  "ممنوع عليك الانعطاف إلى اليمين عند التقاطع التالي",
  "تابع مستقيما أو انعطف يسارا إذا كان ذلك مسموحا، ولا تنعطف يمينا",
  1, ["r-no-left-turn", "m-turn-right", "m-turn-right-ahead", "r-no-u-turn"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black arrow rising from the bottom centre then bending 90 degrees to the RIGHT, arrowhead pointing right. A red diagonal slash from top left to bottom right drawn OVER the arrow",
  "", ["S1", "S4", "S3"], "high")

S("r-no-u-turn", "ممنوع الدوران للخلف",
  "ممنوع عليك الدوران للعودة في الاتجاه المعاكس في هذا المكان",
  "تابع حتى أقرب فتحة دوران مسموحة أو دوار",
  1, ["r-no-left-turn", "w-u-turn-ahead", "r-no-entry"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black U-shaped arrow: the shaft rises on the right, curves over the top to the LEFT and comes down on the left with the arrowhead pointing DOWN. A red diagonal slash from top left to bottom right OVER the arrow",
  "لوحات المعاهد تسميها: ممنوع الدوران إلى الاتجاه المعاكس",
  ["S1", "S4", "S3"], "high")

S("r-no-overtaking", "ممنوع التجاوز",
  "ممنوع عليك تجاوز المركبات الأخرى من مكان الإشارة حتى نهاية المنع",
  "ابق خلف المركبة التي أمامك في مسارك ولا تتجاوزها",
  1, ["r-no-overtaking-trucks", "w-two-way-traffic", "p-give-way-oncoming"], "circle", PROHIB_COL, "",
  "White disc with red ring and NO slash. Two cars seen from behind side by side in the centre: the LEFT car is RED and the RIGHT car is BLACK (the red one is the car that would pull out to overtake on the left)",
  "التجاوز في الإمارات يكون من اليسار، ولذلك تظهر السيارة الحمراء (التي تريد التجاوز) على اليسار",
  ["S1", "S4", "S3"], "high")

S("r-no-overtaking-trucks", "ممنوع تجاوز الشاحنات",
  "ممنوع على الشاحنات تجاوز المركبات الأخرى في هذا المقطع",
  "إذا كنت تقود شاحنة فلا تتجاوز، وإذا كنت في سيارة فتوقع أن تبقى الشاحنات في مسارها",
  4, ["r-no-overtaking", "r-no-trucks", "i-lane-trucks-restricted"], "circle", PROHIB_COL, "",
  "White disc with red ring and NO slash. Side by side seen from behind: a RED lorry on the LEFT and a BLACK car on the RIGHT",
  "", ["S12"], "medium")

S("r-no-horn", "ممنوع استخدام جهاز التنبيه",
  "ممنوع استعمال البوق في هذه المنطقة، مثل محيط المستشفيات",
  "لا تستخدم البوق، وتعامل مع المواقف بالحذر والانتظار",
  2, ["r-no-overtaking", "r-no-pedestrians", "m-headlights-on"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black horn (trumpet shape, bell opening to the right) in the centre with a red diagonal slash over it",
  "", ["S1", "S4", "S3"], "high")

S("r-no-pedestrians", "ممنوع مرور المشاة",
  "ممنوع على المشاة المشي أو العبور في هذا الطريق",
  "لا تمش على هذا الطريق، وإذا أردت العبور فاستخدم الجسر أو ممر المشاة",
  2, ["m-pedestrians-only", "w-pedestrian-crossing", "p-give-way-pedestrians"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black walking pedestrian in side view in the centre with a red diagonal slash over it",
  "", ["S1", "S4", "S3"], "high")

S("r-no-bicycles", "ممنوع مرور الدراجات الهوائية",
  "ممنوع على الدراجات الهوائية استخدام هذا الطريق",
  "إذا كنت على دراجة هوائية فاستخدم طريقا آخر أو مسار الدراجات",
  3, ["m-cyclists-only", "w-cyclists", "r-no-motorcycles"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black bicycle in side view with a red diagonal slash over it",
  "", ["S1", "S4", "S3"], "high")

S("r-no-motorcycles", "ممنوع مرور الدراجات النارية",
  "ممنوع على الدراجات النارية دخول هذا الطريق",
  "إذا كنت تقود دراجة نارية فاستخدم طريقا آخر",
  3, ["r-no-bicycles", "r-no-delivery-motorbikes", "r-no-quad-bikes"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black motorcycle with rider in side view with a red diagonal slash over it",
  "", ["S2", "S12"], "high")

S("r-no-delivery-motorbikes", "ممنوع مرور دراجات التوصيل",
  "ممنوع على دراجات التوصيل النارية استخدام هذا الطريق أو المسار المحدد",
  "إذا كنت تقود دراجة توصيل فالتزم بالطرق والمسارات المسموحة لك",
  4, ["r-no-motorcycles", "i-lane-delivery-motorbikes", "r-no-bicycles"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black motorcycle with rider in side view carrying a square delivery box behind the rider, with a red diagonal slash over it",
  "إشارة جديدة في دبي ضمن تنظيم حركة دراجات التوصيل",
  ["S5"], "high")

S("r-no-trucks", "ممنوع مرور مركبات الشحن",
  "ممنوع على الشاحنات ومركبات نقل البضائع دخول هذا الطريق",
  "إذا كنت تقود مركبة شحن فاسلك الطريق البديل المخصص للشاحنات",
  2, ["m-trucks-only", "r-no-buses", "r-no-overtaking-trucks", "x-trucks"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black lorry (box truck, side view, cab on the left) with a red diagonal slash over it",
  "تكثر في المدن، وأحيانا تحدد لوحة إضافية تحتها أوقات المنع مثل ساعات الذروة",
  ["S1", "S4", "S3", "S5"], "high")

S("r-no-buses", "ممنوع دخول الحافلات",
  "ممنوع على الحافلات دخول هذا الطريق",
  "إذا كنت تقود حافلة فاستخدم طريقا آخر",
  4, ["m-buses-only", "r-no-trucks", "i-bus-stop"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black bus in side view with a red diagonal slash over it",
  "", ["S2", "S5"], "high")

S("r-no-taxis", "ممنوع دخول سيارات الأجرة",
  "ممنوع على سيارات الأجرة دخول هذا الطريق أو المكان",
  "إذا كنت تقود سيارة أجرة فلا تدخل",
  5, ["m-taxis-only", "i-taxi-stand", "r-no-buses"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black car in side view with a small roof taxi light, with a red diagonal slash over it",
  "", ["S2"], "high")

S("r-no-hazardous", "ممنوع مرور المركبات التي تحمل مواد خطرة",
  "ممنوع على المركبات المحملة بمواد خطرة، مثل الوقود أو الغاز أو المواد القابلة للاشتعال، دخول هذا الطريق",
  "إذا كنت تنقل مواد خطرة فاستخدم الطريق المخصص لها",
  4, ["r-no-trucks", "w-other-danger", "r-no-overtaking-trucks"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black tanker truck in side view with a small flame symbol on its tank, and a red diagonal slash over it",
  "",
  ["S1", "S4", "S3"], "high")

S("r-no-quad-bikes", "ممنوع مرور الدراجات الرباعية",
  "ممنوع على الدراجات الرباعية (البقي) السير على هذا الطريق",
  "لا تقد الدراجة الرباعية على الطرق العامة، واستخدم المناطق المخصصة لها",
  5, ["r-no-motorcycles", "r-no-delivery-motorbikes", "w-sand-dunes"], "circle", PROHIB_COL, "",
  "White disc with red ring. A black quad bike (four-wheeled ATV with rider) in side view with a red diagonal slash over it",
  "تظهر قرب المناطق الصحراوية التي يكثر فيها استخدام الدراجات الرباعية",
  ["S12"], "medium")

SPEED_DRAW = "White disc with a thick red ring; the black number {n} in large bold Western digits centred. No units, no slash"
S("r-speed-25", "الحد الأقصى للسرعة 25 كم/ساعة",
  "ممنوع تجاوز سرعة 25 كم/ساعة في هذا المكان",
  "لا تتجاوز 25 كم/ساعة وانتبه للمشاة والمركبات الخارجة من المواقف",
  3, ["r-speed-40", "r-speed-60", "m-min-speed-60"], "circle", "white background, red border, black numerals", "25",
  SPEED_DRAW.format(n=25),
  "كتيب هيئة الطرق يحدد 25 كم/ساعة في مناطق المواقف",
  ["S20", "S16"], "medium")

S("r-speed-40", "الحد الأقصى للسرعة 40 كم/ساعة",
  "ممنوع تجاوز سرعة 40 كم/ساعة على هذا الطريق",
  "لا تتجاوز 40 كم/ساعة، وخفف أكثر إذا ازدحم الطريق أو قلت الرؤية",
  1, ["r-speed-60", "r-speed-25", "m-min-speed-60"], "circle", "white background, red border, black numerals", "40",
  SPEED_DRAW.format(n=40),
  "شائعة في الطرق الفرعية داخل الأحياء السكنية",
  ["S20", "S6", "S16"], "high")

S("r-speed-60", "الحد الأقصى للسرعة 60 كم/ساعة",
  "ممنوع تجاوز سرعة 60 كم/ساعة على هذا الطريق",
  "لا تتجاوز 60 كم/ساعة، وتذكر أن الرقم حد أعلى وليس سرعة مطلوبة",
  1, ["m-min-speed-60", "r-speed-40", "r-speed-80"], "circle", "white background, red border, black numerals", "60",
  SPEED_DRAW.format(n=60),
  "شائعة في الطرق المزدوجة داخل المدن",
  ["S20", "S16"], "high")

S("r-speed-80", "الحد الأقصى للسرعة 80 كم/ساعة",
  "ممنوع تجاوز سرعة 80 كم/ساعة على هذا الطريق",
  "لا تتجاوز 80 كم/ساعة، وخفف أكثر عند المطر أو الضباب أو الزحام",
  1, ["r-speed-60", "r-speed-100", "r-speed-by-vehicle"], "circle", "white background, red border, black numerals", "80",
  SPEED_DRAW.format(n=80),
  "شائعة في الطرق الرئيسية داخل المدن، وهي أيضا حد الشاحنات على كثير من الطرق السريعة",
  ["S1", "S20", "S16"], "high")

S("r-speed-100", "الحد الأقصى للسرعة 100 كم/ساعة",
  "ممنوع تجاوز سرعة 100 كم/ساعة على هذا الطريق",
  "لا تتجاوز 100 كم/ساعة، والتزم بالمسار الأيمن إذا كنت أبطأ من غيرك",
  2, ["r-speed-80", "r-speed-120", "r-speed-60"], "circle", "white background, red border, black numerals", "100",
  SPEED_DRAW.format(n=100),
  "شائعة على الطرق الخارجية وبعض الطرق السريعة داخل المدن",
  ["S20", "S16"], "high")

S("r-speed-120", "الحد الأقصى للسرعة 120 كم/ساعة",
  "ممنوع تجاوز سرعة 120 كم/ساعة على هذا الطريق",
  "لا تتجاوز 120 كم/ساعة، واترك المسار الأيسر للتجاوز فقط",
  1, ["r-speed-100", "r-speed-140", "m-min-speed-60"], "circle", "white background, red border, black numerals", "120",
  SPEED_DRAW.format(n=120),
  "أعلى حد شائع على الطرق السريعة في دبي والشارقة، وغالبا يرافقه حد أدنى 60 كم/ساعة",
  ["S3", "S20", "S16"], "high")

S("r-speed-140", "الحد الأقصى للسرعة 140 كم/ساعة",
  "ممنوع تجاوز سرعة 140 كم/ساعة على هذا الطريق",
  "لا تتجاوز 140 كم/ساعة، وانتبه لأن الحد يتغير عند دخول إمارة أخرى",
  4, ["r-speed-120", "r-speed-100"], "circle", "white background, red border, black numerals", "140",
  SPEED_DRAW.format(n=140),
  "موجودة على بعض الطرق الخارجية في إمارة أبوظبي فقط، ولن تراها في دبي أو الشارقة",
  ["S16"], "medium",
  "المصدر الوحيد لهذا الحد موسوعة عامة، ولم نجد قائمة رسمية حديثة بالطرق التي عليها 140 كم/ساعة")

S("r-speed-by-vehicle", "حدود السرعة حسب نوع المركبة",
  "اللوحة تحدد سرعة قصوى مختلفة لكل نوع مركبة على نفس الطريق، مثل سرعة أعلى للسيارات الخفيفة وأقل للشاحنات والحافلات",
  "اقرأ الرقم الموضوع بجانب رمز مركبتك والتزم به",
  4, ["r-speed-120", "r-speed-80", "x-trucks"], "rect",
  "white background, black border, black vehicle symbols, speed roundels with red rings", "",
  "Upright white rectangle with a black border divided into two rows: top row a black car silhouette on the left and a small speed-limit roundel (red ring, black 120) on the right; bottom row a black lorry silhouette and a roundel with black 80",
  "كتيب هيئة الطرق يحدد على الطرق السريعة 120 كم/ساعة للمركبات الخفيفة و80 كم/ساعة للثقيلة",
  ["S12", "S20"], "medium")

S("r-no-parking", "ممنوع الوقوف",
  "ممنوع ركن المركبة أو تركها منتظرة في المكان الذي تحدده الإشارة",
  "لا تترك مركبتك هنا ولا تنتظر فيها أحدا، وابحث عن موقف مسموح",
  1, ["r-no-stopping", "r-no-entry", "i-parking"], "circle", "blue background, red border, red diagonal bar", "",
  "Blue disc with a red ring and ONE red diagonal bar from top left to bottom right. No other symbol",
  "قد تجد تحتها لوحة أوقات أو سهم يحدد مكان المنع",
  ["S1", "S4", "S3"], "high",
  "لوحات المعاهد تذكر ممنوع الوقوف وممنوع الانتظار كبندين، ودمجناهما لأن المطلوب من السائق واحد: لا تترك مركبتك هنا")

S("r-no-stopping", "ممنوع الوقوف والتوقف",
  "ممنوع إيقاف المركبة في هذا المكان نهائيا ولو لثوان، حتى لإنزال راكب",
  "لا توقف مركبتك هنا لأي سبب إلا عند الضرورة القصوى أو بأمر رجل المرور",
  2, ["r-no-parking", "r-no-entry", "x-arrow-extent"], "circle", "blue background, red border, red cross", "",
  "Blue disc with a red ring and a red X made of two red diagonal bars crossing in the centre",
  "", ["S1", "S4", "S3"], "high")

S("r-max-height", "حد الارتفاع المسموح به",
  "ممنوع مرور أي مركبة يزيد ارتفاعها مع حمولتها على الرقم المكتوب",
  "إذا كانت مركبتك أعلى من الرقم فلا تدخل، واسلك طريقا بديلا",
  3, ["w-max-height-ahead", "r-max-width", "r-max-weight"], "circle", PROHIB_COL, "4.5 م",
  "White disc with red ring. The black text 4.5 م in the centre, with a small black triangle above it pointing DOWN and a small black triangle below it pointing UP",
  "", ["S1", "S4", "S3"], "high")

S("r-max-width", "حد العرض المسموح به",
  "ممنوع مرور أي مركبة يزيد عرضها على الرقم المكتوب",
  "إذا كانت مركبتك أعرض من الرقم فلا تدخل",
  4, ["r-max-height", "r-max-length", "w-road-narrows-both"], "circle", PROHIB_COL, "2.5 م",
  "White disc with red ring. The black text 2.5 م in the centre, with a small black triangle on its left pointing RIGHT and a small black triangle on its right pointing LEFT",
  "", ["S4"], "high")

S("r-max-length", "حد الطول المسموح به",
  "ممنوع مرور أي مركبة، أو مركبة مع مقطورة، يزيد طولها على الرقم المكتوب",
  "إذا كانت مركبتك أطول من الرقم فلا تدخل",
  4, ["r-max-width", "r-max-weight", "r-no-trucks"], "circle", PROHIB_COL, "15 م",
  "White disc with red ring. A black lorry silhouette in side view in the upper half; below it a black horizontal double-headed arrow with the black text 15 م",
  "", ["S5", "S2"], "high")

S("r-max-weight", "حد الوزن الإجمالي المسموح به",
  "ممنوع مرور أي مركبة يزيد وزنها الإجمالي مع الحمولة على الرقم المكتوب",
  "إذا كان وزن مركبتك مع حمولتها أكبر من الرقم فلا تدخل",
  4, ["r-max-axle", "r-max-height", "r-max-length"], "circle", PROHIB_COL, "10 t",
  "White disc with red ring. The large black number 10 in the centre followed by a smaller black letter t (tonnes)",
  "", ["S4", "S2"], "high")

S("r-max-axle", "حد الوزن على المحور الواحد",
  "ممنوع مرور أي مركبة يزيد الوزن على أي محور من محاورها على الرقم المكتوب",
  "إذا كانت حمولة محور مركبتك أكبر من الرقم فلا تدخل",
  5, ["r-max-weight", "r-max-length", "r-no-trucks"], "circle", PROHIB_COL, "8 t",
  "White disc with red ring. In the upper half a black truck axle seen from the side (two wheels joined by a short bar); below it the black text 8 t",
  "", ["S12"], "medium")

# =====================================================================================
# MANDATORY
# =====================================================================================
S("m-ahead-only", "السير إلى الأمام فقط",
  "عليك المتابعة مستقيما، والانعطاف يمينا أو يسارا غير مسموح",
  "تابع مستقيما عند التقاطع",
  1, ["i-one-way", "m-turn-right-ahead", "p-priority-over-oncoming"], "circle", MAND_COL, "",
  "Blue disc with white rim; one thick white arrow pointing straight UP in the centre",
  "كتيب هيئة الطرق يسميها: استمر في السير إلى الأمام فقط",
  ["S1", "S4", "S3", "S20"], "high")

S("m-turn-right", "السير باتجاه اليمين فقط",
  "عليك الانعطاف إلى اليمين",
  "انعطف يمينا، فالمتابعة مستقيما أو الانعطاف يسارا غير مسموحين",
  1, ["m-turn-right-ahead", "m-keep-right", "r-no-right-turn", "m-turn-left"], "circle", MAND_COL, "",
  "Blue disc with white rim; a thick white arrow that starts at the lower left, curves in a quarter circle and points horizontally to the RIGHT",
  "", ["S1", "S4", "S3", "S20"], "high")

S("m-turn-left", "السير باتجاه اليسار فقط",
  "عليك الانعطاف إلى اليسار",
  "انعطف يسارا، فالمتابعة مستقيما أو الانعطاف يمينا غير مسموحين",
  1, ["m-turn-left-ahead", "m-keep-left", "r-no-left-turn", "m-turn-right"], "circle", MAND_COL, "",
  "Blue disc with white rim; a thick white arrow that starts at the lower right, curves in a quarter circle and points horizontally to the LEFT",
  "", ["S4", "S3"], "high")

S("m-turn-right-ahead", "اتجه يمينا عند أول تقاطع",
  "عليك الانعطاف إلى اليمين عند التقاطع القادم",
  "استعد مبكرا، ادخل المسار الأيمن وانعطف يمينا عند التقاطع التالي",
  2, ["m-turn-right", "w-bend-right", "m-keep-right"], "circle", MAND_COL, "",
  "Blue disc with white rim; a thick white arrow rising vertically from the bottom centre, then bending at a right angle near the top and pointing to the RIGHT",
  "", ["S4", "S3"], "high")

S("m-turn-left-ahead", "اتجه يسارا عند أول تقاطع",
  "عليك الانعطاف إلى اليسار عند التقاطع القادم",
  "استعد مبكرا، ادخل المسار الأيسر وانعطف يسارا عند التقاطع التالي",
  2, ["m-turn-left", "w-bend-left", "m-keep-left"], "circle", MAND_COL, "",
  "Blue disc with white rim; a thick white arrow rising vertically from the bottom centre, then bending at a right angle near the top and pointing to the LEFT",
  "", ["S4", "S3", "S12"], "high")

S("m-keep-right", "الزم اليمين",
  "عليك المرور من يمين الجزيرة أو العائق الذي أمامك",
  "مر من الجهة اليمنى للعائق ولا تمر من يساره",
  1, ["m-keep-left", "m-pass-either-side", "m-turn-right"], "circle", MAND_COL, "",
  "Blue disc with white rim; one thick white arrow pointing diagonally DOWN to the lower RIGHT at 45 degrees",
  "", ["S1", "S4", "S3", "S20"], "high")

S("m-keep-left", "الزم اليسار",
  "عليك المرور من يسار الجزيرة أو العائق الذي أمامك",
  "مر من الجهة اليسرى للعائق ولا تمر من يمينه",
  2, ["m-keep-right", "m-pass-either-side", "m-turn-left"], "circle", MAND_COL, "",
  "Blue disc with white rim; one thick white arrow pointing diagonally DOWN to the lower LEFT at 45 degrees",
  "", ["S1", "S4", "S3", "S20"], "high")

S("m-pass-either-side", "المرور مسموح من الجهتين",
  "مسموح لك المرور من يمين العائق أو من يساره",
  "اختر الجهة المناسبة لاتجاهك وانتبه للمركبات في الجهة الأخرى",
  2, ["m-keep-right", "m-keep-left", "w-road-narrows-both"], "circle", MAND_COL, "",
  "Blue disc with white rim; two white arrows that start together near the top centre and diverge downward, one pointing down-left and one pointing down-right (like an inverted V)",
  "", ["S1", "S4", "S3", "S20"], "high")

S("m-roundabout", "دوار: سر باتجاه الأسهم",
  "أنت عند دوار، وعليك السير فيه باتجاه الأسهم أي عكس عقارب الساعة",
  "أفسح الطريق للمركبات داخل الدوار القادمة من يسارك، ثم ادخل وسر عكس عقارب الساعة",
  1, ["w-roundabout-ahead", "m-keep-right", "r-no-u-turn"], "circle", MAND_COL, "",
  "Blue disc with white rim; three thick white curved arrows arranged in a ring, all rotating ANTICLOCKWISE (the top arrow points left, the lower-left arrow points down and to the right, the lower-right arrow points up and to the right)",
  "", ["S1", "S4", "S3", "S20"], "high")

S("m-min-speed-60", "الحد الأدنى للسرعة 60 كم/ساعة",
  "عليك ألا تقل سرعتك عن 60 كم/ساعة على هذا الطريق ما دامت الظروف تسمح",
  "حافظ على 60 كم/ساعة على الأقل، إلا إذا منعك الزحام أو الطقس، فالقيادة البطيئة جدا تعرقل السير",
  2, ["r-speed-60", "r-speed-40", "r-speed-120"], "circle", MAND_COL, "60",
  "Blue disc with white rim; the large white number 60 centred",
  "تظهر على الطرق السريعة، والدائرة الزرقاء هنا تعني حدا أدنى وليس حدا أقصى",
  ["S2", "S4", "S3", "S20"], "high")

S("m-buses-only", "للحافلات فقط",
  "هذا الطريق أو المسار مخصص للحافلات فقط",
  "لا تدخل بسيارتك الخاصة",
  3, ["r-no-buses", "i-bus-lane-start", "i-bus-stop"], "circle", MAND_COL, "",
  "Blue disc with white rim; a white bus silhouette in side view in the centre",
  "", ["S2", "S12"], "high")

S("m-taxis-only", "لسيارات الأجرة فقط",
  "هذا الطريق أو المكان مخصص لسيارات الأجرة فقط",
  "لا تدخل بسيارتك الخاصة",
  4, ["r-no-taxis", "i-taxi-stand", "m-buses-only"], "circle", MAND_COL, "",
  "Blue disc with white rim; a white car silhouette in side view with a small roof taxi light",
  "", ["S2", "S12"], "high")

S("m-trams-only", "للترام فقط",
  "هذا الطريق أو الجزء منه مخصص للترام فقط",
  "لا تدخل بمركبتك إلى مسار الترام",
  3, ["w-tram-crossing", "m-buses-only", "r-no-entry"], "circle", MAND_COL, "",
  "Blue disc with white rim; a white modern tram silhouette in side view",
  "خاصة بدبي، ولوحات المعاهد تسميها أحيانا القطار فقط",
  ["S8", "S4", "S3"], "high")

S("m-trucks-only", "لمركبات البضائع فقط",
  "هذا الطريق أو المسار مخصص لمركبات نقل البضائع",
  "لا تدخل بسيارتك الخاصة إلا إذا سمحت لوحة أخرى",
  4, ["r-no-trucks", "x-trucks", "i-goods-parking"], "circle", MAND_COL, "",
  "Blue disc with white rim; a white lorry silhouette in side view",
  "", ["S2", "S12"], "high")

S("m-pedestrians-only", "للمشاة فقط",
  "هذا الممر مخصص للمشاة فقط، وممنوع على المركبات",
  "لا تدخل بمركبتك",
  2, ["r-no-pedestrians", "w-pedestrian-crossing", "m-shared-path"], "circle", MAND_COL, "",
  "Blue disc with white rim; a white adult pedestrian holding the hand of a smaller child, both walking",
  "", ["S2", "S12"], "high")

S("m-cyclists-only", "للدراجات الهوائية فقط",
  "هذا المسار مخصص للدراجات الهوائية فقط",
  "لا تدخل بمركبتك، وإذا كنت على دراجة فاستخدم هذا المسار",
  3, ["r-no-bicycles", "w-cyclists", "m-shared-path"], "circle", MAND_COL, "",
  "Blue disc with white rim; a white bicycle in side view",
  "", ["S2", "S12", "S5"], "high")

S("m-shared-path", "ممر مشترك للمشاة والدراجات",
  "هذا الممر مخصص للمشاة والدراجات الهوائية معا دون فصل بينهما",
  "لا تدخل بمركبتك، وإذا كنت على دراجة فخفف السرعة وانتبه للمشاة",
  4, ["m-segregated-path", "m-cyclists-only", "m-pedestrians-only"], "circle", MAND_COL, "",
  "Blue disc with white rim; a white bicycle in the upper half and white adult-and-child pedestrians in the lower half, with no dividing line",
  "", ["S2", "S12"], "high")

S("m-segregated-path", "ممر منفصل للمشاة والدراجات",
  "الممر مقسوم بخط إلى جزأين: جزء للدراجات وجزء للمشاة",
  "التزم بالجزء المخصص لك حسب الرمز",
  4, ["m-shared-path", "m-cyclists-only", "m-pedestrians-only"], "circle", MAND_COL, "",
  "Blue disc with white rim divided by a vertical white line through the centre; a white bicycle on the LEFT half and white pedestrians on the RIGHT half",
  "", ["S2", "S4"], "high")

S("m-headlights-on", "أشعل المصابيح الأمامية",
  "عليك تشغيل المصابيح الأمامية للمركبة من هذه النقطة",
  "شغل المصابيح الأمامية فورا، ولا تطفئها حتى تخرج من المنطقة مثل النفق",
  3, ["w-tunnel", "i-tunnel", "r-no-horn"], "circle", MAND_COL, "",
  "Blue disc with white rim; a white headlamp symbol: a rounded lamp shape on the left with 4 or 5 short horizontal white beam lines to its right",
  "",
  ["S2"], "high")

S("m-go-this-way", "يجب أن تسير بهذا الاتجاه",
  "عليك السير في الاتجاه الذي يشير إليه السهم",
  "انعطف أو تابع باتجاه السهم فقط",
  3, ["w-chevron-right", "m-turn-right", "m-keep-right"], "rect", "blue background, white rim, white arrow", "",
  "Horizontal blue rectangle with white rim; one large thick white arrow pointing to the RIGHT (a mirrored version points to the LEFT)",
  "", ["S1", "S4", "S3", "S20"], "high",
  "وجود الإشارة واسمها مؤكدان في كتيب الهيئة ولوحات المعاهد، أما شكلها المستطيل فاجتهاد منا لأننا لم نر صورتها")

# =====================================================================================
# INFORMATION
# =====================================================================================
S("i-one-way", "طريق باتجاه واحد",
  "كل المركبات في هذا الطريق تسير في اتجاه السهم فقط",
  "سر باتجاه السهم فقط، ولا تدخل الطريق من نهايته",
  2, ["m-ahead-only", "r-no-entry", "p-priority-over-oncoming"], "rect", "blue background, white rim, white arrow", "",
  "Upright blue rectangle with white rim; one long white arrow pointing straight UP",
  "", ["S12"], "medium")

S("i-dead-end", "طريق غير نافذ",
  "الطريق الذي أمامك مسدود ولا يخرج إلى طريق آخر",
  "ادخله فقط إذا كانت وجهتك فيه، وتوقع أنك ستحتاج إلى الرجوع",
  2, ["w-dead-end-ahead", "r-no-entry", "i-one-way"], "square", "blue background, white rim, white bar, red bar", "",
  "Blue square with white rim; a thick white vertical bar rising from the bottom centre, topped by a thick RED horizontal bar (T shape)",
  "", ["S1", "S4", "S12"], "high")

S("i-parking", "موقف سيارات",
  "مكان مخصص لركن المركبات",
  "اركن داخل الخطوط المرسومة، والتزم بالرسوم أو الأوقات المكتوبة إن وجدت",
  1, ["i-paid-parking", "i-parking-pod", "r-no-parking"], "square", "blue background, white rim, white letter", "P",
  "Blue square with white rim; a large white capital letter P centred",
  "", ["S1", "S4"], "high")

S("i-parking-pod", "مواقف أصحاب الهمم",
  "موقف مخصص لمركبات أصحاب الهمم التي تحمل التصريح الخاص",
  "لا تركن هنا إلا إذا كانت مركبتك تحمل تصريح أصحاب الهمم",
  1, ["i-parking", "i-paid-parking", "i-loading-zone"], "square", "blue background, white rim, white symbols", "P",
  "Blue square with white rim; a white capital P on the left and a white wheelchair-user symbol on the right",
  "أصحاب الهمم هو المصطلح الرسمي في الإمارات لذوي الإعاقة، والوقوف في مواقفهم دون تصريح مخالفة كبيرة عليها غرامة ونقاط سوداء",
  ["S2", "S5", "S3"], "high")

S("i-paid-parking", "مواقف خاضعة للرسوم",
  "الوقوف هنا مقابل رسوم تدفعها عبر الجهاز أو التطبيق أو الرسالة النصية",
  "ادفع رسوم الوقوف فور الركن، والتزم بالمدة المدفوعة",
  2, ["i-parking", "i-parking-pod", "x-time"], "square", "blue background, white rim, white symbols", "P",
  "Blue square with white rim; a white capital P on the left, a small white parking-meter pictogram on the right, and a white arrow at the bottom pointing RIGHT (meter on the right side)",
  "الأوقات والرسوم تختلف حسب المنطقة والإمارة، فاقرأ اللوحة وجهاز الدفع قبل أن تبتعد عن مركبتك",
  ["S1", "S2", "S4", "S3"], "high")

S("i-goods-parking", "مواقف مركبات البضائع",
  "موقف مخصص لمركبات نقل البضائع",
  "لا تركن سيارتك الخاصة هنا",
  4, ["i-loading-zone", "m-trucks-only", "i-parking"], "square", "blue background, white rim, white symbols", "P",
  "Blue square with white rim; a white capital P with a small white lorry silhouette beside it",
  "", ["S4", "S3"], "high")

S("i-loading-zone", "موقف التحميل والتنزيل",
  "موقف مخصص للمركبات التجارية أثناء التحميل والتنزيل في الأوقات المكتوبة على اللوحة",
  "لا تركن هنا في الأوقات المكتوبة إلا إذا كنت تحمل أو تنزل بضائع بمركبة تجارية",
  4, ["i-goods-parking", "i-parking", "x-time"], "rect", "blue background, white rim, white symbols and text", "P",
  "Upright blue rectangle with white rim; a white P and a white lorry with an open rear door and a small box in the upper part; below them a white band where the permitted hours are written in black",
  "", ["S4", "S3", "S2"], "high")

S("i-taxi-stand", "موقف سيارات الأجرة",
  "مكان مخصص لوقوف سيارات الأجرة وانتظار الركاب",
  "لا تركن سيارتك الخاصة هنا ولا تتوقف فيه",
  3, ["m-taxis-only", "r-no-taxis", "i-bus-stop"], "rect", "blue background, white rim, white symbols", "TAXI",
  "Horizontal blue rectangle with white rim; a white car silhouette with a roof taxi light and the white word TAXI beside it",
  "", ["S4", "S2", "S3"], "high")

S("i-bus-stop", "موقف الحافلات",
  "مكان مخصص لوقوف حافلات النقل العام لإنزال الركاب وصعودهم",
  "لا تركن ولا تتوقف في موقف الحافلات، وانتبه للركاب النازلين",
  2, ["m-buses-only", "i-bus-lane-start", "i-taxi-stand"], "rect", "blue background, white rim, white symbol", "",
  "Upright blue rectangle with white rim; a white bus silhouette in side view",
  "", ["S4", "S2", "S3"], "high")

S("i-tow-away", "منطقة سحب المركبات المخالفة",
  "المركبة المتوقفة هنا بشكل مخالف معرضة للسحب بالرافعة",
  "لا تركن هنا، فالجهات المختصة تسحب المركبات المخالفة",
  3, ["r-no-parking", "r-no-stopping", "i-parking"], "rect", "white background, red border, black symbols", "",
  "Horizontal white rectangle with a red border; a black tow truck on the right lifting the front of a black car on the left",
  "", ["S2", "S4"], "high")

S("i-bicycle-parking", "موقف الدراجات الهوائية",
  "مكان مخصص لركن الدراجات الهوائية",
  "لا تركن سيارتك هنا، واركن الدراجة في المكان المخصص",
  5, ["i-parking", "m-cyclists-only", "w-cyclists"], "square", "blue background, white rim, white symbols", "P",
  "Blue square with white rim; a white capital P with a small white bicycle below it",
  "", ["S2"], "high")

S("i-freeway-start", "بداية الطريق السريع",
  "أنت تدخل طريقا سريعا بمداخل ومخارج محددة وسرعات عالية، وفيه حد أدنى للسرعة غالبا",
  "اندمج بسرعة مناسبة، والتزم بالحدين الأعلى والأدنى للسرعة، ولا تتوقف إلا في الطوارئ",
  2, ["i-freeway-end", "g-blue-direction", "m-min-speed-60"], "rect", "blue background, white rim, white symbol", "",
  "Blue rectangle with white rim; white pictogram of a dual carriageway seen in perspective (two roadways separated by a central strip) passing under a white bridge drawn across the top",
  "", ["S3", "S4", "S12"], "high")

S("i-freeway-end", "نهاية الطريق السريع",
  "ينتهي الطريق السريع هنا، وتبدأ طرق بسرعات أقل وتقاطعات",
  "خفف السرعة إلى الحد الجديد، وانتبه للتقاطعات والإشارات الضوئية القادمة",
  2, ["i-freeway-start", "w-dual-carriageway-ends", "r-speed-80"], "rect", "blue background, white rim, white symbol, red bar", "",
  "Same as the freeway start sign (white dual carriageway under a bridge on a blue rectangle) with a red diagonal bar from top left to bottom right across the pictogram",
  "", ["S3", "S4", "S12"], "high")

S("i-tunnel", "بداية النفق",
  "هنا يبدأ النفق",
  "أشعل المصابيح الأمامية، والتزم بمسارك وسرعتك، ولا تتوقف داخل النفق إلا في الطوارئ",
  4, ["w-tunnel", "m-headlights-on", "i-freeway-start"], "rect", "blue background, white rim, white symbol", "",
  "Blue rectangle with white rim; a white tunnel portal pictogram: a white arch shape with a dark blue opening and two white road lines converging into it",
  "", ["S12"], "medium")

S("i-salik", "بوابة سالك",
  "أمامك بوابة سالك لتحصيل رسوم المرور إلكترونيا في دبي، دون حواجز أو أكشاك",
  "لا تتوقف ولا تخفف فجأة، تابع بسرعتك العادية، وتأكد أن رصيد حسابك في سالك كاف",
  3, ["g-blue-direction", "i-vms", "i-freeway-start"], "rect", "blue background, white rim, white text", "سالك Salik",
  "Horizontal blue rectangle with white rim; the white word سالك on the upper line and Salik in white Latin letters below it, with a small white arrow pointing up to show the gate ahead",
  "نظام سالك يخصم الرسوم تلقائيا عند مرورك تحت البوابة عبر الملصق الذكي على الزجاج، وفي أبوظبي نظام مشابه اسمه درب يتعرف على المركبة من لوحة أرقامها",
  ["S4", "S1", "S18"], "high")

S("i-bus-lane-start", "بداية مسار الحافلات وسيارات الأجرة",
  "يبدأ من هنا مسار مخصص للحافلات وسيارات الأجرة",
  "لا تسر بسيارتك الخاصة في هذا المسار، وانتبه للحافلات التي تتوقف فيه",
  3, ["i-bus-lane-end", "m-buses-only", "i-bus-stop"], "rect", "blue background, white rim, white symbols", "",
  "Upright blue rectangle with white rim showing two or three white lane lines with upward arrows; the RIGHT lane carries small white bus and taxi pictograms",
  "كتيب هيئة الطرق يمنع السيارات الخاصة من السير في مسارات الحافلات، ويصفها بخطوط صفراء متصلة على جانبيها",
  ["S4", "S5", "S20"], "high")

S("i-bus-lane-end", "نهاية مسار الحافلات وسيارات الأجرة",
  "ينتهي هنا المسار المخصص للحافلات وسيارات الأجرة",
  "بعد اللوحة يصبح المسار عاما، فانتبه للحافلات التي تعود إلى الحركة العادية",
  4, ["i-bus-lane-start", "m-buses-only", "i-freeway-end"], "rect", "blue background, white rim, white symbols, red bar", "",
  "Same layout as the bus lane start sign with a red diagonal bar from top left to bottom right across it",
  "", ["S4", "S5"], "high")

S("i-lane-trucks-restricted", "ممنوع الشاحنات في المسار الأيسر",
  "لوحة تنظيم مسارات تمنع الشاحنات من السير في المسار الأيسر من هذا الطريق",
  "إذا كنت تقود شاحنة فالتزم بالمسارات اليمنى، وإذا كنت في سيارة فتوقع وجود الشاحنات في اليمين",
  3, ["r-no-trucks", "r-no-overtaking-trucks", "i-lane-delivery-motorbikes"], "rect",
  "blue background, white rim, white arrows, small prohibitory roundel", "",
  "Horizontal blue rectangle with white rim showing three or four white upward lane arrows; above the LEFT-most arrow a small no-trucks roundel (white disc, red ring, black lorry, red slash)",
  "", ["S1", "S4", "S5", "S3"], "high")

S("i-lane-delivery-motorbikes", "ممنوع دراجات التوصيل في المسارين الأيسرين",
  "لوحة تنظيم مسارات تمنع دراجات التوصيل النارية من السير في المسارين الأيسرين",
  "إذا كنت تقود دراجة توصيل فالتزم بالمسارات اليمنى المسموحة",
  4, ["i-lane-trucks-restricted", "r-no-delivery-motorbikes", "r-no-motorcycles"], "rect",
  "blue background, white rim, white arrows, small prohibitory roundels", "",
  "Horizontal blue rectangle with white rim showing five white upward lane arrows; above EACH of the two left-most arrows a small roundel (white disc, red ring, black motorbike with delivery box, red slash)",
  "إشارة جديدة في دبي على الطرق متعددة المسارات",
  ["S5"], "high")

S("i-lane-added", "إضافة مسار",
  "يبدأ مسار إضافي أمامك فيزيد عدد المسارات",
  "لا حاجة للاندماج، ويمكنك استخدام المسار الجديد بعد الغماز والتأكد من المرايا",
  4, ["i-lane-joining", "i-lanes-5-to-4", "w-right-lane-ends"], "rect", "blue background, white rim, white lane arrows", "",
  "Upright blue rectangle with white rim; two white upward lane arrows from the bottom, and a third white lane arrow that starts part way up on the RIGHT side, so the top shows three lanes",
  "", ["S1", "S4", "S3"], "high")

S("i-lane-joining", "انضمام مسار",
  "مسار من طريق آخر ينضم إلى طريقك من اليمين، وقد تدخل منه مركبات إلى المسار الأيمن",
  "انتبه للمركبات الداخلة من اليمين، واترك لها مجالا إذا أمكن",
  4, ["i-lane-added", "w-merge-right", "i-lanes-5-to-4"], "rect", "blue background, white rim, white lane arrows", "",
  "Upright blue rectangle with white rim; white upward lane arrows for the main road and a curved white lane joining from the lower RIGHT into the right side",
  "", ["S1", "S4", "S3"], "high")

S("i-lanes-5-to-4", "اندماج خمسة مسارات إلى أربعة",
  "عدد المسارات أمامك يقل من خمسة إلى أربعة، والمسار المنتهي يندمج في المجاور",
  "إذا كنت في المسار المنتهي فاندمج مبكرا بعد الغماز، ولا تسرع لتسبق المندمجين",
  4, ["i-lane-added", "w-right-lane-ends", "t-lane-closed-right"], "rect", "blue background, white rim, white lane arrows", "",
  "Upright blue rectangle with white rim; five white upward lane arrows at the bottom; the RIGHT-most arrow bends left and merges into its neighbour, so four arrows continue at the top",
  "", ["S1", "S4", "S3"], "high")

S("i-lane-directions", "تنظيم المسارات حسب الاتجاه",
  "كل سهم يبين الاتجاه المسموح لكل مسار عند التقاطع القادم",
  "اختر مسارك مبكرا حسب وجهتك، ولا تغير المسار قرب التقاطع",
  3, ["i-lane-trucks-restricted", "m-ahead-only", "m-turn-right-ahead"], "rect", "blue background, white rim, white arrows", "",
  "Horizontal blue rectangle with white rim above three or four lanes: the left lane has a white arrow turning LEFT with a small U-turn hook, the middle lanes have white arrows pointing straight UP, the right lane has an arrow turning RIGHT",
  "", ["S1", "S4", "S5", "S3"], "high")

S("i-vms", "لوحة الرسائل المتغيرة",
  "لوحة إلكترونية تعرض رسائل تتغير حسب الحالة، مثل الحوادث والزحام والضباب وحدود السرعة المؤقتة",
  "اقرأ الرسالة والتزم بما تعرضه، مثل حد السرعة المخفض أثناء الضباب",
  2, ["i-salik", "g-blue-direction", "t-arrow-board"], "rect", "black background, amber or white LED text", "",
  "Wide black rectangle with a dark grey frame; two lines of amber dot-matrix LED text (Arabic on top, English below) and a small speed roundel on the left",
  "القانون الاتحادي يعد الإشارات الإلكترونية من علامات السير، فما تعرضه ملزم مثل اللوحات الثابتة",
  ["S4", "S7", "S19"], "high")

# =====================================================================================
# SERVICES
# =====================================================================================
S("s-hospital", "مستشفى",
  "تدلك على اتجاه مستشفى قريب أو مدخله",
  "اتبع الاتجاه إذا احتجت إلى مستشفى، وانتبه قرب المستشفى لسيارات الإسعاف الداخلة والخارجة",
  2, ["s-airport", "i-parking", "r-no-horn"], "square", "blue background, white rim, white letter", "H",
  "Blue square with white rim; a large white capital letter H centred (often shown with a distance or an arrow)",
  "كتيب هيئة الطرق يعرض لوحة المستشفى ضمن اللوحات الإرشادية، وقد تسبقها لوحات مسافة",
  ["S1", "S4"], "high")

S("s-airport", "مطار",
  "تدلك على الطريق المؤدي إلى المطار",
  "اتبع رمز الطائرة ولوحات الاتجاه للوصول إلى المطار",
  2, ["w-low-flying-aircraft", "s-hospital", "g-blue-direction"], "square", "white airplane on the colour of the direction sign", "",
  "Small square panel in the colour of the direction sign (blue or green) with a white rim and a white airplane silhouette seen from above, nose pointing up",
  "لوحات مطار دبي الدولي من الأمثلة المعروضة في لوحات معاهد دبي",
  ["S4", "S3"], "high")

# =====================================================================================
# GUIDE
# =====================================================================================
S("g-e-route", "شعار طرق الإمارات (E)",
  "رقم طريق اتحادي يربط بين الإمارات، مثل E11 وE311",
  "استخدم رقم الطريق مع اسم الوجهة لتعرف مسارك، فالأرقام أسهل في المتابعة من الأسماء",
  3, ["g-d-route", "g-blue-direction", "g-green-direction"], "other",
  "blue falcon-shaped shield, white outline, gold numerals", "E 11",
  "Small emblem shaped like the outline of the UAE federal falcon emblem (a shield topped by a falcon head and spread shoulders), filled blue with a thin white outline; inside, the route number E 11 in gold (yellow) bold Latin characters",
  "الطرق الاتحادية أرقامها تبدأ بالحرف E وتظهر على اللوحات الزرقاء",
  ["S11", "S14", "S15", "S3"], "high")

S("g-d-route", "شعار طرق دبي (D)",
  "رقم طريق داخل إمارة دبي، مثل D94 شارع جميرا",
  "تابع رقم الطريق على اللوحات الخضراء للوصول إلى وجهتك داخل دبي",
  3, ["g-e-route", "g-green-direction", "g-white-street"], "other",
  "green fort-shaped emblem, white outline, white numerals", "D 94",
  "Small emblem shaped like a traditional fort tower (a rectangle with a crenellated top), filled green with a thin white outline; inside, the route number D 94 in white bold Latin characters",
  "", ["S14", "S15", "S3", "S4"], "high")

S("g-blue-direction", "لوحة اتجاهات زرقاء (طريق اتحادي)",
  "اللون الأزرق يدل على طريق اتحادي يربط بين الإمارات، وعليه أسماء الوجهات والأسهم",
  "اقرأ اللوحة مبكرا واختر المسار الذي فوقه سهم وجهتك",
  2, ["g-green-direction", "g-brown-tourist", "g-e-route"], "rect", "blue background, white rim, white text and arrows", "",
  "Wide blue rectangle with white rim; on the left a small E-route falcon emblem (E 11); in the centre two destination lines, each with Arabic text above its English translation in white; on the right a white arrow pointing up or up-right",
  "",
  ["S13", "S14", "S17"], "high")

S("g-green-direction", "لوحة اتجاهات خضراء (طرق دبي)",
  "اللون الأخضر يدل على طرق ومناطق داخل إمارة دبي",
  "تابع اسم المنطقة أو رقم الطريق للوصول إلى وجهتك داخل الإمارة",
  2, ["g-blue-direction", "g-white-street", "g-d-route"], "rect", "green background, white rim, white text and arrows", "",
  "Wide green rectangle with white rim; a small D-route fort emblem (D 94) on the left; destination names with Arabic above English in white; white arrows",
  "هذا التقسيم بالألوان معتمد في دبي، وقد تختلف ألوان لوحات الطرق المحلية في الإمارات الأخرى",
  ["S13", "S14"], "high")

S("g-brown-tourist", "لوحة سياحية بنية",
  "اللون البني يدل على معلم سياحي أو ترفيهي أو تجاري مهم",
  "اتبعها إذا كانت وجهتك معلما سياحيا",
  2, ["g-green-direction", "g-white-street", "g-blue-direction"], "rect", "brown background, white rim, white text and symbol", "",
  "Brown rectangle with white rim; a white pictogram of the attraction on the left and its name with Arabic above English in white, with a white arrow",
  "", ["S13", "S14", "S17"], "high")

S("g-white-street", "لوحة أسماء الشوارع والمناطق",
  "اللون الأبيض يدل على أسماء الشوارع والمناطق داخل الأحياء",
  "استخدمها لتحديد الشارع أو الحي داخل المناطق السكنية",
  2, ["g-green-direction", "g-brown-tourist", "x-distance"], "rect", "white background, dark border, dark text", "",
  "White rectangle with a thin dark border; the street name in black or dark blue, Arabic above English, sometimes with the community name in smaller letters",
  "", ["S13", "S14"], "high")

S("g-exit", "لوحة المخرج",
  "تدل على مخرج من الطريق السريع إلى وجهة محددة، وعليها رقم المخرج",
  "انتقل إلى مسار المخرج مبكرا واستخدم الغماز، ولا تقطع المسارات في آخر لحظة",
  2, ["g-exit-countdown", "g-blue-direction", "g-lane-drop"], "rect", "blue or green background, white rim, white text", "مخرج EXIT",
  "Green (or blue) rectangle with white rim; at the top a small tab of the same colour with the white words مخرج and EXIT and a number (for example 41); main area with destination names, Arabic above English, and a white arrow pointing up-right",
  "اقرأ اتجاه السهم جيدا، فليست كل التفرعات والمخارج على اليمين",
  ["S4", "S3"], "high")

S("g-exit-countdown", "لوحات العد التنازلي قبل المخرج",
  "تبين المسافة المتبقية إلى المخرج: 300 ثم 200 ثم 100 متر",
  "كن في المسار الصحيح قبل اللوحة الأولى، وخفف السرعة تدريجيا عند اقترابك من المخرج",
  3, ["g-exit", "x-distance", "w-hazard-marker"], "rect", "blue or green background, white rim, white diagonal stripes", "",
  "Three separate small upright rectangles in the route colour (blue or green) with white rim: the first has THREE white diagonal stripes slanting up to the right, the second TWO, the third ONE; they stand 300, 200 and 100 m before the exit",
  "", ["S4", "S1"], "high")

S("g-distance", "لوحة المسافات",
  "تبين المسافة بالكيلومتر إلى المدن أو المناطق القادمة على هذا الطريق",
  "استخدمها لتقدير المسافة والوقت المتبقي إلى وجهتك",
  2, ["g-blue-direction", "x-distance", "g-exit-countdown"], "rect", "blue or green background, white rim, white text", "",
  "Blue (federal road) or green rectangle with white rim listing two or three destinations, one per row: Arabic name, English name and the distance number followed by كم and km, aligned in a column on the right",
  "", ["S13", "S14"], "medium")

S("g-lane-drop", "لوحة مخرج بمسارين",
  "لوحة علوية تبين أن مسارا أو مسارين يخرجان من الطريق الرئيسي إلى المخرج",
  "إذا لم يكن المخرج وجهتك فابتعد مبكرا عن المسارات التي تتجه أسهمها إلى المخرج",
  4, ["g-exit", "i-lane-directions", "i-lanes-5-to-4"], "rect", "green or blue background, white rim, white text and arrows", "",
  "Wide overhead green or blue board with white rim; destination text Arabic above English; below it white downward arrows, one over each lane; the arrows over the exit lanes bend to the right under the words مخرج EXIT",
  "", ["S4", "S3"], "high")

# =====================================================================================
# TEMPORARY ROAD WORKS
# =====================================================================================
YELLOW_NOTE = "لون الخلفية الأصفر مأخوذ من دليل أبوظبي لإدارة المرور في مناطق العمل، وبعض المواقع تذكر البرتقالي، والمهم أن اللون المختلف يعني إشارة مؤقتة"

S("t-road-works", "أعمال طرق أمامك",
  "أمامك أعمال صيانة أو إنشاء على الطريق، وقد يوجد عمال وآليات وتحويلات",
  "خفف السرعة، والتزم بالسرعة المؤقتة وبالأقماع، ولا تتجاوز داخل منطقة العمل، وانتبه للعمال",
  2, ["w-other-danger", "t-flagman", "w-uneven-road"], "triangle", TEMP_COL, "",
  "Warning triangle with red border and YELLOW interior (temporary works colour); black pictogram of a worker digging with a shovel beside a small pile of earth",
  "", ["S1", "S4", "S3", "S9"], "high", YELLOW_NOTE)

S("t-lane-closed-right", "المسار الأيمن مغلق أمامك",
  "المسار الأيمن مغلق بسبب أعمال أو حادث، وعلى مركباته الانتقال إلى المسار المجاور",
  "إذا كنت في المسار الأيمن فانتقل إلى اليسار مبكرا بعد الغماز، وإذا كنت في المسار الأيسر فاترك المجال للمندمجين",
  2, ["t-lane-closed-left", "w-right-lane-ends", "t-two-lanes-closed-right"], "rect",
  "yellow background, black border, black lanes, red closure bar", "",
  "Upright yellow rectangle with black border; two black upward lane arrows for the open lanes on the left; the RIGHT lane has no arrow, its lane ends under a short thick red horizontal bar at the top, showing it is closed",
  "", ["S1", "S4", "S3", "S9"], "high", YELLOW_NOTE)

S("t-lane-closed-left", "المسار الأيسر مغلق أمامك",
  "المسار الأيسر مغلق بسبب أعمال أو حادث، وعلى مركباته الانتقال إلى المسار المجاور",
  "إذا كنت في المسار الأيسر فانتقل إلى اليمين مبكرا بعد الغماز، وإذا كنت في المسار الأيمن فاترك المجال للمندمجين",
  3, ["t-lane-closed-right", "w-left-lane-ends", "t-two-lanes-closed-right"], "rect",
  "yellow background, black border, black lanes, red closure bar", "",
  "Mirror of the right-lane-closed sign: upright yellow rectangle with black border; black upward lane arrows for the open lanes on the right; the LEFT lane ends under a short thick red horizontal bar",
  "", ["S1", "S4", "S3", "S9"], "high", YELLOW_NOTE)

S("t-two-lanes-closed-right", "مساران على اليمين مغلقان أمامك",
  "المساران الأيمنان مغلقان، ويبقى المرور في المسار أو المسارات اليسرى",
  "انتقل إلى المسار المفتوح مبكرا وخفف السرعة، والتزم بخط الأقماع",
  3, ["t-lane-closed-right", "t-lane-closed-left", "i-lanes-5-to-4"], "rect",
  "yellow background, black border, black lanes, red closure bars", "",
  "Upright yellow rectangle with black border showing three lanes: the LEFT lane with a black upward arrow; the two RIGHT lanes closed, each ending under a short thick red horizontal bar",
  "", ["S4", "S3", "S9"], "high", YELLOW_NOTE)

S("t-contraflow", "تحويل إلى الجهة المعاكسة من الطريق المزدوج",
  "الطريق أمامك مغلق، والمرور يتحول مؤقتا إلى الجهة الأخرى من الطريق المزدوج، وستسير المركبات القادمة بجانبك",
  "خفف السرعة واتبع الأسهم والأقماع، والتزم بيمين مسارك لأن المركبات القادمة قريبة منك",
  4, ["w-two-way-traffic", "t-diversion", "w-dual-carriageway-ends"], "rect",
  "yellow background, black border, black diagram, red bar", "",
  "Yellow rectangle with black border; two parallel carriageways drawn as black strips with a gap between them; your (right) carriageway is blocked by a red bar, and a black arrow crosses from it over the gap into the left carriageway, then continues up beside a black downward arrow for oncoming traffic",
  "", ["S1", "S4", "S3", "S9"], "high", YELLOW_NOTE)

S("t-diversion", "تحويلة",
  "الطريق المعتاد مغلق مؤقتا، والأسهم تدلك على الطريق البديل",
  "اتبع لوحات التحويلة حتى تعود إلى طريقك",
  2, ["t-contraflow", "m-go-this-way", "g-exit"], "rect", "yellow background, black border, black text and arrow", "تحويلة DIVERSION",
  "Horizontal yellow rectangle with black border; the black Arabic word تحويلة on the upper line and DIVERSION in black capitals below it, with a thick black arrow pointing in the direction of the detour",
  "", ["S4", "S1", "S9"], "high", YELLOW_NOTE)

S("t-flagman", "عامل بعلم أمامك",
  "أمامك عامل ينظم السير يدويا في منطقة أعمال",
  "خفف السرعة واستعد للتوقف، والتزم بإشارة العامل",
  3, ["t-road-works", "w-children", "w-pedestrian-crossing"], "triangle",
  "yellow background, red border, black symbol, red flag", "",
  "Warning triangle with red border and YELLOW interior; a black standing worker figure holding up a flag on a short pole, the flag drawn red",
  "", ["S12", "S9"], "medium", YELLOW_NOTE)

S("t-cones", "أقماع المرور",
  "الأقماع ترسم مسارا مؤقتا أو تغلق جزءا من الطريق",
  "لا تعبر خط الأقماع ولا تسر بينها، واتبع المسار الذي ترسمه حتى لو خالف الخطوط الأرضية",
  2, ["t-barriers", "t-arrow-board", "w-hazard-marker"], "other", "orange cones with white reflective bands", "",
  "A diagonal row of three orange traffic cones in perspective, each with two white reflective bands and a square black base, forming a lane taper",
  "", ["S9"], "medium")

S("t-barriers", "حواجز الأعمال المؤقتة",
  "حواجز بلاستيكية أو خرسانية تفصل منطقة العمل أو ترسم تحويلة",
  "ابق بعيدا عن الحواجز، والتزم بالمسار المحدد وخفف السرعة",
  3, ["t-cones", "t-arrow-board", "w-hazard-marker"], "other", "alternating red and white barrier segments", "",
  "A line of interlocking plastic water-filled barriers in alternating red and white segments, each segment trapezoid-shaped in side view",
  "", ["S9"], "medium")

S("t-arrow-board", "لوحة السهم الوامض",
  "لوحة مضيئة على شاحنة أو مقطورة تبين أن المسار مغلق وتدلك على جهة الانتقال",
  "انتقل إلى الجهة التي يشير إليها السهم مبكرا وبهدوء",
  3, ["t-cones", "i-vms", "m-go-this-way"], "other", "black panel, amber lamps", "",
  "A black rectangular panel mounted on the back of a truck; a large arrow made of amber lamp dots pointing LEFT (move to the left lane)",
  "", ["S9"], "medium")

# =====================================================================================
# SUPPLEMENTARY PLATES
# =====================================================================================
PLATE_COL = "white background, black border, black text or symbol"

S("x-distance", "لوحة المسافة",
  "تبين المسافة بين الإشارة التي فوقها وبداية الخطر أو المكان المقصود",
  "استعد للموقف قبل الوصول إلى المسافة المكتوبة",
  3, ["x-length", "g-exit-countdown", "g-distance"], "plate", PLATE_COL, "200 م",
  "Small horizontal white plate with a black border and rounded corners; the black text 200 م centred",
  "تسميها هيئة الطرق في كتيبها الإنجليزي Qualification Plate، وتضعها تحت الإشارة لتحدد تفاصيلها",
  ["S1", "S4"], "high")

S("x-length", "لوحة طول المنطقة",
  "تبين طول المقطع الذي يستمر فيه الخطر أو المنع، مثلا 2 كم",
  "استمر في الحذر أو في الالتزام بالمنع طوال المسافة المكتوبة",
  4, ["x-distance", "x-arrow-extent", "g-distance"], "plate", PLATE_COL, "2 كم",
  "Small white plate with a black border; on the left a black vertical double-headed arrow, on the right the black text 2 كم",
  "", ["S4", "S12"], "medium")

S("x-time", "لوحة الأوقات",
  "تبين الأوقات أو الأيام التي تنطبق فيها الإشارة التي فوقها، وخارجها لا ينطبق هذا المنع",
  "طابق الوقت الحالي مع الأوقات المكتوبة قبل أن تركن أو تدخل",
  3, ["x-arrow-extent", "i-paid-parking", "x-distance"], "plate", PLATE_COL, "8:00 - 21:00",
  "Small white plate with a black border; the black text 8:00 - 21:00 on the first line and the days السبت - الخميس on a second line",
  "", ["S1", "S2", "S4"], "high")

S("x-arrow-extent", "لوحة سهم امتداد المنع",
  "السهم يبين الجهة التي يمتد إليها المنع من مكان الإشارة، والسهم ذو الرأسين يعني أن المنع قبل الإشارة وبعدها",
  "لا تقف ولا تتوقف في الجهة التي يشير إليها السهم",
  4, ["x-time", "x-length", "m-go-this-way"], "plate", PLATE_COL, "",
  "Small white plate with a black border; a black horizontal double-headed arrow across it (single-headed versions point only left or only right)",
  "", ["S4", "S3"], "high")

S("x-trucks", "لوحة الشاحنات",
  "الإشارة التي فوقها تنطبق على الشاحنات فقط",
  "إذا كنت تقود سيارة خفيفة فالإشارة لا تخصك، وإذا كنت تقود شاحنة فالتزم بها",
  3, ["x-cars", "r-no-trucks", "m-trucks-only"], "plate", PLATE_COL, "",
  "Small white plate with a black border; a black lorry silhouette in side view",
  "", ["S12", "S2"], "high")

S("x-buses", "لوحة الحافلات",
  "الإشارة التي فوقها تنطبق على الحافلات فقط، مثل إلزام الحافلات بالتزام اليمين",
  "إذا كنت تقود سيارة خاصة فالإشارة لا تخصك، وإذا كنت تقود حافلة فالتزم بها",
  4, ["x-trucks", "m-buses-only", "r-no-buses"], "plate", PLATE_COL, "",
  "Small white plate with a black border; a black bus silhouette in side view",
  "كتيب الهيئة يعرض إشارة الزم اليمين وتحتها لوحة حافلة لتلزم الحافلات وحدها",
  ["S2"], "high")

S("x-cars", "لوحة السيارات الخفيفة",
  "الإشارة التي فوقها تنطبق على السيارات الخفيفة فقط",
  "إذا كنت تقود سيارة خفيفة فالتزم بالإشارة",
  4, ["x-trucks", "x-motorcycles", "r-speed-by-vehicle"], "plate", PLATE_COL, "",
  "Small white plate with a black border; a black car silhouette in side view",
  "", ["S12", "S2"], "medium")

S("x-motorcycles", "لوحة الدراجات النارية",
  "الإشارة التي فوقها تنطبق على الدراجات النارية فقط",
  "إذا كنت تقود دراجة نارية فالتزم بالإشارة",
  5, ["x-cars", "x-trucks", "r-no-motorcycles"], "plate", PLATE_COL, "",
  "Small white plate with a black border; a black motorcycle with rider in side view",
  "", ["S12", "S2"], "medium")

S("x-reduce-speed-now", "لوحة خفف السرعة الآن",
  "تطلب منك تخفيف السرعة فورا لأن أمامك خطرا أو منطقة أبطأ",
  "ارفع قدمك عن دواسة الوقود وخفف السرعة الآن دون فرملة مفاجئة",
  3, ["x-distance", "w-other-danger", "t-road-works"], "plate", PLATE_COL, "",
  "Horizontal white plate with a black border carrying two lines of black text: the Arabic meaning reduce speed now on the upper line and REDUCE SPEED NOW in capitals below",
  "", ["S4"], "medium")


def main():
    doc = {"updated": "2026-09-29", "sources": SOURCES, "categories": CATEGORIES, "signs": SIGNS}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("wrote", OUT, len(SIGNS), "signs")


if __name__ == "__main__":
    main()
