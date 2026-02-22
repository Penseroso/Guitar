import React from 'react';

interface SelectPillProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string; // Add className prop to fix type error
}

export const SelectPill: React.FC<SelectPillProps> = ({ value, onChange, options, className = '' }) => {
    return (
        <div className={`relative ${className}`}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={[
                    "w-full appearance-none rounded-2xl px-6 py-4 pr-12",
                    "text-white font-black text-lg",
                    "bg-white/5 border border-white/10",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-14px_22px_rgba(0,0,0,0.35)]",
                    "hover:border-white/18 hover:bg-white/7 transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/25 focus-visible:border-white/18",
                    "cursor-pointer"
                ].join(" ")}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="text-black bg-white">
                        {opt.label}
                    </option>
                ))}
            </select>

            {/* chevron (텍스트 ▼ 대신) */}
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-accent-blue/80">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );
};