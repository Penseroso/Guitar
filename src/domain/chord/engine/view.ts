import { canonicalTone } from './catalog';
import { EngineError } from './errors';
import { compileStructuralMatcher } from './structuralGenerator';
import { canonical,choice,freeze,integer,record } from './validation';
import type { Extreme,ResolvedRequest,Six,StringIndex,ViewRequest } from './types';

export const ALL_OPEN_DISTANCE = 2147483647;
function invalid(message:string,field?:string):never {throw new EngineError('invalid-view',message,field);}

export function createViewMatcher(request:ResolvedRequest,input:unknown={}) {
    const value=record(input,['schema','position','soundingCount','stringSet','open','root','coverage','bass','top','statuses','order'],'view','invalid-view');
    const whole=(input:unknown,low:number,high:number,path:string)=>integer(input,low,high,path,'invalid-view');
    const field=<T extends string>(input:unknown,values:readonly T[],path:string)=>choice(input,values,path,'invalid-view');
    const formula=request.interpretation.formula,root=request.structural.rootPitchClass;
    const extreme=(input:unknown,path:string):Extreme|null=>{
        if(input===undefined||input===null)return null;
        const e=record(input,['tone','pitchClass','midi'],path,'invalid-view');
        if(Object.keys(e).length!==1)invalid(`${path} requires exactly one tone, pitch class or MIDI.`,path);
        if('tone' in e) {
            if(typeof e.tone!=='string')invalid('Tone must be a string.',path);
            const tone=canonicalTone(request.interpretation.chordId,e.tone);
            if(!formula.some(item=>item.id===tone))invalid('Unknown formula tone.',path);
            return {tone};
        }
        if('pitchClass' in e)return {pitchClass:whole(e.pitchClass,0,11,`${path}.pitchClass`)};
        return {midi:whole(e.midi,0,127,`${path}.midi`)};
    };
    let position:ViewRequest['position']=null;
    if(value.position!==undefined&&value.position!==null) {
        const p=record(value.position,['low','high'],'position','invalid-view');
        position={low:whole(p.low,0,36,'position.low'),high:whole(p.high,0,36,'position.high')};
        if(position.low>position.high)invalid('Position low must not exceed high.','position');
    }
    let stringSet:ViewRequest['stringSet']=null;
    if(value.stringSet!==undefined&&value.stringSet!==null) {
        const s=record(value.stringSet,['mode','strings'],'stringSet','invalid-view');
        if(!Array.isArray(s.strings))invalid('Strings must be an array.','stringSet.strings');
        stringSet={mode:field(s.mode,['allowed','exact'],'stringSet.mode'),strings:[...new Set(s.strings.map((string:unknown)=>whole(string,0,5,'stringSet.strings') as StringIndex))].sort((a,b)=>a-b)};
    }
    const rawStatuses=value.statuses===undefined?['PASS','UNCERTAIN']:value.statuses;
    if(!Array.isArray(rawStatuses)||!rawStatuses.length)invalid('Statuses must be a nonempty survivor-status list.','statuses');
    const selectedStatuses=new Set(rawStatuses.map((status:unknown)=>field(status,['PASS','UNCERTAIN'],'statuses')));
    const statuses=(['PASS','UNCERTAIN'] as const).filter(status=>selectedStatuses.has(status));
    let order:ViewRequest['order']={kind:'classic'};
    if(value.order!==undefined) {
        const o=record(value.order,['kind','targetFret'],'order','invalid-view');
        const kind=field(o.kind,['classic','near-position'],'order.kind');
        if(kind==='classic') {
            if('targetFret' in o)invalid('Classic order has no target fret.','order.targetFret');
        } else order={kind,targetFret:whole(o.targetFret,0,36,'order.targetFret')};
    }
    const view:ViewRequest=freeze({schema:field(value.schema===undefined?'view-v1':value.schema,['view-v1'],'schema'),position,
        soundingCount:value.soundingCount===undefined||value.soundingCount===null?null:whole(value.soundingCount,1,6,'soundingCount'),stringSet,
        open:field(value.open===undefined?'any':value.open,['any','require','exclude'],'open'),
        root:field(value.root===undefined?'any':value.root,['any','include','omit'],'root'),
        coverage:field(value.coverage===undefined?'any':value.coverage,['any','complete','omissions'],'coverage'),
        bass:extreme(value.bass,'bass'),top:extreme(value.top,'top'),statuses,order});
    const valid=compileStructuralMatcher(request.structural),tuning=request.structural.instrument.tuningMidi;
    const formulaMask=formula.reduce((mask,tone)=>mask|(1<<((root+tone.interval)%12)),0);
    const stringMask=view.stringSet?.strings.reduce<number>((mask,string)=>mask|(1<<string),0)??0;
    const extremeCheck=(extreme:Extreme|null):(midi:number)=>boolean=>{
        if(!extreme)return ()=>true;
        if('midi' in extreme)return midi=>midi===extreme.midi;
        const pc='pitchClass' in extreme?extreme.pitchClass:(root+formula.find(tone=>tone.id===extreme.tone)!.interval)%12;
        return midi=>midi%12===pc;
    };
    const bassMatches=extremeCheck(view.bass),topMatches=extremeCheck(view.top);
    function matches(states:Six<number>,status:'PASS'|'UNCERTAIN'):boolean {
        if(status!=='PASS'&&status!=='UNCERTAIN')throw new EngineError('contract-error','View input must already be a physical survivor.');
        if(!valid(states))throw new EngineError('contract-error','View input violates the structural candidate contract.');
        if(!view.statuses.includes(status))return false;
        let count=0,opens=0,strings=0,covered=0,low=128,high=-1,minStopped=37,maxStopped=0;
        for(let string=0;string<6;string++) {
            const fret=states[string];if(fret<0)continue;
            const midi=tuning[string]+fret;
            count++;strings|=1<<string;covered|=1<<(midi%12);low=Math.min(low,midi);high=Math.max(high,midi);
            if(fret===0)opens++;else {minStopped=Math.min(minStopped,fret);maxStopped=Math.max(maxStopped,fret);}
        }
        return (view.soundingCount===null||view.soundingCount===count)
            && (!view.stringSet||(view.stringSet.mode==='exact'?strings===stringMask:(strings&~stringMask)===0))
            && (view.open==='any'||(opens>0)===(view.open==='require'))
            && (view.root==='any'||!!(covered&(1<<root))===(view.root==='include'))
            && (view.coverage==='any'||(covered===formulaMask)===(view.coverage==='complete'))
            && (!view.position||maxStopped>0&&minStopped>=view.position.low&&maxStopped<=view.position.high)
            && bassMatches(low)&&topMatches(high);
    }
    function distance(states:Six<number>):number {
        if(view.order.kind==='classic')return 0;
        let low=37,high=0;
        for(const fret of states)if(fret>0){low=Math.min(low,fret);high=Math.max(high,fret);}
        return high?Math.abs(low+high-2*view.order.targetFret):ALL_OPEN_DISTANCE;
    }
    return Object.freeze({view,key:canonical(view),matches,distance});
}
