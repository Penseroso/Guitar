import { describe, expect, it } from 'vitest';

import {
    degreeToChordName,
    getChordFromDegree,
    getChordTones,
    injectSecondaryDominants,
    parseRomanDegree,
    ROMAN_NUMERAL_CHORDS,
} from './degrees';
import { generateModeData, SCALE_REGISTRY } from '@/domain/scale/scales';

describe('parseRomanDegree', () => {
    it('parses diatonic degrees in uppercase (Major) and lowercase (Minor)', () => {
        expect(parseRomanDegree('I')).toEqual({ interval: 0, type: 'Major' });
        expect(parseRomanDegree('i')).toEqual({ interval: 0, type: 'Minor' });
        expect(parseRomanDegree('IV')).toEqual({ interval: 5, type: 'Major' });
        expect(parseRomanDegree('iv')).toEqual({ interval: 5, type: 'Minor' });
        expect(parseRomanDegree('V')).toEqual({ interval: 7, type: 'Major' });
        expect(parseRomanDegree('v')).toEqual({ interval: 7, type: 'Minor' });
    });

    it('parses ASCII and Unicode accidentals equivalently', () => {
        expect(parseRomanDegree('♭III')).toEqual({ interval: 3, type: 'Major' });
        expect(parseRomanDegree('bIII')).toEqual({ interval: 3, type: 'Major' });
        expect(parseRomanDegree('♭VI')).toEqual({ interval: 8, type: 'Major' });
        expect(parseRomanDegree('bVI')).toEqual({ interval: 8, type: 'Major' });
        expect(parseRomanDegree('♯IV+')).toEqual({ interval: 6, type: 'Augmented' });
        expect(parseRomanDegree('#IV+')).toEqual({ interval: 6, type: 'Augmented' });
        expect(parseRomanDegree('♭♭VII')).toEqual({ interval: 9, type: 'Major' });
        expect(parseRomanDegree('bbVII')).toEqual({ interval: 9, type: 'Major' });
    });

    it('parses diminished and augmented suffixes correctly', () => {
        expect(parseRomanDegree('vii°')).toEqual({ interval: 11, type: 'Diminished' });
        expect(parseRomanDegree('♯ii°')).toEqual({ interval: 3, type: 'Diminished' });
        expect(parseRomanDegree('♭iii°')).toEqual({ interval: 3, type: 'Diminished' });
        expect(parseRomanDegree('♭v°')).toEqual({ interval: 6, type: 'Diminished' });
        expect(parseRomanDegree('♯v°')).toEqual({ interval: 8, type: 'Diminished' });
        expect(parseRomanDegree('I+')).toEqual({ interval: 0, type: 'Augmented' });
        expect(parseRomanDegree('♭IV+')).toEqual({ interval: 4, type: 'Augmented' });
        expect(parseRomanDegree('V+')).toEqual({ interval: 7, type: 'Augmented' });
    });

    it('parses 7th chord suffixes', () => {
        expect(parseRomanDegree('IVmaj7')).toEqual({ interval: 5, type: 'Major 7' });
        expect(parseRomanDegree('im7')).toEqual({ interval: 0, type: 'Minor 7' });
        expect(parseRomanDegree('V7')).toEqual({ interval: 7, type: 'Dominant 7' });
    });

    it('returns null for non-degree strings', () => {
        expect(parseRomanDegree('not-a-degree')).toBeNull();
        expect(parseRomanDegree('')).toBeNull();
    });
});

describe('getChordFromDegree', () => {
    it('resolves diatonic Roman numerals to interval + quality', () => {
        expect(getChordFromDegree('IV')).toEqual({ interval: 5, type: 'Major' });
        expect(getChordFromDegree('vi')).toEqual({ interval: 9, type: 'Minor' });
        expect(getChordFromDegree('vii°')).toEqual({ interval: 11, type: 'Diminished' });
    });

    it('resolves all Unicode and ASCII accidentals identically', () => {
        expect(getChordFromDegree('♭VI')).toEqual({ interval: 8, type: 'Major' });
        expect(getChordFromDegree('bVI')).toEqual({ interval: 8, type: 'Major' });
        expect(getChordFromDegree('♯ii°')).toEqual({ interval: 3, type: 'Diminished' });
        expect(getChordFromDegree('#ii°')).toEqual({ interval: 3, type: 'Diminished' });
        expect(getChordFromDegree('♭♭VII')).toEqual({ interval: 9, type: 'Major' });
        expect(getChordFromDegree('bbVII')).toEqual({ interval: 9, type: 'Major' });
        expect(getChordFromDegree('♭IV+')).toEqual({ interval: 4, type: 'Augmented' });
        expect(getChordFromDegree('bIV+')).toEqual({ interval: 4, type: 'Augmented' });
        expect(getChordFromDegree('♭ii')).toEqual({ interval: 1, type: 'Minor' });
        expect(getChordFromDegree('bii')).toEqual({ interval: 1, type: 'Minor' });
        expect(getChordFromDegree('♭v°')).toEqual({ interval: 6, type: 'Diminished' });
        expect(getChordFromDegree('bv°')).toEqual({ interval: 6, type: 'Diminished' });
        expect(getChordFromDegree('♯v°')).toEqual({ interval: 8, type: 'Diminished' });
        expect(getChordFromDegree('#v°')).toEqual({ interval: 8, type: 'Diminished' });
        expect(getChordFromDegree('V+')).toEqual({ interval: 7, type: 'Augmented' });
    });

    it('falls back to I major for unknown degrees', () => {
        expect(getChordFromDegree('not-a-degree')).toEqual({ interval: 0, type: 'Major' });
    });

    it('covers 100% of degrees produced across all scale families in SCALE_REGISTRY', () => {
        for (const [group, modes] of Object.entries(SCALE_REGISTRY)) {
            for (const mode of Object.keys(modes)) {
                const modeData = generateModeData(group, mode);
                for (const [intervalStr, { role }] of Object.entries(modeData)) {
                    const expectedInterval = parseInt(intervalStr, 10);
                    const chord = getChordFromDegree(role);

                    expect(
                        chord.interval,
                        `Expected interval ${expectedInterval} for degree ${role} in ${group} -> ${mode}`
                    ).toBe(expectedInterval);

                    // Verify direct lookup in ROMAN_NUMERAL_CHORDS table also works
                    expect(
                        ROMAN_NUMERAL_CHORDS[role],
                        `Expected ROMAN_NUMERAL_CHORDS to contain ${role}`
                    ).toBeDefined();

                    // Verify degreeToChordName can name it without falling back to raw role
                    const chordName = degreeToChordName(role, role, 0);
                    expect(
                        chordName,
                        `degreeToChordName should resolve chord name for ${role}, got ${chordName}`
                    ).not.toBe(role);
                    expect(chordName.length).toBeGreaterThan(0);
                }
            }
        }
    });
});

