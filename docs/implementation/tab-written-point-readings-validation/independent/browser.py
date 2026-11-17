from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,re,traceback
OUT=Path(__file__).parent
results=[]
def view(p):return p.get_by_role('button',name='View written time',exact=True)
def panel(p):return p.get_by_role('region',name='Written time',exact=True)
def across(p):return p.get_by_role('group',name='Written time scope').get_by_role('button',name=re.compile('^Across full bars'))
def local(p):return p.get_by_role('group',name='Written time scope').get_by_role('button',name='This bar',exact=True)
def cell(p,string=1,onset=2):return p.locator(f'button[aria-label^="String {string}, onset {onset},"]')
def fret(p,onset=2):return p.get_by_role('textbox',name=f'Fret for string 1, onset {onset}')
def editor(p,n=2):return p.get_by_role('button',name=re.compile(fr'^Edit position {n},'))
def start(p):return p.get_by_role('textbox',name='Start numerator')
def close(p):return panel(p).get_by_role('button',name='Close written time')
def nextpoint(p):return panel(p).get_by_role('button',name='Next across-bars time point')
def prevpoint(p):return panel(p).get_by_role('button',name='Previous across-bars time point')
def previouspage(p):return panel(p).get_by_role('button',name='Previous across-bars notes page')
def nextpage(p):return panel(p).get_by_role('button',name='Next across-bars notes page')
def readings(p):return p.get_by_role('region',name='Written chord readings',exact=True)
def chordsummary(p):return panel(p).get_by_text('Chord readings',exact=True)
def alternatives(p):return readings(p).get_by_text('Formula alternatives',exact=True)
def choice(p,name):return readings(p).get_by_role('button',name='As '+name,exact=True)
def clear(p):return readings(p).get_by_role('button',name='Clear hypothetical chord')
def note_prev(p):return readings(p).get_by_role('button',name='Previous written point notes page')
def progress(p):
 return {'page':panel(p).get_by_role('group',name='Across-bars note pages').get_by_text(re.compile(r'^Page \d+ of')).inner_text(),'point':panel(p).get_by_role('group',name='Across-bars time points').get_by_text(re.compile(r'^Point \d+ of')).inner_text(),'notes':readings(p).get_by_role('group',name='Written point note pages').get_by_text(re.compile(r'^Page \d+ of')).inner_text()}
def source(simple=False):
 names=['e','B','G','D','A','E'];row='-'.join(['0']+['5']*9)
 if simple:return '\n'.join(name+'|'+('5|7' if i==0 else '-|-')+'|' for i,name in enumerate(names))
 return '\n'.join(name+'|'+('5|'+row if i==0 else '-|'+('1' if i==1 else '0' if i==2 else '-')+'-'*(len(row)-1))+'|' for i,name in enumerate(names))
def import_text(p,text):
 if not p.get_by_role('textbox',name='Paste or write a six-string tab').count():p.get_by_role('button',name='Import text',exact=True).click()
 p.get_by_role('textbox',name='Paste or write a six-string tab').fill(text);p.get_by_role('button',name='Import tab',exact=True).click()
 expect(p.get_by_role('region',name='Tab analysis workspace').get_by_role('alert')).to_have_count(0)
def setstart(p,num,den=1):
 start(p).fill(str(num));p.get_by_role('textbox',name='Start denominator').fill(str(den));p.get_by_role('button',name='Set start',exact=True).click()
def meter(p):
 p.get_by_role('button',name='Bar 1 meter: unspecified').click();p.get_by_role('spinbutton',name='Time signature',exact=True).press('Home')
 for _ in range(3):p.get_by_role('spinbutton',name='Time signature',exact=True).press('ArrowRight')
def setup(p):
 p.goto('http://127.0.0.1:3003',wait_until='networkidle');p.get_by_text('Analyze tab',exact=True).click();import_text(p,source());meter(p)
 p.locator('[data-column-header]').first.click();editor(p,1).click();setstart(p,3);p.get_by_role('button',name='Next Duration',exact=True).click();p.get_by_role('button',name='Close position editor',exact=True).click()
 for i in range(9):
  p.locator('[data-column-header]').nth(i+1).click();editor(p,i+2).click();setstart(p,0);p.get_by_role('button',name='Next Duration',exact=True).click();p.get_by_role('button',name='Close position editor',exact=True).click()
 for string in [2,3]:
  cell(p,string).click();editor(p).click();p.get_by_role('button',name='Next Duration',exact=True).click();p.get_by_role('button',name='Close position editor',exact=True).click()
 p.locator('[data-column-header]').nth(10).click();editor(p,11).click();setstart(p,1,4);p.get_by_role('button',name='Close position editor',exact=True).click();p.locator('[data-column-header]').nth(1).click()
