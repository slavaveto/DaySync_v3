import {useRef, useState} from 'react';
import { useMainContext } from "@/app/context";
import { useAuth } from '@clerk/nextjs';
import { createAuthenticatedClient } from "@/app/init/dbase/supabaseClient";
import { log } from "@/app/init/logger";


export const useReloadAllItems = () => {

    const {
        userId,
        setItems,
        setIsDownloadingData,
        setSyncHighlight
    } = useMainContext(); // ✅ Теперь можно!

    const { getToken } = useAuth();


    const [wasSyncedOk, setWasSyncedOk] = useState(false);
    const lastReloadTimeRef = useRef<number>(0); //
    const [isReloadingData, setIsReloadingData] = useState(false);
    const highlightBufferRef = useRef<number[]>([]);
    const highlightClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const reloadAllItems = async (highlightId?: number, onComplete?: () => void) => {
        if (!userId) return;

        const startTime = Date.now();
        setIsDownloadingData(true);

        // 🔒 Защита от множественных вызовов
        if (isReloadingData) {
            return;
        }

        setIsReloadingData(true);

        try {
            const token = await getToken({ template: 'supabase' });
            if (!token) {
                console.error('Не удалось получить токен для загрузки данных');
                setIsDownloadingData(false);
                setIsReloadingData(false);
                return;
            }

            log.start("Обновляем данные...");

            const authClient = createAuthenticatedClient(token);

            const { data: freshItems, error } = await authClient
                .from("items")
                .select("*")
                .eq("user_id", userId)
                .order("order", { ascending: true });

            setIsDownloadingData(false);

            if (!error && freshItems) {
                setWasSyncedOk(true);
                const now = new Date().toISOString();

                setItems(prevItems => {
                    const freshMap = new Map(freshItems.map(item => [item.id, item]));
                    const filtered = prevItems.filter(i => freshMap.has(i.id));

                    let changedCount = 0;
                    const updated = filtered.map(local => {
                        const remote = freshMap.get(local.id);
                        if (!remote) return local;
                        const isChanged = new Date(remote.updated_at) > new Date(local.updated_at);
                        if (isChanged) changedCount++;
                        return isChanged ? { ...remote, synced_at: now } : local;
                    });

                    const localIds = new Set(prevItems.map(i => i.id));
                    const newItems = freshItems
                        .filter(i => !localIds.has(i.id))
                        .map(i => ({ ...i, synced_at: now }));

                    return [...updated, ...newItems].sort((a, b) => a.order - b.order);
                });

                const timeSinceLastReload = startTime - lastReloadTimeRef.current;
                lastReloadTimeRef.current = startTime;

                if (highlightId !== undefined) {
                    const idsToHighlight = Array.isArray(highlightId) ? highlightId : [highlightId];
                    const filteredIdsToHighlight = idsToHighlight.filter((id) => {
                        const item = freshItems.find((i) => i.id === id);
                        return item?.sync_highlight;
                    });

                    if (filteredIdsToHighlight.length > 0) {
                        if (timeSinceLastReload < 3000) {
                            highlightBufferRef.current = Array.from(new Set([
                                ...highlightBufferRef.current,
                                ...filteredIdsToHighlight,
                            ]));
                        } else {
                            highlightBufferRef.current = filteredIdsToHighlight;
                        }

                        setSyncHighlight(highlightBufferRef.current);

                        if (highlightClearTimeoutRef.current) {
                            clearTimeout(highlightClearTimeoutRef.current);
                        }
                        highlightClearTimeoutRef.current = setTimeout(() => {
                            highlightBufferRef.current = [];
                            setSyncHighlight([]);
                        }, 6000);
                    }
                }


            } else {
                console.error("❌ Ошибка при перезагрузке:", error);
            }

        } catch (err) {
            console.error("❌ Ошибка в reloadAllItems:", err);
        } finally {
            setIsDownloadingData(false);
            setIsReloadingData(false);
            log.success("Данные обновлены!");
            if (onComplete) {
                onComplete();
            }
        }
    };

    return { reloadAllItems };
};