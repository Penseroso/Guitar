import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { CHORD_REGISTRY_LIST } from '../../src/domain/chord/registry';
import { generateExplorationPool, rankExplorationPool } from '../../src/domain/chord/exploration';
import { evaluateHandPlayability } from '../../src/domain/chord/fretGeometry';
import { DEFAULT_DEDUCTIVE_RANKING_WEIGHTS } from '../../src/domain/chord/deductiveRanking';
import { FROZEN_CHORD_BASELINE } from '../chord-baseline';
import type { ResolvedVoicing } from '../../src/domain/chord/types';
import { parseFrames } from './frames';
import { fit, hasQuerySupport, METHODS, rankPreference, shuffledGenres, type Method } from './models';
import { assignComponents, bootstrap, bucket, CONDITIONS, family, hash, holm, knownArtist, metrics, partition,
    PROTOCOL, signature, tuning, type Candidate, type Frets, type Observation, type RankedObservation } from './protocol';

const args = new Map(process.argv.slice(2).map(arg => { const i = arg.indexOf('='); return [arg.slice(0, i), arg.slice(i + 1)]; }));
const workspace = process.cwd();
const output = path.resolve(args.get('--output') ?? '.research/chord-preference-v1');
const inputPath = args.get('--observations');
const manifestPath = args.get('--manifest');
const rawRoot = args.get('--raw-root');
const stage = args.get('--stage') ?? 'all';
const certificationPath = args.get('--certification');
if (!inputPath || !manifestPath || !rawRoot) throw Error('Required: --observations=PATH --manifest=PATH --raw-root=PATH [--stage=all|data|ranking] [--output=PATH]');
if (!['all', 'data', 'ranking'].includes(stage)) throw Error('Unknown stage');
if (!certificationPath) throw Error('Required --certification=PATH: unverified observations cannot enter research.');
const certification = JSON.parse(fs.readFileSync(certificationPath, 'utf8')) as {
    version: number; observationsHash: string; manifestHash: string; implementation: Record<string, string>;
    accepted: Array<{ relativePath: string; fileHash: string }>; counts: Record<string, number>; quarantine: unknown[];
};
if (certification.version !== 1 || certification.observationsHash !== hash(fs.readFileSync(inputPath, 'utf8'))
    || certification.manifestHash !== hash(fs.readFileSync(manifestPath, 'utf8'))) throw Error('Certification does not match input bytes');
for (const name of ['frames.ts', 'reference.ts', 'reference_decoder.py', 'certify.ts']) {
    if (certification.implementation[name] !== hash(fs.readFileSync('scripts/preference/' + name, 'utf8'))) throw Error('Notation implementation changed; recertify inputs');
}
const certifiedFiles = new Map(certification.accepted.map(file => [file.relativePath, file.fileHash]));
const relativeOutput = path.relative(workspace, output).replaceAll('\\', '/');
if (!relativeOutput.startsWith('.research/')) throw Error('Outputs must stay in the ignored .research directory.');
if (fs.existsSync(path.join(output, 'complete.json'))) throw Error('Completed run is immutable; choose a new output directory.');
fs.mkdirSync(output, { recursive: true });
const write = (name: string, value: unknown) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n');
const readLines = <T,>(file: string): T[] => fs.readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line) as T);
const rows = readLines<Observation>(inputPath);
interface Manifest { status: string; relativePath: string; fileHash: string; bodyHash: string; identity: string;
    artistToken: string; artistGroupId: string; songGroupId: string; genreTokens: string[]; downtuneToken: string }
