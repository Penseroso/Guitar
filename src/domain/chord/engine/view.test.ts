import { describe,expect,it } from 'vitest';
import { ALL_OPEN_DISTANCE,createViewMatcher } from './view';
import { compileRequest } from './requestPolicy';
import { EngineError } from './errors';
import type { Extreme,ResolvedRequest,Six,StringIndex,ViewRequest } from './types';

const intent={schema:'intent-v1',chordId:'major',rootPitchClass:0} as const;

// Independent Cartesian product and literal harmonic checks, no engine iterator/matcher.
function oracleCandidates(request:ResolvedRequest):Six<number>[] {
    const all:Six<number>[]=[],buffer=Array<number>(6).fill(-1);
    const pcs=request.interpretation.formula.map(tone=>(request.structural.rootPitchClass+tone.interval)%12);
    const required=request.structural.required.map(id=>pcs[request.interpretation.formula.findIndex(tone=>tone.id===id)]);
    function visit(string:number) {
        if(string===6) {
            const pitches=buffer.flatMap((fret,index)=>fret<0?[]:[(request.structural.instrument.tuningMidi[index]+fret)%12]);
            if(pitches.length&&pitches.every(pc=>pcs.includes(pc))&&required.every(pc=>pitches.includes(pc))
                &&new Set(pitches).size>=request.structural.minDistinctPitchClasses)all.push([...buffer] as unknown as Six<number>);
            return;
        }
        for(const fret of [-1,...request.structural.fretDomains[string]]){buffer[string]=fret;visit(string+1);}
    }
    visit(0);return all;
}
function oracleMatches(request:ResolvedRequest,view:ViewRequest,states:Six<number>,status:'PASS'|'UNCERTAIN') {
    const notes=states.flatMap((fret,string)=>fret<0?[]:[{fret,string,midi:request.structural.instrument.tuningMidi[string]+fret}]);
    const stopped=notes.filter(note=>note.fret>0),pcs=new Set(notes.map(note=>note.midi%12));
    const testExtreme=(value:Extreme|null,midi:number)=>!value||('midi' in value?value.midi===midi:'pitchClass' in value?value.pitchClass===midi%12:
        (request.structural.rootPitchClass+request.interpretation.formula.find(tone=>tone.id===value.tone)!.interval)%12===midi%12);
    if(!view.statuses.includes(status))return false;
    if(view.position&&(!stopped.length||stopped.some(note=>note.fret<view.position!.low||note.fret>view.position!.high)))return false;
    if(view.soundingCount!==null&&notes.length!==view.soundingCount)return false;
    if(view.stringSet&&(notes.some(note=>!view.stringSet!.strings.includes(note.string as StringIndex))||view.stringSet.mode==='exact'&&view.stringSet.strings.some(string=>states[string]<0)))return false;
    if(view.open!=='any'&&notes.some(note=>note.fret===0)!==(view.open==='require'))return false;
    if(view.root!=='any'&&pcs.has(request.structural.rootPitchClass)!==(view.root==='include'))return false;
    const complete=request.interpretation.formula.every(tone=>pcs.has((request.structural.rootPitchClass+tone.interval)%12));
    if(view.coverage!=='any'&&complete!==(view.coverage==='complete'))return false;
    return testExtreme(view.bass,Math.min(...notes.map(note=>note.midi)))&&testExtreme(view.top,Math.max(...notes.map(note=>note.midi)));
}

