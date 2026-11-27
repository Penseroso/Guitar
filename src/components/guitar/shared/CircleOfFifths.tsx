import React from 'react';
import { getCircleOfFifthsOrder, getRelativeMinor, getKeyName, getMinorKeyName, ENHARMONIC_TIE_PITCH_CLASSES } from '@/domain/shared/keys';
import { generateModeData } from '@/domain/scale/scales';
import { createScaleRef } from '@/domain/scale/scale-ref';
import { getScaleStructuralTones } from '@/domain/scale/scale-tones';

function majorKeyLabel(pitchClass: number) {
    const name = getKeyName(pitchClass);
    const alternate = ENHARMONIC_TIE_PITCH_CLASSES[pitchClass]?.major;
    return alternate ? `${alternate}/${name}` : name;
}

function minorKeyLabel(pitchClass: number) {
    const name = getMinorKeyName(pitchClass).toLowerCase();
    const alternate = ENHARMONIC_TIE_PITCH_CLASSES[pitchClass]?.minor;
    return alternate ? `${alternate}/${name}` : name;
}

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
    rootOnly?: boolean;
    rootOptionIdPrefix?: string;
}

export const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({ selectedKey, onKeySelect, selectedScaleGroup, selectedScaleName, rootOnly = false, rootOptionIdPrefix }) => {
    const fifthsOrder = getCircleOfFifthsOrder();

    // getRelativeMinor() is a fixed diatonic-key-signature formula (major - 3 semitones) — it
    // only means "relative minor" for the Diatonic Modes family. Harmonic/Jazz Minor aren't
    // fifths-generated scales (adjacent-by-fifth keys share far fewer notes than in the diatonic
    // case), so the inner ring has no coherent meaning to show outside that family.
    const isDiatonicFamily = (selectedScaleGroup || 'Diatonic Modes') === 'Diatonic Modes';

    const rolesByPitch = React.useMemo(() => {
        if (rootOnly) return null;
        const group = selectedScaleGroup || 'Diatonic Modes';
        const name = selectedScaleName || 'Aeolian';
        const roles = generateModeData(group, name);
        const tones = getScaleStructuralTones(createScaleRef(group, name, selectedKey));
        return new Map(tones?.map(tone => [tone.pitchClass, { ...roles[tone.interval], noteName: tone.scaleNoteName }]));
    }, [selectedScaleGroup, selectedScaleName, selectedKey, rootOnly]);

    // MODUS Design: 얇고 투명한 그리드 라인
    const strokeColor = "#ffffff10";

    return (
        <div className="w-full h-full flex justify-center items-center p-2 bg-[#050505]">
            <svg viewBox="-160 -160 320 320" role={rootOnly ? 'presentation' : undefined} className="w-full h-full max-w-[440px] max-h-[440px] overflow-visible drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]">

                {/* MODUS Design: 배경 궤도선 (Orbital Guide) */}
                <circle cx="0" cy="0" r="148" fill="none" stroke="#ffffff05" strokeWidth="0.5" strokeDasharray="2 4" />

                {/* 4개의 링 구조 렌더링 */}
                {fifthsOrder.map((keyIndex, i) => {
                    if (rootOnly) {
                        const selected = selectedKey === keyIndex;
                        const notePosition = polarToCartesian(0, 0, 106, i * 30);
                        const name = majorKeyLabel(keyIndex);
                        return <g key={`root-${keyIndex}`} id={rootOptionIdPrefix ? `${rootOptionIdPrefix}-${keyIndex}` : undefined}
                            role="option" aria-label={name} aria-selected={selected} onClick={() => onKeySelect(keyIndex)}>
                            <path d={describeWedge(0, 0, 70, 142, i * 30 - 12.5, i * 30 + 12.5)}
                                fill={selected ? '#f8fafc' : '#ffffff08'} stroke="#ffffff18" strokeWidth="0.5"
                                className="cursor-pointer hover:opacity-75 transition-opacity" />
                            <text x={notePosition.x} y={notePosition.y} textAnchor="middle" dominantBaseline="central"
                                fill={selected ? '#050505' : '#f8fafc'} fontSize={name.length > 2 ? 12 : 16}
                                fontWeight={selected ? 700 : 500} className="pointer-events-none">{name}</text>
                        </g>;
                    }
                    const relativeMinorIndex = getRelativeMinor(keyIndex);

                    // --- [MODUS v2.4] Wedge Gaps 적용 ---
                    // 1조각 30도에서 좌우 2.5도씩 깎아내어 파편화(Shattered) 효과 생성
                    const gap = 2.5;
                    const startAngle = i * 30 - 15 + gap;
                    const endAngle = i * 30 + 15 - gap;

                    const majorRole = rolesByPitch?.get(keyIndex);
                    const minorRole = isDiatonicFamily ? rolesByPitch?.get(relativeMinorIndex) : null;
                    const majorName = majorRole?.noteName ?? majorKeyLabel(keyIndex);
                    const minorName = minorRole?.noteName.toLowerCase() ?? minorKeyLabel(relativeMinorIndex);
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
                            <text x={majorNotePos.x} y={majorNotePos.y} textAnchor="middle" dominantBaseline="central" fill={majorNoteTextColor} fontSize={majorName.length > 2 ? "11" : "14"} fontWeight={isTonicMajor ? "800" : "400"} className="pointer-events-none tracking-widest">
                                {majorName}
                            </text>

                            {/* 3. Inner-Mid Ring: Minor Note (diatonic-family only — see isDiatonicFamily above) */}
                            <path
                                d={minorNotePath}
                                fill={minorNoteFill}
                                stroke={strokeColor}
                                strokeWidth="0.5"
                                className={isDiatonicFamily ? "cursor-pointer hover:fill-white/10 transition-colors duration-300" : undefined}
                                onClick={isDiatonicFamily ? () => onKeySelect(relativeMinorIndex) : undefined}
                            />
                            {isDiatonicFamily && (
                                <text x={minorNotePos.x} y={minorNotePos.y} textAnchor="middle" dominantBaseline="central" fill={minorNoteTextColor} fontSize={minorName.length > 2 ? "9" : "12"} fontWeight="300" className="pointer-events-none">
                                    {minorName}
                                </text>
                            )}

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
