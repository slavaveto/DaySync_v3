import React, {useEffect, useRef, useState} from "react";
import {useMainContext} from "@/app/context";
import {log} from "@/app/init/logger";
import {useAuth} from '@clerk/nextjs';
import type {ItemType} from "@/app/types";

import usePersistentState from "@/app/init/usePersistentState";
import {useDevice} from "@/app/init/providers/MobileDetect";

import {realtimeSubscription} from "./realtimeSubscription";
import {testSubscription} from "./testSubscription";
import {reloadAllItems} from "./reloadAllItems";

export const SyncData = () => {

    const {
        items, setItems, userId, isUserActive, isUploadingData, hasLocalChanges, clearAllToasts,
        setIsDownloadingData, setSyncHighlight
    } = useMainContext();

    const {getToken} = useAuth();

    const {isMobile, isDesktop} = useDevice();

    const [wasSyncedOk, setWasSyncedOk] = useState(false);
    const user_id = userId;

    let isSetupInProgress = false;

    const onPayloadRef = useRef<((payload: any) => void) | null>(null);

    const [isSettingUpSubscription, setIsSettingUpSubscription] = useState(false);

    const [deviceId] = usePersistentState<string>(
        "deviceId",
        `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );



    useEffect(() => {
        if (!user_id) return;

        const reloadParams = {
            user_id,
            getToken,
            setItems,
            setIsDownloadingData,
            setSyncHighlight,
            setWasSyncedOk,
            lastReloadTimeRef,
            highlightBufferRef,
            highlightClearTimeoutRef,
            isReloadingData,
            setIsReloadingData
        };

        reloadAllItems(reloadParams);

        log.start("Настраиваем подписку...")
        setupSubscription();


    }, [user_id]);

    useEffect(() => {
        if (!user_id) return;
        if (!(window as any).electron?.onPowerStatus) return;

        let didResume = false;  // флажок, что мы уже отреагировали на resumed
        let powerEventTimeout: NodeJS.Timeout | null = null;

        const unsubscribe = (window as any).electron.onPowerStatus(
            ({status}: { status: string; message: string }) => {

                clearAllToasts()

                log('RESUMED - компьютер проснулся, пауза 3сек...');
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
                    log.start('Начинаем проверку сети...');

                    const isNetworkOk = await checkNetworkConnectivity();

                    if (!isNetworkOk) {
                        log.warning('Сеть еще не восстановилась, ждем еще 5 секунд...');

                        setTimeout(async () => {
                            log.warning('Повторная проверка сети...');
                            const isNetworkOkRetry = await checkNetworkConnectivity();
                            if (isNetworkOkRetry) {
                                log.success('Сеть восстановлена после повтора!');
                            } else {
                                log.warning('Сеть все еще нестабильна, но продолжаем...');
                            }
                        }, 5000);

                    } else {
                        log.success('Сеть восстановлена сразу!');
                    }

                    log.start('Запускаем восстановление подписки...');
                    performSubscriptionRecovery();

                }, 3000);
            });
        return () => {
            unsubscribe();
        };
    }, [user_id, hasLocalChanges, isUploadingData]);

    // Функция восстановления подписки с тестом
    const performSubscriptionRecovery = () => {
        console.log("🚀 Запускаем восстановление подписки...");

        if (!user_id) {
            console.log("❌ user_id отсутствует, пропускаем восстановление");
            return;
        }

        // showSyncToast("Восстанавливаю синхронизацию после пробуждения...", 'loading');

        // Проверка локальных изменений
        if (hasLocalChanges || isUploadingData) {
            console.log("⏸️ Пропускаем восстановление - есть локальные изменения или идет загрузка");
            return;
        }

        const reloadParams = {
            user_id,
            getToken,
            setItems,
            setIsDownloadingData,
            setSyncHighlight,
            setWasSyncedOk,
            lastReloadTimeRef,
            highlightBufferRef,
            highlightClearTimeoutRef,
            isReloadingData,
            setIsReloadingData
        };
        reloadAllItems(reloadParams);

        setTimeout(() => {

            setupSubscription();

        }, 1000);

        // Тест подписки с настраиваемой задержкой
        setTimeout(async () => {
            console.log("🧪 Запускаем тест подписки...");
            log.start("Запускаем тест подписки...")
            // toast("🔍 Проверяю подписку...", {
            //     duration: 1500,
            //     position: "bottom-center"
            // });

            const testParams = {
                user_id,
                deviceId,
                getToken,
                onPayloadRef
            };

            const isWorking = await testSubscription(testParams);

            if (!isWorking) {
                console.log("❌ Тест подписки провален!");

                const shouldRestart = confirm(
                    "Не удалось восстановить синхронизацию данных после пробуждения. Перезагрузить приложение?"
                );

                if (shouldRestart) {
                    window.location.reload();
                }
            } else {
                console.log("✅ Тест подписки успешен!");
                log.success("Тест подписки успешен!")
                // log.success("Тест подписки успешен!")
            }
        }, 3000);
        // }, 0);
        // });
    };

    // Функция проверки доступности сети
    const checkNetworkConnectivity = async (): Promise<boolean> => {
        try {
            // Используем собственный Supabase API вместо Google
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
            // console.log("🌐 Supabase connectivity check:", response.status);
            return response.ok;
        } catch (error) {
            // console.log("❌ Supabase connectivity failed:", error);
            return false;
        }
    };

    const lastReloadTimeRef = useRef<number>(0); //


    const [isReloadingData, setIsReloadingData] = useState(false);
    const highlightBufferRef = useRef<number[]>([]);
    const highlightClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);


    const setupSubscription = async () => {



        const callId = Math.random().toFixed(3);
        // console.log(`🔌 setupSubscription ВХОД #${callId} - isSettingUpSubscription: ${isSettingUpSubscription}`);

        if (isSettingUpSubscription) {
            // console.log(`⚠️ setupSubscription #${callId} ЗАБЛОКИРОВАН - уже выполняется`);
            return;
        }

        isSetupInProgress = true; // ← сразу блокируем
        // console.log(`🔒 setupSubscription #${callId} БЛОКИРУЕМ флаг`);
        setIsSettingUpSubscription(true);
        // console.log("🔒 Заблокировали setupSubscription");

        try {
            // Получаем JWT токен для realtime подписки

            const token = await getToken({template: 'supabase'});
            if (!token) {
                // console.error('Не удалось получить токен для realtime подписки');
                setIsSettingUpSubscription(false);

                return;
            }

            await realtimeSubscription(user_id ?? "", token, (payload) => {

                // console.log("🎯 payload:", payload);
                // console.log("📡 Вызываем subscribeToItems...");
                // console.log("🎯 СОБЫТИЕ в setupSubscription:", payload.eventType, payload.new?.title);

                // ✅ ИГНОРИРОВАТЬ все тестовые записи
                const removed = payload.old as Partial<ItemType>;
                const incoming = (payload.new ?? payload.old) as Partial<ItemType>;

                if (onPayloadRef.current) {
                    onPayloadRef.current(payload);
                }

                // Показываем ВСЕ тестовые записи
                if (incoming?.title?.startsWith('__SUBSCRIPTION_TEST_')) {
                    // console.log("🧪 Это тестовая запись:", incoming.title);
                    // console.log("🧪 Наша запись:", `__SUBSCRIPTION_TEST_${deviceId}__`);

                    if (incoming.title === `__SUBSCRIPTION_TEST_${deviceId}__`) {
                        // console.log("✅ ЭТО НАША ЗАПИСЬ - обрабатываем");
                    } else {
                        // console.log("❌ ЭТО ЧУЖАЯ ЗАПИСЬ - игнорируем");
                        return; // выходим без обработки
                    }
                }

                if (payload.eventType === "DELETE") {
                    // const lastAction = [...actionLogRef.current]
                    //     .reverse()
                    //     .find(entry => entry.item.id === removed.id && entry.action === "Delete");
                    // if (!lastAction) {
                    //     reloadAllItems();
                    // }
                    // return;
                }

                if (!incoming?.id) return;

                if ((payload.eventType === "INSERT" || payload.eventType === "UPDATE") && incoming) {
                    const localItems = JSON.parse(localStorage.getItem("items") || "[]");
                    const local = localItems.find((item: ItemType) => item.id === incoming.id);

                    if (!user_id) return;

                    if (!local) {
                        // reloadAllItems(incoming.id);
                        const reloadParams = {
                            user_id,
                            getToken,
                            setItems,
                            setIsDownloadingData,
                            setSyncHighlight,
                            setWasSyncedOk,
                            lastReloadTimeRef,
                            highlightBufferRef,
                            highlightClearTimeoutRef,
                            isReloadingData,
                            setIsReloadingData
                        };

                        reloadAllItems(reloadParams, incoming.id);

                        return;
                    }

                    if (!incoming.updated_at || !local.updated_at) return;

                    if (new Date(incoming.updated_at) > new Date(local.updated_at)) {
                        // reloadAllItems(incoming.id);

                        const reloadParams = {
                            user_id,
                            getToken,
                            setItems,
                            setIsDownloadingData,
                            setSyncHighlight,
                            setWasSyncedOk,
                            lastReloadTimeRef,
                            highlightBufferRef,
                            highlightClearTimeoutRef,
                            isReloadingData,
                            setIsReloadingData
                        };

                        reloadAllItems(reloadParams, incoming.id);

                    }
                }
            });
            //console.log("✅ Подписка успешно настроена");
        } catch (error) {
            console.error("❌ Ошибка настройки подписки:", error);
        } finally {
            // Небольшая задержка перед разблокировкой
            log.success("Подписка успешно настроена!")
            setTimeout(() => {
                setIsSettingUpSubscription(false);
                isSetupInProgress = false;
            }, 1000);
        }

    };


    // const [waitWake, setWaitWake] = useState(false);
    // useEffect(() => {
    //     if (waitWake && user_id) {
    //         setWaitWake(false);
    //         const setupParams = {
    //             user_id,
    //             deviceId,
    //             getToken,
    //             isSettingUpSubscription,
    //             setIsSettingUpSubscription,
    //             onPayloadRef
    //         };
    //         setupSubscription(setupParams);
    //
    //         const reloadParams = {
    //             user_id,
    //             getToken,
    //             setItems,
    //             setIsDownloadingData,
    //             setSyncHighlight,
    //             setWasSyncedOk,
    //             lastReloadTimeRef,
    //             highlightBufferRef,
    //             highlightClearTimeoutRef,
    //             isReloadingData,
    //             setIsReloadingData
    //         };
    //
    //         reloadAllItems(reloadParams);
    //         // reloadAllItems();
    //     }
    // }, [waitWake, user_id]);



    return null;
};
