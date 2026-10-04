import { describe, expect, it } from 'vitest';
import { analyzeTabSelection } from './analysis';
import { parseAsciiTab } from './ascii';
import { createEmptyTabDocument, deleteTabMoment, deleteTabMoments, insertTabMoment, retuneTabDocument, setTabFret, splitTabMeasure } from './editing';
import { canSustainFromPrevious, normalizeTabFraction, setTabBeatOffset, setTabDuration, setTabMeter, setTabMute, setTabRest, setTabSustain } from './input-capabilities';
import { TAB_TUNINGS, type TabDocument } from './types';

const quarter = { numerator: 1, denominator: 1 };
const halfQuarter = { numerator: 1, denominator: 2 };
const firstId = (document: TabDocument) => document.moments[0].id;
function pitched(count = 4, measures = 1): TabDocument {
    const empty = createEmptyTabDocument(count, measures);
    return setTabFret(empty, firstId(empty), 0, 5, 'origin');
}

describe('optional TAB input capabilities', () => {
    it('keeps default free timing without implicit meter, offsets, durations, or rests', () => {
        const document = createEmptyTabDocument(16, 4);
        expect(document.timing).toBe('order-only');
        expect(document).not.toHaveProperty('meter');
        for (const moment of document.moments) {
            expect(moment.notes).toEqual([]);
            expect(moment).not.toHaveProperty('rest');
            expect(moment).not.toHaveProperty('beatOffset');
        }
    });

    it('normalizes exact fractions and permits zero only for offsets', () => {
        expect(normalizeTabFraction({ numerator: 6, denominator: 8 })).toEqual({ numerator: 3, denominator: 4 });
        expect(normalizeTabFraction({ numerator: 0, denominator: 8 }, true)).toEqual({ numerator: 0, denominator: 1 });
        expect(normalizeTabFraction({ numerator: 0, denominator: 8 })).toBeNull();
        for (const value of [{ numerator: -1, denominator: 4 }, { numerator: 1, denominator: 0 }, { numerator: 1.5, denominator: 4 }, { numerator: 1025, denominator: 4 }, { numerator: 1, denominator: 1025 }, { numerator: NaN, denominator: 4 }]) {
            expect(normalizeTabFraction(value, true)).toBeNull();
        }
    });

    it('changes meter without assigning beats or erasing independent duration and offset input', () => {
        let document = pitched();
        document = setTabDuration(document, firstId(document), 0, quarter);
        document = setTabBeatOffset(document, firstId(document), { numerator: 0, denominator: 4 });
        const changed = setTabMeter(document, { numerator: 3, denominator: 8 });
        expect(changed.meter).toEqual({ numerator: 3, denominator: 8 });
        expect(changed.timing).toBe('order-only');
        expect(changed.moments).toBe(document.moments);
        expect(changed.moments[1]).not.toHaveProperty('beatOffset');
        const another = setTabMeter(changed, { numerator: 7, denominator: 8 });
        expect(another.moments[0].notes[0].duration).toEqual(quarter);
        expect(another.moments[0].beatOffset).toEqual({ numerator: 0, denominator: 1 });
        expect(setTabMeter(another, undefined)).not.toHaveProperty('meter');
        for (const meter of [{ numerator: 0, denominator: 4 }, { numerator: 33, denominator: 4 }, { numerator: 3, denominator: 3 }, { numerator: 3, denominator: 64 }]) expect(setTabMeter(changed, meter)).toBe(changed);
        expect(setTabMeter(changed, { numerator: 3, denominator: 8 })).toBe(changed);
    });

    it('supports independent duration on chord notes at the same onset', () => {
        let document = pitched();
        const id = firstId(document);
        document = setTabFret(document, id, 1, 5, 'chord-note');
        document = setTabDuration(document, id, 0, { numerator: 8, denominator: 4 });
        document = setTabDuration(document, id, 1, halfQuarter);
        expect(document.moments[0].notes.map(note => note.duration)).toEqual([{ numerator: 2, denominator: 1 }, halfQuarter]);
        expect(setTabDuration(document, id, 0, { numerator: 0, denominator: 1 })).toBe(document);
        expect(setTabDuration(document, id, 4, quarter)).toBe(document);
        expect(setTabDuration(document, id, 6, quarter)).toBe(document);
        expect(setTabDuration(document, id, 1, undefined).moments[0].notes[1]).not.toHaveProperty('duration');
    });

    it('distinguishes explicit rest, unpitched mute, and a blank placeholder', () => {
        const empty = createEmptyTabDocument();
        const id = firstId(empty);
        const rest = setTabRest(empty, id, true);
        expect(rest.moments[0]).toMatchObject({ notes: [], rest: {} });
        expect(empty.moments[0]).not.toHaveProperty('rest');
        const measuredRest = setTabDuration(rest, id, 0, quarter);
        expect(measuredRest.moments[0].rest).toEqual({ duration: quarter });
        const muted = setTabMute(measuredRest, id, 5, true);
        expect(muted.moments[0]).toMatchObject({ notes: [], mutes: [{ string: 5 }] });
        expect(muted.moments[0]).not.toHaveProperty('rest');
        expect(setTabMute(muted, id, 5, false).moments[0]).not.toHaveProperty('mutes');
        expect(setTabRest(rest, id, false).moments[0]).not.toHaveProperty('rest');
    });

    it('replaces conflicting cells deliberately while preserving other chord strings', () => {
        let document = pitched();
        const id = firstId(document);
        document = setTabFret(document, id, 1, 7, 'other-string');
        const muted = setTabMute(document, id, 0, true);
        expect(muted.moments[0].notes.map(note => note.id)).toEqual(['other-string']);
        const sounded = setTabFret(muted, id, 0, 9, 'new-attack');
        expect(sounded.moments[0]).not.toHaveProperty('mutes');
        const rest = setTabRest(sounded, id, true);
        expect(rest.moments[0]).toMatchObject({ notes: [], rest: {} });
        expect(setTabFret(rest, id, 0, 4, 'from-rest').moments[0]).not.toHaveProperty('rest');
    });

    it('clears rest, mute, or sustain through the existing cell-clear command', () => {
        const document = pitched();
        const id = document.moments[1].id;
        for (const changed of [setTabRest(document, id, true), setTabMute(document, id, 0, true), setTabSustain(document, id, 0, true)]) {
            const cleared = setTabFret(changed, id, 0, null, 'unused');
            expect(cleared.moments[1]).not.toHaveProperty('rest');
            expect(cleared.moments[1]).not.toHaveProperty('mutes');
            expect(cleared.moments[1]).not.toHaveProperty('sustains');
        }
    });

    it('represents tied continuation across a bar without adding an attacked pitch', () => {
        let document = pitched(4, 2);
        document = setTabDuration(document, firstId(document), 0, quarter);
        document = setTabSustain(document, document.moments[1].id, 0, true);
        document = setTabSustain(document, document.moments[2].id, 0, true);
        document = setTabDuration(document, document.moments[2].id, 0, halfQuarter);
        expect(document.moments[1]).toMatchObject({ notes: [], sustains: [{ noteId: 'origin' }] });
        expect(document.moments[2]).toMatchObject({ measure: 2, notes: [], sustains: [{ noteId: 'origin', duration: halfQuarter }] });
        expect(document.moments[0].notes[0].duration).toEqual(quarter);
        expect(document.moments.flatMap(moment => moment.notes)).toHaveLength(1);
    });

    it('allows independent continuation under intervening notes on another string', () => {
        let document = pitched();
        document = setTabFret(document, document.moments[1].id, 1, 3, 'melody');
        expect(canSustainFromPrevious(document, document.moments[2].id, 0)).toBe(true);
        document = setTabSustain(document, document.moments[2].id, 0, true);
        expect(document.moments[2].sustains).toEqual([{ noteId: 'origin' }]);
    });

    it('does not continue across an unknown blank, explicit rest, or same-string mute', () => {
        const document = pitched();
        const target = document.moments[2].id;
        for (const blocked of [document, setTabRest(document, document.moments[1].id, true), setTabMute(document, document.moments[1].id, 0, true)]) {
            expect(canSustainFromPrevious(blocked, target, 0)).toBe(false);
            expect(setTabSustain(blocked, target, 0, true)).toBe(blocked);
        }
    });

    it('uses the latest same-string attack and refuses to erase a different current pitch', () => {
        let document = pitched();
        document = setTabFret(document, document.moments[1].id, 0, 7, 'new-origin');
        const tied = setTabSustain(document, document.moments[2].id, 0, true);
        expect(tied.moments[2].sustains).toEqual([{ noteId: 'new-origin' }]);
        const different = setTabFret(document, document.moments[2].id, 0, 9, 'different');
        expect(canSustainFromPrevious(different, different.moments[2].id, 0)).toBe(false);
        expect(setTabSustain(different, different.moments[2].id, 0, true)).toBe(different);
        let repeated = setTabFret(document, document.moments[2].id, 0, 7, 'repeated');
        repeated = setTabDuration(repeated, repeated.moments[2].id, 0, halfQuarter);
        expect(setTabSustain(repeated, repeated.moments[2].id, 0, true).moments[2]).toMatchObject({ notes: [], sustains: [{ noteId: 'new-origin', duration: halfQuarter }] });
    });

    it('invalidates continuation when its original pitch is changed or removed', () => {
        let document = pitched();
        document = setTabSustain(document, document.moments[1].id, 0, true);
        document = setTabSustain(document, document.moments[2].id, 0, true);
        for (const changed of [setTabFret(document, firstId(document), 0, 7, 'unused'), deleteTabMoment(document, firstId(document)), setTabMute(document, firstId(document), 0, true)]) {
            expect(changed.moments.every(moment => !moment.sustains?.length)).toBe(true);
        }
    });

    it('preserves an explicit continuation across inserted unknown positions without generating a new tie', () => {
        const document = pitched();
        const tied = setTabSustain(document, document.moments[1].id, 0, true);
        const changed = insertTabMoment(tied, firstId(tied), 'unknown-position');
        expect(changed.moments[2].sustains).toEqual([{ noteId: 'origin' }]);
        expect(changed.moments[1]).not.toHaveProperty('sustains');
        expect(canSustainFromPrevious(changed, changed.moments[3].id, 0)).toBe(true);
        const offsetChanged = setTabBeatOffset(changed, 'unknown-position', halfQuarter);
        expect(offsetChanged.moments[2].sustains).toEqual([{ noteId: 'origin' }]);
    });

    it('preserves duration but removes pitch-specific techniques and incoming links on fret change', () => {
        let document = pitched();
        document = setTabFret(document, document.moments[1].id, 0, 7, 'target');
        document = setTabDuration(document, firstId(document), 0, quarter);
        document = { ...document, moments: document.moments.map((moment, index) => index === 0 ? { ...moment, notes: [{ ...moment.notes[0], techniques: [{ kind: 'hammer-on', toNoteId: 'target' }, { kind: 'vibrato', notation: '~' }] }] } : moment) };
        const sourceChanged = setTabFret(document, firstId(document), 0, 6, 'unused');
        expect(sourceChanged.moments[0].notes[0]).toMatchObject({ id: 'origin', duration: quarter, source: null });
        expect(sourceChanged.moments[0].notes[0]).not.toHaveProperty('techniques');
        const targetChanged = setTabFret(document, document.moments[1].id, 0, 9, 'unused');
        expect(targetChanged.moments[0].notes[0].techniques).toEqual([{ kind: 'vibrato', notation: '~' }]);
        expect(document.moments[0].notes[0].techniques).toHaveLength(2);
        expect(deleteTabMoment(document, document.moments[1].id).moments[0].notes[0].techniques).toEqual([{ kind: 'vibrato', notation: '~' }]);
    });

    it.each(['hammer-on', 'pull-off', 'slide'] as const)('preserves explicit %s links under timing edits and retuning', kind => {
        let document = pitched();
        document = setTabFret(document, document.moments[1].id, 0, 7, 'target');
        const technique = { kind, toNoteId: 'target', source: { line: 1, column: 4 } };
        document = { ...document, moments: document.moments.map((moment, index) => index === 0 ? { ...moment, notes: [{ ...moment.notes[0], techniques: [technique] }] } : moment) };
        let changed = setTabDuration(document, firstId(document), 0, halfQuarter);
        changed = setTabBeatOffset(changed, firstId(changed), quarter);
        changed = retuneTabDocument(changed, TAB_TUNINGS[2].midi, 1);
        expect(changed.moments[0].notes[0].techniques).toEqual([technique]);
        expect(changed.moments[0].notes[0].duration).toEqual(halfQuarter);
        expect(document.moments[0].notes[0]).not.toHaveProperty('duration');
    });

    it('invalidates a cross-column technique when a new same-string attack interrupts its endpoint', () => {
        let document = pitched();
        document = setTabFret(document, document.moments[1].id, 1, 3, 'other-string');
        document = setTabFret(document, document.moments[2].id, 0, 7, 'target');
        document = { ...document, moments: document.moments.map((moment, index) => index === 0 ? { ...moment, notes: [{ ...moment.notes[0], techniques: [{ kind: 'slide', toNoteId: 'target' }] }] } : moment) };
        const changed = setTabFret(document, document.moments[1].id, 0, 6, 'interruption');
        expect(changed.moments[0].notes[0]).not.toHaveProperty('techniques');
        expect(changed.moments[1].notes.map(note => note.id)).toEqual(['interruption', 'other-string']);
    });

    it('retains explicit connector endpoints across blank insertion and placeholder timing edits', () => {
        let document = pitched();
        document = setTabFret(document, document.moments[1].id, 0, 7, 'target');
        const technique = { kind: 'hammer-on' as const, toNoteId: 'target' };
        document = { ...document, moments: document.moments.map((moment, index) => index === 0 ? { ...moment, notes: [{ ...moment.notes[0], techniques: [technique] }] } : moment) };
        const inserted = insertTabMoment(document, firstId(document), 'unknown-between-endpoints');
        expect(inserted.moments[0].notes[0].techniques).toEqual([technique]);
        const timed = setTabBeatOffset(inserted, 'unknown-between-endpoints', halfQuarter);
        expect(timed.moments[0].notes[0].techniques).toEqual([technique]);
        const interrupted = setTabRest(timed, 'unknown-between-endpoints', true);
        expect(interrupted.moments[0].notes[0]).not.toHaveProperty('techniques');
    });

    it('clears every kind of content in a final position while preserving its stable identity', () => {
        let document = pitched(2, 2);
        document = setTabSustain(document, document.moments[1].id, 0, true);
        document = setTabBeatOffset(document, document.moments[1].id, quarter);
        const cleared = deleteTabMoment(document, document.moments[1].id);
        expect(cleared.moments[1]).toEqual({ id: document.moments[1].id, index: 1, measure: 2, column: 2, notes: [] });
        let rest = setTabRest(createEmptyTabDocument(1), 'edit-moment-0', true);
        rest = setTabDuration(rest, 'edit-moment-0', 0, quarter);
        expect(deleteTabMoments(rest, ['edit-moment-0']).moments[0]).toEqual({ id: 'edit-moment-0', index: 0, measure: 1, column: 1, notes: [] });
    });

    it('refuses to silently rebase timed positions and preserves offsets when a split is safe', () => {
        let document = pitched(4, 2);
        document = setTabMeter(document, { numerator: 4, denominator: 4 });
        document = setTabDuration(document, firstId(document), 0, quarter);
        for (const moment of document.moments) document = setTabBeatOffset(document, moment.id, { numerator: moment.index % 2, denominator: 1 });
        expect(splitTabMeasure(document, firstId(document), 'unused')).toBe(document);
        document = setTabBeatOffset(document, document.moments[1].id, undefined);
        const changed = splitTabMeasure(document, firstId(document), 'unused');
        expect(changed.moments[0].beatOffset).toEqual({ numerator: 0, denominator: 1 });
        expect(changed.moments[1].beatOffset).toBeUndefined();
        expect(changed.moments.slice(2).map(moment => moment.beatOffset)).toEqual([{ numerator: 0, denominator: 1 }, quarter]);
        expect(changed.moments[0].notes[0].duration).toEqual(quarter);
        expect(changed.meter).toEqual({ numerator: 4, denominator: 4 });
        expect(changed.timing).toBe('order-only');
    });

    it('preserves fret-relative bend/release metadata and tie identity during retuning', () => {
        let document = pitched();
        document = { ...document, moments: document.moments.map((moment, index) => index === 0 ? { ...moment, notes: [{ ...moment.notes[0], techniques: [{ kind: 'bend', targetFret: 7, notation: 'b7' }, { kind: 'release', targetFret: 5, notation: 'r5' }] }] } : moment) };
        document = setTabSustain(document, document.moments[1].id, 0, true);
        const changed = retuneTabDocument(document, TAB_TUNINGS[2].midi, 2);
        expect(changed.moments[0].notes[0].techniques).toEqual(document.moments[0].notes[0].techniques);
        expect(changed.moments[1].sustains).toEqual([{ noteId: 'origin' }]);
        expect(changed.moments.flatMap(moment => moment.notes)).toHaveLength(1);
    });

    it('does not change existing pitch-based results when optional notation metadata is supplied', () => {
        const source = ['e|--1--1--0--|', 'B|--3--0--1--|', 'G|--2--0--0--|', 'D|-----------|', 'A|-----------|', 'E|-----------|'].join('\n');
        const parsed = parseAsciiTab(source);
        if (!parsed.ok) throw new Error('Fixture failed to parse');
        const original = parsed.document;
        let changed = setTabMeter(original, { numerator: 6, denominator: 8 });
        for (const moment of changed.moments) {
            changed = setTabBeatOffset(changed, moment.id, { numerator: moment.index, denominator: 2 });
            for (const note of moment.notes) changed = setTabDuration(changed, moment.id, note.string, { numerator: note.string + 1, denominator: 2 });
        }
        const context = { scale: null, chord: null, frame: { tonic: 'C', mode: 'major' as const, lens: 'jazz-pop' as const } };
        const selection = { start: 0, end: original.moments.length - 1 };
        const before = analyzeTabSelection(original, selection, context), after = analyzeTabSelection(changed, selection, context);
        for (const key of ['candidates', 'pitchClasses', 'roman', 'melodicRuns', 'arpeggios', 'harmonicSpans', 'chordSequence', 'progressionReadings'] as const) expect(after[key]).toEqual(before[key]);
    });
});
