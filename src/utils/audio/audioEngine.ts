/**
 * audioEngine.ts
 * Singleton audio engine powered by Tone.js.
 * Manages a single shared Sampler playing FreePats "Clean Electric Guitar" recordings
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
    private sampler: Tone.Sampler | null = null;
    private starting: Promise<void> | null = null;
    private initialized = false;

    /** Must be called after the first user interaction (browser AudioContext policy).
     *  Lazily creates the sampler and loads samples on first call only; concurrent callers
     *  await the same in-flight load rather than triggering duplicate fetches. */
    async start(): Promise<void> {
        if (this.initialized) return;
        if (!this.starting) {
            this.starting = (async () => {
                await Tone.start();
                const limiter = new Tone.Limiter(LIMITER_THRESHOLD_DB).toDestination();
                this.sampler = new Tone.Sampler({
                    urls: SAMPLE_URLS,
                    baseUrl: SAMPLE_BASE_URL,
                    volume: SAMPLER_VOLUME_DB,
                }).connect(limiter);
                await Tone.loaded();
                this.initialized = true;
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
    playChord(notes: string[]): void {
        if (!this.sampler) return;

        // Cleanly release any currently held notes
        this.sampler.releaseAll(Tone.now());

        const STRUM_INTERVAL = 0.03; // seconds between each string pick
        notes.forEach((note, index) => {
            const triggerTime = Tone.now() + index * STRUM_INTERVAL;
            // '2n' = half note duration — lets the natural decay shape the sound
            this.sampler!.triggerAttackRelease(note, '2n', triggerTime);
        });
    }

    get isReady(): boolean {
        return this.initialized;
    }
}

// Export singleton instance — shared across the entire app
export const audioEngine = new AudioEngine();
