'use client';

import { Tabs, Tab } from '@heroui/react';
import { LightThemeIcon, DarkThemeIcon, AutoThemeIcon } from '@/app/utils/providers/themeIcons';
import React from 'react';
import {Smartphone, Monitor, CalendarDays, CalendarCheck} from "lucide-react";

interface TasksMeetingsToggleProps {
    monthViewMode: boolean;
    onMonthViewModeChange: (value: boolean) => void;
}

const TasksMeetingsToggle: React.FC<TasksMeetingsToggleProps> = ({
                                                                     monthViewMode,
                                                                     onMonthViewModeChange
                                                                 }) => {


    return (
        <Tabs
            aria-label="Выбор темы"
            color="default"
            size="sm"

            selectedKey={monthViewMode ? "meetings" : "tasks"}
            onSelectionChange={(key) => {
                onMonthViewModeChange(key === "meetings");
            }}

            classNames={{
                tabList: "gap-[0px] p-[1px] rounded-[10px] border border-default-200",
                tab: "h-[22px] px-[8px] rounded-small",
                tabContent: "group-data-[selected=true]:text-primary-400",
            }}
        >
            <Tab
                key="tasks"
                title={
                    <div className="flex items-center">
                        <CalendarCheck size={16}/>
                    </div>
                }
            />

            <Tab
                key="meetings"
                title={
                    <div className="flex items-center">
                        <CalendarDays size={16}/>
                    </div>
                }
            />

        </Tabs>
    );
};


export default TasksMeetingsToggle;
