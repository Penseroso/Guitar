// @vitest-environment jsdom
import React, { useReducer } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyTabDocument, setTabFret } from '@/domain/tab/editing';
import type { TabDocument } from '@/domain/tab/types';
import { createTabAnalysisState, reduceTabAnalysis } from '@/features/tab-analysis/state';
import { parseAsciiTab } from '@/domain/tab/ascii';
import { TabScoreView } from './TabScoreView';

afterEach(cleanup);
function fixture(timed = false) {
    let d = createEmptyTabDocument(3);
    d = setTabFret(d, d.moments[0].id, 0, 5, 'a');
    d = setTabFret(d, d.moments[2].id, 0, 7, 'b');
    if (timed) d.meter = { numerator: 4, denominator: 4 };
    return d;
}
function Harness({ initial = fixture() }: { initial?: TabDocument }) {
    const [s, dispatch] = useReducer(reduceTabAnalysis, undefined, () => ({ ...createTabAnalysisState(), document: initial, nextId: 10 }));
    const source = 'e|5--|\nB|---|\nG|---|\nD|---|\nA|---|\nE|---|';
    return <><TabScoreView document={s.document!} selection={s.selection!} activeCell={s.activeCell} focusedNoteId={null} extend={false}
        onSelect={selection => dispatch({ type: 'select', selection })} onActiveCellChange={cell => dispatch({ type: 'set-active-cell', cell })}
        onSetFret={change => dispatch({ type: 'set-fret', ...change })} onSetMute={change => dispatch({ type: 'set-mute', ...change })}
        onUndo={() => dispatch({ type: 'undo' })} onRedo={() => dispatch({ type: 'redo' })} onEdit={dispatch}
        onInsertMoment={afterId => dispatch({ type: 'insert-moment', afterId })} onDeleteMoments={momentIds => dispatch({ type: 'delete-moments', momentIds })}/>
        <button onClick={() => dispatch({ type: 'undo' })}>Undo fixture</button><button onClick={() => dispatch({ type: 'redo' })}>Redo fixture</button>
        <button onClick={() => dispatch({ type: 'set-frame', frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } })}>Change frame</button>
        <button onClick={() => { dispatch({ type: 'set-source', source, name: 'new.tab' }); dispatch({ type: 'parsed', result: parseAsciiTab(source) }); }}>Replace score</button>
        <output data-testid="state">{JSON.stringify({ document: s.document, past: s.past.length, active: s.activeCell, selection: s.selection })}</output></>;
}
const state = () => JSON.parse(screen.getByTestId('state').textContent!);
const cell = () => screen.getByRole('button', { name: /^String 1, onset 1,/ });
const check = () => screen.getByRole('button', { name: 'Check timing' });
const fret = () => screen.getByRole('textbox', { name: 'Fret for string 1, onset 1' }) as HTMLInputElement;
const start = () => screen.getByRole('textbox', { name: 'Start numerator' }) as HTMLInputElement;
const edit = () => screen.getByRole('button', { name: /Edit position 1/ });

