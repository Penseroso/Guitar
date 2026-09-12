import { buildDeductiveChordTones } from './degreeRequirements';
import { rankVoicingCandidates } from './deductiveRanking';
import { evaluateHandPlayability, getFretDistanceMm, DEFAULT_SCALE_LENGTH_MM, DEFAULT_COMFORTABLE_HAND_SPAN_MM } from './fretGeometry';
import { resolveChordRegistryEntry } from './helpers';
import { searchDeductiveVoicings } from './voicingSearch';
import { STANDARD_GUITAR_STRING_MIDI_PITCHES } from '../shared/tuning';
import { getNoteName } from '../shared/notes';
import type { ChordRegistryEntry } from './registry';
import type { GuitarStringIndex, ResolvedVoicing, VoicingCandidate } from './types';

export type ChordPlayingContext = 'standalone' | 'accompaniment';
export interface ExplorationRequest {
    chordId: string;
    rootPitchClass: number;
    context: ChordPlayingContext;
}

// A declared, bounded search model, not a claim to enumerate every human fingering.
export const EXPLORATION_SCOPE = {
    maxFret: 15,
    tuningMidi: STANDARD_GUITAR_STRING_MIDI_PITCHES,
    scaleLengthMm: DEFAULT_SCALE_LENGTH_MM,
} as const;

export interface VoicingFacts {
    playedStrings: GuitarStringIndex[];
    midiNotes: number[];
    degrees: string[];
    omittedDegrees: string[];
    bassDegree: string;
    topDegree: string;
    bassMidi: number;
    topMidi: number;
    openStringCount: number;
    minStoppedFret: number;
    maxStoppedFret: number;
    spanMm: number;
    hasRoot: boolean;
}

export interface VoicingAssessment {
    status: 'within-model' | 'uncertain';
    estimatedFingerGroups: number;
    stretchBeyondComfort: boolean;
}

export interface ExplorationVoicing {
    voicing: ResolvedVoicing;
    facts: VoicingFacts;
    assessment: VoicingAssessment;
}

export interface ExplorationCandidate extends VoicingCandidate {
    facts: VoicingFacts;
    assessment: VoicingAssessment;
}

/** Physical identity excludes chord interpretation, generator route, ranking and labels. */
export function getPhysicalVoicingId(voicing: ResolvedVoicing, tuning: readonly number[] = EXPLORATION_SCOPE.tuningMidi): string {
    const frets = Array.from({ length: tuning.length }, (_, string) => {
        const note = voicing.notes.find((note) => note.string === string && !note.isMuted);
        return note ? String(note.fret) : 'x';
    });
    return `shape:${tuning.join(',')}:${frets.join(',')}`;
}

export function describeExplorationVoicing(voicing: ResolvedVoicing, entry: ChordRegistryEntry): ExplorationVoicing {
    const notes = voicing.notes.filter((note) => !note.isMuted).sort((a, b) => a.midiNote! - b.midiNote! || b.string - a.string);
    if (!notes.length || notes.some((note) => !Number.isInteger(note.midiNote) || !note.degree)) {
        throw new Error('Exploration requires explicit sounding pitches and degrees.');
    }
    const stopped = notes.filter((note) => note.fret > 0);
    const minStoppedFret = stopped.length ? Math.min(...stopped.map((note) => note.fret)) : 0;
    const maxStoppedFret = stopped.length ? Math.max(...stopped.map((note) => note.fret)) : 0;
    const spanMm = getFretDistanceMm(minStoppedFret, maxStoppedFret, EXPLORATION_SCOPE.scaleLengthMm);
    const hand = evaluateHandPlayability(stopped, { openStrings: notes.filter((note) => note.fret === 0).map((note) => note.string) });
    if (!hand.playable) throw new Error('Rejected shape reached exploration.');
    const degrees = entry.formula.degrees.filter((degree) => notes.some((note) => note.degree === degree));
    return {
        voicing: { ...voicing, chord: { ...voicing.chord, rootPitchClass: voicing.descriptor.rootPitchClass }, id: getPhysicalVoicingId(voicing) },
        facts: {
            playedStrings: notes.map((note) => note.string).sort((a, b) => a - b),
            midiNotes: notes.map((note) => note.midiNote!),
            degrees,
            omittedDegrees: entry.formula.degrees.filter((degree) => !degrees.includes(degree)),
            bassDegree: notes[0].degree!,
            topDegree: notes[notes.length - 1].degree!,
            bassMidi: notes[0].midiNote!,
            topMidi: notes[notes.length - 1].midiNote!,
            openStringCount: notes.filter((note) => note.fret === 0).length,
            minStoppedFret,
            maxStoppedFret,
            spanMm,
            hasRoot: degrees.includes('1'),
        },
        assessment: {
            status: hand.fingerGroupCount > 4 || spanMm > DEFAULT_COMFORTABLE_HAND_SPAN_MM ? 'uncertain' : 'within-model',
            estimatedFingerGroups: hand.fingerGroupCount,
            stretchBeyondComfort: spanMm > DEFAULT_COMFORTABLE_HAND_SPAN_MM,
        },
    };
}

