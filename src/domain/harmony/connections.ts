import { note } from './roman';
import type { HarmonyTone, RelationExample, RelationStep, RelationTransition } from './types';

/** A display alias must not change the canonical chord or sounding pitch. */
export function toneLabel(step: RelationStep, degree: string): HarmonyTone {
    const tone = step.chord.tones.find(item => item.degree === degree);
    if (!tone) throw new Error(`Tone ${degree} is absent from ${step.chord.name}`);
    const alias = step.toneLabels?.[degree];
    if (!alias) return tone;
    if (note(alias.name).pitchClass !== tone.pitchClass) throw new Error('Analysis spelling changes the sounding pitch');
    return { ...tone, ...alias };
}

/** Compatibility for old examples only. New rules should declare their own edges. */
export function exampleTransitions(example: RelationExample): RelationTransition[] {
    const transitions = example.transitions ?? (example.kind === 'comparison' ? [] : example.steps.slice(1).map((step, index) => ({
        fromStep: index, toStep: index + 1,
        voices: example.steps[index].guides.flatMap((degree, voice) => step.guides[voice] ? [{
            fromDegree: degree, toDegree: step.guides[voice], kind: 'approach' as const,
        }] : []),
    })));
    const edges = new Set<number>();
    for (const edge of transitions) {
        if (!Number.isInteger(edge.fromStep) || edge.fromStep < 0 || edge.toStep !== edge.fromStep + 1 || !example.steps[edge.toStep] || edges.has(edge.fromStep)) {
            throw new Error('Invalid or duplicate adjacent tone connection');
        }
        edges.add(edge.fromStep);
        for (const voice of edge.voices) {
            const from = toneLabel(example.steps[edge.fromStep], voice.fromDegree);
            const to = toneLabel(example.steps[edge.toStep], voice.toDegree);
            if (voice.kind === 'held' && from.pitchClass !== to.pitchClass) throw new Error('A held tone must retain its pitch class');
        }
    }
    return transitions;
}
