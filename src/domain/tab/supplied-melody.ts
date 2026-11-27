import { pc } from '@/domain/harmony/roman';
import type { RelationFacts } from '@/domain/harmony/types';
import { getNoteName } from '@/domain/shared/notes';
import { formatAccidentals, parseNoteName } from '@/domain/shared/spelling';
import { compareExactTimes, parseExactTime, type ExactTime } from './exact-time';
import type { PlacedChord, observeSuppliedProgression } from './progression-observation';
import type { TabDocument } from './types';
import type { TabAcrossBarsWrittenTimeSnapshot } from './written-time-across-bars';

type Progression = ReturnType<typeof observeSuppliedProgression>;
type Transition = Progression['transitions'][number];

interface MelodyNote {
    id: string;
    position: number;
    bar: number;
    string: number;
    midi: number;
    name: string;
    chord: PlacedChord | null;
    degree: string | null;
    writtenStart: ExactTime | null;
    interval: { start: ExactTime; end: ExactTime } | null;
    technique: boolean;
}

function degreeAt(chord: PlacedChord | null, midi: number) {
    return chord?.chord.tones.find(tone => tone.pitchClass === midi % 12) ?? null;
}

function chordAt(chords: readonly PlacedChord[], position: number, start: ExactTime | null) {
    // The sequence has already been sorted and checked for overlap.
    let lower = 0, upper = chords.length;
    while (lower < upper) {
        const middle = Math.floor((lower + upper) / 2);
        const { placement } = chords[middle];
        const before = placement.kind === 'positions' ? position < placement.first
            : !start || compareExactTimes(start, placement.start) < 0;
        if (before) upper = middle;
        else lower = middle + 1;
    }
    const found = chords[lower - 1];
    if (found?.placement.kind === 'positions' && position <= found.placement.last) return found;
    if (found?.placement.kind === 'written-time' && start && compareExactTimes(start, found.placement.end) < 0) return found;
    return null;
}

function nameAt(midi: number, chordName: string | undefined) {
    const name = chordName ?? getNoteName(midi % 12);
    const alteration = parseNoteName(name)!.alteration;
    return `${formatAccidentals(name)}${Math.floor((midi - alteration) / 12) - 1}`;
}

function guideMotion(from: MelodyNote, to: MelodyNote, semitones: number, transition: Transition | undefined) {
    const reading = transition?.reading;
    if (!reading || !from.chord || !to.chord) return false;
    const minorThird = to.degree === 'b3';
    const risesToRoot = to.degree === '1' && semitones === 1;
    const fallsToThird = (to.degree === '3' && semitones === -1) || (minorThird && semitones === -2);
    return reading.kind === 'tritone'
        ? (from.degree === 'b7' && risesToRoot) || (from.degree === '3' && fallsToThird)
        : (from.degree === '3' && risesToRoot) || (from.degree === 'b7' && fallsToThird);
}

interface WrittenBoundary { from: PlacedChord; to: PlacedChord; boundary: ExactTime }
function changesWithinNote(note: MelodyNote, boundaries: readonly WrittenBoundary[]) {
    const interval = note.interval;
    if (!interval) return [];
    let lower = 0, upper = boundaries.length;
    while (lower < upper) {
        const middle = Math.floor((lower + upper) / 2);
        if (compareExactTimes(boundaries[middle].boundary, interval.start) <= 0) lower = middle + 1;
        else upper = middle;
    }
    const changes = [];
    for (let i = lower; i < boundaries.length && compareExactTimes(boundaries[i].boundary, interval.end) < 0; i++) {
        const { from, to, boundary } = boundaries[i];
        changes.push({ note, from, to, fromDegree: degreeAt(from, note.midi)?.degree ?? null,
            toDegree: degreeAt(to, note.midi)?.degree ?? null, boundary });
    }
    return changes;
}

