"use client";

import React from 'react';

import { Fretboard } from '../shared/Fretboard';
import { TogglePill } from '../../ui/design-system/TogglePill';
import { SlidersHorizontal } from 'lucide-react';
import type { HarmonicInterval, PlayableDoubleStop } from '@/domain/scale/types';
import { DOUBLE_STOP_HARMONIC_INTERVALS, getDoubleStopStringPairOptions } from '@/domain/scale/doubleStops';
import type { Fingering } from '@/domain/shared/types';
import { ScaleHarmonicBridgePanel } from '../cross-domain/ScaleHarmonicBridgePanel';
import { ScaleRootNavigator } from './ScaleRootNavigator';
import { ScaleSelectorPanel } from './ScaleSelectorPanel';
import styles from './scale-workspace.module.css';
import analysisStyles from './scale-analysis.module.css';
import { ScaleRelationsPanel } from './ScaleRelationsPanel';
import type { ScaleRef } from '@/domain/scale/scale-ref';
import type { ScaleToneAnalysis } from '@/domain/chord/scale-tone-analysis';
import { getKeyName } from '@/domain/shared/keys';
import { parseDegreeLabel, parseNoteName, spellDegree } from '@/domain/shared/spelling';
import type { FretboardProps } from '@/domain/shared/types';

