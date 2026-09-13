/** Replay archived facts into the new heuristic screen; run no physical solver. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { compilePhysicalProfile } from '../../src/domain/chord/engine/requestPolicy';
import { createPhysicalScreen } from '../../src/domain/chord/engine/physical';
import { sixIntegers } from '../../src/domain/chord/engine/identity';
import type { PhysicalReason } from '../../src/domain/chord/engine/types';

interface ArchivedGate {
    scale_mm: number; G: number; S_mm: number; common_hand_gate: boolean;
    common_hand_reason: string | null; uses_thumb: boolean;
}
interface ArchivedCase {
    id: string; shape: number[]; strict_mute: boolean; default_scale: ArchivedGate;
    physical: { profile: string; status: string; reason: string }[];
}
interface Comparison { cases: ArchivedCase[] }
const root = 'docs/research/physical-feasibility';
const provenancePath = 'docs/research/physical-model-reassessment/reanalysis-provenance.json';
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const provenanceHash = '5060309901c6f6a12c0d11c3d4ce95bc6ead3efbc8686791d786eef2667b7bc5';
assert.equal(sha(provenancePath), provenanceHash, 'Frozen reanalysis provenance changed.');
const provenance = read<{ inputs: Record<string,string>; frozen_final_manifest_sha256: string }>(provenancePath);
assert.equal(sha(`${root}/final-freeze.json`), provenance.frozen_final_manifest_sha256);
const freeze = read<{ sha256: Record<string,string> }>(`${root}/final-freeze.json`);
for (const [path, hash] of Object.entries(freeze.sha256)) assert.equal(sha(path), hash, `Frozen input changed: ${path}`);
for (const [file, hash] of Object.entries(provenance.inputs)) assert.equal(sha(`${root}/results/${file}`), hash, file);

const started = performance.now();
const profile = compilePhysicalProfile();
const screen = createPhysicalScreen(profile);
const dampingProfile = compilePhysicalProfile({ omittedStrings: 'require-left-hand-damping' });
const dampingScreen = createPhysicalScreen(dampingProfile);
const defaultTotals = { PASS: 0, UNCERTAIN: 0, REJECT: 0 };
const semanticsTotals = { PASS: 0, UNCERTAIN: 0, REJECT: 0 };
const archivedTotals = { PASS: 0, UNCERTAIN: 0, REJECT: 0 };
const rows: object[] = [];
const failures: string[] = [];
const changedByDamping: string[] = [];
const formerRejections: string[] = [];
let maxSpanDifferenceUm = 0;
const seen = new Set<string>();
for (const [dataset, file, expectedCount] of [
    ['original','round4-comparison.json',32],
    ['supplement','supplement-comparison.json',12],
    ['challenge','challenge-comparison.json',44],
] as const) {
    const comparison = read<Comparison>(`${root}/results/${file}`);
    assert.equal(comparison.cases.length, expectedCount);
    for (const entry of comparison.cases) {
        assert.ok(!seen.has(entry.id), `Duplicate fixture ${entry.id}`);
        seen.add(entry.id);
        const states = sixIntegers([...entry.shape].reverse(), -1, 36, `${entry.id}.states`);
        const original = entry.default_scale;
        assert.equal(original.scale_mm, 647.7, `${entry.id} archived scale`);
        const expectedStatus = !original.common_hand_gate || original.G > 4 || original.S_mm > 95 || original.uses_thumb ? 'UNCERTAIN' : 'PASS';
        archivedTotals[expectedStatus]++;
        if (!original.common_hand_gate) formerRejections.push(entry.id);
        const pure = screen.metrics(states);
        const semantic = entry.strict_mute ? dampingScreen.metrics(states) : pure;
        defaultTotals[pure.status]++;
        semanticsTotals[semantic.status]++;
        const expectedReasons: PhysicalReason[] = [];
        if (original.G > 4) expectedReasons.push('groups-over-four');
        if (original.G > 5) expectedReasons.push('groups-over-five');
        if (original.S_mm > 95) expectedReasons.push('span-over-warning');
        if (original.S_mm > 180) expectedReasons.push('span-over-severe');
        if (original.uses_thumb) expectedReasons.push('thumb-fallback-relied-on');
        const spanDifferenceUm = pure.metrics.stoppedWireSpanUm - original.S_mm * 1000;
        maxSpanDifferenceUm = Math.max(maxSpanDifferenceUm, Math.abs(spanDifferenceUm));
        if (pure.status !== expectedStatus) failures.push(`${entry.id}: status ${pure.status} vs archived remap ${expectedStatus}`);
        if (pure.metrics.partialCoverGroups !== original.G) failures.push(`${entry.id}: groups ${pure.metrics.partialCoverGroups} vs ${original.G}`);
        // Float archived spans are reference facts; integer endpoint quantization can
        // move their difference by at most one micrometre. Threshold outcomes must match.
        if (Math.abs(spanDifferenceUm) > 1.001) failures.push(`${entry.id}: span changed by ${spanDifferenceUm} um`);
        if (JSON.stringify(pure.reasonCodes) !== JSON.stringify(expectedReasons)) failures.push(`${entry.id}: reasons ${JSON.stringify(pure.reasonCodes)} vs ${JSON.stringify(expectedReasons)}`);
        if (pure.basis !== 'heuristic-screen' || pure.humanValidation !== 'absent') failures.push(`${entry.id}: default evidence basis changed`);
        const needsDamping = entry.strict_mute && states.includes(-1);
        if (needsDamping && (!semantic.reasonCodes.includes('unsupported-damping') || semantic.status !== 'UNCERTAIN' || semantic.basis !== 'abstention')) failures.push(`${entry.id}: required damping was not an explicit abstention`);
        if (pure.status !== semantic.status) changedByDamping.push(entry.id);
        const offlineReference = entry.physical.find(outcome => outcome.profile === 'reference');
        assert.ok(offlineReference, `${entry.id} missing archived reference outcome`);
        rows.push({ dataset, id: entry.id, shapeLowEFirst: entry.shape, statesHighEFirst: states,
            archived: { ...original, remappedStatus: expectedStatus }, pureDefault: pure,
            semantic: { strictDampingRequested: !!entry.strict_mute, result: semantic }, spanDifferenceUm,
            offlineModelEvidence: { ...offlineReference, runtimeAdmissionEffect: 'none' } });
    }
}
assert.equal(rows.length, 88);
if (JSON.stringify(archivedTotals) !== JSON.stringify({ PASS:79, UNCERTAIN:9, REJECT:0 })) failures.push(`Archived totals mismatch: ${JSON.stringify(archivedTotals)}`);
if (JSON.stringify(defaultTotals) !== JSON.stringify(archivedTotals)) failures.push(`Runtime default totals mismatch: ${JSON.stringify(defaultTotals)}`);
// Recheck after evaluation, including the solver sources, to ensure replay is read-only.
for (const [path, hash] of Object.entries(freeze.sha256)) assert.equal(sha(path), hash, `Frozen input changed during replay: ${path}`);
const sources = ['src/domain/chord/engine/physical.ts','src/domain/chord/engine/contactHypotheses.ts',
    'src/domain/chord/engine/geometry.ts','src/domain/chord/engine/requestPolicy.ts'];
const output = {
    schema: 'engine-physical-shadow-v1', createdAt: new Date().toISOString(), node: process.version,
    provenance: { path: provenancePath, sha256: provenanceHash }, inputHashes: provenance.inputs,
    frozenFilesVerified: Object.keys(freeze.sha256).length, newSolverRuns: 0, newFixtures: 0,
    sourceHashes: Object.fromEntries(sources.map(path => [path,sha(path)])),
    method: 'Replay 88 archived coordinates through physical-screen-v1. Default remapping and explicit required-damping semantics are reported separately. Compare partial-cover groups and quantized full-target wire spans with frozen default-scale facts. Offline model outcomes remain separate evidence and cannot activate REJECT. This validates engineering semantics, not human accuracy, playability or comfort.',
    defaultProfile: profile, dampingProfile, archivedTotals, defaultTotals, semanticsTotals,
    changedByDamping, formerRejections, maxSpanDifferenceUm, elapsedMs: performance.now() - started,
    failures, rows,
};
mkdirSync('docs/implementation', { recursive: true });
writeFileSync('docs/implementation/engine-physical-shadow.json', `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ defaultTotals, semanticsTotals, changedByDamping, maxSpanDifferenceUm, failures, elapsedMs:output.elapsedMs })}\n`);
assert.deepEqual(failures, [], 'Physical shadow diverged from frozen facts or specified semantics.');
