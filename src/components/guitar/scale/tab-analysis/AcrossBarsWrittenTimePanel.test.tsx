// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { observeTabAcrossBarsWrittenTime, inspectTabAcrossBarsWrittenNotesAt, type TabAcrossBarsWrittenTimeSnapshot } from '@/domain/tab/written-time-across-bars';
import * as projection from '@/domain/tab/written-time-across-bars';
import { createEmptyTabDocument, setTabBeatOffset, setTabDuration, setTabFret, setTabMeter, setTabRest } from '@/domain/tab/editing';
import type { TabDocument } from '@/domain/tab/types';
import { AcrossBarsWrittenTimePanel } from './AcrossBarsWrittenTimePanel';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const f = (numerator: number, denominator = 1) => ({ numerator, denominator });
const exact = (numerator: string, denominator = '1') => ({ numerator, denominator });
const snapshotFor = (document: TabDocument, bar = 1) => observeTabAcrossBarsWrittenTime(document, bar, { model: 'regular-bar-origins' });
function chronology(): TabDocument {
    let document = setTabMeter(createEmptyTabDocument(3, 3), { numerator: 4, denominator: 4 });
    for (const [index, id, start, length] of [[0, 'A', 9, 1], [1, 'B', 3, 3], [2, 'C', 0, 1]] as const) {
        const momentId = document.moments[index].id;
        document = setTabFret(document, momentId, 0, 5, id);
        document = setTabBeatOffset(document, momentId, f(start));
        document = setTabDuration(document, momentId, 0, f(length));
    }
    return document;
}
function dense(count = 17, offset = 0): TabDocument {
    let document = setTabMeter(createEmptyTabDocument(count, offset ? 3 : 1), { numerator: 4, denominator: 4 });
    document.moments = document.moments.map(moment => ({ ...moment, measure: 1 }));
    for (let i = 0; i < count; i++) {
        const id = document.moments[i].id;
        document = setTabFret(document, id, 0, 5, `note-${i}`);
        document = setTabBeatOffset(document, id, f(offset));
        document = setTabDuration(document, id, 0, f(offset ? 1 : 4));
    }
    return document;
}
function mount(snapshot = snapshotFor(chronology(), 3), onAction = vi.fn(() => true), onClose = vi.fn()) {
    return { ...render(<AcrossBarsWrittenTimePanel snapshot={snapshot} onAction={onAction} onClose={onClose}/>), snapshot, onAction, onClose };
}
const rows = () => within(screen.getByRole('list', { name: 'Across-bars written notes' })).getAllByRole('listitem');
const origins = () => rows().map(row => within(row).getByText(/^Bar \d+ · Position \d+ · String/).textContent);
const activeOrigins = () => rows().filter(row => row.hasAttribute('data-active')).map(row => within(row).getByText(/^Bar \d+ · Position \d+ · String/).textContent);
const nextPoint = () => screen.getByRole('button', { name: 'Next across-bars time point' });
const previousPoint = () => screen.getByRole('button', { name: 'Previous across-bars time point' });
const nextPage = () => screen.getByRole('button', { name: 'Next across-bars notes page' });
const previousPage = () => screen.getByRole('button', { name: 'Previous across-bars notes page' });

