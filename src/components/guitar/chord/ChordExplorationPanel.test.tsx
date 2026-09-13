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
        selected: page.rows[0], setView: noop, setSurface:noop, select: noop, nextPage: noop, previousPage: noop, firstPage: noop, retry: noop,
        continueSearch: noop, cancel: noop, ...patch };
}
function render(engine: EngineExploration) {
    return renderToStaticMarkup(<ChordExplorationPanel engine={engine} context="standalone" onContextChange={noop} title="C"
        onToggleIntervals={noop} showIntervals={false} toneChoices={[{ value: '1', label: 'C · 1' }, { value: '3', label: 'E · 3' }, { value: '5', label: 'G · 5' }]} />);
}

describe('integrated engine presentation', () => {
    it('allows a Recommended selection with an UNCERTAIN physical status without exposing raw physical status',()=>{
        const uncertain=new EngineSession({...intent,physical:{warningSpanUm:0,severeSpanUm:180000}});
        const selected=uncertain.lookup('shape-v1:64,59,55,50,45,40:0,1,0,2,3,-1');
        expect(selected.recommendation.eligible).toBe(true);expect(selected.physical.status).toBe('UNCERTAIN');
        const markup=render(state({request:uncertain.request,selected,surface:'recommended'}));
        expect(markup).not.toContain('UNCERTAIN');
        for(const reason of selected.physical.reasonCodes)expect(markup).not.toContain(physicalReasonText(reason));
        const detail=renderToStaticMarkup(<VoicingFactsView candidate={selected}/>);
        expect(detail).toContain('Selected by the recommendation policy.');
        expect(detail).not.toMatch(/ledger|allocationId|Base preference|Stopped-wire|Profile:|Tuning MIDI/);
        expect(markup).not.toMatch(/Documented reference shape|wide-or-complex|product-extrapolated|CAGED|Demand tier/);
    });
    it('explains a PASS selection outside Recommended without a physical-unsuitability claim',()=>{
        const request=new EngineSession({...intent,context:'accompaniment'});
        const selected=request.lookup('shape-v1:64,59,55,50,45,40:0,5,5,2,3,-1');
        expect(selected.physical.status).toBe('PASS');expect(selected.recommendation.eligible).toBe(false);
        const markup=render(state({request:request.request,selected,surface:'recommended'}));
        expect(markup).toContain('outside this surface or these filters');
        const detail=renderToStaticMarkup(<VoicingFactsView candidate={selected}/>);
        expect(detail).toContain('Outside the recommendation policy; available in All voicings.');
        expect(detail).not.toMatch(/unsuitable|unplayable|uncomfortable|anatomically/);
    });
    it('shows six exact rows and accessible cursor navigation without exposing engineering internals', () => {
        const markup = render(state());
        expect(markup).toContain(`data-results-count="${page.summary.matching}"`);
        expect(markup.match(/data-voicing-id=/g)).toHaveLength(6);
        expect(markup).toContain('Previous page'); expect(markup).toContain('Next page');
        expect(markup).toContain('strings 6 to 1:'); expect(markup).not.toContain('Show more');
        expect(markup).not.toMatch(/structural allocations|Human validation|generic static-fretting heuristic|PASS|UNCERTAIN|REJECT|Result \d/);
    });
    it('keeps a selected allocation outside the current page and filters', () => {
        const later = session.begin({}, 12, page.nextCursor); while (!later.step()) { /* second exact page */ }
        const selected = later.finish().rows[11];
        expect(page.rows.some(row => row.candidate.allocationId === selected.candidate.allocationId)).toBe(false);
        const view = createViewMatcher(session.request, { root: 'omit' }).view;
        const markup = render(state({ selected, view }));
        expect(markup).toContain(`data-selected-id="${selected.candidate.allocationId}"`);
        expect(markup).toContain('Selected voicing is outside this surface or these filters.');
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
    it('keeps the Details disclosure limited to musical facts and hides engineering internals', () => {
        const unusual = new EngineSession({ ...intent, physical: { warningSpanUm: 1, severeSpanUm: 2, omittedStrings: 'require-left-hand-damping' } });
        const row = unusual.lookup(allocationId(unusual.request.structural.instrument.tuningMidi, [0, 8, 9, 10, -1, -1]));
        const markup = renderToStaticMarkup(<VoicingFactsView candidate={row} />);
        expect(row.physical.status).toBe('UNCERTAIN');
        expect(markup).toContain('Degrees:');
        expect(markup).toMatch(/Selected by the recommendation policy\.|Outside the recommendation policy; available in All voicings\./);
        expect(markup).not.toMatch(/UNCERTAIN|PASS|Stopped-wire|Partial-cover|Profile:|Tuning MIDI|Request defaults|Base preference|data-ledger-term|scoreNumerator|Human validation|allocationId|featureVersion/);
    });
    it('keeps all-open selection under unconstrained position and labels it truthfully', () => {
        const open = new EngineSession({ ...intent, instrument: { tuningMidi: [60, 64, 67, 60, 64, 67], maxModeledFret: 0 } });
        const openScan = open.begin(); while (!openScan.step()) { /* tiny all-open fixture */ }
        const openPage = openScan.finish();
        const markup = render(state({ request: open.request, page: openPage, selected: openPage.rows[0], summary: openPage.summary }));
        expect(markup).toContain('All open'); expect(markup).not.toContain('outside this surface or these filters');
        expect(markup).not.toContain('Fret 0</p>');
    });
    it('disables Next at an exact final page even when its boundary cursor is retained', () => {
        const complete = new EngineSession({ ...intent, instrument: { tuningMidi: [60, 64, 67, 60, 64, 67], maxModeledFret: 0 } });
        const finalScan = complete.begin({}, 128); while (!finalScan.step()) { /* complete tiny fixture */ }
        const finalPage = finalScan.finish();
        expect(finalPage.summary.hasMore).toBe(false); expect(finalPage.nextCursor).not.toBeNull();
        const markup = render(state({ request: complete.request, page: finalPage, selected: finalPage.rows[0], summary: finalPage.summary }));
        expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Next page<\/button>/);
    });
});
