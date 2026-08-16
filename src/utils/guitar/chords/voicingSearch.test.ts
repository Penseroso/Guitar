import { describe, expect, it } from 'vitest';

import { CHORD_REGISTRY_LIST } from './registry';
import { searchDeductiveVoicings } from './voicingSearch';

const major = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'major')!;
const dominant7 = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'dominant-7')!;
const augmented = CHORD_REGISTRY_LIST.find((entry) => entry.id === 'augmented')!;

const C_ROOT_PITCH_CLASS = 0;

describe('searchDeductiveVoicings', () => {
    it('finds close-position C major voicings that are all playable, rooted, and cover every required degree', () => {
        const results = searchDeductiveVoicings(major, C_ROOT_PITCH_CLASS, { position: 'close' });

        expect(results.length).toBeGreaterThan(0);
        for (const voicing of results) {
            const played = voicing.notes.filter((note) => !note.isMuted);
            const degrees = new Set(played.map((note) => note.degree));
            expect(degrees.has('1')).toBe(true); // root
            expect(degrees.has('3')).toBe(true); // required 3rd
            expect(played.some((note) => note.isRoot)).toBe(true);
            expect(voicing.playable).toBe(true);
        }
    });

    it('allows duplicated notes across strings (e.g. a fuller strummed voicing with a doubled root)', () => {
        const results = searchDeductiveVoicings(major, C_ROOT_PITCH_CLASS, { position: 'close' });

        const fullerVoicings = results.filter((voicing) => voicing.notes.filter((note) => !note.isMuted).length > 3);
        expect(fullerVoicings.length).toBeGreaterThan(0);

        const hasDoubledDegree = fullerVoicings.some((voicing) => {
            const played = voicing.notes.filter((note) => !note.isMuted);
            const degreeCounts = new Map<string, number>();
            for (const note of played) {
                degreeCounts.set(note.degree!, (degreeCounts.get(note.degree!) ?? 0) + 1);
            }
            return [...degreeCounts.values()].some((count) => count > 1);
        });
        expect(hasDoubledDegree).toBe(true);
    });

    it('also finds the minimal 2-note voicing (root + 3rd only, natural 5th omitted since it is optional)', () => {
        const results = searchDeductiveVoicings(major, C_ROOT_PITCH_CLASS, { position: 'close' });

        const hasMinimalVoicing = results.some((voicing) => {
            const played = voicing.notes.filter((note) => !note.isMuted);
            return played.length === 2 && new Set(played.map((n) => n.degree)).size === 2;
        });
        expect(hasMinimalVoicing).toBe(true);
    });

    it('finds the standard "x-3-2-0-x-x" style close-position C major grip on the A/D/G strings', () => {
        const results = searchDeductiveVoicings(major, C_ROOT_PITCH_CLASS, { position: 'close' });

        const hasExpectedShape = results.some((voicing) => {
            const played = voicing.notes.filter((note) => !note.isMuted);
            if (played.length !== 3) return false;
            const byString = new Map(played.map((note) => [note.string, note.fret]));
            return byString.get(4) === 3 && byString.get(3) === 2 && byString.get(2) === 0;
        });

        expect(hasExpectedShape).toBe(true);
    });

    it('never produces a voicing that fails its own hand-playability check', () => {
        // Note: `span` is the raw maxFret-minFret across ALL played strings including opens, so
        // it can legitimately be large (an open low string plus a note fretted way up the neck is
        // trivially playable — open strings cost no finger). What must stay bounded is the spread
        // among the actually-fretted (non-open) notes, which is exactly what evaluateHandPlayability
        // already enforces — re-derive it here from the raw note data as an independent check.
        const results = searchDeductiveVoicings(dominant7, 7, { position: 'drop-2' }, { maxHandSpanMm: 95 });

        expect(results.length).toBeGreaterThan(0);
        for (const voicing of results) {
            expect(voicing.playable).toBe(true);
            const frettedFrets = voicing.notes
                .filter((note) => !note.isMuted && note.fret > 0)
                .map((note) => note.fret);
            if (frettedFrets.length > 1) {
                expect(Math.max(...frettedFrets) - Math.min(...frettedFrets)).toBeLessThan(6);
            }
        }
    });

    it('respects an explicit maxFret bound', () => {
        const results = searchDeductiveVoicings(major, C_ROOT_PITCH_CLASS, { position: 'close' }, { maxFret: 5 });

        for (const voicing of results) {
            for (const note of voicing.notes.filter((n) => !n.isMuted)) {
                expect(note.fret).toBeLessThanOrEqual(5);
            }
        }
    });

    it('produces playable augmented-triad voicings now that the chord type exists in the registry', () => {
        const results = searchDeductiveVoicings(augmented, C_ROOT_PITCH_CLASS, { position: 'close' });

        expect(results.length).toBeGreaterThan(0);
        for (const voicing of results) {
            const played = voicing.notes.filter((note) => !note.isMuted);
            const pitchClasses = new Set(played.map((note) => note.pitchClass));
            expect(pitchClasses).toEqual(new Set([0, 4, 8])); // root, 3rd, #5
        }
    });

    it('returns no results when requireRoot is set but the style omits the root (defensive edge case)', () => {
        const results = searchDeductiveVoicings(
            major,
            C_ROOT_PITCH_CLASS,
            { position: 'close', omitDegrees: ['1'] },
            { requireRoot: true }
        );

        expect(results).toEqual([]);
    });

    it('does not return duplicate voicings for the same string/fret signature', () => {
        const results = searchDeductiveVoicings(major, C_ROOT_PITCH_CLASS, { position: 'close' });
        const signatures = results.map((voicing) => voicing.id);
        expect(new Set(signatures).size).toBe(signatures.length);
    });

    it('populates midiNote on every played note, so descriptor.ts can correctly find the actual bass/top voice', () => {
        // Regression: notes were built without `midiNote`, so descriptor.ts's bass/top-voice sort
        // (which compares `note.midiNote ?? 0`) silently degraded to a no-op comparison, meaning
        // `inversion`/`bassPitchClass` were essentially arbitrary rather than reflecting real pitch.
        const results = searchDeductiveVoicings(major, C_ROOT_PITCH_CLASS, { position: 'close' });

        expect(results.length).toBeGreaterThan(0);
        for (const voicing of results) {
            const played = voicing.notes.filter((note) => !note.isMuted);
            for (const note of played) {
                expect(typeof note.midiNote).toBe('number');
            }
            // Ascending string order (thick->thin, i.e. descending string index) must correspond
            // to non-decreasing MIDI pitch — that's the physical constraint the search enforces.
            const sortedByString = [...played].sort((a, b) => b.string - a.string);
            for (let i = 1; i < sortedByString.length; i++) {
                expect(sortedByString[i].midiNote!).toBeGreaterThanOrEqual(sortedByString[i - 1].midiNote!);
            }
        }
    });

    it('reports a non-root-position inversion for a drop-2 voicing whose bass note is the 5th, not the root', () => {
        const results = searchDeductiveVoicings(dominant7, 0, { position: 'drop-2' });

        const genuineDrop2 = results.find((voicing) => {
            const played = voicing.notes.filter((note) => !note.isMuted);
            const bass = [...played].sort((a, b) => (a.midiNote ?? 0) - (b.midiNote ?? 0))[0];
            return bass?.degree === '5';
        });

        expect(genuineDrop2).toBeDefined();
        expect(genuineDrop2!.descriptor.inversion).toBe('inversion');
        expect(genuineDrop2!.descriptor.bassPitchClass).toBe(7); // the 5th of a root-0 dominant-7
    });
});
