#!/usr/bin/env python3
"""Review sheets for scenarios: question frame, solution frame and the text of each item side by side.

usage:
  python3 tools/scene_sheet.py <scenarios.json> <outdir> [--per 4] [--only ID[,ID]]

Runs tools/scene_preview.py (mobile width, 50% frame) into <outdir>/png, then writes <outdir>/sheet_01.png,
sheet_02.png, ... : one row per scenario with the question frame, the 50% intro or solution frame, the
solution frame, and the question, options (right one marked), explanation and picture ids. Made for reading
with an image viewer: check that the picture matches the text and that the question frame is neutral.
"""
import argparse, asyncio, html, json, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

CSS = """
* { box-sizing: border-box; }
body { margin: 0; background: #0f141d; color: #EAE6DB; font: 14px/1.5 'Readex Pro', sans-serif; }
.sheet { width: 1400px; padding: 12px; }
.row { display: grid; grid-template-columns: 300px 300px 300px 1fr; gap: 10px; padding: 10px; margin-bottom: 10px;
  background: #161d2a; border-radius: 12px; align-items: start; }
.row img { width: 300px; border-radius: 8px; background: #22262D; display: block; }
.cap { font: 11px 'Space Grotesk', sans-serif; color: #97A1B4; margin-top: 3px; direction: ltr; }
.txt { direction: rtl; text-align: right; }
.id { font: 700 13px 'Space Grotesk', sans-serif; color: #D9B978; direction: ltr; text-align: left; }
.q { font-weight: 700; margin: 4px 0 6px; }
.o { margin: 2px 0; } .o.ok { color: #8CC8A0; font-weight: 700; }
.x { color: #B8C0CC; margin-top: 6px; font-size: 13px; }
.meta { color: #97A1B4; font-size: 12px; margin-top: 6px; direction: ltr; text-align: left; }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('scenarios')
    ap.add_argument('outdir')
    ap.add_argument('--per', type=int, default=4)
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    out = pathlib.Path(a.outdir).resolve()
    png = out / 'png'
    png.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, str(ROOT / 'tools' / 'scene_preview.py'), a.scenarios, str(png), '--mobile', '--frames', '0.5', '--quiet']
    if a.only:
        cmd += ['--only', a.only]
    r = subprocess.run(cmd, capture_output=True, text=True)
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-500:])
    d = json.loads(pathlib.Path(a.scenarios).read_text(encoding='utf-8'))
    items = d.get('scenarios', d) if isinstance(d, dict) else d
    if a.only:
        want = [x.strip() for x in a.only.split(',') if x.strip()]
        items = [s for s in items if any(w in s['id'] for w in want)]
    rows = []
    for s in items:
        sid = s['id']
        def img(name):
            p = png / f'{sid}_{name}.png'
            return f'<div><img src="{p.as_uri()}"><div class="cap">{name}</div></div>' if p.exists() else '<div></div>'
        mid = 'intro_50' if (png / f'{sid}_intro_50.png').exists() else 'solution_50'
        opts = ''
        if s.get('type') == 'tap':
            opts = '<div class="o ok">tap: ' + html.escape(json.dumps(s.get('answer'), ensure_ascii=False)) + '</div>'
        else:
            for i, o in enumerate(s.get('options', [])):
                opts += f'<div class="o{" ok" if i == s.get("answer") else ""}">{i + 1}. {html.escape(o)}</div>'
        meta = f"{s.get('topic')} · L{s.get('level')} · {s.get('type')} · {','.join(s.get('exam', []))} · {s.get('confidence')}"
        if s.get('explain_fig'):
            meta += ' · fig: ' + ', '.join(s['explain_fig'])
        rows.append(f'<div class="row">{img("question")}{img(mid)}{img("solution")}<div class="txt">'
                    f'<div class="id">{html.escape(sid)}</div><div class="q">{html.escape(s.get("q", ""))}</div>{opts}'
                    f'<div class="x">{html.escape(s.get("explain", ""))}</div><div class="meta">{html.escape(meta)}</div></div></div>')
    sheets = [rows[i:i + a.per] for i in range(0, len(rows), a.per)]
    fonts = (ROOT / 'src' / 'fonts.css').as_uri()
    page = out / 'sheets.html'
    page.write_text('<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="%s"><style>%s</style></head><body>%s</body></html>' % (
        fonts, CSS, ''.join(f'<section class="sheet">{"".join(s)}</section>' for s in sheets)), encoding='utf-8')

    async def shoot():
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            b = await p.chromium.launch()
            pg = await (await b.new_context(viewport={'width': 1400, 'height': 900})).new_page()
            await pg.goto(page.as_uri())
            await pg.wait_for_timeout(600)
            for f in out.glob('sheet_*.png'):
                f.unlink()
            for i, el in enumerate(await pg.query_selector_all('.sheet'), 1):
                await el.screenshot(path=str(out / f'sheet_{i:02d}.png'))
            await b.close()
    asyncio.run(shoot())
    print(f'{len(rows)} scenarios, {len(sheets)} sheet(s) -> {out}')


if __name__ == '__main__':
    main()
