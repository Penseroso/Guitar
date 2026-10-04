// @vitest-environment jsdom
import React, { useReducer, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseAsciiTab } from '@/domain/tab/ascii';
import type { TabDocument, TabSelection } from '@/domain/tab/types';
import type { TabScoreAnnotation } from '@/domain/tab/annotations';
import { createTabAnalysisState, reduceTabAnalysis } from '@/features/tab-analysis/state';
import { TabScoreView, type TabActiveCell } from './TabScoreView';

const edited = vi.fn(), muted = vi.fn(), undo = vi.fn(), redo = vi.fn(), insert = vi.fn(), deleteColumns = vi.fn();
function fixture(): TabDocument {
    const result = parseAsciiTab(['e|5-6-7|', 'B|-----|', 'G|-----|', 'D|-----|', 'A|-----|', 'E|-----|'].join('\n'));
    if (!result.ok) throw new Error('Invalid fixture');
    return { ...result.document, moments: result.document.moments.map((moment, index) => index === 1 ? { ...moment, notes: [] } : moment) };
}
function Harness({ extend = false, initialScore, annotations, muteEditing = false, onDraftStatusChange }: { extend?: boolean; initialScore?: TabDocument; annotations?: TabScoreAnnotation[]; muteEditing?: boolean; onDraftStatusChange?: React.ComponentProps<typeof TabScoreView>['onDraftStatusChange'] }) {
    const [score, setScore] = useState(() => initialScore ?? fixture());
    const [active, setActive] = useState<TabActiveCell>({ momentId: 'moment-0', string: 0 });
    const [selection, setSelection] = useState<TabSelection>({ start: 0, end: 0 });
    return <><button>Before score</button><TabScoreView document={score} activeCell={active} onActiveCellChange={setActive}
        selection={selection} onSelect={next => setSelection({ start: Math.min(next.start, next.end), end: Math.max(next.start, next.end) })}
        extend={extend} focusedNoteId={null} annotations={annotations} onDraftStatusChange={onDraftStatusChange}
        onSetMute={muteEditing ? change => {
            muted(change);
            setScore(previous => ({ ...previous, moments: previous.moments.map(moment => moment.id === change.momentId ? {
                ...moment, notes: moment.notes.filter(note => note.string !== change.string),
                mutes: [...(moment.mutes ?? []).filter(mute => mute.string !== change.string), ...(change.enabled ? [{ string: change.string }] : [])],
            } : moment) }));
        } : undefined}
        onInsertMoment={insert} onDeleteMoments={deleteColumns} onUndo={undo} onRedo={redo} onSetFret={change => {
            edited(change);
            setScore(previous => ({ ...previous, moments: previous.moments.map(moment => {
                if (moment.id !== change.momentId) return moment;
                const notes = moment.notes.filter(note => note.string !== change.string);
                const midi = previous.tuningMidi[change.string] + previous.capo + (change.fret ?? 0);
                if (change.fret !== null) notes.push({ id: `edited-${moment.id}-${change.string}`, fret: change.fret, string: change.string, midi, pitchClass: midi % 12, source: { line: 1, column: 1 } });
                return { ...moment, notes, mutes: moment.mutes?.filter(mute => mute.string !== change.string) };
            }) }));
        }} /><button>After score</button><output data-testid="selection">{selection.start}:{selection.end}</output></>;
}
const cell = (string: number, onset: number) => screen.getByRole('button', { name: new RegExp(`^String ${string}, onset ${onset},`) });
const editor = () => screen.getByRole('textbox') as HTMLInputElement;
const header = (onset: number) => screen.getByRole('button', { name: new RegExp(`^Onset ${onset}, bar`) });
function ReducerHarness() {
    const [state, dispatch] = useReducer(reduceTabAnalysis, undefined, createTabAnalysisState);
    return <TabScoreView document={state.document!} selection={state.selection!} activeCell={state.activeCell}
        extend={false} focusedNoteId={null} onSelect={selection => dispatch({ type: 'select', selection })}
        onActiveCellChange={cell => dispatch({ type: 'set-active-cell', cell })}
        onSetFret={change => dispatch({ type: 'set-fret', ...change })} onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })} onInsertMoment={afterId => dispatch({ type: 'insert-moment', afterId })}
        onDeleteMoments={momentIds => { deleteColumns(momentIds); dispatch({ type: 'delete-moments', momentIds }); }} />;
}
const touchPointer = (type: string, target: HTMLElement, x = 25, y = 20, pointerType = 'touch') => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 7 }, pointerType: { value: pointerType } });
    fireEvent(target, event);
};
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

