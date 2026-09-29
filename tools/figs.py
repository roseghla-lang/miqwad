#!/usr/bin/env python3
"""Pictures on questions and learn cards: check the references, or apply a mapping file.

usage:
  python3 tools/figs.py check [--bank NAME] [--list]
  python3 tools/figs.py apply MAPPING.json [--dry-run]

Fields (all optional, see docs/app.md section 4):
  question.fig          1 to 3 ids: pictures under the question text (the thing the question talks about)
  question.opt_figs     same length as options: one id or null per option (picture inside the option)
  question.explain_fig  1 to 3 ids: pictures shown with the explanation after answering
  card.fig              1 to 4 ids: pictures at the top of a learn card (captions shown when 2 or more)
Ids: any sign id (content/signs.json), marking id (content/markings.json) or concept figure id
(content/figs.json, fig-...). The legacy question fields sign / signs still work and count as fig.

MAPPING.json:
  {"questions": {"<question id>": {"fig": [...], "opt_figs": [...], "explain_fig": [...]}},
   "cards": {"<card id>": {"fig": [...]}}}
  A field set to [] or null removes it. Ids are looked up in every content/q_*.json file.
  Files keep their indentation (q_safety.json uses 2, the others 1); q_markings.json is rewritten with indent 1.

check: validates every reference in content/q_*.json and prints coverage per bank.
Exit code 0 = fine, 1 = problems.
"""
import argparse, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content'
LIMITS = {'fig': 3, 'explain_fig': 3}
CARD_LIMIT = 4


def load(p):
    return json.loads(p.read_text(encoding='utf-8'))


def known_ids():
    ids = {}
    for s in load(CONTENT / 'signs.json').get('signs', []):
        ids[s['id']] = s.get('name', '')
    for s in load(CONTENT / 'markings.json').get('items', []):
        ids[s['id']] = s.get('name', '')
    fp = CONTENT / 'figs.json'
    if fp.exists():
        for s in load(fp).get('figs', []):
            ids[s['id']] = s.get('name', '')
    return ids


def banks():
    return sorted(p for p in CONTENT.glob('q_*.json'))


def indent_of(p):
    raw = p.read_text(encoding='utf-8')
    d = json.loads(raw)
    for ind in (1, 2):
        if json.dumps(d, ensure_ascii=False, indent=ind) + '\n' == raw:
            return ind
    return 1


def as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def check_item(kind, it, ids):
    probs = []
    if kind == 'q':
        figs = as_list(it.get('fig')) + as_list(it.get('signs')) + as_list(it.get('sign'))
        if len(as_list(it.get('fig'))) > LIMITS['fig']:
            probs.append('fig has more than %d ids' % LIMITS['fig'])
        for f in figs:
            if f not in ids:
                probs.append('unknown id in fig: %s' % f)
        ef = as_list(it.get('explain_fig'))
        if len(ef) > LIMITS['explain_fig']:
            probs.append('explain_fig has more than %d ids' % LIMITS['explain_fig'])
        for f in ef:
            if f not in ids:
                probs.append('unknown id in explain_fig: %s' % f)
        if 'opt_figs' in it:
            of = it['opt_figs']
            if not isinstance(of, list) or len(of) != len(it.get('options', [])):
                probs.append('opt_figs must be a list with one entry per option')
            else:
                real = [f for f in of if f]
                if len(real) < 2:
                    probs.append('opt_figs needs at least 2 pictures (else drop it)')
                for f in real:
                    if f not in ids:
                        probs.append('unknown id in opt_figs: %s' % f)
                if len(set(real)) != len(real):
                    probs.append('opt_figs repeats an id')
    else:
        fg = as_list(it.get('fig'))
        if len(fg) > CARD_LIMIT:
            probs.append('card fig has more than %d ids' % CARD_LIMIT)
        for f in fg:
            if f not in ids:
                probs.append('unknown id in card fig: %s' % f)
    return probs


