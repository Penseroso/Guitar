import { expect,it } from 'vitest';
import { compileRequest } from './requestPolicy';
import { StructuralIterator, materializeStructural } from './structuralGenerator';
import { createClassicProjector } from './classicFeatures';
import { compareRank, rankCandidate } from './deterministicRanking';
import { createPhysicalScreen } from './physical';
import { canonical, freeze } from './validation';

it('conserves complete survivor identities and metadata under arbitrary input ordering',()=>{
    for(const chordId of ['major','minor','dominant-7','diminished-7']) {
        const request=compileRequest({schema:'intent-v1',chordId,rootPitchClass:0,context:'accompaniment',
            instrument:{kind:'six-single-strings-12edo',tuningMidi:[64,59,55,50,45,40],maxModeledFret:3},
            physical:{warningSpanUm:0,severeSpanUm:0}});
        const iterator=new StructuralIterator(request.structural), projector=createClassicProjector(request), screen=createPhysicalScreen(request.physicalProfile);
        const rows=[];
        for(;;) {
            const batch=iterator.nextBatch();
            for(const states of batch.candidates) {
                const candidate=freeze(materializeStructural(states,request.structural,request.requestKey));
                const assessment=screen.assess(candidate), features=projector(states);
                const before=canonical({candidate,assessment,features});
                const rank=rankCandidate(candidate,features);
                expect(canonical({candidate,assessment,features})).toBe(before);
                rows.push({candidate,assessment,features,rank});
            }
            if(batch.done) break;
        }
        const ordered=[...rows].sort((a,b)=>compareRank(a.rank,b.rank));
        const scrambled=[...rows.filter((_,i)=>i%2),...rows.filter((_,i)=>!(i%2)).reverse()];
        expect(scrambled.sort((a,b)=>compareRank(a.rank,b.rank)).map(r=>r.candidate.allocationId)).toEqual(ordered.map(r=>r.candidate.allocationId));
        expect(new Set(ordered.map(r=>r.candidate.allocationId)).size).toBe(rows.length);
        // Metadata-only alterations cannot enter the projection-only scorer or tie keys.
        const changed=rows.map(r=>({...r,assessment:{...r.assessment,status:r.assessment.status==='PASS'?'UNCERTAIN':'PASS',reasonCodes:[]},rank:rankCandidate(r.candidate,r.features)}));
        expect(changed.sort((a,b)=>compareRank(a.rank,b.rank)).map(r=>r.rank)).toEqual(ordered.map(r=>r.rank));
    }
});
