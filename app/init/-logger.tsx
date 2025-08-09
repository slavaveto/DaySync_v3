import {toast} from "react-hot-toast";

class Logger {
    private globalContext: string = '';

    // Устанавливаем контекст для всей страницы/процесса
    setContext(context: string) {
        this.globalContext = context;
        // console.log(`📋 Контекст установлен: ${context}`);
    }

    // Получаем полный контекст
    getFullContext(line?: number): string {
        if (this.globalContext) {
            return line ? `${this.globalContext}:${line}` : this.globalContext;
        }
        return line ? `:${line}` : '';
    }

    // Утилита для toast'ов (как в DownloadButton)
    showToast(message: string, type: 'success' | 'error' | 'loading' | 'info' = 'info') {

        const options = {
            duration: 3000,
            position: "bottom-center" as const,
            className: 'border border-divider !bg-content2 !text-foreground',
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
    }

    end(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`🏁${context ? ` [${context}]` : ''} ${message}`, ...args);
    }
}

// Создаем экземпляр логгера
const logger = new Logger();

// ИСПРАВЛЕННАЯ функция log
function log(message: string, line?: number, ...args: any[]) {
    const context = logger.getFullContext(line);
    console.log(`${context ? `[${context}] ` : ''}${message}`, ...args);
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

// Экспортируем функцию log
export { log };

// console.log('🚀 Function Logger готов!');