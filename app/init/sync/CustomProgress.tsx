import React from 'react';
import clsx from 'clsx';
import {useMainContext} from "@/app/context";
import {useWindowSize} from "@/app/init/useWindowSize";


export const CustomProgress: React.FC = () => {

    const {winWidth, winHeight} = useWindowSize();

    const {isUploadingData, isUserActive, syncTimeoutProgress, isDownloadingData
    } = useMainContext();


    // Вычисляем значение value внутри компонента
    const value = !isUploadingData ? syncTimeoutProgress : undefined;
    // Безопасное значение для вычислений (0 если undefined)
    const safeValue = value ?? 0;

    // Определяем цвет индикатора
    const getIndicatorColor = () => {
        if (isUploadingData) return "bg-warning-300";
        if (isDownloadingData) return "bg-success-300";
        if (isUserActive) return "bg-primary-300";
        if (value === 0) return "bg-primary-300";
        return "bg-warning-300";
    };

    const isIndeterminate = isUploadingData || isDownloadingData

    // Для анимации indeterminate
    const indeterminateAnimation = isIndeterminate ? "animate-pulse" : "";

    return (
        <div
            className="w-full h-[3px] bg-default-200 rounded-full overflow-hidden"
            style={{ width: `${winWidth}px` }}
        >
            <div
                className={clsx(
                    "h-full transition-all duration-300 ease-in-out rounded-full",
                    getIndicatorColor(),
                    indeterminateAnimation
                )}
                style={{
                    width: isIndeterminate ? '100%' : `${Math.max(0, Math.min(100, safeValue))}%`,
                    transform: isIndeterminate ? 'translateX(-100%)' : 'none',
                    animation: isIndeterminate ? 'indeterminate 2s infinite ease-in-out' : 'none',
                    opacity: isIndeterminate || isUserActive || safeValue > 0 ? 1 : 0
                }}
            />

            {/* CSS для indeterminate анимации */}
            <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
        </div>
    );
};