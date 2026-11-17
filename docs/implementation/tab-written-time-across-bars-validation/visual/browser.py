"""Root P3.3 production-browser visual/read-only check; all fixtures use visible UI."""
import json,re,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

OUT=Path('/workspace/p33-validation/visual');OUT.mkdir(parents=True,exist_ok=True)
URL='http://127.0.0.1:3002'
def panel(p):return p.get_by_role('region',name='Written time',exact=True)
def view(p):return p.get_by_role('button',name='View written time',exact=True)
def across(p):return p.get_by_role('button',name=re.compile(r'^Across full bars'))
def local(p):return p.get_by_role('button',name='This bar',exact=True)
def cell(p,i):return p.locator(f'button[aria-label^="String 1, onset {i},"]')
def point(p):return panel(p).get_by_role('button',name='Next across-bars time point')
def import_rows(p,body):
    source='\n'.join(name+'|'+(body if i==0 else re.sub(r'[^|]','-',body))+'|' for i,name in enumerate(['e','B','G','D','A','E']))
    if not p.get_by_role('textbox',name='Paste or write a six-string tab').count():p.get_by_role('button',name='Import text',exact=True).click()
    p.get_by_role('textbox',name='Paste or write a six-string tab').fill(source)
    p.get_by_role('button',name='Import tab',exact=True).click()
def meter(p):
    p.get_by_role('button',name=re.compile(r'^Bar 1 meter:')).click()
    picker=p.get_by_role('spinbutton',name='Time signature',exact=True);picker.press('Home')
    for _ in range(3):picker.press('ArrowRight')
    expect(picker).to_have_attribute('aria-valuetext','4/4')
    p.get_by_role('button',name=re.compile(r'^Bar 1 meter:')).click()
def notation(p,i,start=None,denominator=1,length='Quarter'):
    cell(p,i).click();p.get_by_role('textbox',name=f'Fret for string 1, onset {i}').press('Escape')
    p.get_by_role('button',name=re.compile(rf'^Edit position {i},')).click()
    if start is not None:
        p.get_by_role('textbox',name='Start numerator').fill(str(start));p.get_by_role('textbox',name='Start denominator').fill(str(denominator))
        p.get_by_role('button',name='Set start',exact=True).click()
    if length is not None:
        picker=p.get_by_role('spinbutton',name='Duration',exact=True);picker.press('Home')
        options=['Unknown','Whole','Half','Dotted quarter','Quarter','Eighth','Triplet eighth','Sixteenth','Thirty-second']
        for _ in range(options.index(length)):picker.press('ArrowRight')
        expect(picker).to_have_attribute('aria-valuetext',length)
    p.get_by_role('button',name='Close position editor',exact=True).click()
def select(p,i):p.locator('[data-column-header]').nth(i-1).click()
def labels(p):return p.locator('[data-column-header]').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')
def rows(p):return panel(p).get_by_role('list',name='Across-bars written notes').locator(':scope > li')
def active_count(p):return panel(p).locator('ul[aria-label="Across-bars written notes"] > li[data-active]')
def geometry(p):
    return p.evaluate('''()=>{const region=document.querySelector('[aria-label="Written time"]');const scope=document.querySelector('[aria-label="Written time scope"]');
    const visible=e=>{const closed=e.closest('details:not([open])');const r=e.getBoundingClientRect();return (!closed||e===closed.querySelector('summary'))&&r.width>0&&r.height>0};
    const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,text:e.innerText}};
    return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,panel:region?box(region):null,
      controls:[...(region?[...region.querySelectorAll('button,summary')]:[]),...(scope?[...scope.querySelectorAll('button')]:[])].filter(visible).map(box)};}''')
def check_geometry(p):
    d=geometry(p);assert d['viewport']==d['pageWidth'],d
    assert d['reducedMotion'];assert all(c['width']>=44 and c['height']>=44 for c in d['controls']),d['controls'];return d
def shot(p,name,width):
    view(p).scroll_into_view_if_needed();p.screenshot(path=str(OUT/f'{name}-{width}.png'),full_page=True)
def opened_across(p):
    view(p).click();expect(local(p)).to_have_attribute('aria-pressed','true');across(p).click()
    expect(across(p)).to_have_attribute('aria-pressed','true');expect(across(p)).to_be_focused()
def close(p):panel(p).get_by_role('button',name='Close written time').click()

