import { exampleTransitions } from '@/domain/harmony/connections';
import type { RelationExample, ToneConnection } from '@/domain/harmony/types';

export interface MapEdge { from: number; to: number; fromDegree: string; toDegree: string; held: boolean; guide: boolean; kind: ToneConnection['kind'] | 'compare' }
/** Presentation only. Motion edges are exactly the domain transitions; comparisons show shared/changed tones. */
export function voiceMap(example: RelationExample, align?: VoiceLayout) {
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
    return { edges, ...layoutLanes(example, edges, align) };
}

/** `pitches`: illustrative register per tone, the order the lanes follow. */
export interface VoiceLayout { lanes: Map<string, number>[]; pitchRows: Map<number, number>[]; pitches: Map<string, number>[]; rows: number }
const pc = (value: number) => ((value % 12) + 12) % 12;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
/** Close root position above an absolute root, so every placement shares one pitch frame. */
const closeRoot = (root: number, pitchClass: number) => 60 + root + pc(pitchClass - root);

/**
 * Pitch-ordered lanes, highest on top, one row per connected line so held and moving
 * voices stay straight. Register is illustrative: the destination sits in close root
 * position and earlier chords follow the drawn edges; unconnected tones sit nearest the
 * chord's placed tones. An aligned diagram reuses the reference rows by pitch class.
 */
function layoutLanes(example: RelationExample, edges: MapEdge[], align?: VoiceLayout): VoiceLayout {
    const steps = example.steps, last = steps.length - 1;
    const pitch = steps.map(() => new Map<string, number>());
    const tone = (step: number, degree: string) => steps[step].chord.tones.find(t => t.degree === degree)!;
    for (const t of steps[last].chord.tones) pitch[last].set(t.degree, closeRoot(steps[last].chord.rootPitchClass, t.pitchClass));
    for (let i = last - 1; i >= 0; i--) {
        const chord = steps[i].chord;
        for (const t of chord.tones) {
            const edge = edges.find(e => e.from === i && e.fromDegree === t.degree);
            if (!edge) continue;
            const offset = pc(t.pitchClass - tone(i + 1, edge.toDegree).pitchClass);
            pitch[i].set(t.degree, pitch[i + 1].get(edge.toDegree)! + (offset > 6 ? offset - 12 : offset));
        }
        const placed = [...pitch[i].values()];
        for (const t of chord.tones) {
            if (pitch[i].has(t.degree)) continue;
            if (!placed.length) { pitch[i].set(t.degree, closeRoot(chord.rootPitchClass, t.pitchClass)); continue; }
            const centre = mean(placed);
            pitch[i].set(t.degree, t.pitchClass + 12 * Math.round((centre - t.pitchClass) / 12));
        }
    }
    // Lines: held edges first, then guide, then other moves; never two tones of one chord in a line.
    const lineOf = new Map<string, number>(), lines: { step: number; degree: string }[][] = [];
    steps.forEach((step, i) => step.chord.tones.forEach(t => { lineOf.set(`${i}:${t.degree}`, lines.length); lines.push([{ step: i, degree: t.degree }]); }));
    for (const edge of [...edges].sort((a, b) => Number(b.held) - Number(a.held) || Number(b.guide) - Number(a.guide))) {
        const a = lineOf.get(`${edge.from}:${edge.fromDegree}`)!, b = lineOf.get(`${edge.to}:${edge.toDegree}`)!;
        if (a === b || lines[b].some(m => lines[a].some(n => n.step === m.step))) continue;
        for (const member of lines[b]) lineOf.set(`${member.step}:${member.degree}`, a);
        lines[a].push(...lines[b]); lines[b] = [];
    }
    const live = lines.filter(line => line.length);
    const at = (line: typeof live[number], step: number) => { const member = line.find(m => m.step === step); return member && pitch[step].get(member.degree)!; };
    const average = live.map(line => mean(line.map(m => pitch[m.step].get(m.degree)!)));
    // Higher-before-lower wherever two lines share a chord; average pitch breaks ties and cycles.
    const above = (x: number, y: number) => steps.some((_, step) => { const px = at(live[x], step), py = at(live[y], step); return px !== undefined && py !== undefined && px > py; });
    const order: number[] = [], rest = new Set(live.map((_, index) => index));
    while (rest.size) {
        const pool = [...rest], ready = pool.filter(x => !pool.some(y => y !== x && above(y, x)));
        const next = (ready.length ? ready : pool).sort((x, y) => average[y] - average[x])[0];
        order.push(next); rest.delete(next);
    }
    const row = new Map<number, number>();
    if (!align) order.forEach((line, index) => row.set(line, index));
    else {
        for (const line of order) {
            const match = live[line].map(m => align.pitchRows[m.step]?.get(tone(m.step, m.degree).pitchClass)).find(value => value !== undefined);
            const taken = (candidate: number) => [...row].some(([other, r]) => r === candidate && live[other].some(m => live[line].some(n => n.step === m.step)));
            if (match !== undefined && !taken(match)) row.set(line, match);
        }
        let rows = Math.max(align.rows, ...row.values(), -1) + 1;
        for (const line of order.filter(line => !row.has(line))) {
            const fits = (candidate: number) => !([...row].some(([other, r]) => r === candidate && live[other].some(m => live[line].some(n => n.step === m.step))))
                && live[line].every(m => [...row].every(([other, r]) => { const theirs = at(live[other], m.step); const mine = pitch[m.step].get(m.degree)!; return theirs === undefined || (r < candidate ? theirs > mine : theirs < mine); }));
            const candidate = [...Array(rows).keys()].find(fits);
            row.set(line, candidate ?? rows++);
        }
    }
    const lanes = steps.map(() => new Map<string, number>()), pitchRows = steps.map(() => new Map<number, number>());
    live.forEach((line, index) => line.forEach(m => { lanes[m.step].set(m.degree, row.get(index)!); pitchRows[m.step].set(tone(m.step, m.degree).pitchClass, row.get(index)!); }));
    return { lanes, pitchRows, pitches: pitch, rows: Math.max(...row.values()) + 1 };
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
