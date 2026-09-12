"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { getCircleOfFifthsOrder, getKeyName, getRelativeMinor } from '@/domain/shared/keys';
import { KeyButton } from '../../ui/design-system/KeyButton';
import { CircleOfFifths } from '../shared/CircleOfFifths';
import styles from './chord-ui.module.css';

const fifths = getCircleOfFifthsOrder();

export function RootDial({ value, onChange, scaleGroup, scaleName }: {
    value: number; onChange: (root: number) => void; scaleGroup: string; scaleName: string;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);
    const draftRef = useRef(value);
    const anchor = useRef<HTMLDivElement>(null);
    const popup = useRef<HTMLDivElement>(null);
    const surface = useRef<HTMLDivElement>(null);
    const popupId = useId();
    const gesture = useRef<{ id: number; x: number; y: number; moved: boolean; inside: boolean } | null>(null);
    const suppressClick = useRef(false);
    const changeRef = useRef(onChange);
    useEffect(() => { changeRef.current = onChange; }, [onChange]);
    const preview = (root: number) => { draftRef.current = root; setDraft(root); };
    const begin = () => { preview(value); setOpen(true); };
    const commit = (root: number) => { gesture.current = null; changeRef.current(root); setOpen(false); };
    useEffect(() => {
        if (!open) return;
        const panel = popup.current!;
        const triggerElement = anchor.current!;
        const position = () => {
            const trigger = triggerElement.getBoundingClientRect();
            panel.style.left = `${Math.max(12, Math.min(trigger.left, window.innerWidth - panel.offsetWidth - 12))}px`;
            const below = trigger.bottom + 8;
            panel.style.top = `${below + panel.offsetHeight <= window.innerHeight - 12 ? below : Math.max(12, trigger.top - panel.offsetHeight - 8)}px`;
        };
        const toggled = (event: Event) => { if ((event as ToggleEvent).newState === 'closed') setOpen(false); };
        panel.addEventListener('toggle', toggled);
        panel.showPopover();
        position();
        surface.current?.focus({ preventScroll: true });
        const move = (event: PointerEvent) => {
            const drag = gesture.current;
            if (!drag || drag.id !== event.pointerId || !surface.current) return;
            const box = surface.current.getBoundingClientRect();
            const x = event.clientX - box.left - box.width / 2;
            const y = event.clientY - box.top - box.height / 2;
            const radius = Math.hypot(x, y) / ((box.width - 16) / 2) * 160;
            drag.inside = radius >= 24 && radius <= 148;
            if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
            if (drag.inside) {
                const index = ((Math.round((Math.atan2(y, x) * 180 / Math.PI + 90) / 30) % 12) + 12) % 12;
                const note = fifths[index];
                preview(scaleGroup === 'Diatonic Modes' && radius < 82 ? getRelativeMinor(note) : note);
            }
            event.preventDefault();
        };
        const end = (event: PointerEvent) => {
            const drag = gesture.current;
            if (!drag || drag.id !== event.pointerId) return;
            if (drag.moved) {
                suppressClick.current = true;
                window.setTimeout(() => { suppressClick.current = false; }, 0);
                if (drag.inside) commit(draftRef.current); else setOpen(false);
            }
            gesture.current = null;
        };
        const cancel = () => { gesture.current = null; setOpen(false); };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('resize', position);
        return () => {
            window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', cancel); window.removeEventListener('resize', position);
            panel.removeEventListener('toggle', toggled);
            const restoreFocus = panel.contains(document.activeElement) || document.activeElement === document.body;
            panel.hidePopover();
            if (restoreFocus) triggerElement.querySelector('button')?.focus({ preventScroll: true });
        };
    }, [open, scaleGroup]);
    return <div className={styles.rootControl}>
        <span className={styles.muted}>Root</span>
        <div ref={anchor} className={styles.rootTrigger} style={{ touchAction: 'none' }} onPointerDown={event => {
            if (event.button !== 0) return;
            gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, inside: false };
            begin();
        }}>
            <KeyButton comfortable isActive label={`Root ${getKeyName(value)}`} note={getKeyName(value)} onClick={() => {
                if (suppressClick.current) { suppressClick.current = false; return; }
                if (!open) begin();
            }} />
        </div>
        <span className={styles.small}>Hold & choose</span>
        {open && <div ref={popup} id={popupId} popover="auto" role="dialog" aria-label="Choose root" className={styles.rootPopover}>
            <div className={styles.row}><h2 className="text-lg font-semibold">Root · {getKeyName(draft)}</h2>
                <button className={styles.action} onClick={() => setOpen(false)}>Close</button></div>
            <div ref={surface} className={styles.rootDial} tabIndex={0} role="slider" aria-label="Root in fifths order"
                aria-valuemin={0} aria-valuemax={11} aria-valuenow={fifths.indexOf(draft)} aria-valuetext={getKeyName(draft)}
                onPointerDown={event => { gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, inside: false }; }}
                onKeyDown={event => {
                    if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)) {
                        event.preventDefault(); const step = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1;
                        preview(fifths[(fifths.indexOf(draft) + step + 12) % 12]);
                    } else if (event.key === 'Enter') { event.preventDefault(); commit(draft); }
                }}>
                <CircleOfFifths selectedKey={draft} selectedScaleGroup={scaleGroup} selectedScaleName={scaleName} onKeySelect={commit} />
            </div>
            <p className={styles.small}>Move to a key and release. Chord type stays the same.</p>
            <p className={styles.small}>Arrow keys choose · Enter confirms · Escape cancels</p>
        </div>}
    </div>;
}
