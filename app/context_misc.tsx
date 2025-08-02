"use client";
import {createContext, useContext, useEffect, useRef, useState, useCallback} from "react";
import usePersistentState from "@/app/utils/usePersistentState"
import {format} from "date-fns";


// ✅ Определяем типы
interface MiscTabContextType {



    activeMainTab: "lists" | "week" | "2weeks" | "3weeks" | "month" | "misc" | "money";
    setActiveMainTab: (tab: "lists" | "week" | "2weeks" | "3weeks" | "month" | "misc" | "money") => void;

    activeMiscTab: "clients" | "payments" | "fixed" | "expenses";
    setActiveMiscTab: (tab: "clients" | "payments" | "fixed" | "expenses") => void;

    selectedMonth: string;
    setSelectedMonth: (month: string) => void;

    euroToUsdRate: number;
    setEuroToUsdRate: (rate: number) => void;
    usdToUyuRate: number;
    setUsdToUyuRate: (rate: number) => void;
    euroToUyuRate: number;
    setEuroToUyuRate: (rate: number) => void;


}

// ✅ Создаём контекст
const MiscTabContext = createContext<MiscTabContextType | undefined>(undefined);

// ✅ Провайдер контекста
export function MiscTabProvider({children}: { children: React.ReactNode }) {

    const [euroToUsdRate, setEuroToUsdRate] = useState<number>(1.15);
    const [usdToUyuRate, setUsdToUyuRate] = useState<number>(40.0);
    const [euroToUyuRate, setEuroToUyuRate] = useState<number>(46.0);


    const [activeMainTab, setActiveMainTab] = usePersistentState<"lists" | "week" | "2weeks" | "3weeks" | "month" | "misc" | "money">(
        "activeMainTab",
        "month"
    );

    const [selectedMonth, setSelectedMonth] = usePersistentState(
        "clientsSelectedMonth",
        format(new Date(), "yyyy-MM") // текущий месяц как дефолт
    );

    const [activeMiscTab, setActiveMiscTab] = usePersistentState
    < "clients" | "payments" | "fixed" | "expenses" > (
        "activeMiscTab",
            "clients");



    return (
        <MiscTabContext.Provider value={{
            euroToUsdRate, setEuroToUsdRate,
            usdToUyuRate, setUsdToUyuRate,
            euroToUyuRate, setEuroToUyuRate,

            activeMainTab, setActiveMainTab,
            activeMiscTab, setActiveMiscTab,
            selectedMonth, setSelectedMonth


        }}>
            {children}
        </MiscTabContext.Provider>
    );
}

// ✅ Хук для использования контекста
export function useMiscTabContext() {
    const context = useContext(MiscTabContext);
    if (!context) {
        throw new Error("useContext должен использоваться внутри <MiscTabProvider>");
    }
    return context;
}