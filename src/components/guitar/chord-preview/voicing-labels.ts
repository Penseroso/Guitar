import type { VoicingTemplate } from '../../../utils/guitar/chords';

export interface VoicingPresentationMeta {
    primaryLabel: string;
    secondaryLabel: string | null;
    sourceLabel: string | null;
    familyLabel: string | null;
}

function buildPrimaryLabel(template?: VoicingTemplate): string {
    if (template?.rootString !== undefined) {
        return `${template.rootString + 1}th-string root`;
    }

    const rootMatch = template?.label.match(/Root\s+(\d)/i);
    if (rootMatch) {
        return `${rootMatch[1]}th-string root`;
    }

    return 'Rooted voicing';
}

function normalizeSecondaryLabel(rawSecondaryLabel: string): string {
    const normalized = rawSecondaryLabel.trim();
    if (!normalized) {
        return normalized;
    }

    if (/shape/i.test(normalized)) {
        return normalized.replace(/\s*Shape/i, '-shape family');
    }

    if (/^Drop\s+2$/i.test(normalized)) {
        return 'Drop-2';
    }

    if (/^Drop\s+3$/i.test(normalized)) {
        return 'Drop-3';
    }

    return normalized;
}

export function getVoicingPresentationMeta(template?: VoicingTemplate): VoicingPresentationMeta {
    const primaryLabel = buildPrimaryLabel(template);
    const rawSecondaryLabel = template?.label.match(/\(([^)]+)\)/)?.[1] ?? '';
    const secondaryLabel = rawSecondaryLabel ? normalizeSecondaryLabel(rawSecondaryLabel) : null;
    const sourceLabel = template?.source === 'legacy-shape'
        ? 'Legacy shape'
        : template?.source === 'generated'
            ? 'Generated'
            : template?.source === 'curated'
                ? 'Curated'
                : null;
    const familyLabel = template?.tags?.includes('generated-shell')
        ? 'Shell'
        : template?.tags?.includes('generated-compact')
            ? 'Compact'
            : template?.tags?.includes('generated-upper-register')
                ? 'Upper register'
                : secondaryLabel;

    return {
        primaryLabel,
        secondaryLabel,
        sourceLabel,
        familyLabel,
    };
}
