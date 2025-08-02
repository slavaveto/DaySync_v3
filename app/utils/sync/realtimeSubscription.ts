// utils/realtimeSubscription.ts
import {supabase} from "@/app/utils/dbase/supabaseClient";

let channelRef: any = null;

export async function subscribeToItems(
    user_id: string,
    onPayload: (payload: any) => void
) {
    const existingChannel = supabase.getChannels().find(
        (ch) => ch.topic === "realtime:items_sync"  // ← правильно!
    );
    //console.log("📡 Channels before subscribe:", supabase.getChannels().map(ch => ch.topic));
    if (existingChannel) {
        await supabase.removeChannel(existingChannel);
        // console.log("🛑 Старая подписка отключена");
    }

    const channel = supabase
        .channel("items_sync")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "items",
            },
            (payload: any) => {
                const incomingUserId =
                    (payload.new as Record<string, any>)?.user_id ||
                    (payload.old as Record<string, any>)?.user_id;

                if (incomingUserId !== user_id) {
                    // 🟥 Игнорируем события не нашего пользователя
                    return;
                }

                onPayload(payload); // ✅ Передаём наружу только события своего user_id
            }
        )
        .subscribe();

    channelRef = channel;
    // console.log(`✅ Подписка активирована для user_id: ${user_id}`);
}

export async function unsubscribeFromItems() {
    const existingChannel = supabase.getChannels().find(
        (ch) => ch.topic === "realtime:items_sync"
    );

    if (existingChannel) {
        await supabase.removeChannel(existingChannel);
        console.log("❌ Подписка отключена");
        channelRef = null;
    } else {
        console.log("🔎 Нет активной подписки");
    }
}