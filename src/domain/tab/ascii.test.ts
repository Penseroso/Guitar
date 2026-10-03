import { describe, expect, it } from 'vitest';
import { MAX_TAB_MOMENTS, MAX_TAB_SOURCE_LENGTH, parseAsciiTab } from './ascii';
import { TAB_EXAMPLE, TAB_TUNINGS } from './types';

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

    it('reports muted notes without inventing pitch or a silent-only analysis moment', () => {
        const result = parseAsciiTab(one('x--0--X'));
        expect(result.ok).toBe(true);
        expect(result.diagnostics).toHaveLength(2);
        if (result.ok) expect(result.document.moments).toHaveLength(1);
    });

    it('warns about skipped prose, preserving actual source positions', () => {
        const result = parseAsciiTab(`Intro\n${one('0--')}\nEnd`);
        expect(result.ok).toBe(true);
        expect(result.diagnostics).toHaveLength(2);
        if (result.ok) expect(result.document.moments[0].notes[0].source).toEqual({ line: 2, column: 3 });
    });

    it.each(['h', 'p', 'b', '/', '\\', '~', '^', 't', '\t', '<', '𝄞'])('rejects unsupported %s with an exact source location', (symbol) => {
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

    it('rejects empty and unpitched-only input', () => {
        expect(parseAsciiTab('').ok).toBe(false);
        expect(parseAsciiTab(one('x--')).ok).toBe(false);
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
