import React from 'react';

interface TogglePillProps {
    label: React.ReactNode;
    isActive: boolean;
    onToggle: () => void;
    colorTheme?: 'amber' | 'indigo' | 'purple';
    hideDot?: boolean;
}

export const TogglePill: React.FC<TogglePillProps> = ({ label, isActive, onToggle, colorTheme = 'amber', hideDot = false }) => {
    let borderBgClass = "";
    let dotClass = "bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-6px_10px_rgba(0,0,0,0.45)]";

    if (isActive) {
        if (colorTheme === 'amber') {
            borderBgClass = "border-[#FEAC48]/40 bg-[#FEAC48]/15";
            dotClass = "bg-[#FEAC48] shadow-[0_0_12px_rgba(254,172,72,0.6)]";
        } else if (colorTheme === 'indigo') {
            borderBgClass = "border-[#4338CA]/35 bg-[#4338CA]/10";
            dotClass = "bg-[#4338CA] shadow-[0_0_12px_rgba(67,56,202,0.55)]";
        } else if (colorTheme === 'purple') {
            borderBgClass = "border-[#9333EA]/35 bg-[#9333EA]/10";
            dotClass = "bg-[#9333EA] shadow-[0_0_12px_rgba(147,51,234,0.55)]";
        }
    }

    return (
        <button
            onClick={onToggle}
            className={[
                "flex items-center w-full",
                hideDot ? "justify-center" : "justify-between",
                "rounded-2xl px-6 py-4 transition-all duration-200 group",
                "border border-white/10",
                "bg-white/5",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-14px_22px_rgba(0,0,0,0.35)]",
                "hover:border-white/18 hover:bg-white/7",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/25",
                borderBgClass
            ].join(" ")}
        >
            <span className={[
                "text-[12px] font-black uppercase tracking-[0.25em] transition-colors",
                isActive || hideDot ? "text-white" : "text-secondary/85 group-hover:text-primary"
            ].join(" ")}>
                {label}
            </span>

            {!hideDot && (
                <div className={[
                    "w-4 h-4 rounded-full transition-all duration-300",
                    dotClass
                ].join(" ")} />
            )}
        </button>
    );
};