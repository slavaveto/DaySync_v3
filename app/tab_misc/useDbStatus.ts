// hooks/useDbStatus.ts
import { useState, useCallback, useRef } from 'react';

export type DbStatus = 'idle' | 'loading' | 'success' | 'error';

export const useDbStatus = () => {
    const [status, setStatus] = useState<DbStatus>('idle');
    const loadingStartTime = useRef<number | null>(null);

    const startLoading = useCallback(() => {
        setStatus('loading');
        loadingStartTime.current = Date.now();
    }, []);

    const setSuccess = useCallback(() => {
        const now = Date.now();
        const elapsed = loadingStartTime.current ? now - loadingStartTime.current : 0;
        const minLoadingTime = 2000; // 2 секунды минимум для спиннера

        if (elapsed < minLoadingTime) {
            // Если прошло меньше 2 секунд, ждем оставшееся время
            setTimeout(() => {
                setStatus('success');
                // Показываем галочку 3 секунды
                setTimeout(() => setStatus('idle'), 3000);
            }, minLoadingTime - elapsed);
        } else {
            setStatus('success');
            // Показываем галочку 3 секунды
            setTimeout(() => setStatus('idle'), 3000);
        }

        loadingStartTime.current = null;
    }, []);

    const setError = useCallback(() => {
        const now = Date.now();
        const elapsed = loadingStartTime.current ? now - loadingStartTime.current : 0;
        const minLoadingTime = 2000; // 2 секунды минимум для спиннера

        if (elapsed < minLoadingTime) {
            // Если прошло меньше 2 секунд, ждем оставшееся время
            setTimeout(() => {
                setStatus('error');
                // Показываем ошибку 3 секунды
                setTimeout(() => setStatus('idle'), 3000);
            }, minLoadingTime - elapsed);
        } else {
            setStatus('error');
            // Показываем ошибку 3 секунды
            setTimeout(() => setStatus('idle'), 3000);
        }

        loadingStartTime.current = null;
    }, []);

    const reset = useCallback(() => {
        setStatus('idle');
        loadingStartTime.current = null;
    }, []);

    return {
        status,
        startLoading,
        setSuccess,
        setError,
        reset,
        isLoading: status === 'loading',
        isSuccess: status === 'success',
        isError: status === 'error',
        isIdle: status === 'idle'
    };
};