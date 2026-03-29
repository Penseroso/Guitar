export type PitchClass = number;
export type GuitarStringIndex = 0 | 1 | 2 | 3 | 4 | 5;

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
    label: string;
    instrument: 'guitar';
    rootString?: GuitarStringIndex;
    strings: VoicingTemplateString[];
    source?: 'legacy-shape' | 'generated' | 'curated';
    tags?: string[];
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
    notes: ResolvedVoicingNote[];
    minFret: number;
    maxFret: number;
    span: number;
    playable: boolean;
    omittedDegrees?: string[];
}

export interface VoicingCandidate {
    voicing: ResolvedVoicing;
    score: number;
    reasons: string[];
    matchedRequiredDegrees: string[];
    missingRequiredDegrees: string[];
}

export interface ChordInterpretationCandidate {
    definition: ChordDefinition;
    tones: ChordTones;
    matchedPitchClasses: PitchClass[];
    missingPitchClasses: PitchClass[];
    extraPitchClasses: PitchClass[];
    confidence?: number;
}
