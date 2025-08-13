import {useEffect, useRef} from "react";
import {useMainContext} from "@/app/context";
import {log} from "@/app/init/logger";
import {useAuth} from '@clerk/nextjs';
import {toast} from "react-hot-toast";
import {Button} from "@heroui/react";

import usePersistentState from "@/app/init/usePersistentState";
import {useDevice} from "@/app/init/providers/MobileDetect";

import {useSetupSubscription} from "./useSetupSubscription";
import {useTestSubscription} from "./useTestSubscription";
import {useReloadAllItems} from "./useReloadAllItems";
import {useNetworkMonitoring} from "./useNetworkMonitoring";

export const SyncData = () => {

    const {
        items, setItems, userId, isUserActive, isUploadingData, hasLocalChanges, clearAllToasts,
        setIsDownloadingData, setSyncHighlight, setFirstLoadFadeIn
    } = useMainContext();

    const {getToken} = useAuth();

    const {isMobile, isDesktop} = useDevice();

    const user_id = userId;

    const onPayloadRef = useRef<((payload: any) => void) | null>(null);

    const [deviceId] = usePersistentState<string>(
        "deviceId",
        `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    const {isOnline, isSupabaseReachable, isFullyOnline, checkFullConnectivity} = useNetworkMonitoring({
        onConnectionRestored: () => {
            log.success("🚀 Связь восстановлена - запускаем синхронизацию!");
            // Автоматически синхронизируем при восстановлении
            if (hasLocalChanges) {
                // Запустить синхронизацию
            }
        },
        onConnectionLost: () => {
            log.warning("💾 Работаем в офлайн режиме");
        },
        onNetworkChange: (status) => {
            console.log("🌐 Статус сети изменился:", status);
        }
    });

    // Автосинхронизация при восстановлении связи
    // useEffect(() => {
    //     if (isFullyOnline && hasLocalChanges) {
    //         log.start("Сеть восстановлена - синхронизируем изменения...");
    //         // Здесь можно запустить автосинхронизацию
    //     }
    // }, [isFullyOnline, hasLocalChanges]);

    useEffect(() => {
        if (!isMobile) return; // Только для мобилки!

        function onVisibilityChange() {
            if (document.visibilityState !== 'visible') return;

            requestAnimationFrame(() => {
                // Здесь state гарантированно актуальный
                if (hasLocalChanges || isUploadingData) return;

                // 🔄 Сначала проверяем сеть!
                log.start("RELOAD, проверяем подключение к сети...");

                checkFullConnectivity().then(networkStatus => {
                    if (!networkStatus.isSupabaseReachable) {
                        log.warning("⚠️ Нет подключения к серверу - работаем в офлайн режиме");
                        // Можно показать пользователю статус офлайн
                        return;
                    }

                    log.success("Подключение к серверу установлено!");

                    reloadAllItems(undefined, () => {
                        console.log("✅ Обновление завершено!");

                        setTimeout(() => {
                            log.start("Настраиваем подписку...")

                            setupSubscription(() => {
                                console.log("✅ Подписка настроена!");

                                // Можно запустить что-то еще после подписки
                            });

                        }, 1000);
                    });
                });
            });
        }

        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [isMobile, user_id, hasLocalChanges, isUploadingData]);

    const {reloadAllItems} = useReloadAllItems();
    const {testSubscription} = useTestSubscription({
        deviceId,
        onPayloadRef
    });
    const {setupSubscription} = useSetupSubscription({
        onPayloadRef,
    });

    useEffect(() => {
        if (!user_id) return;

        // 🔄 Сначала проверяем сеть!
        log.start("RELOAD, проверяем подключение к сети...");

        checkFullConnectivity().then(networkStatus => {
            if (!networkStatus.isSupabaseReachable) {
                log.warning("⚠️ Нет подключения к серверу - работаем в офлайн режиме");
                // Можно показать пользователю статус офлайн
                return;
            }

            log.success("Подключение к серверу установлено!");

            reloadAllItems(undefined, () => {
                console.log("✅ Обновление завершено!");

                setTimeout(() => {
                    log.start("Настраиваем подписку...")

                    setupSubscription(() => {
                        console.log("✅ Подписка настроена!");


                        // Можно запустить что-то еще после подписки
                    });

                }, 1000);
            });
        });

    }, [user_id]);

    useEffect(() => {
        if (!user_id) return;
        if (!(window as any).electron?.onPowerStatus) return;

        let didResume = false;  // флажок, что мы уже отреагировали на resumed
        let powerEventTimeout: NodeJS.Timeout | null = null;

        const unsubscribe = (window as any).electron.onPowerStatus(
            ({status}: { status: string; message: string }) => {

                clearAllToasts()

                log('RESUMED, пауза 3сек...');
                console.log("RESUMED - компьютер проснулся, пауза 3сек...")

                // При уходе в сон или блокировке сбросим флажок
                if (status === "suspend" || status === "locked") {
                    didResume = false;
                    return;
                }
                // Если проснулись
                if (status === "resumed") {
                    didResume = true;
                }
                // Если разблокировка, но до этого НЕ было resumed
                else if (status === "unlocked" && !didResume) {

                } else {
                    // console.log(`❌ Пропускаем: ${status}, didResume: ${didResume}`);
                    return;
                }

                if (powerEventTimeout) {
                    clearTimeout(powerEventTimeout);
                }

                powerEventTimeout = setTimeout(async () => {

                    performSubscriptionRecovery();

                }, 3000);
            });
        return () => {
            unsubscribe();
        };
    }, [user_id, hasLocalChanges, isUploadingData]);

    // Функция восстановления подписки с тестом
    const performSubscriptionRecovery = () => {
        log.start("Проверяем подключение к сети...");

        checkFullConnectivity().then(networkStatus => {
            if (!networkStatus.isSupabaseReachable) {
                log.warning("⚠️ Нет подключения к серверу - работаем в офлайн режиме");
                // Можно показать пользователю статус офлайн
                return;
            }

            log.success("Подключение к серверу установлено!");

            if (!user_id) {
                console.log("❌ user_id отсутствует, пропускаем восстановление");
                return;
            }

            if (hasLocalChanges || isUploadingData) {
                console.log("⏸️ Пропускаем восстановление - есть локальные изменения или идет загрузка");
                return;
            }

            reloadAllItems(undefined, () => {
                console.log("✅ Обновление завершено!");

                setTimeout(() => {
                    log.start("Настраиваем подписку...")

                    setupSubscription(() => {
                        console.log("✅ Подписка настроена!");
                        // Можно запустить что-то еще после подписки

                        // ✅ ДОБАВЛЯЕМ ТЕСТ ПОДПИСКИ ПРЯМО ЗДЕСЬ
                        setTimeout(async () => {
                            console.log("🧪 Запускаем тест подписки...");
                            log.start("Запускаем тест подписки...")

                            await testSubscription((success) => {
                                if (success) {
                                    log.success("Тест подписки успешен!")

                                } else {

                                    showSyncErrorToast()
                                }
                            });

                        }, 1000);

                    });

                }, 1000);
            });
        });

    };

    // Функция для показа toast об ошибке синхронизации
    const showSyncErrorToast = () => {
        toast((t) => (
            <div
                style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '10px',
                minWidth: '300px'
            }}>
                {/* Крестик в правом верхнем углу */}
                <button
                    onClick={() => toast.dismiss(t.id)}
                    style={{
                        position: 'absolute',
                        top: '0px',
                        right: '0px',
                        background: 'none',
                        border: 'none',
                        fontSize: '18px',
                        cursor: 'pointer',
                        color: '#666',
                        lineHeight: '1'
                    }}
                    title="Закрыть"
                >
                    ×
                </button>

                {/* Основной контент */}
                <div className={"text-danger-500"} style={{
                    fontWeight: 'bold',
                    paddingRight: '20px' // отступ от крестика
                }}>
                    ❌ Синхронизация не работает
                </div>
                <div style={{
                    fontSize: '14px',
                    color: '#666',
                    lineHeight: '1.4'
                }}>
                    Не удалось восстановить подписку!
                </div>

                {/* Кнопка перезагрузки */}
                <Button
                    color={"danger"}
                    className={"!w-[150px]"}
                    onClick={() => {
                    toast.dismiss(t.id);
                    setTimeout(() => {
                        setFirstLoadFadeIn(false);
                        setTimeout(() => location.reload(), 500);
                    }, 500);
                }}
                >
                    Перегрузить
                </Button>
            </div>
        ), {
            duration: Infinity,
            position: "top-right",
            className: "!bg-content2"
        });
    }

    return null;
};
