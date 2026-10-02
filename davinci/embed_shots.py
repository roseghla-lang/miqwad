#!/usr/bin/env python3
"""embed_shots.py : يحول أماكن حجز لقطات الشاشة بالفصول إلى صور فعلية ثم يعيد بناء الدليل.

الاستعمال:
    python3 davinci/embed_shots.py            # يضمّن كل لقطة موجودة بمجلد img/ ويحدّث SHOTS.md ويعيد البناء
    python3 davinci/embed_shots.py --list     # يعرض الناقص فقط (بدون تعديل)

الملفات: التقط اللقطة بـ Win+Shift+S من Resolve على Windows واحفظها باسم المعرف
         مثل davinci/img/SHOT-07-03.png (أو .jpg أو .webp) ثم شغّل السكربت.
"""
import glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, 'img')
EXTS = ('.png', '.jpg', '.jpeg', '.webp')
RX = re.compile(r'^> 📷 \*\*\[(SHOT-\d\d-\d\d)(?: \| (P[12]))?\]\*\* (.+)$', re.M)


def find_img(sid):
    for e in EXTS:
        if os.path.exists(os.path.join(IMG, sid + e)):
            return 'img/' + sid + e
    return None


missing, done = [], []


def sub(m):
    sid, pr, desc = m.group(1), m.group(2) or 'P2', m.group(3)
    path = find_img(sid)
    if path:
        done.append(sid)
        return '![%s: %s](%s)\n\n*%s: %s*' % (sid, desc, path, sid, desc)
    missing.append((sid, pr, desc))
    return m.group(0)


for f in sorted(glob.glob(os.path.join(HERE, 'chapters', '[0-9][0-9].md'))):
    t = open(f, encoding='utf-8').read()
    new = RX.sub(sub, t)
    if new != t and '--list' not in sys.argv:
        open(f, 'w', encoding='utf-8').write(new)

rows = ['# SHOTS.md : قائمة لقطات الشاشة الناقصة', '',
        'التقط اللقطة بـ Win+Shift+S من Resolve على Windows واحفظها باسم المعرف داخل davinci/img/ ثم شغّل embed_shots.py', '',
        '| المعرف | الأولوية | المطلوب |', '|---|---|---|']
for sid, pr, desc in sorted(missing, key=lambda x: (x[1], x[0])):
    rows.append('| %s | %s | %s |' % (sid, pr, desc.replace('|', '/')))
rows += ['', 'مضمّن حاليا: %d، ناقص: %d' % (len(done), len(missing))]
if '--list' not in sys.argv:
    open(os.path.join(HERE, 'SHOTS.md'), 'w', encoding='utf-8').write('\n'.join(rows) + '\n')
print('embedded now: %d, still missing: %d' % (len(done), len(missing)))
if '--list' not in sys.argv:
    sys.path.insert(0, HERE)
    import build_guide
    build_guide.build()
