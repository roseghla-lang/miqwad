#!/usr/bin/env python3
"""Render every scenario of a scenarios file to PNG and print validation messages.

usage:
  python3 tools/scene_preview.py <scenarios.json> <outdir> [options]

options:
  --mobile            render at iPhone width (390 CSS px, DPR 2) instead of 560 CSS px
  --width N           container width in CSS px (default 560)
  --only ID[,ID...]   only these scenario ids (substring match)
  --frames F[,F...]   extra solution frames as fractions of the solution, e.g. 0.25,0.5,0.75
  --intro-frames F..  extra intro frames (fractions), default 0.5 when the scene has an intro
  --debug             draw lane numbers, arm letters, bay ids and a 10 m grid on the PNGs
  --no-png            validate only (fast)
  --quiet             print only scenarios that have messages
  --gallery           also refresh the embedded snapshot in tools/scene_gallery.html with this file

Input: {"scenarios":[...]} or a plain list of scenarios; a single scenario or a bare scene also works.
Output files per scenario (in <outdir>):
  <id>_question.png          the frozen frame shown with the question
  <id>_intro_50.png          mid-intro frame (scenes with an intro)
  <id>_solution.png          end of the solution
  <id>_solution_50.png       extra frames requested with --frames
  index.html                 contact sheet with every PNG and every message
Exit code: 0 = no errors (warnings allowed), 1 = at least one error, 2 = the file could not be read.
"""
import argparse
import html
import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'

HARNESS = """<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="{fonts}">
<style>
  html,body{{margin:0;background:#0A0E15;color:#EAE6DB;font-family:'Readex Pro',sans-serif}}
  #stage{{width:{width}px;padding:0;margin:0}}
  #stage .card{{background:#101724;border:1px solid #1E2A3C;border-radius:14px;overflow:hidden}}
</style>
{scripts}
</head><body><div id="stage"><div class="card" id="card"></div></div>
<script>
window.__errors = [];
window.addEventListener('error', function (e) {{ window.__errors.push(String(e.message)); }});
window.__ctl = null;
window.__prepare = function (sc, debug) {{
  var out = {{ok: true, messages: [], hasIntro: false, Li: 0, Ls: 0}};
  if (!window.Scenes) {{ out.ok = false; out.messages = ['window.Scenes is missing (scenes.js failed to load)']; return out; }}
  try {{ out.messages = Scenes.validate(sc); }} catch (e) {{ out.messages = ['validate() threw: ' + e.message]; }}
  var card = document.getElementById('card');
  if (window.__ctl) {{ try {{ window.__ctl.destroy(); }} catch (e) {{}} window.__ctl = null; }}
  card.innerHTML = '';
  try {{
    var scene = sc && sc.scene ? sc.scene : sc;
    window.__ctl = Scenes.mount(card, scene, {{autoplay: false, blink: false, debug: !!debug, hotspots: sc && sc.hotspots, labels: 'hover'}});
    out.hasIntro = !!window.__ctl.hasIntro;
    out.Li = window.__ctl.duration('intro');
    out.Ls = window.__ctl.duration('solution');
    if (!window.__ctl.svg) {{ out.ok = false; if (!out.messages.length) out.messages.push('mount failed: ' + (window.__ctl.errors || []).join('; ')); }}
  }} catch (e) {{ out.ok = false; out.messages.push('mount() threw: ' + e.message); }}
  return out;
}};
window.__seek = function (phase, t, showArrows) {{
  if (!window.__ctl) return false;
  window.__ctl.seek(t, phase);
  if (showArrows != null) window.__ctl.showArrows(showArrows);
  return true;
}};
</script>
</body></html>
"""


