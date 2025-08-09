import React, { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMainContext } from "@/app/context";
import { createAuthenticatedClient } from "@/app/init/supabaseClient";
import usePersistentState from "@/app/init/usePersistentState";
import type {ClientType, ItemType, SubTabType, TabType} from "@/app/types";

export default function DataInitializer() {
    const {
        userId, setUserId, setTabs, setSubtabs, items, setItems
    } = useMainContext();

    const { user } = useUser();
    const { getToken } = useAuth(); // Добавляем getToken

    const [isInitialized, setIsInitialized] = usePersistentState<boolean>(
        "isInitialized", false
    );

    // Устанавливаем userId при изменении user
    useEffect(() => {
        if (user && user.id && user.id !== userId) {
            setUserId(user.id);
        }
    }, [user, userId, setUserId]);

    // Если вдруг у нас нет ни одной записи, а мы уже пометили,
    // что инициализация прошла — сбросим, чтобы на следующем эффекте
    // syncUser() снова отработал полный загрузочный сценарий:
    useEffect(() => {
        if (isInitialized && items.length === 0) {
            setIsInitialized(false);
        }
    }, [isInitialized, items.length, setIsInitialized]);

    // Основная логика синхронизации пользователя
    useEffect(() => {
        async function syncUser() {
            if (!user || isInitialized) return;

            try {
                // Получаем JWT токен
                const token = await getToken({ template: 'supabase' });
                if (!token) {
                    console.error('Не удалось получить токен аутентификации');
                    return;
                }

                // Создаем аутентифицированный клиент
                const authClient = createAuthenticatedClient(token);

                const { data, error } = await authClient
                    .from('users')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!data) {
                    // Новый пользователь - создаем данные по умолчанию
                    const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
                    await authClient.from('users').insert([{ user_id: user.id, email }]);

                    await authClient.from('tabs').insert(initialTabs(user.id));
                    setTabs(initialTabs(user.id));
                    await authClient.from('subtabs').insert(initialSubTabs(user.id));
                    setSubtabs(initialSubTabs(user.id));
                    await authClient.from('items').insert(initialItems(user.id));
                    setItems(initialItems(user.id));

                } else {
                    // Существующий пользователь - загружаем всё из базы
                    const { data: dbTabs } = await authClient
                        .from('tabs')
                        .select('*')
                        .eq('user_id', user.id);

                    const { data: dbSubtabs } = await authClient
                        .from('subtabs')
                        .select('*')
                        .eq('user_id', user.id);

                    const { data: dbItems } = await authClient
                        .from('items')
                        .select('*')
                        .eq('user_id', user.id);

                    // Сохраняем в локальное состояние
                    if (dbTabs) setTabs(dbTabs);
                    if (dbSubtabs) setSubtabs(dbSubtabs);
                    if (dbItems) setItems(dbItems);
                }
                setIsInitialized(true);
            } catch (error) {
                console.error('Ошибка синхронизации пользователя:', error);
            }
        }

        syncUser();
    }, [user, isInitialized, setTabs, setSubtabs, setItems, setIsInitialized, getToken]);

    // Обработка выхода пользователя
    const prevUserRef = useRef(user);
    useEffect(() => {
        if (prevUserRef.current && !user) {
            // Был user, а стал null — logout!
            setUserId(null);
            setItems([]);
        }
        prevUserRef.current = user;
    }, [user, setUserId, setItems]);

    // Этот компонент ничего не рендерит, только управляет состоянием
    return null;
}


export function initialTabs(userId: string): TabType[] {
    const base = [
        {tab_key: "tab_1", label: "Home", order: 1},
        {tab_key: "tab_2", label: "Projs", order: 2},
        {tab_key: "tab_3", label: "Misc", order: 3}
    ];
    return base.map((item) => ({
        ...item,
        user_id: userId,
        updated_at: new Date().toISOString()
    }));
}


export function initialSubTabs(userId: string): SubTabType[] {
    const base = [
        //TAB_1 Main
        {subtab_key: "subtab_1", label: "Главная", order: 1, tab_key: "tab_1"},
        {subtab_key: "subtab_2", label: "Купить", order: 2, tab_key: "tab_1"},
        {subtab_key: "subtab_3", label: "Повторяющ.", order: 3, tab_key: "tab_1"},

        //TAB_2 Projs
        {subtab_key: "subtab_1", label: "DaySync", order: 1, tab_key: "tab_2"},
        {subtab_key: "subtab_2", label: "PsyHelp", order: 2, tab_key: "tab_2"},
        {subtab_key: "subtab_3", label: "Polyglot", order: 3, tab_key: "tab_2"},
        {subtab_key: "subtab_4", label: "Prompter", order: 4, tab_key: "tab_2"},

        //TAB_3 Misc
        {subtab_key: "subtab_1", label: "Tab1", order: 1, tab_key: "tab_3"},
        {subtab_key: "subtab_2", label: "Tab2", order: 2, tab_key: "tab_3", is_hidden: true},
    ];
    return base.map((item) => ({
        ...item,
        user_id: userId,
        updated_at: new Date().toISOString()
    }));
}


export function initialItems(userId: string): ItemType[] {
    const base = [
        {title: "task_1", type: "task", order: 1, list_key: "tab_1_subtab_1"},
        {title: "task_2", type: "task", order: 2, list_key: "tab_1_subtab_1"},
        {title: "task_3", type: "task", order: 3, list_key: "tab_1_subtab_1"},
        {title: "task_4", type: "task", order: 4, list_key: "tab_1_subtab_1"},
        {title: "", type: "gap", order: 5, list_key: "tab_1_subtab_1"},
        {title: "task_6", type: "task", order: 6, list_key: "tab_1_subtab_1"},
        {title: "task_7", type: "task", order: 7, list_key: "tab_1_subtab_1"},
        {title: "task_8", type: "task", order: 8, list_key: "tab_1_subtab_1"},
        {title: "task_9", type: "task", order: 9, list_key: "tab_1_subtab_1"},

        {title: "task_1", type: "task", order: 1, list_key: "tab_1_subtab_2"},
        {title: "task_2", type: "task", order: 2, list_key: "tab_1_subtab_2"},
        {title: "task_3", type: "task", order: 3, list_key: "tab_1_subtab_2"},
        {title: "task_4", type: "task", order: 4, list_key: "tab_1_subtab_2"},
        {title: "task_5", type: "task", order: 5, list_key: "tab_1_subtab_2"},
        {title: "task_6", type: "task", order: 6, list_key: "tab_1_subtab_2"},
        {title: "task_7", type: "task", order: 7, list_key: "tab_1_subtab_2"},

        {title: "task_1", type: "task", order: 1, list_key: "tab_1_subtab_3"},
        {title: "task_2", type: "task", order: 2, list_key: "tab_1_subtab_3"},
        {title: "task_3", type: "task", order: 3, list_key: "tab_1_subtab_3"},

        {title: "task_1", type: "task", order: 1, list_key: "tab_2_subtab_1"},
        {title: "task_2", type: "task", order: 2, list_key: "tab_2_subtab_1"},
        {title: "task_3", type: "task", order: 3, list_key: "tab_2_subtab_1"},

        {title: "task_1", type: "task", order: 1, list_key: "tab_3_subtab_1"},
        {title: "task_2", type: "task", order: 2, list_key: "tab_3_subtab_1"},
        {title: "task_3", type: "task", order: 3, list_key: "tab_3_subtab_1"},
    ];
    return base.map((item, idx) => ({
        ...item,
        id: Date.now() + idx,
        user_id: userId,
        updated_at: new Date().toISOString()
    })) as ItemType[];
}