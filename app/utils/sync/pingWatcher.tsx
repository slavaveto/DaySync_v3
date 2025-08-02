import React, {useEffect, useRef} from "react";
import {Spinner} from "@heroui/react";
import toast from "react-hot-toast";
import {useDevice} from "@/app/utils/providers/MobileDetect";

interface PingWatcherProps {
    onWake: (onComplete: () => void) => void;
}

export const PingWatcher: React.FC<PingWatcherProps> = ({onWake}) => {
    const {isMobile} = useDevice();
    const lastPingRef = useRef<number>(Date.now());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const lastHiddenAtRef = useRef<number | null>(null);
    const wasJustWokenRef = useRef(false); // флаг — только что проснулась
    const ABSENCE_TOAST_THRESHOLD = 5 * 60 * 1000; // 5 минут

    const PING_INTERVAL = 30000;
    const WAKE_THRESHOLD = 90000;

    // Просто обновляем lastPing
    const ping = () => {
        const now = Date.now();
        lastPingRef.current = now
        // lastPingRef.current = now - 100000
    };

    // reason: string
    const checkWake = (reason: string, absenceMs?: number) => {
        if (isMobile) return;
        if (wasJustWokenRef.current) return;

        const now = Date.now();
        const delta = now - lastPingRef.current;

        wasJustWokenRef.current = true;

        if (delta > WAKE_THRESHOLD) {
            toast(
                <div className={"flex flex-col justify-center items-center z-100"}>
                    <div className="font-semibold">Вкладка проснулась</div>
                    <div>Перезагружаем данные...</div>
                </div>,
                {
                    duration: 2000,
                    id: "wake-toast",
                    className: "border border-divider !bg-content2 !text-foreground",
                    position: "bottom-center",
                }
            );
            onWake?.(() => {
                ping();
            });
        } else if (absenceMs && absenceMs > ABSENCE_TOAST_THRESHOLD) {
            toast(
                <div className={"flex flex-col justify-center items-center z-100"}>
                    <div className="font-semibold">Вкладка проснулась</div>
                    <div>Все ОК!</div>
                </div>,
                {
                    duration: 2000,
                    id: "wake-toast",
                    className: "border border-divider !bg-content2 !text-foreground",
                    position: "bottom-center",
                }
            );
        }
    };

    useEffect(() => {
        intervalRef.current = setInterval(ping, PING_INTERVAL);
        ping();

        const handleFocus = () => checkWake("focus");
        const handleVisibilityChange = () => {
            const now = Date.now();
            if (document.visibilityState === "hidden") {
                lastHiddenAtRef.current = now;
                wasJustWokenRef.current = false;
            }
            if (document.visibilityState === "visible") {
                let absenceMs = 0;
                if (lastHiddenAtRef.current) {
                    absenceMs = now - lastHiddenAtRef.current;
                }
                checkWake("visibility", absenceMs);
                lastHiddenAtRef.current = null; // сброс
            }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current as NodeJS.Timeout);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return null;
};