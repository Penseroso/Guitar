import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChordsBuiltFromScalePanel } from './ChordsBuiltFromScalePanel';
import { PlayThisScaleOverPanel } from './PlayThisScaleOverPanel';
import { ScaleHarmonicBridgePanel } from './ScaleHarmonicBridgePanel';

const playOver = (group: string, name: string, tonic: number) =>
    renderToStaticMarkup(<PlayThisScaleOverPanel scaleGroup={group} scaleName={name} tonicPitchClass={tonic} />);
const builtFrom = (group: string, name: string, tonic: number) =>
    renderToStaticMarkup(<ChordsBuiltFromScalePanel scaleGroup={group} scaleName={name} tonicPitchClass={tonic} />);

describe('ScaleHarmonicBridgePanel', () => {
    it('offers the two questions as separate tabs, defaulting to "Play this scale over"', () => {
        const markup = renderToStaticMarkup(
            <ScaleHarmonicBridgePanel scaleGroup="Diatonic Modes" scaleName="Ionian" tonicPitchClass={0} />
        );
        expect(markup).toContain('Play this scale over');
        expect(markup).toContain('Chords built from this scale');
        expect(markup).toContain('standard scale to play over');
    });
});

describe('PlayThisScaleOverPanel states only what the domain computed', () => {
    it('separates the practice claim from the note-containment claim', () => {
        const markup = playOver('Diatonic Modes', 'Ionian', 0);
        expect(markup).toContain('standard scale to play over');
        expect(markup).toContain('whose every note is in');
        expect(markup).toContain('Cmaj7');
        expect(markup).toContain('Csus4');
    });

    it('says which tone an altered-dominant pairing replaces, rather than implying a full fit', () => {
        const markup = playOver('Jazz Minor Modes', 'Altered scale', 0);
        expect(markup).toContain('C7♯9');
        expect(markup).toContain('The scale replaces G');
    });

    it('says plainly when no chord has this scale as its standard scale', () => {
        expect(playOver('Harmonic Minor Modes', 'Lydian #2', 0)).toContain('No chord in the library has');
    });

    it('renders chord tones in the chord\'s own spelling', () => {
        const markup = playOver('Diatonic Modes', 'Ionian', 6);
        expect(markup).toContain('F♯maj7');
        expect(markup).toContain('A♯');
        expect(markup).not.toContain('Bbm');
        expect(markup).not.toContain('B♭m');
    });
});

describe('ChordsBuiltFromScalePanel states only what the domain computed', () => {
    it('shows the degree-by-degree harmonization with its roman numerals', () => {
        const markup = builtFrom('Diatonic Modes', 'Ionian', 0);
        expect(markup).toContain('stacking');
        expect(markup).toContain('vii°');
        expect(markup).toContain('B°');
        expect(markup).toContain('Triads');
        expect(markup).toContain('Sevenths');
    });

    it('spells a raised second by the scale\'s own formula', () => {
        const markup = builtFrom('Harmonic Minor Modes', 'Lydian #2', 0);
        expect(markup).toContain('♯ii°');
        expect(markup).toContain('D♯°');
        expect(markup).not.toContain('E♭°');
    });

    it('spells sharp keys with sharps', () => {
        const markup = builtFrom('Diatonic Modes', 'Ionian', 6);
        expect(markup).toContain('G♯m');
        expect(markup).toContain('E♯°');
        expect(markup).not.toContain('A♭m');
    });

    it('explains the limit instead of showing invented chords for non-heptatonic scales', () => {
        const markup = builtFrom('Pentatonic', 'Major Pentatonic', 0);
        expect(markup).toContain('not shown for it');
        expect(markup).toContain('5 notes');
        expect(markup).not.toContain('Triads');
    });
});
