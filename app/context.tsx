"use client";
import {createContext, useContext, useEffect, useRef, useState, useCallback} from "react";
import usePersistentState from "@/app/utils/usePersistentState"
import type {ClientType, ItemType, SubTabType, TabType} from "@/app/types";
import {addMonths, format} from "date-fns";


// ✅ Определяем типы
interface MainContextType {
    maxContentWidth: number;

    userId: string | null;
    setUserId: (id: string | null) => void;

    items: ItemType[];
    setItems: React.Dispatch<React.SetStateAction<ItemType[]>>;
    tabs: TabType[];
    setTabs: React.Dispatch<React.SetStateAction<TabType[]>>;
    subtabs: SubTabType[];
    setSubtabs: React.Dispatch<React.SetStateAction<SubTabType[]>>;

    editingTitleId: number | null;
    setEditingTitleId: (id: number | null) => void;
    editingNotesId: number | null;
    setEditingNotesId: (id: number | null) => void;

    autoOpenNotesFor: number | null;
    setAutoOpenNotesFor: (id: number | null) => void;

    isUserActive: boolean;
    setIsUserActive: (active: boolean) => void;
    hasLocalChanges: boolean;
    setHasLocalChanges: React.Dispatch<React.SetStateAction<boolean>>;
    syncTimeoutProgress: number;
    setSyncTimeoutProgress: (value: number) => void;

    isUploadingData: boolean;
    setIsUploadingData: (value: boolean) => void;
    isDownloadingData: boolean;
    setIsDownloadingData: (value: boolean) => void;

    syncHighlight: number[];
    setSyncHighlight: (ids: number[]) => void;

    clients: ClientType[];
    setClients: React.Dispatch<React.SetStateAction<ClientType[]>>;

    draggedItemWasNarrow: boolean;
    setDraggedItemWasNarrow: (value: boolean) => void;
}

// ✅ Создаём контекст
const MainContext = createContext<MainContextType | undefined>(undefined);

// ✅ Провайдер контекста
export function MainProvider({children}: { children: React.ReactNode }) {
    const [maxContentWidth, setMaxContentWidth] = useState(550);

    const [userId, setUserId] = useState<string | null>(null);

    const [tabs, setTabs] = usePersistentState<TabType[]>("tabs", []);
    const [subtabs, setSubtabs] = usePersistentState<SubTabType[]>("subtabs", []);

    const [items, setItems] = usePersistentState<ItemType[]>("items", []);
    const [hasLocalChanges, setHasLocalChanges] = useState(false);

    const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
    const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
    const [autoOpenNotesFor, setAutoOpenNotesFor] = useState<number | null>(null);

    const [isUserActive, setIsUserActive] = useState(false);

    const [syncTimeoutProgress, setSyncTimeoutProgress] = useState(0);
    const [isUploadingData, setIsUploadingData] = useState(false);
    const [isDownloadingData, setIsDownloadingData] = useState(false);

    const [syncHighlight, setSyncHighlight] = useState<number[]>([]);
    const [draggedItemWasNarrow, setDraggedItemWasNarrow] = useState(false);

    const [clients, setClients] = usePersistentState<ClientType[]>("clients", []);

    return (
        <MainContext.Provider value={{
            maxContentWidth,
            userId, setUserId,
            tabs, setTabs, subtabs, setSubtabs,

            items, setItems,

            editingTitleId, setEditingTitleId,
            editingNotesId, setEditingNotesId,
            autoOpenNotesFor, setAutoOpenNotesFor,

            isUserActive, setIsUserActive,
            hasLocalChanges, setHasLocalChanges,
            syncTimeoutProgress, setSyncTimeoutProgress,

            isUploadingData, setIsUploadingData,
            isDownloadingData, setIsDownloadingData,

            syncHighlight, setSyncHighlight,

            clients, setClients,
            draggedItemWasNarrow, setDraggedItemWasNarrow,

        }}>
            {children}
        </MainContext.Provider>
    );
}

// ✅ Хук для использования контекста
export function useMainContext() {
    const context = useContext(MainContext);
    if (!context) {
        throw new Error("useContext должен использоваться внутри <MainProvider>");
    }
    return context;
}