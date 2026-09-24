"use client";

import { useMemo } from 'react';
import { CHORD_REGISTRY, CHORD_REGISTRY_LIST } from '@/domain/chord/registry';
import { getChordTypeLabel } from '@/domain/chord/helpers';
import { resolveChord } from '@/domain/harmony/roman';
import type { ChordRef } from '@/domain/harmony/types';
import { getKeyName, getMinorKeyName } from '@/domain/shared/keys';
import { formatAccidentals, parseNoteName } from '@/domain/shared/spelling';
import { RootDial } from '../chord/RootDial';
import { SwipePicker } from './SwipePicker';
import styles from './harmony-workspace.module.css';

const QUALITY_OPTIONS = CHORD_REGISTRY_LIST.map(entry => ({ value: entry.id, label: formatAccidentals(getChordTypeLabel(entry)) }));

function nameForChordRoot(pitchClass: number, quality: string) {
    const minor = CHORD_REGISTRY[quality]?.formula.degrees.includes('b3');
    return minor ? getMinorKeyName(pitchClass) : getKeyName(pitchClass);
}

export function HarmonyChordFields({ label, value, onChange, optional = false, allowBass = false, defaultQuality = 'major' }: {
    label: string;
    value?: ChordRef;
    onChange: (chord: ChordRef | undefined) => void;
    optional?: boolean;
    allowBass?: boolean;
    defaultQuality?: string;
}) {
    const rootPitchClass = parseNoteName(value?.root ?? 'C')?.pitchClass ?? 0;
    const bassChoices = useMemo(() => {
        if (!allowBass || !value) return [];
        let names: string[];
        try { names = [...new Set(resolveChord({ root: value.root, chordId: value.chordId }).tones.map(tone => tone.name))]; }
        catch { names = [value.root]; }
        if (value.bass && !names.includes(value.bass)) names.push(value.bass);
        return names.map(name => ({ value: name, label: formatAccidentals(name) }));
    }, [allowBass, value]);

    return <div className={styles.chordFields}>
        <div className={styles.chordPrimaryRow}>
            <div className={styles.chordRootRow}>
                <RootDial label={`${label} root`} value={rootPitchClass} displayName={value ? formatAccidentals(value.root) : '+'} onChange={pitchClass => onChange({ root: nameForChordRoot(pitchClass, value?.chordId ?? defaultQuality), chordId: value?.chordId ?? defaultQuality })} />
                {!value && <span className={styles.chooseHint}>Choose chord</span>}
                {optional && value && <button type="button" className={styles.clearChord} onClick={() => onChange(undefined)}>Clear {label.toLowerCase()}</button>}
            </div>
            {value && <SwipePicker label={`${label} quality`} value={value.chordId} options={QUALITY_OPTIONS} onChange={chordId => onChange({ root: value.root, chordId })} />}
        </div>
        {allowBass && value && <SwipePicker label={`${label} bass`} value={value.bass ?? value.root} options={bassChoices} onChange={bass => onChange({ ...value, bass: bass === value.root ? undefined : bass })} />}
    </div>;
}
