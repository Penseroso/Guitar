import { observeEnding } from '@/domain/harmony/ending-observation';
import { compareChords } from '@/domain/harmony/facts';
import { pc, romanLabel, validateFrame } from '@/domain/harmony/roman';
import { targetPolicy } from '@/domain/harmony/target-policy';
import type { ResolvedHarmonyChord, TonalFrame } from '@/domain/harmony/types';
import { compareExactTimes } from './exact-time';
import type { SuppliedChordRow } from './supplied-harmony';

export type ChordPlacementMode = NonNullable<SuppliedChordRow['placement']>['kind'];
export type PlacedChord = SuppliedChordRow & {
    chord: ResolvedHarmonyChord;
    placement: NonNullable<SuppliedChordRow['placement']>;
};

function byStart(left: PlacedChord, right: PlacedChord): number {
    const a = left.placement, b = right.placement;
    if (a.kind === 'positions' && b.kind === 'positions') return a.first - b.first;
    if (a.kind === 'written-time' && b.kind === 'written-time') return compareExactTimes(a.start, b.start);
    return 0;
}

export function reviewSuppliedSequence(rows: readonly SuppliedChordRow[], mode: ChordPlacementMode) {
    const entries = rows.filter(row => row.entry.binding.kind === mode);
    const chords = entries.filter((row): row is PlacedChord => !!row.chord && row.placement?.kind === mode).sort(byStart);
    const conflict = chords.some((left, i) => {
        const a = left.placement, b = chords[i + 1]?.placement;
        if (a.kind === 'positions' && b?.kind === 'positions') return a.last >= b.first;
        return a.kind === 'written-time' && b?.kind === 'written-time' && compareExactTimes(a.end, b.start) > 0;
    });
    return { chords: conflict ? [] : chords, needsReview: entries.length - chords.length, conflict };
}

export function placementsTouch(left: PlacedChord, right: PlacedChord): boolean {
    const a = left.placement, b = right.placement;
    if (a.kind === 'positions' && b.kind === 'positions') return a.last + 1 === b.first;
    return a.kind === 'written-time' && b.kind === 'written-time' && compareExactTimes(a.end, b.start) === 0;
}

type ProgressionReading =
    | { kind: 'tonic'; label: 'V–I' | 'V–i' | 'ii–V–I' | 'iiø–V–i'; endingEvidence: string[]; endingUnsupported?: true }
    | { kind: 'applied'; label: string }
    | { kind: 'tritone'; label: string };

function frameIfValid(frame: TonalFrame | null): TonalFrame | null {
    if (!frame) return null;
    try {
        validateFrame(frame);
        return frame;
    } catch {
        return null;
    }
}

function readSuppliedTransition(before: ResolvedHarmonyChord, target: ResolvedHarmonyChord,
    frame: TonalFrame, earlier?: ResolvedHarmonyChord): ProgressionReading | null {
    const policy = targetPolicy(target, frame);
    const fifthAbove = before.rootPitchClass === pc(target.rootPitchClass + 7);
    const basicDominant = before.chordId === 'dominant-7';
    const keyDominant = fifthAbove && (basicDominant || before.chordId === 'major');
    if (policy.tonicHarmony && keyDominant) {
        const minor = frame.mode === 'minor';
        const hasTwo = earlier?.rootPitchClass === pc(target.rootPitchClass + 2)
            && (minor ? earlier.chordId === 'half-diminished-7' : ['minor', 'minor-7'].includes(earlier.chordId));
        const label = hasTwo ? (minor ? 'iiø–V–i' : 'ii–V–I') : minor ? 'V–i' : 'V–I';
        const ending = observeEnding(frame, before, target, { before });
        return { kind: 'tonic', label, endingEvidence: ending.missing,
            ...(ending.status === 'unsupported' ? { endingUnsupported: true } : {}) };
    }
    // Root relation and the two actual chord formulas are required for these bounded readings.
    const destination = romanLabel({ ...target, chordId: policy.minor ? 'minor' : 'major' }, frame);
    if (fifthAbove && basicDominant && policy.appliedTarget) return { kind: 'applied', label: `V7/${destination}` };
    if (frame.lens === 'jazz-pop' && basicDominant && (policy.tonicHarmony || policy.appliedTarget)
        && before.rootPitchClass === pc(target.rootPitchClass + 1)) {
        return { kind: 'tritone', label: policy.tonicHarmony ? 'subV7' : `subV7/${destination}` };
    }
    return null;
}

export function observeSuppliedProgression(rows: readonly SuppliedChordRow[], mode: ChordPlacementMode, reference: TonalFrame | null) {
    const sequence = reviewSuppliedSequence(rows, mode);
    const frame = frameIfValid(reference);
    const transitions = sequence.chords.slice(1).map((to, i) => {
        const from = sequence.chords[i];
        const adjacent = placementsTouch(from, to);
        const earlier = sequence.chords[i - 1];
        const prefix = earlier && placementsTouch(earlier, from) ? earlier : undefined;
        const reading = frame && adjacent && !sequence.needsReview ? readSuppliedTransition(from.chord, to.chord, frame, prefix?.chord) : null;
        return {
            from, to, adjacent, reading,
            prefix: reading?.kind === 'tonic' && reading.label.startsWith('ii') ? prefix : undefined,
            facts: adjacent ? compareChords(from.chord, to.chord) : null,
        };
    });
    return { ...sequence, frame, transitions };
}
