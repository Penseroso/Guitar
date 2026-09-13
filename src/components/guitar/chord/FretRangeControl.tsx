"use client";

import React, { useRef, useState } from 'react';
import styles from './chord-interactions.module.css';

type Handle = 'min' | 'max';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function FretRangeControl({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
    const handles = useRef<Record<Handle, HTMLButtonElement | null>>({ min: null, max: null });
    const [preview, setPreview] = useState<readonly [number, number] | null>(null);
    const shownMin = preview?.[0] ?? min, shownMax = preview?.[1] ?? max;
    const drag = useRef<{ id: number; x: number; width: number; min: number; max: number; handle: Handle | null; pending: readonly [number, number] } | null>(null);
    const update = (handle: Handle, value: number, lower = min, upper = max) => {
        if (handle === 'min') onChange(clamp(value, 0, upper), upper);
        else onChange(lower, clamp(value, lower, 15));
    };
    return <fieldset className={styles.rangeControl}>
        <legend>Fret range <strong>{shownMin}–{shownMax}</strong></legend>
        <div className={styles.rangeTrack} style={{ '--range-start': `${shownMin / 15 * 100}%`, '--range-end': `${shownMax / 15 * 100}%` } as React.CSSProperties}
            onPointerDown={event => {
                if (event.button !== 0) return;
                event.preventDefault();
                const bounds = event.currentTarget.getBoundingClientRect();
                const fret = clamp(Math.round((event.clientX - bounds.left) / bounds.width * 15), 0, 15);
                const targetHandle = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-range-handle]')?.dataset.rangeHandle as Handle | undefined;
                const handle = min === max && targetHandle ? null : targetHandle ?? (Math.abs(fret - min) <= Math.abs(fret - max) ? 'min' : 'max');
                const nextMin = !targetHandle && handle === 'min' ? Math.min(fret, max) : min;
                const nextMax = !targetHandle && handle === 'max' ? Math.max(fret, min) : max;
                drag.current = { id: event.pointerId, x: event.clientX, width: bounds.width, min: nextMin, max: nextMax, handle, pending: [nextMin, nextMax] };
                setPreview(drag.current.pending);
                event.currentTarget.setPointerCapture(event.pointerId);
                if (handle) handles.current[handle]?.focus({ preventScroll: true });
            }} onPointerMove={event => {
                const current = drag.current;
                if (!current || current.id !== event.pointerId) return;
                const delta = event.clientX - current.x;
                if (!current.handle && Math.abs(delta) >= 3) {
                    current.handle = delta < 0 ? 'min' : 'max';
                    handles.current[current.handle]?.focus({ preventScroll: true });
                }
                if (current.handle) {
                    const value = current[current.handle] + Math.round(delta / current.width * 15);
                    current.pending = current.handle === 'min'
                        ? [clamp(value, 0, current.max), current.max]
                        : [current.min, clamp(value, current.min, 15)];
                    setPreview(current.pending);
                }
            }} onPointerUp={event => {
                if (drag.current?.id !== event.pointerId) return;
                const committed = drag.current.pending;
                drag.current = null;
                setPreview(null);
                event.currentTarget.releasePointerCapture(event.pointerId);
                onChange(committed[0], committed[1]);
            }} onPointerCancel={() => { drag.current = null; setPreview(null); }} onLostPointerCapture={() => { drag.current = null; setPreview(null); }}>
            {(['min', 'max'] as const).map(handle => <button key={handle} ref={element => { handles.current[handle] = element; }}
                type="button" role="slider" data-range-handle={handle} className={styles.rangeThumb}
                style={{ left: `${(handle === 'min' ? shownMin : shownMax) / 15 * 100}%` }}
                aria-label={handle === 'min' ? 'Minimum fret' : 'Maximum fret'} aria-orientation="horizontal"
                aria-valuemin={handle === 'min' ? 0 : shownMin} aria-valuemax={handle === 'min' ? shownMax : 15}
                aria-valuenow={handle === 'min' ? shownMin : shownMax} aria-valuetext={`Fret ${handle === 'min' ? shownMin : shownMax}`}
                onKeyDown={event => {
                    const value = handle === 'min' ? min : max;
                    const values: Record<string, number> = {
                        ArrowLeft: value - 1, ArrowDown: value - 1, ArrowRight: value + 1, ArrowUp: value + 1,
                        PageDown: value - 5, PageUp: value + 5, Home: handle === 'min' ? 0 : min, End: handle === 'min' ? max : 15,
                    };
                    if (event.key in values) { event.preventDefault(); update(handle, values[event.key]); }
                }} />)}
        </div>
        <div className={styles.rangeTicks} aria-hidden="true"><span>0</span><span>5</span><span>10</span><span>15</span></div>
        <p className={styles.help}>Applies to fretted notes. Open strings use their own filter.</p>
    </fieldset>;
}
