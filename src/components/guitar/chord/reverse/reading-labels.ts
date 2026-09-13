import { getChordRegistryEntry, getChordTypeSuffix } from '@/domain/chord';
import { formatChordToneLabel, formatDegreeLabel } from '@/domain/chord/engine/presentation';
import { getKeyName } from '@/domain/shared/keys';
import type { ChordReading, ChordReadingInversion, ChordReadingRole, ChordReadingTone } from '@/domain/chord/reverse/readings';

// Player-facing text only — reuses the same spelling primitives the forward panel already uses
// (formatChordToneLabel/formatDegreeLabel/getKeyName). No engine metadata, scores, ids or tiers
// are ever rendered; that boundary is enforced by a static-markup regression test.

function noteLetter(rootPitchClass: number, degree: string, pitchClass: number): string {
    // formatChordToneLabel returns "<letter> · <degree>"; the letter alone is the player-facing part.
    return formatChordToneLabel(rootPitchClass, degree, pitchClass - rootPitchClass).split(' · ')[0];
}

function baseName(reading: ChordReading): string {
    return `${getKeyName(reading.rootPitchClass)}${getChordTypeSuffix(reading.chordId)}`;
}

export function titleFor(reading: ChordReading): string {
    const base = baseName(reading);
    return reading.bass.relation === 'root' ? base : `${base}/${getKeyName(reading.bassPitchClass)}`;
}

export function soundingNoteLetters(reading: ChordReading): string[] {
    return reading.tones
        .filter((tone) => tone.sounding)
        .map((tone) => noteLetter(reading.rootPitchClass, tone.degree, tone.pitchClass));
}

export function bassNoteLetter(reading: ChordReading): string {
    return getKeyName(reading.bassPitchClass);
}

/** Interval labels for the same sounding tones soundingNoteLetters() lists, in the same order —
 *  computed against this reading's own root, so pairing the two arrays index-for-index is always
 *  correct for THIS reading specifically (unlike a shared bass-relative fretboard label). */
export function soundingIntervalLabels(reading: ChordReading): string[] {
    return reading.tones
        .filter((tone) => tone.sounding)
        .map((tone) => ROLE_LABELS[tone.role] ?? formatDegreeLabel(tone.degree));
}

/** A short, primary-surface label — "Omits 5" (matching the forward panel's own wording) or "Added F#". */
export function badgeFor(reading: ChordReading): string | null {
    if (reading.tier === 'added-tone' && reading.added !== null) return `Added ${getKeyName(reading.added)}`;
    if (reading.tier === 'incomplete' && reading.omitted.length > 0) {
        return `Omits ${reading.omitted.map(formatDegreeLabel).join(', ')}`;
    }
    return null;
}

const ROLE_LABELS: Partial<Record<ChordReadingRole, string>> = { root: 'Root', third: '3rd', fifth: '5th', seventh: '7th' };

function toneLine(reading: ChordReading, tone: ChordReadingTone): string {
    const label = ROLE_LABELS[tone.role] ?? formatDegreeLabel(tone.degree);
    const letter = noteLetter(reading.rootPitchClass, tone.degree, tone.pitchClass);
    return tone.sounding ? `${label}: ${letter}` : `${label}: ${letter} (not played)`;
}

const INVERSION_WORDS: Record<NonNullable<ChordReadingInversion>, string> = {
    first: 'first', second: 'second', third: 'third',
};

function bassLine(reading: ChordReading): string | null {
    if (reading.bass.relation === 'root') return null;
    const letter = bassNoteLetter(reading);
    return reading.bass.inversion
        ? `${letter} in bass → ${INVERSION_WORDS[reading.bass.inversion]} inversion`
        : `${letter} in bass`;
}

function addedLine(reading: ChordReading): string | null {
    return reading.added === null ? null : `Added note: ${getKeyName(reading.added)}`;
}

function sameNotesLine(reading: ChordReading, titleByKey: ReadonlyMap<string, string>): string | null {
    if (reading.sameNotesAs.length === 0) return null;
    const titles = reading.sameNotesAs.map((key) => titleByKey.get(key)).filter((title): title is string => !!title);
    return titles.length > 0 ? `Same notes also named: ${titles.join(', ')}` : null;
}

export interface ReadingExplanation {
    toneLines: string[];
    bassLine: string | null;
    addedLine: string | null;
    sameNotesLine: string | null;
}

/** "Why this name?" content. `titleByKey` should map every reading in the current result set (best +
 *  other + looser) to its titleFor() output, so cross-links can name the readings they point to. */
export function explainReading(reading: ChordReading, titleByKey: ReadonlyMap<string, string>): ReadingExplanation {
    return {
        toneLines: reading.tones.map((tone) => toneLine(reading, tone)),
        bassLine: bassLine(reading),
        addedLine: addedLine(reading),
        sameNotesLine: sameNotesLine(reading, titleByKey),
    };
}

export function buildTitleIndex(readings: readonly ChordReading[]): Map<string, string> {
    return new Map(readings.map((reading) => [reading.key, titleFor(reading)]));
}

export function isKnownChordId(chordId: string): boolean {
    return getChordRegistryEntry(chordId) !== undefined;
}
