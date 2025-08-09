'use client';

import { Tabs, Tab } from '@heroui/react';
import { LightThemeIcon, DarkThemeIcon, AutoThemeIcon } from '@/app/init/providers/themeIcons';
import React from 'react';
import { useTheme } from '@/app/init/providers/ThemeProvider';

const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme();

    return (
        <Tabs
            aria-label="Выбор темы"
            color="default"
            size="sm"
            selectedKey={theme}
            onSelectionChange={(key) => setTheme(key as 'light' | 'dark' | 'system')}
            classNames={{
                tabList: "gap-[0px] sm:gap-[0px] p-[1px] rounded-[10px] border border-default-200",
                tab: "h-[28px] md:h-[30px] px-[10px] md:px-[8px] rounded-small",
                tabContent: "group-data-[selected=true]:text-primary-400",
            }}
        >
            <Tab
                key="light"
                title={
                    <div className="flex items-center">
                        <LightThemeIcon />
                    </div>
                }
            />
            <Tab
                key="system"
                title={
                    <div className="flex items-center">
                        <AutoThemeIcon />
                    </div>
                }
            />
            <Tab
                key="dark"
                title={
                    <div className="flex items-center">
                        <DarkThemeIcon />
                    </div>
                }
            />
        </Tabs>
    );
};


export default ThemeToggle;
