#!/usr/bin/env python3
"""embed_shots.py : يحول أماكن حجز لقطات الشاشة بالدليل إلى صور فعلية.

الاستعمال:
    python3 davinci/embed_shots.py            # يضمّن كل لقطة موجودة بمجلد img/ ويحدّث SHOTS.md
    python3 davinci/embed_shots.py --list     # يعرض اللقطات الناقصة فقط

الملفات: ضع اللقطة باسم المعرف مثل img/SHOT-07-03.png (أو .jpg/.webp).
ما تم تضمينه يبقى مضمّنا (الحجز يتحول لسطر صورة + العنوان)، وللتراجع شغّل git checkout على الملف.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GUIDE = os.path.join(HERE, 'DaVinci_Resolve_21_Master_Guide.md')
IMG = os.path.join(HERE, 'img')
EXTS = ('.png', '.jpg', '.jpeg', '.webp')
RX = re.compile(r'^> 📷 \*\*\[(SHOT-\d\d-\d\d)(?: \| (P[12]))?\]\*\* (.+)$', re.M)

def find_img(sid):
    for e in EXTS:
        p = os.path.join(IMG, sid + e)
        if os.path.exists(p):
            return 'img/' + sid + e
    return None

text = open(GUIDE, encoding='utf-8').read()
missing, done = [], []
def sub(m):
    sid, pr, desc = m.group(1), m.group(2) or 'P2', m.group(3)
    path = find_img(sid)
    if path:
        done.append(sid)
        return '![%s: %s](%s)\n\n*%s: %s*' % (sid, desc, path, sid, desc)
    missing.append((sid, pr, desc))
    return m.group(0)

new = RX.sub(sub, text)
if '--list' not in sys.argv:
    open(GUIDE, 'w', encoding='utf-8').write(new)

rows = ['# SHOTS.md : قائمة لقطات الشاشة المطلوبة', '', 'التقط اللقطة بـ Win+Shift+S من Resolve على Windows واحفظها باسم المعرف داخل davinci/img/ ثم شغل embed_shots.py', '',
        '| المعرف | الأولوية | المطلوب |', '|---|---|---|']
for sid, pr, desc in sorted(missing, key=lambda x: (x[1], x[0])):
    rows.append('| %s | %s | %s |' % (sid, pr, desc.replace('|', '/')))
rows += ['', 'مضمّن حاليا: %d، ناقص: %d' % (len(done), len(missing))]
open(os.path.join(HERE, 'SHOTS.md'), 'w', encoding='utf-8').write('\n'.join(rows) + '\n')
print('embedded now: %d, still missing: %d (see davinci/SHOTS.md)' % (len(done), len(missing)))
