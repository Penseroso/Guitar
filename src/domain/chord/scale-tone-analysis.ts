import { getScaleIdentity, type IdentityInterpretation, type SourceRefId, type ToneInterpretation } from '@/domain/scale/scale-identity';
import { resolveScaleRef, type ScaleRef } from '@/domain/scale/scale-ref';
import { getScaleStructuralTones, type ScaleStructuralTone } from '@/domain/scale/scale-tones';
import { getKeyName } from '@/domain/shared/keys';
import { parseDegreeLabel, parseNoteName, spellDegree } from '@/domain/shared/spelling';
import { getScaleCompatibleChords, type ScaleCompatibleChord } from './chord-scale-compatibility';
import { canonicalTone } from './engine/catalog';
import { CHORD_REGISTRY } from './registry';

type ChordSpelling = { chordDegree: string; chordNoteName: string } | { chordDegree: null; chordNoteName: null };
export type ToneFact = ChordSpelling & ScaleStructuralTone & {
    chordMembership: 'member' | 'non-member' | 'no-context';
    interpretations: ToneInterpretation[];
};
export interface ScaleToneAnalysis {
    scaleRef: ScaleRef;
    identity: IdentityInterpretation;
    chord: ScaleCompatibleChord | null;
    tones: ToneFact[];
}

interface TensionProfile {
    degrees: Readonly<Record<number, string>>;
    sourceRefs: SourceRefId[];
}
const profile = (source: SourceRefId, degrees: Record<number, string>): TensionProfile => ({ degrees, sourceRefs: [source, 'context'] });

/**
 * Educational interval readings, NOT a recommendation table. They are consulted only after
 * the existing compatibility registry establishes a curated pairing. No containment-derived
 * recommendation or automatic available/avoid classification is made here.
 */
const TENSION_PROFILES: Record<string, Record<string, TensionProfile>> = {
    'Diatonic Modes': {
        Ionian: profile('modes', { 2: '9', 5: '11', 9: '13', 11: '7' }),
        Dorian: profile('modes', { 2: '9', 5: '11', 9: '13', 10: 'b7' }),
        Phrygian: profile('modes', { 1: 'b9', 5: '11', 8: 'b13' }),
        Lydian: profile('modes', { 2: '9', 6: '#11', 9: '13' }),
        Mixolydian: profile('modes', { 2: '9', 4: '3', 5: '11', 9: '13' }),
        Aeolian: profile('modes', { 2: '9', 5: '11', 8: 'b13', 10: 'b7' }),
        Locrian: profile('modes', { 1: 'b9', 5: '11', 8: 'b13' }),
    },
    'Harmonic Minor Modes': {
        'Harmonic Minor': profile('harmonic', { 2: '9', 5: '11', 8: 'b13' }),
        'Locrian #6': profile('harmonic', { 1: 'b9', 5: '11', 9: '13' }),
        'Ionian #5': profile('harmonic', { 2: '9', 5: '11', 9: '13' }),
        'Dorian #4': profile('harmonic', { 2: '9', 6: '#11', 9: '13' }),
        'Phrygian Dominant': profile('harmonic', { 1: 'b9', 5: '11', 8: 'b13' }),
    },
    'Jazz Minor Modes': {
        'Jazz Minor': profile('melodic', { 2: '9', 5: '11', 9: '13' }),
        'Lydian Augmented': profile('melodic', { 2: '9', 6: '#11', 9: '13' }),
        'Lydian Dominant': profile('dominant', { 2: '9', 6: '#11', 9: '13' }),
        'Mixolydian b6': profile('melodic', { 2: '9', 5: '11', 8: 'b13' }),
        'Locrian ♮2': profile('melodic', { 2: '9', 5: '11', 8: 'b13' }),
        'Altered scale': profile('dominant', { 1: 'b9', 3: '#9', 6: '#11', 8: 'b13' }),
    },
    Symmetric: {
        Diminished: profile('dominant', { 2: '9', 5: '11', 8: 'b13', 11: '7' }),
        'Half-Whole Diminished': profile('dominant', { 1: 'b9', 3: '#9', 6: '#11', 9: '13' }),
        'Whole Tone': profile('wholeTone', { 2: '9', 6: '#11', 10: 'b7' }),
    },
    Pentatonic: {
        'Major Pentatonic': profile('majorPentatonic', { 2: '9', 9: '13' }),
        'Minor Pentatonic': profile('minorPentatonic', { 5: '11', 10: 'b7' }),
    },
};

