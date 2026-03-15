/**
 * audioEngine.ts
 * Singleton audio engine powered by Tone.js.
 * Manages a single shared PolySynth tuned to approximate a strummed guitar.
 */

import * as Tone from 'tone';

// Guitar-inspired synth options — short attack, long decay/release.
const GUITAR_VOICE_OPTIONS = {
    oscillator: { type: 'triangle' as const },
    envelope: {
        attack: 0.01,
        decay: 1.2,
        sustain: 0.2,
        release: 1.5,
    },
};

class AudioEngine {
    private synth: Tone.PolySynth<Tone.Synth> | null = null;
    private initialized = false;

    /** Must be called after the first user interaction (browser AudioContext policy). */
    async start(): Promise<void> {
        if (this.initialized) return;

        await Tone.start();

        // new PolySynth(VoiceClass, voiceOptions)
        this.synth = new Tone.PolySynth(Tone.Synth, GUITAR_VOICE_OPTIONS).toDestination();
        this.synth.set({ volume: -6 }); // Gentle default level

        this.initialized = true;
    }

    /**
     * Plays an array of Tone.js pitch strings with a guitar strum effect.
     * Notes are triggered sequentially at 30 ms intervals (low → high).
     */
    playChord(notes: string[]): void {
        if (!this.synth) return;

        // Cleanly release any currently held notes
        this.synth.releaseAll(Tone.now());

        const STRUM_INTERVAL = 0.03; // seconds between each string pick
        notes.forEach((note, index) => {
            const triggerTime = Tone.now() + index * STRUM_INTERVAL;
            // '2n' = half note duration — lets the natural decay shape the sound
            this.synth!.triggerAttackRelease(note, '2n', triggerTime);
        });
    }

    get isReady(): boolean {
        return this.initialized;
    }
}

// Export singleton instance — shared across the entire app
export const audioEngine = new AudioEngine();
