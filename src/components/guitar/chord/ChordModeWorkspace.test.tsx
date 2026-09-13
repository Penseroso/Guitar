import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ChordModeWorkspace } from './ChordModeWorkspace';

const baseProps = {
    chordType: 'major', onChordTypeChange: () => {},
    chordSelectorGroups: [{ id: 'triad', label: 'Triads', options: [{ id: 'major', stateValue: 'major', label: 'Major' }] }],
    root: 0, onRootChange: () => {},
    explorationPanel: <section>Shared voicing browser</section>,
    reversePanel: <section>Reverse shape entry</section>,
};

it('offers root and family navigation above the voicing browser in Forward intent', () => {
    const markup = renderToStaticMarkup(<ChordModeWorkspace {...baseProps} intent="forward" onIntentChange={() => {}} />);
    expect(markup.match(/aria-label="Root /g)?.length).toBe(1);
    expect(markup).toContain('Chord type');
    expect(markup).toContain('Shared voicing browser');
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('type="radio"');
});

it('replaces Root/Chord type and the voicing browser with the reverse panel in Reverse intent', () => {
    const markup = renderToStaticMarkup(<ChordModeWorkspace {...baseProps} intent="reverse" onIntentChange={() => {}} />);
    expect(markup).toContain('Reverse shape entry');
    expect(markup).not.toContain('Shared voicing browser');
    expect(markup).not.toContain('Chord type');
    expect(markup.match(/aria-label="Root /g)).toBeNull();
});

it('exposes the Forward/Reverse toggle with a stable radio-group name', () => {
    const first = renderToStaticMarkup(<ChordModeWorkspace {...baseProps} intent="forward" onIntentChange={() => {}} />);
    const second = renderToStaticMarkup(<ChordModeWorkspace {...baseProps} intent="reverse" onIntentChange={() => {}} />);
    expect(first).toContain('name="chord-mode-intent"');
    expect(second).toContain('name="chord-mode-intent"');
    expect(first).toContain('Find voicings');
    expect(first).toContain('Name a shape');
});
