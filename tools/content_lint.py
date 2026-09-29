#!/usr/bin/env python3
"""Mechanical checks on every user-facing string in content/*.json (BRIEF sections 3 to 5).

usage:
  python3 tools/content_lint.py [--quiet]

Checks: tanwin and shadda, em and en dashes, a final full stop, Eastern Arabic digits, passive forms
(يمنع، يسمح، يعاقب، يحظر with a damma), "all of the above" options, answer index range, duplicate options,
option count, missing src or confidence, unknown source ids, unknown picture ids, duplicate item ids, and
the spread of right-answer positions per bank. Exit code 1 when anything but the spread is off.
"""
import argparse, collections, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
C = ROOT / 'content'
TEXT_KEYS = {'q', 'options', 'explain', 'tip', 'notes', 'title', 'body', 'key', 'name', 'meaning', 'action', 'uae_note', 'desc',
             'subtitle', 'text'}
SKIP_KEYS = {'draw', 'src', 'id', 'sources', 'colors', 'shape', 'confidence'}
BAD = [(re.compile('[\u064b\u064c\u064d]'), 'tanwin'), (re.compile('\u0651'), 'shadda'), (re.compile('[\u2014\u2013]'), 'long dash'),
       (re.compile('[\u0660-\u0669\u06f0-\u06f9]'), 'eastern digits'), (re.compile('(كل|لا شيء) مما (سبق|ذكر)'), 'all/none of the above'),
       (re.compile('\\b(ي|ت)\u064f(منع|سمح|عاقب|حظر)'), 'passive with damma')]


def walk(o, path, out):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in SKIP_KEYS:
                continue
            walk(v, path + [k], out)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            walk(v, path + [i], out)
    elif isinstance(o, str):
        keys = [p for p in path if isinstance(p, str)]
        if keys and keys[-1] in TEXT_KEYS or (len(keys) and keys[-1] == 'options'):
            out.append(('.'.join(map(str, path)), o))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()
    probs = []
    pics = set()
    for f in ('signs.json', 'markings.json', 'figs.json'):
        d = json.loads((C / f).read_text(encoding='utf-8'))
        pics |= {x['id'] for x in d.get('signs', d.get('items', d.get('figs', [])))}
    ids = collections.Counter()
    spread = {}
    files = [p for p in sorted(C.glob('*.json')) if not p.name.startswith('sample_')]
    for p in files:
        d = json.loads(p.read_text(encoding='utf-8'))
        srcs = set((d.get('sources') or {}).keys()) if isinstance(d, dict) else set()
        strings = []
        walk(d, [], strings)
        for where, s in strings:
            for rx, what in BAD:
                if rx.search(s):
                    probs.append(f'{p.name} {where}: {what}: {s[:70]}')
            if re.search('[.\u06d4]\\s*$', s) and not re.search('\\.\\.\\.$|[A-Za-z]\\.$', s):
                probs.append(f'{p.name} {where}: ends with a full stop: {s[-50:]}')
        items = []
        if isinstance(d, dict):
            for k in ('questions', 'cards', 'signs', 'items', 'figs', 'scenarios'):
                items += [(k, x) for x in d.get(k, []) if isinstance(x, dict)]
        pos = collections.Counter()
        for k, x in items:
            if 'id' in x:
                ids[x['id']] += 1
            if k in ('questions', 'cards', 'signs', 'items', 'scenarios') and p.name != 'figs.json':
                if not x.get('src'):
                    probs.append(f"{p.name} {x.get('id')}: no src")
                elif srcs:
                    miss = [s for s in x['src'] if s not in srcs]
                    if miss:
                        probs.append(f"{p.name} {x.get('id')}: unknown src {miss}")
                if x.get('confidence') not in ('high', 'medium'):
                    probs.append(f"{p.name} {x.get('id')}: confidence {x.get('confidence')!r}")
            for fk in ('fig', 'explain_fig', 'opt_figs'):
                for fid in (x.get(fk) or []):
                    if fid and fid not in pics:
                        probs.append(f"{p.name} {x.get('id')}: unknown picture {fid} in {fk}")
            if 'options' in x and x.get('type') != 'tap':
                o, ans = x['options'], x.get('answer')
                if not isinstance(ans, int) or not 0 <= ans < len(o):
                    probs.append(f"{p.name} {x['id']}: answer {ans} out of range")
                if len(set(o)) != len(o):
                    probs.append(f"{p.name} {x['id']}: duplicate options")
                if not 2 <= len(o) <= 4:
                    probs.append(f"{p.name} {x['id']}: {len(o)} options")
                if x.get('opt_figs') and len(x['opt_figs']) != len(o):
                    probs.append(f"{p.name} {x['id']}: opt_figs length {len(x['opt_figs'])} != {len(o)}")
                if isinstance(ans, int):
                    pos[ans] += 1
        if pos:
            spread[p.name] = dict(sorted(pos.items()))
    for i, n in ids.items():
        if n > 1:
            probs.append(f'duplicate id {i} x{n}')
    for p in probs:
        print(' !', p)
    print('answer positions:')
    for k, v in spread.items():
        print(f'  {k}: {v}')
    print(f'{len(files)} files, {sum(ids.values())} items, {len(probs)} problem(s)')
    sys.exit(1 if probs else 0)


if __name__ == '__main__':
    main()
