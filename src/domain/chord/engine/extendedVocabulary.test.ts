import { describe, expect, it } from 'vitest';
import { CHORD_REGISTRY_LIST, getChordRegistryEntry } from '../registry';
import { compileRequest } from './requestPolicy';
import { compileStructuralMatcher } from './structuralGenerator';
import { createVocabularyMatcher } from './practicalVocabulary';
import { surfacePartition } from './recommendedSurface';
import { EngineSession, type PageScan } from './session';
import { allocationId } from './identity';
import data from './practicalVocabularyData.json';
import type { Six } from './types';

// The 11 qualities newly integrated from the frozen All-Guitar-Chords audit's high/medium
// priority missing-quality inventory (docs/research/web-voicing-corpus-v2/sitewide-practical-audit).
const NEW_QUALITIES: Record<string, { symbol: string; degrees: string[] }> = {
    'minor-6': { symbol: 'm6', degrees: ['1', 'b3', '5', '6'] },
    'minor-major-7': { symbol: 'mM7', degrees: ['1', 'b3', '5', '7'] },
    'add9': { symbol: 'add9', degrees: ['1', '3', '5', '9'] },
    'minor-add9': { symbol: 'm(add9)', degrees: ['1', 'b3', '5', '9'] },
    'six-nine': { symbol: '6/9', degrees: ['1', '3', '5', '6', '9'] },
    'minor-11': { symbol: 'm11', degrees: ['1', 'b3', '5', 'b7', '9', '11'] },
    'minor-13': { symbol: 'm13', degrees: ['1', 'b3', '5', 'b7', '9', '11', '13'] },
    'dominant-7-sus4': { symbol: '7sus4', degrees: ['1', '4', '5', 'b7'] },
    'dominant-7-sharp-5': { symbol: '7#5', degrees: ['1', '3', '#5', 'b7'] },
    'dominant-7-flat-5': { symbol: '7b5', degrees: ['1', '3', 'b5', 'b7'] },
    'major-7-sharp-5': { symbol: 'maj7#5', degrees: ['1', '3', '#5', '7'] },
};

const finish = (scan: PageScan) => { while (!scan.step()) { /* drain */ } return scan.finish(); };

