import { describe, expect, it } from 'vitest';
import { MAX_TAB_MOMENTS, MAX_TAB_SOURCE_LENGTH, parseAsciiTab } from './ascii';
import { TAB_EXAMPLE, TAB_TUNINGS } from './types';
import { analyzeTabSelection } from './analysis';
import { buildTabScoreAnnotations } from './annotations';

const block = (bodies: string[], labels: readonly string[] = ['e', 'B', 'G', 'D', 'A', 'E']) => bodies.map((body, index) => `${labels[index]}|${body}|`).join('\n');
const one = (first: string) => block([first, ...Array(5).fill(first.replace(/[^|]/g, '-'))]);
const resultDocument = (source: string, options?: Parameters<typeof parseAsciiTab>[1]) => {
    const result = parseAsciiTab(source, options);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    return result.document;
};

describe('parseAsciiTab', () => {
    it('parses the shipped example as ordered observations without invented timing', () => {
        const document = resultDocument(TAB_EXAMPLE);
        expect(document.timing).toBe('order-only');
        expect(document.moments).toHaveLength(4);
        expect(document.moments[0].notes.map((note) => note.midi)).toEqual([64, 60, 55, 52, 48]);
        expect(document.moments[2].notes.at(-1)).toMatchObject({ string: 5, fret: 3, midi: 43 });
        expect(document.moments[0]).not.toHaveProperty('duration');
        expect(document.moments[0].notes[0].source).toEqual({ line: 1, column: 5 });
    });

    it('preserves order when whitespace changes without treating distances as durations', () => {
        const a = resultDocument(one('0-2-4'));
        const b = resultDocument(one('0-----2-4'));
        expect(a.moments.map((moment) => moment.notes[0].midi)).toEqual(b.moments.map((moment) => moment.notes[0].midi));
    });

    it('groups aligned multi digit frets by their first digit', () => {
        const document = resultDocument(block(['10---12', '9----11', '-------', '-------', '-------', '-------']));
        expect(document.moments.map((moment) => moment.notes.map((note) => note.fret))).toEqual([[10, 9], [12, 11]]);
    });

    it('rejects partial overlap between a multi digit fret and a different onset', () => {
        const result = parseAsciiTab(block(['10--', '-2--', '----', '----', '----', '----']));
        expect(result).toMatchObject({ ok: false, diagnostics: [{ severity: 'error', line: 2, column: 4 }] });
    });

    it('rejects a muted onset inside a multi digit fret too', () => {
        expect(parseAsciiTab(block(['10--', '-x--', '----', '----', '----', '----'])).ok).toBe(false);
    });

    it('tracks measure boundaries across six line blocks', () => {
        const source = `${one('0--|2--')}\n\n${one('4--|5--')}`;
        const document = resultDocument(source);
        expect(document.measureCount).toBe(4);
        expect(document.moments.map((moment) => moment.measure)).toEqual([1, 2, 3, 4]);
        expect(document.moments[2].notes[0].source?.line).toBe(8);
    });

    it('supports unlabelled rows and CRLF line endings', () => {
        const source = ['|0--|', ...Array(5).fill('|---|')].join('\r\n');
        expect(resultDocument(source).moments[0].notes[0].midi).toBe(64);
        expect(resultDocument(['0--', ...Array(5).fill('---')].join('\n')).moments).toHaveLength(1);
    });

    it('preserves leading spaces as columns in bare unlabelled rows', () => {
        const document = resultDocument(['  0-', '0---', ...Array(4).fill('----')].join('\n'));
        expect(document.moments).toHaveLength(2);
        expect(document.moments[1].notes[0].source).toEqual({ line: 1, column: 3 });
    });

    it('uses tuning and capo once, while validating pre-capo labels', () => {
        const source = block(['----', '----', '----', '----', '----', '0---'], ['e', 'B', 'G', 'D', 'A', 'D']);
        const document = resultDocument(source, { tuningMidi: TAB_TUNINGS[1].midi, capo: 2 });
        expect(document.moments[0].notes[0]).toMatchObject({ string: 5, midi: 40, pitchClass: 4 });
        expect(parseAsciiTab(source).ok).toBe(false);
    });

    it('supports DADGAD and enharmonic labels without relying on label case', () => {
        const source = block(Array(6).fill('0-'), ['d', 'a', 'g', 'd', 'a', 'd']);
        expect(resultDocument(source, { tuningMidi: TAB_TUNINGS[2].midi }).moments[0].notes.map((note) => note.midi)).toEqual(TAB_TUNINGS[2].midi);
        expect(resultDocument(block(Array(6).fill('0-'), ['Fb', 'Cb', 'G', 'D', 'A', 'E'])).moments[0].notes).toHaveLength(6);
    });

    it('retains muted-only positions as empty pitch observations without inventing rests', () => {
        const result = parseAsciiTab(one('x--0--X'));
        expect(result.ok).toBe(true);
        expect(result.diagnostics).toHaveLength(2);
        if (result.ok) {
            expect(result.document.moments.map(moment => moment.notes.length)).toEqual([0, 1, 0]);
            expect(result.document.moments.map(moment => moment.column)).toEqual([2, 5, 8]);
            expect(result.document.moments[0]).not.toHaveProperty('duration');
            expect(result.document.moments[0]).not.toHaveProperty('rest');
            expect(result.document.moments[0].mutes).toEqual([{ string: 0, source: { line: 1, column: 3 } }]);
            expect(result.document.moments[2].mutes).toEqual([{ string: 0, source: { line: 1, column: 9 } }]);
        }
    });

    it('does not bridge a muted strum into an adjacent harmonic progression', () => {
        const document = resultDocument(block(['3--x--0', '3--x--1', '4--x--0', '---x---', '---x---', '---x---']));
        const context = { scale: null, chord: null, frame: { tonic: 'C', mode: 'major' as const, lens: 'jazz-pop' as const } };
        const analysis = analyzeTabSelection(document, { start: 0, end: 2 }, context);
        const annotations = buildTabScoreAnnotations(analysis, context);
        expect(document.moments.map(moment => moment.notes.length)).toEqual([3, 0, 3]);
        expect(annotations.filter(item => item.kind === 'chord').map(item => item.label)).toEqual(['G', 'C']);
        expect(annotations.filter(item => item.kind === 'progression')).toEqual([]);
    });

    it('does not bridge a muted melodic event into an arpeggio collection', () => {
        const document = resultDocument(one('0-3-x-7'));
        const context = { scale: null, chord: null, frame: null };
        const analysis = analyzeTabSelection(document, { start: 0, end: 3 }, context);
        expect(buildTabScoreAnnotations(analysis, context).filter(item => item.kind === 'arpeggio')).toEqual([]);
    });

    it('keeps pitched observations when a different string is muted in the same column', () => {
        const document = resultDocument(block(['0--', 'x--', '---', '---', '---', '---']));
        expect(document.moments).toHaveLength(1);
        expect(document.moments[0].notes.map(note => note.fret)).toEqual([0]);
        expect(document.moments[0].mutes).toEqual([{ string: 1, source: { line: 2, column: 3 } }]);
        expect(document.moments[0].rest).toBeUndefined();
    });

    it('warns about skipped prose, preserving actual source positions', () => {
        const result = parseAsciiTab(`Intro\n${one('0--')}\nEnd`);
        expect(result.ok).toBe(true);
        expect(result.diagnostics).toHaveLength(2);
        if (result.ok) expect(result.document.moments[0].notes[0].source).toEqual({ line: 2, column: 3 });
    });

    it('retains a realistic legato phrase at its original fret columns without inventing attacks or timing', () => {
        const result = parseAsciiTab(one('5h7p5--7/9\\7--10~~--12H14P12'));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.document.moments.map(moment => moment.notes[0].fret)).toEqual([5, 7, 5, 7, 9, 7, 10, 12, 14, 12]);
        expect(result.document.moments.map(moment => moment.notes[0].source?.column)).toEqual([3, 5, 7, 10, 12, 14, 17, 23, 26, 29]);
        expect(result.document.timing).toBe('order-only');
        expect(result.document.moments[1]).not.toHaveProperty('attack');
        expect(result.document.moments[1]).not.toHaveProperty('duration');
        expect(result.diagnostics).toHaveLength(4);
        expect(result.diagnostics[0]).toMatchObject({ severity: 'warning', line: 1, column: 4 });
        expect(result.diagnostics[3].message).toContain('Vibrato metadata');
        expect(result.document.moments[0].notes[0].techniques).toEqual([{ kind: 'hammer-on', toNoteId: result.document.moments[1].notes[0].id, notation: 'h', source: { line: 1, column: 4 } }]);
        expect(result.document.moments[1].notes[0].techniques).toEqual([{ kind: 'pull-off', toNoteId: result.document.moments[2].notes[0].id, notation: 'p', source: { line: 1, column: 6 } }]);
        expect(result.document.moments[3].notes[0].techniques).toEqual([{ kind: 'slide', toNoteId: result.document.moments[4].notes[0].id, notation: '/', source: { line: 1, column: 11 } }]);
        expect(result.document.moments[4].notes[0].techniques).toEqual([{ kind: 'slide', toNoteId: result.document.moments[5].notes[0].id, notation: '\\', source: { line: 1, column: 13 } }]);
        expect(result.document.moments[6].notes[0].techniques).toEqual([{ kind: 'vibrato', notation: '~~', source: { line: 1, column: 19 } }]);
    });

    it('keeps other strings aligned with explicit technique endpoints and retains tuning/capo semantics', () => {
        const source = block(['10h12--', '---10--', '-------', '-------', '-------', '0------'], ['e', 'B', 'G', 'D', 'A', 'D']);
        const document = resultDocument(source, { tuningMidi: TAB_TUNINGS[1].midi, capo: 2 });
        expect(document.moments.map(moment => moment.notes.map(note => note.midi))).toEqual([[76, 40], [78, 71]]);
        expect(document.moments[1].notes.map(note => note.source)).toEqual([{ line: 1, column: 6 }, { line: 2, column: 6 }]);
    });

    it('preserves connector glyph and case without replacing written slide direction', () => {
        const document = resultDocument(one('5/3-3\\5-5H7P5'));
        expect(document.moments.map(moment => moment.notes[0].fret)).toEqual([5, 3, 3, 5, 5, 7, 5]);
        expect(document.moments.flatMap(moment => moment.notes[0].techniques ?? []).map(technique => technique.notation)).toEqual(['/', '\\', 'H', 'P']);
        expect(document.moments[0].notes[0].techniques?.[0]).toMatchObject({ kind: 'slide', notation: '/', toNoteId: document.moments[1].notes[0].id });
        expect(document.moments[2].notes[0].techniques?.[0]).toMatchObject({ kind: 'slide', notation: '\\', toNoteId: document.moments[3].notes[0].id });
    });

    it('does not collapse technique columns or align a note inside a multi-digit endpoint', () => {
        const result = parseAsciiTab(block(['5h12-', '---2-', '-----', '-----', '-----', '-----']));
        expect(result.ok).toBe(false);
        expect(result.diagnostics.at(-1)).toMatchObject({ severity: 'error', line: 2, column: 6 });
    });

    it.each(['h5', '5h', '5h-7', '5hh7', '/7', '7/', '7\\', '5/p7', '5h|7', 'x~', '~7', '7~9', '7~~h9'])('rejects incomplete or ambiguous technique %s', (phrase) => {
        expect(parseAsciiTab(one(phrase)).ok).toBe(false);
    });

    it.each(['7b(9)', '7r5', '7R5', '7^9', '7b', '7bfull', '7b1/2', '7b100', '7b9r', '7b9r100', '7b9h10', '7b9b11', '7b9r7r5'])('rejects unsupported bend/release %s without emitting target notes', (phrase) => {
        const result = parseAsciiTab(one(phrase));
        expect(result.ok).toBe(false);
        expect(result.diagnostics.at(-1)).toMatchObject({ severity: 'error', line: 1 });
        expect(result.diagnostics.at(-1)?.message).toMatch(/target|release|bend/i);
        expect(result).not.toHaveProperty('document');
    });

    it.each(['5b7r5', '5B7R5'])('retains %s as gestures on one base fret, never target onsets', phrase => {
        const result = parseAsciiTab(one(phrase));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.document.moments).toHaveLength(1);
        expect(result.document.moments[0].notes).toHaveLength(1);
        expect(result.document.moments[0].notes[0]).toMatchObject({ fret: 5, midi: 69, source: { line: 1, column: 3 }, techniques: [
            { kind: 'bend', targetFret: 7, notation: phrase.slice(1, 3), source: { line: 1, column: 4 } },
            { kind: 'release', targetFret: 5, notation: phrase.slice(3), source: { line: 1, column: 6 } },
        ] });
        expect(result.document.source).toBe(one(phrase));
        expect(result.document.timing).toBe('order-only');
        expect(result.diagnostics).toHaveLength(1);
        expect(result.diagnostics[0].message).toContain('not another played fret');
    });

    it('allows fret-equivalent bend targets beyond the actual fret input range without inventing pitches', () => {
        const document = resultDocument(one('36b99r0-7'));
        expect(document.moments.map(moment => moment.notes[0].fret)).toEqual([36, 7]);
        expect(document.moments[0].notes[0].techniques?.map(technique => technique.kind)).toEqual(['bend', 'release']);
        expect(document.moments[1].notes[0].source).toEqual({ line: 1, column: 11 });
        expect(parseAsciiTab(one('37b39')).ok).toBe(false);
    });

    it('retains a played fret after a separated bend and keeps vibrato on the base', () => {
        const document = resultDocument(one('5b7~~-7'));
        expect(document.moments.map(moment => moment.notes[0].fret)).toEqual([5, 7]);
        expect(document.moments[0].notes[0].techniques).toEqual([
            { kind: 'bend', targetFret: 7, notation: 'b7', source: { line: 1, column: 4 } },
            { kind: 'vibrato', notation: '~~', source: { line: 1, column: 6 } },
        ]);
    });

    it('does not occupy bend-target columns and preserves other string notes there', () => {
        const document = resultDocument(block(['10b12r10--12', '---9------11', '----8-------', '------------', '------------', '0-----------']));
        expect(document.moments.map(moment => moment.notes.map(note => note.fret))).toEqual([[10, 0], [9], [8], [12, 11]]);
        expect(document.moments[1].notes[0].source).toEqual({ line: 2, column: 6 });
        expect(document.moments[2].notes[0].source).toEqual({ line: 3, column: 7 });
        expect(document.moments[0].notes[0].techniques?.[0]).toMatchObject({ kind: 'bend', targetFret: 12 });
    });

    it('links technique endpoints through simultaneous chords and across consecutive blocks', () => {
        const document = resultDocument(`${block(['10h12', '9--11', '-----', '-----', '-----', '-----'])}\n\n${one('5p3/7')}`);
        const notes = document.moments.flatMap(moment => moment.notes);
        expect(notes[0].techniques?.[0]).toMatchObject({ toNoteId: notes[2].id });
        expect(document.moments[2].notes[0].techniques?.[0]).toMatchObject({ kind: 'pull-off', toNoteId: document.moments[3].notes[0].id });
        expect(document.moments[3].notes[0].techniques?.[0]).toMatchObject({ kind: 'slide', toNoteId: document.moments[4].notes[0].id });
    });

    it('preserves analysis and annotations when articulation metadata is attached to written endpoints', () => {
        const plain = resultDocument(one('0-3-7'));
        const decorated = resultDocument(one('0h3/7~~'));
        const context = { scale: null, chord: null, frame: null };
        const analyze = (document: typeof plain) => analyzeTabSelection(document, { start: 0, end: 2 }, context);
        expect(decorated.moments.flatMap(moment => moment.notes).map(note => note.midi)).toEqual(plain.moments.flatMap(moment => moment.notes).map(note => note.midi));
        expect(buildTabScoreAnnotations(analyze(decorated), context)).toEqual(buildTabScoreAnnotations(analyze(plain), context));
    });

    it('does not convert bend targets into chord or harmonic-span pitch observations', () => {
        const plain = resultDocument(block(['5-----5', '5-----5', '5-----5', '-------', '-------', '-------']));
        const decorated = resultDocument(block(['5b7r5-5', '5-----5', '5-----5', '-------', '-------', '-------']));
        const context = { scale: null, chord: null, frame: { tonic: 'A', mode: 'minor' as const, lens: 'jazz-pop' as const } };
        const analyze = (document: typeof plain) => analyzeTabSelection(document, { start: 0, end: 1 }, context);
        expect(decorated.moments.map(moment => moment.notes.map(note => note.midi))).toEqual(plain.moments.map(moment => moment.notes.map(note => note.midi)));
        expect(buildTabScoreAnnotations(analyze(decorated), context)).toEqual(buildTabScoreAnnotations(analyze(plain), context));
        expect(analyze(decorated).harmonicSpans).toEqual(analyze(plain).harmonicSpans);
    });

    it('warns once per supported technique class across repeated phrases and blocks', () => {
        const result = parseAsciiTab(`${one('5h7p5-7/9\\7~~')}\n\n${one('5h7p5-7/9\\7~~')}`);
        expect(result.ok).toBe(true);
        expect(result.diagnostics).toHaveLength(4);
    });

    it('checks endpoint fret limits and MIDI limits even when technique notation is accepted', () => {
        expect(parseAsciiTab(one('35h37')).ok).toBe(false);
        expect(parseAsciiTab(one('0h5'), { tuningMidi: [124, 59, 55, 50, 45, 40] }).ok).toBe(false);
    });

    it.each(['t', '\t', '<', '𝄞'])('rejects unsupported %s with an exact source location', (symbol) => {
        const result = parseAsciiTab(one(`0${symbol}2`));
        expect(result).toMatchObject({ ok: false, diagnostics: [{ severity: 'error', line: 1, column: 4 }] });
    });

    it('does not silently skip a malformed unlabelled tab line that starts with a letter', () => {
        expect(parseAsciiTab(['h--0', ...Array(5).fill('----')].join('\n'))).toMatchObject({ ok: false, diagnostics: [{ line: 1, column: 1 }] });
    });

    it('rejects unequal row widths and displaced barlines', () => {
        expect(parseAsciiTab(block(['0---', '---', '----', '----', '----', '----'])).ok).toBe(false);
        expect(parseAsciiTab(block(['0|--', '--|-', '-|--', '-|--', '-|--', '-|--']))).toMatchObject({ ok: false, diagnostics: [{ line: 2, column: 4 }] });
    });

    it('rejects missing rows and prose interrupting a block', () => {
        expect(parseAsciiTab(TAB_EXAMPLE.split('\n').slice(0, 5).join('\n')).ok).toBe(false);
        expect(parseAsciiTab('e|0---|\n\nB|----|').ok).toBe(false);
        expect(parseAsciiTab('e|0---|\nChorus').ok).toBe(false);
    });

    it.each([[], [64], [64, 59, 55, 50, 45, -1], [128, 59, 55, 50, 45, 40], [64.5, 59, 55, 50, 45, 40], [NaN, 59, 55, 50, 45, 40]].map((tuningMidi) => ({ tuningMidi })))('rejects invalid tuning $tuningMidi', ({ tuningMidi }) => {
        expect(parseAsciiTab(TAB_EXAMPLE, { tuningMidi }).ok).toBe(false);
    });

    it.each([-1, 13, 1.5, NaN, Infinity])('rejects invalid capo %s', (capo) => {
        expect(parseAsciiTab(TAB_EXAMPLE, { capo }).ok).toBe(false);
    });

    it('checks fret and sounding MIDI boundaries', () => {
        expect(resultDocument(one('36')).moments[0].notes[0].fret).toBe(36);
        expect(parseAsciiTab(one('37')).ok).toBe(false);
        expect(parseAsciiTab(one('99999999999999999999999999999999999')).ok).toBe(false);
        expect(parseAsciiTab(one('36'), { tuningMidi: [124, 59, 55, 50, 45, 40] }).ok).toBe(false);
    });

    it('rejects empty input and blank TAB while preserving muted-only input', () => {
        expect(parseAsciiTab('').ok).toBe(false);
        expect(parseAsciiTab(one('---')).ok).toBe(false);
        const document = resultDocument(one('x-X'));
        expect(document.timing).toBe('order-only');
        expect(document.moments.map(moment => moment.notes)).toEqual([[], []]);
        expect(document.moments.map(moment => moment.mutes)).toEqual([
            [{ string: 0, source: { line: 1, column: 3 } }],
            [{ string: 0, source: { line: 1, column: 5 } }],
        ]);
        expect(document.moments.every(moment => moment.rest === undefined)).toBe(true);
    });

    it('bounds source size and parsed event count', () => {
        expect(parseAsciiTab(' '.repeat(MAX_TAB_SOURCE_LENGTH + 1)).ok).toBe(false);
        expect(resultDocument(one('0-'.repeat(MAX_TAB_MOMENTS))).moments).toHaveLength(MAX_TAB_MOMENTS);
        expect(parseAsciiTab(one('0-'.repeat(MAX_TAB_MOMENTS + 1))).ok).toBe(false);
    });

    it('bounds empty measures and their editable placeholder budget', () => {
        const atLimit = resultDocument(one('0|' + '-|'.repeat(MAX_TAB_MOMENTS - 2) + '-'));
        expect(atLimit.measureCount).toBe(MAX_TAB_MOMENTS);
        expect(atLimit.moments).toHaveLength(1);
        expect(parseAsciiTab(one('0|' + '-|'.repeat(MAX_TAB_MOMENTS - 1) + '-')).ok).toBe(false);
        // 1024 onsets plus an empty second measure would need 1025 editor positions.
        const overflow = parseAsciiTab(one('0-'.repeat(MAX_TAB_MOMENTS) + '|--'));
        expect(overflow.ok).toBe(false);
        expect(overflow.diagnostics.at(-1)?.message).toContain('empty measure');
    });
});