export function analyzeSuppliedMelody(document: TabDocument, progression: Progression, mode: 'positions' | 'written-time',
    selectedIds: readonly string[], written?: TabAcrossBarsWrittenTimeSnapshot) {
    const selected = new Set(selectedIds);
    const timed = mode === 'written-time';
    const data = timed && written?.sourceDocument === document && written.data.status === 'ready' ? written.data : null;
    const intervals = new Map(data?.intervals.map(note => [note.noteId, note]));
    const startsWithoutDuration = new Map<string, ExactTime>();
    for (const fact of data?.coverageFacts ?? []) {
        if (fact.kind === 'known-global-start') {
            const note = document.moments[fact.momentIndex].notes[fact.noteIndex];
            startsWithoutDuration.set(note.id, parseExactTime(fact.start)!);
        }
    }
    const notes: MelodyNote[] = [];
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    document.moments.forEach((moment, position) => {
        for (const note of moment.notes) {
            if (!selected.has(note.id)) continue;
            if (seen.has(note.id)) duplicates.add(note.id);
            seen.add(note.id);
            if (!Number.isInteger(note.midi) || note.midi < 0 || note.midi > 127) continue;
            const known = intervals.get(note.id);
            const interval = known ? { start: parseExactTime(known.start)!, end: parseExactTime(known.end)! } : null;
            const writtenStart = interval?.start ?? startsWithoutDuration.get(note.id) ?? null;
            const chord = chordAt(progression.chords, position, writtenStart);
            const tone = degreeAt(chord, note.midi);
            notes.push({ id: note.id, position, bar: moment.measure, string: note.string, midi: note.midi,
                name: nameAt(note.midi, tone?.name), chord, degree: tone?.degree ?? null, writtenStart, interval, technique: !!note.techniques?.length });
        }
    });
    const unique = notes.filter(note => !duplicates.has(note.id));
    const sameSource = new Set(unique.filter((note, i) => unique[i - 1]?.position === note.position || unique[i + 1]?.position === note.position).map(note => note.position));
    const hasMissingTime = timed && unique.some(note => !note.interval);
    const orderConflict = timed && unique.some((note, i) => {
        const prior = unique[i - 1];
        return !!(note.writtenStart && prior?.writtenStart && compareExactTimes(prior.writtenStart, note.writtenStart) >= 0);
    });
    const verifiedTime = timed && !hasMissingTime && !orderConflict;
    const byPair = new Map(progression.transitions.map(transition => [transition.from.entry.id, transition]));
    const moving = (from: MelodyNote, to: MelodyNote) => !sameSource.has(from.position) && !sameSource.has(to.position)
        && (!from.writtenStart || !to.writtenStart || compareExactTimes(from.writtenStart, to.writtenStart) !== 0);
    const motions = unique.slice(1).flatMap((to, i) => {
        const from = unique[i];
        if (!moving(from, to)) return [];
        const semitones = to.midi - from.midi;
        const transition = from.chord ? byPair.get(from.chord.entry.id) : undefined;
        const pair = to.chord && transition?.to.entry.id === to.chord.entry.id ? transition : undefined;
        const contextual = !timed || (verifiedTime && compareExactTimes(from.interval!.end, to.interval!.start) <= 0);
        const shared: RelationFacts['shared'] = pair?.facts?.shared ?? [];
        return [{ from, to, semitones, guide: contextual && guideMotion(from, to, semitones, pair),
            commonChordTone: contextual && semitones % 12 === 0 && shared.includes(pc(to.midi)) }];
    });

    const shapes = unique.flatMap((middle, i) => {
        const before = unique[i - 1], after = unique[i + 1];
        if (!before || !after || !middle.chord || middle.degree || !before.degree || !after.degree
            || before.chord !== middle.chord || after.chord !== middle.chord
            || before.position + 1 !== middle.position || middle.position + 1 !== after.position
            || !moving(before, middle) || !moving(middle, after)
            || before.technique || middle.technique || after.technique
            || [before, middle, after].some(note => document.moments[note.position].rest)) return [];
        if (timed && (!verifiedTime || compareExactTimes(before.interval!.end, middle.interval!.start) > 0
            || compareExactTimes(middle.interval!.end, after.interval!.start) > 0)) return [];
        const inStep = middle.midi - before.midi, outStep = after.midi - middle.midi;
        if (![1, 2].includes(Math.abs(inStep)) || ![1, 2].includes(Math.abs(outStep))) return [];
        const kind = Math.sign(inStep) === Math.sign(outStep) ? 'passing' : before.midi === after.midi ? 'neighbor' : null;
        return kind ? [{ kind, before, middle, after }] : [];
    });

    const boundaries = timed ? progression.transitions.flatMap(({ from, to, adjacent }) =>
        adjacent && to.placement.kind === 'written-time' ? [{ from, to, boundary: to.placement.start }] : []) : [];
    const held = unique.flatMap(note => changesWithinNote(note, boundaries));
    const successors = new Map(unique.slice(1).map((note, i) => [unique[i].id, note]));
    const predecessors = new Map(unique.slice(1).map((note, i) => [note.id, unique[i]]));
    const suspensions = (verifiedTime && !progression.needsReview ? held : []).flatMap(change => {
        const { note, from, to, fromDegree, toDegree } = change;
        const next = successors.get(note.id);
        const previous = predecessors.get(note.id);
        if (!fromDegree || toDegree || note.chord !== from || !next || next.chord !== to || next.degree !== '3'
            || !moving(note, next) || note.technique || next.technique || next.midi !== note.midi - 1
            || pc(note.midi - to.chord.rootPitchClass) !== 5
            || (previous && compareExactTimes(previous.interval!.end, note.interval!.start) > 0)
            || compareExactTimes(note.interval!.end, next.interval!.start) !== 0) return [];
        const interrupted = document.moments.slice(note.position, next.position + 1).some((position, i) =>
            position.rest || position.mutes?.some(mute => mute.string === note.string)
            || (i > 0 && i < next.position - note.position && position.notes.some(other => other.string === note.string)));
        return interrupted ? [] : [{ ...change, next }];
    });

    return { notes: unique, motions, shapes, held, suspensions, sameOnset: sameSource.size > 0,
        timing: !timed ? 'source-order' : orderConflict ? 'conflicting-time' : hasMissingTime ? 'missing-time' : 'written-time-order' } as const;
}
