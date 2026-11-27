// @vitest-environment jsdom
import React, { useReducer } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { createEmptyTabDocument, setTabBeatOffset, setTabDuration, setTabFret, setTabMeter } from '@/domain/tab/editing';
import type { SuppliedTabChord } from '@/domain/tab/supplied-harmony';
import type { TabDocument } from '@/domain/tab/types';
import { createTabAnalysisState, reduceTabAnalysis, type TabAnalysisState } from '@/features/tab-analysis/state';
import { TabAnalysisWorkspace } from './TabAnalysisWorkspace';

afterEach(cleanup);
const scale = createScaleRef('Diatonic Modes', 'Ionian', 0);
const f = (numerator: number) => ({ numerator, denominator: 1 });
function repeatedPitchFixture() {
    let document = createEmptyTabDocument(4);
    // The repeated concert pitches are on other strings and outside the supplied progression.
    for (const [index, string, fret, id] of [[0, 1, 0, 'source-B'], [1, 1, 1, 'source-C'],
        [2, 2, 4, 'duplicate-B'], [3, 2, 5, 'duplicate-C']] as const) {
        document = setTabFret(document, document.moments[index].id, string, fret, id);
    }
    return document;
}
function carryInFixture() {
    let document = setTabMeter(createEmptyTabDocument(2, 2), { numerator: 4, denominator: 4 });
    for (const [index, string, fret, duration, id] of [[0, 1, 0, 6, 'earlier-B'], [1, 2, 4, 1, 'later-B']] as const) {
        const momentId = document.moments[index].id;
        document = setTabFret(document, momentId, string, fret, id);
        document = setTabBeatOffset(document, momentId, f(0));
        document = setTabDuration(document, momentId, string, f(duration));
    }
    return document;
}
function initialState(document: TabDocument, withHarmony: boolean): TabAnalysisState {
    const base = createTabAnalysisState();
    const suppliedHarmony: SuppliedTabChord[] = withHarmony ? [
        { id: 'provided-G7', scoreId: base.scoreId, chord: { root: 'G', chordId: 'dominant-7' },
            binding: { kind: 'positions', firstId: document.moments[0].id, lastId: document.moments[0].id } },
        { id: 'provided-C', scoreId: base.scoreId, chord: { root: 'C', chordId: 'major' },
            binding: { kind: 'positions', firstId: document.moments[1].id, lastId: document.moments[1].id } },
    ] : [];
    return { ...base, document, suppliedHarmony, nextId: 100,
        selection: withHarmony ? { start: 0, end: 1 } : { start: 1, end: 1 },
        activeCell: { momentId: document.moments.at(-1)!.id, string: 2 },
        context: { scale: null, chord: null, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } } };
}
function Harness({ initial = repeatedPitchFixture(), withHarmony = true, fresh = false, withoutFrame = false }: {
    initial?: TabDocument; withHarmony?: boolean; fresh?: boolean; withoutFrame?: boolean;
}) {
    const [state, dispatch] = useReducer(reduceTabAnalysis, undefined, () => {
        const state = fresh ? createTabAnalysisState() : initialState(initial, withHarmony);
        return withoutFrame ? { ...state, context: { ...state.context, frame: null } } : state;
    });
    return <>
        <TabAnalysisWorkspace state={state} dispatch={dispatch} exploredScale={scale}/>
        <button onClick={() => dispatch({ type: 'delete-moment', momentId: initial.moments[0].id })}>Delete evidence source</button>
        <button onClick={() => dispatch({ type: 'remove-supplied-chord', id: 'provided-G7', scoreId: state.scoreId })}>Delete evidence chord</button>
        <button onClick={() => dispatch({ type: 'undo' })}>Undo fixture</button>
        <button onClick={() => dispatch({ type: 'redo' })}>Redo fixture</button>
        <output data-testid="evidence-state">{JSON.stringify({ document: state.document, selection: state.selection,
            activeCell: state.activeCell, past: state.past, future: state.future, suppliedHarmony: state.suppliedHarmony,
            scoreId: state.scoreId, originsRevision: state.originsRevision, context: state.context, analysisStatus: state.analysisStatus })}</output>
    </>;
}
const state = () => JSON.parse(screen.getByTestId('evidence-state').textContent!);
const cell = (position: number, string: number) => screen.getByRole('button', { name: new RegExp(`^String ${string}, onset ${position},`) });
const evidenceCells = () => [...document.querySelectorAll('[role="gridcell"][data-evidence="true"]')];
const evidenceHeaders = () => [...document.querySelectorAll('[data-column-header][data-evidence="true"]')];
const revealIn = (element: HTMLElement) => within(element).getByRole('button', { name: /^Show on tab/ });
const movementRow = () => within(screen.getByRole('list', { name: 'Melody movement' })).getByText('B3 → C4', { exact: true }).closest('li')!;
const start = () => screen.getByRole('textbox', { name: 'Start numerator' }) as HTMLInputElement;
const edit = () => screen.getByRole('button', { name: /^Edit position 4,/ });
async function openMelody(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /^Read with my chords/ }));
    await user.click(screen.getByRole('button', { name: /^Read progression/ }));
    await user.click(screen.getByRole('button', { name: 'Use single-note range' }));
}
function choosePicker(label: string, value: string) {
    const picker = screen.getByRole('spinbutton', { name: label });
    fireEvent.keyDown(picker, { key: 'Home' });
    for (let index = 0; index < 80 && picker.getAttribute('aria-valuetext') !== value; index++) {
        fireEvent.keyDown(picker, { key: 'ArrowRight' });
    }
    expect(picker.getAttribute('aria-valuetext')).toBe(value);
}

