"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parseAsciiTab, MAX_TAB_SOURCE_LENGTH } from '@/domain/tab/ascii';
import { buildTabScoreAnnotations } from '@/domain/tab/annotations';
import { TAB_TUNINGS } from '@/domain/tab/types';
import type { TabAnalysisAction, TabAnalysisState } from '@/features/tab-analysis/state';
import { createScaleRef, resolveScaleRef, type ScaleRef } from '@/domain/scale/scale-ref';
import { SCALE_REGISTRY } from '@/domain/scale/scales';
import { getScalePresentationName } from '@/domain/scale/scaleSelector';
import { getKeyName, getMinorKeyName } from '@/domain/shared/keys';
import { parseNoteName } from '@/domain/shared/spelling';
import { RootDial } from '../../chord/RootDial';
import { SwipePicker } from '../../harmony/SwipePicker';
import { TabScoreView, type TabDraftStatus } from './TabScoreView';
import styles from './tab-analysis.module.css';

const SCALE_OPTIONS = Object.entries(SCALE_REGISTRY).flatMap(([group, scales]) => Object.keys(scales).map(name => ({
    value: `${group}::${name}`, label: getScalePresentationName(name), accessibleLabel: `${getScalePresentationName(name)}, ${group}`,
})));
// Explicit barlines, variable onset counts. Spacing never claims a measured duration.
const EXAMPLE_BARS: (number | null)[][][] = [
    [[null, 1], [null, 3], [0], [3]],
    [[null, 1], [null, 3], [0], [3], [0], [null, 1]],
    [[0, 1], [1, 3], [3, 5]],
    [[5, 6], [3, 5], [1, 3], [0, 1], [0, 1]],
    [[1, 3, 2, 0], [1, 0, 0, 0, null, 3], [0, 1, 0, 2, 3]],
    [[null, 1], [0], [3], [0], [null, 1]],
    [[null, 3], [1], [null, null, 2], [null, 3], [1], [null, null, 2]],
    [[0, 1, 0, 2, 3], [0], [3], [null, 1]],
];
const MIXED_EXAMPLE = ['e', 'B', 'G', 'D', 'A', 'E'].map((label, string) =>
    `${label}|${EXAMPLE_BARS.map(bar => bar.map(notes => notes[string] == null ? '---' : `${String(notes[string]).padStart(2, '-')}-`).join('')).join('|')}|`,
).join('\n');

function scaleTitle(ref: ScaleRef | null) {
    const scale = ref && resolveScaleRef(ref);
    return scale ? `${getKeyName(scale.tonic)} ${getScalePresentationName(scale.name)}` : 'No reference scale';
}

