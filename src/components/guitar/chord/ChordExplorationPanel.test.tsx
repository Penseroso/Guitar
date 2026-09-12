import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { generateExplorationPool, rankExplorationPool } from '@/domain/chord/exploration';
import { ChordExplorationPanel } from './ChordExplorationPanel';
import type { ExplorationWorkerResponse } from './chord-exploration.worker';
import { getChordToneChoices } from './tone-labels';
import { resolveChordRegistryEntry } from '@/domain/chord';

function render(response: ExplorationWorkerResponse | null, selectedId: string | null = null) {
    return renderToStaticMarkup(<ChordExplorationPanel context="standalone" onContextChange={() => {}} title="C" onToggleIntervals={() => {}} response={response}
        onRetry={() => {}} selectedId={selectedId} onSelect={() => {}} showIntervals={false}
        toneChoices={getChordToneChoices(resolveChordRegistryEntry('major'), 0)} />);
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
        expect(markup).toContain(`data-results-count="${candidates.length}"`);
        expect(markup).toContain(`data-selected-id="${selected.voicing.id}"`);
        expect(markup).toContain('Selected voicing');
        expect(markup).toContain('Show more');
        expect(markup).toContain('Play voicing');
        expect(markup.match(/data-voicing-id=/g)!.length).toBeLessThan(candidates.length);
        expect(markup).toContain('Bass C · 1');
        expect(markup).toContain('Top');
        expect(markup).toContain('strings 6 to 1:');
    });
});
