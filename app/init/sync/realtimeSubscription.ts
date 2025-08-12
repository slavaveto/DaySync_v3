// utils/realtimeSubscription.ts
import { createAuthenticatedClient } from "@/app/init/dbase/supabaseClient";
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// ✅ Глобальные переменные для отслеживания активных подписок
let activeChannels: RealtimeChannel[] = [];
let authClient: SupabaseClient | null = null;

export async function realtimeSubscription(
    user_id: string,
    jwtToken: string,
    onPayload: (payload: any) => void
) {
    console.log('🔐 Настройка realtime подписки для user_id:', user_id);

    // ✅ КРИТИЧНО: Сначала удаляем ВСЕ старые каналы
    console.log('🛑 Очищаем старые каналы, количество:', activeChannels.length);

    for (const oldChannel of activeChannels) {
        try {
            await oldChannel.unsubscribe();
            console.log('✅ Старый канал отписан:', oldChannel.topic);
        } catch (error) {
            console.warn('⚠️ Ошибка при отписке канала:', error);
        }
    }

    // Очищаем массив активных каналов
    activeChannels = [];

    // ✅ Создаем новый аутентифицированный клиент
    authClient = createAuthenticatedClient(jwtToken);

    // ✅ Дополнительная проверка: удаляем каналы из нового клиента тоже
    const existingChannels = authClient.getChannels().filter(
        (ch: RealtimeChannel) => ch.topic.includes("items_sync")
    );

    for (const existingChannel of existingChannels) {
        try {
            await authClient.removeChannel(existingChannel);
            console.log('🛑 Удален существующий канал из нового клиента:', existingChannel.topic);
        } catch (error) {
            console.warn('⚠️ Ошибка удаления существующего канала:', error);
        }
    }

    // ✅ Создаем новый канал
    console.log('📡 Создаем новую подписку...');

    const channel = authClient
        .channel("items_sync")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "items",
            },
            (payload: any) => {
                console.log('🎯 Получено realtime событие:', payload.eventType, 'для записи ID:', payload.new?.id || payload.old?.id);

                // ✅ Проверяем user_id
                const incomingUserId =
                    (payload.new as Record<string, any>)?.user_id ||
                    (payload.old as Record<string, any>)?.user_id;

                if (incomingUserId !== user_id) {
                    console.log('🟥 Игнорируем событие чужого пользователя:', incomingUserId);
                    return;
                }

                console.log('✅ Передаем событие в обработчик');
                onPayload(payload);
            }
        )
        .subscribe((status, error) => {
            console.log('📡 Статус realtime подписки:', status);
            if (error) {
                console.error("❌ Ошибка подписки:", error);
            } else if (status === 'SUBSCRIBED') {
                console.log('🟢 Подписка успешно активирована!');
            }
        });

    // ✅ ВАЖНО: Сохраняем ссылку на новый канал
    activeChannels.push(channel);

    console.log(`✅ Подписка настроена для user_id: ${user_id}, активных каналов: ${activeChannels.length}`);
}

// ✅ Дополнительная функция для принудительной очистки всех подписок
export async function clearAllSubscriptions() {
    console.log('🧹 Принудительная очистка всех подписок...');

    for (const channel of activeChannels) {
        try {
            await channel.unsubscribe();
        } catch (error) {
            console.warn('⚠️ Ошибка при очистке канала:', error);
        }
    }

    activeChannels = [];
    authClient = null;

    console.log('✅ Все подписки очищены');
}