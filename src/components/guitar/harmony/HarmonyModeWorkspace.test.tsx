// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { exploreRelation } from '@/domain/harmony/relations';
import type { RelationQuery } from '@/domain/harmony/types';
import { DEFAULT_HARMONY_QUERY } from './useHarmony';
import { HarmonyModeWorkspace } from './HarmonyModeWorkspace';

afterEach(cleanup);
beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value: function (this: HTMLElement) { this.removeAttribute('popover'); } });
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value: function (this: HTMLElement) { this.setAttribute('popover', 'manual'); } });
});

function Harness({ initial }: { initial: RelationQuery }) {
    const [query, setQuery] = useState(initial);
    return <HarmonyModeWorkspace query={query} result={exploreRelation(query)} onQueryChange={setQuery} onOpenChord={vi.fn()} onOpenScale={vi.fn()} />;
}

describe('HarmonyModeWorkspace', () => {
    it('starts with the musical result and preserves explicit tone selection when settings are toggled', async () => {
        const user = userEvent.setup();
        render(<Harness initial={DEFAULT_HARMONY_QUERY} />);
        const edit = screen.getByRole('button', { name: /^Edit harmony/ });
        expect(edit.getAttribute('aria-expanded')).toBe('false');
        expect(edit.textContent).toContain('Key C major');
        expect(edit.textContent).toContain('V7 → I');
        expect(screen.queryByRole('spinbutton', { name: 'Destination quality' })).toBeNull();
        const voice = screen.getByRole('region', { name: 'Voice movement' });
        expect(within(voice).getByText('B → C ↑½')).toBeTruthy();
        expect(within(voice).queryByRole('button', { pressed: true })).toBeNull();
        await user.click(within(voice).getByRole('button', { name: 'F, degree b7 in G7' }));
        expect(within(voice).getByText('F → E ↓½')).toBeTruthy();
        expect(within(voice).queryByText('B → C ↑½')).toBeNull();
        edit.focus();
        await user.keyboard('{Enter}');
        expect(screen.getByRole('spinbutton', { name: 'Destination quality' })).toBeTruthy();
        await user.keyboard('{Enter}');
        expect(within(voice).getByText('F → E ↓½')).toBeTruthy();
    });
    it('keeps rule commentary in evidence regardless of its wording or length', () => {
        const result = exploreRelation(DEFAULT_HARMONY_QUERY);
        const observations = ['G held', 'The selected destination shares a tone with the approach chord in this illustrative dominant resolution.'];
        render(<HarmonyModeWorkspace query={DEFAULT_HARMONY_QUERY} result={{ ...result, observations, interpretations: [] }}
            onQueryChange={vi.fn()} onOpenChord={vi.fn()} onOpenScale={vi.fn()} />);
        const details = screen.getByText('Harmonic function evidence').closest('details')!;
        expect(details.open).toBe(false);
        for (const observation of observations) expect(within(details).getByText(observation)).toBeTruthy();
        expect(within(screen.getByRole('region', { name: 'Voice movement' })).getByText('B → C ↑½')).toBeTruthy();
    });

    it('preserves an imported sharp spelling in the key and target dials', () => {
        const query: RelationQuery = { ...DEFAULT_HARMONY_QUERY, frame: { ...DEFAULT_HARMONY_QUERY.frame, tonic: 'F#' }, target: { root: 'F#', chordId: 'major' } };
        render(<Harness initial={query} />);
        fireEvent.click(screen.getByRole('button', { name: /^Edit harmony/ }));
        expect(screen.getByRole('button', { name: 'Key F♯' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Destination root F♯' })).toBeTruthy();
        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.queryByText('How chords relate')).toBeNull();
        expect(screen.queryByText('Source and limits')).toBeNull();
    });

    it('uses the supplied cadence inversion and ending observations', async () => {
        const user = userEvent.setup();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, kind: 'cadence' }} />);
        fireEvent.click(screen.getByRole('button', { name: /^Edit harmony/ }));
        await user.click(screen.getByText('Cadence evidence'));
        expect(screen.getByText(/not an observed cadence/)).toBeTruthy();
        await user.click(screen.getByText('Cadence evidence'));
        expect(within(screen.getByRole('region', { name: 'Observed chords and phrase context' })).getByText('Choose preceding chord')).toBeTruthy();
        expect(screen.queryByText(/Needed: Preceding chord/)).toBeNull();
        expect(screen.getByText('Example in C major')).toBeTruthy();
        expect(screen.queryByRole('spinbutton', { name: 'Before quality' })).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Before root +' }));
        await user.click(within(screen.getByRole('dialog', { name: 'Choose root', hidden: true })).getByRole('option', { name: 'G', hidden: true }));
        expect(screen.getByRole('spinbutton', { name: 'Before quality' }).getAttribute('aria-valuetext')).toBe('7');
        await user.click(screen.getByRole('button', { name: 'Next Before bass' }));
        expect(screen.getByRole('spinbutton', { name: 'Before bass' }).getAttribute('aria-valuetext')).toBe('B');
        await user.click(screen.getByText('Cadence evidence'));
        expect(screen.getByLabelText('Phrase ending: unknown')).toBeTruthy();
        expect(screen.getByLabelText('Bass / inversion observed: unknown')).toBeTruthy();
        await user.selectOptions(screen.getByRole('combobox', { name: 'Phrase ending' }), 'true');
        await user.click(screen.getByRole('checkbox', { name: 'Bass / inversions verified' }));
        await user.type(screen.getByRole('textbox', { name: 'Soprano note' }), 'C');
        await user.tab();
        expect(screen.getByRole('heading', { name: 'Imperfect authentic cadence' })).toBeTruthy();
        expect(screen.getByLabelText('Bass / inversion observed: met')).toBeTruthy();
    });

    it('changes compact context values by keyboard without changing the selected chord', async () => {
        const user = userEvent.setup();
        render(<Harness initial={DEFAULT_HARMONY_QUERY} />);
        fireEvent.click(screen.getByRole('button', { name: /^Edit harmony/ }));
        const mode = screen.getByRole('spinbutton', { name: 'Major / Minor' });
        mode.focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByText('Theory style').closest('details')?.open).toBe(false);
        await user.click(screen.getByText('Theory style'));
        expect(screen.getByText('Theory style').closest('details')?.open).toBe(true);
        await user.click(screen.getByRole('button', { name: 'Next Style' }));
        expect(mode.getAttribute('aria-valuetext')).toBe('Minor');
        expect(screen.getByRole('spinbutton', { name: 'Style' }).getAttribute('aria-valuetext')).toBe('Classical');
        expect(screen.getByText('Roman numerals use the major-scale reference in both styles.')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Destination root C' })).toBeTruthy();
    });

    it('shows tonic-root C7 as contextual and refuses tonic-family substitution', async () => {
        const user = userEvent.setup();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, target: { root: 'C', chordId: 'dominant-7' } }} />);
        fireEvent.click(screen.getByRole('button', { name: /^Edit harmony/ }));
        expect(screen.getByText('Possible interpretation')).toBeTruthy();
        await user.click(screen.getByText('Harmonic function evidence'));
        expect(screen.getByText(/key center ≠ tonic function/)).toBeTruthy();
        expect(screen.queryByText('key center', { exact: true })).toBeNull();
        expect(screen.getByRole('button', { name: 'Open C7 in Chord' })).toBeTruthy();
        await user.click(screen.getByRole('tab', { name: 'Tonic substitutes' }));
        expect(screen.getByText('Outside current scope')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Play relation' })).toBeNull();
    });

    it('presents family comparison without motion and clears note focus after a relation change', async () => {
        const user = userEvent.setup();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, kind: 'tonic-sub' }} />);
        fireEvent.click(screen.getByRole('button', { name: /^Edit harmony/ }));
        expect(screen.getByRole('tab', { name: 'iii7' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'vi7' })).toBeTruthy();
        expect(screen.getByRole('region', { name: 'Chord comparison' })).toBeTruthy();
        const note = screen.getAllByRole('button', { name: /degree 1 in C/ })[0];
        await user.click(note);
        expect(note.getAttribute('aria-pressed')).toBe('true');
        await user.click(screen.getByRole('tab', { name: 'Dominant motion' }));
        await user.click(screen.getByRole('tab', { name: 'Tonic substitutes' }));
        expect(screen.getAllByRole('button', { name: /degree 1 in C/ })[0].getAttribute('aria-pressed')).toBe('false');
    });

    it('shows the preparation selected by the ii–V and IV–V menu choices', async () => {
        const user = userEvent.setup();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, kind: 'ii-v' }} />);
        fireEvent.click(screen.getByRole('button', { name: /^Edit harmony/ }));
        expect(screen.getByRole('button', { name: 'Open Dm7 in Chord' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Open Fmaj7 in Chord' })).toBeNull();
        await user.click(screen.getByRole('tab', { name: 'IV–V' }));
        expect(screen.getByRole('button', { name: 'Open Fmaj7 in Chord' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Open Dm7 in Chord' })).toBeNull();
        expect(screen.getByRole('heading', { name: 'IV–V preparation' })).toBeTruthy();
        expect(screen.queryByRole('tablist', { name: 'Examples' })).toBeNull();
    });

    it.each([
        ['minor', 'C', 'minor', 'V7 → i'],
        ['major', 'A', 'minor', 'V7/vi → vi'],
        ['major', 'G', 'dominant-7', 'V7/V → V7'],
    ] as const)('names the dominant destination in its actual frame: %s %s %s', (mode, root, chordId, label) => {
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, frame: { ...DEFAULT_HARMONY_QUERY.frame, mode }, target: { root, chordId } }} />);
        fireEvent.click(screen.getByRole('button', { name: /^Edit harmony/ }));
        expect(screen.getByRole('tab', { name: label }).getAttribute('aria-selected')).toBe('true');
        expect(screen.queryByRole('tab', { name: 'V7 → I' })).toBeNull();
    });

    it.each([
        ['dominant', 'Hear guide tones'],
        ['fifths', 'Hear voice lines'],
        ['dominant-colour', 'Hear guide tones'],
        ['tonic-sub', null],
        ['mixture', null],
        ['minor-sub', null],
    ] as const)('%s offers %s as line playback (none for comparisons)', (kind, label) => {
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, kind }} />);
        expect(screen.getByRole('button', { name: 'Play relation' })).toBeTruthy();
        const lines = screen.queryAllByRole('button', { name: /^Hear / });
        expect(lines.map(button => button.textContent)).toEqual(label ? [label] : []);
    });

    it('uses minor-key preparation labels for a minor destination', async () => {
        const user = userEvent.setup();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, frame: { ...DEFAULT_HARMONY_QUERY.frame, mode: 'minor' }, target: { root: 'C', chordId: 'minor' }, kind: 'ii-v' }} />);
        fireEvent.click(screen.getByRole('button', { name: /^Edit harmony/ }));
        expect(screen.getByRole('tab', { name: 'iiø–V' })).toBeTruthy();
        await user.click(screen.getByRole('tab', { name: 'iv–V' }));
        expect(screen.getByRole('heading', { name: 'iv–V preparation' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Open Fm7 in Chord' })).toBeTruthy();
    });
});
