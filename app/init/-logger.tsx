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

    clearToasts() {
        toast.dismiss();
        console.log('🗑️ Все toast\'ы очищены');
    }

    // Утилита для toast'ов
    showToast(message: string, type: 'start' | 'success' | 'info' | 'warning' | 'error') {
        // Показываем toast только если включены
        if (!this.toastsEnabled) return;

        let icon = 'ℹ️'; // по умолчанию

        switch (type) {
            case 'start': icon = '🚀'; break;
            case 'success': icon = '✅'; break;
            case 'warning': icon = '⚠️'; break;
            case 'error': icon = '❌️'; break;
        }


        const options = {
            duration: Infinity,
            // position: "bottom-left" as const,
            className: '!p-0 !px-2 border border-divider !bg-content2 !text-foreground text-[12px]',
            icon: icon
        };

        return toast(`${message}`, options);
    }

    // Основные методы логирования
    start(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`🚀${context ? ` [${context}]` : ''} ${message}`, ...args);
        // Показываем toast если включены
        if (this.toastsEnabled) {
            this.showToast(message, 'start');
        }
    }

    success(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`✅${context ? ` [${context}]` : ''} ${message}`, ...args);
        // Показываем toast если включены
        if (this.toastsEnabled) {
            this.showToast(message, 'success');
        }
    }

    warning(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`❌️️${context ? ` [${context}]` : ''} ${message}`, ...args);
        // Показываем toast если включены
        if (this.toastsEnabled) {
            this.showToast(message, 'warning');
        }
    }

    error(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`⚠️${context ? ` [${context}]` : ''} ${message}`, ...args);
        // Показываем toast если включены
        if (this.toastsEnabled) {
            this.showToast(message, 'error');
        }
    }
}

// Создаем экземпляр логгера
const logger = new Logger();

// Функция log
function log(message: string, line?: number, ...args: any[]) {
    const context = logger.getFullContext(line);
    console.log(`ℹ️ ${context ? `[${context}] ` : ''}${message}`, ...args);
    // Показываем toast если включены
    if (logger['toastsEnabled']) {
        logger.showToast(message, 'info');
    }
}

// Добавляем методы к функции log
log.start = (message: string, line?: number, ...args: any[]) => {
    logger.start(message, line, ...args);
};

log.success = (message: string, line?: number, ...args: any[]) => {
    logger.success(message, line, ...args);
};

log.warning = (message: string, line?: number, ...args: any[]) => {
    logger.warning(message, line, ...args);
};

log.error = (message: string, line?: number, ...args: any[]) => {
    logger.error(message, line, ...args);
};


log.setContext = (context: string) => {
    logger.setContext(context);
};

// НОВЫЙ метод для управления toast'ами
log.setToasts = (enabled: boolean) => {
    logger.setToasts(enabled);
};

log.clearToasts = () => {
    logger.clearToasts();
};

// Экспортируем функцию log
export { log };
