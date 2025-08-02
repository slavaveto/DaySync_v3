import { isToday, isTomorrow, isYesterday } from 'date-fns';
import type { ItemType } from "@/app/types";

export const WEEK_DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const formatRelativeDate = (item: ItemType): string => {
    if (!item.due_date) return '';

    // Парсим дату из строки "yyyy-MM-dd"
    const [year, month, day] = item.due_date.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);

    const monthsGenitive = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    // Для остальных дат - полный день недели
    const weekdays = [
        'Воскр', 'Понед', 'Вторник', 'Среда',
        'Четверг', 'Пятница', 'Суббота'
    ];
    const weekday = weekdays[dueDate.getDay()];

    // Получаем общие данные
    const dayOfWeek = dueDate.getDay();
    const weekdayShort = WEEK_DAYS_SHORT[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
    const dayNum = dueDate.getDate();
    const monthName = monthsGenitive[dueDate.getMonth()];
    // const yearShort = String(dueDate.getFullYear()).slice(-2);
    const yearShort = ""

    // Проверяем относительные даты
    if (isYesterday(dueDate)) {
        return `Вчера, ${weekday.toLowerCase()}, ${dayNum} ${monthName} ${yearShort}`;
    }

    if (isToday(dueDate)) {
        return `Сегодня, ${weekday.toLowerCase()}, ${dayNum} ${monthName} ${yearShort}`;
    }

    if (isTomorrow(dueDate)) {
        return `Завтра, ${weekday.toLowerCase()}, ${dayNum} ${monthName} ${yearShort}`;
    }

    return `${weekday}, ${dayNum} ${monthName} ${yearShort}`;
};