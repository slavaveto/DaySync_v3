import React from 'react';
import clsx from 'clsx';

interface CustomProgressProps {
    value?: number; // 0-100, где 100 = полная полоска, 0 = пустая
    isIndeterminate?: boolean;
    isUploadingData?: boolean;
    isDownloadingData?: boolean;
    isUserActive?: boolean;
    winWidth: number;
}

export const CustomProgress: React.FC<CustomProgressProps> = ({
                                                                  value = 0,
                                                                  isUploadingData = false,
                                                                  isDownloadingData = false,
                                                                  isUserActive = false,
                                                                  winWidth
                                                              }) => {
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
                    width: isIndeterminate ? '100%' : `${Math.max(0, Math.min(100, value))}%`,
                    transform: isIndeterminate ? 'translateX(-100%)' : 'none',
                    animation: isIndeterminate ? 'indeterminate 2s infinite ease-in-out' : 'none',
                    opacity: isIndeterminate || isUserActive || value > 0 ? 1 : 0
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