describe('editable tab score', () => {
    it.each(['x', 'X'])('commits %s as a mute rather than a numeric pitch and permits numeric replacement', async token => {
        const user = userEvent.setup(), status = vi.fn();
        render(<Harness muteEditing onDraftStatusChange={status} />);
        cell(1, 1).focus();
        await user.keyboard(`${token}{Enter}`);
        expect(muted).toHaveBeenLastCalledWith({ momentId: 'moment-0', string: 0, enabled: true });
        expect(edited).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith('mute');
        expect(cell(1, 1).getAttribute('aria-label')).toBe('String 1, onset 1, muted x');
        await user.click(cell(1, 1));
        expect(editor().value).toBe('x');
        expect(editor().getAttribute('inputmode')).toBe('numeric');
        await user.keyboard('12{Enter}');
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-0', string: 0, fret: 12 });
        expect(cell(1, 1).getAttribute('aria-label')).toBe('String 1, onset 1, fret 12');
    });

    it('clears a mute through the existing cell clear callback', async () => {
        const user = userEvent.setup(), score = fixture();
        score.moments[1].mutes = [{ string: 2 }];
        render(<Harness muteEditing initialScore={score} />);
        cell(3, 2).focus();
        await user.keyboard('{Delete}');
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-1', string: 2, fret: null });
        expect(cell(3, 2).getAttribute('aria-label')).toBe('String 3, onset 2, empty');
    });

    it('distinguishes explicit rests, muted strings, and tied notes without creating attacks', () => {
        const score = fixture(), source = score.moments[0].notes[0];
        score.moments[1].sustains = [{ noteId: source.id, duration: { numerator: 2, denominator: 1 } }];
        score.moments[1].mutes = [{ string: 1 }];
        score.moments[2] = { ...score.moments[2], notes: [], rest: { duration: { numerator: 1, denominator: 2 } } };
        render(<Harness initialScore={score} />);
        expect(cell(1, 2).getAttribute('aria-label')).toContain('tied fret 5; duration 2/1 quarter notes');
        expect(cell(1, 2).textContent).toBe('⌒5');
        expect(cell(2, 2).getAttribute('aria-label')).toContain('muted x');
        expect(cell(1, 3).textContent).toBe('R');
        expect(cell(2, 3).getAttribute('aria-label')).toContain('rest');
        expect(header(2).getAttribute('aria-label')).toContain('tied fret 5');
        expect(header(3).getAttribute('aria-label')).toContain('rest, duration 1/2 quarter notes');
        expect(score.moments[1].notes).toHaveLength(0);
        expect(score.moments[2].notes).toHaveLength(0);
    });

    it('keeps rest and sustain metadata when their empty editor is opened and left unchanged', async () => {
        const user = userEvent.setup(), score = fixture();
        score.moments[1].sustains = [{ noteId: score.moments[0].notes[0].id }];
        score.moments[2] = { ...score.moments[2], notes: [], rest: {} };
        render(<Harness initialScore={score} />);
        await user.click(cell(1, 2));
        await user.click(cell(1, 3));
        await user.click(screen.getByRole('button', { name: 'After score' }));
        expect(edited).not.toHaveBeenCalled();
        expect(cell(1, 2).getAttribute('aria-label')).toContain('tied fret 5');
        expect(cell(1, 3).getAttribute('aria-label')).toContain('rest');
        cell(1, 2).focus();
        await user.keyboard('{Delete}');
        expect(edited).toHaveBeenCalledWith({ momentId: 'moment-1', string: 0, fret: null });
    });

    it('preserves chord note durations and exposes imported technique metadata separately from frets', () => {
        const score = fixture(), source = score.moments[0].notes[0], target = score.moments[2].notes[0];
        source.duration = { numerator: 1, denominator: 2 };
        source.techniques = [{ kind: 'hammer-on', toNoteId: target.id }, { kind: 'pull-off', toNoteId: target.id },
            { kind: 'slide', toNoteId: target.id }, { kind: 'bend', targetFret: 9, notation: 'b9' },
            { kind: 'release', targetFret: 5, notation: 'r5' }, { kind: 'vibrato', notation: '~~' }];
        score.moments[0].notes.push({ ...source, id: 'chord-note', string: 1, fret: 3, techniques: [], duration: { numerator: 3, denominator: 1 } });
        render(<Harness initialScore={score} />);
        expect(cell(1, 1).getAttribute('aria-label')).toContain('fret 5; duration 1/2 quarter notes');
        expect(cell(1, 1).getAttribute('title')).toContain('hammer-on to fret 7');
        expect(cell(1, 1).getAttribute('title')).toContain('pull-off to fret 7');
        expect(cell(1, 1).getAttribute('title')).toContain('slide to fret 7');
        expect(cell(1, 1).getAttribute('title')).toContain('bend target fret-equivalent 9; not a new attack');
        expect(cell(1, 1).getAttribute('title')).toContain('release target fret-equivalent 5');
        expect(cell(1, 1).getAttribute('title')).toContain('vibrato ~~');
        expect(cell(2, 1).getAttribute('aria-label')).toContain('duration 3/1 quarter notes');
        expect(score.moments[0].notes).toHaveLength(2);
        expect(score.moments[0].notes[0].fret).toBe(5);
    });

    it('offers one roving cell across six rows, including empty onsets', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const grid = screen.getByRole('grid', { name: 'Editable tab' });
        expect(within(grid).getAllByRole('row')).toHaveLength(6);
        expect(within(grid).getAllByRole('gridcell')).toHaveLength(18);
        expect(within(grid).getAllByRole('button').filter(button => button.tabIndex === 0)).toHaveLength(1);
        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Before score' }));
        await user.tab();
        expect(document.activeElement).toBe(cell(1, 1));
        await user.keyboard('{ArrowRight}{ArrowDown}');
        expect(document.activeElement).toBe(cell(2, 2));
        expect(screen.getByTestId('selection').textContent).toBe('1:1');
    });

    it.each(['10', '12', '24'])('replaces the old fret with the first digit and appends the second digit for %s', async (fret) => {
        const user = userEvent.setup();
        render(<Harness />);
        cell(1, 1).focus();
        await user.keyboard(fret[0]);
        expect(editor().value).toBe(fret[0]);
        await user.keyboard(fret[1]);
        expect(editor().value).toBe(fret);
        expect(edited).not.toHaveBeenCalled();
        await user.keyboard('{Enter}');
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-0', string: 0, fret: Number(fret) });
        expect(document.activeElement).toBe(cell(1, 2));
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('opens a numeric native input on click with the old fret selected, including paste and mobile input', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(cell(1, 1));
        expect(editor().getAttribute('inputmode')).toBe('numeric');
        expect([editor().selectionStart, editor().selectionEnd]).toEqual([0, 1]);
        await user.paste('12');
        expect(editor().value).toBe('12');
        await user.keyboard('{Enter}');
        await user.click(cell(6, 2));
        fireEvent.input(editor(), { target: { value: '0' } });
        await user.keyboard('{Enter}');
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-1', string: 5, fret: 0 });
    });

    it('commits before moving to the next column or string', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        cell(1, 1).focus();
        await user.keyboard('12{ArrowRight}');
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-0', string: 0, fret: 12 });
        expect(document.activeElement).toBe(cell(1, 2));
        await user.keyboard('7{ArrowDown}');
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-1', string: 0, fret: 7 });
        expect(document.activeElement).toBe(cell(2, 2));
    });

    it('cancels with Escape and distinguishes draft backspace from cell clearing', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        cell(1, 1).focus();
        await user.keyboard('12{Backspace}');
        expect(editor().value).toBe('1');
        await user.keyboard('{Escape}');
        expect(edited).not.toHaveBeenCalled();
        expect(cell(1, 1).getAttribute('aria-label')).toContain('fret 5');
        await user.keyboard('{Backspace}');
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-0', string: 0, fret: null });
        await user.keyboard('24{Enter}');
        await user.click(cell(1, 1));
        await user.keyboard('{Delete}');
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-0', string: 0, fret: null });
    });

    it.each(['37', '-1', '1.5', 'word'])('blocks invalid %s without losing the draft or moving focus', async (value) => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(cell(1, 1));
        fireEvent.change(editor(), { target: { value } });
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('alert').textContent).toContain('0–36');
        expect(editor().value).toBe(value);
        expect(document.activeElement).toBe(editor());
        expect(edited).not.toHaveBeenCalled();
        await user.tab();
        expect(document.activeElement).toBe(editor());
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('commits with Tab and exits the whole grid in either direction', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(cell(2, 2));
        await user.keyboard('12');
        await user.tab();
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-1', string: 1, fret: 12 });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After score' }));
        await user.tab({ shift: true });
        expect(document.activeElement).toBe(cell(2, 2));
        await user.keyboard('7');
        await user.tab({ shift: true });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Before score' }));
    });

    it('does not commit or navigate while IME composition is active', () => {
        render(<Harness />);
        fireEvent.click(cell(1, 1));
        const input = editor();
        fireEvent.compositionStart(input);
        fireEvent.change(input, { target: { value: '12' } });
        fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
        fireEvent.keyDown(input, { key: 'ArrowDown', isComposing: true });
        expect(edited).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(input);
        fireEvent.compositionEnd(input);
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(edited).toHaveBeenLastCalledWith({ momentId: 'moment-0', string: 0, fret: 12 });
    });

    it('keeps a stable selection anchor when reversing Shift-arrow direction', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: /^Onset 2, bar 1:/ }));
        await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');
        expect(screen.getByTestId('selection').textContent).toBe('0:1');
        await user.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}');
        expect(screen.getByTestId('selection').textContent).toBe('1:2');
    });

    it('routes undo and redo outside a draft, leaving native text undo alone', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        cell(1, 1).focus();
        await user.keyboard('{Control>}z{/Control}{Control>}{Shift>}z{/Shift}{/Control}{Meta>}z{/Meta}');
        expect(undo).toHaveBeenCalledTimes(2);
        expect(redo).toHaveBeenCalledTimes(1);
        await user.keyboard('12{Control>}z{/Control}');
        expect(undo).toHaveBeenCalledTimes(2);
    });

    it('groups four measures per system without limiting positions in a measure, preserving empty measures', () => {
        const score = fixture();
        const denseMoments = Array.from({ length: 7 }, (_, index) => ({ ...score.moments[0], id: `moment-${index}`, index, notes: [], measure: 1 }));
        render(<Harness initialScore={{ ...score, measureCount: 5, moments: denseMoments }} />);
        expect(screen.getByRole('region', { name: 'Tab score — bars 1–4' })).toBeTruthy();
        expect(screen.getByRole('region', { name: 'Tab score — bars 5–5' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /^Onset 7, bar 1:/ })).toBeTruthy();
        expect(screen.getAllByRole('gridcell', { name: 'Empty bar 5' })).toHaveLength(6);
        expect(screen.getAllByRole('grid')).toHaveLength(2);
    });

    it('opens analysis evidence near the score and keeps it closed initially', async () => {
        const user = userEvent.setup();
        render(<Harness annotations={[{ id: 'arpeggio-0', kind: 'arpeggio', start: 0, end: 2,
            startMomentId: 'moment-0', endMomentId: 'moment-2', label: 'C arpeggio', detail: 'A pitch collection candidate.',
            source: 'candidate', placement: 'below' }]} />);
        expect(screen.queryByRole('note', { name: 'Annotation detail' })).toBeNull();
        await user.click(screen.getByRole('button', { name: 'C arpeggio, arpeggio annotation' }));
        expect(screen.getByRole('note', { name: 'Annotation detail' }).textContent).toContain('A pitch collection candidate.');
        await user.click(screen.getByRole('button', { name: 'Close annotation detail' }));
        expect(screen.queryByRole('note', { name: 'Annotation detail' })).toBeNull();
    });

    it('packs disjoint annotations in score order while preserving overlap and visible uncertainty', () => {
        const annotation = (id: string, start: number, end: number): TabScoreAnnotation => ({
            id, start, end, kind: 'arpeggio', startMomentId: `moment-${start}`, endMomentId: `moment-${end}`,
            label: `${id}?`, detail: `Evidence for ${id}`, source: 'candidate', placement: 'above',
        });
        render(<Harness annotations={[annotation('Last', 2, 2), annotation('First', 0, 0), annotation('Middle', 1, 1), annotation('Across', 0, 2)]} />);
        const first = screen.getByRole('button', { name: 'First?, arpeggio annotation' });
        const middle = screen.getByRole('button', { name: 'Middle?, arpeggio annotation' });
        const last = screen.getByRole('button', { name: 'Last?, arpeggio annotation' });
        const across = screen.getByRole('button', { name: 'Across?, arpeggio annotation' });
        expect(first.style.gridRow).toBe(middle.style.gridRow);
        expect(middle.style.gridRow).toBe(last.style.gridRow);
        expect(across.style.gridRow).not.toBe(first.style.gridRow);
        expect(within(first).getByLabelText('Candidate').textContent).toBe('?');
        expect(first.querySelector('span')?.textContent).toBe('First');
    });

    it('offers insertion at the focused score position with the Insert key', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        cell(1, 1).focus();
        await user.keyboard('{Insert}');
        expect(insert).toHaveBeenCalledWith('moment-0');
    });

    it('inserts directly between columns without opening a fret draft', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: 'Insert position after onset 2' }));
        expect(insert).toHaveBeenCalledWith('moment-1');
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('deletes whole columns from headers while cell Delete only clears one note', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(header(1));
        expect(document.activeElement).toBe(header(1));
        await user.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}{Delete}');
        expect(deleteColumns).toHaveBeenCalledWith(['moment-0', 'moment-1', 'moment-2']);
        expect(edited).not.toHaveBeenCalled();
        await user.keyboard('{Enter}{Delete}');
        expect(edited).toHaveBeenCalledWith({ momentId: 'moment-2', string: 0, fret: null });
        expect(deleteColumns).toHaveBeenCalledTimes(1);
    });

    it('selects ranges by dragging column headers, retaining the range after pointer release', async () => {
        render(<Harness />);
        for (let index = 1; index <= 3; index++) {
            vi.spyOn(header(index), 'getBoundingClientRect').mockReturnValue({ left: (index - 1) * 50, right: index * 50, top: 0, bottom: 44, width: 50, height: 44, x: (index - 1) * 50, y: 0, toJSON: () => ({}) });
        }
        // jsdom lacks PointerEvent; provide the pointer coordinates as native event fields.
        const pointer = (type: string, x: number) => {
            const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 20 });
            Object.defineProperty(event, 'pointerId', { value: 1 });
            fireEvent(header(1), event);
        };
        pointer('pointerdown', 25);
        pointer('pointermove', 125);
        pointer('pointerup', 125);
        fireEvent.click(header(1));
        expect(screen.getByTestId('selection').textContent).toBe('0:2');
        fireEvent.keyDown(header(3), { key: 'Backspace' });
        expect(deleteColumns).toHaveBeenCalledWith(['moment-0', 'moment-1', 'moment-2']);
    });

    it('reaches the column header from the top string and returns to the note with Enter', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        cell(1, 1).focus();
        await user.keyboard('{ArrowUp}{ArrowRight}{Insert}');
        expect(document.activeElement).toBe(header(2));
        expect(insert).toHaveBeenCalledWith('moment-1');
        await user.keyboard('{Enter}');
        expect(document.activeElement).toBe(cell(1, 2));
    });

    it('blocks inline insertion and header selection while a fret draft is invalid', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(cell(1, 1));
        fireEvent.change(editor(), { target: { value: '99' } });
        await user.click(screen.getByRole('button', { name: 'Insert position after onset 2' }));
        await user.click(header(3));
        expect(editor().value).toBe('99');
        expect(document.activeElement).toBe(editor());
        expect(screen.getByTestId('selection').textContent).toBe('0:0');
        expect(insert).not.toHaveBeenCalled();
        expect(edited).not.toHaveBeenCalled();
    });

    it('keeps focus on the retained measure position so consecutive Delete targets the focused column', async () => {
        const user = userEvent.setup();
        render(<ReducerHarness />);
        await user.click(header(1));
        await user.keyboard('{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}{Delete}');
        expect(document.activeElement).toBe(header(1));
        expect(header(1).getAttribute('aria-pressed')).toBe('true');
        await user.keyboard('{Delete}');
        expect(deleteColumns).toHaveBeenLastCalledWith(['edit-moment-0']);
        await user.keyboard('{ArrowRight}{Delete}');
        expect(deleteColumns).toHaveBeenLastCalledWith(['edit-moment-4']);
        expect(document.activeElement).toBe(header(2));
        expect(header(2).getAttribute('aria-pressed')).toBe('true');
    });

    it('opens the inserted position immediately on the same string for direct typing', async () => {
        const user = userEvent.setup();
        render(<ReducerHarness />);
        await user.click(cell(3, 1));
        await user.keyboard('7{Enter}');
        await user.click(screen.getByRole('button', { name: 'Insert position after onset 1' }));
        expect(editor().getAttribute('aria-label')).toBe('Fret for string 3, onset 2');
        expect(document.activeElement).toBe(editor());
        await user.keyboard('12{Enter}');
        expect(cell(3, 2).getAttribute('aria-label')).toContain('fret 12');
        expect(document.activeElement).toBe(cell(3, 3));
        await user.keyboard('{Insert}');
        expect(editor().getAttribute('aria-label')).toBe('Fret for string 3, onset 4');
    });

    it('shows no delete control on ordinary clicks or mouse holds', () => {
        vi.useFakeTimers();
        render(<Harness />);
        fireEvent.click(header(1));
        expect(screen.queryByRole('button', { name: 'Delete selected columns' })).toBeNull();
        touchPointer('pointerdown', header(1), 25, 20, 'mouse');
        act(() => vi.advanceTimersByTime(800));
        expect(screen.queryByRole('button', { name: 'Delete selected columns' })).toBeNull();
        touchPointer('pointerup', header(1), 25, 20, 'mouse');
        touchPointer('pointerdown', header(2));
        touchPointer('pointerup', header(2));
        act(() => vi.advanceTimersByTime(800));
        expect(screen.queryByRole('button', { name: 'Delete selected columns' })).toBeNull();
    });

    it('opens a touch-only trash popover after a long press and suppresses the release click', () => {
        vi.useFakeTimers();
        render(<Harness />);
        touchPointer('pointerdown', header(2));
        expect(fireEvent.contextMenu(header(2))).toBe(false);
        act(() => vi.advanceTimersByTime(549));
        expect(screen.queryByRole('group', { name: 'Column actions' })).toBeNull();
        act(() => vi.advanceTimersByTime(1));
        expect(screen.getByRole('group', { name: 'Column actions' })).toBeTruthy();
        touchPointer('pointerup', header(2));
        fireEvent.click(header(2));
        fireEvent.click(screen.getByRole('button', { name: 'Delete selected columns' }));
        expect(deleteColumns).toHaveBeenCalledWith(['moment-1']);
        expect(screen.queryByRole('group', { name: 'Column actions' })).toBeNull();
    });

    it('retains an existing range when long pressing one of its selected columns', () => {
        vi.useFakeTimers();
        render(<Harness />);
        fireEvent.click(header(1));
        fireEvent.keyDown(header(1), { key: 'ArrowRight', shiftKey: true });
        fireEvent.keyDown(header(2), { key: 'ArrowRight', shiftKey: true });
        touchPointer('pointerdown', header(2));
        act(() => vi.advanceTimersByTime(550));
        touchPointer('pointerup', header(2));
        fireEvent.click(header(2));
        fireEvent.click(screen.getByRole('button', { name: 'Delete selected columns' }));
        expect(deleteColumns).toHaveBeenCalledWith(['moment-0', 'moment-1', 'moment-2']);
    });

    it.each(['move', 'scroll', 'cancel'])('cancels touch long press after %s', cancellation => {
        vi.useFakeTimers();
        render(<Harness />);
        touchPointer('pointerdown', header(1));
        if (cancellation === 'move') touchPointer('pointermove', header(1), 40, 20);
        else if (cancellation === 'scroll') fireEvent.scroll(window);
        else touchPointer('pointercancel', header(1));
        act(() => vi.advanceTimersByTime(800));
        expect(screen.queryByRole('group', { name: 'Column actions' })).toBeNull();
    });

    it('dismisses the touch popover on outside pointerdown while retaining the trash click target', () => {
        vi.useFakeTimers();
        render(<Harness />);
        touchPointer('pointerdown', header(1));
        act(() => vi.advanceTimersByTime(550));
        touchPointer('pointerup', header(1));
        fireEvent.click(header(1));
        touchPointer('pointerdown', screen.getByRole('button', { name: 'Delete selected columns' }));
        expect(screen.getByRole('group', { name: 'Column actions' })).toBeTruthy();
        touchPointer('pointerdown', screen.getByRole('button', { name: 'After score' }));
        expect(screen.queryByRole('group', { name: 'Column actions' })).toBeNull();
        expect(deleteColumns).not.toHaveBeenCalled();
    });

    it('dismisses touch actions on another cell or Escape and clears pending timers on unmount', () => {
        vi.useFakeTimers();
        const view = render(<Harness />);
        touchPointer('pointerdown', header(1));
        act(() => vi.advanceTimersByTime(550));
        touchPointer('pointerup', header(1));
        fireEvent.click(header(1));
        fireEvent.keyDown(header(1), { key: 'Escape' });
        expect(screen.queryByRole('group', { name: 'Column actions' })).toBeNull();
        touchPointer('pointerdown', header(1));
        act(() => vi.advanceTimersByTime(550));
        touchPointer('pointerup', header(1));
        fireEvent.click(cell(1, 3));
        expect(screen.queryByRole('group', { name: 'Column actions' })).toBeNull();
        fireEvent.keyDown(editor(), { key: 'Escape' });
        const scheduled = vi.spyOn(globalThis, 'setTimeout');
        const cleared = vi.spyOn(globalThis, 'clearTimeout');
        touchPointer('pointerdown', header(1));
        const holdTimer = scheduled.mock.results[scheduled.mock.calls.findIndex(call => call[1] === 550)].value;
        view.unmount();
        expect(cleared).toHaveBeenCalledWith(holdTimer);
        scheduled.mockRestore(); cleared.mockRestore();
    });
});
