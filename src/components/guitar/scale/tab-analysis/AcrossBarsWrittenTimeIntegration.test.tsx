// @vitest-environment jsdom
import React, { useReducer } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyTabDocument, setTabBeatOffset, setTabDuration, setTabFret, setTabMeter } from '@/domain/tab/editing';
import { parseAsciiTab } from '@/domain/tab/ascii';
import * as projection from '@/domain/tab/written-time-across-bars';
import { createTabAnalysisState, reduceTabAnalysis } from '@/features/tab-analysis/state';
import type { TabDocument } from '@/domain/tab/types';
import { TabScoreView } from './TabScoreView';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const f = (numerator: number, denominator = 1) => ({ numerator, denominator });
function fixture(): TabDocument {
    let document = setTabMeter(createEmptyTabDocument(3, 3), { numerator: 4, denominator: 4 });
    for (const [index, id, start, length] of [[0, 'A', 9, 1], [1, 'B', 3, 3], [2, 'C', 0, 1]] as const) {
        const momentId = document.moments[index].id;
        document = setTabFret(document, momentId, 0, 5, id);
        document = setTabBeatOffset(document, momentId, f(start));
        document = setTabDuration(document, momentId, 0, f(length));
    }
    return document;
}
function Harness({ initial = fixture(), bar = 3 }: { initial?: TabDocument; bar?: number }) {
    const active = initial.moments.find(moment => moment.measure === bar) ?? initial.moments[0];
    const [state, dispatch] = useReducer(reduceTabAnalysis, undefined, () => ({ ...createTabAnalysisState(), document: initial,
        selection: { start: active.index, end: active.index }, activeCell: { momentId: active.id, string: 0 }, nextId: 100 }));
    const replacement = ['e|5|5|5|', 'B|-|-|-|', 'G|-|-|-|', 'D|-|-|-|', 'A|-|-|-|', 'E|-|-|-|'].join('\n');
    return <>
        <TabScoreView document={state.document!} selection={state.selection!} activeCell={state.activeCell}
            extend={false} focusedNoteId={null} onSelect={selection => dispatch({ type: 'select', selection })}
            onActiveCellChange={cell => dispatch({ type: 'set-active-cell', cell })} onSetFret={change => dispatch({ type: 'set-fret', ...change })}
            onSetMute={change => dispatch({ type: 'set-mute', ...change })} onEdit={dispatch}
            onUndo={() => dispatch({ type: 'undo' })} onRedo={() => dispatch({ type: 'redo' })}/>
        <button onClick={() => dispatch({ type: 'set-fret', momentId: state.document!.moments[0].id, string: 0, fret: 7 })}>Edit fixture</button>
        <button onClick={() => dispatch({ type: 'set-meter', meter: { numerator: 3, denominator: 4 } })}>Change meter</button>
        <button onClick={() => dispatch({ type: 'set-tuning', id: 'dadgad' })}>Retune fixture</button>
        <button onClick={() => dispatch({ type: 'set-capo', capo: 2 })}>Capo fixture</button>
        <button onClick={() => dispatch({ type: 'undo' })}>Undo fixture</button>
        <button onClick={() => dispatch({ type: 'redo' })}>Redo fixture</button>
        <button onClick={() => {
            dispatch({ type: 'set-source', source: replacement, name: 'replacement.tab' });
            dispatch({ type: 'parsed', result: parseAsciiTab(replacement) });
        }}>Replace score</button>
        <output data-testid="across-state">{JSON.stringify({ document: state.document, selection: state.selection, active: state.activeCell,
            past: state.past.length, future: state.future.length })}</output>
    </>;
}
const readState = () => JSON.parse(screen.getByTestId('across-state').textContent!);
const view = () => screen.getByRole('button', { name: 'View written time' });
const panel = () => screen.getByRole('region', { name: 'Written time' });
const local = () => screen.getByRole('button', { name: 'This bar' });
const across = () => screen.getByRole('button', { name: /^Across full bars/ });
const nextPoint = () => within(panel()).getByRole('button', { name: 'Next across-bars time point' });
const close = () => within(panel()).getByRole('button', { name: 'Close written time' });
const currentCell = () => screen.getByRole('button', { name: /^String 1, onset 3,/ });
const fret = () => screen.getByRole('textbox', { name: 'Fret for string 1, onset 3' }) as HTMLInputElement;
const edit = () => screen.getByRole('button', { name: /^Edit position 3,/ });
const start = () => screen.getByRole('textbox', { name: 'Start numerator' }) as HTMLInputElement;

