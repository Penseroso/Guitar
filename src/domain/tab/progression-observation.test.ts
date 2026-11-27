import { describe, expect, it } from 'vitest';
import type { ChordRef, TonalFrame } from '@/domain/harmony/types';
import { observeSuppliedProgression } from './progression-observation';
import { analyzeSuppliedMelody } from './supplied-melody';
import { parseChordBoundary, resolveSuppliedHarmony, type SuppliedTabChord } from './supplied-harmony';
import type { TabDocument } from './types';
import { observeTabAcrossBarsWrittenTime } from './written-time-across-bars';

const frame: TonalFrame = { tonic: 'C', mode: 'major', lens: 'jazz-pop' };
const f = (numerator: number, denominator = 1) => ({ numerator, denominator });
const chord = (root: string, chordId = 'major'): ChordRef => ({ root, chordId });
const c = chord('C'), dm = chord('D', 'minor'), g7 = chord('G', 'dominant-7'), a7 = chord('A', 'dominant-7');
const noteId = (position: number, string = 0) => `n${position}-${string}`;
function score(pitches: (number | number[])[], timed = false): TabDocument {
    return {
        format: 'authored', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0,
        measureCount: 1, ...(timed ? { meter: f(4, 4) } : {}),
        moments: pitches.map((midis, index) => ({
            id: `m${index}`, measure: 1, index, column: index,
            ...(timed ? { beatOffset: f(index) } : {}),
            notes: (Array.isArray(midis) ? midis : [midis]).map((midi, string) => ({
                id: noteId(index, string), string, midi, fret: 0, pitchClass: 11, source: null, ...(timed ? { duration: f(1) } : {}),
            })),
        })),
    };
}
const at = (value: ChordRef, first: number, last = first): SuppliedTabChord => ({
    id: 'p' + first, scoreId: 1, chord: value, binding: { kind: 'positions', firstId: 'm' + first, lastId: 'm' + last },
});
const time = (value: ChordRef, start: string, end: string): SuppliedTabChord => ({
    id: 't' + start, scoreId: 1, chord: value, binding: {
        kind: 'written-time', start: parseChordBoundary(start)!, end: parseChordBoundary(end)!, originsRevision: 1,
    },
});
const rows = (document: TabDocument, ...entries: SuppliedTabChord[]) => resolveSuppliedHarmony(document, 1, 1, entries);
const written = (document: TabDocument) => observeTabAcrossBarsWrittenTime(document, 1, { model: 'regular-bar-origins' });