describe('explicit across-bars written-time panel', () => {
    it('displays B,C,A chronologically while preserving source/query order and written offsets', async () => {
        const user = userEvent.setup(); const source = chronology(); const snapshot = snapshotFor(source, 3);
        const before = JSON.stringify(snapshot.data); mount(snapshot);
        expect(screen.getByRole('region', { name: 'Written time' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Bar 3' })).toBeTruthy();
        expect(screen.getByText('Across full bars · 4/4')).toBeTruthy();
        expect(origins()).toEqual(['Bar 2 · Position 2 · String 1', 'Bar 3 · Position 3 · String 1', 'Bar 1 · Position 1 · String 1']);
        expect(activeOrigins()).toEqual(['Bar 2 · Position 2 · String 1', 'Bar 3 · Position 3 · String 1']);
        expect(screen.getByText('2 source notes at this point')).toBeTruthy();
        await user.click(nextPoint());
        expect(activeOrigins()).toEqual(['Bar 2 · Position 2 · String 1', 'Bar 1 · Position 1 · String 1']);
        const queried = inspectTabAcrossBarsWrittenNotesAt(snapshot, exact('9'));
        expect(queried.status).toBe('complete');
        if (queried.status === 'complete') expect(queried.notes.map(note => note.noteId)).toEqual(['A', 'B']);
        expect(origins()).toEqual(['Bar 2 · Position 2 · String 1', 'Bar 3 · Position 3 · String 1', 'Bar 1 · Position 1 · String 1']);
        await user.click(screen.getByText('Details'));
        const details = screen.getByText('Details').closest('details')!;
        expect(within(details).getByText('Current global point · 9/1')).toBeTruthy();
        expect(within(details).getAllByText('Original local start')).toHaveLength(3);
        expect(within(details).getAllByText('Global start')).toHaveLength(3);
        expect(within(details).getAllByText('Global end')).toHaveLength(3);
        expect(within(details).getByText('A')).toBeTruthy();
        expect(within(details).getByText('Outside-bar offsets · 1')).toBeTruthy();
        expect(within(details).getByText('Bar 1 · Position 1 · Original offset 9/1')).toBeTruthy();
        expect(snapshot.data.intervals.map(note => note.noteId)).toEqual(['A', 'B', 'C']);
        expect(snapshot.data.intervals[0]).toMatchObject({ sourceMeasure: 1, sourceStart: exact('9'), start: exact('9'), end: exact('10') });
        expect(JSON.stringify(snapshot.data)).toBe(before);
        expect(source.moments[0].measure).toBe(1); expect(source.moments[0].beatOffset).toEqual(f(9));
    });

    it('shows a prior-bar interval even when the selected bar has no source notes', () => {
        let document = setTabMeter(createEmptyTabDocument(2, 2), { numerator: 4, denominator: 4 });
        const first = document.moments[0].id;
        document = setTabDuration(setTabBeatOffset(setTabFret(document, first, 0, 5, 'carry'), first, f(0)), first, 0, f(5));
        mount(snapshotFor(document, 2));
        expect(rows()).toHaveLength(1);
        expect(origins()).toEqual(['Bar 1 · Position 1 · String 1']);
        expect(screen.getByText('1 source note at this point')).toBeTruthy();
        expect(screen.queryByText('No written notes')).toBeNull();
    });

    it('distinguishes a partial source population from a proven complete point and drops highlighting at uncertainty', async () => {
        const user = userEvent.setup(); const document = dense(2);
        document.moments[1].beatOffset = f(2); delete document.moments[1].notes[0].duration;
        mount(snapshotFor(document));
        expect(screen.getByText('Timing incomplete across score')).toBeTruthy();
        expect(screen.getByText('Complete at this point')).toBeTruthy();
        expect(screen.getByText('1 source note at this point')).toBeTruthy();
        await user.click(nextPoint());
        expect(screen.getByText('More timing needed at this point')).toBeTruthy();
        expect(activeOrigins()).toEqual([]);
        expect(screen.queryByText('Complete at this point')).toBeNull();
        expect(screen.queryByText(/source note[s]? at this point/)).toBeNull();
        await user.click(nextPoint());
        expect(screen.getByText('Outside selected bar')).toBeTruthy();
        expect(globalThis.document.activeElement).toBe(previousPoint());
    });

    it('keeps unresolved earlier source timing partial instead of claiming that an empty selected bar is silent', () => {
        const document = chronology(); delete document.moments[0].beatOffset;
        mount(snapshotFor(document, 3));
        expect(screen.getByText('More timing needed at this point')).toBeTruthy();
        expect(screen.queryByText(/source note[s]? at this point/)).toBeNull();
        expect(activeOrigins()).toEqual([]);
        expect(screen.queryByText('No written notes')).toBeNull();
    });

    it('offers no query when no source-note interval is known and does not call it empty', () => {
        const document = dense(2); document.moments.forEach(moment => { delete moment.notes[0].duration; });
        mount(snapshotFor(document));
        expect(screen.getByText('Add starts and lengths in Edit.')).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Across-bars time points' })).toBeNull();
        expect(screen.queryByText('No written notes')).toBeNull();
    });

    it('keeps missing-meter projection unavailable but allows No written notes for an actually empty source population', () => {
        const unavailable = createEmptyTabDocument(); mount(snapshotFor(unavailable));
        expect(screen.getByText('Projection unavailable')).toBeTruthy();
        expect(screen.getByText('Set meter to compare bars')).toBeTruthy();
        expect(screen.queryByText('No written notes')).toBeNull();
        cleanup();
        const metered = setTabMeter(unavailable, { numerator: 4, denominator: 4 });
        mount(snapshotFor(setTabRest(metered, metered.moments[0].id, true)));
        expect(screen.getByText('No written notes')).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Across-bars time points' })).toBeNull();
    });

    it('keeps page membership stable across point changes and counts the full simultaneous population', async () => {
        const user = userEvent.setup(); const snapshot = snapshotFor(dense()); const before = JSON.stringify(snapshot.data);
        const { container } = mount(snapshot);
        expect(rows()).toHaveLength(8); expect(container.querySelectorAll('li')).toHaveLength(16);
        expect(screen.getByText('17 source notes at this point')).toBeTruthy();
        await user.click(nextPage()); const pageTwo = origins();
        expect(pageTwo[0]).toBe('Bar 1 · Position 9 · String 1');
        await user.click(nextPoint());
        expect(origins()).toEqual(pageTwo); expect(screen.getByText('Page 2 of 3')).toBeTruthy();
        expect(screen.getByText('Outside selected bar')).toBeTruthy();
        await user.click(nextPage()); expect(rows()).toHaveLength(1);
        expect(globalThis.document.activeElement).toBe(previousPage());
        expect(JSON.stringify(snapshot.data)).toBe(before);
    });

    it('bounds source-position diagnostics independently of chord-note count', async () => {
        const user = userEvent.setup(); const document = dense(9, 9);
        document.moments = document.moments.map((moment, index) => ({ ...moment, notes: Array.from({ length: 6 }, (_, string) => ({
            ...moment.notes[0], id: `chord-${index}-${string}`, string,
        })) }));
        const snapshot = snapshotFor(document, 3); const { container } = mount(snapshot);
        expect(snapshot.data.projectionDiagnostics).toHaveLength(9);
        await user.click(nextPoint()); expect(screen.getByText('54 source notes at this point')).toBeTruthy();
        await user.click(screen.getByText('Details'));
        expect(screen.getByText('Outside-bar offsets · 9')).toBeTruthy();
        expect(screen.getByText('First 8 positions shown · Review offsets in Edit.')).toBeTruthy();
        expect(container.querySelectorAll('li')).toHaveLength(24);
    });

    it('guards every local action before changing pages, points, disclosures or closing', async () => {
        const user = userEvent.setup(); const onAction = vi.fn(() => false), onClose = vi.fn();
        mount(snapshotFor(dense()), onAction, onClose);
        await user.click(nextPage()); await user.click(nextPoint()); await user.click(screen.getByText('About across bars')); await user.click(screen.getByText('Details'));
        await user.click(screen.getByRole('button', { name: 'Close written time' }));
        fireEvent.keyDown(screen.getByRole('region', { name: 'Written time' }), { key: 'Escape' });
        expect(screen.getByText('Page 1 of 3')).toBeTruthy(); expect(screen.getByText('Point 1 of 2')).toBeTruthy();
        expect(screen.getByText('About across bars').closest('details')!.open).toBe(false);
        expect(screen.getByText('Details').closest('details')!.open).toBe(false);
        expect(onClose).not.toHaveBeenCalled(); expect(onAction).toHaveBeenCalledTimes(6);
    });

    it('uses only copied data and memoizes the query across paging', async () => {
        const user = userEvent.setup(); const data = snapshotFor(dense()).data;
        const snapshot: TabAcrossBarsWrittenTimeSnapshot = { data, get sourceDocument() { throw new Error('Read source document'); } };
        const inspect = vi.spyOn(projection, 'inspectTabAcrossBarsWrittenNotesAt');
        const points = vi.spyOn(projection, 'getTabAcrossBarsWrittenInspectionPoints');
        mount(snapshot); expect(inspect).toHaveBeenCalledOnce(); expect(points).toHaveBeenCalledOnce();
        await user.click(nextPage()); await user.click(previousPage());
        expect(inspect).toHaveBeenCalledOnce(); expect(points).toHaveBeenCalledOnce();
        await user.click(nextPoint()); expect(inspect).toHaveBeenCalledTimes(2);
    });

    it('bounds chart and details DOM to eight rows each for all 6144 source notes', () => {
        const document = setTabMeter(createEmptyTabDocument(1024), { numerator: 4, denominator: 4 });
        document.moments = document.moments.map((moment, index) => ({ ...moment, beatOffset: f(0), notes: Array.from({ length: 6 }, (_, string) => ({
            id: `note-${index}-${string}`, string, fret: 0, midi: document.tuningMidi[string], pitchClass: document.tuningMidi[string] % 12, source: null, duration: f(4),
        })) }));
        const { container } = mount(snapshotFor(document));
        expect(rows()).toHaveLength(8); expect(container.querySelectorAll('li')).toHaveLength(16);
        expect(screen.getByText('6144 source notes at this point')).toBeTruthy();
        expect(screen.getByText('Page 1 of 768')).toBeTruthy();
    });

    it('keeps page membership stable when the point changes and moves focus off disabled paging controls', async () => {
        const user = userEvent.setup(); mount(snapshotFor(dense()));
        const firstPage = origins();
        await user.click(nextPage()); const secondPage = origins(); expect(secondPage).toHaveLength(8);
        await user.click(nextPoint()); expect(origins()).toEqual(secondPage); expect(screen.getByText('Page 2 of 3')).toBeTruthy();
        await user.click(nextPage()); expect(rows()).toHaveLength(1);
        expect(globalThis.document.activeElement).toBe(previousPage());
        await user.click(previousPage()); await user.click(previousPage());
        expect(origins()).toEqual(firstPage); expect(globalThis.document.activeElement).toBe(nextPage());
    });

    it('summarizes outside-bar offsets once per source position and keeps diagnostics bounded', async () => {
        const user = userEvent.setup(); const document = dense(9, 9);
        document.moments = document.moments.map((moment, index) => ({ ...moment, notes: Array.from({ length: 6 }, (_, string) => ({
            id: `chord-${index}-${string}`, string, fret: 0, midi: document.tuningMidi[string], pitchClass: document.tuningMidi[string] % 12, source: null, duration: f(1),
        })) }));
        const { container } = mount(snapshotFor(document, 3));
        await user.click(nextPoint()); expect(screen.getByText('54 source notes at this point')).toBeTruthy();
        await user.click(screen.getByText('Details'));
        const diagnostics = screen.getByRole('note', { name: 'Projection diagnostics' });
        expect(within(diagnostics).getByText('Outside-bar offsets · 9')).toBeTruthy();
        expect(within(diagnostics).getAllByRole('listitem')).toHaveLength(8);
        expect(container.querySelectorAll('li')).toHaveLength(24);
    });
});
