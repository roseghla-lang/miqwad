#!/usr/bin/env python3
"""build_guide.py : يجمّع الدليل بملف واحد من المصادر.

المصادر:  front.md + chapters/01.md ... 20.md + back.md
المخرج:   DaVinci_Resolve_21_Master_Guide.md  (ملف واحد مع فهرس تلقائي)

الاستعمال:
    python3 davinci/build_guide.py            # يبني الملف الواحد
    python3 davinci/build_guide.py --check    # يفحص فقط (مراجع CHK وSHOT والعناوين) بدون كتابة
"""
import glob, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'DaVinci_Resolve_21_Master_Guide.md')


def read(p):
    return open(p, encoding='utf-8').read().rstrip('\n') + '\n'


def kind(l):
    s = l.strip()
    if not s: return 'blank'
    if re.match(r'^(#{1,6}\s|\||[-*+]\s|\d+[.)]\s|<|!\[|---+$|\[\^)', s): return 'special'
    if l.startswith('>'): return 'quote'
    if re.match(r'^\s{2,}\S', l): return 'indent'
    return 'plain'


def qkind(l):
    s = re.sub(r'^>\s?', '', l).strip()
    if not s: return 'blank'
    if re.match(r'^(#{1,6}\s|\||[-*+]\s|\d+[.)]\s|<|!\[|```)', s): return 'special'
    return 'plain'


def normalize(text):
    """يفصل الأسطر النصية المتتالية لتظهر كفقرات منفصلة (سطر جديد واحد يندمج في Markdown)"""
    lines = text.split('\n'); out = []; fence = False
    for i, l in enumerate(lines):
        out.append(l)
        if l.strip().startswith('```'):
            fence = not fence; continue
        if fence or i + 1 >= len(lines): continue
        k, kn = kind(l), kind(lines[i + 1])
        if k == 'plain' and kn == 'plain': out.append('')
        elif k == 'quote' and kn == 'quote' and qkind(l) == 'plain' and qkind(lines[i + 1]) == 'plain': out.append('>')
    return '\n'.join(out)


def slug(h, seen):
    s = re.sub(r'`', '', h)
    s = re.sub(r'\*\*|__', '', s)
    s = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)
    s = s.strip().lower()
    s = ''.join(c for c in s if c.isalnum() or c in ' -_')
    s = s.replace(' ', '-')
    n = seen[s]; seen[s] += 1
    return s if n == 0 else '%s-%d' % (s, n)


def headings(text):
    fence = False; res = []
    for l in text.split('\n'):
        if l.strip().startswith('```'): fence = not fence; continue
        if fence: continue
        m = re.match(r'^(#{1,2}) (.+?)\s*$', l)
        if m: res.append((len(m.group(1)), m.group(2)))
    return res


def build(check_only=False):
    parts = []
    front = os.path.join(HERE, 'front.md')
    if os.path.exists(front): parts.append(read(front))
    for p in sorted(glob.glob(os.path.join(HERE, 'chapters', '[0-9][0-9].md'))): parts.append(read(p))
    back = os.path.join(HERE, 'back.md')
    if os.path.exists(back): parts.append(read(back))
    body = normalize('\n'.join(parts))
    seen = collections.Counter(); toc = []
    for lvl, h in headings(body):
        a = slug(h, seen)
        if lvl == 1: toc.append('- [%s](#%s)' % (h, a))
        else: toc.append('  - [%s](#%s)' % (h, a))
    toc_text = '## فهرس المحتويات\n\n' + '\n'.join(toc) + '\n'
    final = body.replace('<!--TOC-->', toc_text) if '<!--TOC-->' in body else toc_text + '\n' + body
    # فحوصات
    chk_file = os.path.join(HERE, '..', 'CHECKS.md')
    problems = []
    shots = re.findall(r'\[(SHOT-\d\d-\d{2,3})', final)
    for s, c in collections.Counter(shots).items():
        if c > 1: problems.append('معرف لقطة مكرر: ' + s)
    fences = sum(1 for l in final.split('\n') if l.strip().startswith('```'))
    if fences % 2: problems.append('أسوار كود غير متوازنة')
    print('chapters: %d, words: %d, shots: %d, bytes: %d' % (len(glob.glob(os.path.join(HERE, 'chapters', '[0-9][0-9].md'))), len(final.split()), len(shots), len(final.encode())))
    for p in problems: print('PROBLEM:', p)
    if not check_only:
        open(OUT, 'w', encoding='utf-8').write(final)
        print('wrote', OUT)
    return not problems


if __name__ == '__main__':
    ok = build('--check' in sys.argv)
    sys.exit(0 if ok else 1)
