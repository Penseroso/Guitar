/** Complete offline policy validation. Reads frozen controls, writes NEW evidence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {EngineSession} from '../../src/domain/chord/engine/session';
import type {Six} from '../../src/domain/chord/engine/types';
import {ENGINE_VERSIONS} from '../../src/domain/chord/engine/versions';

// Loaded only when this offline comparison is explicitly run; ordinary builds
// do not depend on a generated historical checkout. See product-readiness.md.
interface BaselineSession {
 begin(view:unknown,size:number):{step():boolean;finish():{rows:{candidate:{states:Six<number>}}[]}};
 store:{complete:boolean;read(index:number):{states:Six<number>;scoreNumerator:number;status:string}};
 dispose():void;
}
const Stage9=createRequire(import.meta.url)(resolve('.tmp-policy-baseline/src/domain/chord/engine/session.ts')).EngineSession as new(intent:unknown)=>BaselineSession;

const prior=JSON.parse(readFileSync('docs/implementation/engine-integrated-census.json','utf8'));
const code=(s:readonly number[])=>s.reduce((a,f)=>a*38+f+1,0);
const decode=(n:number):Six<number>=>{const s=Array<number>(6);for(let i=5;i>=0;i--){s[i]=n%38-1;n=Math.floor(n/38);}return s as unknown as Six<number>;};
type Row={code:number;score:number;status:string;partition:number};
const classic=(a:Row,b:Row)=>b.score-a.score||a.code-b.code;
const digest=(rows:Row[])=>{const b=Buffer.alloc(rows.length*12);rows.forEach((r,i)=>{b.writeUInt32LE(r.code,i*12);b.writeInt32LE(r.score,i*12+4);b.writeUInt32LE(r.status==='PASS'?0:1,i*12+8);});return createHash('sha256').update(b).digest('hex');};
const counts:Record<string,Record<string,number>>={all:{},recommended:{},before6:{},after6:{},before18:{},after18:{}};
const add=(target:Record<string,number>,keys:string[])=>keys.forEach(k=>target[k]=(target[k]??0)+1);
function slices(s:Six<number>,root:number,quality:string,context:string,status:string,partition:number){
 const tuning=[64,59,55,50,45,40],notes=s.flatMap((f,i)=>f<0?[]:[tuning[i]+f]),max=Math.max(...s),stops=s.filter(f=>f>0),min=stops.length?Math.min(...stops):0;
 let crossed=false,last=-1;for(let i=5;i>=0;i--)if(s[i]>=0){const midi=tuning[i]+s[i];crossed ||=midi<last;last=midi;}
 return ['all',`quality:${quality}`,`context:${context}`,`status:${status}`,`partition:${partition}`,`density:${notes.length}`,`reduced:${notes.length<=4}`,
 `position:${max<=0?'all-open':max<=7?'low':max<=12?'standard':'high'}`,`minimum-position:${min>=11?'11-15':min>=8?'8-10':min>=4?'4-7':min?'1-3':'all-open'}`,
 `root:${notes.some(n=>n%12===root)?'rooted':'rootless'}`,`inversion:${Math.min(...notes)%12!==root}`,`texture:${s.includes(0)?'open':'closed'}`,`formerly-monotonicity-excluded:${crossed}`];
}
const rows:object[]=[],empty:object[]=[],totals={structural:0,pass:0,uncertain:0,reject:0,representatives:0,fallbacks:0,allOnly:0};
let covered=0,nonempty=0,firstRetained=0,maxBytes=0,maxAccounted=0;const start=performance.now();
for(const previous of prior.rows){
 const {chordId,root,context}=previous,intent={schema:'intent-v1',chordId,rootPitchClass:root,context};
 const stage9=new Stage9(intent),oldScan=stage9.begin({},18);while(!oldScan.step()){}const old=oldScan.finish();
 const started=performance.now(),session=new EngineSession(intent),scan=session.begin({schema:'surface-request-v2',surface:'recommended',view:{}},18);
 while(!scan.step()){}const page=scan.finish(),nodeRecommendedMs=performance.now()-started;
 assert.deepEqual(Object.fromEntries(['structural','pass','uncertain','reject'].map(k=>[k,page.summary[k as 'structural']])),previous.counts);
 assert(session.store.complete&&stage9.store.complete);
 const now:Row[]=[],before:Row[]=[];
 for(let i=0;i<session.store.count;i++){
  const n=session.store.read(i),o=stage9.store.read(i);assert.deepEqual(n,o,'Full enumeration/status/score byte source differs');
  now.push({code:code(n.states),score:n.scoreNumerator,status:n.status,partition:session.store.partition(i)});
  before.push({code:code(o.states),score:o.scoreNumerator,status:o.status,partition:0});
 }
 now.sort(classic);before.sort(classic);
 const allHash=digest(now);assert.equal(allHash,digest(before),'Complete All order differs from Stage9');
 const allScan=session.begin({},18);while(!allScan.step()){}const all=allScan.finish();
 assert.deepEqual(all.rows.map(r=>r.candidate.states),old.rows.map(r=>r.candidate.states));
 assert.deepEqual(all.rows.map(r=>({states:r.candidate.states,score:r.rank.scoreNumerator,status:r.physical.status})),previous.newTop18.map((r:{states:number[];score:number;status:string})=>({states:r.states,score:r.score,status:r.status})));
 const distance=(r:Row)=>{const s=decode(r.code).filter(f=>f>0);return s.length?Math.abs(Math.min(...s)+Math.max(...s)-24):2147483647;};
 const near=(a:Row,b:Row)=>distance(a)-distance(b)||classic(a,b);
 assert.equal(digest([...now].sort(near)),digest([...before].sort(near)),'Complete All near-position order differs');
 const representatives=now.filter(r=>r.partition===0),fallbacks=now.filter(r=>r.partition===1),recommended=[...representatives,...fallbacks];
 assert.deepEqual(page.rows.map(r=>code(r.candidate.states)),recommended.slice(0,18).map(r=>r.code));assert.equal(page.summary.matching,recommended.length);
 assert.equal(page.summary.explicitMatching,page.summary.survivors);
 if(recommended.length)nonempty++;else empty.push({chordId,root,context});
 if(context==='standalone'&&representatives.length)covered++;
 if(recommended[0]?.code===now[0]?.code)firstRetained++;
 for(const k of ['structural','pass','uncertain','reject'] as const)totals[k]+=page.summary[k];
 totals.representatives+=representatives.length;totals.fallbacks+=fallbacks.length;totals.allOnly+=now.length-recommended.length;
 const oldRanks=new Map(now.map((r,i)=>[r.code,i+1])),newRanks=new Map(recommended.map((r,i)=>[r.code,i+1]));
 const delta=recommended.map((r,i)=>i+1-oldRanks.get(r.code)!).sort((a,b)=>a-b);
 const top=(list:Row[])=>list.slice(0,18).map(r=>({states:decode(r.code),score:r.score,status:r.status,partition:r.partition,allRank:oldRanks.get(r.code),recommendedRank:newRanks.get(r.code)??null}));
 for(const [target,list] of Object.entries({all:now,recommended,before6:now.slice(0,6),after6:recommended.slice(0,6),before18:now.slice(0,18),after18:recommended.slice(0,18)}))
  for(const r of list)add(counts[target],slices(decode(r.code),root,chordId,context,r.status,r.partition));
 maxBytes=Math.max(maxBytes,page.summary.retainedBufferBytes);maxAccounted=Math.max(maxAccounted,page.summary.accountedBufferBytes);
 rows.push({chordId,root,context,counts:page.summary,representatives:representatives.length,fallbacks:fallbacks.length,allOnly:now.length-recommended.length,
  allOrderSha256:allHash,allNear12Sha256:digest([...now].sort(near)),recommendedCount:recommended.length,nodeRecommendedMs,
  demotion:{removedFromRecommended:now.length-recommended.length,promoted:delta.filter(d=>d<0).length,demoted:delta.filter(d=>d>0).length,p50:delta[Math.floor(delta.length*.5)],p95:delta[Math.floor(delta.length*.95)],min:delta[0],max:delta.at(-1)},beforeTop18:top(now),recommendedTop18:top(recommended)});
 session.dispose();stage9.dispose();
 if(rows.length%24===0)console.log(JSON.stringify({completed:rows.length,covered,nonempty,elapsedMs:Math.round(performance.now()-start)}));
}
const result={schema:'product-policy-census-v1',createdAt:new Date().toISOString(),baseline:'32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0',versions:ENGINE_VERSIONS,
 methodology:'Every allocation compared with extracted Stage9 session; complete sorted packed state/score/status SHA256 in classic and near12 order; exact live session All and Recommended top18 verified against independent partition sort. Offline Node timings include assertions, not browser latency. Source-free primary data.',
 gates:{standaloneRepresentatives:{actual:covered,required:240,pass:covered===240},recommendedNonempty:{actual:nonempty,required:432,total:480,pass:nonempty>=432}},empty,totals,firstRetained,firstChanged:480-firstRetained,composition:counts,maxBytes,maxAccounted,elapsedMs:performance.now()-start,rows};
writeFileSync('docs/implementation/product-policy-census.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,rows:undefined,composition:undefined},null,2));
assert.equal(covered,240);assert(nonempty>=432);