const manifest = readLines<Manifest>(manifestPath);
const domainDiff = execFileSync('git', ['diff', PROTOCOL.baseline, '--', 'src/domain/chord', 'src/domain/shared/tuning.ts'], { encoding: 'utf8' });
if (domainDiff) throw Error('Engine differs from frozen research baseline. Register a new protocol before evaluating.');
if (Object.entries(FROZEN_CHORD_BASELINE).some(([key, value]) => DEFAULT_DEDUCTIVE_RANKING_WEIGHTS[key as keyof typeof FROZEN_CHORD_BASELINE] !== value)) throw Error('Baseline weights changed');
for (const row of rows) {
    if (!row.songGroupId || !row.artistGroupId || row.frets.length !== 6 || signature(row.frets) !== row.signature) throw Error('Invalid observation identity');
}
const components = assignComponents(manifest.filter(row => row.status === 'resolved'));
if (rows.some(row => !components.has(row.songGroupId))) throw Error('Observation missing from manifest component graph');
const provenance = { protocol: PROTOCOL, revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    implementation: Object.fromEntries(fs.readdirSync('scripts/preference').filter(name => /\.(ts|py)$/.test(name)).map(name => [name, hash(fs.readFileSync('scripts/preference/' + name, 'utf8'))])),
    engineMatchesBaseline: true, inputs: { observations: hash(fs.readFileSync(inputPath, 'utf8')), manifest: hash(fs.readFileSync(manifestPath, 'utf8')) },
    certification: { hash: hash(fs.readFileSync(certificationPath, 'utf8')), counts: certification.counts, quarantinedFiles: certification.quarantine.length },
    status: 'development-evidence-only', independentHumanEvaluation: 'pending', productionChange: false };
write('protocol.json', provenance);

function featureFromFrets(frets: Frets, query: string): Candidate {
    const split = query.lastIndexOf(':'), id = query.slice(0, split), root = Number(query.slice(split + 1));
    const entry = CHORD_REGISTRY_LIST.find(e => e.id === id)!;
    const notes = frets.flatMap((fret, string) => fret === null ? [] : [{ midi: tuning[string] + fret, fret }]).sort((a, b) => a.midi - b.midi);
    const degree = (midi: number) => entry.formula.degrees[entry.formula.intervals.findIndex(interval => ((root + interval) % 12 + 12) % 12 === midi % 12)] ?? '';
    const stopped = notes.filter(note => note.fret > 0).map(note => note.fret);
    const hand = evaluateHandPlayability(frets.flatMap((fret, string) => fret && fret > 0 ? [{ fret, string: string as 0 | 1 | 2 | 3 | 4 | 5 }] : []),
        { openStrings: frets.flatMap((fret, string) => fret === 0 ? [string as 0 | 1 | 2 | 3 | 4 | 5] : []) });
    return { signature: signature(frets), family: family(frets), score: 0, minFret: stopped.length ? Math.min(...stopped) : 0,
        maxFret: stopped.length ? Math.max(...stopped) : 0, bass: degree(notes[0].midi), top: degree(notes.at(-1)!.midi),
        bassMidi: notes[0].midi, topMidi: notes.at(-1)!.midi, strings: notes.length, open: notes.filter(n => n.fret === 0).length,
        omissions: entry.formula.degrees.length - new Set(notes.map(n => degree(n.midi))).size, uncertain: !hand.playable || hand.fingerGroupCount > 4 };
}
const rawFacts = new Map<string, Candidate>();
for (const row of rows) if (!rawFacts.has(row.query + '|' + row.signature)) rawFacts.set(row.query + '|' + row.signature, featureFromFrets(row.frets, row.query));
const fact = (row: Observation) => rawFacts.get(row.query + '|' + row.signature)!;

