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

    it('keeps numerical diagnostics collapsed and exposes them on demand', async () => {
        const user = userEvent.setup();
        render(<RelationExampleView example={examples('dominant')[0]} onOpenChord={vi.fn()} activeStep={null} />);
        const details = screen.getByText('Details').closest('details')!;
        expect(details.open).toBe(false);
        expect(within(details).getByText(/Root distance:/)).toBeTruthy();
        expect(screen.getByText('P5 down / P4 up')).toBeTruthy();
        await user.click(screen.getByText('Details'));
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
        expect(screen.getByText('B → C')).toBeTruthy();
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

    it('keeps A above B when the substitute is selected, with playing state on B only', () => {
        const [original, substitute] = examples('tritone');
        const { rerender } = render(<RelationExampleView example={original} alternative={substitute} onOpenChord={vi.fn()} activeStep={1} />);
        expect(screen.getAllByRole('heading', { level: 4 }).map(heading => heading.textContent)).toEqual(['A — Original dominant', 'B — Tritone substitute']);
        rerender(<RelationExampleView example={substitute} alternative={original} onOpenChord={vi.fn()} activeStep={1} />);
        expect(screen.getAllByRole('heading', { level: 4 }).map(heading => heading.textContent)).toEqual(['A — Original dominant', 'B — Tritone substitute']);
        const originalDiagram = screen.getByRole('region', { name: 'A — Original dominant' });
        const substituteDiagram = screen.getByRole('region', { name: 'B — Tritone substitute' });
        const originalB = within(originalDiagram).getByRole('button', { name: /^B, degree 3 in G7$/ });
        const substituteCb = within(substituteDiagram).getByRole('button', { name: /^Cb, degree b7 in D♭7$/ });
        const originalF = within(originalDiagram).getByRole('button', { name: /^F, degree b7 in G7$/ });
        const substituteF = within(substituteDiagram).getByRole('button', { name: /^F, degree 3 in D♭7$/ });
        expect(substituteCb.style.top).toBe(originalB.style.top);
        expect(substituteF.style.top).toBe(originalF.style.top);
        expect(originalDiagram.querySelectorAll('[data-playing="true"]')).toHaveLength(0);
        expect(substituteDiagram.querySelectorAll('[data-playing="true"]').length).toBeGreaterThan(0);
    });
});
