import { note, pc } from './roman';
import { targetPolicy } from './target-policy';
import type { ObservationContext, RelationResult, RelationTransition, ResolvedHarmonyChord, TonalFrame, ToneConnection } from './types';

type EndingObservation = Pick<RelationResult, 'status' | 'observations' | 'missing' | 'interpretations' | 'checks'>;

/** Illustrative voices for a recognized pattern; this is not an inferred performance or optimizer. */
export function endingConnections(before: ResolvedHarmonyChord, target: ResolvedHarmonyChord, pattern: string): RelationTransition[] {
    const voices: ToneConnection[] = [];
    const add = (fromDegree: string, toDegree: string, kind: ToneConnection['kind'] = 'resolution') => {
        if (before.tones.some(tone => tone.degree === fromDegree) && target.tones.some(tone => tone.degree === toDegree)) voices.push({ fromDegree, toDegree, kind });
    };
    if (pattern === 'authentic' || pattern === 'picardy') {
        add('3', '1'); add('b7', target.tones.some(tone => tone.degree === 'b3') ? 'b3' : '3');
    } else if (pattern === 'deceptive') {
        add('3', target.tones.some(tone => tone.degree === 'b3') ? 'b3' : '3'); add('b7', '5');
    } else if (pattern === 'plagal') {
        add('1', target.tones.some(tone => tone.degree === 'b3') ? 'b3' : '3');
        add(before.tones.some(tone => tone.degree === 'b3') ? 'b3' : '3', '5'); add('5', '1', 'held');
    } else if (pattern === 'phrygian') {
        add('b3', '1'); add('5', '3');
    } else {
        // Unknown functional paths are shown only as the supplied bass movement.
        const from = before.tones.find(tone => tone.pitchClass === before.bassPitchClass)!;
        const to = target.tones.find(tone => tone.pitchClass === target.bassPitchClass)!;
        add(from.degree, to.degree, from.pitchClass === to.pitchClass ? 'held' : 'approach');
    }
    return [{ fromStep: 0, toStep: 1, voices }];
}

