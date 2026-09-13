import { partialCoverGroups } from './contactHypotheses';
import { EngineError } from './errors';
import { createGeometry } from './geometry';
import { parseAllocationId, sixIntegers } from './identity';
import { canonical, freeze, integer } from './validation';
import type { PhysicalProfile, PhysicalReason, Six, StructuralCandidate, SurvivorAssessment } from './types';

/** No production certificate providers: archived model evidence cannot register one. */
export const CERTIFICATE_PROVIDERS: readonly never[] = Object.freeze([]);
export type ScreenResult = Pick<SurvivorAssessment, 'status' | 'basis' | 'reasonCodes' | 'metrics' | 'humanValidation'>;

export function createPhysicalScreen(profile: PhysicalProfile) {
    // Check the complete profile identity; no harmonic policy dependency here.
    if (profile.screenVersion !== 'physical-screen-v1' || profile.numericVersion !== 'geometry-um-v1'
        || profile.key !== canonical({ ...profile, key: undefined })) throw new EngineError('contract-error', 'Invalid physical profile identity.');
    integer(profile.warningSpanUm, 0, 2000000, 'warningSpanUm');
    integer(profile.severeSpanUm, profile.warningSpanUm, 2000000, 'severeSpanUm');
    if (!['default','declared','measured'].includes(profile.scaleSource)
        || !['generic-static-fretting','restricted-or-personalized'].includes(profile.scope)
        || !['unplayed','require-left-hand-damping'].includes(profile.omittedStrings)
        || typeof profile.allowedThumb !== 'boolean') throw new EngineError('contract-error', 'Malformed physical scope.');
    const geometry = createGeometry(profile.scaleLengthUm);
    function metrics(states: Six<number>): ScreenResult {
        sixIntegers(states, -1, 36, 'states');
        if (states.every(f => f < 0)) throw new EngineError('contract-error', 'Empty allocation is not a structural candidate.');
        const stoppedWireSpanUm = geometry.stoppedSpan(states);
        const groups = partialCoverGroups(states);
        const result: ScreenResult = {
            status: 'PASS', basis: 'heuristic-screen', reasonCodes: [], humanValidation: 'absent',
            metrics: { stoppedWireSpanUm, partialCoverGroups: groups },
        };
        const reasons: PhysicalReason[] = [];
        if (groups > 4) reasons.push('groups-over-four');
        if (groups > 5) reasons.push('groups-over-five');
        if (stoppedWireSpanUm > profile.warningSpanUm) reasons.push('span-over-warning');
        if (stoppedWireSpanUm > profile.severeSpanUm) reasons.push('span-over-severe');
        if (profile.allowedThumb && states[5] > 0 && groups > 4) {
            const without = [...states] as number[]; without[5] = -1;
            const nonThumbGroups = partialCoverGroups(without as unknown as Six<number>);
            const nearest = Math.min(...without.filter(f => f > 0).map(f => Math.abs(f - states[5])));
            const reliedOn = nonThumbGroups <= 4 && nearest <= 3;
            result.metrics.thumbFallback = { reliedOn, nonThumbGroups, nonThumbSpanUm: geometry.stoppedSpan(without) };
            if (reliedOn) reasons.push('thumb-fallback-relied-on');
        }
        if (profile.omittedStrings === 'require-left-hand-damping' && states.some(f => f < 0)) reasons.push('unsupported-damping');
        if (profile.scope !== 'generic-static-fretting' || profile.handProfileRef) reasons.push('unsupported-profile');
        if (reasons.length) result.status = 'UNCERTAIN';
        if (reasons.some(r => r.startsWith('unsupported-'))) result.basis = 'abstention';
        result.reasonCodes = reasons;
        return result;
    }
    function assess(candidate: StructuralCandidate): SurvivorAssessment {
        const parsed = parseAllocationId(candidate.allocationId);
        if (canonical(parsed.states) !== canonical(candidate.states)) throw new EngineError('contract-error', 'Candidate coordinates disagree with identity.');
        const expected = parsed.states.flatMap((f, s) => f < 0 ? [] : [{ string: s, fret: f, midi: parsed.tuning[s] + f }]);
        if (expected.length !== candidate.sounding.length || expected.some((note, i) => {
            const actual = candidate.sounding[i]; return note.string !== actual.string || note.fret !== actual.fret || note.midi !== actual.midi;
        })) throw new EngineError('contract-error', 'Candidate sounding data disagrees with identity.');
        const screen = metrics(candidate.states);
        return freeze({ ...screen, allocationId: candidate.allocationId, profileKey: profile.key,
            evidence: [{ id: 'partial-cover-v1', kind: 'heuristic-screen', methodVersion: 'physical-screen-v1',
                allocationId: candidate.allocationId, profileKey: profile.key,
                assumptions: ['Static stopped-target contact hypotheses; singles and compatible flat intervals.', 'Unplayed strings impose no damping obligation unless explicitly requested.', 'No anatomy, dynamic execution or human outcome validated.'] },
            ...screen.reasonCodes.filter(r => r.startsWith('unsupported-')).map(reason => ({ id: reason, kind: 'unsupported-operation' as const,
                methodVersion: 'physical-screen-v1', allocationId: candidate.allocationId, profileKey: profile.key, assumptions: [reason] }))],
        });
    }
    return Object.freeze({ metrics, assess, geometry });
}
