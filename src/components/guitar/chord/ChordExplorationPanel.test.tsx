import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EngineSession } from '@/domain/chord/engine/session';
import { allocationId } from '@/domain/chord/engine/identity';
import { createViewMatcher } from '@/domain/chord/engine/view';
import { physicalReasonText } from '@/domain/chord/engine/presentation';
import { ChordExplorationPanel, VoicingFactsView } from './ChordExplorationPanel';
import type { EngineExploration } from './useChordExploration';
import { INITIAL_ENGINE_STATE } from './explorationController';

const intent = { schema: 'intent-v1', chordId: 'major', rootPitchClass: 0 };
const session = new EngineSession(intent);
const scan = session.begin({}, 6);
while (!scan.step()) { /* Complete this focused fixture before rendering. */ }
const page = scan.finish();
const noop = () => {};
function state(patch: Partial<EngineExploration> = {}): EngineExploration {
    return { ...INITIAL_ENGINE_STATE, phase: 'ready', request: session.request, page, summary: page.summary,
        selected: page.rows[0], setView: noop, select: noop, nextPage: noop, previousPage: noop, firstPage: noop, retry: noop,
        continueSearch: noop, cancel: noop, ...patch };
}
function render(engine: EngineExploration) {
    return renderToStaticMarkup(<ChordExplorationPanel engine={engine} context="standalone" onContextChange={noop} title="C"
        onToggleIntervals={noop} showIntervals={false} toneChoices={[{ value: '1', label: 'C · 1' }, { value: '3', label: 'E · 3' }, { value: '5', label: 'G · 5' }]} />);
}

describe('integrated engine presentation', () => {
    it('shows six exact rows, independent status totals and accessible cursor navigation', () => {
        const markup = render(state());
        expect(markup).toContain(`data-results-count="${page.summary.matching}"`);
        expect(markup.match(/data-voicing-id=/g)).toHaveLength(6);
        expect(markup).toContain('Previous page'); expect(markup).toContain('Next page');
        expect(markup).toContain('structural allocations'); expect(markup).toContain('UNCERTAIN');
        expect(markup).toContain('Human validation: absent.'); expect(markup).toContain('generic static-fretting heuristic');
        expect(markup).toContain('strings 6 to 1:'); expect(markup).not.toContain('Show more');
    });
    it('keeps a selected allocation outside the current page and filters', () => {
        const later = session.begin({}, 12, page.nextCursor); while (!later.step()) { /* second exact page */ }
        const selected = later.finish().rows[11];
        expect(page.rows.some(row => row.candidate.allocationId === selected.candidate.allocationId)).toBe(false);
        const view = createViewMatcher(session.request, { root: 'omit' }).view;
        const markup = render(state({ selected, view }));
        expect(markup).toContain(`data-selected-id="${selected.candidate.allocationId}"`);
        expect(markup).toContain('Selected voicing is outside these filters.');
        expect(markup.match(/data-voicing-id=/g)).toHaveLength(6);
        expect(markup).toContain('Play voicing');
    });
    it('distinguishes incomplete progress, pause, cancellation and exact emptiness', () => {
        const progress = session.begin().summary();
        const partial = render(state({ phase: 'running', selected: null, page: null, summary: progress }));
        expect(partial).toContain('Finding voicings'); expect(partial).toContain('At least 0 matching voicings found; search incomplete.');
        expect(partial).not.toContain('data-results-count='); expect(partial).not.toContain('No voicings match');
        const paused = render(state({ phase: 'paused', page: null, summary: progress }));
        expect(paused).toContain('Continue search'); expect(paused).toContain('Counts are incomplete.');
        expect(render(state({ phase: 'cancelled', page: null }))).toContain('Search cancelled.');
        const emptyScan = session.begin({ root: 'omit' }); while (!emptyScan.step()) { /* exact no-matches fixture */ }
        const emptyPage = emptyScan.finish();
        expect(render(state({ page: emptyPage, summary: emptyPage.summary, view: createViewMatcher(session.request, { root: 'omit' }).view }))).toContain('No voicings match these conditions.');
    });
    it('renders failures even when an old selected snapshot remains and disables its playback', () => {
        const markup = render(state({ phase: 'error', page: null, selectionStale: true, error: { code: 'worker-failed', message: 'Worker stopped.' } }));
        expect(markup).toContain('Worker stopped.'); expect(markup).toContain('Retry search');
        expect(markup).toContain('data-selection-stale="true"'); expect(markup).toContain('Playback is unavailable.');
        expect(markup).toMatch(/<button[^>]*disabled=""[^>]*data-play-id=/);
        expect(markup).not.toContain('data-results-count=');
    });
    it('shows cumulative physical reasons, quantized metrics, provenance and all fourteen ledger terms', () => {
        const unusual = new EngineSession({ ...intent, physical: { warningSpanUm: 1, severeSpanUm: 2, omittedStrings: 'require-left-hand-damping' } });
        const row = unusual.lookup(allocationId(unusual.request.structural.instrument.tuningMidi, [0, 8, 9, 10, -1, -1]));
        const markup = renderToStaticMarkup(<VoicingFactsView candidate={row} request={unusual.request} />);
        expect(row.physical.status).toBe('UNCERTAIN');
        for (const reason of row.physical.reasonCodes) expect(markup).toContain(physicalReasonText(reason));
        expect(markup).toContain('Stopped-wire span'); expect(markup).toContain('Partial-cover groups');
        expect(markup).toContain('647.7 mm (default)'); expect(markup).toContain('Request defaults and explicit choices');
        expect(markup.match(/data-ledger-term=/g)).toHaveLength(14);
        expect(markup).toContain('0/110000'); expect(markup).toContain(`${row.rank.scoreNumerator}/110000`);
        expect(markup).not.toContain('Estimated finger'); expect(markup).not.toContain('Comfort');
    });
    it('keeps all-open selection under unconstrained position and labels it truthfully', () => {
        const open = new EngineSession({ ...intent, instrument: { tuningMidi: [60, 64, 67, 60, 64, 67], maxModeledFret: 0 } });
        const openScan = open.begin(); while (!openScan.step()) { /* tiny all-open fixture */ }
        const openPage = openScan.finish();
        const markup = render(state({ request: open.request, page: openPage, selected: openPage.rows[0], summary: openPage.summary }));
        expect(markup).toContain('All open'); expect(markup).not.toContain('outside these filters');
        expect(markup).not.toContain('Fret 0</p>');
    });
});
