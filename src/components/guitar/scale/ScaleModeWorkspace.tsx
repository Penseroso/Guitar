"use client";

import React from 'react';

import { Fretboard } from '../shared/Fretboard';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { HarmonicInterval, PlayableDoubleStop } from '@/domain/scale/types';
import { DOUBLE_STOP_HARMONIC_INTERVALS, getDoubleStopStringPairOptions } from '@/domain/scale/doubleStops';
import type { Fingering } from '@/domain/shared/types';
import { ScaleHarmonicBridgePanel } from '../cross-domain/ScaleHarmonicBridgePanel';
import { ScaleRootNavigator } from './ScaleRootNavigator';
import { ScaleSelectorPanel } from './ScaleSelectorPanel';
import styles from './scale-workspace.module.css';
import { PracticeRangeControl } from './PracticeRangeControl';
import { DiagramLabelSwitch } from '../shared/DiagramLabelSwitch';
import { getScalePresentationName } from '@/domain/scale/scaleSelector';
import { getScaleCompatibleChords } from '@/domain/chord/chord-scale-compatibility';
import { formatAccidentals } from '@/domain/shared/spelling';
import controlStyles from './scale-visual-controls.module.css';
import { ScaleRelationsPanel } from './ScaleRelationsPanel';
import type { ScaleRef } from '@/domain/scale/scale-ref';
import type { ScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';
import { getKeyName } from '@/domain/shared/keys';
import { parseDegreeLabel, parseNoteName, spellDegree } from '@/domain/shared/spelling';
import type { FretboardProps } from '@/domain/shared/types';

// One navigation instance: desktop context rail, mobile disclosure above the fretboard.
interface ScaleModeWorkspaceProps {
    scaleRef: ScaleRef;
    analysis: ScaleToneAnalysis | null;
    selectedChordId: string | null;
    onSelectChord: (id: string | null) => void;
    onNavigateScale: (ref: ScaleRef) => void;
    selectedKey: number;
    onKeyChange: (key: number) => void;
    scaleGroup: string;
    scaleName: string;
    onScaleChange: (group: string, name: string) => void;
    showIntervals: boolean;
    onToggleIntervals: () => void;
    showChordTones: boolean;
    onToggleChordTones: () => void;
    isPentatonic: boolean;
    blueNote: boolean;
    onToggleBlueNote: () => void;
    secondNote: boolean;
    onToggleSecondNote: () => void;
    sixthNote: boolean;
    onToggleSixthNote: () => void;
    isDoubleStopAvailable: boolean;
    isDoubleStopVisible: boolean;
    onToggleDoubleStop: () => void;
    doubleStopInterval: HarmonicInterval;
    onDoubleStopIntervalChange: (interval: HarmonicInterval) => void;
    doubleStopStrings: [number, number];
    onDoubleStopStringsChange: (value: [number, number]) => void;
    harmonicDoubleStopPairsByInterval: Record<HarmonicInterval, unknown[]>;
    fretboardContainerRef: React.RefObject<HTMLDivElement | null>;
    tuning: number[];
    activeNotes: number[];
    rootNote: number;
    chordTones: number[];
    modifierNotes: number[];
    scaleIntervalLabels: Partial<Record<number, string>>;
    fingering?: Fingering[];
    doubleStops: PlayableDoubleStop[];
}

export function ScaleModeWorkspace({
    scaleRef,
    analysis,
    selectedChordId,
    onSelectChord,
    onNavigateScale,
    selectedKey,
    onKeyChange,
    scaleGroup,
    scaleName,
    onScaleChange,
    showIntervals,
    onToggleIntervals,
    showChordTones,
    onToggleChordTones,
    isPentatonic,
    blueNote,
    onToggleBlueNote,
    secondNote,
    onToggleSecondNote,
    sixthNote,
    onToggleSixthNote,
    isDoubleStopAvailable,
    isDoubleStopVisible,
    onToggleDoubleStop,
    doubleStopInterval,
    onDoubleStopIntervalChange,
    doubleStopStrings,
    onDoubleStopStringsChange,
    harmonicDoubleStopPairsByInterval,
    fretboardContainerRef,
    tuning,
    activeNotes,
    rootNote,
    modifierNotes,
    scaleIntervalLabels,
    fingering,
    doubleStops,
}: ScaleModeWorkspaceProps) {
    const identity = `${scaleRef.scaleId}:${scaleRef.tonic}`;
    const [toneFocus, setToneFocus] = React.useState<{ identity: string; interval: number } | null>(null);
    if (toneFocus && toneFocus.identity !== identity) setToneFocus(null);
    const focusedInterval = toneFocus?.identity === identity ? toneFocus.interval : null;
    const [navigationOpen, setNavigationOpen] = React.useState(false);
    const navigationId = React.useId();
    const navigationTrigger = React.useRef<HTMLButtonElement>(null);
    const [fretRange, setFretRange] = React.useState<[number, number]>([0, 24]);
    const [visibleStrings, setVisibleStrings] = React.useState([0, 1, 2, 3, 4, 5]);
    const defaultChord = React.useMemo(() => getScaleCompatibleChords(scaleGroup, scaleName, rootNote)[0], [scaleGroup, scaleName, rootNote]);
    const chordTones = analysis?.chord ? analysis.tones.filter(tone => tone.chordMembership === 'member').map(tone => tone.pitchClass) : [];
    const noteAnnotations: NonNullable<FretboardProps['noteAnnotations']> = {};
    const tonicNote = parseNoteName(getKeyName(rootNote));
    for (const tone of analysis?.tones ?? []) {
        const degree = analysis?.chord ? tone.chordDegree ?? tone.scaleDegree : scaleIntervalLabels[tone.interval] ?? tone.scaleDegree;
        const parsed = parseDegreeLabel(degree);
        const noteName = analysis?.chord ? tone.chordNoteName ?? tone.scaleNoteName : (tonicNote && parsed ? spellDegree(tonicNote, parsed.number, tone.pitchClass)?.name : null) ?? tone.scaleNoteName;
        const member = tone.chordMembership === 'member';
        const role = tone.interval === 0 ? 'root' : !member ? 'scale' : parsed?.number === 3 ? 'third' : parsed?.number === 5 ? 'fifth' : parsed?.number === 7 ? 'seventh' : 'chord-tone';
        noteAnnotations[tone.pitchClass] = { noteName, intervalLabel: degree, role, characteristic: analysis?.identity.status === 'reviewed' && analysis.identity.markers.some(marker => marker.interval === tone.interval) };
    }
    const focusTone = (interval: number | null) => setToneFocus(interval === null ? null : { identity, interval });
    const toggleChordTones = () => {
        if (!analysis?.chord) {
            if (!defaultChord) return;
            onSelectChord(defaultChord.chordId);
            if (!showChordTones) onToggleChordTones();
            return;
        }
        onToggleChordTones();
    };
    return (
        <section className={styles.workspace} aria-label="Scale workspace">
            <div className={styles.layout}>
                <aside className={styles.rail} aria-label="Scale navigation">
                    <button ref={navigationTrigger} type="button" className={styles.navigationTrigger} aria-expanded={navigationOpen} aria-controls={navigationId}
                        onClick={() => setNavigationOpen(open => !open)}>
                        <span><span className={styles.navigationLabel}>Explore scale</span><strong>{getKeyName(selectedKey)} <span>{getScalePresentationName(scaleName)}</span></strong></span>
                        <ChevronDown size={18} aria-hidden="true" />
                    </button>
                    <div id={navigationId} className={styles.navigationContent} data-open={navigationOpen}>
                        <ScaleRootNavigator selectedKey={selectedKey} onKeyChange={onKeyChange} selectedScaleGroup={scaleGroup} selectedScaleName={scaleName} />
                        <ScaleSelectorPanel selectedScaleGroup={scaleGroup} selectedScaleName={scaleName} onScaleChange={onScaleChange} />
                        <button type="button" className={styles.navigationClose} onClick={() => { setNavigationOpen(false); navigationTrigger.current?.focus(); }}>Close scale navigator</button>
                    </div>
                </aside>
                <div className={styles.main}>
                    <section className={controlStyles.controls} aria-label="Visualization Overrides">
                        <div className={controlStyles.header}><SlidersHorizontal size={14} aria-hidden="true" /> Visualization Overrides</div>
                        <div className={controlStyles.row}>
                            <DiagramLabelSwitch showIntervals={showIntervals} onToggle={onToggleIntervals} />
                            <button type="button" className={controlStyles.toggle} aria-pressed={showChordTones && !!analysis?.chord}
                                disabled={!analysis?.chord && !defaultChord} onClick={toggleChordTones}
                                title={!analysis?.chord && defaultChord ? `Selects ${formatAccidentals(defaultChord.rootNoteName + defaultChord.chordSuffix)}` : undefined}>
                                Chord tones <span className={controlStyles.dot} aria-hidden="true" />
                            </button>
                            {isPentatonic && <button type="button" className={controlStyles.toggle} aria-pressed={blueNote} onClick={onToggleBlueNote}>Blue note <span className={controlStyles.dot} aria-hidden="true" /></button>}
                            {isPentatonic && scaleName === 'Minor Pentatonic' && <>
                                <button type="button" className={controlStyles.toggle} aria-pressed={secondNote} onClick={onToggleSecondNote}>Add 2 (9th) <span className={controlStyles.dot} aria-hidden="true" /></button>
                                <button type="button" className={controlStyles.toggle} aria-pressed={sixthNote} onClick={onToggleSixthNote}>Add 6th <span className={controlStyles.dot} aria-hidden="true" /></button>
                            </>}
                            {isDoubleStopAvailable && <button type="button" className={controlStyles.toggle} aria-pressed={isDoubleStopVisible} onClick={onToggleDoubleStop}>Double stops <span className={controlStyles.dot} aria-hidden="true" /></button>}
                        </div>
                        {isDoubleStopAvailable && isDoubleStopVisible && <div className={controlStyles.detail}>
                            <span className={controlStyles.detailLabel}>Interval</span>
                            {DOUBLE_STOP_HARMONIC_INTERVALS.map(interval => <button key={interval} type="button" aria-pressed={doubleStopInterval === interval}
                                disabled={!harmonicDoubleStopPairsByInterval[interval].length}
                                onClick={() => { onDoubleStopIntervalChange(interval); onDoubleStopStringsChange(getDoubleStopStringPairOptions(interval)[0]); }}>
                                {interval}{interval === 3 ? 'rd' : 'th'}
                            </button>)}
                            <span className={controlStyles.detailLabel}>Strings</span>
                            {getDoubleStopStringPairOptions(doubleStopInterval).map(([s1, s2]) => <button key={`${s1}-${s2}`} type="button"
                                aria-pressed={doubleStopStrings[0] === s1 && doubleStopStrings[1] === s2}
                                onClick={() => onDoubleStopStringsChange([s1, s2])}>{s1 + 1}–{s2 + 1}</button>)}
                        </div>}
                    </section>

                    <div className={styles.instrument}>
                    <div className={styles.fretboard}>
                        <div ref={fretboardContainerRef} className="overflow-x-auto overflow-y-hidden custom-scrollbar relative w-full flex justify-center py-2">
                            <Fretboard
                                tuning={tuning}
                                activeNotes={activeNotes}
                                rootNote={rootNote}
                                chordTones={chordTones}
                                modifierNotes={modifierNotes}
                                showChordTones={showChordTones && !!analysis?.chord}
                                showIntervals={showIntervals}
                                scaleIntervalLabels={scaleIntervalLabels}
                                fingering={fingering}
                                doubleStops={doubleStops}
                                noteAnnotations={noteAnnotations}
                                focusedPitchClass={focusedInterval === null ? null : (rootNote + focusedInterval) % 12}
                                fretRange={fretRange}
                                visibleStrings={visibleStrings}
                            />
                        </div>
                    </div>
                    <PracticeRangeControl fretRange={fretRange} visibleStrings={visibleStrings}
                        onRangeChange={(min, max) => setFretRange([min, max])} onStringsChange={setVisibleStrings}
                        hasToneFocus={focusedInterval !== null}
                        onReset={() => { setFretRange([0, 24]); setVisibleStrings([0, 1, 2, 3, 4, 5]); focusTone(null); }} />
                    </div>

                    <ScaleHarmonicBridgePanel
                        scaleGroup={scaleGroup}
                        scaleName={scaleName}
                        tonicPitchClass={rootNote}
                        selectedChordId={selectedChordId}
                        onSelectChord={onSelectChord}
                        analysis={analysis}
                        focusedInterval={focusedInterval}
                        onFocusTone={focusTone}
                    />
                    <ScaleRelationsPanel key={identity} scaleRef={scaleRef} onNavigateScale={onNavigateScale} />
                </div>
            </div>
        </section>
    );
}
