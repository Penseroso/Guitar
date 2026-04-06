import {
    STANDARD_GUITAR_STRING_MIDI_PITCHES,
    STANDARD_GUITAR_TUNING_PITCH_CLASSES,
} from '../tuning';
import {
    buildChordDefinitionFromRegistryEntry,
    buildChordTonesFromRegistryEntry,
    normalizePitchClass,
    type BuildChordDefinitionOptions,
} from './helpers';
import { buildVoicingProvenance, deriveVoicingDescriptor } from './descriptor';
import { getChordRegistryEntry, type ChordRegistryEntry } from './registry';
import { isFormulaClosedChordFamily } from './semantics';
import type {
    ChordDefinition,
    ChordTones,
    GuitarStringIndex,
    PitchClass,
    ResolvedVoicing,
    ResolvedVoicingNote,
    VoicingConstraints,
    VoicingTemplate,
    VoicingTemplateString,
} from './types';

export interface ResolveVoicingOptions {
    tuning?: PitchClass[];
    stringMidiPitches?: number[];
    slashBassPitchClass?: PitchClass;
    constraints?: Partial<VoicingConstraints>;
    rootFret?: number;
    positionIndex?: number;
    minRootFret?: number;
    maxRootFret?: number;
    maxPositionsPerTemplate?: number;
}

interface ResolvedVoicingSeed {
    id: string;
    strings: VoicingTemplateString[];
    rootString?: GuitarStringIndex;
    provenanceSeed: {
        source?: VoicingTemplate['source'];
        seedId: string;
        debugLabel?: string;
    };
}

function getLowestPlayedNote(notes: ResolvedVoicingNote[]): ResolvedVoicingNote | undefined {
    return notes
        .filter((note) => !note.isMuted && note.midiNote !== undefined)
        .sort((left, right) => (left.midiNote as number) - (right.midiNote as number))[0];
}

function buildTonePitchClassMap(tones: ChordTones): Map<number, ChordTones['tones'][number][]> {
    const map = new Map<number, ChordTones['tones'][number][]>();

    for (const tone of tones.tones) {
        const normalizedPitchClass = normalizePitchClass(tone.pitchClass);
        const existing = map.get(normalizedPitchClass);

        if (existing) {
            existing.push(tone);
        } else {
            map.set(normalizedPitchClass, [tone]);
        }
    }

    return map;
}

function selectToneForTemplateString(
    templateString: VoicingTemplateString,
    toneMatches: ChordTones['tones'][number][]
): ChordTones['tones'][number] | undefined {
    if (templateString.toneDegree) {
        const exactMatch = toneMatches.find((tone) => tone.degree === templateString.toneDegree);
        if (exactMatch) {
            return exactMatch;
        }
    }

    return toneMatches.find((tone) => tone.isRequired) ?? toneMatches[0];
}

function getRootFretForTemplate(
    rootPitchClass: number,
    rootString: number,
    tuning: PitchClass[]
): number {
    return normalizePitchClass(rootPitchClass - tuning[rootString]);
}

function getTemplateRootString(template: VoicingTemplate): number {
    return template.rootString ?? template.strings.find((stringValue) => stringValue.toneDegree === '1')?.string ?? 5;
}

function collectPlayedDegrees(notes: ResolvedVoicingNote[]): Set<string> {
    return new Set(
        notes
            .filter((note) => !note.isMuted && note.degree)
            .map((note) => note.degree as string)
    );
}

function getOutOfFormulaPitchClasses(chord: ChordDefinition, notes: ResolvedVoicingNote[], tones: ChordTones): PitchClass[] {
    const entry = getChordRegistryEntry(chord.id);
    if (!entry || !isFormulaClosedChordFamily(entry)) {
        return [];
    }

    const allowedPitchClasses = new Set(tones.tones.map((tone) => normalizePitchClass(tone.pitchClass)));

    return Array.from(new Set(
        notes
            .filter((note) => !note.isMuted)
            .map((note) => normalizePitchClass(note.pitchClass))
            .filter((pitchClass) => !allowedPitchClasses.has(pitchClass))
    ));
}

function getVoicingSignature(notes: ResolvedVoicingNote[]): string {
    return notes
        .map((note) => `${note.string}:${note.isMuted ? 'x' : note.fret}`)
        .join('|');
}

export function getCandidateRootFretsForTemplate(
    chord: ChordDefinition,
    template: VoicingTemplate,
    options: ResolveVoicingOptions = {}
): number[] {
    const tuning = options.tuning ?? STANDARD_GUITAR_TUNING_PITCH_CLASSES;
    const minRootFret = options.minRootFret ?? 0;
    const maxRootFret = options.maxRootFret ?? 15;
    const maxPositionsPerTemplate = options.maxPositionsPerTemplate ?? Number.POSITIVE_INFINITY;
    const baseRootFret = getRootFretForTemplate(chord.rootPitchClass, getTemplateRootString(template), tuning);
    const rootFrets: number[] = [];

    for (let rootFret = baseRootFret; rootFret <= maxRootFret; rootFret += 12) {
        if (rootFret < minRootFret) {
            continue;
        }

        rootFrets.push(rootFret);

        if (rootFrets.length >= maxPositionsPerTemplate) {
            break;
        }
    }

    return rootFrets;
}

