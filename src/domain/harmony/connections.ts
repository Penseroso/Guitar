import { note, pc } from './roman';
import type { ConnectionBasis, HarmonyTone, RelationExample, RelationStep, RelationTransition, ResolvedHarmonyChord, ToneConnection } from './types';

/** A display alias must not change the canonical chord or sounding pitch. */
export function toneLabel(step: RelationStep, degree: string): HarmonyTone {
    const tone = step.chord.tones.find(item => item.degree === degree);
    if (!tone) throw new Error(`Tone ${degree} is absent from ${step.chord.name}`);
    const alias = step.toneLabels?.[degree];
    if (!alias) return tone;
    if (note(alias.name).pitchClass !== tone.pitchClass) throw new Error('Analysis spelling changes the sounding pitch');
    return { ...tone, ...alias };
}

const THIRDS = ['3', 'b3'], SEVENTHS = ['7', 'b7', 'bb7'];
const distance = (a: number, b: number) => Math.min(pc(b - a), pc(a - b));
/** Guide-tone vocabulary names a seventh chord's 3rd/7th, never a bare triad's. */
const isSeventhChord = (chord: ResolvedHarmonyChord) => chord.tones.some(t => THIRDS.includes(t.degree)) && chord.tones.some(t => SEVENTHS.includes(t.degree));
const edge = (from: HarmonyTone, to: HarmonyTone, guide = false, moving: ToneConnection['kind'] = 'resolution'): ToneConnection => ({
    fromDegree: from.degree, toDegree: to.degree, kind: from.pitchClass === to.pitchClass ? 'held' : moving, ...(guide ? { guide } : {}),
});

/** Pairs that every minimum-motion one-to-one mapping (each move within a step) agrees on; ties stay unlinked. */
function agreedMoves(sources: HarmonyTone[], targets: HarmonyTone[]): [HarmonyTone, HarmonyTone][] {
    let best = Infinity, solutions: [HarmonyTone, HarmonyTone][][] = [];
    const walk = (index: number, used: Set<string>, pairs: [HarmonyTone, HarmonyTone][], cost: number) => {
        if (cost > best) return;
        if (index === sources.length) {
            if (cost < best) { best = cost; solutions = []; }
            solutions.push([...pairs]);
            return;
        }
        for (const target of targets) {
            const step = distance(sources[index].pitchClass, target.pitchClass);
            if (used.has(target.degree) || step > 2) continue;
            used.add(target.degree); pairs.push([sources[index], target]);
            walk(index + 1, used, pairs, cost + step);
            pairs.pop(); used.delete(target.degree);
        }
    };
    walk(0, new Set(), [], 0);
    return (solutions[0] ?? []).filter(([s, t]) => solutions.every(solution => solution.some(([a, b]) => a === s && b === t)));
}

/**
 * Tendency-tone rules with a direction fixed by common-practice/jazz theory:
 * common tones hold; the leading tone rises to the destination root; a chordal
 * 7th and the leading tone's tritone partner fall by step. Any other tone (e.g.
 * vii°7's 3rd, whose motion depends on doubling) is left unconnected.
 */
function tendencies(from: ResolvedHarmonyChord, to: ResolvedHarmonyChord): ToneConnection[] {
    const root = to.tones.find(t => t.degree === '1')!;
    const leading = from.tones.find(t => pc(root.pitchClass - t.pitchClass) === 1);
    const fall = (tone: HarmonyTone) => to.tones.map(target => ({ target, size: pc(tone.pitchClass - target.pitchClass) }))
        .filter(item => item.size === 1 || item.size === 2).sort((a, b) => a.size - b.size)[0]?.target;
    const motion = pc(to.rootPitchClass - from.rootPitchClass);
    const dominant = from.tones.some(t => t.degree === '3') && from.tones.some(t => t.degree === 'b7');
    // Guide tones: 3rd/7th lines in descending-fifth motion or a tritone-substitute dominant.
    const guideMotion = isSeventhChord(from) && (motion === 5 || (motion === 11 && dominant));
    return from.tones.flatMap(tone => {
        const guide = guideMotion && [...THIRDS, ...SEVENTHS].includes(tone.degree);
        const same = to.tones.find(t => t.pitchClass === tone.pitchClass);
        if (same) return [edge(tone, same, guide)];
        if (tone === leading) return [edge(tone, root, guide)];
        const partner = leading && distance(tone.pitchClass, leading.pitchClass) === 6;
        const target = (SEVENTHS.includes(tone.degree) && isSeventhChord(from)) || partner ? fall(tone) : undefined;
        return target ? [edge(tone, target, guide)] : [];
    });
}

