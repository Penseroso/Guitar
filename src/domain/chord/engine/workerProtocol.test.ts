import { describe,expect,it } from 'vitest';
import { EngineSession } from './session';
import { createViewMatcher } from './view';
import { ENGINE_VERSIONS } from './versions';
import { MAX_MESSAGE_BYTES,messageBytes,parseInput,parseOutput,RevisionGate,PageChunkAssembler,type OutputMessage } from './workerProtocol';

const intent={schema:'intent-v1',chordId:'major',rootPitchClass:0,context:'accompaniment',
    instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,67,60,64,67],maxModeledFret:0}};
const session=new EngineSession(intent),scan=session.begin();scan.step(1);const partial=scan.summary();while(!scan.step()){}const page=scan.finish();
const message=<K extends string,P>(kind:K,payload:P,operationId=1)=>({protocol:'engine-worker-v1' as const,sessionId:'session-a',requestRevision:1,viewRevision:1,operationId,kind,payload});
const exact=()=>message('EXACT_PAGE',{page,chunkIndex:0,chunkCount:1});
type Mutable<T>={-readonly [K in keyof T]:T[K] extends object?Mutable<T[K]>:T[K]};
const clone=<T>(value:T):Mutable<T>=>JSON.parse(JSON.stringify(value));

describe('closed bounded worker transport',()=>{
    it('accepts every input kind with explicit payload contracts',()=>{
        for(const [kind,payload] of [
            ['START',{intent}],['START',{intent,view:{},pageSize:128,uninterrupted:true}],['SET_VIEW',{view:{open:'exclude'},pageSize:6}],
            ['PAGE',{after:null,pageSize:12}],['PAGE',{after:page.nextCursor,pageSize:1}],
            ['LOOKUP',{allocationId:page.rows[0].candidate.allocationId}],['DETAILS',{allocationId:page.rows[0].candidate.allocationId}],
            ['CANCEL',{}],['CONTINUE',{uninterrupted:false}],['DISPOSE',{}],
        ] as const)expect(parseInput(message(kind,payload)).kind).toBe(kind);
    });
    it('rejects unknown envelope/payload fields and invalid finite operation metadata',()=>{
        const start=message('START',{intent});
        for(const input of [{...start,extra:1},{...start,protocol:'future'},{...start,operationId:0},{...start,requestRevision:1.5},
            {...start,viewRevision:Infinity},{...start,sessionId:''},{...start,payload:{intent,fallback:true}},
            message('PAGE',{pageSize:6}),message('PAGE',{after:null,pageSize:129}),message('CANCEL',{fallback:true}),
            message('START',{}),message('START',{intent,uninterrupted:1}),message('SET_VIEW',{}),message('LOOKUP',{allocationId:'bad'})]) {
            expect(()=>parseInput(input)).toThrow();
        }
    });
    it('accepts all output states and exact immutable content without enumeration',()=>{
        const accepted=message('ACCEPTED',{request:session.request,view:createViewMatcher(session.request).view,versions:ENGINE_VERSIONS});
        const row={...page.rows[0],displayRank:null};
        for(const output of [accepted,exact(),message('PROGRESS',{summary:partial,elapsedMs:1.5}),
            message('LOOKUP_RESULT',{candidate:row}),message('DETAILS_RESULT',{candidate:row}),
            message('PAUSED',{summary:partial,reason:'time-budget',resume:'live-checkpoint',elapsedMs:10000}),
            message('CANCELLED',{summary:partial,resume:'restart-required'}),message('CANCELLED',{resume:'restart-required'}),
            message('ERROR',{diagnostic:{code:'worker-failed',message:'Worker failed.'},resume:'restart-required'}),
            message('PROVISIONAL_PAGE',{rows:[row],summary:partial}),
        ])expect(parseOutput(clone(output)).kind).toBe(output.kind);
    });
    it('rejects allocation, sounding-MIDI, fact, status and ledger corruption',()=>{
        const mutations:((value:Mutable<ReturnType<typeof exact>>)=>void)[]=[
            value=>{value.payload.page.rows[0].candidate.sounding[0].midi+=12;},
            value=>{value.payload.page.rows[0].candidate.states[0]=36;},
            value=>{value.payload.page.rows[0].candidate.covered.push('1');},
            value=>{value.payload.page.rows[0].facts.bass.midi+=12;},
            value=>{value.payload.page.rows[0].rank.scoreNumerator++;},
            value=>{value.payload.page.rows[0].rank.ledger[0].numerator++;},
            value=>{value.payload.page.rows[0].displayRank=null;},
        ];
        for(const mutate of mutations){const bad=clone(exact());mutate(bad);expect(()=>parseOutput(bad)).toThrow();}
        const badStatus=clone(exact()) as unknown as {payload:{page:{rows:{physical:{status:string}}[]}}};badStatus.payload.page.rows[0].physical.status='REJECT';
        expect(()=>parseOutput(badStatus)).toThrow();
        const duplicate=clone(exact()) as unknown as {payload:{page:{rows:unknown[]}}};duplicate.payload.page.rows.push(duplicate.payload.page.rows[0]);
        expect(()=>parseOutput(duplicate)).toThrow();
    });
    it('rejects inconsistent completion, exact partitions, chunks and accepted contracts',()=>{
        const broken=clone(page);broken.summary.matching++;
        expect(()=>parseOutput(message('EXACT_PAGE',{page:broken,chunkIndex:0,chunkCount:1}))).toThrow();
        expect(()=>parseOutput(message('EXACT_PAGE',{page,chunkIndex:1,chunkCount:1}))).toThrow();
        expect(()=>parseOutput(message('EXACT_PAGE',{page,chunkIndex:0,chunkCount:129}))).toThrow();
        expect(()=>parseOutput(message('PROGRESS',{summary:{...partial,hasMore:false},elapsedMs:0}))).toThrow();
        expect(()=>parseOutput(message('PROGRESS',{summary:partial,elapsedMs:NaN}))).toThrow();
        expect(()=>parseOutput(message('EXACT_PAGE',{page:{...page,summary:partial},chunkIndex:0,chunkCount:1}))).toThrow();
        const request=clone(session.request);request.structural.rootPitchClass=1;
        expect(()=>parseOutput(message('ACCEPTED',{request,view:createViewMatcher(session.request).view,versions:ENGINE_VERSIONS}))).toThrow();
        const incompatible=clone(session.request);incompatible.physicalProfile.scaleSource='measured';
        expect(()=>parseOutput(message('ACCEPTED',{request:incompatible,view:createViewMatcher(session.request).view,versions:ENGINE_VERSIONS}))).toThrow();
    });
    it('measures UTF8 bytes and rejects oversized or unserializable messages',()=>{
        expect(messageBytes('가')).toBe(5);
        expect(()=>parseInput(message('START',{intent:'x'.repeat(MAX_MESSAGE_BYTES)}))).toThrow(/MiB/);
        const cyclic:Record<string,unknown>={};cyclic.self=cyclic;expect(()=>messageBytes(cyclic)).toThrow(/serializable/);
        expect(messageBytes(exact())).toBeLessThan(MAX_MESSAGE_BYTES);
    });
    it('assembles out-of-order chunks with a total bound and rejects duplicate or mixed chunks',()=>{
        const chunks=[0,1].map(index=>parseOutput(message('EXACT_PAGE',{page:{...page,rows:page.rows.slice(index*3,index*3+3)},chunkIndex:index,chunkCount:2})) as Extract<OutputMessage,{kind:'EXACT_PAGE'}>);
        const assembler=new PageChunkAssembler();
        expect(assembler.accept(chunks[1])).toBeNull();expect(assembler.accept(chunks[0])).toEqual(page);
        assembler.accept(chunks[0]);expect(()=>assembler.accept(chunks[0])).toThrow(/Duplicate/);
        expect(()=>assembler.accept({...chunks[1],operationId:2})).toThrow(/Mixed/);
        assembler.reset();
        const many={...chunks[0],payload:{...chunks[0].payload,page:{...page,rows:Array(100).fill(page.rows[0])}}};
        assembler.accept(many);
        expect(()=>assembler.accept({...chunks[1],payload:{...chunks[1].payload,page:{...page,rows:Array(29).fill(page.rows[1])}}})).toThrow(/128/);
    });
});

