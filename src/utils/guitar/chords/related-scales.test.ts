import { describe, expect, it } from 'vitest';

import { getRelatedScaleSuggestionsForChord } from './related-scales';

describe('chord related scale suggestions', () => {
    it('maps major-seven colors to supported major-family scales', () => {
        const suggestions = getRelatedScaleSuggestionsForChord('major-7');

        expect(suggestions.map((suggestion) => suggestion.name)).toEqual([
            'Ionian',
            'Lydian',
            'Major Pentatonic',
        ]);
        expect(suggestions[0]?.category).toBe('primary');
    });

    it('maps dominant thirteenth colors to natural, color, and altered options', () => {
        const suggestions = getRelatedScaleSuggestionsForChord('dominant-13');

        expect(suggestions.map((suggestion) => suggestion.name)).toEqual([
            'Mixolydian',
            'Lydian Dominant',
            'Altered scale',
        ]);
    });

    it('maps half-diminished chords to locrian-family options only when supported', () => {
        const suggestions = getRelatedScaleSuggestionsForChord('half-diminished-7');

        expect(suggestions.map((suggestion) => suggestion.name)).toEqual([
            'Locrian',
            'Locrian ♮2',
        ]);
    });

    it('provides modal suspended options without inventing unsupported inventory', () => {
        const suggestions = getRelatedScaleSuggestionsForChord('sus4');

        expect(suggestions.map((suggestion) => suggestion.name)).toEqual([
            'Mixolydian',
            'Dorian',
            'Ionian',
        ]);
    });
});
