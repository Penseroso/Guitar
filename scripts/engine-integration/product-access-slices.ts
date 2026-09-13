/** Frozen-control access diagnostics only; never imported by production. */
import {readFileSync,writeFileSync} from 'node:fs';
import {evaluateHandPlayability,type FingeringPoint} from '../../src/domain/chord/fretGeometry';
import {compileRequest} from '../../src/domain/chord/engine/requestPolicy';
import {legacyRequiredToneIds} from '../../src/domain/chord/engine/catalog';
import type {Six,StringIndex} from '../../src/domain/chord/engine/types';
const census=JSON.parse(readFileSync('docs/implementation/product-policy-census.json','utf8'));
const result:Record<string,Record<string,number>>={before6:{},after6:{},before18:{},after18:{}};
const shifts:Record<string,{support:number;outsideRecommended:number;promoted:number;demoted:number;retained:number;maxDemotion:number}>={};
for(const row of census.rows){
 const request=compileRequest({schema:'intent-v1',chordId:row.chordId,rootPitchClass:row.root,context:row.context});
 const required=legacyRequiredToneIds(request.interpretation.formula.map(t=>t.id)).filter(id=>row.context!=='accompaniment'||id!=='1');
 for(const [name,entries] of Object.entries({before6:row.beforeTop18.slice(0,6),after6:row.recommendedTop18.slice(0,6),before18:row.beforeTop18,after18:row.recommendedTop18})){
  for(const entry of entries as {states:Six<number>;allRank:number;recommendedRank:number|null}[]){
   const stopped:FingeringPoint[]=[],openStrings:StringIndex[]=[],covered=new Set<string>();let previous=-1,crossing=false;
   for(let s=5;s>=0;s--){const f=entry.states[s];if(f<0)continue;
    if(f>0)stopped.push({string:s as StringIndex,fret:f});else openStrings.push(s as StringIndex);
    const midi=request.structural.instrument.tuningMidi[s]+f;crossing ||=midi<previous;previous=midi;
    covered.add(request.interpretation.formula.find(t=>(t.interval+row.root)%12===midi%12)!.id);
   }
   const oldHand=evaluateHandPlayability(stopped,{openStrings}).playable,oldFormula=required.every(id=>covered.has(id));
   const max=Math.max(...entry.states),count=entry.states.filter(f=>f>=0).length;
   const keys=['all',`quality:${row.chordId}`,`context:${row.context}`,`old-hand-excluded:${!oldHand}`,`old-formula-excluded:${!oldFormula}`,`old-monotonicity-excluded:${crossing}`,
    `legacy-pool:${oldHand&&oldFormula&&!crossing}`,`root:${covered.has('1')?'present':'omitted'}`,`density:${count}`,`high-max-fret:${max>=13}`];
   for(const key of keys){result[name][key]=(result[name][key]??0)+1;
    if(name==='before18'){
     const d=shifts[key]??={support:0,outsideRecommended:0,promoted:0,demoted:0,retained:0,maxDemotion:0};d.support++;
     if(entry.recommendedRank===null)d.outsideRecommended++;else{const delta=entry.recommendedRank-entry.allRank;d.promoted+=Number(delta<0);d.demoted+=Number(delta>0);d.retained+=Number(delta===0);d.maxDemotion=Math.max(d.maxDemotion,delta);}
    }
   }
  }
 }
}
writeFileSync('docs/implementation/product-access-slices.json',JSON.stringify({schema:'product-access-slices-v1',measuredAt:new Date().toISOString(),scope:'First6/top18 only, old booleans are offline diagnostic controls and do not label human suitability. Full All conservation is independently proven in the census.',composition:result,previousTop18Shifts:shifts},null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(result).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).filter(([n])=>n.startsWith('old-')||n.startsWith('legacy-pool:')))])),null,2));
