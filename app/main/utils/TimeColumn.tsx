import React from 'react';
import { useConstants } from "@/app/constants";
import { useDndContext } from "@/app/context_dnd";

interface TimeColumnProps {
    weekHeight: number;
    dayData: any;
}

export const TimeColumn: React.FC<TimeColumnProps> = ({ weekHeight, dayData }) => {
    const { weeks } = useDndContext();
    const C = useConstants();

    const DAY_END = weeks === 1 ? 24 : 21;
    const HOURS = DAY_END - C.DAY_START;
    const PIXELS_PER_MIN = weeks === 1
        ? 34 / 60
        : weeks <= 3
            ? 24 / 60
            : 22 / 60;

    const TASK_HEIGHT = 23;
    const TASKS_MAX = weeks === 1 ? 8 : 3;
    const TASKS_PANEL_HEIGHT = TASK_HEIGHT * TASKS_MAX + 6;

    return (
        <div className="border-r border-b border-default-300 bg-content2/30 relative overflow-hidden">
            {/* Отступ сверху для области задач */}
            {/*<div style={{ height: TASKS_PANEL_HEIGHT + 22 }} />*/}

            {/* Разметка времени */}
            {Array.from({ length: HOURS + 1 }).map((_, i) => {
                const hour = C.DAY_START + i;

                // const top = TASKS_PANEL_HEIGHT + 22 + (i * 60 * PIXELS_PER_MIN);

                const baseTop = TASKS_PANEL_HEIGHT + 22 + (i * 60 * PIXELS_PER_MIN);
                const top = baseTop + (dayData.isAfterLastSunday ? 2 : 0);

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
    );
};