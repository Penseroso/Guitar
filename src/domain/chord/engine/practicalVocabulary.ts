import manifest from './practicalVocabularyData.json';
import type { ResolvedRequest, Six } from './types';
import type { VocabularyMatch } from './vocabularyContract';

const versions={version:'practical-vocabulary-v1',translationVersion:'practical-exact-translation-v1'} as const;
const none:VocabularyMatch=Object.freeze({...versions,V:false,match:null});
const key=(states:readonly number[])=>states.reduce((a,f)=>a*17+f+1,0);
/** Pure L3: no Physical profile/status, demand, ranking or presentation input. */
export function createVocabularyMatcher(request:Pick<ResolvedRequest,'structural'|'interpretation'>) {
    const {structural:s,interpretation:i}=request;
    const inScope=s.instrument.kind==='six-single-strings-12edo'&&s.instrument.maxModeledFret===15
        &&[64,59,55,50,45,40].every((m,n)=>s.instrument.tuningMidi[n]===m)
        &&s.fretDomains.every(d=>d.length===16&&d.every((f,n)=>f===n))
        &&i.context==='standalone'&&i.realization==='identity'&&i.slashBassPitchClass===undefined
        &&manifest.qualities.includes(i.chordId)&&Number.isInteger(i.rootPitchClass)&&i.rootPitchClass>=0&&i.rootPitchClass<12;
    const matches=new Map<number,VocabularyMatch>();
    if(inScope){
        for(const t of manifest.closed){if(t.quality!==i.chordId)continue;
            for(let p=t.pMin;p<=t.pMax;p++){
                if((t.rootAnchor+p)%12!==i.rootPitchClass)continue;
                if(t.allowed!==null&&!t.allowed.some(pair=>pair[0]===i.rootPitchClass&&pair[1]===p))continue;
                const states=t.offsets.map(f=>f<0?-1:f+p);
                matches.set(key(states),Object.freeze({...versions,V:true,match:{id:t.id,kind:t.kind as 'A'|'B'|'C',placement:p}}));
            }
        }
        for(const o of manifest.open)if(o.quality===i.chordId&&o.root===i.rootPitchClass)
            matches.set(key(o.states),Object.freeze({...versions,V:true,match:{id:o.id,kind:'open' as const,placement:null}}));
    }
    return (states:Six<number>):VocabularyMatch=>inScope&&states.length===6&&states.every(f=>Number.isInteger(f)&&f>=-1&&f<=15)?matches.get(key(states))??none:none;
}
