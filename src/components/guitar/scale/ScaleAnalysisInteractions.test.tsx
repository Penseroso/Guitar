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
    it('shows the scale identity once before any chord or tone is selected', () => {
        const analysis = getScaleToneAnalysis(createScaleRef('Diatonic Modes', 'Dorian', 0))!;
        render(<ToneRolesPanel analysis={analysis} onClear={() => undefined} />);
        expect(screen.getByRole('list', { name: 'Scale tones' }).children).toHaveLength(7);
        expect(screen.queryByText(/No curated interpretation/)).toBeNull();
        expect(screen.queryByText(/No chord selected/)).toBeNull();
        expect(screen.queryByRole('button', { name: 'Clear tone focus' })).toBeNull();
    });
    it('requires explicit selection and updates chord membership without losing structural degree', async () => {
        const user = userEvent.setup();
        render(<BridgeHarness />);
        expect(screen.queryByRole('button', { name: 'Clear analysis chord' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Analyze Cm7' }).getAttribute('aria-pressed')).toBe('false');
        await user.click(screen.getByRole('button', { name: 'Analyze Cm7' }));
        const tone = screen.getByRole('button', { name: 'Focus D on fretboard' });
        expect(tone.getAttribute('aria-label')).toBe('Focus D on fretboard');
        await user.click(tone);
        expect(within(screen.getByRole('region', { name: 'Selected tone detail' })).getByText(/Not a chord tone/).textContent).toContain('9');
        await user.click(screen.getByRole('button', { name: 'Analyze Cm9' }));
        expect(within(screen.getByRole('region', { name: 'Selected tone detail' })).getByText(/Chord tone/).textContent).toContain('9');
        expect(screen.getByRole('button', { name: 'Analyze Cm9' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('supports keyboard card selection, preserves analysis across tabs, and clears explicitly', async () => {
        const user = userEvent.setup();
        render(<BridgeHarness />);
        screen.getByRole('button', { name: 'Analyze Cm7' }).focus();
        await user.keyboard('{Enter}');
        await user.click(screen.getByRole('tab', { name: 'Chords built from this scale' }));
        expect(screen.getByText('Analyzing Cm7')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Clear analysis chord' }));
        expect(screen.queryByText('Analyzing Cm7')).toBeNull();
        expect(screen.queryByText(/Analyzing/)).toBeNull();
    });

    it('moves between harmony tabs with arrow keys', async () => {
        const user = userEvent.setup();
        render(<BridgeHarness />);
        const playTab = screen.getByRole('tab', { name: 'Play this scale over' });
        playTab.focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('tab', { name: 'Chords built from this scale' }).getAttribute('aria-selected')).toBe('true');
        expect(screen.getByText(/stacking/)).toBeTruthy();
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
        await user.click(screen.getByRole('button', { name: 'Focus F on fretboard' }));
        expect(screen.getAllByText('caution').length).toBeGreaterThan(0);
        await user.click(screen.getByText(/Other contained chords/));
        await user.click(screen.getByRole('button', { name: 'Analyze Csus4' }));
        expect(within(screen.getByRole('region', { name: 'Selected tone detail' })).getByText(/Chord tone/)).toBeTruthy();
        expect(screen.queryAllByText('caution')).toHaveLength(0);
        expect(screen.getByText(/Note containment · pairing and tensions unverified/)).toBeTruthy();
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
        await user.click(screen.getByText('Related scales'));
        await user.selectOptions(screen.getByRole('combobox'), 'Diatonic Modes::Lydian');
        const preview = within(screen.getByLabelText('Parallel comparison'));
        const current = within(preview.getByRole('list', { name: 'Notes of A Ionian' }));
        const target = within(preview.getByRole('list', { name: 'Notes of A Lydian' }));
        expect(current.getByText('D').closest('li')?.getAttribute('data-change')).toBe('from');
        expect(target.getByText('D♯').closest('li')?.getAttribute('data-change')).toBe('to');
        expect(current.getByText('C♯')).toBeTruthy();
        expect(target.getByText('G♯')).toBeTruthy();
        expect(target.queryByText('D♭')).toBeNull();
    });

    it('preserves both structural spellings when parallel collections share an enharmonic pitch', async () => {
        const user = userEvent.setup();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Jazz Minor Modes', 'Altered scale', 0)} onNavigateScale={vi.fn()} />);
        await user.click(screen.getByText('Related scales'));
        await user.selectOptions(screen.getByRole('combobox'), 'Diatonic Modes::Ionian');
        const preview = within(screen.getByLabelText('Parallel comparison'));
        expect(within(preview.getByRole('list', { name: 'Notes of C Altered' })).getByText('F♭')).toBeTruthy();
        expect(within(preview.getByRole('list', { name: 'Notes of C Ionian' })).getByText('E')).toBeTruthy();
        expect(within(preview.getByRole('list', { name: 'Notes of C Altered' })).getByText('G♭')).toBeTruthy();
    });

    it('previews a parallel difference without navigating; use preserves tonic', async () => {
        const user = userEvent.setup();
        const navigate = vi.fn();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Diatonic Modes', 'Dorian', 0)} onNavigateScale={navigate} />);
        await user.click(screen.getByText('Related scales'));
        await user.selectOptions(screen.getByRole('combobox'), 'Diatonic Modes::Aeolian');
        expect(navigate).not.toHaveBeenCalled();
        const preview = screen.getByLabelText('Parallel comparison');
        expect(within(within(preview).getByRole('list', { name: 'Notes of C Aeolian' })).getByText('A♭')).toBeTruthy();
        expect(within(within(preview).getByRole('list', { name: 'Notes of C Dorian' })).getByText('A')).toBeTruthy();
        await user.click(within(preview).getByRole('button', { name: 'Use C Aeolian' }));
        expect(navigate).toHaveBeenCalledWith(createScaleRef('Diatonic Modes', 'Aeolian', 0));
    });

    it('navigates a sibling with its required tonic in one callback', async () => {
        const user = userEvent.setup();
        const navigate = vi.fn();
        render(<ScaleRelationsPanel scaleRef={createScaleRef('Diatonic Modes', 'Ionian', 0)} onNavigateScale={navigate} />);
        await user.click(screen.getByText('Related scales'));
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
