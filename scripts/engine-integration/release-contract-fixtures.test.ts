/** Isolated V07/V22 executable contract examples. Nothing here registers a
 * provider, loads a model, or participates in production inference. */
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {describe,it,expect} from 'vitest';
import {CERTIFICATE_PROVIDERS} from '../../src/domain/chord/engine/physical';
import {ENGINE_VERSIONS} from '../../src/domain/chord/engine/versions';
import {EngineSession} from '../../src/domain/chord/engine/session';
import type {PresentationCandidate} from '../../src/domain/chord/engine/types';

// Synthetic necessary condition x² >= 4, over a declared finite integer domain.
// This is a proof-checker test, deliberately NOT a human/hand/geometry model.
interface Scope {allocationId:string;profileKey:string;operations:string[];domain:number[];assumptions:string[]}
interface Certificate {checker:string;scope:Scope;intervals:[number,number][];result:'excluded'}
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function verify(scope:Scope,proof:Certificate|null,expectedHash:string) {
 const abstain={status:'UNCERTAIN' as const};
 if(!proof||proof.checker!=='synthetic-square-checker-v1'||digest(proof)!==expectedHash||digest(proof.scope)!==digest(scope)
  ||scope.assumptions.join('|')!=='finite integer x|necessary x squared >= 4'
  ||scope.operations.join('|')!=='synthetic-integer-realizations'||proof.result!=='excluded')return abstain;
 if(!scope.domain.length||!scope.domain.every(Number.isSafeInteger))return abstain;
 const covered=new Set<number>();
 for(const [lo,hi] of proof.intervals){
  if(!Number.isSafeInteger(lo)||!Number.isSafeInteger(hi)||lo>hi||hi-lo>100)return abstain;
  // Exact arithmetic: independently recompute each interval's upper bound.
  const bound=BigInt(Math.max(Math.abs(lo),Math.abs(hi)));if(bound*bound>=4n)return abstain;
  for(let x=lo;x<=hi;x++)covered.add(x);
 }
 if(!scope.domain.every(x=>covered.has(x)))return abstain;
 return {status:'REJECT' as const,evidence:{hash:expectedHash,checkerVersion:proof.checker,scope:structuredClone(scope),result:proof.result}};
}
const scope:Scope={allocationId:'synthetic-target',profileKey:'synthetic-profile',operations:['synthetic-integer-realizations'],domain:[-1,0,1],assumptions:['finite integer x','necessary x squared >= 4']};
const certificate=():Certificate=>({checker:'synthetic-square-checker-v1',scope:structuredClone(scope),intervals:[[-1,1]],result:'excluded'});

describe('V07 synthetic certificate provider (offline only)',()=>{
 it('records a verified whole-scope exclusion, including exact artifact and checker identity',()=>{
  const p=certificate();expect(verify(scope,p,digest(p))).toEqual({status:'REJECT',evidence:{hash:digest(p),checkerVersion:p.checker,scope,result:'excluded'}});
 });
 it.each(['missing','hash','checker','profile','allocation','operations','assumption','subset','numerical','unsound'])(
  'abstains on %s evidence instead of turning unavailable proof into rejection',failure=>{
   let p:Certificate|null=certificate();let expected='';
   if(failure==='missing')p=null;
   else if(failure==='checker')p.checker='untrusted-v2';
   else if(failure==='profile')p.scope.profileKey='another-hand';
   else if(failure==='allocation')p.scope.allocationId='another-target';
   else if(failure==='operations')p.scope.operations=[];
   else if(failure==='assumption')p.scope.assumptions=['assumed rather than justified'];
   else if(failure==='subset')p.intervals=[[-1,0]];
   else if(failure==='numerical')p.intervals=[[NaN,1]];
   else if(failure==='unsound')p.intervals=[[-2,2]];
   expected=failure==='hash'?'wrong':digest(p);
   expect(verify(scope,p,expected).status).toBe('UNCERTAIN');
  });
 it('checks every nonempty subset of a finite realization domain against an independent witness oracle',()=>{
  const universe=[-3,-2,-1,0,1,2,3];
  for(let mask=1;mask<128;mask++){
   const domain=universe.filter((_,i)=>mask&(1<<i)),request={...scope,domain};
   const p={...certificate(),scope:request,intervals:domain.map(x=>[x,x] as [number,number])};
   expect(verify(request,p,digest(p)).status==='REJECT').toBe(domain.every(x=>Math.abs(x)<2));
  }
 });
 it('cannot use a restricted skeleton to exclude an allowed witness outside that skeleton',()=>{
  const request={...scope,domain:[-2,-1,0,1]};const p={...certificate(),scope:request};
  expect(verify(request,p,digest(p)).status).toBe('UNCERTAIN');
 });
 it('does not certify an unsupported requested operation even if the certificate repeats it',()=>{
  const request={...scope,operations:['synthetic-integer-realizations','unmodeled-operation']};
  const p={...certificate(),scope:request};expect(verify(request,p,digest(p)).status).toBe('UNCERTAIN');
 });
});

