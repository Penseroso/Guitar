import {
    getCompleteChordWindow,
    getVoicingFamilyLabel,
    getVoicingProvenanceLabel,
    getVoicingTechniqueTag,
    resolveChordRegistryEntry,
    type ConsecutiveStringWindow,
    type ResolvedVoicing,
    type VoicingTechniqueTag,
} from '@/domain/chord';

export interface VoicingPresentationMeta {
    primaryLabel: string;
    secondaryLabel: string | null;
    sourceLabel: string | null;
    familyLabel: string | null;
    techniqueLabel: string | null;
}

const TECHNIQUE_LABELS: Record<VoicingTechniqueTag, string | null> = {
    shell: 'Shell',
    barre: 'Barre',
    open: 'Open',
    standard: null,
};

function getTechniqueLabel(voicing: ResolvedVoicing): string | null {
    return TECHNIQUE_LABELS[getVoicingTechniqueTag(voicing)];
}

function getPlayedNotes(voicing: ResolvedVoicing) {
    return voicing.notes.filter((note) => !note.isMuted);
}

function getPositionLabel(voicing: ResolvedVoicing): string {
    if (voicing.minFret === 0 || getPlayedNotes(voicing).some((note) => note.fret === 0)) {
        return 'open';
    }

    return `${voicing.rootFret ?? voicing.minFret}fr`;
}

function getCompactFamilyLabel(voicing: ResolvedVoicing): string | null {
    const family = voicing.descriptor.family;

    if (family === 'upper-register') {
        return 'high';
    }

    return getVoicingFamilyLabel(family).toLowerCase();
}

function getRootStringPrimaryLabel(voicing: ResolvedVoicing): string | null {
    const rootString = voicing.descriptor.rootString;

    if (rootString === 5 || rootString === 4 || rootString === 3) {
        return `${rootString + 1}th-string root`;
    }

    return null;
}

function getBassDegree(voicing: ResolvedVoicing): string | undefined {
    return [...getPlayedNotes(voicing)]
        .sort((left, right) => (left.midiNote ?? 0) - (right.midiNote ?? 0))[0]
        ?.degree;
}

/**
 * A window naming a size a player recognizes ("Triad" for 3, "Quad" for 4). Not hardcoded as two
 * separate cases — see getCompleteChordWindow below, which computes the size generically as
 * "however many distinct tones this chord's own formula has." Sizes without a common name (5+)
 * fall back to a plain "N-string" label rather than going unnamed.
 */
const COMPLETE_WINDOW_SIZE_NAMES: Record<number, string> = {
    3: 'Triad',
    4: 'Quad',
};

export function getCompleteChordWindowName(size: number): string {
    return COMPLETE_WINDOW_SIZE_NAMES[size] ?? `${size}-string`;
}

const INVERSION_POSITION_LABELS = ['Root', '1st inv', '2nd inv', '3rd inv', '4th inv', '5th inv'];

/** Position index comes from the chord's own formula order (root, third, fifth, seventh, ...),
 *  not from matchedRequiredDegrees alone — the bass note completing a 3-string window is often
 *  an *optional* tone (e.g. a bare major triad's 5th isn't in deriveRequiredDegrees' required
 *  set, but is still exactly the tone that completes the plain-triad shape and can legitimately
 *  sit in the bass as its "2nd inversion"). Required-only order happens to match formula order
 *  for every chord currently in the registry, but isn't guaranteed to in general, so this reads
 *  the real formula order directly instead of relying on that coincidence. */
function getWindowPositionLabel(voicing: ResolvedVoicing): string | null {
    const bassDegree = getBassDegree(voicing);
    if (bassDegree === undefined) {
        return null;
    }

    const entry = resolveChordRegistryEntry(voicing.chord.id);
    const positionIndex = entry.formula.degrees.indexOf(bassDegree);
    return INVERSION_POSITION_LABELS[positionIndex] ?? null;
}

function getConsecutiveWindowPrimaryLabel(voicing: ResolvedVoicing): string | null {
    const window = getCompleteChordWindow(voicing);
    if (!window) {
        return null;
    }

    const positionLabel = getWindowPositionLabel(voicing);
    return positionLabel ? `${getCompleteChordWindowName(window.size)} · ${positionLabel}` : null;
}

/** "top strings" reads naturally only when the window actually starts at string 1 (index 0) —
 *  otherwise name the strings involved (1-indexed, matching how players count strings). */
function getConsecutiveWindowSecondaryLabel(window: ConsecutiveStringWindow): string {
    if (window.startString === 0) {
        return 'top strings';
    }

    const endString = window.startString + window.size - 1;
    return `strings ${window.startString + 1}-${endString + 1}`;
}

function getPrimaryLabel(voicing: ResolvedVoicing): string {
    if (voicing.descriptor.inversion === 'slash-bass') {
        return 'Slash bass';
    }

    if (voicing.descriptor.inversion === 'rootless' || !voicing.descriptor.hasRoot) {
        return 'Rootless';
    }

    const windowLabel = getConsecutiveWindowPrimaryLabel(voicing);
    if (windowLabel) {
        return windowLabel;
    }

    if (voicing.minFret === 0 || getPlayedNotes(voicing).some((note) => note.fret === 0)) {
        return 'Open';
    }

    return getRootStringPrimaryLabel(voicing) ?? 'Position voicing';
}

function getSecondaryLabel(voicing: ResolvedVoicing): string | null {
    const positionLabel = getPositionLabel(voicing);
    const compactFamilyLabel = getCompactFamilyLabel(voicing);

    if (voicing.descriptor.inversion === 'slash-bass') {
        return [positionLabel, compactFamilyLabel].filter(Boolean).join(' · ');
    }

    if (voicing.descriptor.inversion === 'rootless' || !voicing.descriptor.hasRoot) {
        return [positionLabel, 'root omitted'].filter(Boolean).join(' · ');
    }

    const completeWindow = getCompleteChordWindow(voicing);
    if (completeWindow) {
        return getConsecutiveWindowSecondaryLabel(completeWindow);
    }

    if (positionLabel === 'open') {
        return [positionLabel, compactFamilyLabel].filter(Boolean).join(' · ');
    }

    return [positionLabel, compactFamilyLabel].filter(Boolean).join(' · ');
}

export function getVoicingPresentationMeta(voicing?: ResolvedVoicing): VoicingPresentationMeta {
    const descriptor = voicing?.descriptor;

    if (!descriptor || !voicing) {
        return {
            primaryLabel: 'Voicing',
            secondaryLabel: null,
            sourceLabel: null,
            familyLabel: null,
            techniqueLabel: null,
        };
    }

    return {
        primaryLabel: getPrimaryLabel(voicing),
        secondaryLabel: getSecondaryLabel(voicing),
        sourceLabel: getVoicingProvenanceLabel(descriptor.provenance),
        familyLabel: null,
        techniqueLabel: getTechniqueLabel(voicing),
    };
}