describe('relationships between supplied chords', () => {
    it('reads actual neighboring formulas and leaves cadence evidence unresolved', () => {
        const progression = observeSuppliedProgression(rows(score([62, 59, 60]), at(c, 2), at(chord('D', 'minor-7'), 0), at(g7, 1)), 'positions', frame);
        const ending = progression.transitions[1];
        expect(ending.prefix?.chord.name).toBe('Dm7');
        expect(ending.reading).toMatchObject({ kind: 'tonic', label: 'ii–V–I' });
        expect(ending.reading && 'endingEvidence' in ending.reading && ending.reading.endingEvidence)
            .toEqual(['Confirmed phrase ending', 'Confirmed bass/inversions', 'Final soprano note']);
        expect(ending.facts?.shared).toEqual([7]);
    });

    it('requires the supplied secondary dominant and next chord, with no automatic frame', () => {
        const document = score([61, 62]);
        expect(observeSuppliedProgression(rows(document, at(a7, 0), at(dm, 1)), 'positions', frame).transitions[0].reading)
            .toEqual({ kind: 'applied', label: 'V7/ii' });
        expect(observeSuppliedProgression(rows(document, at(a7, 0), at(c, 1)), 'positions', frame).transitions[0].reading).toBeNull();
        expect(observeSuppliedProgression(rows(document, at(chord('A', 'minor'), 0), at(dm, 1)), 'positions', frame).transitions[0].reading).toBeNull();
        expect(observeSuppliedProgression(rows(document, at(a7, 0), at(dm, 1)), 'positions', null).transitions[0].reading).toBeNull();
    });

    it('keeps Db7 as the actual predecessor and reads the subV relationship under jazz/pop', () => {
        const entries = rows(score([61, 60]), at(chord('Db', 'dominant-7'), 0), at(c, 1));
        const jazz = observeSuppliedProgression(entries, 'positions', frame).transitions[0];
        expect(jazz.from.chord.chordId).toBe('dominant-7');
        expect(jazz.from.chord.root).toBe('Db');
        expect(jazz.reading).toEqual({ kind: 'tritone', label: 'subV7' });
        expect(observeSuppliedProgression(entries, 'positions', { ...frame, lens: 'classical' }).transitions[0].reading).toBeNull();
    });

    it('reads minor iiø–V–i with a supplied minor frame', () => {
        const document = score([62, 59, 60]);
        const entries = rows(document, at(chord('D', 'half-diminished-7'), 0), at(g7, 1), at(chord('C', 'minor'), 2));
        expect(observeSuppliedProgression(entries, 'positions', { ...frame, mode: 'minor' }).transitions[1].reading)
            .toMatchObject({ kind: 'tonic', label: 'iiø–V–i' });
    });

    it('does not bridge a gap, overlap, unplaced chord, or placement mode', () => {
        const document = score([67, 65, 60], true);
        const gap = observeSuppliedProgression(rows(document, at(g7, 0), at(c, 2)), 'positions', frame);
        expect(gap.transitions[0]).toMatchObject({ adjacent: false, reading: null, facts: null });
        const overlap = observeSuppliedProgression(rows(document, at(g7, 0, 1), at(c, 1, 2)), 'positions', frame);
        expect(overlap).toMatchObject({ conflict: true, transitions: [] });
        const unplaced = observeSuppliedProgression(rows(document, at(g7, 0), at(c, 1), at(dm, 4)), 'positions', frame);
        expect(unplaced.needsReview).toBe(1);
        expect(unplaced.transitions[0].reading).toBeNull();
        expect(observeSuppliedProgression(rows(document, at(g7, 0), time(c, '1', '2')), 'positions', frame).transitions).toEqual([]);
        const exact = observeSuppliedProgression(rows(document, time(g7, '0', '1/3'), time(c, '2/6', '2')), 'written-time', frame);
        expect(exact.transitions[0]).toMatchObject({ adjacent: true, reading: { label: 'V–I' } });
    });
});

