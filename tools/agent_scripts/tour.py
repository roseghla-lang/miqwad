#!/usr/bin/env python3
"""Walk the app and screenshot many screens in one session.
usage: tour.py out_prefix [--desktop] [--standins] [--only name,name]
"""
import asyncio, pathlib, sys, json, argparse
from playwright.async_api import async_playwright

ROOT = pathlib.Path('/home/claude/miqwad')
STANDINS = r"""
document.addEventListener('DOMContentLoaded', function () {
  if (!window.Signs || !window.SignKit || !window.DATA) return;
  var K = window.SignKit;
  function reg(o, i) {
    if (Signs.has(o.id)) return;
    var ch = (o.name || '?').replace(/[^ء-ي]/g, '').slice(0, 2) || '?';
    var sh = o.shape || '';
    Signs.register(o.id, function () {
      var t = K.text(ch, 50, 58, 24, {});
      if (/tri/.test(sh) && /down/.test(sh)) return K.giveWay(K.text(ch, 50, 34, 18, {}), {label: o.name});
      if (/tri/.test(sh) || o.cat === 'warning') return K.warn(K.text(ch, 50, 62, 18, {}), {label: o.name});
      if (o.cat === 'mandatory') return K.mand(K.text(ch, 50, 52, 26, {fill: '#fff'}), {label: o.name});
      if (/circle/.test(sh) || o.cat === 'prohibitory') return K.prohib(K.text(ch, 50, 52, 24, {}), {label: o.name});
      return K.rect(K.text(ch, 50, 52, 28, {fill: '#fff'}), {label: o.name, bg: i % 2 ? K.C.blue : K.C.green});
    });
  }
  ((DATA.signs || {}).signs || []).forEach(reg);
  ((DATA.markings || {}).items || []).forEach(reg);
}, true);
"""

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--desktop', action='store_true')
    ap.add_argument('--standins', action='store_true')
    ap.add_argument('--only', default='')
    ap.add_argument('--full', action='store_true')
    a = ap.parse_args()
    only = set(x for x in a.only.split(',') if x)
    url = (ROOT / 'dist/index.html').resolve().as_uri()
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        if a.desktop:
            ctx = await b.new_context(viewport={'width': int(__import__('os').environ.get('TW','1440')), 'height': 900})
        else:
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        if a.standins:
            await pg.add_init_script(STANDINS)
        await pg.goto(url)
        await pg.wait_for_timeout(400)

        async def shot(name, js=None, click=None, wait=450, full=False):
            if only and name not in only:
                if js: await pg.evaluate(js)
                if click: await pg.click(click, timeout=3000)
                await pg.wait_for_timeout(120)
                return
            try:
                if js: await pg.evaluate(js)
                if click: await pg.click(click, timeout=3000)
            except Exception as e:
                errs.append(f'step {name} failed: {e}')
            await pg.wait_for_timeout(wait)
            out = pathlib.Path(f'{a.out}_{name}.png')
            await pg.screenshot(path=str(out), full_page=full or a.full)
            print('saved', out)

        steps = json.loads(pathlib.Path(__file__).with_name('steps.json').read_text(encoding='utf-8'))
        for st in steps:
            await shot(st['name'], st.get('js'), st.get('click'), st.get('wait', 450), st.get('full', False))
        await b.close()
    for e in errs:
        print(e[:400])

asyncio.run(main())
