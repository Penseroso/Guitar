"use client";

import React from 'react';

import { HarmonyTabs } from './HarmonyTabs';
import styles from './harmony.module.css';
import { ChordsBuiltFromScalePanel } from './ChordsBuiltFromScalePanel';
import { PlayThisScaleOverPanel } from './PlayThisScaleOverPanel';
import { ToneRolesPanel } from '../scale/ToneRolesPanel';
import type { ScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';

interface ScaleHarmonicBridgePanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
    selectedChordId?: string | null;
    onSelectChord?: (id: string | null) => void;
    analysis?: ScaleToneAnalysis | null;
    focusedInterval?: number | null;
    onFocusTone?: (interval: number | null) => void;
}

type BridgeTab = 'play-over' | 'built-from';

const BRIDGE_TABS = [
    { id: 'play-over', label: 'Play this scale over' },
    { id: 'built-from', label: 'Chords built from this scale' },
];

/**
 * The bridge from scale visualization to practical harmony. Two different questions, computed by
 * two independent domain modules and never merged into one list.
 */
export function ScaleHarmonicBridgePanel(props: ScaleHarmonicBridgePanelProps) {
    const [tab, setTab] = React.useState<BridgeTab>('play-over');
    const tabId = React.useId();

    return (
        <div className={styles.bridge}>
            <HarmonyTabs tabs={BRIDGE_TABS as { id: BridgeTab; label: string }[]} active={tab} onChange={setTab} label="Harmony views" idBase={tabId} />
            <div role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${tab}`} className={styles.tabPanel}>
                {tab === 'play-over' ? <>
                    <PlayThisScaleOverPanel {...props} />
                    <ToneRolesPanel analysis={props.analysis ?? null} onClear={() => props.onSelectChord?.(null)} focusedInterval={props.focusedInterval} onFocusTone={props.onFocusTone} />
                </> : <ChordsBuiltFromScalePanel {...props} />}
            </div>
        </div>
    );
}
