import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { CHORD_REGISTRY_LIST } from '../src/domain/chord/registry';
import { DEFAULT_DEDUCTIVE_RANKING_WEIGHTS, rankVoicingCandidates } from '../src/domain/chord/deductiveRanking';
import { buildDeductiveChordTones } from '../src/domain/chord/degreeRequirements';
import { searchDeductiveVoicings } from '../src/domain/chord/voicingSearch';
import { getDeductiveChordSurfaceVoicingsForChord } from './reference/legacyChordSurface';
import { generateExplorationPool, getPhysicalVoicingId, rankExplorationPool } from '../src/domain/chord/exploration';
import { selectExplorationSurface, type ExplorationSurfacePolicy } from '../src/domain/chord/explorationPolicies';
import { FROZEN_CHORD_BASELINE, POSITION_EMPHASIS_PROFILE } from './chord-baseline';
import type { ResolvedVoicing } from '../src/domain/chord/types';

// Read-only audit of generated candidates and ranking behavior. Deployment is not inferred.
const keys = Object.keys(FROZEN_CHORD_BASELINE) as Array<keyof typeof FROZEN_CHORD_BASELINE>;
const weightDifferences = keys.filter((key) => DEFAULT_DEDUCTIVE_RANKING_WEIGHTS[key] !== FROZEN_CHORD_BASELINE[key])
    .map((key) => ({ key, baseline: FROZEN_CHORD_BASELINE[key], current: DEFAULT_DEDUCTIVE_RANKING_WEIGHTS[key] }));
const policies: ExplorationSurfacePolicy[] = [{ kind: 'baseline' }, { kind: 'near-position', targetFret: 12 }, { kind: 'diverse' }];
const failures: string[] = [];
const comparisons: Array<{ chordId: string; root: number; budget: number; policy: string; selected: number; distinctBass: number; distinctTop: number; highPosition: number }> = [];
let queries = 0;
let candidates = 0;
let changedRankingQueries = 0;
let comparisonChangedTop6Queries = 0;
const timings: number[] = [];
const started = performance.now();
for (const entry of CHORD_REGISTRY_LIST) {
    for (let root = 0; root < 12; root++) {
        const queryStart = performance.now();
        const pool = generateExplorationPool({ chordId: entry.id, rootPitchClass: root, context: 'standalone' });
        if (pool.status !== 'ready') throw new Error(pool.message);
        const ranked = rankExplorationPool(pool);
        timings.push(performance.now() - queryStart);
        candidates += ranked.length;
        queries++;
        const full = new Map<string, ResolvedVoicing>();
        for (const position of ['close', 'drop-2', 'drop-3', 'shell'] as const) {
            for (const voicing of searchDeductiveVoicings(entry, root, { position })) {
                if (!full.has(getPhysicalVoicingId(voicing))) full.set(getPhysicalVoicingId(voicing), voicing);
            }
        }
        const generated = new Set(ranked.map((candidate) => candidate.voicing.id));
        if (generated.size !== full.size || [...full.keys()].some((id) => !generated.has(id))) failures.push(`pool:${entry.id}:${root}`);
        const tones = buildDeductiveChordTones(entry, root);
        const current = rankVoicingCandidates([...full.values()], entry, tones);
        const baseline = rankVoicingCandidates([...full.values()], entry, tones, { weightOverrides: FROZEN_CHORD_BASELINE });
        if (current.some((candidate, index) => candidate.score !== baseline[index].score || candidate.voicing.id !== baseline[index].voicing.id)) changedRankingQueries++;
        const comparison = rankVoicingCandidates([...full.values()], entry, tones, { weightOverrides: POSITION_EMPHASIS_PROFILE });
        if (comparison.slice(0, 6).some((candidate, index) => candidate.voicing.id !== baseline[index]?.voicing.id)) comparisonChangedTop6Queries++;
        const legacy = getDeductiveChordSurfaceVoicingsForChord(entry, root);
        if (legacy.some((candidate) => !generated.has(getPhysicalVoicingId(candidate.voicing)))) failures.push(`legacy-reachability:${entry.id}:${root}`);
        for (const budget of [6, 12]) for (const policy of policies) {
            const selected = selectExplorationSurface(ranked, budget, policy);
            comparisons.push({ chordId: entry.id, root, budget, policy: policy.kind, selected: selected.length,
                distinctBass: new Set(selected.map((candidate) => candidate.facts.bassMidi)).size,
                distinctTop: new Set(selected.map((candidate) => candidate.facts.topMidi)).size,
                highPosition: selected.filter((candidate) => candidate.facts.minStoppedFret >= 11).length });
        }
    }
}
timings.sort((a, b) => a - b);
let revision = 'unknown';
try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* revision recorded if available */ }
console.log(JSON.stringify({
    policyVersion: 'chord-exploration-audit-v1', revision, workingTree: 'included; audit applies to checked-out source',
    deployedRevision: 'not inspected', scope: 'standard tuning, frets 0-15, standalone',
    weightDifferences, comparedWeights: keys.length, changedRankingQueries, comparisonChangedTop6Queries,
    decision: weightDifferences.length || changedRankingQueries ? 'audit-required-before-maintain-correct-revert' : 'keep-frozen-baseline',
    queries, candidates, failures, elapsedMs: Math.round(performance.now() - started),
    generationAndRankingMs: { p50: Math.round(timings[Math.floor(timings.length * 0.5)]), p95: Math.round(timings[Math.floor(timings.length * 0.95)]), max: Math.round(timings[timings.length - 1]) },
    interpretation: 'Coverage and policy diagnostics only. Human preference and deployment readiness require separate evaluation.',
    surfaceComparisons: process.argv.includes('--details') ? comparisons : policies.flatMap((policy) => [6, 12].map((budget) => {
        const rows = comparisons.filter((row) => row.policy === policy.kind && row.budget === budget);
        const mean = (field: 'distinctBass' | 'distinctTop' | 'highPosition') => Number((rows.reduce((sum, row) => sum + row[field], 0) / rows.length).toFixed(2));
        return { policy: policy.kind, budget, meanDistinctBass: mean('distinctBass'), meanDistinctTop: mean('distinctTop'), meanHighPosition: mean('highPosition') };
    })),
}, null, 2));
if (failures.length || weightDifferences.length || changedRankingQueries) process.exitCode = 1;
