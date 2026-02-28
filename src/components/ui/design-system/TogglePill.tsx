import React from 'react';

interface TogglePillProps {
    label: React.ReactNode;
    isActive: boolean;
    onToggle: () => void;
    colorTheme?: 'amber' | 'indigo' | 'purple';
    hideDot?: boolean;
    className?: string;
}

export const TogglePill: React.FC<TogglePillProps> = ({ label, isActive, onToggle, colorTheme = 'amber', hideDot = false, className = '' }) => {
    let togglePillBgClass = "bg-white/5";
    let toggleDotClass = "bg-white/10";

    if (isActive) {
        togglePillBgClass = "bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)]";
        toggleDotClass = "bg-black ml-auto";
    }

    return (
        <button
            onClick={onToggle}
            className={[
                "w-full flex items-center justify-between p-4",
                "bg-white/[0.015] border border-white/5 rounded-2xl group cursor-pointer hover:bg-white/[0.04] transition-all",
                "focus:outline-none",
                className
            ].join(" ")}
        >
            <span className={[
                "text-[10px] font-black tracking-widest uppercase transition-colors text-left",
                isActive || hideDot ? "text-white/80" : "text-white/40 group-hover:text-white/80"
            ].join(" ")}>
                {label}
            </span>

            {!hideDot && (
                <div className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${togglePillBgClass}`}>
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${toggleDotClass}`} />
                </div>
            )}
        </button>
    );
};