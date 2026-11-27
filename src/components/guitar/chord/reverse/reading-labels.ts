import { chordRefFromReading } from '@/features/harmonic-workspace/links';
import { getChordTypeSuffix } from '@/domain/chord';
import { formatDegreeLabel, formatVoicingTone } from '@/domain/chord/engine/presentation';
import type { EnteredShapeNote } from '@/domain/chord/reverse/enteredShape';
import type { ChordReading, DyadInterval, IntervalQuality } from '@/domain/chord/reverse/readings';
import { getKeyName } from '@/domain/shared/keys';
import { formatNoteName } from '@/domain/shared/spelling';

export function titleFor(reading: ChordReading): string {
    const { root, chordId, bass } = chordRefFromReading(reading);
    const name = formatNoteName(root) + getChordTypeSuffix(chordId);
    return bass ? `${name}/${formatNoteName(bass)}` : name;
}

/** Map a played string to its role without reordering the shape or adding absent formula tones. */
export function playedTone(note: EnteredShapeNote, reading: ChordReading | null) {
    const tone = reading?.tones.find(item => item.pitchClass === note.pitchClass && item.sounding);
    if (tone && reading) return {
        name: formatVoicingTone(reading.rootPitchClass, tone.degree, note.midi, true),
        degree: tone.degree === '1' ? 'Root' : formatDegreeLabel(tone.degree),
    };
    return { name: formatVoicingTone(note.pitchClass, '1', note.midi, true), degree: reading ? 'Added' : null };
}

/** Keep formula spellings and identify the extra pitch of an added-tone reading. */
export function fretboardDegreeOverrides(reading: ChordReading, fingering: readonly { string: number; fret: number; noteIdx: number }[]): Partial<Record<string, string>> {
    const labelByPitchClass = new Map(reading.tones.map((tone) => [tone.pitchClass, tone.degree === '1' ? 'R' : formatDegreeLabel(tone.degree)]));
    if (reading.added !== null) labelByPitchClass.set(reading.added, '+');
    const overrides: Partial<Record<string, string>> = {};
    for (const { string, fret, noteIdx } of fingering) {
        const label = labelByPitchClass.get(noteIdx);
        if (label) overrides[`${string}:${fret}`] = label;
    }
    return overrides;
}

/** A short, primary-surface label — "Omits 5" (matching the forward panel's own wording) or "Added F#". */
export function badgeFor(reading: ChordReading): string | null {
    if (reading.tier === 'added-tone' && reading.added !== null) return `Added ${formatNoteName(getKeyName(reading.added))}`;
    if (reading.tier === 'incomplete' && reading.omitted.length > 0) {
        return `Omits ${reading.omitted.map(formatDegreeLabel).join(', ')}`;
    }
    return null;
}

const INTERVAL_QUALITY_LABELS: Record<IntervalQuality, string> = {
    unison: 'Unison', m2: 'm2', M2: 'M2', m3: 'm3', M3: 'M3', P4: 'P4', tritone: 'Tritone',
    P5: 'P5', m6: 'm6', M6: 'M6', m7: 'm7', M7: 'M7', octave: 'Octave',
};

export interface DyadDescription {
    bassLetter: string;
    otherLetter: string;
    bassToOtherLine: string;
    otherToBassLine: string;
}

/** Two notes are a bare interval, not an underdetermined chord — presented bidirectionally rather
 *  than forced through chord-name inference (see inferChordReadings' dyad branch). */
export function describeDyad(dyad: DyadInterval): DyadDescription {
    const bassLetter = getKeyName(dyad.bass.pitchClass);
    const otherLetter = getKeyName(dyad.other.pitchClass);
    return {
        bassLetter, otherLetter,
        bassToOtherLine: `${bassLetter} → ${otherLetter}: ${INTERVAL_QUALITY_LABELS[dyad.bassToOther]}`,
        otherToBassLine: `${otherLetter} → ${bassLetter}: ${INTERVAL_QUALITY_LABELS[dyad.otherToBass]}`,
    };
}
