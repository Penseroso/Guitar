import {it,expect} from 'vitest';
import ts from 'typescript';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';

function imports(file:string){
 const ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true),out:{name:string;typeOnly:boolean}[]=[];
 function visit(node:ts.Node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))out.push({name:node.moduleSpecifier.text,typeOnly:ts.isImportDeclaration(node)?!!node.importClause?.isTypeOnly:node.isTypeOnly});
  if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(node.expression)&&node.expression.text==='require'))throw Error('Dynamic imports are not permitted inside layer policies');
  ts.forEachChild(node,visit);
 }visit(ast);return out;
}
function runtimeClosure(root:string){const pending=[resolve('src/domain/chord/engine',root)],seen=new Set<string>();
 while(pending.length){const file=pending.pop()!;if(seen.has(file))continue;seen.add(file);
  for(const i of imports(file)){if(i.typeOnly)continue;const base=i.name.startsWith('.')?resolve(dirname(file),i.name):i.name.startsWith('@/')?resolve('src',i.name.slice(2)):null;
   expect(base,'Policies cannot load external packages').not.toBeNull();const target=[base,base+'.ts',base+'.json'].find(p=>existsSync(p!))!;
   if(!target.endsWith('.json'))pending.push(target);
  }
 }return [...seen].map(file=>basename(file));
}
it('enforces L2/L3 independence, unchanged score ownership, and output-only surface composition',()=>{
 for(const root of ['physical.ts','physicalDemand.ts'])expect(runtimeClosure(root).join(' ')).not.toMatch(/Vocabulary|vocabulary|recommendedSurface|surfaceRequest|presentation|session|classicFeatures|deterministicRanking/);
 expect(runtimeClosure('practicalVocabulary.ts')).toEqual(['practicalVocabulary.ts']);
 const l3=readFileSync('src/domain/chord/engine/practicalVocabulary.ts','utf8');expect(l3).not.toMatch(/physicalProfile|\.status|\.U\b|55000|42000/);
 for(const root of ['classicFeatures.ts','deterministicRanking.ts'])expect(runtimeClosure(root).join(' ')).not.toMatch(/physical\.ts|physicalDemand|Vocabulary|vocabulary|recommendedSurface|surfaceRequest|presentation|session/);
 expect(imports(resolve('src/domain/chord/engine/recommendedSurface.ts'))).toEqual([{name:'./demandContract',typeOnly:true},{name:'./vocabularyContract',typeOnly:true}]);
 const shipped=readFileSync('src/domain/chord/engine/practicalVocabularyData.json','utf8');expect(shipped).not.toMatch(/https?:|svg|sourceUrl|finger|observed|branding|All-Guitar/i);
});