describe('independent output revision lanes',()=>{
    it('keeps a page operation current while lookup/details requests are interleaved',()=>{
        const gate=new RevisionGate();gate.reset('session-a',1,1);gate.expect('scan',1);
        const output=parseOutput(exact());expect(gate.accepts(output)).toBe(true);
        gate.expect('lookup',2);gate.expect('details',3);
        expect(gate.accepts(output)).toBe(true);
        expect(gate.accepts(message('LOOKUP_RESULT',{candidate:page.rows[0]},2) as OutputMessage)).toBe(true);
        expect(gate.accepts(message('DETAILS_RESULT',{candidate:page.rows[0]},3) as OutputMessage)).toBe(true);
        gate.expect('lookup',4);
        expect(gate.accepts(message('LOOKUP_RESULT',{candidate:page.rows[0]},2) as OutputMessage)).toBe(false);
        gate.expect('control',5);
        expect(gate.accepts(message('CANCELLED',{resume:'restart-required'},5) as OutputMessage)).toBe(true);
        expect(gate.accepts(message('ERROR',{diagnostic:{code:'invalid-request',message:'Invalid ID'},resume:'restart-required'},4) as OutputMessage)).toBe(true);
        gate.reset('session-a',1,2);gate.expect('scan',6);
        expect(gate.accepts(output)).toBe(false);
        expect(gate.accepts({...output,viewRevision:2,operationId:6})).toBe(true);
        expect(gate.accepts({...output,sessionId:'old-session',viewRevision:2,operationId:6})).toBe(false);
    });
});
