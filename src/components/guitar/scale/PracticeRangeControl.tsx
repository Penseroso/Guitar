"use client";

import { RotateCcw } from 'lucide-react';
import { FretRangeControl } from '../shared/FretRangeControl';
import styles from './practice-range-control.module.css';

export interface PracticeRangeControlProps {
    fretRange: [number, number];
    visibleStrings: number[];
    onRangeChange: (min: number, max: number) => void;
    onStringsChange: (strings: number[]) => void;
    onReset: () => void;
    hasToneFocus: boolean;
}

const ALL_STRINGS = [0, 1, 2, 3, 4, 5];

export function PracticeRangeControl({ fretRange, visibleStrings, onRangeChange, onStringsChange, onReset, hasToneFocus }: PracticeRangeControlProps) {
    const isDefault = fretRange[0] === 0 && fretRange[1] === 24 && ALL_STRINGS.every(string => visibleStrings.includes(string));
    return <section className={styles.practice} aria-label="Practice range">
        <FretRangeControl min={fretRange[0]} max={fretRange[1]} onChange={onRangeChange}
            maxFret={24} ticks={[0, 12, 24]} helpText={null} compact />
        <div className={styles.options}>
            <fieldset className={styles.strings}>
                <legend>Strings <span>1 is high E</span></legend>
                <div className={styles.stringButtons}>
                    {ALL_STRINGS.map(string => {
                        const selected = visibleStrings.includes(string);
                        return <button key={string} type="button" className={styles.stringButton}
                            aria-label={`String ${string + 1}`} aria-pressed={selected}
                            disabled={selected && visibleStrings.length === 1}
                            onClick={() => onStringsChange(selected
                                ? visibleStrings.filter(item => item !== string)
                                : [...visibleStrings, string].sort((a, b) => a - b))}>
                            {string + 1}<span className={styles.stringMark} aria-hidden="true" />
                        </button>;
                    })}
                </div>
            </fieldset>
            <button type="button" className={styles.reset} aria-label="Reset practice view" title="Reset practice view"
                disabled={isDefault && !hasToneFocus} onClick={onReset}>
                <RotateCcw size={16} aria-hidden="true" />
            </button>
        </div>
    </section>;
}
