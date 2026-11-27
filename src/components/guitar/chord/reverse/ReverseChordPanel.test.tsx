// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReverseChordPanel } from './ReverseChordPanel';
import type { ShapeStates } from '@/domain/chord/reverse/enteredShape';

const openC: ShapeStates = [0, 1, 0, 2, 3, -1];
const silent: ShapeStates = [-1, -1, -1, -1, -1, -1];
const noop = () => {};

afterEach(cleanup);

describe('ReverseChordPanel', () => {
    it('shows a Best-match section and one note strip for an entered shape', () => {
        const markup = renderToStaticMarkup(<ReverseChordPanel states={openC} onStatesChange={noop} />);
        expect(markup).toContain('Best match');
        expect(markup).toContain('Played notes');
    });

    it('holds the played notes and bass fixed while selecting or clearing C6 and Am7/C', () => {
        const onEdit = vi.fn();
        const ui = render(<ReverseChordPanel states={[5, -1, 0, 2, 3, -1]} onStatesChange={onEdit} />);
        const notes = ui.getByRole('list', { name: 'Played notes' });
        const cells = within(notes).getAllByRole('listitem');
        const names = () => cells.map(cell => cell.querySelector('strong')?.textContent);
        const degrees = () => cells.map(cell => cell.querySelector('span')?.textContent);
        const c6 = ui.getByRole('button', { name: 'C6' });
        const am7 = ui.getByRole('button', { name: 'Am7/C' });
        expect(names()).toEqual(['C3', 'E3', 'G3', 'A4']);
        expect(degrees()).toEqual([undefined, undefined, undefined, undefined]);
        fireEvent.click(c6);
        expect(degrees()).toEqual(['Root', '3', '5', '6']);
        fireEvent.click(am7);
        expect(degrees()).toEqual(['♭3', '5', '♭7', 'Root']);
        expect(names()).toEqual(['C3', 'E3', 'G3', 'A4']);
        expect(within(cells[0]).getByText('Bass')).toBeTruthy();
        expect(am7.getAttribute('aria-pressed')).toBe('true');
        expect(ui.getByText('first inversion')).toBeTruthy();
        expect(ui.queryByText(/same notes also named/i)).toBeNull();
        fireEvent.click(am7);
        expect(degrees()).toEqual([undefined, undefined, undefined, undefined]);
        expect(onEdit).not.toHaveBeenCalled();
    });

    it('prompts to start rather than showing any group when nothing is entered', () => {
        const markup = renderToStaticMarkup(<ReverseChordPanel states={silent} onStatesChange={noop} />);
        expect(markup).toContain('Tap a fret or open string to start.');
        expect(markup).not.toContain('Best match');
    });

    it('offers "Start from current voicing" only when the caller supplies it and the shape is empty', () => {
        const withCallback = renderToStaticMarkup(<ReverseChordPanel states={silent} onStatesChange={noop} onStartFromVoicing={noop} />);
        expect(withCallback).toContain('Start from current voicing');
        const withoutCallback = renderToStaticMarkup(<ReverseChordPanel states={silent} onStatesChange={noop} />);
        expect(withoutCallback).not.toContain('Start from current voicing');
        const shapeEntered = renderToStaticMarkup(<ReverseChordPanel states={openC} onStatesChange={noop} onStartFromVoicing={noop} />);
        expect(shapeEntered).not.toContain('Start from current voicing');
    });

    it('never leaks engine/debug internals into the reverse surface', () => {
        const markup = renderToStaticMarkup(<ReverseChordPanel states={openC} onStatesChange={noop} />);
        expect(markup).not.toMatch(/PASS|UNCERTAIN|allocation|scoreNumerator|tier|confidence|practical|Physical|Recommended/i);
    });

    it('does not offer a Show-voicings handoff to Forward', () => {
        const markup = renderToStaticMarkup(<ReverseChordPanel states={openC} onStatesChange={noop} />);
        expect(markup).not.toContain('Show voicings');
    });
});