export function TabAnalysisWorkspace({ state, dispatch, exploredScale }: {
    state: TabAnalysisState;
    dispatch: React.Dispatch<TabAnalysisAction>;
    exploredScale: ScaleRef;
}) {
    const [contextOpen, setContextOpen] = useState(false);
    const [annotationsVisible, setAnnotationsVisible] = useState(true);
    const [draftStatus, setDraftStatus] = useState<TabDraftStatus>(null);
    const [readingFile, setReadingFile] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const readRevision = useRef(0);
    const fileInput = useRef<HTMLInputElement>(null);
    const sourceInput = useRef<HTMLTextAreaElement>(null);
    const contextElement = useRef<HTMLDetailsElement>(null);
    const keyControls = useRef<HTMLDivElement>(null);
    const scoreHeading = useRef<HTMLHeadingElement>(null);
    const tuning = TAB_TUNINGS.find(item => item.id === state.tuningId) ?? TAB_TUNINGS[0];
    const scale = state.context.scale && resolveScaleRef(state.context.scale);
    const annotations = useMemo(() => state.analysisStatus === 'fresh' && state.analysis
        ? buildTabScoreAnnotations(state.analysis.result, state.analysis.context) : [],
    [state.analysisStatus, state.analysis]);
    const hasNotes = !!state.document?.moments.some(moment => moment.notes.length);
    const keyTitle = state.context.frame ? `${state.context.frame.tonic} ${state.context.frame.mode}` : 'No key supplied';
    const openKeyContext = () => {
        setContextOpen(true);
        requestAnimationFrame(() => {
            keyControls.current?.scrollIntoView?.({ block: 'nearest' });
            const target = keyControls.current?.querySelector<HTMLButtonElement>(state.context.frame ? 'button[aria-label^="Key tonic"]' : 'button');
            target?.focus({ preventScroll: true });
        });
    };

    useEffect(() => () => { readRevision.current += 1; }, []);
    const cancelRead = () => { readRevision.current += 1; setReadingFile(false); setFileError(null); };
    const loadFile = async (file: File | undefined) => {
        if (!file) return;
        const revision = ++readRevision.current;
        setFileError(null);
        if (!/\.(txt|tab)$/i.test(file.name)) { setFileError('Open a plain-text .txt or .tab file. Guitar Pro, MusicXML and images are not supported yet.'); setReadingFile(false); return; }
        if (file.size > MAX_TAB_SOURCE_LENGTH) { setFileError('This file is too large. Open a text excerpt smaller than 64 KB.'); setReadingFile(false); return; }
        setReadingFile(true);
        try {
            const source = await file.text();
            if (revision !== readRevision.current) return;
            dispatch({ type: 'set-source', source, name: file.name });
            sourceInput.current?.focus();
        } catch {
            if (revision === readRevision.current) setFileError('The file could not be read. Try opening it again or paste the tab.');
        } finally {
            if (revision === readRevision.current) setReadingFile(false);
        }
    };
    const importTab = () => {
        cancelRead();
        const result = parseAsciiTab(state.source, { tuningMidi: tuning.midi, capo: state.capo });
        dispatch({ type: 'parsed', result });
        if (result.ok) requestAnimationFrame(() => scoreHeading.current?.focus({ preventScroll: true }));
    };
    const example = () => {
        cancelRead();
        const source = MIXED_EXAMPLE.split('\n').map((line, index) => `${getKeyName(tuning.midi[index] % 12)}${line.slice(1)}`).join('\n');
        const result = parseAsciiTab(source, { tuningMidi: tuning.midi, capo: state.capo });
        dispatch({ type: 'set-source', source, name: 'Melody & harmony study' });
        dispatch({ type: 'parsed', result });
    };
    return <section className={styles.workspace} aria-label="Tab analysis workspace">
        <div className={styles.headingRow}>
            <div><p className={styles.eyebrow}>TAB ANALYSIS</p><h1>Your music, note by note</h1></div>
            <div className={styles.actions}>
                <button type="button" className={styles.textAction} onClick={() => fileInput.current?.click()}>Open text file</button>
                <button type="button" className={styles.textAction} onClick={() => dispatch({ type: 'set-editor-open', open: !state.editorOpen })} aria-expanded={state.editorOpen}>Import text</button>
                <button className={styles.textAction} type="button" onClick={example}>Try an example</button>
            </div>
        </div>
        <input ref={fileInput} type="file" accept=".txt,.tab,text/plain" aria-label="Open a text tab file" className={styles.fileInput}
            onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void loadFile(file); }} />
        {readingFile && <div className={styles.fileStatus} role="status">Reading file… <button className={styles.textAction} type="button" onClick={cancelRead}>Cancel</button></div>}
        {fileError && <p className={styles.error} role="alert">{fileError}</p>}
        {state.editorOpen && <div className={styles.inputArea}>
            <label className={styles.inputLabel} htmlFor="tab-source">Paste or write a six-string tab</label>
            <textarea ref={sourceInput} id="tab-source" className={styles.sourceInput} value={state.source} spellCheck={false} autoCapitalize="off" autoCorrect="off"
                aria-describedby="tab-input-hint" placeholder={'e|----------------|\nB|----------------|\nG|----------------|\nD|----------------|\nA|----------------|\nE|----------------|'}
                onChange={event => { cancelRead(); dispatch({ type: 'edit-source', source: event.target.value }); }} />
            <div className={styles.inputFooter}>
                <p id="tab-input-hint" className={styles.meta}>Six aligned lines, frets 0–36. h/p, slides and ~ retain written frets; bends are unsupported. Rhythm is unknown.</p>
                <div className={styles.actions}>
                    <button className={styles.primary} type="button" disabled={!state.source.trim() || readingFile} onClick={importTab}>Import tab</button>
                </div>
            </div>
        </div>}
        {state.diagnostics.length > 0 && <ul className={styles.messages} role={state.diagnostics.some(item => item.severity === 'error') ? 'alert' : 'status'}>
            {state.diagnostics.map((item, index) => <li key={index}>
                {item.line !== undefined && <span className={styles.diagnosticLocation}>Line {item.line}{item.column !== undefined ? `, column ${item.column}` : ''}: </span>}{item.message}
            </li>)}
        </ul>}
        <details ref={contextElement} className={styles.context} open={contextOpen} onToggle={event => setContextOpen(event.currentTarget.open)}>
            <summary><span>Context</span><span className={styles.contextSummary}>{tuning.label} · Capo {state.capo} · {keyTitle} · {scaleTitle(state.context.scale)}</span></summary>
            <div className={styles.contextBody}>
                <div className={styles.contextGroup}>
                    <h2>Instrument</h2>
                    <SwipePicker label="Tuning" value={state.tuningId} options={TAB_TUNINGS.map(item => ({ value: item.id, label: item.label }))}
                        onChange={id => { cancelRead(); dispatch({ type: 'set-tuning', id }); }} />
                    <label className={styles.capoControl}>Capo <output>{state.capo}</output>
                        <input type="range" min={0} max={12} step={1} value={state.capo} aria-label="Capo fret"
                            onChange={event => { cancelRead(); dispatch({ type: 'set-capo', capo: Number(event.target.value) }); }} />
                    </label>
                    <p className={styles.meta}>Frets are relative to the capo. Pitches update with the instrument.</p>
                </div>
                <div className={styles.contextGroup}>
                    <div className={styles.sectionHeading}><h2>Reference scale</h2>{scale && <button type="button" className={styles.textAction} onClick={() => dispatch({ type: 'set-scale', scale: null })}>Clear scale</button>}</div>
                    <button type="button" className={styles.textAction} onClick={() => dispatch({ type: 'set-scale', scale: { ...exploredScale } })}>Use explored {scaleTitle(exploredScale)}</button>
                    {scale && state.context.scale && <div className={styles.pitchControls}>
                        <RootDial label="Reference tonic" value={scale.tonic} onChange={tonic => dispatch({ type: 'set-scale', scale: { ...state.context.scale!, tonic } })} />
                        <SwipePicker label="Reference scale" value={`${scale.group}::${scale.name}`} options={SCALE_OPTIONS} onChange={value => {
                            const [group, name] = value.split('::'); dispatch({ type: 'set-scale', scale: createScaleRef(group, name, scale.tonic) });
                        }} />
                    </div>}
                    <p className={styles.meta}>A comparison collection. It does not establish the key of the music.</p>
                </div>
                <div ref={keyControls} className={styles.contextGroup}>
                    <div className={styles.sectionHeading}><h2>Key reference</h2>{state.context.frame && <button type="button" className={styles.textAction} onClick={() => dispatch({ type: 'set-frame', frame: null })}>Clear key</button>}</div>
                    {state.context.frame ? <div className={styles.pitchControls}>
                        <RootDial label="Key tonic" displayName={state.context.frame.tonic} value={parseNoteName(state.context.frame.tonic)?.pitchClass ?? 0} onChange={tonic => dispatch({ type: 'set-frame', frame: { ...state.context.frame!, tonic: (state.context.frame!.mode === 'minor' ? getMinorKeyName : getKeyName)(tonic) } })} />
                        <SwipePicker label="Key mode" value={state.context.frame.mode} options={[{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }]}
                            onChange={mode => {
                                const tonic = parseNoteName(state.context.frame!.tonic);
                                if (tonic) dispatch({ type: 'set-frame', frame: { ...state.context.frame!, mode: mode as 'major' | 'minor',
                                    tonic: (mode === 'minor' ? getMinorKeyName : getKeyName)(tonic.pitchClass) } });
                            }} />
                    </div> : <button className={styles.textAction} type="button" onClick={() => dispatch({ type: 'set-frame', frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' } })}>Set a key</button>}
                    <p className={styles.meta}>Pinned reference for this score, not a detected key. Patterns: major ii–V–I, V–I, IV–I; minor V–i, iv–i. Roman labels are conditional; accidentals use a major-scale reference in both modes.</p>
                </div>
            </div>
        </details>
        {state.document && state.selection && <div className={styles.resultLayout}>
            <div className={styles.scoreSection}>
                <div className={styles.sectionHeading}><h2 ref={scoreHeading} tabIndex={-1}>Your tab</h2><span className={styles.meta}>{state.documentName || 'Untitled'} · {state.document.measureCount} bars · {state.document.moments.length} positions</span></div>
                <p className={styles.meta}>Free timing · Positions are not beats.</p>
                <div className={styles.analysisToolbar}>
                    <button type="button" className={styles.textAction} onClick={openKeyContext} aria-expanded={contextOpen}>
                        {state.context.frame ? `Key: ${keyTitle}` : 'Add key for Roman / progression'}
                    </button>
                    <div className={styles.actions}>
                        {state.analysisStatus === 'fresh' && <button className={styles.textAction} type="button" aria-pressed={annotationsVisible} onClick={() => setAnnotationsVisible(visible => !visible)}>Annotations <span aria-hidden="true">{annotationsVisible ? '●' : '○'}</span></button>}
                        <button className={styles.primary} type="button" disabled={draftStatus === 'invalid' || (!hasNotes && draftStatus !== 'note')} onClick={() => { cancelRead(); dispatch({ type: 'analyze', scope: 'all' }); setAnnotationsVisible(true); }}>Analyze</button>
                    </div>
                </div>
                <p className={styles.meta} role="status" aria-label="Analysis status">{state.analysisStatus === 'stale' ? 'Score or context changed. Analyze again to update annotations.'
                    : state.analysisStatus === 'fresh' ? `Analyzed whole score. ${annotations.length ? 'Select a score annotation for its evidence.' : 'No supported pattern found in this score.'}`
                        : hasNotes ? 'Ready to analyze. Notes stay editable on the score.' : 'Click a string and type a fret to begin.'}</p>
                <TabScoreView document={state.document} selection={state.selection} extend={false} focusedNoteId={null}
                    onDraftStatusChange={setDraftStatus}
                    annotations={annotationsVisible ? annotations : []}
                    activeCell={state.activeCell ?? { momentId: state.document.moments[0].id, string: 0 }}
                    onActiveCellChange={cell => dispatch({ type: 'set-active-cell', cell })}
                    onSetFret={edit => { cancelRead(); dispatch({ type: 'set-fret', ...edit }); }}
                    onUndo={() => dispatch({ type: 'undo' })} onRedo={() => dispatch({ type: 'redo' })}
                    onInsertMoment={afterId => dispatch({ type: 'insert-moment', afterId })}
                    onDeleteMoments={momentIds => dispatch({ type: 'delete-moments', momentIds })}
                    onSelect={selection => dispatch({ type: 'select', selection })} />
                <div className={styles.scoreTools}>
                    <button className={styles.textAction} type="button" disabled={state.past.length === 0} onClick={() => dispatch({ type: 'undo' })}>Undo</button>
                    <button className={styles.textAction} type="button" disabled={state.future.length === 0} onClick={() => dispatch({ type: 'redo' })}>Redo</button>
                    <span className={styles.meta}>Position {state.activeCell ? state.document.moments.findIndex(moment => moment.id === state.activeCell!.momentId) + 1 : 1}</span>
                    <button className={styles.textAction} type="button" disabled={state.document.moments.length > 1008} onClick={() => dispatch({ type: 'add-measures', count: 4 })}>+ 4 bars</button>
                    <details className={styles.structureTools}>
                        <summary>Structure</summary>
                        <div className={styles.actions}>
                            <button className={styles.textAction} type="button" onClick={() => dispatch({ type: 'split-measure', afterId: state.activeCell?.momentId ?? state.document!.moments[state.selection!.end].id })}>Barline after cursor</button>
                        </div>
                    </details>
                </div>
                <p className={`${styles.meta} ${styles.desktopHint}`}>Click a string to type · Hover between columns for + · Drag column headers, then Delete · Arrow keys move.</p>
                <p className={`${styles.meta} ${styles.touchHint}`}>Tap a string to type · Tap + to add · Hold a column header dot to delete.</p>
            </div>
        </div>}
    </section>;
}