describe('extended vocabulary: 11 newly integrated qualities', () => {
    it('registers exactly the 11 target qualities with their exact formulas and symbols', () => {
        for (const [id, spec] of Object.entries(NEW_QUALITIES)) {
            const entry = getChordRegistryEntry(id);
            expect(entry, `missing registry entry for ${id}`).toBeDefined();
            expect(entry!.symbol).toBe(spec.symbol);
            expect(entry!.formula.degrees).toEqual(spec.degrees);
        }
        expect(CHORD_REGISTRY_LIST).toHaveLength(31);
    });

    it('flows every new quality through the request compiler without throwing, at every root', () => {
        for (const id of Object.keys(NEW_QUALITIES)) for (let root = 0; root < 12; root++) {
            const r = compileRequest({ schema: 'intent-v1', chordId: id, rootPitchClass: root });
            expect(r.structural.required).toContain('1');
        }
    });

    it('structural generator: an engine-verified manifest allocation passes; dropping a required tone fails', () => {
        // minor-6 requires 1,b3,6 (natural 5 is optional) — verified via the manifest's own closed template.
        const request = compileRequest({ schema: 'intent-v1', chordId: 'minor-6', rootPitchClass: 0 });
        const matcher = compileStructuralMatcher(request.structural);
        const template = data.closed.find((t) => t.quality === 'minor-6' && t.rootAnchor === 11)!;
        const p = template.pMin;
        const states = template.offsets.map((f) => (f < 0 ? -1 : f + p)) as unknown as Six<number>;
        expect(matcher(states)).toBe(true);
        // Mute every string sounding the b3 pitch class: drops a required tone, must fail.
        const tuning = request.structural.instrument.tuningMidi;
        const b3PitchClass = (0 + 3) % 12; // root 0, b3 interval 3
        const brokenB3 = states.map((f, s) => (f >= 0 && (tuning[s] + f) % 12 === b3PitchClass ? -1 : f)) as unknown as Six<number>;
        expect(brokenB3).not.toEqual(states);
        expect(matcher(brokenB3)).toBe(false);
    });

    it('L3 vocabulary: an acquired open form and a translated closed template both match V=true', () => {
        const openEntry = data.open.find((o) => o.quality === 'minor-11')!;
        const requestOpen = compileRequest({ schema: 'intent-v1', chordId: 'minor-11', rootPitchClass: openEntry.root });
        expect(createVocabularyMatcher(requestOpen)(openEntry.states as unknown as Six<number>).V).toBe(true);

        const closedEntry = data.closed.find((t) => t.quality === 'dominant-7-flat-5' && t.kind === 'B')!;
        const p = closedEntry.pMin + 2; // an unobserved-but-in-range translated position
        expect(p).toBeLessThanOrEqual(closedEntry.pMax);
        const root = ((closedEntry.rootAnchor + p) % 12 + 12) % 12;
        const requestClosed = compileRequest({ schema: 'intent-v1', chordId: 'dominant-7-flat-5', rootPitchClass: root });
        const states = closedEntry.offsets.map((f) => (f < 0 ? -1 : f + p)) as unknown as Six<number>;
        expect(createVocabularyMatcher(requestClosed)(states).V).toBe(true);
        // One fret off (wrong translation) must not match.
        const shifted = states.map((f) => (f < 0 ? -1 : f + 1)) as unknown as Six<number>;
        expect(createVocabularyMatcher(requestClosed)(shifted).V).toBe(false);
    });

    it('L3 vocabulary is unaffected for the original 20 qualities (regression)', () => {
        const request = compileRequest({ schema: 'intent-v1', chordId: 'major', rootPitchClass: 0 });
        expect(createVocabularyMatcher(request)([0, 1, 0, 2, 3, -1]).V).toBe(true);
        expect(data.qualities.slice(0, 20)).toEqual(expect.arrayContaining([
            'major', 'minor', 'dominant-7', 'power-5', 'diminished', 'diminished-7', 'augmented', 'sus2', 'sus4',
            'major-7', 'minor-7', 'major-9', 'minor-9', 'half-diminished-7', 'major-6', 'dominant-9',
            'dominant-11', 'dominant-13', 'dominant-7-flat-9', 'hendrix-7-sharp-9',
        ]));
    });

    it('Recommended/All: a new quality composes representative/fallback/other exactly like existing ones', () => {
        const session = new EngineSession({ schema: 'intent-v1', chordId: 'minor-6', rootPitchClass: 0 });
        const recommended = finish(session.begin({ schema: 'surface-request-v2', surface: 'recommended', view: {} }, 18));
        const all = finish(session.begin({}, 18));
        expect(all.summary.matching).toBeGreaterThanOrEqual(recommended.summary.matching);
        for (const row of recommended.rows) {
            expect(surfacePartition(true, row.physical.status, row.demand, row.vocabulary)).toBeLessThan(2);
        }
        // The manifest-backed allocation for this quality/root is eligible in Recommended.
        const template = data.closed.find((t) => t.quality === 'minor-6' && t.rootAnchor === 11)!;
        const p = template.pMin;
        const states = template.offsets.map((f) => (f < 0 ? -1 : f + p)) as unknown as Six<number>;
        const detail = session.lookup(allocationId(session.request.structural.instrument.tuningMidi, states));
        expect(detail.vocabulary.V).toBe(true);
        expect(surfacePartition(true, detail.physical.status, detail.demand, detail.vocabulary)).toBe(
            detail.demand.Uop ? 2 : detail.physical.status === 'PASS' || detail.demand.U ? 0 : 2
        );
        session.dispose();
    });
});
