import React, {useEffect, useRef, useState} from "react";
import {useMainContext} from "@/app/context";
import {log} from "@/app/init/logger";
import {useAuth} from '@clerk/nextjs';
import type {ItemType} from "@/app/types";

// import {reloadAllItems} from "./reloadAllItems";
// import {setupSubscription} from "./setupSubscription";
import {realtimeSubscription} from "./realtimeSubscription";
// import {testSubscriptionAfterWake} from "./testSubscriptionAfterWake";
import usePersistentState from "@/app/init/usePersistentState";
import {useDevice} from "@/app/init/providers/MobileDetect";
import {createAuthenticatedClient} from "@/app/init/dbase/supabaseClient";
import {toast} from "react-hot-toast";

export const SyncData = () => {

    const {
        items, setItems, userId, isUserActive, isUploadingData, hasLocalChanges, clearAllToasts,
        setIsDownloadingData, setSyncHighlight
    } = useMainContext();

    const {getToken} = useAuth();

    const {isMobile, isDesktop} = useDevice();

    const [wasSyncedOk, setWasSyncedOk] = useState(false);
    const user_id = userId;

    const onPayloadRef = useRef<((payload: any) => void) | null>(null);

    const [isSettingUpSubscription, setIsSettingUpSubscription] = useState(false);

    const [deviceId] = usePersistentState<string>(
        "deviceId",
        `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    let isSetupInProgress = false;

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

                    if (!local) {
                        reloadAllItems(incoming.id);
                        return;
                    }

                    if (!incoming.updated_at || !local.updated_at) return;

                    if (new Date(incoming.updated_at) > new Date(local.updated_at)) {
                        reloadAllItems(incoming.id);
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

    useEffect(() => {
        if (!user_id) return;
        log.start("Обновляем подписку...")
        setupSubscription(); // ✅ подписываемся

        setTimeout(() => {
            reloadAllItems();
        }, 1000);  // ✅ первый раз загружаем
    }, [user_id]);

    useEffect(() => {
        if (!user_id) return;
        if (!(window as any).electron?.onPowerStatus) return;

        let didResume = false;  // флажок, что мы уже отреагировали на resumed
        let powerEventTimeout: NodeJS.Timeout | null = null;

        const unsubscribe = (window as any).electron.onPowerStatus(
            ({status}: { status: string; message: string }) => {

                clearAllToasts()

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
                    log('RESUMED - компьютер проснулся, пауза 3сек...');
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

        setupSubscription()

        setTimeout(() => {
            reloadAllItems();
        }, 1000);

        // Тест подписки с настраиваемой задержкой
        setTimeout(async () => {
            console.log("🧪 Запускаем тест подписки...");
            // toast("🔍 Проверяю подписку...", {
            //     duration: 1500,
            //     position: "bottom-center"
            // });

            const isWorking = await testSubscriptionAfterWake();

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
    const highlightBufferRef = useRef<number[]>([]);
    const highlightClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [isReloadingData, setIsReloadingData] = useState(false);

    async function reloadAllItems(highlightId?: number, onReloadComplete?: () => void) {
        const startTime = Date.now();
        setIsDownloadingData(true);

        // 🔒 Защита от множественных вызовов
        if (isReloadingData) {
            // console.log("⚠️ Данные уже перезагружаются, пропускаем");
            return;
        }

        setIsReloadingData(true);
        // console.log("🔒 Заблокировали reloadAllItems");


        try {
            const token = await getToken({template: 'supabase'});
            if (!token) {
                console.error('Не удалось получить токен для загрузки данных');
                setIsDownloadingData(false);
                setIsReloadingData(false);
                return;
            }

            log.start("Обновляем данные...")

            // Создаем аутентифицированный клиент
            const authClient = createAuthenticatedClient(token);

            const {data: freshItems, error} = await authClient
                .from("items")
                .select("*")
                .eq("user_id", user_id)
                .order("order", {ascending: true});

            // const timeElapsed = Date.now() - startTime;
            // const minTotal = 2000; // минимальная длительность всей операции
            // const remaining = Math.max(0, minTotal - timeElapsed);
            //
            // if (remaining > 0) {
            //     await new Promise(resolve => setTimeout(resolve, remaining));
            // }

            setIsDownloadingData(false);

            if (!error && freshItems) {
                setWasSyncedOk(true);
                const now = new Date().toISOString();

                setItems(prevItems => {
                    const freshMap = new Map(freshItems.map(item => [item.id, item]));
                    const removedItems = prevItems.filter(i => !freshMap.has(i.id));
                    const filtered = prevItems.filter(i => freshMap.has(i.id));

                    let changedCount = 0;
                    const updated = filtered.map(local => {
                        const remote = freshMap.get(local.id);
                        if (!remote) return local;
                        const isChanged = new Date(remote.updated_at) > new Date(local.updated_at);
                        if (isChanged) changedCount++;
                        return isChanged ? {...remote, synced_at: now} : local;
                    });

                    const localIds = new Set(prevItems.map(i => i.id));
                    const newItems = freshItems
                        .filter(i => !localIds.has(i.id))
                        .map(i => ({...i, synced_at: now}));

                    // ======= ДОБАВЛЕНО: подсветка только новых и изменённых =======
                    if (highlightId === undefined) {
                        const updatedIds: number[] = [];

                        // Новые
                        for (const item of newItems) {
                            if (item.sync_highlight) {
                                updatedIds.push(item.id);
                            }
                        }

                        // Изменённые
                        filtered.forEach(local => {
                            const remote = freshMap.get(local.id);
                            if (
                                remote &&
                                remote.sync_highlight && // <--- только если sync_highlight выставлен
                                new Date(remote.updated_at) > new Date(local.updated_at)
                            ) {
                                updatedIds.push(remote.id);
                            }
                        });

                        if (updatedIds.length > 0) {

                            // Подсчёт отдельно новых и изменённых
                            const newCount = newItems.filter(item => item.sync_highlight).length;
                            const changedCount = updatedIds.length - newCount;

                            // Показываем тост только не в render
                            setTimeout(() => {
                                toast.success(
                                    <div className="flex flex-col ml-2 gap-1 bg-content2 z-100">
                                        <div>
                                            <span className="font-semibold">Данные обновлены!</span>
                                        </div>
                                        <div>Загружено новых: <span className="font-semibold pl-1">{newCount}</span>
                                        </div>
                                        <div>Обновлено:
                                            <span className="font-semibold pl-1">{changedCount}</span>
                                        </div>
                                    </div>,
                                    {
                                        duration: 2000,
                                        className: 'border border-divider !bg-content2 !text-foreground',
                                        position: "bottom-center"
                                    }
                                );
                            }, 1000);

                            setSyncHighlight(updatedIds);
                            if (highlightClearTimeoutRef.current) {
                                clearTimeout(highlightClearTimeoutRef.current);
                            }
                            highlightClearTimeoutRef.current = setTimeout(() => {
                                setSyncHighlight([]);
                            }, 6000);

                        } else {

                            setTimeout(() => {
                                console.log("Данные обновлены!")
                                log.success("Данные обновлены!")
                            }, 1000);
                        }
                    }

                    return [...updated, ...newItems].sort((a, b) => a.order - b.order);
                });

                const timeSinceLastReload = startTime - lastReloadTimeRef.current;
                lastReloadTimeRef.current = startTime;

                if (highlightId !== undefined) {
                    const idsToHighlight = Array.isArray(highlightId) ? highlightId : [highlightId];

                    // 🟢 Фильтруем те id, которые не имеют sync_highlight === true
                    const filteredIdsToHighlight = idsToHighlight.filter((id) => {
                        const item = freshItems.find((i) => i.id === id);
                        return item?.sync_highlight;
                    });

                    if (filteredIdsToHighlight.length === 0) {
                        return; // ❌ Если нечего подсвечивать — выходим сразу
                    }

                    if (timeSinceLastReload < 3000) {
                        // Копим id в буфере без дублей
                        highlightBufferRef.current = Array.from(new Set([
                            ...highlightBufferRef.current,
                            ...filteredIdsToHighlight,
                        ]));
                    } else {
                        // Если прошло больше 3 сек — сбрасываем буфер и начинаем заново
                        highlightBufferRef.current = filteredIdsToHighlight;
                    }

                    // Обновляем highlight
                    setSyncHighlight(highlightBufferRef.current);

                    // Сбрасываем через 5 секунд (таймер обновляем)
                    if (highlightClearTimeoutRef.current) {
                        clearTimeout(highlightClearTimeoutRef.current);
                    }
                    highlightClearTimeoutRef.current = setTimeout(() => {
                        highlightBufferRef.current = [];
                        setSyncHighlight([]);
                    }, 6000);
                }

                // 🟢 Вот тут ставим флаг, когда всё готово:
                if (onReloadComplete) {
                    onReloadComplete();
                }

            } else {
                console.error("❌ Ошибка при перезагрузке:", error);
            }

        } catch (err) {
            console.error("❌ Ошибка в reloadAllItems:", err);
        } finally {
            setIsDownloadingData(false);

            setTimeout(() => {
                setIsReloadingData(false);
                console.log("🔓 Разблокировали reloadAllItems");
            }, 500);
        }

    }

    const [waitWake, setWaitWake] = useState(false);
    useEffect(() => {
        if (waitWake && user_id) {
            setWaitWake(false);
            setupSubscription();
            reloadAllItems();
        }
    }, [waitWake, user_id]);

    const showButton = false;

    const testSubscriptionAfterWake = async (): Promise<boolean> => {
        if (!user_id) return false;

        //console.log("🧪 НАЧИНАЕМ ТЕСТ ПОДПИСКИ");
        //console.log("🔍 deviceId:", deviceId);
        //console.log("🔍 user_id:", user_id);

        return new Promise(async (resolve) => {
            let testPassed = false;
            const originalHandler = onPayloadRef.current;

            const timeoutId = setTimeout(() => {
                if (!testPassed) {
                    //console.log("❌ Тест подписки провален - таймаут");
                    //console.log("❌ Ожидали событие для:", `__SUBSCRIPTION_TEST_${deviceId}__`);
                    toast.error("Подписка не отвечает", {
                        duration: 3000,
                        position: "bottom-center"
                    });
                    onPayloadRef.current = originalHandler;
                    resolve(false);
                }
            }, 8000);

            const testHandler = (payload: any) => {
                //console.log("📨 ПОЛУЧИЛИ СОБЫТИЕ:", payload);
                const incoming = payload.new as Record<string, any>;
                //console.log("📨 incoming.title:", incoming?.title);
                //console.log("📨 ищем:", `__SUBSCRIPTION_TEST_${deviceId}__`);
                //console.log("📨 incoming.user_id:", incoming?.user_id);
                //console.log("📨 наш user_id:", user_id);

                // ✅ Реагируем ТОЛЬКО на свою тестовую запись
                if (incoming?.title === `__SUBSCRIPTION_TEST_${deviceId}__` &&
                    incoming?.user_id === user_id &&
                    !testPassed) {
                    //console.log("✅ СОВПАДЕНИЕ! Тест подписки успешен!");
                    testPassed = true;
                    clearTimeout(timeoutId);

                    // toast.success("Подписка проверена и работает!", {
                    //     duration: 2000,
                    //     position: "bottom-center"
                    // });

                    onPayloadRef.current = originalHandler;
                    resolve(true);
                } else {
                    //console.log("❌ НЕ СОВПАДЕНИЕ");
                }
            };

            onPayloadRef.current = (payload) => {
                testHandler(payload);
                if (originalHandler) originalHandler(payload);
            };

            setTimeout(async () => {
                try {

                    // Получаем JWT токен для тестовых операций
                    const token = await getToken({template: 'supabase'});
                    if (!token) {
                        console.error('Не удалось получить токен для тестирования подписки');
                        clearTimeout(timeoutId);
                        onPayloadRef.current = originalHandler;
                        resolve(false);
                        return;
                    }
                    // Создаем аутентифицированный клиент
                    const authClient = createAuthenticatedClient(token);

                    const testTitle = `__SUBSCRIPTION_TEST_${deviceId}__`;
                    //console.log("🔧 Ищем/создаем запись:", testTitle);

                    // Ищем существующую тестовую запись этого устройства
                    const {data: existingTest} = await authClient
                        .from('items')
                        .select('id')
                        .eq('user_id', user_id)
                        .eq('title', testTitle)
                        .maybeSingle();

                    //console.log("🔍 Результат поиска существующей записи:", existingTest);

                    if (existingTest) {
                        //console.log("🔧 ОБНОВЛЯЕМ существующую запись ID:", existingTest.id);
                        //console.log("🔧 Это означает что запись переиспользуется ✅");
                        // Обновляем существующую
                        const {error} = await authClient
                            .from('items')
                            .update({
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existingTest.id);

                        if (error) {
                            //console.log("❌ Ошибка обновления тестовой записи:", error);
                            clearTimeout(timeoutId);
                            onPayloadRef.current = originalHandler;
                            resolve(false);
                        } else {
                            //console.log("✅ Запись успешно обновлена");
                        }
                    } else {
                        //console.log("🔧 СОЗДАЕМ новую запись");
                        //console.log("🔧 Это первый раз для этого устройства");

                        // Генерируем ID как timestamp
                        const testId = Date.now();

                        // Создаем новую тестовую запись
                        const {error} = await authClient
                            .from('items')
                            .insert({
                                id: testId,  // ← используем timestamp как ID
                                user_id: user_id,
                                title: testTitle,
                                type: 'system',
                                order: -1,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            });

                        if (error) {
                            //console.log("❌ Ошибка создания тестовой записи:", error);
                            clearTimeout(timeoutId);
                            onPayloadRef.current = originalHandler;
                            resolve(false);
                        } else {
                            //console.log("✅ Запись успешно создана с ID:", testId);
                        }
                    }
                } catch (err) {
                    //console.log("❌ Ошибка в тесте:", err);
                    clearTimeout(timeoutId);
                    onPayloadRef.current = originalHandler;
                    resolve(false);
                }
            }, 3000);
        });
    };

    return null;
};
