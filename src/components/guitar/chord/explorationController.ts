import { createEngineClient,type EngineWorkerPort } from './engineClient';
import { createViewMatcher } from '@/domain/chord/engine/view';
import { compileRequest } from '@/domain/chord/engine/requestPolicy';
import { canonical } from '@/domain/chord/engine/validation';
import { diagnostic,type EngineDiagnostic } from '@/domain/chord/engine/errors';
import type { OutputMessage } from '@/domain/chord/engine/workerProtocol';
import type { ExactPage,PageCursor,PageSummary } from '@/domain/chord/engine/session';
import type { PresentationCandidate,ResolvedRequest,ViewRequest } from '@/domain/chord/engine/types';

export const LIVE_ENGINE_VERSION='guitar-engine/1' as const;
export const DEFAULT_ENGINE_VIEW:ViewRequest=Object.freeze({schema:'view-v1',position:null,soundingCount:null,stringSet:null,
    open:'any',root:'any',coverage:'any',bass:null,top:null,statuses:Object.freeze(['PASS','UNCERTAIN'] as const),order:Object.freeze({kind:'classic'})});
export interface EngineExplorationState {
    phase:'idle'|'loading'|'running'|'paused'|'ready'|'error'|'cancelled';
    request:ResolvedRequest|null;page:ExactPage|null;summary:PageSummary|null;
    selected:PresentationCandidate|null;selectionStale:boolean;selectionNotice:string|null;
    view:ViewRequest;error:EngineDiagnostic|null;canPrevious:boolean;requestEpoch:string;
}
export const INITIAL_ENGINE_STATE:EngineExplorationState=Object.freeze({phase:'idle',request:null,page:null,summary:null,
    selected:null,selectionStale:false,selectionNotice:null,view:DEFAULT_ENGINE_VIEW,error:null,canPrevious:false,requestEpoch:'idle'});
export interface ExplorationRequest {chordId:string;rootPitchClass:number;context:'standalone'|'accompaniment';requestEpoch:string}
interface LookupIntent {id:string;operationId:number|null}
interface HistoryEntry {after:PageCursor|null;size:number;ordinal:number}
const MAX_HISTORY_ENTRIES=64;

