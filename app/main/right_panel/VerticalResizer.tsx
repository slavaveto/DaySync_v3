// components/VerticalResizer.tsx
import React from 'react';
import clsx from 'clsx';

interface VerticalResizerProps {
    isResizing: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    className?: string;
}

export function VerticalResizer({ isResizing, onMouseDown, className }: VerticalResizerProps) {
    return (
        <div
            className={clsx(
                "h-[3px] bg-default-300 hover:bg-primary-400 cursor-row-resize transition-colors",
                isResizing && "bg-primary-500",
                className
            )}
            onMouseDown={onMouseDown}
        />
    );
}