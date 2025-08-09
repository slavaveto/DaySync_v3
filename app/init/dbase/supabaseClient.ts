import { createClient } from '@supabase/supabase-js';

// Получаем значения из переменных окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


// Функция для создания JWT-аутентифицированного клиента
export const createAuthenticatedClient = (jwtToken: string) => {
    return createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${jwtToken}`,
            },
        },
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
            timeout: 20000,
            heartbeatIntervalMs: 30000,
            reconnectAfterMs: function (tries: number) {
                return [1000, 2000, 5000, 10000][tries - 1] || 10000;
            },
        },
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        }
    });
};
