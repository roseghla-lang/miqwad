#!/usr/bin/env python3
"""Checker for content/markings.json and content/q_markings.json (agent: markings)."""
import json, re, sys, collections

ROOT = '/home/claude/miqwad/content/'
FORBIDDEN = {'ً': 'tanwin fath', 'ٌ': 'tanwin damm', 'ٍ': 'tanwin kasr',
             'ّ': 'shadda', '—': 'em dash', '–': 'en dash'}
BANNED_OPTS = ['كل ما سبق', 'لا شيء مما سبق']
PASSIVE_HINTS = ['يتم ', ' تم ', 'يُ', 'تُ']
ARABIC = re.compile(r'[؀-ۿ]')
errors, warns = [], []


def walk(obj, path=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, f'{path}.{k}')
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, f'{path}[{i}]')
    elif isinstance(obj, str):
        yield path, obj


def style(obj, fname):
    for path, s in walk(obj):
        for ch, name in FORBIDDEN.items():
            if ch in s:
                errors.append(f'{fname}{path}: contains {name}: {s[:60]}')
        t = s.rstrip()
        if t.endswith('.') or t.endswith('۔'):
            errors.append(f'{fname}{path}: ends with full stop: ...{t[-40:]}')
        if ARABIC.search(s):
            for h in PASSIVE_HINTS:
                if h in s:
                    warns.append(f'{fname}{path}: passive hint {h!r}: {s[:70]}')
        for b in BANNED_OPTS:
            if b in s:
                errors.append(f'{fname}{path}: banned option text {b}')


def check_markings():
    d = json.load(open(ROOT + 'markings.json', encoding='utf-8'))
    style(d, 'markings')
    cats = {c['key'] for c in d['categories']}
    srcs = set(d['sources'])
    ids = [it['id'] for it in d['items']]
    dup = [k for k, v in collections.Counter(ids).items() if v > 1]
    if dup:
        errors.append(f'markings: duplicate ids {dup}')
    idset = set(ids)
    prefix = {'line': 'mk-', 'transverse': 'mk-', 'crossing': 'mk-', 'arrow': 'mk-', 'area': 'mk-',
              'device': 'mk-', 'parking': 'mk-', 'text': 'mk-', 'kerb': 'kb-', 'light': 'tl-',
              'lane-signal': 'ls-', 'ped-light': 'pl-', 'police': 'po-', 'emergency': 'ev-'}
    need = ['id', 'cat', 'name', 'meaning', 'action', 'level', 'confuse', 'draw', 'colors', 'text',
            'uae_note', 'src', 'confidence', 'notes']
    used_src = set()
    for it in d['items']:
        for k in need:
            if k not in it:
                errors.append(f'markings {it.get("id")}: missing field {k}')
        if it['cat'] not in cats:
            errors.append(f'markings {it["id"]}: unknown cat {it["cat"]}')
        elif not it['id'].startswith(prefix[it['cat']]):
            errors.append(f'markings {it["id"]}: prefix does not match cat {it["cat"]}')
        for c in it['confuse']:
            if c not in idset:
                errors.append(f'markings {it["id"]}: confuse id {c} missing')
            if c == it['id']:
                errors.append(f'markings {it["id"]}: confuses itself')
        for s in it['src']:
            used_src.add(s)
            if s not in srcs:
                errors.append(f'markings {it["id"]}: src {s} not in sources')
        if it['level'] not in (1, 2, 3, 4, 5):
            errors.append(f'markings {it["id"]}: bad level')
        if it['confidence'] not in ('high', 'medium'):
            errors.append(f'markings {it["id"]}: bad confidence')
        if not it['src']:
            errors.append(f'markings {it["id"]}: no src')
    unused = srcs - used_src
    if unused:
        warns.append(f'markings: unused sources {sorted(unused)}')
    empty_cats = cats - {it['cat'] for it in d['items']}
    if empty_cats:
        errors.append(f'markings: empty categories {empty_cats}')
    per = collections.Counter(it['cat'] for it in d['items'])
    conf = collections.Counter(it['confidence'] for it in d['items'])
    print('markings.json items:', len(ids), dict(per), dict(conf))
    return idset


def check_bank():
    try:
        d = json.load(open(ROOT + 'q_markings.json', encoding='utf-8'))
    except FileNotFoundError:
        print('q_markings.json not found yet')
        return
    style(d, 'q_markings')
    if d.get('module') != 'markings':
        errors.append('q_markings: module must be markings')
    srcs = set(d['sources'])
    topics = {'markings', 'lights', 'police'}
    used_src = set()
    ids = [c['id'] for c in d['cards']] + [q['id'] for q in d['questions']]
    dup = [k for k, v in collections.Counter(ids).items() if v > 1]
    if dup:
        errors.append(f'q_markings: duplicate ids {dup}')
    for c in d['cards']:
        for k in ['id', 'topic', 'level', 'title', 'body', 'src', 'confidence']:
            if k not in c:
                errors.append(f'card {c.get("id")}: missing {k}')
        if c['topic'] not in topics:
            errors.append(f'card {c["id"]}: topic {c["topic"]}')
        if not c['id'].startswith('markings-card-'):
            errors.append(f'card {c["id"]}: id pattern')
        for s in c['src']:
            used_src.add(s)
            if s not in srcs:
                errors.append(f'card {c["id"]}: src {s} missing')
    pos = collections.Counter()
    lv = collections.defaultdict(collections.Counter)
    for q in d['questions']:
        for k in ['id', 'topic', 'level', 'exam', 'q', 'options', 'answer', 'explain', 'src', 'confidence']:
            if k not in q:
                errors.append(f'q {q.get("id")}: missing {k}')
        if q['topic'] not in topics:
            errors.append(f'q {q["id"]}: topic {q["topic"]}')
        if not q['id'].startswith('markings-' + q['topic'] + '-'):
            errors.append(f'q {q["id"]}: id does not match topic')
        if not (0 <= q['answer'] < len(q['options'])):
            errors.append(f'q {q["id"]}: answer out of range')
        if len(q['options']) < 3:
            errors.append(f'q {q["id"]}: fewer than 3 options')
        if len(set(q['options'])) != len(q['options']):
            errors.append(f'q {q["id"]}: duplicate options')
        if not q['q'].rstrip().endswith('؟'):
            warns.append(f'q {q["id"]}: question does not end with ؟')
        if not set(q['exam']) <= {'dubai', 'sharjah'} or not q['exam']:
            errors.append(f'q {q["id"]}: bad exam {q["exam"]}')
        if q['confidence'] not in ('high', 'medium'):
            errors.append(f'q {q["id"]}: bad confidence')
        for s in q['src']:
            used_src.add(s)
            if s not in srcs:
                errors.append(f'q {q["id"]}: src {s} missing')
        pos[q['answer']] += 1
        lv[q['topic']][q['level']] += 1
    unused = srcs - used_src
    if unused:
        warns.append(f'q_markings: unused sources {sorted(unused)}')
    tc = collections.Counter(q['topic'] for q in d['questions'])
    cc = collections.Counter(c['topic'] for c in d['cards'])
    print('q_markings cards:', len(d['cards']), dict(cc))
    print('q_markings questions:', len(d['questions']), dict(tc))
    print('answer positions:', dict(sorted(pos.items())))
    for t, c in lv.items():
        print('  levels', t, dict(sorted(c.items())))


check_markings()
check_bank()
for w in warns:
    print('WARN', w)
for e in errors:
    print('ERROR', e)
print('errors:', len(errors), 'warnings:', len(warns))
sys.exit(1 if errors else 0)
