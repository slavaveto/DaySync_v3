'use client';

import { Tabs, Tab } from '@heroui/react';
import { LightThemeIcon, DarkThemeIcon, AutoThemeIcon } from '@/app/init/providers/themeIcons';
import React from 'react';
import {Smartphone, Monitor} from "lucide-react";
import {useDevice} from "@/app/init/providers/MobileDetect";


const MobDtToggle: React.FC = () => {

    const { forcedMode, setForcedMode } = useDevice();

    return (
        <Tabs
            aria-label="Выбор темы"
            color="default"
            size="sm"
            selectedKey={forcedMode === "mobile" ? "mobile" : "auto"}
            onSelectionChange={key => {
                if (setForcedMode) {
                    if (key === "mobile") setForcedMode("mobile");
                    else setForcedMode(null);
                }
            }}
            classNames={{
                tabList: "gap-[0px] sm:gap-[0px] p-[1px] rounded-[10px] border border-default-200",
                // tab: "h-[34px] md:h-[30px] px-[10px] md:px-[8px] rounded-small",
                tab: "h-[28px] md:h-[30px] px-[10px] md:px-[8px] rounded-small",
                tabContent: "group-data-[selected=true]:text-primary-400",
            }}
        >
            <Tab
                key="auto"
                title={
                    <div className="flex items-center">
                        <Monitor size={16}/>
                    </div>
                }
            />

            <Tab
                key="mobile"
                title={
                    <div className="flex items-center">
                        <Smartphone size={16}/>
                    </div>
                }
            />

        </Tabs>
    );
};


export default MobDtToggle;
