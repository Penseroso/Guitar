import { createScaleRef } from '@/domain/scale/scale-ref';
import { KNOWLEDGE } from './knowledge';
import { compareChords } from './facts';
import { note, pc, relativeChord, resolveChord, romanLabel, validateFrame } from './roman';
import { formatAccidentals, spellDegree } from '@/domain/shared/spelling';
import { getKeyName } from '@/domain/shared/keys';
import { targetPolicy } from './target-policy';
import { endingConnections, observeEnding } from './ending-observation';
import { completeCommonTones, connectChords, exampleTransitions } from './connections';
import type { ChordRef, RelationExample, RelationQuery, RelationResult, RelationStep, RelationTransition, TonalFrame } from './types';

const FUNCTIONAL_APPROACHES = new Set(['dominant', 'dominant-colour', 'ii-v', 'predominant', 'leading', 'tritone']);
const BOTH_LENSES: TonalFrame['lens'][] = ['jazz-pop', 'classical'];
/**
 * Registry dominant vocabulary shown as colour on V. Classical: dominant 9ths and the
 * altered (♭5/♯5) dominants. The 13th, ♯9 and sus4 dominants are jazz/pop vocabulary; a
 * classical V13's leap from the 13th to 1̂ is not a pitch-class correspondence.
 */
