#!/usr/bin/env python3
import json, re, collections, sys

ROOT = '/home/claude/miqwad/content/'
SKIP_KEYS = {"sources", "id", "src", "exam", "for", "topic", "confidence", "kind", "emirate", "updated", "module"}
BAD_CHARS = {'ً': 'tanwin fath', 'ٌ': 'tanwin damm', 'ٍ': 'tanwin kasr', 'ّ': 'shadda',
             '—': 'em dash', '–': 'en dash'}
OTHER_HARAKAT = {'َ', 'ُ', 'ِ', 'ْ', 'ٰ'}
PASSIVE_HINTS = ['يُ', 'يمنع', 'يسمح', 'يعاقب', 'يحظر', 'يتم ', 'يعتبر', 'يحسب', 'تعتبر', 'تحسب']
problems = []


def walk(obj, path, out):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in SKIP_KEYS:
                continue
            walk(v, f"{path}.{k}", out)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk(v, f"{path}[{i}]", out)
    elif isinstance(obj, str):
        out.append((path, obj))


def check_strings(name, data):
    strings = []
    walk(data, name, strings)
    latin = collections.Counter()
    for path, s in strings:
        for ch, label in BAD_CHARS.items():
            if ch in s:
                problems.append(f"{path}: contains {label}: {s[:60]}")
        if any(ch in OTHER_HARAKAT for ch in s):
            problems.append(f"{path}: contains a haraka: {s[:60]}")
        st = s.rstrip()
        if st.endswith('.') or st.endswith('۔'):
            problems.append(f"{path}: ends with a full stop: {s[-40:]}")
        for line in s.split('\n'):
            if line.rstrip().endswith('.'):
                problems.append(f"{path}: a line ends with a full stop")
        if 'كل ما سبق' in s or 'لا شيء مما سبق' in s:
            problems.append(f"{path}: forbidden option wording")
        for w in PASSIVE_HINTS:
            if w in s:
                print(f"  review passive-ish '{w}' at {path}: {s[:70]}")
        for m in re.findall(r'[A-Za-z]+', s):
            latin[m] += 1
        if re.search(r'[٠-٩]', s):
            problems.append(f"{path}: Arabic-Indic digits: {s[:60]}")
    return len(strings), latin


exams = json.load(open(ROOT + 'exams.json'))
bank = json.load(open(ROOT + 'q_roadtest.json'))
n1, lat1 = check_strings('exams', exams)
n2, lat2 = check_strings('bank', bank)
print(f"user-facing strings checked: exams {n1}, bank {n2}")
print("Latin tokens in user-facing strings:", dict(lat1 + lat2))

