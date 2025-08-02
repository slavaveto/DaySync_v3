'use client';
import React from "react";
import {Checkbox} from "@heroui/react";
import clsx from "clsx";
import {useMainContext} from "@/app/context";
import type {ItemType} from "@/app/types";
import {recalculateOrder} from "@/app/utils/recalculateOrder";

interface Props {
    item: ItemType;
}

export const CheckBox = ({item}: Props) => {

    const {items, setItems, setIsUserActive, setHasLocalChanges} = useMainContext();

    const now = new Date().toISOString();

    const [checkboxChecked, setCheckboxChecked] = React.useState(!!item.is_checked);

    const handleCheckChange = (id: number) => {

        setItems(prev =>
            prev.map(i =>
                i.id === id ? {...i, sync_highlight: true, is_checked: !i.is_checked, updated_at: now} : i
            )
        );
        setTimeout(() => {
            setIsUserActive(false);
            setHasLocalChanges(true);
        }, 300);
    };

    const handleMarkAsDone = (id: number) => {
        const target = items.find((item) => item.id === id);
        if (!target) return;

        setTimeout(() => {
            setItems((prev) => {
                // 1. Отмечаем как Done
                const updated = prev.map((i) =>
                    i.id === id ? {...i, is_done: true, updated_at: now} : i
                );
                // 2. Пересчитываем только активные в originList
                const reordered = recalculateOrder(updated, target.list_key ?? "");

                setTimeout(() => {
                    setIsUserActive(false);
                    setHasLocalChanges(true);
                }, 300);

                return reordered;
            });
        }, 500);
    };

    const use_isChecked = true
    const iconSize = ""

    return (
        <>
            {item.is_repeated && use_isChecked ? (
                <Checkbox
                    size={"md"}
                    classNames={{
                        label: clsx("p-0 m-0"),
                        wrapper: clsx(`bg-background m-0 w-[${iconSize}] h-[${iconSize}]`),
                    }}
                    isSelected={checkboxChecked}
                    isDisabled={item.is_repeated}

                    onChange={val => {
                        setIsUserActive(true);
                        setCheckboxChecked(prev => !prev);
                        handleCheckChange(item.id)
                    }}
                />
            ) : (
                <Checkbox
                    size={"md"}
                    classNames={{
                        label: clsx("p-0 m-0"),
                        wrapper: clsx(`bg-background m-0 w-[${iconSize}] h-[${iconSize}]`),
                    }}
                    onChange={val => {
                        setIsUserActive(true);
                        setTimeout(() => handleMarkAsDone(item.id), 600);

                    }}
                />
            )}
        </>
    );
};