def load_scenarios(path):
    try:
        text = pathlib.Path(path).read_text(encoding='utf-8')
    except OSError as e:
        print(f'cannot read {path}: {e}')
        sys.exit(2)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        line = text.splitlines()[e.lineno - 1] if 0 < e.lineno <= len(text.splitlines()) else ''
        print(f'{path}: invalid JSON at line {e.lineno}, column {e.colno}: {e.msg}')
        if line:
            print('   ' + line.strip()[:160])
        sys.exit(2)
    if isinstance(data, dict) and isinstance(data.get('scenarios'), list):
        items = data['scenarios']
    elif isinstance(data, list):
        items = data
    elif isinstance(data, dict) and ('scene' in data or 'template' in data):
        items = [data]
    else:
        print(f'{path}: expected {{"scenarios":[...]}}, a list of scenarios, a scenario or a scene')
        sys.exit(2)
    out = []
    for i, it in enumerate(items):
        if not isinstance(it, dict):
            out.append((f'item{i:03d}', it))
            continue
        sid = it.get('id') or (f'scene{i:03d}' if 'template' in it else f'item{i:03d}')
        out.append((str(sid), it))
    return out


def refresh_gallery(path):
    import re
    gal = ROOT / 'tools' / 'scene_gallery.html'
    if not gal.exists():
        print(f'{gal} not found, --gallery skipped')
        return
    data = json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    emb = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    text = gal.read_text(encoding='utf-8')
    new, n = re.subn(r'(<script type="application/json" id="embedded">)(.*?)(</script>)', lambda m: m.group(1) + emb + m.group(3), text, flags=re.S)
    if n != 1:
        print('could not find the embedded snapshot in scene_gallery.html')
        return
    gal.write_text(new, encoding='utf-8')
    print(f'gallery snapshot refreshed from {path}')


def safe_name(s):
    return ''.join(c if c.isalnum() or c in '-_' else '_' for c in s)[:80] or 'scene'


