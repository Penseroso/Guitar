// @vitest-environment jsdom
import React, { useReducer } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyTabDocument, setTabBeatOffset, setTabDuration, setTabFret, setTabMeter } from '@/domain/tab/editing';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { createTabAnalysisState, reduceTabAnalysis } from '@/features/tab-analysis/state';
import * as analysis from '@/domain/tab/written-point-analysis';
import type { TabDocument } from '@/domain/tab/types';
import { TabAnalysisWorkspace } from './TabAnalysisWorkspace';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const fraction = (numerator: number) => ({ numerator, denominator: 1 });
const scale = createScaleRef('Diatonic Modes', 'Ionian', 0);
function fixture() {
    let document = setTabMeter(createEmptyTabDocument(12, 1), { numerator: 4, denominator: 4 });
    for (let i = 0; i < 12; i++) {
        const id = document.moments[i].id;
        document = setTabFret(document, id, 0, [8, 0, 3, 5][i % 4], `note-${i}`);
        document = setTabBeatOffset(document, id, fraction(i === 11 ? 1 : 0));
        document = setTabDuration(document, id, 0, fraction(3));
    }
    return document;
}
function Harness({ initial = fixture() }: { initial?: TabDocument }) {
    const [state, dispatch] = useReducer(reduceTabAnalysis, undefined, () => ({ ...createTabAnalysisState(), document: initial,
        selection: { start: 0, end: 0 }, activeCell: { momentId: initial.moments[0].id, string: 0 },
        context: { scale, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } as const, chord: null } }));
    return <>
        <TabAnalysisWorkspace state={state} dispatch={dispatch} exploredScale={scale}/>
        <button onClick={() => dispatch({ type: 'set-frame', frame: { tonic: 'D', mode: 'minor', lens: 'jazz-pop' } })}>Change reference key</button>
        <button onClick={() => dispatch({ type: 'set-scale', scale: { ...scale, tonic: 2 } })}>Change reference scale</button>
        <button onClick={() => dispatch({ type: 'set-chord', chord: { root: 'F#', chordId: 'major', bass: 'C#' } })}>Change selected context chord</button>
        <button onClick={() => dispatch({ type: 'set-fret', momentId: state.document!.moments[0].id, string: 0, fret: 7 })}>Edit fixture source</button>
        <button onClick={() => dispatch({ type: 'undo' })}>Undo fixture source</button>
        <output data-testid="written-reading-state">{JSON.stringify({ document: state.document, selection: state.selection, activeCell: state.activeCell,
            past: state.past.length, future: state.future.length, context: state.context, analysisStatus: state.analysisStatus })}</output>
    </>;
}
const state = () => JSON.parse(screen.getByTestId('written-reading-state').textContent!);
const view = () => screen.getByRole('button', { name: 'View written time' });
const region = () => screen.getByRole('region', { name: 'Written time' });
const readings = () => screen.getByText('Chord readings');
const choices = () => within(screen.getByRole('list', { name: 'Formula alternatives' })).getAllByRole('button');
const nextPoint = () => screen.getByRole('button', { name: 'Next across-bars time point' });
function open() {
    fireEvent.click(view()); fireEvent.click(screen.getByRole('button', { name: /^Across full bars/ })); fireEvent.click(readings());
}

