import type { TabChordCandidate, TabSelectionAnalysis } from './analysis';
import { createTabCandidateFormatter } from './contextual-spelling';
import { resolveScaleRef } from '@/domain/scale/scale-ref';
import { getScalePresentationName } from '@/domain/scale/scaleSelector';
import { getKeyName } from '@/domain/shared/keys';
import { formatAccidentals } from '@/domain/shared/spelling';
import type { TabAnalysisContext } from './types';

/** Snapshot annotations describe evidence at score positions, independently of the cursor. */
export interface TabScoreAnnotation {
    id: string;
    kind: 'chord' | 'roman' | 'scale' | 'interval' | 'melody' | 'repeat' | 'arpeggio' | 'progression';
    start: number;
    end: number;
    startMomentId: string;
    endMomentId: string;
    label: string;
    detail: string;
    source: 'observed' | 'candidate' | 'reference';
    placement: 'above' | 'below';
}

function namesLabel(names: string[]) {
    return names.slice(0, 4).join(' · ') + (names.length > 4 ? ` +${names.length - 4}` : '');
}

function candidateDetail(candidates: TabChordCandidate[]) {
    return candidates.map(candidate => `${candidate.name}${candidate.omitted.length ? ` (missing ${candidate.omitted.join(', ')})` : ''}${candidate.added.length ? ` (added pitch classes ${candidate.added.join(', ')})` : ''}`).join('; ');
}

