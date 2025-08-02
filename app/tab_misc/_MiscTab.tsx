// 'use client';
import React, {useEffect, useMemo, useState} from 'react';
import {useMainContext} from "@/app/context";
import type {ClientType} from "@/app/types";
import {ClientModal} from "@/app/tab_misc/ModalClientInfo";
import {supabase} from "@/app/utils/dbase/supabaseClient";
import clsx from "clsx";
import {Select, SelectItem, Tab, Tabs} from "@heroui/react";
import {addMonths, format} from "date-fns";
import {ru} from "date-fns/locale";
import usePersistentState from "@/app/utils/usePersistentState";
import {ClientsInfo} from "@/app/tab_misc/ClientsInfo";
import {ClientsPayment} from "@/app/tab_misc/ClientsPayment";
import {ExchangeRates} from './ExchangeRates';
import {Fixed} from './Fixed';
import {useDbStatus} from './useDbStatus';
import {DbStatusIndicator} from './DbStatusIndicator';
import {LockToggle} from './LockToggle';
import {PaymentTasks} from "./PaymentTasks";
import {useMiscTabContext} from "@/app/context_misc";

interface MiscTabProps {
    addClientModalOpen: boolean;
    setAddClientModalOpen: (open: boolean) => void;
}

export function MiscTab({addClientModalOpen, setAddClientModalOpen}: MiscTabProps) {
    const {clients, setClients, items, tabs, subtabs,} = useMainContext();

    const {activeMiscTab, setActiveMiscTab, selectedMonth, setSelectedMonth} = useMiscTabContext();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientType | null>(null);
    const [isNew, setIsNew] = useState(false);

    const [euroToUsdRate, setEuroToUsdRate] = useState<number>(1.15); // дефолтный курс
    const [usdToUyuRate, setUsdToUyuRate] = useState<number>(40.00);
    const [euroToUyuRate, setEuroToUyuRate] = useState<number>(46.00);

    const [isLocked, setIsLocked] = useState(true);

    const dbStatus = useDbStatus();


    // Генерим месяцы с текущего до июня 2025
    const months = useMemo(() => {
        const startDate = new Date(2025, 5, 1); // июнь 2025
        const currentDate = new Date();
        const months = [];

        let date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        while (date >= startDate) {
            months.push({
                value: format(date, "yyyy-MM"),
                label: format(date, "LLLL", {locale: ru}),
            });
            date = addMonths(date, -1);
        }

        return months;
    }, []);




    // Загрузка данных из базы при монтировании компонента
    // useEffect(() => {
    //     const loadClients = async () => {
    //         try {
    //             const { data, error } = await supabase
    //                 .from("clients")
    //                 .select("*")
    //
    //             if (error) throw error;
    //
    //             if (data) {
    //                 setClients(data);
    //             }
    //         } catch (e: any) {
    //             alert("Ошибка загрузки клиентов: " + e.message);
    //         } finally {
    //             setInitialLoading(false);
    //         }
    //     };
    //
    //     loadClients();
    // }, [setClients]);

    // Генерим месяцы с текущего и следующие
    const monthsExp = useMemo(() => {
        const currentDate = new Date();
        const months = [];

        for (let i = 0; i < 6; i++) {
            const date = addMonths(currentDate, i);
            months.push({
                value: format(date, "yyyy-MM"),
                label: format(date, "LLLL yy", {locale: ru}),
            });
        }

        return months;
    }, []);

    const [selectedMonthExp, setSelectedMonthExp] = usePersistentState(
        "expTasksSelectedMonth",
        months[0].value
    );

    // Функция для преобразования номера дня в текст
    const getDayName = (dayNumber: number | null | undefined): string => {
        if (!dayNumber) return "";
        const dayNames = {
            1: "Понедельник",
            2: "Вторник",
            3: "Среда",
            4: "Четверг",
            5: "Пятница",
            6: "Суббота",
            7: "Воскресенье"
        };
        return dayNames[dayNumber as keyof typeof dayNames] || "";
    };

    // Функция для преобразования времени в минуты для сортировки
    const timeToMinutes = (time: string | null | undefined): number => {
        if (!time) return 9999; // Клиенты без времени в конце
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Группировка клиентов по дням недели
    const groupedClients = useMemo(() => {
        const groups: { [key: string]: ClientType[] } = {};

        // Сортируем клиентов: сначала с meeting_day, потом без
        const sortedClients = [...clients].sort((a, b) => {
            // Если у одного есть meeting_day, а у другого нет
            if (a.meeting_day && !b.meeting_day) return -1;
            if (!a.meeting_day && b.meeting_day) return 1;

            // Если у обоих есть meeting_day, сортируем по дню
            if (a.meeting_day && b.meeting_day) {
                return a.meeting_day - b.meeting_day;
            }

            // Если у обоих нет meeting_day, сортируем по имени
            return a.name.localeCompare(b.name);
        });

        sortedClients.forEach(client => {
            const dayName = client.meeting_day ? getDayName(client.meeting_day) : "Без дня";
            if (!groups[dayName]) {
                groups[dayName] = [];
            }
            groups[dayName].push(client);
        });

        // Сортируем клиентов внутри каждого дня по времени
        Object.keys(groups).forEach(dayName => {
            groups[dayName].sort((a, b) => {
                const timeA = timeToMinutes(a.meeting_time);
                const timeB = timeToMinutes(b.meeting_time);

                // Если времена одинаковые, сортируем по имени
                if (timeA === timeB) {
                    return a.name.localeCompare(b.name);
                }

                return timeA - timeB;
            });
        });

        return groups;
    }, [clients]);

    // Реагировать на открытие модалки для создания нового клиента извне
    useEffect(() => {
        if (addClientModalOpen) {
            handleAdd();
            setAddClientModalOpen(false);
        }
        // eslint-disable-next-line
    }, [addClientModalOpen]);

    // Вспомогательная функция для сброса формы
    function resetForm() {
        setEditingClient(null);
        setIsNew(false);
        setModalOpen(false);
        setAddClientModalOpen(false);
    }

    // Открыть на создание
    function handleAdd() {
        setEditingClient({
            id: Date.now(),
            name: "",
            notes: "",
            every_two_weeks: false,
            price: 0,
            currency: "euro",
            timezone: "",
            url: "",
            meeting_day: undefined,
            is_hidden: false
        });
        setIsNew(true);
        setModalOpen(true);
    }

    // Открыть на редактирование
    function handleEdit(client: ClientType) {
        setEditingClient({...client});
        setIsNew(false);
        setModalOpen(true);
    }

    async function handleSave() {
        if (!editingClient) return;
        dbStatus.startLoading();

        // вычисляем timediff и кладём его в editingClient
        const timediff = computeTimediff(editingClient.timezone || "");
        const editingClientWithDiff = {...editingClient, timediff};

        try {
            if (isNew) {
                // Вставка ВСЕХ ПОЛЕЙ editingClient
                const {data, error} = await supabase
                    .from("clients")
                    .insert([editingClientWithDiff])
                    .select();

                if (error) throw error;

                const saved = data && data[0] ? {...editingClientWithDiff, ...data[0]} : editingClientWithDiff;

                setClients((prev: ClientType[]) => [...prev, saved]);
            } else {
                // Обновление ВСЕХ ПОЛЕЙ editingClient
                const {data, error} = await supabase
                    .from("clients")
                    .update(editingClientWithDiff)
                    .eq("id", editingClient.id)
                    .select();

                if (error) throw error;

                const saved = data && data[0] ? {...editingClientWithDiff, ...data[0]} : editingClientWithDiff;

                setClients((prev: ClientType[]) =>
                    prev.map(c => c.id === editingClient.id ? saved : c)
                );
            }
        } catch (e: any) {
            dbStatus.setError();
            alert("Ошибка сохранения в базе: " + e.message);
        } finally {
            dbStatus.setSuccess();
            resetForm();
        }
    }

    function computeTimediff(clientTz: string): number | null {
        try {
            if (!clientTz) return null;
            const now = new Date();
            const uyTime = now.toLocaleString("en-US", {timeZone: "America/Montevideo"});
            const clientTime = now.toLocaleString("en-US", {timeZone: clientTz});
            const uyDate = new Date(uyTime);
            const clDate = new Date(clientTime);
            const diffMs = clDate.getTime() - uyDate.getTime();
            const diffH = diffMs / (1000 * 60 * 60);
            return Math.round(diffH);
        } catch {
            return null;
        }
    }

    const isPastMonth = useMemo(() => {
        const now = new Date();
        const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        return selectedYear < currentYear || (selectedYear === currentYear && selectedMonthNum < currentMonth);
    }, [selectedMonth]);

    // Сброс блокировки при смене вкладки
    useEffect(() => {
        setIsLocked(true);
    }, [activeMiscTab]);

// Сброс блокировки при смене месяца
    useEffect(() => {
        setIsLocked(true);
    }, [selectedMonth]);

    return (
        <div className="w-full mx-auto flex flex-col items-center mt-[0px] px-[28px]">

            <div className="absolute top-3 left-3 p-3 rounded border border-default-300 shadow">
                <ExchangeRates/>
            </div>

            <div className="flex  w-[800px] items-center justify-between ml-[0px] mb-[20px]">

                <div className={"ml-[160px] flex items-center gap-3 "}>
                    <Tabs
                        selectedKey={activeMiscTab}
                        onSelectionChange={(key) =>
                            setActiveMiscTab(key as "clients" | "payments" | "fixed" | "expenses")
                        }
                        aria-label="Основные вкладки"
                        variant="bordered"
                        color="primary"
                        size="sm"
                        classNames={{
                            tabList: "flex w-full gap-1 m-0 p-0 justify-between rounded-lg",
                            cursor: "w-full bg-default-500/80 rounded-[6px]",
                            tabContent: "font-medium group-data-[selected=true]:font-medium",
                        }}
                    >
                        <Tab key="clients" title="Клиенты"/>
                        <Tab key="payments" title="Оплата"/>
                        <Tab key="fixed" title="Fixed"/>
                        {/*<Tab key="expenses" title="Траты"/>*/}
                    </Tabs>

                    {activeMiscTab !== "clients" && (
                        <LockToggle isLocked={isLocked} onLockChange={setIsLocked}/>
                    )}

                    <DbStatusIndicator status={dbStatus.status}/>

                </div>

                <div className=" flex flex-1  justify-end gap-3">

                    {/*{clientsActiveTab === "payments" && (*/}
                    {/*    <Select*/}
                    {/*        size="sm"*/}
                    {/*        // variant={"faded"}*/}
                    {/*        color={selectedMonth === months[0].value ? "primary" : "default"}*/}
                    {/*        className={clsx(*/}
                    {/*            "w-[150px]",*/}
                    {/*        )}*/}
                    {/*        selectedKeys={new Set([selectedMonth])}*/}
                    {/*        onSelectionChange={keys => {*/}
                    {/*            const val = Array.from(keys)[0];*/}
                    {/*            if (val && val !== selectedMonth) {*/}
                    {/*                setSelectedMonth(String(val));*/}
                    {/*            }*/}
                    {/*        }}*/}
                    {/*        // classNames={{*/}
                    {/*        //     trigger: clsx(*/}
                    {/*        //         selectedMonth === months[0].value && "border-success-500 bg-success-50"*/}
                    {/*        //     )*/}
                    {/*        // }}*/}
                    {/*    >*/}
                    {/*        {months.map(m => (*/}
                    {/*            <SelectItem key={m.value}>{m.label}</SelectItem>*/}
                    {/*        ))}*/}
                    {/*    </Select>*/}
                    {/*)}*/}

                    {(activeMiscTab === "payments" || activeMiscTab === "fixed") && (
                        <div className="flex gap-1">
                            {months.slice(0, 4).reverse().map((month, index) => (
                                <button
                                    key={month.value}
                                    onClick={() => setSelectedMonth(month.value)}
                                    className={clsx(
                                        "px-3 py-1.5 w-[70px] text-sm rounded-md transition-colors",
                                        selectedMonth === month.value
                                            ? "bg-primary-500 text-white"
                                            : "bg-default-100 text-default-600 hover:bg-default-200",
                                        // Текущий месяц - это months[0], который после reverse становится последним
                                        month.value === months[0].value && "font-bold"
                                    )}
                                >
                                    {month.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeMiscTab === "expenses" && (

                        <Select
                            size="sm"
                            color={selectedMonthExp === months[0].value ? "primary" : "default"}
                            className="w-[150px]"
                            selectedKeys={new Set([selectedMonthExp])}
                            onSelectionChange={keys => {
                                const val = Array.from(keys)[0];
                                if (val && val !== selectedMonthExp) {
                                    setSelectedMonthExp(String(val));
                                }
                            }}
                        >
                            {monthsExp.map(m => (
                                <SelectItem key={m.value}>{m.label}</SelectItem>
                            ))}
                        </Select>

                    )}

                </div>

            </div>

            {activeMiscTab === "clients" && (
                <ClientsInfo
                    groupedClients={groupedClients}
                    onClientEdit={handleEdit}
                    tableWidth={800}
                />
            )}

            {activeMiscTab === "payments" && (
                <ClientsPayment
                    groupedClients={groupedClients}
                    tableWidth={800}
                    dbStatus={dbStatus}
                    isLocked={isLocked}
                />
            )}

            {activeMiscTab === "fixed" && (
                <Fixed
                    groupedClients={groupedClients}
                    selectedMonth={selectedMonth}
                    tableWidth={800}
                    exchangeRate={euroToUsdRate}
                    dbStatus={dbStatus}
                    isLocked={isLocked}
                />
            )}

            {activeMiscTab === "expenses" && (
                <div className="">
                    <PaymentTasks tableWidth={800}
                                  selectedMonth={selectedMonthExp}
                                  uyuRate={usdToUyuRate}
                    />
                </div>
            )}

            <ClientModal
                isOpen={modalOpen}
                onOpenChange={setModalOpen}
                editingClient={editingClient}
                setEditingClient={setEditingClient}
                isNew={isNew}
                onSave={handleSave}
                onCancel={resetForm}
            />

        </div>
    );
}