def open_readings(p):chordsummary(p).click();expect(readings(p)).to_be_visible();alternatives(p).click()
def guardstate(p):
 view(p).click();across(p).click();open_readings(p);choice(p,'C6').click();nextpage(p).click();readings(p).get_by_role('button',name='Next written point notes page').click()
 expect(readings(p).get_by_role('heading',name='If C6',exact=True)).to_be_visible();return progress(p)
def actions(p):return [view(p),local(p),across(p),close(p),previouspage(p),nextpoint(p),chordsummary(p),alternatives(p),choice(p,'Am7'),clear(p),note_prev(p),readings(p).get_by_text('Formula details',exact=True),readings(p).get_by_text('Observation details',exact=True),p.get_by_role('button',name='Check timing',exact=True)]
def assert_same(p,state):
 assert progress(p)==state;expect(readings(p).get_by_role('heading',name='If C6',exact=True)).to_be_visible();expect(choice(p,'C6')).to_have_attribute('aria-pressed','true');expect(choice(p,'Am7')).to_have_attribute('aria-pressed','false')

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,768,1335]:
  ctx=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',has_touch=width==390)
  p=ctx.new_page();p.set_default_timeout(15000);errors=[];passed=[]
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  p.add_init_script('''window.p4BEvents=[];for(const type of ['pointerdown','blur','focus','keydown','compositionstart','compositionupdate','compositionend','input','click'])document.addEventListener(type,e=>window.p4BEvents.push({type,trusted:e.isTrusted,key:e.key,composing:e.isComposing,data:e.data,pointerType:e.pointerType,label:e.target.getAttribute?.('aria-label')||e.target.textContent?.trim().slice(0,60),value:e.target.value}),true);''')
  activate=lambda e:e.tap() if width==390 else e.click()
  try:
   setup(p);view(p).click();across(p).click();expect(readings(p)).to_have_count(0);open_readings(p)
   expect(choice(p,'C6')).to_have_attribute('aria-pressed','false');expect(choice(p,'Am7')).to_have_attribute('aria-pressed','false');expect(clear(p)).to_have_count(0)
   choice(p,'C6').click();expect(readings(p).get_by_role('heading',name='If C6',exact=True)).to_be_visible()
   readings(p).get_by_text('Observation details',exact=True).click();expect(readings(p).get_by_text('12 source note occurrences · 4 distinct pitch classes',exact=True)).to_be_visible()
   p.screenshot(path=str(OUT/f'ambiguous-reading-{width}.png'),full_page=True)
   choice(p,'Am7').click();expect(readings(p).get_by_role('heading',name='If Am7',exact=True)).to_be_visible();clear(p).click();expect(choice(p,'Am7')).to_be_focused();expect(clear(p)).to_have_count(0)
   choice(p,'C6').click();nextpoint(p).click();expect(readings(p)).to_have_count(0);expect(chordsummary(p)).to_have_count(0)
   prevpoint(p).click();expect(readings(p)).to_have_count(0);open_readings(p);expect(clear(p)).to_have_count(0)
   passed.append('complete-only disclosure, C6/Am7 noautochoice, occurrence multiplicity, explicit hypothesis/clear; partial point unmounts and returning does not revive choice')
   for text in ['12','37']:
    state=guardstate(p);cell(p).click();fret(p).fill(text);saved=cell(p).get_attribute('aria-label')
    for action in actions(p):
     fret(p).focus();activate(action);expect(fret(p)).to_have_value(text);expect(fret(p)).to_be_focused();assert_same(p,state);assert cell(p).get_attribute('aria-label')==saved
    for action in [view(p),local(p),across(p),close(p),previouspage(p),nextpoint(p),choice(p,'Am7'),clear(p),note_prev(p),chordsummary(p)]:
     action.focus();action.press('Enter');action.press('Space');expect(fret(p)).to_have_value(text);assert_same(p,state)
    choice(p,'Am7').focus();choice(p,'Am7').press('Escape');expect(readings(p)).to_have_count(1);expect(fret(p)).to_have_value(text)
    fret(p).press('Escape');expect(cell(p)).to_be_focused();choice(p,'Am7').focus();choice(p,'Am7').press('Escape');expect(readings(p)).to_have_count(0);expect(chordsummary(p)).to_be_focused();expect(panel(p)).to_have_count(1)
    chordsummary(p).press('Escape');expect(panel(p)).to_have_count(0);expect(view(p)).to_be_focused()
   passed.append('valid12/invalid37 drafts guard newsummary/formula/choice/clear/notepager plus existing scope/page/point/View/Check; cleanEscape closes child before parent and returns focus')
   state=guardstate(p);editor(p).click();start(p).fill('99')
   for action in actions(p):start(p).focus();activate(action);expect(start(p)).to_have_value('99');expect(start(p)).to_be_focused();assert_same(p,state)
   for _ in range(180):
    if local(p).evaluate('(e)=>e===document.activeElement'):break
    p.keyboard.press('Shift+Tab')
   expect(local(p)).to_be_focused();local(p).press('Enter');local(p).press('Space');expect(start(p)).to_have_value('99');assert_same(p,state)
   p.get_by_role('button',name='Cancel start input').click();expect(start(p)).to_have_value('0');p.get_by_role('button',name='Close position editor').click()
   passed.append('fractional pending draft survives native Shift+Tab, pointer and keyboard; explicitCancel restores0')
   cdp=ctx.new_cdp_session(p);cell(p).click();p.keyboard.press('Control+A');p.evaluate('window.p4BEvents=[]')
   cdp.send('Input.imeSetComposition',{'text':'12','selectionStart':2,'selectionEnd':2})
   for action in [chordsummary(p),alternatives(p),choice(p,'Am7'),clear(p),note_prev(p),local(p),nextpoint(p)]:activate(action)
   expect(fret(p)).to_have_value('12');expect(fret(p)).to_be_focused();assert_same(p,state)
   cdp.send('Input.insertText',{'text':'12'});expect(fret(p)).to_have_value('12');assert_same(p,state)
   for action in [choice(p,'Am7'),clear(p),note_prev(p),nextpoint(p)]:activate(action)
   expect(fret(p)).to_have_value('12');assert_same(p,state);ime_events=p.evaluate('window.p4BEvents.splice(0)');assert any(e['type']=='compositionstart'and e['trusted'] for e in ime_events)
   fret(p).press('Escape');editor(p).click();start(p).click();p.keyboard.press('Control+A');cdp.send('Input.imeSetComposition',{'text':'3','selectionStart':1,'selectionEnd':1});start(p).press('Escape');expect(start(p)).to_have_count(1)
   start(p).click();p.keyboard.press('Control+A');cdp.send('Input.imeSetComposition',{'text':'3','selectionStart':1,'selectionEnd':1})
   for action in [chordsummary(p),alternatives(p),choice(p,'Am7'),clear(p),note_prev(p),local(p),nextpoint(p)]:activate(action)
   expect(start(p)).to_have_value('3');expect(start(p)).to_be_focused();assert_same(p,state);cdp.send('Input.insertText',{'text':'3'});assert_same(p,state)
   p.get_by_role('button',name='Cancel start input').click();p.get_by_role('button',name='Close position editor').click()
   passed.append('native trustedCDP composition/finaltext protects hypothesis/readings/pages/point/scope, including composingEscape and no deferred actions')
   p.get_by_role('button',name='Undo',exact=True).click();expect(panel(p)).to_have_count(0);p.locator('[data-column-header]').nth(10).click();editor(p,11).click();expect(start(p)).to_have_value('');p.get_by_role('button',name='Close position editor').click();p.get_by_role('button',name='Redo',exact=True).click();expect(panel(p)).to_have_count(0)
   view(p).click();expect(panel(p).get_by_role('list',name='Written notes')).to_be_visible();across(p).click();open_readings(p);choice(p,'C6').click()
   p.get_by_text('Context',exact=True).click();p.get_by_role('button',name='Set a key',exact=True).click();expect(panel(p)).to_have_count(1);expect(readings(p)).to_have_count(0);open_readings(p);expect(clear(p)).to_have_count(0);choice(p,'C6').click();expect(readings(p).get_by_text('If C6 in C major · I6',exact=True)).to_be_visible()
   p.get_by_role('button',name=re.compile('^Use explored ')).click();expect(panel(p)).to_have_count(1);expect(readings(p)).to_have_count(0);open_readings(p);expect(choice(p,'C6')).to_have_attribute('aria-pressed','false')
   p.get_by_role('spinbutton',name='Tuning',exact=True).press('ArrowRight');expect(panel(p)).to_have_count(0);view(p).click();across(p).click();p.get_by_role('slider',name='Capo fret').press('ArrowRight');expect(panel(p)).to_have_count(0)
   view(p).click();across(p).click();p.get_by_role('button',name='Bar 2 meter: 4/4').click();p.get_by_role('spinbutton',name='Time signature',exact=True).press('ArrowLeft');expect(panel(p)).to_have_count(0)
   view(p).click();across(p).click();p.locator('[data-column-header]').first.click();expect(panel(p)).to_have_count(0);p.locator('[data-column-header]').nth(1).click();expect(panel(p)).to_have_count(0)
   view(p).click();across(p).click();p.get_by_role('spinbutton',name='Tuning',exact=True).press('Home');expect(panel(p)).to_have_count(0);view(p).click();across(p).click();import_text(p,source(True));expect(panel(p)).to_have_count(0)
   passed.append('read-only operations addnohistory; referencechange resets child only; source/meter/Undo/import/bar invalidation immediate and freshViewThisbar')
   # Real four-PC diminished-seventh input yields12 alternatives, exercising8+4
   # candidate paging and Clear focus fallback while selected choice is off-page.
   p.get_by_role('slider',name='Capo fret').press('Home')
   names=['e','B','G','D','A','E'];dim='\n'.join(name+'|'+['2','1','2','1','-','-'][i]+'|' for i,name in enumerate(names));import_text(p,dim);meter(p)
   for string in range(1,5):
    cell(p,string,1).click();editor(p,1).click();setstart(p,0);p.get_by_role('button',name='Next Duration',exact=True).click();p.get_by_role('button',name='Close position editor',exact=True).click()
   view(p).click();across(p).click();open_readings(p)
   c=readings(p).locator('button[data-candidate-key="0:diminished-7"]');c.click();expect(readings(p).get_by_text(re.compile(r'^bb7 · B♭♭\d · Formula member$'))).to_be_visible()
   cp=readings(p).get_by_role('button',name='Next formula alternatives page');cp.click();expect(readings(p).get_by_role('list',name='Formula alternatives').locator('li')).to_have_count(4)
   clear(p).click();expect(alternatives(p)).to_be_focused();expect(clear(p)).to_have_count(0)
   df=fret(p,1);cell(p,1,1).click();df.fill('12')
   prev=readings(p).get_by_role('button',name='Previous formula alternatives page');df.focus();activate(prev);expect(df).to_have_value('12');expect(df).to_be_focused();expect(readings(p).get_by_role('list',name='Formula alternatives').locator('li')).to_have_count(4)
   prev.focus();prev.press('Enter');prev.press('Space');expect(df).to_have_value('12');df.press('Escape');prev.click();expect(readings(p).get_by_role('list',name='Formula alternatives').locator('li')).to_have_count(8)
   passed.append('actualdim7 has12choices8+4, canonicalbb7 spelling, offpageClear focusesformulaSummary, candidatepager obeys native pending guards')
   # Both points are complete. A visit to another complete point must clear
   # stored choice/page state, including when returning to the first point.
   back='\n'.join(name+'|'+['0-0','1--','0--','7--','---','---'][i]+'|' for i,name in enumerate(names));import_text(p,back);meter(p)
   for string in range(1,5):
    cell(p,string,1).click();editor(p,1).click();setstart(p,0);p.get_by_role('button',name='Next Duration',exact=True).click();p.get_by_role('button',name='Close position editor',exact=True).click()
   cell(p,1,2).click();editor(p,2).click();setstart(p,1);p.get_by_role('button',name='Next Duration',exact=True).click();p.get_by_role('button',name='Close position editor',exact=True).click();p.locator('[data-column-header]').first.click()
   view(p).click();across(p).click();open_readings(p);choice(p,'C6').click();nextpoint(p).click();expect(readings(p)).to_be_visible();expect(clear(p)).to_have_count(0);expect(choice(p,'C6')).to_have_attribute('aria-pressed','false')
   prevpoint(p).click();expect(readings(p)).to_be_visible();expect(clear(p)).to_have_count(0);expect(choice(p,'C6')).to_have_attribute('aria-pressed','false')
   passed.append('two complete points0to1to0 retain disclosure but never resurrect hypothesis or selection')
   geometry=p.evaluate('''()=>({width:innerWidth,page:document.documentElement.scrollWidth,targets:[...document.querySelectorAll('[aria-label="Written time"] button,[aria-label="Written time"] summary,[aria-label="Written time scope"] button')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height}).map(e=>({name:e.getAttribute('aria-label')||e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))})''')
   assert geometry['width']==geometry['page'];assert all(t['width']>=44 and t['height']>=44 for t in geometry['targets']);assert not errors,errors
   p.screenshot(path=str(OUT/f'final-formula-{width}.png'),full_page=True)
   results.append({'width':width,'pointerMode':'touch'if width==390 else'mouse','passed':passed,'nativeIMEEvents':ime_events,'geometry':geometry,'errors':errors})
   (OUT/'browser-results.json').write_text(json.dumps({'browser':'systemChromium/reducedmotion/nativeCDPIME; no physicaldevice/OSIME certification','results':results},indent=2));print(json.dumps({'width':width,'passed':passed}),flush=True)
  except Exception as exc:
   p.screenshot(path=str(OUT/f'failure-{width}.png'),full_page=True);(OUT/'failure.json').write_text(json.dumps({'width':width,'completed':passed,'error':str(exc),'traceback':traceback.format_exc(),'errors':errors},indent=2));raise
  finally:ctx.close()
 browser.close()
