import React, {useMemo, useState} from 'react';
import clsx from 'clsx';
import type {ClientType} from "@/app/types";
import {useMainContext} from "@/app/context";
import type {DbStatus} from './useDbStatus';
import {supabase} from "@/app/utils/dbase/supabaseClient";
import {FixedModal} from './ModalFixed';
import {useMiscTabContext} from "@/app/context_misc";

interface ClientsInfoProps {
    groupedClients: { [key: string]: ClientType[] };
    tableWidth?: number; // общая ширина таблицы
    dbStatus: { status: DbStatus; startLoading: () => void; setSuccess: () => void; setError: () => void; };
    isLocked: boolean;
}

export const ClientsPayment = ({
                                   groupedClients,
                                   tableWidth = 600,
                                   dbStatus,
                                   isLocked
                               }: ClientsInfoProps) => {
    const {clients, setClients, items, tabs, subtabs,} = useMainContext();

    const {euroToUsdRate, usdToUyuRate, euroToUyuRate,
        setActiveMiscTab, selectedMonth, setSelectedMonth} = useMiscTabContext();

    // Проверяем, является ли выбранный месяц прошедшим
    const now = new Date();
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && selectedMonthNum < currentMonth);

    const [fixedModalOpen, setFixedModalOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [modalData, setModalData] = useState<{
        priceUsd: number,
        allMeetings: number,
        sum: number,
        fixedAmount: number
    } | null>(null);

    // Функция для фильтрации видимых клиентов
    const isVisibleClient = (client: ClientType) => {
        return client.meeting_type !== 'group' &&
            // client.meeting_day &&
            !client.is_hidden;
    };

    // Функция для округления цены до ближайшего 5
    const roundPrice = (price: number, currency: string, exchangeRate: number) => {
        const priceInUSD = currency === 'euro'
            ? Math.round((price * exchangeRate) / 5) * 5
            // ? Math.round(price * exchangeRate)
            : price;
        return priceInUSD;
    };

    const DYNAMIC_COLUMNS = isPastMonth ? [
        {key: 'name', width: 230, align: 'left' as const},
        // {key: 'price', width: 100, align: 'center' as const},
        {key: 'all_meetings', width: 70, align: 'center' as const},
        {key: 'price_usd', width: 70, align: 'center' as const},
        {key: 'sum', width: 100, align: 'center' as const},
        {key: 'paid_meetings', width: 70, align: 'center' as const},
        {key: 'debt', width: 80, align: 'center' as const},
        {key: 'historical_debt', width: 70, align: 'center' as const},
        {key: 'fixed', width: 70, align: 'center' as const},
        // {key: 'fixed_amount', width: 100, align: 'center' as const},
        // { key: 'fixed_name', width: 100, align: 'left' as const },
    ] : [
        {key: 'name', width: 230, align: 'left' as const},
        // {key: 'price', width: 100, align: 'center' as const},
        {key: 'past_meetings', width: 80, align: 'center' as const},
        {key: 'price_usd', width: 80, align: 'center' as const},
        {key: 'past_meetings_paid', width: 80, align: 'center' as const},
        {key: 'all_meetings', width: 80, align: 'center' as const},
        // {key: 'paid_meetings', width: 60, align: 'center' as const},
        {key: 'sum', width: 120, align: 'center' as const},
        // {key: 'historical_debt', width: 100, align: 'center' as const},
    ];

    // Функция для расчета позиций колонок (исключая name)
    const calculateColumnPositions = (columns: typeof DYNAMIC_COLUMNS) => {
        // Берем все колонки кроме name
        const dataColumns = columns.filter(col => col.key !== 'name');
        let currentRight = 0;

        return dataColumns.slice().reverse().map(col => {
            const position = {
                ...col,
                right: currentRight,
                style: {right: `${currentRight}px`, width: `${col.width}px`}
            };
            currentRight += col.width;
            return position;
        });
    };

    // Функция для подсчета встреч клиента в выбранном месяце
    const getPastMeetingsCount = (clientId: number) => {
        const now = new Date();

        return items.filter(item => {
            if (item.type !== "meeting" ||
                item.client_id !== clientId ||
                !item.due_date ||
                !item.due_date.startsWith(selectedMonth) ||
                item.is_deleted ||
                item.is_done) {
                return false;
            }

            // Создаем дату-время встречи
            const meetingDateTime = new Date(`${item.due_date}T${item.meeting_time_end || item.meeting_time_start || '23:59'}:00`);

            // Сравниваем с текущим временем
            return meetingDateTime <= now;
        }).length;
    };

    const getFutureMeetingsCount = (clientId: number) => {
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.meeting_day) return 0;

        if (client.every_two_weeks) {
            // Для клиентов раз в две недели: фиксированно 2 встречи в месяц
            const pastMeetings = getPastMeetingsCount(clientId);
            return Math.max(0, 2 - pastMeetings); // не может быть меньше 0
        }

        const now = new Date();
        const [year, month] = selectedMonth.split('-').map(Number);

        // Последний день выбранного месяца
        const lastDayOfMonth = new Date(year, month, 0).getDate();

        let count = 0;

        // Начинаем с завтрашнего дня (или сегодня если время встречи еще не прошло)
        let startDay = now.getDate();
        if (now.getMonth() + 1 !== month || now.getFullYear() !== year) {
            startDay = 1; // если смотрим другой месяц, начинаем с 1 числа
        }

        // Проходим по всем дням от текущего до конца месяца
        for (let day = startDay; day <= lastDayOfMonth; day++) {
            const checkDate = new Date(year, month - 1, day);
            const dayOfWeek = checkDate.getDay(); // 0 = воскресенье, 1 = понедельник...

            // Преобразуем в формат meeting_day (1 = понедельник, 7 = воскресенье)
            const meetingDayFormat = dayOfWeek === 0 ? 7 : dayOfWeek;

            if (meetingDayFormat === client.meeting_day) {
                // Если это сегодня, проверяем время
                if (day === now.getDate() && now.getMonth() + 1 === month && now.getFullYear() === year) {
                    if (client.meeting_time) {
                        const [hours, minutes] = client.meeting_time.split(':').map(Number);
                        const meetingTime = new Date(now);
                        meetingTime.setHours(hours, minutes, 0, 0);

                        if (meetingTime > now) {
                            count++; // встреча еще не началась сегодня
                        }
                    }
                } else if (day > now.getDate() || now.getMonth() + 1 !== month || now.getFullYear() !== year) {
                    count++; // будущие дни
                }
            }
        }

        return count;
    };

    // Функция для получения общего количества встреч
    const getAllMeetingsCount = (clientId: number) => {
        return isPastMonth
            ? getPastMeetingsCount(clientId)
            : getPastMeetingsCount(clientId) + getFutureMeetingsCount(clientId);
    };

    const getTotalSum = () => {
        return Object.values(groupedClients)
            .flat()
            .filter(isVisibleClient)
            .filter(client => isPastMonth && client.payment_method !== "rubles")
            .reduce((total, client) => {
                const meetingsCount = getAllMeetingsCount(client.id);
                const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                return total + (priceInUSD * meetingsCount);
            }, 0);
    };

    const getPaidSum = () => {
        return Object.values(groupedClients)
            .flat()
            .filter(isVisibleClient)
            .filter(client => isPastMonth || !client.exclude_from_calculations)
            .filter(client => client.pay_per_session) // только клиенты которые платят сразу
            .reduce((total, client) => {
                const meetingsCount = getPastMeetingsCount(client.id);
                const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                return total + (priceInUSD * meetingsCount);
            }, 0);
    };

    const getUnpaidSum = () => {
        return getTotalSum() - getPaidSum();
    };

    const columnPositions = useMemo(() => calculateColumnPositions(DYNAMIC_COLUMNS), [isPastMonth]);
    const totalDataColumnsWidth = useMemo(() =>
        DYNAMIC_COLUMNS.filter(col => col.key !== 'name').reduce((sum, col) => sum + col.width, 0), [isPastMonth]
    );

    // Ширина колонки name = общая ширина - ширина остальных колонок
    const nameColumnWidth = useMemo(() =>
        tableWidth - totalDataColumnsWidth, [tableWidth, totalDataColumnsWidth]
    );

    const getPaidMeetings = (clientId: number, month: string) => {
        const client = clients.find(c => c.id === clientId);
        return client?.payment_history?.[month]?.paid_meetings || 0;
    };

    const setPaidMeetings = async (clientId: number, month: string, paidMeetings: number) => {
        dbStatus.startLoading();
        try {
            // Сначала обновляем локальное состояние
            const updatedClients = clients.map(client => {
                if (client.id === clientId) {
                    const paymentHistory = client.payment_history || {};
                    return {
                        ...client,
                        payment_history: {
                            ...paymentHistory,
                            [month]: {
                                ...paymentHistory[month],
                                paid_meetings: paidMeetings
                            }
                        }
                    };
                }
                return client;
            });
            setClients(updatedClients);

            // Затем сохраняем в базу данных
            const client = clients.find(c => c.id === clientId);
            if (client) {
                const updatedPaymentHistory = {
                    ...client.payment_history,
                    [month]: paidMeetings
                };

                const {error} = await supabase
                    .from("clients")
                    .update({payment_history: updatedPaymentHistory})
                    .eq("id", clientId);

                if (error) {
                    console.error("Ошибка сохранения payment_history:", error);
                    // Можно добавить toast уведомление об ошибке
                }
            }
            dbStatus.setSuccess();
        } catch (error) {
            dbStatus.setError();  // ← добавить
            console.error("Ошибка при обновлении оплат:", error);
        }
    };

    const getHistoricalDebt = (clientId: number) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return 0;

        let totalDebt = 0;
        const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
        const selectedDate = new Date(selectedYear, selectedMonthNum - 1, 1);

        // Проходим по всем месяцам до выбранного
        for (let i = 1; i <= 12; i++) {
            const pastDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
            const monthKey = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}`;

            // Считаем встречи за этот месяц
            const monthMeetings = items.filter(item =>
                item.type === "meeting" &&
                item.client_id === clientId &&
                item.due_date?.startsWith(monthKey) &&
                !item.is_deleted &&
                !item.is_done
            ).length;

            // Получаем количество оплаченных встреч
            const paidMeetings = client.payment_history?.[monthKey]?.paid_meetings || 0;

            // Добавляем долг за этот месяц
            const unpaidMeetings = Math.max(0, monthMeetings - paidMeetings);
            const monthDebt = unpaidMeetings * client.price;
            const monthDebtUSD = roundPrice(monthDebt, client.currency, euroToUsdRate);

            totalDebt += monthDebtUSD;
        }

        return totalDebt;
    };

    const getFixedStatus = (clientId: number, month: string) => {
        const client = clients.find(c => c.id === clientId);
        return client?.payment_history?.[month]?.fixed || false;
    };

    const setFixedStatus = async (clientId: number, month: string, isFixed: boolean) => {
        dbStatus.startLoading();
        try {
            const updatedClients = clients.map(client => {
                if (client.id === clientId) {
                    const paymentHistory = client.payment_history || {};
                    return {
                        ...client,
                        payment_history: {
                            ...paymentHistory,
                            [month]: {
                                ...paymentHistory[month],
                                fixed: isFixed
                            }
                        }
                    };
                }
                return client;
            });
            setClients(updatedClients);

            // Сохранение в базу данных
            const client = clients.find(c => c.id === clientId);
            if (client) {
                const updatedPaymentHistory = {
                    ...client.payment_history,
                    [`${month}_fixed`]: isFixed
                };

                const {error} = await supabase
                    .from("clients")
                    .update({payment_history: updatedPaymentHistory})
                    .eq("id", clientId);

                if (error) {
                    console.error("Ошибка сохранения _fixed:", error);
                }
            }
            dbStatus.setSuccess();
        } catch (error) {
            dbStatus.setError();
            console.error("Ошибка при обновлении статуса оплаты:", error);
        }
    };

    const allVisibleClients = useMemo(() => {
        return Object.entries(groupedClients)
            .filter(([dayName, dayClients]) => dayClients.some(isVisibleClient))
            .flatMap(([dayName, dayClients]) =>
                dayClients.filter(isVisibleClient).map(client => ({client, dayName}))
            );
    }, [groupedClients]);

    return (
        <>

        <div className="space-y-0" style={{width: `${tableWidth}px`}}>

            {/* HEADER СТРОКА */}
            <div
                className="bg-primary-50 border border-primary-200 rounded-md"
                style={{
                    marginLeft: `${nameColumnWidth}px` // Сдвигаем header вправо на ширину колонки name
                }}
            >
                <div className="relative flex h-[30px] items-center text-[14px] font-semibold">
                    {/*<div*/}
                    {/*    className="absolute truncate flex items-center justify-start h-full pl-3 border-r border-primary-200"*/}
                    {/*    style={{*/}
                    {/*        left: '0px',*/}
                    {/*        right: `${totalDataColumnsWidth}px`*/}
                    {/*    }}*/}
                    {/*>*/}
                    {/*    ИТОГО*/}
                    {/*</div>*/}

                    {/* Колонки с итогами */}
                    {columnPositions.map((col, index) => (
                        <div
                            key={col.key}
                            className={clsx(
                                "absolute flex items-center justify-center h-full text-primary-700",
                                col.align === 'center' && "justify-center",
                                "border-r border-primary-200" // все колонки в header имеют синий бордюр
                            )}
                            style={{
                                ...col.style,
                                right: `${col.right}px`, // позиции остаются те же, но теперь относительно сдвинутого header
                            }}
                        >
                            {col.key === 'past_meetings' && Object.values(groupedClients).flat().filter(isVisibleClient).reduce((sum, client) => sum + getPastMeetingsCount(client.id), 0)}
                            {col.key === 'past_meetings_paid' && `${getPaidSum()} $`}

                            {col.key === 'all_meetings' && Object.values(groupedClients).flat().filter(isVisibleClient).reduce((sum, client) => sum + getAllMeetingsCount(client.id), 0)}

                            {col.key === 'price' && ''} {/* пустая колонка */}
                            {col.key === 'price_usd' && ''} {/* пустая колонка */}

                            {col.key === 'sum' && (isPastMonth
                                    ?
                                    <span className="!text-success-500 text-[14px]">
                                        {getTotalSum()} $
                                    </span>
                                    : (
                                        <div className="text-center !text-danger-500">
                                            <div className="">{getUnpaidSum()} $</div>
                                            {/*<div className=" text-gray-500">({getTotalSum()} $)</div>*/}
                                        </div>
                                    )
                            )}

                            {col.key === 'paid' && ''}

                            {col.key === 'debt' && (() => {
                                const totalUnpaidMeetings = Object.values(groupedClients)
                                    .flat()
                                    .filter(isVisibleClient)
                                    .reduce((sum, client) => {
                                        const totalMeetings = getAllMeetingsCount(client.id);
                                        const paidMeetings = getPaidMeetings(client.id, selectedMonth);
                                        const unpaidMeetings = totalMeetings - paidMeetings;
                                        return sum + unpaidMeetings;
                                    }, 0);

                                const totalDebt = Object.values(groupedClients)
                                    .flat()
                                    .filter(isVisibleClient)
                                    .filter(client => !client.pay_per_session)
                                    .reduce((total, client) => {
                                        const totalMeetings = getAllMeetingsCount(client.id);
                                        const paidMeetings = getPaidMeetings(client.id, selectedMonth);
                                        const unpaidMeetings = totalMeetings - paidMeetings;
                                        const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                                        const debtAmount = priceInUSD * unpaidMeetings;
                                        return total + debtAmount;
                                    }, 0);

                                return (
                                    <div className="text-center flex flex-row items-center gap-1">

                                        <div className="text-[14px] text-danger-500">{totalDebt} $</div>
                                        {/*<span className="text-[12px]">({totalUnpaidMeetings})</span>*/}
                                    </div>
                                );
                            })()}

                            {col.key === 'historical_debt' && (() => {
                                const totalHistoricalDebt = Object.values(groupedClients)
                                    .flat()
                                    .filter(isVisibleClient)
                                    .reduce((total, client) => total + getHistoricalDebt(client.id), 0);
                                return (
                                    <span className="text-danger-600">
                                        {totalHistoricalDebt} $
                                    </span>
                                )
                            })()}

                            {col.key === 'fixed' && (() => {
                                const totalPaidAmount = Object.values(groupedClients)
                                    .flat()
                                    .filter(isVisibleClient)
                                    .reduce((total, client) => {
                                        if (getFixedStatus(client.id, selectedMonth)) {
                                            const meetingsCount = getAllMeetingsCount(client.id);
                                            const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                                            return total + (priceInUSD * meetingsCount);
                                        }
                                        return total;
                                    }, 0);

                                return (
                                    <span className="!text-orange-500">
                                        {totalPaidAmount} $
                                    </span>
                                )
                            })()}

                            {col.key === 'paid_meetings' && (() => {
                                const totalPaidMeetings = Object.values(groupedClients)
                                    .flat()
                                    .filter(isVisibleClient)
                                    .reduce((sum, client) => {
                                        if (client.pay_per_session) {
                                            return sum + getAllMeetingsCount(client.id); // все встречи для pay_per_session
                                        } else {
                                            return sum + getPaidMeetings(client.id, selectedMonth);
                                        }
                                    }, 0);

                                const totalPaidAmount = Object.values(groupedClients)
                                    .flat()
                                    .filter(isVisibleClient)
                                    .filter(client => client.payment_method !== "rubles")
                                    .reduce((total, client) => {
                                        const paidMeetings = client.pay_per_session
                                            ? getAllMeetingsCount(client.id) // все встречи для pay_per_session
                                            : getPaidMeetings(client.id, selectedMonth);
                                        const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                                        return total + (priceInUSD * paidMeetings);
                                    }, 0);

                                return (
                                    <div className="text-center flex flex-row items-center gap-1">
                                        <div className="">{totalPaidAmount} $</div>
                                        {/*<span className="text-[12px]">({totalPaidMeetings})</span>*/}
                                        {/*<div className="text-[12px] text-success-600">{totalPaidAmount} $</div>*/}
                                    </div>
                                );
                            })()}






                            {col.key === 'price_usd' && (() => {
                                const visibleClients = Object.values(groupedClients)
                                    .flat()
                                    .filter(isVisibleClient);

                                if (visibleClients.length === 0) return '';

                                const totalPriceUSD = visibleClients.reduce((sum, client) => {
                                    const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                                    return sum + priceInUSD;
                                }, 0);

                                const average = Math.round(totalPriceUSD / visibleClients.length);
                                return `${average} $`;
                            })()}

                        </div>
                    ))}
                </div>
            </div>

            {Object.entries(groupedClients)
                .filter(([dayName, dayClients]) =>
                    dayClients.some(client =>
                        isVisibleClient(client) && getAllMeetingsCount(client.id) > 0
                    )
                )
                .map(([dayName, dayClients]) => (
                    <div key={dayName}>
                        {/* Заголовок группы */}
                        {dayName === "Без дня" && (
                            <h3 className="text-lg font-semibold h-[20px] text-primary-600">
                            </h3>
                        )}

                        {/* Список клиентов для этого дня */}
                        <div className={`${dayName === "Вторник" || dayName === "Четверг" ? "ml-[30px]" : ""}`}>
                            <div className="rounded-md overflow-hidden border border-default-300 mb-0">
                                {dayClients
                                    .filter(isVisibleClient)
                                    .filter(client => getAllMeetingsCount(client.id) > 0)
                                    .map(client => {
                                        const globalIndex = allVisibleClients.findIndex(item => item.client.id === client.id);
                                        return (
                                            <div
                                                key={client.id}
                                                className={clsx(
                                                    "relative cursor-default group flex h-[26px] items-center last:border-0 border-b border-default-300 hover:bg-primary-50 transition-all duration-200 text-[14px]",
                                                    // globalIndex % 2 === 1 && "bg-primary-50/70"
                                                    client.payment_method === "rubles" && "bg-default-100"
                                                )}
                                            >
                                                {/* Имя - занимает оставшееся место */}
                                                <div
                                                    className={clsx(
                                                        "absolute truncate flex items-center justify-start h-full pl-3 border-r border-default-200",
                                                        client.meeting_type == "group" && "text-primary-500",
                                                        client.meeting_type == "supervision" && "text-orange-500",
                                                        // getFixedStatus(client.id, selectedMonth) && "group-hover:font-bold group-hover:text-danger-500",

                                                    )}
                                                    style={{
                                                        left: '0px',
                                                        right: `${totalDataColumnsWidth}px`
                                                    }}
                                                >
                                                    {client.name}
                                                </div>

                                                {/* Остальные колонки */}
                                                {columnPositions.map((col, index) => (
                                                    <div
                                                        key={col.key}
                                                        className={clsx(
                                                            "absolute flex items-center h-full",
                                                            col.align === 'left' && "justify-start pl-2",
                                                            col.align === 'center' && "justify-center",

                                                            // col.align === 'right' && "justify-end pr-2",
                                                            // Особые стили для конкретных колонок
                                                            col.key === 'time' && client.every_two_weeks && "text-orange-500",
                                                            (col.key === 'name' || col.key === 'all_meetings' || col.key === 'price_usd' || col.key === 'sum' || col.key === 'fixed_name') && getFixedStatus(client.id, selectedMonth) && "-group-hover:font-bold -group-hover:text-danger-500",

                                                            // border-r для всех кроме последней колонки
                                                            col.key !== 'offset' && "border-r border-default-200")}

                                                        style={col.style}
                                                    >

                                                        {col.key === 'past_meetings' && getPastMeetingsCount(client.id)}

                                                        {col.key === 'past_meetings_paid' && client.pay_per_session && (() => {
                                                            if (!isPastMonth && client.exclude_from_calculations) return '';
                                                            const meetingsCount = getPastMeetingsCount(client.id);
                                                            if (meetingsCount === 0) return ''; // не показывать если 0 встреч
                                                            const totalPrice = client.price * meetingsCount;
                                                            const priceInUSD = roundPrice(totalPrice, client.currency, euroToUsdRate);
                                                            return priceInUSD > 0 ? `${priceInUSD} $` : ''; // не показывать если сумма 0
                                                        })()}

                                                        {/*{col.key === 'all_meetings' && ((isPastMonth || !client.exclude_from_calculations) ? getAllMeetingsCount(client.id) : '')}*/}
                                                        {col.key === 'all_meetings' && getAllMeetingsCount(client.id)}

                                                        {col.key === 'price' && `${client.price} ${client.currency === 'euro' ? '€' : '$'}`}
                                                        {col.key === 'price_usd' && (() => {
                                                            const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                                                            return `${priceInUSD} $`;
                                                        })()}

                                                        {col.key === 'sum' && (() => {
                                                            if (!isPastMonth && client.exclude_from_calculations) return '';
                                                            const meetingsCount = getAllMeetingsCount(client.id);
                                                            const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                                                            const totalUSD = priceInUSD * meetingsCount;


                                                            return `${totalUSD} $`;
                                                        })()}

                                                        {col.key === 'paid_meetings' && (
                                                            client.pay_per_session ? (
                                                                <span className="text-center text-sm">
                                                                    {getAllMeetingsCount(client.id)}
                                                                </span>
                                                            ) : (
                                                                <select
                                                                    disabled={isLocked}
                                                                    value={getPaidMeetings(client.id, selectedMonth)}
                                                                    onChange={(e) => setPaidMeetings(client.id, selectedMonth, Number(e.target.value))}
                                                                    className={clsx("w-[60px] ml-[-10px] text-center text-sm bg-transparent outline-none focus:outline-none",
                                                                        isLocked ? "cursor-default" : "cursor-pointer"
                                                                    )}
                                                                >
                                                                    {Array.from({length: getAllMeetingsCount(client.id) + 1}, (_, i) => (
                                                                        <option key={i} value={i}>{i}</option>
                                                                    ))}
                                                                </select>
                                                            )
                                                        )}

                                                        {col.key === 'debt' && (() => {
                                                            if (client.pay_per_session) {
                                                                return ''; // нет долга для клиентов которые платят сразу
                                                            }
                                                            const totalMeetings = getAllMeetingsCount(client.id);
                                                            const paidMeetings = getPaidMeetings(client.id, selectedMonth);
                                                            const unpaidMeetings = totalMeetings - paidMeetings;
                                                            const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                                                            const debtAmount = priceInUSD * unpaidMeetings;


                                                            if (client.payment_method === 'pesos') {

                                                                const priceInPeso = client.currency === 'euro'
                                                                    ? client.price * euroToUyuRate
                                                                    : client.price * usdToUyuRate; // если цена в USD
                                                                // const totalPeso = priceInPeso * unpaidMeetings;
                                                                const totalPeso = Math.round(priceInPeso * unpaidMeetings).toLocaleString('en-US')

                                                                return debtAmount > 0 ? `${totalPeso}` : '';

                                                            }
                                                            return debtAmount > 0 ? `${debtAmount} $` : '';
                                                        })()}



                                                        {col.key === 'historical_debt' && (() => {
                                                            const debt = getHistoricalDebt(client.id);
                                                            return debt > 0 ? `${debt} $` : '';
                                                        })()}

                                                        {col.key === 'fixed' && (
                                                            <>
        {client.fixed_name && getAllMeetingsCount(client.id) > 0 ? (
            <input
                type="checkbox"
                disabled={isLocked}
                checked={getFixedStatus(client.id, selectedMonth)}
                onChange={(e) => setFixedStatus(client.id, selectedMonth, e.target.checked)}
                className={clsx("w-4 h-4",
                    isLocked ? "cursor-default" : "cursor-pointer"
                )}
            />
        ) : ''}
    </>
                                                        )}

                                                        {col.key === 'fixed_name' && (
                                                            <span className="cursor-default truncate w-full px-3"
                                                                  title={client.fixed_name}>
                                                                {client.fixed_name}
                                                            </span>
                                                        )}

                                                        {col.key === 'fixed_amount' && (
                                                            <div
                                                                onClick={() => {
                                                                    if (getFixedStatus(client.id, selectedMonth)) {
                                                                        // Берем точно те же значения, что показаны в таблице
                                                                        const priceUsd = roundPrice(client.price, client.currency, euroToUsdRate);
                                                                        const meetingsCount = getAllMeetingsCount(client.id);
                                                                        const sum = priceUsd * meetingsCount; // изменить эту строку
                                                                        const fixedAmount = sum;

                                                                        setSelectedClientId(client.id);
                                                                        setModalData({
                                                                            priceUsd,
                                                                            allMeetings: meetingsCount,
                                                                            sum,
                                                                            fixedAmount
                                                                        });
                                                                        setFixedModalOpen(true);
                                                                    }
                                                                }}
                                                                className="cursor-pointer underline hover:bg-primary-100 transition-colors"
                                                            >
                                                                {(() => {
                                                                    if (getFixedStatus(client.id, selectedMonth)) {
                                                                        const meetingsCount = getAllMeetingsCount(client.id);
                                                                        const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
                                                                        return `${priceInUSD * meetingsCount} $`; // и эту строку
                                                                    }
                                                                    return '';
                                                                })()}
                                                            </div>
                                                        )}

                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                ))}
        </div>

    <FixedModal
        isOpen={fixedModalOpen}
        onOpenChange={setFixedModalOpen}
        clientId={selectedClientId}
        priceUsd={modalData?.priceUsd || 0}
        allMeetings={modalData?.allMeetings || 0}
        sum={modalData?.sum || 0}
        fixedAmount={modalData?.fixedAmount || 0}
    />
</>
    );
};