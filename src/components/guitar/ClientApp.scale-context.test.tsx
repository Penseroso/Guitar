// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ClientApp from './ClientApp';
import { WorkspaceHeader } from './shared/WorkspaceHeader';
import { reduceHarmonicWorkspaceState } from '@/features/harmonic-workspace/state';
import type { ScaleModeWorkspace } from './scale/ScaleModeWorkspace';
import type { ChordModeWorkspace } from './chord/ChordModeWorkspace';
import type { ProgressionModeWorkspace } from './progression/ProgressionModeWorkspace';
import type { Controls } from './Controls';

// Keep ClientApp, Scale state, progression state, derivation, and tone analysis real.
// Workspace probes avoid worker/audio/drag-and-drop concerns while exercising their actual props.
vi.mock('./progression/useProgressionAudio', () => ({ useProgressionAudio: () => ({ playProgressionChord: vi.fn() }) }));
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
    </section>,
}));

vi.mock('./chord/ChordModeWorkspace', () => ({
    ChordModeWorkspace: (props: React.ComponentProps<typeof ChordModeWorkspace>) => <section>
        <output data-testid="chord-root">{props.root}</output>
        <button onClick={() => props.onRootChange(4)}>Chord root E</button>
    </section>,
}));

vi.mock('./Controls', () => ({
    Controls: (props: React.ComponentProps<typeof Controls>) => <section>
        <WorkspaceHeader mode={props.mode} onModeChange={props.onModeChange} />
        <output data-testid="progression-context">{JSON.stringify({ group: props.selectedScaleGroup, name: props.selectedScaleName, tonic: props.selectedKey })}</output>
        <button onClick={() => props.onScaleChange('Diatonic Modes', 'Aeolian')}>Progression Aeolian</button>
        <button onClick={() => props.onKeyChange(7)}>Progression tonic G</button>
    </section>,
}));

vi.mock('./progression/ProgressionModeWorkspace', () => ({
    ProgressionModeWorkspace: (props: React.ComponentProps<typeof ProgressionModeWorkspace>) => <section>
        <output data-testid="progression-derived">{JSON.stringify({ tonic: props.selectedKey, minor: props.isMinorMode, degrees: props.diatonicChords.map(chord => chord.interval) })}</output>
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
    it('keeps Scale tonic, scale identity, analysis, and display state across independent Chord/Progression edits', () => {
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
        switchMode('Prog');
        expect(snapshot('progression-context')).toEqual({ group: 'Diatonic Modes', name: 'Ionian', tonic: 4 });
        expect(snapshot('progression-derived')).toEqual({ tonic: 4, minor: false, degrees: [0, 2, 4, 5, 7, 9, 11] });
        click('Progression Aeolian');
        click('Progression tonic G');
        expect(snapshot('progression-derived')).toEqual({ tonic: 7, minor: true, degrees: [0, 2, 3, 5, 7, 8, 10] });
        switchMode('Chord');
        expect(screen.getByTestId('chord-root').textContent).toBe('7');
        expect(lastTonalContext()).toMatchObject({ selectedKey: 7, scaleGroup: 'Diatonic Modes', scaleName: 'Aeolian' });
        switchMode('Scale');
        expect(snapshot('scale-context')).toEqual(before);
    });

    it('gives Half–Whole the same independent ownership and does not overwrite another mode when returning to an old scale', () => {
        render(<ClientApp />);
        click('Explore Half–Whole');
        click('Scale tonic F sharp');
        click('Analyze dominant flat nine');
        const before = snapshot('scale-context');
        expect(before).toMatchObject({ name: 'Half-Whole Diminished', key: 6, root: 6, selectedChordId: 'dominant-7-flat-9' });
        expect(before.active).toEqual([6, 7, 9, 10, 0, 1, 3, 4]);
        switchMode('Prog');
        expect(snapshot('progression-context')).toEqual({ group: 'Diatonic Modes', name: 'Ionian', tonic: 0 });
        expect(snapshot('progression-derived').degrees).toEqual([0, 2, 4, 5, 7, 9, 11]);
        click('Progression Aeolian');
        click('Progression tonic G');
        switchMode('Scale');
        expect(snapshot('scale-context')).toEqual(before);
        click('Explore Ionian');
        expect(snapshot('scale-context')).toMatchObject({ name: 'Ionian', key: 6, selectedChordId: null });
        switchMode('Chord');
        expect(screen.getByTestId('chord-root').textContent).toBe('7');
        expect(lastTonalContext()).toMatchObject({ selectedKey: 7, scaleName: 'Aeolian' });
        switchMode('Prog');
        expect(snapshot('progression-context')).toEqual({ group: 'Diatonic Modes', name: 'Aeolian', tonic: 7 });
    });
});
