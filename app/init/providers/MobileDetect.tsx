'use client';

import {createContext, useContext, useEffect, useState, ReactNode} from 'react';
import MobileDetect from 'mobile-detect';

type DeviceType = {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isIOS: boolean;
    forcedMode?: 'mobile' | null;              // только mobile или авто
    setForcedMode?: (mode: 'mobile' | null) => void;
};

const defaultValue: DeviceType = {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIOS: false,
    forcedMode: null,
    setForcedMode: () => {
    },
};

const DeviceContext = createContext<DeviceType>(defaultValue);

export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider = ({children}: { children: ReactNode }) => {
    const [deviceType, setDeviceType] = useState<Omit<DeviceType, 'forcedMode' | 'setForcedMode'>>({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isIOS: false,
    });

    const [forcedMode, setForcedMode] = useState<'mobile' | null>(null);

    useEffect(() => {
        const md = new MobileDetect(window.navigator.userAgent);
        const isMobile = !!md.mobile();
        const isTablet = !!md.tablet();
        const isDesktop = !isMobile && !isTablet;

        const userAgent = window.navigator.userAgent || "";
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !("MSStream" in window);

        setDeviceType({isMobile, isTablet, isDesktop, isIOS});
    }, []);

    // Выбираем итоговый режим: принудительный или авто
    const finalIsMobile = forcedMode === "mobile"
        ? true
        : deviceType.isMobile;

    return (
        <DeviceContext.Provider value={{
            ...deviceType,
            isMobile: finalIsMobile,
            forcedMode,
            setForcedMode,
        }}>
            {children}
        </DeviceContext.Provider>
    );
};