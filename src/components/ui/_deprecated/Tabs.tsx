import React from 'react';

interface TabOption {
    value: string;
    label: string;
}

interface TabsProps {
    options: TabOption[];
    value: string;
    onChange: (value: any) => void;
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ options, value, onChange, className }) => {
    return (
        <div className={`flex p-1 bg-slate-900/50 backdrop-blur-md rounded-xl border border-white/10 ${className}`}>
            {options.map((opt) => {
                const isActive = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`
               flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all duration-200
               ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}
             `}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
};
