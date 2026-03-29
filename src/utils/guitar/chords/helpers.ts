import { getChordRegistryEntry, getChordRegistryEntryByLegacyType, getChordRegistryEntryBySymbol, ChordRegistryEntry } from './registry';
import { deriveChordToneRole, isRequiredChordDegree } from './semantics';
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
