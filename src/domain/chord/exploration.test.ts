import { beforeAll, describe, expect, it } from 'vitest';
import {
    DEFAULT_EXPLORATION_FILTERS, describeExplorationVoicing, generateExplorationPool,
    getExplorationPlaybackNotes, getPhysicalVoicingId, queryExploration, rankExplorationPool,
    type ExplorationCandidate,
} from './exploration';
import { selectExplorationSurface } from './explorationPolicies';
import { resolveChordRegistryEntry } from './helpers';
import { searchDeductiveVoicings } from './voicingSearch';
import { deriveRequiredDegrees } from './degreeRequirements';

function pool(chordId: string, rootPitchClass = 0, context: 'standalone' | 'accompaniment' = 'standalone') {
    const generated = generateExplorationPool({ chordId, rootPitchClass, context });
    if (generated.status !== 'ready') throw new Error(generated.message);
    return rankExplorationPool(generated);
}

describe('chord exploration contracts', () => {
    let standalone: ExplorationCandidate[];
    let accompaniment: ExplorationCandidate[];
    beforeAll(() => {
        standalone = pool('dominant-7');
        accompaniment = pool('dominant-7', 0, 'accompaniment');
    });

    it('retains every legacy route shape and gives a shape one identity across routes', () => {
        const ids = new Set(standalone.map((candidate) => candidate.voicing.id));
        expect(ids.size).toBe(standalone.length);
        for (const position of ['close', 'drop-2', 'drop-3', 'shell'] as const) {
            for (const voicing of searchDeductiveVoicings(resolveChordRegistryEntry('dominant-7'), 0, { position })) {
                expect(ids.has(getPhysicalVoicingId(voicing))).toBe(true);
            }
        }
    });

    it('lets a filter reach candidates beyond the starting list; pagination loses none', () => {
        const filters = { ...DEFAULT_EXPLORATION_FILTERS, minFret: 11, maxFret: 15, openStrings: 'exclude' as const };
        const initial = new Set(queryExploration(standalone, DEFAULT_EXPLORATION_FILTERS).visible.map((candidate) => candidate.voicing.id));
        const all = queryExploration(standalone, filters, standalone.length);
        expect(all.matchCount).toBeGreaterThan(6);
        expect(all.visible.some((candidate) => !initial.has(candidate.voicing.id))).toBe(true);
        expect(all.visible.every((candidate) => candidate.facts.minStoppedFret >= 11 && candidate.facts.openStringCount === 0)).toBe(true);
        for (const count of [6, 18, standalone.length]) {
            const page = queryExploration(standalone, filters, count);
            expect(page.matchCount).toBe(all.matchCount);
            expect(page.visible).toEqual(all.visible.slice(0, count));
        }
        expect(all.hasMore).toBe(false);
    });

    it('keeps contradictory conditions empty rather than falling back to All', () => {
        const query = queryExploration(standalone, { ...DEFAULT_EXPLORATION_FILTERS, root: 'omit' });
        expect(query.matchCount).toBe(0);
        expect(query.totalCount).toBe(standalone.length);
        expect(queryExploration(standalone, { ...DEFAULT_EXPLORATION_FILTERS, minFret: 12, maxFret: 3 }).visible).toEqual([]);
    });

    it('includes E–Bb guide tones only with explicit accompaniment, without renaming them a complete C7', () => {
        expect(standalone.every((candidate) => candidate.facts.hasRoot && candidate.facts.degrees.length >= 3)).toBe(true);
        const guide = queryExploration(accompaniment, {
            ...DEFAULT_EXPLORATION_FILTERS, root: 'omit', stringCount: 2, bassDegree: '3', topDegree: 'b7',
        }, accompaniment.length).visible;
        expect(guide.length).toBeGreaterThan(0);
        for (const candidate of guide) {
            expect(candidate.facts.degrees).toEqual(['3', 'b7']);
            expect(candidate.facts.omittedDegrees).toEqual(['1', '5']);
            expect(candidate.voicing.descriptor.inversion).toBe('rootless');
            expect(candidate.voicing.descriptor.missingRequiredDegrees).toEqual(['1']);
            expect(candidate.reasons.some((reason) => reason.includes('Fails a structural'))).toBe(false);
        }
    });

    it('retains mandatory non-root identity tones for extended and altered accompaniment', () => {
        for (const chordId of ['dominant-13', 'dominant-7-flat-9', 'half-diminished-7']) {
            const required = deriveRequiredDegrees(resolveChordRegistryEntry(chordId)).filter((degree) => degree !== '1');
            const candidates = pool(chordId, 0, 'accompaniment');
            expect(candidates.length).toBeGreaterThan(0);
            expect(candidates.every((candidate) => required.every((degree) => candidate.facts.degrees.includes(degree)))).toBe(true);
        }
    });

    it('preserves octaves, doubling and actual bass/top pitches for playback', () => {
        const candidate = standalone.find((candidate) => candidate.facts.playedStrings.length === 6)!;
        const midi = candidate.facts.midiNotes;
        const notes = getExplorationPlaybackNotes(candidate);
        expect(notes.length).toBe(6);
        expect(new Set(midi.map((pitch) => pitch % 12)).size).toBeLessThan(6);
        expect(candidate.facts.bassMidi).toBe(Math.min(...midi));
        expect(candidate.facts.topMidi).toBe(Math.max(...midi));
        expect(notes).toEqual(midi.map((pitch) => `${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][pitch % 12]}${Math.floor(pitch / 12) - 1}`));
    });

    it('separates stopped position from pitch register and open strings', () => {
        const mixed = standalone.find((candidate) => candidate.facts.openStringCount > 0 && candidate.facts.minStoppedFret >= 7)!;
        expect(mixed).toBeDefined();
        expect(mixed.voicing.minFret).toBe(0);
        const filters = { ...DEFAULT_EXPLORATION_FILTERS, minFret: 7, openStrings: 'require' as const };
        expect(queryExploration(standalone, filters, standalone.length).visible).toContain(mixed);
        expect(mixed.facts.bassMidi).toBeLessThan(mixed.facts.topMidi);
    });

    it('keeps physical identity independent of chord labels and checks required playback data', () => {
        const original = standalone[0].voicing;
        expect(getPhysicalVoicingId({ ...original, id: 'other-route', chord: { ...original.chord, id: 'other-interpretation' } })).toBe(original.id);
        expect(getPhysicalVoicingId(original, [65, 60, 56, 51, 46, 41])).not.toBe(original.id);
        expect(() => describeExplorationVoicing({ ...original, notes: original.notes.map((note) => ({ ...note, midiNote: undefined })) }, resolveChordRegistryEntry('dominant-7'))).toThrow();
        const d = pool('major', 2)[0];
        expect(d.voicing.chord.rootPitchClass).toBe(2);
    });

    it('distinguishes unsupported requests from supported searches', () => {
        expect(generateExplorationPool({ chordId: 'not-a-chord', rootPitchClass: 0, context: 'standalone' }).status).toBe('unsupported');
        expect(generateExplorationPool({ chordId: 'major', rootPitchClass: 12, context: 'standalone' }).status).toBe('unsupported');
    });

    it('compares policy alternatives at equal budgets without mutating the ranked pool', () => {
        const before = standalone.map((candidate) => candidate.voicing.id);
        for (const budget of [6, 12]) {
            for (const policy of [{ kind: 'baseline' }, { kind: 'diverse' }, { kind: 'near-position', targetFret: 12 }] as const) {
                const selected = selectExplorationSurface(standalone, budget, policy);
                expect(selected.length).toBe(budget);
                expect(new Set(selected.map((candidate) => candidate.voicing.id)).size).toBe(budget);
            }
            expect(selectExplorationSurface(standalone, budget, { kind: 'baseline' })).toEqual(standalone.slice(0, budget));
            expect(selectExplorationSurface(standalone, budget, { kind: 'diverse' })[0]).toBe(standalone[0]);
        }
        expect(standalone.map((candidate) => candidate.voicing.id)).toEqual(before);
    });
});
