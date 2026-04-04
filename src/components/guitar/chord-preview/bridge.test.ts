import { describe, expect, it } from 'vitest';

import type { VoicingCandidate } from '../../../utils/guitar/chords';
import { getBridgeSelectionKey, getReasonPreview, resolveBridgeSelection } from './bridge';

function makeCandidate(id: string, playable: boolean, score: number): VoicingCandidate {
    return {
        score,
        reasons: [`Reason ${id}`],
        matchedRequiredDegrees: ['1', '3'],
        missingRequiredDegrees: [],
        voicing: {
            id,
            chord: {
                id: 'major',
                symbol: '',
                rootPitchClass: 0,
                quality: 'major',
                intervals: [0, 4, 7],
            },
            notes: [],
            minFret: 0,
            maxFret: 0,
            span: 0,
            playable,
            missingRequiredDegrees: [],
            omittedOptionalDegrees: [],
            omittedDegrees: [],
        },
    };
}

describe('future chord bridge selection', () => {
    it('defaults to the first playable candidate when the top-ranked entry is not playable', () => {
        const resolution = resolveBridgeSelection([
            makeCandidate('ranked-but-unplayable', false, 100),
            makeCandidate('first-playable', true, 90),
            makeCandidate('second-playable', true, 80),
        ]);

        expect(resolution.activeCandidateId).toBe('first-playable');
        expect(resolution.activeIndex).toBe(1);
        expect(resolution.selectionSource).toBe('first-playable');
    });

    it('falls back to the first ranked candidate when nothing playable exists', () => {
        const resolution = resolveBridgeSelection([
            makeCandidate('rank-1', false, 100),
            makeCandidate('rank-2', false, 90),
        ]);

        expect(resolution.activeCandidateId).toBe('rank-1');
        expect(resolution.activeIndex).toBe(0);
        expect(resolution.selectionSource).toBe('first-ranked');
    });

    it('preserves an explicit requested selection when it remains valid', () => {
        const resolution = resolveBridgeSelection([
            makeCandidate('rank-1', true, 100),
            makeCandidate('manual-pick', true, 90),
        ], 'manual-pick');

        expect(resolution.activeCandidateId).toBe('manual-pick');
        expect(resolution.activeIndex).toBe(1);
        expect(resolution.selectionSource).toBe('requested');
    });

    it('returns an empty selection state when no candidates exist', () => {
        const resolution = resolveBridgeSelection([]);

        expect(resolution.activeCandidate).toBeNull();
        expect(resolution.activeCandidateId).toBeNull();
        expect(resolution.activeIndex).toBe(-1);
        expect(resolution.selectionSource).toBe('none');
    });
});

describe('future chord bridge helpers', () => {
    it('creates a stable bridge reset key from chord identity', () => {
        expect(getBridgeSelectionKey('Major', 0)).toBe('Major::0');
        expect(getBridgeSelectionKey('Major', 7)).toBe('Major::7');
        expect(getBridgeSelectionKey('Minor', 0)).toBe('Minor::0');
    });

    it('deduplicates and trims ranking reasons for compact messaging', () => {
        const preview = getReasonPreview([
            'Playable shape',
            'Compact span',
            'Playable shape',
            'Strong root coverage',
        ], 2);

        expect(preview).toEqual(['Playable shape', 'Compact span']);
    });
});
