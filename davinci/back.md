# الملحق أ: بطاقة SOP صفحة وحدة

> **طريقة الاستعمال:** بطاقة تنفذها مع كل ريل بالترتيب، من مشروع جديد إلى ملف مفحوص ومرفوع خاصا، وكل بند يحيل إلى الفصل الذي فيه الخطوات والمصدر، وما عليه ⚠ لا تعامله كقاعدة قبل أن تنفذ الفحص الذي يحمل رقمه وتكتب نتيجته في `05_Docs\PROJECT_NOTES.txt`
>
> العلامات: ✔ موثق، ◐ توصية أو مصدر واحد، ⚠ غير مؤكد وعليك فحصه (برقم الفحص)

> **قاعدة:** مسار ألوان واحد (المسار أ)، وفرع غاما واحد (G22 أو G24) لكل مشروع، ومرحلة واحدة لضغط الإضاءات العالية، ولا يغادر الملف جهازك قبل `ffprobe` وقياس الصوت ومشاهدة كاملة

## 1. مرة واحدة قبل أول ريل

- [ ] نسخة احتياطية: ملف `.drp` لكل مشروع قديم، ونسخة من مكتبة المشاريع، واختبار استعادة، كل ذلك قبل أول تشغيل لـ 21.x لأن الترقية باتجاه واحد ✔ (الفصل 2 القسم 2، والفصل 1 القسم 1.4، فحص CHK-001)
- [ ] درايفر NVIDIA Studio رقم 581.57 أو أحدث ✔ من فرع Studio لا Game Ready، ولا تغيره في منتصف مشروع ◐ (الفصل 2 القسم 3.3)
- [ ] `ffprobe` و`ffmpeg` و`MediaInfo` وسكربت `atoms.py` تعمل من `cmd.exe` (الفصل 19 القسم 2، فحص CHK-002)
- [ ] سلسلة العرض: DisplayPort من البطاقة إلى الشاشة، و3840 x 2160، و60 Hz، وRGB، و10 bpc، و`Full` ⚠ (فحص CHK-010)، وفي قائمة الشاشة `Dynamic Contrast` = `Off` و`Color Mode` = `sRGB` أو `BT.709` (و`Custom` بعد القياس فقط) ✔ (الفصل 3 القسم 3)
- [ ] Windows: HDR وAuto HDR وNight light مطفأة، ولا ملف ICC مرتبطا بالشاشة ◐ (الفصل 2 القسم 4، فحص CHK-009)
- [ ] فرع الغاما: **G22** (`Rec.709 Gamma 2.2`) افتراضي مؤقت ◐، و**G24** (`Rec.709 Gamma 2.4`) فقط إذا وجد فحص CHK-016 وضعا قريبا من 2.4 وحالة غرفة معتمة قابلة للتكرار ⚠، والفرع يتبع الشاشة لا الغرفة ولا الهاتف (الفصل 3 القسم 5)
- [ ] سطوع الشاشة قيمة واحدة ثابتة مسجلة "غير مقاس" ◐ (فحص CHK-014)، وكل إعداد إضاءة مصنف DIM أو LIT بانعكاس الشاشة السوداء ◐ (فحص CHK-012، الفصل 3 القسم 6)
- [ ] قوالبك محفوظة: مشروع `MIQ_ROUTE_A_1080x1920_25p` (الفصل 13 القسم 3.2)، وشجرة `MIQ_FIXED_TREE` (الفصل 9 القسم 4.1)، وتسليم `REELS_H264_1080x1920` (الفصل 12 القسم 4.5) ◐

## 2. مشروع جديد قبل أي استيراد

- [ ] `File > New Project` بالاسم `<Place>_R<NN>_<slug>` من القالب (الفصل 13 القسم 3.1)
- [ ] تأكد: `Timeline resolution` 1080 x 1920، و`Pixel aspect ratio` = `Square`، و`Timeline frame rate` 25، و`Mismatched resolution files` = `Scale full frame with crop` (الافتراضي `Scale entire image to fit` يضع لقطة 16:9 شريطا رفيعا وسط الإطار)، و`Resize Filter` = `Sharper`، و`Output Scaling` = `Match timeline settings` ✔ الأسماء ◐ القيم (الفصل 13 القسم 3.1)
- [ ] معدل الإطارات يقفل عند دخول أول ملف إلى Media Pool لا عند إنشاء التايم لاين ✔، فلا تستورد قبل هذه الخطوات
- [ ] `Project Settings > Color Management` بالمسار أ (الجدول الكامل في الفصل 7 القسم 4):
  - `Color science` = `DaVinci YRGB Color Managed` (لا `(Legacy)`)، و`Automatic color management` غير مفعل ◐
  - `Timeline color space` = `DaVinci Wide Gamut` / `DaVinci Intermediate` ◐ ⚠ (فحص CHK-029)، ولا تغيرها بعد بدء التلوين
  - `Timeline working luminance` = `Custom` 10000 nits، و`Input DRT` = `None`، و`Output DRT` = `DaVinci` ◐ ⚠ (فحص CHK-057)، وتقفل بعد الفحص
  - `Output Color Space` بحسب فرع الغاما، ولا `Rec.709-A` أبدا على Windows ◐ ⚠ (فحص CHK-029)
  - `3D lookup table interpolation` = `Tetrahedral` ✔، وخانات الـ LUT الخمس فارغة (إلا `Color Viewer Lookup Table` لـ LUT معايرة مقاسة) ✔، ولا عقد CST في الشجرة ◐
  - بعد تعديل أي حقل مساحة ألوان أعد فتح قائمتي DRT أخيرا واقرأهما ⚠ (فحص CHK-055)
- [ ] سجل في `PROJECT_NOTES.txt`: المسار، وفرع الغاما، وقيم الـ DRT، ونسخة Resolve، ومعدل الإطارات، والتاريخ (الفصل 7 القسم 4.2)

## 3. الوسائط والإدخال

- [ ] لا تعد تسمية ملف كاميرا ولا تنقله، والمجلدات `01_Media\A_CAM_ZR\{R3D,NEV,H265,PRORES}` و`01_Media\PHONE`، والـ Bins مرقمة، ولون المقطع: Orange لـ R3D NE وBlue لـ N-Log H.265 وTeal لـ ProRes وGreen للهاتف ◐ (الفصل 2 القسم 6.2، والفصل 13 القسم 4)
- [ ] لقطات الهاتف: `ffprobe` قبل الاستيراد (`r_frame_rate` و`avg_frame_rate` وعلم الدوران)، وحولها إلى معدل إطارات ثابت احتياطا ◐ (الفصل 6 القسم 8.1، والفصل 13 القسم 4.3)
- [ ] مدخل واحد صحيح لكل مقطع (الفصل 6 القسم 2):
  - R3D NE: لا شيء، يفك Resolve الخام تلقائيا تحت المسار أ ✔
  - N-Log H.265 أو ProRes 422 HQ: كليك يمين في Media Pool > `Input Color Space` = `Rec.2020` و`Input Gamma` = `Nikon N-Log` ⚠ (فحص CHK-039)، واقرأ `Data Levels` قبل أن تثق بأي رقم ⚠ (فحص CHK-040)
  - هاتف SDR: يقرأ Resolve الوسم المدمج ⚠ (فحص CHK-046)، وهاتف HDR تجنبه ◐
  - N-RAW وProRes RAW HQ: ليسا للتسليم قبل أن يحسم فحص CHK-049 أمرهما ⚠
  - لا تكدس محول إدخال وCST وLUT على مقطع واحد، و`Bypass Color Management` لمقطع يحتاج CST أو LUT داخل المسار أ ✔
- [ ] مجموعات الألوان `ZR_R3D` و`ZR_NLOG` و`PHONE` بـ `Add Into New Group` ◐ (الفصل 9 القسم 3)

## 4. المونتاج

- [ ] 25 fps للتايم لاين والتصوير والتسليم، والحركة البطيئة تصور بـ 50p فتصير 50.0% بالضبط ✔ حساب ◐ سياسة (الفصل 4 القسم 3.5، والفصل 13 القسم 7)
- [ ] ثبت الصورة قبل التلوين: إعادة التأطير (`Smart Reframe`، نسخة Studio فقط ✔) ثم الريتايم والتثبيت ◐ (الفصل 13 القسم 9)
- [ ] هامش التكبير على إطار 6048 x 3402 هو 1.77 عند `Decode Quality` Full فقط ✔ حساب، وفك Half للتقطيع فقط (الفصل 13 القسم 3.3)
- [ ] الكابشن: قرر فخ الكابشن قبل بناء الشجرة ◐ ⚠ (فحص CHK-062)، واختبر العربية أولا ⚠ (فحص CHK-074)، وضع العنوان الحرج على Edit لا على Fusion (الفصل 14 القسمان 5 و8)
- [ ] الصوت: 48 kHz، وسلسلة الصوت البشري (تنظيف أولا) ثم `Ducker` تحت الصوت، والموسيقى المرجعية على تراك مكتوم غير موجه إلى Main ◐ (الفصل 15 الأقسام 5 و6)

## 5. التلوين

- [ ] قبل الجلسة: اقرأ `PROJECT_NOTES.txt` وصنف الغرفة، والقرارات الحرجة (التباين وعمق الظلال ومستوى البشرة واللوك) في DIM فقط، وفي LIT تعمل على التقني ◐ (الفصل 9 القسم 6.0، والفصل 3 القسم 6)
- [ ] الشجرة الثابتة، كلها تسلسلية: `CAM MATCH` (Group Pre-Clip) ثم على المقطع `NR` و`BALANCE` و`TONE` و`COLOR` و`SKIN` و`ENV` و`SHAPE` ثم `LOOK` و`HALATION` (Group Post-Clip) ثم `PHONE TRIM` و`GRAIN` (Timeline)، ولا `CST IN` ولا `CST OUT` ولا `SHARP` إلا في المسار ب ◐ (الفصل 9 القسم 2)
- [ ] مرحلة واحدة فقط لضغط الإضاءات العالية: `Output DRT` في المسار أ، وأي لوك له منحنى نغمات يحسب مرحلة ◐ (الفصل 7 القسم 6)
- [ ] الترتيب: إدخال، فتقني (`BALANCE` بإزاحة التعريض ثم `TONE` بـ Pivot عند 0.336 في عرض DaVinci Intermediate ✔ حساب)، فلون وكثافة، فبشرة على الخط، فلوك وحبيبات ◐ (الفصل 9 القسم 6)
- [ ] المقاييس بالنسبة المئوية والكود بين قوسين، وسم مع كل رقم أي عرض تقصد (DaVinci Intermediate أو الإخراج) ⚠ (فحص CHK-056): رمادي 18% بعد مرحلة الإخراج بلا ضغط نغمات نحو 45.9% (469) في G22 ونحو 48.9% (501) في G24 ✔ حساب (الفصل 9 القسم 5، والفصل 3 القسم 4)
- [ ] قبل أي عملية هدامة (تطبيق DRX أو لصق تلوين) أنشئ نسخة تلوين أو تايم لاين مكررا ✔ (الفصل 8 القسم 9.2)
- [ ] قوة اللوك `LOOK100` و`LOOK70` و`LOOK40` بـ `Key Output Gain` 1.00 و0.70 و0.40، ولا `Key Output Gain` على عقدة CST ◐ (الفصل 9 القسم 4.3)، ثم بطاقة QC لكل لقطة (الفصل 9 القسم 10)
- [ ] لا `Node Stack Layers` في أسابيعك الأولى، ولا تخفض `Node Stack Layer Count` أبدا لأن التخفيض يحذف تلوين الطبقات المزالة ✔ (الفصل 8 القسم 2.4)
- [ ] لا تغير فرع الغاما بعد بدء التلوين: التبديل يلزمه تمرير trim كامل ✔ (الفصل 3 القسم 5)

## 6. التسليم

