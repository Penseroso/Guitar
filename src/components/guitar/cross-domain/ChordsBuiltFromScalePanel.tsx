"use client";

import React from 'react';

import { getScaleHarmonization } from '@/domain/chord/scale-harmonization';
import { getScaleDisplayName } from '@/domain/scale';
import { formatAccidentals } from '@/domain/shared/spelling';
import { HarmonyTabs } from './HarmonyTabs';
import styles from './harmony.module.css';

interface ChordsBuiltFromScalePanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
}

type ChordLength = 'triads' | 'sevenths';

const LENGTH_TABS = [
    { id: 'triads', label: 'Triads' },
    { id: 'sevenths', label: 'Sevenths' },
];

export function ChordsBuiltFromScalePanel({ scaleGroup, scaleName, tonicPitchClass }: ChordsBuiltFromScalePanelProps) {
    const [length, setLength] = React.useState<ChordLength>('triads');
    const tabId = React.useId();
    const harmonization = React.useMemo(
        () => getScaleHarmonization(scaleGroup, scaleName, tonicPitchClass),
        [scaleGroup, scaleName, tonicPitchClass]
    );
    const scaleLabel = getScaleDisplayName(scaleName);

    if (!harmonization.defined) {
        return (
            <p className={styles.meta}>
                Chord-by-chord harmonization in this panel is intentionally scoped to seven-note scales. {scaleLabel} has {harmonization.pitchClassCount} notes, so degree-by-degree chords are not shown here.
            </p>
        );
    }

    const chords = length === 'triads' ? harmonization.triads : harmonization.sevenths;

    return (
        <div className={styles.section}>
            <div className={styles.section}>
                <p className={styles.description}>
                    The chord you get by stacking {scaleLabel} notes in thirds on each scale degree.
                </p>
                <HarmonyTabs tabs={LENGTH_TABS as { id: ChordLength; label: string }[]} active={length} onChange={setLength} label="Chord length" idBase={tabId} />
            </div>

            <div role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${length}`}>
            <ul className={styles.builtList}>
                {chords.map((chord, index) => (
                    <li
                        key={index}
                        className={styles.builtItem}
                    >
                        <span className={styles.builtNumeral}>{chord?.romanNumeral ?? '—'}</span>
                        <span className={styles.builtName}>
                            {chord ? formatAccidentals(`${chord.rootNoteName}${chord.chordSuffix}`) : 'No chord'}
                        </span>
                    </li>
                ))}
            </ul>
            </div>
        </div>
    );
}
