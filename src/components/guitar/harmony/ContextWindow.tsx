"use client";

import { useRef, useState } from 'react';
import type { ChordRef, ObservationContext, RelationCheck, RelationQuery } from '@/domain/harmony/types';
import { resolveChord } from '@/domain/harmony/roman';
import { parseNoteName } from '@/domain/shared/spelling';
import { HarmonyChordFields } from './HarmonyChordFields';
import styles from './harmony-workspace.module.css';

export function ContextWindow({ query, checks, onQueryChange }: { query: RelationQuery; checks?: RelationCheck[]; onQueryChange: (query: RelationQuery) => void }) {
    const [sopranoDraft, setSopranoDraft] = useState<string | null>(null);
    const composing = useRef(false);
    const phrase = checks?.find(check => check.id === 'phrase-ending');
    const bass = checks?.find(check => check.id === 'bass-observed');
    const soprano = checks?.find(check => check.id === 'soprano-observed');
    const needsResolution = checks?.some(check => check.id === 'soprano-resolution' && check.state === 'unknown');
    const [sopranoError, setSopranoError] = useState(false);
    const chordName = (chord?: ChordRef) => {
        if (!chord) return '—';
        try { return resolveChord(chord).name; }
        catch { return chord.root; }
    };
    const updateContext = (patch: Partial<ObservationContext>) => onQueryChange({ ...query, context: { ...query.context, ...patch } });
    const commitSoprano = () => {
        if (sopranoDraft === null || composing.current) return;
        const value = sopranoDraft.trim();
        if (value && !parseNoteName(value)) { setSopranoError(true); return; }
        setSopranoError(false);
        setSopranoDraft(null);
        if (value !== (query.context?.soprano ?? '')) updateContext({ soprano: value || undefined });
    };

    return <section className={styles.observationSection} aria-label="Observed chords and phrase context">
        <div className={styles.sectionHeading}><h3>{query.kind === 'cadence' ? 'Ending' : 'Observed motion'}</h3></div>
        <p className={styles.endpointSummary} aria-label="Observed chord path">{chordName(query.context?.before)} <span aria-hidden="true">→</span> {query.kind === 'passing' && <>{chordName(query.context?.middle)} <span aria-hidden="true">→</span> </>}{chordName(query.target)} <span className={styles.endpointRole}>Resolve to</span></p>
        <div className={styles.observationFields}>
            <HarmonyChordFields label="Before" optional allowBass emptyHint={query.kind === 'cadence' ? 'Choose preceding chord' : undefined} defaultQuality={query.kind === 'cadence' ? 'dominant-7' : 'major'} value={query.context?.before} onChange={before => updateContext({ before })} />
            {query.kind === 'passing' && <HarmonyChordFields label="Middle" optional allowBass defaultQuality="diminished-7" value={query.context?.middle} onChange={middle => updateContext({ middle })} />}
        </div>
        {query.kind === 'cadence' && <div className={styles.cadenceFields}>
            {(phrase || query.context?.phraseEnding !== undefined) && <label className={styles.sopranoField}>Phrase ending
                <select value={query.context?.phraseEnding === undefined ? 'unknown' : String(query.context.phraseEnding)}
                    onChange={event => updateContext({ phraseEnding: event.target.value === 'unknown' ? undefined : event.target.value === 'true' })}>
                    <option value="unknown">Unknown</option><option value="true">Yes</option><option value="false">No</option>
                </select>
            </label>}
            {(bass || query.context?.bassConfirmed) && <label className={styles.checkField}>
                <input type="checkbox" aria-label="Bass / inversions verified" checked={!!query.context?.bassConfirmed}
                    onChange={event => updateContext({ bassConfirmed: event.target.checked })} />
                <span className={styles.stateDot} aria-hidden="true" />Bass / inversions verified
            </label>}
            {(soprano || needsResolution || query.context?.soprano || sopranoDraft !== null) && <div>
                <label className={styles.sopranoField}>Soprano note
                    <input value={sopranoDraft ?? query.context?.soprano ?? ''} placeholder="Final note"
                        onChange={event => { setSopranoDraft(event.target.value); setSopranoError(false); }}
                        onCompositionStart={() => { composing.current = true; }}
                        onCompositionEnd={() => { composing.current = false; }}
                        onBlur={commitSoprano} onKeyDown={event => {
                            if (composing.current || event.nativeEvent.isComposing) return;
                            if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
                            if (event.key === 'Escape') { setSopranoDraft(null); setSopranoError(false); }
                        }}
                        aria-invalid={sopranoError} aria-describedby={sopranoError || needsResolution ? 'harmony-soprano-hint' : undefined} />
                </label>
                {(sopranoError || needsResolution) && <span id="harmony-soprano-hint" className={sopranoError ? styles.error : styles.contextHint}>
                    {sopranoError ? 'Enter a note name such as C, F♯, or B♭.' : 'Outside the chord · enter its observed resolution.'}
                </span>}
            </div>}
        </div>}
        {query.kind === 'passing' && <div className={styles.cadenceFields}>
            <label className={styles.checkField}><input type="checkbox" checked={query.context?.bassConfirmed === true} onChange={event => updateContext({ bassConfirmed: event.target.checked })} /><span className={styles.stateDot} aria-hidden="true" />Bass / inversions verified</label>
            <label className={styles.checkField}><input type="checkbox" checked={query.context?.rhythmConfirmed === true} onChange={event => updateContext({ rhythmConfirmed: event.target.checked })} /><span className={styles.stateDot} aria-hidden="true" />Passing rhythm verified</label>
        </div>}
    </section>;
}
