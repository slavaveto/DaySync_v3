import { useState, useEffect } from 'react';
import { log } from "@/app/init/logger";

interface UseNetworkMonitoringProps {
    onNetworkChange?: (status: { isOnline: boolean; isSupabaseReachable: boolean; isFullyOnline: boolean }) => void;
    onConnectionRestored?: () => void;
    onConnectionLost?: () => void;
}

interface NetworkCheckResult {
    isOnline: boolean;
    isSupabaseReachable: boolean;
}

export const useNetworkMonitoring = ({
                                         onNetworkChange,
                                         onConnectionRestored,
                                         onConnectionLost
                                     }: UseNetworkMonitoringProps = {}) => {

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSupabaseReachable, setIsSupabaseReachable] = useState(true);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);

    // Проверка доступности Supabase (из твоего кода)
    const checkSupabaseConnectivity = async (): Promise<boolean> => {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const response = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'HEAD',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                },
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    };

    // Полная проверка сети
    const checkFullConnectivity = async (): Promise<NetworkCheckResult> => {
        const basicOnline = navigator.onLine;
        const supabaseOk = basicOnline ? await checkSupabaseConnectivity() : false;

        setLastCheck(new Date());
        return {
            isOnline: basicOnline,
            isSupabaseReachable: supabaseOk
        };
    };

    // Обработчики событий браузера
    useEffect(() => {
        const handleOnline = async () => {
            log.success("🌐 Интернет восстановлен!");
            setIsOnline(true);

            const supabaseOk = await checkSupabaseConnectivity();
            setIsSupabaseReachable(supabaseOk);

            const newStatus = {
                isOnline: true,
                isSupabaseReachable: supabaseOk,
                isFullyOnline: supabaseOk
            };

            // ✅ Вызываем колбеки:
            if (onNetworkChange) onNetworkChange(newStatus);
            if (supabaseOk && onConnectionRestored) onConnectionRestored();

            if (supabaseOk) {
                log.success("✅ Supabase доступен - можно синхронизироваться!");
            } else {
                log.warning("⚠️ Интернет есть, но Supabase недоступен");
            }
        };


        const handleOffline = () => {
            log.warning("🔴 Потеряно соединение с интернетом");
            setIsOnline(false);
            setIsSupabaseReachable(false);

            const newStatus = {
                isOnline: false,
                isSupabaseReachable: false,
                isFullyOnline: false
            };

            // ✅ Вызываем колбеки:
            if (onNetworkChange) onNetworkChange(newStatus);
            if (onConnectionLost) onConnectionLost();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Первоначальная проверка
        checkFullConnectivity().then(result => {
            setIsOnline(result.isOnline);
            setIsSupabaseReachable(result.isSupabaseReachable);
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [onNetworkChange, onConnectionRestored, onConnectionLost]);

    // Периодическая проверка Supabase (каждые 30 секунд если онлайн)
    useEffect(() => {
        if (!isOnline) return;

        const interval = setInterval(async () => {
            const supabaseOk = await checkSupabaseConnectivity();
            if (supabaseOk !== isSupabaseReachable) {
                setIsSupabaseReachable(supabaseOk);

                const newStatus = {
                    isOnline,
                    isSupabaseReachable: supabaseOk,
                    isFullyOnline: isOnline && supabaseOk
                };

                // ✅ Колбек при изменении:
                if (onNetworkChange) onNetworkChange(newStatus);

                if (supabaseOk) {
                    log.success("✅ Supabase снова доступен!");
                    if (onConnectionRestored) onConnectionRestored();
                } else {
                    log.warning("⚠️ Потеряна связь с Supabase");
                    if (onConnectionLost) onConnectionLost();
                }
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isOnline, isSupabaseReachable, onNetworkChange, onConnectionRestored, onConnectionLost])

    return {
        isOnline,
        isSupabaseReachable,
        isFullyOnline: isOnline && isSupabaseReachable,
        lastCheck,
        checkFullConnectivity
    };
};