"use client";

import React, {useEffect, useRef, useState} from 'react';
import {MainProvider, useMainContext} from "@/app/context";
import {useWindowSize} from "@/app/utils/useWindowSize";
import {MonthToday} from "@/app/today/MonthToday";
import {QuickNotesTodayFixed} from "./QuickNotesTodayFixed";
import {QuickNotesToday} from "./QuickNotesToday";
import {QuickNotesProjects} from "./QuickNotesProjects";
import {useDevice} from "@/app/utils/providers/MobileDetect";
import {Spinner, Tab, Tabs} from "@heroui/react";
import usePersistentState from "@/app/utils/usePersistentState";
import {supabase} from "@/app/utils/dbase/supabaseClient";

import clsx from "clsx";
import DataInitializer from "@/app/utils/dbase/DataInitializer";
import {SignedIn, SignedOut, SignIn} from "@clerk/nextjs";
import {VerticalResizer} from "./VerticalResizer";
import {useVerticalResizableLayout} from "./useVerticalResizableLayout";
import ThemeToggle from "@/app/utils/providers/ThemeToggle";
import {useResizableLayout} from "./useResizableLayout";
import {Resizer} from "./Resizer";
import {QuickNotes} from "@/app/main/QuickNotes";

function TodayContent() {
    const {items, isUploadingData, isDownloadingData, userId, setClients} = useMainContext();
    const {forcedMode, isMobile, isTablet, isDesktop} = useDevice();
    const {winHeight, winWidth} = useWindowSize();

    const [todayActiveTab, setTodayActiveTab] = usePersistentState
    < "daysync" | "psyhelp" | "2weeks" > ("todayActiveTab", "daysync");

    // Управление анимацией загрузки
    const [firstLoadFadeIn, setFirstLoadFadeIn] = useState(false);
    const [showSpinner, setShowSpinner] = useState(true);
    useEffect(() => {
        const spinnerTimer = setTimeout(() => {
            setShowSpinner(false);
            setTimeout(() => {
                setFirstLoadFadeIn(true);
            }, 300);
        }, 700);
        return () => clearTimeout(spinnerTimer);
    }, []);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [listHeight, setListHeight] = useState(0);
    useEffect(() => {
        setListHeight(winHeight);     // mobile offset
    }, [winHeight, winWidth, isMobile]);

    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [visibleMonths, setVisibleMonths] = useState<string[]>([]);
    const calendarRef = useRef<{ scrollToToday?: () => void }>({});

    const {
        topPanelHeight,
        isResizing: isVerticalResizing,
        containerRef: verticalContainerRef,
        handleMouseDown: handleVerticalMouseDown
    } = useVerticalResizableLayout({
        initialHeight: 450, minHeight: 300, maxHeight: 600, persistKey: 'topPanelHeightToday',
    });

    const {
        rightPanelWidth, isResizing, containerRef, handleMouseDown, leftPanelWidth
    } = useResizableLayout({
        initialWidth: 250, minWidth: 200, maxWidth: 300, persistKey: 'headerRightPanelWidthToday'
    });

    // Загрузка данных из базы при монтировании компонента
    useEffect(() => {
        const loadClients = async () => {
            try {
                const {data, error} = await supabase
                    .from("clients")
                    .select("*")

                if (error) throw error;

                if (data) {
                    setClients(data);
                }
            } catch (e: any) {
                alert("Ошибка загрузки клиентов: " + e.message);
            }
        };
        loadClients();
    }, [setClients]);

    const bottomPanelHeightNum = winHeight - topPanelHeight - 4;


    // Гидратация для SSR
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(true);
    }, []);
    if (!hydrated) return null;

    return (
        <>
            <DataInitializer/>

            <div
                className={clsx(
                    "fixed inset-0 mt-[-30px] flex items-center justify-center z-50 transition-opacity duration-500",
                    showSpinner ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            >
                <Spinner size="lg" color="primary"/>
            </div>

            {!isMobile && (
                <div className={clsx(
                    "fixed bottom-3 right-3 flex gap-2 items-center text-[14px] px-2 py-1 rounded z-50",
                    firstLoadFadeIn ? "duration-500 opacity-100" : "duration-10 opacity-0",
                )}
                >
                    <ThemeToggle/>
                </div>
            )}

            <SignedOut>
                <div
                    className={clsx(
                        "fixed inset-0 mt-[-30px] flex items-center justify-center transition-opacity",
                        firstLoadFadeIn ? "duration-500 opacity-100" : "duration-10 opacity-0"
                    )}
                >
                    <SignIn
                        routing="hash"
                        appearance={{
                            elements: {
                                card: "bg-content2 dark:bg-content3",
                                headerTitle: "text-foreground",
                                formFieldLabel: "text-foreground",
                                formFieldInput: "bg-default-50 text-foreground",
                                formButtonPrimary: "text-white bg-default-700 dark:bg-default-300" +
                                    "hover:bg-default-600 dark:hover:bg-default-200" +
                                    "transition-color duration-200",
                                footer: "hidden",
                            },
                        }}
                    />
                </div>
            </SignedOut>

            <SignedIn>
                <div
                    ref={verticalContainerRef}
                    className={clsx(
                        "w-full transition-opacity",
                        firstLoadFadeIn ? "duration-500 opacity-100" : "duration-10 opacity-0"
                    )}
                >
                    {/*<QuickNotesTodayFixed/>*/}

                    <div className="overflow-hidden relative"
                         style={{height: `${topPanelHeight}px`}}
                    >
                        {(() => {
                            const commonProps = {
                                onVisibleMonthsChange: setVisibleMonths,
                                onItemSelect: setSelectedItem,
                                selectedItem,
                            };

                            return (
                                <MonthToday {...commonProps}/>
                            );
                        })()}

                    </div>

                    <VerticalResizer
                        isResizing={isVerticalResizing}
                        onMouseDown={handleVerticalMouseDown}
                    />

                    <div
                        ref={containerRef}

                        className="flex-1 flex flex-row h-full"
                        style={{height: `${bottomPanelHeightNum}px`}}
                    >
<div
    className="flex-1"
>
                        <Tabs
                            selectedKey={todayActiveTab}
                            onSelectionChange={(key) =>
                                setTodayActiveTab(key as "daysync" | "psyhelp" | "2weeks")
                            }
                            aria-label="Основные вкладки"
                            variant="underlined"
                            color="primary"
                            classNames={{
                                tab: "w-full px-2",
                                cursor: "w-full",
                                tabContent: "group-data-[selected=true]:font-medium",
                            }}
                        >
                            {/*<Tab key="week" title="1 Week"/>*/}
                            <Tab key="daysync" title="DaySync"/>
                            <Tab key="psyhelp" title="PsyHelp"/>
                            {/*<Tab key="3weeks" title="3 Weeks"/>*/}

                        </Tabs>

    {todayActiveTab === "daysync" && (
        <QuickNotesProjects height={bottomPanelHeightNum-35} project={"daysync"}/>
    )}

    {todayActiveTab === "psyhelp" && (
        <QuickNotesProjects height={bottomPanelHeightNum-35} project={"psyhelp"}/>
    )}

    </div>

                        <Resizer
                            isResizing={isResizing}
                            onMouseDown={handleMouseDown}
                        />

                        <div

                            style={{width: `${rightPanelWidth}px`}}
                        >
                            <QuickNotesToday height={bottomPanelHeightNum}/>


                        </div>



                    </div>

                </div>


        </SignedIn>
</>
    )
}

export default function TodayPage() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    return (
        <MainProvider>
            <DataInitializer/>
            <TodayContent/>
        </MainProvider>
    );
}