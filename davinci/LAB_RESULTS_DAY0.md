# LAB_RESULTS_DAY0

التاريخ: السبت 3 أكتوبر 2026
الجلسة: الأولى (جرد آلي بالقراءة فقط)
المشروع المفتوح وقت الفحص: Zaid_MF_Montage_Reel (مشروع شغل حقيقي، ما تغير فيه أي شي)
علامات الثقة: ✔ تحقق مباشر من Resolve أو من الجهاز، ◐ استنتاج، ⚠ غير مؤكد

## جدول النتائج

| CHK | ماذا فحصنا | القيمة المقروءة | الحالة | يغيّر قرارا؟ |
|---|---|---|---|---|
| اتصال | حالة Resolve | running = true، version = 21.1 | ✔ | لا |
| CHK-018 | الإصدار والنسخة | 21.1.0.17، DaVinci Resolve Studio | ✔ | نعم: أقدم من 21.1.1 (البناء 21.1.1.10 حسب الدليل) |
| CHK-025 | أدوات الـ MCP | 14 أداة (القائمة تحت) | ✔ | لا |
| CHK-121 | LoadRenderPreset وSelectPreset | LoadRenderPreset موجودة، SelectPreset غير موجودة بأي stub | ✔ | لا، يطابق الدليل |
| CHK-027 إلى 032 | إعدادات المشروع واللون | الجدول الثاني تحت | ✔ | نعم (الفروقات تحت) |
| CHK-036 | الـ Bins | Master = 68 مقطع، Master/Footage = 14 مقطع، المجموع 82 | ✔ | لا |
| CHK-046 | خصائص المقاطع (أول 20) | 19 فيديو ProRes 4444 12-bit، 1080x1920، 29.97 fps، Input Color Space = Project، Data Level = Auto، وملف صوت واحد | ✔ | لا |
| CHK-046 | VFR والدوران | ما ظهر أي مفتاح بهالمعنى | ◐ | لا |
| CHK-023 وCHK-031 | مسار الكاش | perfCacheClipsLocation = C:\Users\استخدام عام\Videos\CacheClip (مسار فيه حروف عربية) | ✔ | ◐ ممكن (أدوات سطر الأوامر) |
| CHK-002 | ffprobe | غير موجود بالـ PATH | ✔ | نعم: لازم تثبيت |
| CHK-002 | ffmpeg | غير موجود بالـ PATH | ✔ | نعم: لازم تثبيت |
| CHK-002 | Python | الأمر رجع الكود 9009، والموجود فقط python.exe الوهمي من Microsoft Store (WindowsApps) | ◐ | نعم: لازم تثبيت |
| CHK-008 | كرت NVIDIA | NVIDIA GeForce RTX 4070 Ti، Driver 616.92، 12282 MiB | ✔ | لا (يطابق RTX 40 وNVENC) |

## إعدادات اللون والتايم لاين (CHK-027 إلى CHK-032)

| المفتاح | القيمة | الحالة |
|---|---|---|
| timelineFrameRate | 29.97 | ✔ |
| timelineResolutionWidth | 1080 | ✔ |
| timelineResolutionHeight | 1920 | ✔ |
| timelinePlaybackFrameRate | 24 | ✔ |
| colorScienceMode | davinciYRGBColorManagedv2 | ✔ |
| colorSpaceInput | Rec.709 Gamma 2.4 | ✔ |
| colorSpaceTimeline | DaVinci WG/Intermediate | ✔ |
| colorSpaceOutput | Rec.709 Gamma 2.4 | ✔ |
| inputDRT | None | ✔ |
| outputDRT | None | ✔ |
| timelineWorkingLuminance | 1000 (الوضع: HDR 1000) | ✔ |
| colorSpaceOutputGamutMapping | None | ✔ |

مفاتيح إضافية: colorSpaceOutputToneMapping = None، colorSpaceOutputToneLuminanceMax = 100، isAutoColorManage = 0، useColorSpaceAwareGradingTools = 0، separateColorSpaceAndGamma = 0، useInverseDRT = 0، hdrMasteringOn = 0، videoMonitorUseHDROverHDMI = 0، perfRenderCacheMode = none، perfAutoRenderCacheEnable = 1، perfRenderCacheCodec = apch

## أدوات الـ MCP (14)

get_resolve_status، launch_resolve، run_script، run_script_unsafe، search_scripting_api، get_scripting_api، get_scripting_docs، get_whats_new، list_luts، generate_lut، delete_lut، list_dctls، update_dctl، delete_dctl

## ملخص بخمسة أسطر

1. Resolve Studio يعمل بالإصدار 21.1.0.17، وهو أقدم من 21.1.1 المذكور بالدليل
2. LoadRenderPreset موجودة وSelectPreset غير موجودة، والدليل صحيح بهالنقطة
3. كرت NVIDIA هو RTX 4070 Ti (12 GB)، يعني NVENC متاح لتسليم H.264
4. ffprobe وffmpeg وPython غير مثبتة على الجهاز (Python الموجود هو الوهمي فقط)
5. إعدادات المشروع المفتوح تختلف عن قرارات القسم 2 بأربع نقاط (تحت)

