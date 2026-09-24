// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ClientApp from './ClientApp';
import { reduceHarmonicWorkspaceState } from '@/features/harmonic-workspace/state';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { getKeyName } from '@/domain/shared/keys';
import type { ScaleModeWorkspace } from './scale/ScaleModeWorkspace';
import type { ChordModeWorkspace } from './chord/ChordModeWorkspace';
import type { HarmonyModeWorkspace } from './harmony/HarmonyModeWorkspace';

// Keep ClientApp, Scale/Harmony state, derivation, and tone analysis real.
// Workspace probes avoid worker/audio/drag-and-drop concerns while exercising their actual props.
vi.mock('./chord/useChordExploration', () => ({ useChordExploration: () => ({ selected: null, selectionStale: false }) }));
vi.mock('./chord/ChordExplorationPanel', () => ({ ChordExplorationPanel: () => null }));
vi.mock('./chord/reverse/ReverseChordPanel', () => ({ ReverseChordPanel: () => null }));
vi.mock('@/features/harmonic-workspace/state', async importOriginal => {
    const actual = await importOriginal<typeof import('@/features/harmonic-workspace/state')>();
    return { ...actual, reduceHarmonicWorkspaceState: vi.fn(actual.reduceHarmonicWorkspaceState) };
});

vi.mock('./scale/ScaleModeWorkspace', () => ({
    ScaleModeWorkspace: (props: React.ComponentProps<typeof ScaleModeWorkspace>) => <section>
        <output data-testid="scale-context">{JSON.stringify({
            ref: props.scaleRef, root: props.rootNote, key: props.selectedKey,
            group: props.scaleGroup, name: props.scaleName, active: props.activeNotes,
            selectedChordId: props.selectedChordId, analysis: props.analysis?.scaleRef,
            chordTones: props.chordTones, intervals: props.showIntervals, showChordTones: props.showChordTones,
        })}</output>
        <button onClick={() => props.onScaleChange('Diatonic Modes', 'Dorian')}>Explore Dorian</button>
        <button onClick={() => props.onScaleChange('Symmetric', 'Half-Whole Diminished')}>Explore Half–Whole</button>
        <button onClick={() => props.onScaleChange('Diatonic Modes', 'Ionian')}>Explore Ionian</button>
        <button onClick={() => props.onKeyChange(2)}>Scale tonic D</button>
        <button onClick={() => props.onKeyChange(6)}>Scale tonic F sharp</button>
        <button onClick={() => props.onSelectChord('minor-7')}>Analyze minor seventh</button>
        <button onClick={() => props.onSelectChord('dominant-7-flat-9')}>Analyze dominant flat nine</button>
        <button onClick={props.onToggleIntervals}>Scale interval display</button>
        <button onClick={props.onToggleChordTones}>Scale chord highlighting</button>
        <button onClick={() => props.onSelectChord(null)}>Clear scale analysis</button>
        <button onClick={() => props.onExploreHarmony?.({ scaleRef: props.scaleRef, chord: { root: getKeyName(props.scaleRef.tonic), chordId: props.selectedChordId ?? 'major' } })}>Open scale chord in Harmony</button>
        {props.onReturnToHarmony && <button onClick={props.onReturnToHarmony}>Return from Scale</button>}
    </section>,
}));

vi.mock('./chord/ChordModeWorkspace', () => ({
    ChordModeWorkspace: (props: React.ComponentProps<typeof ChordModeWorkspace>) => <section>
        <output data-testid="chord-root">{props.root}</output>
        <output data-testid="chord-type">{props.chordType}</output>
        <button onClick={() => props.onRootChange(4)}>Chord root E</button>
        <button onClick={props.onExploreHarmony}>Open chord in Harmony</button>
        {props.onReturnToHarmony && <button onClick={props.onReturnToHarmony}>Return from Chord</button>}
    </section>,
}));

