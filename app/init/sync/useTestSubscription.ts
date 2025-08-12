import { toast } from "react-hot-toast";
import { useAuth } from '@clerk/nextjs';
import { useMainContext } from "@/app/context";
import { createAuthenticatedClient } from "@/app/init/dbase/supabaseClient";

interface UseTestSubscriptionProps {
    deviceId: string;
    onPayloadRef: React.MutableRefObject<((payload: any) => void) | null>;
}

export const useTestSubscription = ({ deviceId, onPayloadRef }: UseTestSubscriptionProps) => {
    const { userId } = useMainContext();
    const { getToken } = useAuth();

    const testSubscription = async (onComplete?: (success: boolean) => void): Promise<boolean> => {
        if (!userId) {
            if (onComplete) onComplete(false); // ✅ Колбек с false
            return false;
        }

        return new Promise(async (resolve) => {
            let testPassed = false;
            const originalHandler = onPayloadRef.current;

            const timeoutId = setTimeout(() => {
                if (!testPassed) {
                    toast.error("Подписка не отвечает", {
                        duration: 3000,
                        position: "bottom-center"
                    });
                    onPayloadRef.current = originalHandler;
                    resolve(false);
                }
            }, 8000);

            const testHandler = (payload: any) => {
                const incoming = payload.new as Record<string, any>;

                if (incoming?.title === `__SUBSCRIPTION_TEST_${deviceId}__` &&
                    incoming?.user_id === userId &&
                    !testPassed) {
                    testPassed = true;
                    clearTimeout(timeoutId);
                    onPayloadRef.current = originalHandler;

                    if (onComplete) onComplete(true); // ✅ Колбек с true
                    resolve(true);
                }
            };

            onPayloadRef.current = (payload) => {
                testHandler(payload);
                // if (originalHandler) originalHandler(payload);
            };

            setTimeout(async () => {
                try {
                    const token = await getToken({ template: 'supabase' });
                    if (!token) {
                        clearTimeout(timeoutId);
                        onPayloadRef.current = originalHandler;
                        resolve(false);
                        return;
                    }

                    const authClient = createAuthenticatedClient(token);
                    const testTitle = `__SUBSCRIPTION_TEST_${deviceId}__`;

                    const { data: existingTest } = await authClient
                        .from('items')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('title', testTitle)
                        .maybeSingle();

                    if (existingTest) {
                        const { error } = await authClient
                            .from('items')
                            .update({
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existingTest.id);

                        if (error) {
                            clearTimeout(timeoutId);
                            onPayloadRef.current = originalHandler;
                            resolve(false);
                        }
                    } else {
                        const testId = Date.now();

                        const { error } = await authClient
                            .from('items')
                            .insert([{
                                id: testId,
                                user_id: userId,
                                title: testTitle,
                                type: 'test',
                                is_done: true,
                                is_deleted: true,
                                order: 999999,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            }]);

                        if (error) {
                            clearTimeout(timeoutId);
                            onPayloadRef.current = originalHandler;
                            if (onComplete) onComplete(false); // ✅ Колбек с false
                            resolve(false);
                        }
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    onPayloadRef.current = originalHandler;
                    resolve(false);
                }
            }, 500);
        });
    };

    return { testSubscription };
};