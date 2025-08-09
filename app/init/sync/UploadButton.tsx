import React, { useState, useEffect, useRef } from "react";
import { MdCloudUpload } from "react-icons/md";
import clsx from "clsx";
import { Spinner } from "@heroui/react";
import toast from "react-hot-toast";
import { compareWithRemote } from '@/app/init/sync/compareWithRemote';
import { useDevice } from '@/app/init/providers/MobileDetect';
import { createAuthenticatedClient } from "@/app/init/supabaseClient";
import { useAuth } from '@clerk/nextjs';

import {CloudUpload, CloudDownload, SquareCheckBig, X} from "lucide-react";



import { useMainContext } from "@/app/context";

export const UploadButton = () => {
    const {
        items, setItems, hasLocalChanges, setHasLocalChanges, isUserActive,
        syncTimeoutProgress, setSyncTimeoutProgress, isUploadingData, setIsUploadingData, userId,
    } = useMainContext();

    const { getToken } = useAuth();

    const { forcedMode, isMobile, isTablet, isDesktop } = useDevice();

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

    // ... existing code до строки 136 ...

    const performSync = async () => {
        if (isUploadingData || !hasLocalChanges || !user_id) {
            throw new Error('Синхронизация недоступна');
        }

        setSyncTimeoutProgress(0);
        timeoutStartRef.current = null;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const now = new Date().toISOString();
        setIsUploadingData(true);

        try {
            // Получаем JWT токен
            const token = await getToken({ template: 'supabase' });
            if (!token) {
                throw new Error('Не удалось получить токен для синхронизации');
            }

            // Создаем аутентифицированный клиент
            const authClient = createAuthenticatedClient(token);

            // 1. Отправляем только те, у кого updated_at > synced_at
            const toUpload = items
                .filter(item => !item.synced_at || new Date(item.updated_at) > new Date(item.synced_at))
                .map(({ justInserted, fadeInDuration, ...clean }) => clean)

            const toDelete = items.filter(item => item.is_deleted);

            setHasLocalChanges(false);

            let inserted = 0; 
            let updated = 0;

            // 2. Отправка новых/обновлённых
            if (toUpload.length > 0) {
                const { error: upsertError, data: upsertedData } = await authClient
                    .from("items")
                    .upsert(toUpload, { onConflict: "id" })
                    .select(); // нужно, чтобы получить свежие записи

                if (upsertError) {
                    console.error("⛔ Ошибка при upsert:");
                    console.error("Код ошибки:", upsertError.code);
                    console.error("Сообщение:", upsertError.message);
                    console.error("Детали:", upsertError.details);
                    console.error("Подсказка:", upsertError.hint);
                    console.error("Данные для загрузки:", toUpload);
                    console.error("Количество записей:", toUpload.length);

                    throw new Error(`Ошибка загрузки: ${upsertError.message}`);
                }

                if (upsertedData) {
                    upsertedData.forEach(remote => {
                        const wasLocal = items.find(i => i.id === remote.id && !i.synced_at);
                        if (wasLocal) inserted++;
                        else updated++;
                    });
                }
            }

            // 4. Обновляем локальные элементы
            const updatedItems = items
                .map(item => {
                    const needsUpdate =
                        !item.synced_at || new Date(item.updated_at) > new Date(item.synced_at);

                    const { justInserted, fadeInDuration, ...clean } = item;

                    return needsUpdate
                        ? { ...clean, synced_at: now, sync_highlight: false }
                        : { ...clean, sync_highlight: false };
                });

            setItems(updatedItems);

            // Даем время для обновления UI перед сравнением
            await new Promise(resolve => setTimeout(resolve, 2000));

            setIsUploadingData(false);
            setWasSyncedOk(true);

            const {
                missingInLocal,
                missingInRemote,
                modified,
                modifiedDetails
            } = await compareWithRemote(updatedItems, user_id, token);

            // Возвращаем результат для отображения в тосте
            return {
                inserted,
                updated,
                missingInLocal,
                missingInRemote,
                modified,
                modifiedDetails
            };

        } catch (error) {
            setIsUploadingData(false);
            throw error;
        }
    };

    const handleSync = async () => {
        if (isUploadingData || !hasLocalChanges || !user_id) {
            return;
        }

        const syncPromise = performSync();

        toast.promise(
            syncPromise,
            {
                loading: 'Синхронизация данных...',
                success: (result) => (
                    <div className="flex flex-col ml-2 bg-content2 z-100">
                        <div className="font-semibold pb-2">Синхронизация завершена:</div>
                        <div className="flex flex-col gap-1">
                            <div>Загружено новых: <span className="font-semibold pl-1">{result.inserted}</span></div>
                            <div>Изменённых: <span className="font-semibold pl-1">{result.updated}</span></div>

                            {(result.missingInLocal.length > 0 || result.missingInRemote.length > 0 || result.modified.length > 0) && (
                                <>
                                    <hr className="my-2" />
                                    <div className="text-sm text-warning font-medium">Обнаружены расхождения:</div>

                                    {result.missingInRemote.length > 0 && (
                                        <div>Не загружены: <b>{result.missingInRemote.length}</b></div>
                                    )}
                                    {result.missingInLocal.length > 0 && (
                                        <div>Только в базе: <b>{result.missingInLocal.length}</b></div>
                                    )}
                                    {result.modified.length > 0 && (
                                        <div>
                                            Изменены: <b>{result.modified.length}</b>
                                            <ul className="pl-4 text-xs mt-1 list-disc text-warning">
                                                {result.modifiedDetails.slice(0, 5).map(({ id, diffs }) => (
                                                    <li key={id}>
                                                        ID {id}: {Object.keys(diffs).join(", ")}
                                                    </li>
                                                ))}
                                                {result.modifiedDetails.length > 5 && (
                                                    <li>...ещё {result.modifiedDetails.length - 5}</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ),                error: (err) => `Ошибка: ${err.message}`,
            },

            {
                // loading: {
                //     icon: (
                //         <CloudUpload
                //             strokeWidth={3}
                //             size={22}
                //             className="animate-pulse-icon text-warning-500"
                //         />
                //     ),
                // },
                // success: {
                //     duration: 4000,
                //     icon: (
                //         <SquareCheckBig
                //             strokeWidth={3}
                //             size={22}
                //             className="text-success-500"
                //         />
                //     ),
                // },
                // error: {
                //     icon: (
                //         <X
                //             strokeWidth={3}
                //             size={22}
                //             className="text-danger-500"
                //         />
                //     ),
                // },
                className: 'border border-divider !bg-content2 !text-foreground ',
                position: "bottom-center",
                style: {
                    width: '300px',
                    minHeight: '100px',
                },
            }
        );
    };

// ... existing code от строки 304 ...

    // НОВЫЙ эффект: слушаем power-status из Electron
    useEffect(() => {
        // подписываемся только если API доступен
        if (!(window as any).electron?.onPowerStatus) return;

        const unsubscribe = (window as any).electron.onPowerStatus(
            ({ status }: { status: string; message: string }) => {
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
                        <Spinner size="sm" color={"warning"} className="w-[26px] h-[20px]" />
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
