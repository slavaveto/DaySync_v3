import React, {useState, useEffect, useRef} from "react";
import {MdCloudUpload} from "react-icons/md";
import clsx from "clsx";
import {Spinner} from "@heroui/react";
import toast from "react-hot-toast";
import {supabase} from "@/app/utils/dbase/supabaseClient";
import {compareWithRemote} from '@/app/utils/sync/compareWithRemote';
import {useDevice} from '@/app/utils/providers/MobileDetect';

import {useMainContext} from "@/app/context";

export const UploadButton = () => {
    const {
        items, setItems, hasLocalChanges, setHasLocalChanges, isUserActive,
        syncTimeoutProgress, setSyncTimeoutProgress, isUploadingData, setIsUploadingData, userId,
    } = useMainContext();

    const {forcedMode, isMobile, isTablet, isDesktop} = useDevice();

    const [wasSyncedOk, setWasSyncedOk] = useState(false);
    const user_id = userId;

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutStartRef = useRef<number | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastHasLocalChanges = useRef<boolean>(hasLocalChanges);
    const currentStepRef = useRef(0);

    useEffect(() => {
        const totalDuration = 3000;
        const delayBeforeCountdown = 1000; // 🟢 вот эта задержка даст 100% отрисоваться!
        const realCountdownStart = Date.now() + delayBeforeCountdown// 🟡 учли задержку!

        // const stepInterval = 250; // каждые полсекунды
        // const steps = totalDuration / stepInterval; // 6 шагов
        //
        // const startCountdown = (startTime: number) => {
        //     timeoutStartRef.current = startTime;
        //     currentStepRef.current = -1; // 🟢 сбрасываем шаг при старте
        //
        //     progressIntervalRef.current = setInterval(() => {
        //         const elapsed = Date.now() - timeoutStartRef.current!;
        //         const newStep = Math.floor(elapsed / stepInterval);
        //         const progress = Math.max(1, 100 - Math.round((newStep / steps) * 100));
        //
        //         if (currentStepRef.current !== newStep) {
        //             currentStepRef.current = newStep;
        //             setSyncTimeoutProgress(progress);
        //         }
        //
        //         if (elapsed >= totalDuration) {
        //             clearInterval(progressIntervalRef.current!);
        //             progressIntervalRef.current = null;
        //
        //             setTimeout(() => {
        //                 handleSync();
        //             }, 200); // 🟢 задержка для дорисовки
        //         }
        //     }, 50);
        // };

        const startCountdown = (startTime: number) => {
            timeoutStartRef.current = startTime;
            currentStepRef.current = -1; // 🟢 сбрасываем шаг при старте
            progressIntervalRef.current = setInterval(() => {
                const elapsed = Date.now() - timeoutStartRef.current!;

                const smoothProgress = Math.max(1, 100 - (elapsed / totalDuration) * 100);
                setSyncTimeoutProgress(smoothProgress);

                if (elapsed >= totalDuration) {
                    clearInterval(progressIntervalRef.current!);
                    progressIntervalRef.current = null;

                    setTimeout(() => {
                        handleSync();
                    }, 200); // 🟢 задержка для дорисовки
                }
            }, 50);
        };

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }

        if (isUploadingData) {
            setSyncTimeoutProgress(0);
            timeoutStartRef.current = null;
            return;
        }

        const justAppeared = hasLocalChanges && !lastHasLocalChanges.current;
        lastHasLocalChanges.current = hasLocalChanges;

        if (!isUserActive && !hasLocalChanges) {
            setSyncTimeoutProgress(0);
            timeoutStartRef.current = null;
            return;
        }

        if (isUserActive) {
            setSyncTimeoutProgress(100);
            timeoutStartRef.current = null;
            return;
        }

        if (justAppeared) {
            setSyncTimeoutProgress(100);
            timeoutStartRef.current = null;

            timeoutRef.current = setTimeout(() => {
                startCountdown(realCountdownStart);
            }, delayBeforeCountdown);

            return;
        }

        // 🟢 Обычный запуск:
        startCountdown(Date.now());

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };

    }, [hasLocalChanges, isUploadingData, isUserActive]);

    const handleSync = async () => {
        if (isUploadingData || !hasLocalChanges || !user_id) {
            return;
        }

        setSyncTimeoutProgress(0);
        timeoutStartRef.current = null;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const now = new Date().toISOString();
        setIsUploadingData(true);

        // 1. Отправляем только те, у кого updated_at > synced_at
        const toUpload = items
            .filter(item => !item.synced_at || new Date(item.updated_at) > new Date(item.synced_at))
            .map(({justInserted, fadeInDuration, ...clean}) => clean)

        const toDelete = items.filter(item => item.is_deleted);

        setHasLocalChanges(false);

        let inserted = 0;
        let updated = 0;
        //let deleted = 0;

        // 2. Отправка новых/обновлённых
        if (toUpload.length > 0) {
            const {error: upsertError, data: upsertedData} = await supabase
                .from("items")
                .upsert(toUpload, {onConflict: "id"})
                .select(); // нужно, чтобы получить свежие записи

            if (upsertError) {
                console.error("⛔ Ошибка при upsert:");
                console.error("Код ошибки:", upsertError.code);
                console.error("Сообщение:", upsertError.message);
                console.error("Детали:", upsertError.details);
                console.error("Подсказка:", upsertError.hint);
                console.error("Данные для загрузки:", toUpload);
                console.error("Количество записей:", toUpload.length);

                setIsUploadingData(false);
                return;
            }

            if (upsertedData) {
                upsertedData.forEach(remote => {
                    const wasLocal = items.find(i => i.id === remote.id && !i.synced_at);
                    if (wasLocal) inserted++;
                    else updated++;
                });
            }
        }

        // 3. Удаление ПОЛНОЕ
        // if (toDelete.length > 0) {
        //     const idsToDelete = toDelete.map(i => i.id);
        //     const {error: deleteError} = await supabase
        //         .from("items")
        //         .delete()
        //         .in("id", idsToDelete);
        //
        //     if (deleteError) {
        //         console.error("⛔ Ошибка при удалении:", deleteError);
        //         setIsUploading(false);
        //         return;
        //     }
        //     deleted = idsToDelete.length;
        //     // ✅ Удаляем из локального состояния
        //     setItems(prev => prev.filter(item => !idsToDelete.includes(item.id)));
        // }

        // 4. Обновляем локальные элементы
        const updatedItems = items
            //.filter(item => !item.is_deleted)
            .map(item => {
                const needsUpdate =
                    !item.synced_at || new Date(item.updated_at) > new Date(item.synced_at);

                const {justInserted, fadeInDuration, ...clean} = item;

                // return needsUpdate
                //     ? {...clean, synced_at: now}
                //     : clean;
                return needsUpdate
                    ? {...clean, synced_at: now, sync_highlight: false}
                    : {...clean, sync_highlight: false};
            });

        setItems(updatedItems);

        setTimeout(async () => {
            setIsUploadingData(false);
            setWasSyncedOk(true);

            const {
                missingInLocal,
                missingInRemote,
                modified,
                modifiedDetails
            } = await compareWithRemote(updatedItems, user_id);

            toast.success((t) => (
                    <div className="flex flex-col ml-2 bg-content2 z-100">
                        <div className="font-semibold pb-2">Синхронизация завершена:</div>
                        <div className="flex flex-col gap-1">
                            {/*<div>Всего загружено: <span className="font-semibold pl-1">{inserted + updated}</span></div>*/}
                            <div>Загружено новых: <span className="font-semibold pl-1">{inserted}</span></div>
                            <div>Изменённых: <span className="font-semibold pl-1">{updated}</span></div>
                            {/*<div>🗑 Удалённых: <span className="font-bold pl-1">{deleted}</span></div>*/}

                            {(missingInLocal.length > 0 || missingInRemote.length > 0 || modified.length > 0) && (
                                <>
                                    <hr className="my-2"/>
                                    <div className="text-sm text-warning font-medium">Обнаружены расхождения:</div>

                                    {missingInRemote.length > 0 && (
                                        <div>Не загружены: <b>{missingInRemote.length}</b></div>
                                    )}
                                    {missingInLocal.length > 0 && (
                                        <div>Только в базе: <b>{missingInLocal.length}</b></div>
                                    )}
                                    {modified.length > 0 && (
                                        <div>
                                            Изменены: <b>{modified.length}</b>
                                            <ul className="pl-4 text-xs mt-1 list-disc text-warning">
                                                {modifiedDetails.slice(0, 5).map(({id, diffs}) => (
                                                    <li key={id}>
                                                        ID {id}: {Object.keys(diffs).join(", ")}
                                                    </li>
                                                ))}
                                                {modifiedDetails.length > 5 && (
                                                    <li>...ещё {modifiedDetails.length - 5}</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ),
                {
                    duration: 3000,
                    className: 'border border-divider !bg-content2 !text-foreground',
                    position: "bottom-center"
                }
            )

        }, 2000);
    };

    // НОВЫЙ эффект: слушаем power-status из Electron
    useEffect(() => {
        // подписываемся только если API доступен
        if (!(window as any).electron?.onPowerStatus) return;

        const unsubscribe = (window as any).electron.onPowerStatus(
            ({status}: { status: string; message: string }) => {
                // если уходим в сон или блокируем экран — форсим синк
                if ((status === "suspend" || status === "locked") &&
                    hasLocalChanges &&
                    !isUploadingData) {
                    console.log('🟢 поймал suspend/locked — сразу выгруждаем данные')
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

                    handleSync();
                }
            }
        );
        return () => {
            unsubscribe();
        };
    }, [hasLocalChanges, isUploadingData, handleSync]);





    useEffect(() => {
        const handleForceSync = () => {
            console.log('🔥 Принудительная синхронизация из активного окна');
            handleSync();
        };

        window.addEventListener('force-sync', handleForceSync);
        return () => window.removeEventListener('force-sync', handleForceSync);
    }, []);





    useEffect(() => {
        if (!isMobile) return;                // нужно только для iOS/Android PWA

        /** Если приложение уходит в фон – пытаемся синхронизировать сразу */
        const trySyncBeforeSleep = () => {
            // Safari/WebView на iOS сначала бросает visibilitychange → 'hidden',
            // затем через пару сотен миллисекунд выгружает JS-контекст.
            if (
                document.visibilityState === 'hidden' &&
                hasLocalChanges &&                // есть что отправить
                !isUploadingData                  // мы не в середине аплоада
            ) {
                /* мгновенно рвём таймеры, чтобы они не стартовали снова */
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

                handleSync();                     // 🔥 форс-аплоад
            }
        };

        /* iOS PWA надёжнее ловить обоими событиями */
        document.addEventListener('visibilitychange', trySyncBeforeSleep);
        window.addEventListener('pagehide', trySyncBeforeSleep);

        return () => {
            document.removeEventListener('visibilitychange', trySyncBeforeSleep);
            window.removeEventListener('pagehide', trySyncBeforeSleep);
        };
    }, [
        isMobile,
        hasLocalChanges,
        isUploadingData,
        handleSync,            // если вынесете в useCallback – просто добавьте сюда
    ]);

    const disabled = !hasLocalChanges || isUploadingData || isUserActive;

    const showButton = false;

    return (
        <>
            {!isMobile && showButton && (
                <button
                    className={clsx(
                        "inline-flex items-center justify-center",      // центрируем
                        " transition-opacity duration-200 will-change-[opacity]",
                        disabled && "!opacity-50",

                        hasLocalChanges
                            ? "text-warning !opacity-100"
                            : "text-default"
                    )}

                    onClick={handleSync}
                    disabled={disabled}
                >
                    {isUploadingData ? (
                        <Spinner size="sm" color={"warning"} className="w-[26px] h-[20px]"/>
                    ) : (
                        <MdCloudUpload
                            size={isMobile ? 26 : 22}
                            className={clsx("w-[26px] block leading-none translate-z-0",
                            )}
                        />
                    )}
                </button>
            )}
        </>
    );
};
