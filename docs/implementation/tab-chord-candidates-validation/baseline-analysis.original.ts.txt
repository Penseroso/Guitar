import { identifyChordsForPitchClasses } from '@/domain/chord/chordRecognition';
import { canonicalTone } from '@/domain/chord/engine/catalog';
import { getChordTypeSuffix } from '@/domain/chord/helpers';
import { CHORD_REGISTRY } from '@/domain/chord/registry';
import { resolveChord, romanLabel, validateFrame } from '@/domain/harmony/roman';
import type { ChordRef, ResolvedHarmonyChord } from '@/domain/harmony/types';
import { getScaleStructuralTones, type ScaleStructuralTone } from '@/domain/scale/scale-tones';
import { getKeyName } from '@/domain/shared/keys';
import { getNoteName } from '@/domain/shared/notes';
import { formatAccidentals, parseNoteName } from '@/domain/shared/spelling';
import type { TabAnalysisContext, TabDocument, TabNote, TabSelection } from './types';
import { analyzeTabPassage, describeTabInterval, type TabAnalyzedMoment, type TabPassageAnalysis } from './passage-analysis';
export type { TabAnalyzedMoment, TabInterval, TabMelodicStep, TabMelodicRun, TabPassageAnalysis, TabProgressionReading } from './passage-analysis';

export interface TabAnalyzedNote extends TabNote {
    name: string;
    spellingSource: 'scale' | 'chord' | 'chromatic';
    scaleDegree: string | null;
    inScale: boolean | null;
    chordDegree: string | null;
    /** Chord-relative spelling with written octave, independent of the scale spelling. */
    chordNoteName: string | null;
    chordMember: boolean | null;
}

export interface TabChordCandidate {
    key: string;
    chord: ChordRef;
    name: string;
    /** Formula degrees absent from the observed notes, never inserted into them. */
    omitted: string[];
    added: number[];
    match: 'exact' | 'incomplete' | 'added-tone';
}

export interface TabSelectionAnalysis extends TabPassageAnalysis {
    notes: TabAnalyzedNote[];
    candidates: TabChordCandidate[];
    selectionKind: 'single-note' | 'dyad' | 'aligned-chord' | 'passage';
    pitchClasses: number[];
    /** Lowest note in the selected guitar part, not an inferred ensemble bass. */
    lowestNote: TabAnalyzedNote | null;
    roman: string | null;
    diagnostics: string[];
}

function octaveName(midi: number, spelling: string): string {
    const parsed = parseNoteName(spelling);
    // B#3 and Cb4 cross MIDI octave boundaries without changing written octave.
    const octave = Math.floor((midi - (parsed?.alteration ?? 0)) / 12) - 1;
    return `${formatAccidentals(spelling)}${octave}`;
}

function chordCandidates(pitchClasses: number[]): TabChordCandidate[] {
    const candidates: TabChordCandidate[] = identifyChordsForPitchClasses(pitchClasses)
        .filter(candidate => candidate.extraPitchClasses.length <= 1)
        .map(candidate => {
            const { definition } = candidate;
            const root = getKeyName(definition.rootPitchClass);
            const omitted = candidate.tones.tones
                .filter(tone => !pitchClasses.includes(tone.pitchClass))
                .map(tone => canonicalTone(definition.id, tone.degree));
            const added = [...candidate.extraPitchClasses];
            return {
                key: `${definition.rootPitchClass}:${definition.id}`,
                chord: { root, chordId: definition.id },
                name: formatAccidentals(root + getChordTypeSuffix(definition.id)),
                omitted,
                added,
                match: added.length ? 'added-tone' : omitted.length ? 'incomplete' : 'exact',
            };
        });
    const priority = { exact: 0, incomplete: 1, 'added-tone': 2 };
    // Stable ordering retains equally matching interpretations; none is adopted.
    return candidates.sort((left, right) => priority[left.match] - priority[right.match]);
}

