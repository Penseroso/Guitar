// Bounded isolated browser worker cost/memory diagnostics. No product UI timing.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const bundle = async contents => (await build({ stdin: { contents, sourcefile: 'worker-cost.ts', loader: 'ts', resolveDir: process.cwd() }, bundle: true, write: false, platform: 'browser', target: 'es2020', format: 'iife', tsconfig: 'tsconfig.json' })).outputFiles[0].text;
const worker = budget => `import {createWorkerService} from './src/domain/chord/engine/workerService';const s=createWorkerService({send:m=>postMessage(m),${budget===0?'cacheBudgetBytes:0,':''}timeBudgetMs:10000});onmessage=e=>s.receive(e.data);`;
const assets = { '/compact.js': await bundle(worker()), '/replay.js': await bundle(worker(0)),
    '/client.js': await bundle("import {parseOutput,messageBytes} from './src/domain/chord/engine/workerProtocol';Object.assign(globalThis,{costParseOutput:parseOutput,costMessageBytes:messageBytes});") };
if(process.argv.includes('--prepare-only')){console.log('Worker cost bundles compile; no browser work executed.');process.exit(0);}
const server=createServer((req,res)=>{const js=assets[req.url];res.setHeader('Content-Type',js?'text/javascript':'text/html');res.end(js??'<!doctype html><title>Isolated engine worker costs</title><script src="/client.js"></script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const browserVersion=await(await fetch(`${process.env.CHORD_CDP??'http://127.0.0.1:9333'}/json/version`)).json();
const ws=new WebSocket(browserVersion.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let sequence=0,targetId,sessionId;const pending=new Map(),attachedWorkers=new Map();
ws.addEventListener('message',event=>{const message=JSON.parse(event.data),call=pending.get(message.id);if(call){pending.delete(message.id);if(message.error)call.reject(Error(JSON.stringify(message.error)));else call.resolve(message.result);}
    if(message.method==='Target.attachedToTarget'&&message.params.targetInfo.type==='worker')attachedWorkers.set(message.params.targetInfo.targetId,message.params);
    if(message.method==='Target.detachedFromTarget')for(const [key,value]of attachedWorkers)if(value.sessionId===message.params.sessionId)attachedWorkers.delete(key);
});
const send=(method,params={},session=sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}));});
const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
async function heap(targetSession){try{await send('HeapProfiler.enable',{},targetSession);await send('HeapProfiler.collectGarbage',{},targetSession);return{available:true,...await send('Runtime.getHeapUsage',{},targetSession)};}catch(error){return{available:false,error:String(error.message)};}}
async function workerSession(path){for(const entry of attachedWorkers.values()){const result=await send('Target.getTargetInfo',{targetId:entry.targetInfo.targetId},null);if(result.targetInfo.url===origin+path)return entry.sessionId;}
    const targets=await send('Target.getTargets',{},null);const target=targets.targetInfos.find(t=>t.type==='worker'&&t.url===origin+path);assert.ok(target,`Missing dedicated worker ${path}`);return(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;}
const evidence={schema:'engine-worker-cost-v1',measuredAt:new Date().toISOString(),browser:browserVersion.Browser,
    scope:'Actual DedicatedWorker request/response, main-thread parseOutput validation and post-GC CDP heaps. Dedicated-worker and harness-page heap values include runtime/bundle/instrumentation allocations; they are not exact engine-only heap attribution.',
    sourceHashes:{},measurements:[],memory:[],limits:['Lookup coverage is C major standalone and C dominant-11 accompaniment, 30 requests each; not all 480 requests.', 'Lookup elapsed time includes the main-thread production parseOutput validator and measurement JSON-byte accounting; arrival and parse durations are also recorded separately.', 'Memory stress is 100 completed small-domain query/context/view changes followed by a same-wide-request comparison. Two post-GC endpoints cannot prove absence of every leak.', 'Large fret-36 replay is measured at the truthful ten-second pause and then cancelled if it has not completed; no partial state is claimed exact.', 'No product rendering, synthesis, or representative physical-mobile measurements.'],passed:false};
const censusBytes=await readFile('docs/implementation/engine-integrated-census.json');
const widest=JSON.parse(censusBytes).rows.reduce((a,b)=>a.counts.structural>b.counts.structural?a:b);
assert.ok(widest.chordId==='dominant-11'&&widest.root===0&&widest.context==='accompaniment','Update cost fixture to the actual widest census request.');
evidence.widestDefaultFixture={chordId:widest.chordId,rootPitchClass:widest.root,context:widest.context,structuralCount:widest.counts.structural,censusSha256:createHash('sha256').update(censusBytes).digest('hex')};
for(const path of ['src/domain/chord/engine/packedStore.ts','src/domain/chord/engine/workerService.ts','src/domain/chord/engine/workerProtocol.ts','src/domain/chord/engine/session.ts'])evidence.sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');
try{
    ({targetId}=await send('Target.createTarget',{url:origin},null));({sessionId}=await send('Target.attachToTarget',{targetId,flatten:true},null));await send('Runtime.enable');
    await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true});
    await evaluate('new Promise((resolve,reject)=>{const began=performance.now();const poll=()=>{if(typeof costParseOutput==="function")resolve(true);else if(performance.now()-began>5000)reject(Error("Harness parser did not load"));else setTimeout(poll,10);};poll();})');
    await evaluate(`(${setupHarness.toString()})()`);
    await evaluate(`cost.startWorker('/compact.js')`);
    const mainBaseline=await heap(sessionId),compactSession=await workerSession('/compact.js');
    evidence.memory.push({scenario:'Initial compact worker/harness baseline',worker:await heap(compactSession),main:mainBaseline});
    for(const [chordId,context]of[['major','standalone'],['dominant-11','accompaniment']]){
        const result=await evaluate(`cost.queryAndLookup(${JSON.stringify(chordId)},${JSON.stringify(context)})`);evidence.measurements.push(result);
        evidence.memory.push({scenario:`${chordId} ${context} completed compact pool`,summary:result.summary,worker:await heap(compactSession),main:await heap(sessionId)});
        console.log(`${chordId}/${context}: ${result.lookup.samples.length} parsed lookup samples; p95 ${result.lookup.p95Ms.toFixed(2)} ms.`);
    }
    const before=evidence.memory.at(-1);
    const stress=await evaluate('cost.stress()');evidence.measurements.push(stress);
    const after={scenario:'Same C dominant-11 accompaniment after 100 query/context/view changes',summary:stress.summary,worker:await heap(compactSession),main:await heap(sessionId)};evidence.memory.push(after);
    if(before.worker.available&&after.worker.available)evidence.workerHeapDeltaAfter100Changes={usedSize:after.worker.usedSize-before.worker.usedSize,backingStorageSize:(after.worker.backingStorageSize??0)-(before.worker.backingStorageSize??0)};
    await evaluate(`cost.startWorker('/replay.js')`);const replaySession=await workerSession('/replay.js');
    const replay=await evaluate('cost.largeReplay()');evidence.measurements.push(replay);
    evidence.memory.push({scenario:'Fret-36 C dominant-11 accompaniment forced replay at completion or truthful pause',summary:replay.summary,worker:await heap(replaySession),main:await heap(sessionId)});
    const finish=await evaluate('cost.finish()');evidence.maximumMessageBytes=finish.maximumMessageBytes;evidence.protocolErrors=finish.errors;
    assert.ok(finish.maximumMessageBytes<=1048576);assert.deepEqual(finish.errors,[]);
    for(const m of evidence.memory)if(m.summary)assert.ok(m.summary.accountedBufferBytes<=64*1024*1024);
    evidence.passed=true;console.log('Worker memory/lifecycle diagnostics complete.');
}finally{
    await writeFile('docs/implementation/engine-worker-cost.json',JSON.stringify(evidence,null,2)+'\n');
    if(targetId)await send('Target.closeTarget',{targetId},null);ws.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}

