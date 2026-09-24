import { describe, expect, it } from 'vitest';
import { getScaleIdentity, SOURCE_CATALOG } from './scale-identity';
import { createScaleRef } from './scale-ref';
import { SCALES } from './scales';

describe('reviewed scale identity', () => {
    it('covers every registered scale with valid provenance and curated in-scale markers', () => {
        for (const [group, scales] of Object.entries(SCALES)) {
            for (const [name, intervals] of Object.entries(scales)) {
                const identity = getScaleIdentity(createScaleRef(group, name, 0));
                expect(identity, `${group}/${name}`).not.toBeNull();
                expect(identity?.status).toBe('reviewed');
                expect(identity?.explanation.length).toBeGreaterThan(10);
                expect(identity?.sourceRefs.length).toBeGreaterThan(0);
                for (const source of identity!.sourceRefs) {
                    expect(SOURCE_CATALOG[source].url).toMatch(/^https:\/\//);
                    expect(SOURCE_CATALOG[source].locator.length).toBeGreaterThan(10);
                    expect(SOURCE_CATALOG[source].author).toBeTruthy();
                }
                for (const marker of identity!.markers) expect(intervals).toContain(marker.interval);
                for (let tonic = 1; tonic < 12; tonic++) {
                    expect(getScaleIdentity(createScaleRef(group, name, tonic))).toEqual(identity);
                }
            }
        }
    });
    it('uses authored characteristics, not all differing notes or a required single-note marker', () => {
        expect(getScaleIdentity(createScaleRef('Diatonic Modes', 'Dorian', 0))?.markers).toEqual([{ degree: '6', interval: 9 }]);
        expect(getScaleIdentity(createScaleRef('Jazz Minor Modes', 'Altered scale', 0))?.markers.map(marker => marker.degree))
            .toEqual(['b9', '#9', '#11', 'b13']);
        expect(getScaleIdentity(createScaleRef('Symmetric', 'Whole Tone', 0))?.markers).toEqual([]);
    });
    it('does not leak mutable interpretation state or fall back on invalid references', () => {
        const ref = createScaleRef('Diatonic Modes', 'Dorian', 0);
        const first = getScaleIdentity(ref)!;
        first.markers[0].interval = 0;
        first.sourceRefs.pop();
        expect(getScaleIdentity(ref)?.markers[0].interval).toBe(9);
        expect(getScaleIdentity(ref)?.sourceRefs).toEqual(['modes']);
        expect(getScaleIdentity({ ...ref, scaleId: 'missing' })).toBeNull();
    });
});
