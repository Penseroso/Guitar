import type { ScaleRef } from '@/domain/scale/scale-ref';

export interface TonalFrame {
    tonic: string;
    mode: 'major' | 'minor';
    /** Rule applicability only; Roman accidentals always use a major-scale reference. */
    lens: 'jazz-pop' | 'classical';
}
export interface ChordRef { root: string; chordId: string; bass?: string }
export interface RomanRef { degree: number; alteration: number; chordId: string; appliedTo?: RomanRef }
export type RelationKind = 'dominant' | 'fifths' | 'ii-v' | 'tritone' | 'backdoor' | 'tonic-sub' | 'predominant' | 'minor-sub' | 'leading' | 'common-tone' | 'passing' | 'cadence';
export interface ObservationContext {
    before?: ChordRef;
    middle?: ChordRef;
    phraseEnding?: boolean;
    bassConfirmed?: boolean;
    rhythmConfirmed?: boolean;
    soprano?: string;
}
export interface RelationQuery {
    frame: TonalFrame;
    target: ChordRef;
    kind: RelationKind;
    context?: ObservationContext;
}
export interface HarmonyTone { degree: string; name: string; pitchClass: number }
export interface ResolvedHarmonyChord extends ChordRef { name: string; tones: HarmonyTone[]; rootPitchClass: number; bassPitchClass: number }
export interface RelationFacts { rootMotion: number; shared: number[]; removed: number[]; added: number[] }
export interface RelationStep {
    chord: ResolvedHarmonyChord;
    roman: string;
    role: string;
    guides: string[];
    /** Analysis-only spelling; keys still refer to canonical chord formula degrees. */
    toneLabels?: Record<string, { name: string; degree: string }>;
}
export interface ToneConnection {
    fromDegree: string;
    toDegree: string;
    /** `held` exactly when both ends share a pitch class. */
    kind: 'held' | 'resolution' | 'neighbor' | 'approach';
    /** A functional 3rd/7th line of a seventh chord. Never inferred from pitch overlap. */
    guide?: boolean;
}
/**
 * guide-tone: tendency lines including 3rd/7th lines in fifth motion or tritone substitution.
 * tendency: common tones plus fixed-direction tendency tones only. nearest: triad voice
 * leading, only moves every smallest one-to-one mapping agrees on. supplied: curated by the rule.
 */
export type ConnectionBasis = 'guide-tone' | 'tendency' | 'nearest' | 'supplied';
export interface RelationTransition { fromStep: number; toStep: number; basis?: ConnectionBasis; voices: ToneConnection[] }
export interface RelationExample {
    id: string;
    label: string;
    kind: 'comparison' | 'motion';
    steps: RelationStep[];
    facts: RelationFacts[];
    provenance?: 'illustration' | 'observation';
    /** Explicit, illustrative correspondences, not inferred optimal voice leading. */
    transitions?: RelationTransition[];
}
export type RelationStatus = 'matched' | 'possible' | 'insufficient-context' | 'unsupported';
export interface RelationCheck { id: string; label: string; state: 'pass' | 'fail' | 'unknown' }
export interface RelationInterpretation {
    id: string;
    label: string;
    status: RelationStatus;
    evidence: string[];
    missing: string[];
    ruleId: RelationKind;
}
export interface RelationResult {
    query: RelationQuery;
    status: RelationStatus;
    title: string;
    observations: string[];
    missing: string[];
    examples: RelationExample[];
    ruleId: RelationKind;
    scaleLinks: { label: string; ref: ScaleRef }[];
    interpretations?: RelationInterpretation[];
    checks?: RelationCheck[];
}
export interface TheoryRule { title: string; conditions: string[]; limits: string[]; sources: { title: string; url: string }[]; version: 'harmony-v1' }
