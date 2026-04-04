import type { ChordTones } from './types';
import type {
    GuitarStringIndex,
    PitchClass,
    ResolvedVoicingNote,
    VoicingDescriptor,
    VoicingFamily,
    VoicingProvenance,
    VoicingRegisterBand,
    VoicingTemplate,
} from './types';

function toTitleCase(value: string): string {
    return value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getTemplateProvenance(template?: VoicingTemplate): VoicingProvenance {
    const sourceKind = template?.source === 'legacy-shape'
        ? 'legacy-import'
        : template?.source === 'curated'
            ? 'curated'
            : 'generated';

    return {
        sourceKind,
        seedId: template?.id,
        debugLabel: template?.label,
    };
}

function getPitchClassSet(notes: ResolvedVoicingNote[]): PitchClass[] {
    return Array.from(new Set(
        notes
            .filter((note) => !note.isMuted)
            .map((note) => note.pitchClass)
    ));
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

    if (!hasRoot) {
        return 'rootless';
    }

    if (registerBand === 'upper' && noteCount <= 4) {
        return 'upper-register';
    }

    const upperStringBias = playedStrings.length > 0 && playedStrings.every((string) => string <= 3);
    if (upperStringBias && noteCount <= 4) {
        return 'upper-register';
    }

    if (noteCount >= 5 && optionalCoverageDegrees.length > 0) {
        return 'full';
    }

    if (noteCount <= 4 && matchedRequiredDegrees.length >= 3 && optionalCoverageDegrees.length === 0) {
        return 'shell';
    }

    if (span <= 3 && noteCount <= 4) {
        return 'compact';
    }

    if (span <= 4 && noteCount <= 4) {
        return 'close';
    }

    if (span >= 5 || playedStrings.length >= 5) {
        return 'spread';
    }

    return noteCount >= 5 ? 'full' : 'compact';
}

export function deriveVoicingDescriptor(args: {
    chordId: string;
    rootPitchClass: PitchClass;
    slashBassPitchClass?: PitchClass;
    notes: ResolvedVoicingNote[];
    tones: ChordTones;
    template?: VoicingTemplate;
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
        provenance: getTemplateProvenance(args.template),
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

    if (descriptor.rootString !== undefined) {
        return `${descriptor.rootString + 1}th-string root`;
    }

    if (descriptor.inversion === 'slash-bass') {
        return 'Slash-bass voicing';
    }

    return `${descriptor.noteCount}-note voicing`;
}

export function getVoicingDisplaySubtitle(descriptor: VoicingDescriptor): string | null {
    const familyLabel = getVoicingFamilyLabel(descriptor.family);

    if (descriptor.inversion === 'slash-bass') {
        return `${familyLabel} · slash bass`;
    }

    if (descriptor.inversion === 'rootless') {
        return `${familyLabel} · no root`;
    }

    return familyLabel;
}
