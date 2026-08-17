import { describe, expect, it } from 'vitest';

import {
    getVoicingShapeMetrics,
    getVoicingTechniqueTag,
    rankVoicingCandidates,
    scoreResolvedVoicing,
} from './deductiveRanking';
import { getFretDistanceMm } from './fretGeometry';
import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, resolveChordRegistryEntry } from './helpers';
import { resolveVoicingTemplate } from './resolver';
import type { ResolvedVoicing, ResolvedVoicingNote, VoicingDescriptor } from './types';

function voicingFromNotes(notes: ResolvedVoicingNote[], descriptor?: Partial<VoicingDescriptor>): ResolvedVoicing {
    return {
        notes,
        descriptor: { family: 'close', ...descriptor },
    } as unknown as ResolvedVoicing;
}

function note(string: number, fret: number): ResolvedVoicingNote {
    return { string: string as ResolvedVoicingNote['string'], fret, pitchClass: 0, isMuted: false };
}
function muted(string: number): ResolvedVoicingNote {
    return { string: string as ResolvedVoicingNote['string'], fret: -1, pitchClass: -1, isMuted: true };
}

describe('getVoicingShapeMetrics — barre-aware grouping and mute naturalness', () => {
    it('does not treat two independent fingers that coincidentally share a fret as a barre (open G)', () => {
        const voicing = voicingFromNotes([
            note(5, 3), note(4, 2), note(3, 0), note(2, 0), note(1, 0), note(0, 3),
        ]);

        const metrics = getVoicingShapeMetrics(voicing);

        expect(metrics.barreNoteCount).toBe(0);
        // 6 played notes, but only 4 independent fingers (fret2, fret3-string5, fret3-string0,
        // and nothing for the 3 open strings) — well below the 4-finger budget.
        expect(metrics.fingerGroupCount).toBeLessThanOrEqual(4);
    });

    it('recognizes a real forced barre and counts it as one finger regardless of width (classic F-shape)', () => {
        const voicing = voicingFromNotes([
            note(5, 1), note(4, 1), note(3, 3), note(2, 2), note(1, 1), note(0, 1),
        ]);

        const metrics = getVoicingShapeMetrics(voicing);

        expect(metrics.barreNoteCount).toBe(4);
        // 1 barre finger + 2 independent fingers (fret3, fret2) = 3 fingers total, not 6.
        expect(metrics.fingerGroupCount).toBe(3);
    });

    it('treats a mute next to a fretted finger as nearly free, but an isolated mute as costly', () => {
        const adjacentMute = voicingFromNotes([
            muted(5), note(4, 3), muted(3), note(2, 2), note(1, 1), note(0, 0),
        ]);
        const isolatedMute = voicingFromNotes([
            muted(5), note(4, 0), muted(3), muted(2), note(1, 1), note(0, 0),
        ]);

        expect(getVoicingShapeMetrics(adjacentMute).isolatedInternalMuteCount).toBe(0);
        expect(getVoicingShapeMetrics(isolatedMute).isolatedInternalMuteCount).toBeGreaterThan(0);
    });

    it('penalizes an isolated mute flanked by open strings worse than one flanked by anything else', () => {
        const openFlanked = voicingFromNotes([
            note(5, 3), note(4, 2), note(3, 0), muted(2), note(1, 0), note(0, 0),
        ]);
        const mutedFlanked = voicingFromNotes([
            note(4, 2), muted(3), muted(2), muted(1), note(0, 0),
        ]);

        expect(getVoicingShapeMetrics(openFlanked).openFlankedIsolatedMuteCount).toBe(1);
        expect(getVoicingShapeMetrics(mutedFlanked).openFlankedIsolatedMuteCount).toBe(0);
    });

    // Regression: this used to carry a "two overlapping barres" penalty, on the assumption that a
    // low barre's range overlapping a separate higher-fret barre's range was a rare, physically
    // awkward double-barre. It isn't — this exact shape (x-3-x-5-3-3 muted at strings 2 and 5 aside)
    // is the classic movable A-shape barre chord: the index finger flat-barres the low fret across
    // the full width while a second finger arches over a subset of those same strings at a higher
    // fret in front of it (canFormBarre's own "in front of the barre" case). A rigorous check of
    // canFormBarre's rules shows two *simultaneously valid* forced barres can only ever be nested
    // this way — a staggered (non-nested) overlap always leaves one barre's real fretted note
    // sitting behind the other's span, which canFormBarre already rejects — so "two overlapping
    // barres" was unreachable as a real penalty case and has been removed rather than patched.
    it('does not penalize the classic A-shape/E-shape movable barre chord (a low barre nested under a higher one)', () => {
        const voicing = voicingFromNotes([
            muted(5), note(4, 3), note(3, 5), muted(2), note(1, 5), note(0, 3),
        ]);

        const metrics = getVoicingShapeMetrics(voicing);

        expect(metrics.barreNoteCount).toBe(2);
    });

    it('computes real physical hand span (mm) using the fretboard log-spacing formula, not raw fret count', () => {
        // Same 3-fret raw span, but the true mm distance shrinks the higher up the neck it sits —
        // this is the entire reason the new scorer uses mm instead of the old fret-count buckets.
        const nearNut = voicingFromNotes([note(4, 1), note(3, 4)]);
        const higherUp = voicingFromNotes([note(4, 9), note(3, 12)]);

        const nearNutMetrics = getVoicingShapeMetrics(nearNut);
        const higherUpMetrics = getVoicingShapeMetrics(higherUp);

        expect(nearNutMetrics.spanMm).toBeCloseTo(getFretDistanceMm(1, 4), 5);
        expect(higherUpMetrics.spanMm).toBeCloseTo(getFretDistanceMm(9, 12), 5);
        expect(nearNutMetrics.spanMm).toBeGreaterThan(higherUpMetrics.spanMm);
    });

    it('does not count open strings toward hand span at all', () => {
        const voicing = voicingFromNotes([note(4, 0), note(3, 0), note(2, 0)]);

        expect(getVoicingShapeMetrics(voicing).spanMm).toBe(0);
    });
});

