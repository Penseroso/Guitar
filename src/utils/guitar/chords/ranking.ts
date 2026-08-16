import { deriveRequiredDegrees } from './degreeRequirements';
import { resolveChordRegistryEntry } from './helpers';
import { getVoicingFamilyLabel } from './descriptor';
import { classifyFrettedGroups, type FingeringPoint } from './fretGeometry';
import { collectPlayedDegrees } from './resolver';
import type { ChordRegistryEntry } from './registry';
import type { ChordTones, ResolvedVoicing, VoicingCandidate, VoicingRankingMode } from './types';

export interface VoicingScore {
    score: number;
    reasons: string[];
    matchedRequiredDegrees: string[];
    missingRequiredDegrees: string[];
}

export interface ScoreResolvedVoicingOptions {
    mode?: VoicingRankingMode;
}

export interface VoicingShapeMetrics {
    playedCount: number;
    frettedCount: number;
    openStringCount: number;
    mutedCount: number;
    lowStringMuteCount: number;
    internalMutedCount: number;
    /** Of internalMutedCount, how many have no fretted neighbor on either side to lean on for a
     *  free mute — these need a genuinely separate muting action and are the rare/costly ones. */
    isolatedInternalMuteCount: number;
    /** Of isolatedInternalMuteCount, how many are additionally flanked by open strings on both
     *  sides — nothing physical damps them at all, the hardest case to keep clean. */
    openFlankedIsolatedMuteCount: number;
    maxAdjacentFretJump: number;
    averageAdjacentFretJump: number;
    fretCenter: number;
    highestPlayedString?: number;
    lowestPlayedString?: number;
    barreNoteCount: number;
    gripDensity: number;
    /** Total string-count overlap between every pair of distinct forced barres in this voicing.
     *  0 whenever there's at most one barre — a single barre spanning several strings while
     *  other fingers arch over some of them for higher frets is completely normal (e.g. the
     *  classic F-chord shape) and isn't penalized here. This is specifically for the rare case
     *  of *two different* barres whose string-ranges overlap, meaning two separate fingers must
     *  each lie flat across some of the same strings at different frets simultaneously. */
    overlappingBarreSpan: number;
}

interface RankingProfile {
    mode: VoicingRankingMode;
    compactSpanBonus: number;
    moderateSpanBonus: number;
    wideSpanPenalty: number;
    lowMidRegionBonus: number;
    standardRegionBonus: number;
    highRegionPenalty: number;
    openStringBonus: number;
    highOpenMixPenalty: number;
    internalMuteReward: number;
    internalMutePenalty: number;
    tightClusterBonus: number;
    manageableJumpBonus: number;
    largeJumpPenalty: number;
    rootHintBonus: number;
    rootHintPenalty: number;
    standardFamilyBonus: number;
    optionalCoverageBonus: number;
    optionalRetentionBonus: number;
    mutedStringPenalty: number;
    barreComplexityPenalty: number;
    lowStringMutePenalty: number;
    stretchDiscomfortPenalty: number;
    gripDensityBonus: number;
    upperRegisterBonus: number;
    upperRegisterPenalty: number;
    rootPositionBonus: number;
    inversionPenalty: number;
    overlappingBarreSpanPenalty: number;
}

