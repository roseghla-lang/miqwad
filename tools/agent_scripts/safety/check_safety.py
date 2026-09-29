#!/usr/bin/env python3
# Validator for content/q_safety.json: structure + Arabic style rules
import json, re, sys, collections

PATH = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/miqwad/content/q_safety.json"
bank = json.load(open(PATH, encoding="utf-8"))
errors, warns = [], []

TOPICS = {"weather", "night", "hazard", "emergency", "vehicle", "driver"}
ALL_TOPICS = set("signs-basics lights markings police speed distance lanes overtaking priority roundabouts turning highway pedestrians school-bus emergency-vehicles vulnerable parking lights-horn weather night hazard emergency accidents vehicle law penalties driver roadtest yard dubai-specific sharjah-specific".split())
BANNED_CHARS = {"ً": "tanwin fath", "ٌ": "tanwin damm", "ٍ": "tanwin kasr", "ّ": "shadda",
                "—": "em dash", "–": "en dash"}
PASSIVE = re.compile(r"(يُمنع|يُسمح|يُعاقب|يُحظر|يُنصح|يُفضل|يُستخدم|يُعتبر|يُعد)")
MAYBE_PASSIVE = re.compile(r"(^|\s)(يمنع|يسمح|يحظر|ينصح|يفضل|يستخدم|يعتبر|يتم)(\s|$)")
FORBIDDEN_PHRASES = ["كل ما سبق", "لا شيء مما سبق", "جميع ما سبق"]

def walk_strings(obj, path=""):
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk_strings(v, "%s[%d]" % (path, i))
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk_strings(v, "%s.%s" % (path, k) if path else k)

# --- style checks on every user-facing string (cards + questions), and banned chars in sources too
for path, s in walk_strings(bank):
    for ch, name in BANNED_CHARS.items():
        if ch in s:
            errors.append("%s contains %s: %r" % (path, name, s[:80]))
for section in ("cards", "questions"):
    for item in bank[section]:
        for key in ("q", "explain", "tip", "notes", "title", "body", "key"):
            if key in item and isinstance(item[key], str):
                s = item[key]
                if s.rstrip() != s or s.lstrip() != s:
                    errors.append("%s.%s has leading/trailing whitespace" % (item["id"], key))
                if s.rstrip().endswith((".", "۔", "…")):
                    errors.append("%s.%s ends with a full stop: %r" % (item["id"], key, s[-30:]))
                if PASSIVE.search(s):
                    errors.append("%s.%s passive form: %s" % (item["id"], key, PASSIVE.search(s).group(0)))
                m = MAYBE_PASSIVE.search(s)
                if m:
                    warns.append("%s.%s check voice of '%s': %s" % (item["id"], key, m.group(2), s[:90]))
                for ph in FORBIDDEN_PHRASES:
                    if ph in s:
                        errors.append("%s.%s forbidden phrase %s" % (item["id"], key, ph))
                for line in s.split("\n"):
                    if line.strip().endswith((".", "۔")):
                        errors.append("%s.%s line ends with full stop: %r" % (item["id"], key, line[-30:]))
        for i, o in enumerate(item.get("options", [])):
            if o.rstrip().endswith((".", "۔")):
                errors.append("%s option %d ends with full stop" % (item["id"], i))
            for ph in FORBIDDEN_PHRASES:
                if ph in o:
                    errors.append("%s option %d forbidden phrase" % (item["id"], i))

# --- structure
ids = [x["id"] for x in bank["cards"] + bank["questions"]]
dup = [k for k, v in collections.Counter(ids).items() if v > 1]
if dup:
    errors.append("duplicate ids: %s" % dup)
