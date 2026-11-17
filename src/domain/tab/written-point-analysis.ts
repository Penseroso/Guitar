import { engineEntry } from '@/domain/chord/engine/catalog';
import { degreeNumber, frameChords } from '@/domain/harmony/roman';
import type { TonalFrame } from '@/domain/harmony/types';
import { resolveScaleRef, type ScaleRef } from '@/domain/scale/scale-ref';
import { getScaleStructuralTones } from '@/domain/scale/scale-tones';
import { getNoteName } from '@/domain/shared/notes';
import { formatAccidentals, parseNoteName, spellDegree } from '@/domain/shared/spelling';
import { buildTabChordCandidates, type TabChordCandidate } from './chord-candidates';
import { createTabCandidateFormatter } from './contextual-spelling';
import { inspectTabAcrossBarsWrittenNotesAt, type TabAcrossBarsWrittenNoteInterval, type TabAcrossBarsWrittenNotesInspection, type TabAcrossBarsWrittenTimeSnapshot } from './written-time-across-bars';

export interface TabWrittenPointReferences {
    readonly scale: ScaleRef | null;
    readonly frame: TonalFrame | null;
}
export interface TabWrittenPointNote {
    /** The exact source-associated occurrence, with authored/projected coordinates. */
    readonly interval: TabAcrossBarsWrittenNoteInterval;
    readonly midi: number;
    readonly pitchClass: number;
    readonly name: string;
    readonly spellingSource: 'scale' | 'chromatic';
    readonly scaleDegree: string | null;
    readonly inScale: boolean | null;
}
export interface TabWrittenPointCompleteAnalysis {
    readonly status: 'complete';
    readonly proof: Extract<TabAcrossBarsWrittenNotesInspection, { status: 'complete' }>['proof'];
    readonly references: TabWrittenPointReferences;
    readonly diagnostics: readonly string[];
    readonly notes: readonly TabWrittenPointNote[];
    readonly pitchClasses: readonly number[];
    /** Lowest MIDI in this guitar-part population; never a claimed ensemble bass. */
    readonly lowestNote: TabWrittenPointNote | null;
    /** Unordered two-pitch-class interval class, not a unique voiced interval. */
    readonly twoPitchIntervalClass: number | null;
    readonly candidates: readonly TabChordCandidate[];
    readonly candidatePresentations: readonly { readonly key: string; readonly root: string; readonly name: string; readonly roman: string | null }[];
}
export type TabWrittenPointAnalysis = Exclude<TabAcrossBarsWrittenNotesInspection, { status: 'complete' }> | TabWrittenPointCompleteAnalysis;
export interface TabWrittenPointCandidateDescription {
    readonly candidateKey: string;
    readonly notes: readonly {
        readonly interval: TabAcrossBarsWrittenNoteInterval;
        readonly midi: number;
        readonly pitchClass: number;
        readonly chordDegree: string | null;
        readonly chordNoteName: string | null;
        readonly chordMember: boolean;
    }[];
    readonly omitted: readonly string[];
    readonly added: readonly number[];
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
function freezeData<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.values(value).forEach(freezeData);
        Object.freeze(value);
    }
    return value;
}
function octaveName(midi: number, spelling: string): string {
    const parsed = parseNoteName(spelling)!;
    return `${formatAccidentals(spelling)}${Math.floor((midi - parsed.alteration) / 12) - 1}`;
}

/**
 * Describe a proven-complete nominal written point only. Observation eligibility
 * stays with the inspector; registry formula matches remain alternatives. No
 * chord context, actual sounding realization, function or detected key is used.
 */
