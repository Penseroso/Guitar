"use client";

import React from 'react';
import type { ChordPlayingContext } from '@/domain/chord/exploration';
import { RootDial } from './RootDial';
import { SelectPill } from '../../ui/design-system/SelectPill';
import { TogglePill } from '../../ui/design-system/TogglePill';
import styles from './chord-ui.module.css';

interface Props {
    chordType: string;
    onChordTypeChange: (value: string) => void;
    chordSelectorGroups: { id: string; label: string; options: { id: string; stateValue: string; label: string }[] }[];
    root: number;
    scaleGroup: string;
    scaleName: string;
    onRootChange: (root: number) => void;
    context: ChordPlayingContext;
    onContextChange: (context: ChordPlayingContext) => void;
    explorationPanel: React.ReactNode;
}

export function ChordModeWorkspace({ chordType, onChordTypeChange, chordSelectorGroups, root, onRootChange, scaleGroup, scaleName,
    context, onContextChange, explorationPanel }: Props) {
    return <section className={styles.workspace} aria-label="Chord workspace">
        <div className={styles.inputs}>
            <RootDial value={root} onChange={onRootChange} scaleGroup={scaleGroup} scaleName={scaleName} />
            <div className={styles.inputRow}>
                <div className={styles.field}><span>Chord type</span><SelectPill comfortable label="Chord type" value={chordType}
                    onChange={onChordTypeChange} options={chordSelectorGroups.flatMap(group => group.options.map(option => ({ value: option.stateValue, label: option.label })))} /></div>
            </div>
            <div>
                <TogglePill id="chord-accompaniment" comfortable label="Include accompaniment voicings" isActive={context === 'accompaniment'}
                    onToggle={() => onContextChange(context === 'standalone' ? 'accompaniment' : 'standalone')} />
                {context === 'accompaniment' && <p className={styles.small}>Includes rootless and two-note shapes that rely on accompaniment.</p>}
            </div>
        </div>
        {explorationPanel}
    </section>;
}
