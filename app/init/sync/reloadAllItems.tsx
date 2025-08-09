import { createAuthenticatedClient } from "@/app/init/dbase/supabaseClient";
import type { ItemType } from "@/app/types";
import { toast } from "react-hot-toast";
import { log } from "@/app/init/logger";

interface ReloadAllItemsParams {
    user_id: string;
    getToken: (options: { template: string }) => Promise<string | null>;
    setItems: React.Dispatch<React.SetStateAction<ItemType[]>>;
    setIsDownloadingData: (value: boolean) => void;
    setSyncHighlight: (ids: number[]) => void;
    setWasSyncedOk: (value: boolean) => void;
    lastReloadTimeRef: React.MutableRefObject<number>;
    highlightBufferRef: React.MutableRefObject<number[]>;
    highlightClearTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
    isReloadingData: boolean;
    setIsReloadingData: (value: boolean) => void;
}

export const reloadAllItems = async (
    params: ReloadAllItemsParams,
    highlightId?: number,
    onReloadComplete?: () => void
) => {
    const {
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
    } = params;

    const startTime = Date.now();
    setIsDownloadingData(true);

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
            .eq("user_id", user_id)
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

                // Подсветка только новых и изменённых
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
                            remote.sync_highlight &&
                            new Date(remote.updated_at) > new Date(local.updated_at)
                        ) {
                            updatedIds.push(remote.id);
                        }
                    });

                    if (updatedIds.length > 0) {
                        const newCount = newItems.filter(item => item.sync_highlight).length;
                        const changedCount = updatedIds.length - newCount;

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
                            log.success("Данные обновлены!");
                        }, 1000);
                    }
                }

                return [...updated, ...newItems].sort((a, b) => a.order - b.order);
            });

            // Остальная логика подсветки...
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
        }, 500);
    }
};