"""Independent real-browser P3.2 visual audit.

Fixture setup uses visible ASCII import and existing score notation controls only.
No product-state injection or synthetic DOM input events are used.
"""
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT=Path('/workspace/p32-validation/visual')
URL='http://127.0.0.1:3001'

def entered(page):
    page.goto(URL,wait_until='networkidle')
    page.get_by_text('Analyze tab',exact=True).click()

def imported(page,count):
    text='-'.join(['5']*count)
    source='\n'.join(name+'|'+(text if i==0 else '-'*len(text))+'|' for i,name in enumerate(['e','B','G','D','A','E']))
    page.get_by_role('button',name='Import text',exact=True).click()
    page.get_by_role('textbox',name='Paste or write a six-string tab').fill(source)
    page.get_by_role('button',name='Import tab',exact=True).click()
    expect(page.locator('[data-column-header]')).to_have_count(count)

def cell(page,index):
    return page.locator(f'button[aria-label^="String 1, onset {index},"]')

def notation(page,index,start=None,quarter=False,denominator=1):
    cell(page,index).click()
    page.get_by_role('textbox',name=f'Fret for string 1, onset {index}').press('Escape')
    page.get_by_role('button',name=re.compile(rf'^Edit position {index},')).click()
    if start is not None:
        page.get_by_role('textbox',name='Start numerator').fill(str(start))
        page.get_by_role('textbox',name='Start denominator').fill(str(denominator))
        page.get_by_role('button',name='Set start',exact=True).click()
    if quarter:
        picker=page.get_by_role('spinbutton',name='Duration')
        picker.press('Home')
        for _ in range(4):picker.press('ArrowRight')
        expect(picker).to_have_attribute('aria-valuetext','Quarter')
    page.get_by_role('button',name='Close position editor',exact=True).click()

def panel(page):return page.get_by_role('region',name='Written time',exact=True)
def view(page):return page.get_by_role('button',name='View written time',exact=True)

def labels(page):
    return page.locator('[data-column-header]').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')

def geometry(page):
    return page.evaluate('''()=>{
      const region=document.querySelector('[aria-label="Written time"]');
      const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,text:e.innerText,background:getComputedStyle(e).backgroundColor}};
      const visible=e=>{const closed=e.closest('details:not([open])');if(closed&&e!==closed.querySelector('summary'))return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
      return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
      panel:region?box(region):null,score:box(document.querySelector('[aria-label="Tab score — bars 1–1"]')),
      controls:region?[...region.querySelectorAll('button,summary,input,select')].filter(visible).map(box):[]};
    }''')

def assert_geometry(measured):
    assert measured['viewport']==measured['pageWidth'],measured
    assert measured['reducedMotion']
    assert all(c['width']>=44 and c['height']>=44 for c in measured['controls']),measured['controls']

def screenshot(page,name,width):
    view(page).scroll_into_view_if_needed()
    page.screenshot(path=str(OUT/f'{name}-{width}.png'),full_page=True)

