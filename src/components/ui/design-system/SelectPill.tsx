import React, { useState, useRef, useEffect, useId } from 'react';

interface SelectPillProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
    label?: string;
    comfortable?: boolean;
}

export const SelectPill: React.FC<SelectPillProps> = ({ value, onChange, options, className = '', label, comfortable = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listId = useId();
    const selectedOption = options.find(option => option.value === value);
    useEffect(() => {
        const outside = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('pointerdown', outside);
        return () => document.removeEventListener('pointerdown', outside);
    }, []);
    useEffect(() => {
        if (isOpen) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, isOpen, listId]);
    const open = () => { setActiveIndex(Math.max(0, options.findIndex(option => option.value === value))); setIsOpen(true); };
    const choose = (index: number) => {
        if (!options[index]) return;
        onChange(options[index].value); setIsOpen(false); triggerRef.current?.focus();
    };
    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape' || event.key === 'Tab') { setIsOpen(false); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) open();
            else if (options.length) setActiveIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); if (isOpen) choose(activeIndex); else open();
        } else if (isOpen && (event.key === 'Home' || event.key === 'End')) {
            event.preventDefault(); setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
        } else if (event.key.length === 1) {
            const found = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
            if (found >= 0) { event.preventDefault(); setActiveIndex(found); setIsOpen(true); }
        }
    };
    return <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
        <button ref={triggerRef} type="button" role="combobox" aria-label={label} aria-haspopup="listbox"
            aria-expanded={isOpen} aria-controls={listId} aria-activedescendant={isOpen ? `${listId}-${activeIndex}` : undefined}
            onClick={() => { if (isOpen) setIsOpen(false); else open(); }}
            className={[
                'w-full flex justify-between items-center rounded-xl px-4 py-3 pr-4',
                comfortable ? 'text-white font-bold text-sm tracking-wide min-h-11' : 'text-white font-black text-[10px] uppercase tracking-[0.2em]',
                'bg-[#050505] border border-white/5 hover:border-white/20 hover:bg-[#0a0a0a] transition-all',
                'focus-visible:outline-2 focus-visible:outline-cyan-200 focus-visible:outline-offset-2',
                isOpen ? 'border-white/30 ring-1 ring-white/10' : '',
            ].join(' ')}>
            <span className="truncate">{selectedOption?.label || 'Select...'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
        {isOpen && <ul id={listId} role="listbox" aria-label={label} className="absolute z-50 w-full mt-2 py-2 px-1 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option, index) => <li key={option.value} id={`${listId}-${index}`} role="option"
                data-value={option.value} aria-selected={value === option.value} onClick={() => choose(index)}
                className={[
                    'px-4 py-2.5 rounded-xl cursor-pointer transition-all',
                    comfortable ? 'text-sm font-semibold min-h-11 flex items-center' : 'text-[10px] font-black uppercase tracking-widest',
                    activeIndex === index ? 'outline-1 outline-white/40 outline-offset-[-2px]' : '',
                    value === option.value ? 'bg-white text-black' : comfortable ? 'text-white/70 hover:text-white hover:bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/5',
                ].join(' ')}>{option.label}</li>)}
        </ul>}
    </div>;
};
