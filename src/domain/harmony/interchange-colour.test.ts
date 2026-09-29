import { describe, expect, it } from 'vitest';
import { connectChords, exampleTransitions, toneLabel } from './connections';
import { exploreRelation } from './relations';
import { note, resolveChord } from './roman';
import type { ChordRef, RelationExample, RelationQuery, TonalFrame } from './types';

const frame: TonalFrame = { tonic: 'C', mode: 'major', lens: 'jazz-pop' };
const query = (changes: Partial<RelationQuery>): RelationQuery => ({ frame, target: { root: 'C', chordId: 'major' }, kind: 'mixture', ...changes });
const minorFrame: TonalFrame = { ...frame, mode: 'minor' };
const classical: TonalFrame = { ...frame, lens: 'classical' };
const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Readable edge list: `=` held, `→` moving, `*` guide tone. */
const lines = (example: RelationExample) => exampleTransitions(example).map(t => t.voices.map(v =>
    `${toneLabel(example.steps[t.fromStep], v.fromDegree).name}${v.kind === 'held' ? '=' : '→'}${toneLabel(example.steps[t.toStep], v.toDegree).name}${v.guide ? '*' : ''}`).sort());
const byId = (examples: RelationExample[], id: string) => examples.find(example => example.id === id)!;

describe('Borrowed chords (modal interchange)', () => {
    it('compares each degree with its parallel-minor form as a colour comparison, not a sequence', () => {
        const result = exploreRelation(query({}));
        expect(result.status).toBe('possible');
        expect(result.examples.map(example => example.steps.map(step => `${step.roman}:${step.chord.name}`))).toEqual([
            ['ii7:Dm7', 'iiø7:Dm7♭5'], ['iii:Em', '♭III:E♭'], ['IV:F', 'iv:Fm'], ['vi:Am', '♭VI:A♭'], ['vii°:B°', '♭VII:B♭'],
        ]);
        for (const example of result.examples) {
            expect(example.kind).toBe('comparison');
            expect(example.transitions).toBeUndefined();
        }
        expect(byId(result.examples, 'flat-iii').notes).toEqual(['Borrowed · E♭ (♭3), B♭ (♭7)']);
        expect(byId(result.examples, 'flat-vii').notes).toContain('Also in Mixolydian');
        expect(result.observations).toContain('Functional readings · Subdominant minor, Backdoor');
        expect(result.scaleLinks.map(link => link.label)).toEqual(['C Aeolian · borrowed collection']);
    });

    it.each(KEYS)('keeps every borrowed chord inside the parallel minor and on the same letter degree in %s', tonic => {
        const result = exploreRelation(query({ frame: { ...frame, tonic }, target: { root: tonic, chordId: 'major-7' } }));
        const aeolian = [0, 2, 3, 5, 7, 8, 10].map(step => (note(tonic).pitchClass + step) % 12);
        expect(result.examples).toHaveLength(5);
        for (const example of result.examples) {
            const [diatonic, borrowed] = example.steps.map(step => step.chord);
            expect(borrowed.tones.every(tone => aeolian.includes(tone.pitchClass))).toBe(true);
            expect(note(borrowed.root).letterIndex).toBe(note(diatonic.root).letterIndex);
            expect(borrowed).toEqual(resolveChord(borrowed));
        }
    });

    it('is a pitch-collection relation in both lenses but stays out of minor frames and non-tonic targets', () => {
        expect(exploreRelation(query({ frame: classical })).status).toBe('possible');
        for (const request of [
            query({ frame: minorFrame, target: { root: 'C', chordId: 'minor' } }),
            query({ target: { root: 'G', chordId: 'major' } }),
            query({ target: { root: 'C', chordId: 'dominant-7' } }),
        ]) {
            const result = exploreRelation(request);
            expect(result.status).toBe('unsupported');
            expect(result.examples).toEqual([]);
        }
        expect(exploreRelation(query({ frame: minorFrame, target: { root: 'C', chordId: 'minor' } })).observations.join(' ')).toMatch(/Picardy/);
    });

    it('leaves the functional subdominant-minor and backdoor relations unchanged', () => {
        expect(exploreRelation(query({ kind: 'minor-sub' })).examples.map(example => example.id)).toEqual(['mixture', 'minor-ii', 'flat-six']);
        expect(exploreRelation(query({ kind: 'backdoor' })).examples.map(example => example.steps.map(step => step.chord.name))).toEqual([['B♭7', 'C'], ['Fm7', 'B♭7', 'C']]);
        expect(exploreRelation(query({ kind: 'minor-sub', frame: classical })).status).toBe('unsupported');
    });
});

