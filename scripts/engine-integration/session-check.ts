/** Node integration checks; timings are not browser or human-outcome evidence. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { EngineSession, type ExactPage, type PageCursor, type PageScan } from '../../src/domain/chord/engine/session';
import { allocationId } from '../../src/domain/chord/engine/identity';
import { createViewMatcher } from '../../src/domain/chord/engine/view';
import { EngineError } from '../../src/domain/chord/engine/errors';
import { PACKED_ROW_BYTES,ROW_BUDGET_BYTES } from '../../src/domain/chord/engine/packedStore';

const intent={schema:'intent-v1',chordId:'dominant-11',rootPitchClass:0,context:'accompaniment'} as const;
const measurements:object[]=[];
function exact(scan:PageScan):ExactPage {while(!scan.step(256)){}return scan.finish();}
function partition(page:ExactPage) {
    const s=page.summary;
    return {structural:s.structural,assessed:s.assessed,pass:s.pass,uncertain:s.uncertain,reject:s.reject,
        survivors:s.survivors,matching:s.matching,matchingPass:s.matchingPass,matchingUncertain:s.matchingUncertain,
        completeness:s.completeness,hasMore:s.hasMore,requestKey:s.requestKey,profileKey:s.profileKey,viewKey:s.viewKey,
        versions:s.versions,rankMode:s.rankMode,rawBound:s.rawBound};
}
function comparePages(a:ExactPage,b:ExactPage) {
    assert.deepEqual(a.rows,b.rows,'Rows, identities, assessments, facts and complete ledgers differ.');
    assert.deepEqual(a.nextCursor,b.nextCursor,'Cache mode changed the cursor.');
    assert.deepEqual(partition(a),partition(b),'Cache mode changed exact partitions.');
    assert.equal(a.outcome,b.outcome);
    assert.equal(a.summary.structural,a.summary.pass+a.summary.uncertain+a.summary.reject);
    assert.equal(a.summary.survivors,a.summary.pass+a.summary.uncertain);
}
function measurePage(name:string,session:EngineSession,view:unknown={},size=6,after:PageCursor|null=null) {
    const before=process.memoryUsage(),started=performance.now();
    const page=exact(session.begin(view,size,after));
    const elapsedMs=performance.now()-started,afterMemory=process.memoryUsage();
    measurements.push({name,elapsedMs,rows:page.rows.length,summary:page.summary,
        processMemoryBefore:before,processMemoryAfter:afterMemory,
        processHeapDeltaBytes:afterMemory.heapUsed-before.heapUsed,
        processArrayBufferDeltaBytes:afterMemory.arrayBuffers-before.arrayBuffers});
    return page;
}
const started=performance.now(),setupStarted=performance.now();
const compact=new EngineSession(intent),replay=new EngineSession(intent,{cacheBudgetBytes:120});
const setupMs=performance.now()-setupStarted;
const firstCompact=measurePage('default compact first exact 6',compact);
const firstReplay=measurePage('default forced replay first exact 6',replay);
comparePages(firstCompact,firstReplay);
assert.equal(firstCompact.summary.structural,267524);
assert.equal(firstCompact.summary.mode,'compact');assert.equal(firstReplay.summary.mode,'replay');
assert.equal(firstReplay.summary.retainedBufferBytes,0);assert.ok(compact.store.accountedBytes<=ROW_BUDGET_BYTES);
assert.equal(compact.store.retainedBytes/PACKED_ROW_BYTES,compact.store.accountedBytes/(PACKED_ROW_BYTES+8));
assert.ok(firstCompact.nextCursor);
const secondCompact=measurePage('completed compact next exact 12',compact,{},12,firstCompact.nextCursor);
const secondReplay=measurePage('forced replay next exact 12',replay,{},12,firstReplay.nextCursor);
comparePages(secondCompact,secondReplay);
assert.deepEqual(secondCompact.rows.map(row=>row.displayRank),Array.from({length:12},(_,index)=>index+7));
const firstIds=new Set([...firstCompact.rows,...secondCompact.rows].map(row=>row.candidate.allocationId));
assert.equal(firstIds.size,18);
let deepId='';
for(let i=compact.store.count-1;i>=0;i--) {
    const id=allocationId(compact.request.structural.instrument.tuningMidi,compact.store.read(i).states);
    if(!firstIds.has(id)){deepId=id;break;}
}
assert.ok(deepId);
const lookupStarted=performance.now(),deepCompact=compact.lookup(deepId),compactLookupMs=performance.now()-lookupStarted;
const replayLookupStarted=performance.now(),deepReplay=replay.lookup(deepId),replayLookupMs=performance.now()-replayLookupStarted;
assert.deepEqual(deepCompact,deepReplay);assert.equal(deepReplay.displayRank,null);
const changedView={position:{low:10,high:15},order:{kind:'near-position',targetFret:12}};
const filteredCompact=measurePage('completed compact position10..15 near12 exact 6',compact,changedView);
const filteredReplay=measurePage('forced replay position10..15 near12 exact 6',replay,changedView);
comparePages(filteredCompact,filteredReplay);
const matcher=createViewMatcher(compact.request,changedView);
let independentMatching=0,independentPass=0,independentUncertain=0;
// Verify the full-pool count with literal position facts, independent of createViewMatcher.
for(let index=0;index<compact.store.count;index++) {
    const row=compact.store.read(index),stopped=row.states.filter(fret=>fret>0);
    const matches=stopped.length>0&&stopped.every(fret=>fret>=10&&fret<=15);
    assert.equal(matcher.matches(row.states,row.status),matches);
    if(matches){independentMatching++;if(row.status==='PASS')independentPass++;else independentUncertain++;}
}
assert.equal(filteredCompact.summary.matching,independentMatching);
assert.equal(filteredCompact.summary.matchingPass,independentPass);assert.equal(filteredCompact.summary.matchingUncertain,independentUncertain);
assert.deepEqual(compact.lookup(deepId),deepCompact,'View changes must not replace selected identities.');
assert.throws(()=>compact.begin(changedView,6,firstCompact.nextCursor),error=>error instanceof EngineError&&error.code==='stale-cursor');

const small={schema:'intent-v1',chordId:'major',rootPitchClass:0,context:'accompaniment',
    instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,67,60,64,67],maxModeledFret:0}};
const reusable=new EngineSession(small),originalScan=reusable.begin();originalScan.step(20);
const checkpoint=originalScan.checkpoint(),original=exact(originalScan);
assert.equal(reusable.store.complete,true);
const resumed=exact(reusable.begin({},6,null,checkpoint));comparePages(original,resumed);
assert.equal(resumed.summary.mode,'replay');
const corruptSession=new EngineSession(small,{cacheBudgetBytes:0}),corruptScan=corruptSession.begin();corruptScan.step(1);
const corrupt=JSON.parse(JSON.stringify(corruptScan.checkpoint()));
corrupt.counts={structural:1,pass:1,uncertain:0,reject:0,survivors:1,matching:1,matchingPass:1,matchingUncertain:0,assessed:1};
corrupt.afterCount=1; // An empty heap cannot represent one visited matching survivor.
assert.throws(()=>corruptSession.begin({},6,null,corrupt),error=>error instanceof EngineError&&error.code==='contract-error');
corruptSession.dispose();

const larger=new EngineSession({...intent,instrument:{kind:'six-single-strings-12edo',tuningMidi:[64,59,55,50,45,40],maxModeledFret:18}},{cacheBudgetBytes:120});
const largerPage=measurePage('custom frets0..18 forced replay first exact 6',larger);
assert.ok(largerPage.summary.structural>267524);assert.equal(largerPage.summary.mode,'replay');assert.equal(largerPage.summary.retainedBufferBytes,0);
assert.equal(largerPage.summary.structural,largerPage.summary.survivors);
const compactBuffer={rows:compact.store.count,retainedBytes:compact.store.retainedBytes,accountedBytes:compact.store.accountedBytes};
compact.dispose();replay.dispose();reusable.dispose();larger.dispose();
assert.equal(compact.store.retainedBytes,0);assert.equal(replay.store.retainedBytes,0);
const paths=['src/domain/chord/engine/session.ts','src/domain/chord/engine/packedStore.ts','src/domain/chord/engine/pageHeap.ts',
    'src/domain/chord/engine/view.ts','src/domain/chord/engine/facts.ts','src/domain/chord/engine/classicFeatures.ts',
    'src/domain/chord/engine/physical.ts','src/domain/chord/engine/deterministicRanking.ts'];
const output={schema:'engine-session-check-v1',createdAt:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,
    sourceHashes:Object.fromEntries(paths.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
    methodology:'Single-run Node integration diagnostics. Full packed and forced120-byte replay compare exact pages, cursors, complete ledgers and status partitions. View counts independently check literal stopped-position facts over the complete pool. Process memory includes other objects and garbage collection timing; retained/accounted store buffers are reported separately. No browser latency, phone result, human-playability or comfort claim.',
    setupMs,elapsedMs:performance.now()-started,compactBuffer,packedRowBytes:PACKED_ROW_BYTES,
    exactDefaultPartitions:partition(firstCompact),independentViewPartitions:{matching:independentMatching,pass:independentPass,uncertain:independentUncertain},
    deepLookup:{id:deepId,compactMs:compactLookupMs,replayMs:replayLookupMs,offInitial18:true,exactlyEqual:true},
    checkpointAfterCompletedCache:'pass',corruptCheckpointAccumulator:'rejected',staleViewCursor:'rejected',disposeRetainedBytes:0,failures:[],measurements};
mkdirSync('docs/implementation',{recursive:true});writeFileSync('docs/implementation/engine-session-check.json',`${JSON.stringify(output,null,2)}\n`);
process.stdout.write(`${JSON.stringify({compactBuffer,deepLookup:output.deepLookup,default:output.exactDefaultPartitions,view:output.independentViewPartitions,elapsedMs:output.elapsedMs,measurements:measurements.map(item=>{const row=item as {name:string;elapsedMs:number};return {name:row.name,elapsedMs:row.elapsedMs};})})}\n`);
