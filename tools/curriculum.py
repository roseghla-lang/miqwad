#!/usr/bin/env python3
"""Check content/curriculum.json against the content: pool sizes per lesson and what the path never uses.

usage:
  python3 tools/curriculum.py [--emirate dubai|sharjah] [--quiet]

Resolves every filter the way src/app.js does (docs/app.md section 7) and prints, per lesson, the learn
counts (cards, signs, markings) and the practice pool. Problems: unknown ids, duplicate lesson ids, a
lesson with nothing to learn or practise, a practice pool smaller than its count, a yard lesson with an
unknown exercise, a challenge pointing at unknown lessons. Then lists the cards, questions, signs,
markings and scenarios that no lesson reaches. Exit code 1 when there are problems.
"""
import argparse, glob, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
C = ROOT / 'content'


def load():
    cards, qs, sc = {}, {}, {}
    for f in sorted(C.glob('q_*.json')):
        d = json.loads(f.read_text(encoding='utf-8'))
        bank = f.stem[2:]
        for c in d.get('cards', []):
            cards[c['id']] = dict(c, _bank=bank)
        for q in d.get('questions', []):
            qs[q['id']] = dict(q, _bank=bank)
    for f in sorted(C.glob('scenarios_*.json')):
        d = json.loads(f.read_text(encoding='utf-8'))
        for s in (d.get('scenarios', d) if isinstance(d, dict) else d):
            sc[s['id']] = s
    signs = {s['id']: s for s in json.loads((C / 'signs.json').read_text(encoding='utf-8'))['signs']}
    marks = {m['id']: m for m in json.loads((C / 'markings.json').read_text(encoding='utf-8'))['items']}
    yard = set(re.findall(r"^    id: '([a-z-]+)'", (ROOT / 'src' / 'yard.js').read_text(encoding='utf-8'), re.M))
    return cards, qs, sc, signs, marks, yard


def lvl_ok(it, f):
    L = int(it.get('level') or 1)
    if f.get('level') not in (None, ''):
        lv = f['level'] if isinstance(f['level'], list) else [f['level']]
        if L not in [int(x) for x in lv]:
            return False
    if int(f.get('levelMax') or 0) > 0 and L > int(f['levelMax']):
        return False
    if int(f.get('levelMin') or 0) > 0 and L < int(f['levelMin']):
        return False
    return True


def for_em(it, em):
    ex = it.get('exam') or []
    return not ex or em == 'both' or em in ex


def sel(f, pool, kind, em, bad):
    f = f or {}
    out = []
    for i in f.get('ids', []):
        if i in pool:
            out.append(i)
        else:
            bad.append(f'unknown {kind} id {i}')
    if kind in ('card', 'question'):
        banks, topics = f.get('banks', []), f.get('topics', [])
        if banks or topics:
            out += [k for k, v in pool.items() if (not banks or v['_bank'] in banks) and (not topics or v['topic'] in topics)
                    and lvl_ok(v, f) and (kind == 'card' or for_em(v, em))]
    elif kind == 'scenario':
        topics, types = f.get('topics', []), f.get('types', [])
        if topics:
            out += [k for k, v in pool.items() if v['topic'] in topics and lvl_ok(v, f) and for_em(v, em) and (not types or v.get('type') in types)]
    else:
        cats = f.get('cats', [])
        out += [k for k, v in pool.items() if v['cat'] in cats and lvl_ok(v, f)]
    return list(dict.fromkeys(out))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--emirate', default='both')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()
    cards, qs, sc, signs, marks, yard = load()
    cur = json.loads((C / 'curriculum.json').read_text(encoding='utf-8'))
    problems, seen = [], {}
    used = {'card': set(), 'question': set(), 'sign': set(), 'marking': set(), 'scenario': set()}
    pools = {}
    for u in cur['units']:
        if not a.quiet:
            print(f"\n[{u['exit']}] {u['title']}  ({u['id']}, {u['color']})")
        for l in u['lessons']:
            bad = []
            if l['id'] in seen:
                problems.append(f"{l['id']}: duplicate lesson id")
            seen[l['id']] = l
            k = l.get('kind', 'lesson')
            if k == 'yard':
                if l.get('exercise') not in yard:
                    problems.append(f"{l['id']}: unknown yard exercise {l.get('exercise')}")
                line = f"yard {l.get('exercise')}"
            elif k == 'challenge':
                miss = [x for x in l.get('from', []) if x not in pools]
                if miss:
                    problems.append(f"{l['id']}: from unknown or later lessons {miss}")
                pool = set().union(*[pools[x] for x in l.get('from', []) if x in pools]) if l.get('from') else set()
                if len(pool) < l.get('count', 12):
                    problems.append(f"{l['id']}: pool {len(pool)} < count {l.get('count')}")
                line = f"challenge from {len(l.get('from', []))} lessons, pool {len(pool)}, count {l.get('count')}, pass {l.get('pass')}"
            else:
                Lr, P = l.get('learn', {}), l.get('practice', {})
                lc = sel(Lr.get('cards'), cards, 'card', a.emirate, bad)
                ls = sel(Lr.get('signs'), signs, 'sign', a.emirate, bad)
                lm = sel(Lr.get('markings'), marks, 'marking', a.emirate, bad)
                pq = sel(P.get('questions'), qs, 'question', a.emirate, bad)
                ps = sel(P.get('signs'), signs, 'sign', a.emirate, bad)
                pm = sel(P.get('markings'), marks, 'marking', a.emirate, bad)
                px = sel(P.get('scenarios'), sc, 'scenario', a.emirate, bad)
                used['card'].update(lc); used['sign'].update(ls + ps); used['marking'].update(lm + pm)
                used['question'].update(pq); used['scenario'].update(px)
                pool = set(['q:' + x for x in pq] + ['sign:' + x for x in ps] + ['mk:' + x for x in pm] + ['sc:' + x for x in px])
                pools[l['id']] = pool
                cnt = P.get('count', 10)
                if not (lc or ls or lm) and not pool:
                    problems.append(f"{l['id']}: nothing to learn or practise")
                elif pool and len(pool) < cnt and not (ps or pm):
                    problems.append(f"{l['id']}: practice pool {len(pool)} < count {cnt}")
                line = (f"learn {len(lc)} cards {len(ls)} signs {len(lm)} marks | practice q {len(pq)} s {len(ps)} m {len(pm)} "
                        f"sc {len(px)} = {len(pool)} (count {cnt})")
            problems += [f"{l['id']}: {b}" for b in bad]
            if not a.quiet:
                print(f"  {l['id']:<16} {l.get('title', '')}\n      {line}")
    print()
    for kind, pool in (('card', cards), ('question', qs), ('sign', signs), ('marking', marks), ('scenario', sc)):
        rest = [k for k, v in pool.items() if k not in used[kind] and for_em(v, a.emirate)]
        total = len([v for v in pool.values() if for_em(v, a.emirate)])
        print(f"{kind}s: {total - len(rest)} of {total} in the path" + (f"; missing: {', '.join(rest[:30])}{' ...' if len(rest) > 30 else ''}" if rest else ''))
    lessons = sum(len(u['lessons']) for u in cur['units'])
    print(f"{len(cur['units'])} units, {lessons} stops, {len(problems)} problem(s)")
    for p in problems:
        print('  !', p)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
