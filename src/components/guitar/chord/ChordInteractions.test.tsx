import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CircleOfFifths } from '../shared/CircleOfFifths';
import { FretRangeControl } from './FretRangeControl';
import { applyTriggerClick, applyTriggerPointerDown, RootDial } from './RootDial';

describe('chord input accessibility contracts', () => {
    it('offers the same twelve pitch choices regardless of the last scale context', () => {
        const render = (selectedScaleGroup: string, selectedScaleName: string) => renderToStaticMarkup(
            <CircleOfFifths rootOnly selectedKey={7} onKeySelect={() => {}} selectedScaleGroup={selectedScaleGroup} selectedScaleName={selectedScaleName} />,
        );
        const markup = render('Diatonic Modes', 'Ionian');
        expect(render('Harmonic Minor Modes', 'Harmonic Minor')).toBe(markup);
        expect(markup.match(/role="option"/g)).toHaveLength(12);
        expect(markup.match(/aria-selected="true"/g)).toHaveLength(1);
        expect(markup).toContain('aria-label="G" aria-selected="true"');
    });

    it('exposes root selection as a popup control instead of an always-pressed toggle', () => {
        const markup = renderToStaticMarkup(<RootDial value={0} onChange={() => {}} />);
        expect(markup).toContain('aria-label="Root C"');
        expect(markup).toContain('aria-haspopup="dialog"');
        expect(markup).toContain('aria-expanded="false"');
        expect(markup).not.toContain('aria-pressed');
    });

    it('renders the root trigger without a decorative chevron — the button itself is the affordance', () => {
        const markup = renderToStaticMarkup(<RootDial value={0} onChange={() => {}} />);
        expect(markup).not.toContain('⌄');
    });

    describe('root trigger open/close is a single deterministic toggle', () => {
        it('a mouse press on the closed trigger opens it, and the click that follows is a no-op', () => {
            const afterPointerDown = applyTriggerPointerDown(false);
            expect(afterPointerDown).toEqual({ open: true, suppressClick: false });
            const afterClick = applyTriggerClick(afterPointerDown.open, afterPointerDown.suppressClick, false);
            expect(afterClick).toEqual(afterPointerDown);
        });

        it('a second mouse press on the open trigger closes it, and the click that follows does not reopen it', () => {
            const afterPointerDown = applyTriggerPointerDown(true);
            expect(afterPointerDown).toEqual({ open: false, suppressClick: true });
            const afterClick = applyTriggerClick(afterPointerDown.open, afterPointerDown.suppressClick, false);
            expect(afterClick).toEqual(afterPointerDown);
        });

        it('keyboard activation (no pointerdown) toggles directly, both directions', () => {
            expect(applyTriggerClick(false, false, true)).toEqual({ open: true, suppressClick: false });
            expect(applyTriggerClick(true, false, true)).toEqual({ open: false, suppressClick: false });
        });

        it('a drag-select release (suppressClick already armed) leaves an open popover open on the trailing click', () => {
            expect(applyTriggerClick(true, true, false)).toEqual({ open: true, suppressClick: true });
        });
    });

    it('keeps both coincident range controls accessible with their actual movable bounds', () => {
        const markup = renderToStaticMarkup(<FretRangeControl min={5} max={5} onChange={() => {}} />);
        const sliders = markup.match(/<button\b[^>]*role="slider"[^>]*>/g) ?? [];
        expect(sliders).toHaveLength(2);
        expect(sliders[0]).toContain('aria-label="Minimum fret"');
        expect(sliders[0]).toContain('aria-valuemin="0" aria-valuemax="5" aria-valuenow="5"');
        expect(sliders[1]).toContain('aria-label="Maximum fret"');
        expect(sliders[1]).toContain('aria-valuemin="5" aria-valuemax="15" aria-valuenow="5"');
    });
});
