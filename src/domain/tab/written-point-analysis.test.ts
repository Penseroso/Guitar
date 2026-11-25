import { describe, expect, it } from 'vitest';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { buildTabChordCandidates } from './chord-candidates';
import { analyzeTabWrittenPoint, describeTabWrittenPointCandidate, type TabWrittenPointCompleteAnalysis, type TabWrittenPointReferences } from './written-point-analysis';
import { observeTabAcrossBarsWrittenTime } from './written-time-across-bars';
import type { TabDocument } from './types';

const fraction = (numerator: number, denominator = 1) => ({ numerator, denominator });
const time = (numerator: number, denominator = 1) => ({ numerator: String(numerator), denominator: String(denominator) });
const references: TabWrittenPointReferences = { scale: null, frame: null };
const frame = { tonic: 'C', mode: 'major', lens: 'jazz-pop' } as const;
const scale = createScaleRef('Diatonic Modes', 'Ionian', 0);
function score(midis: number[]): TabDocument {
    return { format: 'authored', timing: 'order-only', source: '', tuningMidi: [64, 59, 55, 50, 45, 40], capo: 0, measureCount: 2, meter: { numerator: 4, denominator: 4 },
        moments: [{ id: 'm', index: 0, measure: 1, column: 0, beatOffset: fraction(0), notes: midis.map((midi, index) => ({ id: `n${index}`, string: index % 6, fret: 0, midi, pitchClass: midi % 12, source: null, duration: fraction(3) })) }] };
}
const observe = (document: unknown, measure = 1) => observeTabAcrossBarsWrittenTime(document, measure, { model: 'regular-bar-origins' });
function complete(midis: number[], refs = references): TabWrittenPointCompleteAnalysis {
    const result = analyzeTabWrittenPoint(observe(score(midis)), time(0), refs);
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') throw Error('Complete fixture required');
    return result;
}

describe('written point analysis eligibility', () => {
    it('uses point completeness rather than requiring complete global population', () => {
        const document = score([60, 64, 67]);
        document.moments.push({ id: 'future', index: 1, column: 1, measure: 2, notes: [{ id: 'future-note', string: 1, fret: 1, midi: 60, pitchClass: 0, source: null }] });
        const snapshot = observe(document);
        expect(snapshot.data.populationCoverage).toBe('partial');
        const result = analyzeTabWrittenPoint(snapshot, time(0), references);
        expect(result.status).toBe('complete');
        if (result.status === 'complete') {
            expect(result.proof.basis).toBe('onset-exclusion');
            expect(result.proof.excluded[0].kind).toBe('bar-origin-lower-bound');
            expect(result.candidates.find(candidate => candidate.key === '0:major')).toMatchObject({ match: 'exact' });
        }
        expect(analyzeTabWrittenPoint(observe(document, 2), time(4), references)).toEqual({ status: 'partial', reason: 'incomplete-source-notes' });
    });

    it('does not analyze the known subset when any uncertainty remains at this point', () => {
        const document = score([60, 64, 67]);
        delete document.moments[0].notes[2].duration;
        const result = analyzeTabWrittenPoint(observe(document), time(0), references);
        expect(result).toEqual({ status: 'partial', reason: 'incomplete-source-notes' });
        expect(result).not.toHaveProperty('notes');
        expect(result).not.toHaveProperty('candidates');
        expect(describeTabWrittenPointCandidate(result, '0:major')).toBeNull();
    });

    it('passes through invalid query, unavailable, outside-window, unreadable and no-range without observations', () => {
        const document = score([60, 64, 67]);
        const cases = [
            analyzeTabWrittenPoint(observe(document), null, references),
            analyzeTabWrittenPoint(observe({ ...document, meter: undefined }), time(0), references),
            analyzeTabWrittenPoint(observe(document), time(4), references),
            analyzeTabWrittenPoint(observe({ ...document, moments: [...document.moments, null] }), time(0), references),
            analyzeTabWrittenPoint(observe(score([])), time(0), references),
        ];
        expect(cases.map(result => result.status)).toEqual(['invalid-query', 'unavailable', 'outside-window', 'unreadable', 'outside-range']);
        cases.forEach(result => { expect(result).not.toHaveProperty('notes'); expect(result).not.toHaveProperty('candidates'); });
    });

    it('preserves an observed empty gap without treating it as an inferred rest', () => {
        const document = score([60]);
        document.moments[0].notes[0].duration = fraction(1);
        document.moments.push({ ...document.moments[0], id: 'later', index: 1, beatOffset: fraction(2), notes: [{ ...document.moments[0].notes[0], id: 'later-note', midi: 67, pitchClass: 7 }] });
        const result = analyzeTabWrittenPoint(observe(document), time(1), references);
        expect(result).toMatchObject({ status: 'complete', notes: [], pitchClasses: [], candidates: [], candidatePresentations: [], lowestNote: null });
    });

    it('rejects corrupted MIDI through the observer and never substitutes a raw pitch-class field', () => {
        const document = score([60, 64, 67]);
        document.moments[0].notes[0].midi = 128;
        expect(analyzeTabWrittenPoint(observe(document), time(0), references).status).toBe('partial');
        document.moments[0].notes[0].midi = 60;
        document.moments[0].notes.forEach(note => { note.pitchClass = 11; });
        const result = analyzeTabWrittenPoint(observe(document), time(0), references);
        expect(result).toMatchObject({ status: 'complete', pitchClasses: [0, 4, 7] });
    });
});

