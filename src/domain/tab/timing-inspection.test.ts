import { describe, expect, it } from 'vitest';
import { inspectTabTiming } from './timing-inspection';
import { createEmptyTabDocument, setTabFret } from './editing';
import { analyzeTabSelection } from './analysis';
import type { TabDocument } from './types';

const f = (numerator = 1, denominator = 1) => ({ numerator, denominator });
function score(): TabDocument {
    let s = createEmptyTabDocument(3);
    s = setTabFret(s, s.moments[0].id, 0, 5, 'a');
    return setTabFret(s, s.moments[2].id, 0, 7, 'b');
}
const interruptions = ['rest', 'mute', 'attack'] as const;
function interruptedScore(kind: typeof interruptions[number]): TabDocument {
    const s = score();
    if (kind === 'rest') s.moments[1].rest = {};
    else if (kind === 'mute') s.moments[1].mutes = [{ string: 0 }];
    else s.moments[1].notes.push({ ...s.moments[0].notes[0], id: 'interruption' });
    return s;
}
const codes = (input: unknown) => inspectTabTiming(input).issues.map(issue => issue.code);
const freeze = (input: unknown) => {
    if (typeof input !== 'object' || input === null) return;
    Object.values(input).forEach(freeze); Object.freeze(input);
};
describe('read-only timing notation inspection', () => {
    it('keeps entirely untimed notes, rests, continuations and gestures free of missing-value messages', () => {
        const s = score();
        s.moments[1].sustains = [{ noteId: 'a' }];
        s.moments[0].notes[0].techniques = [{ kind: 'slide', toNoteId: 'b' }];
        expect(inspectTabTiming(s)).toEqual({ timingInput: 'none', issues: [], summary: { missing: 0, invalid: 0 } });
        const blank = createEmptyTabDocument(1024, 1024);
        blank.moments[0].rest = {};
        expect(inspectTabTiming(blank).issues).toEqual([]);
    });
    it('counts completeness only for relevant events once quantitative timing exists', () => {
        const s = score(); s.moments[0].notes[0].duration = f();
        const report = inspectTabTiming(s);
        expect(report.timingInput).toBe('some');
        expect(report.issues.map(issue => issue.code)).toEqual(['missing-start', 'missing-start', 'missing-duration', 'missing-meter']);
        expect(report.issues.find(issue => issue.code === 'missing-duration')?.target).toEqual({ momentId: s.moments[2].id, noteId: 'b', string: 0 });
        expect(report.issues.some(issue => issue.target?.momentId === s.moments[1].id)).toBe(false);
        expect(report.summary).toEqual({ missing: 4, invalid: 0 });
    });
    it('does not require a duration for mutes or blank placeholders', () => {
        const s = createEmptyTabDocument(3); s.meter = { numerator: 4, denominator: 4 };
        s.moments[1].mutes = [{ string: 2 }];
        expect(codes(s)).toEqual(['missing-start']);
        s.moments[1].beatOffset = f(0);
        expect(codes(s)).toEqual([]);
    });
    it.each([f(0), f(-1), f(1, 0), f(1.2), f(NaN), f(Infinity), f(1025), f(1, 1025), null, {}, '1/4'])('reports invalid duration %j without throwing or repairing', value => {
        const s = score(); const raw = s as unknown as { moments: { notes: { duration?: unknown }[] }[] };
        raw.moments[0].notes[0].duration = value;
        const before = structuredClone(s); freeze(s);
        expect(codes(s)).toContain('duration-value'); expect(s).toEqual(before);
    });
    it('accepts zero onsets, non-normalized fractions and independently timed chord notes', () => {
        const s = score(); s.meter = { numerator: 7, denominator: 8 };
        s.moments[0].beatOffset = f(0, 4); s.moments[0].notes[0].duration = f(6, 8);
        s.moments[0].notes.push({ ...s.moments[0].notes[0], id: 'c', string: 1, duration: f(3) });
        expect(codes(s)).not.toContain('duration-value'); expect(codes(s)).not.toContain('offset-value');
        expect(s.moments[0].notes[0].duration).toEqual(f(6, 8));
    });
    it('assesses fields without deciding across-bar lengths, temporal overlap or order', () => {
        const s = score(); s.meter = { numerator: 4, denominator: 4 };
        s.moments[0].beatOffset = f(3); s.moments[0].notes[0].duration = f(5);
        s.moments[2].beatOffset = f(1); s.moments[2].notes[0].duration = f(2);
        expect(inspectTabTiming(s).issues).toEqual([]);
    });
    it('disables ambiguous ID targets instead of selecting the last duplicate', () => {
        const s = score(); s.meter = { numerator: 4, denominator: 4 };
        s.moments[2].id = s.moments[0].id; s.moments[2].notes[0].id = 'a';
        const r = inspectTabTiming(s);
        expect(r.issues.some(issue => issue.code === 'duplicate-position-id')).toBe(true);
        expect(r.issues.some(issue => issue.code === 'duplicate-note-id')).toBe(true);
        expect(r.issues.every(issue => !issue.target)).toBe(true);
    });
    it.each(['missing', 'self', 'future'])('reports %s continuation references at the continuation position', kind => {
        const s = score(); const index = kind === 'self' ? 0 : 1;
        s.moments[index].sustains = [{ noteId: kind === 'missing' ? 'absent' : kind === 'future' ? 'b' : 'a' }];
        const issue = inspectTabTiming(s).issues.find(issue => issue.code === (kind === 'missing' ? 'sustain-reference' : `sustain-${kind}-reference`));
        expect(issue?.target?.momentId).toBe(s.moments[index].id);
        expect(issue?.target?.noteId).toBeUndefined();
    });
    it('accepts future technique endpoints but rejects self, backward and cross-string endpoints', () => {
        const s = score(); s.moments[0].notes[0].techniques = [{ kind: 'hammer-on', toNoteId: 'b' }];
        expect(codes(s)).toEqual([]);
        s.moments[0].notes[0].techniques = [{ kind: 'slide', toNoteId: 'a' }];
        expect(codes(s)).toContain('technique-self-reference');
        s.moments[2].notes[0].techniques = [{ kind: 'pull-off', toNoteId: 'a' }];
        expect(codes(s)).toContain('technique-order');
        s.moments[0].notes[0].techniques = [{ kind: 'slide', toNoteId: 'b' }]; s.moments[2].notes[0].string = 1;
        expect(codes(s)).toContain('technique-string');
    });
    it.each(interruptions)('diagnoses a continuation crossing an explicit %s without changing its source', kind => {
        const s = interruptedScore(kind);
        s.moments[2].notes = []; s.moments[2].sustains = [{ noteId: 'a' }];
        const before = structuredClone(s); freeze(s);
        expect(inspectTabTiming(s)).toEqual({ timingInput: 'none', issues: [{
            kind: 'invalid', code: 'sustain-interrupted',
            message: 'An explicit rest, mute or new note interrupts this continuation.',
            target: { momentId: s.moments[2].id, string: 0 },
        }], summary: { missing: 0, invalid: 1 } });
        expect(s).toEqual(before);
    });
    it.each(interruptions.flatMap(interruption => (['hammer-on', 'pull-off', 'slide'] as const).map(technique => ({ interruption, technique }))))(
        'diagnoses $technique crossing an explicit $interruption', ({ interruption, technique }) => {
            const s = interruptedScore(interruption);
            s.moments[0].notes[0].techniques = [{ kind: technique, toNoteId: 'b' }];
            const before = structuredClone(s); freeze(s);
            expect(inspectTabTiming(s).issues).toEqual([{
                kind: 'invalid', code: 'technique-interrupted',
                message: 'An explicit rest, mute or new note interrupts this technique.',
                target: { momentId: s.moments[0].id, noteId: 'a', string: 0 },
            }]);
            expect(s).toEqual(before);
        });
    it.each(['blank', 'other-string attack', 'other-string mute', 'continuation'] as const)(
        'does not infer an interruption from an intermediate %s', kind => {
            const s = score();
            if (kind === 'other-string attack') s.moments[1].notes.push({ ...s.moments[0].notes[0], id: 'other', string: 1 });
            if (kind === 'other-string mute') s.moments[1].mutes = [{ string: 1 }];
            if (kind === 'continuation') s.moments[1].sustains = [{ noteId: 'a' }];
            s.moments[2].notes = []; s.moments[2].sustains = [{ noteId: 'a' }];
            expect(inspectTabTiming(s).issues).toEqual([]);
            s.moments[2].sustains = undefined;
            s.moments[2].notes = [{ ...s.moments[0].notes[0], id: 'b' }];
            for (const technique of ['hammer-on', 'pull-off', 'slide'] as const) {
                s.moments[0].notes[0].techniques = [{ kind: technique, toNoteId: 'b' }];
                expect(inspectTabTiming(s).issues).toEqual([]);
            }
        });
    it('allows adjacent endpoints and does not use malformed events to infer an interruption', () => {
        const adjacent = score(); adjacent.moments.splice(1, 1);
        adjacent.moments[0].notes[0].techniques = [{ kind: 'slide', toNoteId: 'b' }];
        expect(inspectTabTiming(adjacent).issues).toEqual([]);
        delete adjacent.moments[0].notes[0].techniques;
        adjacent.moments[1].notes = []; adjacent.moments[1].sustains = [{ noteId: 'a' }];
        expect(inspectTabTiming(adjacent).issues).toEqual([]);
        const malformed = score() as unknown as { moments: Record<string, unknown>[] };
        malformed.moments[1] = { id: 'broken', notes: [null], mutes: [{ string: '0' }], rest: null };
        malformed.moments[2].notes = []; malformed.moments[2].sustains = [{ noteId: 'a' }];
        expect(codes(malformed)).toEqual(['rest-shape', 'rest-conflict', 'note-shape', 'string-value']);
    });
    it('finds rest and same-string structural contradictions even in free timing', () => {
        const s = score(); s.moments[0].rest = {}; s.moments[0].mutes = [{ string: 0 }];
        expect(codes(s)).toEqual(['rest-conflict', 'duplicate-string-event']);
    });
    it.each([undefined, null, 3, 'score', [], {}, { moments: null }, { meter: null, moments: [] },
        { moments: [null, 4, {}, { notes: [null, {}, { id: 'x', techniques: [null, { kind: { toString: null, valueOf: null } }] }], rest: null, mutes: true, sustains: [null, {}] }] }])('tolerates malformed JSON-like input %j', value => {
        const before = structuredClone(value); freeze(value);
        expect(() => inspectTabTiming(value)).not.toThrow(); expect(value).toEqual(before);
        expect(inspectTabTiming(value).summary.invalid).toBeGreaterThan(0);
    });
    it('continues checking readable events after malformed positions or lists', () => {
        const s = score(); s.moments[2].notes[0].duration = f(1, 0);
        const raw = s as unknown as { moments: unknown[] }; raw.moments[0] = null;
        expect(codes(s)).toContain('position-shape'); expect(codes(s)).toContain('duration-value');
    });
    it('preserves the complete document and current pitch/order analysis', () => {
        const s = score(); s.moments[0].notes[0].duration = f(4);
        const context = { scale: null, chord: null, frame: null };
        const before = analyzeTabSelection(s, { start: 0, end: 2 }, context), data = structuredClone(s);
        freeze(s); inspectTabTiming(s);
        expect(s).toEqual(data); expect(analyzeTabSelection(s, { start: 0, end: 2 }, context)).toEqual(before);
    });
});
