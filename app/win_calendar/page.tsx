"use client";

import React, {useEffect, useState} from 'react';
import clsx from "clsx";

import {SignedIn, SignedOut, SignIn, SignOutButton} from "@clerk/nextjs";
import {useDevice} from '@/app/init/providers/MobileDetect';
import {Button, Spinner} from "@heroui/react";
import DataInitializer from "@/app/init/dbase/dataInitializer";
import {useWindowSize} from "@/app/init/useWindowSize";
import {MainContextProvider, useMainContext} from "@/app/context";
import MobDtToggle from "@/app/init/providers/mobDtToggle";
import ThemeToggle from "@/app/init/providers/ThemeToggle";
import {LogOut, Trash2} from "lucide-react";

function CalendarContent() {

    const {winWidth, winHeight} = useWindowSize();
    const {isMobile, isDesktop} = useDevice();
    const {clearAllToasts, firstLoadFadeIn, setFirstLoadFadeIn} = useMainContext();

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
                    "fixed inset-0 mt-[-100px] flex items-center justify-center transition-opacity duration-500",
                    showSpinner ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            >
                <Spinner size="lg" color="primary"/>
            </div>


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

    </>
                )}

                <div
                    className={clsx(
                        "w-full h-screen mt-[-50px] flex items-center justify-center transition-opacity",
                        firstLoadFadeIn ? "duration-500 opacity-100" : "duration-10 opacity-0"
                    )}
                >

                    CalendarWindowContext

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
        <MainContextProvider>
            <DataInitializer/>
            <CalendarContent/>
        </MainContextProvider>
    );
}