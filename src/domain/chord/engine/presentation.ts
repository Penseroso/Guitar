import type { ResolvedVoicingNote } from '../types';
import type { ChordRegistryEntry } from '../registry';
import { getKeyName } from '../../shared/keys';
import { formatNoteName, parseDegreeLabel, parseNoteName, spellDegree } from '../../shared/spelling';
import { parseAllocationId } from './identity';
import { EngineError } from './errors';
import { integer } from './validation';
import type { PhysicalReason, PresentationCandidate } from './types';

export function formatDegreeLabel(degree:string):string{return degree.replace(/b/g,'♭').replace(/#/g,'♯');}
/** Bare note name for a chord tone, letter-cycle spelled from the chord's own root and degree. */
export function spellChordToneName(rootPitchClass:number,degree:string,interval:number):string {
    const parsed=parseDegreeLabel(degree);
    if(!parsed||parsed.number<1)throw new RangeError(`Invalid chord degree: ${degree}`);
    const root=parseNoteName(getKeyName(rootPitchClass));
    const spelled=root&&spellDegree(root,parsed.number,rootPitchClass+interval);
    if(!spelled)throw new RangeError(`Unspellable chord tone: ${degree} over ${rootPitchClass}`);
    return spelled.name;
}
export function formatChordToneLabel(rootPitchClass:number,degree:string,interval:number):string {
    return `${formatNoteName(spellChordToneName(rootPitchClass,degree,interval))} · ${formatDegreeLabel(degree)}`;
}
export function getChordToneChoices(entry:ChordRegistryEntry,rootPitchClass:number) {
    return entry.formula.degrees.map((degree,index)=>({value:degree,label:formatChordToneLabel(rootPitchClass,degree,entry.formula.intervals[index])}));
}
export function midiNoteLabel(midi:number):string {
    integer(midi,0,127,'MIDI');return ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][midi%12]+String(Math.floor(midi/12)-1);
}
function verifiedNotes(row:PresentationCandidate) {
    const parsed=parseAllocationId(row.candidate.allocationId);
    if(parsed.states.some((f,s)=>f!==row.candidate.states[s]))throw new EngineError('contract-error','Selected coordinates disagree with identity.');
    const expected=parsed.states.flatMap((f,s)=>f<0?[]:[{string:s,fret:f,midi:parsed.tuning[s]+f}]);
    if(expected.length!==row.candidate.sounding.length||expected.some((n,i)=>{
        const actual=row.candidate.sounding[i];return n.string!==actual.string||n.fret!==actual.fret||n.midi!==actual.midi;
    }))throw new EngineError('contract-error','Selected sounding pitches disagree with identity.');
    return row.candidate.sounding;
}
/** Notes-only diagram bridge: eligibility is not represented by a legacy boolean. */
export function diagramVoicing(row:PresentationCandidate):{notes:ResolvedVoicingNote[]} {
    const sounding=verifiedNotes(row);
    return {notes:row.candidate.states.map((fret,string)=>{
        const note=sounding.find(n=>n.string===string);
        return note?{string:note.string,fret,midiNote:note.midi,pitchClass:note.midi%12,degree:note.tone,isRoot:note.tone==='1',isMuted:false}
            :{string:string as ResolvedVoicingNote['string'],fret:-1,pitchClass:-1,isMuted:true};
    })};
}
/** Exact MIDI multiset, including crossings, unisons and octave doubling. */
export function getPlaybackMidi(row:PresentationCandidate):number[] {
    return [...verifiedNotes(row)].sort((a,b)=>a.midi-b.midi||b.string-a.string).map(n=>n.midi);
}
export function positionLabel(row:PresentationCandidate):string {
    const position=row.facts.stoppedPosition;
    return !position?'All open':position.min===position.max?`Fret ${position.min}`:`Frets ${position.min}–${position.max}`;
}
const REASON_TEXT:Record<PhysicalReason,string>={
    'groups-over-four':'Partial-cover estimate exceeds four contact groups.',
    'groups-over-five':'Partial-cover estimate also exceeds five contact groups.',
    'span-over-warning':'Stopped-target wire span exceeds the declared warning envelope.',
    'span-over-severe':'Stopped-target wire span also exceeds the declared severe envelope.',
    'thumb-fallback-relied-on':'The low-E thumb hypothesis is relied on; this operation is not validated.',
    'unsupported-damping':'Required left-hand damping of omitted strings is not analyzed.',
    'unsupported-profile':'The requested personal or restricted hand profile is not analyzed.',
    'unsupported-operation':'A requested operation is not analyzed.',
    'unresolved-screen':'The requested analysis is unresolved.',
    'conflicting-evidence':'Available evidence does not resolve the conflicting findings.',
};
export function physicalReasonText(reason:PhysicalReason):string{return REASON_TEXT[reason];}
export function getVoicingPresentationMeta(row?:PresentationCandidate|null) {
    if(!row)return {primaryLabel:'No voicing selected',secondaryLabel:'',positionLabel:''};
    return {primaryLabel:`Bass ${formatDegreeLabel(row.facts.bass.tone)} · Top ${formatDegreeLabel(row.facts.top.tone)}`,
        secondaryLabel:`${row.facts.soundingCount} sounding strings · ${row.facts.omittedFormula.length?`Omits ${row.facts.omittedFormula.map(formatDegreeLabel).join(', ')}`:'Complete formula'}`,
        positionLabel:positionLabel(row)};
}
