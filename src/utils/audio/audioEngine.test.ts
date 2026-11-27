import { expect, it, vi } from 'vitest';
import * as Tone from 'tone';
import { audioEngine } from './audioEngine';

const { Sampler, strums } = vi.hoisted(() => {
    class Sampler {
        constructor(readonly options: { urls: Record<string, AudioBuffer> }) { strums.push(this); }
        connect() { return this; }
        triggerAttackRelease = vi.fn();
        dispose = vi.fn();
    }
    const strums: Sampler[] = [];
    return { Sampler, strums };
});
vi.mock('tone', () => ({
    now: () => 10,
    start: vi.fn(async () => {}),
    ToneAudioBuffer: { load: vi.fn(async (file: string) => ({ file })) },
    Limiter: class { toDestination() { return this; } },
    Sampler,
}));

it('shares decoded samples while keeping each scheduled strum independently stoppable', async () => {
    await Promise.all([audioEngine.start(), audioEngine.start()]);
    expect(Tone.start).toHaveBeenCalledOnce();
    const stopFirst = audioEngine.playChord(['C3', 'E3']);
    const stopSecond = audioEngine.playChord(['G3']);
    const [first, second] = strums;
    expect(first.options.urls).toBe(second.options.urls);
    expect(Tone.ToneAudioBuffer.load).toHaveBeenCalledTimes(13);
    expect(first.triggerAttackRelease).toHaveBeenNthCalledWith(1, 'C3', '2n', 10);
    expect(first.triggerAttackRelease).toHaveBeenNthCalledWith(2, 'E3', '2n', 10.03);
    expect(first.dispose).toHaveBeenCalledOnce();
    stopFirst!();
    expect(first.dispose).toHaveBeenCalledOnce();
    expect(second.dispose).not.toHaveBeenCalled();
    stopSecond!();
    stopSecond!();
    expect(second.dispose).toHaveBeenCalledOnce();
});
