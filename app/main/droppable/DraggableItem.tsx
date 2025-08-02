import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useDraggable} from '@dnd-kit/core';
import {hasVisibleContent} from "@/app/main/utils/hasVisibleContent";
import {
    AlarmClock, Link,
    Calendar, ExternalLink,
    Check,
    CheckSquare,
    CreditCard,
    DollarSign,
    NotebookPen,
    OctagonX,
    PhoneCall,
    Repeat2,
    ShoppingCart,
    X
} from "lucide-react";
import {Popover, PopoverTrigger, PopoverContent} from "@heroui/react";

import {ICON_SIZES} from "@/app/main/droppable/dndStyles";
import {useMainContext} from "@/app/context";
import {useDndContext} from "@/app/context_dnd";
import {highlightColors} from "@/app/main/utils/highlightColors";
import clsx from "clsx";
import {CATEGORY_COLOR} from "@/app/types";
import {parseISO} from "date-fns";
import {RiCake2Line} from "react-icons/ri";
import {TaskIcons} from "@/app/main/elems/TaskIcons";
import {MeetingIcons} from "@/app/main/elems/MeetingIcons";

interface DraggableItemProps {
    dayItem: any;
    isDragOverlay?: boolean;
    onItemSelect?: (item: any) => void;
    isSelected?: boolean;
    isNarrow?: boolean;
    onDaySelect?: (dayKey: string | null) => void;
    isDragForbidden?: boolean;
    whatWindow?: string;
}

