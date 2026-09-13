import { record, integer, choice } from './validation';
import { EngineError } from './errors';

/** Compiler boundary; subsequent compilation resolves policies without mutating intent. */
export function validateIntentEnvelope(input: unknown): Record<string, unknown> {
    const value = record(input, ['schema','chordId','rootPitchClass','context','instrument','fretDomains','realization','rootMode','minDistinctPitchClasses','excludedToneIds','completeFormula','slashBassPitchClass','subset','requirements','physical'], 'intent');
    choice(value.schema, ['intent-v1'], 'schema');
    if (typeof value.chordId !== 'string') throw new EngineError('invalid-request', 'chordId must be a string.', 'chordId');
    integer(value.rootPitchClass, 0, 11, 'rootPitchClass');
    if (value.context !== undefined) choice(value.context, ['standalone','accompaniment'], 'context');
    return value;
}
