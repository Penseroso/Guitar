// Prepare (do not run) the existing bounded worker/lookup diagnostic for a
// physical Android Chrome tab. Original frozen script/evidence remain untouched.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
let source=await readFile('scripts/engine-integration/product-worker-cost.mjs','utf8');
const substitutions=[
 ["server.listen(0,'127.0.0.1',resolve)","server.listen(3005,'127.0.0.1',resolve)"],
 ["({targetId}=await send('Target.createTarget',{url:origin},null));","targetId=process.env.MOBILE_TARGET_ID;if(!targetId)throw Error('Explicit physical-device tab required');"],
 ["await send('Runtime.enable');\n    await send('Target.setAutoAttach'","await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:origin});\n    await send('Target.setAutoAttach'"],
 ["'docs/implementation/product-worker-cost.json'","'docs/implementation/release-physical-mobile-worker-cost.json'"],
 ["if(targetId)await send('Target.closeTarget',{targetId},null);","if(sessionId)await send('Target.detachFromTarget',{sessionId},null);"],
 ["No product rendering, synthesis, or representative physical-mobile measurements.","Physical-device worker diagnostic only; product rendering and synthesis are not measured here."],
];
for(const [from,to] of substitutions){assert.equal(source.split(from).length,2,'Frozen harness substitution must be unique: '+from);source=source.replace(from,to);}
source=source.replace("const bundle = async contents",`const deviceRecord=JSON.parse(await readFile(process.env.MOBILE_DEVICE_RECORD,'utf8'));assert.equal(deviceRecord.physicalDevice,true);assert(process.env.CHORD_CDP);assert.equal(deviceRecord.build,(await readFile('.next/BUILD_ID','utf8')).trim());\nconst bundle = async contents`);
source=source.replace("scope:'Actual DedicatedWorker","device:deviceRecord,scope:'Actual DedicatedWorker");
source=source.replace('sourceHashes:{},measurements:',"bundleHashes:Object.fromEntries(Object.entries(assets).map(([path,js])=>[path,createHash('sha256').update(js).digest('hex')])),sourceHashes:{},measurements:");
source=source.replace("await evaluate(`(${setupHarness.toString()})()`);","assert.match(await evaluate('navigator.userAgent'),/Android/,'Refuse a desktop user agent');await evaluate(`(${setupHarness.toString()})()`);");
await mkdir('.tmp-release-memory',{recursive:true});
await writeFile('.tmp-release-memory/physical-mobile-worker-cost.mjs',source);
console.log('Prepared .tmp-release-memory/physical-mobile-worker-cost.mjs; no device measurement performed.');
