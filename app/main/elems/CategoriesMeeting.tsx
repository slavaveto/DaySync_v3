// components/TitleHighlight.tsx
import React from "react";
import {PhoneCall, User, Users, MoreHorizontal} from "lucide-react";
import clsx from "clsx";
import {ICON_SIZES} from "@/app/main/droppable/dndStyles";
import type {ItemType} from "@/app/types";
import {useMainContext} from "@/app/context";
import {FaExclamation} from "react-icons/fa";


interface Props {
    item: ItemType;
}

export const CategoriesMeeting: React.FC<Props> = ({item}) => {

    const {items, setItems, setIsUserActive, setHasLocalChanges} = useMainContext();

    const categories = [
        {
            key: 'client',
            icon: User,
            icon_size: 0,
            noActiveColor: 'bg-orange-200',
            activeColor: 'bg-orange-300',
            hoverColor: 'hover:bg-orange-300'
        },
        {
            key: 'supervision',
            icon: User,
            icon_size: 0,
            noActiveColor: 'bg-yellow-200 dark:bg-yellow-200',
            activeColor: 'bg-yellow-400',
            hoverColor: 'hover:bg-yellow-300'
        },
        {
            key: 'group',
            icon: Users,
            icon_size: 0,
            noActiveColor: 'bg-sky-200',
            activeColor: 'bg-sky-400',
            hoverColor: 'hover:bg-sky-300'
        },
        {
            key: 'important',
            icon: FaExclamation,
            icon_size: -3,
            noActiveColor: 'bg-red-200',
            activeColor: 'bg-red-300',
            hoverColor: 'hover:bg-red-300'
        },
        {
            key: 'misc',
            icon: MoreHorizontal,
            icon_size: 0,
            noActiveColor: 'bg-green-200',
            activeColor: 'bg-green-400',
            hoverColor: 'hover:bg-green-400'
        },
    ] as const;

    const handleCategoryToggle = (categoryKey: 'client' | 'supervision' | 'group' | 'important' | 'misc') => {
        setIsUserActive(true);

        // Если категория уже выбрана - убираем, если нет - устанавливаем
        const newValue = item.meeting_category === categoryKey ? null : categoryKey;

        const now = new Date().toISOString();
        setItems((prev: any[]) => prev.map((i: any) =>
            i.id === item.id ? {
                ...i,
                sync_highlight: true,
                meeting_category: newValue,
                updated_at: now
            } : i
        ));

        setTimeout(() => {
            setIsUserActive(false);
            setHasLocalChanges(true);
        }, 300);
    };

    return (
        <div className="flex items-center gap-[6px]">
            {categories.map(({key, icon: Icon, activeColor, icon_size, noActiveColor, hoverColor}) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => handleCategoryToggle(key)}
                    className={clsx(
                        "flex w-[24px] h-[24px] text-default-400 rounded border border-default-300 items-center justify-center",
                        item.meeting_category === key ? `${activeColor} text-default-600 border-default-400` : noActiveColor,
                        item.meeting_category === key ? "" : hoverColor
                    )}
                >
                    <Icon
                        size={ICON_SIZES.dt + icon_size}
                        strokeWidth={
                            item.meeting_category === key ? 2.5 : 2
                        }
                        className={clsx(
                            "transition-colors ml-[0px]",


                        )}
                    />
                </button>
            ))}
        </div>
    );
};