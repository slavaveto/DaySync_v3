// components/ItemEditor.tsx
import React, {useEffect, useRef, useState} from 'react';
import {useMainContext} from "@/app/context";
import {TitleHighlight} from "@/app/main/elems/TitleHighlight";
import clsx from "clsx";
import {highlightColors} from "@/app/main/utils/highlightColors";
import {CheckBox} from "@/app/main/elems/Checkbox";
import {AlarmClock, Repeat2} from "lucide-react";
import {ICON_SIZES} from "@/app/main/droppable/dndStyles";
import {DueDate} from "@/app/main/elems/DueDate";
import {Categories} from "@/app/main/elems/Categories";
import {Priority} from "@/app/main/elems/Priority";
import {SubTasks} from "@/app/main/subtasks/SubTasks";
import {Time} from "@internationalized/date";
import {TimeInput} from "@heroui/react";
import {useVerticalResizableLayout} from "@/app/main/subtasks/useVerticalResizableLayout";
import {VerticalResizer} from "@/app/main/subtasks/VerticalResizer";

interface ItemEditorProps {
    item: any;
    onClose?: () => void;
}

export function ItemEditor({item, onClose}: ItemEditorProps) {
    const {setItems, setHasLocalChanges, setIsUserActive} = useMainContext();

    const [title, setTitle] = useState(item.title || '');
    const [initialTitle, setInitialTitle] = useState(item.title || '');
    const [notes, setNotes] = useState(item.notes || '');
    const [initialNotes, setInitialNotes] = useState(item.notes || '');
    const [repeatChecked, setRepeatChecked] = React.useState(item?.is_repeated);
    const [alertChecked, setAlertChecked] = React.useState(item?.is_alerted);
    const [showSubtasksChecked, setShowSubtasksChecked] = React.useState(item?.show_subtasks_count);

    const titleRef = useRef<HTMLTextAreaElement>(null);
    const notesRef = useRef<HTMLDivElement>(null);

    const {
        notesPanelHeight,
        isResizing: isVerticalResizing,
        containerRef: notesContainerRef,
        handleMouseDown: handleVerticalMouseDown
    } = useVerticalResizableLayout({
        initialHeight: 200,
        minHeight: 150,
        maxHeight: 400,
        persistKey: `notesPanelHeight_${item.id}` // уникальный ключ для каждого элемента
    });

    // Обработка изменения текста
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value);
        autoResize();
    };

    // Функция для применения/снятия bold в notes
    const toggleNotesBold = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return;

        document.execCommand('bold', false);

        if (notesRef.current) {
            setNotes(notesRef.current.innerHTML);
        }
    };

    // Функция для автоматического создания ссылок в заметках
    const makeLinksClickable = (html: string) => {
        // Регулярное выражение для поиска URL (включая без http://)
        const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s<>"]*|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.(com|org|net|edu|gov|io|co|ru|de|fr|uk|ca|au|jp|br|mx|es|it|nl|se|no|dk|fi|pl|cz|hu|bg|ro|gr|pt|ie|at|ch|be|lu|is|ee|lv|lt|sk|si|hr|rs|ba|mk|al|me|md|ua|by|kz|uz|kg|tj|tm|az|am|ge)[^\s<>"]*)/gi;

        return html.replace(urlRegex, (url) => {
            // Проверяем, не находится ли URL уже внутри тега <a>
            const beforeUrl = html.substring(0, html.indexOf(url));
            const openTagCount = (beforeUrl.match(/<a/gi) || []).length;
            const closeTagCount = (beforeUrl.match(/<\/a>/gi) || []).length;

            // Если теги <a> не закрыты, значит URL уже внутри ссылки
            if (openTagCount > closeTagCount) {
                return url;
            }

            // Добавляем http:// если его нет
            const href = url.startsWith('http') ? url : `https://${url}`;

            return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: rgb(59 130 246); text-decoration: underline;">${url}</a>`;
        });
    };

    // Сохранение изменений
    const saveAllChanges = () => {
        const hasChanges =
            title !== initialTitle ||
            notes !== initialNotes ||
            repeatChecked !== item.is_repeated ||
            alertChecked !== item.is_alerted ||
            showSubtasksChecked !== item.show_subtasks_count;

        if (hasChanges) {
            const now = new Date().toISOString();
            setItems((prev: any[]) =>
                prev.map((i: any) =>
                    i.id === item.id ? {
                        ...i,
                        title: title,
                        notes: notes,
                        is_repeated: repeatChecked,
                        is_alerted: alertChecked,
                        show_subtasks_count: showSubtasksChecked,
                        updated_at: now,
                        sync_highlight: true
                    } : i
                )
            );
            setHasLocalChanges(true);
            setInitialTitle(title);
            setInitialNotes(notes);
        }
    };

    // Завершение редактирования
    const finishEditing = () => {
        saveAllChanges();
        setIsUserActive(false);
    };

    // Функция для автоматического изменения высоты
    const autoResize = () => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = Math.max(24, titleRef.current.scrollHeight) + 'px';
        }
    };

    useEffect(() => {
        autoResize();
    }, [title]);

    // Синхронизация HTML notes с состоянием
    useEffect(() => {
        const el = notesRef.current;
        if (el) {
            if (el.innerHTML !== notes) {
                el.innerHTML = notes;
            }
        }
    }, [notes]);

    useEffect(() => {
        setTitle(item.title || '');
        setInitialTitle(item.title || '');
        setNotes(item.notes || '');
        setInitialNotes(item.notes || '');
        setRepeatChecked(item?.is_repeated);
        setAlertChecked(item?.is_alerted);
        setShowSubtasksChecked(item?.show_subtasks_count);
        autoResize();
    }, [item.id, item.title, item.notes, item.is_repeated, item.is_alerted, item.show_subtasks_count]);

    useEffect(() => {
        if (item.is_done || item.is_deleted) {
            onClose?.();
        }
    }, [item.is_done, item.is_deleted, onClose]);

    // Вычисляем подзадачи и их статус
    const nonEmptySubtasks = item.subtasks
        ? item.subtasks.filter((st: any) => st.title && st.title.trim() !== '')
        : [];
    const uncompletedSubtasks = nonEmptySubtasks.filter((st: any) => !st.is_done).length;
    const totalNonEmptySubtasks = nonEmptySubtasks.length;
    const allCompleted = totalNonEmptySubtasks > 0 && uncompletedSubtasks === 0;

    return (
        <div
            key={item.id}
            className="flex flex-col h-full  pt-[8px] text-[14px]"
        >
            {/* Верхняя панель - занимает оставшееся место */}
            <div className="flex flex-col px-[6px] gap-2">

                <div className="relative flex items-center">
                    <div className="absolute right-[4px]" style={{
                        top: '50%',
                        transform: 'translateY(calc(-50% - 0px))'
                    }}>
                        <TitleHighlight item={item}/>
                    </div>

                    {/*<div className="ml-[0.5px]  mr-[0px] w-[34px]">*/}
                    {/*    <CheckBox item={item}/>*/}
                    {/*</div>*/}

                    <textarea
                        ref={titleRef}
                        spellCheck={false}
                        value={title}
                        onChange={handleTextChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                finishEditing();
                                titleRef.current?.blur();
                            }
                            if (e.key === 'Escape') {
                                setTitle(initialTitle);
                                setIsUserActive(false);
                            }
                        }}
                        onBlur={finishEditing}
                        onFocus={() => {
                            setIsUserActive(true);
                        }}
                        className={clsx(
                            "pr-[20px]",
                            "w-full p-1 py-[5px] px-[6px] pr-[25px] border border-default-300 rounded outline-none",
                            "focus:border-primary-400 transition-colors resize-none overflow-hidden",
                            highlightColors(item)
                        )}
                        rows={1}
                        style={{
                            lineHeight: '1.2',
                        }}
                    />
                </div>

                <div className="flex items-center justify-between  px-[2px] mb-[10px]">

                    <Priority item={item}/>

                    <div className="ml-[0px] mr-[0px]">
                        <Categories item={item}/>
                    </div>

                    <button
                        type="button"
                        disabled={totalNonEmptySubtasks === 0}
                        onClick={() => {
                            setIsUserActive(true);
                            const newValue = !showSubtasksChecked;
                            setShowSubtasksChecked(newValue);

                            const now = new Date().toISOString();
                            setItems((prev: any[]) => prev.map((i: any) =>
                                i.id === item.id ? {
                                    ...i,
                                    sync_highlight: true,
                                    show_subtasks_count: newValue,
                                    updated_at: now
                                } : i
                            ));

                            setTimeout(() => {
                                setIsUserActive(false);
                                setHasLocalChanges(true);
                            }, 300);
                        }}
                        className=""
                    >
                        {/*{totalNonEmptySubtasks > 0 ? (*/}
                            <div className={clsx(
                                "flex items-center justify-center w-[22px] h-[22px] flex-shrink-0 text-[14px]",
                                "rounded-full  font-medium transition-colors border text-white dark:!text-default-600",

                                totalNonEmptySubtasks === 0 && "opacity-0 ",

                                allCompleted ? "bg-success-200 hover:bg-success-400 border-success-300"
                                    : "bg-warning-200 hover:bg-warning-400 border-warning-300 dark:bg-warning-100 dark:border-warning-200",
                                item.show_subtasks_count && allCompleted && "!bg-success-400 dark:!bg-success-200 border-success-500 dark:!border-success-200 dark:!text-default-600",
                                item.show_subtasks_count && !allCompleted && "!bg-warning-500 dark:!bg-warning-200 !border-warning-600 dark:!border-warning-300 dark:!text-default-600",
                                totalNonEmptySubtasks === 0 && "!bg-default-200 !border-default-300"
                            )}>
                                {allCompleted ? totalNonEmptySubtasks : uncompletedSubtasks}
                            </div>
                        {/*) : (*/}
                        {/*    <div className={clsx()}>*/}
                        {/*        5*/}
                        {/*    </div>*/}
                        {/*)}*/}
                    </button>

                    {/*<TitleHighlight item={item}/>*/}

                </div>

                <div className="flex items-center mt-[0px]">
                    <button
                        type="button"
                        onClick={() => {
                            setIsUserActive(true);
                            const newValue = !repeatChecked;
                            setRepeatChecked(newValue);

                            const now = new Date().toISOString();
                            setItems((prev: any[]) => prev.map((i: any) =>
                                i.id === item.id ? {
                                    ...i,
                                    sync_highlight: true,
                                    is_repeated: newValue,
                                    updated_at: now
                                } : i
                            ));

                            setTimeout(() => {
                                setIsUserActive(false);
                                setHasLocalChanges(true);
                            }, 300);
                        }}
                        className="mr-[0px] w-[34px]"
                    >
                        <Repeat2
                            size={ICON_SIZES.dt + 3}
                            strokeWidth={
                                repeatChecked ? 2.5 : 2
                            }
                            className={clsx(
                                "hover:text-primary-400 transition-colors mt-[1px] ml-[0px] rotate-90",
                                repeatChecked ? "text-primary-500" : "text-primary-200",
                            )}
                        />
                    </button>

                    <div
                        className={clsx(
                            "w-full h-[27px] pl-[6px] border border-default-300 rounded outline-none",
                            "flex items-center"
                        )}
                    >
                        <DueDate item={item}/>
                    </div>

                </div>

                {/*<div className="flex items-center">*/}
                {/*    <button*/}
                {/*        type="button"*/}
                {/*        onClick={() => {*/}
                {/*            setIsUserActive(true);*/}
                {/*            const newValue = !alertChecked;*/}
                {/*            setAlertChecked(newValue);*/}

                {/*            const now = new Date().toISOString();*/}
                {/*            setItems((prev: any[]) => prev.map((i: any) =>*/}
                {/*                i.id === item.id ? {*/}
                {/*                    ...i,*/}
                {/*                    sync_highlight: true,*/}
                {/*                    is_alerted: newValue,*/}
                {/*                    updated_at: now*/}
                {/*                } : i*/}
                {/*            ));*/}

                {/*            setTimeout(() => {*/}
                {/*                setIsUserActive(false);*/}
                {/*                setHasLocalChanges(true);*/}
                {/*            }, 300);*/}
                {/*        }}*/}
                {/*        className="mr-[0px] w-[34px]"*/}
                {/*    >*/}
                {/*        <AlarmClock*/}
                {/*            size={ICON_SIZES.dt + 3}*/}
                {/*            strokeWidth={*/}
                {/*                alertChecked ? 2.5 : 2*/}
                {/*            }*/}
                {/*            className={clsx(*/}
                {/*                "hover:text-primary-400 transition-colors mt-[-1px]",*/}
                {/*                alertChecked ? "text-primary-500" : "text-default-300",*/}
                {/*            )}*/}
                {/*        />*/}
                {/*    </button>*/}

                {/*    <div*/}
                {/*        className={clsx(*/}
                {/*            "w-full h-[27px] pl-[6px] border border-default-300 rounded outline-none",*/}
                {/*            "flex items-center"*/}
                {/*        )}*/}
                {/*    >*/}
                {/*        <TimeInput*/}
                {/*            className="ml-[0px]"*/}
                {/*            variant="flat"*/}
                {/*            size="sm"*/}
                {/*            hourCycle={24}*/}
                {/*            defaultValue={new Time(9)}*/}
                {/*            isDisabled={!alertChecked}*/}
                {/*            classNames={{*/}
                {/*                inputWrapper: clsx("!h-[24px] !min-h-[24px] p-0 m-0"),*/}
                {/*                input: clsx(" text-[14px]")*/}
                {/*            }}*/}
                {/*        />*/}
                {/*    </div>*/}

                {/*</div>*/}

            </div>

            <div className="flex-1 px-[6px] overflow-y-auto mt-[10px]">
                <SubTasks item={item}/>
            </div>

            {/* Resizer */}
            <VerticalResizer
                isResizing={isVerticalResizing}
                onMouseDown={handleVerticalMouseDown}
            />

            {/* Нижняя панель заметок с фиксированной высотой */}
            <div
                ref={notesContainerRef}
                style={{height: `${notesPanelHeight}px`}}
                className="flex flex-col"
            >
                <div
                    ref={notesRef}
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    tabIndex={0}

                    onPaste={(e) => {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, text);
                    }}

                    onClick={(e) => {
                        // Проверяем если клик был на ссылке
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'A') {
                            e.preventDefault();
                            const href = target.getAttribute('href');
                            if (href) {
                                try {
                                    // Открываем в системном браузере через Electron
                                    if (window.require) {
                                        window.require('electron').shell.openExternal(href);
                                    } else {
                                        // Fallback для обычного браузера
                                        window.open(href, '_blank', 'noopener,noreferrer');
                                    }
                                } catch (error) {
                                    // Если Electron API недоступно, открываем обычным способом
                                    window.open(href, '_blank', 'noopener,noreferrer');
                                }
                            }
                        }
                    }}

                    onInput={(e) => {
                        const el = e.currentTarget as HTMLDivElement;
                        const html = el.innerHTML;

                        // Если остались только <br> или пустые теги, очищаем полностью
                        const textContent = el.textContent || '';
                        if (textContent.trim() === '') {
                            el.innerHTML = '';
                            setNotes('');
                        } else {
                            // Применяем автоматическое создание ссылок
                            const htmlWithLinks = makeLinksClickable(html);
                            if (htmlWithLinks !== html) {
                                // Сохраняем позицию курсора
                                const selection = window.getSelection();
                                const range = selection?.getRangeAt(0);
                                const startOffset = range?.startOffset || 0;

                                el.innerHTML = htmlWithLinks;

                                // Восстанавливаем позицию курсора
                                if (selection && range) {
                                    try {
                                        const walker = document.createTreeWalker(
                                            el,
                                            NodeFilter.SHOW_TEXT,
                                            null
                                        );
                                        let currentOffset = 0;
                                        let targetNode = null;

                                        while (walker.nextNode()) {
                                            const textNode = walker.currentNode;
                                            const nodeLength = textNode.textContent?.length || 0;
                                            if (currentOffset + nodeLength >= startOffset) {
                                                targetNode = textNode;
                                                break;
                                            }
                                            currentOffset += nodeLength;
                                        }

                                        if (targetNode) {
                                            const newRange = document.createRange();
                                            newRange.setStart(targetNode, Math.max(0, startOffset - currentOffset));
                                            newRange.collapse(true);
                                            selection.removeAllRanges();
                                            selection.addRange(newRange);
                                        }
                                    } catch (e) {
                                        // Игнорируем ошибки позиционирования курсора
                                    }
                                }
                            }
                            setNotes(htmlWithLinks);
                        }
                    }}

                    onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                            e.preventDefault();
                            toggleNotesBold();
                            return;
                        }

                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            finishEditing();
                            notesRef.current?.blur();
                        }
                        if (e.key === 'Escape') {
                            setNotes(initialNotes);
                            setIsUserActive(false);
                        }

                        // Обработка Delete/Backspace - очищаем если пусто
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                            setTimeout(() => {
                                if (notesRef.current) {
                                    const textContent = notesRef.current.textContent || '';
                                    if (textContent.trim() === '') {
                                        notesRef.current.innerHTML = '';
                                        setNotes('');
                                    }
                                }
                            }, 0);
                        }
                    }}

                    onBlur={() => {
                        finishEditing();
                    }}

                    onFocus={() => {
                        setIsUserActive(true);
                    }}
                    className={clsx(
                        "notes-container w-full p-[6px] h-full rounded outline-none",
                        "focus:bg-primary-50 transition-colors resize-none overflow-y-auto",
                    )}
                    style={{
                        lineHeight: '1.2',
                    }}
                    data-placeholder="Добавить заметки..."
                />

                <style jsx>{`
                    [contenteditable]:empty:before {
                        content: attr(data-placeholder);
                        color: rgb(107 114 128);
                        opacity: 0.6;
                        pointer-events: none;
                    }

                    [contenteditable] a {
                        cursor: pointer !important;
                        pointer-events: auto !important;
                    }

                    [contenteditable] a:hover {
                        text-decoration: underline !important;
                        opacity: 0.8;
                        cursor: pointer !important;
                    }

                    :global(.notes-container a) {
                        cursor: pointer !important;
                    }
                `}</style>

            </div>
        </div>
    );
}