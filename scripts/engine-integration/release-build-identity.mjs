import {access,readFile,readdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpus,release,totalmem} from 'node:os';
const sha=b=>createHash('sha256').update(b).digest('hex');
const trackedSourceFiles=execFileSync('git',['ls-files','--','src'],{encoding:'utf8'}).trim().split(/\r?\n/).sort();
const sourceFiles=[];for(const path of trackedSourceFiles)try{await access(path);sourceFiles.push(path);}catch{/* Pending cleanup deletions are absent from the working source identity. */}
const source=createHash('sha256');for(const path of sourceFiles)source.update(path).update('\0').update(await readFile(path)).update('\0');
const buildFiles=['.next/BUILD_ID','.next/build-manifest.json','.next/routes-manifest.json','.next/required-server-files.json'];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())await walk(path);else buildFiles.push(path);}}
await walk('.next/server');await walk('.next/static');
const assets=[];const combined=createHash('sha256');
for(const path of buildFiles.sort()){const bytes=await readFile(path);assets.push({path,bytes:bytes.length,sha256:sha(bytes)});combined.update(path).update('\0').update(bytes).update('\0');}
const evidence={schema:'release-build-identity-v1',at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceTree:execFileSync('git',['rev-parse','HEAD:src'],{encoding:'utf8'}).trim(),sourceSha256:source.digest('hex'),sourceFileCount:sourceFiles.length,productionDiff:execFileSync('git',['diff','HEAD','--','src'],{encoding:'utf8'}),build:(await readFile('.next/BUILD_ID','utf8')).trim(),buildSha256:combined.digest('hex'),hashDefinition:'SHA256 over sorted repository-relative path + NUL + raw bytes + NUL; all tracked src files for source; BUILD_ID/three root manifests and all server/static files for build',node:process.version,os:release(),cpu:cpus()[0].model,logicalProcessors:cpus().length,physicalMemoryBytes:totalmem(),assets};
await writeFile('docs/implementation/release-build-identity.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({...evidence,assets:assets.length},null,2));