describe('getVoicingTechniqueTag — shell/barre/open/standard classification', () => {
    it('tags a coincidental same-fret open shape as open, not barre', () => {
        const voicing = voicingFromNotes([
            note(5, 3), note(4, 2), note(3, 0), note(2, 0), note(1, 0), note(0, 3),
        ]);

        expect(getVoicingTechniqueTag(voicing)).toBe('open');
    });

    it('tags a classic F-shape barre as barre', () => {
        const voicing = voicingFromNotes([
            note(5, 1), note(4, 1), note(3, 3), note(2, 2), note(1, 1), note(0, 1),
        ]);

        expect(getVoicingTechniqueTag(voicing)).toBe('barre');
    });

    it('tags a family: shell voicing as shell regardless of the underlying notes', () => {
        const voicing = voicingFromNotes([note(4, 3), note(3, 2), note(2, 1)], { family: 'shell' });

        expect(getVoicingTechniqueTag(voicing)).toBe('shell');
    });

    it('tags a mid-neck grip with no open strings and no barre as standard', () => {
        const voicing = voicingFromNotes([note(4, 5), note(3, 4), note(2, 3)]);

        expect(getVoicingTechniqueTag(voicing)).toBe('standard');
    });

    it('prefers barre over open when a voicing has both a real (3+ string) barre and an unrelated open string', () => {
        const voicing = voicingFromNotes([
            note(4, 1), note(3, 1), note(2, 1), note(1, 3), note(0, 0),
        ]);

        expect(getVoicingTechniqueTag(voicing)).toBe('barre');
    });

    it('does not tag two adjacent strings that merely coincide on the same fret as barre (open Am)', () => {
        const voicing = voicingFromNotes([
            note(3, 2), note(2, 2), note(1, 1), note(0, 0),
        ]);

        expect(getVoicingTechniqueTag(voicing)).toBe('open');
    });
});

