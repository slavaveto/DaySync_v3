// components/TitleHighlight.tsx
import React, {useEffect, useRef, useState} from "react";
import {
    HelpCircle, CreditCard, AlertTriangle, PhoneCall, CircleDollarSign,
    ShoppingCart, PartyPopper, DollarSign, RussianRuble
} from "lucide-react";
import clsx from "clsx";
import { ICON_SIZES } from "@/app/main/droppable/dndStyles";import type {ItemType} from "@/app/types";
import {useMainContext} from "@/app/context";
import { RiCake2Line } from "react-icons/ri";



interface Props {
    item: ItemType;
}

export const Categories: React.FC<Props> = ({item}) => {

    const {items, setItems, setIsUserActive, setHasLocalChanges} = useMainContext();


    const categories = [
        {
            key: 'question',
            icon: HelpCircle,
            icon_size: 2,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'buy',
            icon: ShoppingCart,
            icon_size: 2,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'pay',
            icon: CreditCard,
            icon_size: 2,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'monthly_pay',
            icon: DollarSign,
            icon_size: 2,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'ruble_pay',
            icon: RussianRuble,
            icon_size: 2,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'call',
            icon: PhoneCall,
            icon_size: 2,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
        {
            key: 'birthday',
            icon: RiCake2Line,
            icon_size: 2,
            noActiveColor: 'text-primary-200',
            activeColor: 'text-primary-500',
            hoverColor: 'hover:text-primary-500'
        },
    ] as const;

    const handleCategoryToggle = (categoryKey: 'question' | 'buy' | 'pay' | 'monthly_pay' | 'ruble_pay' | 'call' | 'birthday') => {
        setIsUserActive(true);

        // Если категория уже выбрана - убираем, если нет - устанавливаем
        const newValue = item.task_category === categoryKey ? null : categoryKey;

        const now = new Date().toISOString();
        setItems((prev: any[]) => prev.map((i: any) =>
            i.id === item.id ? {
                ...i,
                sync_highlight: true,
                task_category: newValue,
                updated_at: now
            } : i
        ));

        setTimeout(() => {
            setIsUserActive(false);
            setHasLocalChanges(true);
        }, 300);
    };

    return (
        <div className="flex items-center gap-[1px]">
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
                            strokeWidth: item.task_category === key ? 2.5 : 2
                        })}
                        className={clsx(
                            "transition-colors ml-[0px]",
                            item.task_category === key ? activeColor : noActiveColor,
                            item.task_category === key ? "" : hoverColor
                        )}
                    />
                </button>
            ))}
        </div>
    );
};