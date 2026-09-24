import type { RelationFacts, ResolvedHarmonyChord } from './types';
import { pc } from './roman';

export function compareChords(from: ResolvedHarmonyChord, to: ResolvedHarmonyChord): RelationFacts {
    const a = from.tones.map(t => t.pitchClass), b = to.tones.map(t => t.pitchClass);
    return { rootMotion: pc(to.rootPitchClass - from.rootPitchClass), shared: a.filter(n => b.includes(n)), removed: a.filter(n => !b.includes(n)), added: b.filter(n => !a.includes(n)) };
}
