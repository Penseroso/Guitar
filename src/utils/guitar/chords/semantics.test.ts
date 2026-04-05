import { describe, expect, it } from 'vitest';

import { buildChordTonesById, getChordRegistryEntryOrThrow } from './helpers';
import { deriveChordToneRole, isFormulaClosedChordFamily, isRequiredChordDegree } from './semantics';

function getToneSemantics(id: string) {
    const entry = getChordRegistryEntryOrThrow(id);

    return Object.fromEntries(
        entry.formula.degrees.map((degree) => [
            degree,
            {
                role: deriveChordToneRole(entry, degree),
                isRequired: isRequiredChordDegree(entry, degree),
            },
        ])
    );
}

describe('chord semantics direct classification', () => {
    it('keeps the quality-defining seventh structure required', () => {
        expect(getToneSemantics('major-7')).toMatchObject({
            '1': { role: 'root', isRequired: true },
            '3': { role: 'third', isRequired: true },
            '5': { role: 'fifth', isRequired: false },
            '7': { role: 'seventh', isRequired: true },
        });
    });

    it('classifies suspended chords correctly', () => {
        expect(getToneSemantics('sus2')).toMatchObject({
            '2': { role: 'suspension', isRequired: true },
            '5': { role: 'fifth', isRequired: false },
        });

        expect(getToneSemantics('sus4')).toMatchObject({
            '4': { role: 'suspension', isRequired: true },
            '5': { role: 'fifth', isRequired: false },
        });
    });

    it('keeps the power fifth required', () => {
        expect(getToneSemantics('power-5')).toMatchObject({
            '5': { role: 'fifth', isRequired: true },
        });
    });

    it('treats ninths as core tones for the supported extended families', () => {
        expect(getToneSemantics('major-9')).toMatchObject({
            '7': { role: 'seventh', isRequired: true },
            '9': { role: 'extension', isRequired: true },
        });

        expect(getToneSemantics('minor-9')).toMatchObject({
            'b7': { role: 'seventh', isRequired: true },
            '9': { role: 'extension', isRequired: true },
        });

        expect(getToneSemantics('dominant-9')).toMatchObject({
            '3': { role: 'third', isRequired: true },
            'b7': { role: 'seventh', isRequired: true },
            '9': { role: 'extension', isRequired: true },
        });

        expect(getToneSemantics('dominant-11')).toMatchObject({
            '3': { role: 'third', isRequired: true },
            'b7': { role: 'seventh', isRequired: true },
            '11': { role: 'extension', isRequired: true },
        });
    });

    it('treats the thirteenth as core for dominant-13 while leaving 5 and 9 optional', () => {
        expect(getToneSemantics('dominant-13')).toMatchObject({
            '3': { role: 'third', isRequired: true },
            'b7': { role: 'seventh', isRequired: true },
            '9': { role: 'extension', isRequired: false },
            '13': { role: 'extension', isRequired: true },
        });
    });

    it('keeps altered ninth identity tones required', () => {
        expect(getToneSemantics('hendrix-7-sharp-9')).toMatchObject({
            '#9': { role: 'alteration', isRequired: true },
        });

        expect(getToneSemantics('dominant-7-flat-9')).toMatchObject({
            'b9': { role: 'alteration', isRequired: true },
        });
    });
});

describe('registry and helper tone semantics parity', () => {
    const parityIds = [
        'power-5',
        'sus2',
        'sus4',
        'major-9',
        'dominant-11',
        'dominant-13',
        'hendrix-7-sharp-9',
        'dominant-7-flat-9',
    ] as const;

    it.each(parityIds)('keeps normalized and built tone semantics aligned for %s', (id) => {
        const entry = getChordRegistryEntryOrThrow(id);
        const normalizedTones = entry.normalizedTones.tones.map((tone) => ({
            degree: tone.degree,
            role: tone.role,
            isRequired: tone.isRequired,
        }));
        const builtTones = buildChordTonesById(id, 9).tones.map((tone) => ({
            degree: tone.degree,
            role: tone.role,
            isRequired: tone.isRequired,
        }));

        expect(builtTones).toEqual(normalizedTones);
    });
});

describe('formula-closure policy', () => {
    it('marks simple chord families as formula-closed for candidate generation and filtering', () => {
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('major'))).toBe(true);
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('minor'))).toBe(true);
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('power-5'))).toBe(true);
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('sus2'))).toBe(true);
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('sus4'))).toBe(true);
    });

    it('leaves seventh, extended, and altered families open to their declared formula tones', () => {
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('major-7'))).toBe(false);
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('dominant-9'))).toBe(false);
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('dominant-11'))).toBe(false);
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('dominant-13'))).toBe(false);
        expect(isFormulaClosedChordFamily(getChordRegistryEntryOrThrow('hendrix-7-sharp-9'))).toBe(false);
    });
});
