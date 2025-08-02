// components/VerticalResizer.tsx
import React from 'react';
import clsx from 'clsx';

interface VerticalResizerProps {
    isResizing: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart?: (e: React.TouchEvent) => void;
    className?: string;
}

export function VerticalResizer({ isResizing, onMouseDown, onTouchStart, className }: VerticalResizerProps) {
    return (
        <div
            className={clsx(
                "h-[12px] py-[3px] bg-default-200 hover:bg-primary-100 cursor-row-resize transition-colors relative flex items-center justify-center",
                isResizing && "bg-primary-100",
                className
            )}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            {/* Три полоски как handle */}
            <div className="flex flex-col gap-[0px]">
                <div className="w-8 h-[2px] bg-default-400 rounded-full"/>
                <div className="w-8 h-[2px] bg-default-400 rounded-full"/>
                <div className="w-8 h-[2px] bg-default-400 rounded-full"/>
            </div>
        </div>
    );
}