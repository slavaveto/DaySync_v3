"use client";
import {createContext, useContext, useEffect, useRef, useState, useCallback} from "react";
import usePersistentState from "@/app/init/usePersistentState"
import type {ClientType, ItemType, SubTabType, TabType} from "@/app/types";


// ✅ Определяем типы
interface MainContextType {
    maxContentWidth: number;
    firstLoadFadeIn: boolean;
    setFirstLoadFadeIn: (active: boolean) => void;

    userId: string | null;
    setUserId: (id: string | null) => void;

    items: ItemType[];
    setItems: React.Dispatch<React.SetStateAction<ItemType[]>>;

    tabs: TabType[];
    setTabs: React.Dispatch<React.SetStateAction<TabType[]>>;
    subtabs: SubTabType[];
    setSubtabs: React.Dispatch<React.SetStateAction<SubTabType[]>>;

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
}

// ✅ Создаём контекст
const MainContext = createContext<MainContextType | undefined>(undefined);

// ✅ Провайдер контекста
export function MainContextProvider({children}: { children: React.ReactNode }) {
    const [maxContentWidth, setMaxContentWidth] = useState(550);
    const [firstLoadFadeIn, setFirstLoadFadeIn] = useState(false);

    const [userId, setUserId] = useState<string | null>(null);
    const [items, setItems] = usePersistentState<ItemType[]>("items", []);
    const [tabs, setTabs] = usePersistentState<TabType[]>("tabs", []);
    const [subtabs, setSubtabs] = usePersistentState<SubTabType[]>("subtabs", []);

    const [isUserActive, setIsUserActive] = useState(false);
    const [hasLocalChanges, setHasLocalChanges] = useState(false);
    const [syncTimeoutProgress, setSyncTimeoutProgress] = useState(0);

    const [isUploadingData, setIsUploadingData] = useState(false);
    const [isDownloadingData, setIsDownloadingData] = useState(false);

    const [syncHighlight, setSyncHighlight] = useState<number[]>([]);

    return (
        <MainContext.Provider value={{
            maxContentWidth,
            firstLoadFadeIn, setFirstLoadFadeIn,

            userId, setUserId,
            items, setItems,
            tabs, setTabs, subtabs, setSubtabs,

            isUserActive, setIsUserActive,
            hasLocalChanges, setHasLocalChanges,
            syncTimeoutProgress, setSyncTimeoutProgress,

            isUploadingData, setIsUploadingData,
            isDownloadingData, setIsDownloadingData,

            syncHighlight, setSyncHighlight,
        }}>
            {children}
        </MainContext.Provider>
    );
}

// ✅ Хук для использования контекста
export function useMainContext() {
    const context = useContext(MainContext);
    if (!context) {
        throw new Error("useContext должен использоваться внутри <MainContextProvider>");
    }
    return context;
}