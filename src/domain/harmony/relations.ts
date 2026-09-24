import { createScaleRef } from '@/domain/scale/scale-ref';
import { KNOWLEDGE } from './knowledge';
import { compareChords } from './facts';
import { note, pc, relativeChord, resolveChord, romanLabel, validateFrame } from './roman';
import { spellDegree } from '@/domain/shared/spelling';
import { targetPolicy } from './target-policy';
import { endingConnections, observeEnding } from './ending-observation';
import { exampleTransitions } from './connections';
import type { ChordRef, RelationExample, RelationQuery, RelationResult, RelationStep } from './types';

const FUNCTIONAL_APPROACHES = new Set(['dominant', 'ii-v', 'predominant', 'leading', 'tritone']);

/** Bounded, rule-scoped examples. Not a progression generator or a recommendation order. */
export function exploreRelation(query: RelationQuery): RelationResult {
    const result: RelationResult = { query, status: 'matched', title: KNOWLEDGE[query.kind]?.title ?? 'Unsupported relation', observations: [], missing: [], examples: [], ruleId: query.kind, scaleLinks: [] };
    const unsupported = (reason: string): RelationResult => ({ ...result, status: 'unsupported', observations: [reason], examples: [], scaleLinks: [],
        checks: [...(result.checks ?? []), { id: 'rule-applicability', label: reason, state: 'fail' }],
        interpretations: [{ id: query.kind, label: result.title, status: 'unsupported', evidence: [reason], missing: [], ruleId: query.kind }],
    });
    try {
        validateFrame(query.frame);
        if (!KNOWLEDGE[query.kind]) return unsupported('Unknown relation');
        const target = resolveChord(query.target);
        const { minor, rootAtKeyCenter, tonicFamilyTarget, tonicHarmony, localResolutionTarget, appliedTarget } = targetPolicy(target, query.frame);
        const third = minor ? 'b3' : '3';
        result.checks = [{ id: 'target-structure', label: 'Major/minor third + perfect fifth', state: localResolutionTarget ? 'pass' : 'fail' }];
        if (!localResolutionTarget) return unsupported('Target · major/minor third + perfect fifth required');
        const context = query.context ?? {};
        if (context.before) resolveChord(context.before);
        if (context.middle) resolveChord(context.middle);
        if (context.soprano !== undefined && context.soprano !== '') note(context.soprano);
        // Applied numerals name a tonicized degree, not the target's complete chord suffix.
        const targetRoman = romanLabel({ ...target, chordId: minor ? 'minor' : 'major' }, query.frame);
        const step = (ref: ChordRef, role: string, guides: string[], roman?: string): RelationStep => ({ chord: resolveChord(ref), role, guides, roman: roman ?? romanLabel(ref, query.frame) });
        const end = () => step(target, 'Target', ['1', third]);
        const example = (id: string, label: string, steps: RelationStep[], kind: RelationExample['kind'] = 'motion', transitions?: RelationExample['transitions']) => {
            result.examples.push({ id, label, kind, steps, provenance: ['passing', 'cadence'].includes(query.kind) && query.context?.before ? 'observation' : 'illustration', transitions,
                facts: steps.slice(1).map((s, i) => compareChords(steps[i].chord, s.chord)) });
        };
        const dominant = relativeChord(target.root, 5, 7, 'dominant-7');
        const domRoman = tonicHarmony ? 'V7' : appliedTarget ? `V7/${targetRoman}` : romanLabel(dominant, query.frame);
        const dom = () => step(dominant, tonicHarmony ? 'Dominant' : appliedTarget ? 'Possible applied dominant' : 'Dominant approach', ['3', 'b7'], domRoman);
        const localScale = createScaleRef('Diatonic Modes', minor ? 'Aeolian' : 'Ionian', target.rootPitchClass);
        // A tonic reference is not a claim that this collection fits every chord in the example.
        result.scaleLinks.push({ label: `${target.root} ${minor ? 'Aeolian' : 'Ionian'} · tonic reference`, ref: localScale });
        switch (query.kind) {
            case 'dominant':
                example('dominant', tonicHarmony ? 'Dominant resolution' : tonicFamilyTarget ? 'Local tonicization' : appliedTarget ? 'Possible applied dominant' : `Approach to ${target.name}`, [dom(), end()]);
                result.observations = [tonicHarmony ? 'Target · key center' : `Local target · ${target.name}`, '3 → root · ♭7 → third'];
                break;
            case 'fifths': {
                const from = relativeChord(target.root, 5, 7, minor ? 'minor' : 'major');
                example('fifths', 'Root motion', [step(from, 'Fifth above target', [minor ? 'b3' : '3', '1']), end()]);
                result.status = 'possible';
                result.observations = ['Down a fifth · up a fourth', 'Function · context needed'];
                break;
            }
            case 'tritone': {
                result.checks.push({ id: 'jazz-pop-rule', label: 'Jazz/pop substitution rule', state: query.frame.lens === 'jazz-pop' ? 'pass' : 'fail' });
                if (query.frame.lens === 'classical') return unsupported('Tritone substitution is shown under the jazz/pop lens; augmented-sixth reinterpretation is outside this rule.');
                const substitute = relativeChord(target.root, 2, 1, 'dominant-7');
                example('original', 'Original dominant', [dom(), end()]);
                example('substitute', 'Tritone substitute', [step(substitute, 'Substitute dominant', ['b7', '3'], tonicHarmony || appliedTarget ? `subV7/${targetRoman}` : romanLabel(substitute, query.frame)), end()]);
                const a = resolveChord(dominant), b = resolveChord(substitute);
                const thirds = a.tones.find(t => t.degree === '3')!, seventh = a.tones.find(t => t.degree === 'b7')!;
                result.status = 'possible';
                result.observations = [`Shared guides · ${thirds.name} = ${b.tones.find(t => t.degree === 'b7')!.name} · ${seventh.name} = ${b.tones.find(t => t.degree === '3')!.name}`, 'Same guides · different bass', 'Fit · melody + voicing dependent'];
                break;
            }
            case 'ii-v':
            case 'predominant': {
                const ii = relativeChord(target.root, 2, 2, minor ? 'half-diminished-7' : 'minor-7');
                const applied = tonicHarmony ? '' : `/${targetRoman}`;
                example('ii-v', 'ii–V preparation', [step(ii, 'Predominant', ['b7', 'b3'], tonicHarmony || appliedTarget ? `${minor ? 'iiø7' : 'ii7'}${applied}` : romanLabel(ii, query.frame)), dom(), end()]);
                if (query.kind === 'predominant') {
                    const iv = relativeChord(target.root, 4, 5, minor ? 'minor-7' : 'major-7');
                    example('iv-v', 'IV–V preparation', [step(iv, 'Predominant in this example', ['1', minor ? 'b3' : '3']), dom(), end()]);
                }
                result.observations = [minor ? 'Minor · iiø7 → V7' : 'Major · ii7 → V7', 'Predominant · role in this context'];
                break;
            }
            case 'tonic-sub': {
                result.checks.push({ id: 'tonic-family-rule', label: 'Major tonic family · jazz/pop', state: tonicHarmony && !minor && query.frame.lens === 'jazz-pop' ? 'pass' : 'fail' });
                if (!tonicHarmony || minor || query.frame.lens !== 'jazz-pop') return unsupported('Target · major tonic-family quality at the key center required · jazz/pop only');
                const main = { root: target.root, chordId: 'major-7' };
                for (const [degree, interval, id] of [[3, 4, 'iii'], [6, 9, 'vi']] as const) {
                    const alternate = relativeChord(target.root, degree, interval, 'minor-7');
                    example(id, `Imaj7 / ${id}7`, [step(main, 'Tonic family', ['3', '7']), step(alternate, 'Tonic-family alternative', ['b3', 'b7'])], 'comparison');
                }
                result.status = 'possible';
                result.observations = ['Jazz/pop · tonic family', 'Shared tones ≠ interchangeable'];
                break;
            }
            case 'minor-sub': {
                result.checks.push({ id: 'borrowed-family-rule', label: 'Major tonic family · jazz/pop', state: tonicHarmony && !minor && query.frame.lens === 'jazz-pop' ? 'pass' : 'fail' });
                if (query.frame.lens === 'classical') return unsupported('These seventh-chord family comparisons use the jazz/pop lens, not a general classical substitute rule.');
                if (!tonicHarmony || minor) return unsupported('Target · major tonic-family quality at the key center required for parallel-minor borrowing');
                const iv = relativeChord(target.root, 4, 5, 'minor-7');
                example('mixture', 'IVmaj7 / iv7', [step(relativeChord(target.root, 4, 5, 'major-7'), 'Major-key collection', ['3', '7']), step(iv, 'Parallel-minor colour', ['b3', 'b7'])], 'comparison');
                example('minor-ii', 'iv7 / iiø7', [step(iv, 'Minor subdominant family', ['b3', 'b7']), step(relativeChord(target.root, 2, 2, 'half-diminished-7'), 'Related predominant', ['b3', 'b7'])], 'comparison');
                example('flat-six', 'iv7 / ♭VImaj7', [step(iv, 'Minor subdominant family', ['b3', 'b7']), step(relativeChord(target.root, 6, 8, 'major-7'), 'Related borrowed colour', ['3', '7'])], 'comparison');
                result.status = 'possible';
                result.observations = ['Parallel minor · borrowed colour', 'Family comparison · not a sequence'];
                result.scaleLinks = [{ label: `${target.root} Aeolian · borrowed collection`, ref: createScaleRef('Diatonic Modes', 'Aeolian', target.rootPitchClass) }];
                break;
            }
            case 'backdoor': {
                result.checks.push({ id: 'backdoor-frame', label: 'Major tonic family · jazz/pop', state: tonicHarmony && !minor && query.frame.lens === 'jazz-pop' ? 'pass' : 'fail' });
                if (!tonicHarmony || minor || query.frame.lens !== 'jazz-pop') return unsupported('Backdoor · major tonic-family target at the key center · jazz/pop only');
                const flatSeven = relativeChord(target.root, 7, 10, 'dominant-7');
                const iv = relativeChord(target.root, 4, 5, 'minor-7');
                const backdoor = () => step(flatSeven, 'Backdoor approach', ['5', 'b7']);
                const arrival = () => step(target, 'Target', ['3', '5']);
                const resolution = [{ fromDegree: '5', toDegree: '3', kind: 'resolution' as const }, { fromDegree: 'b7', toDegree: '5', kind: 'resolution' as const }];
                example('backdoor', '♭VII7–I', [backdoor(), arrival()], 'motion', [{ fromStep: 0, toStep: 1, voices: resolution }]);
                example('minor-backdoor', 'iv7–♭VII7–I', [step(iv, 'Minor subdominant', ['1', 'b3']), backdoor(), arrival()], 'motion', [
                    { fromStep: 0, toStep: 1, voices: [{ fromDegree: '1', toDegree: '5', kind: 'held' }, { fromDegree: 'b3', toDegree: 'b7', kind: 'held' }] },
                    { fromStep: 1, toStep: 2, voices: resolution },
                ]);
                result.status = 'possible';
                result.observations = ['Jazz/pop · minor-subdominant connection', '♭VII7 fifth → third · ♭7 → fifth', 'Melody + phrase · fit remains contextual'];
                result.scaleLinks = [{ label: `${target.root} Aeolian · borrowed collection`, ref: createScaleRef('Diatonic Modes', 'Aeolian', target.rootPitchClass) }];
                break;
            }
            case 'leading': {
                const leading = relativeChord(target.root, 7, 11, 'diminished-7');
                example('leading', 'Leading-tone diminished', [step(leading, appliedTarget ? 'Applied leading tone' : 'Leading-tone approach', ['1', 'b5'], tonicHarmony ? 'vii°7' : appliedTarget ? `vii°7/${targetRoman}` : romanLabel(leading, query.frame)), end()]);
                example('rootless', 'Compare V7♭9', [step({ ...dominant, chordId: 'dominant-7-flat-9' }, 'Dominant with ♭9', ['3', 'b7'], `${domRoman}(♭9)`), end()]);
                result.observations = ['Same pitches · V7♭9 without root', 'Distinct chord identities', minor ? 'Minor · raised leading tone' : 'Major · chromatic ♭6'];
                result.scaleLinks.push({ label: `${target.root} Harmonic Minor · leading-tone collection`, ref: createScaleRef('Harmonic Minor Modes', 'Harmonic Minor', target.rootPitchClass) });
                break;
            }
            case 'common-tone': {
                const embellishment = step({ root: target.root, chordId: 'diminished-7' }, 'Possible embellishment', ['1', 'b3', 'b5', 'bb7'], 'CT°7');
                embellishment.toneLabels = {};
                // Analytical neighbor spelling is separate from the canonical diminished chord formula.
                for (const [canonical, degree, number] of [['1', '1', 1], ['b3', minor ? 'b3' : '#2', minor ? 3 : 2], ['b5', '#4', 4], ['bb7', '6', 6]] as const) {
                    const tone = embellishment.chord.tones.find(t => t.degree === canonical)!;
                    const spelled = spellDegree(note(target.root), number, tone.pitchClass);
                    if (!spelled) throw new Error('Common-tone analysis needs unsupported spelling');
                    embellishment.toneLabels[canonical] = { name: spelled.name, degree };
                }
                example('common-tone', 'Retained root · neighboring voices', [embellishment, step(target, 'Target', ['1', third, '5'])], 'motion', [{ fromStep: 0, toStep: 1, voices: [
                    { fromDegree: '1', toDegree: '1', kind: 'held' },
                    { fromDegree: 'b3', toDegree: third, kind: minor ? 'held' : 'neighbor' },
                    { fromDegree: 'b5', toDegree: '5', kind: 'neighbor' },
                    { fromDegree: 'bb7', toDegree: '5', kind: 'neighbor' },
                ] }]);
                result.status = 'possible';
                result.observations = ['Root retained · neighboring voices', 'Embellishment · rhythm + voices needed'];
                break;
            }
            case 'passing': {
                if (!context.before) result.missing.push('Preceding chord');
                if (!context.middle) result.missing.push('Diminished chord');
                if (result.missing.length) { result.status = 'insufficient-context'; break; }
                const before = resolveChord(context.before!), middle = resolveChord(context.middle!);
                if (middle.chordId !== 'diminished-7') return unsupported('The middle chord must be a fully diminished seventh for this rule.');
                const approach = pc(middle.bassPitchClass - before.bassPitchClass), arrival = pc(target.bassPitchClass - middle.bassPitchClass);
                const chromaticBass = approach === arrival && [1, 11].includes(arrival);
                const bassDegree = (chord: typeof target) => chord.tones.find(tone => tone.pitchClass === chord.bassPitchClass)!.degree;
                const bassPath = [before, middle, target];
                example('passing', 'Three-chord observation', [step(before, 'Before', [bassDegree(before)]), step(middle, 'Diminished link', [bassDegree(middle)]), step(target, 'Target', [bassDegree(target)])], 'motion', [0, 1].map(index => ({
                    fromStep: index, toStep: index + 1, voices: [{ fromDegree: bassDegree(bassPath[index]), toDegree: bassDegree(bassPath[index + 1]), kind: bassPath[index].bassPitchClass === bassPath[index + 1].bassPitchClass ? 'held' : 'approach' }],
                })));
                result.checks.push({ id: 'passing-bass-path', label: 'Chromatic bass path', state: !context.bassConfirmed ? 'unknown' : chromaticBass ? 'pass' : 'fail' });
                result.checks.push({ id: 'passing-rhythm', label: 'Passing rhythmic role observed', state: context.rhythmConfirmed ? 'pass' : 'unknown' });
                const missing = [context.bassConfirmed ? null : 'Confirmed bass/inversions', context.rhythmConfirmed ? null : 'Passing rhythmic role'].filter((value): value is string => value !== null);
                const passingStatus = !context.bassConfirmed ? 'insufficient-context' : !chromaticBass ? 'unsupported' : missing.length ? 'insufficient-context' : 'possible';
                result.interpretations = [{ id: 'passing', label: 'Passing diminished', ruleId: 'passing', status: passingStatus,
                    evidence: [chromaticBass ? 'Chromatic supplied bass path' : 'No chromatic supplied bass path', 'Passing role · a contextual reading'], missing }];
                const leadingPitch = pc(target.rootPitchClass - 1);
                const leading = resolveChord(relativeChord(target.root, 7, 11, 'diminished-7'));
                const leadingSet = leading.tones.every(tone => middle.tones.some(candidate => candidate.pitchClass === tone.pitchClass));
                if (leadingSet) {
                    result.interpretations.push({ id: 'applied-leading', label: `Leading tone of ${target.name}`, ruleId: 'leading', status: 'possible',
                        evidence: [`Pitch collection · ${leading.name}`, middle.rootPitchClass === leadingPitch ? 'Leading-tone root' : 'Enharmonic reinterpretation required'], missing: [] });
                }
                result.status = leadingSet ? 'possible' : passingStatus;
                result.missing = missing;
                result.observations = [context.bassConfirmed ? chromaticBass ? 'Chromatic bass · possible passing link' : 'Bass path · not chromatic' : 'Passing bass · unconfirmed', 'Actual bass + rhythm · not inferred'];
                if (leadingSet) result.observations.push(`Alternative · leading tone of ${target.name}`);
                break;
            }
            case 'cadence': {
                const before = context.before ? resolveChord(context.before) : resolveChord(dominant);
                const observation = observeEnding(query.frame, before, target, context);
                const transitions = endingConnections(before, target, observation.interpretations?.[0].id ?? 'unclassified');
                example('cadence', context.before ? context.phraseEnding === true ? 'Observed ending' : 'Observed motion' : 'Illustration · not an observed cadence', [step(before, 'Before', transitions[0].voices.map(voice => voice.fromDegree)), step(target, 'Target', transitions[0].voices.map(voice => voice.toDegree))], 'motion', transitions);
                Object.assign(result, observation);
                break;
            }
        }
        if (!tonicFamilyTarget && FUNCTIONAL_APPROACHES.has(query.kind)) {
            result.status = 'possible';
            result.observations.push(rootAtKeyCenter
                ? 'Root · key center ≠ tonic function'
                : 'Target quality · tonic function unconfirmed');
            result.observations.push('Approach example · harmonic function needs context');
        }
        if (!result.interpretations) result.interpretations = [{ id: query.kind, label: result.title, ruleId: query.kind, status: result.status, evidence: [...result.observations], missing: [...result.missing] }];
        // Fail closed if a curated tone alias or held-voice declaration diverges from the formula.
        for (const item of result.examples) exampleTransitions(item);
        return result;
    } catch (error) {
        return unsupported(error instanceof Error ? error.message : 'Invalid harmony context');
    }
}
