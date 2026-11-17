"""Native focus check for the new persistent scope controls outside keyed panels."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright,expect
out=Path('/workspace/p33-validation/visual');results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [390,768,1335]:
        ctx=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');p=ctx.new_page()
        p.goto('http://127.0.0.1:3002',wait_until='networkidle');p.get_by_text('Analyze tab',exact=True).click()
        view=p.get_by_role('button',name='View written time',exact=True)
        panel=p.get_by_role('region',name='Written time',exact=True)
        local=p.get_by_role('button',name='This bar',exact=True)
        view.click();local.focus();p.keyboard.press('Escape');expect(panel).to_have_count(0);expect(view).to_be_focused()
        p.get_by_role('button',name=re.compile('^Bar 1 meter:')).click()
        meter=p.get_by_role('spinbutton',name='Time signature',exact=True);meter.press('Home')
        for _ in range(3):meter.press('ArrowRight')
        view.click();across=p.get_by_role('button',name=re.compile('^Across full bars'));across.click()
        across.focus();p.keyboard.press('Escape');expect(panel).to_have_count(0);expect(view).to_be_focused()
        view.click();across.click();cell=p.locator('button[aria-label^="String 1, onset 1,"]');before=cell.get_attribute('aria-label')
        cell.click();fret=p.get_by_role('textbox',name='Fret for string 1, onset 1');fret.fill('12')
        across.focus();p.keyboard.press('Escape');expect(panel).to_have_count(1);expect(fret).to_have_value('12')
        assert cell.get_attribute('aria-label')==before
        fret.press('Escape');across.focus();p.keyboard.press('Escape');expect(panel).to_have_count(0);expect(view).to_be_focused()
        results.append({'width':width,'cleanLocalEscape':'pass','cleanAcrossEscape':'pass','pendingScopeEscapePreservesFret':'pass','explicitCancelThenScopeEscapeReturnsView':'pass'})
        ctx.close()
    browser.close()
(out/'scope-escape-results.json').write_text(json.dumps({'scope':'Root native scope Escape focus supplement','results':results},indent=2)+'\n')
print(json.dumps(results))
