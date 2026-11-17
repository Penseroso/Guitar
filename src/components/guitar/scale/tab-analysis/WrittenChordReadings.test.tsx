// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as pointAnalysis from '@/domain/tab/written-point-analysis';
import { observeTabAcrossBarsWrittenTime } from '@/domain/tab/written-time-across-bars';
import type { TabDocument } from '@/domain/tab/types';
import { WrittenChordReadings } from './WrittenChordReadings';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const time = (n: number) => ({ numerator: String(n), denominator: '1' });
const refs = { scale: null, frame: null };
function score(midis: number[]): TabDocument {
    return { format: 'authored', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0,
        measureCount: 1, meter: { numerator: 4, denominator: 4 }, moments: Array.from({ length: Math.ceil(midis.length / 6) }, (_, m) => ({
            id: `m${m}`, index: m, measure: 1, column: m, beatOffset: { numerator: 0, denominator: 1 },
            notes: midis.slice(m * 6, m * 6 + 6).map((midi, s) => ({ id: `n${m * 6 + s}`, string: s, fret: 0, midi,
                pitchClass: 11, source: null, duration: { numerator: 3, denominator: 1 } })) })) };
}
const observe = (midis = [60, 64, 67, 69]) => observeTabAcrossBarsWrittenTime(score(midis), 1, { model: 'regular-bar-origins' });
function mount(midis?: number[], onAction = vi.fn(() => true)) {
    const snapshot = observe(midis);
    return { ...render(<WrittenChordReadings snapshot={snapshot} time={time(0)} references={refs} onAction={onAction}/>), snapshot, onAction };
}
const summary = () => screen.getByText('Chord readings');
const formula = () => screen.getByText('Formula alternatives', { selector: 'summary' });
const noteRows = () => within(screen.getByRole('list', { name: 'Written point notes' })).getAllByRole('listitem');
const choices = () => within(screen.getByRole('list', { name: 'Formula alternatives' })).getAllByRole('button');
const choose = (key: string) => {
    const button = choices().find(button => button.getAttribute('data-candidate-key') === key);
    if (!button) throw Error(`Missing candidate ${key}`);
    fireEvent.click(button); return button;
};

