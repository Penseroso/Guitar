"""Independent P4-B visual/state acceptance. Fixtures enter through actual product UI only."""
import json,re,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(__file__).parent
URL='http://127.0.0.1:3003'
def panel(p):return p.get_by_role('region',name='Written time',exact=True)
def view(p):return p.get_by_role('button',name='View written time',exact=True)
def across(p):return p.get_by_role('group',name='Written time scope').get_by_role('button',name=re.compile('^Across full bars'))
def local(p):return p.get_by_role('group',name='Written time scope').get_by_role('button',name='This bar',exact=True)
def cell(p,pos,string=1):return p.locator(f'button[aria-label^="String {string}, onset {pos},"]')
def enter(p):
 p.goto(URL,wait_until='networkidle');p.get_by_text('Analyze tab',exact=True).click()
def import_rows(p,rows):
 source='\n'.join(name+'|'+body+'|' for name,body in zip(['e','B','G','D','A','E'],rows))
 if not p.get_by_role('textbox',name='Paste or write a six-string tab').count():p.get_by_role('button',name='Import text',exact=True).click()
 p.get_by_role('textbox',name='Paste or write a six-string tab').fill(source);p.get_by_role('button',name='Import tab',exact=True).click()
def meter(p):
 p.get_by_role('button',name=re.compile(r'^Bar 1 meter:')).click();picker=p.get_by_role('spinbutton',name='Time signature',exact=True);picker.press('Home')
 for _ in range(3):picker.press('ArrowRight')
 expect(picker).to_have_attribute('aria-valuetext','4/4');p.get_by_role('button',name=re.compile(r'^Bar 1 meter:')).click()
def notation(p,pos,string=1,start=None,duration='Quarter'):
 cell(p,pos,string).click();p.get_by_role('textbox',name=f'Fret for string {string}, onset {pos}').press('Escape')
 p.get_by_role('button',name=re.compile(fr'^Edit position {pos},')).click()
 if start is not None:
  p.get_by_role('textbox',name='Start numerator').fill(str(start));p.get_by_role('textbox',name='Start denominator').fill('1');p.get_by_role('button',name='Set start',exact=True).click()
 if duration is not None:
  picker=p.get_by_role('spinbutton',name='Duration',exact=True);picker.press('Home')
  for _ in range(['Unknown','Whole','Half','Dotted quarter','Quarter','Eighth','Triplet eighth','Sixteenth','Thirty-second'].index(duration)):picker.press('ArrowRight')
  expect(picker).to_have_attribute('aria-valuetext',duration)
 p.get_by_role('button',name='Close position editor',exact=True).click()
def select(p,pos):p.locator('[data-column-header]').nth(pos-1).click()
def source_labels(p):return p.locator('[role="gridcell"] button').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')
def prepare_progression(p):
 # 10 individually timed notes; middle C/E/G/A gives C6/Am7 alternatives.
 import_rows(p,['0-0-0','1-1-1','0-0-0','--7--','-----','-----']);meter(p)
 for pos in [1,2,3]:
  for string in ([1,2,3,4] if pos==2 else [1,2,3]):notation(p,pos,string,start=([0,1,3][pos-1]) if string==1 else None)
 select(p,1)
def geometry(p):
 return p.evaluate('''()=>{const r=document.querySelector('[aria-label="Written time"]');const visible=e=>{let d=e.closest('details:not([open])');const b=e.getBoundingClientRect();return(!d||e===d.querySelector('summary'))&&b.width>0&&b.height>0};const box=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y+scrollY,width:b.width,height:b.height,text:e.innerText}};return {width:innerWidth,pageWidth:document.documentElement.scrollWidth,reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,panel:r?box(r):null,controls:r?[...r.querySelectorAll('button,summary')].filter(visible).map(box):[]}}''')
def assert_geometry(p):
 d=geometry(p);assert d['width']==d['pageWidth'];assert d['reducedMotion'];assert all(x['width']>=44 and x['height']>=44 for x in d['controls']),d['controls'];return d
def capture(p,name,width):
 panel(p).scroll_into_view_if_needed();p.screenshot(path=str(OUT/f'{name}-{width}.png'),full_page=True)
def progress(p):
 return {'kind':p.get_by_role('group',name='Written time scope').inner_text(),'point':panel(p).get_by_text(re.compile(r'^Point \d+ of')).inner_text(),'page':panel(p).get_by_text(re.compile(r'^Page \d+ of')).inner_text() if panel(p).get_by_text(re.compile(r'^Page \d+ of')).count() else None}
def open_across(p):
 view(p).click();expect(local(p)).to_have_attribute('aria-pressed','true');across(p).click();expect(across(p)).to_have_attribute('aria-pressed','true')
def child(p):return panel(p).get_by_role('region',name='Written chord readings',exact=True)
def main_toggle(p):return panel(p).get_by_text('Chord readings',exact=True)
def open_child(p):
 if not child(p).count():main_toggle(p).click()
 expect(child(p)).to_be_visible()
