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
                    "w-full appearance-none rounded-xl px-4 py-3 pr-12",
                    "text-white font-mono text-xs uppercase tracking-widest",
                    "bg-[#050505] border border-white/5",
                    "hover:border-white/20 hover:bg-[#0a0a0a] transition-all",
                    "focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20",
                    "cursor-pointer"
                ].join(" ")}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="text-black bg-white">
                        {opt.label}
                    </option>
                ))}
            </select>

            {/* chevron */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );
};