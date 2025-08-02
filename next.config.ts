import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: false, // 🔥 Отключаем Strict Mode
    eslint: {
        ignoreDuringBuilds: true, // Игнорировать ошибки ESLint во время сборки
    },
    images: {
        domains: ['storage.googleapis.com'], // Добавьте ваш хост
    },
};

export default nextConfig;
