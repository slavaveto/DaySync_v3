import {toast} from "react-hot-toast";

class Logger {
    private globalContext: string = '';
    private toastsEnabled: boolean = false; // ДОБАВИЛИ настройку toast'ов

    // Устанавливаем контекст для всей страницы/процесса
    setContext(context: string) {
        this.globalContext = context;
    }

    // НОВЫЙ метод для включения/выключения toast'ов
    setToasts(enabled: boolean) {
        this.toastsEnabled = enabled;
    }

    // Получаем полный контекст
    getFullContext(line?: number): string {
        if (this.globalContext) {
            return line ? `${this.globalContext}:${line}` : this.globalContext;
        }
        return line ? `:${line}` : '';
    }

    // Утилита для toast'ов
    showToast(message: string, type: 'success' | 'error' | 'loading' | 'info' = 'info') {
        // Показываем toast только если включены
        if (!this.toastsEnabled) return;

        const options = {
            duration: Infinity,
            position: "bottom-center" as const,
            className: 'border border-divider !bg-content2 !text-foreground w-[200px]',
        };

        switch (type) {
            case 'error':
                return toast.error(`${message}`, options);
            case 'loading':
                return toast.loading(`${message}`, options);
            case 'success':
                return toast.success(`${message}`, options);
            default:
                return toast(`${message}`, options);
        }
    }

    // Основные методы логирования
    start(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`🚀${context ? ` [${context}]` : ''} ${message}`, ...args);
        // Показываем toast если включены
        if (this.toastsEnabled) {
            this.showToast(message, 'loading');
        }
    }

    end(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`🏁${context ? ` [${context}]` : ''} ${message}`, ...args);
        // Показываем toast если включены
        if (this.toastsEnabled) {
            this.showToast(message, 'success');
        }
    }
}

// Создаем экземпляр логгера
const logger = new Logger();

// Функция log
function log(message: string, line?: number, ...args: any[]) {
    const context = logger.getFullContext(line);
    console.log(`${context ? `[${context}] ` : ''}${message}`, ...args);
    // Показываем toast если включены
    if (logger['toastsEnabled']) {
        logger.showToast(message, 'info');
    }
}

// Добавляем методы к функции log
log.start = (message: string, line?: number, ...args: any[]) => {
    logger.start(message, line, ...args);
};

log.end = (message: string, line?: number, ...args: any[]) => {
    logger.end(message, line, ...args);
};

log.setContext = (context: string) => {
    logger.setContext(context);
};

// НОВЫЙ метод для управления toast'ами
log.setToasts = (enabled: boolean) => {
    logger.setToasts(enabled);
};

// Экспортируем функцию log
export { log };
