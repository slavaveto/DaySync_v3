import React, { useState, useRef } from 'react';
import clsx from "clsx";
import { GripVertical, Check, X, Plus, AlignJustify } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SubTask } from "@/app/types";
import {useMainContext} from "@/app/context";

interface SortableSubTaskProps {
    subtask: SubTask;
    item: any;
    isDragOverlay?: boolean;
}

export function SortableSubTask({
                                    subtask, item, isDragOverlay = false
                                }: SortableSubTaskProps) {
    const {
        setIsUserActive, editingTitleId, setItems, setHasLocalChanges,
    } = useMainContext();

    const [editedTitle, setEditedTitle] = useState(subtask.title);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

    const editableDivRef = useRef<HTMLDivElement>(null);
    const newSubTaskInputRef = useRef<HTMLInputElement>(null);

    const {attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({
        id: subtask.id,
        disabled: isDragOverlay || isEditing || isCreating
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isDragOverlay ? 0.5 : 1,
    };

    // Функция для автоматической настройки высоты
    const adjustHeight = () => {
        if (editableDivRef.current) {
            editableDivRef.current.style.height = 'auto';
            editableDivRef.current.style.height = Math.max(20, editableDivRef.current.scrollHeight) + 6 + 'px';
        }
    };

    // Настраиваем высоту при изменении title
    React.useEffect(() => {
        adjustHeight();
    }, [subtask.title]);

    // Настраиваем высоту при монтировании компонента
    React.useEffect(() => {
        adjustHeight();
    }, []);

    // Автофокус при редактировании
    React.useEffect(() => {
        if (isEditing && !isDragOverlay && editableDivRef.current) {
            editableDivRef.current.focus();
        }
    }, [isEditing, isDragOverlay]);

    // Автофокус при создании
    React.useEffect(() => {
        if (isCreating && newSubTaskInputRef.current) {
            newSubTaskInputRef.current.focus();
        }
    }, [isCreating]);

    // Синхронизируем title при изменении subtask
    React.useEffect(() => {
        if (!isEditing) {
            setEditedTitle(subtask.title);
        }
    }, [subtask.title, isEditing]);

    // Сохранение изменений title
    const handleSaveTitle = () => {
        if (editedTitle.trim() !== subtask.title) {
            const updatedSubtasks = (item.subtasks || []).map((st: SubTask) =>
                st.id === subtask.id ? { ...st, title: editedTitle.trim() } : st
            );

            setItems((prev: any[]) =>
                prev.map((i: any) =>
                    i.id === item.id ? {
                        ...i,
                        subtasks: updatedSubtasks,
                        updated_at: new Date().toISOString(),
                        sync_highlight: true
                    } : i
                )
            );
            setHasLocalChanges(true);
        }
        setIsEditing(false);
        setIsUserActive(false);
    };

    // Переключение статуса подзадачи
    const handleToggleDone = () => {
        if (isDragOverlay) return;

        setIsUserActive(true);
        const newStatus = !subtask.is_done;

        const updatedSubtasks = (item.subtasks || []).map((st: SubTask) =>
            st.id === subtask.id ? { ...st, is_done: newStatus } : st
        );

        // Пересчитываем order для правильной сортировки
        const reorderedSubtasks = updatedSubtasks
            .sort((a: SubTask, b: SubTask) => {
                if (a.is_done !== b.is_done) {
                    return a.is_done ? 1 : -1;
                }
                return a.order - b.order;
            })
            .map((st: SubTask, index: number) => ({ ...st, order: index }));

        setItems((prev: any[]) =>
            prev.map((i: any) =>
                i.id === item.id ? {
                    ...i,
                    subtasks: reorderedSubtasks,
                    updated_at: new Date().toISOString(),
                    sync_highlight: true
                } : i
            )
        );
        setHasLocalChanges(true);
        setTimeout(() => setIsUserActive(false), 300);
    };

    // Удаление подзадачи
    const handleDelete = () => {
        if (isDragOverlay) return;

        setIsUserActive(true);
        const updatedSubtasks = (item.subtasks || []).filter((st: SubTask) => st.id !== subtask.id);

        setItems((prev: any[]) =>
            prev.map((i: any) =>
                i.id === item.id ? {
                    ...i,
                    subtasks: updatedSubtasks,
                    updated_at: new Date().toISOString(),
                    sync_highlight: true
                } : i
            )
        );
        setHasLocalChanges(true);

        setTimeout(() => setIsUserActive(false), 300);
    };

    // Создание новой подзадачи
    const handleCreateAfter = () => {
        if (!newSubTaskTitle.trim()) {
            setIsCreating(false);
            setNewSubTaskTitle('');
            setIsUserActive(false);
            return;
        }

        const allSubtasks = item.subtasks || [];
        const afterSubtaskIndex = allSubtasks.findIndex((st: SubTask) => st.id === subtask.id);
        const insertIndex = afterSubtaskIndex + 1;

        const newSubTaskId = Date.now();
        const newSubTask: SubTask = {
            id: newSubTaskId,
            title: newSubTaskTitle.trim(),
            is_done: false,
            order: insertIndex
        };

        const updatedSubtasks = [
            ...allSubtasks.slice(0, insertIndex),
            newSubTask,
            ...allSubtasks.slice(insertIndex)
        ].map((st, index) => ({ ...st, order: index }));

        setItems((prev: any[]) =>
            prev.map((i: any) =>
                i.id === item.id ? {
                    ...i,
                    subtasks: updatedSubtasks,
                    updated_at: new Date().toISOString(),
                    sync_highlight: true
                } : i
            )
        );
        setHasLocalChanges(true);

        setIsCreating(false);
        setNewSubTaskTitle('');
        setIsUserActive(false);
    };

    // Начало редактирования
    const startEditing = () => {
        if (isDragOverlay || isCreating) return;

        setIsEditing(true);
        setIsUserActive(true);
    };

    // Начало создания
    const startCreating = () => {
        if (isDragOverlay || isEditing) return;

        if (isEditing) {
            setIsEditing(false);
        }

        setIsCreating(true);
        setNewSubTaskTitle('');
        setIsUserActive(true);
    };

    // Отмена создания
    const cancelCreating = () => {
        setIsCreating(false);
        setNewSubTaskTitle('');
        setIsUserActive(false);
    };



    return (
        <>
            <div
                ref={!isDragOverlay ? setNodeRef : undefined}
                style={style}

                className={clsx(
                    "flex items-center min-h-[26px] py-[0px] mb-[3px] pr-[2px] rounded border border-default-200 bg-default-50",
                    "hover:bg-primary-50 transition-colors group",
                    isDragging && !isDragOverlay && "z-50",
                    isDragOverlay && "bg-primary-50 shadow-lg border-primary-300 z-50"
                )}
            >
                {/* Drag handle */}
                <div
                    {...(!isDragOverlay && !isEditing && !isCreating ? attributes : {})}
                    {...(!isDragOverlay && !isEditing && !isCreating ? listeners : {})}
                    className={clsx(
                        "drag-handle flex items-center", // добавляем класс для CSS
                        isEditing || isCreating ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                    )}
                >
                    <GripVertical size={14} className="text-default-400 mx-[5px]"/>
                </div>

                {/* Checkbox */}
                <button
                    onClick={handleToggleDone}
                    disabled={isDragOverlay}
                    className={clsx(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                        subtask.is_done
                            ? "bg-success-400 border-success-400 dark:!bg-success-300 dark:!border-success-300 text-white"
                            : "border-default-300 hover:border-success-400 dark:hover:!border-success-300",
                        isDragOverlay && "pointer-events-none"
                    )}
                >
                    {subtask.is_done && <Check size={10}/>}
                </button>

                {/* Title */}
                <div
                    ref={editableDivRef}
                    contentEditable={isEditing && !isDragOverlay}
                    suppressContentEditableWarning
                    spellCheck={false}
                    onInput={(e) => {
                        if (isEditing) {
                            const el = e.currentTarget as HTMLDivElement;
                            setEditedTitle(el.textContent || '');
                            adjustHeight();
                        }
                    }}
                    onKeyDown={(e) => {
                        if (!isEditing) return;

                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveTitle();
                        }
                        if (e.key === 'Escape') {
                            setEditedTitle(subtask.title);
                            if (e.currentTarget) {
                                e.currentTarget.textContent = subtask.title;
                            }
                            setIsEditing(false);
                            setIsUserActive(false);
                        }
                    }}
                    onBlur={() => {
                        if (isEditing) {
                            handleSaveTitle();
                        }
                    }}
                    onClick={startEditing}
                    className={clsx(
                        "flex-1 text-[14px] ml-[6px] pl-[2px] outline-none rounded focus:bg-background flex items-center",
                        !isDragOverlay && "cursor-text",
                        subtask.is_done && "line-through text-default-400",
                    )}
                    style={{
                        minHeight: '20px',
                        lineHeight: '1.2',
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap'
                    }}
                    data-placeholder="Добавить задачу..."
                >
                    {subtask.title}
                </div>

                {/* Create button */}
                <button
                    onClick={startCreating}
                    disabled={isDragOverlay || isEditing}
                    className={clsx(
                        "flex-shrink-0 action-button opacity-0 text-primary-500 p-1 hover:bg-primary-100 rounded hover:text-primary-500 transition-all",
                        isDragOverlay && "pointer-events-none",
                        !isDragOverlay && "group-hover:opacity-100"
                    )}
                    title="Создать подзадачу ниже"
                >
                    <Plus size={12}/>
                </button>

                    <button
                        onClick={handleDelete}
                        disabled={isDragOverlay}
                        className={clsx(
                            "flex-shrink-0 action-button opacity-0 text-danger-500 group-hover:opacity-100 p-1 hover:bg-danger-100 rounded hover:text-danger-500 transition-all",
                            isDragOverlay && "pointer-events-none"
                        )}
                        title="Удалить подзадачу"
                    >
                        <X size={12} />
                    </button>
            </div>

            {/* Форма создания новой подзадачи */}
            {isCreating && (
                <div className="flex items-center flex items-center h-[26px] px-[5px] rounded border border-primary-300 bg-primary-50">
                    {/*<div className="w-4 h-4"></div>*/}
                    {/*<div className="w-4 h-4"></div>*/}
                    <input
                        ref={newSubTaskInputRef}
                        type="text"
                        value={newSubTaskTitle}
                        onChange={(e) => setNewSubTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCreateAfter();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelCreating();
                            }
                        }}
                        onBlur={handleCreateAfter}
                        placeholder="Название подзадачи..."
                        className="flex-1 text-[14px] px-[3px] focus:bg-background rounded outline-none placeholder-default-400"
                    />
                </div>
            )}

            <style jsx>{`
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: rgb(107 114 128);
                    opacity: 0.6;
                    pointer-events: none;
                }

                drag-handle:hover ~ .action-button {
                    opacity: 0 !important;
                }
            `}</style>
        </>
    );
}