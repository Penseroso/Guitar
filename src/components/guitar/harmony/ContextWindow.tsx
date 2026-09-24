"use client";

import { useState } from 'react';
import type { ChordRef, ObservationContext, RelationQuery } from '@/domain/harmony/types';
import { resolveChord } from '@/domain/harmony/roman';
import { parseNoteName } from '@/domain/shared/spelling';
import { HarmonyChordFields } from './HarmonyChordFields';
import styles from './harmony-workspace.module.css';

export function ContextWindow({ query, onQueryChange }: { query: RelationQuery; onQueryChange: (query: RelationQuery) => void }) {
    const [sopranoDraft, setSopranoDraft] = useState(query.context?.soprano ?? '');
    const [sopranoError, setSopranoError] = useState(false);
    const chordName = (chord?: ChordRef) => {
        if (!chord) return '—';
        try { return resolveChord(chord).name; }
        catch { return chord.root; }
    };
    const updateContext = (patch: Partial<ObservationContext>) => onQueryChange({ ...query, context: { ...query.context, ...patch } });
    const commitSoprano = () => {
        const value = sopranoDraft.trim();
        if (value && !parseNoteName(value)) { setSopranoError(true); return; }
        setSopranoError(false);
        updateContext({ soprano: value || undefined });
    };

    return <section className={styles.observationSection} aria-label="Observed chords and phrase context">
        <div className={styles.sectionHeading}><h3>{query.kind === 'cadence' ? 'Ending' : 'Observed motion'}</h3></div>
        <p className={styles.endpointSummary} aria-label="Observed chord path">{chordName(query.context?.before)} <span aria-hidden="true">→</span> {query.kind === 'passing' && <>{chordName(query.context?.middle)} <span aria-hidden="true">→</span> </>}{chordName(query.target)} <span className={styles.endpointRole}>Resolve to</span></p>
        <div className={styles.observationFields}>
            <HarmonyChordFields label="Before" optional allowBass defaultQuality={query.kind === 'cadence' ? 'dominant-7' : 'major'} value={query.context?.before} onChange={before => updateContext({ before })} />
            {query.kind === 'passing' && <HarmonyChordFields label="Middle" optional allowBass defaultQuality="diminished-7" value={query.context?.middle} onChange={middle => updateContext({ middle })} />}
        </div>
        {query.kind === 'cadence' && <div className={styles.cadenceFields}>
            <label className={styles.checkField}><input type="checkbox" aria-label="Phrase ending" ref={input => { if (input) input.indeterminate = query.context?.phraseEnding === undefined; }} checked={query.context?.phraseEnding === true} onChange={event => updateContext({ phraseEnding: event.target.checked })} /><span className={styles.stateDot} aria-hidden="true" />Phrase ending{query.context?.phraseEnding === undefined && <span className={styles.contextHint}>Unknown</span>}</label>
            <label className={styles.checkField}><input type="checkbox" checked={!!query.context?.bassConfirmed} onChange={event => updateContext({ bassConfirmed: event.target.checked })} /><span className={styles.stateDot} aria-hidden="true" />Bass / inversions verified</label>
            <label className={styles.sopranoField}><span>Soprano note</span><input value={sopranoDraft} onChange={event => { setSopranoDraft(event.target.value); setSopranoError(false); }} onBlur={commitSoprano} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} aria-invalid={sopranoError} aria-describedby={sopranoError ? 'harmony-soprano-error' : undefined} placeholder="e.g. C" /></label>
            {sopranoError && <span id="harmony-soprano-error" className={styles.error}>Enter a note name such as C, F♯, or B♭.</span>}
        </div>}
        {query.kind === 'passing' && <div className={styles.cadenceFields}>
            <label className={styles.checkField}><input type="checkbox" checked={query.context?.bassConfirmed === true} onChange={event => updateContext({ bassConfirmed: event.target.checked })} /><span className={styles.stateDot} aria-hidden="true" />Bass / inversions verified</label>
            <label className={styles.checkField}><input type="checkbox" checked={query.context?.rhythmConfirmed === true} onChange={event => updateContext({ rhythmConfirmed: event.target.checked })} /><span className={styles.stateDot} aria-hidden="true" />Passing rhythm verified</label>
        </div>}
    </section>;
}
