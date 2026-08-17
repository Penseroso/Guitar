// Scale domain: scale/mode theory engine, scale-family display/relation helpers, guitar
// double-stop placement, and the derived-data pipeline scale-mode UI consumes.
export type { ModeData, ScaleDictionary, ScaleIntervalLabels, ModalSibling, TriadQuality } from './scales';
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
    getModalSiblings,
    getScaleTonicTriadQuality,
} from './scales';

export type { VisibleScaleFamily, ScaleOption } from './scaleSelector';
export {
    SCALE_FAMILY_ORDER,
    SCALE_FAMILY_GROUP_MAP,
    SCALE_LOOKUP_BY_NAME,
    buildScaleId,
    getVisibleScaleFamily,
    isMinorKeyScale,
    getVisibleScaleFamilyLabel,
    getScaleFamilyOptions,
    getScaleFamilyModes,
    getScaleDisplayName,
    getScaleOrbitLabel,
    getScaleFormula,
    getDefaultScaleForFamily,
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
