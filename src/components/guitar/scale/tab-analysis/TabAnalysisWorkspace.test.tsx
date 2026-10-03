// @vitest-environment jsdom
import React, { useReducer } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { createTabAnalysisState, reduceTabAnalysis } from '@/features/tab-analysis/state';
import { TabAnalysisWorkspace } from './TabAnalysisWorkspace';

afterEach(cleanup);
const source = ['e|--0--1--0--|', 'B|--1--0--1--|', 'G|--0--0--0--|', 'D|--2--0--2--|', 'A|--3--2--3--|', 'E|-----3-----|'].join('\n');
function Harness() {
    const [state, dispatch] = useReducer(reduceTabAnalysis, undefined, createTabAnalysisState);
    return <TabAnalysisWorkspace state={state} dispatch={dispatch} exploredScale={createScaleRef('Diatonic Modes', 'Ionian', 0)} />;
}
const editor = () => screen.getByRole('textbox', { name: 'Paste or write a six-string tab' });
const score = () => screen.getByRole('region', { name: 'Tab score — onsets in order' });
const onset = (index: number) => within(score()).getByRole('button', { name: new RegExp(`^Onset ${index},`) });
async function parseInput(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Import text' }));
    fireEvent.change(editor(), { target: { value: source } });
    await user.click(screen.getByRole('button', { name: 'Import tab' }));
}
function textFile(name: string, text: () => Promise<string>) {
    const file = new File(['tab'], name, { type: 'text/plain' });
    Object.defineProperty(file, 'text', { value: vi.fn(text) });
    return file;
}
const chooseFile = (file: File) => fireEvent.change(screen.getByLabelText('Open a text tab file'), { target: { files: [file] } });

