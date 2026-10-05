// @vitest-environment jsdom
import React, { useReducer } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseAsciiTab } from '@/domain/tab/ascii';
import type { TabDocument } from '@/domain/tab/types';
import { createTabAnalysisState, reduceTabAnalysis } from '@/features/tab-analysis/state';
import { TabMeasureEditor, TabNotationEditor } from './TabNotationEditor';

afterEach(cleanup);
function fixture(): TabDocument {
    const result = parseAsciiTab(['e|5-5-5|', 'B|3----|', 'G|-----|', 'D|-----|', 'A|-----|', 'E|-----|'].join('\n'));
    if (!result.ok) throw new Error('Invalid notation fixture');
    return result.document;
}
function Harness({ initial = fixture() }: { initial?: TabDocument }) {
    const [state, dispatch] = useReducer(reduceTabAnalysis, initial, document => ({
        ...createTabAnalysisState(), document, activeCell: { momentId: document.moments[0].id, string: 0 },
    }));
    return <>
        <TabMeasureEditor document={state.document!} measure={1} dispatch={dispatch} />
        <TabNotationEditor document={state.document!} cell={state.activeCell!} dispatch={dispatch} />
        {state.document!.moments.map((moment, index) => <button key={moment.id} onClick={() => dispatch({ type: 'set-active-cell', cell: { momentId: moment.id, string: state.activeCell!.string } })}>Position {index + 1}</button>)}
        <button onClick={() => dispatch({ type: 'set-active-cell', cell: { ...state.activeCell!, string: 0 } })}>First string</button>
        <button onClick={() => dispatch({ type: 'set-active-cell', cell: { ...state.activeCell!, string: 1 } })}>Second string</button>
        <button onClick={() => dispatch({ type: 'undo' })}>Undo</button><button onClick={() => dispatch({ type: 'redo' })}>Redo</button>
        <button onClick={() => dispatch({ type: 'analyze' })}>Analyze</button>
        <output data-testid="document">{JSON.stringify(state.document)}</output>
        <output data-testid="analysis-status">{state.analysisStatus}</output>
    </>;
}
const documentState = () => JSON.parse(screen.getByTestId('document').textContent!) as TabDocument;
const choose = (label: string, index: number) => {
    const picker = screen.getByRole('spinbutton', { name: label });
    fireEvent.keyDown(picker, { key: 'Home' });
    for (let step = 0; step < index; step++) fireEvent.keyDown(picker, { key: 'ArrowRight' });
};

