import { midiNoteLabel } from '@/domain/chord/engine/presentation';
import type { RelationExample } from './types';
import { auditionLines, toneLabel } from './connections';

/** Fixed register demonstration, not a guitar fingering or voice-leading optimizer.
 * Lines come from the same validated transitions the diagram draws, never guessed here. */
export function buildAudition(example: RelationExample, guidesOnly = false): { midi: number[]; durationMs: number }[] {
    if (guidesOnly && example.kind === 'motion') {
        const { transitions } = auditionLines(example);
        const pitches = example.steps.map(() => new Map<string, number>());
        const nearest = (pitchClass: number, from: number) => {
            let pitch = 60 + pitchClass;
            while (pitch - from > 6) pitch -= 12;
            while (from - pitch > 6) pitch += 12;
            return pitch;
        };
        // A middle chord may receive and depart with different voices. Keep both
        // sets, keyed by formula degree, instead of pairing arbitrary array slots.
        for (let index = 0; index < example.steps.length; index++) {
            for (const edge of transitions.filter(item => item.fromStep === index)) {
                for (const voice of edge.voices) {
                    const from = toneLabel(example.steps[index], voice.fromDegree);
                    const to = toneLabel(example.steps[edge.toStep], voice.toDegree);
                    const start = pitches[index].get(voice.fromDegree) ?? 60 + from.pitchClass;
                    pitches[index].set(voice.fromDegree, start);
                    if (!pitches[edge.toStep].has(voice.toDegree)) pitches[edge.toStep].set(voice.toDegree, nearest(to.pitchClass, start));
                }
            }
        }
        return pitches.map(voices => ({ midi: [...new Set(voices.values())].sort((a, b) => a - b), durationMs: 1050 }));
    }
    let prior: number[] = [];
    return example.steps.map(step => {
        const tones = guidesOnly ? step.guides.map(degree => {
            const tone = step.chord.tones.find(t => t.degree === degree);
            if (!tone) throw new Error(`Guide ${degree} is absent from ${step.chord.name}`);
            return tone;
        }) : step.chord.tones;
        const midi = tones.map((tone, i) => {
            let pitch = 60 + tone.pitchClass;
            if (guidesOnly && prior[i] !== undefined) {
                while (pitch - prior[i] > 6) pitch -= 12;
                while (prior[i] - pitch > 6) pitch += 12;
            }
            return pitch;
        });
        if (!guidesOnly) {
            // Absolute pitch classes: never add the chord root a second time.
            midi.unshift(48 + step.chord.bassPitchClass);
        }
        prior = midi;
        return { midi: [...midi].sort((a, b) => a - b), durationMs: 1050 };
    });
}
export interface HarmonyPlaybackState { playing: boolean; error: string | null; step: number | null }
interface Engine { start(): Promise<void>; playChord(notes: string[]): void }
export function createHarmonyPlayback(loadEngine: () => Promise<Engine>, onState: (state: HarmonyPlaybackState) => void) {
    let revision = 0, timer: ReturnType<typeof setTimeout> | undefined, finish: (() => void) | undefined;
    const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; finish?.(); finish = undefined; };
    return {
        cancel() { revision++; clear(); onState({ playing: false, error: null, step: null }); },
        async play(example: RelationExample, guidesOnly = false) {
            const token = ++revision;
            clear(); onState({ playing: true, error: null, step: null });
            try {
                const frames = buildAudition(example, guidesOnly);
                const engine = await loadEngine();
                if (token !== revision) return;
                await engine.start();
                for (let i = 0; i < frames.length; i++) {
                    if (token !== revision) return;
                    onState({ playing: true, error: null, step: i });
                    if (frames[i].midi.length) engine.playChord(frames[i].midi.map(midiNoteLabel));
                    await new Promise<void>(resolve => { finish = resolve; timer = setTimeout(() => { finish = undefined; timer = undefined; resolve(); }, frames[i].durationMs); });
                }
                if (token === revision) onState({ playing: false, error: null, step: null });
            } catch {
                if (token === revision) onState({ playing: false, error: 'Audio could not start. Select Play to retry.', step: null });
            }
        },
    };
}
