import type {Metadata} from "next";
import {Montserrat} from 'next/font/google';
import "@/app/globals.css";
import {HeroUiProvider} from "@/app/init/providers/HeroUIProvider";
import {themeScript} from "@/app/init/providers/themeScript";
import {DeviceProvider} from '@/app/init/providers/MobileDetect';
import {ThemeProvider} from '@/app/init/providers/ThemeProvider';
import {MyClerkProvider} from '@/app/init/providers/ClerkProvider';
import {Toaster} from 'react-hot-toast';
import {MainContextProvider} from "@/app/context";

const montserrat = Montserrat({
    display: "swap",
    subsets: ["latin"],
    preload: false,
});

export const metadata: Metadata = {
    title: "BootstrapCode",
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
            <Toaster
                position="bottom-left"
                containerStyle={{
                    // left: '20px',
                    bottom: '70px'
                }}
            />
            <HeroUiProvider>
                <ThemeProvider>
                    <DeviceProvider>

                        <MainContextProvider>

                            {children}

                        </MainContextProvider>

                    </DeviceProvider>
                </ThemeProvider>
            </HeroUiProvider>
        </MyClerkProvider>
        </body>
        </html>
    );
}
