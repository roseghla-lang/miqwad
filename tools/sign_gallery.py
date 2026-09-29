#!/usr/bin/env python3
"""Contact sheets + automatic checks for every sign, marking and concept-figure drawing.

Catalogues: content/signs.json, content/markings.json and content/figs.json (fig- concept figures).

usage:
  python3 tools/sign_gallery.py <outdir> [--only PREFIX[,PREFIX...]] [--ids ID,ID] [--files a.js,b.js]
                                [--per 12] [--detail ID[,ID]] [--no-png] [--quiet]

  --only     id prefixes to show, e.g. "w-" or "r-,p-" or "mk-,ev-" or "fig-road" (default: everything)
  --ids      exact ids (comma separated)
  --group    concept figure groups from content/figs.json (shape, meaning, road, car), comma separated
  --files    load only these files from src/signs/ (besides kit.js and glyphs.js), e.g. "warning.js";
             default: every src/signs/*.js in build order (a syntax error in one file only drops that file)
  --per      items per PNG sheet (default 12: 4 columns x 3 rows, readable with the Read tool)
  --detail   also save one big PNG (560 px) per listed id: <outdir>/detail_<id>.png
  --no-png   checks only (fast)
  --quiet    print only problems and the summary

Output in <outdir>: gallery.html (open it in a browser too), sheet_01.png, sheet_02.png, ... and report.json.
Each cell shows the drawing big on the dark app panel, plus 64 px and 36 px on dark and 64 px on light grey,
the id and the Arabic name. Undrawn catalogue items appear as a dashed "missing" cell.

Checks per drawn item (printed, and marked red in the sheet):
  - Signs.render must return one well-formed <svg> with a viewBox
  - no id= attributes, no <defs>, no url(#...), no gradients, no <image>, no external href
  - every rect/circle/ellipse/polygon/polyline/path carries a fill attribute; every <line> a stroke
  - every <text> carries a font-family
  - the drawing's ink stays inside its viewBox (1 unit tolerance)
  - render time, console warnings (unknown glyph names, render failures) and page errors
Exit code: 0 = no problems, 1 = at least one problem, 2 = setup error.
"""
import argparse, asyncio, html, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
CONTENT = ROOT / 'content'


def load_json(p):
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        print(f'! cannot read {p}: {e}', file=sys.stderr)
        return None


def manifest():
    items = []
    sg = load_json(CONTENT / 'signs.json') or {}
    for s in sg.get('signs', []):
        items.append({'id': s['id'], 'name': s.get('name', ''), 'cat': s.get('cat', ''), 'shape': s.get('shape', ''),
                      'kind': 'sign'})
    mk = load_json(CONTENT / 'markings.json') or {}
    for s in mk.get('items', []):
        items.append({'id': s['id'], 'name': s.get('name', ''), 'cat': s.get('cat', ''), 'shape': s.get('shape', ''),
                      'kind': 'mark'})
    fg = load_json(CONTENT / 'figs.json') or {}
    for s in fg.get('figs', []):
        items.append({'id': s['id'], 'name': s.get('name', ''), 'cat': s.get('group', ''), 'shape': '', 'kind': 'fig'})
    return items


def script_files(only_files):
    base = [SRC / 'signs' / 'kit.js', SRC / 'signs' / 'glyphs.js']
    others = sorted(p for p in (SRC / 'signs').glob('*.js') if p.name not in ('kit.js', 'glyphs.js'))
    if only_files:
        want = {f.strip() for f in only_files.split(',') if f.strip()}
        others = [p for p in others if p.name in want]
    return base + others


