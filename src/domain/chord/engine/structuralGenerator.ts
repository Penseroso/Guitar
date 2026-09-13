import { formulaForKey } from './catalog';
import { compileSubset } from './subsets';
import { allocationId, sixIntegers } from './identity';
import { canonical } from './validation';
import { EngineError } from './errors';
import type { Extreme, Six, StructuralCandidate, StructuralRequest, StringIndex } from './types';

export const bitCount = (n: number): number => { let count=0; for(;n;n&=n-1) count++; return count; };
const pc = (midi:number) => midi%12;
export function compileStructuralMatcher(request: StructuralRequest): (states: Six<number>) => boolean {
    const formula=formulaForKey(request.formulaKey), tuning=request.instrument.tuningMidi;
    const allowedMask=request.allowed.reduce((m,d)=>m|(1<<pc(request.rootPitchClass+formula.find(t=>t.id===d)!.interval)),0);
    const requiredMask=request.required.reduce((m,d)=>m|(1<<pc(request.rootPitchClass+formula.find(t=>t.id===d)!.interval)),0);
    const subsets=request.predicates.flatMap(p=>p.kind==='subset'?[compileSubset(request,formula,p.value)]:[]);
    const matchesExtreme=(midi:number, value:Extreme) => 'midi' in value?midi===value.midi:'pitchClass' in value?pc(midi)===value.pitchClass:pc(midi)===pc(request.rootPitchClass+formula.find(t=>t.id===value.tone)!.interval);
    return states=>{
        if(!Array.isArray(states)||states.length!==6) return false;
        let mask=0,count=0,opens=0,min=128,max=-1,minStop=37,maxStop=-1;
        for(let s=0;s<6;s++) {
            const f=states[s];
            if(!Number.isInteger(f)||f< -1||f>36) return false;
            if(f<0) continue;
            if(!request.fretDomains[s].includes(f)) return false;
            const midi=tuning[s]+f;
            if(midi>127 || !(allowedMask&(1<<pc(midi)))) return false;
            mask|=1<<pc(midi); count++; if(f===0) opens++;
            else { minStop=Math.min(minStop,f); maxStop=Math.max(maxStop,f); }
            min=Math.min(min,midi); max=Math.max(max,midi);
        }
        if(!count||(mask&requiredMask)!==requiredMask||bitCount(mask)<request.minDistinctPitchClasses) return false;
        for(const p of request.predicates) {
            if(p.kind==='sounding-count'&&count!==p.count) return false;
            if(p.kind==='allowed-strings'&&states.some((f,s)=>f>=0&&!p.strings.includes(s as StringIndex))) return false;
            if(p.kind==='exact-strings'&&states.some((f,s)=>(f>=0)!==p.strings.includes(s as StringIndex))) return false;
            if(p.kind==='open'&&(opens>0)!==(p.mode==='require')) return false;
            if(p.kind==='root'&&!!(mask&(1<<request.rootPitchClass))!==(p.mode==='include')) return false;
            if(p.kind==='formula-coverage'&&(bitCount(mask)===formula.length)!==(p.mode==='complete')) return false;
            if(p.kind==='bass'&&!matchesExtreme(min,p.value)||p.kind==='top'&&!matchesExtreme(max,p.value)) return false;
            if(p.kind==='stopped-position'&&(maxStop<0||minStop<p.low||maxStop>p.high)) return false;
        }
        return subsets.every(match=>match(states));
    };
}

