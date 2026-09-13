import { STANDARD_GUITAR_STRING_MIDI_PITCHES } from '../../shared/tuning';
import { canonicalTone, engineEntry, identityRequiredToneIds } from './catalog';
import { EngineError } from './errors';
import { sixIntegers } from './identity';
import { validateIntentEnvelope } from './requestSchema';
import { boolean, canonical, choice, freeze, integer, record } from './validation';
import type { Extreme, PhysicalProfile, ResolvedRequest, Six, StringIndex, StructuralPredicate, StructuralRequest, Subset } from './types';

const conflict = (message: string, field?: string): never => { throw new EngineError('conflicting-constraints', message, field); };

export function compilePhysicalProfile(input: unknown = {}): PhysicalProfile {
    const v = record(input, ['scaleLengthUm','scaleSource','scope','allowedThumb','omittedStrings','warningSpanUm','severeSpanUm','handProfileRef'], 'physical');
    const profile: PhysicalProfile = {
        key: '', screenVersion: 'physical-screen-v1', numericVersion: 'geometry-um-v1',
        scaleLengthUm: integer(v.scaleLengthUm ?? 647700, 1, 2000000, 'physical.scaleLengthUm'),
        scaleSource: choice(v.scaleSource ?? (v.scaleLengthUm === undefined ? 'default' : 'declared'), ['default','declared','measured'], 'physical.scaleSource'),
        scope: choice(v.scope ?? 'generic-static-fretting', ['generic-static-fretting','restricted-or-personalized'], 'physical.scope'),
        allowedThumb: boolean(v.allowedThumb ?? false, 'physical.allowedThumb'),
        omittedStrings: choice(v.omittedStrings ?? 'unplayed', ['unplayed','require-left-hand-damping'], 'physical.omittedStrings'),
        warningSpanUm: integer(v.warningSpanUm ?? 95000, 0, 2000000, 'physical.warningSpanUm'),
        severeSpanUm: integer(v.severeSpanUm ?? 180000, 0, 2000000, 'physical.severeSpanUm'),
    };
    if (profile.severeSpanUm < profile.warningSpanUm) conflict('Severe envelope must not be below warning envelope.', 'physical');
    if (profile.scaleSource === 'default' && profile.scaleLengthUm !== 647700) conflict('A custom scale cannot have default provenance.', 'physical.scaleSource');
    if (v.handProfileRef !== undefined) {
        if (typeof v.handProfileRef !== 'string' || !v.handProfileRef) throw new EngineError('invalid-request', 'Invalid hand profile reference.');
        profile.handProfileRef = v.handProfileRef;
    }
    profile.key = canonical({ ...profile, key: undefined });
    return freeze(profile);
}

