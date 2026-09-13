import {compilePhysicalProfile} from '../../src/domain/chord/engine/requestPolicy';
import {createDemandProjector,demandTier} from '../../src/domain/chord/engine/physicalDemand';
import {createPhysicalScreen} from '../../src/domain/chord/engine/physical';
import {WIRE_REMAINDER_Q} from '../../src/domain/chord/engine/geometryTable';
import {EngineSession} from '../../src/domain/chord/engine/session';
import type {Six} from '../../src/domain/chord/engine/types';

const check=(a:unknown,b:unknown)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Independent product conformance disagreement');};
// Direct rational oracle: no lookup tables, and rounds T only AFTER max numerator.
function oracle(states:Six<number>,scale:number){
 const L=BigInt(scale),Q=1000000000000n,round=(n:bigint,d:bigint)=>(2n*n+d)/(2n*d),max=(a:bigint,b:bigint)=>a>b?a:b;
 const x=WIRE_REMAINDER_Q.map(q=>round(L*(Q-BigInt(q)),Q)),stops=states.flatMap((f,s)=>f>0?[{f,s}]:[]),f=stops.map(p=>p.f);
 const J=stops.length<2?0n:max(0n,x[Math.max(...f)-1]-x[Math.min(...f)]);
 const y=(s:number,f:number)=>(2n*BigInt(s)-5n)*(70000n*L+34775n*x[f]);
 const intervals=stops.map(p=>{const a=y(p.s,p.f-1),b=y(p.s,p.f);return a<b?[a,b]:[b,a];});
 let t=0n;for(const a of intervals)for(const b of intervals)t=max(t,a[0]-b[1]);
 return {J:Number(J),T:Number(round(t,20n*L))};
}
export function productConformance(){
 const geometry:object[]=[],boundaries:object[]=[],surfaces:object[]=[];
 for(const scale of [1,647700,650000,2000000]){
  const profile=compilePhysicalProfile({scaleLengthUm:scale}),screen=createPhysicalScreen(profile),demand=createDemandProjector(profile);
  let seed=1234567;
  const vectors:Six<number>[]=[[0,0,0,0,0,0],[1,1,2,3,3,1],[1,0,1,1,2,2],[36,1,-1,35,0,2],[36,36,36,36,36,36]];
  for(let n=0;n<2000;n++)vectors.push(Array.from({length:6},()=>{seed=(seed*48271)%2147483647;return seed%38-1;}) as unknown as Six<number>);
  for(const states of vectors){const d=demand(states,screen.metrics(states)),exact=oracle(states,scale);check({J:d.J,T:d.T},exact);geometry.push({scale,states,J:d.J,T:d.T,G:d.G,G1:d.G1,tier:d.tier});}
 }
 for(const J of [0,54999,55000,55001,109999,110000,110001])for(const T of [0,41999,42000,42001,49999,50000,50001])for(const G of [0,3,4,5,6])for(const G1 of [0,3,4,5,6])for(const Uop of [false,true])boundaries.push({J,T,G,G1,Uop,tier:demandTier(J,T,G,G1,Uop)});
 for(const chordId of ['major','dominant-11','power-5']){
  const intent={schema:'intent-v1',chordId,rootPitchClass:0},session=new EngineSession(intent),wrapper={schema:'surface-request-v2',surface:'recommended',view:{}};
  const scan=session.begin(wrapper,6);while(!scan.step()){}const page=scan.finish();
  const next=session.begin(wrapper,12,page.nextCursor);while(!next.step()){}const second=next.finish();
  const replay=new EngineSession(intent,{cacheBudgetBytes:0}),restart=replay.begin(wrapper,18);while(!restart.step()){}const same=restart.finish();
  check([...page.rows,...second.rows].map(r=>r.candidate.allocationId),same.rows.map(r=>r.candidate.allocationId));
  surfaces.push({chordId,counts:page.summary.matching,first:page.rows,second:second.rows});session.dispose();replay.dispose();
 }
 return {geometry,boundaries,surfaces};
}
