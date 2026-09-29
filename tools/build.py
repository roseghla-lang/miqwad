#!/usr/bin/env python3
"""Build مقود.

  python3 tools/build.py [--samples]

1. content/*.json  ->  src/data.js   (window.DATA = {...})
2. src/*           ->  dist/index.html     full offline document (open directly on a laptop / iPhone Files)
                   ->  dist/artifact.html  fragment for the Claude Artifact tool (no html/head/body tags)
                   ->  src/dev.html        dev harness with <script src> tags (readable stack traces)

Content mapping:
  signs.json -> DATA.signs, markings.json -> DATA.markings, exams.json -> DATA.exams,
  curriculum.json -> DATA.curriculum, q_<name>.json -> DATA.banks[<name>],
  scenarios_<name>.json -> DATA.scenarios (arrays concatenated; each item gets "_file": <name>)
Files starting with "_" are ignored. sample_<x>.json files are used only with --samples and only
when the real <x>.json does not exist.
"""
import argparse, json, pathlib, re, sys, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, CONTENT, DIST = ROOT / 'src', ROOT / 'content', ROOT / 'dist'
TITLE = 'مقود'


def load(p):
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        print(f'  ! bad JSON {p.name}: {e}', file=sys.stderr)
        return None


def collect(samples):
    files = {}
    for p in sorted(CONTENT.glob('*.json')):
        if p.name.startswith('_'):
            continue
        if p.name.startswith('sample_'):
            continue
        files[p.stem] = p
    if samples:
        for p in sorted(CONTENT.glob('sample_*.json')):
            key = p.stem[len('sample_'):]
            files.setdefault(key, p)
    data = {'signs': None, 'markings': None, 'exams': None, 'curriculum': None, 'banks': {}, 'scenarios': [],
            'scenarioSources': {}}
    for key, p in files.items():
        obj = load(p)
        if obj is None:
            continue
        if key in ('signs', 'markings', 'exams', 'curriculum'):
            data[key] = obj
        elif key.startswith('q_'):
            data['banks'][key[2:]] = obj
        elif key.startswith('scenarios_'):
            name = key[len('scenarios_'):]
            items = obj.get('scenarios', []) if isinstance(obj, dict) else obj
            for it in items:
                it['_file'] = name
            data['scenarios'].extend(items)
            if isinstance(obj, dict) and obj.get('sources'):
                data['scenarioSources'][name] = obj['sources']
        else:
            data.setdefault('extra', {})[key] = obj
    return data


def js_safe(s):
    return re.sub(r'</(script)', r'<\\/\1', s, flags=re.I)


def script_list():
    order = [SRC / 'data.js', SRC / 'signs' / 'kit.js', SRC / 'signs' / 'glyphs.js']
    others = sorted(p for p in (SRC / 'signs').glob('*.js') if p.name not in ('kit.js', 'glyphs.js'))
    order += others
    order += [SRC / 'scenes.js', SRC / 'yard.js', SRC / 'app.js']
    return [p for p in order if p.exists()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--samples', action='store_true')
    a = ap.parse_args()

    data = collect(a.samples)
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    payload = payload.replace('</', '<\\/')
    (SRC / 'data.js').write_text('window.DATA = ' + payload + ';\n', encoding='utf-8')

    fonts = (SRC / 'fonts.css').read_text(encoding='utf-8') if (SRC / 'fonts.css').exists() else ''
    styles = (SRC / 'styles.css').read_text(encoding='utf-8') if (SRC / 'styles.css').exists() else ''
    body = (SRC / 'body.html').read_text(encoding='utf-8') if (SRC / 'body.html').exists() else \
        '<div id="app" dir="rtl" lang="ar"></div>'
    scripts = script_list()
    # one <script> per module: a syntax error in one module must not take the whole app down
    script_block = '\n'.join('<script>/* ---- %s ---- */\n%s\n</script>' % (
        p.relative_to(SRC), js_safe(p.read_text(encoding='utf-8'))) for p in scripts)

    style_block = '<style>\n' + fonts + '\n' + styles + '\n</style>'
    title = '<title>' + html.escape(TITLE) + '</title>'

    DIST.mkdir(exist_ok=True)
    full = ('<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="color-scheme" content="dark">\n<meta name="theme-color" content="#0A0E15">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n'
            + title + '\n' + style_block + '\n</head>\n<body>\n' + body + '\n' + script_block + '\n</body>\n</html>\n')
    (DIST / 'index.html').write_text(full, encoding='utf-8')

    frag = title + '\n' + style_block + '\n' + body + '\n' + script_block + '\n'
    (DIST / 'artifact.html').write_text(frag, encoding='utf-8')

    # dev harness
    dev_scripts = '\n'.join('<script src="%s"></script>' % p.relative_to(SRC).as_posix() for p in scripts)
    dev = ('<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
           + title + '\n<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="styles.css">\n'
           '</head>\n<body>\n' + body + '\n' + dev_scripts + '\n</body>\n</html>\n')
    (SRC / 'dev.html').write_text(dev, encoding='utf-8')

    kb = lambda p: (DIST / p).stat().st_size / 1024
    counts = {
        'signs': len((data['signs'] or {}).get('signs', [])) if data['signs'] else 0,
        'markings': len((data['markings'] or {}).get('items', [])) if data['markings'] else 0,
        'banks': {k: len(v.get('questions', [])) for k, v in data['banks'].items()},
        'scenarios': len(data['scenarios']),
    }
    print('scripts:', ', '.join(str(p.relative_to(SRC)) for p in scripts))
    print('content:', json.dumps(counts, ensure_ascii=False))
    print(f'dist/index.html {kb("index.html"):.0f} KB, dist/artifact.html {kb("artifact.html"):.0f} KB')


if __name__ == '__main__':
    main()
