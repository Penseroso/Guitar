// @vitest-environment jsdom
import React, { useReducer } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseAsciiTab } from '@/domain/tab/ascii';
import { createEmptyTabDocument, setTabBeatOffset, setTabDuration, setTabFret } from '@/domain/tab/editing';
import type { TabDocument } from '@/domain/tab/types';
import { createTabAnalysisState, reduceTabAnalysis, type TabAnalysisAction } from '@/features/tab-analysis/state';
import { TabScoreView } from './TabScoreView';

afterEach(cleanup);
const sourceFor = (body: string) => ['e', 'B', 'G', 'D', 'A', 'E']
    .map((label, index) => `${label}|${index === 0 ? body : body.replace(/[^|]/g, '-')}|`).join('\n');

function completeFixture(): TabDocument {
    const parsed = parseAsciiTab(sourceFor('0-3|8'));
    if (!parsed.ok) throw new Error('Invalid integration fixture');
    let document = parsed.document;
    for (const [index, moment] of document.moments.entries()) {
        document = setTabBeatOffset(document, moment.id, { numerator: index === 1 ? 1 : 0, denominator: 1 });
        document = setTabDuration(document, moment.id, 0, { numerator: 1, denominator: index === 2 ? 1 : 2 });
    }
    return document;
}

function denseFixture(): TabDocument {
    let document = createEmptyTabDocument(10);
    for (const [index, moment] of document.moments.entries()) {
        document = setTabFret(document, moment.id, 0, index, `dense-${index}`);
        document = setTabBeatOffset(document, moment.id, { numerator: index, denominator: 4 });
        document = setTabDuration(document, moment.id, 0, { numerator: 1, denominator: 4 });
    }
    return document;
}

function Harness({ initial = completeFixture() }: { initial?: TabDocument }) {
    const [state, dispatch] = useReducer(reduceTabAnalysis, undefined, () => ({
        ...createTabAnalysisState(), document: initial, source: initial.source, nextId: 100,
        selection: { start: 0, end: 0 }, activeCell: { momentId: initial.moments[0].id, string: 0 },
    }));
    const firstId = state.document!.moments[0].id;
    const action = (name: string, value: TabAnalysisAction) => <button type="button" onClick={() => dispatch(value)}>{name}</button>;
    return <>
        <TabScoreView document={state.document!} selection={state.selection!} activeCell={state.activeCell}
            extend={false} focusedNoteId={null} onSelect={selection => dispatch({ type: 'select', selection })}
            onActiveCellChange={cell => dispatch({ type: 'set-active-cell', cell })}
            onSetFret={change => dispatch({ type: 'set-fret', ...change })}
            onSetMute={change => dispatch({ type: 'set-mute', ...change })} onEdit={dispatch}
            onUndo={() => dispatch({ type: 'undo' })} onRedo={() => dispatch({ type: 'redo' })}
            onInsertMoment={afterId => dispatch({ type: 'insert-moment', afterId })}
            onDeleteMoments={momentIds => dispatch({ type: 'delete-moments', momentIds })} />
        {action('Edit fixture note', { type: 'set-fret', momentId: firstId, string: 0, fret: 9 })}
        {action('Undo fixture', { type: 'undo' })}{action('Redo fixture', { type: 'redo' })}
        {action('Retune fixture', { type: 'set-tuning', id: 'dadgad' })}
        {action('Capo fixture', { type: 'set-capo', capo: 2 })}
        {action('Change frame', { type: 'set-frame', frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } })}
        <button type="button" onClick={() => {
            const source = sourceFor('9-11|8');
            dispatch({ type: 'set-source', source, name: 'replacement.tab' });
            dispatch({ type: 'parsed', result: parseAsciiTab(source) });
        }}>Replace score</button>
        <output data-testid="written-integration-state">{JSON.stringify({
            document: state.document, selection: state.selection, active: state.activeCell,
            past: state.past.length, future: state.future.length,
        })}</output>
    </>;
}

const readState = () => JSON.parse(screen.getByTestId('written-integration-state').textContent!);
const view = () => screen.getByRole('button', { name: 'View written time' });
const panel = () => screen.getByRole('region', { name: 'Written time' });
const firstCell = () => screen.getByRole('button', { name: /^String 1, onset 1,/ });
const fret = () => screen.getByRole('textbox', { name: 'Fret for string 1, onset 1' }) as HTMLInputElement;
const edit = () => screen.getByRole('button', { name: /^Edit position 1,/ });
const start = () => screen.getByRole('textbox', { name: 'Start numerator' }) as HTMLInputElement;
const nextPoint = () => within(panel()).getByRole('button', { name: 'Next written time point' });
const close = () => within(panel()).getByRole('button', { name: 'Close written time' });

