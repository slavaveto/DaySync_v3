// electron/winCalendar.js
const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const {setupPowerMonitor} = require("./powerMonitor");

const CALENDAR_SETTINGS_PATH = path.join(
    app.getPath('userData'),
    'daysync3-calendar-window-settings.json'
)

function loadCalendarWindowBounds() {
    try {
        if (fs.existsSync(CALENDAR_SETTINGS_PATH)) {
            return JSON.parse(
                fs.readFileSync(CALENDAR_SETTINGS_PATH, 'utf-8')
            )
        }
    } catch (e) {
        console.error('❌ Ошибка загрузки настроек окна Calendar:', e)
    }
    return null
}

function saveCalendarWindowBounds(bounds) {
    try {
        fs.writeFileSync(
            CALENDAR_SETTINGS_PATH,
            JSON.stringify(bounds)
        )
    } catch (e) {
        console.error('❌ Ошибка сохранения настроек окна Calendar:', e)
    }
}

let calendarWindow = null
//const HOST = process.env.PORT || '3100'

async function createCalendarWindow(host) {

    const saved = loadCalendarWindowBounds()

    calendarWindow = new BrowserWindow({
        width:  saved?.width  || 400,
        height: saved?.height || 600,
        x:      saved?.x ?? undefined,
        y:      saved?.y ?? undefined,
        frame:           true,
        titleBarStyle:  'default',
        resizable:      true,
        webPreferences: {
            preload:   path.join(__dirname, 'preload.js'),
            partition: 'persist:calendar-window'
        }
    })

    await calendarWindow.loadURL(
        `http://localhost:${host}/win_calendar`
    )

    setupPowerMonitor(calendarWindow);

    calendarWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    calendarWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.origin !== `http://localhost:${host}`) {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });

    calendarWindow.on('resize', () => {
        saveCalendarWindowBounds(calendarWindow.getBounds())
    })
    calendarWindow.on('move', () => {
        saveCalendarWindowBounds(calendarWindow.getBounds())
    })

    calendarWindow.on('close', e => {
        e.preventDefault()
        calendarWindow.hide()
    })

    return calendarWindow
}

module.exports = {
    createCalendarWindow,
    loadCalendarWindowBounds,
    saveCalendarWindowBounds
}