describe('reading evidence navigation through the canonical TAB workspace', () => {
    it('reveals the two source IDs for B3→C4 without selecting repeated pitches or changing editing state', async () => {
        const user = userEvent.setup(); render(<Harness/>); await openMelody(user);
        const before = state(); const origin = revealIn(movementRow());
        await user.click(origin);
        expect(evidenceCells()).toEqual([cell(1, 2).closest('[role="gridcell"]'), cell(2, 2).closest('[role="gridcell"]')]);
        expect(cell(3, 3).closest('[role="gridcell"]')?.hasAttribute('data-evidence')).toBe(false);
        expect(cell(4, 3).closest('[role="gridcell"]')?.hasAttribute('data-evidence')).toBe(false);
        expect(document.activeElement).toBe(cell(1, 2)); expect(state()).toEqual(before);
        await user.keyboard('{Escape}'); expect(document.activeElement).toBe(origin); expect(state()).toEqual(before);
    });

    it('makes a selected melody role reveal only its own source while retaining the melody', async () => {
        const user = userEvent.setup(); render(<Harness/>); await openMelody(user);
        const row = within(screen.getByRole('list', { name: 'Selected melody notes' })).getAllByRole('listitem')[1];
        const origin = revealIn(row); const before = state();
        origin.focus(); await user.keyboard('{Enter}');
        expect(evidenceCells()).toEqual([cell(2, 2).closest('[role="gridcell"]')]);
        expect(document.activeElement).toBe(cell(2, 2)); expect(state()).toEqual(before);
        expect(screen.getByRole('list', { name: 'Selected melody notes' }).children).toHaveLength(2);
        await user.keyboard('{Escape}'); expect(document.activeElement).toBe(origin);
    });

    it('reveals both provided chord ranges without changing the original selection or active cell', async () => {
        const user = userEvent.setup(); render(<Harness/>); await openMelody(user);
        const row = within(screen.getByRole('list', { name: 'Chord relationships' })).getAllByRole('listitem')[0];
        const origin = revealIn(row); const before = state(); await user.click(origin);
        expect(evidenceHeaders().map(header => header.getAttribute('aria-label'))).toEqual([
            expect.stringMatching(/^Onset 1,/), expect.stringMatching(/^Onset 2,/),
        ]);
        expect(state()).toEqual(before); await user.keyboard('{Escape}'); expect(document.activeElement).toBe(origin);
    });

    it('opens the corresponding supplied chord detail from its score label without writing selection/history', async () => {
        const user = userEvent.setup(); render(<Harness/>); const before = state();
        await user.click(screen.getByRole('button', { name: 'G7, supplied chord' }));
        const panel = screen.getByRole('region', { name: 'Supplied chord progression' });
        expect(within(panel).getByRole('button', { name: 'Edit chord' })).toBeTruthy();
        expect(within(panel).getByRole('list', { name: 'Notes against supplied chord' }).textContent).toContain('B3');
        expect(state()).toEqual(before);
    });

    it('reveals carry-in by its owning ID and keeps the observed bar and time cursor unchanged', async () => {
        const user = userEvent.setup(); render(<Harness initial={carryInFixture()} withHarmony={false}/>);
        await user.click(screen.getByRole('button', { name: 'View written time' }));
        await user.click(screen.getByRole('button', { name: /^Across full bars/ }));
        const panel = screen.getByRole('region', { name: 'Written time' });
        const row = within(screen.getByRole('list', { name: 'Across-bars written notes' })).getByText('Bar 1 · Position 1 · String 2').closest('li')!;
        const before = state(); const point = within(panel).getByText(/^Point \d+ of/).textContent; const origin = revealIn(row);
        await user.click(origin);
        expect(evidenceCells()).toEqual([cell(1, 2).closest('[role="gridcell"]')]);
        expect(document.activeElement).toBe(cell(1, 2)); expect(state()).toEqual(before);
        expect(screen.getByRole('region', { name: 'Written time' })).toBe(panel);
        expect(within(panel).getByRole('heading', { name: 'Bar 2' })).toBeTruthy();
        expect(within(panel).getByText(/^Point \d+ of/).textContent).toBe(point);
        await user.keyboard('{Escape}'); expect(document.activeElement).toBe(origin);
    });

    it('links a local written interval to its exact source without turning This bar into Across mode', async () => {
        const user = userEvent.setup(); render(<Harness initial={carryInFixture()} withHarmony={false}/>);
        await user.click(screen.getByRole('button', { name: 'View written time' }));
        const panel = screen.getByRole('region', { name: 'Written time' });
        const row = within(screen.getByRole('list', { name: 'Written notes' })).getAllByRole('listitem')[0];
        const origin = revealIn(row); const before = state();
        await user.click(origin);
        expect(evidenceCells()).toEqual([cell(2, 3).closest('[role="gridcell"]')]);
        expect(document.activeElement).toBe(cell(2, 3)); expect(state()).toEqual(before);
        expect(screen.getByRole('region', { name: 'Written time' })).toBe(panel);
        expect(screen.getByRole('button', { name: 'This bar' }).getAttribute('aria-pressed')).toBe('true');
        await user.keyboard('{Escape}'); expect(document.activeElement).toBe(origin);
    });

    it('reveals both complete-point sources across the bar boundary without merging duplicate pitches', async () => {
        const user = userEvent.setup(); render(<Harness initial={carryInFixture()} withHarmony={false}/>);
        await user.click(screen.getByRole('button', { name: 'View written time' }));
        await user.click(screen.getByRole('button', { name: /^Across full bars/ }));
        const panel = screen.getByRole('region', { name: 'Written time' });
        const origin = within(panel).getByRole('button', { name: 'Show point on tab' }); const before = state();
        await user.click(origin);
        expect(evidenceCells()).toEqual([cell(1, 2).closest('[role="gridcell"]'), cell(2, 3).closest('[role="gridcell"]')]);
        expect(document.activeElement).toBe(cell(1, 2)); expect(state()).toEqual(before);
        expect(screen.getByRole('region', { name: 'Written time' })).toBe(panel);
        expect(within(panel).getByRole('heading', { name: 'Bar 2' })).toBeTruthy();
        await user.keyboard('{Escape}'); expect(document.activeElement).toBe(origin);
    });

    it.each(['12', '37'])('protects a pending fret %s from result pointer and keyboard activation', async text => {
        const user = userEvent.setup(); render(<Harness/>); await openMelody(user); const origin = revealIn(movementRow());
        await user.click(cell(4, 3));
        const input = screen.getByRole('textbox', { name: 'Fret for string 3, onset 4' }) as HTMLInputElement;
        await user.keyboard(text); const before = state();
        await user.click(origin); expect(input.value).toBe(text); expect(document.activeElement).toBe(input);
        origin.focus(); await user.keyboard('{Enter}'); await user.keyboard(' ');
        expect(input.value).toBe(text); expect(state()).toEqual(before); expect(evidenceCells()).toHaveLength(0);
        expect(screen.getByText('Finish or cancel this input first.')).toBeTruthy();
        input.focus(); await user.keyboard('{Escape}'); await user.click(origin);
        expect(evidenceCells()).toHaveLength(2); expect(state()).toEqual(before);
    });

    it('retains unapplied fraction text through result activation until explicit cancellation', async () => {
        const user = userEvent.setup(); render(<Harness/>); await openMelody(user); const origin = revealIn(movementRow());
        await user.click(edit()); await user.type(start(), '2'); const before = state();
        await user.click(origin); expect(start().value).toBe('2'); expect(document.activeElement).toBe(start());
        origin.focus(); await user.keyboard('{Enter}'); await user.keyboard(' ');
        expect(start().value).toBe('2'); expect(state()).toEqual(before); expect(evidenceCells()).toHaveLength(0);
        await user.click(screen.getByRole('button', { name: 'Cancel start input' })); await user.click(origin);
        expect(evidenceCells()).toHaveLength(2); expect(state()).toEqual(before);
    });

    it.each(['fret', 'fraction'])('blocks active %s IME without retrying after composition ends', async kind => {
        const user = userEvent.setup(); render(<Harness/>); await openMelody(user); const origin = revealIn(movementRow());
        if (kind === 'fraction') await user.click(edit()); else await user.click(cell(4, 3));
        const input = kind === 'fraction' ? start() : screen.getByRole('textbox', { name: 'Fret for string 3, onset 4' }) as HTMLInputElement;
        fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: '2' } }); const before = state();
        await user.click(origin); fireEvent.keyDown(origin, { key: 'Enter', isComposing: true }); fireEvent.click(origin);
        expect(input.value).toBe('2'); expect(state()).toEqual(before); expect(evidenceCells()).toHaveLength(0);
        fireEvent.compositionEnd(input); expect(evidenceCells()).toHaveLength(0); expect(state()).toEqual(before);
        if (kind === 'fraction') await user.click(screen.getByRole('button', { name: 'Cancel start input' }));
        else { input.focus(); await user.keyboard('{Escape}'); }
        await user.click(origin); expect(evidenceCells()).toHaveLength(2); expect(state()).toEqual(before);
    });

    it.each(['Delete evidence source', 'Delete evidence chord'])('invalidates evidence on %s and does not restore it through Undo/Redo', async action => {
        const user = userEvent.setup(); render(<Harness/>); await openMelody(user);
        const origin = action === 'Delete evidence chord'
            ? revealIn(within(screen.getByRole('list', { name: 'Chord relationships' })).getAllByRole('listitem')[0])
            : revealIn(movementRow());
        await user.click(origin); expect(evidenceCells().length + evidenceHeaders().length).toBeGreaterThan(0);
        await user.click(screen.getByRole('button', { name: action }));
        expect(evidenceCells()).toHaveLength(0); expect(evidenceHeaders()).toHaveLength(0);
        await user.click(screen.getByRole('button', { name: 'Undo fixture' }));
        expect(evidenceCells()).toHaveLength(0); expect(evidenceHeaders()).toHaveLength(0);
        await user.click(screen.getByRole('button', { name: 'Redo fixture' }));
        expect(evidenceCells()).toHaveLength(0); expect(evidenceHeaders()).toHaveLength(0);
    });
});

