import json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path('/home/claude/miqwad')
ex = json.load(open(ROOT/'docs/scene_examples.json'))['scenarios']
hz = [s for s in ex if s['id']=='ex-hz-01'][0]
rb = [s for s in ex if s['id']=='ex-rb-01'][0]
html = f"""<!DOCTYPE html><html><head><meta charset=utf-8><link rel=stylesheet href="{(ROOT/'src/fonts.css').as_uri()}">
<script>
window.__raf=0; var _r=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=function(f){{window.__raf++; return _r(f);}};
</script>
<script src="{(ROOT/'src/signs/kit.js').as_uri()}"></script><script src="{(ROOT/'src/scenes.js').as_uri()}"></script></head>
<body style="background:#0A0E15;margin:0"><div id=a style="width:390px"></div><div id=b style="width:390px"></div></body></html>"""
p = pathlib.Path('/tmp/claude-0/-home-claude/e7ee067c-2ed0-51aa-a393-f8eb0e42b8a3/scratchpad/scenes_dev/rt.html'); p.write_text(html)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for reduced in (False, True):
        ctx = b.new_context(viewport={'width':420,'height':900}, reduced_motion='reduce' if reduced else 'no-preference')
        pg = ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.goto(p.as_uri())
        pg.evaluate("""([hz, rb]) => {
          window.log = [];
          window.c1 = Scenes.mount(document.getElementById('a'), hz.scene, {hotspots: hz.hotspots,
             onTap: function(id, info){ log.push('tap:' + id + ':' + info.phase); },
             onPhase: function(n){ log.push('phase1:' + n); }});
          window.c2 = Scenes.mount(document.getElementById('b'), rb, {onPhase: function(n){ log.push('phase2:' + n); }});
        }""", [hz, rb])
        pg.wait_for_timeout(300 if reduced else 4700)   # intro is 4 s
        # click on the kid hotspot and on empty ground
        ids = pg.evaluate("Array.from(document.querySelectorAll('#a [data-hs]')).map(e=>e.getAttribute('data-hs'))")
        box = pg.locator('#a [data-hs=kid]').bounding_box()
        pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2)
        abox = pg.locator('#a svg').bounding_box()
        pg.mouse.click(abox['x']+20, abox['y']+abox['height']-20)
        pg.evaluate("c1.mark('kid','ok'); c2.play('solution')")
        dur = pg.evaluate("c2.duration('solution')")
        pg.wait_for_timeout(200 if reduced else int(dur*1000)+600)
        log = pg.evaluate('log')
        # idle loop check: count rAF calls over 1.5 s for scene b after it finished (b has no blinkers? red car signals off at end)
        pg.evaluate("c1.destroy()")
        r0 = pg.evaluate('window.__raf'); pg.wait_for_timeout(1500); r1 = pg.evaluate('window.__raf')
        nsvg = pg.evaluate("document.querySelectorAll('svg.mq-scene').length")
        ids2 = pg.evaluate("Array.from(document.querySelectorAll('[id]')).map(e=>e.id).filter(i=>i.indexOf('mqs')==0).length")
        print('reduced' if reduced else 'normal', '| hotspots', ids, '| solution dur', round(dur,2))
        print('   log:', log)
        print('   rAF calls in 1.5 s after finish:', r1-r0, '| svgs left:', nsvg, '| prefixed ids:', ids2, '| errors:', errs)
        ctx.close()
    b.close()
