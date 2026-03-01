import React, { useState, useRef, useEffect } from 'react';

interface SelectPillProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
}

export const SelectPill: React.FC<SelectPillProps> = ({ value, onChange, options, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 키보드 접근성 (ESC 키로 닫기)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
            {/* 트리거 버튼 */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={[
                    "w-full flex justify-between items-center rounded-xl px-4 py-3 pr-4",
                    "text-white font-black text-[10px] uppercase tracking-[0.2em]",
                    "bg-[#050505] border border-white/5",
                    "hover:border-white/20 hover:bg-[#0a0a0a] transition-all",
                    isOpen ? "border-white/30 ring-1 ring-white/10" : ""
                ].join(" ")}
            >
                <span className="truncate">{selectedOption?.label || "Select..."}</span>
                <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* 커스텀 선택창 (Dropdown) */}
            {isOpen && (
                <ul
                    role="listbox"
                    className={[
                        "absolute z-50 w-full mt-2 py-2 px-1",
                        "bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl",
                        "backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200",
                        "max-h-60 overflow-y-auto custom-scrollbar"
                    ].join(" ")}
                >
                    {options.map(opt => (
                        <li
                            key={opt.value}
                            role="option"
                            aria-selected={value === opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={[
                                "px-4 py-2.5 rounded-xl cursor-pointer transition-all",
                                "text-[10px] font-black uppercase tracking-widest",
                                value === opt.value
                                    ? "bg-white text-black"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                            ].join(" ")}
                        >
                            {opt.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};