// components/QuickNotes.tsx
import React from 'react';
import {useMainContext} from "@/app/context";
import {format} from 'date-fns';
import {useUser} from "@clerk/nextjs";
import {ru} from "date-fns/locale";
import {useMonthInfo} from "./useMonthInfo";
import {useMiscTabContext} from "@/app/context_misc";

export function MonthInfo() {
    const {
        clients, setClients, items, tabs, subtabs,
    } = useMainContext();
    const {
        activeMainTab, activeMiscTab, setActiveMainTab,
        setActiveMiscTab, selectedMonth, setSelectedMonth
    } = useMiscTabContext();
    const {user} = useUser();

    const {
        pastMeetingsCount,
        pastMeetingsAmount,
        pastMeetingsAmountRubles,
        paidMeetingsCount,
        paidMeetingsAmountUSD,
        unpaidMeetingsAmountUSD,
        historicalDebtUSD,
        futureMeetingsCount,
        futureMeetingsAmountUSD

    } = useMonthInfo();

    // Проверка сходимости сумм
    const totalCalculated = paidMeetingsAmountUSD + unpaidMeetingsAmountUSD;
    const isAmountMismatch = Math.abs(totalCalculated - pastMeetingsAmount) > 0;

    const [year, month] = selectedMonth.split('-').map(Number);
    const formattedMonth = format(new Date(year, month - 1), "LLLL yyyy", {locale: ru});

    return (
        <div className={"p-3"}>

            <div className="text-xl font-semibold text-primary-700 mb-4 capitalize">
                {formattedMonth}
            </div>

            <div className="grid grid-cols-[max-content_auto_100px] gap-x-1">

                <span className="text-right">консультаций</span>
                <span>:</span>
                <span className="pl-1 text-right w-[60px]">
                    {pastMeetingsCount}
                </span>

                <span className="text-right">на сумму</span>
                <span>:</span>
                <span className={`pl-1 text-right w-[60px] ${isAmountMismatch ? 'text-red-500 font-bold' : ''}`}>
                    {pastMeetingsAmount.toLocaleString('en-US')}&thinsp;$
                </span>

                <span className="text-right">из них в рублях:</span>
                <span>:</span>
                <span className="pl-1 text-right w-[60px]">{pastMeetingsAmountRubles.toLocaleString('en-US')}&thinsp;$
                </span>

                <span className="text-right mt-2">оплачено</span>
                <span className="mt-2">:</span>
                <span
                    className="pl-1 text-right w-[60px] mt-2">{paidMeetingsAmountUSD.toLocaleString('en-US')}&thinsp;$
                </span>

                <span className="text-right mt-2">не оплачено</span>
                <span className="mt-2">:</span>
                <span
                    className="pl-1 text-right w-[60px] mt-2">{unpaidMeetingsAmountUSD.toLocaleString('en-US')}&thinsp;$
                </span>

                {historicalDebtUSD > 0 && (
                    <>
        <span className="text-right mt-2">долг</span>
        <span className="mt-2">:</span>
        <span className="pl-1 text-right w-[60px] mt-2">{historicalDebtUSD.toLocaleString('en-US')}&thinsp;$</span>
    </>
                )}

                <span className="mt-2 text-right">консультаций</span>
                <span className="mt-2">:</span>
                <span className="mt-2 pl-1 text-right w-[60px]">
                    {futureMeetingsCount}
                </span>

                <span className="text-right">не оплачено</span>
                <span >:</span>
                <span
                    className="pl-1 text-right w-[60px]">{futureMeetingsAmountUSD.toLocaleString('en-US')}&thinsp;$
                </span>


            </div>
        </div>
    );
}