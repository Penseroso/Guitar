"use client";

import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import type { ChordChoice } from './ChoiceGroup';
import styles from './choice-rail.module.css';

/** Discrete choices: drag previews a choice; release commits it. */
export function ChoiceRail({ label, value, options, onChange, expandAny = false }: {
    label: string; value: string; options: ChordChoice[];
    onChange: (value: string) => void; expandAny?: boolean;
}) {
    const name = useId();
    const viewport = useRef<HTMLDivElement>(null);
    const track = useRef<HTMLDivElement>(null);
    const gesture = useRef<{ id: number; x: number; y: number; dragging: boolean; index: number } | null>(null);
    const suppressClick = useRef(false);
    const [preview, setPreview] = useState<number | null>(null);
    const [indicator, setIndicator] = useState({ left: 0, width: 0 });
    const selected = Math.max(0, options.findIndex(option => option.value === value));
    const displayed = preview ?? selected;
    const any = expandAny && options[displayed]?.value === '';

    useLayoutEffect(() => {
        const rail = track.current!;
        const measure = () => {
            const item = rail.querySelectorAll<HTMLElement>('label')[displayed];
            if (item) setIndicator({ left: any ? 4 : item.offsetLeft, width: any ? rail.scrollWidth - 8 : item.offsetWidth });
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(rail);
        return () => observer.disconnect();
    }, [displayed, any, options]);

    useLayoutEffect(() => {
        const item = track.current?.querySelectorAll<HTMLElement>('label')[displayed];
        const box = viewport.current;
        if (item && box && (item.offsetLeft < box.scrollLeft || item.offsetLeft + item.offsetWidth > box.scrollLeft + box.clientWidth)) {
            box.scrollTo({ left: item.offsetLeft - (box.clientWidth - item.offsetWidth) / 2,
                behavior: preview !== null || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        }
    }, [displayed, preview]);

    return <fieldset className={styles.group} data-choice-rail={label}>
        <legend>{label}</legend>
        <div ref={viewport} className={styles.viewport}>
            <div ref={track} className={styles.track} data-any={any} style={{ '--choice-count': options.length } as React.CSSProperties}
                onPointerDown={event => {
                    suppressClick.current = false;
                    if (event.button === 0) gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false, index: selected };
                }}
                onPointerMove={event => {
                    const drag = gesture.current;
                    if (!drag || drag.id !== event.pointerId) return;
                    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
                    if (!drag.dragging && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { gesture.current = null; return; }
                    if (!drag.dragging && Math.abs(dx) > 8) {
                        drag.dragging = true;
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }
                    if (!drag.dragging) return;
                    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('label'));
                    const distances = items.map(item => { const r = item.getBoundingClientRect(); return Math.abs(event.clientX - r.left - r.width / 2); });
                    drag.index = distances.indexOf(Math.min(...distances));
                    setPreview(drag.index);
                }}
                onPointerUp={event => {
                    const drag = gesture.current;
                    if (!drag || drag.id !== event.pointerId) return;
                    gesture.current = null;
                    setPreview(null);
                    if (drag.dragging) {
                        suppressClick.current = true;
                        onChange(options[drag.index].value);
                        event.currentTarget.querySelectorAll<HTMLInputElement>('input')[drag.index]?.focus({ preventScroll: true });
                    }
                }}
                onPointerCancel={() => { gesture.current = null; setPreview(null); }}
                onClickCapture={event => { if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }}>
                <div aria-hidden="true" className={styles.indicator} style={{ left: indicator.left, width: indicator.width }} />
                {options.map((option, index) => <label key={option.value} className={styles.choice}
                    data-highlighted={index === displayed} data-terminal={expandAny && option.value === ''}>
                    <input type="radio" name={name} value={option.value} checked={value === option.value}
                        aria-label={option.accessibleLabel ?? option.label} onChange={() => onChange(option.value)} />
                    <span>{option.label}</span>
                </label>)}
            </div>
        </div>
    </fieldset>;
}
