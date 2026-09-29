# -*- coding: utf-8 -*-
"""Validate content/q_rules.json against BRIEF rules."""
import json, re, sys, collections

P = '/home/claude/miqwad/content/q_rules.json'
bank = json.load(open(P, encoding='utf-8'))  # JSON validity

TOPICS = ["speed", "distance", "lanes", "overtaking", "priority", "roundabouts", "turning", "highway",
          "pedestrians", "school-bus", "emergency-vehicles", "vulnerable", "parking", "lights-horn"]
errors, warns = [], []

FORBIDDEN = {'ً': 'tanwin fath', 'ٌ': 'tanwin damm', 'ٍ': 'tanwin kasr', 'ّ': 'shadda',
             '—': 'em dash', '–': 'en dash'}
OTHER_HARAKAT = re.compile('[َ-ِْٰ]')   # fatha damma kasra sukun dagger alef
PASSIVE = re.compile(r'(^|\s)(يُ|تُ)?(يمنع|يسمح|يعاقب|يحظر|يُمنع|يُسمح|يُعاقب|يُحظر)')
BANNED_OPTS = ['كل ما سبق', 'لا شيء مما سبق', 'جميع ما سبق', 'جميع ما ذكر']
LATIN = re.compile('[A-Za-z]')


def texts_of(obj, path=''):
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from texts_of(v, '%s[%d]' % (path, i))
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from texts_of(v, '%s.%s' % (path, k))


def check_text(owner, field, s):
    for ch, name in FORBIDDEN.items():
        if ch in s:
            errors.append('%s %s contains %s: %s' % (owner, field, name, s))
    if OTHER_HARAKAT.search(s):
        warns.append('%s %s has harakat: %s' % (owner, field, s))
    st = s.rstrip()
    if st.endswith('.') or st.endswith('۔'):
        errors.append('%s %s ends with full stop: %s' % (owner, field, s))
    if st != s or s != s.lstrip():
        errors.append('%s %s has leading/trailing spaces' % (owner, field))
    if '  ' in s:
        warns.append('%s %s has double space' % (owner, field))
    if PASSIVE.search(s):
        # only active forms with an explicit subject are fine; list them for manual review
        warns.append('REVIEW passive-like root in %s %s: %s' % (owner, field, s))


# --- sources
src_ids = set(bank['sources'])
for sid, s in bank['sources'].items():
    for k in ('title', 'url', 'publisher', 'date'):
        if not s.get(k):
            errors.append('source %s missing %s' % (sid, k))
    if not s['url'].startswith('https://'):
        errors.append('source %s url not https' % sid)

# --- ids
ids = [c['id'] for c in bank['cards']] + [q['id'] for q in bank['questions']]
dups = [k for k, v in collections.Counter(ids).items() if v > 1]
if dups:
    errors.append('duplicate ids: %s' % dups)

used_src = set()
# --- cards
for c in bank['cards']:
    own = c['id']
    if not re.fullmatch(r'rules-card-\d{3}', own):
        errors.append('bad card id %s' % own)
    if c['topic'] not in TOPICS:
        errors.append('%s bad topic %s' % (own, c['topic']))
    if c['level'] not in (1, 2, 3, 4, 5):
        errors.append('%s bad level' % own)
    if c['confidence'] not in ('high', 'medium'):
        errors.append('%s bad confidence' % own)
    for s in c['src']:
        used_src.add(s)
        if s not in src_ids:
            errors.append('%s unknown src %s' % (own, s))
    for f in ('title', 'body', 'key'):
        if f in c:
            check_text(own, f, c[f])
            if LATIN.search(c[f]) and not re.search(r'\b[PDNR]\b', c[f]):
                warns.append('%s %s has Latin letters: %s' % (own, f, c[f]))

