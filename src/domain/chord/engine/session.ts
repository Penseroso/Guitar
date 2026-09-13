import { compileRequest } from './requestPolicy';
import { StructuralIterator, compileStructuralMatcher, materializeStructural, type StructuralCheckpoint } from './structuralGenerator';
import { createPhysicalScreen } from './physical';
import { createClassicProjector } from './classicFeatures';
import { compareRank, rankCandidate, scoreFeatures, validateRankKey, type RankKey } from './deterministicRanking';
import { createFactsProjector } from './facts';
import { createSurfaceRequest } from './surfaceRequest';
import { createDemandProjector } from './physicalDemand';
import { createVocabularyMatcher } from './practicalVocabulary';
import { surfacePartition, type SurfacePartition } from './recommendedSurface';
import { parseAllocationId, allocationId } from './identity';
import { PageHeap } from './pageHeap';
import { PackedStore, ROW_BUDGET_BYTES } from './packedStore';
import { EngineError } from './errors';
import { canonical, freeze, integer, record } from './validation';
import { ENGINE_VERSIONS } from './versions';
import type { PresentationCandidate, ResolvedRequest, Six } from './types';

export interface OrderKey extends RankKey {distance:number;partition:number}
export interface PageCursor {
    schema:'surface-cursor-v2';requestKey:string;profileKey:string;viewKey:string;
    versions:typeof ENGINE_VERSIONS;
    last:OrderKey&{allocationId:string};
}
export interface Counts {structural:number;pass:number;uncertain:number;reject:number;survivors:number;matching:number;matchingPass:number;matchingUncertain:number;assessed:number;explicitMatching:number}
export interface PageSummary extends Counts {
    completeness:'partial'|'exact';hasMore:boolean|'unknown';mode:'compact'|'replay';
    requestKey:string;profileKey:string;viewKey:string;versions:typeof ENGINE_VERSIONS;rankMode:'classic-v1';
    rawBound:string;visitedNodes:number;retainedBufferBytes:number;accountedBufferBytes:number;
}
export interface ExactPage {rows:readonly PresentationCandidate[];summary:PageSummary;nextCursor:PageCursor|null;outcome:'results'|'structurally-empty'|'no-matches'}
interface HeapRow extends OrderKey {status:'PASS'|'UNCERTAIN'}
export interface ScanCheckpoint {
    schema:'scan-checkpoint-v1';requestKey:string;viewKey:string;pageSize:number;after:PageCursor|null;
    iterator:StructuralCheckpoint;counts:Counts;afterCount:number;heap:readonly HeapRow[];
}
const emptyCounts=():Counts=>({structural:0,pass:0,uncertain:0,reject:0,survivors:0,matching:0,matchingPass:0,matchingUncertain:0,assessed:0,explicitMatching:0});
export const compareOrder=(a:OrderKey,b:OrderKey)=>a.partition-b.partition||a.distance-b.distance||compareRank(a,b);

/** One semantic request and at most one active scan. Complete packed storage is
 * optional; traversal, accounting and exact page semantics never depend on it. */
