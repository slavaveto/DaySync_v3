import type {TabType, SubTabType, ItemType} from "@/app/types";


export function recalculateOrder(items: ItemType[],
                                 originList: string,
                                 activeId?: number ): ItemType[] {
    const now = new Date().toISOString();

    const reordered = items.map((item) => ({...item}));

    const related = reordered.filter(
        (item) =>
            item.list_key === originList &&
            !item.is_deleted &&
            !item.is_done
    )

    related.forEach((item, index) => {
        const newOrder = index + 1;

        // ✅ Только если порядок реально изменился — обновляем
        if (item.order !== newOrder) {
            item.order = newOrder;
            item.updated_at = now;

            // item.sync_highlight = item.id === activeId;

            item.sync_highlight =
                item.id === activeId
                    ? true
                    : item.sync_highlight && (!item.synced_at || item.updated_at > item.synced_at);
        }
    });

    return reordered;
}