# ---- source references
def src_refs(obj, acc, path=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == 'src':
                for s in v:
                    acc.append((path, s))
            elif k != 'sources':
                src_refs(v, acc, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            src_refs(v, acc, f"{path}[{i}]")
    return acc

for name, data in (('exams', exams), ('bank', bank)):
    refs = src_refs(data, [])
    for p, s in refs:
        if s not in data['sources']:
            problems.append(f"{name}{p}: unknown source {s}")
    unused = set(data['sources']) - {s for _, s in refs}
    if unused:
        problems.append(f"{name}: unused sources {sorted(unused)}")
    for sid, sv in data['sources'].items():
        for k in ('title', 'url', 'publisher', 'date'):
            if not sv.get(k):
                problems.append(f"{name}.sources.{sid}: missing {k}")
        if '–' in json.dumps(sv, ensure_ascii=False) or '—' in json.dumps(sv, ensure_ascii=False):
            problems.append(f"{name}.sources.{sid}: dash in source entry")

# ---- confidence values
def conf_vals(obj, path=''):
    if isinstance(obj, dict):
        if 'src' in obj and 'confidence' not in obj and path.count('.') > 0:
            print(f"  note: item with src but no confidence at {path}")
        for k, v in obj.items():
            if k == 'confidence' and v not in ('high', 'medium'):
                problems.append(f"{path}.{k}: bad confidence {v}")
            elif k != 'sources':
                conf_vals(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            conf_vals(v, f"{path}[{i}]")
conf_vals(exams, 'exams'); conf_vals(bank, 'bank')

# ---- exams structure
for em in ('dubai', 'sharjah'):
    e = exams['emirates'][em]
    for k in ('name', 'authority', 'process', 'theory', 'yard', 'road', 'specific'):
        if k not in e:
            problems.append(f"exams.{em}: missing {k}")
    steps = [p['step'] for p in e['process']]
    if steps != list(range(1, len(steps) + 1)):
        problems.append(f"exams.{em}.process: step numbering {steps}")
    t = e['theory']
    if sum(s['count'] for s in t['sections']) != t['questions']:
        problems.append(f"exams.{em}.theory: sections do not add up to questions")
    if not (0 < t['pass'] <= t['questions']):
        problems.append(f"exams.{em}.theory: bad pass")
YARD_IDS = {'parallel', 'reverse-bay', 'forward-bay', 'angle', 'hill-start', 'emergency-stop', 'three-point-turn',
            'slalom', 's-curve', 'pre-drive-check'}
for g in exams['yard_guides']:
    if g['id'] not in YARD_IDS:
        problems.append(f"yard_guides: unknown id {g['id']}")
for em in ('dubai', 'sharjah'):
    for c in exams['emirates'][em]['yard']['components']:
        if c['id'] not in YARD_IDS:
            problems.append(f"{em}.yard: unknown id {c['id']}")
for p in exams['presets']:
    s = round(sum(p['mix'].values()), 6)
    if s != 1:
        problems.append(f"preset {p['id']}: mix sums to {s}")
    if p['pass'] > p['questions'] or p['hazard'] > p['questions']:
        problems.append(f"preset {p['id']}: numbers inconsistent")
    em = exams['emirates'][p['id']]['theory']
    if (em['questions'], em['minutes'], em['pass']) != (p['questions'], p['minutes'], p['pass']):
        problems.append(f"preset {p['id']}: differs from theory block")
    if abs(p['pass_ratio'] - p['pass'] / p['questions']) > 0.005:
        problems.append(f"preset {p['id']}: pass_ratio mismatch")

# ---- bank structure
ids = [c['id'] for c in bank['cards']] + [q['id'] for q in bank['questions']]
dups = [i for i, n in collections.Counter(ids).items() if n > 1]
if dups:
    problems.append(f"bank: duplicate ids {dups}")
lvl_q = collections.Counter(); lvl_c = collections.Counter(); ans = collections.Counter(); topics = collections.Counter()
examc = collections.Counter()
for q in bank['questions']:
    if len(q['options']) != 4 or len(set(q['options'])) != 4:
        problems.append(f"{q['id']}: options not 4 unique")
    if not (0 <= q['answer'] < len(q['options'])):
        problems.append(f"{q['id']}: answer out of range")
    if q['topic'] not in ('roadtest', 'yard') or q['level'] not in (1, 2, 3, 4, 5):
        problems.append(f"{q['id']}: bad topic/level")
    if not set(q['exam']) <= {'dubai', 'sharjah'} or not q['exam']:
        problems.append(f"{q['id']}: bad exam")
    if not q['q'].endswith('؟'):
        problems.append(f"{q['id']}: question does not end with ؟")
    if not q['id'].startswith(f"roadtest-{q['topic']}-"):
        problems.append(f"{q['id']}: id pattern")
    lvl_q[(q['topic'], q['level'])] += 1; ans[q['answer']] += 1; topics[q['topic']] += 1
    examc[tuple(q['exam'])] += 1
    # length sanity: correct option not always the longest
for c in bank['cards']:
    lvl_c[(c['topic'], c['level'])] += 1
    if not c['id'].startswith('roadtest-card-'):
        problems.append(f"{c['id']}: id pattern")
longest = sum(1 for q in bank['questions'] if max(q['options'], key=len) == q['options'][q['answer']])
print("questions by topic:", dict(topics), "| cards:", len(bank['cards']))
print("question levels:", sorted(lvl_q.items()))
print("card levels:", sorted(lvl_c.items()))
print("answer positions:", dict(sorted(ans.items())))
print("exam tags:", dict(examc))
print(f"correct option is the longest in {longest}/{len(bank['questions'])} questions")
print()
print("PROBLEMS:" if problems else "No problems found")
for p in problems:
    print(" -", p)
sys.exit(1 if problems else 0)
