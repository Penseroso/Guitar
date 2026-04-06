import { getNoteName } from './logic';
import { SCALES, generateModeData } from './theory';
import { resolveChordRegistryEntry } from './chords';
import {
    getScaleChordRecommendationProfile,
    type ScaleChordRecommendationProfile,
    type SupportedRecommendationChordType,
} from './scale-chord-profiles';

export interface ScaleChordRecommendation {
    id: string;
    chordType: SupportedRecommendationChordType;
    rootPitchClass: number;
    symbol: string;
    degree: string;
    roleTag?: string;
}

export interface ScaleChordRecommendationSet {
    usable: ScaleChordRecommendation[];
    characteristic: ScaleChordRecommendation[];
}

interface InternalScaleChordCandidate extends ScaleChordRecommendation {
    internalPriority: number;
}

const HEPTATONIC_GROUPS = new Set([
    'Diatonic Modes',
    'Harmonic Minor Modes',
    'Jazz Minor Modes',
]);

function buildRecommendationSymbol(rootPitchClass: number, chordType: SupportedRecommendationChordType, degree: string) {
    const entry = resolveChordRegistryEntry(chordType);
    return `${getNoteName(rootPitchClass, degree.includes('b'))}${entry.symbol}`;
}

function inferRoleTag(degree: string, chordType: SupportedRecommendationChordType): string | undefined {
    if (degree === 'I' || degree === 'i') {
        return 'center';
    }

    if (chordType === 'dominant-7' || degree === 'V' || degree === 'v') {
        return 'pull';
    }

    if (degree.startsWith('bII') || degree.startsWith('II') || degree.startsWith('IV')) {
        return 'color';
    }

    if (chordType === 'major-6') {
        return 'color';
    }

    return undefined;
}

function createRecommendation(
    degree: string,
    rootPitchClass: number,
    chordType: SupportedRecommendationChordType,
    roleTag?: string
): InternalScaleChordCandidate {
    return {
        id: `${degree}:${chordType}:${rootPitchClass}`,
        chordType,
        rootPitchClass,
        symbol: buildRecommendationSymbol(rootPitchClass, chordType, degree),
        degree,
        roleTag: roleTag ?? inferRoleTag(degree, chordType),
        internalPriority: 0,
    };
}

function toTriadRecommendation(degree: string, rootPitchClass: number): InternalScaleChordCandidate | null {
    let chordType: SupportedRecommendationChordType | null = null;

    if (degree.endsWith('°')) {
        return null;
    }

    if (degree === degree.toLowerCase()) {
        chordType = 'minor';
    } else {
        chordType = 'major';
    }

    return createRecommendation(degree, rootPitchClass, chordType);
}

function toHeptatonicRecommendation(
    degree: string,
    rootPitchClass: number,
    chordSignature: [number, number, number]
): InternalScaleChordCandidate | null {
    const [third, fifth, seventh] = chordSignature;
    let chordType: SupportedRecommendationChordType | null = null;

    if (third === 4 && fifth === 7 && seventh === 11) {
        chordType = 'major-7';
    } else if (third === 4 && fifth === 7 && seventh === 10) {
        chordType = 'dominant-7';
    } else if (third === 3 && fifth === 7 && seventh === 10) {
        chordType = 'minor-7';
    } else if (third === 3 && fifth === 6 && seventh === 10) {
        chordType = 'half-diminished-7';
    } else if (third === 3 && fifth === 6 && seventh === 9) {
        chordType = 'diminished-7';
    } else if (third === 4 && fifth === 7) {
        chordType = 'major';
    } else if (third === 3 && fifth === 7) {
        chordType = 'minor';
    }

    if (!chordType) {
        return null;
    }

    return createRecommendation(degree, rootPitchClass, chordType);
}

function buildUsableCandidates(
    selectedKey: number,
    scaleGroup: string,
    scaleName: string
): InternalScaleChordCandidate[] {
    const scaleIntervals = SCALES[scaleGroup]?.[scaleName] ?? SCALES['Diatonic Modes']['Ionian'];
    const modeData = generateModeData(scaleGroup, scaleName);

    if (HEPTATONIC_GROUPS.has(scaleGroup) && scaleIntervals.length >= 7) {
        return scaleIntervals.flatMap((rootInterval, index) => {
            const third = (scaleIntervals[(index + 2) % scaleIntervals.length] - rootInterval + 12) % 12;
            const fifth = (scaleIntervals[(index + 4) % scaleIntervals.length] - rootInterval + 12) % 12;
            const seventh = (scaleIntervals[(index + 6) % scaleIntervals.length] - rootInterval + 12) % 12;
            const degree = modeData[rootInterval]?.role;

            if (!degree) {
                return [];
            }

            const recommendation = toHeptatonicRecommendation(
                degree,
                (selectedKey + rootInterval) % 12,
                [third, fifth, seventh]
            );

            return recommendation ? [recommendation] : [];
        });
    }

    return Object.entries(modeData)
        .sort((left, right) => Number(left[0]) - Number(right[0]))
        .flatMap(([intervalText, data]) => {
            const recommendation = toTriadRecommendation(
                data.role,
                (selectedKey + Number(intervalText)) % 12
            );

            return recommendation ? [recommendation] : [];
        });
}