- [ ] `Deliver > Render Settings > Render Presets` = `REELS_H264_1080x1920`، واسم جديد لكل ريندر `R<NN>_<slug>_v<NN>_1080x1920_25p` لأن الريندر يكتب فوق ملف بالاسم نفسه ✔ (الفصل 12 القسم 4.1)
- [ ] `MP4` / `H.264` (أو `QuickTime` / `H.264` إن أخفت لوحة MP4 خيارات `Key Frames` و`Frame Reordering` و`Multi-pass encode`)، و`Encoder` بخيار NVIDIA ⚠ (فحص CHK-086)، و1080 x 1920، و25، و`Quality` = `Restrict to` 18000 Kb/s سقفا أقصى ⚠ (فحصا CHK-090 وCHK-101)، و`Encoding Profile` = `High`، و`Use Constant Bit Rate` مطفأ ✔ الأسماء ◐ القيم (الفصل 12 القسم 4.2)
- [ ] `Advanced Settings`: `Data levels` = `Auto`، و`Data burn-in` = `None`، وخانات `Use optimized media` و`Use proxy media` و`Use render cached images` مطفأة، و`Color Space Tag` و`Gamma Tag` = `Same as Project` ثم تتحقق من النتيجة ⚠ (فحص CHK-089) (الفصل 12 القسم 4.3)
- [ ] الصوت: `Export audio` مفعل، و`Codec` = `AAC`، و`Sample Rate` 48000، و`Data Rate` 320 Kb/s أو أعلى قيمة معروضة، وإن غاب AAC من قائمة Windows فصدر Linear PCM وشفر AAC بـ ffmpeg بعدها ⚠ (فحص CHK-091) (الفصل 12 القسم 4.4)
- [ ] `Add to Render Queue` ثم زر الريندر الذي في نسختك (`Start Render` أو `Render All`) ⚠ (فحص CHK-086) (الفصل 12 القسم 3)

## 7. التحقق قبل أن يغادر الملف جهازك

```text
cd /d D:\Projects\<project>\04_Exports\Drafts
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,level,pix_fmt,width,height,r_frame_rate,avg_frame_rate,bit_rate,color_range,color_space,color_transfer,color_primaries,codec_tag_string,has_b_frames -of default=nw=1 Reel.mp4
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of default=nw=1 Reel.mp4
ffmpeg -hide_banner -nostats -i Reel.mp4 -vn -af ebur128=peak=true:framelog=quiet -f null - 2>&1 | findstr /C:"I:" /C:"LRA:" /C:"Peak:"
python D:\Projects\LAB\scripts\atoms.py Reel.mp4
```

الأوامر الأولى جربت على ملفات اصطناعية ✔، وصيغة `findstr` لم تجرب على Windows ⚠ (فحص CHK-088)، والقيم المتوقعة ◐ (الفصل 12 القسم 8):

| الحقل | المتوقع |
|---|---|
| `codec_name` و`profile` و`pix_fmt` | `h264` و`High` و`yuv420p` |
| `width` و`height` | 1080 و1920 |
| `r_frame_rate` و`avg_frame_rate` | متساويان ويساويان معدل التايم لاين (`25/1`) |
| `color_primaries` و`color_transfer` و`color_space` و`color_range` | `bt709` للثلاثة و`tv` ⚠ (فحص CHK-089) |
| الصوت | `aac` و48000 وقناتان ⚠ (فحص CHK-091) |
| `bit_rate` | عند السقف أو دونه |
| الصوت المقاس | integrated نحو -14 LUFS (مرجع عمل لا رقم Meta)، وPeak (الذروة الحقيقية) عند -1 dBTP أو أقل |
| FastStart وedit list | FastStart نعم، وبلا edit list |
| الحجم | 300 MB أو أقل |

- [ ] وسوم `unknown` أو غير `bt709`: توقف واضبط `Color Space Tag` و`Gamma Tag` صراحة على زوج Rec.709 وأعد الريندر (الفصل 12 القسم 5)
- [ ] شاهد الملف كاملا مرة واحدة في مشغل غير Resolve، ثم بطاقة QC (الفصل 12 القسم 8.2، والفصل 17 القسم 8.3)

## 8. الهاتف والنشر الخاص

- [ ] انقل الملف إلى الهاتفين بلا إعادة ضغط، وانشره خاصا (أو Close Friends)، وليست المسودات ولا تسجيل الشاشة اختبارا صالحا، واحكم بعد إعادة ترميز Instagram لا من الماستر ⚠ (فحص CHK-099، الفصل 12 القسم 10)
- [ ] iPhone وAndroid بعد ضبط العرض (True Tone وNight Shift وAuto-Brightness وفلاتر الراحة مطفأة، وسطوع ثابت)، في حالتي الغرفة المعتمة والمضاءة ◐ (الفصل 3 القسم 9، فحصا CHK-097 وCHK-098)
- [ ] `PHONE TRIM` توجد فقط إذا اتفق الهاتفان على اتجاه واحد، بتعديل صغير تكتب قيمته في `PROJECT_NOTES.txt`، ولا تصلح بها فرع الغاما ◐ (الفصل 3 القسم 9.4، فحص CHK-100)
- [ ] لا يعتمد اللوك إلا في حالة DIM وبعد اختبار الهاتفين ◐، وهل يحترم Instagram الوسم لا تفترضه ⚠ (فحص CHK-107)

## 9. الإقفال

- [ ] ماستر `MASTER_ProRes422HQ`، وملف `.drp` بـ `Export Project With Stills and LUTs` ✔، وبصمات الملفات (الفصل 12 القسم 12، والفصل 1 القسم 1.4)
- [ ] سجل قسم DELIVER في `PROJECT_NOTES.txt` (preset، وبناء Resolve، والمشفر، و`Restrict to`، والوسوم، والحجم، وLUFS وdBTP، والهاتفان، وفائز A/B، و`PHONE TRIM`، والمسار، والفرع) ◐ (الفصل 12 القسم 14)
- [ ] احذف نسخ التايم لاين الهدامة المنتهية بـ `_bak` قبل التسليم، ونظف ذاكرة الريندر المؤقتة بين المشاريع ◐ (الفصل 13 القسم 4.5، والفصل 2 القسم 8.6)

## 10. متى تتوقف ولا تسلم

- وسوم `unknown` أو غير `bt709`، أو `color_range` غير `tv`
- `r_frame_rate` يخالف `avg_frame_rate` (ملف بمعدل متغير)
- ذروة حقيقية أعلى من -1.0 dBTP، أو حجم فوق 300 MB
- `Data burn-in` ليس `None`، أو ظهر إطار إرشاد أو timecode في الصورة، أو بقي مقطع Offline
- كابشن عربي غير مشكل صحيحا في الملف الناتج
- الأعطال وشجرة "الملف يبدو مختلفا": الفصل 17 القسمان 7 و8

# الملحق ب: قاموس المصطلحات

> **طريقة الاستعمال:** يضم القاموس كل مصطلحات جدول المصطلحات في سجل القرارات (78 مصطلحا) بترتيبه، وأسماء الواجهة والقوائم وأسماء العقد تبقى بالإنجليزية كما يكتبها الدليل الرسمي 21.1 داخل code، وعمود الفصل هو الفصل الذي يشرح المصطلح لأول مرة شرحا يكفي لفهمه، وقد يرد اسمه قبله بإحالة أو بسطر في جدول
>
> العلامات: ✔ موثق، ◐ مصدر واحد أو توصية معقولة، ⚠ غير مؤكد وعليك فحصه (برقم الفحص)

