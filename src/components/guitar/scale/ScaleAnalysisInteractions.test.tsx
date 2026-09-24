// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScaleHarmonicBridgePanel } from '../cross-domain/ScaleHarmonicBridgePanel';
import { getScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { ScaleRelationsPanel } from './ScaleRelationsPanel';
import { ScaleRootNavigator } from './ScaleRootNavigator';
import { ToneRolesPanel } from './ToneRolesPanel';

afterEach(cleanup);

function BridgeHarness({ name = 'Dorian', tonic = 0 }: { name?: string; tonic?: number }) {
    const [id, setId] = React.useState<string | null>(null);
    const [focus, setFocus] = React.useState<number | null>(null);
    const analysis = getScaleToneAnalysis(createScaleRef('Diatonic Modes', name, tonic), id);
    return <ScaleHarmonicBridgePanel scaleGroup="Diatonic Modes" scaleName={name} tonicPitchClass={tonic} selectedChordId={id} onSelectChord={setId} analysis={analysis} focusedInterval={focus} onFocusTone={setFocus} />;
}

describe('Scale harmonic analysis interactions', () => {
    it('does not publish draft identity or tone interpretations', () => {
        const analysis = getScaleToneAnalysis(createScaleRef('Diatonic Modes', 'Dorian', 0), 'minor-7')!;
        analysis.identity = { ...analysis.identity, status: 'draft', explanation: 'Unreviewed identity claim' };
        analysis.tones = analysis.tones.map(tone => ({ ...tone, interpretations: [{ kind: 'tension', status: 'draft', explanation: 'Unreviewed tension claim', conditions: [], sourceRefs: [] }] }));
        render(<ToneRolesPanel analysis={analysis} onClear={() => undefined} />);
        expect(screen.queryByText('Unreviewed identity claim')).toBeNull();
        expect(screen.queryByText('Unreviewed tension claim')).toBeNull();
        expect(screen.getByText('Scale: C Dorian')).toBeTruthy();
    });
    it('requires explicit selection and updates chord membership without losing structural degree', async () => {
        const user = userEvent.setup();
        render(<BridgeHarness />);
        expect(screen.queryByRole('button', { name: 'Clear analysis chord' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Analyze Cm7' }).getAttribute('aria-pressed')).toBe('false');
        await user.click(screen.getByRole('button', { name: 'Analyze Cm7' }));
        const row = screen.getByRole('button', { name: 'Focus D on fretboard' }).closest('tr')!;
        expect(row.textContent).toContain('Not a chord tone');
        expect(row.textContent).toContain('9');
        await user.click(screen.getByRole('button', { name: 'Analyze Cm9' }));
        expect(row.textContent).toContain('Chord tone');
        expect(row.textContent).toContain('9');
        expect(screen.getByRole('button', { name: 'Analyze Cm9' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('supports keyboard card selection, preserves analysis across tabs, and clears explicitly', async () => {
        const user = userEvent.setup();
        render(<BridgeHarness />);
        screen.getByRole('button', { name: 'Analyze Cm7' }).focus();
        await user.keyboard('{Enter}');
        await user.click(screen.getByRole('button', { name: 'Chords built from this scale' }));
        expect(screen.getByText('Analyzing Cm7')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Clear analysis chord' }));
        expect(screen.queryByText('Analyzing Cm7')).toBeNull();
        expect(screen.getByText(/Select a chord in/)).toBeTruthy();
    });

    it('retains chord quality on tonic transposition and changes the analyzed notes', async () => {
        const user = userEvent.setup();
        const view = render(<BridgeHarness />);
        await user.click(screen.getByRole('button', { name: 'Analyze Cm7' }));
        view.rerender(<BridgeHarness tonic={2} />);
        expect(screen.getByText('Analyzing Dm7')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Analyze Dm7' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('distinguishes Ionian F over Cmaj7 and Csus4 without presenting containment as a recommendation', async () => {
        const user = userEvent.setup();
        render(<BridgeHarness name="Ionian" />);
        await user.click(screen.getByRole('button', { name: 'Analyze Cmaj7' }));
        const row = screen.getByRole('button', { name: 'Focus F on fretboard' }).closest('tr')!;
        expect(row.textContent).toContain('caution');
        await user.click(screen.getByRole('button', { name: 'Analyze Csus4' }));
        expect(row.textContent).toContain('Chord tone');
        expect(row.textContent).not.toContain('caution');
        expect(screen.getByText(/Containment alone does not establish/)).toBeTruthy();
    });

    it('lets a tone focus be toggled and cleared independently of chord selection', async () => {
        const user = userEvent.setup();
        render(<BridgeHarness />);
        const tone = screen.getByRole('button', { name: 'Focus A on fretboard' });
        await user.click(tone);
        expect(tone.getAttribute('aria-pressed')).toBe('true');
        await user.click(screen.getByRole('button', { name: 'Clear tone focus' }));
        expect(tone.getAttribute('aria-pressed')).toBe('false');
    });
});

describe('Scale relationship navigation', () => {
    it('spells parallel differences in each scale rather than using tonic names for every pitch', async () => {
        const user = userEvent.setup();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Diatonic Modes', 'Ionian', 9)} onNavigateScale={vi.fn()} />);
        await user.selectOptions(screen.getByRole('combobox'), 'Diatonic Modes::Lydian');
        const preview = within(screen.getByLabelText('Parallel comparison'));
        expect(preview.getByText('Added: D♯')).toBeTruthy();
        expect(preview.getByText('Removed: D')).toBeTruthy();
        expect(preview.getByText(/^Shared:/).textContent).toContain('C♯');
        expect(preview.getByText(/^Shared:/).textContent).toContain('G♯');
        expect(preview.getByText(/^Shared:/).textContent).not.toContain('D♭');
    });

    it('preserves both structural spellings when parallel collections share an enharmonic pitch', async () => {
        const user = userEvent.setup();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Jazz Minor Modes', 'Altered scale', 0)} onNavigateScale={vi.fn()} />);
        await user.selectOptions(screen.getByRole('combobox'), 'Diatonic Modes::Ionian');
        const preview = within(screen.getByLabelText('Parallel comparison'));
        expect(preview.getByText(/^Shared:/).textContent).toContain('F♭ (current) / E (comparison)');
        expect(preview.getByText(/^Removed:/).textContent).toContain('G♭');
    });

    it('previews a parallel difference without navigating; use preserves tonic', async () => {
        const user = userEvent.setup();
        const navigate = vi.fn();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Diatonic Modes', 'Dorian', 0)} onNavigateScale={navigate} />);
        await user.selectOptions(screen.getByRole('combobox'), 'Diatonic Modes::Aeolian');
        expect(navigate).not.toHaveBeenCalled();
        const preview = screen.getByLabelText('Parallel comparison');
        expect(preview.textContent).toContain('Added: A♭');
        expect(preview.textContent).toContain('Removed: A');
        await user.click(within(preview).getByRole('button', { name: 'Use C Aeolian' }));
        expect(navigate).toHaveBeenCalledWith(createScaleRef('Diatonic Modes', 'Aeolian', 0));
    });

    it('navigates a sibling with its required tonic in one callback', async () => {
        const user = userEvent.setup();
        const navigate = vi.fn();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Diatonic Modes', 'Ionian', 0)} onNavigateScale={navigate} />);
        await user.click(screen.getByRole('button', { name: 'D Dorian' }));
        expect(navigate).toHaveBeenCalledExactlyOnceWith(createScaleRef('Diatonic Modes', 'Dorian', 2));
    });

    it('uses accessible roots without fabricated harmonic roles for non-seven-note scales', async () => {
        const user = userEvent.setup();
        const change = vi.fn();
        render(<ScaleRootNavigator selectedKey={0} onKeyChange={change} selectedScaleGroup="Symmetric" selectedScaleName="Whole Tone" />);
        const rootList = screen.getByRole('listbox', { name: 'Scale root in fifths order' });
        expect(within(rootList).getAllByRole('option')).toHaveLength(12);
        expect(rootList.textContent).not.toContain('III');
        rootList.focus();
        await user.keyboard('{ArrowRight}');
        expect(change).toHaveBeenCalledWith(7);
    });
});
