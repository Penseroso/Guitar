import { describe,expect,it } from 'vitest';
import { createFactsProjector } from './facts';
import { compileRequest } from './requestPolicy';
import { createGeometry } from './geometry';

const intent={schema:'intent-v1',chordId:'major',rootPitchClass:0} as const;
describe('allocation facts',()=>{
    it('reports actual MIDI extrema and every tied physical string in re-entrant tuning',()=>{
        const request=compileRequest({...intent,instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,60,67,64,67],maxModeledFret:12}});
        const project=createFactsProjector(request);
        const open=project([0,0,0,0,0,0]);
        expect(open).toMatchObject({bass:{midi:60,tone:'1',strings:[0,2]},top:{midi:67,tone:'5',strings:[3,5]},rootStrings:[0,2],
            stoppedPosition:null,stoppedWireSpanUm:0,pitchSpanSemitones:7,openCount:6,soundingCount:6,contiguousStrings:true,
            covered:['1','3','5'],omittedFormula:[],missingRequired:[]});
        const high=project([12,0,0,0,0,0]);
        expect(high).toMatchObject({bass:{midi:60,strings:[2]},top:{midi:72,strings:[0]},stoppedPosition:{min:12,max:12},stoppedWireSpanUm:0});
        expect(Object.isFrozen(open.bass.strings)).toBe(true);
    });
    it('uses canonical formula roles and distinguishes omissions from satisfied requirements',()=>{
        const partial=compileRequest({...intent,realization:{kind:'partial',requiredToneIds:['3'],allowedToneIds:['3','5']},rootMode:'excluded'});
        const facts=createFactsProjector(partial)([0,-1,0,-1,-1,-1]); // E and G
        expect(facts).toMatchObject({covered:['3','5'],omittedFormula:['1'],missingRequired:[],rootStrings:[],contiguousStrings:false});
        const dim=compileRequest({...intent,chordId:'diminished-7',rootPitchClass:2});
        expect(createFactsProjector(dim)([1,0,1,0,-1,-1]).covered).toEqual(['1','b3','b5','bb7']);
    });
    it('rejects invalid structural allocations and mismatched geometry',()=>{
        const request=compileRequest(intent),project=createFactsProjector(request);
        expect(()=>project([-1,-1,-1,-1,-1,-1])).toThrow();
        expect(()=>project([0,0,0,0,0,0])).toThrow();
        expect(()=>project([36,1,0,2,3,-1])).toThrow();
        expect(()=>createFactsProjector(request,createGeometry(600000))).toThrow();
    });
});
