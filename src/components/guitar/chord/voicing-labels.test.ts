import { expect, it } from 'vitest';
import { generateExplorationPool, rankExplorationPool } from '@/domain/chord/exploration';
import { getVoicingPresentationMeta } from './voicing-labels';

it('describes actual bass, top, density, omissions and stopped position for rootless voicings', () => {
    const pool = generateExplorationPool({ chordId: 'dominant-7', rootPitchClass: 0, context: 'accompaniment' });
    if (pool.status !== 'ready') throw new Error(pool.message);
    const candidate = rankExplorationPool(pool).find(candidate => !candidate.facts.hasRoot && candidate.facts.playedStrings.length === 2)!;
    expect(candidate).toBeDefined();
    const labels = getVoicingPresentationMeta(candidate);
    expect(labels.primaryLabel).toBe(`Bass ${candidate.facts.bassDegree} · Top ${candidate.facts.topDegree}`);
    expect(labels.secondaryLabel).toContain('2 sounding strings');
    expect(labels.secondaryLabel).toContain('Omits 1');
    expect(labels.positionLabel).toBe(`Stopped frets ${candidate.facts.minStoppedFret}–${candidate.facts.maxStoppedFret}`);
    expect(getVoicingPresentationMeta(null).primaryLabel).toBe('No voicing available');
});
