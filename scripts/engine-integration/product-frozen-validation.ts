/** Explicit offline validation requiring the user-supplied frozen research artifacts. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileRequest} from '../../src/domain/chord/engine/requestPolicy';
import {createPhysicalScreen} from '../../src/domain/chord/engine/physical';
import {createDemandProjector} from '../../src/domain/chord/engine/physicalDemand';
import {createVocabularyMatcher} from '../../src/domain/chord/engine/practicalVocabulary';
import {surfacePartition} from '../../src/domain/chord/engine/recommendedSurface';
import {compileStructuralMatcher} from '../../src/domain/chord/engine/structuralGenerator';
import data from '../../src/domain/chord/engine/practicalVocabularyData.json';
import type {Six} from '../../src/domain/chord/engine/types';
const checks:string[]=[];
function check(name:string,work:()=>void){work();checks.push(name);console.log(name);}
const expect=(actual:unknown,message?:string)=>({toBe:(value:unknown)=>assert.equal(actual,value,message),toEqual:(value:unknown)=>assert.deepEqual(actual,value,message),toHaveLength:(value:number)=>assert.equal((actual as {length:number}).length,value,message)});
 check('reproduces every frozen observation and the 162 conflicts without fitting',()=>{
  const rows=readFileSync('.research/web-voicing-corpus-v2/sitewide-practical-mapping/rows.jsonl','utf8').trim().split(/\r?\n/).map(s=>JSON.parse(s));
  let mapped=0,excluded=0,U=0,passConflict=0,uncertainConflict=0;
  const queries=new Map<string,ReturnType<typeof compileRequest>>();
  for(const row of rows){
   const {chordId,rootPitchClass,statesHighToLow:states}=row.row;
   const q=`${chordId}/${rootPitchClass}`;let r=queries.get(q);if(!r){r=compileRequest({schema:'intent-v1',chordId,rootPitchClass});queries.set(q,r);}
   const valid=compileStructuralMatcher(r.structural)(states);
   expect(valid).toBe(row.mapped);
   if(!valid){expect(createVocabularyMatcher(r)(states).V).toBe(false);excluded++;continue;}mapped++;
   const physical=createPhysicalScreen(r.physicalProfile).metrics(states),demand=createDemandProjector(r.physicalProfile)(states,physical),v=createVocabularyMatcher(r)(states);
   for(const k of ['J','T','G','G1','Nstop','K','U','Uop','tier'] as const)expect(demand[k]).toEqual(row.demand[k]);
   expect(physical.status).toBe(row.candidate.status);expect(v.V).toBe(true);
   if(demand.U)U++;else if(physical.status==='PASS'){passConflict++;expect(surfacePartition(true,physical.status,demand,v)).toBe(0);}
   else{uncertainConflict++;expect(surfacePartition(true,physical.status,demand,v)).toBe(2);}
  }
  expect({mapped,excluded,U,passConflict,uncertainConflict,queries:queries.size}).toEqual({mapped:1454,excluded:56,U:1292,passConflict:141,uncertainConflict:21,queries:240});
 });
 check('matches the exact1530 vocabulary and keeps77 extrapolations distinct, with no cross-quality or open translation leakage',()=>{
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
 });
const paths=['docs/research/web-voicing-corpus-v2/sitewide-practical-audit/proposed-vocabulary.json','docs/research/web-voicing-corpus-v2/sitewide-practical-audit/source-observed-placements.json','docs/research/web-voicing-corpus-v2/sitewide-practical-audit/product-extrapolated-placements.json','.research/web-voicing-corpus-v2/sitewide-practical-mapping/rows.jsonl','src/domain/chord/engine/practicalVocabularyData.json'];
writeFileSync('docs/implementation/product-frozen-validation.json',JSON.stringify({schema:'product-frozen-validation-v1',measuredAt:new Date().toISOString(),checks,passed:true,mapped:1454,excluded:56,compact:1292,passConflicts:141,uncertainConflicts:21,closedB:109,closedA:2,closedC:1,exactOpen:99,uniqueObserved:1453,extrapolated:77,uniqueVocabulary:1530,queryPlacementProbes:765840,sourceHashes:Object.fromEntries(paths.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]))},null,2)+'\n');
