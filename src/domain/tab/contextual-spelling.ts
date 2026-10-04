import { frameChords, romanLabel } from '@/domain/harmony/roman';
import type { TonalFrame } from '@/domain/harmony/types';
import { getChordTypeSuffix } from '@/domain/chord/helpers';
import { formatAccidentals, parseNoteName } from '@/domain/shared/spelling';
import type { TabChordCandidate } from './analysis';

/** Presentation adapter only: shared frame spelling supplies roots; candidates stay unchanged. */
export function createTabCandidateFormatter(frame: TonalFrame | null) {
    const roots = new Map<number, string>();
    if (frame) {
        try {
            for (const chord of frameChords(frame)) roots.set(parseNoteName(chord.root)!.pitchClass, chord.root);
        } catch {
            // Unsupported frames supply neither contextual roots nor inferred Romans.
            roots.clear();
        }
    }
    return (candidate: TabChordCandidate): TabChordCandidate & { roman: string | null } => {
        const pitchClass = parseNoteName(candidate.chord.root)?.pitchClass;
        const root = pitchClass === undefined ? undefined : roots.get(pitchClass);
        // Chromatic roots retain the existing neutral spelling and abstention policy.
        if (!frame || !root) return { ...candidate, roman: null };
        const chord = { ...candidate.chord, root };
        return { ...candidate, chord, name: formatAccidentals(root + getChordTypeSuffix(chord.chordId)),
            roman: romanLabel(chord, frame) };
    };
}
