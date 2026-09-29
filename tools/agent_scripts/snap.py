import sys, pathlib, json
from playwright.sync_api import sync_playwright
H = pathlib.Path('/home/claude/miqwad/tools/yard_test.html').as_uri()
SIZES = {'d': dict(viewport={'width': 1280, 'height': 860}), 'p': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
         'l': dict(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True)}
# usage: snap.py out.png size query [js...]
out, size, query = sys.argv[1], sys.argv[2], sys.argv[3]
js = sys.argv[4:]
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(**SIZES[size]); pg = ctx.new_page()
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.goto(H + '?bare=1&sound=0&seed=7&' + query); pg.wait_for_function('window.ctl && ctl.state()'); pg.wait_for_timeout(500)
    for c in js:
        r = pg.evaluate(c)
        if r is not None: print(json.dumps(r, ensure_ascii=False)[:600])
        pg.wait_for_timeout(300)
    pg.screenshot(path=out); b.close()
for e in errs: print(e)
print('saved', out)
