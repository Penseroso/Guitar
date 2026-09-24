// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SwipePicker, type PickerOption } from './SwipePicker';

const options = [
    { value: 'major', label: 'Major', accessibleLabel: 'Major mode' },
    { value: 'minor', label: 'Minor', accessibleLabel: 'Minor mode' },
    { value: 'dorian', label: 'Dorian' },
];
const longOptions: PickerOption[] = [
    ...options,
    { value: 'phrygian', label: 'Phrygian' },
    { value: 'lydian', label: 'Lydian' },
    { value: 'mixolydian', label: 'Mixolydian' },
];

class TestPointerEvent extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
    }
}
beforeAll(() => vi.stubGlobal('PointerEvent', TestPointerEvent));
afterAll(() => vi.unstubAllGlobals());
afterEach(() => cleanup());

function mount(initial = 'major', pickerOptions: PickerOption[] = options) {
    const onChange = vi.fn();
    function Harness() {
        const [value, setValue] = useState(initial);
        return <SwipePicker label="Mode" value={value} options={pickerOptions} onChange={next => { onChange(next); setValue(next); }} />;
    }
    render(<Harness />);
    const picker = screen.getByRole('spinbutton', { name: 'Mode' });
    const control = picker.parentElement!;
    const capture = vi.fn();
    Object.defineProperty(control, 'setPointerCapture', { configurable: true, value: capture });
    return { onChange, picker, control, capture };
}
const pointer = (x: number, y = 20, pointerId = 1) => ({ pointerId, button: 0, clientX: x, clientY: y });

