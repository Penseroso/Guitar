import { EngineError } from './errors';
import { parseAllocationId, sixIntegers } from './identity';
import { freeze, integer } from './validation';
import type { ClassicFeaturesV1, LedgerTerm, RankRecord, Six, StructuralCandidate } from './types';

export const SCORE_DENOMINATOR = 110000 as const;
export const CLASSIC_WEIGHTS = Object.freeze({
    spanEnvelopeMax:20, groupEconomy:-6, diagonalPattern:12, groupedContactSize:-2,
    adjacentInternalGap:-1.5, isolatedInternalGap:-6, coreStringGap:-8,
    lowPosition:10, standardPosition:4, highPosition:-4, openTexture:3, highOpenMix:-4,
    rootPresence:6, rootAbsence:-12, rootBass:16, rootedInversion:-8,
    optionalCoverage:2, ringingDensity:3, rootHintMatch:8, rootHintMiss:-3,
});
export const TERM_IDS = Object.freeze(['span-envelope','group-economy','diagonal-pattern','grouped-contact-size',
    'adjacent-internal-gap','isolated-internal-gap','stopped-position','open-texture','root-presence',
    'root-location-hint','root-bass','optional-formula-coverage','ringing-density','core-string-gap']);

export function validateClassicFeatures(f: ClassicFeaturesV1): void {
    if (!f || f.version !== 'legacy-rank-features-v1') throw new EngineError('contract-error','Unsupported ranking feature version.');
    integer(f.spanUm,0,2000000,'spanUm'); integer(f.maxStoppedFret,0,36,'maxStoppedFret');
    for(const key of ['wholeFretGroups','largestBarreContacts','adjacentInternalGaps','isolatedInternalGaps','openFlankedIsolatedGaps','openCount','optionalCoveredCount','unplayedCoreStringCount'] as const) integer(f[key],0,6,key);
    integer(f.soundingCount,1,6,'soundingCount'); integer(f.representativeBassString,0,5,'representativeBassString');
    for(const key of ['diagonalPattern','rootPresent','rootBass','hasExplicitSlash'] as const) if(typeof f[key] !== 'boolean') throw new EngineError('contract-error',`Malformed feature ${key}.`);
    if (!['match','miss','absent'].includes(f.rootHint) || !['Shell','Barre','Open','Standard'].includes(f.legacyTechnique)
        || f.openCount>f.soundingCount || f.wholeFretGroups>f.soundingCount-f.openCount
        || f.largestBarreContacts>f.soundingCount-f.openCount || f.openFlankedIsolatedGaps>f.isolatedInternalGaps
        || f.adjacentInternalGaps+f.isolatedInternalGaps>6-f.soundingCount || f.unplayedCoreStringCount>3
        || (f.rootBass&&!f.rootPresent) || (!f.rootPresent&&f.rootHint!=='absent')) throw new EngineError('contract-error','Inconsistent ranking feature record.');
}

function contributions(f:ClassicFeaturesV1): number[] {
    const Q=SCORE_DENOMINATOR, w=f.isolatedInternalGaps+f.openFlankedIsolatedGaps;
    const ringing=f.legacyTechnique==='Open'||f.legacyTechnique==='Barre';
    return [
        f.spanUm<=40000?20*Q:f.spanUm<95000?40*(95000-f.spanUm):0,
        -6*Math.max(f.wholeFretGroups-1,0)*Q,
        f.wholeFretGroups>1&&f.diagonalPattern?12*Q:0,
        -2*Math.max(f.largestBarreContacts-2,0)*Q,
        -1.5*f.adjacentInternalGaps*Q,
        -6*w*(w+1)/2*Q,
        (f.maxStoppedFret<=7?10:f.maxStoppedFret<=12?4:-4)*Q,
        (f.openCount>0&&f.maxStoppedFret<=5?3*Math.min(f.openCount,2):f.openCount>=3&&f.maxStoppedFret>=8?-4:0)*Q,
        (f.rootPresent?6:-12)*Q,
        (f.rootHint==='match'?8:f.rootHint==='miss'?-3:0)*Q,
        (f.hasExplicitSlash?0:f.rootBass?16:f.rootPresent&&f.representativeBassString>=3?-8:0)*Q,
        2*f.optionalCoveredCount*Q,
        ringing?3*f.soundingCount*Q:0,
        ringing?-8*f.unplayedCoreStringCount*Q:0,
    ];
}