describe('degreeToChordName', () => {
    it('names a plain diatonic degree relative to the root key', () => {
        expect(degreeToChordName('vi', 'vi', 0)).toBe('Am');
        expect(degreeToChordName('IV', 'IV', 0)).toBe('F');
    });

    it('names Unicode degrees accurately without returning raw degree strings', () => {
        expect(degreeToChordName('♭VI', '♭VI', 0)).toBe('Ab');
        expect(degreeToChordName('bVI', 'bVI', 0)).toBe('Ab');
        expect(degreeToChordName('♭III', '♭III', 0)).toBe('Eb');
        expect(degreeToChordName('bIII', 'bIII', 0)).toBe('Eb');
        expect(degreeToChordName('♭II', '♭II', 0)).toBe('Db');
        expect(degreeToChordName('♯ii°', '♯ii°', 0)).toBe('Eb°');
        expect(degreeToChordName('#ii°', '#ii°', 0)).toBe('Eb°');
        expect(degreeToChordName('♭IV+', '♭IV+', 0)).toBe('E+');
        expect(degreeToChordName('♭♭VII', '♭♭VII', 0)).toBe('A');
    });

    it('names a secondary dominant (V7/x) a fifth above its target (ASCII and Unicode)', () => {
        // V7/vi in the key of C targets Am (root 9), so V7/vi = E7.
        expect(degreeToChordName('V7/vi', 'vi', 0)).toBe('E7');
        // V7/♭VI in the key of C targets Ab (root 8), so V7/♭VI = Eb7.
        expect(degreeToChordName('V7/♭VI', '♭VI', 0)).toBe('Eb7');
        expect(degreeToChordName('V7/bVI', 'bVI', 0)).toBe('Eb7');
        // V7/♭III in the key of C targets Eb (root 3), so V7/♭III = Bb7.
        expect(degreeToChordName('V7/♭III', '♭III', 0)).toBe('Bb7');
    });

    it('names a tritone substitution (subV7/x) a half-step above its target (ASCII and Unicode)', () => {
        // subV7/V in the key of C targets G (root 7); the b2-of-target formula gives root 8 = Ab7.
        expect(degreeToChordName('subV7/V', 'V', 0)).toBe('Ab7');
        // subV7/♭VI in the key of C targets Ab (root 8); root 9 = A7.
        expect(degreeToChordName('subV7/♭VI', '♭VI', 0)).toBe('A7');
        expect(degreeToChordName('subV7/bVI', 'bVI', 0)).toBe('A7');
    });

    it('uses conventional key-signature spelling regardless of degree/quality, not a sharp-by-default heuristic', () => {
        expect(degreeToChordName('V', 'V', 1)).toBe('Ab');
        expect(degreeToChordName('IV', 'IV', 8)).toBe('Db');
    });

    it('returns the input displayDegree for unparseable strings', () => {
        expect(degreeToChordName('not-a-degree', 'not-a-degree', 0)).toBe('not-a-degree');
    });
});

describe('getChordTones', () => {
    it('returns chord tones for a known chord type relative to the root', () => {
        expect(getChordTones('Minor 7', 2)).toEqual([2, 5, 9, 0]);
        expect(getChordTones('Augmented', 0)).toEqual([0, 4, 8]);
        expect(getChordTones('Diminished', 0)).toEqual([0, 3, 6]);
        expect(getChordTones('Major', 0)).toEqual([0, 4, 7]);
    });

    it('falls back to a major triad for unknown chord types', () => {
        expect(getChordTones('unknown', 0)).toEqual([0, 4, 7]);
    });
});

describe('injectSecondaryDominants', () => {
    it('inserts a V7-of-target before every non-tonic, non-diminished degree', () => {
        expect(injectSecondaryDominants(['I', 'vi', 'IV', 'V'])).toEqual([
            'I',
            'V7 of vi', 'vi',
            'V7 of IV', 'IV',
            'V7 of V', 'V',
        ]);
    });

    it('does not inject before tonic or diminished degrees', () => {
        expect(injectSecondaryDominants(['i', 'vii°'])).toEqual(['i', 'vii°']);
    });
});
