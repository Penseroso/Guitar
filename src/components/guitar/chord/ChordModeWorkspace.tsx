"use client";

import React, { useId, useRef, useState } from 'react';
import { RootDial } from './RootDial';
import { ChoiceGroup } from './ChoiceGroup';
import { formatAccidentals } from '@/domain/shared/spelling';
import styles from './chord-ui.module.css';

interface SelectorGroup {
    id: string;
    label: string;
    options: { id: string; stateValue: string; label: string }[];
}

const familyLabels: Record<string, string> = { triad: 'Basic', seventh: '6 / 7', extended: 'Extended' };
const qualityNames: Record<string, string> = {
    major: 'Major', minor: 'Minor', 'power-5': 'Power chord', augmented: 'Augmented', diminished: 'Diminished',
    sus2: 'Suspended second', sus4: 'Suspended fourth', 'major-6': 'Major sixth', 'major-7': 'Major seventh',
    'minor-7': 'Minor seventh', 'dominant-7': 'Dominant seventh', 'half-diminished-7': 'Half diminished seventh',
    'diminished-7': 'Diminished seventh', 'major-9': 'Major ninth', 'minor-9': 'Minor ninth',
    'dominant-9': 'Dominant ninth', 'dominant-11': 'Dominant eleventh', 'dominant-13': 'Dominant thirteenth',
    'hendrix-7-sharp-9': 'Dominant seventh sharp ninth', 'dominant-7-flat-9': 'Dominant seventh flat ninth',
};

function ChordTypeSelector({ value, groups, onChange }: {
    value: string; groups: SelectorGroup[]; onChange: (value: string) => void;
}) {
    const currentFamily = groups.find(group => group.options.some(option => option.stateValue === value))?.id ?? groups[0]?.id;
    const [browsingFamily, setBrowsingFamily] = useState(currentFamily);
    const [previousValue, setPreviousValue] = useState(value);
    if (previousValue !== value) {
        setPreviousValue(value);
        setBrowsingFamily(currentFamily);
    }
    const active = groups.find(group => group.id === browsingFamily) ?? groups[0];
    const id = useId();
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    return <div className={styles.chordType}>
        <p className={styles.controlLabel}>Chord type <span className={styles.currentQuality}>{qualityNames[value] ?? value}</span></p>
        <div role="tablist" aria-label="Chord family" className={styles.familyTabs}>
            {groups.map((group, index) => <button key={group.id} ref={element => { tabs.current[index] = element; }}
                id={id + '-' + group.id} type="button" role="tab" aria-selected={group.id === active?.id}
                aria-controls={id + '-choices'} tabIndex={group.id === active?.id ? 0 : -1}
                onClick={() => setBrowsingFamily(group.id)} onKeyDown={event => {
                    const next = event.key === 'ArrowRight' ? (index + 1) % groups.length
                        : event.key === 'ArrowLeft' ? (index + groups.length - 1) % groups.length
                            : event.key === 'Home' ? 0 : event.key === 'End' ? groups.length - 1 : null;
                    if (next !== null) { event.preventDefault(); tabs.current[next]?.focus(); }
                }}>{familyLabels[group.id] ?? group.label}</button>)}
        </div>
        {active && <div id={id + '-choices'} role="tabpanel" aria-labelledby={id + '-' + active.id} className={styles.qualityChoices}>
            <ChoiceGroup label="Chord quality" value={value} compact onChange={onChange}
                options={active.options.map(option => ({ value: option.stateValue,
                    label: option.id === 'augmented' ? 'aug' : option.id === 'diminished' ? 'dim'
                        : formatAccidentals(option.label),
                    accessibleLabel: qualityNames[option.id] ?? option.label }))} />
        </div>}
    </div>;
}

export type ChordWorkspaceIntent = 'forward' | 'reverse';

export function ChordModeWorkspace({ intent, onIntentChange, chordType, onChordTypeChange, chordSelectorGroups, root, onRootChange,
    explorationPanel, reversePanel, onExploreHarmony, onReturnToHarmony }: {
    intent: ChordWorkspaceIntent;
    onIntentChange: (intent: ChordWorkspaceIntent) => void;
    chordType: string;
    onChordTypeChange: (value: string) => void;
    chordSelectorGroups: SelectorGroup[];
    root: number;
    onRootChange: (root: number) => void;
    explorationPanel: React.ReactNode;
    reversePanel: React.ReactNode;
    onExploreHarmony?: () => void;
    onReturnToHarmony?: () => void;
}) {
    return <section className={styles.workspace} aria-label="Chord workspace">
        <div className={styles.intentToggle}>
            <ChoiceGroup label="Chord workflow" compact segmented name="chord-mode-intent" value={intent}
                onChange={(value) => onIntentChange(value as ChordWorkspaceIntent)}
                options={[{ value: 'forward', label: 'Find voicings' }, { value: 'reverse', label: 'Name a shape' }]} />
        </div>
        {onReturnToHarmony && <button type="button" className={styles.action} onClick={onReturnToHarmony}>← Return to Harmony</button>}
        {intent === 'forward' ? <>
            <div className={styles.inputs}>
                <RootDial value={root} onChange={onRootChange} />
                <ChordTypeSelector value={chordType} groups={chordSelectorGroups} onChange={onChordTypeChange} />
            </div>
            {explorationPanel}
            {onExploreHarmony && <button type="button" className={styles.action} onClick={onExploreHarmony}>Explore in Harmony →</button>}
        </> : reversePanel}
    </section>;
}
