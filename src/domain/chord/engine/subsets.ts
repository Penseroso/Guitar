import { EngineError } from './errors';
import type { Six, StructuralRequest, Subset } from './types';

type Formula = readonly { id: string; interval: number }[];
const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

/** Compile once per request; the predicate consumes structurally validated coordinates. */
export function compileSubset(request: StructuralRequest, formula: Formula, subset: Subset): (states: Six<number>) => boolean {
    if (subset.kind === 'unrestricted' || subset.kind === 'essential-tones') {
        // Essential-tone vocabulary and its unchanged density floor belong to compilation.
        return () => true;
    }
    const selected = subset.toneIds ?? formula.map(tone => tone.id);
    const validCount = subset.kind === 'close-position'
        ? selected.length >= 2 && selected.length <= 6
        : selected.length === 4;
    if (!validCount || new Set(selected).size !== selected.length) {
        throw new EngineError('unsupported-request', 'Subset requires distinct selected tones with the specified cardinality.', 'subset.toneIds');
    }
    const pcs = selected.map(id => {
        const tone = formula.find(item => item.id === id);
        if (!tone) throw new EngineError('invalid-request', `Unknown subset tone ${id}.`, 'subset.toneIds');
        return pitchClass(request.rootPitchClass + tone.interval);
    });
    if (selected.some(id => !request.allowed.includes(id)) || request.required.some(id => !selected.includes(id))
        || new Set(pcs).size < request.minDistinctPitchClasses) {
        throw new EngineError('conflicting-constraints', 'Selected subset tones do not satisfy the resolved harmonic contract.', 'subset.toneIds');
    }
    // Supported formulas have unique pitch classes; two enharmonic roles could not be
    // inferred separately from a coordinate. Reject such an unsupported configuration.
    if (new Set(pcs).size !== selected.length) {
        throw new EngineError('unsupported-request', 'Selected subset tokens must have distinct pitch classes.', 'subset.toneIds');
    }
    const pcMask = pcs.reduce((mask, pc) => mask | (1 << pc), 0);
    const tuning = request.instrument.tuningMidi;
    return states => {
        const pitches: number[] = [];
        let covered = 0;
        for (let string = 0; string < 6; string++) {
            if (states[string] < 0) continue;
            const midi = tuning[string] + states[string];
            const bit = 1 << pitchClass(midi);
            if (!(pcMask & bit) || (covered & bit)) return false;
            covered |= bit;
            pitches.push(midi);
        }
        if (pitches.length !== selected.length || covered !== pcMask) return false;
        pitches.sort((a, b) => a - b);
        if (subset.kind === 'close-position') return pitches[pitches.length - 1] - pitches[0] < 12;

        // In a strict close source (span <12), its lowered voice is necessarily
        // the unique lowest transformed voice. Thus raising that voice gives the
        // only possible source, including every inversion and octave shift. This
        // is equivalent to forward enumeration through maximumSoundingMidi+12.
        const restored = pitches[0] + 12;
        pitches[0] = restored;
        pitches.sort((a, b) => a - b);
        const sourceIndex = subset.kind === 'drop-2' ? 2 : 1;
        return pitches[3] - pitches[0] < 12 && pitches[sourceIndex] === restored
            && pitches.every((midi, index) => index === 0 || midi > pitches[index - 1]);
    };
}

export function matchesSubset(states: Six<number>, request: StructuralRequest, formula: Formula, subset: Subset): boolean {
    return compileSubset(request, formula, subset)(states);
}
