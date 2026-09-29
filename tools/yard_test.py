#!/usr/bin/env python3
"""Headless checks for the yard simulator (src/yard.js), driven through tools/yard_test.html.

usage:
  python3 tools/yard_test.py [--out DIR] [--only parallel,hill-start] [--no-shots] [--landscape-all]

(a) screenshots of every exercise at start: desktop 1280x860, iPhone 390x844 (DPR 2, touch) and one landscape phone 844x390
(b) robot driver: runs each exercise's demo program through the SAME inputs a learner uses (ctl._test.runDemo) in TEST mode.
    parallel, reverse-bay, hill-start and emergency-stop MUST pass; the others are reported too.
    Also runs the parallel demo in LEARN mode and checks that the coach reached its last step.
(c) input + lifecycle: gear change needs the brake, keyboard driving, touch pedal + gear + wheel drag,
    pause when the tab is hidden, destroy() removes every window/document listener, phone layout fits the screen
(d) no console errors, console warnings or page errors anywhere
Exit code 0 when every required check passes. Screenshots go to --out (default: a temp folder, printed at the end).
"""
import argparse, json, pathlib, sys, tempfile

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
HARNESS = (ROOT / 'tools' / 'yard_test.html').resolve().as_uri()
REQUIRED = ['parallel', 'reverse-bay', 'hill-start', 'emergency-stop']
DESKTOP = dict(viewport={'width': 1280, 'height': 860}, device_scale_factor=1)
PHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
PHONE_LAND = dict(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True)

# counts window/document listeners so we can prove destroy() cleans up
SPY = """(() => {
  const c = {}; window.__lc = c;
  const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (t, f, o) { if (this === window || this === document) c[t] = (c[t] || 0) + 1; return add.call(this, t, f, o); };
  EventTarget.prototype.removeEventListener = function (t, f, o) { if (this === window || this === document) c[t] = (c[t] || 0) - 1; return rem.call(this, t, f, o); };
})();"""


