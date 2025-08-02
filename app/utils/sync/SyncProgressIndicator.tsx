import React from 'react';
import { CircularProgress, Progress } from "@heroui/react";
import { CloudDownload, CloudUpload } from "lucide-react";
import clsx from "clsx";
import { useMainContext } from "@/app/context";

export const SyncProgressIndicator = React.memo(() => {
    const {
        syncTimeoutProgress,
        isUploadingData,
        isDownloadingData,
        isUserActive
    } = useMainContext();

    return (
        <div className={clsx(isUploadingData && "-scale-x-100")}>
            <CircularProgress
                aria-label="Loading..."
                size="sm"
                strokeWidth={4}
                value={!isUploadingData ? syncTimeoutProgress : undefined}
                isIndeterminate={isUploadingData || isDownloadingData}
                classNames={{
                    indicator: clsx(
                        "transition duration-100 ease-in-out",
                        isUploadingData
                            ? "text-warning-300"
                            : isDownloadingData
                                ? "text-success-300"
                                : isUserActive
                                    ? "text-primary-300"
                                    : syncTimeoutProgress === 0
                                        ? "text-primary-300"
                                        : "text-warning-300"
                    ),
                }}
            />
        </div>
    );
});