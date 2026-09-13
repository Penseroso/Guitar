import { resolveChordRegistryEntry } from '../helpers';
import type { ChordRegistryEntry } from '../registry';
import { EngineError } from './errors';

export function canonicalTone(chordId: string, degree: string): string {
    return chordId === 'diminished-7' && degree === '6' ? 'bb7' : degree;
}
export function engineEntry(id: string): ChordRegistryEntry {
    let entry: ChordRegistryEntry;
    try { entry = resolveChordRegistryEntry(id); }
    catch { throw new EngineError('unsupported-request', `Unsupported chord: ${id}.`, 'chordId'); }
    // Preserve recognition-v1 and the old live engine until atomic cutover.
    return { ...entry, formula: { ...entry.formula, degrees: entry.formula.degrees.map(d => canonicalTone(entry.id, d)) } };
}
export function formulaForKey(key: string) {
    if (!key.startsWith('catalog-v1:')) throw new EngineError('contract-error', 'Unknown catalog version.');
    const entry = engineEntry(key.slice('catalog-v1:'.length));
    return entry.formula.degrees.map((id, i) => ({ id, interval: entry.formula.intervals[i] }));
}
/** Frozen feature/recognition obligations, separate from identity-v1 realization policy. */
export function legacyRequiredToneIds(degrees: readonly string[]): string[] {
    const anchors = ['3','b3','2','4','6','7','b7','bb7'];
    const required = degrees.filter(d => d === '1' || anchors.includes(d) || d === 'b5' || d === '#5');
    if (degrees.includes('5') && !degrees.some(d => anchors.includes(d))) required.push('5');
    const extensions = degrees.filter(d => /^[b#]?(9|11|13)$/.test(d));
    const highest = [...extensions].sort((a,b) => Number(b.replace(/[b#]/g,'')) - Number(a.replace(/[b#]/g,'')))[0];
    if (highest) required.push(highest);
    return degrees.filter(d => required.includes(d));
}
export function identityRequiredToneIds(degrees: readonly string[]): string[] {
    const required = new Set(legacyRequiredToneIds(degrees).filter(d => d !== '1'));
    const extensions = degrees.filter(d => /^[b#]*(9|11|13)$/.test(d));
    const highest = Math.max(0, ...extensions.map(d => Number(d.replace(/[b#]/g,''))));
    for (const d of extensions) if (/^[b#]/.test(d) || Number(d) === highest) required.add(d);
    if (degrees.includes('3') && degrees.includes('b7') && degrees.includes('11')) required.delete('3');
    return degrees.filter(d => required.has(d));
}