async function inspectData() {
    const rawPath = path.resolve(rawRoot!);
    const stream = fs.createWriteStream(path.join(output, 'frames.jsonl'));
    const pc = (frets: Frets) => [...new Set(frets.flatMap((fret, string) => fret === null ? [] : [(tuning[string] + fret) % 12]))].sort((a, b) => a - b).join(',');
    const lookup = new Map<string, string[]>();
    for (const entry of CHORD_REGISTRY_LIST) for (let root = 0; root < 12; root++) {
        const key = [...new Set(entry.formula.intervals.map(interval => (root + interval) % 12))].sort((a, b) => a - b).join(',');
        lookup.set(key, [...lookup.get(key) ?? [], entry.id + ':' + root]);
    }
    const counts = { files: 0, hashFailures: 0, primaryFiles: 0, frames: 0, invalid: 0, tied: 0, sustainUncertain: 0,
        dyads: 0, exact: 0, ambiguous: 0, contextDependent: 0, privateUniqueFrames: 0 };
    const seen = new Set<string>();
    const aliases = new Map<string, Set<string>>();
    for (const record of manifest.filter(r => r.status === 'resolved')) {
        if (certifiedFiles.get(record.relativePath) !== record.fileHash) continue;
        const file = path.resolve(rawPath, record.relativePath);
        if (path.relative(rawPath, file).startsWith('..') || path.isAbsolute(path.relative(rawPath, file))) throw Error('Input escapes raw root');
        const bytes = fs.readFileSync(file); counts.files++;
        if (hash(bytes.toString('utf8')) !== record.fileHash) { counts.hashFailures++; continue; }
        const names = aliases.get(record.artistToken) ?? new Set(); names.add(record.identity.split('|')[0]); aliases.set(record.artistToken, names);
        if (record.downtuneToken !== 'downtune:0') continue;
        counts.primaryFiles++;
        for (const frame of parseFrames(bytes.toString('utf8'))) {
            counts.frames++; counts.tied += Number(frame.hasTie); counts.sustainUncertain += Number(frame.sustainUncertain);
            if (frame.invalid) { counts.invalid++; continue; }
            const size = frame.attack.filter(fret => fret !== null).length;
            if (size < 2) continue;
            counts.dyads += Number(size === 2);
            const matches = lookup.get(pc(frame.explicitSounding)) ?? [];
            const interpretation = frame.hasTie || frame.sustainUncertain ? 'context-dependent'
                : matches.length === 1 ? 'exact' : matches.length > 1 ? 'ambiguous' : 'context-dependent';
            if (interpretation === 'exact') counts.exact++; else if (interpretation === 'ambiguous') counts.ambiguous++; else counts.contextDependent++;
            const key = [record.songGroupId, signature(frame.attack), signature(frame.explicitSounding), interpretation].join('|');
            if (seen.has(key)) continue;
            seen.add(key); counts.privateUniqueFrames++;
            if (!stream.write(JSON.stringify({ songGroupId: record.songGroupId, artistGroupId: record.artistGroupId,
                artistToken: record.artistToken, genreTokens: record.genreTokens, ...frame, interpretation, matches,
                silenceMeaning: 'unobserved-not-proven-muted' }) + '\n')) await once(stream, 'drain');
        }
        if (counts.files % 2000 === 0) console.error('Raw inventory:', counts.files, '/', manifest.length);
    }
    stream.end(); await once(stream, 'finish');
    const songCal = new Set(rows.filter(r => r.songSplit === 'training' && bucket(r.songGroupId, 10) === 0).map(r => r.songGroupId));
    const artistCal = new Set(rows.filter(r => knownArtist(r.artistToken) && r.artistSplit === 'training' && bucket(r.artistGroupId, 10) === 0).map(r => r.songGroupId));
    const legacyOverlap = { artistHoldInSongCalibration: rows.filter(r => knownArtist(r.artistToken) && r.artistSplit === 'validation' && songCal.has(r.songGroupId)).length,
        songHoldInArtistCalibration: rows.filter(r => r.songSplit === 'validation' && artistCal.has(r.songGroupId)).length };
    const splitCounts = Array.from({ length: PROTOCOL.folds }, (_, testFold) => {
        const sets = { fit: new Set<string>(), calibration: new Set<string>(), test: new Set<string>() };
        for (const component of components.values()) sets[partition(component, testFold)].add(component);
        if ([...sets.test].some(c => sets.fit.has(c) || sets.calibration.has(c))) throw Error('Partition leakage');
        return { testFold, fit: sets.fit.size, calibration: sets.calibration.size, test: sets.test.size, intersection: 0 };
    });
    const genres = new Map<string, { observations: number; songs: Set<string>; artists: Set<string> }>();
    for (const row of rows) for (const genre of row.genreTokens) {
        const item = genres.get(genre) ?? { observations: 0, songs: new Set(), artists: new Set() };
        item.observations++; item.songs.add(row.songGroupId); if (knownArtist(row.artistToken)) item.artists.add(row.artistToken); genres.set(genre, item);
    }
    write('data-audit.json', { ...counts, cachedObservations: rows.length, cachedQueries: new Set(rows.map(r => r.query)).size,
        genres: [...genres].map(([genre, item]) => ({ genre, observations: item.observations, songs: item.songs.size, artists: item.artists.size })).sort((a, b) => b.observations - a.observations),
        aliasGroupsNeedingReview: [...aliases].filter(([artist, names]) => knownArtist(artist) && names.size > 1).length,
        legacyOverlap, splitCounts, interpretation: 'Explicit notes are retained; sustained intent and ambiguous roots are not training labels.' });
    if (counts.hashFailures) throw Error('Raw input hashes changed; ranking run blocked');
}

