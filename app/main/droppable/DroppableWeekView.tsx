import React, {useEffect, useRef, useState} from 'react';
import {useDroppable} from '@dnd-kit/core';
import clsx from 'clsx';
import {format} from 'date-fns';
import {ru} from 'date-fns/locale';
import {DraggableItem} from '@/app/main/droppable/DraggableItem';
import {useUser} from "@clerk/nextjs";
import type {ItemType} from "@/app/types";
import {Plus} from "lucide-react";
import {calculateMeetingPositions} from '@/app/main/droppable/calculateMeetingPositions';
import {useMainContext} from "@/app/context";
import {useDndContext} from "@/app/context_dnd";
import {useConstants} from "@/app/constants";
import {WEEK_DAYS_SHORT2} from '@/app/main/utils/dates_info';
import {useDevice} from "@/app/utils/providers/MobileDetect";

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
    isCurrentWeek?: boolean;
    onDaySelect?: (dayKey: string | null) => void;
    isSelectedDay?: boolean; // новый пропс
    whatWindow?: string;
}

export const DroppableWeekView = React.memo(({
                                                 dayKey, dayDate, isTodayCell, dayData, cellHeight, dayItems,
                                                 onItemSelect, selectedItemId, onCreateItem, isCurrentWeek,
                                                 onDaySelect, isSelectedDay, whatWindow
                                             }: DroppableDayProps) => {

    const notMainWindow = !!whatWindow;

    const {setItems, setHasLocalChanges, setIsUserActive} = useMainContext();
    const {weeks} = useDndContext();
    const C = useConstants(); // короткое имя

    const {forcedMode, isMobile, isTablet, isDesktop} = useDevice();


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

    const MONTHS_SHORT = [
        '', 'янв', 'фев', 'мар', 'апр', 'мая', 'июня',
        'июля', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ];

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
        // .filter(i => i.type === "task" || i.all_day_meeting)
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

    const filteredMeetings = meetings.filter(m =>
        weeks === 5
            ? ["client", "supervision"].includes(m.meeting_category)
            : true
    );

    const TWO_WEEKS_TYPE = 2

    // const PIXELS_PER_MIN = weeks === 1 ? 44 / 60 : 24 / 60;
    const PIXELS_PER_MIN = weeks === 1
        ? 34 / 60
        : weeks === 2 || weeks === 3
            ? 24 / 60
            : 22 / 60;

    const TOP_SHIFT = weeks === 1 ? 3 : 2.5

    // const DAY_START = 8; // 8:00
    const DAY_END = weeks === 1 ? 24 : (notMainWindow ? 24 : 21)

    const TASK_HEIGHT = 23;    // px на задачу

    // const TASKS_MAX = weeks === 1 ? 8 : 3
    const TASKS_MAX = weeks === 1 ? 8 : (notMainWindow ? 6 : 3);

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
    const HOURS = DAY_END - C.DAY_START;
    const timelineHeight = HOURS * 60 * PIXELS_PER_MIN; // px

    const [isEditingMeeting, setIsEditingMeeting] = useState(false);
    const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);
    const [editingMeetingTitle, setEditingMeetingTitle] = useState('');
    const [editingMeetingPosition, setEditingMeetingPosition] = useState(0);
    const meetingInputRef = useRef<HTMLInputElement>(null);

    const handleCancelMeetingEdit = () => {
        // if (editingMeetingId) {
        //     // Удаляем встречу если отменили редактирование
        //     setItems(prev => prev.filter(item => item.id !== editingMeetingId));
        // }
        setIsUserActive(false);
        setIsEditingMeeting(false);
        setEditingMeetingId(null);
        setEditingMeetingTitle('');
    };

    // Автофокус для встречи
    useEffect(() => {
        if (isEditingMeeting && meetingInputRef.current) {
            meetingInputRef.current.focus();
        }
    }, [isEditingMeeting]);

    const [editingMeetingStartTime, setEditingMeetingStartTime] = useState('');

    const [tempMeetingData, setTempMeetingData] = useState<{
        startTime: string;
        endTime: string;
        position: number;
    } | null>(null);

    // const handleCreateMeeting = (title: string) => {
    //     if (!user || !editingMeetingId) return;
    //
    //     setItems(prev => prev.map(item =>
    //         item.id === editingMeetingId
    //             ? {
    //                 ...item,
    //                 title: title.trim() || "Новая встреча",
    //                 updated_at: new Date().toISOString(),
    //                 sync_highlight: true
    //             }
    //             : item
    //     ));
    //     setHasLocalChanges(true);
    //     setIsUserActive(false);
    //     setIsEditingMeeting(false);
    //     setEditingMeetingId(null);
    //     setEditingMeetingTitle('');
    // };
    //
    const handleCreateMeeting = (title: string) => {
        if (!user || !tempMeetingData) return;

        const newMeeting: ItemType = {
            id: Date.now(),
            title: title.trim() || "Новая встреча",
            type: "meeting",
            due_date: dayKey,
            meeting_time_start: tempMeetingData.startTime,
            meeting_time_end: tempMeetingData.endTime,
            meeting_category: "misc",
            updated_at: new Date().toISOString(),
            sync_highlight: true,
            is_done: false,
            is_deleted: false,
            order: 0,
            list_key: "inbox",
            user_id: user.id,
        };

        setItems(prev => [...prev, newMeeting]);
        setIsUserActive(false);
        setHasLocalChanges(true);

        // Автоматически открываем встречу в правой панели
        setTimeout(() => {
            onItemSelect?.(newMeeting);
        }, 0);

        // Очищаем состояния
        setIsEditingMeeting(false);
        setEditingMeetingTitle('');
        setEditingMeetingStartTime('');
        setTempMeetingData(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isEditingMeeting && meetingInputRef.current && !meetingInputRef.current.contains(event.target as Node)) {
                // Клик вне инпута - завершаем или отменяем редактирование
                if (editingMeetingTitle.trim()) {
                    handleCreateMeeting(editingMeetingTitle);
                } else {
                    handleCancelMeetingEdit();
                }
            }
        };

        if (isEditingMeeting) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEditingMeeting, editingMeetingTitle]);

    const meetingsWithPositions = calculateMeetingPositions(meetings);

    return (
        <>
            <div
                ref={setNodeRef}
                className={clsx(
                    "last:border-r-0 border-r border-r-default-300 align-top relative flex flex-col transition duration-200",
                    isTodayCell && "bg-warning-50/60",
                    dayData.isWeekend && !isTodayCell && "bg-content2/50",
                    isSelectedDay && !isTodayCell && "!bg-primary-50/50 dark:!bg-primary-50/30", // добавить выделение дня

                    !notMainWindow ? (
                        dayData.isAfterLastSunday
                            ? "border-b-2 border-b-primary/30 pt-[2px]"
                            : "border-b border-b-default-300"
                    ) : "",
                    !notMainWindow && dayData.isFirstWeek ? "border-t-2 border-t-primary/30" : "",
                    !notMainWindow && dayData.isLastDay && "border-r-2 !border-r-primary/30",

                    isOver && "!bg-primary-50/50",
                    // "hover:!bg-primary-50/50 dark:hover:!bg-primary-50/30"
                )}
                style={{
                    overflow: "hidden",
                    height: `${cellHeight}px`,
                }}
                onContextMenu={handleContextMenu}

                // onClick={() => {
                //     onItemSelect?.(null);
                // }}

                // onClick={(e) => {
                //     // Если клик был на самом контейнере (не на элементе)
                //     if (e.target === e.currentTarget) {
                //         onItemSelect?.(null); // сбрасываем выделение элемента
                //         onDaySelect?.(dayKey); // выделяем день
                //     }
                // }}

                onClick={(e) => {
                    setIsUserActive(false)

                    onItemSelect?.(null);
                    // onDaySelect?.(dayKey);
                }}

                onDoubleClick={(e) => {
                    e.stopPropagation();
                    startCreating("task");
                }}
            >
                {/* День и месяц */}
                {notMainWindow ? (
                    <div className={clsx(
                        "pr-[10px] my-[6px]  text-right select-none",
                        isTodayCell ? "text-primary-400 text-[14px] font-semibold" : "text-default-500 font-medium",
                    )}>
                        <span className="select-none mr-[6px] opacity-70">
                            {WEEK_DAYS_SHORT2[(dayDate.getDay() + 6) % 7]},
                        </span>

                        <span className="select-none">
                            {format(dayDate, "d")}
                        </span>

                        {(isTodayCell || dayDate.getDate() === 1) && (
                            <span className={clsx(
                                "select-none ml-[3px]",
                            )}>
                                {MONTHS_SHORT[dayDate.getMonth() + 1]}
                            </span>
                        )}
                    </div>

                ) : (
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
                )}

                < div
                    className={clsx(
                        "space-y-[2px] mx-[2px] mb-[6px]",
                    )}
                    style={
                        {minHeight: TASKS_PANEL_HEIGHT, maxHeight: TASKS_PANEL_HEIGHT, overflow: "auto"}
                    }
                >

                    {all_day_meeting.length > 0 && (
                    < div
                        className={clsx(
                            "space-y-[2px] mb-[6px]",
                        )}

                    >
                    {all_day_meeting.map(dayItem => (
                        <div key={dayItem.id}
                        className={clsx(

                        )}
                        >
                            <DraggableItem
                                key={dayItem.id}
                                dayItem={dayItem}
                                onItemSelect={onItemSelect}
                                isSelected={selectedItemId === dayItem.id}
                                onDaySelect={onDaySelect}
                                whatWindow={whatWindow}
                            />
                        </div>
                    ))}
                    </div>
                    )}

                    {tasks.map(dayItem => (
                        <div key={dayItem.id}>
                            <DraggableItem
                                key={dayItem.id}
                                dayItem={dayItem}
                                onItemSelect={onItemSelect}
                                isSelected={selectedItemId === dayItem.id}
                                onDaySelect={onDaySelect}
                                whatWindow={whatWindow}
                            />
                        </div>
                    ))}

                    {/* Inline редактор для нового элемента */}
                    {isCreating && (
                        <div
                            className={clsx(
                                "text-default-800 mx-[2px] flex items-center h-[20px] pl-[4px] pr-[2px]",
                                "pt-[2px] pb-[1px] rounded bg-primary-100 border border-primary-300",
                                whatWindow === "mobile" ? "text-[16px]" : "text-[12px]"
                                )}
                                >
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
                                className={clsx(
                                    "flex-1 bg-transparent outline-none placeholder-default-400 min-w-0",
                                    whatWindow === "mobile" ? "text-[16px]" : "text-[12px]"
                                )}
                                placeholder={"Новая задача..."}
                            />
                        </div>
                    )}

                </div>



                <div
                    className="relative flex-1"
                    style={{minHeight: timelineHeight, background: "none"}}

                    onDoubleClick={(e) => {
                        e.stopPropagation();

                        setIsUserActive(true);

                        // Вычисляем время клика
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickY = e.clientY - rect.top;
                        const clickedMinutes = Math.round(clickY / PIXELS_PER_MIN);

                        // console.log(clickedMinutes)

                        // Округляем с логикой: 0-29 → 0, 30-59 → 30
                        const totalHours = Math.floor(clickedMinutes / 60);
                        const minutesInHour = clickedMinutes % 60;
                        const roundedMinutes = minutesInHour >= 30 ? 30 : 0;
                        // Вычисляем финальное время
                        const finalHour = totalHours + C.DAY_START;
                        const finalMinutes = roundedMinutes;
                        // Проверяем границы
                        const clampedHour = Math.max(C.DAY_START, Math.min(DAY_END - 1, finalHour));
                        const startTime = `${clampedHour.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
                        // Время окончания + 1 час
                        const endHour = clampedHour + 1;
                        const endTime = `${endHour.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;

                        // if (!user) return;
                        //
                        // const newMeeting: ItemType = {
                        //     id: Date.now(),
                        //     title: "",
                        //     type: "meeting",
                        //     due_date: dayKey,
                        //     meeting_time_start: startTime,
                        //     meeting_time_end: endTime,
                        //     meeting_category: "misc",
                        //     updated_at: new Date().toISOString(),
                        //     sync_highlight: true,
                        //     is_done: false,
                        //     is_deleted: false,
                        //     order: 0,
                        //     list_key: "inbox",
                        //     user_id: user.id,
                        // };
                        //
                        // setItems(prev => [...prev, newMeeting]);
                        //

                        // Запускаем редактирование
                        const position = (parseMinutes(startTime) - C.DAY_START * 60) * PIXELS_PER_MIN + TOP_SHIFT;
                        setTempMeetingData({startTime, endTime, position});
                        setIsEditingMeeting(true);
                        setEditingMeetingTitle('');
                        setEditingMeetingPosition(position);
                        setEditingMeetingStartTime(startTime);

                        //
                        // setIsEditingMeeting(true);
                        // setEditingMeetingId(newMeeting.id);
                        // setEditingMeetingTitle('');
                        // setEditingMeetingPosition(position);
                        // setEditingMeetingStartTime(startTime);
                    }}
                >
                    {/* линии разметки */}
                    {Array.from({length: HOURS * 2 + 1}).map((_, i) => {
                        const minute = i * 30;
                        const top = minute * PIXELS_PER_MIN; // никаких смещений!
                        const isHour = minute % 60 === 0;
                        return (
                            <div
                                className={clsx(
                                    isHour ? "bg-default-200/60 dark:bg-default-200/30" : "bg-default-100/60",
                                )}
                                key={i}
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    top: Math.round(top), // или просто top
                                    height: 1,
                                    zIndex: 0,
                                }}
                            />
                        );
                    })}

                    {/* meetings c абсолютным top по времени */}
                    {meetingsWithPositions.map((m, idx) => {
                        // minutes from DAY_START (например, 8:00)
                        const startMin = parseMinutes(m.meeting_time_start);
                        const endMin = parseMinutes(m.meeting_time_end || m.meeting_time_start); // если нет окончания — 0 длительность

                        // top: начало встречи (относительно DAY_START)
                        const top = (startMin - C.DAY_START * 60) * PIXELS_PER_MIN + TOP_SHIFT;

                        // height: длительность встречи (в минутах)
                        const duration = Math.max(30, endMin - startMin); // минимально 30 мин, или сколько есть
                        const height = duration * PIXELS_PER_MIN;

                        // Вычисляем ширину и позицию по горизонтали
                        const widthPercent = 100 / m.totalColumns;
                        const leftPercent = (m.column * widthPercent);

                        return (
                            <div
                                className={clsx("mx-[2px]")}
                                key={m.id}
                                style={{
                                    position: "absolute",
                                    left: `calc(${leftPercent}% + ${m.column > 0 ? '-2px' : '0px'})`,
                                    width: `calc(${widthPercent}% - 4px - ${m.column > 0 ? '-2px' : '0px'})`,
                                    top,
                                    height,
                                    zIndex: 1,
                                }}
                            >
                                <DraggableItem
                                    key={m.id}
                                    dayItem={m}
                                    onItemSelect={onItemSelect}
                                    isSelected={selectedItemId === m.id}
                                    isNarrow={m.totalColumns > 1}
                                    whatWindow={whatWindow}
                                />
                            </div>
                        );
                    })}

                    {/* --- ТЕКУЩАЯ КРАСНАЯ ЛИНИЯ --- */}
                    {weeks < 5 && isCurrentWeek && (() => {
                        const hour = now.getHours();
                        const min = now.getMinutes();
                        if (hour >= C.DAY_START && hour <= DAY_END) {
                            const minsSinceStart = (hour - C.DAY_START) * 60 + min;
                            const top = minsSinceStart * PIXELS_PER_MIN;
                            const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;

                            return (
                                <>
                                    {/* Основная линия для всех дней */}
                                    {!isTodayCell && (
                                        <div
                                            className="mx-[0px] w-full pointer-events-none"
                                            style={{
                                                position: "absolute",
                                                left: 0,
                                                right: 0,
                                                top,
                                                height: 1,
                                                background: "#EF444466",
                                                zIndex: 3,
                                            }}
                                        />
                                    )}

                                    {/* Для сегодняшнего дня - две линии по бокам времени */}
                                    {isTodayCell && (
                                        <>
        {/* Левая часть линии */}
                                            <div
                                                className="mx-[0px] pointer-events-none"
                                                style={{
                                                    position: "absolute",
                                                    left: 0,
                                                    width: "calc(50% - 25px)", // до времени
                                                    top,
                                                    height: 1,
                                                    background: "#EF4444",
                                                    zIndex: 3,
                                                }}
                                            />

                                            {/* Правая часть линии */}
                                            <div
                                                className="mx-[0px] pointer-events-none"
                                                style={{
                                                    position: "absolute",
                                                    right: 0,
                                                    width: "calc(50% - 25px)", // от времени
                                                    top,
                                                    height: 1,
                                                    background: "#EF4444",
                                                    zIndex: 3,
                                                }}
                                            />
    </>
                                    )}

                                    {/* Стрелки и время только для сегодняшнего дня */}
                                    {isTodayCell && (
                                        <>
                        {/* Левая стрелка */}
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    left: 0,
                                                    top: isMobile ? top - 3.5 : top - 3.5,
                                                    width: 0,
                                                    height: 0,
                                                    borderTop: "4px solid transparent",
                                                    borderBottom: "4px solid transparent",
                                                    borderLeft: "10px solid #EF4444",
                                                    zIndex: 4,
                                                }}
                                            />
                                            {/* Правая стрелка */}
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    right: 0,
                                                    top: isMobile ? top - 3.5 : top - 3.5,
                                                    width: 0,
                                                    height: 0,
                                                    borderTop: "4px solid transparent",
                                                    borderBottom: "4px solid transparent",
                                                    borderRight: "10px solid #EF4444",
                                                    zIndex: 4,
                                                }}
                                            />
                                            {/* Время */}
                                            <div className={"flex items-center justify-center"}
                                                 style={{
                                                     position: "absolute",
                                                     width: "52px",
                                                     left: "50%",
                                                     top: isMobile ? top - 7 : top - 7.5,
                                                     transform: "translateX(-50%)",
                                                     background: "#ffffff99",
                                                     color: "#EF4444",
                                                     padding: "0 6px",
                                                     fontSize: "12px",
                                                     fontWeight: 600,
                                                     borderRadius: "6px",
                                                     border: "1px solid #EF4444",
                                                     pointerEvents: "none",
                                                     zIndex: 4,
                                                 }}
                                            >
                            <span className="opacity-80">
                                {timeStr}
                            </span>
                        </div>
                    </>
                                    )}
            </>
                            );
                        }
                        return null;
                    })()}

                    {isEditingMeeting && (
                        <div
                            className="absolute z-20 left-0 right-0"
                            style={{top: editingMeetingPosition}}
                        >
                            <div
                                className={clsx(
                                    "text-default-800 mx-[2px] flex items-center",
                                    "pl-[2px] pr-[2px] pt-[2px] pb-[1px] rounded bg-green-200 border border-green-300",
                                    weeks === 1 ? "h-[29px]" : "h-[22px]",
                                    whatWindow === "mobile" ? "text-[16px]" : "text-[12px]"
                                )}
                            >
                                <span className="text-default-500  whitespace-nowrap min-w-0 mr-[5px]">
                                    {/*{editingMeetingStartTime}*/}
                                    {editingMeetingStartTime.replace(/^0/, "")}
                                </span>

                                <input
                                    ref={meetingInputRef}
                                    type="text"
                                    spellCheck={false}
                                    value={editingMeetingTitle}
                                    onChange={(e) => setEditingMeetingTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (editingMeetingTitle.trim()) {
                                                handleCreateMeeting(editingMeetingTitle);
                                            } else {
                                                handleCancelMeetingEdit();
                                            }
                                        } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            handleCancelMeetingEdit();
                                        }
                                    }}
                                    onBlur={() => {
                                        // Завершаем или отменяем при потере фокуса
                                        if (editingMeetingTitle.trim()) {
                                            handleCreateMeeting(editingMeetingTitle);
                                        } else {
                                            handleCancelMeetingEdit();
                                        }
                                    }}
                                    className={clsx(
                                        "flex-1 bg-transparent outline-none placeholder-default-400 min-w-0",
                                        whatWindow === "mobile" ? "text-[16px]" : "text-[12px]"
                                    )}
                                    placeholder="Название встречи..."
                                />
                            </div>
                        </div>
                    )}

                </div>

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