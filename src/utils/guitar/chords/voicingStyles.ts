import { deriveRequiredDegrees } from './degreeRequirements';
import type { ChordRegistryEntry } from './registry';

export type VoicingPosition = 'close' | 'drop-2' | 'drop-3' | 'shell' | 'spread';

export interface VoicingStyleSpec {
    position: VoicingPosition;
    omitDegrees?: string[];
    maxHandSpanMm?: number;
    allowThumbOnLowE?: boolean;
}

export interface TargetVoicingNote {
    degree: string;
    pitchClass: number; // 0-11, relative to the chord root
    order: number; // ascending voice order (lowest = 0) — comparative only, not a real interval
}

/**
 * Builds the "close position" stack for a chord: its tones (minus anything omitted by style),
 * ordered so each subsequent voice's interval is strictly higher than the last — wrapping up an
 * octave whenever the raw formula interval would otherwise fall at or below the previous voice.
 */
function buildCloseStack(entry: ChordRegistryEntry, omitDegrees: Set<string>): TargetVoicingNote[] {
    const includedDegrees = entry.formula.degrees
        .map((degree, index) => ({ degree, interval: entry.formula.intervals[index] }))
        .filter(({ degree }) => !omitDegrees.has(degree))
        .sort((a, b) => a.interval - b.interval);

    const stack: TargetVoicingNote[] = [];
    let previousOffset = -1;

    for (const { degree, interval } of includedDegrees) {
        let offset = interval;
        while (offset <= previousOffset) {
            offset += 12;
        }
        stack.push({ degree, pitchClass: interval, order: offset });
        previousOffset = offset;
    }

    return stack;
}

/** Moves the voice at `indexFromTop` (0 = highest) down an octave, then re-sorts ascending. */
function dropVoice(stack: TargetVoicingNote[], indexFromTop: number): TargetVoicingNote[] {
    if (stack.length <= indexFromTop) {
        return stack;
    }

    const targetIndex = stack.length - 1 - indexFromTop;
    const dropped = stack.map((note, index) =>
        index === targetIndex ? { ...note, order: note.order - 12 } : note
    );

    return [...dropped].sort((a, b) => a.order - b.order);
}

/**
 * Builds the ordered target note sequence a voicing search should try to place on the
 * fretboard for a given chord + style. Required-degree filtering, drop-voicing octave
 * transforms, and shell/omit filtering are all expressed here as transforms over the same
 * close-position stack — no chord-type-specific authoring needed.
 */
export function buildTargetVoicingNotes(entry: ChordRegistryEntry, style: VoicingStyleSpec): TargetVoicingNote[] {
    const omitDegrees = new Set(style.omitDegrees ?? []);

    if (style.position === 'shell') {
        const requiredDegrees = new Set(deriveRequiredDegrees(entry));
        for (const degree of entry.formula.degrees) {
            if (!requiredDegrees.has(degree)) {
                omitDegrees.add(degree);
            }
        }
    }

    const closeStack = buildCloseStack(entry, omitDegrees);

    if (style.position === 'drop-2') {
        return dropVoice(closeStack, 1);
    }

    if (style.position === 'drop-3') {
        return dropVoice(closeStack, 2);
    }

    // 'close', 'shell' (already filtered above), and 'spread' (string-choice handles the
    // spread at the search stage, not the pitch stack) all use the close stack as-is.
    return closeStack;
}
