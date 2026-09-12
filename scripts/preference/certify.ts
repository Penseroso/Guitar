import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CHORD_REGISTRY_LIST } from '../../src/domain/chord/registry';
import { framesFromNotation, parseNotation } from './frames';
import { hash, signature, tuning, type Observation } from './protocol';
import { openReference } from './reference';

const args = new Map(process.argv.slice(2).map(arg => { const i = arg.indexOf('='); return [arg.slice(0, i), arg.slice(i + 1)]; }));
const required = (name: string) => { const value = args.get(name); if (!value) throw Error(`Required ${name}=PATH`); return path.resolve(value); };
const manifestPath = required('--manifest'), rawRoot = required('--raw-root'), decoder = required('--decoder'), python = required('--python'), output = required('--output');
const referenceRevision = execFileSync('git', ['-C', path.dirname(decoder), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (execFileSync('git', ['-C', path.dirname(decoder), 'diff', 'HEAD', '--'], { encoding: 'utf8' })) throw Error('Reference checkout must match its pinned revision');
const dependencyVersion = execFileSync(python, ['-c', 'import guitarpro; print(guitarpro.__version__)'], { encoding: 'utf8' }).trim();
if (dependencyVersion !== '0.6') throw Error('Reference dependency version must be 0.6');
if (!path.relative(process.cwd(), output).replaceAll('\\', '/').startsWith('.research/')) throw Error('Output must be under ignored .research');
if (fs.existsSync(output)) throw Error('Use a new certification output directory');
fs.mkdirSync(output, { recursive: true });
interface RecordRow { status: string; relativePath: string; fileHash: string; downtuneToken: string; songGroupId: string;
    artistGroupId: string; artistToken: string; genreTokens: string[]; songSplit: string; artistSplit: string }
const manifest: RecordRow[] = fs.readFileSync(manifestPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const lookup = new Map<string, Array<{ chordId: string; rootPitchClass: number }>>();
for (const chord of CHORD_REGISTRY_LIST) for (let root = 0; root < 12; root++) {
    const key = [...new Set(chord.formula.intervals.map(i => (root + i) % 12))].sort((a, b) => a - b).join(',');
    lookup.set(key, [...lookup.get(key) ?? [], { chordId: chord.id, rootPitchClass: root }]);
}
const references = Array.from({ length: 8 }, () => openReference(python, decoder));
const implementation = Object.fromEntries(['frames.ts', 'reference.ts', 'reference_decoder.py', 'certify.ts'].map(name => [name, hash(fs.readFileSync('scripts/preference/' + name, 'utf8'))]));
const accepted: Array<{ relativePath: string; fileHash: string }> = [];
const quarantine: Array<{ relativePath: string; reason: string; detail?: unknown }> = [];
const seen = new Set<string>(), observations: Observation[] = [];
const counts = { files: 0, beats: 0, ties: 0, rests: 0, letRing: 0, ghost: 0, excludedTracks: 0, ambiguous: 0, contextual: 0, invalid: 0, dyads: 0 };
async function main() {
    try {
        const eligible = manifest.filter(record => record.status === 'resolved' && record.downtuneToken === 'downtune:0');
        for (let offset = 0; offset < eligible.length; offset += references.length) {
            const batch = eligible.slice(offset, offset + references.length);
            const decoded = await Promise.all(batch.map(async (record, index) => {
                const file = path.resolve(rawRoot, record.relativePath), relative = path.relative(rawRoot, file);
                if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Raw path escapes root');
                return references[index].decode({ path: file });
            }));
            for (const [index, record] of batch.entries()) {
            const file = path.resolve(rawRoot, record.relativePath), relative = path.relative(rawRoot, file);
            if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Raw path escapes root');
            const text = fs.readFileSync(file, 'utf8'); counts.files++;
            if (hash(text) !== record.fileHash) { quarantine.push({ relativePath: record.relativePath, reason: 'hash-mismatch' }); continue; }
            const official = decoded[index];
            if (!official.ok) { quarantine.push({ relativePath: record.relativePath, reason: 'reference-error', detail: official.error }); continue; }
            let own;
            try { own = parseNotation(text); }
            catch (error) { quarantine.push({ relativePath: record.relativePath, reason: 'parser-error', detail: String(error) }); continue; }
            if (JSON.stringify(own) !== JSON.stringify(official.beats)) {
                const index = own.findIndex((beat, i) => JSON.stringify(beat) !== JSON.stringify(official.beats[i]));
                quarantine.push({ relativePath: record.relativePath, reason: 'notation-mismatch', detail: { index, own: own[index], reference: official.beats[index], lengths: [own.length, official.beats.length] } });
                continue;
            }
            accepted.push({ relativePath: record.relativePath, fileHash: record.fileHash });
            counts.beats += official.beats.length; counts.excludedTracks += official.excluded.length;
            counts.ghost += official.beats.filter(b => b.notes.some(n => n.ghost)).length;
            for (const frame of framesFromNotation(official.beats)) {
                counts.ties += Number(frame.hasTie); counts.rests += Number(frame.rest); counts.letRing += Number(frame.sustainUncertain);
                if (frame.invalid) { counts.invalid++; continue; }
                if (frame.hasTie || frame.sustainUncertain) { counts.contextual++; continue; }
                const size = frame.attack.filter(f => f !== null).length;
                if (size < 2) continue;
                if (size === 2) counts.dyads++;
                const pcs = [...new Set(frame.attack.flatMap((f, s) => f === null ? [] : [(tuning[s] + f) % 12]))].sort((a, b) => a - b).join(',');
                const labels = lookup.get(pcs) ?? [];
                if (labels.length !== 1) { counts.ambiguous++; continue; }
                const label = labels[0], query = `${label.chordId}:${label.rootPitchClass}`, shape = signature(frame.attack);
                const key = `${record.songGroupId}|${query}|${shape}`;
                if (seen.has(key)) continue; seen.add(key);
                observations.push({ ...label, query, signature: shape, frets: frame.attack, songGroupId: record.songGroupId,
                    artistGroupId: record.artistGroupId, artistToken: record.artistToken, genreTokens: record.genreTokens,
                    songSplit: record.songSplit, artistSplit: record.artistSplit });
            }
            }
            if (offset % 256 === 0) {
                console.error(JSON.stringify({ ...counts, accepted: accepted.length, quarantine: quarantine.length, observations: observations.length }));
                fs.writeFileSync(path.join(output, 'quarantine-progress.json'), JSON.stringify(quarantine, null, 2));
            }
        }
        const text = observations.map(row => JSON.stringify(row)).join('\n') + '\n';
        fs.writeFileSync(path.join(output, 'observations.jsonl'), text);
        const report = { version: 1, semantics: 'notated-beats-not-acoustic-sustain', scope: 'standard-six-string-zero-transposition',
            sourceRevision: referenceRevision, dependencyVersion,
            sourceHash: hash(fs.readFileSync(decoder, 'utf8')), manifestHash: hash(fs.readFileSync(manifestPath, 'utf8')),
            observationsHash: hash(text), implementation,
            counts, observations: observations.length, accepted, quarantine,
            gate: 'Only whole-file differential matches contribute observations; quarantined files contribute none.' };
        fs.writeFileSync(path.join(output, 'certification.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify({ output, counts, accepted: accepted.length, quarantine: quarantine.length, observations: observations.length }));
    } finally { references.forEach(reference => reference.close()); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