def main():
    results=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        for width in [390,768,1335]:
            context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
            page=context.new_page();page.set_default_timeout(15000);errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            entered(page)
            expect(panel(page)).to_have_count(0);expect(view(page)).to_have_attribute('aria-expanded','false')
            default=geometry(page)
            view_geometry=view(page).bounding_box()
            assert view_geometry['width']>=44 and view_geometry['height']>=44
            assert view(page).evaluate('(e)=>getComputedStyle(e).backgroundColor') in ['rgba(0, 0, 0, 0)','transparent']
            screenshot(page,'default',width)

            # A rest-only source has no owned written notes, without claiming silence.
            page.get_by_role('button',name=re.compile(r'^Edit position 1,')).click()
            page.get_by_role('button',name='Rest',exact=True).click()
            page.get_by_role('button',name='Close position editor',exact=True).click()
            view(page).click();expect(panel(page).get_by_text('No written notes',exact=True)).to_be_visible()
            expect(panel(page).get_by_role('group',name='Written time points')).to_have_count(0)
            assert 'silence' not in panel(page).inner_text().lower()
            rest_only=geometry(page);assert_geometry(rest_only);screenshot(page,'rest-only',width)
            page.get_by_role('button',name='Close written time',exact=True).click();expect(view(page)).to_be_focused()

            # All authored timing is entered through existing notation controls.
            imported(page,2);notation(page,1,start=0,quarter=True);notation(page,2,start=2,quarter=True)
            expect(page.get_by_role('button',name='Bar 1 meter: unspecified',exact=True)).to_be_visible()
            before=labels(page)
            # Native keyboard re-entry ensures the visible focus ring is actually keyboard focus.
            view(page).focus();page.keyboard.press('Shift+Tab');page.keyboard.press('Tab');expect(view(page)).to_be_focused()
            focus={'focusVisible':view(page).evaluate('(e)=>e.matches(":focus-visible")'),'outline':view(page).evaluate('(e)=>getComputedStyle(e).outlineStyle')}
            assert focus['focusVisible'] and focus['outline']!='none',focus
            page.keyboard.press('Enter');expect(panel(page)).to_be_visible();expect(view(page)).to_have_attribute('aria-expanded','true')
            expect(panel(page).get_by_text('Written timing',exact=True)).to_be_visible()
            expect(panel(page).get_by_role('list',name='Written notes').locator('li')).to_have_count(2)
            expect(panel(page).get_by_text('1 written note at this point',exact=True)).to_be_visible()
            about=panel(page).get_by_text('About written time',exact=True)
            details=panel(page).get_by_text('Details',exact=True)
            assert not about.locator('..').get_attribute('open') and not details.locator('..').get_attribute('open')
            assert 'performed sound' not in panel(page).inner_text()
            complete=geometry(page);assert_geometry(complete);screenshot(page,'complete',width)
            about.click();expect(panel(page).get_by_text(re.compile('performed sound'))).to_be_visible();about_open=geometry(page);assert_geometry(about_open);about.click()
            next_point=panel(page).get_by_role('button',name='Next written time point',exact=True)
            previous_point=panel(page).get_by_role('button',name='Previous written time point',exact=True)
            expect(previous_point).to_be_disabled();next_point.click()
            expect(panel(page).get_by_text('No written notes at this point',exact=True)).to_be_visible()
            assert panel(page).locator('ul[aria-label="Written notes"] li[data-active]').count()==0
            gap=geometry(page);assert_geometry(gap);screenshot(page,'gap',width)
            details.click();expect(panel(page).get_by_text('Current point · 1/1',exact=True)).to_be_visible();details_open=geometry(page);assert_geometry(details_open)
            expect(panel(page).get_by_text('Start',exact=True)).to_have_count(2)
            expect(panel(page).get_by_text('Local end',exact=True)).to_have_count(2)
            details.click();next_point.click();expect(panel(page).get_by_text('1 written note at this point',exact=True)).to_be_visible()
            next_point.click();expect(panel(page).get_by_text('Outside observed range',exact=True)).to_be_visible();expect(next_point).to_be_disabled();expect(previous_point).to_be_focused()
            assert labels(page)==before,'read-only point actions altered notation labels'
            page.get_by_role('button',name='Close written time',exact=True).click();expect(view(page)).to_be_focused();expect(view(page)).to_have_attribute('aria-expanded','false')

            # An unknown-start note retains uncertain point navigation without a full set.
            imported(page,2);notation(page,1,start=0,quarter=True);view(page).click()
            expect(panel(page).get_by_text('Timing incomplete',exact=True)).to_be_visible()
            expect(panel(page).get_by_text('1 of 2 notes timed',exact=True)).to_be_visible()
            expect(panel(page).get_by_role('list',name='Written notes').locator('li')).to_have_count(1)
            expect(panel(page).get_by_role('group',name='Written time points')).to_have_count(1)
            expect(panel(page).get_by_text('More timing needed at this point',exact=True)).to_be_visible()
            assert panel(page).locator('li[data-active]').count()==0
            partial=geometry(page);assert_geometry(partial);screenshot(page,'partial',width)
            page.get_by_role('button',name='Close written time',exact=True).click()

            # A duration-only missing note with a known future start can be excluded
            # strictly before that start. The new start is a separate exact query point.
            notation(page,2,start=1,denominator=4)
            before=labels(page);view(page).click()
            expect(panel(page).get_by_text('Timing incomplete',exact=True)).to_be_visible()
            expect(panel(page).get_by_text('Complete at this point',exact=True)).to_be_visible()
            expect(panel(page).get_by_text('1 written note at this point',exact=True)).to_be_visible()
            expect(panel(page).get_by_text('Point 1 of 3',exact=True)).to_be_visible()
            assert panel(page).locator('ul[aria-label="Written notes"] li[data-active]').count()==1
            proven=geometry(page);assert_geometry(proven);screenshot(page,'proven',width)
            panel(page).get_by_text('Details',exact=True).click()
            expect(panel(page).get_by_text('Current point · 0/1',exact=True)).to_be_visible()
            proof_details=geometry(page);assert_geometry(proof_details);screenshot(page,'proof-details',width)
            panel(page).get_by_text('Details',exact=True).click()
            panel(page).get_by_role('button',name='Next written time point',exact=True).click()
            expect(panel(page).get_by_text('More timing needed at this point',exact=True)).to_be_visible()
            expect(panel(page).get_by_text('Complete at this point',exact=True)).to_have_count(0)
            assert panel(page).locator('ul[aria-label="Written notes"] li[data-active]').count()==0
            panel(page).get_by_text('Details',exact=True).click()
            expect(panel(page).get_by_text('Current point · 1/4',exact=True)).to_be_visible()
            panel(page).get_by_text('Details',exact=True).click()
            uncertain=geometry(page);assert_geometry(uncertain);screenshot(page,'uncertain',width)
            panel(page).get_by_role('button',name='Next written time point',exact=True).click()
            expect(panel(page).get_by_text('More timing needed at this point',exact=True)).to_be_visible()
            expect(panel(page).get_by_text('Outside observed range',exact=True)).to_have_count(0)
            expect(panel(page).get_by_role('button',name='Previous written time point',exact=True)).to_be_focused()
            assert labels(page)==before
            page.get_by_role('button',name='Close written time',exact=True).click()

            # Nine known intervals exercise bounded eight-row pages in a real source.
            imported(page,9)
            for index in range(1,10):notation(page,index,start=index-1,quarter=True)
            before=labels(page);view(page).click()
            rows=panel(page).get_by_role('list',name='Written notes').locator('li')
            expect(rows).to_have_count(8);expect(panel(page).get_by_text('Page 1 of 2',exact=True)).to_be_visible()
            dense=geometry(page);assert_geometry(dense);screenshot(page,'dense-page1',width)
            page_next=panel(page).get_by_role('button',name='Next written notes page',exact=True)
            page_previous=panel(page).get_by_role('button',name='Previous written notes page',exact=True)
            page_next.click();expect(rows).to_have_count(1);expect(panel(page).get_by_text('Page 2 of 2',exact=True)).to_be_visible();expect(page_previous).to_be_focused()
            page_previous.click();expect(rows).to_have_count(8);expect(page_next).to_be_focused()
            assert labels(page)==before,'read-only page actions altered notation labels'
            # Undo must still target the final explicit Quarter selection, not a view action.
            page.get_by_role('button',name='Undo',exact=True).click()
            assert 'duration 3/2 quarter notes' in cell(page,9).get_attribute('aria-label')
            expect(panel(page)).to_have_count(0);expect(view(page)).to_have_attribute('aria-expanded','false')
            page.get_by_role('button',name='Redo',exact=True).click()
            assert 'duration 1/1 quarter notes' in cell(page,9).get_attribute('aria-label')
            assert not errors,errors
            results.append({'width':width,'default':default,'restOnly':rest_only,'complete':complete,'gap':gap,'partial':partial,'proven':proven,'proofDetails':proof_details,'uncertain':uncertain,'dense':dense,'aboutOpen':about_open,'detailsOpen':details_open,'keyboardFocus':focus,'errors':errors,
                            'passed':['quiet default','rest-only empty state','no-meter complete population','exact finite endpoint queries','gap without inferred rest','final endpoint outside range','unknown-start uncertain queries','duration-only missing onset exclusion','strict 1/4 boundary and final known end remain partial','eight-row pagination','read-only source labels and Undo/Redo history','visible keyboard focus','44px controls','reduced motion','no page overflow']})
            context.close()
        browser.close()
    (OUT/'results.json').write_text(json.dumps({'browser':'system Chromium, real authored inputs; not physical device or usability participant study','results':results},indent=2))
    print(json.dumps([{'width':r['width'],'completeHeight':r['complete']['panel']['height'],'partialHeight':r['partial']['panel']['height'],'denseHeight':r['dense']['panel']['height'],'errors':r['errors']} for r in results]))

if __name__=='__main__':main()
