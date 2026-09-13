import { STANDARD_GUITAR_STRING_MIDI_PITCHES } from '../../shared/tuning';
import { canonicalTone, engineEntry, legacyRequiredToneIds } from './catalog';
import { createClassicProjector } from './classicFeatures';
import { compareRank, rankCandidate } from './deterministicRanking';
import { EngineError } from './errors';
import { createFactsProjector } from './facts';
import { allocationId, migrateAllocationId, parseAllocationId, sixIntegers } from './identity';
import { createPhysicalScreen } from './physical';
import { createDemandProjector } from './physicalDemand';
import { createVocabularyMatcher } from './practicalVocabulary';
import { surfacePartition } from './recommendedSurface';
import { compileRequest } from './requestPolicy';
import { compileStructuralMatcher, materializeStructural, StructuralIterator } from './structuralGenerator';
import { canonical, choice, freeze, integer, record } from './validation';
import type { PresentationCandidate, ResolvedRequest, SearchIntent, Six, SurvivorAssessment } from './types';

export interface MigrationNotice {
    code: 'legacy-spacing-alias' | 'legacy-bass-subset' | 'legacy-shell-vocabulary'
        | 'ignored-legacy-field' | 'legacy-physical-envelope' | 'legacy-id-alias';
    field: string;
    message: string;
}
export interface LegacySearchRequest {
    chordId: string;
    rootPitchClass: number;
    style: { position: 'close' | 'spread' | 'drop-2' | 'drop-3' | 'shell'; omitDegrees?: string[];
        maxHandSpanMm?: number; allowThumbOnLowE?: boolean };
    options?: { tuningMidi?: number[]; maxFret?: number; scaleLengthMm?: number;
        maxHandSpanMm?: number; allowThumbOnLowE?: boolean; requireRoot?: boolean;
        context?: 'standalone' | 'accompaniment' };
}
export interface MigratedRequest {
    /** Validated equivalent public request; compatibility provenance is retained below. */
    intent: SearchIntent;
    resolved: ResolvedRequest;
    notices: readonly MigrationNotice[];
}

