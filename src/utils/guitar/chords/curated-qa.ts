import { getChordTypeLabel, getChordTypeSuffix, resolveChordRegistryEntry } from './helpers';
import { getCuratedVoicingTemplatesForChord } from './curated';
import { getVoicingDisplayName, getVoicingDisplaySubtitle, getVoicingProvenanceLabel } from './descriptor';
import { getLegacyVoicingTemplatesForChord } from './templates';
import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry } from './helpers';
import { resolveVoicingTemplate } from './resolver';
import type { ChordRegistryEntry } from './registry';
import type { ResolvedVoicing, VoicingTemplate } from './types';

export const CURATED_QA_REVIEW_CHORD_IDS = [
    'major',
    'major-6',
    'major-7',
    'major-9',
    'minor',
    'minor-7',
    'dominant-7',
    'dominant-9',
    'sus2',
    'sus4',
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
    const template = getCuratedQaTemplatesForChord(entry)[templateIndex];
    const voicing = resolveVoicingTemplate(chord, tones, template);

    return {
        candidateId: voicing.id,
        chordType: entry.id as CuratedQaChordId,
        chordTypeLabel: getChordTypeLabel(entry),
        chordLabel: `${chord.symbol}${getChordTypeSuffix(entry)}`,
        voicing,
        sourceLabel: getVoicingProvenanceLabel(voicing.descriptor.provenance),
        displayName: getVoicingDisplayName(voicing.descriptor),
        displaySubtitle: getVoicingDisplaySubtitle(voicing.descriptor),
        seedId: voicing.descriptor.provenance.seedId,
    };
}

function getCuratedQaTemplateSignature(template: VoicingTemplate): string {
    return template.strings
        .map((stringValue) => `${stringValue.string}:${stringValue.fretOffset ?? 'x'}`)
        .join('|');
}

function getCuratedQaTemplatesForChord(entryInput: string | ChordRegistryEntry): VoicingTemplate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const curatedTemplates = getCuratedVoicingTemplatesForChord(entry);

    if (entry.id !== 'major') {
        return curatedTemplates;
    }

    const majorTemplates = [...curatedTemplates, ...getLegacyVoicingTemplatesForChord(entry)];
    const seenSignatures = new Set<string>();

    return majorTemplates.filter((template) => {
        const signature = getCuratedQaTemplateSignature(template);

        if (seenSignatures.has(signature)) {
            return false;
        }

        seenSignatures.add(signature);
        return true;
    });
}

export function getCuratedQaCandidates(rootPitchClass: number): CuratedQaCandidate[] {
    return CURATED_QA_REVIEW_CHORD_IDS.flatMap((chordType) => {
        const entry = resolveChordRegistryEntry(chordType);
        const templates = getCuratedQaTemplatesForChord(entry);

        return templates.map((_, templateIndex) => buildCuratedQaCandidate(entry, rootPitchClass, templateIndex));
    });
}
