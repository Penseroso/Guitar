// Requires the app on localhost:3003 and a dedicated headless Chrome CDP instance on 9333.
// Uses Node's built-in WebSocket; no browser-testing dependency or user profile is needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const targets = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.id) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) request.reject(message.error);
        else request.resolve(message.result);
    }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    ws.send(JSON.stringify({ id: next, method, params }));
});
async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
}
async function waitFor(expression, message) {
    for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(message);
}
const click = text => evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)});
    if (!button) throw Error('Missing button'); button.click();
})()`);
const change = async (label, value) => {
    const custom = await evaluate(`document.querySelector('[role="combobox"][aria-label="' + ${JSON.stringify(label)} + '"]') !== null`);
    if (custom) {
        await evaluate(`document.querySelector('[role="combobox"][aria-label="' + ${JSON.stringify(label)} + '"]').click()`);
        await waitFor(`!!document.querySelector('[role="listbox"]')`, 'SelectPill did not open');
        await evaluate(`[...document.querySelectorAll('[role="option"]')].find(e => e.getAttribute('data-value') === ${JSON.stringify(String(value))}).click()`);
    } else {
        await evaluate(`(() => { const element = document.querySelector('input[aria-label="' + ${JSON.stringify(label)} + '"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, ${JSON.stringify(String(value))}); element.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    }
};
const section = `document.querySelector('section[aria-label="Chord voicings"]')`;
const selectedId = `${section}.querySelector('[data-selected-id]')?.dataset.selectedId`;
const pressKey = async (name, code) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code });
};
const escapeDialog = async () => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
};
try {
    await send('Runtime.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.chordWorkerStarts = 0; window.Worker = new Proxy(window.Worker, { construct(target, args) { window.chordWorkerStarts++; return new target(...args); } });` });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://localhost:3003' });
    await waitFor(`document.querySelector('button') && Object.keys(document.querySelector('button')).some(key => key.startsWith('__reactProps'))`, 'App did not hydrate');
    await click('Chord');
    await waitFor(`${section}?.innerText.includes('Showing 6 of 2340 voicings')`, 'Default worker pool missing');
    assert.equal(await evaluate(`document.querySelectorAll('header').length`), 1, 'Duplicate app header');
    assert.equal(await evaluate(`!!document.querySelector('svg[viewBox="-160 -160 320 320"]')`), false, 'Scale circle leaked into CHORD');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[aria-label="Root C"]')).backgroundColor`), 'rgb(255, 255, 255)', 'CHORD CSS overrides KeyButton selected appearance');
    const original = await evaluate(selectedId);
    const starts = await evaluate('window.chordWorkerStarts');
    await evaluate(`[...document.querySelectorAll('summary')].find(e => e.textContent === 'Details').click()`);
    await click('Full fretboard');
    await waitFor(`!!document.querySelector('[data-fret="24"]')`, 'Full neck missing');
    await click('Close fretboard');
    await click('Show more');
    await waitFor(`${section}.querySelectorAll('[data-voicing-id]').length === 18`, 'Pagination failed');
    assert.equal(await evaluate(selectedId), original);
    assert.equal(await evaluate('window.chordWorkerStarts'), starts, 'Presentation triggered generation');
    const later = await evaluate(`${section}.querySelectorAll('[data-voicing-id]')[12].dataset.voicingId`);
    await evaluate(`${section}.querySelectorAll('[data-voicing-id]')[12].click()`);
    await click('Position');
    const rangeBox = await evaluate(`document.querySelector('input[aria-label="Min stopped fret"]').getBoundingClientRect().toJSON()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rangeBox.x + 22, y: rangeBox.y + 22, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rangeBox.x + 22 + (rangeBox.width - 44) * .4, y: rangeBox.y + 22, button: 'left', buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rangeBox.x + 22 + (rangeBox.width - 44) * .4, y: rangeBox.y + 22, button: 'left', clickCount: 1 });
    assert.ok(await evaluate(`Number(document.querySelector('input[aria-label="Min stopped fret"]').value) > 0`), 'Range handle did not drag');
    await change('Min stopped fret', 11);
    await change('Max stopped fret', 3);
    assert.equal(await evaluate(`document.querySelector('input[aria-label="Max stopped fret"]').value`), '11', 'Slider bounds crossed');
    assert.equal(await evaluate(selectedId), later, 'Filtering replaced selection');
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith('Position')).click()`);
    assert.equal(await evaluate(`${section}.querySelector('[aria-label="Active filters"]').innerText.includes('11')`), true, 'Hidden active filters');
    await click('Clear all');
    await evaluate(`document.querySelector('[role="combobox"][aria-label="Top"]').focus()`);
    await pressKey('ArrowDown', 40); await pressKey('ArrowDown', 40); await pressKey('Enter', 13);
    await waitFor(`${section}.querySelector('[aria-label="Active filters"]')?.textContent.includes('Top: 1')`, 'SelectPill keyboard selection failed');
    await click('Clear all');
    await change('Chord type', 'dominant-7');
    await waitFor(`${section}.innerText.includes('Showing 6 of 4212 voicings')`, 'C7 pool missing');
    await click('More filters');
    await change('Root', 'omit');
    await waitFor(`${section}.innerText.includes('Showing 0 of 0 voicings')`, 'Standalone allowed root omission');
    const beforeContext = await evaluate(selectedId);
    await evaluate(`document.getElementById('chord-accompaniment').click()`);
    await waitFor(`${section}.querySelectorAll('[data-voicing-id]').length === 6`, 'Accompaniment pool missing');
    assert.equal(await evaluate(selectedId), beforeContext, 'Context discarded an available selection');
    await change('Sounding strings', 2);
    await change('Bass', '3');
    await change('Top', 'b7');
    await waitFor(`${section}.innerText.includes('Showing 6 of 25 voicings')`, 'Guide-tone filters failed');
    const guide = await evaluate(`${section}.querySelector('[data-voicing-id]').dataset.voicingId`);
    await evaluate(`${section}.querySelector('article [data-play-id]').click()`);
    await waitFor(`${selectedId} === ${JSON.stringify(guide)}`, 'Play did not select its candidate');
    await new Promise(resolve => setTimeout(resolve, 700));
    assert.equal(await evaluate(`!!${section}.querySelector('[role="alert"]')`), false, 'Audio error');
    await evaluate(`document.getElementById('chord-accompaniment').click()`);
    await waitFor(`${section}.innerText.includes('Previous voicing is unavailable')`, 'Missing context replacement notice');
    await waitFor(`${section}.innerText.includes('Showing 0 of 0 voicings')`, 'Context relaxed root filter');
    await click('Clear all');
    await change('Chord type', 'major');
    await waitFor(`${section}.innerText.includes('2340 voicings')`, 'Major reset failed');
    await evaluate(`document.querySelector('[aria-label="Root C"]').focus()`);
    await evaluate(`document.querySelector('[aria-label="Root C"]').click()`);
    await waitFor(`!!document.querySelector('[popover]:popover-open')`, 'Root picker did not open');
    assert.equal(await evaluate(`!!document.querySelector('[popover] svg[viewBox="-160 -160 320 320"]')`), true, 'Original circle missing');
    assert.equal(await evaluate(`document.querySelectorAll('[popover] g[transform]').length`), 0, 'Circle must stay stationary');
    const beforeTurn = await evaluate('window.chordWorkerStarts');
    const key = async (name, code) => {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code });
    };
    await key('ArrowRight', 39);
    assert.equal(await evaluate(`document.querySelector('[role="slider"]').getAttribute('aria-valuetext')`), 'G');
    assert.equal(await evaluate('window.chordWorkerStarts'), beforeTurn, 'Preview regenerated candidates');
    await escapeDialog();
    await waitFor(`!document.querySelector('[popover]')`, 'Escape did not close root picker');
    assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Root C', 'Root picker did not restore focus');
    const rootBox = await evaluate(`document.querySelector('[aria-label="Root C"]').getBoundingClientRect().toJSON()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rootBox.x + 28, y: rootBox.y + 28, button: 'left', clickCount: 1 });
    await waitFor(`!!document.querySelector('[popover]:popover-open')`, 'Hold did not expand circle');
    const circleBox = await evaluate(`document.querySelector('[role="slider"]').getBoundingClientRect().toJSON()`);
    const popupBox = await evaluate(`document.querySelector('[popover]').getBoundingClientRect().toJSON()`);
    assert.ok(Math.abs(popupBox.x - rootBox.x) < 24, 'Root picker is not anchored near its trigger');
    const radius = (circleBox.width - 16) / 2 * 101 / 160;
    const point = { x: circleBox.x + circleBox.width / 2 + radius * .5, y: circleBox.y + circleBox.height / 2 - radius * Math.sqrt(3) / 2 };
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, button: 'left', buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await waitFor(`${section}.querySelector('h2')?.textContent === 'G'`, 'Hold, point and release did not choose G');
    await evaluate(`document.querySelector('[aria-label="Root G"]').click()`);
    await waitFor(`!!document.querySelector('[popover]:popover-open')`, 'Root picker reopen failed');
    await key('ArrowLeft', 37); await key('Enter', 13);
    await waitFor(`${section}.innerText.includes('2340 voicings')`, 'Root reset failed');
    const sizes = [];
    for (const width of [320, 390, 768, 1024, 1440]) {
        const height = width < 1024 ? 844 : 900;
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
        await evaluate('window.scrollTo(0, 0)');
        const size = await evaluate(`(() => {
            const visible = [...document.querySelectorAll('button,select,input,summary')].filter(e => e.getClientRects().length);
            const clipped = visible.filter(e => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map(e => e.textContent.trim());
            const small = visible.filter(e => e.tagName !== 'INPUT' || e.type !== 'checkbox').filter(e => e.getBoundingClientRect().height < 44).map(e => e.textContent.trim());
            const play = document.querySelector('[data-selected-id] [data-play-id]').getBoundingClientRect();
            return { width: innerWidth, body: document.body.scrollWidth, playBottom: play.bottom, clipped, small };
        })()`);
        assert.ok(size.body <= width, 'Page width overflow');
        assert.deepEqual(size.clipped, [], `Clipped controls at ${width}`);
        assert.deepEqual(size.small, [], `Small controls at ${width}`);
        if (width === 390 || width === 1440) {
            assert.ok(size.playBottom <= height, `Play below first screen at ${width}`);
            const screenshot = await send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(`.next/chord-ui-${width}.png`, Buffer.from(screenshot.data, 'base64'));
        }
        sizes.push(size);
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await evaluate('window.scrollTo(0, 0)');
    const touchRoot = await evaluate(`document.querySelector('[aria-label="Root C"]').getBoundingClientRect().toJSON()`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchRoot.x + 28, y: touchRoot.y + 28, id: 1 }] });
    await waitFor(`!!document.querySelector('[popover]:popover-open')`, 'Touch hold did not open root picker');
    const touchCircle = await evaluate(`document.querySelector('[role="slider"]').getBoundingClientRect().toJSON()`);
    const touchRadius = (touchCircle.width - 16) / 2 * 101 / 160;
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchCircle.x + touchCircle.width / 2 + Math.sqrt(3) / 2 * touchRadius, y: touchCircle.y + touchCircle.height / 2 - touchRadius / 2, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await waitFor(`${section}.querySelector('[data-selected-id] h2')?.textContent === 'D'`, 'Touch release did not select D');
    await click('Full fretboard');
    await waitFor(`!!document.querySelector('dialog[open] [data-fret="24"]')`, 'Mobile fretboard dialog missing');
    await escapeDialog();
    assert.equal(await evaluate(`!!document.querySelector('dialog')`), false);
    await send('Emulation.setDeviceMetricsOverride', { width: 720, height: 450, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate(`[...document.querySelectorAll('header button')].every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })`), true, 'Header fails reflow');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ sharedPool: true, pagination: true, filters: true, selectionPreserved: true,
        accompaniment: true, playSelects: true, circleFocus: true, stationaryPointSelection: true, touchRootSelection: true, sliderDrag: true, selectPillKeyboard: true, mobileNeck: true, sizes, browserErrors: errors }, null, 2));
} finally {
    await send('Emulation.clearDeviceMetricsOverride');
    ws.close();
}