export function resolveVoicingNote(args: {
    templateString: VoicingTemplateString;
    chord: ChordDefinition;
    tones: ChordTones;
    rootFret: number;
    tonePitchClassMap?: Map<number, ChordTones['tones'][number][]>;
    tuning?: PitchClass[];
    stringMidiPitches?: number[];
}): ResolvedVoicingNote {
    const tuning = args.tuning ?? STANDARD_GUITAR_TUNING_PITCH_CLASSES;
    const stringMidiPitches = args.stringMidiPitches ?? STANDARD_GUITAR_STRING_MIDI_PITCHES;
    const tonePitchClassMap = args.tonePitchClassMap ?? buildTonePitchClassMap(args.tones);
    const { templateString, chord, rootFret } = args;

    if (templateString.fretOffset === null) {
        return {
            string: templateString.string,
            fret: -1,
            pitchClass: -1,
            degree: templateString.toneDegree,
            isMuted: true,
        };
    }

    const fret = rootFret + templateString.fretOffset;
    const pitchClass = normalizePitchClass(tuning[templateString.string] + fret);
    const toneMatches = tonePitchClassMap.get(pitchClass) ?? [];
    const matchedTone = selectToneForTemplateString(templateString, toneMatches);

    return {
        string: templateString.string,
        fret,
        pitchClass,
        midiNote: stringMidiPitches[templateString.string] + fret,
        degree: matchedTone?.degree ?? templateString.toneDegree,
        isRoot: matchedTone?.degree === '1' || pitchClass === chord.rootPitchClass,
    };
}

export function resolveVoicingTemplate(
    chord: ChordDefinition,
    tones: ChordTones,
    template: VoicingTemplate,
    options: ResolveVoicingOptions = {}
): ResolvedVoicing {
    return resolveVoicingSeed(chord, tones, {
        id: template.id,
        strings: template.strings,
        rootString: template.rootString,
        provenanceSeed: {
            source: template.source,
            seedId: template.id,
            debugLabel: template.label,
        },
    }, options);
}

