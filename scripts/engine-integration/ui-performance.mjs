// Release UI measurements through public DOM controls and actual DedicatedWorkers.
// Default: every standard request 30 times. Ancillary page/filter/card-selection
// timings use the census-widest root of each quality/context (40 requests x30).
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { cpus, platform, release, totalmem } from 'node:os';
import { execFileSync } from 'node:child_process';

const base = process.env.CHORD_URL ?? 'http://localhost:3004';
const cdp = process.env.CHORD_CDP ?? 'http://127.0.0.1:9333';
const runs = Number(process.env.ENGINE_BENCH_RUNS ?? 30);
assert.ok(Number.isInteger(runs) && runs > 0);
const qualityFilter = process.env.ENGINE_BENCH_QUALITIES?.split(',');
const contextFilter = process.env.ENGINE_BENCH_CONTEXTS?.split(',');
const skippedGroups = (process.env.ENGINE_BENCH_SKIP_GROUPS ?? '').split(',').filter(Boolean);
const censusBytes = await readFile('docs/implementation/engine-census.json'), census = JSON.parse(censusBytes);
const qualities = [...new Set(census.rows.map(row => row.chordId))].filter(id => !qualityFilter || qualityFilter.includes(id));
const fixtureGroups = qualities.flatMap(chordId => ['standalone', 'accompaniment'].filter(context => !contextFilter || contextFilter.includes(context)).map(context => {
    const rows = census.rows.filter(row => row.chordId === chordId && row.context === context);
    const widest = [...rows].sort((a, b) => b.newPolicy.count - a.newPolicy.count || a.root - b.root)[0];
    return { chordId, context, ancillaryRoot: widest.root, roots: rows.map(row => row.root).sort((a, b) => a - b) };
})).filter(group => !skippedGroups.includes(`${group.chordId}:${group.context}`));
// Measure the widest scope early so any failed target is actionable before the
// remaining matrix finishes. This order is reported with every evidence file.
const priority = group => group.chordId === 'dominant-11' ? group.context === 'accompaniment' ? -2 : -1 : 0;
fixtureGroups.sort((a, b) => priority(a) - priority(b));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceFiles = execFileSync('git', ['ls-files', '--', 'src'], { encoding: 'utf8' }).trim().split(/\r?\n/).sort();
const sourceDigest = createHash('sha256');
for (const path of sourceFiles) sourceDigest.update(path).update('\0').update(await readFile(path)).update('\0');
const trackedSourceTreeSha256 = sourceDigest.digest('hex');
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
const version = await (await fetch(`${cdp}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let sequence = 0, targetId, sessionId;
const pending = new Map(), failures = [], samples = [], heap = [];
ws.addEventListener('message', event => {
    const message = JSON.parse(event.data), call = pending.get(message.id);
    if (call) { pending.delete(message.id); if (message.error) call.reject(Error(JSON.stringify(message.error))); else call.resolve(message.result); }
    if (message.sessionId === sessionId && message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.text);
});
const send = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) })); });
async function evaluate(expression) { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails)); return response.result.value; }
const startedAt = new Date().toISOString(), wallStart = performance.now();
const output = process.env.ENGINE_BENCH_OUTPUT ?? 'docs/implementation/engine-ui-performance.json';
function percentile(values, quantile) { if (!values.length) return null; const ordered = [...values].sort((a, b) => a - b); return ordered[Math.max(0, Math.ceil(ordered.length * quantile) - 1)]; }
function stats(values) { return { runs: values.length, p50: percentile(values, .5), p95: percentile(values, .95), max: values.length ? Math.max(...values) : null }; }
async function save(complete) {
    const groups = fixtureGroups.flatMap(group => group.roots.map(root => {
        const matching = samples.filter(row => row.chordId === group.chordId && row.context === group.context && row.root === root);
        return { chordId: group.chordId, context: group.context, root, firstPageMs: stats(matching.map(row => row.firstPageMs)),
            nextPageMs: stats(matching.filter(row => row.nextPageMs !== undefined).map(row => row.nextPageMs)),
            filterMs: stats(matching.filter(row => row.filterMs !== undefined).map(row => row.filterMs)),
            cardSelectionMs: stats(matching.filter(row => row.cardSelectionMs !== undefined).map(row => row.cardSelectionMs)) };
    }));
    const evidence = { schema: 'engine-ui-performance-v1', complete, startedAt, measuredAt: new Date().toISOString(),
        gitHead: head, trackedSourceTreeSha256, nextBuildId: buildId, browser: version.Browser, userAgent: version['User-Agent'], os: `${platform()} ${release()}`,
        cpu: cpus()[0]?.model, logicalProcessors: cpus().length, physicalMemoryBytes: totalmem(), url: base,
        conditions: { viewport: '1440x1000 desktop', workers: 'New worker for each root request; normal HTTP cache warmed by setup; no forced CPU throttle.',
            app: 'Next production server; root/quality/context selection uses rendered DOM controls only.',
            instrumentation: 'A JSON serialization and UTF-8 byte-count listener runs before normal client decoding; reported end-to-end values include this measurement overhead.',
            renderEndpoint: 'Exact current response committed with fresh selected snapshot and enabled Play button, followed by one paint frame.',
            ancillaryCoverage: 'Census-widest root of every quality/context; 40 requests if all qualities run.',
            fixtureOrder: fixtureGroups.map(group => `${group.chordId}:${group.context}`),
            skippedGroups,
            heap: 'Main page Runtime.getHeapUsage after explicit GC, initial warmup and each 100 measured root changes; total page heap, not engine-only attribution.' },
        censusSha256: createHash('sha256').update(censusBytes).digest('hex'), requestedRunsPerFixture: runs,
        intendedFixtureCount: fixtureGroups.reduce((n, group) => n + group.roots.length, 0), measuredSamples: samples.length,
        elapsedMs: performance.now() - wallStart, aggregate: { firstPageMs: stats(samples.map(row => row.firstPageMs)),
            nextPageMs: stats(samples.filter(row => row.nextPageMs !== undefined).map(row => row.nextPageMs)),
            filterMs: stats(samples.filter(row => row.filterMs !== undefined).map(row => row.filterMs)),
            cardSelectionMs: stats(samples.filter(row => row.cardSelectionMs !== undefined).map(row => row.cardSelectionMs)) },
        firstPageBudgetViolations: groups.filter(row => row.firstPageMs.p95 > 2000).map(row => ({ chordId: row.chordId, context: row.context, root: row.root, p95: row.firstPageMs.p95 })),
        ancillaryBudgetViolations: groups.filter(row => row.nextPageMs.p95 > 200 || row.filterMs.p95 > 200).map(row => ({ chordId: row.chordId, context: row.context, root: row.root, nextPageP95: row.nextPageMs.p95, filterP95: row.filterMs.p95 })),
        maxMessageBytes: Math.max(0, ...samples.map(row => row.maxMessageBytes)), maxRenderedCards: Math.max(0, ...samples.map(row => row.maxRenderedCards)),
        maxAccountedBufferBytes: Math.max(0, ...samples.map(row => row.accountedBufferBytes)),
        observedMainThreadLongTasks: { count: samples.reduce((n, row) => n + row.longTasks.count, 0), maxMs: Math.max(0, ...samples.map(row => row.longTasks.maxMs)), attribution: 'Observed during measured request/page/filter/selection windows; engine attribution requires a trace.' },
        groups, heap, failures, samples,
        limits: ['Desktop Chromium only; Firefox/WebKit and representative physical mobile gates need separate evidence.',
            'Card selection uses an already materialized page row; it is not a direct-lookup benchmark.',
            'Enabled Play confirms an exact audio snapshot is available; sample output onset is not timed.',
            'Explicit GC measurements cover the main page heap, not combined worker/renderer process memory.',
            'Performance evidence does not establish human preference, playability or comfort.'] };
    await mkdir('docs/implementation', { recursive: true }); await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
    return evidence;
}
try {
    ({ targetId } = await send('Target.createTarget', { url: 'about:blank' }, null));
    ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, null));
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(${installMeasurement.toString()})();(${installControls.toString()})();` });
    await send('Page.navigate', { url: base });
    await evaluate('window.engineBenchControls.initialize()');
    await send('HeapProfiler.collectGarbage'); heap.push({ afterMeasuredRequests: 0, ...await send('Runtime.getHeapUsage') });
    const total = fixtureGroups.length * 12 * runs;
    for (const group of fixtureGroups) {
        await evaluate(`window.engineBenchControls.prepare(${JSON.stringify(group)})`);
        for (let run = 0; run < runs; run++) {
            for (const root of group.roots) {
                const sample = await evaluate(`window.engineBenchControls.measure(${JSON.stringify({ ...group, root, ancillary: root === group.ancillaryRoot })})`);
                const expected = census.rows.find(row => row.chordId === group.chordId && row.context === group.context && row.root === root);
                assert.equal(sample.structural, expected.newPolicy.count, 'Browser structural count differs from the implementation census');
                assert.equal(sample.pass + sample.uncertain, sample.structural, 'Browser survivor partition differs from structural count');
                assert.equal(sample.reject, 0, 'Initial browser profile unexpectedly rejects a structural candidate');
                samples.push({ chordId: group.chordId, context: group.context, root, run, ...sample });
                if (samples.length % 100 === 0) { await send('HeapProfiler.collectGarbage'); heap.push({ afterMeasuredRequests: samples.length, ...await send('Runtime.getHeapUsage') }); }
            }
            if ((run + 1) % 5 === 0 || run + 1 === runs) await save(false);
            const elapsed = performance.now() - wallStart, remaining = samples.length ? elapsed / samples.length * (total - samples.length) : 0;
            console.log(JSON.stringify({ completed: samples.length, total, chordId: group.chordId, context: group.context, run: run + 1, elapsedMinutes: elapsed / 60000, estimatedRemainingMinutes: remaining / 60000 }));
        }
    }
    const result = await save(true);
    console.log(JSON.stringify({ complete: true, samples: samples.length, aggregate: result.aggregate, firstPageBudgetViolations: result.firstPageBudgetViolations, ancillaryBudgetViolations: result.ancillaryBudgetViolations, longTasks: result.observedMainThreadLongTasks, output }, null, 2));
} catch (error) { failures.push(error instanceof Error ? error.message : String(error)); await save(false); throw error; }
finally { if (targetId) await send('Target.closeTarget', { targetId }, null); ws.close(); }

