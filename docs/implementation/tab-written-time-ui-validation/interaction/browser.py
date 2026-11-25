from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json, re, traceback

OUT = Path(__file__).parent
results = []
def view(p): return p.get_by_role('button', name='View written time', exact=True)
def panel(p): return p.get_by_role('region', name='Written time', exact=True)
def cell(p, n=1): return p.locator(f'button[aria-label^="String 1, onset {n},"]')
def fret(p): return p.get_by_role('textbox', name='Fret for string 1, onset 1')
def editor(p, n=1): return p.get_by_role('button', name=re.compile(fr'^Edit position {n},'))
def start(p): return p.get_by_role('textbox', name='Start numerator')
def check(p): return p.get_by_role('button', name='Check timing', exact=True)
def next_point(p): return panel(p).get_by_role('button', name='Next written time point')
def previous_page(p): return panel(p).get_by_role('button', name='Previous written notes page')
def close(p): return panel(p).get_by_role('button', name='Close written time')
def progress(p): return {'page':panel(p).get_by_text(re.compile(r'^Page \d+ of')).inner_text(), 'point':panel(p).get_by_text(re.compile(r'^Point \d+ of')).inner_text()}
def open_app(p):
    p.goto('http://127.0.0.1:3000',wait_until='networkidle')
    p.get_by_text('Analyze tab',exact=True).click()
def source(n=9,bars=False):
    row='-'.join(['5']*n)
    if bars: return '\n'.join(name+'|'+('5|7' if i==0 else '-|-')+'|' for i,name in enumerate(['e','B','G','D','A','E']))
    return '\n'.join(name+'|'+(row if i==0 else '-'*len(row))+'|' for i,name in enumerate(['e','B','G','D','A','E']))
def import_source(p,text):
    if not p.get_by_role('textbox',name='Paste or write a six-string tab').count():p.get_by_role('button',name='Import text',exact=True).click()
    p.get_by_role('textbox',name='Paste or write a six-string tab').fill(text)
    p.get_by_role('button',name='Import tab',exact=True).click()
def selected_score(p):
    return p.evaluate('''()=>({labels:[...document.querySelectorAll('[role="gridcell"] button')].map(e=>e.getAttribute('aria-label')),
      selected:[...document.querySelectorAll('[role="gridcell"][aria-selected="true"] button')].map(e=>e.getAttribute('aria-label')),
      columns:[...document.querySelectorAll('[data-column-header][aria-pressed="true"]')].map(e=>e.getAttribute('aria-label'))})''')
def seed_timed(p):
    import_source(p,source())
    last_before=None
    for i in range(9):
        p.locator('[data-column-header]').nth(i).click()
        editor(p,i+1).click()
        start(p).fill(str(i*5));p.get_by_role('button',name='Set start',exact=True).click()
        if i==8:last_before=cell(p,9).get_attribute('aria-label')
        p.get_by_role('button',name='Next Duration',exact=True).click() # Unknown -> Whole, a single explicit edit.
        p.get_by_role('button',name='Close position editor',exact=True).click()
    p.locator('[data-column-header]').first.click()
    return last_before
def set_guard_state(p):
    view(p).click()
    panel(p).get_by_role('button',name='Next written notes page').click()
    next_point(p).click()
    assert progress(p)=={'page':'Page 2 of 2','point':'Point 2 of 18'}
