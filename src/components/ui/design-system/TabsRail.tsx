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
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-xl w-fit">
            {tabs.map((tab) => {
                const isActive = activeId === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={[
                            "px-8 py-2 text-[11px] font-bold tracking-widest rounded-lg",
                            "transition-all duration-300",
                            "focus:outline-none",
                            isActive
                                ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                : "text-white/40 hover:text-white/60 bg-transparent"
                        ].join(" ")}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};