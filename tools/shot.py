#!/usr/bin/env python3
"""Screenshot a local HTML file with Playwright + Chromium and print console errors.

usage:
  python3 tools/shot.py page.html out.png [--mobile] [--full] [--w 1280] [--h 900]
                        [--wait 600] [--js "document.querySelector('#x').click()"] [--click CSS]

--mobile  iPhone-like viewport (390x844, DPR 2, touch)
--full    full-page screenshot
--js      JavaScript run after load (before the wait); may be given several times
--click   CSS selector to click after load (may be given several times, in order)
Prints: console errors / page errors, then the output path.
"""
import argparse, asyncio, pathlib, sys

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('html')
    ap.add_argument('out')
    ap.add_argument('--mobile', action='store_true')
    ap.add_argument('--full', action='store_true')
    ap.add_argument('--w', type=int, default=1280)
    ap.add_argument('--h', type=int, default=900)
    ap.add_argument('--wait', type=int, default=600)
    ap.add_argument('--js', action='append', default=[])
    ap.add_argument('--click', action='append', default=[])
    a = ap.parse_args()

    from playwright.async_api import async_playwright
    url = pathlib.Path(a.html).resolve().as_uri()
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        if a.mobile:
            ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                            is_mobile=True, has_touch=True)
        else:
            ctx = await browser.new_context(viewport={'width': a.w, 'height': a.h}, device_scale_factor=1)
        page = await ctx.new_page()
        page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        await page.goto(url)
        await page.wait_for_timeout(300)
        for sel in a.click:
            try:
                await page.click(sel, timeout=3000)
                await page.wait_for_timeout(250)
            except Exception as e:
                errors.append(f'click failed {sel}: {e}')
        for code in a.js:
            try:
                await page.evaluate(code)
            except Exception as e:
                errors.append(f'js failed: {e}')
        await page.wait_for_timeout(a.wait)
        out = pathlib.Path(a.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(out), full_page=a.full)
        await browser.close()
    for e in errors:
        print(e)
    print(f'saved {out}')

asyncio.run(main())
