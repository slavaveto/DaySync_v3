// components/ItemEditor.tsx
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useMainContext} from "@/app/context";
import {TitleHighlight} from "@/app/main/elems/TitleHighlight";
import clsx from "clsx";
import {highlightColors} from "@/app/main/utils/highlightColors";
import {AlarmClock, Calendar1, CircleDollarSign, Lightbulb, OctagonX} from "lucide-react";
import {ICON_SIZES} from "@/app/main/droppable/dndStyles";
import {DueDate} from "@/app/main/elems/DueDate";
import {CategoriesMeeting} from "@/app/main/elems/CategoriesMeeting";
import {MeetingTags} from "@/app/main/elems/MeetingTags";


import {Priority} from "@/app/main/elems/Priority";
import {Time} from "@internationalized/date";
import {Select, SelectItem, SelectSection, TimeInput} from "@heroui/react";
import {useVerticalResizableLayout} from "@/app/main/subtasks/useVerticalResizableLayout";
import {VerticalResizer} from "@/app/main/subtasks/VerticalResizer";
import type {ClientType, ItemType} from "@/app/types";
import {useDndContext} from "@/app/context_dnd";
import {Categories} from "@/app/main/elems/Categories";

interface ItemEditorProps {
    item: any;
    onClose?: () => void;
}

