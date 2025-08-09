'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const getSystemTheme = (): Theme => {
    //console.log('Cистемная тема: dark');
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>('system');

    const applyTheme = (selectedTheme: Theme) => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');

        if (selectedTheme === 'system') {
            const systemTheme = getSystemTheme();
            root.classList.add(systemTheme);
            setTheme('system');
            //console.log(`Системная тема установлена: ${systemTheme}`);

        } else {
            root.classList.add(selectedTheme);
            setTheme(selectedTheme);
            //console.log(`Пользователь переключился на: ${selectedTheme}`);

        }
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            applyTheme('system');
        }
    }, []);

    useEffect(() => {
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => {
                applyTheme('system');
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    const handleSetTheme = (newTheme: Theme) => {
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextProps => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