type Row=PresentationCandidate;
type Extension=(input:Row[])=>Promise<{id:string;residual:number}[]>;
const incompatible=['version','upstream-distribution','context','features','unsupported-candidate'] as const;
// A fixture adapter for the dormant whole-query contract, not a new runtime API.
async function optionalFixture(base:readonly Row[],extension:Extension,unsupported:string|null=null,expire:Promise<never>=new Promise(()=>{})){
 const ids=base.map(r=>r.candidate.allocationId);
 if(new Set(ids).size!==ids.length||base.some(r=>!Number.isFinite(r.rank.scoreNumerator)))throw Error('Corrupt deterministic input');
 const bytes=JSON.stringify(base);
 if(unsupported)return {rows:JSON.parse(bytes) as Row[],diagnostic:unsupported};
 try{
  const proposal=await Promise.race([extension(JSON.parse(bytes) as Row[]),expire]);
  if(proposal.length!==ids.length||new Set(proposal.map(p=>p.id)).size!==ids.length
   ||proposal.some(p=>!ids.includes(p.id)||!Number.isFinite(p.residual)))throw Error('Invalid extension output');
  const pristine=JSON.parse(bytes) as Row[];
  return {rows:proposal.map(p=>pristine.find(r=>r.candidate.allocationId===p.id)!),diagnostic:null};
 }catch{return {rows:JSON.parse(bytes) as Row[],diagnostic:'ranking-fallback'};}
}
function completeRows(){
 const session=new EngineSession({schema:'intent-v1',chordId:'major',rootPitchClass:0,
  instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,67,60,63,65],maxModeledFret:2},
  physical:{warningSpanUm:0}});
 const rows:Row[]=[];let after:unknown=null;
  do{const scan=session.begin({schema:'surface-request-v2',surface:'all',view:{}},128,after);while(!scan.step()){}
  const page=scan.finish();rows.push(...page.rows);after=page.nextCursor;
  if(!page.summary.hasMore){expect(rows).toHaveLength(page.summary.matching);break;}
 }while(after);
 expect(new Set(rows.map(r=>r.physical.status))).toEqual(new Set(['PASS','UNCERTAIN']));
 session.dispose();return rows;
}
describe('V22 optional extension whole-query failure fixture (disabled in product)',()=>{
 it.each(incompatible)('falls back for %s before attempting inference',async reason=>{
  const base=completeRows();let called=false;
  const result=await optionalFixture(base,async()=>{called=true;throw Error('must not run');},reason);
  expect(called).toBe(false);expect(JSON.stringify(result.rows)).toBe(JSON.stringify(base));
 });
 it.each(['throw','nonfinite','missing','duplicate','foreign','mutates-then-fails','timeout'])(
  'returns byte-identical ordered IDs, ledgers, notes and Physical evidence after %s',async failure=>{
   const base=completeRows(),before=JSON.stringify(base);expect(base.length).toBeGreaterThan(1);
   const extension:Extension=async input=>{
    if(failure==='throw')throw Error('inference unavailable');
    if(failure==='mutates-then-fails'){input.reverse();input[0].rank.ledger=[];throw Error('inference failure after mutation');}
    if(failure==='timeout')return new Promise(()=>{});
    const output=input.map(r=>({id:r.candidate.allocationId,residual:0}));
    if(failure==='nonfinite')output[0].residual=NaN;
    if(failure==='missing')output.pop();
    if(failure==='duplicate')output[0]=output[1];
    if(failure==='foreign')output[0].id='outside-universe';return output;
   };
   const expire=failure==='timeout'?Promise.resolve().then(()=>{throw Error('deterministic simulated deadline');}):new Promise<never>(()=>{});
   const result=await optionalFixture(base,extension,null,expire);
   expect(result.diagnostic).toBe('ranking-fallback');expect(JSON.stringify(result.rows)).toBe(before);expect(JSON.stringify(base)).toBe(before);
  });
 it('conserves a successful mock permutation without accepting mutated ledger payloads',async()=>{
  // Conservation control only. This does not approve a displacement limit or
  // model; activation and the future displacement policy remain out of scope.
  const base=completeRows(),result=await optionalFixture(base,async input=>{
   input[0].rank.ledger=[];return input.reverse().map(r=>({id:r.candidate.allocationId,residual:0}));
  });expect(result.diagnostic).toBeNull();expect(result.rows).toEqual([...base].reverse());
 });
 it('never treats corrupt deterministic inputs as optional inference failure',async()=>{
  const base=completeRows();await expect(optionalFixture([base[0],base[0]],async()=>[])).rejects.toThrow('Corrupt deterministic input');
 });
});

it('keeps both dormant capabilities disabled and fixtures out of every production source import',()=>{
 expect(CERTIFICATE_PROVIDERS).toEqual([]);expect(Object.isFrozen(CERTIFICATE_PROVIDERS)).toBe(true);
 expect(ENGINE_VERSIONS.empirical).toEqual({enabled:false});
 function walk(dir:string){for(const e of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,e.name);if(e.isDirectory())walk(path);else if(/\.[jt]sx?$/.test(path)&&!path.includes('.test.')){
   expect(readFileSync(path,'utf8'),path).not.toMatch(/release-contract-fixtures|synthetic-square-checker|optionalFixture/);
  }
 }}walk('src');
});
