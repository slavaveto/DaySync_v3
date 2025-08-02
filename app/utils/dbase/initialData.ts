import type { TabType, SubTabType, ItemType } from "../../types";

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
