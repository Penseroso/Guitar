export type PitchClass = number;
export type GuitarStringIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type VoicingProvenanceSourceKind = 'legacy-import' | 'generated' | 'curated';
export type VoicingRegisterBand = 'low' | 'mid' | 'high' | 'upper';
export type VoicingFamily = 'shell' | 'compact' | 'close' | 'spread' | 'upper-register' | 'rootless' | 'full';

export interface ChordTone {
    degree: string;
    interval: number;
    pitchClass: PitchClass;
    isRequired?: boolean;
    role?: 'root' | 'third' | 'fifth' | 'seventh' | 'extension' | 'alteration' | 'suspension';
}

export interface ChordTones {
    rootPitchClass: PitchClass;
    intervals: number[];
    tones: ChordTone[];
}

export interface ChordDefinition {
    id: string;
    symbol: string;
    rootPitchClass: PitchClass;
    quality: string;
    intervals: number[];
    extensions?: string[];
    alterations?: string[];
    slashBassPitchClass?: PitchClass;
    tags?: string[];
}

export interface VoicingTemplateString {
    string: GuitarStringIndex;
    fretOffset: number | null;
    toneDegree?: string;
    isOptional?: boolean;
}

export interface VoicingTemplate {
    id: string;
    // Migration-only seed/debug label. User-facing naming must come from the derived descriptor.
    label: string;
    instrument: 'guitar';
    rootString?: GuitarStringIndex;
    strings: VoicingTemplateString[];
    source?: 'legacy-shape' | 'generated' | 'curated';
    tags?: string[];
}

export interface VoicingProvenance {
    sourceKind: VoicingProvenanceSourceKind;
    seedId?: string;
    debugLabel?: string;
}

export interface VoicingDescriptor {
    chordId: string;
    rootPitchClass: PitchClass;
    slashBassPitchClass?: PitchClass;
    playedStrings: GuitarStringIndex[];
    noteCount: number;
    rootString?: GuitarStringIndex;
    lowestPlayedString?: GuitarStringIndex;
    highestPlayedString?: GuitarStringIndex;
    lowestPlayedPitchClass?: PitchClass;
    highestPlayedPitchClass?: PitchClass;
    topVoicePitchClass?: PitchClass;
    bassPitchClass?: PitchClass;
    playedPitchClasses: PitchClass[];
    matchedRequiredDegrees: string[];
    missingRequiredDegrees: string[];
    optionalCoverageDegrees: string[];
    omittedOptionalDegrees: string[];
    registerBand: VoicingRegisterBand;
    family: VoicingFamily;
    inversion: 'root-position' | 'inversion' | 'slash-bass' | 'rootless';
    hasRoot: boolean;
    satisfiesSlashBass?: boolean;
    provenance: VoicingProvenance;
}

export interface VoicingConstraints {
    tuning: PitchClass[];
    minFret?: number;
    maxFret?: number;
    maxReach?: number;
    allowedRootsOnStrings?: GuitarStringIndex[];
    requiredDegrees?: string[];
    omittedDegrees?: string[];
    allowOpenStrings?: boolean;
}

export interface ResolvedVoicingNote {
    string: GuitarStringIndex;
    fret: number;
    pitchClass: PitchClass;
    midiNote?: number;
    degree?: string;
    isRoot?: boolean;
    isMuted?: boolean;
}

export interface ResolvedVoicing {
    id: string;
    chord: ChordDefinition;
    template?: VoicingTemplate;
    provenance: VoicingProvenance;
    descriptor: VoicingDescriptor;
    notes: ResolvedVoicingNote[];
    rootFret?: number;
    positionIndex?: number;
    minFret: number;
    maxFret: number;
    span: number;
    playable: boolean;
    lowestPlayedPitchClass?: PitchClass;
    satisfiesSlashBass?: boolean;
    missingRequiredDegrees?: string[];
    omittedOptionalDegrees?: string[];
    omittedDegrees?: string[];
}

export interface VoicingCandidate {
    voicing: ResolvedVoicing;
    score: number;
    reasons: string[];
    matchedRequiredDegrees: string[];
    missingRequiredDegrees: string[];
}

export type VoicingRankingMode = 'balanced' | 'compact' | 'beginner' | 'upper-register';

export interface ChordInterpretationCandidate {
    definition: ChordDefinition;
    tones: ChordTones;
    matchedPitchClasses: PitchClass[];
    missingPitchClasses: PitchClass[];
    extraPitchClasses: PitchClass[];
    confidence?: number;
}