function installMeasurement() {
    const measure = window.engineBench = { serial: 0, start: null, accepted: null, exact: null, maxBytes: 0, maxCards: 0, periodStart: 0, longTasks: { count: 0, maxMs: 0 }, incomingCount: 0 };
    new PerformanceObserver(list => { for (const entry of list.getEntries()) { if (entry.startTime < measure.periodStart) continue; measure.longTasks.count++; measure.longTasks.maxMs = Math.max(measure.longTasks.maxMs, entry.duration); } }).observe({ type: 'longtask', buffered: false });
    new MutationObserver(() => { measure.maxCards = Math.max(measure.maxCards, document.querySelectorAll('[data-voicing-id]').length); }).observe(document, { childList: true, subtree: true });
    window.Worker = new Proxy(window.Worker, { construct(Target, args) {
        const worker = new Target(...args), post = worker.postMessage.bind(worker);
        worker.postMessage = (message, ...rest) => {
            if (message.protocol === 'engine-worker-v1' && ['START', 'PAGE', 'SET_VIEW'].includes(message.kind)) {
                measure.serial++; measure.start = { serial: measure.serial, at: performance.now(), kind: message.kind, sessionId: message.sessionId, operationId: message.operationId,
                    ...(message.kind === 'START' ? { intent: { chordId: message.payload.intent.chordId, rootPitchClass: message.payload.intent.rootPitchClass, context: message.payload.intent.context } } : {}) };
                measure.accepted = null; measure.exact = null;
            }
            return post(message, ...rest);
        };
        worker.addEventListener('message', event => {
            const message = event.data;
            if (message?.protocol !== 'engine-worker-v1') return;
            measure.maxBytes = Math.max(measure.maxBytes, new TextEncoder().encode(JSON.stringify(message)).byteLength); measure.incomingCount++;
            if (!measure.start || message.sessionId !== measure.start.sessionId || message.operationId !== measure.start.operationId) return;
            if (message.kind === 'ACCEPTED') measure.accepted = performance.now();
            if (message.kind === 'EXACT_PAGE') {
                const s = message.payload.page.summary;
                measure.exact = { serial: measure.start.serial, at: performance.now(), rows: message.payload.page.rows.length,
                    structural: s.structural, pass: s.pass, uncertain: s.uncertain, reject: s.reject, mode: s.mode, retainedBufferBytes: s.retainedBufferBytes, accountedBufferBytes: s.accountedBufferBytes };
            }
        }); return worker;
    } });
}
function installControls() {
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const wait = async (predicate, description) => { const start = performance.now(); while (!predicate()) { if (performance.now() - start > 30000) throw Error('UI benchmark timeout: ' + description); await frame(); } };
    const section = () => document.querySelector('section[aria-label="Chord voicings"]');
    const button = text => [...document.querySelectorAll('button')].find(element => element.textContent.trim() === text);
    const activate = element => { if (!element) throw Error('Missing benchmark control'); element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); };
    const field = label => [...document.querySelectorAll('fieldset')].find(element => element.querySelector('legend')?.textContent === label);
    const current = () => section()?.querySelector('[data-selected-id]');
    const ready = () => !!section()?.querySelector('[data-results-count]') && !!current() && current().dataset.selectionStale !== 'true' && !current().querySelector('[data-play-id]')?.disabled;
    async function waitExact(previousSerial, description) { await wait(() => window.engineBench.serial > previousSerial && window.engineBench.exact?.serial === window.engineBench.serial && ready(), description); await frame(); return performance.now(); }
    async function filters() { const control = document.querySelector('button[aria-controls$="-filters"]'); if (control.getAttribute('aria-expanded') !== 'true') { activate(control); await frame(); } }
    async function root(root) {
        activate(document.querySelector('button[aria-label^="Root "]'));
        await wait(() => !!document.querySelector('[role="dialog"][aria-label="Choose root"]'), 'root picker');
        const option = document.querySelector(`[role="option"][id$="-option-${root}"]`);
        const before = window.engineBench.serial, started = performance.now(); activate(option);
        const rendered = await waitExact(before, 'root first exact page'); return { started, rendered };
    }
    const families = { Basic: ['major', 'minor', 'power-5', 'augmented', 'diminished', 'sus2', 'sus4'], '6 / 7': ['major-7', 'major-6', 'minor-7', 'dominant-7', 'half-diminished-7', 'diminished-7'], Extended: ['major-9', 'minor-9', 'dominant-9', 'dominant-11', 'dominant-13', 'hendrix-7-sharp-9', 'dominant-7-flat-9'] };
    window.engineBenchControls = {
        async initialize() { await wait(() => document.querySelector('button') && Object.keys(document.querySelector('button')).some(key => key.startsWith('__reactProps')), 'hydration'); activate(button('Chord')); await wait(ready, 'initial chord'); },
        async prepare(group) {
            const family = Object.keys(families).find(key => families[key].includes(group.chordId)); activate(button(family)); await frame();
            const quality = field('Chord quality')?.querySelector(`input[value="${group.chordId}"]`);
            if (!quality.checked) { const before = window.engineBench.serial; activate(quality); await waitExact(before, 'quality setup'); }
            await filters(); const context = [...section().querySelectorAll('input[type="checkbox"]')][0];
            if (context.checked !== (group.context === 'accompaniment')) { const before = window.engineBench.serial; activate(context); await waitExact(before, 'context setup'); }
            if (button('Clear filters')) { const before = window.engineBench.serial; activate(button('Clear filters')); await waitExact(before, 'filter reset'); }
            // Every measured root action changes the request, including first root C.
            const rootName = document.querySelector('button[aria-label^="Root "]').getAttribute('aria-label');
            if (rootName !== 'Root B') await root(11);
        },
        async measure(fixture) {
            window.engineBench.periodStart = performance.now(); window.engineBench.longTasks = { count: 0, maxMs: 0 }; window.engineBench.maxBytes = 0; window.engineBench.maxCards = 0;
            const first = await root(fixture.root), snapshot = { ...window.engineBench.exact }, start = { ...window.engineBench.start }, accepted = window.engineBench.accepted;
            if (start.intent.chordId !== fixture.chordId || start.intent.rootPitchClass !== fixture.root || start.intent.context !== fixture.context) throw Error('Measured request differs from intended fixture.');
            const result = { firstPageMs: first.rendered - first.started, workerPostAfterActionMs: start.at - first.started,
                acceptedAfterPostMs: accepted === null ? null : accepted - start.at, exactMessageAfterPostMs: snapshot.at - start.at,
                exactMessageToRenderedMs: first.rendered - snapshot.at, structural: snapshot.structural, pass: snapshot.pass, uncertain: snapshot.uncertain,
                reject: snapshot.reject, mode: snapshot.mode, retainedBufferBytes: snapshot.retainedBufferBytes, accountedBufferBytes: snapshot.accountedBufferBytes };
            if (fixture.ancillary) {
                let before = window.engineBench.serial, began = performance.now(); activate(button('Next page')); result.nextPageMs = await waitExact(before, 'next page') - began;
                const rows = section().querySelectorAll('[data-voicing-id]'), card = rows[rows.length - 1], id = card.dataset.voicingId;
                began = performance.now(); activate(card); await wait(() => current()?.dataset.selectedId === id && !current()?.querySelector('[data-play-id]').disabled, 'card selection'); await frame(); result.cardSelectionMs = performance.now() - began;
                await filters(); before = window.engineBench.serial; began = performance.now(); activate(field('Open strings').querySelector('input[value="exclude"]')); result.filterMs = await waitExact(before, 'open-string filter') - began;
            }
            return { ...result, maxMessageBytes: window.engineBench.maxBytes, maxRenderedCards: window.engineBench.maxCards, longTasks: { ...window.engineBench.longTasks } };
        },
    };
}