const RANKING_PROFILES: Record<VoicingRankingMode, RankingProfile> = {
    balanced: {
        mode: 'balanced',
        compactSpanBonus: 12,
        moderateSpanBonus: 4,
        wideSpanPenalty: 5,
        lowMidRegionBonus: 10,
        standardRegionBonus: 4,
        highRegionPenalty: 4,
        openStringBonus: 3,
        highOpenMixPenalty: 4,
        internalMuteReward: 4,
        internalMutePenalty: 6,
        tightClusterBonus: 8,
        manageableJumpBonus: 2,
        largeJumpPenalty: 4,
        rootHintBonus: 8,
        rootHintPenalty: 3,
        standardFamilyBonus: 3,
        optionalCoverageBonus: 2,
        optionalRetentionBonus: 3,
        mutedStringPenalty: 2,
        barreComplexityPenalty: 2,
        lowStringMutePenalty: 4,
        stretchDiscomfortPenalty: 5,
        gripDensityBonus: 4,
        upperRegisterBonus: 2,
        upperRegisterPenalty: 0,
        rootPositionBonus: 16,
        inversionPenalty: 8,
        overlappingBarreSpanPenalty: 10,
    },
    compact: {
        mode: 'compact',
        compactSpanBonus: 18,
        moderateSpanBonus: 6,
        wideSpanPenalty: 8,
        lowMidRegionBonus: 6,
        standardRegionBonus: 4,
        highRegionPenalty: 3,
        openStringBonus: 2,
        highOpenMixPenalty: 5,
        internalMuteReward: 5,
        internalMutePenalty: 8,
        tightClusterBonus: 12,
        manageableJumpBonus: 3,
        largeJumpPenalty: 6,
        rootHintBonus: 6,
        rootHintPenalty: 2,
        standardFamilyBonus: 2,
        optionalCoverageBonus: 1,
        optionalRetentionBonus: 2,
        mutedStringPenalty: 1,
        barreComplexityPenalty: 2,
        lowStringMutePenalty: 3,
        stretchDiscomfortPenalty: 8,
        gripDensityBonus: 7,
        upperRegisterBonus: 2,
        upperRegisterPenalty: 0,
        rootPositionBonus: 14,
        inversionPenalty: 7,
        overlappingBarreSpanPenalty: 9,
    },
    beginner: {
        mode: 'beginner',
        compactSpanBonus: 16,
        moderateSpanBonus: 6,
        wideSpanPenalty: 9,
        lowMidRegionBonus: 14,
        standardRegionBonus: 4,
        highRegionPenalty: 6,
        openStringBonus: 4,
        highOpenMixPenalty: 7,
        internalMuteReward: 4,
        internalMutePenalty: 10,
        tightClusterBonus: 10,
        manageableJumpBonus: 2,
        largeJumpPenalty: 8,
        rootHintBonus: 10,
        rootHintPenalty: 4,
        standardFamilyBonus: 6,
        optionalCoverageBonus: 1,
        optionalRetentionBonus: 2,
        mutedStringPenalty: 4,
        barreComplexityPenalty: 6,
        lowStringMutePenalty: 7,
        stretchDiscomfortPenalty: 10,
        gripDensityBonus: 5,
        upperRegisterBonus: 0,
        upperRegisterPenalty: 2,
        rootPositionBonus: 20,
        inversionPenalty: 10,
        overlappingBarreSpanPenalty: 14,
    },
    'upper-register': {
        mode: 'upper-register',
        compactSpanBonus: 10,
        moderateSpanBonus: 4,
        wideSpanPenalty: 5,
        lowMidRegionBonus: 2,
        standardRegionBonus: 5,
        highRegionPenalty: 0,
        openStringBonus: 1,
        highOpenMixPenalty: 3,
        internalMuteReward: 3,
        internalMutePenalty: 6,
        tightClusterBonus: 7,
        manageableJumpBonus: 2,
        largeJumpPenalty: 4,
        rootHintBonus: 5,
        rootHintPenalty: 2,
        standardFamilyBonus: 2,
        optionalCoverageBonus: 2,
        optionalRetentionBonus: 3,
        mutedStringPenalty: 1,
        barreComplexityPenalty: 1,
        lowStringMutePenalty: 2,
        stretchDiscomfortPenalty: 4,
        gripDensityBonus: 4,
        upperRegisterBonus: 10,
        upperRegisterPenalty: 6,
        rootPositionBonus: 10,
        inversionPenalty: 5,
        overlappingBarreSpanPenalty: 6,
    },
};

export const VOICING_RANKING_MODES = Object.keys(RANKING_PROFILES) as VoicingRankingMode[];

