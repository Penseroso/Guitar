import {it,expect} from 'vitest';
import {EngineSession,type PageCursor,type PageScan} from './session';
import {surfacePartition} from './recommendedSurface';
import {parseOutput} from './workerProtocol';
const finish=(scan:PageScan)=>{while(!scan.step()){}return scan.finish();};
const intent={schema:'intent-v1',chordId:'major',rootPitchClass:0};
const recommended={schema:'surface-request-v2',surface:'recommended',view:{}};
it('exhausts exact Recommended partitions through changing page sizes, cache/replay, and All switches',()=>{
 const session=new EngineSession(intent),first=finish(session.begin(recommended,18));
 const all=finish(session.begin({},18));
 expect(all.summary.matching).toBeGreaterThan(first.summary.matching);
 expect(finish(session.begin(recommended,18)).rows).toEqual(first.rows);
 let cursor:PageCursor|null=null,index=0;const rows:typeof first.rows[number][]=[];
 do{const size=[7,12,1,128][index++%4],page=finish(session.begin(recommended,size,cursor));rows.push(...page.rows);cursor=page.summary.hasMore?page.nextCursor:null;}while(cursor);
 expect(rows).toHaveLength(first.summary.matching);expect(new Set(rows.map(r=>r.candidate.allocationId)).size).toBe(rows.length);
 let previous=0;
 for(const row of rows){const partition=surfacePartition(true,row.physical.status,row.demand,row.vocabulary);expect(partition).toBeLessThan(2);expect(partition).toBeGreaterThanOrEqual(previous);previous=partition;}
 const replay=new EngineSession(intent,{cacheBudgetBytes:0}),s=replay.begin(recommended,18);s.step(256);
 const restored=finish(new EngineSession(intent,{cacheBudgetBytes:0}).begin(recommended,18,null,s.checkpoint()));expect(restored.rows).toEqual(first.rows);
 expect(finish(replay.begin(recommended,18,first.nextCursor)).rows).toEqual(finish(session.begin(recommended,18,first.nextCursor)).rows);
 for(const last of [{...first.nextCursor!.last,partition:1-first.nextCursor!.last.partition},{...first.nextCursor!.last,distance:1}])
  expect(()=>session.begin(recommended,6,{...first.nextCursor,last})).toThrow(/Cursor/);
 expect(()=>session.begin({},6,first.nextCursor)).toThrow(/Cursor/);
 expect(()=>session.begin({...recommended,view:{order:{kind:'near-position',targetFret:12}}})).toThrow(/classic/);
 session.dispose();replay.dispose();
});
it('keeps unsupported requests exactly empty in Recommended and reachable in All/direct lookup',()=>{
 const session=new EngineSession({...intent,physical:{scope:'restricted-or-personalized'}});
 const r=finish(session.begin(recommended,6));expect(r.summary.matching).toBe(0);expect(r.summary.explicitMatching).toBeGreaterThan(0);expect(r.rows).toEqual([]);
 const a=finish(session.begin({},6));expect(a.rows).toHaveLength(6);expect(session.lookup(a.rows[0].candidate.allocationId).recommendation.eligible).toBe(false);
});
it('rejects forged demand/vocabulary/recommendation metadata at the worker boundary',()=>{
 const session=new EngineSession(intent),page=finish(session.begin(recommended,6));
 const envelope={protocol:'engine-worker-v2',sessionId:'test',requestRevision:1,viewRevision:1,operationId:1,kind:'EXACT_PAGE',payload:{page,chunkIndex:0,chunkCount:1}};
 expect(parseOutput(envelope).kind).toBe('EXACT_PAGE');
 for(const mutate of [(p:typeof page)=>{p.rows[0].demand.J++;},(p:typeof page)=>{p.rows[0].vocabulary.V=false;},(p:typeof page)=>{p.rows[0].recommendation.eligible=false;}]){
  const copied=JSON.parse(JSON.stringify(envelope));mutate(copied.payload.page);expect(()=>parseOutput(copied)).toThrow();
 }
});
