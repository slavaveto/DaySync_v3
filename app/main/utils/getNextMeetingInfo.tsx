import type { ItemType } from "@/app/types";
import React, { useMemo, useState, useEffect } from "react";

// Чистая функция без хуков
export function getNextMeetingInfo(items: ItemType[], now: Date) {
    const futureMeetings = items
        .filter(item =>
            item.type === "meeting" &&
            (item.meeting_category === "client" || item.meeting_category === "supervision") &&
            item.meeting_time_start &&
            new Date(item.due_date + "T" + item.meeting_time_start) >= now
        )
        .sort((a, b) => {
            const aTime = new Date(a.due_date + "T" + a.meeting_time_start);
            const bTime = new Date(b.due_date + "T" + b.meeting_time_start);
            return aTime.getTime() - bTime.getTime();
        });

    const currentMeeting = items.find(item => {
        if (item.type !== "meeting") return false;
        if (!(item.meeting_time_start && item.meeting_time_end)) return false;
        const start = new Date(item.due_date + "T" + item.meeting_time_start);
        const end = new Date(item.due_date + "T" + item.meeting_time_end);
        return now >= start && now < end;
    });

    if (currentMeeting) return null;

    const next = futureMeetings[0];
    if (!next) return null;

    const nextStart = new Date(next.due_date + "T" + next.meeting_time_start);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    if (nextStart < todayStart || nextStart > todayEnd) {
        return null;
    }

    const diffMs = nextStart.getTime() - now.getTime();
    const diffMin = Math.ceil(diffMs / 60000);

    if (diffMin >= 60) {
        const hours = Math.floor(diffMin / 60);
        const minutes = diffMin % 60;

        return {
            category: next.meeting_category,
            title: next.title,
            minutesLeft: diffMin,
            hours: hours,
            minutes: minutes,
            formattedTime: minutes > 0
                ? `${hours} ч ${minutes} мин`
                : `${hours} ч`
        };
    } else {
        return {
            category: next.meeting_category,
            title: next.title,
            minutesLeft: diffMin,
            formattedTime: `${diffMin} мин`
        };
    }
}

export function NextMeetingTimeDisplay({ items }: { items: ItemType[] }) {

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        // Форс-обновление компонента каждые 15 секунд
        const timer = setInterval(() => setNow(new Date()), 15000);
        return () => clearInterval(timer);
    }, []);

    const nextMeetingInfo = useMemo(() => getNextMeetingInfo(items, now), [items, now]);

    if (!nextMeetingInfo) return null;

    return (
        <div className="text-center text-[16px] font-semibold ml-[50px]">
            Встреча с {nextMeetingInfo.title} через {nextMeetingInfo.formattedTime}!
        </div>
    );
}