describe('explicit regular-bar-origin view integration', () => {
    it('defaults to This bar and does not project across bars until the user explicitly selects it', async () => {
        const user = userEvent.setup(); const observe = vi.spyOn(projection, 'observeTabAcrossBarsWrittenTime'); render(<Harness/>);
        const before = readState(); await user.click(view());
        expect(local().getAttribute('aria-pressed')).toBe('true');
        expect(across().textContent).toBe('Across full bars · 4/4');
        expect(across().getAttribute('aria-pressed')).toBe('false');
        expect(observe).not.toHaveBeenCalled();
        expect(within(panel()).getByText('1 written note at this point')).toBeTruthy();
        const stableButton = across(); await user.click(stableButton);
        expect(observe).toHaveBeenCalledOnce();
        expect(across()).toBe(stableButton); expect(document.activeElement).toBe(stableButton);
        expect(across().getAttribute('aria-pressed')).toBe('true');
        expect(within(panel()).getByText('2 source notes at this point')).toBeTruthy();
        await user.click(nextPoint());
        expect(within(panel()).getByText('2 source notes at this point')).toBeTruthy();
        const sourceOrder = within(within(panel()).getByRole('list', { name: 'Across-bars written notes' })).getAllByRole('listitem');
        expect(sourceOrder.filter(row => row.hasAttribute('data-active')).map(row => within(row).getByText(/^Bar \d+ · Position/).textContent))
            .toEqual(['Bar 2 · Position 2 · String 1', 'Bar 1 · Position 1 · String 1']);
        expect(readState()).toEqual(before);
        await user.click(local());
        expect(local().getAttribute('aria-pressed')).toBe('true'); expect(document.activeElement).toBe(local());
        expect(within(panel()).getByText('1 written note at this point')).toBeTruthy(); expect(readState()).toEqual(before);
    });

    it('leaves local written timing available without a meter and disables only the across-bars mode', async () => {
        const user = userEvent.setup(); const initial = fixture(); delete initial.meter;
        const observe = vi.spyOn(projection, 'observeTabAcrossBarsWrittenTime'); render(<Harness initial={initial}/>);
        const before = readState(); await user.click(view());
        expect(within(panel()).getByText('Written timing')).toBeTruthy();
        expect(local().getAttribute('aria-pressed')).toBe('true'); expect((across() as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText('Set meter to compare bars')).toBeTruthy(); await user.click(across());
        expect(observe).not.toHaveBeenCalled(); expect(readState()).toEqual(before);
        await user.click(close()); expect(document.activeElement).toBe(view());
    });

    it('shows carry-in from an earlier bar even when This bar has no source notes', async () => {
        const user = userEvent.setup(); let initial = setTabMeter(createEmptyTabDocument(2, 2), { numerator: 4, denominator: 4 });
        const first = initial.moments[0].id;
        initial = setTabDuration(setTabBeatOffset(setTabFret(initial, first, 0, 5, 'carry'), first, f(0)), first, 0, f(5));
        render(<Harness initial={initial} bar={2}/>); const before = readState(); await user.click(view());
        expect(within(panel()).getByText('No written notes')).toBeTruthy(); await user.click(across());
        expect(within(panel()).getByText('1 source note at this point')).toBeTruthy();
        expect(within(panel()).queryByText('No written notes')).toBeNull(); expect(readState()).toEqual(before);
    });

    it.each(['12', '37'])('protects the %s native draft from both scope buttons without auto-committing or cancelling', async text => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(view()); await user.click(across());
        await user.click(currentCell()); await user.keyboard(text); const before = readState();
        await user.click(local()); expect(fret().value).toBe(text); expect(document.activeElement).toBe(fret());
        expect(across().getAttribute('aria-pressed')).toBe('true');
        fireEvent.keyDown(local(), { key: 'Enter' }); fireEvent.click(local());
        await user.click(nextPoint()); await user.click(close());
        expect(fret().value).toBe(text); expect(readState()).toEqual(before);
        expect(within(panel()).getByText('Point 1 of 4')).toBeTruthy();
        await user.keyboard('{Escape}'); await user.click(local());
        expect(local().getAttribute('aria-pressed')).toBe('true'); expect(readState()).toEqual(before);
        await user.click(currentCell()); await user.keyboard(text); await user.click(across());
        expect(fret().value).toBe(text); expect(local().getAttribute('aria-pressed')).toBe('true');
        expect(readState()).toEqual(before);
    });

    it('requires explicit fraction resolution after pointer, keyboard and IME attempts to change scope', async () => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(view()); await user.click(edit());
        fireEvent.compositionStart(start()); fireEvent.change(start(), { target: { value: '2' } });
        const before = readState(); await user.click(across());
        fireEvent.keyDown(across(), { key: ' ' }); fireEvent.click(across());
        expect(start().value).toBe('2'); expect(local().getAttribute('aria-pressed')).toBe('true'); expect(readState()).toEqual(before);
        fireEvent.compositionEnd(start()); expect(local().getAttribute('aria-pressed')).toBe('true');
        await user.click(screen.getByRole('button', { name: 'Cancel start input' })); await user.click(across());
        expect(across().getAttribute('aria-pressed')).toBe('true'); expect(readState()).toEqual(before);
        await user.click(edit()); fireEvent.compositionStart(start()); fireEvent.change(start(), { target: { value: '2' } });
        await user.click(local()); await user.click(nextPoint());
        expect(start().value).toBe('2'); expect(across().getAttribute('aria-pressed')).toBe('true');
        expect(within(panel()).getByText('Point 1 of 4')).toBeTruthy();
        fireEvent.compositionEnd(start()); expect(within(panel()).getByText('Point 1 of 4')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Cancel start input' })); expect(readState()).toEqual(before);
    });

    it('closes on Escape from persistent scope controls and always reopens in This bar', async () => {
        const user = userEvent.setup(); render(<Harness/>); const before = readState();
        await user.click(view()); await user.click(across()); expect(document.activeElement).toBe(across());
        await user.keyboard('{Escape}'); expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        expect(document.activeElement).toBe(view()); await user.click(view());
        expect(local().getAttribute('aria-pressed')).toBe('true');
        await user.click(across()); nextPoint().focus(); await user.keyboard('{Escape}');
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull(); expect(document.activeElement).toBe(view());
        expect(readState()).toEqual(before);
    });

    it.each(['Edit fixture', 'Change meter', 'Retune fixture', 'Capo fixture', 'Replace score', 'Undo fixture', 'Redo fixture'])(
        'invalidates the across-bars report after %s and never revives it through history', async action => {
            const user = userEvent.setup(); render(<Harness/>);
            if (action === 'Undo fixture' || action === 'Redo fixture') await user.click(screen.getByRole('button', { name: 'Edit fixture' }));
            if (action === 'Redo fixture') await user.click(screen.getByRole('button', { name: 'Undo fixture' }));
            await user.click(view()); await user.click(across());
            await user.click(screen.getByRole('button', { name: action }));
            expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull(); expect(view().getAttribute('aria-expanded')).toBe('false');
            if (action === 'Edit fixture') {
                await user.click(screen.getByRole('button', { name: 'Undo fixture' }));
                expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
            }
            await user.click(view()); expect(local().getAttribute('aria-pressed')).toBe('true');
            expect(across().getAttribute('aria-pressed')).toBe('false');
        });

    it('invalidates scope on an active-bar change and keeps Check timing independent', async () => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(view()); await user.click(across());
        await user.click(screen.getByRole('button', { name: 'Check timing' }));
        expect(screen.getByRole('region', { name: 'Timing inspection' })).toBeTruthy();
        expect(across().getAttribute('aria-pressed')).toBe('true');
        await user.click(screen.getByRole('button', { name: /^Onset 1, bar 1:/ }));
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        expect(screen.getByRole('region', { name: 'Timing inspection' })).toBeTruthy();
        await user.click(view()); expect(local().getAttribute('aria-pressed')).toBe('true');
        expect(within(panel()).getByRole('heading', { name: 'Bar 1' })).toBeTruthy();
    });
});
