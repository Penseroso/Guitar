// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ChordsBuiltFromScalePanel } from './ChordsBuiltFromScalePanel';
import { PlayThisScaleOverPanel } from './PlayThisScaleOverPanel';
import { ScaleHarmonicBridgePanel } from './ScaleHarmonicBridgePanel';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { getScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';

afterEach(cleanup);

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
        expect(markup).toContain('Primary · C Ionian');
    });

    it('shows tone roles only in the chord-pairing view without clearing the selected analysis', async () => {
        const user = userEvent.setup();
        const analysis = getScaleToneAnalysis(createScaleRef('Diatonic Modes', 'Ionian', 0), 'major-9');
        render(<ScaleHarmonicBridgePanel scaleGroup="Diatonic Modes" scaleName="Ionian" tonicPitchClass={0}
            selectedChordId="major-9" analysis={analysis} />);
        expect(screen.getByText('Tone roles')).toBeTruthy();
        expect(screen.getByText('Analyzing Cmaj9')).toBeTruthy();
        await user.click(screen.getByRole('tab', { name: 'Chords built from this scale' }));
        expect(screen.queryByText('Tone roles')).toBeNull();
        await user.click(screen.getByRole('tab', { name: 'Play this scale over' }));
        expect(screen.getByText('Analyzing Cmaj9')).toBeTruthy();
    });
});

describe('PlayThisScaleOverPanel states only what the domain computed', () => {
    it('separates the practice claim from the note-containment claim', () => {
        const markup = playOver('Diatonic Modes', 'Ionian', 0);
        expect(markup).toContain('Primary · C Ionian');
        expect(markup).toContain('Shared notes only · pairing unverified');
        expect(markup).toContain('Cmaj7');
        expect(markup).toContain('Csus4');
    });

    it('distinguishes characteristic modal colors from primary chords without overclaiming', () => {
        const phrygian = playOver('Diatonic Modes', 'Phrygian', 0);
        expect(phrygian).toContain('Color · C Phrygian');
        expect(phrygian).toContain('Cm7');
        expect(phrygian).not.toContain('Primary · C Phrygian');

        const lydianDom = playOver('Jazz Minor Modes', 'Lydian Dominant', 0);
        expect(lydianDom).toContain('Color · C Lydian Dominant');
        expect(lydianDom).toContain('C7');
        expect(lydianDom).not.toContain('Primary · C Lydian Dominant');

        const locrianNat2 = playOver('Jazz Minor Modes', 'Locrian ♮2', 0);
        expect(locrianNat2).toContain('Color · C Locrian n2');
        expect(locrianNat2).toContain('Cm7♭5');
        expect(locrianNat2).not.toContain('Primary · C Locrian n2');
    });

    it('states that the natural 5th is altered rather than claiming mechanical substitution', () => {
        const markup = renderToStaticMarkup(<PlayThisScaleOverPanel scaleGroup="Jazz Minor Modes" scaleName="Altered scale" tonicPitchClass={0} selectedChordId="hendrix-7-sharp-9" />);
        expect(markup).toContain('C7♯9');
        expect(markup).toContain('Outside scale · G');
        expect(markup).not.toContain('The scale replaces G');
    });

    it('says plainly when no curated chord pairing exists for the scale', () => {
        expect(playOver('Harmonic Minor Modes', 'Lydian #2', 0)).toContain('Curated pairings · none');
    });

    it('renders chord tones in the chord\'s own spelling', () => {
        const markup = renderToStaticMarkup(<PlayThisScaleOverPanel scaleGroup="Diatonic Modes" scaleName="Ionian" tonicPitchClass={6} selectedChordId="major-7" />);
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

    it('explains the intentional seven-note scope instead of showing invented chords for non-heptatonic scales', () => {
        const markup = builtFrom('Pentatonic', 'Major Pentatonic', 0);
        expect(markup).toContain('intentionally scoped to seven-note scales');
        expect(markup).toContain('5 notes');
        expect(markup).not.toContain('Triads');
    });
});
