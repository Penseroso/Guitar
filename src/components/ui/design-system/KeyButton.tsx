import React from 'react';

interface KeyButtonProps {
    note: string;
    isActive: boolean;
    onClick: () => void;
}

export const KeyButton: React.FC<KeyButtonProps> = ({ note, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            // User requested strict W/H and rounded-2xl
            className={`
                w-16 h-16 rounded-2xl font-black text-lg transition-all duration-200 flex-shrink-0
                flex items-center justify-center border
                ${isActive
                    ? 'bg-accent-blue border-transparent text-white shadow-glow'
                    : 'bg-transparent border-stroke text-secondary hover:border-white/20 hover:text-primary hover:bg-white/5'}
            `}
        >
            {note}
        </button>
    );
};
