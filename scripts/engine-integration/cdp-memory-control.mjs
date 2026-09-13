import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const cdp = 'http://127.0.0.1:9333';
const census = JSON.parse(await readFile('docs/implementation/engine-census.json'));
const fixtures = census.rows.map(({ chordId, context, root }) => ({ chordId, context, root }));
assert.equal(fixtures.length, 480);
const version = await (await fetch(`${cdp}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let sequence = 0, targetId, sessionId;
const pending = new Map();
ws.addEventListener('message', event => { const message = JSON.parse(event.data), call = pending.get(message.id); if (call) { pending.delete(message.id); if (message.error) call.reject(Error(JSON.stringify(message.error))); else call.resolve(message.result); } });
const send = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) })); });
const startedAt = new Date().toISOString(), start = performance.now(), heap = [], failures = [];
let completedCalls = 0;
const functionSource = `(async fixture => { await Promise.resolve(); return { fixture, firstPageMs: 120, workerPostAfterActionMs: 1, acceptedAfterPostMs: 2, exactMessageAfterPostMs: 100, exactMessageToRenderedMs: 20, structural: 1000, pass: 400, uncertain: 600, reject: 0, mode: 'cache', retainedBufferBytes: 32768, accountedBufferBytes: 65536, maxMessageBytes: 96000, maxRenderedCards: 12, longTasks: { count: 0, maxMs: 0 } }; })`;
try {
    ({ targetId } = await send('Target.createTarget', { url: 'about:blank' }, null));
    ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, null));
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('HeapProfiler.collectGarbage'); heap.push({ afterEvaluateCalls: 0, ...await send('Runtime.getHeapUsage') });
    for (let i = 0; i < 14000; i++) {
        if (performance.now() - start > 165000) throw Error('Bounded diagnostic exceeded 165 seconds');
        const response = await send('Runtime.evaluate', { expression: `${functionSource}(${JSON.stringify(fixtures[i % fixtures.length])})`, returnByValue: true, awaitPromise: true, userGesture: true });
        assert.equal(response.exceptionDetails, undefined); assert.deepEqual(response.result.value.fixture, fixtures[i % fixtures.length]); completedCalls++;
        if (completedCalls === 100 || completedCalls === 14000) { await send('HeapProfiler.collectGarbage'); heap.push({ afterEvaluateCalls: completedCalls, ...await send('Runtime.getHeapUsage') }); }
    }
} catch (error) { failures.push(error instanceof Error ? error.message : String(error)); }
finally { if (targetId) await send('Target.closeTarget', { targetId }, null); ws.close(); }
const artifact = { schema: 'engine-cdp-memory-control-v1', startedAt, measuredAt: new Date().toISOString(), elapsedMs: performance.now() - start, complete: completedCalls === 14000 && !failures.length, completedCalls, browser: version.Browser, userAgent: version['User-Agent'], url: 'about:blank', uniqueFixtureExpressions: fixtures.length, expressionFunction: functionSource, protocol: { method: 'Runtime.evaluate', returnByValue: true, awaitPromise: true, userGesture: true }, conditions: 'Fresh isolated about:blank target; no Guitar page, Worker, DOM mutation, event observer, application code or audio. 480 repeating fixture expressions, representative asynchronous resolved result object. Explicit GC at 0, 100 and 14000 calls. Only the owned target was closed.', heap, failures, limitations: ['This control isolates repeated CDP evaluation of resolved objects; it does not reproduce app DOM, asynchronous worker traffic, rendering, browser event instrumentation, or the duration of the product benchmark.', 'Similar growth would implicate a possible measurement contribution, not quantify or prove attribution. Absent growth cannot exclude CDP interaction with the real application or establish product-specific causality.'] };
await writeFile('docs/implementation/engine-cdp-memory-control.json', `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify(artifact, null, 2));
