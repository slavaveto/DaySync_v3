
import { useState, useEffect } from "react";
import {CalendarDate, DateValue, parseDate} from "@internationalized/date";
import type {ItemType} from "@/app/types"; // или свой аналог, если другой календарь


export function useReactiveToday(offset = 0) {
    const [today, setToday] = useState(() => {
        const now = new Date();
        now.setDate(now.getDate() + offset);
        return new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            now.setDate(now.getDate() + offset);
            setToday(new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate()));
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [offset]);

    useEffect(() => {
        function checkTodayUpdate() {
            const now = new Date();
            now.setDate(now.getDate() + offset);
            const newToday = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
            setToday(prev => {
                if (
                    prev.year !== newToday.year ||
                    prev.month !== newToday.month ||
                    prev.day !== newToday.day
                ) {
                    return newToday;
                }
                return prev;
            });
        }

        window.addEventListener('mousemove', checkTodayUpdate);
        window.addEventListener('mousedown', checkTodayUpdate);
        window.addEventListener('wheel', checkTodayUpdate);
        window.addEventListener('touchmove', checkTodayUpdate);

        return () => {
            window.removeEventListener('mousemove', checkTodayUpdate);
            window.removeEventListener('mousedown', checkTodayUpdate);
            window.removeEventListener('wheel', checkTodayUpdate);
            window.removeEventListener('touchmove', checkTodayUpdate);
        };
    }, [offset]);
    return today;
}

export  function isSameDate(a?: DateValue, b?: DateValue) {
    return (
        a?.calendar.identifier === b?.calendar.identifier &&
        a?.year === b?.year &&
        a?.month === b?.month &&
        a?.day === b?.day
    );
}

export function isOverdue(date?: DateValue, today?: CalendarDate): boolean {
    if (!date || !today) return false;
    return date.compare(today) < 0;
}

export function getSelectedDateFromItem(item: ItemType): DateValue | undefined {
    if (!item.due_date) return undefined;
    try {
        return parseDate(item.due_date); // строка формата "YYYY-MM-DD"
    } catch {
        return undefined;
    }
}

const WEEKDAYS_RU = ['воскр', 'понед', 'втор', 'среда', 'четв', 'пятн', 'субб'];

export function getWeekdayShortRuIfWithinWeek(date?: DateValue, today?: DateValue): string | null {
    if (!date || !today) return null;

    const dateObj = new Date(date.year, date.month - 1, date.day);
    const todayObj = new Date(today.year, today.month - 1, today.day);

    const todayDay = todayObj.getDay(); // 0=воскр

    let intervalEnd;
    if (todayDay === 0) {
        // Сегодня воскресенье: до следующего воскресенья включительно (через 7 дней)
        intervalEnd = new Date(todayObj);
        intervalEnd.setDate(todayObj.getDate() + 7);
    } else if (todayDay >= 4) {
        // Сегодня четверг, пятница или суббота: до воскресенья следующей недели
        intervalEnd = new Date(todayObj);
        // (7 − todayDay) — сколько дней до ближайшего воскресенья,
        // + 7 — ещё одна неделя вперёд
        intervalEnd.setDate(
            todayObj.getDate() + (7 - todayDay) + 7
        );
    } else {
        // Иначе — до ближайшего воскресенья (включительно)
        intervalEnd = new Date(todayObj);
        intervalEnd.setDate(todayObj.getDate() + (7 - todayDay));
    }

    if (dateObj <= intervalEnd) {
        const day = dateObj.getDay();
        return WEEKDAYS_RU[day] + ",";
    }
    return null;
}

export function formatDateRu(date: DateValue) {
    // CalendarDate: year, month, day
    const months = [
        '', 'янв', 'фев', 'мар', 'апр', 'мая', 'июня',
        'июля', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ];
    return `${date.day} ${months[date.month]}`;
}

export function getWeekdayShortRu(date?: DateValue): string | null {
    if (!date) return null;
    const jsDate = new Date(date.year, date.month - 1, date.day);
    const day = jsDate.getDay();

    if (day === 0) return "воскр";
    if (day === 6) return "субб";
    return null;
}