| # | English | بالعربي | المعنى في سطر | الفصل |
|---|---|---|---|---|
| 1 | Grading | التلوين | بناء مظهر الصورة النهائي بعد أن تتماسك تقنيا: التباين واللون والكثافة واللوك | 9 |
| 2 | Color correction | تصحيح الألوان | إصلاح تقني للصورة (التعريض وتوازن الأبيض والمحايدات) قبل أي لوك إبداعي، ويسمى في إجراء الفصل 9 التصحيح التقني | 1 |
| 3 | Color space | مساحة الألوان | تحدد أي ألوان يمكن تمثيلها | 7 |
| 4 | Color management | إدارة الألوان | الترجمة بين لغة الكاميرا ولغة الشاشة والملف | 7 |
| 5 | Resolve Color Management (RCM) | إدارة ألوان Resolve (RCM) | نظام يترجم كل مقطع إلى فضاء عمل واحد ثم إلى الإخراج، وهو المسار أ | 7 |
| 6 | Route A, Route B, Route C | المسار أ (RCM)، المسار ب (عقد CST)، المسار ج (ACES) | الأسماء الثابتة لمسارات الألوان في هذا الدليل، والمسار أ هو الافتراضي | 7 |
| 7 | Working space | فضاء العمل | اللغة التي تتم بها كل درجات التلوين، وهي مساحة ألوان التايم لاين | 7 |
| 8 | `Input Color Space`, `Timeline color space`, `Output Color Space` | مساحة ألوان الإدخال، مساحة ألوان التايم لاين، مساحة ألوان الإخراج | ثلاث نقاط في المسار: كيف يفسر Resolve المقطع، وأين تتم الدرجات، وبأي لغة يخرج الملف | 7 |
| 9 | Gamma / EOTF | منحنى الغاما (Gamma / EOTF) | يحول الأرقام إلى سطوع، وقاعدته: غاما الشاشة = غاما الإخراج = ما يصفه وسم الملف | 3 |
| 10 | Tone mapping | رسم النغمات (ضغط الإضاءات العالية) | ضغط الإضاءات الزائدة داخل مدى الشاشة بدل قصها، ومرحلة واحدة فقط في المسار | 7 |
| 11 | Display Rendering Transform (DRT) | محول العرض (DRT) | الجزء الذي يرسم الإضاءات عند الإدخال (`Input DRT`) أو عند الإخراج (`Output DRT`) | 7 |
| 12 | Color Space Transform (CST) | تحويل مساحة اللون (CST) | أداة Resolve FX تحول من مساحة وغاما إلى مساحة وغاما أخريين داخل عقدة | 7 |
| 13 | Scene-referred / Display-referred | مرجعي للمشهد / مرجعي للعرض | في الأول تمثل الأرقام ضوء المشهد، وفي الثاني تمثل ما تعرضه الشاشة | 7 |
| 14 | Log curve | منحنى لوغاريتمي | منحنى تسجيل يضغط مدى واسعا من الضوء في أكواد قليلة، مثل Log3G10 وN-Log (جدول المنحنيين في الفصل 4) | 7 |
| 15 | RAW file | ملف خام (RAW) | ملف يحمل بيانات المستشعر، وتوازن الأبيض وISO فيه بيانات وصفية | 6 |
| 16 | Dynamic range | النطاق الديناميكي | مدى الضوء بين أغمق تفصيل وأسطعه، ولا قيمة لرقمه بلا مصدر وتعريف | 4 |
| 17 | Middle grey (18 percent) | الرمادي المتوسط 18% | بطاقة رمادية بانعكاس 18% هي النقطة المرجعية لقياس الأكواد | 4 |
| 18 | Exposure | التعريض | كمية الضوء المسجلة في الصورة، ويقاس بالأكواد على المقاييس لا بالنظر | 4 |
| 19 | Base ISO / Exposure Index (EI) | حساسية الأساس / مؤشر التعريض (EI) | حساسية التسجيل الفعلية (800 أو 6400 في R3D NE)، وEI بيانات وصفية | 4 |
| 20 | ND filter | فلتر ND (تخفيف الضوء) | فلتر يخفض الضوء بعدد من الـ stops ليبقى الغالق والفتحة على قيمهما | 4 |
| 21 | Zebra | الزيبرا (خطوط التعريض الزائد) | خطوط على شاشة الكاميرا حيث يبلغ السطوع قيمة تختارها أنت | 4 |
| 22 | Warning line (R3D NE) | خط التحذير | مؤشر قص الإضاءات في R3D NE داخل الكاميرا، ويتحرك مع حساسية الأساس وEI | 4 |
| 23 | White balance | توازن الأبيض | ضبط الصورة ليظهر المحايد محايدا، وهو بيانات وصفية في RAW ومخبوز في N-Log | 4 |
| 24 | Node / Node tree | عقدة / شجرة العقد | العقدة وحدة معالجة للصورة، والشجرة هي ترتيب العقد الذي تمر به الصورة | 8 |
| 25 | Serial node / Parallel node | عقدة تسلسلية / عقدة متوازية | التسلسلية تتبع سابقتها فتتراكم تعديلاتها، والمتوازية تأخذ المدخل نفسه ثم تدمج المخارج | 8 |
| 26 | `Group Pre-Clip` / `Group Post-Clip` | مجموعة قبل المقطع / مجموعة بعد المقطع | مستويان من العقد قبل عقد المقطع وبعدها، يؤثران في كل مقاطع المجموعة | 8 |
| 27 | Shared node | عقدة مشتركة | عقدة تتغير في كل المقاطع التي تستعملها، وهي طريقة بلا مجموعة لتثبيت تحويل واحد | 8 |
| 28 | `Node Stack Layers` | طبقات رصف العقد (Node Stack Layers) | عدة رسوم عقد متتابعة للمقطع الواحد، ولا تستعمل في أسابيعك الاثني عشر الأولى | 8 |
| 29 | Layer List | قائمة الطبقات | عرض لرسم عقد واحد من الأسفل إلى الأعلى، وليست نظام طبقات مستقلا | 8 |
| 30 | PowerGrade | تدريج محفوظ (PowerGrade) | ألبوم تدريجات تشترك فيه مشاريع المكتبة كلها وترتبط بحساب المستخدم | 8 |
| 31 | Gallery / Still / Memories | المعرض / لقطة ثابتة / الذاكرات | المعرض يحفظ اللقطات الثابتة مع تلوينها، والذاكرات A إلى H أماكن لاستدعاء التلوين بالاختصار | 8 |
| 32 | Grade version | نسخة التلوين | نسخة بديلة لتلوين المقطع، محلية افتراضيا وعلامة (R) للبعيدة | 8 |
| 33 | Pivot | نقطة الارتكاز | مركز النغمات عند تعديل التباين، ورفعها يعطي ظلالا أكثر كثافة | 8 |
| 34 | Contrast | التباين | المسافة بين أغمق القيم وأسطعها حول نقطة الارتكاز | 8 |
| 35 | Saturation | التشبع | قوة اللون | 8 |
| 36 | Density | الكثافة | تغميق الألوان الأشد تشبعا لمحاكاة عملية الفيلم الطرحية | 8 |
| 37 | Offset | الإزاحة | إزاحة منتظمة للقيم في الفضاء اللوغاريتمي، وهي أداة التعريض في الشجرة | 8 |
| 38 | Lift, Gamma, Gain | الظلال، الوسطيات، الإضاءات (Lift, Gamma, Gain) | ثلاث عجلات تتحكم في الظلال والوسطيات والإضاءات | 8 |
| 39 | Qualifier | محدد اللون (Qualifier) | يعزل منطقة بلونها أو لمعانها لتعدلها وحدها | 8 |
| 40 | Power Window | نافذة (Power Window) | شكل يعزل منطقة من الإطار لتعدلها وحدها | 8 |
| 41 | Magic Mask | القناع السحري (Magic Mask) | قناع يعزل الهدف بنقرات بالذكاء الاصطناعي، والنسخة v2 نسخة Studio فقط | 8 |
| 42 | Tracker | أداة التتبع | تتبع حركة عنصر في الإطار ليلحقه تعديل أو نافذة (Cloud Tracker وPoint Tracker وIntelliTrack) | 8 |
| 43 | Skin tone line | خط لون البشرة | محور الصبغة قبل الساعة 11 بقليل على مخطط المتجهات، وتتجمع حوله البشرة في مروحة لا في خط | 8 |
| 44 | `Show Skin Tone Indicator` | مؤشر لون البشرة | خيار في Vectorscope يرسم الخط، وهو دليل صبغة لا نقطة هدف | 8 |
| 45 | Scopes | المقاييس (Scopes) | خمسة مقاييس تقرأ الصورة بالأرقام وتبقى مرجعك حين لا تثق بالشاشة | 3 |
| 46 | Waveform | مخطط الموجة | يعرض سطوع الصورة عموديا، ومقياسه الافتراضي 10-bit من 0 إلى 1023 | 3 |
| 47 | RGB Parade | باريد RGB | يعرض قنوات R وG وB جنبا إلى جنب لكشف قص قناة أو ميل لوني | 3 |
| 48 | Vectorscope | مخطط المتجهات (Vectorscope) | يعرض الصبغة والتشبع على دائرة ألوان | 3 |
| 49 | Histogram | المدرج التكراري | يعرض توزيع الأكواد في الصورة | 3 |
| 50 | Legal range | النطاق القانوني | من 64 إلى 940 على 10-bit (ومن 16 إلى 235 على 8-bit) | 3 |
| 51 | Clipping | قص الإضاءات (فقدان التفاصيل) | وصول قناة إلى الحد الأعلى فتفقد تفاصيلها، وتفحصه على Parade | 4 |
| 52 | Crushed blacks | سحق الظلال | هبوط الظلال إلى أسفل المقياس فتفقد تفاصيلها، ومن علاجه خفض Pivot أو التباين | 9 |
| 53 | Banding | تشرط (خطوط في التدرج) | درجات مرئية في تدرج ناعم كسماء الفجر، والحبيبات تخففه ولا تزيله | 3 |
| 54 | Grain | الحبيبات | ملمس فيلم يضاف في عقدة `GRAIN` على مستوى Timeline | 11 |
| 55 | Halation / Bloom | التوهج (Halation / Bloom) | هالة تحيط بالإضاءات الساطعة، وتضاف قبل مرحلة الإخراج | 11 |
| 56 | `Film Look Creator` | صانع لوك الفيلم (Film Look Creator) | أداة Resolve FX لبناء مظهر الفيلم، نسخة Studio فقط | 8 |
| 57 | Look | اللوك | المظهر الإبداعي للصورة بعد التصحيح التقني، ويحمله `LOOK` و`HALATION` و`GRAIN` | 9 |
| 58 | LUT | جدول ألوان (LUT) | ملف جاهز يحول ألوانا بأخرى، وقد يحمل تحويلا تقنيا أو لوكا إبداعيا | 7 |
| 59 | Proxy media | وسائط وسيطة (Proxy) | نسخ خفيفة من الوسائط تسهل التشغيل أثناء القص | 2 |
| 60 | Optimized Media | وسائط محسنة (Optimized Media) | نسخ مولدة على جهازك للتشغيل، تشترك فيها مشاريع المكتبة ولا تنتقل مع المشروع | 2 |
| 61 | Render cache | ذاكرة الريندر المؤقتة (Render Cache) | ملفات مؤقتة تخزن نتيجة التأثيرات الثقيلة ليسلس التشغيل | 2 |
| 62 | Deliver / Render | التصدير / التسليم (Deliver) | الصفحة التي تحول التايم لاين إلى ملف عبر طابور مهام | 12 |
| 63 | Bitrate | معدل البت | كمية بيانات الفيديو في الثانية، وسقفه في الـ preset هو `Restrict to` | 12 |
| 64 | Codec | الترميز (Codec) | طريقة ضغط الصورة والصوت داخل الملف، مثل H.264 وAAC | 12 |
| 65 | Frame rate | معدل الإطارات | عدد الإطارات في الثانية: 25 للتايم لاين والتسليم، ويقفل عند أول استيراد | 4 |
| 66 | Reframe | إعادة التأطير | تحريك إطار 16:9 أو تكبيره ليناسب 9:16 | 13 |
| 67 | Safe zone | المنطقة الآمنة | حدود يبقى النص والوجوه داخلها كي لا تغطيها واجهة التطبيق، وأرقام Instagram منها مروية لا رسمية ◐ | 12 |
| 68 | Loudness (LUFS) | شدة الصوت (LUFS) | متوسط شدة الصوت الكلية للملف، وهدف عملك نحو -14 LUFS مرجع عمل لا رقم Meta ◐ | 12 |
| 69 | True peak (dBTP) | الذروة الحقيقية (dBTP) | أعلى قمة صوتية بعد إعادة الترميز، وهدف العمل -1.0 dBTP أو أقل ◐ | 12 |
| 70 | Ducker | خافض الموسيقى (Ducker) | تأثير يخفض الموسيقى تلقائيا حين يتكلم الصوت | 15 |
| 71 | Captions / Subtitles | الكابشن / الترجمة النصية | نص مكتوب على الصورة أو على تراك ترجمة، وتشكيل الحروف العربية فيه يختبر أولا | 14 |
| 72 | Right-to-left (RTL) | من اليمين إلى اليسار | اتجاه الكتابة العربية، وفي Text+ يضبط بالخيار `Reading Direction` | 14 |
| 73 | Phone trim (`PHONE TRIM`) | تعديل الهاتف الأخير | عقدة اختيارية على مستوى Timeline، توجد فقط إذا اتفق الهاتفان على اتجاه واحد | 3 |
| 74 | Colorimeter | جهاز قياس الألوان | جهاز يقيس أبيض الشاشة ونقطتها البيضاء وغاما كل وضع، وتشتريه في المرحلة الثانية من بروتوكول الشاشة | 3 |
| 75 | Calibration | المعايرة | ضبط الشاشة على معيار بالقياس، ولا تعوض نطاق ألوان أصغر من اللازم | 3 |
| 76 | Studio only | نسخة Studio فقط | وسم لأداة لا يشملها الإصدار المجاني، ولا يكتب إلا إذا قاله الدليل الرسمي أو جدول المزايا | 1 |
| 77 | Check on your machine | تحقق على جهازك | صندوق يحمل رقم فحص CHK لكل معلومة غير مؤكدة (علامة ⚠) | 1 |
| 78 | Dim state / lit state (`DIM` / `LIT`) | حالة الغرفة المعتمة / حالة الغرفة المضاءة | تصنيف غرفة التلوين باختبار انعكاس الشاشة السوداء، والقرارات الحرجة في المعتمة فقط | 3 |

> **قاعدة:** أول ظهور لأي مصطلح في الفصل يحمل الإنجليزي بين قوسين، وهذا القاموس مرجعك حين تقرأ فصلا بالترتيب غير المعتاد، وأي مصطلح جديد يضاف في آخر الجدول بالترقيم التالي

# الملحق ج: المصادر الأولية

> **طريقة الاستعمال:** كل مصدر بالمفتاح الذي تراه في "مصادر الفصل"، وهذا الملحق يجمع عنوان الوثيقة ونسختها أو تاريخها وطريقة الحصول عليها، والروابط هي المسجلة في جداول المصادر بملاحظات البحث، وفحصت عند كتابة الملحق في 2026-10-02 بطلب جزئي لكل رابط فاستجابت كلها (200 أو 206) ما عدا ثلاثة روابط رفضت الطلب الآلي (403) وهي صفحتا مستودع GitHub وصفحة DPReview، فجربها من متصفحك (وللسكربت روابط raw أدناه)، وما فيه `YYYY-MM-DD` أو `<الصفحة>` أو `<releaseId>` قالب تضع مكانه قيمة حقيقية
>
> العلامات: ✔ موثق (قرئ نص المصدر)، ◐ مصدر ثانوي أو ممارسة، ⚠ غير مؤكد وعليك فحصه (برقم الفحص)

> **قاعدة:** أرقام الصفحات في الدليل بصيغة (الدليل الرسمي ص N) هي أرقام صفحات PDF، والمرجع الافتراضي هو دليل 21.1 (bmd211) ما لم تذكر بطاقة الفصل غير ذلك، وأرقام الصفحات بين دليلي 21 و21.1 تختلف من 3 إلى 5 صفحات في أول الكتاب ونحو 55 صفحة أو أكثر في أقسام Color ✔، فإذا نقلت رقما من فصل إلى دليل غير الذي سماه الفصل فتحقق منه بالبحث (انظر الملحق هـ)

## 1. وثائق Blackmagic Design (الأساس)

