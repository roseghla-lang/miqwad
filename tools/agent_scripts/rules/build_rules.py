# -*- coding: utf-8 -*-
"""Build /home/claude/miqwad/content/q_rules.json from the data_* modules (deterministic)."""
import json, random, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from data_meta import SOURCES, CARDS
from data_q1 import QUESTIONS_1
from data_q2 import QUESTIONS_2
from data_q3 import QUESTIONS_3

OUT = pathlib.Path('/home/claude/miqwad/content/q_rules.json')
TOPIC_ORDER = ["roundabouts", "priority", "lanes", "emergency-vehicles", "overtaking", "speed", "distance",
               "turning", "highway", "pedestrians", "school-bus", "vulnerable", "parking", "lights-horn"]

questions_raw = QUESTIONS_1 + QUESTIONS_2 + QUESTIONS_3

# balanced answer positions: exact quota per position, shuffled with a fixed seed
rng = random.Random(20260929)
n = len(questions_raw)
positions = [i % 4 for i in range(n)]
rng.shuffle(positions)

counters = {}
questions = []
for item, pos in zip(questions_raw, positions):
    t = item["topic"]
    counters[t] = counters.get(t, 0) + 1
    qid = "rules-%s-%03d" % (t, counters[t])
    distractors = list(item["d"])
    rng.shuffle(distractors)
    options = distractors[:pos] + [item["c"]] + distractors[pos:]
    assert options[pos] == item["c"] and len(options) == 4
    q = {
        "id": qid, "topic": t, "level": item["level"], "exam": item["exam"],
        "q": item["q"], "options": options, "answer": pos,
        "explain": item["explain"],
    }
    if item["tip"]:
        q["tip"] = item["tip"]
    q["src"] = item["src"]
    q["confidence"] = item["confidence"]
    q["notes"] = item["notes"]
    questions.append(q)

# keep file ordered by topic (stable inside topic)
questions.sort(key=lambda q: (TOPIC_ORDER.index(q["topic"]), q["id"]))

cards = []
for i, (topic, level, title, body, key, src, conf) in enumerate(CARDS, 1):
    c = {"id": "rules-card-%03d" % i, "topic": topic, "level": level, "title": title, "body": body}
    if key:
        c["key"] = key
    c["src"] = src
    c["confidence"] = conf
    cards.append(c)

used = sorted({s for q in questions for s in q["src"]} | {s for c in cards for s in c["src"]},
              key=lambda s: int(s[1:]))
bank = {
    "module": "rules",
    "updated": "2026-09-29",
    "sources": {s: SOURCES[s] for s in used},
    "cards": cards,
    "questions": questions,
}
OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("wrote", OUT, "questions:", len(questions), "cards:", len(cards), "sources:", len(used))
