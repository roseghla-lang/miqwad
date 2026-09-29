# -*- coding: utf-8 -*-
"""Checks content/signs.json and content/q_signbasics.json against BRIEF rules.
Usage: python3 check.py
"""
import json, re, sys, collections, pathlib

ROOT = pathlib.Path('/home/claude/miqwad/content')
ERR = []


def err(msg):
    ERR.append(msg)


HARAKAT = re.compile('[ً-ٰٟ]')        # tanwin, shadda and all other diacritics
TANWIN_SHADDA = re.compile('[ًٌٍّ]')
DASHES = re.compile('[–—ـ]')             # en dash, em dash, tatweel
INDIC = re.compile('[٠-٩۰-۹]')      # Arabic-Indic digits
ARABIC = re.compile('[؀-ۿ]')
PASSIVE = ['يمنع', 'يسمح', 'يحظر', 'يعاقب', 'يطبق', 'تطبق', 'يعتبر', 'تعتبر', 'يلزم', 'يجوز']
BANNED_OPTS = ['كل ما سبق', 'لا شيء مما سبق', 'جميع ما سبق']


def walk(o, path=''):
    if isinstance(o, dict):
        for k, v in o.items():
            yield from walk(v, path + '.' + k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk(v, path + '[%d]' % i)
    elif isinstance(o, str):
        yield path, o


def style(doc, fname, skip_keys=('url',)):
    for path, s in walk(doc):
        if path.split('.')[-1] in skip_keys:
            continue
        if TANWIN_SHADDA.search(s):
            err(f'{fname} {path}: tanwin/shadda in {s!r}')
        elif HARAKAT.search(s):
            err(f'{fname} {path}: diacritic in {s!r}')
        if DASHES.search(s):
            err(f'{fname} {path}: en/em dash or tatweel in {s!r}')
        if s.rstrip().endswith('.') or s.rstrip().endswith('۔'):
            err(f'{fname} {path}: trailing full stop in {s!r}')
        if INDIC.search(s):
            err(f'{fname} {path}: Arabic-Indic digit in {s!r}')
        if s != s.strip():
            err(f'{fname} {path}: leading/trailing whitespace in {s!r}')
        if ARABIC.search(s):
            # A verb like يمنع / يسمح read as passive when it opens a clause with no subject before it
            # ("يمنع الوقوف" = it is forbidden). "القانون يمنع" (explicit subject) is the active form the brief wants.
            for clause in re.split('[،,:؛;\n()]', s):
                words = re.findall('[؀-ۿ]+', clause)
                if not words:
                    continue
                w = words[0]
                bare = w[1:] if w[:1] in 'وف' and w[1:] in PASSIVE else w
                if bare in PASSIVE:
                    err(f'{fname} {path}: clause opens with passive-looking verb {w!r} in {s!r}')


def check_signs():
    fname = 'signs.json'
    doc = json.loads((ROOT / fname).read_text(encoding='utf-8'))
    style(doc, fname)
    srcs = set(doc['sources'])
    cats = {c['key'] for c in doc['categories']}
    prefix = {'w': 'warning', 'p': 'priority', 'r': 'prohibitory', 'm': 'mandatory', 'i': 'information',
              's': 'services', 'g': 'guide', 't': 'temporary', 'x': 'supplementary'}
    shapes = {'triangle', 'triangle-down', 'circle', 'octagon', 'diamond', 'square', 'rect', 'plate', 'other'}
    fields = ['id', 'cat', 'name', 'meaning', 'action', 'level', 'confuse', 'shape', 'colors', 'text', 'draw',
              'uae_note', 'src', 'confidence']
    ids = [s['id'] for s in doc['signs']]
    dup = [k for k, v in collections.Counter(ids).items() if v > 1]
    if dup:
        err(f'{fname}: duplicate ids {dup}')
    idset = set(ids)
    names = collections.Counter(s['name'] for s in doc['signs'])
    for n, c in names.items():
        if c > 1:
            err(f'{fname}: duplicate name {n!r}')
    used_cats = set()
    for s in doc['signs']:
        sid = s.get('id', '?')
        for f in fields:
            if f not in s:
                err(f'{fname} {sid}: missing field {f}')
        if not re.fullmatch(r'[wprmisgtx]-[a-z0-9]+(-[a-z0-9]+)*', sid):
            err(f'{fname} {sid}: bad id format')
        if prefix.get(sid[0]) != s['cat']:
            err(f'{fname} {sid}: cat {s["cat"]} does not match prefix')
        used_cats.add(s['cat'])
        if s['shape'] not in shapes:
            err(f'{fname} {sid}: bad shape {s["shape"]}')
        if not (isinstance(s['level'], int) and 1 <= s['level'] <= 5):
            err(f'{fname} {sid}: bad level')
        if s['confidence'] not in ('high', 'medium'):
            err(f'{fname} {sid}: bad confidence')
        if not (1 <= len(s['confuse']) <= 4):
            err(f'{fname} {sid}: confuse must have 1 to 4 ids')
        for c in s['confuse']:
            if c not in idset:
                err(f'{fname} {sid}: confuse id {c} not in catalog')
            if c == sid:
                err(f'{fname} {sid}: confuses with itself')
        if len(set(s['confuse'])) != len(s['confuse']):
            err(f'{fname} {sid}: duplicate confuse ids')
        if not s['src']:
            err(f'{fname} {sid}: empty src')
        for x in s['src']:
            if x not in srcs:
                err(f'{fname} {sid}: unknown src {x}')
        for f in ('name', 'meaning', 'action', 'draw', 'colors'):
            if not s[f].strip():
                err(f'{fname} {sid}: empty {f}')
        if not ARABIC.search(s['name']) or not ARABIC.search(s['meaning']) or not ARABIC.search(s['action']):
            err(f'{fname} {sid}: name/meaning/action must be Arabic')
    for c in used_cats - cats:
        err(f'{fname}: category {c} used but not defined')
    for c in cats - used_cats:
        err(f'{fname}: category {c} defined but unused')
    # references that are not symmetric are fine; report counts
    per = collections.Counter(s['cat'] for s in doc['signs'])
    conf = collections.Counter(s['confidence'] for s in doc['signs'])
    lv = collections.Counter(s['level'] for s in doc['signs'])
    print(f'{fname}: {len(ids)} signs', dict(per), dict(conf), 'levels', dict(sorted(lv.items())))
    return doc


def check_bank(name):
    fname = f'q_{name}.json'
    p = ROOT / fname
    if not p.exists():
        print(f'{fname}: missing (skipped)')
        return
    doc = json.loads(p.read_text(encoding='utf-8'))
    style(doc, fname)
    srcs = set(doc['sources'])
    topics = set('signs-basics, lights, markings, police, speed, distance, lanes, overtaking, priority, roundabouts, turning, highway, pedestrians, school-bus, emergency-vehicles, vulnerable, parking, lights-horn, weather, night, hazard, emergency, accidents, vehicle, law, penalties, driver, roadtest, yard, dubai-specific, sharjah-specific'.split(', '))
    ids = [c['id'] for c in doc['cards']] + [q['id'] for q in doc['questions']]
    dup = [k for k, v in collections.Counter(ids).items() if v > 1]
    if dup:
        err(f'{fname}: duplicate ids {dup}')
    for c in doc['cards']:
        for f in ('id', 'topic', 'level', 'title', 'body', 'src', 'confidence'):
            if f not in c:
                err(f'{fname} {c.get("id")}: missing {f}')
        if c['topic'] not in topics:
            err(f'{fname} {c["id"]}: bad topic')
        for x in c['src']:
            if x not in srcs:
                err(f'{fname} {c["id"]}: unknown src {x}')
    pos = collections.Counter()
    for q in doc['questions']:
        qid = q.get('id')
        for f in ('id', 'topic', 'level', 'exam', 'q', 'options', 'answer', 'explain', 'src', 'confidence'):
            if f not in q:
                err(f'{fname} {qid}: missing {f}')
        if q['topic'] not in topics:
            err(f'{fname} {qid}: bad topic')
        if not (1 <= q['level'] <= 5):
            err(f'{fname} {qid}: bad level')
        if not set(q['exam']) <= {'dubai', 'sharjah'} or not q['exam']:
            err(f'{fname} {qid}: bad exam list')
        if len(q['options']) != 4:
            err(f'{fname} {qid}: needs 4 options')
        if len(set(q['options'])) != len(q['options']):
            err(f'{fname} {qid}: duplicate options')
        if not (0 <= q['answer'] < len(q['options'])):
            err(f'{fname} {qid}: answer index out of range')
        pos[q['answer']] += 1
        for o in q['options']:
            for b in BANNED_OPTS:
                if b in o:
                    err(f'{fname} {qid}: banned option {o!r}')
        if not q['q'].rstrip().endswith('؟'):
            err(f'{fname} {qid}: question should end with ؟')
        if q['confidence'] not in ('high', 'medium'):
            err(f'{fname} {qid}: bad confidence')
        for x in q['src']:
            if x not in srcs:
                err(f'{fname} {qid}: unknown src {x}')
    print(f'{fname}: {len(doc["cards"])} cards, {len(doc["questions"])} questions, answer positions {dict(sorted(pos.items()))}')


if __name__ == '__main__':
    check_signs()
    check_bank('signbasics')
    if ERR:
        print('\n'.join(ERR))
        print(f'{len(ERR)} problem(s)')
        sys.exit(1)
    print('OK: no problems')
