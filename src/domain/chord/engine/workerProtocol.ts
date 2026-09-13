import { EngineError,type EngineDiagnostic } from './errors';
import { parseAllocationId } from './identity';
import { compileRequest } from './requestPolicy';
import { createViewMatcher } from './view';
import { createSurfaceRequest,type SurfaceRequest } from './surfaceRequest';
import { createDemandProjector } from './physicalDemand';
import { createVocabularyMatcher } from './practicalVocabulary';
import { surfacePartition } from './recommendedSurface';
import { canonical,record,integer,choice } from './validation';
import { compileStructuralMatcher } from './structuralGenerator';
import { ENGINE_VERSIONS } from './versions';
import { TERM_IDS } from './deterministicRanking';
import type { ExactPage,PageSummary } from './session';
import type { PresentationCandidate,ResolvedRequest,ViewRequest } from './types';

export const MAX_MESSAGE_BYTES=1048576;
export interface Envelope<T,K extends string=string> {
    protocol:'engine-worker-v2';sessionId:string;requestRevision:number;viewRevision:number;operationId:number;kind:K;payload:T;
}
interface Inputs {
    START:{intent:unknown;view?:unknown;pageSize?:number;uninterrupted?:boolean};
    SET_VIEW:{view:unknown;pageSize?:number};PAGE:{after:unknown|null;pageSize:number};
    LOOKUP:{allocationId:string};DETAILS:{allocationId:string};CANCEL:Record<string,never>;
    CONTINUE:{uninterrupted?:boolean};DISPOSE:Record<string,never>;
}
interface Outputs {
    ACCEPTED:{request:ResolvedRequest;view:ViewRequest;surface:SurfaceRequest;versions:typeof ENGINE_VERSIONS};
    PROGRESS:{summary:PageSummary;elapsedMs:number};
    EXACT_PAGE:{page:ExactPage;chunkIndex:number;chunkCount:number};
    LOOKUP_RESULT:{candidate:PresentationCandidate};DETAILS_RESULT:{candidate:PresentationCandidate};
    PAUSED:{summary:PageSummary;reason:'time-budget';resume:'live-checkpoint';elapsedMs:number};
    CANCELLED:{summary?:PageSummary;resume:'restart-required'};
    ERROR:{diagnostic:EngineDiagnostic;resume:'restart-required'};
    PROVISIONAL_PAGE:{rows:readonly PresentationCandidate[];summary:PageSummary};
}
export type InputMessage={[K in keyof Inputs]:Envelope<Inputs[K],K>}[keyof Inputs];
export type OutputMessage={[K in keyof Outputs]:Envelope<Outputs[K],K>}[keyof Outputs];
const encoder=new TextEncoder();
function fail(message:string):never {throw new EngineError('transport-error',message);}
function obj(value:unknown,fields:readonly string[],path:string){return record(value,fields,path,'transport-error');}
function int(value:unknown,low=0,high=Number.MAX_SAFE_INTEGER){return integer(value,low,high,'protocol integer','transport-error');}
function string(value:unknown):string {if(typeof value!=='string'||!value.length)fail('Expected nonempty protocol string.');return value;}
function bool(value:unknown):boolean {if(typeof value!=='boolean')fail('Expected protocol boolean.');return value;}
function finite(value:unknown):number {if(typeof value!=='number'||!Number.isFinite(value)||value<0)fail('Expected finite nonnegative duration.');return value;}
function array(value:unknown,max=128):unknown[] {if(!Array.isArray(value)||value.length>max)fail('Invalid bounded protocol array.');return value;}
function oneOf<T extends string>(value:unknown,values:readonly T[]):T{return choice(value,values,'protocol value','transport-error');}
function same(a:unknown,b:unknown,message='Protocol fields disagree.'){if(canonical(a)!==canonical(b))fail(message);}
function strings(value:unknown,max=128):string[]{return array(value,max).map(string);}

