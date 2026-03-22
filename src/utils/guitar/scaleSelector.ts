import { GENERIC_SCALE_INTERVAL_LABELS, SCALE_REGISTRY, SCALES, getScaleIntervalLabels } from './scales';

export const SCALE_FAMILY_ORDER = ['Diatonic', 'Harmonic Minor', 'Jazz Minor', 'Symmetric', 'Pentatonic'] as const;

export type VisibleScaleFamily = typeof SCALE_FAMILY_ORDER[number];

export const SCALE_FAMILY_GROUP_MAP: Record<VisibleScaleFamily, string> = {
    Diatonic: 'Major Modes',
    'Harmonic Minor': 'Harmonic Minor Modes',
    'Jazz Minor': 'Jazz Minor Modes',
    Symmetric: 'Symmetric',
    Pentatonic: 'Pentatonic',
};

const GROUP_TO_VISIBLE_FAMILY: Record<string, VisibleScaleFamily> = Object.entries(SCALE_FAMILY_GROUP_MAP).reduce(
    (acc, [family, group]) => {
        acc[group] = family as VisibleScaleFamily;
        return acc;
    },
    {} as Record<string, VisibleScaleFamily>
);

export interface ScaleOption {
    group: string;
    name: string;
}

export interface ScaleRelation extends ScaleOption {
    scaleId: string;
}

const SCALE_NAME_LABELS: Record<string, string> = {
    'Major / Ionian': 'Ionian',
    'Natural Minor / Aeolian': 'Aeolian',
    'Altered scale': 'Altered',
    'Dorian b2 (Assyrian)': 'Dorian b2',
    'Locrian ♮2': 'Locrian n2',
    'Phrygian Dominant': 'Phrygian Dom',
    'Major Pentatonic': 'Major Pent',
    'Minor Pentatonic': 'Minor Pent',
};

const SCALE_LOOKUP_BY_NAME = Object.entries(SCALES).reduce<Record<string, ScaleOption>>((acc, [group, modes]) => {
    Object.keys(modes).forEach((name) => {
        acc[name] = { group, name };
    });
    return acc;
}, {});

const relationNames = {
    'Major / Ionian': ['Lydian', 'Mixolydian', 'Major Pentatonic', 'Lydian Augmented'],
    Dorian: ['Natural Minor / Aeolian', 'Jazz Minor', 'Dorian b2 (Assyrian)', 'Minor Pentatonic'],
    Phrygian: ['Dorian b2 (Assyrian)', 'Phrygian Dominant', 'Natural Minor / Aeolian', 'Locrian'],
    Lydian: ['Major / Ionian', 'Lydian Dominant', 'Lydian #2', 'Lydian Augmented'],
    Mixolydian: ['Lydian Dominant', 'Mixolydian b6', 'Major / Ionian', 'Whole Tone'],
    'Natural Minor / Aeolian': ['Dorian', 'Harmonic Minor', 'Jazz Minor', 'Minor Pentatonic'],
    Locrian: ['Locrian ♮2', 'Ultralocrian', 'Altered scale', 'Phrygian'],
    'Harmonic Minor': ['Natural Minor / Aeolian', 'Jazz Minor', 'Dorian', 'Minor Pentatonic'],
    'Locrian #6': ['Locrian', 'Locrian ♮2', 'Ultralocrian', 'Dorian b2 (Assyrian)'],
    'Ionian #5': ['Lydian Augmented', 'Major / Ionian', 'Whole Tone', 'Lydian #2'],
    'Dorian #4': ['Dorian', 'Jazz Minor', 'Harmonic Minor', 'Lydian Dominant'],
    'Phrygian Dominant': ['Mixolydian b6', 'Phrygian', 'Altered scale', 'Whole Tone'],
    'Lydian #2': ['Lydian', 'Lydian Augmented', 'Ionian #5', 'Whole Tone'],
    Ultralocrian: ['Altered scale', 'Locrian', 'Locrian ♮2', 'Diminished'],
    'Jazz Minor': ['Dorian', 'Harmonic Minor', 'Natural Minor / Aeolian', 'Minor Pentatonic'],
    'Dorian b2 (Assyrian)': ['Phrygian', 'Dorian', 'Locrian ♮2', 'Minor Pentatonic'],
    'Lydian Augmented': ['Ionian #5', 'Lydian', 'Whole Tone', 'Lydian #2'],
    'Lydian Dominant': ['Mixolydian', 'Whole Tone', 'Altered scale', 'Lydian'],
    'Mixolydian b6': ['Phrygian Dominant', 'Mixolydian', 'Natural Minor / Aeolian', 'Altered scale'],
    'Locrian ♮2': ['Locrian', 'Dorian b2 (Assyrian)', 'Ultralocrian', 'Altered scale'],
    'Altered scale': ['Lydian Dominant', 'Whole Tone', 'Ultralocrian', 'Diminished'],
    Diminished: ['Altered scale', 'Whole Tone', 'Lydian Dominant', 'Ultralocrian'],
    'Whole Tone': ['Lydian Dominant', 'Altered scale', 'Ionian #5', 'Lydian Augmented'],
    'Major Pentatonic': ['Major / Ionian', 'Lydian', 'Mixolydian'],
    'Minor Pentatonic': ['Natural Minor / Aeolian', 'Dorian', 'Harmonic Minor', 'Jazz Minor'],
} satisfies Record<string, string[]>;