| المفتاح | الوثيقة | النسخة أو التاريخ | كيف تحصل عليها |
|---|---|---|---|
| `bmd211` | DaVinci Resolve 21.1 Reference Manual (4352 صفحة PDF) | 2026-09-08 | https://documents.blackmagicdesign.com/UserManuals/DaVinci_Resolve_21.1_Reference_Manual.pdf ومن قائمة `Help` في Resolve (مدخل DaVinci Resolve Reference Manual ✔ ص 4350) |
| `bmd21` | DaVinci Resolve 21 Reference Manual (4445 صفحة PDF) | 2026-07-10 | https://documents.blackmagicdesign.com/UserManuals/DaVinci_Resolve_21_Reference_Manual.pdf |
| `bmd20` | DaVinci Resolve 20 Reference Manual (للمقارنة فقط) | 2025-07-08 | https://documents.blackmagicdesign.com/UserManuals/DaVinci_Resolve_20_Reference_Manual.pdf |
| `nf21` | DaVinci Resolve 21 New Features Guide | 2026-04-16 | https://documents.blackmagicdesign.com/SupportNotes/DaVinci_Resolve_21_New_Features_Guide.pdf |
| `nf19` | DaVinci Resolve 19 New Features Guide | 2024-04 | https://documents.blackmagicdesign.com/SupportNotes/DaVinci_Resolve_19_New_Features_Guide.pdf |
| `studio21feat` | DaVinci Resolve 21.1 Studio and iPad Features (جدول Free مقابل Studio) | 2026-09-28 (Sept 2026) | https://documents.blackmagicdesign.com/SupportNotes/DaVinci_Resolve_Studio_21_Features.pdf |
| `codecs21` | DaVinci Resolve 21 Supported Formats and Codecs (طبعة 21.1) | 2026-09-28 (Sept 2026) | https://documents.blackmagicdesign.com/SupportNotes/DaVinci_Resolve_21_Supported_Codec_List.pdf |
| `rm_16` إلى `rm_21_1_1` | ملف Readme ("About DaVinci Resolve") لكل إصدار من 16 إلى 21.1.1، ومنه المتطلبات وملاحظات الإصدار | 21.1.1 مكتوب فيه "Updated October 01, 2026" والدليل يكتب تاريخ قائمة التنزيل 2026-10-02 | https://www.blackmagicdesign.com/support/content/readme/<releaseId> ومعرف الإصدار من قائمة التنزيل |
| `bmd_downloads` و`sys_bmd_downloads` | قائمة التنزيلات (الإصدارات والبناءات والتواريخ)، ويقابلها `bmd_documents` لقائمة الوثائق | قرئتا 2026-10-02 | https://www.blackmagicdesign.com/api/support/us/downloads.json وhttps://www.blackmagicdesign.com/api/support/us/documents.json، وصفحة العائلة https://www.blackmagicdesign.com/support/family/davinci-resolve-and-fusion |
| `bmd_studio` و`bmd_studio_ae` | صفحة DaVinci Resolve Studio (أمريكا والإمارات، والسعر وجدول Free مقابل Studio) | 2026-10 | https://www.blackmagicdesign.com/products/davinciresolve/studio وhttps://www.blackmagicdesign.com/ae/products/davinciresolve/studio |
| `bmd_whatsnew` | DaVinci Resolve What's New | 2026 | https://www.blackmagicdesign.com/products/davinciresolve/whatsnew |
| `bmd_training` | صفحة تدريب DaVinci Resolve (كتب طبعة 20) | قرئت 2026-10-02 | https://www.blackmagicdesign.com/products/davinciresolve/training |
| `bmd_wgi` | DaVinci Resolve 17 Wide Gamut Intermediate، الإصدار 1.1 | 2021-08 (v1.1 بتاريخ 31/07/2021) | https://documents.blackmagicdesign.com/InformationNotes/DaVinci_Resolve_17_Wide_Gamut_Intermediate.pdf |
| إعلان 21.1 (`edit-S8`) | Blackmagic Design announces DaVinci Resolve 21.1 (بيان صحفي) | 2026-09-08 | https://www.blackmagicdesign.com/media/release/20260908-03 |

### 1.1 وثائق السكربت والواجهة البرمجية

نص Blackmagic منسوخ على GitHub في مستودع WheheoHu/bmd_doc، وقارن معد الملاحظات ثلاثة ملفاته (README وCHANGELOG وملف الأنواع) بنسخ محفوظة فكانت مطابقة بايتا ببايت، ولم تقارن بالملفات داخل تثبيت Resolve حي ◐ ⚠ (فحص CHK-121)

| المفتاح | الوثيقة | النسخة أو التاريخ | كيف تحصل عليها |
|---|---|---|---|
| `bmd_apireadme` | DaVinci Resolve Scripting API README.md | 21.1.0 ("Last Updated: 31 Aug 2026") | https://raw.githubusercontent.com/WheheoHu/bmd_doc/main/_README_API/21_1_0/README.md |
| `bmd_apichangelog` | Scripting API CHANGELOG.md | 21.1 ("Last Updated: 1 Sep 2026") | https://raw.githubusercontent.com/WheheoHu/bmd_doc/main/_README_API/21_1_0/CHANGELOG.md |
| `bmd_pyi211` | DaVinciResolveScript.pyi (أنواع الدوال مع شرح كل مفتاح) | 21.1.0، 2698 سطرا | https://raw.githubusercontent.com/WheheoHu/bmd_doc/main/_README_API/21_1_0/DaVinciResolveScript.pyi |
| `api211` و`bmd_rendersettings` | صفحات كل كائن (Resolve وProjectManager وProject وMediaPool وTimeline وTimelineItem وGraph وGallery وغيرها) وصفحة Render Settings | 21.1.0 | https://github.com/WheheoHu/bmd_doc/tree/main/ResolveAPI_versioned_docs/version-21.1.0 |
| `wfi201` | Workflow Integration Plugins (WorkflowIntegration.md) | طبعة 20.1، 2025-07-28 | https://github.com/WheheoHu/bmd_doc/tree/main/workflow_versioned_docs/version-20.1.0 |

لم يقرأ معد الملاحظات README ولا CHANGELOG ولا ملف الأنواع الخاصة بـ 21.1.1 لأن المستودع لم يكن فيه مجلد `21_1_1` يوم 2026-10-02، فأسماء الدوال في سكربتات الفصل 16 موثقة على 21.1.0 فقط ✔

## 2. وثائق Nikon

| المفتاح | الوثيقة | النسخة أو التاريخ | كيف تحصل عليها |
|---|---|---|---|
| `nikon_log` | Log-Format/RAW Technical Guide, Video Recording and Editing Edition (95 صفحة، وخطوات Resolve فيه "current as of October 2025") | © 2025 | مركز التنزيل https://downloadcenter.nikonimglib.com/ ونسخة HTML https://onlinemanual.nikonimglib.com/technicalguide/log_raw/video_recording_editing/en/ |
| `nikon_tg_r3dne` | Editing ZR Log3G10 Videos on DaVinci Resolve (دليل Nikon التقني على الإنترنت) | 2025-10 | https://onlinemanual.nikonimglib.com/technicalguide/zr/r3dne_log3g10/en/ |
| `nlog_spec` و`zr_nlog_spec` | N-Log Specification Document, Version 1.0.0 | 2018-09-01 | https://download.nikonimglib.com/archive3/hDCmK00m9JDI03RPruD74xpoU905/N-Log_Specification_(En)01.pdf |
| `nik_redlut` | Downloading RED LUTs Compatible with ZR | 2025 | https://onlinemanual.nikonimglib.com/download_red/en/ |
| `nik_nlog_lut_dl` و`nik_nlog_lut_page` | N-Log LUT، الإصدار 2.00 | 2024-09-12 | https://downloadcenter.nikonimglib.com/en/download/sw/258.html وhttps://downloadcenter.nikonimglib.com/en/products/520/N-Log_3D_LUT.html |
| `nikon_r3dne_usa` | ZR Filmmaking and Post-production with R3D NE Files (مقال Nikon USA عن R3D NE) | 2025-2026 | https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/zr-filmmaking-and-post-production-with-r3d-ne-files |
| `nusa_zr` | صفحة Nikon ZR (النظرة العامة والمواصفات، وشعار الفيرموير 1.10) | قرئت 2026-10-02 | https://www.nikonusa.com/p/zr/2006/overview |
| `nusa_luts` | A Step-by-Step Guide to Using LUTs on the Nikon ZR | بلا تاريخ | https://www.nikonusa.com/learn-and-explore/c/products-and-innovation/a-step-by-step-guide-to-using-luts-on-the-nikon-zr-cinema-camera |
| `nusa_samples` | ملفات عينات ZR وKOMODO وV-RAPTOR | بلا تاريخ | https://www.nikonusa.com/content/Zcinema-raw-file-downloads |
| `sys_nikon_fw200` | Nikon is developing firmware version 2.00 for the Nikon ZR | 2026-09-08 | https://www.nikon.com/company/news/2026/0908_01/ |
| `z9tips_resolve` ◐ | Nikon Professional Services: Z 9 TIPS، DaVinci Resolve، إجراء تحرير N-RAW (كاميرا Z 9 لا ZR) | 2022-06 | https://nps.nikonimaging.com/technical_info/technical_solutions/z9_tips/davinci_resolve/ |

### 2.1 دليل Nikon ZR الإلكتروني

الصيغة: https://onlinemanual.nikonimglib.com/zr/en/<الصفحة>.html، ومفتاح الفصل يحمل الصفحة بعد البادئة (`sys_zr_19-02` مثلا هو الصفحة 19-02)، وقرئت كلها 2026-10-02، وعناوين الصفحات كما حفظها معد الملاحظات:

| الصفحة | العنوان |
|---|---|
| 19-01 و19-02 و19-03 | Video file types، وVideo frame size and rate options، وVideo recording: Shooting mode |
| 19-04 و19-05 و19-06 | Points to note when filming videos، وRecording HLG video، وRecording N-Log video |
| 19-11 و19-12 | Video image area options، وRAW video |
| 15-08 و15-09 و15-16 | Specifications، وApproved memory cards، وMemory card capacity (videos) |
| 09-03-36 و09-04-08 و09-04-28 و09-04-33 و09-04-46 | Tone mode، وISO sensitivity settings، وTimecode، وVideo flicker reduction، وImage area |
| 09-05-88 و09-05-89 و09-05-90 و09-05-91 و09-05-92 و09-05-94 | الإعدادات g11 Fine ISO control وg12 Extended shutter speeds وg14 View assist وg16 Zebra pattern وg17 Limit zebra pattern tone range وg19 Brightness information display |
| 09-05-104 و09-05-105 | g13 Shutter mode، وg15 3D LUT |
| 09-04-51 و03-03 و09-06-01 | Video file naming، وInserting the battery and memory cards، وFormat memory card |
| 09-06-35 و09-06-53 | Firmware version، وAuto temperature cutout |
| 14-02 و14-03 | Problems and solutions، وAlerts and error messages |
| 09-04-23 و09-04-24 و09-04-25 و09-04-26 | Audio input sensitivity، وAttenuator، وFrequency response، وWind noise reduction |
| 09-04-39 و09-04-40 و09-04-48 و09-04-49 و09-04-50 | Mic jack plug-in power، وHeadphone volume، و32-bit float audio recording، وBuilt-in microphone options، وAudio input selection |

## 3. RED وLenovo وMicrosoft وNVIDIA وMeta وEBU وApple

| المفتاح | الوثيقة | النسخة أو التاريخ | كيف تحصل عليها |
|---|---|---|---|
| `r3d_redwp` و`zr_red_wp` | White Paper on REDWideGamutRGB and Log3G10 (Form 915-0187 Rev C) | 2017-11 | https://docs.reddigitalcinema.com/955-0187/PDF/915-0187%20Rev-C%20%20%20RED%20OPS%2C%20White%20Paper%20on%20REDWideGamutRGB%20and%20Log3G10.pdf |
| `r3d_ipp2stages` | IPP2: Image Pipeline Stages (915-0190) | Rev D، 2018-11 | https://docs.reddigitalcinema.com/915-0190/915-0190%20Rev-D%20%20%20RED%20OPS%2C%20IPP2%20Image%20Pipeline%20Stages.pdf |
| `r3d_ipp2ot` | IPP2 Output Transforms (915-0201) | Rev A، 2017-11 | https://docs.reddigitalcinema.com/915-0201/REV-A/PDF/915-0201%20Rev-A%20%20%20RED%20OPS,%20IPP2%20Output%20Transforms.pdf |
| `r3d_ipp2luts` | 3D Cube LUTs and IPP2 (915-0202) | Rev A، 2017-11 | https://docs.reddigitalcinema.com/915-0202/REV-A/PDF/915-0202%20Rev-A%20%20%20RED%20OPS%2C%203D%20Cube%20LUTs%20and%20IPP2.pdf |
| `r3d_redpresets` | صفحة تنزيل IPP2 Output Presets (الإصدار 1.13.0) | 2017-09-08 | https://www.reddigitalcinema.com/download/ipp2-output-presets |
| `lenovo` | Lenovo PSREF لشاشة ThinkVision P32p-20 (نوع الجهاز 62A2) | 2024-11-29 | https://psref.lenovo.com/syspool/Sys/PDF/datasheet/ThinkVision%20P32p-20_datasheet_EN.pdf |
| `lenovo_ug` | ThinkVision P32p-20 User Guide (نوع الجهاز 62A2)، نسخة مستضافة عند طرف ثالث | بلا تاريخ | https://content.etilize.com/User-Manual/1063692945.pdf وللأصل صفحة https://psref.lenovo.com/ |
| `ms_advcolor` | Microsoft Learn: ICC profile behavior with Advanced Color | قرئت 2026-10-02 | https://learn.microsoft.com/en-us/windows/win32/wcs/advanced-color-icc-profiles |
| `ms_hdr` | Microsoft Learn: Use DirectX with Advanced Color on high/standard dynamic range displays | قرئت 2026-10-02 | https://learn.microsoft.com/en-us/windows/win32/direct3darticles/high-dynamic-range |
| `tr_msl_filehash` و`tr_msl_certutil` و`tr_msl_robocopy` | Microsoft Learn: صفحات Get-FileHash وcertutil وrobocopy (للبصمات والنسخ) | قرئت 2026-10-02 | الروابط لم تسجل في ملاحظات البحث، فابحث باسم الأمر في https://learn.microsoft.com |
| `nv_matrix` | NVIDIA Video Encode and Decode GPU Support Matrix | 2026 | https://developer.nvidia.com/video-encode-decode-support-matrix |
| `nvenc_api` و`ffmpeg_nvench` | ملفا الترويسة nvEncodeAPI.h (SDK 13.1) وlibavcodec/nvenc.h | 2026 | https://raw.githubusercontent.com/FFmpeg/nv-codec-headers/master/include/ffnvcodec/nvEncodeAPI.h وhttps://raw.githubusercontent.com/FFmpeg/FFmpeg/master/libavcodec/nvenc.h |
| `meta_igmedia` | Meta for Developers: IG User Media (مواصفات Reels والغلاف عبر API) | محدثة 2026-09-28 | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media |
| `meta_contentpub` | Meta for Developers: Content Publishing | محدثة 2026-06-30 | https://developers.facebook.com/docs/instagram-platform/content-publishing |
| `meta_xheaac` | Engineering at Meta: Why xHE-AAC is being embraced at Meta | 2023-04-11 | https://engineering.fb.com/2023/04/11/video-engineering/high-quality-audio-xhe-aac-codec-meta/ |
| `ebu_r128` | EBU R 128 (2023) | 2011-2023 | https://tech.ebu.ch/docs/r/r128.pdf |
| `ebu_tech3341` و`ebu_tech3342` | EBU Tech 3341 وTech 3342 | بلا تاريخ | https://tech.ebu.ch/docs/tech/tech3341.pdf وhttps://tech.ebu.ch/docs/tech/tech3342.pdf |
| `ebu_r128s2` | EBU R 128 s2: Loudness in Streaming | بلا تاريخ | https://tech.ebu.ch/docs/r/r128s2.pdf |
| `skin_r103` | EBU R 103: Video Signal Tolerance in Digital Television Systems | قرئت 2026-10-02 | https://tech.ebu.ch/docs/r/r103.pdf |
| `prores_wp` | Apple ProRes White Paper | 2022-04 | https://www.apple.com/final-cut-pro/docs/Apple_ProRes_White_Paper.pdf |

