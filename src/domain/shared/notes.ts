// Pure note-name theory — instrument-agnostic (12-tone chromatic spelling).

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function getNoteName(index: number, useFlats: boolean = false): string {
    return useFlats ? NOTES_FLAT[index % 12] : NOTES[index % 12];
}

export function getNoteIndex(noteName: string): number {
    return NOTES.indexOf(noteName);
}
