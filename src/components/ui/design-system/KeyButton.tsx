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
                flex items-center justify-center
                ${isActive
                    ? 'bg-white text-black border-white shadow-[0_0_40px_rgba(255,255,255,0.15)] aspect-square rounded-2xl border flex-1'
                    : 'bg-[#ffffff02] border border-white/5 text-white/30 hover:border-white/20 hover:text-white/60 aspect-square rounded-2xl flex-1'}
            `}
        >
            {note}
        </button>
    );
};
