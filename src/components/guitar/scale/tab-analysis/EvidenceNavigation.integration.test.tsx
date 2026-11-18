// @vitest-environment jsdom
import React, { useReducer } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
function Harness({ initial = repeatedPitchFixture(), withHarmony = true }: { initial?: TabDocument; withHarmony?: boolean }) {
    const [state, dispatch] = useReducer(reduceTabAnalysis, undefined, () => initialState(initial, withHarmony));
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
    await user.click(screen.getByRole('button', { name: /^Chord progression/ }));
    await user.click(screen.getByRole('button', { name: /^Read progression/ }));
    await user.click(screen.getByRole('button', { name: 'Use single-note range' }));
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
