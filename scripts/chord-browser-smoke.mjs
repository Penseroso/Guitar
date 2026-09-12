// Run against the built app and a dedicated headless Chromium profile.
// CHORD_URL and CHORD_CDP can override the local defaults.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = process.env.CHORD_URL ?? 'http://localhost:3003';
const targets = await (await fetch(process.env.CHORD_CDP ?? 'http://127.0.0.1:9333/json/list')).json();
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
        if (message.error) request.reject(message.error); else request.resolve(message.result);
    }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id; pending.set(next, { resolve, reject });
    ws.send(JSON.stringify({ id: next, method, params }));
});
const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression, message) {
    for (let attempt = 0; attempt < 150; attempt++) {
        if (await evaluate(expression)) return;
        await pause(100);
    }
    throw Error(message);
}
let touch = false;
async function size(width, height, mobile = false) {
    touch = mobile;
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 1 });
}
async function point(expression) {
    return evaluate('(() => { const e = ' + expression + '; if (!e) throw Error("Missing target"); e.scrollIntoView({block:"nearest"}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()');
}
async function pressAt(p) {
    if (touch) await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] });
    else await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
}
async function moveTo(p) {
    if (touch) await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] });
    else await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p, button: 'left', buttons: 1 });
}
async function releaseAt(p) {
    if (touch) await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
}
async function activate(expression) {
    const p = await point(expression);
    await pressAt(p); await pause(30); await releaseAt(p); await pause(80);
}
const button = text => '[...document.querySelectorAll("button")].find(e => e.textContent.trim() === ' + JSON.stringify(text) + ')';
const click = text => activate(button(text));
const select = async (group, value) => {
    const field = '[...document.querySelectorAll("fieldset")].find(e => e.querySelector("legend")?.textContent === ' + JSON.stringify(group) + ')';
    const target = field + '?.querySelector(' + JSON.stringify('input[value="' + value + '"]') + ')';
    await waitFor('!!' + target, 'Missing choice ' + group + ': ' + value);
    await activate(target);
};
const key = async (key, code) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: code });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: code });
};
const query = selector => 'document.querySelector(' + JSON.stringify(selector) + ')';
const section = query('section[aria-label="Chord voicings"]');
const selectedId = section + '.querySelector("[data-selected-id]")?.dataset.selectedId';
const results = section + '.querySelector("[data-results-count]")';
const ready = () => waitFor('!!' + results, 'Worker did not return results');
const title = section + '.querySelector("[data-selected-id] h2")?.textContent';
const root = query('button[aria-label^="Root "]');
const filterButton = query('button[aria-controls$="-filters"]');
const range = handle => query('[data-range-handle="' + handle + '"]');
const screenshot = async name => {
    await pause(400);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('.next/' + name + '.png', Buffer.from(shot.data, 'base64'));
};
let injection;
try {
    await send('Runtime.enable');
    await send('Page.enable');
    injection = await send('Page.addScriptToEvaluateOnNewDocument', { source: `
        window.chordWorkerStarts = 0; window.chordWorkerStops = 0; window.failChordWorker = false;
        window.chordInputLog = [];
        ['pointerdown','pointerup','click'].forEach(type => window.addEventListener(type, event => {
            window.chordInputLog.push({type,x:event.clientX,y:event.clientY,target:event.target?.getAttribute?.('aria-label') || event.target?.textContent?.slice(0,50)});
            window.chordInputLog = window.chordInputLog.slice(-12);
        }, true));
        window.Worker = new Proxy(window.Worker, { construct(target, args) {
            window.chordWorkerStarts++;
            if (window.failChordWorker) throw Error('Injected worker startup failure');
            const worker = new target(...args);
            const terminate = worker.terminate.bind(worker);
            worker.terminate = () => { window.chordWorkerStops++; terminate(); };
            return worker;
        }});
    ` });
    await size(1440, 900);
    await send('Page.navigate', { url: base });
    await waitFor('document.querySelector("button") && Object.keys(document.querySelector("button")).some(k=>k.startsWith("__reactProps"))', 'App did not hydrate');
    await screenshot('chord-check-scale-desktop');
    await click('Chord'); await ready();
    assert.equal(await evaluate('typeof window.chordWorkerStarts'), 'number', 'Worker instrumentation did not load');
    const original = await evaluate(selectedId);
    const starts = await evaluate('window.chordWorkerStarts');
    const qualityIds = [];
    for (const family of ['Basic', '6 / 7', 'Extended']) {
        await click(family);
        qualityIds.push(...await evaluate('[...document.querySelectorAll("[role=tabpanel] input[type=radio]")].map(e=>e.value)'));
        assert.equal(await evaluate(selectedId), original, 'Family browsing changed the selected chord');
    }
    assert.equal(new Set(qualityIds).size, 20, 'Missing or duplicated chord qualities');
    assert.equal(qualityIds.length, 20);
    assert.equal(await evaluate('window.chordWorkerStarts'), starts, 'Family browsing regenerated candidates');
    await click('Basic');
    await select('Chord quality', 'minor'); await waitFor(title + ' === "Cm"', 'Direct quality selection failed');
    await select('Chord quality', 'major'); await waitFor(title + ' === "C"', 'Direct quality reset failed');

    const beforeMore = await evaluate(section + '.querySelectorAll("[data-voicing-id]").length');
    const displayStarts = await evaluate('window.chordWorkerStarts');
    await click('Show more');
    const visible = await evaluate(section + '.querySelectorAll("[data-voicing-id]").length');
    assert.ok(visible > beforeMore, 'Show more did not expose more candidates');
    assert.equal(await evaluate('window.chordWorkerStarts'), displayStarts, 'Pagination regenerated candidates');
    assert.equal(await evaluate(selectedId), original);
    await activate(section + '.querySelectorAll("[data-voicing-id]")[' + (visible - 1) + ']');
    const later = await evaluate(selectedId);
    await evaluate(range('min') + '.focus()');
    await key('End', 35);
    assert.equal(await evaluate(selectedId), later, 'Range replaced selection');
    assert.equal(await evaluate(range('min') + '.getAttribute("aria-valuenow")'), '15');
    await size(390, 844, true);
    let p = await point(range('max'));
    await pressAt(p); await moveTo({ x: p.x - 80, y: p.y }); await releaseAt({ x: p.x - 80, y: p.y });
    assert.ok(Number(await evaluate(range('min') + '.getAttribute("aria-valuenow")')) < 15, 'Coincident handles cannot reopen to the left');
    await evaluate(range('max') + '.focus()'); await key('Home', 36);
    const shared = Number(await evaluate(range('max') + '.getAttribute("aria-valuenow")'));
    p = await point(range('min'));
    await pressAt(p); await moveTo({ x: p.x + 50, y: p.y }); await releaseAt({ x: p.x + 50, y: p.y });
    assert.ok(Number(await evaluate(range('max') + '.getAttribute("aria-valuenow")')) > shared, 'Coincident handles cannot reopen to the right');
    await click('Clear filters');

    await click('6 / 7'); await select('Chord quality', 'dominant-7'); await waitFor(title + ' === "C7"', 'C7 failed');
    await activate(filterButton);
    assert.equal(await evaluate('[...document.querySelectorAll("fieldset")].find(e=>e.querySelector("legend")?.textContent==="Top").innerText.includes("B♭ · ♭7")'), true);
    await select('Root inclusion', 'omit');
    assert.equal(await evaluate(results + '.dataset.resultsCount'), '0', 'Standalone root omission must stay empty');
    await click('Enable accompaniment'); await ready();
    assert.ok(Number(await evaluate(results + '.dataset.resultsCount')) > 0);
    await select('Sounding strings', '2');
    await select('Bass', '3'); await select('Top', 'b7');
    await select('Open strings', 'exclude'); await select('Chord-tone coverage', 'omissions');
    assert.ok(Number(await evaluate(results + '.dataset.resultsCount')) > 0, 'Guide tone filters lost candidates');
    await click('View results (' + await evaluate(results + '.dataset.resultsCount') + ')');
    const guide = await evaluate(section + '.querySelector("[data-voicing-id]").dataset.voicingId');
    await activate(section + '.querySelector("article [data-play-id]")'); await pause(600);
    assert.equal(await evaluate(selectedId), guide, 'Playing a card did not select it');
    assert.equal(await evaluate(section + '.querySelector("[data-selected-id]").innerText.includes("Bass E · 3")'), true);
    assert.equal(await evaluate(section + '.querySelector("[data-selected-id]").innerText.includes("Top B♭ · ♭7")'), true);
    assert.equal(await evaluate('!!document.querySelector("[role=alert]")'), false, 'Audio start error');
    await select('Playing context', 'standalone'); await ready();
    assert.equal(await evaluate(results + '.dataset.resultsCount'), '0', 'Context silently relaxed filters');
    assert.ok(await evaluate(section + '.innerText.includes("Previous voicing is unavailable")'));
    await click('Clear filters');
    await click('Extended'); await select('Chord quality', 'dominant-9'); await waitFor(title + ' === "C9"', 'C9 failed');
    await activate(filterButton);
    await select('Top', '9');
    assert.ok(await evaluate(query('[aria-label="Active filters"]') + '.textContent.includes("D · 9")'));
    await activate(root); await key('ArrowRight', 39); await key('Enter', 13);
    await waitFor(title + ' === "G9"', 'Root changed chord quality');
    assert.equal(await evaluate('!!' + query('[aria-label="Active filters"]')), false, 'Root did not reset filters');
    await activate(filterButton);
    assert.ok(await evaluate('[...document.querySelectorAll("fieldset")].find(e=>e.querySelector("legend")?.textContent==="Top").innerText.includes("A · 9")'));

    await activate(root);
    await waitFor('!!document.querySelector("[popover]:popover-open")', 'Tap did not keep root open');
    const previewStarts = await evaluate('window.chordWorkerStarts');
    await key('ArrowRight', 39);
    assert.equal(await evaluate(title), 'G9');
    assert.equal(await evaluate('window.chordWorkerStarts'), previewStarts, 'Root preview started generation');
    await key('Escape', 27);
    assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Root G');
    await activate(root); await key('Home', 36); await key('Enter', 13); await waitFor(title + ' === "C9"', 'Root keyboard reset failed');
    await activate(root);
    await activate(query('[role=option][aria-label="G"]'));
    await waitFor(title + ' === "G9"', 'Root option tap failed');
    await activate(root);
    await activate(query('[role=option][aria-label="C"]'));
    await waitFor(title + ' === "C9"', 'Root option tap reset failed');

    // Hold, point, release is optional; ordinary tap above is the primary path.
    p = await point(root); await pressAt(p); await waitFor('!!document.querySelector("[role=listbox]")', 'Hold failed to open root');
    const circle = await evaluate('document.querySelector("[role=listbox]").getBoundingClientRect().toJSON()');
    const radius = (circle.width - 16) / 2 * 106 / 160;
    const target = { x: circle.x + circle.width / 2 + radius * Math.sqrt(3) / 2, y: circle.y + circle.height / 2 - radius / 2 };
    await pause(200);
    for (let step = 1; step <= 8; step++) {
        await moveTo({ x: p.x + (target.x - p.x) * step / 8, y: p.y + (target.y - p.y) * step / 8 });
        await pause(25);
    }
    await pause(80); await releaseAt(target);
    await waitFor(title + ' === "D9"', 'Touch hold root selection failed');
    // Let Chromium finish the drag gesture before starting the next tap.
    await pause(350);
    assert.equal(await evaluate(root + '.getAttribute("aria-expanded")'), 'false', 'Completed root drag reopened the picker');

    await click('Basic'); await select('Chord quality', 'major'); await waitFor(title + ' === "D"', 'Quality reset failed');
    await activate(section + '.querySelectorAll("[data-voicing-id]")[1]');
    await click('Full fretboard');
    await waitFor('!!document.querySelector("dialog[open]")', 'Fretboard failed to open');
    const neck = await evaluate(`(() => { const e=document.querySelector('dialog [aria-label="Full guitar fretboard, scroll horizontally"]');const fret=document.querySelector('dialog [data-fret="10"]');return {scroll:e.scrollLeft,viewport:e.getBoundingClientRect().toJSON(),target:fret.getBoundingClientRect().toJSON(),open:document.querySelector('dialog').innerText.includes('Open strings:')}; })()`);
    assert.ok(neck.open, 'Open string summary missing');
    assert.ok(neck.scroll > 0 && neck.target.left >= neck.viewport.left && neck.target.left < neck.viewport.right, 'High stopped frets hidden by open strings');
    await screenshot('chord-check-neck-mobile');
    for (let step = 0; step < 6; step++) {
        await key('Tab', 9);
        // Native modal dialogs may yield focus to browser chrome, represented by body.
        assert.ok(await evaluate('document.activeElement === document.body || document.querySelector("dialog").contains(document.activeElement)'), 'Background control received modal focus');
    }
    await evaluate(root + '.focus()');
    assert.equal(await evaluate('document.activeElement === ' + root), false, 'Modal background is not inert');
    await key('Escape', 27);
    assert.equal(await evaluate('document.activeElement.textContent'), 'Full fretboard');

    await evaluate('window.failChordWorker = true');
    await select('Chord quality', 'minor');
    await waitFor('!!document.querySelector("[role=alert]")', 'Worker failure not shown');
    await evaluate('window.failChordWorker = false');
    await click('Retry search'); await waitFor(title + ' === "Dm"', 'Worker retry failed');
    const stops = await evaluate('window.chordWorkerStops');
    await select('Chord quality', 'sus2'); await select('Chord quality', 'major');
    await waitFor(title + ' === "D"', 'Latest request lost');
    assert.ok(await evaluate('window.chordWorkerStops') > stops, 'Superseded worker not terminated');

    await activate(root); await key('Home', 36); await key('Enter', 13); await waitFor(title + ' === "C"', 'Reset to C failed');
    const sizes = [];
    for (const [width, height] of [[320,568],[390,667],[390,844],[768,900],[1024,900],[1440,900]]) {
        await size(width, height, width < 768); await evaluate('window.scrollTo(0,0)'); await pause(100);
        const metrics = await evaluate(`(() => {
            const controls=[...document.querySelectorAll('section[aria-label="Chord workspace"] button,section[aria-label="Chord workspace"] input')].filter(e=>e.getClientRects().length);
            const bad=controls.filter(e=>{const r=e.getBoundingClientRect();return r.width<43||r.height<43||r.left<0||r.right>innerWidth;}).map(e=>e.getAttribute('aria-label')||e.textContent);
            const play=document.querySelector('[data-selected-id] [data-play-id]').getBoundingClientRect();
            return {width:innerWidth,height:innerHeight,body:document.body.scrollWidth,bad,playBottom:play.bottom};
        })()`);
        assert.equal(metrics.body <= width, true, 'Page overflow');
        assert.deepEqual(metrics.bad, [], 'Control size or clipping at ' + width);
        if (width === 390 && height === 844) assert.ok(metrics.playBottom < height, 'Selected playback inaccessible in first standard mobile viewport');
        sizes.push(metrics);
        if (width === 1440 || width === 390 && height === 844) await screenshot('chord-check-' + width);
        await activate(filterButton);
        await pause(80);
        assert.equal(await evaluate('document.body.scrollWidth <= innerWidth'), true, 'Expanded choices overflow');
        await evaluate('[...document.querySelectorAll("fieldset")].find(e=>e.querySelector("legend")?.textContent==="Bass").scrollIntoView({block:"start"})');
        await screenshot('chord-check-filters-' + width);
        await activate(filterButton);
        await activate(root);
        const popupBounds = await evaluate('document.querySelector("[popover]:popover-open").getBoundingClientRect().toJSON()');
        assert.ok(popupBounds.left >= 0 && popupBounds.right <= width && popupBounds.top >= 0 && popupBounds.bottom <= height, 'Root popup clipped');
        if (width === 320 || width === 1440) await screenshot('chord-check-root-' + width);
        await key('Escape', 27);
    }
    // Reflow at the CSS width of a 1440px display at 200% zoom.
    await size(720, 450); await activate(filterButton);
    assert.equal(await evaluate('document.body.scrollWidth <= innerWidth'), true);
    await activate(filterButton);
    await size(1440,900); await click('Scale'); await evaluate('window.scrollTo(0,0)'); await screenshot('chord-check-scale-after'); await click('Prog'); await evaluate('window.scrollTo(0,0)'); await screenshot('chord-check-prog-after');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ familyBrowsing: true, directChoices: true, noteDegreeLabels: true, fullPoolSelection: true,
        context: true, rootTapAndHold: true, rangeOverlap: true, playbackSelection: true, highFretWithOpenStrings: true,
        workerRetry: true, responsive: sizes, browserErrors: errors }, null, 2));
} catch (error) {
    console.error('Last input events:', await evaluate('window.chordInputLog'));
    throw error;
} finally {
    if (injection) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection.identifier });
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    ws.close();
}
