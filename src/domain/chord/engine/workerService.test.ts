import { expect,it } from 'vitest';
import { createWorkerService } from './workerService';
import { parseOutput, MAX_MESSAGE_BYTES, messageBytes, PageChunkAssembler, type OutputMessage } from './workerProtocol';
import { EngineSession } from './session';
import { allocationId } from './identity';

const small={schema:'intent-v1',chordId:'major',rootPitchClass:0,instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,67,60,64,67],maxModeledFret:1}};
const wide={schema:'intent-v1',chordId:'dominant-11',rootPitchClass:0,context:'accompaniment'};
function harness(timeBudgetMs=10000) {
    let clock=0;
    const messages:OutputMessage[]=[],tasks:(()=>void)[]=[];
    const service=createWorkerService({send:message=>{expect(messageBytes(message)).toBeLessThanOrEqual(MAX_MESSAGE_BYTES);messages.push(parseOutput(message));},
        now:()=>++clock,yieldTask:()=>new Promise<void>(resolve=>tasks.push(resolve)),timeBudgetMs});
    const send=(kind:string,payload:unknown={},operationId=1,viewRevision=1,requestRevision=1,sessionId='test')=>service.receive({protocol:'engine-worker-v1',sessionId,requestRevision,viewRevision,operationId,kind,payload});
    async function pump(until:()=>boolean) {
        for(let i=0;i<20000&&!until();i++){tasks.shift()?.();await Promise.resolve();await Promise.resolve();}
        expect(until()).toBe(true);
    }
    return {service,messages,send,pump,tasks};
}
it('acknowledges before running, yields tasks, and returns exact bounded pages with separate lookup',async()=>{
    const h=harness();h.send('START',{intent:small});
    expect(h.messages.map(m=>m.kind)).toEqual(['ACCEPTED','PROGRESS']);
    expect(h.messages[1].payload).toMatchObject({summary:{completeness:'partial',hasMore:'unknown',structural:0}});
    const id=allocationId([60,64,67,60,64,67],[0,0,0,0,0,0]);
    h.send('LOOKUP',{allocationId:id},2);
    expect(h.messages.at(-1)?.kind).toBe('LOOKUP_RESULT');
    await h.pump(()=>h.messages.some(m=>m.kind==='EXACT_PAGE'));
    const page=h.messages.find(m=>m.kind==='EXACT_PAGE')!;
    if(page.kind!=='EXACT_PAGE')throw new Error('test');
    expect(page.payload.page.rows).toHaveLength(6);
    expect(page.payload.page.summary.completeness).toBe('exact');
    h.send('PAGE',{pageSize:12,after:page.payload.page.nextCursor},3);
    await h.pump(()=>h.messages.some(m=>m.kind==='EXACT_PAGE'&&m.operationId===3));
    const next=h.messages.find(m=>m.kind==='EXACT_PAGE'&&m.operationId===3)!;
    if(next.kind!=='EXACT_PAGE')throw new Error('test');
    expect(next.payload.page.rows[0].displayRank).toBe(7);
    expect(h.messages.filter(m=>m.kind==='PROGRESS'&&m.operationId===1).length).toBeLessThanOrEqual(2);
    h.service.dispose();expect(h.service.diagnostics().retainedBufferBytes).toBe(0);
});
it('pauses without exact-empty claims and continues the same accumulator to the identical page',async()=>{
    const h=harness(1);h.send('START',{intent:wide});
    await h.pump(()=>h.messages.some(m=>m.kind==='PAUSED'));
    const paused=h.messages.find(m=>m.kind==='PAUSED')!;
    expect(paused.payload).toMatchObject({summary:{completeness:'partial',hasMore:'unknown'},resume:'live-checkpoint'});
    expect(h.service.diagnostics().paused).toBe(true);
    h.send('CONTINUE',{uninterrupted:true},2);
    await h.pump(()=>h.messages.some(m=>m.kind==='EXACT_PAGE'&&m.operationId===2));
    const exact=h.messages.find(m=>m.kind==='EXACT_PAGE'&&m.operationId===2)!;
    if(exact.kind!=='EXACT_PAGE')throw new Error('test');
    expect(exact.payload.page.summary.structural).toBe(267524);
    const reference=new EngineSession(wide,{cacheBudgetBytes:0}).begin();while(!reference.step()){}
    expect(exact.payload.page.rows).toEqual(reference.finish().rows);
    h.service.dispose();
});
it('ignores superseded requests/views and cancels before queued work can publish late results',async()=>{
    const h=harness();h.send('START',{intent:wide});
    h.send('START',{intent:small},2,1,2,'new');
    h.send('START',{intent:wide},1,1,1,'test');
    await h.pump(()=>h.messages.some(m=>m.kind==='EXACT_PAGE'));
    expect(h.messages.filter(m=>m.kind==='EXACT_PAGE').every(m=>m.requestRevision===2)).toBe(true);
    h.send('SET_VIEW',{view:{root:'omit'}},3,2,2,'new');
    h.send('SET_VIEW',{view:{}},2,1,2,'new');
    await h.pump(()=>h.messages.some(m=>m.kind==='EXACT_PAGE'&&m.operationId===3));
    const empty=h.messages.find(m=>m.kind==='EXACT_PAGE'&&m.operationId===3)!;
    expect(empty.payload).toMatchObject({page:{outcome:'no-matches',summary:{matching:0}}});
    h.send('START',{intent:wide},4,1,3,'third');h.send('CANCEL',{},5,1,3,'third');
    expect(h.messages.at(-1)?.kind).toBe('CANCELLED');
    const n=h.messages.length;
    for(let i=0;i<10;i++){h.tasks.shift()?.();await Promise.resolve();}
    expect(h.messages.slice(n).some(m=>m.kind==='EXACT_PAGE')).toBe(false);
    h.send('CONTINUE',{},6,1,3,'third');expect(h.messages.at(-1)?.kind).toBe('ERROR');
    h.send('DISPOSE',{},7,1,3,'third');expect(h.service.diagnostics()).toEqual({hasSession:false,paused:false,retainedBufferBytes:0});
});
it('returns structured errors for corrupt schema and unsupported intent with no hidden fallback',()=>{
    const h=harness();h.send('START',{intent:{...small,chordId:'not-a-chord'}});
    expect(h.messages.at(-1)?.payload).toMatchObject({diagnostic:{code:'unsupported-request'},resume:'restart-required'});
    h.service.receive({protocol:'broken'});
    expect(h.messages.at(-1)?.kind).toBe('ERROR');
    expect(h.service.diagnostics().hasSession).toBe(false);
    h.service.dispose();
});
it('transports a maximum-size API page in bounded chunks without losing records',async()=>{
    const h=harness();h.send('START',{intent:{schema:'intent-v1',chordId:'major',rootPitchClass:0},pageSize:128});
    await h.pump(()=>h.messages.some(m=>m.kind==='EXACT_PAGE'&&m.payload.chunkIndex===m.payload.chunkCount-1));
    const assembler=new PageChunkAssembler();let page=null;
    for(const message of h.messages)if(message.kind==='EXACT_PAGE')page=assembler.accept(message);
    expect(page?.rows).toHaveLength(128);expect(new Set(page?.rows.map(r=>r.candidate.allocationId)).size).toBe(128);
    expect(page?.rows.at(-1)?.displayRank).toBe(128);h.service.dispose();
});
