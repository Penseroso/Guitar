import { getChordRegistryEntry, getChordRegistryEntryByLegacyType, getChordRegistryEntryBySymbol, ChordRegistryEntry } from './registry';
import { ChordDefinition, ChordTone, ChordTones, PitchClass } from './types';

export interface BuildChordDefinitionOptions {
    slashBassPitchClass?: number;
}

export function normalizePitchClass(value: number): PitchClass {
    return ((value % 12) + 12) % 12;
}

export function getChordRegistryEntryOrThrow(id: string): ChordRegistryEntry {
    const entry = getChordRegistryEntry(id);
    if (!entry) {
        throw new Error(`Unknown chord registry id: ${id}`);
    }

    return entry;
}

export function resolveChordRegistryEntry(input: string | ChordRegistryEntry): ChordRegistryEntry {
    if (typeof input !== 'string') {
        return input;
    }

    return (
        getChordRegistryEntry(input) ??
        getChordRegistryEntryBySymbol(input) ??
        getChordRegistryEntryByLegacyType(input) ??
        getChordRegistryEntryOrThrow(input)
    );
}

export function buildChordDefinitionFromRegistryEntry(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number,
    options: BuildChordDefinitionOptions = {}
): ChordDefinition {
    const entry = resolveChordRegistryEntry(entryInput);

    return {
        ...entry.definition,
        rootPitchClass: normalizePitchClass(rootPitchClass),
        slashBassPitchClass: options.slashBassPitchClass === undefined
            ? undefined
            : normalizePitchClass(options.slashBassPitchClass),
    };
}

export function buildChordDefinitionById(
    id: string,
    rootPitchClass: number,
    options: BuildChordDefinitionOptions = {}
): ChordDefinition {
    return buildChordDefinitionFromRegistryEntry(getChordRegistryEntryOrThrow(id), rootPitchClass, options);
}

export function buildChordTonesFromRegistryEntry(
    entryInput: string | ChordRegistryEntry,
    rootPitchClass: number
): ChordTones {
    const entry = resolveChordRegistryEntry(entryInput);
    const normalizedRoot = normalizePitchClass(rootPitchClass);

    return {
        rootPitchClass: normalizedRoot,
        intervals: [...entry.formula.intervals],
        tones: entry.formula.degrees.map((degree, index) => {
            const interval = entry.formula.intervals[index];
            return {
                degree,
                interval,
                pitchClass: normalizePitchClass(normalizedRoot + interval),
                isRequired: isRequiredChordDegree(entry, degree),
                role: deriveChordToneRole(entry, degree),
            };
        }),
    };
}

export function buildChordTonesById(id: string, rootPitchClass: number): ChordTones {
    return buildChordTonesFromRegistryEntry(getChordRegistryEntryOrThrow(id), rootPitchClass);
}

export function getRequiredChordDegrees(entryInput: string | ChordRegistryEntry): string[] {
    const entry = resolveChordRegistryEntry(entryInput);
    return entry.formula.degrees.filter((degree) => isRequiredChordDegree(entry, degree));
}

export function getOptionalChordDegrees(entryInput: string | ChordRegistryEntry): string[] {
    const entry = resolveChordRegistryEntry(entryInput);
    return entry.formula.degrees.filter((degree) => !isRequiredChordDegree(entry, degree));
}

export function getRequiredChordTones(entryInput: string | ChordRegistryEntry, rootPitchClass: number): ChordTone[] {
    return buildChordTonesFromRegistryEntry(entryInput, rootPitchClass).tones.filter((tone) => tone.isRequired);
}

export function getOptionalChordTones(entryInput: string | ChordRegistryEntry, rootPitchClass: number): ChordTone[] {
    return buildChordTonesFromRegistryEntry(entryInput, rootPitchClass).tones.filter((tone) => !tone.isRequired);
}

export function getChordRegistryEntryFromLegacyTypeOrThrow(legacyType: string): ChordRegistryEntry {
    const entry = getChordRegistryEntryByLegacyType(legacyType);
    if (!entry) {
        throw new Error(`Unknown legacy chord type: ${legacyType}`);
    }

    return entry;
}

function isRequiredChordDegree(entry: ChordRegistryEntry, degree: string): boolean {
    if (degree === '1') return true;

    if (entry.id === 'power-5') {
        return degree === '5';
    }

    if (entry.id === 'sus2' || entry.id === 'sus4') {
        return degree !== '5';
    }

    if (degree === '3' || degree === 'b3' || degree === '2' || degree === '4') return true;
    if (degree === '7' || degree === 'b7' || degree === '6') return true;

    if (degree === 'b9' || degree === '#9') return true;

    return false;
}

function deriveChordToneRole(entry: ChordRegistryEntry, degree: string): ChordTone['role'] {
    if (degree === '1') return 'root';

    if (entry.id === 'sus2' || entry.id === 'sus4') {
        if (degree === '2' || degree === '4') return 'suspension';
    }

    if (degree === 'b3' || degree === '3') return 'third';
    if (degree === '5' || degree === 'b5' || degree === '#5') return 'fifth';
    if (degree === '6' || degree === 'b7' || degree === '7') return 'seventh';
    if (degree === '9' || degree === '11' || degree === '13') return 'extension';
    if (degree === '2' || degree === '4' || degree === 'b9' || degree === '#9') return 'alteration';

    return 'alteration';
}
