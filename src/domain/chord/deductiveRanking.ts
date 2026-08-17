import { deriveRequiredDegrees } from './degreeRequirements';
import {
    DEFAULT_MAX_HAND_SPAN_MM,
    DEFAULT_SCALE_LENGTH_MM,
    classifyFrettedGroups,
    getFretDistanceMm,
    type FingeringPoint,
} from './fretGeometry';
import { resolveChordRegistryEntry } from './helpers';
import { collectPlayedDegrees } from './resolver';
import type { ChordRegistryEntry } from './registry';
import type { ChordTones, ResolvedVoicing, VoicingCandidate } from './types';

/**
 * Deductive-engine-only scoring layer — a rebuild of the old ranking.ts scoring function,
 * scoped specifically to voicings produced by voicingSearch.ts's backtracking search.
 *
 * That search already hard-guarantees, before a candidate is ever built: playability
 * (evaluateHandPlayability), full required-degree coverage, and in-formula-only pitch classes
 * (see voicingSearch.ts's finalizeIfValid). So unlike the old ranking.ts — which was shared
 * with the hand-authored legacy template pipeline and had to softly re-verify all of that —
 * this scorer treats those as structural invariants (one defensive safety-net check, not a
 * dozen magic-number terms modeling something that can't happen from this engine).
 *
 * No ranking "modes": the old balanced/compact/beginner/upper-register profiles were never
 * wired to any UI control (confirmed dead — ClientApp.tsx always uses the implicit default),
 * so this is a single scoring function with one set of weights, each grounded in a physical or
 * harmonic quantity the engine already computes deductively (fretGeometry.ts's real mm hand
 * span and barre classification, descriptor.ts's degree coverage) rather than an opaque tuned
 * point pile.
 */

export type VoicingTechniqueTag = 'shell' | 'barre' | 'open' | 'standard';

export interface VoicingScore {
    score: number;
    reasons: string[];
    matchedRequiredDegrees: string[];
    missingRequiredDegrees: string[];
}

export interface ScoreResolvedVoicingOptions {
    scaleLengthMm?: number;
    maxHandSpanMm?: number;
}

export interface VoicingShapeMetrics {
    playedCount: number;
    openStringCount: number;
    mutedCount: number;
    internalMutedCount: number;
    /** Of internalMutedCount, how many have no fretted neighbor on either side to lean on for a
     *  free mute — these need a genuinely separate muting action and are the rare/costly ones. */
    isolatedInternalMuteCount: number;
    /** Of isolatedInternalMuteCount, how many are additionally flanked by open strings on both
     *  sides — nothing physical damps them at all, the hardest case to keep clean. */
    openFlankedIsolatedMuteCount: number;
    /** Independent fretting fingers needed — a forced barre group counts as one finger no
     *  matter how many strings it spans. This is the real deductive substitute for "span": it's
     *  what actually determines whether a shape needs one hand position or feels crowded. */
    fingerGroupCount: number;
    /** Widest single forced barre, in strings covered (0 if there's no real barre). */
    barreNoteCount: number;
    /** Total string-count overlap between every pair of distinct forced barres — see ranking
     *  history: 0 whenever there's at most one barre; only the rare two-barres-at-once case. */
    overlappingBarreSpan: number;
    /** Real physical distance (mm) between the lowest and highest fretted point, via the same
     *  logarithmic fret-spacing formula the hard playability gate uses — physically accurate at
     *  every neck position, unlike a raw fret-count span (a "4 fret" reach means something very
     *  different at fret 1 than at fret 12). 0 when there's at most one fretted point. */
    spanMm: number;
    minFret: number;
    maxFret: number;
}

/** Below this real mm distance, a fret gap reads as no stretch at all to a guitarist — see the
 *  hand-span comfort term for why this matters more than it would with a raw fret-count span. */
const TRIVIAL_HAND_SPAN_MM = 40;

