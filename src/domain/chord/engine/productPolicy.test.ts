import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {compileRequest} from './requestPolicy';
import {createPhysicalScreen} from './physical';
import {createDemandProjector,demandTier,roundDemand} from './physicalDemand';
import {createVocabularyMatcher} from './practicalVocabulary';
import {surfacePartition} from './recommendedSurface';
import {compileStructuralMatcher} from './structuralGenerator';
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
 });
 it('composes only independent output predicates, never overrides REJECT/Uop',()=>{
  for(const M of [true,false])for(const V of [true,false])for(const U of [true,false])for(const O of [true,false])for(const status of ['PASS','UNCERTAIN','REJECT'] as const){
   if(U&&O)continue; // valid L2 contract
   const rep=M&&status!=='REJECT'&&V&&!O&&(status==='PASS'||U),fallback=M&&status!=='REJECT'&&!V&&U;
   expect(surfacePartition(M,status,{U,Uop:O},{V})).toBe(rep?0:fallback?1:2);
  }
 });
 it('adopts exactly the abstract template inventory and rejects outside scope',()=>{
  expect(data.closed.filter(t=>t.kind==='B')).toHaveLength(109);expect(data.closed.filter(t=>t.kind==='A')).toHaveLength(2);expect(data.closed.filter(t=>t.kind==='C')).toHaveLength(1);expect(data.open).toHaveLength(99);
  const request=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0});
  expect(createVocabularyMatcher(request)([0,1,0,2,3,-1]).V).toBe(true);
  for(const extra of [{context:'accompaniment'},{slashBassPitchClass:0},{instrument:{kind:'six-single-strings-12edo',tuningMidi:[64,59,55,50,45,38],maxModeledFret:15}},{fretDomains:Array.from({length:6},()=>[0,1,2,3])}])
   expect(createVocabularyMatcher(compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0,...extra}))([0,1,0,2,3,-1]).V).toBe(false);
 });
 it('reproduces every frozen observation and the 162 conflicts without fitting',()=>{
  const rows=readFileSync('.research/web-voicing-corpus-v2/sitewide-practical-mapping/rows.jsonl','utf8').trim().split(/\r?\n/).map(s=>JSON.parse(s));
  let mapped=0,excluded=0,U=0,passConflict=0,uncertainConflict=0;
  const queries=new Map<string,ReturnType<typeof compileRequest>>();
  for(const row of rows){
   const {chordId,rootPitchClass,statesHighToLow:states}=row.row;
   const q=`${chordId}/${rootPitchClass}`;let r=queries.get(q);if(!r){r=compileRequest({schema:'intent-v1',chordId,rootPitchClass});queries.set(q,r);}
   const valid=compileStructuralMatcher(r.structural)(states);
   expect(valid).toBe(row.mapped);
   if(!valid){excluded++;continue;}mapped++;
   const physical=createPhysicalScreen(r.physicalProfile).metrics(states),demand=createDemandProjector(r.physicalProfile)(states,physical),v=createVocabularyMatcher(r)(states);
   for(const k of ['J','T','G','G1','Nstop','K','U','Uop','tier'] as const)expect(demand[k]).toEqual(row.demand[k]);
   expect(physical.status).toBe(row.candidate.status);expect(v.V).toBe(true);
   if(demand.U)U++;else if(physical.status==='PASS'){passConflict++;expect(surfacePartition(true,physical.status,demand,v)).toBe(0);}
   else{uncertainConflict++;expect(surfacePartition(true,physical.status,demand,v)).toBe(2);}
  }
  expect({mapped,excluded,U,passConflict,uncertainConflict,queries:queries.size}).toEqual({mapped:1454,excluded:56,U:1292,passConflict:141,uncertainConflict:21,queries:240});
 },30000);
 it('matches the exact1530 vocabulary and keeps77 extrapolations distinct, with no cross-quality or open translation leakage',()=>{
  const dir='docs/research/web-voicing-corpus-v2/sitewide-practical-audit/';
  const frozen=JSON.parse(readFileSync(dir+'proposed-vocabulary.json','utf8'));
  const observed=JSON.parse(readFileSync(dir+'source-observed-placements.json','utf8')).placements.filter((r:{mapped:boolean})=>r.mapped);
  const extra=JSON.parse(readFileSync(dir+'product-extrapolated-placements.json','utf8'));
  const key=(q:string,r:number,s:readonly number[])=>`${q}/${r}/${s.join(',')}`;
  const witnessed=new Set<string>(observed.map((r:{quality:string;rootPitchClass:number;statesHighToLow:number[];semantics:string})=>{expect(r.semantics).toBe('source-observed');return key(r.quality,r.rootPitchClass,r.statesHighToLow);}));
  const expected=new Set<string>(witnessed);
  expect(witnessed.size).toBe(1453);expect(extra).toHaveLength(77);
  for(const r of extra){expect(r.semantics).toBe('product-extrapolated');const id=key(r.quality,r.rootPitchClass,r.statesHighToLow);expect(witnessed.has(id)).toBe(false);expected.add(id);}
  expect(expected.size).toBe(1530);
  const matchers=new Map<string,ReturnType<typeof createVocabularyMatcher>>();
  for(const quality of data.qualities)for(let root=0;root<12;root++)matchers.set(`${quality}/${root}`,createVocabularyMatcher(compileRequest({schema:'intent-v1',chordId:quality,rootPitchClass:root})));
  const probes:number[][]=[];
  for(const t of frozen.closedTemplates)for(let p=0;p<=16;p++)probes.push(t.offsetsHighToLow.map((f:number)=>f<0?-1:f+p));
  for(const o of frozen.exactOpenForms)for(let shift=0;shift<=12;shift++)probes.push(o.statesHighToLow.map((f:number)=>f<0?-1:f+shift));
  const found=new Set<string>();
  for(const [query,match] of matchers)for(const states of probes){const id=`${query}/${states.join(',')}`,actual=match(states as unknown as Six<number>).V;
   if(actual)found.add(id);expect(actual,id).toBe(expected.has(id));}
  expect(found).toEqual(expected);
 },30000);
});
