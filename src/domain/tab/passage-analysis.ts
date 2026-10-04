import { buildTabHarmonicSpans, observeTabProgressions, type TabHarmonicSpan } from './harmonic-spans';
import { frameChords, romanLabel } from '@/domain/harmony/roman';
import type { TonalFrame } from '@/domain/harmony/types';
import { formatAccidentals, parseNoteName } from '@/domain/shared/spelling';
import { getChordTypeSuffix } from '@/domain/chord/helpers';
import type { TabAnalyzedNote, TabChordCandidate } from './analysis';

export interface TabInterval {
    semitones: number;
    direction: 'up' | 'down' | 'same';
    label: string;
    generic: number | null;
    quality: string | null;
}
export interface TabAnalyzedMoment {
    id: string;
    index: number;
    measure: number;
    kind: 'empty' | 'single-note' | 'dyad' | 'chord';
    notes: TabAnalyzedNote[];
    interval: TabInterval | null;
    candidates: TabChordCandidate[];
}
export interface TabMelodicStep {
    from: number;
    to: number;
    fromNoteId: string;
    toNoteId: string;
    interval: TabInterval;
}
export interface TabMelodicRun {
    start: number;
    end: number;
    noteIds: string[];
    intervals: TabMelodicStep[];
    contour: 'ascending' | 'descending' | 'level' | 'mixed';
}
export interface TabProgressionReading {
    start: number;
    end: number;
    label: string;
    evidence: string;
    source: 'observed' | 'candidate';
}
export interface TabPassageAnalysis {
    texture: 'empty' | 'monophonic' | 'dyads' | 'chordal' | 'mixed';
    moments: TabAnalyzedMoment[];
    melodicRuns: TabMelodicRun[];
    repeatedPatterns: { semitones: number[]; occurrences: { start: number; end: number }[] }[];
    dyadMotions: {
        from: number;
        to: number;
        kind: 'parallel' | 'similar' | 'contrary' | 'oblique' | 'static';
        low: TabInterval;
        high: TabInterval;
        assumption: 'low-to-low-high-to-high';
    }[];
    arpeggios: { start: number; end: number; candidates: TabChordCandidate[]; provenance: 'pitch-collection' }[];
    harmonicSpans: TabHarmonicSpan[];
    /** Bounded key-conditional patterns, not inferred phrase endings or confirmed functions. */
    progressionReadings: TabProgressionReading[];
    chordSequence: {
        index: number;
        /** False starts a new adjacent-onset group; never bridge a gap or melody. */
        continues: boolean;
        candidates: (TabChordCandidate & { roman: string | null })[];
    }[];
}

function writtenPitch(note: TabAnalyzedNote): { staffPosition: number } | null {
    if (note.spellingSource === 'chromatic') return null;
    const match = /^(.+?)(-?\d+)$/.exec(note.name);
    const spelling = match && parseNoteName(match[1]);
    return spelling && match ? { staffPosition: Number(match[2]) * 7 + spelling.letterIndex } : null;
}

/** MIDI distance is observed; interval quality additionally needs contextual spelling. */
export function describeTabInterval(from: TabAnalyzedNote, to: TabAnalyzedNote): TabInterval {
    const semitones = to.midi - from.midi;
    const direction = semitones > 0 ? 'up' : semitones < 0 ? 'down' : 'same';
    const fallback: TabInterval = { semitones, direction, label: `${Math.abs(semitones)} st`, generic: null, quality: null };
    const first = writtenPitch(from), second = writtenPitch(to);
    if (!first || !second) return fallback;
    const staffDistance = second.staffPosition - first.staffPosition;
    // An enharmonic respelling can reverse written and sounding directions.
    // Keep the pitch-distance fact instead of assigning a misleading quality.
    if (semitones !== 0 && staffDistance !== 0 && Math.sign(staffDistance) !== Math.sign(semitones)) return fallback;
    const generic = Math.abs(staffDistance) + 1;
    const simple = (generic - 1) % 7;
    const expected = [0, 2, 4, 5, 7, 9, 11][simple] + 12 * Math.floor((generic - 1) / 7);
    const deviation = Math.abs(semitones) - expected;
    const perfectFamily = [0, 3, 4].includes(simple);
    const quality = deviation === 0 ? (perfectFamily ? 'P' : 'M')
        : !perfectFamily && deviation === -1 ? 'm'
            : deviation > 0 && deviation <= 2 ? 'A'.repeat(deviation)
                : deviation < 0 && deviation >= (perfectFamily ? -2 : -3) ? 'd'.repeat(-deviation - (perfectFamily ? 0 : 1)) : null;
    return quality ? { semitones, direction, label: `${quality}${generic}`, generic, quality } : fallback;
}

