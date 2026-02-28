import React from 'react';
import { NOTES } from '../../../utils/guitar/theory';
import { getCircleOfFifthsOrder, getRelativeMinor } from '../../../utils/guitar/logic';

/**
 * 극좌표를 데카르트 좌표(x, y)로 변환
 */
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

/**
 * SVG Path를 위한 부채꼴(Wedge) 경로 생성
 */
const describeWedge = (x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, outerRadius, endAngle);
    const end = polarToCartesian(x, y, outerRadius, startAngle);
    const startInner = polarToCartesian(x, y, innerRadius, endAngle);
    const endInner = polarToCartesian(x, y, innerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
        "M", start.x, start.y,
        "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
        "L", endInner.x, endInner.y,
        "A", innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
        "Z"
    ].join(" ");
};

interface CircleOfFifthsProps {
    selectedKey: number;
    onKeySelect: (key: number) => void;
}



export const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({ selectedKey, onKeySelect }) => {
    const fifthsOrder = getCircleOfFifthsOrder();

    /**
     * 현재 선택된 Root Key 대비 타겟 음의 다이아토닉 역할 및 색상 반환
     */
    const getDiatonicRole = (targetKey: number, rootKey: number) => {
        const diff = (targetKey - rootKey + 12) % 12;
        switch (diff) {
            case 0: return { role: 'I', color: '#fde047' }; // Tonic (Yellow)
            case 2: return { role: 'ii', color: '#7dd3fc' }; // Supertonic (Light Blue)
            case 4: return { role: 'iii', color: '#7dd3fc' }; // Mediant (Light Blue)
            case 5: return { role: 'IV', color: '#86efac' }; // Subdominant (Light Green)
            case 7: return { role: 'V', color: '#86efac' }; // Dominant (Light Green)
            case 9: return { role: 'vi', color: '#7dd3fc' }; // Submediant (Light Blue)
            case 11: return { role: 'vii°', color: '#fca5a5' }; // Leading Tone (Light Red)
            default: return null;
        }
    };

    const strokeColor = "#334155"; // 고정 테두리 색상

    return (
        <div className="w-full h-full flex justify-center items-center p-2">
            <svg viewBox="-150 -150 300 300" className="w-full h-full max-w-[420px] max-h-[420px] overflow-visible">
                {/* 12개의 음 분할 렌더링 */}
                {fifthsOrder.map((keyIndex, i) => {
                    const relativeMinorIndex = getRelativeMinor(keyIndex);

                    // 12시 방향(C)을 기준으로 30도씩 배치 (-15도 offset으로 정중앙 배치)
                    const startAngle = i * 30 - 15;
                    const endAngle = i * 30 + 15;

                    const majorRole = getDiatonicRole(keyIndex, selectedKey);
                    const minorRole = getDiatonicRole(relativeMinorIndex, selectedKey);

                    const isTonicMajor = majorRole?.role === 'I';

                    // --- 경로 설정 (Radius 규격) ---
                    const majorDegreePath = describeWedge(0, 0, 115, 140, startAngle, endAngle);
                    const majorNotePath = describeWedge(0, 0, 80, 115, startAngle, endAngle);
                    const minorNotePath = describeWedge(0, 0, 45, 80, startAngle, endAngle);
                    const minorDegreePath = describeWedge(0, 0, 20, 45, startAngle, endAngle);

                    // --- 텍스트 좌표 설정 ---
                    const majorDegreePos = polarToCartesian(0, 0, 127.5, i * 30);
                    const majorNotePos = polarToCartesian(0, 0, 97.5, i * 30);
                    const minorNotePos = polarToCartesian(0, 0, 62.5, i * 30);
                    const minorDegreePos = polarToCartesian(0, 0, 32.5, i * 30);

                    // --- 스타일링 로직 ---
                    const majorDegreeFill = majorRole ? majorRole.color : "transparent";
                    const majorNoteFill = isTonicMajor ? '#fde047' : (majorRole ? '#1e293b' : '#0f172a');
                    const majorNoteTextColor = isTonicMajor ? '#0f172a' : (majorRole ? '#f8fafc' : '#475569');
                    const minorNoteFill = minorRole ? '#1e293b' : '#0f172a';
                    const minorNoteTextColor = minorRole ? '#cbd5e1' : '#475569';
                    const minorDegreeFill = minorRole ? minorRole.color : "transparent";

                    return (
                        <g key={`wedge-${i}`} className="select-none">
                            {/* 1. Major Degree Ring */}
                            <path
                                d={majorDegreePath}
                                fill={majorDegreeFill}
                                stroke={strokeColor}
                                strokeWidth="1"
                            />
                            {majorRole && (
                                <text x={majorDegreePos.x} y={majorDegreePos.y} textAnchor="middle" dominantBaseline="central" fill="#0f172a" fontSize="10" fontWeight="bold" className="pointer-events-none">
                                    {majorRole.role}
                                </text>
                            )}

                            {/* 2. Major Note Ring */}
                            <path
                                d={majorNotePath}
                                fill={majorNoteFill}
                                stroke={strokeColor}
                                strokeWidth="1"
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => onKeySelect(keyIndex)}
                            />
                            <text x={majorNotePos.x} y={majorNotePos.y} textAnchor="middle" dominantBaseline="central" fill={majorNoteTextColor} fontSize="14" fontWeight={isTonicMajor ? "800" : "600"} className="pointer-events-none">
                                {NOTES[keyIndex]}
                            </text>

                            {/* 3. Minor Note Ring */}
                            <path
                                d={minorNotePath}
                                fill={minorNoteFill}
                                stroke={strokeColor}
                                strokeWidth="1"
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => onKeySelect(relativeMinorIndex)}
                            />
                            <text x={minorNotePos.x} y={minorNotePos.y} textAnchor="middle" dominantBaseline="central" fill={minorNoteTextColor} fontSize="12" fontWeight="500" className="pointer-events-none">
                                {NOTES[relativeMinorIndex]}m
                            </text>

                            {/* 4. Minor Degree Ring */}
                            <path
                                d={minorDegreePath}
                                fill={minorDegreeFill}
                                stroke={strokeColor}
                                strokeWidth="1"
                            />
                            {minorRole && (
                                <text x={minorDegreePos.x} y={minorDegreePos.y} textAnchor="middle" dominantBaseline="central" fill="#0f172a" fontSize="9" fontWeight="bold" className="pointer-events-none">
                                    {minorRole.role}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Center Core */}
                <circle cx="0" cy="0" r="20" fill="#0f172a" stroke={strokeColor} strokeWidth="1" />
            </svg>
        </div>
    );
};