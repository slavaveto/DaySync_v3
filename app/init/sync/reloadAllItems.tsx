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

        // Создаем аутентифицированный клиент
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

        log.success("Данные обновлены!");

        setTimeout(() => {
            setIsReloadingData(false);
        }, 500);
    }
};