export function compileRequest(input: unknown): ResolvedRequest {
    const v = validateIntentEnvelope(input);
    const entry = engineEntry(v.chordId as string);
    const rootPitchClass = v.rootPitchClass as number;
    const context = choice(v.context ?? 'standalone', ['standalone','accompaniment'], 'context');
    const origins: ResolvedRequest['origins'][number][] = [];
    const origin = (field: string, supplied: boolean, rule: string) => origins.push({ field, origin: supplied ? 'user' : 'default', rule });
    const formula = entry.formula.degrees.map((id, i) => ({ id, interval: entry.formula.intervals[i], role: id === '1' ? 'root' : ['7','b7','bb7'].includes(id) ? 'seventh' : ['3','b3'].includes(id) ? 'third' : ['5','b5','#5'].includes(id) ? 'fifth' : ['2','4'].includes(id) ? 'suspension' : 'extension' }));
    if (new Set(formula.map(t => t.interval % 12)).size !== formula.length) throw new EngineError('unsupported-request', 'Aliased formula pitch classes require a new coverage contract.');
    const tone = (x: unknown): string => {
        if (typeof x !== 'string') throw new EngineError('invalid-request', 'Tone ID must be a string.');
        const d = canonicalTone(entry.id, x);
        if (!formula.some(t => t.id === d)) throw new EngineError('invalid-request', `Unknown formula tone ${x}.`);
        return d;
    };
    const tones = (x: unknown): string[] => {
        if (!Array.isArray(x)) throw new EngineError('invalid-request', 'Tone list must be an array.');
        const values = new Set(x.map(tone));
        return formula.map(t => t.id).filter(d => values.has(d));
    };
    const inst = v.instrument === undefined ? {} : record(v.instrument, ['kind','tuningMidi','maxModeledFret'], 'instrument');
    const kind = choice(inst.kind ?? 'six-single-strings-12edo', ['six-single-strings-12edo'], 'instrument.kind', 'unsupported-request');
    if (inst.tuningMidi !== undefined && (!Array.isArray(inst.tuningMidi) || inst.tuningMidi.length !== 6)) throw new EngineError('unsupported-request', 'Only six single strings are supported.');
    const tuningMidi = sixIntegers(inst.tuningMidi ?? STANDARD_GUITAR_STRING_MIDI_PITCHES, 0, 127, 'instrument.tuningMidi');
    const maxModeledFret = integer(inst.maxModeledFret ?? 15, 0, 36, 'instrument.maxModeledFret', 'unsupported-request');
    const instrument = { kind, tuningMidi, maxModeledFret };
    const rawDomains = v.fretDomains ?? Array.from({ length: 6 }, () => Array.from({ length: maxModeledFret + 1 }, (_, f) => f));
    if (!Array.isArray(rawDomains) || rawDomains.length !== 6) throw new EngineError('invalid-request', 'Six fret domains are required.');
    const fretDomains = rawDomains.map((d, s) => {
        if (!Array.isArray(d)) throw new EngineError('invalid-request', 'Fret domain must be an array.');
        const domain = [...new Set(d.map(f => integer(f, 0, maxModeledFret, 'fretDomains'))) ].sort((a,b) => a-b);
        if (domain.some(f => tuningMidi[s] + f > 127)) throw new EngineError('unsupported-request', 'Requested sounding MIDI exceeds 127.');
        return domain;
    }) as unknown as Six<readonly number[]>;
    const realization = v.realization === undefined ? { kind: 'identity' } : record(v.realization, ['kind','additionalRequired','requiredToneIds','allowedToneIds'], 'realization');
    const mode = choice(realization.kind, ['identity','partial'], 'realization.kind');
    if (mode === 'identity' && realization.requiredToneIds !== undefined || mode === 'partial' && realization.additionalRequired !== undefined) throw new EngineError('invalid-request', 'Required-tone field does not match realization kind.');
    let allowed = realization.allowedToneIds === undefined ? formula.map(t => t.id) : tones(realization.allowedToneIds);
    let required = mode === 'identity' ? identityRequiredToneIds(formula.map(t => t.id)) : tones(realization.requiredToneIds);
    if (mode === 'partial' && (realization.allowedToneIds === undefined || required.length === 0)) conflict('Partial requests need allowed and nonempty required tone sets.');
    if (realization.additionalRequired !== undefined) required = [...new Set([...required, ...tones(realization.additionalRequired)])];
    const explicitRoot = required.includes('1');
    const rootMode = choice(v.rootMode ?? (explicitRoot || context === 'standalone' ? 'required' : 'optional'), ['required','optional','excluded'], 'rootMode');
    if (explicitRoot && rootMode !== 'required') conflict('Explicit root obligation conflicts with rootMode.');
    if (rootMode === 'required') required.push('1');
    const excluded = new Set(v.excludedToneIds === undefined ? [] : tones(v.excludedToneIds));
    if (rootMode === 'excluded') excluded.add('1');
    allowed = allowed.filter(t => !excluded.has(t));
    const complete = boolean(v.completeFormula ?? false, 'completeFormula');
    if (complete) required = formula.map(t => t.id);
    const floor = integer(v.minDistinctPitchClasses ?? Math.min(mode === 'partial' || context === 'accompaniment' ? 2 : 3, formula.length), 1, 6, 'minDistinctPitchClasses');
    const extreme = (x: unknown): Extreme => {
        const e = record(x, ['tone','pitchClass','midi'], 'extreme');
        if (Object.keys(e).length !== 1) conflict('Bass/top specify exactly one tone, pitch class or MIDI.');
        if (e.tone !== undefined) return { tone: tone(e.tone) };
        if (e.pitchClass !== undefined) return { pitchClass: integer(e.pitchClass,0,11,'pitchClass') };
        return { midi: integer(e.midi,0,127,'midi') };
    };
    const subset = (x: unknown): Subset => {
        const s = record(x, ['kind','toneIds'], 'subset');
        const k = choice(s.kind, ['unrestricted','essential-tones','close-position','drop-2','drop-3'], 'subset.kind', 'unsupported-request');
        if (k === 'unrestricted' || k === 'essential-tones') {
            if (s.toneIds !== undefined) throw new EngineError('invalid-request', 'This subset does not accept toneIds.');
            return { kind: k };
        }
        const selected = s.toneIds === undefined && k !== 'close-position' && formula.length === 4 ? formula.map(t => t.id) : tones(s.toneIds);
        if (k === 'close-position' ? selected.length < 2 || selected.length > 6 : selected.length !== 4) throw new EngineError('unsupported-request', 'Invalid subset tone cardinality.');
        return { kind: k, toneIds: selected };
    };
    const predicates: StructuralPredicate[] = [];
    if (v.requirements !== undefined) {
        if (!Array.isArray(v.requirements)) throw new EngineError('invalid-request', 'requirements must be an array.');
        for (const raw of v.requirements) {
            const p = record(raw, ['kind','count','strings','mode','value','low','high'], 'requirement');
            const k = choice(p.kind, ['sounding-count','allowed-strings','exact-strings','open','root','formula-coverage','bass','top','stopped-position','subset'], 'requirement.kind');
            const fields: Record<string, string[]> = { 'sounding-count':['count'], 'allowed-strings':['strings'], 'exact-strings':['strings'], open:['mode'], root:['mode'], 'formula-coverage':['mode'], bass:['value'], top:['value'], 'stopped-position':['low','high'], subset:['value'] };
            record(p, ['kind', ...fields[k]], 'requirement');
            if (k === 'sounding-count') predicates.push({kind:k,count:integer(p.count,1,6,'count')});
            else if (k === 'allowed-strings' || k === 'exact-strings') {
                if (!Array.isArray(p.strings)) throw new EngineError('invalid-request','strings must be an array.');
                predicates.push({kind:k, strings:[...new Set(p.strings.map(s => integer(s,0,5,'string') as StringIndex))].sort()});
            } else if (k === 'open') predicates.push({kind:k,mode:choice(p.mode,['require','exclude'],'open')});
            else if (k === 'root') predicates.push({kind:k,mode:choice(p.mode,['include','omit'],'root')});
            else if (k === 'formula-coverage') predicates.push({kind:k,mode:choice(p.mode,['complete','omissions'],'coverage')});
            else if (k === 'bass' || k === 'top') predicates.push({kind:k,value:extreme(p.value)});
            else if (k === 'subset') predicates.push({kind:k,value:subset(p.value)});
            else {
                const low = integer(p.low,0,maxModeledFret,'low'); const high = integer(p.high,0,maxModeledFret,'high');
                if (low > high) conflict('Empty stopped-position interval.');
                predicates.push({kind:'stopped-position',low,high});
            }
        }
    }
    if (v.subset !== undefined) predicates.push({kind:'subset',value:subset(v.subset)});
    const slash = v.slashBassPitchClass === undefined ? undefined : integer(v.slashBassPitchClass,0,11,'slashBassPitchClass');
    if (slash !== undefined) {
        if (!formula.some(t => (rootPitchClass+t.interval)%12 === slash)) throw new EngineError('unsupported-request','Non-formula slash bass is unsupported.');
        predicates.push({kind:'bass',value:{pitchClass:slash}});
    }
    // Compile vocabulary restrictions and obligations once, never intersect away an obligation.
    for (const p of predicates) {
        if (p.kind === 'root') {
            if (p.mode === 'include') required.push('1'); else allowed = allowed.filter(t => t !== '1');
        }
        if (p.kind === 'formula-coverage' && p.mode === 'complete') required.push(...formula.map(t => t.id));
        if (p.kind === 'subset' && 'toneIds' in p.value) required.push(...p.value.toneIds!);
    }
    for (const p of predicates) {
        if (p.kind === 'subset' && p.value.kind === 'essential-tones') allowed = allowed.filter(t => required.includes(t));
        if (p.kind === 'subset' && 'toneIds' in p.value) { const ids=p.value.toneIds!; allowed = allowed.filter(t => ids.includes(t)); }
    }
    required = formula.map(t => t.id).filter(t => required.includes(t));
    if (!allowed.length || floor > allowed.length || required.some(t => !allowed.includes(t))) conflict('Allowed tones, omissions, coverage or density contradict required tones.');
    for (const axis of ['bass','top'] as const) {
        const checks = predicates.filter((p): p is Extract<StructuralPredicate,{kind:'bass'|'top'}> => p.kind === axis);
        const pcs = checks.map(p => { const value = p.value; return 'tone' in value ? (rootPitchClass+formula.find(t => t.id === value.tone)!.interval)%12 : 'midi' in value ? value.midi%12 : value.pitchClass; });
        if (new Set(pcs).size > 1 || pcs.some(pc => !allowed.some(t => (rootPitchClass+formula.find(f => f.id === t)!.interval)%12 === pc))) conflict(`Incompatible ${axis} requirements.`);
        const midis = checks.flatMap(p => 'midi' in p.value ? [p.value.midi] : []);
        if (new Set(midis).size > 1) conflict(`Incompatible ${axis} MIDI requirements.`);
    }
    for (const kind of ['sounding-count','open','formula-coverage'] as const) {
        const values = predicates.filter(p => p.kind === kind).map(p => canonical(p));
        if (new Set(values).size > 1) conflict(`Incompatible ${kind} requirements.`);
    }
    const ranges = predicates.filter((p): p is Extract<StructuralPredicate,{kind:'stopped-position'}> => p.kind === 'stopped-position');
    if (ranges.length && Math.max(...ranges.map(p=>p.low)) > Math.min(...ranges.map(p=>p.high))) conflict('Disjoint stopped-position intervals.');
    const exactStrings = predicates.filter((p): p is Extract<StructuralPredicate,{kind:'allowed-strings'|'exact-strings'}> => p.kind === 'exact-strings');
    const allowedStrings = predicates.filter((p): p is Extract<StructuralPredicate,{kind:'allowed-strings'|'exact-strings'}> => p.kind === 'allowed-strings');
    if (new Set(exactStrings.map(p=>canonical(p.strings))).size>1 || exactStrings.some(p=>!p.strings.length || allowedStrings.some(a=>p.strings.some(s=>!a.strings.includes(s))))) conflict('Incompatible string-set requirements.');
    const counts = predicates.flatMap(p=>p.kind==='sounding-count'?[p.count]:p.kind==='exact-strings'?[p.strings.length]:p.kind==='subset'&&'toneIds' in p.value?[p.value.toneIds!.length]:[]);
    if (new Set(counts).size>1 || counts.some(n=>n<floor)) conflict('Incompatible sounding count, subset or distinct-tone floor.');
    if (required.length===formula.length && predicates.some(p=>p.kind==='formula-coverage'&&p.mode==='omissions')) conflict('Required complete formula contradicts omissions.');
    const structural: StructuralRequest = { version:'structural-v1', instrument, fretDomains, formulaKey:`catalog-v1:${entry.id}`, rootPitchClass, allowed, required, minDistinctPitchClasses:floor, predicates:[...new Map(predicates.map(p=>[canonical(p),p])).values()].sort((a,b)=>canonical(a)<canonical(b)?-1:canonical(a)>canonical(b)?1:0) };
    origin('context',v.context!==undefined,'standalone default'); origin('instrument',v.instrument!==undefined,'standard six-string scope');
    origin('fretDomains',v.fretDomains!==undefined,'inclusive modeled fret domain'); origin('realization',v.realization!==undefined,'identity-v1');
    origin('rootMode',v.rootMode!==undefined||explicitRoot,`resolved ${rootMode}`); origin('minDistinctPitchClasses',v.minDistinctPitchClasses!==undefined,`resolved floor ${floor}`);
    for (const field of ['excludedToneIds','completeFormula','slashBassPitchClass','subset','requirements']) if (v[field]!==undefined) origin(field,true,'explicit constraint');
    const physicalProfile = compilePhysicalProfile(v.physical);
    for (const field of ['scaleLengthUm','scaleSource','scope','allowedThumb','omittedStrings','warningSpanUm','severeSpanUm','handProfileRef']) origin(`physical.${field}`, !!v.physical && field in (v.physical as object), 'physical-screen-v1');
    const interpretation: ResolvedRequest['interpretation'] = { chordId:entry.id,rootPitchClass,formula,realization:mode,context,policyVersion:'identity-v1', ...(slash===undefined?{}:{slashBassPitchClass:slash}) };
    const requestKey = canonical({ structural, interpretation, physicalProfile });
    return freeze({ requestKey,structural,interpretation,physicalProfile,origins });
}