describe('SwipePicker bounded keyboard and pointer interaction', () => {
    it('exposes the current value and supports all arrow keys plus Home and End without wrapping', () => {
        const { picker, onChange } = mount();
        expect(picker.getAttribute('aria-valuemin')).toBe('1');
        expect(picker.getAttribute('aria-valuemax')).toBe('3');
        expect(picker.getAttribute('aria-valuetext')).toBe('Major mode');
        fireEvent.keyDown(picker, { key: 'ArrowLeft' });
        fireEvent.keyDown(picker, { key: 'Home' });
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.keyDown(picker, { key: 'ArrowRight' });
        expect(picker.getAttribute('aria-valuenow')).toBe('2');
        fireEvent.keyDown(picker, { key: 'ArrowDown' });
        fireEvent.keyDown(picker, { key: 'ArrowRight' });
        expect(onChange.mock.calls.map(([value]) => value)).toEqual(['minor', 'dorian']);
        fireEvent.keyDown(picker, { key: 'ArrowUp' });
        fireEvent.keyDown(picker, { key: 'ArrowLeft' });
        fireEvent.keyDown(picker, { key: 'End' });
        expect(picker.getAttribute('aria-valuetext')).toBe('Dorian');
        fireEvent.keyDown(picker, { key: 'Home' });
        fireEvent.keyDown(picker, { key: 'Tab' });
        expect(onChange.mock.calls.map(([value]) => value)).toEqual(['minor', 'dorian', 'minor', 'major', 'dorian', 'major']);
    });

    it('lets previous and next controls move one option and disables the unavailable neighbor', () => {
        const { picker, onChange } = mount();
        const previous = screen.getByRole('button', { name: 'Previous Mode' }) as HTMLButtonElement;
        const next = screen.getByRole('button', { name: 'Next Mode' }) as HTMLButtonElement;
        expect(previous.disabled).toBe(true);
        fireEvent.click(previous);
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.click(next);
        expect(previous.disabled).toBe(false);
        expect(picker.getAttribute('aria-valuetext')).toBe('Minor mode');
        fireEvent.click(next);
        expect(next.disabled).toBe(true);
        fireEvent.click(next);
        fireEvent.click(previous);
        expect(onChange.mock.calls.map(([value]) => value)).toEqual(['minor', 'dorian', 'minor']);
    });

    it('previews a horizontal drag, commits once on release, and suppresses its trailing click', () => {
        const { picker, control, capture, onChange } = mount();
        fireEvent.pointerDown(control, pointer(120));
        fireEvent.pointerMove(control, pointer(75));
        expect(capture).toHaveBeenCalledWith(1);
        expect(control.getAttribute('data-dragging')).toBe('true');
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.pointerUp(control, pointer(75));
        expect(onChange).toHaveBeenCalledExactlyOnceWith('minor');
        expect(control.getAttribute('data-dragging')).toBe('false');
        expect(document.activeElement).toBe(picker);
        fireEvent.click(screen.getByRole('button', { name: 'Next Mode' }), { detail: 1 });
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('allows a rightward drag to select the previous value', () => {
        const { control, onChange } = mount('minor');
        fireEvent.pointerDown(control, pointer(60));
        fireEvent.pointerMove(control, pointer(100));
        fireEvent.pointerUp(control, pointer(100));
        expect(onChange).toHaveBeenCalledExactlyOnceWith('major');
    });

    it('skips three items in a single 168px leftward drag and commits only on release', () => {
        const { picker, control, onChange } = mount('major', longOptions);
        fireEvent.pointerDown(control, pointer(240));
        fireEvent.pointerMove(control, pointer(184));
        fireEvent.pointerMove(control, pointer(128));
        fireEvent.pointerMove(control, pointer(72));
        expect(onChange).not.toHaveBeenCalled();
        expect(picker.getAttribute('aria-valuenow')).toBe('1');
        fireEvent.pointerUp(control, pointer(72));
        expect(onChange).toHaveBeenCalledExactlyOnceWith('phrygian');
        expect(picker.getAttribute('aria-valuenow')).toBe('4');
        expect(control.getAttribute('data-dragging')).toBe('false');
    });

    it('skips two items backwards in a single 112px rightward drag', () => {
        const { picker, control, onChange } = mount('lydian', longOptions);
        fireEvent.pointerDown(control, pointer(60));
        fireEvent.pointerMove(control, pointer(172));
        fireEvent.pointerUp(control, pointer(172));
        expect(onChange).toHaveBeenCalledExactlyOnceWith('dorian');
        expect(picker.getAttribute('aria-valuenow')).toBe('3');
    });

    it('clamps an oversized multi-item drag to the available first or last option', () => {
        const { picker, control, onChange } = mount('dorian', longOptions);
        fireEvent.pointerDown(control, pointer(100));
        fireEvent.pointerMove(control, pointer(1100));
        fireEvent.pointerUp(control, pointer(1100));
        expect(onChange).toHaveBeenCalledExactlyOnceWith('major');
        expect(picker.getAttribute('aria-valuenow')).toBe('1');
        onChange.mockClear();
        fireEvent.pointerDown(control, pointer(1100));
        fireEvent.pointerMove(control, pointer(100));
        fireEvent.pointerUp(control, pointer(100));
        expect(onChange).toHaveBeenCalledExactlyOnceWith('mixolydian');
        expect(picker.getAttribute('aria-valuenow')).toBe('6');
    });

    it('allows vertical scrolling without committing or capturing the pointer', () => {
        const { control, capture, onChange } = mount('minor');
        fireEvent.pointerDown(control, pointer(100, 20));
        fireEvent.pointerMove(control, pointer(102, 60));
        fireEvent.pointerMove(control, pointer(20, 61));
        fireEvent.pointerUp(control, pointer(20, 61));
        expect(capture).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
        expect(control.getAttribute('data-dragging')).toBe('false');
    });

    it('discards the preview on pointer cancellation', () => {
        const { control, onChange } = mount('minor');
        fireEvent.pointerDown(control, pointer(100));
        fireEvent.pointerMove(control, pointer(50));
        expect(control.getAttribute('data-dragging')).toBe('true');
        fireEvent.pointerCancel(control, pointer(50));
        fireEvent.pointerUp(control, pointer(50));
        expect(control.getAttribute('data-dragging')).toBe('false');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores a short horizontal drag and an unrelated pointer', () => {
        const { control, onChange } = mount('minor');
        fireEvent.pointerDown(control, pointer(100));
        fireEvent.pointerMove(control, pointer(30, 20, 2));
        fireEvent.pointerUp(control, pointer(30, 20, 2));
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.pointerMove(control, pointer(85));
        fireEvent.pointerUp(control, pointer(85));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does not wrap past either boundary on a long drag', () => {
        const { picker, control, onChange } = mount();
        fireEvent.pointerDown(control, pointer(100));
        fireEvent.pointerMove(control, pointer(240));
        fireEvent.pointerUp(control, pointer(240));
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.keyDown(picker, { key: 'End' });
        onChange.mockClear();
        fireEvent.pointerDown(control, pointer(240));
        fireEvent.pointerMove(control, pointer(100));
        fireEvent.pointerUp(control, pointer(100));
        expect(onChange).not.toHaveBeenCalled();
    });
});
