import { engineEntry } from '@/domain/chord/engine/catalog';
import { resolveChord, romanLabel, validateFrame } from '@/domain/harmony/roman';
import type { ChordRef, ResolvedHarmonyChord, TonalFrame } from '@/domain/harmony/types';
import { getScaleStructuralTones } from '@/domain/scale/scale-tones';
import type { ScaleRef } from '@/domain/scale/scale-ref';
import { getNoteName } from '@/domain/shared/notes';
import { formatAccidentals, parseNoteName } from '@/domain/shared/spelling';
import { compareExactTimes, parseExactTime, serializeExactTime, type ExactTime, type TabExactFraction } from './exact-time';
import { isValidTabMeter } from './input-capabilities';
import type { TabDocument, TabSelection } from './types';
import type { TabAcrossBarsWrittenTimeSnapshot } from './written-time-across-bars';

export type PositionChordBinding = {
    kind: 'positions';
    firstId: string;
    lastId: string;
};
export type WrittenChordBinding = {
    kind: 'written-time';
    start: TabExactFraction;
    end: TabExactFraction;
    originsRevision: number;
};
export type SuppliedChordBinding = PositionChordBinding | WrittenChordBinding;

export interface SuppliedTabChord {
    id: string;
    scoreId: number;
    chord: ChordRef;
    binding: SuppliedChordBinding;
}

type ResolvedBinding =
    | { kind: 'positions'; first: number; last: number }
    | { kind: 'written-time'; start: ExactTime; end: ExactTime };

export interface SuppliedChordRow {
    entry: SuppliedTabChord;
    chord: ResolvedHarmonyChord | null;
    placement: ResolvedBinding | null;
}

export type SaveChordError = 'unsupported-chord' | 'unavailable-range' | 'overlap';

export function selectedChordPositions(document: TabDocument, selection: TabSelection): PositionChordBinding | null {
    const first = document.moments[Math.min(selection.start, selection.end)];
    const last = document.moments[Math.max(selection.start, selection.end)];
    return first && last ? { kind: 'positions', firstId: first.id, lastId: last.id } : null;
}

/** Asks for a nonnegative score-relative quarter-note number or fraction. */
export function parseChordBoundary(input: string): TabExactFraction | null {
    const [numerator, denominator = '1', ...extra] = input.trim().split('/');
    if (extra.length || !/^\d{1,8}$/.test(numerator) || !/^\d{1,4}$/.test(denominator)) return null;
    const exact = parseExactTime({ numerator, denominator });
    return exact ? serializeExactTime(exact) : null;
}

function resolveSuppliedChord(chord: ChordRef): ResolvedHarmonyChord | null {
    try {
        const chordId = engineEntry(chord.chordId).id;
        return resolveChord({ ...chord, chordId });
    } catch {
        return null;
    }
}

export function resolveSuppliedHarmony(document: TabDocument, scoreId: number, originsRevision: number,
    entries: readonly SuppliedTabChord[]): SuppliedChordRow[] {
    const positions = new Map<string, number>();
    document.moments.forEach((moment, index) => positions.set(moment.id, positions.has(moment.id) ? -1 : index));
    const hasMeter = !!document.meter && isValidTabMeter(document.meter);
    return entries.map(entry => {
        const chord = resolveSuppliedChord(entry.chord);
        const binding = entry.binding;
        let placement: ResolvedBinding | null = null;
        if (entry.scoreId === scoreId && chord) {
            if (binding.kind === 'positions') {
                const first = positions.get(binding.firstId) ?? -1;
                const last = positions.get(binding.lastId) ?? -1;
                if (first >= 0 && first <= last) placement = { kind: 'positions', first, last };
            } else if (hasMeter && binding.originsRevision === originsRevision) {
                const start = parseExactTime(binding.start);
                const end = parseExactTime(binding.end);
                if (start && end && start.numerator >= 0n && compareExactTimes(start, end) < 0) {
                    placement = { kind: 'written-time', start, end };
                }
            }
        }
        return { entry, chord, placement };
    });
}

function overlaps(left: ResolvedBinding, right: ResolvedBinding | null): boolean {
    if (left.kind === 'positions' && right?.kind === 'positions') return left.first <= right.last && right.first <= left.last;
    return left.kind === 'written-time' && right?.kind === 'written-time'
        && compareExactTimes(left.start, right.end) < 0 && compareExactTimes(right.start, left.end) < 0;
}