export type ExplorationPool =
    | { status: 'ready'; request: ExplorationRequest; candidates: ExplorationVoicing[] }
    | { status: 'unsupported'; request: ExplorationRequest; message: string };

export function generateExplorationPool(request: ExplorationRequest): ExplorationPool {
    let entry: ChordRegistryEntry;
    try { entry = resolveChordRegistryEntry(request.chordId); }
    catch { return { status: 'unsupported', request, message: 'This chord is not supported.' }; }
    if (!Number.isInteger(request.rootPitchClass) || request.rootPitchClass < 0 || request.rootPitchClass > 11
        || !['standalone', 'accompaniment'].includes(request.context)) {
        return { status: 'unsupported', request, message: 'This chord request is outside the supported range.' };
    }
    // The unrestricted degree search includes the bass-constrained drop searches and shell
    // subsets. The all-registry audit checks this claim against the legacy multi-route pool.
    const voicings = searchDeductiveVoicings(entry, request.rootPitchClass, { position: 'close' }, {
        maxFret: EXPLORATION_SCOPE.maxFret,
        context: request.context,
    });
    return { status: 'ready', request, candidates: voicings.map((voicing) => describeExplorationVoicing(voicing, entry)) };
}

/** Apply the current preference function independently of filtering and display limits. */
export function rankExplorationPool(pool: Extract<ExplorationPool, { status: 'ready' }>): ExplorationCandidate[] {
    const entry = resolveChordRegistryEntry(pool.request.chordId);
    const facts = new Map(pool.candidates.map((candidate) => [candidate.voicing.id, candidate]));
    return rankVoicingCandidates(pool.candidates.map((candidate) => candidate.voicing), entry,
        buildDeductiveChordTones(entry, pool.request.rootPitchClass))
        .map((candidate) => ({ ...candidate, facts: facts.get(candidate.voicing.id)!.facts, assessment: facts.get(candidate.voicing.id)!.assessment }));
}

export interface ExplorationFilters {
    minFret: number;
    maxFret: number;
    stringCount: number | null;
    openStrings: 'any' | 'require' | 'exclude';
    root: 'any' | 'include' | 'omit';
    coverage: 'any' | 'complete' | 'omissions';
    bassDegree: string | null;
    topDegree: string | null;
}
export const DEFAULT_EXPLORATION_FILTERS: ExplorationFilters = {
    minFret: 0, maxFret: EXPLORATION_SCOPE.maxFret, stringCount: null,
    openStrings: 'any', root: 'any', coverage: 'any', bassDegree: null, topDegree: null,
};

export function matchesExplorationFilters({ facts }: ExplorationCandidate, filters: ExplorationFilters): boolean {
    return Number.isInteger(filters.minFret) && Number.isInteger(filters.maxFret)
        && filters.minFret >= 0 && filters.maxFret <= EXPLORATION_SCOPE.maxFret && filters.minFret <= filters.maxFret
        // Position applies to stopped notes; open strings are controlled independently.
        && facts.minStoppedFret >= filters.minFret && facts.maxStoppedFret <= filters.maxFret
        && (filters.stringCount === null || facts.playedStrings.length === filters.stringCount)
        && (filters.openStrings === 'any' || (facts.openStringCount > 0) === (filters.openStrings === 'require'))
        && (filters.root === 'any' || facts.hasRoot === (filters.root === 'include'))
        && (filters.coverage === 'any' || (facts.omittedDegrees.length === 0) === (filters.coverage === 'complete'))
        && (filters.bassDegree === null || facts.bassDegree === filters.bassDegree)
        && (filters.topDegree === null || facts.topDegree === filters.topDegree);
}

export const EXPLORATION_PAGE_SIZE = 12;
export const EXPLORATION_START_SIZE = 6;

/** Filters the complete pool before limiting display. Every match remains reachable. */
export function queryExploration(candidates: ExplorationCandidate[], filters: ExplorationFilters, visibleCount = EXPLORATION_START_SIZE) {
    const matches = candidates.filter((candidate) => matchesExplorationFilters(candidate, filters));
    const limit = Number.isFinite(visibleCount) ? Math.max(0, Math.floor(visibleCount)) : EXPLORATION_START_SIZE;
    return {
        totalCount: candidates.length,
        matchCount: matches.length,
        visible: matches.slice(0, limit),
        hasMore: matches.length > limit,
    };
}

export function midiNoteLabel(midi: number): string {
    return `${getNoteName(midi % 12)}${Math.floor(midi / 12) - 1}`;
}

/** Preserve octaves and doubling; never substitute the chord formula for a voicing. */
export function getExplorationPlaybackNotes(candidate: ExplorationCandidate): string[] {
    return candidate.facts.midiNotes.map(midiNoteLabel);
}