قاعدة قراءة وثائق Meta: وثيقة المطورين لنشر Reels عبر API تذكر حدودا تصلح سقفا محافظا ولا تكتب "تشترط Instagram"، ولا رقم LUFS في الوثيقتين اللتين قرئتا (xHE-AAC ومواصفات Reels) ✔ (الفصل 12 القسم 7، والفصل 15 القسم 7)

## 4. مصادر ثانوية وممارسون ◐

لا تحمل هذه المصادر علامة ✔ مهما كان تقدير الكاتب لها، وتنسب بالاسم حين تذكر (الفصل 1 وسجل القرارات):

| المفتاح | المصدر | التاريخ | كيف تحصل عليه |
|---|---|---|---|
| `cined_211` | CineD: DaVinci Resolve 21.1 Released (MCP، HDR trims، Python إلى Studio) | 2026-09 | https://www.cined.com/davinci-resolve-21-1-released-ai-assistant-integration-via-mcp-individual-hdr-trims-and-python-scripting-moves-to-studio/ |
| `r3d_cinedzr` | CineD: Nikon ZR Lab Test، Rolling Shutter وDynamic Range وExposure Latitude (مختبر واحد) | 2025-10-23 | https://www.cined.com/nikon-zr-lab-test-rolling-shutter-dynamic-range-and-exposure-latitude/ |
| `cined_zr` | CineD: Nikon ZR Released (R3D و32-bit float) | 2025-09-10 | https://www.cined.com/nikon-zr-released-first-nikon-red-camera-with-internal-r3d-6k60-4k120-32-bit-float-audio-and-more/ |
| `yahoo_three_raw` | DPReview (نسخة Yahoo): The Nikon ZR has three Raw options | 2026-04-09 | https://www.dpreview.com/articles/9420428700/nikon-zr-r3d-ne-versus-n-raw-format-comparison/ |
| `sys_slashcam_nev` و`slash_red` | Slashcam: REDCODE RAW in the Nikon ZR، RED Explains the Renaming of NEV Files to R3D | 2025-10-27 | https://www.slashcam.com/news/single/REDCODE-RAW-in-the-Nikon-ZR--RED-Explains-the-Rena-19614.html |
| `sys_nikonrumors_nev` و`nr_111` | Nikon Rumors: The Nikon NRAW hack (2025-09-21)، وخبر فيرموير 1.11 (2026-03-17) | 2025-2026 | https://nikonrumors.com/2025/09/21/the-nikon-nraw-hack-change-nev-file-extension-to-r3d-and-get-complete-red-raw-control.aspx/ وأرشيف الوسم https://nikonrumors.com/tag/nikon-zr (فيه خبر 1.11) |
| `ym_110` | Y.M.Cinema: Nikon ZR Firmware 1.10 | 2026-01-27 | https://ymcinema.com/2026/01/27/nikon-zr-firmware-1-10-cinema-workflow-update/ |
| `wiki_zr` | Wikipedia: Nikon ZR (جدول تحديثات الفيرموير) | 2026 | https://en.wikipedia.org/wiki/Nikon_ZR |
| `ns_211` و`ns_2111` و`ns_202` و`ns_fw200` | Newsshooter: Resolve 21.1 (2026-09-07) و21.1.1 (2026-10-01) و20.2 (2025-09-09)، وفيرموير ZR 2.00 | 2025-2026 | https://www.newsshooter.com/2026/09/07/blackmagic-design-davinci-resolve-21-1/ وغيره على https://www.newsshooter.com/ |
| `cgc_21` | CG Channel: Blackmagic Design releases DaVinci Resolve 21.0 | 2026-06-04 | موقع cgchannel.com (الرابط الكامل لم يسجل) |
| `puget_211` | Puget Systems: How DaVinci Resolve Free v21.1 Scripting Changes Affect Puget Bench | 2026-09-10 | https://www.pugetsystems.com/blog/2026/09/10/how-davinci-resolve-free-v21-1-scripting-changes-affect-puget-bench/ |
| `sys_puget_hwdecode` | Puget Systems: What H.264 and H.265 Hardware Decoding is Supported in DaVinci Resolve Studio | 2024-11-06 (محدثة 2025-06-17) | https://www.pugetsystems.com/labs/articles/what-h-264-and-h-265-hardware-decoding-is-supported-in-davinci-resolve-studio-2122/ |
| `sys_puget_hwtest` | Puget Systems: Is your footage hardware accelerated in DaVinci Resolve | 2025-02-10 | https://www.pugetsystems.com/blog/2025/02/10/is-your-footage-hardware-accelerated-in-davinci-resolve/ |
| `sys_puget_prores_enc` | Puget Systems: ProRes Encoding in DaVinci Resolve 19.1.4 | 2025-03-25 | https://www.pugetsystems.com/blog/2025/03/25/prores-encoding-in-davinci-resolve-19-1-4/ |
| `mon_puget10` | Puget Systems: Setting Graphics Card Software to Display 10-bit Output | 2019 | https://www.pugetsystems.com/labs/articles/setting-graphics-card-software-to-display-10-bit-output-1221/ |
| `mon_petapixel431` | PetaPixel: NVIDIA Unveils New Studio Driver with Support for 10-bit Color | 2019-07-29 | https://petapixel.com/2019/07/29/nvidia-unveils-new-studio-driver-with-support-for-10-bit-color-for-creatives/ |
| `rs_petty` | RedShark News: Resolve Studio free updates (Grant Petty، NAB 2026) | 2026-04 | https://www.redsharknews.com/davinci-resolve-studio-free-updates-grant-petty-nab-2026 |
| `frameio_cm` | Cullen Kelly على Frame.io Insider: How to Color Manage using Nodes in DaVinci Resolve | 2024-01-08 | https://blog.frame.io/2024/01/08/color-management-nodes-davinci-resolve/ |
| `frameio_flc` | Cullen Kelly: What is Resolve's new Film Look Creator plugin? | 2024-08-15 | https://blog.frame.io/2024/08/15/what-is-resolves-new-film-look-creator-plugin/ |
| `frameio_rcm_vs_cst` | Cullen Kelly: Should You Use Resolve Color Management or Color Space Transforms (CSTs)? | 2024-10-07 | https://blog.frame.io/2024/10/07/should-you-use-resolve-color-management-or-color-space-transforms-csts/ |
| `frameio_separation` | Cullen Kelly: How a Pro Colorist Maximizes Color Separation | 2024-10-21 | https://blog.frame.io/2024/10/21/how-a-pro-colorist-maximizes-color-separation/ |
| `frameio_cheatsheet` | Cullen Kelly: Color Management Cheat Sheet for DaVinci Resolve (قرئ جزئيا ولا يقتبس منه) | 2023-12-04 | https://blog.frame.io/2023/12/04/color-management-cheat-sheet-davinci-resolve/ |
| `ck_*` | موقع Cullen Kelly Color، صفحات الأدوات: Template Node Tree PowerGrade وMid-Gray Cheatsheet وSweet Spot وغيرها | قرئت 2026-10-02 | https://cullenkellycolor.com/toolkit/sweet-spot وhttps://cullenkellycolor.com/toolkit/template-node-tree-powergrade وhttps://cullenkellycolor.com/toolkit/mid-gray-cheatsheet |
| `lowepost_7376` و`lowepost_1144` | منتدى Lowepost: Fixed node tree (2021)، وResolve Gamma 2.4 vs Rec709 (Scene) (ضعيف) | 2021 | https://lowepost.com/forums/topic/7376-fixed-node-tree/ وhttps://lowepost.com/forums/topic/1144-resolve-gamma-24-vs-rec709-scene/ |
| `mononodes_mg` | MonoNodes: Middle Gray DCTL | 2025-2026 | https://mononodes.com/middle-gray-dctl/ |
| `cinedream_cm` | CineDream: Color Management DaVinci Resolve (لاسم صندوق Windows فقط) | قرئت 2026-10-02 | https://docs.cinedream.io/color-management/color-management-davinci-resolve |
| `zeely_safe` | Zeely: Instagram Safe Zones 2026 (ينقل عبارة دليل إعلانات Meta) | 2026 | https://zeely.ai/blog/master-instagram-safe-zones/ |
| `planoly_jan25` | Planoly: All the Latest Instagram Updates (شبكة 3:4) | 2025-01 | https://www.planoly.com/blog/instagram-updates-jan-2025 |
| `kapwing_grid` | Kapwing: Instagram's New Grid Layout, Size and Dimensions | 2025-12-30 | https://www.kapwing.com/resources/instagrams-new-grid-layout-size-and-dimensions-2025/ |
| `metricool_len` | Metricool: How Long Can Reels Be on Instagram | 2026 | https://metricool.com/instagram-reels-length/ |
| `guidingtech_hq` | Guiding Tech: How to Turn on High Quality Uploads in Instagram | 2024-07-24 | https://www.guidingtech.com/how-to-turn-on-high-quality-uploads-in-instagram/ |
| `adaptly_api` | AdaptlyPost: Every Limit the Instagram Reels API Puts on Your Video | 2026-09 | https://adaptlypost.com/blog/instagram-reels-api-max-length-file-size |
| `wiki_mains` | Wikipedia: Mains electricity by country (230 V و50 Hz للإمارات) | قرئت 2026-10-02 | https://en.wikipedia.org/wiki/Mains_electricity_by_country |
| `skin_wp_*` | Wikipedia: YIQ وColorChecker وColor temperature وTwilight وBlue hour وGolden hour وSharjah وKhor Fakkan | قرئت 2026-10-02 | https://en.wikipedia.org/wiki/YIQ وغيرها بأسماء الصفحات نفسها |
| `skin_sun_io` و`skin_sun_org` | حاسبتا الشروق لإحداثيات الشارقة (sunrisesunset.io وsunrise-sunset.org) | قرئتا 2026-10-02 | https://api.sunrisesunset.io/json?lat=25.3573&lng=55.4033&date=YYYY-MM-DD&timezone=Asia/Dubai وhttps://api.sunrise-sunset.org/json?lat=25.3573&lng=55.4033&date=YYYY-MM-DD&formatted=0 |
| `tr_offshoot` و`tr_yoyotta` و`tr_shotput` و`tr_silverstack` | صفحات منتجات OffShoot (hedge.video) وYoYotta وShotPut Pro (imagineproducts.com) وSilverstack (pomfort.com) | قرئت 2026-10-02 | مواقع الشركات المذكورة (الروابط الكاملة لم تسجل) |
| `tr_teracopy` و`tr_fastcopy` و`tr_mediainfo` و`tr_xxhash` | صفحات TeraCopy وFastCopy وMediaInfo وxxHash | قرئت 2026-10-02 | مواقع المشاريع نفسها (الروابط الكاملة لم تسجل) |
| `sys_grindrod` | Daniel Grindrod: Databases explained (عن قواعد بيانات Resolve) | نحو 2023 | https://www.danielgrindrod.com/blog/databases |

