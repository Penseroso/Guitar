// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { observeTabWrittenTime, type TabWrittenTimeSnapshot } from '@/domain/tab/written-time';
import { createEmptyTabDocument, setTabFret } from '@/domain/tab/editing';
import { setTabBeatOffset, setTabDuration, setTabRest } from '@/domain/tab/input-capabilities';
import type { TabDocument } from '@/domain/tab/types';
import { WrittenTimePanel } from './WrittenTimePanel';

afterEach(cleanup);
const f = (numerator: number, denominator = 1) => ({ numerator, denominator });
function documentWithNotes(count = 2): TabDocument {
    let document = createEmptyTabDocument(count);
    for (let i = 0; i < count; i++) {
        const id = document.moments[i].id;
        document = setTabFret(document, id, 0, i % 2 ? 7 : 5, `note-${i}`);
        document = setTabBeatOffset(document, id, f(i));
        document = setTabDuration(document, id, 0, f(1, 2));
    }
    return document;
}
function denseDocument(): TabDocument {
    const document = createEmptyTabDocument(1024);
    document.moments = document.moments.map((moment, i) => ({ ...moment, beatOffset: f(0),
        notes: Array.from({ length: 6 }, (_, string) => ({ id: `note-${i}-${string}`, string, fret: 0,
            midi: document.tuningMidi[string], pitchClass: document.tuningMidi[string] % 12, source: null, duration: f(1) })) }));
    return document;
}
function mount(snapshot = observeTabWrittenTime(documentWithNotes(), 1), onAction = vi.fn(() => true), onClose = vi.fn()) {
    return { ...render(<WrittenTimePanel snapshot={snapshot} onAction={onAction} onClose={onClose}/>), snapshot, onAction, onClose };
}
const rows = () => within(screen.getByRole('list', { name: 'Written notes' })).getAllByRole('listitem');
const nextPoint = () => screen.getByRole('button', { name: 'Next written time point' });
const previousPoint = () => screen.getByRole('button', { name: 'Previous written time point' });
const nextPage = () => screen.getByRole('button', { name: 'Next written notes page' });
const previousPage = () => screen.getByRole('button', { name: 'Previous written notes page' });

