import React, { useState, useEffect, useRef } from "react";
import { MdCloudUpload } from "react-icons/md";
import clsx from "clsx";
import { Spinner } from "@heroui/react";
import toast from "react-hot-toast";
import { compareWithRemote } from '@/app/init/sync/compareWithRemote';
import { useDevice } from '@/app/init/providers/MobileDetect';
import { createAuthenticatedClient } from "@/app/init/dbase/supabaseClient";
import { useAuth } from '@clerk/nextjs';

import {CloudUpload, CloudDownload, SquareCheckBig, X} from "lucide-react";



import { useMainContext } from "@/app/context";
import {log} from "@/app/init/logger";
import {usePerformUpload} from "@/app/init/sync/usePerformUpload";

export const UploadData = () => {
    const {
        items, setItems, hasLocalChanges, setHasLocalChanges, isUserActive, clearAllToasts,
        syncTimeoutProgress, setSyncTimeoutProgress, isUploadingData, setIsUploadingData, userId,
    } = useMainContext();

    const { getToken } = useAuth();

    const { isMobile, isDesktop } = useDevice();

    const [wasSyncedOk, setWasSyncedOk] = useState(false);
    const user_id = userId;

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutStartRef = useRef<number | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastHasLocalChanges = useRef<boolean>(hasLocalChanges);
    const currentStepRef = useRef(0);


    const { performUpload } = usePerformUpload({
        onComplete: (result) => {
            const hasDiscrepancies =
                result.missingInLocal.length > 0 ||
                result.missingInRemote.length > 0 ||
                result.modified.length > 0;

            if (hasDiscrepancies) {
                log.warning("Данные синхронизированы! Есть расхождения с базой!");
            } else {
                log.success("Данные синхронизированы!");
            }
        }
    });


    useEffect(() => {
        const totalDuration = 3000;
        const delayBeforeCountdown = 1000; // 🟢 вот эта задержка даст 100% отрисоваться!
        const realCountdownStart = Date.now() + delayBeforeCountdown// 🟡 учли задержку!

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



    // const performSync = async () => {
    //     // ✅ Сначала проверяем сеть:
    //     if (!isFullyOnline) {
    //         log.warning("🔴 Нет связи - сохраняем локально");
    //         // Помечаем данные как "нужна синхронизация"
    //         markItemsForSync(items);
    //         return;
    //     }
    //
    //     // Синхронизируем только если есть сеть
    //     try {
    //         await uploadToServer();
    //         log.success("✅ Синхронизировано!");
    //     } catch (error) {
    //         log.error("❌ Ошибка синхронизации");
    //     }
    // };



    const handleSync = async () => {
        if (isUploadingData || !hasLocalChanges || !user_id) {
            return;
        }

        // const syncPromise = performSync();

        clearAllToasts()
        log.start("Синхронизация данных...");
        performUpload()



    };

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