## 5. ما لا يعد مصدرا

- `USER_FACTS` و`user-answers`: أجوبتك بتاريخ 2026-10-02، وهي مصدر الحقائق عنك فقط، وقاعدة مهارتك `resolve-reels-post` (مفتاحها `user-skill` أو `edit-S1`) مصدر لممارستك أنت، ولا تثبت سلوك Resolve ولا واجهته
- الوثائق الثلاث الأولى المكتوبة بالذكاء الاصطناعي (`3225a695` و`81c595dc` و`a6c5c466`) ليست مصادر أبدا، والفصل 20 يصحح ادعاءاتها سطرا سطرا
- مدونة `mintand`: مرجع ثانوي نقل عن إحدى الوثائق القديمة ولا رابط له في ملاحظات المراجعة
- صفحات لم يصل إليها معد الملاحظات فلا يستند إليها شيء في الدليل: منتدى Blackmagic، وMixing Light، وhelp.instagram.com، ودليل إعلانات Meta (أعاد 404)، وsupport.red.com (رفض 403)، وdpreview.com مباشرة (قرئ عبر Yahoo)، وصفحات nikon-asia وnikon-mea، وصفحة تنزيل الفيرموير عند Nikon (404 أو 403)
- معرفات الملاحظات التي تظهر في "مصادر الفصل" بالفصلين 13 و16 هي من جداول الملاحظات: `edit-S9` هو `api211`، و`edit-S37` هو `bmd211`، و`edit-S38` هو `nf21`، و`edit-S39` هو `studio21feat`، و`edit-S40` هو `bmd21`، و`edit-S42` هو ملفات `rm_*`، و`edit-S44` هو صفحة 15-08، و`edit-S46` هو `zeely_safe`، و`auto2-S1` هو `bmd211`، و`auto2-S6` هو `studio21feat`، و`auto2-S8` هو `bmd_apireadme`، و`auto2-S10` هو `bmd_pyi211`، و`auto2-S11` هو `api211`، و`auto2-S12` هو `wfi201`، و`auto2-S13` هو `rm_*`، و`auto2-S16` هو `nikon_log`، و`auto2-S19` هو `puget_211` وcined_211 وns_211

# الملحق د: القرارات المفتوحة والتناقضات

> **طريقة الاستعمال:** حين تتعارض مصادر الدليل يثبت سجل القرارات مصدرا واحدا ويكتب صياغة آمنة لا تدعي أكثر مما تعرف، ويسمي فحصا يحسم الأمر على جهازك، وهذا الملحق يجمع الصفوف المفتوحة (20 صفا) والمحسومة (12 صفا) بأرقامها C1 إلى C32 في السجل، وبعد أن تنفذ الفحص اكتب النتيجة في `PROJECT_NOTES.txt` وبدل علامة السطر في الفصل بـ ✔ مع "تم الفحص بتاريخ (التاريخ) على Resolve 21.x.y"
>
> العلامات: ✔ موثق، ◐ مصدر واحد أو توصية معقولة، ⚠ غير مؤكد وعليك فحصه (برقم الفحص)

> **قاعدة:** الصف المفتوح ليس عائقا: له صياغة آمنة تعمل بها من اليوم، ولا ترفع علامته إلى ✔ إلا بعد فحصه، وإذا خالفت نتيجتك الصياغة الآمنة فاكتب ما رأيته وأرسله إلى Claude (الفصل 18 القسم 5)

## 1. الصفوف المفتوحة

| الرقم | الموضوع | وجه التعارض | الصياغة الآمنة المستعملة الآن | ما يحسمه | أين تراها |
|---|---|---|---|---|---|
| C1 | غاما الإخراج الافتراضية | الملاحظات الأولى تسمي 2.4 افتراضيا، والسجل يجعل G22 مؤقتا لأن شرطي G24 (غرفة معتمة قابلة للتكرار ووضع شاشة قريب من 2.4) لا يتحققان بإجاباتك، ولا خيار غاما في قائمة الشاشة | G22 (`Rec.709 Gamma 2.2`) افتراضي مؤقت، وG24 بديل موثق كاملا يصير الافتراضي بعد أن يجد الفحص وضعا قريبا من 2.4 وحالة غرفة معتمة قابلة للتكرار | ⚠ فحص CHK-016 (ومعه CHK-011 وCHK-012 وCHK-013 وCHK-015) | الفصل 3 القسم 5، والفصل 7 القسم 10.1 |
| C7 | AAC في لوحة Deliver على Windows | فصل Deliver في الدليل يقول إن ترميز AAC على macOS فقط، وقائمة `Codec` وجدول الصيغ وpreset H.264 Master يذكرون AAC | AAC هو الخطة، وتقرأ قائمة `Codec` الصوتي على جهازك قبل أن تكتبه، وإن غاب فصدر Linear PCM وشفر AAC بـ ffmpeg بعدها | ⚠ فحص CHK-091 | الفصل 12 القسمان 4.4 و9 |
| C8 | عارض 10-bit على Windows | نص الدليل لخيار `Use 10-bit precision in viewers if available` يقول macOS، وجدول المزايا يسجل عارض 10-bit على Windows ضمن Studio | اقرأ الخيار ولا تفعله إلا إذا أظهر اختبار التدرج فائدة فعلية | ⚠ فحصا CHK-051 وCHK-022 | الفصل 3 القسم 3.4، والفصل 2 القسم 5 |
| C9 | ركن أيقونة Layer List | دليل 21.0 يقول أعلى اليسار من رسم العقد ودليل 21.1 يقول أعلى اليمين | "أيقونة في ركن من رأس رسم العقد" وقائمة الطبقات عرض فقط | ⚠ فحص CHK-032 | الفصل 8 القسم 2.4، والفصل 9 القسم 3 |
| C11 | `Start Render` أم `Render All` | الدليل يستعمل الاسمين في مواضع مختلفة | `Add to Render Queue` ثم زر الريندر الذي في نسختك (`Start Render` تحت العارض أو `Render All` تحت Render Queue) | ⚠ فحص CHK-086 | الفصل 12 القسمان 3 و14 |
| C12 | `Timeline working luminance`: 100 أم 10000 | الدليل يقول إن إعداد DaVinci Wide Gamut يحفظ إضاءات حتى 10000 nits، وCullen Kelly يجمع 10000 مع `Input DRT` = `None`، وملاحظات أخرى تذكر `SDR 100` | `Custom` 10000 مع `Input DRT` = `None` و`Output DRT` = `DaVinci`، والاحتياطي داخل المسار أ `SDR 100` مع `Input DRT` = `DaVinci` و`Output DRT` = `None` | ⚠ فحصا CHK-057 وCHK-029 | الفصل 7 القسم 4 |
| C13 | Digital flicker reduction مع RAW | دليل Nikon الإلكتروني يقول معطل للـ RAW، وجداول دليل Nikon التقني تضعه متاحا | عامله كمعطل، واستعمل `Video recording menu > Video flicker reduction > Frequency` = `50 Hz` وقائمة الغالق عند 50 Hz | ⚠ فحص CHK-117 | الفصل 4 القسم 8، والفصل 17 القسم 5.3 |
| C16 | فيرموير ZR 2.00 | Nikon أعلنته في 2026-09-08 "scheduled for release in 2026" مع Log3G10 في H.265، ولا مصدر يؤكد صدوره | لا تكتب "2.00 متاح"، واقرأ نمط النغمات في كل مقطع H.265 قبل اختيار التحويل | ⚠ فحصا CHK-006 وCHK-119 | الفصل 4 القسمان 1 و2، والفصل 6 القسم 1 |
| C17 | `Network Optimization` | ملاحظات تقول ON وأخرى تقول إن الصندوق قد لا يوجد، ونص دليل 21.1 المقروء لا يذكره | ON إن وجد، واختبر FastStart بـ `atoms.py` | ⚠ فحصا CHK-086 وCHK-088 | الفصل 12 القسمان 4.2 و8 |
| C18 | القيم الافتراضية لـ Project Backups | الدليل يذكر 8 ساعية و5 يومية لـ Project Backups، و2 و2 لـ Timeline Backups، ويقول إن الحقول الثلاثة تنطبق على النوعين | لا تكتب "الافتراضي كذا"، واضبط قيما صريحة وسجلها | ⚠ فحص CHK-024 | الفصل 2 القسم 9.2 |
| C19 | نافذة `Short` في قياس الشدة | الدليل يقول 30 ثانية في موضع و3 ثوان في موضع آخر | علم القراءات Momentary (400 ms) وShort-term الأقصى وIntegrated، واقرأ المؤشر مرة | ⚠ فحص CHK-081 | الفصل 15 القسم 7 |
| C22 | `Rec.709 (Scene)` مقابل غاما 2.4 | نموذج يقول إن Scene قريب من BT.709 OETF (رمادي 18% عند 40.9% مقابل 48.9% في 2.4 و45.9% في 2.2)، وتطابقه مع 2.4 غير مثبت | الأرقام محسومة ✔ حساب: 0.4587 للغاما 2.2 و0.4894 للغاما 2.4 و0.409 لـ BT.709 OETF، أما مطابقة Scene للغاما 2.4 فاختبار | ⚠ فحصا CHK-056 وCHK-060 | الفصل 3 القسم 4، والفصل 7 القسم 10.1 |
| C23 | صندوق إدارة ألوان Windows | ملاحظات تقول لا خيار وأخرى تقول الدليل يوثقه، والدليل يوثق صندوق Mac وعارض HDR على Windows وLUT العارض، واسم صندوق Windows من وثيقة طرف ثالث | لا تكتب "لا يوجد خيار" ولا "الدليل يوثقه"، واقرأ صفحة Preferences واترك أي صندوق من هذا النوع مطفأ | ⚠ فحصا CHK-022 وCHK-051 | الفصل 2 القسمان 4 و5، والفصل 3 القسم 3.4 |
| C24 | ترميز ProRes على Windows | ملاحظات تختلف في الإصدار (19.1.4) وفي Free مقابل Studio | متاح في النسختين لأن جدول الترميزات بلا وسم Studio ◐، ولا يطبع إصدار ظهوره كحقيقة | ⚠ فحص CHK-091 | الفصل 1 القسم 2، والفصل 12 القسم 12 |
| C25 | ادعاءات فك العتاد | ملاحظات تقول إن Studio يضيف التسريع وإن فك 4:2:2 على NVIDIA منذ 20.0، وجداول Puget تقول إن RTX 40 يفك H.265 4:2:0 لا 4:2:2 ولا H.264 بعمق 10-bit | H.265 في ZR هو 4:2:0 فأي بطاقة RTX 40 مرشحة، وProRes 422 HQ يفك بالمعالج، ولا شيء عن RTX 50 | ⚠ فحصا CHK-044 وCHK-008 | الفصل 2 القسم 7 |
| C27 | وصفة CST الإخراج | Kelly يفضل Luminance Mapping بدخل 10000 وخرج 100 مع `Apply Forward OOTF`، والدليل يشير إلى `DaVinci` للوسائط واسعة النطاق ويقول إن Luminance Mapping أدق عند مساحة معيارية واحدة | `DaVinci` مع `Max Input` 10000 و`Max Output` 100، وLuminance Mapping اختبار لا "الوصفة" | ⚠ فحصا CHK-057 وCHK-067 | الفصل 7 القسم 8.2 |
| C29 | مفتاح Preferences وقاعدة "لا تخترع" | ملاحظات تنهى عن اختراع مفاتيح، وقاعدة الدليل تحول Command إلى Ctrl | `Ctrl + ,` ✔ بالقاعدة، وتؤكده على جهازك | ⚠ فحص CHK-019 | الفصل 1 القسم 1.2، والفصل 2 القسم 5 |
| C30 | أرقام المنطقة الآمنة | هوامش Meta للإعلانات (270 و670 و65 px) مروية عن صفحات طرف ثالث، وصندوقا Tier A وTier B من مهارتك، وأرقام TikTok تختلط في بعض المصادر | تطبع الأولى والثانية "مروية" ◐، ولا تطبع أرقام TikTok على أنها Instagram | ⚠ فحصا CHK-103 وCHK-102 | الفصل 12 القسم 11، والفصل 14 القسم 9 |
| C31 | تلوين العقد | الممارسة تلون العقد، والدليل يوثق `Node Color` لعقد Fusion فقط، وفي صفحة Color `Track Node Changes Using Color` | الاسم يحمل المعنى، و`Track Node Changes Using Color` علامة مراجعة فقط، وألوان المقاطع تعلم نوع الكاميرا | ⚠ فحص CHK-053 | الفصل 8 القسم 2.3، والفصل 9 القسم 2.2 |
| C32 | N-RAW وProRes RAW | قائمة الخام في الدليل لا تسمي N-RAW و"Nikon RAW" فيه يعني صور NEF، وجدول الترميزات يضع فك `.nev` على Windows بلا وسم Studio | ليسا للتسليم قبل الاختبار، ولا تكتب "لوحة Camera Raw خاصة بـ N-RAW" | ⚠ فحصا CHK-049 وCHK-037 | الفصل 6 القسم 6 |