describe('written-time view integration with the canonical TAB editor', () => {
    it('is opt-in and treats complete empty note ownership as no written notes, without a sounding claim', async () => {
        const user = userEvent.setup(); render(<Harness initial={createEmptyTabDocument()}/>);
        const before = readState();
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        expect(view().getAttribute('aria-expanded')).toBe('false');
        await user.click(view());
        expect(within(panel()).getByText('No written notes')).toBeTruthy();
        expect(within(panel()).queryByRole('button', { name: 'Next written time point' })).toBeNull();
        expect(readState()).toEqual(before);
        await user.click(close());
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        expect(document.activeElement).toBe(view());
        expect(view().getAttribute('aria-expanded')).toBe('false');
        expect(readState()).toEqual(before);
    });

    it('queries exact half-open endpoints and a known in-range gap without editing the score or selection', async () => {
        const user = userEvent.setup(); render(<Harness/>); const before = readState();
        await user.click(view());
        expect(within(panel()).getByText('1 written note at this point')).toBeTruthy();
        await user.click(within(panel()).getByText('Details', { exact: true }));
        expect(within(panel()).getByText('Current point · 0/1')).toBeTruthy();
        await user.click(nextPoint());
        expect(within(panel()).getByText('No written notes at this point')).toBeTruthy();
        expect(within(panel()).getByText('Current point · 1/2')).toBeTruthy();
        await user.click(nextPoint());
        expect(within(panel()).getByText('1 written note at this point')).toBeTruthy();
        await user.click(nextPoint());
        expect(within(panel()).getByText('Outside observed range')).toBeTruthy();
        expect(within(panel()).queryByText('No written notes at this point')).toBeNull();
        expect(readState()).toEqual(before);
        await user.click(close()); expect(document.activeElement).toBe(view());
        expect(readState()).toEqual(before);
    });

    it('retains known intervals in a partial view and never offers a complete active-note query', async () => {
        const user = userEvent.setup(); const initial = completeFixture();
        delete initial.moments[1].notes[0].duration;
        render(<Harness initial={initial}/>); const before = readState(); await user.click(view());
        expect(within(panel()).getByText('1 of 2 notes timed')).toBeTruthy();
        expect(within(within(panel()).getByRole('list', { name: 'Written notes' })).getAllByRole('listitem')).toHaveLength(1);
        expect(within(panel()).queryByRole('button', { name: 'Next written time point' })).toBeNull();
        expect(within(panel()).queryByText(/written note[s]? at this point/)).toBeNull();
        expect(readState()).toEqual(before);
    });

    it('pages interval details without adding history or moving the score selection', async () => {
        const user = userEvent.setup(); render(<Harness initial={denseFixture()}/>); const before = readState();
        await user.click(view());
        const next = within(panel()).getByRole('button', { name: 'Next written notes page' });
        const previous = within(panel()).getByRole('button', { name: 'Previous written notes page' });
        expect(within(within(panel()).getByRole('list', { name: 'Written notes' })).getAllByRole('listitem')).toHaveLength(8);
        expect((previous as HTMLButtonElement).disabled).toBe(true);
        await user.click(next);
        expect(within(within(panel()).getByRole('list', { name: 'Written notes' })).getAllByRole('listitem')).toHaveLength(2);
        expect((next as HTMLButtonElement).disabled).toBe(true);
        expect((previous as HTMLButtonElement).disabled).toBe(false);
        await user.click(previous);
        expect((previous as HTMLButtonElement).disabled).toBe(true);
        expect(readState()).toEqual(before);
    });

    it.each(['12', '37'])('protects the %s fret draft from View and actions in an existing written-time panel', async text => {
        const user = userEvent.setup(); render(<Harness/>);
        await user.click(firstCell()); await user.keyboard(text); const before = readState();
        await user.click(view());
        expect(fret().value).toBe(text); expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        fireEvent.keyDown(view(), { key: 'Enter' }); fireEvent.click(view());
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        await user.keyboard('{Escape}'); await user.click(view());
        await user.click(firstCell()); await user.keyboard(text);
        await user.click(view()); expect(fret().value).toBe(text); expect(document.activeElement).toBe(fret());
        await user.click(nextPoint());
        expect(within(panel()).getByText('1 written note at this point')).toBeTruthy();
        expect(fret().value).toBe(text); expect(document.activeElement).toBe(fret());
        await user.click(close()); expect(screen.getByRole('region', { name: 'Written time' })).toBeTruthy();
        fireEvent.keyDown(view(), { key: 'Enter' }); fireEvent.click(view());
        expect(fret().value).toBe(text); expect(readState()).toEqual(before);
        await user.keyboard('{Escape}'); expect(screen.queryByRole('textbox', { name: /Fret for/ })).toBeNull();
        expect(readState().document).toEqual(before.document);
    });

    it('preserves unapplied fractions through pointer and native Shift+Tab/Enter requests before explicit cancellation', async () => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(edit());
        await user.clear(start()); await user.type(start(), '2'); const before = readState();
        await user.click(view()); expect(start().value).toBe('2'); expect(document.activeElement).toBe(start());
        for (let index = 0; index < 60 && document.activeElement !== view(); index++) await user.tab({ shift: true });
        expect(document.activeElement).toBe(view()); await user.keyboard('{Enter}');
        expect(start().value).toBe('2'); expect(readState()).toEqual(before);
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Cancel start input' }));
        expect(start().value).toBe('0'); await user.click(view());
        expect(panel()).toBeTruthy(); expect(readState()).toEqual(before);
    });

    it('does not queue View or move the point during fret or fractional IME composition', async () => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(firstCell());
        fireEvent.compositionStart(fret()); fireEvent.change(fret(), { target: { value: '12' } });
        const before = readState(); await user.click(view());
        expect(fret().value).toBe('12'); expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        fireEvent.compositionEnd(fret()); expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        await user.keyboard('{Escape}'); await user.click(view()); await user.click(edit());
        fireEvent.compositionStart(start()); fireEvent.change(start(), { target: { value: '2' } });
        await user.click(nextPoint());
        expect(start().value).toBe('2'); expect(within(panel()).getByText('1 written note at this point')).toBeTruthy();
        fireEvent.compositionEnd(start());
        expect(within(panel()).getByText('1 written note at this point')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Cancel start input' }));
        expect(readState()).toEqual(before);
    });

    it.each(['Edit fixture note', 'Replace score', 'Retune fixture', 'Capo fixture', 'Undo fixture', 'Redo fixture'])(
        'invalidates the document snapshot after %s and requires an explicit new view', async action => {
            const user = userEvent.setup(); render(<Harness/>);
            if (action === 'Undo fixture' || action === 'Redo fixture') await user.click(screen.getByRole('button', { name: 'Edit fixture note' }));
            if (action === 'Redo fixture') await user.click(screen.getByRole('button', { name: 'Undo fixture' }));
            await user.click(view()); expect(view().getAttribute('aria-expanded')).toBe('true');
            await user.click(screen.getByRole('button', { name: action }));
            expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
            expect(view().getAttribute('aria-expanded')).toBe('false');
            // Restoring the previous document through history cannot resurrect a closed result.
            if (action === 'Edit fixture note') {
                await user.click(screen.getByRole('button', { name: 'Undo fixture' }));
                expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
            }
            await user.click(view()); expect(panel()).toBeTruthy();
            expect(view().getAttribute('aria-expanded')).toBe('true');
        },
    );

    it('keeps a view across a tonal-reference change but closes on active-bar changes', async () => {
        const user = userEvent.setup(); render(<Harness/>); await user.click(view());
        await user.click(screen.getByRole('button', { name: 'Change frame' }));
        expect(panel()).toBeTruthy(); expect(view().getAttribute('aria-expanded')).toBe('true');
        await user.click(screen.getByRole('button', { name: /^Onset 3, bar 2:/ }));
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        expect(view().getAttribute('aria-expanded')).toBe('false');
        await user.click(view());
        expect(within(panel()).getByRole('heading', { name: 'Bar 2' })).toBeTruthy();
        expect(within(panel()).getByText('Position 3 · String 1')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: /^Onset 1, bar 1:/ }));
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        await user.click(view()); expect(panel()).toBeTruthy();
    });

    it('closes on Escape from panel controls and returns focus to the explicit View action', async () => {
        const user = userEvent.setup(); render(<Harness/>); const before = readState();
        await user.click(view()); nextPoint().focus(); await user.keyboard('{Escape}');
        expect(screen.queryByRole('region', { name: 'Written time' })).toBeNull();
        expect(document.activeElement).toBe(view()); expect(readState()).toEqual(before);
    });
});
