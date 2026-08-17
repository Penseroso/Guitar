// Scale domain: scale/mode theory engine, scale-family display/relation helpers, guitar
// double-stop placement, and the derived-data pipeline scale-mode UI consumes.
export type { ModeData, ScaleDictionary, ScaleIntervalLabels } from './scales';
export {
    SCALE_REGISTRY,
    GENERIC_SCALE_INTERVAL_LABELS,
    SCALE_DISPLAY_FORMULAS,
    SCALE_ENGINE_FORMULAS,
    SCALES,
    getScaleIntervalLabels,
    getScaleEngineIntervalLabels,
    isDoubleStopSupported,
    generateModeData,
} from './scales';

export type { VisibleScaleFamily, ScaleOption, ScaleRelation } from './scaleSelector';
export {
    SCALE_FAMILY_ORDER,
    SCALE_FAMILY_GROUP_MAP,
    SCALE_LOOKUP_BY_NAME,
    SCALE_RELATION_MAP,
    buildScaleId,
    parseScaleId,
    getVisibleScaleFamily,
    isMinorKeyScale,
    getVisibleScaleFamilyLabel,
    getScaleFamilyOptions,
    getScaleFamilyModes,
    getScaleDisplayName,
    getScaleOrbitLabel,
    getScaleFormula,
    getDefaultScaleForFamily,
    getRelatedScales,
} from './scaleSelector';

export {
    DOUBLE_STOP_HARMONIC_INTERVALS,
    getHarmonicDoubleStops,
    getPlayableDoubleStopsOnStrings,
    getDoubleStopStringPairOptions,
} from './doubleStops';

export type { HarmonicInterval, DoubleStopPair, PlayableDoubleStop } from './types';

export type { ScaleDerivedDataToggles, ScaleDiatonicChord, ScaleDerivedData } from './getScaleDerivedData';
export { getScaleDerivedData } from './getScaleDerivedData';
