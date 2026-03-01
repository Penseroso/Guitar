import React from 'react';
import { NOTES } from '../../utils/guitar/theory';
import { getCircleOfFifthsOrder, getRelativeMinor } from '../../utils/guitar/logic';

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: Number((centerX + (radius * Math.cos(angleInRadians))).toFixed(4)),
        y: Number((centerY + (radius * Math.sin(angleInRadians))).toFixed(4))
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
    selectedScaleGroup?: string;
    selectedScaleName?: string;
}

export const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({ selectedKey, onKeySelect, selectedScaleGroup, selectedScaleName }) => {
    const fifthsOrder = getCircleOfFifthsOrder();

    // --- [MODUS v2.5] Scale Dictionary Pattern ---
    // 수학적인 Ionian 상대 변환을 폐기하고, 각 스케일 그룹/모드별 절대적인 모달 인터벌과 역할을 매핑합니다.
    const SCALE_DEFINITIONS: Record<string, Record<string, Record<number, { role: string; color: string }>>> = {
        'Diatonic': {
            'Ionian': { 0: { role: 'I', color: '#fde047' }, 2: { role: 'ii', color: '#7dd3fc' }, 4: { role: 'iii', color: '#7dd3fc' }, 5: { role: 'IV', color: '#86efac' }, 7: { role: 'V', color: '#86efac' }, 9: { role: 'vi', color: '#7dd3fc' }, 11: { role: 'vii°', color: '#fca5a5' } },
            'Dorian': { 0: { role: 'i', color: '#fde047' }, 2: { role: 'ii', color: '#7dd3fc' }, 3: { role: 'bIII', color: '#86efac' }, 5: { role: 'IV', color: '#86efac' }, 7: { role: 'v', color: '#7dd3fc' }, 9: { role: 'vi°', color: '#fca5a5' }, 10: { role: 'bVII', color: '#86efac' } },
            'Phrygian': { 0: { role: 'i', color: '#fde047' }, 1: { role: 'bII', color: '#86efac' }, 3: { role: 'bIII', color: '#86efac' }, 5: { role: 'iv', color: '#7dd3fc' }, 7: { role: 'v°', color: '#fca5a5' }, 8: { role: 'bVI', color: '#86efac' }, 10: { role: 'bvii', color: '#7dd3fc' } },
            'Lydian': { 0: { role: 'I', color: '#fde047' }, 2: { role: 'II', color: '#86efac' }, 4: { role: 'iii', color: '#7dd3fc' }, 6: { role: '#iv°', color: '#fca5a5' }, 7: { role: 'V', color: '#86efac' }, 9: { role: 'vi', color: '#7dd3fc' }, 11: { role: 'vii', color: '#7dd3fc' } },
            'Mixolydian': { 0: { role: 'I', color: '#fde047' }, 2: { role: 'ii', color: '#7dd3fc' }, 4: { role: 'iii°', color: '#fca5a5' }, 5: { role: 'IV', color: '#86efac' }, 7: { role: 'v', color: '#7dd3fc' }, 9: { role: 'vi', color: '#7dd3fc' }, 10: { role: 'bVII', color: '#86efac' } },
            'Aeolian': { 0: { role: 'i', color: '#fde047' }, 2: { role: 'ii°', color: '#fca5a5' }, 3: { role: 'bIII', color: '#86efac' }, 5: { role: 'iv', color: '#7dd3fc' }, 7: { role: 'v', color: '#7dd3fc' }, 8: { role: 'bVI', color: '#86efac' }, 10: { role: 'bVII', color: '#86efac' } },
            'Locrian': { 0: { role: 'i°', color: '#fde047' }, 1: { role: 'bII', color: '#86efac' }, 3: { role: 'biii', color: '#7dd3fc' }, 5: { role: 'iv', color: '#7dd3fc' }, 6: { role: 'bV', color: '#86efac' }, 8: { role: 'bVI', color: '#86efac' }, 10: { role: 'bvii', color: '#7dd3fc' } }
        },
        'Pentatonic': {
            'Major Pentatonic': {
                0: { role: 'I', color: '#fde047' }, 2: { role: 'ii', color: '#7dd3fc' }, 4: { role: 'iii', color: '#7dd3fc' }, 7: { role: 'V', color: '#86efac' }, 9: { role: 'vi', color: '#7dd3fc' }
            },
            'Minor Pentatonic': {
                0: { role: 'i', color: '#fde047' }, 3: { role: 'bIII', color: '#86efac' }, 5: { role: 'iv', color: '#7dd3fc' }, 7: { role: 'v', color: '#7dd3fc' }, 10: { role: 'bVII', color: '#86efac' }
            }
        },
        'Harmonic/Melodic': {
            'Harmonic Minor': { 0: { role: 'i', color: '#fde047' }, 2: { role: 'ii°', color: '#fca5a5' }, 3: { role: 'bIII+', color: '#fca5a5' }, 5: { role: 'iv', color: '#7dd3fc' }, 7: { role: 'V', color: '#86efac' }, 8: { role: 'bVI', color: '#86efac' }, 11: { role: 'vii°', color: '#fca5a5' } },
            'Melodic Minor': { 0: { role: 'i', color: '#fde047' }, 2: { role: 'ii', color: '#7dd3fc' }, 3: { role: 'bIII+', color: '#fca5a5' }, 5: { role: 'IV', color: '#86efac' }, 7: { role: 'V', color: '#86efac' }, 9: { role: 'vi°', color: '#fca5a5' }, 11: { role: 'vii°', color: '#fca5a5' } },
            'Phrygian Dom': { 0: { role: 'I', color: '#fde047' }, 1: { role: 'bII', color: '#86efac' }, 4: { role: 'iii°', color: '#fca5a5' }, 5: { role: 'iv', color: '#7dd3fc' }, 7: { role: 'v°', color: '#fca5a5' }, 8: { role: 'bVI+', color: '#fca5a5' }, 10: { role: 'bvii', color: '#7dd3fc' } },
            'Altered': { 0: { role: 'i°', color: '#fde047' }, 1: { role: 'bII', color: '#86efac' }, 3: { role: 'biii', color: '#7dd3fc' }, 4: { role: 'bIII+', color: '#fca5a5' }, 6: { role: 'bV', color: '#86efac' }, 8: { role: 'bVI', color: '#86efac' }, 10: { role: 'bvii', color: '#7dd3fc' } }
        }
    };

    const getDiatonicRole = (targetKey: number, rootKey: number) => {
        const diffFromRoot = (targetKey - rootKey + 12) % 12;
        // 선택된 스케일 그룹과 이름이 없으면 기본값인 Aeolian 모드로 렌더링
        const group = selectedScaleGroup || 'Diatonic';
        const name = selectedScaleName || 'Aeolian';
        return SCALE_DEFINITIONS[group]?.[name]?.[diffFromRoot] || null;
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