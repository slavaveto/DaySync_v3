import {toast} from "react-hot-toast";

class Logger {
    private globalContext: string = '';
    private toastsEnabled: boolean = false;

    // ДОБАВЛЯЕМ отслеживание повторяющихся toast'ов
    private activeToasts: Map<string, {id: string, count: number, timeout: NodeJS.Timeout}> = new Map();

    setContext(context: string) {
        this.globalContext = context;
    }

    setToasts(enabled: boolean) {
        this.toastsEnabled = enabled;
    }

    getFullContext(line?: number): string {
        if (this.globalContext) {
            return line ? `${this.globalContext}:${line}` : this.globalContext;
        }
        return line ? `:${line}` : '';
    }

    clearToasts() {
        toast.dismiss();
        // Очищаем и наш кэш
        this.activeToasts.clear();
        console.log('🗑️ Все toast\'ы очищены');
    }

    // НОВАЯ функция с группировкой
    showToast(message: string, type: 'start' | 'success' | 'info' | 'warning' | 'error') {
        if (!this.toastsEnabled) return;

        // Получаем текущее время
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Создаем ключ для группировки
        const key = `${type}:${message}`;

        let icon = 'ℹ️';
        switch (type) {
            case 'start': icon = '🚀'; break;
            // case 'start': icon = '🔄'; break;
            case 'success': icon = '✅'; break;
            case 'warning': icon = '⚠️'; break;
            case 'error': icon = '❌️'; break;
        }

        const options = {
            duration: Infinity,
            className: '!p-0 !px-2 border border-divider !bg-content2 !text-foreground text-[12px]',
            icon: icon
        };

        if (this.activeToasts.has(key)) {
            // Увеличиваем счетчик
            const existing = this.activeToasts.get(key)!;
            existing.count++;

            // Удаляем старый toast
            toast.dismiss(existing.id);

            // Создаем новый с счетчиком
            // const displayMessage = `${message} (${existing.count})`;
            const displayMessage = `${message} (${existing.count}) (${timeString})`;

            const newId = toast(displayMessage, options);

            // Сбрасываем таймер
            clearTimeout(existing.timeout);
            const timeout = setTimeout(() => {
                this.activeToasts.delete(key);
            }, 3000);

            this.activeToasts.set(key, { id: newId, count: existing.count, timeout });

        } else {
            // Создаем новый toast
            // const toastId = toast(message, options);

            // Создаем новый toast с временем
            const displayMessage = `${message} (${timeString})`;
            const toastId = toast(displayMessage, options);

            const timeout = setTimeout(() => {
                this.activeToasts.delete(key);
            }, 3000);

            this.activeToasts.set(key, { id: toastId, count: 1, timeout });
        }
    }

    // Остальные методы остаются без изменений
    start(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        // console.log(`🔄${context ? ` [${context}]` : ''} ${message}`, ...args);
        console.log(`🚀${context ? ` [${context}]` : ''} ${message}`, ...args);
        if (this.toastsEnabled) {
            this.showToast(message, 'start');
        }
    }

    success(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`✅${context ? ` [${context}]` : ''} ${message}`, ...args);
        if (this.toastsEnabled) {
            this.showToast(message, 'success');
        }
    }

    warning(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`❌️️${context ? ` [${context}]` : ''} ${message}`, ...args);
        if (this.toastsEnabled) {
            this.showToast(message, 'warning');
        }
    }

    error(message: string, line?: number, ...args: any[]) {
        const context = this.getFullContext(line);
        console.log(`⚠️${context ? ` [${context}]` : ''} ${message}`, ...args);
        if (this.toastsEnabled) {
            this.showToast(message, 'error');
        }
    }
}

// Остальной код остается как есть...
const logger = new Logger();

function log(message: string, line?: number, ...args: any[]) {
    const context = logger.getFullContext(line);
    console.log(`ℹ️ ${context ? `[${context}] ` : ''}${message}`, ...args);
    if (logger['toastsEnabled']) {
        logger.showToast(message, 'info');
    }
}

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

log.setToasts = (enabled: boolean) => {
    logger.setToasts(enabled);
};

log.clearToasts = () => {
    logger.clearToasts();
};

export { log };