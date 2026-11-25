from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,re,traceback

OUT=Path(__file__).parent
results=[]
def view(p):return p.get_by_role('button',name='View written time',exact=True)
def panel(p):return p.get_by_role('region',name='Written time',exact=True)
def cell(p,n=1):return p.locator(f'button[aria-label^="String 1, onset {n},"]')
def fret(p):return p.get_by_role('textbox',name='Fret for string 1, onset 1')
def editor(p,n=1):return p.get_by_role('button',name=re.compile(fr'^Edit position {n},'))
def start(p):return p.get_by_role('textbox',name='Start numerator')
def close(p):return panel(p).get_by_role('button',name='Close written time')
def nextpoint(p):return panel(p).get_by_role('button',name='Next written time point')
def previouspage(p):return panel(p).get_by_role('button',name='Previous written notes page')
def writtenrows(p):return panel(p).get_by_role('list',name='Written notes').locator('li')
def progress(p):return {'page':panel(p).get_by_text(re.compile(r'^Page \d+ of')).inner_text(),'point':panel(p).get_by_text(re.compile(r'^Point \d+ of')).inner_text()}
def source(bars=False):
 names=['e','B','G','D','A','E'];row='-'.join(['5']*10)
 return '\n'.join(name+'|'+(('5|7' if i==0 else '-|-') if bars else row if i==0 else '-'*len(row))+'|' for i,name in enumerate(names))
def import_text(p,text):
 if not p.get_by_role('textbox',name='Paste or write a six-string tab').count():p.get_by_role('button',name='Import text',exact=True).click()
 p.get_by_role('textbox',name='Paste or write a six-string tab').fill(text);p.get_by_role('button',name='Import tab',exact=True).click()
 expect(p.get_by_role('region',name='Tab analysis workspace').get_by_role('alert')).to_have_count(0)
def setup(p):
 p.goto('http://127.0.0.1:3001',wait_until='networkidle');p.get_by_text('Analyze tab',exact=True).click();import_text(p,source())
 for i in range(9):
  p.locator('[data-column-header]').nth(i).click();editor(p,i+1).click();start(p).fill(str(i*5));p.get_by_role('button',name='Set start',exact=True).click()
  p.get_by_role('button',name='Next Duration',exact=True).click();p.get_by_role('button',name='Close position editor',exact=True).click()
 # Tenth note has a valid known onset and no duration. This final explicit edit
 # is the history marker used after all read-only panel operations.
 p.locator('[data-column-header]').nth(9).click();editor(p,10).click();start(p).fill('1')
 p.get_by_role('textbox',name='Start denominator').fill('4');p.get_by_role('button',name='Set start',exact=True).click()
 p.get_by_role('button',name='Close position editor',exact=True).click();p.locator('[data-column-header]').first.click()
def guardstate(p):
 view(p).click();panel(p).get_by_role('button',name='Next written notes page').click();nextpoint(p).click()
 assert progress(p)=={'page':'Page 2 of 2','point':'Point 2 of 19'}
 expect(panel(p).get_by_text('More timing needed at this point',exact=True)).to_be_visible();assert writtenrows(p).filter(has=p.locator('[data-active]')).count()==0
