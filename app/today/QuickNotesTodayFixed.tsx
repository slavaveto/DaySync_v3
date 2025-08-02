// components/QuickNotes.tsx
import React, {useEffect, useRef, useState} from 'react';
import {useMainContext} from "@/app/context";
import {useUser} from "@clerk/nextjs";
import usePersistentState from "@/app/utils/usePersistentState";
import clsx from "clsx";
import type {ItemType} from "@/app/types";
import {useWindowSize} from "@/app/utils/useWindowSize";

export function QuickNotesTodayFixed() {
    const {items, setItems, setHasLocalChanges, setIsUserActive} = useMainContext();
    const {user} = useUser();
    const [topPanelText, setTopPanelText] = usePersistentState('QuickNotesText', '');
    const [initialQuickNoteText, setInitialQuickNoteText] = useState('');
    const localRef = useRef<HTMLDivElement | null>(null);

    const {winHeight, winWidth} = useWindowSize();

    // Фиксированный ID для quick_notes
    const QUICK_NOTES_ID = 999999999;

    // При восстановлении заметок сохраняй исходное значение
    useEffect(() => {
        const quickNote = items.find(i => i.id === QUICK_NOTES_ID);
        if (quickNote) { // убрали проверку ?.notes
            setTopPanelText(quickNote.notes || ''); // используем fallback
            setInitialQuickNoteText(quickNote.notes || '');
        } else {
            // Если элемента вообще нет
            setTopPanelText('');
            setInitialQuickNoteText('');
        }
    }, [items, setTopPanelText]);

    // Синхронизация HTML с состоянием (как в InputTitle)
    useEffect(() => {
        const el = localRef.current;
        if (el) {
            if (el.innerHTML !== topPanelText) {
                el.innerHTML = topPanelText;
            }
        }
    }, [topPanelText]);

    // Функция сохранения в items
    const saveQuickNoteToItems = (html: string) => {
        if (!user) return;

        const now = new Date().toISOString();

        setItems(prev => {
            // Находим существующую quick_note
            const existingQuickNote = prev.find(i => i.id === QUICK_NOTES_ID);
            const filtered = prev.filter(i => i.id !== QUICK_NOTES_ID);

            const quickNoteItem: ItemType = {
                id: existingQuickNote?.id || QUICK_NOTES_ID,
                type: "quick_notes",
                title: "quick_notes",
                list_key: "inbox",
                user_id: user.id,
                order: 0,
                updated_at: now,
                notes: html,
            };
            return [quickNoteItem, ...filtered];
        });
        setHasLocalChanges(true);
    };

    // Функция для применения/снятия bold (как в InputTitle с execCommand)
    const toggleBold = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return; // нет выделения

        // Используем document.execCommand как в InputTitle
        document.execCommand('bold', false);

        // Обновляем состояние
        if (localRef.current) {
            setTopPanelText(localRef.current.innerHTML);
        }
    };

    const [isFocused, setIsFocused] = useState(false);

    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

// Функция автосохранения (копия логики из onBlur)
    const autoSave = () => {
        if (localRef.current) {
            const value = localRef.current.innerHTML;
            const hasChanges = value !== initialQuickNoteText;

            if (hasChanges) {
                saveQuickNoteToItems(value);
                setInitialQuickNoteText(value);
            }

            setIsUserActive(false);
        }
    };

