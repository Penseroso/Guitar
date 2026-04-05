export type SupportedRecommendationChordType =
    | 'major'
    | 'minor'
    | 'major-6'
    | 'major-7'
    | 'minor-7'
    | 'dominant-7'
    | 'half-diminished-7'
    | 'diminished-7';

type FallbackSelectionStrategy =
    | 'tonic-then-dominant'
    | 'minor-tonic-then-dominant'
    | 'tonic-then-any';

interface CharacteristicAdditionDefinition {
    degree: string;
    chordType: SupportedRecommendationChordType;
    roleTag?: string;
}

export interface ScaleChordRecommendationProfile {
    scaleGroup?: string;
    scaleName?: string;
    characteristicPreferredDegrees?: string[];
    tonicPreferredChordTypes?: SupportedRecommendationChordType[];
    preferredChordFormsByDegree?: Partial<Record<string, SupportedRecommendationChordType[]>>;
    fallbackSelectionStrategy: FallbackSelectionStrategy;
    maxCharacteristicCount: number;
    characteristicAdditions?: CharacteristicAdditionDefinition[];
}

const DEFAULT_PROFILE: ScaleChordRecommendationProfile = {
    fallbackSelectionStrategy: 'tonic-then-dominant',
    maxCharacteristicCount: 3,
};

const SCALE_PROFILES: ScaleChordRecommendationProfile[] = [
    {
        scaleGroup: 'Diatonic Modes',
        scaleName: 'Ionian',
        characteristicPreferredDegrees: ['I', 'V'],
        tonicPreferredChordTypes: ['major-7'],
        preferredChordFormsByDegree: {
            I: ['major-7'],
            V: ['dominant-7'],
        },
        fallbackSelectionStrategy: 'tonic-then-dominant',
        maxCharacteristicCount: 3,
    },
    {
        scaleGroup: 'Diatonic Modes',
        scaleName: 'Dorian',
        characteristicPreferredDegrees: ['i', 'IV'],
        tonicPreferredChordTypes: ['minor-7'],
        preferredChordFormsByDegree: {
            i: ['minor-7'],
            IV: ['dominant-7'],
        },
        fallbackSelectionStrategy: 'minor-tonic-then-dominant',
        maxCharacteristicCount: 3,
    },
    {
        scaleGroup: 'Diatonic Modes',
        scaleName: 'Phrygian',
        characteristicPreferredDegrees: ['i', 'bII'],
        tonicPreferredChordTypes: ['minor-7'],
        preferredChordFormsByDegree: {
            i: ['minor-7'],
            bII: ['major-7'],
        },
        fallbackSelectionStrategy: 'minor-tonic-then-dominant',
        maxCharacteristicCount: 3,
    },
    {
        scaleGroup: 'Diatonic Modes',
        scaleName: 'Lydian',
        characteristicPreferredDegrees: ['I', 'II'],
        tonicPreferredChordTypes: ['major-7'],
        preferredChordFormsByDegree: {
            I: ['major-7'],
            II: ['dominant-7'],
        },
        fallbackSelectionStrategy: 'tonic-then-dominant',
        maxCharacteristicCount: 3,
    },
    {
        scaleGroup: 'Diatonic Modes',
        scaleName: 'Mixolydian',
        characteristicPreferredDegrees: ['I', 'bVII'],
        tonicPreferredChordTypes: ['dominant-7'],
        preferredChordFormsByDegree: {
            I: ['dominant-7'],
            bVII: ['major-7'],
        },
        fallbackSelectionStrategy: 'tonic-then-dominant',
        maxCharacteristicCount: 3,
    },
    {
        scaleGroup: 'Diatonic Modes',
        scaleName: 'Aeolian',
        characteristicPreferredDegrees: ['i', 'bVI'],
        tonicPreferredChordTypes: ['minor-7'],
        preferredChordFormsByDegree: {
            i: ['minor-7'],
            bVI: ['major-7'],
        },
        fallbackSelectionStrategy: 'minor-tonic-then-dominant',
        maxCharacteristicCount: 3,
    },
    {
        scaleGroup: 'Diatonic Modes',
        scaleName: 'Locrian',
        characteristicPreferredDegrees: ['i°', 'bII'],
        tonicPreferredChordTypes: ['half-diminished-7'],
        preferredChordFormsByDegree: {
            'i°': ['half-diminished-7'],
            bII: ['major-7'],
        },
        fallbackSelectionStrategy: 'minor-tonic-then-dominant',
        maxCharacteristicCount: 3,
    },
    {
        scaleGroup: 'Pentatonic',
        scaleName: 'Major Pentatonic',
        characteristicPreferredDegrees: ['I'],
        tonicPreferredChordTypes: ['major', 'major-6'],
        preferredChordFormsByDegree: {
            I: ['major'],
        },
        fallbackSelectionStrategy: 'tonic-then-any',
        maxCharacteristicCount: 3,
        characteristicAdditions: [
            {
                degree: 'I',
                chordType: 'major-6',
                roleTag: 'color',
            },
        ],
    },
    {
        scaleGroup: 'Pentatonic',
        scaleName: 'Minor Pentatonic',
        characteristicPreferredDegrees: ['i', 'bVII'],
        tonicPreferredChordTypes: ['minor'],
        preferredChordFormsByDegree: {
            i: ['minor'],
            bVII: ['major'],
        },
        fallbackSelectionStrategy: 'tonic-then-any',
        maxCharacteristicCount: 3,
    },
    {
        scaleGroup: 'Harmonic Minor Modes',
        tonicPreferredChordTypes: ['minor-7'],
        fallbackSelectionStrategy: 'minor-tonic-then-dominant',
        maxCharacteristicCount: 3,
    },
    {
        scaleGroup: 'Jazz Minor Modes',
        tonicPreferredChordTypes: ['minor-7'],
        fallbackSelectionStrategy: 'minor-tonic-then-dominant',
        maxCharacteristicCount: 3,
    },
];

export function getScaleChordRecommendationProfile(
    scaleGroup: string,
    scaleName: string
): ScaleChordRecommendationProfile {
    return (
        SCALE_PROFILES.find((profile) => {
            if (profile.scaleGroup && profile.scaleGroup !== scaleGroup) {
                return false;
            }

            if (profile.scaleName && profile.scaleName !== scaleName) {
                return false;
            }

            return true;
        }) ?? DEFAULT_PROFILE
    );
}