describe('melody against supplied chords', () => {
    it('explains movement and degrees of the explicitly selected notes', () => {
        for (const [pitches, movement] of [[[71, 72], 1], [[65, 64], -1], [[71, 67], -4]] as const) {
            const document = score([...pitches]);
            const progression = observeSuppliedProgression(rows(document, at(g7, 0), at(c, 1)), 'positions', frame);
            const analysis = analyzeSuppliedMelody(document, progression, 'positions', [noteId(1), noteId(0)]);
            expect(analysis.timing).toBe('source-order');
            expect(analysis.motions).toMatchObject([{ semitones: movement, guide: movement !== -4 }]);
        }
        const document = score([64, 64]);
        const progression = observeSuppliedProgression(rows(document, at(c, 0), at(chord('A', 'minor'), 1)), 'positions', frame);
        const analysis = analyzeSuppliedMelody(document, progression, 'positions', [noteId(0), noteId(1)]);
        expect(analysis.motions[0]).toMatchObject({ from: { degree: '3' }, to: { degree: '5' }, semitones: 0, commonChordTone: true });
        expect(analysis.held).toEqual([]);
    });

    it('uses selected occurrences in a polyphonic score and abstains on two selected notes at one onset', () => {
        const document = score([[59, 72], [60, 76]]);
        const progression = observeSuppliedProgression(rows(document, at(g7, 0), at(c, 1)), 'positions', frame);
        const selected = analyzeSuppliedMelody(document, progression, 'positions', [noteId(0), noteId(1)]);
        expect(selected.motions).toMatchObject([{ from: { midi: 59 }, to: { midi: 60 }, semitones: 1, guide: true }]);
        const ambiguous = analyzeSuppliedMelody(document, progression, 'positions', [noteId(0), noteId(0, 1), noteId(1)]);
        expect(ambiguous).toMatchObject({ sameOnset: true, motions: [] });
    });

    it.each([[64, 'passing'], [60, 'neighbor']] as const)('recognizes the bounded three-note shape ending at %i', (arrival, kind) => {
        const document = score([60, 62, arrival]);
        const progression = observeSuppliedProgression(rows(document, at(c, 0, 2)), 'positions', null);
        const analysis = analyzeSuppliedMelody(document, progression, 'positions', [noteId(0), noteId(1), noteId(2)]);
        expect(analysis.shapes).toMatchObject([{ kind, middle: { midi: 62, degree: null } }]);
        expect(analysis.suspensions).toEqual([]);
        const switched = observeSuppliedProgression(rows(document, at(c, 0), at(c, 1, 2)), 'positions', null);
        expect(analyzeSuppliedMelody(document, switched, 'positions', [noteId(0), noteId(1), noteId(2)]).shapes).toEqual([]);
    });

    it('preserves an exact held relation and requires preparation, overlap, and contiguous written resolution for a 4–3', () => {
        const document = score([65, 64], true);
        document.moments[0].notes[0].duration = f(1);
        const read = (before = chord('F')) => {
            const progression = observeSuppliedProgression(rows(document, time(before, '0', '1/2'), time(c, '1/2', '2')), 'written-time', frame);
            return analyzeSuppliedMelody(document, progression, 'written-time', [noteId(0), noteId(1)], written(document));
        };
        expect(read()).toMatchObject({
            timing: 'written-time-order',
            held: [{ note: { id: noteId(0) }, fromDegree: '1', toDegree: null }],
            suspensions: [{ note: { midi: 65 }, next: { midi: 64, degree: '3' } }],
        });
        expect(read(chord('G')).suspensions).toEqual([]);
        document.moments[0].notes[0].duration = f(1, 2);
        expect(read()).toMatchObject({ held: [], suspensions: [] });
        delete document.moments[0].notes[0].duration;
        expect(read()).toMatchObject({ timing: 'missing-time', held: [], suspensions: [] });
    });

    it('withholds time-based movement interpretation when written starts contradict the selected position order', () => {
        const document = score([65, 64], true);
        document.moments[0].beatOffset = f(2);
        const progression = observeSuppliedProgression(rows(document, time(chord('F'), '0', '1'), time(c, '1', '4')), 'written-time', frame);
        expect(analyzeSuppliedMelody(document, progression, 'written-time', [noteId(0), noteId(1)], written(document)))
            .toMatchObject({ timing: 'conflicting-time', held: [], suspensions: [], motions: [{ semitones: -1, guide: false }] });
    });

    it('keeps known written crossings when another selected note is untimed', () => {
        const document = score([65, 64, 67], true);
        delete document.moments[2].notes[0].duration;
        const progression = observeSuppliedProgression(rows(document, time(chord('F'), '0', '1/2'), time(c, '1/2', '3')), 'written-time', frame);
        const result = analyzeSuppliedMelody(document, progression, 'written-time', [noteId(0), noteId(1), noteId(2)], written(document));
        expect(result).toMatchObject({ timing: 'missing-time', held: [{ note: { id: noteId(0) } }], suspensions: [] });
    });

    it('places known starts without lengths and keeps missing starts distinct from uncovered starts', () => {
        const document = score([71, 64, 64, 64], true);
        for (const moment of document.moments) delete moment.notes[0].duration;
        document.measureCount = 2;
        for (const moment of document.moments) moment.measure = 2;
        delete document.moments[3].beatOffset;
        const progression = observeSuppliedProgression(rows(document, time(g7, '4', '5'), time(c, '5', '6')), 'written-time', frame);
        const ids = document.moments.map(moment => moment.notes[0].id);
        const read = (snapshot: ReturnType<typeof written>) => analyzeSuppliedMelody(document, progression, 'written-time', ids, snapshot);
        const result = read(written(document));
        expect(result.notes.map(note => [note.writtenStart?.numerator, note.chord?.chord.name, note.degree])).toEqual([
            [4n, 'G7', '3'], [5n, 'C', '3'], [6n, undefined, null], [undefined, undefined, null],
        ]);
        expect(result.notes.every(note => note.interval === null)).toBe(true);
        expect(result).toMatchObject({ timing: 'missing-time', held: [], shapes: [], suspensions: [] });
        expect(result.motions.every(motion => !motion.guide && !motion.commonChordTone)).toBe(true);
        expect(read(written({ ...document })).notes.every(note => note.writtenStart === null && note.chord === null)).toBe(true);
    });
});
