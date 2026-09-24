import { parseNoteName, spellDegree, normalizeAccidentalsToAscii, formatAccidentals } from '@/domain/shared/spelling';
import { engineEntry } from '@/domain/chord/engine/catalog';
import { getChordTypeSuffix } from '@/domain/chord/helpers';
import type { ChordRef, ResolvedHarmonyChord, RomanRef, TonalFrame } from './types';

export const pc = (value: number) => ((value % 12) + 12) % 12;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
export function note(name: string) {
    const parsed = parseNoteName(name);
    if (!parsed) throw new Error(`Unsupported note spelling: ${name}`);
    return parsed;
}
export function validateFrame(frame: TonalFrame) {
    note(frame.tonic);
    if (!['major', 'minor'].includes(frame.mode) || !['jazz-pop', 'classical'].includes(frame.lens)) throw new Error('Unsupported tonal frame');
}
export function resolveChord(ref: ChordRef): ResolvedHarmonyChord {
    const root = note(ref.root), entry = engineEntry(ref.chordId);
    const tones = entry.formula.degrees.map((degree, index) => {
        const number = Number(degree.replace(/[^0-9]/g, ''));
        const pitchClass = pc(root.pitchClass + entry.formula.intervals[index]);
        const spelled = spellDegree(root, number, pitchClass);
        if (!spelled) throw new Error('This spelling is outside the supported accidental range');
        return { degree, name: spelled.name, pitchClass };
    });
    const bass = ref.bass !== undefined ? note(ref.bass) : root;
    if (!tones.some(tone => tone.pitchClass === bass.pitchClass)) throw new Error('Non-formula slash bass is outside this explorer');
    return { ...ref, root: root.name, rootPitchClass: root.pitchClass, bassPitchClass: bass.pitchClass, tones,
        name: formatAccidentals(root.name + getChordTypeSuffix(entry) + (bass.pitchClass !== root.pitchClass ? `/${bass.name}` : '')) };
}
export function relativeChord(anchor: string, degree: number, semitones: number, chordId: string): ChordRef {
    const root = note(anchor);
    const spelled = spellDegree(root, degree, pc(root.pitchClass + semitones));
    if (!spelled) throw new Error('This relation needs an unsupported spelling');
    return { root: spelled.name, chordId };
}
/** Lens-independent major-reference notation, also in minor (e.g. ♭III, ♭VI, ♭VII). */
export function romanRef(chord: ChordRef, frame: TonalFrame): RomanRef {
    const tonic = note(frame.tonic), root = note(chord.root);
    const degree = (root.letterIndex - tonic.letterIndex + 7) % 7 + 1;
    let alteration = pc(root.pitchClass - tonic.pitchClass - MAJOR[degree - 1]);
    if (alteration > 6) alteration -= 12;
    return { degree, alteration, chordId: chord.chordId };
}
export function renderRoman(ref: RomanRef): string {
    if (ref.appliedTo) return `V7/${renderRoman(ref.appliedTo)}`;
    const entry = engineEntry(ref.chordId), degrees = entry.formula.degrees;
    const minor = degrees.includes('b3');
    const numeral = minor ? ROMANS[ref.degree - 1].toLowerCase() : ROMANS[ref.degree - 1];
    const accidental = ref.alteration < 0 ? '♭'.repeat(-ref.alteration) : '♯'.repeat(ref.alteration);
    const suffixes: Record<string, string> = { major: '', minor: '', 'major-7': 'maj7', 'minor-major-7': 'maj7', 'minor-7': '7', 'dominant-7': '7', diminished: '°', augmented: '+', 'diminished-7': '°7', 'half-diminished-7': 'ø7' };
    const suffix = suffixes[entry.id] ?? getChordTypeSuffix(entry).replace(/^m(?!aj)/, '');
    return accidental + numeral + suffix;
}
export const romanLabel = (chord: ChordRef, frame: TonalFrame) => renderRoman(romanRef(chord, frame));
/** Strict supported grammar. No tonic/major fallback and no display/core string pair. */
export function parseRoman(input: string): RomanRef | null {
    const text = normalizeAccidentalsToAscii(input.trim());
    if (text.startsWith('V7/')) {
        const appliedTo = parseRoman(text.slice(3));
        return appliedTo && !appliedTo.appliedTo ? { degree: 5, alteration: 0, chordId: 'dominant-7', appliedTo } : null;
    }
    const match = /^(bb|##|b|#)?(VII|III|VI|IV|II|V|I|vii|iii|vi|iv|ii|v|i)(maj7|ø7|°7|°|7|\+)?$/.exec(text);
    if (!match) return null;
    const [, accidental = '', numeral, suffix = ''] = match;
    const minor = numeral === numeral.toLowerCase();
    const chordId = suffix === 'ø7' ? 'half-diminished-7' : suffix === '°7' ? 'diminished-7' : suffix === '°' ? 'diminished'
        : suffix === '+' ? 'augmented' : suffix === 'maj7' ? (minor ? 'minor-major-7' : 'major-7') : suffix === '7' ? (minor ? 'minor-7' : 'dominant-7') : minor ? 'minor' : 'major';
    return { degree: ROMANS.indexOf(numeral.toUpperCase()) + 1, alteration: accidental.startsWith('b') ? -accidental.length : accidental.length, chordId };
}
export function resolveRoman(ref: RomanRef, frame: TonalFrame): ChordRef {
    validateFrame(frame);
    if (!Number.isInteger(ref.degree) || ref.degree < 1 || ref.degree > 7 || !Number.isInteger(ref.alteration) || Math.abs(ref.alteration) > 2) throw new Error('Invalid Roman degree');
    engineEntry(ref.chordId);
    if (ref.appliedTo) return relativeChord(resolveRoman(ref.appliedTo, frame).root, 5, 7, 'dominant-7');
    return relativeChord(frame.tonic, ref.degree, MAJOR[ref.degree - 1] + ref.alteration, ref.chordId);
}
export function frameChords(frame: TonalFrame): ChordRef[] {
    validateFrame(frame);
    const intervals = frame.mode === 'major' ? MAJOR : [0, 2, 3, 5, 7, 8, 10];
    const qualities = frame.mode === 'major' ? ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished']
        : ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];
    return intervals.map((interval, i) => relativeChord(frame.tonic, i + 1, interval, qualities[i]));
}