PAGE_JS = r"""
(function () {
 // measure only after the embedded fonts are ready (text width decides the ink-bounds check)
 (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
  var M = window.__MANIFEST, OPT = window.__OPT;
  var rep = { items: [], problems: [], drawn: 0, missing: [], extra: [] };
  var catalog = {}; M.forEach(function (m) { catalog[m.id] = m; });
  function want(id) {
    if (OPT.ids.length) return OPT.ids.indexOf(id) >= 0;
    if (!OPT.only.length) return true;
    return OPT.only.some(function (p) { return id.indexOf(p) === 0; });
  }
  var list = M.filter(function (m) { return want(m.id); });
  // registered ids that are not in the catalogue (fig- concept figures, typos)
  var regs = (window.Signs && Signs.list) ? Signs.list() : [];
  regs.forEach(function (id) {
    if (!catalog[id] && want(id)) { list.push({ id: id, name: (window.FigNames && FigNames[id]) || '', cat: 'extra', kind: 'extra' }); rep.extra.push(id); }
  });
  var holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:0;top:0;width:400px;height:400px;visibility:hidden;pointer-events:none;overflow:hidden';
  document.body.appendChild(holder);
  function check(id, s) {
    var probs = [];
    if (typeof s !== 'string' || s.indexOf('<svg') < 0) { probs.push('render returned no <svg>'); return { probs: probs }; }
    var doc = new DOMParser().parseFromString(s, 'image/svg+xml');
    if (doc.getElementsByTagName('parsererror').length) probs.push('malformed SVG markup');
    var root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg') { probs.push('root is not <svg>'); return { probs: probs }; }
    var vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(isNaN)) probs.push('missing viewBox');
    if (/\sid\s*=/.test(s)) probs.push('id attribute');
    if (/<defs/i.test(s)) probs.push('<defs>');
    if (/url\(#/i.test(s)) probs.push('url(#...) reference');
    if (/Gradient/.test(s)) probs.push('gradient');
    if (/<image/i.test(s)) probs.push('<image>');
    if (/href\s*=/.test(s)) probs.push('href attribute');
    var nf = 0, ns = 0, nt = 0;
    Array.prototype.forEach.call(root.querySelectorAll('rect,circle,ellipse,polygon,polyline,path'), function (el) {
      if (!el.hasAttribute('fill')) nf++;
    });
    Array.prototype.forEach.call(root.querySelectorAll('line'), function (el) { if (!el.hasAttribute('stroke')) ns++; });
    Array.prototype.forEach.call(root.querySelectorAll('text'), function (el) { if (!el.hasAttribute('font-family')) nt++; });
    if (nf) probs.push(nf + ' shape(s) without fill');
    if (ns) probs.push(ns + ' line(s) without stroke');
    if (nt) probs.push(nt + ' text(s) without font-family');
    // ink bounds (live DOM)
    var ink = null;
    try {
      holder.innerHTML = s;
      var sv = holder.querySelector('svg');
      if (sv) {
        sv.setAttribute('width', 400); sv.setAttribute('height', 400);
        var bb = null;
        Array.prototype.forEach.call(sv.children, function (ch) {
          if (typeof ch.getBBox !== 'function') return;
          var b; try { b = ch.getBBox(); } catch (e) { return; }
          if (!b || (b.width === 0 && b.height === 0)) return;
          // account for transforms of top-level groups
          var m = ch.transform && ch.transform.baseVal && ch.transform.baseVal.consolidate ? ch.transform.baseVal.consolidate() : null;
          var pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]];
          if (m) { var mm = m.matrix; pts = pts.map(function (p) { return [mm.a * p[0] + mm.c * p[1] + mm.e, mm.b * p[0] + mm.d * p[1] + mm.f]; }); }
          pts.forEach(function (p) {
            if (!bb) bb = { x0: p[0], y0: p[1], x1: p[0], y1: p[1] };
            bb.x0 = Math.min(bb.x0, p[0]); bb.y0 = Math.min(bb.y0, p[1]); bb.x1 = Math.max(bb.x1, p[0]); bb.y1 = Math.max(bb.y1, p[1]);
          });
        });
        if (bb && vb.length === 4) {
          ink = bb;
          var tol = 1;
          if (bb.x0 < vb[0] - tol || bb.y0 < vb[1] - tol || bb.x1 > vb[0] + vb[2] + tol || bb.y1 > vb[1] + vb[3] + tol)
            probs.push('ink outside viewBox (' + [bb.x0, bb.y0, bb.x1, bb.y1].map(function (v) { return v.toFixed(1); }).join(', ') + ' vs ' + vb.join(' ') + ')');
        }
      }
    } catch (e) { probs.push('bbox check failed: ' + e.message); }
    holder.innerHTML = '';
    return { probs: probs, vb: vb, ink: ink };
  }
  var sheets = [], per = OPT.per, cur = null;
  var wrap = document.getElementById('sheets');
  list.forEach(function (m, i) {
    if (i % per === 0) {
      cur = document.createElement('section'); cur.className = 'sheet'; cur.setAttribute('data-i', sheets.length + 1);
      cur.innerHTML = '<h2>' + (OPT.title || 'مقود') + ' · sheet ' + (sheets.length + 1) + '</h2><div class="grid"></div>';
      wrap.appendChild(cur); sheets.push(cur);
    }
    var cell = document.createElement('div'); cell.className = 'cell';
    var has = window.Signs && Signs.has && Signs.has(m.id);
    var rec = { id: m.id, name: m.name, kind: m.kind, drawn: !!has, probs: [], ms: 0 };
    var svg = '';
    if (has) {
      var t0 = performance.now();
      try { svg = Signs.render(m.id); } catch (e) { rec.probs.push('render threw: ' + e.message); }
      rec.ms = +(performance.now() - t0).toFixed(1);
      var c = check(m.id, svg); rec.probs = rec.probs.concat(c.probs || []); rec.vb = c.vb; rec.ink = c.ink;
      if (/aria-label="إشارة غير مرسومة بعد"/.test(svg)) rec.probs.push('rendered the placeholder (drawing function failed?)');
      rep.drawn++;
    } else if (m.kind !== 'extra') {
      rep.missing.push(m.id);
    }
    if (rec.probs.length) rep.problems.push({ id: m.id, probs: rec.probs });
    rep.items.push(rec);
    var esc = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    cell.className = 'cell' + (has ? '' : ' missing') + (rec.probs.length ? ' bad' : '');
    cell.innerHTML =
      '<div class="big">' + (has ? svg : '<span>missing</span>') + '</div>' +
      '<div class="smalls">' + (has ? '<span class="s64 dark">' + svg + '</span><span class="s36 dark">' + svg + '</span><span class="s64 light">' + svg + '</span>' : '') + '</div>' +
      '<div class="id">' + esc(m.id) + '</div><div class="nm" dir="rtl">' + esc(m.name || '') + '</div>' +
      (rec.probs.length ? '<div class="pr">' + esc(rec.probs.join(' · ')) + '</div>' : '');
    cur.querySelector('.grid').appendChild(cell);
  });
  holder.parentNode.removeChild(holder);
  rep.sheets = sheets.length;
  window.__report = rep;
 });
})();
"""

