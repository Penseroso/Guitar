// c:\Projects\Guitar\src\utils\guitar\scales.ts

export interface ModeData {
    role: string;
    color: string;
}

export type ScaleDictionary = Record<number, ModeData>;

const PARENT_SCALES: Record<string, number[]> = {
    'Major': [0, 2, 4, 5, 7, 9, 11],
    'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
    'Jazz Minor': [0, 2, 3, 5, 7, 9, 11], // Melodic Minor
    'Diminished': [0, 2, 3, 5, 6, 8, 9, 11], // WH Diminished (8음계)
    'Whole Tone': [0, 2, 4, 6, 8, 10]        // Whole Tone (6음계)
};

export const SCALE_REGISTRY: Record<string, Record<string, { parent: string, rootOffsetIndex: number, subset?: number[] }>> = {
    'Major Modes': {
        'Major / Ionian': { parent: 'Major', rootOffsetIndex: 0 },
        'Dorian': { parent: 'Major', rootOffsetIndex: 1 },
        'Phrygian': { parent: 'Major', rootOffsetIndex: 2 },
        'Lydian': { parent: 'Major', rootOffsetIndex: 3 },
        'Mixolydian': { parent: 'Major', rootOffsetIndex: 4 },
        'N Minor / Aeolian': { parent: 'Major', rootOffsetIndex: 5 },
        'Locrian': { parent: 'Major', rootOffsetIndex: 6 }
    },
    'Harmonic Minor Modes': {
        'Harmonic Minor': { parent: 'Harmonic Minor', rootOffsetIndex: 0 },
        'Locrian #6': { parent: 'Harmonic Minor', rootOffsetIndex: 1 },
        'Ionian #5': { parent: 'Harmonic Minor', rootOffsetIndex: 2 },
        'Dorian #4': { parent: 'Harmonic Minor', rootOffsetIndex: 3 },
        'Phrygian Dominant': { parent: 'Harmonic Minor', rootOffsetIndex: 4 },
        'Lydian #2': { parent: 'Harmonic Minor', rootOffsetIndex: 5 },
        'Superlocrian': { parent: 'Harmonic Minor', rootOffsetIndex: 6 } // Altered bb7
    },
    'Jazz Minor Modes': {
        'Jazz Minor': { parent: 'Jazz Minor', rootOffsetIndex: 0 },
        'Assyrian': { parent: 'Jazz Minor', rootOffsetIndex: 1 }, // Dorian b2
        'Lydian Augmented': { parent: 'Jazz Minor', rootOffsetIndex: 2 },
        'Lydian Dominant': { parent: 'Jazz Minor', rootOffsetIndex: 3 },
        'Mixolydian b6': { parent: 'Jazz Minor', rootOffsetIndex: 4 },
        'Locrian ♮2': { parent: 'Jazz Minor', rootOffsetIndex: 5 },
        'Altered scale': { parent: 'Jazz Minor', rootOffsetIndex: 6 } // Superlocrian
    },
    'Symmetric & Others': {
        'Diminished': { parent: 'Diminished', rootOffsetIndex: 0 },
        'Whole Tone': { parent: 'Whole Tone', rootOffsetIndex: 0 },
        'Major Pentatonic': { parent: 'Major', rootOffsetIndex: 0, subset: [0, 2, 4, 7, 9] },
        'Minor Pentatonic': { parent: 'Major', rootOffsetIndex: 5, subset: [0, 3, 5, 7, 10] }
    }
};

const INTERVAL_TO_ROMAN: Record<number, string> = {
    0: 'I',
    1: 'bII',
    2: 'II',
    3: 'bIII',
    4: 'III',
    5: 'IV',
    6: 'bV',
    7: 'V',
    8: 'bVI',
    9: 'VI',
    10: 'bVII',
    11: 'VII'
};

/**
 * 동적 다이아토닉 모드 제너레이터 (Dynamic Scale Generator)
 * 
 * 부모 7음계(Parent Scale)를 순환 이동(Rotation)시켜 모드를 도출하고,
 * 각 음에 쌓아 올린 3화음(Triad)을 계산하여 로마 숫자와 테마 색상을 동적 할당합니다.
 * 펜타토닉 등 결손 음계는 `subset` 필드를 이용해 필터링합니다.
 */
export function generateModeData(groupName: string, modeName: string): ScaleDictionary {
    const registryGroup = SCALE_REGISTRY[groupName] || SCALE_REGISTRY['Major Modes'];
    const modeInfo = registryGroup[modeName] || SCALE_REGISTRY['Major Modes']['N Minor / Aeolian'];

    const parentIntervals = PARENT_SCALES[modeInfo.parent];
    const N = parentIntervals.length; // 7-note parent scale

    // 1단계: 부모 스케일 순환시켜 모드 절대 인터벌 배열 도출
    const rootOffset = parentIntervals[modeInfo.rootOffsetIndex];
    const rotatedIntervals: number[] = [];

    for (let i = 0; i < N; i++) {
        let interval = parentIntervals[(modeInfo.rootOffsetIndex + i) % N] - rootOffset;
        if (interval < 0) interval += 12;
        rotatedIntervals.push(interval);
    }

    const modeData: ScaleDictionary = {};

    // 2단계: 모드의 각 도수(Degree)별 3화음 성질(Quality) 계산
    for (let d = 0; d < N; d++) {
        const rootInterval = rotatedIntervals[d];

        // 부분집합(Subset) 필터: 펜타토닉 등 7음계 미만의 경우 불필요한 노드 제외
        if (modeInfo.subset && !modeInfo.subset.includes(rootInterval)) {
            continue;
        }

        // 3도씩 쌓아 3화음 구성
        const thirdNodeIndex = (d + 2) % N;
        const fifthNodeIndex = (d + 4) % N;

        const thirdInterval = rotatedIntervals[thirdNodeIndex] + (thirdNodeIndex < d ? 12 : 0);
        const fifthInterval = rotatedIntervals[fifthNodeIndex] + (fifthNodeIndex < d ? 12 : 0);

        const int3 = thirdInterval - rootInterval;
        const int5 = fifthInterval - rootInterval;

        // 화음 성질 판정
        let quality = 'Major'; // int3 === 4 && int5 === 7
        if (int3 === 3 && int5 === 7) quality = 'Minor';
        else if (int3 === 3 && int5 === 6) quality = 'Diminished';
        else if (int3 === 4 && int5 === 8) quality = 'Augmented';

        // 로마 숫자 파싱
        let roman = INTERVAL_TO_ROMAN[rootInterval] || '?';
        if (quality === 'Minor') roman = roman.toLowerCase();
        else if (quality === 'Diminished') roman = roman.toLowerCase() + '°';
        else if (quality === 'Augmented') roman = roman + '+';

        // 테마 색상 동적 매핑
        let color = '#7dd3fc'; // Light Blue (Minor) by default
        if (rootInterval === 0) {
            color = '#fde047'; // Tonic (Yellow)
        } else if (quality === 'Major') {
            color = '#86efac'; // Major (Light Green)
        } else if (quality === 'Diminished' || quality === 'Augmented') {
            color = '#fca5a5'; // Tension/Altered (Light Red)
        }

        modeData[rootInterval] = { role: roman, color };
    }

    return modeData;
}
