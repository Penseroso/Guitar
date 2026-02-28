import React from 'react';
import { Fingering } from '../../utils/guitar/types';
import { getNoteName } from '../../utils/guitar/logic';

interface ChordBoxProps {
    fingering: Fingering[];
    labelMode: 'dot' | 'interval' | 'note';
    isMagnified: boolean;
}

export const ChordBox: React.FC<ChordBoxProps> = ({ fingering, labelMode, isMagnified }) => {
    // Determine bounds
    const frettedNotes = fingering.filter(f => f.fret > 0);
    const hasOpenNotes = fingering.some(f => f.fret === 0);

    let minFret = 1;
    let maxFret = 4;

    if (frettedNotes.length > 0) {
        minFret = Math.min(...frettedNotes.map(f => f.fret));
        const actualMax = Math.max(...frettedNotes.map(f => f.fret));

        // Ensure at least 4 frets wide (e.g., frets 1-4)
        if (actualMax - minFret < 3) {
            maxFret = minFret + 3;
        } else {
            maxFret = actualMax;
        }
    }

    const numFrets = maxFret - minFret + 1;

    // SVG Dimensions
    const xPadding = 30;
    const topPadding = 40;
    const bottomPadding = 20;

    const stringSpacing = isMagnified ? 35 : 20;
    const fretSpacing = isMagnified ? 45 : 25;

    const width = xPadding * 2 + stringSpacing * 5;
    const height = topPadding + bottomPadding + fretSpacing * numFrets;

    // Helper to get X position for a string (0 = High E, 5 = Low E)
    // Leftmost is Low E (5), Rightmost is High E (0)
    const getStringX = (s: number) => xPadding + (5 - s) * stringSpacing;

    // Helper to get Y position for a fret
    // Fret 1 starts at topPadding.
    const getFretY = (f: number) => {
        // We draw the nut or fret line
        // The notes go BETWEEN lines.
        // Fret line i is at topPadding + i * fretSpacing
        // A note at fret f in this diagram bounds (f >= minFret)
        const relativeFret = f - minFret; // 0-based index from top of diagram
        return topPadding + relativeFret * fretSpacing + (fretSpacing / 2);
    };

    const getFretLineY = (lineIndex: number) => topPadding + lineIndex * fretSpacing;

    return (
        <div className="flex flex-col items-center">
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="overflow-visible"
            >
                {/* Background (optional) */}
                <rect width={width} height={height} fill="transparent" />

                {/* Nut or Top thick line if minFret === 1 */}
                {minFret === 1 ? (
                    <line
                        x1={getStringX(5)}
                        y1={getFretLineY(0)}
                        x2={getStringX(0)}
                        y2={getFretLineY(0)}
                        stroke="#fff"
                        strokeWidth="4"
                    />
                ) : (
                    // Display starting fret number offset slightly to the left of the lowest string
                    <text
                        x={getStringX(5) - (isMagnified ? 35 : 25)}
                        y={getFretLineY(0) + fretSpacing / 2}
                        fill="#94a3b8"
                        fontSize={isMagnified ? "16" : "12"}
                        fontWeight="bold"
                        textAnchor="start"
                        alignmentBaseline="middle"
                    >
                        {minFret}fr
                    </text>
                )}

                {/* Fret Lines (Horizontal) */}
                {Array.from({ length: numFrets + 1 }).map((_, i) => (
                    // Skip the top line if it's the nut (minFret === 1) since we drew a thick one
                    (minFret === 1 && i === 0) ? null :
                        <line
                            key={`fret-${i}`}
                            x1={getStringX(5)}
                            y1={getFretLineY(i)}
                            x2={getStringX(0)}
                            y2={getFretLineY(i)}
                            stroke="#475569"
                            strokeWidth="2"
                        />
                ))}

                {/* String Lines (Vertical) */}
                {Array.from({ length: 6 }).map((_, i) => {
                    const s = 5 - i; // 5 = Low E, ..., 0 = High E
                    return (
                        <line
                            key={`string-${s}`}
                            x1={getStringX(s)}
                            y1={getFretLineY(0)}
                            x2={getStringX(s)}
                            y2={getFretLineY(numFrets)}
                            stroke="#475569"
                            strokeWidth="2"
                        />
                    );
                })}

                {/* Open / Muted Labels above the strings */}
                {Array.from({ length: 6 }).map((_, i) => {
                    const s = 5 - i;
                    const f = fingering.find(f => f.string === s);

                    const labelY = topPadding - 15;
                    const fontSize = isMagnified ? "16" : "12";

                    if (!f || f.fret < 0) {
                        // Muted (X)
                        return (
                            <text
                                key={`mute-${s}`}
                                x={getStringX(s)}
                                y={labelY}
                                fill="#475569"
                                fontSize={fontSize}
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                x
                            </text>
                        );
                    } else if (f.fret === 0) {
                        // Open (O)
                        return (
                            <text
                                key={`open-${s}`}
                                x={getStringX(s)}
                                y={labelY}
                                fill="#e2e8f0"
                                fontSize={fontSize}
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                ○
                            </text>
                        );
                    }
                    return null;
                })}

                {/* Fretted Notes */}
                {frettedNotes.map((f, idx) => {
                    const cx = getStringX(f.string);
                    const cy = getFretY(f.fret);
                    const radius = isMagnified ? 14 : 8;

                    const isRoot = f.label === 'R' || f.label === '•' && f.noteIdx !== undefined; // Adjust depending on actual logic for root
                    const isRootByLabel = f.label === 'R';

                    const fill = isRootByLabel ? "#fff" : "#050505";
                    const stroke = isRootByLabel ? "#fff" : "#475569";

                    let displayText = "";
                    if (labelMode === 'interval') {
                        displayText = f.label === '•' ? '' : (f.label || '');
                    } else if (labelMode === 'note' && f.noteIdx !== undefined) {
                        displayText = getNoteName(f.noteIdx);
                    }

                    return (
                        <g key={`note-${idx}`}>
                            <circle
                                cx={cx}
                                cy={cy}
                                r={radius}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth="2"
                            />
                            {labelMode !== 'dot' && displayText && (
                                <text
                                    x={cx}
                                    y={cy + (isMagnified ? 1 : 0)}
                                    fill={isRootByLabel ? "#000" : "#e2e8f0"}
                                    fontSize={isMagnified ? "12" : "8"}
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                    alignmentBaseline="central"
                                >
                                    {displayText}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
