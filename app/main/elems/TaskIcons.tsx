import React from 'react';
import { Repeat2, ShoppingCart, CreditCard,
    PhoneCall, DollarSign, RussianRuble } from "lucide-react";
import { RiCake2Line } from "react-icons/ri";
import { ICON_SIZES } from "@/app/main/droppable/dndStyles";
import clsx from "clsx";

interface TaskIconsProps {
    dayItem: any;
    hasAnyIcon: boolean;
}

export const TaskIcons = React.memo(({ dayItem, hasAnyIcon }: TaskIconsProps) => {
    const grayStyle = "text-default-400 dark:text-default-400 ";
    const prymaryStyle = "text-primary-400 dark:text-primary-400/80 ";
    const successStyle = "text-success-500 dark:text-success-400/80 ";
    const warningStyle = "!text-orange-400 dark:!text-orange-600/80 ";
    const dangerStyle = "!text-danger-400/80 dark:!text-danger-400/80 ";

    return (
        <div
            className={clsx(
                "flex-shrink-0 flex gap-[3px] items-center",
                hasAnyIcon && "w-[22px] justify-center",
            )}
        >
            {dayItem.is_repeated && !dayItem.task_category && (
                <p className={clsx("ml-[-1px]")}>
                    <Repeat2
                        size={ICON_SIZES.dt - 5}
                        strokeWidth={dayItem.task_priority ? 2.5 : 2}
                        className={clsx(
                            prymaryStyle,
                            dayItem.task_priority === "important" && warningStyle,
                            dayItem.task_priority === "very_important" && dangerStyle,
                            "rotate-90"
                        )}
                    />
                </p>
            )}

            {dayItem.task_priority === "important" && !dayItem.is_repeated && !dayItem.task_category && (
                <div className={clsx(
                    warningStyle + "font-bold text-[16px]",
                )}>
                    !
                </div>
            )}

            {dayItem.task_priority === "very_important" && !dayItem.is_repeated && !dayItem.task_category && (
                <div className={clsx(
                    dangerStyle + "font-bold text-[16px]",
                )}>
                    !
                </div>
            )}

            {dayItem.task_category === "question" && (
                <div className={clsx(
                    prymaryStyle + "font-semibold text-[14px]",
                    dayItem.task_priority === "important" && warningStyle + "font-semibold",
                    dayItem.task_priority === "very_important" && dangerStyle + "font-semibold",
                )}>
                    ?
                </div>
            )}

            {dayItem.task_category === "buy" && (
                <div className={clsx(
                    "ml-[-2px]",
                    prymaryStyle,
                    dayItem.task_priority === "important" && warningStyle,
                    dayItem.task_priority === "very_important" && dangerStyle
                )}>
                    <ShoppingCart size={ICON_SIZES.dt - 5}/>
                </div>
            )}

            {dayItem.task_category === "pay" && (
                <div className={clsx(
                    "ml-[-1px]",
                    prymaryStyle,
                    dayItem.task_priority === "important" && warningStyle + "font-medium",
                    dayItem.task_priority === "very_important" && dangerStyle + "font-medium"
                )}>
                    <CreditCard size={ICON_SIZES.dt - 5}/>
                </div>
            )}

            {dayItem.task_category === "monthly_pay" && (
                <div className={clsx(
                    "ml-[-1px]",
                    successStyle,
                    dayItem.task_priority === "important" && warningStyle + "font-medium",
                    dayItem.task_priority === "very_important" && dangerStyle + "font-medium"
                )}>
                    <DollarSign size={ICON_SIZES.dt - 5}/>
                </div>
            )}

            {dayItem.task_category === "ruble_pay" && (
                <div className={clsx(
                    "ml-[-1px]",
                    successStyle,
                    dayItem.task_priority === "important" && warningStyle + "font-medium",
                    dayItem.task_priority === "very_important" && dangerStyle + "font-medium"
                )}>
                    <RussianRuble size={ICON_SIZES.dt - 5}/>
                </div>
            )}

            {dayItem.task_category === "call" && (
                <p className={clsx(" ")}>
                    <PhoneCall
                        size={ICON_SIZES.dt - 8}
                        strokeWidth={2}
                        className={clsx(
                            prymaryStyle,
                            dayItem.task_priority === "important" && warningStyle,
                            dayItem.task_priority === "very_important" && dangerStyle
                        )}
                    />
                </p>
            )}

            {dayItem.task_category === "birthday" && (
                <p className={clsx("mt-[-1px] ")}>
                    <RiCake2Line
                        size={ICON_SIZES.dt - 5}
                        className={clsx(
                            warningStyle,
                            dayItem.task_priority === "important" && warningStyle,
                            dayItem.task_priority === "very_important" && dangerStyle
                        )}
                    />
                </p>
            )}
        </div>
    );
});