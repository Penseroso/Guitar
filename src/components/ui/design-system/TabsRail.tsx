import React from 'react';

interface TabOption {
    id: string;
    label: string;
}

interface TabsRailProps {
    tabs: TabOption[];
    activeId: string;
    onChange: (id: string) => void;
}

export const TabsRail: React.FC<TabsRailProps> = ({ tabs, activeId, onChange }) => {
    return (
        <div className="flex p-1 rounded-full bg-white/5 ring-1 ring-white/10
        shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-14px_22px_rgba(0,0,0,0.35)]">
            {tabs.map((tab) => {
                const isActive = activeId === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={[
                            "px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.35em]",
                            "transition-all duration-300",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/25",
                            isActive
                                ? "bg-accent-blue/80 text-white border border-white/20 shadow-[0_10px_22px_rgba(59,130,246,0.22),inset_0_1px_0_rgba(255,255,255,0.18)]"
                                : "text-secondary/80 hover:text-primary hover:bg-white/6"
                        ].join(" ")}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};