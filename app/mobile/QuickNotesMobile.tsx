// components/QuickNotes.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useMainContext } from "@/app/context";
import { format } from 'date-fns';
import { useUser } from "@clerk/nextjs";
import usePersistentState from "@/app/utils/usePersistentState";
import clsx from "clsx";
import type { ItemType } from "@/app/types";



export function QuickNotesMobile() {
    const { items, setItems, setHasLocalChanges, setIsUserActive } = useMainContext();
    const { user } = useUser();
    const [topPanelText, setTopPanelText] = usePersistentState('QuickNotesText', '');
    const [initialQuickNoteText, setInitialQuickNoteText] = useState('');
    const localRef = useRef<HTMLDivElement | null>(null);

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


    return (
<>
            <div
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                ref={localRef}
                tabIndex={0}

                className={clsx(
                    "w-full px-[12px] resize-none leading-[20px] outline-none border-none text-[16px] text-default-700",
                    "bg-default-50 focus:bg-primary-50/50 resize-none",
                )}

                style={{
                    fontFamily: 'inherit',
                    paddingTop: '12px',
                    paddingBottom: '30px'
                }}

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
                    // if (e.key === 'Enter' && !e.shiftKey) {
                    //     e.preventDefault();
                    //     const el = e.currentTarget as HTMLDivElement;
                    //     el.blur();
                    // }

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


                data-placeholder="Быстрые заметки..."
            />

            <style jsx>{`
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: rgb(107 114 128);
                    opacity: 0.6;
                    pointer-events: none;
                }
            `}</style>
</>
    );
}