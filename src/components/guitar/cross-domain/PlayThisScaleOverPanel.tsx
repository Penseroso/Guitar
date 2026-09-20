"use client";

import React from 'react';

import { getScaleCompatibleChords, type ScaleCompatibleChord } from '@/domain/chord/chord-scale-compatibility';
import { getScaleDisplayName } from '@/domain/scale';
import { formatAccidentals, formatNoteName } from '@/domain/shared/spelling';

interface PlayThisScaleOverPanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
}

function chordName(chord: ScaleCompatibleChord) {
    return formatAccidentals(`${chord.rootNoteName}${chord.chordSuffix}`);
}

function ChordCard({ chord }: { chord: ScaleCompatibleChord }) {
    return (
        <li className="rounded-[1rem] border border-white/6 bg-white/[0.02] px-3.5 py-3 flex flex-col gap-1.5">
            <span className="text-[15px] font-bold leading-none text-white">{chordName(chord)}</span>
            <span className="text-xs text-white/40">{chord.toneNames.map(formatNoteName).join(' ')}</span>
            {chord.tonesOutsideScale.length > 0 && (
                <span className="text-xs text-white/40">
                    The scale replaces {chord.tonesOutsideScale.map(formatNoteName).join(' and ')}
                </span>
            )}
        </li>
    );
}

export function PlayThisScaleOverPanel({ scaleGroup, scaleName, tonicPitchClass }: PlayThisScaleOverPanelProps) {
    const chords = React.useMemo(
        () => getScaleCompatibleChords(scaleGroup, scaleName, tonicPitchClass),
        [scaleGroup, scaleName, tonicPitchClass]
    );

    const canonical = chords.filter((chord) => chord.basis === 'canonical');
    const containment = chords.filter((chord) => chord.basis === 'containment');
    const scaleLabel = chords.length > 0
        ? `${formatNoteName(chords[0].rootNoteName)} ${getScaleDisplayName(scaleName)}`
        : getScaleDisplayName(scaleName);

    return (
        <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-3">
                <p className="text-sm text-white/50">
                    Chords that {scaleLabel} is the standard scale to play over.
                </p>
                {canonical.length === 0 ? (
                    <p className="text-sm text-white/40">
                        No chord in the library has {scaleLabel} as its standard scale.
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {canonical.map((chord) => <ChordCard key={chord.chordId} chord={chord} />)}
                    </ul>
                )}
            </section>

            {containment.length > 0 && (
                <section className="flex flex-col gap-3">
                    <p className="text-sm text-white/50">
                        Other chords whose every note is in {scaleLabel}.
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {containment.map((chord) => <ChordCard key={chord.chordId} chord={chord} />)}
                    </ul>
                </section>
            )}
        </div>
    );
}
