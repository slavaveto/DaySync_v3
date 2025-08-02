import React, {useState, useRef} from 'react';
import {useMainContext} from "@/app/context";

import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,} from '@dnd-kit/sortable';
import {SortableSubTask} from '@/app/main/subtasks/SortableSubTask';
import type {SubTask} from "@/app/types";

export function SubTasks({item}: { item: any }) {
    const {setItems, setHasLocalChanges, setIsUserActive} = useMainContext();
    const [activeId, setActiveId] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Получаем подзадачи из JSON поля или создаем пустой массив
    const subtasks: SubTask[] = (item.subtasks || [])
        .sort((a: SubTask, b: SubTask) => {
            // Сначала по статусу: невыполненные сверху
            if (a.is_done !== b.is_done) {
                return a.is_done ? 1 : -1;
            }
            // Потом по order внутри группы
            return a.order - b.order;
        });

    // Автоматически создаем первую подзадачу если их нет
    // React.useEffect(() => {
    //     if (subtasks.length === 0) {
    //         const newSubTaskId = Date.now();
    //         const newSubTask: SubTask = {
    //             id: newSubTaskId,
    //             title: '',
    //             is_done: false,
    //             order: 0
    //         };
    //
    //         setItems((prev: any[]) =>
    //             prev.map((i: any) =>
    //                 i.id === item.id ? {
    //                     ...i,
    //                     subtasks: [newSubTask],
    //                     updated_at: new Date().toISOString(),
    //                     sync_highlight: true
    //                 } : i
    //             )
    //         );
    //         setHasLocalChanges(true);
    //     }
    // }, [subtasks.length, item.id, setItems, setHasLocalChanges]);

    // Находим активную подзадачу для overlay
    const activeSubTask = activeId ? subtasks.find(st => st.id === activeId) : null;

    // Обработка начала перетаскивания
    const handleDragStart = (event: DragStartEvent) => {
        document.documentElement.classList.add('grabbing-cursor');
        setActiveId(event.active.id as number);
        setIsUserActive(true);
    };

    // Обработка перетаскивания
    const handleDragEnd = (event: DragEndEvent) => {
        document.documentElement.classList.remove('grabbing-cursor');
        const {active, over} = event;
        setActiveId(null);
        setIsUserActive(false);

        if (active.id !== over?.id && over) {
            const oldIndex = subtasks.findIndex(st => st.id === active.id);
            const newIndex = subtasks.findIndex(st => st.id === over?.id);

            // Получаем перетаскиваемую подзадачу
            const draggedSubtask = subtasks[oldIndex];
            const targetSubtask = subtasks[newIndex];

            // Запрещаем перетаскивание между группами (done/undone)
            if (draggedSubtask.is_done !== targetSubtask.is_done) {
                return; // не разрешаем перетаскивание между группами
            }

            const reorderedSubtasks = arrayMove(subtasks, oldIndex, newIndex)
                .map((st, index) => ({...st, order: index})); // обновляем order

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
        }
    };


    // В SubTasks.tsx добавить состояния:
    const [isCreatingFirst, setIsCreatingFirst] = useState(false);
    const [firstSubTaskTitle, setFirstSubTaskTitle] = useState('');
    const firstSubTaskInputRef = useRef<HTMLInputElement>(null);

// Автофокус
    React.useEffect(() => {
        if (isCreatingFirst && firstSubTaskInputRef.current) {
            firstSubTaskInputRef.current.focus();
        }
    }, [isCreatingFirst]);

// Создание первой подзадачи
    const handleCreateFirst = () => {
        if (!firstSubTaskTitle.trim()) {
            setIsCreatingFirst(false);
            setFirstSubTaskTitle('');
            setIsUserActive(false);
            return;
        }

        const newSubTaskId = Date.now();
        const newSubTask: SubTask = {
            id: newSubTaskId,
            title: firstSubTaskTitle.trim(),
            is_done: false,
            order: 0
        };

        setItems((prev: any[]) =>
            prev.map((i: any) =>
                i.id === item.id ? {
                    ...i,
                    subtasks: [newSubTask],
                    updated_at: new Date().toISOString(),
                    sync_highlight: true
                } : i
            )
        );
        setHasLocalChanges(true);
        setIsCreatingFirst(false);
        setFirstSubTaskTitle('');
        setIsUserActive(false);
    };




    return (
        <div
            className="h-full "
            onDoubleClick={() => {
                setIsCreatingFirst(true);
                setIsUserActive(true);
            }}
        >
            {subtasks.length === 0 ? (
                isCreatingFirst ? (
                    <div
                        className="flex items-center h-[26px] px-[5px] rounded border border-primary-300 bg-primary-50">
                        <input
                            ref={firstSubTaskInputRef}
                            type="text"
                            value={firstSubTaskTitle}
                            onChange={(e) => setFirstSubTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateFirst();
                                } else if (e.key === 'Escape') {
                                    setIsCreatingFirst(false);
                                    setFirstSubTaskTitle('');
                                    setIsUserActive(false);
                                }
                            }}
                            onBlur={handleCreateFirst}
                            placeholder="Название подзадачи..."
                            className="flex-1 text-[14px] px-[3px] bg-transparent outline-none placeholder-default-400"
                        />
                    </div>
                ) : (
                    <div
                        className="text-default-400 text-sm text-center cursor-pointer hover:text-default-600 transition-colors border border-dashed border-default-300 rounded py-8 flex items-center justify-center min-h-[100px]">
                        Кликните в любом месте дважды чтобы создать
                    </div>
                )
            ) : (

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={subtasks.map(st => st.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="">
                            {subtasks.map((subtask) => (
                                <SortableSubTask
                                    key={subtask.id}
                                    subtask={subtask}
                                    item={item}
                                />
                            ))}
                        </div>
                    </SortableContext>

                    {/* DragOverlay для красивого перетаскивания */}
                    <DragOverlay>
                        {activeSubTask ? (
                            <SortableSubTask
                                subtask={activeSubTask}
                                item={item}
                                isDragOverlay={true}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}
        </div>
    );
}