export function buildScaleId(group: string, name: string) {
    return `${group}::${name}`;
}

export function parseScaleId(scaleId: string): ScaleRelation {
    const [group, name] = scaleId.split('::');
    return { group, name, scaleId };
}

export const SCALE_RELATION_MAP: Record<string, string[]> = Object.entries(relationNames).reduce((acc, [name, related]) => {
    const source = SCALE_LOOKUP_BY_NAME[name];
    if (!source) return acc;
    acc[buildScaleId(source.group, source.name)] = related
        .map((relatedName) => SCALE_LOOKUP_BY_NAME[relatedName])
        .filter((item): item is ScaleOption => Boolean(item))
        .map((item) => buildScaleId(item.group, item.name));
    return acc;
}, {} as Record<string, string[]>);

export function getVisibleScaleFamily(group: string): VisibleScaleFamily {
    return GROUP_TO_VISIBLE_FAMILY[group] || 'Diatonic';
}

export function getVisibleScaleFamilyLabel(group: string) {
    return getVisibleScaleFamily(group);
}

export function getScaleFamilyOptions() {
    return SCALE_FAMILY_ORDER.map((family) => ({
        family,
        group: SCALE_FAMILY_GROUP_MAP[family],
        modes: Object.keys(SCALES[SCALE_FAMILY_GROUP_MAP[family]] || {}),
    }));
}

export function getScaleFamilyModes(group: string) {
    return Object.keys(SCALES[group] || {}).map((name) => ({ group, name }));
}

export function getScaleDisplayName(name: string) {
    return SCALE_NAME_LABELS[name] || name;
}

export const getScaleOrbitLabel = getScaleDisplayName;

export function getScaleFormula(group: string, name: string) {
    const intervals = SCALES[group]?.[name] || [];
    const labels = getScaleIntervalLabels(group, name);
    return intervals.map((interval) => labels[interval] || GENERIC_SCALE_INTERVAL_LABELS[interval] || `${interval}`);
}

export function getScaleMetadata(group: string, name: string) {
    const registryEntry = SCALE_REGISTRY[group]?.[name];
    const family = getVisibleScaleFamily(group);
    const formula = getScaleFormula(group, name);

    return {
        family,
        familyLabel: getVisibleScaleFamilyLabel(group),
        formula,
        parent: registryEntry?.parent ?? '',
        subset: registryEntry?.subset ?? [],
        degreeCount: SCALES[group]?.[name]?.length ?? 0,
    };
}

export function getDefaultScaleForFamily(family: VisibleScaleFamily): ScaleOption {
    const group = SCALE_FAMILY_GROUP_MAP[family];
    const [name] = Object.keys(SCALES[group] || {});
    return { group, name };
}

export function getRelatedScales(scaleId: string, limit = 5): ScaleRelation[] {
    return (SCALE_RELATION_MAP[scaleId] || [])
        .slice(0, limit)
        .map(parseScaleId);
}