## الفروقات بين القسم 2 وما قرأته من Resolve

لم أصلح أي شي (الجولة قراءة فقط). الفروقات على مشروع زيد، والتصليح يصير على LAB_Day0_RCM بعد موافقة بالاسم

- fps: المشروع 29.97 والدليل 25 (الدليل يخص التايم لاين الجديد)
- outputDRT: None والدليل DaVinci
- غاما الإخراج: Rec.709 Gamma 2.4 والدليل مؤقتا G22
- timelineWorkingLuminance: 1000 (HDR 1000) بإنتاج SDR، غير مذكور بالدليل ◐
- timelinePlaybackFrameRate: 24 مقابل تايم لاين 29.97، ممكن يسبب رعشة بالمعاينة ◐

## ما يلزم بعد هذا

1. تثبيت ffmpeg وPython (الأوامر بالرد)
2. قراءة خصائص مقاطع الـ Footage (14 مقطع) بعد موافقتك، لأن فيها غالبا لقطات الكاميرا الحقيقية
3. CHK-011: قائمة OSD لشاشة P32p-20 (Color Mode وDynamic Contrast)
4. CHK-010 وCHK-009: لوحة NVIDIA (Change resolution) وإعدادات HDR وNight light بـ Windows
5. CHK-022: Preferences > System > General
6. CHK-020 وCHK-021: Preferences > System > Memory and GPU وDecode Options
7. CHK-029: File > Project Settings > Color Management (على LAB_Day0_RCM بعد موافقتك)
8. CHK-086: صفحة Deliver > Render Settings > Video لـ MP4 وH.264 وقائمة Encoder

---

## تفسير الجولة الأولى (Claude Code، 2026-10-03)

1. الإصدار 21.1.0.17 مؤكد أنه موجود فعلا ✔ (الدليل كان يعتبر البناء 17 غير مؤكد). الإصدار الأحدث 21.1.1 (البناء 21.1.1.10)، والترقية اتجاه واحد: انسخ احتياطيا (CHK-001) قبلها ولا تحدّث بنص مشروع شغل.
2. أدوات الـ MCP 14، وليست كما في مهارة resolve-reels-post (تنقصها: launch_resolve، get_scripting_api، delete_lut، list_dctls، delete_dctl). و`SelectPreset` غير موجودة ✔، والصحيحة `LoadRenderPreset`.
3. مشروع Zaid_MF_Montage_Reel لا يخالف الدليل: مصدره ProRes 4444 بغاما Rec.709 2.4 (محتوى SDR جاهز)، فمسار RCM مع Input = Rec.709 Gamma 2.4 وOutput DRT = None وInput DRT = None صحيح لمصدر SDR. حالة `Output DRT = DaVinci` خاصة بمقاطع الـ Log والـ RAW (الفصل 7). لا تغيّر هذا المشروع.
4. نقطة بيانات للتعارض C12: timelineWorkingLuminance = HDR 1000 على مشروع بإعداد DaVinci WG/Intermediate (◐: لا نعرف إن كانت قيمة Resolve الافتراضية أم عدّلتها). تُثبَّت بفحص CHK-029 على المشروع التجريبي.
5. timelinePlaybackFrameRate = 24 مع تايم لاين 29.97: يسبب رعشة بالمعاينة فقط (ليس بالرندر). مكانه `Project Settings > Master Settings > Playback frame rate`، وهو غير قابل للضبط عبر API. اجعله مساويا لتايم لاين القالب الجديد (25).
6. مسار الكاش C:\Users\استخدام عام\Videos\CacheClip فيه حروف عربية على مجلد المستخدم العام. انقله لمسار إنجليزي على SSD سريع (مثل D:\Resolve\Cache) بفحص CHK-023 وCHK-048.
7. ffprobe وffmpeg وPython غير مثبتة (CHK-002): `winget install Gyan.FFmpeg` و`winget install MediaArea.MediaInfo.GUI` و`winget install Python.Python.3.12` (أسماء الحزم ◐)، ثم عطّل اختصار python.exe الوهمي: `Settings > Apps > Advanced app settings > App execution aliases` (◐)، وأعد فتح cmd.exe.
8. RTX 4070 Ti بـ 12 GB: يطابق RTX 40 ويكفي NVENC. أما "أدوات الذكاء المتقدمة" فتريد 16 GB VRAM حسب Blackmagic، فتوقع تحذيرات على بعضها (CHK-085).
9. لا توجد بعد أي لقطة ZR داخل Resolve: فحوص R3D NE وN-Log وData Levels (CHK-036 إلى 045) تنتظر تصوير CHK-007.