export class EngineSession {
    readonly request:ResolvedRequest;
    readonly screen:ReturnType<typeof createPhysicalScreen>;
    readonly projector:ReturnType<typeof createClassicProjector>;
    readonly facts:ReturnType<typeof createFactsProjector>;
    readonly demand:ReturnType<typeof createDemandProjector>;
    readonly vocabulary:ReturnType<typeof createVocabularyMatcher>;
    readonly rawBound:string;
    private valid:(states:Six<number>)=>boolean;
    private serial=0;
    store:PackedStore;
    constructor(intent:unknown,readonly options:{cacheBudgetBytes?:number}={}) {
        this.request=compileRequest(intent);
        this.valid=compileStructuralMatcher(this.request.structural);
        this.screen=createPhysicalScreen(this.request.physicalProfile);
        this.projector=createClassicProjector(this.request,this.screen.geometry);
        this.facts=createFactsProjector(this.request,this.screen.geometry);
        this.demand=createDemandProjector(this.request.physicalProfile);
        this.vocabulary=createVocabularyMatcher(this.request);
        this.rawBound=new StructuralIterator(this.request.structural).rawBound.toString();
        this.store=new PackedStore(options.cacheBudgetBytes??ROW_BUDGET_BYTES);
    }
    lookup(id:string):PresentationCandidate {
        const parsed=parseAllocationId(id);
        if(parsed.tuning.some((n,i)=>n!==this.request.structural.instrument.tuningMidi[i])) throw new EngineError('invalid-request','Allocation tuning differs from the current request.');
        if(!this.valid(parsed.states))throw new EngineError('invalid-request','Allocation is outside the current structural request.');
        const candidate=materializeStructural(parsed.states,this.request.structural,this.request.requestKey);
        const physical=this.screen.assess(candidate),facts=this.facts(parsed.states),rank=rankCandidate(candidate,this.projector(parsed.states));
        const labels=[...(facts.rootStrings.length?[]:['Root omitted']),...(facts.omittedFormula.length?[`Omits ${facts.omittedFormula.join(', ')}`]:['Complete formula']),...(facts.stoppedPosition?[]:['All open'])];
        const demand=this.demand(parsed.states,physical),vocabulary=this.vocabulary(parsed.states);
        const recommendation={version:'recommended-surface-v2' as const,eligible:surfacePartition(true,physical.status,demand,vocabulary)<2};
        return freeze({candidate,physical,facts,rank,displayRank:null,labels,demand,vocabulary,recommendation});
    }
    partition(states:Six<number>,screen=this.screen.metrics(states)):SurfacePartition {
        return surfacePartition(true,screen.status,this.demand(states,screen),this.vocabulary(states));
    }
    begin(viewInput:unknown={},pageSize=6,after:unknown=null,checkpoint?:ScanCheckpoint):PageScan {
        const view=createSurfaceRequest(this.request,viewInput);
        integer(pageSize,1,128,'pageSize');
        const cursor=this.validateCursor(after,view);
        if(checkpoint||!this.store.complete) {this.store.discard();this.store=new PackedStore(checkpoint?0:this.options.cacheBudgetBytes??ROW_BUDGET_BYTES);}
        return new PageScan(this,++this.serial,view,pageSize,cursor,checkpoint);
    }
    cancel(){this.serial++;if(!this.store.complete)this.store.discard();}
    dispose(){this.cancel();this.store.discard();}
    isCurrent(serial:number){return serial===this.serial;}
    private validateCursor(input:unknown,view:ReturnType<typeof createSurfaceRequest>):PageCursor|null {
        if(input===null||input===undefined)return null;
        try {
            const c=record(input,['schema','requestKey','profileKey','viewKey','versions','last'],'cursor');
            if(c.schema!=='surface-cursor-v2'||c.requestKey!==this.request.requestKey||c.profileKey!==this.request.physicalProfile.key
                ||c.viewKey!==view.key||canonical(c.versions)!==canonical(ENGINE_VERSIONS)) throw new Error('Incompatible keys.');
            const last=record(c.last,['allocationId','scoreNumerator','tie','distance','partition'],'cursor.last');
            validateRankKey(last as unknown as RankKey);integer(last.distance,0,2147483647,'distance');
            const row=this.lookup(last.allocationId as string),states=row.candidate.states;
            const partition=view.surface==='all'?0:surfacePartition(true,row.physical.status,row.demand,row.vocabulary);
            if(partition===2||last.partition!==partition)throw new Error('Invalid surface partition.');
            if(!view.matches(states,row.physical.status)||row.rank.scoreNumerator!==last.scoreNumerator
                ||canonical(states)!==canonical(last.tie)||view.distance(states)!==last.distance) throw new Error('Cursor key does not match its allocation.');
            return freeze(input as PageCursor);
        } catch {throw new EngineError('stale-cursor','Cursor does not belong to this completed view/order. Restart paging.');}
    }
}