function setupHarness(){
    let worker,revision=0,viewRevision=1,op=0,pending=null,last=null,maximumMessageBytes=0;const errors=[];
    const metric=samples=>{const sorted=samples.map(s=>s.elapsedMs).sort((a,b)=>a-b);return{samples,p50Ms:sorted[Math.ceil(sorted.length*.5)-1],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1)};};
    function request(kind,payload,terminal){
        const operationId=++op,started=performance.now();
        return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending=null;reject(Error('Worker operation timed out'));},20000);pending={operationId,started,terminal,resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}};
            worker.postMessage({protocol:'engine-worker-v1',sessionId:'cost',requestRevision:revision,viewRevision,operationId,kind,payload});});
    }
    async function startWorker(path){if(worker)worker.terminate();worker=new Worker(path);revision=0;viewRevision=1;op=0;last=null;
        worker.onmessage=event=>{const received=performance.now();try{const started=performance.now(),message=costParseOutput(event.data),parseMs=performance.now()-started;
            maximumMessageBytes=Math.max(maximumMessageBytes,costMessageBytes(message));if(!pending||message.operationId!==pending.operationId)return;
            if(message.kind==='ERROR'){errors.push(message.payload.diagnostic);const next=pending;pending=null;next.reject(Error(message.payload.diagnostic.message));return;}
            if(pending.terminal.includes(message.kind)){last=message;const next=pending;pending=null;next.resolve({message,elapsedMs:performance.now()-next.started,arrivalMs:received-next.started,parseMs});}
        }catch(error){errors.push(String(error));if(pending){const next=pending;pending=null;next.reject(error);}}};
        worker.onerror=event=>{errors.push(event.message);if(pending){const next=pending;pending=null;next.reject(Error(event.message));}};
        revision++;await request('START',{intent:{schema:'intent-v1',chordId:'major',rootPitchClass:0,instrument:{kind:'six-single-strings-12edo',tuningMidi:[64,59,55,50,45,40],maxModeledFret:0}},pageSize:6},['EXACT_PAGE']);
    }
    async function query(chordId,context,maxModeledFret=15){revision++;viewRevision=1;return request('START',{intent:{schema:'intent-v1',chordId,rootPitchClass:0,context,instrument:{kind:'six-single-strings-12edo',tuningMidi:[64,59,55,50,45,40],maxModeledFret}},pageSize:30},['EXACT_PAGE','PAUSED']);}
    async function queryAndLookup(chordId,context){const page=await query(chordId,context);if(page.message.kind!=='EXACT_PAGE')throw Error('Default fixture unexpectedly paused');const ids=page.message.payload.page.rows.map(r=>r.candidate.allocationId),summary=page.message.payload.page.summary,samples=[];
        if(ids.length!==30)throw Error('Fixture needs thirty distinct lookup IDs');
        for(const allocationId of ids){const result=await request('LOOKUP',{allocationId},['LOOKUP_RESULT']);const candidate=result.message.payload.candidate;
            if(candidate.candidate.allocationId!==allocationId||candidate.rank.ledger.length!==14||!candidate.physical.evidence.length)throw Error('Incomplete direct lookup');
            samples.push({allocationId,elapsedMs:result.elapsedMs,arrivalMs:result.arrivalMs,parseMs:result.parseMs,bytes:costMessageBytes(result.message)});}
        return{scenario:`${chordId} ${context} complete pool + 30 distinct direct lookups`,firstExactPageMs:page.elapsedMs,summary,lookup:metric(samples)};}
    async function stress(){const started=performance.now();for(let i=0;i<50;i++){await query(i%2?'major':'minor',i%3?'standalone':'accompaniment',3);viewRevision++;await request('SET_VIEW',{view:{open:i%2?'require':'exclude'},pageSize:6},['EXACT_PAGE']);}
        const final=await query('dominant-11','accompaniment');const summary=final.message.payload.page.summary;
        await request('LOOKUP',{allocationId:final.message.payload.page.rows[0].candidate.allocationId},['LOOKUP_RESULT']);
        return{scenario:'50 complete small-domain query/context changes plus 50 exact view changes, then same wide request and one retained lookup snapshot',changes:100,elapsedMs:performance.now()-started,summary};}
    async function largeReplay(){const result=await query('dominant-11','accompaniment',36);return{scenario:'Large fret-36 replay memory fixture',elapsedMs:result.elapsedMs,state:result.message.kind,summary:result.message.kind==='PAUSED'?result.message.payload.summary:result.message.payload.page.summary};}
    async function finish(){if(last?.kind==='PAUSED')await request('CANCEL',{},['CANCELLED']);worker.terminate();worker=null;last=null;return{maximumMessageBytes,errors};}
    globalThis.cost={startWorker,queryAndLookup,stress,largeReplay,finish};
}
