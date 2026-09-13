/** Integration census. Reads frozen controls; never rewrites research artifacts. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { CHORD_REGISTRY_LIST } from '../../src/domain/chord/registry';
import { evaluateHandPlayability, type FingeringPoint } from '../../src/domain/chord/fretGeometry';
import { searchDeductiveVoicings } from '../../src/domain/chord/voicingSearch';
import { compileRequest } from '../../src/domain/chord/engine/requestPolicy';
import { legacyRequiredToneIds } from '../../src/domain/chord/engine/catalog';
import { StructuralIterator } from '../../src/domain/chord/engine/structuralGenerator';
import type { Six, StructuralRequest, StringIndex } from '../../src/domain/chord/engine/types';

interface FrozenRow {
    chordId: string; root: number; context: 'standalone' | 'accompaniment';
    rawAssignments: number; harmonic: number; monotonicNoHand: number;
    noMonotonicHand: number; baseline: number;
}
interface FrozenCensus { baseline: string; sourceHashes: Record<string,string>; rows: FrozenRow[] }
const frozenPath = 'docs/research/generator-scope/census.json';
const frozenHash = 'f1c328a3e427cf03d9a06f1aa6a574107518f9a0c7b43e0e80788be1e21a3fb2';
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(sha(frozenPath), frozenHash, 'Frozen scope census changed.');
const frozen: FrozenCensus = JSON.parse(readFileSync(frozenPath, 'utf8'));
// These old live modules remain the baseline control during domain integration.
// If subsequently migrated, preserve an isolated control rather than waiving hashes.
for (const [path, hash] of Object.entries(frozen.sourceHashes)) assert.equal(sha(path), hash, `Baseline control changed: ${path}`);
assert.equal(CHORD_REGISTRY_LIST.length, 20);
assert.equal(frozen.rows.length, 480);

// 38^6-1 = 3,010,936,383: exact safe integer and unsigned 32-bit coordinate ID.
function code(states: readonly number[]) {
    let value = 0;
    for (const fret of states) value = value * 38 + fret + 1;
    return value;
}

function scan(request: StructuralRequest, visit?: (states: Six<number>) => void) {
    const started = performance.now();
    const iterator = new StructuralIterator(request);
    const seen = new Set<number>();
    let count = 0;
    let visitedNodes = 0;
    while (true) {
        const batch = iterator.nextBatch(8192);
        visitedNodes = batch.visitedNodes;
        for (const states of batch.candidates) {
            const id = code(states);
            assert.ok(!seen.has(id), 'Duplicate structural allocation.');
            seen.add(id);
            count++;
            visit?.(states);
        }
        if (batch.done) break;
    }
    return { count, rawBound: iterator.rawBound.toString(), visitedNodes, elapsedMs: performance.now() - started };
}

const started = performance.now();
const rows: object[] = [];
const totals = { oldPolicyStructural: 0, oldPolicyBaseline: 0, newPolicyStructural: 0, policyAdditions: 0 };
let parityChecks = 0;
for (const entry of CHORD_REGISTRY_LIST) {
    for (let root = 0; root < 12; root++) for (const context of ['standalone','accompaniment'] as const) {
        const label = `${entry.id}/${root}/${context}`;
        const control = frozen.rows.find(row => row.chordId === entry.id && row.root === root && row.context === context);
        assert.ok(control, `Missing frozen row ${label}`);
        const resolved = compileRequest({ schema: 'intent-v1', chordId: entry.id, rootPitchClass: root, context });
        const oldRequest: StructuralRequest = {
            ...resolved.structural,
            required: legacyRequiredToneIds(resolved.interpretation.formula.map(tone => tone.id)).filter(id => context !== 'accompaniment' || id !== '1'),
        };
        const retained = new Set<number>();
        let monotonicNoHand = 0;
        let noMonotonicHand = 0;
        const oldPolicy = scan(oldRequest, states => {
            let monotonic = true;
            let previous = -Infinity;
            const stopped: FingeringPoint[] = [];
            const openStrings: StringIndex[] = [];
            for (let string = 5; string >= 0; string--) {
                const fret = states[string];
                if (fret < 0) continue;
                const midi = oldRequest.instrument.tuningMidi[string] + fret;
                monotonic &&= midi >= previous;
                previous = midi;
                if (fret === 0) openStrings.push(string as StringIndex);
                else stopped.push({ string: string as StringIndex, fret });
            }
            if (monotonic) monotonicNoHand++;
            const legacyHand = evaluateHandPlayability(stopped, { openStrings });
            if (legacyHand.playable) {
                noMonotonicHand++;
                if (monotonic) retained.add(code(states));
            }
        });
        assert.equal(oldPolicy.count, control.harmonic, `${label} old harmonic scope`);
        assert.equal(oldPolicy.rawBound, String(control.rawAssignments), `${label} raw assignment bound`);
        assert.equal(monotonicNoHand, control.monotonicNoHand, `${label} monotonic-only control`);
        assert.equal(noMonotonicHand, control.noMonotonicHand, `${label} hand-only control`);
        assert.equal(retained.size, control.baseline, `${label} old gate intersection count`);
        const productionStart = performance.now();
        const production = searchDeductiveVoicings(entry, root, { position: 'close' }, { context, maxFret: 15 });
        const productionCodes = new Set(production.map(voicing => {
            const states = Array<number>(6).fill(-1);
            for (const note of voicing.notes) if (!note.isMuted) states[note.string] = note.fret;
            return code(states);
        }));
        assert.equal(production.length, productionCodes.size, `${label} legacy duplicates`);
        assert.deepEqual(retained, productionCodes, `${label} exact baseline coordinate-set parity`);
        const productionMs = performance.now() - productionStart;
        let newPolicyBaselineRetained = 0;
        const newPolicy = scan(resolved.structural, states => {
            if (productionCodes.has(code(states))) newPolicyBaselineRetained++;
        });
        assert.equal(newPolicyBaselineRetained, productionCodes.size, `${label} baseline allocation regression floor`);
        assert.ok(newPolicy.count >= oldPolicy.count, `${label} unexpected identity policy scope reduction`);
        const policyAdditions = newPolicy.count - oldPolicy.count;
        totals.oldPolicyStructural += oldPolicy.count;
        totals.oldPolicyBaseline += retained.size;
        totals.newPolicyStructural += newPolicy.count;
        totals.policyAdditions += policyAdditions;
        rows.push({ chordId: entry.id, root, context, oldPolicy, monotonicNoHand, noMonotonicHand,
            baseline: retained.size, baselineSetEqual: true, productionMs, newPolicy,
            newPolicyBaselineRetained, policyAdditions });
        parityChecks++;
    }
    process.stdout.write(`Census complete: ${entry.id} (${parityChecks}/480)\n`);
}
assert.equal(totals.oldPolicyStructural, 14152934);
assert.equal(totals.oldPolicyBaseline, 1647041);
const sourcePaths = ['src/domain/chord/engine/requestPolicy.ts','src/domain/chord/engine/catalog.ts',
    'src/domain/chord/engine/structuralGenerator.ts','src/domain/chord/engine/subsets.ts'];
const output = {
    schema: 'engine-integration-census-v1', baseline: frozen.baseline,
    createdAt: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch,
    frozenCensus: { path: frozenPath, sha256: frozenHash }, baselineSourceHashes: frozen.sourceHashes,
    sourceHashes: Object.fromEntries(sourcePaths.map(path => [path,sha(path)])),
    methodology: 'Exhaustive 20 qualities × 12 roots × 2 contexts. Separate old harmonic and identity-v1 requests. Numeric base-38 coordinate sets verify duplicates and exact old production parity after applying legacy hand and monotonic gates offline. Counts are request-level sums, not globally unique allocations. Node single-run timings include census assertions and legacy comparison; they do not measure browser latency or human outcomes.',
    parityChecks, elapsedMs: performance.now() - started, totals, rows,
};
mkdirSync('docs/implementation', { recursive: true });
writeFileSync('docs/implementation/engine-census.json', `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ parityChecks, elapsedMs: output.elapsedMs, totals })}\n`);
