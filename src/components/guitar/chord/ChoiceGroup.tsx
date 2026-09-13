"use client";

import React, { useId } from 'react';
import styles from './chord-ui.module.css';

export interface ChordChoice {
    value: string;
    label: string;
    accessibleLabel?: string;
}

export function ChoiceGroup({ label, value, options, onChange, compact = false, name: fixedName }: {
    label: string; value: string; options: ChordChoice[];
    onChange: (value: string) => void; compact?: boolean;
    /** A stable, reusable radio-group name. Omit to keep the default per-mount generated name. */
    name?: string;
}) {
    const generatedName = useId();
    const name = fixedName ?? generatedName;
    return <fieldset className={`${styles.choiceGroup} ${compact ? styles.compactChoices : ''}`}>
        <legend>{label}</legend>
        <div className={styles.choices}>
            {options.map(option => <label key={option.value} className={styles.choice}>
                <input type="radio" name={name} value={option.value} checked={value === option.value}
                    aria-label={option.accessibleLabel ?? option.label} onChange={() => onChange(option.value)} />
                <span>{option.label}</span>
            </label>)}
        </div>
    </fieldset>;
}
