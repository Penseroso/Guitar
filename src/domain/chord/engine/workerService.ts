import { EngineSession, type ExactPage, type PageScan } from './session';
import { EngineError, diagnostic } from './errors';
import { createViewMatcher } from './view';
import { ENGINE_VERSIONS } from './versions';
import { MAX_MESSAGE_BYTES, messageBytes, parseInput, type InputMessage, type OutputMessage } from './workerProtocol';

type Meta=Pick<InputMessage,'protocol'|'sessionId'|'requestRevision'|'viewRevision'|'operationId'>;
interface ActiveScan {
    scan:PageScan;meta:Meta;token:number;paused:boolean;uninterrupted:boolean;
    elapsedMs:number;lastProgress:number;
}
export interface WorkerServiceOptions {
    send:(message:OutputMessage)=>void;
    now?:()=>number;
    yieldTask?:()=>Promise<void>;
    cacheBudgetBytes?:number;
    timeBudgetMs?:number;
}

/** Browser lifecycle adapter. No synchronous main-thread or legacy search fallback.
 * A single loop yields worker tasks; lookup/details may interleave without cancelling it. */
export function createWorkerService(options:WorkerServiceOptions) {
    const now=options.now??(()=>performance.now());
    const task=options.yieldTask??(()=>new Promise<void>(resolve=>setTimeout(resolve,0)));
    const budget=options.timeBudgetMs??10000;
    let session:EngineSession|null=null,scope:Meta|null=null,active:ActiveScan|null=null;
    let viewInput:unknown={},generation=0;
    const latest={scan:0,lookup:0,details:0,control:0};
    function send(meta:Meta,kind:OutputMessage['kind'],payload:unknown) {
        const output={...meta,kind,payload} as OutputMessage;
        if(messageBytes(output)>MAX_MESSAGE_BYTES)throw new EngineError('transport-error','Worker output exceeds the bounded message contract.');
        options.send(output);
    }
    function error(meta:Meta,value:unknown) {
        const detail=diagnostic(value);
        send(meta,'ERROR',{diagnostic:{...detail,message:detail.message.slice(0,2000),...(detail.field?{field:detail.field.slice(0,200)}:{})},resume:'restart-required'});
    }
    function metaOf(message:InputMessage):Meta {
        const {protocol,sessionId,requestRevision,viewRevision,operationId}=message;
        return {protocol,sessionId,requestRevision,viewRevision,operationId};
    }
    function current(op:ActiveScan){return active===op&&op.token===generation&&session!==null;}
    function supersede(){generation++;if(active){session?.cancel();active=null;}}
    async function sendPage(meta:Meta,page:ExactPage,op:ActiveScan) {
        // Partition by actual serialized bytes; no row drops or smaller-success page.
        const chunks:ExactPage['rows'][]=[];let pending:ExactPage['rows'][number][]=[];
        let packingSlice=now();
        for(const row of page.rows) {
            const proposal=[...pending,row];
            const test={...meta,kind:'EXACT_PAGE',payload:{page:{...page,rows:proposal},chunkIndex:127,chunkCount:128}};
            if(messageBytes(test)>MAX_MESSAGE_BYTES) {
                if(!pending.length)throw new EngineError('transport-error','One candidate exceeds the output budget.');
                chunks.push(pending);pending=[row];
            } else pending=proposal;
            if(now()-packingSlice>=8){await task();if(!current(op))return;packingSlice=now();}
        }
        if(pending.length||!chunks.length)chunks.push(pending);
        for(let i=0;i<chunks.length;i++) {
            if(!current(op))return;
            send(meta,'EXACT_PAGE',{page:{...page,rows:chunks[i]},chunkIndex:i,chunkCount:chunks.length});
            // At most one page chunk is queued between worker task boundaries.
            if(i+1<chunks.length)await task();
        }
    }
    async function run(op:ActiveScan) {
        const started=now(),previousElapsed=op.elapsedMs;
        try {
            while(current(op)) {
                const sliceStart=now();let done=false;
                do {done=op.scan.step(256);}while(!done&&now()-sliceStart<8);
                op.elapsedMs=previousElapsed+now()-started;
                if(done) {
                    const page=await op.scan.finishAsync(async()=>{await task();if(!current(op))throw new Error('superseded');},now);
                    if(!current(op))return;
                    await sendPage(op.meta,page,op);
                    if(current(op))active=null;
                    return;
                }
                if(!op.uninterrupted&&now()-started>=budget) {
                    op.paused=true;
                    send(op.meta,'PAUSED',{summary:op.scan.summary(),reason:'time-budget',resume:'live-checkpoint',elapsedMs:op.elapsedMs});
                    return;
                }
                if(now()-op.lastProgress>=250) {
                    op.lastProgress=now();send(op.meta,'PROGRESS',{summary:op.scan.summary(),elapsedMs:op.elapsedMs});
                }
                await task();
            }
        } catch(value) {if(current(op)){active=null;session?.cancel();error(op.meta,value);}}
    }
    function begin(meta:Meta,pageSize=6,after:unknown=null,uninterrupted=false) {
        if(!session)throw new EngineError('worker-failed','No active engine session.');
        supersede();
        const scan=session.begin(viewInput,pageSize,after);
        const op:ActiveScan={scan,meta,token:generation,paused:false,uninterrupted,elapsedMs:0,lastProgress:now()};
        active=op;
        send(meta,'PROGRESS',{summary:scan.summary(),elapsedMs:0});
        // Begin on a task boundary so ACCEPTED and cancellation can be processed first.
        void task().then(()=>{if(current(op))return run(op);}).catch(value=>{if(current(op))error(meta,value);});
    }
    function receive(input:unknown):void {
        let message:InputMessage;
        try{message=parseInput(input);}catch(value){
            const raw=input as Partial<Meta>|null;
            const fallback:Meta={protocol:'engine-worker-v1',sessionId:typeof raw?.sessionId==='string'&&raw.sessionId?raw.sessionId:'invalid',
                requestRevision:Number.isSafeInteger(raw?.requestRevision)&&raw!.requestRevision!>0?raw!.requestRevision!:1,
                viewRevision:Number.isSafeInteger(raw?.viewRevision)&&raw!.viewRevision!>0?raw!.viewRevision!:1,
                operationId:Number.isSafeInteger(raw?.operationId)&&raw!.operationId!>0?raw!.operationId!:1};
            error(fallback,value);return;
        }
        const meta=metaOf(message);
        try {
            if(message.kind==='START') {
                if(scope&&meta.requestRevision<=scope.requestRevision)return;
                supersede();session?.dispose();session=null;
                scope=meta;for(const key of Object.keys(latest) as (keyof typeof latest)[])latest[key]=0;
                latest.scan=meta.operationId;
                session=new EngineSession(message.payload.intent,{cacheBudgetBytes:options.cacheBudgetBytes});
                viewInput=message.payload.view??{};
                const view=createViewMatcher(session.request,viewInput).view;
                send(meta,'ACCEPTED',{request:session.request,view,versions:ENGINE_VERSIONS});
                begin(meta,message.payload.pageSize??6,null,message.payload.uninterrupted??false);return;
            }
            if(!scope||!session||meta.sessionId!==scope.sessionId||meta.requestRevision!==scope.requestRevision)return;
            if(message.kind==='SET_VIEW') {
                if(meta.viewRevision<=scope.viewRevision||meta.operationId<=latest.scan)return;
                const validated=createViewMatcher(session.request,message.payload.view);
                scope=meta;latest.scan=meta.operationId;viewInput=validated.view;
                begin(meta,message.payload.pageSize??6);return;
            }
            if(meta.viewRevision!==scope.viewRevision)return;
            if(message.kind==='PAGE') {
                if(meta.operationId<=latest.scan)return;latest.scan=meta.operationId;
                begin(meta,message.payload.pageSize,message.payload.after);return;
            }
            if(message.kind==='LOOKUP'||message.kind==='DETAILS') {
                const lane=message.kind==='LOOKUP'?'lookup':'details';
                if(meta.operationId<=latest[lane])return;latest[lane]=meta.operationId;
                send(meta,message.kind==='LOOKUP'?'LOOKUP_RESULT':'DETAILS_RESULT',{candidate:session.lookup(message.payload.allocationId)});return;
            }
            if(message.kind==='CONTINUE') {
                if(!active?.paused)throw new EngineError('invalid-request','No paused computation is available; restart the page.');
                if(meta.operationId<=latest.scan)return;latest.scan=meta.operationId;
                active.meta=meta;active.paused=false;active.uninterrupted=message.payload.uninterrupted??active.uninterrupted;
                const op=active;void task().then(()=>run(op));return;
            }
            if(meta.operationId<=latest.control)return;latest.control=meta.operationId;
            const summary=active?.scan.summary();
            supersede();
            if(message.kind==='DISPOSE'){session.dispose();session=null;scope=null;}
            send(meta,'CANCELLED',{...(summary?{summary:{...summary,completeness:'partial',hasMore:'unknown'}}:{}),resume:'restart-required'});
        } catch(value){error(meta,value);}
    }
    return Object.freeze({receive,dispose(){supersede();session?.dispose();session=null;scope=null;},
        diagnostics(){return {hasSession:!!session,paused:!!active?.paused,retainedBufferBytes:session?.store.retainedBytes??0};}});
}
