"use client";

import React from 'react';

import { getScaleCompatibleChords, type ScaleCompatibleChord } from '@/domain/chord/chord-scale-compatibility';
import { getScalePresentationName } from '@/domain/scale/scaleSelector';
import { formatAccidentals, formatNoteName } from '@/domain/shared/spelling';

interface PlayThisScaleOverPanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
    selectedChordId?: string | null;
    onSelectChord?: (chordId: string) => void;
}

function chordName(chord: ScaleCompatibleChord) {
    return formatAccidentals(`${chord.rootNoteName}${chord.chordSuffix}`);
}

function ChordCard({ chord, selected, onSelect }: { chord: ScaleCompatibleChord; selected: boolean; onSelect?: (id: string) => void }) {
    return (
        <li>
          <button type="button" aria-label={`Analyze ${chordName(chord)}`} aria-pressed={selected}
            onClick={() => onSelect?.(chord.chordId)}
            className={`w-full h-full text-left rounded-[1rem] border px-3.5 py-3 flex flex-col gap-1.5 focus-visible:outline-2 focus-visible:outline-cyan-200 ${selected ? 'border-cyan-200/60 bg-cyan-200/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'}`}>
            <span className="text-[15px] font-bold leading-none text-white">{chordName(chord)}</span>
            <span className="text-xs text-white/40">{chord.toneNames.map(formatNoteName).join(' ')}</span>
            {chord.tonesOutsideScale.length > 0 && (
                <span className="text-xs text-white/40">
                    Natural 5th ({chord.tonesOutsideScale.map(formatNoteName).join(', ')}) is altered in this scale
                </span>
            )}
          </button>
        </li>
    );
}

export function PlayThisScaleOverPanel({ scaleGroup, scaleName, tonicPitchClass, selectedChordId = null, onSelectChord }: PlayThisScaleOverPanelProps) {
    const chords = React.useMemo(
        () => getScaleCompatibleChords(scaleGroup, scaleName, tonicPitchClass),
        [scaleGroup, scaleName, tonicPitchClass]
    );

    const primary = chords.filter((chord) => chord.basis === 'primary');
    const characteristic = chords.filter((chord) => chord.basis === 'characteristic');
    const containment = chords.filter((chord) => chord.basis === 'containment');
    const scaleLabel = chords.length > 0
        ? `${formatNoteName(chords[0].rootNoteName)} ${getScalePresentationName(scaleName)}`
        : getScalePresentationName(scaleName);

    const hasCurated = primary.length > 0 || characteristic.length > 0;

    return (
        <div className="flex flex-col gap-5">
            {primary.length > 0 && (
                <section className="flex flex-col gap-3">
                    <p className="text-sm text-white/50">
                        Primary chords to play {scaleLabel} over.
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {primary.map((chord) => <ChordCard key={chord.chordId} chord={chord} selected={selectedChordId === chord.chordId} onSelect={onSelectChord} />)}
                    </ul>
                </section>
            )}

            {characteristic.length > 0 && (
                <section className="flex flex-col gap-3">
                    <p className="text-sm text-white/50">
                        Characteristic modal and color pairings for {scaleLabel}.
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {characteristic.map((chord) => <ChordCard key={chord.chordId} chord={chord} selected={selectedChordId === chord.chordId} onSelect={onSelectChord} />)}
                    </ul>
                </section>
            )}

            {!hasCurated && (
                <section className="flex flex-col gap-3">
                    <p className="text-sm text-white/40">
                        No curated standard chord pairings for {scaleLabel}.
                    </p>
                </section>
            )}

            {containment.length > 0 && (
                <section className="flex flex-col gap-3">
                    <p className="text-sm text-white/50">
                        Other chords whose every note is in {scaleLabel}.
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {containment.map((chord) => <ChordCard key={chord.chordId} chord={chord} selected={selectedChordId === chord.chordId} onSelect={onSelectChord} />)}
                    </ul>
                </section>
            )}
        </div>
    );
}
