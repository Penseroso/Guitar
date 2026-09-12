import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ChordModeWorkspace } from './ChordModeWorkspace';

it('offers root, family navigation and an explicit playing context', () => {
    const markup = renderToStaticMarkup(<ChordModeWorkspace
        chordType="major" onChordTypeChange={() => {}}
        chordSelectorGroups={[{ id: 'triad', label: 'Triads', options: [{ id: 'major', stateValue: 'major', label: 'Major' }] }]}
        root={0} onRootChange={() => {}}
        context="standalone" onContextChange={() => {}}
        explorationPanel={<section>Shared voicing browser</section>}
    />);
    expect(markup.match(/aria-label="Root /g)?.length).toBe(1);
    expect(markup).toContain('Chord type');
    expect(markup).toContain('Shared voicing browser');
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('Playing context');
    expect(markup).toContain('Standalone');
    expect(markup).toContain('Accompaniment');
    expect(markup).toContain('type="radio"');
});
