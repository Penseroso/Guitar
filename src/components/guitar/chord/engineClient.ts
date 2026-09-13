import { EngineError, diagnostic, type EngineDiagnostic } from '@/domain/chord/engine/errors';
import { messageBytes, MAX_MESSAGE_BYTES, parseOutput, RevisionGate, PageChunkAssembler, type InputMessage, type OutputMessage } from '@/domain/chord/engine/workerProtocol';

export interface EngineWorkerPort {
    postMessage:(message:unknown)=>void;terminate:()=>void;
    onmessage:((event:MessageEvent)=>void)|null;
    onerror:((event:ErrorEvent)=>void)|null;
    onmessageerror:((event:MessageEvent)=>void)|null;
}
interface ClientOptions {
    createWorker:()=>EngineWorkerPort;
    onMessage:(message:OutputMessage)=>void;
    onFailure:(error:EngineDiagnostic)=>void;
}
let clientSequence=0;

/** One worker and one bounded page assembly. A fresh request terminates prior work
 * immediately; ordinary page/view operations reuse the complete worker cache. */
export function createEngineClient(options:ClientOptions) {
    const clientId=++clientSequence,gate=new RevisionGate();
    let worker:EngineWorkerPort|null=null,requestRevision=0,viewRevision=1,operationId=0,sessionId='';
    let cancelled=false,disposed=false,cancelOperation:number|null=null,cancelTimer:ReturnType<typeof setTimeout>|undefined;
    const assembly=new PageChunkAssembler();
    function release(){if(cancelTimer)clearTimeout(cancelTimer);cancelTimer=undefined;cancelOperation=null;worker?.terminate();worker=null;assembly.reset();}
    function fail(value:unknown,code:EngineDiagnostic['code']='worker-failed'){
        release();if(!disposed)options.onFailure(value instanceof EngineError?diagnostic(value):{code,message:value instanceof Error?value.message:'Engine worker failed. Retry the search.'});
    }
    function connect(){
        const port=options.createWorker();worker=port;
        port.onerror=()=>{if(worker===port)fail(new EngineError('worker-failed','Engine worker stopped unexpectedly. Retry the search.'));};
        port.onmessageerror=()=>{if(worker===port)fail(new EngineError('transport-error','Engine response could not be decoded. Retry the search.'));};
        port.onmessage=event=>{
            if(worker!==port||disposed)return;
            try {
                const raw=event.data as OutputMessage;
                if(cancelled) {
                    if(raw?.kind==='CANCELLED'&&raw.operationId===cancelOperation&&raw.sessionId===sessionId
                        &&raw.requestRevision===requestRevision&&raw.viewRevision===viewRevision){parseOutput(raw);release();}
                    return;
                }
                if(!gate.accepts(raw))return;
                const message=parseOutput(raw);
                if(message.kind==='EXACT_PAGE') {
                    const complete=assembly.accept(message);
                    if(complete) {
                        options.onMessage({...message,payload:{page:complete,chunkIndex:0,chunkCount:1}});
                    }
                } else options.onMessage(message);
            }catch(value){fail(value,'transport-error');}
        };
    }
    function post(kind:InputMessage['kind'],payload:unknown,lane:'scan'|'lookup'|'details'|'control') {
        if(!worker||disposed||cancelled)throw new EngineError('worker-unavailable','Start or retry the engine session first.');
        const next=++operationId;
        const message={protocol:'engine-worker-v2',sessionId,requestRevision,viewRevision,operationId:next,kind,payload} as InputMessage;
        if(messageBytes(message)>MAX_MESSAGE_BYTES)throw new EngineError('transport-error','Engine request exceeds the message budget.');
        gate.expect(lane,next);if(lane==='scan')assembly.reset();
        worker.postMessage(message);return next;
    }
    return Object.freeze({
        start(intent:unknown,view:unknown={},pageSize=6){
            release();if(disposed)return;
            cancelled=false;requestRevision++;viewRevision=1;sessionId=`engine-${clientId}-${requestRevision}`;
            gate.reset(sessionId,requestRevision,viewRevision);
            try{connect();post('START',{intent,view,pageSize},'scan');}catch(value){fail(value,'worker-unavailable');}
        },
        setView(view:unknown,pageSize=6){
            viewRevision++;gate.reset(sessionId,requestRevision,viewRevision);
            try{return post('SET_VIEW',{view,pageSize},'scan');}catch(value){fail(value);}
        },
        page(after:unknown,pageSize=12){try{return post('PAGE',{after,pageSize},'scan');}catch(value){fail(value);}},
        lookup(allocationId:string){try{return post('LOOKUP',{allocationId},'lookup');}catch(value){fail(value);}},
        details(allocationId:string){try{return post('DETAILS',{allocationId},'details');}catch(value){fail(value);}},
        continue(uninterrupted=false){try{return post('CONTINUE',{uninterrupted},'scan');}catch(value){fail(value);}},
        cancel(){
            if(!worker||disposed||cancelled)return;
            try{cancelOperation=post('CANCEL',{},'control');cancelled=true;
                cancelTimer=setTimeout(()=>{if(cancelled)release();},100);
            }catch(value){fail(value);}
        },
        dispose(){disposed=true;release();},
    });
}