srcs = set(bank["sources"])
for x in bank["cards"] + bank["questions"]:
    if x["topic"] not in ALL_TOPICS:
        errors.append("%s bad topic %s" % (x["id"], x["topic"]))
    if x["topic"] not in TOPICS:
        warns.append("%s topic outside my set: %s" % (x["id"], x["topic"]))
    if x["level"] not in (1, 2, 3, 4, 5):
        errors.append("%s bad level" % x["id"])
    if x["confidence"] not in ("high", "medium"):
        errors.append("%s bad confidence" % x["id"])
    if not x["src"] or any(s not in srcs for s in x["src"]):
        errors.append("%s bad src %s" % (x["id"], x["src"]))
for c in bank["cards"]:
    if not re.fullmatch(r"safety-card-\d{3}", c["id"]):
        errors.append("bad card id %s" % c["id"])
    for k in ("title", "body"):
        if not c.get(k):
            errors.append("%s missing %s" % (c["id"], k))
for qq in bank["questions"]:
    if not re.fullmatch(r"safety-(%s)-\d{3}" % "|".join(TOPICS), qq["id"]):
        errors.append("bad question id %s" % qq["id"])
    if not qq["id"].startswith("safety-%s-" % qq["topic"]):
        errors.append("%s id/topic mismatch" % qq["id"])
    opts = qq["options"]
    if len(opts) != 4:
        errors.append("%s has %d options" % (qq["id"], len(opts)))
    if len(set(opts)) != len(opts):
        errors.append("%s duplicate options" % qq["id"])
    if not isinstance(qq["answer"], int) or not 0 <= qq["answer"] < len(opts):
        errors.append("%s answer out of range" % qq["id"])
    if not qq["q"].endswith("؟"):
        warns.append("%s question does not end with ؟" % qq["id"])
    if not set(qq["exam"]) <= {"dubai", "sharjah"} or not qq["exam"]:
        errors.append("%s bad exam" % qq["id"])
    if not qq.get("explain"):
        errors.append("%s missing explain" % qq["id"])
    # longest-option giveaway heuristic
    lens = [len(o) for o in opts]
    if lens[qq["answer"]] == max(lens) and max(lens) > 1.3 * sorted(lens)[-2]:
        warns.append("%s correct option much longer than others (%s)" % (qq["id"], lens))

# --- coverage + distribution
by_topic = collections.defaultdict(lambda: collections.Counter())
pos = collections.Counter()
pos_topic = collections.defaultdict(collections.Counter)
for qq in bank["questions"]:
    by_topic[qq["topic"]][qq["level"]] += 1
    pos[qq["answer"]] += 1
    pos_topic[qq["topic"]][qq["answer"]] += 1
cards_topic = collections.Counter(c["topic"] for c in bank["cards"])
for t in sorted(TOPICS):
    for lv in (1, 2, 3, 4):
        if by_topic[t][lv] == 0:
            errors.append("topic %s has no level %d question" % (t, lv))
    if not 5 <= cards_topic[t] <= 15:
        warns.append("topic %s has %d cards (want 5-15)" % (t, cards_topic[t]))

print("questions:", len(bank["questions"]), " cards:", len(bank["cards"]), " sources:", len(bank["sources"]))
print("per topic (levels 1..5) | cards | answer positions 0..3")
for t in sorted(TOPICS):
    lv = [by_topic[t][i] for i in range(1, 6)]
    ap = [pos_topic[t][i] for i in range(4)]
    print("  %-10s total=%3d levels=%s cards=%2d pos=%s" % (t, sum(lv), lv, cards_topic[t], ap))
print("answer positions overall:", [pos[i] for i in range(4)])
situ = [qq for qq in bank["questions"] if qq["topic"] == "hazard"]
print("hazard questions:", len(situ))
conf = collections.Counter(x["confidence"] for x in bank["cards"] + bank["questions"])
print("confidence:", dict(conf))
exams = collections.Counter(tuple(x["exam"]) for x in bank["questions"])
print("exam tags:", dict(exams))
print("WARNINGS (%d):" % len(warns))
for w in warns:
    print("  -", w)
print("ERRORS (%d):" % len(errors))
for e in errors:
    print("  !", e)
sys.exit(1 if errors else 0)
