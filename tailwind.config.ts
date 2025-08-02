import type {Config} from "tailwindcss";

import {heroui} from "@heroui/react";

export default {
    content: [
        "./_main_page/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./utils/**/*.{js,ts,jsx,tsx,mdx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],

    safelist: [
        {
            pattern: /bg-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|stone|neutral|zinc|gray|slate)-(50|75|100|200|300|400|500|600|700|800|900|950)/,
            variants: ["dark", "hover", "dark:hover"],
        },
        {
            pattern: /!bg-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|stone|neutral|zinc|gray|slate)-(50|75|100|200|300|400|500|600|700|800|900|950)/,
            variants: ["dark", "hover", "dark:hover"],
        },

        {
            pattern: /text-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|stone|neutral|zinc|gray|slate)-(50|75|100|200|300|400|500|600|700|800|900|950)/,
            variants: ["dark", "hover", "dark:hover"],
        },

        {
            pattern: /border-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|stone|neutral|zinc|gray|slate)-(50|75|100|200|300|400|500|600|700|800|900|950)/,
            variants: ["dark", "hover", "dark:hover"],
        },
        {
            pattern: /!border-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|stone|neutral|zinc|gray|slate)-(50|75|100|200|300|400|500|600|700|800|900|950)/,
            variants: ["dark", "hover", "dark:hover"],
        },
    ],

    darkMode: 'class',
    theme: {
        extend: {

            colors: {
                red: {75: "#fee8e8", 950: '#6c4242',},
                orange: {75: "#fff2e1", 950: "#71503e",},
                amber: {75: "#fff7d6", 950: '#69563c',},
                yellow: {75: "#fffad9", 950: '#747042',},
                lime: {75: "#f1fedc", 950: '#54644c',},
                green: {75: "#e6fcea", 950: '#3d5741',},
                emerald: {75: "#e0faef", 950: '#35635d',},
                teal: {75: "#e0fbe5", 950: '#3c5e5c', },
                cyan: {75: "#e1fcff", 950: '#3a5963', },
                sky: {75: "#e8f6ff", 950: '#314352',},
                blue: {75: "#e7f0ff", 950: '#454b67',},
                indigo: {75: "#e7e9ff", 950: '#464866',},
                violet: {75: "#f1f1fe", 950: '#55486a',},
                purple: {75: "#f7f1ff", 950: '#5e4971',},
                fuchsia: {75: "#fbefff", 950: '#664663',},
                pink: {75: "#fdf0f5", 950: '#6c4857',},
                rose: {75: "#fff8f4", 950: '#6b454a', },

                stone: {75: "#f8f8f7", 950: '#44413c', },
                neutral: {75: "#f7f7f7", 950: '#4e4e49',  },
                zinc: {75: "#f7f7f7", 950: '#4c4c51',},
                gray: {75: "#f6f7f9", 950: '#4d4e51',},
                slate: {75: "#f4f8fa", 950: '#424553',},

                // Светлая тема
                light: {
                    background: '#ffffff', // Фон светлой темы
                    text: '#212936', // Текст светлой темы
                },
                // Тёмная тема
                dark: {
                    background: '#1e2329', // Фон тёмной темы
                    text: '#a7adba', // Текст тёмной темы
                },
            },
            fontSize: {
                xs: '18px',
                small: '16px',
            },
            screens: {
                xs375: '375px',
                xs390: '390px',
                xs500: '500px',
            },

            keyframes: {
                pulseIcon: {
                    '0%, 100%': {transform: 'scale(1)'},
                    '50%': {transform: 'scale(1.15)'},
                },
                shake: {
                    '0%, 100%': {transform: 'translateX(0)'},
                    '20%, 60%': {transform: 'translateX(-4px)'},
                    '40%, 80%': {transform: 'translateX(4px)'},
                },
            },
            animation: {
                'pulse-icon': 'pulseIcon 1s ease-in-out infinite',
                shake: 'shake 0.6s ease-in-out',
            },

        },
    },
    plugins: [heroui()],
} satisfies Config;
