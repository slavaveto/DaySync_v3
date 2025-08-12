import { useState, useEffect, useRef, useCallback } from 'react';
import { log } from "@/app/init/logger";
import { toast } from "react-hot-toast";
import { showNetworkToast } from "./showNetworkToast";

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

    // Ссылки на активные toast для управления ими
    const offlineToastRef = useRef<string | null>(null);
    const onlineToastRef = useRef<string | null>(null);

    // Функция для показа toast о потере сети
    const showOfflineToast = useCallback(() => {
        // Убираем предыдущий онлайн toast если есть
        if (onlineToastRef.current) {
            toast.dismiss(onlineToastRef.current);
            onlineToastRef.current = null;
        }

        const toastId = showNetworkToast({
            type: 'offline',
            title: 'Нет соединения с интернетом',
            message: 'Работаем в офлайн режиме',
            duration: Infinity
        });

        offlineToastRef.current = toastId;
    }, []);

    // Функция для показа toast о восстановлении сети
    const showOnlineToast = useCallback(() => {
        // Убираем предыдущий офлайн toast если есть
        if (offlineToastRef.current) {
            toast.dismiss(offlineToastRef.current);
            offlineToastRef.current = null;
        }

        const toastId = showNetworkToast({
            type: 'online',
            title: 'Соединение восстановлено',
            message: 'Синхронизация данных возобновлена',
            duration: 4000
        });

        onlineToastRef.current = toastId;
    }, []);

    // Проверка доступности Supabase
    const checkSupabaseConnectivity = useCallback(async (): Promise<boolean> => {
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
    }, []);

    // Полная проверка сети
    const checkFullConnectivity = useCallback(async (): Promise<NetworkCheckResult> => {
        const basicOnline = navigator.onLine;
        const supabaseOk = basicOnline ? await checkSupabaseConnectivity() : false;

        setLastCheck(new Date());
        return {
            isOnline: basicOnline,
            isSupabaseReachable: supabaseOk
        };
    }, [checkSupabaseConnectivity]);

    // Стабилизируем колбеки
    const stableOnNetworkChange = useCallback(onNetworkChange || (() => {}), [onNetworkChange]);
    const stableOnConnectionRestored = useCallback(onConnectionRestored || (() => {}), [onConnectionRestored]);
    const stableOnConnectionLost = useCallback(onConnectionLost || (() => {}), [onConnectionLost]);

    // Обработчики событий браузера
    useEffect(() => {
        const handleOnline = async () => {
            // log.success("🌐 Интернет восстановлен!");
            setIsOnline(true);

            const supabaseOk = await checkSupabaseConnectivity();
            setIsSupabaseReachable(supabaseOk);

            const newStatus = {
                isOnline: true,
                isSupabaseReachable: supabaseOk,
                isFullyOnline: supabaseOk
            };

            // ✅ Показываем toast о восстановлении
            if (supabaseOk) {
                showOnlineToast();
            }

            // ✅ Вызываем колбеки:
            if (onNetworkChange) stableOnNetworkChange(newStatus);
            if (supabaseOk && onConnectionRestored) stableOnConnectionRestored();

            if (supabaseOk) {
                // log.success("✅ Supabase доступен - можно синхронизироваться!");
            } else {
                // log.warning("⚠️ Интернет есть, но Supabase недоступен");
            }
        };

        const handleOffline = () => {
            // log.warning("🔴 Потеряно соединение с интернетом");
            setIsOnline(false);
            setIsSupabaseReachable(false);

            // ✅ Показываем toast о потере сети
            showOfflineToast();

            const newStatus = {
                isOnline: false,
                isSupabaseReachable: false,
                isFullyOnline: false
            };

            // ✅ Вызываем колбеки:
            if (onNetworkChange) stableOnNetworkChange(newStatus);
            if (onConnectionLost) stableOnConnectionLost();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Первоначальная проверка БЕЗ setLastCheck
        checkSupabaseConnectivity().then(supabaseOk => {
            setIsSupabaseReachable(supabaseOk);
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkSupabaseConnectivity, showOnlineToast, showOfflineToast, stableOnNetworkChange, stableOnConnectionRestored, stableOnConnectionLost]);

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
                if (onNetworkChange) stableOnNetworkChange(newStatus);

                if (supabaseOk) {
                    // log.success("✅ Supabase снова доступен!");
                    showOnlineToast();
                    if (onConnectionRestored) stableOnConnectionRestored();
                } else {
                    // log.warning("⚠️ Потеряна связь с Supabase");
                    showOfflineToast();
                    if (onConnectionLost) stableOnConnectionLost();
                }
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isOnline, isSupabaseReachable, checkSupabaseConnectivity, showOnlineToast, showOfflineToast, stableOnNetworkChange, stableOnConnectionRestored, stableOnConnectionLost]);

    return {
        isOnline,
        isSupabaseReachable,
        isFullyOnline: isOnline && isSupabaseReachable,
        lastCheck,
        checkFullConnectivity
    };
};