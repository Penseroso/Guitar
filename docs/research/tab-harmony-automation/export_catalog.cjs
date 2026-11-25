// Offline catalog export from THE MODUS. Run from the repository root with node --import tsx.
const { engineEntry } = require('../../../src/domain/chord/engine/catalog.ts');
const { buildTabChordCandidates } = require('../../../src/domain/tab/chord-candidates.ts');

const ids = [
    'major', 'minor', 'diminished', 'augmented', 'dominant-7', 'major-7',
    'minor-7', 'half-diminished-7', 'diminished-7', 'major-6', 'sus4',
];
const formulas = Object.fromEntries(ids.map(id => [id, engineEntry(id).formula.intervals]));
const probes = [[0, 4, 7, 9], [4, 10], [0, 4, 7], [0, 3, 6, 9]];
process.stdout.write(JSON.stringify({
    formulas, productPointProbes: probes.map(pcs => ({ pcs, keys: buildTabChordCandidates(pcs).map(candidate => candidate.key) })),
}, null, 2) + '\n');
