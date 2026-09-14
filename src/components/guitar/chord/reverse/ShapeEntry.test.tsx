import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { applyCellClick, ShapeEntry } from './ShapeEntry';
import type { ShapeStates } from '@/domain/chord/reverse/enteredShape';

const openC: ShapeStates = [0, 1, 0, 2, 3, -1];
const silent: ShapeStates = [-1, -1, -1, -1, -1, -1];

describe('ShapeEntry', () => {
    it('renders the same shared Fretboard component Scale mode uses, not a separate diagram', () => {
        const markup = renderToStaticMarkup(<ShapeEntry states={silent} onChange={() => {}} />);
        expect(markup).toContain('fretboardContainer');
        expect(markup).not.toContain('<fieldset');
        expect(markup).not.toContain('role="radiogroup"');
    });

    it('makes every string/fret cell clickable and focusable, not windowed to a handful of frets', () => {
        const markup = renderToStaticMarkup(<ShapeEntry states={silent} onChange={() => {}} />);
        // Fretboard models frets 0-24 across 6 strings = 150 positions, each exactly one target.
        expect(markup.match(/role="button"/g)).toHaveLength(150);
    });

    it('shows a dot for every currently entered note (open and fretted), and nothing for muted strings', () => {
        const markup = renderToStaticMarkup(<ShapeEntry states={openC} onChange={() => {}} />);
        // openC sounds on 5 strings (high E open, B fret1, G open, D fret2, A fret3); low E is muted.
        expect(markup.match(/noteRoot|noteChordTone|note3rd|note5th|note7th/g)?.length).toBeGreaterThanOrEqual(5);
    });

    it('keeps an already-placed note itself clickable, not the (now inert) empty cell beneath it — one target per position', () => {
        const markup = renderToStaticMarkup(<ShapeEntry states={openC} onChange={() => {}} />);
        // Still exactly 150: a note position hands its one interactive target to the note cell,
        // not both, so the note-dot overlay can never silently swallow a click meant for the cell.
        expect(markup.match(/role="button"/g)).toHaveLength(150);
        expect(markup).toContain('currently placed');
    });

    it('exposes exactly one Tab stop across the whole board (roving tabindex), defaulting to string 1 fret 0', () => {
        const markup = renderToStaticMarkup(<ShapeEntry states={silent} onChange={() => {}} />);
        expect(markup.match(/tabIndex=0|tabindex="0"/g)).toHaveLength(1);
        expect(markup).toMatch(/tabindex="0"[^>]*aria-label="String 1, fret 0"/);
    });
});

describe('applyCellClick', () => {
    it('selects an empty cell, replacing whatever the string previously held', () => {
        expect(applyCellClick(silent, 4, 3)).toEqual([-1, -1, -1, -1, 3, -1]);
        expect(applyCellClick([-1, -1, -1, -1, 5, -1], 4, 3)).toEqual([-1, -1, -1, -1, 3, -1]);
    });

    it('mutes the string when the already-selected cell is clicked again', () => {
        expect(applyCellClick([-1, -1, -1, -1, 3, -1], 4, 3)).toEqual([-1, -1, -1, -1, -1, -1]);
    });

    it('selecting open (fret 0) again also mutes, same as any other fret', () => {
        expect(applyCellClick([0, -1, -1, -1, -1, -1], 0, 0)).toEqual([-1, -1, -1, -1, -1, -1]);
    });

    it('never mutates the input array', () => {
        const before: ShapeStates = [0, -1, -1, -1, -1, -1];
        const snapshot = [...before];
        applyCellClick(before, 0, 5);
        expect(before).toEqual(snapshot);
    });
});
