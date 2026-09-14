"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { getCircleOfFifthsOrder, getKeyName } from '@/domain/shared/keys';
import { CircleOfFifths } from '../shared/CircleOfFifths';
import styles from './chord-interactions.module.css';

const fifths = getCircleOfFifthsOrder();

/** The trigger button is a single deterministic toggle: exactly one of pointerdown/click ever
 *  decides a given press, so the two can never fight (pointerdown closing, then click reopening
 *  on the same gesture). A mouse press is entirely decided by pointerdown — deciding here to
 *  close also arms `suppressClick`, so the click that inevitably follows is a guaranteed no-op
 *  rather than a second, independent toggle. */
export function applyTriggerPointerDown(open: boolean): { open: boolean; suppressClick: boolean } {
    return open ? { open: false, suppressClick: true } : { open: true, suppressClick: false };
}

/** Mouse clicks arrive after pointerdown already decided this gesture — by construction `open`
 *  and `suppressClick` already reflect that decision, so this is always a no-op for the mouse.
 *  Keyboard activation (Enter/Space on the button) never fires pointerdown, so it decides for
 *  itself: a plain toggle of the current state. */
export function applyTriggerClick(open: boolean, suppressClick: boolean, keyboardActivation: boolean): { open: boolean; suppressClick: boolean } {
    if (keyboardActivation) return { open: !open, suppressClick: false };
    if (suppressClick || open) return { open, suppressClick };
    return { open: true, suppressClick };
}

export function RootDial({ value, onChange }: { value: number; onChange: (root: number) => void }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);
    const draftRef = useRef(value);
    const trigger = useRef<HTMLButtonElement>(null);
    const popup = useRef<HTMLDivElement>(null);
    const surface = useRef<HTMLDivElement>(null);
    const id = useId();
    const gesture = useRef<{ id: number; x: number; y: number; moved: boolean; inside: boolean } | null>(null);
    const suppressClick = useRef(false);
    const restoreFocus = useRef(true);
    const changeRef = useRef(onChange);
    useEffect(() => { changeRef.current = onChange; }, [onChange]);
    const preview = (root: number) => { draftRef.current = root; setDraft(root); };
    const begin = () => { restoreFocus.current = true; preview(value); setOpen(true); };
    const commit = (root: number) => { gesture.current = null; changeRef.current(root); setOpen(false); };

    useEffect(() => {
        if (!open) return;
        const panel = popup.current!;
        const triggerElement = trigger.current!;
        const position = () => {
            const bounds = triggerElement.getBoundingClientRect();
            panel.style.left = `${Math.max(12, Math.min(bounds.left, window.innerWidth - panel.offsetWidth - 12))}px`;
            const below = bounds.bottom + 8;
            panel.style.top = `${below + panel.offsetHeight <= window.innerHeight - 12 ? below : Math.max(12, bounds.top - panel.offsetHeight - 8)}px`;
        };
        const close = () => { gesture.current = null; setOpen(false); };
        const outside = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!panel.contains(target) && !triggerElement.contains(target)) {
                restoreFocus.current = !(target instanceof Element && target.closest('button, input, select, textarea, a[href], [tabindex]'));
                close();
            }
        };
        panel.showPopover();
        position();
        surface.current?.focus({ preventScroll: true });
        const move = (event: PointerEvent) => {
            const drag = gesture.current;
            if (!drag || drag.id !== event.pointerId || !surface.current) return;
            const bounds = surface.current.getBoundingClientRect();
            const x = event.clientX - bounds.left - bounds.width / 2;
            const y = event.clientY - bounds.top - bounds.height / 2;
            const radius = Math.hypot(x, y) / ((bounds.width - 16) / 2) * 160;
            drag.inside = radius >= 70 && radius <= 148;
            if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
            if (drag.inside) {
                const index = ((Math.round((Math.atan2(y, x) * 180 / Math.PI + 90) / 30) % 12) + 12) % 12;
                preview(fifths[index]);
            }
        };
        const end = (event: PointerEvent) => {
            const drag = gesture.current;
            if (!drag || drag.id !== event.pointerId) return;
            if (drag.moved) {
                suppressClick.current = true;
                if (drag.inside) commit(draftRef.current); else close();
            }
            gesture.current = null;
        };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerdown', outside);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', close);
        window.addEventListener('resize', position);
        window.addEventListener('scroll', position, true);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerdown', outside);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', close);
            window.removeEventListener('resize', position);
            window.removeEventListener('scroll', position, true);
            panel.hidePopover();
            if (restoreFocus.current) triggerElement.focus({ preventScroll: true });
        };
    }, [open]);

    return <div className={styles.rootControl}>
        <span className={styles.label}>Root</span>
        <button ref={trigger} type="button" className={styles.rootTrigger} aria-label={`Root ${getKeyName(value)}`}
            aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
            onPointerDown={event => {
                if (event.button !== 0) return;
                const decision = applyTriggerPointerDown(open);
                suppressClick.current = decision.suppressClick;
                if (decision.open) {
                    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, inside: false };
                    begin();
                } else {
                    gesture.current = null;
                    setOpen(false);
                }
            }} onClick={event => {
                const decision = applyTriggerClick(open, suppressClick.current, event.detail === 0);
                suppressClick.current = decision.suppressClick;
                if (decision.open !== open) { if (decision.open) begin(); else setOpen(false); }
            }}>
            {getKeyName(value)}
        </button>
        {open && <div ref={popup} id={id} popover="manual" role="dialog" aria-label="Choose root" className={styles.rootPopover}
            onBlur={event => {
                const next = event.relatedTarget as Node | null;
                if (next && !event.currentTarget.contains(next) && !(next === trigger.current && gesture.current)) {
                    restoreFocus.current = false;
                    gesture.current = null;
                    setOpen(false);
                }
            }}
            onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); } }}>
            <div className={styles.popoverHeader}><span>Choose root</span><button type="button" className={styles.close} onClick={() => setOpen(false)}>Close</button></div>
            <div ref={surface} className={styles.rootCircle} tabIndex={0} role="listbox" aria-label="Root in fifths order"
                aria-activedescendant={`${id}-option-${draft}`} aria-describedby={`${id}-help`}
                onPointerDown={event => {
                    if (event.button === 0) {
                        suppressClick.current = false;
                        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, inside: false };
                    }
                }} onKeyDown={event => {
                    if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                        event.preventDefault();
                        const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
                        preview(event.key === 'Home' ? fifths[0] : event.key === 'End' ? fifths[11] : fifths[(fifths.indexOf(draft) + step + 12) % 12]);
                    } else if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault(); commit(draft);
                    }
                }}>
                <CircleOfFifths rootOnly rootOptionIdPrefix={`${id}-option`} selectedKey={draft} onKeySelect={root => {
                    if (!suppressClick.current) commit(root);
                }} />
            </div>
            <p id={`${id}-help`} className={styles.help}>Choose a note, or hold and slide. Arrow keys preview; Enter selects.</p>
        </div>}
    </div>;
}
