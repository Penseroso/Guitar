import { getChordRegistryEntry, getChordTypeSuffix } from '@/domain/chord';
import { formatChordToneLabel, formatDegreeLabel } from '@/domain/chord/engine/presentation';
import { getKeyName } from '@/domain/shared/keys';
import type { ChordReading, ChordReadingInversion, DyadInterval, IntervalQuality } from '@/domain/chord/reverse/readings';

// Player-facing text only — reuses the same spelling primitives the forward panel already uses
// (formatChordToneLabel/formatDegreeLabel/getKeyName). No engine metadata, scores, ids or tiers
// are ever rendered; that boundary is enforced by a static-markup regression test.

function noteLetter(rootPitchClass: number, degree: string, pitchClass: number): string {
    // formatChordToneLabel returns "<letter> · <degree>"; the letter alone is the player-facing part.
    return formatChordToneLabel(rootPitchClass, degree, pitchClass - rootPitchClass).split(' · ')[0];
}

/** The formula degree itself (Root, 3, ♭5, ♯5, ♭7…) — never a role word like "5th", which would
 *  hide an alteration (a ♯5 tone is still "the 5th" by role, but showing "5th" for it silently
 *  drops the sharp that makes the chord what it is). */
function degreeLabel(degree: string): string {
    return degree === '1' ? 'Root' : formatDegreeLabel(degree);
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

/** Degree labels for the same sounding tones soundingNoteLetters() lists, in the same order — the
 *  literal formula degree (Root/3/♭5/♯5/♭7…), not a role word, so an altered tone never silently
 *  reads as its unaltered role (e.g. a ♯5 must never show as "5th"). */
export function soundingIntervalLabels(reading: ChordReading): string[] {
    return reading.tones.filter((tone) => tone.sounding).map((tone) => degreeLabel(tone.degree));
}

/** Per-(string,fret) degree-label overrides for Fretboard's showIntervals rendering — Fretboard's
 *  own generic chromatic table (INTERVAL_NAMES) always canonicalizes a semitone distance to one
 *  fixed spelling (e.g. 8 semitones is always "b6"), which would mislabel a ♯5 tone. Every sounding
 *  formula tone gets its literal degree instead; a non-formula (added) note is left to the generic
 *  fallback, since it has no degree of its own. */
export function fretboardDegreeOverrides(reading: ChordReading, fingering: readonly { string: number; fret: number; noteIdx: number }[]): Partial<Record<string, string>> {
    const labelByPitchClass = new Map(reading.tones.map((tone) => [tone.pitchClass, tone.degree === '1' ? 'R' : formatDegreeLabel(tone.degree)]));
    const overrides: Partial<Record<string, string>> = {};
    for (const { string, fret, noteIdx } of fingering) {
        const label = labelByPitchClass.get(noteIdx);
        if (label) overrides[`${string}:${fret}`] = label;
    }
    return overrides;
}

/** A short, primary-surface label — "Omits 5" (matching the forward panel's own wording) or "Added F#". */
export function badgeFor(reading: ChordReading): string | null {
    if (reading.tier === 'added-tone' && reading.added !== null) return `Added ${getKeyName(reading.added)}`;
    if (reading.tier === 'incomplete' && reading.omitted.length > 0) {
        return `Omits ${reading.omitted.map(formatDegreeLabel).join(', ')}`;
    }
    return null;
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

function sameNotesLine(reading: ChordReading, titleByKey: ReadonlyMap<string, string>): string | null {
    if (reading.sameNotesAs.length === 0) return null;
    const titles = reading.sameNotesAs.map((key) => titleByKey.get(key)).filter((title): title is string => !!title);
    return titles.length > 0 ? `Same notes also named: ${titles.join(', ')}` : null;
}

export interface ReadingExplanation {
    bassLine: string | null;
    sameNotesLine: string | null;
}

/** `titleByKey` should map every reading in the current result set (best + other + looser) to its
 *  titleFor() output, so the same-notes cross-link can name the readings it points to. */
export function explainReading(reading: ChordReading, titleByKey: ReadonlyMap<string, string>): ReadingExplanation {
    return {
        bassLine: bassLine(reading),
        sameNotesLine: sameNotesLine(reading, titleByKey),
    };
}

export function buildTitleIndex(readings: readonly ChordReading[]): Map<string, string> {
    return new Map(readings.map((reading) => [reading.key, titleFor(reading)]));
}

export function isKnownChordId(chordId: string): boolean {
    return getChordRegistryEntry(chordId) !== undefined;
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
