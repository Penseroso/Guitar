import { parseNoteName, formatAccidentals } from '@/domain/shared/spelling';
import type { TonalFrame } from '@/domain/harmony/types';
import type { TabChordCandidate } from './analysis';
import type { TabAnalyzedMoment, TabProgressionReading } from './passage-analysis';
import { createTabCandidateFormatter } from './contextual-spelling';

/** Position bounds describe evidence, never a sounding chord's duration. */
export interface TabHarmonicSpan {
    start: number;
    end: number;
    measure: number;
    basis: 'simultaneous' | 'whole-bar-collection';
    candidates: TabChordCandidate[];
}

/** A deliberately small observer adapter, independent of Harmony's relation generator. */
export function buildTabHarmonicSpans(
    moments: TabAnalyzedMoment[],
    candidatesFor: (pitchClasses: number[]) => TabChordCandidate[],
    completeMeasures: ReadonlySet<number>,
): TabHarmonicSpan[] {
    const spans: TabHarmonicSpan[] = moments.filter(moment => moment.kind === 'chord' && moment.candidates.length)
        .map(moment => ({ start: moment.index, end: moment.index, measure: moment.measure, basis: 'simultaneous', candidates: moment.candidates }));
    const measures = new Map<number, TabAnalyzedMoment[]>();
    for (const moment of moments) {
        const group = measures.get(moment.measure) ?? [];
        group.push(moment); measures.set(moment.measure, group);
    }
    for (const [measure, group] of measures) {
        if (!completeMeasures.has(measure) || group.length < 3 || group.length > 16
            || group.some((moment, index) => moment.kind !== 'single-note'
                || (index > 0 && moment.index !== group[index - 1].index + 1))) continue;
        const pcs = [...new Set(group.flatMap(moment => moment.notes.map(note => note.pitchClass)))];
        if (pcs.length < 3 || pcs.length > 4) continue;
        const all = candidatesFor(pcs);
        const exact = all.filter(candidate => candidate.match === 'exact');
        // Only an absent natural fifth is tolerated, with root, third and seventh observed.
        // Never turn two notes, a missing root/third, or an added pitch into hidden harmony.
        const candidates = exact.length ? exact : all.filter(candidate => candidate.match === 'incomplete'
            && candidate.added.length === 0 && candidate.omitted.length === 1 && candidate.omitted[0] === '5'
            && ['major-7', 'minor-7', 'dominant-7', 'minor-major-7'].includes(candidate.chord.chordId)
            && pcs.includes(parseNoteName(candidate.chord.root)!.pitchClass));
        if (candidates.length) spans.push({ start: group[0].index, end: group.at(-1)!.index, measure,
            basis: 'whole-bar-collection', candidates });
    }
    return spans.sort((left, right) => left.start - right.start);
}

export function observeTabProgressions(spans: TabHarmonicSpan[], frame: TonalFrame | null): TabProgressionReading[] {
    if (!frame) return [];
    const tonic = parseNoteName(frame.tonic);
    if (!tonic) return [];
    const contextualCandidate = createTabCandidateFormatter(frame);
    const exact = spans.map(span => {
        const candidates = span.candidates.filter(candidate => candidate.match === 'exact');
        return candidates.length === 1 ? contextualCandidate(candidates[0]) : null;
    });
    const isDegree = (candidate: TabChordCandidate | null, interval: number, qualities: string[]) => {
        const root = candidate && parseNoteName(candidate.chord.root);
        return Boolean(candidate && root && root.pitchClass === (tonic.pitchClass + interval) % 12 && qualities.includes(candidate.chord.chordId));
    };
    const adjacent = (left: number, right: number) => spans[left].end + 1 === spans[right].start
        && spans[right].measure - spans[left].measure >= 0 && spans[right].measure - spans[left].measure <= 1;
    const readings: TabProgressionReading[] = [];
    for (let end = 1; end < spans.length; end++) {
        const minor = frame.mode === 'minor';
        if (!adjacent(end - 1, end) || !isDegree(exact[end], 0, minor ? ['minor', 'minor-7'] : ['major', 'major-7'])) continue;
        let start = end - 1;
        let label: string;
        if (isDegree(exact[start], 7, ['major', 'dominant-7'])) {
            if (!minor && start > 0 && adjacent(start - 1, start) && isDegree(exact[start - 1], 2, ['minor', 'minor-7'])) {
                start--; label = 'ii–V–I pattern';
            } else label = minor ? 'V–i motion' : 'V–I motion';
        } else if (isDegree(exact[start], 5, minor ? ['minor', 'minor-7'] : ['major', 'major-7'])) {
            label = minor ? 'iv–i motion' : 'IV–I motion';
        } else continue;
        const candidate = spans.slice(start, end + 1).some(span => span.basis === 'whole-bar-collection');
        const sequence = exact.slice(start, end + 1).map(chord => chord!.name).join(' → ');
        readings.push({ start: spans[start].start, end: spans[end].end, label: label + (candidate ? '?' : ''),
            source: candidate ? 'candidate' : 'observed',
            evidence: candidate
                ? `Possible ${sequence} reading in the supplied ${formatAccidentals(frame.tonic)} ${frame.mode} key, only if each complete single-note bar is grouped as one chord collection. Bar boundaries are a grouping hypothesis, not harmonic duration. Accompaniment, phrase ending and harmonic function are not established.`
                : `Unique exact chord-formula matches at adjacent columns in the supplied ${formatAccidentals(frame.tonic)} ${frame.mode} key (${sequence}). Phrase ending and harmonic function are not established.` });
    }
    return readings;
}
