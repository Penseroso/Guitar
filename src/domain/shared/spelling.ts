// Musical spelling — the letter-and-accidental layer that sits on top of pitch classes.
//
// A pitch class (0-11) is an identity: "the pitch 3 semitones above C". A spelling is a *name*
// for it inside a frame of reference: the same pitch class is D# as the #2 of Lydian #2, Eb as
// the b3 of Aeolian, and Fbb in theory nobody writes. Which name is right depends on the degree
// it is functioning as, never on the pitch class alone — so every function here takes that
// degree as an argument rather than guessing from a fixed table.
//
// Instrument-agnostic and frame-agnostic: callers supply the frame (a scale's degree formula, a
// chord's formula) and get back the spelling that frame implies.

/** Natural letters in scale order, and the pitch class each names with no accidental. */
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11] as const;

export interface SpelledNote {
    /** 0-6, indexing LETTERS. */
    letterIndex: number;
    /** Semitones away from the natural letter: -2 = double flat, +2 = double sharp. */
    alteration: number;
    pitchClass: number;
    /** Rendered name, e.g. "D#", "Bbb". */
    name: string;
}

/** A degree as written in a formula: `{ number: 7, alteration: -2 }` for "bb7". */
export interface DegreeSpelling {
    number: number;
    alteration: number;
}

function normalizePitchClass(value: number): number {
    return ((value % 12) + 12) % 12;
}

export function renderAccidental(alteration: number): string {
    if (alteration === 0) return '';
    return alteration > 0 ? '#'.repeat(alteration) : 'b'.repeat(-alteration);
}

/**
 * Normalizes Unicode accidentals (♭, ♯) in a string to ASCII (b, #).
 */
export function normalizeAccidentalsToAscii(text: string): string {
    return text.replace(/♭/g, 'b').replace(/♯/g, '#');
}

/**
 * Renders ASCII accidentals as Unicode for display: "Bbb" -> "B♭♭", "Cm7b5" -> "Cm7♭5".
 * Safe on a whole chord label as well as a bare note, since no chord suffix in the registry
 * uses a literal "b" or "#" that is not an accidental.
 */
export function formatAccidentals(text: string): string {
    return text.replace(/b/g, '♭').replace(/#/g, '♯');
}

/** Normalizes ASCII accidentals (b, #) to Unicode (♭, ♯). Alias of formatAccidentals. */
export const normalizeAccidentalsToUnicode = formatAccidentals;

/** Renders an ASCII-spelled note name (e.g. "Bbb") with Unicode accidentals. */
export const formatNoteName = formatAccidentals;

/** Unicode ♭/♯ for display surfaces (roman numerals), where ASCII reads as a typo. */
export function renderAccidentalSymbol(alteration: number): string {
    if (alteration === 0) return '';
    return alteration > 0 ? '♯'.repeat(alteration) : '♭'.repeat(-alteration);
}

export function parseNoteName(name: string): SpelledNote | null {
    const match = /^([A-Ga-g])(#{1,2}|b{1,2}|♯{1,2}|♭{1,2})?$/.exec(name.trim());
    if (!match) return null;

    const letterIndex = LETTERS.indexOf(match[1].toUpperCase() as typeof LETTERS[number]);
    const accidental = match[2] ?? '';
    const alteration = accidental.startsWith('#') || accidental.startsWith('♯')
        ? accidental.length
        : accidental.startsWith('b') || accidental.startsWith('♭')
            ? -accidental.length
            : 0;

    return {
        letterIndex,
        alteration,
        pitchClass: normalizePitchClass(LETTER_PITCH_CLASSES[letterIndex] + alteration),
        name: LETTERS[letterIndex] + renderAccidental(alteration),
    };
}

/**
 * Parses a formula degree as written: "1", "b3", "#4", "bb7", "#9", "b13".
 * Compound degrees keep their written number (9, 11, 13) — use `degreeToLetterStep` to fold them
 * into the 1-7 letter cycle.
 */
export function parseDegreeLabel(label: string): DegreeSpelling | null {
    const match = /^(#{1,2}|b{1,2}|♯{1,2}|♭{1,2})?(\d{1,2})$/.exec(label.trim());
    if (!match) return null;

    const accidental = match[1] ?? '';
    const alteration = accidental.startsWith('#') || accidental.startsWith('♯')
        ? accidental.length
        : accidental.startsWith('b') || accidental.startsWith('♭')
            ? -accidental.length
            : 0;

    return { number: Number(match[2]), alteration };
}

/** Folds a compound degree onto the 7-letter cycle: 9 -> 2, 11 -> 4, 13 -> 6. */
export function degreeToLetterStep(degreeNumber: number): number {
    return ((degreeNumber - 1) % 7) + 1;
}

/**
 * Spells `targetPitchClass` as the given degree above `tonic`. The letter follows from the degree
 * number (a 3rd is always two letters up, whatever its accidental); the accidental is then whatever
 * makes that letter land on the target pitch class — so the answer is forced, never chosen from a
 * table. Returns null if that would need more than a double accidental, which no supported scale
 * or chord reaches.
 */
export function spellDegree(tonic: SpelledNote, degreeNumber: number, targetPitchClass: number): SpelledNote | null {
    const letterIndex = (tonic.letterIndex + degreeToLetterStep(degreeNumber) - 1) % 7;
    const naturalPitchClass = LETTER_PITCH_CLASSES[letterIndex];

    let alteration = normalizePitchClass(targetPitchClass - naturalPitchClass);
    if (alteration > 6) alteration -= 12;
    if (alteration < -2 || alteration > 2) return null;

    return {
        letterIndex,
        alteration,
        pitchClass: normalizePitchClass(targetPitchClass),
        name: LETTERS[letterIndex] + renderAccidental(alteration),
    };
}

export const GENERIC_INTERVAL_ROMAN: Readonly<Record<number, string>> = {
    0: 'I',
    1: '♭II',
    2: 'II',
    3: '♭III',
    4: 'III',
    5: 'IV',
    6: '♭V',
    7: 'V',
    8: '♭VI',
    9: 'VI',
    10: '♭VII',
    11: 'VII',
};

const ROMAN_BY_DEGREE = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

/**
 * The uppercase roman numeral for a degree as written, e.g. "b3" -> "♭III", "#2" -> "♯II".
 * Quality (case, °, +) is the caller's business — this is only the numeral and its accidental.
 */
export function romanNumeralForDegree(degree: DegreeSpelling): string {
    const numeral = ROMAN_BY_DEGREE[degreeToLetterStep(degree.number) - 1];
    return renderAccidentalSymbol(degree.alteration) + numeral;
}

export type TriadQuality = 'Major' | 'Minor' | 'Diminished' | 'Augmented';

/**
 * Formats an uppercase roman numeral (with Unicode accidentals, e.g. "♭III", "♯II") according to
 * triad quality: lowercase for minor, lowercase + "°" for diminished, uppercase + "+" for
 * augmented, uppercase for major.
 */
export function formatTriadRomanNumeral(baseNumeral: string, quality: TriadQuality): string {
    const match = /^([♭♯]*)(.*)$/.exec(baseNumeral);
    if (!match) return baseNumeral;
    const [, accidentals, numeral] = match;
    if (quality === 'Minor') return `${accidentals}${numeral.toLowerCase()}`;
    if (quality === 'Diminished') return `${accidentals}${numeral.toLowerCase()}°`;
    if (quality === 'Augmented') return `${accidentals}${numeral}+`;
    return `${accidentals}${numeral}`;
}
