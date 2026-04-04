import { PROGRESSION_LIBRARY } from '../theory';
import { getNoteName } from '../logic';
import { resolveChordRegistryEntry } from './helpers';
import type { ChordRegistryEntry } from './registry';
import type { HarmonicTonalContext } from './related-scales';

export type HarmonicRoleLabel =
    | 'Tonic Center'
    | 'Modal Center'
    | 'Pre-Dominant Motion'
    | 'Dominant Tension'
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
    hints: ChordProgressionHint[];
}

const PROGRESSION_BY_ID = Object.fromEntries(PROGRESSION_LIBRARY.map((progression) => [progression.id, progression]));

function buildHint(
    entry: ChordRegistryEntry,
    selectedKey: number,
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
            selectedKey,
            progressionId: config.progressionId,
        },
    };
}

export function getProgressionLinksForChord(
    entryInput: string | ChordRegistryEntry,
    selectedKey: number,
    tonalContext?: HarmonicTonalContext
): ChordProgressionContext {
    const entry = resolveChordRegistryEntry(entryInput);
    const activeScaleName = tonalContext?.scaleName;
    const tonicTarget = getNoteName((selectedKey + 5) % 12);
    const backTarget = getNoteName((selectedKey + 10) % 12);

    const isModalMinorCenter = ['Dorian', 'Aeolian', 'Jazz Minor', 'Minor Pentatonic', 'Harmonic Minor'].includes(activeScaleName ?? '');
    const isModalMajorCenter = ['Ionian', 'Lydian', 'Major Pentatonic'].includes(activeScaleName ?? '');
    const isMixolydianCenter = activeScaleName === 'Mixolydian';

    switch (entry.id) {
        case 'major':
        case 'major-7':
        case 'major-9':
            return {
                role: isModalMajorCenter && activeScaleName === 'Lydian' ? 'Modal Center' : 'Tonic Center',
                summary: activeScaleName === 'Lydian'
                    ? 'In a Lydian tonal frame this major sonority behaves as the modal home base, so bright color is part of the center rather than a departure from it.'
                    : 'This sonority reads as an arrival point or stable color field. The strongest surrounding motion usually comes from dominant or subdominant preparation.',
                hints: [
                    buildHint(entry, selectedKey, {
                        id: 'dominant-arrival',
                        title: `Resolve from a dominant into ${getNoteName(selectedKey)}`,
                        category: 'resolution',
                        summary: `Treat ${getNoteName(selectedKey)}${entry.symbol} as the landing point after a V-style dominant.`,
                        degrees: ['V', 'I'],
                    }),
                    buildHint(entry, selectedKey, {
                        id: 'classic-pop-cycle',
                        title: PROGRESSION_BY_ID['pop-punk'].title,
                        category: 'color',
                        summary: PROGRESSION_BY_ID['pop-punk'].description,
                        degrees: PROGRESSION_BY_ID['pop-punk'].degrees,
                        progressionId: 'pop-punk',
                    }),
                ],
            };

        case 'minor':
        case 'minor-7':
        case 'minor-9':
            return {
                role: isModalMinorCenter ? 'Modal Center' : 'Pre-Dominant Motion',
                summary: isModalMinorCenter
                    ? `Within ${activeScaleName} this minor sonority can act as the center of gravity, so the workspace now treats it as a modal home chord before reading it as a setup into dominant motion.`
                    : 'Minor quality often behaves as a setup area that can move toward dominant function, or as a tonic substitute in darker loops.',
                hints: [
                    buildHint(entry, selectedKey, {
                        id: 'minor-ii-v-i',
                        title: PROGRESSION_BY_ID['classic-251'].title,
                        category: 'setup',
                        summary: 'Use the minor sonority as a ii-type setup that flows into a dominant and then tonic resolution.',
                        degrees: PROGRESSION_BY_ID['classic-251'].degrees,
                        progressionId: 'classic-251',
                    }),
                    buildHint(entry, selectedKey, {
                        id: 'minor-ballad-loop',
                        title: PROGRESSION_BY_ID['pop-ballad'].title,
                        category: 'color',
                        summary: PROGRESSION_BY_ID['pop-ballad'].description,
                        degrees: PROGRESSION_BY_ID['pop-ballad'].degrees,
                        progressionId: 'pop-ballad',
                    }),
                ],
            };

        case 'dominant-7':
        case 'dominant-9':
        case 'dominant-13':
        case 'hendrix-7-sharp-9':
        case 'dominant-7-flat-9':
            return {
                role: isMixolydianCenter ? 'Modal Center' : 'Dominant Tension',
                summary: isMixolydianCenter
                    ? 'In Mixolydian, the dominant shell can behave like a modal center rather than a pure cadential V chord, so the workspace keeps both vamp and resolution readings available.'
                    : `Dominant harmony wants to move by fourth into ${tonicTarget}. Altered variants intensify that same pull rather than changing the destination logic.`,
                hints: [
                    buildHint(entry, selectedKey, {
                        id: 'dominant-resolution',
                        title: `Resolve toward ${tonicTarget}`,
                        category: 'resolution',
                        summary: `Use this dominant as the tension point before landing on ${tonicTarget} major or minor.`,
                        degrees: ['V', 'I'],
                    }),
                    buildHint(entry, selectedKey, {
                        id: 'dominant-ii-v-i',
                        title: PROGRESSION_BY_ID['classic-251'].title,
                        category: 'setup',
                        summary: `${PROGRESSION_BY_ID['classic-251'].description} This dominant sits in the middle of that chain.`,
                        degrees: PROGRESSION_BY_ID['classic-251'].degrees,
                        progressionId: 'classic-251',
                    }),
                ],
            };

        case 'half-diminished-7':
            return {
                role: 'Pre-Dominant Motion',
                summary: 'Half-diminished color usually points into an altered dominant before resolving into minor tonic territory.',
                hints: [
                    buildHint(entry, selectedKey, {
                        id: 'minor-ii-v-i',
                        title: `Minor iiø-V-i into ${tonicTarget}`,
                        category: 'resolution',
                        summary: 'Treat this as the iiø chord in a minor cadence leading to V7b9 and then i.',
                        degrees: ['iiø', 'V7b9', 'i'],
                    }),
                    buildHint(entry, selectedKey, {
                        id: 'backdoor-color',
                        title: `Side-step through ${backTarget} before resolving`,
                        category: 'color',
                        summary: 'Use the tense half-diminished shell as a color setup before an altered dominant or backdoor motion.',
                        degrees: ['iiø', 'subV7', 'i'],
                    }),
                ],
            };

        case 'diminished-7':
            return {
                role: 'Symmetric Tension',
                summary: 'Fully diminished harmony is best treated as a passing tension device that can slide into dominant or tonic destinations.',
                hints: [
                    buildHint(entry, selectedKey, {
                        id: 'diminished-dominant-link',
                        title: 'Pass into a dominant resolution',
                        category: 'resolution',
                        summary: 'Use the diminished chord as a leading tension shape before a dominant or direct tonic arrival.',
                        degrees: ['dim7', 'V7', 'I'],
                    }),
                ],
            };

        case 'sus4':
        case 'sus2':
            return {
                role: isMixolydianCenter || isModalMinorCenter ? 'Modal Center' : 'Suspended Color',
                summary: isMixolydianCenter || isModalMinorCenter
                    ? 'Within the current tonal frame, the suspension can function as a stable modal sonority instead of only a delayed-resolution device.'
                    : 'Suspended chords create held tension rather than fixed major/minor identity. They are useful as pedals, delayed dominants, or modal vamps.',
                hints: [
                    buildHint(entry, selectedKey, {
                        id: 'sus-release',
                        title: 'Release the suspension into a dominant or tonic',
                        category: 'resolution',
                        summary: 'Keep the suspended note active, then resolve it by introducing the missing third later in the phrase.',
                        degrees: ['sus', '7', 'I'],
                    }),
                    buildHint(entry, selectedKey, {
                        id: 'sus-vamp',
                        title: 'Build a short modal vamp',
                        category: 'color',
                        summary: 'Loop the suspended chord against neighboring modal colors instead of forcing an immediate classical cadence.',
                        degrees: ['sus', 'bVII', 'sus'],
                    }),
                ],
            };

        case 'power-5':
            return {
                role: 'Open Power Color',
                summary: 'Power chords leave the third open, so they are best used as riff anchors that can pivot between major and minor environments later.',
                hints: [
                    buildHint(entry, selectedKey, {
                        id: 'rock-four-chords',
                        title: PROGRESSION_BY_ID['pop-punk'].title,
                        category: 'color',
                        summary: 'Power-chord voicings slot naturally into this loop without committing to full tertian color on every hit.',
                        degrees: PROGRESSION_BY_ID['pop-punk'].degrees,
                        progressionId: 'pop-punk',
                    }),
                    buildHint(entry, selectedKey, {
                        id: 'pedal-riff',
                        title: 'Use as a pedal-tone riff anchor',
                        category: 'setup',
                        summary: 'Repeat the open fifth while the surrounding line supplies the changing harmonic color.',
                        degrees: ['5', 'bVII', 'IV', '5'],
                    }),
                ],
            };

        default:
            return {
                role: 'Tonic Center',
                summary: 'This chord currently falls back to a stable tonic-oriented reading until more specific Stage 7 context is added.',
                hints: [
                    buildHint(entry, selectedKey, {
                        id: 'generic-arrival',
                        title: `Stabilize around ${getNoteName(selectedKey)}`,
                        category: 'resolution',
                        summary: 'Treat the current chord as the anchor point and connect into dominant or subdominant material around it.',
                        degrees: ['I', 'IV', 'V'],
                    }),
                ],
            };
    }
}
