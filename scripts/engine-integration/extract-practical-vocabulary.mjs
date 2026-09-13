// Deterministic extraction of ONLY the authorized abstract convention. No acquisition.
import fs from 'node:fs';
const v=JSON.parse(fs.readFileSync('docs/research/web-voicing-corpus-v2/sitewide-practical-audit/proposed-vocabulary.json','utf8'));
const data={version:'practical-vocabulary-v1',translationVersion:'practical-exact-translation-v1',qualities:v.scope.qualityIds,
closed:v.closedTemplates.map(t=>({id:t.id,quality:t.quality,offsets:t.offsetsHighToLow,rootAnchor:t.rootAnchor,pMin:t.pMin,pMax:t.pMax,kind:t.decision,
allowed:t.allowedPositions==='all-in-range'?null:t.allowedPositions.map(p=>[p.rootPitchClass,p.p])})),
open:v.exactOpenForms.map(o=>({id:o.id,quality:o.quality,root:o.rootPitchClass,states:o.statesHighToLow}))};
fs.writeFileSync('src/domain/chord/engine/practicalVocabularyData.json',JSON.stringify(data,null,2)+'\n');
