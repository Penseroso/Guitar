"use client";

import { useState } from 'react';
import type { ObservationContext, RelationQuery } from '@/domain/harmony/types';
import { parseNoteName } from '@/domain/shared/spelling';
import { HarmonyChordFields } from './HarmonyChordFields';
import styles from './harmony-workspace.module.css';

export function ContextWindow({ query, onQueryChange }: { query: RelationQuery; onQueryChange: (query: RelationQuery) => void }) {
    const [sopranoDraft, setSopranoDraft] = useState(query.context?.soprano ?? '');
    const [sopranoError, setSopranoError] = useState(false);
    const updateContext = (patch: Partial<ObservationContext>) => onQueryChange({ ...query, context: { ...query.context, ...patch } });
    const commitSoprano = () => {
        const value = sopranoDraft.trim();
        if (value && !parseNoteName(value)) { setSopranoError(true); return; }
        setSopranoError(false);
        updateContext({ soprano: value || undefined });
    };

    return <section className={styles.observationSection} aria-label="Observed chords and phrase context">
        <div className={styles.sectionHeading}><h3>What did you hear?</h3><span>{query.kind === 'cadence' ? 'Ending details are required to classify it' : 'Both observed chords are required'}</span></div>
        <div className={styles.observationFields}>
            <HarmonyChordFields label="Before" optional allowBass={query.kind === 'cadence'} defaultQuality={query.kind === 'cadence' ? 'dominant-7' : 'major'} value={query.context?.before} onChange={before => updateContext({ before })} />
            {query.kind === 'passing' && <HarmonyChordFields label="Middle" optional defaultQuality="diminished-7" value={query.context?.middle} onChange={middle => updateContext({ middle })} />}
        </div>
        {query.kind === 'cadence' && <div className={styles.cadenceFields}>
            <label className={styles.checkField}><input type="checkbox" checked={!!query.context?.phraseEnding} onChange={event => updateContext({ phraseEnding: event.target.checked })} /><span className={styles.stateDot} aria-hidden="true" />Phrase ending</label>
            <label className={styles.checkField}><input type="checkbox" checked={!!query.context?.bassConfirmed} onChange={event => updateContext({ bassConfirmed: event.target.checked })} /><span className={styles.stateDot} aria-hidden="true" />Bass / inversions verified</label>
            <label className={styles.sopranoField}><span>Soprano note</span><input value={sopranoDraft} onChange={event => { setSopranoDraft(event.target.value); setSopranoError(false); }} onBlur={commitSoprano} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} aria-invalid={sopranoError} aria-describedby={sopranoError ? 'harmony-soprano-error' : undefined} placeholder="e.g. C" /></label>
            {sopranoError && <span id="harmony-soprano-error" className={styles.error}>Enter a note name such as C, F♯, or B♭.</span>}
        </div>}
    </section>;
}
