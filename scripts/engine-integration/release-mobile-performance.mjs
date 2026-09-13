// External-device collector. Never invokes desktop emulation. Requires an
// operator-attested physical device and an already-open, explicitly named tab.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {cdpPage,base,install,stats} from './release-harness.mjs';
const device=JSON.parse(await readFile(process.env.MOBILE_DEVICE_RECORD,'utf8'));
for(const key of ['manufacturer','model','os','browser','thermalState','battery','operator','connection','build'])assert(typeof device[key]==='string'&&device[key].length>0&&!device[key].includes('REPLACE'),'Missing actual value for '+key);
assert.equal(device.physicalDevice,true,'An actual physical device is mandatory');
assert.equal(device.build,(await readFile('.next/BUILD_ID','utf8')).trim());
assert(process.env.MOBILE_TARGET_ID,'Select the physical browser tab explicitly');
const page=await cdpPage({endpoint:process.env.MOBILE_CDP??'http://127.0.0.1:9334',existingTargetId:process.env.MOBILE_TARGET_ID,desktopViewport:false});
const census=JSON.parse(await readFile('docs/implementation/product-policy-census.json')),samples=[],failures=[];
const out={schema:'physical-mobile-release-v1',device,build:device.build,browser:page.version.Browser,startedAt:new Date().toISOString(),state:'warm HTTP after setup; fresh worker for each root; no device-metrics or CPU emulation',samples,failures,complete:false};
const save=async()=>{
 out.aggregate=Object.fromEntries(['firstPageMs','nextPageMs','filterMs','cardSelectionMs'].map(k=>[k,stats(samples.flatMap(r=>r[k]===undefined?[]:[r[k]]))]));
 out.perRequest=census.rows.map(f=>{const rows=samples.filter(r=>r.root===f.root&&r.chordId===f.chordId&&r.context===f.context);return{root:f.root,chordId:f.chordId,context:f.context,...Object.fromEntries(['firstPageMs','nextPageMs','filterMs','cardSelectionMs'].map(k=>[k,stats(rows.flatMap(r=>r[k]===undefined?[]:[r[k]]))]))};});
 // Materialized-card selection remains diagnostic, separate from direct LOOKUP.
 out.violations=out.perRequest.filter(r=>r.firstPageMs.p95>5000||r.nextPageMs.p95>500||r.filterMs.p95>500);
 await writeFile(process.env.MOBILE_OUTPUT??'docs/implementation/release-performance-physical-mobile.json',JSON.stringify(out,null,2)+'\n');
};
try{
 await page.send('Page.addScriptToEvaluateOnNewDocument',{source:install});
 const loaded=new Promise(resolve=>{const listener=m=>{if(m.sessionId===page.sessionId&&m.method==='Page.loadEventFired'){page.listeners.delete(listener);resolve();}};page.listeners.add(listener);});
 await page.send('Page.navigate',{url:base});await loaded;
 out.environment=await page.evaluate('({ua:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,screen:[screen.width,screen.height],hardwareConcurrency:navigator.hardwareConcurrency})');
 assert(/Android|iPhone|iPad/.test(out.environment.ua),'Refuse a desktop UA');
 await page.evaluate('engineBenchControls.initialize()');
 const qualities=[...new Set(census.rows.map(r=>r.chordId))];
 for(const chordId of qualities)for(const context of ['standalone','accompaniment']){
  const fixtures=census.rows.filter(r=>r.chordId===chordId&&r.context===context).sort((a,b)=>a.root-b.root);
  const widest=[...fixtures].sort((a,b)=>b.counts.structural-a.counts.structural||a.root-b.root)[0].root;
  await page.evaluate('engineBenchControls.prepare('+JSON.stringify({chordId,context})+')');
  for(let run=0;run<30;run++)for(const f of fixtures){
   const sample=await page.evaluate('engineBenchControls.measure('+JSON.stringify({chordId,context,root:f.root,ancillary:f.root===widest})+')');
   for(const key of ['structural','pass','uncertain','reject'])assert.equal(sample[key],f.counts[key]);
   assert(sample.maxMessageBytes<=1048576&&sample.maxRenderedCards<=48&&sample.accountedBufferBytes<=33554432);
   samples.push({chordId,context,root:f.root,run,...sample});if(samples.length%100===0){await save();console.log(samples.length+'/14400');}
  }
 }
 assert.equal(samples.length,14400);out.complete=true;
 // These are main-target metrics, NOT total device/process/worker memory.
 await page.send('HeapProfiler.collectGarbage');out.mainTargetHeap=await page.send('Runtime.getHeapUsage');out.mainTargetDom=await page.send('Memory.getDOMCounters');
}catch(e){failures.push(String(e.stack??e));throw e;}finally{await save();await page.close();}
