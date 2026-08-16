// String order is String 1 -> String 6 (high E -> low E) across the app.
// Do not flip this ordering without updating existing fingering and voicing logic.
export const STANDARD_GUITAR_TUNING_PITCH_CLASSES = [4, 11, 7, 2, 9, 4];

// Absolute MIDI pitches for standard tuning in the same high-to-low string order.
export const STANDARD_GUITAR_STRING_MIDI_PITCHES = [64, 59, 55, 50, 45, 40];

// Backward-compatible aliases used by legacy theory/logic code.
export const TUNING = STANDARD_GUITAR_TUNING_PITCH_CLASSES;
export const STRING_MIDI_PITCHES = STANDARD_GUITAR_STRING_MIDI_PITCHES;

// Fretboard hardware facts (inlay dot marker positions), same category as tuning/string pitches.
export const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_INLAYS = [12];