describe('written point formula facts and alternatives', () => {
    it('preserves source occurrence order and references independently of lowest pitch and PC set', () => {
        const snapshot = observe(score([72, 55, 60]));
        const result = analyzeTabWrittenPoint(snapshot, time(0), references);
        expect(result.status).toBe('complete');
        if (result.status !== 'complete') return;
        expect(result.notes.map(note => note.midi)).toEqual([72, 55, 60]);
        result.notes.forEach((note, index) => expect(note.interval).toBe(snapshot.data.intervals[index]));
        expect(result.pitchClasses).toEqual([0, 7]);
        expect(result.lowestNote).toBe(result.notes[1]);
        expect(result.twoPitchIntervalClass).toBe(5);
    });

    it('keeps two-PC alternatives invariant to octave doubling while retaining all occurrences', () => {
        const dyad = complete([60, 67]), doubled = complete([60, 67, 72]);
        expect(doubled.candidates).toEqual(dyad.candidates);
        expect(dyad.candidates.find(candidate => candidate.key === '0:power-5')).toMatchObject({ match: 'exact', name: 'C5' });
        expect(dyad.notes).toHaveLength(2);
        expect(doubled.notes).toHaveLength(3);
        expect(doubled.twoPitchIntervalClass).toBe(dyad.twoPitchIntervalClass);
        expect(describeTabWrittenPointCandidate(doubled, '0:power-5')?.notes.map(note => note.chordDegree)).toEqual(['1', '5', '1']);
    });

    it('does not assign formula candidates to a single distinct pitch, including octave doublings', () => {
        const result = complete([60, 72, 84]);
        expect(result.pitchClasses).toEqual([0]);
        expect(result.notes).toHaveLength(3);
        expect(result.candidates).toEqual([]);
        expect(result.twoPitchIntervalClass).toBeNull();
    });

    it('retains exact C6 and Am7 identities and canonical registry order', () => {
        const result = complete([60, 64, 67, 69]);
        expect(result.candidates).toEqual(buildTabChordCandidates([0, 4, 7, 9]));
        expect(result.candidates.filter(candidate => candidate.match === 'exact').map(candidate => candidate.name)).toEqual(['C6', 'Am7']);
        expect(describeTabWrittenPointCandidate(result, '0:major-6')?.notes.map(note => note.chordDegree)).toEqual(['1', '3', '5', '6']);
        expect(describeTabWrittenPointCandidate(result, '9:minor-7')?.notes.map(note => note.chordDegree)).toEqual(['b3', '5', 'b7', '1']);
        expect(describeTabWrittenPointCandidate(result, 'missing')).toBeNull();
    });

    it('leaves omissions as metadata and distinguishes extra notes in a selected hypothesis', () => {
        const result = complete([60, 64, 70]);
        const c7 = describeTabWrittenPointCandidate(result, '0:dominant-7');
        expect(c7).toMatchObject({ omitted: ['5'], added: [], notes: [{ chordDegree: '1' }, { chordDegree: '3' }, { chordDegree: 'b7' }] });
        expect(c7?.notes).toHaveLength(3);
        const cMajor = describeTabWrittenPointCandidate(result, '0:major');
        expect(cMajor).toMatchObject({ omitted: ['5'], added: [10] });
        expect(cMajor?.notes[2]).toMatchObject({ midi: 70, chordDegree: null, chordNoteName: null, chordMember: false });
        expect(result.notes.map(note => note.midi)).toEqual([60, 64, 70]);
    });

    it('does not insert a missing root or choose an ensemble bass', () => {
        const result = complete([64, 67, 70]);
        expect(result.candidates.some(candidate => candidate.key === '0:dominant-7')).toBe(false);
        expect(result.candidates.every(candidate => candidate.chord.bass === undefined)).toBe(true);
        expect(result.lowestNote?.midi).toBe(64);
    });

    it('uses the shared canonical diminished-seventh degree and its written spelling', () => {
        const result = complete([60, 63, 66, 69]);
        const description = describeTabWrittenPointCandidate(result, '0:diminished-7');
        expect(description?.notes.map(note => [note.chordDegree, note.chordNoteName])).toEqual([
            ['1', 'C4'], ['b3', 'E♭4'], ['b5', 'G♭4'], ['bb7', 'B♭♭4'],
        ]);
        expect(result.notes[3].name).toBe('A4');
        expect(description?.notes[3].midi).toBe(69);
    });

    it.each([
        { midis: [60, 64, 67], tonic: 'B#', key: '0:major', rootName: 'B♯3' },
        { midis: [59, 63, 66], tonic: 'Cb', key: '11:major', rootName: 'C♭4' },
    ])('keeps contextual $tonic spelling and written octave separate from observed MIDI', ({ midis, tonic, key, rootName }) => {
        const result = complete(midis, { scale: null, frame: { ...frame, tonic } });
        expect(result.candidates).toEqual(complete(midis).candidates);
        expect(result.candidatePresentations.find(candidate => candidate.key === key)?.root).toBe(tonic);
        expect(describeTabWrittenPointCandidate(result, key)?.notes[0]).toMatchObject({ midi: midis[0], chordDegree: '1', chordNoteName: rootName });
    });
});

