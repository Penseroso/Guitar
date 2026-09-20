"use client";

import React from 'react';

import { TabsRail } from '../../ui/design-system/TabsRail';
import { ChordsBuiltFromScalePanel } from './ChordsBuiltFromScalePanel';
import { PlayThisScaleOverPanel } from './PlayThisScaleOverPanel';

interface ScaleHarmonicBridgePanelProps {
    scaleGroup: string;
    scaleName: string;
    tonicPitchClass: number;
}

type BridgeTab = 'play-over' | 'built-from';

const BRIDGE_TABS = [
    { id: 'play-over', label: 'Play this scale over' },
    { id: 'built-from', label: 'Chords built from this scale' },
];

/**
 * The bridge from scale visualization to practical harmony. Two different questions, computed by
 * two independent domain modules and never merged into one list.
 */
export function ScaleHarmonicBridgePanel(props: ScaleHarmonicBridgePanelProps) {
    const [tab, setTab] = React.useState<BridgeTab>('play-over');

    return (
        <div className="flex flex-col gap-4 bg-[#050505]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm animate-in fade-in duration-500">
            <TabsRail tabs={BRIDGE_TABS} activeId={tab} onChange={(id) => setTab(id as BridgeTab)} />
            {tab === 'play-over' ? <PlayThisScaleOverPanel {...props} /> : <ChordsBuiltFromScalePanel {...props} />}
        </div>
    );
}