describe('written point chord readings', () => {
    it('does no analysis while folded and exposes facts before optional unselected alternatives', async () => {
        const analyze = vi.spyOn(pointAnalysis, 'analyzeTabWrittenPoint'); const describe = vi.spyOn(pointAnalysis, 'describeTabWrittenPointCandidate');
        const user = userEvent.setup(); const { snapshot } = mount();
        expect(analyze).not.toHaveBeenCalled(); expect(screen.queryByRole('region', { name: 'Written chord readings' })).toBeNull();
        await user.click(summary()); expect(analyze).toHaveBeenCalledOnce();
        expect(screen.getByText('Pitch classes · C · E · G · A')).toBeTruthy();
        expect(screen.queryByRole('list', { name: 'Formula alternatives' })).toBeNull();
        expect(describe).not.toHaveBeenCalled(); await user.click(formula());
        const expected = pointAnalysis.analyzeTabWrittenPoint(snapshot, time(0), refs);
        if (expected.status !== 'complete') throw Error('fixture');
        expect(choices().map(button => button.getAttribute('data-candidate-key'))).toEqual(expected.candidates.slice(0, 8).map(candidate => candidate.key));
        expect(choices().every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
        expect(screen.queryByLabelText('Hypothetical chord')).toBeNull(); expect(describe).not.toHaveBeenCalled();
    });

    it('preserves occurrence identity while dyad facts and power formulas ignore octave doubling', () => {
        const { unmount } = mount([60, 67]); fireEvent.click(summary()); fireEvent.click(formula());
        const keys = choices().map(button => button.getAttribute('data-candidate-key'));
        expect(keys).toContain('0:power-5'); expect(screen.getByText('Interval class · 5')).toBeTruthy(); unmount();
        mount([60, 67, 72]); fireEvent.click(summary()); fireEvent.click(formula());
        expect(choices().map(button => button.getAttribute('data-candidate-key'))).toEqual(keys);
        expect(noteRows().map(row => row.getAttribute('data-note-id'))).toEqual(['n0', 'n1', 'n2']);
    });

    it('keeps a unison factual without a formula disclosure', () => {
        mount([60, 72]); fireEvent.click(summary());
        expect(noteRows()).toHaveLength(2); expect(screen.getByText('Pitch classes · C')).toBeTruthy();
        expect(screen.queryByText('Formula alternatives')).toBeNull(); expect(screen.queryByText(/^Interval class ·/)).toBeNull();
    });

    it('keeps a formula degree when its theoretical note spelling is unavailable', () => {
        const snapshot = observe([65, 69, 72, 75, 68]);
        render(<WrittenChordReadings snapshot={snapshot} time={time(0)} references={{ scale: null, frame: { tonic: 'F#', mode: 'major', lens: 'jazz-pop' } }} onAction={() => true}/>);
        fireEvent.click(summary()); fireEvent.click(formula()); choose('5:hendrix-7-sharp-9');
        expect(screen.getByText('#9 · Formula member')).toBeTruthy();
        expect(screen.queryByText(/null|undefined/)).toBeNull();
    });

    it('computes only the selected hypothetical roles and clears without changing source', () => {
        const describe = vi.spyOn(pointAnalysis, 'describeTabWrittenPointCandidate'); const { snapshot } = mount();
        const before = JSON.stringify(snapshot.data); fireEvent.click(summary()); fireEvent.click(formula()); choose('0:major');
        expect(describe).toHaveBeenCalledOnce(); expect(screen.getByRole('heading', { name: 'If C' })).toBeTruthy();
        expect(screen.getByText('Outside this formula')).toBeTruthy(); expect(screen.getAllByText(/Formula member/)).toHaveLength(3);
        fireEvent.click(screen.getByText('Formula details')); expect(screen.getByText('Outside formula · A4')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Clear hypothetical chord' }));
        expect(screen.queryByLabelText('Hypothetical chord')).toBeNull(); expect(screen.queryByText('Outside this formula')).toBeNull();
        expect(JSON.stringify(snapshot.data)).toBe(before); expect(choices().every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    });

    it('does not resurrect selection or either page when a point is revisited', () => {
        const midis = Array.from({ length: 17 }, (_, i) => [60, 64, 67, 69][i % 4]);
        const original = pointAnalysis.analyzeTabWrittenPoint(observe(midis), time(0), refs);
        if (original.status !== 'complete') throw Error('fixture');
        const candidates = [...original.candidates, ...Array.from({ length: 16 }, (_, i) => ({ ...original.candidates[0], key: `extra-${i}` }))];
        vi.spyOn(pointAnalysis, 'analyzeTabWrittenPoint').mockReturnValue({ ...original, candidates,
            candidatePresentations: candidates.map(candidate => ({ ...original.candidatePresentations[0], key: candidate.key })) });
        const { snapshot, rerender, onAction } = mount(midis);
        fireEvent.click(summary()); fireEvent.click(formula());
        choose('0:major'); fireEvent.click(screen.getByRole('button', { name: 'Next written point notes page' }));
        fireEvent.click(screen.getByRole('button', { name: 'Next formula alternatives page' }));
        expect(choices()[0].getAttribute('data-candidate-key')).not.toBe(original.candidates[0].key);
        rerender(<WrittenChordReadings snapshot={snapshot} time={time(1)} references={refs} onAction={onAction}/>);
        expect(screen.getByRole('region', { name: 'Written chord readings' })).toBeTruthy();
        expect(screen.queryByLabelText('Hypothetical chord')).toBeNull(); expect(noteRows()[0].getAttribute('data-note-id')).toBe('n0');
        rerender(<WrittenChordReadings snapshot={snapshot} time={time(0)} references={refs} onAction={onAction}/>);
        expect(screen.queryByLabelText('Hypothetical chord')).toBeNull(); expect(noteRows()[0].getAttribute('data-note-id')).toBe('n0');
        expect(choices().every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
        expect(choices()[0].getAttribute('data-candidate-key')).toBe(original.candidates[0].key);
    });

    it('guards main, formula, selection, clear, pages and native detail actions', () => {
        const allow = vi.fn(() => false); mount(Array.from({ length: 10 }, (_, i) => [60, 64, 67, 69][i % 4]), allow);
        fireEvent.click(summary()); expect(screen.queryByRole('region', { name: 'Written chord readings' })).toBeNull();
        allow.mockReturnValue(true); fireEvent.click(summary()); allow.mockReturnValue(false); fireEvent.click(formula());
        expect(screen.queryByRole('list', { name: 'Formula alternatives' })).toBeNull();
        allow.mockReturnValue(true); fireEvent.click(formula()); allow.mockReturnValue(false); choose('0:major');
        expect(screen.queryByLabelText('Hypothetical chord')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Next written point notes page' })); expect(noteRows()[0].getAttribute('data-note-id')).toBe('n0');
        expect(fireEvent.click(screen.getByText('Observation details'))).toBe(false);
        allow.mockReturnValue(true); choose('0:major'); allow.mockReturnValue(false);
        fireEvent.click(screen.getByRole('button', { name: 'Clear hypothetical chord' })); expect(screen.getByLabelText('Hypothetical chord')).toBeTruthy();
        expect(fireEvent.click(screen.getByText('Formula details'))).toBe(false);
    });

    it('closes the inspector first with Escape, returns focus and ignores composing Escape', () => {
        mount(); fireEvent.click(summary()); fireEvent.click(formula()); choose('0:major');
        fireEvent.keyDown(screen.getByRole('button', { name: 'Clear hypothetical chord' }), { key: 'Escape', isComposing: true });
        expect(screen.getByRole('region', { name: 'Written chord readings' })).toBeTruthy();
        fireEvent.keyDown(screen.getByRole('button', { name: 'Clear hypothetical chord' }), { key: 'Escape' });
        expect(screen.queryByRole('region', { name: 'Written chord readings' })).toBeNull(); expect(document.activeElement).toBe(summary());
        fireEvent.click(summary()); fireEvent.click(formula()); expect(choices().every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    });

    it('bounds a maximum-size source to eight note and eight alternative rows without a role matrix', () => {
        const describe = vi.spyOn(pointAnalysis, 'describeTabWrittenPointCandidate'); const { container } = mount(Array.from({ length: 6144 }, (_, i) => [60, 64, 67, 69][i % 4]));
        fireEvent.click(summary()); fireEvent.click(formula()); expect(noteRows()).toHaveLength(8); expect(choices().length).toBeLessThanOrEqual(8);
        expect(container.querySelectorAll('li').length).toBeLessThanOrEqual(16); expect(describe).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Next written point notes page' })); expect(noteRows()[0].getAttribute('data-note-id')).toBe('n8');
        expect(screen.getByText('Page 2 of 768')).toBeTruthy(); expect(describe).not.toHaveBeenCalled();
    });

    it('queries a snapshot without reading its source document and presents an empty gap neutrally', () => {
        const document = score([60, 67]); document.moments[0].notes.forEach(note => { note.duration = { numerator: 1, denominator: 1 }; });
        document.moments.push({ ...document.moments[0], id: 'later', index: 1, beatOffset: { numerator: 2, denominator: 1 }, notes: [{ ...document.moments[0].notes[0], id: 'later-note' }] });
        const observed = observeTabAcrossBarsWrittenTime(document, 1, { model: 'regular-bar-origins' });
        const snapshot = { data: observed.data, get sourceDocument(): never { throw Error('No source read'); } };
        render(<WrittenChordReadings snapshot={snapshot} time={time(1)} references={refs} onAction={() => true}/>); fireEvent.click(summary());
        expect(screen.getByText('No written notes at this point.')).toBeTruthy(); expect(screen.queryByText(/silence|silent|rest/i)).toBeNull();
        expect(screen.queryByText('Formula alternatives')).toBeNull();
    });
});
