import { realtimeSubscription } from "./realtimeSubscription";
import type { ItemType } from "@/app/types";
import { log } from "@/app/init/logger";

interface SetupSubscriptionParams {
    user_id: string;
    deviceId: string;
    getToken: (options: { template: string }) => Promise<string | null>;
    isSettingUpSubscription: boolean;
    setIsSettingUpSubscription: (value: boolean) => void;
    onPayloadRef: React.MutableRefObject<((payload: any) => void) | null>;
    reloadAllItems: (highlightId?: number) => void;
}

let isSetupInProgress = false;

export const setupSubscription = async (params: SetupSubscriptionParams) => {
    const {
        user_id,
        deviceId,
        getToken,
        isSettingUpSubscription,
        setIsSettingUpSubscription,
        onPayloadRef,
        reloadAllItems
    } = params;

    const callId = Math.random().toFixed(3);

    if (isSettingUpSubscription) {
        return;
    }

    isSetupInProgress = true;
    setIsSettingUpSubscription(true);

    try {
        const token = await getToken({ template: 'supabase' });
        if (!token) {
            setIsSettingUpSubscription(false);
            return;
        }

        await realtimeSubscription(user_id, token, (payload) => {
            const removed = payload.old as Partial<ItemType>;
            const incoming = (payload.new ?? payload.old) as Partial<ItemType>;

            if (onPayloadRef.current) {
                onPayloadRef.current(payload);
            }

            // Тестовые записи
            if (incoming?.title?.startsWith('__SUBSCRIPTION_TEST_')) {
                if (incoming.title === `__SUBSCRIPTION_TEST_${deviceId}__`) {
                    // Наша запись
                } else {
                    return; // Чужая запись
                }
            }

            if (payload.eventType === "DELETE") {
                return;
            }

            if (!incoming?.id) return;

            if ((payload.eventType === "INSERT" || payload.eventType === "UPDATE") && incoming) {
                const localItems = JSON.parse(localStorage.getItem("items") || "[]");
                const local = localItems.find((item: ItemType) => item.id === incoming.id);

                if (!local) {
                    reloadAllItems(incoming.id);
                    return;
                }

                if (!incoming.updated_at || !local.updated_at) return;

                if (new Date(incoming.updated_at) > new Date(local.updated_at)) {
                    reloadAllItems(incoming.id);
                }
            }
        });

    } catch (error) {
        console.error("❌ Ошибка настройки подписки:", error);
    } finally {
        log.success("Подписка успешно настроена!");
        setTimeout(() => {
            setIsSettingUpSubscription(false);
            isSetupInProgress = false;
        }, 1000);
    }
};