describe('optional TAB notation input through the real reducer', () => {
    it('stores and resets meter without inventing duration, offsets, or measured timing', () => {
        render(<Harness />);
        expect(screen.getByRole('spinbutton', { name: 'Time signature' }).getAttribute('aria-valuetext')).toBe('Unspecified');
        expect(screen.getByRole('spinbutton', { name: 'Duration' }).getAttribute('aria-valuetext')).toBe('Unknown');
        choose('Time signature', 5);
        expect(documentState().meter).toEqual({ numerator: 6, denominator: 8 });
        choose('Time signature', 3);
        const written = documentState();
        expect(written.meter).toEqual({ numerator: 4, denominator: 4 });
        expect(written.timing).toBe('order-only');
        expect(written.moments.every(moment => !moment.beatOffset && moment.notes.every(note => !note.duration))).toBe(true);
        choose('Time signature', 0);
        expect(documentState().meter).toBeUndefined();
    });

    it('sets independent durations for chord notes and clears only the selected duration', async () => {
        const user = userEvent.setup(); render(<Harness />);
        choose('Duration', 5);
        await user.click(screen.getByRole('button', { name: 'Second string' }));
        choose('Duration', 2);
        const notes = documentState().moments[0].notes;
        expect(notes.find(note => note.string === 0)?.duration).toEqual({ numerator: 1, denominator: 2 });
        expect(notes.find(note => note.string === 1)?.duration).toEqual({ numerator: 2, denominator: 1 });
        expect(notes).toHaveLength(2);
        choose('Duration', 0);
        expect(documentState().moments[0].notes.find(note => note.string === 1)?.duration).toBeUndefined();
        expect(documentState().moments[0].notes.find(note => note.string === 0)?.duration).toEqual({ numerator: 1, denominator: 2 });
    });

    it('stores a normalized explicit offset, rejects a zero denominator and preserves it on meter changes', async () => {
        const user = userEvent.setup(); render(<Harness />);
        expect(screen.getByRole('button', { name: 'Set start' }).hasAttribute('disabled')).toBe(true);
        fireEvent.change(screen.getByRole('textbox', { name: 'Start numerator' }), { target: { value: '6' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Start denominator' }), { target: { value: '0' } });
        expect(screen.getByRole('button', { name: 'Set start' }).hasAttribute('disabled')).toBe(true);
        fireEvent.change(screen.getByRole('textbox', { name: 'Start denominator' }), { target: { value: '4' } });
        await user.click(screen.getByRole('button', { name: 'Set start' }));
        expect(documentState().moments[0].beatOffset).toEqual({ numerator: 3, denominator: 2 });
        expect((screen.getByRole('textbox', { name: 'Start numerator' }) as HTMLInputElement).value).toBe('3');
        choose('Time signature', 5);
        expect(documentState().moments[0].beatOffset).toEqual({ numerator: 3, denominator: 2 });
        await user.click(screen.getByRole('button', { name: 'Clear start' }));
        expect(documentState().moments[0].beatOffset).toBeUndefined();
        expect(screen.queryByRole('button', { name: 'Clear start' })).toBeNull();
    });

    it('distinguishes whole-position rest from empty and supports duration plus undo/redo', async () => {
        const user = userEvent.setup(); render(<Harness />);
        await user.click(screen.getByRole('button', { name: 'Rest' }));
        expect(documentState().moments[0].notes).toHaveLength(0);
        expect(documentState().moments[0].rest).toEqual({});
        expect(screen.getByRole('button', { name: 'Rest' }).getAttribute('aria-pressed')).toBe('true');
        choose('Duration', 4);
        expect(documentState().moments[0].rest).toEqual({ duration: { numerator: 1, denominator: 1 } });
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(documentState().moments[0].rest?.duration).toEqual({ numerator: 3, denominator: 2 });
        await user.click(screen.getByRole('button', { name: 'Redo' }));
        expect(documentState().moments[0].rest?.duration).toEqual({ numerator: 1, denominator: 1 });
        await user.click(screen.getByRole('button', { name: 'Rest' }));
        expect(documentState().moments[0].rest).toBeUndefined();
        expect(documentState().moments[0].notes).toHaveLength(0);
        expect(screen.queryByRole('spinbutton', { name: 'Duration' })).toBeNull();
    });

    it('marks only the chosen string muted and does not give a mute a rest duration', async () => {
        const user = userEvent.setup(); render(<Harness />);
        await user.click(screen.getByRole('button', { name: 'Mute x' }));
        expect(documentState().moments[0].mutes).toEqual([{ string: 0 }]);
        expect(documentState().moments[0].notes.map(note => note.string)).toEqual([1]);
        expect(documentState().moments[0].rest).toBeUndefined();
        expect(screen.queryByRole('spinbutton', { name: 'Duration' })).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Mute x' }));
        expect(documentState().moments[0].mutes).toBeUndefined();
        expect(documentState().moments[0].notes.map(note => note.string)).toEqual([1]);
    });

    it('authors explicit tie continuity and independent continuation duration with undo/redo', async () => {
        const user = userEvent.setup(); render(<Harness />);
        expect(screen.getByRole('button', { name: 'Tie previous' }).hasAttribute('disabled')).toBe(true);
        const origin = documentState().moments[0].notes.find(note => note.string === 0)!;
        await user.click(screen.getByRole('button', { name: 'Position 2' }));
        expect(screen.getByRole('button', { name: 'Tie previous' }).hasAttribute('disabled')).toBe(false);
        await user.click(screen.getByRole('button', { name: 'Tie previous' }));
        expect(documentState().moments[1].notes).toHaveLength(0);
        expect(documentState().moments[1].sustains).toEqual([{ noteId: origin.id }]);
        choose('Duration', 2);
        expect(documentState().moments[1].sustains).toEqual([{ noteId: origin.id, duration: { numerator: 2, denominator: 1 } }]);
        expect(documentState().moments[0].notes.find(note => note.id === origin.id)?.duration).toBeUndefined();
        await user.click(screen.getByRole('button', { name: 'Position 3' }));
        await user.click(screen.getByRole('button', { name: 'Tie previous' }));
        expect(documentState().moments[2].sustains).toEqual([{ noteId: origin.id }]);
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(documentState().moments[2].sustains).toBeUndefined();
        expect(documentState().moments[2].notes).toHaveLength(1);
        await user.click(screen.getByRole('button', { name: 'Redo' }));
        expect(documentState().moments[2].sustains).toEqual([{ noteId: origin.id }]);
    });

    it('shows technique metadata without converting bend targets into note attacks', () => {
        const score = fixture(), origin = score.moments[0].notes[0], target = score.moments[1].notes[0];
        origin.techniques = [{ kind: 'hammer-on', toNoteId: target.id }, { kind: 'pull-off', toNoteId: target.id },
            { kind: 'slide', toNoteId: target.id }, { kind: 'bend', targetFret: 7, notation: 'b7' },
            { kind: 'release', targetFret: 5, notation: 'r5' }, { kind: 'vibrato', notation: '~~' }];
        render(<Harness initial={score} />);
        expect(screen.getByText(/^Techniques:/).textContent).toBe('Techniques: hammer-on to fret 5 · pull-off to fret 5 · slide to fret 5 · bend target 7 (fret-equivalent) · release target 5 (fret-equivalent) · vibrato');
        expect(documentState().moments[0].notes[0].fret).toBe(5);
        expect(documentState().moments[0].notes).toHaveLength(2);
    });

    it('marks prior analysis stale on optional input changes while preserving the order-only document', async () => {
        const user = userEvent.setup(); render(<Harness />);
        await user.click(screen.getByRole('button', { name: 'Analyze' }));
        expect(screen.getByTestId('analysis-status').textContent).toBe('fresh');
        choose('Duration', 5);
        expect(screen.getByTestId('analysis-status').textContent).toBe('stale');
        await user.click(screen.getByRole('button', { name: 'Analyze' }));
        expect(screen.getByTestId('analysis-status').textContent).toBe('fresh');
        expect(documentState().timing).toBe('order-only');
    });
});
