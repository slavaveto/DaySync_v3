// utils/compareWithRemote.ts
import { createAuthenticatedClient } from "@/app/init/dbase/supabaseClient";
import type { ItemType } from "@/app/types";

export async function compareWithRemote(
    localItems: ItemType[],
    user_id: string,
    jwtToken: string  // Добавляем JWT токен
): Promise<{
    missingInRemote: ItemType[];
    missingInLocal: ItemType[];
    modified: ItemType[];
    modifiedDetails: {
        id: number;
        diffs: Partial<Record<keyof ItemType, { local: any; remote: any }>>;
    }[];
}> {
    try {
        // Создаем аутентифицированный клиент
        const authClient = createAuthenticatedClient(jwtToken);

        const { data: remoteItems, error } = await authClient
            .from("items")
            .select("*")
            .eq("user_id", user_id);

        if (error || !remoteItems) {
            console.error("❌ Ошибка получения удалённых данных:", error);
            return {
                missingInRemote: [],
                missingInLocal: [],
                modified: [],
                modifiedDetails: [],
            };
        }

        const localMap = new Map(localItems.map(i => [i.id, i]));
        const remoteMap = new Map(remoteItems.map(i => [i.id, i]));

        const missingInRemote = localItems.filter(i => !remoteMap.has(i.id));
        const missingInLocal = remoteItems.filter(i => !localMap.has(i.id));

        const modified: ItemType[] = [];
        const modifiedDetails: {
            id: number;
            diffs: Partial<Record<keyof ItemType, { local: any; remote: any }>>;
        }[] = [];

        const fieldsToCompare: (keyof ItemType)[] = [
            "title", "notes", "is_highlighted", "type", "due_date", "is_repeated",
            "list_key", "is_done", "is_deleted", "order", "group_color",
            "notes_width", "is_collapsed"
        ];

        for (const local of localItems) {
            const remote = remoteMap.get(local.id);
            if (!remote) continue;

            const diffs: Partial<Record<keyof ItemType, { local: any; remote: any }>> = {};

            for (const field of fieldsToCompare) {
                const localValue = local[field] ?? null;
                const remoteValue = remote[field] ?? null;

                if (localValue !== remoteValue) {
                    diffs[field] = { local: localValue, remote: remoteValue };
                }
            }

            if (Object.keys(diffs).length > 0) {
                modified.push(local);
                modifiedDetails.push({ id: local.id, diffs });
            }
        }

        return { missingInRemote, missingInLocal, modified, modifiedDetails };
    } catch (error) {
        console.error("❌ Ошибка в compareWithRemote:", error);
        return {
            missingInRemote: [],
            missingInLocal: [],
            modified: [],
            modifiedDetails: [],
        };
    }
}