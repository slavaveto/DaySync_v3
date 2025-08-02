// components/TitleHighlight.tsx
import React, {useEffect, useRef, useState} from "react";
import {HelpCircle, CreditCard, AlertTriangle, PhoneCall, CircleDollarSign, Cross,
    ShoppingCart, PartyPopper, Hospital} from "lucide-react";
import clsx from "clsx";
import { ICON_SIZES } from "@/app/main/droppable/dndStyles";
import type {ItemType} from "@/app/types";
import {useMainContext} from "@/app/context";
import { RiCake2Line } from "react-icons/ri";
import { MdOutlineSportsTennis } from "react-icons/md";




interface Props {
    item: ItemType;
}

export const MeetingTags: React.FC<Props> = ({item}) => {

    const {items, setItems, setIsUserActive, setHasLocalChanges} = useMainContext();


    const categories = [
        {
            key: 'question',
            icon: HelpCircle,
            icon_size: 5,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'buy',
            icon: ShoppingCart,
            icon_size: 5,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'tennis',
            icon: MdOutlineSportsTennis,
            icon_size: 5,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'call',
            icon: PhoneCall,
            icon_size: 3,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'health',
            icon: Cross,
            icon_size: 3,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'birthday',
            icon: RiCake2Line,
            icon_size: 3,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
    ] as const;

    const handleCategoryToggle = (categoryKey: 'question' | 'buy' | 'health' | 'tennis' | 'call' | 'birthday') => {
        setIsUserActive(true);

        // Если категория уже выбрана - убираем, если нет - устанавливаем
        const newValue = item.meeting_tag === categoryKey ? null : categoryKey;

        const now = new Date().toISOString();
        setItems((prev: any[]) => prev.map((i: any) =>
            i.id === item.id ? {
                ...i,
                sync_highlight: true,
                meeting_tag: newValue,
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
            {categories.map(({ key, icon: Icon, activeColor, icon_size,  noActiveColor,  hoverColor }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => handleCategoryToggle(key)}
                    className="mr-[0px]"
                >
                    <Icon
                        size={ICON_SIZES.dt + icon_size}
                        {...(key !== "birthday" && {
                            strokeWidth: item.meeting_tag === key ? 2.5 : 2
                        })}
                        className={clsx(
                            "transition-colors ml-[0px]",
                            item.meeting_tag === key ? activeColor : noActiveColor,
                            item.meeting_tag === key ? "" : hoverColor
                        )}
                    />
                </button>
            ))}
        </div>
    );
};