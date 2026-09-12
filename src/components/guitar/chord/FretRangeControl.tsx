"use client";

import React from 'react';
import styles from './chord-ui.module.css';

export function FretRangeControl({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
    return <fieldset className={styles.rangeControl}>
        <legend>Stopped frets <strong>{min}–{max}</strong></legend>
        <div className={styles.rangeTrack} style={{ '--range-start': `${min / 15 * 100}%`, '--range-end': `${max / 15 * 100}%` } as React.CSSProperties}
            onPointerDown={event => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const fret = Math.max(0, Math.min(15, Math.round((event.clientX - bounds.left) / bounds.width * 15)));
                if (Math.abs(fret - min) <= Math.abs(fret - max)) onChange(Math.min(fret, max), max);
                else onChange(min, Math.max(fret, min));
            }}>
            <input type="range" min={0} max={15} step={1} value={min} aria-label="Min stopped fret" aria-valuetext={`${min} fret minimum`}
                onChange={event => onChange(Math.min(Number(event.target.value), max), max)} />
            <input type="range" min={0} max={15} step={1} value={max} aria-label="Max stopped fret" aria-valuetext={`${max} fret maximum`}
                onChange={event => onChange(min, Math.max(Number(event.target.value), min))} />
        </div>
        <div className={styles.row} aria-hidden="true"><span>0</span><span>5</span><span>10</span><span>15</span></div>
        <p className={styles.small}>Open strings are controlled separately.</p>
    </fieldset>;
}
