import asyncio, pathlib, json
from playwright.async_api import async_playwright
AUDIT = """() => {
  const out = [];
  document.querySelectorAll('button, a[href], input, textarea, select, summary, [role=switch]').forEach(el => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('[hidden]')) return;
    if (el.closest('[data-yard],[data-scene]')) return;
    if (r.height < 43.5 || r.width < 43.5) out.push((el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + (el.textContent||'').trim().slice(0,20));
  });
  return [...new Set(out)];
}"""
SCREENS = ["Miqwad.tab('home')", "Miqwad.tab('path')", "Miqwad.tab('signs')", "Miqwad.tab('arena')", "Miqwad.tab('yard')", "Miqwad.tab('exam')",
  "Miqwad.tab('review')", "Miqwad.tab('settings')", "Miqwad.tab('badges')", "Miqwad.tab('sources')", "Miqwad.tab('journey')",
  "Miqwad.tab('path'); document.querySelector('[data-act=lesson]').click()", "document.querySelector('[data-act=lpractice]') && document.querySelector('[data-act=lpractice]').click()",
  "document.querySelector('.opt') && document.querySelector('.opt').click()",
  "Miqwad.tab('exam'); document.querySelector('[data-act=examReady]').click(); document.querySelector('[data-act=cfmOk]').click()"]
async def main():
    url = pathlib.Path('/home/claude/miqwad/dist/index.html').resolve().as_uri()
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        await pg.goto(url); await pg.wait_for_timeout(400)
        await pg.evaluate("() => { localStorage.clear(); Miqwad.state().onboarded = true; }")
        for sc in SCREENS:
            try:
                await pg.evaluate("() => { " + sc + " }"); await pg.wait_for_timeout(250)
                r = await pg.evaluate(AUDIT)
                print(sc[:60], '->', r[:12])
            except Exception as e: print('ERR', sc, e)
        await b.close()
asyncio.run(main())
