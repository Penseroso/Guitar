import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { generateExplorationPool, rankExplorationPool } from '@/domain/chord/exploration';
import { ChordExplorationPanel } from './ChordExplorationPanel';
import type { ExplorationWorkerResponse } from './chord-exploration.worker';

function render(response: ExplorationWorkerResponse | null, selectedId: string | null = null) {
    return renderToStaticMarkup(<ChordExplorationPanel context="standalone" title="C" onToggleIntervals={() => {}} response={response}
        onRetry={() => {}} selectedId={selectedId} onSelect={() => {}} showIntervals={false} degrees={['1', '3', '5']} />);
}

describe('exploration states', () => {
    it('distinguishes loading, unsupported requests, failures and empty pools', () => {
        expect(render(null)).toContain('Finding voicings');
        expect(render({ status: 'unsupported', message: 'Unsupported chord request.' })).toContain('Unsupported chord request.');
        expect(render({ status: 'error', message: 'Search failed.' })).toContain('Retry search');
        expect(render({ status: 'ready', candidates: [] })).toContain('No candidates within this search model.');
    });

    it('shows a bounded starting list and retains a selection outside that list', () => {
        const pool = generateExplorationPool({ chordId: 'major', rootPitchClass: 0, context: 'standalone' });
        if (pool.status !== 'ready') throw new Error(pool.message);
        const candidates = rankExplorationPool(pool);
        const selected = candidates[100];
        const markup = render({ status: 'ready', candidates }, selected.voicing.id);
        expect(markup).toContain(`Showing 6 of ${candidates.length} voicings`);
        expect(markup).toContain('Selected voicing');
        expect(markup).toContain('Show more');
        expect(markup).not.toContain('Recommended voicings');
        expect(markup).not.toContain('Explore all voicings');
        expect(markup.match(/Sounds:/g)?.length).toBe(1);
        expect(markup).toContain('Play voicing');
        expect(markup).toContain('Sounds:');
        expect(markup.match(/data-voicing-id=/g)?.length).toBe(6);
        expect(markup).not.toContain('Triad ·');
    });
});