function withInternalPriority(
    candidate: InternalScaleChordCandidate,
    profile: ScaleChordRecommendationProfile,
    selectedKey: number
): InternalScaleChordCandidate {
    let internalPriority = 0;

    if (candidate.rootPitchClass === selectedKey) {
        internalPriority += 10;
    }

    if (candidate.chordType === 'dominant-7') {
        internalPriority += 4;
    }

    if (profile.characteristicPreferredDegrees?.includes(candidate.degree)) {
        internalPriority += 6;
    }

    if (profile.tonicPreferredChordTypes?.includes(candidate.chordType) && candidate.rootPitchClass === selectedKey) {
        internalPriority += 5;
    }

    if (profile.preferredChordFormsByDegree?.[candidate.degree]?.includes(candidate.chordType)) {
        internalPriority += 8;
    }

    return {
        ...candidate,
        internalPriority,
    };
}

function buildSyntheticCharacteristicCandidates(
    profile: ScaleChordRecommendationProfile,
    selectedKey: number
): InternalScaleChordCandidate[] {
    return (profile.characteristicAdditions ?? []).map((addition) =>
        createRecommendation(addition.degree, selectedKey, addition.chordType, addition.roleTag)
    );
}

function selectCharacteristicRecommendations(
    usable: InternalScaleChordCandidate[],
    profile: ScaleChordRecommendationProfile,
    selectedKey: number
): ScaleChordRecommendation[] {
    const selected: InternalScaleChordCandidate[] = [];
    const seen = new Set<string>();

    const prioritizedUsable = usable
        .map((candidate) => withInternalPriority(candidate, profile, selectedKey))
        .sort((left, right) => right.internalPriority - left.internalPriority);

    const availableCandidates = [
        ...prioritizedUsable,
        ...buildSyntheticCharacteristicCandidates(profile, selectedKey),
    ];

    const pushMatch = (matcher: (recommendation: InternalScaleChordCandidate) => boolean) => {
        const match = availableCandidates.find((recommendation) => !seen.has(recommendation.id) && matcher(recommendation));
        if (!match) {
            return;
        }

        seen.add(match.id);
        selected.push(match);
    };

    for (const degree of profile.characteristicPreferredDegrees ?? []) {
        const preferredForms = profile.preferredChordFormsByDegree?.[degree];

        if (preferredForms?.length) {
            for (const chordType of preferredForms) {
                pushMatch((recommendation) => recommendation.degree === degree && recommendation.chordType === chordType);
            }
            continue;
        }

        pushMatch((recommendation) => recommendation.degree === degree);
    }

    switch (profile.fallbackSelectionStrategy) {
        case 'minor-tonic-then-dominant':
            pushMatch(
                (recommendation) =>
                    recommendation.rootPitchClass === selectedKey &&
                    (profile.tonicPreferredChordTypes?.includes(recommendation.chordType) ?? recommendation.chordType === 'minor-7')
            );
            pushMatch((recommendation) => recommendation.chordType === 'dominant-7');
            break;
        case 'tonic-then-any':
            pushMatch((recommendation) => recommendation.rootPitchClass === selectedKey);
            break;
        case 'tonic-then-dominant':
        default:
            pushMatch(
                (recommendation) =>
                    recommendation.rootPitchClass === selectedKey &&
                    (!profile.tonicPreferredChordTypes?.length ||
                        profile.tonicPreferredChordTypes.includes(recommendation.chordType))
            );
            pushMatch((recommendation) => recommendation.chordType === 'dominant-7');
            break;
    }

    if (selected.length < Math.min(2, profile.maxCharacteristicCount)) {
        pushMatch((recommendation) => recommendation.rootPitchClass === selectedKey);
    }

    if (selected.length < profile.maxCharacteristicCount) {
        pushMatch(() => true);
    }

    return selected.slice(0, profile.maxCharacteristicCount).map(({ internalPriority: _internalPriority, ...recommendation }) => recommendation);
}

function toPublicRecommendation({ internalPriority: _internalPriority, ...recommendation }: InternalScaleChordCandidate): ScaleChordRecommendation {
    return recommendation;
}

export function buildScaleChordRecommendations(
    selectedKey: number,
    scaleGroup: string,
    scaleName: string
): ScaleChordRecommendationSet {
    const profile = getScaleChordRecommendationProfile(scaleGroup, scaleName);
    const internalUsable = buildUsableCandidates(selectedKey, scaleGroup, scaleName).slice(0, 7);
    const usable = internalUsable.map(toPublicRecommendation);
    const characteristic = selectCharacteristicRecommendations(internalUsable, profile, selectedKey);

    return {
        usable,
        characteristic,
    };
}
