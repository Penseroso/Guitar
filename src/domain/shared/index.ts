// Cross-domain primitives: note/key theory and guitar hardware facts used by chord, scale, and
// progression domains alike, plus the few types (Mode, FretboardProps, Fingering) that genuinely
// span all three rather than belonging to one.
export { NOTES, NOTES_FLAT, getNoteName, getNoteIndex } from './notes';
export {
    getCircleOfFifthsOrder,
    getRelativeMinor,
    getDiatonicCluster,
    getKeyName,
    getMinorKeyName,
    ENHARMONIC_TIE_PITCH_CLASSES,
} from './keys';
export {
    STANDARD_GUITAR_TUNING_PITCH_CLASSES,
    STANDARD_GUITAR_STRING_MIDI_PITCHES,
    TUNING,
    STRING_MIDI_PITCHES,
    INLAYS,
    DOUBLE_INLAYS,
} from './tuning';
export type { Mode, FretboardProps, Fingering } from './types';
