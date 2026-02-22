import React from 'react'; interface SectionLabelProps { text: string; className?: string; }

export const SectionLabel: React.FC<SectionLabelProps> = ({ text, className = '' }) => {
    return (
        <div className={`text-[14px] font-black uppercase tracking-[0.45em] text-secondary/70 ${className}`}>
            {text}
        </div>
    );
};