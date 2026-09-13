import { expect,it } from 'vitest';
import { EngineSession, compareOrder, type ExactPage, type PageCursor, type PageScan } from './session';
import { StructuralIterator, materializeStructural } from './structuralGenerator';
import { createPhysicalScreen } from './physical';
import { createClassicProjector } from './classicFeatures';
import { createViewMatcher } from './view';
import { scoreFeatures } from './deterministicRanking';
import { allocationId } from './identity';
import { PackedStore, PACKED_ROW_BYTES } from './packedStore';
import { PageHeap } from './pageHeap';

const intent={schema:'intent-v1',chordId:'major',rootPitchClass:0,context:'accompaniment',
    instrument:{kind:'six-single-strings-12edo',tuningMidi:[64,59,55,50,45,40],maxModeledFret:3}} as const;
function finish(scan:PageScan,nodes=256):ExactPage {while(!scan.step(nodes)){}return scan.finish();}
function collect(session:EngineSession,view:unknown={},sizes=[6,12]) {
    let cursor:PageCursor|null=null,index=0;
    const rows=[];
    do {const page=finish(session.begin(view,sizes[index++%sizes.length],cursor));rows.push(...page.rows);cursor=page.summary.hasMore?page.nextCursor:null;}while(cursor);
    return rows;
}