def actions(p):return [view(p),close(p),previouspage(p),nextpoint(p),panel(p).get_by_text('About written time',exact=True),panel(p).get_by_text('Details',exact=True),p.get_by_role('button',name='Check timing',exact=True)]
def assert_unknown(p,state):
 assert progress(p)==state
 expect(panel(p).get_by_text('More timing needed at this point',exact=True)).to_be_visible()
 assert panel(p).locator('ul[aria-label="Written notes"] li[data-active]').count()==0

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,768,1335]:
  ctx=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',has_touch=width==390)
  p=ctx.new_page();p.set_default_timeout(15000);errors=[];passed=[]
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  p.add_init_script('''window.p32Events=[];for(const type of ['pointerdown','blur','focus','keydown','compositionstart','compositionupdate','compositionend','input','click'])document.addEventListener(type,e=>window.p32Events.push({type,trusted:e.isTrusted,key:e.key,composing:e.isComposing,data:e.data,pointerType:e.pointerType,label:e.target.getAttribute?.('aria-label')||e.target.textContent?.trim().slice(0,60),value:e.target.value}),true);''')
  activate=lambda e:e.tap() if width==390 else e.click()
  try:
   setup(p);view(p).click()
   expect(panel(p).get_by_text('Timing incomplete',exact=True)).to_be_visible();expect(panel(p).get_by_text('Complete at this point',exact=True)).to_be_visible()
   expect(panel(p).get_by_text('1 written note at this point',exact=True)).to_be_visible()
   assert panel(p).locator('ul[aria-label="Written notes"] li[data-active]').count()==1
   panel(p).get_by_text('Details',exact=True).click();expect(panel(p).get_by_text('Proof · Later starts excluded',exact=True)).to_be_visible();expect(panel(p).get_by_text('Excluded notes · 1',exact=True)).to_be_visible()
   expect(panel(p).get_by_text('Current point · 0/1',exact=True)).to_be_visible()
   p.screenshot(path=str(OUT/f'partial-proof-{width}.png'),full_page=True)
   nextpoint(p).click();expect(panel(p).get_by_text('More timing needed at this point',exact=True)).to_be_visible()
   expect(panel(p).get_by_text('Current point · 1/4',exact=True)).to_be_visible();expect(panel(p).get_by_text('Proof · Later starts excluded',exact=True)).to_have_count(0)
   assert panel(p).locator('ul[aria-label="Written notes"] li[data-active]').count()==0
   panel(p).get_by_text('Details',exact=True).click()
   passed.append('global partial remains; exact0 proves one exclusion, exact1/4 is uncertain with no active rows or stale proof')

   for text in ['12','37']:
    guardstate(p);cell(p).click();fret(p).fill(text);state=progress(p);saved=cell(p).get_attribute('aria-label')
    for action in actions(p):
     fret(p).focus();activate(action);expect(fret(p)).to_have_value(text);expect(fret(p)).to_be_focused();assert_unknown(p,state);assert cell(p).get_attribute('aria-label')==saved
    for action in [view(p),close(p),previouspage(p),nextpoint(p)]:
     action.focus();action.press('Enter');action.press('Space');expect(fret(p)).to_have_value(text);assert_unknown(p,state)
    close(p).focus();close(p).press('Escape');expect(panel(p)).to_have_count(1);expect(fret(p)).to_have_value(text)
    fret(p).press('Escape');expect(cell(p)).to_be_focused();close(p).focus();close(p).press('Escape');expect(panel(p)).to_have_count(0);expect(view(p)).to_be_focused()
   passed.append('valid12/invalid37 drafts block partial panel View/Close/page/point/disclosures/Check pointer+keyboard; Escape priority preserved')

   guardstate(p);editor(p).click();start(p).fill('99');state=progress(p)
   for action in actions(p):start(p).focus();activate(action);expect(start(p)).to_have_value('99');expect(start(p)).to_be_focused();assert_unknown(p,state)
   for _ in range(120):
    if view(p).evaluate('(e)=>e===document.activeElement'):break
    p.keyboard.press('Shift+Tab')
   expect(view(p)).to_be_focused();view(p).press('Enter');view(p).press('Space');expect(start(p)).to_have_value('99');assert_unknown(p,state)
   p.get_by_role('button',name='Cancel start input').click();expect(start(p)).to_have_value('0');p.get_by_role('button',name='Close position editor').click()
   passed.append('unapplied fraction survives native Shift+Tab/Enter/Space and pointer actions; explicit Cancel restores0')

   cdp=ctx.new_cdp_session(p);cell(p).click();p.keyboard.press('Control+A');p.evaluate('window.p32Events=[]')
   cdp.send('Input.imeSetComposition',{'text':'12','selectionStart':2,'selectionEnd':2})
   for action in [view(p),close(p),previouspage(p),nextpoint(p)]:activate(action)
   expect(fret(p)).to_have_value('12');expect(fret(p)).to_be_focused();assert_unknown(p,state)
   cdp.send('Input.insertText',{'text':'12'});expect(fret(p)).to_have_value('12');assert_unknown(p,state)
   for action in [view(p),close(p),previouspage(p),nextpoint(p)]:activate(action)
   expect(fret(p)).to_have_value('12');assert_unknown(p,state)
   ime_events=p.evaluate('window.p32Events.splice(0)');assert any(e['type']=='compositionstart' and e['trusted'] for e in ime_events)
   fret(p).press('Escape');editor(p).click();start(p).click();p.keyboard.press('Control+A')
   cdp.send('Input.imeSetComposition',{'text':'3','selectionStart':1,'selectionEnd':1});start(p).press('Escape');expect(start(p)).to_have_count(1)
   start(p).click();p.keyboard.press('Control+A');cdp.send('Input.imeSetComposition',{'text':'3','selectionStart':1,'selectionEnd':1})
   for action in [view(p),close(p),previouspage(p),nextpoint(p)]:activate(action)
   expect(start(p)).to_have_value('3');expect(start(p)).to_be_focused();assert_unknown(p,state)
   cdp.send('Input.insertText',{'text':'3'});expect(start(p)).to_have_value('3');assert_unknown(p,state)
   p.get_by_role('button',name='Cancel start input').click();expect(start(p)).to_have_value('0');p.get_by_role('button',name='Close position editor').click()
   passed.append('native CDP IME protects partial point state and source values; composing Escape does not discard, no deferred refresh')

   # No View/page/query operation above may create a history edit. One Undo must
   # reach the tenth note's last explicit Set start action (1/4 -> absent).
   p.get_by_role('button',name='Undo',exact=True).click();expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
   p.locator('[data-column-header]').nth(9).click();editor(p,10).click();expect(start(p)).to_have_value('');p.get_by_role('button',name='Close position editor').click()
   p.get_by_role('button',name='Redo',exact=True).click();expect(panel(p)).to_have_count(0);view(p).click();expect(panel(p).get_by_text('Complete at this point',exact=True)).to_be_visible()
   passed.append('one Undo reaches actual source Set start, invalidates; Redo never resurrects old report')

   p.get_by_text('Context',exact=True).click();p.get_by_role('button',name='Set a key',exact=True).click();expect(panel(p)).to_have_count(1)
   p.get_by_role('button',name=re.compile('^Use explored ')).click();expect(panel(p)).to_have_count(1)
   p.get_by_role('spinbutton',name='Tuning',exact=True).press('ArrowRight');expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
   view(p).click();p.get_by_role('slider',name='Capo fret').press('ArrowRight');expect(panel(p)).to_have_count(0)
   view(p).click();p.get_by_role('spinbutton',name='Tuning',exact=True).press('Home');expect(panel(p)).to_have_count(0);view(p).click()
   import_text(p,source(bars=True));expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
   view(p).click();p.locator('[data-column-header]').nth(1).click();expect(panel(p)).to_have_count(0);expect(view(p)).to_have_attribute('aria-expanded','false')
   p.locator('[data-column-header]').first.click();expect(panel(p)).to_have_count(0)
   passed.append('key/scale context retains, retune/capo/import/active-bar change invalidate immediately with no resurrection')
   view(p).click();expect(panel(p).get_by_text('Timing incomplete',exact=True)).to_be_visible()
   geometry=p.evaluate('''()=>({width:innerWidth,page:document.documentElement.scrollWidth,targets:[...document.querySelectorAll('[aria-label="Written time"] button,[aria-label="Written time"] summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height}).map(e=>({name:e.getAttribute('aria-label')||e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))})''')
   assert geometry['width']==geometry['page'];assert all(t['width']>=44 and t['height']>=44 for t in geometry['targets']);assert not errors,errors
   p.screenshot(path=str(OUT/f'final-partial-{width}.png'),full_page=True)
   results.append({'width':width,'pointerMode':'touch'if width==390 else'mouse','passed':passed,'nativeIMEEvents':ime_events,'geometry':geometry,'errors':errors})
   (OUT/'browser-results.json').write_text(json.dumps({'browser':'system Chromium, reduced motion, native CDP IME; no physical device/OS-IME certification','results':results},indent=2));print(json.dumps({'width':width,'passed':passed}),flush=True)
  except Exception as exc:
   p.screenshot(path=str(OUT/f'failure-{width}.png'),full_page=True)
   (OUT/'failure.json').write_text(json.dumps({'width':width,'completed':passed,'error':str(exc),'traceback':traceback.format_exc(),'errors':errors},indent=2));raise
  finally:ctx.close()
 browser.close()
