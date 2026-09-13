import { describe, expect, it } from 'vitest';
import { asLegacyEligible, collectComplete, collectLegacyComplete, migrateLegacyId, migrateLegacyRequest, type LegacySearchRequest } from './legacyAdapters';
import { EngineSession } from './session';
import { compileStructuralMatcher } from './structuralGenerator';
import { compileRequest } from './requestPolicy';
import type { PresentationCandidate } from './types';

const legacy = (position: LegacySearchRequest['style']['position'] = 'close'): LegacySearchRequest => ({ chordId: 'major-7', rootPitchClass: 0, style: { position } });
const small = { schema: 'intent-v1', chordId: 'major', rootPitchClass: 0,
    instrument: { kind: 'six-single-strings-12edo', tuningMidi: [64, 59, 55, 50, 45, 40], maxModeledFret: 3 } };

describe('explicit legacy migration', () => {
    it('labels spacing aliases and preserves only transformed bass for old drops', () => {
        for (const style of ['close', 'spread'] as const) {
            const m = migrateLegacyRequest(legacy(style));
            expect(m.intent.subset).toEqual({ kind: 'unrestricted' });
            expect(m.notices.map(n => n.code)).toContain('legacy-spacing-alias');
        }
        const m = migrateLegacyRequest(legacy('drop-2'));
        expect(m.resolved.structural.predicates).toContainEqual({ kind: 'legacy-bass-subset', tone: '5' });
        const states = [0, 0, 0, 2, 3, 3] as const; // G bass, duplicated G/E; not a four-voice exact drop.
        expect(compileStructuralMatcher(m.resolved.structural)(states)).toBe(true);
        expect(compileStructuralMatcher(compileRequest({ schema: 'intent-v1', chordId: 'major-7', rootPitchClass: 0, subset: { kind: 'drop-2' } }).structural)(states)).toBe(false);
        expect(migrateLegacyRequest(legacy('drop-3')).resolved.structural.predicates).toContainEqual({ kind: 'legacy-bass-subset', tone: '3' });
    });
    it('surfaces shell floor and exclusion conflicts, retaining canonical diminished spelling', () => {
        expect(() => migrateLegacyRequest({ ...legacy('shell'), chordId: 'major' })).toThrow(expect.objectContaining({ code: 'conflicting-constraints' }));
        expect(() => migrateLegacyRequest({ ...legacy(), style: { position: 'close', omitDegrees: ['3'] } })).toThrow();
        const dim = migrateLegacyRequest({ ...legacy('shell'), chordId: 'diminished-7' });
        expect(dim.resolved.structural.allowed).toContain('bb7');
        expect(dim.resolved.structural.allowed).not.toContain('6');
    });
    it('maps options to Physical envelopes and reports inert style fields independently', () => {
        const m = migrateLegacyRequest({ ...legacy(), style: { position: 'close', maxHandSpanMm: 5, allowThumbOnLowE: false },
            options: { scaleLengthMm: 650, maxHandSpanMm: 200, allowThumbOnLowE: true } });
        expect(m.resolved.physicalProfile).toMatchObject({ scaleLengthUm: 650000, scaleSource: 'declared', warningSpanUm: 200000, severeSpanUm: 200000, allowedThumb: true });
        expect(m.notices.filter(n => n.code === 'ignored-legacy-field')).toHaveLength(2);
        expect(m.resolved.structural).toEqual(migrateLegacyRequest(legacy()).resolved.structural);
    });
    it('never infers tuning from route IDs and validates migrated shapes against the saved request', () => {
        const id = 'major:close:0:0|1:1|2:0|3:2|4:3';
        expect(() => migrateLegacyId(id)).toThrow(/saved request/);
        const saved: LegacySearchRequest = { chordId: 'major', rootPitchClass: 0, style: { position: 'close' }, options: { tuningMidi: [64, 59, 55, 50, 45, 40] } };
        expect(migrateLegacyId(id, saved).allocationId).toBe('shape-v1:64,59,55,50,45,40:0,1,0,2,3,-1');
        expect(migrateLegacyId('shape:64,59,55,50,45,40:0,1,0,2,3,x').allocationId).toBe('shape-v1:64,59,55,50,45,40:0,1,0,2,3,-1');
        expect(() => migrateLegacyId('major:close:0:0|0:0', saved)).toThrow(/Duplicate/);
        expect(() => migrateLegacyId('shape:63,59,55,50,45,40:0,1,0,2,3,x', saved)).toThrow(/outside/);
    });
    it('collects the exact full new pipeline order or throws a typed resource failure', () => {
        const rows = collectComplete(small, { maxBytes: 100_000_000 });
        const session = new EngineSession(small), scan = session.begin({}, 128);
        while (!scan.step()) { /* exact bounded traversal */ }
        const page = scan.finish();
        expect(rows.map(r => r.candidate.allocationId)).toEqual(page.rows.map(r => r.candidate.allocationId));
        expect(rows.length).toBe(page.summary.structural);
        expect(() => collectComplete(small, { maxBytes: 1 })).toThrow(expect.objectContaining({ code: 'resource-exhausted' }));
        expect(() => collectComplete(small, undefined as never)).toThrow();
        const old = collectLegacyComplete({ chordId: 'major', rootPitchClass: 0, style: { position: 'close' }, options: { maxFret: 3 } }, { maxBytes: 100_000_000 });
        expect(old.map(r => r.candidate.allocationId)).toEqual(rows.map(r => r.candidate.allocationId));
        const eligible = asLegacyEligible(rows[0]);
        expect(eligible).toMatchObject({ playable: true, assessment: rows[0].physical });
        expect(eligible.deprecationNote).toMatch(/eligibility/);
        const uncertain = collectComplete({ ...small, physical: { scope: 'restricted-or-personalized' } }, { maxBytes: 100_000_000 })[0];
        expect(asLegacyEligible(uncertain)).toMatchObject({ playable: true, assessment: { status: 'UNCERTAIN', humanValidation: 'absent' } });
        expect(() => asLegacyEligible({ ...rows[0], physical: { ...rows[0].physical, status: 'REJECT' } } as unknown as PresentationCandidate)).toThrow();
    });
});
