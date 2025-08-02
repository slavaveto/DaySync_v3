'use client';

import { Tabs, Tab } from '@heroui/react';
import React from 'react';
import { List, Clock } from "lucide-react";

interface TimeListToggleProps {
    showTimeLines: boolean;
    onShowTimeLinesChange: (value: boolean) => void;
}

const TimeListToggle: React.FC<TimeListToggleProps> = ({
                                                           showTimeLines,
                                                           onShowTimeLinesChange
                                                       }) => {
    return (
        <Tabs
            aria-label="Переключение список/время"
            color="default"
            size="sm"
            selectedKey={showTimeLines ? "time" : "list"}
            onSelectionChange={(key) => {
                onShowTimeLinesChange(key === "time");
            }}
            classNames={{
                tabList: "gap-[0px] p-[1px] rounded-[10px] border border-default-200",
                tab: "h-[22px] px-[9px] rounded-small",
                tabContent: "group-data-[selected=true]:text-primary-400",
            }}
        >
            <Tab
                key="list"
                title={
                    <div className="flex items-center">
                        <List size={14}/>
                    </div>
                }
            />

            <Tab
                key="time"
                title={
                    <div className="flex items-center">
                        <Clock size={14}/>
                    </div>
                }
            />
        </Tabs>
    );
};

export default TimeListToggle;