export function ItemEditorMeeting({item, onClose}: ItemEditorProps) {
    const {setItems, setHasLocalChanges, setIsUserActive, clients} = useMainContext();
    const {weeks, setWeeks, highlightedClientId, setHighlightedClientId} = useDndContext();

    const [title, setTitle] = useState(item.title || '');
    const [initialTitle, setInitialTitle] = useState(item.title || '');
    const [notes, setNotes] = useState(item.notes || '');
    const [initialNotes, setInitialNotes] = useState(item.notes || '');
    const [all_day_meetingChecked, setAll_day_meetingChecked] = React.useState(item?.all_day_meeting);
    const [alertChecked, setAlertChecked] = React.useState(item?.is_alerted);
    const [showSubtasksChecked, setShowSubtasksChecked] = React.useState(item?.show_subtasks_count);

    const titleRef = useRef<HTMLTextAreaElement>(null);
    const notesRef = useRef<HTMLDivElement>(null);

    // Сортировка клиентов: по алфавиту, группы в конце
    const sortedClients = useMemo(() => {
        return [...clients].sort((a, b) => {
            const aIsGroup = a.meeting_type === 'group';
            const bIsGroup = b.meeting_type === 'group';

            // Если один группа, а другой нет - группа в конец
            if (aIsGroup && !bIsGroup) return 1;
            if (!aIsGroup && bIsGroup) return -1;

            // Если оба группы или оба не группы - сортируем по алфавиту
            return a.name.localeCompare(b.name);
        });
    }, [clients]);

    // Группировка клиентов по meeting_type
    const groupedClients = useMemo(() => {
        const groups = {
            client: clients.filter(c => c.meeting_type === 'client').sort((a, b) => a.name.localeCompare(b.name)),
            supervision: clients.filter(c => c.meeting_type === 'supervision').sort((a, b) => a.name.localeCompare(b.name)),
            group: clients.filter(c => c.meeting_type === 'group').sort((a, b) => a.name.localeCompare(b.name)),
        };
        return groups;
    }, [clients]);

    const {
        notesPanelHeight,
        isResizing: isVerticalResizing,
        containerRef: notesContainerRef,
        handleMouseDown: handleVerticalMouseDown
    } = useVerticalResizableLayout({
        initialHeight: 200,
        minHeight: 150,
        maxHeight: 400,
        persistKey: `notesPanelHeight_${item.id}` // уникальный ключ для каждого элемента
    });

    // Обработка изменения текста
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value);
        autoResize();
    };

    // Функция для применения/снятия bold в notes
    const toggleNotesBold = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return;

        document.execCommand('bold', false);

        if (notesRef.current) {
            setNotes(notesRef.current.innerHTML);
        }
    };

    // Функция для автоматического создания ссылок в заметках
    const makeLinksClickable = (html: string) => {
        // Регулярное выражение для поиска URL (включая без http://)
        const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s<>"]*|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.(com|org|net|edu|gov|io|co|ru|de|fr|uk|ca|au|jp|br|mx|es|it|nl|se|no|dk|fi|pl|cz|hu|bg|ro|gr|pt|ie|at|ch|be|lu|is|ee|lv|lt|sk|si|hr|rs|ba|mk|al|me|md|ua|by|kz|uz|kg|tj|tm|az|am|ge)[^\s<>"]*)/gi;

        return html.replace(urlRegex, (url) => {
            // Проверяем, не находится ли URL уже внутри тега <a>
            const beforeUrl = html.substring(0, html.indexOf(url));
            const openTagCount = (beforeUrl.match(/<a/gi) || []).length;
            const closeTagCount = (beforeUrl.match(/<\/a>/gi) || []).length;

            // Если теги <a> не закрыты, значит URL уже внутри ссылки
            if (openTagCount > closeTagCount) {
                return url;
            }

            // Добавляем http:// если его нет
            const href = url.startsWith('http') ? url : `https://${url}`;

            return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: rgb(59 130 246); text-decoration: underline;">${url}</a>`;
        });
    };

    // Сохранение изменений
    const saveAllChanges = () => {
        const hasChanges =
            title !== initialTitle ||
            notes !== initialNotes ||
            all_day_meetingChecked !== item.all_day_meeting ||
            alertChecked !== item.is_alerted ||
            showSubtasksChecked !== item.show_subtasks_count

        if (hasChanges) {
            const now = new Date().toISOString();
            setItems((prev: any[]) =>
                prev.map((i: any) =>
                    i.id === item.id ? {
                        ...i,
                        title: title,
                        notes: notes,
                        all_day_meeting: all_day_meetingChecked,
                        is_alerted: alertChecked,
                        show_subtasks_count: showSubtasksChecked,

                        updated_at: now,
                        sync_highlight: true
                    } : i
                )
            );
            setHasLocalChanges(true);
            setInitialTitle(title);
            setInitialNotes(notes);
        }
    };

    // Завершение редактирования
    const finishEditing = () => {
        saveAllChanges();
        setIsUserActive(false);
    };

    // Функция для автоматического изменения высоты
    const autoResize = () => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = Math.max(24, titleRef.current.scrollHeight) + 'px';
        }
    };

    useEffect(() => {
        autoResize();
    }, [title]);

    // Синхронизация HTML notes с состоянием
    useEffect(() => {
        const el = notesRef.current;
        if (el) {
            if (el.innerHTML !== notes) {
                el.innerHTML = notes;
            }
        }
    }, [notes]);

    const [clientId, setClientId] = useState<number | null>(
        item?.client_id ?? null
    );

    const info = useMemo(() => {
        if (!clientId) return null;
        // формируем новый объект только с нужными полями (без id!)
        const fakeItem = {
            ...item,
            client_id: clientId,
            meeting_time_start: item?.meeting_time_start,
        };
        // Удаляем id если он вдруг undefined (или не нужен вообще)
        delete fakeItem.id;
        return getClientTimeInfo(fakeItem as ItemType, clients);
    }, [clientId, item?.meeting_time_start, clients]);

    function getClientTimeInfo(item: ItemType, clients: ClientType[]) {
        const client = clients.find(c => c.id === item?.client_id);
        if (!client || typeof client.timediff !== "number") return null;

        const timeZone = client.timezone;
        const city = timeZone ? timeZone.replace(/^.*\//, "") : "";
        const hourDiff = client.timediff;
        const sign = hourDiff > 0 ? "+" : "";
        const diffStr = `${sign}${hourDiff}`;

        const baseTime = item?.meeting_time_start || "00:00";
        const [hour, minute] = baseTime.split(":").map(Number);
        const shiftedHour = (hour + hourDiff + 24) % 24;
        const clientTimeStr = `${shiftedHour}:${minute.toString().padStart(2, "0")}`;

        return {
            timeZone,
            city,
            hourDiff,
            diffStr,
            clientTimeStr
        };
    }

    const [meetingCanceled, setMeetingCanceled] = React.useState(item?.meeting_canceled);
    const [meetingWillBePaid, setMeetingWillBePaid] = React.useState(item?.meeting_willbepaid);
    const [meetingPaid, setMeetingPaid] = React.useState(item?.meeting_paid);
    const [meetingNotPaid, setMeetingNotPaid] = React.useState(item?.meeting_notpaid);

    useEffect(() => {
        setTitle(item.title || '');
        setInitialTitle(item.title || '');
        setNotes(item.notes || '');
        setInitialNotes(item.notes || '');
        setAll_day_meetingChecked(item?.all_day_meeting);
        setAlertChecked(item?.is_alerted);
        setShowSubtasksChecked(item?.show_subtasks_count);
        setMeetingTimeStart(new Set([item.meeting_time_start || "09:00"]));
        setMeetingTimeEnd(new Set([item.meeting_time_end || "10:00"]));
        setClientId(item?.client_id ?? null);

        setMeetingCanceled(item?.meeting_canceled);
        setMeetingWillBePaid(item?.meeting_willbepaid);
        setMeetingPaid(item?.meeting_paid);
        setMeetingNotPaid(item?.meeting_notpaid);

        autoResize();
    }, [item.id, item.title, item.notes, item.all_day_meeting, item.is_alerted, item.client_id,
        item.show_subtasks_count, item.meeting_time_start, item.meeting_time_end]);

    useEffect(() => {
        if (item.is_done || item.is_deleted) {
            setHighlightedClientId(null);
            onClose?.();
        }
    }, [item.is_done, item.is_deleted, onClose]);

    useEffect(() => {
        // Только если подсветка активна И клиент изменился И новый клиент существует
        if (highlightedClientId !== null && clientId && highlightedClientId !== clientId) {
            setHighlightedClientId(clientId);
        }
    }, [clientId]);

    useEffect(() => {
        // Cleanup function - выполняется при размонтировании компонента
        return () => {
            setHighlightedClientId(null);
        };
    }, [setHighlightedClientId]);

    // Вычисляем подзадачи и их статус
    const nonEmptySubtasks = item.subtasks
        ? item.subtasks.filter((st: any) => st.title && st.title.trim() !== '')
        : [];
    const uncompletedSubtasks = nonEmptySubtasks.filter((st: any) => !st.is_done).length;
    const totalNonEmptySubtasks = nonEmptySubtasks.length;
    const allCompleted = totalNonEmptySubtasks > 0 && uncompletedSubtasks === 0;

    const times: string[] = [];
    for (let h = 8; h <= 21; h++) {
        for (const m of [0, 30]) {
            const hh = String(h).padStart(2, "0");
            const mm = String(m).padStart(2, "0");
            times.push(`${hh}:${mm}`);
        }
    }

    function getInitialMeetingTimeStart() {
        if (item?.meeting_time_start) {
            return new Set([item.meeting_time_start]);
        }
        return new Set(["09:00"]);
    }

    function getInitialMeetingTimeEnd() {
        if (item?.meeting_time_end) {
            return new Set([item.meeting_time_end]);
        }
        return new Set(["10:00"]);
    }

    const [meetingTimeStart, setMeetingTimeStart] = useState<Set<string>>(getInitialMeetingTimeStart);
    const [meetingTimeEnd, setMeetingTimeEnd] = useState<Set<string>>(getInitialMeetingTimeEnd);

    // Функции для работы со временем
    function parseTime(str: string) {
        const [h, m] = str.split(":").map(Number);
        return h * 60 + m;
    }

    // actual values:
    const start = Array.from(meetingTimeStart)[0] ?? "09:00";
    const end = Array.from(meetingTimeEnd)[0] ?? "10:00";

    const handleStartChange = (keys: unknown) => {
        const keySet = keys as Set<string>;
        const newStart = Array.from(keySet)[0];
        if (!newStart) return;

        const prevStartMins = parseTime(start);
        const prevEndMins = parseTime(end);
        const delta = prevEndMins - prevStartMins;

        const newStartMins = parseTime(newStart);
        let newEndMins = newStartMins + delta;

        // Границы диапазона
        const minEndMins = parseTime(times[0]) + 15;
        const maxEndMins = parseTime(times[times.length - 1]);

        if (newEndMins < minEndMins) newEndMins = minEndMins;
        if (newEndMins > maxEndMins) newEndMins = maxEndMins;

        const newEndTime = times.find(t => parseTime(t) >= newEndMins) || times[times.length - 1];

        setMeetingTimeStart(new Set([newStart]));
        setMeetingTimeEnd(new Set([newEndTime]));

        // Сохраняем с ОБОИМИ новыми значениями
        // setIsUserActive(true);
        const now = new Date().toISOString();
        setItems((prev: any[]) =>
            prev.map((i: any) =>
                i.id === item.id ? {
                    ...i,
                    meeting_time_start: newStart,      // новое начало
                    meeting_time_end: newEndTime,      // новое окончание (пересчитанное!)
                    updated_at: now,
                    sync_highlight: true
                } : i
            )
        );
        setHasLocalChanges(true);
        setTimeout(() => setIsUserActive(false), 300);
    };

// Варианты завершения — только позже старта
    const endOptions = useMemo(() => {
        const idx = times.findIndex(t => t === start);
        return times.slice(idx + 1);
    }, [start]);

// Если end стало некорректным — корректируем
    useEffect(() => {
        const endVal = Array.from(meetingTimeEnd)[0];
        if (!endOptions.includes(endVal)) {
            setMeetingTimeEnd(new Set([endOptions[0]]));
        }
        // eslint-disable-next-line
    }, [endOptions.join(",")]);

    return (
        <div
            key={item.id}
            className="flex flex-col h-full  pt-[8px] text-[14px]"
        >

            <div className="flex flex-col px-[6px] gap-2 flex-1">

                <div className="relative flex items-center">
                    <div className="absolute right-[4px]" style={{
                        top: '50%',
                        transform: 'translateY(calc(-50% - 0px))'
                    }}>
                        <TitleHighlight item={item}/>
                    </div>

                    {/*<div className="ml-[0.5px]  mr-[0px] w-[34px]">*/}
                    {/*    <CheckBox item={item}/>*/}
                    {/*</div>*/}

                    <textarea
                        ref={titleRef}
                        spellCheck={false}
                        value={title}
                        onChange={handleTextChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                finishEditing();
                                titleRef.current?.blur();
                            }
                            if (e.key === 'Escape') {
                                setTitle(initialTitle);
                                setIsUserActive(false);
                            }
                        }}
                        onBlur={finishEditing}
                        onFocus={() => {
                            setIsUserActive(true);
                        }}
                        className={clsx(
                            "pr-[20px]",
                            "w-full p-1 py-[5px] px-[6px] pr-[25px] border border-default-300 rounded outline-none",
                            "focus:border-primary-400 transition-colors resize-none overflow-hidden",
                            highlightColors(item)
                        )}
                        rows={1}
                        style={{
                            lineHeight: '1.2',
                        }}
                    />
                </div>

                <div className="flex items-center pl-[2px]">

                    <Priority item={item}/>

                    <div className="flex flex-1 justify-center">
                        <CategoriesMeeting
                            item={item}
                            // onDeselectItem={() => setSelectedItem(null)}
                        />
                    </div>

                    {/*<TitleHighlight item={item}/>*/}

                </div>

                <div className="flex justify-center">
                    <MeetingTags item={item}/>
                </div>

                <div className="flex items-center mb-[10px]">
                    <button
                        type="button"
                        onClick={() => {
                            setIsUserActive(true);
                            const newValue = !all_day_meetingChecked;
                            setAll_day_meetingChecked(newValue);

                            const now = new Date().toISOString();
                            setItems((prev: any[]) => prev.map((i: any) =>
                                i.id === item.id ? {
                                    ...i,
                                    sync_highlight: true,
                                    all_day_meeting: newValue,
                                    updated_at: now
                                } : i
                            ));

                            setTimeout(() => {
                                setIsUserActive(false);
                                setHasLocalChanges(true);
                            }, 300);
                        }}
                        className="mr-[0px] w-[34px]"
                    >
                        <Calendar1
                            size={ICON_SIZES.dt + 3}
                            strokeWidth={
                                all_day_meetingChecked ? 2.5 : 2
                            }
                            className={clsx(
                                "hover:text-primary-400 transition-colors mt-[1px] ml-[0px]",
                                all_day_meetingChecked ? "text-primary-500" : "text-primary-200",
                            )}
                        />
                    </button>

                    <div className="flex flex-col w-full">

                        <div
                            className={clsx(
                                "w-full h-[27px] mb-1 border border-default-300 rounded outline-none",
                                "flex items-center justify-center"
                            )}
                        >
                            <DueDate item={item} all_day_meetingChecked={all_day_meetingChecked}/>
                        </div>

                        <div className="relative flex gap-2">

                            <Select
                                size={"sm"}
                                label="Start"
                                placeholder=""
                                isDisabled={all_day_meetingChecked}
                                selectedKeys={meetingTimeStart}
                                onOpenChange={(isOpen) => {
                                    if (isOpen) {
                                        setIsUserActive(true); // активируем при открытии
                                    }
                                    if (!isOpen) {
                                        setIsUserActive(false); // активируем при открытии
                                    }
                                }}
                                onSelectionChange={keys => {
                                    handleStartChange(keys);
                                }}
                                selectionMode="single" // важно!
                            >
                                {times.map((t) => (
                                    <SelectItem key={t}>{t.replace(/^0/, "")}</SelectItem>
                                ))}
                            </Select>
                            <Select
                                size={"sm"}
                                label="End"
                                placeholder=""
                                isDisabled={all_day_meetingChecked}
                                selectedKeys={meetingTimeEnd}
                                onOpenChange={(isOpen) => {
                                    if (isOpen) {
                                        setIsUserActive(true); // активируем при открытии
                                    }
                                    if (!isOpen) {
                                        setIsUserActive(false); // активируем при открытии
                                    }
                                }}
                                onSelectionChange={(keys) => {
                                    const newEnd = Array.from(keys as Set<string>)[0];
                                    if (!newEnd) return;

                                    setMeetingTimeEnd(keys as Set<string>);

                                    // Сохраняем сразу с новым значением
                                    // setIsUserActive(true);
                                    const now = new Date().toISOString();
                                    setItems((prev: any[]) =>
                                        prev.map((i: any) =>
                                            i.id === item.id ? {
                                                ...i,
                                                meeting_time_end: newEnd,  // используй новое значение
                                                updated_at: now,
                                                sync_highlight: true
                                            } : i
                                        )
                                    );
                                    setHasLocalChanges(true);
                                    setTimeout(() => setIsUserActive(false), 300);
                                }}
                                selectionMode="single" // важно!
                            >
                                {endOptions.map((t) => (
                                    <SelectItem
                                        key={t}>{t.replace(/^0/, "")}</SelectItem>
                                ))}
                            </Select>
                        </div>

                    </div>

                </div>

                {["client", "group", "supervision"].includes(item.meeting_category) && (
                    <div className="flex items-center mb-[0px]">
                        <button
                            type="button"
                            onClick={() => {
                                setIsUserActive(true);
                                const newValue = !meetingCanceled;
                                setMeetingCanceled(newValue);

                                const now = new Date().toISOString();
                                setItems((prev: any[]) => prev.map((i: any) =>
                                    i.id === item.id ? {
                                        ...i,
                                        sync_highlight: true,
                                        meeting_canceled: newValue,
                                        updated_at: now
                                    } : i
                                ));

                                setTimeout(() => {
                                    setIsUserActive(false);
                                    setHasLocalChanges(true);
                                }, 300);
                            }}
                            className="mr-[0px] w-[34px]"
                        >
                            <OctagonX
                                size={ICON_SIZES.dt + 3}
                                strokeWidth={
                                    meetingCanceled ? 2.5 : 2
                                }
                                className={clsx(
                                    "hover:text-danger-400 transition-colors mt-[1px] ml-[0px]",
                                    meetingCanceled ? "text-danger-500" : "text-danger-200",
                                )}
                            />
                        </button>

                        <Select
                            className="mt-0"
                            size="sm"
                            label="Клиент"
                            color={item.meeting_canceled && "danger"}
                            placeholder="Выберите клиента"
                            selectedKeys={clientId ? new Set([String(clientId)]) : new Set()}
                            onOpenChange={(isOpen) => {
                                if (isOpen) {
                                    setIsUserActive(true);
                                }
                            }}
                            onSelectionChange={keys => {
                                const id = Number(Array.from(keys)[0]);
                                setClientId(id);
                                const now = new Date().toISOString();
                                setItems((prev: any[]) =>
                                    prev.map((i: any) =>
                                        i.id === item.id ? {
                                            ...i,
                                            client_id: id,
                                            updated_at: now,
                                            sync_highlight: true
                                        } : i
                                    )
                                );
                                setHasLocalChanges(true);
                                setTimeout(() => setIsUserActive(false), 300);
                            }}
                        >
                            {groupedClients.client.length > 0 ? (
                                <SelectSection showDivider title="Клиенты">
                                    {groupedClients.client.map(client => (
                                        <SelectItem key={String(client.id)}>{client.name}</SelectItem>
                                    ))}
                                </SelectSection>
                            ) : null}

                            {groupedClients.supervision.length > 0 ? (
                                <SelectSection showDivider title="Супервизия">
                                    {groupedClients.supervision.map(client => (
                                        <SelectItem key={String(client.id)}>{client.name}</SelectItem>
                                    ))}
                                </SelectSection>
                            ) : null}

                            {groupedClients.group.length > 0 ? (
                                <SelectSection title="Группы">
                                    {groupedClients.group.map(client => (
                                        <SelectItem key={String(client.id)}>{client.name}</SelectItem>
                                    ))}
                                </SelectSection>
                            ) : null}
                        </Select>

                    </div>

                )}

                {item.meeting_canceled && (
                    <div className="pl-[40px]">
                        <button
                            type="button"
                            onClick={() => {
                                setIsUserActive(true);
                                const newValue = !meetingWillBePaid;
                                setMeetingWillBePaid(newValue);

                                const now = new Date().toISOString();
                                setItems((prev: any[]) => prev.map((i: any) =>
                                    i.id === item.id ? {
                                        ...i,
                                        sync_highlight: true,
                                        meeting_willbepaid: newValue,
                                        updated_at: now
                                    } : i
                                ));

                                setTimeout(() => {
                                    setIsUserActive(false);
                                    setHasLocalChanges(true);
                                }, 300);
                            }}
                            className={clsx(
                                "hover:text-success-400 transition-colors mt-[1px] ml-[0px] gap-1 flex items-center flex-row",
                                meetingWillBePaid ? "text-success-500 font-medium" : "text-success-200",
                            )}
                        >
                            <CircleDollarSign
                                size={ICON_SIZES.dt + 3}
                                strokeWidth={
                                    meetingWillBePaid ? 2.5 : 2
                                }
                            />
                            будет оплачена!
                        </button>

                    </div>
                )}

                {clientId && info?.city && !item.meeting_canceled && (
                    <div className="flex items-center gap-2">

                        <div className="pl-[40px] ">
                            {info?.city}{" "}({info?.diffStr}){" "}{info?.clientTimeStr}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setIsUserActive(true);
                                // Если уже подсвечен этот клиент - убираем подсветку
                                if (highlightedClientId === clientId) {
                                    setHighlightedClientId(null);
                                } else {
                                    // Иначе подсвечиваем текущего клиента
                                    setHighlightedClientId(clientId);
                                }
                                setTimeout(() => setIsUserActive(false), 300);
                            }}
                            className="mr-[0px] w-[34px]"
                        >
                            <Lightbulb
                                size={ICON_SIZES.dt + 3}
                                strokeWidth={highlightedClientId === clientId ? 2.5 : 2}
                                className={clsx(
                                    "hover:text-orange-400 transition-colors mt-[-1px]",
                                    highlightedClientId === clientId ? "text-orange-500" : "text-orange-200",
                                )}
                            />
                        </button>
                    </div>

                )}

                <div className="flex-1">

                </div>

                <div className="flex items-center mb-[5px]">
                    <button
                        type="button"
                        onClick={() => {
                            setIsUserActive(true);
                            const newValue = !alertChecked;
                            setAlertChecked(newValue);

                            const now = new Date().toISOString();
                            setItems((prev: any[]) => prev.map((i: any) =>
                                i.id === item.id ? {
                                    ...i,
                                    sync_highlight: true,
                                    is_alerted: newValue,
                                    updated_at: now
                                } : i
                            ));

                            setTimeout(() => {
                                setIsUserActive(false);
                                setHasLocalChanges(true);
                            }, 300);
                        }}
                        className="mr-[0px] w-[34px]"
                    >
                        <AlarmClock
                            size={ICON_SIZES.dt + 3}
                            strokeWidth={
                                alertChecked ? 2.5 : 2
                            }
                            className={clsx(
                                "hover:text-orange-400 transition-colors mt-[-1px]",
                                alertChecked ? "text-orange-500" : "text-orange-200",
                            )}
                        />
                    </button>

                    <div
                        className={clsx(
                            "w-full h-[27px] pl-[6px] border border-default-300 rounded outline-none",
                            "flex items-center"
                        )}
                    >
                        <TimeInput
                            className="ml-[0px]"
                            variant="flat"
                            size="sm"
                            hourCycle={24}
                            defaultValue={new Time(9)}
                            isDisabled={!alertChecked}
                            classNames={{
                                inputWrapper: clsx("!h-[24px] !min-h-[24px] p-0 m-0"),
                                input: clsx(" text-[14px]")
                            }}
                        />
                    </div>
                </div>

                {/*{["client", "group", "supervision"].includes(item.meeting_category) && (*/}
                {/*    <div className="relative flex justify-center gap-4 mb-[5px]">*/}
                {/*        <button*/}
                {/*            type="button"*/}
                {/*            onClick={() => {*/}
                {/*                setIsUserActive(true);*/}
                {/*                const newValue = !meetingPaid;*/}
                {/*                setMeetingPaid(newValue);*/}

                {/*                // Если включаем Paid, отключаем Not Paid*/}
                {/*                if (newValue) {*/}
                {/*                    setMeetingNotPaid(false);*/}
                {/*                }*/}

                {/*                const now = new Date().toISOString();*/}
                {/*                setItems((prev: any[]) => prev.map((i: any) =>*/}
                {/*                    i.id === item.id ? {*/}
                {/*                        ...i,*/}
                {/*                        sync_highlight: true,*/}
                {/*                        meeting_paid: newValue,*/}
                {/*                        meeting_notpaid: newValue ? false : i.meeting_notpaid, // отключаем notpaid если включаем paid*/}
                {/*                        updated_at: now*/}
                {/*                    } : i*/}
                {/*                ));*/}

                {/*                setTimeout(() => {*/}
                {/*                    setIsUserActive(false);*/}
                {/*                    setHasLocalChanges(true);*/}
                {/*                }, 300);*/}
                {/*            }}*/}
                {/*            className={clsx(*/}
                {/*                "hover:text-success-400 transition-colors mt-[1px] ml-[0px] gap-1 flex items-center flex-row",*/}
                {/*                meetingPaid ? "text-success-500 font-medium" : "text-success-200",*/}
                {/*            )}*/}
                {/*        >*/}
                {/*            <CircleDollarSign*/}
                {/*                size={ICON_SIZES.dt + 3}*/}
                {/*                strokeWidth={*/}
                {/*                    meetingPaid ? 2.5 : 2*/}
                {/*                }*/}
                {/*            />*/}
                {/*            Paid!*/}
                {/*        </button>*/}

                {/*        <button*/}
                {/*            type="button"*/}
                {/*            onClick={() => {*/}
                {/*                setIsUserActive(true);*/}
                {/*                const newValue = !meetingNotPaid;*/}
                {/*                setMeetingNotPaid(newValue);*/}

                {/*                // Если включаем Not Paid, отключаем Paid*/}
                {/*                if (newValue) {*/}
                {/*                    setMeetingPaid(false);*/}
                {/*                }*/}

                {/*                const now = new Date().toISOString();*/}
                {/*                setItems((prev: any[]) => prev.map((i: any) =>*/}
                {/*                    i.id === item.id ? {*/}
                {/*                        ...i,*/}
                {/*                        sync_highlight: true,*/}
                {/*                        meeting_notpaid: newValue,*/}
                {/*                        meeting_paid: newValue ? false : i.meeting_paid, // отключаем paid если включаем notpaid*/}
                {/*                        updated_at: now*/}
                {/*                    } : i*/}
                {/*                ));*/}

                {/*                setTimeout(() => {*/}
                {/*                    setIsUserActive(false);*/}
                {/*                    setHasLocalChanges(true);*/}
                {/*                }, 300);*/}
                {/*            }}*/}
                {/*            className={clsx(*/}
                {/*                "hover:text-danger-400 transition-colors mt-[1px] ml-[0px] gap-1 flex items-center flex-row",*/}
                {/*                meetingNotPaid ? "text-danger-500 font-medium" : "text-danger-200",*/}
                {/*            )}*/}
                {/*        >*/}
                {/*            <CircleDollarSign*/}
                {/*                size={ICON_SIZES.dt + 3}*/}
                {/*                strokeWidth={*/}
                {/*                    meetingNotPaid ? 2.5 : 2*/}
                {/*                }*/}
                {/*            />*/}
                {/*            Not Paid!*/}
                {/*        </button>*/}
                {/*    </div>*/}
                {/*)}*/}

            </div>

            {/*<div className="flex-1 overflow-y-auto mt-[10px]">*/}
            {/*    <SubTasks item={item}/>*/}
            {/*</div>*/}

            {/* Resizer */}
            <VerticalResizer
                isResizing={isVerticalResizing}
                onMouseDown={handleVerticalMouseDown}
            />

            {/* Нижняя панель заметок с фиксированной высотой */}
            <div
                ref={notesContainerRef}
                style={{height: `${notesPanelHeight}px`}}
                className="flex flex-col"
            >
                <div
                    ref={notesRef}
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    tabIndex={0}

                    onPaste={(e) => {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, text);
                    }}

                    onClick={(e) => {
                        // Проверяем если клик был на ссылке
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'A') {
                            e.preventDefault();
                            const href = target.getAttribute('href');
                            if (href) {
                                try {
                                    // Открываем в системном браузере через Electron
                                    if (window.require) {
                                        window.require('electron').shell.openExternal(href);
                                    } else {
                                        // Fallback для обычного браузера
                                        window.open(href, '_blank', 'noopener,noreferrer');
                                    }
                                } catch (error) {
                                    // Если Electron API недоступно, открываем обычным способом
                                    window.open(href, '_blank', 'noopener,noreferrer');
                                }
                            }
                        }
                    }}

                    onInput={(e) => {
                        const el = e.currentTarget as HTMLDivElement;
                        const html = el.innerHTML;

                        // Если остались только <br> или пустые теги, очищаем полностью
                        const textContent = el.textContent || '';
                        if (textContent.trim() === '') {
                            el.innerHTML = '';
                            setNotes('');
                        } else {
                            // Применяем автоматическое создание ссылок
                            const htmlWithLinks = makeLinksClickable(html);
                            if (htmlWithLinks !== html) {
                                // Сохраняем позицию курсора
                                const selection = window.getSelection();
                                const range = selection?.getRangeAt(0);
                                const startOffset = range?.startOffset || 0;

                                el.innerHTML = htmlWithLinks;

                                // Восстанавливаем позицию курсора
                                if (selection && range) {
                                    try {
                                        const walker = document.createTreeWalker(
                                            el,
                                            NodeFilter.SHOW_TEXT,
                                            null
                                        );
                                        let currentOffset = 0;
                                        let targetNode = null;

                                        while (walker.nextNode()) {
                                            const textNode = walker.currentNode;
                                            const nodeLength = textNode.textContent?.length || 0;
                                            if (currentOffset + nodeLength >= startOffset) {
                                                targetNode = textNode;
                                                break;
                                            }
                                            currentOffset += nodeLength;
                                        }

                                        if (targetNode) {
                                            const newRange = document.createRange();
                                            newRange.setStart(targetNode, Math.max(0, startOffset - currentOffset));
                                            newRange.collapse(true);
                                            selection.removeAllRanges();
                                            selection.addRange(newRange);
                                        }
                                    } catch (e) {
                                        // Игнорируем ошибки позиционирования курсора
                                    }
                                }
                            }
                            setNotes(htmlWithLinks);
                        }
                    }}

                    onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                            e.preventDefault();
                            toggleNotesBold();
                            return;
                        }

                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            finishEditing();
                            notesRef.current?.blur();
                        }
                        if (e.key === 'Escape') {
                            setNotes(initialNotes);
                            setIsUserActive(false);
                        }

                        // Обработка Delete/Backspace - очищаем если пусто
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                            setTimeout(() => {
                                if (notesRef.current) {
                                    const textContent = notesRef.current.textContent || '';
                                    if (textContent.trim() === '') {
                                        notesRef.current.innerHTML = '';
                                        setNotes('');
                                    }
                                }
                            }, 0);
                        }
                    }}

                    onBlur={() => {
                        finishEditing();
                    }}

                    onFocus={() => {
                        setIsUserActive(true);
                    }}
                    className={clsx(
                        "notes-container w-full p-[6px] h-full rounded outline-none",
                        "focus:bg-primary-50 transition-colors resize-none overflow-y-auto",
                    )}
                    style={{
                        lineHeight: '1.2',
                    }}
                    data-placeholder="Добавить заметки..."
                />

                <style jsx>{`
                    [contenteditable]:empty:before {
                        content: attr(data-placeholder);
                        color: rgb(107 114 128);
                        opacity: 0.6;
                        pointer-events: none;
                    }

                    [contenteditable] a {
                        cursor: pointer !important;
                        pointer-events: auto !important;
                    }

                    [contenteditable] a:hover {
                        text-decoration: underline !important;
                        opacity: 0.8;
                        cursor: pointer !important;
                    }

                    :global(.notes-container a) {
                        cursor: pointer !important;
                    }
                `}</style>

            </div>
        </div>
    );
}