## 2. الصفوف المحسومة

| الرقم | الموضوع | الحسم | الفحص |
|---|---|---|---|
| C2 | المسار الافتراضي | المسار أ (RCM) افتراضي والمسار ب موثق كاملا ◐ توصية، وكلاهما رسمي، فلا "إجماع 2026" ولا "الطريقة الصحيحة" | CHK-060 وCHK-037 وCHK-034 تختبره على لقطاتك |
| C3 | `Saturation Compression` أم `Saturation Mapping` | "Saturation Compression (في 21.1، وتسمى Saturation Mapping في 21.0 وفي عقدة CST بصفحة Fusion وفي الواجهة البرمجية)" ✔ | CHK-054 يطبع اسم نسختك |
| C4 | مفتاح Keyboard Customization | `Alt + Ctrl + K` بقاعدة Blackmagic (Option = Alt وCommand = Ctrl) ✔ | CHK-019 على Windows |
| C5 | مفتاح Project Settings | `Shift + 9` مطبوع في فقرة التنقل بالدليل (ص 21) ✔، وعمله والصفحة Color مفتوحة ⚠ (فحص CHK-019) | CHK-019 |
| C6 | `SelectPreset` | الدالة غير موجودة في واجهة 21.1 البرمجية ✔، والبديلان `LoadRenderPreset` و`SetProjectSettingsPreset` | CHK-124، وتصحح مهارتك بسطر واحد (الفصل 16 القسم 11) |
| C10 | إصدار ColorSlice | "ColorSlice (Resolve 19.0؛ مثبتة في نسختك Studio)"، ولا "مجانية" ولا "Studio فقط" | CHK-064 |
| C14 | وحدة الزيبرا | "قيمة الزيبرا" بحساب مكافئ 8-bit، ولا "IRE" | CHK-112 يقيس السلوك الفعلي |
| C15 | تقريب اقتصاص 6K | 3402 x 9 / 16 = 1913.625 فيطبع "1913.6 أي نحو 1914"، وهامش التكبير 1.77، و1.68 TB في الساعة لـ 6K عند 59.94p ✔ حساب | لا فحص |
| C20 | عدد صفحات الدليل | دليل 21.1: 4352 صفحة ("نحو 4350")، ودليل 21: 4445 صفحة ✔ | لا فحص |
| C21 | افتراضي `Mismatched resolution files` | الافتراضي `Scale entire image to fit` ✔ (ص 148)، والدليل يضبط `Scale full frame with crop` | CHK-028 يقرأ الاسمين |
| C26 | مواقف الممارسين من الغاما | تنسب كل عبارة لصاحبها بـ ◐ ولا تقتبس إلا مقالات Frame.io التي قرئت | لا فحص |
| C28 | معدل الإطارات في وثائقك القديمة | 25 fps، والسكربتات وClaude يقرآن `timelineFrameRate` ولا يفترضان ✔ | CHK-123 وCHK-027 |

## 3. ملاحظات المراجعة التي يتقدم فيها الدليل الرسمي على سجل القرارات

قاعدة الدليل أن نص دليل Resolve المقروء يغلب سجل القرارات حين يختلفان، وكشف كتاب الفصول وقراء المراجعة ستة بنود قرأ معد هذا الملحق نص كل منها في دليل 21.1 (bmd211) بالبحث، وكلها ✔ من جهة نص الدليل، وتبقى صياغة الفصول المتأثرة قرارا يتخذه من يدمج الدليل:

| البند | ما في سجل القرارات | ما في الدليل الرسمي 21.1 | ما تفعله الآن |
|---|---|---|---|
| فضاء إعادة التحجيم (`Apply resize transformations in`) | D04 الصف 14: `Linear` | ص 242: `Linear` أفضل غالبا لوسائط SDR، و`Gamma Mapped` أفضل غالبا حين تخلط وسائط SDR مع وسائط واسعة النطاق ولوغاريتمية على تايم لاين واحد، وهذا تايم لاينك | `Linear` كما في الفصل 7 الصف 14، وجرب `Gamma Mapped` على ريل مختلط ◐ ولا فحص يغطي المقارنة بعد (يقترح إضافتها إلى CHK-061) |
| الصفحة التي فيها قاعدة Command = Ctrl | D0 البند 6 والجدول 5.9: ص 56 | ص 54 في دليل 21.1 (وص 56 في دليل 21) | اكتب ص 54 للدليل 21.1 |
| مسح ذاكرة الريندر المؤقتة | D26: يمسح "والمشروع مغلق" | ص 206: "Open the project, and choose Playback > Delete Render Cache > All, Unused, or Selected Clips" | افتح المشروع المعني ثم امسح كما يقول الدليل، والفصل 2 يحذر من مسح ذاكرة مشروع تعمل عليه الآن (الفصل 2 القسم 8.6) |
| تصدير `.drp` قبل الترقية | D03: `Export Project...` فقط | ص 76: `Export Project` بلا لقطات ولا LUT، و`Export Project With Stills and LUTs` للملف الأكمل | استعمل الثاني للمشاريع الملونة (الفصل 1 القسم 1.4) |
| إعدادات Camera Raw تحت المسار أ | D24 وD26 (الخطوة 1): `Decode Using` و`Decode Quality` كأنهما متاحان دائما | ص 462: تتعطل إعدادات Camera Raw ولوحتها تحت RCM لأن RCM يتحكم في فك كل ملفات الخام | تجاوز خطوة Decode Quality تحت المسار أ إن وجدت اللوحة معطلة ⚠ (فحص CHK-030)، وانزل إلى بقية السلم (الفصل 2 القسم 8) |
| مسار إضافة تراك الترجمة وتسمية لوحة الإعدادات | D30: `Timeline > Add Subtitle Track` و`Project Settings > Subtitle and Transcription` | ص 1232: كليك يمين على رأس أي تراك > `Add Subtitle Track`، وفي صفحة Cut من قائمة Timeline Actions (ص 646 وص 702)، والباب اسمه `Subtitles and Transcription` (ص 160) | اكتب مسار الدليل وسمي الباب كما في الدليل (الفصل 14 القسم 7) |

> **تحقق على جهازك (CHK-029، CHK-030، CHK-076):** هذه البنود الستة مصدرها نص الدليل لا جهازك، فاقرأ قائمة `Apply resize transformations in` وحالة لوحة `Camera Raw` في مشروع المسار أ ومسار إضافة تراك الترجمة، واكتب الأسماء كما تظهر، وأرسلها إلى Claude مع رقم الفحص

# الملحق هـ: صيانة الدليل

> **طريقة الاستعمال:** الدليل ملف حي: صور تضاف إليه، وإصدارات جديدة من Resolve تصدر، وفحوص على جهازك تغير علامات، وهذا الملحق يقول كيف تصونه دون أن تكسر إحالاته أو تدعي ما لم تتحقق منه
>
> العلامات: ✔ موثق، ◐ مصدر واحد أو توصية معقولة، ⚠ غير مؤكد وعليك فحصه (برقم الفحص)

> **قاعدة:** معرفات `SHOT-NN-NN` و`CHK-nnn` و`D01` إلى `D36` ثابتة: لا ترقمها من جديد ولا تعد استعمال رقم لغير معناه، فأسماء ملفات الصور والإحالات بين الفصول تقوم عليها، وما يضاف يضاف في آخر مجموعته

## 1. تضمين لقطات الشاشة بـ embed_shots.py

الحجز في الفصول سطر مستقل بهذه الصيغة، حيث NN رقمان (رقم الفصل ثم التسلسل)، وP1 أساسية وP2 تحسينية، وفي الفصل 19 قد يبلغ التسلسل ثلاث خانات:

```text
> 📷 **[SHOT-NN-NN | P1]** وصف دقيق للمطلوب تصويره
```

1. التقط اللقطة من Resolve على Windows بـ `Win + Shift + S`، والتقط اللوحة كلها بعنوانها، ولا تقص قائمة منسدلة مفتوحة، ولا ترسم واجهة بدل الصورة ولا تنقل صورا من دليل Blackmagic ✔ (قاعدة الدليل)
2. احفظها باسم المعرف بالضبط داخل `davinci/img/`، مثل `davinci/img/SHOT-07-03.png`، والامتدادات المقبولة `.png` و`.jpg` و`.jpeg` و`.webp` ✔ (نص السكربت)
3. شغل `python3 davinci/embed_shots.py`: يحول كل حجز له صورة إلى سطر صورة نسبي `img/<المعرف>.png` ثم سطر عنوان مائل، ويكتب الناقص في `davinci/SHOTS.md` (جدول بالمعرف والأولوية والمطلوب، مرتبا بالأولوية ثم المعرف)، ويطبع عدد المضمن والناقص ✔
4. `python3 davinci/embed_shots.py --list` لا يعدل ملف الدليل `davinci/DaVinci_Resolve_21_Master_Guide.md` ويحدث `davinci/SHOTS.md` فقط، فهو الأمر الآمن لمعرفة الناقص ✔
5. ما ضمن يبقى مضمنا، وللتراجع شغل `git checkout` على ملف الدليل ✔ (نص السكربت)

- عند كتابة هذا الملحق كان في الفصول 316 حجزا بمعرفات فريدة وكلها بالصيغة الصحيحة وخارج كتل الكود ✔ (عد آلي)، والعدد الحالي يطبعه الأمر `--list`
- الصور تبقى ملفات بجانب الدليل ولا تدخله، فانقل المجلد `img` مع الملف إذا نقلت الدليل
- فهرس لقطات الفصل 19 (القسم 16) جدول لا أسطر حجز، فلا يحوله السكربت إلى صور، وللقطة منه انقل سطرها إلى حجز بالصيغة أعلاه
- ابدأ بلقطات P1، فالشرح لا يفهم بدونها، وقبل اللقطة اقرأ ما تقوله الخطوة لتصور الحالة المطلوبة نفسها

## 2. إعادة بناء الدليل بـ build_guide.py

هذا الملحق يفترض وجود `davinci/build_guide.py` يجمع الفصول 01 إلى 20 والملاحق في ملف الدليل الواحد ◐، فاقرأ رأس السكربت قبل أول تشغيل لتعرف مصدره ومخرجه

1. عدل ملف الفصل أو الملحق المصدر لا ملف الدليل المجمع
2. شغل `python3 davinci/build_guide.py`
3. شغل `python3 davinci/embed_shots.py` بعده دائما ◐: إعادة البناء من المصدر تعيد الحجوزات نصوصا، والصور في `davinci/img/` باقية فيعيد السكربت تضمينها (استنتاج من نص embed_shots.py وافتراض عن build_guide.py، ولم يجرب)
4. شغل فاحص الأسلوب العربي `arlint.py` بالخيار `--fix` على الملف الناتج ثم بدونه حتى يصير `TOTAL violations = 0`، وقواعده: بلا تنوين ولا شدة ولا شرطة طويلة أو متوسطة، ولا نقطة في آخر سطر أو خانة، وأرقام غربية فقط
5. افتح الملف وراجع الفهرس والإحالات (انظر الفصل N) وعدد الحجوزات الناقصة من `davinci/SHOTS.md`
6. إن تغير الملف عند غيرك قبل أن تكتب فوقه فاقرأ الفرق ودمجه، ولا تفرض نسختك فوق نسخة غيرك

