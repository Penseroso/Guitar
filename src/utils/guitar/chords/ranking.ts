import { getRequiredChordDegrees, resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { ChordTones, ResolvedVoicing, VoicingCandidate, VoicingRankingMode } from './types';

function collectPlayedDegrees(voicing: ResolvedVoicing): Set<string> {
    return new Set(
        voicing.notes
            .filter((note) => !note.isMuted && note.degree)
            .map((note) => note.degree as string)
    );
}

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
    maxAdjacentFretJump: number;
    averageAdjacentFretJump: number;
    fretCenter: number;
    highestPlayedString?: number;
    lowestPlayedString?: number;
    barreNoteCount: number;
    gripDensity: number;
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
    const internalMutedCount = mutedNotes.filter((note) => {
        if (firstPlayedString === undefined || lastPlayedString === undefined) {
            return false;
        }

        return note.string > firstPlayedString && note.string < lastPlayedString;
    }).length;
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
    const barreCounts = frettedNotes.reduce((accumulator, note) => {
        accumulator.set(note.fret, (accumulator.get(note.fret) ?? 0) + 1);
        return accumulator;
    }, new Map<number, number>());
    const barreNoteCount = Math.max(0, ...barreCounts.values());
    const stringRange = firstPlayedString !== undefined && lastPlayedString !== undefined
        ? (lastPlayedString - firstPlayedString) + 1
        : 0;
    const gripDensity = stringRange > 0 ? playedNotes.length / stringRange : 0;

    return {
        playedCount: playedNotes.length,
        frettedCount: frettedNotes.length,
        openStringCount: openNotes.length,
        mutedCount: mutedNotes.length,
        lowStringMuteCount,
        internalMutedCount,
        maxAdjacentFretJump,
        averageAdjacentFretJump,
        fretCenter,
        highestPlayedString: firstPlayedString,
        lowestPlayedString: lastPlayedString,
        barreNoteCount,
        gripDensity,
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
    const playedDegrees = collectPlayedDegrees(voicing);
    const requiredDegrees = getRequiredChordDegrees(entry);
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
        score -= metrics.internalMutedCount * profile.internalMutePenalty;
        reasons.push(`Has ${metrics.internalMutedCount} internal muted-string gap${metrics.internalMutedCount === 1 ? '' : 's'}.`);
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
        voicing.template?.rootString !== undefined &&
        entry.voicingHint.rootStrings.includes(voicing.template.rootString)
    ) {
        score += profile.rootHintBonus;
        reasons.push('Matches the registry root-string hint.');
    } else if (voicing.template?.rootString !== undefined) {
        score -= profile.rootHintPenalty;
        reasons.push('Root string falls outside the registry hint.');
    }

    if (voicing.template?.tags?.some((tag) => ['caged', 'drop-2', 'drop-3', 'power-chord'].includes(tag))) {
        score += profile.standardFamilyBonus;
        reasons.push('Matches a standard voicing family.');
    }

    if (metrics.barreNoteCount >= 3) {
        score -= (metrics.barreNoteCount - 2) * profile.barreComplexityPenalty;
        reasons.push(`Dense same-fret grip across ${metrics.barreNoteCount} strings.`);
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

    const upperRegisterStringCount = voicing.notes.filter((note) => !note.isMuted && note.string <= 3).length;
    if (mode === 'upper-register') {
        if (upperRegisterStringCount >= 3) {
            score += profile.upperRegisterBonus;
            reasons.push('Favours upper-string comping in this mode.');
        } else {
            score -= profile.upperRegisterPenalty;
            reasons.push('Sits too low for upper-register focus.');
        }
    } else if (mode === 'beginner' && voicing.template?.source === 'legacy-shape') {
        score += 3;
        reasons.push('Uses a familiar legacy grip.');
    } else if (mode === 'compact' && voicing.template?.tags?.includes('generated-compact')) {
        score += 4;
        reasons.push('Generated for compact clustering.');
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
