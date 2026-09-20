"use client";

import React from 'react';

import { getScaleCompatibleChords } from '@/domain/chord/chord-scale-compatibility';
import { getScaleDisplayName } from '@/domain/scale';
import { getKeyName } from '@/domain/shared/keys';

interface PlayThisScaleOverPanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
}

export function PlayThisScaleOverPanel({ scaleGroup, scaleName, tonicPitchClass }: PlayThisScaleOverPanelProps) {
    const chords = React.useMemo(
        () => getScaleCompatibleChords(scaleGroup, scaleName, tonicPitchClass),
        [scaleGroup, scaleName, tonicPitchClass]
    );
    const scaleLabel = `${getKeyName(tonicPitchClass)} ${getScaleDisplayName(scaleName)}`;

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-white/50">
                Chords on {getKeyName(tonicPitchClass)} you can play {scaleLabel} over — every note of the chord is in the scale.
            </p>

            {chords.length === 0 ? (
                <p className="text-sm text-white/40">No {getKeyName(tonicPitchClass)}-rooted chord in the library fits entirely inside this scale.</p>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {chords.map((chord) => (
                        <li
                            key={chord.chordId}
                            className="rounded-[1rem] border border-white/6 bg-white/[0.02] px-3.5 py-3 flex flex-col gap-1.5"
                        >
                            <span className="text-[15px] font-bold leading-none text-white">
                                {getKeyName(chord.rootPitchClass)}{chord.chordSuffix}
                            </span>
                            <span className="text-xs text-white/40">
                                {chord.formulaPitchClasses.map((pitchClass) => getKeyName(pitchClass)).join(' ')}
                            </span>
                            <span className={`text-xs ${chord.canonical ? 'text-white/70' : 'text-white/40'}`}>
                                {chord.canonical
                                    ? `Standard pairing for ${getScaleDisplayName(scaleName)}`
                                    : 'Every note is in this scale'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