export class PageScan {
    private iterator:StructuralIterator;
    private counts=emptyCounts();
    private heap:PageHeap<HeapRow>;
    private afterCount=0;
    private cacheIndex=0;
    private cached:boolean;
    private done=false;
    private result:ExactPage|null=null;
    constructor(private session:EngineSession,private serial:number,readonly view:ReturnType<typeof createSurfaceRequest>,
        readonly pageSize:number,readonly after:PageCursor|null,checkpoint?:ScanCheckpoint) {
        this.cached=session.store.complete;
        this.iterator=new StructuralIterator(session.request.structural,checkpoint?.iterator);
        this.heap=new PageHeap<HeapRow>(pageSize,compareOrder);
        if(checkpoint) {
            if(checkpoint.schema!=='scan-checkpoint-v1'||checkpoint.requestKey!==session.request.requestKey||checkpoint.viewKey!==view.key
                ||checkpoint.pageSize!==pageSize||canonical(checkpoint.after)!==canonical(after)) throw new EngineError('stale-cursor','Checkpoint context differs.');
            this.validateCounts(checkpoint.counts);integer(checkpoint.afterCount,0,checkpoint.counts.matching,'afterCount');
            if(checkpoint.heap.length!==Math.min(pageSize,checkpoint.afterCount)
                ||!after&&checkpoint.afterCount!==checkpoint.counts.matching
                ||checkpoint.counts.structural>checkpoint.iterator.visitedNodes)throw new EngineError('contract-error','Invalid checkpoint accumulator.');
            const seen=new Set<string>();
            for(const row of checkpoint.heap){validateRankKey(row);const id=allocationId(session.request.structural.instrument.tuningMidi,row.tie);
                const detail=session.lookup(id);
                const partition=view.surface==='all'?0:surfacePartition(true,detail.physical.status,detail.demand,detail.vocabulary);
                if(partition===2||row.partition!==partition)throw new EngineError('contract-error','Corrupt checkpoint partition.');
                if(seen.has(id)||row.scoreNumerator!==detail.rank.scoreNumerator||row.distance!==view.distance(row.tie)
                    ||row.status!==detail.physical.status||!view.matches(row.tie,row.status)||after&&compareOrder(row,after.last)<=0)throw new EngineError('contract-error','Corrupt checkpoint row.');
                seen.add(id);this.heap.offer({...row,tie:[...row.tie] as Six<number>});}
            this.counts={...checkpoint.counts};this.afterCount=checkpoint.afterCount;this.cached=false;
        }
    }
    /** Each call performs at most maxNodes DFS nodes (or retained rows). A worker
     * checks elapsed time/cancellation between calls and yields at task boundaries. */
    step(maxNodes=256):boolean {
        integer(maxNodes,1,256,'scan slice nodes');
        if(!this.session.isCurrent(this.serial))throw new EngineError('contract-error','This scan has been superseded.');
        if(this.done)return true;
        if(this.cached) {
            const end=Math.min(this.cacheIndex+maxNodes,this.session.store.count);
            while(this.cacheIndex<end){const index=this.cacheIndex++,row=this.session.store.read(index);
                let partition=0;
                if(this.view.surface==='recommended'){
                    partition=this.session.store.partition(index);
                    if(partition===255){partition=this.session.partition(row.states);this.session.store.setPartition(index,partition as SurfacePartition);}
                }
                this.consume(row.states,row.status,row.scoreNumerator,undefined,partition);
            }
            this.done=this.cacheIndex===this.session.store.count;
        } else {
            const batch=this.iterator.nextBatch(maxNodes);
            for(const states of batch.candidates) {
                const screen=this.session.screen.metrics(states);
                const matches=this.view.matches(states,screen.status);
                const partition=this.view.surface==='recommended'?this.session.partition(states,screen):0;
                const score=!this.session.store.discarded||matches?scoreFeatures(this.session.projector(states)):undefined;
                if(!this.session.store.discarded){this.session.store.append(states,screen,score!);
                    if(!this.session.store.discarded&&this.view.surface==='recommended')this.session.store.setPartition(this.session.store.count-1,partition as SurfacePartition);}
                this.consume(states,screen.status,score,matches,partition);
            }
            this.done=batch.done;
            if(this.done&&!this.session.store.discarded)this.session.store.complete=true;
        }
        return this.done;
    }
    private consume(states:Six<number>,status:'PASS'|'UNCERTAIN',score?:number,matches=this.view.matches(states,status),partition=0) {
        this.counts.structural++;this.counts.assessed++;this.counts.survivors++;
        if(status==='PASS')this.counts.pass++;else this.counts.uncertain++;
        if(!matches)return;
        this.counts.explicitMatching++;
        if(partition===2)return;
        this.counts.matching++;if(status==='PASS')this.counts.matchingPass++;else this.counts.matchingUncertain++;
        const row:HeapRow={tie:states,status,scoreNumerator:score??scoreFeatures(this.session.projector(states)),distance:this.view.distance(states),partition};
        if(this.after&&compareOrder(row,this.after.last)<=0)return;
        this.afterCount++;this.heap.offer(row);
    }
    summary():PageSummary {
        return {...this.counts,completeness:this.done?'exact':'partial',hasMore:this.done?this.afterCount>this.heap.size:'unknown',
            mode:this.session.store.discarded?'replay':'compact',requestKey:this.session.request.requestKey,profileKey:this.session.request.physicalProfile.key,
            viewKey:this.view.key,versions:ENGINE_VERSIONS,rankMode:'classic-v1',rawBound:this.session.rawBound,
            visitedNodes:this.cached?this.cacheIndex:this.iterator.checkpoint().visitedNodes,
            retainedBufferBytes:this.session.store.retainedBytes,accountedBufferBytes:this.session.store.accountedBytes};
    }
    checkpoint():ScanCheckpoint {
        if(this.cached)throw new EngineError('unsupported-request','A cached scan resumes within its live session; after worker loss restart the page.');
        return freeze({schema:'scan-checkpoint-v1',requestKey:this.session.request.requestKey,viewKey:this.view.key,pageSize:this.pageSize,
            after:this.after,iterator:this.iterator.checkpoint(),counts:{...this.counts},afterCount:this.afterCount,heap:this.heap.sorted()});
    }
    private *materializePage():Generator<void,ExactPage> {
        if(!this.session.isCurrent(this.serial))throw new EngineError('contract-error','This scan has been superseded.');
        if(!this.done)throw new EngineError('contract-error','An incomplete scan cannot return an exact page.');
        if(this.result)return this.result;
        this.validateCounts(this.counts);
        const ordered=this.heap.sorted();
        const rows:PresentationCandidate[]=[];
        for(let i=0;i<ordered.length;i++) {
            const row=ordered[i];
            const candidate=this.session.lookup(allocationId(this.session.request.structural.instrument.tuningMidi,row.tie));
            if(candidate.rank.scoreNumerator!==row.scoreNumerator||candidate.physical.status!==row.status)throw new EngineError('contract-error','Packed and materialized results differ.');
            rows.push(freeze({...candidate,displayRank:this.counts.matching-this.afterCount+i+1}));
            yield;
            if(!this.session.isCurrent(this.serial))throw new EngineError('contract-error','This scan has been superseded.');
        }
        const last=ordered.at(-1);
        const nextCursor:PageCursor|null=last?{schema:'surface-cursor-v2',requestKey:this.session.request.requestKey,profileKey:this.session.request.physicalProfile.key,
            viewKey:this.view.key,versions:ENGINE_VERSIONS,last:{scoreNumerator:last.scoreNumerator,tie:last.tie,distance:last.distance,partition:last.partition,allocationId:rows[rows.length-1].candidate.allocationId}}:null;
        this.result=freeze({rows,summary:this.summary(),nextCursor,outcome:this.counts.structural===0?'structurally-empty':this.counts.matching===0?'no-matches':'results'});
        return this.result;
    }
    finish():ExactPage {
        const work=this.materializePage();for(;;){const step=work.next();if(step.done)return step.value;}
    }
    async finishAsync(yieldTask:()=>Promise<void>,now:()=>number=()=>performance.now()):Promise<ExactPage> {
        const work=this.materializePage();let slice=now();
        for(;;){const step=work.next();if(step.done)return step.value;if(now()-slice>=8){await yieldTask();slice=now();}}
    }
    private validateCounts(c:Counts){
        record(c,['structural','pass','uncertain','reject','survivors','matching','matchingPass','matchingUncertain','assessed','explicitMatching'],'counts','contract-error');
        for(const value of Object.values(c))integer(value,0,Number(this.session.rawBound),'count');
        if(c.structural!==c.pass+c.uncertain+c.reject||c.survivors!==c.pass+c.uncertain||c.assessed!==c.structural
                ||c.matching!==c.matchingPass+c.matchingUncertain||c.matching>c.explicitMatching||c.explicitMatching>c.survivors||c.matchingPass>c.pass||c.matchingUncertain>c.uncertain)
            throw new EngineError('contract-error','Inconsistent partition counters.');
    }
}
