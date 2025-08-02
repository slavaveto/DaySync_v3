import React, { useMemo } from 'react';
import { useMainContext } from "@/app/context";
import { format, addDays } from 'date-fns';
import clsx from 'clsx';
import { addMonths } from 'date-fns';
import { ru } from "date-fns/locale";
import { Select, SelectItem } from "@heroui/react";
import usePersistentState from "@/app/utils/usePersistentState";

interface PaymentTasksProps {
    tableWidth?: number;
    selectedMonth: string;
    uyuRate: number;
}

interface PaymentSubtask {
    subtaskText: string;
    amount: string;
    currency: string;
}

interface GroupedPaymentTask {
    taskId: number;
    taskTitle: string;
    dueDate: string;
    category: string;
    subtasks: PaymentSubtask[];
}

export const PaymentTasks = ({ tableWidth = 800, selectedMonth, uyuRate }: PaymentTasksProps) => {
    const { items } = useMainContext();





    const groupedPaymentTasks = useMemo(() => {
        const today = new Date();
        const taskGroups = new Map<number, GroupedPaymentTask>();
        // Определяем диапазон дат для выбранного месяца
        const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
        const monthStart = new Date(selectedYear, selectedMonthNum - 1, 1);
        const monthEnd = new Date(selectedYear, selectedMonthNum, 0);

        for (let date = new Date(monthStart); date <= monthEnd; date.setDate(date.getDate() + 1)) {
            const dateKey = format(date, 'yyyy-MM-dd');

        // // Проходим по всем задачам начиная с сегодня
        // for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
        //     const currentDate = addDays(today, dayOffset);
        //     const dateKey = format(currentDate, 'yyyy-MM-dd');

            // Фильтруем задачи на эту дату
            const dayTasks = items.filter(item =>
                item.due_date === dateKey &&
                item.type === 'task' &&
                !item.is_deleted &&
                !item.is_done &&
                item.due_date &&
                (item.task_category === 'pay' || item.task_category === 'monthly_pay')
            );

            // Проверяем подзадачи
            dayTasks.forEach(task => {
                if (task.subtasks) {
                    task.subtasks.forEach(subtask => {
                        if (subtask.is_done) return;

                        if (subtask.title && (subtask.title.startsWith('$') || subtask.title.startsWith('₱'))) {
                            const currency = subtask.title.startsWith('$') ? 'USD' : 'Peso';

                            // Убираем символ валюты и извлекаем только числа
                            const textAfterCurrency = subtask.title.substring(1).trim();
                            const numberMatch = textAfterCurrency.match(/[\d,]+\.?\d*/);
                            const amount = numberMatch ? numberMatch[0] : '0';

                            // Извлекаем описание после дефиса
                            const dashIndex = subtask.title.indexOf('-');
                            let description = dashIndex !== -1
                                ? subtask.title.substring(dashIndex + 1).trim()
                                : subtask.title;

                            // Если описание состоит только из суммы (начинается с $ или ₱), убираем все
                            if (description.match(/^[\$₱][\d,]+\.?\d*$/)) {
                                description = task.title;
                            }

                            // Добавляем в группу или создаем новую
                            if (!taskGroups.has(task.id)) {
                                taskGroups.set(task.id, {
                                    taskId: task.id,
                                    taskTitle: task.title,
                                    dueDate: task.due_date!,
                                    category: task.task_category || '',
                                    subtasks: []
                                });
                            }

                            taskGroups.get(task.id)!.subtasks.push({
                                subtaskText: description,
                                amount,
                                currency
                            });
                        }
                    });
                }
            });
        }

        return Array.from(taskGroups.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }, [items, selectedMonth]);

    const totalUSD = useMemo(() => {
        return groupedPaymentTasks.reduce((total, taskGroup) => {
            const taskTotal = taskGroup.subtasks.reduce((subtotal, subtask) => {
                const amount = parseFloat(subtask.amount.replace(/,/g, ''));
                const usdAmount = subtask.currency === 'USD'
                    ? amount
                    : amount * uyuRate;
                return subtotal + usdAmount;
            }, 0);
            return total + taskTotal;
        }, 0);
    }, [groupedPaymentTasks, uyuRate]);

    const COLUMNS = [
        { key: 'dueDate', width: 100, align: 'center' as const, title: 'Дата' },
        { key: 'taskTitle', width: 200, align: 'left' as const, title: 'Задача' },
        // { key: 'category', width: 120, align: 'center' as const, title: 'Категория' },
        { key: 'amount', width: 80, align: 'right' as const, title: 'Сумма' },
        { key: 'currency', width: 60, align: 'center' as const, title: 'Валюта' },
        { key: 'amountUSD', width: 80, align: 'right' as const, title: `$${totalUSD.toFixed(0)}` }, // новая колонка
        { key: 'subtaskText', width: 240, align: 'left' as const, title: 'Описание' },
    ];

    return (
        <div className="space-y-0" style={{width: `${tableWidth}px`}}>
            {/* HEADER */}
            <div className="bg-primary-50 border border-primary-200 rounded-md">
                <div className="relative flex h-[30px] items-center text-[14px] font-semibold">
                    {COLUMNS.map((col, index) => (
                        <div
                            key={col.key}
                            className={clsx(
                                "absolute flex items-center h-full text-primary-700 border-r border-primary-200 last:border-r-0",
                                col.align === 'center' && "justify-center",
                                col.align === 'left' && "justify-start pl-3",
                                col.align === 'right' && "justify-end pr-3"
                            )}
                            style={{
                                left: `${COLUMNS.slice(0, index).reduce((sum, c) => sum + c.width, 0)}px`,
                                width: `${col.width}px`
                            }}
                        >
                            {col.title}
                        </div>
                    ))}
                </div>
            </div>

            {/* ROWS */}
            <div className="rounded-md overflow-hidden border border-default-300">
                {groupedPaymentTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-[60px] text-default-500">
                        Нет платежных задач с $ или ₱
                    </div>
                ) : (
                    groupedPaymentTasks.map((taskGroup, groupIndex) => (
                        <React.Fragment key={taskGroup.taskId}>
                            {taskGroup.subtasks.map((subtask, subtaskIndex) => (
                                <div
                                    key={`${taskGroup.taskId}-${subtaskIndex}`}
                                    className={clsx(
                                        "relative flex h-[30px] items-center last:border-0 border-b border-default-300 hover:bg-primary-50 transition-all duration-200 text-[14px]",
                                        groupIndex % 2 === 1 && "bg-primary-50/70"
                                    )}
                                >
                                    {COLUMNS.map((col, colIndex) => (
                                        <div
                                            key={col.key}
                                            className={clsx(
                                                "absolute flex items-center h-full border-r border-default-200 last:border-r-0",
                                                col.align === 'center' && "justify-center",
                                                col.align === 'left' && "justify-start pl-3",
                                                col.align === 'right' && "justify-end pr-3"
                                            )}
                                            style={{
                                                left: `${COLUMNS.slice(0, colIndex).reduce((sum, c) => sum + c.width, 0)}px`,
                                                width: `${col.width}px`
                                            }}
                                        >
                                            {/* Показываем данные задачи только в первой строке группы */}
                                            {col.key === 'dueDate' && subtaskIndex === 0 && (
                                                <span className="font-medium">
                                                    {format(new Date(taskGroup.dueDate), 'dd.MM')}
                                                </span>
                                            )}
                                            {col.key === 'taskTitle' && subtaskIndex === 0 && (
                                                <span className="truncate font-medium" title={taskGroup.taskTitle}>
                                                    {taskGroup.taskTitle}
                                                </span>
                                            )}
                                            {col.key === 'category' && subtaskIndex === 0 && (
                                                <span className={clsx(
                                                    "font-medium",
                                                    taskGroup.category === 'pay' ? 'text-blue-600' : 'text-green-600'
                                                )}>
                                                    {taskGroup.category === 'pay' ? 'Оплата' : 'Ежемес.'}
                                                </span>
                                            )}

                                            {/* Данные подзадач показываем в каждой строке */}
                                            {col.key === 'amount' && subtask.amount}
                                            {col.key === 'currency' && (
                                                <span className={clsx(
                                                    subtask.currency === 'USD' ? 'text-green-600' : 'text-orange-600'
                                                )}>
                                                    {subtask.currency}
                                                </span>
                                            )}
                                            {col.key === 'subtaskText' && (
                                                <span className="truncate" title={subtask.subtaskText}>
                                                    {subtask.subtaskText}
                                                </span>
                                            )}
                                            {col.key === 'amountUSD' && (
                                                <span className="text-green-600">
                                                    {subtask.currency === 'USD'
                                                        ? subtask.amount
                                                        : (parseFloat(subtask.amount.replace(/,/g, '')) * uyuRate).toFixed(0)
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </React.Fragment>
                    ))
                )}
            </div>
        </div>
    );
};