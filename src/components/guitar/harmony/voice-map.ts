import { exampleTransitions } from '@/domain/harmony/connections';
import type { RelationExample } from '@/domain/harmony/types';

export interface MapEdge { from: number; to: number; fromDegree: string; toDegree: string; held: boolean; guide: boolean }
/** Presentation correspondence only, not a new interpretation or voicing optimizer. */
export function voiceMap(example: RelationExample, pitchOrder?: number[]) {
    const edges: MapEdge[] = exampleTransitions(example).flatMap(edge => edge.voices.map(voice => ({
        from: edge.fromStep, to: edge.toStep, fromDegree: voice.fromDegree, toDegree: voice.toDegree,
        held: example.steps[edge.fromStep].chord.tones.find(t => t.degree === voice.fromDegree)!.pitchClass === example.steps[edge.toStep].chord.tones.find(t => t.degree === voice.toDegree)!.pitchClass, guide: true,
    })));
    for (let i = 1; i < example.steps.length; i++) {
        const before = example.steps[i - 1].chord.tones, after = example.steps[i].chord.tones;
        for (const tone of before) {
            const same = after.find(t => t.pitchClass === tone.pitchClass);
            if (same && !edges.some(e => e.from === i - 1 && e.fromDegree === tone.degree && e.toDegree === same.degree))
                edges.push({ from: i - 1, to: i, fromDegree: tone.degree, toDegree: same.degree, held: true, guide: false });
        }
        if (example.kind === 'comparison') {
            const unusedBefore = before.filter(t => !edges.some(e => e.from === i - 1 && e.fromDegree === t.degree));
            const unusedAfter = after.filter(t => !edges.some(e => e.to === i && e.toDegree === t.degree));
            const near = (a: number, b: number) => [1, 11].includes((b - a + 12) % 12);
            for (const tone of unusedBefore) {
                const candidates = unusedAfter.filter(t => near(tone.pitchClass, t.pitchClass));
                if (candidates.length === 1 && unusedBefore.filter(t => near(t.pitchClass, candidates[0].pitchClass)).length === 1)
                    edges.push({ from: i - 1, to: i, fromDegree: tone.degree, toDegree: candidates[0].degree, held: false, guide: false });
            }
        }
    }
    const lanes: Map<string, number>[] = example.steps.map(() => new Map());
    const guides = new Set(edges.filter(e => e.from === 0 && e.guide).map(e => e.fromDegree));
    const rank = (pitch: number) => { const index = pitchOrder?.indexOf(pitch) ?? -1; return index < 0 ? 99 : index; };
    [...example.steps[0].chord.tones].sort((a, b) => pitchOrder ? rank(a.pitchClass) - rank(b.pitchClass) : Number(guides.has(b.degree)) - Number(guides.has(a.degree))).forEach((tone, lane) => lanes[0].set(tone.degree, lane));
    for (let i = 1; i < example.steps.length; i++) {
        const incoming = edges.filter(e => e.to === i).sort((a, b) => Number(b.held) - Number(a.held) || Number(b.guide) - Number(a.guide));
        for (const edge of incoming) {
            const lane = lanes[i - 1].get(edge.fromDegree)!;
            if (!lanes[i].has(edge.toDegree) && ![...lanes[i].values()].includes(lane)) lanes[i].set(edge.toDegree, lane);
        }
        for (const tone of example.steps[i].chord.tones) {
            if (lanes[i].has(tone.degree)) continue;
            let lane = 0;
            while ([...lanes[i].values()].includes(lane)) lane++;
            lanes[i].set(tone.degree, lane);
        }
    }
    return { edges, lanes, rows: Math.max(...lanes.flatMap(lane => [...lane.values()])) + 1 };
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
