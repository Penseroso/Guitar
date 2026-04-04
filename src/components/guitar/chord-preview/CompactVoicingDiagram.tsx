"use client";

import React from 'react';

import { getNoteName } from '../../../utils/guitar/logic';
import type { ResolvedVoicing } from '../../../utils/guitar/chords';
import { getVoicingDisplayName } from '../../../utils/guitar/chords';

interface CompactVoicingDiagramProps {
    voicing: ResolvedVoicing;
    labelMode?: 'degree' | 'note' | 'none';
}

export function CompactVoicingDiagram({
    voicing,
    labelMode = 'degree',
}: CompactVoicingDiagramProps) {
    const frettedNotes = voicing.notes.filter((note) => !note.isMuted && note.fret > 0);

    let minFret = 1;
    let maxFret = 4;

    if (frettedNotes.length > 0) {
        minFret = Math.min(...frettedNotes.map((note) => note.fret));
        const actualMaxFret = Math.max(...frettedNotes.map((note) => note.fret));
        maxFret = actualMaxFret - minFret < 3 ? minFret + 3 : actualMaxFret;
    }

    const fretCount = maxFret - minFret + 1;
    const xPadding = 28;
    const topPadding = 34;
    const bottomPadding = 18;
    const stringSpacing = 20;
    const fretSpacing = 24;
    const width = xPadding * 2 + stringSpacing * 5;
    const height = topPadding + bottomPadding + fretSpacing * fretCount;

    const getStringX = (string: number) => xPadding + (5 - string) * stringSpacing;
    const getFretCenterY = (fret: number) => topPadding + (fret - minFret) * fretSpacing + fretSpacing / 2;
    const getFretLineY = (lineIndex: number) => topPadding + lineIndex * fretSpacing;

    return (
        <div className="flex flex-col items-center">
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="overflow-visible"
                aria-label={`${getVoicingDisplayName(voicing.descriptor)} diagram`}
                role="img"
            >
                <rect width={width} height={height} fill="transparent" />

                {minFret === 1 ? (
                    <line
                        x1={getStringX(5)}
                        y1={getFretLineY(0)}
                        x2={getStringX(0)}
                        y2={getFretLineY(0)}
                        stroke="#f8fafc"
                        strokeWidth="4"
                    />
                ) : (
                    <text
                        x={getStringX(5) - 24}
                        y={getFretLineY(0) + fretSpacing / 2}
                        fill="#94a3b8"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="start"
                        alignmentBaseline="middle"
                    >
                        {minFret}fr
                    </text>
                )}

                {Array.from({ length: fretCount + 1 }).map((_, index) => (
                    minFret === 1 && index === 0 ? null : (
                        <line
                            key={`fret-${index}`}
                            x1={getStringX(5)}
                            y1={getFretLineY(index)}
                            x2={getStringX(0)}
                            y2={getFretLineY(index)}
                            stroke="#475569"
                            strokeWidth="2"
                        />
                    )
                ))}

                {Array.from({ length: 6 }).map((_, index) => {
                    const string = 5 - index;

                    return (
                        <line
                            key={`string-${string}`}
                            x1={getStringX(string)}
                            y1={getFretLineY(0)}
                            x2={getStringX(string)}
                            y2={getFretLineY(fretCount)}
                            stroke="#475569"
                            strokeWidth="2"
                        />
                    );
                })}

                {Array.from({ length: 6 }).map((_, index) => {
                    const string = 5 - index;
                    const note = voicing.notes.find((entry) => entry.string === string);

                    if (!note || note.isMuted) {
                        return (
                            <text
                                key={`mute-${string}`}
                                x={getStringX(string)}
                                y={topPadding - 14}
                                fill="#475569"
                                fontSize="12"
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                x
                            </text>
                        );
                    }

                    if (note.fret === 0) {
                        return (
                            <text
                                key={`open-${string}`}
                                x={getStringX(string)}
                                y={topPadding - 14}
                                fill="#e2e8f0"
                                fontSize="12"
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                o
                            </text>
                        );
                    }

                    return null;
                })}

                {frettedNotes.map((note) => {
                    const label = labelMode === 'note'
                        ? getNoteName(note.pitchClass)
                        : labelMode === 'degree'
                            ? (note.isRoot ? 'R' : (note.degree ?? ''))
                            : '';
                    const isRoot = note.isRoot;

                    return (
                        <g key={`${note.string}-${note.fret}-${note.degree ?? 'note'}`}>
                            <circle
                                cx={getStringX(note.string)}
                                cy={getFretCenterY(note.fret)}
                                r="8"
                                fill={isRoot ? '#f8fafc' : '#050505'}
                                stroke={isRoot ? '#f8fafc' : '#475569'}
                                strokeWidth="2"
                            />
                            {label && (
                                <text
                                    x={getStringX(note.string)}
                                    y={getFretCenterY(note.fret)}
                                    fill={isRoot ? '#020617' : '#e2e8f0'}
                                    fontSize="8"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                    alignmentBaseline="central"
                                >
                                    {label}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
