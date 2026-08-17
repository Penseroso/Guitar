export type HarmonicInterval = 3 | 4 | 6;

export interface DoubleStopPair {
    rootNoteIdx: number;
    targetNoteIdx: number;
    interval: HarmonicInterval;
}

export interface PlayableDoubleStop {
    string1: number;
    fret1: number;
    string2: number;
    fret2: number;
    pair: DoubleStopPair;
}
