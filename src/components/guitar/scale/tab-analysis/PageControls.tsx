"use client";

import { useRef } from 'react';
import shared from './written-time-panel.module.css';

export function PageControls({ page, count, name, onChange }: {
    page: number; count: number; name: string; onChange: (page: number) => void;
}) {
    const previous = useRef<HTMLButtonElement>(null);
    const next = useRef<HTMLButtonElement>(null);
    if (count <= 1) return null;
    const move = (to: number) => {
        onChange(to);
        // On the end pages the opposite control remains available.
        if (to === 0) next.current?.focus({ preventScroll: true });
        if (to === count - 1) previous.current?.focus({ preventScroll: true });
    };
    return <div className={shared.paging} role="group" aria-label={name}>
        <button type="button" ref={previous} className={shared.action} disabled={!page} onClick={() => move(page - 1)}>Previous</button>
        <span>Page {page + 1} of {count}</span>
        <button type="button" ref={next} className={shared.action} disabled={page >= count - 1} onClick={() => move(page + 1)}>Next</button>
    </div>;
}
