// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { ScaleRelationsPanel } from './ScaleRelationsPanel';

afterEach(cleanup);

describe('ScaleRelationsPanel', () => {
    it('reveals comparison on demand and previews spelling-aware differences before navigation', async () => {
        const user = userEvent.setup();
        const navigate = vi.fn();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Diatonic Modes', 'Ionian', 9)} onNavigateScale={navigate} />);
        expect(screen.getByText('Related scales').closest('details')?.open).toBe(false);
        await user.click(screen.getByText('Related scales'));
        expect(screen.getByText('Related scales').closest('details')?.open).toBe(true);
        await user.selectOptions(screen.getByRole('combobox', { name: 'Scale' }), 'Diatonic Modes::Lydian');
        const comparison = within(screen.getByLabelText('Parallel comparison'));
        const current = within(comparison.getByRole('list', { name: 'Notes of A Ionian' }));
        const target = within(comparison.getByRole('list', { name: 'Notes of A Lydian' }));
        expect(current.getByText('D').closest('li')?.getAttribute('data-change')).toBe('from');
        expect(target.getByText('D♯').closest('li')?.getAttribute('data-change')).toBe('to');
        expect(target.getByText('♯4')).toBeTruthy();
        expect(current.getByText('C♯')).toBeTruthy();
        expect(navigate).not.toHaveBeenCalled();
        await user.click(comparison.getByRole('button', { name: 'Use A Lydian' }));
        expect(navigate).toHaveBeenCalledExactlyOnceWith(createScaleRef('Diatonic Modes', 'Lydian', 9));
    });

    it('keeps alternate structural spellings for a shared pitch class', async () => {
        const user = userEvent.setup();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Jazz Minor Modes', 'Altered scale', 0)} onNavigateScale={vi.fn()} />);
        await user.click(screen.getByText('Related scales'));
        await user.selectOptions(screen.getByRole('combobox'), 'Diatonic Modes::Ionian');
        const comparison = within(screen.getByLabelText('Parallel comparison'));
        expect(within(comparison.getByRole('list', { name: 'Notes of C Altered' })).getByText('F♭')).toBeTruthy();
        expect(within(comparison.getByRole('list', { name: 'Notes of C Ionian' })).getByText('E')).toBeTruthy();
        expect(within(comparison.getByRole('list', { name: 'Notes of C Altered' })).getByText('G♭')).toBeTruthy();
    });

    it('shows the complete C Ionian to Mixolydian note rows and highlights only the changed degree', async () => {
        const user = userEvent.setup();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Diatonic Modes', 'Ionian', 0)} onNavigateScale={vi.fn()} />);
        await user.click(screen.getByText('Related scales'));
        await user.selectOptions(screen.getByRole('combobox', { name: 'Scale' }), 'Diatonic Modes::Mixolydian');
        const comparison = screen.getByLabelText('Parallel comparison');
        const current = comparison.querySelectorAll('[aria-label="Notes of C Ionian"] [data-change]');
        const target = comparison.querySelectorAll('[aria-label="Notes of C Mixolydian"] [data-change]');
        expect(current).toHaveLength(1);
        expect(target).toHaveLength(1);
        expect(current[0].textContent).toContain('7B');
        expect(target[0].textContent).toContain('♭7B♭');
        expect(comparison.textContent).not.toContain('↓');
        expect(screen.queryByText('Origin')).toBeNull();
    });

    it('navigates sibling with both tonic and mode', async () => {
        const user = userEvent.setup();
        const navigate = vi.fn();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Diatonic Modes', 'Ionian', 0)} onNavigateScale={navigate} />);
        await user.click(screen.getByText('Related scales'));
        expect(screen.getByText('Same notes · new root')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'D Dorian' }));
        expect(navigate).toHaveBeenCalledExactlyOnceWith(createScaleRef('Diatonic Modes', 'Dorian', 2));
    });

    it('shows only meaningful subset and symmetry provenance', async () => {
        const user = userEvent.setup();
        const view = render(<ScaleRelationsPanel scaleRef={createScaleRef('Pentatonic', 'Major Pentatonic', 0)} onNavigateScale={vi.fn()} />);
        await user.click(screen.getByText('Related scales'));
        expect(screen.getByText('Registered subset')).toBeTruthy();
        expect(screen.getByText(/C Ionian · other parents possible/)).toBeTruthy();
        view.rerender(<ScaleRelationsPanel scaleRef={createScaleRef('Symmetric', 'Whole Tone', 0)} onNavigateScale={vi.fn()} />);
        expect(screen.getByText('Symmetry')).toBeTruthy();
        expect(screen.getByText(/Same notes after.*function may change/)).toBeTruthy();
        expect(screen.queryByText('Origin')).toBeNull();
    });
});
