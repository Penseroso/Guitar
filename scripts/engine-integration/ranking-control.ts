/** Identical-pool control: old survivors, pinned old features and independent old scorer. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { CHORD_REGISTRY_LIST } from '../../src/domain/chord/registry';
import { searchDeductiveVoicings } from '../../src/domain/chord/voicingSearch';
import { buildDeductiveChordTones } from '../../src/domain/chord/degreeRequirements';
import { getVoicingShapeMetrics,getVoicingTechniqueTag,scoreResolvedVoicing,type DeductiveRankingWeights } from '../../src/domain/chord/deductiveRanking';
import { FROZEN_CHORD_BASELINE } from '../chord-baseline';
import { compileRequest } from '../../src/domain/chord/engine/requestPolicy';
import { createClassicProjector } from '../../src/domain/chord/engine/classicFeatures';
import { CLASSIC_WEIGHTS,scoreFeatures,rankingLedger,TERM_IDS } from '../../src/domain/chord/engine/deterministicRanking';
import type { Six } from '../../src/domain/chord/engine/types';

const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const controls:Record<string,string>={
    'src/domain/chord/deductiveRanking.ts':'d849599db50cd94d49e6c7f0f150c41d4e0b794458f4ab05a3e08ec1a65bff83',
    'src/domain/chord/fretGeometry.ts':'4b61f72e5d403786fb32450fb5bf4334049d982ff31d5f16b1b9fc6602e8fef0',
    'scripts/chord-baseline.ts':'0c4e4221ca76f90b6b3648bdae6ca36a06b42af1683cd7299234024cf684a040',
};
for(const [path,hash] of Object.entries(controls)) assert.equal(sha(path),hash,`Pinned control changed: ${path}`);
const weightMap:Record<keyof typeof CLASSIC_WEIGHTS,keyof DeductiveRankingWeights>={
    spanEnvelopeMax:'handSpanComfortMax',groupEconomy:'fingerEconomyPerFinger',diagonalPattern:'diagonalRollBonus',
    groupedContactSize:'barreWidthPenaltyPerString',adjacentInternalGap:'internalMuteAdjacentPenalty',isolatedInternalGap:'internalMuteIsolatedPenalty',
    coreStringGap:'innerStringMutePenalty',lowPosition:'lowPositionBonus',standardPosition:'standardPositionBonus',highPosition:'highPositionPenalty',
    openTexture:'openStringBonus',highOpenMix:'highOpenMixPenalty',rootPresence:'rootPresenceBonus',rootAbsence:'rootPresencePenalty',
    rootBass:'rootInBassBonus',rootedInversion:'rootInBassPenalty',optionalCoverage:'colorToneBonus',ringingDensity:'fullnessBonusPerString',
    rootHintMatch:'rootHintBonus',rootHintMiss:'rootHintPenalty',
};
for(const key of Object.keys(weightMap) as (keyof typeof CLASSIC_WEIGHTS)[]) assert.equal(CLASSIC_WEIGHTS[key],FROZEN_CHORD_BASELINE[weightMap[key]],key);
const termWeights:(keyof DeductiveRankingWeights)[][]=[
    ['handSpanComfortMax'],['fingerEconomyPerFinger'],['diagonalRollBonus'],['barreWidthPenaltyPerString'],
    ['internalMuteAdjacentPenalty'],['internalMuteIsolatedPenalty'],['lowPositionBonus','standardPositionBonus','highPositionPenalty'],
    ['openStringBonus','highOpenMixPenalty'],['rootPresenceBonus','rootPresencePenalty'],['rootHintBonus','rootHintPenalty'],
    ['rootInBassBonus','rootInBassPenalty'],['colorToneBonus'],['fullnessBonusPerString'],['innerStringMutePenalty'],
];
const isolatedWeights=termWeights.map(keys=>Object.fromEntries(Object.entries(FROZEN_CHORD_BASELINE).map(([key,value])=>[key,keys.includes(key as keyof DeductiveRankingWeights)?value:0])) as DeductiveRankingWeights);
const Q=110000, oldSpan=(spanMm:number)=>spanMm<=40?20:spanMm>=95?0:20*(95-spanMm)/55;
const spanNumerator=(spanUm:number)=>spanUm<=40000?20*Q:spanUm>=95000?0:40*(95000-spanUm);
const numericTuple=(a:readonly number[],b:readonly number[])=>{for(let i=0;i<6;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
let candidates=0,ledgerChecks=0,changedOrderQueries=0,changedTop6Queries=0,changedTop18Queries=0;
let maxScoreDifference=0,quantizationReversedPairs=0,changedPositionsTotal=0;
const rows:object[]=[],started=performance.now();
for(const entry of CHORD_REGISTRY_LIST) {
    for(let root=0;root<12;root++) for(const context of ['standalone','accompaniment'] as const) {
        const label=`${entry.id}/${root}/${context}`, request=compileRequest({schema:'intent-v1',chordId:entry.id,rootPitchClass:root,context});
        const projector=createClassicProjector(request),tones=buildDeductiveChordTones(entry,root);
        const pool=searchDeductiveVoicings(entry,root,{position:'close'},{maxFret:15,context});
        const queryStarted=performance.now();
        const records=pool.map((voicing,index)=>{
            const mutable=Array<number>(6).fill(-1);
            for(const note of voicing.notes)if(!note.isMuted)mutable[note.string]=note.fret;
            const states=mutable as unknown as Six<number>, actual=projector(states),metrics=getVoicingShapeMetrics(voicing);
            const roots=voicing.descriptor.rootOccurrences,hints=entry.voicingHint?.rootStrings??[];
            const expected={version:'legacy-rank-features-v1',spanUm:actual.spanUm,
                wholeFretGroups:metrics.fingerGroupCount,largestBarreContacts:metrics.barreNoteCount,diagonalPattern:metrics.isDiagonalRollShape,
                adjacentInternalGaps:metrics.internalMutedCount-metrics.isolatedInternalMuteCount,isolatedInternalGaps:metrics.isolatedInternalMuteCount,
                openFlankedIsolatedGaps:metrics.openFlankedIsolatedMuteCount,maxStoppedFret:metrics.maxFret,openCount:metrics.openStringCount,
                soundingCount:metrics.playedCount,rootPresent:voicing.descriptor.hasRoot,
                rootHint:!roots.length||!hints.length?'absent':roots.some(string=>hints.includes(string))?'match':'miss',
                rootBass:voicing.descriptor.inversion==='root-position',representativeBassString:voicing.descriptor.lowestPlayedString,
                hasExplicitSlash:false,optionalCoveredCount:voicing.descriptor.optionalCoverageDegrees.length,
                legacyTechnique:({shell:'Shell',barre:'Barre',open:'Open',standard:'Standard'} as const)[getVoicingTechniqueTag(voicing)],
                unplayedCoreStringCount:voicing.notes.filter(note=>note.isMuted&&[1,2,3].includes(note.string)).length};
            assert.deepEqual(actual,expected,`${label} scalar feature parity`);
            assert.ok(Math.abs(actual.spanUm-metrics.spanMm*1000)<=0.501,`${label} geometry quantization`);
            const oldScore=scoreResolvedVoicing(voicing,entry,tones,{weightOverrides:FROZEN_CHORD_BASELINE}).score;
            const numerator=scoreFeatures(actual), expectedNumerator=Math.round((oldScore-oldSpan(metrics.spanMm))*Q)+spanNumerator(actual.spanUm);
            assert.equal(numerator,expectedNumerator,`${label} only intended span quantization differs`);
            maxScoreDifference=Math.max(maxScoreDifference,Math.abs(numerator/Q-oldScore));
            if(index%Math.max(1,Math.floor(pool.length/6))===0) {
                const ledger=rankingLedger(actual);
                assert.deepEqual(ledger.map(term=>term.id),TERM_IDS);
                for(let term=0;term<14;term++) {
                    const isolated=scoreResolvedVoicing(voicing,entry,tones,{weightOverrides:isolatedWeights[term]}).score;
                    const expectedTerm=term===0?spanNumerator(actual.spanUm):Math.round(isolated*Q);
                    assert.equal(ledger[term].numerator,expectedTerm,`${label} isolated legacy term ${TERM_IDS[term]}`);
                    ledgerChecks++;
                }
            }
            candidates++;
            return {id:states.join(','),states,oldScore,numerator,span:voicing.span,minFret:voicing.minFret,oldId:voicing.id};
        });
        const oldOrder=[...records].sort((a,b)=>b.oldScore-a.oldScore||a.span-b.span||a.minFret-b.minFret||a.oldId.localeCompare(b.oldId));
        const newOrder=[...records].sort((a,b)=>b.numerator-a.numerator||numericTuple(a.states,b.states));
        const oldRanks=new Map(oldOrder.map((record,index)=>[record.id,index]));
        let changed=0;
        for(let index=0;index<newOrder.length;index++) {
            const current=newOrder[index];
            if(oldRanks.get(current.id)!==index) {changed++;changedPositionsTotal++;}
            if(index>0&&newOrder[index-1].oldScore<current.oldScore)quantizationReversedPairs++;
        }
        const topChanged=(count:number)=>oldOrder.slice(0,count).some((record,index)=>record.id!==newOrder[index]?.id);
        if(changed)changedOrderQueries++;
        if(topChanged(6))changedTop6Queries++;
        if(topChanged(18))changedTop18Queries++;
        rows.push({chordId:entry.id,root,context,candidates:pool.length,changedPositions:changed,
            top6Changed:topChanged(6),top18Changed:topChanged(18),oldTop6:oldOrder.slice(0,6).map(record=>record.id),
            newTop6:newOrder.slice(0,6).map(record=>record.id),comparisonMs:performance.now()-queryStarted});
    }
    process.stdout.write(`Ranking control complete: ${entry.id} (${rows.length}/480)\n`);
}
assert.equal(candidates,1647041);assert.equal(rows.length,480);
const sources=['src/domain/chord/engine/classicFeatures.ts','src/domain/chord/engine/deterministicRanking.ts','src/domain/chord/engine/catalog.ts','src/domain/chord/engine/geometryTable.ts'];
const output={schema:'engine-ranking-control-v1',createdAt:new Date().toISOString(),node:process.version,
    controls,sourceHashes:Object.fromEntries(sources.map(path=>[path,sha(path)])),weightsChecked:20,queries:rows.length,candidates,
    allScalarFeaturesEqual:true,allScoresEqualAfterSpecifiedSpanQuantization:true,ledgerChecks,
    maxScoreDifference,changedOrderQueries,changedTop6Queries,changedTop18Queries,changedPositionsTotal,quantizationReversedPairs,
    methodology:'Identical old baseline survivor pools only. All feature scalars match the independent legacy code; every score differs only by specified span quantization. Fourteen isolated old-weight contributions checked on systematic per-query samples. New order uses integer scores and numeric state tuples; old order uses float scores, raw span, minimum fret and locale ID. Order diagnostics do not establish improved preference or human outcomes. Node single-run comparison timings include controls/assertions, not browser performance.',
    elapsedMs:performance.now()-started,rows};
mkdirSync('docs/implementation',{recursive:true});writeFileSync('docs/implementation/engine-ranking-control.json',`${JSON.stringify(output,null,2)}\n`);
process.stdout.write(`${JSON.stringify({candidates,ledgerChecks,changedOrderQueries,changedTop6Queries,changedTop18Queries,maxScoreDifference,elapsedMs:output.elapsedMs})}\n`);
