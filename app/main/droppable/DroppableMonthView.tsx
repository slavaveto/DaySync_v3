import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useDroppable} from '@dnd-kit/core';
import clsx from 'clsx';
import {format} from 'date-fns';
import {ru} from 'date-fns/locale';
import {useMainContext} from "@/app/context";
import {useUser} from "@clerk/nextjs";
import type {ItemType} from "@/app/types";
import {Plus} from "lucide-react";
import {calculateMeetingPositions} from "@/app/main/droppable/calculateMeetingPositions";
import {useDndContext} from "@/app/context_dnd";
import {MonthViewList} from './MonthViewList';

interface DroppableDayProps {
    dayKey: string;
    dayDate: Date;
    isTodayCell: boolean;
    dayData: {
        isWeekend: boolean;
        isAfterLastSunday: boolean;
        isFirstWeek: boolean;
        isLastDay: boolean;
    };
    cellHeight: number;
    dayItems: any[];
    onItemSelect?: (item: any) => void;
    selectedItemId?: number | null;
    onCreateItem?: (date: string) => void;
    onDaySelect?: (dayKey: string | null) => void;
    isSelectedDay?: boolean;
}


export const DroppableMonthView = React.memo(({
                                                  dayKey,
                                                  dayDate,
                                                  isTodayCell,
                                                  dayData,
                                                  cellHeight,
                                                  dayItems,
                                                  onItemSelect,
                                                  selectedItemId,
                                                  onCreateItem,
                                                  onDaySelect,
                                                  isSelectedDay,
                                              }: DroppableDayProps) => {

    const {setItems, setHasLocalChanges, setIsUserActive} = useMainContext();
    const {weeks, monthViewMode} = useDndContext();

    const [isCreating, setIsCreating] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0});
    const inputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const {user} = useUser();

    const {setNodeRef, isOver} = useDroppable({
        id: dayKey
    });

    // Закрытие контекстного меню при клике вне
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setShowContextMenu(false);
            }
        };

        if (showContextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showContextMenu]);

    // Автофокус при создании нового элемента
    useEffect(() => {
        if (isCreating && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCreating]);

    // Создание нового элемента (точно как по двойному клику)
    const handleCreateNewItem2 = () => {
        if (!user) return;

        if (newItemTitle.trim()) {
            const baseItem = {
                id: Date.now(),
                title: newItemTitle.trim(),
                due_date: dayKey,
                updated_at: new Date().toISOString(),
                sync_highlight: true,
                is_done: false,
                is_deleted: false,
                order: 0,
                list_key: "inbox",
                user_id: user.id,
            };

            const newItem: ItemType = newItemType === "meeting"
                ? {...baseItem, type: "meeting", meeting_time_start: "09:00", meeting_time_end: "10:00"}
                : {...baseItem, type: "task"};

            setItems(prev => [...prev, newItem]);
            setHasLocalChanges(true);

            setTimeout(() => {
                onItemSelect?.(newItem);
            }, 0);
        }

        // Сбрасываем состояние
        setIsCreating(false);
        setNewItemTitle('');
        setNewItemType("task"); // сбрасываем тип
        setIsUserActive(false);
    };

    const handleCreateNewItem = () => {
        if (!user) return;

        if (newItemTitle.trim()) {
            let trimmedTitle = newItemTitle.trim();

            // Проверяем, есть ли время в названии (форматы: 10:00, 10-00, 9:15 и т.д.)
            // const timePattern = /\b(\d{1,2})[:\-](\d{2})\b/;
            const timePattern = /\b(\d{1,2})(?:[:\-](\d{2})|\-(?!\d))/;

            const timeMatch = trimmedTitle.match(timePattern);

            // Определяем финальный тип элемента
            const finalItemType = timeMatch ? "meeting" : newItemType;

            // Если нашли время, убираем его из названия
            if (timeMatch) {
                trimmedTitle = trimmedTitle.replace(timeMatch[0], '').trim();
            }

            const baseItem = {
                id: Date.now(),
                title: trimmedTitle,
                due_date: dayKey,
                updated_at: new Date().toISOString(),
                sync_highlight: true,
                is_done: false,
                is_deleted: false,
                order: 0,
                list_key: "inbox",
                user_id: user.id,
            };

            let newItem: ItemType;

            if (finalItemType === "meeting") {
                // Если нашли время, используем его как время начала
                if (timeMatch) {
                    const hours = timeMatch[1].padStart(2, '0');
                    const minutes = timeMatch[2] || '00'; // Если минут нет, используем 00
                    const startTime = `${hours}:${minutes}`;

                    // Вычисляем время окончания (+ 1 час)
                    const startHour = parseInt(hours);
                    const endHour = (startHour + 1).toString().padStart(2, '0');
                    const endTime = `${endHour}:${minutes}`;

                    newItem = {
                        ...baseItem,
                        type: "meeting",
                        meeting_time_start: startTime,
                        meeting_time_end: endTime,
                        meeting_category: "misc"
                    };
                } else {
                    // Если время не найдено, используем дефолтные значения
                    newItem = {
                        ...baseItem,
                        type: "meeting",
                        meeting_time_start: "09:00",
                        meeting_time_end: "10:00",
                        meeting_category: "misc"
                    };
                }
            } else {
                newItem = {...baseItem, type: "task"};
            }

            setItems(prev => [...prev, newItem]);
            setHasLocalChanges(true);

            setTimeout(() => {
                onItemSelect?.(newItem);
            }, 0);
        }

        // Сбрасываем состояние
        setIsCreating(false);
        setNewItemTitle('');
        setNewItemType("task"); // сбрасываем тип
        setIsUserActive(false);
    };

    // Отмена создания
    const handleCancelCreate = () => {
        setIsCreating(false);
        setNewItemTitle('');
        setIsUserActive(false);
    };

    const [newItemType, setNewItemType] = useState<"task" | "meeting">("task");
    // Функция для начала создания (одинаковая для двойного клика и контекстного меню)
    const startCreating = (itemType: "task" | "meeting") => {
        if (!isCreating) {
            setIsCreating(true);
            setNewItemType(itemType); // добавьте это состояние
            setIsUserActive(true);
            setShowContextMenu(false);
        }
    };

    // Обработчик правого клика
    const handleContextMenu = (e: React.MouseEvent) => {
        setIsUserActive(true)
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPosition({x: e.clientX, y: e.clientY});
        setShowContextMenu(true);
    };

    const tasks = dayItems
        .filter(i => i.type === "task")
        .sort((a: any, b: any) => {
            // 1. Сначала обязательно tasks, потом all_day_meeting
            // if (a.type === "task" && b.all_day_meeting) return -1;
            // if (a.all_day_meeting && b.type === "task") return 1;

            if (a.all_day_meeting && b.type === "task") return -1;
            if (a.type === "task" && b.all_day_meeting) return 1;

            // 2. Сначала по приоритету
            const priorityOrder: { [key: string]: number } = {'very_important': 0, 'important': 1};
            const aPriority = priorityOrder[a.task_priority] ?? 2;
            const bPriority = priorityOrder[b.task_priority] ?? 2;

            if (aPriority !== bPriority) return aPriority - bPriority;

            // 3. Потом задачи с иконками (is_repeated и task_category)
            const hasIcon = (task: any) => task.is_repeated || task.task_category;
            const aHasIcon = hasIcon(a) ? 0 : 1;
            const bHasIcon = hasIcon(b) ? 0 : 1;

            if (aHasIcon !== bHasIcon) return aHasIcon - bHasIcon;

            // 4. В конце по алфавиту
            return a.title.localeCompare(b.title, {});
        });

    const all_day_meeting = dayItems
        .filter(i => i.all_day_meeting)
        .sort((a: any, b: any) => {
            return a.title.localeCompare(b.title, {});
        });

    const meetings = dayItems
        .filter(i => i.type === "meeting" && !i.all_day_meeting)
        .sort((a: any, b: any) => {
            if (a.type === "meeting" && b.type === "meeting") {
                if (a.meeting_time_start && b.meeting_time_start) {
                    // Сравниваем как строки "09:00"
                    const cmp = a.meeting_time_start.localeCompare(b.meeting_time_start);
                    if (cmp !== 0) return cmp;
                }
            }
            return a.title.localeCompare(b.title, {});
        })

    const TWO_WEEKS_TYPE = 2

    // const PIXELS_PER_MIN = weeks === 1 ? 44 / 60 : 24 / 60;
    const PIXELS_PER_MIN = weeks === 1 ? 34 / 60 : 24 / 60;
    const TOP_SHIFT = weeks === 1 ? 3 : 1.5

    const DAY_START = 7; // 8:00
    const DAY_END = weeks === 1 ? 24 : 20

    const TASK_HEIGHT = 23;    // px на задачу
    const TASKS_MAX = weeks === 1 ? 8 : 3
    const TASKS_PANEL_HEIGHT = TASK_HEIGHT * TASKS_MAX + 6; // 88px

    function parseMinutes(time: string | undefined) {
        if (!time) return 0;
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
    }

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        // Обновлять каждую минуту (или 10-15 сек для плавности)
        const interval = setInterval(() => {
            setNow(new Date());
        }, 15000); // обновлять каждые 15 секунд (можно 60000 для минуты)

        return () => clearInterval(interval);
    }, []);

    // Высота зоны для meetings: (21-8)*60 минут * PIXELS_PER_MIN
    const HOURS = DAY_END - DAY_START;
    const timelineHeight = HOURS * 60 * PIXELS_PER_MIN; // px

    const meetingsWithPositions = calculateMeetingPositions(meetings);

    const filteredMeetings = meetingsWithPositions.filter(m =>
        weeks === 5
            ? ["client", "supervision", "group"].includes(m.meeting_category)
            : true
    );

    return (
        <>
            <div
                ref={setNodeRef}
                className={clsx(
                    "last:border-r-0 border-r border-r-default-300 align-top relative flex flex-col transition duration-200",
                    isTodayCell && "bg-warning-50/60",
                    dayData.isWeekend && !isTodayCell && "bg-content2/50",
                    isSelectedDay && !isTodayCell && "!bg-primary-50/50 dark:!bg-primary-50/30", // добавить выделение дня
                    dayData.isAfterLastSunday ? "border-b-2 border-b-primary/30 pt-[2px]" : "border-b border-b-default-300",
                    dayData.isFirstWeek ? "border-t-2 border-t-primary/30" : "",
                    dayData.isLastDay && "border-r-2 !border-r-primary/30",
                    isOver && "!bg-primary-50/50",
                    // "hover:bg-primary-50/50 dark:hover:!bg-primary-50/30"
                )}
                style={{overflow: "hidden"}}

                onContextMenu={handleContextMenu}

                // onClick={() => {
                //     onItemSelect?.(null);
                // }}

                onClick={(e) => {
                    setIsUserActive(false)
                    // Если клик был на самом контейнере (не на элементе)

                    if (e.target === e.currentTarget) {
                        onItemSelect?.(null); // сбрасываем выделение элемента
                        // onDaySelect?.(dayKey); // выделяем день
                    }
                }}

                onDoubleClick={(e) => {
                    e.stopPropagation();
                    startCreating("task");
                }}
            >
                {/* День и месяц */}
                <div className={clsx(
                    "pr-[10px] my-1 mt-[2px] text-right select-none",
                    isTodayCell ? "text-primary-400 text-[14px] font-bold" : "text-default-500",
                    dayDate.getDate() === 1 ? "text-[14px] font-bold" : ""
                )}>
                    {(isTodayCell || dayDate.getDate() === 1) && (
                        <span className={clsx(
                            "select-none mr-[6px]",
                            isTodayCell || dayDate.getDate() === 1 ? "font-semibold" : "opacity-50"
                        )}>
                            {format(dayDate, "LLL", {locale: ru}).replace(/\.$/, "")}
                        </span>
                    )}
                    {format(dayDate, "d")}
                </div>

                {weeks !== 5 && (
                    <MonthViewList
                    list="meetings"
                    items={all_day_meeting}
                onItemSelect={onItemSelect}
                onDaySelect={onDaySelect}
                selectedItemId={selectedItemId}
                weeks={weeks}
            />
                )}

                {(weeks !== 5 || (weeks === 5 && !monthViewMode)) && (
                    <MonthViewList
                        list="tasks"
                        items={tasks}
                        onItemSelect={onItemSelect}
                        onDaySelect={onDaySelect}
                        selectedItemId={selectedItemId}
                        weeks={weeks}
                    />
                )}

                {/* Inline редактор для нового элемента */}
                {isCreating && (
                    <div
                        className={clsx(
                            "text-default-800 mb-[6px] mx-[2px] flex items-center h-[20px] text-[12px] pl-[4px] pr-[2px] pt-[2px] pb-[1px] rounded",
                            newItemType === "meeting"
                                ? "bg-green-200 border border-green-300"
                                : "bg-primary-100 border border-primary-300"
                        )}
                    >
                        {/*{newItemType === "meeting" && (*/}
                        {/*    <span className="text-default-500  whitespace-nowrap min-w-0 mr-[5px]">*/}
                        {/*        9:00*/}
                        {/*    </span>*/}
                        {/*)}*/}
                        <input
                            ref={inputRef}
                            type="text"
                            spellCheck={false}
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateNewItem();
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelCreate();
                                }
                            }}
                            onBlur={handleCreateNewItem}
                            className="flex-1 bg-transparent outline-none text-[12px] placeholder-default-400 min-w-0"
                            placeholder={newItemType === "meeting" ? "9:00 Новая встреча..." : "Новая задача..."}
                        />
                    </div>
                )}

                {weeks >= TWO_WEEKS_TYPE && weeks !== 5 && (
                    <MonthViewList
                    list="meetings"
                    items={meetingsWithPositions}
                onItemSelect={onItemSelect}
                onDaySelect={onDaySelect}
                selectedItemId={selectedItemId}
                weeks={weeks}
            />
                )}

                {weeks === 5 && monthViewMode && (
                    <MonthViewList
                    list="meetings"
                    items={filteredMeetings}
                onItemSelect={onItemSelect}
                onDaySelect={onDaySelect}
                selectedItemId={selectedItemId}
                weeks={weeks}
            />
                )}

                {/*{weeks === 5 && !monthViewMode && (*/}
                {/*    <MonthViewList list={"tasks"} items={tasks}/>*/}
                {/*)}*/}




            </div>

            {/* Контекстное меню */}
            {showContextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed bg-white border border-default-300 rounded-lg shadow-lg z-50 py-1 min-w-[140px]"
                    style={{
                        top: contextMenuPosition.y,
                        left: contextMenuPosition.x,
                    }}
                >
                    <button
                        onClick={() => startCreating("task")}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50 hover:text-primary-600 flex items-center gap-2 transition-colors"
                    >
                        <Plus size={14}/>
                        Создать задачу
                    </button>
                    <button
                        onClick={() => startCreating("meeting")}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50 hover:text-primary-600 flex items-center gap-2 transition-colors"
                    >
                        <Plus size={14}/>
                        Создать встречу
                    </button>
                </div>
            )}
        </>
    );
});