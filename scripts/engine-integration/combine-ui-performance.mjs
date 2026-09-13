// Combine disjoint, complete measurement segments only when executable-source,
// release build, browser, hardware and measurement conditions are identical.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const paths = process.argv.slice(2);
if (!paths.length) paths.push('docs/implementation/engine-ui-performance-optimized-priority.json', 'docs/implementation/engine-ui-performance-remaining.json');
const segments = await Promise.all(paths.map(async path => { const bytes = await readFile(path); return { path, sha256: createHash('sha256').update(bytes).digest('hex'), data: JSON.parse(bytes) }; }));
const first = segments[0].data;
const identityKeys = ['gitHead', 'trackedSourceTreeSha256', 'nextBuildId', 'browser', 'userAgent', 'os', 'cpu', 'logicalProcessors', 'physicalMemoryBytes', 'url', 'censusSha256', 'requestedRunsPerFixture'];
for (const segment of segments) {
    assert.equal(segment.data.complete, true, `${segment.path} is incomplete`);
    assert.deepEqual(segment.data.failures, [], `${segment.path} has failures`);
    assert.equal(segment.data.measuredSamples, segment.data.samples.length, `${segment.path} sample total differs`);
    assert.equal(segment.data.intendedFixtureCount * 30, segment.data.samples.length, `${segment.path} complete segment coverage differs`);
    for (const key of identityKeys) assert.deepEqual(segment.data[key], first[key], `Measurement identity differs: ${key}`);
    for (const key of ['viewport', 'workers', 'app', 'instrumentation', 'renderEndpoint', 'ancillaryCoverage', 'heap']) assert.equal(segment.data.conditions[key], first.conditions[key], `Measurement conditions differ: ${key}`);
}
assert.equal(first.requestedRunsPerFixture, 30, 'Final matrix requires thirty runs per fixture');
const censusBytes = await readFile('docs/implementation/engine-census.json');
assert.equal(createHash('sha256').update(censusBytes).digest('hex'), first.censusSha256, 'Census changed after measurement');
const census = JSON.parse(censusBytes);
const samples = segments.flatMap(segment => segment.data.samples);
assert.equal(census.rows.length, 480); assert.equal(samples.length, 480 * 30);
for (const row of samples) {
    for (const key of ['firstPageMs', 'workerPostAfterActionMs', 'exactMessageAfterPostMs', 'exactMessageToRenderedMs', 'maxMessageBytes', 'maxRenderedCards', 'accountedBufferBytes', 'retainedBufferBytes']) {
        assert.ok(typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key] >= 0, `Invalid sample ${key}`);
    }
    for (const key of ['acceptedAfterPostMs', 'nextPageMs', 'filterMs', 'cardSelectionMs']) {
        if (row[key] !== undefined) assert.ok(typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key] >= 0, `Invalid sample ${key}`);
    }
    assert.ok(row.maxMessageBytes <= 1024 * 1024, 'Message exceeds 1 MiB');
    assert.ok(row.maxRenderedCards <= 48, 'Rendered cards exceed 48');
    assert.ok(row.accountedBufferBytes <= 32 * 1024 * 1024, 'Accounted buffers exceed 32 MiB');
}
const identities = new Set(samples.map(row => `${row.chordId}:${row.context}:${row.root}:${row.run}`));
assert.equal(identities.size, samples.length, 'Segments overlap or repeat a measured sample');
const percentile = (values, fraction) => { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]; };
const stats = values => ({ runs: values.length, p50: percentile(values, .5), p95: percentile(values, .95), max: values.length ? Math.max(...values) : null });
const groups = census.rows.map(fixture => {
    const rows = samples.filter(row => row.chordId === fixture.chordId && row.context === fixture.context && row.root === fixture.root);
    assert.equal(rows.length, 30, `Incomplete fixture ${fixture.chordId}:${fixture.context}:${fixture.root}`);
    assert.deepEqual(rows.map(row => row.run).sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i));
    for (const row of rows) { assert.equal(row.structural, fixture.newPolicy.count); assert.equal(row.pass + row.uncertain, row.structural); assert.equal(row.reject, 0); }
    const widest = census.rows.filter(row => row.chordId === fixture.chordId && row.context === fixture.context).sort((a, b) => b.newPolicy.count - a.newPolicy.count || a.root - b.root)[0];
    for (const key of ['nextPageMs', 'filterMs', 'cardSelectionMs']) assert.equal(rows.filter(row => row[key] !== undefined).length, fixture.root === widest.root ? 30 : 0, `Ancillary coverage differs: ${key}`);
    return { chordId: fixture.chordId, context: fixture.context, root: fixture.root,
        firstPageMs: stats(rows.map(row => row.firstPageMs)), nextPageMs: stats(rows.flatMap(row => row.nextPageMs === undefined ? [] : [row.nextPageMs])),
        filterMs: stats(rows.flatMap(row => row.filterMs === undefined ? [] : [row.filterMs])), cardSelectionMs: stats(rows.flatMap(row => row.cardSelectionMs === undefined ? [] : [row.cardSelectionMs])) };
});
const artifact = { schema: 'engine-ui-performance-matrix-v1', complete: true, combinedAt: new Date().toISOString(),
    ...Object.fromEntries(identityKeys.map(key => [key, first[key]])), fixtureCount: 480, sampleCount: samples.length, ancillaryFixtureCount: 40,
    combinationPolicy: 'Disjoint source artifacts, identical tracked source/build/browser/hardware and measurement conditions; exactly thirty samples for each of 480 fixtures. Preoptimization and interrupted initial-order data are excluded because they use a different source build.',
    segments: segments.map(({ path, sha256, data }) => ({ path, sha256, startedAt: data.startedAt, measuredAt: data.measuredAt, measuredSamples: data.measuredSamples, conditions: data.conditions, heap: data.heap })),
    aggregate: { firstPageMs: stats(samples.map(row => row.firstPageMs)), nextPageMs: stats(samples.flatMap(row => row.nextPageMs === undefined ? [] : [row.nextPageMs])),
        filterMs: stats(samples.flatMap(row => row.filterMs === undefined ? [] : [row.filterMs])), cardSelectionMs: stats(samples.flatMap(row => row.cardSelectionMs === undefined ? [] : [row.cardSelectionMs])) },
    firstPageBudgetViolations: groups.filter(row => row.firstPageMs.p95 > 2000).map(row => ({ chordId: row.chordId, context: row.context, root: row.root, p95: row.firstPageMs.p95 })),
    ancillaryBudgetViolations: groups.filter(row => row.nextPageMs.p95 > 200 || row.filterMs.p95 > 200).map(row => ({ chordId: row.chordId, context: row.context, root: row.root, nextPageP95: row.nextPageMs.p95, filterP95: row.filterMs.p95 })),
    maxMessageBytes: Math.max(...samples.map(row => row.maxMessageBytes)), maxRenderedCards: Math.max(...samples.map(row => row.maxRenderedCards)),
    maxRetainedBufferBytes: Math.max(...samples.map(row => row.retainedBufferBytes)),
    maxAccountedBufferBytes: Math.max(...samples.map(row => row.accountedBufferBytes)),
    observedMainThreadLongTasks: { count: samples.reduce((sum, row) => sum + row.longTasks.count, 0), maxMs: Math.max(...samples.map(row => row.longTasks.maxMs)), attribution: first.observedMainThreadLongTasks.attribution },
    groups, samples, limits: [...first.limits, 'Heap baselines belong to each fresh browser-target segment and are not combined as one continuous heap-growth series.'] };
const output = 'docs/implementation/engine-ui-performance.json';
await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output, fixtureCount: artifact.fixtureCount, samples: artifact.sampleCount, aggregate: artifact.aggregate,
    firstPageBudgetViolations: artifact.firstPageBudgetViolations, ancillaryBudgetViolations: artifact.ancillaryBudgetViolations,
    maxMessageBytes: artifact.maxMessageBytes, maxRenderedCards: artifact.maxRenderedCards, longTasks: artifact.observedMainThreadLongTasks }, null, 2));
