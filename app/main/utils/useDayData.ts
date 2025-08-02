import { useMemo } from 'react';
import { addDays, endOfMonth, isSameDay, startOfMonth, subDays } from 'date-fns';

interface DayData {
    weekday: number;
    isWeekend: boolean;
    isLastDay: boolean;
    isFirstWeek: boolean;
    isAfterLastSunday: boolean;
}

export const useDayData = () => {
    // Мемоизируем функцию вычисления данных дня с кешем
    const computeDayData = useMemo(() => {
        const cache = new Map<string, DayData>();

        return (dayDate: Date, key: string): DayData => {
            if (cache.has(key)) {
                return cache.get(key)!;
            }

            const weekday = dayDate.getDay();
            const isWeekend = weekday === 0 || weekday === 6;

            const end = endOfMonth(dayDate);
            const isLastDay = isSameDay(dayDate, end) && weekday !== 0;

            const monthStart = startOfMonth(dayDate);
            const offsetToSunday = (7 - monthStart.getDay()) % 7;
            const firstSunday = addDays(monthStart, offsetToSunday);
            const isFirstWeek = dayDate <= firstSunday;

            const monthEnd = end;
            const offsetToLastSunday = monthEnd.getDay();
            const lastSunday = subDays(monthEnd, offsetToLastSunday);
            const isAfterLastSunday = dayDate > lastSunday;

            const result: DayData = {
                weekday,
                isWeekend,
                isLastDay,
                isFirstWeek,
                isAfterLastSunday
            };

            cache.set(key, result);
            return result;
        };
    }, []);

    return { computeDayData };
};