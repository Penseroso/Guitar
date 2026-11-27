// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { exploreRelation } from '@/domain/harmony/relations';
import type { RelationKind } from '@/domain/harmony/types';
import { RelationExampleView } from './RelationExampleView';

afterEach(cleanup);
const examples = (kind: RelationKind, classical = false) => exploreRelation({
    kind, frame: { tonic: 'C', mode: 'major', lens: classical ? 'classical' : 'jazz-pop' }, target: { root: 'C', chordId: 'major' },
}).examples;

describe('Harmony musical diagrams', () => {
    it.each([
        ['fifths', ['→ Voice leading', '— Common tones'], 'Guide tones', ['G held as G', 'B to C', 'D to E']],
        ['dominant', ['Guide tones', '— Common tones'], 'Voice leading', ['G held as G', 'B to C', 'F to E']],
    ] as const)('%s legend and correspondence name only what the theory result draws', (kind, legend, absent, spoken) => {
        render(<RelationExampleView example={examples(kind)[0]} onOpenChord={vi.fn()} activeStep={null} />);
        for (const item of legend) expect(screen.getByText(item)).toBeTruthy();
        expect(screen.queryByText(absent)).toBeNull();
        const list = screen.getByRole('list', { name: 'Tone correspondence' });
        expect(within(list).getAllByRole('listitem').map(item => item.textContent).sort()).toEqual([...spoken].sort());
    });

    it.each([
        ['ii-v', 'ii-v', 'C → B ↓½', 'C to B, ½ step down'],
        ['predominant', 'iv-v', 'E → D ↓1', 'E to D, whole step down'],
        ['minor-sub', 'mixture', 'A ↔ A♭', 'A compared with A♭'],
        ['tonic-sub', 'iii', 'E = E', 'E held as E'],
    ] as const)('previews a supported connection in %s without selecting a tone', (kind, id, caption, spoken) => {
        const example = examples(kind).find(item => item.id === id)!;
        render(<RelationExampleView example={example} onOpenChord={vi.fn()} activeStep={null} />);
        expect(screen.getByText(caption)).toBeTruthy();
        expect(screen.getByRole('status').textContent).toBe(spoken);
        expect(screen.queryByRole('button', { pressed: true })).toBeNull();
    });

    it('leaves the preview empty when the example supplies no connections', () => {
        const example = { ...examples('dominant')[0], transitions: [] };
        render(<RelationExampleView example={example} onOpenChord={vi.fn()} activeStep={null} />);
        expect(screen.getByRole('status').textContent).toBe('');
        expect(screen.getByRole('list', { name: 'Tone correspondence' }).children).toHaveLength(0);
        expect(screen.queryByText('No link')).toBeNull();
    });

    it('keeps numerical diagnostics collapsed and exposes them on demand', async () => {
        const user = userEvent.setup();
        render(<RelationExampleView example={examples('dominant')[0]} onOpenChord={vi.fn()} activeStep={null} />);
        const details = screen.getByText('Common and changed tones').closest('details')!;
        expect(details.open).toBe(false);
        expect(within(details).getByText(/Root distance:/)).toBeTruthy();
        expect(screen.getByText('P5 down / P4 up')).toBeTruthy();
        await user.click(screen.getByText('Common and changed tones'));
        expect(details.open).toBe(true);
    });

    it('connects a selected dominant third to its destination and permits keyboard deselection', async () => {
        const user = userEvent.setup();
        render(<RelationExampleView example={examples('dominant')[0]} onOpenChord={vi.fn()} activeStep={null} />);
        const leadingTone = screen.getByRole('button', { name: /^B, degree 3 in G7$/ });
        leadingTone.focus();
        await user.keyboard('{Enter}');
        expect(leadingTone.getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: /^C, degree 1 in C, connected to selected tone$/ }).getAttribute('data-linked')).toBe('true');
        expect(screen.getByText('B → C ↑½')).toBeTruthy();
        await user.keyboard('{Enter}');
        expect(leadingTone.getAttribute('aria-pressed')).toBe('false');
        expect(screen.queryByRole('button', { name: /connected to selected tone/ })).toBeNull();
    });

    it('marks both diminished neighbors when their shared destination is selected', async () => {
        const user = userEvent.setup();
        render(<RelationExampleView example={examples('common-tone', true)[0]} onOpenChord={vi.fn()} activeStep={null} />);
        await user.click(screen.getByRole('button', { name: /^G, degree 5 in C$/ }));
        expect(screen.getByRole('button', { name: /^F#, .*connected to selected tone$/ }).getAttribute('data-linked')).toBe('true');
        expect(screen.getByRole('button', { name: /^A, .*connected to selected tone$/ }).getAttribute('data-linked')).toBe('true');
        expect(screen.getByRole('button', { name: /^D#, degree/ }).getAttribute('data-linked')).toBe('false');
        expect(screen.getByText('F♯ → G ↑½')).toBeTruthy();
        expect(screen.getByText('A → G ↓1')).toBeTruthy();
    });

    it('opens the canonical chord even when analysis notes use enharmonic aliases', async () => {
        const user = userEvent.setup();
        const example = examples('common-tone', true)[0];
        const open = vi.fn();
        render(<RelationExampleView example={example} onOpenChord={open} activeStep={null} />);
        expect(screen.getByRole('button', { name: /^D#, degree/ })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: `Open ${example.steps[0].chord.name} in Chord` }));
        expect(open).toHaveBeenCalledExactlyOnceWith(example.steps[0].chord);
        expect(open.mock.calls[0][0].tones.map((tone: { name: string }) => tone.name)).toEqual(['C', 'Eb', 'Gb', 'Bbb']);
    });

    it('shows comparison tone relationships without resolving-tone language', () => {
        render(<RelationExampleView example={examples('tonic-sub')[0]} onOpenChord={vi.fn()} activeStep={null} />);
        expect(screen.getByRole('region', { name: 'Chord comparison' })).toBeTruthy();
        expect(screen.queryByText('→ Resolving tones')).toBeNull();
        expect(screen.getByLabelText('Tone correspondence').textContent).not.toContain(' to ');
    });

    it('shows a non-directional label for changed comparison tones', async () => {
        const user = userEvent.setup();
        const example = examples('minor-sub').find(item => item.id === 'mixture')!;
        render(<RelationExampleView example={example} onOpenChord={vi.fn()} activeStep={null} />);
        await user.click(screen.getByRole('button', { name: 'A, degree 3 in Fmaj7' }));
        expect(screen.getByText('A ↔ A♭')).toBeTruthy();
        expect(screen.getByRole('status').textContent).toBe('A compared with A♭');
    });

    it('places both captions on their own side of a selected middle chord', async () => {
        const user = userEvent.setup();
        render(<RelationExampleView example={examples('ii-v')[0]} onOpenChord={vi.fn()} activeStep={null} />);
        const middle = screen.getByRole('button', { name: 'B, degree 3 in G7' });
        await user.click(middle);
        const arrival = screen.getByText('C → B ↓½'), departure = screen.getByText('B → C ↑½');
        expect(parseFloat(arrival.style.left)).toBeLessThan(parseFloat(departure.style.left));
        expect(screen.getByRole('status').textContent).toContain('C to B, ½ step down. B to C, ½ step up');
    });

    it('keeps A above B when the substitute is selected, with playing state on B only', async () => {
        const user = userEvent.setup();
        const [original, substitute] = examples('tritone');
        const { rerender } = render(<RelationExampleView example={original} alternative={substitute} onOpenChord={vi.fn()} activeStep={1} />);
        const comparison = screen.getByRole('table', { name: 'Tritone substitution comparison' });
        const approachTitles = within(comparison).getAllByRole('columnheader');
        expect(approachTitles.map(title => title.textContent)).toEqual(['A · Original dominantG7 → C', 'B · Tritone substituteD♭7 → C']);
        expect(approachTitles[0].getAttribute('aria-current')).toBe('true');
        expect([...comparison.querySelectorAll('tbody:first-of-type td')].map(cell => cell.textContent))
            .toEqual(['B 3rd', 'C♭ ♭7', 'F ♭7', 'F 3rd']);
        const disclosure = screen.getByText('Compare voice leading');
        expect(disclosure.closest('details')!.open).toBe(false);
        await user.click(disclosure);
        expect(disclosure.closest('details')!.open).toBe(true);
        expect(screen.getAllByRole('heading', { level: 4 }).map(heading => heading.textContent)).toEqual(['A — Original dominant', 'B — Tritone substitute']);
        rerender(<RelationExampleView example={substitute} alternative={original} onOpenChord={vi.fn()} activeStep={1} />);
        expect(screen.getAllByRole('heading', { level: 4 }).map(heading => heading.textContent)).toEqual(['A — Original dominant', 'B — Tritone substitute']);
        expect(approachTitles[1].getAttribute('aria-current')).toBe('true');
        expect(disclosure.closest('details')!.open).toBe(true);
        const originalDiagram = screen.getByRole('region', { name: 'A — Original dominant' });
        const substituteDiagram = screen.getByRole('region', { name: 'B — Tritone substitute' });
        const originalB = within(originalDiagram).getByRole('button', { name: /^B, degree 3 in G7$/ });
        const substituteCb = within(substituteDiagram).getByRole('button', { name: /^Cb, degree b7 in D♭7$/ });
        const originalF = within(originalDiagram).getByRole('button', { name: /^F, degree b7 in G7$/ });
        const substituteF = within(substituteDiagram).getByRole('button', { name: /^F, degree 3 in D♭7$/ });
        // Rows are roles, not pitch: the shared tritone sits in each dominant's own 3rd/♭7 rows.
        expect(originalF.style.top).toBe(substituteCb.style.top);
        expect(originalB.style.top).toBe(substituteF.style.top);
        const destination = (diagram: HTMLElement) => ['C', 'E', 'G'].map(note => within(diagram).getByRole('button', { name: new RegExp(`^${note}, degree .+ in C$`) }).style.top);
        expect(destination(substituteDiagram)).toEqual(destination(originalDiagram));
        expect(originalDiagram.querySelectorAll('[data-playing="true"]')).toHaveLength(0);
        expect(substituteDiagram.querySelectorAll('[data-playing="true"]').length).toBeGreaterThan(0);
    });

    it('aligns the actual enharmonic guide pairs and root paths of the transposed examples', () => {
        const [original, substitute] = exploreRelation({
            kind: 'tritone', frame: { tonic: 'D', mode: 'major', lens: 'jazz-pop' }, target: { root: 'D', chordId: 'minor-7' },
        }).examples;
        render(<RelationExampleView example={substitute} alternative={original} onOpenChord={vi.fn()} activeStep={null} />);
        const table = screen.getByRole('table');
        expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent))
            .toEqual(['A · Original dominantA7 → Dm7', 'B · Tritone substituteE♭7 → Dm7']);
        expect(within(table).getAllByRole('cell').map(cell => cell.textContent))
            .toEqual(['C♯ 3rd', 'D♭ ♭7', 'G ♭7', 'G 3rd', 'A → DP5 down / P4 up', 'E♭ → Dm2 down']);
    });

    it('badges an analytical slash bass in its own role row instead of moving it to the bottom', () => {
        const [example] = exploreRelation({
            kind: 'cadence', frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' }, target: { root: 'C', chordId: 'major', bass: 'E' },
            context: { before: { root: 'G', chordId: 'dominant-7', bass: 'B' }, phraseEnding: true },
        }).examples;
        render(<RelationExampleView example={example} onOpenChord={vi.fn()} activeStep={null} />);
        const bassE = screen.getByRole('button', { name: /^E, degree 3, bass in C\/E$/ });
        const bassB = screen.getByRole('button', { name: /^B, degree 3, bass in G7\/B$/ });
        expect(bassE.getAttribute('data-bass')).toBe('true');
        expect(bassB.getAttribute('data-bass')).toBe('true');
        // Role rows are unchanged: the root stays below the badged 3rd.
        const root = screen.getByRole('button', { name: /^C, degree 1 in C\/E$/ });
        expect(parseFloat(root.style.top)).toBeGreaterThan(parseFloat(bassE.style.top));
        expect(screen.getAllByText('· bass')).toHaveLength(2);
    });

    it('shows no bass badge when no bass is supplied', () => {
        render(<RelationExampleView example={examples('dominant')[0]} onOpenChord={vi.fn()} activeStep={null} />);
        expect(screen.queryByText('· bass')).toBeNull();
        expect(document.querySelectorAll('[data-bass="true"]')).toHaveLength(0);
    });

    it('states pitch direction in the selection detail, not by line slope', async () => {
        const user = userEvent.setup();
        render(<RelationExampleView example={examples('dominant')[0]} onOpenChord={vi.fn()} activeStep={null} />);
        await user.click(screen.getByRole('button', { name: /^B, degree 3 in G7$/ }));
        expect(screen.getByText('B → C ↑½')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: /^B, degree 3 in G7/ }));
        await user.click(screen.getByRole('button', { name: /^G, degree 1 in G7$/ }));
        expect(screen.getByText('G = G')).toBeTruthy();
        expect(screen.getByRole('status').textContent).toBe('G held as G');
        await user.click(screen.getByRole('button', { name: /^D, degree 5 in G7/ }));
        expect(screen.getByText('No link')).toBeTruthy();
        expect(screen.queryByText('G = G')).toBeNull();
    });

    it('explains that rows are chord roles, not register', () => {
        render(<RelationExampleView example={examples('fifths')[0]} onOpenChord={vi.fn()} activeStep={null} />);
        expect(screen.getByText('Rows · chord roles, root at bottom')).toBeTruthy();
    });
});