export function prepareSuppliedChord(document: TabDocument, scoreId: number, originsRevision: number,
    entries: readonly SuppliedTabChord[], proposal: SuppliedTabChord): { entry: SuppliedTabChord } | { error: SaveChordError } {
    const [proposed, ...existing] = resolveSuppliedHarmony(document, scoreId, originsRevision, [proposal, ...entries]);
    if (!proposed.chord) return { error: 'unsupported-chord' };
    const placement = proposed.placement;
    if (!placement) return { error: 'unavailable-range' };
    if (existing.some(row => row.entry.id !== proposal.id && overlaps(placement, row.placement))) return { error: 'overlap' };
    const { root, chordId, bass } = proposed.chord;
    return { entry: {
        id: proposal.id,
        scoreId,
        chord: { root, chordId, ...(bass ? { bass: parseNoteName(bass)!.name } : {}) },
        binding: placement.kind === 'written-time' ? {
            kind: 'written-time', start: serializeExactTime(placement.start), end: serializeExactTime(placement.end), originsRevision,
        } : { ...proposal.binding },
    } };
}

interface NoteRelationship {
    noteId: string;
    momentId: string;
    position: number;
    bar: number;
    string: number;
    midi: number;
    name: string;
    scaleNoteName: string | null;
    chordNoteName: string | null;
    chordDegree: string | null;
    chordMember: boolean;
    scaleDegree: string | null;
    inScale: boolean | null;
    written?: {
        interval: TabAcrossBarsWrittenTimeSnapshot['data']['intervals'][number];
        overlap: { start: TabExactFraction; end: TabExactFraction };
    };
}

function octaveName(midi: number, name: string): string {
    const alteration = parseNoteName(name)!.alteration;
    return `${formatAccidentals(name)}${Math.floor((midi - alteration) / 12) - 1}`;
}

export function describeSuppliedChord(document: TabDocument, row: SuppliedChordRow,
    references: { scale: ScaleRef | null; frame: TonalFrame | null }, written?: TabAcrossBarsWrittenTimeSnapshot) {
    const { chord, placement } = row;
    if (!chord || !placement) return null;
    const scale = references.scale ? getScaleStructuralTones(references.scale) : null;
    let roman: string | null = null;
    if (references.frame) {
        try {
            validateFrame(references.frame);
            roman = romanLabel(chord, references.frame);
        } catch { /* Unsupported references leave the supplied chord intact. */ }
    }
    const notes: NoteRelationship[] = [];
    let invalidNotes = 0;
    const add = (noteId: string, momentId: string, index: number, bar: number, string: number, midi: number, written?: NoteRelationship['written']) => {
        if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
            invalidNotes++;
            return;
        }
        const pc = midi % 12;
        const chordTone = chord.tones.find(tone => tone.pitchClass === pc);
        const scaleTone = scale?.find(tone => tone.pitchClass === pc);
        const chordNoteName = chordTone ? octaveName(midi, chordTone.name) : null;
        const scaleNoteName = scaleTone ? octaveName(midi, scaleTone.scaleNoteName) : null;
        notes.push({
            noteId, momentId, position: index + 1, bar, string, midi,
            name: chordNoteName ?? scaleNoteName ?? octaveName(midi, getNoteName(pc)),
            chordNoteName, scaleNoteName,
            chordDegree: chordTone?.degree ?? null, chordMember: Boolean(chordTone),
            scaleDegree: scaleTone?.scaleDegree ?? null, inScale: scale ? Boolean(scaleTone) : null,
            ...(written ? { written } : {}),
        });
    };
    if (placement.kind === 'positions') {
        document.moments.slice(placement.first, placement.last + 1).forEach((moment, offset) => {
            moment.notes.forEach(note => add(note.id, moment.id, placement.first + offset, moment.measure, note.string, note.midi));
        });
        return { notes, roman, invalidNotes, timing: null };
    }
    if (written?.sourceDocument !== document || written.data.status !== 'ready') return null;
    for (const note of written.data.intervals) {
        const onset = parseExactTime(note.start)!;
        const release = parseExactTime(note.end)!;
        const start = compareExactTimes(onset, placement.start) < 0 ? placement.start : onset;
        const end = compareExactTimes(release, placement.end) > 0 ? placement.end : release;
        if (compareExactTimes(start, end) >= 0) continue;
        add(note.noteId, note.momentId, note.momentIndex, note.sourceMeasure, note.string, note.midi,
            { interval: note, overlap: { start: serializeExactTime(start), end: serializeExactTime(end) } });
    }
    return { notes, roman, invalidNotes, timing: written.data.populationCoverage };
}
