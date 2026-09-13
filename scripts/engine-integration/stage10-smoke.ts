import { createHash } from 'node:crypto';
import { EngineSession } from '../../src/domain/chord/engine/session';
import { ENGINE_VERSIONS } from '../../src/domain/chord/engine/versions';
import { productConformance } from './product-conformance';

const stable = (value: unknown) => JSON.stringify(value);
const digest = (value: unknown) => createHash('sha256').update(stable(value)).digest('hex');

function page(intent: object, surface: 'recommended' | 'all') {
    const session = new EngineSession({ schema: 'intent-v1', ...intent });
    const scan = session.begin({ schema: 'surface-request-v2', surface, view: {} }, 6);
    while (!scan.step()) { /* bounded synchronous smoke */ }
    const result = scan.finish();
    session.dispose();
    if (result.outcome !== 'results' || result.rows.length === 0) throw new Error(`${surface} returned no smoke results`);
    if (result.summary.versions.engine !== 'guitar-engine/2') throw new Error('unexpected engine version');
    if (surface === 'recommended' && result.rows.some(row => !row.recommendation.eligible)) throw new Error('Recommended returned an ineligible row');
    return result;
}

const fixtures = [
    { chordId: 'major', rootPitchClass: 0 },
    { chordId: 'dominant-11', rootPitchClass: 6, context: 'accompaniment' },
];
const runs = fixtures.flatMap(intent => (['recommended', 'all'] as const).map(surface => {
    const first = page(intent, surface);
    const replay = page(intent, surface);
    const firstDigest = digest(first.rows);
    if (firstDigest !== digest(replay.rows) || stable(first.summary) !== stable(replay.summary)) throw new Error('nondeterministic smoke result');
    return { intent, surface, outcome: first.outcome, matching: first.summary.matching, rows: first.rows.length, digest: firstDigest };
}));
const conservation = productConformance();

console.log(JSON.stringify({
    status: 'PASS',
    versions: ENGINE_VERSIONS,
    runs,
    conservation: {
        geometryCases: conservation.geometry.length,
        boundaryCases: conservation.boundaries.length,
        surfaceCases: conservation.surfaces.length,
        sha256: digest(conservation),
    },
}, null, 2));
