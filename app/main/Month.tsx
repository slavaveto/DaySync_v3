import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useMainContext} from "@/app/context";
import {useDndContext} from "@/app/context_dnd";
import {addDays, addWeeks, format, startOfWeek} from 'date-fns';
import clsx from "clsx";
import {useCalendarScroll} from '@/app/main/utils/useCalendarScroll';
import {TimeColumn} from '@/app/main/utils/TimeColumn';
import {useCellSizeCalculation} from '@/app/main/utils/useCellSizeCalculation';
import {useDayData} from '@/app/main/utils/useDayData';
import {WEEK_DAYS_SHORT2} from '@/app/main/utils/dates_info';
import {useInitialScroll} from '@/app/main/utils/useInitialScroll';
import {throttle} from 'lodash';
import {useReactiveToday} from '@/app/utils/useReactiveToday';
import usePersistentState from "@/app/utils/usePersistentState"


import {
    closestCenter,
    DndContext,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {DroppableMonthView} from '@/app/main/droppable/DroppableMonthView';
import {DraggableItem} from "@/app/main/droppable/DraggableItem";
import {DroppableWeekView} from "@/app/main/droppable/DroppableWeekView";
import {useConstants} from "@/app/constants";

interface Props {
    listHeight: number;
    registerScrollToToday: (fn: () => void) => void;
    onVisibleMonthsChange: (months: string[]) => void;
    onItemSelect?: (item: any) => void;
    selectedItem?: any;
}

export function Month({
                          listHeight, registerScrollToToday, onVisibleMonthsChange,
                          onItemSelect, selectedItem,
                      }: Props) {

    const {items, setItems, setIsUserActive, setHasLocalChanges,} = useMainContext();
    const {draggedItemWasNarrow, weeks, showTimeLines, setShowTimeLines} = useDndContext();
    const C = useConstants(); // короткое имя

    const reactiveToday = useReactiveToday();
    const today = new Date(reactiveToday.year, reactiveToday.month - 1, reactiveToday.day);
    const todayKey = useMemo(() => format(today, "yyyy-MM-dd"), [today]);
    const todayIndex = useMemo(() => (today.getDay() + 6) % 7, [today]);

    const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
    const [isReady, setIsReady] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [cellHeight, setCellHeight] = useState(100);
    const [heightDifference, setHeightDifference] = useState(0);

    const WEEKSBEFORE = 100;
    const WEEKSAFTER = 100;
    const weekDayRowHeight = 30;

    const visibleOffsets = useMemo(() => {
        const start = -WEEKSBEFORE, end = WEEKSAFTER;
        return Array.from({length: end - start + 1}, (_, i) => i + start);
    }, [WEEKSBEFORE, WEEKSAFTER]);

    // Хук для вычисления размеров ячеек
    useCellSizeCalculation(containerRef, listHeight, weekDayRowHeight, weeks, setCellHeight, setHeightDifference);

    const [selectedDayKey, setSelectedDayKey] = usePersistentState<string | null>("selectedDayKey", null);
    // const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

    // Используем хук для скролла
    const {handleScroll: scrollHandler, cleanup} = useCalendarScroll(
        cellHeight, visibleOffsets, today, onVisibleMonthsChange
    );

    // Cleanup при unmount
    React.useEffect(() => {
        return cleanup;
    }, [cleanup]);

    const handleScroll = useMemo(
        () => throttle(() => {
            const el = scrollRef.current;
            if (!el) return;

            const newActiveDays = scrollHandler(el);
            if (newActiveDays) {
                setActiveDays(newActiveDays);
                // console.log(newActiveDays)
            }
        }, 100), // обновляем максимум 10 раз в секунду
        [scrollHandler]
    );

    // Хук для начального скролла
    useInitialScroll(
        scrollRef,
        cellHeight,

        visibleOffsets,
        setIsReady,
        registerScrollToToday,
        today,

        selectedDayKey, // добавить
        selectedItem, // добавить
    );

    // Используем хук для вычисления данных дня
    const {computeDayData} = useDayData();

    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDraggingItem, setIsDraggingItem] = useState(false);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 0
            }
        })
    );

    const [isCopyMode, setIsCopyMode] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey) setIsCopyMode(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (!e.altKey) setIsCopyMode(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        if (!isDraggingItem) {
            document.documentElement.classList.remove('grabbing-cursor');
            document.documentElement.classList.remove('copy-cursor');
            return;
        }
        if (isCopyMode) {
            document.documentElement.classList.add('copy-cursor');
            document.documentElement.classList.remove('grabbing-cursor');
        } else {
            document.documentElement.classList.add('grabbing-cursor');
            document.documentElement.classList.remove('copy-cursor');
        }
        return () => {
            document.documentElement.classList.remove('grabbing-cursor');
            document.documentElement.classList.remove('copy-cursor');
        }
    }, [isDraggingItem, isCopyMode]);


    const handleDragStart = useCallback(({active}: DragStartEvent) => {
        document.documentElement.classList.add('grabbing-cursor');
        onItemSelect?.(null);
        setActiveId(active.id as string);
        setIsDraggingItem(true);
        setIsUserActive(true);
    }, [setIsUserActive]);


    const [isDragForbidden, setIsDragForbidden] = useState(false);
    useEffect(() => {
        // console.log(isDragForbidden)
    }, [isDragForbidden]);

    const handleDragEnd = useCallback((event: any) => {
        const {active, over} = event;

        document.documentElement.classList.remove('grabbing-cursor');
        document.documentElement.classList.remove('copy-cursor');
        setIsDragForbidden(false);
        setActiveId(null);
        setIsDraggingItem(false);
        setIsUserActive(false);

        if (!over) return;

        const dragItemId = Number(active.id);
        const newDateKey = over.id as string;

        const original = items.find(i => i.id === dragItemId);
        if (!original || !original.due_date) return;

        // Проверка с подсветкой
        if (original.type === "meeting" && original.meeting_category && ["client", "supervision", "group"].includes(original.meeting_category)) {
            const now = new Date();
            const meetingDateTime = new Date(`${original.due_date}T${original.meeting_time_end || original.meeting_time_start || '23:59'}:00`);

            const meetingStartDateTime = new Date(`${original.due_date}T${original.meeting_time_start || '00:00'}:00`);

            // if (meetingDateTime <= now && !isCopyMode) {
                if (meetingStartDateTime <= now && !isCopyMode) {

                    setIsDragForbidden(true);
                setTimeout(() => setIsDragForbidden(false), 500); // убираем через 0.5 сек
                return;
            }
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayKey = format(now, "yyyy-MM-dd");

        // Определяем "текущую позицию" элемента
        // Если элемент просрочен (due_date < today) - он показывается на сегодня
        const isOverdue = original.due_date < todayKey && original.type === "task";
        const currentPosition = isOverdue ? todayKey : original.due_date;

        // Если перетащили на ту же позицию где он уже находится — ничего не делаем
        if (currentPosition === newDateKey && !isOverdue) return;

        // Определяем, снимать ли флаг просроченности
        const shouldClearOverdue = newDateKey > todayKey;

        const nowISO = new Date().toISOString();

        if (isCopyMode) {
            // Копируем item с новым id
            const original = items.find(i => i.id === dragItemId);
            if (original) {
                const copy = {
                    ...original,
                    id: Date.now(),
                    due_date: newDateKey,
                    updated_at: nowISO,
                    sync_highlight: true,
                };
                setItems(prev => [copy, ...prev]);
            }
        } else {
            setItems(prev =>
                prev.map(i => {
                    if (i.id === dragItemId) {
                        return {
                            ...i,
                            due_date: newDateKey,
                            updated_at: nowISO,
                            sync_highlight: true
                        };
                    }
                    return i;
                })
            );
        }
        setHasLocalChanges(true);
    }, [items, setItems, setIsUserActive, setHasLocalChanges, isCopyMode]);

    const handleDragCancel = useCallback(() => {
        document.documentElement.classList.remove('grabbing-cursor');
        setActiveId(null);
        setIsDraggingItem(false);
        setIsUserActive(false);
    }, [setIsUserActive]);



    const activeItem = useMemo(() => {
        if (!activeId) return null;

        const originalItem = items.find(i => String(i.id) === activeId);
        if (!originalItem) return null;

        // Добавляем флаг __movedToToday для overlay
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayKey = format(now, "yyyy-MM-dd");

        const isMovedToToday = originalItem.due_date && originalItem.due_date < todayKey && !originalItem.is_checked;

        return {
            ...originalItem,
            __movedToToday: isMovedToToday
        };
    }, [activeId, items]);

    const activeDaysArray = Array.from(activeDays);
    const maxActiveDate = activeDaysArray.length > 0 ? activeDaysArray.sort().pop() : null;

    const itemsByDayMemo = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayKey = format(now, "yyyy-MM-dd");

        const grouped: Record<string, (typeof items[number] & { __movedToToday?: boolean })[]> = {};

        items.forEach(i => {
            if (i.is_deleted || i.is_done || !i.due_date || i.type === "quick_notes") return;

            const [y, m, d] = i.due_date.split("-");
            const dueDate = new Date(+y, +m - 1, +d);
            const dueKey = format(dueDate, "yyyy-MM-dd");

            if (i.type === "task") {
                // if (dueKey < todayKey) {
                if (dueKey < todayKey && !i.is_checked) {
                    // просроченные таски показываем только на today
                    if (!grouped[todayKey]) grouped[todayKey] = [];
                    grouped[todayKey].push({...i, __movedToToday: true});
                    return;
                }
                if (!grouped[dueKey]) grouped[dueKey] = [];
                grouped[dueKey].push({...i, __movedToToday: false});
                return;
            }

            // meetings: всегда в свою дату
            if (i.type === "meeting") {
                if (!grouped[dueKey]) grouped[dueKey] = [];
                grouped[dueKey].push({...i, __movedToToday: false});
            }
        });

        return grouped;
    }, [items]);

    const currentShowTimeLines = showTimeLines[weeks] || false;

    // Определяем, показывать ли колонку времени
    const shouldShowTimeColumn = (() => {
        if (weeks === 1) return true; // всегда для 1 недели
        if (weeks === 5) return false; // никогда для 5 недель
        if (weeks === 2 || weeks === 3) return currentShowTimeLines; // согласно настройке для 2-3 недель
        return false;
    })();

    const prevWeeks = useRef(weeks);
    useEffect(() => {
        // Сбрасываем выделение при любой смене режима, КРОМЕ перехода В week=1
        if (prevWeeks.current !== weeks && weeks !== 1) {
            setSelectedDayKey(null);
        }
        prevWeeks.current = weeks;
    }, [weeks, setSelectedDayKey]);


    // Добавьте функцию проверки
    const checkDragForbidden = useCallback((activeId: string, overId?: string) => {
        if (!activeId || isCopyMode) return false; // если копирование - разрешено

        const dragItemId = Number(activeId);
        const original = items.find(i => i.id === dragItemId);
        if (!original || !original.due_date) return false;

        // Проверка запрета только для обычного drag (не копирования)
        if (original.type === "meeting" && original.meeting_category &&
            ["client", "supervision", "group"].includes(original.meeting_category)) {
            const now = new Date();

            // const meetingDateTime = new Date(`${original.due_date}T${original.meeting_time_end || original.meeting_time_start || '23:59'}:00`);
            // return meetingDateTime <= now;

            const meetingStartDateTime = new Date(`${original.due_date}T${original.meeting_time_start || '00:00'}:00`);
            return meetingStartDateTime <= now;
        }
        return false;
    }, [items, isCopyMode]);

    // Добавьте обработчик onDragOver
    const handleDragOver = useCallback((event: any) => {
        const {active, over} = event;
        const forbidden = checkDragForbidden(active?.id, over?.id);
        setIsDragForbidden(forbidden);
    }, [checkDragForbidden]);

    // Обновляем состояние запрета при изменении режима копирования
    useEffect(() => {
        if (isDraggingItem && activeId) {
            // Пересчитываем запрет с текущим режимом копирования
            const forbidden = checkDragForbidden(activeId, 'dummy'); // overId не важен для этой проверки
            setIsDragForbidden(forbidden);
        }
    }, [isCopyMode, isDraggingItem, activeId, checkDragForbidden]);


    return (
        <div className="mx-auto flex flex-col"
             style={{height: listHeight}}
             ref={containerRef}
        >
            {/* Дни недели */}
            <div className="grid border-b border-t border-default-300"
                 style={{
                     height: `${weekDayRowHeight}px`,
                     gridTemplateColumns: shouldShowTimeColumn
                         ? `${C.TIME_COL_WIDTH}px repeat(7, 1fr)`
                         : 'repeat(7, 1fr)'
                 }}
            >

                {shouldShowTimeColumn && (
                    <div className="border-r border-default-300 bg-content2"></div>
                )}

                {WEEK_DAYS_SHORT2.map((d, i) => (
                    <div
                        key={d}
                        className={clsx(
                            "text-center font-medium border-r border-default-300 last:border-r-0 flex items-center justify-center",
                            i === todayIndex
                                ? "bg-content2 text-primary-400 !font-semibold"
                                : "bg-content2 text-gray-500"
                        )}
                    >
                        {d}
                    </div>
                ))}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                onDragOver={handleDragOver}
            >
                <div
                    ref={scrollRef}
                    className={clsx("flex-1 snap-y snap-mandatory transition-opacity duration-500",
                        isReady
                            ? (isDraggingItem ? "overflow-hidden" : "opacity-100 overflow-y-auto")
                            : "opacity-0 overflow-hidden pointer-events-none",
                        "scroll-smooth"
                    )}
                    onScroll={handleScroll}

                    onClick={(e) => {
                        // Если клик был на самом контейнере (не на элементе)
                        if (e.target === e.currentTarget) {
                            onItemSelect?.(null); // очищаем выбор
                        }
                    }}

                    onDoubleClick={(e) => {
                        // console.log('Double click detected'); // для отладки
                    }}

                >
                    {visibleOffsets.map((offset, index) => {
                        const weekStart = startOfWeek(addWeeks(today, offset), {weekStartsOn: 1});
                        const weekDays = Array.from({length: 7}, (_, i) => addDays(weekStart, i));

                        const weekKeys = weekDays.map(day => format(day, 'yyyy-MM-dd'));
                        const isLastVisibleWeek = maxActiveDate ? weekKeys.includes(maxActiveDate) : false;
                        const weekHeight = isLastVisibleWeek ? cellHeight + heightDifference : cellHeight;

                        const isCurrentWeek = weekKeys.includes(todayKey);

                        return (
                            <div
                                key={offset}
                                className={clsx(
                                    "grid last:border-r-0 snap-start",
                                )}
                                style={{
                                    height: `${weekHeight}px`,
                                    gridTemplateColumns: shouldShowTimeColumn
                                        ? `${C.TIME_COL_WIDTH}px repeat(7, 1fr)`
                                        : 'repeat(7, 1fr)'
                                }}
                            >

                                {shouldShowTimeColumn && (
                                    (() => {
                                        // Вычисляем dayData для первого дня недели
                                        const weekStartKey = format(weekStart, 'yyyy-MM-dd');
                                        const weekStartDayData = computeDayData(weekStart, weekStartKey);

                                        return (
                                            <TimeColumn
                                                weekHeight={weekHeight}
                                                dayData={weekStartDayData}
                                            />
                                        );
                                    })()
                                )}

                                {weekDays.map(dayDate => {
                                    const key = format(dayDate, 'yyyy-MM-dd');
                                    const isVisible = activeDays.has(key);
                                    const isTodayCell = key === todayKey;
                                    // Используем мемоизированные вычисления
                                    const dayData = computeDayData(dayDate, key);
                                    const dayItems = itemsByDayMemo[key] || [];

                                    const DayComponent = (() => {
                                        if (weeks === 1) return DroppableWeekView;
                                        if (weeks === 2 || weeks === 3) {
                                            return currentShowTimeLines ? DroppableWeekView : DroppableMonthView;
                                        }
                                        if (weeks === 5) return DroppableMonthView;
                                        return DroppableWeekView;
                                    })();

                                    return isVisible ? (
                                        <DayComponent
                                            key={key}
                                            dayKey={key}
                                            dayDate={dayDate}
                                            isTodayCell={isTodayCell}
                                            dayData={dayData}
                                            cellHeight={weekHeight}
                                            dayItems={dayItems}
                                            onItemSelect={onItemSelect}
                                            selectedItemId={selectedItem?.id || null}
                                            isCurrentWeek={isCurrentWeek}
                                            onDaySelect={setSelectedDayKey}
                                            isSelectedDay={selectedDayKey === key}
                                        />
                                    ) : (
                                        <div key={key} style={{height: `${weekHeight}px`}}/>
                                    );
                                })}

                            </div>
                        );
                    })}
                </div>


                <DragOverlay
                    dropAnimation={isCopyMode ? null : undefined}
                >
                    {activeItem && (
                        <DraggableItem dayItem={activeItem}
                                       isNarrow={draggedItemWasNarrow}
                                       isDragOverlay={true}
                                       isDragForbidden={isDragForbidden}
                        />
                    )}
                </DragOverlay>

            </DndContext>
        </div>
    );
}