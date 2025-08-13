import { useAuth } from '@clerk/nextjs';
import { useMainContext } from "@/app/context";
import { createAuthenticatedClient } from "@/app/init/dbase/supabaseClient";
import { compareWithRemote } from '@/app/init/sync/compareWithRemote';
import type { ItemType } from "@/app/types";

interface SyncResult {
    inserted: number;
    updated: number;
    missingInLocal: any[];
    missingInRemote: any[];
    modified: any[];
    modifiedDetails: any[];
}

interface UsePerformSyncProps {
    onComplete?: (result: SyncResult) => void;
}

export const usePerformUpload = ({ onComplete }: UsePerformSyncProps = {}) => {
    const {
        items, setItems, hasLocalChanges, setHasLocalChanges,
        isUploadingData, setIsUploadingData, userId,
        setSyncTimeoutProgress
    } = useMainContext();

    const { getToken } = useAuth();

    const performUpload = async (timeoutRef?: React.MutableRefObject<NodeJS.Timeout | null>) => {
        if (isUploadingData || !hasLocalChanges || !userId) {
            throw new Error('Синхронизация недоступна');
        }

        setSyncTimeoutProgress(0);
        if (timeoutRef?.current) clearTimeout(timeoutRef.current);

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

            setHasLocalChanges(false);

            let inserted = 0;
            let updated = 0;

            // 2. Отправка новых/обновлённых
            if (toUpload.length > 0) {
                const { error: upsertError, data: upsertedData } = await authClient
                    .from("items")
                    .upsert(toUpload, { onConflict: "id" })
                    .select();

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
            await new Promise(resolve => setTimeout(resolve, 1000));

            setIsUploadingData(false);

            const {
                missingInLocal,
                missingInRemote,
                modified,
                modifiedDetails
            } = await compareWithRemote(updatedItems, userId, token);

            // Создаем результат
            const result: SyncResult = {
                inserted,
                updated,
                missingInLocal,
                missingInRemote,
                modified,
                modifiedDetails
            };

            // ✅ Вызываем callback если есть
            if (onComplete) {
                onComplete(result);
            }

            return result;

        } catch (error) {
            setIsUploadingData(false);
            throw error;
        }
    };

    return { performUpload };
};