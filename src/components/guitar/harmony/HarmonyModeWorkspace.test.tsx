// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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
    it('preserves an imported sharp spelling in the key and target dials', () => {
        const query: RelationQuery = { ...DEFAULT_HARMONY_QUERY, frame: { ...DEFAULT_HARMONY_QUERY.frame, tonic: 'F#' }, target: { root: 'F#', chordId: 'major' } };
        render(<Harness initial={query} />);
        expect(screen.getByRole('button', { name: 'Key F♯' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Target root F♯' })).toBeTruthy();
        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.queryByText('How chords relate')).toBeNull();
        expect(screen.queryByText('Source and limits')).toBeNull();
    });

    it('uses the supplied cadence inversion and ending observations', async () => {
        const user = userEvent.setup();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, kind: 'cadence' }} />);
        expect(screen.getByText('Illustration · not an observed cadence')).toBeTruthy();
        expect(screen.getByText(/Needed · Preceding chord/)).toBeTruthy();
        expect(screen.queryByRole('spinbutton', { name: 'Before quality' })).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Before root +' }));
        await user.click(within(screen.getByRole('dialog', { name: 'Choose root', hidden: true })).getByRole('option', { name: 'G', hidden: true }));
        expect(screen.getByRole('spinbutton', { name: 'Before quality' }).getAttribute('aria-valuetext')).toBe('7');
        await user.click(screen.getByRole('button', { name: 'Next Before bass' }));
        expect(screen.getByRole('spinbutton', { name: 'Before bass' }).getAttribute('aria-valuetext')).toBe('B');
        await user.click(screen.getByRole('checkbox', { name: 'Phrase ending' }));
        await user.click(screen.getByRole('checkbox', { name: 'Bass / inversions verified' }));
        await user.type(screen.getByRole('textbox', { name: 'Soprano note' }), 'C');
        await user.tab();
        expect(screen.getByText(/Imperfect authentic cadence/)).toBeTruthy();
    });

    it('changes compact context values by keyboard without changing the selected chord', async () => {
        const user = userEvent.setup();
        render(<Harness initial={DEFAULT_HARMONY_QUERY} />);
        const mode = screen.getByRole('spinbutton', { name: 'Mode' });
        mode.focus();
        await user.keyboard('{ArrowRight}');
        await user.click(screen.getByRole('button', { name: 'Next Lens' }));
        expect(mode.getAttribute('aria-valuetext')).toBe('Minor');
        expect(screen.getByRole('spinbutton', { name: 'Lens' }).getAttribute('aria-valuetext')).toBe('Classical');
        expect(screen.getByRole('button', { name: 'Target root C' })).toBeTruthy();
    });

    it('presents family comparison without motion and clears note focus after a relation change', async () => {
        const user = userEvent.setup();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, kind: 'tonic-sub' }} />);
        expect(screen.getByText(/Root distance/)).toBeTruthy();
        expect(screen.queryByText(/Root \+/)).toBeNull();
        const note = screen.getAllByRole('button', { name: /degree 1 in C/ })[0];
        await user.click(note);
        expect(note.getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByText(/1 of C/)).toBeTruthy();
        await user.click(screen.getByRole('tab', { name: 'Dominant' }));
        await user.click(screen.getByRole('tab', { name: 'Substitutes' }));
        expect(screen.getAllByRole('button', { name: /degree 1 in C/ })[0].getAttribute('aria-pressed')).toBe('false');
    });
});
