import {describe,it,expect} from 'vitest';
import {compileRequest} from './requestPolicy';
import {createPhysicalScreen} from './physical';
import {createDemandProjector,demandTier,roundDemand} from './physicalDemand';
import {createVocabularyMatcher} from './practicalVocabulary';
import {surfacePartition} from './recommendedSurface';
import data from './practicalVocabularyData.json';
import type {Six} from './types';

describe('locked independent product policies',()=>{
 it('has inclusive exact thresholds and supported/unsupported tiers',()=>{
  for(const [index,bound] of [[0,55000],[1,42000],[0,110000],[1,50000]])for(const delta of [-1,0,1]){
   const extended=bound===110000||bound===50000,args=[0,0,1,1] as [number,number,number,number];
   if(extended)args[2]=5;args[index]=bound+delta;
   expect(demandTier(...args,false)).toBe(delta>0?extended?'wide-or-complex':'extended':extended?'extended':'compact');
  }
  for(const g of [3,4,5,6])expect(demandTier(0,0,g,1,false)).toBe(g<=4?'compact':g===5?'extended':'wide-or-complex');
  for(const g of [3,4,5,6])expect(demandTier(0,0,1,g,false)).toBe(g<=4?'compact':'extended');
  expect(demandTier(0,0,0,0,true)).toBe('unsupported');
  expect(roundDemand(9007199254740993n,2n)).toBe(4503599627370497n);
 });
 it('preserves contact barriers, all-open values and unsupported reasons',()=>{
  const r=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0});
  const screen=createPhysicalScreen(r.physicalProfile),demand=createDemandProjector(r.physicalProfile);
  const get=(s:Six<number>)=>demand(s,screen.metrics(s));
  expect(get([0,0,0,0,0,0])).toMatchObject({J:0,T:0,G:0,G1:0,Nstop:0,K:0,U:true});
  expect(get([1,1,2,3,3,1])).toMatchObject({G1:4,K:3});
  expect(get([1,0,1,-1,-1,-1])).toMatchObject({G1:2,K:1});
  expect(get([36,35,34,33,32,31]).J).toBeGreaterThan(0);
  for(const physical of [{scope:'restricted-or-personalized'},{handProfileRef:'test'},{omittedStrings:'require-left-hand-damping'}]){
   const p=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0,physical}).physicalProfile;
   expect(createDemandProjector(p)([0,1,0,2,3,-1],createPhysicalScreen(p).metrics([0,1,0,2,3,-1]))).toMatchObject({U:false,Uop:true,tier:'unsupported'});
  }
  for(const reason of ['unsupported-operation','unresolved-screen','conflicting-evidence'] as const)
   expect(demand([0,1,0,2,3,-1],{metrics:{partialCoverGroups:3,stoppedWireSpanUm:0},reasonCodes:[reason]}).Uop).toBe(true);
  for(const reliedOn of [false,true])expect(demand([0,1,0,2,3,-1],{metrics:{partialCoverGroups:3,stoppedWireSpanUm:0,thumbFallback:{reliedOn,nonThumbGroups:2,nonThumbSpanUm:0}},reasonCodes:[]}).Uop).toBe(reliedOn);
  const damping=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0,physical:{omittedStrings:'require-left-hand-damping',allowedThumb:true}}).physicalProfile;
  expect(createDemandProjector(damping)([0,0,0,0,0,0],createPhysicalScreen(damping).metrics([0,0,0,0,0,0])).Uop).toBe(false);
 });
 it('composes only independent output predicates, never overrides REJECT/Uop',()=>{
  for(const M of [true,false])for(const V of [true,false])for(const U of [true,false])for(const O of [true,false])for(const status of ['PASS','UNCERTAIN','REJECT'] as const){
   if(U&&O)continue; // valid L2 contract
   const rep=M&&status!=='REJECT'&&V&&!O&&(status==='PASS'||U),fallback=M&&status!=='REJECT'&&!V&&U;
   expect(surfacePartition(M,status,{U,Uop:O},{V})).toBe(rep?0:fallback?1:2);
  }
 });
 it('adopts exactly the abstract template inventory and rejects outside scope',()=>{
  expect(data.closed.filter(t=>t.kind==='B')).toHaveLength(161);expect(data.closed.filter(t=>t.kind==='A')).toHaveLength(2);expect(data.closed.filter(t=>t.kind==='C')).toHaveLength(1);expect(data.open).toHaveLength(142);
  const request=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0});
  expect(createVocabularyMatcher(request)([0,1,0,2,3,-1]).V).toBe(true);
  for(const extra of [{context:'accompaniment'},{slashBassPitchClass:0},{instrument:{kind:'six-single-strings-12edo',tuningMidi:[64,59,55,50,45,38],maxModeledFret:15}},{fretDomains:Array.from({length:6},()=>[0,1,2,3])}])
   expect(createVocabularyMatcher(compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0,...extra}))([0,1,0,2,3,-1]).V).toBe(false);
  const a=createVocabularyMatcher(compileRequest({schema:'intent-v1',chordId:'major-7',rootPitchClass:0}));
  expect(a([8,8,9,9,-1,-1]).match?.kind).toBe('A');expect(a([0,0,1,1,-1,-1]).V).toBe(false);
  const c=createVocabularyMatcher(compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:5}));
  expect(c([1,1,2,3,-1,-1]).match?.kind).toBe('C');expect(c([13,13,14,15,-1,-1]).V).toBe(false);
 });

});
