import React from 'react';
import { Repeat2, ShoppingCart, CreditCard, PhoneCall, Hospital, Cross } from "lucide-react";
import { RiCake2Line } from "react-icons/ri";
import { ICON_SIZES } from "@/app/main/droppable/dndStyles";
import clsx from "clsx";
import { MdOutlineSportsTennis } from "react-icons/md";


interface TaskIconsProps {
    dayItem: any;
    meetingHasAnyIcon: boolean;
    is_narrow: boolean;
}

export const MeetingIcons = React.memo(({ dayItem, meetingHasAnyIcon, is_narrow }: TaskIconsProps) => {
    const grayStyle = "text-default-400 dark:text-default-400 ";
    const prymaryStyle = "text-primary-400 dark:text-primary-400/80 ";
    const warningStyle = "!text-orange-400 dark:!text-orange-600/80 ";
    const dangerStyle = "!text-danger-400/80 dark:!text-danger-400/80 ";

    return (
        <div
            className={clsx(
                "flex-shrink-0 flex gap-[3px] items-center",
                meetingHasAnyIcon && "w-[18px] ml-[-4px] justify-center",
                dayItem.all_day_meeting && meetingHasAnyIcon && "w-[22px] ml-[0px] justify-center",
                meetingHasAnyIcon && is_narrow && "w-[8px] ml-[-4px]",
            )}
        >

            {dayItem.task_priority === "important" && !dayItem.meeting_tag && (
                <div className={clsx(
                    warningStyle + "font-bold text-[16px] mt-[-1px]",
                )}>
                    !
                </div>
            )}

            {dayItem.task_priority === "very_important" &&  !dayItem.meeting_tag && (
                <div className={clsx(
                    dangerStyle + "font-bold text-[16px] mt-[-1px]",
                )}>
                    !
                </div>
            )}

            {dayItem.meeting_tag === "question" && (
                <div className={clsx(
                    prymaryStyle + "font-medium text-[14px] mt-[-1px]",
                    dayItem.task_priority === "important" && warningStyle + "font-medium",
                    dayItem.task_priority === "very_important" && dangerStyle + "font-medium",
                    is_narrow && "!text-[12px]",
                )}>
                    ?
                </div>
            )}

            {dayItem.meeting_tag === "buy" && (
                <div className={clsx(
                    "ml-[-2px]",
                    prymaryStyle,
                    dayItem.task_priority === "important" && warningStyle,
                    dayItem.task_priority === "very_important" && dangerStyle
                )}>
                    <ShoppingCart size={ICON_SIZES.dt - 5}/>
                </div>
            )}

            {dayItem.meeting_tag === "tennis" && (
                <div className={clsx(
                    "ml-[-1px]",
                    prymaryStyle,
                    dayItem.task_priority === "important" && warningStyle + "font-medium",
                    dayItem.task_priority === "very_important" && dangerStyle + "font-medium"
                )}>
                    <MdOutlineSportsTennis size={ICON_SIZES.dt - 5}/>
                </div>
            )}

            {dayItem.meeting_tag === "call" && (
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

            {dayItem.meeting_tag === "health" && (
                <p className={clsx(" ")}>
                    <Cross
                        size={ICON_SIZES.dt - 5}
                        strokeWidth={2}
                        className={clsx(
                            prymaryStyle,
                            dayItem.task_priority === "important" && warningStyle,
                            dayItem.task_priority === "very_important" && dangerStyle
                        )}
                    />
                </p>
            )}

            {dayItem.meeting_tag === "birthday" && (
                <p className={clsx("mt-[-1px] ml-[-1px]")}>
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