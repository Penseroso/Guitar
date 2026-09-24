import { midiNoteLabel } from '@/domain/chord/engine/presentation';
import { degreeNumber } from './roman';
import type { RelationExample, ResolvedHarmonyChord } from './types';
import { auditionLines, toneLabel } from './connections';

const pc = (value: number) => ((value % 12) + 12) % 12;

/**
 * Canonical audition register: one deterministic pitch per formula tone. Root at 48+root;
 * simple degrees (≤7) stack within the octave above it; compound degrees (9/11/13, ♭9, ♯9…)
 * sit an octave higher, taken from the degree number because registry extension intervals
 * are pitch classes (maj9's 9th is stored as 2). A formula slash bass leaves the stack and
 * sounds once, just below the rest. This is a canonical audition, not an inversion voicing
 * and not a performed or guitar voicing.
 */
export function canonicalPitches(chord: ResolvedHarmonyChord): Map<string, number> {
    const root = 48 + chord.rootPitchClass;
    const stack = new Map(chord.tones.map(tone => [tone.degree, root + pc(tone.pitchClass - chord.rootPitchClass) + (degreeNumber(tone.degree) >= 8 ? 12 : 0)] as const));
    const bass = chord.tones.find(tone => tone.pitchClass === chord.bassPitchClass)!;
    if (bass.pitchClass === chord.rootPitchClass) return stack;
    stack.delete(bass.degree);
    const lowest = Math.min(...stack.values());
    stack.set(bass.degree, lowest - (pc(lowest - bass.pitchClass) || 12));
    return stack;
}

/**
 * Play relation: each chord's canonical audition. Lines (motion only): the same validated
 * transitions the diagram draws; a line starts at its chord's canonical pitch and each edge
 * moves to the nearest octave so the connection's direction is audible. Neither is a
 * performed voicing or an optimal voice leading. Comparisons have no line playback: they
 * are not progressions, and index-paired audio would invent a correspondence.
 */
export function buildAudition(example: RelationExample, linesOnly = false): { midi: number[]; durationMs: number }[] {
    if (!linesOnly) return example.steps.map(step => ({ midi: [...canonicalPitches(step.chord).values()].sort((a, b) => a - b), durationMs: 1050 }));
    return linePitches(example).map(voices => ({ midi: [...new Set(voices.values())].sort((a, b) => a - b), durationMs: 1050 }));
}

/** Per-step, per-degree line pitches: canonical seed, nearest octave along each validated edge. */
export function linePitches(example: RelationExample): Map<string, number>[] {
    if (example.kind !== 'motion') throw new Error('Line playback is defined only for motion examples');
    const { transitions } = auditionLines(example);
    const pitches = example.steps.map(() => new Map<string, number>());
    const nearest = (pitchClass: number, from: number) => from + (pc(pitchClass - from) > 6 ? pc(pitchClass - from) - 12 : pc(pitchClass - from));
    // A middle chord may receive and depart with different voices; keyed by formula degree.
    for (let index = 0; index < example.steps.length; index++) {
        const canonical = canonicalPitches(example.steps[index].chord);
        for (const edge of transitions.filter(item => item.fromStep === index)) {
            for (const voice of edge.voices) {
                const to = toneLabel(example.steps[edge.toStep], voice.toDegree);
                const start = pitches[index].get(voice.fromDegree) ?? canonical.get(voice.fromDegree)!;
                pitches[index].set(voice.fromDegree, start);
                if (!pitches[edge.toStep].has(voice.toDegree)) pitches[edge.toStep].set(voice.toDegree, nearest(to.pitchClass, start));
            }
        }
    }
    return pitches;
}
export interface HarmonyPlaybackState { playing: boolean; error: string | null; step: number | null }
interface Engine { start(): Promise<void>; playChord(notes: string[]): void }
export function createHarmonyPlayback(loadEngine: () => Promise<Engine>, onState: (state: HarmonyPlaybackState) => void) {
    let revision = 0, timer: ReturnType<typeof setTimeout> | undefined, finish: (() => void) | undefined;
    const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; finish?.(); finish = undefined; };
    return {
        cancel() { revision++; clear(); onState({ playing: false, error: null, step: null }); },
        async play(example: RelationExample, linesOnly = false) {
            const token = ++revision;
            clear(); onState({ playing: true, error: null, step: null });
            try {
                const frames = buildAudition(example, linesOnly);
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