describe('score-first explicit analysis workflow', () => {
    it('commits the first typed note when Analyze is clicked and rejects an invalid draft', async () => {
        const user = userEvent.setup(); render(<Harness />);
        await user.click(screen.getByRole('button', { name: 'String 1, onset 1, empty' }));
        await user.type(screen.getByRole('textbox', { name: 'Fret for string 1, onset 1' }), '12');
        expect(screen.getByRole('button', { name: 'Analyze' }).hasAttribute('disabled')).toBe(false);
        await user.click(screen.getByRole('button', { name: 'Analyze' }));
        expect(screen.getByRole('button', { name: 'String 1, onset 1, fret 12' })).toBeTruthy();
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Analyzed whole score/);
        await user.click(screen.getByRole('button', { name: 'String 1, onset 1, fret 12' }));
        const input = screen.getByRole('textbox', { name: 'Fret for string 1, onset 1' });
        await user.clear(input); await user.type(input, '37');
        expect(screen.getByRole('button', { name: 'Analyze' }).hasAttribute('disabled')).toBe(true);
        await user.keyboard('{Escape}');
        expect(screen.getByRole('button', { name: 'Analyze' }).hasAttribute('disabled')).toBe(false);
    });
    it('starts with four bars, expands a bar past four positions and appends four bars', async () => {
        const user = userEvent.setup(); render(<Harness />);
        expect(within(score()).getAllByRole('button', { name: /^Onset/ })).toHaveLength(16);
        expect(screen.getByRole('button', { name: 'Analyze' }).hasAttribute('disabled')).toBe(true);
        expect(screen.queryByRole('region', { name: 'Selected passage analysis' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Add position' })).toBeNull();
        for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Insert position after onset 1' }));
        expect(within(score()).getAllByRole('button', { name: /^Onset \d+, bar 1:/ })).toHaveLength(7);
        await user.click(screen.getByRole('button', { name: '+ 4 bars' }));
        expect(screen.getByText(/8 bars · 35 positions/)).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(screen.getByText(/4 bars · 19 positions/)).toBeTruthy();
    });
    it('deletes header-selected columns together and restores them with one Undo', async () => {
        const user = userEvent.setup(); render(<Harness />); await parseInput(user);
        await user.click(screen.getByRole('button', { name: 'Analyze' }));
        await user.click(onset(1));
        await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
        await user.keyboard('{Delete}');
        expect(within(score()).getAllByRole('button', { name: /^Onset/ })).toHaveLength(1);
        expect(within(score()).queryByText('G7')).toBeNull();
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Analyze again/);
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(within(score()).getAllByRole('button', { name: /^Onset/ })).toHaveLength(3);
        expect(screen.getByRole('button', { name: 'String 1, onset 2, fret 1' })).toBeTruthy();
    });
    it('exposes a delete popover only after a touch long press, and restores deletion with Undo', async () => {
        const user = userEvent.setup(); render(<Harness />); await parseInput(user);
        expect(screen.queryByRole('button', { name: 'Delete selected columns' })).toBeNull();
        await user.click(onset(2));
        expect(screen.queryByRole('button', { name: 'Delete selected columns' })).toBeNull();
        const header = onset(2);
        const pointer = (type: string) => {
            const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: 25, clientY: 20 });
            Object.defineProperties(event, { pointerId: { value: 7 }, pointerType: { value: 'touch' } });
            fireEvent(header, event);
        };
        pointer('pointerdown');
        await waitFor(() => expect(screen.getByRole('button', { name: 'Delete selected columns' })).toBeTruthy());
        pointer('pointerup');
        await user.click(screen.getByRole('button', { name: 'Delete selected columns' }));
        expect(within(score()).getAllByRole('button', { name: /^Onset/ })).toHaveLength(2);
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(within(score()).getAllByRole('button', { name: /^Onset/ })).toHaveLength(3);
        await user.click(screen.getByRole('button', { name: 'String 1, onset 2, fret 1' }));
        expect(screen.queryByRole('button', { name: 'Delete selected columns' })).toBeNull();
    });
    it('analyzes only on request, retains annotations on cursor movement and hides stale results', async () => {
        const user = userEvent.setup(); render(<Harness />); await parseInput(user);
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Ready to analyze/);
        expect(within(score()).queryByText('G7')).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Analyze' }));
        expect(within(score()).getByText('G7')).toBeTruthy();
        await user.click(onset(2));
        expect(within(score()).getByText('G7')).toBeTruthy();
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Analyzed whole score/);
        await user.click(screen.getByRole('button', { name: 'String 1, onset 2, fret 1' }));
        const input = screen.getByRole('textbox', { name: 'Fret for string 1, onset 2' });
        await user.clear(input); await user.type(input, '2{Enter}');
        expect(within(score()).queryByText('G7')).toBeNull();
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Analyze again/);
        await user.click(screen.getByRole('button', { name: 'Analyze' }));
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Analyzed whole score/);
    });
    it('analyzes the whole score regardless of cursor and requires an explicit key for progression', async () => {
        const user = userEvent.setup(); render(<Harness />); await parseInput(user);
        await user.click(onset(2));
        expect(screen.queryByRole('button', { name: 'Selected passage' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Whole score' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Extend selection' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Select all' })).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Analyze' }));
        expect(within(score()).getByText('G7')).toBeTruthy();
        expect(within(score()).getAllByText('C')).toHaveLength(2);
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Analyzed whole score/);
        expect(within(score()).queryByText('V–I motion')).toBeNull();
        await user.click(screen.getByText('Context', { exact: true }));
        await user.click(screen.getByRole('button', { name: 'Set a key' }));
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Analyze again/);
        await user.click(screen.getByRole('button', { name: 'Analyze' }));
        expect(within(score()).getByText('V–I motion')).toBeTruthy();
    });
    it('loads an eight-bar example without analyzing and preserves it on failed import', async () => {
        const user = userEvent.setup(); render(<Harness />);
        await user.click(screen.getByRole('button', { name: 'Try an example' }));
        expect(screen.getByText(/8 bars/)).toBeTruthy();
        const count = within(score()).getAllByRole('button', { name: /^Onset/ }).length;
        expect(count).toBeGreaterThan(16);
        await user.click(onset(1));
        expect(screen.queryByRole('button', { name: 'Delete selected columns' })).toBeNull();
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Ready to analyze/);
        await user.click(screen.getByRole('button', { name: 'Analyze' }));
        await user.click(screen.getByRole('button', { name: 'Import text' }));
        fireEvent.change(editor(), { target: { value: 'invalid tab' } });
        await user.click(screen.getByRole('button', { name: 'Import tab' }));
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(within(score()).getAllByRole('button', { name: /^Onset/ })).toHaveLength(count);
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Analyzed whole score/);
    });
    it('preserves frets through retuning and rejects mismatched import labels', async () => {
        const user = userEvent.setup(); render(<Harness />); await parseInput(user);
        await user.click(screen.getByText('Context', { exact: true }));
        await user.click(screen.getByRole('button', { name: 'Next Tuning' }));
        await user.click(screen.getByRole('button', { name: 'Import text' }));
        expect((editor() as HTMLTextAreaElement).value).toBe(source);
        await user.click(screen.getByRole('button', { name: 'Import tab' }));
        expect(screen.getByRole('alert').textContent).toMatch(/튜닝|tuning/i);
        expect(score()).toBeTruthy();
    });
    it('loads a text file into an import draft and still requires Analyze', async () => {
        const user = userEvent.setup(); render(<Harness />);
        chooseFile(textFile('study.txt', async () => source));
        await waitFor(() => expect((editor() as HTMLTextAreaElement).value).toBe(source));
        await user.click(screen.getByRole('button', { name: 'Import tab' }));
        expect(screen.getByText(/study.txt/)).toBeTruthy();
        expect(screen.getByRole('status', { name: 'Analysis status' }).textContent).toMatch(/Ready to analyze/);
    });
    it('rejects unsupported formats before reading or replacing the score', () => {
        render(<Harness />); const file = textFile('score.gp', async () => source); chooseFile(file);
        expect(file.text).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/plain-text/);
        expect(within(score()).getAllByRole('button', { name: /^Onset/ })).toHaveLength(16);
    });
    it('cancels a file read so it cannot replace newer input', async () => {
        const user = userEvent.setup(); render(<Harness />);
        let finish!: (value: string) => void;
        chooseFile(textFile('slow.txt', () => new Promise(resolve => { finish = resolve; })));
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        await user.click(screen.getByRole('button', { name: 'Import text' }));
        fireEvent.change(editor(), { target: { value: source } });
        await act(async () => { finish('old tab'); });
        expect((editor() as HTMLTextAreaElement).value).toBe(source);
    });
    it('keeps the newer file when an older read finishes later', async () => {
        render(<Harness />); let finish!: (value: string) => void;
        chooseFile(textFile('old.txt', () => new Promise(resolve => { finish = resolve; })));
        chooseFile(textFile('new.txt', async () => source));
        await waitFor(() => expect((editor() as HTMLTextAreaElement).value).toBe(source));
        await act(async () => { finish('obsolete source'); });
        await userEvent.setup().click(screen.getByRole('button', { name: 'Import tab' }));
        expect(screen.getByText(/new.txt/)).toBeTruthy();
    });
});
