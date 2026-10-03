// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ClientApp from './ClientApp';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { getScalePresentationName } from '@/domain/scale/scaleSelector';
import { TAB_EXAMPLE } from '@/domain/tab/types';
import type { ScaleModeWorkspace } from './scale/ScaleModeWorkspace';
import type { ChordModeWorkspace } from './chord/ChordModeWorkspace';
import type { HarmonyModeWorkspace } from './harmony/HarmonyModeWorkspace';

// Exercise the real ClientApp ownership, tab reducer, input, parser, and analysis UI.
// Only unrelated exploration/voicing workspaces are replaced with small prop probes.
vi.mock('./chord/useChordExploration', () => ({ useChordExploration: () => ({ selected: null, selectionStale: false }) }));
vi.mock('./chord/ChordExplorationPanel', () => ({ ChordExplorationPanel: () => null }));
vi.mock('./chord/reverse/ReverseChordPanel', () => ({ ReverseChordPanel: () => null }));
vi.mock('./scale/ScaleModeWorkspace', () => ({
    ScaleModeWorkspace: (props: React.ComponentProps<typeof ScaleModeWorkspace>) => <section aria-label="Scale explorer probe">
        <output data-testid="explored-scale">{JSON.stringify(props.scaleRef)}</output>
        <button onClick={() => props.onScaleChange('Diatonic Modes', 'Dorian')}>Explore Dorian</button>
        <button onClick={() => props.onKeyChange(2)}>Explore tonic D</button>
    </section>,
}));
vi.mock('./chord/ChordModeWorkspace', () => ({
    ChordModeWorkspace: (props: React.ComponentProps<typeof ChordModeWorkspace>) => <section>
        <output data-testid="chord-root">{props.root}</output>
        <button onClick={() => props.onRootChange(4)}>Chord root E</button>
    </section>,
}));
vi.mock('./harmony/HarmonyModeWorkspace', () => ({
    HarmonyModeWorkspace: (props: React.ComponentProps<typeof HarmonyModeWorkspace>) => <section>
        <output data-testid="harmony-query">{JSON.stringify(props.query)}</output>
        <button onClick={() => props.onQueryChange({ ...props.query, frame: { ...props.query.frame, tonic: 'G', mode: 'minor' } })}>Harmony G minor</button>
        <button onClick={() => props.onOpenScale(createScaleRef('Diatonic Modes', 'Aeolian', 9))}>Open local collection in Scale</button>
    </section>,
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const workflow = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
const tab = () => within(screen.getByRole('region', { name: 'Tab analysis workspace' }));
const contextSummary = () => tab().getByText('Context').closest('summary')!;
const snapshot = (id: string) => JSON.parse(screen.getByTestId(id).textContent!);
async function openContext() {
    const summary = contextSummary();
    if (!summary.parentElement!.hasAttribute('open')) fireEvent.click(summary);
    await waitFor(() => expect(summary.parentElement!.hasAttribute('open')).toBe(true));
}
function enterSource(source = TAB_EXAMPLE) {
    click('Import text');
    fireEvent.change(tab().getByRole('textbox', { name: 'Paste or write a six-string tab' }), { target: { value: source } });
    click('Import tab');
    expect(tab().getByRole('heading', { name: 'Your tab' })).toBeTruthy();
}

describe('ClientApp tab analysis ownership boundary', () => {
    it('retains the parsed tab, selected onset, source, and analysis context across Chord and Harmony', async () => {
        render(<ClientApp />);
        click('Explore Dorian');
        click('Explore tonic D');
        workflow('Analyze tab');
        await openContext();
        click(`Use explored D ${getScalePresentationName('Dorian')}`);
        fireEvent.change(tab().getByRole('slider', { name: 'Capo fret' }), { target: { value: '2' } });
        const source = `Retained excerpt\n${TAB_EXAMPLE}`;
        enterSource(source);
        fireEvent.click(tab().getByRole('button', { name: /^Onset 2, bar 1:/ }));
        click('Set a key');
        click('Analyze');
        const beforeSummary = contextSummary().textContent;
        const beforeStatus = tab().getByRole('status', { name: 'Analysis status' }).textContent;

        click('Chord');
        expect(screen.getByTestId('chord-root').textContent).toBe('0');
        click('Chord root E');
        click('Harmony');
        click('Harmony G minor');
        const harmonyBefore = snapshot('harmony-query');
        click('Scale');

        expect((screen.getByRole('radio', { name: 'Analyze tab' }) as HTMLInputElement).checked).toBe(true);
        expect(contextSummary().textContent).toBe(beforeSummary);
        expect(tab().getByRole('button', { name: /^Onset 2, bar 1:/ }).getAttribute('aria-pressed')).toBe('true');
        expect(tab().getByRole('status', { name: 'Analysis status' }).textContent).toBe(beforeStatus);
        expect(tab().queryByRole('region', { name: 'Selected passage analysis' })).toBeNull();
        await openContext();
        expect(tab().getByRole('button', { name: 'Clear key' })).toBeTruthy();
        click('Import text');
        expect((tab().getByRole('textbox', { name: 'Paste or write a six-string tab' }) as HTMLTextAreaElement).value).toBe(source);

        click('Chord');
        expect(screen.getByTestId('chord-root').textContent).toBe('4');
        click('Harmony');
        expect(snapshot('harmony-query')).toEqual(harmonyBefore);
    });

    it('copies the explored scale only when explicitly adopted and keeps later exploration independent', async () => {
        render(<ClientApp />);
        const original = snapshot('explored-scale');
        workflow('Analyze tab');
        expect(contextSummary().textContent).toContain('No reference scale');
        await openContext();
        click(`Use explored C ${getScalePresentationName('Ionian')}`);
        enterSource();
        click('Analyze');
        const adoptedSummary = contextSummary().textContent;
        const adoptedStatus = tab().getByRole('status', { name: 'Analysis status' }).textContent;
        workflow('Explore scales');
        expect(snapshot('explored-scale')).toEqual(original);
        click('Explore Dorian');
        click('Explore tonic D');
        const laterExploration = snapshot('explored-scale');
        expect(laterExploration).not.toEqual(original);
        workflow('Analyze tab');
        expect(contextSummary().textContent).toBe(adoptedSummary);
        expect(tab().getByRole('status', { name: 'Analysis status' }).textContent).toBe(adoptedStatus);
        await openContext();
        click(`Use explored D ${getScalePresentationName('Dorian')}`);
        expect(contextSummary().textContent).toContain(`D ${getScalePresentationName('Dorian')}`);
        click('Clear scale');
        workflow('Explore scales');
        expect(snapshot('explored-scale')).toEqual(laterExploration);
    });

    it('opens an explicit Harmony collection in Explore even when Analyze was last active', async () => {
        render(<ClientApp />);
        workflow('Analyze tab');
        await openContext();
        click(`Use explored C ${getScalePresentationName('Ionian')}`);
        enterSource();
        fireEvent.click(tab().getByRole('button', { name: /^Onset 3, bar 1:/ }));
        const summaryBefore = contextSummary().textContent;
        click('Harmony');
        click('Open local collection in Scale');
        expect((screen.getByRole('radio', { name: 'Explore scales' }) as HTMLInputElement).checked).toBe(true);
        expect(snapshot('explored-scale')).toEqual(createScaleRef('Diatonic Modes', 'Aeolian', 9));
        expect(screen.queryByRole('region', { name: 'Tab analysis workspace' })).toBeNull();
        workflow('Analyze tab');
        expect(contextSummary().textContent).toBe(summaryBefore);
        expect(tab().getByRole('button', { name: /^Onset 3, bar 1:/ }).getAttribute('aria-pressed')).toBe('true');
        click('Import text');
        expect((tab().getByRole('textbox', { name: 'Paste or write a six-string tab' }) as HTMLTextAreaElement).value).toBe(TAB_EXAMPLE);
    });
});