# --- questions
pos_counter = collections.Counter()
per_topic = collections.defaultdict(collections.Counter)
for q in bank['questions']:
    own = q['id']
    if not re.fullmatch(r'rules-%s-\d{3}' % re.escape(q['topic']), own):
        errors.append('bad question id %s' % own)
    if q['topic'] not in TOPICS:
        errors.append('%s bad topic' % own)
    if q['level'] not in (1, 2, 3, 4, 5):
        errors.append('%s bad level' % own)
    if not q['exam'] or any(e not in ('dubai', 'sharjah') for e in q['exam']):
        errors.append('%s bad exam %s' % (own, q['exam']))
    if len(q['options']) != 4:
        errors.append('%s has %d options' % (own, len(q['options'])))
    if len(set(q['options'])) != len(q['options']):
        errors.append('%s duplicate options' % own)
    if not isinstance(q['answer'], int) or not 0 <= q['answer'] < len(q['options']):
        errors.append('%s answer out of range' % own)
    if q['confidence'] not in ('high', 'medium'):
        errors.append('%s bad confidence' % own)
    for s in q['src']:
        used_src.add(s)
        if s not in src_ids:
            errors.append('%s unknown src %s' % (own, s))
    if not q['q'].endswith('؟'):
        warns.append('%s question does not end with ؟' % own)
    check_text(own, 'q', q['q'])
    for i, o in enumerate(q['options']):
        check_text(own, 'option%d' % i, o)
        if any(b in o for b in BANNED_OPTS):
            errors.append('%s banned option text' % own)
        if LATIN.search(o) and not re.fullmatch(r'[^A-Za-z]*\b[PDNR]\b', o):
            warns.append('%s option has Latin letters: %s' % (own, o))
    for f in ('explain', 'tip', 'notes'):
        if q.get(f):
            check_text(own, f, q[f])
    # explain length: 1 to 3 short sentences (split by Arabic comma / line break)
    if len(q['explain']) > 240:
        warns.append('%s explain long (%d chars)' % (own, len(q['explain'])))
    pos_counter[q['answer']] += 1
    per_topic[q['topic']][q['level']] += 1

unused = src_ids - used_src
if unused:
    warns.append('sources never cited: %s' % sorted(unused))

# --- coverage
print('questions:', len(bank['questions']), ' cards:', len(bank['cards']), ' sources:', len(src_ids))
print('answer positions:', dict(sorted(pos_counter.items())))
cards_per_topic = collections.Counter(c['topic'] for c in bank['cards'])
print('%-20s %4s %4s  %s' % ('topic', 'q', 'cards', 'levels 1..5'))
for t in TOPICS:
    lv = per_topic[t]
    tot = sum(lv.values())
    print('%-20s %4d %4d  %s' % (t, tot, cards_per_topic[t], [lv.get(i, 0) for i in range(1, 6)]))
    for L in (1, 2, 3, 4):
        if lv.get(L, 0) == 0:
            errors.append('topic %s has no level %d question' % (t, L))
    if t in ('roundabouts', 'priority', 'lanes', 'emergency-vehicles') and tot < 15:
        errors.append('topic %s needs 15+ questions (has %d)' % (t, tot))
    if not 5 <= cards_per_topic[t] <= 15:
        errors.append('topic %s has %d cards (want 5 to 15)' % (t, cards_per_topic[t]))
lvl_all = collections.Counter(q['level'] for q in bank['questions'])
print('levels overall:', dict(sorted(lvl_all.items())))
conf_all = collections.Counter(q['confidence'] for q in bank['questions'])
print('confidence:', dict(conf_all), ' cards:', dict(collections.Counter(c['confidence'] for c in bank['cards'])))
print('dubai-only:', [q['id'] for q in bank['questions'] if q['exam'] == ['dubai']])
mx = max(pos_counter.values()); mn = min(pos_counter.values())
if mx - mn > max(3, len(bank['questions']) // 20):
    errors.append('answer positions unbalanced %s' % dict(pos_counter))

print('\nWARNINGS (%d):' % len(warns))
for w in warns:
    print('  -', w)
print('\nERRORS (%d):' % len(errors))
for e in errors:
    print('  !', e)
sys.exit(1 if errors else 0)
