import type { ExplorationCandidate } from '@/domain/chord/exploration';

export function getVoicingPresentationMeta(candidate?: ExplorationCandidate | null) {
    if (!candidate) return { primaryLabel: 'No voicing available', secondaryLabel: '', positionLabel: '' };
    const { facts } = candidate;
    return {
        primaryLabel: `Bass ${facts.bassDegree} · Top ${facts.topDegree}`,
        secondaryLabel: `${facts.playedStrings.length} sounding strings · ${facts.omittedDegrees.length ? `Omits ${facts.omittedDegrees.join(', ')}` : 'Complete formula'}`,
        positionLabel: facts.maxStoppedFret ? `Stopped frets ${facts.minStoppedFret}–${facts.maxStoppedFret}` : 'Open strings only',
    };
}
