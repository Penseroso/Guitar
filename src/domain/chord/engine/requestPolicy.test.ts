import { describe, expect, it } from 'vitest';
import { CHORD_REGISTRY_LIST } from '../registry';
import { compileRequest } from './requestPolicy';
import { identityRequiredToneIds } from './catalog';
import { EngineError } from './errors';

const intent = { schema:'intent-v1',chordId:'major',rootPitchClass:0 };
const required: Record<string,string[]> = {
    major:['3'],minor:['b3'],'power-5':['5'],augmented:['3','#5'],diminished:['b3','b5'],sus2:['2'],sus4:['4'],
    'major-6':['3','6'],'major-7':['3','7'],'minor-7':['b3','b7'],'dominant-7':['3','b7'],
    'half-diminished-7':['b3','b5','b7'],'diminished-7':['b3','b5','bb7'],
    'major-9':['3','7','9'],'minor-9':['b3','b7','9'],'dominant-9':['3','b7','9'],
    'dominant-11':['b7','11'],'dominant-13':['3','b7','13'],'hendrix-7-sharp-9':['3','b7','#9'],'dominant-7-flat-9':['3','b7','b9'],
};
describe('identity-v1 compiler', () => {
    it('implements the complete table across every root and context without changing recognition', () => {
        for (const entry of CHORD_REGISTRY_LIST) for(let root=0;root<12;root++) for(const context of ['standalone','accompaniment']) {
            const r = compileRequest({...intent,chordId:entry.id,rootPitchClass:root,context});
            expect(r.structural.required).toEqual([...(context==='standalone'?['1']:[]),...required[entry.id]]);
            expect(r.structural.minDistinctPitchClasses).toBe(Math.min(context==='standalone'?3:2,entry.formula.degrees.length));
            expect(Object.isFrozen(r.structural.required)).toBe(true);
        }
        expect(CHORD_REGISTRY_LIST.find(e=>e.id==='diminished-7')!.formula.degrees).toContain('6');
        expect(identityRequiredToneIds(['1','3','5','b7','b9','#9','13'])).toEqual(['3','b7','b9','#9','13']);
    });
    it('separates explicit partial/root overrides from omissions', () => {
        expect(()=>compileRequest({...intent,excludedToneIds:['3']})).toThrow(EngineError);
        const r=compileRequest({...intent, realization:{kind:'partial',requiredToneIds:['5'],allowedToneIds:['3','5']},rootMode:'excluded'});
        expect(r.structural.required).toEqual(['5']); expect(r.structural.allowed).toEqual(['3','5']);
        expect(r.structural.minDistinctPitchClasses).toBe(2);
        expect(()=>compileRequest({...intent,realization:{kind:'partial',requiredToneIds:['1'],allowedToneIds:['1','3']},rootMode:'optional'})).toThrow();
        expect(()=>compileRequest({...intent,completeFormula:true,excludedToneIds:['5']})).toThrow();
    });
    it('canonicalizes equivalent requests, carries origins and isolates physical cache identity', () => {
        const a=compileRequest(intent), b=compileRequest({...intent,chordId:'maj',physical:{warningSpanUm:80000}});
        expect(a.structural).toEqual(b.structural); expect(a.physicalProfile.key).not.toBe(b.physicalProfile.key);
        expect(a.origins.find(o=>o.field==='rootMode')?.origin).toBe('default');
        expect(compileRequest({...intent,physical:{scaleLengthUm:600000}}).physicalProfile.scaleSource).toBe('declared');
        expect(compileRequest({...intent,rootMode:'optional'}).origins.find(o=>o.field==='rootMode')?.origin).toBe('user');
    });
    it('reports contradictions and unsupported inputs before traversal', () => {
        for(const extra of [{rootPitchClass:12},{unexpected:true},{instrument:{kind:'seven-strings'}},{instrument:{maxModeledFret:37}},
            {physical:{scaleLengthUm:600000,scaleSource:'default'}},{physical:{warningSpanUm:200000,severeSpanUm:100000}},
            {slashBassPitchClass:1},{slashBassPitchClass:0,requirements:[{kind:'bass',value:{tone:'3'}}]},
            {requirements:[{kind:'stopped-position',low:2,high:1}]},{requirements:[{kind:'open',mode:'require'},{kind:'open',mode:'exclude'}]},
            {realization:{kind:'partial',requiredToneIds:[],allowedToneIds:['1']}},
            {instrument:{tuningMidi:[127,59,55,50,45,40],maxModeledFret:1}}]) expect(()=>compileRequest({...intent,...extra})).toThrow(EngineError);
        // Scarce instrument domains are coherent requests, to be proved empty by enumeration.
        expect(compileRequest({...intent,fretDomains:[[0],[0],[0],[0],[0],[0]]}).structural.fretDomains[0]).toEqual([0]);
    });
    it('compiles styles without weakening required identity', () => {
        expect(()=>compileRequest({...intent,subset:{kind:'essential-tones'}})).toThrow();
        const shell=compileRequest({...intent,chordId:'dominant-7',context:'accompaniment',subset:{kind:'essential-tones'}});
        expect(shell.structural.allowed).toEqual(['3','b7']);
        expect(compileRequest({...intent,chordId:'dominant-7',subset:{kind:'drop-2'}}).structural.predicates).toContainEqual({kind:'subset',value:{kind:'drop-2',toneIds:['1','3','5','b7']}});
        expect(()=>compileRequest({...intent,chordId:'dominant-9',subset:{kind:'drop-2',toneIds:['1','3','5','b7']}})).toThrow();
    });
});
