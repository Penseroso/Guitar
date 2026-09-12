import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ChordModeWorkspace } from './ChordModeWorkspace';

it('offers one root dial trigger and the shared chord selector', () => {
    const markup = renderToStaticMarkup(<ChordModeWorkspace
        chordType="major" onChordTypeChange={() => {}}
        chordSelectorGroups={[{ id: 'triad', label: 'Triads', options: [{ id: 'major', stateValue: 'major', label: 'Major' }] }]}
        root={0} scaleGroup="Diatonic Modes" scaleName="Ionian" onRootChange={() => {}}
        context="standalone" onContextChange={() => {}}
        explorationPanel={<section>Shared voicing browser</section>}
    />);
    expect(markup.match(/aria-label="Root /g)?.length).toBe(1);
    expect(markup).toContain('Chord type');
    expect(markup).toContain('Shared voicing browser');
    expect(markup).toContain('Hold &amp; choose');
    expect(markup).not.toContain('<dialog');
    expect(markup).not.toContain('Chord Preview');
    expect(markup).not.toContain('Root Navigator');
    expect(markup.match(/aria-pressed="true"/g)?.length).toBe(1);
});
