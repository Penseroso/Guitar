/**
 * Progression chord preview pitch resolver.
 * Converts harmonic data into a compact voiced chord preview for the inspector play button.
 * This is a voicing heuristic, not string/fret playback and not a future fingering engine.
 */

const PITCH_CLASS_NAMES: readonly string[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

function midiToTonePitch(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    const name = PITCH_CLASS_NAMES[midi % 12];
    return `${name}${octave}`;
}

export function resolveProgressionChordPitches(rootPitchClass: number, intervals: number[]): string[] {
    // Anchor the root in the MIDI 40–51 range (E2–Eb3).
    const ROOT_MIDI_MIN = 40;
    const ROOT_MIDI_MAX = 51;

    let rootMidi = ROOT_MIDI_MIN + ((rootPitchClass - (ROOT_MIDI_MIN % 12) + 12) % 12);
    if (rootMidi > ROOT_MIDI_MAX) rootMidi -= 12;

    const pitches: string[] = [];

    for (const interval of intervals) {
        if (interval === 0) {
            pitches.push(midiToTonePitch(rootMidi));
        } else {
            // Upper voices are stacked above the anchored root for a compact preview voicing.
            const upperBase = rootMidi + 12;
            let midi = upperBase + (interval % 12);
            if (midi < upperBase) midi += 12;
            pitches.push(midiToTonePitch(midi));
        }
    }

    pitches.sort((a, b) => pitchToMidi(a) - pitchToMidi(b));

    return pitches;
}

function pitchToMidi(pitch: string): number {
    const match = pitch.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return 0;
    const noteIdx = PITCH_CLASS_NAMES.indexOf(match[1]);
    const octave = parseInt(match[2], 10);
    return (octave + 1) * 12 + noteIdx;
}
