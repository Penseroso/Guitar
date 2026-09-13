import { expect, it } from 'vitest';
import { EngineSession } from '@/domain/chord/engine/session';
import { allocationId } from '@/domain/chord/engine/identity';
import { formatDegreeLabel,positionLabel } from '@/domain/chord/engine/presentation';
import { getVoicingPresentationMeta } from './voicing-labels';

it('describes actual bass, top, density, omissions and stopped position for rootless voicings', () => {
    const session=new EngineSession({schema:'intent-v1',chordId:'dominant-7',rootPitchClass:0,context:'accompaniment'});
    const candidate=session.lookup(allocationId([64,59,55,50,45,40],[0,-1,3,-1,-1,-1]));
    expect(candidate).toBeDefined();
    const labels = getVoicingPresentationMeta(candidate);
    expect(labels.primaryLabel).toBe(`Bass ${formatDegreeLabel(candidate.facts.bass.tone)} · Top ${formatDegreeLabel(candidate.facts.top.tone)}`);
    expect(labels.secondaryLabel).toContain('2 sounding strings');
    expect(labels.secondaryLabel).toContain('Omits 1');
    expect(labels.positionLabel).toBe(positionLabel(candidate));
    expect(getVoicingPresentationMeta(null).primaryLabel).toBe('No voicing selected');
});
