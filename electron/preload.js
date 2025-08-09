const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    sendToElectron: (channel, data) => ipcRenderer.send(channel, data),
    getFromElectron: (channel, callback) => ipcRenderer.once(channel, (_, data) => callback(data)),

    onPowerStatus: (cb) => {
        // Оборачиваем, чтобы можно было удалить именно этот handler
        const handler = (_event, data) => cb(data);
        ipcRenderer.on('power-status', handler);
        // возвращаем функцию отписки
        return () => {
            ipcRenderer.removeListener('power-status', handler);
        };
    },


});

