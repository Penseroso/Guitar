// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScaleModeWorkspace } from './ScaleModeWorkspace';
import { getScaleDerivedData } from '@/domain/scale/getScaleDerivedData';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { getScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';
import { TUNING } from '@/domain/shared/tuning';

afterEach(cleanup);

function WorkspaceHarness() {
    const [id, setId] = React.useState<string | null>(null);
    const [showChordTones, setShowChordTones] = React.useState(false);
    const selectChord = (next: string | null) => { setId(next); if (next === null) setShowChordTones(false); };
    const ref = React.useRef<HTMLDivElement>(null);
    const scaleRef = createScaleRef('Jazz Minor Modes', 'Altered scale', 0);
    const data = getScaleDerivedData('Jazz Minor Modes', 'Altered scale', 0, { showChordTones, blueNote: false, sixthNote: false, secondNote: false, isDoubleStopActive: false, doubleStopInterval: 3, doubleStopStrings: [1, 2] });
    const noop = () => undefined;
    return <ScaleModeWorkspace scaleRef={scaleRef} scaleGroup="Jazz Minor Modes" scaleName="Altered scale"
        analysis={getScaleToneAnalysis(scaleRef, id)} selectedChordId={id} onSelectChord={selectChord} onNavigateScale={noop}
        selectedKey={0} rootNote={0} onKeyChange={noop} onScaleChange={noop} showIntervals={false} onToggleIntervals={noop}
        showChordTones={showChordTones} onToggleChordTones={() => setShowChordTones(value => !value)}
        isPentatonic={false} blueNote={false} onToggleBlueNote={noop} secondNote={false} onToggleSecondNote={noop} sixthNote={false} onToggleSixthNote={noop}
        isDoubleStopAvailable={false} isDoubleStopVisible={false} onToggleDoubleStop={noop} doubleStopInterval={3} onDoubleStopIntervalChange={noop} doubleStopStrings={[1, 2]} onDoubleStopStringsChange={noop}
        harmonicDoubleStopPairsByInterval={data.harmonicDoubleStopPairsByInterval} fretboardContainerRef={ref} tuning={TUNING}
        activeNotes={data.scaleNotes} chordTones={data.scaleChordTones} modifierNotes={[]} scaleIntervalLabels={data.scaleIntervalLabels} doubleStops={[]} />;
}

describe('Scale workspace analysis to fretboard contract', () => {
    it('lets chord highlighting select a relevant chord and clears its state with analysis', async () => {
        const user = userEvent.setup();
        render(<WorkspaceHarness />);
        const toggle = screen.getByRole('button', { name: 'Chord tones' });
        expect(toggle.matches(':disabled')).toBe(false);
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
        await user.click(toggle);
        expect(screen.getByRole('button', { name: 'Clear analysis chord' })).toBeTruthy();
        expect(toggle.getAttribute('aria-pressed')).toBe('true');
        await user.click(screen.getByRole('button', { name: 'Clear analysis chord' }));
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
        await user.click(toggle);
        expect(toggle.getAttribute('aria-pressed')).toBe('true');
    });

    it('maps Altered player spelling and explicit chord-extension roles into actual fretboard notes', async () => {
        const user = userEvent.setup();
        const { container } = render(<WorkspaceHarness />);
        expect(container.querySelector('[data-pitch-class="3"]')?.textContent).toBe('D#');
        await user.click(screen.getByRole('button', { name: 'Analyze C7♯9' }));
        expect(container.querySelector('[data-pitch-class="3"]')?.getAttribute('data-tone-role')).toBe('chord-tone');
        expect(container.querySelector('[data-pitch-class="4"]')?.getAttribute('data-tone-role')).toBe('third');
    });

    it('wires tone focus and practice limits into every visible note location', async () => {
        const user = userEvent.setup();
        const { container } = render(<WorkspaceHarness />);
        await user.click(screen.getByRole('button', { name: 'Focus E♭ on fretboard' }));
        expect(container.querySelectorAll('[data-focused]').length).toBeGreaterThan(1);
        const maximum = screen.getByRole('slider', { name: 'Maximum fret' });
        fireEvent.keyDown(maximum, { key: 'Home' });
        fireEvent.keyDown(maximum, { key: 'PageUp' });
        await user.click(screen.getByRole('button', { name: 'String 1' }));
        const locations = [...container.querySelectorAll('[data-pitch-class]')];
        expect(locations.length).toBeGreaterThan(0);
        for (const location of locations) {
            expect(Number(location.getAttribute('data-fret'))).toBeLessThanOrEqual(5);
            expect(location.getAttribute('data-string')).not.toBe('0');
        }
    });

    it('opens and closes the single mobile navigation disclosure without duplicating navigators', async () => {
        const user = userEvent.setup();
        render(<WorkspaceHarness />);
        const trigger = screen.getByRole('button', { name: /Explore scale/ });
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        await user.click(trigger);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(screen.getAllByText('Scale Navigator')).toHaveLength(1);
        await user.click(screen.getByRole('button', { name: 'Close scale navigator' }));
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(trigger);
    });
});
