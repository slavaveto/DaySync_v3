import React, { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMainContext } from "@/app/context";
import { supabase } from "@/app/utils/dbase/supabaseClient";
import { initialItems, initialSubTabs, initialTabs } from "@/app/utils/dbase/initialData";
import usePersistentState from "@/app/utils/usePersistentState";

export default function DataInitializer() {
    const {
        userId, setUserId, setTabs, setSubtabs, items, setItems
    } = useMainContext();

    const { user } = useUser();

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

            const { data, error } = await supabase
                .from('users')
                .select('user_id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!data) {
                // Новый пользователь - создаем данные по умолчанию
                const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
                await supabase.from('users').insert([{ user_id: user.id, email }]);

                await supabase.from('tabs').insert(initialTabs(user.id));
                setTabs(initialTabs(user.id));
                await supabase.from('subtabs').insert(initialSubTabs(user.id));
                setSubtabs(initialSubTabs(user.id));
                await supabase.from('items').insert(initialItems(user.id));
                setItems(initialItems(user.id));

            } else {
                // Существующий пользователь - загружаем всё из базы
                const { data: dbTabs } = await supabase
                    .from('tabs')
                    .select('*')
                    .eq('user_id', user.id);

                const { data: dbSubtabs } = await supabase
                    .from('subtabs')
                    .select('*')
                    .eq('user_id', user.id);

                const { data: dbItems } = await supabase
                    .from('items')
                    .select('*')
                    .eq('user_id', user.id);

                // Сохраняем в локальное состояние
                if (dbTabs) setTabs(dbTabs);
                if (dbSubtabs) setSubtabs(dbSubtabs);
                if (dbItems) setItems(dbItems);
            }
            setIsInitialized(true);
        }

        syncUser();
    }, [user, isInitialized, setTabs, setSubtabs, setItems, setIsInitialized]);

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