vi.mock('./harmony/HarmonyModeWorkspace', () => ({
    HarmonyModeWorkspace: (props: React.ComponentProps<typeof HarmonyModeWorkspace>) => <section>
        <output data-testid="harmony-context">{JSON.stringify(props.query)}</output>
        <output data-testid="harmony-source">{JSON.stringify(props.sourceScaleRef ?? null)}</output>
        <button onClick={() => props.onQueryChange({ ...props.query, frame: { ...props.query.frame, tonic: 'G', mode: 'minor' }, target: { root: 'D', chordId: 'minor' } })}>Harmony G minor</button>
        <button onClick={props.onUseScaleFrame}>Use source tonal frame</button>
        <button onClick={() => props.onOpenChord({ root: 'Db', chordId: 'dominant-7' })}>Open substitute in Chord</button>
        <button onClick={() => props.onOpenScale(createScaleRef('Diatonic Modes', 'Aeolian', 9))}>Open local collection in Scale</button>
    </section>,
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const snapshot = (id: string) => JSON.parse(screen.getByTestId(id).textContent!);
const switchMode = click;
function lastTonalContext() {
    const actions = vi.mocked(reduceHarmonicWorkspaceState).mock.calls.map(([, action]) => action);
    const latest = actions.filter(action => action.type === 'sync-scope').at(-1);
    return latest?.type === 'sync-scope' ? latest.tonalContext : null;
}

describe('ClientApp Scale context boundary', () => {
    it('carries an exact ScaleRef into Harmony and changes the frame only through an explicit compatible source action', () => {
        render(<ClientApp />);
        click('Explore Dorian');
        click('Scale tonic D');
        click('Analyze minor seventh');
        const source = snapshot('scale-context').ref;
        click('Open scale chord in Harmony');
        expect(snapshot('harmony-source')).toEqual(source);
        expect(snapshot('harmony-context')).toMatchObject({ frame: { tonic: 'C', mode: 'major' }, target: { root: 'D', chordId: 'minor-7' } });
        click('Use source tonal frame');
        expect(snapshot('harmony-context').frame).toMatchObject({ tonic: 'C', mode: 'major' });
        switchMode('Scale');
        click('Explore Ionian');
        click('Open scale chord in Harmony');
        expect(snapshot('harmony-context').frame).toMatchObject({ tonic: 'C', mode: 'major' });
        click('Use source tonal frame');
        expect(snapshot('harmony-context').frame).toMatchObject({ tonic: 'D', mode: 'major' });
    });

    it('opens the selected chord and local collection, then returns to the retained Harmony query', () => {
        render(<ClientApp />);
        switchMode('Chord');
        click('Chord root E');
        click('Open chord in Harmony');
        expect(snapshot('harmony-context')).toMatchObject({ frame: { tonic: 'C', mode: 'major' }, target: { root: 'E', chordId: 'major' } });
        const before = snapshot('harmony-context');
        click('Open substitute in Chord');
        expect(screen.getByTestId('chord-root').textContent).toBe('1');
        expect(screen.getByTestId('chord-type').textContent).toBe('dominant-7');
        click('Return from Chord');
        expect(snapshot('harmony-context')).toEqual(before);
        click('Open local collection in Scale');
        expect(snapshot('scale-context')).toMatchObject({ key: 9, name: 'Aeolian' });
        click('Return from Scale');
        expect(snapshot('harmony-context')).toEqual(before);
    });

    it('clears chord highlighting on analysis clear, scale change, and transposition', () => {
        render(<ClientApp />);
        click('Explore Dorian');
        click('Analyze minor seventh');
        click('Scale chord highlighting');
        expect(snapshot('scale-context').showChordTones).toBe(true);
        click('Clear scale analysis');
        click('Analyze minor seventh');
        expect(snapshot('scale-context').showChordTones).toBe(false);
        click('Scale chord highlighting');
        click('Scale tonic D');
        expect(snapshot('scale-context')).toMatchObject({ showChordTones: false, selectedChordId: 'minor-7' });
        click('Scale chord highlighting');
        click('Explore Ionian');
        expect(snapshot('scale-context')).toMatchObject({ showChordTones: false, selectedChordId: null });
    });
    it('keeps Scale tonic, scale identity, analysis, and display state across independent Chord/Harmony edits', () => {
        render(<ClientApp />);
        click('Explore Dorian');
        click('Analyze minor seventh');
        click('Scale tonic D');
        click('Scale interval display');
        const before = snapshot('scale-context');
        expect(before).toMatchObject({ root: 2, key: 2, name: 'Dorian', selectedChordId: 'minor-7', intervals: true });
        expect(before.active).toEqual([2, 4, 5, 7, 9, 11, 0]);
        expect(before.chordTones).toEqual([2, 5, 9, 0]);
        expect(before.analysis).toEqual(before.ref);

        switchMode('Chord');
        expect(screen.getByTestId('chord-root').textContent).toBe('0');
        expect(lastTonalContext()).toMatchObject({ selectedKey: 0, scaleGroup: 'Diatonic Modes', scaleName: 'Ionian' });
        click('Chord root E');
        switchMode('Harmony');
        expect(snapshot('harmony-context')).toMatchObject({ frame: { tonic: 'C', mode: 'major' }, target: { root: 'C', chordId: 'major' } });
        click('Harmony G minor');
        expect(snapshot('harmony-context')).toMatchObject({ frame: { tonic: 'G', mode: 'minor' }, target: { root: 'D', chordId: 'minor' } });
        switchMode('Chord');
        expect(screen.getByTestId('chord-root').textContent).toBe('4');
        expect(lastTonalContext()).toMatchObject({ selectedKey: 4, scaleGroup: 'Diatonic Modes', scaleName: 'Ionian' });
        switchMode('Scale');
        expect(snapshot('scale-context')).toEqual(before);
        switchMode('Harmony');
        expect(snapshot('harmony-context')).toMatchObject({ frame: { tonic: 'G', mode: 'minor' }, target: { root: 'D', chordId: 'minor' } });
    });

    it('gives Half–Whole the same independent ownership and does not overwrite another mode when returning to an old scale', () => {
        render(<ClientApp />);
        click('Explore Half–Whole');
        click('Scale tonic F sharp');
        click('Analyze dominant flat nine');
        const before = snapshot('scale-context');
        expect(before).toMatchObject({ name: 'Half-Whole Diminished', key: 6, root: 6, selectedChordId: 'dominant-7-flat-9' });
        expect(before.active).toEqual([6, 7, 9, 10, 0, 1, 3, 4]);
        switchMode('Harmony');
        expect(snapshot('harmony-context')).toMatchObject({ frame: { tonic: 'C', mode: 'major' } });
        click('Harmony G minor');
        switchMode('Chord');
        click('Chord root E');
        switchMode('Scale');
        expect(snapshot('scale-context')).toEqual(before);
        click('Explore Ionian');
        expect(snapshot('scale-context')).toMatchObject({ name: 'Ionian', key: 6, selectedChordId: null });
        switchMode('Chord');
        expect(screen.getByTestId('chord-root').textContent).toBe('4');
        expect(lastTonalContext()).toMatchObject({ selectedKey: 4, scaleName: 'Ionian' });
        switchMode('Harmony');
        expect(snapshot('harmony-context')).toMatchObject({ frame: { tonic: 'G', mode: 'minor' } });
    });
});