export function getVoicingShapeMetrics(voicing: ResolvedVoicing): VoicingShapeMetrics {
    const playedNotes = voicing.notes
        .filter((note) => !note.isMuted)
        .sort((left, right) => left.string - right.string);
    const frettedNotes = playedNotes.filter((note) => note.fret > 0);
    const openNotes = playedNotes.filter((note) => note.fret === 0);
    const mutedNotes = voicing.notes.filter((note) => note.isMuted);
    const lowStringMuteCount = mutedNotes.filter((note) => note.string >= 4).length;
    const playedStrings = playedNotes.map((note) => note.string).sort((left, right) => left - right);
    const firstPlayedString = playedStrings[0];
    const lastPlayedString = playedStrings[playedStrings.length - 1];
    const internalMutedNotes = mutedNotes.filter((note) => {
        if (firstPlayedString === undefined || lastPlayedString === undefined) {
            return false;
        }

        return note.string > firstPlayedString && note.string < lastPlayedString;
    });
    const internalMutedCount = internalMutedNotes.length;
    // A muted string right next to a fretted finger gets deadened for free by that finger's
    // flesh — the standard way real players achieve an "X" in a chord diagram. A muted string
    // with no fretted neighbor on either side has nothing to lean on, so it needs its own
    // deliberate muting action (fingertip resting flat, palm mute, etc.) — genuinely rarer.
    const frettedStringSet = new Set(frettedNotes.map((note) => note.string));
    const openStringSet = new Set(openNotes.map((note) => note.string));
    const isolatedInternalMutes = internalMutedNotes.filter(
        (note) => !frettedStringSet.has(note.string - 1) && !frettedStringSet.has(note.string + 1)
    );
    const isolatedInternalMuteCount = isolatedInternalMutes.length;
    // Worst case within "isolated": both neighbors are open strings actively ringing, so there's
    // no finger anywhere nearby to lean on and nothing damping the strings pressing in from
    // either side during a strum — strictly harder to keep clean than an isolated mute at the
    // edge of the grip or next to another muted string.
    const openFlankedIsolatedMuteCount = isolatedInternalMutes.filter(
        (note) => openStringSet.has(note.string - 1) && openStringSet.has(note.string + 1)
    ).length;
    const adjacentJumps = playedNotes
        .slice(1)
        .map((note, index) => Math.abs(note.fret - playedNotes[index].fret));
    const maxAdjacentFretJump = adjacentJumps.length > 0 ? Math.max(...adjacentJumps) : 0;
    const averageAdjacentFretJump = adjacentJumps.length > 0
        ? adjacentJumps.reduce((sum, jump) => sum + jump, 0) / adjacentJumps.length
        : 0;
    const fretCenter = frettedNotes.length > 0
        ? frettedNotes.reduce((sum, note) => sum + note.fret, 0) / frettedNotes.length
        : 0;
    const stringRange = firstPlayedString !== undefined && lastPlayedString !== undefined
        ? (lastPlayedString - firstPlayedString) + 1
        : 0;
    const gripDensity = stringRange > 0 ? playedNotes.length / stringRange : 0;

    const fingeringPoints: FingeringPoint[] = frettedNotes.map((note) => ({ string: note.string, fret: note.fret }));
    const openStrings = openNotes.map((note) => note.string);
    const frettedGroups = classifyFrettedGroups(fingeringPoints, openStrings);
    // Only genuine forced barres count toward "dense same-fret grip" / skip-gap penalties —
    // strings that just happen to share a fret while being independently fingered (e.g. open
    // G's low-E and high-E strings, both fret 3, unrelated open strings between them) are two
    // ordinary solo fingers, not a barre, and shouldn't be scored like one.
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

    return {
        playedCount: playedNotes.length,
        frettedCount: frettedNotes.length,
        openStringCount: openNotes.length,
        mutedCount: mutedNotes.length,
        lowStringMuteCount,
        internalMutedCount,
        isolatedInternalMuteCount,
        openFlankedIsolatedMuteCount,
        maxAdjacentFretJump,
        averageAdjacentFretJump,
        fretCenter,
        highestPlayedString: firstPlayedString,
        lowestPlayedString: lastPlayedString,
        barreNoteCount,
        gripDensity,
        overlappingBarreSpan,
    };
}

function getRankingProfile(mode: VoicingRankingMode): RankingProfile {
    return RANKING_PROFILES[mode];
}

