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

export function scoreResolvedVoicing(
    voicing: ResolvedVoicing,
    entryInput: string | ChordRegistryEntry,
    tones?: ChordTones
): VoicingScore {
    const entry = resolveChordRegistryEntry(entryInput);
    const playedDegrees = collectPlayedDegrees(voicing);
    const requiredDegrees = getRequiredChordDegrees(entry);
    const matchedRequiredDegrees = requiredDegrees.filter((degree) => playedDegrees.has(degree));
    const missingRequiredDegrees = requiredDegrees.filter((degree) => !playedDegrees.has(degree));
    const reasons: string[] = [];
    let score = 0;

    if (voicing.playable) {
        score += 50;
        reasons.push('Playable in the resolved fret region.');
    } else {
        score -= 200;
        reasons.push('Contains invalid or disallowed fret positions.');
    }

    if (missingRequiredDegrees.length === 0) {
        score += 30;
        reasons.push('Covers all required chord degrees.');
    } else {
        score -= missingRequiredDegrees.length * 25;
        reasons.push(`Missing required degrees: ${missingRequiredDegrees.join(', ')}.`);
    }

    if (playedDegrees.has('1')) {
        score += 15;
        reasons.push('Contains the chord root.');
    } else {
        score -= 20;
        reasons.push('Omits the chord root.');
    }

    const mutedCount = voicing.notes.filter((note) => note.isMuted).length;
    score -= mutedCount * 2;
    if (mutedCount === 0) {
        reasons.push('Uses all six strings.');
    } else {
        reasons.push(`${mutedCount} muted string${mutedCount === 1 ? '' : 's'}.`);
    }

    if (voicing.span <= 4) {
        score += 12;
        reasons.push(`Compact fret span (${voicing.span}).`);
    } else {
        score -= Math.max(0, voicing.span - 4) * 4;
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
