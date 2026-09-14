"use client";

import React, { useId } from 'react';
import styles from './chord-ui.module.css';

export interface ChordChoice {
    value: string;
    label: string;
    accessibleLabel?: string;
}

export function ChoiceGroup({ label, value, options, onChange, compact = false, segmented = false, name: fixedName }: {
    label: string; value: string; options: ChordChoice[];
    onChange: (value: string) => void; compact?: boolean;
    /** Renders as a track of equal-weight tabs (same recipe as the shared TabsRail/segmented
     *  toggles Scale uses) instead of a wrapping chip grid. Reserve for true 2–3 option workflow
     *  toggles — chord-quality/tone grids stay chip-style via `compact` alone. */
    segmented?: boolean;
    /** A stable, reusable radio-group name. Omit to keep the default per-mount generated name. */
    name?: string;
}) {
    const generatedName = useId();
    const name = fixedName ?? generatedName;
    return <fieldset className={`${styles.choiceGroup} ${compact ? styles.compactChoices : ''}`}>
        <legend>{label}</legend>
        <div className={`${styles.choices} ${segmented ? styles.segmented : ''}`}>
            {options.map(option => <label key={option.value} className={`${styles.choice} ${segmented ? styles.segmentedChoice : ''}`}>
                <input type="radio" name={name} value={option.value} checked={value === option.value}
                    aria-label={option.accessibleLabel ?? option.label} onChange={() => onChange(option.value)} />
                <span>{option.label}</span>
            </label>)}
        </div>
    </fieldset>;
}
