import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAudition, createHarmonyPlayback } from './audition';
import { exploreRelation } from './relations';
import { resolveChord } from './roman';
import type { HarmonyPlaybackState } from './audition';

const tritone = () => exploreRelation({
    frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' },
    target: { root: 'C', chordId: 'major' }, kind: 'tritone',
});
afterEach(() => vi.useRealTimers());

describe('Harmony audition uses the resolved example identity', () => {
    it('plays Db7 as Db–F–Ab–Cb, never as the original G7 or a doubly transposed chord', () => {
        const result = tritone();
        const original = buildAudition(result.examples.find(example => example.id === 'original')!);
        const substitute = buildAudition(result.examples.find(example => example.id === 'substitute')!);
        expect(original[0].midi).toEqual([55, 62, 65, 67, 71]);
        expect(substitute[0].midi).toEqual([49, 61, 65, 68, 71]);
        expect(substitute[1].midi).toEqual([48, 60, 64, 67]);
    });

    it('uses the actual slash bass and only formula tones', () => {
        const example = tritone().examples[0];
        const inverted = { ...example, steps: [{ ...example.steps[0], chord: resolveChord({ root: 'G', chordId: 'dominant-7', bass: 'B' }) }] };
        expect(buildAudition(inverted)[0].midi).toEqual([59, 62, 65, 67, 71]);
    });

    it('auditions the tritone-equivalent guides with consistent target correspondence', () => {
        const result = tritone();
        const original = buildAudition(result.examples.find(example => example.id === 'original')!, true);
        const substitute = buildAudition(result.examples.find(example => example.id === 'substitute')!, true);
        expect(original.map(frame => frame.midi)).toEqual([[65, 71], [64, 72]]);
        expect(substitute.map(frame => frame.midi)).toEqual(original.map(frame => frame.midi));
        for (const frame of original) expect(frame.midi).toHaveLength(2);
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
