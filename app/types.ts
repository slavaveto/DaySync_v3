export interface TabType {
    id?: number;
    tab_key: string;

    label: string;
    order: number;
    is_hidden?: boolean;

    user_id: string;
}

export interface SubTabType {
    id?: number;
    subtab_key: string;

    label: string;
    order: number;
    is_hidden?: boolean;

    tab_key: string;
    user_id: string;
}

export interface ItemType {
    id: number;
    title: string;
    type: 'task' | 'gap' | 'group' | 'meeting' | 'note' | 'quick_notes'

    order: number;

    list_key: string;
    user_id: string;

    task_category?: 'question' | 'pay' | 'monthly_pay' | 'ruble_pay' | 'buy' | 'call' | null;
    show_subtasks_count?: boolean;
    task_priority?: 'important' | 'very_important' | null;

    updated_at: string;
    synced_at?: string;
    sync_highlight?: boolean;

    is_done?: boolean;

    notes?: string;
    notes_width?: number;

    is_highlighted?: "bold" | "red" | "both";

    due_date?: string;
    is_repeated?: boolean;
    is_checked?: boolean;

    meeting_time_start?: string;
    meeting_time_end?: string;
    all_day_meeting?: boolean;
    meeting_category?: 'client' | 'supervision' | 'group' | 'important' | 'misc' | null;
    meeting_tag?: 'question' | 'call' | null;

    meeting_paid?: boolean;
    meeting_notpaid?: boolean;

    meeting_canceled?: boolean;
    meeting_willbepaid?: boolean;

    subtasks?: SubTask[] | null;

    client_id?: number;

    is_alerted?: boolean;
    alert_time?: string;

    group_name?: string;
    group_color?: string;
    is_collapsed?: boolean;

    is_deleted?: boolean;

    justInserted?: boolean;
    fadeInDuration?: number;
}

export interface SubTask {
    id: number;
    title: string;
    is_done: boolean;
    order: number;
}

export interface ClientType {
    id: number;
    name: string;
    notes: string;

    meeting_day?: number;
    meeting_time?: string;

    meeting_type?: 'client' | 'supervision' | 'group' | null;

    every_two_weeks?: boolean;

    price: number;
    currency: string;
    payment_method?: 'pesos' | 'usd' | 'rubles' | 'paypal' | 'usdt' | null;

    payment_history?: {
        [monthKey: string]: {
            paid_meetings?: number;
            fixed?: boolean;
        };
    };

    past_meetings?: number;

    timezone?: string;
    timediff?: number;

    is_hidden?: boolean;

    duration_50min?: boolean;

    pay_per_session?: boolean;
    exclude_from_calculations?: boolean;

    url?: string;
    fixed_name?: string;
}

export const CATEGORY_COLOR: Record<string, string> = {
    client: "orange",
    supervision: "yellow",
    group: "sky",
    important: "red",
    misc: "green",
};