import { EngineError } from './errors';
import { createGeometry, type Geometry } from './geometry';
import { compileStructuralMatcher } from './structuralGenerator';
import { freeze } from './validation';
import type { FactualDescriptor, ResolvedRequest, Six, StringIndex } from './types';

/** Rich facts are materialized for pages/details, never stored for the full universe. */
export function createFactsProjector(request: ResolvedRequest, geometry: Geometry = createGeometry(request.physicalProfile.scaleLengthUm)) {
    if (geometry.scaleLengthUm !== request.physicalProfile.scaleLengthUm) throw new EngineError('contract-error','Fact geometry does not match the request scale.');
    const valid = compileStructuralMatcher(request.structural);
    const formula = request.interpretation.formula;
    const tuning = request.structural.instrument.tuningMidi;
    const root = request.structural.rootPitchClass;
    const toneAtPc = new Map(formula.map(tone => [(root+tone.interval)%12,tone.id]));
    return (states: Six<number>): FactualDescriptor => {
        if (!valid(states)) throw new EngineError('contract-error','Facts require a structurally valid allocation.');
        const soundingStrings: StringIndex[] = [], rootStrings: StringIndex[] = [];
        const pitches: number[] = [], coveredSet = new Set<string>();
        let openCount=0,minStopped=37,maxStopped=0;
        for (let string=0;string<6;string++) {
            const fret=states[string];
            if (fret<0) continue;
            const midi=tuning[string]+fret;
            soundingStrings.push(string as StringIndex);pitches.push(midi);
            coveredSet.add(toneAtPc.get(midi%12)!);
            if (midi%12===root) rootStrings.push(string as StringIndex);
            if (fret===0) openCount++;
            else { minStopped=Math.min(minStopped,fret);maxStopped=Math.max(maxStopped,fret); }
        }
        const low=Math.min(...pitches),high=Math.max(...pitches);
        const extreme=(midi:number)=>({midi,tone:toneAtPc.get(midi%12)!,strings:soundingStrings.filter(string=>tuning[string]+states[string]===midi)});
        return freeze({
            soundingStrings,soundingCount:soundingStrings.length,openCount,
            covered:formula.filter(tone=>coveredSet.has(tone.id)).map(tone=>tone.id),
            omittedFormula:formula.filter(tone=>!coveredSet.has(tone.id)).map(tone=>tone.id),
            missingRequired:request.structural.required.filter(tone=>!coveredSet.has(tone)),
            bass:extreme(low),top:extreme(high),rootStrings,
            stoppedPosition:maxStopped?{min:minStopped,max:maxStopped}:null,
            pitchSpanSemitones:high-low,stoppedWireSpanUm:geometry.stoppedSpan(states),
            contiguousStrings:soundingStrings[soundingStrings.length-1]-soundingStrings[0]+1===soundingStrings.length,
        });
    };
}