def alternatives(p):
 toggle=child(p).get_by_text('Formula alternatives',exact=True)
 if toggle.locator('..').get_attribute('open') is None:toggle.click()
def context_toggle(p):return p.locator('details').filter(has=p.get_by_role('heading',name='Instrument',exact=True)).locator(':scope > summary')
def open_context(p):
 c=p.get_by_text('Context',exact=True)
 if not p.get_by_role('button',name='Set a key',exact=True).is_visible() and not p.get_by_role('button',name='Clear key',exact=True).is_visible():c.click()
def close_context(p):
 if p.get_by_role('button',name='Set a key',exact=True).is_visible() or p.get_by_role('button',name='Clear key',exact=True).is_visible():p.get_by_text('Context',exact=True).click()
def key_reference(p):
 open_context(p);p.get_by_role('button',name='Set a key',exact=True).click();close_context(p)
def notes(p):return child(p).get_by_role('list',name='Written point notes',exact=True)
def assert_no_choice(p):assert child(p).locator('button[aria-pressed="true"]').count()==0
def source_note_rows(p):return notes(p).locator(':scope > li').evaluate_all('(es)=>es.map(e=>({id:e.dataset.noteId,pitch:e.querySelector("strong").textContent,source:e.querySelector("span").textContent}))')

results=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [390,768,1335]:
  ctx=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');p=ctx.new_page();p.set_default_timeout(15000);errors=[]
  p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  try:
   enter(p);prepare_progression(p);key_reference(p);saved_source=source_labels(p)
   view(p).click();expect(local(p)).to_have_attribute('aria-pressed','true');expect(main_toggle(p)).to_have_count(0);local_geo=assert_geometry(p)
   across(p).click();expect(main_toggle(p)).to_be_visible();expect(child(p)).to_have_count(0);closed_geo=assert_geometry(p);capture(p,'opt-in-closed',width)
   open_child(p);expect(notes(p).locator(':scope > li')).to_have_count(3);assert_no_choice(p)
   expect(child(p).get_by_role('button',name='As C',exact=True)).to_have_count(0)
   facts_geo=assert_geometry(p);capture(p,'facts-ceg',width)
   originals=source_note_rows(p);alternatives(p);assert_no_choice(p)
   as_c=child(p).get_by_role('button',name='As C',exact=True);as_c.click();expect(as_c).to_have_attribute('aria-pressed','true');expect(child(p).get_by_role('heading',name='If C',exact=True)).to_be_visible();assert source_note_rows(p)==originals
   expect(child(p).get_by_text('3 · E4 · Formula member',exact=True)).to_be_visible();expect(child(p).get_by_text('1 · C4 · Formula member',exact=True)).to_be_visible();expect(child(p).get_by_text('5 · G3 · Formula member',exact=True)).to_be_visible();expect(child(p).get_by_text(re.compile(r'^If C in C major'))).to_be_visible()
   c_geo=assert_geometry(p);capture(p,'if-c',width)
   child(p).get_by_role('button',name='Clear hypothetical chord',exact=True).click();expect(as_c).to_be_focused();assert_no_choice(p);assert source_note_rows(p)==originals
   child(p).get_by_role('button',name='As Em',exact=True).click();expect(child(p).get_by_role('heading',name='If Em',exact=True)).to_be_visible()
   child(p).get_by_text('Formula details',exact=True).click();omission_text=child(p).inner_text();assert '5' in omission_text and re.search('omit',omission_text,re.I),omission_text
   omitted_geo=assert_geometry(p);capture(p,'formula-omissions',width)
   # Parent point movement refreshes facts and clears chosen hypothesis.
   panel(p).get_by_role('button',name='Next across-bars time point').click();expect(notes(p).locator(':scope > li')).to_have_count(4);assert_no_choice(p);expect(child(p).get_by_role('heading',name='If Em',exact=True)).to_have_count(0)
   panel(p).get_by_role('button',name='Previous across-bars time point').click();expect(notes(p).locator(':scope > li')).to_have_count(3);assert_no_choice(p);expect(child(p).get_by_role('heading',name='If Em',exact=True)).to_have_count(0)
   panel(p).get_by_role('button',name='Next across-bars time point').click();expect(notes(p).locator(':scope > li')).to_have_count(4);assert_no_choice(p)
   alternatives(p);expect(child(p).get_by_role('button',name='As C6',exact=True)).to_be_visible();expect(child(p).get_by_role('button',name='As Am7',exact=True)).to_be_visible();assert_no_choice(p)
   child(p).get_by_role('button',name='As Am7',exact=True).click();expect(child(p).get_by_role('heading',name='If Am7',exact=True)).to_be_visible();am7_text=child(p).inner_text();assert 'If Am7 in C major' in am7_text;expect(child(p).get_by_text('5 · E4 · Formula member',exact=True)).to_be_visible();expect(child(p).get_by_text('b3 · C4 · Formula member',exact=True)).to_be_visible();expect(child(p).get_by_text('b7 · G3 · Formula member',exact=True)).to_be_visible();expect(child(p).get_by_text('1 · A3 · Formula member',exact=True)).to_be_visible();am7_geo=assert_geometry(p);capture(p,'if-am7',width)
   panel(p).get_by_role('button',name='Next across-bars notes page').click();expect(child(p).get_by_role('button',name='As Am7',exact=True)).to_have_attribute('aria-pressed','true');before=progress(p)
   # Scale references close child but preserve Across point/page and source values.
   open_context(p);p.get_by_role('button',name=re.compile('^Use explored ')).click();close_context(p)
   expect(child(p)).to_have_count(0);assert progress(p)==before;assert source_labels(p)==saved_source
   open_child(p);alternatives(p);assert_no_choice(p);child(p).get_by_role('button',name='As Am7',exact=True).click()
   # Key-reference change has the same child-only invalidation contract.
   open_context(p);p.get_by_role('spinbutton',name='Key mode',exact=True).press('ArrowRight');close_context(p)
   expect(child(p)).to_have_count(0);assert progress(p)==before;assert source_labels(p)==saved_source
   open_child(p);assert_no_choice(p);reference_geo=assert_geometry(p);capture(p,'reference-reset-parent-retained',width)
   # Interior written gap at time2 is proven empty, not established silence.
   panel(p).get_by_role('button',name='Next across-bars time point').click()
   assert_no_choice(p);empty_point_text=child(p).inner_text();assert 'silence' not in empty_point_text.lower();expect(panel(p).get_by_text('No source notes at this point',exact=True)).to_be_visible();empty_point_geo=assert_geometry(p);capture(p,'empty-point',width)
   local(p).click();expect(main_toggle(p)).to_have_count(0);across(p).click();expect(child(p)).to_have_count(0)
   # Two-PC observations remain facts until alternatives are explicitly opened.
   import_rows(p,['-','1','0','-','-','-']);meter(p);notation(p,1,2,start=0);notation(p,1,3);select(p,1);open_across(p);open_child(p)
   expect(notes(p).locator(':scope > li')).to_have_count(2);expect(child(p).get_by_role('button',name='As C5',exact=True)).to_have_count(0);assert_no_choice(p)
   expect(child(p).get_by_text('Interval class · 5',exact=True)).to_be_visible();two_pc_geo=assert_geometry(p);capture(p,'two-pc-facts',width);alternatives(p);expect(child(p).get_by_role('button',name='As C5',exact=True)).to_be_visible();assert_no_choice(p)
   child(p).get_by_role('button',name='As Gsus4',exact=True).click();child(p).get_by_text('Formula details',exact=True).click();two_pc_reading_text=child(p).inner_text();assert re.search('omit',two_pc_reading_text,re.I);two_pc_formula_geo=assert_geometry(p);capture(p,'two-pc-optional-formula',width)
   # Source-free written bar is distinguished from an observed empty point.
   for string in [2,3]:
    cell(p,1,string).click();p.get_by_role('textbox',name=f'Fret for string {string}, onset 1').press('Escape');cell(p,1,string).press('Delete')
   open_across(p);expect(panel(p).get_by_text('No written notes',exact=True)).to_be_visible();no_source_text=panel(p).inner_text();assert 'silence' not in no_source_text.lower();source_free_geo=assert_geometry(p);capture(p,'no-written-notes',width)
   assert not errors,errors
   results.append({'width':width,'local':local_geo,'closed':closed_geo,'facts':facts_geo,'selectedC':c_geo,'omissions':omitted_geo,'selectedAm7':am7_geo,'referenceReset':reference_geo,'emptyPoint':empty_point_geo,'twoPCFacts':two_pc_geo,'twoPCFormula':two_pc_formula_geo,'noSources':source_free_geo,'am7Text':am7_text,'omissionText':omission_text,'twoPCReadingText':two_pc_reading_text,'referenceParentState':before,'errors':errors,'passed':['Across-only explicit opt-in','facts then optional formulas','C6/Am7 alternatives no auto choice','conditional selected formula with omissions metadata','source rows retained','point resets selected hypothesis','scale/key change child-only close preserves parent point/page/source','two-PC facts default/C5 optional','empty point vs no source notes without silence claim','44px reduced-motion no-overflow']})
  except Exception as exc:
   p.screenshot(path=str(OUT/f'failure-{width}.png'),full_page=True);(OUT/'failure.json').write_text(json.dumps({'width':width,'error':str(exc)},indent=2));raise
  finally:ctx.close()
 browser.close()
paths=['src/components/guitar/scale/tab-analysis/AcrossBarsWrittenTimePanel.tsx','src/components/guitar/scale/tab-analysis/TabScoreView.tsx']
(OUT/'results.json').write_text(json.dumps({'reviewer':'Independent P4-B production-browser visual/state audit','buildId':Path('/workspace/Guitar-p2/.next/BUILD_ID').read_text().strip(),'sourceSha256':{s:hashlib.sha256(Path('/workspace/Guitar-p2',s).read_bytes()).hexdigest() for s in paths},'results':results},indent=2)+'\n')
print(json.dumps([{'width':r['width'],'checks':len(r['passed']),'errors':r['errors']} for r in results]))
