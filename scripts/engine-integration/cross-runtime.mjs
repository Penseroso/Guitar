// Isolated numeric/order conformance. This is not a product/mobile performance benchmark.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { createContext, runInContext } from 'node:vm';
import { createRequire } from 'node:module';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { platform, release } from 'node:os';

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.tmp-engine-browsers');
const require = createRequire(import.meta.url);
const playwright = require(process.env.CHORD_PLAYWRIGHT_MODULE ?? 'C:/Users/pense/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source = String.raw`
import { EngineSession } from './src/domain/chord/engine/session';
import { StructuralIterator } from './src/domain/chord/engine/structuralGenerator';
import { createClassicProjector } from './src/domain/chord/engine/classicFeatures';
import { PackedStore } from './src/domain/chord/engine/packedStore';
import { PageHeap } from './src/domain/chord/engine/pageHeap';
import { createGeometry } from './src/domain/chord/engine/geometry';
import { createPhysicalScreen } from './src/domain/chord/engine/physical';
import { compilePhysicalProfile, compileRequest } from './src/domain/chord/engine/requestPolicy';
import { compareRank, rankingLedger, scoreFeatures } from './src/domain/chord/engine/deterministicRanking';
import { ENGINE_VERSIONS } from './src/domain/chord/engine/versions';
const verify=(condition,message)=>{if(!condition)throw Error(message);};
const equal=(a,b,message)=>verify(JSON.stringify(a)===JSON.stringify(b),message);
export function profile(label){
  const clock=()=>performance.now(),started=clock(),cost={setupMs:0,enumerationMs:0,assessmentMs:0,featuresAndScoreMs:0,packingMs:0,heapMs:0};
  const intent={schema:'intent-v1',chordId:'major',rootPitchClass:0};let t=clock();
  const request=compileRequest(intent),iterator=new StructuralIterator(request.structural),screen=createPhysicalScreen(request.physicalProfile),project=createClassicProjector(request,screen.geometry),store=new PackedStore(),heap=new PageHeap(6,compareRank);
  cost.setupMs=clock()-t;let visitedNodes=0,batches=0;
  for(;;){t=clock();const batch=iterator.nextBatch(256);cost.enumerationMs+=clock()-t;visitedNodes=batch.visitedNodes;batches++;
    t=clock();const assessments=batch.candidates.map(states=>screen.metrics(states));cost.assessmentMs+=clock()-t;
    t=clock();const scores=batch.candidates.map(states=>scoreFeatures(project(states)));cost.featuresAndScoreMs+=clock()-t;
    t=clock();batch.candidates.forEach((states,i)=>store.append(states,assessments[i],scores[i]));cost.packingMs+=clock()-t;
    t=clock();batch.candidates.forEach((tie,i)=>heap.offer({tie,scoreNumerator:scores[i]}));cost.heapMs+=clock()-t;
    if(batch.done)break;
  }
  const manualScanWallMs=clock()-started,session=new EngineSession(intent),top=heap.sorted();
  t=clock();const rich=top.map(row=>session.lookup('shape-v1:'+request.structural.instrument.tuningMidi.join(',')+':'+row.tie.join(',')));const richMaterializeMs=clock()-t;
  t=clock();const json=JSON.stringify(rich),bytes=new TextEncoder().encode(json).byteLength;const jsonEncodeMs=clock()-t;
  t=clock();const decoded=JSON.parse(json);const jsonDecodeMs=clock()-t;
  t=clock();const cloned=structuredClone(rich);const structuredCloneMs=clock()-t;equal(decoded,cloned,'Snapshot roundtrip');
  t=clock();const scan=session.begin({},6);while(!scan.step()){}const exact=scan.finish();
  equal(rich.map(r=>r.candidate.allocationId),exact.rows.map(r=>r.candidate.allocationId),'Instrumented top IDs vs normal session');
  verify(store.count===session.store.count,'Instrumented count vs normal session');
  for(let i=0;i<store.count;i++)equal(store.read(i),session.store.read(i),'Instrumented full compact row equality');
  const validationMs=clock()-t;session.dispose();const count=store.count,retainedBytes=store.retainedBytes;store.discard();
  return {label,intent,structuralCount:count,visitedNodes,batches,cost,manualScanWallMs,richMaterializeMs,jsonEncodeMs,jsonDecodeMs,structuredCloneMs,richPageBytes:bytes,retainedBytes,validationMs,
    note:'One C-major standard-domain fixture, per-batch timers and intermediate arrays add instrumentation overhead. Local structuredClone/JSON decode are not cross-thread transport or UI render. Cold means first engine fixture in this new worker; warm means immediate repeated fixture. Not a percentile or rollout-performance gate.'};
}
function pageAll(intent,view,cacheBudgetBytes,sizes){
  const session=new EngineSession(intent,{cacheBudgetBytes});let after=null,rows=[],summary,lastKey=null,pages=0;
  for(;;){const scan=session.begin(view,sizes[pages%sizes.length],after);while(!scan.step()){}
    const page=scan.finish();pages++;summary=page.summary;
    for(const row of page.rows){verify(row.rank.ledger.reduce((n,t)=>n+t.numerator,0)===row.rank.scoreNumerator,'Ledger sum');
      if(lastKey)verify(compareRank(lastKey,row.rank)<0,'Strict classic page order');lastKey=row.rank;
      rows.push({id:row.candidate.allocationId,requestKey:row.candidate.requestKey,rank:row.rank,physical:row.physical,facts:row.facts,displayRank:row.displayRank});}
    if(!summary.hasMore)break;verify(page.nextCursor,'Exact hasMore cursor');after=page.nextCursor;
    verify(pages<1000,'Conformance fixture unexpectedly exceeds paging limit');
  }
  verify(summary.completeness==='exact','Exact completion');verify(rows.length===summary.matching,'Complete matching set');
  verify(new Set(rows.map(r=>r.id)).size===rows.length,'Duplicate across pages');
  const result={requestKey:summary.requestKey,profileKey:summary.profileKey,viewKey:summary.viewKey,
    counts:{structural:summary.structural,pass:summary.pass,uncertain:summary.uncertain,reject:summary.reject,survivors:summary.survivors,matching:summary.matching,matchingPass:summary.matchingPass,matchingUncertain:summary.matchingUncertain},rows};
  session.dispose();return result;
}
export function run(){
  const tunings=[[64,59,55,50,45,40],[60,67,55,62,45,40]],cases=[];
  for(const chordId of ['major','major-7','dominant-11','diminished-7','power-5'])for(const rootPitchClass of [0,7])for(const tuningMidi of tunings){
    const intent={schema:'intent-v1',chordId,rootPitchClass,context:'accompaniment',instrument:{kind:'six-single-strings-12edo',tuningMidi,maxModeledFret:3}};
    const view={};const compact=pageAll(intent,view,33554432,[6,12,7]),replay=pageAll(intent,view,0,[7,6,12]);
    equal(compact,replay,'Cached/replay or page-size disagreement');cases.push({name:chordId+':'+rootPitchClass+':'+tuningMidi.join(','),...compact});
  }
  for(const [name,extra,view] of [
    ['uncertain-profile',{physical:{scope:'restricted-or-personalized'}},{statuses:['UNCERTAIN']}],
    ['explicit-slash',{slashBassPitchClass:4},{}],
    ['stopped-range',{}, {position:{low:1,high:3}}],
    ['no-matches',{}, {soundingCount:2}],
    ['high-position',{instrument:{kind:'six-single-strings-12edo',tuningMidi:tunings[0],maxModeledFret:36},fretDomains:Array.from({length:6},()=>[24,25,26,35,36])},{}]]){
    const intent={schema:'intent-v1',chordId:'major',rootPitchClass:0,instrument:{kind:'six-single-strings-12edo',tuningMidi:tunings[0],maxModeledFret:3},...extra};
    const compact=pageAll(intent,view,33554432,[6,12]),replay=pageAll(intent,view,0,[128]);equal(compact,replay,name+' replay equality');cases.push({name,...compact});
  }
  const geometry=[1,647700,650000,2000000].map(scale=>{const g=createGeometry(scale);return {scale,values:Array.from({length:37},(_,lo)=>Array.from({length:37},(_,hi)=>g.span(lo,hi)))};});
  const features={version:'legacy-rank-features-v1',spanUm:0,wholeFretGroups:1,largestBarreContacts:0,diagonalPattern:false,adjacentInternalGaps:0,isolatedInternalGaps:0,openFlankedIsolatedGaps:0,maxStoppedFret:5,openCount:0,soundingCount:3,rootPresent:true,rootHint:'absent',rootBass:true,representativeBassString:5,hasExplicitSlash:false,optionalCoveredCount:0,legacyTechnique:'Standard',unplayedCoreStringCount:0};
  const thresholds=[0,39999,40000,40001,94999,95000,95001,180000,2000000].map(spanUm=>{const f={...features,spanUm};return {spanUm,score:scoreFeatures(f),ledger:rankingLedger(f)};});
  const ties=[[0,8,9,10,-1,-1],[-1,12,0,3,2,1],[0,8,9,10,-1,0],[0,8,9,9,36,36]].map(tie=>({scoreNumerator:123,tie})).sort(compareRank);
  const physical=[];
  for(const states of [[0,0,0,0,0,0],[1,2,3,4,5,6],[1,-1,10,-1,15,36],[1,1,1,1,1,1]]){
    const span=createGeometry(647700).stoppedSpan(states);
    for(const warningSpanUm of [Math.max(0,span-1),span,span+1])for(const allowedThumb of [false,true]){
      const profile=compilePhysicalProfile({warningSpanUm,severeSpanUm:Math.max(180000,warningSpanUm),allowedThumb});
      physical.push({states,warningSpanUm,allowedThumb,result:createPhysicalScreen(profile).metrics(states)});
    }
  }
  const crossingSession=new EngineSession({schema:'intent-v1',chordId:'major',rootPitchClass:0});
  const crossing=crossingSession.lookup('shape-v1:64,59,55,50,45,40:0,8,9,10,-1,-1');crossingSession.dispose();
  return {versions:ENGINE_VERSIONS,cases,geometry,thresholds,ties,physical,crossing};
}`;
const bundled = (await build({ stdin: { contents: source, sourcefile: 'runtime-conformance.ts', loader: 'ts', resolveDir: process.cwd() }, bundle: true,
    write: false, format: 'iife', globalName: 'conformance', platform: 'browser', target: 'es2020', tsconfig: 'tsconfig.json' })).outputFiles[0].text;
if (process.argv.includes('--prepare-only')) { console.log('Cross-runtime fixture bundle compiles. No conformance or timings executed.');process.exit(0); }
const workerSource = bundled + '\nonmessage=()=>{try{const diagnostics=[conformance.profile("cold"),conformance.profile("warm")];postMessage({ok:true,result:conformance.run(),diagnostics});}catch(error){postMessage({ok:false,error:String(error.stack||error)});}};';
const context = createContext({ TextEncoder, performance });
runInContext(bundled, context);
const nodeResult = runInContext('conformance.run()', context);
const canonicalResult = JSON.stringify(nodeResult), hash = value => createHash('sha256').update(value).digest('hex');
const server = createServer((req, res) => { res.setHeader('Content-Type', req.url === '/worker.js' ? 'text/javascript' : 'text/html');res.end(req.url === '/worker.js' ? workerSource : '<!doctype html><title>Engine runtime conformance</title>'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let priorEvidence;
try { priorEvidence = JSON.parse(await readFile('docs/implementation/engine-cross-runtime.json', 'utf8')); } catch { /* First evidence run. */ }
const evidence = { schema: 'engine-cross-runtime-v1', measuredAt: new Date().toISOString(), os: `${platform()} ${release()}`, node: process.version,
    scope: 'Deterministic domain conformance in real desktop browser DedicatedWorkers; no product render/audio or physical mobile performance claim.',
    timingConditions: process.env.CHORD_TIMING_CONTEXT ?? 'Uncontrolled desktop load; component timings are diagnostic only. Zero means below the exposed browser clock resolution, not zero execution cost.',
    bundleSha256: hash(bundled), resultSha256: hash(canonicalResult), resultBytes: Buffer.byteLength(canonicalResult), caseCount: nodeResult.cases.length,
    totalRows: nodeResult.cases.reduce((n,c) => n + c.rows.length, 0), sourceHashes: {}, browsers: [], allPassed: false,
    priorRuns: [...(priorEvidence?.priorRuns ?? []), ...(priorEvidence ? [{ measuredAt: priorEvidence.measuredAt, bundleSha256: priorEvidence.bundleSha256,
        resultSha256: priorEvidence.resultSha256, sourceHashes: priorEvidence.sourceHashes, timingConditions: priorEvidence.timingConditions,
        browsers: priorEvidence.browsers, allPassed: priorEvidence.allPassed }] : [])] };
if (process.env.CHORD_EXPECT_RESULT_SHA256) assert.equal(evidence.resultSha256, process.env.CHORD_EXPECT_RESULT_SHA256, 'Domain result changed from the required baseline digest.');
for (const name of (await readdir('src/domain/chord/engine')).filter(n => n.endsWith('.ts') && !n.endsWith('.test.ts'))) evidence.sourceHashes[name] = hash(await readFile(`src/domain/chord/engine/${name}`));
try {
    for (const [name, type, launch] of [
        ['Chrome', playwright.chromium, { executablePath: process.env.CHORD_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' }],
        ['Firefox', playwright.firefox, {}], ['WebKit', playwright.webkit, {}]]) {
        let browser;
        try {
            browser = await type.launch({ headless: true, ...launch });
            const page = await browser.newPage();await page.goto(origin);
            const result = await page.evaluate(() => new Promise((resolve, reject) => {
                const worker = new Worker('/worker.js');const timeout = setTimeout(() => {worker.terminate();reject(Error('Conformance timed out'));}, 120000);
                worker.onmessage = event => {clearTimeout(timeout);worker.terminate();if (event.data.ok) resolve(event.data);else reject(Error(event.data.error));};
                worker.onerror = event => {clearTimeout(timeout);worker.terminate();reject(Error(event.message));};worker.postMessage({});
            }));
            assert.equal(JSON.stringify(result.result), canonicalResult, `${name} differs from Node integer ledgers/pages/geometry`);
            evidence.browsers.push({ name, version: browser.version(), status: 'PASS', resultSha256: hash(JSON.stringify(result.result)), componentDiagnostics: result.diagnostics });
            console.log(`${name} ${browser.version()}: identical ${evidence.caseCount} cases, ${evidence.totalRows} rows, geometry, thresholds, ties, and physical boundaries.`);
        } catch (error) { evidence.browsers.push({ name, status: 'FAIL', error: String(error.stack ?? error) });console.error(`${name}: ${error.message}`); }
        finally { if (browser) await browser.close(); }
    }
    evidence.allPassed = evidence.browsers.every(b => b.status === 'PASS');
    await writeFile('docs/implementation/engine-cross-runtime.json', JSON.stringify(evidence, null, 2) + '\n');
    assert.ok(evidence.allPassed, 'Cross-runtime conformance did not pass in every required runtime.');
} finally { await new Promise(resolve => server.close(resolve)); }