describe('scoreResolvedVoicing — deductive scoring terms', () => {
    it('rewards fuller open/barre voicings (>=5 strings ringing) but not shell/standard voicings', () => {
        const entry = resolveChordRegistryEntry('major');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);

        const sparseOpen = resolveVoicingTemplate(chord, tones, {
            id: 'sparse-open-major',
            label: 'sparse open',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: null },
                { string: 2, fretOffset: 0, toneDegree: '5', isOptional: true },
                { string: 3, fretOffset: 2, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 0 });

        const fullOpen = resolveVoicingTemplate(chord, tones, {
            id: 'full-open-major',
            label: 'full open',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '1' },
                { string: 1, fretOffset: 1, toneDegree: '5', isOptional: true },
                { string: 2, fretOffset: 0, toneDegree: '1' },
                { string: 3, fretOffset: 2, toneDegree: '3' },
                { string: 4, fretOffset: 3, toneDegree: '5', isOptional: true },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 0 });

        const sparseScore = scoreResolvedVoicing(sparseOpen, entry, tones);
        const fullScore = scoreResolvedVoicing(fullOpen, entry, tones);

        expect(sparseScore.reasons.some((reason) => reason.includes('Full open voicing'))).toBe(false);
        expect(fullScore.reasons.some((reason) => reason.includes('Full open voicing'))).toBe(true);
    });

    it('counts optional/color-tone retention exactly once (regression for the old double-counted bonus)', () => {
        const entry = resolveChordRegistryEntry('dominant-9');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const withOptionalFifth = resolveVoicingTemplate(chord, tones, {
            id: 'dom9-with-5th',
            label: 'with 5th',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5', isOptional: true },
                { string: 1, fretOffset: 0, toneDegree: '9' },
                { string: 2, fretOffset: 0, toneDegree: 'b7' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        const score = scoreResolvedVoicing(withOptionalFifth, entry, tones);
        const colorToneReasons = score.reasons.filter((reason) => reason.toLowerCase().includes('color tone'));

        expect(colorToneReasons.length).toBe(1);
    });

    it('does not penalize a voicing when its chord has no registry root-string hint configured', () => {
        const entry = resolveChordRegistryEntry('major');
        const entryWithoutHint = { ...entry, voicingHint: undefined };
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        // Single root on string 1 only — outside major's [5,4,3] hint, and not duplicated
        // anywhere that would match it.
        const voicing = resolveVoicingTemplate(chord, tones, {
            id: 'no-hint-major',
            label: 'no hint',
            instrument: 'guitar',
            rootString: 1,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: -1, toneDegree: '5' },
                { string: 1, fretOffset: 0, toneDegree: '1' },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: null },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        const scoreWithHint = scoreResolvedVoicing(voicing, entry, tones);
        const scoreWithoutHint = scoreResolvedVoicing(voicing, entryWithoutHint, tones);

        // This fixture's only root sits on string 1, outside major's [5,4,3] hint, so the "with
        // hint" score should carry a hint-mismatch penalty the "without hint" one must not.
        expect(scoreWithHint.reasons.some((r) => r.toLowerCase().includes('hint'))).toBe(true);
        expect(scoreWithoutHint.reasons.some((r) => r.toLowerCase().includes('hint'))).toBe(false);
        expect(scoreWithoutHint.score).toBeGreaterThan(scoreWithHint.score);
    });

    it('prefers a barre (one finger) over an equally-spanned shape needing four independent fingers', () => {
        const entry = resolveChordRegistryEntry('major');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);

        // Real F-shape-style barre: fret1 across the full width, D/G arch in front at fret3/2.
        const barreShape = resolveVoicingTemplate(chord, tones, {
            id: 'finger-economy-barre',
            label: 'barre',
            instrument: 'guitar',
            rootString: 5,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '1' },
                { string: 1, fretOffset: 0, toneDegree: '5' },
                { string: 2, fretOffset: 1, toneDegree: '1' },
                { string: 3, fretOffset: 2, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '5' },
                { string: 5, fretOffset: 0, toneDegree: '1' },
            ],
        }, { rootFret: 1 });

        const scored = scoreResolvedVoicing(barreShape, entry, tones);

        expect(getVoicingShapeMetrics(barreShape).fingerGroupCount).toBe(3);
        expect(scored.reasons.some((r) => r.includes('independent fretting finger'))).toBe(true);
    });

    it('does not penalize the standard A-shape movable barre C major (x-3-5-5-5-3) as an overlapping-barre case', () => {
        // Regression for a real reported issue: this exact shape used to carry a "Needs two
        // overlapping barres" penalty (-30) purely because the low fret-3 barre's numeric string
        // range (0-4) contains the higher fret-5 barre's range (1-3) — but that's just the
        // ordinary A-shape technique, not a rare double-barre. See the nested-barre test in
        // getVoicingShapeMetrics above for the underlying fix.
        const entry = resolveChordRegistryEntry('major');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);

        const aShapeBarre = resolveVoicingTemplate(chord, tones, {
            id: 'a-shape-barre-c-major',
            label: 'A-shape barre',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '5' },
                { string: 1, fretOffset: 2, toneDegree: '3' },
                { string: 2, fretOffset: 2, toneDegree: '1' },
                { string: 3, fretOffset: 2, toneDegree: '5' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        expect(getVoicingTechniqueTag(aShapeBarre)).toBe('barre');

        const scored = scoreResolvedVoicing(aShapeBarre, entry, tones);

        expect(scored.reasons.some((r) => r.toLowerCase().includes('overlapping barre'))).toBe(false);
    });

    // USER INSTRUCTION (explicitly requested): an Open-technique voicing that mutes one of
    // strings 2-4 (the B/G/D core) should be penalized, on top of whatever the general
    // mute-naturalness terms above already apply — see OPEN_INNER_STRING_INDICES in
    // deductiveRanking.ts.
    it('penalizes an Open voicing that mutes an inner string (2-4), and explains why', () => {
        const entry = resolveChordRegistryEntry('major');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);

        const openStrings = {
            id: 'open-inner-string-played',
            label: 'open, inner string played',
            instrument: 'guitar' as const,
            rootString: 4 as const,
            source: 'generated' as const,
            strings: [
                { string: 0 as const, fretOffset: 0, toneDegree: '1' },
                { string: 1 as const, fretOffset: 1, toneDegree: '5', isOptional: true },
                { string: 2 as const, fretOffset: 0, toneDegree: '1' },
                { string: 3 as const, fretOffset: 2, toneDegree: '3' },
                { string: 4 as const, fretOffset: 3, toneDegree: '5', isOptional: true },
                { string: 5 as const, fretOffset: null },
            ],
        };
        const openWithInnerMute = {
            ...openStrings,
            id: 'open-inner-string-muted',
            label: 'open, inner string muted',
            strings: openStrings.strings.map((s) => (s.string === 1 ? { string: 1 as const, fretOffset: null } : s)),
        };

        const playedVoicing = resolveVoicingTemplate(chord, tones, openStrings, { rootFret: 0 });
        const mutedVoicing = resolveVoicingTemplate(chord, tones, openWithInnerMute, { rootFret: 0 });

        expect(getVoicingTechniqueTag(playedVoicing)).toBe('open');
        expect(getVoicingTechniqueTag(mutedVoicing)).toBe('open');

        const playedScore = scoreResolvedVoicing(playedVoicing, entry, tones);
        const mutedScore = scoreResolvedVoicing(mutedVoicing, entry, tones);

        expect(mutedScore.reasons.some((r) => r.includes('mutes') && r.includes('strings 2-4'))).toBe(true);
        expect(playedScore.reasons.some((r) => r.includes('strings 2-4'))).toBe(false);
        expect(mutedScore.score).toBeLessThan(playedScore.score);
    });

    it('does not apply the open-inner-mute penalty to a Barre-technique voicing', () => {
        const entry = resolveChordRegistryEntry('major');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);

        // Same F-shape-style barre as above, but string 2 (an inner string) is muted instead of
        // independently fretted — still a real barre (fret-1 group across strings 0,1,4,5).
        const barreWithInnerMute = resolveVoicingTemplate(chord, tones, {
            id: 'barre-inner-mute',
            label: 'barre with inner mute',
            instrument: 'guitar',
            rootString: 5,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: 0, toneDegree: '1' },
                { string: 1, fretOffset: 0, toneDegree: '5' },
                { string: 2, fretOffset: null },
                { string: 3, fretOffset: 2, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '5' },
                { string: 5, fretOffset: 0, toneDegree: '1' },
            ],
        }, { rootFret: 1 });

        expect(getVoicingTechniqueTag(barreWithInnerMute)).toBe('barre');

        const scored = scoreResolvedVoicing(barreWithInnerMute, entry, tones);

        expect(scored.reasons.some((r) => r.includes('strings 2-4'))).toBe(false);
    });
});