// Функция для сброса и установки нового таймера
    const resetAutoSaveTimer = () => {
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {
            autoSave();
        }, 15000); // 15 секунд
    };

    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = usePersistentState('quickNotesPosition', {x: 0, y: 0});
    const [dragStart, setDragStart] = useState({x: 0, y: 0});

    // Инициализировать позицию после загрузки размеров
    useEffect(() => {
        if (winWidth > 0 && winHeight > 0 && position.x === 0 && position.y === 0) {
            setPosition({
                x: winWidth - 250 - 12,
                y: winHeight - 250 - 12
            });
        }
    }, [winWidth, winHeight]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            let newX = Math.round((e.clientX - dragStart.x) / 10) * 10;

            // Логика прилипания к правому краю
            const rightEdge = winWidth - size.width;
            const snapThreshold = 10; // порог прилипания в пикселях

            if (newX >= rightEdge - snapThreshold && newX <= rightEdge + snapThreshold) {
                newX = rightEdge; // прилипаем к краю
            }

            // Ограничение только слева (x >= 0), справа можем уходить за пределы
            newX = Math.max(0, newX);

            const newY = Math.max(0, Math.min(winHeight - size.height,
                Math.round((e.clientY - dragStart.y) / 10) * 10
            ));

            setPosition({
                x: newX,
                y: newY
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragStart]);

    const [size, setSize] = usePersistentState('quickNotesSize', {width: 250, height: 250});
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({
        x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0, direction: 'corner' as 'left' | 'bottom' | 'corner'
    });

    const handleResizeMouseDown = (e: React.MouseEvent, direction: 'left' | 'bottom' | 'corner') => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height,
            startX: position.x,
            startY: position.y,
            direction
        });
    };

    const handleResizeMouseMove = (e: MouseEvent) => {
        if (isResizing) {
            const deltaX = resizeStart.x - e.clientX;
            const deltaY = e.clientY - resizeStart.y;

            let newWidth = resizeStart.width;
            let newHeight = resizeStart.height;
            let newX = resizeStart.startX;

            if (resizeStart.direction === 'left' || resizeStart.direction === 'corner') {
                newWidth = Math.max(250, Math.min(400,
                    Math.round((resizeStart.width + deltaX) / 10) * 10
                ));
                newX = resizeStart.startX - (newWidth - resizeStart.width);
            }

            if (resizeStart.direction === 'bottom' || resizeStart.direction === 'corner') {
                newHeight = Math.max(250, Math.min(400,
                    Math.round((resizeStart.height + deltaY) / 10) * 10
                ));
            }

            setSize({width: newWidth, height: newHeight});
            setPosition({
                x: newX,
                y: resizeStart.startY
            });
        }
    };

    const handleResizeMouseUp = () => {
        setIsResizing(false);
    };

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMouseMove);
            document.addEventListener('mouseup', handleResizeMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleResizeMouseMove);
                document.removeEventListener('mouseup', handleResizeMouseUp);
            };
        }
    }, [isResizing, resizeStart]);

    useEffect(() => {
        if (winWidth > 0 && winHeight > 0) {
            if (position.x === 0 && position.y === 0) {
                setPosition({
                    x: winWidth - size.width - 12,
                    y: winHeight - size.height - 12
                });
            } else if (position.y + size.height > winHeight) { // убрали проверку по x
                setPosition({
                    x: position.x, // не изменяем x
                    y: Math.max(0, Math.min(winHeight - size.height, position.y))
                });
            }
        }
    }, [winWidth, winHeight, size]);

    useEffect(() => {
        if (isResizing) {
            // Блокируем выделение для всего документа
            document.body.style.userSelect = 'none';
            document.body.style.cursor = resizeStart.direction === 'left' ? 'ew-resize' : 'ns-resize';

            return () => {
                document.body.style.userSelect = 'auto';
                document.body.style.cursor = 'auto';
            };
        }
    }, [isResizing, resizeStart.direction]);

    return (
        <div
            className={clsx("fixed z-[9999] bg-default-50 rounded border border-default-300",
                "shadow"
            )}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`
            }}
        >
            <p
                className={clsx(
                    "mx-[6px] h-[30px] py-2 font-semibold text-[14px] cursor-move",
                    "border-b border-divider ",
                )}
                onMouseDown={handleMouseDown}
            >
                <span className={"pl-[2px]"}>Quick Notes</span>
            </p>

            <div
                className={clsx(
                    ""
                )}>
                <div
                    contentEditable={!isResizing}
                    suppressContentEditableWarning
                    spellCheck={false}
                    ref={localRef}
                    tabIndex={0}

                    onPaste={(e) => {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, text);
                    }}

                    onInput={(e) => {
                        const el = e.currentTarget as HTMLDivElement;
                        const html = el.innerHTML;

                        resetAutoSaveTimer();

                        // Если остались только <br> или пустые теги, очищаем полностью
                        const textContent = el.textContent || '';
                        if (textContent.trim() === '') {
                            el.innerHTML = '';
                            setTopPanelText('');
                        } else {
                            setTopPanelText(html);
                        }

                        setIsUserActive(true);
                    }}

                    onFocus={() => {
                        setIsFocused(true);
                        setIsUserActive(true);
                        resetAutoSaveTimer();
                    }}

                    onBlur={(e) => {
                        setIsFocused(false);

                        // Очищаем таймер
                        if (autoSaveTimerRef.current) {
                            clearTimeout(autoSaveTimerRef.current);
                        }

                        const value = (e.target as HTMLDivElement).innerHTML;
                        const hasChanges = value !== initialQuickNoteText;

                        if (hasChanges) {
                            saveQuickNoteToItems(value);
                            setInitialQuickNoteText(value);
                        }

                        setIsUserActive(false);
                    }}

                    onKeyDown={(e) => {
                        setIsUserActive(true);
                        // Cmd+B / Ctrl+B для bold
                        if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                            e.preventDefault();
                            toggleBold();
                            return;
                        }

                        // ENTER без Shift - blur
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const el = e.currentTarget as HTMLDivElement;
                            el.blur();
                        }

                        // Сбрасываем таймер при любом вводе текста
                        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                            resetAutoSaveTimer();
                        }

                        // Обработка Delete/Backspace - очищаем если пусто
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                            setTimeout(() => {
                                if (localRef.current) {
                                    const textContent = localRef.current.textContent || '';
                                    if (textContent.trim() === '') {
                                        localRef.current.innerHTML = '';
                                        setTopPanelText('');
                                    }
                                }
                            }, 0);
                        }
                    }}
                    className={clsx(
                        "w-full resize-none p-2 leading-[20px] outline-none border-none text-[14px] text-default-700",
                        "bg-default-50 focus:bg-primary-50/50 resize-none overflow-y-auto",
                        isResizing && "pointer-events-none select-none"
                    )}
                    style={{
                        height: `${size.height - 34}px`,
                        fontFamily: 'inherit',
                        userSelect: isResizing ? 'none' : 'text'
                    }}
                    data-placeholder="Быстрые заметки..."
                />
            </div>

            <style jsx>{`
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: rgb(107 114 128);
                    opacity: 0.6;
                    pointer-events: none;
                }
            `}</style>

            {/* Левая сторона */}
            <div
                className="absolute left-0 top-[30px] bottom-0 w-[2px] cursor-ew-resize hover:bg-primary-300"
                onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
            />

            {/* Нижняя сторона */}
            <div
                className="absolute bottom-0 left-0 right-0 h-[2px] cursor-ns-resize hover:bg-primary-300"
                onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
            />

        </div>
    );
}