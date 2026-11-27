// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { CircleOfFifths } from './CircleOfFifths';

afterEach(cleanup);

it.each([
    { tonic: 2, role: 'vii°', note: 'C#' },
    { tonic: 1, role: 'IV', note: 'Gb' },
])('pairs $role with $note on both rings in Ionian at pitch class $tonic', ({ tonic, role, note }) => {
    const { container } = render(<CircleOfFifths selectedKey={tonic} selectedScaleGroup="Diatonic Modes"
        selectedScaleName="Ionian" onKeySelect={() => {}} />);
    const wedges = Array.from(container.querySelectorAll('svg > g'), wedge =>
        Array.from(wedge.querySelectorAll('text'), label => label.textContent));
    expect(wedges.map(labels => labels.slice(0, 2))).toContainEqual([role, note]);
    expect(wedges.map(labels => labels.slice(-2))).toContainEqual([note.toLowerCase(), role]);
});

it('keeps both conventional key names on an unannotated enharmonic seam', () => {
    const { getByText } = render(<CircleOfFifths selectedKey={0} selectedScaleGroup="Diatonic Modes"
        selectedScaleName="Ionian" onKeySelect={() => {}} />);
    expect(getByText('Gb/F#')).toBeTruthy();
    expect(getByText('eb/d#')).toBeTruthy();
});
