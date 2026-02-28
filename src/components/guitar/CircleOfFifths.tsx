import React from 'react';
import { NOTES } from '../../utils/guitar/theory';
import { getCircleOfFifthsOrder, getRelativeMinor } from '../../utils/guitar/logic';

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

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

    // 로직 보존: 플랫(Flat)하고 담백한 파스텔톤 컬러 팔레트
    const getDiatonicRole = (targetKey: number, rootKey: number) => {
        const diff = (targetKey - rootKey + 12) % 12;
        switch (diff) {
            case 0: return { role: 'I', color: '#fde047' }; // Yellow
            case 2: return { role: 'ii', color: '#7dd3fc' }; // Light Blue
            case 4: return { role: 'iii', color: '#7dd3fc' }; // Light Blue
            case 5: return { role: 'IV', color: '#86efac' }; // Light Green
            case 7: return { role: 'V', color: '#86efac' }; // Light Green
            case 9: return { role: 'vi', color: '#7dd3fc' }; // Light Blue
            case 11: return { role: 'vii°', color: '#fca5a5' }; // Light Red
            default: return null;
        }
    };

    // MODUS Design: 얇고 투명한 그리드 라인
    const strokeColor = "#ffffff10";

    return (
        <div className="w-full h-full flex justify-center items-center p-2 bg-[#050505]">
            <svg viewBox="-160 -160 320 320" className="w-full h-full max-w-[440px] max-h-[440px] overflow-visible drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]">

                {/* MODUS Design: 배경 궤도선 (Orbital Guide) */}
                <circle cx="0" cy="0" r="148" fill="none" stroke="#ffffff05" strokeWidth="0.5" strokeDasharray="2 4" />

                {/* 4개의 링 구조 렌더링 */}
                {fifthsOrder.map((keyIndex, i) => {
                    const relativeMinorIndex = getRelativeMinor(keyIndex);

                    // --- [MODUS v2.4] Wedge Gaps 적용 ---
                    // 1조각 30도에서 좌우 2.5도씩 깎아내어 파편화(Shattered) 효과 생성
                    const gap = 2.5;
                    const startAngle = i * 30 - 15 + gap;
                    const endAngle = i * 30 + 15 - gap;

                    const majorRole = getDiatonicRole(keyIndex, selectedKey);
                    const minorRole = getDiatonicRole(relativeMinorIndex, selectedKey);
                    const isTonicMajor = majorRole?.role === 'I';

                    // --- [MODUS v2.4] Radial Spacing 적용 (반경 분리 및 플로팅) ---
                    // 각 링 사이에 미세한 유격(Gaps)을 두어 기계적인 레이어 구성
                    const majorDegreePath = describeWedge(0, 0, 122, 142, startAngle + 1, endAngle - 1); // 외곽 플로팅 탭
                    const majorNotePath = describeWedge(0, 0, 84, 118, startAngle, endAngle);          // Major 링
                    const minorNotePath = describeWedge(0, 0, 48, 80, startAngle, endAngle);           // Minor 링
                    const minorDegreePath = describeWedge(0, 0, 24, 44, startAngle + 1, endAngle - 1); // 내곽 플로팅 탭

                    // --- [좌표 생성 (텍스트 위치 맞춤)] ---
                    const majorDegreePos = polarToCartesian(0, 0, 132, i * 30);
                    const majorNotePos = polarToCartesian(0, 0, 101, i * 30);
                    const minorNotePos = polarToCartesian(0, 0, 64, i * 30);
                    const minorDegreePos = polarToCartesian(0, 0, 34, i * 30);

                    // --- [MODUS v2.4] Matte Color System (투명도 매핑) ---
                    // 기존 원색에 투명도를 결합(예: 40, 50, 10)하여 무광 질감 연출
                    const majorDegreeFill = majorRole ? `${majorRole.color}40` : "transparent";
                    const majorNoteFill = isTonicMajor ? `${majorRole.color}50` : (majorRole ? '#ffffff0a' : '#ffffff03');
                    const majorNoteTextColor = isTonicMajor ? '#ffffff' : (majorRole ? '#f8fafc' : '#ffffff40');

                    const minorNoteFill = minorRole ? '#ffffff0a' : '#ffffff03';
                    const minorNoteTextColor = minorRole ? '#cbd5e1' : '#ffffff40';
                    const minorDegreeFill = minorRole ? `${minorRole.color}30` : "transparent";

                    return (
                        <g key={`wedge-${i}`}>

                            {/* 1. Outermost Ring: Major Degree (Floating Tab) */}
                            <path
                                d={majorDegreePath}
                                fill={majorDegreeFill}
                                stroke={strokeColor}
                                strokeWidth="0.5"
                            />
                            {majorRole && (
                                <text x={majorDegreePos.x} y={majorDegreePos.y} textAnchor="middle" dominantBaseline="central" fill={majorRole.color} fontSize="10" fontWeight="bold" className="pointer-events-none opacity-90">
                                    {majorRole.role}
                                </text>
                            )}

                            {/* 2. Outer-Mid Ring: Major Note */}
                            <path
                                d={majorNotePath}
                                fill={majorNoteFill}
                                stroke={strokeColor}
                                strokeWidth="0.5"
                                className="cursor-pointer hover:fill-white/10 transition-colors duration-300"
                                onClick={() => onKeySelect(keyIndex)}
                            />
                            <text x={majorNotePos.x} y={majorNotePos.y} textAnchor="middle" dominantBaseline="central" fill={majorNoteTextColor} fontSize="14" fontWeight={isTonicMajor ? "800" : "400"} className="pointer-events-none tracking-widest">
                                {NOTES[keyIndex]}
                            </text>

                            {/* 3. Inner-Mid Ring: Minor Note */}
                            <path
                                d={minorNotePath}
                                fill={minorNoteFill}
                                stroke={strokeColor}
                                strokeWidth="0.5"
                                className="cursor-pointer hover:fill-white/10 transition-colors duration-300"
                                onClick={() => onKeySelect(relativeMinorIndex)}
                            />
                            <text x={minorNotePos.x} y={minorNotePos.y} textAnchor="middle" dominantBaseline="central" fill={minorNoteTextColor} fontSize="12" fontWeight="300" className="pointer-events-none">
                                {NOTES[relativeMinorIndex]}m
                            </text>

                            {/* 4. Innermost Ring: Minor Degree (Floating Tab) */}
                            <path
                                d={minorDegreePath}
                                fill={minorDegreeFill}
                                stroke={strokeColor}
                                strokeWidth="0.5"
                            />
                            {minorRole && (
                                <text x={minorDegreePos.x} y={minorDegreePos.y} textAnchor="middle" dominantBaseline="central" fill={minorRole.color} fontSize="9" fontWeight="bold" className="pointer-events-none opacity-80">
                                    {minorRole.role}
                                </text>
                            )}

                        </g>
                    );
                })}

                {/* MODUS Design: 중앙 코어 홀 */}
                <circle cx="0" cy="0" r="20" fill="#050505" stroke={strokeColor} strokeWidth="1" />
            </svg>
        </div>
    );
};