def main():
    ap = argparse.ArgumentParser(description='Render scenario scenes to PNG and validate them.')
    ap.add_argument('scenarios')
    ap.add_argument('outdir')
    ap.add_argument('--mobile', action='store_true')
    ap.add_argument('--width', type=int, default=None)
    ap.add_argument('--only', default='')
    ap.add_argument('--frames', default='')
    ap.add_argument('--intro-frames', default='0.5')
    ap.add_argument('--debug', action='store_true')
    ap.add_argument('--no-png', action='store_true')
    ap.add_argument('--quiet', action='store_true')
    ap.add_argument('--gallery', action='store_true')
    a = ap.parse_args()

    items = load_scenarios(a.scenarios)
    if a.gallery:
        refresh_gallery(a.scenarios)
    if a.only:
        keys = [k.strip() for k in a.only.split(',') if k.strip()]
        items = [(sid, it) for sid, it in items if any(k in sid for k in keys)]
    out = pathlib.Path(a.outdir)
    out.mkdir(parents=True, exist_ok=True)
    width = a.width or (390 if a.mobile else 560)
    dpr = 2 if a.mobile else 1.5

    def fracs(s):
        r = []
        for x in s.split(','):
            x = x.strip()
            if not x:
                continue
            try:
                v = float(x)
                if 0 <= v <= 1:
                    r.append(v)
            except ValueError:
                print(f'ignoring frame value {x!r}')
        return r
    sol_fracs, intro_fracs = fracs(a.frames), fracs(a.intro_frames)

    sign_scripts = [SRC / 'signs' / 'kit.js', SRC / 'signs' / 'glyphs.js']
    sign_scripts += sorted(p for p in (SRC / 'signs').glob('*.js') if p.name not in ('kit.js', 'glyphs.js')) if (SRC / 'signs').exists() else []
    scripts = ''.join(f'<script src="{p.resolve().as_uri()}"></script>\n' for p in sign_scripts if p.exists())
    scripts += f'<script src="{(SRC / "scenes.js").resolve().as_uri()}"></script>\n'
    harness = out / '_harness.html'
    harness.write_text(HARNESS.format(fonts=(SRC / 'fonts.css').resolve().as_uri(), width=width, scripts=scripts), encoding='utf-8')

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('playwright is not installed: pip install playwright && playwright install chromium')
        sys.exit(2)

    report = []
    n_err = n_warn = 0
    t_start = time.time()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': width + 20, 'height': 900}, device_scale_factor=dpr,
                                  is_mobile=a.mobile, has_touch=a.mobile)
        page = ctx.new_page()
        console = []
        page.on('console', lambda m: console.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') and 'Scenes.mount:' not in m.text else None)
        page.on('pageerror', lambda e: console.append(f'pageerror: {e}'))
        page.goto(harness.resolve().as_uri())
        page.wait_for_timeout(200)
        try:
            page.evaluate('document.fonts ? document.fonts.ready.then(function(){return true}) : true')
        except Exception:
            pass
        if console:
            for c in console:
                print('harness: ' + c)
            console.clear()
        for sid, sc in items:
            entry = {'id': sid, 'messages': [], 'pngs': []}
            try:
                info = page.evaluate('([sc, dbg]) => window.__prepare(sc, dbg)', [sc, a.debug])
            except Exception as e:
                info = {'ok': False, 'messages': [f'harness failure: {e}'], 'hasIntro': False, 'Li': 0, 'Ls': 0}
            entry['messages'] = list(info.get('messages') or [])
            if console:
                entry['messages'] += [c for c in console]
                console.clear()
            if info.get('ok') and not a.no_png:
                frames = [('question', 'question', 0)]
                if info.get('hasIntro'):
                    for f in intro_fracs:
                        frames.append((f'intro_{int(round(f * 100)):02d}', 'intro', info['Li'] * f))
                for f in sol_fracs:
                    frames.append((f'solution_{int(round(f * 100)):02d}', 'solution', info['Ls'] * f))
                frames.append(('solution', 'done', 0))
                for name, phase, t in frames:
                    try:
                        page.evaluate('([ph, t, arr]) => window.__seek(ph, t, arr)', [phase, t, None])
                        page.wait_for_timeout(40)
                        fn = out / f'{safe_name(sid)}_{name}.png'
                        page.locator('#card').screenshot(path=str(fn))
                        entry['pngs'].append(fn.name)
                    except Exception as e:
                        entry['messages'].append(f'screenshot {name} failed: {e}')
                if console:
                    entry['messages'] += [c for c in console]
                    console.clear()
            errs = [m for m in entry['messages'] if not m.startswith('warn:')]
            warns = [m for m in entry['messages'] if m.startswith('warn:')]
            n_err += len(errs)
            n_warn += len(warns)
            entry['n_err'] = len(errs)
            report.append(entry)
            if entry['messages'] or not a.quiet:
                status = 'ERROR' if errs else ('warn ' if warns else 'ok   ')
                print(f'[{status}] {sid}' + (f'  ({len(entry["pngs"])} png)' if entry['pngs'] else ''))
                for m in errs + warns:
                    print('        - ' + m)
        browser.close()

    # contact sheet
    rows = []
    for e in report:
        imgs = ''.join(f'<figure><img src="{html.escape(p)}" loading="lazy"><figcaption>{html.escape(p)}</figcaption></figure>' for p in e['pngs'])
        msgs = ''.join(f'<li class="{"w" if m.startswith("warn:") else "e"}">{html.escape(m)}</li>' for m in e['messages'])
        rows.append(f'<section><h2>{html.escape(e["id"])}</h2><ul>{msgs or "<li class=ok>no messages</li>"}</ul><div class="imgs">{imgs}</div></section>')
    sheet = ('<!DOCTYPE html><html><head><meta charset="utf-8"><title>scene preview</title><style>'
             'body{background:#0A0E15;color:#EAE6DB;font:14px system-ui;margin:20px}h2{font-size:15px;margin:18px 0 6px}'
             'ul{margin:0 0 8px;padding-left:18px}li.e{color:#DE9090}li.w{color:#E2A65C}li.ok{color:#8CC8A0}'
             '.imgs{display:flex;flex-wrap:wrap;gap:10px}figure{margin:0}img{width:300px;border-radius:8px;display:block}'
             'figcaption{font-size:11px;color:#97A1B4}</style></head><body>'
             f'<h1>{html.escape(pathlib.Path(a.scenarios).name)}: {len(report)} scenarios, {n_err} errors, {n_warn} warnings</h1>'
             + ''.join(rows) + '</body></html>')
    (out / 'index.html').write_text(sheet, encoding='utf-8')
    print(f'{len(report)} scenarios, {n_err} errors, {n_warn} warnings, {time.time() - t_start:.1f} s -> {out / "index.html"}')
    sys.exit(1 if n_err else 0)


if __name__ == '__main__':
    main()
