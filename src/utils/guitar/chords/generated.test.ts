import { describe, expect, it } from 'vitest';

import { getGeneratedVoicingTemplatesForChord } from './generated';
import { getRankedVoicingsForChord } from './voicings';

describe('generated voicing candidates', () => {
    it('produces generated shell candidates for seventh-family chords', () => {
        const templates = getGeneratedVoicingTemplatesForChord('dominant-7');

        expect(templates.some((template) => template.source === 'generated')).toBe(true);
        expect(templates.some((template) => template.tags?.includes('generated-shell'))).toBe(true);
    });

    it('generated templates keep required tones for dominant thirteenth voicings', () => {
        const candidates = getRankedVoicingsForChord('dominant-13', 0, {
            includeLegacyCandidates: false,
            includeNonPlayableCandidates: false,
            maxCandidates: 12,
        });
        const shellCandidate = candidates.find((candidate) => candidate.voicing.template?.tags?.includes('generated-shell'));

        expect(shellCandidate).toBeDefined();
        expect(shellCandidate?.voicing.missingRequiredDegrees).toEqual([]);
        expect(shellCandidate?.voicing.notes.some((note) => note.degree === '13')).toBe(true);
    });

    it('mixes generated candidates with legacy templates in the ranked result set', () => {
        const candidates = getRankedVoicingsForChord('major-7', 0, {
            maxCandidates: 12,
            includeNonPlayableCandidates: false,
        });

        expect(candidates.some((candidate) => candidate.voicing.template?.source === 'legacy-shape')).toBe(true);
        expect(candidates.some((candidate) => candidate.voicing.template?.source === 'generated')).toBe(true);
        expect(candidates[0].voicing.playable).toBe(true);
    });
});
