import { getVoicingDisplayName, getVoicingDisplaySubtitle, getVoicingProvenanceLabel } from './descriptor';
import {
    buildChordDefinitionFromRegistryEntry,
    getChordTypeLabel,
    getChordTypeSuffix,
    resolveChordRegistryEntry,
} from './helpers';
import { getChordSurfaceVoicingsForChord } from './voicings';
import type {
    GuitarStringIndex,
    ResolvedVoicing,
    VoicingFamily,
    VoicingProvenanceSourceKind,
    VoicingRegisterBand,
} from './types';

export const USAGE_PRIOR_SURFACE_CHORD_IDS = [
    'major',
    'minor',
    'power-5',
    'sus2',
    'sus4',
    'major-7',
    'major-6',
    'minor-7',
    'dominant-7',
    'half-diminished-7',
    'diminished-7',
    'major-9',
    'minor-9',
    'dominant-9',
    'dominant-11',
    'dominant-13',
    'hendrix-7-sharp-9',
    'dominant-7-flat-9',
] as const;

const ROOT_NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export interface UsagePriorVoicingDescriptorSummary {
    family: VoicingFamily;
    registerBand: VoicingRegisterBand;
    rootString?: GuitarStringIndex;
    inversion: ResolvedVoicing['descriptor']['inversion'];
    noteCount: number;
    playedStrings: GuitarStringIndex[];
    optionalCoverageDegrees: string[];
    rootOccurrenceCount: number;
}

export interface UsagePriorSurfaceCandidate {
    chordType: string;
    candidateId: string;
    rootPitchClass: number;
    chordLabel: string;
    chordTypeLabel: string;
    displayName: string;
    displaySubtitle: string | null;
    sourceLabel: string;
    seedId?: string;
    sourceKind: VoicingProvenanceSourceKind;
    provenance: ResolvedVoicing['descriptor']['provenance'];
    voicingDescriptor: UsagePriorVoicingDescriptorSummary;
    voicing: ResolvedVoicing;
    snapshotGeneratedAt: string;
}

export interface UsagePriorSurfaceSetSnapshot {
    snapshotId: string;
    snapshotGeneratedAt: string;
    rootPitchClasses: number[];
    candidates: UsagePriorSurfaceCandidate[];
}

export interface BuildUsagePriorSurfaceSetOptions {
    rootPitchClasses?: number[];
    chordTypes?: readonly string[];
    snapshotGeneratedAt?: string;
    maxRootFret?: number;
    maxCandidates?: number;
}

function buildSnapshotId(snapshotGeneratedAt: string, rootPitchClasses: number[]): string {
    return `surface-set:${rootPitchClasses.join('-')}:${snapshotGeneratedAt}`;
}

function buildDescriptorSummary(voicing: ResolvedVoicing): UsagePriorVoicingDescriptorSummary {
    return {
        family: voicing.descriptor.family,
        registerBand: voicing.descriptor.registerBand,
        rootString: voicing.descriptor.rootString,
        inversion: voicing.descriptor.inversion,
        noteCount: voicing.descriptor.noteCount,
        playedStrings: [...voicing.descriptor.playedStrings],
        optionalCoverageDegrees: [...voicing.descriptor.optionalCoverageDegrees],
        rootOccurrenceCount: voicing.descriptor.rootOccurrenceCount,
    };
}

function buildSurfaceCandidate(
    chordType: string,
    rootPitchClass: number,
    voicing: ResolvedVoicing,
    snapshotGeneratedAt: string
): UsagePriorSurfaceCandidate {
    const entry = resolveChordRegistryEntry(chordType);
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass);
    const chordLabel = `${ROOT_NOTE_NAMES[chord.rootPitchClass] ?? 'C'}${getChordTypeSuffix(entry)}`;

    return {
        chordType,
        candidateId: voicing.id,
        rootPitchClass,
        chordLabel,
        chordTypeLabel: getChordTypeLabel(entry),
        displayName: getVoicingDisplayName(voicing.descriptor),
        displaySubtitle: getVoicingDisplaySubtitle(voicing.descriptor),
        sourceLabel: getVoicingProvenanceLabel(voicing.descriptor.provenance),
        seedId: voicing.descriptor.provenance.seedId,
        sourceKind: voicing.descriptor.provenance.sourceKind,
        provenance: voicing.descriptor.provenance,
        voicingDescriptor: buildDescriptorSummary(voicing),
        voicing,
        snapshotGeneratedAt,
    };
}

export function buildUsagePriorSurfaceSetSnapshot(
    options: BuildUsagePriorSurfaceSetOptions = {}
): UsagePriorSurfaceSetSnapshot {
    const snapshotGeneratedAt = options.snapshotGeneratedAt ?? new Date().toISOString();
    const rootPitchClasses = options.rootPitchClasses ?? [0];
    const chordTypes = options.chordTypes ?? USAGE_PRIOR_SURFACE_CHORD_IDS;
    const candidates = rootPitchClasses.flatMap((rootPitchClass) => {
        return chordTypes.flatMap((chordType) => {
            try {
                return getChordSurfaceVoicingsForChord(chordType, rootPitchClass, {
                    maxRootFret: options.maxRootFret ?? 15,
                    maxCandidates: options.maxCandidates ?? 12,
                }).map((candidate) => buildSurfaceCandidate(
                    chordType,
                    rootPitchClass,
                    candidate.voicing,
                    snapshotGeneratedAt
                ));
            } catch {
                return [];
            }
        });
    });

    return {
        snapshotId: buildSnapshotId(snapshotGeneratedAt, rootPitchClasses),
        snapshotGeneratedAt,
        rootPitchClasses,
        candidates,
    };
}

export function groupUsagePriorSurfaceCandidates(
    candidates: UsagePriorSurfaceCandidate[]
): Array<{
    chordType: string;
    chordTypeLabel: string;
    chordLabel: string;
    candidates: UsagePriorSurfaceCandidate[];
}> {
    return USAGE_PRIOR_SURFACE_CHORD_IDS.map((chordType) => {
        const matchingCandidates = candidates.filter((candidate) => candidate.chordType === chordType);

        if (matchingCandidates.length === 0) {
            return null;
        }

        return {
            chordType,
            chordTypeLabel: matchingCandidates[0].chordTypeLabel,
            chordLabel: matchingCandidates[0].chordLabel,
            candidates: matchingCandidates,
        };
    }).filter((group): group is NonNullable<typeof group> => group !== null);
}
