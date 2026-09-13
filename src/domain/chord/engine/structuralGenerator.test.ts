import { describe, expect, it } from 'vitest';
import { compileRequest } from './requestPolicy';
import { StructuralIterator, materializeStructural } from './structuralGenerator';
import { formulaForKey } from './catalog';
import type { Six, StructuralRequest } from './types';

function collect(request:StructuralRequest, batch=256, prune=true) {
    const it=new StructuralIterator(request,undefined,prune),rows:Six<number>[]=[];
    for(;;) {const next=it.nextBatch(batch);rows.push(...next.candidates);if(next.done)return rows;}
}
// Independent Cartesian product oracle: no production matcher, pruning, codec or degree coverage helper.
function oracle(request:StructuralRequest):string[] {
    const formula=formulaForKey(request.formulaKey),allowed=new Set(request.allowed.map(d=>(request.rootPitchClass+formula.find(t=>t.id===d)!.interval)%12));
    const required=request.required.map(d=>(request.rootPitchClass+formula.find(t=>t.id===d)!.interval)%12);
    const output:string[]=[];
    function visit(states:number[]) {
        if(states.length<6) {for(const f of [-1,...request.fretDomains[states.length]]) visit([...states,f]);return;}
        const pitches=states.flatMap((f,s)=>f<0?[]:[(request.instrument.tuningMidi[s]+f)%12]);
        if(pitches.length&&pitches.every(p=>allowed.has(p))&&required.every(p=>pitches.includes(p))&&new Set(pitches).size>=request.minDistinctPitchClasses) output.push(states.join(','));
    }
    visit([]);return output;
}
describe('structural enumeration conservation',()=>{
    it('matches the independent oracle and no-prune path on small domains across tunings/chords/roots',()=>{
        for(const chordId of ['major','power-5','dominant-7','dominant-11','diminished-7']) for(const rootPitchClass of [0,3,7]) for(const tuningMidi of [[64,59,55,50,45,40],[60,67,55,62,48,52]]) {
            const r=compileRequest({schema:'intent-v1',chordId,rootPitchClass,context:'accompaniment',instrument:{kind:'six-single-strings-12edo',tuningMidi,maxModeledFret:2}}).structural;
            const actual=collect(r).map(s=>s.join(','));expect(actual).toEqual(oracle(r));expect(actual).toEqual(collect(r,7,false).map(s=>s.join(',')));
        }
    });
    it('retains crossing and severe reach allocations and explicit MIDI multiplicity',()=>{
        const r=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0});
        const states=[0,8,9,10,-1,-1] as const;
        expect(collect(r.structural).some(s=>s.join(',')===states.join(','))).toBe(true);
        expect(materializeStructural(states,r.structural,r.requestKey).sounding.map(n=>n.midi)).toEqual([64,67,64,60]);
        const wide=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0,physical:{warningSpanUm:1}});
        expect(collect(wide.structural)).toEqual(collect(r.structural));
        expect(()=>materializeStructural([1,1,1,1,1,1],r.structural,r.requestKey)).toThrow();
    });
    it('resumes every small-domain traversal boundary without duplicate/missing rows',()=>{
        const r=compileRequest({schema:'intent-v1',chordId:'minor',rootPitchClass:4,context:'accompaniment',instrument:{maxModeledFret:2}}).structural;
        const expected=collect(r,1), rows:Six<number>[]=[];let iterator=new StructuralIterator(r);
        for(;;) {const b=iterator.nextBatch(1);rows.push(...b.candidates);iterator=new StructuralIterator(r,iterator.checkpoint());if(b.done)break;}
        expect(rows).toEqual(expected);
        const checkpoint=iterator.checkpoint();expect(()=>new StructuralIterator(r,{...checkpoint,key:'wrong'})).toThrow();
    });
    it('defines the full raw bound and genuine structural emptiness',()=>{
        const r=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0});
        expect(new StructuralIterator(r.structural).rawBound).toBe(BigInt(22500));
        const empty=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0,fretDomains:[[],[],[],[],[],[]]});
        expect(collect(empty.structural)).toEqual([]);
    });
});