function resolveVoicingSeed(
    chord: ChordDefinition,
    tones: ChordTones,
    seed: ResolvedVoicingSeed,
    options: ResolveVoicingOptions = {}
): ResolvedVoicing {
    const tuning = options.tuning ?? STANDARD_GUITAR_TUNING_PITCH_CLASSES;
    const constraints = options.constraints ?? {};
    const rootString = seed.rootString ?? seed.strings.find((stringValue) => stringValue.toneDegree === '1')?.string ?? 5;
    const rootFret = options.rootFret ?? getRootFretForTemplate(chord.rootPitchClass, rootString, tuning);
    const tonePitchClassMap = buildTonePitchClassMap(tones);
    const notes = seed.strings
        .map((templateString) =>
            resolveVoicingNote({
                templateString,
                chord,
                tones,
                rootFret,
                tonePitchClassMap,
                tuning,
                stringMidiPitches: options.stringMidiPitches,
            })
        )
        .sort((left, right) => left.string - right.string);

    const playedNotes = notes.filter((note) => !note.isMuted);
    const lowestPlayedNote = getLowestPlayedNote(notes);
    const playedFrets = playedNotes.map((note) => note.fret);
    const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 0;
    const maxFret = playedFrets.length > 0 ? Math.max(...playedFrets) : 0;
    const span = playedFrets.length > 0 ? maxFret - minFret : 0;
    const playedDegrees = collectPlayedDegrees(notes);
    const missingRequiredDegrees = tones.tones
        .filter((tone) => tone.isRequired)
        .map((tone) => tone.degree)
        .filter((degree) => !playedDegrees.has(degree));
    const omittedOptionalDegrees = tones.tones
        .filter((tone) => !tone.isRequired)
        .map((tone) => tone.degree)
        .filter((degree) => !playedDegrees.has(degree));
    const omittedDegrees = [...missingRequiredDegrees, ...omittedOptionalDegrees];
    const outOfFormulaPitchClasses = getOutOfFormulaPitchClasses(chord, notes, tones);
    const requestedSlashBassPitchClass = chord.slashBassPitchClass;
    const satisfiesSlashBass = requestedSlashBassPitchClass === undefined
        ? undefined
        : lowestPlayedNote?.pitchClass === requestedSlashBassPitchClass;
    const hasInvalidFrets = playedFrets.some((fret) => fret < 0);
    // Empirical P1 guardrail: the current generator still emits many obviously awkward
    // grips at span 4+, so chord-mode surfacing treats them as non-playable for now.
    const violatesEmpiricalSpanGuardrail = span >= 4;
    const violatesConstraintRange = (
        (constraints.minFret !== undefined && playedFrets.some((fret) => fret < constraints.minFret!)) ||
        (constraints.maxFret !== undefined && playedFrets.some((fret) => fret > constraints.maxFret!)) ||
        (constraints.maxReach !== undefined && span > constraints.maxReach) ||
        (constraints.allowOpenStrings === false && playedFrets.some((fret) => fret === 0)) ||
        (constraints.allowedRootsOnStrings !== undefined &&
            seed.rootString !== undefined &&
            !constraints.allowedRootsOnStrings.includes(seed.rootString)) ||
        (constraints.requiredDegrees !== undefined &&
            constraints.requiredDegrees.some((degree) => !playedDegrees.has(degree))) ||
        (constraints.omittedDegrees !== undefined &&
            constraints.omittedDegrees.some((degree) => playedDegrees.has(degree)))
    );
    const provenance = buildVoicingProvenance({
        source: seed.provenanceSeed.source,
        seedId: seed.provenanceSeed.seedId,
        debugLabel: seed.provenanceSeed.debugLabel,
    });
    const descriptor = deriveVoicingDescriptor({
        chordId: chord.id,
        rootPitchClass: chord.rootPitchClass,
        slashBassPitchClass: chord.slashBassPitchClass,
        notes,
        tones,
        provenance,
        rootString: seed.rootString,
        span,
        minFret,
        maxFret,
        lowestPlayedPitchClass: lowestPlayedNote?.pitchClass,
        satisfiesSlashBass,
    });

    return {
        id: `${chord.id}:${chord.rootPitchClass}:${seed.id}:${rootFret}`,
        chord,
        descriptor,
        notes,
        rootFret,
        positionIndex: options.positionIndex ?? 0,
        minFret,
        maxFret,
        span,
        playable: playedNotes.length > 0
            && !hasInvalidFrets
            && !violatesEmpiricalSpanGuardrail
            && !violatesConstraintRange
            && outOfFormulaPitchClasses.length === 0,
        lowestPlayedPitchClass: lowestPlayedNote?.pitchClass,
        satisfiesSlashBass,
        outOfFormulaPitchClasses,
        missingRequiredDegrees,
        omittedOptionalDegrees,
        omittedDegrees,
    };
}

export function resolveVoicingTemplates(
    chord: ChordDefinition,
    tones: ChordTones,
    templates: VoicingTemplate[],
    options: ResolveVoicingOptions = {}
): ResolvedVoicing[] {
    return templates.map((template) => resolveVoicingTemplate(chord, tones, template, options));
}

export function resolveVoicingTemplateAcrossPositions(
    chord: ChordDefinition,
    tones: ChordTones,
    template: VoicingTemplate,
    options: ResolveVoicingOptions = {}
): ResolvedVoicing[] {
    const rootFrets = getCandidateRootFretsForTemplate(chord, template, options);
    const seen = new Set<string>();
    const resolvedVoicings: ResolvedVoicing[] = [];

    for (const [index, rootFret] of rootFrets.entries()) {
        const resolved = resolveVoicingTemplate(chord, tones, template, {
            ...options,
            rootFret,
            positionIndex: index,
        });
        const signature = getVoicingSignature(resolved.notes);

        if (seen.has(signature)) {
            continue;
        }

        seen.add(signature);
        resolvedVoicings.push(resolved);
    }

    return resolvedVoicings;
}

export function resolveVoicingTemplatesAcrossPositions(
    chord: ChordDefinition,
    tones: ChordTones,
    templates: VoicingTemplate[],
    options: ResolveVoicingOptions = {}
): ResolvedVoicing[] {
    return templates.flatMap((template) => resolveVoicingTemplateAcrossPositions(chord, tones, template, options));
}

export function resolveVoicingTemplatesForChord(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    templates: VoicingTemplate[],
    options: ResolveVoicingOptions = {}
): ResolvedVoicing[] {
    const chordBuildOptions: BuildChordDefinitionOptions = {
        slashBassPitchClass: options.slashBassPitchClass,
    };
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass, chordBuildOptions);
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);

    return resolveVoicingTemplates(chord, tones, templates, options);
}

export function resolveVoicingTemplatesAcrossPositionsForChord(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    templates: VoicingTemplate[],
    options: ResolveVoicingOptions = {}
): ResolvedVoicing[] {
    const chordBuildOptions: BuildChordDefinitionOptions = {
        slashBassPitchClass: options.slashBassPitchClass,
    };
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass, chordBuildOptions);
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);

    return resolveVoicingTemplatesAcrossPositions(chord, tones, templates, options);
}
