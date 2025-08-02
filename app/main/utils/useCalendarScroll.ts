import { useCallback, useRef } from 'react';
import { addDays, addWeeks, format, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';

export const useCalendarScroll = (
    cellHeight: number,
    visibleOffsets: number[],
    today: Date,
    onVisibleMonthsChange: (months: string[]) => void
) => {
    const prevMonthsRef = useRef<string[]>([]);
    const rafRef = useRef<number | undefined>(undefined);
    const lastScrollTopRef = useRef<number>(0);

    // Кэш для вычисленных недель
    const weekCacheRef = useRef<Map<number, string[]>>(new Map());

    // Предвычисляем недели для текущих offsets
    const getWeekDays = useCallback((offset: number): string[] => {
        const cached = weekCacheRef.current.get(offset);
        if (cached) return cached;

        const weekStart = startOfWeek(addWeeks(today, offset), { weekStartsOn: 1 });
        const days = Array.from({ length: 7 }, (_, i) =>
            format(addDays(weekStart, i), "yyyy-MM-dd")
        );

        weekCacheRef.current.set(offset, days);
        return days;
    }, [today]);

    const handleScroll = useCallback((scrollElement: HTMLElement) => {
        const { scrollTop, clientHeight } = scrollElement;

        // Отменяем предыдущий RAF
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        // Вычисляем видимые индексы
        const startIdx = Math.floor((scrollTop + 5) / cellHeight);
        const endIdx = Math.floor((scrollTop + clientHeight - 5) / cellHeight);

        // Собираем активные дни
        const days = new Set<string>();
        const bufferWeeks = 0;
        const bufferedStartIdx = Math.max(0, startIdx - bufferWeeks);
        const bufferedEndIdx = Math.min(visibleOffsets.length - 1, endIdx + bufferWeeks);

        for (let i = bufferedStartIdx; i <= bufferedEndIdx; i++) {
            const offset = visibleOffsets[i];
            const weekDays = getWeekDays(offset);
            weekDays.forEach(day => days.add(day));
        }

        // Обновление месяцев откладываем через RAF
        rafRef.current = requestAnimationFrame(() => {
            // Собираем видимые месяцы без буфера
            const monthsSet = new Set<string>();
            const yearSet = new Set<string>();

            for (let i = startIdx; i <= endIdx && i < visibleOffsets.length; i++) {
                const offset = visibleOffsets[i];
                const weekDays = getWeekDays(offset);

                weekDays.forEach(day => {
                    const [year, month] = day.split('-');
                    monthsSet.add(`${year}-${month}`);
                    yearSet.add(year);
                });
            }

            // Формируем результат
            if (monthsSet.size > 0) {
                const sortedMonths = Array.from(monthsSet).sort();
                const monthNames = sortedMonths.map(yearMonth => {
                    const [year, month] = yearMonth.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1);
                    return format(date, "LLL", { locale: ru })
                        .replace(/\.$/, "")
                        .replace(/^\w/, c => c.toUpperCase());
                });

                const currentYear = Array.from(yearSet).sort()[0];
                const result = [...monthNames, currentYear];

                // Обновляем только если изменилось
                if (JSON.stringify(prevMonthsRef.current) !== JSON.stringify(result)) {
                    prevMonthsRef.current = result;
                    onVisibleMonthsChange(result);
                }
            }
        });

        return days;
    }, [cellHeight, visibleOffsets, getWeekDays, onVisibleMonthsChange]);

    // Cleanup
    const cleanup = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }
    }, []);

    return { handleScroll, cleanup };
};