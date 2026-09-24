import { exampleTransitions } from '@/domain/harmony/connections';
import { degreeNumber } from '@/domain/harmony/roman';
import type { RelationExample, ToneConnection } from '@/domain/harmony/types';

export interface MapEdge { from: number; to: number; fromDegree: string; toDegree: string; held: boolean; guide: boolean; kind: ToneConnection['kind'] | 'compare' }
/** Presentation only. Motion edges are exactly the domain transitions; comparisons show shared/changed tones. */
export function voiceMap(example: RelationExample) {
    const edges: MapEdge[] = exampleTransitions(example).flatMap(edge => edge.voices.map(voice => ({
        from: edge.fromStep, to: edge.toStep, fromDegree: voice.fromDegree, toDegree: voice.toDegree,
        held: voice.kind === 'held', guide: voice.guide === true, kind: voice.kind,
    })));
    for (let i = 1; example.kind === 'comparison' && i < example.steps.length; i++) {
        const before = example.steps[i - 1].chord.tones, after = example.steps[i].chord.tones;
        for (const tone of before) {
            const same = after.find(t => t.pitchClass === tone.pitchClass);
            if (same) edges.push({ from: i - 1, to: i, fromDegree: tone.degree, toDegree: same.degree, held: true, guide: false, kind: 'held' });
        }
        const unusedBefore = before.filter(t => !edges.some(e => e.from === i - 1 && e.fromDegree === t.degree));
        const unusedAfter = after.filter(t => !edges.some(e => e.to === i && e.toDegree === t.degree));
        const near = (a: number, b: number) => [1, 11].includes((b - a + 12) % 12);
        for (const tone of unusedBefore) {
            const candidates = unusedAfter.filter(t => near(tone.pitchClass, t.pitchClass));
            if (candidates.length === 1 && unusedBefore.filter(t => near(t.pitchClass, candidates[0].pitchClass)).length === 1)
                edges.push({ from: i - 1, to: i, fromDegree: tone.degree, toDegree: candidates[0].degree, held: false, guide: false, kind: 'compare' });
        }
    }
    return { edges, ...roleLanes(example) };
}

/**
 * Role lanes: every chord stacks its own formula roles (root, 3rd, 5th, 7th, extensions)
 * with the root on the bottom row. Rows are harmonic roles, not pitch or register, and a
 * tone never moves to straighten a line, so a line's slope is not melodic direction.
 */
function roleLanes(example: RelationExample) {
    const rows = Math.max(...example.steps.map(step => step.chord.tones.length));
    const lanes = example.steps.map(step => new Map([...step.chord.tones]
        .sort((a, b) => degreeNumber(a.degree) - degreeNumber(b.degree))
        .map((tone, index) => [tone.degree, rows - 1 - index] as const)));
    return { lanes, rows };
}

/** Pitch direction of one connection, shown in selection detail instead of by line slope. */
export function motionLabel(fromPitchClass: number, toPitchClass: number) {
    const up = ((toPitchClass - fromPitchClass) % 12 + 12) % 12, signed = up > 6 ? up - 12 : up;
    if (signed === 0) return 'Common tone';
    const size = Math.abs(signed), direction = signed > 0 ? 'up' : 'down';
    return `${size === 1 ? '½ step' : size === 2 ? 'whole step' : `${size} semitones`} ${direction}`;
}

/** Spelled direction, rather than a pitch-class distance disguised as an interval. */
export function rootMotionLabel(from: string, to: string, semitones: number) {
    if (from === to) return 'Same root';
    const letters = 'CDEFGAB';
    const up = (letters.indexOf(to[0]) - letters.indexOf(from[0]) + 7) % 7;
    const down = (7 - up) % 7;
    const quality = (degree: number, distance: number) => {
        const delta = distance - [0, 2, 4, 5, 7, 9, 11][degree], perfect = [0, 3, 4].includes(degree);
        return delta === 0 ? perfect ? 'P' : 'M' : delta === -1 && !perfect ? 'm' : delta > 0 ? 'A'.repeat(delta) : 'd'.repeat(-delta - (perfect ? 0 : 1));
    };
    if (up === 3 && semitones === 5) return 'P5 down / P4 up';
    if (semitones === 0) return 'Same pitch, respelled root';
    return semitones <= 6 ? `${quality(up, semitones)}${up + 1} up` : `${quality(down, 12 - semitones)}${down + 1} down`;
}