describe('P5.2 task entry and optional key completion', () => {
    it('reads a freshly imported free-timing melody with supplied chords without visiting timing menus', async () => {
        const user = userEvent.setup(); render(<Harness fresh/>);
        await user.click(screen.getByRole('button', { name: 'Import TAB…' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Paste TAB' }), { target: {
            value: ['e|---|', 'B|0-1|', 'G|---|', 'D|---|', 'A|---|', 'E|---|'].join('\n'),
        } });
        await user.click(screen.getByRole('button', { name: 'Import tab' }));
        await user.click(screen.getByRole('button', { name: /^Read with my chords/ }));
        const panel = screen.getByRole('region', { name: 'Supplied chord progression' });
        expect(document.activeElement).toBe(within(panel).getByRole('heading', { name: 'My chords' }));
        for (const [position, root, quality] of [[1, 'G', '7'], [2, 'C', 'Major']] as const) {
            if (position === 2) await user.click(screen.getByRole('button', { name: /^Onset 2,/ }));
            await user.click(screen.getByRole('button', { name: 'Add chord' }));
            choosePicker('Chord root', root); choosePicker('Chord quality', quality);
            await user.click(screen.getByRole('button', { name: 'Apply chord' }));
        }
        await user.click(screen.getByRole('button', { name: /^Onset 1,/ }));
        await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
        await user.click(screen.getByRole('button', { name: /^Read progression/ }));
        await user.click(screen.getByRole('button', { name: 'Use single-note range' }));
        expect(movementRow()).toBeTruthy();
        expect(state().document.meter).toBeUndefined();
        expect(state().document.moments.every((moment: TabDocument['moments'][number]) => !moment.beatOffset
            && moment.notes.every(note => !note.duration))).toBe(true);
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        const before = state(); const notes = screen.getByRole('list', { name: 'Selected melody notes' }).textContent;
        const setKey = screen.getByRole('button', { name: 'Set key reference' });
        await user.click(setKey);
        const draft = screen.getByRole('region', { name: 'Key reference draft' });
        expect(within(draft).getByRole('button', { name: 'Key tonic C' })).toBeTruthy();
        expect(within(draft).getByRole('spinbutton', { name: 'Key mode' }).getAttribute('aria-valuetext')).toBe('Major');
        expect(state()).toEqual(before);
        await user.click(within(draft).getByRole('button', { name: 'Cancel key reference' }));
        expect(screen.queryByRole('region', { name: 'Key reference draft' })).toBeNull();
        expect(document.activeElement).toBe(setKey); expect(state()).toEqual(before);
        expect(screen.getByRole('list', { name: 'Selected melody notes' }).textContent).toBe(notes);
        await user.click(setKey);
        await user.click(screen.getByRole('button', { name: 'Apply key reference' }));
        const after = state();
        expect(after.context.frame).toEqual({ tonic: 'C', mode: 'major', lens: 'jazz-pop' });
        expect({ ...after, context: before.context }).toEqual(before);
        expect(document.activeElement).toBe(setKey);
        expect(screen.getByRole('button', { name: 'Change key reference' })).toBe(setKey);
        expect(screen.getByRole('list', { name: 'Selected melody notes' }).textContent).toBe(notes);
        expect(screen.getByRole('list', { name: 'Chord relationships' }).textContent).toContain('Dominant motion');
    });

    it('keeps reading actions before the score and their expanded details after its first grid', async () => {
        const user = userEvent.setup(); render(<Harness/>);
        const grid = screen.getByRole('grid', { name: 'Editable tab' });
        for (const name of ['Read TAB patterns', 'View written time', 'Check timing']) {
            expect(screen.getByRole('button', { name }).compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
        const entry = screen.getByRole('button', { name: /^Read with my chords/ });
        expect(entry.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        await user.click(entry);
        const panel = screen.getByRole('region', { name: 'Supplied chord progression' });
        expect(grid.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(document.activeElement).toBe(within(panel).getByRole('heading', { name: 'My chords' }));
        await user.click(screen.getByRole('button', { name: 'View written time' }));
        const written = screen.getByRole('region', { name: 'Written time' });
        expect(grid.compareDocumentPosition(written) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(document.activeElement).toBe(written.closest('[aria-label="Written time details"]'));
        await user.tab(); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'This bar' }));
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'View written time' }));
    });

    it('cancels optional key entry with Escape while preserving its result and selected melody', async () => {
        const user = userEvent.setup(); render(<Harness withoutFrame/>); await openMelody(user);
        const before = state(); const movement = movementRow();
        const setKey = screen.getByRole('button', { name: 'Set key reference' });
        await user.click(setKey);
        const draft = screen.getByRole('region', { name: 'Key reference draft' });
        within(draft).getByRole('button', { name: 'Cancel key reference' }).focus(); await user.keyboard('{Escape}');
        expect(screen.queryByRole('region', { name: 'Key reference draft' })).toBeNull();
        expect(document.activeElement).toBe(setKey); expect(state()).toEqual(before); expect(movementRow()).toBe(movement);
    });
});

