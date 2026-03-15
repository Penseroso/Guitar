/**
 * pitchResolver.ts
 * Pure utility: converts abstract harmonic data (root pitch-class + interval set)
 * into concrete Tone.js pitch strings like "C3", "E3", "G#4".
 *
 * Voicing strategy (Close Position):
 *  - Root is anchored to Octave 2–3 range (MIDI 40–51, i.e. E2–Eb3).
 *  - Upper voices are stacked closely above the root starting in Octave 3.
 */

// Pitch class index → note name (sharps)
const PITCH_CLASS_NAMES: readonly string[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

/**
 * Converts a MIDI note number to a Tone.js pitch string, e.g. 60 → "C4".
 */
function midiToTonePitch(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    const name = PITCH_CLASS_NAMES[midi % 12];
    return `${name}${octave}`;
}

/**
 * Resolves a chord to an array of Tone.js pitch strings.
 *
 * @param rootPitchClass  0–11 (C=0 … B=11)
 * @param intervals       Semitone offsets from root (e.g. [0, 4, 7] for a major triad).
 *                        The function expects the intervals to include 0 (the root).
 * @returns               Array of pitch strings ordered from low to high, e.g. ["E2","G#3","B3"].
 */
export function resolveChordToPitches(rootPitchClass: number, intervals: number[]): string[] {
    // Anchor the root in the MIDI 40–51 range (E2–Eb3).
    // We choose the lowest MIDI note whose pitch class matches rootPitchClass within that range.
    const ROOT_MIDI_MIN = 40; // E2
    const ROOT_MIDI_MAX = 51; // Eb3

    let rootMidi = ROOT_MIDI_MIN + ((rootPitchClass - (ROOT_MIDI_MIN % 12) + 12) % 12);
    // If that lands above the max, shift down an octave.
    if (rootMidi > ROOT_MIDI_MAX) rootMidi -= 12;

    const pitches: string[] = [];

    for (const interval of intervals) {
        if (interval === 0) {
            // Root voice — use anchored octave
            pitches.push(midiToTonePitch(rootMidi));
        } else {
            // Upper voices — stack above root, minimally in Octave 3+.
            // Base upper voice starts at rootMidi + 12 (one octave above) so voices stay close.
            const upperBase = rootMidi + 12;
            let midi = upperBase + (interval % 12);
            // If the interval wraps below the upper base, nudge up an octave.
            if (midi < upperBase) midi += 12;
            pitches.push(midiToTonePitch(midi));
        }
    }

    // Sort by ascending pitch (MIDI-equivalent) using the note name + octave we embedded.
    // Easiest: re-derive MIDI from the string to sort.
    pitches.sort((a, b) => pitchToMidi(a) - pitchToMidi(b));

    return pitches;
}

/** Helper: convert a Tone.js pitch string back to a MIDI number for sorting. */
function pitchToMidi(pitch: string): number {
    const match = pitch.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return 0;
    const noteIdx = PITCH_CLASS_NAMES.indexOf(match[1]);
    const octave = parseInt(match[2], 10);
    return (octave + 1) * 12 + noteIdx;
}
