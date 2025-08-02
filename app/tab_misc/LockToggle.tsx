import React from 'react';
import { Tabs, Tab } from "@heroui/react";
import { Lock, LockOpen } from "lucide-react";

interface LockToggleProps {
    isLocked: boolean;
    onLockChange: (locked: boolean) => void;
}

export const LockToggle = ({ isLocked, onLockChange }: LockToggleProps) => {
    return (
        <Tabs
            aria-label="Блокировка/разблокировка"
            color={isLocked ? "danger" : "success"}
            size="sm"
            selectedKey={isLocked ? "locked" : "unlocked"}
            onSelectionChange={(key) => {
                onLockChange(key === "locked");
            }}
            classNames={{
                tabList: "gap-[0px] p-[1px] rounded-[10px] border border-default-200",
                tab: "h-[22px] px-[9px] rounded-small",
                tabContent: "group-data-[selected=true]:text-white",
            }}
        >
            <Tab
                key="locked"
                title={
                    <div className="flex items-center">
                        <Lock size={14}/>
                    </div>
                }
            />

            <Tab
                key="unlocked"
                title={
                    <div className="flex items-center">
                        <LockOpen size={14}/>
                    </div>
                }
            />
        </Tabs>
    );
};