const WEIGHTS = {
    handSpanComfortMax: 20,
    fingerEconomyPerFinger: -6,
    barreWidthPenaltyPerString: -2,
    overlappingBarreSpanPenalty: -10,
    internalMuteAdjacentPenalty: -1.5,
    internalMuteIsolatedPenalty: -6,
    lowPositionBonus: 10,
    standardPositionBonus: 4,
    highPositionPenalty: -4,
    openStringBonus: 3,
    highOpenMixPenalty: -4,
    rootPresenceBonus: 6,
    rootPresencePenalty: -12,
    rootInBassBonus: 16,
    rootInBassPenalty: -8,
    slashBassBonus: 24,
    slashBassPenalty: -28,
    colorToneBonus: 2,
    fullnessBonusPerString: 3,
    rootHintBonus: 8,
    rootHintPenalty: -3,
    /** Not a tuned preference — a large, clearly-flagged fallback for a state the search should
     *  make structurally impossible. If this ever fires, something upstream is broken. */
    structuralSafetyNetPenalty: -500,
} as const;

export function getVoicingShapeMetrics(
    voicing: ResolvedVoicing,
    scaleLengthMm: number = DEFAULT_SCALE_LENGTH_MM
): VoicingShapeMetrics {
    const playedNotes = voicing.notes
        .filter((note) => !note.isMuted)
        .sort((left, right) => left.string - right.string);
    const frettedNotes = playedNotes.filter((note) => note.fret > 0);
    const openNotes = playedNotes.filter((note) => note.fret === 0);
    const mutedNotes = voicing.notes.filter((note) => note.isMuted);
    const playedStrings = playedNotes.map((note) => note.string);
    const firstPlayedString = playedStrings[0];
    const lastPlayedString = playedStrings[playedStrings.length - 1];

    const internalMutedNotes = mutedNotes.filter((note) => {
        if (firstPlayedString === undefined || lastPlayedString === undefined) {
            return false;
        }
        return note.string > firstPlayedString && note.string < lastPlayedString;
    });
    const frettedStringSet = new Set<number>(frettedNotes.map((note) => note.string));
    const openStringSet = new Set<number>(openNotes.map((note) => note.string));
    const isolatedInternalMutes = internalMutedNotes.filter(
        (note) => !frettedStringSet.has(note.string - 1) && !frettedStringSet.has(note.string + 1)
    );
    const openFlankedIsolatedMuteCount = isolatedInternalMutes.filter(
        (note) => openStringSet.has(note.string - 1) && openStringSet.has(note.string + 1)
    ).length;

    const fingeringPoints: FingeringPoint[] = frettedNotes.map((note) => ({ string: note.string, fret: note.fret }));
    const openStrings = openNotes.map((note) => note.string);
    const frettedGroups = classifyFrettedGroups(fingeringPoints, openStrings);
    const fingerGroupCount = frettedGroups.reduce(
        (count, group) => count + (group.isBarre ? 1 : group.strings.length),
        0
    );
    const barreGroups = frettedGroups.filter((group) => group.isBarre);
    const barreNoteCount = barreGroups.reduce((max, group) => Math.max(max, group.strings.length), 0);
    const barreRanges = barreGroups.map((group) => ({
        min: Math.min(...group.strings),
        max: Math.max(...group.strings),
    }));
    let overlappingBarreSpan = 0;
    for (let i = 0; i < barreRanges.length; i++) {
        for (let j = i + 1; j < barreRanges.length; j++) {
            const overlapLo = Math.max(barreRanges[i].min, barreRanges[j].min);
            const overlapHi = Math.min(barreRanges[i].max, barreRanges[j].max);
            if (overlapLo <= overlapHi) {
                overlappingBarreSpan += (overlapHi - overlapLo) + 1;
            }
        }
    }

    const frettedValues = frettedNotes.map((note) => note.fret);
    const minFret = frettedValues.length > 0 ? Math.min(...frettedValues) : 0;
    const maxFret = frettedValues.length > 0 ? Math.max(...frettedValues) : 0;
    const spanMm = frettedValues.length > 1 ? getFretDistanceMm(minFret, maxFret, scaleLengthMm) : 0;

    return {
        playedCount: playedNotes.length,
        openStringCount: openNotes.length,
        mutedCount: mutedNotes.length,
        internalMutedCount: internalMutedNotes.length,
        isolatedInternalMuteCount: isolatedInternalMutes.length,
        openFlankedIsolatedMuteCount,
        fingerGroupCount,
        barreNoteCount,
        overlappingBarreSpan,
        spanMm,
        minFret,
        maxFret,
    };
}

