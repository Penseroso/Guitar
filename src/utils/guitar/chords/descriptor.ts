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
    source?: 'legacy-shape' | 'generated' | 'curated';
    seedId?: string;
    debugLabel?: string;
}): VoicingProvenance {
    const sourceKind = args.source === 'legacy-shape'
        ? 'legacy-import'
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
    optionalCoverageDegrees: string[];
    playedStrings: GuitarStringIndex[];
    span: number;
    registerBand: VoicingRegisterBand;
}): VoicingFamily {
    const {
        noteCount,
        hasRoot,
        matchedRequiredDegrees,
        optionalCoverageDegrees,
        playedStrings,
        span,
        registerBand,
    } = args;
    const playedStringSpan = getPlayedStringSpan(playedStrings);
    const requiredCoverageCount = matchedRequiredDegrees.length;
    const upperRegisterGrip = registerBand === 'upper' && noteCount <= 4 && playedStringSpan <= 3;
    const shellLike = noteCount <= 4
        && requiredCoverageCount >= Math.min(3, noteCount)
        && optionalCoverageDegrees.length === 0
        && playedStringSpan <= 3;
    const spreadLike = span >= 5 || playedStringSpan >= 4;
    const compactLike = noteCount <= 4 && span <= 2 && playedStringSpan <= 3;
    const closeLike = noteCount <= 4 && span <= 4 && playedStringSpan <= 3;
    const fullLike = noteCount >= 5
        && requiredCoverageCount >= 3
        && (optionalCoverageDegrees.length > 0 || playedStrings.length >= 5);

    if (!hasRoot) {
        return 'rootless';
    }

    if (upperRegisterGrip) {
        return 'upper-register';
    }

    if (shellLike) {
        return 'shell';
    }

    if (fullLike && !spreadLike) {
        return 'full';
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

    return fullLike ? 'full' : 'close';
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
    const hasRoot = playedNotes.some((note) => note.degree === '1' || note.pitchClass === args.rootPitchClass);
    const registerBand = getRegisterBand(args.minFret, args.maxFret, playedStrings);
    const family = classifyVoicingFamily({
        noteCount: playedNotes.length,
        hasRoot,
        matchedRequiredDegrees,
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
        rootString: hasRoot
            ? (playedNotes.find((note) => note.degree === '1')?.string ?? args.rootString)
            : args.rootString,
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

export function getVoicingProvenanceLabel(provenance: VoicingProvenance): string {
    switch (provenance.sourceKind) {
        case 'legacy-import':
            return 'Legacy import';
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

    if (descriptor.rootString !== undefined) {
        return getRootStringLabel(descriptor.rootString);
    }

    return `${getNoteCountLabel(descriptor.noteCount)} voicing`;
}

export function getVoicingDisplaySubtitle(descriptor: VoicingDescriptor): string | null {
    const parts: string[] = [];

    parts.push(getNoteCountLabel(descriptor.noteCount));

    if (descriptor.family === 'upper-register' && descriptor.rootString !== undefined) {
        parts.push(getRootStringLabel(descriptor.rootString));
    } else if (descriptor.registerBand !== 'mid') {
        parts.push(`${getVoicingRegisterLabel(descriptor.registerBand).toLowerCase()} register`);
    }

    if (descriptor.inversion === 'inversion') {
        parts.push('inversion');
    }

    return parts.length > 0 ? parts.join(' · ') : null;
}
