// Nominal written-time admission on the actual product API, independent of the offline scoring code.
const assert = require('node:assert/strict');
const { parseAsciiTab } = require('../../../src/domain/tab/ascii.ts');
const { observeTabAcrossBarsWrittenTime, inspectTabAcrossBarsWrittenNotesAt } = require('../../../src/domain/tab/written-time-across-bars.ts');
const { buildTabChordCandidates } = require('../../../src/domain/tab/chord-candidates.ts');
const source = ['e|0|1|', 'B|-|-|', 'G|-|-|', 'D|-|-|', 'A|-|-|', 'E|-|-|'].join('\n');
const parse = parseAsciiTab(source);
assert(parse.ok);
const f = (numerator, denominator = 1) => ({ numerator, denominator });
const q = (numerator, denominator = 1) => ({ numerator: String(numerator), denominator: String(denominator) });
const score = {
    ...parse.document, meter: f(4, 4),
    moments: parse.document.moments.map(position => ({
        ...position, beatOffset: f(0), notes: position.notes.map(note => ({ ...note, duration: f(1) })),
    })),
};
const observe = document => observeTabAcrossBarsWrittenTime(document, 1, { model: 'regular-bar-origins' });
const complete = observe(score);
const partial = observe({
    ...score, moments: score.moments.map((position, i) => i === 0 ? position
        : { ...position, notes: position.notes.map(({ duration, ...note }) => note) }),
});
const untimed = observe({ ...parse.document });
assert.equal(complete.data.populationCoverage, 'complete');
assert.equal(partial.data.populationCoverage, 'partial');
assert.equal(inspectTabAcrossBarsWrittenNotesAt(partial, q(0)).status, 'complete');
assert.equal(untimed.data.reason, 'missing-meter');
const ambiguous = buildTabChordCandidates([0, 4, 7, 9]).filter(c => c.match === 'exact').map(c => c.key);
assert(ambiguous.includes('0:major-6') && ambiguous.includes('9:minor-7'));
process.stdout.write(JSON.stringify({
    completePopulation: complete.data.populationCoverage, partialPopulation: partial.data.populationCoverage,
    provedPointInsidePartial: 'complete', fullPieceTimingAdmission: 'withheld for partial population',
    untimedModelUnavailable: untimed.data.reason, sharedRegistryExactAlternatives: ambiguous,
}, null, 2) + '\n');
