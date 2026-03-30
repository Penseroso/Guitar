import {
    STANDARD_GUITAR_STRING_MIDI_PITCHES,
    STANDARD_GUITAR_TUNING_PITCH_CLASSES,
} from '../tuning';
import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry, normalizePitchClass } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type {
    ChordDefinition,
    ChordTones,
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
    constraints?: Partial<VoicingConstraints>;
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

function collectPlayedDegrees(notes: ResolvedVoicingNote[]): Set<string> {
    return new Set(
        notes
            .filter((note) => !note.isMuted && note.degree)
            .map((note) => note.degree as string)
    );
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
    const tuning = options.tuning ?? STANDARD_GUITAR_TUNING_PITCH_CLASSES;
    const constraints = options.constraints ?? {};
    const rootString = template.rootString ?? template.strings.find((stringValue) => stringValue.toneDegree === '1')?.string ?? 5;
    const rootFret = getRootFretForTemplate(chord.rootPitchClass, rootString, tuning);
    const tonePitchClassMap = buildTonePitchClassMap(tones);
    const notes = template.strings
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
    const playedFrets = playedNotes.map((note) => note.fret);
    const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 0;
    const maxFret = playedFrets.length > 0 ? Math.max(...playedFrets) : 0;
    const span = playedFrets.length > 0 ? maxFret - minFret : 0;
    const playedDegrees = collectPlayedDegrees(notes);
    const omittedDegrees = tones.tones
        .map((tone) => tone.degree)
        .filter((degree) => !playedDegrees.has(degree));
    const hasInvalidFrets = playedFrets.some((fret) => fret < 0);
    const violatesConstraintRange = (
        (constraints.minFret !== undefined && playedFrets.some((fret) => fret < constraints.minFret!)) ||
        (constraints.maxFret !== undefined && playedFrets.some((fret) => fret > constraints.maxFret!)) ||
        (constraints.maxReach !== undefined && span > constraints.maxReach) ||
        (constraints.allowOpenStrings === false && playedFrets.some((fret) => fret === 0)) ||
        (constraints.allowedRootsOnStrings !== undefined &&
            template.rootString !== undefined &&
            !constraints.allowedRootsOnStrings.includes(template.rootString))
    );

    return {
        id: `${chord.id}:${chord.rootPitchClass}:${template.id}`,
        chord,
        template,
        notes,
        minFret,
        maxFret,
        span,
        playable: playedNotes.length > 0 && !hasInvalidFrets && !violatesConstraintRange,
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

export function resolveVoicingTemplatesForChord(
    entry: ChordRegistryEntry,
    rootPitchClass: number,
    templates: VoicingTemplate[],
    options: ResolveVoicingOptions = {}
): ResolvedVoicing[] {
    const chord = buildChordDefinitionFromRegistryEntry(entry, rootPitchClass);
    const tones = buildChordTonesFromRegistryEntry(entry, rootPitchClass);

    return resolveVoicingTemplates(chord, tones, templates, options);
}
