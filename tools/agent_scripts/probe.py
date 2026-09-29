import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
async def main():
    url = pathlib.Path('dist/index.html').resolve().as_uri()
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
        await pg.goto(url)
        await pg.wait_for_timeout(500)
        r = await pg.evaluate(sys.argv[1])
        print(json.dumps(r, ensure_ascii=False)[:3000])
        for e in errs: print('ERR', e[:300])
        await b.close()
asyncio.run(main())