def cmd_check(a):
    ids = known_ids()
    total_bad = 0
    used = {}
    for p in banks():
        name = p.stem[2:]
        if a.bank and a.bank != name:
            continue
        d = load(p)
        qs, cs = d.get('questions', []), d.get('cards', [])
        nq = {'fig': 0, 'opt_figs': 0, 'explain_fig': 0, 'any': 0}
        for q in qs:
            pr = check_item('q', q, ids)
            for x in pr:
                print(f'  {q["id"]}: {x}')
            total_bad += len(pr)
            has = False
            for k in ('fig', 'opt_figs', 'explain_fig'):
                if q.get(k):
                    nq[k] += 1
                    has = True
            if q.get('signs') or q.get('sign'):
                has = True
            nq['any'] += has
            for f in as_list(q.get('fig')) + [x for x in as_list(q.get('opt_figs')) if x] + as_list(q.get('explain_fig')):
                used[f] = used.get(f, 0) + 1
        nc = 0
        for c in cs:
            pr = check_item('c', c, ids)
            for x in pr:
                print(f'  {c["id"]}: {x}')
            total_bad += len(pr)
            if c.get('fig'):
                nc += 1
                for f in as_list(c.get('fig')):
                    used[f] = used.get(f, 0) + 1
        print(f'{name:<11} questions {len(qs):>4}: with pictures {nq["any"]:>4} ({100 * nq["any"] / max(1, len(qs)):.0f}%)'
              f'  fig {nq["fig"]}, opt_figs {nq["opt_figs"]}, explain_fig {nq["explain_fig"]}'
              f'   cards {len(cs):>3}: with pictures {nc} ({100 * nc / max(1, len(cs)):.0f}%)')
    if a.list:
        for f, n in sorted(used.items(), key=lambda x: (-x[1], x[0])):
            print(f'  {n:>3}  {f}  {ids.get(f, "?")}')
    figs = [f['id'] for f in load(CONTENT / 'figs.json').get('figs', [])] if (CONTENT / 'figs.json').exists() else []
    unused = [f for f in figs if f not in used]
    if unused and not a.bank:
        print('concept figures not used yet: ' + ', '.join(unused))
    print('problems: %d' % total_bad)
    return 1 if total_bad else 0


def cmd_apply(a):
    ids = known_ids()
    m = load(pathlib.Path(a.mapping))
    mq, mc = m.get('questions', {}) or {}, m.get('cards', {}) or {}
    found_q, found_c, probs, changed = set(), set(), [], {}
    for p in banks():
        d = load(p)
        dirty = False
        for q in d.get('questions', []):
            if q['id'] not in mq:
                continue
            found_q.add(q['id'])
            for k, v in mq[q['id']].items():
                if k not in ('fig', 'opt_figs', 'explain_fig'):
                    probs.append(f'{q["id"]}: unknown field {k}')
                    continue
                if v in (None, [], ''):
                    if k in q:
                        del q[k]
                        dirty = True
                    continue
                q[k] = v if k == 'opt_figs' else as_list(v)
                dirty = True
            pr = check_item('q', q, ids)
            probs += [f'{q["id"]}: {x}' for x in pr]
        for c in d.get('cards', []):
            if c['id'] not in mc:
                continue
            found_c.add(c['id'])
            for k, v in mc[c['id']].items():
                if k != 'fig':
                    probs.append(f'{c["id"]}: cards only take fig (got {k})')
                    continue
                if v in (None, [], ''):
                    if 'fig' in c:
                        del c['fig']
                        dirty = True
                    continue
                c['fig'] = as_list(v)
                dirty = True
            pr = check_item('c', c, ids)
            probs += [f'{c["id"]}: {x}' for x in pr]
        if dirty:
            changed[p] = d
    for qid in mq:
        if qid not in found_q:
            probs.append(f'question id not found: {qid}')
    for cid in mc:
        if cid not in found_c:
            probs.append(f'card id not found: {cid}')
    for x in probs:
        print('  ! ' + x)
    if probs:
        print(f'{len(probs)} problem(s): nothing written')
        return 1
    for p, d in changed.items():
        if a.dry_run:
            print(f'would write {p.name}')
            continue
        ind = indent_of(p)
        p.write_text(json.dumps(d, ensure_ascii=False, indent=ind) + '\n', encoding='utf-8')
        print(f'wrote {p.name} (indent {ind})')
    print(f'applied {len(found_q)} question(s) and {len(found_c)} card(s)')
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd')
    c = sub.add_parser('check')
    c.add_argument('--bank', default='')
    c.add_argument('--list', action='store_true')
    ap_ = sub.add_parser('apply')
    ap_.add_argument('mapping')
    ap_.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    if a.cmd == 'check':
        sys.exit(cmd_check(a))
    if a.cmd == 'apply':
        sys.exit(cmd_apply(a))
    ap.print_help()
    sys.exit(2)


if __name__ == '__main__':
    main()
