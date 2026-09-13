// Live browser cutover regression; a new isolated CDP target only. Desktop Chrome
// with viewport/touch emulation is not a physical mobile-device performance test.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.CHORD_URL ?? 'http://localhost:3003';
const cdp = process.env.CHORD_CDP ?? 'http://127.0.0.1:9333';
const version = await (await fetch(`${cdp}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let sequence = 0, targetId, sessionId;
const pending = new Map(), errors = [], checks = [], measurements = [];
ws.addEventListener('message', event => {
    const message = JSON.parse(event.data), call = pending.get(message.id);
    if (call) { pending.delete(message.id); message.error ? call.reject(Error(JSON.stringify(message.error))) : call.resolve(message.result); }
    if (message.sessionId === sessionId && message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
});
const send = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) })); });
const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression, message) { for (let i = 0; i < 600; i++) { if (await evaluate(expression)) return; await sleep(100); } throw Error(message); }
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const section = q('section[aria-label="Chord voicings"]');
const selected = `${section}?.querySelector('[data-selected-id]')?.dataset.selectedId`;
const results = `${section}?.querySelector('[data-results-count]')`;
const count = `${results}?.dataset.resultsCount`;
const cards = `${section}?.querySelectorAll('[data-voicing-id]')`;
const button = text => `[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)})`;
let touch = false;
async function size(width, height, mobile = false) { touch = mobile; await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }); await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 1 }); }
async function point(expression) { return evaluate(`(async()=>{const e=${expression};if(!e)throw Error('Missing target');e.scrollIntoView({block:'center'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`); }
async function press(p) { await send(touch ? 'Input.dispatchTouchEvent' : 'Input.dispatchMouseEvent', touch ? { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] } : { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); }
async function release(p) { await send(touch ? 'Input.dispatchTouchEvent' : 'Input.dispatchMouseEvent', touch ? { type: 'touchEnd', touchPoints: [] } : { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); }
async function activate(expression) { const p = await point(expression); await press(p); await sleep(touch ? 120 : 30); await release(p); await sleep(touch ? 200 : 100); }
const click = text => activate(button(text));
const ready = () => waitFor(`!!${results}`, 'No exact UI result after 60 seconds');
async function choice(label, value) { await activate(`[...document.querySelectorAll('fieldset')].find(e=>e.querySelector('legend')?.textContent===${JSON.stringify(label)})?.querySelector(${JSON.stringify(`input[value="${value}"]`)})`); await ready(); }
async function key(name, code, shift = false) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0 }); }
async function filters(open = true) { const toggle = q('button[aria-controls$="-filters"]'); if (await evaluate(`${toggle}.getAttribute('aria-expanded')`) !== String(open)) await activate(toggle); }
function check(value, label) { assert.ok(value, label); checks.push(label); console.log(label); }
async function screenshot(name) { const shot = await send('Page.captureScreenshot', { format: 'png' }); await mkdir('docs/implementation/screenshots', { recursive: true }); await writeFile(`docs/implementation/screenshots/${name}.png`, Buffer.from(shot.data, 'base64')); }
try {
    ({ targetId } = await send('Target.createTarget', { url: 'about:blank' }, null));
    ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, null));
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.engineSmoke={starts:0,stops:0,maxBytes:0,maxCards:0,viewRequests:0,kinds:[]};
        window.Worker=new Proxy(window.Worker,{construct(Target,args){const w=new Target(...args);window.engineSmoke.starts++;
            const stop=w.terminate.bind(w),post=w.postMessage.bind(w);
            w.postMessage=(m,...rest)=>{if(m?.kind==='SET_VIEW')window.engineSmoke.viewRequests++;return post(m,...rest);};
            w.terminate=()=>{window.engineSmoke.stops++;stop();};
            w.addEventListener('message',e=>{if(e.data?.protocol!=='engine-worker-v1')return;
                window.engineSmoke.maxBytes=Math.max(window.engineSmoke.maxBytes,new TextEncoder().encode(JSON.stringify(e.data)).byteLength);
                window.engineSmoke.kinds.push(e.data.kind);window.engineSmoke.kinds=window.engineSmoke.kinds.slice(-60);});return w;}});
        new MutationObserver(()=>{window.engineSmoke.maxCards=Math.max(window.engineSmoke.maxCards,document.querySelectorAll('[data-voicing-id]').length);}).observe(document,{childList:true,subtree:true});` });
    await size(1440, 1000); await send('Page.navigate', { url: base });
    await waitFor(`document.querySelector('button')&&Object.keys(document.querySelector('button')).some(k=>k.startsWith('__reactProps'))`, 'App did not hydrate');
    const started = performance.now(); await click('Chord'); await ready();
    measurements.push({ scenario: 'Chord entry to first rendered exact page, dev server', elapsedMs: performance.now() - started });
    check(await evaluate(`${cards}.length===6`), 'Initial exact page renders six cards');
    const initial = await evaluate(selected), starts = await evaluate('window.engineSmoke.starts');
    await click('Next page'); await ready();
    check(await evaluate(`${cards}.length===12`), 'Next page replaces six cards with twelve');
    check(await evaluate(selected) === initial, 'Page navigation retains the selected allocation');
    check(await evaluate('window.engineSmoke.starts') === starts, 'Paging reuses the same worker');
    await activate(`${cards}[11]`); const later = await evaluate(selected);
    await click('Previous page'); await ready();
    check(await evaluate(`${cards}.length===6`) && await evaluate(selected) === later, 'Previous page restores its page size and retains an off-page selection');
    await filters(); await choice('Root inclusion', 'omit');
    check(await evaluate(count) === '0' && await evaluate(selected) === later, 'Exact no-match view retains selection independently');
    check(await evaluate(`${section}.innerText.includes('outside these filters')`), 'Off-filter selection is explained');
    await click('Enable accompaniment'); await ready();
    check(Number(await evaluate(count)) > 0 && await evaluate(selected) === later, 'Context revalidation preserves a still-valid selected allocation');
    await choice('Sounding strings', '2'); await ready();
    await activate(`${cards}[0]`); const rootless = await evaluate(selected);
    check(!!rootless, 'Rootless two-tone accompaniment allocation can be selected');
    await activate(q('[aria-label="Exclude accompaniment shapes"]')); await ready();
    check(await evaluate(count) === '0' && !await evaluate(selected), 'Invalid rootless selection is removed after standalone revalidation');
    check(await evaluate(`${section}.innerText.includes('previous allocation is unavailable')`), 'Unavailable selection notice remains visible with no replacement');
    await click('Clear filters'); await ready();
    await waitFor(`!${section}.querySelector('[aria-label="Active filters"]')`, 'Clear filters did not reset the view');
    await choice('Physical assessment', 'UNCERTAIN'); await ready();
    await activate(`${cards}[0]`);
    check(await evaluate(`${section}.querySelector('[data-selected-id] [data-assessment]').dataset.assessment==='UNCERTAIN'`), 'UNCERTAIN candidates remain selectable');
    check(!await evaluate(`${section}.querySelector('[data-selected-id] [data-play-id]').disabled`), 'UNCERTAIN selected candidate retains enabled playback');
    await activate(`${section}.querySelector('[data-selected-id] [data-play-id]')`); await sleep(500);
    check(!await evaluate(`!!document.querySelector('[role=alert]')`), 'UNCERTAIN playback completes without a displayed audio error');
    await click('Details');
    check(await evaluate(`document.querySelectorAll('[data-ledger-term]').length===14`), 'Details renders all fourteen ranking ledger terms');
    check(await evaluate(`${section}.innerText.includes('Human validation: absent.')&&${section}.innerText.includes('Partial-cover groups:')&&${section}.innerText.includes('647.7 mm (default)')`), 'Details separates heuristic metrics, absent human validation and profile provenance');
    check(!await evaluate(`${section}.innerText.includes('Estimated finger groups')||${section}.innerText.includes('Comfort depends')`), 'Retired finger-count and comfort wording is absent');
    await click('Details'); await filters(false);
    const beforeRange = await evaluate(selected);
    await evaluate(`${q('[data-range-handle="min"]')}.focus()`); await key('End', 35); await ready();
    check(await evaluate(`${q('[data-range-handle="min"]')}.getAttribute('aria-valuenow')==='15'`) && await evaluate(selected) === beforeRange, 'Range keyboard End preserves selection');
    await size(390, 844, true);
    const viewsBeforeDrag = await evaluate('window.engineSmoke.viewRequests');
    const p = await point(q('[data-range-handle="max"]')); await press(p); await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x - 70, y: p.y, id: 1 }] });
    await sleep(100);
    check(await evaluate('window.engineSmoke.viewRequests') === viewsBeforeDrag, 'Range drag previews do not commit engine view requests');
    await release({ x: p.x - 70, y: p.y }); await ready();
    check(await evaluate('window.engineSmoke.viewRequests') === viewsBeforeDrag + 1, 'Range pointer release commits exactly one engine view request');
    check(Number(await evaluate(`${q('[data-range-handle="min"]')}.getAttribute('aria-valuenow')`)) < 15, 'Touch interaction can reopen coincident fret handles');
    await sleep(350); // Separate the completed drag gesture from the next tap.
    await click('Clear filters'); await ready();
    await waitFor(`!${section}.querySelector('[aria-label="Active filters"]')`, 'Touch Clear filters did not reset the view');
    check(true, 'Touch Clear filters restores unconstrained position and both physical statuses');
    await click('Next page'); await ready(); await click('First page'); await ready();
    check(await evaluate(`${cards}.length===6`), 'First page resets cursor history to the initial six results');
    await click('Full fretboard');
    check(await evaluate(`document.querySelector('dialog')?.open===true`), 'Full fretboard opens a native modal dialog');
    await key('Tab', 9); check(await evaluate(`document.querySelector('dialog').contains(document.activeElement)`), 'Tab focus stays inside the modal');
    await key('Escape', 27); await sleep(100);
    check(!await evaluate(`!!document.querySelector('dialog')`) && await evaluate(`document.activeElement.textContent==='Full fretboard'`), 'Escape closes dialog and returns focus to its trigger');
    check(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), '390 px viewport has no page-level horizontal overflow');
    await screenshot('engine-ui-mobile-emulation');
    await size(1440, 1000); await screenshot('engine-ui-desktop');
    const instrumentation = await evaluate('window.engineSmoke');
    check(instrumentation.maxCards <= 48, 'Rendered result cards stay within forty-eight');
    check(instrumentation.maxBytes <= 1048576, 'Every observed worker message stays within one MiB');
    check(errors.length === 0, 'No uncaught page runtime exceptions');
    const evidence = { schema: 'engine-ui-browser-v1', measuredAt: new Date().toISOString(), browser: version.Browser, url: base,
        build: 'Next development server; functional UI regression only', passed: true, checks, measurements, instrumentation, errors,
        screenshots: ['docs/implementation/screenshots/engine-ui-mobile-emulation.png', 'docs/implementation/screenshots/engine-ui-desktop.png'],
        limits: ['Desktop Chrome only; mobile viewport/touch emulation is not real mobile-device evidence.', 'Not a release-build benchmark or complete assistive-technology accessibility audit.', 'No human preference, playability or comfort benefit claim.'] };
    await mkdir('docs/implementation', { recursive: true }); await writeFile('docs/implementation/engine-ui-browser.json', `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(JSON.stringify(evidence, null, 2));
} finally { if (targetId) await send('Target.closeTarget', { targetId }, null); ws.close(); }
