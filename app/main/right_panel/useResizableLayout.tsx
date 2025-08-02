// hooks/useResizableLayout.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import usePersistentState from '@/app/utils/usePersistentState';


interface UseResizableLayoutOptions {
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    persistKey?: string;
}

export function useResizableLayout({
                                       initialWidth = 260,
                                       minWidth = 260,
                                       maxWidth = 500,
                                       persistKey = 'rightPanelWidth'
                                   }: UseResizableLayoutOptions = {}) {
    const [rightPanelWidth, setRightPanelWidth] = usePersistentState(persistKey, initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = containerRect.right - e.clientX;
        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

        // Округляем до ближайших 10px
        const snappedWidth = Math.round(clampedWidth / 10) * 10;

        setRightPanelWidth(snappedWidth);
    }, [isResizing, minWidth, maxWidth]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return {
        rightPanelWidth,
        isResizing,
        containerRef,
        handleMouseDown,
        leftPanelWidth: `calc(100vw - ${rightPanelWidth}px)`
    };
}