import { describe, expect, it } from 'vitest';
import { createClassicProjector } from './classicFeatures';
import { compileRequest } from './requestPolicy';
import { createGeometry } from './geometry';
import { partialCoverGroups } from './contactHypotheses';
import { getVoicingShapeMetrics, getVoicingTechniqueTag } from '../deductiveRanking';
import { searchDeductiveVoicings } from '../voicingSearch';
import { CHORD_REGISTRY_LIST } from '../registry';
import type { Six } from './types';

const intent = { schema:'intent-v1', chordId:'major',rootPitchClass:0 } as const;
describe('pinned classic coordinate features', () => {
    it('keeps whole-fret ranking groups separate from partial-cover assessment', () => {
        const request = compileRequest({ ...intent,chordId:'dominant-9',rootPitchClass:2 });
        const states = [5,5,5,4,5,-1] as const;
        const result = createClassicProjector(request)(states);
        expect(result.wholeFretGroups).toBe(5);
        expect(partialCoverGroups(states)).toBe(3);
        expect(result.largestBarreContacts).toBe(0);
        expect(result.legacyTechnique).toBe('Standard');
    });
    it('retains diagonal, two-contact grouping, and shell precedence', () => {
        const diagonal = createClassicProjector(compileRequest({...intent,chordId:'major-7'}))([7,8,9,10,-1,-1]);
        expect(diagonal).toMatchObject({wholeFretGroups:4,diagonalPattern:true,rootHint:'match',rootBass:true});
        const open = createClassicProjector(compileRequest({...intent,chordId:'minor',rootPitchClass:4}))([0,0,0,2,2,0]);
        expect(open).toMatchObject({wholeFretGroups:1,largestBarreContacts:2,legacyTechnique:'Open',openCount:4});
        const dim = createClassicProjector(compileRequest({...intent,chordId:'diminished-7',rootPitchClass:2}))([1,0,1,0,-1,-1]);
        expect(dim).toMatchObject({legacyTechnique:'Shell',optionalCoveredCount:0,openCount:2});
    });
    it('preserves exact old metrics and technique over every quality on a small domain', () => {
        for (const entry of CHORD_REGISTRY_LIST) {
            const request = compileRequest({...intent,chordId:entry.id,instrument:{kind:'six-single-strings-12edo',tuningMidi:[64,59,55,50,45,40],maxModeledFret:3}});
            const projector = createClassicProjector(request);
            const baseline = searchDeductiveVoicings(entry,0,{position:'close'},{maxFret:3});
            for (const voicing of baseline) {
                const states = Array<number>(6).fill(-1);
                for (const note of voicing.notes) if (!note.isMuted) states[note.string] = note.fret;
                const actual = projector(states as unknown as Six<number>);
                const old = getVoicingShapeMetrics(voicing);
                expect(actual).toMatchObject({wholeFretGroups:old.fingerGroupCount,largestBarreContacts:old.barreNoteCount,
                    diagonalPattern:old.isDiagonalRollShape,adjacentInternalGaps:old.internalMutedCount-old.isolatedInternalMuteCount,
                    isolatedInternalGaps:old.isolatedInternalMuteCount,openFlankedIsolatedGaps:old.openFlankedIsolatedMuteCount,
                    maxStoppedFret:old.maxFret,openCount:old.openStringCount,soundingCount:old.playedCount,
                    optionalCoveredCount:voicing.descriptor.optionalCoverageDegrees.length});
                expect(actual.legacyTechnique.toLowerCase()).toBe(getVoicingTechniqueTag(voicing));
                expect(Math.abs(actual.spanUm-old.spanMm*1000)).toBeLessThanOrEqual(0.501);
            }
        }
    });
    it('resolves tied bass by physical index and keeps hints independent of root order', () => {
        const request = compileRequest({...intent,instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,67,60,64,60],maxModeledFret:0}});
        const result = createClassicProjector(request)([0,0,0,0,0,0]);
        expect(result).toMatchObject({representativeBassString:5,rootBass:true,rootHint:'match'});
    });
    it('rejects invalid coordinates and mismatched geometry without consulting physical status', () => {
        const request = compileRequest(intent), projector = createClassicProjector(request);
        expect(()=>projector([-1,-1,-1,-1,-1,-1])).toThrow();
        expect(()=>projector([37,0,0,0,0,0])).toThrow();
        expect(()=>projector([0,0,0,0,0,0])).toThrow();
        expect(()=>createClassicProjector(request,createGeometry(600000))).toThrow();
        const geometry = createGeometry(request.physicalProfile.scaleLengthUm);
        const states = [0,1,0,2,3,-1] as const;
        const a = createClassicProjector(request,geometry)(states);
        const b = createClassicProjector(compileRequest({...intent,physical:{warningSpanUm:1000,severeSpanUm:2000,allowedThumb:true}}),geometry)(states);
        expect(a).toEqual(b);
    });
});
