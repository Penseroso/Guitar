// Reuse the recorded Chrome matrix's DOM actions and in-page timing endpoints.
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.tmp-engine-browsers');
export const playwright=createRequire(import.meta.url)(process.env.CHORD_PLAYWRIGHT_MODULE??'C:/Users/pense/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
export const base=process.env.CHORD_URL??'http://localhost:3004';
const prior=await readFile('scripts/engine-integration/product-ui-performance.mjs','utf8');
export const controls=prior.slice(prior.indexOf('function installMeasurement()'));
export const install=controls+'\ninstallMeasurement();installControls();';
export const stats=values=>{const s=[...values].sort((a,b)=>a-b);return{n:s.length,p50:s[Math.ceil(s.length*.5)-1]??null,p95:s[Math.ceil(s.length*.95)-1]??null,max:s.at(-1)??null};};
export async function cdpPage({endpoint='http://127.0.0.1:9333',existingTargetId=null,desktopViewport=true,initialUrl='about:blank',readyTitle=null}={}){
 const version=await(await fetch(endpoint+'/json/version')).json();
 const ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true});});
 let id=0,sessionId,targetId;const pending=new Map(),listeners=new Set();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}for(const fn of listeners)fn(m);});
 const send=(method,params={},session=sessionId)=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});ws.send(JSON.stringify({id:next,method,params,...(session?{sessionId:session}:{})}));});
 if(existingTargetId)targetId=existingTargetId;else ({targetId}=await send('Target.createTarget',{url:initialUrl},null));
 if(readyTitle){const began=Date.now();while((await send('Target.getTargetInfo',{targetId},null)).targetInfo.title!==readyTitle){if(Date.now()-began>10000)throw Error('Target did not finish before instrumentation');await new Promise(r=>setTimeout(r,25));}}
 ({sessionId}=await send('Target.attachToTarget',{targetId,flatten:true},null));
 await send('Runtime.enable');await send('Page.enable');if(desktopViewport)await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 return{version,send,evaluate,listeners,sessionId,close:async()=>{if(existingTargetId)await send('Target.detachFromTarget',{sessionId},null);else await send('Target.closeTarget',{targetId},null);ws.close();}};
}
