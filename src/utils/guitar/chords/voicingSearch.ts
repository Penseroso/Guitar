import { deriveVoicingDescriptor, buildVoicingProvenance } from './descriptor';
import { buildDeductiveChordTones, deriveRequiredDegrees } from './degreeRequirements';
import { evaluateHandPlayability, type FingeringPoint } from './fretGeometry';
import { buildTargetVoicingNotes, type VoicingStyleSpec } from './voicingStyles';
import { STANDARD_GUITAR_STRING_MIDI_PITCHES } from '../tuning';
import type { ChordRegistryEntry } from './registry';
import type { GuitarStringIndex, ResolvedVoicing, ResolvedVoicingNote } from './types';

const ALL_STRINGS: GuitarStringIndex[] = [5, 4, 3, 2, 1, 0]; // thickest (low E) to thinnest (high E)

function normalizePitchClass(value: number): number {
    return ((value % 12) + 12) % 12;
}

interface DegreeCandidate {
    degree: string;
    pitchClass: number; // absolute, 0-11
}

interface PlacedNote {
    string: GuitarStringIndex;
    fret: number;
    pitchClass: number;
    degree: string;
    midi: number;
}

export interface VoicingSearchOptions {
    /** Absolute MIDI pitch per open string, index 0 = high E .. index 5 = low E. */
    tuningMidi?: number[];
    maxFret?: number;
    scaleLengthMm?: number;
    maxHandSpanMm?: number;
    allowThumbOnLowE?: boolean;
    requireRoot?: boolean;
}

/**
 * Deductive voicing generator: places a chord's allowed degrees (from voicingStyles.ts) onto
 * the fretboard by backtracking over all 6 strings — each string is either muted or fretted at
 * any fret producing one of the chord's allowed pitch classes. Notes may repeat across strings
 * (most real strummed chords double the root/5th) as long as every required degree appears at
 * least once. No per-chord-id shape tables anywhere in this path.
 *
 * "Close position" here just means the widest degree scope with no extra bass constraint; for
 * drop-2/drop-3 the search additionally requires the lowest-sounding note to be the degree that
 * voicingStyles.ts's octave-drop transform puts at the bottom of the stack, so the classic
 * "5th (or 3rd) in the bass" character survives even though duplication is otherwise unrestricted.
 */
