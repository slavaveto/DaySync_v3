"use client";
import {createContext, useContext, useEffect, useRef, useState, useCallback} from "react";
import usePersistentState from "@/app/init/usePersistentState"


// ✅ Определяем типы
interface DndContextType {

    weeks: number;
    setWeeks: (value: number) => void;

    showTimeLines: Record<number, boolean>;
    setShowTimeLines: (weeks: number, value: boolean) => void;

    monthViewMode: boolean;
    setMonthViewMode: (value: boolean) => void;

    draggedItemWasNarrow: boolean;
    setDraggedItemWasNarrow: (value: boolean) => void;

    highlightedClientId: number | null;
    setHighlightedClientId: (value: number | null) => void;
}

// ✅ Создаём контекст
const DndContext = createContext<DndContextType | undefined>(undefined);

// ✅ Провайдер контекста
export function DndProvider({children}: { children: React.ReactNode }) {

    const [weeks, setWeeks] = useState(1); // дефолтное значение

    const [showTimeLines, setShowTimeLinesState] = usePersistentState("showTimeLines", {
        2: false,
        3: false
    });
    const setShowTimeLines = (weeksValue: number, value: boolean) => {
        setShowTimeLinesState(prev => ({
            ...prev,
            [weeksValue]: value
        }));
    };

    const [monthViewMode, setMonthViewMode] = usePersistentState("monthViewMode", false);
    const [draggedItemWasNarrow, setDraggedItemWasNarrow] = useState(false);

    const [highlightedClientId, setHighlightedClientId] = useState<number | null>(null);



    return (
        <DndContext.Provider value={{
            weeks, setWeeks,
            showTimeLines, setShowTimeLines,
            monthViewMode, setMonthViewMode,
            draggedItemWasNarrow, setDraggedItemWasNarrow,
            highlightedClientId, setHighlightedClientId
        }}>
            {children}
        </DndContext.Provider>
    );
}

// ✅ Хук для использования контекста
export function useDndContext() {
    const context = useContext(DndContext);
    if (!context) {
        throw new Error("useContext должен использоваться внутри <DndProvider>");
    }
    return context;
}