function spell(tonic: number, degree: string, pitchClass: number): string | null {
    const root = parseNoteName(getKeyName(tonic));
    const parsed = parseDegreeLabel(degree);
    return root && parsed ? spellDegree(root, parsed.number, pitchClass)?.name ?? null : null;
}

function getCautions(group: string, name: string, interval: number, member: boolean, chordIntervals: number[]): ToneInterpretation[] {
    if (member) return [];
    // Explicit reviewed contexts, never a general semitone-distance classifier.
    if (interval === 5 && chordIntervals.includes(4)
        && ['Ionian', 'Mixolydian', 'Ionian #5', 'Phrygian Dominant', 'Mixolydian b6'].includes(name)) {
        return [{ kind: 'caution', status: 'reviewed', sourceRefs: ['modes', 'context'],
            explanation: 'A sustained natural 11 can rub against the major third. Passing motion or deliberate spacing can use that sound.',
            conditions: ['The selected chord includes a major third.', 'Judge duration and voicing; this is not a forbidden note.'] }];
    }
    if (group === 'Diatonic Modes' && name === 'Phrygian' && interval === 1) {
        return [{ kind: 'caution', status: 'reviewed', sourceRefs: ['modes', 'context'],
            explanation: 'The b9 is central to Phrygian colour; sustaining it against the root deliberately emphasizes that tension.',
            conditions: ['A Phrygian modal colour is intended.', 'Compare a held tone with a passing or resolving use.'] }];
    }
    return [];
}

/** No fallback scale/chord: invalid or unselectable analysis contexts return null. */
export function getScaleToneAnalysis(ref: ScaleRef, chordId: string | null = null): ScaleToneAnalysis | null {
    const scale = resolveScaleRef(ref);
    const identity = getScaleIdentity(ref);
    const structuralTones = getScaleStructuralTones(ref);
    if (!scale || !identity || !structuralTones) return null;
    const chord = chordId === null ? null : getScaleCompatibleChords(scale.group, scale.name, scale.tonic)
        .find(candidate => candidate.chordId === chordId) ?? null;
    if (chordId !== null && !chord) return null;
    const entry = chord ? CHORD_REGISTRY[chord.chordId] : null;
    const tensionProfile = chord && chord.basis !== 'containment' ? TENSION_PROFILES[scale.group]?.[scale.name] : undefined;
    const tones: ToneFact[] = [];

    for (const structuralTone of structuralTones) {
        const { interval, pitchClass } = structuralTone;
        const chordToneIndex = entry?.formula.intervals.findIndex(value => value % 12 === interval) ?? -1;
        const member = chordToneIndex >= 0;
        const chordDegree = member && entry
            ? canonicalTone(entry.id, entry.formula.degrees[chordToneIndex])
            : tensionProfile?.degrees[interval] ?? null;
        const chordNoteName = chordDegree === null ? null : spell(scale.tonic, chordDegree, pitchClass);
        if (chordDegree !== null && chordNoteName === null) return null;
        const interpretations: ToneInterpretation[] = [];
        if (identity.markers.some(marker => marker.interval === interval)) {
            interpretations.push({ kind: 'characteristic', explanation: identity.explanation,
                conditions: ['Describes this scale identity, independently of the chosen chord.'],
                status: 'reviewed', sourceRefs: [...identity.sourceRefs] });
        }
        // Only extensions receive tension explanations; a missing seventh stays a degree fact.
        if (tensionProfile && chordDegree && (parseDegreeLabel(chordDegree)?.number ?? 0) >= 9) {
            interpretations.push({ kind: 'tension', status: 'reviewed', sourceRefs: [...tensionProfile.sourceRefs],
                explanation: scale.name === 'Dorian' && interval === 2
                    ? '9 is an available Dorian tension in this minor context.'
                    : `${chordDegree} is a colour in this chord-scale interpretation.`,
                conditions: [member ? 'Already included in the selected chord formula.' : 'Not included in the selected chord formula.',
                    'Voicing, duration and musical context determine how strongly to emphasize it.'] });
        }
        if (entry && tensionProfile) interpretations.push(...getCautions(scale.group, scale.name, interval, member, entry.formula.intervals));
        const chordSpelling: ChordSpelling = chordDegree !== null && chordNoteName !== null
            ? { chordDegree, chordNoteName } : { chordDegree: null, chordNoteName: null };
        tones.push({ ...structuralTone, ...chordSpelling,
            chordMembership: chord === null ? 'no-context' : member ? 'member' : 'non-member', interpretations });
    }
    return { scaleRef: { ...ref }, identity, chord, tones };
}
