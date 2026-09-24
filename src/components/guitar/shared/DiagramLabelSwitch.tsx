"use client";

import React from 'react';
import styles from './diagram-label-switch.module.css';

export function DiagramLabelSwitch({ showIntervals, onToggle, caption }: {
    showIntervals: boolean;
    onToggle: () => void;
    caption?: string;
}) {
    return <div className={styles.group}>
        {caption && <span className={styles.caption}>{caption}</span>}
        <label className={styles.control} data-intervals={showIntervals}>
            <input type="checkbox" role="switch" aria-label="Show intervals instead of notes" checked={showIntervals} onChange={onToggle} />
            <span className={styles.option} aria-hidden="true">Notes</span>
            <span className={styles.track} aria-hidden="true"><span className={styles.thumb} /></span>
            <span className={styles.option} aria-hidden="true">Intervals</span>
        </label>
    </div>;
}