describe('read-only written time panel', () => {
    it('shows concise musical rows and keeps scope and exact values behind disclosures', async () => {
        const user = userEvent.setup(); const { snapshot } = mount(); const before = JSON.stringify(snapshot.data);
        expect(screen.getByRole('region', { name: 'Written time' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Bar 1' })).toBeTruthy();
        expect(screen.getByText('Written timing')).toBeTruthy();
        expect(within(rows()[0]).getByText('Position 1 · String 1')).toBeTruthy();
        expect(within(rows()[0]).getByText('A4')).toBeTruthy();
        expect(within(rows()[1]).getByText('B4')).toBeTruthy();
        const about = screen.getByText('About written time').closest('details')!;
        const details = screen.getByText('Details').closest('details')!;
        expect(about.open).toBe(false); expect(details.open).toBe(false);
        await user.click(screen.getByText('About written time')); expect(about.open).toBe(true);
        expect(about.textContent).toContain('Notes carried in from other bars and performed sound are outside this view');
        await user.click(screen.getByText('Details')); expect(details.open).toBe(true);
        expect(screen.getByText('Current point · 0/1')).toBeTruthy();
        expect(within(details).getAllByText('1/2')).toHaveLength(3);
        expect(JSON.stringify(snapshot.data)).toBe(before);
    });

    it('moves through exact fraction endpoints, distinguishes complete gaps from the final outside-range point, and preserves focus', async () => {
        const user = userEvent.setup(); const document = documentWithNotes();
        document.moments[0].beatOffset = f(1, 7); document.moments[0].notes[0].duration = f(1, 7);
        document.moments[1].beatOffset = f(3, 7); document.moments[1].notes[0].duration = f(1, 7);
        mount(observeTabWrittenTime(document, 1));
        expect(screen.getByText('Point 1 of 4')).toBeTruthy();
        expect(screen.getByText('1 written note at this point')).toBeTruthy();
        expect(rows()[0].getAttribute('data-active')).toBe('true');
        await user.click(nextPoint());
        expect(screen.getByText('No written notes at this point')).toBeTruthy();
        expect(rows().every(row => !row.hasAttribute('data-active'))).toBe(true);
        await user.click(screen.getByText('Details'));
        expect(screen.getByText('Current point · 2/7')).toBeTruthy();
        await user.click(nextPoint()); expect(rows()[1].getAttribute('data-active')).toBe('true');
        await user.click(nextPoint());
        expect(screen.getByText('Outside observed range')).toBeTruthy();
        expect(screen.queryByText('No written notes at this point')).toBeNull();
        expect(rows().every(row => !row.hasAttribute('data-active'))).toBe(true);
        expect((nextPoint() as HTMLButtonElement).disabled).toBe(true);
        expect(globalThis.document.activeElement).toBe(previousPoint());
        await user.click(previousPoint()); await user.click(previousPoint()); await user.click(previousPoint());
        expect(globalThis.document.activeElement).toBe(nextPoint());
    });

    it('replaces the ending occurrence with the starting one at a shared half-open endpoint', async () => {
        const user = userEvent.setup(); const document = documentWithNotes();
        document.moments[1].beatOffset = f(1, 2);
        document.moments[1].notes[0].midi = 69; document.moments[1].notes[0].pitchClass = 9;
        mount(observeTabWrittenTime(document, 1));
        expect(rows()[0].getAttribute('data-active')).toBe('true');
        await user.click(nextPoint());
        expect(rows()[0].hasAttribute('data-active')).toBe(false);
        expect(rows()[1].getAttribute('data-active')).toBe('true');
        expect(screen.getByText('1 written note at this point')).toBeTruthy();
    });

    it('shows known intervals of a partial population without cursor controls or a complete active-set claim', () => {
        const document = documentWithNotes(); delete document.moments[1].notes[0].duration;
        mount(observeTabWrittenTime(document, 1));
        expect(screen.getByText('Timing incomplete')).toBeTruthy();
        expect(screen.getByText('1 of 2 notes timed')).toBeTruthy();
        expect(rows()).toHaveLength(1);
        expect(screen.queryByRole('group', { name: 'Written time points' })).toBeNull();
        expect(rows()[0].hasAttribute('data-active')).toBe(false);
        expect(screen.queryByText(/written note.*at this point/)).toBeNull();
    });

    it('offers the existing Edit path when no partial intervals are known', () => {
        const document = documentWithNotes(); document.moments.forEach(moment => { delete moment.beatOffset; });
        mount(observeTabWrittenTime(document, 1));
        expect(screen.getByText('Timing incomplete')).toBeTruthy();
        expect(screen.getByText('Add starts and lengths in Edit.')).toBeTruthy();
        expect(screen.queryByRole('list', { name: 'Written notes' })).toBeNull();
        expect(screen.queryByText('No written notes')).toBeNull();
    });

    it('calls a rest-only complete bar No written notes without claiming silence or hiding scope', () => {
        const document = createEmptyTabDocument();
        mount(observeTabWrittenTime(setTabRest(document, document.moments[0].id, true), 1));
        expect(screen.getByText('No written notes')).toBeTruthy();
        expect(screen.getByText('About written time')).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Written time points' })).toBeNull();
        expect(screen.queryByRole('list', { name: 'Written notes' })).toBeNull();
        expect(screen.queryByText(/silence/i)).toBeNull();
    });

    it('does not call an unreadable population empty', () => {
        mount(observeTabWrittenTime({ measureCount: 1, moments: [null] }, 1));
        expect(screen.getByText('Timing unreadable')).toBeTruthy();
        expect(screen.queryByText('No written notes')).toBeNull();
        expect(screen.queryByRole('group', { name: 'Written time points' })).toBeNull();
    });

    it('renders only eight chart rows and eight detail entries even at the 6144-note limit', () => {
        const { container } = mount(observeTabWrittenTime(denseDocument(), 1));
        expect(rows()).toHaveLength(8);
        expect(container.querySelectorAll('li')).toHaveLength(16);
        expect(screen.getByText('Page 1 of 768')).toBeTruthy();
        expect(screen.getByText('6144 written notes at this point')).toBeTruthy();
    });

    it('pages bounded rows and moves focus to an enabled page control at each end', async () => {
        const user = userEvent.setup(); mount(observeTabWrittenTime(documentWithNotes(9), 1));
        expect(rows()).toHaveLength(8);
        await user.click(nextPage()); expect(rows()).toHaveLength(1);
        expect(within(rows()[0]).getByText('Position 9 · String 1')).toBeTruthy();
        expect(screen.getByText('Page 2 of 2')).toBeTruthy();
        expect(globalThis.document.activeElement).toBe(previousPage());
        await user.click(previousPage()); expect(rows()).toHaveLength(8);
        expect(globalThis.document.activeElement).toBe(nextPage());
    });

    it('guards close, Escape, disclosures, paging and endpoint actions before changing local state', async () => {
        const user = userEvent.setup(); const onAction = vi.fn(() => false), onClose = vi.fn();
        render(<div onKeyDown={vi.fn()}><WrittenTimePanel snapshot={observeTabWrittenTime(documentWithNotes(9), 1)} onAction={onAction} onClose={onClose}/></div>);
        await user.click(nextPage()); await user.click(nextPoint());
        await user.click(screen.getByText('About written time')); await user.click(screen.getByText('Details'));
        await user.click(screen.getByRole('button', { name: 'Close written time' }));
        fireEvent.keyDown(screen.getByRole('region', { name: 'Written time' }), { key: 'Escape' });
        expect(screen.getByText('Page 1 of 2')).toBeTruthy(); expect(screen.getByText('Point 1 of 18')).toBeTruthy();
        expect(screen.getByText('About written time').closest('details')!.open).toBe(false);
        expect(screen.getByText('Details').closest('details')!.open).toBe(false);
        expect(onClose).not.toHaveBeenCalled(); expect(onAction).toHaveBeenCalledTimes(6);
        onAction.mockReturnValue(true);
        fireEvent.keyDown(screen.getByRole('region', { name: 'Written time' }), { key: 'Escape', isComposing: true });
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.keyDown(screen.getByRole('region', { name: 'Written time' }), { key: 'Escape' });
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('never reads the source document association and resets local viewing state for replacement data', async () => {
        const user = userEvent.setup(); const data = observeTabWrittenTime(documentWithNotes(9), 1).data;
        const snapshot: TabWrittenTimeSnapshot = { data, get sourceDocument() { throw new Error('Panel read the source document'); } };
        const onAction = vi.fn(() => true), onClose = vi.fn();
        const { rerender } = render(<WrittenTimePanel snapshot={snapshot} onAction={onAction} onClose={onClose}/>);
        await user.click(nextPage()); await user.click(nextPoint());
        expect(screen.getByText('Page 2 of 2')).toBeTruthy();
        rerender(<WrittenTimePanel snapshot={observeTabWrittenTime(documentWithNotes(), 1)} onAction={onAction} onClose={onClose}/>);
        expect(screen.queryByRole('group', { name: 'Written note pages' })).toBeNull();
        expect(rows()).toHaveLength(2); expect(screen.getByText('Point 1 of 4')).toBeTruthy();
    });
});