CSS = """
* { box-sizing: border-box; }
body { margin: 0; padding: 0; background: #1b212b; color: #EAE6DB; font: 12px/1.35 'Space Grotesk', system-ui, sans-serif; }
.sheet { width: 1180px; padding: 14px 16px 18px; background: #151b25; border-bottom: 6px solid #0a0e15; }
.sheet h2 { margin: 0 0 10px; font: 700 14px 'Space Grotesk', sans-serif; color: #97A1B4; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.cell { background: #101724; border: 1px solid #1E2A3C; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 6px; min-height: 330px; }
.cell.bad { border: 2px solid #DE9090; }
.cell.missing { opacity: .55; border-style: dashed; }
.big { width: 100%; height: 200px; display: grid; place-items: center; background: #0D131E; border-radius: 10px; padding: 10px; }
.big svg { width: 100%; height: 100%; display: block; }
.big span { color: #97A1B4; font-size: 16px; }
.smalls { display: flex; gap: 8px; align-items: flex-end; min-height: 64px; }
.smalls span { display: block; border-radius: 6px; padding: 3px; }
.smalls svg { width: 100%; height: 100%; display: block; }
.s64 { width: 64px; height: 64px; } .s36 { width: 36px; height: 36px; }
.dark { background: #0D131E; } .light { background: #C7CCD4; }
.id { font-weight: 700; font-size: 12px; color: #D9B978; word-break: break-all; direction: ltr; text-align: right; }
.nm { font-family: 'Readex Pro', sans-serif; font-size: 12px; color: #EAE6DB; }
.pr { color: #DE9090; font-size: 11px; }
.detail { width: 600px; height: 600px; padding: 20px; background: #0D131E; }
.detail svg { width: 100%; height: 100%; display: block; }
"""