export function searchDeductiveVoicings(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    style: VoicingStyleSpec,
    options: VoicingSearchOptions = {}
): ResolvedVoicing[] {
    const tuningMidi = options.tuningMidi ?? STANDARD_GUITAR_STRING_MIDI_PITCHES;
    const maxFret = options.maxFret ?? 15;
    const requireRoot = options.requireRoot ?? true;

    const targetNotes = buildTargetVoicingNotes(entry, style);
    if (targetNotes.length === 0) {
        return [];
    }

    const candidates: DegreeCandidate[] = targetNotes.map((note) => ({
        degree: note.degree,
        pitchClass: normalizePitchClass(rootPitchClass + note.pitchClass),
    }));

    const requiredDegreeSet = new Set(
        deriveRequiredDegrees(entry).filter((degree) => candidates.some((candidate) => candidate.degree === degree))
    );
    // drop-2/drop-3 pin the lowest-sounding voice to whatever voicingStyles.ts's octave-drop
    // transform moved to the bottom of the stack — everything above stays free to duplicate.
    const requiredBassDegree = style.position === 'drop-2' || style.position === 'drop-3'
        ? targetNotes[0].degree
        : null;

    const tones = buildDeductiveChordTones(entry, rootPitchClass);
    const results: ResolvedVoicing[] = [];
    const seenSignatures = new Set<string>();
    const playedNotes: PlacedNote[] = [];

    function finalizeIfValid() {
        if (playedNotes.length === 0) {
            return;
        }

        const coveredDegrees = new Set(playedNotes.map((note) => note.degree));
        for (const required of requiredDegreeSet) {
            if (!coveredDegrees.has(required)) {
                return;
            }
        }

        if (requireRoot && !playedNotes.some((note) => note.degree === '1')) {
            return;
        }

        if (requiredBassDegree) {
            const lowest = playedNotes.reduce((a, b) => (a.midi <= b.midi ? a : b));
            if (lowest.degree !== requiredBassDegree) {
                return;
            }
        }

        // A chord needs at least 3 distinct tones to read as a chord rather than a double-stop —
        // except for formulas that are inherently 2-tone (power chords), which have nothing more
        // to add. This is a hard floor, independent of which style/omission produced the notes.
        const distinctPitchClasses = new Set(playedNotes.map((note) => note.pitchClass)).size;
        const minDistinctPitchClasses = Math.min(3, entry.formula.degrees.length);
        if (distinctPitchClasses < minDistinctPitchClasses) {
            return;
        }

        const fingeringPoints: FingeringPoint[] = playedNotes
            .filter((note) => note.fret > 0)
            .map((note) => ({ string: note.string, fret: note.fret }));
        const openStrings = playedNotes
            .filter((note) => note.fret === 0)
            .map((note) => note.string);

        const playability = evaluateHandPlayability(fingeringPoints, {
            scaleLengthMm: options.scaleLengthMm,
            maxHandSpanMm: options.maxHandSpanMm,
            allowThumbOnLowE: options.allowThumbOnLowE,
            openStrings,
        });
        if (!playability.playable) {
            return;
        }

        const signature = [...playedNotes]
            .sort((a, b) => a.string - b.string)
            .map((note) => `${note.string}:${note.fret}`)
            .join('|');
        if (seenSignatures.has(signature)) {
            return;
        }
        seenSignatures.add(signature);

        const playedStringSet = new Set(playedNotes.map((note) => note.string));
        const notes: ResolvedVoicingNote[] = [
            ...playedNotes.map((note) => ({
                string: note.string,
                fret: note.fret,
                pitchClass: note.pitchClass,
                midiNote: note.midi,
                degree: note.degree,
                isRoot: note.degree === '1',
                isMuted: false,
            })),
            ...ALL_STRINGS
                .filter((stringIndex) => !playedStringSet.has(stringIndex))
                .map((stringIndex) => ({ string: stringIndex, fret: -1, pitchClass: -1, isMuted: true })),
        ];

        const playedFrets = playedNotes.map((note) => note.fret);
        const minFret = Math.min(...playedFrets);
        const maxFretPlayed = Math.max(...playedFrets);
        const rootNote = playedNotes.find((note) => note.degree === '1');

        const descriptor = deriveVoicingDescriptor({
            chordId: entry.id,
            rootPitchClass,
            notes,
            tones,
            provenance: buildVoicingProvenance({ source: 'generated', debugLabel: `deductive-${style.position}` }),
            rootString: rootNote?.string,
            span: maxFretPlayed - minFret,
            minFret,
            maxFret: maxFretPlayed,
        });

        results.push({
            id: `${entry.id}:${style.position}:${signature}`,
            chord: entry.definition,
            descriptor,
            notes,
            rootFret: rootNote?.fret,
            minFret,
            maxFret: maxFretPlayed,
            span: maxFretPlayed - minFret,
            playable: true,
            missingRequiredDegrees: descriptor.missingRequiredDegrees,
            omittedOptionalDegrees: descriptor.omittedOptionalDegrees,
        });
    }

    function backtrack(stringOrderIndex: number) {
        if (stringOrderIndex >= ALL_STRINGS.length) {
            finalizeIfValid();
            return;
        }

        // Prune: if there are fewer strings left than still-uncovered required degrees, no
        // completion from here can possibly satisfy the required-degree constraint.
        const remainingStrings = ALL_STRINGS.length - stringOrderIndex;
        const covered = new Set(playedNotes.map((note) => note.degree));
        const uncoveredCount = [...requiredDegreeSet].filter((degree) => !covered.has(degree)).length;
        if (uncoveredCount > remainingStrings) {
            return;
        }

        const stringIndex = ALL_STRINGS[stringOrderIndex];
        const previousMidi = playedNotes.length > 0 ? playedNotes[playedNotes.length - 1].midi : -Infinity;

        // Option 1: mute this string.
        backtrack(stringOrderIndex + 1);

        // Option 2: fret this string at any position producing an allowed pitch class, at or
        // above the previous played string's pitch (thick-to-thin non-decreasing pitch order).
        for (const candidate of candidates) {
            for (let fret = 0; fret <= maxFret; fret++) {
                if (normalizePitchClass(tuningMidi[stringIndex] + fret) !== candidate.pitchClass) {
                    continue;
                }

                const midi = tuningMidi[stringIndex] + fret;
                if (midi < previousMidi) {
                    continue;
                }

                playedNotes.push({ string: stringIndex, fret, pitchClass: candidate.pitchClass, degree: candidate.degree, midi });
                backtrack(stringOrderIndex + 1);
                playedNotes.pop();
            }
        }
    }

    backtrack(0);

    return results;
}
