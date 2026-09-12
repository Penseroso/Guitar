import React from 'react';

interface KeyButtonProps {
    note: string;
    isActive: boolean;
    onClick: () => void;
    label?: string;
    comfortable?: boolean;
}

export const KeyButton: React.FC<KeyButtonProps> = ({ note, isActive, onClick, label, comfortable = false }) => {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            aria-pressed={isActive}
            // User requested strict W/H and rounded-2xl
            className={`
                flex items-center justify-center focus-visible:outline-2 focus-visible:outline-cyan-200 focus-visible:outline-offset-2
                ${comfortable ? 'min-h-11 min-w-11 text-sm font-semibold' : ''}
                ${isActive
                    ? 'bg-white text-black border-white shadow-[0_0_40px_rgba(255,255,255,0.15)] aspect-square rounded-2xl border flex-1'
                    : `bg-[#ffffff02] border border-white/5 ${comfortable ? 'text-white/70' : 'text-white/30'} hover:border-white/20 hover:text-white/60 aspect-square rounded-2xl flex-1`}
            `}
        >
            {note}
        </button>
    );
};