describe('rankVoicingCandidates', () => {
    it('sorts best-score-first and every candidate carries a score/reasons', () => {
        const entry = resolveChordRegistryEntry('major');
        const chord = buildChordDefinitionFromRegistryEntry(entry, 0);
        const tones = buildChordTonesFromRegistryEntry(entry, 0);
        const compact = resolveVoicingTemplate(chord, tones, {
            id: 'compact',
            label: 'compact',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: -2, toneDegree: '1' },
                { string: 2, fretOffset: -3, toneDegree: '5' },
                { string: 3, fretOffset: -1, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });
        const wide = resolveVoicingTemplate(chord, tones, {
            id: 'wide',
            label: 'wide',
            instrument: 'guitar',
            rootString: 4,
            source: 'generated',
            strings: [
                { string: 0, fretOffset: null },
                { string: 1, fretOffset: 7, toneDegree: '1' },
                { string: 2, fretOffset: 3, toneDegree: '5' },
                { string: 3, fretOffset: 4, toneDegree: '3' },
                { string: 4, fretOffset: 0, toneDegree: '1' },
                { string: 5, fretOffset: null },
            ],
        }, { rootFret: 3 });

        const ranked = rankVoicingCandidates([wide, compact], entry, tones);

        for (const candidate of ranked) {
            expect(typeof candidate.score).toBe('number');
            expect(candidate.reasons.length).toBeGreaterThan(0);
        }
        expect(ranked[0].voicing.id).toBe(compact.id);
    });
});