export const DraggableItem = React.memo(({
                                             dayItem, isDragOverlay = false, onDaySelect, isDragForbidden,
                                             onItemSelect, isSelected = false, isNarrow = false, whatWindow
                                         }: DraggableItemProps) => {

    const {attributes, listeners, setNodeRef, isDragging} = useDraggable({
        id: String(dayItem.id),
        disabled: isDragOverlay,
    });

    const {
        items, clients, tabs, subtabs, syncHighlight, setIsUserActive, editingTitleId,
        setItems, setHasLocalChanges
    } = useMainContext();
    const {
        draggedItemWasNarrow, setDraggedItemWasNarrow, weeks, showTimeLines,
        highlightedClientId, setHighlightedClientId
    } = useDndContext();

    const displayTitle = useMemo(() => {
        if (dayItem.type === "meeting" && dayItem.client_id && clients) {
            const client = clients.find(c => c.id === dayItem.client_id);
            return client?.name || dayItem.title;
        }
        return dayItem.title;
    }, [dayItem, clients]);

    const currentShowTimeLines = showTimeLines[weeks] || false;

    // Отслеживаем начало драга
    useEffect(() => {
        if (isDragging && !isDragOverlay) {
            setDraggedItemWasNarrow(isNarrow); // сохраняем состояние при начале драга
        }
    }, [isDragging, isDragOverlay, isNarrow, setDraggedItemWasNarrow]);

    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0});
    const contextMenuRef = useRef<HTMLDivElement>(null);

    const style = {
        opacity: isDragging && !isDragOverlay ? 0.5 : 1
    };

    function getMeetingEndTimestamp(item: any) {
        // пример: "2024-06-28" + "15:30"
        if (!item.due_date || !item.meeting_time_end) return parseISO(item.due_date).getTime();
        // Склеиваем дату и время, парсим в ISO-строку и получаем timestamp
        const dt = `${item.due_date}T${item.meeting_time_end}:00`;
        return new Date(dt).getTime();
    }

    function getMeetingStartTimestamp(item: any) {
        if (!item.due_date || !item.meeting_time_start) return parseISO(item.due_date).getTime();
        const dt = `${item.due_date}T${item.meeting_time_start}:00`;
        return new Date(dt).getTime();
    }

    // const isPastMeeting =
    //     dayItem.type === "meeting" &&
    //     getMeetingEndTimestamp(dayItem) < Date.now();

    // const isPastMeeting =
    //     dayItem.type === "meeting" &&
    //     !dayItem.all_day_meeting &&
    //     dayItem.meeting_time_start &&
    //     (new Date(`${dayItem.due_date}T${dayItem.meeting_time_start}:00`).getTime() + 15 * 60 * 1000) < Date.now();

    const isPastMeeting =
        dayItem.type === "meeting" &&
        (
            (!dayItem.all_day_meeting &&
                dayItem.meeting_time_start &&
                (new Date(`${dayItem.due_date}T${dayItem.meeting_time_start}:00`).getTime() + 15 * 60 * 1000) < Date.now()) ||
            (dayItem.all_day_meeting &&
                new Date(dayItem.due_date).getTime() < new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000)
        );

    const color = CATEGORY_COLOR[dayItem.meeting_category as string] || "green";

    const clientId = dayItem.client_id
    const client = clients.find(c => c.id === clientId);
    const hourDiff = client?.timediff
    const baseTime = dayItem.meeting_time_start || "00:00";
    const [hour, minute] = baseTime.split(":").map(Number);
    const shiftedHour = (hour + (hourDiff) + 24) % 24;

    const clientTimeStr = typeof hourDiff !== "number"
        ? "?"
        : `${shiftedHour}:${minute.toString().padStart(2, "0")}`;

    const grayStyle = "text-default-400 dark:text-default-400 "
    const prymaryStyle = "text-primary-400 dark:text-primary-400/80 "
    const warningStyle = "!text-orange-400 dark:!text-orange-600/80 "
    const dangerStyle = "!text-danger-400/80 dark:!text-danger-400/80 "

    const borderDangerStyle = "!border-danger-400 dark:!border-danger-500 "
    const overlayBorderColor = "blue-500 "

    // Базовые классы остаются те же...
    const isSyncHighLighted = syncHighlight.includes(dayItem.id)
        ? "!border-dashed !border-blue-500 "
        : " ";

    const tasksClasses = dayItem.type === "task"
        ? "bg-default-200/80 border-default-300/50 " +
        "dark:bg-default-200/80 dark:border-default-300/50 "
        : ""
    const isHoverStyleTask = dayItem.type === "task"
        ? "hover:!bg-primary-100/70 hover:border-primary-200/50 " +
        "dark:hover:!bg-primary-100/80 dark:hover:border-primary-200/50 "
        : " ";

    const isSelectedStyleTask = isSelected && dayItem.type === "task"
        ? "!bg-primary-100/100        !border-primary-200/100 " +
        "dark:!bg-primary-100/80   dark:!border-primary-200 "
        : " ";

    const meetingCanceled = dayItem.meeting_canceled
        ? `!text-red-500 dark:!text-red-500 `
        : '';

    const meetingColorClasses = dayItem.type === "meeting"
        ? [
            `bg-${color}-${color === 'yellow' || color === 'green' ? '100/90' : '100/80 '} `,
            `border-${color}-${color === 'green' ? '200/90' : '200/50 '} `,

            `dark:bg-${color}-900/40 dark:border-${color}-900/50 `,

            `hover:bg-${color}-100/100 hover:border-${color}-200/100 `,

            `dark:hover:bg-${color}-800 dark:hover:border-${color}-500/50 `
        ].join(" ")
        : "";

    const isHoverStyleMeeting = dayItem.type === "meeting"
        ? "hover:border-primary-200 dark:hover:border-primary-300 "
        : " ";

    const isSelectedStyleMeeting = isSelected && dayItem.type === "meeting"
        // ? "!border-primary-300 dark:!border-primary-400 "
        ? `!bg-${color}-200/60 !border-${color}-400/100 ` +

        `dark:!bg-${color}-800 dark:!border-${color}-500/70 `
        : " ";

    const pastMeetingColorClasses = dayItem.type === "meeting"
        ? [
            `bg-${color}-${color === 'yellow' ? '75/100' : '75/80 '} border-${color}-100/80 `,

            `dark:bg-${color}-900/30 dark:border-${color}-900/40 `,

            `hover:bg-${color}-100 hover:border-${color}-200 `,
            `dark:hover:bg-${color}-900  dark:hover:border-${color}-700 `,
        ].join(" ")
        : "";

    const isSelectedStylePastMeeting = isSelected && dayItem.type === "meeting"
        // ? "!border-primary-300 dark:!border-primary-400 "
        ? `!bg-${color}-100 border-${color}-200 ` +
        `dark:!bg-${color}-900 dark:!border-${color}-700 `
        : " ";

    const pastMeetingText = (isPastMeeting && isSelected) || (isPastMeeting && isDragOverlay)
        ? "!text-default-400 dark:!text-default-500/80 "
        : isPastMeeting
            ? "!text-default-400 dark:!text-default-400/50 "
            : " ";

    const isOverdueStyle = dayItem.__movedToToday
        ? "border-warning-400 border-dashed dark:border-warning-300 "
        : " ";

    const baseClasses =
        "text-default-600 dark:text-default-500/80 border " +
        "flex items-center h-[20px] pr-[2px] pt-[2px] pb-[1px] " +
        "rounded " +
        "select-none list-none " +

        tasksClasses +
        isOverdueStyle +

        // highlightColors(dayItem) +
        isSyncHighLighted

    const overlayClasses = "!border-dashed !border-blue-500 ";

    const [notesFilled, setNotesFilled] = useState(
        hasVisibleContent(dayItem.notes)
    );
    useEffect(() => {
        setNotesFilled(hasVisibleContent(dayItem.notes));
    }, [dayItem.notes]);

    const typeClasses = isDragOverlay ? overlayClasses : "";


    // Обработчик правого клика
    const handleContextMenu = (e: React.MouseEvent) => {
        setIsUserActive(true)
        e.preventDefault();
        e.stopPropagation();

        onItemSelect?.(dayItem);
        // onDaySelect?.(null);

        setContextMenuPosition({x: e.clientX, y: e.clientY});
        setShowContextMenu(true);
    };

    // Закрытие контекстного меню при клике вне
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setShowContextMenu(false);
                // setIsUserActive(false)
            }
        };
        if (showContextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showContextMenu]);

    // Пометить как выполненное
    const handleDone = () => {
        setIsUserActive(true);
        const now = new Date().toISOString();
        setItems(prev =>
            prev.map(i =>
                i.id === dayItem.id
                    ? {...i, is_done: true, updated_at: now, sync_highlight: true}
                    : i
            )
        );
        setHasLocalChanges(true);
        setShowContextMenu(false);
        setTimeout(() => setIsUserActive(false), 300);
    };

    // Пометить как elfktyyst
    const handleDelete = () => {
        setIsUserActive(true);
        const now = new Date().toISOString();
        setItems(prev =>
            prev.map(i =>
                i.id === dayItem.id
                    ? {...i, is_deleted: true, updated_at: now, sync_highlight: true}
                    : i
            )
        );
        setHasLocalChanges(true);
        setShowContextMenu(false);
        setTimeout(() => setIsUserActive(false), 300);
    };

    const handleConvertToMeeting = () => {
        setIsUserActive(true);
        const now = new Date().toISOString();
        setItems(prev =>
            prev.map(i =>
                i.id === dayItem.id
                    ? {
                        ...i,
                        type: "meeting",
                        meeting_time_start: i.meeting_time_start || "09:00",
                        meeting_time_end: i.meeting_time_end || "10:00",
                        meeting_category: i.meeting_category || "misc",
                        updated_at: now,
                        sync_highlight: true
                    }
                    : i
            )
        );
        setHasLocalChanges(true);
        setShowContextMenu(false);
        setTimeout(() => setIsUserActive(false), 300);
    };

    const handleConvertToTask = () => {
        setIsUserActive(true);
        const now = new Date().toISOString();
        setItems(prev =>
            prev.map(i =>
                i.id === dayItem.id
                    ? {
                        ...i,
                        type: "task",
                        updated_at: now,
                        sync_highlight: true
                    }
                    : i
            )
        );
        setHasLocalChanges(true);
        setShowContextMenu(false);
        setTimeout(() => setIsUserActive(false), 300);
    };

    const hasAnyIcon = (
        (dayItem.is_repeated && dayItem.type === "task") ||
        dayItem.task_category ||
        dayItem.task_priority
        // falsy для null/undefined, truthy для любой строки
        // (!dayItem.is_repeated && dayItem.type === "task" && dayItem.__movedToToday)
    );

    const meetingHasAnyIcon = (
        dayItem.type === "meeting" &&
        (dayItem.meeting_tag ||
        dayItem.task_priority)
        // falsy для null/undefined, truthy для любой строки
        // (!dayItem.is_repeated && dayItem.type === "task" && dayItem.__movedToToday)
    );

    // Вычисляем подзадачи и их статус
    const nonEmptySubtasks = dayItem.subtasks
        ? dayItem.subtasks.filter((st: any) => st.title && st.title.trim() !== '')
        : [];
    const uncompletedSubtasks = nonEmptySubtasks.filter((st: any) => !st.is_done).length;
    const totalNonEmptySubtasks = nonEmptySubtasks.length;
    const allCompleted = totalNonEmptySubtasks > 0 && uncompletedSubtasks === 0;

    function parseMinutes(time?: string): number {
        if (!time) return 0;
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
    }

    // const PIXELS_PER_MIN =
    //     weeks === 1
    //         ? 39 / 60
    //         : weeks === 2
    //             ? 22 / 60
    //             : 20 / 60;

    const PIXELS_PER_MIN =
        weeks === 1
            ? 29 / 60
            : weeks === 2 || weeks === 3
                ? 20 / 60
                : 20 / 60;

    let itemHeight = undefined;

    const ADD_SHIFT = weeks === 1 ? 2.5 : 2

    if (dayItem.type === "meeting" && !dayItem.all_day_meeting && dayItem.meeting_time_start && dayItem.meeting_time_end) {
        const startMin = parseMinutes(dayItem.meeting_time_start);
        const endMin = parseMinutes(dayItem.meeting_time_end);
        const duration = Math.max(15, endMin - startMin); // минимум 15 минут чтобы не исчезало
        itemHeight = duration * PIXELS_PER_MIN;

        if (duration > 60) {
            itemHeight += ((duration - 60) / 30) * ADD_SHIFT;
        }
    }

    const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
    const itemRef = useRef<HTMLDivElement>(null);

    // Закрытие при клике вне:
    useEffect(() => {
        const handleClickOutside = () => setCustomPopoverOpen(false);
        if (customPopoverOpen) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [customPopoverOpen]);

    const popoverRef = useRef<HTMLDivElement>(null);

    const isTimeChanged = (dayItem.meeting_category === "client" || dayItem.meeting_category === "supervision") &&
        dayItem.client_id &&
        clients.find(c => c.id === dayItem.client_id)?.meeting_time !== dayItem.meeting_time_start;


    return (
        <>
            <div
                // ref={!isDragOverlay ? setNodeRef : undefined}
                ref={!isDragOverlay ? (node) => {
                    setNodeRef(node);
                    itemRef.current = node;
                } : itemRef}

                style={{
                    ...style,
                    height: dayItem.all_day_meeting
                        ? 20 // всегда 20px для all_day_meeting
                        : weeks === 1
                            ? itemHeight // никаких ограничений для week=1
                            : (dayItem.type === "meeting" && whatWindow !== "today" && whatWindow !== "mobile" &&
                                (!currentShowTimeLines || weeks === 5))
                                ? Math.min(itemHeight || 40, 40)
                                : itemHeight,
                }}

                onClick={(e) => {
                    setIsUserActive(false)
                    e.stopPropagation();
                    onItemSelect?.(dayItem);
                    onDaySelect?.(null);

                    if ((notesFilled || nonEmptySubtasks.length > 0) && itemRef.current && whatWindow) {
                        const rect = itemRef.current.getBoundingClientRect();

                        // Сначала показываем popover невидимым чтобы измерить размеры
                        setPopoverPosition({
                            x: -9999,
                            y: -9999
                        });
                        setCustomPopoverOpen(true);

                        setTimeout(() => {
                            if (popoverRef.current) {
                                const popoverHeight = popoverRef.current.offsetHeight;
                                const popoverWidth = popoverRef.current.offsetWidth;
                                const margin = 10;

                                // Вертикальное позиционирование
                                let y = rect.top - popoverHeight - margin;
                                if (y < 0) {
                                    y = rect.bottom + margin;
                                }

                                // Горизонтальное позиционирование
                                let x = rect.left; // по умолчанию по левому краю элемента

                                // Если не помещается справа - выравнивать по правому краю элемента
                                if (x + popoverWidth > window.innerWidth) {
                                    x = rect.right - popoverWidth;
                                }

                                setPopoverPosition({ x, y });
                            }
                        }, 0);
                    }

                }}

                onContextMenu={handleContextMenu}

                onDoubleClick={(e) => {
                    e.stopPropagation();
                }}
                {...(!isDragOverlay ? attributes : {})}
                {...(!isDragOverlay ? listeners : {})}
                className={clsx(
                    baseClasses,
                    whatWindow === "mobile" ? "text-[14px]" : "text-[12px]",
                    !isPastMeeting && meetingColorClasses,
                    isPastMeeting && pastMeetingColorClasses,
                    // pastMeetingColorClasses,
                    pastMeetingText,
                    typeClasses,
                    !isDragOverlay && 'cursor-pointer',
                    isHoverStyleTask,
                    isSelectedStyleTask,
                    !isPastMeeting && isSelectedStyleMeeting,
                    isPastMeeting && isSelectedStylePastMeeting,

                    highlightedClientId !== null && highlightedClientId === dayItem.client_id && dayItem.type === "meeting" && "!border-danger-500 ",
                    isDragForbidden && "!bg-red-500/20 !border-2 !border-red-500 "
                )}
            >


                  {dayItem.type === "task" && (
                      <TaskIcons dayItem={dayItem} hasAnyIcon={hasAnyIcon} />
                  )}



                {dayItem.type === "meeting" && !dayItem.all_day_meeting && weeks !== 0 && !isNarrow && (
                    <p
                        className={clsx("mr-[5px] w-[35px]  flex items-center justify-end opacity-80",
                            whatWindow === "mobile" ? "text-[13px] mt-[2px]" : "text-[11px]",
                            isTimeChanged && !isPastMeeting && "!text-orange-500 font-medium"
                            )}
                            >
                        {(dayItem.meeting_time_start || "").replace(/^0/, "")}
                    </p>
                )}

                {dayItem.type === "meeting" && !dayItem.all_day_meeting && weeks !== 0 && isNarrow && (
                    <p className="mr-[5px] ml-[2px] text-[10px] flex items-center justify-start opacity-80">
                        {(dayItem.meeting_time_start || "").replace(/^0/, "")}
                    </p>
                )}


                {dayItem.type === "meeting" && (
                    <div
                        className={clsx(
                            isPastMeeting && "opacity-50"
                        )}
                    >

                    <MeetingIcons dayItem={dayItem} meetingHasAnyIcon={meetingHasAnyIcon} is_narrow={isNarrow} />
                    </div>
                )}


                <p className={clsx(
                    "flex-1 whitespace-nowrap truncate dark:!opacity-100",
                    dayItem.is_checked && "line-through opacity-60",
                    !hasAnyIcon && dayItem.type === "task" && "pl-[4px]",
                    !meetingHasAnyIcon && dayItem.type === "meeting" && dayItem.all_day_meeting &&  "pl-[4px]",
                    whatWindow === "mobile" ? "text-[14px]" : "text-[12px]",
                    highlightColors(dayItem)
                )}>
                    {/*{dayItem.title.replace(/<[^>]+>/g, "")}*/}
                    {displayTitle}
                </p>




                {dayItem.type === "task" && (() => {
                    const shouldShowNotes = notesFilled && (totalNonEmptySubtasks === 0 || dayItem.show_subtasks_count === false);
                    const shouldShowAlarm = dayItem.is_alerted && !dayItem.is_checked;
                    return shouldShowAlarm || shouldShowNotes;
                })() && (
                    <div className={clsx(
                        "flex flex-shrink-0 items-center gap-[3px] mt-[-1px]",
                        "ml-[4px] mr-[1px]"
                    )}>
                        {dayItem.is_alerted && !dayItem.is_checked && (
                            <p className="">
                                <AlarmClock size={ICON_SIZES.dt - 5}
                                            className={clsx(
                                                warningStyle
                                            )}
                                />
                            </p>
                        )}
                        {notesFilled && totalNonEmptySubtasks === 0 && dayItem.type !== "meeting" && (
                            <p className="">
                                <NotebookPen size={ICON_SIZES.dt - 7}
                                             className={clsx(
                                                 grayStyle,
                                                 isPastMeeting && "dark:!text-default-500/50"
                                             )}/>
                            </p>
                        )}
                    </div>
                )}

                {dayItem.type === "meeting" && (dayItem.is_alerted || dayItem.meeting_paid
                    || dayItem.meeting_canceled || notesFilled || dayItem.meeting_notpaid) && (
                    <div className={clsx(
                        "flex flex-shrink-0 items-center gap-[3px] mt-[0px]",
                        "ml-[2px]"
                    )}>
                        {dayItem.meeting_paid && (
                            <p className="">
                                <DollarSign size={ICON_SIZES.dt - 4} strokeWidth={2}
                                            className={clsx(
                                                warningStyle + "opacity-50"
                                            )}
                                />
                            </p>
                        )}
                        {dayItem.meeting_notpaid && (
                            <p className="">
                                <DollarSign size={ICON_SIZES.dt - 4} strokeWidth={2}
                                            className={clsx(
                                                warningStyle + "opacity-50"
                                            )}
                                />
                            </p>
                        )}

                        {/*{dayItem.meeting_canceled && dayItem.meeting_willbepaid && (*/}
                        {/*    <p className="">*/}
                        {/*        <CircleDollarSign size={ICON_SIZES.dt - 2} strokeWidth={2}*/}
                        {/*                          className="text-orange-300/50 dark:text-orange-700/50"/>*/}
                        {/*    </p>*/}
                        {/*)}*/}

                        {dayItem.meeting_canceled && (
                            <p className="">
                                <OctagonX size={ICON_SIZES.dt - 2} strokeWidth={2.5}
                                          className={clsx(
                                              warningStyle + "opacity-50"
                                          )}
                                />
                            </p>
                        )}

                        {dayItem.is_alerted && (
                            <p className="mt-[-1px]">
                                <AlarmClock size={ICON_SIZES.dt - 5}
                                            className={clsx(
                                                warningStyle,
                                                isPastMeeting && "opacity-50"
                                            )}
                                />
                            </p>
                        )}
                        {notesFilled && (
                            <p className="">
                                <NotebookPen size={ICON_SIZES.dt - 7}
                                             className={clsx(
                                                 grayStyle,
                                                 isPastMeeting && grayStyle && "opacity-50"
                                             )}/>
                            </p>
                        )}
                    </div>
                )}

                {["client", "group", "supervision"].includes(dayItem.meeting_category) &&
                    !dayItem.meeting_canceled &&
                    !isNaN(shiftedHour) &&
                    !isNaN(minute) &&
                    !isPastMeeting &&
                    !isNarrow && ( // добавь эту строку
                        <p className={clsx("text-[12px] ml-[4px] opacity-70 mt-[-1px]")}>
                            (
                            <span className={"text-[10px]"}>{clientTimeStr}</span>
                            )
                        </p>
                    )}

                {totalNonEmptySubtasks > 0 && dayItem.show_subtasks_count && (
                    <div className={clsx(
                        "flex items-center text-white dark:!text-default-600/80 justify-center w-[14px] h-[14px] flex-shrink-0 text-[11px]",
                        "rounded-full  font-medium mt-[-1px] border",
                        allCompleted ? "bg-success-400 dark:!bg-success-200 border-success-500 dark:!border-success-200 "
                            : "bg-warning-500 dark:!bg-warning-200/80 border-warning-600/50 dark:!border-warning-200/80 ",
                    )}>
                        {allCompleted ? totalNonEmptySubtasks : uncompletedSubtasks}
                    </div>
                )}

            </div>

            {customPopoverOpen && (notesFilled || nonEmptySubtasks.length > 0) && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed bg-white border border-default-300 rounded-lg shadow-lg p-3 max-w-[300px] min-w-[200px] max-h-[250px] overflow-y-auto z-50"
                    style={{
                        left: `${popoverPosition.x}px`,
                        top: `${popoverPosition.y}px`,
                        // transform: 'translateX(-50%)',
                        visibility: popoverPosition.x === -9999 ? 'hidden' : 'visible' // прячем пока измеряем
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Subtasks сверху */}
                    {nonEmptySubtasks.length > 0 && (
                        <div className="mb-3">
                            <div className="font-semibold text-sm mb-2">Подзадачи:</div>
                            {nonEmptySubtasks.map((subtask: any, index: number) => (
                                <div key={index} className="flex items-center gap-2 mb-1">
                                    {subtask.is_done ? (
                                        <CheckSquare size={14} className="text-success-500 flex-shrink-0" />
                                    ) : (
                                        <div className="w-[14px] h-[14px] border border-default-400 rounded flex-shrink-0" />
                                    )}
                                    <span className={clsx(
                                        "text-sm",
                                        subtask.is_done && "line-through text-default-400"
                                    )}>
                                        {subtask.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Заметки снизу */}
                    {notesFilled && (
                        <div dangerouslySetInnerHTML={{ __html: dayItem.notes }} />
                    )}

                    <button
                        onClick={() => setCustomPopoverOpen(false)}
                        className="absolute top-[0px] right-1 text-gray-400 hover:text-gray-600"
                    >
                        ×
                    </button>
                </div>,
                document.body
            )}

            {/* Контекстное меню через Portal */}
            {showContextMenu && createPortal(
                <div
                    ref={contextMenuRef}
                    className="fixed bg-white border border-default-300 rounded-lg shadow-lg py-1 min-w-[120px]"
                    style={{
                        top: contextMenuPosition.y,
                        left: contextMenuPosition.x,
                        zIndex: 99999
                    }}
                >
                    {!dayItem.is_repeated && dayItem.type === "task" && (
                        <button
                            onClick={handleDone}
                            className="w-full px-3 py-2 text-left text-[14px] text-success-600 hover:bg-success-50 hover:text-success-600 flex items-center gap-2 transition-colors"
                        >
                            <Check size={14} className={clsx("")}/>
                            Done
                        </button>
                    )}

                    {(() => {
                        const client = clients.find(c => c.id === dayItem.client_id);
                        return client?.url ? (
                            <button
                                onClick={() => {
                                    window.open(client.url, '_blank');
                                    setShowContextMenu(false);
                                }}
                                className="w-full px-3 py-2 text-left text-[14px] underline text-primary-600 hover:bg-primary-50 hover:text-primary-600 flex items-center gap-2 transition-colors"
                            >
                                <Link size={14} className={clsx("")}/>
                                Открыть URL <ExternalLink size={14} className={clsx("ml-1")}/>
                            </button>
                        ) : null;
                    })()}

                    {dayItem.type === "task" && (
                        <button
                            onClick={handleConvertToMeeting}
                            className="w-full px-3 py-2 text-left text-[14px] text-primary-600 hover:bg-primary-50 hover:text-primary-600 flex items-center gap-2 transition-colors"
                        >
                            <Calendar size={14}/>
                            Convert to Meeting
                        </button>
                    )}
                    {dayItem.type === "meeting" && !["client", "group", "supervision"].includes(dayItem.meeting_category) && (
                        <button
                            onClick={handleConvertToTask}
                            className="w-full px-3 py-2 text-left text-[14px] text-primary-600 hover:bg-primary-50 hover:text-primary-600 flex items-center gap-2 transition-colors"
                        >
                            <CheckSquare size={14}/>
                            Convert to Task
                        </button>
                    )}

                    <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-left text-[14px] text-danger-600 hover:bg-danger-50 hover:text-danger-600 flex items-center gap-2 transition-colors"
                    >
                        <X size={14} className={clsx("")}/>
                        Delete
                    </button>
                </div>,
                document.body
            )}
        </>
    );
});