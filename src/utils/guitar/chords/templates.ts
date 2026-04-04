import { CHORD_SHAPES } from '../theory';
import { STANDARD_GUITAR_TUNING_PITCH_CLASSES } from '../tuning';
import type { ChordShape } from '../types';
import { buildChordTonesFromRegistryEntry, normalizePitchClass, resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { VoicingTemplate, VoicingTemplateString } from './types';

function slugifyTemplateLabel(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function buildToneDegreeMap(entry: ChordRegistryEntry): Map<number, { degree: string; isRequired: boolean }> {
    const tones = buildChordTonesFromRegistryEntry(entry, 0).tones;

    return new Map(
        tones.map((tone) => [
            normalizePitchClass(tone.pitchClass),
            {
                degree: tone.degree,
                isRequired: tone.isRequired ?? false,
            },
        ])
    );
}

function buildTemplateTags(entry: ChordRegistryEntry, shape: ChordShape): string[] {
    return Array.from(
        new Set([
            ...(entry.tags ?? []),
            ...(entry.voicingHint?.tags ?? []),
            `root-string-${shape.baseRootString + 1}`,
        ])
    );
}

function buildTemplateStrings(shape: ChordShape, entry: ChordRegistryEntry): VoicingTemplateString[] {
    const toneDegreeMap = buildToneDegreeMap(entry);
    const rootStringPitchClass = STANDARD_GUITAR_TUNING_PITCH_CLASSES[shape.baseRootString];

    return shape.offsets.map((fretOffset, stringIndex) => {
        const stringPitchClass = STANDARD_GUITAR_TUNING_PITCH_CLASSES[stringIndex];

        if (fretOffset === null) {
            return {
                string: stringIndex as VoicingTemplateString['string'],
                fretOffset: null,
            };
        }

        const normalizedPitchClass = normalizePitchClass(
            stringPitchClass - rootStringPitchClass + fretOffset
        );
        const matchedTone = toneDegreeMap.get(normalizedPitchClass);

        return {
            string: stringIndex as VoicingTemplateString['string'],
            fretOffset,
            toneDegree: matchedTone?.degree,
            isOptional: matchedTone ? !matchedTone.isRequired : undefined,
        };
    });
}

export function buildVoicingTemplateFromLegacyShape(
    entryInput: string | ChordRegistryEntry,
    shape: ChordShape,
    shapeIndex = 0
): VoicingTemplate {
    const entry = resolveChordRegistryEntry(entryInput);

    return {
        id: `${entry.id}:${shapeIndex}:${slugifyTemplateLabel(shape.name)}`,
        label: shape.name,
        instrument: 'guitar',
        rootString: shape.baseRootString as VoicingTemplate['rootString'],
        strings: buildTemplateStrings(shape, entry),
        source: 'legacy-shape',
        tags: buildTemplateTags(entry, shape),
    };
}

export function getLegacyShapeKeyForChord(entryInput: string | ChordRegistryEntry): string | null {
    const entry = resolveChordRegistryEntry(entryInput);
    return entry.legacyType ?? null;
}

export function getVoicingTemplatesByLegacyType(legacyType: string): VoicingTemplate[] {
    const entry = resolveChordRegistryEntry(legacyType);
    const shapes = CHORD_SHAPES[legacyType] ?? [];

    return shapes.map((shape, index) => buildVoicingTemplateFromLegacyShape(entry, shape, index));
}

export function getVoicingTemplatesForChord(entryInput: string | ChordRegistryEntry): VoicingTemplate[] {
    const entry = resolveChordRegistryEntry(entryInput);
    const legacyShapeKey = getLegacyShapeKeyForChord(entry);

    if (!legacyShapeKey) {
        return [];
    }

    const shapes = CHORD_SHAPES[legacyShapeKey] ?? [];
    return shapes.map((shape, index) => buildVoicingTemplateFromLegacyShape(entry, shape, index));
}
