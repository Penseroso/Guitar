"use client";

import React, { useEffect, useId, useRef } from 'react';
import styles from './chord-ui.module.css';

export function ChordDialog({ title, onClose, children, returnFocusRef }: {
    title: string; onClose: () => void; children: React.ReactNode;
    returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    useEffect(() => {
        const dialog = ref.current!;
        // WebKit mouse activation need not focus the opener. Preserve its explicit
        // ref rather than assuming activeElement identifies that control.
        const trigger = returnFocusRef?.current ?? document.activeElement as HTMLElement | null;
        dialog.showModal();
        return () => { dialog.close(); trigger?.focus({ preventScroll: true }); };
    }, [returnFocusRef]);
    return <dialog ref={ref} aria-labelledby={titleId} className={styles.dialog}
        onCancel={(event) => { event.preventDefault(); onClose(); }}>
        <div className={styles.row}><h2 id={titleId} className="text-lg font-semibold">{title}</h2><button className={styles.action} onClick={onClose}>Close</button></div>
        {children}
    </dialog>;
}
