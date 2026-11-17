const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const {Module,createRequire}=require('node:module');
const root='/workspace/Guitar-p2';
const out='/workspace/p4-validation/a';
const baseline='af2fb44e5c9a9c1882bffbb594be46c4e481c25b';
const req=createRequire(path.join(root,'package.json'));
const ts=req('typescript');
const git=(...args)=>cp.execFileSync('git',args,{cwd:root});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const source=git('show',baseline+':src/domain/tab/analysis.ts').toString();
const helperStart=source.indexOf('function chordCandidates(');
const helperEnd=source.indexOf('/** Analyze inclusive moment indices;',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'baseline helper extraction failed');
const helper=source.slice(helperStart,helperEnd).trim();
fs.writeFileSync(path.join(out,'baseline-analysis.original.ts.txt'),source);
fs.writeFileSync(path.join(out,'baseline-helper.original.txt'),helper+'\n');
const compiled=ts.transpileModule(source+'\nexport { chordCandidates as baselineChordCandidates };\n',{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
}).outputText;
const oldModule=new Module(path.join(root,'src/domain/tab/analysis.baseline-validation.cjs'));
oldModule.filename=path.join(root,'src/domain/tab/analysis.baseline-validation.cjs');
oldModule.paths=Module._nodeModulePaths(path.dirname(oldModule.filename));
oldModule._compile(compiled,oldModule.filename);
const oldBuild=oldModule.exports.baselineChordCandidates;
const oldAnalyze=oldModule.exports.analyzeTabSelection;
const {buildTabChordCandidates:newBuild}=req('./src/domain/tab/chord-candidates.ts');
const {analyzeTabSelection:newAnalyze}=req('./src/domain/tab/analysis.ts');
const policyPaths=git('ls-tree','-r','--name-only',baseline,'--','src/domain/chord','src/domain/harmony','src/domain/scale','src/domain/shared','docs/architecture/engine-specification.md','docs/architecture/product-policy-v2.md').toString().trim().split('\n');
const protectedTab=['src/domain/tab/passage-analysis.ts','src/domain/tab/harmonic-spans.ts','src/domain/tab/contextual-spelling.ts','src/domain/tab/ascii.ts','src/domain/tab/types.ts'];
const preserved=[...policyPaths,...protectedTab].map(file=>({file,baseline:hash(git('show',baseline+':'+file)),working:hash(fs.readFileSync(path.join(root,file)))}));
assert(preserved.every(p=>p.baseline===p.working),'engine/policy/dependency source changed');
const runtimeFiles=['src/domain/tab/analysis.ts','src/domain/tab/chord-candidates.ts'];
const runtimeBefore=Object.fromEntries(runtimeFiles.map(file=>[file,hash(fs.readFileSync(path.join(root,file)))]));
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}};
const baselineHash=crypto.createHash('sha256'),newHash=crypto.createHash('sha256');
let candidateTotal=0;const counts={exact:0,incomplete:0,'added-tone':0};const cases=[];
for(let mask=0;mask<4096;mask++){
 const pcs=Array.from({length:12},(_,pc)=>pc).filter(pc=>mask&(1<<pc));const before=JSON.stringify(pcs);freeze(pcs);
 const expected=oldBuild(pcs),actual=newBuild(pcs);
 assert.deepStrictEqual(actual,expected,'helper mismatch mask '+mask);
 assert.equal(JSON.stringify(pcs),before,'mutated pitch input mask '+mask);
 const e=JSON.stringify(expected),a=JSON.stringify(actual);assert.equal(a,e,'serialized helper mismatch mask '+mask);baselineHash.update(mask+':'+e+'\n');newHash.update(mask+':'+a+'\n');
 candidateTotal+=expected.length;for(const candidate of expected)counts[candidate.match]++;
 cases.push({mask,candidates:expected.length,fingerprint:hash(e)});
}
let extraHelperCases=0;
for(const pcs of [[9,0,4,7],[7,4,0],[0,0,4,4,7],[11,4,0],[10,7,4],[3,1,10,7,4,0],[],[0],[11,9,7,5,4,2,0]]){
 freeze(pcs);assert.deepStrictEqual(newBuild(pcs),oldBuild(pcs));extraHelperCases++;
}
const {parseAsciiTab}=req('./src/domain/tab/ascii.ts');
const {AUDIT_TABS}=req('./src/domain/tab/fixtures/audit-tabs.ts');
const {createScaleRef}=req('./src/domain/scale/scale-ref.ts');
function score(label,columns){return {label,document:{format:'authored',timing:'order-only',source:'manual:'+label,tuningMidi:[64,59,55,50,45,40],capo:0,measureCount:Math.max(1,...columns.map(c=>c.measure??1)),moments:columns.map((column,index)=>({id:'m'+index,index,measure:column.measure??1,column:index+1,notes:column.midis.map((midi,string)=>({id:'n'+index+'-'+string,string,fret:0,midi,pitchClass:midi%12,source:null}))}))}}}
const fixtures=[
 score('blank',[{midis:[]}]),score('single',[{midis:[60]}]),score('dyad',[{midis:[60,64]}]),score('octave-doubled-power',[{midis:[43,50,55]}]),score('ambiguous-sixth',[{midis:[57,60,64,67]}]),score('missing-fifth',[{midis:[60,64,71]}]),score('added-pitch',[{midis:[60,64,67,61]}]),score('pitch-rich',[{midis:[60,61,64,67,70,73]}]),score('whole-bar-collections',[{midis:[62],measure:1},{midis:[65],measure:1},{midis:[69],measure:1},{midis:[67],measure:2},{midis:[71],measure:2},{midis:[74],measure:2},{midis:[60],measure:3},{midis:[64],measure:3},{midis:[67],measure:3}]),score('simultaneous-sequence',[{midis:[62,65,69]},{midis:[67,71,74,77]},{midis:[60,64,67]}]),score('mixed-gap',[{midis:[60]},{midis:[64,67]},{midis:[]},{midis:[60,64,67]}])
];
for(const [name,text] of Object.entries(AUDIT_TABS))for(const [id,options] of [['standard',{}],['drop-capo',{tuningMidi:[64,59,55,50,45,38],capo:2}]]){
 const sourceText=id==='drop-capo'?text.replace(/^E(?=\|)/m,'D'):text;const parsed=parseAsciiTab(sourceText,options);assert(parsed.ok,'fixture parse failed '+name+'/'+id+': '+JSON.stringify(parsed.diagnostics));fixtures.push({label:'ascii-'+name+'-'+id,document:parsed.document});
}
const decorated=score('authored-markers',[{midis:[60]},{midis:[]},{midis:[]},{midis:[]},{midis:[62]}]);
decorated.document.moments[0].notes[0].techniques=[{kind:'slide',toNoteId:'n4-0'}];decorated.document.moments[1].sustains=[{noteId:'n0-0',duration:{numerator:1,denominator:2}}];decorated.document.moments[2].mutes=[{string:0}];decorated.document.moments[3].rest={duration:{numerator:1,denominator:1}};fixtures.push(decorated);
const contexts=[{label:'none',value:{scale:null,chord:null,frame:null}},
{label:'C-key',value:{scale:null,chord:null,frame:{tonic:'C',mode:'major',lens:'jazz-pop'}}},
{label:'Db-key',value:{scale:null,chord:null,frame:{tonic:'Db',mode:'major',lens:'classical'}}},
{label:'C-minor',value:{scale:null,chord:null,frame:{tonic:'C',mode:'minor',lens:'jazz-pop'}}},
{label:'independent-scale-chord',value:{scale:createScaleRef('Diatonic Modes','Ionian',0),chord:{root:'D',chordId:'minor'},frame:{tonic:'C',mode:'major',lens:'jazz-pop'}}},
{label:'dual-spelling',value:{scale:createScaleRef('Jazz Minor Modes','Altered scale',0),chord:{root:'C',chordId:'hendrix-7-sharp-9'},frame:null}},
{label:'invalid-context',value:{scale:{group:'no',scaleId:'no',tonic:0},chord:{root:'?',chordId:'missing'},frame:{tonic:'C',mode:'dorian',lens:'jazz-pop'}}}];
const oldAnalysisHash=crypto.createHash('sha256'),newAnalysisHash=crypto.createHash('sha256');let analyses=0;
for(const fixture of fixtures)for(const timing of ['untimed','timed']){
 const document=structuredClone(fixture.document);
 if(timing==='timed'){document.meter={numerator:4,denominator:4};for(const m of document.moments){m.beatOffset={numerator:m.index%4,denominator:1};for(const n of m.notes)n.duration={numerator:1,denominator:2};}}
 const last=document.moments.length-1;
 const selections=[{start:0,end:last},{start:0,end:0},{start:last,end:last},{start:last,end:0},{start:-1,end:last},{start:0,end:last+1}];
 for(const context of contexts)for(const selection of selections){
  const data=JSON.stringify({document,context:context.value,selection});freeze(document);freeze(context.value);freeze(selection);
  const expected=oldAnalyze(document,selection,context.value),actual=newAnalyze(document,selection,context.value);
  const label=fixture.label+'/'+timing+'/'+context.label+'/'+JSON.stringify(selection);
  assert.deepStrictEqual(actual,expected,'analysis mismatch '+label);
  assert.equal(JSON.stringify({document,context:context.value,selection}),data,'analysis mutation '+label);
  oldAnalysisHash.update(label+':'+JSON.stringify(expected)+'\n');newAnalysisHash.update(label+':'+JSON.stringify(actual)+'\n');analyses++;
 }
}
assert(preserved.every(p=>hash(fs.readFileSync(path.join(root,p.file)))===p.working),'protected source changed during validation');
const runtimeAfter=Object.fromEntries(runtimeFiles.map(file=>[file,hash(fs.readFileSync(path.join(root,file)))]));assert.deepStrictEqual(runtimeAfter,runtimeBefore,'runtime sources changed during validation');
const summary={gate:'P4-A refactor equivalence only, not a musical-truth oracle',baseline,helper:{masks:4096,additionalInputOrderAndDoublingCases:extraHelperCases,candidateTotal,counts,baselineFingerprint:baselineHash.digest('hex'),newFingerprint:newHash.digest('hex'),mismatches:0,inputMutations:0},analysis:{fixtures:fixtures.length,timingVariants:2,contexts:contexts.length,selections:6,cases:analyses,baselineFingerprint:oldAnalysisHash.digest('hex'),newFingerprint:newAnalysisHash.digest('hex'),mismatches:0,inputMutations:0},source:{baselineAnalysisHash:hash(source),baselineHelperHash:hash(helper),preservedSourceFiles:preserved.length,runtimeFiles:runtimeAfter},verdict:'GO'};
fs.writeFileSync(path.join(out,'mask-fingerprints.json'),JSON.stringify(cases,null,2));
fs.writeFileSync(path.join(out,'protected-source-hashes.json'),JSON.stringify(preserved,null,2));
fs.writeFileSync(path.join(out,'equivalence-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
