import { resolveScaleRef, type ScaleRef } from './scale-ref';

/** Source locators identify the supporting lesson, not a blanket endorsement of every use. */
export const SOURCE_CATALOG = {
    modes: {
        title: 'Guitar Modes & Scales', author: 'Dirk Laukens, Jazz Guitar Online',
        url: 'https://www.jazzguitar.be/blog/guitar-modes/',
        locator: 'How to Use Modes: sections 1–7, characteristic notes and Ionian fourth',
    },
    harmonic: {
        title: 'Modes of the Harmonic Minor Scale', author: 'Stef Ramin, Jazz Guitar Licks',
        url: 'https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-harmonic-minor-scale/',
        locator: 'The Seven Modes: interval formulas and linked mode lessons',
    },
    melodic: {
        title: 'Modes of the Melodic Minor Scale', author: 'Stef Ramin, Jazz Guitar Licks',
        url: 'https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-melodic-minor-scale/',
        locator: 'The Seven Modes: formulas from melodic minor through Super Locrian',
    },
    dominant: {
        title: 'Jazz Scales You Need to Know for Improvisation', author: 'Gary Burton, Berklee Online',
        url: 'https://online.berklee.edu/takenote/jazz-improvisation-10-scales/',
        locator: 'Three Dominant Alternatives; Altered; Symmetrical Diminished and its whole–half note',
    },
    context: {
        title: 'Simplifying Jazz Harmonic Theory with Suzanna Sifter', author: 'Jonathan Feist / Suzanna Sifter, Berklee Online',
        url: 'https://online.berklee.edu/takenote/simplifying-jazz-harmonic-theory-an-interview-with-suzanna-sifter/',
        locator: 'Tension substitution; Should you always actually avoid the avoid notes?',
    },
    wholeTone: {
        title: 'The Whole Tone Scale', author: 'Dirk Laukens, Jazz Guitar Online',
        url: 'https://www.jazzguitar.be/blog/whole-tone-scale/',
        locator: 'Whole tone scale construction and dominant applications',
    },
    majorPentatonic: {
        title: 'Major Chords for Jazz Guitar', author: 'Dirk Laukens, Jazz Guitar Online',
        url: 'https://www.jazzguitar.be/blog/major-chords/',
        locator: 'How to Improvise over Major 6 Chords: The C Major Pentatonic Scale',
    },
    minorPentatonic: {
        title: 'The Minor Pentatonic Scale', author: 'Dirk Laukens, Jazz Guitar Online',
        url: 'https://www.jazzguitar.be/blog/minor-pentatonic-scale/',
        locator: 'Minor Pentatonic Scale Construction; Applications in Jazz',
    },
} as const;

export type SourceRefId = keyof typeof SOURCE_CATALOG;
export interface InterpretationProvenance {
    /** Reviewed against the linked source; not a universal rule or numeric confidence. */
    status: 'draft' | 'reviewed';
    sourceRefs: SourceRefId[];
}
export interface IdentityMarker { degree: string; interval: number }
export interface IdentityInterpretation extends InterpretationProvenance {
    markers: IdentityMarker[];
    explanation: string;
}
export interface ToneInterpretation extends InterpretationProvenance {
    kind: 'characteristic' | 'tension' | 'caution';
    explanation: string;
    conditions: string[];
}

function reviewed(source: SourceRefId, explanation: string, markers: [string, number][] = []): IdentityInterpretation {
    return { status: 'reviewed', sourceRefs: [source], explanation,
        markers: markers.map(([degree, interval]) => ({ degree, interval })) };
}