describe('timing check and protected score navigation', () => {
    it('is opt-in, reports free timing without missing rows, and never edits history', async () => {
        const user = userEvent.setup(); render(<Harness/>); const before = state();
        expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        await user.click(check());
        expect(screen.getByText('Free timing · No notation issues')).toBeTruthy();
        expect(screen.queryByText(/Not supplied ·/)).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Close timing check' }));
        expect(state()).toEqual(before); expect(document.activeElement).toBe(check());
    });
    it('reveals completeness only on request and navigates with real focus and Escape return', async () => {
        const user = userEvent.setup(); render(<Harness initial={fixture(true)}/>); const before = state();
        await user.click(check()); await user.click(screen.getByText(/Not supplied ·/));
        const origin = screen.getByRole('button', { name: 'Bar 1 · Position 1 · String 1' });
        await user.click(origin);
        expect(document.activeElement).toBe(cell()); expect(screen.queryByRole('textbox', { name: /Fret for/ })).toBeNull();
        expect(state().document).toEqual(before.document); expect(state().past).toBe(0);
        await user.keyboard('{Escape}'); expect(document.activeElement).toBe(origin);
    });
    it('lets the position editor handle Escape before returning to a diagnostic', async () => {
        const user = userEvent.setup(); render(<Harness initial={fixture(true)}/>);
        await user.click(check()); await user.click(screen.getByText(/Not supplied ·/));
        const origin = screen.getByRole('button', { name: 'Bar 1 · Position 1 · String 1' });
        await user.click(origin); await user.click(edit()); await user.click(start());
        const before = state();
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('textbox', { name: 'Start numerator' })).toBeNull();
        expect(document.activeElement).toBe(edit());
        expect(edit().getAttribute('aria-expanded')).toBe('false');
        expect(state()).toEqual(before);
        await user.keyboard('{Escape}'); expect(document.activeElement).toBe(origin);
    });
    it('keeps scope explanation behind a disclosure while retaining concise state and counts', async () => {
        const user = userEvent.setup(); render(<Harness initial={fixture(true)}/>);
        await user.click(check());
        expect(screen.getByText('Timing incomplete · No notation issues')).toBeTruthy();
        const summary = screen.getByText('About this check');
        const details = summary.closest('details')!;
        expect(details.open).toBe(false);
        expect(details.textContent).toContain('Missing values are optional information');
        await user.click(summary); expect(details.open).toBe(true);
        await user.click(summary); expect(details.open).toBe(false);
        expect(screen.getByText(/Not supplied ·/).closest('details')!.open).toBe(false);
    });
    it.each(['12', '37'])('protects the %s fret draft from pointer and keyboard timing actions', async text => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(cell());
        await user.keyboard(text); const before = state();
        await user.click(check()); expect(fret().value).toBe(text); expect(document.activeElement).toBe(fret());
        expect(state()).toEqual(before); expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        fireEvent.keyDown(check(), { key: 'Enter' }); fireEvent.click(check());
        expect(state()).toEqual(before); expect(fret().value).toBe(text);
        await user.keyboard('{Escape}'); await user.click(check());
        expect(screen.getByRole('region', { name: 'Timing inspection' })).toBeTruthy();
    });
    it('requires a fresh check after an explicitly committed edit and undo, without resurrecting old targets', async () => {
        const user = userEvent.setup(); render(<Harness initial={fixture(true)}/>);
        await user.click(check()); await user.click(cell()); await user.keyboard('9{Enter}');
        expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        expect(check().getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByText('Score changed · Check again')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Undo fixture' }));
        expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        await user.click(check()); expect(screen.getByRole('region', { name: 'Timing inspection' })).toBeTruthy();
        expect(check().getAttribute('aria-expanded')).toBe('true');
        await user.click(screen.getByRole('button', { name: 'Redo fixture' }));
        expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        expect(check().getAttribute('aria-expanded')).toBe('false');
    });
    it.each(['Cancel start input', 'Set start'])('clears blocked guidance after explicit %s', async action => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(edit());
        await user.type(start(), '2'); await user.click(check());
        expect(screen.getByText('Finish or cancel this input first.')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: action }));
        expect(screen.queryByText('Finish or cancel this input first.')).toBeNull();
        expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        expect(state().document.moments[0].beatOffset).toEqual(action === 'Set start' ? { numerator: 2, denominator: 1 } : undefined);
    });
    it.each(['Enter', 'Escape'])('clears blocked guidance after explicit fret %s', async key => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(cell());
        await user.keyboard('12'); await user.click(check());
        expect(screen.getByText('Finish or cancel this input first.')).toBeTruthy();
        await user.keyboard(`{${key}}`);
        expect(screen.queryByText('Finish or cancel this input first.')).toBeNull();
        expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        expect(state().document.moments[0].notes[0].fret).toBe(key === 'Enter' ? 12 : 5);
    });
    it('retains an unapplied fraction and popup during pointer, blur and keyboard timing requests', async () => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(edit());
        await user.type(start(), '2'); const before = state();
        await user.click(check()); expect(start().value).toBe('2'); expect(document.activeElement).toBe(start());
        fireEvent.blur(start(), { relatedTarget: check() }); fireEvent.keyDown(check(), { key: ' ' }); fireEvent.click(check());
        expect(start().value).toBe('2'); expect(state()).toEqual(before);
        start().focus();
        for (let i = 0; i < 30 && document.activeElement !== check(); i++) await user.tab({ shift: true });
        expect(document.activeElement).toBe(check()); await user.keyboard('{Enter}');
        expect(start().value).toBe('2'); expect(state()).toEqual(before);
        await user.click(screen.getByRole('button', { name: 'Cancel start input' }));
        expect(start().value).toBe(''); await user.click(check());
        expect(screen.getByRole('region', { name: 'Timing inspection' })).toBeTruthy();
    });
    it('allows explicit Set start including normalized no-ops before inspection', async () => {
        const user = userEvent.setup(); const d = fixture(); d.moments[0].beatOffset = { numerator: 1, denominator: 2 };
        render(<Harness initial={d}/>); await user.click(edit());
        fireEvent.change(start(), { target: { value: '2' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Start denominator' }), { target: { value: '4' } });
        await user.click(screen.getByRole('button', { name: 'Set start' }));
        expect(start().value).toBe('1'); expect(state().past).toBe(0);
        await user.click(check()); expect(screen.getByRole('region', { name: 'Timing inspection' })).toBeTruthy();
    });
    it('keeps IME composition distinct from validity and does not run queued checks on composition end', async () => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(cell());
        fireEvent.compositionStart(fret()); fireEvent.change(fret(), { target: { value: '12' } });
        const before = state(); await user.click(check());
        expect(state()).toEqual(before); expect(fret().value).toBe('12');
        fireEvent.compositionEnd(fret());
        expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        await user.keyboard('{Enter}'); await user.click(check());
        expect(state().document.moments[0].notes[0].fret).toBe(12);
    });
    it('does not close the fraction editor or apply text on composing Escape or Set start', async () => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(edit());
        fireEvent.compositionStart(start()); fireEvent.change(start(), { target: { value: '1' } });
        fireEvent.keyDown(start(), { key: 'Escape', isComposing: true });
        fireEvent.click(screen.getByRole('button', { name: 'Set start' }));
        expect(state().document.moments[0].beatOffset).toBeUndefined();
        await user.click(check()); expect(start().value).toBe('1');
        fireEvent.compositionEnd(start()); expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
        await user.keyboard('{Escape}'); await user.click(check());
        expect(screen.getByRole('region', { name: 'Timing inspection' })).toBeTruthy();
    });
    it('keeps results for context changes but invalidates them for document replacement', async () => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(check());
        await user.click(screen.getByRole('button', { name: 'Change frame' }));
        expect(screen.getByRole('region', { name: 'Timing inspection' })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Replace score' }));
        expect(screen.queryByRole('region', { name: 'Timing inspection' })).toBeNull();
    });
    it('protects native and fractional drafts from an existing diagnostic navigation button', async () => {
        const user = userEvent.setup(); render(<Harness initial={fixture(true)}/>);
        await user.click(check()); await user.click(screen.getByText(/Not supplied ·/));
        const target = screen.getByRole('button', { name: 'Bar 1 · Position 3 · String 1' });
        await user.click(cell()); await user.keyboard('12'); const before = state();
        await user.click(target); expect(fret().value).toBe('12'); expect(state()).toEqual(before);
        await user.keyboard('{Escape}'); await user.click(edit()); await user.type(start(), '2');
        await user.click(target); expect(start().value).toBe('2'); expect(state().document).toEqual(before.document);
        await user.click(screen.getByRole('button', { name: 'Cancel start input' })); await user.click(target);
        expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^String 1, onset 3,/);
    });
});
