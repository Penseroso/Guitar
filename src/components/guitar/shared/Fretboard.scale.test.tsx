// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Fretboard } from './Fretboard';
import type { FretboardProps } from '@/domain/shared/types';

afterEach(cleanup);
const props: FretboardProps = {
    activeNotes: [0, 1, 3, 4, 6, 8, 10], rootNote: 0,
    chordTones: [0, 3, 4, 10], modifierNotes: [], showChordTones: true,
    noteAnnotations: {
        3: { noteName: 'D♯', intervalLabel: '♯9', role: 'chord-tone' },
        4: { noteName: 'E', intervalLabel: '3', role: 'third' },
    },
};

describe('Scale fretboard annotation', () => {
    it('uses an explicit extension role and both label modes instead of semitone-third guessing', () => {
        const { container, rerender } = render(<Fretboard {...props} />);
        const sharpNine = container.querySelector('[data-pitch-class="3"]')!;
        const third = container.querySelector('[data-pitch-class="4"]')!;
        expect(sharpNine.textContent).toBe('D♯');
        expect(sharpNine.getAttribute('data-tone-role')).toBe('chord-tone');
        expect(sharpNine.firstElementChild?.className).not.toEqual(third.firstElementChild?.className);
        rerender(<Fretboard {...props} showIntervals />);
        expect(container.querySelector('[data-pitch-class="3"]')?.textContent).toBe('♯9');
    });

    it('focuses every occurrence within the requested strings and frets', () => {
        const { container } = render(<Fretboard {...props} fretRange={[4, 12]} visibleStrings={[0, 2]} focusedPitchClass={3} />);
        const notes = [...container.querySelectorAll('[data-pitch-class]')];
        expect(notes.length).toBeGreaterThan(0);
        for (const note of notes) {
            expect([0, 2]).toContain(Number(note.getAttribute('data-string')));
            const fret = Number(note.getAttribute('data-fret'));
            expect(fret).toBeGreaterThanOrEqual(4);
            expect(fret).toBeLessThanOrEqual(12);
            expect(note.hasAttribute('data-focused')).toBe(note.getAttribute('data-pitch-class') === '3');
        }
    });
});
