import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReverseChordPanel } from './ReverseChordPanel';
import type { ShapeStates } from '@/domain/chord/reverse/enteredShape';

const openC: ShapeStates = [0, 1, 0, 2, 3, -1];
const silent: ShapeStates = [-1, -1, -1, -1, -1, -1];
const noop = () => {};

describe('ReverseChordPanel', () => {
    it('shows a Best-match section with a concrete card for an entered shape', () => {
        const markup = renderToStaticMarkup(<ReverseChordPanel states={openC} onStatesChange={noop} />);
        expect(markup).toContain('Best match');
        expect(markup).toContain('Select a name → intervals on fretboard');
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