function sortedNotes(moment: TabAnalyzedMoment) {
    return [...moment.notes].sort((left, right) => left.midi - right.midi);
}

function repeatedPatterns(runs: TabMelodicRun[]): TabPassageAnalysis['repeatedPatterns'] {
    const patterns = new Map<string, TabPassageAnalysis['repeatedPatterns'][number]>();
    for (const run of runs) {
        for (let length = 2; length <= Math.min(4, run.intervals.length); length++) {
            for (let start = 0; start + length <= run.intervals.length; start++) {
                const steps = run.intervals.slice(start, start + length);
                const semitones = steps.map(step => step.interval.semitones);
                const key = semitones.join(',');
                const pattern = patterns.get(key) ?? { semitones, occurrences: [] };
                const occurrence = { start: steps[0].from, end: steps.at(-1)!.to };
                // Shared boundary notes are fine; overlapping interval windows are not repetitions.
                if (!pattern.occurrences.some(previous => occurrence.start < previous.end && occurrence.end > previous.start)) {
                    pattern.occurrences.push(occurrence);
                }
                patterns.set(key, pattern);
            }
        }
    }
    return [...patterns.values()].filter(pattern => pattern.occurrences.length > 1)
        .sort((left, right) => right.semitones.length - left.semitones.length || right.occurrences.length - left.occurrences.length)
        .slice(0, 3);
}