## 3. إعادة التحقق عند صدور إصدار جديد

القاعدة: لا تنقل حكما من دليل إصدار إلى إصدار آخر قبل أن تقرأ دليل الإصدار الجديد، وما فحصته على جهازك يصح للبناء الذي فحصته عليه فقط

1. **اقرأ الإصدار:** من قائمة التنزيل `bmd_downloads` خذ رقم الإصدار والبناء والتاريخ، وافتح Readme الإصدار (`https://www.blackmagicdesign.com/support/content/readme/<releaseId>`) واقرأ المتطلبات (الدرايفر وVRAM وذاكرة النظام) وملاحظاته ✔، ولا تحكم على بناء بأنه معطوب إلا بسطر مكتوب في Readme (الفصل 1 القسم 1.1)
2. **نسخ احتياطي قبل أي ترقية:** الترقية باتجاه واحد (الفصل 1 القسم 1.4) ✔
3. **نزل المراجع الجديدة:** دليل المرجع، ودليل الميزات الجديدة، وجدول Studio والأجهزة، وقائمة الصيغ المدعومة، وREADME وCHANGELOG وملف الأنواع للسكربت (الملحق ج)
4. **ابحث عن كل اسم واجهة وكل رقم صفحة** ورد بالفصول وعليه ◐ أو ⚠، ثم عن الباقي (القسم 4 أدناه)، واكتب ما تغير
5. **قارن المواضع المتقلبة أولا:** جدول Free مقابل Studio (D35)، وقائمة الصيغ (فك `.nev` وR3D وProRes RAW، وترميز ProRes على Windows)، وباب Color Management (أسماء `Output Color Space` و`Saturation Compression`)، وباب Deliver (أسماء الحقول وزر الريندر وAAC)، وباب Fairlight (نافذة `Short`)، وأيقونة Layer List، وقيم النسخ الاحتياطي، وسقوف Meta في IG User Media، وإعلانات Nikon للفيرموير
6. **أعد فحص السكربتات:** قارن أسماء كل استدعاء Resolve في السكربتات الثمانية بملف الأنواع الجديد، وشغل `python3 -m py_compile` على كل كتلة، وأضف "21.1 فما فوق" لما يحتاج استدعاء جديدا (الفصل 16 القسم 8.1)
7. **نفذ فحوص الانحدار الدنيا** (القسم 7) على نسخة من مشروع، ولا تفتح مشروعك الحي بنسخة جديدة قبل نسخه احتياطيا
8. **حدث الفصول والعلامات:** بند أكدته القراءة والفحص يبقى ✔ بتاريخ جديد، وبند تغير نصه يحدث ويعاد فحصه، وبند لم تصل إليه تعيده ⚠ برقم فحصه، ثم حدث الملحق ج إن تغير مصدر
9. **حدث الختم** بحسب القسم 5

## 4. البحث في الدليل المرجعي

- داخل Resolve: قائمة `Help` فيها مدخل DaVinci Resolve Reference Manual وDocumentation ✔ (ص 4350 من دليل 21.1)، وفي `Preferences` و`Project Settings` مربع بحث يفتح الصفحة ويضيء الإعداد ✔ (ص 96)
- في ملف PDF: ابحث بجزء مميز من الاسم بلا حساسية لحالة الأحرف، فالدليل يكتب العنوان بأحرف كبيرة (`Apply Resize Transformations In`) والنص بحالات مختلفة، واقرأ رقم صفحة PDF من برنامج العرض، وفي الصفحتين اللتين راجعتهما من دليل 21.1 (242 و3264) يطابقه الرقم المطبوع في ذيل الصفحة ◐
- ولبحث يعطيك رقم الصفحة مع السطر حول الملف إلى نص بأداة `pdftotext` (من Poppler، وهي التي استعملها معد الملاحظات على Linux ◐): `pdftotext DaVinci_Resolve_21.1_Reference_Manual.pdf bmd211.txt`، ثم شغل السكربت التالي، وهو مجرب على نص دليل 21.1 ✔

```python
#!/usr/bin/env python3
"""manual_grep.py FILE.txt REGEX [CONTEXT_LINES]   -> p<PDF page>: matching lines
   manual_grep.py FILE.txt --page FIRST [LAST]    -> prints whole pages
FILE.txt is the manual converted with pdftotext (a form feed separates the pages)."""
import re
import sys

path = sys.argv[1]
pages = open(path, encoding="utf-8", errors="replace").read().split("\f")
if sys.argv[2] == "--page":
    first = int(sys.argv[3])
    last = int(sys.argv[4]) if len(sys.argv) > 4 else first
    for n in range(first, last + 1):
        print("=== PAGE %d ===" % n)
        print(pages[n - 1])
    sys.exit(0)
rx = re.compile(sys.argv[2], re.I)
ctx = int(sys.argv[3]) if len(sys.argv) > 3 else 0
for n, page in enumerate(pages, 1):
    lines = [x.strip() for x in page.split("\n")]
    for i, line in enumerate(lines):
        if rx.search(line):
            lo, hi = max(0, i - ctx), min(len(lines), i + ctx + 1)
            print("p%d: %s" % (n, " | ".join(x for x in lines[lo:hi] if x)))
```

```text
python manual_grep.py bmd211.txt "Graphics White Level" 1
python manual_grep.py bmd211.txt --page 242
```

- أول نتيجة تأتي غالبا من فهرس الكتاب (الصفحة 220 من دليل 21.1 في المثال) ثم تأتي الصفحة الفعلية (242)، فاقرأ الصفحة الفعلية
- لمقارنة دليلين حول كلا الملفين إلى نص واقتطع صفحات الباب نفسه من كل منهما بالأمر `--page` ثم قارنهما بأداة مقارنة نصوص، ولا تقارن الكتاب كله دفعة واحدة، فأرقام الصفحات بين دليلي 21 و21.1 تختلف من 3 إلى 5 صفحات في أول الكتاب ونحو 55 صفحة أو أكثر في أقسام Color ✔
- إن لم يعطك البحث نتيجة فالتسمية غائبة عن الدليل المقروء، فاكتب البند ⚠ برقم فحص ولا تحكم من الذاكرة، وأرسل إلى Claude السطور التي وجدتها مع رقم الصفحة (الفصل 18 القسم 5)

## 5. سياسة ختم النسخة

- **الصيغة:** "DaVinci Resolve Studio 21.x؛ الحالي وقت الكتابة 21.1.1 (نشرته Blackmagic في 2026-10-02، بناء 21.1.1.10)" ✔ (الفصل 1 القسم 1.1)
- **أين تكتب أرقام البناء:** في الفصل 1 (جدول الإصدارات) وفي جدول الحقائق وفي `PROJECT_NOTES.txt` لكل مشروع بالبناء الذي استعملته فعلا، وفي كل مكان آخر تكتب 21.x فقط ✔ (D01)
- **إصدار تصحيحي** (مثل 21.1.2): اقرأ Readme واجمع المتطلبات الجديدة، وحدث الجدول والختم، ونفذ فحوص الانحدار، ولا تغير فصلا إلا إذا مس Readme بندا فيه ◐
- **إصدار فرعي أو رئيسي** (مثل 21.2 أو 22): اعتبر الدليل بحاجة إلى إعادة قراءة كاملة للمراجع (القسم 3)، وكل بند ✔ جاء من فحص على جهازك يعود ◐ حتى تعيد فحصه على البناء الجديد، وكل ✔ جاء من نص الدليل يبقى حتى تقرأ نص الدليل الجديد ◐
- **ختم الفحص:** بعد كل فحص اكتب بجانب البند "تم الفحص بتاريخ (التاريخ) على Resolve 21.x.y" مع النتيجة ✔ (D34 البند 7)، ولا ترفع ⚠ إلى ✔ بلا هذا الختم
- **ممنوع:** قائمة "بناءات معطوبة"، وعبارة "الإصدار كذا يكسر كذا" بلا سطر مكتوب في Readme، وكتابة "21.1 هو الأحدث" كحقيقة دائمة ✔ (سجل القرارات، الجزء 4، الصفوف 1 إلى 4)
- **المصادر:** لكل دليل جديد مفتاح جديد (مثل `bmd212`) يضاف إلى الملحق ج ولا يمحى القديم، والأرقام (ص N) تبقى مع اسم الدليل الذي أخذت منه

## 6. جدول المراجعة: أي ملاحظة وأي فصل وماذا تبحث عنه

ملفات الملاحظات `notes/<المعرف>.v2.md` هي مرجع كل فصل (القسم G فيها فحوصه وH جدول مصادره):

| الملاحظة | الفصول | القرارات | ما تبحث عنه في الإصدار الجديد |
|---|---|---|---|
| `ver` | 1 | D01 وD03 وD35 | رقم الإصدار والبناء، متطلبات Readme، جدول Free مقابل Studio، السعر، مسار About |
| `sys` | 2 | D03 وD14 وD15 وD23 وD26 | أسماء Preferences وخيارات Decode Options وMedia Storage وسلم الأداء وقيم النسخ الاحتياطي |
| `mon` | 3 | D10 إلى D14 وD16 | خيارات العارض والمقاييس وLUT العارض، ووثائق Lenovo وMicrosoft لا تتغير بتغير Resolve فتفحص كل سنة |
| `zr` | 4 | D20 إلى D23 وD25 | صفحات دليل Nikon ZR، وأنواع الملفات والمعدلات، وفيرموير الكاميرا (C16) |
| `r3d` | 5 | D04 وD05 وD07 وD08 وD09 | لوحة Camera Raw (RED)، وإعدادات IPP2، ووصفات Nikon لـ R3D NE |
| `nlog` | 6 | D07 وD20 وD21 | دليل Nikon Log/RAW، وقائمة الصيغ المدعومة، ومعاملة N-RAW وProRes RAW |
| `cm` | 7 | D04 إلى D12 | باب Color Management كاملا: أسماء الحقول والقوائم، وأسماء `Output Color Space` وحقول CST |
| `tools` | 8 و11 | D16 إلى D19 وD35 | أبواب صفحة Color، وFilm Look Creator، ووسوم Studio، ومواضع المقاييس |
| `craft` | 9 | D13 وD16 إلى D19 | الشجرة والمجموعات، والمقاييس، وPivot وContrast وKey Output Gain |
| `skin` | 10 | D16 وD21 | خيارات Vectorscope ومؤشر البشرة، وأرقام الشروق والغسق (تحسب من جديد) |
| `deliver` | 12 | D12 وD27 وD28 وD29 وD31 | باب Deliver، وأسماء حقول Render Settings، ووسوم الألوان، وسقوف Meta، وأوامر ffprobe |
| `edit` | 13 | D24 وD25 وD26 وD31 وD32 | أبواب Cut وEdit وProject Settings والاختصارات وSmart Reframe وRetime |
| `fusion` | 14 | D30 وD31 | Text+ وReading Direction وتراك الترجمة وCreate Subtitles from Audio وحزمة اللغات |
| `audio` | 15 | D22 وD29 | أبواب Fairlight والقياس (Short) وMain bus وDucker وVoice Isolation |
| `auto` | 16 | D33 وD04 | README وCHANGELOG وملف الأنواع للسكربت، وإعداد MCP، وأسماء مفاتيح الألوان |
| `trouble` | 17 | D28 وD34 | ما يكتبه Readme نصا من أخطاء معروفة، وبرامج النقل والبصمات، وتغيرات الأبواب بين الإصدارين |

## 7. فحوص الانحدار الدنيا

نفذها على نسخة من مشروع بعد كل تحديث، وبترتيبها:

| الفحص | ماذا يثبت |
|---|---|
| CHK-018 | الاسم الفعلي للقوائم وأسماء لوحات Preferences ونافذة About |
| CHK-029 وCHK-055 | حقول Color Management كما في الفصل 7، وثبات قيم DRT بعد تعديل مساحة ألوان |
| CHK-054 | أسماء حقول أداة CST في نسختك ووسم `Saturation Compression` |
| CHK-086 وCHK-087 | حقول Deliver وحفظ الـ preset وإعادة فتحه بالقيم نفسها |
| CHK-088 وCHK-089 | الريندر الأول وكتلة ffprobe ووسوم الألوان |
| CHK-091 | قوائم الترميز: ProRes وDNxHR وAAC، وغياب xHE-AAC |
| CHK-093 | قياس الصوت على الملف المصدر |
| CHK-064 | جرد أدوات Studio |
| CHK-121 وCHK-126 | وثائق السكربت المثبتة، وتشغيل السكربتات الثمانية على نسخة |
