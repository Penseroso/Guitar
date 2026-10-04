import { TAB_TUNINGS, type TabDiagnostic, type TabMoment, type TabNote, type TabParseOptions, type TabParseResult } from './types';

export const MAX_TAB_SOURCE_LENGTH = 65_536;
export const MAX_TAB_MOMENTS = 1_024;

interface Row { body: string; line: number; offset: number; label?: string }
interface Token {
    start: number; end: number; fret: number | null; row: number;
    techniques?: NonNullable<TabNote['techniques']>;
}
interface EndpointLink {
    token: Token; toStart: number; kind: 'hammer-on' | 'pull-off' | 'slide';
    notation: string;
    source: { line: number; column: number };
}
const NATURAL_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Conservative observer parser. Horizontal space conveys order, never duration. */
export function parseAsciiTab(source: string, options: TabParseOptions = {}): TabParseResult {
    const diagnostics: TabDiagnostic[] = [];
    const reportedTechniques = new Set<string>();
    const fail = (message: string, line?: number, column?: number): TabParseResult => ({
        ok: false, diagnostics: [...diagnostics, { severity: 'error', message, line, column }],
    });
    if (typeof source !== 'string' || source.length > MAX_TAB_SOURCE_LENGTH) {
        return fail(`Keep the tab within ${MAX_TAB_SOURCE_LENGTH.toLocaleString('en-US')} characters.`);
    }
    const tuningInput = options.tuningMidi ?? TAB_TUNINGS[0].midi;
    const capo = options.capo ?? 0;
    if (!Array.isArray(tuningInput) || tuningInput.length !== 6 || tuningInput.some((value) => !Number.isInteger(value) || value < 0 || value > 127)) {
        return fail('Tuning requires six integer MIDI pitches from 0–127, ordered from the highest string to the lowest.');
    }
    const tuning = [...tuningInput];
    if (!Number.isInteger(capo) || capo < 0 || capo > 12) {
        return fail('Set the capo to a whole fret from 0–12.');
    }
    const moments: TabMoment[] = [];
    let measureCount = 0;
    let pending: Row[] = [];
    const lines = source.split(/\r\n|\n|\r/);

    function parseBlock(rows: Row[]): TabParseResult | null {
        const width = rows[0].body.length;
        const bars = [...rows[0].body.matchAll(/\|/g)].map((match) => match.index!);
        const tokens: Token[] = [];
        const endpointLinks: EndpointLink[] = [];
        for (const [rowIndex, row] of rows.entries()) {
            if (row.body.length !== width) {
                return fail('Make all six tab lines the same width. Spaces and dashes count as columns.', row.line, row.offset + Math.min(width, row.body.length) + 1);
            }
            const rowBars = [...row.body.matchAll(/\|/g)].map((match) => match.index!);
            if (rowBars.length !== bars.length || rowBars.some((column, index) => column !== bars[index])) {
                const mismatch = [...new Set([...bars, ...rowBars])].sort((a, b) => a - b).find((column) => bars.includes(column) !== rowBars.includes(column))!;
                return fail('Align the barlines | across all six strings.', row.line, row.offset + mismatch + 1);
            }
            if (row.label) {
                const accidental = row.label[1] === '#' ? 1 : row.label[1] === 'b' ? -1 : 0;
                const pc = (NATURAL_PC[row.label[0].toUpperCase()] + accidental + 12) % 12;
                if (pc !== tuning[rowIndex] % 12) {
                    return fail(`String label ${row.label} does not match the selected tuning. Use open-string names before applying the capo.`, row.line, row.offset - row.label.length + 1);
                }
            }
            for (let column = 0; column < row.body.length; column++) {
                const character = row.body[column];
                if (character === '-' || character === ' ' || character === '|') continue;
                if (character === 'x' || character === 'X') {
                    tokens.push({ start: column, end: column + 1, fret: null, row: rowIndex });
                    diagnostics.push({ severity: 'warning', message: 'Muted x was retained as an unpitched event and excluded from pitch analysis.', line: row.line, column: row.offset + column + 1 });
                    continue;
                }
                if ('hHpP/\\'.includes(character)) {
                    // Keep the original columns: connector symbols carry articulation,
                    // while the explicitly written frets remain ordered pitch observations.
                    if (!/[0-9]/.test(row.body[column - 1] ?? '') || !/[0-9]/.test(row.body[column + 1] ?? '')) {
                        return fail('Write both fret endpoints directly around h, p, / or \\ (for example 5h7 or 7\\5). Unspecified slide pitches cannot be recovered.', row.line, row.offset + column + 1);
                    }
                    const technique = character.toLowerCase() === 'h' ? 'Hammer-on' : character.toLowerCase() === 'p' ? 'Pull-off' : 'Slide';
                    const token = tokens.at(-1)!;
                    if (token.row !== rowIndex || token.end !== column || token.fret === null) {
                        return fail('Connect h, p, / or \\ to a played fret, not a bend target.', row.line, row.offset + column + 1);
                    }
                    endpointLinks.push({ token, toStart: column + 1, kind: technique === 'Hammer-on' ? 'hammer-on' : technique === 'Pull-off' ? 'pull-off' : 'slide', notation: character, source: { line: row.line, column: row.offset + column + 1 } });
                    if (!reportedTechniques.has(technique)) {
                        diagnostics.push({ severity: 'warning', message: `${technique} metadata and explicit fret endpoints were retained. Order-only analysis ignores technique gestures and timing.`, line: row.line, column: row.offset + column + 1 });
                        reportedTechniques.add(technique);
                    }
                    continue;
                }
                if (character === '~') {
                    if (!/[0-9]/.test(row.body[column - 1] ?? '')) {
                        return fail('Place vibrato ~ directly after a fret number (for example 7~~).', row.line, row.offset + column + 1);
                    }
                    const start = column;
                    while (row.body[column + 1] === '~') column++;
                    if (!/[- |]/.test(row.body[column + 1] ?? ' ')) {
                        return fail('Separate the next fret from vibrato with a dash or space (for example 7~~-9).', row.line, row.offset + column + 2);
                    }
                    const token = tokens.at(-1)!;
                    if (token.row !== rowIndex || token.fret === null) return fail('Place vibrato after a played fret.', row.line, row.offset + start + 1);
                    (token.techniques ??= []).push({ kind: 'vibrato', notation: row.body.slice(start, column + 1), source: { line: row.line, column: row.offset + start + 1 } });
                    if (!reportedTechniques.has('Vibrato')) {
                        diagnostics.push({ severity: 'warning', message: 'Vibrato metadata and the written base fret were retained. Order-only analysis ignores pitch variation and timing.', line: row.line, column: row.offset + start + 1 });
                        reportedTechniques.add('Vibrato');
                    }
                    continue;
                }
                if ('bB'.includes(character)) {
                    const token = tokens.at(-1);
                    if (!token || token.row !== rowIndex || token.fret === null || token.end !== column) {
                        return fail('Write a bend directly after its base fret, with a numeric fret-equivalent target (for example 5b7 or 5b7r5).', row.line, row.offset + column + 1);
                    }
                    const bendStart = column;
                    for (const kind of ['bend', 'release'] as const) {
                        if (kind === 'release' && !'rR'.includes(row.body[column] ?? ' ')) break;
                        const gestureStart = column;
                        const targetStart = column + 1;
                        if (!/[0-9]/.test(row.body[targetStart] ?? '')) {
                            return fail('Bend/release targets must be numeric fret-equivalent values from 0–99; full, fractional and unspecified targets are unsupported.', row.line, row.offset + gestureStart + 1);
                        }
                        column = targetStart;
                        while (/[0-9]/.test(row.body[column + 1] ?? '')) column++;
                        const targetFret = Number(row.body.slice(targetStart, column + 1));
                        if (targetFret > 99) return fail('Bend/release targets must be fret-equivalent values from 0–99.', row.line, row.offset + targetStart + 1);
                        (token.techniques ??= []).push({ kind, targetFret, notation: row.body.slice(gestureStart, column + 1), source: { line: row.line, column: row.offset + gestureStart + 1 } });
                        column++;
                    }
                    if (!/[- |~]/.test(row.body[column] ?? ' ')) {
                        return fail('Separate the next played fret from a bend/release with a dash or space. Only numeric b targets and optional r targets are supported.', row.line, row.offset + column + 1);
                    }
                    column--;
                    if (!reportedTechniques.has('Bend/release')) {
                        diagnostics.push({ severity: 'warning', message: 'Bend/release metadata was retained as a fret-equivalent pitch gesture, not another played fret. Order-only analysis uses only the base fret and ignores pitch variation and timing.', line: row.line, column: row.offset + bendStart + 1 });
                        reportedTechniques.add('Bend/release');
                    }
                    continue;
                }
                if ('rR^'.includes(character)) {
                    return fail('Standalone release and ^ bends are unsupported. Write a numeric bend with an optional release (for example 5b7r5); targets are metadata, not played frets.', row.line, row.offset + column + 1);
                }
                if (!/[0-9]/.test(character)) {
                    return fail(`Unsupported symbol ${JSON.stringify(character)}. Supported techniques are fret-to-fret h, p, /, \\, postfix ~ and numeric bend/release targets; ASCII ties and other techniques are unsupported.`, row.line, row.offset + column + 1);
                }
                const start = column;
                while (column + 1 < row.body.length && /[0-9]/.test(row.body[column + 1])) column++;
                const fret = Number(row.body.slice(start, column + 1));
                if (!Number.isInteger(fret) || fret < 0 || fret > 36) {
                    return fail('Enter whole fret numbers from 0–36.', row.line, row.offset + start + 1);
                }
                if (tuning[rowIndex] + capo + fret > 127) {
                    return fail('The tuning, capo, and fret produce a pitch outside the MIDI range 0–127.', row.line, row.offset + start + 1);
                }
                tokens.push({ start, end: column + 1, fret, row: rowIndex });
            }
        }
        tokens.sort((a, b) => a.start - b.start || a.row - b.row);
        let lastStart = -1;
        let occupiedUntil = -1;
        for (const token of tokens) {
            if (token.start !== lastStart && token.start < occupiedUntil) {
                const row = rows[token.row];
                return fail('A note starts inside another fret number. Align the first digits of simultaneous notes in the same column.', row.line, row.offset + token.start + 1);
            }
            lastStart = token.start;
            occupiedUntil = Math.max(occupiedUntil, token.end);
        }
        const internalBars = bars.filter((column) => column > 0 && column < width - 1);
        if (measureCount + internalBars.length + 1 > MAX_TAB_MOMENTS) {
            return fail(`Keep the tab within ${MAX_TAB_MOMENTS.toLocaleString('en-US')} measures.`, rows[0].line, rows[0].offset + 1);
        }
        const grouped = new Map<number, Token[]>();
        for (const token of tokens) {
            const group = grouped.get(token.start) ?? [];
            group.push(token);
            grouped.set(token.start, group);
        }
        const noteIds = new Map<Token, string>();
        [...grouped.values()].forEach((group, position) => group.forEach(token => {
            if (token.fret !== null) noteIds.set(token, `note-${moments.length + position}-${token.row}`);
        }));
        for (const link of endpointLinks) {
            const target = tokens.find(token => token.row === link.token.row && token.start === link.toStart && token.fret !== null);
            if (!target) return fail('A technique endpoint must be a played fret.', link.source.line, link.source.column);
            (link.token.techniques ??= []).push({ kind: link.kind, toNoteId: noteIds.get(target)!, notation: link.notation, source: link.source });
        }
        for (const [column, group] of grouped) {
            if (moments.length >= MAX_TAB_MOMENTS) return fail(`Split the tab into excerpts of at most ${MAX_TAB_MOMENTS.toLocaleString('en-US')} onsets.`, rows[0].line, rows[0].offset + column + 1);
            const index = moments.length;
            moments.push({
                id: `moment-${index}`, index, measure: measureCount + 1 + internalBars.filter((bar) => bar < column).length, column: column + 1,
                // An x-only column is an observed unpitched event, not silence.
                // Retain its position so pitch analysis cannot bridge across it.
                notes: group.filter(token => token.fret !== null).map((token) => {
                    const row = rows[token.row];
                    const midi = tuning[token.row] + capo + token.fret!;
                    return { id: noteIds.get(token)!, string: token.row, fret: token.fret!, midi, pitchClass: midi % 12, source: { line: row.line, column: row.offset + token.start + 1 }, ...(token.techniques ? { techniques: token.techniques } : {}) };
                }),
                ...(group.some(token => token.fret === null) ? { mutes: group.filter(token => token.fret === null).map(token => ({ string: token.row, source: { line: rows[token.row].line, column: rows[token.row].offset + token.start + 1 } })) } : {}),
            });
        }
        measureCount += internalBars.length + 1;
        return null;
    }

    for (const [index, original] of lines.entries()) {
        const trimmed = original.trim();
        if (!trimmed) {
            if (pending.length) return fail(`Each tab block needs six lines; this block has ${pending.length}.`, index + 1, 1);
            continue;
        }
        const indent = original.length - original.trimStart().length;
        const labelMatch = /^([A-Ga-g](?:#|b)?)(?=\|)/.exec(trimmed);
        const isRow = trimmed.includes('|') || trimmed.includes('--') || /^[-0-9xX]/.test(trimmed);
        if (!isRow) {
            if (pending.length) return fail(`Check string line ${pending.length + 1}. Enter all six tab lines together without intervening text.`, index + 1, indent + 1);
            diagnostics.push({ severity: 'warning', message: 'Text outside the tab was excluded from analysis.', line: index + 1, column: indent + 1 });
            continue;
        }
        const label = labelMatch?.[1];
        // Leading spaces in bare rows are timeline columns, not indentation.
        const hasPrefix = label !== undefined || trimmed.startsWith('|');
        pending.push({
            body: hasPrefix ? trimmed.slice(label?.length ?? 0) : original.trimEnd(),
            label, line: index + 1, offset: hasPrefix ? indent + (label?.length ?? 0) : 0,
        });
        if (pending.length === 6) {
            const error = parseBlock(pending);
            if (error) return error;
            pending = [];
        }
    }
    if (pending.length) return fail(`Each tab block needs six lines; this block has ${pending.length}.`, pending[0].line, pending[0].offset + 1);
    if (!moments.some(moment => moment.notes.length > 0 || (moment.mutes?.length ?? 0) > 0)) return fail('No notes or muted events found. Enter six tab lines with fret numbers or x, from the highest string to the lowest.');
    const occupiedMeasures = new Set(moments.map(moment => moment.measure));
    if (moments.length + measureCount - occupiedMeasures.size > MAX_TAB_MOMENTS) {
        return fail(`Keep the tab within ${MAX_TAB_MOMENTS.toLocaleString('en-US')} positions, including one editable position per empty measure.`);
    }
    return { ok: true, diagnostics, document: { format: 'ascii', timing: 'order-only', source, tuningMidi: tuning, capo, moments, measureCount } };
}
