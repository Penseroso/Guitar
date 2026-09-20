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
        expect(markup).toContain('Primary chords to play');
    });
});

describe('PlayThisScaleOverPanel states only what the domain computed', () => {
    it('separates the practice claim from the note-containment claim', () => {
        const markup = playOver('Diatonic Modes', 'Ionian', 0);
        expect(markup).toContain('Primary chords to play');
        expect(markup).toContain('whose every note is in');
        expect(markup).toContain('Cmaj7');
        expect(markup).toContain('Csus4');
    });

    it('distinguishes characteristic modal colors from primary chords without overclaiming', () => {
        const phrygian = playOver('Diatonic Modes', 'Phrygian', 0);
        expect(phrygian).toContain('Characteristic modal and color pairings for C Phrygian');
        expect(phrygian).toContain('Cm7');
        expect(phrygian).not.toContain('Primary chords to play');

        const lydianDom = playOver('Jazz Minor Modes', 'Lydian Dominant', 0);
        expect(lydianDom).toContain('Characteristic modal and color pairings for C Lydian Dominant');
        expect(lydianDom).toContain('C7');
        expect(lydianDom).not.toContain('Primary chords to play');

        const locrianNat2 = playOver('Jazz Minor Modes', 'Locrian ♮2', 0);
        expect(locrianNat2).toContain('Characteristic modal and color pairings');
        expect(locrianNat2).toContain('Cm7♭5');
        expect(locrianNat2).not.toContain('Primary chords to play');
    });

    it('states that the natural 5th is altered rather than claiming mechanical substitution', () => {
        const markup = playOver('Jazz Minor Modes', 'Altered scale', 0);
        expect(markup).toContain('C7♯9');
        expect(markup).toContain('Natural 5th (G) is altered in this scale');
        expect(markup).not.toContain('The scale replaces G');
    });

    it('says plainly when no curated chord pairing exists for the scale', () => {
        expect(playOver('Harmonic Minor Modes', 'Lydian #2', 0)).toContain('No curated standard chord pairings for C Lydian #2');
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
