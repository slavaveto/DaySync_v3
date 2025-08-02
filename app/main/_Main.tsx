import React, {useEffect, useRef, useState} from "react";
import clsx from "clsx";
import {useMainContext} from "@/app/context";
import {useWindowSize} from "@/app/utils/useWindowSize";
import usePersistentState from "@/app/utils/usePersistentState"
import {Month} from "@/app/main/Month";
import {MiscTab} from "@/app/tab_misc/_MiscTab";
import {useTaskCounter} from '@/app/main/utils/useTaskCounter';
import {useResizableLayout} from "@/app/main/right_panel/useResizableLayout";
import {Resizer} from "@/app/main/right_panel/Resizer";
import {useVerticalResizableLayout} from "@/app/main/right_panel/useVerticalResizableLayout";

import {Header} from "@/app/main/Header";
import RightPanel from "@/app/main/RightPanel";
import {useDndContext} from "@/app/context_dnd";
import {useMiscTabContext} from "@/app/context_misc";

interface Props {
    setFirstLoadFadeIn: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Main({setFirstLoadFadeIn}: Props) {
    const {
        items, setItems, isUploadingData, isUserActive, syncTimeoutProgress, isDownloadingData,} = useMainContext();
    const {activeMainTab, activeMiscTab, setActiveMiscTab, selectedMonth, setSelectedMonth} = useMiscTabContext();

    const {weeks, setWeeks} = useDndContext();


    // useEffect(() => {
    //     // Читаем из localStorage
    //     const storedItems = JSON.parse(localStorage.getItem('items') || '[]');
    //     const filteredItems = storedItems.filter((item: any) => !('is_delete' in item));
    //
    //     // Сохраняем обратно в localStorage
    //     if (storedItems.length !== filteredItems.length) {
    //         localStorage.setItem('items', JSON.stringify(filteredItems));
    //         console.log('Удалено элементов с is_delete:', storedItems.length - filteredItems.length);
    //
    //         // Обновляем состояние
    //         setItems(filteredItems);
    //     }
    // }, []);

    const {winHeight, winWidth} = useWindowSize();
    const headerHeight = 60;
    const listHeight = winHeight - headerHeight;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const calendarRef = useRef<{ scrollToToday?: () => void }>({});
    const [visibleMonths, setVisibleMonths] = useState<string[]>([]);
    const [addClientModalOpen, setAddClientModalOpen] = useState(false);

    const {} = useTaskCounter(items);

    const {
        rightPanelWidth, isResizing, containerRef, handleMouseDown, leftPanelWidth
    } = useResizableLayout({
        initialWidth: 260, minWidth: 260, maxWidth: 500, persistKey: 'headerRightPanelWidth'
    });
    const {
        topPanelHeight,
        isResizing: isVerticalResizing,
        containerRef: verticalContainerRef,
        handleMouseDown: handleVerticalMouseDown
    } = useVerticalResizableLayout({
        initialHeight: 300, minHeight: 200, maxHeight: 400, persistKey: 'rightPanelTopHeight'
    });

    const [selectedItem, setSelectedItem] = useState<any>(null);
    useEffect(() => {
        if (selectedItem) {
            // Находим обновленную версию selectedItem в items
            const updatedSelectedItem = items.find(i => i.id === selectedItem.id);
            if (updatedSelectedItem) {
                setSelectedItem(updatedSelectedItem); // обновляем selectedItem
            }
        }
    }, [items]);

    useEffect(() => {
        const weeksMap = {
            "lists": 0,
            "week": 1,
            "2weeks": 2,
            "3weeks": 3,
            "month": 5,
            "misc": 0,
            "money": 0,
        };

        if (activeMainTab !== "misc") {
            setWeeks(weeksMap[activeMainTab]);
        }
    }, [activeMainTab, setWeeks]);

    return (
        <div className="flex flex-row" ref={containerRef}>

            <div className="h-screen flex flex-col"
                 style={{width: `calc(100vw - ${rightPanelWidth}px)`}}
            >

                <Header
                    headerHeight={headerHeight}
                    rightPanelWidth={rightPanelWidth}
                    visibleMonths={visibleMonths}
                    calendarRef={calendarRef}
                    setAddClientModalOpen={setAddClientModalOpen}
                    isUploadingData={isUploadingData}
                    isDownloadingData={isDownloadingData}
                    syncTimeoutProgress={syncTimeoutProgress}
                    isUserActive={isUserActive}
                    isSettingsOpen={isSettingsOpen}
                    setIsSettingsOpen={setIsSettingsOpen}
                    setFirstLoadFadeIn={setFirstLoadFadeIn}
                />

                {/*/!* Контент табов *!/*/}
                <div className="flex-1">
                    {(() => {
                        const commonProps = {
                            listHeight,
                            registerScrollToToday: (fn: () => void) => {
                                calendarRef.current.scrollToToday = fn
                            },
                            onVisibleMonthsChange: setVisibleMonths,
                            onItemSelect: setSelectedItem,
                            selectedItem,
                        };

                        return (
                            <>
                                {activeMainTab === "week" && <Month {...commonProps}/>}
                                {activeMainTab === "2weeks" && <Month {...commonProps}/>}
                                {activeMainTab === "3weeks" && <Month {...commonProps}/>}
                                {activeMainTab === "month" && <Month {...commonProps}/>}
                                {activeMainTab === "misc" && (
                                    <MiscTab
                                        addClientModalOpen={addClientModalOpen}
                                        setAddClientModalOpen={setAddClientModalOpen}
                                    />
                                )}

                            </>
                        );
                    })()}
                </div>
            </div>

            <Resizer
                isResizing={isResizing}
                onMouseDown={handleMouseDown}
            />

            {/* Правая панель с вертикальным разделением */}
            <RightPanel
                rightPanelWidth={rightPanelWidth}
                topPanelHeight={topPanelHeight}
                isVerticalResizing={isVerticalResizing}
                handleVerticalMouseDown={handleVerticalMouseDown}
                verticalContainerRef={verticalContainerRef}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
            />


        </div>
    );
}