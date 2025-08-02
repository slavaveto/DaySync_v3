import { useEffect } from 'react';
import { parseDate } from "@internationalized/date";
import { useReactiveToday } from '@/app/utils/useReactiveToday';
import type { ItemType } from "@/app/types";

interface UseTaskCounterResult {
    overdueCount: number;
    todayCount: number;
    todayBadgeCount: number;
    todayBadgeColor: "danger" | "warning";
}

export function useTaskCounter(items: ItemType[]): UseTaskCounterResult {
    const todayDate = useReactiveToday();

    // Считаем просроченные задачи
    const overdueCount = items.filter(i => {
        if (i.is_done || i.is_deleted || !i.due_date || i.type === "meeting" || i.is_checked) return false;
        const itemDate = parseDate(i.due_date);
        return itemDate.compare(todayDate) < 0;
    }).length;

    // Считаем задачи на сегодня
    const todayCount = items.filter(
        i => !i.is_done && !i.is_deleted && i.type !== "meeting" && i.due_date === todayDate.toString()
    ).length;

    const todayBadgeCount = overdueCount + todayCount;
    const todayBadgeColor = overdueCount > 0 ? "danger" : "warning";

    // Отправка данных в Electron
    useEffect(() => {
        const payload = { todayCount, overdueCount };
        if (typeof window !== 'undefined' && (window as any).electron) {
            (window as any).electron.sendToElectron('update-today-count', payload);
            (window as any).electron.getFromElectron("update-today-count-reply", (data: any) => {
                console.log("📨 Ответ от Electron:", data);
            });
        }
    }, [overdueCount, todayCount]);

    return {
        overdueCount,
        todayCount,
        todayBadgeCount,
        todayBadgeColor
    };
}