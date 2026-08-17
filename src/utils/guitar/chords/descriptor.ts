import type { ChordTones } from './types';
import type {
    GuitarStringIndex,
    PitchClass,
    ResolvedVoicingNote,
    VoicingDescriptor,
    VoicingFamily,
    VoicingProvenance,
    VoicingRegisterBand,
} from './types';

function toTitleCase(value: string): string {
    return value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function buildVoicingProvenance(args: {
    source?: 'legacy-shape' | 'generated' | 'archetype-generated' | 'curated';
    seedId?: string;
    debugLabel?: string;
}): VoicingProvenance {
    const sourceKind = args.source === 'legacy-shape'
        ? 'legacy-import'
        : args.source === 'archetype-generated'
            ? 'archetype-generated'
        : args.source === 'curated'
            ? 'curated'
            : 'generated';

    return {
        sourceKind,
        seedId: args.seedId,
        debugLabel: args.debugLabel,
    };
}

function getPitchClassSet(notes: ResolvedVoicingNote[]): PitchClass[] {
    return Array.from(new Set(
        notes
            .filter((note) => !note.isMuted)
            .map((note) => note.pitchClass)
    ));
}

function getRootOccurrences(notes: ResolvedVoicingNote[], rootPitchClass: PitchClass): GuitarStringIndex[] {
    return notes
        .filter((note) => note.degree === '1' || note.pitchClass === rootPitchClass)
        .map((note) => note.string)
        .sort((left, right) => left - right) as GuitarStringIndex[];
}

function getPlayedStringSpan(playedStrings: GuitarStringIndex[]): number {
    if (playedStrings.length === 0) {
        return 0;
    }

    return playedStrings[playedStrings.length - 1] - playedStrings[0];
}

function getRegisterBand(minFret: number, maxFret: number, playedStrings: GuitarStringIndex[]): VoicingRegisterBand {
    if (playedStrings.length > 0 && playedStrings.every((string) => string <= 3)) {
        return 'upper';
    }

    if (maxFret <= 4) {
        return 'low';
    }

    if (maxFret <= 9) {
        return 'mid';
    }

    return 'high';
}

function classifyVoicingFamily(args: {
    noteCount: number;
    hasRoot: boolean;
    matchedRequiredDegrees: string[];
    missingRequiredDegrees: string[];
    optionalCoverageDegrees: string[];
    playedStrings: GuitarStringIndex[];
    span: number;
    registerBand: VoicingRegisterBand;
}): VoicingFamily {
    const {
        noteCount,
        hasRoot,
        matchedRequiredDegrees,
        missingRequiredDegrees,
        optionalCoverageDegrees,
        playedStrings,
        span,
        registerBand,
    } = args;
    const playedStringSpan = getPlayedStringSpan(playedStrings);
    // Degree-coverage-based, not a fixed magic number — chords vary in how many degrees are
    // actually required (2 for a plain triad/sus chord, 3 for a seventh chord, 4 for an altered
    // chord), so "required coverage" has to be measured against each chord's own total.
    const coversAllRequired = missingRequiredDegrees.length === 0;
    const totalRequiredDegrees = matchedRequiredDegrees.length + missingRequiredDegrees.length;
    // Guide-tone/shell voicing: every required degree present, nothing else — allow one
    // duplicated tone (e.g. a doubled root) since that doesn't add harmonic content.
    const shellLike = hasRoot
        && coversAllRequired
        && optionalCoverageDegrees.length === 0
        && noteCount <= totalRequiredDegrees + 1
        && playedStringSpan <= 3;
    const upperRegisterGrip = registerBand === 'upper' && noteCount <= 4 && playedStringSpan <= 3;
    const compactLike = noteCount <= 4 && span <= 2 && playedStringSpan <= 3;
    const closeLike = noteCount <= 4 && span <= 4 && playedStringSpan <= 3;
    // Full voicing: covers every required degree plus color tones and/or duplication across at
    // least 5 strings — e.g. a full 6-string open/barre triad with the root and 5th doubled.
    const fullLike = hasRoot
        && coversAllRequired
        && noteCount >= 5
        && (optionalCoverageDegrees.length > 0 || noteCount > totalRequiredDegrees)
        && playedStrings.length >= 5;
    // A wide *string* span from duplicating tones across all six strings (a full open/barre
    // chord) isn't the same thing as a wide *fret* span (a genuine drop-2/drop-3 spread voicing)
    // — fullLike already claims the former, so spreadLike only needs to catch the latter.
    const spreadLike = !fullLike && (span >= 5 || playedStringSpan >= 4);

    if (!hasRoot) {
        return 'rootless';
    }

    if (shellLike) {
        return 'shell';
    }

    if (fullLike) {
        return 'full';
    }

    if (upperRegisterGrip) {
        return 'upper-register';
    }

    if (compactLike) {
        return 'compact';
    }

    if (closeLike) {
        return 'close';
    }

    if (spreadLike) {
        return 'spread';
    }

    return 'close';
}

export function deriveVoicingDescriptor(args: {
    chordId: string;
    rootPitchClass: PitchClass;
    slashBassPitchClass?: PitchClass;
    notes: ResolvedVoicingNote[];
    tones: ChordTones;
    provenance: VoicingProvenance;
    rootString?: GuitarStringIndex;
    span: number;
    minFret: number;
    maxFret: number;
    lowestPlayedPitchClass?: PitchClass;
    satisfiesSlashBass?: boolean;
}): VoicingDescriptor {
    const playedNotes = args.notes.filter((note) => !note.isMuted);
    const rootOccurrences = getRootOccurrences(playedNotes, args.rootPitchClass);
    const playedStrings = playedNotes
        .map((note) => note.string)
        .sort((left, right) => left - right) as GuitarStringIndex[];
    const matchedRequiredDegrees = args.tones.tones
        .filter((tone) => tone.isRequired)
        .map((tone) => tone.degree)
        .filter((degree) => playedNotes.some((note) => note.degree === degree));
    const missingRequiredDegrees = args.tones.tones
        .filter((tone) => tone.isRequired)
        .map((tone) => tone.degree)
        .filter((degree) => !playedNotes.some((note) => note.degree === degree));
    const optionalCoverageDegrees = args.tones.tones
        .filter((tone) => !tone.isRequired)
        .map((tone) => tone.degree)
        .filter((degree) => playedNotes.some((note) => note.degree === degree));
    const omittedOptionalDegrees = args.tones.tones
        .filter((tone) => !tone.isRequired)
        .map((tone) => tone.degree)
        .filter((degree) => !playedNotes.some((note) => note.degree === degree));
    const topVoice = [...playedNotes].sort((left, right) => (right.midiNote ?? 0) - (left.midiNote ?? 0))[0];
    const lowestVoice = [...playedNotes].sort((left, right) => (left.midiNote ?? 0) - (right.midiNote ?? 0))[0];
    const hasRoot = rootOccurrences.length > 0;
    const registerBand = getRegisterBand(args.minFret, args.maxFret, playedStrings);
    const family = classifyVoicingFamily({
        noteCount: playedNotes.length,
        hasRoot,
        matchedRequiredDegrees,
        missingRequiredDegrees,
        optionalCoverageDegrees,
        playedStrings,
        span: args.span,
        registerBand,
    });
    const inversion = !hasRoot
        ? 'rootless'
        : args.slashBassPitchClass !== undefined
            ? (args.satisfiesSlashBass ? 'slash-bass' : 'inversion')
            : lowestVoice?.pitchClass === args.rootPitchClass
                ? 'root-position'
                : 'inversion';

    return {
        chordId: args.chordId,
        rootPitchClass: args.rootPitchClass,
        slashBassPitchClass: args.slashBassPitchClass,
        playedStrings,
        noteCount: playedNotes.length,
        rootOccurrences,
        rootOccurrenceCount: rootOccurrences.length,
        lowestRootString: rootOccurrences[0],
        highestRootString: rootOccurrences[rootOccurrences.length - 1],
        hasDuplicatedRoot: rootOccurrences.length > 1,
        rootString: rootOccurrences[0] ?? args.rootString,
        lowestPlayedString: lowestVoice?.string,
        highestPlayedString: topVoice?.string,
        lowestPlayedPitchClass: args.lowestPlayedPitchClass,
        highestPlayedPitchClass: topVoice?.pitchClass,
        topVoicePitchClass: topVoice?.pitchClass,
        bassPitchClass: lowestVoice?.pitchClass,
        playedPitchClasses: getPitchClassSet(playedNotes),
        matchedRequiredDegrees,
        missingRequiredDegrees,
        optionalCoverageDegrees,
        omittedOptionalDegrees,
        registerBand,
        family,
        inversion,
        hasRoot,
        satisfiesSlashBass: args.satisfiesSlashBass,
        provenance: args.provenance,
    };
}

export function getVoicingFamilyLabel(family: VoicingFamily): string {
    if (family === 'upper-register') {
        return 'Upper register';
    }

    return toTitleCase(family);
}

export function getVoicingRegisterLabel(registerBand: VoicingRegisterBand): string {
    return toTitleCase(registerBand);
}

function getRootStringLabel(rootString: GuitarStringIndex): string {
    return `${rootString + 1}th-string root`;
}

function getNoteCountLabel(noteCount: number): string {
    return `${noteCount}-note`;
}

function getRootDistributionLabel(descriptor: VoicingDescriptor): string | null {
    if (descriptor.rootOccurrenceCount === 0) {
        return null;
    }

    if (descriptor.hasDuplicatedRoot) {
        return `${descriptor.rootOccurrenceCount} roots`;
    }

    if (descriptor.rootString !== undefined) {
        return getRootStringLabel(descriptor.rootString);
    }

    return null;
}

export function getVoicingProvenanceLabel(provenance: VoicingProvenance): string {
    switch (provenance.sourceKind) {
        case 'legacy-import':
            return 'Legacy import';
        case 'archetype-generated':
            return 'Archetype generated';
        case 'curated':
            return 'Curated';
        default:
            return 'Generated';
    }
}

export function getVoicingDisplayName(descriptor: VoicingDescriptor): string {
    if (descriptor.inversion === 'rootless') {
        return 'Rootless voicing';
    }

    if (descriptor.inversion === 'slash-bass') {
        return 'Slash-bass voicing';
    }

    if (descriptor.family === 'upper-register') {
        return 'Upper-register voicing';
    }

    if (descriptor.hasDuplicatedRoot) {
        return 'Duplicated-root voicing';
    }

    return `${getNoteCountLabel(descriptor.noteCount)} voicing`;
}

export function getVoicingDisplaySubtitle(descriptor: VoicingDescriptor): string | null {
    const parts: string[] = [];

    parts.push(getNoteCountLabel(descriptor.noteCount));

    const rootDistributionLabel = getRootDistributionLabel(descriptor);
    if (rootDistributionLabel) {
        parts.push(rootDistributionLabel);
    }

    if (descriptor.registerBand !== 'mid' && descriptor.family !== 'upper-register') {
        parts.push(`${getVoicingRegisterLabel(descriptor.registerBand).toLowerCase()} register`);
    }

    if (descriptor.inversion === 'inversion') {
        parts.push('inversion');
    }

    return parts.length > 0 ? parts.join(' · ') : null;
}