/** Authored pedagogical choices. Never derive markers from a parallel-scale difference. */
const IDENTITIES: Record<string, Record<string, IdentityInterpretation>> = {
    'Diatonic Modes': {
        Ionian: reviewed('modes', 'Major third and major seventh establish the major-scale identity.', [['3', 4], ['7', 11]]),
        Dorian: reviewed('modes', 'Natural 6 gives this minor mode its characteristic colour.', [['6', 9]]),
        Phrygian: reviewed('modes', 'The lowered second is the defining colour against a minor tonic.', [['b2', 1]]),
        Lydian: reviewed('modes', 'A raised fourth colours a major tonic.', [['#4', 6]]),
        Mixolydian: reviewed('modes', 'The minor seventh gives this major-third mode its dominant identity.', [['b7', 10]]),
        Aeolian: reviewed('modes', 'Natural minor; the lowered sixth distinguishes its colour from Dorian.', [['b6', 8]]),
        Locrian: reviewed('modes', 'The diminished fifth supports a half-diminished tonic structure.', [['b5', 6]]),
    },
    'Harmonic Minor Modes': {
        'Harmonic Minor': reviewed('harmonic', 'Minor third, lowered sixth and a leading seventh form harmonic minor.', [['b6', 8], ['7', 11]]),
        'Locrian #6': reviewed('harmonic', 'A natural sixth colours the half-diminished structure.', [['6', 9]]),
        'Ionian #5': reviewed('harmonic', 'Raised fifth with a major seventh gives an augmented-major colour.', [['#5', 8]]),
        'Dorian #4': reviewed('harmonic', 'A raised fourth adds colour to the minor-third, natural-sixth structure.', [['#4', 6]]),
        'Phrygian Dominant': reviewed('harmonic', 'Major third beside a lowered second creates this dominant colour.', [['b2', 1], ['3', 4]]),
        'Lydian #2': reviewed('harmonic', 'Raised second and raised fourth define this major mode.', [['#2', 3], ['#4', 6]]),
        Ultralocrian: reviewed('harmonic', 'The seventh harmonic-minor rotation has a diminished fourth and diminished seventh.', [['b4', 4], ['bb7', 9]]),
    },
    'Jazz Minor Modes': {
        'Jazz Minor': reviewed('melodic', 'Minor third with natural sixth and major seventh; this collection is used in both directions.', [['6', 9], ['7', 11]]),
        'Dorian b2 (Assyrian)': reviewed('melodic', 'Lowered second and natural sixth combine in this minor mode.', [['b2', 1], ['6', 9]]),
        'Lydian Augmented': reviewed('melodic', 'Raised fourth and raised fifth combine over a major-third structure.', [['#4', 6], ['#5', 8]]),
        'Lydian Dominant': reviewed('melodic', 'Raised fourth with a minor seventh gives a dominant colour.', [['#4', 6], ['b7', 10]]),
        'Mixolydian b6': reviewed('melodic', 'A lowered sixth colours this major-third, minor-seventh mode.', [['b6', 8]]),
        'Locrian ♮2': reviewed('melodic', 'Natural second distinguishes this half-diminished colour from Locrian.', [['2', 2]]),
        'Altered scale': reviewed('dominant', 'An altered tension field: b9, #9, #11 and b13 surround the dominant 1, 3 and b7. There is no natural fifth.', [['b9', 1], ['#9', 3], ['#11', 6], ['b13', 8]]),
    },
    Symmetric: {
        Diminished: reviewed('dominant', 'Alternating whole and half steps support diminished-seventh harmony. This is the whole–half form.'),
        'Half-Whole Diminished': reviewed('dominant', 'Alternating half and whole steps support dominant harmony: b9, #9, #11 and natural 13, with a natural fifth.'),
        'Whole Tone': reviewed('wholeTone', 'Six equally spaced notes form an augmented colour: 9, #11 and #5 over a dominant framework, without a natural fifth.'),
    },
    Pentatonic: {
        'Major Pentatonic': reviewed('majorPentatonic', 'A five-note major collection, omitting the fourth and seventh. Its open structure is more useful here than one privileged characteristic note.'),
        'Minor Pentatonic': reviewed('minorPentatonic', 'Minor-third and minor-seventh colours with root, fourth and fifth. The five-note structure omits the second and sixth.'),
    },
};

export function getScaleIdentity(ref: ScaleRef): IdentityInterpretation | null {
    const scale = resolveScaleRef(ref);
    if (!scale) return null;
    const identity = IDENTITIES[scale.group]?.[scale.name];
    if (!identity || identity.status !== 'reviewed') return null;
    return { ...identity, markers: identity.markers.map(marker => ({ ...marker })), sourceRefs: [...identity.sourceRefs] };
}
