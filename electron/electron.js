const {app, BrowserWindow, Notification, screen, Tray, shell, Menu, ipcMain, dialog} = require("electron");

const path = require("path");
const fs = require("fs");
const {nativeImage} = require("electron");

let mainWindow, calendarWindow, todayWindow
const {createCalendarWindow} = require('./winCalendar');
//const {createTodayWindow} = require('./winToday');

const {trayIconCountHandler} = require('./iconTray');
const {dockIconHandler} = require('./iconDock');

const {setupPowerMonitor} = require("./powerMonitor");
const {calendar} = require("@heroui/react");

const HOST = "2000";
const ENABLE_TRAY = true; // ✅ Если false — трей не создаётся
const ENABLE_DOCK = true; // ✅ Если false — убираем из Dock (только macOS)

// 📌 Файл, где сохраняем размеры и позицию окна
const SETTINGS_PATH = path.join(app.getPath("userData"), "daysync3-window-settings.json");

// ✅ Функция загрузки настроек окна
function loadWindowBounds() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
        }
    } catch (error) {
        console.error("❌ Ошибка загрузки настроек окна:", error);
    }
    return null;
}

// ✅ Функция сохранения размеров и позиции окна
function saveWindowBounds(bounds) {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(bounds));
    } catch (error) {
        console.error("❌ Ошибка сохранения настроек окна:", error);
    }
}

let win;
let tray;
let isQuitting = false; // ✅ Флаг предотвращает зацикливание выхода

async function createMainWindow() {
    try {
        const savedBounds = loadWindowBounds();
        const primaryDisplay = screen.getPrimaryDisplay().workAreaSize;

        win = new BrowserWindow({
            width: savedBounds?.width || Math.min(primaryDisplay.width, 800),
            height: savedBounds?.height || Math.min(primaryDisplay.height, 600),
            x: savedBounds?.x ?? undefined,
            y: savedBounds?.y ?? undefined,
            frame: true, // ✅ Включаем стандартный заголовок окна
            titleBarStyle: "default",
            resizable: true,
            minHeight: 500,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                partition: 'persist:electron-isolated', // 🛡️ добавь это!
            },
        });

        mainWindow = win;
        setupPowerMonitor(win);

        //win.webContents.session.clearStorageData({
        //    storages: ['cookies', 'serviceworkers']
        //}).then(() => {
        //    console.log('✅ Очистили старые cookies и service workers');
        //    win.loadURL("http://localhost:" + HOST);
        //});

        win.loadURL("http://localhost:" + HOST);

        win.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        win.webContents.on('will-navigate', (event, navigationUrl) => {
            const parsedUrl = new URL(navigationUrl);
            if (parsedUrl.origin !== `http://localhost:${HOST}`) {
                event.preventDefault();
                shell.openExternal(navigationUrl);
            }
        });

        win.on("resize", () => saveWindowBounds(win.getBounds()));
        win.on("move", () => saveWindowBounds(win.getBounds()));

        win.on("close", (event) => {
            if (!isQuitting) {
                event.preventDefault();
                win.hide();
            }
        });

        if (ENABLE_TRAY) {
            createTray();
        }
    } catch (error) {
        console.error("❌ Ошибка при создании окна:", error);
    }
}


function createTray() {
    const iconPath = path.resolve(__dirname, "icons", "tray_icon@2x.png");
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        // { label: "Открыть", click: showWindow }, // ✅ Исправили на `showWindow()`
        {label: "Выход", click: quitApp},
    ]);

    tray.setToolTip("Моё Electron-приложение");
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
        showWindow(); // ✅ Теперь всегда только открывает окно
    });
    trayIconCountHandler(tray);
}

// ✅ Функция для показа окна (больше не скрываем)
function showWindow() {
    if (!win) return;
    if (win.isMinimized()) win.restore(); // 🔥 Разворачиваем, если свернуто
    win.show();
    win.focus();
}

// ✅ Функция для полного завершения приложения
function quitApp() {
    if (isQuitting) return; // 🔥 Предотвращаем повторные вызовы

    isQuitting = true; // ✅ Устанавливаем флаг
    if (tray) tray.destroy(); // Удаляем иконку
    if (win) win.destroy(); // Закрываем окно
    app.quit(); // Полностью завершаем Electron
}

app.whenReady().then(async () => {
    await createMainWindow();
    calendarWindow = await createCalendarWindow(HOST);
    //todayWindow = await createTodayWindow(HOST);

    // const dockIconPath = path.join(__dirname, 'electron', 'icons', 'dock_icon.png');
    // if (process.platform === 'darwin') {
    //     const icon = await dockIconHandler(dockIconPath);
    //     app.dock.setIcon(icon);
    // }

    if (!ENABLE_DOCK && process.platform === 'darwin') {
        app.dock.hide();
    }
    console.log("✅ Electron запущен!");
})
    .catch(console.error);

ipcMain.on('show-notification', (_event, {title, body}) => {
    // Для macOS/Linux/Windows — родной Notification
    new Notification({
        title,
        body,
        silent: false
        // icon: path.join(__dirname, "electron", "icons", "dock_icon.png")
    })
        // n.once('click', () => {
        //     if (mainWindow) mainWindow.show();
        // });
        // n.show();
        .show();
});

// ✅ Гарантированный выход при закрытии приложения
app.on("before-quit", () => {
    isQuitting = true; // 🔥 Ставим флаг, чтобы `win.on("close")` не мешал выходу
});

// ✅ Глобальный обработчик ошибок
process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Необработанное отклонение промиса:", reason);
});
