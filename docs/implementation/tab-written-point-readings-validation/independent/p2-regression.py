from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json,re,time
OUT=Path(__file__).parent / 'p2-regression'
OUT.mkdir(parents=True,exist_ok=True)
def first(page):return page.locator('button[aria-label^="String 1, onset 1,"]')
def fret(page):return page.get_by_role('textbox',name='Fret for string 1, onset 1')
def check(page):return page.get_by_role('button',name='Check timing',exact=True)
def editor(page):return page.get_by_role('button',name=re.compile(r'^Edit position 1,'))
def start(page):return page.get_by_role('textbox',name='Start numerator')
def details(page):return page.get_by_text(re.compile('^Not supplied ·'))
def target(page):return page.get_by_role('button',name='Bar 1 · Position 1 · String 1',exact=True)
def assert_saved(page,value=5):assert f'fret {value}' in first(page).get_attribute('aria-label')
def setup(page):
 page.goto('http://127.0.0.1:3003',wait_until='networkidle');page.get_by_text('Analyze tab',exact=True).click()
 check(page).click();expect(page.get_by_role('region',name='Timing inspection').get_by_text(re.compile('^Free timing ·'))).to_be_visible()
 expect(page.get_by_role('button',name='Close timing check')).to_be_visible()
 page.get_by_role('button',name='Close timing check').click();expect(check(page)).to_be_focused()
 first(page).click();fret(page).fill('5');fret(page).press('Enter');assert_saved(page)
 page.get_by_role('button',name=re.compile('^Bar 1 meter:')).click()
 m=page.get_by_role('spinbutton',name='Time signature');m.press('Home');m.press('ArrowRight');m.press('ArrowRight');m.press('ArrowRight')
 check(page).click();details(page).click()
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,768,1335]:
  context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',has_touch=width==390);page=context.new_page();page.set_default_timeout(10000)
  activate=lambda loc:loc.tap() if width==390 else loc.click()
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  setup(page);activate(target(page));expect(first(page)).to_be_focused()
  # F1: nearer Escape owner closes before diagnostic return.
  editor(page).click();start(page).click();start(page).press('Escape')
  expect(start(page)).to_have_count(0);expect(editor(page)).to_be_focused();expect(editor(page)).to_have_attribute('aria-expanded','false')
  editor(page).press('Escape');expect(target(page)).to_be_focused()
  clean_escape={'popupClosed':True,'focusReturnedToEditBeforeDiagnostic':True}
  page.screenshot(path=str(OUT/f'escape-hierarchy-{width}.png'),full_page=True)
  # Dirty fractional input remains mounted through genuine keyboard traversal.
  target(page).click();editor(page).click();start(page).fill('2')
  activate(target(page));expect(start(page)).to_have_value('2');expect(start(page)).to_be_focused()
  activate(check(page));expect(start(page)).to_have_value('2');expect(start(page)).to_be_focused()
  for _ in range(40):
   if check(page).evaluate('(e)=>e===document.activeElement'):break
   page.keyboard.press('Shift+Tab')
  expect(check(page)).to_be_focused();check(page).press('Enter');check(page).press('Space');expect(start(page)).to_have_value('2')
  assert_saved(page);expect(page.get_by_text('Finish or cancel this input first.',exact=True)).to_be_visible()
  page.get_by_role('button',name='Cancel start input').click();expect(start(page)).to_have_value('')
  page.get_by_role('button',name='Close position editor').click()
  # Dirty valid/invalid native drafts against a retained result and its navigation.
  for text in ['12','37']:
   target(page).click();first(page).click();fret(page).fill(text)
   activate(target(page));expect(fret(page)).to_have_value(text);expect(fret(page)).to_be_focused();assert_saved(page)
   activate(check(page));expect(fret(page)).to_have_value(text);expect(fret(page)).to_be_focused()
   check(page).focus();check(page).press('Enter');check(page).press('Space');expect(fret(page)).to_have_value(text);assert_saved(page)
   fret(page).press('Escape');expect(first(page)).to_be_focused();first(page).press('Escape');expect(target(page)).to_be_focused()
  # Actual browser-native IME: Check and navigation must protect composition and finalized but uncommitted text.
  cdp=context.new_cdp_session(page)
  first(page).click();page.keyboard.press('Control+A')
  cdp.send('Input.imeSetComposition',{'text':'12','selectionStart':2,'selectionEnd':2})
  activate(target(page));activate(check(page));expect(fret(page)).to_have_value('12');expect(fret(page)).to_be_focused();assert_saved(page)
  cdp.send('Input.insertText',{'text':'12'});activate(target(page));expect(fret(page)).to_have_value('12');assert_saved(page)
  fret(page).press('Escape');expect(first(page)).to_be_focused()
  editor(page).click();start(page).click()
  cdp.send('Input.imeSetComposition',{'text':'3','selectionStart':1,'selectionEnd':1})
  start(page).press('Escape');expect(start(page)).to_have_count(1)
  start(page).click();page.keyboard.press('Control+A');cdp.send('Input.imeSetComposition',{'text':'3','selectionStart':1,'selectionEnd':1})
  activate(target(page));activate(check(page));expect(start(page)).to_have_value('3');expect(start(page)).to_be_focused()
  cdp.send('Input.insertText',{'text':'3'});activate(target(page));expect(start(page)).to_have_value('3')
  page.get_by_role('button',name='Cancel start input').click();expect(start(page)).to_have_value('');page.get_by_role('button',name='Close position editor').click()
  # Explicit Set start still permits check; explicit fret Tab commit invalidates its snapshot.
  editor(page).click();start(page).fill('0');page.get_by_role('button',name='Set start',exact=True).click();check(page).click()
  expect(page.get_by_role('region',name='Timing inspection')).to_be_visible();expect(start(page)).to_have_count(0)
  first(page).click();fret(page).fill('7');fret(page).press('Tab');assert_saved(page,7)
  expect(page.get_by_role('region',name='Timing inspection')).to_have_count(0);expect(check(page)).to_have_attribute('aria-expanded','false')
  expect(page.get_by_text('Score changed · Check again',exact=True)).to_be_visible()
  page.get_by_role('button',name='Undo',exact=True).click();assert_saved(page)
  expect(page.get_by_role('region',name='Timing inspection')).to_have_count(0)
  page.get_by_role('button',name='Redo',exact=True).click();assert_saved(page,7)
  check(page).click();expect(page.get_by_role('region',name='Timing inspection')).to_be_visible()
  page.screenshot(path=str(OUT/f'final-state-{width}.png'),full_page=True)
  assert not errors
  results.append({'width':width,'cleanEscape':clean_escape,'dirtyFractionKeyboardPointer':'pass','dirtyNativeValidInvalid':'pass','nativeEscapePriority':'pass','nativeIMEDiagnosticAndCheckGuards':'pass','explicitSetStartAndTabCommit':'pass','snapshotInvalidationUndoRedo':'pass','pointerMode':'touch' if width==390 else 'mouse','errors':errors})
  context.close()
 browser.close()
(OUT/'results.json').write_text(json.dumps({'browser':'system Chromium; native CDP IME; physical device/OS IME not claimed','results':results},indent=2));print(json.dumps(results,indent=2))