function shadowSearch() {
    const filename = path.join(workspace, 'src/domain/chord/voicingSearch.ts');
    const source = fs.readFileSync(filename, 'utf8');
    const guard = 'if (midi < previousMidi) {';
    if (source.split(guard).length !== 2) throw Error('Shadow experiment no longer matches baseline guard');
    const transformed = source.replace(guard, 'if (false && midi < previousMidi) {');
    const compiled = ts.transpileModule(transformed, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports: { searchDeductiveVoicings?: typeof import('../../src/domain/chord/voicingSearch').searchDeductiveVoicings } = {};
    const require = createRequire(filename);
    new Function('require', 'exports', compiled)((name: string) => require(name.startsWith('@/') ? path.join(workspace, 'src', name.slice(2)) : name), exports);
    return exports.searchDeductiveVoicings!;
}

function buildPools() {
    const pools = new Map<string, Candidate[]>();
    const relaxedSearch = shadowSearch();
    let baselineCount = 0, shadowCount = 0, lost = 0, duplicates = 0, recovered = 0, invalidNotes = 0;
    const missing: Array<{ query: string; signature: string; handPasses: boolean; crossed: boolean; songs: number; artists: number; shadowContains: boolean }> = [];
    const observed = new Map<string, Map<string, Observation[]>>();
    for (const row of rows) { const query = observed.get(row.query) ?? new Map(); query.set(row.signature, [...query.get(row.signature) ?? [], row]); observed.set(row.query, query); }
    const geometry = (v: ResolvedVoicing) => Array.from({ length: 6 }, (_, string) => v.notes.find(note => note.string === string && !note.isMuted)?.fret ?? null);
    for (const entry of CHORD_REGISTRY_LIST) for (let root = 0; root < 12; root++) {
        const query = entry.id + ':' + root;
        const pool = generateExplorationPool({ chordId: entry.id, rootPitchClass: root, context: 'standalone' });
        if (pool.status !== 'ready') throw Error(pool.message);
        const ranked = rankExplorationPool(pool);
        const candidates = ranked.map(c => ({ ...featureFromFrets(geometry(c.voicing), query), score: c.score }));
        pools.set(query, candidates); baselineCount += candidates.length;
        const baselineSet = new Set(candidates.map(c => c.signature));
        const shadow = relaxedSearch(entry, root, { position: 'close' }, { maxFret: 15, context: 'standalone' });
        const allowedPitches = new Set(entry.formula.intervals.map(interval => (root + interval) % 12));
        for (const voicing of shadow) {
            const notes = voicing.notes.filter(note => !note.isMuted);
            if (new Set(notes.map(note => note.string)).size !== notes.length) invalidNotes++;
            for (const note of notes) if (note.fret < 0 || note.fret > 15 || note.midiNote !== tuning[note.string] + note.fret
                || !allowedPitches.has(note.midiNote! % 12)) invalidNotes++;
        }
        const shadowSet = new Set(shadow.map(v => signature(geometry(v)))); shadowCount += shadow.length; duplicates += shadow.length - shadowSet.size;
        lost += [...baselineSet].filter(s => !shadowSet.has(s)).length;
        for (const [sig, evidence] of observed.get(query) ?? []) if (!baselineSet.has(sig)) {
            const row = evidence[0];
            const hand = evaluateHandPlayability(row.frets.flatMap((fret, string) => fret && fret > 0 ? [{ fret, string: string as 0 | 1 | 2 | 3 | 4 | 5 }] : []),
                { openStrings: row.frets.flatMap((fret, string) => fret === 0 ? [string as 0 | 1 | 2 | 3 | 4 | 5] : []) });
            const midi = row.frets.map((fret, string) => fret === null ? null : tuning[string] + fret).reverse().filter((n): n is number => n !== null);
            const inShadow = shadowSet.has(sig); recovered += Number(inShadow);
            missing.push({ query, signature: sig, handPasses: hand.playable, crossed: midi.some((n, i) => i > 0 && n < midi[i - 1]),
                songs: new Set(evidence.map(r => r.songGroupId)).size, artists: new Set(evidence.filter(r => knownArtist(r.artistToken)).map(r => components.get(r.songGroupId))).size, shadowContains: inShadow });
        }
    }
    write('geometry-details.json', missing);
    write('geometry-audit.json', { baselineCount, shadowCount, lost, duplicates, invalidNotes, missing: missing.length, recovered,
        supportedRecovered: missing.filter(m => m.shadowContains && m.songs >= 5 && m.artists >= 3).length,
        productionChanged: false, independentFingeringValidation: 'pending', decision: 'research-go-product-pending' });
    if (lost || duplicates || invalidNotes) throw Error('Shadow search failed candidate or note contracts');
    return pools;
}

const genreFor = (row: Observation, replacement?: Map<string, string[]>) => {
    const tags = replacement?.get(row.artistToken) ?? row.genreTokens;
    return ['genre:jazz_guitar', 'genre:jazz', 'genre:blues', 'genre:metal', 'genre:rock'].find(g => tags.includes(g)) ?? [...tags].sort()[0];
};

async function evaluatePreferences(pools: Map<string, Candidate[]>) {
    const eligible = rows.filter(row => knownArtist(row.artistToken)).map(row => ({ ...row, artistGroupId: components.get(row.songGroupId)! }));
    const allResults: Record<string, RankedObservation[]> = {};
    const choices: unknown[] = [];
    for (const track of ['natural', 'novel-family']) for (let testFold = 0; testFold < PROTOCOL.folds; testFold++) {
        console.error('Ranking:', track, 'fold', testFold + 1);
        const familyFold = (r: Observation) => bucket(PROTOCOL.seed + ':family:' + r.chordId + ':' + family(r.frets));
        const fitRows = eligible.filter(r => partition(components.get(r.songGroupId)!, testFold) === 'fit'
            && (track === 'natural' || familyFold(r) !== testFold && familyFold(r) !== (testFold + 1) % PROTOCOL.folds));
        const calibration = eligible.filter(r => partition(components.get(r.songGroupId)!, testFold) === 'calibration'
            && (track === 'natural' || familyFold(r) === (testFold + 1) % PROTOCOL.folds));
        const test = eligible.filter(r => partition(components.get(r.songGroupId)!, testFold) === 'test' && (track === 'natural' || familyFold(r) === testFold));
        const general = fit(fitRows, pools);
        const permutation = shuffledGenres(fitRows);
        for (const condition of CONDITIONS) {
            const train = fitRows.filter(r => condition.accepts(fact(r)));
            const conditional = fit(train, pools), shuffled = fit(train, pools, permutation);
            const cal = calibration.filter(r => condition.accepts(fact(r))), held = test.filter(r => condition.accepts(fact(r)));
            const candidateLists = new Map([...pools].map(([q, list]) => [q, list.filter(condition.accepts)]));
            const baseRanks = new Map([...candidateLists].map(([q, list]) => [q, new Map(list.map((c, i) => [c.signature, i + 1]))]));
            const evaluate = (observations: Observation[], method: Method, alpha: number): RankedObservation[] => {
                const profile = method === 'shape' || method === 'features' ? general : method === 'shuffled-genre' ? shuffled : conditional;
                const ranks = new Map<string, Map<string, number>>();
                return observations.map(row => {
                    const genre = genreFor(row);
                    const key = row.query + '|' + ((method === 'genre' || method === 'shuffled-genre') ? genre : '');
                    let order = ranks.get(key);
                    if (!order) { order = new Map(rankPreference(candidateLists.get(row.query) ?? [], row.query, profile, method, alpha, genre).map((c, i) => [c.signature, i + 1])); ranks.set(key, order); }
                    return { song: row.songGroupId, artist: components.get(row.songGroupId)!, query: testFold + ':' + row.query + ':' + genreFor(row),
                        signature: row.signature, rank: order.get(row.signature) ?? Infinity, baselineRank: baseRanks.get(row.query)?.get(row.signature) ?? Infinity,
                        condition: condition.id, high: fact(row).minFret >= 11,
                        unseen: !general.queries.get(row.query)?.shapes.has(row.signature), unseenFamily: !general.families.has(row.chordId + ':' + family(row.frets)), genre };
                });
            };
            for (const method of METHODS) {
                const alternatives = PROTOCOL.alphas.map(alpha => { const scored = evaluate(cal, method, alpha); return { alpha, result: metrics(scored), baseline: metrics(scored, true) }; });
                const feasible = alternatives.filter(a => a.result.recall18 >= a.baseline.recall18 - PROTOCOL.maxRecallLoss);
                feasible.sort((a, b) => (b.result.recall6 + b.result.ndcg6) - (a.result.recall6 + a.result.ndcg6) || a.alpha - b.alpha);
                const chosen = feasible[0];
                choices.push({ track, testFold, condition: condition.id, method, alpha: chosen.alpha, calibration: chosen.result,
                    fit: method === 'shape' || method === 'features' ? fitRows.length : train.length,
                    test: held.length, supportedQueries: [...candidateLists.keys()].filter(q => hasQuerySupport(conditional, q)).length });
                const key = track + ':' + condition.id + ':' + method;
                (allResults[key] ??= []).push(...evaluate(held, method, chosen.alpha));
            }
        }
    }
    write('calibration.json', choices);
    const incremental: Record<string, unknown> = {};
    for (const condition of CONDITIONS) {
        const generic = allResults['natural:' + condition.id + ':conditional-shape'];
        for (const method of ['genre', 'shuffled-genre']) {
            const candidate = allResults['natural:' + condition.id + ':' + method];
            const paired = candidate.map((row, i) => {
                if (row.song !== generic[i].song || row.signature !== generic[i].signature) throw Error('Incremental comparison is not paired');
                return { ...row, baselineRank: generic[i].rank };
            });
            incremental[condition.id + ':' + method] = { generic: metrics(paired, true), candidate: metrics(paired), inference: 'descriptive-only' };
        }
    }
    const summary: Record<string, unknown> = {}, primary: Array<{ key: string; p: number; practical: boolean }> = [];
    for (const [key, result] of Object.entries(allResults)) {
        const before = metrics(result, true), after = metrics(result);
        const slices = { high: result.filter(r => r.high), unseen: result.filter(r => r.unseen), unseenFamily: result.filter(r => r.unseenFamily) };
        const sliceSummary = Object.fromEntries(Object.entries(slices).map(([name, list]) => {
            const a = metrics(list), b = metrics(list, true);
            return [name, { baseline: b, candidate: a, qualified: a.songs >= PROTOCOL.minSliceSongs && a.artists >= PROTOCOL.minSliceArtists,
                pointNonInferior: a.recall6 >= b.recall6 - PROTOCOL.maxRecallLoss && a.recall18 >= b.recall18 - PROTOCOL.maxRecallLoss }];
        }));
        const interval = key.startsWith('natural:all:') ? bootstrap(result) : null;
        if (interval) primary.push({ key, p: Math.max(interval.recallP, interval.ndcgP), practical: after.recall6 - before.recall6 >= PROTOCOL.practicalRecallGain
            || before.ndcg6 > 0 && after.ndcg6 >= before.ndcg6 * (1 + PROTOCOL.practicalNdcgRelativeGain) });
        summary[key] = { baseline: before, candidate: after, interval, slices: sliceSummary,
            inference: interval ? 'paired-component-bootstrap' : 'descriptive-only-not-a-promotion-gate' };
    }
    const adjusted = holm(primary.map(p => p.p));
    write('ranking-summary.json', { protocol: PROTOCOL.version, results: summary, incrementalGenre: incremental,
        multiplicity: primary.map((p, i) => ({ ...p, holmPass: adjusted[i] })),
        conclusions: { independentTest: 'not-yet-collected', humanPreference: 'not-measured', sliceConfidence: 'pending-confirmatory-study',
            adoption: 'NO-GO', reason: 'Development resampling cannot authorize production; all prespecified protected slices and independent tasks still require validation.' } });
    console.error('Ranking summary written. No production profile exported.');
}

async function main() {
    if (stage !== 'ranking') await inspectData();
    if (stage !== 'data') await evaluatePreferences(buildPools());
    write('complete.json', { ...provenance, completedAt: new Date().toISOString(), stage });
    console.log(JSON.stringify({ output: relativeOutput, stage, productionChanged: false }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