/** Priority: shell (a harmonic-density property) beats barre, which beats open, since each is
 *  progressively less specific/defining when more than one applies to the same voicing. Two
 *  adjacent strings coincidentally sharing a fret (e.g. open Am's x02210) is reachable as a
 *  physically-forceable 2-string barre but isn't what guitarists mean by "barre chord" — the
 *  tag is reserved for a real forced barre spanning 3+ strings. */
function classifyTechniqueTag(voicing: ResolvedVoicing, metrics: VoicingShapeMetrics): VoicingTechniqueTag {
    if (voicing.descriptor.family === 'shell') {
        return 'shell';
    }
    if (metrics.barreNoteCount >= 3) {
        return 'barre';
    }
    if (metrics.openStringCount > 0) {
        return 'open';
    }
    return 'standard';
}

export function getVoicingTechniqueTag(voicing: ResolvedVoicing): VoicingTechniqueTag {
    return classifyTechniqueTag(voicing, getVoicingShapeMetrics(voicing));
}

export function scoreResolvedVoicing(
    voicing: ResolvedVoicing,
    entryInput: string | ChordRegistryEntry,
    tones?: ChordTones,
    options: ScoreResolvedVoicingOptions = {}
): VoicingScore {
    const entry = resolveChordRegistryEntry(entryInput);
    const scaleLengthMm = options.scaleLengthMm ?? DEFAULT_SCALE_LENGTH_MM;
    const maxHandSpanMm = options.maxHandSpanMm ?? DEFAULT_MAX_HAND_SPAN_MM;
    const playedDegrees = collectPlayedDegrees(voicing.notes);
    const requiredDegrees = deriveRequiredDegrees(entry);
    const matchedRequiredDegrees = voicing.missingRequiredDegrees
        ? requiredDegrees.filter((degree) => !voicing.missingRequiredDegrees?.includes(degree))
        : requiredDegrees.filter((degree) => playedDegrees.has(degree));
    const missingRequiredDegrees = voicing.missingRequiredDegrees
        ? [...voicing.missingRequiredDegrees]
        : requiredDegrees.filter((degree) => !playedDegrees.has(degree));
    const metrics = getVoicingShapeMetrics(voicing, scaleLengthMm);
    const reasons: string[] = [];
    let score = 0;

    // --- Structural safety net --------------------------------------------------------------
    // Root presence has a recognized legitimate exception (an explicitly-requested rootless
    // voicing, descriptor.hasRoot === false) so it's excluded here and scored on its own below;
    // every other required degree and in-formula-only pitch classes are unconditional
    // invariants the search already guarantees.
    const allowedPitchClasses = tones ? new Set(tones.tones.map((tone) => tone.pitchClass)) : null;
    const hasOutOfFormulaTone = allowedPitchClasses
        ? voicing.notes.some((note) => !note.isMuted && !allowedPitchClasses.has(note.pitchClass))
        : false;
    const hasUnexpectedMissingDegree = missingRequiredDegrees.some((degree) => degree !== '1');
    if (!voicing.playable || hasUnexpectedMissingDegree || hasOutOfFormulaTone) {
        score += WEIGHTS.structuralSafetyNetPenalty;
        reasons.push('Fails a structural constraint the search should already guarantee.');
    }

    // --- Hand-span comfort (real mm, not raw fret-count) --------------------------------------
    // A guitarist doesn't perceive a 1-2 fret gap as any real stretch at all, even near the nut
    // where it's physically widest (e.g. fret 1 to fret 2 is ~34mm) — real discomfort only ramps
    // up past that. A pure linear ratio against maxHandSpanMm would dock a normal, trivial 2-fret
    // grip almost as much (proportionally) as a genuinely wide reach, so comfort stays maxed out
    // up to a "trivial stretch" threshold and only tapers off beyond it.
    const trivialSpanMm = Math.min(TRIVIAL_HAND_SPAN_MM, maxHandSpanMm);
    const comfortRatio = metrics.spanMm <= trivialSpanMm
        ? 1
        : Math.max(0, 1 - (metrics.spanMm - trivialSpanMm) / Math.max(1, maxHandSpanMm - trivialSpanMm));
    score += comfortRatio * WEIGHTS.handSpanComfortMax;
    if (metrics.spanMm > trivialSpanMm) {
        reasons.push(`Hand span ${metrics.spanMm.toFixed(0)}mm of ${maxHandSpanMm}mm allowed.`);
    }

    // --- Finger economy ------------------------------------------------------------------------
    if (metrics.fingerGroupCount > 1) {
        score += (metrics.fingerGroupCount - 1) * WEIGHTS.fingerEconomyPerFinger;
        reasons.push(`Needs ${metrics.fingerGroupCount} independent fretting fingers.`);
    } else {
        reasons.push('Needs at most one fretting finger.');
    }

    // --- Barre width (supplements finger economy — a wide barre costs the same one "finger"
    // but isn't as easy to fret cleanly as a narrow one) -----------------------------------
    if (metrics.barreNoteCount >= 3) {
        score += (metrics.barreNoteCount - 2) * WEIGHTS.barreWidthPenaltyPerString;
        reasons.push(`Wide barre across ${metrics.barreNoteCount} strings.`);
    }

    if (metrics.overlappingBarreSpan > 0) {
        score += metrics.overlappingBarreSpan * WEIGHTS.overlappingBarreSpanPenalty;
        reasons.push(`Needs two overlapping barres across ${metrics.overlappingBarreSpan} shared string${metrics.overlappingBarreSpan === 1 ? '' : 's'}.`);
    }

    // --- Mute naturalness ----------------------------------------------------------------------
    if (metrics.internalMutedCount > 0) {
        const adjacentCount = metrics.internalMutedCount - metrics.isolatedInternalMuteCount;
        if (adjacentCount > 0) {
            score += adjacentCount * WEIGHTS.internalMuteAdjacentPenalty;
            reasons.push(`${adjacentCount} internal muted-string gap${adjacentCount === 1 ? '' : 's'} naturally deadened by an adjacent finger.`);
        }
        if (metrics.isolatedInternalMuteCount > 0) {
            const plainIsolated = metrics.isolatedInternalMuteCount - metrics.openFlankedIsolatedMuteCount;
            const weightedUnits = plainIsolated + (metrics.openFlankedIsolatedMuteCount * 2);
            score += ((weightedUnits * (weightedUnits + 1)) / 2) * WEIGHTS.internalMuteIsolatedPenalty;
            reasons.push(`${metrics.isolatedInternalMuteCount} isolated muted-string gap${metrics.isolatedInternalMuteCount === 1 ? '' : 's'} with no fretted neighbor to lean on${metrics.openFlankedIsolatedMuteCount > 0 ? ` (${metrics.openFlankedIsolatedMuteCount} flanked by open strings)` : ''}.`);
        }
    }

    // --- Fretboard position -------------------------------------------------------------------
    if (metrics.maxFret <= 7) {
        score += WEIGHTS.lowPositionBonus;
        reasons.push('Lives in a low-to-mid fret region.');
    } else if (metrics.maxFret <= 12) {
        score += WEIGHTS.standardPositionBonus;
        reasons.push('Lives in a standard fret region.');
    } else {
        score += WEIGHTS.highPositionPenalty;
        reasons.push('Lives in a high fret region.');
    }

    // --- Open-string usage ---------------------------------------------------------------------
    if (metrics.openStringCount > 0 && metrics.maxFret <= 5) {
        score += Math.min(metrics.openStringCount, 2) * WEIGHTS.openStringBonus;
        reasons.push(`Uses ${metrics.openStringCount} practical open string${metrics.openStringCount === 1 ? '' : 's'}.`);
    } else if (metrics.openStringCount >= 3 && metrics.maxFret >= 8) {
        score += WEIGHTS.highOpenMixPenalty;
        reasons.push('Mixes several open strings with a high fret position.');
    }

    // --- Root presence (the one recognized exception to the structural safety net) -----------
    if (voicing.descriptor.hasRoot) {
        score += WEIGHTS.rootPresenceBonus;
        reasons.push('Contains the chord root.');
    } else {
        score += WEIGHTS.rootPresencePenalty;
        reasons.push('Omits the chord root.');
    }

    // --- Registry root-string hint — neutral (no term) when the chord has no hint configured,
    // fixing the audit bug where a missing hint silently defaulted to a penalty. Checks every
    // root occurrence, not just the normalized (lowest-string-index) one — a voicing with a
    // duplicated root should credit a hint match on *either* copy, not just whichever one
    // descriptor.ts happens to pick as "the" rootString. -----------------------------------------
    const rootStringHints = entry.voicingHint?.rootStrings;
    const rootOccurrences = voicing.descriptor.rootOccurrences ?? [];
    if (rootStringHints?.length && rootOccurrences.length > 0) {
        if (rootOccurrences.some((string) => rootStringHints.includes(string))) {
            score += WEIGHTS.rootHintBonus;
            reasons.push('Matches the registry root-string hint.');
        } else {
            score += WEIGHTS.rootHintPenalty;
            reasons.push('Root string falls outside the registry hint.');
        }
    }

    // --- Root-in-bass / inversion ---------------------------------------------------------------
    if (voicing.chord.slashBassPitchClass !== undefined) {
        if (voicing.satisfiesSlashBass) {
            score += WEIGHTS.slashBassBonus;
            reasons.push('Respects the specified bass note.');
        } else {
            score += WEIGHTS.slashBassPenalty;
            reasons.push('Does not match the specified bass.');
        }
    } else if (voicing.descriptor.inversion === 'root-position') {
        score += WEIGHTS.rootInBassBonus;
        reasons.push('Keeps the root in the bass.');
    } else if (voicing.descriptor.inversion === 'inversion') {
        // Root-in-bass only matters once the voicing reaches down into the low strings — a grip
        // confined to the top strings is a normal, idiomatic way to play without caring what the
        // lowest note is.
        const reachesLowStrings = (voicing.descriptor.lowestPlayedString ?? 0) >= 3;
        if (reachesLowStrings) {
            score += WEIGHTS.rootInBassPenalty;
            reasons.push('Puts a non-root tone in the bass.');
        } else {
            reasons.push('Upper-string grip — bass note left open.');
        }
    }

    // --- Optional/color-tone inclusion — single term (the audit found the old ranking.ts
    // rewarded this same fact twice, via two separate bonuses) ---------------------------------
    if (tones) {
        const playedPitchClasses = new Set(
            voicing.notes.filter((note) => !note.isMuted).map((note) => note.pitchClass)
        );
        const optionalCoverage = tones.tones.filter(
            (tone) => !tone.isRequired && playedPitchClasses.has(tone.pitchClass)
        ).length;
        if (optionalCoverage > 0) {
            score += optionalCoverage * WEIGHTS.colorToneBonus;
            reasons.push(`Includes ${optionalCoverage} optional color tone${optionalCoverage === 1 ? '' : 's'}.`);
        }
    }

    // --- Technique-tag fullness bonus — richer open/barre voicings preferred (scoped to those
    // two tags only; shell is deliberately minimal, standard has no strong prior either way) ---
    const techniqueTag = classifyTechniqueTag(voicing, metrics);
    if (techniqueTag === 'open' || techniqueTag === 'barre') {
        score += metrics.playedCount * WEIGHTS.fullnessBonusPerString;
        if (metrics.playedCount >= 5) {
            reasons.push(`Full ${techniqueTag} voicing (${metrics.playedCount} strings ringing).`);
        }
    }

    return {
        score,
        reasons,
        matchedRequiredDegrees,
        missingRequiredDegrees,
    };
}

