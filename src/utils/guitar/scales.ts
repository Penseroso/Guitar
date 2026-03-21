// c:\Projects\Guitar\src\utils\guitar\scales.ts

export interface ModeData {
    role: string;
    color: string;
}

export type ScaleDictionary = Record<number, ModeData>;
export type ScaleIntervalLabels = Partial<Record<number, string>>;

interface ScaleRegistryEntry {
    parent: string;
    rootOffsetIndex: number;
    subset?: number[];
}

type ScaleRegistryGroup = Record<string, ScaleRegistryEntry>;
type ScaleFormulaGroup = Record<string, ScaleIntervalLabels>;

const PARENT_SCALES: Record<string, number[]> = {
    'Major': [0, 2, 4, 5, 7, 9, 11],
    'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
    'Jazz Minor': [0, 2, 3, 5, 7, 9, 11], // Melodic Minor
    'Diminished': [0, 2, 3, 5, 6, 8, 9, 11], // WH Diminished (8음계)
    'Whole Tone': [0, 2, 4, 6, 8, 10]        // Whole Tone (6음계)
};

export const SCALE_REGISTRY: Record<string, ScaleRegistryGroup> = {
    'Major Modes': {
        'Major / Ionian': { parent: 'Major', rootOffsetIndex: 0 },
        'Dorian': { parent: 'Major', rootOffsetIndex: 1 },
        'Phrygian': { parent: 'Major', rootOffsetIndex: 2 },
        'Lydian': { parent: 'Major', rootOffsetIndex: 3 },
        'Mixolydian': { parent: 'Major', rootOffsetIndex: 4 },
        'Natural Minor / Aeolian': { parent: 'Major', rootOffsetIndex: 5 },
        'Locrian': { parent: 'Major', rootOffsetIndex: 6 }
    },
    'Harmonic Minor Modes': {
        'Harmonic Minor': { parent: 'Harmonic Minor', rootOffsetIndex: 0 },
        'Locrian #6': { parent: 'Harmonic Minor', rootOffsetIndex: 1 },
        'Ionian #5': { parent: 'Harmonic Minor', rootOffsetIndex: 2 },
        'Dorian #4': { parent: 'Harmonic Minor', rootOffsetIndex: 3 },
        'Phrygian Dominant': { parent: 'Harmonic Minor', rootOffsetIndex: 4 },
        'Lydian #2': { parent: 'Harmonic Minor', rootOffsetIndex: 5 },
        'Ultralocrian': { parent: 'Harmonic Minor', rootOffsetIndex: 6 }
    },
    'Jazz Minor Modes': {
        'Jazz Minor': { parent: 'Jazz Minor', rootOffsetIndex: 0 },
        'Dorian b2 (Assyrian)': { parent: 'Jazz Minor', rootOffsetIndex: 1 },
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

const toIntervalLabelMap = (formula: readonly string[]): ScaleIntervalLabels =>
    formula.reduce<ScaleIntervalLabels>((labels, interval, index) => {
        labels[index === 0 ? 0 : parseIntervalLabel(interval)] = interval;
        return labels;
    }, {});

function parseIntervalLabel(interval: string): number {
    const normalized = interval.replace(/\s+/g, '');
    const quality = normalized.match(/^[b#]+/)?.[0] ?? '';
    const degreeText = normalized.slice(quality.length);
    const degree = Number(degreeText);

    const baseSemitones: Record<number, number> = {
        1: 0,
        2: 2,
        3: 4,
        4: 5,
        5: 7,
        6: 9,
        7: 11
    };

    const base = baseSemitones[degree];
    if (base === undefined) {
        throw new Error(`Unsupported interval label: ${interval}`);
    }

    const accidentalOffset = [...quality].reduce((sum, accidental) => {
        if (accidental === 'b') return sum - 1;
        if (accidental === '#') return sum + 1;
        return sum;
    }, 0);

    return (base + accidentalOffset + 12) % 12;
}

export const GENERIC_SCALE_INTERVAL_LABELS: Readonly<Record<number, string>> = {
    0: '1',
    1: 'b2',
    2: '2',
    3: 'b3',
    4: '3',
    5: '4',
    6: 'b5',
    7: '5',
    8: 'b6',
    9: '6',
    10: 'b7',
    11: '7'
};

export const SCALE_DISPLAY_FORMULAS: Record<string, ScaleFormulaGroup> = {
    'Major Modes': {
        'Major / Ionian': toIntervalLabelMap(['1', '2', '3', '4', '5', '6', '7']),
        'Dorian': toIntervalLabelMap(['1', '2', 'b3', '4', '5', '6', 'b7']),
        'Phrygian': toIntervalLabelMap(['1', 'b2', 'b3', '4', '5', 'b6', 'b7']),
        'Lydian': toIntervalLabelMap(['1', '2', '3', '#4', '5', '6', '7']),
        'Mixolydian': toIntervalLabelMap(['1', '2', '3', '4', '5', '6', 'b7']),
        'Natural Minor / Aeolian': toIntervalLabelMap(['1', '2', 'b3', '4', '5', 'b6', 'b7']),
        'Locrian': toIntervalLabelMap(['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'])
    },
    'Harmonic Minor Modes': {
        'Harmonic Minor': toIntervalLabelMap(['1', '2', 'b3', '4', '5', 'b6', '7']),
        'Locrian #6': toIntervalLabelMap(['1', 'b2', 'b3', '4', 'b5', '6', 'b7']),
        'Ionian #5': toIntervalLabelMap(['1', '2', '3', '4', '#5', '6', '7']),
        'Dorian #4': toIntervalLabelMap(['1', '2', 'b3', '#4', '5', '6', 'b7']),
        'Phrygian Dominant': toIntervalLabelMap(['1', 'b2', '3', '4', '5', 'b6', 'b7']),
        'Lydian #2': toIntervalLabelMap(['1', '#2', '3', '#4', '5', '6', '7']),
        'Ultralocrian': toIntervalLabelMap(['1', 'b2', 'b3', 'b4', 'b5', 'b6', 'bb7'])
    },
    'Jazz Minor Modes': {
        'Jazz Minor': toIntervalLabelMap(['1', '2', 'b3', '4', '5', '6', '7']),
        'Dorian b2 (Assyrian)': toIntervalLabelMap(['1', 'b2', 'b3', '4', '5', '6', 'b7']),
        'Lydian Augmented': toIntervalLabelMap(['1', '2', '3', '#4', '#5', '6', '7']),
        'Lydian Dominant': toIntervalLabelMap(['1', '2', '3', '#4', '5', '6', 'b7']),
        'Mixolydian b6': toIntervalLabelMap(['1', '2', '3', '4', '5', 'b6', 'b7']),
        'Locrian ♮2': toIntervalLabelMap(['1', '2', 'b3', '4', 'b5', 'b6', 'b7']),
        'Altered scale': toIntervalLabelMap(['1', 'b2', '#2', '3', 'b5', '#5', 'b7'])
    },
    'Symmetric & Others': {
        'Diminished': toIntervalLabelMap(['1', '2', 'b3', '4', 'b5', 'b6', '6', '7']),
        'Whole Tone': toIntervalLabelMap(['1', '2', '3', '#4', '#5', 'b7']),
        'Major Pentatonic': toIntervalLabelMap(['1', '2', '3', '5', '6']),
        'Minor Pentatonic': toIntervalLabelMap(['1', 'b3', '4', '5', 'b7'])
    }
};

export function getScaleIntervalLabels(groupName: string, modeName: string): ScaleIntervalLabels {
    return SCALE_DISPLAY_FORMULAS[groupName]?.[modeName]
        || {};
}

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
 * Calculates absolute intervals for any given mode based on its parent scale.
 * Handles generic modulo operation based on the parent's length (N)
 * and filters out notes via intersection if a subset is provided.
 */
function calculateScaleIntervals(parentIntervals: number[], rootOffsetIndex: number, subset?: number[]): number[] {
    const N = parentIntervals.length;
    const rootOffset = parentIntervals[rootOffsetIndex];
    const rotatedIntervals: number[] = [];

    for (let i = 0; i < N; i++) {
        let interval = parentIntervals[(rootOffsetIndex + i) % N] - rootOffset;
        if (interval < 0) interval += 12;
        
        // If a subset is defined (e.g., Pentatonic [0,3,5,7,10]), only include the interval if it exists in the subset definition.
        if (!subset || subset.includes(interval)) {
            rotatedIntervals.push(interval);
        }
    }
    return rotatedIntervals;
}

/**
 * Singleton cache of pre-calculated scale intervals.
 * Resolves Single Source of Truth issue by dynamically generating all scales on load.
 */
export const SCALES: Record<string, Record<string, number[]>> = {};

// Initialize the cache dynamically at module load time
for (const group in SCALE_REGISTRY) {
    SCALES[group] = {};
    for (const mode in SCALE_REGISTRY[group]) {
        const info = SCALE_REGISTRY[group][mode];
        const parent = PARENT_SCALES[info.parent];
        SCALES[group][mode] = calculateScaleIntervals(parent, info.rootOffsetIndex, info.subset);
    }
}


/**
 * 동적 다이아토닉 모드 제너레이터 (Dynamic Scale Generator)
 * 
 * 부모 7음계(Parent Scale)를 순환 이동(Rotation)시켜 모드를 도출하고,
 * 각 음에 쌓아 올린 3화음(Triad)을 계산하여 로마 숫자와 테마 색상을 동적 할당합니다.
 * 펜타토닉 등 결손 음계는 `subset` 필드를 이용해 필터링합니다.
 */
export function generateModeData(groupName: string, modeName: string): ScaleDictionary {
    const registryGroup = SCALE_REGISTRY[groupName] || SCALE_REGISTRY['Major Modes'];
    const modeInfo = registryGroup[modeName] || SCALE_REGISTRY['Major Modes']['Natural Minor / Aeolian'];

    const parentIntervals = PARENT_SCALES[modeInfo.parent];
    const N = parentIntervals.length; // Dynamic N-note parent scale

    // 1단계: 부모 스케일 순환시켜 모드 절대 인터벌 배열 도출 (subset 필터 적용)
    const rotatedIntervals = calculateScaleIntervals(parentIntervals, modeInfo.rootOffsetIndex, modeInfo.subset);
    // 화음(Triad) 계산 로직을 돌리기 위해서는 subset이 빠진 풀(Full) 모드 배열이 필요할 수 있습니다.
    // 하지만 현재 구조상 subset이 빠진 배열에서도 3도씩 쌓아 화음을 구성하려고 시도합니다.
    const fullRotatedIntervals = calculateScaleIntervals(parentIntervals, modeInfo.rootOffsetIndex);

    const modeData: ScaleDictionary = {};

    // 2단계: 모드의 각 도수(Degree)별 3화음 성질(Quality) 계산
    for (let d = 0; d < N; d++) {
        const rootInterval = fullRotatedIntervals[d];

        // 부분집합(Subset) 필터: 펜타토닉 등 N음계 미만의 경우 불필요한 노드 제외
        if (modeInfo.subset && !modeInfo.subset.includes(rootInterval)) {
            continue;
        }

        // 3도씩 쌓아 3화음 구성
        const thirdNodeIndex = (d + 2) % N;
        const fifthNodeIndex = (d + 4) % N;

        const thirdInterval = fullRotatedIntervals[thirdNodeIndex] + (thirdNodeIndex < d ? 12 : 0);
        const fifthInterval = fullRotatedIntervals[fifthNodeIndex] + (fifthNodeIndex < d ? 12 : 0);

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