export function analyzeTabWrittenPoint(snapshot: TabAcrossBarsWrittenTimeSnapshot, globalTime: unknown, references: TabWrittenPointReferences): TabWrittenPointAnalysis {
    const query = inspectTabAcrossBarsWrittenNotesAt(snapshot, globalTime);
    if (query.status !== 'complete') return Object.freeze({ ...query });
    const diagnostics: string[] = [];
    let scale: ScaleRef | null = null, frame: TonalFrame | null = null;
    const rawScale: unknown = references?.scale;
    const rawFrame: unknown = references?.frame;
    if (rawScale !== null && rawScale !== undefined) {
        if (record(rawScale) && typeof rawScale.group === 'string' && typeof rawScale.scaleId === 'string'
            && typeof rawScale.tonic === 'number' && Number.isFinite(rawScale.tonic)) {
            scale = { group: rawScale.group, scaleId: rawScale.scaleId, tonic: rawScale.tonic };
        } else diagnostics.push('The reference scale is unsupported.');
    }
    if (rawFrame !== null && rawFrame !== undefined) {
        if (record(rawFrame) && typeof rawFrame.tonic === 'string' && typeof rawFrame.mode === 'string' && typeof rawFrame.lens === 'string') {
            frame = { tonic: rawFrame.tonic, mode: rawFrame.mode, lens: rawFrame.lens } as TonalFrame;
        } else diagnostics.push('The key reference is unsupported.');
    }
    const scaleTones = scale ? getScaleStructuralTones(scale) : null;
    if (scale && (!resolveScaleRef(scale) || !scaleTones)) diagnostics.push('The reference scale is unsupported.');
    let supportedFrame: TonalFrame | null = frame;
    if (frame) {
        try { frameChords(frame); }
        catch { supportedFrame = null; diagnostics.push('The key reference is unsupported.'); }
    }
    const scaleByPitch = new Map(scaleTones?.map(tone => [tone.pitchClass, tone]));
    const notes: TabWrittenPointNote[] = query.notes.map(interval => {
        const midi = interval.midi, pitchClass = midi % 12;
        const tone = scaleByPitch.get(pitchClass);
        return { interval, midi, pitchClass, name: octaveName(midi, tone?.scaleNoteName ?? getNoteName(pitchClass)),
            spellingSource: tone ? 'scale' : 'chromatic', scaleDegree: tone?.scaleDegree ?? null, inScale: scaleTones ? Boolean(tone) : null };
    });
    const pitchClasses = [...new Set(notes.map(note => note.pitchClass))].sort((a, b) => a - b);
    const candidates = pitchClasses.length >= 2 ? buildTabChordCandidates(pitchClasses) : [];
    const contextualCandidate = createTabCandidateFormatter(supportedFrame);
    const candidatePresentations = candidates.map(candidate => {
        const presentation = contextualCandidate(candidate);
        return { key: candidate.key, root: presentation.chord.root, name: presentation.name, roman: presentation.roman };
    });
    const distance = pitchClasses.length === 2 ? pitchClasses[1] - pitchClasses[0] : null;
    return freezeData({ status: 'complete', proof: query.proof, references: { scale, frame }, diagnostics, notes, pitchClasses,
        lowestNote: notes.reduce<TabWrittenPointNote | null>((lowest, note) => !lowest || note.midi < lowest.midi ? note : lowest, null),
        twoPitchIntervalClass: distance === null ? null : Math.min(distance, 12 - distance), candidates, candidatePresentations });
}

/** Compute formula roles only for the explicitly requested candidate, in O(N). */
export function describeTabWrittenPointCandidate(result: TabWrittenPointAnalysis, key: string): TabWrittenPointCandidateDescription | null {
    if (result.status !== 'complete') return null;
    const candidate = result.candidates.find(candidate => candidate.key === key);
    if (!candidate) return null;
    const presentation = result.candidatePresentations.find(presentation => presentation.key === key)!;
    const root = parseNoteName(presentation.root)!;
    const entry = engineEntry(candidate.chord.chordId);
    const tones = new Map<number, { degree: string; spelling: string | null }>();
    entry.formula.intervals.forEach((interval, index) => {
        const pitchClass = (root.pitchClass + interval) % 12;
        if (tones.has(pitchClass)) return;
        const degree = entry.formula.degrees[index];
        tones.set(pitchClass, { degree, spelling: spellDegree(root, degreeNumber(degree), pitchClass)?.name ?? null });
    });
    return freezeData({ candidateKey: candidate.key, notes: result.notes.map(note => {
        const tone = tones.get(note.pitchClass);
        return { interval: note.interval, midi: note.midi, pitchClass: note.pitchClass, chordDegree: tone?.degree ?? null,
            chordNoteName: tone?.spelling ? octaveName(note.midi, tone.spelling) : null, chordMember: Boolean(tone) };
    }), omitted: [...candidate.omitted], added: [...candidate.added] });
}