describe('exact normalized views',()=>{
    it('normalizes defaults and equivalent explicit views to the same immutable key',()=>{
        const request=compileRequest(intent),defaults=createViewMatcher(request);
        expect(defaults.view).toEqual({schema:'view-v1',position:null,soundingCount:null,stringSet:null,open:'any',root:'any',coverage:'any',bass:null,top:null,statuses:['PASS','UNCERTAIN'],order:{kind:'classic'}});
        expect(createViewMatcher(request,{...defaults.view,statuses:['UNCERTAIN','PASS','PASS']}).key).toBe(defaults.key);
        const a=createViewMatcher(request,{stringSet:{mode:'allowed',strings:[5,0,3,0]}});
        const b=createViewMatcher(request,{stringSet:{mode:'allowed',strings:[0,3,5]}});
        expect(a.key).toBe(b.key);expect(Object.isFrozen(a.view.stringSet?.strings)).toBe(true);
    });
    it('matches an independent full-set filter oracle with composed conditions in nonstandard tuning',()=>{
        const request=compileRequest({...intent,context:'accompaniment',instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,67,59,63,66],maxModeledFret:3}});
        const candidates=oracleCandidates(request);expect(candidates.length).toBeGreaterThan(30);
        const views:unknown[]=[{}, {position:{low:1,high:2}}, {position:{low:8,high:12}}, {open:'require'}, {open:'exclude'},
            {root:'include'}, {root:'omit'}, {coverage:'complete'}, {coverage:'omissions'}, {soundingCount:2}, {soundingCount:4},
            {stringSet:{mode:'allowed',strings:[0,2,3,5]}},{stringSet:{mode:'exact',strings:[0,1,2]}},
            {stringSet:{mode:'exact',strings:[]}},{bass:{tone:'1'}},{bass:{pitchClass:4}},{bass:{midi:60}},
            {top:{tone:'5'}},{top:{pitchClass:4}},{top:{midi:67}},{statuses:['PASS']},{statuses:['UNCERTAIN']},
            {position:{low:1,high:3},open:'require',root:'include',coverage:'complete',soundingCount:4,bass:{tone:'1'},top:{midi:67}},
            {root:'omit',coverage:'omissions',stringSet:{mode:'allowed',strings:[0,1,2,3,4,5]},statuses:['UNCERTAIN']},
        ];
        for(const input of views) {
            const compiled=createViewMatcher(request,input);
            for(const status of ['PASS','UNCERTAIN'] as const) {
                expect(candidates.filter(states=>compiled.matches(states,status))).toEqual(candidates.filter(states=>oracleMatches(request,compiled.view,states,status)));
            }
        }
        expect(candidates.filter(states=>createViewMatcher(request).matches(states,'UNCERTAIN'))).toEqual(candidates);
    });
    it('separates all-open null position from high stopped notes with open strings',()=>{
        const request=compileRequest({...intent,instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,67,60,64,67],maxModeledFret:12}});
        const open=[0,0,0,0,0,0] as const,high=[12,0,0,0,0,0] as const;
        expect(createViewMatcher(request).matches(open,'PASS')).toBe(true);
        expect(createViewMatcher(request,{position:{low:0,high:36}}).matches(open,'PASS')).toBe(false);
        expect(createViewMatcher(request,{position:{low:12,high:12},open:'require'}).matches(high,'PASS')).toBe(true);
        expect(createViewMatcher(request,{bass:{midi:60},top:{midi:72}}).matches(high,'PASS')).toBe(true);
        const near=createViewMatcher(request,{order:{kind:'near-position',targetFret:11}});
        expect(near.distance(high)).toBe(2);expect(near.distance(open)).toBe(ALL_OPEN_DISTANCE);
        expect(createViewMatcher(request).distance(open)).toBe(0);
    });
    it('treats valid disjoint filters as no matches without changing base obligations',()=>{
        const request=compileRequest(intent),states=[0,1,0,2,3,-1] as const;
        expect(createViewMatcher(request,{root:'omit'}).matches(states,'PASS')).toBe(false);
        expect(createViewMatcher(request,{bass:{pitchClass:1}}).matches(states,'PASS')).toBe(false);
        expect(createViewMatcher(request,{soundingCount:1}).matches(states,'PASS')).toBe(false);
        expect(createViewMatcher(request).matches(states,'PASS')).toBe(true);
        expect(()=>createViewMatcher(request).matches([-1,-1,-1,-1,-1,-1],'PASS')).toThrow(/contract/);
        expect(()=>createViewMatcher(request,{statuses:['PASS']}).matches([37,0,0,0,0,0],'UNCERTAIN')).toThrow(/contract/);
    });
    it('rejects every malformed closed-schema branch as invalid-view',()=>{
        const request=compileRequest(intent);
        const invalid:unknown[]=[null,[],{extra:1},{schema:'future'},{position:{low:5,high:4}},{position:{low:-1,high:3}},{position:{low:0,high:37}},
            {position:{low:1,high:2,extra:1}},{soundingCount:0},{soundingCount:7},{soundingCount:2.5},{open:null},{root:'required'},{coverage:'full'},
            {stringSet:{mode:'none',strings:[0]}},{stringSet:{mode:'exact',strings:[6]}},{stringSet:{mode:'exact',strings:'0'}},
            {bass:{}},{bass:{tone:'1',midi:60}},{top:{tone:'b9'}},{bass:{pitchClass:12}},{top:{midi:128}},
            {statuses:[]},{statuses:['REJECT']},{statuses:null},{order:{kind:'classic',targetFret:2}},{order:{kind:'near-position',targetFret:37}},{order:null}];
        for(const value of invalid) {
            try {createViewMatcher(request,value);throw new Error('Expected invalid view');}
            catch(error) {expect(error).toBeInstanceOf(EngineError);expect((error as EngineError).code).toBe('invalid-view');}
        }
    });
});