describe('Across-only written chord readings lifecycle', () => {
    it('requires Across mode and explicit open, with no change to source, history, selection or Analyze', () => {
        const analyze = vi.spyOn(analysis, 'analyzeTabWrittenPoint'); render(<Harness/>); const before = state();
        fireEvent.click(view()); expect(screen.queryByText('Chord readings')).toBeNull(); expect(analyze).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: /^Across full bars/ })); expect(analyze).not.toHaveBeenCalled();
        fireEvent.click(readings()); expect(analyze).toHaveBeenCalledOnce(); expect(screen.getByText('Scale reference · C Ionian')).toBeTruthy();
        expect(screen.getByText('Key reference · C major')).toBeTruthy();
        fireEvent.click(choices()[0]); expect(screen.getByLabelText('Hypothetical chord')).toBeTruthy(); expect(state()).toEqual(before);
        fireEvent.click(screen.getByRole('button', { name: 'This bar' })); expect(screen.queryByText('Chord readings')).toBeNull(); expect(state()).toEqual(before);
        expect(screen.getByRole('button', { name: 'Read TAB patterns' })).toBeTruthy();
    });

    it.each(['Change reference key', 'Change reference scale'])('closes only readings on %s while preserving report, cursor and page', label => {
        render(<Harness/>); open(); fireEvent.click(choices()[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Next across-bars notes page' })); fireEvent.click(nextPoint());
        const report = region(); const pageRows = within(screen.getByRole('list', { name: 'Across-bars written notes' })).getAllByRole('listitem').map(row => row.textContent);
        expect(screen.getByText('Point 2 of 4')).toBeTruthy(); const before = state(); fireEvent.click(screen.getByRole('button', { name: label }));
        expect(region()).toBe(report); expect(screen.getByText('Point 2 of 4')).toBeTruthy();
        expect(within(screen.getByRole('list', { name: 'Across-bars written notes' })).getAllByRole('listitem').map(row => row.textContent)).toEqual(pageRows);
        expect(screen.queryByRole('region', { name: 'Written chord readings' })).toBeNull(); expect(screen.queryByLabelText('Hypothetical chord')).toBeNull();
        expect(state().document).toEqual(before.document); expect(state().past).toBe(before.past); expect(state().selection).toEqual(before.selection);
        fireEvent.click(readings()); expect(screen.getByRole('region', { name: 'Written chord readings' })).toBeTruthy(); expect(screen.queryByLabelText('Hypothetical chord')).toBeNull();
    });

    it('excludes selected context chord and bass from recognition, names, selection and ordering', () => {
        const analyze = vi.spyOn(analysis, 'analyzeTabWrittenPoint'); render(<Harness/>); open();
        const initialKeys = choices().map(button => button.getAttribute('data-candidate-key')); fireEvent.click(choices()[0]);
        const hypothesis = screen.getByLabelText('Hypothetical chord').textContent; const calls = analyze.mock.calls.length;
        fireEvent.click(screen.getByRole('button', { name: 'Change selected context chord' }));
        expect(screen.getByLabelText('Hypothetical chord').textContent).toBe(hypothesis);
        expect(choices().map(button => button.getAttribute('data-candidate-key'))).toEqual(initialKeys); expect(analyze).toHaveBeenCalledTimes(calls);
        expect(analyze.mock.calls[0][2]).toEqual({ scale, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } });
    });

    it('opens a proven complete point despite global partial timing and removes stale readings at uncertainty', () => {
        const initial = fixture(); delete initial.moments[11].notes[0].duration; render(<Harness initial={initial}/>); open();
        expect(screen.getByText('Timing incomplete across score')).toBeTruthy(); expect(screen.getByText('Complete at this point')).toBeTruthy();
        fireEvent.click(choices()[0]); fireEvent.click(nextPoint()); expect(screen.getByText('More timing needed at this point')).toBeTruthy();
        expect(screen.queryByText('Chord readings')).toBeNull(); expect(screen.queryByLabelText('Hypothetical chord')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Previous across-bars time point' }));
        expect(screen.queryByRole('region', { name: 'Written chord readings' })).toBeNull(); fireEvent.click(readings());
        expect(choices().every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    });

    it('handles Escape from selected readings before closing the whole report and returns both focuses', async () => {
        const user = userEvent.setup(); render(<Harness/>); open(); fireEvent.click(choices()[0]);
        screen.getByRole('button', { name: 'Clear hypothetical chord' }).focus(); await user.keyboard('{Escape}');
        expect(region()).toBeTruthy(); expect(screen.queryByRole('region', { name: 'Written chord readings' })).toBeNull(); expect(document.activeElement).toBe(readings());
        await user.keyboard('{Escape}'); expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull(); expect(document.activeElement).toBe(view());
    });

    it.each(['12', '37'])('protects a pending fret %s against all new actions without retry', async draft => {
        const user = userEvent.setup(); render(<Harness/>); open(); fireEvent.click(choices()[0]);
        await user.click(screen.getByRole('button', { name: /^String 1, onset 1,/ })); await user.keyboard(draft);
        const input = screen.getByRole('textbox', { name: 'Fret for string 1, onset 1' }) as HTMLInputElement; const before = state();
        await user.click(readings()); await user.click(choices()[1]);
        await user.click(screen.getByRole('button', { name: 'Clear hypothetical chord' })); await user.click(screen.getByText('Observation details'));
        await user.click(screen.getByRole('button', { name: 'Next written point notes page' }));
        fireEvent.keyDown(choices()[1], { key: 'Enter' }); fireEvent.click(choices()[1]);
        expect(input.value).toBe(draft); expect(document.activeElement).toBe(input); expect(state()).toEqual(before);
        expect(screen.getByLabelText('Hypothetical chord')).toBeTruthy();
        expect(within(screen.getByRole('group', { name: 'Written point note pages' })).getByText('Page 1 of 2')).toBeTruthy();
        await user.keyboard('{Escape}'); expect(state()).toEqual(before); expect(screen.getByRole('region', { name: 'Written chord readings' })).toBeTruthy();
    });

    it('blocks composing start input on new disclosures and requires an explicit cancel', async () => {
        const user = userEvent.setup(); render(<Harness/>); open(); await user.click(screen.getByRole('button', { name: /^Edit position 1,/ }));
        const input = screen.getByRole('textbox', { name: 'Start numerator' }) as HTMLInputElement;
        fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: '2' } }); const before = state();
        await user.click(choices()[0]); await user.click(readings());
        expect(input.value).toBe('2'); expect(state()).toEqual(before); expect(screen.queryByLabelText('Hypothetical chord')).toBeNull();
        fireEvent.compositionEnd(input); expect(state()).toEqual(before); expect(screen.queryByLabelText('Hypothetical chord')).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Cancel start input' })); await user.click(choices()[0]);
        expect(screen.getByLabelText('Hypothetical chord')).toBeTruthy(); expect(state()).toEqual(before);
    });

    it('invalidates readings with source edits and never revives them through Undo', () => {
        render(<Harness/>); open(); fireEvent.click(choices()[0]); fireEvent.click(screen.getByRole('button', { name: 'Edit fixture source' }));
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull(); expect(screen.queryByLabelText('Hypothetical chord')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Undo fixture source' })); expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        open(); expect(choices().every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    });
});
