/**
 * audioEngine.ts
 * Singleton audio engine powered by Tone.js.
 * Shares decoded FreePats "Clean Electric Guitar" recordings between guitar strums
 * (CC0 1.0; source and license documented in public/audio/clean-electric-guitar/SOURCE.md).
 */

import * as Tone from 'tone';

const SAMPLE_BASE_URL = '/audio/clean-electric-guitar/';

// Sparse anchor notes spanning the guitar's practical range (C2-C#6, MIDI 36-85) — Tone.Sampler
// pitch-shifts any requested note to the nearest anchor rather than requiring a recording of
// every semitone. See public/audio/clean-electric-guitar/SOURCE.md for the full provenance.
const SAMPLE_URLS: Record<string, string> = {
    C2: 'C2.mp3', F2: 'F2.mp3', A2: 'A2.mp3', C3: 'C3.mp3', E3: 'E3.mp3',
    G3: 'G3.mp3', B3: 'B3.mp3', E4: 'E4.mp3', G4: 'G4.mp3', B4: 'B4.mp3',
    D5: 'D5.mp3', 'G#5': 'Gs5.mp3', 'C#6': 'Cs6.mp3',
};

// The recordings peak close to 0 dBFS individually; trim before summing up to six strings at
// once, then a transparent limiter catches the rare case where several attacks coincide.
const SAMPLER_VOLUME_DB = -14;
const LIMITER_THRESHOLD_DB = -1;

class AudioEngine {
    private samples: Record<string, AudioBuffer> | null = null;
    private limiter: Tone.Limiter | null = null;
    private sampler: Tone.Sampler | null = null;
    private starting: Promise<void> | null = null;

    /** Must be called after the first user interaction (browser AudioContext policy).
     *  Lazily loads samples on first call only; concurrent callers
     *  await the same in-flight load rather than triggering duplicate fetches. */
    async start(): Promise<void> {
        if (this.isReady) return;
        if (!this.starting) {
            this.starting = (async () => {
                await Tone.start();
                const samples = await Promise.all(Object.entries(SAMPLE_URLS).map(async ([note, file]) =>
                    [note, await Tone.ToneAudioBuffer.load(SAMPLE_BASE_URL + file)] as const));
                this.limiter = new Tone.Limiter(LIMITER_THRESHOLD_DB).toDestination();
                this.samples = Object.fromEntries(samples);
            })();
        }
        try {
            await this.starting;
        } finally {
            this.starting = null;
        }
    }

    /**
     * Plays an array of Tone.js pitch strings with a guitar strum effect.
     * Notes are triggered sequentially at 30 ms intervals (low → high).
     */
    playChord(notes: string[]): (() => void) | undefined {
        if (!this.samples || !this.limiter) return;
        this.sampler?.dispose();
        const sampler = new Tone.Sampler({ urls: this.samples, volume: SAMPLER_VOLUME_DB }).connect(this.limiter);
        this.sampler = sampler;
        const stop = () => {
            if (this.sampler !== sampler) return;
            // Disposing this output silences even picks already queued in Web Audio.
            sampler.dispose();
            this.sampler = null;
        };
        try {
            const start = Tone.now();
            notes.forEach((note, index) => sampler.triggerAttackRelease(note, '2n', start + index * 0.03));
        } catch (error) {
            stop();
            throw error;
        }
        return stop;
    }

    get isReady(): boolean {
        return this.samples !== null;
    }
}

// Export singleton instance — shared across the entire app
export const audioEngine = new AudioEngine();