it('uses a correct bounded worst-first heap under permutations and repeated candidates',()=>{
    for(const k of [1,2,6,128]) {
        const input=Array.from({length:500},(_,i)=>(i*73)%211);
        const heap=new PageHeap<number>(k,(a,b)=>a-b);
        for(const n of input)heap.offer(n);
        expect(heap.sorted()).toEqual(input.sort((a,b)=>a-b).slice(0,k));
        expect(heap.size).toBeLessThanOrEqual(k);
    }
});
it('packs signed states without retaining IDs and discards the entire prefix on budget overflow',()=>{
    const store=new PackedStore(120),screen=new EngineSession(intent).screen;
    const states=[0,1,0,2,3,-1] as const;
    for(let i=0;i<3;i++)expect(store.append(states,screen.metrics(states),-i)).toBe(true);
    expect(PACKED_ROW_BYTES).toBeLessThanOrEqual(64);
    expect(store.read(2)).toEqual({states,status:'PASS',scoreNumerator:-2});
    expect(store.accountedBytes).toBeLessThanOrEqual(120);
    expect(store.append(states,screen.metrics(states),0)).toBe(false);
    expect(store.count).toBe(0);expect(store.retainedBytes).toBe(0);expect(store.discarded).toBe(true);
});
it('returns the exact independently fully sorted order with all partition counts conserved',()=>{
    const session=new EngineSession({...intent,physical:{warningSpanUm:0,severeSpanUm:0}});
    const request=session.request,iterator=new StructuralIterator(request.structural),physical=createPhysicalScreen(request.physicalProfile),projector=createClassicProjector(request);
    const full=[];let pass=0,uncertain=0;
    for(;;){const batch=iterator.nextBatch();for(const states of batch.candidates){const assessment=physical.metrics(states);if(assessment.status==='PASS')pass++;else uncertain++;
        full.push({tie:states,scoreNumerator:scoreFeatures(projector(states)),distance:0});}if(batch.done)break;}
    const expected=full.sort(compareOrder).map(r=>allocationId(request.structural.instrument.tuningMidi,r.tie));
    const page=finish(session.begin());
    expect(page.summary).toMatchObject({completeness:'exact',structural:full.length,pass,uncertain,reject:0,survivors:full.length,matching:full.length,matchingPass:pass,matchingUncertain:uncertain});
    const actual=collect(session,{},[1,7,12]);
    expect(actual.map(r=>r.candidate.allocationId)).toEqual(expected);
    expect(actual.map(r=>r.displayRank)).toEqual(actual.map((_,i)=>i+1));
    expect(new Set(actual.map(r=>r.candidate.allocationId)).size).toBe(full.length);
});
it('conserves pages, ledgers and assessments when a cache overflows during enumeration',()=>{
    const compact=new EngineSession(intent),replay=new EngineSession(intent,{cacheBudgetBytes:120});
    for(const view of [{},{open:'require'},{root:'omit'}, {order:{kind:'near-position',targetFret:2}}]) {
        expect(collect(replay,view,[3,8])).toEqual(collect(compact,view,[8,3]));
        expect(replay.store.retainedBytes).toBe(0);expect(replay.store.discarded).toBe(true);
    }
    expect(compact.store.complete).toBe(true);
});
it('filters the full completed pool before a page budget and preserves the off-page direct selection',()=>{
    const session=new EngineSession(intent);
    const all=collect(session),last=all.at(-1)!;
    const view={position:{low:2,high:3},open:'require',coverage:'complete'};
    const matcher=createViewMatcher(session.request,view);
    const expected=all.filter(r=>matcher.matches(r.candidate.states,r.physical.status));
    const matching=collect(session,view,[1]);
    expect(matching.map(r=>r.candidate.allocationId)).toEqual(expected.map(r=>r.candidate.allocationId));
    expect(session.lookup(last.candidate.allocationId).candidate).toEqual(last.candidate);
    expect(session.lookup(last.candidate.allocationId).displayRank).toBeNull();
    const empty=finish(session.begin({bass:{midi:127}}));
    expect(empty.outcome).toBe('no-matches');expect(empty.summary.structural).toBe(all.length);
    expect(empty.summary.matching).toBe(0);
    expect(session.lookup(last.candidate.allocationId).physical).toEqual(last.physical);
});
it('validates cursor identity and complete order keys after session loss or page-size changes',()=>{
    const session=new EngineSession(intent),first=finish(session.begin({},3)),cursor=first.nextCursor!;
    const restored=new EngineSession(intent,{cacheBudgetBytes:0});
    expect(finish(restored.begin({},8,cursor)).rows).toEqual(finish(session.begin({},8,cursor)).rows);
    for(const bad of [{...cursor,requestKey:'changed'},{...cursor,last:{...cursor.last,scoreNumerator:cursor.last.scoreNumerator+1}},
        {...cursor,last:{...cursor.last,distance:1}},{...cursor,last:{...cursor.last,tie:[-1,-1,-1,-1,-1,-1]}}])expect(()=>session.begin({},6,bad)).toThrow(/Cursor/);
    expect(()=>session.begin({open:'require'},6,cursor)).toThrow(/Cursor/);
    expect(()=>session.begin({},129)).toThrow();expect(()=>session.begin({},0)).toThrow();
    expect(()=>session.begin({position:{low:4,high:3}})).toThrow();
});
it('restores traversal, counters and heap at every node without double counting',()=>{
    const small={...intent,instrument:{...intent.instrument,maxModeledFret:0,tuningMidi:[60,64,67,60,64,67]}};
    const uninterrupted=finish(new EngineSession(small,{cacheBudgetBytes:0}).begin({},4));
    let session=new EngineSession(small,{cacheBudgetBytes:0}),scan=session.begin({},4);
    let resumes=0;
    while(!scan.step(1)) {
        const summary=scan.summary();expect(summary.completeness).toBe('partial');expect(summary.hasMore).toBe('unknown');
        expect(()=>scan.finish()).toThrow(/incomplete/);
        const checkpoint=JSON.parse(JSON.stringify(scan.checkpoint()));
        session.dispose();session=new EngineSession(small,{cacheBudgetBytes:0});scan=session.begin({},4,null,checkpoint);resumes++;
    }
    const actual=scan.finish();expect(resumes).toBeGreaterThan(10);
    expect(actual.rows).toEqual(uninterrupted.rows);expect(actual.summary).toEqual(uninterrupted.summary);
});
it('looks up uncached broadened allocations, rejects mismatches, and distinguishes structural emptiness',()=>{
    const session=new EngineSession({schema:'intent-v1',chordId:'major',rootPitchClass:0},{cacheBudgetBytes:0});
    const states=[0,8,9,10,-1,-1] as const,id=allocationId(session.request.structural.instrument.tuningMidi,states);
    const row=session.lookup(id);
    expect(row.candidate.sounding.map(n=>n.midi)).toEqual([64,67,64,60]);
    expect(row.candidate).toEqual(materializeStructural(states,session.request.structural,session.request.requestKey));
    expect(session.store.count).toBe(0);
    expect(()=>session.lookup(allocationId([63,59,55,50,45,40],states))).toThrow(/tuning/);
    expect(()=>session.lookup(allocationId(session.request.structural.instrument.tuningMidi,[0,0,0,0,0,0]))).toThrow(/outside/);
    const empty=new EngineSession({...intent,fretDomains:[[],[],[],[],[],[]]});
    expect(finish(empty.begin()).outcome).toBe('structurally-empty');
    const scan=session.begin();session.cancel();expect(()=>scan.step()).toThrow(/superseded/);
});
it('restores a checkpoint into a formerly cached session without treating its tail as a cache',()=>{
    const cached=new EngineSession(intent),reference=finish(cached.begin({},6));
    expect(cached.store.complete).toBe(true);
    const partial=new EngineSession(intent,{cacheBudgetBytes:0}).begin({},6);partial.step(20);
    const restored=finish(cached.begin({},6,null,partial.checkpoint()));
    expect(restored.rows).toEqual(reference.rows);expect(restored.summary.mode).toBe('replay');
    expect(cached.store.complete).toBe(false);expect(cached.store.count).toBe(0);
});
it('rejects impossible checkpoint counters and missing heap rows',()=>{
    const session=new EngineSession(intent,{cacheBudgetBytes:0}),scan=session.begin();scan.step(1);
    const checkpoint=scan.checkpoint();
    const impossible={...checkpoint,counts:{...checkpoint.counts,structural:1,pass:1,survivors:1,matching:1,matchingPass:1,assessed:1},afterCount:1};
    expect(()=>session.begin({},6,null,impossible)).toThrow(/accumulator/);
    expect(()=>session.begin({},6,null,{...checkpoint,afterCount:1})).toThrow();
});
it('makes all-open position and exact status filters independent of rank order',()=>{
    const session=new EngineSession({...intent,instrument:{...intent.instrument,tuningMidi:[60,64,67,60,64,67],maxModeledFret:1}});
    const all=collect(session),open=all.filter(r=>r.facts.stoppedPosition===null);
    expect(open.length).toBeGreaterThan(0);
    const constrained=collect(session,{position:{low:0,high:1}});
    expect(constrained.every(r=>r.facts.stoppedPosition!==null)).toBe(true);
    const ordered=collect(session,{order:{kind:'near-position',targetFret:0}});
    const firstOpen=ordered.findIndex(r=>!r.facts.stoppedPosition);
    expect(ordered.slice(firstOpen).every(r=>!r.facts.stoppedPosition)).toBe(true);
    const uncertainSession=new EngineSession({...intent,physical:{scope:'restricted-or-personalized'}});
    expect(collect(uncertainSession,{statuses:['PASS']})).toEqual([]);
    expect(collect(uncertainSession,{statuses:['UNCERTAIN']}).length).toBeGreaterThan(0);
});
