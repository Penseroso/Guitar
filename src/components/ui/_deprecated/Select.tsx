import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className, ...props }) => {
    return (
        <div className="flex flex-col gap-1.5">
            {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>}
            <div className="relative">
                <select
                    className={`
            w-full appearance-none bg-slate-800/50 text-slate-200 
            border border-slate-700 rounded-lg px-4 py-2.5 pr-10
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
            hover:bg-slate-800 transition-all font-medium text-sm
            ${className}
          `}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>
        </div>
    );
};