describe('P5.3 score entry', () => {
    it('captures the current range for a positional chord and records one undoable save', async () => {
        const user = userEvent.setup(); render(<Harness withHarmony={false} initial={carryInFixture()}/>);
        await user.click(screen.getByRole('button', { name: /^Read with my chords/ }));
        await user.click(screen.getByRole('button', { name: 'By written time' }));
        await user.click(screen.getByRole('button', { name: /^Onset 2,/ }));
        await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');
        const shortcut = screen.getByRole('button', { name: 'Add chord to selection' });
        const before = state();
        await user.click(shortcut);
        expect(screen.getByRole('heading', { name: 'Add supplied chord' })).toBeTruthy();
        expect(screen.queryByRole('textbox', { name: 'Chord start' })).toBeNull();
        expect(state()).toEqual(before);
        await user.click(screen.getByRole('button', { name: /^Onset 2,/ }));
        choosePicker('Chord root', 'G'); choosePicker('Chord quality', '7');
        await user.click(screen.getByRole('button', { name: 'Apply chord' }));
        expect(state().suppliedHarmony[0].binding).toEqual({
            kind: 'positions', firstId: before.document.moments[0].id, lastId: before.document.moments[1].id,
        });
        expect(state().past).toHaveLength(before.past.length + 1);
        expect(state().document).toEqual(before.document);
        expect(screen.getByRole('button', { name: 'By written time' }).getAttribute('aria-pressed')).toBe('true');
        expect(document.activeElement).toBe(shortcut);
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(state().suppliedHarmony).toHaveLength(0);
        await user.click(screen.getByRole('button', { name: 'Redo' }));
        expect(state().suppliedHarmony).toHaveLength(1);
    });

    it('opens the supplied reading from an untimed single-note range and preserves its source links', async () => {
        const user = userEvent.setup(); render(<Harness/>);
        const before = state();
        await user.click(screen.getByRole('button', { name: 'Read selected melody' }));
        expect(state()).toEqual(before);
        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Progression reading' })));
        expect(screen.getByRole('list', { name: 'Chord relationships' }).textContent).toContain('Dominant motion');
        await user.click(revealIn(movementRow()));
        expect(evidenceCells()).toEqual([cell(1, 2).closest('[role="gridcell"]'), cell(2, 2).closest('[role="gridcell"]')]);
        expect(state()).toEqual(before);
    });

    it('picks existing notes by position with an independent cursor and restores fret editing on exit', async () => {
        const user = userEvent.setup();
        const initial = repeatedPitchFixture();
        render(<Harness initial={setTabFret(initial, initial.moments[0].id, 2, 4, 'same-B-other-string')}/>);
        const before = state();
        const origin = screen.getByRole('button', { name: 'Choose melody notes' });
        expect(screen.queryByRole('button', { name: 'Read selected melody' })).toBeNull();
        await user.click(origin);
        expect(document.activeElement).toBe(cell(1, 2));
        expect(cell(1, 2).tabIndex).toBe(0);
        expect(cell(1, 3).tabIndex).toBe(-1);
        expect((cell(3, 3) as HTMLButtonElement).disabled).toBe(true);
        await user.keyboard('{Enter}{ArrowDown} ');
        expect(cell(1, 2).getAttribute('aria-pressed')).toBe('false');
        expect(cell(1, 3).getAttribute('aria-pressed')).toBe('true');
        await user.keyboard('{ArrowRight}{Enter}');
        expect(document.activeElement).toBe(cell(2, 2));
        await user.keyboard('7{Delete}{Backspace}{Insert}{F2}');
        expect(screen.queryByRole('textbox', { name: /^Fret for/ })).toBeNull();
        expect(state()).toEqual(before);
        await user.click(screen.getByRole('button', { name: 'Read melody' }));
        const selected = screen.getByRole('list', { name: 'Selected melody notes' });
        expect(selected.textContent).toContain('B3 · Position 1 · String 3');
        expect(selected.textContent).toContain('C4 · Position 2 · String 2');
        expect(state()).toEqual(before);
        await user.click(origin);
        await user.click(cell(1, 2));
        await user.keyboard('{Escape}');
        expect(document.activeElement).toBe(origin);
        expect(screen.getByRole('list', { name: 'Selected melody notes' }).textContent).toContain('B3 · Position 1 · String 3');
        await user.click(cell(1, 2));
        expect(screen.getByRole('textbox', { name: 'Fret for string 2, onset 1' })).toBeTruthy();
    });

    it('leaves the grid intact while an unapplied fret blocks score shortcuts', async () => {
        const user = userEvent.setup(); render(<Harness/>);
        await user.click(cell(2, 2));
        const input = screen.getByRole('textbox', { name: 'Fret for string 2, onset 2' }) as HTMLInputElement;
        await user.clear(input); await user.type(input, '12');
        const before = state();
        for (const name of ['Add chord to selection', 'Read selected melody']) {
            await user.click(screen.getByRole('button', { name }));
            expect(document.activeElement).toBe(input);
            expect(input.value).toBe('12');
            expect(state()).toEqual(before);
        }
        expect(screen.queryByRole('region', { name: 'Supplied chord progression' })).toBeNull();
    });

    it('expires the picker after source deletion and does not resurrect it after Undo', async () => {
        const user = userEvent.setup();
        const initial = repeatedPitchFixture();
        render(<Harness initial={setTabFret(initial, initial.moments[0].id, 2, 4, 'same-B-other-string')}/>);
        await user.click(screen.getByRole('button', { name: 'Choose melody notes' }));
        await user.click(cell(1, 3));
        await user.click(screen.getByRole('button', { name: 'Delete evidence source' }));
        expect(screen.queryByRole('group', { name: 'Melody selection' })).toBeNull();
        expect(screen.getByText('Score changed. Select the melody again.')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Undo fixture' }));
        expect(screen.queryByRole('group', { name: 'Melody selection' })).toBeNull();
        expect(screen.queryByRole('list', { name: 'Selected melody notes' })).toBeNull();
    });
});
