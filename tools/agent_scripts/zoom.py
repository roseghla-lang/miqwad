import asyncio, pathlib, sys
from playwright.async_api import async_playwright
async def main():
    url = pathlib.Path('/home/claude/miqwad/dist/index.html').resolve().as_uri()
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=3)
        await pg.goto(url); await pg.wait_for_timeout(400)
        await pg.evaluate(sys.argv[1]); await pg.wait_for_timeout(600)
        el = await pg.query_selector(sys.argv[2])
        await el.screenshot(path=sys.argv[3]); print('ok')
        await b.close()
asyncio.run(main())
