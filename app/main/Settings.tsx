import {useEffect} from "react"; // если ещё не импортирован
import React from 'react';
import clsx from "clsx";
import {useDevice} from '@/app/utils/providers/MobileDetect';
import {useSwipeable} from "react-swipeable";

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
    DrawerFooter,
    Select,
    SelectItem,
    Button, Chip
} from "@heroui/react";
import {useMainContext} from "@/app/context";
import {Settings as SettingsIcon, RefreshCcw, LogOut, CloudUpload, CloudDownload} from "lucide-react";

import type {Selection} from "@react-types/shared";
import {SignOutButton} from "@clerk/nextjs";

interface Props {
    isOpenAction: boolean;
    setIsOpenAction: (open: boolean) => void;
    setFirstLoadFadeIn: (fade: boolean) => void;
}

export const Settings: React.FC<Props> = ({isOpenAction, setIsOpenAction, setFirstLoadFadeIn}) => {

    const {forcedMode, isMobile, isTablet, isDesktop} = useDevice();

    // 1️⃣  функция-шорткат для закрытия
    const closeDrawer = () => setIsOpenAction(false);

    const swipeHandlers = useSwipeable({
        onSwipedUp: () => closeDrawer(),   // drawer сверху → свайп ↑ закрывает
        // onSwipedDown: () => closeDrawer(), // если откроете снизу
        delta: 60,                       // порог в px, чтобы избежать ложных срабатываний
        trackTouch: true,
        trackMouse: false,               // мышкой «закрывать» не нужно
    });

    {/*{...swipeHandlers}*/}

    const {
        items, setItems, maxContentWidth, userId, hasLocalChanges, isUploadingData,
        isDownloadingData,
    } = useMainContext();

    const handleReset = () => {
        setIsOpenAction(false);
        setTimeout(() => {
            setFirstLoadFadeIn(false);
            setTimeout(() => location.reload(), 500);
        }, 300);
    };

    return (
        <>

            {isMobile ? (
            <button
                className={clsx(
                    "transition-all bg-background/50 duration-300 text-default-500 z-50 h-[50px] w-[60px]",
                    "flex items-center justify-center",
                    (hasLocalChanges || isUploadingData) && "text-warning !opacity-100",
                    isDownloadingData  && "text-success"
                )}
                onClick={() => setIsOpenAction(true)}
            >
                {/*<SettingsIcon*/}
                {/*    size={isMobile ? 26 : 22}*/}
                {/*    className="rotate-[30deg]"*/}
                {/*/>*/}
                {isUploadingData ? (
                    <CloudUpload
                        strokeWidth={2}
                        size={isMobile ? 26 : 22}
                        className="animate-pulse-icon"
                    />
                ) : isDownloadingData ? (
                    <CloudDownload
                        strokeWidth={2}
                        size={isMobile ? 26 : 22}
                        className="animate-pulse-icon"
                    />
                ) : (
                    <SettingsIcon
                        size={isMobile ? 26 : 22}
                        className="rotate-[30deg]"
                    />
                )}
            </button>
                ): (
                    <button
                        className={clsx(
                            "transition-all duration-300 text-default-500",
                            !isMobile && "hover:text-default-700",
                            // (hasLocalChanges || isUploadingData) && "text-warning !opacity-100",
                            // isDownloadingData && "text-success"
                        )}
                        onClick={() => setIsOpenAction(true)}
                    >
                        <SettingsIcon
                            size={isMobile ? 26 : 22}
                            className="rotate-[30deg]"
                        />
                    </button>
                )}

                < Drawer isOpen={isOpenAction} onClose={() => setIsOpenAction(false)}
className={""}
                placement="top"
                motionProps={{
                variants: {
                //@ts-expect-error
                enter: {opacity: 1, y: 0, duration: 0.3},
                //@ts-expect-error
                exit: {y: -100, opacity: 0, duration: 0.3},
            },
            }}
                classNames={{
                //wrapper: `w-[calc(100%-24px)] max-w-[${maxContentWidth}px] mx-auto`,
                header: "pt-[20px]",
                closeButton: "top-[10px] right-[10px] text-[22px]",
            }}
                >
                <DrawerContent

                className={`w-[calc(100%-24px)] max-w-[${maxContentWidth}px] mx-auto`}
                style={{
                maxWidth: `${maxContentWidth}px`,
                marginLeft: "auto",
                marginRight: "auto",
            }}
                >
                <DrawerHeader className="flex flex-row justify-between px-[12px] items-center ">
                Настройки
                </DrawerHeader>

                    <DrawerBody className="px-[12px]">
                        <div className="mt-3">
                            <h3 className="text-md font-semibold  mb-3"></h3>

                        </div>
                    </DrawerBody>

                    <DrawerFooter className="px-[12px] flex gap-4 mt-3 items-center">

                        <SignOutButton>
                            {/*<button*/}
                            {/*    className={clsx(*/}
                            {/*        "transition-all duration-300",*/}
                            {/*        "hover:text-danger-500",*/}
                            {/*    )}*/}
                            {/*>*/}
                            {/*    <LogOut size={22}/>*/}
                            {/*</button>*/}

                            <Button size={"md"} variant="flat" color={"warning"}>
                                <LogOut size={22}/> SignOut
                            </Button>

                        </SignOutButton>

                        <Button size={"md"} variant="flat" onPress={handleReset}
                                color={"success"}>
                            <RefreshCcw id="refresh-icon" size={20}/> Reload
                        </Button>

                        {/*<Button size={"md"} onPress={() => setIsOpenAction(false)}>Закрыть</Button>*/}

                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </>
    );
};
