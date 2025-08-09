// utils/realtimeSubscription.ts
import { createAuthenticatedClient } from "@/app/init/dbase/supabaseClient";
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

let channelRef: RealtimeChannel | null = null;
let authClient: SupabaseClient | null = null;

export async function subscribeToItems(
    user_id: string,
    jwtToken: string,
    onPayload: (payload: any) => void
) {

    // console.log('🔐 Настройка realtime с JWT токеном:', jwtToken.substring(0, 50) + '...');
    // console.log("📡 subscribeToItems начинает работу для user_id:", user_id);

    // Создаем аутентифицированный клиент для realtime
    authClient = createAuthenticatedClient(jwtToken);

    // console.log('📡 Подписываемся на realtime для user_id:', user_id);


    const existingChannel = authClient.getChannels().find(
        (ch: RealtimeChannel) => ch.topic === "realtime:items_sync"
    );

    //console.log("📡 Channels before subscribe:", supabase.getChannels().map(ch => ch.topic));

    if (existingChannel) {
        await authClient.removeChannel(existingChannel);
        // console.log("🛑 Удаляем существующий канал:", existingChannel.topic);
    } else {
        // console.log("✅ Существующих каналов не найдено");
    }

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
                // console.log('🎯 Получено realtime событие:', payload.eventType, payload);
                // console.log("🎯 RAW PAYLOAD в subscribeToItems:", payload);
                // console.log("🎯 Event type:", payload.eventType);
                // console.log("🎯 New data:", payload.new);
                // console.log("🎯 Old data:", payload.old);

                const incomingUserId =
                    (payload.new as Record<string, any>)?.user_id ||
                    (payload.old as Record<string, any>)?.user_id;

                // console.log("🎯 incomingUserId:", incomingUserId);
                // console.log("🎯 наш user_id:", user_id);

                // console.log('👤 User ID в событии:', incomingUserId, 'ожидаем:', user_id);

                if (incomingUserId !== user_id) {

                    // console.log('🟥 Игнорируем событие чужого пользователя');
                    return;
                }
                // console.log("✅ Передаем событие в onPayload");
                onPayload(payload); // ✅ Передаём наружу только события своего user_id
            }
        )
        .subscribe((status, error) => {
            // console.log('📡 Статус realtime подписки:', status);
            if (error) {
                // console.error("❌ Subscription error:", error);
            }
        });

    channelRef = channel;
    // console.log(`✅ Подписка активирована для user_id: ${user_id}`);
}

export async function unsubscribeFromItems() {
    if (!authClient) return;

    const existingChannel = authClient.getChannels().find(
        (ch: RealtimeChannel) => ch.topic === "realtime:items_sync"
    );

    if (existingChannel) {
        await authClient.removeChannel(existingChannel);
        // console.log("❌ Подписка отключена");
        channelRef = null;
        authClient = null;
    } else {
        // console.log("🔎 Нет активной подписки");
    }
}