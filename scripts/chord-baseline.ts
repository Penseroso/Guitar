import type { DeductiveRankingWeights } from '../src/domain/chord/deductiveRanking';

/** Frozen comparison settings. Never derive this control from current defaults. */
export const FROZEN_CHORD_BASELINE: DeductiveRankingWeights = {
    handSpanComfortMax: 20, fingerEconomyPerFinger: -6, diagonalRollBonus: 12,
    barreWidthPenaltyPerString: -2, internalMuteAdjacentPenalty: -1.5,
    internalMuteIsolatedPenalty: -6, innerStringMutePenalty: -8,
    lowPositionBonus: 10, standardPositionBonus: 4, highPositionPenalty: -4,
    openStringBonus: 3, highOpenMixPenalty: -4,
    rootPresenceBonus: 6, rootPresencePenalty: -12, rootInBassBonus: 16, rootInBassPenalty: -8,
    slashBassBonus: 24, slashBassPenalty: -28, colorToneBonus: 2, fullnessBonusPerString: 3,
    rootHintBonus: 8, rootHintPenalty: -3, structuralSafetyNetPenalty: -500,
};

/** Position-emphasis sensitivity comparator; never a production default. */
export const POSITION_EMPHASIS_PROFILE: DeductiveRankingWeights = {
    ...FROZEN_CHORD_BASELINE,
    lowPositionBonus: 20, standardPositionBonus: 8, highPositionPenalty: -8,
    openStringBonus: 1.5, highOpenMixPenalty: -2,
    barreWidthPenaltyPerString: -3, internalMuteAdjacentPenalty: -2.25,
    internalMuteIsolatedPenalty: -9, innerStringMutePenalty: -12, fullnessBonusPerString: 4.5,
};
