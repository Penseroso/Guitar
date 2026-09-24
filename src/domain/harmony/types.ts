import type { ScaleRef } from '@/domain/scale/scale-ref';

export interface TonalFrame {
    tonic: string;
    mode: 'major' | 'minor';
    lens: 'jazz-pop' | 'classical';
}
export interface ChordRef { root: string; chordId: string; bass?: string }
export interface RomanRef { degree: number; alteration: number; chordId: string; appliedTo?: RomanRef }
export type RelationKind = 'dominant' | 'fifths' | 'ii-v' | 'tritone' | 'tonic-sub' | 'predominant' | 'minor-sub' | 'leading' | 'common-tone' | 'passing' | 'cadence';
export interface ObservationContext {
    before?: ChordRef;
    middle?: ChordRef;
    phraseEnding?: boolean;
    bassConfirmed?: boolean;
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
export interface RelationStep { chord: ResolvedHarmonyChord; roman: string; role: string; guides: string[] }
export interface RelationExample { id: string; label: string; kind: 'comparison' | 'motion'; steps: RelationStep[]; facts: RelationFacts[] }
export type RelationStatus = 'matched' | 'possible' | 'insufficient-context' | 'unsupported';
export interface RelationResult {
    query: RelationQuery;
    status: RelationStatus;
    title: string;
    observations: string[];
    missing: string[];
    examples: RelationExample[];
    ruleId: RelationKind;
    scaleLinks: { label: string; ref: ScaleRef }[];
}
export interface TheoryRule { title: string; conditions: string[]; limits: string[]; sources: { title: string; url: string }[]; version: 'harmony-v1' }
