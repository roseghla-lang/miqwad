#!/usr/bin/env python3
"""End-to-end smoke test for the مقود app shell (Playwright + Chromium).

usage:
  python3 tools/app_smoke.py [page.html] [--desktop] [--both] [--headed] [--allow REGEX ...] [--shots DIR]

Walks: home -> first lesson (learn cards, then practice: one right answer, one wrong answer,
one answer by keyboard) -> result -> signs library + detail sheet + search -> flashcards ->
mock exam (answer, flag, grid, in-page submit confirmation, results) -> review -> export
progress code -> import it back -> reload and confirm progress persisted.

Fails (exit 1) on any console error, uncaught page error, failed step, or horizontal page overflow.
--allow REGEX ignores matching console/page errors (e.g. a module another agent is still writing).
Default page: dist/index.html next to this script's parent folder.
"""
import argparse, asyncio, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Fail(Exception):
    pass


async def run(page_path, viewport, allow, shots, headed):
    from playwright.async_api import async_playwright
    url = pathlib.Path(page_path).resolve().as_uri()
    errors, log = [], []

    def note(msg):
        log.append(msg)
        print('  ' + msg)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not headed)
        if viewport == 'mobile':
            ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        else:
            ctx = await browser.new_context(viewport={'width': 1440, 'height': 900})
        await ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        page = await ctx.new_page()

        def on_console(m):
            if m.type == 'error':
                errors.append('console.error: ' + m.text)

        page.on('console', on_console)
        page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))

        async def js(code, arg=None):
            return await page.evaluate(code, arg) if arg is not None else await page.evaluate(code)

        async def shot(name):
            if shots:
                pathlib.Path(shots).mkdir(parents=True, exist_ok=True)
                await page.screenshot(path=str(pathlib.Path(shots) / f'{viewport}_{name}.png'))

        async def click(sel, timeout=4000):
            await page.click(sel, timeout=timeout)
            await page.wait_for_timeout(160)

        async def expect(sel, what, timeout=4000):
            try:
                await page.wait_for_selector(sel, timeout=timeout, state='visible')
            except Exception:
                raise Fail(f'{what}: "{sel}" not visible')

        async def no_overflow(where):
            w = await js('() => [document.documentElement.scrollWidth, window.innerWidth]')
            if w[0] > w[1] + 1:
                raise Fail(f'horizontal overflow on {where}: scrollWidth {w[0]} > {w[1]}')

        async def screen():
            return await js('() => window.Miqwad && Miqwad.screen()')

        async def answer(correct=True, keyboard=False):
            pk = await js('() => Miqwad.peek()')
            if pk.get('screen') not in ('play', 'examRun') or 'correct' not in pk:
                raise Fail('expected a question, got ' + str(pk))
            if pk.get('type') == 'sctap':
                return pk
            n = await js('() => document.querySelectorAll(".opt").length')
            idx = pk['correct'] if correct else (pk['correct'] + 1) % max(n, 2)
            if keyboard:
                await page.keyboard.press(str(idx + 1))
            else:
                await page.locator('.opt').nth(idx).click()
            await page.wait_for_timeout(160)
            return pk

        await page.goto(url)
        await page.wait_for_timeout(500)
        # start from a clean profile
        await js('() => { try { localStorage.removeItem("miqwad.v1"); } catch (e) {} }')
        await page.reload()
        await page.wait_for_timeout(500)

        # 1. home (first open shows a complete welcome state)
        await expect('.hero', 'home hero')
        if await js('() => document.documentElement.dir') != 'rtl':
            raise Fail('documentElement dir is not rtl')
        gauges = await js('() => document.querySelectorAll(".gauge").length')
        if gauges != 4:
            raise Fail(f'expected 4 readiness gauges, got {gauges}')
        await expect('[data-act=start]', 'welcome start button')
        await no_overflow('home')
        await shot('01_home')
        note('home ok (welcome state, 4 gauges)')

        # 2. open the first lesson
        await click('[data-act=start]')
        scr = await screen()
        if scr == 'lesson':
            for _ in range(200):
                if await js('() => !!document.querySelector("[data-act=lnext]")'):
                    await click('[data-act=lnext]')
                else:
                    break
            await shot('02_learn_last')
            await click('.actbar [data-act=lpractice]')
            scr = await screen()
        elif scr == 'yardGuide':
            await click('[data-act=yardGuideDone]')
            raise Fail('first lesson is a yard guide; smoke test expects a lesson with questions first')
        if scr != 'play':
            raise Fail('practice did not start, screen=' + str(scr))
        note('lesson learn phase ok, practice started')

        # 3. answer: right, wrong, keyboard, then finish
        await answer(True)
        await expect('.fb-ok', 'feedback after a right answer')
        await shot('03_right')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(200)
        await answer(False)
        await expect('.fb-bad', 'feedback after a wrong answer')
        await shot('04_wrong')
        await click('[data-act=qn]')
        await answer(True, keyboard=True)
        await expect('.fb', 'feedback after a keyboard answer')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(160)
        for _ in range(60):
            pk = await js('() => Miqwad.peek()')
            if pk.get('screen') != 'play' or 'correct' not in pk:
                break
            if not pk.get('answered'):
                await answer(True)
            await click('[data-act=qn]')
        await expect('.res', 'lesson result')
        await no_overflow('lesson result')
        await shot('05_result')
        st = await js('() => { const s = Miqwad.state(); return { km: s.km, items: Object.keys(s.items).length, missed: Object.values(s.items).filter(r => r.x > 0).length, lessons: Object.keys(s.lessons).length }; }')
        if st['km'] <= 0 or st['items'] < 2 or st['missed'] < 1 or st['lessons'] < 1:
            raise Fail('progress not recorded after the lesson: ' + str(st))
        note(f'lesson finished: {st}')
        # close a unit celebration if one opened
        if await js('() => !!document.querySelector(".cel:not([hidden])")'):
            await click('.cel [data-act=celClose]')

        # 4. signs library, detail sheet, search
        await js('() => Miqwad.tab("signs")')
        await page.wait_for_timeout(300)
        n_tiles = await js('() => document.querySelectorAll(".sg").length')
        if n_tiles < 1:
            raise Fail('signs library shows no tiles')
        await click('.sg')
        await expect('.sheet .info', 'sign detail sheet')
        await shot('06_sign_sheet')
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(200)
        if await js('() => !document.querySelector(".sheet-wrap").hidden'):
            raise Fail('Escape did not close the sheet')
        await page.fill('#lib-q', 'قف')
        await page.wait_for_timeout(400)
        found = await js('() => document.querySelectorAll(".sg").length')
        if found < 1:
            raise Fail('search for "قف" found nothing')
        await page.fill('#lib-q', '')
        await page.wait_for_timeout(300)
        await no_overflow('signs')
        note(f'signs library ok ({n_tiles} tiles, search ok)')

        # 5. flashcards (needs at least one drawn sign)
        drawn = await js('() => (DATA.signs && DATA.signs.signs || []).filter(s => Signs.has(s.id)).length')
        if drawn:
            await click('[data-act=flashLib]')
            await expect('.fc', 'flashcard')
            await click('.fc')
            await expect('[data-act=fcYes]', 'flashcard answer buttons')
            await shot('07_flash')
            await click('[data-act=fcYes]')
            note('flashcards ok')
        else:
            note('flashcards skipped: no drawn signs yet')

        # 6. mock exam: start, answer, flag, grid, submit with in-page confirmation
        await js('() => Miqwad.tab("exam")')
        await page.wait_for_timeout(300)
        await click('[data-act=examReady]')
        await expect('.sheet [data-act=cfmOk]', 'exam start confirmation')
        await click('.sheet [data-act=cfmOk]')
        if await screen() != 'examRun':
            raise Fail('exam did not start')
        await answer(True, keyboard=True)
        await click('[data-act=xnext]')
        await answer(False)
        await click('[data-act=xflag]')
        await click('[data-act=xnext]')
        await answer(True)
        await no_overflow('exam')
        await shot('08_exam')
        await click('[data-act=xgrid]')
        await expect('.xgrid', 'exam question grid')
        await click('.sheet [data-act=xsubmit]')
        await expect('.sheet [data-act=cfmOk]', 'submit confirmation')
        await shot('09_exam_confirm')
        await click('.sheet [data-act=cfmOk]')
        await expect('.xres-top', 'exam result')
        await shot('10_exam_result')
        ex = await js('() => Miqwad.state().exams.length')
        if ex < 1:
            raise Fail('exam result not stored')
        note('mock exam ok (answered, flagged, submitted, result stored)')

        # 7. review
        await js('() => Miqwad.tab("review")')
        await page.wait_for_timeout(300)
        await expect('.bays', 'review boxes')
        if await js('() => document.querySelectorAll(".bay").length') != 5:
            raise Fail('review should show 5 Leitner boxes')
        await no_overflow('review')
        await shot('11_review')
        note('review ok')

        # 8. export the progress code, then import it back
        await js('() => Miqwad.tab("settings")')
        await page.wait_for_timeout(300)
        await click('[data-act=exportCode]')
        await page.wait_for_function('() => { const t = document.querySelector("#export-code"); return t && t.value.length > 20; }', timeout=5000)
        code = await js('() => document.querySelector("#export-code").value')
        if not re.match(r'^MQZ?1\.', code):
            raise Fail('export code has an unexpected format')
        await click('[data-act=copyCode]')
        before = await js('() => ({ km: Miqwad.state().km, items: Object.keys(Miqwad.state().items).length, exams: Miqwad.state().exams.length })')
        await page.fill('#import-code', code)
        await click('[data-act=importCode]')
        await expect('.sheet [data-act=cfmOk]', 'import confirmation')
        await click('.sheet [data-act=cfmOk]')
        await page.wait_for_timeout(300)
        after = await js('() => ({ km: Miqwad.state().km, items: Object.keys(Miqwad.state().items).length, exams: Miqwad.state().exams.length })')
        if after != before:
            raise Fail(f'import changed the progress: {before} -> {after}')
        note(f'export/import ok ({len(code)} chars, {before})')

        # 9. reload and confirm progress persisted
        await js('() => Miqwad.flush()')
        await page.reload()
        await page.wait_for_timeout(600)
        again = await js('() => ({ km: Miqwad.state().km, items: Object.keys(Miqwad.state().items).length, exams: Miqwad.state().exams.length, onboarded: Miqwad.state().onboarded })')
        if again['km'] != before['km'] or again['items'] != before['items'] or again['exams'] != before['exams'] or not again['onboarded']:
            raise Fail(f'progress not persisted across reload: {before} vs {again}')
        if await js('() => !!document.querySelector(".hero-w")'):
            raise Fail('welcome state shown again after reload')
        await no_overflow('home after reload')
        await shot('12_home_after_reload')
        note('reload ok, progress persisted')

        await browser.close()

    bad = [e for e in errors if not any(re.search(a, e) for a in allow)]
    for e in errors:
        print(('  IGNORED ' if e not in bad else '  ERROR ') + e[:300])
    if bad:
        raise Fail(f'{len(bad)} console/page error(s)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('page', nargs='?', default=str(ROOT / 'dist' / 'index.html'))
    ap.add_argument('--desktop', action='store_true')
    ap.add_argument('--both', action='store_true')
    ap.add_argument('--headed', action='store_true')
    ap.add_argument('--allow', action='append', default=[])
    ap.add_argument('--shots', default='')
    a = ap.parse_args()
    views = ['mobile', 'desktop'] if a.both else ['desktop' if a.desktop else 'mobile']
    ok = True
    for v in views:
        print(f'[{v}] {a.page}')
        try:
            asyncio.run(run(a.page, v, a.allow, a.shots, a.headed))
            print(f'[{v}] PASS')
        except Fail as e:
            ok = False
            print(f'[{v}] FAIL: {e}')
        except Exception as e:  # playwright errors, timeouts
            ok = False
            print(f'[{v}] FAIL: {type(e).__name__}: {e}')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
