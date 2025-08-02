// hooks/useVerticalResizableLayout.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import usePersistentState from '@/app/utils/usePersistentState';

interface UseVerticalResizableLayoutOptions {
    initialHeight?: number;
    minHeight?: number;
    maxHeight?: number;
    persistKey: string; // делаем обязательным
}

export function useVerticalResizableLayout({
                                               initialHeight = 200,
                                               minHeight = 200,
                                               maxHeight = 300,
                                               persistKey // убираем дефолтное значение
                                           }: UseVerticalResizableLayoutOptions) {
    const [notesPanelHeight, setNotesPanelHeight] = usePersistentState(persistKey, initialHeight);
    const [isResizing, setIsResizing] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startHeight, setStartHeight] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        setStartY(e.clientY);
        setStartHeight(notesPanelHeight);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    }, [notesPanelHeight]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const deltaY = e.clientY - startY;
        const newHeight = startHeight - deltaY;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        // Округляем до ближайших 10px
        const snappedHeight = Math.round(clampedHeight / 10) * 10;

        setNotesPanelHeight(snappedHeight);
    }, [isResizing, startY, startHeight, minHeight, maxHeight, setNotesPanelHeight]);

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
        notesPanelHeight,
        isResizing,
        containerRef,
        handleMouseDown,
        bottomPanelHeight: `calc(100vh - ${notesPanelHeight}px)`
    };
}