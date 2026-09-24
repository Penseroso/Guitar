// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FretRangeControl } from './FretRangeControl';

afterEach(cleanup);

describe('FretRangeControl', () => {
    it('keeps keyboard changes within the 24-fret range and never crosses handles', () => {
        const onChange = vi.fn();
        const { rerender } = render(<FretRangeControl min={10} max={12} maxFret={24} ticks={[0, 12, 24]} onChange={onChange} />);
        const minimum = screen.getByRole('slider', { name: 'Minimum fret' });
        const maximum = screen.getByRole('slider', { name: 'Maximum fret' });
        fireEvent.keyDown(minimum, { key: 'End' });
        expect(onChange).toHaveBeenLastCalledWith(12, 12);
        fireEvent.keyDown(maximum, { key: 'Home' });
        expect(onChange).toHaveBeenLastCalledWith(10, 10);
        rerender(<FretRangeControl min={0} max={24} maxFret={24} ticks={[0, 12, 24]} onChange={onChange} />);
        fireEvent.keyDown(minimum, { key: 'ArrowLeft' });
        expect(onChange).toHaveBeenLastCalledWith(0, 24);
        fireEvent.keyDown(maximum, { key: 'PageUp' });
        expect(onChange).toHaveBeenLastCalledWith(0, 24);
        expect(maximum.getAttribute('aria-valuemax')).toBe('24');
    });

    it('commits the preview on pointer release', () => {
        const onChange = vi.fn();
        const { container } = render(<FretRangeControl min={0} max={24} maxFret={24} onChange={onChange} />);
        const track = container.querySelector('[class*="track"]') as HTMLDivElement;
        track.getBoundingClientRect = () => ({ left: 0, width: 240, top: 0, right: 240, bottom: 44, height: 44, x: 0, y: 0, toJSON: () => null });
        track.setPointerCapture = vi.fn();
        track.hasPointerCapture = vi.fn(() => true);
        track.releasePointerCapture = vi.fn();
        fireEvent.pointerDown(track, { pointerId: 7, button: 0, clientX: 60 });
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.pointerUp(track, { pointerId: 7, clientX: 60 });
        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenCalledWith(6, 24);
    });

    it.each(['pointerCancel', 'lostPointerCapture'] as const)('discards the preview on %s', completion => {
        const onChange = vi.fn();
        const { container } = render(<FretRangeControl min={0} max={24} maxFret={24} onChange={onChange} />);
        const track = container.querySelector('[class*="track"]') as HTMLDivElement;
        track.getBoundingClientRect = () => ({ left: 0, width: 240, top: 0, right: 240, bottom: 44, height: 44, x: 0, y: 0, toJSON: () => null });
        track.setPointerCapture = vi.fn();
        fireEvent.pointerDown(track, { pointerId: 7, button: 0, clientX: 60 });
        expect(screen.getByRole('slider', { name: 'Minimum fret' }).getAttribute('aria-valuenow')).toBe('6');
        fireEvent[completion](track, { pointerId: 7 });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('slider', { name: 'Minimum fret' }).getAttribute('aria-valuenow')).toBe('0');
    });
});