export interface StructuralCheckpoint {
    schema:'structural-checkpoint-v1'; key:string; depth:number; states:Six<number>;
    next:readonly number[]; visitedNodes:number;
}
/** Bounded DFS; every loop iteration is a scheduling/cancellation opportunity. No objects per universe. */
export class StructuralIterator {
    readonly rawBound: bigint;
    private readonly options: number[][];
    private readonly bits: number[][];
    private readonly suffix: number[];
    private readonly masks=Array<number>(7).fill(0);
    private readonly next=Array<number>(6).fill(0);
    private readonly states=[-1,-1,-1,-1,-1,-1];
    private depth=0;
    private visited=0;
    private readonly requiredMask:number;
    private readonly matches:(states:Six<number>)=>boolean;
    readonly key:string;
    constructor(readonly request:StructuralRequest, checkpoint?:StructuralCheckpoint, private readonly prune=true) {
        this.key=canonical(request);
        const formula=formulaForKey(request.formulaKey), tuning=request.instrument.tuningMidi;
        const allowed=request.allowed.map(d=>pc(request.rootPitchClass+formula.find(t=>t.id===d)!.interval));
        this.requiredMask=request.required.reduce((mask,d)=>mask|(1<<pc(request.rootPitchClass+formula.find(t=>t.id===d)!.interval)),0);
        this.options=request.fretDomains.map((frets,s)=>[-1,...frets.filter(f=>allowed.includes(pc(tuning[s]+f)))]);
        this.bits=this.options.map((options,s)=>options.map(f=>f<0?0:1<<pc(tuning[s]+f)));
        this.suffix=Array<number>(7).fill(0);
        for(let s=5;s>=0;s--) this.suffix[s]=this.suffix[s+1]|this.bits[s].reduce((a,b)=>a|b,0);
        this.rawBound=this.options.reduce((n,o)=>n*BigInt(o.length),BigInt(1));
        this.matches=compileStructuralMatcher(request);
        if(checkpoint) this.restore(checkpoint);
    }
    private restore(c:StructuralCheckpoint) {
        if(c.schema!=='structural-checkpoint-v1'||c.key!==this.key||!Number.isInteger(c.depth)||c.depth< -1||c.depth>5||!Array.isArray(c.next)||c.next.length!==6||!Number.isSafeInteger(c.visitedNodes)||c.visitedNodes<0) throw new EngineError('contract-error','Invalid iterator checkpoint.');
        const states=sixIntegers(c.states,-1,36,'checkpoint.states');
        for(let s=0;s<6;s++) {
            if(!Number.isInteger(c.next[s])||c.next[s]<0||c.next[s]>this.options[s].length) throw new EngineError('contract-error','Invalid checkpoint branch.');
            this.states[s]=states[s];this.next[s]=c.next[s];
            if(s<c.depth && (c.next[s]===0||this.options[s][c.next[s]-1]!==states[s])) throw new EngineError('contract-error','Checkpoint prefix mismatch.');
            this.masks[s+1]=this.masks[s]|(states[s]<0?0:1<<pc(this.request.instrument.tuningMidi[s]+states[s]));
        }
        this.depth=c.depth;this.visited=c.visitedNodes;
    }
    checkpoint():StructuralCheckpoint {
        return {schema:'structural-checkpoint-v1',key:this.key,depth:this.depth,states:[...this.states] as unknown as Six<number>,next:[...this.next],visitedNodes:this.visited};
    }
    nextBatch(maxNodes=256):{candidates:Six<number>[];done:boolean;visitedNodes:number} {
        if(!Number.isInteger(maxNodes)||maxNodes<1||maxNodes>65536) throw new EngineError('invalid-request','Invalid traversal batch size.');
        const candidates:Six<number>[]=[];
        let nodes=0;
        while(this.depth>=0&&nodes++<maxNodes) {
            this.visited++;
            const d=this.depth,missing=this.requiredMask&~this.masks[d];
            if(this.next[d]===0&&this.prune&&(bitCount(missing)>6-d||(missing&~this.suffix[d])!==0)) {this.depth--;continue;}
            if(this.next[d]>=this.options[d].length) {this.depth--;continue;}
            const i=this.next[d]++;
            this.states[d]=this.options[d][i];this.masks[d+1]=this.masks[d]|this.bits[d][i];
            if(d===5) {
                if((this.masks[6]&this.requiredMask)===this.requiredMask&&bitCount(this.masks[6])>=this.request.minDistinctPitchClasses&&this.matches(this.states as unknown as Six<number>)) candidates.push([...this.states] as unknown as Six<number>);
            } else {this.depth++;this.next[this.depth]=0;}
        }
        return {candidates,done:this.depth<0,visitedNodes:this.visited};
    }
}

/** Materialize only retained/page/lookup allocations; input facts are never trusted from transport. */
export function materializeStructural(states:Six<number>, request:StructuralRequest, requestKey:string):StructuralCandidate {
    if(!compileStructuralMatcher(request)(states)) throw new EngineError('contract-error','Allocation violates the resolved structural request.');
    const formula=formulaForKey(request.formulaKey);
    const sounding=states.flatMap((fret,string)=>{
        if(fret<0) return [];
        const midi=request.instrument.tuningMidi[string]+fret;
        const tone=formula.find(t=>pc(t.interval+request.rootPitchClass)===pc(midi))!.id;
        return [{string:string as StringIndex,fret,midi,tone}];
    });
    const covered=formula.filter(t=>sounding.some(n=>n.tone===t.id)).map(t=>t.id);
    return { allocationId:allocationId(request.instrument.tuningMidi,states),requestKey,states:[...states] as Six<number>,sounding,covered,omittedFormula:formula.filter(t=>!covered.includes(t.id)).map(t=>t.id) };
}
