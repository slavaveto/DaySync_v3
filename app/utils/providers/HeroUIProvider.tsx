'use client';

import {HeroUIProvider} from '@heroui/react'

export function HeroUiProvider({children}: { children: React.ReactNode }) {
    //const pathname = usePathname();


    return (
            <HeroUIProvider>
                    {children}
            </HeroUIProvider>
    )
}