// Top-level Scale workspace — a sibling of ChordModeWorkspace, not a child of the old
// Controls+giant-visualization-shell architecture. The fretboard is the primary main-column
// object; root/scale-family/mode navigation lives in a right-side context rail (stacking below
// main on narrower layouts). Reuses CircleOfFifths/ScaleSelectorPanel/ScaleOrbit and their
// underlying domain logic unchanged — this is a layout refactor only.
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
    const [toneFocus, setToneFocus] = React.useState<{ scaleId: string; interval: number } | null>(null);
    if (toneFocus && toneFocus.scaleId !== scaleRef.scaleId) setToneFocus(null);
    const focusedInterval = toneFocus?.scaleId === scaleRef.scaleId ? toneFocus.interval : null;
    const [fretRange, setFretRange] = React.useState<[number, number]>([0, 24]);
    const [visibleStrings, setVisibleStrings] = React.useState([0, 1, 2, 3, 4, 5]);
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
    const focusTone = (interval: number | null) => setToneFocus(interval === null ? null : { scaleId: scaleRef.scaleId, interval });
    return (
        <section className={styles.workspace} aria-label="Scale workspace">
            <div className={styles.layout}>
                <div className={styles.main}>
                    <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-2">
                            <SlidersHorizontal size={14} className="text-white/40" />
                            <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Visualization Overrides</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            <TogglePill label={showIntervals ? "Mode: Note" : "Mode: Interval"} isActive={showIntervals} onToggle={onToggleIntervals} hideDot={true} />
                            <fieldset disabled={!analysis?.chord} title={!analysis?.chord ? 'Select a chord in Play this scale over first.' : undefined} className="min-w-0 disabled:opacity-40">
                                <TogglePill label="Chord Tones" isActive={showChordTones && !!analysis?.chord} onToggle={onToggleChordTones} colorTheme="chord-tones" />
                            </fieldset>

                            {isPentatonic && (
                                <TogglePill label="Add Blue Note" isActive={blueNote} onToggle={onToggleBlueNote} />
                            )}
                            {isPentatonic && scaleName === "Minor Pentatonic" && (
                                <>
                                    <TogglePill label="Add 2 (9th)" isActive={secondNote} onToggle={onToggleSecondNote} />
                                    <TogglePill label="Add 6th Note" isActive={sixthNote} onToggle={onToggleSixthNote} />
                                </>
                            )}

                            {isDoubleStopAvailable && (
                                <div className="flex flex-col gap-2 col-span-2">
                                    <div className="flex items-center justify-between">
                                        <TogglePill label="Double Stops" isActive={isDoubleStopVisible} onToggle={onToggleDoubleStop} />
                                    </div>
                                    {isDoubleStopVisible && (
                                        <div className="flex flex-col gap-3 mt-1 p-3 bg-white/[0.03] border border-white/5 rounded-2xl animate-in fade-in duration-300">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Interval</span>
                                                <div className="flex gap-2">
                                                    {DOUBLE_STOP_HARMONIC_INTERVALS.map((int) => {
                                                        const hasValidPairs = harmonicDoubleStopPairsByInterval[int].length > 0;

                                                        return (
                                                            <button
                                                                key={int}
                                                                disabled={!hasValidPairs}
                                                                onClick={() => {
                                                                    onDoubleStopIntervalChange(int);
                                                                    onDoubleStopStringsChange(getDoubleStopStringPairOptions(int)[0]);
                                                                }}
                                                                className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all ${!hasValidPairs ? 'border-white/5 text-white/15 cursor-not-allowed opacity-40' : doubleStopInterval === int ? 'bg-white/10 text-white border-white/30 shadow-lg' : 'border-white/5 text-white/30 hover:text-white/70'}`}
                                                            >
                                                                {int}{int === 3 ? 'rd' : 'th'}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 border-t border-white/5 pt-2">
                                                <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">String Pair</span>
                                                <div className="flex gap-2 flex-wrap">
                                                    {getDoubleStopStringPairOptions(doubleStopInterval).map(([s1, s2]) => (
                                                        <button
                                                            key={`${s1}-${s2}`}
                                                            onClick={() => onDoubleStopStringsChange([s1, s2] as [number, number])}
                                                            className={`px-2 py-1.5 text-[9px] font-black rounded-lg border transition-all ${doubleStopStrings[0] === s1 && doubleStopStrings[1] === s2 ? 'bg-white/10 text-white border-white/30 shadow-lg' : 'border-white/5 text-white/30 hover:text-white/70'}`}
                                                        >
                                                            {s1 + 1}-{s2 + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <section className={analysisStyles.panel} aria-label="Fretboard practice range">
                        <h2 className={analysisStyles.heading}>Practice range</h2>
                        <div className={analysisStyles.practice}>
                            <label className={analysisStyles.stack}>First fret<input type="number" className={analysisStyles.number} min={0} max={fretRange[1]} value={fretRange[0]} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value)) setFretRange([Math.max(0, Math.min(fretRange[1], value)), fretRange[1]]); }} /></label>
                            <label className={analysisStyles.stack}>Last fret<input type="number" className={analysisStyles.number} min={fretRange[0]} max={24} value={fretRange[1]} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value)) setFretRange([fretRange[0], Math.min(24, Math.max(fretRange[0], value))]); }} /></label>
                            <fieldset className={analysisStyles.stack}><legend>Strings · 1 is high E</legend><div className={analysisStyles.actions}>{[0, 1, 2, 3, 4, 5].map(string => <button type="button" key={string} className={analysisStyles.button} aria-label={`String ${string + 1}`} aria-pressed={visibleStrings.includes(string)} disabled={visibleStrings.length === 1 && visibleStrings[0] === string} onClick={() => setVisibleStrings(previous => previous.includes(string) ? previous.filter(item => item !== string) : [...previous, string].sort())}>{string + 1}</button>)}</div></fieldset>
                            <button type="button" className={analysisStyles.button} onClick={() => { setFretRange([0, 24]); setVisibleStrings([0, 1, 2, 3, 4, 5]); focusTone(null); }}>Reset practice view</button>
                        </div>
                    </section>
                    <div className="border-y border-white/5 py-8 flex items-center justify-center relative overflow-hidden bg-white/[0.01] rounded-3xl">
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
                    <ScaleRelationsPanel key={scaleRef.scaleId} scaleRef={scaleRef} onNavigateScale={onNavigateScale} />
                </div>

                <aside className={styles.rail} aria-label="Scale navigation">
                    <ScaleRootNavigator
                        selectedKey={selectedKey}
                        onKeyChange={onKeyChange}
                        selectedScaleGroup={scaleGroup}
                        selectedScaleName={scaleName}
                    />
                    <ScaleSelectorPanel
                        selectedScaleGroup={scaleGroup}
                        selectedScaleName={scaleName}
                        onScaleChange={onScaleChange}
                    />
                </aside>
            </div>
        </section>
    );
}
