import { describe, expect, it } from 'vitest';

import { isMinorKeyScale } from './scaleSelector';

describe('isMinorKeyScale', () => {
    it('classifies diatonic modes whose tonic triad genuinely stacks to a minor third + perfect fifth', () => {
        expect(isMinorKeyScale('Diatonic Modes', 'Aeolian')).toBe(true);
        expect(isMinorKeyScale('Diatonic Modes', 'Dorian')).toBe(true);
        expect(isMinorKeyScale('Diatonic Modes', 'Phrygian')).toBe(true);
    });

    it('classifies Locrian as not-minor, since its tonic triad is diminished (b3+b5), not minor (b3+P5)', () => {
        // The old name-keyword version lumped Locrian in with the other "minor-ish" modes because
        // its name contains no major-family keyword, but Locrian's own i chord is a diminished
        // triad, not a minor one — that's exactly why Locrian is the outlier among the 7 diatonic
        // modes and is almost never used as a true tonal center. Stacking the scale's actual
        // degrees (getScaleTonicTriadQuality) gets this right; a name-based guess could not.
        expect(isMinorKeyScale('Diatonic Modes', 'Locrian')).toBe(false);
    });

    it('classifies major-family diatonic modes as not minor', () => {
        expect(isMinorKeyScale('Diatonic Modes', 'Ionian')).toBe(false);
        expect(isMinorKeyScale('Diatonic Modes', 'Lydian')).toBe(false);
        expect(isMinorKeyScale('Diatonic Modes', 'Mixolydian')).toBe(false);
    });

    it('classifies named minor scales as minor', () => {
        expect(isMinorKeyScale('Harmonic Minor Modes', 'Harmonic Minor')).toBe(true);
        expect(isMinorKeyScale('Jazz Minor Modes', 'Jazz Minor')).toBe(true);
        expect(isMinorKeyScale('Pentatonic', 'Minor Pentatonic')).toBe(true);
        expect(isMinorKeyScale('Pentatonic', 'Major Pentatonic')).toBe(false);
    });

    it('correctly classifies Phrygian Dominant as not-minor despite its name, fixing the old substring-match bug', () => {
        // Regression: the old keyword version matched the substring "Phrygian" and returned true,
        // even though Phrygian Dominant (5th mode of harmonic minor) has a MAJOR third — it's the
        // scale used over a dominant/major-tonic chord (e.g. E Phrygian Dominant over E7), not a
        // minor one. Deductive triad-stacking gets this right with no per-name exception needed.
        expect(isMinorKeyScale('Harmonic Minor Modes', 'Phrygian Dominant')).toBe(false);
    });
});