/** One bounded page and a separate selected snapshot. History retains cursors only. */
export function createExplorationController(createWorker:()=>EngineWorkerPort) {
    let state=INITIAL_ENGINE_STATE,client:ReturnType<typeof createEngineClient>|null=null;
    let input:ExplorationRequest|null=null,active=false,generation=0;
    let requestedId:string|null=null,pendingLookup:LookupIntent|null=null,lastLookupOperation:number|null=null,mayAutoSelect=true,replacement=false;
    let history:HistoryEntry[]=[{after:null,size:6,ordinal:0}],historyIndex=0;
    const listeners=new Set<()=>void>();
    function publish(patch:Partial<EngineExplorationState>){state=Object.freeze({...state,...patch});for(const listener of listeners)listener();}
    function resetHistory(){history=[{after:null,size:6,ordinal:0}];historyIndex=0;}
    function canPrevious(){return historyIndex>0&&history[historyIndex-1].ordinal===history[historyIndex].ordinal-1;}
    function failure(error:EngineDiagnostic){if(!active)return;publish({phase:'error',error,page:null,selectionStale:state.selected!==null});}
    function runLookup(){if(active&&client&&state.request&&pendingLookup)lastLookupOperation=pendingLookup.operationId=client.lookup(pendingLookup.id)??null;}
    function selectFirstExact(page:ExactPage) {
        if(!mayAutoSelect||pendingLookup)return;
        const selected=page.rows[0]??null;if(selected)mayAutoSelect=false;
        publish({selected,selectionStale:false,selectionNotice:replacement
            ?selected?'The previous allocation is unavailable. Selected the first result matching these filters.':'The previous allocation is unavailable. No result matches these filters.'
            :state.selectionNotice});
    }
    function unavailable() {
        pendingLookup=null;mayAutoSelect=true;replacement=true;
        publish({selected:null,selectionStale:false,selectionNotice:'The previous allocation is unavailable in this request. Waiting for exact matching results.'});
        if(state.page)selectFirstExact(state.page);
    }
    function receive(message:OutputMessage) {
        if(message.kind==='ACCEPTED') {
            const queuedView=canonical(state.view)!==canonical(message.payload.view);
            publish({request:message.payload.request,view:queuedView?state.view:message.payload.view,phase:'running',error:null});
            if(queuedView)client?.setView(state.view,6);
            runLookup();return;
        }
        if(message.kind==='PROGRESS'||message.kind==='PROVISIONAL_PAGE'){publish({phase:'running',summary:message.payload.summary,error:null});return;}
        if(message.kind==='EXACT_PAGE') {
            const page=message.payload.page;publish({phase:'ready',page,summary:page.summary,error:null,canPrevious:canPrevious()});selectFirstExact(page);return;
        }
        if(message.kind==='LOOKUP_RESULT') {
            const selected=message.payload.candidate;
            if(!pendingLookup||selected.candidate.allocationId!==pendingLookup.id)return;
            pendingLookup=null;mayAutoSelect=false;replacement=false;publish({selected,selectionStale:false,selectionNotice:null});return;
        }
        if(message.kind==='PAUSED'){publish({phase:'paused',summary:message.payload.summary});return;}
        if(message.kind==='CANCELLED'){publish({phase:'cancelled',summary:message.payload.summary??state.summary});return;}
        if(message.kind==='ERROR') {
            if(message.operationId===lastLookupOperation&&!pendingLookup)return;
            if(pendingLookup?.operationId===message.operationId&&message.payload.diagnostic.code==='invalid-request'){unavailable();return;}
            failure(message.payload.diagnostic);
        }
    }
    function stop(){active=false;generation++;client?.dispose();client=null;pendingLookup=null;publish({phase:'idle',page:null,summary:null,selectionStale:state.selected!==null});}
    function start(next:ExplorationRequest) {
        const sameHarmony=input?.chordId===next.chordId&&input?.rootPitchClass===next.rootPitchClass;
        const firstInput=input===null,wasActive=active,retained=sameHarmony?state.selected:null,view=sameHarmony?state.view:DEFAULT_ENGINE_VIEW;
        client?.dispose();const ticket=++generation;active=true;input=next;resetHistory();
        const target=((firstInput||!wasActive&&sameHarmony)?requestedId:null)??retained?.candidate.allocationId;
        lastLookupOperation=null;
        pendingLookup=target?{id:target,operationId:null}:null;mayAutoSelect=!target;replacement=false;
        publish({phase:'loading',request:null,page:null,summary:null,selected:retained,selectionStale:retained!==null,
            selectionNotice:null,view,error:null,canPrevious:false,requestEpoch:next.requestEpoch});
        client=createEngineClient({createWorker,onMessage:message=>{if(active&&generation===ticket)receive(message);},onFailure:error=>{if(active&&generation===ticket)failure(error);}});
        client.start({schema:'intent-v1',chordId:next.chordId,rootPitchClass:next.rootPitchClass,context:next.context},view,6);
    }
    function restoreRequestedId(id:string|null) {
        requestedId=id;if(!active||!id||pendingLookup?.id===id||state.selected?.candidate.allocationId===id)return;
        pendingLookup={id,operationId:null};mayAutoSelect=false;publish({selectionStale:state.selected!==null,selectionNotice:null});runLookup();
    }
    function setView(viewInput:Partial<ViewRequest>|ViewRequest) {
        if(!active||!client)return;
        let view:ViewRequest;
        try{const request=state.request??compileRequest({schema:'intent-v1',chordId:input!.chordId,rootPitchClass:input!.rootPitchClass,context:input!.context});
            view=createViewMatcher(request,{...state.view,...viewInput}).view;}
        catch(error){publish({error:diagnostic(error)});return;}
        if(canonical(view)===canonical(state.view))return;
        resetHistory();publish({view,page:null,summary:null,phase:state.request?'running':'loading',error:null,canPrevious:false});
        if(state.request){client.setView(view,6);runLookup();}
    }
    function select(candidate:PresentationCandidate|string) {
        if(!active)return;
        if(typeof candidate!=='string'&&state.request&&candidate.candidate.requestKey===state.request.requestKey) {
            pendingLookup=null;mayAutoSelect=false;replacement=false;publish({selected:candidate,selectionStale:false,selectionNotice:null});return;
        }
        const id=typeof candidate==='string'?candidate:candidate.candidate.allocationId;
        if(state.selected?.candidate.allocationId===id&&!state.selectionStale)return;
        pendingLookup={id,operationId:null};mayAutoSelect=false;replacement=false;publish({selectionStale:state.selected!==null,selectionNotice:null});runLookup();
    }
    function nextPage() {
        if(!active||!client||!state.page?.summary.hasMore||!state.page.nextCursor)return;
        const ordinal=history[historyIndex].ordinal+1;
        history=history.slice(0,historyIndex+1);history.push({after:state.page.nextCursor,size:12,ordinal});
        if(history.length>MAX_HISTORY_ENTRIES)history=[history[0],...history.slice(-(MAX_HISTORY_ENTRIES-1))];
        historyIndex=history.length-1;
        const next=history[historyIndex];publish({page:null,summary:null,phase:'running',error:null,canPrevious:canPrevious()});client.page(next.after,next.size);
    }
    function previousPage() {
        if(!active||!client||!canPrevious())return;
        historyIndex--;const previous=history[historyIndex];publish({page:null,summary:null,phase:'running',error:null,canPrevious:canPrevious()});client.page(previous.after,previous.size);
    }
    function firstPage(){if(active&&client&&state.request){resetHistory();publish({page:null,summary:null,phase:'running',error:null,canPrevious:false});client.page(null,6);}}
    function continueSearch(){if(active&&client&&state.phase==='paused'){publish({phase:'running'});client.continue();}}
    function cancel(){if(active&&client){client.cancel();publish({phase:'cancelled',page:null,error:null});}}
    return Object.freeze({getSnapshot:()=>state,getServerSnapshot:()=>INITIAL_ENGINE_STATE,
        subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
        start,stop,restoreRequestedId,setView,select,nextPage,previousPage,firstPage,continueSearch,cancel});
}
