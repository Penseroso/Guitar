"use client";

import { useLayoutEffect, useRef, useState } from 'react';
import type { TonalFrame } from '@/domain/harmony/types';
import { getKeyName, getMinorKeyName } from '@/domain/shared/keys';
import { formatAccidentals, parseNoteName } from '@/domain/shared/spelling';
import { RootDial } from '../../chord/RootDial';
import { SwipePicker } from '../../harmony/SwipePicker';
import shared from './written-time-panel.module.css';
import styles from './supplied-harmony.module.css';

/** A local draft only; no reference is supplied until Apply. */
export function SuppliedHarmonyKeyReference({ frame, onApply }: {
    frame: TonalFrame | null;
    onApply: (frame: TonalFrame) => void;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<TonalFrame>({ tonic: 'C', mode: 'major', lens: 'jazz-pop' });
    const trigger = useRef<HTMLButtonElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const pendingReturn = useRef(false);
    useLayoutEffect(() => {
        if (open) {
            heading.current?.focus({ preventScroll: true });
            heading.current?.scrollIntoView?.({ block: 'nearest' });
        } else if (pendingReturn.current) {
            const destination = trigger.current;
            destination?.focus({ preventScroll: true });
            destination?.scrollIntoView?.({ block: 'nearest' });
            pendingReturn.current = false;
        }
    }, [open]);
    const cancel = () => { pendingReturn.current = true; setOpen(false); };
    const pitchClass = parseNoteName(draft.tonic)!.pitchClass;
    return <div>
        {frame && <p>Key reference · {formatAccidentals(frame.tonic)} {frame.mode}</p>}
        <button type="button" ref={trigger} className={shared.action} aria-expanded={open} disabled={open}
            onClick={() => { setDraft(frame ? { ...frame } : { tonic: 'C', mode: 'major', lens: 'jazz-pop' }); setOpen(true); }}>
            {frame ? 'Change key reference' : 'Set key reference'}</button>
        {open && <section className={styles.keyDraft} aria-label="Key reference draft" onKeyDown={event => {
            if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
            event.preventDefault(); event.stopPropagation(); cancel();
        }}>
            <h4 ref={heading} tabIndex={-1} className={styles.analysisTitle}>Key reference</h4>
            <div className={styles.pickers}>
                <RootDial label="Key tonic" displayName={draft.tonic} value={pitchClass}
                    onChange={tonic => setDraft({ ...draft, tonic: (draft.mode === 'minor' ? getMinorKeyName : getKeyName)(tonic) })}/>
                <SwipePicker label="Key mode" value={draft.mode} options={[{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }]}
                    onChange={mode => setDraft({ ...draft, mode: mode as TonalFrame['mode'], tonic: (mode === 'minor' ? getMinorKeyName : getKeyName)(pitchClass) })}/>
            </div>
            <div className={styles.actions}>
                <button type="button" className={shared.action} onClick={() => { pendingReturn.current = true; setOpen(false); onApply({ ...draft }); }}>Apply key reference</button>
                <button type="button" className={shared.action} onClick={cancel}>Cancel key reference</button>
            </div>
        </section>}
    </div>;
}