def actions(p):
    return [view(p),close(p),previous_page(p),next_point(p),
            panel(p).get_by_text('About written time',exact=True),panel(p).get_by_text('Details',exact=True),check(p)]

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [390,768,1335]:
        ctx=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',has_touch=width==390)
        p=ctx.new_page();p.set_default_timeout(15000)
        errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        activate=lambda e:e.tap() if width==390 else e.click()
        p.add_init_script('''window.p3Events=[];for(const type of ['pointerdown','blur','focus','keydown','compositionstart','compositionupdate','compositionend','input','click'])document.addEventListener(type,e=>window.p3Events.push({type,trusted:e.isTrusted,key:e.key,composing:e.isComposing,data:e.data,pointerType:e.pointerType,label:e.target.getAttribute?.('aria-label')||e.target.textContent?.trim().slice(0,60),value:e.target.value}),true);''')
        passed=[]
        try:
            open_app(p);last_before=seed_timed(p);before=selected_score(p)
            expect(panel(p)).to_have_count(0);view(p).click();expect(view(p)).to_have_attribute('aria-expanded','true')
            expect(panel(p).get_by_text('Written timing',exact=True)).to_be_visible()
            expect(panel(p).get_by_role('list',name='Written notes').locator('li')).to_have_count(8)
            next_point(p).click();expect(panel(p).get_by_text('No written notes at this point',exact=True)).to_be_visible()
            panel(p).get_by_role('button',name='Next written notes page').click()
            expect(panel(p).get_by_role('list',name='Written notes').locator('li')).to_have_count(1)
            previous_page(p).click()
            while next_point(p).is_enabled():next_point(p).click()
            expect(panel(p).get_by_text('Outside observed range',exact=True)).to_be_visible()
            assert selected_score(p)==before
            passed.append('complete gap/final boundary, paging and point movement preserve score and selection')
            close(p).press('Escape');expect(panel(p)).to_have_count(0);expect(view(p)).to_be_focused();expect(view(p)).to_have_attribute('aria-expanded','false')
            passed.append('clean panel Escape closes and returns View focus')

            for text in ['12','37']:
                set_guard_state(p);cell(p).click();fret(p).fill(text);state=progress(p);original=cell(p).get_attribute('aria-label')
                for action in actions(p):
                    fret(p).focus();activate(action);expect(fret(p)).to_have_value(text);expect(fret(p)).to_be_focused()
                    assert progress(p)==state and cell(p).get_attribute('aria-label')==original
                for action in [view(p),close(p),previous_page(p),next_point(p)]:
                    action.focus();action.press('Enter');action.press('Space');expect(fret(p)).to_have_value(text)
                    assert progress(p)==state and cell(p).get_attribute('aria-label')==original
                close(p).focus();close(p).press('Escape');expect(panel(p)).to_have_count(1);expect(fret(p)).to_have_value(text)
                fret(p).press('Escape');expect(cell(p)).to_be_focused();close(p).focus();close(p).press('Escape')
                expect(panel(p)).to_have_count(0);expect(view(p)).to_be_focused()
            passed.append('valid/invalid fret pointer, keyboard, panel Escape guards without commit/discard')

            set_guard_state(p);editor(p).click();start(p).fill('99');state=progress(p)
            for action in actions(p):
                start(p).focus();activate(action);expect(start(p)).to_have_value('99');expect(start(p)).to_be_focused();assert progress(p)==state
            for _ in range(120):
                if view(p).evaluate('(e)=>e===document.activeElement'):break
                p.keyboard.press('Shift+Tab')
            expect(view(p)).to_be_focused();view(p).press('Enter');view(p).press('Space');expect(start(p)).to_have_value('99');assert progress(p)==state
            close(p).focus();close(p).press('Escape');expect(panel(p)).to_have_count(1);expect(start(p)).to_have_value('99')
            p.get_by_role('button',name='Cancel start input').click();expect(start(p)).to_have_value('0')
            p.get_by_role('button',name='Close position editor').click()
            passed.append('fraction actual Shift+Tab and pointer panel actions preserve unapplied value')

            cdp=ctx.new_cdp_session(p)
            cell(p).click();p.keyboard.press('Control+A');p.evaluate('window.p3Events=[]')
            cdp.send('Input.imeSetComposition',{'text':'12','selectionStart':2,'selectionEnd':2})
            for action in [view(p),close(p),previous_page(p),next_point(p)]:activate(action)
            expect(fret(p)).to_have_value('12');expect(fret(p)).to_be_focused();assert progress(p)==state
            cdp.send('Input.insertText',{'text':'12'});expect(fret(p)).to_have_value('12');assert progress(p)==state
            for action in [view(p),close(p),previous_page(p),next_point(p)]:activate(action)
            expect(fret(p)).to_have_value('12');assert progress(p)==state
            ime_events=p.evaluate('window.p3Events.splice(0)');assert any(e['type']=='compositionstart' and e['trusted'] for e in ime_events)
            fret(p).press('Escape')
            editor(p).click();start(p).click();p.keyboard.press('Control+A')
            cdp.send('Input.imeSetComposition',{'text':'3','selectionStart':1,'selectionEnd':1})
            start(p).press('Escape');expect(start(p)).to_have_count(1)
            start(p).click();p.keyboard.press('Control+A');cdp.send('Input.imeSetComposition',{'text':'3','selectionStart':1,'selectionEnd':1})
            for action in [view(p),close(p),previous_page(p),next_point(p)]:activate(action)
            expect(start(p)).to_have_value('3');expect(start(p)).to_be_focused();assert progress(p)==state
            cdp.send('Input.insertText',{'text':'3'});expect(start(p)).to_have_value('3');assert progress(p)==state
            p.get_by_role('button',name='Cancel start input').click();expect(start(p)).to_have_value('0');p.get_by_role('button',name='Close position editor').click()
            passed.append('native CDP IME and composing Escape; no deferred View/page/point action')

            # All actions above are local UI operations, so one Undo still reaches the
            # last explicit source edit, rather than a View/query/page history record.
            p.get_by_role('button',name='Undo',exact=True).click()
            assert cell(p,9).get_attribute('aria-label')==last_before
            expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
            p.get_by_role('button',name='Redo',exact=True).click();expect(panel(p)).to_have_count(0)
            view(p).click();expect(panel(p)).to_have_count(1)
            passed.append('panel actions create no history edit; Undo invalidates and Redo never resurrects')

            p.get_by_text('Context',exact=True).click();p.get_by_role('button',name='Set a key',exact=True).click()
            expect(panel(p)).to_have_count(1);expect(view(p)).to_have_attribute('aria-expanded','true')
            p.get_by_role('button',name=re.compile('^Use explored ')).click();expect(panel(p)).to_have_count(1)
            p.get_by_role('spinbutton',name='Tuning',exact=True).press('ArrowRight')
            expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
            view(p).click();p.get_by_role('slider',name='Capo fret').press('ArrowRight')
            expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
            passed.append('unrelated key/scale context retains; retune/capo invalidates immediately')

            view(p).click();cell(p).click();fret(p).fill('7');fret(p).press('Enter')
            expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
            p.get_by_role('button',name='Undo',exact=True).click();expect(panel(p)).to_have_count(0)
            view(p).click();p.get_by_role('button',name='Redo',exact=True).click();expect(panel(p)).to_have_count(0)
            view(p).click();cell(p).click();fret(p).fill('9');fret(p).press('Tab');assert 'fret 9' in cell(p).get_attribute('aria-label')
            expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
            view(p).click()
            if not p.get_by_role('textbox',name='Paste or write a six-string tab').count():p.get_by_role('button',name='Import text',exact=True).click()
            p.get_by_role('textbox',name='Paste or write a six-string tab').fill(source(bars=True));expect(panel(p)).to_have_count(1)
            # Drop D is still selected. A Standard-labelled import is rejected and
            # correctly leaves the current document/snapshot intact.
            p.get_by_role('button',name='Import tab',exact=True).click()
            expect(p.get_by_role('region',name='Tab analysis workspace').get_by_role('alert')).to_be_visible();expect(panel(p)).to_have_count(1)
            p.get_by_role('spinbutton',name='Tuning',exact=True).press('Home')
            expect(panel(p)).to_have_count(0);view(p).click()
            p.get_by_role('button',name='Import tab',exact=True).click()
            expect(p.get_by_role('region',name='Tab analysis workspace').get_by_role('alert')).to_have_count(0)
            expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
            view(p).click();p.locator('[data-column-header]').nth(1).click()
            expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false');expect(p.get_by_text('Bar changed · View again',exact=True)).to_be_visible()
            p.locator('[data-column-header]').nth(0).click();expect(panel(p)).to_have_count(0)
            passed.append('Enter/Tab edits, successful import and active-bar change invalidate; rejected import retains current snapshot')
            view(p).click();expect(panel(p).get_by_text('Timing incomplete',exact=True)).to_be_visible()
            assert not errors,errors
            p.screenshot(path=str(OUT/f'final-state-{width}.png'),full_page=True)
            results.append({'width':width,'pointerMode':'touch' if width==390 else 'mouse','passed':passed,'nativeIMEEvents':ime_events,'errors':errors})
            (OUT/'results.json').write_text(json.dumps({'browser':'system Chromium; native CDP IME, no physical-device/OS-IME coverage claim','results':results},indent=2))
            print(json.dumps({'width':width,'passed':passed}),flush=True)
        except Exception as exc:
            p.screenshot(path=str(OUT/f'failure-{width}.png'),full_page=True)
            (OUT/'failure.json').write_text(json.dumps({'width':width,'completed':passed,'error':str(exc),'traceback':traceback.format_exc(),'errors':errors},indent=2))
            raise
        finally:ctx.close()
    browser.close()