/** Projection-only formula. Orchestration carries all other metadata unchanged. */
export function scoreFeatures(features:ClassicFeaturesV1): number {
    validateClassicFeatures(features);
    const numerator=contributions(features).reduce((sum,n)=>sum+n,0);
    if(!Number.isSafeInteger(numerator)||numerator < -2147483648||numerator>2147483647) throw new EngineError('contract-error','Ranking numerator exceeds the signed integer contract.');
    return numerator;
}

export function rankingLedger(f:ClassicFeaturesV1): readonly LedgerTerm[] {
    validateClassicFeatures(f);
    const numerators=contributions(f);
    const inputs:LedgerTerm['inputs'][]=[
        {spanUm:f.spanUm,flatUntilUm:40000,zeroAtUm:95000},
        {wholeFretGroups:f.wholeFretGroups}, {wholeFretGroups:f.wholeFretGroups,diagonalPattern:f.diagonalPattern},
        {largestBarreContacts:f.largestBarreContacts}, {adjacentInternalGaps:f.adjacentInternalGaps},
        {isolatedInternalGaps:f.isolatedInternalGaps,openFlankedIsolatedGaps:f.openFlankedIsolatedGaps,weightedUnits:f.isolatedInternalGaps+f.openFlankedIsolatedGaps},
        {maxStoppedFret:f.maxStoppedFret}, {openCount:f.openCount,maxStoppedFret:f.maxStoppedFret},
        {rootPresent:f.rootPresent}, {rootHint:f.rootHint},
        {hasExplicitSlash:f.hasExplicitSlash,rootBass:f.rootBass,rootPresent:f.rootPresent,representativeBassString:f.representativeBassString},
        {optionalCoveredCount:f.optionalCoveredCount,rolePolicy:'legacy-optional-v1'},
        {soundingCount:f.soundingCount,legacyTechnique:f.legacyTechnique},
        {unplayedCoreStringCount:f.unplayedCoreStringCount,legacyTechnique:f.legacyTechnique},
    ];
    return freeze(TERM_IDS.map((id,i)=>({id,active:numerators[i]!==0,inputs:inputs[i],featureVersion:f.version,
        interpretation: i<4?'engineering-heuristic':i>=6&&i<=12?'musical-convention':'product-preference',
        numerator:numerators[i] || 0,denominator:SCORE_DENOMINATOR,reasonCode:`classic-v1:${id}`})));
}

export function rankCandidate(candidate:StructuralCandidate,features:ClassicFeaturesV1):RankRecord {
    const parsed=parseAllocationId(candidate.allocationId);
    if(parsed.states.some((f,i)=>f!==candidate.states[i])) throw new EngineError('contract-error','Rank identity disagrees with allocation.');
    return freeze({allocationId:candidate.allocationId,policy:'classic-v1',numericVersion:'rank-int-v1',
        scoreNumerator:scoreFeatures(features),denominator:SCORE_DENOMINATOR,tie:[...candidate.states] as Six<number>,ledger:rankingLedger(features)});
}
export interface RankKey {scoreNumerator:number;tie:Six<number>}
export function validateRankKey(key:RankKey):void {
    integer(key.scoreNumerator,-2147483648,2147483647,'scoreNumerator');sixIntegers(key.tie,-1,36,'tie');
}
/** Only integer numerator and physical-string tuple decide order. */
export function compareRank(a:RankKey,b:RankKey):number {
    const score=b.scoreNumerator-a.scoreNumerator;if(score) return score;
    for(let s=0;s<6;s++) if(a.tie[s]!==b.tie[s]) return a.tie[s]-b.tie[s];
    return 0;
}
