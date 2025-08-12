import {useEffect, useRef} from "react";
import {useMainContext} from "@/app/context";
import {log} from "@/app/init/logger";
import {useAuth} from '@clerk/nextjs';
import {toast} from "react-hot-toast";


import usePersistentState from "@/app/init/usePersistentState";
import {useDevice} from "@/app/init/providers/MobileDetect";

import {useSetupSubscription} from "./useSetupSubscription";
import {useTestSubscription} from "./useTestSubscription";
import {useReloadAllItems} from "./useReloadAllItems";
import {useNetworkMonitoring} from "./useNetworkMonitoring";

export const SyncData = () => {

    const {
        items, setItems, userId, isUserActive, isUploadingData, hasLocalChanges, clearAllToasts,
        setIsDownloadingData, setSyncHighlight
    } = useMainContext();

    const {getToken} = useAuth();

    const {isMobile, isDesktop} = useDevice();

    const user_id = userId;

    const onPayloadRef = useRef<((payload: any) => void) | null>(null);

    const [deviceId] = usePersistentState<string>(
        "deviceId",
        `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    const { isOnline, isSupabaseReachable, isFullyOnline, checkFullConnectivity } = useNetworkMonitoring({
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
                                    toast((t) => (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#dc2626' }}>
                                                ❌ Синхронизация не работает
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#666' }}>
                                                Не удалось восстановить синхронизацию данных после пробуждения
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                <button
                                                    onClick={() => {
                                                        toast.dismiss(t.id);
                                                        window.location.reload();
                                                    }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#dc2626',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Перезагрузить
                                                </button>
                                                <button
                                                    onClick={() => toast.dismiss(t.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#e5e7eb',
                                                        color: '#374151',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    ), {
                                        duration: Infinity,
                                        position: "top-right"
                                    });
                                }
                            });

                        }, 1000);

                    });

                }, 1000);
            });
        });


    };



    return null;
};