/** Analyze inclusive moment indices; any harmonic grouping stays an explicit hypothesis. */
export function analyzeTabSelection(
    document: TabDocument,
    selection: TabSelection,
    context: TabAnalysisContext,
): TabSelectionAnalysis {
    const candidateCache = new Map<string, TabChordCandidate[]>();
    const candidatesFor = (pitchClasses: number[]) => {
        const key = [...new Set(pitchClasses)].sort((a, b) => a - b).join(',');
        let result = candidateCache.get(key);
        if (!result) { result = chordCandidates(pitchClasses); candidateCache.set(key, result); }
        return result;
    };
    const diagnostics: string[] = [];
    let scaleTones: ScaleStructuralTone[] | null = null;
    if (context.scale) {
        scaleTones = getScaleStructuralTones(context.scale);
        if (!scaleTones) diagnostics.push('The selected scale is unsupported.');
    }
    let chord: ResolvedHarmonyChord | null = null;
    if (context.chord) {
        try {
            if (!Object.hasOwn(CHORD_REGISTRY, context.chord.chordId)) throw new Error('Unknown chord');
            chord = resolveChord(context.chord);
        } catch {
            diagnostics.push('The selected chord or its spelling is unsupported.');
        }
    }
    let validFrame = false;
    if (context.frame) {
        try {
            validateFrame(context.frame);
            validFrame = true;
        } catch {
            diagnostics.push('The tonal frame is unsupported; only explicit major or minor frames are supported.');
        }
    }
    let roman: string | null = null;
    if (chord && context.frame && validFrame) roman = romanLabel(chord, context.frame);

    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    const validSelection = Number.isInteger(start) && Number.isInteger(end)
        && start >= 0 && end < document.moments.length;
    if (!validSelection) diagnostics.push('Select an available note or passage.');
    const moments = validSelection ? document.moments.slice(start, end + 1) : [];
    const notes: TabAnalyzedNote[] = moments.flatMap(moment => moment.notes).map(note => {
        const scaleTone = scaleTones?.find(tone => tone.pitchClass === note.pitchClass);
        const chordTone = chord?.tones.find(tone => tone.pitchClass === note.pitchClass);
        const spelling = scaleTone?.scaleNoteName ?? chordTone?.name ?? getNoteName(note.pitchClass);
        return {
            ...note,
            source: note.source ? { ...note.source } : note.source,
            name: octaveName(note.midi, spelling),
            spellingSource: scaleTone ? 'scale' : chordTone ? 'chord' : 'chromatic',
            scaleDegree: scaleTone?.scaleDegree ?? null,
            inScale: scaleTones ? Boolean(scaleTone) : null,
            chordDegree: chordTone?.degree ?? null,
            chordNoteName: chordTone ? octaveName(note.midi, chordTone.name) : null,
            chordMember: chord ? Boolean(chordTone) : null,
        };
    });
    const pitchClasses = Array.from(new Set(notes.map(note => note.pitchClass))).sort((a, b) => a - b);
    const selectionKind = moments.length !== 1 || !notes.length ? 'passage'
        : notes.length === 1 ? 'single-note' : notes.length === 2 ? 'dyad' : 'aligned-chord';
    const candidates = selectionKind === 'aligned-chord' && pitchClasses.length >= 2
        ? candidatesFor(pitchClasses) : [];
    const lowestNote = notes.reduce<TabAnalyzedNote | null>((lowest, note) => !lowest || note.midi < lowest.midi ? note : lowest, null);
    const notesById = new Map(notes.map(note => [note.id, note]));
    const analyzedMoments: TabAnalyzedMoment[] = moments.map(moment => {
        const momentNotes = moment.notes.map(note => notesById.get(note.id)!);
        const ordered = [...momentNotes].sort((left, right) => left.midi - right.midi);
        const pcs = [...new Set(momentNotes.map(note => note.pitchClass))];
        return { id: moment.id, index: moment.index, measure: moment.measure, notes: momentNotes,
            kind: !momentNotes.length ? 'empty' : momentNotes.length === 1 ? 'single-note' : momentNotes.length === 2 ? 'dyad' : 'chord',
            interval: momentNotes.length === 2 ? describeTabInterval(ordered[0], ordered[1]) : null,
            candidates: momentNotes.length >= 3 && pcs.length >= 2 ? candidatesFor(pcs) : [] };
    });
    // A selected excerpt cannot promote a partial measure to a whole-bar hypothesis.
    const completeMeasures = new Set(moments.map(moment => moment.measure));
    for (const moment of document.moments) {
        if (moment.index < start || moment.index > end) completeMeasures.delete(moment.measure);
    }
    return { notes, candidates, selectionKind, pitchClasses, lowestNote, roman, diagnostics,
        ...analyzeTabPassage(analyzedMoments, candidatesFor, validFrame ? context.frame : null, completeMeasures) };
}
