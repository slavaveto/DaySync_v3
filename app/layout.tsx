import type {Metadata} from "next";
import {Montserrat} from 'next/font/google';
import "@/app/globals.css";
import {HeroUiProvider} from "@/app/utils/providers/HeroUIProvider";
import {themeScript} from "@/app/utils/providers/themeScript";
import {MainProvider} from "@/app/context";
import {DndProvider} from "@/app/context_dnd";
import {DeviceProvider} from '@/app/utils/providers/MobileDetect';
import {ThemeProvider} from '@/app/utils/providers/ThemeProvider';
import {MyClerkProvider} from '@/app/utils/providers/ClerkProvider';
import {Toaster} from 'react-hot-toast';
import {MiscTabProvider} from "@/app/context_misc";

const montserrat = Montserrat({
    display: "swap",
    subsets: ["latin"],
    preload: false,
});

export const metadata: Metadata = {
    title: "DaySync",
    description: "",
    icons: {
        icon: process.env.NODE_ENV === "development" ? "/icons/favicon_local.png" : "/icons/favicon.png"
    },
};

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        // <html lang="en" suppressHydrationWarning>
        <html
            lang="ru-RU"
            translate="no"
            className={`dark ${montserrat.className}`}
            suppressHydrationWarning
        >

        <head>
            <link rel="manifest" href="/manifest.json"/>
            <meta name="theme-color" content="#1e2329" media="(prefers-color-scheme: dark)"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>

            <script
                dangerouslySetInnerHTML={{
                    __html: themeScript,
                }}
            />

        </head>

        <body>
        <MyClerkProvider>
            <Toaster/>
            <MainProvider>
                <DndProvider>
                    <MiscTabProvider>
                        <HeroUiProvider>
                            <ThemeProvider>
                                <DeviceProvider>

                                    {children}

                                </DeviceProvider>
                            </ThemeProvider>
                        </HeroUiProvider>
                    </MiscTabProvider>
                </DndProvider>
            </MainProvider>
        </MyClerkProvider>
        </body>
        </html>
    );
}
