import { describe, expect, it } from 'vitest';
import { getScaleCompatibleChords } from '../chord/chord-scale-compatibility';
import { getScaleHarmonization } from '../chord/scale-harmonization';
import { createScaleRef, resolveScaleRef, type ScaleRef } from './scale-ref';
import { compareParallelScales, getScaleRelations } from './scale-relations';
import { getScalePresentationName } from './scaleSelector';
import { SCALES, getScaleEngineIntervalLabels, getScaleIntervalLabels, isDoubleStopSupported } from './scales';

function notes(ref: ScaleRef): number[] {
    const selected = resolveScaleRef(ref)!;
    return SCALES[selected.group][selected.name]
        .map((interval) => (selected.tonic + interval) % 12).sort((a, b) => a - b);
}

describe('structural scale relations', () => {
    it('preserves every registered sibling collection at every tonic', () => {
        for (const [group, scales] of Object.entries(SCALES)) {
            for (const name of Object.keys(scales)) {
                for (let tonic = 0; tonic < 12; tonic++) {
                    const ref = createScaleRef(group, name, tonic);
                    for (const sibling of getScaleRelations(ref)!.siblings) {
                        expect(notes(sibling.scaleRef), `${name}/${tonic} -> ${sibling.name}`).toEqual(notes(ref));
                    }
                }
            }
        }
    });

    it('locates the actual parent tonic and identifies pentatonic subsets without invented siblings', () => {
        const dorian = getScaleRelations(createScaleRef('Diatonic Modes', 'Dorian', 0))!;
        expect(dorian.parent).toEqual({ name: 'Ionian', scaleRef: createScaleRef('Diatonic Modes', 'Ionian', 10), subset: false });
        const minorPent = getScaleRelations(createScaleRef('Pentatonic', 'Minor Pentatonic', 0))!;
        expect(minorPent.siblings).toEqual([]);
        expect(minorPent.parent).toEqual({ name: 'Ionian', scaleRef: createScaleRef('Diatonic Modes', 'Ionian', 3), subset: true });
        expect(notes(createScaleRef('Pentatonic', 'Minor Pentatonic', 0)).every(note => notes(minorPent.parent!.scaleRef).includes(note))).toBe(true);
    });

    it('compares parallel pitch classes at the current tonic without assigning characteristics', () => {
        const current = createScaleRef('Diatonic Modes', 'Dorian', 0);
        const target = createScaleRef('Diatonic Modes', 'Aeolian', 7);
        expect(compareParallelScales(current, target)).toEqual({
            scaleRef: createScaleRef('Diatonic Modes', 'Aeolian', 0),
            shared: [0, 2, 3, 5, 7, 10], added: [8], removed: [9],
        });
        expect(target.tonic).toBe(7);
    });

    it('reports all nonzero preserving transpositions', () => {
        expect(getScaleRelations(createScaleRef('Symmetric', 'Whole Tone', 11))!.symmetryOffsets).toEqual([2, 4, 6, 8, 10]);
        for (const name of ['Diminished', 'Half-Whole Diminished']) {
            expect(getScaleRelations(createScaleRef('Symmetric', name, 4))!.symmetryOffsets).toEqual([3, 6, 9]);
        }
        expect(getScaleRelations(createScaleRef('Diatonic Modes', 'Dorian', 0))!.symmetryOffsets).toEqual([]);
    });

    it('rejects invalid references instead of using a fallback collection', () => {
        const invalid = { group: 'Missing', scaleId: 'Missing::Scale', tonic: 0 };
        expect(getScaleRelations(invalid)).toBeNull();
        expect(compareParallelScales(invalid, createScaleRef('Diatonic Modes', 'Ionian', 0))).toBeNull();
        expect(getScaleRelations({ ...createScaleRef('Diatonic Modes', 'Ionian', 0), tonic: NaN })).toBeNull();
    });
});

describe('Half–Whole Diminished coverage', () => {
    const group = 'Symmetric';
    const name = 'Half-Whole Diminished';

    it('derives the octatonic rotation with distinct structural and dominant display degrees', () => {
        const intervals = [0, 1, 3, 4, 6, 7, 9, 10];
        expect(SCALES[group][name]).toEqual(intervals);
        expect(intervals.map(interval => getScaleEngineIntervalLabels(group, name)[interval])).toEqual(['1', 'b2', 'b3', '3', '#4', '5', '6', 'b7']);
        expect(intervals.map(interval => getScaleIntervalLabels(group, name)[interval])).toEqual(['1', 'b9', '#9', '3', '#11', '5', '13', 'b7']);
        expect(SCALES[group].Diminished).toEqual([0, 2, 3, 5, 6, 8, 9, 11]);
        expect(getScalePresentationName('Diminished')).toBe('Whole–Half Diminished');
    });

    it('supports dominant pairings at all tonics without enabling tertian harmonization or double stops', () => {
        expect(isDoubleStopSupported(group, name)).toBe(false);
        for (let tonic = 0; tonic < 12; tonic++) {
            const compatible = getScaleCompatibleChords(group, name, tonic);
            for (const chordId of ['dominant-7-flat-9', 'hendrix-7-sharp-9']) {
                expect(compatible.find(chord => chord.chordId === chordId)).toMatchObject({ basis: 'primary', rootPitchClass: tonic, tonesOutsideScale: [] });
            }
            expect(compatible.find(chord => chord.chordId === 'dominant-7')).toMatchObject({ basis: 'characteristic', rootPitchClass: tonic, tonesOutsideScale: [] });
            expect(getScaleHarmonization(group, name, tonic)).toEqual({ defined: false, pitchClassCount: 8 });
            expect(notes(createScaleRef(group, name, tonic))).toEqual([0, 1, 3, 4, 6, 7, 9, 10].map(interval => (tonic + interval) % 12).sort((a, b) => a - b));
        }
    });
});
