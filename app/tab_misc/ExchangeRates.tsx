import React, { useState, useEffect } from 'react';
import {useMiscTabContext} from "@/app/context_misc";

interface ExchangeRateProps {
    hideDisplay?: boolean;
}

export const ExchangeRates = ({
                                 hideDisplay = false,}: ExchangeRateProps) => {

    const {euroToUsdRate, setEuroToUsdRate, usdToUyuRate, setUsdToUyuRate, euroToUyuRate, setEuroToUyuRate,
} = useMiscTabContext();


    const fixedEuroToUsdRate = 1.15

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchExchangeRates = async () => {
            try {
                setLoading(true);

                const eurResponse = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
                const eurData = await eurResponse.json();
                setEuroToUsdRate(eurData.rates.USD);
                setEuroToUyuRate(eurData.rates.UYU);

                // Получаем USD/UYU (доллар к уругвайскому песо)
                const usdResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                const usdData = await usdResponse.json();
                setUsdToUyuRate(usdData.rates.UYU);

                setError(null);
            } catch (err) {
                setError('Ошибка загрузки');
                console.error('Ошибка получения курса:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchExchangeRates();
    }, []);

    if (loading) {
        return (
            <div className="text-sm text-default-500">
                Загрузка курсов...
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-sm text-danger-500">
                {error}
            </div>
        );
    }

    if (hideDisplay) {
        return null; // ничего не отображаем
    }

    return (
        <div className="flex flex-col gap-1 text-[14px] text-default-600">
            {/* EUR/USD курс */}
            <div className="flex flex-row gap-0">
                <div>
                    EUR/USD: <span className="text-primary-600 font-semibold">{euroToUsdRate?.toFixed(2)}</span>
                </div>
                <div>
                    /<span className="text-orange-600 font-semibold">{fixedEuroToUsdRate.toFixed(2)}</span>
                </div>
            </div>

            {/* UYU/USD курс */}
            <div>
                USD/UYU: <span className="text-green-600 font-semibold">{usdToUyuRate?.toFixed(2)}</span>
            </div>

            {/* EUR/UYU курс */}
            <div>
                EUR/UYU: <span className="text-purple-600 font-semibold">{euroToUyuRate?.toFixed(2)}</span>
            </div>

        </div>
    );
};