/** A bounded pair observer. Phrase conclusions require supplied observations, never roots alone. */
export function observeEnding(frame: TonalFrame, before: ResolvedHarmonyChord, target: ResolvedHarmonyChord, context: ObservationContext): EndingObservation {
    const tonic = note(frame.tonic).pitchClass;
    const policy = targetPolicy(target, frame);
    const dominantBefore = before.rootPitchClass === pc(tonic + 7) && ['major', 'dominant-7'].includes(before.chordId);
    const picardy = frame.mode === 'minor' && policy.rootAtKeyCenter && target.chordId === 'major';
    const authentic = dominantBefore && ((policy.tonicHarmony && ['major', 'minor'].includes(target.chordId)) || picardy);
    const plagal = policy.tonicHarmony && before.rootPitchClass === pc(tonic + 5)
        && ['major', 'minor', 'major-7', 'minor-7'].includes(before.chordId);
    // This conservative observer accepts triads only, not e.g. A♭7 merely sharing root + third.
    const deceptive = dominantBefore && target.rootPitchClass === pc(tonic + (frame.mode === 'major' ? 9 : 8))
        && target.chordId === (frame.mode === 'major' ? 'minor' : 'major');
    const dominantTarget = target.rootPitchClass === pc(tonic + 7) && ['major', 'dominant-7'].includes(target.chordId);
    const phrygian = frame.mode === 'minor' && dominantTarget && target.chordId === 'major'
        && before.rootPitchClass === pc(tonic + 5) && before.chordId === 'minor'
        && before.bassPitchClass === pc(tonic + 8) && target.bassPitchClass === target.rootPitchClass;
    const id = authentic ? (picardy ? 'picardy' : 'authentic') : plagal ? 'plagal' : deceptive ? 'deceptive' : phrygian ? 'phrygian' : dominantTarget ? 'half' : 'unclassified';
    const checks: NonNullable<RelationResult['checks']> = [{ id: 'ending-pair', label: 'Supported motion', state: id === 'unclassified' ? 'fail' : 'pass' }];
    const output: EndingObservation = { status: 'possible', observations: [], missing: [], interpretations: [], checks };
    const finish = (label: string) => {
        output.interpretations = [{ id, label, status: output.status, evidence: [...output.observations], missing: [...output.missing], ruleId: 'cadence' }];
        return output;
    };
    if (!context.before) {
        checks[0].state = 'unknown';
        checks.push({ id: 'preceding-chord', label: 'Preceding chord observed', state: 'unknown' });
        output.status = 'insufficient-context'; output.missing.push('Preceding chord');
        output.observations = ['Illustration · not an observed cadence'];
        return finish('Ending observation');
    }
    if (id === 'unclassified') {
        output.status = 'unsupported'; output.observations = ['No supported cadence pattern established by this pair'];
        return finish('Unclassified motion');
    }
    const motion = authentic ? (picardy ? 'V–I · major tonic in minor' : 'V–I motion')
        : plagal ? 'IV/iv–I motion' : deceptive ? `V–${frame.mode === 'major' ? 'vi' : '♭VI'} motion`
            : phrygian ? 'iv6–V · ♭6–5 bass' : 'Arrival on V';
    if (context.phraseEnding === false) {
        checks.push({ id: 'phrase-ending', label: 'Phrase ending', state: 'fail' });
        output.observations = [motion, 'Motion only · not a phrase ending'];
        return finish(motion);
    }
    checks.push({ id: 'phrase-ending', label: 'Phrase ending', state: context.phraseEnding === true ? 'pass' : 'unknown' });
    if (context.phraseEnding !== true) output.missing.push('Confirmed phrase ending');
    // Soprano distinguishes PAC/IAC; it is not mandatory for every other ending family.
    const needsBass = authentic || phrygian || (id === 'half' && frame.lens === 'classical');
    if (needsBass) {
        checks.push({ id: 'bass-observed', label: 'Bass / inversion observed', state: context.bassConfirmed ? 'pass' : 'unknown' });
        if (!context.bassConfirmed) output.missing.push('Confirmed bass/inversions');
    }
    if (authentic) {
        checks.push({ id: 'soprano-observed', label: 'Final soprano observed', state: context.soprano ? 'pass' : 'unknown' });
        if (!context.soprano) output.missing.push('Final soprano note');
    }
    if (context.soprano && !target.tones.some(tone => tone.pitchClass === note(context.soprano!).pitchClass)) {
        output.missing.push('Final non-chord tone: supply its resolution before classifying');
    }
    if (output.missing.length) {
        output.status = 'insufficient-context'; output.observations = [motion, 'Cadence · ending context needed'];
        return finish(motion);
    }
    if (authentic) {
        const rootPosition = before.bassPitchClass === before.rootPitchClass && target.bassPitchClass === target.rootPitchClass;
        const finalFifth = target.tones.find(tone => tone.degree === '5')!.pitchClass;
        if (target.bassPitchClass === finalFifth) {
            output.observations = ['Tonic 6/4 arrival · cadential closure unconfirmed'];
        } else {
            output.status = 'matched';
            output.observations = [rootPosition && note(context.soprano!).pitchClass === target.rootPitchClass
                ? 'Perfect authentic cadence · supplied ending conditions' : 'Imperfect authentic cadence · supplied ending conditions'];
            if (picardy) output.observations.push('Picardy third · major tonic in a minor frame');
        }
    } else if (plagal) {
        output.observations = [frame.lens === 'classical'
            ? 'Plagal ending / plagal extension · larger phrase decides'
            : 'Plagal ending · jazz/pop motion; closure remains contextual'];
    } else if (deceptive) {
        output.observations = [`Deceptive ending · V to ${frame.mode === 'major' ? 'vi' : '♭VI'}`, 'Cadence avoidance in some classical analyses'];
    } else if (phrygian) {
        output.status = frame.lens === 'classical' ? 'matched' : 'possible';
        output.observations = ['Phrygian half cadence · iv6–V', 'Observed bass · ♭6–5'];
    } else {
        output.observations = [frame.lens === 'classical' && (target.chordId !== 'major' || target.bassPitchClass !== target.rootPitchClass)
            ? 'Arrival on dominant · strict classical half-cadence conditions not met'
            : 'Half-cadence pattern · phrase ends on V', 'Ending on V · convention-dependent'];
    }
    return finish(output.observations[0]);
}
