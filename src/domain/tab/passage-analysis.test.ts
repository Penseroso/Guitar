import { describe, expect, it } from 'vitest';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { getKeyName } from '@/domain/shared/keys';
import { analyzeTabSelection } from './analysis';
import type { TabAnalysisContext, TabDocument } from './types';

const noContext: TabAnalysisContext = { scale: null, chord: null, frame: null };
const cMajor: TabAnalysisContext = { ...noContext, scale: createScaleRef('Diatonic Modes', 'Ionian', 0) };
function analyze(moments: number[][], context = noContext) {
    const document: TabDocument = {
        format: 'ascii', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0, measureCount: 1,
        moments: moments.map((pitches, index) => ({
            id: `m${index}`, index, column: index, measure: 1,
            notes: pitches.map((midi, string) => ({ id: `${index}:${string}`, string, fret: 0, midi,
                pitchClass: midi % 12, source: { line: string + 1, column: index + 1 } })),
        })),
    };
    return analyzeTabSelection(document, { start: 0, end: moments.length - 1 }, context);
}

describe('ordered tab passage analysis', () => {
    it('describes C D E as ascending intervals without inventing a chord or duration', () => {
        const result = analyze([[60], [62], [64]], cMajor);
        expect(result.texture).toBe('monophonic');
        expect(result.melodicRuns[0].contour).toBe('ascending');
        expect(result.melodicRuns[0].intervals.map(step => step.interval)).toEqual([
            { semitones: 2, direction: 'up', label: 'M2', generic: 2, quality: 'M' },
            { semitones: 2, direction: 'up', label: 'M2', generic: 2, quality: 'M' },
        ]);
        expect(result.candidates).toEqual([]);
        expect(result.chordSequence).toEqual([]);
        expect(result.arpeggios).toEqual([]);
        expect(result.moments[0]).not.toHaveProperty('duration');
        expect(result).not.toHaveProperty('cadence');
    });

    it('describes C D C as an up/down contour without asserting neighbor-tone harmony', () => {
        const result = analyze([[60], [62], [60]], cMajor);
        expect(result.melodicRuns[0].contour).toBe('mixed');
        expect(result.melodicRuns[0].intervals.map(step => step.interval.semitones)).toEqual([2, -2]);
        expect(result.notes.every(note => note.chordMember === null)).toBe(true);
        expect(result.roman).toBeNull();
    });

    it('uses semitone labels without a spelling context, even when generic defaults look conventional', () => {
        expect(analyze([[60], [64]]).melodicRuns[0].intervals[0].interval).toMatchObject({ label: '4 st', generic: null, quality: null });
    });

    it('distinguishes a diminished fourth from a major third using contextual spelling', () => {
        const result = analyze([[60], [64]], { ...noContext, scale: createScaleRef('Jazz Minor Modes', 'Altered scale', 0) });
        expect(result.notes.map(note => note.name)).toEqual(['C4', 'F♭4']);
        expect(result.melodicRuns[0].intervals[0].interval).toMatchObject({ label: 'd4', semitones: 4 });
    });

    it('describes successive thirds under an explicit low/high correspondence assumption', () => {
        const result = analyze([[60, 64], [62, 65], [64, 67]], cMajor);
        expect(result.texture).toBe('dyads');
        expect(result.moments.map(moment => moment.interval?.label)).toEqual(['M3', 'm3', 'm3']);
        expect(result.dyadMotions.map(motion => motion.kind)).toEqual(['parallel', 'parallel']);
        expect(result.dyadMotions.every(motion => motion.assumption === 'low-to-low-high-to-high')).toBe(true);
        expect(result.melodicRuns).toEqual([]);
        expect(result.chordSequence).toEqual([]);
    });

    it.each([
        { pairs: [[60, 67], [62, 65]], kind: 'contrary' },
        { pairs: [[60, 67], [60, 69]], kind: 'oblique' },
        { pairs: [[60, 67], [60, 67]], kind: 'static' },
        { pairs: [[60, 64], [62, 69]], kind: 'similar' },
    ])('identifies $kind motion without asserting performed voices', ({ pairs, kind }) => {
        expect(analyze(pairs, cMajor).dyadMotions[0].kind).toBe(kind);
    });

    it('retains arpeggio collection candidates separately from simultaneous chord readings', () => {
        const result = analyze([[60], [64], [67], [72]], cMajor);
        expect(result.arpeggios).toHaveLength(1);
        expect(result.arpeggios[0]).toMatchObject({ start: 0, end: 3, provenance: 'pitch-collection' });
        expect(result.arpeggios[0].candidates.some(candidate => candidate.key === '0:major')).toBe(true);
        expect(result.candidates).toEqual([]);
        expect(result.moments.every(moment => moment.candidates.length === 0)).toBe(true);
        expect(result.chordSequence).toEqual([]);
    });

    it('finds bounded arpeggio collections inside a longer melody without assigning accompaniment', () => {
        const result = analyze([[60], [64], [67], [62], [65], [69], [71], [72]], cMajor);
        expect(result.arpeggios).toContainEqual(expect.objectContaining({ start: 0, end: 3, provenance: 'pitch-collection' }));
        expect(result.arpeggios).toContainEqual(expect.objectContaining({ start: 3, end: 6, provenance: 'pitch-collection' }));
        expect(result.arpeggios.every(item => item.candidates.every(candidate => candidate.match === 'exact'))).toBe(true);
        expect(result.chordSequence).toEqual([]);
    });

    it('retains exact seventh arpeggios and suppresses their contained triad fragments', () => {
        const result = analyze([[67], [71], [74], [77]], cMajor);
        expect(result.arpeggios).toHaveLength(1);
        expect(result.arpeggios[0]).toMatchObject({ start: 0, end: 3, provenance: 'pitch-collection' });
        expect(result.arpeggios[0].candidates.map(candidate => candidate.key)).toEqual(['7:dominant-7']);
        expect(result.moments.every(moment => moment.kind === 'single-note' && moment.candidates.length === 0)).toBe(true);
    });

    it('retains Am7/C6 ambiguity in a four-tone arpeggio rather than forcing the root', () => {
        const result = analyze([[57], [60], [64], [67]], cMajor);
        expect(result.arpeggios).toHaveLength(1);
        expect(result.arpeggios[0].candidates.map(candidate => candidate.key)).toEqual(expect.arrayContaining(['9:minor-7', '0:major-6']));
        expect(result.progressionReadings).toEqual([]);
    });

    it('keeps a complete triad subwindow when a fourth tone has no exact formula match', () => {
        const result = analyze([[60], [64], [67], [61]], cMajor);
        expect(result.arpeggios).toContainEqual(expect.objectContaining({ start: 0, end: 2 }));
        expect(result.arpeggios.some(item => item.start === 0 && item.end === 3)).toBe(false);
    });

    it('does not collapse five distinct scale notes into one supported arpeggio collection', () => {
        const result = analyze([[60], [62], [64], [65], [67]], cMajor);
        expect(result.arpeggios.some(item => item.start === 0 && item.end === 4)).toBe(false);
        expect(result.arpeggios.every(item => item.candidates.every(candidate => candidate.match === 'exact'))).toBe(true);
    });

    it('bounds arpeggio windows at explicit measures, blanks and simultaneous notes', () => {
        const document: TabDocument = { format: 'authored', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40],
            capo: 0, measureCount: 2, moments: [60, 64, 67].map((midi, index) => ({ id: `m${index}`, index,
                column: index, measure: index === 2 ? 2 : 1, notes: [{ id: `n${index}`, string: 0, fret: 0,
                    midi, pitchClass: midi % 12, source: null }] })) };
        expect(analyzeTabSelection(document, { start: 0, end: 2 }, cMajor).arpeggios).toEqual([]);
        expect(analyze([[60], [64], [], [67]], cMajor).arpeggios).toEqual([]);
        expect(analyze([[60], [64, 67], [67]], cMajor).arpeggios).toEqual([]);
    });

    it('keeps a long repeated collection bounded without one annotation per starting note', () => {
        const result = analyze(Array.from({ length: 1024 }, (_, index) => [[60], [64], [67]][index % 3]), cMajor);
        expect(result.arpeggios).toHaveLength(64);
        expect(result.arpeggios.every(item => item.end - item.start < 16)).toBe(true);
        expect(result.arpeggios[0]).toMatchObject({ start: 0, end: 15 });
        expect(result.arpeggios.at(-1)).toMatchObject({ start: 1008, end: 1023 });
    });

    it('analyzes mixed passages in order and never treats polyphony as a single melodic jump', () => {
        const result = analyze([[60], [62], [60, 64], [60, 64, 67], [65], [64]], cMajor);
        expect(result.texture).toBe('mixed');
        expect(result.moments.map(moment => moment.kind)).toEqual(['single-note', 'single-note', 'dyad', 'chord', 'single-note', 'single-note']);
        expect(result.melodicRuns.map(run => [run.start, run.end])).toEqual([[0, 1], [4, 5]]);
        expect(result.moments[3].candidates.some(candidate => candidate.name === 'C')).toBe(true);
    });

    it('resets continuity at an empty editor moment without declaring it a rest', () => {
        const result = analyze([[60], [62], [], [64], [67]], cMajor);
        expect(result.melodicRuns.map(run => [run.start, run.end])).toEqual([[0, 1], [3, 4]]);
        expect(result.arpeggios).toEqual([]);
        expect(result.moments[2]).toMatchObject({ kind: 'empty', interval: null, candidates: [] });
        expect(result.moments[2]).not.toHaveProperty('rest');
        expect(analyze([[]])).toMatchObject({ texture: 'empty', selectionKind: 'passage', notes: [], melodicRuns: [] });
    });

    it('preserves repeated attacks and repeated interval patterns across strings', () => {
        const result = analyze([[60], [62], [64], [65], [67], [69]], cMajor);
        expect(result.repeatedPatterns).toContainEqual({ semitones: [2, 2], occurrences: [{ start: 0, end: 2 }, { start: 3, end: 5 }] });
        const repeated = analyze([[60], [60], [60]], cMajor);
        expect(repeated.melodicRuns[0].contour).toBe('level');
        expect(repeated.melodicRuns[0].intervals.map(step => step.interval.label)).toEqual(['P1', 'P1']);
        expect(repeated.notes).toHaveLength(3);
    });

    it('keeps chord sequence alternatives and Romans conditional on the supplied key', () => {
        const pitches = [[57, 60, 64, 67], [59, 62, 65, 67], [60, 64, 67]];
        const result = analyze(pitches, { ...cMajor, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } });
        expect(result.chordSequence).toHaveLength(3);
        const first = result.chordSequence[0];
        expect(first.continues).toBe(false);
        expect(first.candidates.filter(candidate => candidate.match === 'exact').map(candidate => candidate.name)).toEqual(expect.arrayContaining(['Am7', 'C6']));
        expect(first.candidates.find(candidate => candidate.name === 'Am7')?.roman).toBe('vi7');
        expect(result.chordSequence[1].continues).toBe(true);
        expect(result.notes.every(note => note.chordMember === null)).toBe(true);
        expect(result.roman).toBeNull();
        expect(analyze(pitches).chordSequence.every(item => item.candidates.every(candidate => candidate.roman === null))).toBe(true);
        expect(result).not.toHaveProperty('cadence');
    });

    it('does not bridge an empty slot into a chord sequence', () => {
        expect(analyze([[60, 64, 67], [], [62, 65, 69]], cMajor).chordSequence).toEqual([]);
        const result = analyze([[60, 64, 67], [62, 65, 69], [], [60, 64, 67], [65, 69, 72]], cMajor);
        expect(result.chordSequence.map(item => item.continues)).toEqual([false, true, false, true]);
    });

    it.each(Array.from({ length: 12 }, (_, tonic) => tonic))('spells inferred diatonic chord roots in the explicit key at tonic %i', tonic => {
        const result = analyze([[62, 65, 69], [67, 71, 74]].map(pitches => pitches.map(midi => midi + tonic)), {
            ...noContext, frame: { tonic: getKeyName(tonic), mode: 'major', lens: 'jazz-pop' },
        });
        const ii = result.chordSequence[0].candidates.find(candidate => candidate.key === `${(tonic + 2) % 12}:minor`);
        expect(ii?.roman).toBe('ii');
        if (tonic === 11) expect(ii?.name).toBe('C♯m');
    });

    it('keeps a chromatic-root chord candidate without guessing its functional spelling', () => {
        const result = analyze([[61, 65, 68], [60, 64, 67]], {
            ...noContext, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' },
        });
        expect(result.chordSequence[0].candidates.find(candidate => candidate.key === '1:major')).toMatchObject({ name: 'D♭', roman: null });
    });

    it.each(Array.from({ length: 12 }, (_, tonic) => tonic))('observes a bounded ii–V–I pattern in explicit major key %i', tonic => {
        const result = analyze([[62, 65, 69], [67, 71, 74, 77], [60, 64, 67, 71]].map(pitches => pitches.map(midi => midi + tonic)), {
            ...noContext, frame: { tonic: getKeyName(tonic), mode: 'major', lens: 'jazz-pop' },
        });
        expect(result.progressionReadings).toHaveLength(1);
        expect(result.progressionReadings[0]).toMatchObject({ start: 0, end: 2, label: 'ii–V–I pattern' });
        expect(result.progressionReadings[0].evidence).toContain('Unique exact chord-formula matches');
        expect(result.progressionReadings[0].evidence).toContain('Phrase ending and harmonic function are not established');
    });

    it.each([
        { pitches: [[67, 71, 74], [60, 64, 67]], label: 'V–I motion' },
        { pitches: [[67, 71, 74, 77], [60, 64, 67, 71]], label: 'V–I motion' },
        { pitches: [[65, 69, 72], [60, 64, 67]], label: 'IV–I motion' },
        { pitches: [[65, 69, 72, 76], [60, 64, 67, 71]], label: 'IV–I motion' },
    ])('observes $label without claiming a cadence', ({ pitches, label }) => {
        const result = analyze(pitches, { ...noContext, frame: { tonic: 'C', mode: 'major', lens: 'classical' } });
        expect(result.progressionReadings).toEqual([expect.objectContaining({ start: 0, end: 1, label })]);
        expect(result.progressionReadings[0].label).not.toMatch(/cadence/i);
    });

    it('does not resolve exact Dm7/F6 ambiguity to force a ii–V–I', () => {
        const result = analyze([[62, 65, 69, 72], [67, 71, 74, 77], [60, 64, 67]], {
            ...noContext, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' },
        });
        expect(result.moments[0].candidates.filter(candidate => candidate.match === 'exact').map(candidate => candidate.name)).toEqual(expect.arrayContaining(['Dm7', 'F6']));
        expect(result.progressionReadings).toEqual([expect.objectContaining({ start: 1, end: 2, label: 'V–I motion' })]);
    });

    it('abstains on an ambiguous C6/Am7 arrival or an incomplete/extra-note dominant', () => {
        const context: TabAnalysisContext = { ...noContext, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } };
        expect(analyze([[67, 71, 74], [60, 64, 67, 69]], context).progressionReadings).toEqual([]);
        expect(analyze([[67, 71, 77], [60, 64, 67]], context).progressionReadings).toEqual([]);
        expect(analyze([[67, 71, 74, 68], [60, 64, 67]], context).progressionReadings).toEqual([]);
    });

    it.each([[], [62], [62, 65]].map(interruption => ({ interruption })))('does not infer a progression across a non-chord column $interruption', ({ interruption }) => {
        const result = analyze([[67, 71, 74], interruption, [60, 64, 67]], {
            ...noContext, frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' },
        });
        expect(result.progressionReadings).toEqual([]);
    });

    it('requires an explicit supported major frame and does not reuse the reference scale as a key', () => {
        const pitches = [[67, 71, 74], [60, 64, 67]];
        expect(analyze(pitches).progressionReadings).toEqual([]);
        expect(analyze(pitches, cMajor).progressionReadings).toEqual([]);
        expect(analyze(pitches, { ...cMajor, frame: { tonic: 'C', mode: 'minor', lens: 'jazz-pop' } }).progressionReadings).toEqual([]);
        expect(analyze(pitches, { ...cMajor, frame: { tonic: 'D', mode: 'major', lens: 'jazz-pop' } }).progressionReadings).toEqual([]);
    });
});
