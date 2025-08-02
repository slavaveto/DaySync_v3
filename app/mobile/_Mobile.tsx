import React, {useEffect, useRef, useState} from "react";
import clsx from "clsx";
import {useMainContext} from "@/app/context";
import {useWindowSize} from "@/app/utils/useWindowSize";
import {UploadButton} from '@/app/utils/sync/UploadButton';
import {DownloadButton} from '@/app/utils/sync/DownloadButton';
import {Settings} from '@/app/main/Settings';
import {useDevice} from '@/app/utils/providers/MobileDetect';
import {QuickNotesMobile} from './QuickNotesMobile';
import {MonthMobile} from "./MonthMobile";
import {useReactiveToday} from "@/app/utils/useReactiveToday";
import {format} from "date-fns";
import {VerticalResizer} from "./VerticalResizer";
import {useVerticalResizableLayout} from "./useVerticalResizableLayout";

interface Props {
    setFirstLoadFadeIn: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Mobile({setFirstLoadFadeIn}: Props) {
    const {
        items, setItems, isUploadingData, isUserActive, syncTimeoutProgress, isDownloadingData,
    } = useMainContext();

    const reactiveToday = useReactiveToday();
    const today = new Date(reactiveToday.year, reactiveToday.month - 1, reactiveToday.day);
    const todayKey = format(today, "yyyy-MM-dd");

    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [visibleMonths, setVisibleMonths] = useState<string[]>([]);
    const calendarRef = useRef<{ scrollToToday?: () => void }>({});

    const {forcedMode, isMobile, isTablet, isDesktop} = useDevice();

    document.documentElement.classList.add('mobile-touch-lock');
    document.body.classList.add('mobile-touch-lock');

    const {winHeight, winWidth} = useWindowSize();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [listHeight, setListHeight] = useState(0);
    useEffect(() => {
        setListHeight(winHeight);     // mobile offset
    }, [winHeight, winWidth, isMobile]);

    const {
        topPanelHeight,
        isResizing: isVerticalResizing,
        containerRef: verticalContainerRef,
        handleMouseDown: handleVerticalMouseDown,
        handleTouchStart: handleVerticalTouchStart
    } = useVerticalResizableLayout({
        initialHeight: 350, minHeight: 300, maxHeight: 500, persistKey: 'topPanelHeightMobile'
    });

    return (


        <div
            ref={verticalContainerRef}
            className={clsx(
                "relative flex flex-col",
                "container mx-auto",
            )}
            style={{maxWidth: `550px`}}
        >

            <div className={clsx(
                "absolute top-0 right-0 z-40",
            )}>

                <UploadButton/>
                <DownloadButton/>
                <Settings
                    isOpenAction={isSettingsOpen}
                    setIsOpenAction={setIsSettingsOpen}
                    setFirstLoadFadeIn={setFirstLoadFadeIn}
                />

            </div>

            <div
                className="overflow-hidden z-10"
                style={{height: `${topPanelHeight}px`}}
            >
                {(() => {
                    const commonProps = {
                        onVisibleMonthsChange: setVisibleMonths,
                        onItemSelect: setSelectedItem,
                        selectedItem,
                    };

                    return (
                        <MonthMobile {...commonProps}/>
                    );
                })()}
            </div>

            <VerticalResizer
                isResizing={isVerticalResizing}
                onMouseDown={handleVerticalMouseDown}
                onTouchStart={handleVerticalTouchStart}
            />

            <div
                className={clsx(
                    "overflow-hidden overflow-y-auto z-50",
                )}
                style={{
                    height: `${listHeight - topPanelHeight - 16}px` // 10px для resizer'а
                }}
            >
                <QuickNotesMobile/>

            </div>

        </div>
    );
}