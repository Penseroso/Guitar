/** Offline integrated distribution diagnostic. No frozen artifact is modified. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { CHORD_REGISTRY_LIST } from '../../src/domain/chord/registry';
import { searchDeductiveVoicings } from '../../src/domain/chord/voicingSearch';
import { buildDeductiveChordTones } from '../../src/domain/chord/degreeRequirements';
import { scoreResolvedVoicing } from '../../src/domain/chord/deductiveRanking';
import { evaluateHandPlayability,type FingeringPoint } from '../../src/domain/chord/fretGeometry';
import { FROZEN_CHORD_BASELINE } from '../chord-baseline';
import { EngineSession } from '../../src/domain/chord/engine/session';
import { legacyRequiredToneIds } from '../../src/domain/chord/engine/catalog';
import type { Six,StringIndex } from '../../src/domain/chord/engine/types';

const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const previousPath='docs/implementation/engine-census.json',rankingPath='docs/implementation/engine-ranking-control.json';
interface PreviousRow {chordId:string;root:number;context:'standalone'|'accompaniment';baseline:number;monotonicNoHand:number;noMonotonicHand:number;oldPolicy:{count:number};newPolicy:{count:number;rawBound:string};policyAdditions:number}
const previous=JSON.parse(readFileSync(previousPath,'utf8')) as {baseline:string;baselineSourceHashes:Record<string,string>;frozenCensus:{path:string;sha256:string};rows:PreviousRow[]};
const ranking=JSON.parse(readFileSync(rankingPath,'utf8')) as {controls:Record<string,string>;rows:{chordId:string;root:number;context:string;oldTop6:string[]}[]};
const pinnedControls={...previous.baselineSourceHashes,...ranking.controls};
for(const [path,hash] of Object.entries(pinnedControls))assert.equal(sha(path),hash,`Legacy source control changed: ${path}`);
const frozenAvailability=existsSync(previous.frozenCensus.path)
    ?{...previous.frozenCensus,status:'verified-now',actualSha256:sha(previous.frozenCensus.path)}
    :{...previous.frozenCensus,status:'unavailable-now',actualSha256:null};
if(frozenAvailability.actualSha256)assert.equal(frozenAvailability.actualSha256,previous.frozenCensus.sha256);
const code=(states:readonly number[])=>states.reduce((n,f)=>n*38+f+1,0);
function decode(n:number):Six<number>{const states=Array<number>(6);for(let s=5;s>=0;s--){states[s]=n%38-1;n=Math.floor(n/38);}return states as unknown as Six<number>;}
type Partition={structural:number;pass:number;uncertain:number;reject:number};
const partition=():Partition=>({structural:0,pass:0,uncertain:0,reject:0});
function add(p:Partition,status:'PASS'|'UNCERTAIN'){p.structural++;if(status==='PASS')p.pass++;else p.uncertain++;}
const count=(record:Record<string,number>,key:string)=>{record[key]=(record[key]??0)+1;};
type Demotion={support:number;positive:number;maximum:number;histogram:Map<number,number>;oldTop6:number;lostTop6:number;oldTop18:number;lostTop18:number};
function demotion():Demotion{return {support:0,positive:0,maximum:0,histogram:new Map(),oldTop6:0,lostTop6:0,oldTop18:0,lostTop18:0};}
function addDemotion(d:Demotion,oldRank:number,newRank:number){const delta=newRank-oldRank;d.support++;if(delta>0)d.positive++;d.maximum=Math.max(d.maximum,delta);d.histogram.set(delta,(d.histogram.get(delta)??0)+1);if(oldRank<=6){d.oldTop6++;if(newRank>6)d.lostTop6++;}if(oldRank<=18){d.oldTop18++;if(newRank>18)d.lostTop18++;}}
function summarizeDemotion(d:Demotion){const entries=[...d.histogram].sort((a,b)=>a[0]-b[0]);const quantile=(p:number)=>{const target=Math.ceil(d.support*p);let seen=0;for(const [value,n] of entries){seen+=n;if(seen>=target)return value;}return null;};return {support:d.support,positiveDemotions:d.positive,maximumDemotion:d.maximum,deltaQuantiles:{p50:quantile(.5),p90:quantile(.9),p95:quantile(.95),p99:quantile(.99)},oldTop6:d.oldTop6,lostTop6:d.lostTop6,oldTop18:d.oldTop18,lostTop18:d.lostTop18};}
interface ShapeFacts {position:'all-open'|'low'|'standard'|'high';root:'rooted'|'rootless';density:number;texture:'open'|'closed';bassTone:string;topTone:string;minMidi:number;maxMidi:number;omitted:string[];crossing:boolean}
function facts(states:Six<number>,root:number,formula:readonly {id:string;interval:number}[],tuning:Six<number>):ShapeFacts {
    let maxStop=0,rooted=false,density=0,open=false,minMidi=128,maxMidi=-1,previousMidi=-1,crossing=false,mask=0;
    for(let s=5;s>=0;s--){const f=states[s];if(f<0)continue;const midi=tuning[s]+f;density++;maxStop=Math.max(maxStop,f);open ||=f===0;rooted ||=midi%12===root;mask|=1<<(midi%12);minMidi=Math.min(minMidi,midi);maxMidi=Math.max(maxMidi,midi);crossing ||=midi<previousMidi;previousMidi=midi;}
    const tone=(midi:number)=>formula.find(t=>(root+t.interval)%12===midi%12)!.id;
    return {position:maxStop===0?'all-open':maxStop<=7?'low':maxStop<=12?'standard':'high',root:rooted?'rooted':'rootless',density,texture:open?'open':'closed',
        bassTone:tone(minMidi),topTone:tone(maxMidi),minMidi,maxMidi,omitted:formula.filter(t=>!(mask&(1<<((root+t.interval)%12)))).map(t=>t.id),crossing};
}
function keys(f:ShapeFacts,chordId:string,context:string){return ['all',`quality:${chordId}`,`context:${context}`,`quality-context:${chordId}/${context}`,`position:${f.position}`,`root:${f.root}`,`context-root:${context}/${f.root}`,`density:${f.density}`,`texture:${f.texture}`,`bass-tone:${f.bassTone}`,`top-tone:${f.topTone}`,`bass-midi:${f.minMidi}`,`top-midi:${f.maxMidi}`];}
function composition(records:readonly {code:number;status?:'PASS'|'UNCERTAIN'}[],root:number,formula:readonly {id:string;interval:number}[],tuning:Six<number>){const result:Record<string,number>={};for(const record of records){const f=facts(decode(record.code),root,formula,tuning);for(const key of keys(f,'','').filter(k=>!k.startsWith('quality:')&&!k.startsWith('context:')&&!k.startsWith('quality-context:')&&!k.startsWith('context-root:')))count(result,key);if(record.status)count(result,`status:${record.status}`);count(result,f.omitted.length?'formula:omissions':'formula:complete');if(f.crossing)count(result,'crossing');}return result;}
const totals=partition(),admissions={formulaPolicyAdditions:partition(),crossingAll:partition(),crossingOldPolicy:partition(),oldHandRejectedAll:partition(),oldHandRejectedOldPolicy:partition(),oldHandRejectedAndCrossing:partition(),baseline:partition()};
const protectedDemotions=new Map<string,Demotion>(),poolComposition:Record<string,number>={},oldTop6Composition:Record<string,number>={},newTop6Composition:Record<string,number>={},oldTop18Composition:Record<string,number>={},newTop18Composition:Record<string,number>={};
const addComposition=(target:Record<string,number>,source:Record<string,number>)=>{for(const [key,value] of Object.entries(source))target[key]=(target[key]??0)+value;};
const rows:object[]=[],started=performance.now();let baselineRetained=0,policyAdditions=0,top6Changed=0,top18Changed=0,maxRetainedBufferBytes=0,maxAccountedBufferBytes=0;
for(const entry of CHORD_REGISTRY_LIST) {
    for(let root=0;root<12;root++)for(const context of ['standalone','accompaniment'] as const){
        const label=`${entry.id}/${root}/${context}`,prior=previous.rows.find(r=>r.chordId===entry.id&&r.root===root&&r.context===context);assert.ok(prior,label);
        const queryStarted=performance.now(),session=new EngineSession({schema:'intent-v1',chordId:entry.id,rootPitchClass:root,context});
        const scan=session.begin({},18);while(!scan.step()){}const page=scan.finish(),scanMs=performance.now()-queryStarted;
        assert.equal(page.summary.completeness,'exact',label);assert.equal(page.summary.structural,prior.newPolicy.count,label);assert.equal(page.summary.rawBound,prior.newPolicy.rawBound,label);
        assert.equal(page.summary.structural,page.summary.pass+page.summary.uncertain+page.summary.reject,label);assert.equal(page.summary.reject,0,label);assert.equal(page.summary.survivors,page.summary.structural,label);
        assert.ok(session.store.complete,`${label} default pool must fit compact storage`);assert.equal(session.store.count,page.summary.structural,label);
        maxRetainedBufferBytes=Math.max(maxRetainedBufferBytes,page.summary.retainedBufferBytes);maxAccountedBufferBytes=Math.max(maxAccountedBufferBytes,page.summary.accountedBufferBytes);
        const {formula}=session.request.interpretation,tuning=session.request.structural.instrument.tuningMidi;
        const required=legacyRequiredToneIds(formula.map(t=>t.id)).filter(id=>context!=='accompaniment'||id!=='1');
        const newRecords:{code:number;score:number;status:'PASS'|'UNCERTAIN'}[]=[],seen=new Set<number>();
        const local={formulaPolicyAdditions:partition(),crossing:partition(),crossingOldPolicy:partition(),oldHandRejected:partition(),oldHandRejectedOldPolicy:partition(),baseline:partition()},localPartition=partition();
        const offlineLegacyCodes=new Set<number>();
        for(let index=0;index<session.store.count;index++){
            const stored=session.store.read(index),states=stored.states,n=code(states);assert.ok(!seen.has(n),`${label} duplicate`);seen.add(n);newRecords.push({code:n,score:stored.scoreNumerator,status:stored.status});add(totals,stored.status);add(localPartition,stored.status);
            const f=facts(states,root,formula,tuning);for(const key of keys(f,entry.id,context))count(poolComposition,key);count(poolComposition,`status:${stored.status}`);count(poolComposition,f.omitted.length?'formula:omissions':'formula:complete');
            const oldPolicy=required.every(id=>!f.omitted.includes(id));if(!oldPolicy){add(admissions.formulaPolicyAdditions,stored.status);add(local.formulaPolicyAdditions,stored.status);}
            if(f.crossing){add(admissions.crossingAll,stored.status);add(local.crossing,stored.status);if(oldPolicy){add(admissions.crossingOldPolicy,stored.status);add(local.crossingOldPolicy,stored.status);}}
            const stopped:FingeringPoint[]=[],openStrings:StringIndex[]=[];
            for(let s=5;s>=0;s--)if(states[s]>0)stopped.push({string:s as StringIndex,fret:states[s]});else if(states[s]===0)openStrings.push(s as StringIndex);
            const oldHand=evaluateHandPlayability(stopped,{openStrings}).playable;
            if(!oldHand){add(admissions.oldHandRejectedAll,stored.status);add(local.oldHandRejected,stored.status);if(oldPolicy){add(admissions.oldHandRejectedOldPolicy,stored.status);add(local.oldHandRejectedOldPolicy,stored.status);}if(f.crossing)add(admissions.oldHandRejectedAndCrossing,stored.status);}
            if(oldPolicy&&oldHand&&!f.crossing)offlineLegacyCodes.add(n);
        }
        assert.deepEqual(localPartition,{structural:page.summary.structural,pass:page.summary.pass,uncertain:page.summary.uncertain,reject:page.summary.reject},label);
        assert.equal(local.formulaPolicyAdditions.structural,prior.policyAdditions,label);policyAdditions+=prior.policyAdditions;
        assert.equal(local.crossingOldPolicy.structural,prior.oldPolicy.count-prior.monotonicNoHand,`${label} old crossing scope`);
        assert.equal(local.oldHandRejectedOldPolicy.structural,prior.oldPolicy.count-prior.noMonotonicHand,`${label} old hand scope`);
        newRecords.sort((a,b)=>b.score-a.score||a.code-b.code);
        assert.deepEqual(page.rows.map(row=>code(row.candidate.states)),newRecords.slice(0,18).map(row=>row.code),`${label} exact top18 equals independent full-pool order`);
        const newRanks=new Map(newRecords.map((record,index)=>[record.code,{rank:index+1,status:record.status}]));
        const tones=buildDeductiveChordTones(entry,root),oldPool=searchDeductiveVoicings(entry,root,{position:'close'},{maxFret:15,context});assert.equal(oldPool.length,prior.baseline,label);
        const oldRecords=oldPool.map(voicing=>{const states=Array<number>(6).fill(-1);for(const note of voicing.notes)if(!note.isMuted)states[note.string]=note.fret;return {code:code(states),score:scoreResolvedVoicing(voicing,entry,tones,{weightOverrides:FROZEN_CHORD_BASELINE}).score,span:voicing.span,minFret:voicing.minFret,id:voicing.id};});
        oldRecords.sort((a,b)=>b.score-a.score||a.span-b.span||a.minFret-b.minFret||a.id.localeCompare(b.id));
        assert.deepEqual(new Set(oldRecords.map(r=>r.code)),offlineLegacyCodes,`${label} exact offline legacy gates parity`);
        const rankingControl=ranking.rows.find(r=>r.chordId===entry.id&&r.root===root&&r.context===context);assert.ok(rankingControl,label);
        assert.deepEqual(oldRecords.slice(0,6).map(r=>decode(r.code).join(',')),rankingControl.oldTop6,`${label} original top6 scorer control`);
        const localDemotion=demotion();
        for(let index=0;index<oldRecords.length;index++){
            const old=oldRecords[index],now=newRanks.get(old.code);assert.ok(now,`${label} baseline allocation lost`);baselineRetained++;add(admissions.baseline,now.status);add(local.baseline,now.status);addDemotion(localDemotion,index+1,now.rank);
            const f=facts(decode(old.code),root,formula,tuning);for(const key of keys(f,entry.id,context)){let d=protectedDemotions.get(key);if(!d){d=demotion();protectedDemotions.set(key,d);}addDemotion(d,index+1,now.rank);}
        }
        const old6=composition(oldRecords.slice(0,6),root,formula,tuning),new6=composition(newRecords.slice(0,6),root,formula,tuning),old18=composition(oldRecords.slice(0,18),root,formula,tuning),new18=composition(newRecords.slice(0,18),root,formula,tuning);
        addComposition(oldTop6Composition,old6);addComposition(newTop6Composition,new6);addComposition(oldTop18Composition,old18);addComposition(newTop18Composition,new18);
        const changed=(n:number)=>oldRecords.slice(0,n).some((r,i)=>newRecords[i]?.code!==r.code);if(changed(6))top6Changed++;if(changed(18))top18Changed++;
        // Direct lookup independently proves reachability of every old top18, including displaced rows.
        for(const old of oldRecords.slice(0,18)){const id=`shape-v1:${tuning.join(',')}:${decode(old.code).join(',')}`;assert.equal(session.lookup(id).candidate.allocationId,id,label);}
        const details=(records:readonly {code:number;score:number;status?:'PASS'|'UNCERTAIN'}[])=>records.slice(0,18).map(record=>({states:decode(record.code),score:record.score,status:record.status??newRanks.get(record.code)!.status,newRank:newRanks.get(record.code)!.rank,facts:facts(decode(record.code),root,formula,tuning)}));
        rows.push({chordId:entry.id,root,context,counts:localPartition,rawBound:page.summary.rawBound,visitedNodes:page.summary.visitedNodes,retainedBufferBytes:page.summary.retainedBufferBytes,accountedBufferBytes:page.summary.accountedBufferBytes,baselineRetained:oldRecords.length,admissions:local,demotion:summarizeDemotion(localDemotion),top6Changed:changed(6),top18Changed:changed(18),composition:{oldTop6:old6,newTop6:new6,oldTop18:old18,newTop18:new18},oldTop18:details(oldRecords),newTop18:details(newRecords),nodeScanMs:scanMs,nodeTotalComparisonMs:performance.now()-queryStarted});
        session.dispose();
    }
    process.stdout.write(`Integrated census: ${entry.id} (${rows.length}/480)\n`);
}
assert.equal(rows.length,480);assert.equal(totals.structural,15943679);assert.equal(baselineRetained,1647041);assert.equal(policyAdditions,1790745);
const sources=['src/domain/chord/engine/session.ts','src/domain/chord/engine/structuralGenerator.ts','src/domain/chord/engine/requestPolicy.ts','src/domain/chord/engine/catalog.ts','src/domain/chord/engine/physical.ts','src/domain/chord/engine/classicFeatures.ts','src/domain/chord/engine/deterministicRanking.ts','src/domain/chord/engine/packedStore.ts'];
const output={schema:'engine-integrated-census-v1',createdAt:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,baseline:previous.baseline,controls:{pinnedSourceHashes:pinnedControls,previousCensus:{path:previousPath,sha256:sha(previousPath)},identicalPoolRanking:{path:rankingPath,sha256:sha(rankingPath)},frozenCensus:frozenAvailability},sourceHashes:Object.fromEntries(sources.map(path=>[path,sha(path)])),methodology:'All 20 qualities × 12 roots × 2 contexts at default fret15. EngineSession completes exact full partition and top18. Independent offline sorting of all compact rows verifies exact top18; all legacy production survivors are located in the new pool and each old top18 is directly looked up. Old float scorer order is kept separate from new integer order. Position bins use maximum stopped fret: low1–7, standard8–12, high13–15, with all-open separate. Root, density, open/closed, formula tones at actual MIDI bass/top and registers are factual slices. Demotion is new one-based rank minus old one-based rank; top6/18 loss means a formerly topN allocation moved beyond N. Admission categories overlap and old-hand-rejected does not mean human infeasibility. All timings are single-run Node diagnostic measurements with assertions and offline classification, never browser latency, improved preference, human playability or comfort evidence. Frozen artifacts unavailable at this run remain explicitly unavailable for fresh verification; prior integration evidence is used without reconstructing or rewriting them.',queries:rows.length,totals,baselineRetained,policyAdditions,admissions,top6ChangedQueries:top6Changed,top18ChangedQueries:top18Changed,maxRetainedBufferBytes,maxAccountedBufferBytes,poolComposition,composition:{oldTop6:oldTop6Composition,newTop6:newTop6Composition,oldTop18:oldTop18Composition,newTop18:newTop18Composition},protectedDemotions:Object.fromEntries([...protectedDemotions].map(([key,value])=>[key,summarizeDemotion(value)])),elapsedMs:performance.now()-started,rows};
// Keep global evidence readable and each detailed request on one line.
const {rows:evidenceRows,...header}=output;
writeFileSync('docs/implementation/engine-integrated-census.json',`${JSON.stringify(header,null,2).slice(0,-2)},\n  "rows": [\n${evidenceRows.map(row=>`    ${JSON.stringify(row)}`).join(',\n')}\n  ]\n}\n`);
process.stdout.write(`${JSON.stringify({queries:rows.length,totals,baselineRetained,policyAdditions,admissions,top6Changed,top18Changed,demotion:summarizeDemotion(protectedDemotions.get('all')!),elapsedMs:output.elapsedMs})}\n`);
