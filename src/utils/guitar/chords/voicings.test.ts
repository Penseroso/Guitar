import { describe, expect, it } from 'vitest';

import { resolveChordRegistryEntry } from './helpers';
import { buildVoicingCandidate } from './ranking';
import { resolveVoicingTemplate } from './resolver';
import { getVoicingTemplatesForChord } from './templates';
import { getRankedVoicingsForChord } from './voicings';

describe('voicing template adaptation', () => {
    it('adapts legacy major shapes into future-facing templates', () => {
        const templates = getVoicingTemplatesForChord('major');
        const firstTemplate = templates[0];

        expect(templates).toHaveLength(5);
        expect(firstTemplate).toMatchObject({
            source: 'legacy-shape',
            rootString: 5,
            label: 'Root 6 (E Shape)',
        });
        expect(firstTemplate.strings).toHaveLength(6);
        expect(firstTemplate.strings[0]).toMatchObject({ string: 0, fretOffset: 0, toneDegree: '1' });
        expect(firstTemplate.strings[4]).toMatchObject({ string: 4, fretOffset: 2, toneDegree: '5' });
    });
});

describe('voicing resolution', () => {
    it('resolves a barred C major shape into concrete fretboard notes', () => {
        const entry = resolveChordRegistryEntry('major');
        const template = getVoicingTemplatesForChord(entry)[0];
        const chord = { ...entry.definition, rootPitchClass: 0 };
        const tones = {
            rootPitchClass: 0,
            intervals: [...entry.formula.intervals],
            tones: entry.normalizedTones.tones.map((tone) => ({ ...tone })),
        };
        const resolved = resolveVoicingTemplate(chord, tones, template);

        expect(resolved.playable).toBe(true);
        expect(resolved.notes.filter((note) => !note.isMuted).map((note) => note.fret)).toEqual([8, 8, 9, 10, 10, 8]);
        expect(resolved.minFret).toBe(8);
        expect(resolved.maxFret).toBe(10);
        expect(resolved.span).toBe(2);
        expect(resolved.omittedDegrees).toEqual([]);
    });

    it('marks invalid negative-fret resolutions as non-playable instead of hiding them', () => {
        const entry = resolveChordRegistryEntry('major');
        const template = getVoicingTemplatesForChord(entry)[4];
        const chord = { ...entry.definition, rootPitchClass: 9 };
        const tones = {
            rootPitchClass: 9,
            intervals: [...entry.formula.intervals],
            tones: entry.normalizedTones.tones.map((tone) => ({
                ...tone,
                pitchClass: (tone.pitchClass + 9) % 12,
            })),
        };
        const resolved = resolveVoicingTemplate(chord, tones, template);

        expect(resolved.playable).toBe(false);
        expect(resolved.notes.filter((note) => !note.isMuted).some((note) => note.fret < 0)).toBe(true);
    });
});

describe('voicing ranking orchestration', () => {
    it('pushes playable major shapes above invalid legacy variants', () => {
        const candidates = getRankedVoicingsForChord('major', 9);

        expect(candidates[0].voicing.playable).toBe(true);
        expect(candidates.at(-1)?.voicing.playable).toBe(false);
        expect(candidates[0].score).toBeGreaterThan(candidates.at(-1)?.score ?? 0);
    });

    it('does not treat optional ninths as missing required degrees', () => {
        const candidates = getRankedVoicingsForChord('major-9', 0);
        const topPlayable = candidates.find((candidate) => candidate.voicing.playable);

        expect(topPlayable).toBeDefined();
        expect(topPlayable?.missingRequiredDegrees).not.toContain('9');
        expect(topPlayable?.matchedRequiredDegrees).toContain('1');
    });

    it('returns human-readable scoring reasons', () => {
        const candidate = buildVoicingCandidate(getRankedVoicingsForChord('power-5', 7)[0].voicing, 'power-5');

        expect(candidate.reasons.length).toBeGreaterThan(0);
        expect(candidate.reasons.some((reason) => reason.includes('Playable'))).toBe(true);
    });
});
