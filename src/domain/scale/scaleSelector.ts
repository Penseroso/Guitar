import { GENERIC_SCALE_INTERVAL_LABELS, SCALES, getScaleIntervalLabels, getScaleTonicTriadQuality } from './scales';

export const SCALE_FAMILY_ORDER = ['Diatonic Modes', 'Harmonic Minor', 'Jazz Minor', 'Symmetric', 'Pentatonic'] as const;

export type VisibleScaleFamily = typeof SCALE_FAMILY_ORDER[number];

export const SCALE_FAMILY_GROUP_MAP: Record<VisibleScaleFamily, string> = {
    'Diatonic Modes': 'Diatonic Modes',
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

const SCALE_NAME_LABELS: Record<string, string> = {
    'Altered scale': 'Altered',
    'Dorian b2 (Assyrian)': 'Dorian b2',
    'Locrian ♮2': 'Locrian n2',
    'Phrygian Dominant': 'Phrygian Dom',
    'Major Pentatonic': 'Major Pent',
    'Minor Pentatonic': 'Minor Pent',
};

export const SCALE_LOOKUP_BY_NAME = Object.entries(SCALES).reduce<Record<string, ScaleOption>>((acc, [group, modes]) => {
    Object.keys(modes).forEach((name) => {
        acc[name] = { group, name };
    });
    return acc;
}, {});

export function buildScaleId(group: string, name: string) {
    return `${group}::${name}`;
}

export function getVisibleScaleFamily(group: string): VisibleScaleFamily {
    return GROUP_TO_VISIBLE_FAMILY[group] || 'Diatonic Modes';
}

/**
 * Whether a scale's own tonic triad is minor-quality — used to decide whether minor-key UI
 * (e.g. the Picardy-third hint) applies. Deductive: stacks the scale's own 3rd/5th degrees via
 * getScaleTonicTriadQuality rather than guessing from the scale's name. The former name-keyword
 * version classified "Phrygian Dominant" as minor (it substring-matches "Phrygian") despite that
 * scale having a major 3rd — group is required now because the same mode name never recurs
 * across groups in this registry, but the triad quality is a property of (group, name) together.
 */
export function isMinorKeyScale(group: string, scaleName: string): boolean {
    return getScaleTonicTriadQuality(group, scaleName) === 'Minor';
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


export function getDefaultScaleForFamily(family: VisibleScaleFamily): ScaleOption {
    const group = SCALE_FAMILY_GROUP_MAP[family];
    const [name] = Object.keys(SCALES[group] || {});
    return { group, name };
}
