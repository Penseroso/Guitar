import { describe,expect,it,vi } from 'vitest';
import { createExplorationController,DEFAULT_ENGINE_VIEW } from './explorationController';
import type { EngineWorkerPort } from './engineClient';
import { EngineSession,type ExactPage } from '@/domain/chord/engine/session';
import { createViewMatcher } from '@/domain/chord/engine/view';
import { createSurfaceRequest } from '@/domain/chord/engine/surfaceRequest';
import { ENGINE_VERSIONS } from '@/domain/chord/engine/versions';
import type { InputMessage } from '@/domain/chord/engine/workerProtocol';

const request={chordId:'major',rootPitchClass:0,context:'accompaniment',requestEpoch:'first'} as const;
function fixture() {
    const ports:EngineWorkerPort[]=[],sent:InputMessage[]=[];
    const controller=createExplorationController(()=>{
        const port:EngineWorkerPort={postMessage:vi.fn(value=>sent.push(value as InputMessage)),terminate:vi.fn(),onmessage:null,onerror:null,onmessageerror:null};ports.push(port);return port;
    });
    const send=(kind:string,payload:unknown,meta:InputMessage=sent.at(-1)!,port=ports.at(-1)!)=>{
        if(kind==='ACCEPTED'){
            const p=payload as {request:EngineSession['request'];view:unknown};
            payload={...p,versions:ENGINE_VERSIONS,surface:createSurfaceRequest(p.request,{schema:'surface-request-v2',surface:'recommended',view:p.view}).wrapper};
        }
        port.onmessage?.({data:{...meta,kind,payload}} as MessageEvent);
    };
    const start=()=>sent.filter(message=>message.kind==='START').at(-1)!;
    const accepted=(session:EngineSession,meta:InputMessage=start())=>send('ACCEPTED',{request:session.request,view:createViewMatcher(session.request).view,versions:ENGINE_VERSIONS},meta);
    const complete=(page:ExactPage,meta:InputMessage=start())=>send('EXACT_PAGE',{page,chunkIndex:0,chunkCount:1},meta);
    return {controller,ports,sent,send,start,accepted,complete};
}
function exact(session:EngineSession,view:unknown={},size=6,after:unknown=null){const scan=session.begin(view,size,after);while(!scan.step()){}return scan.finish();}
const session=new EngineSession({schema:'intent-v1',chordId:'major',rootPitchClass:0,context:'accompaniment'});
const first=exact(session);
const partial={...first.summary,completeness:'partial' as const,hasMore:'unknown' as const};

