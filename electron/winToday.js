// electron/winToday.js
const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const {setupPowerMonitor} = require("./powerMonitor");

const TODAY_SETTINGS_PATH = path.join(
    app.getPath('userData'),
    'daysync3-today-window-settings.json'
)

function loadTodayWindowBounds() {
    try {
        if (fs.existsSync(TODAY_SETTINGS_PATH)) {
            return JSON.parse(
                fs.readFileSync(TODAY_SETTINGS_PATH, 'utf-8')
            )
        }
    } catch (e) {
        console.error('❌ Ошибка загрузки настроек окна Today:', e)
    }
    return null
}

function saveTodayWindowBounds(bounds) {
    try {
        fs.writeFileSync(
            TODAY_SETTINGS_PATH,
            JSON.stringify(bounds)
        )
    } catch (e) {
        console.error('❌ Ошибка сохранения настроек окна Today:', e)
    }
}

let todayWindow = null
//const HOST = process.env.PORT || '3100'

async function createTodayWindow(host) {

    const saved = loadTodayWindowBounds()

    todayWindow = new BrowserWindow({
        width:  saved?.width  || 400,
        height: saved?.height || 600,
        x:      saved?.x ?? undefined,
        y:      saved?.y ?? undefined,
        frame:           true,
        titleBarStyle:  'default',
        resizable:      true,
        webPreferences: {
            preload:   path.join(__dirname, 'preload.js'),
            //partition: 'persist:electron-isolated'
            partition: 'persist:today-window'
        }
    })

    await todayWindow.loadURL(
        `http://localhost:${host}/today`
    )

    setupPowerMonitor(todayWindow);

    todayWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    todayWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.origin !== `http://localhost:${host}`) {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });

    todayWindow.on('resize', () => {
        saveTodayWindowBounds(todayWindow.getBounds())
    })
    todayWindow.on('move', () => {
        saveTodayWindowBounds(todayWindow.getBounds())
    })

    todayWindow.on('close', e => {
        e.preventDefault()
        todayWindow.hide()
    })

    return todayWindow
}

module.exports = {
    createTodayWindow,
    loadTodayWindowBounds,
    saveTodayWindowBounds
}