import React from 'react';

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    description?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, description }) => {
    return (
        <label className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="flex flex-col">
                <span className={`font-medium text-sm transition-colors ${checked ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {label}
                </span>
                {description && <span className="text-xs text-slate-500">{description}</span>}
            </div>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}>
                    <div
                        className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                </div>
            </div>
        </label>
    );
};