describe('session browsing and independent selection state',()=>{
    it('bounds history to first plus63 recent cursors, stops previous at the gap and restores first6 explicitly',()=>{
        const f=fixture();f.controller.start(request);f.accepted(session);f.complete(first);const selected=f.controller.getSnapshot().selected;
        const next=exact(session,{},12,first.nextCursor);
        // Repeated valid pages isolate cursor-history retention from generator depth.
        for(let i=0;i<70;i++){f.controller.nextPage();f.complete(next,f.sent.at(-1)!);}
        let previous=0;while(f.controller.getSnapshot().canPrevious){f.controller.previousPage();f.complete(next,f.sent.at(-1)!);previous++;expect(previous).toBeLessThan(64);}
        expect(previous).toBe(62);const count=f.sent.length;f.controller.previousPage();expect(f.sent).toHaveLength(count);
        f.controller.firstPage();expect(f.sent.at(-1)).toMatchObject({kind:'PAGE',payload:{after:null,pageSize:6}});
        f.complete(first,f.sent.at(-1)!);expect(f.controller.getSnapshot()).toMatchObject({selected,canPrevious:false,page:{rows:first.rows}});f.controller.stop();
    });
    it('selects only exact initial results and preserves explicit selection across replacement pages and back navigation',()=>{
        const f=fixture();f.controller.start(request);f.accepted(session);
        f.send('PROVISIONAL_PAGE',{rows:[{...first.rows[0],displayRank:null}],summary:partial},f.start());
        expect(f.controller.getSnapshot().selected).toBeNull();
        f.complete(first);expect(f.controller.getSnapshot().selected).toEqual(first.rows[0]);
        f.controller.select(first.rows[5]);f.controller.nextPage();
        expect(f.controller.getSnapshot()).toMatchObject({page:null,phase:'running',canPrevious:true,selected:first.rows[5]});
        const next=f.sent.at(-1)!;expect(next).toMatchObject({kind:'PAGE',payload:{pageSize:12,after:first.nextCursor}});
        f.complete(exact(session,{},12,first.nextCursor),next);
        expect(f.controller.getSnapshot().selected).toEqual(first.rows[5]);
        f.controller.previousPage();const previous=f.sent.at(-1)!;expect(previous).toMatchObject({kind:'PAGE',payload:{pageSize:6,after:null}});
        f.complete(first,previous);expect(f.controller.getSnapshot().page?.rows).toHaveLength(6);expect(f.controller.getSnapshot().canPrevious).toBe(false);
        f.controller.stop();
    });
    it('restores a requested identity through independent lookup even if its first exact page arrives first',()=>{
        const f=fixture(),selected=first.rows[5];f.controller.restoreRequestedId(selected.candidate.allocationId);f.controller.start(request);f.accepted(session);
        const lookup=f.sent.at(-1)!;expect(lookup.kind).toBe('LOOKUP');
        f.complete(first);expect(f.controller.getSnapshot().selected).toBeNull();
        f.send('LOOKUP_RESULT',{candidate:{...selected,displayRank:null}},lookup);
        expect(f.controller.getSnapshot()).toMatchObject({selected:{candidate:selected.candidate},selectionStale:false});f.controller.stop();
    });
    it('retains filters and marks context selection stale until fresh lookup, replacing unavailable selection only from an exact matching page',()=>{
        const f=fixture();f.controller.start(request);f.accepted(session);f.complete(first);
        const rootless=session.lookup('shape-v1:64,59,55,50,45,40:0,-1,0,-1,-1,-1');f.controller.select(rootless);
        f.controller.setView({open:'require'});const filteredView=f.controller.getSnapshot().view;
        f.controller.start({...request,context:'standalone',requestEpoch:'context'});
        expect(f.controller.getSnapshot()).toMatchObject({selected:rootless,selectionStale:true,view:filteredView,page:null});
        const standalone=new EngineSession({schema:'intent-v1',chordId:'major',rootPitchClass:0});
        const meta=f.start();f.send('ACCEPTED',{request:standalone.request,view:createViewMatcher(standalone.request,filteredView).view,versions:ENGINE_VERSIONS},meta);
        const lookup=f.sent.at(-1)!;expect(lookup.kind).toBe('LOOKUP');
        const matching=exact(standalone,filteredView);f.complete(matching,meta);
        expect(f.controller.getSnapshot().selected).toEqual(rootless);expect(f.controller.getSnapshot().selectionStale).toBe(true);
        f.send('ERROR',{diagnostic:{code:'invalid-request',message:'Allocation unavailable.'},resume:'restart-required'},lookup);
        expect(f.controller.getSnapshot()).toMatchObject({selected:matching.rows[0],selectionStale:false,phase:'ready'});
        expect(f.controller.getSnapshot().selectionNotice).toContain('unavailable');
        f.controller.start({...request,rootPitchClass:1,requestEpoch:'root'});
        expect(f.controller.getSnapshot()).toMatchObject({selected:null,view:DEFAULT_ENGINE_VIEW,selectionStale:false});f.controller.stop();
    });
    it('queues filters before ACCEPTED and reissues pending lookup when the view lane changes',()=>{
        const f=fixture();f.controller.start(request);const original=f.start();f.controller.setView({root:'omit'});
        expect(f.sent).toHaveLength(1);f.accepted(session);
        const view=f.sent.at(-1)!;expect(view.kind).toBe('SET_VIEW');expect(f.controller.getSnapshot().request).toEqual(session.request);
        f.complete(first,original);expect(f.controller.getSnapshot().page).toBeNull();
        const target=first.rows[5];f.controller.select(target.candidate.allocationId);const oldLookup=f.sent.at(-1)!;
        f.controller.setView({root:'any',open:'require'});const newLookup=f.sent.at(-1)!;
        expect(newLookup.kind).toBe('LOOKUP');expect(newLookup.viewRevision).toBeGreaterThan(oldLookup.viewRevision);
        f.send('LOOKUP_RESULT',{candidate:{...target,displayRank:null}},oldLookup);expect(f.controller.getSnapshot().selected).toBeNull();
        f.send('LOOKUP_RESULT',{candidate:{...target,displayRank:null}},newLookup);expect(f.controller.getSnapshot().selected?.candidate).toEqual(target.candidate);
        const scanMeta=f.sent.filter(message=>message.kind==='SET_VIEW').at(-1)!;
        f.complete(exact(session,{open:'require'}),scanMeta);expect(f.controller.getSnapshot().selected?.candidate).toEqual(target.candidate);f.controller.stop();
    });
    it('rejects malformed queued filters before worker acceptance without replacing the last valid view',()=>{
        const f=fixture();f.controller.start(request);f.controller.setView({position:{low:9,high:2}});
        expect(f.controller.getSnapshot()).toMatchObject({view:DEFAULT_ENGINE_VIEW,error:{code:'invalid-view'}});
        f.accepted(session);expect(f.sent).toHaveLength(1);f.complete(first);expect(f.controller.getSnapshot().error).toBeNull();f.controller.stop();
    });
    it('ignores late lookup after explicit card selection and old workers after StrictMode cleanup or retry',()=>{
        const f=fixture();f.controller.start(request);f.accepted(session);f.complete(first);
        f.controller.select(first.rows[5].candidate.allocationId);const lookup=f.sent.at(-1)!;
        f.controller.select(first.rows[2]);f.send('LOOKUP_RESULT',{candidate:first.rows[5]},lookup);
        f.send('ERROR',{diagnostic:{code:'invalid-request',message:'Old lookup unavailable.'},resume:'restart-required'},lookup);
        expect(f.controller.getSnapshot().selected).toEqual(first.rows[2]);
        expect(f.controller.getSnapshot().error).toBeNull();
        const old=f.ports[0],oldStart=f.start();f.controller.stop();f.controller.start({...request,requestEpoch:'retry'});
        expect(old.terminate).toHaveBeenCalled();expect(f.controller.getSnapshot().requestEpoch).toBe('retry');
        f.send('EXACT_PAGE',{broken:true},oldStart,old);expect(f.controller.getSnapshot().error).toBeNull();
        expect(f.controller.getSnapshot().phase).toBe('loading');f.controller.stop();
    });
    it('restores a changed cross-mode identity when enabled again without discarding its retained filters',()=>{
        const f=fixture();f.controller.start(request);f.accepted(session);f.complete(first);
        f.controller.select(first.rows[2]);f.controller.setView({open:'require'});f.controller.stop();
        f.controller.restoreRequestedId(first.rows[5].candidate.allocationId);f.controller.start({...request,requestEpoch:'mode-return'});
        const view=f.controller.getSnapshot().view;expect(view.open).toBe('require');
        f.send('ACCEPTED',{request:session.request,view,versions:ENGINE_VERSIONS},f.start());
        expect(f.sent.at(-1)).toMatchObject({kind:'LOOKUP',payload:{allocationId:first.rows[5].candidate.allocationId}});
        f.send('LOOKUP_RESULT',{candidate:first.rows[5]});expect(f.controller.getSnapshot().selected).toEqual(first.rows[5]);f.controller.stop();
    });
    it('handles pause/continue/cancel and unavailable workers without synchronous fallback',()=>{
        vi.useFakeTimers();try{
            const f=fixture();f.controller.start(request);f.accepted(session);
            f.send('PAUSED',{summary:partial,reason:'time-budget',resume:'live-checkpoint',elapsedMs:10000},f.start());
            expect(f.controller.getSnapshot().phase).toBe('paused');f.controller.continueSearch();expect(f.sent.at(-1)?.kind).toBe('CONTINUE');
            expect(f.controller.getSnapshot().phase).toBe('running');const scan=f.sent.at(-1)!;f.controller.cancel();
            expect(f.controller.getSnapshot().phase).toBe('cancelled');f.complete(first,scan);expect(f.controller.getSnapshot().page).toBeNull();
            vi.advanceTimersByTime(100);expect(f.ports[0].terminate).toHaveBeenCalled();f.controller.stop();
            const failed=createExplorationController(()=>{throw new Error('Worker unavailable');});failed.start(request);
            expect(failed.getSnapshot()).toMatchObject({phase:'error',page:null,error:{code:'worker-unavailable'}});failed.stop();
        }finally{vi.useRealTimers();}
    });
});
