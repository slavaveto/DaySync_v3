// components/TitleHighlight.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from 'react-dom';
import clsx from "clsx";
import type { ItemType } from "@/app/types";
import { useMainContext } from "@/app/context";
import {highlightColors} from "@/app/main/utils/highlightColors";


interface TitleHighlightProps {
    item: ItemType;
}
export const TitleHighlight: React.FC<TitleHighlightProps> = ({ item }) => {

    const { items, setItems, setIsUserActive, setHasLocalChanges } = useMainContext();
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

        setTimeout(() => {
            setIsUserActive(false);
            setHasLocalChanges(true);
            setIsOpen(false);
        }, 300);
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
        { mode: "reset", icon: "T" },
        { mode: "bold", icon: "B" },
        { mode: "red", icon: "R" },
        { mode: "both", icon: "R" }
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Кнопка форматирования */}
            <button
                onClick={toggleDropdown}
                className={clsx(
                    "w-[18px] h-[18px] rounded text-[14px] flex items-center justify-center transition-colors border",
                    activeMode === "reset"
                        ? "text-default-500 border-default-300 hover:bg-default-100"
                        : "border-primary-300 bg-primary-50",
                    isOpen && "bg-primary-100",
                    // Добавляем цвета форматирования
                    highlightColors({
                        is_highlighted: activeMode === "reset" ? undefined : activeMode
                    })
                )}
                title="Форматирование текста"
            >
                {activeMode === "bold" ? "B" :
                    activeMode === "red" ? "R" :
                        activeMode === "both" ? "R" : "T"}
            </button>

            {/* Выпадающий список - ряд иконок */}
            {isOpen && createPortal(
                <div
                    data-portal="title-highlight"
                    className="fixed bg-white border border-default-300 rounded-lg shadow-lg z-50 p-[5px]"
                    style={{
                        top: dropdownRef.current ?
                            dropdownRef.current.getBoundingClientRect().top - 40 : 0,
                        right: dropdownRef.current ?
                            window.innerWidth - dropdownRef.current.getBoundingClientRect().right : 0,
                    }}
                >
                    <div className="flex gap-2">
                        {formatOptions.map((option) => {
                            const isActive = activeMode === option.mode;
                            return (
                                <button
                                    key={option.mode}
                                    onClick={() => applyHighlight(option.mode as any)}
                                    className={clsx(
                                        "w-[20px] h-[20px] rounded text-xs flex items-center justify-center transition-colors border",
                                        isActive
                                            ? "bg-primary-100 border-primary-300 text-primary-600"
                                            : "hover:bg-default-100 border-default-200",
                                        highlightColors({
                                            is_highlighted: option.mode === "reset" ? undefined : option.mode
                                        })
                                    )}
                                >
                                    {option.icon}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};