/** Compatibility is explicit and confined here. No old search or boolean screen runs. */
export function migrateLegacyRequest(input: LegacySearchRequest): MigratedRequest {
    record(input, ['chordId', 'rootPitchClass', 'style', 'options'], 'legacy');
    const style = record(input.style, ['position', 'omitDegrees', 'maxHandSpanMm', 'allowThumbOnLowE'], 'legacy.style');
    const options = record(input.options ?? {}, ['tuningMidi', 'maxFret', 'scaleLengthMm', 'maxHandSpanMm', 'allowThumbOnLowE', 'requireRoot', 'context'], 'legacy.options');
    const position = choice(style.position, ['close', 'spread', 'drop-2', 'drop-3', 'shell'], 'legacy.style.position');
    const entry = engineEntry(input.chordId);
    const notices: MigrationNotice[] = [];
    for (const field of ['maxHandSpanMm', 'allowThumbOnLowE']) if (style[field] !== undefined) notices.push({
        code: 'ignored-legacy-field', field: `style.${field}`, message: 'This style-object field was inert and remains ignored; use an explicit Physical profile.' });
    const toUm = (value: unknown, field: string) => {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new EngineError('invalid-request', `${field} must be finite nonnegative millimetres.`, field);
        return Math.floor(value * 1000 + 0.5);
    };
    const physical: SearchIntent['physical'] = {};
    if (options.scaleLengthMm !== undefined) { physical.scaleLengthUm = toUm(options.scaleLengthMm, 'options.scaleLengthMm'); physical.scaleSource = 'declared'; }
    if (options.maxHandSpanMm !== undefined) {
        physical.warningSpanUm = toUm(options.maxHandSpanMm, 'options.maxHandSpanMm');
        physical.severeSpanUm = Math.max(180000, physical.warningSpanUm);
        notices.push({ code: 'legacy-physical-envelope', field: 'options.maxHandSpanMm', message: 'The old maximum span is a warning envelope, never an admission or rejection gate.' });
    }
    if (options.allowThumbOnLowE !== undefined) physical.allowedThumb = options.allowThumbOnLowE as boolean;
    const intent: SearchIntent = { schema: 'intent-v1', chordId: entry.id, rootPitchClass: input.rootPitchClass,
        context: options.context as SearchIntent['context'],
        instrument: { kind: 'six-single-strings-12edo', tuningMidi: sixIntegers(options.tuningMidi ?? STANDARD_GUITAR_STRING_MIDI_PITCHES, 0, 127, 'options.tuningMidi'),
            maxModeledFret: options.maxFret === undefined ? 15 : integer(options.maxFret, 0, 36, 'options.maxFret', 'unsupported-request') },
        excludedToneIds: style.omitDegrees as string[] | undefined, subset: { kind: 'unrestricted' }, physical };
    if (options.requireRoot !== undefined) {
        if (typeof options.requireRoot !== 'boolean') throw new EngineError('invalid-request', 'requireRoot must be boolean.');
        intent.rootMode = options.requireRoot ? 'required' : 'optional';
    }
    if (position === 'shell') {
        const vocabulary = legacyRequiredToneIds(entry.formula.degrees);
        const rootRequired = options.requireRoot ?? options.context !== 'accompaniment';
        intent.realization = { kind: 'partial', requiredToneIds: vocabulary.filter(d => d !== '1' || rootRequired), allowedToneIds: vocabulary };
        intent.minDistinctPitchClasses = Math.min(options.context === 'accompaniment' ? 2 : 3, entry.formula.degrees.length);
        notices.push({ code: 'legacy-shell-vocabulary', field: 'style.position', message: 'Shell uses the old required vocabulary with canonical degree tokens; incompatible tone floors are explicit conflicts.' });
    } else if (position === 'close' || position === 'spread') notices.push({ code: 'legacy-spacing-alias', field: 'style.position', message: `${position} maps to unrestricted; its old search meaning did not require literal pitch spacing.` });

    // Compile omissions first: unlike the old generator, they never erase obligations.
    let resolved = compileRequest(intent);
    if (position === 'drop-2' || position === 'drop-3') {
        const omitted = new Set((style.omitDegrees as string[] | undefined ?? []).map(d => canonicalTone(entry.id, d)));
        let previous = -1;
        const stack = entry.formula.degrees.map((degree, i) => ({ degree, order: entry.formula.intervals[i] }))
            .filter(n => !omitted.has(n.degree)).sort((a, b) => a.order - b.order)
            .map(n => { let order = n.order; while (order <= previous) order += 12; previous = order; return { degree: n.degree, order }; });
        const indexFromTop = position === 'drop-2' ? 1 : 2;
        if (stack.length > indexFromTop) stack[stack.length - 1 - indexFromTop].order -= 12;
        stack.sort((a, b) => a.order - b.order);
        const tone = stack[0].degree;
        intent.requirements = [{ kind: 'bass', value: { tone } }];
        resolved = compileRequest(intent);
        const structural = { ...resolved.structural, predicates: resolved.structural.predicates.map(p => p.kind === 'bass' ? { kind: 'legacy-bass-subset' as const, tone } : p) };
        resolved = freeze({ ...resolved, structural, requestKey: canonical({ structural, interpretation: resolved.interpretation, physicalProfile: resolved.physicalProfile }) });
        notices.push({ code: 'legacy-bass-subset', field: 'style.position', message: `${position} retains only the old transformed first degree (${tone}) as bass; it is not an exact drop predicate.` });
    }
    return freeze({ intent, resolved, notices });
}

