// components/MainHeader.tsx
import React, {useEffect, useMemo, useState} from "react";
import clsx from "clsx";
import {Button, Tab, Tabs} from "@heroui/react";
import {CloudDownload, CloudUpload} from "lucide-react";
import {Settings} from '@/app/main/Settings';
import {UploadButton} from "@/app/utils/sync/UploadButton";
import {DownloadButton} from "@/app/utils/sync/DownloadButton";
import {SyncProgressIndicator} from "@/app/utils/sync/SyncProgressIndicator";
import type {ItemType} from "@/app/types";
import {useMainContext} from "@/app/context";
import {useDndContext} from "@/app/context_dnd";
import {useConstants} from "@/app/constants";
import TasksMeetingsToggle from "@/app/main/elems/TasksMeetingsToggle";
import TimeListToggle from "@/app/main/elems/TimeListToggle";
import {useMiscTabContext} from "@/app/context_misc";

interface HeaderProps {
    headerHeight: number;
    rightPanelWidth: number;
    visibleMonths: string[];
    calendarRef: React.MutableRefObject<{ scrollToToday?: () => void }>;
    setAddClientModalOpen: (open: boolean) => void;
    isUploadingData: boolean;
    isDownloadingData: boolean;
    syncTimeoutProgress: number;
    isUserActive: boolean;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    setFirstLoadFadeIn: (value: boolean) => void;
}