export function messageBytes(value:unknown):number {
    try {const json=JSON.stringify(value);if(json===undefined)fail('Message is not serializable.');return encoder.encode(json).byteLength;}
    catch(error){if(error instanceof EngineError)throw error;return fail('Message is not serializable.');}
}
function envelope(value:unknown,kinds:readonly string[]) {
    if(messageBytes(value)>MAX_MESSAGE_BYTES)fail('Worker message exceeds one MiB.');
    const e=obj(value,['protocol','sessionId','requestRevision','viewRevision','operationId','kind','payload'],'envelope');
    oneOf(e.protocol,['engine-worker-v2']);string(e.sessionId);
    int(e.requestRevision,1);int(e.viewRevision,1);int(e.operationId,1);oneOf(e.kind,kinds);
    if(!('payload' in e))fail('Missing payload.');return e;
}
export function parseInput(value:unknown):InputMessage {
    const e=envelope(value,['START','SET_VIEW','PAGE','LOOKUP','DETAILS','CANCEL','CONTINUE','DISPOSE']);
    const fields:Record<string,string[]>={START:['intent','view','pageSize','uninterrupted'],SET_VIEW:['view','pageSize'],PAGE:['after','pageSize'],
        LOOKUP:['allocationId'],DETAILS:['allocationId'],CANCEL:[],CONTINUE:['uninterrupted'],DISPOSE:[]};
    const p=obj(e.payload,fields[e.kind as string],'payload');
    if(e.kind==='START'&&!('intent' in p))fail('START requires intent.');
    if(e.kind==='SET_VIEW'&&!('view' in p))fail('SET_VIEW requires view.');
    if(e.kind==='PAGE'&&(!('after' in p)||!('pageSize' in p)))fail('PAGE requires cursor and size.');
    if(p.pageSize!==undefined)int(p.pageSize,1,128);
    if(p.uninterrupted!==undefined)bool(p.uninterrupted);
    if(e.kind==='LOOKUP'||e.kind==='DETAILS')parseAllocationId(string(p.allocationId));
    return value as InputMessage;
}
function resolved(value:unknown):ResolvedRequest {
    const r=obj(value,['requestKey','structural','interpretation','physicalProfile','origins'],'resolved request');
    const s=obj(r.structural,['version','instrument','fretDomains','formulaKey','rootPitchClass','allowed','required','minDistinctPitchClasses','predicates'],'structural');
    const i=obj(r.interpretation,['chordId','rootPitchClass','slashBassPitchClass','formula','realization','context','policyVersion'],'interpretation');
    const p=obj(r.physicalProfile,['key','screenVersion','numericVersion','scaleLengthUm','scaleSource','scope','allowedThumb','omittedStrings','warningSpanUm','severeSpanUm','handProfileRef'],'physical profile');
    const physical={...p};delete physical.key;delete physical.screenVersion;delete physical.numericVersion;
    const required=strings(s.required,12),allowed=strings(s.allowed,12);
    const compiled=compileRequest({schema:'intent-v1',chordId:i.chordId,rootPitchClass:i.rootPitchClass,context:i.context,
        instrument:s.instrument,fretDomains:s.fretDomains,minDistinctPitchClasses:s.minDistinctPitchClasses,
        realization:i.realization==='partial'?{kind:'partial',requiredToneIds:required,allowedToneIds:allowed}:
            {kind:'identity',additionalRequired:required,allowedToneIds:allowed},
        rootMode:required.includes('1')?'required':allowed.includes('1')?'optional':'excluded',
        requirements:s.predicates,physical,...(i.slashBassPitchClass===undefined?{}:{slashBassPitchClass:i.slashBassPitchClass})});
    same(compiled.structural,s);same(compiled.interpretation,i);same(compiled.physicalProfile,p);
    same(compiled.requestKey,r.requestKey);
    for(const raw of array(r.origins,128)) {const o=obj(raw,['field','origin','rule'],'origin');string(o.field);string(o.rule);oneOf(o.origin,['user','default','preset']);}
    return value as ResolvedRequest;
}
const countKeys=['structural','pass','uncertain','reject','survivors','matching','matchingPass','matchingUncertain','assessed','explicitMatching'] as const;
function summary(value:unknown):PageSummary {
    const s=obj(value,[...countKeys,'completeness','hasMore','mode','requestKey','profileKey','viewKey','versions','rankMode','rawBound','visitedNodes','retainedBufferBytes','accountedBufferBytes'],'summary');
    for(const key of countKeys)int(s[key]);
    for(const key of ['requestKey','profileKey','viewKey'])string(s[key]);
    oneOf(s.completeness,['partial','exact']);oneOf(s.mode,['compact','replay']);oneOf(s.rankMode,['classic-v1']);same(s.versions,ENGINE_VERSIONS);
    if(s.completeness==='partial'){if(s.hasMore!=='unknown')fail('Partial progress cannot have exact reachability.');}else bool(s.hasMore);
    const bound=string(s.rawBound);if(!/^(0|[1-9]\d*)$/.test(bound)||BigInt(bound)>BigInt(Number.MAX_SAFE_INTEGER))fail('Invalid exact raw bound.');
    int(s.visitedNodes);int(s.retainedBufferBytes,0,33554432);int(s.accountedBufferBytes,0,33554432);
    const c=s as unknown as PageSummary;
    if(c.structural>Number(bound)||c.structural!==c.pass+c.uncertain+c.reject||c.survivors!==c.pass+c.uncertain||c.assessed!==c.structural
        ||c.matching!==c.matchingPass+c.matchingUncertain||c.matching>c.explicitMatching||c.explicitMatching>c.survivors||c.matchingPass>c.pass||c.matchingUncertain>c.uncertain
        ||c.retainedBufferBytes>c.accountedBufferBytes)fail('Invalid count or buffer partitions.');
    return c;
}
const reasonOrder=['groups-over-four','groups-over-five','span-over-warning','span-over-severe','thumb-fallback-relied-on','unsupported-damping','unsupported-profile','unsupported-operation','unresolved-screen','conflicting-evidence'] as const;
const ledgerFields=[['spanUm','flatUntilUm','zeroAtUm'],['wholeFretGroups'],['wholeFretGroups','diagonalPattern'],['largestBarreContacts'],['adjacentInternalGaps'],
    ['isolatedInternalGaps','openFlankedIsolatedGaps','weightedUnits'],['maxStoppedFret'],['openCount','maxStoppedFret'],['rootPresent'],['rootHint'],
    ['hasExplicitSlash','rootBass','rootPresent','representativeBassString'],['optionalCoveredCount','rolePolicy'],['soundingCount','legacyTechnique'],['unplayedCoreStringCount','legacyTechnique']];
