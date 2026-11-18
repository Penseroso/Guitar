// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { resolveSuppliedHarmony, type SuppliedTabChord } from '@/domain/tab/supplied-harmony';
import { observeTabAcrossBarsWrittenTime } from '@/domain/tab/written-time-across-bars';
import type { TabDocument } from '@/domain/tab/types';
import { SuppliedHarmonyAnalysis } from './SuppliedHarmonyAnalysis';
import { SuppliedHarmonyPanel } from './SuppliedHarmonyPanel';

const frame = { tonic: 'C', mode: 'major', lens: 'jazz-pop' } as const;
function fixture() {
    const document: TabDocument = {
        format: 'authored', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0,
        measureCount: 1, meter: { numerator: 4, denominator: 4 },
        moments: Array.from({ length: 10 }, (_, index) => ({
            id: `position-${index}`, index, measure: 1, column: index,
            beatOffset: { numerator: index, denominator: 1 },
            notes: [{ id: `source-${index}`, string: index % 2, fret: 0, midi: index === 1 ? 60 : 59,
                pitchClass: index === 1 ? 0 : 11, source: null, duration: { numerator: 1, denominator: 1 } }],
        })),
    };
    const entries: SuppliedTabChord[] = document.moments.map((moment, index) => ({
        id: `chord-${index}`, scoreId: 1, chord: index === 0 ? { root: 'G', chordId: 'dominant-7' } : { root: 'C', chordId: 'major' },
        binding: { kind: 'positions', firstId: moment.id, lastId: moment.id },
    }));
    return { document, entries, rows: resolveSuppliedHarmony(document, 1, 0, entries) };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('supplied harmony source controls', () => {
    it('reveals the exact selected occurrences and movement without toggling selection or edits', () => {
        const { document, rows } = fixture(), reveal = vi.fn(), toggle = vi.fn();
        const before = JSON.stringify(document);
        render(<SuppliedHarmonyAnalysis document={document} rows={rows} mode="positions" frame={frame}
            selected={['source-0', 'source-1']} onToggleNote={toggle} onRevealEvidence={reveal}/>);
        const movement = within(screen.getByRole('list', { name: 'Melody movement' }));
        const control = movement.getByRole('button', { name: 'Show on tab: B3 to C4' });
        fireEvent.click(control);
        expect(reveal).toHaveBeenLastCalledWith({ noteIds: ['source-0', 'source-1'] }, control);
        const first = within(screen.getByRole('list', { name: 'Selected melody notes' })).getAllByRole('listitem')[0];
        const noteControl = within(first).getByRole('button', { name: /Show on tab/ });
        fireEvent.click(noteControl);
        expect(reveal).toHaveBeenLastCalledWith({ noteIds: ['source-0'] }, noteControl);
        expect(noteControl.getAttribute('data-evidence-action')).toBe('true');
        expect(toggle).not.toHaveBeenCalled(); expect(JSON.stringify(document)).toBe(before);
    });
    it('reveals a position chord pair by stable position IDs, not repeated pitch names', () => {
        const { document, rows } = fixture(), reveal = vi.fn();
        render(<SuppliedHarmonyAnalysis document={document} rows={rows} mode="positions" frame={frame}
            selected={[]} onToggleNote={vi.fn()} onRevealEvidence={reveal}/>);
        const first = within(screen.getByRole('list', { name: 'Chord relationships' })).getAllByRole('listitem')[0];
        const control = within(first).getByRole('button', { name: /Show on tab/ });
        fireEvent.click(control);
        expect(reveal).toHaveBeenCalledWith({ momentIds: ['position-0', 'position-1'] }, control);
    });
    it('opens the requested row on its real page, returns focus to the label and accepts repeats', () => {
        const { document, entries, rows } = fixture(), edit = vi.fn();
        const origin = window.document.createElement('button'); window.document.body.append(origin);
        const props = { document, selection: { start: 0, end: 0 }, harmony: { scoreId: 1, originsRevision: 0, suppliedHarmony: entries }, rows, onEdit: edit };
        const { rerender } = render(<SuppliedHarmonyPanel {...props} requestedChord={{ id: 'chord-9', request: 1, origin }}/>);
        const heading = screen.getByRole('heading', { name: 'C · Chord detail' });
        expect(window.document.activeElement).toBe(heading);
        expect(within(screen.getByRole('list', { name: 'Supplied chords' })).getByRole('button', { name: /Position 10/ }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.keyDown(heading, { key: 'Escape' }); expect(window.document.activeElement).toBe(origin);
        expect(screen.queryByRole('heading', { name: 'C · Chord detail' })).toBeNull();
        rerender(<SuppliedHarmonyPanel {...props} requestedChord={{ id: 'chord-9', request: 2, origin }}/>);
        expect(window.document.activeElement).toBe(screen.getByRole('heading', { name: 'C · Chord detail' }));
        expect(edit).not.toHaveBeenCalled(); origin.remove();
    });
    it('does not defer an external request across cancellation of an existing chord draft', () => {
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
        const { document, entries, rows } = fixture(), edit = vi.fn();
        const props = { document, selection: { start: 0, end: 0 }, harmony: { scoreId: 1, originsRevision: 0, suppliedHarmony: entries }, rows, onEdit: edit };
        const { rerender } = render(<SuppliedHarmonyPanel {...props}/>);
        fireEvent.click(screen.getByRole('button', { name: /Chord progression/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Add chord' }));
        rerender(<SuppliedHarmonyPanel {...props} requestedChord={{ id: 'chord-0', request: 1 }}/>);
        expect(screen.getByRole('status').textContent).toBe('Finish or cancel chord input first.');
        expect(screen.getByRole('heading', { name: 'Add supplied chord' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel chord input' }));
        expect(screen.queryByRole('heading', { name: 'G7 · Chord detail' })).toBeNull();
        rerender(<SuppliedHarmonyPanel {...props} requestedChord={{ id: 'chord-0', request: 2 }}/>);
        expect(screen.getByRole('heading', { name: 'G7 · Chord detail' })).toBeTruthy();
        expect(edit).not.toHaveBeenCalled();
    });
    it('does not reopen a consumed request when its missing row later returns', () => {
        const { document, entries, rows } = fixture();
        const props = { document, selection: { start: 0, end: 0 }, harmony: { scoreId: 1, originsRevision: 0, suppliedHarmony: entries }, onEdit: vi.fn() };
        const request = { id: 'chord-0', request: 1 };
        const { rerender } = render(<SuppliedHarmonyPanel {...props} rows={[]} requestedChord={request}/>);
        expect(screen.getByRole('status').textContent).toBe('This chord position is no longer available.');
        rerender(<SuppliedHarmonyPanel {...props} rows={rows} requestedChord={request}/>);
        expect(screen.queryByRole('heading', { name: 'G7 · Chord detail' })).toBeNull();
    });
    it('drops written-mode melody and reading state when a score label opens a positional chord', () => {
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
        const { document, entries } = fixture();
        const all: SuppliedTabChord[] = [...entries, { id: 'written', scoreId: 1, chord: { root: 'G', chordId: 'dominant-7' },
            binding: { kind: 'written-time', start: { numerator: '0', denominator: '1' }, end: { numerator: '2', denominator: '1' }, originsRevision: 0 } }];
        const props = { document, selection: { start: 0, end: 1 }, harmony: { scoreId: 1, originsRevision: 0, suppliedHarmony: all },
            rows: resolveSuppliedHarmony(document, 1, 0, all), onEdit: vi.fn() };
        const { rerender } = render(<SuppliedHarmonyPanel {...props}/>);
        fireEvent.click(screen.getByRole('button', { name: /Chord progression/ }));
        fireEvent.click(screen.getByRole('button', { name: 'By written time' }));
        fireEvent.click(screen.getByRole('button', { name: 'Read progression' }));
        fireEvent.click(screen.getByRole('button', { name: 'Use single-note range' }));
        expect(screen.getByRole('button', { name: 'Read progression · 2 notes' })).toBeTruthy();
        rerender(<SuppliedHarmonyPanel {...props} requestedChord={{ id: 'chord-0', request: 1 }}/>);
        expect(screen.getByRole('button', { name: 'By position' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'Read progression' }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByRole('region', { name: 'Progression reading' })).toBeNull();
    });
    it('maps written relationships only to known overlaps, including a carry-in source', () => {
        const { document } = fixture(); document.moments[0].notes[0].duration = { numerator: 3, denominator: 1 };
        const entries: SuppliedTabChord[] = [0, 1].map(index => ({ id: `w${index}`, scoreId: 1,
            chord: { root: index ? 'C' : 'G', chordId: index ? 'major' : 'dominant-7' }, binding: { kind: 'written-time',
                start: { numerator: String(index), denominator: '1' }, end: { numerator: String(index + 1), denominator: '1' }, originsRevision: 0 } }));
        const reveal = vi.fn();
        render(<SuppliedHarmonyAnalysis document={document} rows={resolveSuppliedHarmony(document, 1, 0, entries)} mode="written-time" frame={frame}
            selected={[]} written={observeTabAcrossBarsWrittenTime(document, 1, { model: 'regular-bar-origins' })} onToggleNote={vi.fn()} onRevealEvidence={reveal}/>);
        const control = within(screen.getByRole('list', { name: 'Chord relationships' })).getByRole('button', { name: /Show on tab/ });
        fireEvent.click(control);
        expect(reveal).toHaveBeenCalledWith({ noteIds: ['source-0', 'source-1'] }, control);
    });
});
