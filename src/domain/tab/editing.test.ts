import { describe, expect, it } from 'vitest';
import { parseAsciiTab } from './ascii';
import { TAB_MIXED_EXAMPLE, TAB_TUNINGS } from './types';
import { appendTabMeasures, createEmptyTabDocument, deleteTabMoment, deleteTabMoments, insertTabMoment, MAX_EDITABLE_TAB_MOMENTS, retuneTabDocument, setTabFret, splitTabMeasure } from './editing';

describe('canonical tab editing', () => {
    it('creates stable empty columns without inventing rests, notes or timing', () => {
        const document = createEmptyTabDocument();
        expect(document.format).toBe('authored');
        expect(document.timing).toBe('order-only');
        expect(document.moments).toHaveLength(8);
        expect(new Set(document.moments.map(moment => moment.id)).size).toBe(8);
        expect(document.moments.every(moment => moment.notes.length === 0)).toBe(true);
        expect(createEmptyTabDocument(0).moments).toHaveLength(1);
        expect(createEmptyTabDocument(2000).moments).toHaveLength(MAX_EDITABLE_TAB_MOMENTS);
    });

    it.each([0, 10, 12, 24, 36])('sets fret %i without changing its column or other notes', fret => {
        const original = createEmptyTabDocument();
        const id = original.moments[0].id;
        const document = setTabFret(original, id, 0, fret, 'authored-note');
        expect(document.moments[0].id).toBe(id);
        expect(document.moments[0].notes).toEqual([{ id: 'authored-note', string: 0, fret, midi: 64 + fret, pitchClass: (64 + fret) % 12, source: null }]);
        expect(original.moments[0].notes).toEqual([]);
        expect(document.moments[1]).toBe(original.moments[1]);
    });

    it('builds aligned notes in one column and sequential notes in separate columns', () => {
        let document = createEmptyTabDocument();
        const first = document.moments[0].id, second = document.moments[1].id;
        document = setTabFret(document, first, 0, 0, 'note-1');
        document = setTabFret(document, first, 1, 1, 'note-2');
        document = setTabFret(document, second, 0, 3, 'note-3');
        expect(document.moments[0].notes.map(note => note.string)).toEqual([0, 1]);
        expect(document.moments[1].notes.map(note => note.fret)).toEqual([3]);
        document = setTabFret(document, first, 0, null, 'unused');
        expect(document.moments[0].notes.map(note => note.id)).toEqual(['note-2']);
        expect(document.moments).toHaveLength(8);
    });

    it('retains note identity while changed frets receive authored provenance', () => {
        const parsed = parseAsciiTab(TAB_MIXED_EXAMPLE);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) throw new Error('Invalid mixed example');
        const original = parsed.document, first = original.moments[0];
        expect(first.notes[0].source).not.toBeNull();
        const document = setTabFret(original, first.id, 0, 12, 'unused');
        expect(document.moments[0].notes[0].id).toBe(first.notes[0].id);
        expect(document.moments[0].notes[0].source).toBeNull();
        expect(original.moments[0].notes[0].source).not.toBeNull();
    });

    it('rejects out-of-range frets, strings and pitch overflow atomically', () => {
        const document = createEmptyTabDocument(), id = document.moments[0].id;
        for (const fret of [-1, 37, 1.5, NaN, Infinity]) expect(setTabFret(document, id, 0, fret, 'note')).toBe(document);
        for (const string of [-1, 6, 0.5, NaN]) expect(setTabFret(document, id, string, 1, 'note')).toBe(document);
        expect(setTabFret(document, 'missing', 0, 1, 'note')).toBe(document);
        const high = { ...document, tuningMidi: [120, 59, 55, 50, 45, 40] };
        expect(setTabFret(high, id, 0, 12, 'note')).toBe(high);
    });

    it('preserves stable IDs and sequential indices through insertion and deletion', () => {
        const original = createEmptyTabDocument(3);
        const inserted = insertTabMoment(original, original.moments[0].id, 'new-column');
        expect(inserted.moments.map(moment => moment.id)).toEqual(['edit-moment-0', 'new-column', 'edit-moment-1', 'edit-moment-2']);
        expect(inserted.moments.map(moment => moment.index)).toEqual([0, 1, 2, 3]);
        const deleted = deleteTabMoment(inserted, 'new-column');
        expect(deleted.moments).toEqual(original.moments);
        expect(insertTabMoment(original, 'missing', 'new')).toBe(original);
        expect(insertTabMoment(original, original.moments[0].id, original.moments[1].id)).toBe(original);
    });

    it('keeps a final empty column and never exceeds the column limit', () => {
        let document = createEmptyTabDocument(1);
        const id = document.moments[0].id;
        document = setTabFret(document, id, 0, 3, 'note');
        document = deleteTabMoment(document, id);
        expect(document.moments).toHaveLength(1);
        expect(document.moments[0].id).toBe(id);
        expect(document.moments[0].notes).toEqual([]);
        expect(deleteTabMoment(document, id)).toBe(document);
        const full = createEmptyTabDocument(MAX_EDITABLE_TAB_MOMENTS);
        expect(insertTabMoment(full, full.moments[0].id, 'overflow')).toBe(full);
    });

    it('deletes a batch across measures while retaining survivors and normalizing position columns', () => {
        let original = createEmptyTabDocument(12, 3);
        original = setTabFret(original, original.moments[2].id, 1, 5, 'surviving-note');
        const removedIds = [0, 1, 4, 5, 6, 7, 9].map(index => original.moments[index].id);
        const changed = deleteTabMoments(original, [...removedIds, removedIds[0], 'missing']);
        expect(changed.measureCount).toBe(3);
        expect(changed.moments.map(moment => moment.id)).toEqual([2, 3, 4, 8, 10, 11].map(index => original.moments[index].id));
        expect(changed.moments.map(moment => moment.measure)).toEqual([1, 1, 2, 3, 3, 3]);
        expect(changed.moments.map(moment => moment.index)).toEqual([0, 1, 2, 3, 4, 5]);
        expect(changed.moments.map(moment => moment.column)).toEqual([1, 2, 1, 1, 2, 3]);
        expect(changed.moments[0].notes[0]).toBe(original.moments[2].notes[0]);
        expect(changed.moments[2].notes).toEqual([]);
        expect(original.moments).toHaveLength(12);
    });

    it('clears entire measures in one batch without erasing the measure boundaries', () => {
        let original = createEmptyTabDocument(8, 4);
        for (const moment of original.moments) original = setTabFret(original, moment.id, 0, moment.index, `note-${moment.index}`);
        const cleared = deleteTabMoments(original, original.moments.map(moment => moment.id));
        expect(cleared.measureCount).toBe(4);
        expect(cleared.moments.map(moment => moment.id)).toEqual([0, 2, 4, 6].map(index => original.moments[index].id));
        expect(cleared.moments.map(moment => moment.measure)).toEqual([1, 2, 3, 4]);
        expect(cleared.moments.every(moment => moment.notes.length === 0 && moment.column === 1)).toBe(true);
        expect(deleteTabMoments(cleared, cleared.moments.map(moment => moment.id))).toBe(cleared);
        expect(deleteTabMoments(original, [])).toBe(original);
        expect(deleteTabMoments(original, ['missing'])).toBe(original);
    });

    it('recomputes pitch for tuning/capo while preserving frets and identities', () => {
        const blank = createEmptyTabDocument(), id = blank.moments[0].id;
        const original = setTabFret(blank, id, 5, 0, 'low-note');
        const changed = retuneTabDocument(original, TAB_TUNINGS[1].midi, 3);
        expect(changed.moments[0].notes[0]).toEqual({ ...original.moments[0].notes[0], midi: 41, pitchClass: 5 });
        expect(original.moments[0].notes[0].midi).toBe(40);
        expect(changed.capo).toBe(3);
        expect(changed.tuningMidi).toEqual(TAB_TUNINGS[1].midi);
        expect(retuneTabDocument(original, [127, 127, 127, 127, 127, 127], 1)).toBe(original);
        expect(retuneTabDocument(original, TAB_TUNINGS[0].midi, 13)).toBe(original);
    });

    it('keeps positions flexible within measures and preserves an empty last position', () => {
        const initial = createEmptyTabDocument(16, 4);
        expect(initial.measureCount).toBe(4);
        expect(initial.moments.map(moment => moment.measure)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4]);
        let changed = insertTabMoment(initial, initial.moments[3].id, 'extra-position');
        expect(changed.moments.filter(moment => moment.measure === 1)).toHaveLength(5);
        expect(changed.measureCount).toBe(4);
        for (const moment of changed.moments.filter(moment => moment.measure === 1).slice(1)) changed = deleteTabMoment(changed, moment.id);
        const last = changed.moments[0];
        changed = setTabFret(changed, last.id, 0, 12, 'final-note');
        const cleared = deleteTabMoment(changed, last.id);
        expect(cleared.moments[0]).toMatchObject({ id: last.id, measure: 1, notes: [] });
        expect(cleared.measureCount).toBe(4);
        expect(deleteTabMoment(cleared, last.id)).toBe(cleared);
    });

    it('appends measures atomically and splits positions without altering stable musical identities', () => {
        const initial = createEmptyTabDocument(4);
        const appended = appendTabMeasures(initial, 2, Array.from({ length: 8 }, (_, index) => `appended-${index}`));
        expect(appended.measureCount).toBe(3);
        expect(appended.moments.filter(moment => moment.measure === 3)).toHaveLength(4);
        expect(appendTabMeasures(initial, 1, ['duplicate', 'duplicate', 'a', 'b'])).toBe(initial);
        const split = splitTabMeasure(appended, initial.moments[1].id, 'unused');
        expect(split.moments.map(moment => moment.measure)).toEqual([1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4]);
        expect(split.moments.map(moment => moment.id)).toEqual(appended.moments.map(moment => moment.id));
        const endSplit = splitTabMeasure(initial, initial.moments[3].id, 'empty-measure');
        expect(endSplit.measureCount).toBe(2);
        expect(endSplit.moments.at(-1)).toMatchObject({ id: 'empty-measure', measure: 2, notes: [] });
        const full = createEmptyTabDocument(MAX_EDITABLE_TAB_MOMENTS);
        expect(appendTabMeasures(full, 1, ['a', 'b', 'c', 'd'])).toBe(full);
        expect(splitTabMeasure(full, full.moments.at(-1)!.id, 'overflow')).toBe(full);
        // A split that only repartitions existing positions can still succeed at the limit.
        expect(splitTabMeasure(full, full.moments[0].id, 'unused').measureCount).toBe(2);
    });
});
