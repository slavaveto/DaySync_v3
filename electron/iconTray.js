
const { app, ipcMain, nativeImage, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const {createCanvas, loadImage} = require('canvas');
const {dockIconHandler} = require('./iconDock');


async function createBadgedImage(iconPath, badge, paddingX, overdueCount) {
    // Получаем размеры и scaleFactor
    const origImage = nativeImage.createFromPath(iconPath);
    const {width: dipWidth, height: dipHeight} = origImage.getSize();
    const scaleFactor = origImage.getScaleFactor?.() || 1;

    // Размер холста в физических пикселях
    const pixelWidth = Math.round((dipWidth + paddingX) * scaleFactor);
    const pixelHeight = Math.round(dipHeight * scaleFactor);
    const canvas = createCanvas(pixelWidth, pixelHeight);
    const ctx = canvas.getContext('2d');
    ctx.scale(scaleFactor, scaleFactor);

    // Рисуем оригинальную иконку
    const img = await loadImage(iconPath);
    ctx.drawImage(img, 0, 0, dipWidth, dipHeight);

    // Настройка текста
    const fontSize = Math.floor(dipHeight * 0.9);
    ctx.font = `bold ${fontSize}px Montserrat`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    // Вертикальное смещение: центр + 2px вниз
    const textY = (dipHeight - fontSize) / 2 - 3;
    const textX = dipWidth + paddingX - 3;

    if (overdueCount > 0) {
        ctx.fillStyle = '#ff0000';
    } else {
        ctx.fillStyle = '#ffa200';
    }

    const isDarkMode = nativeTheme.shouldUseDarkColors;
    if (!isDarkMode) {
        // ctx.lineWidth = 2;
        // ctx.strokeStyle = 'white';
        // ctx.strokeText(badge, textX, textY);
    }

    ctx.fillText(badge, textX, textY);
    const buffer = canvas.toBuffer('image/png');
    return nativeImage.createFromBuffer(buffer, {scaleFactor});
}

function trayIconCountHandler(tray) {
    let lastPayload = {todayCount: 0, overdueCount: 0};

    // Функция обновления иконки трея по payload и текущей теме
    async function updateTrayIcon(payload) {
        lastPayload = payload;

        const todayCount = payload.todayCount;
        const overdueCount = payload.overdueCount;
        const count = todayCount + overdueCount;

        // бейдж в Dock / таскбар
        // if (process.platform === 'darwin') {
        //     app.dock.setBadge(count > 0 ? String(count) : '');
        // } else {
        //     app.setBadgeCount(count);
        // }

        let iconFile;
        let padX = 23;

        if (count > 0) {
            iconFile = `tray_icon_today@2x.png`;

            if (overdueCount > 0) {
                iconFile = `tray_icon_overdue@2x.png`;
            }

            if (count === 1 || count >= 10) {
                padX = 18
            }

            if (count >= 10) {
                padX = 30
            }

            const iconPath = path.join(__dirname, 'icons', iconFile);
            badgedImage = await createBadgedImage(iconPath, String(count), padX, overdueCount);
            tray.setImage(badgedImage);

        } else {
            const iconFile = 'tray_icon@2x.png';
            const iconPath = path.join(__dirname, 'icons', iconFile);
            const img = nativeImage.createFromPath(iconPath);
            tray.setImage(img);
        }

        //обновляем иконку в Dock вашим вариантом с датой+цветом
        if (process.platform === 'darwin') {
            const dockIconPath = path.join(__dirname,'icons','dock_icon.png');
            const dockIcon     = await dockIconHandler(dockIconPath, count, overdueCount);
            app.dock.setIcon(dockIcon);
        }

    }

    // Обработка IPC из renderer
    ipcMain.on('update-today-count', (_event, payload) => {
        updateTrayIcon(payload);
    });

    // При смене темы пересоздаем иконку с последним payload
    nativeTheme.on('updated', () => {
        updateTrayIcon(lastPayload);
    });
}

module.exports = {trayIconCountHandler};