// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PracticeRangeControl } from './PracticeRangeControl';

afterEach(cleanup);

describe('PracticeRangeControl', () => {
    it('keeps one string selected and enables reset for a focused tone', () => {
        const onStringsChange = vi.fn();
        const onReset = vi.fn();
        const props = { fretRange: [0, 24] as [number, number], visibleStrings: [2], onRangeChange: vi.fn(), onStringsChange, onReset, hasToneFocus: false };
        const { rerender } = render(<PracticeRangeControl {...props} />);
        expect(screen.getByRole('button', { name: 'String 3' }).hasAttribute('disabled')).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'String 1' }));
        expect(onStringsChange).toHaveBeenCalledWith([0, 2]);
        rerender(<PracticeRangeControl {...props} visibleStrings={[0, 1, 2, 3, 4, 5]} />);
        expect(screen.getByRole('button', { name: 'Reset practice view' }).hasAttribute('disabled')).toBe(true);
        rerender(<PracticeRangeControl {...props} visibleStrings={[0, 1, 2, 3, 4, 5]} hasToneFocus />);
        fireEvent.click(screen.getByRole('button', { name: 'Reset practice view' }));
        expect(onReset).toHaveBeenCalledOnce();
    });
});
