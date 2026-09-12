import type { ChordRegistryEntry } from '@/domain/chord/registry';
import { getKeyName } from '@/domain/shared/keys';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PITCHES = [0, 2, 4, 5, 7, 9, 11];

export function formatDegreeLabel(degree: string): string {
    return degree.replace(/b/g, '♭').replace(/#/g, '♯');
}

export function formatChordToneLabel(rootPitchClass: number, degree: string, interval: number): string {
    const degreeMatch = /^[b#]*(\d+)$/.exec(degree);
    if (!degreeMatch || Number(degreeMatch[1]) < 1) throw new RangeError(`Invalid chord degree: ${degree}`);
    const rootLetter = getKeyName(rootPitchClass)[0];
    const letterIndex = (LETTERS.indexOf(rootLetter) + Number(degreeMatch[1]) - 1) % 7;
    const pitchClass = ((rootPitchClass + interval) % 12 + 12) % 12;
    const accidental = ((pitchClass - NATURAL_PITCHES[letterIndex] + 18) % 12) - 6;
    const suffix = accidental < 0 ? '♭'.repeat(-accidental) : '♯'.repeat(accidental);
    return `${LETTERS[letterIndex]}${suffix} · ${formatDegreeLabel(degree)}`;
}

export function getChordToneChoices(entry: ChordRegistryEntry, rootPitchClass: number): { value: string; label: string }[] {
    return entry.formula.degrees.map((degree, index) => ({
        value: degree,
        label: formatChordToneLabel(rootPitchClass, degree, entry.formula.intervals[index]),
    }));
}