/** Route IDs have no tuning. The complete saved request and explicit saved tuning are mandatory. */
export function migrateLegacyId(id: string, savedRequest?: LegacySearchRequest): { allocationId: string; notices: readonly MigrationNotice[] } {
    if (typeof id !== 'string') throw new EngineError('invalid-request', 'Legacy ID must be a string.', 'id');
    let next: string;
    if (id.startsWith('shape:') || id.startsWith('shape-v1:')) next = migrateAllocationId(id);
    else {
        if (!savedRequest?.options?.tuningMidi) throw new EngineError('unsupported-request', 'Legacy route ID requires a complete saved request and explicit saved tuning.', 'savedRequest.options.tuningMidi');
        const prefix = `${savedRequest.chordId}:${savedRequest.style.position}:`;
        if (!id.startsWith(prefix)) throw new EngineError('invalid-request', 'Legacy route does not match its saved request.');
        const signature = id.slice(prefix.length);
        if (!/^[0-5]:\d+(\|[0-5]:\d+)*$/.test(signature)) throw new EngineError('unsupported-request', 'Unsupported legacy route signature.');
        const states = [-1, -1, -1, -1, -1, -1];
        for (const pair of signature.split('|')) {
            const [string, fret] = pair.split(':').map(Number);
            if (states[string] !== -1) throw new EngineError('invalid-request', 'Duplicate string in legacy signature.');
            states[string] = fret;
        }
        next = allocationId(sixIntegers(savedRequest.options.tuningMidi, 0, 127, 'saved tuning'), states as unknown as Six<number>);
    }
    if (savedRequest) {
        const request = migrateLegacyRequest(savedRequest).resolved, parsed = parseAllocationId(next);
        if (canonical(parsed.tuning) !== canonical(request.structural.instrument.tuningMidi) || !compileStructuralMatcher(request.structural)(parsed.states))
            throw new EngineError('invalid-request', 'Migrated allocation is outside the saved request.');
    }
    return freeze({ allocationId: next, notices: id === next ? [] : [{ code: 'legacy-id-alias', field: 'id', message: 'Old ID retained only as a lookup hint; allocation identity uses explicit tuning and string states.' }] });
}

export type LegacyEligibleVoicing = PresentationCandidate & { playable: true; assessment: SurvivorAssessment; deprecationNote: string };
export function asLegacyEligible(row: PresentationCandidate): LegacyEligibleVoicing {
    if (!row.physical || !['PASS', 'UNCERTAIN'].includes(row.physical.status) || row.physical.allocationId !== row.candidate.allocationId)
        throw new EngineError('contract-error', 'Legacy eligibility requires a matching assessed survivor.');
    return freeze({ ...row, playable: true, assessment: row.physical, deprecationNote: 'Deprecated playable means survivor eligibility only; it does not establish human playability.' });
}

/** Tests/CLI only. No partial success and no candidate cap. maxBytes accounts a
 * conservative output allowance (4× UTF-8 JSON plus 512 bytes per materialized row).
 * Runtime allocation failure is also a typed resource failure. */
function collectResolved(request: ResolvedRequest, options: { maxBytes: number }): readonly PresentationCandidate[] {
    integer(options?.maxBytes, 1, Number.MAX_SAFE_INTEGER, 'maxBytes');
    try {
        const iterator = new StructuralIterator(request.structural), screen = createPhysicalScreen(request.physicalProfile);
        const projector = createClassicProjector(request, screen.geometry), facts = createFactsProjector(request, screen.geometry);
        const projectDemand=createDemandProjector(request.physicalProfile),matchVocabulary=createVocabularyMatcher(request);
        const rows: PresentationCandidate[] = [], encoder = new TextEncoder(); let bytes = 0;
        for (;;) {
            const batch = iterator.nextBatch(256);
            for (const states of batch.candidates) {
                const candidate = materializeStructural(states, request.structural, request.requestKey);
                const physical=screen.assess(candidate),demand=projectDemand(states,physical),vocabulary=matchVocabulary(states);
                const row: PresentationCandidate = { candidate, physical, facts: facts(states), rank: rankCandidate(candidate, projector(states)), displayRank: null, labels: [],demand,vocabulary,
                    recommendation:{version:'recommended-surface-v2',eligible:surfacePartition(true,physical.status,demand,vocabulary)<2} };
                bytes += encoder.encode(JSON.stringify(row)).byteLength * 4 + 512;
                if (bytes > options.maxBytes) throw new EngineError('resource-exhausted', 'Complete collection exceeds its explicit output resource budget. No partial result was returned.', 'maxBytes');
                rows.push(row);
            }
            if (batch.done) break;
        }
        rows.sort((a, b) => compareRank(a.rank, b.rank));
        return freeze(rows.map((row, i) => ({ ...row, displayRank: i + 1 })));
    } catch (error) {
        if (error instanceof RangeError) throw new EngineError('resource-exhausted', 'Complete collection could not allocate its output.');
        throw error;
    }
}
export function collectComplete(intent: unknown, options: { maxBytes: number }): readonly PresentationCandidate[] {
    return collectResolved(compileRequest(intent), options);
}
export function collectLegacyComplete(input: LegacySearchRequest, options: { maxBytes: number }): readonly PresentationCandidate[] {
    return collectResolved(migrateLegacyRequest(input).resolved, options);
}
