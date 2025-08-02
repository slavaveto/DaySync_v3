import React from 'react';
import clsx from 'clsx';
import {DraggableItem} from '@/app/main/droppable/DraggableItem';

interface MonthViewListProps {
    items: any[];
    list: string;
    onItemSelect?: (item: any) => void;
    onDaySelect?: (dayKey: string | null) => void;
    selectedItemId?: number | null;
    weeks: number;
}

export const MonthViewList = React.memo(({
                                             items,
                                             list,
                                             onItemSelect,
                                             onDaySelect,
                                             selectedItemId,
                                             weeks
                                         }: MonthViewListProps) => {


    const TWO_WEEKS_TYPE = 2;

    // Если weeks >= 3 и нет элементов — не рендерить
    if (!items.length && weeks >= TWO_WEEKS_TYPE) return null;

    // Для встреч с колонками используем абсолютное позиционирование
    if (list === "meetings" && items.some((item: any) => item.totalColumns > 1)) {
        // ... вся логика для meetings с колонками
        const groups: any[][] = [];
        const processed = new Set();

        items.forEach(item => {
            if (processed.has(item.id)) return;

            if (item.totalColumns > 1) {
                const group = items.filter(other =>
                    other.totalColumns === item.totalColumns &&
                    Math.abs(other.startMin - item.startMin) < 60
                );
                groups.push(group);
                group.forEach(g => processed.add(g.id));
            } else {
                groups.push([item]);
                processed.add(item.id);
            }
        });

        let currentTop = 0;

        return (
            <div
                className={clsx("relative mx-[2px]")}
                style={{minHeight: groups.length * 25}}
            >
                {groups.map((group, groupIndex) => {
                    const groupTop = currentTop;
                    currentTop += weeks === 5 ? 23 : 25;

                    return group.map(dayItem => {
                        const widthPercent = 100 / dayItem.totalColumns;
                        const leftPercent = dayItem.column * widthPercent;

                        return (
                            <div
                                key={dayItem.id}
                                style={{
                                    position: "absolute",
                                    left: `calc(${leftPercent}% + ${dayItem.column > 0 ? '2px' : '0px'})`,
                                    width: `calc(${widthPercent}% - 0px - ${dayItem.column > 0 ? '2px' : '0px'})`,
                                    top: groupTop,
                                    zIndex: 1,
                                }}
                            >
                                <DraggableItem
                                    dayItem={dayItem}
                                    onItemSelect={onItemSelect}
                                    isSelected={selectedItemId === dayItem.id}
                                    isNarrow={dayItem.totalColumns > 1}
                                />
                            </div>
                        );
                    });
                })}
            </div>
        );
    }

    const TASKS_PANEL_HEIGHT = 23 * (weeks === 1 ? 8 : 3) + 6;

    return (
        <div
            className={clsx("space-y-[3px] mx-[2px] mb-[6px]")}
            style={
                list !== "meetings" && weeks < TWO_WEEKS_TYPE
                    ? {minHeight: TASKS_PANEL_HEIGHT, maxHeight: TASKS_PANEL_HEIGHT, overflow: "auto"}
                    : undefined
            }
        >
            {items.map(dayItem => (
                <div key={dayItem.id}>
                    <DraggableItem
                        key={dayItem.id}
                        dayItem={dayItem}
                        onItemSelect={onItemSelect}
                        onDaySelect={onDaySelect}
                        isSelected={selectedItemId === dayItem.id}
                    />
                </div>
            ))}
        </div>
    );
});