export function buildVoicingCandidate(
    voicing: ResolvedVoicing,
    entryInput: string | ChordRegistryEntry,
    tones?: ChordTones,
    options: ScoreResolvedVoicingOptions = {}
): VoicingCandidate {
    const score = scoreResolvedVoicing(voicing, entryInput, tones, options);

    return {
        voicing,
        score: score.score,
        reasons: score.reasons,
        matchedRequiredDegrees: score.matchedRequiredDegrees,
        missingRequiredDegrees: score.missingRequiredDegrees,
    };
}

export function rankVoicingCandidates(
    voicings: ResolvedVoicing[],
    entryInput: string | ChordRegistryEntry,
    tones?: ChordTones,
    options: ScoreResolvedVoicingOptions = {}
): VoicingCandidate[] {
    return voicings
        .map((voicing) => buildVoicingCandidate(voicing, entryInput, tones, options))
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            if (left.voicing.playable !== right.voicing.playable) {
                return Number(right.voicing.playable) - Number(left.voicing.playable);
            }
            if (left.voicing.span !== right.voicing.span) {
                return left.voicing.span - right.voicing.span;
            }
            if (left.voicing.minFret !== right.voicing.minFret) {
                return left.voicing.minFret - right.voicing.minFret;
            }
            return left.voicing.id.localeCompare(right.voicing.id);
        });
}
