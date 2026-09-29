#!/usr/bin/env python3
"""Apply audit findings (JSON files written by the stage 5 auditors) to content/*.json.

usage:
  python3 tools/apply_audit.py <findings.json> [...] [--apply] [--skip ID[,ID]] [--only-sev wrong,misleading]

Each finding: {"file", "id", "severity", "problem", "patch": {field: new value}}. Items are found by `id` in
questions/cards/signs/items/figs/scenarios; for exams.json `id` is a dotted JSON path and the patch is
{"value": ...}. Without --apply it prints what would change. Patches that are empty, point at an unknown id
or field, or break the writing rules (tanwin, shadda, long dash, final full stop) are listed and skipped.
"""
import argparse, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIELDS = {'q', 'options', 'answer', 'explain', 'tip', 'notes', 'title', 'body', 'key', 'level', 'confidence', 'src', 'fig',
          'explain_fig', 'opt_figs', 'name', 'meaning', 'action', 'uae_note', 'exam', 'hotspots', 'scene', 'confuse', 'desc'}
BAD = re.compile('[ًٌٍّ–—]')


def strings(v):
    if isinstance(v, str):
        yield v
    elif isinstance(v, list):
        for x in v:
            yield from strings(x)
    elif isinstance(v, dict):
        for x in v.values():
            yield from strings(x)


def find(doc, iid):
    for k in ('questions', 'cards', 'signs', 'items', 'figs', 'scenarios'):
        for x in doc.get(k, []) if isinstance(doc, dict) else []:
            if isinstance(x, dict) and x.get('id') == iid:
                return x
    return None


def by_path(doc, path):
    parts = re.sub(r'\[(\d+)\]', r'.\1', path).split('.')
    cur = doc
    for p in parts[:-1]:
        cur = cur[int(p)] if isinstance(cur, list) else cur[p]
    return cur, (int(parts[-1]) if isinstance(cur, list) else parts[-1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('findings', nargs='+')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--skip', default='')
    ap.add_argument('--only-sev', default='')
    a = ap.parse_args()
    skip = {s.strip() for s in a.skip.split(',') if s.strip()}
    sev = {s.strip() for s in a.only_sev.split(',') if s.strip()}
    docs, done, skipped = {}, 0, []
    for fp in a.findings:
        for f in json.loads(pathlib.Path(fp).read_text(encoding='utf-8')).get('findings', []):
            tag = f"{pathlib.Path(fp).stem}:{f.get('id')}"
            patch = f.get('patch') or {}
            if f.get('id') in skip or (sev and f.get('severity') not in sev):
                continue
            if not patch:
                skipped.append((tag, 'no patch', f.get('problem', '')[:90]))
                continue
            rel = f.get('file', '')
            if not rel.startswith('content/') or not rel.endswith('.json'):
                skipped.append((tag, 'not a content file: ' + rel, f.get('problem', '')[:90]))
                continue
            if rel not in docs:
                docs[rel] = json.loads((ROOT / rel).read_text(encoding='utf-8'))
            doc = docs[rel]
            bad = [s for s in strings(patch) if BAD.search(s) or re.search('[.۔]\\s*$', s)]
            if bad:
                skipped.append((tag, 'writing rules', bad[0][:60]))
                continue
            if 'value' in patch and len(patch) == 1:
                try:
                    parent, key = by_path(doc, f['id'])
                    old = parent[key]
                except (KeyError, IndexError, ValueError, TypeError):
                    skipped.append((tag, 'unknown path', ''))
                    continue
                print(f"{tag} [{f.get('severity')}] {f['id']}: {json.dumps(old, ensure_ascii=False)[:80]} -> {json.dumps(patch['value'], ensure_ascii=False)[:80]}")
                parent[key] = patch['value']
                done += 1
                continue
            it = find(doc, f['id'])
            if it is None:
                skipped.append((tag, 'unknown id', ''))
                continue
            unknown = [k for k in patch if k not in FIELDS]
            if unknown:
                skipped.append((tag, 'unknown fields ' + ','.join(unknown), ''))
                continue
            new = dict(it, **patch)
            if 'options' in new and new.get('type') != 'tap' and isinstance(new.get('answer'), int):
                if not 0 <= new['answer'] < len(new['options']) or len(set(new['options'])) != len(new['options']):
                    skipped.append((tag, 'answer/options invalid after patch', ''))
                    continue
                if new.get('opt_figs') and len(new['opt_figs']) != len(new['options']):
                    skipped.append((tag, 'opt_figs length mismatch after patch', ''))
                    continue
            print(f"{tag} [{f.get('severity')}] {', '.join(patch)}")
            it.update(patch)
            done += 1
    if a.apply:
        for rel, doc in docs.items():
            path = ROOT / rel
            old = path.read_text(encoding='utf-8')
            indent = 2 if old.startswith('{\n  "') else 1  # keep each file's own layout so diffs stay small
            path.write_text(json.dumps(doc, ensure_ascii=False, indent=indent) + ('\n' if old.endswith('\n') else ''), encoding='utf-8')
    print(f"\n{done} patch(es) {'applied' if a.apply else 'ready (dry run)'}, {len(skipped)} skipped")
    for s in skipped:
        print('  -', *s)


if __name__ == '__main__':
    main()
