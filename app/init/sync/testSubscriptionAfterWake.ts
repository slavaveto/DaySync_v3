import { toast } from "react-hot-toast";
import { createAuthenticatedClient } from "@/app/init/dbase/supabaseClient";

interface TestSubscriptionParams {
    user_id: string;
    deviceId: string;
    getToken: (options: { template: string }) => Promise<string | null>;
    onPayloadRef: React.MutableRefObject<((payload: any) => void) | null>;
}

export const testSubscriptionAfterWake = async (params: TestSubscriptionParams): Promise<boolean> => {
    const { user_id, deviceId, getToken, onPayloadRef } = params;

    if (!user_id) return false;

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
                incoming?.user_id === user_id &&
                !testPassed) {
                testPassed = true;
                clearTimeout(timeoutId);
                onPayloadRef.current = originalHandler;
                resolve(true);
            }
        };

        onPayloadRef.current = (payload) => {
            testHandler(payload);
            if (originalHandler) originalHandler(payload);
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
                    .eq('user_id', user_id)
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
                        .insert({
                            id: testId,
                            user_id: user_id,
                            title: testTitle,
                            type: 'system',
                            order: -1,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });

                    if (error) {
                        clearTimeout(timeoutId);
                        onPayloadRef.current = originalHandler;
                        resolve(false);
                    }
                }
            } catch (err) {
                clearTimeout(timeoutId);
                onPayloadRef.current = originalHandler;
                resolve(false);
            }
        }, 3000);
    });
};