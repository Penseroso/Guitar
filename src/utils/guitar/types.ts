export interface ChordShape {
    name: string;
    baseRootString: number; // 0-5 (Index in TUNING array)
    offsets: (number | null)[]; // Fret offsets for strings 0-5 (High E -> Low E), null means Mute
}

export type Mode = 'scale' | 'chord' | 'progression';

export interface FretboardProps {
    tuning?: number[];
    activeNotes: number[];
    rootNote: number;
    chordTones: number[];
    modifierNotes: number[];
    showChordTones: boolean;
    showIntervals?: boolean;
    scaleIntervalLabels?: Partial<Record<number, string>>;
    fingering?: Fingering[];
    doubleStops?: PlayableDoubleStop[];
}

export interface Fingering {
    string: number;
    fret: number;
    noteIdx: number;
    label?: string;
}

export interface DoubleStopPair {
    rootNoteIdx: number;
    targetNoteIdx: number;
    interval: number;
}

export interface PlayableDoubleStop {
    string1: number;
    fret1: number;
    string2: number;
    fret2: number;
    pair: DoubleStopPair;
}

export type HarmonicFunction = 'Tonic' | 'Subdominant' | 'Dominant' | 'Applied_Dominant' | 'Tritone_Substitute' | 'Modal_Interchange';

export interface ChordNode {
    id: string;
    displayDegree: string;       // UI 표시용 (예: "V7/vi")
    coreDegree: string;          // 연산용 핵심 도수 (예: "III")
    durationInBeats: number;     // 박자 수 (기본 4)
    harmonicFunction: HarmonicFunction;
    targetNodeId?: string;       // 꾸며주는 타겟 노드 ID (화살표 렌더링용)
    isSecondary: boolean;        // true일 경우 메인 노드 상단/하단에 작게 기생하여 렌더링
}

export interface Measure {
    id: string;
    index: number;
    timeSignature: [number, number]; // [4, 4]
    nodes: ChordNode[];
}

export interface ProgressionDocument {
    measures: Measure[];
}
