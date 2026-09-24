// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiagramLabelSwitch } from './DiagramLabelSwitch';

afterEach(cleanup);

function Harness() {
    const [showIntervals, setShowIntervals] = React.useState(false);
    return <DiagramLabelSwitch caption="Diagram labels" showIntervals={showIntervals} onToggle={() => setShowIntervals(value => !value)} />;
}

describe('DiagramLabelSwitch', () => {
    it('keeps both endpoints visible and switches by pointer and keyboard', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const toggle = screen.getByRole('switch', { name: 'Show intervals instead of notes' });
        expect((toggle as HTMLInputElement).checked).toBe(false);
        expect(screen.getByText('Notes')).toBeTruthy();
        expect(screen.getByText('Intervals')).toBeTruthy();
        await user.click(screen.getByText('Intervals'));
        expect((toggle as HTMLInputElement).checked).toBe(true);
        toggle.focus();
        await user.keyboard(' ');
        expect((toggle as HTMLInputElement).checked).toBe(false);
    });
});
