import { note } from './roman';
import type { ResolvedHarmonyChord, TonalFrame } from './types';

// Bounded eligibility, never proof of a chord's function in a composition.
const TONIC_QUALITIES = {
    major: new Set(['major', 'major-7', 'major-6', 'major-9', 'add9', 'six-nine']),
    minor: new Set(['minor', 'minor-7', 'minor-6', 'minor-major-7', 'minor-9', 'minor-add9', 'minor-11', 'minor-13']),
};

export function targetPolicy(target: ResolvedHarmonyChord, frame: TonalFrame) {
    const minor = target.tones.some(tone => tone.degree === 'b3');
    const rootAtKeyCenter = target.rootPitchClass === note(frame.tonic).pitchClass;
    const tonicFamilyTarget = TONIC_QUALITIES[minor ? 'minor' : 'major'].has(target.chordId);
    const localResolutionTarget = target.tones.some(tone => tone.degree === (minor ? 'b3' : '3'))
        && target.tones.some(tone => tone.degree === '5');
    return {
        minor,
        rootAtKeyCenter,
        tonicFamilyTarget,
        localResolutionTarget,
        tonicHarmony: rootAtKeyCenter && minor === (frame.mode === 'minor') && tonicFamilyTarget,
        // A dominant-quality V may itself receive V7/V. This does not make it tonic.
        appliedTarget: localResolutionTarget && (!rootAtKeyCenter || (tonicFamilyTarget && minor !== (frame.mode === 'minor'))),
    };
}
