import { createScaleRef } from '@/domain/scale/scale-ref';
import { KNOWLEDGE } from './knowledge';
import { compareChords } from './facts';
import { note, pc, relativeChord, resolveChord, romanLabel, validateFrame } from './roman';
import type { ChordRef, RelationExample, RelationQuery, RelationResult, RelationStep } from './types';

/** Bounded, rule-scoped examples. Not a progression generator or a recommendation order. */
export function exploreRelation(query: RelationQuery): RelationResult {
    const result: RelationResult = { query, status: 'matched', title: KNOWLEDGE[query.kind]?.title ?? 'Unsupported relation', observations: [], missing: [], examples: [], ruleId: query.kind, scaleLinks: [] };
    const unsupported = (reason: string) => ({ ...result, status: 'unsupported' as const, observations: [reason], examples: [], scaleLinks: [] });
    try {
        validateFrame(query.frame);
        if (!KNOWLEDGE[query.kind]) return unsupported('Unknown relation');
        const target = resolveChord(query.target), tonic = note(query.frame.tonic);
        const minor = target.tones.some(t => t.degree === 'b3');
        const third = minor ? 'b3' : '3';
        if ((!minor && !target.tones.some(t => t.degree === '3')) || !target.tones.some(t => t.degree === '5')) return unsupported('Target · major/minor third + perfect fifth required');
        const context = query.context ?? {};
        if (context.before) resolveChord(context.before);
        if (context.middle) resolveChord(context.middle);
        if (context.soprano !== undefined && context.soprano !== '') note(context.soprano);
        const isTonic = target.rootPitchClass === tonic.pitchClass && minor === (query.frame.mode === 'minor');
        // Applied numerals name a tonicized degree, not the target's complete chord suffix.
        const targetRoman = romanLabel({ ...target, chordId: minor ? 'minor' : 'major' }, query.frame);
        const step = (ref: ChordRef, role: string, guides: string[], roman?: string): RelationStep => ({ chord: resolveChord(ref), role, guides, roman: roman ?? romanLabel(ref, query.frame) });
        const end = () => step(target, 'Target', ['1', third]);
        const example = (id: string, label: string, steps: RelationStep[], kind: RelationExample['kind'] = 'motion') => {
            result.examples.push({ id, label, kind, steps, facts: steps.slice(1).map((s, i) => compareChords(steps[i].chord, s.chord)) });
        };
        const dominant = relativeChord(target.root, 5, 7, 'dominant-7');
        const domRoman = isTonic ? 'V7' : `V7/${targetRoman}`;
        const dom = () => step(dominant, isTonic ? 'Dominant' : 'Applied dominant', ['3', 'b7'], domRoman);
        const localScale = createScaleRef('Diatonic Modes', minor ? 'Aeolian' : 'Ionian', target.rootPitchClass);
        // A tonic reference is not a claim that this collection fits every chord in the example.
        result.scaleLinks.push({ label: `${target.root} ${minor ? 'Aeolian' : 'Ionian'} · tonic reference`, ref: localScale });
        switch (query.kind) {
            case 'dominant':
                example('dominant', isTonic ? 'Dominant resolution' : 'Local tonicization', [dom(), end()]);
                result.observations = [isTonic ? 'Target · key center' : `Local target · ${target.name}`, '3 → root · ♭7 → third'];
                break;
            case 'fifths': {
                const from = relativeChord(target.root, 5, 7, minor ? 'minor' : 'major');
                example('fifths', 'Root motion', [step(from, 'Fifth above target', [minor ? 'b3' : '3', '1']), end()]);
                result.status = 'possible';
                result.observations = ['Down a fifth · up a fourth', 'Function · context needed'];
                break;
            }
            case 'tritone': {
                if (query.frame.lens === 'classical') return unsupported('Tritone substitution is shown under the jazz/pop lens; augmented-sixth reinterpretation is outside this rule.');
                const substitute = relativeChord(target.root, 2, 1, 'dominant-7');
                example('original', 'Original dominant', [dom(), end()]);
                example('substitute', 'Tritone substitute', [step(substitute, 'Substitute dominant', ['b7', '3'], `subV7/${targetRoman}`), end()]);
                const a = resolveChord(dominant), b = resolveChord(substitute);
                const thirds = a.tones.find(t => t.degree === '3')!, seventh = a.tones.find(t => t.degree === 'b7')!;
                result.status = 'possible';
                result.observations = [`Shared guides · ${thirds.name} = ${b.tones.find(t => t.degree === 'b7')!.name} · ${seventh.name} = ${b.tones.find(t => t.degree === '3')!.name}`, 'Same guides · different bass', 'Fit · melody + voicing dependent'];
                break;
            }
            case 'ii-v':
            case 'predominant': {
                const ii = relativeChord(target.root, 2, 2, minor ? 'half-diminished-7' : 'minor-7');
                const applied = isTonic ? '' : `/${targetRoman}`;
                example('ii-v', 'ii–V preparation', [step(ii, 'Predominant', ['b7', 'b3'], `${minor ? 'iiø7' : 'ii7'}${applied}`), dom(), end()]);
                if (query.kind === 'predominant') {
                    const iv = relativeChord(target.root, 4, 5, minor ? 'minor-7' : 'major-7');
                    example('iv-v', 'IV–V preparation', [step(iv, 'Predominant in this example', ['1', minor ? 'b3' : '3']), dom(), end()]);
                }
                result.observations = [minor ? 'Minor · iiø7 → V7' : 'Major · ii7 → V7', 'Predominant · role in this context'];
                break;
            }
            case 'tonic-sub': {
                if (!isTonic || minor || query.frame.lens !== 'jazz-pop') return unsupported('This rule covers a major tonic under the jazz/pop family lens.');
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
                if (query.frame.lens === 'classical') return unsupported('These seventh-chord family comparisons use the jazz/pop lens, not a general classical substitute rule.');
                if (!isTonic || minor) return unsupported('This rule compares parallel-minor borrowing in a major key. Choose its major tonic.');
                const iv = relativeChord(target.root, 4, 5, 'minor-7');
                example('mixture', 'IVmaj7 / iv7', [step(relativeChord(target.root, 4, 5, 'major-7'), 'Major-key collection', ['3', '7']), step(iv, 'Parallel-minor colour', ['b3', 'b7'])], 'comparison');
                example('minor-ii', 'iv7 / iiø7', [step(iv, 'Minor subdominant family', ['b3', 'b7']), step(relativeChord(target.root, 2, 2, 'half-diminished-7'), 'Related predominant', ['b3', 'b7'])], 'comparison');
                example('flat-six', 'iv7 / ♭VImaj7', [step(iv, 'Minor subdominant family', ['b3', 'b7']), step(relativeChord(target.root, 6, 8, 'major-7'), 'Related borrowed colour', ['3', '7'])], 'comparison');
                result.status = 'possible';
                result.observations = ['Parallel minor · borrowed colour', 'Family comparison · not a sequence'];
                result.scaleLinks = [{ label: `${target.root} Aeolian · borrowed collection`, ref: createScaleRef('Diatonic Modes', 'Aeolian', target.rootPitchClass) }];
                break;
            }
            case 'leading': {
                const leading = relativeChord(target.root, 7, 11, 'diminished-7');
                example('leading', 'Leading-tone diminished', [step(leading, 'Applied leading tone', ['1', 'b5'], isTonic ? 'vii°7' : `vii°7/${targetRoman}`), end()]);
                example('rootless', 'Compare V7♭9', [step({ ...dominant, chordId: 'dominant-7-flat-9' }, 'Dominant with ♭9', ['3', 'b7'], `${domRoman}(♭9)`), end()]);
                result.observations = ['Same pitches · V7♭9 without root', 'Distinct chord identities', minor ? 'Minor · raised leading tone' : 'Major · chromatic ♭6'];
                result.scaleLinks.push({ label: `${target.root} Harmonic Minor · leading-tone collection`, ref: createScaleRef('Harmonic Minor Modes', 'Harmonic Minor', target.rootPitchClass) });
                break;
            }
            case 'common-tone':
                example('common-tone', 'Retain the target root', [step({ root: target.root, chordId: 'diminished-7' }, 'Possible embellishment', ['1', 'b3']), end()]);
                result.status = 'possible';
                result.observations = ['Root retained · neighboring voices', 'Embellishment · rhythm + voices needed'];
                break;
            case 'passing': {
                if (!context.before) result.missing.push('Preceding chord');
                if (!context.middle) result.missing.push('Diminished chord');
                if (result.missing.length) { result.status = 'insufficient-context'; break; }
                const before = resolveChord(context.before!), middle = resolveChord(context.middle!);
                if (middle.chordId !== 'diminished-7') return unsupported('The middle chord must be a fully diminished seventh for this rule.');
                const approach = pc(middle.rootPitchClass - before.rootPitchClass), arrival = pc(target.rootPitchClass - middle.rootPitchClass);
                example('passing', 'Three-chord observation', [step(before, 'Before', ['1', before.tones[1].degree]), step(middle, 'Diminished link', ['1', 'b5']), end()]);
                result.status = 'possible';
                result.observations = [(approach === arrival && [1, 11].includes(arrival)) ? 'Chromatic roots · possible passing link' : 'No chromatic root path · passing unconfirmed', 'Actual bass + rhythm · not inferred'];
                if (arrival === 1) result.observations.push(`Alternative · leading tone of ${target.name}`);
                break;
            }
            case 'cadence': {
                if (!context.before) result.missing.push('Preceding chord');
                if (context.phraseEnding !== true) result.missing.push('Confirmed phrase ending');
                if (context.bassConfirmed !== true) result.missing.push('Confirmed bass/inversions');
                if (!context.soprano) result.missing.push('Final soprano note');
                const before = context.before ? resolveChord(context.before) : resolveChord(dominant);
                example('cadence', context.before ? 'Observed ending' : 'Illustration · not an observed cadence', [step(before, 'Before', before.tones.some(t => t.degree === '3') && before.tones.some(t => t.degree === 'b7') ? ['3', 'b7'] : ['1', before.tones[1].degree]), end()]);
                if (result.missing.length) { result.status = 'insufficient-context'; result.observations = ['Cadence · ending context needed']; break; }
                const soprano = note(context.soprano!).pitchClass;
                if (!target.tones.some(t => t.pitchClass === soprano)) { result.status = 'insufficient-context'; result.missing = ['Final non-chord tone: supply its resolution before classifying']; break; }
                const beforeDominant = before.rootPitchClass === pc(tonic.pitchClass + 7) && ['major', 'dominant-7'].includes(before.chordId);
                const cadentialTonic = isTonic && ['major', 'minor'].includes(target.chordId);
                if (beforeDominant && cadentialTonic) {
                    const rootPosition = before.bassPitchClass === before.rootPitchClass && target.bassPitchClass === target.rootPitchClass;
                    result.observations = [rootPosition && soprano === target.rootPitchClass ? 'Perfect authentic cadence · supplied ending conditions' : 'Imperfect authentic cadence · supplied ending conditions'];
                } else if (isTonic && before.rootPitchClass === pc(tonic.pitchClass + 5) && ['major','minor','major-7','minor-7'].includes(before.chordId)) {
                    result.status = 'possible'; result.observations = ['Plagal ending / plagal extension · interpretation depends on the larger phrase'];
                } else if (beforeDominant && target.rootPitchClass === pc(tonic.pitchClass + (query.frame.mode === 'major' ? 9 : 8)) && minor === (query.frame.mode === 'major')) {
                    result.status = 'possible'; result.observations = ['Deceptive ending · V to vi/VI in the declared key'];
                } else if (target.rootPitchClass === pc(tonic.pitchClass + 7) && ['major', 'dominant-7'].includes(target.chordId)) {
                    result.status = 'possible'; result.observations = ['Half-cadence pattern · phrase ends on V'];
                } else { result.status = 'possible'; result.observations = ['No supported cadence pattern established by this pair']; }
                break;
            }
        }
        return result;
    } catch (error) {
        return unsupported(error instanceof Error ? error.message : 'Invalid harmony context');
    }
}
