// components/TitleHighlight.tsx
import React, {useEffect, useRef, useState} from "react";
import {createPortal} from 'react-dom';
import clsx from "clsx";
import type {ItemType} from "@/app/types";
import {useMainContext} from "@/app/context";
import {Calendar} from "@heroui/react";
import {formatRelativeDate} from "@/app/main/utils/formatRelativeDate";

interface Props {
    item: ItemType;
    all_day_meetingChecked?: boolean;
}

export const DueDate: React.FC<Props> = ({item, all_day_meetingChecked}) => {

    const {items, setItems, setIsUserActive, setHasLocalChanges} = useMainContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeMode = item.is_highlighted ?? "reset";

    // Закрытие при клике вне
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Проверяем, что клик не по кнопкам внутри портала
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                // Проверяем, что клик не по элементам портала
                const portalElement = document.querySelector('[data-portal="title-highlight"]');
                if (portalElement && !portalElement.contains(target)) {
                    setIsUserActive(false);
                    setIsOpen(false);
                }
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const applyHighlight = (mode: "bold" | "red" | "both" | "reset") => {
        const fullItem = items.find(i => i.id === item.id);
        if (!fullItem) return;

        const updatedItem = {
            ...fullItem,
            is_highlighted: mode === "reset" ? undefined : mode,
            sync_highlight: true,
            updated_at: new Date().toISOString(),
        };

        setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
        setIsUserActive(false);
        setHasLocalChanges(true);
        setIsOpen(false);

    };

    const toggleDropdown = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        setIsUserActive(true);
    };

    const formatOptions: Array<{
        mode: "reset" | "bold" | "red" | "both";
        icon: string;
    }> = [
        {mode: "reset", icon: "T"},
        {mode: "bold", icon: "B"},
        {mode: "red", icon: "R"},
        {mode: "both", icon: "R"}
    ];

    return (
        <div className="relative flex items-center "
             ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                disabled={all_day_meetingChecked}
                className={clsx(
                    all_day_meetingChecked && "text-default-300"
                )}
            >
                {formatRelativeDate(item)}
                {/*<CalendarDays*/}
                {/*    size={ICON_SIZES.dt}*/}
                {/*    className={clsx(*/}
                {/*        "mr-[3px] text-gray-400 hover:text-primary-400 transition-colors",*/}
                {/*        "cursor-pointer"*/}
                {/*    )}*/}
                {/*/>*/}
            </button>

            {isOpen && createPortal(
                <div
                    data-portal="title-highlight"
                    className="fixed z-50"
                    style={{
                        top: dropdownRef.current ?
                            dropdownRef.current.getBoundingClientRect().top - 40 : 0,
                        right: dropdownRef.current ?
                            window.innerWidth - dropdownRef.current.getBoundingClientRect().left + 10 : 0,
                    }}
                >

                    <Calendar
                        className={clsx("w-full")}
                        // value={selectedDate as any}
                        // onChange={(date: DateValue) => {
                        //     setSelectedDate(date);
                        //     onSelect(date);
                        //     closePopup();
                        // }}
                        showMonthAndYearPickers
                        // visibleMonths={2}
                        firstDayOfWeek="mon"
                        aria-label="Выбор даты"
                        // minValue={today}
                        classNames={{
                            headerWrapper: clsx("px-0"),
                            gridHeaderRow: clsx("pb-1"),
                            gridHeaderCell: clsx("text-[14px]"),
                            base: clsx("border-1 shadow-lg"),
                        }}
                    />

                </div>,
                document.body
            )}
        </div>
    );
};