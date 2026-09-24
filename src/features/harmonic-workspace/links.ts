import type { ChordRef, RelationQuery, TonalFrame } from '@/domain/harmony/types';
import type { ScaleRef } from '@/domain/scale/scale-ref';
import { resolveScaleRef } from '@/domain/scale/scale-ref';
import { getKeyName, getMinorKeyName } from '@/domain/shared/keys';
import { parseNoteName } from '@/domain/shared/spelling';
import type { ChordReading } from '@/domain/chord/reverse/readings';
import { engineEntry } from '@/domain/chord/engine/catalog';

export interface ScaleHarmonySelection {
    scaleRef: ScaleRef;
    chord: ChordRef;
}

/** A link changes the explored target, never the established tonal frame. */
export function linkChordToHarmony(query: RelationQuery, chord: ChordRef): RelationQuery {
    const sameTarget = query.target.root === chord.root && query.target.chordId === chord.chordId && query.target.bass === chord.bass;
    if (sameTarget) return { ...query, target: { ...chord } };
    const next = { ...query, target: { ...chord } };
    delete next.context;
    return next;
}

/** Keep the original Scale identity available for an explicit frame choice. */
export function linkScaleToHarmony(query: RelationQuery, selection: ScaleHarmonySelection): {
    query: RelationQuery;
    sourceScaleRef: ScaleRef;
} {
    return {
        query: linkChordToHarmony(query, selection.chord),
        sourceScaleRef: { ...selection.scaleRef },
    };
}

/** Only these two collections have a direct major/minor frame interpretation. */
export function frameForScaleRef(source: ScaleRef, current: TonalFrame): TonalFrame | null {
    const scale = resolveScaleRef(source);
    if (!scale || scale.group !== 'Diatonic Modes') return null;
    if (scale.name === 'Ionian') return { ...current, tonic: getKeyName(source.tonic), mode: 'major' };
    if (scale.name === 'Aeolian') return { ...current, tonic: getMinorKeyName(source.tonic), mode: 'minor' };
    return null;
}

export function chordRefFromReading(reading: ChordReading): ChordRef {
    const root = getKeyName(reading.rootPitchClass);
    const bass = reading.bassPitchClass === reading.rootPitchClass ? undefined : getKeyName(reading.bassPitchClass);
    return { root, chordId: reading.chordId, ...(bass ? { bass } : {}) };
}

export function chordRefPitchClass(chord: ChordRef): number | null {
    return parseNoteName(chord.root)?.pitchClass ?? null;
}

/** Translate a formula slash bass to the Chord view's existing tone filter. */
export function chordRefBassTone(chord: ChordRef): string | null {
    if (!chord.bass) return null;
    const root = chordRefPitchClass(chord);
    const bass = parseNoteName(chord.bass)?.pitchClass;
    if (root === null || bass === undefined) return null;
    try {
        const entry = engineEntry(chord.chordId);
        const index = entry.formula.intervals.findIndex(interval => (root + interval) % 12 === bass);
        return index < 0 ? null : entry.formula.degrees[index];
    } catch {
        return null;
    }
}
