const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    sendToElectron: (channel, data) => ipcRenderer.send(channel, data), // 📤 Отправка данных в Electron
    getFromElectron: (channel, callback) => ipcRenderer.once(channel, (_, data) => callback(data)), // 📥 Получение данных

    onPowerStatus: (cb) => {
        // Оборачиваем, чтобы можно было удалить именно этот handler
        const handler = (_event, data) => cb(data);
        ipcRenderer.on('power-status', handler);
        // возвращаем функцию отписки
        return () => {
            ipcRenderer.removeListener('power-status', handler);
        };
    },

    // основной window — шлёт изменения
    sendItemsUpdated: (items) => ipcRenderer.send('items-updated', items),
    onItemsUpdated: (cb) => {
        const listener = (_evt, items) => cb(items);
        ipcRenderer.on('items-updated', listener);
        return () => ipcRenderer.removeListener('items-updated', listener);
    },

    sendUserActive: (isActive) => ipcRenderer.send("user-active", isActive),
    onUserActive: (cb) => {
        const handler = (_e, isActive) => cb(isActive);
        ipcRenderer.on("user-active", handler);
        return () => ipcRenderer.removeListener("user-active", handler);
    },

    showNotification: (opts) => ipcRenderer.send('show-notification', opts),


    requestSyncFromActiveWindow: () => {
        console.log('📤 Отправляем запрос через IPC');
        ipcRenderer.send('request-sync-from-active-window');
    },
    onSyncRequest: (callback) => {
        console.log('🔧 Подписались на sync-request');
        const handler = () => {
            console.log('📥 Получили sync-request через IPC');
            callback();
        };
        ipcRenderer.on('sync-request-received', handler);
        return () => ipcRenderer.removeListener('sync-request-received', handler);
    }
});

