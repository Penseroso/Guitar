"use client";

import { useRef, useState, type KeyboardEvent } from 'react';
import styles from './swipe-picker.module.css';

const DRAG_STEP_PX = 56;

export interface PickerOption { value: string; label: string; accessibleLabel?: string }

/** A bounded discrete picker: swipe previews, release commits; vertical motion scrolls the page. */
export function SwipePicker({ label, value, options, onChange }: {
    label: string; value: string; options: PickerOption[]; onChange: (value: string) => void;
}) {
    const selected = options.findIndex(option => option.value === value);
    const index = Math.max(0, selected);
    const [offset, setOffset] = useState(0);
    const [preview, setPreview] = useState<number | null>(null);
    const shown = preview ?? index;
    const gesture = useRef<{ id: number; x: number; y: number; offset: number; dragging: boolean } | null>(null);
    const suppressClick = useRef(false);
    const focus = useRef<HTMLDivElement>(null);
    const choose = (next: number) => {
        if (next >= 0 && next < options.length && next !== index) onChange(options[next].value);
    };
    const onKeyDown = (event: KeyboardEvent) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        choose(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1));
    };
    return <fieldset className={styles.picker}>
        <legend>{label}</legend>
        <div className={styles.control} data-dragging={offset !== 0}
            onPointerDown={event => {
                suppressClick.current = false;
                if (event.button === 0) gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: 0, dragging: false };
            }}
            onPointerMove={event => {
                const drag = gesture.current;
                if (!drag || drag.id !== event.pointerId) return;
                const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
                if (!drag.dragging && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 7) { gesture.current = null; return; }
                if (!drag.dragging && Math.abs(dx) > 7) {
                    drag.dragging = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                }
                if (!drag.dragging) return;
                event.preventDefault();
                // Distance, not the number of gestures, controls travel through a long catalog.
                drag.offset = Math.max(-(options.length - 1 - index) * DRAG_STEP_PX, Math.min(index * DRAG_STEP_PX, dx));
                const slotWidth = focus.current?.clientWidth || 120;
                setOffset(drag.offset / DRAG_STEP_PX * slotWidth);
                setPreview(Math.max(0, Math.min(options.length - 1, index - Math.round(drag.offset / DRAG_STEP_PX))));
            }}
            onPointerUp={event => {
                const drag = gesture.current;
                if (!drag || drag.id !== event.pointerId) return;
                gesture.current = null;
                setOffset(0);
                setPreview(null);
                if (drag.dragging) {
                    suppressClick.current = true;
                    if (Math.abs(drag.offset) >= 25) {
                        const steps = Math.max(1, Math.round(Math.abs(drag.offset) / DRAG_STEP_PX));
                        choose(index + (drag.offset < 0 ? steps : -steps));
                    }
                    focus.current?.focus({ preventScroll: true });
                }
            }}
            onPointerCancel={() => { gesture.current = null; setOffset(0); setPreview(null); }}
            onClickCapture={event => {
                if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
            }}>
            <button type="button" className={styles.neighbor} aria-label={`Previous ${label}`} disabled={index === 0}
                title={options[shown - 1]?.accessibleLabel ?? options[shown - 1]?.label} onClick={() => choose(index - 1)}>
                <span aria-hidden="true">{options[shown - 1]?.label ?? '‹'}</span>
            </button>
            <div ref={focus} className={styles.current} role="spinbutton" tabIndex={0} aria-label={label}
                aria-valuemin={1} aria-valuemax={options.length} aria-valuenow={index + 1}
                aria-valuetext={options[index]?.accessibleLabel ?? options[index]?.label} onKeyDown={onKeyDown}>
                <div className={styles.window} aria-hidden="true">
                    {options.map((option, itemIndex) => <span key={option.value} className={styles.value}
                        style={{ transform: `translateX(calc(${(itemIndex - index) * 100}% + ${offset}px))` }}>{option.label}</span>)}
                </div>
            </div>
            <button type="button" className={styles.neighbor} aria-label={`Next ${label}`} disabled={index >= options.length - 1}
                title={options[shown + 1]?.accessibleLabel ?? options[shown + 1]?.label} onClick={() => choose(index + 1)}>
                <span aria-hidden="true">{options[shown + 1]?.label ?? '›'}</span>
            </button>
        </div>
    </fieldset>;
}
