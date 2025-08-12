import {useRef, useState} from 'react';
import { useMainContext } from "@/app/context";
import { useAuth } from '@clerk/nextjs';
import { realtimeSubscription } from "./realtimeSubscription";
import { useReloadAllItems } from "./useReloadAllItems";
import type { ItemType } from "@/app/types";
import { log } from "@/app/init/logger";
import usePersistentState from "@/app/init/usePersistentState";

interface UseSetupSubscriptionProps {
    onPayloadRef: React.MutableRefObject<((payload: any) => void) | null>;

}

export const useSetupSubscription = ({
                                         onPayloadRef,

                                     }: UseSetupSubscriptionProps) => {

    const { userId, clearAllToasts } = useMainContext();
    const { getToken } = useAuth();
    const { reloadAllItems } = useReloadAllItems();

    const [isSettingUpSubscription, setIsSettingUpSubscription] = useState(false);


    const [deviceId] = usePersistentState<string>(
        "deviceId",
        `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );

    let isSetupInProgress = false;

    const setupSubscription = async (onComplete?: () => void) => {
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

            await realtimeSubscription(userId ?? "", token, (payload) => {
                const removed = payload.old as Partial<ItemType>;
                const incoming = (payload.new ?? payload.old) as Partial<ItemType>;

                if (onPayloadRef.current) {
                    onPayloadRef.current(payload);
                }

                // Для тестовых записей НЕ выполняем обычную логику синхронизации
                if (incoming?.title?.startsWith('__SUBSCRIPTION_TEST_')) {
                    return; // Выходим сразу, не обрабатываем как обычные данные
                }

                // Показываем ВСЕ тестовые записи
                // if (incoming?.title?.startsWith('__SUBSCRIPTION_TEST_')) {
                //     if (incoming.title === `__SUBSCRIPTION_TEST_${deviceId}__`) {
                //         // ЭТО НАША ЗАПИСЬ - обрабатываем
                //     } else {
                //         return; // выходим без обработки
                //     }
                // }

                if (payload.eventType === "DELETE") {
                    return;
                }

                if (!incoming?.id) return;

                clearAllToasts()
                log("Сработал Realtime!");

                if ((payload.eventType === "INSERT" || payload.eventType === "UPDATE") && incoming) {
                    const localItems = JSON.parse(localStorage.getItem("items") || "[]");
                    const local = localItems.find((item: ItemType) => item.id === incoming.id);

                    if (!userId) return;

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

            if (onComplete) {
                onComplete();
            }

            setIsSettingUpSubscription(false);
            isSetupInProgress = false;

            setTimeout(() => {

            }, 1000);
        }
    };

    return { setupSubscription };
};