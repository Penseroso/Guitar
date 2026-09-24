"use client";

import React from 'react';
import styles from './harmony.module.css';

export function HarmonyTabs<T extends string>({ tabs, active, onChange, label, idBase }: {
    tabs: readonly { id: T; label: string }[];
    active: T;
    onChange: (id: T) => void;
    label: string;
    idBase: string;
}) {
    const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const selectWithKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        onChange(tabs[next].id);
        refs.current[next]?.focus();
    };
    return <div className={styles.tabs} role="tablist" aria-label={label}>
        {tabs.map((tab, index) => <button key={tab.id} ref={element => { refs.current[index] = element; }}
            type="button" role="tab" id={`${idBase}-${tab.id}`} aria-controls={`${idBase}-panel`} aria-selected={active === tab.id} tabIndex={active === tab.id ? 0 : -1}
            className={styles.tab} onClick={() => onChange(tab.id)} onKeyDown={event => selectWithKey(event, index)}>
            {tab.label}
        </button>)}
    </div>;
}
