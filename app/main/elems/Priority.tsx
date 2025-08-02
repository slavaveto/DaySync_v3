// components/TitleHighlight.tsx
import React from "react";
import {AlertCircle} from "lucide-react";
import clsx from "clsx";
import {ICON_SIZES} from "@/app/main/droppable/dndStyles";
import type {ItemType} from "@/app/types";
import {useMainContext} from "@/app/context";

interface Props {
    item: ItemType;
}

export const Priority: React.FC<Props> = ({item}) => {

    const {items, setItems, setIsUserActive, setHasLocalChanges} = useMainContext();

    const categories = [
        {
            key: 'very_important',
            icon: AlertCircle,
            icon_size: 5,
            noActiveColor: 'text-danger-200 dark:text-danger-200',
            activeColor: 'text-danger-500',
            hoverColor: 'hover:!text-danger-500 dark:hover:!text-danger-400'
        },
        {
            key: 'important',
            icon: AlertCircle,
            icon_size: 5,
            noActiveColor: 'text-orange-200 dark:text-orange-800',
            activeColor: 'text-orange-500',
            hoverColor: 'hover:!text-orange-500'
        },

    ] as const;

    const handleCategoryToggle = (categoryKey: 'very_important' | 'important') => {
        setIsUserActive(true);

        // Если категория уже выбрана - убираем, если нет - устанавливаем
        const newValue = item.task_priority === categoryKey ? null : categoryKey;

        const now = new Date().toISOString();
        setItems((prev: any[]) => prev.map((i: any) =>
            i.id === item.id ? {
                ...i,
                sync_highlight: true,
                task_priority: newValue,
                updated_at: now
            } : i
        ));

        setTimeout(() => {
            setIsUserActive(false);
            setHasLocalChanges(true);
        }, 300);
    };

    return (
        <div className="flex items-center gap-[5px]">
            {categories.map(({key, icon: Icon, icon_size, activeColor, noActiveColor, hoverColor}) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => handleCategoryToggle(key)}
                    className="mr-[0px]"
                >
                    <Icon
                        size={ICON_SIZES.dt + icon_size}
                        strokeWidth={
                            item.task_priority === key ? 2.5 : 2
                        }
                        className={clsx(
                            "transition-colors ml-[0px]",
                            item.task_priority === key ? activeColor : noActiveColor,
                            item.task_priority === key ? "" : hoverColor
                        )}
                    />
                </button>
            ))}
        </div>
    );
};