describe('explicit references and snapshot preservation', () => {
    it('uses reference scale spelling/membership without turning it into a key', () => {
        const result = complete([60, 64, 66, 67], { scale, frame: null });
        expect(result.notes.map(note => [note.name, note.scaleDegree, note.inScale])).toEqual([
            ['C4', '1', true], ['E4', '3', true], ['F♯4', null, false], ['G4', '5', true],
        ]);
        expect(result.candidatePresentations.every(candidate => candidate.roman === null)).toBe(true);
    });

    it('keeps canonical identity/order context invariant and separates key-conditional Romans', () => {
        const plain = complete([62, 65, 69]);
        const contextual = complete([62, 65, 69], { scale, frame });
        expect(contextual.candidates).toEqual(plain.candidates);
        expect(contextual.candidatePresentations.find(candidate => candidate.key === '2:minor')).toMatchObject({ name: 'Dm', roman: 'ii' });
        expect(plain.candidatePresentations.every(candidate => candidate.roman === null)).toBe(true);
    });

    it('keeps chromatic-root Roman abstention and supplies no automatic secondary function', () => {
        const result = complete([61, 65, 68], { scale: null, frame });
        expect(result.candidates.find(candidate => candidate.key === '1:major')).toMatchObject({ match: 'exact' });
        expect(result.candidatePresentations.find(candidate => candidate.key === '1:major')?.roman).toBeNull();
    });

    it('keeps modal scale references independent from supported major/minor key references', () => {
        const dorian = createScaleRef('Diatonic Modes', 'Dorian', 2);
        const result = complete([62, 65, 69], { scale: dorian, frame: { ...frame, tonic: 'D', mode: 'dorian' } as never });
        expect(result.notes.map(note => note.scaleDegree)).toEqual(['1', 'b3', '5']);
        expect(result.diagnostics).toContain('The key reference is unsupported.');
        expect(result.candidatePresentations.every(candidate => candidate.roman === null)).toBe(true);
    });

    it('returns unsupported reference diagnostics without invented membership or Romans', () => {
        const result = complete([60, 64, 67], { scale: { ...scale, scaleId: 'unknown' }, frame: { ...frame, tonic: 'invalid' } });
        expect(result.diagnostics).toEqual(['The reference scale is unsupported.', 'The key reference is unsupported.']);
        expect(result.notes.every(note => note.inScale === null && note.scaleDegree === null)).toBe(true);
        expect(result.candidatePresentations.every(candidate => candidate.roman === null)).toBe(true);
        expect(result.candidates).toEqual(complete([60, 64, 67]).candidates);
    });

    it('handles malformed explicit references gracefully and ignores an unrelated chord context', () => {
        const result = complete([60, 64, 67], { scale: { tonic: NaN }, frame: false, chord: { root: 'F', chordId: 'minor' } } as never);
        expect(result.references).toEqual({ scale: null, frame: null });
        expect(result.diagnostics).toHaveLength(2);
        expect(result.candidates).toEqual(complete([60, 64, 67]).candidates);
        expect(result.notes.every(note => note.inScale === null)).toBe(true);
    });

    it('clones references, freezes output, and never mutates or rereads the source document', () => {
        const document = score([60, 64, 67]), snapshot = observe(document);
        const refs: TabWrittenPointReferences = { scale: { ...scale }, frame: { ...frame } };
        const input = JSON.stringify(document);
        const result = analyzeTabWrittenPoint(snapshot, time(0), refs);
        expect(result.status).toBe('complete');
        if (result.status !== 'complete') return;
        expect(JSON.stringify(document)).toBe(input);
        expect(Object.isFrozen(document)).toBe(false);
        expect(result.references.scale).not.toBe(refs.scale);
        expect(result.references.frame).not.toBe(refs.frame);
        refs.scale!.tonic = 2;
        refs.frame!.tonic = 'D';
        expect(result.references.scale?.tonic).toBe(0);
        expect(result.references.frame?.tonic).toBe('C');
        expect(Object.isFrozen(result.notes[0])).toBe(true);
        expect(Object.isFrozen(result.candidates[0].chord)).toBe(true);
        expect(Object.isFrozen(describeTabWrittenPointCandidate(result, '0:major')?.notes)).toBe(true);
        Object.defineProperty(document, 'moments', { get() { throw Error('Source reread'); } });
        expect(analyzeTabWrittenPoint(snapshot, time(0), references)).toMatchObject({ status: 'complete', pitchClasses: [0, 4, 7] });
        expect(() => JSON.stringify(result)).not.toThrow();
    });
});
