import { describe, expect, it } from 'vitest';
import { createClassicProjector } from './classicFeatures';
import { compileRequest } from './requestPolicy';
import { createGeometry } from './geometry';
import { partialCoverGroups } from './contactHypotheses';

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