class Checks:
    def __init__(self):
        self.rows, self.errors = [], []

    def ok(self, name, cond, detail='', required=True):
        self.rows.append((name, bool(cond), detail, required))
        print(('PASS ' if cond else ('FAIL ' if required else 'warn ')) + name + (('  ' + detail) if detail else ''))

    def attach(self, page, tag):
        page.on('console', lambda m: self.errors.append(f'[{tag}] console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: self.errors.append(f'[{tag}] pageerror: {e}'))


def open_page(browser, ck, ctx_opts, tag):
    ctx = browser.new_context(**ctx_opts)
    ctx.add_init_script(SPY)
    page = ctx.new_page()
    ck.attach(page, tag)
    return ctx, page


def load(page, ex, mode='learn', extra=''):
    page.goto(f'{HARNESS}?bare=1&ex={ex}&mode={mode}&seed=7&sound=0{extra}')
    page.wait_for_function('window.ctl && window.ctl.state && window.ctl.state()')
    page.wait_for_timeout(120)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(pathlib.Path(tempfile.gettempdir()) / 'miqwad_yard_shots'))
    ap.add_argument('--only', default='')
    ap.add_argument('--no-shots', action='store_true')
    ap.add_argument('--landscape-all', action='store_true')
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    ck = Checks()

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx, page = open_page(browser, ck, DESKTOP, 'desktop')
        load(page, 'parallel')
        ids = page.evaluate('Yard.exercises.map(e => e.id)')
        if a.only:
            ids = [i for i in ids if i in a.only.split(',')]
        ck.ok('exercise list', len(ids) >= 10 or a.only, ', '.join(ids))

        # (a) screenshots at start
        if not a.no_shots:
            for ex in ids:
                load(page, ex)
                page.wait_for_timeout(600)
                page.screenshot(path=str(out / f'desktop_{ex}.png'))
            pctx, ppage = open_page(browser, ck, PHONE, 'phone')
            for ex in ids:
                load(ppage, ex)
                ppage.wait_for_timeout(600)
                ppage.screenshot(path=str(out / f'phone_{ex}.png'))
                fit = ppage.evaluate("""() => {
                    const r = ctl.element.getBoundingClientRect(), c = ctl.element.querySelector('.yd-ctl').getBoundingClientRect();
                    const st = ctl.element.querySelector('.yd-stage').getBoundingClientRect();
                    return {sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, ctlBottom: c.bottom, ctlRight: c.right, stageH: st.height, touch: ctl.element.classList.contains('yd-touch')};
                }""")
                ck.ok(f'phone layout fits ({ex})', fit['touch'] and fit['sw'] <= fit['iw'] and fit['ctlBottom'] <= fit['ih'] + 0.5 and fit['ctlRight'] <= fit['iw'] + 0.5 and fit['stageH'] >= 200, json.dumps(fit))
            pctx.close()
            lctx, lpage = open_page(browser, ck, PHONE_LAND, 'landscape')
            for ex in (ids if a.landscape_all else [i for i in ('parallel', 'hill-start') if i in ids]):
                load(lpage, ex)
                lpage.wait_for_timeout(600)
                lpage.screenshot(path=str(out / f'landscape_{ex}.png'))
            lctx.close()

        # (b) robot driver through the real inputs, TEST mode
        robot = {}
        for ex in ids:
            load(page, ex, 'test')
            has = page.evaluate('!!ctl._test.instance().demo')
            if not has:
                continue
            r = page.evaluate('ctl._test.runDemo(300)')
            res = r.get('result') or {}
            fin = page.evaluate('window.results.length ? window.results[window.results.length - 1] : null')
            robot[ex] = res
            detail = f"score {res.get('score')} time {res.get('time')}s mistakes {[m['code'] for m in res.get('mistakes', [])]} stats {json.dumps(res.get('stats', {}), ensure_ascii=False)}"
            if r.get('fail'):
                detail += ' robot: ' + r['fail']
            ck.ok(f'robot passes {ex} (test mode)', bool(res.get('passed')) and fin is not None and fin.get('score') == res.get('score'), detail, required=ex in REQUIRED)
            if not a.no_shots:
                page.wait_for_timeout(250)
                page.screenshot(path=str(out / f'result_{ex}.png'))
        for ex in REQUIRED:
            if ex in ids:
                ck.ok(f'required robot run present: {ex}', ex in robot)

        # learn mode: coach steps follow the robot to the end
        if 'parallel' in ids:
            load(page, 'parallel', 'learn')
            r = page.evaluate('ctl._test.runDemo(300)')
            steps = page.evaluate('ctl._test.instance().steps.length')
            ck.ok('learn mode coach reaches the last step (parallel)', r['state']['step'] >= steps - 1 and r['ok'], f"step {r['state']['step']} of {steps}")

        # (c) inputs and lifecycle
        load(page, 'parallel', 'test')
        g = page.evaluate("""() => { const t = ctl._test; const a = t.press('gear', 'D'); const g1 = t.state().gear;
            t.set({brk: 1}); t.step(0.5); const b = t.press('gear', 'D'); return {noBrake: a, gearAfter: g1, withBrake: b, gear: t.state().gear, hint: window.events.includes('hint')}; }""")
        ck.ok('gear change refused without brake, accepted with brake', g['noBrake'] is False and g['gearAfter'] == 'P' and g['withBrake'] and g['gear'] == 'D' and g['hint'], json.dumps(g))
        load(page, 'parallel', 'learn')
        page.keyboard.down('ArrowDown'); page.wait_for_timeout(250)
        page.keyboard.press('KeyD'); page.keyboard.press('KeyM')
        page.keyboard.up('ArrowDown'); page.wait_for_timeout(200)
        page.keyboard.down('ArrowUp'); page.wait_for_timeout(1400); page.keyboard.up('ArrowUp')
        page.keyboard.down('ArrowLeft'); page.wait_for_timeout(600); page.keyboard.up('ArrowLeft')
        kb = page.evaluate('ctl.state()')
        ck.ok('keyboard: brake + D + M + accelerator + steer', kb['gear'] == 'D' and kb['dist'] > 1.0 and kb['steer'] > 0.3, f"gear {kb['gear']} dist {kb['dist']:.2f} steer {kb['steer']:.2f} kmh {kb['kmh']:.1f}")
        page.keyboard.press('Escape')
        ck.ok('Esc pauses', page.evaluate("ctl.element.querySelector('.yd-pause').classList.contains('on')"))
        page.keyboard.press('Escape')
        # hidden tab pauses
        hid = page.evaluate("""() => { Object.defineProperty(document, 'hidden', {value: true, configurable: true});
            document.dispatchEvent(new Event('visibilitychange'));
            const on = ctl.element.querySelector('.yd-pause').classList.contains('on');
            Object.defineProperty(document, 'hidden', {value: false, configurable: true}); return on; }""")
        ck.ok('pauses when the tab is hidden', hid)
        # destroy removes listeners
        lc = page.evaluate("""() => { const before = Object.assign({}, window.__lc); const el = ctl.element; ctl.destroy();
            const after = Object.assign({}, window.__lc); let err = null;
            try { window.dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowUp'})); } catch (e) { err = String(e); }
            return {before, after, attached: document.contains(el), err}; }""")
        drop = {k: lc['before'].get(k, 0) - lc['after'].get(k, 0) for k in ('keydown', 'keyup', 'blur', 'visibilitychange')}
        ck.ok('destroy() removes key/blur/visibility listeners and the DOM', all(v == 1 for v in drop.values()) and not lc['attached'] and not lc['err'], json.dumps(drop))
        ctx.close()

        # touch: pedal + gear with two fingers, wheel drag
        tctx, tpage = open_page(browser, ck, PHONE, 'touch')
        load(tpage, 'parallel', 'learn')
        tt = tpage.evaluate("""() => {
            const root = ctl.element, brk = root.querySelector('.yd-pd.brk'), d = root.querySelector('.yd-gb[data-g=D]'), wh = root.querySelector('.yd-wheel');
            const ev = (el, type, id, x, y) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y}));
            const b = brk.getBoundingClientRect(); ev(brk, 'pointerdown', 1, b.x + 20, b.y + 20);
            ctl._test.step(0.4);
            const g = d.getBoundingClientRect(); ev(d, 'pointerdown', 2, g.x + 10, g.y + 10); ev(d, 'pointerup', 2, g.x + 10, g.y + 10);
            const gear = ctl.state().gear;
            ev(brk, 'pointerup', 1, b.x + 20, b.y + 20);
            const w = wh.getBoundingClientRect(), cx = w.x + w.width / 2, cy = w.y + w.height / 2, r = w.width * 0.4;
            ev(wh, 'pointerdown', 3, cx, cy - r);
            for (let i = 1; i <= 12; i++) { const a = -Math.PI / 2 + i * (Math.PI / 24); ev(wh, 'pointermove', 3, cx + r * Math.cos(a), cy + r * Math.sin(a)); }
            ev(wh, 'pointerup', 3, cx + r, cy);
            ctl._test.step(1.0);
            return {gear, steer: ctl.state().steer, brk: ctl._test.sim().input.brk};
        }""")
        ck.ok('touch: brake pedal held + tap D, then wheel drag steers right', tt['gear'] == 'D' and tt['steer'] < -0.1 and tt['brk'] == 0, json.dumps(tt))
        tctx.close()
        browser.close()

    ck.ok('no console errors / warnings / page errors', not ck.errors, '; '.join(ck.errors[:8]))
    failed = [r for r in ck.rows if r[3] and not r[1]]
    print(f'\n{len(ck.rows) - len(failed)}/{len(ck.rows)} checks passed. Screenshots: {out}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