export function Header({
                           headerHeight,
                           rightPanelWidth,
                           visibleMonths,
                           calendarRef,
                           setAddClientModalOpen,
                           isUploadingData,
                           isDownloadingData,
                           syncTimeoutProgress,
                           isUserActive,
                           isSettingsOpen,
                           setIsSettingsOpen,
                           setFirstLoadFadeIn
                       }: HeaderProps) {

    const {items} = useMainContext();
    const {activeMainTab, activeMiscTab, setActiveMainTab,
        setActiveMiscTab, selectedMonth, setSelectedMonth} = useMiscTabContext();

    const {
        draggedItemWasNarrow,
        weeks,
        showTimeLines,
        setShowTimeLines,
        monthViewMode,
        setMonthViewMode
    } = useDndContext();

    const C = useConstants(); // короткое имя

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        // Форс-обновление компонента каждую минуту (можно чаще)
        const timer = setInterval(() => setNow(new Date()), 15000); // 15 сек или 60_000 мс — как хочешь
        return () => clearInterval(timer);
    }, []);

    //прокрутка в Today
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Или просто клавишу T
            if (((e.key === '`' || e.key === '~') && !e.ctrlKey && !e.altKey && !e.metaKey) || e.key === 'F3') {
                e.preventDefault();

                // Убираем фокус с активного элемента
                if (document.activeElement) {
                    (document.activeElement as HTMLElement).blur();
                }

                calendarRef.current.scrollToToday?.();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [calendarRef]);

    function getNextMeetingInfo(items: ItemType[], now: Date) {

        const futureMeetings = items
            .filter(item =>
                item.type === "meeting" &&
                !item.is_deleted &&           // добавь эту строку
                !item.is_done &&             // добавь эту строку
                // !item.all_day_meeting &&
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
                title: next.title,
                minutesLeft: diffMin,
                hours: hours,
                minutes: minutes,
                is_alerted: next.is_alerted,
                formattedTime: minutes > 0
                    ? `${hours} ч ${minutes} мин`
                    : `${hours} ч`
            };
        } else {
            // Меньше часа - показываем только минуты
            return {
                category: next.meeting_category,
                title: next.title,
                minutesLeft: diffMin,
                formattedTime: `${diffMin} мин`,
                is_alerted: next.is_alerted,
            };
        }

        return null;
    }

    const nextMeetingInfo = useMemo(() => getNextMeetingInfo(items, now), [items, now]);

    const [notificationSent, setNotificationSent] = useState(false);

    // Подключаем уведомления для следующей встречи
    useEffect(() => {
        if (!nextMeetingInfo) {
            setNotificationSent(false); // сбрасываем флаг если встречи нет
            return;
        }
        // Если уведомление уже отправлено - не отправляем повторно
        if (notificationSent) return;

        // Уведомляем только когда остается ровно 10 минут (или меньше) И включены уведомления
        if (nextMeetingInfo.minutesLeft <= 30 &&
            nextMeetingInfo.minutesLeft > 0 &&
            nextMeetingInfo.is_alerted) {
            console.log('Отправляем уведомление - до встречи', nextMeetingInfo.minutesLeft, 'минут');

            if (window.electron?.showNotification) {
                window.electron.showNotification({
                    title: 'Напоминание о встрече',
                    body: `Встреча с ${nextMeetingInfo.title} через ${nextMeetingInfo.minutesLeft} минут`
                });
                setNotificationSent(true); // помечаем что уведомление отправлено
            }
        }
    }, [nextMeetingInfo, notificationSent]);

    // Сбрасываем флаг когда меняется встреча
    useEffect(() => {
        setNotificationSent(false);
    }, [nextMeetingInfo?.title]);

    return (
        <div className="relative flex justify-between items-center px-[15px] py-2"
             style={{height: headerHeight}}>

            {/* Левая часть - название месяцев */}

            <div className="flex-none text-xl font-medium w-[210px]">
                {activeMainTab !== "misc" && visibleMonths.length > 0 && (
                    <>
                            {visibleMonths.slice(0, -1).join(" - ")}
                        <span className="ml-[5px] font-light">
                                {visibleMonths[visibleMonths.length - 1]}
                            </span>
                        </>

                )}

            </div>

            {/* Центр - табы */}
            <div
                className="flex flex-row flex-1 justify-between items-center"
                style={{
                    left: `calc((100vw - ${rightPanelWidth}px) * 0.5)`
                }}
            >
                <div
                    className={clsx(
                        "w-[150px] flex justify-center  ",
                    )}
                >
                    {((weeks === 2 || weeks === 3) && activeMainTab !== "misc") && (
                        <TimeListToggle
                            showTimeLines={showTimeLines[weeks] || false}
                            onShowTimeLinesChange={(value) => setShowTimeLines(weeks, value)}
                        />
                    )}
                    {(weeks === 5 && activeMainTab !== "misc") && (
                        <TasksMeetingsToggle
                            monthViewMode={monthViewMode}
                            onMonthViewModeChange={setMonthViewMode}
                        />
                    )}
                </div>

                <Tabs
                    selectedKey={activeMainTab}
                    onSelectionChange={(key) =>
                        setActiveMainTab(key as "lists" | "week" | "2weeks" | "3weeks" | "month" | "misc" | "money")
                    }
                    aria-label="Основные вкладки"
                    variant="underlined"
                    color="primary"
                    classNames={{
                        tab: "w-full px-2",
                        cursor: "w-full",
                        tabContent: "group-data-[selected=true]:font-medium",
                    }}
                >
                    {/*<Tab key="week" title="1 Week"/>*/}
                    <Tab key="lists" title="Lists"/>
                    <Tab key="2weeks" title="2 Weeks"/>
                    <Tab key="3weeks" title="3 Weeks"/>
                    <Tab key="month" title="Month"/>
                    <Tab key="misc" title="Misc"/>
                    {/*<Tab key="money" title="Money"/>*/}
                </Tabs>

                <div
                    className={clsx("flex flex-col flex-1 justify-center",
                        "font-medium text-center  text-[12px]  ml-[0px]",
                    )}
                >

                    {activeMainTab !== "misc" && nextMeetingInfo && (
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
                    )}
                </div>

            </div>

            {/* Правая часть - кнопки */
            }
            <div className="flex flex-row gap-3 w-[150px] justify-end">
                {activeMainTab !== "misc" && (
                    <Button
                        className={clsx("font-medium")}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            calendarRef.current.scrollToToday?.();
                        }}
                    >
                        Сегодня
                    </Button>
                )}

                {activeMainTab === "misc" && (
                    <Button
                        className={clsx("font-semibold")}
                        variant="ghost"
                        size="sm"
                        color="success"
                        onClick={() => setAddClientModalOpen(true)}
                    >
                        + Add Client
                    </Button>
                )}

                <UploadButton/>
                <DownloadButton/>

                <div className="flex items-center justify-center w-[28px] h-[28px]">
                    {isUploadingData ? (
                        <CloudUpload
                            strokeWidth={3}
                            size={22}
                            className="animate-pulse-icon text-warning-300"
                        />
                    ) : isDownloadingData ? (
                        <CloudDownload
                            strokeWidth={3}
                            size={22}
                            className="animate-pulse-icon text-success-300"
                        />
                    ) : (
                        <div className={clsx(
                            isUploadingData && "-scale-x-100")}
                        >

                            <SyncProgressIndicator/>

                        </div>
                    )}
                </div>

                <Settings
                    isOpenAction={isSettingsOpen}
                    setIsOpenAction={setIsSettingsOpen}
                    setFirstLoadFadeIn={setFirstLoadFadeIn}
                />
            </div>

        </div>
    )
        ;
}