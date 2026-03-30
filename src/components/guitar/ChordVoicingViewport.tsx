"use client";

import React, { useEffect, useMemo, useState } from 'react';

import { ChordBox } from './_deprecated/chord-gallery/ChordBox';
import { getNoteName } from '../../utils/guitar/logic';
import { getRankedVoicingsForChord, resolveChordRegistryEntry, type VoicingCandidate } from '../../utils/guitar/chords';
import type { Fingering } from '../../utils/guitar/types';

interface ChordVoicingViewportProps {
    chordType: string;
    selectedKey: number;
}

function buildChordLabel(chordType: string, selectedKey: number): string {
    try {
        const entry = resolveChordRegistryEntry(chordType);
        const root = getNoteName(selectedKey);
        return entry.symbol ? `${root}${entry.symbol}` : `${root} ${entry.displayName}`;
    } catch {
        return `${getNoteName(selectedKey)} ${chordType}`;
    }
}

function buildFingeringFromCandidate(candidate: VoicingCandidate): Fingering[] {
    return candidate.voicing.notes.map((note) => ({
        string: note.string,
        fret: note.isMuted ? -1 : note.fret,
        noteIdx: note.isMuted ? -1 : note.pitchClass,
        label: note.isMuted ? 'X' : (note.isRoot ? 'R' : (note.degree ?? '•')),
    }));
}

function renderDegreeList(title: string, degrees: string[] | undefined, emptyLabel: string) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">{title}</span>
            <span className="text-xs font-semibold text-white/75">
                {degrees && degrees.length > 0 ? degrees.join(' · ') : emptyLabel}
            </span>
        </div>
    );
}

export function ChordVoicingViewport({ chordType, selectedKey }: ChordVoicingViewportProps) {
    const candidates = useMemo(() => {
        try {
            return getRankedVoicingsForChord(chordType, selectedKey, {
                maxRootFret: 15,
                maxCandidates: 4,
            });
        } catch {
            return [];
        }
    }, [chordType, selectedKey]);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        setActiveIndex(0);
    }, [chordType, selectedKey]);

    const activeCandidate = candidates[activeIndex] ?? candidates[0];

    if (!activeCandidate) {
        return null;
    }

    const fingering = buildFingeringFromCandidate(activeCandidate);
    const chordLabel = buildChordLabel(chordType, selectedKey);

    return (
        <div className="rounded-[2rem] border border-white/5 bg-[#050505] p-6 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/30">Future Engine Preview</span>
                    <div className="flex items-end gap-3">
                        <h3 className="text-3xl font-black text-white tracking-tight">{chordLabel}</h3>
                        <span className="pb-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                            {candidates.length} ranked voicings
                        </span>
                    </div>
                </div>

                <div className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.25em] ${
                    activeCandidate.voicing.playable
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                }`}>
                    {activeCandidate.voicing.playable ? 'Playable' : 'Needs Work'}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6">
                <div className="rounded-[1.5rem] border border-white/5 bg-[#0a0a0a] p-4 flex items-center justify-center">
                    <ChordBox fingering={fingering} labelMode="interval" isMagnified={false} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Selected Voicing</span>
                            <span className="text-[10px] font-black text-white/50">
                                {activeCandidate.voicing.template?.label} @ {activeCandidate.voicing.rootFret}fr
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {renderDegreeList('Missing Required', activeCandidate.voicing.missingRequiredDegrees, 'None')}
                            {renderDegreeList('Omitted Optional', activeCandidate.voicing.omittedOptionalDegrees, 'None')}
                            {renderDegreeList('Matched Required', activeCandidate.matchedRequiredDegrees, 'None')}
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Shape</span>
                                <span className="text-xs font-semibold text-white/75">
                                    Span {activeCandidate.voicing.span} · Score {activeCandidate.score}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-3">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Why It Ranked Here</span>
                        <div className="flex flex-col gap-2">
                            {activeCandidate.reasons.slice(0, 4).map((reason) => (
                                <div key={reason} className="text-xs text-white/70 border border-white/5 bg-black/20 rounded-xl px-3 py-2">
                                    {reason}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {candidates.map((candidate, index) => (
                    <button
                        key={candidate.voicing.id}
                        onClick={() => setActiveIndex(index)}
                        className={`text-left rounded-[1.25rem] border p-4 transition-all ${
                            index === activeIndex
                                ? 'border-white/30 bg-white/10'
                                : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-white">{candidate.voicing.template?.label}</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                                    {candidate.voicing.rootFret}fr · #{index + 1}
                                </span>
                            </div>
                            <span className="text-[10px] font-black text-white/60">{candidate.score}</span>
                        </div>

                        <div className="text-[11px] text-white/60">
                            {(candidate.voicing.missingRequiredDegrees?.length ?? 0) > 0
                                ? `Missing ${candidate.voicing.missingRequiredDegrees?.join(', ')}`
                                : 'Required tones intact'}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
