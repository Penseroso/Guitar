import { expect,it } from 'vitest';
import { CLASSIC_WEIGHTS, compareRank, rankingLedger, scoreFeatures, SCORE_DENOMINATOR as Q, TERM_IDS } from './deterministicRanking';
import { DEFAULT_DEDUCTIVE_RANKING_WEIGHTS } from '../deductiveRanking';
import type { ClassicFeaturesV1, Six } from './types';

const base:ClassicFeaturesV1={version:'legacy-rank-features-v1',spanUm:0,wholeFretGroups:1,largestBarreContacts:0,diagonalPattern:false,
    adjacentInternalGaps:0,isolatedInternalGaps:0,openFlankedIsolatedGaps:0,maxStoppedFret:5,openCount:0,soundingCount:3,
    rootPresent:true,rootHint:'absent',rootBass:true,representativeBassString:5,hasExplicitSlash:false,optionalCoveredCount:0,legacyTechnique:'Standard',unplayedCoreStringCount:0};
const term=(f:ClassicFeaturesV1,id:string)=>rankingLedger(f).find(t=>t.id===id)!.numerator;

it('pins all 20 retained weights to the immutable baseline control',()=>{
    const {structuralSafetyNetPenalty,slashBassBonus,slashBassPenalty,...retained}=DEFAULT_DEDUCTIVE_RANKING_WEIGHTS;
    expect([structuralSafetyNetPenalty,slashBassBonus,slashBassPenalty]).toEqual([-500,24,-28]);
    expect(Object.values(CLASSIC_WEIGHTS).sort((a,b)=>a-b)).toEqual(Object.values(retained).sort((a,b)=>a-b));
    expect(Object.keys(CLASSIC_WEIGHTS)).toHaveLength(20);
});
it('quantizes the span term exactly at both boundaries and one micrometre either side',()=>{
    for(const [s,n] of [[0,20*Q],[39999,20*Q],[40000,20*Q],[40001,40*54999],[94999,40],[95000,0],[95001,0]]) expect(term({...base,spanUm:s},'span-envelope')).toBe(n);
});
it('reports all 14 terms, including nonlinear stacked gaps and every small ringing contribution',()=>{
    const f={...base,soundingCount:3,openCount:2,wholeFretGroups:1,legacyTechnique:'Open' as const,isolatedInternalGaps:1,openFlankedIsolatedGaps:1,adjacentInternalGaps:1,unplayedCoreStringCount:2};
    const ledger=rankingLedger(f);
    expect(ledger.map(t=>t.id)).toEqual(TERM_IDS);
    expect(ledger.reduce((sum,t)=>sum+t.numerator,0)).toBe(scoreFeatures(f));
    expect(term(f,'isolated-internal-gap')).toBe(-18*Q);
    expect(term(f,'adjacent-internal-gap')).toBe(-1.5*Q);
    expect(term(f,'ringing-density')).toBe(9*Q);
    expect(term(f,'core-string-gap')).toBe(-16*Q);
    expect(ledger.every(t=>t.featureVersion==='legacy-rank-features-v1'&&t.denominator===Q)).toBe(true);
});
it('discloses the 42-point root contrast and neutralizes explicit slash independently',()=>{
    const rooted={...base,rootHint:'match' as const};
    const rootless={...base,rootPresent:false,rootBass:false};
    expect(scoreFeatures(rooted)-scoreFeatures(rootless)).toBe(42*Q);
    expect(term({...rooted,hasExplicitSlash:true},'root-bass')).toBe(0);
    expect(term({...base,rootBass:false,representativeBassString:2},'root-bass')).toBe(0);
    expect(term({...base,rootBass:false},'root-bass')).toBe(-8*Q);
});
it('checks every non-span preference branch against the specified point values',()=>{
    for(const [g,value] of [[0,0],[1,0],[2,-6],[6,-30]]) expect(term({...base,soundingCount:6,wholeFretGroups:g},'group-economy')).toBe(value*Q);
    expect(term({...base,wholeFretGroups:2,diagonalPattern:true},'diagonal-pattern')).toBe(12*Q);
    expect(term({...base,diagonalPattern:true},'diagonal-pattern')).toBe(0);
    for(const b of [0,2,3,6]) expect(term({...base,soundingCount:6,largestBarreContacts:b},'grouped-contact-size')).toBe(-2*Math.max(b-2,0)*Q || 0);
    for(const [m,p] of [[0,10],[7,10],[8,4],[12,4],[13,-4],[36,-4]]) expect(term({...base,maxStoppedFret:m},'stopped-position')).toBe(p*Q);
    for(const [u,m,p] of [[0,5,0],[1,5,3],[2,5,6],[3,5,6],[3,6,0],[3,8,-4],[2,8,0]]) expect(term({...base,soundingCount:6,openCount:u,maxStoppedFret:m},'open-texture')).toBe(p*Q);
    expect(term({...base,rootHint:'miss'},'root-location-hint')).toBe(-3*Q);
    expect(term({...base,optionalCoveredCount:4},'optional-formula-coverage')).toBe(8*Q);
    expect(term({...base,legacyTechnique:'Shell'},'ringing-density')).toBe(0);
    expect(term({...base,legacyTechnique:'Barre',soundingCount:6},'ringing-density')).toBe(18*Q);
});
it('uses a stable numeric tuple total order even for exact ties and crossings',()=>{
    const tuples:Six<number>[]=[[0,8,9,10,-1,-1],[-1,12,0,3,2,1],[0,8,9,10,-1,0],[0,8,9,9,36,36]];
    const ordered=tuples.map(tie=>({scoreNumerator:123,tie})).sort(compareRank);
    expect(ordered.map(k=>k.tie)).toEqual([tuples[1],tuples[3],tuples[0],tuples[2]]);
    expect(compareRank({scoreNumerator:124,tie:tuples[2]},ordered[0])).toBeLessThan(0);
});
it('rejects corrupt projections and keeps extreme six-string numerators signed-32-bit',()=>{
    for(const patch of [{spanUm:NaN},{openCount:7},{wholeFretGroups:4},{rootPresent:false,rootHint:'match'},{soundingCount:0},{isolatedInternalGaps:4}]) expect(()=>scoreFeatures({...base,...patch} as ClassicFeaturesV1)).toThrow();
    for(let n=1;n<=6;n++) for(let g=0;g<=n;g++) for(let spanUm=0;spanUm<=2000000;spanUm+=10000) {
        const f={...base,soundingCount:n,wholeFretGroups:g,spanUm,isolatedInternalGaps:6-n,openFlankedIsolatedGaps:6-n,unplayedCoreStringCount:3};
        expect(Math.abs(scoreFeatures(f))).toBeLessThan(2147483647);
    }
});
