import type { Frets } from './protocol';

export interface NotatedNote { string: number; fret: number; type: number; ring: boolean; ghost: boolean }
export interface NotatedBeat { instrument: string; tick: number; duration: number; rest: boolean; notes: NotatedNote[] }
export interface Frame {
    instrument: string; tick: number; duration: number; rest: boolean; attack: Frets; explicitSounding: Frets;
    hasTie: boolean; sustainUncertain: boolean; invalid: boolean;
}
const supported = [3, 5, 6, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 48, 60, 72, 80, 90, 96, 120, 144, 160, 180, 192, 240, 288, 320, 360, 384, 480, 576, 640, 720, 768, 960, 1152, 1280, 1440, 1536, 1920, 2304, 2560, 2880, 3072, 3840, 5760];
function duration(time: number): number {
    const value = 2 ** -Math.trunc(Math.log2(time / 3840));
    if (value < 1) return supported.at(-1)!;
    let numerator = time * value, denominator = 3840;
    while (!Number.isInteger(numerator)) { numerator *= 2; denominator *= 2; }
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    const divisor = gcd(numerator, denominator); numerator /= divisor; denominator /= divisor;
    if (numerator === 3) {
        const base = Math.trunc(3840 / (value * Math.trunc(Math.log2(denominator))));
        return base + Math.trunc(base / 2);
    }
    if (['1/1', '2/3', '4/5', '4/6', '4/7', '8/9', '8/10', '8/11', '8/12', '8/13'].includes(`${numerator}/${denominator}`)) return Math.trunc(Math.trunc(3840 / value) * numerator / denominator);
    const nearest = supported.reduce((best, next) => Math.abs(next - time) < Math.abs(best - time) ? next : best);
    if (nearest === time) throw Error('Unsupported reference duration');
    return duration(nearest);
}

/** Notation only: a let-ring flag does not establish an acoustic release time. */
export function parseNotation(text: string): NotatedBeat[] {
    type RawNote = { token: string; effects: string[] };
    type Measure = { tick: number; beats: Map<string, Map<number, RawNote[]>> };
    const tokens = text.replace(/\r\n?/g, '\n').split('\n');
    if (tokens[1] !== 'downtune:0') return [];
    const excluded = new Set<string>();
    const present = new Set<string>();
    for (const token of tokens) {
        const match = /^((?:clean|distorted)\d+):note:s(\d+):f(-?\d+)$/.exec(token);
        if (match) present.add(match[1]);
        if (match && (Number(match[2]) > 6 || Number(match[3]) < 0)) excluded.add(match[1]);
    }
    let tick = 0, lastBeat = -480, lastDuration = 480;
    let measure: Measure | undefined, current: RawNote | undefined, orphaned: string[] = [];
    const measures: Measure[] = [];
    for (const token of tokens.slice(4)) {
        if ((token === 'new_measure' || token === 'end') && measure) {
            measures.push(measure);
            if (lastBeat === tick) tick += lastDuration || 480;
        }
        if (token === 'end') break;
        if (token === 'new_measure') { measure = { tick, beats: new Map() }; current = undefined; orphaned = []; continue; }
        const parts = token.split(':');
        if (parts[1] === 'note' || parts[1] === 'rest') {
            if (!measure) throw Error('Note before measure');
            current = { token, effects: orphaned }; orphaned = [];
            const beats = measure.beats.get(parts[0]) ?? new Map<number, RawNote[]>();
            beats.set(tick, [...beats.get(tick) ?? [], current]); measure.beats.set(parts[0], beats);
            if (tick !== lastBeat) lastDuration = tick - lastBeat;
            lastBeat = tick;
        } else if (parts[0] === 'nfx') { (current ? current.effects : orphaned).push(token); }
        else if (parts[0] === 'wait') { tick += Number(parts[1]); current = undefined; }
    }
    const result: NotatedBeat[] = [];
    for (let i = 0; i < measures.length; i++) {
        const m = measures[i], end = measures[i + 1]?.tick ?? tick;
        if (end === m.tick) continue;
        for (const [instrument, beats] of m.beats) {
            if (!present.has(instrument) || excluded.has(instrument)) continue;
            const clocks = [...beats.keys()];
            if (clocks[0] !== m.tick) { clocks.unshift(m.tick); beats.set(m.tick, []); }
            for (let j = 0; j < clocks.length; j++) {
                const at = clocks[j], span = (clocks[j + 1] ?? end) - at;
                if (!span) continue;
                const notes: NotatedNote[] = [];
                for (const raw of beats.get(at)!) {
                    const match = /:note:s(\d+):f(-?\d+)$/.exec(raw.token);
                    if (!match || notes.some(note => note.string === Number(match[1]) - 1)) continue;
                    let type = 1;
                    for (const effect of raw.effects) { if (effect === 'nfx:tie') type = 2; if (effect === 'nfx:dead') type = 3; }
                    notes.push({ string: Number(match[1]) - 1, fret: Number(match[2]), type,
                        ring: raw.effects.includes('nfx:let_ring'), ghost: raw.effects.includes('nfx:ghost_note') });
                }
                result.push({ instrument, tick: at, duration: duration(span), rest: !notes.length, notes: notes.sort((a, b) => a.string - b.string) });
            }
        }
    }
    return result.sort((a, b) => a.instrument.localeCompare(b.instrument) || a.tick - b.tick);
}

export function framesFromNotation(beats: NotatedBeat[]): Frame[] {
    return beats.map(beat => {
        const attack: Frets = Array(6).fill(null), explicitSounding: Frets = Array(6).fill(null);
        for (const note of beat.notes) {
            if (note.string < 0 || note.string > 5 || note.type === 3) continue;
            explicitSounding[note.string] = note.fret;
            if (note.type !== 2) attack[note.string] = note.fret;
        }
        return { instrument: beat.instrument, tick: beat.tick, duration: beat.duration, rest: beat.rest, attack, explicitSounding,
            hasTie: beat.notes.some(n => n.type === 2), sustainUncertain: beat.notes.some(n => n.ring),
            invalid: beat.notes.some(n => n.type === 3 || n.string < 0 || n.string > 5 || n.fret < 0 || n.fret > 15) };
    });
}
export function parseFrames(text: string): Frame[] { return framesFromNotation(parseNotation(text)); }
