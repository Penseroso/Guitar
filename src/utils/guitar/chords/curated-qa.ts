import { getChordTypeLabel, getChordTypeSuffix, resolveChordRegistryEntry } from './helpers';
import { getCuratedVoicingTemplatesForChord } from './curated';
import { getVoicingDisplayName, getVoicingDisplaySubtitle } from './descriptor';
import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry } from './helpers';
import { resolveVoicingTemplate } from './resolver';
import type { ChordRegistryEntry } from './registry';
import type { ResolvedVoicing } from './types';

export const CURATED_QA_REVIEW_CHORD_IDS = [
    'major',
    'minor',
    'major-7',
    'minor-7',
    'dominant-7',
    'sus2',
    'sus4',
    'major-9',
    'dominant-9',
] as const;

export type CuratedQaChordId = (typeof CURATED_QA_REVIEW_CHORD_IDS)[number];
export type CuratedQaDecision = 'accept' | 'borderline' | 'reject';

export interface CuratedQaReviewRecord {
    chordType: CuratedQaChordId;
    candidateId: string;
    decision: CuratedQaDecision;
}

export type CuratedQaReviewState = Record<string, CuratedQaReviewRecord>;

export interface CuratedQaCandidate {
    candidateId: string;
    chordType: CuratedQaChordId;
    chordTypeLabel: string;
    chordLabel: string;
    voicing: ResolvedVoicing;
    sourceLabel: string;
    displayName: string;
    displaySubtitle: string | null;
    seedId?: string;
}

function getReviewKey(chordType: CuratedQaChordId, candidateId: string): string {
    return `${chordType}::${candidateId}`;
}

export function getCuratedQaReviewKey(record: Pick<CuratedQaReviewRecord, 'chordType' | 'candidateId'>): string {
    return getReviewKey(record.chordType, record.candidateId);
}

export function recordCuratedQaDecision(
    currentState: CuratedQaReviewState,
    record: CuratedQaReviewRecord
): CuratedQaReviewState {
    return {
        ...currentState,
        [getCuratedQaReviewKey(record)]: record,
    };
}

export function getCuratedQaDecisionForCandidate(
    currentState: CuratedQaReviewState,
    candidate: Pick<CuratedQaCandidate, 'chordType' | 'candidateId'>
): CuratedQaDecision | null {
    return currentState[getReviewKey(candidate.chordType, candidate.candidateId)]?.decision ?? null;
}

export function isDeveloperCuratedQaEnabled(args: {
    nodeEnv?: string;
    search?: string;
}): boolean {
    if (args.nodeEnv === 'production') {
        return false;
    }

    const params = new URLSearchParams(args.search ?? '');
    return params.get('dev-curated-qa') === '1';
}

function buildCuratedQaCandidate(entry: ChordRegistryEntry, rootPitchClass: number, templateIndex: number): CuratedQaCandidate {
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass);
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);
    const template = getCuratedVoicingTemplatesForChord(entry)[templateIndex];
    const voicing = resolveVoicingTemplate(chord, tones, template);

    return {
        candidateId: voicing.id,
        chordType: entry.id as CuratedQaChordId,
        chordTypeLabel: getChordTypeLabel(entry),
        chordLabel: `${chord.symbol}${getChordTypeSuffix(entry)}`,
        voicing,
        sourceLabel: 'Curated',
        displayName: getVoicingDisplayName(voicing.descriptor),
        displaySubtitle: getVoicingDisplaySubtitle(voicing.descriptor),
        seedId: voicing.descriptor.provenance.seedId,
    };
}

export function getCuratedQaCandidates(rootPitchClass: number): CuratedQaCandidate[] {
    return CURATED_QA_REVIEW_CHORD_IDS.flatMap((chordType) => {
        const entry = resolveChordRegistryEntry(chordType);
        const templates = getCuratedVoicingTemplatesForChord(entry);

        return templates.map((_, templateIndex) => buildCuratedQaCandidate(entry, rootPitchClass, templateIndex));
    });
}
