import { expect,it,vi } from 'vitest';
import { createEngineClient,type EngineWorkerPort } from './engineClient';
import { EngineSession } from '@/domain/chord/engine/session';
import type { OutputMessage } from '@/domain/chord/engine/workerProtocol';

const intent={schema:'intent-v1',chordId:'major',rootPitchClass:0,instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,67,60,64,67],maxModeledFret:0}};
function fixture(){
    const sent:Record<string,unknown>[]=[],ports:EngineWorkerPort[]=[],messages:OutputMessage[]=[],failures:unknown[]=[];
    const client=createEngineClient({createWorker:()=>{const port={postMessage:vi.fn(message=>sent.push(message)),terminate:vi.fn(),onmessage:null,onerror:null,onmessageerror:null} as EngineWorkerPort;ports.push(port);return port;},
        onMessage:m=>messages.push(m),onFailure:e=>failures.push(e)});
    const reply=(kind:string,payload:unknown,meta=sent.at(-1)!)=>ports.at(-1)!.onmessage?.({data:{...meta,kind,payload}} as MessageEvent);
    return {sent,ports,messages,failures,client,reply};
}
function exact(){const s=new EngineSession(intent).begin({},6);while(!s.step()){}return s.finish();}
it('terminates old work immediately on new requests and drops old or corrupt stale messages',()=>{
    const f=fixture();f.client.start(intent);const old=f.ports[0],meta=f.sent[0];
    f.client.start(intent);expect(old.terminate).toHaveBeenCalledTimes(1);
    old.onmessage?.({data:{...meta,kind:'EXACT_PAGE',payload:{broken:true}}} as MessageEvent);
    f.reply('EXACT_PAGE',{broken:true},meta);
    expect(f.failures).toEqual([]);expect(f.messages).toEqual([]);
    f.reply('EXACT_PAGE',{page:exact(),chunkIndex:0,chunkCount:1});expect(f.messages).toHaveLength(1);
    f.client.dispose();expect(f.ports[1].terminate).toHaveBeenCalled();
});
it('keeps scan and lookup operations independent and assembles only the current bounded page',()=>{
    const f=fixture();f.client.start(intent);const scan=f.sent[0],page=exact();
    f.client.lookup(page.rows[0].candidate.allocationId);const lookup=f.sent.at(-1)!;
    f.reply('LOOKUP_RESULT',{candidate:{...page.rows[0],displayRank:null}},lookup);
    f.reply('EXACT_PAGE',{page:{...page,rows:page.rows.slice(0,3)},chunkIndex:0,chunkCount:2},scan);
    expect(f.messages).toHaveLength(1);
    f.reply('EXACT_PAGE',{page:{...page,rows:page.rows.slice(3)},chunkIndex:1,chunkCount:2},scan);
    expect(f.messages).toHaveLength(2);
    expect(f.messages.at(-1)?.payload).toMatchObject({page:{rows:page.rows}});
    f.client.setView({root:'omit'});f.reply('EXACT_PAGE',{broken:true},scan);
    expect(f.failures).toEqual([]);f.client.dispose();
});
it('reports current decode/schema failures and worker creation/crash failures without searching locally',()=>{
    const f=fixture();f.client.start(intent);f.reply('EXACT_PAGE',{broken:true});
    expect(f.failures).toHaveLength(1);expect(f.ports[0].terminate).toHaveBeenCalled();
    f.client.start(intent);f.ports[1].onerror?.({} as ErrorEvent);expect(f.failures).toHaveLength(2);
    const failure=vi.fn();const client=createEngineClient({createWorker:()=>{throw new Error('CSP');},onMessage:vi.fn(),onFailure:failure});
    client.start(intent);expect(failure).toHaveBeenCalledWith({code:'worker-unavailable',message:'CSP'});client.dispose();
});
it('marks cancellation locally and terminates at 100ms if acknowledgement never arrives',()=>{
    vi.useFakeTimers();try{
        const f=fixture();f.client.start(intent);const scan=f.sent[0];f.client.cancel();
        f.reply('EXACT_PAGE',{page:exact(),chunkIndex:0,chunkCount:1},scan);expect(f.messages).toEqual([]);
        vi.advanceTimersByTime(99);expect(f.ports[0].terminate).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);expect(f.ports[0].terminate).toHaveBeenCalledTimes(1);f.client.dispose();
        const acknowledged=fixture();acknowledged.client.start(intent);acknowledged.client.cancel();
        acknowledged.reply('CANCELLED',{resume:'restart-required'});expect(acknowledged.ports[0].terminate).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(100);expect(acknowledged.ports[0].terminate).toHaveBeenCalledTimes(1);acknowledged.client.dispose();
    }finally{vi.useRealTimers();}
});
