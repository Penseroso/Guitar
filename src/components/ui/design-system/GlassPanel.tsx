import React from 'react';

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={[
                "relative overflow-hidden",
                "rounded-[40px]",
                "bg-white/4 backdrop-blur-2xl",
                "shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75)]",
                // border는 아주 약하게만
                "ring-1 ring-white/10",
                className
            ].join(" ")}
        >
            {/* 내부 비네팅(이게 카드 질감 핵심) */}
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-50px_90px_rgba(0,0,0,0.55)]" />
            <div className="relative">{children}</div>
        </div>
    );
};