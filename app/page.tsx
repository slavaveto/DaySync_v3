"use client";
import React, {useEffect, useState} from "react";
import clsx from "clsx";
import ThemeToggle from '@/app/utils/providers/ThemeToggle';
import MobDtToggle from '@/app/utils/providers/mobDtToggle';
import {useDevice} from '@/app/utils/providers/MobileDetect';
import {SignedIn, SignedOut, SignIn} from "@clerk/nextjs";
import {Progress, Spinner} from "@heroui/react";

import DataInitializer from "@/app/utils/dbase/DataInitializer";
import {Main} from "@/app/main/_Main";
import {Mobile} from "@/app/mobile/_Mobile";
import {useMainContext} from "@/app/context";
import {useWindowSize} from "@/app/utils/useWindowSize";
import {CustomProgress} from "@/app/utils/sync/CustomProgress";


export default function Home() {

    const {
        userId, setUserId, tabs, setTabs, subtabs, setSubtabs, items, setItems,
        isUploadingData, isUserActive, syncTimeoutProgress, isDownloadingData
    } = useMainContext();

    const {winWidth, winHeight} = useWindowSize();
    // Снятие фокуса при возвращении на вкладку
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


    const {forcedMode, isMobile, isTablet, isDesktop} = useDevice();

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
                <MobDtToggle/>
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
                    className={clsx(
                        "w-full transition-opacity",
                        firstLoadFadeIn ? "duration-500 opacity-100" : "duration-10 opacity-0"
                    )}
                >
                    {isMobile ? (

                        <>
                              <CustomProgress
                                  value={!isUploadingData ? syncTimeoutProgress : undefined}
                                  isUploadingData={isUploadingData}
                                  isDownloadingData={isDownloadingData}
                                  isUserActive={isUserActive}
                                  winWidth={winWidth}
                              />


                        <Mobile setFirstLoadFadeIn={setFirstLoadFadeIn}/>
                            </>
                        ) : (
                        <Main setFirstLoadFadeIn={setFirstLoadFadeIn}/>
                )}

            </div>
        </SignedIn>
</>
)
    ;
}