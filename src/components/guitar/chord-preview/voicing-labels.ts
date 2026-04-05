import {
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

const TOP_SET_TRIAD_IDS = new Set(['major', 'minor']);

function getPlayedNotes(voicing: ResolvedVoicing) {
    return voicing.notes.filter((note) => !note.isMuted);
}

function getPositionLabel(voicing: ResolvedVoicing): string {
    if (voicing.minFret === 0 || getPlayedNotes(voicing).some((note) => note.fret === 0)) {
        return 'open';
    }

    return `${voicing.rootFret ?? voicing.minFret}fr`;
}

function getCompactFamilyLabel(voicing: ResolvedVoicing): string | null {
    const family = voicing.descriptor.family;

    if (family === 'upper-register') {
        return 'high';
    }

    return getVoicingFamilyLabel(family).toLowerCase();
}

function getRootStringPrimaryLabel(voicing: ResolvedVoicing): string | null {
    const rootString = voicing.descriptor.rootString;

    if (rootString === 5 || rootString === 4 || rootString === 3) {
        return `${rootString + 1}th-string root`;
    }

    return null;
}

function getBassDegree(voicing: ResolvedVoicing): string | undefined {
    return [...getPlayedNotes(voicing)]
        .sort((left, right) => (left.midiNote ?? 0) - (right.midiNote ?? 0))[0]
        ?.degree;
}

function isStrictTopSetTriad(voicing: ResolvedVoicing): boolean {
    if (!TOP_SET_TRIAD_IDS.has(voicing.chord.id)) {
        return false;
    }

    const playedNotes = getPlayedNotes(voicing);
    if (playedNotes.length !== 3) {
        return false;
    }

    const playedStrings = playedNotes
        .map((note) => note.string)
        .sort((left, right) => left - right);
    const playedDegrees = new Set(playedNotes.map((note) => note.degree));
    const expectedThird = voicing.chord.id === 'minor' ? 'b3' : '3';

    return playedStrings.join(',') === '0,1,2'
        && playedDegrees.has('1')
        && playedDegrees.has(expectedThird)
        && playedDegrees.has('5');
}

function getTopSetPrimaryLabel(voicing: ResolvedVoicing): string | null {
    if (!isStrictTopSetTriad(voicing)) {
        return null;
    }

    const bassDegree = getBassDegree(voicing);

    if (bassDegree === '1') {
        return 'Top-set · Root';
    }

    if (bassDegree === '3' || bassDegree === 'b3') {
        return 'Top-set · 1st inv';
    }

    if (bassDegree === '5') {
        return 'Top-set · 2nd inv';
    }

    return null;
}

function getPrimaryLabel(voicing: ResolvedVoicing): string {
    if (voicing.descriptor.inversion === 'slash-bass') {
        return 'Slash bass';
    }

    if (voicing.descriptor.inversion === 'rootless' || !voicing.descriptor.hasRoot) {
        return 'Rootless';
    }

    const topSetLabel = getTopSetPrimaryLabel(voicing);
    if (topSetLabel) {
        return topSetLabel;
    }

    if (voicing.minFret === 0 || getPlayedNotes(voicing).some((note) => note.fret === 0)) {
        return 'Open';
    }

    return getRootStringPrimaryLabel(voicing) ?? 'Position voicing';
}

function getSecondaryLabel(voicing: ResolvedVoicing): string | null {
    const positionLabel = getPositionLabel(voicing);
    const compactFamilyLabel = getCompactFamilyLabel(voicing);

    if (voicing.descriptor.inversion === 'slash-bass') {
        return [positionLabel, compactFamilyLabel].filter(Boolean).join(' · ');
    }

    if (voicing.descriptor.inversion === 'rootless' || !voicing.descriptor.hasRoot) {
        return [positionLabel, 'root omitted'].filter(Boolean).join(' · ');
    }

    if (isStrictTopSetTriad(voicing)) {
        return 'top strings';
    }

    if (positionLabel === 'open') {
        return [positionLabel, compactFamilyLabel].filter(Boolean).join(' · ');
    }

    return [positionLabel, compactFamilyLabel].filter(Boolean).join(' · ');
}

export function getVoicingPresentationMeta(voicing?: ResolvedVoicing): VoicingPresentationMeta {
    const descriptor = voicing?.descriptor;

    if (!descriptor || !voicing) {
        return {
            primaryLabel: 'Voicing',
            secondaryLabel: null,
            sourceLabel: null,
            familyLabel: null,
        };
    }

    return {
        primaryLabel: getPrimaryLabel(voicing),
        secondaryLabel: getSecondaryLabel(voicing),
        sourceLabel: getVoicingProvenanceLabel(descriptor.provenance),
        familyLabel: null,
    };
}
