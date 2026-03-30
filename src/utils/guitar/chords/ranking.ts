import { getRequiredChordDegrees, resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { ChordTones, ResolvedVoicing, VoicingCandidate } from './types';

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

export interface VoicingShapeMetrics {
    playedCount: number;
    frettedCount: number;
    openStringCount: number;
    mutedCount: number;
    internalMutedCount: number;
    maxAdjacentFretJump: number;
    averageAdjacentFretJump: number;
    fretCenter: number;
}

export function getVoicingShapeMetrics(voicing: ResolvedVoicing): VoicingShapeMetrics {
    const playedNotes = voicing.notes
        .filter((note) => !note.isMuted)
        .sort((left, right) => left.string - right.string);
    const frettedNotes = playedNotes.filter((note) => note.fret > 0);
    const openNotes = playedNotes.filter((note) => note.fret === 0);
    const mutedNotes = voicing.notes.filter((note) => note.isMuted);
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

    return {
        playedCount: playedNotes.length,
        frettedCount: frettedNotes.length,
        openStringCount: openNotes.length,
        mutedCount: mutedNotes.length,
        internalMutedCount,
        maxAdjacentFretJump,
        averageAdjacentFretJump,
        fretCenter,
    };
}

export function scoreResolvedVoicing(
    voicing: ResolvedVoicing,
    entryInput: string | ChordRegistryEntry,
    tones?: ChordTones
): VoicingScore {
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

    score -= metrics.mutedCount * 2;
    if (metrics.mutedCount === 0) {
        reasons.push('Uses all six strings.');
    } else {
        reasons.push(`${metrics.mutedCount} muted string${metrics.mutedCount === 1 ? '' : 's'}.`);
    }

    if (voicing.span <= 4) {
        score += 12;
        reasons.push(`Compact fret span (${voicing.span}).`);
    } else if (voicing.span <= 6) {
        score += 4;
        reasons.push(`Moderate fret span (${voicing.span}).`);
    } else {
        score -= Math.max(0, voicing.span - 6) * 5;
        reasons.push(`Wide fret span (${voicing.span}).`);
    }

    if (voicing.minFret >= 0 && voicing.maxFret <= 7) {
        score += 10;
        reasons.push('Lives in a low-to-mid fret region.');
    } else if (voicing.minFret >= 0 && voicing.maxFret <= 12) {
        score += 4;
        reasons.push('Lives in a standard fret region.');
    } else {
        score -= 4;
        reasons.push('Lives in a high or awkward fret region.');
    }

    if (metrics.openStringCount > 0 && voicing.maxFret <= 5) {
        score += Math.min(metrics.openStringCount, 2) * 3;
        reasons.push(`Uses ${metrics.openStringCount} practical open string${metrics.openStringCount === 1 ? '' : 's'}.`);
    } else if (metrics.openStringCount >= 3 && voicing.maxFret >= 8) {
        score -= 4;
        reasons.push('Mixes many open strings with a high fret position.');
    }

    if (metrics.internalMutedCount === 0) {
        score += 4;
        reasons.push('Avoids internal muted-string gaps.');
    } else {
        score -= metrics.internalMutedCount * 6;
        reasons.push(`Has ${metrics.internalMutedCount} internal muted-string gap${metrics.internalMutedCount === 1 ? '' : 's'}.`);
    }

    if (metrics.maxAdjacentFretJump <= 2) {
        score += 8;
        reasons.push('Adjacent strings stay tightly clustered.');
    } else if (metrics.maxAdjacentFretJump <= 4) {
        score += 2;
        reasons.push('Adjacent string movement stays manageable.');
    } else {
        score -= (metrics.maxAdjacentFretJump - 4) * 4;
        reasons.push(`Large adjacent-string jump (${metrics.maxAdjacentFretJump} frets).`);
    }

    if (
        entry.voicingHint?.rootStrings?.length &&
        voicing.template?.rootString !== undefined &&
        entry.voicingHint.rootStrings.includes(voicing.template.rootString)
    ) {
        score += 8;
        reasons.push('Matches the registry root-string hint.');
    } else if (voicing.template?.rootString !== undefined) {
        score -= 3;
        reasons.push('Root string falls outside the registry hint.');
    }

    if (voicing.template?.tags?.some((tag) => ['caged', 'drop-2', 'drop-3', 'power-chord'].includes(tag))) {
        score += 3;
        reasons.push('Matches a standard voicing family.');
    }

    if (omittedOptionalDegrees.length > 0) {
        reasons.push(`Optional tones omitted: ${omittedOptionalDegrees.join(', ')}.`);
    } else if (tones?.tones.some((tone) => !tone.isRequired)) {
        score += 3;
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
            score += optionalCoverage * 2;
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
    tones?: ChordTones
): VoicingCandidate {
    const score = scoreResolvedVoicing(voicing, entryInput, tones);

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
    tones?: ChordTones
): VoicingCandidate[] {
    return voicings
        .map((voicing) => buildVoicingCandidate(voicing, entryInput, tones))
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
