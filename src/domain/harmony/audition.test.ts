import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAudition, canonicalPitches, createHarmonyPlayback, linePitches } from './audition';
import { auditionLines, toneLabel } from './connections';
import { exploreRelation } from './relations';
import { degreeNumber, resolveChord } from './roman';
import type { HarmonyPlaybackState } from './audition';
import type { RelationKind } from './types';

const tritone = () => exploreRelation({
    frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' },
    target: { root: 'C', chordId: 'major' }, kind: 'tritone',
});
const explore = (kind: RelationKind, tonic = 'C', mode: 'major' | 'minor' = 'major') =>
    exploreRelation({ kind, frame: { tonic, mode, lens: 'jazz-pop' }, target: { root: tonic, chordId: mode } }).examples;
const TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const pc = (value: number) => ((value % 12) + 12) % 12;
const shape = (midi: number[]) => midi.map(pitch => pitch - midi[0]);
afterEach(() => vi.useRealTimers());

describe('Harmony audition uses the resolved example identity', () => {
    it('plays each chord once per formula tone in the canonical root-up stack', () => {
        const result = tritone();
        const original = buildAudition(result.examples.find(example => example.id === 'original')!);
        const substitute = buildAudition(result.examples.find(example => example.id === 'substitute')!);
        expect(original[0].midi).toEqual([55, 59, 62, 65]);
        expect(substitute[0].midi).toEqual([49, 53, 56, 59]);
        expect(substitute[1].midi).toEqual([48, 52, 55]);
    });

    it('moves a formula slash bass to the lowest note without repeating it above', () => {
        const example = tritone().examples[0];
        const inverted = { ...example, steps: [{ ...example.steps[0], chord: resolveChord({ root: 'G', chordId: 'dominant-7', bass: 'B' }) }] };
        expect(buildAudition(inverted)[0].midi).toEqual([47, 55, 62, 65]);
    });

    it('seeds each tritone guide line from its own chord\'s canonical register', () => {
        const result = tritone();
        expect(buildAudition(result.examples.find(example => example.id === 'original')!, true).map(frame => frame.midi)).toEqual([[59, 65], [60, 64]]);
        expect(buildAudition(result.examples.find(example => example.id === 'substitute')!, true).map(frame => frame.midi)).toEqual([[53, 59], [52, 60]]);
    });

    it('invalidates audio startup after the user changes context or leaves Harmony', async () => {
        const engine = { start: vi.fn(async () => {}), playChord: vi.fn() };
        let finishLoad!: (value: typeof engine) => void;
        const states: HarmonyPlaybackState[] = [];
        const playback = createHarmonyPlayback(() => new Promise(resolve => { finishLoad = resolve; }), state => states.push(state));
        const playing = playback.play(tritone().examples[0]);
        playback.cancel();
        finishLoad(engine);
        await playing;
        expect(engine.start).not.toHaveBeenCalled();
        expect(engine.playChord).not.toHaveBeenCalled();
        expect(states.at(-1)).toEqual({ playing: false, error: null, step: null });
    });

    it('cancels the remaining sequence after its first chord', async () => {
        vi.useFakeTimers();
        const engine = { start: vi.fn(async () => {}), playChord: vi.fn() };
        const states: HarmonyPlaybackState[] = [];
        const playback = createHarmonyPlayback(async () => engine, state => states.push(state));
        const playing = playback.play(tritone().examples[0]);
        await vi.advanceTimersByTimeAsync(0);
        expect(engine.playChord).toHaveBeenCalledTimes(1);
        playback.cancel();
        await playing;
        await vi.runAllTimersAsync();
        expect(engine.playChord).toHaveBeenCalledTimes(1);
        expect(states.at(-1)).toEqual({ playing: false, error: null, step: null });
    });

    it('exposes an audio failure and allows a subsequent retry', async () => {
        vi.useFakeTimers();
        const engine = { start: vi.fn(async () => {}), playChord: vi.fn() };
        const loader = vi.fn<() => Promise<typeof engine>>().mockRejectedValueOnce(new Error('blocked')).mockResolvedValue(engine);
        const states: HarmonyPlaybackState[] = [];
        const playback = createHarmonyPlayback(loader, state => states.push(state));
        await playback.play(tritone().examples[0]);
        expect(states.at(-1)).toMatchObject({ playing: false, error: expect.stringContaining('retry') });
        const retry = playback.play(tritone().examples[0]);
        await vi.runAllTimersAsync();
        await retry;
        expect(engine.playChord).toHaveBeenCalledTimes(2);
        expect(states.at(-1)).toEqual({ playing: false, error: null, step: null });
    });
});

const EXTENDED: [string, string][] = [['Cmaj9', 'major-9'], ['C9', 'dominant-9'], ['C13', 'dominant-13'], ['C7♭9', 'dominant-7-flat-9'], ['C7♯9', 'hendrix-7-sharp-9'], ['Cm11', 'minor-11'], ['C6/9', 'six-nine']];
const CORE: [string, string][] = [['C', 'major'], ['Cm', 'minor'], ['C7', 'dominant-7'], ['Cmaj7', 'major-7'], ['Cdim7', 'diminished-7'], ['Cm7♭5', 'half-diminished-7']];