results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [390,768,1335]:
        ctx=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
        p=ctx.new_page();p.set_default_timeout(15000);errors=[]
        p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        try:
            p.goto(URL,wait_until='networkidle');p.get_by_text('Analyze tab',exact=True).click()
            expect(panel(p)).to_have_count(0);view(p).click();expect(across(p)).to_be_disabled()
            expect(p.get_by_text('Set meter to compare bars',exact=True)).to_be_visible();disabled=check_geometry(p);close(p)
            # Browser duration picker has no length3; use Whole4 for B=[7,11).
            # Core/unit chronological counterexample separately uses B=[7,10).
            import_rows(p,'5|7|8');meter(p)
            notation(p,1,9,length='Quarter');notation(p,2,3,length='Whole');notation(p,3,0,length='Quarter')
            before=labels(p);opened_across(p);expect(rows(p)).to_have_count(3)
            texts=rows(p).all_text_contents();assert 'Bar 2' in texts[0] and 'Bar 3' in texts[1] and 'Bar 1' in texts[2],texts
            expect(active_count(p)).to_have_count(2);chronological=check_geometry(p);shot(p,'chronological',width)
            point(p).click();expect(active_count(p)).to_have_count(2);assert rows(p).all_text_contents()[0].startswith('Bar 2')
            panel(p).get_by_text('Details',exact=True).click();detail_text=panel(p).inner_text()
            assert '9/1' in detail_text and 'Bar 1' in detail_text,detail_text
            details=check_geometry(p);shot(p,'details-overrun',width);panel(p).get_by_text('Details',exact=True).click()
            while point(p).is_enabled():point(p).click()
            expect(active_count(p)).to_have_count(0);assert labels(p)==before
            local(p).click();expect(local(p)).to_be_focused();expect(local(p)).to_have_attribute('aria-pressed','true')
            close(p);expect(view(p)).to_be_focused()
            # Empty selected ownership still sees a previous written interval.
            import_rows(p,'5|--');meter(p);notation(p,1,3,length='Whole');select(p,2)
            view(p).click();expect(panel(p).get_by_text('No written notes',exact=True)).to_be_visible()
            across(p).click();expect(rows(p)).to_have_count(1);expect(active_count(p)).to_have_count(1)
            empty_carry=check_geometry(p);shot(p,'empty-bar-carry',width);close(p)
            # Missing future start may be excluded strictly before its known origin.
            import_rows(p,'5|7');meter(p);notation(p,1,0,length='Whole');select(p,1)
            opened_across(p);expect(active_count(p)).to_have_count(1);future_proven=check_geometry(p);shot(p,'future-proven',width)
            point(p).click();expect(active_count(p)).to_have_count(0)
            select(p,2);expect(panel(p)).to_have_count(0);opened_across(p)
            expect(panel(p).get_by_text('More timing needed at this point',exact=True)).to_be_visible()
            expect(active_count(p)).to_have_count(0);future_equal=check_geometry(p);shot(p,'future-anchor-equal',width);close(p)
            # Nine late source-bar1 starts inside an empty bar2 window exercise pages.
            import_rows(p,'-'.join(['5']*9)+'|--');meter(p)
            for i in range(1,10):notation(p,i,16+i-1,denominator=4,length='Quarter')
            select(p,10);before=labels(p);opened_across(p);expect(rows(p)).to_have_count(8)
            dense=check_geometry(p);shot(p,'dense',width)
            next_page=panel(p).get_by_role('button',name='Next across-bars notes page');prev_page=panel(p).get_by_role('button',name='Previous across-bars notes page')
            next_page.click();expect(rows(p)).to_have_count(1);expect(prev_page).to_be_focused();prev_page.click();expect(next_page).to_be_focused()
            assert labels(p)==before
            p.get_by_role('button',name='Undo',exact=True).click();expect(panel(p)).to_have_count(0)
            assert 'duration 3/2 quarter notes' in cell(p,9).get_attribute('aria-label')
            p.get_by_role('button',name='Redo',exact=True).click();expect(panel(p)).to_have_count(0)
            view(p).click();expect(local(p)).to_have_attribute('aria-pressed','true')
            assert not errors,errors
            results.append({'width':width,'disabledModel':disabled,'chronological':chronological,'details':details,'emptyCarry':empty_carry,'futureProven':future_proven,'futureAnchorEqual':future_equal,'dense':dense,'errors':errors,'passed':['explicit model','no-meter disabled/local available','chronological source labels','half-open active membership','nonblocking overrun details','scope focus','empty bar carry-in','future missing-start bound','anchor equality partial','window-end no active set','eight-plus-one paging','view actions preserve source/history','fresh View defaults This bar','44px reduced-motion no-overflow']})
        except Exception as exc:
            p.screenshot(path=str(OUT/f'failure-{width}.png'),full_page=True)
            (OUT/'failure.json').write_text(json.dumps({'width':width,'error':str(exc)},indent=2));raise
        finally:ctx.close()
    browser.close()
paths=['src/domain/tab/written-time-across-bars.ts','src/components/guitar/scale/tab-analysis/TabScoreView.tsx','src/components/guitar/scale/tab-analysis/AcrossBarsWrittenTimePanel.tsx','src/components/guitar/scale/tab-analysis/across-bars-written-time.module.css']
(OUT/'results.json').write_text(json.dumps({'reviewer':'Root production-browser visual/read-only flow review','buildId':Path('/workspace/Guitar-p2/.next/BUILD_ID').read_text().strip(),'sourceSha256':{s:hashlib.sha256(Path('/workspace/Guitar-p2',s).read_bytes()).hexdigest() for s in paths},'results':results},indent=2)+'\n')
print(json.dumps([{'width':r['width'],'checks':len(r['passed']),'errors':r['errors']} for r in results]))
