import type { ScaleRef } from '@/domain/scale/scale-ref';
import type { ChordRef, TonalFrame } from '@/domain/harmony/types';

export interface TabSource { line: number; column: number }
/** Exact quarter-note units; optional input, never inferred from ASCII spacing. */
export interface TabFraction { numerator: number; denominator: number }
export interface TabMeter { numerator: number; denominator: number }
export type TabTechnique =
    | { kind: 'hammer-on' | 'pull-off' | 'slide'; toNoteId: string; notation?: string; source?: TabSource }
    | { kind: 'vibrato'; notation: string; source?: TabSource }
    | { kind: 'bend' | 'release'; targetFret: number; notation: string; source?: TabSource };

/** String indices follow THE MODUS: high string first, 0..5. */
export interface TabNote {
    id: string;
    string: number;
    fret: number;
    midi: number;
    pitchClass: number;
    /** Original imported location, or null for a directly authored/changed note. */
    source: TabSource | null;
    duration?: TabFraction;
    techniques?: TabTechnique[];
}

/** An ordered editable column. Empty columns are not rests or measured durations. */
export interface TabMoment {
    id: string;
    index: number;
    measure: number;
    column: number;
    notes: TabNote[];
    /** Explicit bar-relative quarter-note offset. Unknown when absent. */
    beatOffset?: TabFraction;
    rest?: { duration?: TabFraction };
    mutes?: { string: number; source?: TabSource }[];
    /** Continuations reference an original note without adding a new pitch observation. */
    sustains?: { noteId: string; duration?: TabFraction }[];
}

export interface TabDocument {
    format: 'ascii' | 'authored';
    timing: 'order-only';
    source: string;
    tuningMidi: number[];
    capo: number;
    moments: TabMoment[];
    measureCount: number;
    meter?: TabMeter;
}

export interface TabDiagnostic {
    severity: 'error' | 'warning';
    message: string;
    line?: number;
    column?: number;
}

export type TabParseResult =
    | { ok: true; document: TabDocument; diagnostics: TabDiagnostic[] }
    | { ok: false; diagnostics: TabDiagnostic[] };

export interface TabParseOptions { tuningMidi?: readonly number[]; capo?: number }
export interface TabSelection { start: number; end: number }
export interface TabAnalysisContext {
    scale: ScaleRef | null;
    chord: ChordRef | null;
    frame: TonalFrame | null;
}

export const TAB_TUNINGS = [
    { id: 'standard', label: 'Standard', midi: [64, 59, 55, 50, 45, 40] },
    { id: 'drop-d', label: 'Drop D', midi: [64, 59, 55, 50, 45, 38] },
    { id: 'dadgad', label: 'DADGAD', midi: [62, 57, 55, 50, 45, 38] },
] as const;

export const TAB_EXAMPLE = `e|--0-----0-----1-----0--|
B|--1-----1-----0-----1--|
G|--0-----0-----0-----0--|
D|--2-----2-----0-----2--|
A|--3-----0-----2-----3--|
E|--------------3--------|`;

/** Melody, double stop and triad; horizontal spacing does not encode rhythm. */
export const TAB_MIXED_EXAMPLE = [
    'e|--0--2--3--3--0--|',
    'B|-----------3--1--|',
    'G|--------------0--|',
    'D|-----------------|',
    'A|-----------------|',
    'E|-----------------|',
].join('\n');
