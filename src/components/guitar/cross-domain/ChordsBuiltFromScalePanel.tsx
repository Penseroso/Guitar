"use client";

import React from 'react';

import { getScaleHarmonization } from '@/domain/chord/scale-harmonization';
import { getScaleDisplayName } from '@/domain/scale';
import { formatAccidentals } from '@/domain/shared/spelling';
import { TabsRail } from '../../ui/design-system/TabsRail';

interface ChordsBuiltFromScalePanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
}

type ChordLength = 'triads' | 'sevenths';

const LENGTH_TABS = [
    { id: 'triads', label: 'Triads' },
    { id: 'sevenths', label: 'Sevenths' },
];

export function ChordsBuiltFromScalePanel({ scaleGroup, scaleName, tonicPitchClass }: ChordsBuiltFromScalePanelProps) {
    const [length, setLength] = React.useState<ChordLength>('triads');
    const harmonization = React.useMemo(
        () => getScaleHarmonization(scaleGroup, scaleName, tonicPitchClass),
        [scaleGroup, scaleName, tonicPitchClass]
    );
    const scaleLabel = getScaleDisplayName(scaleName);

    if (!harmonization.defined) {
        return (
            <p className="text-sm text-white/40">
                Stacking notes in thirds is a seven-note idea. {scaleLabel} has {harmonization.pitchClassCount} notes, so standard
                chord-by-chord harmonization is not shown for it.
            </p>
        );
    }

    const chords = length === 'triads' ? harmonization.triads : harmonization.sevenths;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-white/50">
                    The chord you get by stacking {scaleLabel} notes in thirds on each scale degree.
                </p>
                <TabsRail tabs={LENGTH_TABS} activeId={length} onChange={(id) => setLength(id as ChordLength)} />
            </div>

            <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {chords.map((chord, index) => (
                    <li
                        key={index}
                        className="rounded-[1rem] border border-white/6 bg-white/[0.02] px-3 py-3 flex flex-col gap-1.5"
                    >
                        <span className="text-xs font-semibold text-white/40">{chord?.romanNumeral ?? '—'}</span>
                        <span className="text-[15px] font-bold leading-none text-white">
                            {chord ? formatAccidentals(`${chord.rootNoteName}${chord.chordSuffix}`) : 'No chord'}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
