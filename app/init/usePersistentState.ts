import { useState, useEffect } from "react";

export default function usePersistentState<T>(key: string, defaultValue: T | (() => T)) {
    const getValueForKey = (currentKey: string) => {
        if (typeof window === "undefined") return typeof defaultValue === "function" ? (defaultValue as () => T)() : defaultValue;

        try {
            const savedValue = localStorage.getItem(currentKey);
            if (savedValue !== null) {
                return JSON.parse(savedValue);
            }
        } catch (err) {
            console.warn(`⚠️ Ошибка парсинга JSON из localStorage для ключа "${currentKey}":`, err);
            localStorage.removeItem(currentKey);
        }

        return typeof defaultValue === "function" ? (defaultValue as () => T)() : defaultValue;
    };

    const [state, setState] = useState<T>(() => getValueForKey(key));

    // Обновляем состояние при смене ключа
    useEffect(() => {
        const newValue = getValueForKey(key);
        setState(newValue);
    }, [key]);

    // Сохраняем в localStorage при изменении состояния или ключа
    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState] as const;
}