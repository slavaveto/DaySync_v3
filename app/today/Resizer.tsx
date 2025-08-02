// components/Resizer.tsx
import React from 'react';
import clsx from 'clsx';

interface ResizerProps {
    isResizing: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    className?: string;
}

export function Resizer({ isResizing, onMouseDown, className }: ResizerProps) {
    return (
        <div
            className={clsx(
                "w-[3px] bg-default-300 hover:bg-primary-400 cursor-col-resize transition-colors",
                isResizing && "bg-primary-500",
                className
            )}
            onMouseDown={onMouseDown}
        />
    );
}