def build_page(out, args, files):
    man = manifest()
    ids = [p.strip() for p in (args.ids or '').split(',') if p.strip()]
    groups = [g.strip() for g in (args.group or '').split(',') if g.strip()]
    if groups:
        ids += [m['id'] for m in man if m['kind'] == 'fig' and m['cat'] in groups]
    opt = {'only': [p.strip() for p in (args.only or '').split(',') if p.strip()],
           'ids': ids,
           'per': max(1, args.per), 'title': html.escape(args.title or '')}
    fonts = (SRC / 'fonts.css').as_uri()
    tags = '\n'.join('<script src="%s"></script>' % p.as_uri() for p in files)
    # right-to-left like the app (SVG text inherits direction, and text-anchor start/end flip in RTL)
    page = ('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Sign gallery</title>'
            '<link rel="stylesheet" href="%s"><style>%s</style></head><body><div id="sheets"></div>'
            '<div id="detail"></div>'
            '<script>window.__MANIFEST=%s;window.__OPT=%s;</script>\n%s\n<script>%s</script></body></html>') % (
        fonts, CSS, json.dumps(man, ensure_ascii=False), json.dumps(opt, ensure_ascii=False), tags, PAGE_JS)
    p = out / 'gallery.html'
    p.write_text(page, encoding='utf-8')
    return p


async def run(args):
    out = pathlib.Path(args.outdir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    files = script_files(args.files)
    page_path = build_page(out, args, files)
    from playwright.async_api import async_playwright
    logs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1180, 'height': 900}, device_scale_factor=1)
        page = await ctx.new_page()
        page.on('console', lambda m: logs.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
        await page.goto(page_path.as_uri())
        await page.wait_for_function('window.__report !== undefined', timeout=60000)
        await page.evaluate('document.fonts ? document.fonts.ready : null')
        await page.wait_for_timeout(250)
        rep = await page.evaluate('window.__report')
        if not args.no_png:
            for f in out.glob('sheet_*.png'):
                f.unlink()
            els = await page.query_selector_all('.sheet')
            for i, el in enumerate(els, 1):
                await el.screenshot(path=str(out / f'sheet_{i:02d}.png'))
            for did in [d.strip() for d in (args.detail or '').split(',') if d.strip()]:
                ok = await page.evaluate('''(id) => { var d = document.getElementById('detail');
                    if (!window.Signs || !Signs.has(id)) return false;
                    d.innerHTML = '<div class="detail">' + Signs.render(id) + '</div>'; return true; }''', did)
                if ok:
                    el = await page.query_selector('#detail .detail')
                    await el.screenshot(path=str(out / f'detail_{did}.png'))
                else:
                    logs.append(f'detail: {did} is not drawn')
        await browser.close()
    rep['logs'] = logs
    (out / 'report.json').write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding='utf-8')
    bad = 0
    if not args.quiet:
        for it in rep['items']:
            flag = 'ok  ' if it['drawn'] and not it['probs'] else ('MISS' if not it['drawn'] else 'BAD ')
            print(f"[{flag}] {it['id']:<34} {it.get('ms', 0):>6} ms  {' · '.join(it['probs'])}")
    else:
        for pr in rep['problems']:
            print(f"[BAD ] {pr['id']}: {' · '.join(pr['probs'])}")
    for l in logs:
        print('  ' + l)
    bad = len(rep['problems']) + len([l for l in logs if 'pageerror' in l or 'console.error' in l or 'console.warning' in l])
    total = len(rep['items'])
    print(f"{total} items shown, {rep['drawn']} drawn, {len(rep['missing'])} missing, {len(rep['problems'])} with problems, "
          f"{len(logs)} console messages, {rep.get('sheets', 0)} sheet(s) -> {out}")
    if rep['extra']:
        print('registered ids outside the catalogue: ' + ', '.join(rep['extra']))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('outdir')
    ap.add_argument('--only', default='')
    ap.add_argument('--ids', default='')
    ap.add_argument('--group', default='')
    ap.add_argument('--files', default='')
    ap.add_argument('--per', type=int, default=12)
    ap.add_argument('--detail', default='')
    ap.add_argument('--title', default='')
    ap.add_argument('--no-png', action='store_true')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()
    try:
        code = asyncio.run(run(a))
    except Exception as e:
        print(f'! gallery failed: {e}', file=sys.stderr)
        code = 2
    sys.exit(code)


if __name__ == '__main__':
    main()
