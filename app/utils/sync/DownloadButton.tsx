import React, {useEffect, useRef, useState} from "react";
import {MdCloudDownload} from "react-icons/md";
import clsx from "clsx";
import {supabase} from "@/app/utils/dbase/supabaseClient";
import type {ItemType} from "@/app/types";
import {useMainContext} from "@/app/context";
import {Spinner} from "@heroui/react";
import {toast} from "react-hot-toast";
import {PingWatcher} from "@/app/utils/sync/pingWatcher";
import {subscribeToItems, unsubscribeFromItems} from "@/app/utils/sync/realtimeSubscription";
import {useDevice} from "@/app/utils/providers/MobileDetect";

export const DownloadButton = () => {
    const {
        items, setItems, userId, isUserActive, isUploadingData, hasLocalChanges,
        isDownloadingData, setIsDownloadingData, setSyncHighlight
    } = useMainContext();

    const {forcedMode, isMobile, isTablet, isDesktop} = useDevice();

    const [wasSyncedOk, setWasSyncedOk] = useState(false);
    const user_id = userId;

    const onPayloadRef = useRef<((payload: any) => void) | null>(null);

    const setupSubscription = async () => {
        await subscribeToItems(user_id ?? "", (payload) => {
            // console.log("🎯 payload:", payload);

            if (onPayloadRef.current) {
                onPayloadRef.current(payload);  // ✅ всегда используешь актуальный handleIncomingPayload
            }

            const removed = payload.old as Partial<ItemType>;
            const incoming = (payload.new ?? payload.old) as Partial<ItemType>;

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
    };

    useEffect(() => {
        if (!user_id) return;
        setupSubscription(); // ✅ подписываемся
        reloadAllItems();    // ✅ первый раз загружаем
    }, [user_id]);

    useEffect(() => {
        // Ждём, пока user_id станет истинным
        if (!user_id) return;
        if (!(window as any).electron?.onPowerStatus) return;

        let didResume = false;  // флажок, что мы уже отреагировали на resumed

        const unsubscribe = (window as any).electron.onPowerStatus(
            ({ status }: { status: string; message: string }) => {
                // При уходе в сон или блокировке сбросим флажок
                if (status === "suspend" || status === "locked") {
                    didResume = false;
                    return;
                }
                // Если проснулись
                if (status === "resumed") {
                    didResume = true;
                    console.log("🟢 resume — обновляю");
                }
                // Если разблокировка, но до этого НЕ было resumed
                else if (status === "unlocked" && !didResume) {
                    console.log("🟢 unlock без предшествующего resume — обновляю");
                } else {
                    // либо unlock после resume, либо что-то ещё — игнорируем
                    return;
                }

                // общая логика синхрона
                requestAnimationFrame(() => {
                    if (hasLocalChanges || isUploadingData) return;
                    setupSubscription();
                    reloadAllItems();
                });
            }
        );

        return () => {
            unsubscribe();
        };
    }, [user_id, hasLocalChanges, isUploadingData]);


    useEffect(() => {
        if (!isMobile) return; // Только для мобилки!

        function onVisibilityChange() {
            if (document.visibilityState !== 'visible') return;

            requestAnimationFrame(() => {
                // Здесь state гарантированно актуальный
                if (hasLocalChanges || isUploadingData) return;

                setupSubscription();
                reloadAllItems();
            });
        }

        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [isMobile, user_id, hasLocalChanges, isUploadingData,]);

    const lastReloadTimeRef = useRef<number>(0); //
    const highlightBufferRef = useRef<number[]>([]);
    const highlightClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    async function reloadAllItems(highlightId?: number, onReloadComplete?: () => void) {
        const startTime = Date.now();
        setIsDownloadingData(true);

        try {
            const {data: freshItems, error} = await supabase
                .from("items")
                .select("*")
                .eq("user_id", user_id)
                .order("order", {ascending: true});

            const timeElapsed = Date.now() - startTime;
            const minTotal = 2000; // минимальная длительность всей операции
            const remaining = Math.max(0, minTotal - timeElapsed);

            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, remaining));
            }

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
                                        <div><span className="font-semibold">Данные обновлены!</span></div>
                                        <div>Загружено новых: <span className="font-semibold pl-1">{newCount}</span>
                                        </div>
                                        <div>Обновлено:<span className="font-semibold pl-1">{changedCount}</span></div>
                                    </div>,
                                    {
                                        duration: 2000,
                                        className: 'border border-divider !bg-content2 !text-foreground',
                                        position: "bottom-center"
                                    }
                                );
                            }, 0);

                            setSyncHighlight(updatedIds);
                            if (highlightClearTimeoutRef.current) {
                                clearTimeout(highlightClearTimeoutRef.current);
                            }
                            highlightClearTimeoutRef.current = setTimeout(() => {
                                setSyncHighlight([]);
                            }, 6000);

                        } else {

                            setTimeout(() => {
                                toast.success(
                                    <div className="flex flex-col ml-2 gap-1 bg-content2 z-100">
                                        <div><span className="font-semibold">Данные обновлены!</span></div>
                                    </div>,
                                    {
                                        duration: 2000,
                                        className: 'border border-divider !bg-content2 !text-foreground',
                                        position: "bottom-center"
                                    }
                                );
                            }, 0);
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

    return (
        <>
            {/*<PingWatcher*/}
            {/*    onWake={(onComplete) => {*/}
            {/*        if (!user_id) {*/}
            {/*            setWaitWake(() => true);   // ждём, когда user_id появится*/}
            {/*            return;*/}
            {/*        }*/}
            {/*        setWaitWake(false);*/}
            {/*        setupSubscription();*/}
            {/*        reloadAllItems(undefined, () => onComplete());*/}
            {/*    }}*/}
            {/*/>*/}

            {showButton ? (
                <button
                    className={clsx(
                        "transition-all duration-200 pointer-events-none opacity-50",
                        isDownloadingData
                            ? "text-default-400"
                            : wasSyncedOk
                                ? "text-success"
                                : "text-default-400"
                    )}
                    // disabled={isDownloadingData}
                >
                    {isDownloadingData ? (
                        <Spinner size="sm" color={"success"} className="w-[26px] h-[20px]"/>
                    ) : (
                        <MdCloudDownload
                            size={isMobile ? 26 : 22}
                            className="w-[26px]"
                        />
                    )}
                </button>
            ) : null}
        </>
    );
};