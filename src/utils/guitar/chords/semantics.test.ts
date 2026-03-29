import { describe, expect, it } from 'vitest';

import { buildChordTonesById, getChordRegistryEntryOrThrow } from './helpers';
import { deriveChordToneRole, isRequiredChordDegree } from './semantics';

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

    it('treats ninth and thirteenth extensions as optional color tones', () => {
        expect(getToneSemantics('major-9')).toMatchObject({
            '9': { role: 'extension', isRequired: false },
        });

        expect(getToneSemantics('minor-9')).toMatchObject({
            '9': { role: 'extension', isRequired: false },
        });

        expect(getToneSemantics('dominant-9')).toMatchObject({
            '9': { role: 'extension', isRequired: false },
        });

        expect(getToneSemantics('dominant-13')).toMatchObject({
            '13': { role: 'extension', isRequired: false },
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
