import { PROGRESSION_LIBRARY } from '../theory';
import { getNoteName } from '../logic';
import { resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { HarmonicTonalContext } from './related-scales';
import { interpretChordAgainstTonalCenter, type HarmonicFunctionInterpretation } from './functional-interpretation';

export type HarmonicRoleLabel =
    | 'Tonic Center'
    | 'Modal Center'
    | 'Pre-Dominant Motion'
    | 'Dominant Tension'
    | 'Borrowed Color'
    | 'Suspended Color'
    | 'Symmetric Tension'
    | 'Open Power Color';

export interface ProgressionHandoffPayload {
    hintId: string;
    title: string;
    summary: string;
    degrees: string[];
    chordType: string;
    selectedKey: number;
    chordRootPitchClass?: number;
    tonicPitchClass?: number;
    relativeDegree?: string;
    roleLabel?: string;
    progressionId?: string;
}

export interface ChordProgressionHint {
    id: string;
    title: string;
    category: 'resolution' | 'setup' | 'color';
    summary: string;
    degrees: string[];
    progressionId?: string;
    handoff: ProgressionHandoffPayload;
}

export interface ChordProgressionContext {
    role: HarmonicRoleLabel;
    summary: string;
    relativeDegree: string;
    interpretation: HarmonicFunctionInterpretation;
    hints: ChordProgressionHint[];
}

const PROGRESSION_BY_ID = Object.fromEntries(PROGRESSION_LIBRARY.map((progression) => [progression.id, progression]));

function mapRoleLabel(interpretation: HarmonicFunctionInterpretation): HarmonicRoleLabel {
    switch (interpretation.harmonyKind) {
        case 'tonic':
            return 'Tonic Center';
        case 'modal-center':
            return 'Modal Center';
        case 'predominant':
            return 'Pre-Dominant Motion';
        case 'dominant':
            return 'Dominant Tension';
        case 'borrowed':
            return 'Borrowed Color';
        case 'suspension':
            return 'Suspended Color';
        case 'open':
            return 'Open Power Color';
        default:
            return 'Symmetric Tension';
    }
}

function buildHint(
    entry: ChordRegistryEntry,
    chordRootPitchClass: number,
    tonicPitchClass: number,
    interpretation: HarmonicFunctionInterpretation,
    config: Omit<ChordProgressionHint, 'handoff'>
): ChordProgressionHint {
    return {
        ...config,
        handoff: {
            hintId: config.id,
            title: config.title,
            summary: config.summary,
            degrees: config.degrees,
            chordType: entry.id,
            selectedKey: tonicPitchClass,
            chordRootPitchClass,
            tonicPitchClass,
            relativeDegree: interpretation.relativeDegree,
            roleLabel: interpretation.roleLabel,
            progressionId: config.progressionId,
        },
    };
}

export function getProgressionLinksForChord(
    entryInput: string | ChordRegistryEntry,
    chordRootPitchClass: number,
    tonalContext?: HarmonicTonalContext
): ChordProgressionContext {
    const entry = resolveChordRegistryEntry(entryInput);
    const tonicPitchClass = tonalContext?.tonicPitchClass ?? tonalContext?.selectedKey ?? 0;
    const interpretation = interpretChordAgainstTonalCenter(entry, chordRootPitchClass, {
        selectedKey: tonicPitchClass,
        tonicPitchClass,
        scaleGroup: tonalContext?.scaleGroup ?? 'Diatonic Modes',
        scaleName: tonalContext?.scaleName ?? 'Ionian',
    });
    const tonicTarget = getNoteName(tonicPitchClass);
    const backTarget = getNoteName((tonicPitchClass + 10) % 12);

    let hints: ChordProgressionHint[];

    switch (interpretation.harmonyKind) {
        case 'dominant':
            hints = [
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'dominant-resolution',
                    title: `Resolve ${interpretation.relativeDegree} into ${tonicTarget}`,
                    category: 'resolution',
                    summary: `${entry.displayName} is acting as a cadential dominant against tonic ${tonicTarget}, so direct resolution should be the default reading.`,
                    degrees: ['V', 'I'],
                }),
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'dominant-ii-v-i',
                    title: PROGRESSION_BY_ID['classic-251'].title,
                    category: 'setup',
                    summary: `${PROGRESSION_BY_ID['classic-251'].description} Here the current chord occupies the dominant slot in that cadence.`,
                    degrees: PROGRESSION_BY_ID['classic-251'].degrees,
                    progressionId: 'classic-251',
                }),
            ];
            break;

        case 'predominant':
            hints = [
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'predominant-cadence',
                    title: `Move ${interpretation.relativeDegree} toward dominant`,
                    category: 'resolution',
                    summary: `${entry.displayName} is reading as a setup sonority relative to ${tonicTarget}, so the next harmonic target should usually intensify toward V.`,
                    degrees: ['ii', 'V', 'I'],
                }),
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'classic-251',
                    title: PROGRESSION_BY_ID['classic-251'].title,
                    category: 'setup',
                    summary: PROGRESSION_BY_ID['classic-251'].description,
                    degrees: PROGRESSION_BY_ID['classic-251'].degrees,
                    progressionId: 'classic-251',
                }),
            ];
            break;

        case 'borrowed':
            hints = [
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'borrowed-return',
                    title: `Return borrowed color back to ${tonicTarget}`,
                    category: 'color',
                    summary: `${entry.displayName} is being heard as borrowed color against tonic ${tonicTarget}, so the most useful move is often to return to the home collection after the color hit.`,
                    degrees: [interpretation.relativeDegree, 'V', 'I'],
                }),
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'backdoor-color',
                    title: `Side-step through ${backTarget}`,
                    category: 'color',
                    summary: 'Use the borrowed sonority as a side-door color rather than forcing a strict cadential role immediately.',
                    degrees: [interpretation.relativeDegree, 'bVII', 'I'],
                }),
            ];
            break;

        case 'modal-center':
            hints = [
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'modal-vamp',
                    title: `Treat ${interpretation.relativeDegree} as the modal center`,
                    category: 'color',
                    summary: `${entry.displayName} is functioning as the center of the current tonal frame, so a vamp or orbiting loop is more natural than a forced cadence.`,
                    degrees: [interpretation.relativeDegree, 'bVII', interpretation.relativeDegree],
                }),
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'modal-exit',
                    title: 'Add a cadential exit when needed',
                    category: 'setup',
                    summary: 'Keep the modal center active, then add a dominant exit only when the phrase needs stronger closure.',
                    degrees: [interpretation.relativeDegree, 'V', 'I'],
                }),
            ];
            break;

        case 'suspension':
            hints = [
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'sus-release',
                    title: 'Release the suspension later in the phrase',
                    category: 'resolution',
                    summary: 'Let the suspension function as tension first, then reveal the third after the phrase earns the release.',
                    degrees: ['sus', '7', 'I'],
                }),
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'sus-vamp',
                    title: 'Keep it as a suspended vamp',
                    category: 'color',
                    summary: 'Use the suspended sonority as a modal color pedal instead of collapsing it into immediate major/minor function.',
                    degrees: ['sus', 'bVII', 'sus'],
                }),
            ];
            break;

        case 'open':
            hints = [
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'power-riff',
                    title: 'Use it as a riff anchor',
                    category: 'color',
                    summary: 'Treat the open fifth as a tonal anchor while surrounding lines define the exact color above it.',
                    degrees: ['5', 'bVII', 'IV', '5'],
                }),
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'rock-four-chords',
                    title: PROGRESSION_BY_ID['pop-punk'].title,
                    category: 'setup',
                    summary: PROGRESSION_BY_ID['pop-punk'].description,
                    degrees: PROGRESSION_BY_ID['pop-punk'].degrees,
                    progressionId: 'pop-punk',
                }),
            ];
            break;

        default:
            hints = [
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'tonic-arrival',
                    title: `Stabilize around tonic ${tonicTarget}`,
                    category: 'resolution',
                    summary: `${entry.displayName} is reading as a point of rest relative to ${tonicTarget}, so surrounding motion should support arrival rather than override it.`,
                    degrees: ['V', 'I'],
                }),
                buildHint(entry, chordRootPitchClass, tonicPitchClass, interpretation, {
                    id: 'classic-pop-cycle',
                    title: PROGRESSION_BY_ID['pop-punk'].title,
                    category: 'color',
                    summary: PROGRESSION_BY_ID['pop-punk'].description,
                    degrees: PROGRESSION_BY_ID['pop-punk'].degrees,
                    progressionId: 'pop-punk',
                }),
            ];
            break;
    }

    return {
        role: mapRoleLabel(interpretation),
        summary: interpretation.summary,
        relativeDegree: interpretation.relativeDegree,
        interpretation,
        hints,
    };
}

