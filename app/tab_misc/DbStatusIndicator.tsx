// components/DbStatusIndicator.tsx
import React from 'react';
import { Spinner } from "@heroui/react";
import type { DbStatus } from './useDbStatus';

interface DbStatusIndicatorProps {
    status: DbStatus;
    size?: "sm" | "md" | "lg";
}

export const DbStatusIndicator = ({ status, size = "sm" }: DbStatusIndicatorProps) => {
    if (status === 'idle') {
        return null;
    }

    if (status === 'loading') {
        return <Spinner size={size} color="warning" />;
    }

    if (status === 'success') {
        return (
            <div className="flex items-center justify-center">
                <svg
                    className="w-5 h-5 text-success-500 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center justify-center">
                <svg
                    className="w-5 h-5 text-danger-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>
        );
    }

    return null;
};