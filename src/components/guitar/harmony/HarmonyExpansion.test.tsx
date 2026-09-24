// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { exploreRelation } from '@/domain/harmony/relations';
import type { RelationQuery } from '@/domain/harmony/types';
import { HarmonyModeWorkspace } from './HarmonyModeWorkspace';
import { DEFAULT_HARMONY_QUERY } from './useHarmony';

afterEach(cleanup);

function Harness({ initial, changed = () => {} }: { initial: RelationQuery; changed?: (query: RelationQuery) => void }) {
    const [query, setQuery] = useState(initial);
    return <HarmonyModeWorkspace query={query} result={exploreRelation(query)} onQueryChange={next => { changed(next); setQuery(next); }} onOpenChord={vi.fn()} onOpenScale={vi.fn()} />;
}

describe('Harmony expansion interactions', () => {
    it('opens Backdoor by keyboard and preserves the selected key and target when changing examples', async () => {
        const user = userEvent.setup();
        const changed = vi.fn();
        render(<Harness initial={DEFAULT_HARMONY_QUERY} changed={changed} />);
        await user.click(screen.getByRole('tab', { name: 'Subdominant minor' }));
        const minorSub = screen.getByRole('tab', { name: 'Minor-subdominant family' });
        minorSub.focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('tab', { name: 'Backdoor' }).getAttribute('aria-selected')).toBe('true');
        expect(screen.getByRole('button', { name: 'Open B♭7 in Chord' })).toBeTruthy();
        const examples = within(screen.getByRole('tablist', { name: 'Examples' })).getAllByRole('tab');
        expect(examples).toHaveLength(2);
        await user.click(examples[1]);
        expect(screen.getByRole('button', { name: 'Open Fm7 in Chord' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Destination root C' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Key C' })).toBeTruthy();
        expect(changed.mock.lastCall?.[0]).toMatchObject({ target: DEFAULT_HARMONY_QUERY.target, frame: DEFAULT_HARMONY_QUERY.frame, kind: 'backdoor' });
        expect(screen.getByText('Example')).toBeTruthy();
    });

    it('distinguishes an unknown phrase ending from an explicit non-ending and retains the observed motion', async () => {
        const user = userEvent.setup();
        const changed = vi.fn();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, kind: 'cadence', context: { before: { root: 'F', chordId: 'minor' } } }} changed={changed} />);
        const phrase = screen.getByRole('checkbox', { name: 'Phrase ending' }) as HTMLInputElement;
        expect(phrase.indeterminate).toBe(true);
        expect(screen.getByText('Unknown')).toBeTruthy();
        await user.click(phrase);
        expect(phrase.checked).toBe(true);
        expect(changed.mock.lastCall?.[0].context.phraseEnding).toBe(true);
        await user.click(phrase);
        expect(phrase.checked).toBe(false);
        expect(phrase.indeterminate).toBe(false);
        expect(changed.mock.lastCall?.[0].context.phraseEnding).toBe(false);
        expect(screen.queryByText('Unknown')).toBeNull();
        expect(screen.getByRole('heading', { name: /IV\/iv–I motion/ })).toBeTruthy();
        await user.click(screen.getByLabelText('Relationship details'));
        expect(screen.getByLabelText('Phrase ending: not met')).toBeTruthy();
        expect(screen.getByText('Observed', { exact: true })).toBeTruthy();
    });

    it('keeps actual bass and passing rhythm as independent observations', async () => {
        const user = userEvent.setup();
        const changed = vi.fn();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, kind: 'passing', target: { root: 'D', chordId: 'minor' }, context: {
            before: { root: 'C', chordId: 'major' }, middle: { root: 'C#', chordId: 'diminished-7' },
        } }} changed={changed} />);
        for (const label of ['Before bass', 'Middle bass', 'Destination bass']) expect(screen.getByRole('spinbutton', { name: label })).toBeTruthy();
        await user.click(screen.getByRole('checkbox', { name: 'Passing rhythm verified' }));
        expect(changed.mock.lastCall?.[0].context.rhythmConfirmed).toBe(true);
        expect(changed.mock.lastCall?.[0].context.bassConfirmed).toBeUndefined();
        await user.click(screen.getByRole('checkbox', { name: 'Bass / inversions verified' }));
        expect(changed.mock.lastCall?.[0].context).toMatchObject({ bassConfirmed: true, rhythmConfirmed: true });
        await user.click(screen.getByLabelText('Relationship details'));
        expect(screen.getByLabelText('Observed conditions')).toBeTruthy();
        expect(screen.getByLabelText('Possible readings')).toBeTruthy();
    });

    it('links both CT neighbor voices to the target fifth using analysis spelling', async () => {
        const user = userEvent.setup();
        render(<Harness initial={{ ...DEFAULT_HARMONY_QUERY, kind: 'common-tone', frame: { ...DEFAULT_HARMONY_QUERY.frame, lens: 'classical' } }} />);
        expect(screen.getByRole('button', { name: /^D#, degree/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /^F#, degree/ })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: /^G, degree 5 in C$/ }));
        expect(screen.getByRole('button', { name: /^F#, .*connected to selected tone$/ }).getAttribute('data-linked')).toBe('true');
        expect(screen.getByRole('button', { name: /^A, .*connected to selected tone$/ }).getAttribute('data-linked')).toBe('true');
        expect(screen.getByRole('button', { name: /^D#, degree/ }).getAttribute('data-linked')).toBe('false');
        await user.click(screen.getByRole('tab', { name: 'Leading-tone diminished' }));
        await user.click(screen.getByRole('tab', { name: 'Common-tone diminished' }));
        expect(screen.queryByRole('button', { name: /connected to selected tone/ })).toBeNull();
    });
});
