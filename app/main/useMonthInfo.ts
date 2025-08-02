import { useMainContext } from "@/app/context";
import type {ClientType} from "@/app/types";
import {useMiscTabContext} from "@/app/context_misc";

interface MonthInfo {
    pastMeetingsCount: number;
    pastMeetingsAmount: number;
    pastMeetingsAmountRubles: number;

    paidMeetingsCount: number;
    paidMeetingsAmountUSD: number;

    unpaidMeetingsAmountUSD: number;

    historicalDebtUSD: number;

    futureMeetingsCount: number
    futureMeetingsAmountUSD: number
}

export const useMonthInfo = (): MonthInfo => {
    const { clients, items } = useMainContext();
    const {activeMainTab, activeMiscTab, setActiveMainTab, euroToUsdRate, usdToUyuRate, euroToUyuRate,
        setActiveMiscTab, selectedMonth, setSelectedMonth} = useMiscTabContext();

    // Вычисляем, прошедший месяц или нет
    const now = new Date();
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && selectedMonthNum < currentMonth);

    const roundPrice = (price: number, currency: string, exchangeRate: number) => {
        const priceInUSD = currency === 'euro'
            ? Math.round((price * exchangeRate) / 5) * 5
            : price;
        return priceInUSD;
    };
    const getBaseMeetingFilter = (clientId: number, selectedMonth: string) => (item: any) => {
        return item.type === "meeting" &&
            item.client_id === clientId &&
            item.due_date?.startsWith(selectedMonth) &&
            !item.is_deleted &&
            !item.is_done;
    };
    const getPastMeetingsForClient = (clientId: number, selectedMonth: string, items: any[]) => {
        return items
            .filter(getBaseMeetingFilter(clientId, selectedMonth))
            .filter(item => {
                const meetingDateTime = new Date(`${item.due_date}T${item.meeting_time_end || item.meeting_time_start || '23:59'}:00`);
                return meetingDateTime <= now;
            });
    };



    const pastMeetingsCount = clients
        .filter(client => client.meeting_type === 'client' || client.meeting_type === 'supervision')
        .filter(client => !client.is_hidden)
        .reduce((count, client) => {
            const clientMeetings = getPastMeetingsForClient(client.id, selectedMonth, items);
            return count + clientMeetings.length;
        }, 0);

    const pastMeetingsAmount = clients
        .filter(client => client.meeting_type !== 'group' && !client.is_hidden)
        .reduce((total, client) => {
            const clientMeetings = items.filter(getBaseMeetingFilter(client.id, selectedMonth)).length;
            const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
            return total + (priceInUSD * clientMeetings);
        }, 0);

    const pastMeetingsAmountRubles = clients
        .filter(client => client.meeting_type !== 'group' && !client.is_hidden)
        .filter(client => client.payment_method === "rubles")
        .reduce((total, client) => {
            const clientMeetings = items.filter(getBaseMeetingFilter(client.id, selectedMonth)).length;
            const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
            return total + (priceInUSD * clientMeetings);
        }, 0);

    const paidMeetingsCount = clients
        .filter(client => client.meeting_type !== 'group' && !client.is_hidden)
        .reduce((total, client) => {
            if (client.pay_per_session) {
                const pastMeetings = getPastMeetingsForClient(client.id, selectedMonth, items);
                return total + pastMeetings.length;
            } else {
                const paidMeetings = client.payment_history?.[selectedMonth]?.paid_meetings || 0;
                return total + paidMeetings;
            }
        }, 0);

    const paidMeetingsAmountUSD = clients
        .filter(client => client.meeting_type !== 'group' && !client.is_hidden)
        .reduce((total, client) => {
            let paidMeetingsCount = 0;

            if (client.pay_per_session) {
                const pastMeetings = getPastMeetingsForClient(client.id, selectedMonth, items); // ← заменить
                paidMeetingsCount = pastMeetings.length;
            } else {
                paidMeetingsCount = client.payment_history?.[selectedMonth]?.paid_meetings || 0;
            }

            const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);
            return total + (priceInUSD * paidMeetingsCount);
        }, 0);


    // Подсчет суммы неоплаченных встреч напрямую
    const unpaidMeetingsAmountUSD = clients
        .filter(client => client.meeting_type !== 'group' && !client.is_hidden)
        .filter(client => client.payment_method !== "rubles")
        .filter(client => !client.pay_per_session)
        .reduce((total, client) => {
            const pastMeetingsCount = getPastMeetingsForClient(client.id, selectedMonth, items).length; // ← заменить

            const paidMeetingsCount = client.payment_history?.[selectedMonth]?.paid_meetings || 0;
            const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);

            if (paidMeetingsCount < pastMeetingsCount) {
                const unpaidCount = pastMeetingsCount - paidMeetingsCount;
                return total + (priceInUSD * unpaidCount);
            }

            return total;
        }, 0);


    // Функция для расчета исторического долга
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


    // Подсчет общего исторического долга
    const historicalDebtUSD = clients
        .filter(client => client.meeting_type !== 'group' && !client.is_hidden)
        .reduce((total, client) => total + getHistoricalDebt(client.id), 0);

    // Функция для подсчета будущих встреч
    const getFutureMeetingsCount = (clientId: number) => {
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.meeting_day) return 0;

        if (client.every_two_weeks) {
            const pastMeetings = getPastMeetingsForClient(clientId, selectedMonth, items);
            return Math.max(0, 2 - pastMeetings.length);
        }

        const now = new Date();
        const [year, month] = selectedMonth.split('-').map(Number);
        const lastDayOfMonth = new Date(year, month, 0).getDate();

        let count = 0;
        let startDay = now.getDate();
        if (now.getMonth() + 1 !== month || now.getFullYear() !== year) {
            startDay = 1;
        }

        for (let day = startDay; day <= lastDayOfMonth; day++) {
            const checkDate = new Date(year, month - 1, day);
            const dayOfWeek = checkDate.getDay();
            const meetingDayFormat = dayOfWeek === 0 ? 7 : dayOfWeek;

            if (meetingDayFormat === client.meeting_day) {
                if (day === now.getDate() && now.getMonth() + 1 === month && now.getFullYear() === year) {
                    if (client.meeting_time) {
                        const [hours, minutes] = client.meeting_time.split(':').map(Number);
                        const meetingTime = new Date(now);
                        meetingTime.setHours(hours, minutes, 0, 0);

                        if (meetingTime > now) {
                            count++;
                        }
                    }
                } else if (day > now.getDate() || now.getMonth() + 1 !== month || now.getFullYear() !== year) {
                    count++;
                }
            }
        }

        return count;
    };

    // Подсчет будущих встреч и их суммы
    const futureMeetingsData = clients
        .filter(client => client.meeting_type !== 'group' && !client.is_hidden)
        .reduce((acc, client) => {
            const futureMeetingsCount = getFutureMeetingsCount(client.id);
            const priceInUSD = roundPrice(client.price, client.currency, euroToUsdRate);

            return {
                count: acc.count + futureMeetingsCount,
                amount: acc.amount + (priceInUSD * futureMeetingsCount)
            };
        }, { count: 0, amount: 0 });


    return {
        pastMeetingsCount,
        pastMeetingsAmount,
        pastMeetingsAmountRubles,

        paidMeetingsCount,
        paidMeetingsAmountUSD,

        unpaidMeetingsAmountUSD,

        historicalDebtUSD,
        futureMeetingsCount: futureMeetingsData.count,
        futureMeetingsAmountUSD: futureMeetingsData.amount
    };
};