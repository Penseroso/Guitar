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
        <nav aria-label="Workspace mode" className="flex w-full sm:w-fit items-stretch gap-1 border-b border-white/10">
            {tabs.map((tab) => {
                const isActive = activeId === tab.id;
                return (
                    <button
                        key={tab.id}
                        aria-pressed={isActive}
                        onClick={() => onChange(tab.id)}
                        className={[
                            "flex-1 sm:flex-none min-h-11 -mb-px px-4 sm:px-7 py-2 text-[12px] font-bold tracking-widest border-b-2",
                            "transition-colors duration-200 motion-reduce:transition-none",
                            "focus-visible:outline-2 focus-visible:outline-cyan-200 focus-visible:outline-offset-2",
                            isActive
                                ? "border-white text-white"
                                : "border-transparent text-white/45 hover:text-white/80"
                        ].join(" ")}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
};
