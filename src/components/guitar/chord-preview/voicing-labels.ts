import {
    getVoicingDisplayName,
    getVoicingDisplaySubtitle,
    getVoicingFamilyLabel,
    getVoicingProvenanceLabel,
    type ResolvedVoicing,
} from '../../../utils/guitar/chords';

export interface VoicingPresentationMeta {
    primaryLabel: string;
    secondaryLabel: string | null;
    sourceLabel: string | null;
    familyLabel: string | null;
}

export function getVoicingPresentationMeta(voicing?: ResolvedVoicing): VoicingPresentationMeta {
    const descriptor = voicing?.descriptor;

    if (!descriptor) {
        return {
            primaryLabel: 'Voicing',
            secondaryLabel: null,
            sourceLabel: null,
            familyLabel: null,
        };
    }

    return {
        primaryLabel: getVoicingDisplayName(descriptor),
        secondaryLabel: getVoicingDisplaySubtitle(descriptor),
        sourceLabel: getVoicingProvenanceLabel(descriptor.provenance),
        familyLabel: getVoicingFamilyLabel(descriptor.family),
    };
}