describe('Dominant colours', () => {
    const colours = (changes: Partial<RelationQuery> = {}) => exploreRelation(query({ kind: 'dominant-colour', ...changes }));

    it('lists the registry dominant vocabulary per lens without hiding the lens difference', () => {
        expect(colours().examples.map(example => example.label)).toEqual(['9', '13', '7♭9', '7♯9', '7♭5', '7♯5', '7sus4']);
        expect(colours({ frame: classical }).examples.map(example => example.label)).toEqual(['9', '7♭9', '7♭5', '7♯5']);
        expect(colours().examples.map(example => example.steps[0].roman)).toEqual(['V9', 'V13', 'V7♭9', 'V7♯9', 'V7♭5', 'V7♯5', 'V7sus4']);
    });

    it.each([['major', 'C', 'major'], ['minor', 'C', 'minor']] as const)('keeps the V7 guide-tone resolution for every 3rd + ♭7 colour (%s)', (mode, root, chordId) => {
        const request = { frame: { ...frame, mode }, target: { root, chordId } };
        const guides = (example: RelationExample) => lines(example)[0].filter(line => line.endsWith('*'));
        const v7 = exploreRelation(query({ ...request, kind: 'dominant' })).examples[0];
        for (const example of colours(request).examples.filter(item => item.id !== '7sus4')) {
            expect(guides(example)).toEqual(guides(v7));
            expect(example.steps[0].chord.root).toBe('G');
        }
    });

    it('connects altered and extended tones only by fixed tendencies or retained pitch', () => {
        const major = colours().examples, minor = colours({ frame: minorFrame, target: { root: 'C', chordId: 'minor' } }).examples;
        expect(lines(byId(major, '7b9'))[0]).toContain('Ab→G');
        expect(lines(byId(major, '9'))[0]).toContain('A→G');
        expect(lines(byId(major, '7b5'))[0]).toContain('Db→C');
        expect(lines(byId(major, '7#5'))[0]).toContain('D#→E');
        expect(lines(byId(minor, '7#5'))[0]).toContain('D#=Eb');
        expect(lines(byId(major, '13'))[0]).toContain('E=E');
        // No fixed direction: an unretained 13th or a ♯9 stays unconnected.
        expect(lines(byId(minor, '13'))[0].some(line => line.startsWith('E'))).toBe(false);
        expect(lines(byId(major, '7#9'))[0].some(line => line.startsWith('A#'))).toBe(false);
        expect(byId(major, '7#9').notes).toContain('♯9 A♯ · no fixed resolution');
    });

    it('does not present 7sus4 as having the tritone or guide tones', () => {
        const sus = byId(colours().examples, '7sus4');
        expect(lines(sus)).toEqual([['C=C', 'F→E', 'G=G']]);
        expect(exampleTransitions(sus)[0].voices.some(voice => voice.guide)).toBe(false);
        expect(sus.notes?.[0]).toBe('No 3rd · no 3rd–♭7 tritone');
    });

    it('states collection facts and pitch-set identities without an interchangeability claim', () => {
        const major = colours().examples, minor = colours({ frame: minorFrame, target: { root: 'C', chordId: 'minor' } }).examples;
        expect(byId(major, '7b9').notes).toContain('Outside C Ionian · A♭');
        expect(byId(minor, '7b9').notes).toContain('Colour tones · within C Harmonic Minor');
        expect(byId(minor, '13').notes).toContain('Outside C Harmonic Minor · A, E');
        expect(byId(major, '7b5').notes).toContain('Same pitches as D♭7♭5 · different root');
        const result = colours();
        expect(result.status).toBe('possible');
        expect(result.observations.join(' ')).toMatch(/not interchangeable/);
    });

    it.each(KEYS)('keeps local and applied targets contextual in %s', tonic => {
        const result = colours({ frame: { ...frame, tonic }, target: { root: tonic, chordId: 'dominant-7' } });
        expect(result.status).toBe('possible');
        expect(result.observations).toContain('Root · key center ≠ tonic function');
        for (const example of result.examples) expect(() => exampleTransitions(example)).not.toThrow();
        const applied = colours({ frame: { ...frame, tonic }, target: { root: resolveChord({ root: tonic, chordId: 'major' }).tones[2].name, chordId: 'major' } });
        expect(applied.examples.every(example => example.steps[0].roman.endsWith('/V'))).toBe(true);
    });

    it('does not add colour-tone rules to non-dominant sources', () => {
        const connect = (from: ChordRef, to: ChordRef) => connectChords(resolveChord(from), resolveChord(to)).voices.map(voice => voice.fromDegree).sort();
        // The ♭5 of iiø7 stays unconnected, exactly as before.
        expect(connect({ root: 'D', chordId: 'half-diminished-7' }, { root: 'G', chordId: 'dominant-7' })).toEqual(['1', 'b3', 'b7']);
    });
});