export function analyzeTabPassage(
    moments: TabAnalyzedMoment[],
    candidatesFor: (pitchClasses: number[]) => TabChordCandidate[],
    frame: TonalFrame | null,
    completeMeasures: ReadonlySet<number> = new Set(),
): TabPassageAnalysis {
    const melodicRuns: TabMelodicRun[] = [];
    let singleNotes: TabAnalyzedMoment[] = [];
    const flushMelody = () => {
        if (singleNotes.length >= 2) {
            const intervals = singleNotes.slice(1).map((moment, index) => {
                const before = singleNotes[index];
                return { from: before.index, to: moment.index, fromNoteId: before.notes[0].id,
                    toNoteId: moment.notes[0].id, interval: describeTabInterval(before.notes[0], moment.notes[0]) };
            });
            const changes = intervals.map(step => step.interval.semitones);
            const contour = changes.every(value => value === 0) ? 'level'
                : changes.every(value => value >= 0) ? 'ascending'
                    : changes.every(value => value <= 0) ? 'descending' : 'mixed';
            melodicRuns.push({ start: singleNotes[0].index, end: singleNotes.at(-1)!.index,
                noteIds: singleNotes.map(moment => moment.notes[0].id), intervals, contour });
        }
        singleNotes = [];
    };
    for (const moment of moments) {
        if (moment.kind === 'single-note') singleNotes.push(moment);
        else flushMelody();
    }
    flushMelody();

    const dyadMotions: TabPassageAnalysis['dyadMotions'] = [];
    for (let index = 1; index < moments.length; index++) {
        const before = moments[index - 1], after = moments[index];
        if (before.kind !== 'dyad' || after.kind !== 'dyad') continue;
        const [beforeLow, beforeHigh] = sortedNotes(before), [afterLow, afterHigh] = sortedNotes(after);
        const low = describeTabInterval(beforeLow, afterLow), high = describeTabInterval(beforeHigh, afterHigh);
        const parallel = before.interval?.generic && after.interval?.generic
            ? before.interval.generic === after.interval.generic
            : before.interval?.semitones === after.interval?.semitones;
        const kind = low.semitones === 0 && high.semitones === 0 ? 'static'
            : low.semitones === 0 || high.semitones === 0 ? 'oblique'
                : Math.sign(low.semitones) !== Math.sign(high.semitones) ? 'contrary' : parallel ? 'parallel' : 'similar';
        dyadMotions.push({ from: before.index, to: after.index, kind, low, high, assumption: 'low-to-low-high-to-high' });
    }

    const arpeggios: TabPassageAnalysis['arpeggios'] = [];
    // Search small local collections, including inside longer or mixed melodies.
    // Explicit bar lines, blank positions and simultaneous notes bound a window;
    // no measured duration or hidden accompaniment is assigned to the match.
    const lastCollectionEnd = new Map<string, number>();
    let coveringWindows: { start: number; end: number }[] = [];
    for (let start = 0; start < moments.length; start++) {
        const first = moments[start];
        if (first.kind !== 'single-note') continue;
        const pcs = new Set<number>();
        let match: { end: number; candidates: TabChordCandidate[]; collection: string } | null = null;
        for (let end = start; end < Math.min(start + 16, moments.length); end++) {
            const current = moments[end];
            if (current.kind !== 'single-note' || current.measure !== first.measure) break;
            pcs.add(current.notes[0].pitchClass);
            // Complete three- and four-tone formulas include triads and sevenths.
            // A fifth distinct tone is neither discarded nor treated as a tension.
            if (pcs.size > 4) break;
            if (pcs.size < 3) continue;
            const collection = [...pcs].sort((left, right) => left - right).join(',');
            const candidates = candidatesFor([...pcs]).filter(candidate => candidate.match === 'exact');
            if (candidates.length) match = { end: current.index, candidates, collection };
        }
        if (!match) continue;
        // Prefer the maximal complete collection over its contained triad fragments.
        // Windows are at most sixteen positions, so the active coverage stays bounded.
        coveringWindows = coveringWindows.filter(window => window.end >= first.index);
        if (coveringWindows.some(window => window.start <= first.index && window.end >= match.end)) continue;
        // A long repeated collection can yield almost identical overlapping windows.
        // Retain bounded representatives, rather than a bracket per starting note.
        // Different overlapping collections remain alternatives, never a segmentation.
        if (first.index <= (lastCollectionEnd.get(match.collection) ?? -1)) continue;
        arpeggios.push({ start: first.index, end: match.end, candidates: match.candidates, provenance: 'pitch-collection' });
        lastCollectionEnd.set(match.collection, match.end);
        coveringWindows.push({ start: first.index, end: match.end });
    }

    // A chromatic root has several possible functional spellings. Only contextual
    // diatonic roots receive inferred Roman labels; user-supplied chords are separate.
    const frameRootNames = new Map<number, string>();
    if (frame) {
        try {
            for (const chord of frameChords(frame)) frameRootNames.set(parseNoteName(chord.root)!.pitchClass, chord.root);
        } catch {
            // Extreme key spellings can exceed the shared spelling engine's range.
        }
    }
    const chordSequence: TabPassageAnalysis['chordSequence'] = [];
    for (let index = 0; index < moments.length; index++) {
        const moment = moments[index];
        if (moment.kind !== 'chord' || !moment.candidates.length) continue;
        const before = moments[index - 1], after = moments[index + 1];
        const continues = before?.kind === 'chord' && before.candidates.length > 0;
        if (!continues && !(after?.kind === 'chord' && after.candidates.length)) continue;
        chordSequence.push({ index: moment.index, continues,
            candidates: moment.candidates.map(candidate => {
                const root = frameRootNames.get(parseNoteName(candidate.chord.root)!.pitchClass);
                if (!frame || !root) return { ...candidate, roman: null };
                const chord = { ...candidate.chord, root };
                return { ...candidate, chord, name: formatAccidentals(root + getChordTypeSuffix(chord.chordId)), roman: romanLabel(chord, frame) };
            }) });
    }
    const kinds = new Set(moments.filter(moment => moment.kind !== 'empty').map(moment => moment.kind));
    const texture = !kinds.size ? 'empty' : kinds.size > 1 ? 'mixed'
        : kinds.has('single-note') ? 'monophonic' : kinds.has('dyad') ? 'dyads' : 'chordal';
    const harmonicSpans = buildTabHarmonicSpans(moments, candidatesFor, completeMeasures);
    return { texture, moments, melodicRuns, repeatedPatterns: repeatedPatterns(melodicRuns), dyadMotions, arpeggios, chordSequence, harmonicSpans,
        progressionReadings: observeTabProgressions(harmonicSpans, frame) };
}
