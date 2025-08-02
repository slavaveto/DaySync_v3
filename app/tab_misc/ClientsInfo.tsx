import React, { useMemo } from 'react';
import clsx from 'clsx';
import type { ClientType } from "@/app/types";
import { useMainContext } from "@/app/context";

// Конфигурация колонок
const COLUMNS = [
    { key: 'name', width: 230, align: 'left' as const },
    { key: 'time', width: 70, align: 'center' as const },
    { key: 'price', width: 70, align: 'center' as const },
    { key: 'payment_method', width: 100, align: 'center' as const },
    { key: 'timezone', width: 100, align: 'right' as const },
    { key: 'offset', width: 60, align: 'center' as const },
    { key: 'past_meetings', width: 50, align: 'center' as const },

    { key: 'fixed_name', width: 80, align: 'left' as const },
    { key: 'url', width: 80, align: 'left' as const },
];

interface ClientsInfoProps {
    groupedClients: { [key: string]: ClientType[] };
    onClientEdit: (client: ClientType) => void;
    tableWidth?: number; // общая ширина таблицы
}

export const ClientsInfo = ({ groupedClients, onClientEdit, tableWidth = 600 }: ClientsInfoProps) => {

    const { items } = useMainContext();


    // Функция для расчета позиций колонок (исключая name)
    const calculateColumnPositions = (columns: typeof COLUMNS) => {
        // Берем все колонки кроме name
        const dataColumns = columns.filter(col => col.key !== 'name');
        let currentRight = 0;

        return dataColumns.slice().reverse().map(col => {
            const position = {
                ...col,
                right: currentRight,
                style: { right: `${currentRight}px`, width: `${col.width}px` }
            };
            currentRight += col.width;
            return position;
        });
    };



    function getTimezoneOffsetHours(timediff: number | null | undefined): string {
        if (timediff == null || isNaN(timediff)) return "?";
        if (timediff === 0) return "0 ч";
        return (timediff > 0 ? "+" : "") + timediff + " ч";
    }

    const columnPositions = useMemo(() => calculateColumnPositions(COLUMNS), []);
    const totalDataColumnsWidth = useMemo(() =>
        COLUMNS.filter(col => col.key !== 'name').reduce((sum, col) => sum + col.width, 0), []
    );

    // Ширина колонки name = общая ширина - ширина остальных колонок
    const nameColumnWidth = useMemo(() =>
        tableWidth - totalDataColumnsWidth, [tableWidth, totalDataColumnsWidth]
    );

    return (
        <div className="space-y-0" style={{ width: `${tableWidth}px` }}>
            {Object.entries(groupedClients).map(([dayName, dayClients]) => (
                <div key={dayName}>
                    {/* Заголовок группы */}
                    {dayName === "Без дня" && (
                        <h3 className="text-lg font-semibold h-[20px] text-primary-600">
                        </h3>
                    )}

                    {/* Список клиентов для этого дня */}
                    <div className={`${dayName === "Вторник" || dayName === "Четверг" ? "ml-[30px]" : ""}`}>
                        <div className="rounded-md overflow-hidden border border-default-300 mb-0">
                            {dayClients.map(client => (
                                <div
                                    key={client.id}
                                    className="relative flex h-[26px] items-center last:border-0 border-b border-default-300 cursor-pointer hover:bg-primary-50 transition-all duration-200 text-[14px]"
                                    onClick={() => onClientEdit(client)}
                                >
                                    {/* Имя - занимает оставшееся место */}
                                    <div
                                        className={clsx(
                                            "absolute truncate flex items-center justify-start h-full pl-3 border-r border-default-200",
                                            client.meeting_type == "group" && "text-primary-500"
                                        )}
                                        style={{
                                            left: '0px',
                                            right: `${totalDataColumnsWidth}px`
                                        }}
                                    >
                                        {client.name}
                                        {client.duration_50min && (
                                            <div className="ml-3 w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                                        )}
                                    </div>

                                    {/* Остальные колонки */}
                                    {columnPositions.map((col, index) => (
                                        <div
                                            key={col.key}
                                            className={clsx(
                                                "absolute flex items-center h-full",
                                                col.align === 'left' && "justify-start pl-2",
                                                col.align === 'center' && "justify-center",
                                                col.align === 'right' && "justify-end pr-2",
                                                // Особые стили для конкретных колонок
                                                col.key === 'time' && client.every_two_weeks && "text-orange-500",
                                                col.key === 'price' && client.pay_per_session && "text-orange-500",
                                                col.key === 'url' && "truncate",
                                                // border-r для всех кроме последней колонки
                                                col.key !== 'url' && "border-r border-default-200"                                            )}
                                            style={col.style}
                                        >
                                            {col.key === 'time' && (client.meeting_time ? client.meeting_time.replace(/^0/, "") : "")}
                                            {col.key === 'price' && (
                                                <span className="flex items-center gap-2">
                                                    {`${client.price} ${client.currency === 'euro' ? '€' : '$'}`}
                                                    {client.exclude_from_calculations && (
                                                        <div className="ml-0 w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                                                    )}
                                                </span>
                                            )}
                                            {col.key === 'payment_method' && client.payment_method && (
                                                <span className="flex items-center gap-2">
                                                    {client.payment_method}
                                                </span>
                                            )}
                                            {col.key === 'timezone' && (client.timezone ? client.timezone.split('/').pop() || "" : "")}
                                            {col.key === 'offset' && getTimezoneOffsetHours(client.timediff)}

                                            {col.key === 'past_meetings' && (() => {
                                                const dbMeetings = items.filter(item => {
                                                    if (item.type !== "meeting" || item.meeting_category === "group" || item.client_id !== client.id || !item.due_date || item.is_deleted || item.is_done) {
                                                        return false;
                                                    }
                                                    const meetingDateTime = new Date(`${item.due_date}T${item.meeting_time_end || item.meeting_time_start || '23:59'}:00`);
                                                    return meetingDateTime <= new Date();
                                                }).length;

                                                const total = dbMeetings + (client.past_meetings || 0);
                                                return total > 0 ? total : '';
                                            })()}

                                            {col.key === 'fixed_name' && (
                                                <span className="truncate w-full" title={client.fixed_name}>
                                                    {client.fixed_name}
                                                </span>
                                            )}
                                            {col.key === 'url' && (
                                                <span className="truncate w-full" title={client.url}>
                                                    {client.url}
                                                </span>
                                            )}


                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};