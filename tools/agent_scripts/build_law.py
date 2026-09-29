import json, random, re, sys, collections, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from law_sources import SOURCES
from law_cards import CARDS
from law_q1 import Q_LAW, Q_PEN
from law_q2 import Q_ACC, Q_DXB, Q_SHJ

from law_overrides import OVR

OUT = pathlib.Path('/home/claude/miqwad/content/q_law.json')
EXAM = {'dubai-specific': ['dubai'], 'sharjah-specific': ['sharjah']}


def fmt(s):
    # 4-digit numbers without a thousands comma (5000), 5+ digits keep it (50,000)
    return re.sub(r'(?<![\d,])(\d),(\d{3})(?![\d,])', r'\1\2', s) if isinstance(s, str) else s


cards = []
for i, (topic, lv, title, body, key, src, conf) in enumerate(CARDS, 1):
    title, body, key = fmt(title), fmt(body), fmt(key)
    c = {"id": "law-card-%03d" % i, "topic": topic, "level": lv, "title": title, "body": body}
    if key:
        c["key"] = key
    c["src"] = src
    c["confidence"] = conf
    cards.append(c)

allq = Q_LAW + Q_PEN + Q_ACC + Q_DXB + Q_SHJ
used_ovr = set()
for item in allq:
    if item['q'] in OVR:
        c, w = OVR[item['q']]
        if c:
            item['c'] = c
        if w:
            item['w'] = w
        used_ovr.add(item['q'])
    for k in ('q', 'c', 'ex', 'tip', 'notes'):
        if item.get(k):
            item[k] = fmt(item[k])
    item['w'] = [fmt(x) for x in item['w']]
missing = set(OVR) - used_ovr
if missing:
    sys.exit('override keys not matched: %s' % missing)
rng = random.Random(20260929)
# balanced target positions for the correct answer
pos = [i % 4 for i in range(len(allq))]
rng.shuffle(pos)
# avoid long runs of the same position (max 2 in a row)
for _ in range(2000):
    bad = [i for i in range(2, len(pos)) if pos[i] == pos[i - 1] == pos[i - 2]]
    if not bad:
        break
    i = bad[0]
    j = rng.randrange(len(pos))
    pos[i], pos[j] = pos[j], pos[i]

counters = collections.Counter()
questions = []
for n, item in enumerate(allq):
    t = item['t']
    counters[t] += 1
    wrong = list(item['w'])
    rng.shuffle(wrong)
    p = pos[n]
    opts = wrong[:p] + [item['c']] + wrong[p:]
    q = {"id": "law-%s-%03d" % (t, counters[t]), "topic": t, "level": item['lv'],
         "exam": EXAM.get(t, ["dubai", "sharjah"]), "q": item['q'], "options": opts, "answer": p,
         "explain": item['ex']}
    if item.get('tip'):
        q["tip"] = item['tip']
    q["src"] = item['src']
    q["confidence"] = item['conf']
    q["notes"] = item.get('notes', "")
    questions.append(q)

bank = {"module": "law", "updated": "2026-09-29", "sources": SOURCES, "cards": cards, "questions": questions}
OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1) + "\n", encoding='utf-8')
print("wrote", OUT, len(cards), "cards", len(questions), "questions")