/** Build compact score labels without choosing an ambiguous chord, scale or key. */
export function buildTabScoreAnnotations(
    analysis: TabSelectionAnalysis,
    context: TabAnalysisContext,
): TabScoreAnnotation[] {
    const annotations: TabScoreAnnotation[] = [];
    const momentsByIndex = new Map(analysis.moments.map(moment => [moment.index, moment]));
    const add = (kind: TabScoreAnnotation['kind'], start: number, end: number, label: string,
        detail: string, source: TabScoreAnnotation['source'], placement: TabScoreAnnotation['placement']) => {
        const first = momentsByIndex.get(start), last = momentsByIndex.get(end);
        if (!first || !last) return;
        annotations.push({ id: `${kind}:${first.id}:${last.id}:${label}`, kind, start, end,
            startMomentId: first.id, endMomentId: last.id, label, detail, source, placement });
    };
    const contextualCandidate = createTabCandidateFormatter(context.frame);

    for (const moment of analysis.moments) {
        if (moment.kind !== 'chord' || !moment.candidates.length) continue;
        const exact = moment.candidates.filter(candidate => candidate.match === 'exact').map(contextualCandidate);
        if (!exact.length) {
            add('chord', moment.index, moment.index, 'Chord candidate',
                `No complete chord formula matches these simultaneous notes. Registry alternatives: ${candidateDetail(moment.candidates.map(contextualCandidate))}.`, 'candidate', 'above');
            continue;
        }
        const source = exact.length === 1 ? 'observed' : 'candidate';
        add('chord', moment.index, moment.index, namesLabel(exact.map(candidate => candidate.name)),
            `${exact.length === 1 ? 'Complete chord-formula match' : 'Alternative complete chord-formula matches'} for these simultaneous notes: ${candidateDetail(exact)}. The ensemble bass and harmonic function are unknown.`, source, 'above');
        // Avoid presenting a partial set of Roman alternatives as a resolved reading.
        if (exact.every(candidate => candidate.roman !== null)) {
            const romans = [...new Set(exact.map(candidate => candidate.roman!))];
            add('roman', moment.index, moment.index, namesLabel(romans),
                `Conditional on the supplied ${formatAccidentals(context.frame!.tonic)} ${context.frame!.mode} key; no key or function is inferred.`, source, 'below');
        }
    }

    const nonempty = analysis.moments.filter(moment => moment.kind !== 'empty');
    if (context.scale && nonempty.length) {
        const scale = resolveScaleRef(context.scale);
        if (scale && !analysis.diagnostics.includes('The selected scale is unsupported.')) {
            const outside = analysis.notes.filter(note => note.inScale === false).length;
            add('scale', nonempty[0].index, nonempty.at(-1)!.index,
                `${formatAccidentals(getKeyName(scale.tonic))} ${getScalePresentationName(scale.name)} · reference`,
                `Supplied reference scale, not an inferred key or scale region. ${outside ? `${outside} note occurrence${outside === 1 ? '' : 's'} outside the reference collection.` : 'All observed notes belong to the reference collection.'}`, 'reference', 'above');
        }
    }

    // Consecutive equal dyad intervals share one quiet label per explicit measure.
    let dyadStart: number | null = null;
    let dyadEnd: number | null = null;
    let dyadLabel = '';
    let dyadMeasure: number | null = null;
    const flushDyad = () => {
        if (dyadStart === null || dyadEnd === null) return;
        add('interval', dyadStart, dyadEnd, dyadLabel,
            'Observed vertical interval between the lower and upper note; no hidden chord or voice assignment is inferred.', 'observed', 'below');
        dyadStart = dyadEnd = null;
    };
    for (const moment of analysis.moments) {
        if (moment.kind !== 'dyad' || !moment.interval) { flushDyad(); continue; }
        if (dyadStart !== null && (moment.interval.label !== dyadLabel || moment.measure !== dyadMeasure || moment.index !== dyadEnd! + 1)) flushDyad();
        if (dyadStart === null) { dyadStart = moment.index; dyadLabel = moment.interval.label; dyadMeasure = moment.measure; }
        dyadEnd = moment.index;
    }
    flushDyad();

    const contourLabels = { ascending: 'Ascending line', descending: 'Descending line', level: 'Repeated note', mixed: 'Melodic line' };
    for (const run of analysis.melodicRuns) {
        // A specific repeated pattern explains a mixed run better than another generic span.
        if (run.contour === 'mixed' && analysis.repeatedPatterns.some(pattern => pattern.occurrences.some(occurrence => occurrence.start >= run.start && occurrence.end <= run.end))) continue;
        add('melody', run.start, run.end, contourLabels[run.contour],
            `Observed note order: ${run.intervals.map(step => `${step.interval.direction === 'down' ? '−' : step.interval.direction === 'up' ? '+' : ''}${step.interval.label}`).join(' → ')}. Timing metadata is not interpreted by this order-only analysis.`, 'observed', 'below');
    }
    // Keep the score readable; the full ranked pattern set stays in the analysis snapshot.
    analysis.repeatedPatterns.slice(0, 1).forEach((pattern, patternIndex) => {
        for (const occurrence of pattern.occurrences) {
            add('repeat', occurrence.start, occurrence.end, `Pattern ${patternIndex + 1}`,
                `Repeated interval pattern (${pattern.semitones.map(interval => `${interval > 0 ? '+' : ''}${interval}`).join(', ')} semitones), observed ${pattern.occurrences.length} times. Timing metadata is not interpreted; this is not a confirmed rhythmic motif.`, 'observed', 'below');
        }
    });
    for (const arpeggio of analysis.arpeggios) {
        const candidates = arpeggio.candidates.map(contextualCandidate);
        add('arpeggio', arpeggio.start, arpeggio.end, `${namesLabel(candidates.map(candidate => candidate.name))} arpeggio?`,
            `Consecutive single notes match the complete pitch collection of ${candidateDetail(candidates)}. This is an arpeggio candidate, not an assertion of the actual accompaniment.`, 'candidate', 'above');
    }
    for (const span of analysis.harmonicSpans) {
        if (span.basis !== 'whole-bar-collection') continue;
        const candidates = span.candidates.map(contextualCandidate);
        const boundary = 'Only if this complete single-note bar is grouped as one harmonic collection. Bar boundaries do not establish harmonic duration or accompaniment.';
        if (candidates.every(candidate => candidate.match === 'incomplete')) {
            add('arpeggio', span.start, span.end, `${namesLabel(candidates.map(candidate => candidate.name))} (no 5)?`,
                `Possible omitted-fifth arpeggio: ${candidateDetail(candidates)}. Root, third and seventh are present; the fifth is not inserted. ${boundary}`, 'candidate', 'above');
        }
        if (candidates.every(candidate => candidate.roman !== null)) {
            add('roman', span.start, span.end, `${namesLabel([...new Set(candidates.map(candidate => candidate.roman!))])}?`,
                `Candidate readings: ${candidateDetail(candidates)}, conditional on the supplied ${formatAccidentals(context.frame!.tonic)} ${context.frame!.mode} key. ${boundary}`, 'candidate', 'below');
        }
    }
    for (const progression of analysis.progressionReadings) {
        add('progression', progression.start, progression.end, progression.label,
            progression.evidence, progression.source, 'below');
    }
    return annotations;
}