function presentation(value:unknown,contexts:Map<string,ResolvedRequest>):PresentationCandidate {
    const p=obj(value,['candidate','physical','facts','rank','displayRank','labels','demand','vocabulary','recommendation'],'presentation');
    const c=obj(p.candidate,['allocationId','requestKey','states','sounding','covered','omittedFormula'],'candidate');
    const id=string(c.allocationId),parsed=parseAllocationId(id),requestKey=string(c.requestKey);same(c.states,parsed.states);
    let context=contexts.get(requestKey);
    if(!context){context=resolved({...JSON.parse(requestKey),requestKey,origins:[]});contexts.set(requestKey,context);}
    same(parsed.tuning,context.structural.instrument.tuningMidi);
    if(!compileStructuralMatcher(context.structural)(parsed.states))fail('Candidate violates its declared request.');
    const covered=strings(c.covered,12),omitted=strings(c.omittedFormula,12);
    if(new Set([...covered,...omitted]).size!==covered.length+omitted.length)fail('Duplicated or overlapping formula coverage.');
    const sounding=array(c.sounding,6).map(raw=>{
        const n=obj(raw,['string','fret','midi','tone'],'sounding');return {string:int(n.string,0,5),fret:int(n.fret,0,36),midi:int(n.midi,0,127),tone:string(n.tone)};
    });
    const expected=parsed.states.flatMap((fret,string)=>fret<0?[]:[{string,fret,midi:parsed.tuning[string]+fret}]);
    if(!expected.length||expected.length!==sounding.length||sounding.some((n,index)=>n.string!==expected[index].string||n.fret!==expected[index].fret||n.midi!==expected[index].midi||!covered.includes(n.tone))
        ||covered.some(tone=>!sounding.some(n=>n.tone===tone)))fail('Sounding notes do not match canonical allocation.');
    const formula=context.interpretation.formula;
    for(const note of sounding)if(formula.find(tone=>(context!.structural.rootPitchClass+tone.interval)%12===note.midi%12)?.id!==note.tone)fail('Sounding role disagrees with formula.');
    same(covered,formula.filter(tone=>sounding.some(note=>note.tone===tone.id)).map(tone=>tone.id));
    same(omitted,formula.filter(tone=>!covered.includes(tone.id)).map(tone=>tone.id));
    const physical=obj(p.physical,['allocationId','profileKey','status','basis','reasonCodes','metrics','evidence','humanValidation'],'assessment');
    same(physical.allocationId,id);same(physical.profileKey,context.physicalProfile.key);oneOf(physical.status,['PASS','UNCERTAIN']);oneOf(physical.basis,['heuristic-screen','abstention']);oneOf(physical.humanValidation,['absent']);
    const reasons=strings(physical.reasonCodes,10);reasons.forEach(reason=>oneOf(reason,reasonOrder));
    same(reasons,reasonOrder.filter(reason=>reasons.includes(reason)));
    if((physical.status==='PASS')!==(reasons.length===0))fail('Assessment status disagrees with uncertainty reasons.');
    const abstain=reasons.some(reason=>reason.startsWith('unsupported-')||reason==='unresolved-screen'||reason==='conflicting-evidence');
    if((physical.basis==='abstention')!==abstain)fail('Assessment basis disagrees with reasons.');
    const metrics=obj(physical.metrics,['stoppedWireSpanUm','partialCoverGroups','thumbFallback'],'metrics');int(metrics.stoppedWireSpanUm,0,2000000);int(metrics.partialCoverGroups,0,6);
    if(metrics.thumbFallback!==undefined){const t=obj(metrics.thumbFallback,['reliedOn','nonThumbGroups','nonThumbSpanUm'],'thumb');bool(t.reliedOn);int(t.nonThumbGroups,0,6);int(t.nonThumbSpanUm,0,2000000);}
    for(const raw of array(physical.evidence,32)){
        const e=obj(raw,['id','kind','methodVersion','profileKey','allocationId','assumptions','sourceRef','sourceHash','artifact'],'evidence');
        string(e.id);oneOf(e.kind,['heuristic-screen','conditional-witness','exclusion-certificate','unsupported-operation','unresolved-analysis','source-provenance']);string(e.methodVersion);
        same(e.profileKey,physical.profileKey);same(e.allocationId,id);strings(e.assumptions,32);
        if(e.sourceRef!==undefined)string(e.sourceRef);if(e.sourceHash!==undefined)string(e.sourceHash);
        if(e.artifact!==undefined){const a=obj(e.artifact,['schema','hash','scopeKey','verified'],'artifact');string(a.schema);string(a.hash);string(a.scopeKey);bool(a.verified);}
    }
    const f=obj(p.facts,['soundingStrings','soundingCount','openCount','covered','omittedFormula','missingRequired','bass','top','rootStrings','stoppedPosition','pitchSpanSemitones','stoppedWireSpanUm','contiguousStrings'],'facts');
    same(f.soundingStrings,sounding.map(n=>n.string));same(f.soundingCount,sounding.length);same(f.openCount,sounding.filter(n=>n.fret===0).length);
    same(f.covered,covered);same(f.omittedFormula,omitted);same(f.missingRequired,[]);same(f.rootStrings,sounding.filter(n=>n.tone==='1').map(n=>n.string));
    const low=Math.min(...sounding.map(n=>n.midi)),high=Math.max(...sounding.map(n=>n.midi));
    for(const [key,midi] of [['bass',low],['top',high]] as const){const e=obj(f[key],['midi','tone','strings'],key);same(e.midi,midi);same(e.strings,sounding.filter(n=>n.midi===midi).map(n=>n.string));same(e.tone,sounding.find(n=>n.midi===midi)!.tone);}
    const stopped=sounding.filter(n=>n.fret>0).map(n=>n.fret);
    same(f.stoppedPosition,stopped.length?{min:Math.min(...stopped),max:Math.max(...stopped)}:null);
    same(f.pitchSpanSemitones,high-low);same(f.stoppedWireSpanUm,metrics.stoppedWireSpanUm);
    same(f.contiguousStrings,sounding[sounding.length-1].string-sounding[0].string+1===sounding.length);
    const r=obj(p.rank,['allocationId','policy','numericVersion','scoreNumerator','denominator','tie','ledger'],'rank');
    same(r.allocationId,id);oneOf(r.policy,['classic-v1']);oneOf(r.numericVersion,['rank-int-v1']);same(r.tie,parsed.states);same(r.denominator,110000);int(r.scoreNumerator,-2147483648,2147483647);
    const ledger=array(r.ledger,14);if(ledger.length!==14)fail('Incomplete ranking ledger.');let sum=0;
    ledger.forEach((raw,index)=>{
        const t=obj(raw,['id','active','inputs','featureVersion','interpretation','numerator','denominator','reasonCode'],'ledger term');
        same(t.id,TERM_IDS[index]);oneOf(t.featureVersion,['legacy-rank-features-v1']);oneOf(t.interpretation,['engineering-heuristic','musical-convention','product-preference']);
        same(t.denominator,110000);same(t.reasonCode,`classic-v1:${TERM_IDS[index]}`);const numerator=int(t.numerator,-2147483648,2147483647);sum+=numerator;same(t.active,numerator!==0);
        const inputs=obj(t.inputs,ledgerFields[index],'ledger inputs');same(Object.keys(inputs).sort(),[...ledgerFields[index]].sort());
        for(const input of Object.values(inputs))if(typeof input!=='string'&&typeof input!=='boolean'&&(typeof input!=='number'||!Number.isFinite(input)))fail('Invalid ledger input.');
    });
    same(sum,r.scoreNumerator);if(p.displayRank!==null)int(p.displayRank,1);strings(p.labels,32);
    const assessment=physical as unknown as PresentationCandidate['physical'];
    const demand=createDemandProjector(context.physicalProfile)(parsed.states,assessment),vocabulary=createVocabularyMatcher(context)(parsed.states);
    same(p.demand,demand);same(p.vocabulary,vocabulary);
    same(p.recommendation,{version:'recommended-surface-v2',eligible:surfacePartition(true,assessment.status,demand,vocabulary)<2});
    return value as PresentationCandidate;
}
function cursor(value:unknown,s:PageSummary) {
    if(value===null)return;
    const c=obj(value,['schema','requestKey','profileKey','viewKey','versions','last'],'cursor');oneOf(c.schema,['surface-cursor-v2']);
    same(c.requestKey,s.requestKey);same(c.profileKey,s.profileKey);same(c.viewKey,s.viewKey);same(c.versions,ENGINE_VERSIONS);
    const last=obj(c.last,['allocationId','scoreNumerator','tie','distance','partition'],'cursor key');const parsed=parseAllocationId(string(last.allocationId));
    int(last.partition,0,1);
    same(last.tie,parsed.states);int(last.scoreNumerator,-2147483648,2147483647);int(last.distance,0,2147483647);
}
export function parseOutput(value:unknown):OutputMessage {
    try {
        // Scoped to one bounded message: no history-proportional request cache.
        const contexts=new Map<string,ResolvedRequest>();
        const e=envelope(value,['ACCEPTED','PROGRESS','EXACT_PAGE','LOOKUP_RESULT','DETAILS_RESULT','PAUSED','CANCELLED','ERROR','PROVISIONAL_PAGE']);
        const fields:Record<string,string[]>={ACCEPTED:['request','view','surface','versions'],PROGRESS:['summary','elapsedMs'],EXACT_PAGE:['page','chunkIndex','chunkCount'],
            LOOKUP_RESULT:['candidate'],DETAILS_RESULT:['candidate'],PAUSED:['summary','reason','resume','elapsedMs'],CANCELLED:['summary','resume'],ERROR:['diagnostic','resume'],PROVISIONAL_PAGE:['rows','summary']};
        const p=obj(e.payload,fields[e.kind as string],'payload');
        if(e.kind==='ACCEPTED'){const request=resolved(p.request);same(createViewMatcher(request,p.view).view,p.view);
            const surface=createSurfaceRequest(request,p.surface);same(surface.wrapper,p.surface);same(surface.view,p.view);same(p.versions,ENGINE_VERSIONS);}
        if(e.kind==='LOOKUP_RESULT'||e.kind==='DETAILS_RESULT')presentation(p.candidate,contexts);
        if(e.kind==='PROGRESS'||e.kind==='PAUSED'||e.kind==='PROVISIONAL_PAGE'){const s=summary(p.summary);if(s.completeness!=='partial')fail('Progress or pause cannot claim exact completion.');}
        if(e.kind==='PROGRESS'||e.kind==='PAUSED')finite(p.elapsedMs);
        if(e.kind==='PAUSED'){oneOf(p.reason,['time-budget']);oneOf(p.resume,['live-checkpoint']);}
        if(e.kind==='CANCELLED'){if(p.summary!==undefined)summary(p.summary);oneOf(p.resume,['restart-required']);}
        if(e.kind==='ERROR'){
            const d=obj(p.diagnostic,['code','message','field'],'diagnostic');oneOf(d.code,['invalid-request','conflicting-constraints','unsupported-request','invalid-view','stale-cursor','contract-error','resource-exhausted','worker-unavailable','worker-failed','transport-error']);
            string(d.message);if(d.field!==undefined)string(d.field);oneOf(p.resume,['restart-required']);
        }
        if(e.kind==='PROVISIONAL_PAGE')for(const row of array(p.rows,128)){const r=presentation(row,contexts),s=summary(p.summary);same(r.candidate.requestKey,s.requestKey);same(r.physical.profileKey,s.profileKey);if(r.displayRank!==null)fail('Provisional ranks must be uncommitted.');}
        if(e.kind==='EXACT_PAGE'){
            const index=int(p.chunkIndex,0,127),count=int(p.chunkCount,1,128);if(index>=count)fail('Invalid page chunk sequence.');
            const page=obj(p.page,['rows','summary','nextCursor','outcome'],'page'),s=summary(page.summary);
            if(s.completeness!=='exact')fail('Exact page has partial counts.');oneOf(page.outcome,['results','structurally-empty','no-matches']);
            const rows=array(page.rows,128).map(row=>presentation(row,contexts)),ids=new Set(rows.map(row=>row.candidate.allocationId));
            if(ids.size!==rows.length||rows.length>s.matching)fail('Duplicate or overcounted page rows.');
            rows.forEach((row,i)=>{same(row.candidate.requestKey,s.requestKey);same(row.physical.profileKey,s.profileKey);if(row.displayRank===null||row.displayRank>s.matching||i>0&&row.displayRank!==rows[i-1].displayRank!+1)fail('Invalid exact display rank.');});
            cursor(page.nextCursor,s);
            if(page.outcome==='structurally-empty'&&(s.structural!==0||rows.length)||page.outcome==='no-matches'&&(s.structural===0||s.matching!==0||rows.length)
                ||page.outcome==='results'&&s.matching===0)fail('Outcome contradicts exact counts.');
        }
        return value as OutputMessage;
    }catch(error){if(error instanceof EngineError&&error.code==='transport-error')throw error;return fail(error instanceof Error?error.message:'Invalid worker output.');}
}

