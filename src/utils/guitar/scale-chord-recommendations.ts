import { getNoteName } from './logic';
import { SCALES, generateModeData } from './theory';
import { resolveChordRegistryEntry } from './chords';

type SupportedRecommendationChordType =
    | 'major'
    | 'minor'
    | 'major-6'
    | 'major-7'
    | 'minor-7'
    | 'dominant-7'
    | 'half-diminished-7'
    | 'diminished-7';

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

function toTriadRecommendation(degree: string, rootPitchClass: number): ScaleChordRecommendation | null {
    let chordType: SupportedRecommendationChordType | null = null;

    if (degree.endsWith('°')) {
        return null;
    }

    if (degree === degree.toLowerCase()) {
        chordType = 'minor';
    } else {
        chordType = 'major';
    }

    return {
        id: `${degree}:${chordType}:${rootPitchClass}`,
        chordType,
        rootPitchClass,
        symbol: buildRecommendationSymbol(rootPitchClass, chordType, degree),
        degree,
        roleTag: inferRoleTag(degree, chordType),
    };
}

function toHeptatonicRecommendation(
    degree: string,
    rootPitchClass: number,
    chordSignature: [number, number, number]
): ScaleChordRecommendation | null {
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

    return {
        id: `${degree}:${chordType}:${rootPitchClass}`,
        chordType,
        rootPitchClass,
        symbol: buildRecommendationSymbol(rootPitchClass, chordType, degree),
        degree,
        roleTag: inferRoleTag(degree, chordType),
    };
}

function buildUsableRecommendations(
    selectedKey: number,
    scaleGroup: string,
    scaleName: string
): ScaleChordRecommendation[] {
    const scaleIntervals = SCALES[scaleGroup]?.[scaleName] ?? SCALES['Diatonic Modes']['Ionian'];
    const modeData = generateModeData(scaleGroup, scaleName);

    if (HEPTATONIC_GROUPS.has(scaleGroup) && scaleIntervals.length >= 7) {
        const recommendations = scaleIntervals.flatMap((rootInterval, index) => {
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

        return recommendations;
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

function pickCharacteristicRecommendations(
    usable: ScaleChordRecommendation[],
    scaleGroup: string,
    scaleName: string,
    selectedKey: number
): ScaleChordRecommendation[] {
    const selected: ScaleChordRecommendation[] = [];
    const seen = new Set<string>();

    const pushMatch = (matcher: (recommendation: ScaleChordRecommendation) => boolean) => {
        const match = usable.find((recommendation) => !seen.has(recommendation.id) && matcher(recommendation));
        if (!match) {
            return;
        }

        seen.add(match.id);
        selected.push(match);
    };

    switch (scaleName) {
        case 'Ionian':
            pushMatch((recommendation) => recommendation.degree === 'I' && recommendation.chordType === 'major-7');
            pushMatch((recommendation) => recommendation.degree === 'V' && recommendation.chordType === 'dominant-7');
            break;
        case 'Dorian':
            pushMatch((recommendation) => recommendation.degree === 'i' && recommendation.chordType === 'minor-7');
            pushMatch((recommendation) => recommendation.degree === 'IV' && recommendation.chordType === 'dominant-7');
            break;
        case 'Phrygian':
            pushMatch((recommendation) => recommendation.degree === 'i' && recommendation.chordType === 'minor-7');
            pushMatch((recommendation) => recommendation.degree === 'bII' && recommendation.chordType === 'major-7');
            break;
        case 'Lydian':
            pushMatch((recommendation) => recommendation.degree === 'I' && recommendation.chordType === 'major-7');
            pushMatch((recommendation) => recommendation.degree === 'II' && recommendation.chordType === 'dominant-7');
            break;
        case 'Mixolydian':
            pushMatch((recommendation) => recommendation.degree === 'I' && recommendation.chordType === 'dominant-7');
            pushMatch((recommendation) => recommendation.degree === 'bVII' && recommendation.chordType === 'major-7');
            break;
        case 'Aeolian':
            pushMatch((recommendation) => recommendation.degree === 'i' && recommendation.chordType === 'minor-7');
            pushMatch((recommendation) => recommendation.degree === 'bVI' && recommendation.chordType === 'major-7');
            break;
        case 'Locrian':
            pushMatch((recommendation) => recommendation.chordType === 'half-diminished-7');
            pushMatch((recommendation) => recommendation.degree === 'bII' && recommendation.chordType === 'major-7');
            break;
        case 'Major Pentatonic':
            pushMatch((recommendation) => recommendation.degree === 'I' && recommendation.chordType === 'major');
            selected.push({
                id: `I:major-6:${selectedKey}`,
                chordType: 'major-6',
                rootPitchClass: selectedKey,
                symbol: buildRecommendationSymbol(selectedKey, 'major-6', 'I'),
                degree: 'I',
                roleTag: 'color',
            });
            break;
        case 'Minor Pentatonic':
            pushMatch((recommendation) => recommendation.degree === 'i' && recommendation.chordType === 'minor');
            pushMatch((recommendation) => recommendation.degree === 'bVII' && recommendation.chordType === 'major');
            break;
        default:
            if (scaleGroup === 'Jazz Minor Modes') {
                pushMatch((recommendation) => recommendation.rootPitchClass === selectedKey && recommendation.chordType === 'minor-7');
                pushMatch((recommendation) => recommendation.chordType === 'dominant-7');
            } else if (scaleGroup === 'Harmonic Minor Modes') {
                pushMatch((recommendation) => recommendation.rootPitchClass === selectedKey && recommendation.chordType === 'minor-7');
                pushMatch((recommendation) => recommendation.chordType === 'dominant-7');
            } else {
                pushMatch((recommendation) => recommendation.rootPitchClass === selectedKey);
                pushMatch((recommendation) => recommendation.chordType === 'dominant-7');
            }
            break;
    }

    if (selected.length < 2) {
        pushMatch((recommendation) => recommendation.rootPitchClass === selectedKey);
    }

    if (selected.length < 3) {
        pushMatch(() => true);
    }

    return selected.slice(0, 3);
}

export function buildScaleChordRecommendations(
    selectedKey: number,
    scaleGroup: string,
    scaleName: string
): ScaleChordRecommendationSet {
    const usable = buildUsableRecommendations(selectedKey, scaleGroup, scaleName).slice(0, 7);
    const characteristic = pickCharacteristicRecommendations(usable, scaleGroup, scaleName, selectedKey);

    return {
        usable,
        characteristic,
    };
}