describe('Minor-key tonic substitutes', () => {
    it('compares im7 with the relative-major ♭IIImaj7 under the jazz/pop lens only', () => {
        const result = exploreRelation(query({ kind: 'tonic-sub', frame: minorFrame, target: { root: 'C', chordId: 'minor' } }));
        expect(result.status).toBe('possible');
        expect(result.examples.map(example => example.steps.map(step => step.chord.name))).toEqual([['Cm7', 'E♭maj7']]);
        expect(result.examples[0].kind).toBe('comparison');
        for (const request of [
            query({ kind: 'tonic-sub', frame: { ...minorFrame, lens: 'classical' }, target: { root: 'C', chordId: 'minor' } }),
            query({ kind: 'tonic-sub', target: { root: 'C', chordId: 'minor' } }),
            query({ kind: 'tonic-sub', frame: minorFrame, target: { root: 'C', chordId: 'major' } }),
        ]) expect(exploreRelation(request).status).toBe('unsupported');
    });
});

describe('Neapolitan sixth (classical)', () => {
    const neapolitan = (changes: Partial<RelationQuery> = {}) => exploreRelation(query({ kind: 'neapolitan', frame: { ...classical, mode: 'minor' }, target: { root: 'C', chordId: 'minor' }, ...changes }));

    it('shows ♭II6–V7–i with ♭2̂ to the leading tone, ♭6̂ to 5̂ and the shared 4̂ retained', () => {
        const result = neapolitan();
        expect(result.status).toBe('matched');
        const example = byId(result.examples, 'neapolitan');
        expect(example.steps.map(step => `${step.roman}:${step.chord.name}`)).toEqual(['♭II6:D♭/F', 'V7:G7', 'i:Cm']);
        expect(lines(example)[0]).toEqual(['Ab→G', 'Db→B', 'F=F']);
        // The V7–i step keeps the dominant relation's own correspondence.
        const dominant = exploreRelation(query({ kind: 'dominant', frame: minorFrame, target: { root: 'C', chordId: 'minor' } })).examples[0];
        expect(lines(example)[1]).toEqual(lines(dominant)[0]);
        expect(byId(result.examples, 'ii-neapolitan').steps.map(step => step.chord.name)).toEqual(['D°/F', 'D♭/F']);
    });

    it.each(KEYS)('keeps 4̂ in the bass when transposed to %s major', tonic => {
        const result = neapolitan({ frame: { ...classical, tonic }, target: { root: tonic, chordId: 'major' } });
        const chord = result.examples[0].steps[0].chord;
        expect((chord.rootPitchClass - note(tonic).pitchClass + 12) % 12).toBe(1);
        expect((chord.bassPitchClass - note(tonic).pitchClass + 12) % 12).toBe(5);
        expect(result.observations).toContain('Major key · ♭6 also borrowed from minor');
    });

    it('is not a jazz/pop rule and needs a tonic-family target', () => {
        for (const request of [
            query({ kind: 'neapolitan' }),
            query({ kind: 'neapolitan', frame: classical, target: { root: 'G', chordId: 'major' } }),
        ]) {
            const result = exploreRelation(request);
            expect(result.status).toBe('unsupported');
            expect(result.examples).toEqual([]);
        }
    });
});
