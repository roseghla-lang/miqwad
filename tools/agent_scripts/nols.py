import asyncio, pathlib
from playwright.async_api import async_playwright
async def main():
    url = pathlib.Path('/home/claude/miqwad/dist/index.html').resolve().as_uri()
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':390,'height':844})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error',) else None)
        await pg.add_init_script("Object.defineProperty(window, 'localStorage', { get: function () { throw new Error('blocked'); } });")
        await pg.goto(url); await pg.wait_for_timeout(500)
        await pg.click('[data-act=start]'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("() => ({screen: Miqwad.screen(), onboarded: Miqwad.state().onboarded})")
        await pg.evaluate("() => Miqwad.tab('settings')"); await pg.wait_for_timeout(300)
        banner = await pg.evaluate("() => !!document.querySelector('.banner.warn')")
        await pg.screenshot(path='/home/claude/miqwad/tools/out/nols_settings.png')
        print(r, 'warn banner:', banner); print([e for e in errs if 'Unexpected end' not in e])
        await b.close()
asyncio.run(main())
