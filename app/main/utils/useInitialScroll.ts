import {useEffect} from 'react';
import {differenceInCalendarWeeks, endOfMonth, getDay, startOfMonth, startOfWeek, parse} from 'date-fns';
import {useDndContext} from "@/app/context_dnd";

export function useInitialScroll(
    scrollRef: React.RefObject<HTMLDivElement | null>,
    cellHeight: number,
    visibleOffsets: number[],
    setIsReady: (isReady: boolean) => void,
    registerScrollToToday: (fn: () => void) => void,
    today: Date,
    selectedDayKey?: string | null, // добавить
    selectedItem?: any, // добавить
) {

    const {draggedItemWasNarrow, weeks, monthViewMode} = useDndContext();

    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !cellHeight) return;

        let targetOffset = 0;

        if (weeks === 1) {

            targetOffset = 0;
            // Для 1 недели - проверяем выделение
            // let targetDate = today; // по умолчанию сегодня
            //
            // // Если есть выделенный элемент, используем его дату
            // if (selectedItem?.due_date) {
            //     targetDate = parse(selectedItem.due_date, 'yyyy-MM-dd', new Date());
            // }
            // // Иначе если есть выделенный день, используем его
            // else if (selectedDayKey) {
            //     targetDate = parse(selectedDayKey, 'yyyy-MM-dd', new Date());
            // }
            //
            // // Вычисляем offset до недели с целевой датой
            // const baseWeekStart = startOfWeek(today, {weekStartsOn: 1});
            // const targetWeekStart = startOfWeek(targetDate, {weekStartsOn: 1});
            // targetOffset = differenceInCalendarWeeks(targetWeekStart, baseWeekStart, {weekStartsOn: 1});
        }

        else if (weeks === 5) {
            if (monthViewMode) {
                // Стандартная логика - скролл к началу месяца
                const firstDayOfMonth = startOfMonth(today);
                const lastDayOfMonth = endOfMonth(today);
                const firstWeekStart = startOfWeek(firstDayOfMonth, {weekStartsOn: 1});
                const lastWeekStart = startOfWeek(lastDayOfMonth, {weekStartsOn: 1});
                const calendarRows =
                    differenceInCalendarWeeks(lastWeekStart, firstWeekStart, {weekStartsOn: 1}) + 1;

                const firstDayWeekday = getDay(firstDayOfMonth);

                if (calendarRows === 6 && (firstDayWeekday === 0 || firstDayWeekday === 6)) {
                    const secondWeekStart = startOfWeek(firstDayOfMonth, {weekStartsOn: 1});
                    secondWeekStart.setDate(secondWeekStart.getDate() + 7);
                    const baseWeekStart = startOfWeek(today, {weekStartsOn: 1});
                    targetOffset = differenceInCalendarWeeks(secondWeekStart, baseWeekStart, {weekStartsOn: 1});
                } else {
                    const baseWeekStart = startOfWeek(today, {weekStartsOn: 1});
                    const firstWeekStart = startOfWeek(firstDayOfMonth, {weekStartsOn: 1});
                    targetOffset = differenceInCalendarWeeks(firstWeekStart, baseWeekStart, {weekStartsOn: 1});
                }
            } else {
                // Скролл к текущей неделе
                targetOffset = 0;
            }
        }
        // Для 2 и 3 недель - по умолчанию к сегодняшней неделе
        // targetOffset остается 0

        const idx = visibleOffsets.indexOf(targetOffset);
        if (idx === -1) return;

        el.scrollTo({top: idx * cellHeight - 1, behavior: 'instant'});
        setIsReady(true);

        registerScrollToToday(() => {
            const currentEl = scrollRef.current;
            if (!currentEl) return;

            const todayOffset = 0;
            const todayIdx = visibleOffsets.indexOf(todayOffset);
            if (todayIdx !== -1) {
                const targetPosition = todayIdx * cellHeight;

                currentEl.style.scrollSnapType = 'none';
                currentEl.scrollTo({top: targetPosition, behavior: 'smooth'});

                const onScrollEnd = () => {
                    if (Math.abs(currentEl.scrollTop - targetPosition) < 5) {
                        currentEl.style.scrollSnapType = 'y mandatory';
                        currentEl.removeEventListener('scroll', onScrollEnd);
                    }
                };

                setTimeout(() => {
                    currentEl.addEventListener('scroll', onScrollEnd);
                }, 100);
            }
        });

    }, [cellHeight, weeks, visibleOffsets, monthViewMode]); // добавить зависимости
}