describe('Canonical audition contract', () => {
    it('stacks compound extensions an octave above, from the degree number', () => {
        expect([...canonicalPitches(resolveChord({ root: 'C', chordId: 'major-9' })).values()].sort((a, b) => a - b)).toEqual([48, 52, 55, 59, 62]);
    });

    it.each([...CORE, ...EXTENDED])('%s: role-ordered stack, compound register, unique tones, 12-key shape invariance', (_, chordId) => {
        const reference = resolveChord({ root: 'C', chordId });
        const referenceShape = shape([...canonicalPitches(reference).values()].sort((a, b) => a - b));
        for (const tonic of TONICS) {
            const chord = resolveChord({ root: tonic, chordId });
            const pitches = canonicalPitches(chord), root = pitches.get('1')!;
            const midi = [...pitches.values()].sort((a, b) => a - b);
            expect(midi).toHaveLength(chord.tones.length);
            expect(new Set(midi.map(pc)).size).toBe(chord.tones.length);
            const byRole = [...chord.tones].sort((a, b) => degreeNumber(a.degree) - degreeNumber(b.degree)).map(t => pitches.get(t.degree)!);
            expect(byRole).toEqual(midi);
            const highestSimple = Math.max(...chord.tones.filter(t => degreeNumber(t.degree) <= 7).map(t => pitches.get(t.degree)!));
            for (const tone of chord.tones.filter(t => degreeNumber(t.degree) >= 8)) {
                expect(pitches.get(tone.degree)).toBe(root + 12 + pc(tone.pitchClass - chord.rootPitchClass));
                expect(pitches.get(tone.degree)!).toBeGreaterThan(highestSimple);
            }
            expect(shape(midi)).toEqual(referenceShape);
            expect(Math.min(...midi)).toBeGreaterThanOrEqual(36);
            expect(Math.max(...midi)).toBeLessThanOrEqual(85);
        }
    });

    it.each([...CORE, ...EXTENDED])('%s over every non-root formula bass: bass lowest, sounded once, 12-key invariant', (_, chordId) => {
        const formula = resolveChord({ root: 'C', chordId });
        for (const bassTone of formula.tones.filter(t => t.degree !== '1')) {
            let referenceShape: number[] | undefined;
            for (const tonic of TONICS) {
                const plain = resolveChord({ root: tonic, chordId });
                const bassName = plain.tones.find(t => t.degree === bassTone.degree)!.name;
                const chord = resolveChord({ root: tonic, chordId, bass: bassName });
                const midi = [...canonicalPitches(chord).values()].sort((a, b) => a - b);
                expect(pc(midi[0])).toBe(chord.bassPitchClass);
                expect(midi.filter(pitch => pc(pitch) === chord.bassPitchClass)).toHaveLength(1);
                expect(new Set(midi.map(pc)).size).toBe(chord.tones.length);
                referenceShape ??= shape(midi);
                expect(shape(midi)).toEqual(referenceShape);
            }
        }
    });
});

const MOTION: [string, RelationKind, 'major' | 'minor', string?][] = [
    ['G → C', 'fifths', 'major'], ['G7 → C', 'dominant', 'major'], ['Dm7 → G7 → C', 'ii-v', 'major'],
    ['D♭7 → C', 'tritone', 'major', 'substitute'], ['V7 → i', 'dominant', 'minor'], ['vii°7 → I', 'leading', 'major', 'leading'],
    ['vii°7 → i', 'leading', 'minor', 'leading'], ['CT°7', 'common-tone', 'major'], ['backdoor', 'backdoor', 'major', 'minor-backdoor'],
];

describe('Line audition realizes only the drawn edges', () => {
    it.each(MOTION.flatMap(([label, kind, mode, id]) => TONICS.map(tonic => [label, tonic, kind, mode, id] as const)))('%s in %s: each edge sounds in its own direction and size; lines start at canonical pitches', (_, tonic, kind, mode, id) => {
        const example = explore(kind, tonic, mode).find(item => !id || item.id === id)!;
        const pitches = linePitches(example);
        const destinations = new Set<string>();
        // Exactly the edges line audio realizes: guide lines only when every step has them, else every drawn line.
        const realized = auditionLines(example).transitions;
        for (const transition of realized) {
            for (const voice of transition.voices) {
                const from = toneLabel(example.steps[transition.fromStep], voice.fromDegree), to = toneLabel(example.steps[transition.toStep], voice.toDegree);
                const up = pc(to.pitchClass - from.pitchClass), signed = up > 6 ? up - 12 : up;
                expect(pitches[transition.toStep].get(voice.toDegree)! - pitches[transition.fromStep].get(voice.fromDegree)!).toBe(signed);
                if (!destinations.has(`${transition.fromStep}:${voice.fromDegree}`)) {
                    expect(pitches[transition.fromStep].get(voice.fromDegree)).toBe(canonicalPitches(example.steps[transition.fromStep].chord).get(voice.fromDegree));
                }
                destinations.add(`${transition.toStep}:${voice.toDegree}`);
            }
        }
        // Nothing sounds that the diagram does not connect.
        pitches.forEach((voices, step) => {
            for (const degree of voices.keys()) expect(realized.some(t => t.voices.some(v => (t.fromStep === step && v.fromDegree === degree) || (t.toStep === step && v.toDegree === degree)))).toBe(true);
        });
    });

    it.each(['tonic-sub', 'minor-sub'] as RelationKind[])('%s comparison has no line playback, so no undeclared correspondence can sound', kind => {
        for (const example of explore(kind)) {
            expect(example.kind).toBe('comparison');
            expect(() => buildAudition(example, true)).toThrow('only for motion');
            expect(buildAudition(example).map(frame => frame.midi)).toEqual(example.steps.map(step => [...canonicalPitches(step.chord).values()].sort((a, b) => a - b)));
        }
    });
});