export type RevisionLane='scan'|'lookup'|'details'|'control';
/** Main-thread assembly stores at most 128 rows regardless of chunk count/order. */
export class PageChunkAssembler {
    private operation:string|null=null;
    private count=0;
    private metadata:string|null=null;
    private chunks=new Map<number,readonly PresentationCandidate[]>();
    private rowCount=0;
    reset(){this.operation=null;this.count=0;this.metadata=null;this.chunks.clear();this.rowCount=0;}
    accept(message:Extract<OutputMessage,{kind:'EXACT_PAGE'}>):ExactPage|null {
        const {page,chunkIndex,chunkCount}=message.payload;
        const operation=canonical([message.sessionId,message.requestRevision,message.viewRevision,message.operationId]);
        const metadata=canonical({summary:page.summary,nextCursor:page.nextCursor,outcome:page.outcome});
        if(this.operation!==null&&(operation!==this.operation||chunkCount!==this.count||metadata!==this.metadata))fail('Mixed page chunk operation or metadata.');
        if(this.chunks.has(chunkIndex))fail('Duplicate page chunk.');
        if(this.rowCount+page.rows.length>128)fail('Assembled page exceeds 128 materialized rows.');
        this.operation=operation;this.count=chunkCount;this.metadata=metadata;
        this.chunks.set(chunkIndex,page.rows);this.rowCount+=page.rows.length;
        if(this.chunks.size<chunkCount)return null;
        const rows:Array<PresentationCandidate>=[];
        for(let index=0;index<chunkCount;index++){const part=this.chunks.get(index);if(!part)fail('Missing page chunk.');rows.push(...part);}
        if(new Set(rows.map(row=>row.candidate.allocationId)).size!==rows.length||rows.some((row,index)=>index>0&&row.displayRank!==rows[index-1].displayRank!+1))fail('Assembled page identities or ranks disagree.');
        const result={...page,rows};this.reset();return result;
    }
}
export class RevisionGate {
    private sessionId='';private requestRevision=0;private viewRevision=0;
    private operations:Partial<Record<RevisionLane,number>>={};
    reset(sessionId:string,requestRevision:number,viewRevision:number){this.sessionId=string(sessionId);this.requestRevision=int(requestRevision,1);this.viewRevision=int(viewRevision,1);this.operations={};}
    expect(lane:RevisionLane,operationId:number){this.operations[lane]=int(operationId,1);}
    accepts(message:OutputMessage):boolean {
        if(message.sessionId!==this.sessionId||message.requestRevision!==this.requestRevision||message.viewRevision!==this.viewRevision)return false;
        const lane=message.kind==='LOOKUP_RESULT'?'lookup':message.kind==='DETAILS_RESULT'?'details':message.kind==='CANCELLED'?'control':'scan';
        if(message.kind==='ERROR')return Object.values(this.operations).includes(message.operationId);
        return this.operations[lane]===message.operationId;
    }
}
