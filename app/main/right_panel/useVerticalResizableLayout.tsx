// hooks/useVerticalResizableLayout.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import usePersistentState from '@/app/utils/usePersistentState';

interface UseVerticalResizableLayoutOptions {
    initialHeight?: number;
    minHeight?: number;
    maxHeight?: number;
    persistKey?: string;
}

export function useVerticalResizableLayout({
                                               initialHeight = 200,
                                               minHeight = 200,
                                               maxHeight = 300,
                                               persistKey = 'topPanelHeight'
                                           }: UseVerticalResizableLayoutOptions = {}) {
    const [topPanelHeight, setTopPanelHeight] = usePersistentState(persistKey, initialHeight);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = e.clientY - containerRect.top;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        // Округляем до ближайших 10px
        const snappedHeight = Math.round(clampedHeight / 10) * 10;

        setTopPanelHeight(snappedHeight);
    }, [isResizing, minHeight, maxHeight]);

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
        topPanelHeight,
        isResizing,
        containerRef,
        handleMouseDown,
        bottomPanelHeight: `calc(100vh - ${topPanelHeight}px)`
    };
}