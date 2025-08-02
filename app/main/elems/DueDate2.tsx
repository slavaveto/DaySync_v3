import React, {useEffect, useState} from "react";
import clsx from "clsx";
import type {ItemType} from "@/app/types";
import {CircleX, Repeat2, Star, Sunrise, AlarmClock} from 'lucide-react';
import {Calendar, Chip, TimeInput} from '@heroui/react';
import {CalendarDate, DateValue, Time} from "@internationalized/date";
import {useMainContext} from "@/app/context";
import {useDevice} from "@/app/utils/providers/MobileDetect";
import {ICON_SIZES} from "@/app/main/droppable/dndStyles";

interface Props {
    item: ItemType;
    repeated: boolean;
    due_date?: string;
    onSelect: (date: DateValue | undefined) => void;
    onChangeRepeat: (repeat: boolean) => void;

    closePopup: () => void;
}

export const DueDate: React.FC<Props> = ({
                                             item, repeated, due_date, onSelect,
                                             onChangeRepeat, closePopup
                                         }) => {

    const {items, setItems, setHasLocalChanges, setIsUserActive} = useMainContext();
    const {isMobile, isTablet, isDesktop} = useDevice();

    const now = new Date();
    const today: DateValue = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const tomorrow: DateValue = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate() + 1);
    const [selectedDate, setSelectedDate] = useState<DateValue | undefined>(() => parseDueDate(due_date));

    // 👇 Каждый раз, когда due_date приходит новым, обновляем дату
    useEffect(() => {
        setSelectedDate(parseDueDate(due_date));
    }, [due_date]);

    // 👇 функция преобразования строки в CalendarDate (если due_date = 'YYYY-MM-DD')
    function parseDueDate(due_date?: string): DateValue | undefined {
        if (!due_date) return undefined;
        const [year, month, day] = due_date.split('-').map(Number);
        if (!year || !month || !day) return undefined;
        return new CalendarDate(year, month, day);
    }

    useEffect(() => {
        setTimeout(() => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            document.querySelectorAll('.w-8[role="button"][data-selected="true"]').forEach((el) => {
                // Парсим дату из aria-label
                const aria = el.getAttribute('aria-label');
                if (!aria) return;

                const match = aria.match(/([A-Za-z]+), ([A-Za-z]+) (\d{1,2}), (\d{4})/);
                if (!match) return;

                const months = {
                    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
                    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
                };
                const month = months[match[2] as keyof typeof months];

                const day = parseInt(match[3], 10);
                const year = parseInt(match[4], 10);

                const date = new Date(year, month, day);
                date.setHours(0, 0, 0, 0);

                // Убираем кастомный класс у всех (на всякий случай)
                el.classList.remove('overdue-date');

                // Если выбранная и просроченная
                if (date < now) {
                    el.classList.add('overdue-date');
                }
            });
        }, 0);
    }, [selectedDate]);

    useEffect(() => {
        // Даём чуть-чуть времени на рендер календаря
        setTimeout(() => {
            // Находим все заголовки th
            document.querySelectorAll('tr[data-slot="grid-header-row"] th').forEach((el) => {
                const span = el.querySelector('span');
                if (span && (span.textContent === 'S')) {
                    el.classList.add('weekend-header');
                }
            });
        }, 0);
    }, []);

    useEffect(() => {
        setTimeout(() => {
            const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
            // Найди все th-заголовки (их 7)
            document.querySelectorAll('tr[data-slot="grid-header-row"] th').forEach((el, idx) => {
                const span = el.querySelector('span');
                if (span && WEEKDAYS_RU[idx]) {
                    span.textContent = WEEKDAYS_RU[idx];
                }
            });
        }, 0);
    }, []);

    const isTodaySelected =
        selectedDate &&
        selectedDate.year === today.year &&
        selectedDate.month === today.month &&
        selectedDate.day === today.day;

    const isTomorrowSelected =
        selectedDate &&
        selectedDate.year === tomorrow.year &&
        selectedDate.month === tomorrow.month &&
        selectedDate.day === tomorrow.day;

    const [todayHovered, setTodayHovered] = useState(false);
    const [tomorrowHovered, setTomorrowHovered] = useState(false);
    const [resetHovered, setResetHovered] = useState(false);

    //первая буква первого слова - Заглавная
    return (
        <div
            className="flex flex-col items-center justify-center gap-2"
        >
            {/*{isMobile && (*/}
            {/*    <div className="w-[250px] font-medium text-center py-1">*/}
            {/*        {(() => {*/}
            {/*            const [first, ...rest] = item.title.split(" ");*/}
            {/*            if (!first) return item.title;*/}
            {/*            const capitalizedFirst = first.charAt(0).toUpperCase() + first.slice(1);*/}
            {/*            return rest.length > 0*/}
            {/*                ? `${capitalizedFirst} ${rest.join(" ")}`*/}
            {/*                : capitalizedFirst;*/}
            {/*        })()}*/}
            {/*    </div>*/}
            {/*)}*/}

            <Calendar
                className={clsx("w-full")}
                value={selectedDate as any}
                onChange={(date: DateValue) => {
                    setSelectedDate(date);
                    onSelect(date);
                    closePopup();
                }}
                showMonthAndYearPickers
                firstDayOfWeek="mon"
                aria-label="Выбор даты"
                minValue={today}
                classNames={{
                    headerWrapper: clsx("px-0"),
                    gridHeaderRow: clsx("pb-1"),
                    gridHeaderCell: clsx("text-[14px]"),
                    base: clsx("border-0 shadow-0"),
                }}
            />

            <div className="flex flex-row  py-2 items-center justify-center gap-3">

                <button
                    type="button"
                    disabled={item.list_key === "inbox"}
                    onClick={() => onChangeRepeat(!repeated)}
                    className={clsx(
                        "flex items-center justify-center gap-1 w-[28px] h-[28px] rounded-full transition-colors",
                        "border border-gray-200",
                        // Вкл = синий/белый, выкл = серый/тёмно-серый
                        repeated ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-600",
                        item.list_key === "inbox" && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Repeat2
                        size={ICON_SIZES.dt - 3}
                        className={clsx(
                            repeated ? "text-white" : "text-gray-500",
                            isMobile && "mr-[5px]"
                        )}
                    />
                </button>

                <button
                    type="button"
                    disabled={item.list_key === "inbox"}
                    onClick={() => onChangeRepeat(!repeated)}
                    className={clsx(
                        "flex items-center justify-center gap-1 w-[28px] h-[28px] rounded-full transition-colors",
                        "border border-gray-200",
                        // Вкл = синий/белый, выкл = серый/тёмно-серый
                        repeated ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-600",
                        item.list_key === "inbox" && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <AlarmClock
                        size={ICON_SIZES.dt - 3}
                        className={clsx(
                            repeated ? "text-white" : "text-gray-500",
                            isMobile && "mr-[5px]"
                        )}
                    />

                </button>

                <Chip
                    variant={"bordered"}
                    color={"primary"}
                    onClick={() => {
                        setSelectedDate(today);
                        onSelect(today);
                        closePopup();
                    }}
                    onMouseEnter={() => setTodayHovered(true)}
                    onMouseLeave={() => setTodayHovered(false)}
                    className={clsx(
                        "cursor-pointer",
                        !isTodaySelected && "text-default-400 hover:text-primary-400", // серый если не выбран
                    )}
                    startContent={
                        <Star
                            size={16}
                            className={clsx(
                                isTodaySelected || todayHovered ? "text-warning-400" : "text-warning-400/50"
                            )}
                        />
                    }
                    classNames={{
                        base: clsx("border-1 text-[14px] pl-2",
                            isTodaySelected ? "border-primary-300" : "border-default-300",
                            "hover:border-primary-300 transition duration-200"),
                    }}
                >

                </Chip>

                <Chip
                    variant={"bordered"}
                    color={"primary"}
                    onClick={() => {
                        setSelectedDate(tomorrow);
                        onSelect(tomorrow);
                        closePopup();
                    }}
                    onMouseEnter={() => setTomorrowHovered(true)}
                    onMouseLeave={() => setTomorrowHovered(false)}
                    className={clsx(
                        "cursor-pointer",
                        !isTomorrowSelected && "text-default-400 hover:text-primary-400", // серый если не выбран
                    )}

                    startContent={
                        <Sunrise
                            size={14}
                            className={clsx(
                                isTomorrowSelected || tomorrowHovered ? "text-warning-400" : "text-warning-400/50"
                            )}
                        />
                    }
                    classNames={{
                        base: clsx("border-1 text-[14px] pl-2",
                            isTomorrowSelected ? "border-primary-300" : "border-default-300",
                            "hover:border-primary-300 transition duration-200"),
                    }}
                >

                </Chip>

                <button
                    disabled={!selectedDate || item.list_key === "inbox"}
                    onClick={() => {
                        setSelectedDate(undefined);
                        onSelect(undefined);
                        closePopup();
                    }}
                    className={clsx(
                        "cursor-pointer text-danger-400 transition duration-200 opacity-50",
                        "hover:opacity-100",
                        (!selectedDate || item.list_key === "inbox") && "!text-default-400 hover:!opacity-50 pointer-events-none",
                    )}>
                    <CircleX
                        size={30}
                    />
                </button>
            </div>

            {/*<div className="flex flex-row  pb-2 items-center justify-center gap-3">*/}

            {/*    <TimeInput defaultValue={new Time(9)} size={"sm"} isDisabled/>*/}

            {/*</div>*/}

        </div>
    );
};
