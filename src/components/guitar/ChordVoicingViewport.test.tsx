import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChordVoicingViewport } from './ChordVoicingViewport';

describe('ChordVoicingViewport', () => {
    it('shows a visible default scale selection and harmonic context on first render', () => {
        const markup = renderToStaticMarkup(
            <ChordVoicingViewport
                chordType="major"
                selectedKey={0}
                candidates={[]}
                activeCandidateId={null}
                tonalContext={{
                    selectedKey: 0,
                    tonicPitchClass: 0,
                    scaleGroup: 'Diatonic Modes',
                    scaleName: 'Ionian',
                }}
            />
        );

        expect(markup).toContain('Harmonic Context');
        expect(markup).toContain('Choose a Scale');
        expect(markup).toContain('Default');
        expect(markup).toContain('Default Scale Lens');
        expect(markup).toContain('Progression Context');
        expect(markup).not.toContain('Selection Notes');
        expect(markup).not.toContain('Missing required tones');
        expect(markup).not.toContain('Optional omissions');
    });
});