export function scoreResolvedVoicing(
    voicing: ResolvedVoicing,
    entryInput: string | ChordRegistryEntry,
    tones?: ChordTones,
    options: ScoreResolvedVoicingOptions = {}
): VoicingScore {
    const mode = options.mode ?? 'balanced';
    const profile = getRankingProfile(mode);
    const entry = resolveChordRegistryEntry(entryInput);
    const playedDegrees = collectPlayedDegrees(voicing.notes);
    const requiredDegrees = deriveRequiredDegrees(entry);
    const matchedRequiredDegrees = voicing.missingRequiredDegrees
        ? requiredDegrees.filter((degree) => !voicing.missingRequiredDegrees?.includes(degree))
        : requiredDegrees.filter((degree) => playedDegrees.has(degree));
    const missingRequiredDegrees = voicing.missingRequiredDegrees
        ? [...voicing.missingRequiredDegrees]
        : requiredDegrees.filter((degree) => !playedDegrees.has(degree));
    const omittedOptionalDegrees = voicing.omittedOptionalDegrees ?? [];
    const metrics = getVoicingShapeMetrics(voicing);
    const allowedPitchClasses = tones
        ? new Set(tones.tones.map((tone) => tone.pitchClass))
        : null;
    const extraPitchClasses = allowedPitchClasses
        ? Array.from(new Set(
            voicing.notes
                .filter((note) => !note.isMuted && !allowedPitchClasses.has(note.pitchClass))
                .map((note) => note.pitchClass)
        ))
        : [];
    const reasons: string[] = [];
    let score = 0;

    if (voicing.playable) {
        score += 70;
        reasons.push('Playable in the resolved fret region.');
    } else {
        score -= 250;
        reasons.push('Contains invalid or disallowed fret positions.');
    }

    if (missingRequiredDegrees.length === 0) {
        score += 40;
        reasons.push('Covers all required chord degrees.');
    } else {
        score -= missingRequiredDegrees.length * 30;
        reasons.push(`Missing required degrees: ${missingRequiredDegrees.join(', ')}.`);
    }

    if (playedDegrees.has('1')) {
        score += 18;
        reasons.push('Contains the chord root.');
    } else {
        score -= 25;
        reasons.push('Omits the chord root.');
    }

    score -= metrics.mutedCount * profile.mutedStringPenalty;
    if (metrics.mutedCount === 0) {
        reasons.push('Uses all six strings.');
    } else {
        reasons.push(`${metrics.mutedCount} muted string${metrics.mutedCount === 1 ? '' : 's'}.`);
    }

    if (voicing.span <= 4) {
        score += profile.compactSpanBonus;
        reasons.push(`Compact fret span (${voicing.span}).`);
    } else if (voicing.span <= 6) {
        score += profile.moderateSpanBonus;
        reasons.push(`Moderate fret span (${voicing.span}).`);
    } else {
        score -= Math.max(0, voicing.span - 6) * profile.wideSpanPenalty;
        reasons.push(`Wide fret span (${voicing.span}).`);
    }

    if (voicing.minFret >= 0 && voicing.maxFret <= 7) {
        score += profile.lowMidRegionBonus;
        reasons.push('Lives in a low-to-mid fret region.');
    } else if (voicing.minFret >= 0 && voicing.maxFret <= 12) {
        score += profile.standardRegionBonus;
        reasons.push('Lives in a standard fret region.');
    } else {
        score -= profile.highRegionPenalty;
        reasons.push('Lives in a high or awkward fret region.');
    }

    if (metrics.openStringCount > 0 && voicing.maxFret <= 5) {
        score += Math.min(metrics.openStringCount, 2) * profile.openStringBonus;
        reasons.push(`Uses ${metrics.openStringCount} practical open string${metrics.openStringCount === 1 ? '' : 's'}.`);
    } else if (metrics.openStringCount >= 3 && voicing.maxFret >= 8) {
        score -= profile.highOpenMixPenalty;
        reasons.push('Mixes many open strings with a high fret position.');
    }

    if (metrics.internalMutedCount === 0) {
        score += profile.internalMuteReward;
        reasons.push('Avoids internal muted-string gaps.');
    } else {
        const adjacentCount = metrics.internalMutedCount - metrics.isolatedInternalMuteCount;
        if (adjacentCount > 0) {
            // Deadened for free by the neighboring fretted finger's flesh — the standard way an
            // "X" happens in real playing, so it's only a light ding, not a real cost.
            score -= adjacentCount * profile.internalMutePenalty * 0.25;
            reasons.push(`Has ${adjacentCount} internal muted-string gap${adjacentCount === 1 ? '' : 's'} (naturally deadened by an adjacent finger).`);
        }
        if (metrics.isolatedInternalMuteCount > 0) {
            // No fretted neighbor to lean on — needs its own deliberate muting action. One of
            // these happens in real playing, but stacking two or more (each needing a separate
            // dedicated mute) is rare enough that the cost should climb faster than linearly.
            // An isolated mute flanked by open strings on both sides counts extra — nothing
            // damps it at all, actively ringing strings pressing in from both directions.
            const plainIsolated = metrics.isolatedInternalMuteCount - metrics.openFlankedIsolatedMuteCount;
            const weightedUnits = plainIsolated + (metrics.openFlankedIsolatedMuteCount * 2);
            score -= ((weightedUnits * (weightedUnits + 1)) / 2) * profile.internalMutePenalty;
            reasons.push(`Has ${metrics.isolatedInternalMuteCount} isolated muted-string gap${metrics.isolatedInternalMuteCount === 1 ? '' : 's'} with no fretted neighbor to lean on${metrics.openFlankedIsolatedMuteCount > 0 ? ` (${metrics.openFlankedIsolatedMuteCount} flanked by open strings)` : ''}.`);
        }
    }

    if (metrics.maxAdjacentFretJump <= 2) {
        score += profile.tightClusterBonus;
        reasons.push('Adjacent strings stay tightly clustered.');
    } else if (metrics.maxAdjacentFretJump <= 4) {
        score += profile.manageableJumpBonus;
        reasons.push('Adjacent string movement stays manageable.');
    } else {
        score -= (metrics.maxAdjacentFretJump - 4) * profile.largeJumpPenalty;
        reasons.push(`Large adjacent-string jump (${metrics.maxAdjacentFretJump} frets).`);
    }

    if (
        entry.voicingHint?.rootStrings?.length &&
        voicing.descriptor.rootString !== undefined &&
        entry.voicingHint.rootStrings.includes(voicing.descriptor.rootString)
    ) {
        score += profile.rootHintBonus;
        reasons.push('Matches the registry root-string hint.');
    } else if (voicing.descriptor.rootString !== undefined) {
        score -= profile.rootHintPenalty;
        reasons.push('Root string falls outside the registry hint.');
    }

    if (
        voicing.descriptor.family === 'shell'
        || voicing.descriptor.family === 'compact'
        || voicing.descriptor.family === 'close'
        || voicing.descriptor.family === 'full'
    ) {
        score += profile.standardFamilyBonus;
        reasons.push(`Falls into a ${getVoicingFamilyLabel(voicing.descriptor.family).toLowerCase()} voicing family.`);
    }

    if (metrics.barreNoteCount >= 3) {
        score -= (metrics.barreNoteCount - 2) * profile.barreComplexityPenalty;
        reasons.push(`Dense same-fret grip across ${metrics.barreNoteCount} strings.`);
    }

    if (metrics.overlappingBarreSpan > 0) {
        score -= metrics.overlappingBarreSpan * profile.overlappingBarreSpanPenalty;
        reasons.push(`Needs two overlapping barres across ${metrics.overlappingBarreSpan} shared string${metrics.overlappingBarreSpan === 1 ? '' : 's'}.`);
    }

    if (metrics.lowStringMuteCount > 0) {
        score -= metrics.lowStringMuteCount * profile.lowStringMutePenalty;
        reasons.push(`Requires ${metrics.lowStringMuteCount} low-string mute${metrics.lowStringMuteCount === 1 ? '' : 's'}.`);
    }

    if (voicing.span >= 4 && metrics.averageAdjacentFretJump > 1.5) {
        score -= Math.round(metrics.averageAdjacentFretJump) * profile.stretchDiscomfortPenalty;
        reasons.push('Grip suggests extra stretch discomfort.');
    }

    if (metrics.gripDensity >= 0.8) {
        score += profile.gripDensityBonus;
        reasons.push('Keeps the grip visually coherent.');
    }

    if (mode === 'upper-register') {
        if (voicing.descriptor.family === 'upper-register') {
            score += profile.upperRegisterBonus;
            reasons.push('Classifies cleanly as an upper-register voicing.');
        } else if (voicing.descriptor.registerBand === 'upper') {
            score += Math.max(2, profile.upperRegisterBonus - 4);
            reasons.push('Sits in the upper register without the full upper-register profile.');
        } else {
            score -= profile.upperRegisterPenalty;
            reasons.push('Sits too low for upper-register focus.');
        }
    } else if (mode === 'beginner') {
        if (
            (voicing.descriptor.family === 'shell'
                || voicing.descriptor.family === 'compact'
                || voicing.descriptor.family === 'close')
            && voicing.descriptor.registerBand !== 'high'
        ) {
            score += 5;
            reasons.push('Uses a structurally approachable family for beginner mode.');
        } else if (voicing.descriptor.family === 'spread' || voicing.descriptor.registerBand === 'high') {
            score -= 4;
            reasons.push('Leans wider or higher than ideal for beginner mode.');
        }
    } else if (mode === 'compact') {
        if (voicing.descriptor.family === 'compact') {
            score += 6;
            reasons.push('Classifies as compact in this mode.');
        } else if (voicing.descriptor.family === 'shell' || voicing.descriptor.family === 'close') {
            score += 2;
            reasons.push('Stays near the compact family profile.');
        }
    }

    if (extraPitchClasses.length > 0) {
        score -= extraPitchClasses.length * 18;
        if ((entry.id === 'sus2' || entry.id === 'sus4') && playedDegrees.has('3')) {
            reasons.push('Introduces a third into a suspended chord.');
        } else {
            reasons.push(`Introduces ${extraPitchClasses.length} out-of-chord tone${extraPitchClasses.length === 1 ? '' : 's'}.`);
        }
    }

    if (voicing.chord.slashBassPitchClass !== undefined) {
        if (voicing.satisfiesSlashBass) {
            score += 24;
            reasons.push('Respects specified bass note.');
        } else {
            score -= 28;
            reasons.push('Does not match specified bass.');
        }
    } else if (voicing.descriptor.inversion === 'root-position') {
        score += profile.rootPositionBonus;
        reasons.push('Keeps the root in the bass.');
    } else if (voicing.descriptor.inversion === 'inversion') {
        // Root-in-bass only matters once the voicing reaches down into the low strings (D/A/E,
        // index >= 3) — a grip confined to the top strings (G/B/E) is a normal, idiomatic way to
        // play without caring what the lowest note is (a bass player or the low strings of a
        // fuller chord elsewhere are expected to cover the root), so it shouldn't be penalized
        // for "not being root position" the way a full low-to-high chord would be.
        const reachesLowStrings = (voicing.descriptor.lowestPlayedString ?? 0) >= 3;
        if (reachesLowStrings) {
            score -= profile.inversionPenalty;
            reasons.push('Puts a non-root tone in the bass.');
        } else {
            reasons.push('Upper-string grip — bass note left open.');
        }
    }

    if (omittedOptionalDegrees.length > 0) {
        reasons.push(`Optional tones omitted: ${omittedOptionalDegrees.join(', ')}.`);
    } else if (tones?.tones.some((tone) => !tone.isRequired)) {
        score += profile.optionalRetentionBonus;
        reasons.push('Retains optional color tones.');
    }

    if (tones) {
        const playedPitchClasses = new Set(
            voicing.notes.filter((note) => !note.isMuted).map((note) => note.pitchClass)
        );
        const optionalCoverage = tones.tones.filter(
            (tone) => !tone.isRequired && playedPitchClasses.has(tone.pitchClass)
        ).length;

        if (optionalCoverage > 0) {
            score += optionalCoverage * profile.optionalCoverageBonus;
            reasons.push(`Includes ${optionalCoverage} optional color tone${optionalCoverage === 1 ? '' : 's'}.`);
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
    // Future-facing engine utility: current chord mode does not surface this ranking order directly.
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
