// Real DedicatedWorker protocol smoke. Starts only a loopback test server and a
// new CDP target; never navigates existing tabs or invokes the old live UI.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { platform, release, cpus, totalmem } from 'node:os';

const cdp = process.env.CHORD_CDP ?? 'http://127.0.0.1:9333';
const bundle = async (paused = false) => (await build({
    ...(paused ? { stdin: { contents: "import {createWorkerService} from './src/domain/chord/engine/workerService'; const s=createWorkerService({send:m=>postMessage(m),timeBudgetMs:1});onmessage=e=>s.receive(e.data);", resolveDir: process.cwd(), sourcefile: 'pause-test-worker.ts', loader: 'ts' } }
        : { entryPoints: ['src/components/guitar/chord/engine.worker.ts'] }),
    bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2020', tsconfig: 'tsconfig.json',
})).outputFiles[0].text;
const normal = await bundle(), paused = await bundle(true);
console.log('Bundled production and test-budget workers.');
const server = createServer((req, res) => {
    const js = req.url === '/worker.js' ? normal : req.url === '/pause-worker.js' ? paused : null;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', js === null ? 'text/html' : 'text/javascript');
    res.end(js ?? '<!doctype html><title>Engine isolated worker protocol test</title><p>DedicatedWorker validation</p>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const version = await (await fetch(`${cdp}/json/version`)).json();
console.log(`Connecting to ${version.Browser}.`);
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let sequence = 0;
const pending = new Map();
ws.addEventListener('message', event => {
    const message = JSON.parse(event.data), call = pending.get(message.id);
    if (call) { pending.delete(message.id); if (message.error) call.reject(new Error(JSON.stringify(message.error))); else call.resolve(message.result); }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
let targetId;
try {
    ({ targetId } = await send('Target.createTarget', { url: origin }));
    console.log('Created isolated browser test target.');
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Runtime.enable', {}, sessionId);
    // Execute entirely inside the new browser target: timestamps include worker
    // startup/transport, but this deliberately has no product render/audio cost.
    const result = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(${browserChecks.toString()})()` }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    const checks = result.result.value;
    assert.equal(checks.passed, true, JSON.stringify(checks));
    const sourceFiles = ['src/components/guitar/chord/engine.worker.ts', 'src/domain/chord/engine/workerService.ts', 'src/domain/chord/engine/workerProtocol.ts'];
    const hashes = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
    const evidence = { schema: 'engine-worker-browser-v1', measuredAt: new Date().toISOString(), browser: version.Browser,
        userAgent: version['User-Agent'], cdpProtocol: version['Protocol-Version'], os: `${platform()} ${release()}`,
        cpu: cpus()[0]?.model, logicalProcessors: cpus().length, totalMemoryBytes: totalmem(),
        build: 'esbuild production-domain bundle, isolated static harness; not a Next release/UI benchmark',
        sourceHashes: hashes, ...checks,
        limits: ['Single smoke run per scenario; not the >=30-run 480-request performance matrix.', 'Desktop Chromium only; no Firefox, WebKit or real mobile measurement.', 'No product UI, accessibility, render, audio or main-thread heap acceptance claim.'] };
    await mkdir('docs/implementation', { recursive: true });
    await writeFile('docs/implementation/engine-worker-browser.json', `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(JSON.stringify(evidence, null, 2));
} finally {
    if (targetId) await send('Target.closeTarget', { targetId });
    ws.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}

async function browserChecks() {
    const assertions = [], measurements = [], workers = [];
    let maximumMessageBytes = 0;
    const check = (condition, label) => { if (!condition) throw new Error(label); assertions.push(label); };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    function harness(path = '/worker.js') {
        const worker = new Worker(path), events = [], waits = [];
        workers.push(worker);
        worker.onmessage = event => {
            const entry = { message: event.data, at: performance.now(), bytes: new TextEncoder().encode(JSON.stringify(event.data)).byteLength };
            maximumMessageBytes = Math.max(maximumMessageBytes, entry.bytes); events.push(entry);
            for (const waiter of [...waits]) if (waiter.test(entry.message)) { waits.splice(waits.indexOf(waiter), 1); clearTimeout(waiter.timer); waiter.resolve(entry); }
        };
        worker.onerror = event => { for (const waiter of waits.splice(0)) { clearTimeout(waiter.timer); waiter.reject(new Error(event.message)); } };
        const wait = (test, timeout = 60000) => {
            const found = events.find(entry => test(entry.message)); if (found) return Promise.resolve(found);
            return new Promise((resolve, reject) => { const waiter = { test, resolve, reject, timer: setTimeout(() => { waits.splice(waits.indexOf(waiter), 1); reject(new Error('Timed out waiting for worker output; last messages: ' + JSON.stringify(events.slice(-3)))); }, timeout) }; waits.push(waiter); });
        };
        return { worker, events, wait, post: message => { worker.postMessage(message); return performance.now(); } };
    }
    const message = (kind, payload, requestRevision = 1, viewRevision = 1, operationId = 1) => ({ protocol: 'engine-worker-v1', sessionId: 'browser-smoke', requestRevision, viewRevision, operationId, kind, payload });
    const intent = (chordId = 'major', context = 'standalone') => ({ schema: 'intent-v1', chordId, rootPitchClass: 0, context });
    const exact = (h, revision, operationId) => h.wait(m => m.kind === 'EXACT_PAGE' && m.requestRevision === revision && m.operationId === operationId);
    const id = row => row.candidate.allocationId;
    try {
        const h = harness();
        let started = h.post(message('START', { intent: intent() }));
        const accepted = await h.wait(m => m.kind === 'ACCEPTED');
        const first = await exact(h, 1, 1), page = first.message.payload.page;
        check(page.rows.length === 6 && page.summary.completeness === 'exact', 'C major produces six exact first-page rows');
        check(page.summary.structural === page.summary.pass + page.summary.uncertain && page.summary.reject === 0, 'PASS and UNCERTAIN independently account for all structural rows');
        check(h.events.some(e => e.message.kind === 'PROGRESS' && e.message.payload.summary.completeness === 'partial'), 'Partial progress precedes the exact page');
        measurements.push({ scenario: 'C major standalone first exact page', acceptedMs: accepted.at - started, exactPageMs: first.at - started, summary: page.summary, responseBytes: first.bytes });
        started = h.post(message('PAGE', { pageSize: 12, after: page.nextCursor }, 1, 1, 2));
        const next = await exact(h, 1, 2);
        check(next.message.payload.page.rows.length === 12, 'Cursor returns twelve additional rows');
        check(new Set([...page.rows, ...next.message.payload.page.rows].map(id)).size === 18, 'Successive exact pages have no repeated allocation IDs');
        measurements.push({ scenario: 'C major next twelve rows', elapsedMs: next.at - started, responseBytes: next.bytes });
        const selectedId = id(next.message.payload.page.rows[11]);
        started = h.post(message('LOOKUP', { allocationId: selectedId }, 1, 1, 3));
        const lookup = await h.wait(m => m.kind === 'LOOKUP_RESULT' && m.operationId === 3);
        check(id(lookup.message.payload.candidate) === selectedId, 'Direct lookup resolves an allocation outside the initial page');
        measurements.push({ scenario: 'Direct lookup', elapsedMs: lookup.at - started, responseBytes: lookup.bytes });
        started = h.post(message('SET_VIEW', { view: { open: 'exclude' }, pageSize: 6 }, 1, 2, 4));
        const filtered = await exact(h, 1, 4);
        check(filtered.message.viewRevision === 2 && filtered.message.payload.page.rows.every(row => row.candidate.states.every(fret => fret !== 0)), 'SET_VIEW changes matching rows under the new view revision');
        check(filtered.message.payload.page.summary.structural === page.summary.structural, 'SET_VIEW preserves structural universe counts');
        measurements.push({ scenario: 'Completed-pool view change', elapsedMs: filtered.at - started, responseBytes: filtered.bytes });

        started = h.post(message('START', { intent: intent('dominant-11', 'accompaniment'), uninterrupted: true }, 2, 1, 5));
        const broad = await exact(h, 2, 5);
        check(broad.message.payload.page.summary.uncertain > 0 && broad.message.payload.page.summary.reject === 0, 'Broad dominant 11 query retains uncertain survivors');
        measurements.push({ scenario: 'C dominant 11 accompaniment first exact page', elapsedMs: broad.at - started, responseBytes: broad.bytes, summary: broad.message.payload.page.summary });

        h.post(message('START', { intent: intent('dominant-11', 'accompaniment') }, 3, 1, 6));
        await h.wait(m => m.kind === 'ACCEPTED' && m.requestRevision === 3);
        const supersedeAt = performance.now();
        h.post(message('START', { intent: intent('minor') }, 4, 1, 7));
        const superseded = await exact(h, 4, 7);
        check(!h.events.some(e => e.at > supersedeAt && e.message.kind === 'EXACT_PAGE' && e.message.requestRevision === 3), 'Rapid START supersedes old request without an old exact result');
        check(superseded.message.requestRevision === 4, 'Replacement request completes with its own revision');

        h.post(message('START', { intent: intent('dominant-11', 'accompaniment') }, 5, 1, 8));
        await h.wait(m => m.kind === 'ACCEPTED' && m.requestRevision === 5);
        await sleep(20);
        started = h.post(message('CANCEL', {}, 5, 1, 9));
        const cancelled = await h.wait(m => m.kind === 'CANCELLED' && m.operationId === 9);
        await sleep(100);
        check(cancelled.at - started <= 100, 'Cooperative cancellation acknowledged within 100 ms');
        check(!h.events.some(e => e.at > cancelled.at && e.message.requestRevision === 5 && e.message.kind === 'EXACT_PAGE'), 'No cancelled request publishes a late exact page');
        measurements.push({ scenario: 'Cancellation acknowledgement', elapsedMs: cancelled.at - started, responseBytes: cancelled.bytes });
        h.post({ ...message('START', { intent: intent() }, 6, 1, 10), protocol: 'invalid' });
        const invalid = await h.wait(m => m.kind === 'ERROR' && m.operationId === 10);
        check(invalid.message.payload.diagnostic.code === 'transport-error', 'Invalid protocol schema returns typed transport ERROR');

        const p = harness('/pause-worker.js');
        p.post(message('START', { intent: intent('dominant-11', 'accompaniment') }));
        const paused = await p.wait(m => m.kind === 'PAUSED');
        check(paused.message.payload.summary.completeness === 'partial' && paused.message.payload.resume === 'live-checkpoint', 'Test-only 1 ms budget pauses with truthful partial counts and resumable state');
        started = p.post(message('CONTINUE', { uninterrupted: true }, 1, 1, 2));
        const resumed = await exact(p, 1, 2);
        check(resumed.message.payload.page.summary.structural === broad.message.payload.page.summary.structural, 'Continue reaches the same exact structural count');
        check(JSON.stringify(resumed.message.payload.page.rows.map(id)) === JSON.stringify(broad.message.payload.page.rows.map(id)), 'Pause/continue preserves exact first-page allocation ordering');
        measurements.push({ scenario: 'Test-only pause then uninterrupted Continue', resumedMs: resumed.at - started, partialStructuralCount: paused.message.payload.summary.structural });
        check(maximumMessageBytes <= 1048576, 'Every observed worker message stays within 1 MiB');
        return { passed: true, assertions, measurements, maximumMessageBytes, workerRuns: workers.length, device: 'Windows desktop; no mobile emulation or physical mobile measurement' };
    } finally { for (const worker of workers) worker.terminate(); }
}