const DOMINANT_COLOURS = [
    { id: '9', chordId: 'dominant-9', suffix: '9', lenses: BOTH_LENSES },
    { id: '13', chordId: 'dominant-13', suffix: '13', lenses: ['jazz-pop'] },
    { id: '7b9', chordId: 'dominant-7-flat-9', suffix: '7♭9', lenses: BOTH_LENSES },
    { id: '7#9', chordId: 'hendrix-7-sharp-9', suffix: '7♯9', lenses: ['jazz-pop'] },
    { id: '7b5', chordId: 'dominant-7-flat-5', suffix: '7♭5', lenses: BOTH_LENSES },
    { id: '7#5', chordId: 'dominant-7-sharp-5', suffix: '7♯5', lenses: BOTH_LENSES },
    { id: '7sus4', chordId: 'dominant-7-sus4', suffix: '7sus4', lenses: ['jazz-pop'] },
] as const;
const DOMINANT_CORE = ['1', '3', '5', 'b7'];
const COLLECTIONS = { Ionian: [0, 2, 4, 5, 7, 9, 11], 'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11] } as const;
const MAJOR_SCALE = COLLECTIONS.Ionian;
/** Colour degrees are 4, 9, 11, 13 or altered (♭9, ♯5 …). */
const toneText = (degree: string) => /^\d+$/.test(degree) ? `${degree}th` : degree.replace(/^b/, '♭').replace(/^#/, '♯');
/** A parallel-minor tone named against the major reference, e.g. ♭6. */
const loweredDegree = (tonic: number, pitchClass: number) => `♭${MAJOR_SCALE.indexOf(pc(pitchClass - tonic + 1) as never) + 1}`;

/** Colour-tone facts read from the example's own validated edge, never a separate claim. */
function colourNotes(step: RelationStep, target: RelationStep, transition: RelationTransition, minorTarget: boolean): string[] {
    const colours = step.chord.tones.filter(tone => !DOMINANT_CORE.includes(tone.degree));
    const notes = colours.map(tone => {
        const voice = transition.voices.find(item => item.fromDegree === tone.degree);
        const label = `${toneText(tone.degree)} ${formatAccidentals(tone.name)}`;
        if (!voice) return `${label} · no fixed resolution`;
        const destination = target.chord.tones.find(item => item.degree === voice.toDegree)!;
        return voice.kind === 'held' ? `${label} · common tone` : `${label} → ${formatAccidentals(destination.name)}`;
    });
    if (!step.chord.tones.some(tone => tone.degree === '3')) notes.unshift('No 3rd · no 3rd–♭7 tritone');
    const name = minorTarget ? 'Harmonic Minor' : 'Ionian';
    const outside = colours.filter(tone => !COLLECTIONS[name].includes(pc(tone.pitchClass - target.chord.rootPitchClass) as never));
    const key = formatAccidentals(target.chord.root);
    notes.push(outside.length ? `Outside ${key} ${name} · ${outside.map(tone => formatAccidentals(tone.name)).join(', ')}` : `Colour tones · within ${key} ${name}`);
    return notes;
}

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
        const step = (ref: ChordRef, role: string, roman?: string): RelationStep => ({ chord: resolveChord(ref), role, roman: roman ?? romanLabel(ref, query.frame) });
        const end = () => step(target, 'Target');
        const derive = (steps: RelationStep[], index: number, mode?: 'nearest') => ({ fromStep: index, toStep: index + 1, ...connectChords(steps[index].chord, steps[index + 1].chord, mode) });
        const example = (id: string, label: string, steps: RelationStep[], kind: RelationExample['kind'] = 'motion', supplied?: RelationExample['transitions'] | 'nearest') => {
            const transitions = Array.isArray(supplied) ? supplied : kind === 'motion' ? steps.slice(1).map((_, i) => derive(steps, i, supplied)) : undefined;
            result.examples.push({ id, label, kind, steps, provenance: ['passing', 'cadence'].includes(query.kind) && query.context?.before ? 'observation' : 'illustration', transitions,
                facts: steps.slice(1).map((s, i) => compareChords(steps[i].chord, s.chord)) });
        };
        const dominant = relativeChord(target.root, 5, 7, 'dominant-7');
        const domRoman = tonicHarmony ? 'V7' : appliedTarget ? `V7/${targetRoman}` : romanLabel(dominant, query.frame);
        const dom = () => step(dominant, tonicHarmony ? 'Dominant' : appliedTarget ? 'Possible applied dominant' : 'Dominant approach', domRoman);
        const localScale = createScaleRef('Diatonic Modes', minor ? 'Aeolian' : 'Ionian', target.rootPitchClass);
        // A tonic reference is not a claim that this collection fits every chord in the example.
        result.scaleLinks.push({ label: `${target.root} ${minor ? 'Aeolian' : 'Ionian'} · tonic reference`, ref: localScale });
        switch (query.kind) {
            case 'dominant':
                example('dominant', tonicHarmony ? 'Dominant resolution' : tonicFamilyTarget ? 'Local tonicization' : appliedTarget ? 'Possible applied dominant' : `Approach to ${target.name}`, [dom(), end()]);
                result.observations = [tonicHarmony ? 'Target · key center' : `Local target · ${target.name}`, '3 → root · ♭7 → third'];
                break;
            case 'dominant-colour': {
                const colours = DOMINANT_COLOURS.filter(colour => (colour.lenses as readonly string[]).includes(query.frame.lens));
                result.checks.push({ id: 'colour-vocabulary', label: query.frame.lens === 'classical' ? 'Classical · V9, V♭9, altered 5th' : 'Jazz/pop · extended, altered, sus', state: 'pass' });
                for (const colour of colours) {
                    const variant = step({ ...dominant, chordId: colour.chordId }, dom().role, domRoman.replace(/^V7/, `V${colour.suffix}`));
                    const steps = [variant, end()];
                    example(colour.id, colour.suffix, steps);
                    const added = result.examples.at(-1)!;
                    added.notes = colourNotes(variant, steps[1], added.transitions![0], minor);
                    if (colour.id === '7b5') {
                        // Pitch-set fact only; the partner root takes a plain key spelling (A♭7♭5 ↔ D7♭5, not E𝄫).
                        const partner = resolveChord({ root: getKeyName(pc(variant.chord.rootPitchClass + 6)), chordId: colour.chordId });
                        if (partner.tones.every(tone => variant.chord.tones.some(item => item.pitchClass === tone.pitchClass))) added.notes.push(`Same pitches as ${partner.name} · different root`);
                    }
                    if (colour.id === '7b9') added.notes.push('Without the root · a diminished seventh');
                }
                result.status = 'possible';
                result.observations = [tonicHarmony ? 'Target · key center' : `Local target · ${target.name}`, 'Where present · 3rd + ♭7 resolve as in V7', 'Alterations · not interchangeable · melody + voicing decide'];
                break;
            }
            case 'fifths': {
                const from = relativeChord(target.root, 5, 7, minor ? 'minor' : 'major');
                // Triads: plain voice leading, not guide tones.
                example('fifths', 'Root motion', [step(from, 'Fifth above target'), end()], 'motion', 'nearest');
                result.status = 'possible';
                result.observations = ['Down a fifth · up a fourth', 'Function · context needed'];
                break;
            }
            case 'tritone': {
                result.checks.push({ id: 'jazz-pop-rule', label: 'Jazz/pop substitution rule', state: query.frame.lens === 'jazz-pop' ? 'pass' : 'fail' });
                if (query.frame.lens === 'classical') return unsupported('Tritone substitution is shown under the jazz/pop lens; augmented-sixth reinterpretation is outside this rule.');
                const substitute = relativeChord(target.root, 2, 1, 'dominant-7');
                example('original', 'Original dominant', [dom(), end()]);
                example('substitute', 'Tritone substitute', [step(substitute, 'Substitute dominant', tonicHarmony || appliedTarget ? `subV7/${targetRoman}` : romanLabel(substitute, query.frame)), end()]);
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
                example('ii-v', 'ii–V preparation', [step(ii, 'Predominant', tonicHarmony || appliedTarget ? `${minor ? 'iiø7' : 'ii7'}${applied}` : romanLabel(ii, query.frame)), dom(), end()]);
                if (query.kind === 'predominant') {
                    const iv = relativeChord(target.root, 4, 5, minor ? 'minor-7' : 'major-7');
                    example('iv-v', 'IV–V preparation', [step(iv, 'Predominant in this example'), dom(), end()]);
                }
                result.observations = [minor ? 'Minor · iiø7 → V7' : 'Major · ii7 → V7', 'Predominant · role in this context'];
                break;
            }
            case 'neapolitan': {
                result.checks.push({ id: 'classical-rule', label: 'Classical lens', state: query.frame.lens === 'classical' ? 'pass' : 'fail' });
                result.checks.push({ id: 'tonic-target', label: 'Tonic-family target at the key center', state: tonicHarmony ? 'pass' : 'fail' });
                if (query.frame.lens !== 'classical') return unsupported('The Neapolitan sixth is shown under the classical lens; a jazz/pop ♭IImaj7 is a different, subV-related colour.');
                if (!tonicHarmony) return unsupported('Target · tonic-family quality at the key center required for this Neapolitan rule');
                const firstInversion = (ref: ChordRef) => ({ ...ref, bass: resolveChord(ref).tones.find(tone => ['3', 'b3'].includes(tone.degree))!.name });
                const neapolitan = step(firstInversion(relativeChord(target.root, 2, 1, 'major')), 'Chromatic predominant', '♭II6');
                const dominant7 = step(dominant, 'Dominant', 'V7');
                // Curated: ♭2̂ falls to the leading tone, ♭6̂ to 5̂; the shared 4̂ is retained as V7's 7th.
                const toDominant = { fromStep: 0, toStep: 1, basis: 'supplied' as const, voices: completeCommonTones(neapolitan.chord, dominant7.chord, [{ fromDegree: '1', toDegree: '3', kind: 'resolution' as const }, { fromDegree: '5', toDegree: '1', kind: 'resolution' as const }]) };
                const cadential = [neapolitan, dominant7, end()];
                example('neapolitan', '♭II6–V7–I', cadential, 'motion', [toDominant, derive(cadential, 1)]);
                const ii = firstInversion(relativeChord(target.root, 2, 2, minor ? 'diminished' : 'minor'));
                example('ii-neapolitan', minor ? 'ii°6 / ♭II6' : 'ii6 / ♭II6', [step(ii, 'Diatonic predominant', minor ? 'ii°6' : 'ii6'), step(neapolitan.chord, 'Chromatic predominant', '♭II6')], 'comparison');
                result.observations = ['♭2 → leading tone · ♭6 → 5', 'Chromatic ii6 · same predominant role', '4̂ in the bass · first inversion'];
                if (!minor) result.observations.push('Major key · ♭6 also borrowed from minor');
                break;
            }
            case 'tonic-sub': {
                result.checks.push({ id: 'tonic-family-rule', label: 'Tonic family · jazz/pop', state: tonicHarmony && query.frame.lens === 'jazz-pop' ? 'pass' : 'fail' });
                if (!tonicHarmony || query.frame.lens !== 'jazz-pop') return unsupported('Target · tonic-family quality at the key center required · jazz/pop only');
                if (minor) {
                    // Relative-major tonic area only; ♭VImaj7 reads as subdominant minor in jazz function charts.
                    const alternate = relativeChord(target.root, 3, 3, 'major-7');
                    example('flat-iii', 'im7 / ♭IIImaj7', [step({ root: target.root, chordId: 'minor-7' }, 'Tonic family'), step(alternate, 'Tonic-family alternative')], 'comparison');
                    result.observations = ['Jazz/pop · minor tonic family', 'Relative major · shares ♭3, 5, ♭7', 'Shared tones ≠ interchangeable'];
                } else {
                    const main = { root: target.root, chordId: 'major-7' };
                    for (const [degree, interval, id] of [[3, 4, 'iii'], [6, 9, 'vi']] as const) {
                        const alternate = relativeChord(target.root, degree, interval, 'minor-7');
                        example(id, `Imaj7 / ${id}7`, [step(main, 'Tonic family'), step(alternate, 'Tonic-family alternative')], 'comparison');
                    }
                    result.observations = ['Jazz/pop · tonic family', 'Shared tones ≠ interchangeable'];
                }
                result.status = 'possible';
                break;
            }
            case 'mixture': {
                result.checks.push({ id: 'mixture-frame', label: 'Major key · major tonic-family target', state: tonicHarmony && !minor ? 'pass' : 'fail' });
                if (query.frame.mode === 'minor') return unsupported('Minor frame · a major tonic from the parallel major is observed as the Picardy third under Cadence');
                if (!tonicHarmony || minor) return unsupported('Target · major tonic-family quality at the key center required for parallel-minor borrowing');
                const tonic = target.rootPitchClass;
                // Same scale degree, diatonic chord vs parallel-minor chord. Comparison only.
                for (const [id, degree, [fromInterval, fromQuality], [toInterval, toQuality]] of [
                    ['ii', 2, [2, 'minor-7'], [2, 'half-diminished-7']],
                    ['flat-iii', 3, [4, 'minor'], [3, 'major']],
                    ['iv', 4, [5, 'major'], [5, 'minor']],
                    ['flat-vi', 6, [9, 'minor'], [8, 'major']],
                    ['flat-vii', 7, [11, 'diminished'], [10, 'major']],
                ] as const) {
                    const borrowed = step(relativeChord(target.root, degree, toInterval, toQuality), 'Borrowed · parallel minor');
                    example(id, borrowed.roman, [step(relativeChord(target.root, degree, fromInterval, fromQuality), 'Major-key diatonic'), borrowed], 'comparison');
                    const tones = borrowed.chord.tones.filter(tone => !MAJOR_SCALE.includes(pc(tone.pitchClass - tonic) as never));
                    result.examples.at(-1)!.notes = [`Borrowed · ${tones.map(tone => `${formatAccidentals(tone.name)} (${loweredDegree(tonic, tone.pitchClass)})`).join(', ')}`, ...(id === 'flat-vii' ? ['Also in Mixolydian'] : [])];
                }
                result.status = 'possible';
                result.observations = ['Parallel minor · borrowed colour', 'Same degree · changed quality', 'Functional readings · Subdominant minor, Backdoor', 'Comparison · not a sequence'];
                result.scaleLinks = [{ label: `${target.root} Aeolian · borrowed collection`, ref: createScaleRef('Diatonic Modes', 'Aeolian', target.rootPitchClass) }];
                break;
            }
            case 'minor-sub': {
                result.checks.push({ id: 'borrowed-family-rule', label: 'Major tonic family · jazz/pop', state: tonicHarmony && !minor && query.frame.lens === 'jazz-pop' ? 'pass' : 'fail' });
                if (query.frame.lens === 'classical') return unsupported('These seventh-chord family comparisons use the jazz/pop lens, not a general classical substitute rule.');
                if (!tonicHarmony || minor) return unsupported('Target · major tonic-family quality at the key center required for parallel-minor borrowing');
                const iv = relativeChord(target.root, 4, 5, 'minor-7');
                example('mixture', 'IVmaj7 / iv7', [step(relativeChord(target.root, 4, 5, 'major-7'), 'Major-key collection'), step(iv, 'Parallel-minor colour')], 'comparison');
                example('minor-ii', 'iv7 / iiø7', [step(iv, 'Minor subdominant family'), step(relativeChord(target.root, 2, 2, 'half-diminished-7'), 'Related predominant')], 'comparison');
                example('flat-six', 'iv7 / ♭VImaj7', [step(iv, 'Minor subdominant family'), step(relativeChord(target.root, 6, 8, 'major-7'), 'Related borrowed colour')], 'comparison');
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
                const backdoor = () => step(flatSeven, 'Backdoor approach');
                const arrival = () => step(target, 'Target');
                // Curated lines: ♭VII7–I is neither fifth motion nor a tritone substitute.
                const resolution = { fromStep: 1, toStep: 2, basis: 'supplied' as const, voices: completeCommonTones(resolveChord(flatSeven), target, [{ fromDegree: '5', toDegree: '3', kind: 'resolution' as const }, { fromDegree: 'b7', toDegree: '5', kind: 'resolution' as const }]) };
                example('backdoor', '♭VII7–I', [backdoor(), arrival()], 'motion', [{ ...resolution, fromStep: 0, toStep: 1 }]);
                const minorBackdoor = [step(iv, 'Minor subdominant'), backdoor(), arrival()];
                example('minor-backdoor', 'iv7–♭VII7–I', minorBackdoor, 'motion', [derive(minorBackdoor, 0), resolution]);
                result.status = 'possible';
                result.observations = ['Jazz/pop · minor-subdominant connection', '♭VII7 fifth → third · ♭7 → fifth', 'Melody + phrase · fit remains contextual'];
                result.scaleLinks = [{ label: `${target.root} Aeolian · borrowed collection`, ref: createScaleRef('Diatonic Modes', 'Aeolian', target.rootPitchClass) }];
                break;
            }
            case 'leading': {
                const leading = relativeChord(target.root, 7, 11, 'diminished-7');
                example('leading', 'Leading-tone diminished', [step(leading, appliedTarget ? 'Applied leading tone' : 'Leading-tone approach', tonicHarmony ? 'vii°7' : appliedTarget ? `vii°7/${targetRoman}` : romanLabel(leading, query.frame)), end()]);
                example('rootless', 'Compare V7♭9', [step({ ...dominant, chordId: 'dominant-7-flat-9' }, 'Dominant with ♭9', `${domRoman}(♭9)`), end()]);
                result.observations = ['Same pitches · V7♭9 without root', 'Distinct chord identities', minor ? 'Minor · raised leading tone' : 'Major · chromatic ♭6'];
                result.scaleLinks.push({ label: `${target.root} Harmonic Minor · leading-tone collection`, ref: createScaleRef('Harmonic Minor Modes', 'Harmonic Minor', target.rootPitchClass) });
                break;
            }
            case 'common-tone': {
                const embellishment = step({ root: target.root, chordId: 'diminished-7' }, 'Possible embellishment', 'CT°7');
                embellishment.toneLabels = {};
                // Analytical neighbor spelling is separate from the canonical diminished chord formula.
                for (const [canonical, degree, number] of [['1', '1', 1], ['b3', minor ? 'b3' : '#2', minor ? 3 : 2], ['b5', '#4', 4], ['bb7', '6', 6]] as const) {
                    const tone = embellishment.chord.tones.find(t => t.degree === canonical)!;
                    const spelled = spellDegree(note(target.root), number, tone.pitchClass);
                    if (!spelled) throw new Error('Common-tone analysis needs unsupported spelling');
                    embellishment.toneLabels[canonical] = { name: spelled.name, degree };
                }
                example('common-tone', 'Retained root · neighboring voices', [embellishment, step(target, 'Target')], 'motion', [{ fromStep: 0, toStep: 1, voices: [
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
                example('passing', 'Three-chord observation', [step(before, 'Before'), step(middle, 'Diminished link'), step(target, 'Target')], 'motion', [0, 1].map(index => ({
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
                example('cadence', context.before ? context.phraseEnding === true ? 'Observed ending' : 'Observed motion' : 'Illustration · not an observed cadence', [step(before, 'Before'), step(target, 'Target')], 'motion', transitions);
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
