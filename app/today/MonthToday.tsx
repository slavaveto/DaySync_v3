import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useMainContext} from "@/app/context";
import {useDndContext} from "@/app/context_dnd";
import {addDays, format} from 'date-fns';
import {useDayData} from '@/app/main/utils/useDayData';
import {useReactiveToday} from '@/app/utils/useReactiveToday';
import usePersistentState from "@/app/utils/usePersistentState"
import {CustomProgress} from '@/app/utils/sync/CustomProgress';
import type {ClientType, ItemType} from "@/app/types";

import {
    closestCenter,
    DndContext,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {DraggableItem} from "@/app/main/droppable/DraggableItem";
import {DroppableWeekView} from "@/app/main/droppable/DroppableWeekView";
import {useConstants} from "@/app/constants";
import {useWindowSize} from "@/app/utils/useWindowSize";
import clsx from "clsx";
import {UploadButton} from "@/app/utils/sync/UploadButton";
import {DownloadButton} from "@/app/utils/sync/DownloadButton";

interface Props {
    onVisibleMonthsChange: (months: string[]) => void;
    onItemSelect?: (item: any) => void;
    selectedItem?: any;
}

export function MonthToday({
                               onVisibleMonthsChange,
                               onItemSelect,
                               selectedItem,
                           }: Props) {
    const {
        items, setItems, isUploadingData, isDownloadingData, syncTimeoutProgress, isUserActive,
        setIsUserActive, setHasLocalChanges, clients
    } = useMainContext();
    const {draggedItemWasNarrow, weeks, setWeeks} = useDndContext();

    useEffect(() => {
        setWeeks(2)
    }, []);

    const reactiveToday = useReactiveToday();
    const today = new Date(reactiveToday.year, reactiveToday.month - 1, reactiveToday.day);
    const todayKey = useMemo(() => format(today, "yyyy-MM-dd"), [today]);

    const {winHeight, winWidth} = useWindowSize();
    const C = useConstants();

    const containerRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const [selectedDayKey, setSelectedDayKey] = usePersistentState<string | null>("selectedDayKey", null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDraggingItem, setIsDraggingItem] = useState(false);
    const [isCopyMode, setIsCopyMode] = useState(false);
    const [isDragForbidden, setIsDragForbidden] = useState(false);

    // Получаем дни текущей недели
    // const weekStart = startOfWeek(today, {weekStartsOn: 1});
    // const weekDays = Array.from({length: 7}, (_, i) => addDays(weekStart, i));

    // Получаем 7 дней начиная с сегодня
    const weekDays = Array.from({length: 7}, (_, i) => addDays(today, i));

    const [dayWidth, setDayWidth] = useState(200);

    useEffect(() => {
        const updateDayWidth = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const availableWidth = containerWidth - C.TIME_COL_WIDTH; // вычитаем ширину колонки времени
                const calculatedDayWidth = availableWidth / 3; // 3 дня на экран
                setDayWidth(Math.max(calculatedDayWidth, 200)); // минимум 150px
            }
        };

        updateDayWidth();

        const resizeObserver = new ResizeObserver(updateDayWidth);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [C.TIME_COL_WIDTH]);

    // Используем хук для вычисления данных дня
    const {computeDayData} = useDayData();

    // Группируем items по дням
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
                if (dueKey < todayKey && !i.is_checked) {
                    if (!grouped[todayKey]) grouped[todayKey] = [];
                    grouped[todayKey].push({...i, __movedToToday: true});
                    return;
                }
                if (!grouped[dueKey]) grouped[dueKey] = [];
                grouped[dueKey].push({...i, __movedToToday: false});
                return;
            }

            if (i.type === "meeting") {
                if (!grouped[dueKey]) grouped[dueKey] = [];
                grouped[dueKey].push({...i, __movedToToday: false});
            }
        });

        return grouped;
    }, [items]);

    // DnD sensors
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 0
            }
        })
    );

    // Обработка Alt для копирования
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

    // Курсор при перетаскивании
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
    }, [isDraggingItem, isCopyMode]);

    const handleDragStart = useCallback(({active}: DragStartEvent) => {
        document.documentElement.classList.add('grabbing-cursor');
        onItemSelect?.(null);
        setActiveId(active.id as string);
        setIsDraggingItem(true);
        setIsUserActive(true);
    }, [setIsUserActive, onItemSelect]);

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

        // Проверка запрета на перемещение
        if (original.type === "meeting" && original.meeting_category &&
            ["client", "supervision", "group"].includes(original.meeting_category)) {
            const now = new Date();
            const meetingStartDateTime = new Date(`${original.due_date}T${original.meeting_time_start || '00:00'}:00`);

            if (meetingStartDateTime <= now && !isCopyMode) {
                setIsDragForbidden(true);
                setTimeout(() => setIsDragForbidden(false), 500);
                return;
            }
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayKey = format(now, "yyyy-MM-dd");

        const isOverdue = original.due_date < todayKey && original.type === "task";
        const currentPosition = isOverdue ? todayKey : original.due_date;

        if (currentPosition === newDateKey && !isOverdue) return;

        const nowISO = new Date().toISOString();

        if (isCopyMode) {
            const copy = {
                ...original,
                id: Date.now(),
                due_date: newDateKey,
                updated_at: nowISO,
                sync_highlight: true,
            };
            setItems(prev => [copy, ...prev]);
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

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayKey = format(now, "yyyy-MM-dd");

        const isMovedToToday = originalItem.due_date && originalItem.due_date < todayKey && !originalItem.is_checked;

        return {
            ...originalItem,
            __movedToToday: isMovedToToday
        };
    }, [activeId, items]);

    // Регистрируем функцию скролла к сегодня
    useEffect(() => {
        const scrollToToday = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    left: 0, // Сегодня всегда слева
                    behavior: 'smooth'
                });
            }
        };

    }, [today]);

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

    const DAY_END = weeks === 1 ? 24 : 24;
    const HOURS = DAY_END - C.DAY_START;
    const PIXELS_PER_MIN = weeks === 1
        ? 34 / 60
        : weeks <= 3
            ? 24 / 60
            : 22 / 60;

    const TASK_HEIGHT = 23;
    const TASKS_MAX = weeks === 1 ? 8 : 6;
    const TASKS_PANEL_HEIGHT = TASK_HEIGHT * TASKS_MAX + 6;

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        // Форс-обновление компонента каждую минуту (можно чаще)
        const timer = setInterval(() => setNow(new Date()), 15000); // 15 сек или 60_000 мс — как хочешь
        return () => clearInterval(timer);
    }, []);

    function getNextMeetingInfo(items: ItemType[], clients: ClientType[], now: Date) {

        const futureMeetings = items
            .filter(item =>
                item.type === "meeting" &&
                !item.is_deleted &&           // добавь эту строку
                !item.is_done &&             // добавь эту строку
                // (item.meeting_category === "client" || item.meeting_category === "supervision") &&
                item.meeting_time_start &&
                // Дата встречи >= сегодня (или сейчас)
                new Date(item.due_date + "T" + item.meeting_time_start + ":00") >= now
            )
            .sort((a, b) => {
                // Сортируем по времени начала
                const aTime = new Date(a.due_date + "T" + a.meeting_time_start + ":00");
                const bTime = new Date(b.due_date + "T" + b.meeting_time_start + ":00");
                return aTime.getTime() - bTime.getTime();
            });

        // Проверяем текущую встречу
        const currentMeeting = items.find(item => {
            if (item.type !== "meeting") return false;
            if (item.is_deleted || item.is_done) return false;
            if (item.all_day_meeting) return false;
            if (!(item.meeting_time_start && item.meeting_time_end)) return false;
            const start = new Date(item.due_date + "T" + item.meeting_time_start + ":00");
            const end = new Date(item.due_date + "T" + item.meeting_time_end + ":00");
            return now >= start && now < end;
        });

        // Если есть текущая встреча, проверяем сколько до конца
        if (currentMeeting) {
            const currentEnd = new Date(currentMeeting.due_date + "T" + currentMeeting.meeting_time_end + ":00");
            const minutesUntilEnd = Math.ceil((currentEnd.getTime() - now.getTime()) / 60000);

            // Если до конца текущей встречи больше 10 минут - не показываем следующую
            if (minutesUntilEnd > 10) {
                return null;
            }
            // Если 10 минут или меньше - продолжаем искать следующую встречу
        }

        // Берём ближайшую подходящую
        const next = futureMeetings[0];

        if (!next) return null;

        const displayTitle = (() => {
            if (next.type === "meeting" && next.client_id && clients) {
                const client = clients.find(c => c.id === next.client_id);
                return client?.name || next.title;
            }
            return next.title;
        })();

        // Проверяем, что встреча сегодня
        const nextStart = new Date(next.due_date + "T" + next.meeting_time_start);
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // Если встреча не сегодня - не показываем
        if (nextStart < todayStart || nextStart > todayEnd) {
            return null;
        }

        // Считаем разницу в минутах
        // const nextStart = new Date(next.due_date + "T" + next.meeting_time_start);
        const diffMs = nextStart.getTime() - now.getTime();
        const diffMin = Math.ceil(diffMs / 60000);

        if (diffMin >= 120) return null;

        // Если больше 60 минут, конвертируем в часы и минуты
        if (diffMin >= 60) {
            const hours = Math.floor(diffMin / 60);
            const minutes = diffMin % 60;

            return {
                category: next.meeting_category,
                title: displayTitle,
                minutesLeft: diffMin,
                hours: hours,
                minutes: minutes,
                formattedTime: minutes > 0
                    ? `${hours} ч ${minutes} мин`
                    : `${hours} ч`
            };
        } else {
            // Меньше часа - показываем только минуты
            return {
                category: next.meeting_category,
                title: displayTitle,
                minutesLeft: diffMin,
                formattedTime: `${diffMin} мин`,
            };
        }

        return null;
    }

    const nextMeetingInfo = useMemo(() => getNextMeetingInfo(items, clients, now), [items, clients, now]);

    return (
        <>
        <div
            className="relative flex flex-col h-full"
            ref={containerRef}
        >
            <div className="w-full">

                <CustomProgress
                    value={!isUploadingData ? syncTimeoutProgress : undefined}
                    isUploadingData={isUploadingData}
                    isDownloadingData={isDownloadingData}
                    isUserActive={isUserActive}
                    winWidth={winWidth}
                />
            </div>


                        <UploadButton/>
                        <DownloadButton/>
            {nextMeetingInfo && (
                <div
                    className={clsx(
                        "absolute font-medium bg-default-50 top-[10px] right-2 flex flex-col",
                        "justify-end text-center text-[12px] z-10 p-2 px-3",
                        "rounded border border-default-300 shadow"
                    )}>
                    <>
                        {(nextMeetingInfo.category === "client" || nextMeetingInfo.category === "supervision") ? (
                            <p className={"mt-1"}>Встреча с <span className={"font-semibold"}>{nextMeetingInfo.title}</span> через
                            </p>
                        ) : (

                            <p className={"mt-1"}>
                                <span className={"font-semibold"}>{nextMeetingInfo.title.charAt(0).toUpperCase() + nextMeetingInfo.title.slice(1)}</span> через
                            </p>
                        )

                        }
                        <p
                            className={clsx(
                                "text-[14px] mt-1",
                                "font-semibold",
                                nextMeetingInfo.minutesLeft <= 15 && "text-danger",
                                nextMeetingInfo.minutesLeft > 15 && nextMeetingInfo.minutesLeft <= 60 && "text-warning",
                                nextMeetingInfo.minutesLeft > 60 && "text-primary-500"
                            )}>{nextMeetingInfo.formattedTime}

            </p>
                        </>

                </div>
            )}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                onDragOver={handleDragOver}
            >
                {/* Контейнер с фиксированной колонкой времени */}
                <div className="flex flex-1">

                    {/* Фиксированная колонка времени */}
                    <div
                        className="bg-content2 border-r border-default-300 flex-shrink-0 relative"
                        style={{width: `${C.TIME_COL_WIDTH + 1}px`, height: `${winHeight - 4}px`}}
                    >

                        {/* Разметка времени */}
                        {Array.from({length: HOURS + 1}).map((_, i) => {
                            const hour = C.DAY_START + i;
                            const top = TASKS_PANEL_HEIGHT + 28.5 + (i * 60 * PIXELS_PER_MIN);
                            const isTwelve = hour === 12;

                            return (
                                <div
                                    key={hour}
                                    className="absolute text-[14px] text-default-500 text-right w-full"
                                    style={{
                                        top: top, // сдвигаем вверх чтобы центрировать относительно линии
                                        fontSize: '10px',
                                        lineHeight: '12px'
                                    }}
                                >
                                    <span className={`block pr-[3px] ${isTwelve ? 'font-bold text-default-700' : ''}`}>
                                        {hour.toString().padStart(2, '0')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-x-auto overflow-y-hidden scroll-smooth"
                        // className="flex-1 overflow-hidden"
                        style={{
                            scrollSnapType: 'x mandatory',
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                onItemSelect?.(null);
                            }
                        }}
                    >
                        <div
                            className="flex h-full"
                            style={{minWidth: 'max-content'}}
                        >
                            {weekDays.map(dayDate => {
                                const key = format(dayDate, 'yyyy-MM-dd');
                                const isTodayCell = key === todayKey;
                                const dayData = computeDayData(dayDate, key);
                                const dayItems = itemsByDayMemo[key] || [];

                                return (
                                    <div
                                        key={key}
                                        style={{
                                            width: `${dayWidth}px`, // используем вычисленную ширину
                                            scrollSnapAlign: 'start'
                                        }}
                                        className="flex-shrink-0 border-r border-default-300 last:border-r-0" // добавили border
                                    >
                                        <DroppableWeekView
                                            dayKey={key}
                                            dayDate={dayDate}
                                            isTodayCell={isTodayCell}
                                            dayData={dayData}
                                            cellHeight={winHeight - 4}
                                            dayItems={dayItems}
                                            onItemSelect={onItemSelect}
                                            selectedItemId={selectedItem?.id || null}
                                            isCurrentWeek={true}
                                            onDaySelect={setSelectedDayKey}
                                            isSelectedDay={selectedDayKey === key}
                                            whatWindow={"today"}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
                <DragOverlay
                    dropAnimation={isCopyMode ? null : undefined}
                >
                    {activeItem && (
                        <DraggableItem
                            dayItem={activeItem}
                            isNarrow={draggedItemWasNarrow}
                            isDragOverlay={true}
                            isDragForbidden={isDragForbidden}
                        />
                    )}
                </DragOverlay>
            </DndContext>
        </div>

    </>
    );
}