/**
 * Adds the held edge for every still-unconnected source whose pitch class the destination
 * also contains, so curated rules never silently drop a common tone. The destination may
 * already receive a resolution: sources never fork, but several may converge on one tone.
 */
export function completeCommonTones(from: ResolvedHarmonyChord, to: ResolvedHarmonyChord, voices: ToneConnection[]): ToneConnection[] {
    return [...voices, ...from.tones.flatMap(tone => {
        const same = to.tones.find(t => t.pitchClass === tone.pitchClass);
        return same && !voices.some(v => v.fromDegree === tone.degree) ? [edge(tone, same)] : [];
    })];
}

/** Theory-derived correspondence between adjacent chords. A source never forks. */
export function connectChords(from: ResolvedHarmonyChord, to: ResolvedHarmonyChord, mode: 'functional' | 'nearest' = 'functional'): { basis: ConnectionBasis; voices: ToneConnection[] } {
    if (mode === 'nearest') return { basis: 'nearest', voices: agreedMoves(from.tones, to.tones).map(([a, b]) => edge(a, b, false, 'approach')) };
    const voices = tendencies(from, to);
    return { basis: voices.some(v => v.guide) ? 'guide-tone' : 'tendency', voices };
}

/** Every motion example declares its edges; nothing is paired by array position. */
export function exampleTransitions(example: RelationExample): RelationTransition[] {
    if (example.kind === 'motion' && !example.transitions) throw new Error('Motion example needs explicit tone connections');
    const transitions = example.transitions ?? [];
    const edges = new Set<number>();
    for (const edge of transitions) {
        if (!Number.isInteger(edge.fromStep) || edge.fromStep < 0 || edge.toStep !== edge.fromStep + 1 || !example.steps[edge.toStep] || edges.has(edge.fromStep)) {
            throw new Error('Invalid or duplicate adjacent tone connection');
        }
        edges.add(edge.fromStep);
        const sources = new Set<string>();
        for (const voice of edge.voices) {
            const fromStep = example.steps[edge.fromStep];
            const from = toneLabel(fromStep, voice.fromDegree);
            const to = toneLabel(example.steps[edge.toStep], voice.toDegree);
            if (sources.has(voice.fromDegree)) throw new Error('A source tone may have only one connection');
            sources.add(voice.fromDegree);
            if ((voice.kind === 'held') !== (from.pitchClass === to.pitchClass)) throw new Error('A held tone must retain its pitch class, and only a retained pitch is held');
            if (voice.guide && !(isSeventhChord(fromStep.chord) && [...THIRDS, ...SEVENTHS].includes(voice.fromDegree))) throw new Error('A guide tone must be the 3rd or 7th of a seventh chord');
        }
    }
    return transitions;
}

/** The lines "Hear guide/voice lines" plays: guide lines only when every step has them. */
export function auditionLines(example: RelationExample) {
    const transitions = exampleTransitions(example);
    const guide = transitions.length > 0 && transitions.every(t => t.voices.some(v => v.guide));
    return { guide, transitions: guide ? transitions.map(t => ({ ...t, voices: t.voices.filter(v => v.guide) })) : transitions };
}
