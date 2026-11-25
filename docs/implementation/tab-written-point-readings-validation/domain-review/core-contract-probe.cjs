const assert=require('node:assert/strict');const fs=require('node:fs');const crypto=require('node:crypto');const path=require('node:path');const{createRequire}=require('node:module');
const req=createRequire('/workspace/Guitar-p2/package.json');
const{CHORD_REGISTRY_LIST}=req('./src/domain/chord/registry');const{SCALES}=req('./src/domain/scale/scales');
const{observeTabAcrossBarsWrittenTime}=req('./src/domain/tab/written-time-across-bars');
const{analyzeTabWrittenPoint,describeTabWrittenPointCandidate}=req('./src/domain/tab/written-point-analysis');
const{createScaleRef}=req('./src/domain/scale/scale-ref');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const time={numerator:'0',denominator:'1'};
function snapshot(midis){return observeTabAcrossBarsWrittenTime({format:'authored',timing:'order-only',source:'contract probe',tuningMidi:[64,59,55,50,45,40],capo:0,measureCount:1,meter:{numerator:4,denominator:4},moments:midis.map((midi,index)=>({id:'p'+index,index,measure:1,column:index+1,beatOffset:{numerator:0,denominator:1},notes:[{id:'n'+index,string:index%6,fret:0,midi,pitchClass:midi%12,source:null,duration:{numerator:1,denominator:1}}]}))},1,{model:'regular-bar-origins'})}
const duplicatePCChordFormulas=CHORD_REGISTRY_LIST.filter(e=>new Set(e.formula.intervals.map(v=>v%12)).size<e.formula.intervals.length).map(e=>e.id);
const duplicatePCScales=Object.entries(SCALES).flatMap(([group,scales])=>Object.entries(scales).filter(([_,ivs])=>new Set(ivs.map(v=>v%12)).size<ivs.length).map(([name])=>group+'/'+name));assert.equal(duplicatePCChordFormulas.length,0);assert.equal(duplicatePCScales.length,0);
const cases=[];
for(const [tonic,midis,key,expected]of[['B#',[60,64,67],'0:major','B♯3'],['Cb',[59,63,66],'11:major','C♭4']]){
 const a=analyzeTabWrittenPoint(snapshot(midis),time,{scale:null,frame:{tonic,mode:'major',lens:'jazz-pop'}});assert.equal(a.status,'complete');const d=describeTabWrittenPointCandidate(a,key);assert.equal(d.notes[0].chordNoteName,expected);assert.equal(d.notes[0].midi,midis[0]);cases.push({id:tonic+'-written-octave',expected,actual:d.notes[0].chordNoteName});
}
const dim=analyzeTabWrittenPoint(snapshot([60,63,66,69]),time,{scale:null,frame:null});const d=describeTabWrittenPointCandidate(dim,'0:diminished-7');assert.deepEqual(d.notes.map(n=>[n.chordDegree,n.chordNoteName]),[['1','C4'],['b3','E♭4'],['b5','G♭4'],['bb7','B♭♭4']]);cases.push({id:'canonical-diminished-seventh',actual:d.notes.map(n=>[n.chordDegree,n.chordNoteName])});
const s=snapshot([60,64,71]);const neutral=analyzeTabWrittenPoint(s,time,{scale:null,frame:null});
const invalidScales=[3,[],{},null,{group:'Diatonic Modes',scaleId:'missing',tonic:0},{group:'Diatonic Modes',scaleId:'Ionian',tonic:-1},{group:'Diatonic Modes',scaleId:'Ionian',tonic:.5},{group:'toString',scaleId:'x',tonic:0}];
const invalidFrames=[3,[],{},null,{tonic:'C',mode:'dorian',lens:'jazz-pop'},{tonic:'?',mode:'major',lens:'jazz-pop'},{tonic:'C',mode:'major',lens:'unknown'},{tonic:{toString:null},mode:'major',lens:'jazz-pop'}];let invalidCases=0;
for(const scale of invalidScales)for(const frame of invalidFrames){const a=analyzeTabWrittenPoint(s,time,{scale,frame});assert.equal(a.status,'complete');assert.deepEqual(a.candidates,neutral.candidates);assert.deepEqual(a.notes,neutral.notes);assert(a.candidatePresentations.every(p=>p.roman===null));if(scale!==null||frame!==null)assert(a.diagnostics.length>0);invalidCases++;}
const modal=analyzeTabWrittenPoint(snapshot([62,65,69]),time,{scale:createScaleRef('Diatonic Modes','Dorian',2),frame:null});assert(modal.notes.every(n=>n.inScale));assert(modal.candidatePresentations.every(p=>p.roman===null));
const result={scope:'Independent source-contract probes, not the challenge agent musical oracle or browser gate',duplicatePCChordFormulas,duplicatePCScales,cases,invalidReferencePairs:invalidCases,invalidReferenceFailures:0,modalCollectionDidNotSupplyAKey:true,coreSourceSha256:hash(fs.readFileSync('/workspace/Guitar-p2/src/domain/tab/written-point-analysis.ts')),verdict:'core checks pass; UI/lifecycle review pending'};
fs.writeFileSync('/workspace/p4-validation/b/domain-review/core-contract-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
