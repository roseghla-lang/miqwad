import json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path('/home/claude/miqwad')
ex = json.load(open(ROOT/'docs/scene_examples.json'))['scenarios']
tests = [
 {"template":"road","actors":[{"id":"me","type":"me","pos":{"dir":"up","lane":1,"y":10}},{"id":"ww","type":"car","pos":{"dir":"up","lane":1,"y":30,"heading":180}}]},
 {"template":"roundabout","actors":[{"id":"me","type":"me","pos":{"arm":"S","lane":1}},{"id":"cw","type":"car","color":"red","pos":{"ring":1,"angle":100,"heading":0}}],
  "solution":[{"t":0,"actor":"cw","path":[[8.3,-3],[6,-7],[0,-8.8],[-6,-7]],"dur":3}]},
 {"template":"crossroads","actors":[{"id":"me","type":"me","pos":{"arm":"S","lane":1}}],"solution":[{"t":0,"actor":"me","route":"S1->W","dur":3}]},
]
html = f"""<!DOCTYPE html><html><head><meta charset=utf-8><script src="{(ROOT/'src/scenes.js').as_uri()}"></script></head><body><div id=a style="width:500px"></div></body></html>"""
p = pathlib.Path('/tmp/claude-0/-home-claude/e7ee067c-2ed0-51aa-a393-f8eb0e42b8a3/scratchpad/scenes_dev/perf.html'); p.write_text(html)
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(); pg.goto(p.as_uri())
    for t in tests:
        print(pg.evaluate("s => Scenes.validate(s)", t))
    r = pg.evaluate("""(ex) => {
      var out = [];
      ex.forEach(function (sc) {
        var t0 = performance.now(); var m = Scenes.validate(sc); var t1 = performance.now();
        var c = Scenes.mount(document.getElementById('a'), sc, {autoplay:false}); var t2 = performance.now();
        var n = c.svg ? c.svg.querySelectorAll('*').length : 0; c.destroy();
        out.push(sc.id + ' validate ' + (t1-t0).toFixed(0) + ' ms, mount ' + (t2-t1).toFixed(0) + ' ms, ' + n + ' nodes');
      });
      out.push('templates: ' + Object.keys(Scenes.templates).join(','));
      out.push('inspect rb: ' + JSON.stringify(Scenes.inspect(ex[1].scene).routes.slice(0,6)));
      return out; }""", ex)
    print('\n'.join(r))
    b.close()
