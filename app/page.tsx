"use client";

import React, {useEffect, useState} from "react";
import clsx from "clsx";
import ThemeToggle from '@/app/init/providers/ThemeToggle';
import MobDtToggle from '@/app/init/providers/mobDtToggle';
import {useDevice} from '@/app/init/providers/MobileDetect';
import {SignedIn, SignedOut, SignIn, SignOutButton} from "@clerk/nextjs";
import {Button, Spinner} from "@heroui/react";
import DataInitializer from "@/app/init/dbase/dataInitializer";
import {useWindowSize} from "@/app/init/useWindowSize";
import {LogOut, Trash2, Upload} from "lucide-react";
import {useMainContext} from "@/app/context";
import {log} from "@/app/init/logger";
import {SyncData} from "@/app/init/sync/_syncData";
import {UploadData} from "@/app/init/sync/_uploadData";
import {CustomProgress} from "@/app/init/sync/CustomProgress";

import {QuickNotes} from "@/app/common/QuickNotes";

export default function Home() {

    const {winWidth, winHeight} = useWindowSize();
    const {isMobile, isDesktop} = useDevice();
    const {clearAllToasts, firstLoadFadeIn, setFirstLoadFadeIn,
        userId, setUserId, tabs, setTabs, subtabs, setSubtabs, items, setItems,
        isUploadingData, isUserActive, syncTimeoutProgress, isDownloadingData
    } = useMainContext();

    log.setContext('sync');
    log.setToasts(true);

    // Снятие фокуса со всех элементов
    useEffect(() => {

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                (document.activeElement as HTMLElement)?.blur();
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // Управление анимацией загрузки
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

    // Гидратация для SSR
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(true);
    }, []);
    if (!hydrated) return null;

    return (
        <>
            <div
                className={clsx(
                    "fixed inset-0 mt-[-50px] flex items-center justify-center transition-opacity duration-500",
                    showSpinner ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            >
                <Spinner size="lg" color="primary"/>
            </div>


            <SignedOut>
                <div
                    className={clsx(
                        "fixed inset-0 flex items-center justify-center transition-opacity",
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
                <DataInitializer/>

                <SyncData/>
                <UploadData/>

                {isDesktop && (
                    <>
                <div className={clsx(
                    "fixed bottom-[18px] left-[60px] flex gap-2 items-center text-[14px] px-2 py-1 rounded z-50",
                    firstLoadFadeIn ? "duration-500 opacity-100" : "duration-10 opacity-0",
                )}
                >
                    <Button onClick={clearAllToasts}
                            size={"sm"} variant="flat" color={"warning"}
                            className={" border border-default-200"}>
                        <Trash2 size={18} className={""}/> Очистить
                    </Button>
                </div>


                <div className={clsx(
                    "fixed bottom-3 right-3 flex gap-2 items-center text-[14px] px-2 py-1 rounded z-50",
                    firstLoadFadeIn ? "duration-500 opacity-100" : "duration-10 opacity-0",
                )}
                >


                    <MobDtToggle/>
                    <ThemeToggle/>
                    <SignOutButton>
                        <Button size={"md"} variant="flat" color={"warning"} isIconOnly
                                className={"w-[50px] border border-default-200"}>
                            <LogOut size={22} className={""}/>
                        </Button>
                    </SignOutButton>
                </div>
    </>
                )}


                <div
                    className={clsx(
                        "w-full transition-opacity",
                        firstLoadFadeIn ? "duration-500 opacity-100" : "duration-10 opacity-0"
                    )}
                >

                    <CustomProgress
                        value={!isUploadingData ? syncTimeoutProgress : undefined}
                        isUploadingData={isUploadingData}
                        isDownloadingData={isDownloadingData}
                        isUserActive={isUserActive}
                        winWidth={winWidth}
                    />



                    <div
                        className={clsx(
                            "w-full h-screen mt-[-25px] flex items-center justify-center transition-opacity",
                            firstLoadFadeIn ? "duration-500 opacity-100" : "duration-10 opacity-0"
                        )}
                    >
                    MainWindowContext
                        <QuickNotes />

                    </div>

                    {/*{isDesktop ? (*/}
                    {/*    <MainWindow />*/}
                    {/*) : (*/}
                    {/*    <Mobile />*/}
                    {/*)}*/}
            </div>
        </SignedIn>
</>
    )
        ;
}