"use client";

import React, { useRef, useState } from 'react';
import styles from './fret-range-control.module.css';

type Handle = 'min' | 'max';
type Range = readonly [number, number];

export interface FretRangeControlProps {
    min: number;
    max: number;
    onChange: (min: number, max: number) => void;
    maxFret?: number;
    ticks?: readonly number[];
    helpText?: string | null;
    compact?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function FretRangeControl({
    min, max, onChange, maxFret = 15, ticks = [0, 5, 10, 15],
    helpText = 'Applies to fretted notes. Open strings use their own filter.', compact = false,
}: FretRangeControlProps) {
    const handles = useRef<Record<Handle, HTMLButtonElement | null>>({ min: null, max: null });
    const [preview, setPreview] = useState<Range | null>(null);
    const drag = useRef<{ id: number; x: number; width: number; min: number; max: number; handle: Handle | null; pending: Range } | null>(null);
    const shownMin = preview?.[0] ?? min;
    const shownMax = preview?.[1] ?? max;
    const update = (handle: Handle, value: number) => {
        if (handle === 'min') onChange(clamp(value, 0, max), max);
        else onChange(min, clamp(value, min, maxFret));
    };
    const commit = (pointerId: number) => {
        if (drag.current?.id !== pointerId) return;
        const [nextMin, nextMax] = drag.current.pending;
        drag.current = null;
        setPreview(null);
        if (nextMin !== min || nextMax !== max) onChange(nextMin, nextMax);
    };
    const cancel = (pointerId: number) => {
        if (drag.current?.id !== pointerId) return;
        drag.current = null;
        setPreview(null);
    };

    return <fieldset className={`${styles.control} ${compact ? styles.compact : ''}`}>
        <legend>Fret range <strong>{shownMin}–{shownMax}</strong></legend>
        <div className={styles.track} style={{ '--range-start': `${shownMin / maxFret * 100}%`, '--range-end': `${shownMax / maxFret * 100}%` } as React.CSSProperties}
            onPointerDown={event => {
                if (event.button !== 0 || drag.current) return;
                event.preventDefault();
                const bounds = event.currentTarget.getBoundingClientRect();
                if (!bounds.width) return;
                const fret = clamp(Math.round((event.clientX - bounds.left) / bounds.width * maxFret), 0, maxFret);
                const targetHandle = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-range-handle]')?.dataset.rangeHandle as Handle | undefined;
                const handle = min === max && targetHandle ? null : targetHandle ?? (Math.abs(fret - min) <= Math.abs(fret - max) ? 'min' : 'max');
                const nextMin = !targetHandle && handle === 'min' ? Math.min(fret, max) : min;
                const nextMax = !targetHandle && handle === 'max' ? Math.max(fret, min) : max;
                drag.current = { id: event.pointerId, x: event.clientX, width: bounds.width, min: nextMin, max: nextMax, handle, pending: [nextMin, nextMax] };
                setPreview(drag.current.pending);
                event.currentTarget.setPointerCapture(event.pointerId);
                if (handle) handles.current[handle]?.focus({ preventScroll: true });
            }}
            onPointerMove={event => {
                const current = drag.current;
                if (!current || current.id !== event.pointerId) return;
                const delta = event.clientX - current.x;
                if (!current.handle && Math.abs(delta) >= 3) {
                    current.handle = delta < 0 ? 'min' : 'max';
                    handles.current[current.handle]?.focus({ preventScroll: true });
                }
                if (current.handle) {
                    const value = current[current.handle] + Math.round(delta / current.width * maxFret);
                    current.pending = current.handle === 'min'
                        ? [clamp(value, 0, current.max), current.max]
                        : [current.min, clamp(value, current.min, maxFret)];
                    setPreview(current.pending);
                }
            }}
            onPointerUp={event => {
                commit(event.pointerId);
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={event => cancel(event.pointerId)}
            onLostPointerCapture={event => cancel(event.pointerId)}>
            {(['min', 'max'] as const).map(handle => <button key={handle} ref={element => { handles.current[handle] = element; }}
                type="button" role="slider" data-range-handle={handle} className={styles.thumb}
                style={{ left: `${(handle === 'min' ? shownMin : shownMax) / maxFret * 100}%` }}
                aria-label={handle === 'min' ? 'Minimum fret' : 'Maximum fret'} aria-orientation="horizontal"
                aria-valuemin={handle === 'min' ? 0 : shownMin} aria-valuemax={handle === 'min' ? shownMax : maxFret}
                aria-valuenow={handle === 'min' ? shownMin : shownMax} aria-valuetext={`Fret ${handle === 'min' ? shownMin : shownMax}`}
                onKeyDown={event => {
                    const value = handle === 'min' ? min : max;
                    const values: Record<string, number> = {
                        ArrowLeft: value - 1, ArrowDown: value - 1, ArrowRight: value + 1, ArrowUp: value + 1,
                        PageDown: value - 5, PageUp: value + 5, Home: handle === 'min' ? 0 : min, End: handle === 'min' ? max : maxFret,
                    };
                    if (event.key in values) { event.preventDefault(); update(handle, values[event.key]); }
                }} />)}
        </div>
        <div className={styles.ticks} aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ left: `${tick / maxFret * 100}%` }}>{tick}</span>)}</div>
        {helpText && <p className={styles.help}>{helpText}</p>}
    </fieldset>;
}
